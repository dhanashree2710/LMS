/* =====================================================================
   Feedback forms: staff create a form for a class / semester (optionally a
   subject and teacher) → students of that class fill it once → staff see
   responses as a table and download them as an Excel sheet.
   ===================================================================== */
const FB_DEFAULT=['The teacher explains concepts clearly','Lectures start and end on time','Syllabus is covered as planned','Doubts are answered patiently','Study material and references are useful','Assignments and tests are evaluated fairly'];
const FB_STAFF=['college_admin','sub_admin','principal','hod','class_teacher','subject_teacher'];
const fbStars=n=>n==null||n===''?'—':'★'.repeat(Math.round(n))+'☆'.repeat(5-Math.round(n));

async function feedbackPage(){await (LKP||loadLK());const cid=S.college_id,isStu=S.role==='student',staff=FB_STAFF.includes(S.role);
 if(isStu)return fbStudent(cid);
 if(!staff){$('#view').innerHTML='<div class="panel empty">Feedback forms are filled by students and managed by staff.</div>';return}
 const sc=await scope();
 let {data:forms,error}=await sb.from('feedback_forms').select('*').eq('college_id',cid).order('created_at',{ascending:false});if(error)throw error;forms=forms||[];
 if(!sc.all)forms=forms.filter(f=>f.created_by===S.id||f.teacher_id===S.id||(f.class_id&&sc.classes.includes(f.class_id))||(f.subject_id&&sc.subjects.includes(f.subject_id)));
 const ids=forms.map(f=>f.id),{data:resp}=ids.length?await sb.from('feedback_responses').select('form_id,answers').in('form_id',ids):{data:[]};
 const R={};(resp||[]).forEach(r=>{(R[r.form_id]=R[r.form_id]||[]).push(r)});
 const strength=k=>vals(LK.students).filter(s=>s.class_id===k&&s.status!=='inactive').length;
 const avgOf=f=>{const a=(R[f.id]||[]).flatMap(r=>Object.values(r.answers||{}).map(Number).filter(n=>n>0));return a.length?(a.reduce((x,y)=>x+y,0)/a.length):null};
 const {data:tr}=await sb.from('user_roles').select('user_id,role,profiles(full_name)').eq('college_id',cid).in('role',['hod','class_teacher','subject_teacher','principal']);
 const teachers=[...new Map((tr||[]).map(x=>[x.user_id,{id:x.user_id,full_name:x.profiles?.full_name||'Staff'}])).values()].sort((a,b)=>a.full_name.localeCompare(b.full_name));
 const lim=(t,a)=>sc.all?a:a.filter(o=>t==='classes'?sc.classes.includes(o.id):t==='subjects'?sc.subjects.includes(o.id):t==='programs'?sc.programs.includes(o.id):true);
 const refs={department_id:vals(LK.departments),program_id:lim('programs',vals(LK.programs)),class_id:lim('classes',vals(LK.classes).filter(k=>LK.academic_years?.[k.academic_year_id]?.is_active!==false)),semester_id:vals(LK.semesters),subject_id:lim('subjects',vals(LK.subjects)),teacher_id:teachers};
 const F=[{k:'department_id',l:'Department',ref:'departments',ui:1},{k:'program_id',l:'Course',ref:'programs',ui:1},{k:'class_id',l:'Class',ref:'classes'},{k:'semester_id',l:'Semester',ref:'semesters'},{k:'subject_id',l:'Subject (optional)',ref:'subjects',opt:1},{k:'teacher_id',l:'Teacher (optional)',ref:'teachers',opt:1}];
 $('#view').innerHTML=`<div class="panel"><h3 style="margin-bottom:4px">Create feedback form</h3><p style="color:var(--mut);font-size:13px;margin:0 0 12px">Pick the class and semester it is for. Only students of that class will see it.</p>
 <form id="ff" class="form"><div style="grid-column:1/-1"><label>Title</label><input name="title" required placeholder="e.g. Mid-semester teaching feedback"></div>${F.map(f=>fieldHTML(f,refs)).join('')}
  <div><label>Opens on</label><input name="open_on" type="date" value="${new Date().toISOString().slice(0,10)}"></div><div><label>Closes on</label><input name="close_on" type="date"></div>
  <div><label>Responses</label><select name="anonymous"><option value="true">Anonymous (names hidden)</option><option value="false">Show student names</option></select></div>
  <div style="grid-column:1/-1"><label>Questions — one per line, students rate each from 1 to 5</label><textarea name="questions" rows="6">${FB_DEFAULT.join('\n')}</textarea></div>
  <div style="grid-column:1/-1"><label>Instructions (optional)</label><input name="description" placeholder="Shown to students above the questions"></div>
  <div><button class="btn" type="submit">Create form</button></div></form></div>
 <div class="panel" data-ac="1"><div class="phd"><h3>Feedback forms</h3><div style="display:flex;gap:8px;align-items:center"><input id="sq" placeholder="Search…" style="width:200px"><button class="btn ghost sm" id="fxall">⬇ Download sheet</button></div></div>
 <div class="tw"><table><thead><tr><th>Title</th><th>Class</th><th>Semester</th><th>Subject</th><th>Teacher</th><th>Questions</th><th>Responses</th><th>Average</th><th>Open – close</th><th>Status</th><th></th></tr></thead><tbody id="tb">
 ${forms.map(f=>{const n=(R[f.id]||[]).length,tot=f.class_id?strength(f.class_id):0,a=avgOf(f);return `<tr><td><b>${esc(f.title)}</b></td><td>${esc(LB('classes',f.class_id)||'—')}</td><td>${esc(LB('semesters',f.semester_id)||'—')}</td><td>${esc(LB('subjects',f.subject_id)||'All subjects')}</td><td>${esc(f.teacher_id?LB('users',f.teacher_id):'—')}</td><td>${(f.questions||[]).length}</td><td>${n}${tot?` / ${tot}`:''}</td><td>${a==null?'—':`<span title="${a.toFixed(2)} / 5">${a.toFixed(1)} ${fbStars(a)}</span>`}</td><td>${fdate(f.open_on)} – ${f.close_on?fdate(f.close_on):'open'}</td><td><span class="pill ${f.status==='open'?'':'s'}">${esc(f.status)}</span></td>
  <td style="white-space:nowrap"><button class="btn sm" data-v="${f.id}">Responses</button> <button class="btn ghost sm" data-x="${f.id}" title="Download responses">⬇</button> <button class="btn ghost sm" data-t="${f.id}">${f.status==='open'?'Close':'Reopen'}</button> <button class="btn red sm" data-del="${f.id}">Delete</button></td></tr>`}).join('')||'<tr><td colspan="11" class="empty">No feedback forms yet. Create the first one above.</td></tr>'}</tbody></table></div></div>`;
 cascade($('#ff'));
 $('#sq').oninput=e=>document.querySelectorAll('#tb tr').forEach(tr=>tr.classList.toggle('hide',!tr.textContent.toLowerCase().includes(e.target.value.toLowerCase())));
 $('#ff').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),b=e.target.querySelector('[type=submit]');if(b.disabled)return;b.disabled=true;
  try{const qs=String(f.get('questions')||'').split('\n').map(x=>x.trim()).filter(Boolean);if(!qs.length)throw Error('Add at least one question');
   const k=f.get('class_id'),cl=LK.classes?.[k];
   const v={college_id:cid,title:f.get('title'),description:f.get('description')||null,class_id:k||null,semester_id:f.get('semester_id')||null,subject_id:f.get('subject_id')||null,teacher_id:f.get('teacher_id')||null,
    program_id:cl?.program_id||f.get('program_id')||null,department_id:LK.programs?.[cl?.program_id]?.department_id||f.get('department_id')||null,
    questions:qs.map((q,i)=>({id:'q'+(i+1),text:q,type:'rating'})),open_on:f.get('open_on')||null,close_on:f.get('close_on')||null,anonymous:f.get('anonymous')==='true',status:'open',created_by:S.id};
   const {error}=await sb.from('feedback_forms').insert(v);if(error)throw error;toast('Feedback form created and sent to '+(LB('classes',k)||'the class'));feedbackPage()}catch(x){toast(x.message,1);b.disabled=false}};
 const byId=id=>forms.find(f=>f.id===id);
 document.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>fbResponses(byId(b.dataset.v)));
 document.querySelectorAll('[data-x]').forEach(b=>b.onclick=async()=>{const f=byId(b.dataset.x);dl({Responses:await fbRows(f)},fbFile(f))});
 $('#fxall').onclick=()=>dl({'Feedback forms':forms.map(f=>{const a=avgOf(f);return {Title:f.title,Class:LB('classes',f.class_id),Semester:LB('semesters',f.semester_id),Subject:LB('subjects',f.subject_id)||'All subjects',Teacher:f.teacher_id?LB('users',f.teacher_id):'',Questions:(f.questions||[]).length,Responses:(R[f.id]||[]).length,'Class strength':f.class_id?strength(f.class_id):'','Average (out of 5)':a==null?'':+a.toFixed(2),'Opens on':f.open_on||'','Closes on':f.close_on||'',Status:f.status}})},'feedback_forms.xlsx');
 document.querySelectorAll('[data-t]').forEach(b=>b.onclick=async()=>{const f=byId(b.dataset.t);const {error}=await sb.from('feedback_forms').update({status:f.status==='open'?'closed':'open'}).eq('id',f.id);error?toast(error.message,1):(toast('Updated'),feedbackPage())});
 document.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this feedback form and all its responses?'))return;const {error}=await sb.from('feedback_forms').delete().eq('id',b.dataset.del);error?toast(error.message,1):(toast('Deleted'),feedbackPage())})}

