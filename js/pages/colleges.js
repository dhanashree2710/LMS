/* ===== super admin: colleges ===== */
async function colleges(){
 const {data,error}=await sb.from('colleges').select('*').order('created_at',{ascending:false});if(error)throw error;
 $('#view').innerHTML=`<div class="panel"><h3 style="margin-bottom:8px">Register a college</h3><form id="cf" class="form">
 <div><label>College name</label><input name="name" required></div><div><label>College ID (auto if blank)</label><input name="code" placeholder="e.g. COL1234"></div>
 <div><label>Email</label><input name="email" type="email"></div><div><label>Phone</label><input name="phone"></div><div><label>Address</label><input name="address"></div>
 <div><label>Admin name</label><input name="an" required></div><div><label>Admin email</label><input name="ae" type="email" required></div><div><label>Admin temporary password</label><input name="ap" required minlength="6"></div>
 <div style="grid-column:1/-1"><label>Enabled modules</label><div class="chk">${MODS.map(m=>`<label><input type="checkbox" name="mod_${m[0]}" checked>${m[1]}</label>`).join('')}</div></div>
 <div><button class="btn">Create college</button></div></form></div>
 <div class="grid">${data.map(c=>`<div class="col" data-c="${c.id}"><div class="crest" style="width:52px;height:52px;font-size:18px;margin-bottom:12px;background:var(--bg)">${crest(c)}</div><h3>${esc(c.name)}</h3><small>Code ${esc(c.code)}<br>${esc(c.contact_email||'')}</small><br><span class="tag ${c.status==='active'?'':'s'}">${c.status}</span></div>`).join('')||'<div class="empty">No colleges yet.</div>'}</div>`;
 document.querySelectorAll('[data-c]').forEach(d=>d.onclick=()=>location.href='colleges.html?id='+d.dataset.c);
 $('#cf').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);
  try{const {data:c,error}=await sb.from('colleges').insert({name:f.get('name'),code:(f.get('code')||'COL'+Math.floor(1000+Math.random()*9000)).trim().toUpperCase(),settings:{modules:Object.fromEntries(MODS.map(m=>[m[0],f.get('mod_'+m[0])==='on']))},contact_email:f.get('email')||null,contact_phone:f.get('phone')||null,address:f.get('address')||null}).select().single();if(error)throw error;
   await mkUser({full_name:f.get('an'),email:f.get('ae'),password:f.get('ap'),role:'college_admin',college_id:c.id});const msg=`College: ${c.name}\nCollege ID: ${c.code}\nLogin: ${location.origin}${location.pathname.replace(/pages\/.*$/,'')}login.html\nAdmin email: ${f.get('ae').toLowerCase()}\nTemporary password: ${f.get('ap')}\n\nPlease sign in and change your password.`;confetti();const m=modal(`<h3>College created</h3><p>Share this invitation with the college admin.</p><pre>${esc(msg)}</pre><button class="btn" id="cpy">Copy invitation</button> <a class="btn ghost" style="text-decoration:none" href="mailto:${esc(f.get('ae'))}?subject=${encodeURIComponent('Your LMS account')}&body=${encodeURIComponent(msg)}">Send by email</a>`);m.querySelector('#cpy').onclick=()=>{navigator.clipboard.writeText(msg);toast('Copied')};m.querySelector('.mx').addEventListener('click',colleges)}catch(x){toast(x.message,1)}}}

