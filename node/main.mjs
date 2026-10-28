import {Connection} from './connection.mjs';
import {Store} from './store.mjs';
import {MiniMax} from './minimax.mjs';
import {Controller} from './controller.mjs';
import {installLogging} from './logging.mjs';
installLogging(process.env.DATA_DIR||'data');
console.log('奇门 Note4 服务启动，版本：20261027-observability');
if(!process.env.NOTE4_TARGET?.trim())throw new Error('请在.env指定NOTE4_TARGET设备IP或ID');
const store=new Store(process.env.DATA_DIR||'data'),device=new Connection({store}),ai=new MiniMax();
const app=new Controller({store,device,ai,onDisplay:receipt=>console.log('盘面已显示：',JSON.stringify(receipt))});
const clockRefresh=setInterval(()=>app.refreshClock(),10000);
let controls=Promise.resolve(),stopping=false;
// Stay alive while the device is intentionally disconnected; Docker must not
// turn a manual device exit into an unwanted reconnect.
const keepAlive=setInterval(()=>{},60000);
device.on('event',e=>{
  if(stopping)return;
  console.log('设备事件：',JSON.stringify({event:e.event,connectionId:e.connectionId,key:e.key,action:e.action,reason:e.reason,
    ...(e.event==='recording_finished'?{pcmBytes:Math.floor((e.pcm||'').length*3/4)}:{})}));
  controls=controls.then(()=>stopping?undefined:app.handle(e)).catch(error=>console.error('操作失败：',error.message));
  if(e.event==='connected')console.log('Note4已连接：',e.device?.address);
});
device.on('status',s=>console.log('连接状态：',JSON.stringify(s)));
async function shutdown() {
  if(stopping)return;stopping=true;
  app.connected=false;app.generation++;
  clearInterval(clockRefresh);
  await device.stop().catch(error=>console.error('连接清理失败：',error.message));
  await controls;
  // Keep already-started interpretations long enough to persist their text.
  const deadline=setTimeout(()=>process.exit(1),210000);deadline.unref();
  await Promise.allSettled([...app.jobs]);
  store.close();clearInterval(keepAlive);
  setTimeout(()=>process.exit(0),100).unref();
}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
device.start();
