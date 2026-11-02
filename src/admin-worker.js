// Admin Worker: every request requires a verified Cloudflare Access JWT.
import {json,fail,validContent,cleanContent,isAdmin,getRaw,getFiles,attach,serveFile,upload} from './shared.js';
export default {async fetch(req,env){
 try {
  if(!await isAdmin(req,env))return fail('Unauthorized',401);
  const u=new URL(req.url),p=u.pathname;
  if(p==='/'||p==='/admin')return Response.redirect(u.origin+'/admin/',302);
 if(p==='/admin/'||p==='/admin/index.html')return env.ASSETS.fetch(new Request(new URL('/admin/',u),req));
  if(p==='/admin/studio.js'||p==='/styles.css')return env.ASSETS.fetch(req);
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
  if(p==='/admin/api/files'&&req.method==='GET')return json(await getFiles(env,true));
  if(p==='/admin/api/upload'&&req.method==='POST')return upload(req,env);
  const match=p.match(/^\/admin\/api\/files\/([0-9a-f-]+)$/);
  if(match&&req.method==='PATCH'){
   const b=await req.json(),visibility=b.visibility==='public'?'public':'private',dl=b.downloadable===true?1:0;
   await env.DB.prepare('UPDATE files SET visibility=?,allow_download=? WHERE id=?').bind(visibility,dl,match[1]).run();
   return json({ok:true});
  }
  if(match&&req.method==='DELETE'){
   const f=await env.DB.prepare('SELECT object_key FROM files WHERE id=?').bind(match[1]).first();
   if(!f)return fail('Not found',404);
   await env.DB.prepare('DELETE FROM files WHERE id=?').bind(match[1]).run();
   await env.FILES.delete(f.object_key);return json({ok:true});
  }
  return fail('Not found',404);
 }catch(e){console.error(e);return fail('Server error',500)}
}};
