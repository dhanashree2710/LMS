setTimeout(()=>{$('#splash').classList.add('out');setTimeout(()=>location.replace(sessionStorage.getItem('lms')?'pages/dashboard.html':'login.html'),650)},2900);
