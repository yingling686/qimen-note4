import fs from 'node:fs';
import path from 'node:path';
import {format} from 'node:util';

// Keep an independent, bounded log when DSM's container log viewer is empty.
// Callers must never log PCM, questions, model responses or credentials.
export function installLogging(dir) {
  fs.mkdirSync(dir,{recursive:true});
  const file=path.join(dir,'service.log');
  const originals={};
  for(const level of ['log','warn','error']) {
    originals[level]=console[level];
    console[level]=(...args)=>{
      const line=`${new Date().toISOString()} [${level}] ${format(...args)}\n`;
      try {
        if(fs.existsSync(file)&&fs.statSync(file).size>2*1024*1024)fs.renameSync(file,`${file}.1`);
        fs.appendFileSync(file,line,{mode:0o600});
      }catch(error){originals.error('写入运行日志失败：',error.code||'IO_ERROR');}
      originals[level](line.trimEnd());
    };
  }
  return ()=>{for(const level of Object.keys(originals))console[level]=originals[level];};
}
