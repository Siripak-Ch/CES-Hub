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


(function(){
  'use strict';
  var teamChart=null,statusChart=null;
  function esc_(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function acc_(){return(typeof SI!=='undefined'&&Array.isArray(SI.acc))?SI.acc:[];}
  function qty_(x){return Number(x.stockQty||x.stock_qty||x.qty||0)||0;}
  function min_(x){return Number(x.minStockQty||x.min_stock_qty||x.minStock||x.min_stock||0)||0;}
  function team_(x){return String(x.team||'GENERAL').trim()||'GENERAL';}
  function type_(x){return String(x.type||x.accessoriesType||x.accessories_type||'GENERAL').trim()||'GENERAL';}
  function status_(x){var raw=String(x.status||'').toUpperCase();if(raw.indexOf('PENDING')>=0)return'PENDING_APPROVAL';return qty_(x)<=min_(x)?'LOW_STOCK':'STOCK';}
  function unique_(rows,fn){var m={};(rows||[]).forEach(function(x){var v=fn(x);if(v)m[v]=1;});return Object.keys(m).sort(function(a,b){return a.localeCompare(b);});}
  function filtered_(){
    var a=acc_(),t=(document.getElementById('siDashFilterTeamV3031')||{}).value||'all',ty=(document.getElementById('siDashFilterTypeV3031')||{}).value||'all',st=(document.getElementById('siDashFilterStatusV3031')||{}).value||'all';
    return a.filter(function(x){return(t==='all'||team_(x)===t)&&(ty==='all'||type_(x)===ty)&&(st==='all'||status_(x)===st);});
  }
  function fillFilters_(){
    var a=acc_(),defs=[['siDashFilterTeamV3031',unique_(a,team_),'All Teams'],['siDashFilterTypeV3031',unique_(a,type_),'All Accessories Type']];
    defs.forEach(function(d){var el=document.getElementById(d[0]);if(!el)return;var cur=el.value||'all';el.innerHTML='<option value="all">'+d[2]+'</option>'+d[1].map(function(v){return'<option value="'+esc_(v)+'">'+esc_(v)+'</option>';}).join('');el.value=d[1].indexOf(cur)>=0?cur:'all';});
  }
  function card_(label,value,sub,icon,cls){return'<div class="si-dash-kpi-icon-v3031 '+cls+'"><i class="fas '+icon+'"></i></div><div class="si-dash-kpi-copy-v3031"><span>'+label+'</span><b>'+Number(value||0).toLocaleString('en-US')+'</b><small>'+sub+'</small></div>';}
  function renderKpi_(rows){
    var types=unique_(rows,type_),teams=unique_(rows,team_),total=rows.reduce(function(s,x){return s+qty_(x);},0),low=rows.filter(function(x){return status_(x)==='LOW_STOCK';}).length,pending=rows.filter(function(x){return status_(x)==='PENDING_APPROVAL';}).length;
    var vals=[['siDashTotalAccCurrent',card_('Accessories Type',types.length,'Unique types in current filter','fa-layer-group','blue')],['siDashTotalStockCurrent',card_('Total Stock',total,'Physical quantity in current filter','fa-boxes-stacked','green')],['siDashLowAccCurrent',card_('Low Stock',low,'Items at / below minimum','fa-triangle-exclamation','amber')],['siDashPendingAccCurrent',card_('Pending Approval',pending,'Items awaiting approval','fa-hourglass-half','violet')],['siDashTeamsAccCurrent',card_('Teams',teams.length,'Teams in current filter','fa-users','cyan')]];
    vals.forEach(function(x){var n=document.getElementById(x[0]);if(n){var host=n.parentElement;host.classList.add('si-dash-kpi-card-v3031');host.innerHTML=x[1];}});
    var r=document.getElementById('siDashFilterResultV3031');if(r)r.textContent=rows.length.toLocaleString('en-US')+' items · '+total.toLocaleString('en-US')+' units';
  }
  function renderCharts_(rows){
    if(typeof Chart==='undefined')return;
    var byTeam={},byStatus={'STOCK':0,'LOW_STOCK':0,'PENDING_APPROVAL':0};rows.forEach(function(x){byTeam[team_(x)]=(byTeam[team_(x)]||0)+qty_(x);byStatus[status_(x)]++;});
    var tc=document.getElementById('siAccessoriesTeamChartV3028'),sc=document.getElementById('siAccessoriesStatusChartV3028');
    if(teamChart)try{teamChart.destroy();}catch(e){} if(statusChart)try{statusChart.destroy();}catch(e){}
    if(tc)teamChart=new Chart(tc,{type:'bar',data:{labels:Object.keys(byTeam),datasets:[{label:'Total Stock',data:Object.values(byTeam),backgroundColor:'#2563eb',borderRadius:8,maxBarThickness:38}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{precision:0}},x:{grid:{display:false}}}}});
    if(sc)statusChart=new Chart(sc,{type:'doughnut',data:{labels:['STOCK','LOW STOCK','PENDING APPROVAL'],datasets:[{data:[byStatus.STOCK,byStatus.LOW_STOCK,byStatus.PENDING_APPROVAL],backgroundColor:['#10b981','#f59e0b','#8b5cf6'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,cutout:'64%',plugins:{legend:{position:'right'}}}});
  }
  function renderSummary_(rows){
    var map={};rows.forEach(function(x){var k=team_(x)+'||'+type_(x);if(!map[k])map[k]={team:team_(x),type:type_(x),items:0,stock:0,min:0,low:0,pending:0};var q=qty_(x),m=min_(x);map[k].items++;map[k].stock+=q;map[k].min+=m;if(status_(x)==='LOW_STOCK')map[k].low++;if(status_(x)==='PENDING_APPROVAL')map[k].pending++;});
    var root=document.getElementById('siAccessoriesSummaryV3028');if(!root)return;
    var list=Object.keys(map).map(function(k){return map[k];}).sort(function(a,b){return a.team.localeCompare(b.team)||a.type.localeCompare(b.type);});
    root.innerHTML='<div class="si-accessories-summary-wrap-v3031"><table><thead><tr><th>Team</th><th>Accessories Type</th><th>Items</th><th>Total Stock</th><th>Min Stock</th><th>Gap</th><th>Low Stock</th><th>Pending</th></tr></thead><tbody>'+list.map(function(x){var gap=x.stock-x.min;return'<tr><td><b>'+esc_(x.team)+'</b></td><td>'+esc_(x.type)+'</td><td>'+x.items.toLocaleString('en-US')+'</td><td><b>'+x.stock.toLocaleString('en-US')+'</b></td><td>'+x.min.toLocaleString('en-US')+'</td><td><span class="'+(gap<0?'gap-bad':'gap-ok')+'">'+(gap<0?'−':'')+Math.abs(gap).toLocaleString('en-US')+'</span></td><td><span class="'+(x.low?'low':'ok')+'">'+x.low+'</span></td><td><span class="'+(x.pending?'pending':'ok')+'">'+x.pending+'</span></td></tr>';}).join('')+'</tbody></table></div>'+(list.length?'':'<div class="si-dash-empty-v3031">No accessory data for current filter.</div>');
  }
  function render(){fillFilters_();var rows=filtered_();renderKpi_(rows);renderCharts_(rows);renderSummary_(rows);}
  window.si_renderAccessoriesDashboardV3031=render;
  window.si_resetDashboardFiltersV3031=function(){['siDashFilterTeamV3031','siDashFilterTypeV3031','siDashFilterStatusV3031'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='all';});render();};
  var prior=window.si_switchTab;
  window.si_switchTab=function(t){var r=prior?prior.apply(this,arguments):undefined;if(String(t||'')==='dashboard')setTimeout(render,20);return r;};
  var init=window.initStockInventoryModule;
  if(typeof init==='function')window.initStockInventoryModule=function(){var r=init.apply(this,arguments);if(r&&typeof r.then==='function')return r.then(function(v){setTimeout(render,30);return v;});setTimeout(render,160);return r;};
  var st=document.createElement('style');st.textContent=`
    #view-inventory .si-dash-filter-card-v3031{background:#fff;border:1px solid #dbe5f0;border-radius:16px;padding:12px 14px;box-shadow:0 5px 18px rgba(15,23,42,.045)}
    #view-inventory .si-dash-filter-title-v3031{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:9px;color:#334155;font-size:11px;font-weight:950}.si-dash-filter-title-v3031 span:last-child{font-size:9px;color:#64748b;font-weight:800}
    #view-inventory .si-dash-filter-grid-v3031{display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:8px}.si-dash-filter-grid-v3031 select{height:36px;border:1px solid #d5e0eb;border-radius:10px;background:#f8fbff;padding:0 10px;font-size:10px;font-weight:800;color:#334155;min-width:0}
    #view-inventory .si-dash-kpi-card-v3031{display:flex!important;align-items:center;gap:10px;padding:13px 14px!important;min-height:86px!important}.si-dash-kpi-icon-v3031{width:40px;height:40px;border-radius:13px;display:grid;place-items:center;flex:none;font-size:15px}.si-dash-kpi-icon-v3031.blue{background:#dbeafe;color:#2563eb}.si-dash-kpi-icon-v3031.green{background:#dcfce7;color:#059669}.si-dash-kpi-icon-v3031.amber{background:#fef3c7;color:#d97706}.si-dash-kpi-icon-v3031.violet{background:#ede9fe;color:#7c3aed}.si-dash-kpi-icon-v3031.cyan{background:#cffafe;color:#0891b2}.si-dash-kpi-copy-v3031 span{display:block;font-size:9px;color:#64748b;font-weight:900}.si-dash-kpi-copy-v3031 b{display:block;font-size:24px;line-height:1.05;color:#0f172a;margin-top:3px}.si-dash-kpi-copy-v3031 small{display:block;font-size:8px;color:#94a3b8;margin-top:4px;white-space:nowrap}.si-accessories-summary-wrap-v3031{max-height:430px;overflow:auto;border:1px solid #e2e8f0;border-radius:14px}.si-accessories-summary-wrap-v3031 table{width:100%;border-collapse:collapse;font-size:10px;min-width:860px}.si-accessories-summary-wrap-v3031 th{position:sticky;top:0;background:#edf4fb;color:#415b76;text-align:left;padding:10px;border-bottom:1px solid #dbe5f0;z-index:2}.si-accessories-summary-wrap-v3031 td{padding:9px 10px;border-bottom:1px solid #edf2f7}.si-accessories-summary-wrap-v3031 span{display:inline-flex;border-radius:999px;padding:4px 8px;font-weight:900}.si-accessories-summary-wrap-v3031 .low{background:#fee2e2;color:#b91c1c}.si-accessories-summary-wrap-v3031 .pending{background:#ede9fe;color:#6d28d9}.si-accessories-summary-wrap-v3031 .ok{background:#dcfce7;color:#047857}.si-accessories-summary-wrap-v3031 .gap-bad{background:#fee2e2;color:#b91c1c;border-radius:999px;padding:4px 8px;font-weight:900}.si-accessories-summary-wrap-v3031 .gap-ok{background:#dcfce7;color:#047857;border-radius:999px;padding:4px 8px;font-weight:900}.si-dash-empty-v3031{padding:28px;text-align:center;color:#64748b;font-size:11px}@media(max-width:760px){#view-inventory .si-dash-filter-grid-v3031{grid-template-columns:1fr 1fr}.si-dash-filter-grid-v3031 button{grid-column:1/-1}}
  `;document.head.appendChild(st);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(render,120);});else setTimeout(render,120);
})();
