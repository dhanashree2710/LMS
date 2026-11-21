/* ===== college profile (logo + details) ===== */
async function collegeProfile(id){
 id=S.role==='super_admin'?(id||new URLSearchParams(location.search).get('id')):S.college_id;const {data:c,error}=await sb.from('colleges').select('*').eq('id',id).single();if(error)throw error;let logo=c.logo_url||null;
 const val=k=>esc(c[k]||'');
 $('#view').innerHTML=`<div class="panel">${S.role==='super_admin'?`<a href="colleges.html?id=${id}" class="btn ghost sm" style="text-decoration:none">← Back</a><br><br>`:''}
 <div class="hero" style="margin-bottom:18px"><div class="crest" id="pv">${crest(c)}</div><div><h2>${esc(c.name)}</h2><p>Edit the college details and logo. They appear on every dashboard of this college.</p></div></div>
 <form id="cp" class="form"><div><label>College name</label><input name="name" required value="${val('name')}"></div><div><label>College code</label><input value="${val('code')}" disabled></div>
 <div><label>Email</label><input name="contact_email" type="email" value="${val('contact_email')}"></div><div><label>Phone</label><input name="contact_phone" value="${val('contact_phone')}"></div>
 <div><label>Address</label><input name="address" value="${val('address')}"></div>
 <div><label>UG programs</label><select name="ug_enabled"><option value="true">Enabled</option><option value="false">Disabled</option></select></div>
 <div><label>PG programs</label><select name="pg_enabled"><option value="true">Enabled</option><option value="false">Disabled</option></select></div>
 <div><label>Logo (PNG or JPG)</label><input type="file" id="lg" accept="image/*"></div><div><button class="btn">Save changes</button></div></form></div>`;
 const f=$('#cp');f.ug_enabled.value=String(c.ug_enabled!==false);f.pg_enabled.value=String(c.pg_enabled!==false);
 $('#lg').onchange=e=>{const file=e.target.files[0];if(!file)return;const im=new Image();im.onload=()=>{const z=document.createElement('canvas');z.width=z.height=160;const x=z.getContext('2d'),m=Math.min(im.width,im.height);x.drawImage(im,(im.width-m)/2,(im.height-m)/2,m,m,0,0,160,160);z.toBlob(async b=>{try{const u=await uploadFile('college-logos',new File([b],'logo.png',{type:'image/png'}));logo=u}catch(x){logo=z.toDataURL('image/png');toast('Bucket college-logos not ready, saved inline',1)}$('#pv').innerHTML=`<img src="${logo}" alt="">`},'image/png')};im.src=URL.createObjectURL(file)};
 f.onsubmit=async e=>{e.preventDefault();const d=new FormData(f),u={name:d.get('name'),contact_email:d.get('contact_email')||null,contact_phone:d.get('contact_phone')||null,address:d.get('address')||null,ug_enabled:d.get('ug_enabled')==='true',pg_enabled:d.get('pg_enabled')==='true',logo_url:logo,updated_at:new Date().toISOString()};
  const {data,error}=await sb.from('colleges').update(u).eq('id',id).select().single();if(error)return toast(error.message,1);
  if(id===S.college_id){S.college=data;sessionStorage.setItem('lms',JSON.stringify(S));paintSide()}toast('College details saved');collegeProfile(id)}}

