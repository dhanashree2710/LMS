/* Writes js/env.js from environment variables — use it as the build step on Netlify, Vercel,
   Render, GitHub Actions or your own server:  SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/make-env.js */
const fs=require('fs'),path=require('path');
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_ANON_KEY;
if(!url||!key){console.error('Set SUPABASE_URL and SUPABASE_ANON_KEY');process.exit(1)}
if(/service_role/.test(Buffer.from((key.split('.')[1]||''),'base64').toString())){console.error('Refusing: that is a service_role key. Use the anon (public) key.');process.exit(1)}
const out=`window.LMS_ENV=${JSON.stringify({SUPABASE_URL:url,SUPABASE_ANON_KEY:key,AI_FUNCTION:process.env.AI_FUNCTION||'ai-assistant'},null,1)};\n`;
fs.writeFileSync(path.join(__dirname,'..','js','env.js'),out);console.log('js/env.js written');
