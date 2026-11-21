/* ===== generic CRUD ===== */
async function crud0(c){
 const cid=S.college_id,refs={};
 for(const f of c.f)if(f.ref==='teachers'){const {data}=await sb.from('user_roles').select('user_id,role,profiles(full_name)').eq('college_id',cid).in('role',['hod','class_teacher','subject_teacher','principal']);const RL={hod:'HOD',class_teacher:'Class teacher',subject_teacher:'Subject teacher',principal:'Principal'},mp=new Map();(data||[]).forEach(x=>{const o=mp.get(x.user_id)||{id:x.user_id,nm:x.profiles?.full_name||'Staff',roles:[]};o.roles.push(RL[x.role]);mp.set(x.user_id,o)});refs[f.k]=[...mp.values()].map(o=>({id:o.id,full_name:o.nm+' — '+o.roles.join(', ')})).sort((a,b)=>a.full_name.localeCompare(b.full_name))}else if(f.ref){const {data}=await sb.from(f.ref).select('*').eq('college_id',cid);refs[f.k]=data||[]}
 const cu=c,uif=c.f.filter(f=>f.ui);c={...c,f:c.f.filter(f=>!f.ui)};
 let q=sb.from(c.t).select('*').eq('college_id',cid).order('created_at',{ascending:false}).limit(1000);
 const Z='00000000-0000-0000-0000-000000000000';let sid=null;
 const sc=await scope();if(!sc.all){q=applyScope(c,q,sc);scopeRefs(refs,sc)}
 if(S.role==='student'||S.role==='parent'){const my=await myStudents(),ids=my.map(s=>s.id).concat([Z]);sid=my[0]?.id;
  const semIds=my.map(s=>s.semester_id).filter(Boolean);
  if(['study_materials','exams','timetable','quizzes','assignments'].includes(c.t)){let sq=sb.from('subjects').select('id');sq=semIds.length?sq.in('semester_id',semIds):sq.in('program_id',my.map(s=>s.program_id).concat([Z]));const {data:sj}=await sq;q=q.in('subject_id',(sj||[]).map(x=>x.id).concat([Z]))}
  if(c.t==='subjects')q=semIds.length?q.in('semester_id',semIds):q.in('program_id',my.map(s=>s.program_id).concat([Z]));
  if(['study_materials','exams','timetable','quizzes'].includes(c.t)){const cls=[...new Set(my.map(s=>s.class_id).filter(Boolean))];if(cls.length)q=q.or('class_id.in.('+cls.join(',')+'),class_id.is.null')}
  if(c.mine===1)q=q.in('student_id',ids);else if(c.t==='assignments')q=q.in('class_id',my.map(s=>s.class_id).filter(Boolean).concat([Z]));
  if(c.t==='students')q=q.in('id',ids);if(c.t==='classes')q=q.in('id',my.map(s=>s.class_id).filter(Boolean).concat([Z]))}
 let {data:rows,error}=await q;if(error)throw error;if(c.t==='announcements')rows=await annFilter(rows);window.__rows=rows;window.__refs=refs;
 const canAdd=!['student','parent'].includes(S.role)&&canWrite(c.t)&&!(c.t==='announcements'&&!['college_admin','sub_admin','class_teacher','hod'].includes(S.role)&&0);
window.__crudCtx={c,cu,refs};
 const inp=f=>fieldHTML(f,refs);
 const inp_old=f=>{const L=f.l||f.k.replace(/_id$/,'').replace(/_/g,' ');let el;
  if(f.ref)el=`<select name="${f.k}" ${f.opt?'':'required'}><option value="">Select…</option>${refs[f.k].map(r=>`<option value="${r.id}" data-p="${r.program_id||''}" data-y="${r.year_number||''}" data-s="${r.semester_id||''}" data-k="${r.class_id||''}" data-d="${r.department_id||LK.programs?.[r.program_id]?.department_id||''}">${esc(nm(f.ref,r))}</option>`).join('')}</select>`;
  else if(f.type==='select')el=`<select name="${f.k}">${f.opts.map(o=>Array.isArray(o)?`<option value="${o[0]}">${o[1]}</option>`:`<option>${o}</option>`).join('')}</select>`;
  else if(f.type==='file')el=`<input name="${f.k}" type="file" accept="image/*,.pdf,.doc,.docx,.xlsx,.csv">`;
  else if(f.type==='textarea')el=`<textarea name="${f.k}" rows="2"></textarea>`;
  else if(f.type==='checkbox')el=`<select name="${f.k}"><option value="false">No</option><option value="true">Yes</option></select>`;
  else el=`<input name="${f.k}" type="${f.type||'text'}" ${f.opt?'':'required'} ${f.type==='number'?'step="any"':''}>`;
  return `<div><label>${L}</label>${el}</div>`};
 const show=f=>f.type!=='textarea'&&f.k!=='audience';
 $('#view').innerHTML=`${canAdd?`<div class="panel"><h3 style="margin-bottom:8px">Add ${c.title.toLowerCase()}</h3><form id="cf" class="form">${[...uif,...c.f].filter(f=>!f.h).map(inp).join('')}
  ${c.login?`<div><label>Set login password</label><input name="__pw" type="text" minlength="6" placeholder="blank = default password Lms@2026"></div>`:''}
  <div><button class="btn" type="submit">Save</button></div></form></div>`:''}
 <div class="panel"><div class="bar2"><input id="sq" placeholder="Search…">${canAdd?`<button class="btn red sm" id="bd">Delete selected</button>`:''}${canAdd&&!["study_materials","assignments"].includes(c.t)?`<button class="btn ghost sm" id="tp">📄 Template</button><label class="btn ghost sm up" title="Upload an Excel/CSV file, preview the extracted columns, then import">⬆ Upload sheet<input id="up" type="file" accept=".xlsx,.xls,.csv,.tsv,.ods" hidden></label>`:''}${canAdd&&['result_imports','academic_progression'].includes(c.t)?`<label class="btn sm up" title="Extract a university result sheet: match roll numbers and subject codes, calculate PASS / ATKT / FAIL">📊 Import university result<input id="rimp" type="file" accept=".xlsx,.xls,.csv,.ods" hidden></label>`:''}</div>
 <div class="tw"><table><thead><tr>${canAdd?'<th><input id="selall" type="checkbox" aria-label="Select all rows"></th>':''}${c.f.filter(show).map(f=>`<th>${f.l||f.k.replace(/_id$/,'').replace(/_/g,' ')}</th>`).join('')}${canAdd?'<th></th>':''}</tr></thead>
 <tbody id="tb">${rows.map(r=>`<tr>${canAdd?`<td><input type="checkbox" class="rowselect" value="${r.id}"></td>`:''}${c.f.filter(show).map(f=>`<td>${f.type==='file'?(r[f.k]?`<a href="${esc(r[f.k])}" target="_blank" rel="noopener">Open</a> <button type="button" class="btn ghost sm" data-dl="${esc(r[f.k])}" title="Download">⬇</button>`:'—'):f.ref?esc(lbl(refs[f.k].find(x=>x.id===r[f.k])||{id:r[f.k]||'—'})):esc(String(r[f.k]??'—').slice(0,60))}</td>`).join('')}${canAdd?`<td style="white-space:nowrap">${c.t==='admission_applications'&&r.status==='pending'?`<button class="btn sm" data-a="${r.id}" data-v="approved">Approve</button> <button class="btn ghost sm" data-a="${r.id}" data-v="rejected">Reject</button> `:''}<button class="btn ghost sm" data-e="${r.id}">Edit</button> ${c.t==='students'&&r.status==='active'?`<button class="btn ghost sm" data-ar="${r.id}">Archive</button> `:''}<button class="btn red sm" data-d="${r.id}">Delete</button></td>`:''}</tr>`).join('')||''}</tbody></table>
 ${rows.length?'':'<div class="empty">Nothing here yet. Add the first one above.</div>'}</div></div>`;
 if(typeof cascade==='function'&&$('#cf'))cascade($('#cf'));
 $('#sq').oninput=e=>document.querySelectorAll('#tb tr').forEach(tr=>tr.classList.toggle('hide',!tr.textContent.toLowerCase().includes(e.target.value.toLowerCase())));
 if(0)$('#xl').onclick=()=>dl({[c.title]:rows.map(r=>{const o={...r};for(const f of c.f)if(f.ref&&refs[f.k]){const m=refs[f.k].find(x=>x.id===r[f.k]);if(m)o[f.k.replace(/_id$/,'')]=lbl(m)}return o})},c.t+'.xlsx');
 document.querySelectorAll('[data-d]').forEach(b=>b.onclick=async()=>{if(!confirm('Permanently delete this record? Linked records (attendance, marks, fees, submissions…) are removed with it.'))return;try{await safeDelete(c.t,b.dataset.d);toast('Deleted successfully');afterWrite(cu)}catch(x){toast(x.message||'Delete failed',1)}});
 if($('#selall'))$('#selall').onchange=e=>document.querySelectorAll('.rowselect').forEach(x=>x.checked=e.target.checked);if($('#bd'))$('#bd').onclick=async()=>{const ids=[...document.querySelectorAll('.rowselect:checked')].map(x=>x.value);if(!ids.length)return toast('Select at least one row',1);if(!confirm(`Permanently delete ${ids.length} selected record(s)?`))return;try{await safeDelete(c.t,ids);toast(`${ids.length} records deleted`);afterWrite(cu)}catch(x){toast(x.message||'Bulk delete failed',1)}};
 document.querySelectorAll('[data-ar]').forEach(b=>b.onclick=async()=>{if(!confirm('Archive this student? The student will be marked inactive and academic history will remain.'))return;try{const {error}=await sb.from('students').update({status:'inactive'}).eq('id',b.dataset.ar);if(error)throw error;toast('Student archived');afterWrite(cu)}catch(x){toast(x.message||'Archive failed',1)}});
 document.querySelectorAll('[data-a]').forEach(b=>b.onclick=async()=>{const r=rows.find(x=>x.id===b.dataset.a),ok=b.dataset.v==='approved';
  if(ok&&r.docs_status!=='verified'){toast('Verify documents first: open Document verification',1);return}
  try{if(ok){const pr=refs.program_id.find(x=>x.id===r.program_id),n=await cnt('students',cid),roll=(pr?.code||'STU')+'FY'+String(n+1).padStart(2,'0');
   const {error:e1}=await sb.from('students').insert({college_id:cid,application_id:r.id,roll_number:roll,program_id:r.program_id,academic_year_id:r.academic_year_id,full_name:r.full_name,dob:r.dob,email:r.email,mobile:r.student_mobile,parent_mobile:r.parent_mobile});if(e1)throw e1}
   const {error}=await sb.from(c.t).update({status:b.dataset.v,reviewed_by:S.id}).eq('id',r.id);if(error)throw error;toast(ok?'Approved, student enrolled 🎉':'Rejected');if(ok)confetti();afterWrite(cu)}catch(x){toast(x.message,1)}});
 let editId=null;const cf=$('#cf');
 document.querySelectorAll('[data-e]').forEach(b=>b.onclick=()=>{const r=rows.find(x=>x.id===b.dataset.e);if(r)editModal(c,cu,r,refs)});
 window.__crudEdit=r=>editModal(c,cu,r,refs);window.__crudDel=async r=>{if(!confirm('Delete this record permanently? Linked records are removed with it.'))return;try{await safeDelete(c.t,r.id)}catch(e){return toast(e.message,1)}toast('Deleted successfully');afterWrite(cu)};
 if($('#tp'))$('#tp').onclick=()=>{const F=window.__flt||{},cl=F.fk&&LK.classes?.[F.fk],prog=F.fp||cl?.program_id,dep=F.fd||LK.programs?.[prog]?.department_id,sem=F.fs;
  const flds=c.f.filter(f=>!f.h&&f.type!=='file'),col=f=>f.ref?f.k.replace(/_id$/,''):f.k,base={};
  const ctxVal={department_id:dep?LB('departments',dep):'',program_id:prog?(LK.programs?.[prog]?.code||LB('programs',prog)):'',class_id:cl?clsName(cl.name):'',semester_id:sem?LB('semesters',sem):'',academic_year_id:cl?LB('academic_years',cl.academic_year_id):(vals(LK.academic_years).find(y=>y.is_active)?.name||'')};
  flds.forEach(f=>base[col(f)]=ctxVal[f.k]??'');if(c.login)base.password='';
  let rowsT=[base];const today=new Date().toISOString().slice(0,10);
  if(c.t==='attendance'&&cl){const subj=F.fj||clsSubjects(F.fk)[0]?.id;rowsT=vals(LK.students).filter(x=>x.class_id===F.fk).sort((a,b)=>String(a.roll_number).localeCompare(String(b.roll_number))).map(st=>({...base,student:st.roll_number,subject:subj?LK.subjects?.[subj]?.code||LB('subjects',subj):'',date:today,status:'present'}))}
  if(c.t==='timetable'&&cl){rowsT=[];['Mon','Tue','Wed','Thu','Fri'].forEach(d=>[['09:00','10:00'],['10:00','11:00'],['11:15','12:15'],['12:15','13:15']].forEach(([a,b])=>rowsT.push({...base,day:d,start_time:a,end_time:b,subject:'',teacher:'',room:''})))}
  if(c.t==='students'&&cl)rowsT=[{...base,roll_number:(LK.programs?.[cl.program_id]?.code||'')+({1:'FY',2:'SY',3:'TY'}[cl.year_number]||'')+'01',full_name:'',email:'',mobile:'',parent_mobile:'',password:''}];
  const info=[{Note:'Fill one record per row. Keep the column names unchanged.'},{Note:cl?'Template prepared for: '+[LB('departments',dep),LB('programs',prog),clsName(cl.name),sem?LB('semesters',sem):''].filter(Boolean).join(' › '):'Tip: pick Department → Course → Class in the filters first to get a pre-filled template for that class.'},{Note:'Reference columns (course, class, semester, subject, student, teacher) accept the name, code or roll number exactly as shown in the LMS.'}];
  dl({Template:Object.assign(rowsT,{__raw:1}),Instructions:Object.assign(info,{__raw:1})},(c.t+'_template'+(cl?'_'+clsName(cl.name).replace(/\W+/g,'_'):'')+'.xlsx'))};
 if($('#up'))$('#up').onchange=e=>{const file=e.target.files[0];e.target.value='';if(!file)return;
  const key=['roll_number','email','code'].find(k=>c.f.some(f=>f.k===k));refs.__existing=key?new Set(rows.map(r=>String(r[key]||'').toLowerCase()).filter(Boolean)):null;
  importWizard(c,refs,file,cid,()=>afterWrite(cu))};
 if($('#rimp'))$('#rimp').onchange=e=>{const file=e.target.files[0];e.target.value='';if(file)resultImportWizard(file,cid,()=>afterWrite(cu))};
 if(cf)cf.onsubmit=async e=>{e.preventDefault();const btn=cf.querySelector('[type=submit]');if(btn.disabled)return;btn.disabled=true;
  try{const fd=new FormData(cf),v=await formValues(c,fd,false);let pw=fd.get('__pw');if(c.login&&!pw)pw=DEFAULT_PW;
   if(c.login&&pw&&!v.email&&v.roll_number)v.email=String(v.roll_number).toLowerCase()+'@'+String(S.college?.code||'college').toLowerCase()+'.lms';
   if(c.login&&pw&&v.email){const u=await mkUser({full_name:v.full_name,email:v.email,password:pw,role:c.login,college_id:cid});v.user_id=u.id}
   if(c.t==='subject_assignments'){const du=await sb.from('subject_assignments').select('id').eq('subject_id',v.subject_id).eq('class_id',v.class_id).eq('academic_year_id',v.academic_year_id);if(du.error)throw du.error;if(du.data?.length)throw Error('This subject is already allocated to the selected class and academic year.')}
   const {error}=await sb.from(c.t).insert(v);if(error)throw error;await afterSave(c,v);toast('Saved');cf.reset();if(['certificates','placements'].includes(c.t))confetti();afterWrite(cu)}
  catch(x){toast(x.message,1)}finally{btn.disabled=false}};
 if(c.t==='assignments'){const hr=document.querySelector('thead tr');hr.insertAdjacentHTML('beforeend','<th>Work</th>');
  document.querySelectorAll('#tb tr').forEach((tr,i)=>{const r=rows[i];if(!r)return;tr.insertAdjacentHTML('beforeend',`<td>${S.role==='student'?(asgClosed(r)?'<span class="pill s">Closed</span>':`<label class="btn sm up">Submit file<input type="file" data-s="${r.id}" hidden></label>`)+(r.attachment_url?` <a class="btn ghost sm" style="text-decoration:none" href="${esc(r.attachment_url)}" target="_blank" rel="noopener">⬇ Task</a>`:''):`<button class="btn ghost sm" data-w="${r.id}">Submissions</button>`}</td>`)});
  document.querySelectorAll('[data-s]').forEach(i=>i.onchange=async()=>{const f=i.files[0],r=rows.find(x=>x.id===i.dataset.s);if(!f)return;if(asgClosed(r))return toast('Submission is closed for this assignment',1);if(!sid)return toast('Your student record was not found',1);toast('Uploading…');
   try{const url=await uploadFile('assignments',f),late=new Date()>new Date(r.deadline);const {error}=await sb.from('assignment_submissions').insert({assignment_id:r.id,student_id:sid,file_urls:[url],is_late:late});if(error)throw error;modal('<h3>Submitted</h3><p>Your work was uploaded'+(late?' (marked late).':'.')+'</p>')}catch(x){toast(x.message,1)}});
  document.querySelectorAll('[data-w]').forEach(b=>b.onclick=async()=>{const {data,error}=await sb.from('assignment_submissions').select('*,students(full_name,roll_number)').eq('assignment_id',b.dataset.w).order('submitted_at');if(error)return toast(error.message,1);
   const m=modal(`<h3>Submissions (${data.length})</h3><div class="tw"><table><tr><th>Student</th><th>File</th><th>Late</th><th>Marks</th></tr>${data.map(d=>`<tr><td>${esc(d.students?.full_name||'')} <small>${esc(d.students?.roll_number||'')}</small></td><td>${(d.file_urls||[]).map(u=>`<a href="${esc(u)}" target="_blank" rel="noopener">Download</a>`).join(' ')}</td><td>${d.is_late?'Yes':'No'}</td><td><input type="number" step="any" value="${d.final_marks??''}" data-m="${d.id}" style="width:80px"></td></tr>`).join('')||'<tr><td colspan="4">No submissions yet</td></tr>'}</table></div>`,1);
   m.querySelectorAll('[data-m]').forEach(i=>i.onchange=async()=>{const {error}=await sb.from('assignment_submissions').update({final_marks:+i.value,evaluated_by:S.id,evaluated_at:new Date().toISOString()}).eq('id',i.dataset.m);toast(error?error.message:'Marks saved',!!error)})})}
}
async function crud(cu){
 window.__lastCrud=cu; // so drill Back can restore this page correctly
 const pageY=window.scrollY,navY=document.querySelector('#nav')?.scrollTop||0;
 await crud0(cu);
 await explore({...cu,f:cu.f.filter(f=>!f.ui)});
 requestAnimationFrame(()=>{window.scrollTo({top:pageY,behavior:'instant'});const n=document.querySelector('#nav');if(n)n.scrollTop=navY});
}

