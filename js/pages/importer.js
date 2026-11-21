/* =====================================================================
   Import wizard: Upload → extract columns → map → validate → preview → import
   Works for every page that has "Upload sheet" (Excel .xlsx/.xls, .csv, .tsv, .ods)
   ===================================================================== */
const IMP_SYN={full_name:['name','student_name','staff_name','applicant','applicant_name','parent_name'],roll_number:['roll','roll_no','rollno','roll_number'],
 program_id:['program','programme','course','course_name','program_code'],academic_year_id:['academic_year','year','ay','session'],class_id:['class','class_name','division_class'],
 semester_id:['semester','sem'],subject_id:['subject','subject_code','subject_name','paper'],student_id:['student','roll_number','roll','roll_no','student_roll'],
 department_id:['department','dept'],mobile:['phone','mobile_no','contact','student_mobile'],email:['email_id','mail','e_mail'],title:['book','book_title','name'],
 copies:['qty','quantity','no_of_copies'],marks_obtained:['marks','score','total'],max_marks:['out_of','maximum_marks','max'],exam_id:['exam','exam_name'],
 teacher_id:['teacher','faculty','staff'],club_id:['club'],book_id:['book','book_title'],amount:['fee','fees','total_amount'],code:['subject_code','code','short_code']};
const impNorm=z=>String(z??'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
const impLabel=f=>f.l||f.k.replace(/_id$/,'').replace(/_/g,' ').replace(/\b\w/g,m=>m.toUpperCase());
const impName=o=>o?(o.roll_number?o.roll_number+' · '+(o.full_name||''):o.code&&o.name?o.code+' · '+o.name:o.name||o.full_name||o.title||o.code||o.id):'';

async function impReadFile(file){
 if(typeof XLSX==='undefined')await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
 const buf=await file.arrayBuffer(),isText=/\.(csv|tsv|txt)$/i.test(file.name);
 const wb=isText?XLSX.read(new TextDecoder().decode(buf),{type:'string',cellDates:true}):XLSX.read(buf,{type:'array',cellDates:true});
 const sheets={};for(const n of wb.SheetNames){const a=XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,defval:'',raw:true,blankrows:false});
  let h=a.findIndex(r=>r.filter(x=>String(x).trim()!=='').length>=2);if(h<0)h=0;          // first real header row
  const head=(a[h]||[]).map((x,i)=>String(x).trim()||'Column '+(i+1));
  sheets[n]={head,rows:a.slice(h+1).filter(r=>r.some(x=>String(x).trim()!==''))}}
 return {names:wb.SheetNames,sheets}}

function impAutoMap(fields,head){const nh=head.map(impNorm),map={};
 for(const f of fields){const cands=[f.k,f.k.replace(/_id$/,''),impNorm(impLabel(f)),...(IMP_SYN[f.k]||[])];
  let i=nh.findIndex(h=>cands.includes(h));if(i<0)i=nh.findIndex(h=>cands.some(c=>c.length>3&&(h.includes(c)||c.includes(h))));
  if(i>=0&&!Object.values(map).includes(i))map[f.k]=i}
 return map}

