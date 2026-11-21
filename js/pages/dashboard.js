/* ===== dashboards ===== */
const CC=(t,f)=>{let q=sb.from(t).select('id',{count:'exact',head:true});return f?f(q):q};
async function dash(){await(S.role==='super_admin'?dashSuper():dashCollege());try{const pc=await profileCard();const h=document.querySelector('#view .hero');if(pc&&h)h.insertAdjacentHTML('afterend',pc)}catch(e){console.warn(e)}if(['college_admin','sub_admin','principal'].includes(S.role))await adminCharts();const f=await feed(10);$('#view').insertAdjacentHTML('beforeend',`<div class="panel" style="margin-top:36px"><div class="phd"><h3>Recent activity</h3><span class="pill n">${S.role==='super_admin'?'All colleges':'My college'}</span></div>${feedHtml(f)}</div>`)}
async function dashSuper(){
 const STAFF=['college_admin','sub_admin','principal','hod','class_teacher','subject_teacher','admission_admin','examination_admin','accounts','librarian','tpo','activity_admin'];
 const RC=(f)=>CC('user_roles',f).then(x=>x.count||0);
 const [{data:cs},stu,stf,par,adm]=await Promise.all([sb.from('colleges').select('*').order('created_at',{ascending:false}),cnt('students'),RC(q=>q.in('role',STAFF)),RC(q=>q.eq('role','parent')),RC(q=>q.eq('role','college_admin'))]);
 const C=cs||[],act=C.filter(c=>c.status==='active').length,sus=C.length-act;
 const per=await Promise.all(C.map(c=>Promise.all([cnt('students',c.id),RC(q=>q.eq('college_id',c.id).in('role',STAFF)),cnt('programs',c.id),RC(q=>q.eq('college_id',c.id).eq('role','college_admin')),sb.from('academic_years').select('name').eq('college_id',c.id).eq('is_active',true).maybeSingle()]).then(([s,t,p,a,y])=>({s,t,p,a,y:y.data?.name||''}))));
 const K=(i,n,l,c,href,sub)=>`<a class="kpi" href="${href}"><div class="kb" style="--k:${c}">${ic(i,24)}</div><div><b data-n="${n}">0</b><span>${l}</span>${sub?`<em class="ksub">${sub}</em>`:''}</div></a>`;
 const mods=c=>{const m=c.settings?.modules||{};return MODS.map(([k,l])=>`<i class="${m[k]===false?'off':''}" title="${l}${m[k]===false?' (disabled)':''}">${l.split(' ')[0]}</i>`).join('')};
 const issues=[];C.forEach((c,i)=>{const x=per[i];if(c.status==='suspended')issues.push(['pause',c,'College is suspended']);if(!x.a)issues.push(['user',c,'No college admin assigned']);if(!x.y&&c.status==='active')issues.push(['calendar',c,'No active academic year']);if(!x.p&&c.status==='active')issues.push(['cap',c,'No courses set up yet'])});
 $('#view').innerHTML=`<div class="hero"><div class="crest">${ic('shield',40)}</div><div><h2>Platform overview</h2><p>${new Date().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long',year:'numeric'})} · Welcome, <b>${esc(S.name)}</b></p><p>${C.length} colleges · ${stu.toLocaleString('en-IN')} students · ${stf} staff on the platform</p></div><a class="btn hero-btn" href="colleges.html">${ic('plus',16)} Register college</a></div>
 <div class="kpis">${K('building',C.length,'Total colleges','#163A5F','colleges.html')}${K('checkc',act,'Active colleges','#16A34A','colleges.html',C.length?Math.round(act/C.length*100)+'% of all':'')}${K('pause',sus,'Suspended','#DC2626','colleges.html')}${K('user',stu,'Students','#2563A6','colleges.html')}${K('users',stf,'Staff','#20A6A6','passwords.html',adm+' college admins')}${K('users',par,'Parents','#7C3AED','passwords.html')}</div>
 <div class="sgrid">
  <div class="panel"><div class="phd"><h3>Students by college</h3><span class="pill n">Live</span></div><div style="height:240px"><canvas id="sc1"></canvas></div></div>
  <div class="panel"><div class="phd"><h3>Users by type</h3><span class="pill n">Platform</span></div><div style="height:240px"><canvas id="sc2"></canvas></div></div>
 </div>
 <div class="phd" style="margin-top:6px"><h3 class="sec-h" style="margin:0">Colleges</h3><a class="btn ghost sm" href="colleges.html">View all</a></div>
 <div class="ccards">${C.map((c,i)=>{const x=per[i],mx=Math.max(1,...per.map(p=>p.s));return `<a class="ccard" href="colleges.html?id=${c.id}">
   <div class="cc-h"><div class="crest">${crest(c)}</div><div class="cc-t"><b>${esc(c.name)}</b><small>Code ${esc(c.code)}${x.y?' · AY '+esc(x.y):''}</small></div><span class="pill ${c.status==='active'?'':'s'}">${esc(c.status)}</span></div>
   <div class="cc-s"><div><b>${x.s}</b><span>Students</span></div><div><b>${x.t}</b><span>Staff</span></div><div><b>${x.p}</b><span>Courses</span></div></div>
   <div class="mini" title="Share of the largest college"><i style="width:${x.s/mx*100}%"></i></div>
   <div class="cc-m">${mods(c)}</div>
   <div class="cc-f"><small>${esc(c.contact_email||'No email')} · Added ${fdate(c.created_at)}</small><span>Manage ${ic('chev',12)}</span></div></a>`}).join('')||'<div class="panel empty">No colleges yet. Register the first one.</div>'}</div>
 <div class="dgrid" style="margin-top:22px">
  <div class="panel"><div class="phd"><h3>Needs attention</h3><span class="pill ${issues.length?'s':''}">${issues.length||'All good'}</span></div>${issues.map(([i,c,m])=>`<a class="fi" href="colleges.html?id=${c.id}" style="text-decoration:none;color:inherit"><span class="fb">${ic(i,17)}</span><div><b>${esc(c.name)}</b><small>${m}</small></div></a>`).join('')||'<div class="empty">Every college has an admin, an active year and courses.</div>'}</div>
  <div class="panel"><div class="phd"><h3>Quick actions</h3></div><ul class="cl">
  <li><a href="colleges.html">${ic('building')}<span>Register college &amp; create admin</span></a></li>
  <li><a href="colleges.html">${ic('shield')}<span>Activate / suspend · module access</span></a></li>
  <li><a href="passwords.html">${ic('key')}<span>Reset user passwords</span></a></li>
  <li><a href="journey.html">${ic('compass')}<span>Platform journey</span></a></li></ul></div>
 </div>`;countUp();
 await loadScript('https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js').catch(()=>{});if(typeof Chart==='undefined')return;
 const m=getComputedStyle(document.documentElement).getPropertyValue('--mut').trim();
 new Chart(document.getElementById('sc1'),{type:'bar',data:{labels:C.map(c=>c.code),datasets:[{label:'Students',data:per.map(p=>p.s),backgroundColor:'#2563A6',borderRadius:8},{label:'Staff',data:per.map(p=>p.t),backgroundColor:'#20A6A6',borderRadius:8}]},options:{maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:m}}},scales:{x:{ticks:{color:m},grid:{display:false}},y:{beginAtZero:true,ticks:{color:m}}}}});
 new Chart(document.getElementById('sc2'),{type:'doughnut',data:{labels:['Students','Parents','Staff'],datasets:[{data:[stu,par,stf],backgroundColor:['#2563A6','#7C3AED','#20A6A6'],borderWidth:0}]},options:{maintainAspectRatio:false,cutout:'62%',plugins:{legend:{position:'bottom',labels:{color:m}}}}})}
