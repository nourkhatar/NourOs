// Admin Worker: every request requires a verified Cloudflare Access JWT.
import {json,fail,validContent,cleanContent,isAdmin,getRaw,getFiles,attach,serveFile,upload,getCategories,getActiveCv} from './shared.js';
export default {async fetch(req,env){
 try {
  if(!await isAdmin(req,env))return fail('Unauthorized',401);
  const u=new URL(req.url),p=u.pathname;
  if(p==='/'||p==='/admin')return Response.redirect(u.origin+'/admin/',302);
 if(p==='/admin/'||p==='/admin/index.html')return env.ASSETS.fetch(new Request(new URL('/admin/',u),req));
  if(p==='/admin/studio.js'||p==='/styles.css'||p==='/admin/nk-favicon.svg')return env.ASSETS.fetch(req);
  if(p.startsWith('/api/file/')&&['GET','HEAD'].includes(req.method))return serveFile(req,env,decodeURIComponent(p.slice('/api/file/'.length)));
  if(p==='/admin/api/content'&&req.method==='GET'){
   const content=await getRaw(env);return json(content?attach(content,await getFiles(env,true)):null);
  }
  if(p==='/admin/api/content'&&req.method==='PUT'){
   const d=await req.json();if(!validContent(d))return fail('Invalid content',400);
   const safe=cleanContent(d);
   await env.DB.prepare("INSERT INTO settings(key,value) VALUES ('content',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP").bind(JSON.stringify(safe)).run();
   return json({ok:true});
  }
  async function translate(text,target){
   if(!env.DEEPL_API_KEY)throw Error('DEEPL_API_KEY missing');
   const endpoint=env.DEEPL_API_ENDPOINT==='https://api.deepl.com'?'https://api.deepl.com':'https://api-free.deepl.com';
   const response=await fetch(endpoint+'/v2/translate',{method:'POST',headers:{Authorization:'DeepL-Auth-Key '+env.DEEPL_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({text:[text],target_lang:target,preserve_formatting:true})});
   if(!response.ok)throw Error('DeepL HTTP '+response.status);
   const result=await response.json();const item=result.translations?.[0];if(!item?.text)throw Error('Empty DeepL response');return item;
  }
  async function normalize(text){
   const input=String(text||'').trim();if(!input)return {en:'',fr:''};
   const english=await translate(input,'EN-US');
   const en=english.text;
   const french=await translate(en,'FR');
   return {en,fr:french.text,detected:english.detected_source_language||'unknown'};
  }
  if(p==='/admin/api/translate'&&req.method==='POST'){
   if(!env.DEEPL_API_KEY)return fail('Add DEEPL_API_KEY to admin Worker secrets',503);
   const b=await req.json(),value=String(b.text||'');if(!value.trim()||value.length>12000)return fail('Text must be 1-12000 characters',400);
   try{return json(await normalize(value))}catch(e){console.error('Translation error',e);return fail('Translation failed; nothing saved. Check DeepL key, endpoint and quota.',502)}
  }
  // Incremental sync: one content field per request, avoiding long Worker execution.
  // English remains the source of truth; existing French is replaced only on success.
  if(p==='/admin/api/translation/sync'&&req.method==='POST'){
   if(!env.DEEPL_API_KEY)return fail('Add DEEPL_API_KEY to admin Worker secrets',503);
   const body=await req.json().catch(()=>({}));
   const cursor=Number(body.cursor);
   if(!Number.isSafeInteger(cursor)||cursor<0)return fail('Invalid sync cursor',400);
   const current=await getRaw(env);if(!current)return fail('Content not found',404);
   const fields=[{section:'profile',id:null,key:'intro'},...['projects','experience','achievements'].flatMap(section=>(current[section]||[]).flatMap(entry=>['title','desc',...(section==='projects'?['role']:[])].map(key=>({section,id:entry.id,key})))),...Array.from(new Set([...current.projects.map(x=>x.type),...current.experience.map(x=>x.category),...current.achievements.map(x=>x.category)].filter(Boolean))).map(name=>({section:'category',id:null,key:name}))];
   if(cursor>=fields.length)return json({done:true,total:fields.length,cursor,translated:0});
   const task=fields[cursor];const target=task.section==='category'?current:(task.section==='profile'?current.profile:(current[task.section]||[]).find(x=>x.id===task.id));
   if(!target)return fail('Entry changed during sync; refresh and retry',409);
   const value=String(task.section==='category'?task.key:target[task.key]||'').trim();
   if(value){
    try{
     // Existing English is authoritative: only translate to French.
     const translated=await translate(value,'FR');
     if(task.section==='category'){current.categoryTranslations??={};current.categoryTranslations[task.key]=translated.text;}else target[task.key+'Fr']=translated.text;
     await env.DB.prepare("UPDATE settings SET value=?,updated_at=CURRENT_TIMESTAMP WHERE key='content'").bind(JSON.stringify(cleanContent(current))).run();
    }catch(e){console.error('Translation sync error',e);return fail('Translation failed at field '+(cursor+1)+' of '+fields.length+'. Check DeepL quota/key, then retry.',502)}
   }
   return json({done:cursor+1>=fields.length,total:fields.length,cursor:cursor+1,translated:value?1:0,field:task.section+' / '+task.key});
  }
  if(p==='/admin/api/categories'&&req.method==='GET')return json(await getCategories(env));
  if(p==='/admin/api/categories'&&req.method==='POST'){
   const b=await req.json(),section=String(b.section||''),name=String(b.name||'').trim();
   if(!['projects','experience','achievements'].includes(section)||!name||name.length>65)return fail('Invalid category',400);
   const id=crypto.randomUUID();try{await env.DB.prepare('INSERT INTO content_categories(id,section,name,position) VALUES(?,?,?,?)').bind(id,section,name,Number.isSafeInteger(b.position)?b.position:0).run()}catch{return fail('Category already exists',409)}return json({id,section,name},201);
  }
  const catMatch=p.match(/^\/admin\/api\/categories\/([0-9a-f-]+)$/);
  if(catMatch&&req.method==='PATCH'){
   const b=await req.json(),name=String(b.name||'').trim();if(!name||name.length>65)return fail('Invalid category',400);
   const previous=await env.DB.prepare('SELECT section,name FROM content_categories WHERE id=?').bind(catMatch[1]).first();if(!previous)return fail('Not found',404);
   const content=await getRaw(env);if(content){const key=previous.section==='projects'?'type':'category';for(const entry of content[previous.section]||[])if(entry[key]===previous.name)entry[key]=name;
    await env.DB.prepare("UPDATE settings SET value=?,updated_at=CURRENT_TIMESTAMP WHERE key='content'").bind(JSON.stringify(content)).run();}
   await env.DB.prepare('UPDATE content_categories SET name=? WHERE id=?').bind(name,catMatch[1]).run();return json({ok:true});
  }
  if(catMatch&&req.method==='DELETE'){
   const old=await env.DB.prepare('SELECT section,name FROM content_categories WHERE id=?').bind(catMatch[1]).first();if(!old)return fail('Not found',404);
   const content=await getRaw(env),key=old.section==='projects'?'type':'category';if(content?.[old.section]?.some(x=>x[key]===old.name))return fail('Move entries to another category before deleting',409);
   await env.DB.prepare('DELETE FROM content_categories WHERE id=?').bind(catMatch[1]).run();return json({ok:true});
  }
  if(p==='/admin/api/cv'&&req.method==='GET')return json({versions:(await env.DB.prepare("SELECT c.id,c.file_id,c.is_active,c.created_at,f.original_name,f.visibility,f.allow_download FROM cv_versions c JOIN files f ON f.id=c.file_id ORDER BY c.created_at DESC").all()).results});
  if(p==='/admin/api/cv'&&req.method==='POST'){
   const form=await req.formData(),file=form.get('file');if(!(file instanceof File)||file.type!=='application/pdf'||file.size<1||file.size>20*1024*1024)return fail('PDF only, maximum 20 MB',400);
   const f=new FormData();f.append('file',file);f.append('collection','documents');f.append('visibility','private');f.append('downloadable','false');
   const uploadReq=new Request(req.url,{method:'POST',body:f});const result=await upload(uploadReq,env);if(!result.ok)return result;const created=await result.json();
   const id=crypto.randomUUID();await env.DB.prepare('INSERT INTO cv_versions(id,file_id) VALUES(?,?)').bind(id,created.id).run();return json({id,file_id:created.id},201);
  }
  const cvMatch=p.match(/^\/admin\/api\/cv\/([0-9a-f-]+)\/activate$/);
  if(cvMatch&&req.method==='POST'){
   const row=await env.DB.prepare('SELECT file_id FROM cv_versions WHERE id=?').bind(cvMatch[1]).first();if(!row)return fail('CV not found',404);
   await env.DB.batch([env.DB.prepare("UPDATE files SET visibility='private',allow_download=0 WHERE id IN (SELECT file_id FROM cv_versions WHERE is_active=1)"),env.DB.prepare('UPDATE cv_versions SET is_active=0 WHERE is_active=1'),env.DB.prepare("UPDATE files SET visibility='public',allow_download=1 WHERE id=?").bind(row.file_id),env.DB.prepare('UPDATE cv_versions SET is_active=1 WHERE id=?').bind(cvMatch[1])]);return json({ok:true});
  }
  const cvView=p.match(/^\/admin\/api\/cv\/([0-9a-f-]+)\/view$/);
  if(cvView&&['GET','HEAD'].includes(req.method)){
   const f=await env.DB.prepare("SELECT f.object_key FROM cv_versions c JOIN files f ON f.id=c.file_id WHERE c.id=? AND f.status='ready' AND f.content_type='application/pdf'").bind(cvView[1]).first();
   if(!f)return fail('CV not found',404);
   const obj=await env.FILES.get(f.object_key);if(!obj)return fail('CV file not found',404);
   return new Response(req.method==='HEAD'?null:obj.body,{headers:{'content-type':'application/pdf','content-disposition':'inline; filename="CV.pdf"','cache-control':'private, no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; sandbox"}});
  }
  const cvDelete=p.match(/^\/admin\/api\/cv\/([0-9a-f-]+)$/);
  if(cvDelete&&req.method==='DELETE'){
   const row=await env.DB.prepare('SELECT c.file_id,c.is_active,f.object_key FROM cv_versions c JOIN files f ON f.id=c.file_id WHERE c.id=?').bind(cvDelete[1]).first();
   if(!row)return fail('CV not found',404);
   if(row.is_active)return fail('Deactivate this CV or activate another version before deleting',409);
   // Remove the R2 object before its metadata so a failed storage operation can be retried.
   await env.FILES.delete(row.object_key);
   await env.DB.batch([env.DB.prepare('DELETE FROM cv_versions WHERE id=? AND is_active=0').bind(cvDelete[1]),env.DB.prepare('DELETE FROM files WHERE id=?').bind(row.file_id)]);
   return json({ok:true});
  }
  if(p==='/admin/api/cv/deactivate'&&req.method==='POST'){await env.DB.batch([env.DB.prepare("UPDATE files SET visibility='private',allow_download=0 WHERE id IN (SELECT file_id FROM cv_versions WHERE is_active=1)"),env.DB.prepare('UPDATE cv_versions SET is_active=0 WHERE is_active=1')]);return json({ok:true})}
  if(p==='/admin/api/files'&&req.method==='GET')return json(await getFiles(env,true));
  if(p==='/admin/api/upload'&&req.method==='POST')return upload(req,env);
  const match=p.match(/^\/admin\/api\/files\/([0-9a-f-]+)$/);
  if(match&&req.method==='PATCH'){
   const protectedCv=await env.DB.prepare('SELECT id FROM cv_versions WHERE file_id=?').bind(match[1]).first();if(protectedCv)return fail('CV file is managed in CV versions',409);
   const b=await req.json(),visibility=b.visibility==='public'?'public':'private',dl=b.downloadable===true?1:0;
   await env.DB.prepare('UPDATE files SET visibility=?,allow_download=? WHERE id=?').bind(visibility,dl,match[1]).run();
   return json({ok:true});
  }
  if(match&&req.method==='DELETE'){
   const protectedCv=await env.DB.prepare('SELECT id FROM cv_versions WHERE file_id=?').bind(match[1]).first();if(protectedCv)return fail('CV file is managed in CV versions',409);
   const f=await env.DB.prepare('SELECT object_key FROM files WHERE id=?').bind(match[1]).first();
   if(!f)return fail('Not found',404);
   await env.DB.prepare('DELETE FROM files WHERE id=?').bind(match[1]).run();
   await env.FILES.delete(f.object_key);return json({ok:true});
  }
  return fail('Not found',404);
 }catch(e){console.error(e);return fail('Server error',500)}
}};
