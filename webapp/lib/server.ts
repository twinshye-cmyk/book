import { exportXlsx, exportPdf } from './exports';
type Env = { DB: any; AUTH_PEPPER?: string; SETUP_KEY_HASH?: string; APP_ORIGIN?: string };
export type Entry = { id:string; student_id:string; name:string; title:string; author:string; review:string; created_at:number; reviewed:number; deleted_at:number|null };
const enc = new TextEncoder();
const hex = (b:ArrayBuffer|Uint8Array) => Array.from(new Uint8Array(b)).map(v=>v.toString(16).padStart(2,'0')).join('');
const random = () => hex(crypto.getRandomValues(new Uint8Array(32)));
export const digest = async (s:string) => hex(await crypto.subtle.digest('SHA-256',enc.encode(s)));
function equal(a:string,b:string) { if(a.length!==b.length)return false; let v=0; for(let i=0;i<a.length;i++)v|=a.charCodeAt(i)^b.charCodeAt(i); return v===0; }
function fail(status:number, message:string):never { throw Object.assign(new Error(message),{status}); }
function cookies(req:Request) { return Object.fromEntries((req.headers.get('Cookie')||'').split(';').map(s=>s.trim().split('=')).filter(x=>x.length===2)); }
function cookie(name:string,value:string,seconds:number) { return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${seconds}`; }
const authCookie='__Host-reading-session', csrfCookie='__Host-reading-csrf';
function json(body:any,status=200,headers:Record<string,string>={}) { return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8',...headers}}); }
async function derive(password:string, salt:string, pepper:string) {
  const key=await crypto.subtle.importKey('raw',enc.encode(pepper),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const hardened=await crypto.subtle.sign('HMAC',key,enc.encode(password));
  const base=await crypto.subtle.importKey('raw',hardened,'PBKDF2',false,['deriveBits']);
  return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:100000,hash:'SHA-256'},base,256));
}
export async function hashPassword(password:string,pepper:string) { const salt=random(); return `pbkdf2-sha256$100000$${salt}$${await derive(password,salt,pepper)}`; }
async function verifyPassword(password:string,stored:string,pepper:string) { const parts=stored.split('$'); return parts.length===4&&equal(await derive(password,parts[2],pepper),parts[3]); }
async function rate(env:Env,scope:string,identity:string,max:number,seconds:number) {
  const now=Math.floor(Date.now()/1000),slot=Math.floor(now/seconds),key=scope+':'+await digest(identity)+':'+slot;
  const row=await env.DB.prepare('INSERT INTO limits (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key,(slot+1)*seconds).first();
  if(row.count>max)fail(429,'시도 횟수를 초과했습니다. 최대 15분 후 다시 시도해 주세요.');
}
async function session(req:Request,env:Env) {
  const token=cookies(req)[authCookie]; if(!token||!/^[a-f0-9]{64}$/.test(token))return null;
  return env.DB.prepare('SELECT token,csrf,expires FROM sessions WHERE token=? AND expires>?').bind(await digest(token),Date.now()).first();
}
async function issueSession(env:Env) {
  const token=random(),csrf=random();
  await env.DB.prepare('INSERT INTO sessions (token,csrf,expires) VALUES (?,?,?)').bind(await digest(token),csrf,Date.now()+7200000).run();
  return json({ok:true,csrf,authenticated:true},200,{'Set-Cookie':cookie(authCookie,token,7200)});
}
function text(value:any,label:string,max:number,min=1) { if(typeof value!=='string')fail(400,`${label}을(를) 입력해 주세요.`); const s=value.trim(); if([...s].length<min||[...s].length>max)fail(400,`${label}: ${min}~${max.toLocaleString()}자로 입력해 주세요.`); return s; }
function password(value:any) { if(typeof value!=='string'||[...value].length<4||[...value].length>128)fail(400,'비밀번호는 4~128자로 입력해 주세요.'); return value; }
async function body(req:Request) {
  if(!req.headers.get('Content-Type')?.startsWith('application/json'))fail(415,'JSON 요청만 허용합니다.');
  const reader=req.body?.getReader(); if(!reader)fail(400,'입력 내용을 확인해 주세요.');
  let size=0; const chunks:Uint8Array[]=[];
  while(true) { const r=await reader!.read(); if(r.done)break; size+=r.value.length; if(size>65536){await reader!.cancel();fail(413,'입력 내용이 너무 큽니다.');} chunks.push(r.value); }
  const all=new Uint8Array(size); let offset=0;for(const c of chunks){all.set(c,offset);offset+=c.length;}
  try { const b=JSON.parse(new TextDecoder().decode(all)); if(!b||Array.isArray(b)||typeof b!=='object')fail(400,'입력 형식 오류'); return b; } catch { fail(400,'입력 형식을 확인해 주세요.'); }
}
export async function handle(req:Request,env:Env) {
  let result:Response;
  try { result=await route(req,env); } catch(e:any) { result=json({error:e.status?e.message:'처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'},e.status||500); }
  const h=new Headers(result.headers);
  h.set('Cache-Control','no-store');h.set('X-Content-Type-Options','nosniff');h.set('Referrer-Policy','no-referrer');h.set('X-Frame-Options','DENY');h.set('Strict-Transport-Security','max-age=31536000; includeSubDomains');
  return new Response(result.body,{status:result.status,headers:h});
}
async function route(req:Request,env:Env):Promise<Response> {
  if(!env.AUTH_PEPPER||!env.SETUP_KEY_HASH||!env.APP_ORIGIN)fail(503,'관리자 서버 설정이 필요합니다.');
  const url=new URL(req.url),path=url.pathname,method=req.method,now=Date.now();
  if(url.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(url.hostname))fail(400,'HTTPS 연결이 필요합니다.');
  const s=await session(req,env);
  if(!['GET','HEAD'].includes(method)) {
    if(req.headers.get('Origin')!==env.APP_ORIGIN)fail(403,'요청 출처를 확인할 수 없습니다. 화면을 새로고침해 주세요.');
    const csrf=req.headers.get('X-CSRF-Token')||'',expected=s?.csrf||cookies(req)[csrfCookie]||'';
    if(!/^[a-f0-9]{64}$/.test(csrf)||!equal(csrf,expected))fail(403,'보안 확인이 만료되었습니다. 화면을 새로고침해 주세요.');
  }
  if(path==='/api/session'&&method==='GET') {
    const configured=!!await env.DB.prepare('SELECT id FROM admin WHERE id=1').first(),csrf=s?.csrf||random();
    return json({authenticated:!!s,configured,csrf},200,s?{}:{'Set-Cookie':cookie(csrfCookie,csrf,7200)});
  }
  if(path==='/api/health'&&method==='GET') { await env.DB.prepare('SELECT id FROM admin LIMIT 1').first(); return json({ok:true}); }
  const ip=req.headers.get('CF-Connecting-IP')||'unknown';
  if((path==='/api/login'||path==='/api/setup')&&method==='POST') {
    await rate(env,'auth-ip',ip,5,900); await rate(env,'auth-global','all',30,900);
    const b=await body(req),p=password(b.password);
    if(path==='/api/setup') {
      const key=typeof b.setupKey==='string'?b.setupKey:'';
      if(!equal(await digest(key),env.SETUP_KEY_HASH))fail(401,'초기 설정 키를 확인해 주세요.');
      const hash=await hashPassword(p,env.AUTH_PEPPER);
      const r=await env.DB.prepare('INSERT INTO admin (id,password,created_at) VALUES (1,?,?) ON CONFLICT(id) DO NOTHING').bind(hash,now).run();
      if(!r.meta.changes)fail(409,'이미 초기 설정이 완료되었습니다. 로그인해 주세요.');
    } else {
      const admin=await env.DB.prepare('SELECT password FROM admin WHERE id=1').first();
      if(!admin)fail(409,'교사용 초기 설정을 먼저 완료해 주세요.');
      if(!await verifyPassword(p,admin.password,env.AUTH_PEPPER))fail(401,'비밀번호가 일치하지 않습니다.');
    }
    await env.DB.batch([env.DB.prepare('DELETE FROM sessions WHERE expires<?').bind(now),env.DB.prepare('DELETE FROM limits WHERE expires<?').bind(Math.floor(now/1000))]);
    return issueSession(env);
  }
  if(path==='/api/entries'&&method==='POST') {
    await rate(env,'submit-ip',ip,300,3600);await rate(env,'submit-global','all',3000,3600);
    if(!await env.DB.prepare('SELECT id FROM admin WHERE id=1').first())fail(503,'선생님이 초기 설정을 준비 중입니다.');
    const b=await body(req),entry={id:text(b.id,'제출 번호',36,36),student_id:text(b.studentId,'학번',30),name:text(b.name,'이름',60),title:text(b.title,'책 제목',200),author:text(b.author,'작가',120),review:text(b.review,'감상문',10000,200)};
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(entry.id))fail(400,'제출 번호가 올바르지 않습니다.');
    await env.DB.prepare('INSERT INTO entries (id,student_id,name,title,author,review,created_at,reviewed) VALUES (?,?,?,?,?,?,?,0) ON CONFLICT(id) DO NOTHING').bind(entry.id,entry.student_id,entry.name,entry.title,entry.author,entry.review,now).run();
    return json({ok:true,receipt:entry.id},201);
  }
  if(!s)fail(401,'교사용 로그인이 필요합니다.');
  if(path==='/api/logout'&&method==='POST') { await env.DB.prepare('DELETE FROM sessions WHERE token=?').bind(s.token).run();return json({ok:true},200,{'Set-Cookie':cookie(authCookie,'',0)}); }
  if(path==='/api/password'&&method==='POST') {
    await rate(env,'password',ip,5,900);
    const b=await body(req),p=password(b.password),admin=await env.DB.prepare('SELECT password FROM admin WHERE id=1').first();
    if(typeof b.oldPassword!=='string'||!await verifyPassword(b.oldPassword,admin.password,env.AUTH_PEPPER))fail(401,'현재 비밀번호가 일치하지 않습니다.');
    await env.DB.batch([env.DB.prepare('UPDATE admin SET password=? WHERE id=1').bind(await hashPassword(p,env.AUTH_PEPPER)),env.DB.prepare('DELETE FROM sessions')]);
    return issueSession(env);
  }
  if(path==='/api/entries'&&method==='GET') {
    const {where,args}=filter(url),page=Math.max(1,Math.min(10000,Math.floor(Number(url.searchParams.get('page'))||1)));
    const list=await env.DB.prepare(`SELECT * FROM entries WHERE ${where} ORDER BY created_at DESC,id LIMIT 25 OFFSET ?`).bind(...args,(page-1)*25).all();
    const count=await env.DB.prepare(`SELECT COUNT(*) total FROM entries WHERE ${where}`).bind(...args).first();
    const stats=await env.DB.prepare('SELECT COUNT(*) total,COUNT(DISTINCT student_id) students,SUM(reviewed) reviewed FROM entries WHERE deleted_at IS NULL').first();
    return json({entries:list.results,total:count.total,stats,page});
  }
  if(path.startsWith('/api/entries/')&&method==='PATCH') {
    const id=path.slice('/api/entries/'.length),b=await body(req);let r;
    if(b.action==='trash')r=await env.DB.prepare('UPDATE entries SET deleted_at=? WHERE id=? AND deleted_at IS NULL').bind(now,id).run();
    else if(b.action==='restore')r=await env.DB.prepare('UPDATE entries SET deleted_at=NULL WHERE id=? AND deleted_at IS NOT NULL').bind(id).run();
    else if(b.action==='review')r=await env.DB.prepare('UPDATE entries SET reviewed=? WHERE id=? AND deleted_at IS NULL').bind(b.reviewed?1:0,id).run();
    else fail(400,'지원하지 않는 작업입니다.');
    if(!r.meta.changes)fail(404,'제출물을 찾지 못했습니다.');return json({ok:true});
  }
  if((path==='/api/export.xlsx'||path==='/api/export.pdf')&&['GET','POST'].includes(method)) {
    await rate(env,'export',s.token,20,3600);
    const {where,args}=filter(url);
    let selected:string[]|null=null;
    if(method==='POST') {
      const b=await body(req);
      if(!Array.isArray(b.ids)||b.ids.length<1||b.ids.length>300)fail(400,'다운로드할 제출물을 1~300건 선택해 주세요.');
      if(b.ids.some((id:any)=>typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)))fail(400,'선택한 제출물 번호가 올바르지 않습니다.');
      selected=Array.from(new Set<string>(b.ids));
    }
    const selection=selected?` AND id IN (${selected.map(()=>'?').join(',')})`:'';
    const rows=(await env.DB.prepare(`SELECT * FROM entries WHERE ${where}${selection} ORDER BY created_at DESC,id LIMIT 301`).bind(...args,...(selected||[])).all()).results as Entry[];
    if(selected&&rows.length!==selected.length)fail(404,'선택한 제출물이 변경되었습니다. 목록을 새로 확인하고 선택해 주세요.');
    if(rows.length>300)fail(400,'한 번에 300건까지 저장할 수 있습니다. 검색으로 범위를 줄여 주세요.');
    const pdf=path.endsWith('.pdf');
    if(pdf&&rows.reduce((sum,r)=>sum+[...r.review].length,0)>50000)fail(400,'PDF는 감상문 합계 50,000자까지 저장할 수 있습니다. 검색으로 범위를 줄여 주세요.');
    const bytes=pdf?await exportPdf(rows):exportXlsx(rows);
    return new Response(bytes as any,{headers:{'Content-Type':pdf?'application/pdf':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':`attachment; filename="reading-journals.${pdf?'pdf':'xlsx'}"`}});
  }
  fail(404,'요청한 페이지를 찾지 못했습니다.');
}
function filter(url:URL) {
  const q=(url.searchParams.get('q')||'').slice(0,200).trim(),trash=url.searchParams.get('trash')==='1',pattern='%'+q.replace(/[\\%_]/g,'\\$&')+'%';
  return {where:`deleted_at IS ${trash?'NOT ':''}NULL AND (student_id LIKE ? ESCAPE '\\' OR name LIKE ? ESCAPE '\\' OR title LIKE ? ESCAPE '\\' OR author LIKE ? ESCAPE '\\')`,args:[pattern,pattern,pattern,pattern]};
}