/* validate one source row → {v:{...db values}, show:{k:[text,ok]}, err} */
function impRow(c,fields,refs,raw,map,cid,defs){const v={college_id:cid},show={};let err=null;defs=defs||{};
 const get=k=>map[k]==null?(defs[k]??''):raw[map[k]];
 for(const f of fields){let x=get(f.k);
  if(f.type==='time'&&x!==''&&x!=null)x=impTime(x);else if(x instanceof Date)x=impYMD(x);else if(f.type==='date'&&x!==''&&x!=null)x=impDate(x)??x;
  x=x===''||x==null?null:x;let txt=x==null?'':String(x),ok=true;
  if(x!==null&&f.ref){const t=String(x).trim().toLowerCase(),parts=[t,...t.split(/\s+[·|•]\s+|\s+—\s+/).map(z=>z.trim()).filter(Boolean)];let pool=refs[f.k]||[];
   if(f.k==='semester_id'&&v.program_id)pool=pool.filter(o=>!o.program_id||o.program_id===v.program_id);        // "Semester 1" belongs to the chosen course
   if(f.k==='class_id'&&v.program_id)pool=pool.filter(o=>!o.program_id||o.program_id===v.program_id);
   const keys=o=>[o.name,o.full_name,o.title,o.code,o.roll_number,o.email,impName(o),typeof nm==='function'?nm(f.ref,o):'',f.ref==='classes'&&typeof clsName==='function'?clsName(o.name):''].filter(Boolean).map(z=>String(z).trim().toLowerCase());
   const m=pool.find(o=>o.id===x||keys(o).includes(t))||pool.find(o=>keys(o).some(k=>parts.includes(k)))
     ||pool.find(o=>/^\d+$/.test(t)&&f.k==='semester_id'&&String(o.semester_number)===t);
   if(!m){ok=false;err=err||impLabel(f)+' “'+x+'” not found'}else{x=m.id;txt=impName(m)}}
  else if(x!==null&&f.type==='number'){const n=+String(x).replace(/[, ₹]/g,'');if(isNaN(n)){ok=false;err=err||impLabel(f)+' must be a number'}x=n;txt=String(n)}
  else if(x!==null&&f.type==='checkbox')x=['true','yes','y','1'].includes(String(x).toLowerCase());
  else if(x!==null&&f.type==='date'){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(x))){ok=false;err=err||impLabel(f)+' “'+x+'” is not a valid date (use DD/MM/YYYY or YYYY-MM-DD)'}else txt=x}
  else if(x!==null&&f.type==='time'){if(!/^\d{2}:\d{2}$/.test(String(x))){ok=false;err=err||impLabel(f)+' “'+x+'” is not a valid time (use 09:00 or 9:00 AM)'}else txt=x}
  else if(x!==null&&f.type==='select'&&f.opts){const ov=f.opts.map(o=>Array.isArray(o)?o[0]:o),hit=impOpt(f.k,x,ov);if(hit==null){ok=false;err=err||impLabel(f)+' must be one of: '+ov.join(', ')}else{x=hit;txt=String(hit)}}
  else if(x!==null&&['target_roles','target_student_ids'].includes(f.k))x=String(x).split(',').map(z=>z.trim()).filter(Boolean);
  else if(x!==null)x=String(x).trim();
  if(x===null&&!f.opt&&f.type!=='checkbox'&&f.k!=='password'){ok=false;err=err||impLabel(f)+' is empty'}
  if(f.k==='password'){if(x)v.__pw=String(x)}else if(x!==null)v[f.k]=x;
  show[f.k]=[txt,ok]}
 return {v,show,err}}

