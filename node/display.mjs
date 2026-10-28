import {setTimeout as sleep} from 'node:timers/promises';
// Retry only explicit failures/busy responses, never an unknown display result.
export async function showFrame(device,args,connectionId,{canSend=()=>true,delay=sleep}={}) {
  for(let attempt=0;attempt<3;attempt++) {
    if(!canSend())throw new Error('显示已取消');
    try{return await device.call('show',args,150000,connectionId);}
    catch(error){
      if(attempt===2||!/^(Busy|DeviceFailure)\b/.test(error.message)||!canSend())throw error;
      await delay((attempt+1)*2000);
    }
  }
}
