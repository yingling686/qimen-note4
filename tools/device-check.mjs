import fs from 'node:fs';
import {Bridge} from '../node/bridge.mjs';
import {calculate,nowConfig} from '../node/engine.mjs';
import {render} from '../node/render.mjs';
const device=new Bridge();
let finished=false;
const timer=setTimeout(()=>finish(new Error('设备握手超时')),45000);
async function finish(error) {
  if(finished)return;finished=true;clearTimeout(timer);
  await device.dispose().catch(()=>{});
  if(error){console.error(error.message);process.exitCode=1;}
}
device.on('event',async e=>{
  if(e.event==='disconnected'){if(!finished)await finish(new Error(`连接失败：${e.reason}`));return;}
  if(e.event!=='connected'||finished)return;
  clearTimeout(timer);
  try {
    const snapshot=calculate(nowConfig());
    const png=render(snapshot,{status:'连接验收：可退出后启动NAS服务'});
    const result=await device.call('show',{png:png.toString('base64'),format:process.env.NOTE4_IMAGE_FORMAT||'gray16'});
    const status=await device.call('status',{},10000).catch(()=>null);
    const report={checkedAt:new Date().toISOString(),device:e.device,displayed:result.displayed,format:process.env.NOTE4_IMAGE_FORMAT||'gray16',font:'sans-serif',status};
    fs.mkdirSync('outputs',{recursive:true});fs.writeFileSync('outputs/device-check.json',JSON.stringify(report,null,2));
    fs.writeFileSync('outputs/device-preview.png',png);
    console.log(JSON.stringify(report,null,2));await finish();
  }catch(error){await finish(error);}
});
process.on('SIGINT',()=>finish());
