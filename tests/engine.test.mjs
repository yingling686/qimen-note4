import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {calculate,sourceDir} from '../node/engine.mjs';
import {svgFor,render} from '../node/render.mjs';
const legacy=vm.createContext({console:{log(){}}});
for(const n of ['scc','qm'])vm.runInContext(fs.readFileSync(`${sourceDir}/${n}.js`,'utf8'),legacy);
test('60个抽时和时间盘与原引擎一致，包含寄干、空亡和驿马',()=>{
  for(const date of ['2026-08-17','2026-10-21','2027-02-04'])for(let hour=0;hour<=60;hour++) {
    const config={date,time:'12:24',method:0,hourMode:hour?'random':'clock',randomHourId:hour};
    const snapshot=calculate(config);
    const ce=`${date.replaceAll('-','/')} 12:24:00`;
    legacy.ce=ce;legacy.hour=hour;
    const raw=vm.runInContext('fn_panel(0,ce,new SCC(ce,hour))',legacy);
    assert.deepEqual(snapshot.panel,JSON.parse(JSON.stringify(raw)));
    assert.equal(snapshot.chart.palaces.length,8);
    for(const p of snapshot.chart.palaces) {
      assert.equal(p.skyStem.id,raw[p.id].guest.id);
      assert.equal(p.skyExtraStem?.id||0,raw[p.id].guest_ex.id);
      assert.equal(p.earthExtraStem?.id||0,raw[p.id].host_ex.id);
      assert.equal(p.vacancy,Boolean(raw[p.id].pal.vacancy));
      assert.equal(p.horse,Boolean(raw[p.id].pal.horse));
      assert.ok(p.reactions.length && p.reactions.every(r=>r.originalExplanation&&r.noteExplanation));
    }
  }
});
test('400×300画面包含九宫、寄干，历史与状态不会遮盖盘面',()=>{
  const snap=calculate({date:'2026-10-21',time:'16:00',method:0,hourMode:'clock',randomHourId:0});
  const svg=svgFor(snap,{status:'正在解读当前盘面…',position:1,total:4});
  assert.match(svg,/1\/4/);assert.match(svg,/正在解读/);
  assert.equal((svg.match(/data-marker="chief-door"/g)||[]).length,1,'值使门需要一个清晰矩形框');
  for(const p of snap.chart.palaces)for(const obj of [p.god,p.star,p.door])assert.ok(svg.includes(obj.name));
  const png=render(snap,{});assert.equal(png.readUInt32BE(16),400);assert.equal(png.readUInt32BE(20),300);
  assert.equal(snap.chart.subject,null);
});
