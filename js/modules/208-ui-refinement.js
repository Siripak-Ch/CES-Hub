// CES Hub V22.9 — final UI refinement: reference spacing + no actions on Home/Management Overview.
(function(w,d){'use strict';
  var VERSION='V22.9';
  function cleanNoActionViews(){
    ['portal','management_overview'].forEach(function(tab){
      var view=d.getElementById('view-'+tab);if(!view)return;
      view.querySelectorAll('.ces-global-header-actions-v225,.ces-global-header-actions-v226').forEach(function(n){n.remove();});
      view.setAttribute('data-ces-no-auto-actions','1');
    });
    var portalRefresh=d.querySelector('#view-portal .ces-portal-refresh-v186');
    if(portalRefresh) portalRefresh.classList.add('ces-v229-hidden-home-resync');
  }
  function normalizeOuterSpacing(){
    d.querySelectorAll('#app-main-content > [id^="view-"]').forEach(function(view){
      view.classList.add('ces-v229-view-spacing');
    });
    ['view-ot','view-memo_workorder','view-car_booking','view-van_booking'].forEach(function(id){var v=d.getElementById(id);if(v)v.classList.add('ces-v229-job-reference-spacing');});
  }
  function run(){cleanNoActionViews();normalizeOuterSpacing();d.documentElement.setAttribute('data-ces-ui-refinement',VERSION);}
  function init(){run();var root=d.getElementById('app-main-content');if(root&&w.MutationObserver)new MutationObserver(function(){setTimeout(run,20);}).observe(root,{childList:true,subtree:true});w.addEventListener('ces:tab-changed',run);w.CES_UI_V229={version:VERSION,normalize:run};}
  if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window,document);
