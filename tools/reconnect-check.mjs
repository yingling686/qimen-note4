import fs from 'node:fs';
import {Connection} from '../node/connection.mjs';
import {Store} from '../node/store.mjs';
import {MiniMax} from '../node/minimax.mjs';
import {calculate,nowConfig} from '../node/engine.mjs';
import {render} from '../node/render.mjs';
import {showFrame} from '../node/display.mjs';
const store=new Store('outputs/reconnect-check');
let chart=store.current();if(!chart)chart=store.add(calculate(nowConfig()));
const connection=new Connection({store}),ai=new MiniMax(),events=[];
let count=0,crashTested=false,stopping=false;
const deadline=setTimeout(()=>finish(new Error('实机重连验收超时')),150000);
connection.on('status',s=>{events.push(s);console.log('连接：',JSON.stringify(s));});
connection.on('event',e=>{
  if(e.event!=='connected')return;
  const pass=++count;
  (async()=>{
    const png=render(chart.snapshot,{status:pass===1?'连接验收：准备测试断线恢复':'自动重连成功：盘面已恢复'});
    await showFrame(connection,{png:png.toString('base64'),format:process.env.NOTE4_IMAGE_FORMAT||'gray16'},e.connectionId);
    console.log(`第${pass}次连接：盘面已显示完成`);
    if(!crashTested){
      crashTested=true;
      console.log('首帧显示完成，结束本测试创建的桥接进程以验证重连');
      connection.active.bridge.process.kill('SIGKILL');
    }else{
      let playback={end:'未播放'},playbackError='';
      try{
        if(!process.env.NOTE4_SKIP_AUDIO_CHECK){
        const pcm=await ai.synthesize('奇门排盘已自动重新连接。盘面和历史记录已恢复。');
        playback=await connection.call('play',{pcm:pcm.toString('base64'),volume:65},150000,e.connectionId);
        }
      }catch(error){playbackError=error.message;process.exitCode=1;}
      const report={checkedAt:new Date().toISOString(),deviceId:store.setting('device_id'),chartId:chart.id,
        reconnects:count-1,displayed:true,playback:playback.end,playbackError,events};
      fs.writeFileSync('outputs/reconnect-check.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await finish();
    }
  })().catch(error=>{
    if(!connection.active?.connected||connection.active?.epoch!==e.connectionId)return;
    finish(error);
  });
});
async function finish(error){
  if(stopping)return;stopping=true;clearTimeout(deadline);
  await connection.stop();store.close();
  if(error){console.error(error.message);process.exitCode=1;}
}
process.on('SIGINT',()=>finish());connection.start();
