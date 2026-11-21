/* ===== hub: role scope, card/table explorer, drill-down, syllabus ===== */
const Z0='00000000-0000-0000-0000-000000000000';
/* ---- who can write what ---- */
const RO={subject_teacher:['timetable','academic_years','programs','departments','classes','semesters','subjects','students','user_roles'],class_teacher:['timetable','academic_years','programs','departments','classes','semesters','subjects','students','user_roles'],hod:['academic_years','programs','semesters','user_roles'],accounts:['students'],librarian:['students'],tpo:['students'],activity_admin:['students'],admission_admin:[],examination_admin:[]};
const canWrite=t=>t!=='fee_payments'&&!(RO[S.role]||[]).includes(t);
async function myStudents(){if(window.__my)return window.__my;let r=[];
 if(S.role==='student'){r=(await sb.from('students').select('*').eq('user_id',S.id)).data||[]}
 else if(S.role==='parent'){const {data:p}=await sb.from('parents').select('id').eq('user_id',S.id);const {data:l}=await sb.from('parent_student_links').select('student_id').in('parent_id',(p||[]).map(x=>x.id).concat([Z0]));r=(await sb.from('students').select('*').in('id',(l||[]).map(x=>x.student_id).concat([Z0]))).data||[]}
 return window.__my=r}
/* ---- responsibility scope for HOD / class teacher / subject teacher ---- */
let _sc;async function scope(){if(_sc)return _sc;const r=S.role;if(!['hod','class_teacher','subject_teacher'].includes(r))return _sc={all:true};
 const cid=S.college_id,o={all:false},nz=a=>[...new Set(a.filter(Boolean))],ids=a=>nz(a).concat([Z0]);
 const mine=(await sb.from('subject_assignments').select('subject_id,class_id').eq('teacher_id',S.id)).data||[];
 let subs=nz(mine.map(x=>x.subject_id)),cls=nz(mine.map(x=>x.class_id)),progs=[],depts=[];
 if(r==='class_teacher'){const {data}=await sb.from('classes').select('id').eq('college_id',cid).eq('class_teacher_id',S.id);cls=nz([...cls,...(data||[]).map(x=>x.id)]);
  const {data:al}=await sb.from('subject_assignments').select('subject_id').in('class_id',ids(cls));subs=nz([...subs,...(al||[]).map(x=>x.subject_id)])}
 if(r==='hod'){const {data:d}=await sb.from('departments').select('id').eq('college_id',cid).eq('hod_user_id',S.id);depts=nz((d||[]).map(x=>x.id));
  const {data:s}=await sb.from('subjects').select('id,program_id').eq('college_id',cid).in('department_id',ids(depts));subs=nz((s||[]).map(x=>x.id));progs=nz((s||[]).map(x=>x.program_id));
  const {data:k}=await sb.from('classes').select('id').eq('college_id',cid).in('program_id',ids(progs));cls=nz((k||[]).map(x=>x.id))}
 else{const {data:s}=await sb.from('subjects').select('program_id').in('id',ids(subs));progs=nz((s||[]).map(x=>x.program_id));const {data:k}=await sb.from('classes').select('program_id').in('id',ids(cls));progs=nz([...progs,...(k||[]).map(x=>x.program_id)])}
 const st=(await sb.from('students').select('id').eq('college_id',cid).in('class_id',ids(cls))).data||[];
 return _sc={all:false,subjects:ids(subs),classes:ids(cls),programs:ids(progs),depts:ids(depts),students:ids(st.map(x=>x.id)),mineOnly:r==='subject_teacher',hod:r==='hod'}}
function applyScope(c,q,s){const t=c.t,k=c.f.map(f=>f.k);
 if(t==='subjects')return q.in('id',s.subjects);if(t==='classes')return q.in('id',s.classes);if(t==='students')return q.in('class_id',s.classes);
 if(t==='programs')return q.in('id',s.programs);if(t==='departments')return s.hod?q.in('id',s.depts):q;
 if(t==='subject_assignments')return s.mineOnly?q.eq('teacher_id',S.id):s.hod?q.in('subject_id',s.subjects):q.in('class_id',s.classes);
 if(t==='semesters')return q.in('program_id',s.programs);
 if(k.includes('subject_id'))q=q.in('subject_id',s.subjects);else if(k.includes('class_id'))q=q.in('class_id',s.classes);
 if(k.includes('student_id'))q=q.in('student_id',s.students);return q}
function scopeRefs(refs,s){for(const k in refs){const f=x=>refs[k]=refs[k].filter(r=>x.includes(r.id));
 if(k==='subject_id')f(s.subjects);else if(/class_id$/.test(k))f(s.classes);else if(k==='student_id')f(s.students);else if(k==='program_id')f(s.programs)}}
/* ---- full-page drill navigation (no popup for hierarchy) ---- */
let CUR=null,HIST=[],_listRestore=null;
function captureList(){
  // Save a function that fully re-renders the current page list (CRUD + explorer)
  if(_listRestore)return;
  const saved=window.__lastCrud;
  _listRestore=async()=>{
    CUR=null;HIST=[];
    if(saved&&typeof crud==='function'){
      await crud(saved);
    }else if(typeof location!=='undefined'){
      location.reload();
      return;
    }
    window.scrollTo({top:0,behavior:'instant'});
  };
}
function pageView(html){
  // Full page content – reuse shell Back/Refresh only (never create a second bar)
  document.querySelectorAll('.mdl').forEach(m=>m.remove());
  if(!_listRestore)captureList();
  $('#view').innerHTML=html;
  // Point shell buttons at the drill stack
  const shellBack=$('#back'),shellRefresh=$('#refreshPage');
  if(shellBack)shellBack.onclick=()=>back();
  if(shellRefresh)shellRefresh.onclick=()=>{if(CUR&&document.querySelector('.mdl'))CUR();else{CUR=null;HIST=[];document.querySelectorAll('.mdl').forEach(m=>m.remove());location.reload()}};
  // Make chips / data-k cards navigate as full pages
  document.querySelectorAll('#view [data-k]').forEach(el=>el.onclick=()=>{
    const o=LK[el.dataset.k]?.[el.dataset.id];
    if(o&&GO[el.dataset.k])nav(()=>GO[el.dataset.k](o));
  });
  if(typeof tilt==='function')tilt();
  window.scrollTo({top:0,behavior:'instant'});
  return $('#view');
}
function nav(fn){
  if(CUR)HIST.push(CUR);
  if(!_listRestore)captureList();
  CUR=fn;fn();
}
function closeMdl(){document.querySelectorAll('.mdl').forEach(m=>m.remove());CUR=null;HIST=[];if(_listRestore)_listRestore()}
function back(){
  const prev=HIST.pop();
  if(prev){CUR=prev;prev();return}
  // Return to the original list and restore shell Back/Refresh handlers
  const restore=_listRestore;
  CUR=null;HIST=[];_listRestore=null;
  const shellBack=$('#back'),shellRefresh=$('#refreshPage');
  if(shellBack)shellBack.onclick=()=>document.referrer.includes(location.host)&&history.length>1?history.back():location.href=(typeof FILE!=='undefined'?FILE.dash:'dashboard.html');
  if(shellRefresh)shellRefresh.onclick=()=>location.reload();
  if(restore){restore();return}
  location.reload();
}
// Keep a lightweight modal helper for small edit forms only
function mod(html){
  document.querySelectorAll('.mdl').forEach(m=>m.remove());
  const m=modal((HIST.length||_listRestore?'<button class="btn ghost sm" id="bk2" style="margin-bottom:10px">← Back</button> ':'')+html,1);
  m.onclick=e=>{if(e.target===m||e.target.className==='mx'){m.remove()}};
  const b=m.querySelector('#bk2');if(b)b.onclick=()=>{m.remove();back()};
  m.querySelectorAll('[data-k]').forEach(el=>el.onclick=()=>{const o=LK[el.dataset.k]?.[el.dataset.id];if(o)nav(()=>GO[el.dataset.k](o))});
  return m;
}
const yrName=n=>n?({1:'FY',2:'SY',3:'TY',4:'Final Year'}[n]||'Year '+n):'General';
const chip=(k,o,sm)=>`<span class="chip" data-k="${k}" data-id="${o.id}">${esc(nm(k,o))}${sm!=null&&sm!==''?` <small>${esc(sm)}</small>`:''}</span>`;
const none='<div class="empty" style="padding:16px;text-align:left">No records found. Please add data using the form above or enter it in Supabase.</div>';
const vals=o=>Object.values(o||{});
const dlBtn='';
const sCount=id=>vals(LK.students).filter(s=>s.class_id===id).length;
function drillProgram(p,yn){yn=yn||0;const dur=p.duration_years||3,inY=x=>!yn||x.year_number===yn;
 const cls=vals(LK.classes).filter(x=>x.program_id===p.id&&inY(x)),sem=vals(LK.semesters).filter(x=>x.program_id===p.id&&inY(x)).sort((a,b)=>a.semester_number-b.semester_number),subs=vals(LK.subjects).filter(x=>x.program_id===p.id);
 const m=pageView(`<div class="panel"><h3>${esc(p.name)}</h3><small style="color:var(--mut)">${esc(p.level||'')} · ${dur} years · ${vals(LK.students).filter(s=>s.program_id===p.id).length} students</small>
 <div style="margin:12px 0">${dlBtn}</div>
 <div class="seg">${[0,...Array.from({length:dur},(_,i)=>i+1)].map(n=>`<button data-y="${n}" class="${n===yn?'on':''}">${n?yrName(n):'All years'}</button>`).join('')}</div>
 <h3 style="margin:16px 0 8px">Classes</h3><div class="grid">${cls.map(k=>`<div class="col" data-k="classes" data-id="${k.id}"><h3>${esc(k.name)}</h3><small>${sCount(k.id)} students</small><span class="tag">View →</span></div>`).join('')||none}</div>
 <h3 style="margin:16px 0 8px">Semesters</h3><div class="grid">${sem.map(s=>`<div class="col" data-k="semesters" data-id="${s.id}"><h3>${esc(nm('semesters',s))}</h3><small>${subs.filter(x=>x.semester_id===s.id).length} subjects</small><span class="tag">View →</span></div>`).join('')||none}</div></div>`);
 m.querySelectorAll('[data-y]').forEach(b=>b.onclick=()=>{CUR=()=>drillProgram(p,+b.dataset.y);CUR()});
 if(m.querySelector('#dd1'))m.querySelector('#dd1').onclick=()=>dl({Course:[p],Classes:cls.map(k=>({...k,students:sCount(k.id)})),Semesters:sem,Subjects:subs.filter(x=>!yn||LK.semesters[x.semester_id]?.year_number===yn),Students:vals(LK.students).filter(s=>s.program_id===p.id)},(p.code||'course')+'_details.xlsx')}
function drillSem(s){const subs=vals(LK.subjects).filter(x=>x.semester_id===s.id);
 const m=pageView(`<div class="panel"><h3>${esc(nm('semesters',s))}</h3><small style="color:var(--mut)">${esc(LB('programs',s.program_id))} · ${yrName(s.year_number)}</small>
 <div style="margin:12px 0">${dlBtn}</div>
 <h3 style="margin:16px 0 8px">Subjects</h3>
 <div class="grid">${subs.map(x=>`<div class="col" data-k="subjects" data-id="${x.id}"><h3>${esc(x.name)}</h3><small>${esc(x.code||'')}</small><span class="tag">View syllabus →</span></div>`).join('')||none}</div>
 <p style="color:var(--mut);font-size:13px;margin-top:10px">Click a subject to see its full syllabus and details.</p></div>`);
 if(m.querySelector('#dd1'))m.querySelector('#dd1').onclick=()=>dl({Semester:[s],Subjects:subs},'semester_'+s.semester_number+'.xlsx')}
function drillDept(d){
 // Prefer courses linked to this department; if none, show all courses so hierarchy is still usable
 let progs=vals(LK.programs).filter(x=>x.department_id===d.id);
 const linkedOnly=progs.length>0;
 if(!linkedOnly)progs=vals(LK.programs);
 const counts=progs.map(p=>({p,classes:vals(LK.classes).filter(k=>k.program_id===p.id),students:vals(LK.students).filter(st=>st.program_id===p.id).length}));
 const m=pageView(`<div class="panel"><h3>${esc(d.name)}</h3><small style="color:var(--mut)">Code ${esc(d.code||'-')} · Head: ${esc(LB('users',d.hod_user_id)||'Not assigned')}</small>
 <div class="kpis" style="margin:14px 0"><div class="kpi"><div><b>${progs.length}</b><span>Courses</span></div></div><div class="kpi"><div><b>${counts.reduce((a,x)=>a+x.classes.length,0)}</b><span>Classes</span></div></div><div class="kpi"><div><b>${counts.reduce((a,x)=>a+x.students,0)}</b><span>Students</span></div></div></div>
 ${dlBtn}
 ${!linkedOnly?'<p style="color:var(--mut);font-size:13px;margin:8px 0">No courses are linked to this department yet. Showing all courses. Link a course to this department from the Courses page.</p>':''}
 <h3 style="margin:18px 0 10px">Courses</h3>
 <div class="grid">${counts.map(x=>`<div class="col" data-prog="${x.p.id}"><h3>${esc(x.p.name)}</h3><small>${x.classes.length} classes · ${x.students} students</small><span class="tag">View course →</span></div>`).join('')||none}</div></div>`);
 m.querySelectorAll('[data-prog]').forEach(el=>el.onclick=()=>{const pr=LK.programs[el.dataset.prog];if(pr)nav(()=>drillDeptCourse(d,pr))});
 if(m.querySelector('#dd1'))m.querySelector('#dd1').onclick=()=>dl({Department:[d],Courses:progs,Classes:counts.flatMap(x=>x.classes),Students:vals(LK.students).filter(st=>st.program_id&&progs.some(pr=>pr.id===st.program_id))},(d.code||'department')+'.xlsx')}
