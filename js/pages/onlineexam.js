/* ===== Online exams: staff set up an MCQ paper on any exam; students write it in a timed window ===== */
const OX_KEY=id=>'lms-ox-'+id+'-'+S.id;
const oxQs=e=>Array.isArray(e?.blueprint?.questions)?e.blueprint.questions:[];
const oxOnline=e=>e&&e.mode==='online'&&oxQs(e).length;
const oxWhen=v=>v?new Date(v).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):'—';
const oxState=e=>{const n=Date.now(),a=e.start_time?new Date(e.start_time).getTime():0,b=e.end_time?new Date(e.end_time).getTime():Infinity;return n<a?'upcoming':n>b?'closed':'open'};
const oxLocal=v=>v?new Date(new Date(v).getTime()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,16):'';

async function onlineExams(){document.getElementById('oxp')?.remove();
 const host=document.createElement('div');host.className='panel';host.id='oxp';
 const view=$('#view');if(!view)return;view.insertBefore(host,view.querySelector('.panel')||null);
 const stu=S.role==='student';
 let me=null;if(stu){me=(await myStudents())[0];if(!me){host.innerHTML='<p>No student record linked to this login.</p>';return}}
 let q=sb.from('exams').select('*').eq('college_id',S.college_id).order('exam_date',{ascending:false});
 if(stu)q=q.eq('class_id',me.class_id);
 const {data,error}=await q;
 if(error){if(/column .*mode|blueprint|start_time/i.test(error.message)){host.innerHTML='<p class="pill s" style="white-space:normal;display:block">Online exams need new columns. Run <b>supabase/04_cleanup_and_fix.sql</b> once in the Supabase SQL editor.</p>';return}throw error}
 let ex=data||[];
 if(!stu){const sc=await scope();if(!sc.all)ex=ex.filter(e=>sc.subjects.includes(e.subject_id)||sc.classes.includes(e.class_id))}
 if(stu){
  const on=ex.filter(oxOnline),{data:res}=await sb.from('exam_results').select('exam_id,marks_obtained,status').eq('student_id',me.id);
  const done=Object.fromEntries((res||[]).map(r=>[r.exam_id,r]));
  host.innerHTML=`<div class="phd"><h3>🖥️ Online exams</h3></div>${on.length?`<div class="tw"><table><thead><tr><th>Exam</th><th>Subject</th><th>Window</th><th>Duration</th><th>Questions</th><th>Status</th><th></th></tr></thead><tbody>${on.map(e=>{const st=done[e.id]?'submitted':oxState(e);
   return `<tr><td><b>${esc(e.name)}</b></td><td>${esc(LB('subjects',e.subject_id))}</td><td>${oxWhen(e.start_time)} → ${oxWhen(e.end_time)}</td><td>${e.duration_minutes||'—'} min</td><td>${oxQs(e).length}</td>
   <td><span class="pill ${st==='open'?'ok':st==='submitted'?'':'s'}">${st==='submitted'?'Submitted':st==='open'?'Open now':st==='upcoming'?'Not started yet':'Closed'}</span></td>
   <td>${st==='open'?`<button class="btn sm" data-ox="${e.id}">Start exam</button>`:st==='submitted'&&e.show_result_immediately?`${done[e.id].marks_obtained??''} / ${e.max_marks??''}`:''}</td></tr>`}).join('')}</tbody></table></div>`:'<p style="color:var(--mut)">No online exams for your class right now.</p>'}`;
  host.querySelectorAll('[data-ox]').forEach(b=>b.onclick=()=>oxTake(ex.find(e=>e.id===b.dataset.ox),me));
  return}
 // staff
 const canW=typeof canWrite!=='function'||canWrite('exams');
 host.innerHTML=`<div class="phd"><h3>🖥️ Online exams</h3><span style="color:var(--mut);font-size:13px">Turn any exam into a timed online MCQ paper. Students write it from their Examinations tab; marks go to Marks entry for verification.</span></div>
 <div class="bar2"><select id="oxsel"><option value="">Choose an exam…</option>${ex.map(e=>`<option value="${e.id}">${esc(e.name)} · ${esc(LB('subjects',e.subject_id))} · ${esc(LB('classes',e.class_id))}${oxOnline(e)?' ✓ online':''}</option>`).join('')}</select>${canW?'<button class="btn sm" id="oxset">Set up online paper</button>':''}<button class="btn ghost sm" id="oxres">View submissions</button></div>
 ${ex.filter(oxOnline).length?`<div class="tw"><table><thead><tr><th>Exam</th><th>Class</th><th>Window</th><th>Questions</th><th>Marks</th><th>Status</th></tr></thead><tbody>${ex.filter(oxOnline).map(e=>`<tr><td>${esc(e.name)}</td><td>${esc(LB('classes',e.class_id))}</td><td>${oxWhen(e.start_time)} → ${oxWhen(e.end_time)}</td><td>${oxQs(e).length}</td><td>${e.max_marks??''}</td><td>${{upcoming:'Upcoming',open:'Open now',closed:'Closed'}[oxState(e)]}</td></tr>`).join('')}</tbody></table></div>`:''}`;
 const pick=()=>{const e=ex.find(x=>x.id===$('#oxsel').value);if(!e)toast('Choose an exam first',1);return e};
 if($('#oxset'))$('#oxset').onclick=()=>{const e=pick();if(e)oxBuilder(e)};
 $('#oxres').onclick=()=>{const e=pick();if(e)oxSubmissions(e)};
}

