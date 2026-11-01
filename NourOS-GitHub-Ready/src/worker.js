// Nour.OS — Cloudflare Worker. No administrator routes are accessible without a verified Access JWT.
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const fail=(msg,status)=>json({error:msg},status);
const types={'application/pdf':'.pdf','image/png':'.png','image/jpeg':'.jpg','image/webp':'.webp'};
const maxBytes=20*1024*1024;
function validContent(d){return d&&typeof d==='object'&&d.profile&&['projects','experience','achievements','documents'].every(k=>Array.isArray(d[k]))&&JSON.stringify(d).length<700000}
function cleanContent(d){const o=structuredClone(d);for(const k of ['projects','experience','achievements'])for(const x of o[k]){delete x.media;delete x.url;}for(const x of o.documents){delete x.url;}delete o.profile.cv;return o;}
function b64(s){const raw=atob(s.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(raw,c=>c.charCodeAt(0))}
async function isAdmin(req,env){
 if(!env.ACCESS_TEAM_DOMAIN||!env.ACCESS_AUD||!env.ADMIN_EMAIL||[env.ACCESS_TEAM_DOMAIN,env.ACCESS_AUD,env.ADMIN_EMAIL].some(x=>String(x).includes('REPLACE_WITH')))return false;
 const token=req.headers.get('cf-access-jwt-assertion');if(!token)return false;
 try{
  const [head,payload,sig,extra]=token.split('.');if(extra||!sig)return false;
  const h=JSON.parse(new TextDecoder().decode(b64(head))),p=JSON.parse(new TextDecoder().decode(b64(payload)));
  const domain=env.ACCESS_TEAM_DOMAIN.replace(/^https?:\/\//,'').replace(/\/$/,'');
  if(h.alg!=='RS256'||!h.kid||p.iss!==`https://${domain}`||!Array.isArray(p.aud)||!p.aud.includes(env.ACCESS_AUD)||p.exp<=Date.now()/1000||!p.sub||String(p.email||'').toLowerCase()!==env.ADMIN_EMAIL.toLowerCase())return false;
  const r=await fetch(`https://${domain}/cdn-cgi/access/certs`,{cf:{cacheTtl:300,cacheEverything:true}});if(!r.ok)return false;
  const {keys}=await r.json();const jwk=keys.find(k=>k.kid===h.kid);if(!jwk)return false;
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  return await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,b64(sig),new TextEncoder().encode(head+'.'+payload));
 }catch{return false}
}
async function getRaw(env){const row=await env.DB.prepare("SELECT value FROM settings WHERE key='content'").first();return row?JSON.parse(row.value):null}
async function getFiles(env,admin){return (await env.DB.prepare(`SELECT id,entry_id,collection,original_name,content_type,byte_size,visibility,allow_download FROM files WHERE status='ready' ${admin?'':"AND visibility='public'"} ORDER BY created_at DESC`).all()).results}
function attach(content,files){const out=structuredClone(content);for(const k of ['projects','experience','achievements'])for(const item of out[k])item.media=[];out.documents=[];
 for(const f of files){const m={id:f.id,name:f.original_name,kind:f.content_type.startsWith('image/')?'image':'document',url:`/api/file/${encodeURIComponent(f.id)}`,visibility:f.visibility,downloadable:!!f.allow_download};if(f.collection==='documents')out.documents.push({...m,id:f.entry_id||f.id});else{const entry=out[f.collection]?.find(x=>x.id===f.entry_id);if(entry)entry.media.push(m)}}return out}
async function serveFile(req,env,id){const f=await env.DB.prepare('SELECT * FROM files WHERE id=? AND status=?').bind(id,'ready').first();if(!f)return fail('Not found',404);if(f.visibility!=='public'&&!await isAdmin(req,env))return fail('Not found',404);const obj=await env.FILES.get(f.object_key);if(!obj)return fail('Not found',404);const download=new URL(req.url).searchParams.get('download')==='1';if(download&&!f.allow_download&&!await isAdmin(req,env))return fail('Download not permitted',403);
 const name=f.original_name.replace(/[\r\n"\\]/g,'_');return new Response(req.method==='HEAD'?null:obj.body,{headers:{'content-type':f.content_type,'content-disposition':`${download?'attachment':'inline'}; filename="${name}"`,'x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; sandbox",'cache-control':f.visibility==='private'?'private, no-store':'public, max-age=120'}})}