function drillDeptCourse(d,p){const classes=vals(LK.classes).filter(k=>k.program_id===p.id);
 const m=pageView(`<div class="panel"><h3>${esc(p.name)}</h3><small style="color:var(--mut)">${esc(d.name)} · ${classes.length} classes</small>
 <h3 style="margin:18px 0 10px">Classes</h3>
 <div class="grid">${classes.map(k=>`<div class="col" data-cl="${k.id}"><h3>${esc(k.name)}</h3><small>${sCount(k.id)} students · ${yrName(k.year_number)}</small><span class="tag">View class →</span></div>`).join('')||none}</div></div>`);
 m.querySelectorAll('[data-cl]').forEach(el=>el.onclick=()=>{const k=LK.classes[el.dataset.cl];if(k)nav(()=>drillDeptClass(d,p,k))})}
function drillDeptClass(d,p,k){const sems=vals(LK.semesters).filter(s=>s.program_id===p.id&&(!k.year_number||s.year_number===k.year_number)).sort((a,b)=>a.semester_number-b.semester_number);
 const m=pageView(`<div class="panel"><h3>${esc(k.name)}</h3><small style="color:var(--mut)">${esc(d.name)} · ${esc(p.name)} · ${sCount(k.id)} students</small>
 <h3 style="margin:18px 0 10px">Semesters</h3>
 <div class="grid">${sems.map(s=>`<div class="col" data-sem="${s.id}"><h3>${esc(nm('semesters',s))}</h3><small>${vals(LK.subjects).filter(x=>x.semester_id===s.id).length} subjects</small><span class="tag">View semester →</span></div>`).join('')||none}</div></div>`);
 m.querySelectorAll('[data-sem]').forEach(el=>el.onclick=()=>{const s=LK.semesters[el.dataset.sem];if(s)nav(()=>drillDeptSemester(d,p,k,s))})}
function drillDeptSemester(d,p,k,s){const subs=vals(LK.subjects).filter(x=>x.semester_id===s.id&&(!x.department_id||x.department_id===d.id));
 const m=pageView(`<div class="panel"><h3>${esc(nm('semesters',s))}</h3><small style="color:var(--mut)">${esc(d.name)} · ${esc(p.name)} · ${esc(k.name)}</small>
 <h3 style="margin:18px 0 10px">Subjects</h3>
 <div class="grid">${subs.map(x=>`<div class="col" data-sub="${x.id}"><h3>${esc(x.name)}</h3><small>${esc(x.code||'')} · ${x.credits||0} credits</small><span class="tag">View syllabus →</span></div>`).join('')||none}</div></div>`);
 m.querySelectorAll('[data-sub]').forEach(el=>el.onclick=()=>{const x=LK.subjects[el.dataset.sub];if(x)nav(()=>drillSubject(x))})}
function drillYear(y){const cls=vals(LK.classes).filter(k=>k.academic_year_id===y.id),stu=vals(LK.students).filter(s=>s.academic_year_id===y.id),by={};
 cls.forEach(k=>(by[k.program_id]=by[k.program_id]||[]).push(k));
 const m=mod(`<h3>Academic year ${esc(y.name)} ${y.is_active?'<span class="pill">Current</span>':''}</h3><small style="color:var(--mut)">${fdate(y.start_date||new Date())} → ${y.end_date?fdate(y.end_date):''}</small>
 <div class="kpis" style="margin:14px 0"><div class="kpi"><div><b>${Object.keys(by).length}</b><span>Courses</span></div></div><div class="kpi"><div><b>${cls.length}</b><span>Classes</span></div></div><div class="kpi"><div><b>${stu.length}</b><span>Students</span></div></div></div>${dlBtn}
 ${Object.entries(by).map(([p,ks])=>`<h3 style="margin:14px 0 8px">${esc(LB('programs',p))}</h3>${ks.sort((a,b)=>(a.year_number||0)-(b.year_number||0)).map(k=>chip('classes',k,sCount(k.id)+' students')).join('')}`).join('')||none}`);
 if(m.querySelector('#dd1'))m.querySelector('#dd1').onclick=async()=>{const ex=(await sb.from('exams').select('*').eq('academic_year_id',y.id)).data||[];dl({'Academic Year':[y],Classes:cls.map(k=>({...k,students:sCount(k.id)})),Students:stu,Exams:ex},'academic_year_'+y.name.replace(/\W+/g,'_')+'.xlsx')}}
async function drillClass(k){const [al,att]=await Promise.all([sb.from('subject_assignments').select('subject_id,teacher_id').eq('class_id',k.id),sb.from('attendance').select('status').eq('class_id',k.id)]);
 const stu=vals(LK.students).filter(s=>s.class_id===k.id).sort((a,b)=>String(a.roll_number).localeCompare(b.roll_number)),A=att.data||[],pc=A.length?Math.round(A.filter(a=>a.status==='present'||a.status==='late').length/A.length*100):null;
 const sa=(al.data||[]).map(x=>({subject_id:x.subject_id,teacher_id:x.teacher_id}));
 const m=pageView(`<div class="panel"><h3>${esc(k.name)}</h3><small style="color:var(--mut)">${esc(LB('programs',k.program_id))} · ${yrName(k.year_number)} · ${esc(LB('academic_years',k.academic_year_id))} · Class teacher: ${esc(LB('users',k.class_teacher_id)||'Not assigned')}</small>
 <div class="kpis" style="margin:14px 0"><div class="kpi"><div><b>${stu.length}</b><span>Students</span></div></div><div class="kpi"><div><b>${sa.length}</b><span>Subjects allocated</span></div></div><div class="kpi"><div><b>${pc==null?'-':pc+'%'}</b><span>Attendance</span></div></div></div>${dlBtn}
 <h3 style="margin:14px 0 8px">Subjects & teachers</h3>
 <div class="grid">${sa.map(x=>`<div class="col" data-k="subjects" data-id="${x.subject_id}"><h3>${esc(LB('subjects',x.subject_id))}</h3><small>${esc(LB('users',x.teacher_id)||'No teacher')}</small><span class="tag">View syllabus →</span></div>`).join('')||none}</div>
 <h3 style="margin:14px 0 8px">Students</h3>
 <div class="grid">${stu.map(s=>`<div class="col" data-k="students" data-id="${s.id}"><h3>${esc(s.full_name)}</h3><small>${esc(s.roll_number||'')}</small><span class="tag">View →</span></div>`).join('')||none}</div></div>`);
 if(m.querySelector('#dd1'))m.querySelector('#dd1').onclick=()=>dl({Class:[k],Students:stu,'Subject allocation':sa},k.name.replace(/\W+/g,'_')+'_class.xlsx')}
async function drillStudent(s){const [a,im,er,pg,pl]=await Promise.all([sb.from('attendance').select('subject_id,status').eq('student_id',s.id),sb.from('internal_marks').select('*').eq('student_id',s.id),sb.from('exam_results').select('*').eq('student_id',s.id),sb.from('academic_progression').select('*').eq('student_id',s.id),sb.from('parent_student_links').select('relationship,verified,parents(full_name,mobile,email)').eq('student_id',s.id)]);
 const by={};(a.data||[]).forEach(r=>{const o=by[r.subject_id]=by[r.subject_id]||{p:0,t:0};o.t++;if(r.status==='present'||r.status==='late')o.p++});
 const att=Object.entries(by).map(([id,o])=>({Subject:LB('subjects',id),Present:o.p,Total:o.t,'Attendance %':Math.round(o.p/o.t*100)})),tot=att.reduce((x,r)=>x+r.Total,0),pr=att.reduce((x,r)=>x+r.Present,0);
 const exm=(er.data||[]).map(r=>({Exam:LB('exams',r.exam_id),Subject:LB('subjects',LK.exams[r.exam_id]?.subject_id),Marks:r.marks_obtained,Max:LK.exams[r.exam_id]?.max_marks,Grade:r.grade||'',Status:cell('status',r.status)})),imk=(im.data||[]).map(r=>({Subject:LB('subjects',r.subject_id),Marks:r.marks,Max:r.max_marks}));
 const T=(rows)=>rows.length?`<div class="tw"><table><thead><tr>${Object.keys(rows[0]).map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${Object.values(r).map(v=>`<td>${esc(v??'')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:none;
 const m=mod(`<h3>${esc(s.full_name)}</h3><small style="color:var(--mut)">Roll ${esc(s.roll_number)} · ${esc(LB('academic_years',s.academic_year_id))} · ${esc(LB('programs',s.program_id))} · ${esc(LB('classes',s.class_id)||'No class')}</small>
 <div class="kpis" style="margin:14px 0"><div class="kpi"><div><b>${tot?Math.round(pr/tot*100)+'%':'-'}</b><span>Attendance</span></div></div><div class="kpi"><div><b>${(pg.data||[]).slice(-1)[0]?.status||'-'}</b><span>Latest result</span></div></div><div class="kpi"><div><b>${exm.length}</b><span>Exam marks</span></div></div></div>${dlBtn}
 <h3 style="margin:14px 0 8px">Attendance by subject</h3>${T(att)}<h3 style="margin:14px 0 8px">Internal marks</h3>${T(imk)}<h3 style="margin:14px 0 8px">Exam marks</h3>${T(exm)}
 <h3 style="margin:14px 0 8px">Parents</h3>${(pl.data||[]).map(l=>`<span class="chip" style="cursor:default">${esc(l.parents?.full_name||'')} <small>${esc(l.relationship)} · ${l.verified?'Verified':'Not verified'}</small></span>`).join('')||none}`);
 if(m.querySelector('#dd1'))m.querySelector('#dd1').onclick=()=>dl({Student:[s],Attendance:att,'Internal Marks':imk,'Exam Marks':exm},s.roll_number+'_report.xlsx')}
const GO={programs:drillProgram,semesters:drillSem,departments:drillDept,academic_years:drillYear,classes:drillClass,students:drillStudent,subjects:s=>drillSubject(s)};
/* ---- subject syllabus & details (view / edit / upload) ---- */
async function drillSubject(s,o={}){const q=t=>sb.from(t).select('*').eq('subject_id',s.id).limit(100);const [mt,as,ex,al]=await Promise.all([q('study_materials'),q('assignments'),q('exams'),q('subject_assignments')]);
 s=LK.subjects[s.id]||s;const sem=LK.semesters[s.semester_id],units=String(s.units||'').split('\n').filter(x=>x.trim()),W=!o.ro&&canWrite('subjects')&&!['student','parent'].includes(S.role);
 const blk=(h,v)=>v?`<h3 style="margin:14px 0 6px">${h}</h3><div style="white-space:pre-wrap;line-height:1.55">${esc(v)}</div>`:'';
 const L=(rows,f)=>rows.length?rows.map(f).join(''):none;
 const m=pageView(`<div class="panel"><h3>${esc(s.name)}</h3><small style="color:var(--mut)">${esc(s.code)} · ${s.credits||0} credits · ${s.teaching_hours||'-'} hours</small>
 <div style="margin:10px 0">${LB('programs',s.program_id)?`<span class="chip" style="cursor:default">Course <small>${esc(LB('programs',s.program_id))}</small></span>`:''}${sem?`<span class="chip" style="cursor:default">${esc(nm('semesters',sem))} <small>${yrName(sem.year_number)}</small></span>`:''}${s.department_id?`<span class="chip" style="cursor:default">Department <small>${esc(LB('departments',s.department_id))}</small></span>`:''}</div>
 <div style="margin:10px 0 4px">${dlBtn} ${s.syllabus_url?`<a class="btn ghost sm" style="text-decoration:none" href="${esc(s.syllabus_url)}" target="_blank" rel="noopener">📄 Open syllabus file</a>`:''} ${W?'<button class="btn ghost sm" id="es">✎ Edit / upload syllabus</button>':''}</div>
 ${blk('Course objectives',s.objectives)}${units.length?`<h3 style="margin:14px 0 6px">Units</h3><ol style="padding-left:20px;line-height:1.7">${units.map(u=>`<li>${esc(u)}</li>`).join('')}</ol>`:''}${blk('Syllabus details',s.syllabus_text)}${blk('Reference books',s.reference_books)}
 ${!s.objectives&&!units.length&&!s.syllabus_text&&!s.syllabus_url?'<div class="empty" style="text-align:left;padding:12px 0">Syllabus has not been added yet. Please edit and add content, or enter it in Supabase.</div>':''}
 <h3 style="margin:14px 0 6px">Teachers & classes</h3>${(al.data||[]).map(x=>`<span class="chip" style="cursor:default">${esc(LB('classes',x.class_id))} <small>${esc(LB('users',x.teacher_id))}</small></span>`).join('')||none}
 <h3 style="margin:14px 0 6px">Study materials</h3>${L(mt.data||[],x=>`<div class="fi"><span class="fb">${ic('folder',16)}</span><div>${x.file_url?`<a href="${esc(x.file_url)}" target="_blank" rel="noopener">${esc(x.title)}</a>`:esc(x.title)}</div></div>`)}
 <h3 style="margin:14px 0 6px">Assignments</h3>${L(as.data||[],x=>`<div class="fi"><span class="fb">${ic('file',16)}</span><div>${esc(x.title)}<small>Due ${fdate(x.deadline)} · ${x.max_marks||0} marks</small></div></div>`)}
 <h3 style="margin:14px 0 6px">Exams</h3>${L(ex.data||[],x=>`<div class="fi"><span class="fb">${ic('edit',16)}</span><div>${esc(x.name)}<small>${x.exam_date?fdate(x.exam_date):''} · ${x.max_marks||0} marks</small></div></div>`)}</div>`);
 if(m.querySelector('#dd1'))m.querySelector('#dd1').onclick=()=>dl({'Subject & Syllabus':[s],'Study Materials':mt.data||[],Assignments:as.data||[],Exams:ex.data||[],Allocation:al.data||[]},(s.code||'subject')+'_details.xlsx');
 if(W&&m.querySelector('#es'))m.querySelector('#es').onclick=()=>nav(()=>editSyllabus(s))}
function editSyllabus(s){const m=mod(`<h3>Syllabus – ${esc(s.name)}</h3><form id="sf" class="form" style="grid-template-columns:1fr">
 <div><label>Teaching hours</label><input name="teaching_hours" type="number" value="${s.teaching_hours||''}"></div><div><label>Course objectives</label><textarea name="objectives" rows="3">${esc(s.objectives||'')}</textarea></div>
 <div><label>Units (one per line)</label><textarea name="units" rows="5" placeholder="Unit 1: Introduction&#10;Unit 2: ...">${esc(s.units||'')}</textarea></div><div><label>Syllabus details</label><textarea name="syllabus_text" rows="4">${esc(s.syllabus_text||'')}</textarea></div>
 <div><label>Reference books</label><textarea name="reference_books" rows="3">${esc(s.reference_books||'')}</textarea></div><div><label>Syllabus file (PDF / Word)</label><input name="file" type="file" accept=".pdf,.doc,.docx"></div><div><button class="btn">Save syllabus</button></div></form>`);
 m.querySelector('#sf').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),v={objectives:f.get('objectives')||null,units:f.get('units')||null,syllabus_text:f.get('syllabus_text')||null,reference_books:f.get('reference_books')||null,teaching_hours:f.get('teaching_hours')?+f.get('teaching_hours'):null};
  try{const fl=f.get('file');if(fl&&fl.size)v.syllabus_url=await uploadFile('study-materials',fl);const {error}=await sb.from('subjects').update(v).eq('id',s.id);if(error)throw error;Object.assign(LK.subjects[s.id]||s,v);toast('Syllabus saved');const pv=HIST.pop();CUR=pv||(()=>drillSubject(LK.subjects[s.id]||s));CUR()}catch(x){toast(x.message+' (run 01_schema_additions.sql if a column is missing)',1)}}}