async function importWizard(c,refs,file,cid,onDone){
 if(['attendance','timetable','students'].includes(c.t)&&!(window.__flt||{}).fk&&!window.__impCtxDone)return impAskContext(c,refs,file,cid,onDone);window.__impCtxDone=false;
 let data;try{toast('Reading '+file.name+'…');data=await impReadFile(file)}catch(e){return toast('Could not read this file. Use .xlsx, .xls, .csv or .ods.',1)}
 const fields=[...c.f.filter(f=>!f.h&&f.type!=='file'&&!f.ui&&f.k!=='audience'),...(c.login?[{k:'password',l:'Login password',opt:1}]:[])];
 const FL=window.__flt||{},kc=FL.fk&&LK.classes?.[FL.fk],defs={};if(kc){defs.class_id=kc.id;defs.program_id=kc.program_id;defs.academic_year_id=kc.academic_year_id}else{if(FL.fp)defs.program_id=FL.fp}if(FL.fs)defs.semester_id=FL.fs
if(FL.fj)defs.subject_id=FL.fj;if(FL.fd)defs.department_id=FL.fd;
 for(const k in defs)if(!fields.some(f=>f.k===k))delete defs[k];
 const ctxTxt=Object.keys(defs).length?[LB('departments',FL.fd||LK.programs?.[defs.program_id]?.department_id),LB('programs',defs.program_id),kc?clsName(kc.name):'',FL.fs?LB('semesters',FL.fs):''].filter(Boolean).join(' › '):'';
 let sheet=data.names.find(n=>data.sheets[n].rows.length)||data.names[0],map=impAutoMap(fields,data.sheets[sheet].head),res=[];
 const m=modal(`<div class="imp"><div class="imp-h"><div><h3>Import ${esc(c.title)}</h3><small>${esc(file.name)}</small>${ctxTxt?`<div class="imp-ctx">Uploading for <b>${esc(ctxTxt)}</b> — used wherever the file has no such column</div>`:'<div class="imp-ctx w">Tip: choose Department → Course → Class in the page filters before uploading, so missing columns are filled for that class.</div>'}</div>
  <div class="imp-st" id="ist"></div></div>
  <ol class="imp-steps"><li class="on">Upload</li><li class="on">Extract columns</li><li class="on">Map &amp; validate</li><li id="istep4">Import</li></ol>
  <div class="imp-bar">${data.names.length>1?`<label>Sheet <select id="isheet">${data.names.map(n=>`<option ${n===sheet?'selected':''}>${esc(n)}</option>`).join('')}</select></label>`:''}
  <label class="chk1"><input type="checkbox" id="ionlyerr"> Show only rows with errors</label></div>
  <details class="imp-map" open><summary>Column mapping <small>— match each LMS field to a column of your file</small></summary><div id="imap" class="imp-grid"></div></details>
  <div class="tw imp-tw"><table><thead id="ith"></thead><tbody id="itb"></tbody></table></div>
  <div id="iprog" class="imp-prog" hidden><i></i></div>
  <div class="imp-f"><small>Click any cell to correct it before importing. Rows with errors are skipped.</small><div><button class="btn ghost" id="icancel">Cancel</button> <button class="btn" id="igo">Import</button></div></div></div>`,true);
 m.querySelector('.mbox').classList.add('xw');
 const Q=s=>m.querySelector(s);
 function paintMap(){const head=data.sheets[sheet].head;
  Q('#imap').innerHTML=fields.map(f=>`<label class="${map[f.k]==null&&!f.opt&&defs[f.k]==null?'miss':''}"><span>${esc(impLabel(f))}${f.opt?'':' *'}</span><select data-k="${f.k}"><option value="">${defs[f.k]!=null?'— use selected '+esc(impLabel(f).toLowerCase())+' —':'— not in file —'}</option>${head.map((h,i)=>`<option value="${i}" ${map[f.k]===i?'selected':''}>${esc(h)}</option>`).join('')}</select></label>`).join('');
  Q('#imap').querySelectorAll('select').forEach(s=>s.onchange=()=>{map[s.dataset.k]=s.value===''?null:+s.value;paintMap();validate()})}
 function validate(){const rows=data.sheets[sheet].rows,seen={};
  res=rows.map(r=>impRow(c,fields,refs,r,map,cid,defs));
  const key=['roll_number','email','code'].find(k=>fields.some(f=>f.k===k)&&map[k]!=null);       // duplicates inside the file
  if(key)res.forEach(r=>{const x=String(r.v[key]||'').toLowerCase();if(!x)return;if(seen[x]&&!r.err)r.err='Duplicate '+key.replace('_',' ')+' in file';seen[x]=1});
  if(key&&refs.__existing){res.forEach(r=>{const x=String(r.v[key]||'').toLowerCase();if(x&&refs.__existing.has(x)&&!r.err)r.err='Already exists in LMS'})}
  paintTable()}
 function paintTable(){const ok=res.filter(r=>!r.err).length,bad=res.length-ok,only=Q('#ionlyerr').checked,shown=fields.filter(f=>map[f.k]!=null);
  Q('#ist').innerHTML=`<span class="pill n">${res.length} rows</span><span class="pill">${ok} ready</span>${bad?`<span class="pill s">${bad} with errors</span>`:''}`;
  Q('#ith').innerHTML=`<tr><th>#</th><th>Status</th>${shown.map(f=>`<th>${esc(impLabel(f))}</th>`).join('')}</tr>`;
  Q('#itb').innerHTML=res.map((r,i)=>only&&!r.err?'':`<tr class="${r.err?'bad':''}"><td>${i+1}</td><td>${r.err?`<span class="pill s" title="${esc(r.err)}">✗ ${esc(r.err)}</span>`:'<span class="pill">✓ Ready</span>'}</td>${shown.map(f=>{const [t,good]=r.show[f.k];return `<td contenteditable="true" data-r="${i}" data-k="${f.k}" class="${good?'':'cellbad'}">${esc(f.k==='password'&&t?'••••••':t)}</td>`}).join('')}</tr>`).join('')||'<tr><td colspan="99" class="empty">No rows</td></tr>';
  Q('#igo').textContent=`Import ${ok} row${ok===1?'':'s'}`;Q('#igo').disabled=!ok;
  Q('#itb').querySelectorAll('[contenteditable]').forEach(td=>td.onblur=()=>{const i=+td.dataset.r,k=td.dataset.k,src=data.sheets[sheet].rows[i];if(map[k]==null)return;
   if(String(src[map[k]])===td.textContent.trim())return;src[map[k]]=td.textContent.trim();res[i]=impRow(c,fields,refs,src,map,cid,defs);paintTable()})}
 if(Q('#isheet'))Q('#isheet').onchange=e=>{sheet=e.target.value;map=impAutoMap(fields,data.sheets[sheet].head);paintMap();validate()};
 Q('#ionlyerr').onchange=paintTable;Q('#icancel').onclick=()=>m.remove();
 Q('#igo').onclick=async()=>{const go=Q('#igo');if(go.disabled)return;go.disabled=true;Q('#icancel').disabled=true;Q('#istep4').classList.add('on');
  const todo=res.map((r,i)=>[r,i]).filter(([r])=>!r.err),fail=[];let done=0;const bar=Q('#iprog');bar.hidden=false;const step=()=>{bar.firstChild.style.width=(done/todo.length*100)+'%'};
  const extra=v=>{if(c.t==='assignments')v.teacher_id=S.id;if(c.t==='announcements')v.created_by=S.id;if(c.t==='attendance')v.marked_by=S.id;if(['study_materials','result_imports'].includes(c.t))v.uploaded_by=S.id;return v};
  if(!c.login){for(let k=0;k<todo.length;k+=100){const chunk=todo.slice(k,k+100),{error}=await sb.from(c.t).insert(chunk.map(([r])=>{const v={...r.v};delete v.__pw;return extra(v)}));
    if(error){for(const [r,i] of chunk){const v={...r.v};delete v.__pw;const e2=(await sb.from(c.t).insert(extra(v))).error;if(e2)fail.push('Row '+(i+1)+': '+e2.message)}}
    done+=chunk.length;step()}}
  else{window.__impDefPw=0}
  if(c.login)for(const [r,i] of todo){try{const v={...r.v},pw=v.__pw||DEFAULT_PW;if(!v.__pw)window.__impDefPw=(window.__impDefPw||0)+1;delete v.__pw;
    if(pw&&!v.email&&v.roll_number)v.email=String(v.roll_number).toLowerCase()+'@'+String(S.college?.code||'college').toLowerCase()+'.lms';
    if(pw&&v.email){const u=await mkUser({full_name:v.full_name,email:v.email,password:pw,role:c.login,college_id:cid});v.user_id=u.id}
    const {error}=await sb.from(c.t).insert(extra(v));if(error)throw error}catch(x){fail.push('Row '+(i+1)+': '+x.message)}done++;step()}
  const ok=todo.length-fail.length,skipped=res.length-todo.length;
  m.querySelector('.imp').innerHTML=`<div class="imp-done"><div class="big">${ok?'✓':'!'}</div><h3>${ok} record${ok===1?'':'s'} imported into ${esc(c.title)}</h3>
   <p>${skipped?skipped+' row(s) skipped because of validation errors. ':''}${fail.length?fail.length+' row(s) were rejected by the database.':''}</p>${c.login&&window.__impDefPw?`<p>${window.__impDefPw} login(s) had no password in the file and were given the default password <b>${DEFAULT_PW}</b>. Change it under Passwords.</p>`:''}
   ${fail.length?`<pre>${esc(fail.slice(0,20).join('\n'))}</pre>`:''}<button class="btn" id="idone">Done</button></div>`;
  if(ok&&typeof confetti==="function")confetti();m.querySelector('#idone').onclick=()=>{m.remove();onDone&&onDone()}};
 paintMap();validate()}

