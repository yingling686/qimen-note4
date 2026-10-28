import fs from 'node:fs';
import path from 'node:path';
// Explicit one-time server-key import. Never print the key or overwrite an existing .env.
const php=process.argv[2],destination=process.argv[3]||'.env';
if(!php)throw new Error('Usage: node tools/configure.mjs PATH_TO_QIMEN_API.php [ENV_DESTINATION]');
if(fs.existsSync(destination))throw new Error('目标.env已存在，保留现有配置');
const text=fs.readFileSync(php,'utf8');
const key=text.match(/const MINIMAX_API_KEY\s*=\s*'([^']+)'/)[1];
if(!key||key==='__MINIMAX_API_KEY__')throw new Error('源文件未配置密钥');
const model=text.match(/const MINIMAX_MODEL\s*=\s*'([^']+)'/)?.[1]||'MiniMax-M3';
let env=fs.readFileSync(new URL('../.env.example',import.meta.url),'utf8');
env=env.replace(/^MINIMAX_API_KEY=.*$/m,`MINIMAX_API_KEY=${key}`).replace(/^MINIMAX_TEXT_MODEL=.*$/m,`MINIMAX_TEXT_MODEL=${model}`);
fs.mkdirSync(path.dirname(path.resolve(destination)),{recursive:true});
fs.writeFileSync(destination,env,{mode:0o600,flag:'wx'});
console.log('服务端密钥已导入，未输出密钥。');
