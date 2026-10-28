import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Store} from '../node/store.mjs';
import {Controller} from '../node/controller.mjs';
const immediate=()=>new Promise(r=>setImmediate(r));
async function settle(c) {await Promise.allSettled([...c.jobs]);if(c.refreshTask)await c.refreshTask;}
function fixture(t,ai={}) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'qimen-note4-'));
  const store=new Store(dir),calls=[];
  const device={async call(command,args){calls.push({command,args});return {displayed:true,end:'Completed'};}};
  const defaultAi={async transcribe(){return '测试问题';},async interpret(s,q,h){return `完整解读，前文${h.length}条`;},async summarize(){return '精简解读';},async synthesize(){return Buffer.alloc(3200);}};
  const c=new Controller({store,device,ai:{...defaultAi,...ai},clock:()=>new Date('2026-10-21T08:00:00Z'),draw:()=>42,renderer:()=>Buffer.from('png')});
  t.after(async()=>{await settle(c);store.close();fs.rmSync(dir,{recursive:true,force:true});});
  return {c,store,calls,dir,device};
}
const short=key=>({event:'key',key,action:'Short'});
const start={event:'recording_started'};
const end={event:'recording_finished',reason:'Completed',pcm:Buffer.alloc(3200).toString('base64')};

test('设备录音启动失败不误报盘面未知，也不提交AI',async t=>{
  const {c,store}=fixture(t);await c.handle({event:'connected'});await settle(c);
  const id=c.current.id;
  await c.handle({event:'recording_finished',reason:'Failed',pcm:''});await settle(c);
  assert.equal(c.status,'录音失败：设备录音处理失败');
  assert.equal(store.readings(id).length,0);assert.equal(c.current.id,id);
  await c.handle({event:'recording_finished',reason:'Completed',pcm:''});await settle(c);
  assert.match(c.status,/录音未成功开始/);assert.equal(store.readings(id).length,0);
});
test('抽盘不入历史，上键回实时盘，普通上下按两小时重排',async t=>{
  const {c,store,dir}=fixture(t);
  await c.handle({event:'connected'});await settle(c);
  const first=c.current;
  await c.handle(short('Confirm'));await settle(c);
  const second=c.current;
  assert.equal(second.snapshot.config.randomHourId,42);
  await c.handle({event:'key',key:'Confirm',action:'Long'});assert.equal(store.list().length,1);
  await c.handle(short('Up'));assert.equal(c.liveMode,true);
  assert.deepEqual(c.current.snapshot.config,first.snapshot.config);
  await c.handle(short('Up'));assert.equal(c.current.snapshot.config.time,'14:00');
  assert.equal(c.current.snapshot.config.hourMode,'clock');assert.equal(c.liveMode,false);
  await c.handle(short('Down'));assert.equal(c.current.snapshot.config.time,'16:00');
  const reopened=new Store(dir);assert.deepEqual(reopened.current(),c.current);reopened.close();
});
test('提问保存完整解读、摘要和Markdown，同盘追问带历史',async t=>{
  const {c,store,dir,calls}=fixture(t);await c.handle({event:'connected'});await settle(c);
  await c.handle(start);await c.handle(end);await settle(c);
  await c.handle(start);await c.handle(end);await settle(c);
  const rows=store.readings(c.current.id);assert.equal(rows.length,2);
  assert.match(rows[1].answer,/前文1条/);assert.equal(rows[0].stage,'完成');
  assert.equal(calls.filter(x=>x.command==='play').length,2);
  assert.match(fs.readFileSync(path.join(dir,'records',String(c.current.id),`${rows[1].id}.md`),'utf8'),/精简解读/);
});
test('后台解读途中切盘，结果归旧盘，不在新盘播报',async t=>{
  let release;const wait=new Promise(r=>release=r);
  const {c,store,calls}=fixture(t,{async interpret(){await wait;return '旧盘解读';}});
  await c.handle({event:'connected'});await settle(c);const old=c.current.id;
  await c.handle(start);await c.handle(end);await immediate();
  await c.handle(short('Confirm'));release();await settle(c);
  assert.notEqual(c.current.id,old);assert.equal(calls.filter(x=>x.command==='play').length,0);
  assert.equal(store.readings(old)[0].answer,'旧盘解读');assert.match(store.readings(old)[0].stage,/未播放/);
});
test('录音为空、识别失败及断线不改变盘面或丢失已有文字',async t=>{
  const {c,store}=fixture(t,{async transcribe(){throw new Error('接口无权限');}});
  await c.handle({event:'connected'});await settle(c);const id=c.current.id;
  await c.handle(start);await c.handle({...end,pcm:''});assert.equal(store.readings(id).length,0);
  await c.handle(start);await c.handle(end);await settle(c);
  assert.equal(store.readings(id)[0].stage,'识别失败');assert.match(c.status,/识别失败/);
  await c.handle({event:'disconnected',reason:'Network'});assert.equal(c.current.id,id);assert.equal(c.connected,false);
});
test('显示结果未知时不自动重推、不把不确定的盘提交AI',async t=>{
  const {c,calls,store,device}=fixture(t);device.call=async cmd=>{calls.push({command:cmd});throw new Error('ResultUnknown');};
  await c.handle({event:'connected'});await settle(c);
  assert.equal(c.displayUncertain,true);assert.equal(calls.length,1);
  c.refresh();await settle(c);assert.equal(calls.length,1);
  await c.handle(start);await c.handle(end);assert.equal(store.readings(c.current.id).length,0);
});
test('重连恢复原盘只推送一次，旧解读不自动播放且不重复请求',async t=>{
  let release,interpretCount=0;const waiting=new Promise(r=>release=r);
  const {c,store,calls}=fixture(t,{async interpret(){interpretCount++;await waiting;return '断线前的完整解读';}});
  await c.handle({event:'connected',connectionId:1});await settle(c);
  await c.handle(short('Confirm'));await settle(c);const id=c.current.id;
  await c.handle(start);await c.handle(end);await immediate();
  await c.handle({event:'disconnected',connectionId:1,reason:'Network'});
  const shows=calls.filter(x=>x.command==='show').length;
  await c.handle({event:'connected',connectionId:2});await c.refreshTask;
  assert.equal(calls.filter(x=>x.command==='show').length,shows+1);
  const count=store.list().length;
  await c.handle({...short('Confirm'),connectionId:1});assert.equal(store.list().length,count);
  release();await settle(c);
  assert.equal(c.current.id,id);assert.equal(interpretCount,1);assert.equal(calls.filter(x=>x.command==='play').length,0);
  assert.equal(store.readings(c.current.recordId||id)[0].answer,'断线前的完整解读');
});
test('旧显示回执晚于重连，不能覆盖新连接的盘面状态',async t=>{
  const {c,device,calls}=fixture(t);let rejectOld;
  device.call=async command=>{calls.push({command});if(calls.length===1)return new Promise((r,j)=>rejectOld=j);return {displayed:true};};
  await c.handle({event:'connected',connectionId:1});
  await c.handle({event:'disconnected',connectionId:1,reason:'Network'});
  await c.handle({event:'connected',connectionId:2});
  rejectOld(new Error('ResultUnknown'));await c.refreshTask;
  assert.equal(c.displayUncertain,false);assert.equal(c.displayed.id,c.current.id);assert.equal(calls.length,2);
});
