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
      var n=el(x[0]);if(!n)return;n.classList.toggle('hidden',!x[1]);n.classList.toggle('ces-v31-hidden',!x[1]);n.style.setProperty('display',x[1]?'grid':'none','important');
    });
  }
  var priorSwitch=window.si_switchTab;
  window.si_switchTab=function(tab){
    tab=tab==='acc'?'acc':'equip';applyInventoryTab(tab);
    try{if(typeof si_applyFilters==='function')si_applyFilters();else if(typeof priorSwitch==='function')priorSwitch(tab);if(tab==='equip'&&typeof si_renderTable==='function')si_renderTable();if(tab==='acc'&&typeof si_renderAccCards==='function')si_renderAccCards();}catch(e){console.warn('[Inventory V31 tab]',e);}
    requestAnimationFrame(function(){applyInventoryTab(tab);});
  };
  var priorInit=window.initStockInventoryModule;
  if(typeof priorInit==='function')window.initStockInventoryModule=function(force){
    var desired='equip';try{if(typeof SI!=='undefined'&&SI.tab)desired=SI.tab;}catch(e){}if(desired!=='acc')desired='equip';
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


(function(){function tab_(t){return t==='acc'?'acc':'dashboard';}function apply_(){var t=tab_(typeof SI!=='undefined'?SI.tab:'dashboard'),d=document.getElementById('siInventoryDashboardCurrent'),af=document.getElementById('siAccFilters'),ak=document.getElementById('siAccKpiGrid'),as=document.getElementById('siAccSection'),ef=document.getElementById('siEquipFilters'),ek=document.getElementById('siEquipKpiGrid'),es=document.getElementById('siEquipSection');[['siTabDashboardCurrent',t==='dashboard'],['siTabAcc',t==='acc']].forEach(function(x){var n=document.getElementById(x[0]);if(n)n.classList.toggle('active',x[1]);});[[d,t==='dashboard'],[af,t==='acc'],[ak,t==='acc'],[as,t==='acc'],[ef,false],[ek,false],[es,false]].forEach(function(x){if(!x[0])return;x[0].classList.toggle('hidden',!x[1]);x[0].style.display=x[1]?'':'none';});if(t==='dashboard'){var a=(typeof SI!=='undefined'&&Array.isArray(SI.acc))?SI.acc:[],pending=0;try{pending=(SI.raw&&SI.raw.kpi&&SI.raw.kpi.pendingApproval)||0;}catch(ignore){}var low=a.filter(function(x){return Number(x.stockQty||x.qty||0)<=Number(x.minStockQty||x.minStock||0);}).length,teams=[...new Set(a.map(function(x){return x.team||'GENERAL';}))].length;['siDashTotalAccCurrent','siDashLowAccCurrent','siDashPendingAccCurrent','siDashTeamsAccCurrent'].forEach(function(id,i){var n=document.getElementById(id);if(n)n.textContent=[a.length,low,pending,teams][i].toLocaleString('en-US');});}}window.si_switchTab=function(t){t=tab_(t);try{if(typeof SI!=='undefined')SI.tab=t;}catch(e){}if(t==='acc'&&typeof si_applyFilters==='function')try{si_applyFilters();}catch(ignore){}apply_();try{sessionStorage.setItem('CES_INVENTORY_TAB_CURRENT',t);}catch(ignore2){}};var base=window.initStockInventoryModule;if(typeof base==='function'&&!window.__inventoryCurrentBridge){window.__inventoryCurrentBridge=true;window.initStockInventoryModule=function(force){var r=base.apply(this,arguments);setTimeout(function(){try{if(typeof SI!=='undefined')SI.tab=sessionStorage.getItem('CES_INVENTORY_TAB_CURRENT')||'dashboard';}catch(e){}apply_();},120);return r;};}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply_);else apply_();})();

