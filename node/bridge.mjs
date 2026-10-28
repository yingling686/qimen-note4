import {spawn} from 'node:child_process';
import readline from 'node:readline';
import {EventEmitter} from 'node:events';
export class Bridge extends EventEmitter {
  constructor({binary=process.env.NOTE4_BRIDGE||'qimen-note4-bridge',target=process.env.NOTE4_TARGET,expectedId=process.env.NOTE4_EXPECTED_ID||''}={}) {
    super();this.nextId=0;this.pending=new Map();this.closed=false;
    // The pinned ID is verified in INFO before CONNECT. Direct-IP reconnects
    // do not depend on multicast discovery being available on the NAS network.
    this.process=spawn(binary,[],{stdio:['pipe','pipe','inherit'],windowsHide:true,
      env:{...process.env,NOTE4_TARGET:target,NOTE4_EXPECTED_ID:expectedId}});
    this.process.on('error',error=>this.finish(error.message));
    this.process.on('exit',()=>this.finish('设备桥接进程已结束'));
    this.process.stdin.on('error',()=>this.finish('设备连接已结束'));
    const lines=readline.createInterface({input:this.process.stdout});
    lines.on('line',line=>{
      let msg;try{msg=JSON.parse(line);}catch{return;}
      if(msg.id!==undefined){const p=this.pending.get(msg.id);if(!p)return;clearTimeout(p.timer);this.pending.delete(msg.id);msg.ok?p.resolve(msg.data):p.reject(new Error(msg.error));}
      else if(msg.event==='disconnected')this.finish(msg.reason);
      else if(!this.closed)this.emit('event',msg);
    });
  }
  finish(reason) {
    if(this.closed)return;this.closed=true;
    for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(new Error(reason));}
    this.pending.clear();this.emit('event',{event:'disconnected',reason});
  }
  call(command,args={},timeout=150000) {
    if(this.closed)return Promise.reject(new Error('设备连接已结束'));
    return new Promise((resolve,reject)=>{
      const id=++this.nextId;
      const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error('操作结果未知，请勿自动重复执行'));},timeout);
      this.pending.set(id,{resolve,reject,timer});
      this.process.stdin.write(JSON.stringify({id,command,...args})+'\n');
    });
  }
  async dispose() {
    if(this.disposal)return this.disposal;
    this.disposal=(async()=>{
      const p=this.process;
      if(!p.pid||p.exitCode!==null||p.signalCode!==null){this.finish('连接已释放');return;}
      const exited=new Promise(resolve=>p.once('exit',resolve));
      if(p.stdin.writable)p.stdin.end(JSON.stringify({id:0,command:'close'})+'\n');
      let timer;
      const graceful=await Promise.race([exited.then(()=>true),new Promise(resolve=>{timer=setTimeout(()=>resolve(false),3000);})]);
      clearTimeout(timer);
      if(!graceful){
        p.kill('SIGKILL');
        const killed=await Promise.race([exited.then(()=>true),new Promise(resolve=>{timer=setTimeout(()=>resolve(false),2000);})]);
        clearTimeout(timer);
        if(!killed)throw new Error('旧桥接进程尚未退出，暂停重连以避免重复连接');
      }
      this.finish('连接已释放');
    })();
    return this.disposal;
  }
}
