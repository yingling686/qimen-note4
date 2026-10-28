import {test} from 'node:test';
import assert from 'node:assert/strict';
import {showFrame} from '../node/display.mjs';
test('显式显示失败可以有限恢复，未知结果绝不重试',async()=>{
  let calls=0;const delays=[];
  const device={async call(){if(++calls===1)throw new Error('DeviceFailure: failed');return {displayed:true};}};
  assert.equal((await showFrame(device,{},1,{delay:async ms=>delays.push(ms)})).displayed,true);
  assert.equal(calls,2);assert.deepEqual(delays,[2000]);
  calls=0;device.call=async()=>{calls++;throw new Error('ResultUnknown: unknown');};
  await assert.rejects(showFrame(device,{},1),/ResultUnknown/);assert.equal(calls,1);
});
test('等待显示恢复时连接已过期，不把旧帧发到新连接',async()=>{
  let active=true,calls=0;
  const device={async call(){calls++;throw new Error('Busy');}};
  await assert.rejects(showFrame(device,{},1,{canSend:()=>active,delay:async()=>{active=false;}}),/显示已取消/);
  assert.equal(calls,1);
});
