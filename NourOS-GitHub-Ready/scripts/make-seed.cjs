const fs=require('fs'),vm=require('vm'),path=require('path');
const source=fs.readFileSync(path.join(__dirname,'../public/app.js'),'utf8');
const from=source.indexOf('const seed='),to=source.indexOf('\nconst contentFr=',from);
if(from<0||to<0)throw Error('Seed not found');
const seed=vm.runInNewContext(source.slice(from,to)+'\nseed');
// Never seed publicly accessible URLs for certificate PDFs. They must be uploaded to private R2.
for(const kind of ['projects','experience','achievements'])for(const x of seed[kind])x.media=[];
seed.documents=[];seed.profile.cv='';
const content=JSON.stringify(seed);
fs.writeFileSync(path.join(__dirname,'seed.json'),JSON.stringify(seed,null,2));
const escaped=content.replace(/'/g,"''");
fs.writeFileSync(path.join(__dirname,'../migrations/0002_seed.sql'),"INSERT OR IGNORE INTO settings(key,value) VALUES ('content','"+escaped+"');\n");
console.log('Seed generated:',seed.projects.length,'projects,',seed.experience.length,'experiences,',seed.achievements.length,'achievements');