function oxBuilder(e){let Q=oxQs(e).map(x=>({...x}));
 const m=modal(`<h3>Online paper — ${esc(e.name)}</h3><p style="color:var(--mut);font-size:13px;margin:2px 0 10px">${esc(LB('subjects',e.subject_id))} · ${esc(LB('classes',e.class_id))}</p>
 <form id="oxf" class="form"><div><label>Starts at</label><input name="start_time" type="datetime-local" required value="${oxLocal(e.start_time)}"></div><div><label>Ends at</label><input name="end_time" type="datetime-local" required value="${oxLocal(e.end_time)}"></div>
 <div><label>Duration (minutes)</label><input name="duration_minutes" type="number" min="1" required value="${e.duration_minutes||60}"></div><div><label>Marks per question</label><input name="mpq" type="number" min="0.25" step="0.25" value="${oxQs(e)[0]?.marks||1}"></div>
 <div><label>Show score to student after submit</label><select name="show"><option value="false">No — after results are published</option><option value="true"${e.show_result_immediately?' selected':''}>Yes</option></select></div>
 <div style="grid-column:1/-1"><label>Instructions</label><textarea name="instructions" rows="2">${esc(e.instructions||'Answer all questions. Do not refresh or close the page. The paper submits itself when the time is over.')}</textarea></div></form>
 <h4 style="margin:12px 0 6px">Questions <span id="oxn" class="pill"></span></h4>
 <div class="form"><div style="grid-column:1/-1"><label>Question</label><input id="xq"></div>${'ABCD'.split('').map(l=>`<div><label>Option ${l}</label><input id="x${l}"></div>`).join('')}<div><label>Correct</label><select id="xa"><option>A</option><option>B</option><option>C</option><option>D</option></select></div></div>
 <div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0"><button class="btn ghost sm" id="xadd" type="button">+ Add question</button><button class="btn ghost sm" id="xtp" type="button">📄 Template</button><label class="btn ghost sm up">⬆ Upload questions<input type="file" id="xup" accept=".xlsx,.xls,.csv" hidden></label><button class="btn ghost sm" id="xai" type="button">✨ Generate with AI</button></div>
 <div id="xl" class="oxl"></div>
 <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">${oxOnline(e)?'<button class="btn red sm" id="xoff" type="button">Turn off online mode</button>':''}<button class="btn" id="xsave" type="button">Save online paper</button></div>`,1);
 m.querySelector('.mbox').classList.add('xw');const $m=s=>m.querySelector(s);
 const draw=()=>{$m('#oxn').textContent=Q.length;$m('#xl').innerHTML=Q.map((q,i)=>`<div class="qi"><b>${i+1}. ${esc(q.q)}</b>${q.options.map((o,j)=>`<div style="font-size:13px;${j===q.answer?'color:var(--ok);font-weight:600':''}">${'ABCD'[j]}) ${esc(o)}</div>`).join('')}<button class="btn red sm" type="button" data-x="${i}">Remove</button></div>`).join('')||'<p style="color:var(--mut)">No questions yet.</p>';m.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>{Q.splice(+b.dataset.x,1);draw()})};draw();
 const addTyped=()=>{const q=$m('#xq').value.trim(),o=['A','B','C','D'].map(l=>$m('#x'+l).value.trim());const keep=o.filter(Boolean),a='ABCD'.indexOf($m('#xa').value);if(!q&&!keep.length)return false;if(!q||keep.length<2||!o[a]){toast('Type the question, at least 2 options, and make sure the correct option is filled',1);return null}Q.push({q,options:o.filter((x,j)=>x||j<a),answer:a});['xq','xA','xB','xC','xD'].forEach(i=>$m('#'+i).value='');draw();return true};
 $m('#xadd').onclick=addTyped;
 $m('#xtp').onclick=()=>dl({Quiz:[{'Question':'1 byte equals how many bits?','Option A':'4','Option B':'8','Option C':'16','Option D':'32','Correct answer':'B','Marks':1}]},'online_exam_template.xlsx');
 $m('#xup').onchange=async ev=>{const file=ev.target.files[0];ev.target.value='';if(!file)return;try{const d=await impReadFile(file),sh=d.sheets[d.names[0]],h=sh.head.map(impNorm),col=(...k)=>h.findIndex(x=>k.includes(x));
   const ci={q:col('question','questions'),a:col('option_a','a'),b:col('option_b','b'),c:col('option_c','c'),d:col('option_d','d'),ans:col('correct_answer','answer','correct','key'),m:col('marks','mark')};
   if(ci.q<0||ci.a<0||ci.b<0||ci.ans<0)return toast('Use the template: Question, Option A, Option B, Correct answer',1);let n=0,bad=0;
   sh.rows.forEach(r=>{const q=String(r[ci.q]??'').trim(),ops=[ci.a,ci.b,ci.c,ci.d].map(k=>k<0?'':String(r[k]??'').trim()),raw=String(r[ci.ans]??'').trim();let a='ABCD'.indexOf(raw.toUpperCase());if(a<0)a=ops.findIndex(o=>o&&o.toLowerCase()===raw.toLowerCase());
    if(!q||ops.filter(Boolean).length<2||a<0||!ops[a]){if(q)bad++;return}const o={q,options:ops.filter((x,j)=>x||j<a),answer:a};if(ci.m>=0&&+r[ci.m]>0)o.marks=+r[ci.m];Q.push(o);n++});draw();toast(n+' questions added'+(bad?', '+bad+' rows skipped':''))}catch(x){toast(x.message,1)}};
 $m('#xai').onclick=async()=>{const b=$m('#xai');b.disabled=true;b.textContent='Generating…';try{const d=await aiCall('quiz_questions',LB('subjects',e.subject_id)+' — '+e.name,{count:10,context:{class:LB('classes',e.class_id)}});const got=(d.data?.questions||[]).filter(x=>x&&x.q&&Array.isArray(x.options)&&x.options.length>=2&&x.answer>=0&&x.answer<x.options.length).map(x=>({q:String(x.q),options:x.options.slice(0,4).map(String),answer:Math.min(+x.answer,3)}));Q.push(...got);draw();toast(got.length+' questions added — review them before saving')}catch(x){toast(x.message,1)}b.disabled=false;b.textContent='✨ Generate with AI'};
 if($m('#xoff'))$m('#xoff').onclick=async()=>{if(!confirm('Turn off online mode for this exam? Submitted answers are kept.'))return;const {error}=await sb.from('exams').update({mode:'written'}).eq('id',e.id);if(error)return toast(error.message,1);m.remove();toast('Online mode turned off');crudReload()};
 $m('#xsave').onclick=async()=>{if(addTyped()===null)return;const f=new FormData($m('#oxf'));if(!Q.length)return toast('Add at least one question',1);
  if(!f.get('start_time')||!f.get('end_time'))return toast('Set the start and end time',1);const st=new Date(f.get('start_time')),en=new Date(f.get('end_time'));if(en<=st)return toast('End time must be after the start time',1);
  const mpq=+f.get('mpq')||1,qs=Q.map(q=>({...q,marks:q.marks||mpq})),total=qs.reduce((s,q)=>s+q.marks,0);
  const b=$m('#xsave');b.disabled=true;b.textContent='Saving…';
  const {error}=await sb.from('exams').update({mode:'online',start_time:st.toISOString(),end_time:en.toISOString(),duration_minutes:+f.get('duration_minutes')||60,instructions:f.get('instructions'),show_result_immediately:f.get('show')==='true',blueprint:{questions:qs},max_marks:total,total_questions:qs.length,status:'published'}).eq('id',e.id);
  b.disabled=false;b.textContent='Save online paper';if(error)return toast(error.message,1);m.remove();toast('Online paper saved — '+qs.length+' questions, '+total+' marks');crudReload()}}