/* ---------- shared helpers: form fields, values, edit popup, refresh ---------- */
function fieldHTML(f,refs){const L=f.l||f.k.replace(/_id$/,'').replace(/_/g,' ');let el;
 if(f.ref)el=`<select name="${f.k}" ${f.opt||f.ui?'':'required'}><option value="">Select…</option>${(refs[f.k]||[]).map(r=>`<option value="${r.id}" data-p="${r.program_id||''}" data-y="${r.year_number||LK.classes?.[r.class_id]?.year_number||''}" data-s="${r.semester_id||''}" data-k="${r.class_id||''}" data-d="${r.department_id||LK.programs?.[r.program_id]?.department_id||''}">${esc(nm(f.ref,r))}</option>`).join('')}</select>`;
 else if(f.type==='select')el=`<select name="${f.k}">${f.opts.map(o=>Array.isArray(o)?`<option value="${o[0]}">${o[1]}</option>`:`<option>${o}</option>`).join('')}</select>`;
 else if(f.type==='file')el=`<input name="${f.k}" type="file" accept="image/*,.pdf,.doc,.docx,.xlsx,.csv">`;
 else if(f.type==='textarea')el=`<textarea name="${f.k}" rows="2"></textarea>`;
 else if(f.type==='checkbox')el=`<select name="${f.k}"><option value="false">No</option><option value="true">Yes</option></select>`;
 else el=`<input name="${f.k}" type="${f.type||'text'}" ${f.opt?'':'required'} ${f.type==='number'?'step="any"':''}>`;
 return `<div${f.type==='textarea'?' style="grid-column:1/-1"':''}><label>${esc(L)}</label>${el}</div>`}
