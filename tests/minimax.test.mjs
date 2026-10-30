import {test} from 'node:test';
import assert from 'node:assert/strict';
import {wavFromPcm,MiniMax} from '../node/minimax.mjs';
test('合成网络失败仅重试一次，限长播报，不重新调用解读',async()=>{
  const requests=[];
  const ai=new MiniMax({MINIMAX_API_KEY:'test'},async(url,req)=>{
    requests.push(JSON.parse(req.body));
    if(requests.length===1)throw Object.assign(new Error('connection reset'),{code:'ECONNRESET'});
    return {ok:true,json:async()=>({data:{}})};
  });
  await assert.rejects(ai.synthesize('测试播报内容。'.repeat(100)),/未返回有效音频/);
  assert.equal(requests.length,2);assert.ok(Array.from(requests[1].text).length<=300);
  assert.equal(requests[1].model,'speech-2.8-turbo');
});
test('合成无权限立即失败，不重试扣费请求',async()=>{
  let requests=0;
  const ai=new MiniMax({MINIMAX_API_KEY:'test'},async()=>{
    requests++;return {ok:false,status:403,json:async()=>({error:{message:'HTTP 403'}})};
  });
  await assert.rejects(ai.synthesize('测试'),/403/);assert.equal(requests,1);
});
test('录音封装WAV，ASR上传文件容器而非裸PCM',async()=>{
  const pcm=Buffer.alloc(3200),wav=wavFromPcm(pcm);
  assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.readUInt32LE(24),16000);assert.equal(wav.readUInt16LE(22),1);
  let seen;
  const ai=new MiniMax({MINIMAX_API_KEY:'test'},async(url,req)=>{seen=req;return {ok:true,json:async()=>({text:'问一个问题'})};});
  assert.equal(await ai.transcribe(pcm),'问一个问题');
  assert.equal(seen.body.get('file').type,'audio/wav');assert.equal(seen.body.get('model'),'asr-1.0');
});
test('接口错误保留原因且不泄漏密钥，空识别不解读',async()=>{
  const ai=new MiniMax({MINIMAX_API_KEY:'secret'},async()=>({ok:false,status:403,json:async()=>({error:{message:'secret 无识别权限'}})}));
  await assert.rejects(ai.transcribe(Buffer.alloc(3200)),/\[redacted\] 无识别权限/);
  const empty=new MiniMax({MINIMAX_API_KEY:'test'},async()=>({ok:true,json:async()=>({text:''})}));
  await assert.rejects(empty.transcribe(Buffer.alloc(3200)),/未识别到/);
});
