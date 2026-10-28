import {spawn} from 'node:child_process';
export function wavFromPcm(pcm) {
  if(pcm.length%2)throw new Error('录音PCM长度无效');
  const h=Buffer.alloc(44);h.write('RIFF');h.writeUInt32LE(36+pcm.length,4);h.write('WAVEfmt ',8);
  h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);h.writeUInt32LE(16000,24);
  h.writeUInt32LE(32000,28);h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(pcm.length,40);
  return Buffer.concat([h,pcm]);
}
function stripThinking(s) {
  if(/<think>(?![\s\S]*<\/think>)/i.test(s))throw new Error('模型只返回了未完成的推理');
  return s.replace(/<think>[\s\S]*?<\/think>/gi,'').trim();
}
function excerptSummary(answer,maxLength=280) {
  const text=answer.replace(/```[\s\S]*?```/g,' ')
    .replace(/^\s{0,3}#{1,6}\s*/gm,'')
    .replace(/^\s*[-*+]\s+/gm,'')
    .replace(/\*\*|__|[*_`>#|]/g,' ')
    .replace(/\s+/g,' ').trim();
  const chars=Array.from(text);
  if(chars.length<=maxLength)return text;
  const candidate=chars.slice(0,maxLength).join('');
  const punctuation=Math.max(candidate.lastIndexOf('。'),candidate.lastIndexOf('！'),candidate.lastIndexOf('？'),candidate.lastIndexOf('；'));
  return punctuation>=100?candidate.slice(0,punctuation+1):candidate.slice(0,maxLength-1)+'…';
}
export class MiniMax {
  constructor(env=process.env, fetcher=fetch) {
    this.fetch=fetcher;
    this.textKey=env.MINIMAX_TEXT_KEY||env.MINIMAX_API_KEY;
    this.asrKey=env.MINIMAX_ASR_KEY||env.MINIMAX_API_KEY;
    this.ttsKey=env.MINIMAX_TTS_KEY||env.MINIMAX_API_KEY;
    this.model=env.MINIMAX_TEXT_MODEL||'MiniMax-M3';
    this.textUrl=env.MINIMAX_TEXT_URL||'https://api.minimaxi.com/v1/chat/completions';
    this.asrUrl=env.MINIMAX_ASR_URL||'https://api.minimax.cn/v1/speech_to_text';
    this.ttsUrl=env.MINIMAX_TTS_URL||'https://api.minimax.cn/v1/t2a_v2';
    this.ttsModel=env.MINIMAX_TTS_MODEL||'speech-2.8-turbo';this.voice=env.MINIMAX_VOICE||'male-qn-qingse';
  }
  async request(url,key,body,multipart=false,timeout=180000) {
    if(!key)throw new Error('未配置此接口的MiniMax密钥');
    let response;
    try {response=await this.fetch(url,{method:'POST',headers:{Authorization:`Bearer ${key}`,...(multipart?{}:{'Content-Type':'application/json'})},
      body:multipart?body:JSON.stringify(body),signal:AbortSignal.timeout(timeout)});}
    catch {throw new Error('MiniMax请求超时或无法连接');}
    const data=await response.json().catch(()=>{throw new Error(`MiniMax返回无效JSON（HTTP ${response.status}）`);});
    if(!response.ok || (data.base_resp && data.base_resp.status_code!==0) || data.error) {
      // Do not log request bodies or credentials; preserve the provider's business error.
      const raw=data.error?.message||data.base_resp?.status_msg||`HTTP ${response.status}`;
      throw new Error(String(raw).replaceAll(key,'[redacted]').slice(0,250));
    }
    return data;
  }
  async transcribe(pcm) {
    const form=new FormData();form.set('model','asr-1.0');form.set('response_format','json');form.set('stream','false');
    form.set('file',new Blob([wavFromPcm(pcm)],{type:'audio/wav'}),'question.wav');
    const result=await this.request(this.asrUrl,this.asrKey,form,true,90000);
    if(!result.text?.trim())throw new Error('未识别到有效问题，请重新录音');
    return result.text.trim();
  }
  async chat(messages,maxTokens=6000) {
    let prompt=messages,rawAnswer='';
    const chunkSize=Math.min(8192,maxTokens);
    for(let part=0;part<4;part++) {
      const result=await this.request(this.textUrl,this.textKey,{model:this.model,messages:prompt,max_tokens:chunkSize,temperature:0.4,stream:false});
      const choice=result.choices?.[0],content=choice?.message?.content||'';
      if(content)rawAnswer+=`${rawAnswer?'\n':''}${content}`;
      if(choice?.finish_reason!=='length') {
        const answer=stripThinking(rawAnswer);
        if(!answer)throw new Error('MiniMax未返回解读文字');
        return answer;
      }
      console.warn('模型回复达到单次长度上限，将接续生成：',JSON.stringify({part:part+1,maxTokens:chunkSize}));
      if(!content||part===3)throw new Error('模型回复多次达到长度上限，请缩短问题或精简历史记录');
      prompt=[...prompt,{role:'assistant',content:rawAnswer},{role:'user',content:'请紧接上文尚未完成的部分继续，避免重复已经写过的内容。继续遵循系统规定的解局格式。'}];
    }
    throw new Error('模型回复未完整生成');
  }
  async interpret(snapshot,question,history) {
    const messages=[{role:'system',content:snapshot.guide+'\n这是Note4语音提问。subject为空时不得虚构主体姓名、生日或年命；问题中明确给出的资料可作为用户陈述使用。'}];
    for(const r of history.slice(-12)) if(r.question && r.answer)messages.push({role:'user',content:r.question},{role:'assistant',content:r.answer});
    messages.push({role:'user',content:JSON.stringify({...snapshot.chart,question})});
    return this.chat(messages);
  }
  async summarize(answer) {
    try {
      const text=await this.chat([{role:'system',content:'请直接输出一段180至260个汉字的普通话口语播报，不展示推理过程。先结论，再说明主要盘面依据与建议。遵守原文的不确定性，不新增事实。'},
        {role:'user',content:answer}],4000);
      return text;
    }catch(error){
      if(!/多次达到长度上限/.test(error.message))throw error;
      const excerpt=excerptSummary(answer);
      if(!excerpt)throw error;
      console.warn('摘要生成多次达到长度上限，改用完整解读的短节选播报');
      return `模型摘要未能完整生成，以下为原解读节选：${excerpt}`;
    }
  }
  async synthesize(text) {
    const data=await this.request(this.ttsUrl,this.ttsKey,{model:this.ttsModel,text,stream:false,
      voice_setting:{voice_id:this.voice,speed:1,vol:1,pitch:0},language_boost:'Chinese',
      audio_setting:{sample_rate:16000,format:'wav',channel:1}},false,120000);
    const hex=data.data?.audio;
    if(typeof hex!=='string'||!hex.length||!/^(?:[a-f\d]{2})+$/i.test(hex))throw new Error('语音合成未返回有效音频');
    return normalizeAudio(Buffer.from(hex,'hex'));
  }
}
export function normalizeAudio(audio) {
  return new Promise((resolve,reject)=>{
    const p=spawn(process.env.FFMPEG||'ffmpeg',['-hide_banner','-loglevel','error','-i','pipe:0','-f','s16le','-ar','16000','-ac','1','pipe:1'],{windowsHide:true});
    const chunks=[];let size=0;
    const timer=setTimeout(()=>{p.kill();reject(new Error('音频转换超时'));},30000);
    p.stdout.on('data',b=>{size+=b.length;if(size>3840000){p.kill();}else chunks.push(b);});
    p.stderr.resume();p.stdin.on('error',()=>{});
    p.on('error',()=>{clearTimeout(timer);reject(new Error('无法启动ffmpeg音频转换'));});
    p.on('close',code=>{clearTimeout(timer);if(code!==0||!size||size>3840000)reject(new Error('音频转换失败或超过120秒'));else resolve(Buffer.concat(chunks));});
    p.stdin.end(audio);
  });
}
