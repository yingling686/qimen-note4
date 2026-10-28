import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
process.env.TZ = 'Asia/Shanghai';
export const sourceDir = process.env.QIMEN_SOURCE || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../engine');
const ctx = vm.createContext({console: {log() {}, error() {}}, Date});
ctx.window = ctx;
for (const name of ['scc', 'qm', 'reactions', 'notes-knowledge', 'ai-guide']) {
  vm.runInContext(fs.readFileSync(path.join(sourceDir, `${name}.js`), 'utf8'), ctx);
}
// Reuse the H5's actual serialization and interpretation functions, without its DOM/UI.
const app = fs.readFileSync(path.join(sourceDir, 'app.js'), 'utf8');
const declarations = app.slice(app.indexOf('  const STEMS'), app.indexOf('  const IS_NATIVE_APP'));
function existingFunction(name) {
  const start = app.indexOf(`  function ${name}(`);
  if (start < 0) throw new Error(`H5 function missing: ${name}`);
  const next = app.slice(start + 1).search(/^  (?:async )?function /m);
  if (next < 0) throw new Error(`H5 function boundary missing: ${name}`);
  return app.slice(start, start + 1 + next);
}
const names = ['pad','dateString','ganzhi','stemClass','stemHtml','normalizeJia','relationText',
  'reactionFor','selectedReactions','noteReference','stemSnapshot','palaceSnapshot','patternSnapshot','knowledgeSnapshot','buildAiChartData'];
vm.runInContext(`${declarations}
const state = {};
const reactionMap = new Map(window.QM_REACTIONS.slice(1).map(x => [x[0],x]));
function birthLifeInfo() { return null; }
${names.map(existingFunction).join('\n')}
this.calculate = function(config) {
  Object.assign(state, config);
  state.calendar = new SCC(dateString(), state.hourMode === 'random' ? state.randomHourId : 0);
  state.panel = fn_panel(state.method, dateString(), state.calendar);
  const chart = buildAiChartData('');
  return {config, calendar: state.calendar, panel: state.panel, chart,
    solarTerm: A_ST[state.calendar.id_ST],
    solarTermAt: obj_SolarTerms[state.calendar.year_scc][state.calendar.id_ST],
    guide: window.QM_AI_GUIDE};
};`, ctx);
export function nowConfig(date = new Date(), randomHourId = 0, method = 0) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).map(p=>[p.type,p.value]));
  return {date:`${parts.year}-${parts.month}-${parts.day}`, time:`${parts.hour}:${parts.minute}`, method,
    hourMode:randomHourId ? 'random':'clock', randomHourId};
}
export function calculate(config) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(config.date) || !/^\d{2}:\d{2}$/.test(config.time)) throw new Error('日期时间格式无效');
  const t = new Date(`${config.date}T${config.time}:00+08:00`);
  if (!Number.isFinite(+t) || t < new Date('1929-01-12T00:00:00+08:00') || t > new Date('2099-10-26T23:59:59+08:00')) throw new Error('日期超出算法范围');
  if (![0,1].includes(config.method) || !['clock','random'].includes(config.hourMode)) throw new Error('排盘方式无效');
  if (config.hourMode === 'random' && (!Number.isInteger(config.randomHourId) || config.randomHourId < 1 || config.randomHourId > 60)) throw new Error('抽时编号必须为1至60');
  return JSON.parse(JSON.stringify(ctx.calculate(config)));
}
