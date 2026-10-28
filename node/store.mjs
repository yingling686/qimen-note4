import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
export class Store {
  constructor(dir) {
    fs.mkdirSync(dir,{recursive:true}); this.dir=dir;
    this.db=new DatabaseSync(path.join(dir,'qimen.sqlite'));
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS charts(id INTEGER PRIMARY KEY, created_at TEXT NOT NULL, snapshot TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS readings(id INTEGER PRIMARY KEY,chart_id INTEGER NOT NULL REFERENCES charts(id),
        created_at TEXT NOT NULL,question TEXT NOT NULL DEFAULT '',answer TEXT NOT NULL DEFAULT '',summary TEXT NOT NULL DEFAULT '',
        stage TEXT NOT NULL,error TEXT NOT NULL DEFAULT '');`);
  }
  add(snapshot,{select=true}={}) {
    const id=Number(this.db.prepare('INSERT INTO charts(created_at,snapshot) VALUES(?,?)').run(new Date().toISOString(),JSON.stringify(snapshot)).lastInsertRowid);
    if(select)this.select(id); return this.get(id);
  }
  get(id) {const row=this.db.prepare('SELECT * FROM charts WHERE id=?').get(id);return row?{...row,snapshot:JSON.parse(row.snapshot)}:null;}
  updateSnapshot(id,snapshot) {this.db.prepare('UPDATE charts SET snapshot=? WHERE id=?').run(JSON.stringify(snapshot),id);}
  list() {return this.db.prepare('SELECT id FROM charts ORDER BY id').all().map(r=>r.id);}
  setting(key) {return this.db.prepare('SELECT value FROM settings WHERE key=?').get(key)?.value;}
  setSetting(key,value) {this.db.prepare('INSERT INTO settings VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key,String(value));}
  current() {const r=this.db.prepare("SELECT value FROM settings WHERE key='current'").get();return r?this.get(Number(r.value)):null;}
  select(id) {this.db.prepare("INSERT INTO settings VALUES('current',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(String(id));}
  createReading(chartId) {return Number(this.db.prepare("INSERT INTO readings(chart_id,created_at,stage) VALUES(?,?,'识别')").run(chartId,new Date().toISOString()).lastInsertRowid);}
  update(id, fields) {
    const allowed=['question','answer','summary','stage','error'];
    const entries=Object.entries(fields).filter(([k])=>allowed.includes(k));
    if(!entries.length)return;
    this.db.prepare(`UPDATE readings SET ${entries.map(([k])=>`${k}=?`).join(',')} WHERE id=?`).run(...entries.map(([,v])=>v),id);
    this.export(id);
  }
  readings(chartId) {return this.db.prepare('SELECT * FROM readings WHERE chart_id=? ORDER BY id').all(chartId);}
  export(id) {
    const r=this.db.prepare('SELECT * FROM readings WHERE id=?').get(id), c=this.get(r.chart_id);
    const dir=path.join(this.dir,'records',String(r.chart_id));fs.mkdirSync(dir,{recursive:true});
    fs.writeFileSync(path.join(dir,'chart.json'),JSON.stringify(c.snapshot,null,2));
    fs.writeFileSync(path.join(dir,`${id}.md`),`# 奇门解读\n\n${c.snapshot.chart.calendar.gregorian}\n\n## 问题\n\n${r.question}\n\n## 完整解读\n\n${r.answer}\n\n## 播报摘要\n\n${r.summary}\n\n状态：${r.stage}${r.error?'\n\n'+r.error:''}\n`);
  }
  close() {this.db.close();}
}
