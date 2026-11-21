/* Optional build step. If SUPABASE_URL and SUPABASE_ANON_KEY are set on the host (Vercel, Netlify, …),
   js/env.js is regenerated from them. If not, the committed js/env.js is used as is — no setup needed. */
const fs=require('fs'),path=require('path');
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_ANON_KEY,out=path.join(__dirname,'..','js','env.js');
if(!url||!key){console.log(fs.existsSync(out)?'Using committed js/env.js':'WARNING: js/env.js missing — copy js/env.example.js');process.exit(0)}
if(/service_role/.test(Buffer.from((key.split('.')[1]||''),'base64').toString())){console.error('Refusing: that is a service_role key. Use the anon (public) key.');process.exit(1)}
fs.writeFileSync(out,`window.LMS_ENV=${JSON.stringify({SUPABASE_URL:url,SUPABASE_ANON_KEY:key,AI_FUNCTION:process.env.AI_FUNCTION||'ai-assistant'},null,1)};\n`);
console.log('js/env.js written from environment variables');