async function dashCollege(){
 if(S.role==='student'||S.role==='parent'){await dashStudent();return}
 const cid=S.college_id,c=S.college,my=navFor();
 const [st,sub,cl,pr,ur,ay]=await Promise.all([cnt('students',cid),cnt('subjects',cid),cnt('classes',cid),cnt('programs',cid),cnt('user_roles',cid),sb.from('academic_years').select('name').eq('college_id',cid).eq('is_active',true).maybeSingle()]);
 const K=(i,n,l,col,href)=>{const h=href&&my.includes(Object.keys(FILE).find(k=>FILE[k]===href));return `<${h?'a href="'+href+'"':'div'} class="kpi"><div class="kb" style="--k:${col}">${ic(i,24)}</div><div><b data-n="${n}">0</b><span>${l}</span></div></${h?'a':'div'}>`};
 const keys=my.filter(k=>k!=='dash'&&k!=='journey');
 $('#view').innerHTML=`<div class="hero"><div class="crest">${crest(c)}</div><div><h2>${esc(c.name)}</h2><p>Code ${esc(c.code)} · ${esc(c.contact_email||'no email')} · ${esc(c.contact_phone||'no phone')}<br>${esc(c.address||'Add your address in College profile')}</p>
 <p>Welcome, <b>${esc(S.name)}</b> · ${S.role.replace(/_/g,' ')} · Academic year: <b>${esc(ay.data?.name||'not set')}</b></p></div></div>
 <div class="kpis">${K('user',st,'Students','#2563A6','students.html')}${K('users',ur,'Staff & users','#20A6A6','staff.html')}${K('cap',pr,'Courses','#163A5F','programs.html')}${K('building',cl,'Classes','#D97706','classes.html')}${K('book',sub,'Subjects','#16A34A','subjects.html')}</div>
 ${await roleKpis()}
 ${my.includes('journey')?`<a class="panel" href="journey.html" style="display:flex;gap:14px;align-items:center;text-decoration:none;color:var(--navy)">${ic('compass',28)}<div><b>Annual process &amp; journey</b><br><small style="color:var(--mut)">Track every phase from setup to certificates</small></div></a>`:''}
 <h3 class="sec-h" style="margin-top:6px">Modules</h3><div class="tiles">${MODULES.filter(m=>modPages(m,my).length).map(m=>`<a class="tile" href="${FILE[modPages(m,my)[0]]}">${ic(m.i)}${esc(modLabel(m,my))}<small>${modPages(m,my).length>1?modPages(m,my).length+' sections':'&nbsp;'}</small></a>`).join('')}</div>`;countUp()}

