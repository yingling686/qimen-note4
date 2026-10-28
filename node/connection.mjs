import {EventEmitter} from 'node:events';
import {Bridge} from './bridge.mjs';
export const RETRY_SECONDS=[2,5,10,20,30];
export class Connection extends EventEmitter {
  constructor({store,target=process.env.NOTE4_TARGET,bridgeFactory=options=>new Bridge(options),
    setTimer=setTimeout,clearTimer=clearTimeout,openTimeout=45000}={}) {
    super();Object.assign(this,{store,target,bridgeFactory,setTimer,clearTimer,openTimeout});
    if(!target?.trim())throw new Error('NOTE4_TARGET必须指定设备IP或ID');
    this.expectedId=store.setting('device_id')||'';
    this.epoch=0;this.attempt=0;this.active=null;this.stopped=true;this.paused=false;
  }
  start(){if(!this.stopped)return;this.stopped=false;this.paused=false;this.connect();}
  connect(){
    if(this.stopped||this.paused||this.active)return;
    const epoch=++this.epoch;
    let bridge;
    try{bridge=this.bridgeFactory({target:this.target,expectedId:this.expectedId});}
    catch(error){this.schedule(error.message);return;}
    const session={epoch,bridge,connected:false,ended:false};this.active=session;
    session.openTimer=this.setTimer(()=>this.drop(session,'连接握手超时'),this.openTimeout);
    bridge.on('event',e=>{
      if(this.stopped||this.active!==session||session.ended)return;
      if(e.event==='disconnected'){this.drop(session,e.reason);return;}
      if(e.event==='connected'){
        const id=e.device?.id?.toLowerCase();
        if(!/^[a-f0-9]{12}$/.test(id||'')){this.drop(session,'设备ID无效');return;}
        if(this.expectedId&&this.expectedId!==id){this.drop(session,'设备身份不匹配，拒绝连接');return;}
        if(session.connected)return;
        if(!this.expectedId){this.store.setSetting('device_id',id);this.expectedId=id;}
        this.clearTimer(session.openTimer);session.connected=true;this.attempt=0;
      }else if(!session.connected)return;
      this.emit('event',{...e,connectionId:epoch});
    });
    this.emit('status',{state:'connecting',connectionId:epoch});
  }
  async drop(session,reason='Network'){
    if(session.ended||this.active!==session)return;
    session.ended=true;session.connected=false;this.clearTimer(session.openTimer);
    if(reason==='DeviceExit')this.paused=true;
    this.emit('event',{event:'disconnected',reason,connectionId:session.epoch});
    session.cleanup=(async()=>{
      try{await session.bridge.dispose();}
      catch(error){this.paused=true;this.emit('status',{state:'paused',reason:error.message});return;}
      finally{if(this.active===session)this.active=null;}
      if(this.paused)this.emit('status',{state:'paused',reason:'设备已主动退出，重启服务后恢复连接'});
      else if(!this.stopped)this.schedule(reason);
    })();
    await session.cleanup;
  }
  schedule(reason){
    if(this.stopped||this.paused)return;
    const seconds=RETRY_SECONDS[Math.min(this.attempt++,RETRY_SECONDS.length-1)];
    this.emit('status',{state:'retrying',seconds,reason});
    this.retryTimer=this.setTimer(()=>{this.retryTimer=null;this.connect();},seconds*1000);
  }
  call(command,args={},timeout=150000,connectionId=this.epoch){
    const session=this.active;
    if(!session?.connected||session.ended||connectionId!==session.epoch||this.stopped)return Promise.reject(new Error('旧连接已失效'));
    return session.bridge.call(command,args,timeout).catch(error=>{
      // Some firmware keeps a failed image task after an unclean client exit.
      // A confirmed failure is safe to recover by releasing and reopening;
      // Unknown receipts are never retried in the same session: close it first,
      // then let the normal reconnect path restore exactly the current chart.
      if(command==='show'&&(/^(DeviceFailure|ResultUnknown)\b/.test(error.message)||/结果未知/.test(error.message)))
        this.drop(session,'显示任务未完成，释放旧连接后恢复盘面');
      throw error;
    });
  }
  async stop(){
    this.stopped=true;this.clearTimer(this.retryTimer);this.retryTimer=null;
    const session=this.active;
    if(session){
      this.clearTimer(session.openTimer);
      if(session.cleanup)await session.cleanup;
      else{session.ended=true;session.connected=false;await session.bridge.dispose();if(this.active===session)this.active=null;}
    }
  }
}