async function formValues(c,fd,isEdit){const v={college_id:S.college_id};
 for(const f of c.f){if(f.h||f.ui)continue;let x=fd.get(f.k);
  if(f.type==='file'){if(x&&x.size)v[f.k]=await uploadFile(f.bucket,x);else if(!isEdit)v[f.k]=null;continue}
  if(x===''||x===null)x=null;else if(f.type==='checkbox')x=x==='true';else if(f.type==='number')x=+x;
  if(['target_roles','target_student_ids'].includes(f.k))x=x?String(x).split(',').map(z=>z.trim()).filter(Boolean):[];v[f.k]=x}
 if(c.t==='announcements'){const a=v.audience;delete v.audience;const selected=a?(a==='staff'?STAFFROLES:[a]):[];v.target_roles=[...new Set([...(v.target_roles||[]),...selected])];if(!v.target_roles.length)v.target_roles=null;if(!isEdit)v.created_by=S.id}
 if(c.t==='assignments'){if(!isEdit)v.teacher_id=S.id;if(v.deadline)v.deadline=new Date(v.deadline).toISOString()}
 if(c.t==='attendance'&&!isEdit)v.marked_by=S.id;if((c.t==='study_materials'||c.t==='result_imports')&&!isEdit)v.uploaded_by=S.id;
 delete v.audience;return v}
