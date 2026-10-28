use base64::{engine::general_purpose::STANDARD as B64, Engine};
use serde_json::{json, Value};
use std::{io::{self, Write}, sync::{Arc,Mutex}};
use tokio::io::{AsyncBufReadExt,BufReader};
use zectrix_sdk::{AudioClip,Device,Event,OpenOptions,ImageFormat};

fn emit(out: &Arc<Mutex<io::Stdout>>, value: Value) {
    let mut out=out.lock().unwrap();
    let _=writeln!(out,"{}",value);
    let _=out.flush();
}
async fn command(device: &Device, v: &Value) -> Result<Value, String> {
    let error=|e:zectrix_sdk::Error| format!("{e:?}: {e}");
    match v["command"].as_str().unwrap_or("") {
        "show" => {
            let bytes=B64.decode(v["png"].as_str().ok_or("missing PNG")?).map_err(|e|e.to_string())?;
            let format=match v["format"].as_str().unwrap_or("gray16") {
                "mono"=>ImageFormat::Mono,
                "gray4"=>ImageFormat::Gray4,
                "gray16"=>ImageFormat::Gray16,
                _=>return Err("unknown image format".into())
            };
            device.show_with_format(&bytes,format).await.map_err(error)?;
            Ok(json!({"displayed":true}))
        }
        "play" => {
            let bytes=B64.decode(v["pcm"].as_str().ok_or("missing PCM")?).map_err(|e|e.to_string())?;
            if bytes.len()%2!=0 { return Err("invalid PCM16 byte length".into()); }
            let samples=bytes.chunks_exact(2).map(|b|i16::from_le_bytes([b[0],b[1]])).collect();
            let volume=v["volume"].as_u64().unwrap_or(65).min(100) as u8;
            let end=device.play(&AudioClip {samples},volume).await.map_err(error)?;
            Ok(json!({"end":format!("{end:?}")}))
        }
        "stop" => { device.stop().await.map_err(error)?; Ok(json!({})) }
        "status" => Ok(serde_json::to_value(device.status().await.map_err(error)?).map_err(|e|e.to_string())?),
        _ => Err("unknown bridge command".into())
    }
}
#[tokio::main]
async fn main() -> Result<(),Box<dyn std::error::Error>> {
    let target=std::env::var("NOTE4_TARGET")?;
    if target.trim().is_empty() { return Err("NOTE4_TARGET must specify one device".into()); }
    let expected=std::env::var("NOTE4_EXPECTED_ID").ok().filter(|id| !id.is_empty());
    let out=Arc::new(Mutex::new(io::stdout()));
    let device=match Device::open_verified(OpenOptions {target:Some(target),client_name:Some("Qimen Note4".into())}, expected.as_deref()).await {
        Ok(device)=>Arc::new(device),
        Err(error)=>{emit(&out,json!({"event":"disconnected","reason":format!("{error:?}")}));return Ok(());}
    };
    emit(&out,json!({"event":"connected","device":device.summary}));
    let receiver=Arc::clone(&device);
    let events_out=Arc::clone(&out);
    // Exactly one event consumer; it remains active while show/play are awaiting receipts.
    let events=tokio::spawn(async move {
        loop {
            match receiver.next_event().await {
                Ok(Some(Event::Key {key,action})) => emit(&events_out,json!({"event":"key","key":key,"action":action})),
                Ok(Some(Event::RecordingStarted)) => emit(&events_out,json!({"event":"recording_started"})),
                Ok(Some(Event::RecordingFinished {audio,reason})) => {
                    let bytes:Vec<u8>=audio.map(|a|a.samples.into_iter().flat_map(i16::to_le_bytes).collect()).unwrap_or_default();
                    emit(&events_out,json!({"event":"recording_finished","pcm":B64.encode(bytes),"reason":reason}));
                }
                Ok(Some(Event::Disconnected {reason})) => {emit(&events_out,json!({"event":"disconnected","reason":reason}));break;}
                Ok(None) => break,
                Err(e) => {emit(&events_out,json!({"event":"disconnected","reason":e.to_string()}));break;}
            }
        }
    });
    let mut lines=BufReader::new(tokio::io::stdin()).lines();
    loop {
        tokio::select! {
            _=events_outcome(&events) => break,
            line=lines.next_line() => {
                let Some(line)=line? else {break;};
                let v:Value=match serde_json::from_str(&line) {Ok(v)=>v,Err(_)=>continue};
                if v["command"]=="close" {
                    device.close().await?;
                    emit(&out,json!({"id":v["id"],"ok":true}));
                    break;
                }
                let d=Arc::clone(&device);let o=Arc::clone(&out);
                tokio::spawn(async move {
                    let response=match command(&d,&v).await {
                        Ok(data)=>json!({"id":v["id"],"ok":true,"data":data}),
                        Err(error)=>json!({"id":v["id"],"ok":false,"error":error})
                    };
                    emit(&o,response);
                });
            }
        }
    }
    device.close().await?;
    events.abort();
    Ok(())
}
async fn events_outcome(task:&tokio::task::JoinHandle<()>) {
    while !task.is_finished() {tokio::time::sleep(std::time::Duration::from_millis(100)).await;}
}