async function oxSubmissions(e){const {data,error}=await sb.from('exam_results').select('*').eq('exam_id',e.id);if(error)return toast(error.message,1);
 const st=Object.values(LK.students||{}).filter(s=>s.class_id===e.class_id),by=Object.fromEntries((data||[]).map(r=>[r.student_id,r]));
 const rows=st.sort((a,b)=>String(a.roll_number).localeCompare(String(b.roll_number))).map(s=>({'Roll no':s.roll_number,'Student':s.full_name,'Status':by[s.id]?'Submitted':'Not submitted','Marks':by[s.id]?.marks_obtained??'','Out of':e.max_marks??'','Submitted at':by[s.id]?.submitted_at?oxWhen(by[s.id].submitted_at):''}));
 const m=modal(`<h3>Submissions — ${esc(e.name)}</h3><p style="color:var(--mut);font-size:13px">${Object.keys(by).length} of ${st.length} students submitted. Verify and publish marks under Marks.</p><div style="margin:8px 0"><button class="btn ghost sm" id="sx">⬇ Excel</button> <button class="btn ghost sm" id="sp">⬇ PDF</button></div><div class="tw"><table><thead><tr>${Object.keys(rows[0]||{'Roll no':1}).map(k=>`<th>${k}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${Object.values(r).map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`,1);
 m.querySelector('#sx').onclick=()=>dl({[e.name.slice(0,28)]:rows},'online_exam_'+e.name.replace(/\W+/g,'_')+'.xlsx');m.querySelector('#sp').onclick=()=>pdfTable('Online exam — '+e.name,[[e.name,rows]],'online_exam_'+e.name.replace(/\W+/g,'_')+'.pdf')}

function oxTake(e,me){if(!e)return;const qs=oxQs(e);let startAt=+localStorage.getItem(OX_KEY(e.id))||0;
 const begin=()=>{if(!startAt){startAt=Date.now();localStorage.setItem(OX_KEY(e.id),startAt)}
  const end=Math.min(startAt+(e.duration_minutes||60)*6e4,e.end_time?new Date(e.end_time).getTime():Infinity),A={};let sent=false;
  const m=modal(`<div class="ox-top"><h3>${esc(e.name)}</h3><div class="ox-timer" id="oxt">--:--</div></div><p style="color:var(--mut);font-size:13px">${esc(LB('subjects',e.subject_id))} · ${qs.length} questions · ${e.max_marks??''} marks</p>
  <div id="oxq">${qs.map((q,i)=>`<div class="qi ox-q"><b>${i+1}. ${esc(q.q)}</b> <span class="pill">${q.marks||1} mark${(q.marks||1)==1?'':'s'}</span>${q.options.map((o,j)=>`<label class="ox-o"><input type="radio" name="q${i}" value="${j}"> ${'ABCD'[j]}) ${esc(o)}</label>`).join('')}</div>`).join('')}</div>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px"><span id="oxa" style="color:var(--mut);font-size:13px"></span><button class="btn" id="oxs">Submit exam</button></div>`,1);
  m.querySelector('.mbox').classList.add('xw');m.onclick=null;m.querySelector('.mx').onclick=()=>{if(confirm('Leave the exam? The timer keeps running; you can come back until time is over.'))m.remove()};
  const cnt=()=>{m.querySelector('#oxa').textContent=Object.keys(A).length+' of '+qs.length+' answered'};cnt();
  m.querySelectorAll('input[type=radio]').forEach(r=>r.onchange=()=>{A[r.name.slice(1)]=+r.value;cnt()});
  const submit=async auto=>{if(sent)return;if(!auto&&Object.keys(A).length<qs.length&&!confirm((qs.length-Object.keys(A).length)+' question(s) not answered. Submit anyway?'))return;sent=true;clearInterval(t);
   let score=0;qs.forEach((q,i)=>{if(A[i]===q.answer)score+=+(q.marks||1)});
   const row={college_id:S.college_id,exam_id:e.id,student_id:me.id,marks_obtained:score,status:'entered',answers:A,submitted_at:new Date().toISOString()};
   let {error}=await sb.from('exam_results').insert(row);
   if(error&&/answers|submitted_at/.test(error.message)){delete row.answers;delete row.submitted_at;({error}=await sb.from('exam_results').insert(row))}
   if(error){sent=false;return toast(error.message,1)}
   localStorage.removeItem(OX_KEY(e.id));m.remove();modal(`<div class="imp-done"><div class="big">✓</div><h3>Exam submitted${auto?' (time over)':''}</h3><p>${e.show_result_immediately?`Your score: <b>${score} / ${e.max_marks??''}</b>`:'Your marks will appear under Results after your teacher publishes them.'}</p></div>`);crudReload()};
  m.querySelector('#oxs').onclick=()=>submit(false);
  const tick=()=>{const left=end-Date.now();if(left<=0){m.querySelector('#oxt').textContent='00:00';return submit(true)}const s=Math.floor(left/1e3);m.querySelector('#oxt').textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');m.querySelector('#oxt').classList.toggle('low',left<6e4)};
  const t=setInterval(tick,1000);tick()};
 if(startAt){begin();return}
 const m=modal(`<h3>${esc(e.name)}</h3><p>${esc(LB('subjects',e.subject_id))} · ${qs.length} questions · ${e.max_marks??''} marks · ${e.duration_minutes||60} minutes</p><div class="ai-txt" style="margin:10px 0">${esc(e.instructions||'Answer all questions.').replace(/\n/g,'<br>')}</div><p style="font-size:13px;color:var(--mut)">The timer starts when you press Start and does not stop. You can submit only once.</p><button class="btn" id="oxgo">Start now</button>`);
 m.querySelector('#oxgo').onclick=()=>{m.remove();begin()}}

function crudReload(){if(window.__lastCrud)crud(window.__lastCrud).catch(()=>{});else location.reload()}