/* ---- cascading dropdowns in forms: course → class → semester → subject → student ---- */
const STAFFROLES=['college_admin','sub_admin','principal','hod','class_teacher','subject_teacher','admission_admin','examination_admin','accounts','librarian','tpo','activity_admin'];
function cascade(f){const g=n=>f.querySelector('[name='+n+']'),P=g('program_id'),D=g('department_id'),K=g('class_id')||g('from_class_id'),S=g('semester_id'),J=g('subject_id'),T=g('student_id'),E=g('exam_id');
 const all=s=>s?[...s.options].slice(1).map(o=>o.cloneNode(true)):[],O={P:all(P),K:all(K),S:all(S),J:all(J),T:all(T),E:all(E)};
 const fill=(sel,key,fn)=>{if(!sel)return;const cur=sel.value;sel.length=1;O[key].filter(fn).forEach(o=>sel.appendChild(o.cloneNode(true)));sel.value=[...sel.options].some(o=>o.value===cur)?cur:''};
 const run=()=>{const d=D?.value;if(P&&D)fill(P,'P',o=>!d||o.dataset.d===d||LK.programs?.[o.value]?.department_id===d);const p=P?.value;
  fill(K,'K',o=>{const kp=o.dataset.p||LK.classes?.[o.value]?.program_id;return (!p||kp===p)&&(!d||LK.programs?.[kp]?.department_id===d)});const k=K?.value,ky=k?String(LK.classes?.[k]?.year_number||K.selectedOptions[0]?.dataset.y||''):'';
  fill(S,'S',o=>{const m=LK.semesters?.[o.value]||{},sp=o.dataset.p||m.program_id,sy=o.dataset.y||String(m.year_number||'');return (!p||sp===p)&&(!d||LK.programs?.[sp]?.department_id===d)&&(!ky||!sy||sy===ky)});const sm=S?.value;
  fill(J,'J',o=>{const sj=LK.subjects?.[o.value]||{},sy=String(LK.semesters?.[sj.semester_id]?.year_number||'');return (!p||o.dataset.p===p||sj.program_id===p)&&(!d||(sj.department_id||LK.programs?.[sj.program_id]?.department_id)===d)&&(!sm||o.dataset.s===sm||sj.semester_id===sm)&&(!ky||!sy||sy===ky)});const j=J?.value;
  fill(T,'T',o=>{const st=LK.students?.[o.value]||{};return (!k||o.dataset.k===k||st.class_id===k)&&(!p||o.dataset.p===p||st.program_id===p)});
  fill(E,'E',o=>{const e=LK.exams?.[o.value]||{};return (!k||!e.class_id||e.class_id===k)&&(!j||e.subject_id===j)&&(!sm||!e.subject_id||LK.subjects?.[e.subject_id]?.semester_id===sm)})};
 [D,P,K,S,J].forEach(x=>x&&x.addEventListener('change',run));run()}
/* ---- assignments: closing time, download, upload ---- */
const asgClosed=r=>new Date()>new Date(r.final_cutoff||(new Date(r.deadline).getTime()+(r.grace_hours||0)*36e5));
const left=ms=>{const m=Math.floor(ms/6e4);return m>=1440?Math.floor(m/1440)+' days '+Math.floor(m%1440/60)+' hrs':m>=60?Math.floor(m/60)+' hrs '+m%60+' min':m+' min'};
async function annFilter(rows){if(['college_admin','sub_admin','principal'].includes(S.role))return rows;const my=['student','parent'].includes(S.role)?await myStudents():null,sc=await scope();
 return rows.filter(a=>{const tr=a.target_roles;if(tr&&tr.length&&!(tr.includes(S.role)||(tr.includes('staff')&&STAFFROLES.includes(S.role))))return false;
  const sm=a.semester_id&&LK.semesters?.[a.semester_id],sj=a.subject_id&&LK.subjects?.[a.subject_id];
  if(my){if(Array.isArray(a.target_student_ids)&&a.target_student_ids.length&&!a.target_student_ids.includes(S.id)&&!my.some(s=>a.target_student_ids.includes(s.id)))return false;if(a.target_department_id&&!my.some(s=>LK.programs?.[s.program_id]?.department_id===a.target_department_id))return false;if(a.program_id&&!my.some(s=>s.program_id===a.program_id))return false;if(a.class_id&&!my.some(s=>s.class_id===a.class_id))return false;
   if(a.semester_id&&!my.some(s=>s.semester_id===a.semester_id||(!s.semester_id&&sm&&sm.program_id===s.program_id)))return false;if(a.subject_id&&!my.some(s=>sj&&sj.program_id===s.program_id))return false}
  else if(!sc.all){if(a.class_id&&!sc.classes.includes(a.class_id))return false;if(a.subject_id&&!sc.subjects.includes(a.subject_id))return false;if(a.program_id&&!sc.programs.includes(a.program_id))return false}
  return true})}
async function assignDetail(r){const closed=asgClosed(r),dl0=new Date(r.final_cutoff||(new Date(r.deadline).getTime()+(r.grace_hours||0)*36e5)),isSt=S.role==='student',my=isSt?(await myStudents())[0]:null;
 const {data:subs}=await sb.from('assignment_submissions').select('*,students(full_name,roll_number)').eq('assignment_id',r.id).order('submitted_at');const mine=isSt?(subs||[]).filter(x=>x.student_id===my?.id):[];
 const st=closed?`<span class="pill s">Closed</span> since ${fdate(dl0)} ${dl0.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`:`<span class="pill">Open</span> closes ${fdate(dl0)} ${dl0.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} · ${left(dl0-new Date())} left`;
 const m=mod(`<h3>${esc(r.title)}</h3><small style="color:var(--mut)">${esc(LB('subjects',r.subject_id))} · ${esc(LB('classes',r.class_id))} · ${r.max_marks||0} marks</small><p style="margin:10px 0">${st}</p>${r.instructions?`<div style="white-space:pre-wrap;margin-bottom:10px">${esc(r.instructions)}</div>`:''}
 <div style="margin:8px 0">${r.attachment_url?`<a class="btn ghost sm" style="text-decoration:none" href="${esc(r.attachment_url)}" target="_blank" rel="noopener">⬇ Download task file</a> `:''}${isSt&&!closed?'<label class="btn sm up">⬆ Upload my work<input id="su" type="file" hidden></label>':''}</div>
 ${isSt?`<h3 style="margin:14px 0 6px">My submissions</h3>${mine.map(x=>`<div class="fi"><span class="fb">${ic('file',16)}</span><div>${(x.file_urls||[]).map((u,i)=>`<a href="${esc(u)}" target="_blank" rel="noopener">⬇ Download file ${i+1}</a>`).join(' ')}<small>${fdate(x.submitted_at)}${x.is_late?' · Late':''}${x.final_marks!=null?' · Marks '+x.final_marks+'/'+(r.max_marks||''):''}</small></div></div>`).join('')||none}`
 :`<h3 style="margin:14px 0 6px">Submissions (${(subs||[]).length})</h3><div class="tw"><table><thead><tr><th>Student</th><th>File</th><th>Late</th><th>Marks</th></tr></thead><tbody>${(subs||[]).map(d=>`<tr><td>${esc(d.students?.full_name||'')} <small>${esc(d.students?.roll_number||'')}</small></td><td>${(d.file_urls||[]).map(u=>`<a href="${esc(u)}" target="_blank" rel="noopener">⬇ Download</a>`).join(' ')}</td><td>${d.is_late?'Yes':'No'}</td><td><input type="number" step="any" style="width:80px" value="${d.final_marks??''}" data-m="${d.id}"></td></tr>`).join('')||'<tr><td colspan="4" class="empty">No submissions yet.</td></tr>'}</tbody></table></div>`}`);
 if($('#su',m))m.querySelector('#su').onchange=async e=>{const f=e.target.files[0];if(!f)return;if(asgClosed(r))return toast('Submission is closed',1);try{toast('Uploading…');const url=await uploadFile('assignments',f),{error}=await sb.from('assignment_submissions').insert({assignment_id:r.id,student_id:my.id,file_urls:[url],is_late:new Date()>new Date(r.deadline)});if(error)throw error;toast('Submitted');CUR=()=>assignDetail(r);CUR()}catch(x){toast(x.message,1)}};
 m.querySelectorAll('[data-m]').forEach(i=>i.onchange=async()=>{const {error}=await sb.from('assignment_submissions').update({final_marks:+i.value,evaluated_by:S.id,evaluated_at:new Date().toISOString()}).eq('id',i.dataset.m);toast(error?error.message:'Marks saved',!!error)})}
/* ---- bulk attendance: course → class → semester → subject ---- */
async function markAttendance(){await (LKP||loadLK());const sc=await scope(),ok=(a,k)=>sc.all||sc[k].includes(a.id);
 const progs=vals(LK.programs).filter(p=>sc.all||sc.programs.includes(p.id)),m=mod(`<h3>Mark attendance</h3><div class="form"><div><label>Course</label><select id="mp"><option value="">Select…</option>${progs.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></div><div><label>Class</label><select id="mk"></select></div><div><label>Semester</label><select id="ms"></select></div><div><label>Subject (university code)</label><select id="mj"></select></div><div><label>Date</label><input id="md" type="date" value="${new Date().toISOString().slice(0,10)}"></div></div><div id="ml" style="margin-top:14px"></div>`);
 const sel=(id,arr,f)=>$('#'+id,m).innerHTML='<option value="">Select…</option>'+arr.map(f).join('');
 const refresh=()=>{const p=$('#mp',m).value,k=$('#mk',m).value,s=$('#ms',m).value,kc=LK.classes[k];
  if(this)0;const cls=vals(LK.classes).filter(x=>x.program_id===p&&ok(x,'classes')),sems=vals(LK.semesters).filter(x=>x.program_id===p&&(!kc||!kc.year_number||x.year_number===kc.year_number)),subs=vals(LK.subjects).filter(x=>x.program_id===p&&(!s||x.semester_id===s)&&ok(x,'subjects'));return {cls,sems,subs}};
 $('#mp',m).onchange=()=>{const r=refresh();sel('mk',r.cls,x=>`<option value="${x.id}">${esc(x.name)}</option>`);sel('ms',r.sems,x=>`<option value="${x.id}">${esc(nm('semesters',x))}</option>`);sel('mj',r.subs,x=>`<option value="${x.id}">${esc(x.code)} – ${esc(x.name)}</option>`);$('#ml',m).innerHTML=''};
 $('#mk',m).onchange=()=>{const r=refresh();sel('ms',r.sems,x=>`<option value="${x.id}">${esc(nm('semesters',x))}</option>`);load()};$('#ms',m).onchange=()=>{const r=refresh();sel('mj',r.subs,x=>`<option value="${x.id}">${esc(x.code)} – ${esc(x.name)}</option>`);load()};
 function load(){const k=$('#mk',m).value,s=$('#ms',m).value;if(!k)return;const st=vals(LK.students).filter(x=>x.class_id===k&&x.status!=='alumni'&&(!s||!x.semester_id||x.semester_id===s)).sort((a,b)=>String(a.roll_number).localeCompare(b.roll_number));
  $('#ml',m).innerHTML=st.length?`<div class="bar2"><button class="btn ghost sm" id="ap">All present</button><button class="btn ghost sm" id="aa">All absent</button><span style="color:var(--mut)">${st.length} students</span></div><div class="tw"><table><thead><tr><th>Roll</th><th>Name</th><th>Present</th><th>Absent</th><th>Late</th></tr></thead><tbody>${st.map(x=>`<tr><td>${esc(x.roll_number)}</td><td>${esc(x.full_name)}</td>${['present','absent','late'].map((v,i)=>`<td><input type="radio" name="a_${x.id}" value="${v}" ${i===0?'checked':''} style="width:auto"></td>`).join('')}</tr>`).join('')}</tbody></table></div><button class="btn full" id="sv">Save attendance</button>`:'<div class="empty">No students in this class.</div>';
  if(!st.length)return;m.querySelector('#ap').onclick=()=>m.querySelectorAll('input[value=present]').forEach(i=>i.checked=true);m.querySelector('#aa').onclick=()=>m.querySelectorAll('input[value=absent]').forEach(i=>i.checked=true);
  m.querySelector('#sv').onclick=async()=>{const j=$('#mj',m).value,d=$('#md',m).value;if(!j||!d)return toast('Select the subject and date',1);
   try{await sb.from('attendance').delete().eq('class_id',k).eq('subject_id',j).eq('date',d);const rows=st.map(x=>({college_id:S.college_id,student_id:x.id,subject_id:j,class_id:k,date:d,status:m.querySelector(`input[name=a_${x.id}]:checked`).value,marked_by:S.id})),{error}=await sb.from('attendance').insert(rows);if(error)throw error;closeMdl();toast('Attendance saved for '+rows.length+' students');crud(P.attendance)}catch(x){toast(x.message,1)}}}}
