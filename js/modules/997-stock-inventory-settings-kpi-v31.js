/* CES Hub V31 — Stock contract detail, Inventory tab stability, Settings/KPI Drive UI */
(function(){
  'use strict';
  var VERSION='V31';
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function el(id){return document.getElementById(id);}
  function dateObj(v){if(!v)return null;var d=new Date(v);return isNaN(d)?null:d;}
  function fmtDate(v){var d=dateObj(v);return d?d.toLocaleDateString('th-TH',{day:'2-digit',month:'short',year:'numeric'}):'-';}
  function stockRows(){
    try{if(typeof SI!=='undefined'&&Array.isArray(SI.inv)&&SI.inv.length)return SI.inv;}catch(e){}
    var b=window.CES_STOCK_BOOTSTRAP_V6;return b&&Array.isArray(b.devices)?b.devices:[];
  }
  function injectStyle(){
    if(el('ces-v31-style'))return;
    var s=document.createElement('style');s.id='ces-v31-style';s.textContent=`
      #view-report .ces-report-icon-v31{border:0!important;box-shadow:0 5px 14px rgba(15,23,42,.06)!important;background:#fff!important;background-image:none!important;color:#003DA5!important}
      #view-inventory .ces-v31-hidden{display:none!important}
      #view-inventory #siEquipFilters,#view-inventory #siAccFilters,#view-inventory #siEquipKpiGrid,#view-inventory #siAccKpiGrid,#view-inventory #siEquipSection,#view-inventory #siAccSection{transition:none!important}
      .ces-v31-contract-summary{display:grid;grid-template-columns:2fr repeat(3,1fr);gap:10px;margin:0 0 14px;text-align:left}
      .ces-v31-contract-summary>div{background:#f8fafc;border:1px solid #e2e8f0;border-radius:13px;padding:11px 13px;min-width:0}
      .ces-v31-contract-summary small{display:block;color:#64748b;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}
      .ces-v31-contract-summary strong{display:block;color:#0f172a;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .ces-v31-contract-wrap{border:1px solid #dbe5f1;border-radius:15px;overflow:auto;max-height:520px;background:#fff}
      .ces-v31-contract-table{width:100%;min-width:1050px;border-collapse:separate;border-spacing:0;text-align:left;font-size:12px}
      .ces-v31-contract-table th{position:sticky;top:0;z-index:2;background:#f4f8fc;color:#52647a;text-transform:uppercase;font-size:10px;letter-spacing:.04em;padding:11px 12px;border-bottom:1px solid #dbe5f1;white-space:nowrap}
      .ces-v31-contract-table td{padding:10px 12px;border-bottom:1px solid #edf2f7;color:#334155;vertical-align:middle;white-space:nowrap}
      .ces-v31-contract-table tbody tr:hover td{background:#f8fbff}
      .ces-v31-contract-table .model{white-space:normal;min-width:145px}.ces-v31-contract-table .action{white-space:normal;min-width:180px}
      .ces-v31-contract-status{display:inline-flex;padding:4px 8px;border-radius:999px;font-size:10px;font-weight:900}.ces-v31-contract-status.ok{background:#dcfce7;color:#047857}.ces-v31-contract-status.late{background:#fee2e2;color:#b91c1c}
      @media(max-width:800px){.ces-v31-contract-summary{grid-template-columns:1fr 1fr}}
    `;document.head.appendChild(s);
  }

  function applyInventoryTab(tab){
    tab=tab==='acc'?'acc':'equip';
    try{if(typeof SI!=='undefined')SI.tab=tab;}catch(e){}
    var equip=tab==='equip';
    [['siTabEquip',equip],['siTabAcc',!equip]].forEach(function(x){var n=el(x[0]);if(n)n.classList.toggle('active',x[1]);});
    [['siEquipFilters',equip],['siEquipKpiGrid',equip],['siEquipSection',equip],['siAccFilters',!equip],['siAccKpiGrid',!equip],['siAccSection',!equip]].forEach(function(x){
      var n=el(x[0]);if(!n)return;n.classList.toggle('hidden',!x[1]);n.classList.toggle('ces-v31-hidden',!x[1]);n.style.setProperty('display',x[1]?'':'none',x[1]?'':'important');if(x[1])n.style.removeProperty('display');
    });
  }
  var priorSwitch=window.si_switchTab;
  window.si_switchTab=function(tab){
    tab=tab==='acc'?'acc':'equip';applyInventoryTab(tab);
    try{if(typeof si_applyFilters==='function')si_applyFilters();else if(typeof priorSwitch==='function')priorSwitch(tab);}catch(e){console.warn('[Inventory V31 tab]',e);}
    requestAnimationFrame(function(){applyInventoryTab(tab);});
  };
  var priorInit=window.initStockInventoryModule;
  if(typeof priorInit==='function')window.initStockInventoryModule=function(force){
    var desired='equip';try{if(typeof SI!=='undefined'&&SI.tab)desired=SI.tab;}catch(e){}
    var result=priorInit.apply(this,arguments);
    var restore=function(){var title=document.querySelector('#view-inventory .stockpro-title-wrap h1');if(title)title.textContent='Inventory';applyInventoryTab(desired);};
    if(result&&typeof result.then==='function')return result.then(function(v){restore();setTimeout(restore,80);return v;},function(e){restore();throw e;});
    restore();setTimeout(restore,80);return result;
  };
  var inventoryView=el('view-inventory');if(inventoryView){new MutationObserver(function(){if(!inventoryView.classList.contains('hidden')){var tab='equip';try{if(typeof SI!=='undefined'&&SI.tab)tab=SI.tab;}catch(e){}applyInventoryTab(tab);}}).observe(inventoryView,{attributes:true,attributeFilter:['class']});}

  // Rental contract detail is owned by 140-stock-dashboard.js / 991 runtime stock layer.
  // Do not override it in this mixed Stock/Settings/KPI compatibility patch.

  window.CES_KPI_DRIVE_DEFAULTS=window.CES_KPI_DRIVE_DEFAULTS||{};
  var baseKpiSwitch=window.switchKpiTab;
  if(typeof baseKpiSwitch==='function')window.switchKpiTab=function(team){
    var out=baseKpiSwitch.apply(this,arguments);setTimeout(function(){
      var cfg=(typeof globalConfig!=='undefined'&&globalConfig)?globalConfig:{};
      var defaults=window.CES_KPI_DRIVE_DEFAULTS||{};
      var generic=el('kpi-drive-link'),title=el('kpi-drive-title'),ehs=el('kpi-drive-ehs-link'),env=el('kpi-drive-env-link');
      [generic,ehs,env].forEach(function(n){if(n){n.classList.add('hidden');n.classList.remove('flex');}});
      if(team==='EHS'){
        var eu=String(cfg.KPI_DRIVE_EHS||defaults.EHS||'').trim(),vu=String(cfg.KPI_DRIVE_ENV||defaults.ENV||cfg.KPI_DRIVE_EHS||defaults.EHS||'').trim();
        if(ehs&&eu&&eu!=='#'){ehs.href=eu;ehs.classList.remove('hidden');ehs.classList.add('flex');}
        if(env&&vu&&vu!=='#'){env.href=vu;env.classList.remove('hidden');env.classList.add('flex');}
      }else if(generic&&title){
        var url=String(cfg['KPI_DRIVE_'+team]||defaults[team]||'').trim();
        if(url&&url!=='#'){generic.href=url;title.textContent='Drive '+team;generic.classList.remove('hidden');generic.classList.add('flex');}
      }
    },0);return out;
  };

  window.CES_STOCK_SETTINGS_KPI_V31_RECHECK=function(){
    var visible=['siEquipFilters','siAccFilters','siEquipSection','siAccSection'].filter(function(id){var n=el(id);return n&&getComputedStyle(n).display!=='none';});
    var out={version:VERSION,reportIconBorder:el('view-report')?getComputedStyle(document.querySelector('#view-report .ces-report-icon-v31')).borderStyle:'-',inventoryTitle:(document.querySelector('#view-inventory h1')||{}).textContent||'',inventoryVisibleBlocks:visible,contractDetail:typeof window.sd_contractDetail==='function',kpiDriveDefaults:window.CES_KPI_DRIVE_DEFAULTS};console.log('[CES V31 Recheck]',out);return out;
  };
  injectStyle();
  document.addEventListener('DOMContentLoaded',function(){injectStyle();applyInventoryTab('equip');});
})();