/* =====================================================================
   University result file: extract → match roll numbers & subject codes →
   PASS / ATKT / FAIL / PENDING → review → save to Results & progression
   ===================================================================== */
const RES_RULES={atktMax:2,passPct:40};
async function resultImportWizard(file,cid,onDone){
 let data;try{toast('Reading '+file.name+'…');data=await impReadFile(file)}catch(e){return toast('Could not read this file.',1)}
 const sh=data.sheets[data.names.find(n=>data.sheets[n].rows.length)||data.names[0]],h=sh.head.map(impNorm);
 const col=(...ks)=>h.findIndex(x=>ks.includes(x));
 const ci={roll:col('roll_number','roll','roll_no','seat_no','prn'),sub:col('subject_code','code','course_code','paper_code'),tot:col('total','marks','total_marks','marks_obtained'),
  max:col('max','max_marks','out_of'),res:col('result','status','pass_fail'),grade:col('grade'),sem:col('semester','sem'),int:col('internal','int'),ext:col('external','ext')};
 if(ci.roll<0||ci.sub<0)return toast('The file needs at least “roll_number” and “subject_code” columns.',1);
 const [{data:yrs},{data:stu},{data:sj}]=await Promise.all([sb.from('academic_years').select('id,name,is_active').eq('college_id',cid),sb.from('students').select('id,roll_number,full_name,class_id').eq('college_id',cid).limit(5000),sb.from('subjects').select('id,code,name').eq('college_id',cid).limit(5000)]);
 const SR=new Map((stu||[]).map(s=>[s.roll_number.toUpperCase(),s])),SC=new Map((sj||[]).map(s=>[s.code.toUpperCase(),s]));
 const lines=sh.rows.map((r,i)=>{const roll=String(r[ci.roll]).trim().toUpperCase(),code=String(r[ci.sub]).trim().toUpperCase(),st=SR.get(roll),s=SC.get(code);
  const tot=ci.tot>=0&&r[ci.tot]!==''?+r[ci.tot]:(ci.int>=0&&ci.ext>=0?(+r[ci.int]||0)+(+r[ci.ext]||0):null),max=ci.max>=0&&r[ci.max]!==''?+r[ci.max]:100;
  let pass=ci.res>=0&&String(r[ci.res]).trim()?!/^(f|fail|ab|absent|atkt)$/i.test(String(r[ci.res]).trim()):(tot==null?null:tot/max*100>=RES_RULES.passPct);
  const err=!st?'Roll number '+roll+' not found':!s?'Subject code '+code+' not found':null;
  return {i,roll,code,st,s,tot,max,pass,grade:ci.grade>=0?r[ci.grade]:'',sem:ci.sem>=0?r[ci.sem]:'',err}});
 const byStu=new Map();for(const l of lines.filter(l=>!l.err)){if(!byStu.has(l.st.id))byStu.set(l.st.id,{st:l.st,subs:[]});byStu.get(l.st.id).subs.push(l)}
 const decide=x=>{const f=x.subs.filter(l=>l.pass===false),u=x.subs.filter(l=>l.pass==null);return u.length?'PENDING':!f.length?'PASS':f.length<=RES_RULES.atktMax?'ATKT':'FAIL'};
 const out=[...byStu.values()].map(x=>({...x,status:decide(x),pct:Math.round(x.subs.reduce((n,l)=>n+(l.tot||0),0)/Math.max(1,x.subs.reduce((n,l)=>n+(l.max||100),0))*100)}));
 const act=(yrs||[]).find(y=>y.is_active)||(yrs||[])[0],cnt2=s=>out.filter(o=>o.status===s).length,bad=lines.filter(l=>l.err);
 const pill=s=>`<span class="pill ${s==='PASS'?'':s==='ATKT'?'w':s==='FAIL'?'s':'n'}">${s}</span>`;
 const m=modal(`<div class="imp"><div class="imp-h"><div><h3>University result import</h3><small>${esc(file.name)} · ${lines.length} subject rows · ${out.length} students</small></div>
  <div class="imp-st">${pill('PASS')} ${cnt2('PASS')} ${pill('ATKT')} ${cnt2('ATKT')} ${pill('FAIL')} ${cnt2('FAIL')} ${pill('PENDING')} ${cnt2('PENDING')}</div></div>
  <ol class="imp-steps"><li class="on">Upload</li><li class="on">Extract</li><li class="on">Match roll nos &amp; subject codes</li><li class="on">Calculate status</li><li id="istep4">Save</li></ol>
  <div class="imp-bar"><label>Academic year <select id="ryr">${(yrs||[]).map(y=>`<option value="${y.id}" ${y.id===act?.id?'selected':''}>${esc(y.name)}</option>`).join('')}</select></label>
   <small>Rule: a subject is failed below ${RES_RULES.passPct}% (or result “F”). Failed in 1–${RES_RULES.atktMax} subjects → ATKT, more → FAIL. AI is never used for this decision.</small></div>
  <div class="seg tabs" style="margin:6px 0 10px"><button class="on" data-v="s">Students (${out.length})</button><button data-v="r">Extracted rows (${lines.length})</button><button data-v="e">Errors (${bad.length})</button></div>
  <div class="tw imp-tw" id="rview"></div>
  <div class="imp-f"><small>Results are saved for review. Publishing and promotion stay with Examination/College admin approval.</small><div><button class="btn ghost" id="icancel">Cancel</button> <button class="btn" id="igo" ${out.length?'':'disabled'}>Save ${out.length} results</button></div></div></div>`,true);
 m.querySelector('.mbox').classList.add('xw');const Q=s=>m.querySelector(s);
 const views={s:()=>`<table><thead><tr><th>Roll no.</th><th>Student</th><th>Subjects</th><th>Failed</th><th>Percentage</th><th>Status</th></tr></thead><tbody>${out.map(o=>`<tr><td>${esc(o.st.roll_number)}</td><td>${esc(o.st.full_name)}</td><td>${o.subs.length}</td><td>${o.subs.filter(l=>l.pass===false).map(l=>esc(l.code)).join(', ')||'—'}</td><td>${o.pct}%</td><td>${pill(o.status)}</td></tr>`).join('')}</tbody></table>`,
  r:()=>`<table><thead><tr><th>#</th><th>Roll no.</th><th>Subject code</th><th>Subject</th><th>Semester</th><th>Total</th><th>Grade</th><th>Result</th><th>Match</th></tr></thead><tbody>${lines.map(l=>`<tr class="${l.err?'bad':''}"><td>${l.i+1}</td><td>${esc(l.roll)}</td><td>${esc(l.code)}</td><td>${esc(l.s?.name||'')}</td><td>${esc(l.sem)}</td><td>${l.tot??''}${l.tot!=null?' / '+l.max:''}</td><td>${esc(l.grade)}</td><td>${l.pass==null?'—':l.pass?'P':'F'}</td><td>${l.err?`<span class="pill s">✗ ${esc(l.err)}</span>`:'<span class="pill">✓</span>'}</td></tr>`).join('')}</tbody></table>`,
  e:()=>bad.length?`<table><thead><tr><th>Row</th><th>Problem</th></tr></thead><tbody>${bad.map(l=>`<tr class="bad"><td>${l.i+2}</td><td>${esc(l.err)}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">No errors — every roll number and subject code matched.</div>'};
 const show=v=>{Q('#rview').innerHTML=views[v]();m.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.v===v))};
 m.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>show(b.dataset.v));show('s');Q('#icancel').onclick=()=>m.remove();
 Q('#igo').onclick=async()=>{const go=Q('#igo');if(go.disabled)return;go.disabled=true;go.textContent='Saving…';const yr=Q('#ryr').value;
  try{let path=null;try{path=await uploadFile('result-files',file)}catch(e){}
   const {error:e1}=await sb.from('result_imports').insert({college_id:cid,academic_year_id:yr,uploaded_by:S.id,file_path:path,status:'pending',validation_log:{rows:lines.length,students:out.length,errors:bad.length,pass:cnt2('PASS'),atkt:cnt2('ATKT'),fail:cnt2('FAIL'),pending:cnt2('PENDING'),file:file.name}});if(e1)throw e1;
   const {data:ex}=await sb.from('academic_progression').select('id,student_id').eq('college_id',cid).eq('academic_year_id',yr).in('student_id',out.map(o=>o.st.id));
   const exM=new Map((ex||[]).map(x=>[x.student_id,x.id]));let n=0;
   for(const o of out){const v={status:o.status,backlogs:o.subs.filter(l=>l.pass===false).map(l=>({subject_code:l.code,subject:l.s.name,semester:l.sem||null,status:o.status==='FAIL'?'Failed':'Supplementary exam pending'})),
     notes:`Imported from ${file.name}: ${o.subs.length} subjects, ${o.pct}%.`};
    const r=exM.has(o.st.id)?await sb.from('academic_progression').update(v).eq('id',exM.get(o.st.id)):await sb.from('academic_progression').insert({...v,college_id:cid,student_id:o.st.id,academic_year_id:yr,promoted:false});
    if(r.error)throw r.error;n++}
   Q('#istep4').classList.add('on');
   m.querySelector('.imp').innerHTML=`<div class="imp-done"><div class="big">✓</div><h3>${n} student results saved</h3><p>${cnt2('PASS')} pass · ${cnt2('ATKT')} ATKT · ${cnt2('FAIL')} fail · ${cnt2('PENDING')} pending${bad.length?' · '+bad.length+' unmatched rows skipped':''}.</p><p>Review them under <b>Results &amp; progression</b>, then approve and promote.</p><a class="btn" href="results.html">Open results</a> <button class="btn ghost" id="idone">Close</button></div>`;
   if(typeof confetti==="function")confetti();m.querySelector('#idone').onclick=()=>{m.remove();onDone&&onDone()}}catch(x){toast(x.message,1);go.disabled=false;go.textContent='Save results'}}}

