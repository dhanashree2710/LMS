if(sessionStorage.getItem('lms'))location.replace('pages/dashboard.html');
$('#eye').innerHTML=EYE;
$('#eye').onclick=()=>{const p=$('#pw'),s=p.type==='password';p.type=s?'text':'password';$('#eye').innerHTML=s?EYEOFF:EYE};
$('#lf').onsubmit=async e=>{e.preventDefault();const b=$('#lb'),er=$('#le');if(b.disabled)return;er.textContent='';b.disabled=true;b.innerHTML='<span class="spin sm"></span> Signing in…';
 try{
  const identifier=$('#em').value.trim();let u=null;let lookupError=null;
  if(!identifier)throw Error('Please enter your email or student ID.');
  if(!$('#pw').value)throw Error('Please enter your password.');
  const byEmail=await sb.from('users').select('id,full_name,email,is_active').eq('email',identifier.toLowerCase()).eq('password',$('#pw').value).maybeSingle();
  if(byEmail.error)lookupError=byEmail.error;else u=byEmail.data;
  if(!u){const byRoll=await sb.from('students').select('user_id').eq('roll_number',identifier).maybeSingle();if(byRoll.error)lookupError=byRoll.error;else if(byRoll.data?.user_id){const byUser=await sb.from('users').select('id,full_name,email,is_active').eq('id',byRoll.data.user_id).eq('password',$('#pw').value).maybeSingle();if(byUser.error)lookupError=byUser.error;else u=byUser.data}}
  if(lookupError)throw lookupError;
  if(!u)throw Error('Wrong email, student ID or password. Please check and try again.');
  if(!u.is_active)throw Error('This account has been disabled. Contact your college admin.');
  const {data:r,error:e2}=await sb.from('user_roles').select('role,college_id,colleges(*)').eq('user_id',u.id).eq('is_active',true).limit(1);
  if(e2)throw e2;
  if(!r.length)throw Error('No role is assigned to this account. Contact your college admin.');
  const x=r[0];
  if(x.colleges&&x.colleges.status==='suspended')throw Error('This college account is suspended. Contact support.');
  S={id:u.id,name:u.full_name,email:u.email,role:x.role,college_id:x.college_id,college:x.colleges};
  sessionStorage.setItem('lms',JSON.stringify(S));
  if(typeof toast==='function')toast('Signed in successfully');
  location.href='pages/dashboard.html';
 }catch(x){
  const msg=(typeof cleanMsg==='function'?cleanMsg(x.message):x.message)||'Sign in failed. Please try again.';
  er.textContent=msg;
  if(typeof toast==='function')toast(msg,1);
 }finally{if(!S||!sessionStorage.getItem('lms')){b.disabled=false;b.textContent='Sign in'}}};

