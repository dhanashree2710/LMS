/* ===== CONFIG ===== */
const ENV=window.LMS_ENV||{};
const SB_URL=ENV.SUPABASE_URL,SB_KEY=ENV.SUPABASE_ANON_KEY;
if(!SB_URL||!SB_KEY){document.addEventListener('DOMContentLoaded',()=>{document.body.innerHTML='<div style="font:15px system-ui;max-width:560px;margin:12vh auto;padding:24px;border:1px solid #ddd;border-radius:12px"><h2>Setup needed</h2><p>Create <code>js/env.js</code> from <code>js/env.example.js</code> and add your Supabase URL and anon key, or run <code>node scripts/make-env.js</code> on the server.</p></div>'})}
const sb=supabase.createClient(SB_URL||'https://invalid.local',SB_KEY||'missing');
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let S=null;
const cleanMsg=m=>{
 m=String(m??'').trim();
 if(!m)return 'Something went wrong';
 if(/duplicate key|unique constraint|already exists/i.test(m))return 'This record already exists. Please use a different value.';
 {const fk=m.match(/insert or update on table "(\w+)" violates foreign key constraint "\w+?_(\w+?)_fkey?"/i);if(fk)return 'Linked record not found for "'+fk[2].replace(/_id$/,'').replace(/_/g,' ')+'". Refresh the page and select it again. If it keeps happening, run supabase/04_cleanup_and_fix.sql once.'}
 if(/foreign key|violates foreign key|referenced/i.test(m))return 'Cannot complete: related records still exist. Remove or re-assign them first.';
 if(/null value|not-null|violates not-null/i.test(m))return 'Please fill in all required fields.';
 if(/permission denied|row-level security|rls/i.test(m)){const t=(m.match(/table (\w+)/i)||[])[1];return 'Database permission missing'+(t?' on table "'+t+'"':'')+'. The admin must run supabase/04_cleanup_and_fix.sql once in the Supabase SQL editor.'}
 if(/JWT|invalid token|not authenticated/i.test(m))return 'Session expired. Please sign in again.';
 if(/network|fetch|Failed to fetch/i.test(m))return 'Network error. Check your connection and try again.';
 if(/bucket|storage|object not found/i.test(m))return 'File storage error. The file may be missing or the bucket is not set up. Run supabase/01_schema_additions.sql.';
 m=m.replace(/^[a-z_]+:\s*/i,'').replace(/\s+at\s+.*/s,'').slice(0,180);
 return m;
};
const toast=(m,bad)=>{const t=$('#toast');const msg=cleanMsg(m);if(!t){console[(bad?'error':'log')](msg);return}t.textContent=msg;t.className='on'+(bad?' bad':'');setTimeout(()=>{if(t)t.className=''},3200)};
const EYE='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYEOFF='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.9 17.9A10.9 10.9 0 0112 19C5 19 1 12 1 12a18 18 0 015.1-5.9M9.9 4.2A10 10 0 0112 4c7 0 11 8 11 8a18 18 0 01-2.2 3.2M1 1l22 22"/></svg>';
const ROLES=['principal','accounts','tpo','college_admin','sub_admin','admission_admin','hod','class_teacher','subject_teacher','examination_admin','librarian','activity_admin','student','parent'];