/* ---- value normalisers for uploads: Excel dates/times, Indian date format, weekday and status shorthands ---- */
const impPad=n=>String(n).padStart(2,'0');
function impYMD(d){return d.getFullYear()+'-'+impPad(d.getMonth()+1)+'-'+impPad(d.getDate())}
function impDate(x){if(x instanceof Date)return impYMD(x);const t=String(x).trim();if(!t)return null;
 if(/^\d{4,5}(\.\d+)?$/.test(t)&&+t>20000&&+t<80000){const d=new Date(Date.UTC(1899,11,30)+Math.round(+t)*864e5);return d.getUTCFullYear()+'-'+impPad(d.getUTCMonth()+1)+'-'+impPad(d.getUTCDate())}  // Excel serial
 let m=t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);if(m)return m[1]+'-'+impPad(m[2])+'-'+impPad(m[3]);
 m=t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);if(m){const y=m[3].length===2?'20'+m[3]:m[3];return y+'-'+impPad(m[2])+'-'+impPad(m[1])}        // DD/MM/YYYY (India)
 const MS=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];m=t.toLowerCase().match(/^(\d{1,2})[\s-]*([a-z]{3})[a-z]*[\s-,]*(\d{4})$/);if(m&&MS.includes(m[2]))return m[3]+'-'+impPad(MS.indexOf(m[2])+1)+'-'+impPad(m[1]);
 return null}