/* V30.0.28 Accessories-only dashboard. */
if(typeof window.esc!=='function')window.esc=function(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
(function(){var teamChart=null,statusChart=null;function group(rows,key){var out={};rows.forEach(function(x){var k=String(x[key]||x[key==='type'?'accessoriesType':'team']||'Unassigned');out[k]=(out[k]||0)+Number(x.stockQty||x.stock_qty||x.qty||0);});return out;}function render(){var a=(typeof SI!=='undefined'&&Array.isArray(SI.acc))?SI.acc:[],pending=0;try{pending=Number((SI.raw.kpi||{}).pendingApproval||0);}catch(ignore){}var total=a.reduce(function(s,x){return s+Number(x.stockQty||x.stock_qty||x.qty||0);},0),low=a.filter(function(x){return Number(x.stockQty||x.stock_qty||x.qty||0)<=Number(x.minStockQty||x.min_stock_qty||x.minStock||0);}).length,teams=group(a,'team'),types=group(a,'type');[['siDashTotalAccCurrent',a.length],['siDashTotalStockCurrent',total],['siDashLowAccCurrent',low],['siDashPendingAccCurrent',pending],['siDashTeamsAccCurrent',Object.keys(teams).length]].forEach(function(x){var n=document.getElementById(x[0]);if(n)n.textContent=Number(x[1]||0).toLocaleString('en-US');});var summary={};a.forEach(function(x){var k=String(x.team||'Unassigned')+'||'+String(x.type||x.accessoriesType||'General'),s=Number(x.stockQty||x.stock_qty||x.qty||0),m=Number(x.minStockQty||x.min_stock_qty||x.minStock||0);if(!summary[k])summary[k]={team:String(x.team||'Unassigned'),type:String(x.type||x.accessoriesType||'General'),items:0,stock:0,low:0};summary[k].items++;summary[k].stock+=s;if(s<=m)summary[k].low++;});var root=document.getElementById('siAccessoriesSummaryV3028');if(root)root.innerHTML='<div class="si-accessories-summary-wrap-v3028"><table><thead><tr><th>Team</th><th>Accessories Type</th><th>Items</th><th>Total Stock</th><th>Low Stock</th></tr></thead><tbody>'+Object.keys(summary).sort().map(function(k){var x=summary[k];return'<tr><td><b>'+esc(x.team)+'</b></td><td>'+esc(x.type)+'</td><td>'+x.items+'</td><td>'+x.stock.toLocaleString('en-US')+'</td><td><span class="'+(x.low?'low':'ok')+'">'+x.low+'</span></td></tr>';}).join('')+'</tbody></table></div>';if(typeof Chart!=='undefined'){var tc=document.getElementById('siAccessoriesTeamChartV3028'),sc=document.getElementById('siAccessoriesStatusChartV3028');if(teamChart)teamChart.destroy();if(statusChart)statusChart.destroy();if(tc)teamChart=new Chart(tc,{type:'bar',data:{labels:Object.keys(teams),datasets:[{label:'Total Stock',data:Object.values(teams),backgroundColor:'#3b82f6',borderRadius:7}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}});if(sc)statusChart=new Chart(sc,{type:'doughnut',data:{labels:['Available','Low Stock'],datasets:[{data:[Math.max(0,a.length-low),low],backgroundColor:['#10b981','#f97316']}]},options:{responsive:true,maintainAspectRatio:false,cutout:'65%'}});}}var prior=window.si_switchTab;window.si_switchTab=function(t){var r=prior.apply(this,arguments);if(String(t||'')==='dashboard')setTimeout(render,20);return r;};var init=window.initStockInventoryModule;if(typeof init==='function')window.initStockInventoryModule=function(){var r=init.apply(this,arguments);if(r&&typeof r.then==='function')return r.then(function(v){setTimeout(render,20);return v;});setTimeout(render,140);return r;};window.si_renderAccessoriesDashboardV3028=render;var s=document.createElement('style');s.textContent='.si-accessories-summary-wrap-v3028{max-height:420px;overflow:auto;border:1px solid #e2e8f0;border-radius:14px}.si-accessories-summary-wrap-v3028 table{width:100%;border-collapse:collapse;font-size:11px}.si-accessories-summary-wrap-v3028 th{position:sticky;top:0;background:#eaf2ff;color:#415b76;text-align:left;padding:10px}.si-accessories-summary-wrap-v3028 td{padding:9px 10px;border-bottom:1px solid #edf2f7}.si-accessories-summary-wrap-v3028 span{display:inline-flex;border-radius:999px;padding:4px 8px;font-weight:900}.si-accessories-summary-wrap-v3028 .low{background:#fee2e2;color:#b91c1c}.si-accessories-summary-wrap-v3028 .ok{background:#dcfce7;color:#047857}';document.head.appendChild(s);})();