const fbFile=f=>('feedback_'+(LB('classes',f.class_id)||'form')+'_'+f.title).replace(/[^\w-]+/g,'_').slice(0,80)+'.xlsx';
async function fbRows(f){const {data}=await sb.from('feedback_responses').select('*').eq('form_id',f.id).order('created_at');const qs=f.questions||[];
 const rows=(data||[]).map((r,i)=>{const s=LK.students?.[r.student_id]||{},o={'#':i+1};if(!f.anonymous){o['Roll no.']=s.roll_number||'';o.Student=s.full_name||''}
  qs.forEach((q,j)=>o['Q'+(j+1)+'. '+q.text]=r.answers?.[q.id]??'');const nums=qs.map(q=>+r.answers?.[q.id]).filter(n=>n>0);o['Average']=nums.length?+(nums.reduce((a,b)=>a+b,0)/nums.length).toFixed(2):'';o.Comments=r.comments||'';o['Submitted on']=String(r.created_at||'').slice(0,10);return o});
 if(rows.length){const avg={'#':'Average'};if(!f.anonymous){avg['Roll no.']='';avg.Student=''}qs.forEach((q,j)=>{const k='Q'+(j+1)+'. '+q.text,n=rows.map(r=>+r[k]).filter(x=>x>0);avg[k]=n.length?+(n.reduce((a,b)=>a+b,0)/n.length).toFixed(2):''});rows.push(avg)}
 return rows}