const COLL_TABLES=['academic_years','programs','departments','classes','subjects','students','attendance','assignments','exams','internal_marks','clubs','competitions','activity_marks','admission_applications','announcements'];
async function collegeDetail(id){
 const {data:c,error}=await sb.from('colleges').select('*').eq('id',id).single();if(error)throw error;
 const stats=await Promise.all(['students','user_roles','programs','departments','classes','subjects','attendance'].map(async t=>[t,await cnt(t,id)]));
 /* college admins for this college */
 const {data:adminRoles}=await sb.from('user_roles').select('id,user_id,role,is_active').eq('college_id',id).eq('role','college_admin');
 const adminIds=(adminRoles||[]).map(r=>r.user_id);
 const {data:adminUsers}=adminIds.length?await sb.from('users').select('id,full_name,email,phone,is_active').in('id',adminIds):{data:[]};
 const um=Object.fromEntries((adminUsers||[]).map(u=>[u.id,u]));

 $('#view').innerHTML=`<div class="panel">
 <div class="bar2" style="justify-content:space-between;flex-wrap:wrap;gap:10px">
  <a href="colleges.html" class="btn ghost sm" style="text-decoration:none">← All colleges</a>
  <span style="display:flex;flex-wrap:wrap;gap:8px">
   <a href="college-profile.html?id=${id}" class="btn ghost sm" style="text-decoration:none">Edit details</a>
   <button class="btn sm" id="dx">Download data</button>
   <button class="btn sm ${c.status==='active'?'red':''}" id="tg">${c.status==='active'?'Suspend':'Activate'}</button>
   <button class="btn red sm" id="rmc">Remove college</button>
  </span>
 </div>
 <div style="display:flex;gap:18px;align-items:flex-start;flex-wrap:wrap;margin-top:8px">
  <div class="crest" style="width:72px;height:72px;font-size:22px;background:var(--soft)">${crest(c)}</div>
  <div style="flex:1;min-width:200px">
   <h3 style="font-size:24px;margin:0">${esc(c.name)}</h3>
   <p style="color:var(--mut);margin:6px 0">Code <b>${esc(c.code)}</b> · ${esc(c.contact_email||'no email')} · ${esc(c.contact_phone||'no phone')}<br>${esc(c.address||'')}</p>
   <span class="tag ${c.status==='active'?'':'s'}">${c.status}</span>
  </div>
 </div>
</div>

<div class="panel">
 <div class="phd"><h3>College administrators</h3>
  <button class="btn sm" id="addAdm">+ Add admin</button>
 </div>
 <div class="tw"><table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th></th></tr></thead>
 <tbody id="admTb">${(adminRoles||[]).map(r=>{const u=um[r.user_id]||{};return`<tr data-rid="${r.id}" data-uid="${r.user_id}">
  <td>${esc(u.full_name||'—')}</td><td>${esc(u.email||'')}</td><td>${esc(u.phone||'—')}</td>
  <td><span class="tag ${u.is_active===false||r.is_active===false?'s':''}">${u.is_active===false||r.is_active===false?'inactive':'active'}</span></td>
  <td style="white-space:nowrap">
   <button class="btn ghost sm" data-edit="${r.id}">Edit</button>
   <button class="btn red sm" data-rm="${r.id}">Remove</button>
  </td></tr>`}).join('')||'<tr><td colspan="5" class="empty">No college admin yet. Add one above.</td></tr>'}</tbody></table></div>
</div>

<div class="panel"><h3 style="margin-bottom:10px">Access & modules</h3><div class="chk" id="mods">${MODS.map(m=>`<label><input type="checkbox" data-m="${m[0]}" ${(c.settings?.modules||{})[m[0]]===false?'':'checked'}>${m[1]}</label>`).join('')}</div><br><button class="btn sm" id="ms">Save access</button></div>
<div class="stats">${stats.map(s=>`<div class="stat"><b data-n="${s[1]}">0</b><span>${s[0].replace('_',' ')}</span></div>`).join('')}</div>`;
 countUp();

 $('#ms').onclick=async()=>{const mo={};document.querySelectorAll('#mods input').forEach(i=>mo[i.dataset.m]=i.checked);const {error}=await sb.from('colleges').update({settings:{...(c.settings||{}),modules:mo}}).eq('id',id);toast(error?error.message:'Access saved',!!error)};
 $('#tg').onclick=async()=>{const {error}=await sb.from('colleges').update({status:c.status==='active'?'suspended':'active'}).eq('id',id);error?toast(error.message,1):collegeDetail(id)};
 $('#dx').onclick=()=>exportCollege(c);

 /* Remove entire college */
 $('#rmc').onclick=async()=>{
  if(!confirm(`Permanently remove college "${c.name}"?\n\nThis will remove the college record. Related data may remain in the database.\nThis cannot be undone.`))return;
  const code=prompt('Type the college code to confirm removal:', '');
  if(code!==c.code)return toast('Code did not match. College was not removed.',1);
  try{
   /* deactivate admin roles first */
   await sb.from('user_roles').update({is_active:false}).eq('college_id',id);
   const {error}=await sb.from('colleges').delete().eq('id',id);
   if(error)throw error;
   toast('College removed');location.href='colleges.html';
  }catch(x){toast(x.message,1)}
 };

 /* Add admin */
 $('#addAdm').onclick=()=>{
  const m=modal(`<h3>Add college admin</h3>
   <form id="af" class="form" style="grid-template-columns:1fr">
    <div><label>Full name</label><input name="n" required></div>
    <div><label>Email</label><input name="e" type="email" required></div>
    <div><label>Phone</label><input name="p"></div>
    <div><label>Temporary password</label><input name="w" required minlength="6"></div>
    <div><button class="btn">Create admin</button></div>
   </form>`);
  m.querySelector('#af').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);
   try{
    await mkUser({full_name:f.get('n'),email:f.get('e'),phone:f.get('p'),password:f.get('w'),role:'college_admin',college_id:id});
    toast('Admin created');m.remove();collegeDetail(id);
   }catch(x){toast(x.message,1)}
  };
 };

 /* Edit / Remove admin */
 document.querySelectorAll('[data-edit]').forEach(bt=>bt.onclick=()=>{
  const rid=bt.dataset.edit,r=(adminRoles||[]).find(x=>x.id===rid),u=um[r.user_id]||{};
  const m=modal(`<h3>Edit college admin</h3>
   <form id="ef" class="form" style="grid-template-columns:1fr">
    <div><label>Full name</label><input name="n" required value="${esc(u.full_name||'')}"></div>
    <div><label>Email</label><input name="e" type="email" required value="${esc(u.email||'')}"></div>
    <div><label>Phone</label><input name="p" value="${esc(u.phone||'')}"></div>
    <div><label>New password (leave blank to keep)</label><input name="w" minlength="6" placeholder="Optional"></div>
    <div><label>Account active</label><select name="active"><option value="true">Active</option><option value="false">Inactive</option></select></div>
    <div><button class="btn">Save changes</button></div>
   </form>`);
  m.querySelector('[name=active]').value=String(u.is_active!==false&&r.is_active!==false);
  m.querySelector('#ef').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);
   try{
    const patch={full_name:f.get('n'),email:f.get('e').toLowerCase(),phone:f.get('p')||null,is_active:f.get('active')==='true',updated_at:new Date().toISOString()};
    if(f.get('w'))patch.password=f.get('w');
    const a=await sb.from('users').update(patch).eq('id',r.user_id);if(a.error)throw a.error;
    await sb.from('profiles').update({full_name:f.get('n'),phone:f.get('p')||null,email:f.get('e').toLowerCase()}).eq('id',r.user_id);
    await sb.from('user_roles').update({is_active:f.get('active')==='true'}).eq('id',rid);
    toast('Admin updated');m.remove();collegeDetail(id);
   }catch(x){toast(x.message,1)}
  };
 });

 document.querySelectorAll('[data-rm]').forEach(bt=>bt.onclick=async()=>{
  if(!confirm('Remove this college admin role? The user account will remain but lose admin access to this college.'))return;
  const {error}=await sb.from('user_roles').delete().eq('id',bt.dataset.rm);
  error?toast(error.message,1):(toast('Admin removed'),collegeDetail(id));
 });
}

