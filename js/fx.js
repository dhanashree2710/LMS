/* theme (light/dark) — applied before paint */
(function(){const t=localStorage.getItem('lms-theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');document.documentElement.dataset.theme=t;document.body&&0})();
const setTheme=t=>{document.documentElement.dataset.theme=t;localStorage.setItem('lms-theme',t)};
document.addEventListener('DOMContentLoaded',()=>{if(document.getElementById('lf')){const f=document.querySelector('.formw');const b=document.createElement('button');b.className='tg';b.type='button';b.title='Toggle theme';b.textContent='🌓';b.onclick=()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');f.appendChild(b);b.style.cssText='position:absolute;top:22px;right:22px'}});
