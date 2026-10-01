// CES Hub Clean Release — Request Access contrast + LINE OA production UI guard.
(function(w,d){'use strict';
  var VERSION='Clean Release';
  function style(){
    if(d.getElementById('ces-v231-style')) return;
    var s=d.createElement('style');s.id='ces-v231-style';s.textContent=`
      #registerModal .ces-register-head,#registerModal .ces-register-head *{color:#fff!important}
      #registerModal .ces-register-head p{color:#dbeafe!important}
      #registerModal .ces-register-head button,#registerModal .ces-register-head button i{color:#fff!important}
    `;d.head.appendChild(s);
  }
  function cleanRegister(){
    var modal=d.getElementById('registerModal'); if(!modal || modal.classList.contains('hidden')) return;
    var head=modal.querySelector('.ces-register-head'); if(head) head.querySelectorAll('h1,h2,h3,h4,p,span,i,button').forEach(function(el){el.style.setProperty('color', el.tagName==='P'?'#dbeafe':'#fff','important');});
  }
  function init(){style();cleanRegister();if(w.MutationObserver)new MutationObserver(function(){cleanRegister();}).observe(d.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});d.documentElement.setAttribute('data-ces-line-oa',VERSION);}
  if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window,document);
