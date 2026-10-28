import {randomInt} from 'node:crypto';
import {calculate,nowConfig} from './engine.mjs';
import {render} from './render.mjs';
import {showFrame} from './display.mjs';
export class Controller {
  constructor({store,device,ai,clock=()=>new Date(),draw=randomInt,renderer=render,onDisplay=()=>{}}) {
    Object.assign(this,{store,device,ai,clock,draw,renderer,onDisplay});
    this.current=store.current();this.displayed=null;this.generation=0;this.recording=null;
    this.liveMode=store.setting('live_clock')!=='false';this.clockMinute=null;
    this.initialConnection=false;
    this.temporaryId=0;
    this.status='';this.connected=false;this.refreshing=false;this.dirty=false;this.playing=false;
    this.jobs=new Set();this.displayUncertain=false;this.connectionId=0;
  }
  async handle(e) {
    if(e.event==='connected') {
      this.connectionId=e.connectionId??this.connectionId+1;
      this.generation++;this.connected=true;this.displayUncertain=false;
      this.recording=null;this.displayed=null;this.status='连接已恢复';
      if(!this.initialConnection) {
        this.initialConnection=true;
        const config=nowConfig(this.clock());
        if(!this.current||this.current.snapshot.config.hourMode!=='clock')
          this.current=this.store.add(calculate(config));
        this.liveMode=true;this.clockMinute=null;this.store.setSetting('live_clock','true');
        this.store.select(this.current.id);
        this.current={...this.current,snapshot:calculate(config)};
        this.store.updateSnapshot(this.current.id,this.current.snapshot);
        this.clockMinute=`${config.date} ${config.time}`;
        console.log('服务启动，选择当前时间局：',JSON.stringify({chartId:this.current.id,time:this.clockMinute}));
        this.refresh();return;
      }
      if(!this.current)this.current=this.store.add(calculate(nowConfig(this.clock())));
      this.liveMode=this.store.setting('live_clock')!=='false';
      if(!this.liveMode||!this.refreshClock(true))this.refresh();
      return;
    }
    if(e.connectionId!==undefined&&e.connectionId!==this.connectionId)return;
    if(e.event==='disconnected') {
      this.connected=false;this.generation++;this.recording=null;this.playing=false;
      console.error('Note4连接结束：',e.reason);return;
    }
    if(!this.connected)return;
    if(e.event==='recording_started') {
      if(this.displayUncertain){this.recording={invalid:true};return;}
      this.generation++;this.playing=false;
      if(!this.displayed){this.recording={invalid:true};return;}
      this.recording={chart:this.displayed,generation:this.generation,connectionId:this.connectionId};
      return;
    }
    if(e.event==='recording_finished') {
      const lock=this.recording;this.recording=null;
      if(!lock||lock.invalid){
        this.status=this.displayUncertain?'盘面显示结果未知，请重新连接':
          !this.displayed?'盘面尚未显示完成，请稍后录音':
          e.reason==='Failed'?'录音失败：设备录音处理失败':'录音未成功开始，请在提示后提问';
        this.refresh();return;
      }
      const pcm=Buffer.from(e.pcm||'','base64');
      if(!['Completed','Limit'].includes(e.reason)||pcm.length<3200||pcm.length%2){this.status=e.reason==='Failed'?'录音失败：设备录音处理失败':'录音无效，请重新长按提问';this.refresh();return;}
      if(this.jobs.size>=2){this.status='前次解读仍在处理，请稍后提问';this.refresh();return;}
      const job=this.answer(lock,pcm).catch(error=>console.error('解读记录保存失败：',error.message));
      this.jobs.add(job);job.finally(()=>this.jobs.delete(job));return;
    }
    if(e.event!=='key'||e.action!=='Short'||this.recording||!this.current)return;
    this.generation++;
    if(this.playing){this.playing=false;await this.device.call('stop',{},10000,this.connectionId).catch(()=>{});}
    if(e.key==='Confirm'){
      this.liveMode=false;this.store.setSetting('live_clock','false');
      this.current={id:--this.temporaryId,snapshot:calculate(nowConfig(this.clock(),this.draw(1,61)))};
    }
    else if(e.key==='Up'||e.key==='Down') {
      const config=this.current.snapshot.config,random=config.hourMode==='random';
      const date=random?new Date(this.clock()):new Date(`${config.date}T${config.time}:00+08:00`);
      if(!random||e.key==='Down')date.setTime(date.getTime()+(e.key==='Up'?-1:1)*2*60*60*1000);
      const next=nowConfig(date,0,config.method);
      this.current=this.store.add(calculate(next));
      this.liveMode=random&&e.key==='Up';
      this.clockMinute=this.liveMode?`${next.date} ${next.time}`:null;
      this.store.setSetting('live_clock',String(this.liveMode));
    } else return;
    this.status='';this.refresh();
    console.log('盘面已选择：',JSON.stringify({chartId:this.current.id,key:e.key,connectionId:this.connectionId}));
  }
  refresh() {
    this.dirty=true;
    if(this.refreshing||!this.connected||this.recording||this.displayUncertain)return;
    this.refreshing=true;
    this.refreshTask=(async()=>{
      try {
        while(this.dirty&&this.connected&&!this.recording) {
          this.dirty=false;const c=this.current,ids=this.store.list(),connectionId=this.connectionId;
          const png=this.renderer(c.snapshot,{status:this.status,position:1,total:1});
          try {
            await showFrame(this.device,{png:png.toString('base64'),format:process.env.NOTE4_IMAGE_FORMAT||'gray16'},connectionId,
              {canSend:()=>this.connected&&!this.recording&&connectionId===this.connectionId&&c.id===this.current?.id});
            if(this.connected&&connectionId===this.connectionId){
              this.displayed=c;this.onDisplay({chartId:c.id,connectionId,position:ids.indexOf(c.id)+1,total:ids.length});
            }
          }
          catch(error){
            if(connectionId!==this.connectionId)continue;
            if(!this.connected)break;
            if(error.message==='显示已取消')continue;
            this.status=`显示失败：${error.message}`;console.error(this.status);
            // Never resend a request whose display receipt was lost.
            if(/ResultUnknown|结果未知/.test(error.message))this.displayUncertain=true;
            break;
          }
        }
      }finally{this.refreshing=false;}
    })();
    this.refreshTask.catch(error=>{this.status='盘面渲染失败';console.error(error.message);});
  }
  refreshClock(force=false) {
    if(!this.connected||!this.liveMode||!this.current||this.recording||this.playing||this.jobs.size)return false;
    const config=nowConfig(this.clock());
    const minute=`${config.date} ${config.time}`;
    if(!force&&minute===this.clockMinute)return false;
    if(this.current.snapshot.config.hourMode!=='clock')return false;
    this.current={...this.current,snapshot:calculate(config)};
    this.store.updateSnapshot(this.current.id,this.current.snapshot);
    this.store.select(this.current.id);this.store.setSetting('live_clock','true');
    this.clockMinute=minute;this.generation++;this.status='';this.refresh();
    console.log('正常时间局已更新：',JSON.stringify({chartId:this.current.id,time:minute}));
    return true;
  }
  isActive(lock) {return this.connected&&!this.recording&&lock.connectionId===this.connectionId&&lock.generation===this.generation&&lock.chart.id===this.current?.id;}
  setStage(lock,message) {if(this.isActive(lock)){this.status=message;this.refresh();}}
  async answer(lock,pcm) {
    // A random draw remains transient unless the user asks for an interpretation.
    // An interpretation needs a private snapshot for its saved transcript, but
    // that snapshot is never used for Up/Down navigation.
    if(lock.chart.id<0&&!lock.chart.recordId)
      lock.chart.recordId=this.store.add(lock.chart.snapshot,{select:false}).id;
    const chartId=lock.chart.recordId||lock.chart.id;
    const id=this.store.createReading(chartId);
    let stage='识别';
    try {
      this.setStage(lock,'正在识别问题…');
      const question=await this.ai.transcribe(pcm);pcm=null;
      this.store.update(id,{question,stage:'解读'});stage='解读';
      this.setStage(lock,'正在解读当前盘面…');
      const history=this.store.readings(chartId).filter(r=>r.id<id);
      const answer=await this.ai.interpret(lock.chart.snapshot,question,history);
      this.store.update(id,{answer,stage:'摘要'});stage='摘要';
      const summary=await this.ai.summarize(answer);
      this.store.update(id,{summary,stage:'合成'});stage='合成';
      if(!this.isActive(lock)){this.store.update(id,{stage:'完成（切盘未播放）'});return;}
      this.setStage(lock,'正在生成播报…');
      const audio=await this.ai.synthesize(summary);
      if(!this.isActive(lock)){this.store.update(id,{stage:'完成（切盘未播放）'});return;}
      stage='播放';this.setStage(lock,'正在播报解读…');
      if(this.refreshTask)await this.refreshTask;
      if(!this.isActive(lock)){this.store.update(id,{stage:'完成（切盘未播放）'});return;}
      this.playing=true;
      const result=await this.device.call('play',{pcm:audio.toString('base64'),volume:Number(process.env.NOTE4_VOLUME||65)},150000,lock.connectionId);
      this.store.update(id,{stage:result?.end==='Completed'?'完成':'完成（播放已中断）'});
      if(this.isActive(lock)){this.playing=false;this.setStage(lock,'解读已保存，可继续长按追问');}
    }catch(error){
      this.store.update(id,{stage:`${stage}失败`,error:error.message});
      if(this.isActive(lock)){this.playing=false;this.setStage(lock,`${stage}失败：${error.message}`);}
    }
  }
}
