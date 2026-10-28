import readline from 'node:readline';
import fs from 'node:fs';
import path from 'node:path';
import {calculate,nowConfig} from './engine.mjs';
import {render,svgFor} from './render.mjs';
export function dispatch(req) {
  if(req.command === 'calculate') return {snapshot:calculate(req.config)};
  if(req.command === 'render') return {png:render(req.snapshot,req.options).toString('base64')};
  throw new Error('未知worker命令');
}
if(process.argv[2]==='preview') {
  const dir=process.env.PREVIEW_DIR||'outputs'; fs.mkdirSync(dir,{recursive:true});
  const snapshot=calculate(nowConfig(new Date(),17));
  fs.writeFileSync(path.join(dir,'preview.png'),render(snapshot,{}));
  fs.writeFileSync(path.join(dir,'preview.svg'),svgFor(snapshot,{}));
  console.log(path.resolve(dir,'preview.png'));
} else {
  const lines=readline.createInterface({input:process.stdin,crlfDelay:Infinity});
  for await(const line of lines) {
    try {console.log(JSON.stringify({ok:true,...dispatch(JSON.parse(line))}));}
    catch(error) {console.log(JSON.stringify({ok:false,error:error.message}));}
  }
}