function impTime(x){if(x instanceof Date)return impPad(x.getHours())+':'+impPad(x.getMinutes());const t=String(x).trim();
 if(/^0?\.\d+$|^0$/.test(t)){const mn=Math.round(+t*1440);return impPad(Math.floor(mn/60)%24)+':'+impPad(mn%60)}                      // Excel fraction of a day
 const m=t.toLowerCase().replace(/\./g,':').match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*(am|pm)?$/);if(!m)return t;
 let h=+m[1];const mi=m[2]||'00';if(m[3]==='pm'&&h<12)h+=12;if(m[3]==='am'&&h===12)h=0;return impPad(h)+':'+mi}
function impOpt(k,x,ov){const t=String(x).trim().toLowerCase();let hit=ov.find(o=>String(o).toLowerCase()===t);if(hit!=null)return hit;
 if(k==='day'){const d=t.slice(0,3);hit=ov.find(o=>String(o).toLowerCase()===d);if(hit!=null)return hit}
 const AL={p:'present',a:'absent',l:'late',e:'excused',ab:'absent',leave:'excused',pass:'PASS',fail:'FAIL',atkt:'ATKT'};if(AL[t]){hit=ov.find(o=>String(o).toLowerCase()===AL[t].toLowerCase());if(hit!=null)return hit}
 return ov.find(o=>String(o).toLowerCase().startsWith(t)&&t.length>=3)??null}