/* ---- fees: structure → generate → collect → receipt ---- */
function drillFeeStruct(f){const st=vals(LK.students).filter(s=>(!f.program_id||s.program_id===f.program_id)&&(!f.class_id||s.class_id===f.class_id)&&(!f.semester_id||s.semester_id===f.semester_id));
 const m=mod(`<h3>${esc(f.title)}</h3><small style="color:var(--mut)">${esc(LB('programs',f.program_id))} · ${esc(LB('classes',f.class_id)||'All classes')} · ${esc(LB('semesters',f.semester_id)||'All semesters')} · ${esc(LB('academic_years',f.academic_year_id))}</small>
 <div class="kpis" style="margin:14px 0"><div class="kpi"><div><b>${st.length}</b><span>Students</span></div></div><div class="kpi"><div><b>₹${(+f.amount||0).toLocaleString('en-IN')}</b><span>Per student</span></div></div><div class="kpi"><div><b>₹${((+f.amount||0)*st.length).toLocaleString('en-IN')}</b><span>Total demand</span></div></div></div>
 <button class="btn" id="gf">Generate fees for these ${st.length} students</button>`);
 if(m.querySelector('#dd1'))m.querySelector('#dd1').onclick=()=>dl({'Fee structure':[f],Students:st},'fee_structure.xlsx');
 m.querySelector('#gf').onclick=async()=>{try{const {data:ex}=await sb.from('student_fees').select('student_id').eq('college_id',S.college_id).eq('title',f.title);const have=new Set((ex||[]).map(x=>x.student_id)),rows=st.filter(s=>!have.has(s.id)).map(s=>({college_id:S.college_id,student_id:s.id,academic_year_id:f.academic_year_id||s.academic_year_id,title:f.title,amount:f.amount,paid_amount:0,due_date:f.due_date,status:'pending'}));
  if(!rows.length)return toast('Fees already generated for all these students');const {error}=await sb.from('student_fees').insert(rows);if(error)throw error;toast(rows.length+' student fee records created')}catch(x){toast(x.message,1)}}}
async function drillFee(r){const {data:pay}=await sb.from('fee_payments').select('*').eq('fee_id',r.id).order('created_at'),due=Math.max(0,(+r.amount||0)-(+r.paid_amount||0)),can=['accounts','college_admin','sub_admin','principal'].includes(S.role);
 const m=mod(`<h3>${esc(r.title)}</h3><small style="color:var(--mut)">${esc(LB('students',r.student_id))} · ${esc(LB('programs',LK.students[r.student_id]?.program_id))} · ${esc(LB('classes',LK.students[r.student_id]?.class_id))}</small>
 <div class="kpis" style="margin:14px 0"><div class="kpi"><div><b>₹${(+r.amount||0).toLocaleString('en-IN')}</b><span>Total</span></div></div><div class="kpi"><div><b>₹${(+r.paid_amount||0).toLocaleString('en-IN')}</b><span>Paid</span></div></div><div class="kpi"><div><b>₹${due.toLocaleString('en-IN')}</b><span>Balance</span></div></div></div>
 ${can&&due>0?'<button class="btn" id="rp">Record payment</button> ':''}<h3 style="margin:14px 0 6px">Payments</h3>${(pay||[]).map(p=>`<div class="fi"><span class="fb">${ic('award',16)}</span><div>₹${(+p.amount).toLocaleString('en-IN')} · ${esc(p.mode||'')}<small>${fdate(p.paid_on)} · Receipt ${esc(p.receipt_no||'-')} · <a href="#" data-rc="${p.id}">⬇ Receipt (PDF)</a></small></div></div>`).join('')||none}`);
 m.querySelectorAll('[data-rc]').forEach(a=>a.onclick=e=>{e.preventDefault();const p=pay.find(x=>x.id===a.dataset.rc);pdfTable('Fee receipt '+(p.receipt_no||''),[['Receipt',[{Student:LB('students',r.student_id),Fee:r.title,'Amount paid (INR)':p.amount,'Payment mode':p.mode,Reference:p.reference||'','Paid on':p.paid_on,'Balance (INR)':Math.max(0,r.amount-r.paid_amount)}]]],'receipt_'+(p.receipt_no||p.id.slice(0,6))+'.pdf').catch(x=>toast(x.message,1))});
 if(m.querySelector('#rp'))m.querySelector('#rp').onclick=()=>nav(()=>{const m2=mod(`<h3>Record payment</h3><form id="pf2" class="form" style="grid-template-columns:1fr"><div><label>Amount (max ${due})</label><input name="a" type="number" step="any" max="${due}" value="${due}" required></div><div><label>Mode</label><select name="m"><option>Cash</option><option>UPI</option><option>Card</option><option>Bank transfer</option><option>Cheque</option></select></div><div><label>Reference / transaction no.</label><input name="r"></div><div><button class="btn">Save payment</button></div></form>`);
  m2.querySelector('#pf2').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),amt=+f.get('a');if(amt<=0||amt>due)return toast('Enter a valid amount',1);try{const rn='RC'+Date.now().toString().slice(-8),{error}=await sb.from('fee_payments').insert({college_id:S.college_id,fee_id:r.id,student_id:r.student_id,amount:amt,mode:f.get('m'),reference:f.get('r')||null,received_by:S.id,receipt_no:rn});if(error)throw error;
   const np=(+r.paid_amount||0)+amt,{error:e2}=await sb.from('student_fees').update({paid_amount:np,status:np>=r.amount?'paid':'partial'}).eq('id',r.id);if(e2)throw e2;r.paid_amount=np;toast('Payment recorded – receipt '+rn);const pv=HIST.pop();CUR=()=>drillFee(r);CUR()}catch(x){toast(x.message,1)}}})}
/* ---- card + table explorer for every data page: year → course → class → semester ---- */
const FLAT=['academic_years','departments','announcements','clubs','competitions','library_books','programs','colleges','tpo_records'];
function ctxOf(c,r){const L=LK;let y=r.academic_year_id,p=r.program_id,k=r.class_id||r.from_class_id,sm=r.semester_id;const s=r.student_id&&L.students?.[r.student_id],ex=r.exam_id&&L.exams?.[r.exam_id],sub=(r.subject_id&&L.subjects?.[r.subject_id])||(ex&&L.subjects?.[ex.subject_id]);
 if(c.t==='classes')k=r.id;if(c.t==='semesters')sm=r.id;if(c.t==='programs')p=r.id;if(ex){y=y||ex.academic_year_id;k=k||ex.class_id}if(s){y=y||s.academic_year_id;p=p||s.program_id;k=k||s.class_id;sm=sm||s.semester_id}if(sub){p=p||sub.program_id;sm=sm||sub.semester_id}
 let sem=sm&&L.semesters?.[sm];if(sem)p=p||sem.program_id;
 if(!k&&sem&&c.t!=='semesters'&&c.t!=='programs'){const act=Object.values(L.academic_years||{}).find(x=>x.is_active);const m=Object.values(L.classes||{}).find(x=>x.program_id===sem.program_id&&x.year_number===sem.year_number&&(!act||x.academic_year_id===act.id));if(m)k=m.id}
 const cl=k&&L.classes?.[k];if(cl){p=p||cl.program_id;y=y||cl.academic_year_id}
 const d=r.department_id||(c.t==='departments'?r.id:'')||L.programs?.[p]?.department_id||(sub&&sub.department_id)||'';
 const pc=L.programs?.[p]?.code||L.programs?.[p]?.name||'';
 return {y,p,k,sm,d,g2:cl?clsName(cl.name):sem?(pc?pc+' - ':'')+(YRS[sem.year_number]||'Year '+sem.year_number):'General',g3:sem?nm('semesters',sem):'All semesters'}}
const titleOf=(c,r,refs)=>{if(c.t==='semesters')return[nm('semesters',r),''];for(const k of['full_name','name','title'])if(r[k])return[r[k],k];const f=c.f.find(f=>f.ref&&r[f.k]&&valOf(f,r,refs));return f?[valOf(f,r,refs),f.k]:[human(c.t).replace(/s$/,''),''] };
function valOf(f,r,refs){if(f.ref){const o=refs[f.k]?.find(x=>x.id===r[f.k]);return o?nm(f.ref,o):LB(LKMAP[f.k]||f.ref,r[f.k])}return cell(f.k,r[f.k])}
const PAL=['#6366F1','#06B6D4','#10B981','#F59E0B','#F43F5E','#8B5CF6','#0EA5E9','#84CC16'];
function chartsFor(c,idx,rows,X){const by=(fn,val)=>{const o={};idx.forEach(i=>{const k=fn(i)||'General';(o[k]=o[k]||[]).push(val(rows[i]))});return o},avg=a=>Math.round(a.reduce((x,y)=>x+y,0)/a.length*10)/10,cnt=o=>Object.fromEntries(Object.entries(o).map(([k,a])=>[k,a.length])),
  bar=(t,o,f=avg,type='bar')=>({t,type,labels:Object.keys(o),sets:[{label:t,data:Object.values(o).map(f)}]}),pie=(t,o)=>({t,type:'doughnut',labels:Object.keys(o),sets:[{data:Object.values(o)}]});
 const T=c.t;
 if(T==='attendance'){const v=r=>r.status==='present'||r.status==='late'?100:0;return[bar('Attendance % by class',by(i=>X[i].g2,v)),bar('Attendance % by semester',by(i=>X[i].g3,v)),bar('Attendance % by subject',by(i=>LB('subjects',rows[i].subject_id),v))]}
 if(T==='internal_marks'){const v=r=>r.max_marks?r.marks/r.max_marks*100:0;return[bar('Average internal marks % by subject',by(i=>LB('subjects',rows[i].subject_id),v)),bar('Average internal marks % by class',by(i=>X[i].g2,v))]}
 if(T==='exam_results'){const v=r=>{const m=LK.exams[r.exam_id]?.max_marks;return m?r.marks_obtained/m*100:0};return[bar('Average marks % by class',by(i=>X[i].g2,v)),pie('Result status',cnt(by(i=>cell('status',rows[i].status||'entered'),r=>1)))]}
 if(T==='academic_progression')return[pie('Result status',cnt(by(i=>rows[i].status,r=>1))),bar('Students by class',cnt(by(i=>X[i].g2,r=>1)),x=>x)];
 if(T==='student_fees'){const o=by(i=>X[i].g2,r=>[+r.paid_amount||0,Math.max(0,(+r.amount||0)-(+r.paid_amount||0))]);return[{t:'Fees collected vs pending by class',type:'bar',stack:1,labels:Object.keys(o),sets:[{label:'Collected',data:Object.values(o).map(a=>a.reduce((x,y)=>x+y[0],0))},{label:'Pending',data:Object.values(o).map(a=>a.reduce((x,y)=>x+y[1],0))}]},pie('Fee status',cnt(by(i=>cell('status',rows[i].status||'pending'),r=>1)))]}
 if(T==='placements')return[pie('Placement status',cnt(by(i=>cell('status',rows[i].status),r=>1))),bar('Students by company',cnt(by(i=>rows[i].company,r=>1)),x=>x)];
 if(T==='tpo_records')return[pie('Records by type',cnt(by(i=>rows[i].type,r=>1))),pie('Status',cnt(by(i=>cell('status',rows[i].status||'planned'),r=>1)))];
 if(T==='students')return[bar('Students per class',cnt(by(i=>X[i].g2,r=>1)),x=>x),bar('Students per semester',cnt(by(i=>X[i].g3,r=>1)),x=>x)];
 if(T==='promotions')return[pie('Promotion & completion',cnt(by(i=>cell('status',rows[i].status),r=>1)))];
 if(T==='assignments'||T==='study_materials'||T==='quizzes')return[bar('Items per subject',cnt(by(i=>LB('subjects',rows[i].subject_id),r=>1)),x=>x)];
 return[]}
