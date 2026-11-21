/* ===== staff ===== */
async function staff(){
 const {data:rs,error}=await sb.from('user_roles').select('id,user_id,role,is_active').eq('college_id',S.college_id).neq('role','student');if(error)throw error;
 const ids=rs.map(r=>r.user_id),{data:us}=ids.length?await sb.from('users').select('id,full_name,email,phone').in('id',ids):{data:[]};
 const um=Object.fromEntries((us||[]).map(u=>[u.id,u])),RO=ROLES.filter(r=>r!=='college_admin'&&r!=='student');
 $('#view').innerHTML=`<div class="panel"><h3 style="margin-bottom:8px">Add staff or parent login</h3><form id="sf" class="form">
 <div><label>Full name</label><input name="n" required></div><div><label>Email</label><input name="e" type="email" required></div>
 <div><label>Phone</label><input name="p"></div><div><label>Password</label><input name="w" required></div>
 <div><label>Role</label><select name="r">${RO.map(r=>`<option value="${r}">${r.replace(/_/g,' ')}</option>`).join('')}</select></div>
 <div><button class="btn" type="submit">Create login</button></div></form></div>
 <div class="panel" data-ac="1"><div class="bar2"><input id="sq" placeholder="Search…"><button class="btn ghost sm" id="stx">⬇ Excel</button><button class="btn ghost sm" id="stp">⬇ PDF</button><button class="btn ghost sm" id="tp">📄 Template</button><label class="btn ghost sm up">⬆ Upload sheet<input id="up" type="file" accept=".xlsx,.xls,.csv" hidden></label></div>
 <div class="tw"><table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th></th></tr></thead><tbody id="tb">
 ${rs.map(r=>{const u=um[r.user_id]||{};return`<tr><td>${esc(u.full_name)}</td><td>${esc(u.email)}</td><td>${esc(u.phone||'—')}</td><td>${r.role.replace(/_/g,' ')}${r.is_active===false?' <span class="pill s">inactive</span>':''}</td><td style="white-space:nowrap"><button class="btn ghost sm" data-e="${r.id}">Edit</button> <button class="btn red sm" data-x="${r.id}">Remove</button></td></tr>`}).join('')}</tbody></table></div>
 ${rs.length?'':'<div class="empty">No staff yet. Add one above or upload a sheet.</div>'}</div>`;
 $('#sq').oninput=e=>document.querySelectorAll('#tb tr').forEach(tr=>tr.classList.toggle('hide',!tr.textContent.toLowerCase().includes(e.target.value.toLowerCase())));
 $('#tp').onclick=()=>dl({Template:[{full_name:'',email:'',phone:'',password:'',role:'subject_teacher'}]},'staff_template.xlsx');
 $('#up').onchange=async e=>{const file=e.target.files[0];if(!file)return;toast('Reading sheet…');
  try{const wb=XLSX.read(await file.arrayBuffer(),{type:'array'}),js=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});let ok=0;const bad=[];
   for(const [i,raw] of js.entries()){const r={};for(const k in raw)r[String(k).trim().toLowerCase().replace(/\s+/g,'_')]=String(raw[k]).trim();
    try{if(!r.full_name||!r.email||!r.password)throw Error('name, email and password are required');const ro=r.role||'subject_teacher';if(!RO.includes(ro))throw Error('invalid role "'+ro+'"');
     await mkUser({full_name:r.full_name,email:r.email,phone:r.phone,password:r.password,role:ro,college_id:S.college_id});ok++}catch(x){bad.push('Row '+(i+2)+': '+x.message)}}
   toast(ok+' uploaded'+(bad.length?', '+bad.length+' skipped':''),bad.length&&!ok);if(bad.length)alert('Skipped rows:\n'+bad.slice(0,15).join('\n'));staff()}catch(x){toast(x.message,1)}};
 const slist=()=>rs.map(r=>{const u=um[r.user_id]||{};return {Name:u.full_name||'',Email:u.email||'',Phone:u.phone||'',Role:r.role.replace(/_/g,' '),Status:r.is_active===false?'Inactive':'Active'}});
 $('#stx').onclick=()=>dl({'Staff & users':Object.assign(slist(),{__raw:1})},'staff_and_users.xlsx');$('#stp').onclick=()=>pdfTable('Staff & users',[['Staff & users',Object.assign(slist(),{__raw:1})]],'staff_and_users.pdf');
 document.querySelectorAll('[data-e]').forEach(bt=>bt.onclick=()=>{const r=rs.find(x=>x.id===bt.dataset.e),u=um[r.user_id]||{};
  const m=modal(`<h3>Edit staff / user</h3><form id="ef" class="form"><div><label>Full name</label><input name="n" required value="${esc(u.full_name||'')}"></div><div><label>Email</label><input name="e" type="email" required value="${esc(u.email||'')}"></div>
   <div><label>Phone</label><input name="p" value="${esc(u.phone||'')}"></div><div><label>Role</label><select name="r">${RO.map(x=>`<option value="${x}" ${x===r.role?'selected':''}>${x.replace(/_/g,' ')}</option>`).join('')}</select></div>
   <div><label>Account</label><select name="a"><option value="true" ${r.is_active!==false?'selected':''}>Active</option><option value="false" ${r.is_active===false?'selected':''}>Deactivated</option></select></div>
   <div><label>New password <small>(leave blank to keep)</small></label><input name="w" minlength="6"></div>
   <div style="grid-column:1/-1;display:flex;gap:8px;justify-content:flex-end"><button type="button" class="btn ghost" id="ecx">Cancel</button><button class="btn" type="submit">Update</button></div></form>`,true);
  m.querySelector('#ecx').onclick=()=>m.remove();
  m.querySelector('#ef').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),b=e.target.querySelector('[type=submit]');b.disabled=true;
   try{const up={full_name:f.get('n'),email:String(f.get('e')).toLowerCase(),phone:f.get('p')||null,updated_at:new Date().toISOString()};if(f.get('w'))up.password=f.get('w');
    const a=await sb.from('users').update(up).eq('id',r.user_id);if(a.error)throw a.error;
    const pr=await sb.from('profiles').update({full_name:up.full_name,email:up.email,phone:up.phone}).eq('id',r.user_id);if(pr.error)throw pr.error;
    const b2=await sb.from('user_roles').update({role:f.get('r'),is_active:f.get('a')==='true'}).eq('id',r.id);if(b2.error)throw b2.error;
    m.remove();toast('Updated');LKP=null;loadLK();staff()}catch(x){toast(x.message,1);b.disabled=false}}});
 document.querySelectorAll('[data-x]').forEach(bt=>bt.onclick=async()=>{if(!confirm('Remove this person from the college?'))return;const {error}=await sb.from('user_roles').delete().eq('id',bt.dataset.x);error?toast(error.message,1):(toast('Removed'),staff())});
 $('#sf').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);
  try{await mkUser({full_name:f.get('n'),email:f.get('e'),phone:f.get('p'),password:f.get('w'),role:f.get('r'),college_id:S.college_id});toast('Login created');staff()}catch(x){toast(x.message,1)}}}