async function upload(req,env){const form=await req.formData();const file=form.get('file'),collection=String(form.get('collection')||''),entryId=String(form.get('entry_id')||'');if(!(file instanceof File)||!types[file.type]||file.size>maxBytes||file.size<1)return fail('PDF/PNG/JPEG/WebP only; maximum 20 MB',400);if(!['projects','experience','achievements','documents'].includes(collection))return fail('Invalid collection',400);if(collection!=='documents'){const content=await getRaw(env);if(!content?.[collection]?.some(x=>x.id===entryId))return fail('Entry must be saved before uploading files',400)}
 const visibility=form.get('visibility')==='public'?'public':'private',download=form.get('downloadable')==='true'?1:0,id=crypto.randomUUID(),key=`uploads/${id}${types[file.type]}`;const name=String(file.name||'upload').slice(0,180).replace(/[\r\n]/g,' ');
 await env.FILES.put(key,file.stream(),{httpMetadata:{contentType:file.type}});
 try{await env.DB.prepare('INSERT INTO files (id,entry_id,collection,original_name,object_key,content_type,byte_size,visibility,allow_download,status) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(id,entryId||id,collection,name,key,file.type,file.size,visibility,download,'ready').run()}catch(e){await env.FILES.delete(key);throw e}return json({id,name,visibility,downloadable:!!download},201)}
export default {async fetch(req,env){try{
 const u=new URL(req.url),p=u.pathname;
 if(p.startsWith('/api/file/')){if(!['GET','HEAD'].includes(req.method))return fail('Method not allowed',405);return serveFile(req,env,decodeURIComponent(p.slice(10)))}
 if(p==='/api/content'&&req.method==='GET'){const content=await getRaw(env);if(!content)return fail('Content not initialized',503);return json(attach(content,await getFiles(env,false)))}
 if(p.startsWith('/admin/api/')||p==='/admin'||p.startsWith('/admin/')){
  if(!await isAdmin(req,env))return fail('Unauthorized',401);
  if(p==='/admin')return Response.redirect(u.origin+'/admin/',302);
  if(p==='/admin/'||p==='/admin/index.html')return env.ASSETS.fetch(new Request(new URL('/admin/index.html',u),req));
  if(p==='/admin/api/content'&&req.method==='GET'){const content=await getRaw(env);return json(content?attach(content,await getFiles(env,true)):null)}
  if(p==='/admin/api/content'&&req.method==='PUT'){const d=await req.json();if(!validContent(d))return fail('Invalid content',400);const safe=cleanContent(d);await env.DB.prepare("INSERT INTO settings(key,value) VALUES ('content',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP").bind(JSON.stringify(safe)).run();return json({ok:true})}
  if(p==='/admin/api/files'&&req.method==='GET')return json(await getFiles(env,true));
  if(p==='/admin/api/upload'&&req.method==='POST')return upload(req,env);
  const match=p.match(/^\/admin\/api\/files\/([0-9a-f-]+)$/);
  if(match&&req.method==='PATCH'){const b=await req.json(),visibility=b.visibility==='public'?'public':'private',dl=b.downloadable===true?1:0;await env.DB.prepare('UPDATE files SET visibility=?,allow_download=? WHERE id=?').bind(visibility,dl,match[1]).run();return json({ok:true})}
  if(match&&req.method==='DELETE'){const f=await env.DB.prepare('SELECT object_key FROM files WHERE id=?').bind(match[1]).first();if(!f)return fail('Not found',404);await env.DB.prepare('DELETE FROM files WHERE id=?').bind(match[1]).run();await env.FILES.delete(f.object_key);return json({ok:true})}
  if(p.startsWith('/api/'))return fail('Not found',404);
 }
 if(p.startsWith('/api/'))return fail('Not found',404);
 return env.ASSETS.fetch(req);
 }catch(e){console.error(e);return fail('Server error',500)}}};