/* ---- timetable: one proper weekly grid per class (periods × days) ---- */
const DAY3=d=>{const t=String(d||'').trim().slice(0,3).toLowerCase();return {mon:'Mon',tue:'Tue',wed:'Wed',thu:'Thu',fri:'Fri',sat:'Sat',sun:'Sun'}[t]||String(d||'')};
const HM=t=>String(t||'').slice(0,5);
function ttGrid(rs){if(!rs.length)return '<div class="empty">No periods in this timetable yet.</div>';
 const byC={};rs.forEach(r=>{(byC[r.class_id||'']=byC[r.class_id||'']||[]).push(r)});
 return Object.entries(byC).sort((a,b)=>LB('classes',a[0]).localeCompare(LB('classes',b[0]))).map(([cid,list])=>{
  const days=['Mon','Tue','Wed','Thu','Fri','Sat'].filter(d=>d!=='Sat'||list.some(r=>DAY3(r.day)==='Sat'));
  const slots=[...new Set(list.map(r=>HM(r.start_time)+'|'+HM(r.end_time)))].sort();
  const cl=LK.classes?.[cid],sem=list.find(r=>r.semester_id)?.semester_id;
  return `<div class="panel tt-card"><div class="phd"><h3>${ic('calendar',18)} ${esc(cid?LB('classes',cid):'Unassigned class')}</h3><span class="pill n">${esc([LB('programs',cl?.program_id),sem?LB('semesters',sem):'',cl?LB('academic_years',cl.academic_year_id):''].filter(Boolean).join(' · '))}</span></div>
  <div class="tw"><table class="tt"><thead><tr><th>Time</th>${days.map(d=>`<th>${d}</th>`).join('')}</tr></thead><tbody>${slots.map(sl=>{const [a,b]=sl.split('|');return `<tr><th class="tt-t">${a}<small>${b}</small></th>${days.map(d=>{const cell=list.filter(r=>DAY3(r.day)===d&&HM(r.start_time)===a&&HM(r.end_time)===b);
   return `<td>${cell.map(r=>`<div class="tt-c"><b>${esc(LB('subjects',r.subject_id)||'—')}</b><small>${esc(LK.subjects?.[r.subject_id]?.code||'')}</small><small>${esc(r.teacher_id?LB('users',r.teacher_id):'')}${r.room?' · '+esc(r.room):''}</small></div>`).join('')||'<span class="tt-free">—</span>'}</td>`}).join('')}</tr>`}).join('')}</tbody></table></div></div>`}).join('')}

/* ---- attendance: classic register (students × dates) for a class, subject and month — fetched straight from the database ---- */
const clsSubjects=k=>{const cl=LK.classes?.[k];if(!cl)return [];return vals(LK.subjects).filter(x=>x.program_id===cl.program_id&&LK.semesters?.[x.semester_id]?.year_number===cl.year_number).sort((a,b)=>String(a.code).localeCompare(String(b.code)))};
async function attFetch(fk,fj,fm){const sj=fj?[fj]:clsSubjects(fk).map(x=>x.id),from=fm+'-01',to=new Date(+fm.slice(0,4),+fm.slice(5,7),1).toISOString().slice(0,10),out=[];
 for(const id of sj){const {data,error}=await sb.from('attendance').select('student_id,subject_id,date,status').eq('class_id',fk).eq('subject_id',id).gte('date',from).lt('date',to).limit(1000);if(error)throw error;out.push(...(data||[]))}return out}
async function attSummary(){const ks=vals(LK.classes).filter(k=>LK.academic_years?.[k.academic_year_id]?.is_active).sort((a,b)=>clsName(a.name).localeCompare(clsName(b.name)));
 const C=(k,st)=>{let q=sb.from('attendance').select('id',{count:'exact',head:true}).eq('class_id',k.id);if(st)q=q.in('status',st);return q.then(r=>r.count||0)};
 const rs=await Promise.all(ks.map(k=>Promise.all([C(k),C(k,['present','late'])])));
 return `<div class="panel"><div class="phd"><h3>Attendance summary by class</h3><small style="color:var(--mut)">Click a class (or pick department, course and class above) to open its register.</small></div><div class="tw"><table><thead><tr><th>Class</th><th>Department</th><th>Course</th><th>Students</th><th>Lectures marked</th><th>Attendance %</th></tr></thead><tbody>${ks.map((k,i)=>{const [t,p]=rs[i];return t?`<tr class="clk" data-pick="${k.id}"><td><b>${esc(clsName(k.name))}</b></td><td>${esc(LB('departments',LK.programs?.[k.program_id]?.department_id))}</td><td>${esc(LB('programs',k.program_id))}</td><td>${vals(LK.students).filter(s=>s.class_id===k.id).length}</td><td>${t.toLocaleString('en-IN')}</td><td><b style="color:${p/t<.75?'var(--bad)':'var(--ok)'}">${Math.round(p/t*100)}%</b></td></tr>`:''}).join('')||'<tr><td colspan="6" class="empty">No attendance marked yet.</td></tr>'}</tbody></table></div></div>`}
function attRegister(rs,fk,fj,fm){
 const st=vals(LK.students).filter(s=>s.class_id===fk).sort((a,b)=>String(a.roll_number).localeCompare(String(b.roll_number)));
 const dates=[...new Set(rs.map(r=>String(r.date).slice(0,10)))].sort(),M={};rs.forEach(r=>{const d=String(r.date).slice(0,10);(M[r.student_id]=M[r.student_id]||{})[d]=(M[r.student_id][d]||'')+r.status[0].toUpperCase()});
 const lab=x=>x?x.split('').map(ch=>`<span class="ar ar-${ch}">${ch}</span>`).join(''):'<span class="ar ar-n">·</span>';
 return `<div class="panel"><div class="phd"><h3>Attendance register — ${esc(LB('classes',fk))}</h3><span class="pill n">${esc(fj?LB('subjects',fj):'All subjects')} · ${esc(fm?MON[+fm.slice(5,7)-1]+' '+fm.slice(0,4):'')}</span></div>
 <div class="ar-key"><span class="ar ar-P">P</span> Present <span class="ar ar-A">A</span> Absent <span class="ar ar-L">L</span> Late <span class="ar ar-E">E</span> Excused · % counts present + late</div>
 <div class="tw reg"><table><thead><tr><th class="sticky">Roll no.</th><th class="sticky2">Student</th>${dates.map(d=>`<th class="dt">${d.slice(8,10)}<small>${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(d).getDay()]}</small></th>`).join('')}<th>Present</th><th>Total</th><th>%</th></tr></thead><tbody>
 ${st.map(s=>{const m=M[s.id]||{},tot=dates.reduce((n,d)=>n+(m[d]||'').length,0),pr=dates.reduce((n,d)=>n+((m[d]||'').match(/[PL]/g)||[]).length,0),pc=tot?Math.round(pr/tot*100):null;
  return `<tr><td class="sticky">${esc(s.roll_number)}</td><td class="sticky2">${esc(s.full_name)}</td>${dates.map(d=>`<td class="dt">${lab(m[d])}</td>`).join('')}<td>${pr}</td><td>${tot}</td><td>${pc==null?'—':`<b style="color:${pc<75?'var(--bad)':'var(--ok)'}">${pc}%</b>`}</td></tr>`}).join('')||`<tr><td colspan="${dates.length+5}" class="empty">No students in this class.</td></tr>`}
 </tbody></table></div>${dates.length?'':'<div class="empty">No attendance recorded for this class, subject and month.</div>'}</div>`}

/* ---- generic Department → Course → Class → Semester flow (cards per level, then the list) ---- */
const FLOWCFG={internal_marks:{lv:['d','p','k','s'],end:'marks'},exam_results:{lv:['d','p','k','s'],end:'marks'},
 students:{lv:['d','p','k'],end:'list'},parent_student_links:{lv:['d','p','k'],end:'list'},parent_links:{lv:['d','p','k'],end:'list'},
 study_materials:{lv:['d','p','k','s'],end:'cards'},assignments:{lv:['d','p','k','s'],end:'cards'},exams:{lv:['d','p','k','s'],end:'list'},
 academic_progression:{lv:['d','p','k','s'],end:'list'},promotions:{lv:['d','p','k'],end:'list'},certificates:{lv:['d','p','k'],end:'list'},
 fee_structures:{lv:['d','p','k','s'],end:'list'},student_fees:{lv:['d','p','k','s'],end:'list'},fee_payments:{lv:['d','p','k','s'],end:'list'},
 placements:{lv:['d','p','k'],end:'list'},classes:{lv:['d','p','k'],end:'class'},subjects:{lv:['d','p','k','s'],end:'cards'},subject_assignments:{lv:['d','p','k','s'],end:'list'}};
