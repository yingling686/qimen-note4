import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {Connection} from '../node/connection.mjs';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const ID='aabbccddeeff';
function setup() {
  const values=new Map(),sessions=[],timers=new Map(),events=[],statuses=[];let timerId=0;
  const store={setting:k=>values.get(k),setSetting:(k,v)=>values.set(k,v)};
  const bridgeFactory=options=>{
    const b=new EventEmitter();Object.assign(b,{options,disposeCount:0,calls:[],
      async dispose(){this.disposeCount++;},async call(command){this.calls.push(command);return {displayed:true};}});
    sessions.push(b);return b;
  };
  const c=new Connection({store,target:'192.168.110.149',bridgeFactory,
    setTimer:(fn,ms)=>{timers.set(++timerId,{fn,ms});return timerId;},clearTimer:id=>timers.delete(id)});
  c.on('event',e=>events.push(e));c.on('status',s=>statuses.push(s));
  const fireRetry=()=>{const entry=[...timers.entries()].find(([,v])=>v.ms!==45000);assert.ok(entry,'missing retry timer');timers.delete(entry[0]);entry[1].fn();};
  const connected=(bridge=sessions.at(-1),id=ID)=>bridge.emit('event',{event:'connected',device:{id,address:'192.168.110.149:32342'}});
  return {c,sessions,timers,events,statuses,values,fireRetry,connected};
}
test('首次失败按2/5/10/20/30秒退避，只在旧进程释放后新建连接',async()=>{
  const f=setup();f.c.start();
  for(const delay of [2,5,10,20,30,30]){
    const b=f.sessions.at(-1);b.emit('event',{event:'disconnected',reason:'NoDevice'});await tick();
    assert.equal(b.disposeCount,1);assert.equal(f.statuses.at(-1).seconds,delay);f.fireRetry();
  }
  await f.c.stop();assert.equal(f.timers.size,0);
});
test('重复断线事件只清理一次；旧连接迟到事件被隔离',async()=>{
  const f=setup();f.c.start();f.connected();const old=f.sessions[0];
  old.emit('event',{event:'disconnected',reason:'Network'});
  old.emit('event',{event:'disconnected',reason:'Network'});await tick();
  assert.equal(old.disposeCount,1);f.fireRetry();f.connected();
  const count=f.events.length;old.emit('event',{event:'key',key:'Confirm',action:'Short'});
  assert.equal(f.events.length,count);assert.equal(f.values.get('device_id'),ID);
  assert.equal(f.sessions[1].options.expectedId,ID);
  await assert.rejects(f.c.call('show',{},100,1),/旧连接/);
  await f.c.call('show',{},100,2);assert.deepEqual(f.sessions[1].calls,['show']);await f.c.stop();
});
test('身份不匹配不交付connected，不接管新设备',async()=>{
  const f=setup();f.values.set('device_id',ID);f.c.expectedId=ID;f.c.start();f.connected(undefined,'112233445566');await tick();
  assert.equal(f.events.filter(e=>e.event==='connected').length,0);
  assert.match(f.statuses.at(-1).reason,/身份不匹配/);assert.equal(f.values.get('device_id'),ID);await f.c.stop();
});
test('主动退出暂停重连，手动停止取消待定重连',async()=>{
  const f=setup();f.c.start();f.connected();f.sessions[0].emit('event',{event:'disconnected',reason:'DeviceExit'});await tick();
  assert.equal(f.timers.size,0);assert.equal(f.c.paused,true);await f.c.stop();
  const g=setup();g.c.start();g.sessions[0].emit('event',{event:'disconnected',reason:'Busy'});await tick();
  assert.equal(g.timers.size,1);await g.c.stop();assert.equal(g.timers.size,0);assert.equal(g.sessions.length,1);
});
test('旧进程未释放不启动第二个桥接，握手超时可重试',async()=>{
  const f=setup();f.c.start();let release;f.sessions[0].dispose=()=>new Promise(r=>release=r);
  f.sessions[0].emit('event',{event:'disconnected',reason:'Network'});await tick();
  assert.equal(f.timers.size,0);assert.equal(f.sessions.length,1);release();await tick();f.fireRetry();
  const timer=[...f.timers.values()].find(t=>t.ms===45000);timer.fn();await tick();
  assert.match(f.statuses.at(-1).reason,/握手超时/);await f.c.stop();
});
test('显示失败或结果未知，释放旧连接后才恢复，不在原连接重推',async()=>{
  for(const message of ['ResultUnknown','操作结果未知，请勿自动重复执行','DeviceFailure: failed']) {
    const f=setup();f.c.start();f.connected();
    f.sessions[0].call=async()=>{throw new Error(message);};
    await assert.rejects(f.c.call('show'));await tick();
    assert.equal(f.sessions[0].disposeCount,1);assert.equal(f.statuses.at(-1).state,'retrying');
    assert.equal(f.sessions.length,1);f.fireRetry();f.connected();
    await f.c.call('show');assert.deepEqual(f.sessions[1].calls,['show']);await f.c.stop();
  }
});
