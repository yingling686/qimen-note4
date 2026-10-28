import fs from 'node:fs';
import {Bridge} from '../node/bridge.mjs';
const device=new Bridge({expectedId:process.env.NOTE4_EXPECTED_ID||''});let done=false;
const deadline=setTimeout(()=>finish(new Error('设备连接超时')),45000);
async function finish(error){if(done)return;done=true;clearTimeout(deadline);await device.dispose().catch(()=>{});if(error){console.error(error.message);process.exitCode=1;}}
device.on('event',e=>{
  if(e.event==='disconnected'){if(!done)finish(new Error(String(e.reason)));return;}
  if(e.event!=='connected')return;
  clearTimeout(deadline);
  (async()=>{
    const samples=Math.max(960,Math.min(48000,Number(process.env.NOTE4_TEST_SAMPLES)||16000));
    const volume=Math.max(0,Math.min(100,Number(process.env.NOTE4_TEST_VOLUME??50)));
    const pcm=Buffer.alloc(samples*2);
    for(let i=0;i<samples;i++)pcm.writeInt16LE(Math.round(Math.sin(i*440*Math.PI*2/16000)*5000),i*2);
    const started=Date.now();
    let report={checkedAt:new Date().toISOString(),platform:process.platform,arch:process.arch,device:e.device,kind:'440hz-tone',samples,volume};
    try{const result=await device.call('play',{pcm:pcm.toString('base64'),volume});report={...report,ok:true,result};}
    catch(error){report={...report,ok:false,error:error.message};process.exitCode=1;}
    report.elapsedMs=Date.now()-started;
    fs.mkdirSync('outputs',{recursive:true});fs.writeFileSync('outputs/audio-check.json',JSON.stringify(report,null,2));
    console.log(JSON.stringify(report,null,2));await finish();
  })().catch(finish);
});