/* admin overview charts: students, attendance and fees by course / class / semester */
async function adminCharts(){await (LKP||loadLK());await loadScript('https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js').catch(()=>{});if(typeof Chart==='undefined')return;
 const cid=S.college_id,[at,fe]=await Promise.all([sb.from('attendance').select('class_id,subject_id,status').eq('college_id',cid).limit(20000),sb.from('student_fees').select('student_id,amount,paid_amount').eq('college_id',cid).limit(5000)]);
 const stu=vals(LK.students),grp=(a,fn,v)=>{const o={};a.forEach(x=>{const k=fn(x)||'General';(o[k]=o[k]||[]).push(v(x))});return o},avg=a=>Math.round(a.reduce((x,y)=>x+y,0)/a.length),pc=x=>x.status==='present'||x.status==='late'?100:0;
 const A=at.data||[],byCourse=grp(stu,s=>LB('programs',s.program_id),s=>1),attCls=grp(A,x=>LB('classes',x.class_id),pc),attSem=grp(A,x=>nm('semesters',LK.semesters[LK.subjects[x.subject_id]?.semester_id]||{semester_number:''})||'General',pc);
 const F=grp(fe.data||[],x=>LB('programs',LK.students[x.student_id]?.program_id),x=>[+x.paid_amount||0,Math.max(0,(+x.amount||0)-(+x.paid_amount||0))]);
 const specs=[['Students per course','bar',Object.keys(byCourse),[{label:'Students',data:Object.values(byCourse).map(a=>a.length)}]],['Attendance % by class','bar',Object.keys(attCls),[{label:'Attendance %',data:Object.values(attCls).map(avg)}]],['Attendance % by semester','bar',Object.keys(attSem),[{label:'Attendance %',data:Object.values(attSem).map(avg)}]],['Fees by course','bar',Object.keys(F),[{label:'Collected',data:Object.values(F).map(a=>a.reduce((x,y)=>x+y[0],0))},{label:'Pending',data:Object.values(F).map(a=>a.reduce((x,y)=>x+y[1],0))}]]];
 const w=document.createElement('div');w.className='panel';w.style.marginTop='34px';w.innerHTML=`<div class="phd"><h3>College overview</h3><span class="pill n">Course · class · semester</span></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px">${specs.map((s,i)=>`<div><h4 style="margin-bottom:8px">${s[0]}</h4><div style="height:210px"><canvas id="ac${i}"></canvas></div></div>`).join('')}</div>`;
 $('#view').appendChild(w);const m=getComputedStyle(document.documentElement).getPropertyValue('--mut').trim();
 specs.forEach((s,i)=>new Chart(document.getElementById('ac'+i),{type:s[1],data:{labels:s[2],datasets:s[3].map((d,j)=>({...d,backgroundColor:PAL[j],borderRadius:6}))},options:{maintainAspectRatio:false,plugins:{legend:{display:s[3].length>1,position:'bottom',labels:{color:m}}},scales:{x:{stacked:s[3].length>1,ticks:{color:m},grid:{display:false}},y:{stacked:s[3].length>1,beginAtZero:true,ticks:{color:m}}}}}))}