const LVK={d:'fd',p:'fp',k:'fk',s:'fs'},LVX={d:'d',p:'p',k:'k',s:'sm'},LVT={d:'departments',p:'programs',k:'classes',s:'semesters'};
function flowView(c,rows,X,v,st,set,staffW,card,refs){
 const cfg=FLOWCFG[c.t]||{lv:['d','p','k','s'],end:'list'};let cur=v,lvl=null;
 for(const L of cfg.lv){if(st[LVK[L]])continue;const keys=new Set(cur.map(i=>X[i][LVX[L]]||''));if(keys.size<=1)continue;lvl=L;break}
 const crumbs=[['All departments',{fd:'',fp:'',fk:'',fs:''}]];if(st.fd)crumbs.push([LB('departments',st.fd),{fp:'',fk:'',fs:''}]);if(st.fp)crumbs.push([LB('programs',st.fp),{fk:'',fs:''}]);if(st.fk)crumbs.push([LB('classes',st.fk),{fs:''}]);if(st.fs)crumbs.push([LB('semesters',st.fs),{}]);
 const bc=`<div class="crumbs">${crumbs.map(([t],i)=>i<crumbs.length-1?`<a href="#" data-cr="${i}">${esc(t)}</a>`:`<b>${esc(t)}</b>`).join('<span>›</span>')}</div>`;
 const bindCr=w=>w.querySelectorAll('[data-cr]').forEach(a=>a.onclick=e=>{e.preventDefault();set(crumbs[+a.dataset.cr][1])});
 const pctOf=r=>c.t==='internal_marks'?(r.max_marks?r.marks/r.max_marks*100:null):c.t==='exam_results'?(LK.exams?.[r.exam_id]?.max_marks?r.marks_obtained/LK.exams[r.exam_id].max_marks*100:null):null;
 if(lvl){const key=LVX[lvl],g={};cur.forEach(i=>{(g[X[i][key]||'']=g[X[i][key]||'']||[]).push(i)});
  const name=id=>id?LB(LVT[lvl],id)||'—':'Not linked',sub=id=>({d:'Department',p:(LK.programs?.[id]?.level||'')+' course',k:'Class · AY '+(LB('academic_years',LK.classes?.[id]?.academic_year_id)||''),s:'Semester'}[lvl]);
  const body=`<div class="flow-grid">${Object.entries(g).sort((a,b)=>name(a[0]).localeCompare(name(b[0]),undefined,{numeric:true})).map(([id,is])=>{const ps=is.map(i=>pctOf(rows[i])).filter(x=>x!=null),avg=ps.length?Math.round(ps.reduce((a,b)=>a+b,0)/ps.length):null,stu=new Set(is.map(i=>rows[i].student_id).filter(Boolean)).size,pend=c.t==='exam_results'?is.filter(i=>rows[i].status!=='approved').length:0,amt=['student_fees','fee_payments','fee_structures'].includes(c.t)?is.reduce((n,i)=>n+(+rows[i].amount||0),0):null;
   return `<button class="flow-card" data-go="${id}"><small>${esc(sub(id))}</small><b>${esc(name(id))}</b><div class="fc-s">${stu?`<span><i>${stu}</i> students</span>`:''}<span><i>${is.length}</i> ${c.t==='students'?'students':'records'}</span>${avg!=null?`<span><i>${avg}%</i> average</span>`:''}${amt!=null?`<span><i>₹${Math.round(amt).toLocaleString('en-IN')}</i></span>`:''}</div>${pend?`<span class="pill w">${pend} awaiting approval</span>`:''}<em>Open ${ic('chev',12)}</em></button>`}).join('')}</div>`;
  return {html:bc+body,bind:w=>{bindCr(w);w.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{const id=b.dataset.go;if(!id)return toast('These records are not linked to a '+({d:'department',p:'course',k:'class',s:'semester'}[lvl])+' yet. Open the Table view to fix them.',1);set({[LVK[lvl]]:id})})}}}
 const list=cur.map(i=>rows[i]),title=[st.fk?LB('classes',st.fk):st.fp?LB('programs',st.fp):st.fd?LB('departments',st.fd):'All',st.fs?LB('semesters',st.fs):''].filter(Boolean).join(' · ');
 if(cfg.end==='marks'){const ex=c.t==='exam_results',pend=list.filter(r=>r.status!=='approved');
  list.sort((a,b)=>String(LK.students?.[a.student_id]?.roll_number).localeCompare(String(LK.students?.[b.student_id]?.roll_number))||String(LB('subjects',a.subject_id||LK.exams?.[a.exam_id]?.subject_id)).localeCompare(String(LB('subjects',b.subject_id||LK.exams?.[b.exam_id]?.subject_id))));
  const body=`<div class="panel"><div class="phd"><h3>${esc(title)}</h3><div style="display:flex;gap:8px;align-items:center"><span class="pill n">${list.length} entries</span>${ex&&staffW&&pend.length?`<button class="btn sm" id="apall">✓ Approve &amp; publish ${pend.length}</button>`:''}</div></div>
  <div class="tw"><table><thead><tr><th>Roll no.</th><th>Student</th>${ex?'<th>Exam</th>':''}<th>Subject</th><th>Marks</th><th>Out of</th><th>%</th>${ex?'<th>Grade</th><th>Status</th>':''}${staffW?'<th></th>':''}</tr></thead><tbody>
  ${list.map(r=>{const s=LK.students?.[r.student_id]||{},e=LK.exams?.[r.exam_id],mx=ex?e?.max_marks:r.max_marks,mk=ex?r.marks_obtained:r.marks,pc=pctOf(r);
   return `<tr><td>${esc(s.roll_number||'')}</td><td>${esc(s.full_name||'')}</td>${ex?`<td>${esc(String(e?.name||'').split(' — ')[0])}</td>`:''}<td>${esc(LB('subjects',r.subject_id||e?.subject_id))}</td><td><b>${mk??'—'}</b></td><td>${mx??'—'}</td><td>${pc==null?'—':`<span style="color:${pc<40?'var(--bad)':'inherit'}">${Math.round(pc)}%</span>`}</td>${ex?`<td>${esc(r.grade||'')}</td><td><span class="pill ${r.status==='approved'?'':r.status==='verified'?'n':'w'}">${esc(cell('status',r.status||'entered'))}</span></td>`:''}${staffW?`<td><button class="btn ghost sm" data-fe="${r.id}">Edit</button></td>`:''}</tr>`}).join('')||'<tr><td colspan="10" class="empty">No marks here.</td></tr>'}</tbody></table></div></div>`;
  return {html:bc+body,bind:w=>{bindCr(w);w.querySelectorAll('[data-fe]').forEach(b=>b.onclick=()=>{const r=rows.find(x=>x.id===b.dataset.fe);if(r&&window.__crudEdit)window.__crudEdit(r)});
   const ap=w.querySelector('#apall');if(ap)ap.onclick=async()=>{if(!confirm(`Approve and publish ${pend.length} marks entries?`))return;ap.disabled=true;const {error}=await sb.from('exam_results').update({status:'approved',is_published:true}).in('id',pend.map(r=>r.id));if(error){ap.disabled=false;return toast(error.message,1)}toast('Marks approved and published');afterWrite(window.__lastCrud)}}}}
 if(cfg.end==='cards')return {html:bc+`<div class="phd" style="margin:4px 0 12px"><h3>${esc(title)}</h3><span class="pill n">${list.length}</span></div>`+(list.length?`<div class="grid">${cur.map(card).join('')}</div>`:'<div class="panel empty">Nothing here yet.</div>'),bind:w=>{bindCr(w);w.querySelectorAll('[data-i]').forEach(d=>d.onclick=()=>nav(()=>detail(c,rows[+d.dataset.i],refs)))}};
 if(cfg.end==='class'&&st.fk){const k=st.fk,cl=LK.classes?.[k]||{},stu=vals(LK.students).filter(s=>s.class_id===k).sort((a,b)=>String(a.roll_number).localeCompare(String(b.roll_number))),r0=rows.find(r=>r.id===k);
  return {html:bc+`<div id="clsprof"><div class="panel"><div class="skel"><div class="sk"></div></div></div></div>`,bind:async w=>{bindCr(w);
   const [{data:al},{data:tt}]=await Promise.all([sb.from('subject_assignments').select('subject_id,teacher_id').eq('class_id',k),sb.from('timetable').select('subject_id').eq('class_id',k)]);
   const per={};(tt||[]).forEach(t=>per[t.subject_id]=(per[t.subject_id]||0)+1);const sem=vals(LK.semesters).filter(s=>s.program_id===cl.program_id&&s.year_number===cl.year_number).sort((a,b)=>a.semester_number-b.semester_number);
   const subj=vals(LK.subjects).filter(x=>sem.some(s=>s.id===x.semester_id)).sort((a,b)=>String(a.code).localeCompare(String(b.code)));
   const A=Object.fromEntries((al||[]).map(a=>[a.subject_id,a.teacher_id]));
   const el=w.querySelector('#clsprof');if(!el)return;el.innerHTML=`<div class="panel"><div class="phd"><h3>${ic('building',18)} ${esc(clsName(cl.name))}</h3>${staffW&&r0&&window.__crudEdit?'<button class="btn ghost sm" id="clsed">Edit class</button>':''}</div>
   <div class="pc-grid"><div><small>Department</small><b>${esc(LB('departments',LK.programs?.[cl.program_id]?.department_id))}</b></div><div><small>Course</small><b>${esc(LB('programs',cl.program_id))}</b></div><div><small>Academic year</small><b>${esc(LB('academic_years',cl.academic_year_id))}</b></div><div><small>Class teacher</small><b>${esc(cl.class_teacher_id?LB('users',cl.class_teacher_id):'Not assigned')}</b></div><div><small>Students</small><b>${stu.length}</b></div><div><small>Semesters</small><b>${sem.map(s=>s.name).join(', ')||'—'}</b></div></div></div>
   <div class="panel"><div class="phd"><h3>Subjects</h3><span class="pill n">${subj.length}</span></div><div class="tw"><table><thead><tr><th>Code</th><th>Subject</th><th>Semester</th><th>Credits</th><th>Teacher</th><th>Periods / week</th><th>Syllabus</th></tr></thead><tbody>${subj.map(x=>`<tr><td>${esc(x.code)}</td><td><b>${esc(x.name)}</b></td><td>${esc(LB('semesters',x.semester_id))}</td><td>${x.credits??'—'}</td><td>${esc(A[x.id]?LB('users',A[x.id]):'Not allocated')}</td><td>${per[x.id]||'—'}</td><td>${x.syllabus_url?`<a href="${esc(x.syllabus_url)}" target="_blank">Open</a> <button class="btn ghost sm" data-dl="${esc(x.syllabus_url)}">⬇</button>`:'—'}</td></tr>`).join('')||'<tr><td colspan="7" class="empty">No subjects yet.</td></tr>'}</tbody></table></div></div>
   <div class="panel"><div class="phd"><h3>Students</h3><div style="display:flex;gap:8px"><span class="pill n">${stu.length}</span><button class="btn ghost sm" id="clx">⬇ Excel</button><button class="btn ghost sm" id="clp">⬇ PDF</button></div></div><div class="tw"><table><thead><tr><th></th><th>Roll no.</th><th>Name</th><th>Semester</th><th>Email</th><th>Mobile</th><th>Parent mobile</th><th>Status</th></tr></thead><tbody>${stu.map(s=>`<tr class="clk" data-st="${s.id}"><td>${s.photo_url?`<img src="${esc(s.photo_url)}" class="av28" alt="">`:''}</td><td>${esc(s.roll_number)}</td><td><b>${esc(s.full_name)}</b></td><td>${esc(LB('semesters',s.semester_id))}</td><td>${esc(s.email||'')}</td><td>${esc(s.mobile||'')}</td><td>${esc(s.parent_mobile||'')}</td><td>${esc(s.status||'')}</td></tr>`).join('')||'<tr><td colspan="8" class="empty">No students in this class.</td></tr>'}</tbody></table></div></div>`;
   const sx=stu.map(s=>({'Roll no.':s.roll_number,Name:s.full_name,Semester:LB('semesters',s.semester_id),Email:s.email,Mobile:s.mobile,'Parent mobile':s.parent_mobile,Status:s.status}));
   el.querySelector('#clx').onclick=()=>dl({[clsName(cl.name)]:Object.assign(sx,{__raw:1})},'students_'+clsName(cl.name).replace(/\W+/g,'_')+'.xlsx');el.querySelector('#clp').onclick=()=>pdfTable('Students — '+clsName(cl.name),[[clsName(cl.name),Object.assign(sx,{__raw:1})]],'students_'+clsName(cl.name).replace(/\W+/g,'_')+'.pdf');
   el.querySelectorAll('[data-st]').forEach(tr=>tr.onclick=()=>{if(typeof drillStudent==='function')nav(()=>drillStudent(LK.students[tr.dataset.st]))});
   const ed=el.querySelector('#clsed');if(ed)ed.onclick=()=>window.__crudEdit(r0)}}}
 // list
 const cols=c.f.filter(f=>!f.h&&f.type!=='textarea'&&f.k!=='audience'&&!f.ui&&f.type!=='file').slice(0,8),files=c.f.filter(f=>f.type==='file');
 const body=`<div class="panel"><div class="phd"><h3>${esc(title)}</h3><span class="pill n">${list.length} ${c.t==='students'?'students':'records'}</span></div><div class="tw"><table><thead><tr>${c.t==='students'?'<th></th>':''}${cols.map(f=>`<th>${esc(f.l||human(f.k))}</th>`).join('')}${files.length?'<th>Files</th>':''}${staffW?'<th></th>':''}</tr></thead><tbody>
 ${cur.map(i=>{const r=rows[i];return `<tr class="clk" data-i="${i}">${c.t==='students'?`<td>${r.photo_url?`<img src="${esc(r.photo_url)}" class="av28" alt="">`:''}</td>`:''}${cols.map(f=>`<td>${esc(String(valOf(f,r,refs)??'').slice(0,60))}</td>`).join('')}${files.length?`<td>${files.filter(f=>r[f.k]).map(f=>`<a href="${esc(r[f.k])}" target="_blank" onclick="event.stopPropagation()">Open</a> <button class="btn ghost sm" data-dl="${esc(r[f.k])}">⬇</button>`).join(' ')||'—'}</td>`:''}${staffW?`<td style="white-space:nowrap"><button class="btn ghost sm" data-ce="${i}">Edit</button> <button class="btn red sm" data-cx="${i}">Delete</button></td>`:''}</tr>`}).join('')||'<tr><td colspan="12" class="empty">No records here.</td></tr>'}</tbody></table></div></div>`;
 return {html:bc+body,bind:w=>{bindCr(w);w.querySelectorAll('[data-i]').forEach(d=>d.onclick=()=>nav(()=>c.t==='students'&&typeof drillStudent==='function'?drillStudent(rows[+d.dataset.i]):detail(c,rows[+d.dataset.i],refs)));
  w.querySelectorAll('[data-ce]').forEach(b=>b.onclick=e=>{e.stopPropagation();window.__crudEdit(rows[+b.dataset.ce])});w.querySelectorAll('[data-cx]').forEach(b=>b.onclick=e=>{e.stopPropagation();window.__crudDel(rows[+b.dataset.cx])})}}}

