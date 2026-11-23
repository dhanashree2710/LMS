/* Page shell: session guard, collapsible drawer, header (search, theme, bell, profile) */
Object.assign(IC,{list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',search:'<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/>',theme:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',bell:'<path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0"/>',panel:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',dl:'<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>',chev:'<path d="M9 18l6-6-6-6"/>'});
/* page loader: top progress bar + veil on in-app navigation */
function loaderInit(){if($('#pgbar'))return;document.body.insertAdjacentHTML('afterbegin','<div id="pgbar"></div><div id="pgveil"><div><div class="spin" style="margin:auto"></div><div class="loadtxt">Loading…</div></div></div>');
 const bar=$('#pgbar');requestAnimationFrame(()=>bar.classList.add('run'));
 document.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(!a||e.defaultPrevented||e.ctrlKey||e.metaKey||e.shiftKey||a.target==='_blank'||a.hasAttribute('download'))return;const h=a.getAttribute('href');if(!h||h.startsWith('#')||/^(https?:|mailto:|tel:)/.test(h)||!/\.html(\?|$)/.test(h))return;
  bar.classList.remove('done');bar.classList.add('run');setTimeout(()=>$('#pgveil').classList.add('on'),120)});
 addEventListener('pageshow',()=>{$('#pgveil').classList.remove('on')})}
