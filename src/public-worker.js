// Public portfolio: no admin UI, admin API, or write endpoints.
import {json,fail,getRaw,getFiles,attach,serveFile,getCategories,getActiveCv,serveActiveCv} from './shared.js';
export default {async fetch(req,env){
 try {
  const u=new URL(req.url),p=u.pathname;
  if(p==='/admin'||p.startsWith('/admin/'))return fail('Not found',404);
  if(p==='/api/cv'&&['GET','HEAD'].includes(req.method))return serveActiveCv(req,env);
  if(p==='/api/content'&&req.method==='GET'){
   const content=await getRaw(env);
   if(!content)return fail('Content not initialized',503);
   const out=attach(content,await getFiles(env,false));out.categories=await getCategories(env);out.profile.cv=(await getActiveCv(env))?'/api/cv':'';return json(out);
  }
  if(p.startsWith('/api/file/')&&['GET','HEAD'].includes(req.method)){
   // No Access config is provided to the public Worker, so private objects remain inaccessible.
   return serveFile(req,env,decodeURIComponent(p.slice('/api/file/'.length)));
  }
  if(p.startsWith('/api/'))return fail('Not found',404);
  if(req.method!=='GET'&&req.method!=='HEAD')return fail('Method not allowed',405);
  return env.ASSETS.fetch(req);
 }catch(e){console.error(e);return fail('Server error',500)}
}};