const TABLE_ONLY=['attendance','timetable'];
async function explore(c){if(!c.t||document.getElementById('cv'))return;try{await (LKP||loadLK())}catch(e){}
 const rows=window.__rows||[],refs=window.__refs||{},panel=[...document.querySelectorAll('#view .panel')].pop();if(!panel)return;
 let clubApproved={};if(c.t==='clubs'&&rows.length){const {data:ce,error:ceErr}=await sb.from('club_enrollments').select('club_id,status').eq('college_id',S.college_id);if(ceErr)throw ceErr;(ce||[]).forEach(x=>{if(x.status==='approved')clubApproved[x.club_id]=(clubApproved[x.club_id]||0)+1})}
 const clubSeatBadge=r=>{if(c.t!=='clubs')return '';const cap=r.capacity==null||r.capacity===''?null:Number(r.capacity),used=clubApproved[r.id]||0,left=cap===null?null:Math.max(0,cap-used),tag=left===null?'Seats available':left===0?'Full':left<=3?'Few seats left':'Seats available',cls=left===null||left>3?'':'seat-'+(left===0?'full':'few');return `<div class="club-seat ${cls}">${left===null?`${used} enrolled · No limit`:`${left} / ${cap} seats available`} <span>${tag}</span></div>`};
 const X=rows.map(r=>ctxOf(c,r)),flat=FLAT.includes(c.t),tOnly=TABLE_ONLY.includes(c.t),isFlow=!!FLOWCFG[c.t],scAll=(await scope()).all,act=Object.values(LK.academic_years||{}).find(y=>y.is_active),ys=[...new Set(X.map(x=>x.y).filter(Boolean))],hasY=ys.length>0;
 const F={fy:act&&ys.includes(act.id)?act.id:'',fd:'',fp:'',fk:'',fs:'',fj:'',fm:''};let mode=c.t==='timetable'?'w':c.t==='attendance'?'r':isFlow?'f':'c',customStatus='',customType='',customDept='',customCompany='',customRole='',customFrom='',customTo='';
 const isStu=['student','parent'].includes(S.role);
 if(isStu){const me=(await myStudents())[0];if(me){F.fk=c.t==='attendance'||c.t==='timetable'?me.class_id||'':''}}
 const tf=c.f.filter(f=>!f.h&&f.type!=='textarea'&&f.type!=='file'&&f.k!=='audience'),staffW=!isStu&&canWrite(c.t),wrap=document.createElement('div');wrap.id='cv';
 const segs=c.t==='timetable'?[['w','calendar','Weekly timetable'],['t','list','Period list']]:c.t==='attendance'?[['r','checksq','Register'],['t','list','Records']]:isFlow?[['f','layers','Department → Course → Class'+(FLOWCFG[c.t].lv.includes('s')?' → Semester':'')],['t','list','Table']]:[['c','grid','Cards'],['t','list','Table']];
 wrap.innerHTML=`<div class="bar2 xbar" style="justify-content:space-between"><div class="seg" style="margin:0">${segs.map(([m,i,t])=>`<button data-m="${m}" class="${m===mode?'on':''}">${ic(i,16)} ${t}</button>`).join('')}</div>
 <div class="bar2 fbar" style="margin:0">${hasY?'<select id="fy"></select>':''}${!flat?'<select id="fd"></select><select id="fp"></select><select id="fk"></select><select id="fs"></select>':''}${c.t==='attendance'?'<select id="fj"></select><input id="fm" type="month" title="Month">':''}${c.t==='student_fees'?'<select id="feeFilter"><option value="">All fees</option><option value="paid">Paid fees</option><option value="unpaid">Unpaid fees</option></select>':''}${c.t==='activity_marks'?'<select id="activityFilter"></select>':''}${c.t==='placements'?'<input id="placementCompany" placeholder="Company"><input id="placementRole" placeholder="Job role"><select id="placementStatus"><option value="">All statuses</option><option>applied</option><option>shortlisted</option><option>selected</option><option>rejected</option></select><input id="placementFrom" type="date" title="From date"><input id="placementTo" type="date" title="To date">':''}</div></div>
 <div class="bar2 abar">${c.t==='attendance'&&staffW?'<button class="btn sm" id="ma">✓ Mark attendance</button>':''}${staffW&&$('#up')?'<button class="btn ghost sm" id="xu">⬆ Upload sheet</button><button class="btn ghost sm" id="xt">📄 Template</button>':''}${staffW&&$('#rimp')?'<button class="btn sm" id="xr">📊 Import university result</button>':''}${expBtns(c.t)}</div>
 <div id="chp" class="chp"></div><div id="cg"></div><div id="cn" style="color:var(--mut);margin:6px 0 14px"></div>`;
 panel.before(wrap);let charts=[];
 const opt=(a,all)=>`<option value="">${all}</option>`+a.map(([v,t])=>`<option value="${v}">${esc(t)}</option>`).join('');
 const uniq=a=>[...new Set(a.filter(Boolean))],semLbl=id=>{const s=LK.semesters?.[id];return s?(F.fp?'':((LK.programs?.[s.program_id]?.code||'')+' · '))+nm('semesters',s):'—'};
 function fillFilters(){window.__flt={...F};if(hasY){$('#fy').innerHTML=opt(ys.map(id=>[id,'AY '+LB('academic_years',id)]),'All academic years');$('#fy').value=F.fy}
  if(flat)return;const b1=X.filter(x=>!F.fy||!x.y||x.y===F.fy),act2=F.fy||act?.id;
  const ds=scAll?uniq([...vals(LK.departments).map(d=>d.id),...b1.map(x=>x.d)]):uniq(b1.map(x=>x.d));if(!ds.includes(F.fd))F.fd='';
  const ps=(scAll?uniq([...vals(LK.programs).map(p=>p.id),...b1.map(x=>x.p)]):uniq(b1.map(x=>x.p))).filter(id=>!F.fd||LK.programs?.[id]?.department_id===F.fd);if(!ps.includes(F.fp))F.fp='';
  const ks=(scAll?uniq([...vals(LK.classes).filter(k=>!act2||k.academic_year_id===act2).map(k=>k.id),...b1.map(x=>x.k)]):uniq(b1.map(x=>x.k))).filter(id=>{const k=LK.classes?.[id];return k&&(!F.fp||k.program_id===F.fp)&&(!F.fd||LK.programs?.[k.program_id]?.department_id===F.fd)}).sort((a,b)=>LB('classes',a).localeCompare(LB('classes',b)));if(!ks.includes(F.fk))F.fk='';
  const kc=F.fk&&LK.classes?.[F.fk];
  const ss=uniq([...vals(LK.semesters).map(x=>x.id),...b1.map(x=>x.sm)]).filter(id=>{const m=LK.semesters?.[id];return m&&(!F.fp||m.program_id===F.fp)&&(!F.fd||LK.programs?.[m.program_id]?.department_id===F.fd)&&(!kc||(m.program_id===kc.program_id&&m.year_number===kc.year_number))}).sort((a,b)=>String(LK.programs?.[LK.semesters[a].program_id]?.code).localeCompare(String(LK.programs?.[LK.semesters[b].program_id]?.code))||(LK.semesters[a].semester_number-LK.semesters[b].semester_number));if(!ss.includes(F.fs))F.fs='';
  $('#fd').innerHTML=opt(ds.map(id=>[id,LB('departments',id)]).sort((a,b)=>a[1].localeCompare(b[1])),'All departments');$('#fd').value=F.fd;
  $('#fp').innerHTML=opt(ps.map(id=>[id,LB('programs',id)]).sort((a,b)=>a[1].localeCompare(b[1])),'All courses');$('#fp').value=F.fp;
  $('#fk').innerHTML=opt(ks.map(id=>[id,LB('classes',id)]),'All classes');$('#fk').value=F.fk;
  $('#fs').innerHTML=opt(ss.map(id=>[id,semLbl(id)]),'All semesters');$('#fs').value=F.fs;
  if($('#fj')){const js=F.fk?clsSubjects(F.fk).map(x=>x.id):[];if(!js.includes(F.fj))F.fj=js[0]||'';$('#fj').innerHTML=opt(js.map(id=>[id,(LK.subjects?.[id]?.code||'')+' · '+LB('subjects',id)]),'All subjects');$('#fj').value=F.fj;$('#fj').disabled=!F.fk;
   if(!F.fm){const last=rows.map(r=>String(r.date||'').slice(0,7)).sort().pop();F.fm=last||new Date().toISOString().slice(0,7)}$('#fm').value=F.fm}
  ['fd','fp','fk','fs'].forEach(id=>{const el=$('#'+id);if(el)el.disabled=isStu&&(c.t==='attendance'||c.t==='timetable')});window.__flt={...F}}
 const set=o=>{Object.assign(F,o);paint()};
 if(hasY)$('#fy').onchange=e=>set({fy:e.target.value});
 if(!flat){$('#fd').onchange=e=>set({fd:e.target.value,fp:'',fk:'',fs:''});$('#fp').onchange=e=>set({fp:e.target.value,fk:'',fs:''});$('#fk').onchange=e=>set({fk:e.target.value,fs:'',fj:''});$('#fs').onchange=e=>set({fs:e.target.value})}
 if($('#fj')){$('#fj').onchange=e=>set({fj:e.target.value});$('#fm').onchange=e=>set({fm:e.target.value})}
 if($('#feeFilter'))$('#feeFilter').onchange=e=>{customStatus=e.target.value;paint()};
 if($('#activityFilter')){$('#activityFilter').innerHTML=opt([...new Set(rows.map(r=>r.activity_type).filter(Boolean))].sort().map(v=>[v,v]),'All activity types');$('#activityFilter').onchange=e=>{customType=e.target.value;paint()}}
 if($('#placementCompany')){$('#placementCompany').oninput=e=>{customCompany=e.target.value.trim().toLowerCase();paint()};$('#placementRole').oninput=e=>{customRole=e.target.value.trim().toLowerCase();paint()};$('#placementStatus').onchange=e=>{customStatus=e.target.value;paint()};$('#placementFrom').onchange=e=>{customFrom=e.target.value;paint()};$('#placementTo').onchange=e=>{customTo=e.target.value;paint()}}
 const vis=()=>rows.map((r,i)=>i).filter(i=>{const r=rows[i],x=X[i];if(F.fy&&x.y&&x.y!==F.fy)return false;if(F.fd&&x.d!==F.fd)return false;if(F.fp&&x.p!==F.fp)return false;if(F.fk&&x.k!==F.fk)return false;if(F.fs&&x.sm&&x.sm!==F.fs)return false;if(F.fs&&!x.sm&&!['classes','students','subjects'].includes(c.t)&&x.k&&LK.classes?.[x.k]&&LK.semesters?.[F.fs]&&LK.semesters[F.fs].year_number!==LK.classes[x.k].year_number)return false;
  if(c.t==='student_fees'&&customStatus){const paid=(+r.paid_amount||0)>=(+r.amount||0)||r.status==='paid';if(customStatus==='paid'&&!paid)return false;if(customStatus==='unpaid'&&paid)return false}
  if(c.t==='activity_marks'&&customType&&String(r.activity_type||'')!==customType)return false;
  if(c.t==='placements'){if(customCompany&&!String(r.company||'').toLowerCase().includes(customCompany))return false;if(customRole&&!String(r.job_role||'').toLowerCase().includes(customRole))return false;if(customStatus&&String(r.status||'')!==customStatus)return false;const d=String(r.placement_date||r.created_at||'').slice(0,10);if(customFrom&&d<customFrom)return false;if(customTo&&d>customTo)return false}
  return true});
 const fileLbl=(f)=>f.k==='photo_url'?'Photo':f.k==='syllabus_url'?'Syllabus':f.k==='certificate_url'?'Certificate':f.k==='document_url'?'Application':f.k==='attachment_url'?'Task sheet':f.k==='file_path'?'Result file':({certificates:'Certificate',study_materials:'Notes',tpo_records:'Brochure'}[c.t]||'File');
 function paint(){fillFilters();const v=vis();
  const card=i=>{const r=rows[i],[T,tk]=titleOf(c,r,refs),lines=tf.filter(f=>f.k!==tk&&!['name','full_name','title'].includes(f.k)).slice(0,3).map(f=>[f.l||human(f.k),valOf(f,r,refs)]).filter(l=>l[1]!==''&&l[1]!=null),st=r.status;
   const fl=c.f.filter(f=>f.type==='file'&&r[f.k]).map(f=>`<span class="fchip2"><a class="fchip" href="${esc(r[f.k])}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${ic('file',13)} ${esc(fileLbl(f))}</a><button class="fchip dl" data-dl="${esc(r[f.k])}" title="Download ${esc(fileLbl(f))}">⬇</button></span>`).join('');
   return `<div class="col${r.photo_url?' hasav':''}" data-i="${i}">${staffW&&window.__crudEdit?`<div class="cact"><button data-ce="${i}" title="Edit">${ic('edit',14)}</button><button data-cx="${i}" title="Delete">✕</button></div>`:''}${r.photo_url?`<img class="cav" src="${esc(r.photo_url)}" alt="" loading="lazy">`:''}<h3>${esc(c.t==='classes'?clsName(T):T)}</h3>${lines.map(l=>`<div style="font-size:13px;color:var(--mut)"><b style="color:var(--navy);font-weight:600">${esc(l[0])}:</b> ${esc(String(l[1]).slice(0,40))}</div>`).join('')}${fl?`<div class="fchips">${fl}</div>`:''}${clubSeatBadge(r)}<span class="tag">${esc(typeof st==='string'&&st?cell('status',st):'View details')}</span></div>`};
  let h='',bind=null;
  if(mode==='w')h=v.length?ttGrid(v.map(i=>rows[i])):'<div class="empty">No periods match these filters.</div>';
  else if(mode==='r'){h='<div class="panel"><div class="skel"><div class="sk tall"></div></div></div>';const tok=Symbol();paint.tok=tok;
   (F.fk?attFetch(F.fk,F.fj,F.fm).then(rs=>attRegister(rs,F.fk,F.fj,F.fm)):attSummary()).then(html=>{if(paint.tok!==tok)return;$('#cg').innerHTML=html;$('#cg').querySelectorAll('[data-pick]').forEach(tr=>tr.onclick=()=>{const k=tr.dataset.pick,cl=LK.classes?.[k];set({fp:cl?.program_id||'',fd:LK.programs?.[cl?.program_id]?.department_id||'',fk:k})})}).catch(e=>{$('#cg').innerHTML='<div class="panel err">'+esc(e.message)+'</div>'})}
  else if(mode==='f'){const o=flowView(c,rows,X,v,F,set,staffW,card,refs);h=o.html;bind=o.bind}
  else if(!v.length)h='<div class="empty">No records match these filters.</div>';
  else if(flat)h=`<div class="grid">${v.map(card).join('')}</div>`;
  else{const g={};v.forEach(i=>{const x=X[i],a=LB('programs',x.p)||'General',k2=x.k?LB('classes',x.k):x.g2,s3=x.sm?LB('semesters',x.sm):x.g3;(((g[a]=g[a]||{})[k2]=g[a][k2]||{})[s3]=g[a][k2][s3]||[]).push(i)});
   h=Object.entries(g).sort((a,b)=>a[0].localeCompare(b[0])).map(([a,ks])=>`<div class="panel"><div class="phd"><h3>${ic('cap',18)} ${esc(a)}</h3><span class="pill n">${Object.values(ks).flatMap(o=>Object.values(o).flat()).length}</span></div>${Object.entries(ks).sort((x,y)=>x[0].localeCompare(y[0])).map(([k,ss])=>`<h4 style="margin:14px 0 8px;color:var(--p1)">${esc(k)}</h4>${Object.entries(ss).sort((x,y)=>x[0].localeCompare(y[0],undefined,{numeric:true})).map(([sn,is])=>`<div style="margin:0 0 6px;color:var(--mut);font-size:13px">${esc(sn)} · ${is.length}</div><div class="grid" style="margin-bottom:12px">${is.map(card).join('')}</div>`).join('')}`).join('')}</div>`).join('')}
  const showTable=mode==='t';$('#cg').innerHTML=showTable?'':h;$('#cg').classList.toggle('hide',showTable);panel.classList.toggle('hide',!showTable);
  if(bind)bind($('#cg'));$('#cn').textContent=v.length+' of '+rows.length+' records';
  document.querySelectorAll('#tb tr').forEach((tr,i)=>tr.classList.toggle('hide',!v.includes(i)));
  document.querySelectorAll('#cg [data-i]').forEach(d=>d.onclick=()=>nav(()=>detail(c,rows[+d.dataset.i],refs)));
  document.querySelectorAll('#cg [data-ce]').forEach(b=>b.onclick=e=>{e.stopPropagation();window.__crudEdit(rows[+b.dataset.ce])});
  document.querySelectorAll('#cg [data-cx]').forEach(b=>b.onclick=e=>{e.stopPropagation();window.__crudDel(rows[+b.dataset.cx])});
  document.querySelectorAll('#cg [data-pick]').forEach(tr=>tr.onclick=()=>{const k=tr.dataset.pick,cl=LK.classes?.[k];set({fp:cl?.program_id||'',fd:LK.programs?.[cl?.program_id]?.department_id||'',fk:k})});
  charts.forEach(x=>x.destroy());charts=[];const spec=v.length&&mode==='c'?chartsFor(c,v,rows,X):[];$('#chp').innerHTML=spec.map((s,i)=>`<div class="panel" style="margin:0"><h3 style="font-size:15px;margin-bottom:8px">${esc(s.t)}</h3><div style="height:210px"><canvas id="ch${i}"></canvas></div></div>`).join('');
  if(spec.length)loadScript('https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js').then(()=>{const m=getComputedStyle(document.documentElement).getPropertyValue('--mut').trim();spec.forEach((s,i)=>{const cv=document.getElementById('ch'+i);if(!cv)return;const pie=s.type==='doughnut';charts.push(new Chart(cv,{type:s.type,data:{labels:s.labels,datasets:s.sets.map((d,j)=>({...d,backgroundColor:pie?PAL:s.stack?PAL[j]:PAL[0],borderRadius:pie?0:6,borderWidth:0}))},options:{maintainAspectRatio:false,plugins:{legend:{display:pie||s.sets.length>1,position:'bottom',labels:{color:m}}},scales:pie?{}:{x:{stacked:!!s.stack,ticks:{color:m},grid:{display:false}},y:{stacked:!!s.stack,beginAtZero:true,ticks:{color:m}}}}}))})}).catch(()=>{});
  if(typeof tilt==='function')tilt()}
 const shown=()=>vis().map(i=>rows[i]);
 const ttSheets=()=>{const by={};shown().forEach(r=>{(by[r.class_id||'']=by[r.class_id||'']||[]).push(r)});return Object.entries(by).map(([k,list])=>{const days=['Mon','Tue','Wed','Thu','Fri','Sat'].filter(d=>d!=='Sat'||list.some(r=>DAY3(r.day)==='Sat')),slots=[...new Set(list.map(r=>HM(r.start_time)+'–'+HM(r.end_time)))].sort();
   return [LB('classes',k)||'Class',Object.assign(slots.map(sl=>Object.fromEntries([['Time',sl],...days.map(d=>[d,list.filter(r=>DAY3(r.day)===d&&HM(r.start_time)+'–'+HM(r.end_time)===sl).map(r=>LB('subjects',r.subject_id)+(r.teacher_id?' ('+LB('users',r.teacher_id)+')':'')+(r.room?' · '+r.room:'')).join(' / ')||'—'])])),{__raw:1})]})};
 if($('#xe'))$('#xe').onclick=()=>c.t==='timetable'?dl(Object.fromEntries(ttSheets()),'timetable.xlsx'):dl({[c.title]:shown()},c.t+'.xlsx');
 if($('#xp'))$('#xp').onclick=()=>(c.t==='timetable'?pdfTable('Weekly timetable',ttSheets(),'timetable.pdf'):pdfTable(c.title+(F.fk?' — '+LB('classes',F.fk):''),[[c.title,shown()]],c.t+'.pdf')).catch(e=>toast(e.message,1));
 if($('#xu')){$('#xu').onclick=()=>$('#up').click();$('#xt').onclick=()=>$('#tp').click();[$('#up')?.closest('label'),$('#tp'),$('#rimp')?.closest('label')].forEach(e=>{if(e&&!wrap.contains(e))e.style.display='none'})}if($('#xr'))$('#xr').onclick=()=>$('#rimp').click();if($('#ma'))$('#ma').onclick=()=>nav(()=>markAttendance());
 wrap.querySelectorAll('.seg [data-m]').forEach(b=>b.onclick=()=>{mode=b.dataset.m;wrap.querySelectorAll('.seg [data-m]').forEach(x=>x.classList.toggle('on',x===b));paint()});
 paint()}