/* professional multi-sheet college workbook: one sheet per module, readable columns */
async function exportCollege(c){toast('Preparing workbook…');const id=c.id;await loadLK(id);const G=async(t,f)=>{let q=sb.from(t).select('*').eq('college_id',id).limit(5000);if(f)q=f(q);const {data}=await q;return data||[]};
 const [yrs,prg,dep,cls,sem,sub,stu,att,asg,exm,imk,adm,ann,clb,cmp,rl,fee,pgs]=await Promise.all(['academic_years','programs','departments','classes','semesters','subjects','students','attendance','assignments','exams','internal_marks','admission_applications','announcements','clubs','competitions','user_roles','student_fees','academic_progression'].map(t=>G(t)));
 const ids=rl.map(r=>r.user_id),{data:us}=ids.length?await sb.from('users').select('id,full_name,email,phone').in('id',ids):{data:[]},um=Object.fromEntries((us||[]).map(u=>[u.id,u]));
 const cnt=(a,k,v)=>a.filter(x=>x[k]===v).length,role=r=>r.replace(/_/g,' ').replace(/\b\w/g,m=>m.toUpperCase());
 const summary=[['College Name',c.name],['College ID',c.code],['Status',c.status],['Email',c.contact_email||''],['Phone',c.contact_phone||''],['Address',c.address||''],['Academic Years',yrs.length],['Courses',prg.length],['Departments',dep.length],['Classes',cls.length],['Subjects',sub.length],['Students',stu.length],['Staff & Users',rl.length],['Attendance Records',att.length],['Report Generated',fdate(new Date())]].map(([a,b])=>({Particulars:a,Details:b}));
 const staff=rl.map(r=>({Name:um[r.user_id]?.full_name||'',Email:um[r.user_id]?.email||'',Phone:um[r.user_id]?.phone||'',Role:role(r.role),Status:r.is_active===false?'Inactive':'Active'}));
 const sh={Summary:Object.assign(summary,{__raw:1}),'Staff & Users':Object.assign(staff,{__raw:1}),'Academic Years':yrs,Courses:prg.map(p=>({...p,students:cnt(stu,'program_id',p.id),classes:cnt(cls,'program_id',p.id)})),Departments:dep,Classes:cls.map(k=>({...k,students:cnt(stu,'class_id',k.id)})),Semesters:sem,Subjects:sub,Students:stu,Admissions:adm,Attendance:att,Assignments:asg,Exams:exm,'Internal Marks':imk,Results:pgs,Fees:fee,Announcements:ann,Clubs:clb,Competitions:cmp};
 await dl(sh,`${c.code}_college_data.xlsx`)}
