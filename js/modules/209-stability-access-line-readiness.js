// CES Hub V23.0 — access/mail stability + stock layout + popup contrast/readiness UI.
(function(w,d){'use strict';
  var VERSION='V23.0';

  function ensureStyle(){
    if(d.getElementById('ces-v230-ui-style')) return;
    var st=d.createElement('style'); st.id='ces-v230-ui-style'; st.textContent=`
      /* Infusion Pump Dashboard: keep the 3 product summary cards in one row on normal desktop width. */
      @media (min-width:900px){
        #view-stock_dashboard #sdModelCards.stockpro-model-grid,
        #view-stock_dashboard .stockpro-model-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:14px!important}
      }
      @media (max-width:899px){#view-stock_dashboard .stockpro-model-grid{grid-template-columns:1fr!important}}

      /* Accessories: reserve enough space for quantity stepper + action buttons. */
      #view-inventory .sp-acc-row-v17{
        grid-template-columns:42px minmax(180px,1.55fr) 72px 68px 104px minmax(125px,1fr) minmax(250px,270px)!important;
        gap:10px!important;
      }
      #view-inventory .acc-actions{gap:7px!important;min-width:250px!important;justify-content:flex-end!important;overflow:visible!important}
      #view-inventory .acc-actions input{width:52px!important;min-width:52px!important;height:36px!important;font-size:13px!important;padding:0 4px!important}
      #view-inventory .acc-mini{width:36px!important;min-width:36px!important;height:36px!important;border-radius:10px!important;font-size:13px!important;flex:0 0 36px!important}
      #view-inventory #siAccCards{overflow-x:auto!important;padding-bottom:2px}
      @media(max-width:1100px){
        #view-inventory .sp-acc-row-v17{grid-template-columns:42px minmax(190px,1fr) 70px 64px 100px minmax(120px,1fr) 250px!important;min-width:900px!important}
      }
      @media(max-width:760px){
        #view-inventory .sp-acc-row-v17{grid-template-columns:42px 1fr!important;min-width:0!important}
        #view-inventory .acc-actions{grid-column:1/-1!important;justify-content:flex-start!important;min-width:0!important;flex-wrap:wrap!important}
      }

      /* Cart sits above AI CES instead of occupying the same bottom-right slot. */
      #siCartFab{right:18px!important;bottom:86px!important;z-index:10010!important}
      @media(max-width:640px){#siCartFab{right:10px!important;bottom:70px!important}}

      /* Popup contrast: only dark/colored popup surfaces receive this class. */
      .ces-v230-popup-dark{color:#fff!important}
      .ces-v230-popup-dark > h1,.ces-v230-popup-dark > h2,.ces-v230-popup-dark > h3,.ces-v230-popup-dark > h4,
      .ces-v230-popup-dark > p,.ces-v230-popup-dark > span,.ces-v230-popup-dark > small,.ces-v230-popup-dark > strong,
      .ces-v230-popup-dark > label,.ces-v230-popup-dark > i,
      .ces-v230-popup-dark .swal2-title,.ces-v230-popup-dark .swal2-html-container,
      .ces-v230-popup-dark > div > h1,.ces-v230-popup-dark > div > h2,.ces-v230-popup-dark > div > h3,
      .ces-v230-popup-dark > div > p,.ces-v230-popup-dark > div > span,.ces-v230-popup-dark > div > small,
      .ces-v230-popup-dark > div > strong,.ces-v230-popup-dark > div > label,.ces-v230-popup-dark > div > i{color:#fff!important}
      .ces-v230-popup-dark input,.ces-v230-popup-dark textarea,.ces-v230-popup-dark select{color:#0f172a!important}
    `; d.head.appendChild(st);
  }

  function moveCartAboveAi(){
    var fab=d.getElementById('siCartFab'); if(!fab) return;
    fab.style.setProperty('right', w.innerWidth<=640?'10px':'18px','important');
    fab.style.setProperty('bottom', w.innerWidth<=640?'70px':'86px','important');
    fab.style.setProperty('top','auto','important');
    fab.style.setProperty('z-index','10010','important');
  }

  function patchLegacyCartForce(){
    if(w.__CES_V230_CART_PATCHED) return;
    var base=w.siForceCartRight;
    if(typeof base==='function'){
      w.siForceCartRight=function(){try{base.apply(this,arguments);}finally{moveCartAboveAi();}};
      w.__CES_V230_CART_PATCHED=true;
    }
  }

  function rgbParts(value){var m=String(value||'').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);return m?[+m[1],+m[2],+m[3],m[4]==null?1:+m[4]]:null;}
  function luminance(rgb){function c(v){v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);}return .2126*c(rgb[0])+.7152*c(rgb[1])+.0722*c(rgb[2]);}
  function normalizePopupContrast(){
    var roots=d.querySelectorAll('.swal2-popup,[id$="Modal"] > div,[id^="modal-"] > div,#siCartDrawer');
    roots.forEach(function(root){
      [root].concat(Array.from(root.querySelectorAll('header,section,div'))).forEach(function(el){
        if(!(el instanceof HTMLElement)) return;
        var cs=w.getComputedStyle(el), rgb=rgbParts(cs.backgroundColor);
        if(!rgb || rgb[3]<.45) return;
        var rect=el.getBoundingClientRect(); if(rect.width<90 || rect.height<32) return;
        if(luminance(rgb)<.34) el.classList.add('ces-v230-popup-dark');
        else el.classList.remove('ces-v230-popup-dark');
      });
    });
  }

  function run(){ensureStyle();patchLegacyCartForce();moveCartAboveAi();normalizePopupContrast();d.documentElement.setAttribute('data-ces-v230',VERSION);}
  function init(){
    run(); setTimeout(run,400); setTimeout(run,1200);
    if(w.MutationObserver)new MutationObserver(function(){setTimeout(run,20);}).observe(d.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
    w.addEventListener('resize',moveCartAboveAi); w.addEventListener('ces:tab-changed',function(){setTimeout(run,50);});
    w.CES_V230_UI={version:VERSION,refresh:run};
  }
  if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window,document);
