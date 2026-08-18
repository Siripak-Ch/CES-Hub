/* CES Hub V31 — final UI integration checks */
(function(){
  'use strict';
  function fixStockAlertBadge(){
    var btn=document.querySelector('#view-stock_dashboard button[onclick="sd_openAlertPopup()"]');
    var badge=document.getElementById('sdAlertHeaderCount');
    if(btn){btn.style.setProperty('position','relative','important');btn.style.setProperty('overflow','visible','important');}
    if(badge&&btn&&badge.parentElement!==btn)btn.appendChild(badge);
  }
  function refreshKpiDriveButtons(){
    try{if(typeof switchKpiTab==='function'&&typeof currentKpiTeam!=='undefined')switchKpiTab(currentKpiTeam||'EHS');}catch(e){}
  }
  var oldSave=window.saveFullSystemConfig;
  if(typeof oldSave==='function'&&!oldSave.__cesV31){
    window.saveFullSystemConfig=function(){var result=oldSave.apply(this,arguments);setTimeout(refreshKpiDriveButtons,800);return result;};
    window.saveFullSystemConfig.__cesV31=true;
  }
  window.CES_OPERATIONS_PERMISSIONS_RECHECK=function(){
    var required=['view-car_booking','view-van_booking','view-team_information','btn-car_booking','btn-van_booking','btn-team_information','kpi-drive-ehs-link','kpi-drive-env-link','cfg-line-token-med','cfg-line-token-lab','cfg-line-token-ehs'];
    var out={version:'V31',missing:required.filter(function(id){return!document.getElementById(id);}),bookingApi:typeof initVehicleBooking==='function',teamInfoApi:typeof initTeamInformation==='function',alertBadgeParent:(document.getElementById('sdAlertHeaderCount')||{}).parentElement&&document.getElementById('sdAlertHeaderCount').parentElement.getAttribute('onclick')};
    console.log('[CES V31 Recheck]',out);return out;
  };
  document.addEventListener('DOMContentLoaded',function(){setTimeout(fixStockAlertBadge,100);});
  new MutationObserver(function(){fixStockAlertBadge();}).observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(fixStockAlertBadge,300);
})();