async function dashStudent(){
 try{await (LKP||loadLK())}catch(e){}
 const me=(await myStudents())[0];
 if(!me){$('#view').innerHTML='<div class="panel"><h3>Student record not linked</h3><p>Your login is valid, but no student record is linked to it. Contact your college administrator to link your student ID to this login.</p></div>';return}
 const cid=S.college_id,now=new Date().toISOString(),today=new Date().toISOString().slice(0,10);
 const [as,ex,an,att,qz,fee,pl,ev,res]=await Promise.all([
  sb.from('assignments').select('*').eq('college_id',cid).eq('class_id',me.class_id).gt('deadline',now).order('deadline').limit(6),
  sb.from('exams').select('*').eq('college_id',cid).eq('class_id',me.class_id).gte('exam_date',today).order('exam_date').limit(6),
  sb.from('announcements').select('*').eq('college_id',cid).order('created_at',{ascending:false}).limit(12),
  sb.from('attendance').select('status,date').eq('college_id',cid).eq('student_id',me.id).limit(500),
  sb.from('quizzes').select('*').eq('college_id',cid).or(`class_id.eq.${me.class_id},class_id.is.null`).order('created_at',{ascending:false}).limit(6),
  sb.from('student_fees').select('amount,paid_amount,status,due_date,title').eq('college_id',cid).eq('student_id',me.id),
  Promise.all([sb.from('placements').select('*').eq('college_id',cid).eq('student_id',me.id).order('created_at',{ascending:false}).limit(4),sb.from('tpo_records').select('*').eq('college_id',cid).eq('program_id',me.program_id).order('event_date',{ascending:false}).limit(6)]).then(([a,b])=>({data:[...(a.data||[]),...(b.data||[])].slice(0,6)})),
  sb.from('competitions').select('*').eq('college_id',cid).order('created_at',{ascending:false}).limit(6),
  sb.from('exam_results').select('*').eq('college_id',cid).eq('student_id',me.id).eq('is_published',true).order('created_at',{ascending:false}).limit(6)
 ]);
 const notices=await annFilter(an.data||[]),studentQuizzes=(qz.data||[]).filter(q=>(!q.class_id||q.class_id===me.class_id)&&(!q.program_id||q.program_id===me.program_id)),present=(att.data||[]).filter(x=>['present','late'].includes(String(x.status).toLowerCase())).length,total=(att.data||[]).length,percent=total?Math.round(present/total*100):0,pendingFees=(fee.data||[]).reduce((n,x)=>n+Math.max(0,(+x.amount||0)-(+x.paid_amount||0)),0);
 const box=(title,arr,fmt,href)=>`<div class="panel"><div class="phd"><h3>${title}</h3><a href="${href}" class="btn ghost sm">View</a></div>${(arr||[]).length?(arr||[]).map(x=>`<div class="fi"><span class="fb">${ic('calendar',17)}</span><div><b>${esc(fmt(x))}</b><small>${(()=>{const d=x.deadline||x.exam_date||x.date||x.placement_date||x.event_date||x.created_at;return d?(x.deadline?'Due ':'')+fdate(d):''})()}</small></div></div>`).join(''):'<div class="empty">No records</div>'}</div>`;
 $('#view').innerHTML=`<div class="hero"><div class="crest">${esc((me.full_name||S.name).split(' ').map(x=>x[0]).join('').slice(0,3))}</div><div><h2>Welcome, ${esc(S.role==='parent'?S.name:(me.full_name||S.name))}</h2><p>${S.role==='parent'?'Parent dashboard · Child: '+esc(me.full_name)+' · ':'Student dashboard · '}${esc(me.roll_number||'')} · ${esc(LB('classes',me.class_id)||LB('programs',me.program_id)||'')}</p><p>${S.role==='parent'?'Attendance, results, fees and notices for your child.':'Your personal academic updates and campus information.'}</p></div></div><div class="kpis"><div class="kpi"><div class="kb" style="--k:#2563A6">${ic('file',24)}</div><div><b>${(as.data||[]).length}</b><span>Pending assignments</span></div></div><div class="kpi"><div class="kb" style="--k:#7C3AED">${ic('calendar',24)}</div><div><b>${(ex.data||[]).length}</b><span>Upcoming exams</span></div></div><div class="kpi"><div class="kb" style="--k:#16A34A">${ic('checkc',24)}</div><div><b>${percent}%</b><span>Attendance</span></div></div><div class="kpi"><div class="kb" style="--k:#D97706">${ic('calc',24)}</div><div><b>₹${pendingFees.toLocaleString('en-IN')}</b><span>Pending fees</span></div></div></div><div class="dgrid">${box('Pending assignments',as.data||[],x=>x.title,'assignments.html')}${box('Upcoming exams',ex.data||[],x=>x.name,'exams.html')}${box('Latest notices',notices,x=>x.title,'announcements.html')}${box('Training & placement',pl.data||[],x=>x.company?x.company+' · '+(x.job_role||'')+' · '+x.status:x.title+(x.organization?' · '+x.organization:'')+' · '+x.status,navFor().includes('placements')?'placement.html':'dashboard.html')}${box('Upcoming events',ev.data||[],x=>x.title||x.name||x.event_name,'competitions.html')}${box('Recent quizzes',studentQuizzes,x=>x.title,'quizzes.html')}${box('Published exam results',res.data||[],x=>(LB('exams',x.exam_id)||'Exam')+' · '+(x.marks_obtained??'')+(LK.exams?.[x.exam_id]?.max_marks?' / '+LK.exams[x.exam_id].max_marks:'')+' marks · Grade '+(x.grade||x.status||''),'results.html')}</div>`;
}