function detail(c,r,refs){if(c.detail)return c.detail(r,refs);if(c.t==='clubs')return drillClub(r);const g={academic_years:drillYear,programs:drillProgram,semesters:drillSem,subjects:drillSubject,classes:drillClass,students:drillStudent,departments:drillDept,assignments:assignDetail,fee_structures:drillFeeStruct,student_fees:drillFee}[c.t];if(g)return g(r);
 if(c.t==='subject_assignments'){const cl=LK.classes?.[r.class_id],st=vals(LK.students).filter(x=>x.class_id===r.class_id);const m=mod(`<h3>Subject allocation</h3><div class="tw"><table><tbody><tr><th>Subject</th><td>${esc(LB('subjects',r.subject_id))}</td></tr><tr><th>Department</th><td>${esc(LB('departments',LK.subjects?.[r.subject_id]?.department_id))}</td></tr><tr><th>Semester</th><td>${esc(LB('semesters',LK.subjects?.[r.subject_id]?.semester_id))}</td></tr><tr><th>Class</th><td>${esc(LB('classes',r.class_id))}</td></tr><tr><th>Teacher</th><td>${esc(LB('users',r.teacher_id))}</td></tr></tbody></table></div><h3 style="margin-top:14px">Students (${st.length})</h3>${st.map(x=>chip('students',x)).join('')||none}`);return m}const p=pretty([r])[0],sid=r.student_id;const m=mod(`<h3>${esc(titleOf(c,r,refs)[0])}</h3>${sid&&LK.students[sid]?`<h3 style="margin:8px 0">Student</h3>${chip('students',LK.students[sid],LB('programs',LK.students[sid].program_id))}<p style="color:var(--mut);font-size:13px">Click the student to see full details.</p>`:''}<div class="tw"><table><tbody>${Object.entries(p).map(([k,v])=>`<tr><th style="width:38%">${esc(k)}</th><td>${/^https?:/.test(v)?`<a href="${esc(v)}" target="_blank" rel="noopener">Open file</a>`:esc(v)}</td></tr>`).join('')}</tbody></table></div>`);
 if(m.querySelector('#dd1'))m.querySelector('#dd1').onclick=()=>dl({[c.title]:[r]},c.t+'_record.xlsx')}
/* ---- any other page: turn tables into cards + table automatically ---- */
function autoCards(){if(document.getElementById('cv'))return;
 document.querySelectorAll('#view .panel').forEach(p=>{const t=p.querySelector('table');if(!t||p.dataset.ac||t.querySelector('input,select'))return;
  const hs=[...(t.tHead?.rows[0]?.cells||[])].map(h=>h.textContent.trim()),rs=[...(t.tBodies[0]?.rows||[])].filter(r=>r.cells.length===hs.length&&!r.querySelector('.empty'));if(!rs.length||hs.length<2)return;p.dataset.ac=1;
  const data=rs.map(r=>[...r.cells].map(c=>c.textContent.trim())),ti=hs.findIndex(h=>h),w=document.createElement('div');
  const rowsObj=()=>data.map(d=>Object.fromEntries(hs.map((h,i)=>[h||'Actions',d[i]]).filter(([h])=>h&&h!=='Actions')));
  w.innerHTML=`<div class="bar2" style="justify-content:space-between"><div class="seg" style="margin:0"><button class="on" data-v="c">${ic('grid',16)} Cards</button><button data-v="t">${ic('list',16)} Table</button></div></div><div class="grid">${data.map((d,i)=>`<div class="col" data-i="${i}"><h3>${esc(d[0]||d[1]||'Record')}</h3>${hs.slice(1,4).map((h,j)=>d[j+1]&&h?`<div style="font-size:13px;color:var(--mut)"><b style="color:var(--navy)">${esc(h)}:</b> ${esc(d[j+1].slice(0,40))}</div>`:'').join('')}<span class="tag">View details</span></div>`).join('')}</div>`;
  p.before(w);p.classList.add('hide');const g=w.querySelector('.grid'),ttl=document.title.split(' · ')[0];
  w.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{w.querySelectorAll('[data-v]').forEach(x=>x.classList.toggle('on',x===b));g.classList.toggle('hide',b.dataset.v==='t');p.classList.toggle('hide',b.dataset.v==='c')});
  g.querySelectorAll('[data-i]').forEach(d=>d.onclick=()=>{const r=data[+d.dataset.i];const m=modal(`<h3>${esc(r[0]||'Details')}</h3><div class="tw"><table><tbody>${hs.map((h,i)=>h?`<tr><th style="width:38%">${esc(h)}</th><td>${esc(r[i])}</td></tr>`:'').join('')}</tbody></table></div>`,1)})})}

async function drillClub(club){
 const {data:enrollments,error}=await sb.from('club_enrollments').select('*,students(full_name,roll_number)').eq('club_id',club.id).order('requested_at',{ascending:true});if(error)throw error;
 const rows=enrollments||[],approved=rows.filter(x=>x.status==='approved').length,capacity=club.capacity==null||club.capacity===''?null:Number(club.capacity),seats=capacity===null?null:Math.max(0,capacity-approved),studentRole=S.role==='student',me=studentRole?(await myStudents())[0]:null,current=me?rows.find(x=>x.student_id===me.id&&['approved','pending','waitlisted'].includes(x.status)):null,canManage=canWrite('clubs')&&!['student','parent'].includes(S.role);
 const statusBadge=st=>`<span class="pill ${st==='approved'?'':'s'}">${esc(st)}</span>`;
 const m=mod(`<h3>${esc(club.name)}</h3><p>${esc(club.description||'Club')}</p><div class="kpis"><div class="kpi"><div><b>${approved}</b><span>Enrolled</span></div></div><div class="kpi"><div><b>${capacity===null?'Unlimited':capacity}</b><span>Capacity</span></div></div><div class="kpi"><div><b>${seats===null?'Unlimited':seats}</b><span>Seats available</span></div></div><div class="kpi"><div><b>${club.auto_approve?'Automatic':'Manual'}</b><span>Approval</span></div></div></div>${studentRole?`<div style="margin:14px 0">${current?statusBadge(current.status):seats===0?'<span class="pill s">Full · Waitlist</span>':'<span class="pill">Seats available</span>'}</div>${current?'<button class="btn red sm" id="ccancel">Cancel my enrollment</button>':me?'<button class="btn sm" id="cen">'+(seats===0?'Join waitlist':club.auto_approve?'Enroll now':'Request to join')+'</button>':'<p>Your student record is not linked.</p>'}`:''}${canManage?`<h3 style="margin:18px 0 8px">Enrollment requests and members</h3><div class="tw"><table><thead><tr><th>Student</th><th>Roll</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.students?.full_name||'')}</td><td>${esc(x.students?.roll_number||'')}</td><td>${statusBadge(x.status)}</td><td>${x.status==='pending'||x.status==='waitlisted'?`<button class="btn sm" data-approve="${x.id}">Approve</button> <button class="btn red sm" data-reject="${x.id}">Reject</button>`:''}</td></tr>`).join('')||'<tr><td colspan="4" class="empty">No enrollments yet.</td></tr>'}</tbody></table></div>`:''}`);
 if(studentRole&&me&&!current&&m.querySelector('#cen'))m.querySelector('#cen').onclick=async()=>{try{const {data,error}=await sb.rpc('lms_enroll_in_club',{p_club_id:club.id,p_student_id:me.id});if(error)throw error;toast('Enrollment status: '+(data?.status||'submitted'));const pv=HIST.pop();CUR=pv||(()=>drillClub(club));CUR()}catch(e){toast(e.message,1)}};
 if(studentRole&&current&&m.querySelector('#ccancel'))m.querySelector('#ccancel').onclick=async()=>{if(!confirm('Cancel your club enrollment?'))return;const {error}=await sb.from('club_enrollments').update({status:'cancelled'}).eq('id',current.id);if(error)return toast(error.message,1);toast('Enrollment cancelled; waitlist may be promoted');const pv=HIST.pop();CUR=pv||(()=>drillClub(club));CUR()};
 if(canManage)m.querySelectorAll('[data-approve]').forEach(b=>b.onclick=async()=>{try{const {error}=await sb.rpc('lms_review_club_request',{p_enrollment_id:b.dataset.approve,p_decision:'approved',p_reviewer_id:S.id});if(error)throw error;toast('Enrollment approved');const pv=HIST.pop();CUR=pv||(()=>drillClub(club));CUR()}catch(e){toast(e.message,1)}});
 if(canManage)m.querySelectorAll('[data-reject]').forEach(b=>b.onclick=async()=>{try{const {error}=await sb.rpc('lms_review_club_request',{p_enrollment_id:b.dataset.reject,p_decision:'rejected',p_reviewer_id:S.id});if(error)throw error;toast('Request rejected');const pv=HIST.pop();CUR=pv||(()=>drillClub(club));CUR()}catch(e){toast(e.message,1)}});
}
