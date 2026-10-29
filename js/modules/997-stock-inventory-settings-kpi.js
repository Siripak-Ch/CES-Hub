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
    var b=window.CES_STOCK_BOOTSTRAP;return b&&Array.isArray(b.devices)?b.devices:[];
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

  window.CES_STOCK_SETTINGS_KPI_RECHECK=function(){
    var visible=['siEquipFilters','siAccFilters','siEquipSection','siAccSection'].filter(function(id){var n=el(id);return n&&getComputedStyle(n).display!=='none';});
    var out={version:VERSION,reportIconBorder:el('view-report')?getComputedStyle(document.querySelector('#view-report .ces-report-icon-v31')).borderStyle:'-',inventoryTitle:(document.querySelector('#view-inventory h1')||{}).textContent||'',inventoryVisibleBlocks:visible,contractDetail:typeof window.sd_contractDetail==='function',kpiDriveDefaults:window.CES_KPI_DRIVE_DEFAULTS};console.log('[CES V31 Recheck]',out);return out;
  };
  injectStyle();
  document.addEventListener('DOMContentLoaded',function(){injectStyle();applyInventoryTab('equip');});
})();

/* V30.0.40 — paint Accessories dashboard from its small source immediately.
   The full inventory request continues in parallel for the Accessories tab. */