/* ===== role-specific live widgets (every card opens its module) ===== */
async function roleKpis(){const cid=S.college_id,r=S.role,my=navFor(),today=new Date().toISOString().slice(0,10),inr=n=>'₹'+Math.round(n).toLocaleString('en-IN');
 const C=(t,f)=>CC(t,q=>f(q.eq('college_id',cid))).then(x=>x.count||0),rows=(t,cols,f)=>{let q=sb.from(t).select(cols).eq('college_id',cid).limit(1000);if(f)q=f(q);return q.then(x=>x.data||[])};
 const W=(i,v,l,col,key,raw)=>{const h=key&&my.includes(key);return `<${h?'a href="'+FILE[key]+'"':'div'} class="kpi"><div class="kb" style="--k:${col}">${ic(i,24)}</div><div><b ${raw?'class="long"':'data-n="'+v+'"'}>${raw?v:0}</b><span>${l}</span></div></${h?'a':'div'}>`};
 const fees=()=>rows('student_fees','student_id,amount,paid_amount').then(a=>{const due=a.reduce((n,x)=>n+Math.max(0,(+x.amount||0)-(+x.paid_amount||0)),0),paid=a.reduce((n,x)=>n+(+x.paid_amount||0),0),def=new Set(a.filter(x=>(+x.amount||0)>(+x.paid_amount||0)).map(x=>x.student_id)).size;return{due,paid,def}});
 let h='',t='';
 try{
 if(['college_admin','sub_admin','principal'].includes(r)){const since=new Date(Date.now()-30*864e5).toISOString().slice(0,10);
  const [pa,ue,sel,f,tot,pr]=await Promise.all([C('admission_applications',q=>q.eq('status','pending')),C('exams',q=>q.gte('exam_date',today)),C('placements',q=>q.eq('status','selected')),fees(),C('attendance',q=>q.gte('date',since)),C('attendance',q=>q.gte('date',since).in('status',['present','late']))]);
  t='Institution snapshot';h=W('clipboard',pa,'Pending admissions','#7C3AED','admissions')+W('calc',inr(f.due),'Pending fees','#DC2626','fees',1)+W('edit',ue,'Upcoming exams','#2563A6','exams')+W('briefcase',sel,'Students placed','#16A34A','placements')+W('checkc',(tot?Math.round(pr/tot*100):0)+'%','Attendance (last 30 days)','#20A6A6','attendance',1)}
 else if(r==='accounts'){const [f,pm]=await Promise.all([fees(),C('fee_payments',q=>q.gte('paid_on',today.slice(0,8)+'01'))]);
  t='Accounts';h=W('award',inr(f.paid),'Collected','#16A34A','payments',1)+W('calc',inr(f.due),'Outstanding','#DC2626','fees',1)+W('users',f.def,'Students with dues','#D97706','fees')+W('checkc',pm,'Receipts this month','#2563A6','payments')}
 else if(r==='librarian'){const [bk,iss]=await Promise.all([rows('library_books','copies'),rows('library_issues','status,due_on',q=>q.eq('status','issued'))]);
  t='Library';h=W('book',bk.length,'Titles','#163A5F','books')+W('layers',bk.reduce((n,x)=>n+(+x.copies||0),0),'Total copies','#2563A6','books')+W('link',iss.length,'Issued now','#20A6A6','library')+W('clock',iss.filter(x=>x.due_on&&x.due_on<today).length,'Overdue','#DC2626','library')}
 else if(r==='tpo'){const pl=await rows('placements','status,package_lpa');const s=pl.filter(x=>x.status==='selected'),avg=s.length?(s.reduce((n,x)=>n+(+x.package_lpa||0),0)/s.length).toFixed(1):'0';
  t='Placements';h=W('briefcase',pl.length,'Applications','#2563A6','placements')+W('checksq',pl.filter(x=>x.status==='shortlisted').length,'Shortlisted','#D97706','placements')+W('award',s.length,'Selected','#16A34A','placements')+W('star',avg+' LPA','Average package','#163A5F','placements',1)}
 else if(r==='examination_admin'){const [ue,pend,pub,atkt]=await Promise.all([C('exams',q=>q.gte('exam_date',today)),C('exam_results',q=>q.neq('status','approved')),C('exam_results',q=>q.eq('is_published',true)),C('academic_progression',q=>q.eq('status','ATKT'))]);
  t='Examinations';h=W('edit',ue,'Upcoming exams','#2563A6','exams')+W('checksq',pend,'Marks awaiting approval','#D97706','marksverify')+W('trophy',pub,'Published results','#16A34A','marksverify')+W('flag',atkt,'ATKT students','#DC2626','results')}
 else if(r==='admission_admin'){const [pa,cr,rj,en]=await Promise.all([C('admission_applications',q=>q.eq('status','pending')),C('admission_applications',q=>q.eq('status','correction_required')),C('admission_applications',q=>q.eq('status','rejected')),C('enquiries',q=>q.eq('status','new'))]);
  t='Admissions';h=W('clipboard',pa,'Pending applications','#2563A6','admissions')+W('shield',cr,'Correction required','#D97706','verify')+W('pause',rj,'Rejected','#DC2626','admissions')+W('phone',en,'New enquiries','#20A6A6','enquiries')}
 else if(r==='activity_admin'){const [cl,pe,co,am]=await Promise.all([C('clubs',q=>q),C('club_enrollments',q=>q.eq('status','pending')),C('competitions',q=>q.gte('event_date',today)),C('activity_marks',q=>q)]);
  t='Activities';h=W('smile',cl,'Clubs','#2563A6','clubs')+W('clock',pe,'Pending join requests','#D97706','clubs')+W('flag',co,'Upcoming competitions','#16A34A','competitions')+W('star',am,'Activity mark entries','#163A5F','actmarks')}
 else if(['hod','class_teacher','subject_teacher'].includes(r)){const sc=await scope(),Z='00000000-0000-0000-0000-000000000000',n=a=>a.filter(x=>x!==Z).length;
  const [as,ex]=await Promise.all([C('assignments',q=>q.in('subject_id',sc.subjects).gte('deadline',new Date().toISOString())),C('exams',q=>q.in('subject_id',sc.subjects).gte('exam_date',today))]);
  t='My teaching';h=W('building',n(sc.classes),'My classes','#2563A6','classes')+W('book',n(sc.subjects),'My subjects','#20A6A6','subjects')+W('user',n(sc.students),'My students','#163A5F','students')+W('file',as,'Open assignments','#D97706','assignments')+W('edit',ex,'Upcoming exams','#7C3AED','exams')}
 }catch(e){return ''}
 return h?`<h3 class="sec-h">${t}</h3><div class="kpis">${h}</div>`:''}

