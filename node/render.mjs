import {Resvg} from '@resvg/resvg-js';
import fs from 'node:fs';
const esc = x => String(x ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const order = [4,9,2,3,5,7,8,1,6];
export function svgFor(snapshot, {status='',position=1,total=1}={}) {
  const {chart, config, panel} = snapshot;
  const text=(x,y,s,size=16,more='')=>`<text x="${x}" y="${y}" font-size="${size}" ${more}>${esc(s)}</text>`;
  const rect=(x,y,w,h,fill='white',stroke='black')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}"/>`;
  const day=chart.calendar.dayHiddenAs, hour=chart.calendar.hourHiddenAs;
  function stem(x,y,obj,sky=false) {
    if(!obj) return '';
    let s='';
    if(sky && obj.symbol === day) s+=rect(x-1,y-16,17,20,'black','black');
    else if(sky && obj.symbol === hour) s+=rect(x-1,y-16,17,20);
    return s+text(x,y,obj.symbol,16,sky && obj.symbol === day ? 'fill="white"':'');
  }
  const d=new Date(`${config.date}T${config.time}:00+08:00`);
  const lunar=new Intl.DateTimeFormat('zh-CN-u-ca-chinese',{timeZone:'Asia/Shanghai',month:'long',day:'numeric'}).format(d);
  const dayOfTerm=Math.floor((d-new Date(snapshot.solarTermAt))/86400000)+1;
  let s=`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="white"/><g font-family="Noto Sans CJK SC,Microsoft YaHei,SimHei,sans-serif" fill="black">`;
  s+=text(5,18,`${config.date} ${config.time}`,15)+text(211,18,`${lunar} ${snapshot.solarTerm}第${dayOfTerm}天`,12);
  const pillars=chart.calendar.pillars;
  ['year','month','day','hour'].forEach((k,i)=>{
    s+=text(6,77+i*58,pillars[k],42,k==='day'?'font-weight="bold"':'');
    s+=text(94,77+i*58,['年','月','日','时'][i],17);
  });
  const x0=121,y0=29,w=91,h=79;
  for(let i=0;i<9;i++) {
    const id=order[i], x=x0+(i%3)*w, y=y0+Math.floor(i/3)*h;
    s+=rect(x,y,w,h);
    if(id===5) {
      s+=text(x+5,y+17,`${chart.setup.dun}${chart.setup.ju}局`,13);
      s+=text(x+5,y+37,config.hourMode==='random'?`抽${pillars.hour}`:'时家转盘',14);
      s+=text(x+5,y+56,`符${chart.setup.chiefStar.slice(1)} 使${chart.setup.chiefDoor.slice(0,1)}`,12);
      const stems=['','甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
      s+=text(x+63,y+73,stems[panel[5].host.id],20);
      continue;
    }
    const p=chart.palaces.find(p=>p.id===id);
    s+=text(x+4,y+21,p.god.name,19,p.god.id===1?'font-weight="bold"':'');
    s+=text(x+3,y+45,p.star.name,18);
    s+=stem(x+57,y+45,p.skyStem,true)+stem(x+74,y+45,p.skyExtraStem,true);
    if(p.markers.chiefDoorHere)s+=`<rect data-marker="chief-door" x="${x+1}" y="${y+49}" width="39" height="23" fill="white" stroke="black" stroke-width="1.2"/>`;
    s+=text(x+3,y+68,p.door.name,18,p.markers.chiefDoorHere?'font-weight="bold"':'');
    s+=stem(x+57,y+68,p.earthStem)+stem(x+74,y+68,p.earthExtraStem);
    s+=text(x+65,y+16,`${p.vacancy?'○':''}${p.horse?'马':''}`,11);
    s+=text(x+4,y+77,p.palace,7);
  }
  const label=config.hourMode==='random'?'随机盘 · 上键回此时':'时间盘 · 上下切换时辰';
  s+=text(4,284,label,11)+text(4,298,String(status).slice(0,32)||'上下翻盘 · 短按抽盘 · 长按提问',11);
  return s+'</g></svg>';
}
export function render(snapshot, options) {
  const font=process.env.CJK_FONT;
  if(font && !fs.existsSync(font)) throw new Error('指定中文字体不存在');
  return new Resvg(svgFor(snapshot,options),{font:{loadSystemFonts:true,...(font?{fontFiles:[font]}:{})}}).render().asPng();
}