(function(){
  'use strict';
  var base=window.initStockInventoryModule,request=null;
  function applyFast(r){
    if(!r||r.success===false||!Array.isArray(r.accessories)||!r.accessories.length)return r;
    if(typeof SI!=='undefined'){
      SI.acc=r.accessories.slice();SI.accFiltered=SI.acc.slice();SI.loaded=true;
      SI.raw=Object.assign({},SI.raw||{},r,{inventory:Array.isArray(SI.inv)?SI.inv:[]});
    }
    try{localStorage.setItem('CES_ACCESSORIES_DASHBOARD_V40',JSON.stringify({savedAt:Date.now(),data:r}));}catch(ignore){}
    if(typeof window.si_renderAccessoriesDashboard==='function')window.si_renderAccessoriesDashboard();
    var f=document.getElementById('siDataFreshness');if(f){f.className='csv6-freshness live';f.innerHTML='<i class="fas fa-database"></i> Accessories updated '+new Date().toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'});}
    return r;
  }
  function cached(){try{var x=JSON.parse(localStorage.getItem('CES_ACCESSORIES_DASHBOARD_V40')||'null');if(x&&x.data&&Date.now()-Number(x.savedAt||0)<86400000)return x.data;}catch(ignore){}return null;}
  function load(force){
    var c=cached();if(c)applyFast(c);
    if(request&&!force)return request;
    if(!window.CES_API||typeof window.CES_API.callFunction!=='function')return Promise.resolve(c);
    request=window.CES_API.callFunction('si_getAccessoriesDashboardFast',[!!force],{transport:'jsonp',timeoutMs:30000,dedupe:!force,priority:'active',userAction:true,module:'inventory'}).then(applyFast).catch(function(e){console.warn('[Accessories dashboard fast]',e);return c;}).finally(function(){request=null;});
    return request;
  }
  window.si_loadAccessoriesDashboardFast=load;
  if(typeof base==='function')window.initStockInventoryModule=function(force){var fast=load(!!force),full=base.apply(this,arguments);if(full&&typeof full.then==='function')return Promise.allSettled([fast,full]).then(function(x){return x[1]&&x[1].status==='fulfilled'?x[1].value:(x[0]&&x[0].value);});return fast;};
})();


(function(){
  'use strict';
  var teamChart=null,statusChart=null;
  function esc_(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function acc_(){return(typeof SI!=='undefined'&&Array.isArray(SI.acc))?SI.acc:[];}
  function applySourceLink_(){var a=document.getElementById('siInventorySourceLink');if(a){a.href='https://docs.google.com/spreadsheets/d/1X7f6BatQ-y5ZW6VYTv2oT34rbsCLeNgac0APt7njFrk/edit?usp=drivesdk';a.classList.remove('opacity-40');}}
  function qty_(x){return Number(x.stockQty||x.stock_qty||x.qty||0)||0;}
  function min_(x){return Number(x.minStockQty||x.min_stock_qty||x.minStock||x.min_stock||0)||0;}
  function cost_(x){var v=x.cost!=null?x.cost:(x.unitCost!=null?x.unitCost:(x.unit_cost!=null?x.unit_cost:(x.costea!=null?x.costea:(x['Cost/ea']!=null?x['Cost/ea']:(x.totalCost||x.total_cost||0)))));return Number(String(v==null?'':v).replace(/[฿,\s]/g,''))||0;}
  function totalCost_(x){var v=x.totalCost!=null?x.totalCost:(x.total_cost!=null?x.total_cost:x.inventoryValue);var n=Number(String(v==null?'':v).replace(/[฿,\s]/g,''))||0;return n||qty_(x)*cost_(x);}
  function team_(x){return String(x.team||'GENERAL').trim()||'GENERAL';}
  function type_(x){return String(x.type||x.accessoriesType||x.accessories_type||x['Accessories Type']||x.category||'GENERAL').trim()||'GENERAL';}
  function status_(x){var raw=String(x.status||'').toUpperCase();if(raw.indexOf('PENDING')>=0)return'PENDING_APPROVAL';return qty_(x)<=min_(x)?'LOW_STOCK':'STOCK';}
  function updated_(x){return String(x.lastCheckTimestamp||x.last_check_timestamp||x.lastCheckDate||x.last_check_date||x.addStockDate||x['Add Stock Date']||'').trim();}
  function unique_(rows,fn){var m={};(rows||[]).forEach(function(x){var v=fn(x);if(v)m[v]=1;});return Object.keys(m).sort(function(a,b){return a.localeCompare(b);});}
  function filtered_(){
    var a=acc_(),t=(document.getElementById('siDashFilterTeamV3031')||{}).value||'all',ty=(document.getElementById('siDashFilterTypeV3031')||{}).value||'all',st=(document.getElementById('siDashFilterStatusV3031')||{}).value||'all';
    return a.filter(function(x){return(t==='all'||team_(x)===t)&&(ty==='all'||type_(x)===ty)&&(st==='all'||status_(x)===st);});
  }
  function fillFilters_(){
    var a=acc_(),defs=[['siDashFilterTeamV3031',unique_(a,team_),'All Teams'],['siDashFilterTypeV3031',unique_(a,type_),'All Accessories Type']];
    defs.forEach(function(d){var el=document.getElementById(d[0]);if(!el)return;var cur=el.value||'all';el.innerHTML='<option value="all">'+d[2]+'</option>'+d[1].map(function(v){return'<option value="'+esc_(v)+'">'+esc_(v)+'</option>';}).join('');el.value=d[1].indexOf(cur)>=0?cur:'all';});
  }
  function card_(id,label,value,sub,icon,cls,prefix){return'<div class="si-dash-kpi-icon-v3031 '+cls+'"><i class="fas '+icon+'"></i></div><div class="si-dash-kpi-copy-v3031"><span>'+label+'</span><b id="'+id+'">'+(prefix||'')+Number(value||0).toLocaleString('en-US',{maximumFractionDigits:2})+'</b><small>'+sub+'</small></div>';}
  function renderKpi_(rows){
    var types=unique_(rows,type_),total=rows.reduce(function(s,x){return s+qty_(x);},0),low=rows.filter(function(x){return status_(x)==='LOW_STOCK';}).length,cost=rows.reduce(function(s,x){return s+totalCost_(x);},0);if(!cost&&rows.length===acc_().length&&typeof SI!=='undefined'&&SI.raw&&SI.raw.costSummary)cost=Number(SI.raw.costSummary.sum||0);
    var vals=[['siDashTotalAccCurrent',card_('siDashTotalAccCurrent','Accessories Type',types.length,'Unique types in current filter','fa-layer-group','blue')],['siDashTotalStockCurrent',card_('siDashTotalStockCurrent','Total Stock',total,'Physical quantity in current filter','fa-boxes-stacked','green')],['siDashLowAccCurrent',card_('siDashLowAccCurrent','Low Stock',low,'Items at / below minimum','fa-triangle-exclamation','amber')],['siDashCostCurrent',card_('siDashCostCurrent','Cost',cost,'Sum of Total Cost column AB','fa-coins','violet','฿')]];
    vals.forEach(function(x){var n=document.getElementById(x[0]);if(!n)return;var host=n.closest('.stockpro-card')||n.parentElement;if(!host)return;host.classList.add('si-dash-kpi-card-v3031');host.innerHTML=x[1];});
    var r=document.getElementById('siDashFilterResultV3031');if(r)r.textContent=rows.length.toLocaleString('en-US')+' items · '+total.toLocaleString('en-US')+' units';
  }
  function renderCharts_(rows){
    if(typeof Chart==='undefined')return;
    var byTeam={},byStatus={'STOCK':0,'LOW_STOCK':0};rows.forEach(function(x){byTeam[team_(x)]=(byTeam[team_(x)]||0)+qty_(x);if(status_(x)==='LOW_STOCK')byStatus.LOW_STOCK++;else byStatus.STOCK++;});
    var tc=document.getElementById('siAccessoriesTeamChartV3028'),sc=document.getElementById('siAccessoriesStatusChartV3028');
    if(teamChart)try{teamChart.destroy();}catch(e){} if(statusChart)try{statusChart.destroy();}catch(e){}
    if(tc)teamChart=new Chart(tc,{type:'bar',data:{labels:Object.keys(byTeam),datasets:[{label:'Total Stock',data:Object.values(byTeam),backgroundColor:'#2563eb',borderRadius:8,maxBarThickness:38}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{precision:0}},x:{grid:{display:false}}}}});
    if(sc)statusChart=new Chart(sc,{type:'doughnut',data:{labels:['STOCK','LOW STOCK'],datasets:[{data:[byStatus.STOCK,byStatus.LOW_STOCK],backgroundColor:['#10b981','#f59e0b'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,cutout:'64%',plugins:{legend:{position:'right'}}}});
  }
  function renderSummary_(rows){
    var map={};rows.forEach(function(x){var k=team_(x)+'||'+type_(x);if(!map[k])map[k]={team:team_(x),type:type_(x),items:0,stock:0,min:0,low:0,cost:0,updated:''};var q=qty_(x),m=min_(x),u=updated_(x);map[k].items++;map[k].stock+=q;map[k].min+=m;map[k].cost+=totalCost_(x);if(status_(x)==='LOW_STOCK')map[k].low++;if(u&&(!map[k].updated||String(u).localeCompare(String(map[k].updated))>0))map[k].updated=u;});
    var root=document.getElementById('siAccessoriesSummaryV3028');if(!root)return;
    var list=Object.keys(map).map(function(k){return map[k];}).sort(function(a,b){return a.team.localeCompare(b.team)||a.type.localeCompare(b.type);});
    root.innerHTML='<div class="si-accessories-summary-wrap-v3031"><table><thead><tr><th>Team</th><th>Accessories Type</th><th>Stock</th><th>Total Stock</th><th>Min Stock</th><th>Status</th><th>Last Stock Update</th><th>Cost</th></tr></thead><tbody>'+list.map(function(x){var low=x.low>0;return'<tr><td><b>'+esc_(x.team)+'</b></td><td>'+esc_(x.type)+'</td><td>'+x.items.toLocaleString('en-US')+'</td><td><b>'+x.stock.toLocaleString('en-US')+'</b></td><td>'+x.min.toLocaleString('en-US')+'</td><td><span class="'+(low?'low':'ok')+'">'+(low?'LOW STOCK':'STOCK')+'</span></td><td>'+esc_(x.updated||'-')+'</td><td><b>฿'+x.cost.toLocaleString('en-US',{maximumFractionDigits:2})+'</b></td></tr>';}).join('')+'</tbody></table></div>'+(list.length?'':'<div class="si-dash-empty-v3031">No accessory data for current filter.</div>');
  }
  function render(){applySourceLink_();fillFilters_();var rows=filtered_();renderKpi_(rows);renderCharts_(rows);renderSummary_(rows);}
  window.si_renderAccessoriesDashboard=render;
  window.si_resetDashboardFilters=function(){['siDashFilterTeamV3031','siDashFilterTypeV3031','siDashFilterStatusV3031'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='all';});render();};
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


/* CES Hub V30.0.31 follow-up — Inventory Dashboard / Accessories strict tab isolation. */
(function(){
  'use strict';
  function el(id){return document.getElementById(id);}
  function apply(tab){
    tab=String(tab||'dashboard').toLowerCase();
    if(tab!=='acc')tab='dashboard';
    var dash=el('siInventoryDashboardCurrent'),accFilter=el('siAccFilters'),accSection=el('siAccSection');
    if(dash){dash.classList.toggle('hidden',tab!=='dashboard');dash.style.display=tab==='dashboard'?'':'none';}
    [accFilter,accSection].forEach(function(n){if(n){n.classList.toggle('hidden',tab!=='acc');n.style.display=tab==='acc'?'':'none';}});
    var b1=el('siTabDashboardCurrent'),b2=el('siTabAcc');if(b1)b1.classList.toggle('active',tab==='dashboard');if(b2)b2.classList.toggle('active',tab==='acc');
    try{if(typeof SI!=='undefined')SI.tab=tab;}catch(e){}
    if(tab==='dashboard'&&typeof window.si_renderAccessoriesDashboard==='function')setTimeout(function(){window.si_renderAccessoriesDashboard();},0);
    if(tab==='acc'&&typeof window.si_renderAccCards==='function')setTimeout(function(){window.si_renderAccCards();},0);
  }
  window.si_switchTab=function(tab){apply(tab);};
  var init=window.initStockInventoryModule;
  if(typeof init==='function'&&!window._CES_INV_TAB_ISOLATION){
    window._CES_INV_TAB_ISOLATION=true;
    window.initStockInventoryModule=function(force){var r=init.apply(this,arguments);var restore=function(){apply((typeof SI!=='undefined'&&SI.tab==='acc')?'acc':'dashboard');};if(r&&typeof r.then==='function'){return r.then(function(v){restore();setTimeout(restore,80);return v;},function(e){restore();throw e;});}restore();setTimeout(restore,100);return r;};
  }
  document.addEventListener('DOMContentLoaded',function(){setTimeout(function(){apply('dashboard');},120);});
})();

// ===== Accessories inventory and allocation =====
/* CES Hub — Accessories allocation, checkout and inventory dashboard. */
(function(w,d){'use strict';
 const $=id=>d.getElementById(id),esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const n=v=>Number(v||0)||0, money=v=>'฿'+n(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
 const call=(method,payload,timeout=35000)=>w.CES_API.callFunction(method,payload==null?[]:[payload],{transport:'iframe',timeoutMs:timeout,dedupe:false,priority:'active',userAction:true,module:'inventory'});
 const state={pending:null,detail:null,selected:{},dash:null,chart:null,sourceMode:'server'};
 function style(){if($('ces69-style'))return;const st=d.createElement('style');st.id='ces69-style';st.textContent=`
 #view-inventory .ces69-access-table-scroll{overflow:auto;max-width:100%;max-height:68vh;scrollbar-gutter:stable;border-radius:14px;border:1px solid #dbe6f4;background:white}
 #view-inventory .ces69-access-table{width:100%;min-width:1160px;border-collapse:separate;border-spacing:0;font:12px 'Prompt',sans-serif}
 #view-inventory .ces69-access-table th{position:sticky;top:0;background:#eef5ff;color:#365578;font-size:11px;text-align:left;z-index:2;padding:13px 11px;border-bottom:1px solid #dbe5f0;white-space:nowrap}
 #view-inventory .ces69-access-table td{padding:12px 11px;border-bottom:1px solid #edf2f7;vertical-align:middle;color:#27364b}
 #view-inventory .ces69-access-table tr:hover td{background:#f8fbff}
 #view-inventory .ces69-access-table .ces69-muted{font-size:10px;color:#6b7f9a}
 .ces69-pill{display:inline-block;border-radius:999px;padding:5px 10px;font-size:10px;font-weight:800;white-space:nowrap}.ces69-pill.ok{background:#dcfce7;color:#047857}.ces69-pill.low{background:#fee2e2;color:#b91c1c}.ces69-pill.zero{background:#f1f5f9;color:#475569}
 .ces69-btn{border:1px solid #d4e3f3;border-radius:9px;padding:7px 10px;background:white;color:#0b4daf;font-size:11px;font-weight:800;cursor:pointer}.ces69-btn.primary{background:#004aad;color:white;border-color:#004aad}.ces69-btn.warn{background:#fff7ed;border-color:#fed7aa;color:#c2410c}
 .ces69-qty{width:55px;border:1px solid #d4e1ef;border-radius:8px;padding:8px;text-align:center}
 .ces69-subteam{max-width:125px;width:100%;border:1px solid #bfdbfe;border-radius:9px;padding:7px;color:#104c9a;background:#fff;font-size:11px;font-weight:700}
 .ces69-filters{display:flex;gap:7px;flex-wrap:wrap;align-items:center;padding:9px 0}.ces69-filters select{border:1px solid #d4e1ef;background:white;color:#334155;padding:8px;border-radius:9px;font-size:11px}
 .ces69-dashboard{padding:15px;background:#fff;border:1px solid #e0e9f4;border-radius:16px;margin-top:14px}.ces69-dashboard select{padding:8px;border:1px solid #dae5f2;border-radius:8px}
 .ces69-flex{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px}.ces69-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.ces69-kpi{background:#f7faff;border:1px solid #e2edfa;border-radius:12px;padding:14px}.ces69-kpi b{display:block;color:#0349a6;font-size:23px;margin-top:4px}.ces69-mini-table{width:100%;border-collapse:collapse;font-size:11px}.ces69-mini-table th,.ces69-mini-table td{padding:8px;border-bottom:1px solid #e4eaf2;text-align:left}
 @media(max-width:800px){.ces69-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
 `;d.head.appendChild(st);}
 function profile(){const u=w.currentUser||w.CES_CURRENT_USER||w.loggedInUser||{};return{name:u.name_th||u.nameTh||u.thaiName||u.name||u.name_eng||u.nameEng||'',id:u.employeeId||u.empId||u.id||u.userId||'',team:u.team||u.mainTeam||'',costCenter:u.costCenter||u.cost_center||'',email:u.email||''};}
 function fillCheckout(){const u=profile(),fields={siBorrower:u.name,siCheckoutEmployeeId:String(u.id),siCheckoutTeam:u.team,siCheckoutLocation:'Warehouse',siCheckoutCostCenter:String(u.costCenter),siBorrowDate:new Date().toLocaleDateString('en-CA')};Object.keys(fields).forEach(id=>{const el=$(id);if(!el||String(el.value||'').trim()||!fields[id])return;if(el.tagName==='SELECT'&&!Array.from(el.options).some(o=>o.value===fields[id]))el.add(new Option(fields[id],fields[id]));el.value=fields[id];});if($('siCheckoutTeam'))$('siCheckoutTeam').readOnly=false;}
 let staffLookupPending=null,staffLookupDone='';
 function loadStaffFromSheet(){const p=profile();if(!p.id||staffLookupPending||staffLookupDone===String(p.id))return;staffLookupPending=w.CES_API?.callFunction('getTECurrentUserProfile',[{employeeId:String(p.id)}],{transport:'jsonp',timeoutMs:26000,dedupe:true,module:'inventory',silentLoading:true});staffLookupPending?.then(r=>{if(r?.success){staffLookupDone=String(p.id);[['siBorrower',r.employeeName],['siCheckoutEmployeeId',r.employeeId],['siCheckoutCostCenter',r.costCenter],['siCheckoutTeam',r.team]].forEach(([id,val])=>{const el=$(id);if(el&&!String(el.value||'').trim()&&val){if(el.tagName==='SELECT'&&!Array.from(el.options).some(o=>o.value===val))el.add(new Option(val,val));el.value=val;}});}}).catch(()=>{}).finally(()=>staffLookupPending=null);}

 function groups(){const map=new Map();(w.SI?.acc||[]).forEach(a=>{const key=a.itemGroupId||a.accessoryId||a.itemName;if(!map.has(key))map.set(key,[]);map.get(key).push(a);});return Array.from(map.entries()).map(([id,items])=>({id,items,total:items.reduce((s,x)=>s+n(x.stockQty),0),name:items[0].itemName||items[0].name,kind:items[0].type||'',low:items.some(x=>n(x.minStockQty)>0&&n(x.stockQty)<=n(x.minStockQty))}));}
 function pick(g){const selected=g.items.find(a=>a.accessoryId===state.selected[g.id]);const team=$('siAccTeam')?.value||'all';if(team!=='all'){return selected&&selected.team===team?selected:(g.items.find(a=>a.team===team&&n(a.stockQty)>0)||g.items.find(a=>a.team===team)||g.items[0]);}return selected||g.items.find(a=>a.team==='SHARED'&&n(a.stockQty)>0)||g.items.find(a=>n(a.stockQty)>0)||g.items[0];}
 function opt(id,values,label){const element=$(id);if(!element)return;const old=element.value;element.innerHTML='<option value="all">'+label+'</option>'+values.filter(Boolean).sort().map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join('');element.value=values.includes(old)?old:'all';}
 function filters(){const acc=w.SI?.acc||[],teams=[...new Set(acc.map(a=>a.team))],items=[...new Set(acc.map(a=>a.itemName))],types=[...new Set(acc.map(a=>a.type))],vendors=[...new Set(acc.map(a=>a.vendor1))],status=['STOCK','LOW_STOCK','UNALLOCATED'];opt('siAccTeam',teams,'All Teams');opt('siAccItem',items,'All Items');opt('siAccStatus',status,'All Status');opt('si69Type',types,'All Types');opt('si69Vendor',vendors,'All Vendors');}
 function ensureFilters(){if($('si69Type'))return;const bar=$('siAccFilters');if(!bar)return;bar.insertAdjacentHTML('beforeend','<select id="si69Type" onchange="si69_renderAccessories()"><option value="all">All Types</option></select><select id="si69Vendor" onchange="si69_renderAccessories()"><option value="all">All Vendors</option></select><button type="button" class="ces69-btn warn" onclick="si69_batchRestock()">+ Batch Restock</button>');}
 function badges(a){const low=n(a.minStockQty)>0&&n(a.stockQty)<=n(a.minStockQty),empty=n(a.stockQty)===0&&n(a.minStockQty)===0;return'<span class="ces69-pill '+(low?'low':empty?'zero':'ok')+'">'+(low?'LOW STOCK':empty?'UNALLOCATED':'STOCK')+'</span>';}
 function visible(g){const q=String($('siAccSearch')?.value||'').toLowerCase(),team=$('siAccTeam')?.value||'all',item=$('siAccItem')?.value||'all',status=$('siAccStatus')?.value||'all',type=$('si69Type')?.value||'all',vendor=$('si69Vendor')?.value||'all',action=$('siAccAction')?.value||'all';return (!q||[g.id,g.name,g.kind,...g.items.map(x=>[x.vendor1,x.itemDetail,x.team].join(' '))].join(' ').toLowerCase().includes(q))&&(team==='all'||g.items.some(x=>x.team===team))&&(item==='all'||g.name===item)&&(type==='all'||g.kind===type)&&(vendor==='all'||g.items.some(x=>x.vendor1===vendor))&&(status==='all'||g.items.some(x=>(x.status||'').toUpperCase()===status))&&(action==='all'||g.items.some(x=>x.actionRequired===action));}
 w.si69_select=function(id,value){state.selected[id]=value;w.si69_renderAccessories();};
 w.si69_renderAccessories=function(){style();ensureFilters();const source=groups(),filtered=source.filter(visible);w.SI.accFiltered=filtered.flatMap(g=>g.items);const pages=Math.max(1,Math.ceil(filtered.length/30));w.SI.accPage=Math.min(pages,Math.max(1,w.SI.accPage||1));const page=filtered.slice((w.SI.accPage-1)*30,w.SI.accPage*30);const body=page.map(g=>{const a=pick(g),max=n(a.stockQty),low=n(a.minStockQty)>0&&max<=n(a.minStockQty);return'<tr><td><b>'+esc(g.name)+'</b><div class="ces69-muted">'+esc(g.id)+' · '+esc(g.kind)+'</div></td><td>'+esc(a.itemDetail||'—')+'</td><td>'+esc(a.vendor1||'—')+'</td><td><select class="ces69-subteam" onchange="si69_select(\''+esc(g.id)+'\',this.value)">'+g.items.map(v=>'<option '+(v.accessoryId===a.accessoryId?'selected':'')+' value="'+esc(v.accessoryId)+'">'+esc(v.team)+' · '+n(v.stockQty)+'</option>').join('')+'</select></td><td><b style="color:#047857">'+max.toLocaleString()+'</b><div class="ces69-muted">Total '+g.total.toLocaleString()+'</div></td><td>'+n(a.minStockQty).toLocaleString()+'</td><td>'+badges(a)+'</td><td>'+esc(a.addStockDate||a.lastStockInDate||'—')+'</td><td>'+money(a.costPerEa||a.unitCost||a.cost)+'</td><td><div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap"><input class="ces69-qty" id="ces69q-'+esc(a.accessoryId)+'" type="number" min="1" max="'+max+'" value="1" title="Issue quantity"><button class="ces69-btn primary" '+(!max?'disabled':'')+' onclick="si69_add(\''+esc(g.id)+'\')">Issue</button><button class="ces69-btn warn" onclick="si69_restock(\''+esc(g.id)+'\')">Restock</button><button class="ces69-btn" onclick="si69_detail(\''+esc(g.id)+'\')">Detail</button></div></td></tr>';}).join('');const html='<div class="ces69-access-table-scroll"><table class="ces69-access-table"><thead><tr><th>item_name2</th><th>item_detail</th><th>Vendor 1</th><th>Team allocation</th><th>stock_qty</th><th>min_stock_qty</th><th>Status</th><th>Add Stock Date</th><th>Cost/ea</th><th>Action</th></tr></thead><tbody>'+(body||'<tr><td colspan="10" style="text-align:center;padding:25px">No matching accessories</td></tr>')+'</tbody></table></div>';const node=$('siAccCards');if(node)node.innerHTML=html;if($('siAccCount'))$('siAccCount').textContent=filtered.length+' groups · '+w.SI.acc.length+' allocation rows';if($('siAccPagination'))$('siAccPagination').innerHTML='<span>Page '+w.SI.accPage+' / '+pages+'</span> <button class="ces69-btn" onclick="SI.accPage=Math.max(1,SI.accPage-1);si69_renderAccessories()">Prev</button> <button class="ces69-btn" onclick="SI.accPage=Math.min('+pages+',SI.accPage+1);si69_renderAccessories()">Next</button>';};
 w.si69_add=function(id){const g=groups().find(x=>x.id===id);if(!g)return;const a=pick(g),qty=Number($('ces69q-'+a.accessoryId)?.value||1);if(!Number.isInteger(qty)||qty<=0||qty>n(a.stockQty)){w.Swal?.fire('จำนวนไม่ถูกต้อง','เลือกจำนวนไม่เกินยอดคงเหลือ','warning');return;}if(!Array.isArray(w.SI.cart))w.SI.cart=[];let old=w.SI.cart.find(x=>x.kind==='accessory'&&x.accessoryId===a.accessoryId);if(old){const total=n(old.issueQty||old.qty)+qty;if(total>n(a.stockQty)){w.Swal?.fire('Insufficient stock','','warning');return;}old.issueQty=old.qty=total;}else w.SI.cart.push(Object.assign({},a,{kind:'accessory',qty,issueQty:qty}));w.si_updateCart?.();w.Swal?.fire({toast:true,position:'top-end',icon:'success',title:esc(a.itemName2||a.itemName)+' added',showConfirmButton:false,timer:1100});};
 async function refresh(){state.dash=null;await w.initStockInventoryModule(true);}
 w.si69_restock=async function(id){const g=groups().find(x=>x.id===id);if(!g)return;const a=pick(g);const res=await w.Swal.fire({title:'Restock · '+esc(a.itemName2||a.itemName),html:'<div style="text-align:left"><label>Quantity<input id="ces69rQty" class="swal2-input" type="number" min="1" value="1"></label><label>Lot<input id="ces69rLot" class="swal2-input" placeholder="Optional lot"></label><label>Date<input id="ces69rDate" class="swal2-input" type="date" value="'+new Date().toISOString().slice(0,10)+'"></label></div>',showCancelButton:true,preConfirm:()=>({qty:Number($('ces69rQty').value),lot:$('ces69rLot').value,date:$('ces69rDate').value})});if(!res.isConfirmed)return;try{const out=await call('CES69_restockBatch',{items:[{id:a.accessoryId,...res.value}],user:profile().email});if(!out.success)throw Error(out.message);await w.Swal.fire('Saved',esc(a.itemName2||a.itemName)+' · New '+n(out.items?.[0]?.newQty),'success');refresh();}catch(e){w.Swal.fire('Restock failed',e.message,'error');}};
 w.si69_batchRestock=async function(){const selected=groups().filter(visible).map(pick);if(!selected.length)return;const html='<div style="text-align:left;max-height:360px;overflow:auto">'+selected.map((a,i)=>'<label style="display:flex;justify-content:space-between;padding:7px;border-bottom:1px solid #eee;align-items:center"><span>'+esc(a.itemName2||a.itemName)+' · '+esc(a.team)+'</span><input style="max-width:85px" type="number" min="0" value="0" data-stock-id="'+esc(a.accessoryId)+'" class="ces69-batch-qty"></label>').join('')+'</div>';const r=await w.Swal.fire({title:'Batch Restock',width:670,html,showCancelButton:true,preConfirm:()=>Array.from(d.querySelectorAll('.ces69-batch-qty')).map(x=>({id:x.dataset.stockId,qty:Number(x.value)})).filter(x=>Number.isInteger(x.qty)&&x.qty>0)});if(!r.isConfirmed||!r.value.length)return;try{const out=await call('CES69_restockBatch',{items:r.value,user:profile().email},120000);if(!out.success)throw Error(out.message);w.Swal.fire('Saved',out.items.length+' items · '+out.added+' units','success');refresh();}catch(e){w.Swal.fire('Batch Restock',e.message,'error');}};
 w.si69_detail=function(id){const g=groups().find(x=>x.id===id);if(!g)return;const a=pick(g);w.Swal.fire({title:esc(a.itemName2||a.itemName),width:620,html:'<div style="text-align:left;line-height:2"><b>Item ID:</b> '+esc(a.accessoryId)+'<br><b>Detail:</b> '+esc(a.itemDetail||'—')+'<br><b>Vendor:</b> '+esc(a.vendor1||'—')+'<br><b>Team:</b> '+esc(a.team)+'<br><b>Group total:</b> '+g.total+'<br><b>Team stock:</b> '+n(a.stockQty)+'<br><b>Minimum:</b> '+n(a.minStockQty)+'<br><b>Last stock in:</b> '+esc(a.addStockDate||'—')+'<br><b>Unit cost:</b> '+money(a.costPerEa||a.unitCost||a.cost)+'<br><b>Team stock value:</b> '+money(n(a.stockQty)*n(a.cost))+'</div><hr><div style="text-align:left;padding:8px"><b>Transfer stock within group</b><div style="display:flex;gap:6px"><select id="ces69to" class="ces69-subteam">'+g.items.filter(x=>x.accessoryId!==a.accessoryId).map(x=>'<option value="'+esc(x.accessoryId)+'">'+esc(x.team)+'</option>').join('')+'</select><input id="ces69transferqty" class="ces69-qty" type="number" value="1" min="1"><button class="ces69-btn" onclick="si69_transfer(\''+esc(a.accessoryId)+'\')">Transfer</button></div></div>',confirmButtonText:'Close'});};
 w.si69_transfer=async function(sourceId){const targetId=$('ces69to')?.value,qty=Number($('ces69transferqty')?.value);if(!targetId||!qty)return;try{const r=await call('CES69_transferAllocation',{sourceId,targetId,qty,user:profile().email});if(!r.success)throw Error(r.message);w.Swal.fire('Stock allocated',qty+' units transferred','success');refresh();}catch(e){w.Swal.fire('Transfer failed',e.message,'error');}};
 w.si69_checkout=async function(button){const cart=(w.SI?.cart||[]).filter(x=>x.kind==='accessory');if(!cart.length){w.Swal.fire('Empty cart','','info');return;}fillCheckout();const borrow=$('siBorrower')?.value?.trim(),emp=$('siCheckoutEmployeeId')?.value?.trim(),team=$('siCheckoutTeam')?.value?.trim(),cost=$('siCheckoutCostCenter')?.value?.trim(),loc=$('siCheckoutLocation')?.value?.trim(),date=$('siBorrowDate')?.value||new Date().toISOString().slice(0,10);if(!borrow||!emp||!team||!cost||!loc){w.Swal.fire('Missing information','Name / Employee ID / Team / Cost Center / Location are required','warning');return;}if(button)button.disabled=true;try{const res=await call('si_checkoutCart',{equipment:[],accessories:cart,borrower:borrow,employeeId:emp,team:team,costCenter:cost,location:loc,borrowDate:date,note:$('siNote')?.value||'',requester:{name:borrow,id:emp,email:profile().email,team}},120000);if(!res||res.success===false)throw Error(res?.message||'Check-Out failed');w.SI.cart=w.SI.cart.filter(x=>x.kind!=='accessory');w.si_updateCart?.();w.si_closeCart?.();const items=res.receiptItems||cart.map(x=>({id:x.accessoryId,name:x.itemName,team:x.team,qty:x.issueQty||x.qty,unitCost:x.cost,lineCost:n(x.cost)*n(x.issueQty||x.qty)}));const html='<div style="text-align:left;font-size:12px"><p><b>'+esc(borrow)+'</b> · '+esc(emp)+' · '+esc(team)+' · '+esc(cost)+'</p><table class="ces69-mini-table"><tr><th>Item</th><th>Team</th><th>Qty</th><th>Remaining</th><th>Cost</th></tr>'+items.map(x=>'<tr><td>'+esc(x.name||x.id)+'</td><td>'+esc(x.team)+'</td><td>'+n(x.qty)+'</td><td>'+n(x.balance)+'</td><td>'+money(x.lineCost)+'</td></tr>').join('')+'</table><p style="margin-top:12px"><b>Subtotal:</b> '+money(res.accessorySubtotal)+' | <b>VAT 7%:</b> '+money(res.accessoryVat)+'</p><p style="font-size:17px;color:#004aad"><b>Total:</b> '+money(res.accessoryGrandTotal)+'</p></div>';await w.Swal.fire({icon:'success',title:'Accessories Check-Out Summary',html,width:730,confirmButtonText:'Done'});refresh();return res;}catch(e){w.Swal.fire('Check-Out failed',e.message,'error');return{success:false,message:e.message};}finally{if(button)button.disabled=false;}};
 function dashboardShell(){if($('ces69Dashboard'))return;const base=$('siInventoryDashboardCurrent');if(!base)return;base.insertAdjacentHTML('beforeend','<div id="ces69Dashboard" class="ces69-dashboard"><div class="ces69-flex"><b>Inventory Movement Analytics · Live ledger</b><div><select id="ces69Period" onchange="si69_renderDashboard()"><option value="month">Monthly</option><option value="day">Daily</option><option value="year">Yearly</option></select> <select id="ces69Cost" onchange="si69_renderDashboard()"><option value="all">All Cost Centers</option></select> <select id="ces69Vendor" onchange="si69_renderDashboard()"><option value="all">All Vendors</option></select> <select id="ces69Team" onchange="si69_renderDashboard()"><option value="all">All Teams</option></select> <button class="ces69-btn" onclick="si69_loadDashboard(true)">Refresh</button></div></div><div id="ces69DashKpis" class="ces69-grid" style="margin:12px 0"></div><div style="height:260px"><canvas id="ces69UsageChart"></canvas></div><div style="margin-top:16px;overflow:auto;max-height:320px"><b>Recent transactions</b><div id="ces69Recent"></div></div></div>');}
 w.si69_loadDashboard=async function(force){dashboardShell();if(state.dash&&!force){w.si69_renderDashboard();return;}try{const data=await call('CES69_inventoryDashboard',{},55000);if(!data.success)throw Error(data.message);state.dash=data;opt('ces69Cost',Object.keys(data.costCenters||{}),'All Cost Centers');opt('ces69Vendor',Object.keys(data.vendors||{}),'All Vendors');opt('ces69Team',data.stocks.map(x=>x.team),'All Teams');w.si69_renderDashboard();}catch(e){const node=$('ces69Recent');if(node)node.textContent='Dashboard could not load: '+e.message;}};
 w.si69_renderDashboard=function(){const data=state.dash;if(!data)return;const team=$('ces69Team')?.value||'all',cc=$('ces69Cost')?.value||'all',vendor=$('ces69Vendor')?.value||'all',p=$('ces69Period')?.value||'month',items=data.items||[],byId={};items.forEach(x=>byId[x.id]=x);const tx=(data.transactions||[]).filter(x=>(team==='all'||x.team===team)&&(cc==='all'||(x.note||'').includes('Cost Center: '+cc))&&(vendor==='all'||(byId[x.id]?.vendor===vendor)));const movement=(data.segments||[]).filter(x=>(team==='all'||x.team===team)&&(cc==='all'||x.costCenter===cc)&&(vendor==='all'||x.vendor===vendor));
 const period=v=>p==='year'?String(v).slice(0,4):p==='day'?String(v):String(v).slice(0,7),bins={};
 movement.forEach(x=>{const key=period(x.date);if(!key)return;const row=bins[key]||(bins[key]={period:key,issued:0,restocked:0,cost:0});row.issued+=n(x.issued);row.restocked+=n(x.restocked);row.cost+=n(x.issuedCost);});
 const series=Object.values(bins).sort((a,b)=>a.period.localeCompare(b.period));
 const issued=movement.reduce((a,x)=>a+n(x.issued),0),restocked=movement.reduce((a,x)=>a+n(x.restocked),0),spent=movement.reduce((a,x)=>a+n(x.issuedCost),0);
 const kpis=[['Issued units',issued],['Restocked units',restocked],['Issued cost',money(spent)],['Recent transactions',tx.length]];$('ces69DashKpis').innerHTML=kpis.map(([l,v])=>'<div class="ces69-kpi">'+l+'<b>'+v+'</b></div>').join('');if(w.Chart){if(state.chart)state.chart.destroy();state.chart=new w.Chart($('ces69UsageChart'),{type:'bar',data:{labels:series.map(x=>x.period),datasets:[{label:'Issued',data:series.map(x=>x.issued),backgroundColor:'#2563eb'},{label:'Restocked',data:series.map(x=>x.restocked),backgroundColor:'#10b981'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}}}});}const fields=['Date','Type','Team','Item','Qty','Balance','Note'];$('ces69Recent').innerHTML='<table class="ces69-mini-table"><thead><tr>'+fields.map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>'+tx.slice(0,40).map(x=>'<tr>'+[x.date,x.type,x.team,x.item,x.qty,x.after,x.note].map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';};
 // Lightweight initial read: inventory page does not need infusion/equipment, approvals and history.
 w.initStockInventoryModule=async function(force=false){if(state.pending&&!force)return state.pending;style();ensureFilters();const previous=(w.SI&&w.SI.acc||[]);if(previous.length&&!force){filters();w.si69_renderAccessories();dashboardShell();return Promise.resolve({success:true,cached:true});}state.pending=call('si_getAccessoriesDashboardFast',force===true,55000).then(data=>{if(!data||!data.success)throw Error(data?.message||'Accessories unavailable');w.SI=w.SI||{};w.SI.loaded=true;w.SI.acc=data.accessories||[];w.SI.raw=data;w.SI.accPage=1;w.SI.cart=w.SI.cart||[];const teams=[...new Set(w.SI.acc.map(x=>x.team))],items=[...new Set(w.SI.acc.map(x=>x.itemName))],statuses=['STOCK','LOW_STOCK','UNALLOCATED'],actions=[...new Set(w.SI.acc.map(x=>x.actionRequired))];data.filters={accessoryTeams:teams,accessoryItems:items,accessoryStatuses:statuses,accessoryActions:actions};filters();opt('siAccAction',actions,'All Actions');w.si69_renderAccessories();dashboardShell();if(w.si_renderAccessoriesDashboard)w.si_renderAccessoriesDashboard(); if($('siInventoryDashboardCurrent')&&$('siInventoryDashboardCurrent').offsetParent!==null)w.si69_loadDashboard();w.si_updateCart?.();const info=$('siDataFreshness');if(info)info.textContent='Updated '+new Date().toLocaleTimeString();return data;}).catch(e=>{if($('siAccCards'))$('siAccCards').innerHTML='<div role="alert" style="padding:22px;color:#a11">'+esc(e.message)+' <button class="ces69-btn" onclick="initStockInventoryModule(true)">Retry</button></div>';return{success:false,message:e.message};}).finally(()=>state.pending=null);return state.pending;};
 const ces69OriginalFastInit=w.initStockInventoryModule;
 w.CES69_installInventoryOverrides=function(){
   w.initStockInventoryModule=ces69OriginalFastInit;
   w.si_renderAccCards=w.si69_renderAccessories;
   w.si_applyFilters=w.si69_renderAccessories;
   w.si_submitCheckout=w.si69_checkout;
   if(typeof w.si_switchTab==='function'&&!w.si_switchTab.ces69Wrapped){
     const base=w.si_switchTab;
     const patched=function(tab){const out=base.apply(this,arguments);if(tab==='dashboard')w.si69_loadDashboard(false);if(tab==='acc'){w.si69_renderAccessories();fillCheckout();}return out;};
     patched.ces69Wrapped=true;w.si_switchTab=patched;
   }
   if(typeof w.si_toggleCart==='function'&&!w.si_toggleCart.ces69Wrapped){
     const base=w.si_toggleCart;
     const patched=function(){const out=base.apply(this,arguments);fillCheckout();loadStaffFromSheet();return out;};
     patched.ces69Wrapped=true;w.si_toggleCart=patched;
   }
 };
 w.CES69_installInventoryOverrides();
})(window,document);

/* Existing inventory module: dedicated restock tab, no separate release script. */
(function(w,d){'use strict';function el(id){return d.getElementById(id);}function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
 function fill(id,items,caption){const s=el(id);if(!s)return;let old=s.value;s.innerHTML='<option value="all">'+caption+'</option>'+[...new Set(items.filter(Boolean))].sort().map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');s.value=[...s.options].some(x=>x.value===old)?old:'all';}
 w.siLatestRestockRender=function(){const data=w.SI?.acc||[];fill('siRestockTeam',data.map(x=>x.team),'All Teams');fill('siRestockType',data.map(x=>x.type),'All types');const t=el('siRestockTeam')?.value||'all',k=el('siRestockType')?.value||'all',q=(el('siRestockSearch')?.value||'').toLowerCase();const matches=data.filter(x=>(t==='all'||x.team===t)&&(k==='all'||x.type===k)&&(!q||[x.itemName,x.itemName2,x.accessoryId,x.itemDetail].join(' ').toLowerCase().includes(q)));const host=el('siRestockTable');if(!host)return;host.innerHTML='<table style="border-collapse:collapse;width:100%;min-width:900px;font-size:12px"><thead><tr style="position:sticky;top:0;background:#eaf2ff;text-align:left"><th style="padding:12px">Item / ID</th><th>Team</th><th>Type</th><th>Current</th><th>Min</th><th>Unit cost</th><th>Restock qty</th><th>Action</th></tr></thead><tbody>'+matches.map(a=>'<tr style="border-top:1px solid #e6ebf2"><td style="padding:10px"><b>'+esc(a.itemName2||a.itemName)+'</b><div style="color:#64748b">'+esc(a.accessoryId)+'</div></td><td>'+esc(a.team)+'</td><td>'+esc(a.type)+'</td><td>'+Number(a.stockQty||0)+'</td><td>'+Number(a.minStockQty||0)+'</td><td>'+Number(a.costPerEa||a.unitCost||0)+'</td><td><input class="ces-restock-qty stockpro-control" data-id="'+esc(a.accessoryId)+'" type="number" min="0" step="1" value="0" style="width:85px"></td><td><button class="sp-btn ghost" data-id="'+esc(a.accessoryId)+'" onclick="siLatestSingleRestock(this.dataset.id)">Single</button></td></tr>').join('')+'</tbody></table><p style="color:#64748b;padding:10px">Showing '+matches.length+' allocation rows · Enter 0 for items you do not want to restock</p>';};
 w.siLatestBatchRestock=async function(){const list=[...d.querySelectorAll('#siRestockTable .ces-restock-qty')].map(x=>({id:x.dataset.id,qty:Number(x.value)})).filter(x=>x.qty>0);if(!list.length)return w.Swal?.fire('Select items','Enter positive quantities','info');if(list.some(x=>!Number.isInteger(x.qty)))return w.Swal?.fire('Invalid amount','Use whole quantities only','warning');const ok=await w.Swal?.fire({title:'Confirm restock',text:list.length+' item(s) · '+list.reduce((s,x)=>s+x.qty,0)+' units',showCancelButton:true,confirmButtonText:'Save & log'});if(!ok?.isConfirmed)return;try{const out=await w.CES_API.callFunction('CES69_restockBatch',[{items:list,user:w.currentUser?.email||''}],{transport:'iframe',timeoutMs:120000,module:'inventory',userAction:true});if(!out?.success)throw Error(out?.message||'Failed');await w.Swal.fire('Restock saved',out.items.length+' items · '+out.added+' units','success');await w.initStockInventoryModule(true);w.siLatestRestockRender();}catch(e){w.Swal?.fire('Restock failed',e.message,'error');}};
 w.siLatestSingleRestock=async function(id){const input=[...d.querySelectorAll('#siRestockTable .ces-restock-qty')].find(x=>x.dataset.id===id);if(!input)return;const r=await w.Swal?.fire({title:'Restock '+esc(id),input:'number',inputAttributes:{min:'1',step:'1'},inputValue:1,showCancelButton:true,inputValidator:v=>Number.isInteger(Number(v))&&Number(v)>0?undefined:'Enter positive whole units'});if(!r?.isConfirmed)return;[...d.querySelectorAll('#siRestockTable .ces-restock-qty')].forEach(x=>x.value='0');input.value=r.value;w.siLatestBatchRestock();};
 function tab(t){if(t!=='restock')return;['siInventoryDashboardCurrent','siAccFilters','siAccSection'].forEach(id=>{const node=el(id);if(node){node.style.display='none';node.classList.add('hidden');}});let n=el('siRestockSection');if(n){n.style.display='block';n.classList.remove('hidden');}['siTabDashboardCurrent','siTabAcc','siTabRestock'].forEach(id=>el(id)?.classList.toggle('active',id==='siTabRestock'));w.siLatestRestockRender();}
 const original=w.si_switchTab;w.si_switchTab=function(t){if(t==='restock')return tab(t);const node=el('siRestockSection');if(node){node.classList.add('hidden');node.style.display='none';}el('siTabRestock')?.classList.remove('active');return original?.apply(this,arguments);};
 const init=w.initStockInventoryModule;if(typeof init==='function')w.initStockInventoryModule=function(){const output=init.apply(this,arguments);const then=()=>{if(el('siRestockSection')?.style.display==='block')tab('restock');};if(output?.then)return output.then(v=>{then();return v;});then();return output;};
})(window,document);