/* ===== "My details" card: shows the signed-in person's own information for every role ===== */
async function profileCard(){await (LKP||loadLK());const cid=S.college_id,uid=S.id;
 const [{data:u},{data:roles}]=await Promise.all([sb.from('users').select('full_name,email,phone,created_at').eq('id',uid).maybeSingle(),sb.from('user_roles').select('role,college_id').eq('user_id',uid)]);
 const RL=r=>String(r).replace(/_/g,' ').replace(/\b\w/g,m=>m.toUpperCase()).replace('Hod','HOD').replace('Tpo','TPO');
 const ini=(u?.full_name||S.name||'U').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
 const kv=[];const add=(k,v)=>{if(v!==undefined&&v!==null&&v!=='')kv.push([k,v])};
 add('Role',[...new Set((roles||[]).map(x=>RL(x.role)))].join(', ')||RL(S.role));add('Email',u?.email);add('Phone',u?.phone);
 if(S.college)add('College',S.college.name);
 let extra='';
 if(S.role==='student'||S.role==='parent'){const my=await myStudents();
  if(S.role==='student'&&my[0]){const s=my[0],cl=LK.classes?.[s.class_id];add('Roll number',s.roll_number);add('Department',LB('departments',LK.programs?.[s.program_id]?.department_id));add('Course',LB('programs',s.program_id));add('Class',LB('classes',s.class_id));add('Semester',LB('semesters',s.semester_id));add('Academic year',LB('academic_years',s.academic_year_id));add('Class teacher',cl?.class_teacher_id?LB('users',cl.class_teacher_id):'');add('Parent mobile',s.parent_mobile);add('Date of birth',s.dob?fdate(s.dob):'')}
  if(S.role==='parent')extra=`<div class="pc-kids">${my.map(s=>`<div class="pc-kid">${s.photo_url?`<img src="${esc(s.photo_url)}" alt="">`:''}<div><b>${esc(s.full_name)}</b><small>${esc(s.roll_number)} · ${esc(LB('classes',s.class_id))} · ${esc(LB('semesters',s.semester_id))}</small></div></div>`).join('')||'<small>No linked children yet.</small>'}</div>`}
 else if(cid){const r=S.role;
  if(['hod','class_teacher','subject_teacher','principal'].includes(r)){const [{data:al},{data:ct},{data:dp}]=await Promise.all([sb.from('subject_assignments').select('subject_id,class_id').eq('college_id',cid).eq('teacher_id',uid),sb.from('classes').select('id,name').eq('college_id',cid).eq('class_teacher_id',uid),sb.from('departments').select('name').eq('college_id',cid).eq('hod_user_id',uid)]);
   add('HOD of',(dp||[]).map(d=>d.name).join(', '));add('Class teacher of',(ct||[]).map(k=>clsName(k.name)).join(', '));
   const sj=[...new Set((al||[]).map(a=>LB('subjects',a.subject_id)+' ('+LB('classes',a.class_id)+')'))];add('Subjects taught',sj.length?sj.length+' — '+sj.slice(0,4).join(', ')+(sj.length>4?' …':''):'');
   const depts=[...new Set((al||[]).map(a=>LB('departments',LK.subjects?.[a.subject_id]?.department_id)).filter(Boolean))];add('Department',depts.join(', '))}
 }
 add('Member since',u?.created_at?fdate(u.created_at):'');
 return `<div class="panel pcard"><div class="pc-av">${ini}</div><div class="pc-main"><div class="pc-h"><h3>${esc(u?.full_name||S.name)}</h3><span class="pill n">${esc(RL(S.role))}</span></div>
  <div class="pc-grid">${kv.map(([k,v])=>`<div><small>${esc(k)}</small><b>${esc(v)}</b></div>`).join('')}</div>${extra}</div></div>`}
