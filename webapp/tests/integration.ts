import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { handle, digest } from '../lib/server';
import { unzipSync, strFromU8 } from 'fflate';
import { PDFDocument } from 'pdf-lib';
const db=new DatabaseSync(':memory:');
for(const f of readdirSync('drizzle').filter(x=>x.endsWith('.sql')))db.exec(readFileSync('drizzle/'+f,'utf8'));
// Exercise the real SQL schema through a small D1-compatible SQLite adapter.
function prepare(sql:string):any {let values:any[]=[];return {bind(...args:any[]){values=args;return this;},async first(){return db.prepare(sql).get(...values)||null;},async all(){return {results:db.prepare(sql).all(...values)};},async run(){const r=db.prepare(sql).run(...values);return {meta:{changes:Number(r.changes)}};}};}
const env={DB:{prepare,async batch(queries:any[]){db.exec('BEGIN');try{const r=[];for(const q of queries)r.push(await q.run());db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}}},AUTH_PEPPER:'test-only-pepper-not-production',SETUP_KEY_HASH:await digest('test-setup-key'),APP_ORIGIN:'https://test.example'};
let jar:Record<string,string>={},csrf='',ip='192.0.2.1';
async function request(path:string,method='GET',body?:any,extra:Record<string,string>={}) {
 const r=await handle(new Request(env.APP_ORIGIN+path,{method,headers:{Cookie:Object.entries(jar).map(([k,v])=>k+'='+v).join('; '),'CF-Connecting-IP':ip,...(body?{Origin:env.APP_ORIGIN,'Content-Type':'application/json','X-CSRF-Token':csrf}:{}),...extra},body:body?JSON.stringify(body):undefined}),env);
 const c=r.headers.get('Set-Cookie');if(c){const [k,v]=c.split(';')[0].split('=');jar[k]=v;}
 return r;
}
let r=await request('/api/session');let j=await r.json() as any;csrf=j.csrf;assert.equal(j.configured,false);
assert.equal((await request('/api/setup','POST',{setupKey:'wrong',password:'1234'})).status,401);
assert.equal((await request('/api/setup','POST',{setupKey:'test-setup-key',password:'1234'},{Origin:'https://evil.example'})).status,403);
r=await request('/api/setup','POST',{setupKey:'test-setup-key',password:'1234'});assert.equal(r.status,200);csrf=(await r.json() as any).csrf;
assert.match(r.headers.get('Set-Cookie')!,/HttpOnly; Secure; SameSite=Strict/);
const stored=db.prepare('SELECT password FROM admin').get() as any;assert.match(stored.password,/pbkdf2/);assert.ok(!stored.password.includes('1234'));
assert.equal((await request('/api/setup','POST',{setupKey:'test-setup-key',password:'9999'})).status,409);
const entry={id:crypto.randomUUID(),studentId:'TEST-001',name:'가상학생',title:'=HYPERLINK("https://example.com")',author:'테스트 작가',review:'가'.repeat(200)};
assert.equal((await request('/api/entries','POST',{...entry,review:'가'.repeat(199)})).status,400);
assert.equal((await request('/api/entries','POST',entry,{'X-CSRF-Token':'bad'})).status,403);
assert.equal((await request('/api/entries','POST',entry)).status,201);
assert.equal((await request('/api/entries','POST',entry)).status,201);
j=await (await request('/api/entries?q=가상학생')).json();assert.equal(j.total,1);assert.equal(j.entries[0].review.length,200);
const xlsx=await request('/api/export.xlsx');assert.equal(xlsx.status,200);const xbytes=new Uint8Array(await xlsx.arrayBuffer()),files=unzipSync(xbytes),sheet=strFromU8(files['xl/worksheets/sheet1.xml']);assert.ok(sheet.includes('가상학생'));assert.ok(sheet.includes('t="inlineStr"'));assert.ok(!sheet.includes('<f>'));
const pdf=await request('/api/export.pdf');assert.equal(pdf.status,200);const pbytes=new Uint8Array(await pdf.arrayBuffer()),document=await PDFDocument.load(pbytes);assert.ok(document.getPageCount()>0);
const longEntry={...entry,id:crypto.randomUUID(),title:'긴 감상문 줄바꿈 시험',review:('한글 문장과 이모지 🦉를 함께 확인합니다.\n').repeat(200)};
assert.equal((await request('/api/entries','POST',longEntry)).status,201);
const longPdf=await request('/api/export.pdf?q=긴');assert.equal(longPdf.status,200);assert.ok((await PDFDocument.load(await longPdf.arrayBuffer())).getPageCount()>1);
await request('/api/entries/'+longEntry.id,'PATCH',{action:'trash'});
mkdirSync('.sites-runtime/test-artifacts',{recursive:true});writeFileSync('.sites-runtime/test-artifacts/sample.xlsx',xbytes);writeFileSync('.sites-runtime/test-artifacts/sample.pdf',pbytes);
assert.equal((await request('/api/entries/'+entry.id,'PATCH',{action:'review',reviewed:true})).status,200);
assert.equal((await request('/api/entries/'+entry.id,'PATCH',{action:'trash'})).status,200);
j=await (await request('/api/entries')).json();assert.equal(j.total,0);
j=await (await request('/api/entries?trash=1&q=가상학생')).json();assert.equal(j.total,2);
assert.equal((await request('/api/entries/'+entry.id,'PATCH',{action:'restore'})).status,200);
const oldJar={...jar};assert.equal((await request('/api/password','POST',{oldPassword:'wrong',password:'5678'})).status,401);
r=await request('/api/password','POST',{oldPassword:'1234',password:'5678'});assert.equal(r.status,200);csrf=(await r.json() as any).csrf;
const newJar={...jar};jar=oldJar;assert.equal((await request('/api/entries')).status,401);jar=newJar;
assert.equal((await request('/api/logout','POST',{})).status,200);assert.equal((await request('/api/entries')).status,401);assert.equal((await request('/api/export.xlsx')).status,401);
r=await request('/api/session');csrf=(await r.json() as any).csrf;ip='192.0.2.2';
for(let n=0;n<5;n++)assert.equal((await request('/api/login','POST',{password:'wrong'})).status,401);
assert.equal((await request('/api/login','POST',{password:'5678'})).status,429);
ip='192.0.2.3';r=await request('/api/login','POST',{password:'5678'});assert.equal(r.status,200);
db.close();console.log('PASS: setup, CSRF/origin, 199/200 boundary, idempotency, private search/export, Korean PDF, XLSX text safety, review/trash/restore, password rotation, session revocation, login rate limits');