/* attendance / timetable uploads must say which class they are for */
function impAskContext(c,refs,file,cid,onDone){const att=c.t==='attendance',F=[{k:'department_id',l:'Department',ref:'departments',ui:1},{k:'program_id',l:'Course',ref:'programs',ui:1},{k:'class_id',l:'Class',ref:'classes'},{k:'semester_id',l:'Semester',ref:'semesters',opt:1},...(att?[{k:'subject_id',l:'Subject (if the file has no subject column)',ref:'subjects',opt:1}]:[])];
 const act=vals(LK.academic_years).find(y=>y.is_active),R={department_id:vals(LK.departments),program_id:vals(LK.programs),class_id:vals(LK.classes).filter(k=>!act||k.academic_year_id===act.id),semester_id:vals(LK.semesters),subject_id:vals(LK.subjects)};
 const m=modal(`<h3>Upload ${esc(c.title.toLowerCase())} for which class?</h3><p style="color:var(--mut);font-size:13px;margin:4px 0 12px">Choose the department, course and class of <b>${esc(file.name)}</b>. Rows without their own class column will be saved to this class.</p><form id="ictx" class="form">${F.map(f=>fieldHTML(f,R)).join('')}<div style="grid-column:1/-1;display:flex;gap:8px;justify-content:flex-end"><button type="button" class="btn ghost" id="icx">Cancel</button><button class="btn" type="submit">Continue →</button></div></form>`,true);
 const f=m.querySelector('#ictx');cascade(f);m.querySelector('#icx').onclick=()=>m.remove();
 f.onsubmit=e=>{e.preventDefault();const k=f.elements.class_id.value,kc=LK.classes?.[k];if(!k)return toast('Choose a class',1);
  window.__flt={...(window.__flt||{}),fk:k,fp:kc?.program_id||f.elements.program_id.value,fd:LK.programs?.[kc?.program_id]?.department_id||f.elements.department_id.value,fs:f.elements.semester_id.value||'',fj:f.elements.subject_id?.value||''};
  m.remove();window.__impCtxDone=true;importWizard(c,refs,file,cid,onDone)}}
