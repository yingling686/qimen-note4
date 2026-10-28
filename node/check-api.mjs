import {MiniMax} from './minimax.mjs';
// Synthetic audio only; no real user recording is uploaded by this check.
const ai=new MiniMax();
const result={};
try{const text=await ai.chat([{role:'user',content:'连接测试，只回复测试成功。'}],256);result.text={ok:true,text};}catch(e){result.text={ok:false,error:e.message};}
let pcm;
try{pcm=await ai.synthesize('这是语音连接测试。');result.tts={ok:true,seconds:pcm.length/32000};}catch(e){result.tts={ok:false,error:e.message};}
if(pcm){try{const text=await ai.transcribe(pcm);result.asr={ok:true,text};}catch(e){result.asr={ok:false,error:e.message};}}
else result.asr={ok:false,error:'语音合成失败，未生成识别测试音频'};
console.log(JSON.stringify(result,null,2));
if(Object.values(result).some(r=>!r.ok))process.exitCode=1;