function loaderDone(){const b=$('#pgbar');if(!b)return;b.classList.remove('run');b.classList.add('done');setTimeout(()=>{b.classList.remove('done');b.style.width=''},600)}
const SKEL='<div class="skel"><div class="sk line"></div><div class="row"><div class="sk"></div><div class="sk"></div><div class="sk"></div><div class="sk"></div></div><div class="sk tall"></div></div>';
function boot(key,fn){
 loaderInit();
 const raw=sessionStorage.getItem('lms');if(!raw){location.href='../login.html';return}
 S=JSON.parse(raw);const my=navFor();
 if(!my.includes(key)&&!(key==='college'&&S.role==='super_admin')){location.href='dashboard.html';return}
 if(localStorage.getItem('lms-collapsed')==='1')document.body.classList.add('collapsed');
 $('#side').innerHTML='<div id="sc"></div><nav id="nav"></nav><a href="#" id="out" class="so">'+ic('logout',18)+'<span>Sign out</span></a>';
 if(!$('#bk')){const b=document.createElement('div');b.id='bk';document.body.appendChild(b);b.onclick=()=>document.body.classList.remove('nav-open')}
 paintSide();
 const curMod=modOf(key);
 const lk=k=>`<a href="${FILE[k]}" class="${k===key?'on':''}" title="${P[k].title}">${ic(ICON[k])}<span>${P[k].title}</span></a>`;
 const lm=m=>{const ks=modPages(m,my);return `<a href="${FILE[ks[0]]}" class="${m===curMod?'on':''}" title="${esc(modLabel(m,my))}">${ic(m.i)}<span>${esc(modLabel(m,my))}</span></a>`};
 let h=TOP.filter(k=>my.includes(k)).map(lk).join(''),sec='';
 for(const m of MODULES){if(!modPages(m,my).length)continue;if(m.sec!==sec&&S.role!=='super_admin'){sec=m.sec;h+=`<div class="ph">${sec}</div>`}h+=lm(m)}
 $('#nav').innerHTML=h;
 // Persist drawer scroll AFTER nav is built so the selected tab stays in view
 const navScrollKey='lms-nav-scroll-'+S.id;
 const navEl=$('#nav');
 if(navEl){
  const saved=+(sessionStorage.getItem(navScrollKey)||0);
  navEl.scrollTop=saved;
  const active=navEl.querySelector('a.on');
  if(active){requestAnimationFrame(()=>{active.scrollIntoView({block:'nearest',behavior:'instant'});sessionStorage.setItem(navScrollKey,String(navEl.scrollTop))})}
  navEl.addEventListener('scroll',()=>sessionStorage.setItem(navScrollKey,String(navEl.scrollTop)),{passive:true});
  navEl.querySelectorAll('a[href]').forEach(a=>a.addEventListener('click',()=>sessionStorage.setItem(navScrollKey,String(navEl.scrollTop))));
 }
 const grp=curMod?{t:modLabel(curMod,my)}:null,role=S.role==='super_admin'?'Platform administrator':S.role.replace(/_/g,' '),ini=(S.name||'U').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
 const home=my.includes('notices')?'announcements.html':'dashboard.html';
 $('.top').innerHTML=`<button class="ib" id="menu" aria-label="Open menu">${ic('menu',22)}</button><button class="ib" id="collapse" aria-label="Collapse sidebar" title="Collapse sidebar">${ic('panel',20)}</button>
 <div class="tt"><small>${esc(S.college?S.college.name:'Platform')} ${ic('chev',11)} ${esc(grp?grp.t:'Overview')}</small><h2 id="ttl">${P[key].title}</h2></div>
 <div class="srch">${ic('search',17)}<input id="gs" placeholder="Search pages…" autocomplete="off"><div class="sres" id="sres"></div></div>
 <button class="ib" id="thm" aria-label="Toggle theme" title="Light / dark">${ic('theme',20)}</button>
 <div class="rel"><button class="ib" id="bell" aria-label="Notifications" title="Notifications">${ic('bell',20)}<i class="dot hide" id="bdot"></i></button><div class="np" id="np"></div></div>
 <div class="who" id="who"><span class="av">${esc(ini)}</span><span class="wt"><b>${esc(S.name)}</b><small>${esc(role)}</small></span><div class="dd" id="dd"><div>${esc(S.email||'')}</div><a href="${FILE.dash}">${ic('grid',16)} Dashboard</a><a href="#" id="out2">${ic('logout',16)} Sign out</a></div></div>`;
 document.title=P[key].title+' · '+(S.college?S.college.name:'LMS Console');
 const out=e=>{e.preventDefault();sessionStorage.clear();location.href='../login.html'};$('#out').onclick=out;$('#out2').onclick=out;
 $('#menu').onclick=()=>document.body.classList.toggle('nav-open');
 $('#collapse').onclick=()=>localStorage.setItem('lms-collapsed',document.body.classList.toggle('collapsed')?'1':'0');
 $('#thm').onclick=()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
 $('#who').onclick=e=>{if(!e.target.closest('#dd a'))$('#dd').classList.toggle('on')};document.addEventListener('click',e=>{if(!e.target.closest('#who'))$('#dd').classList.remove('on');if(!e.target.closest('.srch'))$('#sres').classList.remove('on')});
 $('#gs').oninput=e=>{const q=e.target.value.trim().toLowerCase(),r=$('#sres');const hits=q?my.filter(k=>P[k]&&P[k].title.toLowerCase().includes(q)).slice(0,7):[];r.innerHTML=hits.map(k=>`<a href="${FILE[k]}">${ic(ICON[k],16)}${P[k].title}</a>`).join('')||(q?'<div style="padding:12px;color:var(--mut);font-size:13px">No pages found</div>':'');r.classList.toggle('on',!!q)};
 $('#gs').onkeydown=e=>{if(e.key==='Enter'){const a=document.querySelector('#sres a');if(a)location.href=a.getAttribute('href')}};
 const sibs=curMod?modPages(curMod,my):[];
 if(!$('#backbar')&&key!=='dash')$('.top').insertAdjacentHTML('afterend','<div id="backbar"><button class="btn ghost sm" id="back">← Back</button><button class="btn ghost sm" id="refreshPage" title="Refresh this page">↻ Refresh</button>'+(sibs.length>1?'<nav class="mtabs" aria-label="'+esc(curMod.t)+'">'+sibs.map(k=>'<a href="'+FILE[k]+'" class="'+(k===key?'on':'')+'">'+ic(ICON[k],15)+P[k].title+'</a>').join('')+'</nav>':'<span>'+esc(P[key].title)+'</span>')+'</div>');
 const at=document.querySelector('.mtabs a.on');if(at)at.scrollIntoView({block:'nearest',inline:'center'});
 if($('#back'))$('#back').onclick=()=>{
  // Prefer in-app drill back stack when available
  if(typeof back==='function'&&(typeof CUR!=='undefined'&&CUR||typeof HIST!=='undefined'&&HIST.length||typeof _listRestore!=='undefined'&&_listRestore)){back();return}
  if(document.referrer.includes(location.host)&&history.length>1)history.back();else location.href=FILE.dash;
 };
 if($('#refreshPage'))$('#refreshPage').onclick=()=>{
  if(typeof CUR!=='undefined'&&CUR&&document.querySelector('.mdl')){CUR();return}
  if(typeof CUR!=='undefined'){CUR=null;HIST=[]}document.querySelectorAll('.mdl').forEach(m=>m.remove());
  const y=window.scrollY;LKP=null;loadLK();run(fn).then(()=>window.scrollTo({top:y,behavior:'instant'}));
 };
 loadLK();bellInit();
 run(fn);setTimeout(noticeFlash,900)}
