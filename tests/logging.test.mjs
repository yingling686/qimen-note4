import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {installLogging} from '../node/logging.mjs';
test('文件日志带时间并在超出2MB后轮转',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'note4-log-'));
  const restore=installLogging(dir),file=path.join(dir,'service.log');
  try {
    console.log('服务启动');assert.match(fs.readFileSync(file,'utf8'),/\d{4}-.*\[log\] 服务启动/);
    fs.writeFileSync(file,'x'.repeat(2*1024*1024+1));console.warn('连接重试');
    assert.ok(fs.existsSync(`${file}.1`));assert.match(fs.readFileSync(file,'utf8'),/连接重试/);
  }finally{restore();fs.rmSync(dir,{recursive:true,force:true});}
});