async function afterSave(c,v){   // a class teacher must actually carry the class-teacher role
 if(c.t==='classes'&&v.class_teacher_id){const {data}=await sb.from('user_roles').select('id,role').eq('user_id',v.class_teacher_id).eq('college_id',S.college_id);
  if(data&&!data.some(x=>['class_teacher','hod','principal'].includes(x.role))){const st=data.find(x=>x.role==='subject_teacher');if(st)await sb.from('user_roles').update({role:'class_teacher'}).eq('id',st.id);else await sb.from('user_roles').insert({user_id:v.class_teacher_id,college_id:S.college_id,role:'class_teacher'})}}}
async function afterWrite(cu){try{LKP=null;await loadLK()}catch(e){}if(cu)await crud(cu)}
function editModal(c,cu,r,refs){const fs=[...cu.f.filter(f=>f.ui),...c.f].filter(f=>!f.h&&!(c.t==='announcements'&&f.k==='audience'));if(c.login)fs.push({k:'__pw',l:r.user_id?'New login password (leave blank to keep)':'Create login password',opt:1});
 const m=modal(`<h3>Edit ${esc(c.title.replace(/s$/,'').toLowerCase())}</h3><p style="color:var(--mut);font-size:13px;margin:4px 0 12px">Change the values and press Update. The page refreshes automatically.</p><form id="ef" class="form">${fs.map(f=>fieldHTML(f,refs)).join('')}<div style="grid-column:1/-1;display:flex;gap:8px;justify-content:flex-end"><button type="button" class="btn ghost" id="ecx">Cancel</button><button type="submit" class="btn">Update</button></div></form>`,true);
 m.querySelector('.mbox').classList.add('xw');const ef=m.querySelector('#ef'),X=typeof ctxOf==='function'?ctxOf(c,r):{};
 const ctx={department_id:r.department_id||LK.programs?.[X.p]?.department_id||'',program_id:r.program_id||X.p||'',class_id:r.class_id||X.k||'',semester_id:r.semester_id||X.sm||''};
 for(const f of fs){const el=ef.elements[f.k];if(!el||f.type==='file')continue;let val=r[f.k]??ctx[f.k]??'';if(f.type==='datetime-local'&&val)val=String(val).slice(0,16);if(f.type==='date'&&val)val=String(val).slice(0,10);if(Array.isArray(val))val=val.join(', ');el.value=val==null?'':String(val)}
 if(typeof cascade==='function')cascade(ef);for(const f of fs){const el=ef.elements[f.k];if(el&&el.tagName==='SELECT'&&(r[f.k]??ctx[f.k]))el.value=r[f.k]??ctx[f.k]}
 m.querySelector('#ecx').onclick=()=>m.remove();
 ef.onsubmit=async e=>{e.preventDefault();const b=ef.querySelector('[type=submit]');if(b.disabled)return;b.disabled=true;b.textContent='Updating…';
  try{const fd=new FormData(ef),v=await formValues(c,fd,true),pw=String(fd.get('__pw')||'');delete v.__pw;
   if(c.login){if(pw&&pw.length<6)throw Error('Password must be at least 6 characters');
    if(r.user_id){const up={updated_at:new Date().toISOString()};if(v.full_name)up.full_name=v.full_name;if(v.email)up.email=String(v.email).toLowerCase();if('mobile' in v)up.phone=v.mobile||null;if(pw)up.password=pw;
     const a=await sb.from('users').update(up).eq('id',r.user_id);if(a.error)throw a.error;const pr={};if(up.full_name)pr.full_name=up.full_name;if(up.email)pr.email=up.email;if('phone' in up)pr.phone=up.phone;if(Object.keys(pr).length){const b=await sb.from('profiles').update(pr).eq('id',r.user_id);if(b.error)throw b.error}}
    else if(pw){if(!v.email)throw Error('Add an email to create the login');const u=await mkUser({full_name:v.full_name,email:v.email,password:pw,role:c.login,college_id:S.college_id});v.user_id=u.id}}
   const {error}=await sb.from(c.t).update(v).eq('id',r.id);if(error)throw error;await afterSave(c,v);m.remove();toast('Updated'+(pw?' · password changed':''));afterWrite(cu)}
  catch(x){toast(x.message,1);b.disabled=false;b.textContent='Update'}}}