async function fbResponses(f){const rows=await fbRows(f),qs=f.questions||[],n=rows.length?rows.length-1:0,avg=rows[rows.length-1]||{};
 const m=modal(`<div class="phd"><div><h3>${esc(f.title)}</h3><small style="color:var(--mut)">${esc(LB('classes',f.class_id))} · ${esc(LB('semesters',f.semester_id))}${f.subject_id?' · '+esc(LB('subjects',f.subject_id)):''}${f.teacher_id?' · '+esc(LB('users',f.teacher_id)):''} · ${f.anonymous?'anonymous':'named'} responses</small></div><button class="btn sm" id="fx">⬇ Download sheet</button></div>
 <h4 style="margin:14px 0 8px">Question averages (${n} response${n===1?'':'s'})</h4><div class="tw"><table><thead><tr><th>#</th><th>Question</th><th>Average</th><th>Rating</th></tr></thead><tbody>${qs.map((q,j)=>{const a=avg['Q'+(j+1)+'. '+q.text];return `<tr><td>${j+1}</td><td>${esc(q.text)}</td><td><b>${a===''||a==null?'—':a}</b></td><td style="color:#D97706">${a===''||a==null?'':fbStars(a)}</td></tr>`}).join('')}</tbody></table></div>
 <h4 style="margin:16px 0 8px">All responses</h4><div class="tw"><table><thead><tr>${rows.length?Object.keys(rows[0]).map(k=>`<th title="${esc(k)}">${esc(k.length>22?k.slice(0,4).replace(/\.$/,''):k)}</th>`).join(''):'<th></th>'}</tr></thead><tbody>${rows.slice(0,-1).map(r=>`<tr>${Object.values(r).map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')||'<tr><td class="empty">No responses yet.</td></tr>'}</tbody></table></div>`,true);
 m.querySelector('.mbox').classList.add('xw');m.querySelector('#fx').onclick=()=>dl({Responses:rows},fbFile(f))}

async function fbStudent(cid){const me=(await myStudents())[0];if(!me){$('#view').innerHTML='<div class="panel empty">Your student record was not found.</div>';return}
 const {data:forms,error}=await sb.from('feedback_forms').select('*').eq('college_id',cid).eq('status','open').order('created_at',{ascending:false});if(error)throw error;
 const today=new Date().toISOString().slice(0,10);
 const mine=(forms||[]).filter(f=>(f.class_id?f.class_id===me.class_id:(!f.program_id||f.program_id===me.program_id))&&(!f.semester_id||!me.semester_id||f.semester_id===me.semester_id)&&(!f.open_on||f.open_on<=today));
 const {data:done}=await sb.from('feedback_responses').select('form_id,created_at').eq('student_id',me.id);const D=Object.fromEntries((done||[]).map(x=>[x.form_id,x.created_at]));
 $('#view').innerHTML=`<div class="panel" data-ac="1"><div class="phd"><h3>My feedback forms</h3><span class="pill n">${esc(LB('classes',me.class_id))} · ${esc(LB('semesters',me.semester_id)||'')}</span></div>
 <div class="tw"><table><thead><tr><th>Title</th><th>Subject</th><th>Teacher</th><th>Questions</th><th>Closes on</th><th>Status</th><th></th></tr></thead><tbody>
 ${mine.map(f=>{const closed=f.close_on&&f.close_on<today;return `<tr><td><b>${esc(f.title)}</b>${f.description?`<br><small style="color:var(--mut)">${esc(f.description)}</small>`:''}</td><td>${esc(LB('subjects',f.subject_id)||'All subjects')}</td><td>${esc(f.teacher_id?LB('users',f.teacher_id):'—')}</td><td>${(f.questions||[]).length}</td><td>${f.close_on?fdate(f.close_on):'—'}</td><td>${D[f.id]?'<span class="pill">Submitted</span>':closed?'<span class="pill s">Closed</span>':'<span class="pill w">Pending</span>'}</td><td>${!D[f.id]&&!closed?`<button class="btn sm" data-f="${f.id}">Fill feedback</button>`:''}</td></tr>`}).join('')||'<tr><td colspan="7" class="empty">No feedback forms for your class right now.</td></tr>'}</tbody></table></div></div>`;
 document.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{const f=mine.find(x=>x.id===b.dataset.f);
  const m=modal(`<h3>${esc(f.title)}</h3><p style="color:var(--mut);font-size:13px">${esc(f.description||'Rate each statement from 1 (poor) to 5 (excellent).')} ${f.anonymous?'Your name is not shown to staff.':''}</p>
  <form id="fr">${(f.questions||[]).map((q,j)=>`<div class="fbq"><div><b>${j+1}.</b> ${esc(q.text)}</div><div class="rate">${[1,2,3,4,5].map(n=>`<label><input type="radio" name="${q.id}" value="${n}" required><span>${n}</span></label>`).join('')}</div></div>`).join('')}
  <label style="margin-top:10px;display:block">Comments (optional)</label><textarea name="__c" rows="3"></textarea><div style="text-align:right;margin-top:12px"><button class="btn" type="submit">Submit feedback</button></div></form>`,true);
  m.querySelector('#fr').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target),ans={};(f.questions||[]).forEach(q=>ans[q.id]=+fd.get(q.id));const bt=e.target.querySelector('[type=submit]');bt.disabled=true;
   const {error}=await sb.from('feedback_responses').insert({college_id:cid,form_id:f.id,student_id:me.id,answers:ans,comments:fd.get('__c')||null});if(error){bt.disabled=false;return toast(error.message,1)}m.remove();toast('Thank you! Feedback submitted');fbStudent(cid)}})}
