/* ===== password management (super admin, admins, class teacher) ===== */
async function passwords(){
 const cq=new URLSearchParams(location.search).get('c');
 if(S.role==='super_admin'&&!cq){const {data:cs}=await sb.from('colleges').select('*').order('name');
  const cn=await Promise.all((cs||[]).map(c=>cnt('user_roles',c.id)));
  $('#view').innerHTML=`<div class="panel"><h3>Choose a college</h3><small style="color:var(--mut)">Open a college to view its users and reset their passwords.</small></div><div class="grid">${(cs||[]).map((c,i)=>`<div class="col" data-c="${c.id}"><div class="crest" style="width:52px;height:52px;font-size:18px;margin-bottom:12px;background:var(--soft)">${crest(c)}</div><h3>${esc(c.name)}</h3><small>College ID ${esc(c.code)}<br>${cn[i]} users</small><br><span class="tag">Manage passwords</span></div>`).join('')||'<div class="empty">No colleges yet.</div>'}</div>`;
  document.querySelectorAll('[data-c]').forEach(d=>d.onclick=()=>location.href='passwords.html?c='+d.dataset.c);return}
 const cid=S.role==='super_admin'?cq:S.college_id;
 let q=sb.from('user_roles').select('user_id,role,college_id').eq('college_id',cid);
 if(S.role==='class_teacher')q=q.in('role',['student','parent']);
 const {data:rs,error}=await q;if(error)throw error;const ids=[...new Set(rs.map(r=>r.user_id))];
 const {data:us}=ids.length?await sb.from('users').select('id,full_name,email').in('id',ids):{data:[]};
 const rm=Object.fromEntries(rs.map(r=>[r.user_id,r.role]));
 $('#view').innerHTML=`<div class="panel" data-ac="1"><div class="bar2">${S.role==='super_admin'?'<a href="passwords.html" class="btn ghost sm" style="text-decoration:none">All colleges</a>':''}<input id="sq" placeholder="Search name or email…"><button class="btn ghost sm" id="pwx">⬇ Excel</button><button class="btn ghost sm" id="pwp">⬇ PDF</button></div><div class="tw"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>New password</th><th></th></tr></thead><tbody id="tb">
 ${(us||[]).map(u=>`<tr><td>${esc(u.full_name)}</td><td>${esc(u.email)}</td><td>${(rm[u.id]||'').replace(/_/g,' ')}</td><td><input data-p="${u.id}" type="text" autocomplete="new-password" placeholder="New password (min 6)" style="min-width:160px;padding:8px"></td><td><button class="btn sm" data-s="${u.id}">Update</button></td></tr>`).join('')}</tbody></table></div>
 ${us?.length?'':'<div class="empty">No users to show.</div>'}</div>`;
 $('#sq').oninput=e=>document.querySelectorAll('#tb tr').forEach(tr=>tr.classList.toggle('hide',!tr.textContent.toLowerCase().includes(e.target.value.toLowerCase())));
 if($('#xu'))$('#xu').onclick=()=>dl({Users:(us||[]).map(u=>({name:u.full_name,email:u.email,role:rm[u.id]}))},'users.xlsx');
 document.querySelectorAll('[data-s]').forEach(b=>b.onclick=async()=>{const inp=b.closest('tr')?.querySelector('[data-p]')||document.querySelector(`[data-p="${b.dataset.s}"]`),v=inp.value.trim();if(v.length<6){inp.focus();return toast('Type a new password of at least 6 characters in this row first',1)}b.disabled=true;
  const {error}=await sb.from('users').update({password:v,updated_at:new Date().toISOString()}).eq('id',b.dataset.s);b.disabled=false;error?toast(error.message,1):(toast('Password updated for '+(us.find(u=>u.id===b.dataset.s)?.full_name||'user')),inp.value='')});
 const ulist=()=>(us||[]).map(u=>({Name:u.full_name,Email:u.email,Role:(rm[u.id]||'').replace(/_/g,' ')}));$('#pwx').onclick=()=>dl({Users:Object.assign(ulist(),{__raw:1})},'users_and_logins.xlsx');$('#pwp').onclick=()=>pdfTable('Users and logins',[['Users',Object.assign(ulist(),{__raw:1})]],'users_and_logins.pdf')}

