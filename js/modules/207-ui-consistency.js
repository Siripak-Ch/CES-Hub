// CES Hub V22.8 — UI consistency normalizer
// Keeps function headers, tabs, filters, icons and controls visually aligned across every mounted module.
(function(w,d){'use strict';
  var VERSION='V22.8';
  var raf=0;
  var tabSelectors=[
    '[role="tablist"]','.ces-segmented-control','.ces-team-segmented','.ces-period-segmented',
    '.sp-tabs','.ces-inventory-mode-tabs','.ces-health-filter-tabs','.ces-car-workspace-tabs-v204',
    '.ces-car-workspace-tabs-v222','.ces-ot-team-tabs','.ces-training-plan-tabs','.ces-weekly-view-tabs',
    '.ces-ai-k-tabs-v225'
  ].join(',');
  var filterSelectors=[
    '[data-ces-filter-panel]','.stockpro-filter-card','.vehicle-summary-filter-bar','.ces-ot-filter-card',
    '.ces-mwo-filter-card','.csv5-inventory-filters','.csv5-dashboard-filters','.csv7-contract-filters',
    '.ces-portal-csi-filter-v186'
  ].join(',');

  function arr(x){return Array.prototype.slice.call(x||[]);} 
  function text(n){return String((n&&n.textContent)||'').replace(/\s+/g,' ').trim().toLowerCase();}
  function isVisibleView(v){return v && !v.classList.contains('hidden');}

  function normalizeHeader(view){
    if(!view || view.id==='view-portal') return;
    var h=view.querySelector(':scope > .ces-function-header,:scope > [data-ces-function-header="1"],:scope > .ces-standard-header,.stockpro-shell > .stockpro-header-card.ces-function-header,.stockpro-shell > .stockpro-header-card[data-ces-function-header="1"]');
    if(!h){
      var title=view.querySelector('h1,h2');
      var cur=title;
      while(cur&&cur.parentElement&&cur.parentElement!==view) cur=cur.parentElement;
      h=cur&&cur.parentElement===view?cur:null;
    }
    if(!h) return;
    h.classList.add('ces-v228-main-header','ces-function-header');
    h.setAttribute('data-ces-function-header','1');
    var t=h.querySelector('h1,h2,h3');
    if(t){t.classList.add('ces-function-title','ces-v228-header-title');}
    var subtitle=null;
    if(t&&t.parentElement) subtitle=t.parentElement.querySelector(':scope > p');
    if(!subtitle) subtitle=h.querySelector('.ces-function-subtitle,.ces-standard-subtitle,.ces-page-subtitle');
    if(subtitle) subtitle.classList.add('ces-function-subtitle','ces-v228-header-subtitle');
    var icon=h.querySelector('.ces-function-icon,[data-ces-function-icon="1"],.ces-page-header-icon-v15,.stockpro-icon,.ces-booking-header-icon,.ces-home-header-icon,.ces-mwo-title-icon');
    if(icon) icon.classList.add('ces-function-icon','ces-v228-header-icon');

    arr(h.children).forEach(function(child){
      if(!child.querySelector) return;
      if(child.querySelector('button,a,select,input,label') && !(t&&child.contains(t))){
        child.classList.add('ces-function-actions','ces-v228-header-actions');
      }
    });
    arr(h.querySelectorAll('button,a')).forEach(function(btn){
      btn.classList.add('ces-v228-action-control');
      var hasText=String(btn.textContent||'').trim().length>0;
      if(!hasText && btn.querySelector('i,svg')) btn.classList.add('ces-v228-icon-button');
      var fp=(text(btn)+' '+String(btn.title||'')+' '+String(btn.getAttribute('aria-label')||'')).toLowerCase();
      if(/reset filter|clear filter/.test(fp)){
        btn.classList.remove('ces-action-delete');
        btn.classList.add('ces-action-neutral','ces-filter-reset-v228');
        var i=btn.querySelector('i'); if(i)i.className='fas fa-rotate-left';
      }
    });
  }

  function normalizeTabs(view){
    arr(view.querySelectorAll(tabSelectors)).forEach(function(rail){
      if(rail.closest('#sidebar-menu')) return;
      rail.classList.add('ces-v228-tab-rail');
      arr(rail.querySelectorAll(':scope > button,:scope > a,:scope > [role="tab"]')).forEach(function(btn){
        btn.classList.add('ces-v228-tab-button');
      });
    });
  }

  function normalizeFilters(view){
    var panels=arr(view.querySelectorAll(filterSelectors));
    var anchorIds=['kpi-filter-search','s-filter-year','m-filter-month','act-search','health-api-search','training-team-filter','filter-year','monthly-report-year-v226','car-book-search','van-year-filter-v55'];
    anchorIds.forEach(function(id){
      var anchor=view.querySelector('#'+id); if(!anchor) return;
      var node=anchor.parentElement, depth=0;
      while(node && node!==view && depth<4){
        var controls=node.querySelectorAll('select,input:not([type="hidden"]):not([type="file"])');
        if(controls.length>=2 && !node.closest('.ces-function-header,[data-ces-function-header="1"]')){panels.push(node);break;}
        node=node.parentElement; depth++;
      }
    });
    panels.filter(function(panel,index,list){return panel&&list.indexOf(panel)===index;}).forEach(function(panel){
      if(panel.closest('.swal2-container,.fixed[role="dialog"]')) return;
      panel.classList.add('ces-v228-filter-panel');
      arr(panel.querySelectorAll('input:not([type="hidden"]):not([type="file"]),select,textarea')).forEach(function(c){
        c.classList.add('ces-v228-filter-control');
      });
      arr(panel.querySelectorAll('button,a')).forEach(function(btn){
        btn.classList.add('ces-v228-filter-button');
        var fp=(text(btn)+' '+String(btn.title||'')+' '+String(btn.getAttribute('aria-label')||'')).toLowerCase();
        if(/reset filter|clear filter/.test(fp) || btn.classList.contains('ces-stock-filter-reset-v226') || btn.classList.contains('ces-filter-reset-word-v227')){
          btn.classList.remove('ces-action-delete');
          btn.classList.add('ces-action-neutral','ces-filter-reset-v228');
          var i=btn.querySelector('i'); if(i)i.className='fas fa-rotate-left';
        }
      });
    });
  }

  function normalizeIcons(view){
    arr(view.querySelectorAll('button,a')).forEach(function(btn){
      if(btn.closest('#sidebar-menu')) return;
      var i=btn.querySelector(':scope > i');
      if(i){i.classList.add('ces-v228-control-icon');}
      var onlyIcon=!String(btn.textContent||'').trim() && !!btn.querySelector('i,svg');
      if(onlyIcon && (btn.closest('.ces-function-header,[data-ces-function-header="1"]') || btn.classList.contains('ces-standard-icon-btn'))){
        btn.classList.add('ces-v228-icon-button');
      }
    });
  }

  function normalizeView(view){
    if(!view || !view.id || view.id.indexOf('view-')!==0) return;
    view.classList.add('ces-v228-view');
    normalizeHeader(view); normalizeTabs(view); normalizeFilters(view); normalizeIcons(view);
  }
  function run(){
    raf=0;
    if(w.CES_UI && typeof w.CES_UI.normalize==='function'){try{w.CES_UI.normalize();}catch(ignore){}}
    arr(d.querySelectorAll('#app-main-content [id^="view-"]')).forEach(normalizeView);
    d.documentElement.setAttribute('data-ces-ui-standard',VERSION);
  }
  function schedule(){if(raf)return;raf=(w.requestAnimationFrame||function(cb){return setTimeout(cb,16);})(run);}
  function init(){
    run();
    var root=d.getElementById('app-main-content');
    if(root&&w.MutationObserver){new MutationObserver(schedule).observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class','aria-selected']});}
    w.addEventListener('ces:tab-changed',schedule);
    w.addEventListener('resize',schedule,{passive:true});
    w.CES_UI_V228={version:VERSION,normalize:run,schedule:schedule};
  }
  if(d.readyState==='loading') d.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})(window,document);