async function run(fn){$('#view').innerHTML=SKEL;
 try{await ensureProfile();await fn();if(typeof autoCards==='function')autoCards();tilt();loaderDone()}catch(e){loaderDone();$('#view').innerHTML=`<div class="panel err">${esc(e.message||e)}<br><small>If this mentions "permission", "policy" or a missing table/column, run supabase/04_cleanup_and_fix.sql in the Supabase SQL editor.</small></div>`}}
/* subtle 3D tilt on cards */
function tilt(){if(matchMedia('(pointer:coarse)').matches)return;document.querySelectorAll('.col,.tile,.kpi').forEach(c=>{c.onmousemove=e=>{const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;c.style.transform=`perspective(700px) rotateY(${x*8}deg) rotateX(${-y*8}deg) translateY(-5px)`};c.onmouseleave=()=>c.style.transform=''})}

async function bellInit(){const np=$('#np');let f=[];try{f=await feed(12)}catch(e){}
 const seen=+localStorage.getItem('lms-seen-'+S.id)||0;if(f[0]&&new Date(f[0].t)>seen)$('#bdot').classList.remove('hide');
 $('#bell').onclick=e=>{e.stopPropagation();np.innerHTML='<h4>Notifications</h4>'+feedHtml(f);np.classList.toggle('on');$('#bdot').classList.add('hide');localStorage.setItem('lms-seen-'+S.id,Date.now())};
 document.addEventListener('click',e=>{if(!e.target.closest('.np'))np.classList.remove('on')})}

/* ===== announcements flash: scrolling notice bar + pop-up for notices not seen yet ===== */
async function noticeFlash(){try{aiFab()}catch(e){}if(!S||!S.college_id||S.role==='super_admin'||$('#ntk'))return;
 try{const {data}=await sb.from('announcements').select('id,title,body,created_at,target_roles,program_id,class_id,semester_id,subject_id,target_student_ids,target_department_id').eq('college_id',S.college_id).order('created_at',{ascending:false}).limit(20);
  let rows=data||[];if(typeof annFilter==='function'){try{await (LKP||loadLK());rows=await annFilter(rows)}catch(e){}}rows=rows.slice(0,8);if(!rows.length)return;
  const key='lms_seen_ann_'+S.id;let seen=[];try{seen=JSON.parse(localStorage.getItem(key)||'[]')}catch(e){}
  if(sessionStorage.getItem('lms_ntk_off')!=='1'){const items=rows.map(a=>`<span><b>${esc(a.title)}</b>${a.body?' — '+esc(String(a.body).slice(0,110)):''}<i>${fdate(a.created_at)}</i></span>`).join('');
   (document.querySelector('#backbar')||document.querySelector('.top')).insertAdjacentHTML('afterend',`<div id="ntk" role="marquee"><b class="ntk-l">📢 Notices</b><div class="ntk-w"><div class="ntk-m">${items}${items}</div></div><a href="announcements.html">View all</a><button aria-label="Hide notices" id="ntkx">✕</button></div>`);
   $('#ntkx').onclick=()=>{sessionStorage.setItem('lms_ntk_off','1');$('#ntk').remove()}}
  const fresh=rows.filter(a=>!seen.includes(a.id)&&Date.now()-new Date(a.created_at)<45*864e5).slice(0,3);if(!fresh.length)return;
  const box=document.createElement('div');box.id='nflash';box.innerHTML=`<div class="nf-h"><b>📢 New notice${fresh.length>1?'s':''}</b><button aria-label="Close">✕</button></div>${fresh.map(a=>`<div class="nf-i"><b>${esc(a.title)}</b><p>${esc(String(a.body||'').slice(0,220))}</p><small>${fdate(a.created_at)}</small></div>`).join('')}<div class="nf-f"><a class="btn sm" href="announcements.html">Open notices</a><button class="btn ghost sm" id="nfok">Got it</button></div>`;
  document.body.appendChild(box);try{localStorage.setItem(key,JSON.stringify([...new Set([...seen,...rows.map(a=>a.id)])].slice(-200)))}catch(e){}const close=()=>{box.classList.add('out');setTimeout(()=>box.remove(),400)};
  box.querySelector('.nf-h button').onclick=close;box.querySelector('#nfok').onclick=close;setTimeout(()=>{if(box.isConnected)close()},20000)}catch(e){}}
