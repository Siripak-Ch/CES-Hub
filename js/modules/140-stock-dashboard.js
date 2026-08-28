/* ============================================================
   CES Stock Pro V3 — Stock_Dashboard_java.html
============================================================ */
let SD_DASH = { loaded:false, raw:null, statusChart:null, rentalChart:null };


function spEsc(v){return String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function spVal(id, fallback=''){const el=document.getElementById(id);return el&&typeof el.value!=='undefined'?String(el.value):fallback;}
function spSetHtml(id,html){const el=document.getElementById(id);if(el)el.innerHTML=html;}
function spNum(n){return Number(n||0).toLocaleString('en-US');}
function spBadge(st){const s=String(st||'Stock'); const safe=s.replace(/\s/g,'-'); return `<span class="sp-badge ${safe}">${spEsc(s)}</span>`;}
function spFmtDate(v){if(!v)return '-';try{return new Date(v).toLocaleDateString('th-TH',{day:'2-digit',month:'short',year:'numeric'});}catch(e){return '-';}}
function spDownloadJsonAsExcel(rows, name){
  if(typeof XLSX==='undefined'){Swal.fire('Export Error','XLSX library not loaded','error');return;}
  const ws=XLSX.utils.json_to_sheet(rows||[]); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Data'); XLSX.writeFile(wb,name||'export.xlsx');
}



function initStockDashboardModule(force=false){
  spEnsureStyle();
  try{sd_primeRentalWorkflow_();}catch(ignorePrimeV263){}
  setTimeout(function(){try{sd_switchStockTab(sessionStorage.getItem('CES_STOCK_TAB_V260')||'dashboard');}catch(e){}},0);
  if (typeof sdStyle === 'function') sdStyle();

  const cacheKey = 'CES_STOCK_DASHBOARD_CACHE_V17';
  const cacheTtlMs = 5 * 60 * 1000;

  function renderFromPayload(res, fromCache){
    if(!res || !res.success){
      Swal.fire('Stock Dashboard Error', (res&&res.message)||'Cannot load dashboard', 'error');
      return;
    }
    SD_DASH.loaded=true;
    SD_DASH.raw=res;
    try { sessionStorage.setItem(cacheKey, JSON.stringify({ts:Date.now(), data:res})); } catch(e) {}
    sd_fillFilters();
    sd_renderAll();
    try{sd_updateReadyStockBenchmark();}catch(ignoreBenchmarkV263){}
    setTimeout(()=>{try{sd_loadRentalWorkflow(false);}catch(e){}},160);
  }

  if(!force){
    try {
      const cached = JSON.parse(sessionStorage.getItem(cacheKey) || 'null');
      if(cached && cached.data && (Date.now() - Number(cached.ts||0) < cacheTtlMs)){
        renderFromPayload(cached.data, true);
        return;
      }
    } catch(e) {}
  }

  const fresh=document.getElementById('sdDataFreshness');
  if(fresh){fresh.classList.remove('stale');fresh.innerHTML='<i class="fas fa-rotate fa-spin"></i> Syncing dashboard…';}

  spSetHtml('sdKpiGrid', '<div class="sp-muted">Loading page...</div>');
  google.script.run
    .withSuccessHandler(res=>renderFromPayload(res,false))
    .withFailureHandler(err=>{const fresh=document.getElementById('sdDataFreshness');if(fresh)fresh.innerHTML='<i class="fas fa-triangle-exclamation"></i> Load failed';Swal.fire('Stock Dashboard Error', err.message||String(err), 'error');})
    .sd_getStockDashboardData(force===true);
}
function sd_fillFilters(){
  const f=SD_DASH.raw.filters||{};
  sd_fillSelect('sdBrand',f.brands,'แบรนด์ทั้งหมด');
  sd_fillSelect('sdModel',f.models,'โมเดลทั้งหมด');
  sd_fillSelect('sdStatus',f.statuses,'สถานะทั้งหมด');
}
function sd_fillSelect(id,arr,label){
  const el=document.getElementById(id); if(!el)return;
  const cur=el.value||'all';
  el.innerHTML=`<option value="all">${label}</option>`+(arr||[]).map(x=>`<option value="${spEsc(x)}">${spEsc(x)}</option>`).join('');
  el.value=(arr||[]).includes(cur)?cur:'all';
}
function sd_getFilteredDevices(){
  const raw=SD_DASH.raw||{};
  const q=spVal('sdSearch','').toLowerCase(), b=spVal('sdBrand','all'), m=spVal('sdModel','all'), s=spVal('sdStatus','all');
  return (raw.inventory||raw.devices||[]).filter(d=>{
    const text=[d.idCode,d.sn,d.serialNumber,d.brand,d.model,d.itemName,d.location,d.status,d.borrower,d.actionRequired,d.recheckNote].join(' ').toLowerCase();
    if(q&&!text.includes(q))return false;
    if(b!=='all'&&d.brand!==b)return false;
    if(m!=='all'&&d.model!==m)return false;
    if(s!=='all'&&d.status!==s)return false;
    return true;
  });
}
function sd_countBy(rows,key){const m={};rows.forEach(x=>{const k=x[key]||'Unknown';m[k]=(m[k]||0)+1});return Object.keys(m).sort().map(k=>({name:k,count:m[k]}));}
function sd_renderSummaryTables(){
  const rows=sd_getFilteredDevices();
  const summary=[...sd_countBy(rows,'brand').map(x=>({type:'Brand',name:x.name,count:x.count})),...sd_countBy(rows,'model').slice(0,25).map(x=>({type:'Model',name:x.name,count:x.count})),...sd_countBy(rows,'status').map(x=>({type:'Status',name:x.name,count:x.count}))];
  spSetHtml('sdSummaryTable',sd_table(summary,[['type','Type'],['name','Name'],['count','Count']]));
  sd_renderCharts();
}
function sd_buildContractRows(){
  const rows=sd_getFilteredDevices().filter(d=>['In-Use','Overdue'].includes(d.status)||Number(d.overdueDays||0)>0);
  const map={};
  rows.forEach(d=>{const loc=d.location||'Unknown'; if(!map[loc])map[loc]={location:loc,total:0,inUse:0,overdue:0,ids:[],modelMap:{},borrowDate:'',expectedReturn:'',maxOverdue:0}; const x=map[loc];x.total++; if(d.status==='Overdue'||Number(d.overdueDays||0)>0)x.overdue++;else x.inUse++;x.ids.push(d.idCode);const model=d.model||d.itemName||'Unknown';x.modelMap[model]=(x.modelMap[model]||0)+1;if(!x.borrowDate&&d.borrowDate)x.borrowDate=d.borrowDate;if(!x.expectedReturn&&d.expectedReturn)x.expectedReturn=d.expectedReturn;x.maxOverdue=Math.max(x.maxOverdue,Number(d.overdueDays||0));});
  return Object.values(map).map(x=>{x.modelList=Object.keys(x.modelMap).map(m=>`${m} ×${x.modelMap[m]}`).join(', ');return x;}).sort((a,b)=>b.overdue-a.overdue||b.total-a.total);
}
function sd_bulkExtend(ids,due,note){
  Swal.fire({title:'กำลังต่อสัญญา...',allowOutsideClick:false,didOpen:()=>Swal.showLoading()});
  google.script.run.withSuccessHandler(res=>{Swal.close(); if(res&&res.success){Swal.fire('สำเร็จ',res.message,'success');initStockDashboardModule(true); if(typeof initStockInventoryModule==='function')initStockInventoryModule(true);}else Swal.fire('ไม่สำเร็จ',(res&&res.message)||'Failed','error');}).withFailureHandler(e=>Swal.fire('Error',e.message||String(e),'error')).si_bulkExtendRental({ids:ids,expectedReturnDate:due,note:note});
}
function sd_bulkReturn(ids){
  Swal.fire({title:'กำลังรับคืน...',allowOutsideClick:false,didOpen:()=>Swal.showLoading()});
  google.script.run.withSuccessHandler(res=>{Swal.close(); if(res&&res.success){Swal.fire('สำเร็จ',res.message,'success');initStockDashboardModule(true); if(typeof initStockInventoryModule==='function')initStockInventoryModule(true);}else Swal.fire('ไม่สำเร็จ',(res&&res.message)||'Failed','error');}).withFailureHandler(e=>Swal.fire('Error',e.message||String(e),'error')).si_bulkReturnEquipment({ids:ids});
}
function sd_table(rows,cols){
  if(!rows||!rows.length)return '<div class="sp-muted">No data</div>';
  return `<div class="sp-table-wrap"><table class="sp-table"><thead><tr>${cols.map(c=>`<th>${c[1]}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${c[0]==='status'?spBadge(r[c[0]]):spEsc(r[c[0]]||'-')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function sd_exportSummary(){
  const rows=sd_getFilteredDevices();
  const summary=[...sd_countBy(rows,'brand').map(x=>({type:'Brand',name:x.name,count:x.count})),...sd_countBy(rows,'model').map(x=>({type:'Model',name:x.name,count:x.count})),...sd_countBy(rows,'status').map(x=>({type:'Status',name:x.name,count:x.count})),...sd_countBy(rows,'location').map(x=>({type:'Location',name:x.name,count:x.count}))];
  spDownloadJsonAsExcel(summary,'CES_Stock_Summary.xlsx');
}


/* ============================================================
   CES Stock Pro V8 — ADDITIVE FRONTEND PATCH FROM V6 BASE
   Keeps all V6 functions, overrides dashboard render/action functions only.
============================================================ */
function spEnsureStyle(){
  if(document.getElementById('stockpro-style-v8'))return;
  const style=document.createElement('style');
  style.id='stockpro-style-v8';
  style.textContent=`
    .stockpro-page{font-family:'Prompt',Inter,Arial,sans-serif!important}
    .sp-mini-badge{background:#fff;color:#b45309;border-radius:999px;padding:2px 7px;margin-left:4px;font-size:10px;font-weight:1000}
    .sp-model-card.byond-sunfusion{border-color:#bfdbfe;background:linear-gradient(180deg,#ffffff,#eff6ff)}
    .sp-model-card.bbraun-infusomat{border-color:#bbf7d0;background:linear-gradient(180deg,#ffffff,#f0fdf4)}
    .sp-model-card.bbraun-spaceplus{border-color:#fde68a;background:linear-gradient(180deg,#ffffff,#fffbeb)}
    .sp-detail-list{display:grid;gap:10px;text-align:left;max-height:62vh;overflow:auto;padding-right:4px}
    .sp-detail-item{display:grid;grid-template-columns:44px 1fr auto;gap:12px;align-items:center;border:1px solid #e8eef6;background:#f8fbff;border-radius:14px;padding:10px 12px}
    .sp-detail-icon{width:38px;height:38px;border-radius:12px;background:#dbeafe;color:#2563eb;display:flex;align-items:center;justify-content:center}
    .sp-detail-title{font-weight:1000;color:#0f172a}.sp-detail-sub{font-size:11px;color:#64748b;margin-top:2px}.sp-detail-actions{display:flex;gap:6px;align-items:center}
    .sp-alert-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;max-height:66vh;overflow:auto;text-align:left}.sp-alert-card{border:1px solid #e8eef6;background:#fff;border-radius:14px;padding:12px;box-shadow:0 3px 12px rgba(30,58,138,.06)}
    .sp-contract-title{display:flex;align-items:center;gap:8px}.sp-contract-title .dot{width:10px;height:10px;border-radius:99px;background:#2563eb}.sp-contract-title.overdue .dot{background:#dc2626}
    @media(max-width:780px){.sp-detail-item{grid-template-columns:36px 1fr}.sp-detail-actions{grid-column:1/-1;justify-content:flex-start}.swal2-popup{width:96vw!important}.sp-alert-grid{grid-template-columns:1fr}.stockpro-chart-box{height:220px}}
  `;
  document.head.appendChild(style);
}
function sd_filteredModelCards_(rows){
  const configs=[
    {brand:'B.BRAUN',keyword:'INFUSOMAT',label:'Infusomat Space',color:'#059669',bg:'#dcfce7',accent:'bbraun-infusomat'},
    {brand:'B.BRAUN',keyword:'SPACEPLUS',label:'Spaceplus',color:'#d97706',bg:'#fef3c7',accent:'bbraun-spaceplus'},
    {brand:'BYOND',keyword:'SUNFUSION',label:'Sunfusion',color:'#2563eb',bg:'#dbeafe',accent:'byond-sunfusion'}
  ];
  return configs.map(cfg=>{const matched=(rows||[]).filter(d=>String(d.brand||'').toUpperCase().includes(cfg.brand)&&[d.model,d.itemName,d.item_name].join(' ').toUpperCase().includes(cfg.keyword));return Object.assign({},cfg,{total:matched.length,stock:matched.filter(d=>d.status==='Stock').length,inUse:matched.filter(d=>d.status==='In-Use').length,overdue:matched.filter(d=>d.status==='Overdue'||Number(d.overdueDays||0)>0).length});});
}
function sd_filteredKpi_(rows){rows=rows||[];return {total:rows.length,stock:rows.filter(d=>d.status==='Stock').length,inUse:rows.filter(d=>d.status==='In-Use').length,overdue:rows.filter(d=>d.status==='Overdue'||Number(d.overdueDays||0)>0).length,missing:rows.filter(d=>d.status==='Missing').length,broken:rows.filter(d=>d.status==='Broken').length,recheck:rows.filter(d=>d.status==='Recheck').length,rentalRows:(SD_DASH.raw&&SD_DASH.raw.rentals?SD_DASH.raw.rentals.length:0)};}
function sd_returnLocation(location){
  const rows=sd_getFilteredDevices().filter(d=>(d.location||'Unknown')===location && (['In-Use','Overdue'].includes(d.status)||Number(d.overdueDays||0)>0));
  Swal.fire({title:'รับคืนทั้งหมด?',html:`<b>${spEsc(location)}</b><br>${rows.length} รายการ`,icon:'question',showCancelButton:true,confirmButtonText:'รับคืน'}).then(r=>{if(!r.isConfirmed)return;sd_bulkReturn(rows.map(x=>x.idCode));});
}


/* ============================================================
   CES Stock Pro V11 — V8 ORIGINAL ADDITIVE PATCH
   Keeps V8 functions and overrides only final dashboard render/action layer.
============================================================ */
function sdIsWarehouseLocation(loc){
  const s=String(loc||'').trim().toUpperCase();
  return s==='WAREHOUSE'||s==='STORE'||s==='STOCK ROOM'||s==='STOCKROOM'||s.includes('WAREHOUSE')||s.includes('คลัง')||s.includes('สโตร์');
}
function sdNormalizeDevice(d){
  d=Object.assign({},d||{});
  if(sdIsWarehouseLocation(d.location)){
    d.location='Warehouse';d.status='Stock';d.finalStatus='Stock';d.rentalStatus='STOCK';
    d.borrower='-';d.borrowDate='';d.expectedReturn='';d.expectedReturnDate='';d.dueDate='';d.overdueDays=0;d.daysRemaining='';
  }
  return d;
}
function sdFilteredDevices(){
  const base=(typeof sd_getFilteredDevices==='function'?sd_getFilteredDevices():(SD_DASH.raw&&SD_DASH.raw.inventory)||[]);
  return (base||[]).map(sdNormalizeDevice);
}
function sdApplyStyle(){
  if(document.getElementById('stockpro-style-v11'))return;
  const style=document.createElement('style');style.id='stockpro-style-v11';style.textContent=`
    .sp-compact-alert-list{display:grid;gap:8px;max-height:60vh;overflow:auto;text-align:left}.sp-alert-row{display:grid;grid-template-columns:34px 1fr auto;gap:10px;align-items:center;border:1px solid #e8eef6;border-radius:14px;background:#fff;padding:10px}.sp-alert-ico{width:32px;height:32px;border-radius:11px;display:flex;align-items:center;justify-content:center}.sp-alert-title{font-weight:1000;color:#0f172a;font-size:13px}.sp-alert-sub{font-size:11px;color:#64748b;margin-top:2px}.sp-contract-row-overdue td{background:#fff1f2!important}.sp-contract-row-completed td{background:#eff6ff!important}.sp-contract-row-active td{background:#fff!important}.sp-contract-filter-card{position:relative;z-index:2}.sp-detail-list-v11{display:grid;gap:8px;max-height:62vh;overflow:auto;text-align:left}.sp-detail-item-v11{display:grid;grid-template-columns:40px 1fr auto;gap:10px;align-items:center;border:1px solid #e8eef6;border-radius:14px;background:#f8fbff;padding:10px}.sp-detail-icon-v11{width:36px;height:36px;border-radius:12px;background:#dbeafe;color:#2563eb;display:flex;align-items:center;justify-content:center}.sp-model-card.byond{border-color:#bfdbfe;background:linear-gradient(180deg,#fff,#eff6ff)}.sp-model-card.infusomat{border-color:#bbf7d0;background:linear-gradient(180deg,#fff,#f0fdf4)}.sp-model-card.spaceplus{border-color:#fde68a;background:linear-gradient(180deg,#fff,#fffbeb)}
    @media(max-width:780px){.sp-contract-filter-card{grid-template-columns:1fr!important}.sp-alert-row{grid-template-columns:30px 1fr}.sp-alert-row .sp-btn{grid-column:1/-1}.sp-detail-item-v11{grid-template-columns:34px 1fr}.sp-detail-item-v11 .sp-action-group{grid-column:1/-1;justify-content:flex-start}}
  `;document.head.appendChild(style);
}
function sd_renderFiltered(){
  spEnsureStyle();sdApplyStyle();
  const rows=sdFilteredDevices();
  sd_renderModelCards(rows);
  sd_renderKpis(sdFilteredKpi(rows));
  sd_renderCharts(rows);
  sd_renderSummaryTables();
  sd_renderContractSummary();
  sd_renderAlerts();
}
function sd_renderAll(){sd_renderFiltered();}
function sd_renderModelCards(filteredRows){
  const rows=filteredRows||sdFilteredDevices();
  const cards=sd_filteredModelCards_?sd_filteredModelCards_(rows):[];
  const html=cards.map(x=>{
    const key=String(x.label||'').toUpperCase();
    const cls=key.includes('SUNFUSION')?'byond':key.includes('INFUSOMAT')?'infusomat':'spaceplus';
    const color=key.includes('SUNFUSION')?'#2563eb':key.includes('INFUSOMAT')?'#059669':'#d97706';
    const bg=key.includes('SUNFUSION')?'#dbeafe':key.includes('INFUSOMAT')?'#dcfce7':'#fef3c7';
    const ready=Number(x.stock||0),low=ready<10;return `<div class="sp-model-card ${cls}"><div class="sp-model-icon" style="background:${bg}"><i class="fas fa-microchip" style="color:${color}"></i></div><div class="sp-model-brand">${spEsc(x.brand)}</div><div class="sp-model-label">${spEsc(x.label)}</div><div class="sp-model-num" style="color:${color}">${spNum(x.total)}</div><div class="ces-ready-stock-line-v263 ${low?'low':'ok'}"><i class="fas ${low?'fa-triangle-exclamation':'fa-circle-check'}"></i> Ready ${spNum(ready)} / Min 10</div><div class="sp-model-sub" style="color:#d97706">In-Use: ${spNum(x.inUse)}</div><div class="sp-model-over">Overdue: ${spNum(x.overdue)}</div></div>`;
  }).join('');
  spSetHtml('sdModelCards',html);
}
function sd_renderCharts(filteredRows){
  const rows=filteredRows||sdFilteredDevices();
  if(typeof Chart==='undefined')return;
  const byStatus=sd_countBy(rows,'status');
  const labels=byStatus.map(x=>x.name), data=byStatus.map(x=>x.count);
  const statusCanvas=document.getElementById('sdStatusChart');
  if(statusCanvas){ if(SD_DASH.statusChart)SD_DASH.statusChart.destroy(); SD_DASH.statusChart=new Chart(statusCanvas,{type:'doughnut',data:{labels,datasets:[{data,backgroundColor:labels.map(l=>({Stock:'#34d399','In-Use':'#fbbf24',Overdue:'#fb7185',Missing:'#fb923c',Broken:'#60a5fa',Recheck:'#a78bfa'}[l]||'#cbd5e1'))}]},options:{plugins:{legend:{position:'right'}},cutout:'60%',responsive:true,maintainAspectRatio:false}});}
  const months=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const byond=new Array(12).fill(0), bbraun=new Array(12).fill(0);
  (SD_DASH.raw&&SD_DASH.raw.rentals||[]).forEach(r=>{const d=new Date(r.borrowDate||r.borrow_date||r.expectedReturnDate||r.expected_return_date);if(isNaN(d))return;const m=d.getMonth();const brand=String(r.brand||'').toUpperCase();if(brand.includes('BYOND'))byond[m]++;else bbraun[m]++;});
  const rentCanvas=document.getElementById('sdRentalChart');
  if(rentCanvas){ if(SD_DASH.rentalChart)SD_DASH.rentalChart.destroy(); SD_DASH.rentalChart=new Chart(rentCanvas,{type:'bar',data:{labels:months,datasets:[{label:'BYOND',data:byond,backgroundColor:'#93c5fd'},{label:'B.Braun',data:bbraun,backgroundColor:'#86efac'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top'}},scales:{y:{beginAtZero:true}}}});}
}
function sdResetContractFilter(){
  const f=document.getElementById('sdContractFilter'),s=document.getElementById('sdContractSort');
  if(f)f.value='all'; if(s)s.value='risk'; sd_renderContractSummary();
}
function sdContractRows(){
  const active=sdFilteredDevices().filter(d=>['In-Use','Overdue'].includes(d.status)||Number(d.overdueDays||0)>0);
  const map={};
  active.forEach(d=>{const loc=d.location||'Unknown';if(!map[loc])map[loc]={location:loc,total:0,inUse:0,overdue:0,completed:0,ids:[],modelMap:{},borrowDate:'',expectedReturn:'',maxOverdue:0,state:'active'};const x=map[loc];x.total++;if(d.status==='Overdue'||Number(d.overdueDays||0)>0){x.overdue++;x.state='overdue';}else x.inUse++;x.ids.push(d.idCode);const model=d.model||d.itemName||'Unknown';x.modelMap[model]=(x.modelMap[model]||0)+1;if(!x.borrowDate&&d.borrowDate)x.borrowDate=d.borrowDate;if(!x.expectedReturn&&d.expectedReturn)x.expectedReturn=d.expectedReturn;x.maxOverdue=Math.max(x.maxOverdue,Number(d.overdueDays||0));});
  (SD_DASH.raw&&SD_DASH.raw.rentals||[]).forEach(r=>{const status=String(r.rentalStatus||r.rental_status||'').toUpperCase();const returned=!!(r.returnDate||r.return_date)||status==='RETURNED'||status==='COMPLETED'||status==='DONE';if(!returned)return;const loc=r.location||'Unknown';if(!map[loc])map[loc]={location:loc,total:0,inUse:0,overdue:0,completed:0,ids:[],modelMap:{},borrowDate:'',expectedReturn:'',maxOverdue:0,state:'completed'};const x=map[loc];x.completed++;x.total++;x.state=x.state==='overdue'?'overdue':(x.inUse?'active':'completed');const model=r.model||'Returned';x.modelMap[model]=(x.modelMap[model]||0)+1;if(!x.borrowDate&&r.borrowDate)x.borrowDate=r.borrowDate;if(!x.expectedReturn&&(r.returnDate||r.expectedReturnDate))x.expectedReturn=r.returnDate||r.expectedReturnDate;});
  let rows=Object.values(map).map(x=>{x.modelList=Object.keys(x.modelMap).slice(0,6).map(m=>`${m} ×${x.modelMap[m]}`).join(', ');return x;});
  const filter=spVal('sdContractFilter','all');
  if(filter==='overdue')rows=rows.filter(x=>x.overdue>0||x.state==='overdue');
  if(filter==='active')rows=rows.filter(x=>x.inUse>0&&x.overdue===0);
  if(filter==='completed')rows=rows.filter(x=>x.completed>0&&x.inUse===0&&x.overdue===0);
  const sort=spVal('sdContractSort','risk');
  rows.sort((a,b)=>{if(sort==='location')return String(a.location).localeCompare(String(b.location));if(sort==='due_asc')return new Date(a.expectedReturn||'2999-12-31')-new Date(b.expectedReturn||'2999-12-31');if(sort==='due_desc')return new Date(b.expectedReturn||'1900-01-01')-new Date(a.expectedReturn||'1900-01-01');return (b.overdue-a.overdue)||(b.inUse-a.inUse)||(b.total-a.total);});
  return rows;
}
function sd_showLocationDetail_(location){
  const rows=sdFilteredDevices().filter(d=>(d.location||'Unknown')===location);
  const html=`<div class="sp-detail-list-v11">${rows.map(d=>`<div class="sp-detail-item-v11"><div class="sp-detail-icon-v11"><i class="fas fa-microchip"></i></div><div><div class="sp-detail-title">${spEsc(d.idCode||'-')} ${spBadge(d.status)}</div><div class="sp-detail-sub">${spEsc(d.brand||'-')} ${spEsc(d.model||d.itemName||'-')} • SN:${spEsc(d.sn||'-')}</div><div class="sp-detail-sub">Borrower: ${spEsc(d.borrower||'-')} • Due: ${spFmtDate(d.expectedReturn||d.expectedReturnDate)}</div></div><div class="sp-action-group"><button class="sp-icon-btn orange" onclick='sd_bulkExtend([${JSON.stringify(d.idCode)}],"${spEsc(d.expectedReturn||'')}","")'><i class="fas fa-calendar-plus"></i></button><button class="sp-icon-btn green" onclick='sd_bulkReturn([${JSON.stringify(d.idCode)}])'><i class="fas fa-undo"></i></button></div></div>`).join('')}</div>`;
  Swal.fire({title:'รายละเอียด: '+location,width:900,html,confirmButtonText:'Close'});
}
function sd_extendLocation(location){
  const rows=sdFilteredDevices().filter(d=>(d.location||'Unknown')===location&&(['In-Use','Overdue'].includes(d.status)||Number(d.overdueDays||0)>0));
  const oldDue=(rows.find(x=>x.expectedReturn)||{}).expectedReturn||'';
  Swal.fire({title:'ต่อสัญญา: '+location,html:`<div class="sp-muted" style="margin-bottom:8px">วันคืนเดิม: <b>${spFmtDate(oldDue)}</b></div><input id="swDue" class="swal2-input" type="date" value="${spEsc(oldDue)}"><input id="swNote" class="swal2-input" placeholder="หมายเหตุ">`,showCancelButton:true,confirmButtonText:'ต่อสัญญา'}).then(r=>{if(!r.isConfirmed)return;const due=spVal('swDue','');if(!due){Swal.fire('กรุณาเลือกวันที่','','warning');return;}sd_bulkExtend(rows.map(x=>x.idCode),due,spVal('swNote',''));});
}
function sd_renderAlerts(){
  const rows=sdFilteredDevices().filter(d=>d.status==='Overdue'||d.status==='Missing'||d.status==='Broken'||d.status==='Recheck'||Number(d.overdueDays||0)>0||d.actionRequired);
  spSetHtml('sdAlertCount',`${rows.length} alerts`);spSetHtml('sdAlertHeaderCount',rows.length>99?'99+':rows.length);
  const shortRows=rows.slice(0,8).map(d=>({type:d.status,id:d.idCode,location:d.location,action:d.actionRequired||'-'}));
  spSetHtml('sdAlertTable',sd_table(shortRows,[['type','Type'],['id','ID'],['location','Location'],['action','Action']]));
}
function sd_showAlertDetail(id){
  const d=sdFilteredDevices().find(x=>x.idCode===id)||{};
  Swal.fire({title:'รายละเอียด Alert',html:`<div style="text-align:left"><b>${spEsc(d.idCode||'-')}</b> ${spBadge(d.status)}<br>SN: ${spEsc(d.sn||'-')}<br>Model: ${spEsc(d.brand||'-')} ${spEsc(d.model||d.itemName||'-')}<br>Location: ${spEsc(d.location||'-')}<br>Borrower: ${spEsc(d.borrower||'-')}<br>Due: ${spFmtDate(d.expectedReturn||d.expectedReturnDate)}<br>Action: ${spEsc(d.actionRequired||d.recheckNote||'-')}</div>`});
}



/* ============================================================
   CES Stock Pro V15 — Dashboard UX + Cache Patch
   Additive only; public function names remain available.
============================================================ */
const SD_CACHE_KEY_V15 = 'CES_STOCK_DASHBOARD_CACHE_V15';
const SD_CACHE_TTL_MS_V15 = 5 * 60 * 1000;

function sdApplyThemeStyle(){
  if(document.getElementById('stockpro-dashboard-v15-style')) return;
  const st=document.createElement('style');
  st.id='stockpro-dashboard-v15-style';
  st.textContent=`
    #view-stock_dashboard .stockpro-header-card{background:#fff!important;border:1px solid #e2e8f0!important;box-shadow:0 8px 28px rgba(15,23,42,.05)!important;}
    #view-stock_dashboard .sd-icon-only{width:42px!important;height:42px!important;min-width:42px!important;padding:0!important;border-radius:14px!important;font-size:0!important;position:relative!important;}
    #view-stock_dashboard .sd-icon-only i{font-size:14px!important;margin:0!important;}
    #view-stock_dashboard .sp-btn.warn{background:#f59e0b!important;color:#fff!important;}
    #view-stock_dashboard .sp-btn.ghost{background:#fff!important;color:#0f766e!important;border-color:#bfdbfe!important;}
    #view-stock_dashboard .sp-btn.dark{background:#0f172a!important;color:#fff!important;}
    #view-stock_dashboard .sd-head-count{position:absolute;top:-7px;right:-7px;min-width:21px;height:21px;border-radius:999px;background:#ef4444;color:#fff;font-size:10px!important;font-weight:900;display:flex;align-items:center;justify-content:center;border:2px solid #fff;padding:0 5px;}
    #view-stock_dashboard .sp-model-card{background:#fff!important;box-shadow:0 5px 18px rgba(15,23,42,.05)!important;border-width:1px!important;}
    #view-stock_dashboard .sp-model-card.infu,#view-stock_dashboard .sp-model-card.infusomat{border-color:#bbf7d0!important;}
    #view-stock_dashboard .sp-model-card.space,#view-stock_dashboard .sp-model-card.spaceplus{border-color:#fde68a!important;}
    #view-stock_dashboard .sp-model-card.byond{border-color:#bfdbfe!important;}
    #view-stock_dashboard .sp-kpi{background:#fff!important;border:1px solid #e2e8f0!important;box-shadow:0 5px 18px rgba(15,23,42,.04)!important;}
    #view-stock_dashboard .sp-contract-row-overdue td{background:#fff!important}.sp-contract-row-overdue .sp-status-dot{background:#ef4444!important;}
    #view-stock_dashboard .sp-contract-row-completed td{background:#fff!important}.sp-contract-row-completed .sp-status-dot{background:#38bdf8!important;}
    #view-stock_dashboard .sp-contract-row-active td{background:#fff!important}.sp-contract-row-active .sp-status-dot{background:#10b981!important;}
    #view-stock_dashboard .sp-status-dot{width:11px;height:11px;border-radius:50%;display:inline-block;margin-right:8px;box-shadow:0 0 0 4px rgba(148,163,184,.12);vertical-align:middle;}
    .sd-v15-alert-list{max-height:64vh;overflow:auto;text-align:left}.sd-v15-alert-row{display:grid;grid-template-columns:32px 1fr auto;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid #edf2f7}.sd-v15-alert-dot{width:28px;height:28px;border-radius:12px;display:flex;align-items:center;justify-content:center}.sd-v15-alert-title{font-size:13px;font-weight:900;color:#0f172a}.sd-v15-alert-sub{font-size:11px;color:#64748b;margin-top:2px}
  `;
  document.head.appendChild(st);
}

function sdSaveCache_(res){try{sessionStorage.setItem(SD_CACHE_KEY_V15,JSON.stringify({ts:Date.now(),data:res}));}catch(e){}}
function sdReadCache_(){try{const x=JSON.parse(sessionStorage.getItem(SD_CACHE_KEY_V15)||'null');if(x&&x.data&&(Date.now()-x.ts)<SD_CACHE_TTL_MS_V15)return x.data;}catch(e){}return null;}

if(typeof window.sdOriginalInitBeforeCachePatch === 'undefined' && typeof initStockDashboardModule === 'function'){
  window.sdOriginalInitBeforeCachePatch = initStockDashboardModule;
  initStockDashboardModule = function(force=false){
    sdApplyThemeStyle();
    const cached = !force ? sdReadCache_() : null;
    if(cached){SD_DASH.loaded=true;SD_DASH.raw=cached;try{sd_fillFilters();sd_renderAll();}catch(e){console.warn(e);} }
    const refreshStock=()=>window.CES_API.callFunction('sd_getStockDashboardData',[force===true],{priority:cached&&!force?'background':'user',background:!!(cached&&!force),dedupe:true}).then(res=>{
      if(!res||!res.success){if(!cached)Swal.fire('Stock Dashboard Error',(res&&res.message)||'Cannot load dashboard','error');return;}
      SD_DASH.loaded=true;SD_DASH.raw=res;sdSaveCache_(res);sd_fillFilters();sd_renderAll();
    }).catch(err=>{if(!cached)Swal.fire('Stock Dashboard Error',err.message||String(err),'error');});
    if(cached&&!force)setTimeout(refreshStock,1200);else refreshStock();
  };
}

if(typeof window.sdOriginalRenderContract === 'undefined' && typeof sd_renderContractSummary === 'function'){
  window.sdOriginalRenderContract = sd_renderContractSummary;
  sd_renderContractSummary = function(){
    window.sdOriginalRenderContract();
    setTimeout(()=>{document.querySelectorAll('#sdContractTable tbody tr').forEach(tr=>{if(!tr.querySelector('.sp-status-dot')){const first=tr.querySelector('td');if(first){const dot=document.createElement('span');dot.className='sp-status-dot';first.prepend(dot);}}});},0);
  };
}

if(typeof window.sdOriginalRenderAlerts === 'undefined' && typeof sd_renderAlerts === 'function'){
  window.sdOriginalRenderAlerts = sd_renderAlerts;
  sd_renderAlerts = function(){
    window.sdOriginalRenderAlerts();
    const text=(document.getElementById('sdAlertCount')||{}).textContent||'0';
    const n=(text.match(/\d+/)||['0'])[0];
    const h=document.getElementById('sdAlertHeaderCount'); if(h)h.textContent=Number(n)>99?'99+':n;
  };
}

function sd_openAlertPopup(){
  sdApplyThemeStyle();
  const base=(typeof sdFilteredDevices==='function'?sdFilteredDevices():(SD_DASH.raw&&SD_DASH.raw.alerts)||[]);
  const rows=(base||[]).filter(d=>d.status==='Overdue'||d.status==='Missing'||d.status==='Broken'||d.status==='Recheck'||Number(d.overdueDays||0)>0||d.actionRequired||d.recheckNote);
  const types=['all','Overdue','Missing','Broken','Recheck','Action Required'];
  window.sdAlertList=function(type){
    let list=rows;
    if(type&&type!=='all')list=rows.filter(d=>type==='Action Required'?!!(d.actionRequired||d.recheckNote):(d.status===type||(type==='Overdue'&&Number(d.overdueDays||0)>0)));
    return `<div class="sd-v15-alert-list">${list.map(d=>`<div class="sd-v15-alert-row"><div class="sd-v15-alert-dot" style="background:${d.status==='Overdue'?'#fee2e2':'#eff6ff'};color:${d.status==='Overdue'?'#dc2626':'#2563eb'}"><i class="fas fa-bell"></i></div><div><div class="sd-v15-alert-title">${spEsc(d.idCode||'-')} ${spBadge(d.status)}</div><div class="sd-v15-alert-sub">${spEsc(d.brand||'-')} ${spEsc(d.model||d.itemName||'-')} • ${spEsc(d.location||'-')}</div></div><button class="sp-btn soft" onclick='sd_showAlertDetail(${JSON.stringify(d.idCode)})'>รายละเอียด</button></div>`).join('')||'<div class="sp-muted">No alert</div>'}</div>`;
  };
  Swal.fire({title:'Stock Alerts',width:900,html:`<select id="sdV15AlertFilter" class="swal2-input" style="width:260px;margin:0 0 14px" onchange="document.getElementById('sdV15AlertList').innerHTML=sdAlertList(this.value)">${types.map(t=>`<option value="${t}">${t==='all'?'ทุกประเภท':t}</option>`).join('')}</select><div id="sdV15AlertList">${sdAlertList('all')}</div>`,confirmButtonText:'Close'});
}

try{sdApplyThemeStyle();}catch(e){}


/* ============================================================
   CES Stock Pro V17 — Dashboard UX patch
============================================================ */
function sdStyle(){
  if(document.getElementById('stock-dashboard-v17-style')) return;
  const style=document.createElement('style');
  style.id='stock-dashboard-v17-style';
  style.textContent=`
    #view-stock_dashboard .sd-icon-only{width:40px!important;height:40px!important;min-width:40px!important;padding:0!important;font-size:0!important;border-radius:12px!important;position:relative!important}
    #view-stock_dashboard .sd-icon-only i{font-size:15px!important}
    #view-stock_dashboard #sdAlertHeaderCount{position:absolute!important;top:-7px!important;right:-7px!important;margin:0!important;min-width:20px!important;height:20px!important;border-radius:999px!important;background:#ef4444!important;color:#fff!important;font-size:10px!important;font-weight:900!important;display:flex!important;align-items:center!important;justify-content:center!important;border:2px solid #fff!important;padding:0 4px!important}
    #view-stock_dashboard .sp-model-card{background:#fff!important;border:1.5px solid #e8eef6!important}
    #view-stock_dashboard .sp-model-card.byond-sunfusion{border-color:#bfdbfe!important;background:#f8fbff!important}
    #view-stock_dashboard .sp-model-card.bbraun-infusomat{border-color:#bbf7d0!important;background:#f8fffb!important}
    #view-stock_dashboard .sp-model-card.bbraun-spaceplus{border-color:#fde68a!important;background:#fffdf5!important}
  `;
  document.head.appendChild(style);
}


/* ============================================================
   CES Stock Pro V31 — Dashboard KPI + Contract Export Patch
   Additive override. Keeps existing dashboard functions.
   - Overdue / Missing / Broken are counted separately and correctly.
   - Rental Contract Summary can be exported as Excel.
   - Contract summary rows stay white and use a status dot.
============================================================ */
function sdStatusOf(d){
  const text=[d.status,d.baseStatus,d.base_status,d.rentalStatus,d.rental_status,d.dqStatus,d.dq_status,d.actionRequired,d.action_required,d.recheckNote,d.recheck_note].join(' ').toUpperCase();
  if(/BROKEN|BREAK|DAMAGED|DEFECT|เสีย|ชำรุด|พัง/.test(text)) return 'Broken';
  if(/MISSING|LOST|สูญหาย|หาย|หาไม่พบ/.test(text)) return 'Missing';
  if(/RECHECK|RE-CHECK|ตรวจซ้ำ|ตรวจสอบซ้ำ/.test(text)) return 'Recheck';
  if(/OVERDUE|EXPIRED|เลยกำหนด|เกินกำหนด/.test(text)||Number(d.overdueDays||d.overdue_days||0)>0) return 'Overdue';
  if(/IN[_\s-]*USE|BORROW|RENT|ยืม|ใช้งาน/.test(text)) return 'In-Use';
  return 'Stock';
}
function sdNormalizedRows(rows){
  return (rows||[]).map(d=>Object.assign({},d,{status:sdStatusOf(d)}));
}
if(typeof sdFilteredDevices === 'function' && !window.__sdV31FilteredPatch){
  window.__sdV31FilteredPatch=true;
  const _baseFiltered=sdFilteredDevices;
  sdFilteredDevices=function(){ return sdNormalizedRows(_baseFiltered()); };
}
function sdFilteredKpi(rows){
  rows = sdNormalizedRows(rows||[]);
  return {
    total: rows.length,
    stock: rows.filter(d=>d.status==='Stock').length,
    inUse: rows.filter(d=>d.status==='In-Use').length,
    overdue: rows.filter(d=>d.status==='Overdue'||Number(d.overdueDays||d.overdue_days||0)>0).length,
    missing: rows.filter(d=>d.status==='Missing').length,
    broken: rows.filter(d=>d.status==='Broken').length,
    recheck: rows.filter(d=>d.status==='Recheck').length,
    rentalRows: (SD_DASH.raw&&SD_DASH.raw.rentals||[]).length
  };
}
function sd_renderKpis(k){
  k = k || sdFilteredKpi(typeof sdFilteredDevices==='function'?sdFilteredDevices():[]);
  const items=[
    ['ทั้งหมด',k.total,'fa-boxes','#2563eb','#dbeafe'],
    ['อยู่ในคลัง',k.stock,'fa-warehouse','#059669','#dcfce7'],
    ['ถูกยืม',k.inUse,'fa-arrow-right-from-bracket','#d97706','#fef3c7'],
    ['OVERDUE',k.overdue,'fa-clock','#dc2626','#fee2e2'],
    ['MISSING',k.missing,'fa-question-circle','#854d0e','#fef9c3'],
    ['BROKEN',k.broken,'fa-screwdriver-wrench','#64748b','#e2e8f0'],
    ['RECHECK',k.recheck,'fa-triangle-exclamation','#7c3aed','#ede9fe'],
    ['RENTAL ROWS',k.rentalRows,'fa-file-contract','#0ea5e9','#e0f2fe']
  ];
  spSetHtml('sdKpiGrid',items.map(i=>`<div class="sp-kpi"><div class="ico" style="background:${i[4]}"><i class="fas ${i[2]}" style="color:${i[3]}"></i></div><div class="label">${i[0]}</div><div class="val" style="color:${i[3]}">${spNum(i[1])}</div></div>`).join(''));
}
function sdContractRowsFlat(){
  const rows = typeof sdContractRows==='function' ? sdContractRows() : [];
  return rows.map(r=>({
    Location:r.location,
    Total:r.total,
    In_Use:r.inUse,
    Overdue:r.overdue,
    Completed:r.completed||0,
    Borrow_Date:spFmtDate(r.borrowDate),
    Expected_Return:spFmtDate(r.expectedReturn),
    Max_Overdue_Days:r.maxOverdue||0,
    Models:r.modelList||'',
    Device_IDs:(r.ids||[]).join(', '),
    Status:r.overdue?'OVERDUE':((r.completed&&!r.inUse)?'COMPLETED':'ACTIVE')
  }));
}
function sd_exportContractSummaryExcel(){
  const data = sdContractRowsFlat();
  if(!data.length){Swal.fire('No contract records','','info');return;}
  if(typeof XLSX === 'undefined'){
    Swal.fire('Export Error','XLSX library not loaded','error');return;
  }
  const ws=XLSX.utils.json_to_sheet(data);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Rental Contract Summary');
  XLSX.writeFile(wb,'CES_Rental_Contract_Summary.xlsx');
}
function sdEnsureContractExportButton(){
  const head=document.querySelector('#view-stock_dashboard #sdContractTable')?.closest('.stockpro-card')?.querySelector('.stockpro-card-head');
  if(!head || document.getElementById('sdContractExportBtn')) return;
  const btn=document.createElement('button');
  btn.id='sdContractExportBtn';
  btn.className='sp-btn csv5-icon-btn ces-action-excel ces-contract-export-icon';
  btn.title='Export Contract Excel';
  btn.setAttribute('aria-label','Export Contract Excel');
  btn.innerHTML='<i class="fas fa-file-excel"></i>';
  btn.onclick=sd_exportContractSummaryExcel;
  head.appendChild(btn);
}
function sd_renderContractSummary(){
  const rows=typeof sdContractRows==='function'?sdContractRows():[];
  spSetHtml('sdContractCount',`${rows.length} locations`);
  if(!rows.length){spSetHtml('sdContractTable','<div class="sp-muted">No contract records</div>');sdEnsureContractExportButton();return;}
  spSetHtml('sdContractTable',`<div class="sp-table-wrap"><table class="sp-table"><thead><tr><th>Location</th><th>Items</th><th>Status</th><th>Borrow Date</th><th>Expected / Return</th><th>Action</th></tr></thead><tbody>${rows.map(r=>{const cls=r.overdue?'sp-contract-row-overdue':(r.completed&&!r.inUse?'sp-contract-row-completed':'sp-contract-row-active');const state=r.overdue?'OVERDUE':((r.completed&&!r.inUse)?'COMPLETED':'ACTIVE');return `<tr class="${cls}"><td><div class="ces-contract-location"><span class="sp-status-dot"></span><div><b>${spEsc(r.location)}</b><span>${spEsc(r.modelList)}</span></div></div></td><td>${spNum(r.total)}</td><td><span class="sp-chip ok">In-Use ${spNum(r.inUse)}</span> <span class="sp-chip low">Overdue ${spNum(r.overdue)}</span> <span class="sp-chip">Done ${spNum(r.completed||0)}</span><span class="sp-sub">${state}</span></td><td>${spFmtDate(r.borrowDate)}</td><td>${spFmtDate(r.expectedReturn)}${r.maxOverdue?`<span class="sp-sub" style="color:#dc2626">เลย ${spNum(r.maxOverdue)} วัน</span>`:''}</td><td><div class="sp-action-group"><button class="sp-icon-btn" title="รายละเอียด" onclick='sd_showLocationDetail(${JSON.stringify(r.location)})'><i class="fas fa-magnifying-glass-plus"></i></button><button class="sp-icon-btn orange" title="ต่อสัญญา" onclick='sd_extendLocation(${JSON.stringify(r.location)})'><i class="fas fa-calendar-plus"></i></button><button class="sp-icon-btn green" title="รับคืน" onclick='sd_returnLocation(${JSON.stringify(r.location)})'><i class="fas fa-undo"></i></button></div></td></tr>`;}).join('')}</tbody></table></div>`);
  sdEnsureContractExportButton();
}
if(!window.__sdV31RenderFilteredPatch && typeof sd_renderFiltered==='function'){
  window.__sdV31RenderFilteredPatch=true;
  const _baseSdRenderFiltered=sd_renderFiltered;
  sd_renderFiltered=function(){
    const rows = typeof sdFilteredDevices==='function'?sdFilteredDevices():sd_getFilteredDevices();
    sd_renderModelCards(rows);
    sd_renderKpis(sdFilteredKpi(rows));
    sd_renderSummaryTables();
    sd_renderContractSummary();
    sd_renderAlerts();
  };
}
document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{try{sdEnsureContractExportButton();}catch(e){}},1000));


/* ============================================================
   CES Stock Pro V24.5 — Contract email / contract-level alerts
============================================================ */
function sdContractRows_(){
  const devices=(typeof sdFilteredDevices==='function'?sdFilteredDevices():(SD_DASH.raw&&SD_DASH.raw.devices)||[]).filter(d=>['In-Use','Overdue'].includes(d.status)||Number(d.overdueDays||0)>0);
  const map={};
  devices.forEach(d=>{const loc=String(d.location||'Unknown'),borrower=String(d.borrower||'-'),due=String(d.expectedReturn||d.expectedReturnDate||''),key=[loc,borrower,due].join('||');if(!map[key])map[key]={key,location:loc,borrower,borrowerEmail:d.borrowerEmail||d.borrower_email||'Siripak.Ch@nhealth-asia.com',dueDate:due,total:0,overdue:0,ids:[]};const x=map[key];x.total++;x.ids.push(d.idCode);if(d.status==='Overdue'||Number(d.overdueDays||0)>0)x.overdue++;});
  return Object.values(map).sort((a,b)=>String(a.dueDate).localeCompare(String(b.dueDate)));
}
async function sd_openRentalAlertsSheet(){
  try{const r=await window.CES_API.callFunction('sd_getRentalAlertsInfo',[],{loadingLabel:'Opening Rental Alerts…'});if(!r||!r.success)throw new Error((r&&r.message)||'Rental Alerts unavailable');window.open(r.sheetUrl,'_blank','noopener');}catch(e){Swal.fire({icon:'error',title:'Rental Alerts',text:e.message||String(e)});}
}
async function sd_saveRentalEmail(location){
  const el=document.getElementById('sd-v245-borrower-email');const email=String(el&&el.value||'').trim();
  try{const r=await window.CES_API.callFunction('sd_saveRentalBorrowerEmail',[{location,email}],{loadingLabel:'Saving borrower email…'});if(!r||!r.success)throw new Error((r&&r.message)||'Save failed');Swal.fire({icon:'success',title:'Email saved',text:r.email+' · '+r.updated+' active rental row(s)',timer:1600,showConfirmButton:false});if(SD_DASH.raw&&SD_DASH.raw.devices)SD_DASH.raw.devices.filter(d=>String(d.location||'')===String(location)).forEach(d=>{d.borrowerEmail=r.email;d.borrower_email=r.email;});}catch(e){Swal.fire({icon:'error',title:'Save failed',text:e.message||String(e)});}
}
function sd_showLocationDetail(location){
  const rows=(SD_DASH.raw&&SD_DASH.raw.devices||[]).filter(d=>String(d.location||'')===String(location)&&(['In-Use','Overdue','เช่ายืม'].includes(d.status)||Number(d.overdueDays||0)>0));
  if(!rows.length){Swal.fire('ไม่พบรายการ','','info');return;}
  const emailRow=rows.find(d=>d.borrowerEmail||d.borrower_email);
  const borrowerEmail=String((emailRow&&(emailRow.borrowerEmail||emailRow.borrower_email))||'').trim();
  const borrowers=[...new Set(rows.map(d=>String(d.borrower||'-')).filter(Boolean))];
  const overdue=rows.filter(d=>d.status==='Overdue'||Number(d.overdueDays||0)>0).length;
  const dueDates=rows.map(d=>String(d.expectedReturn||d.expectedReturnDate||'')).filter(Boolean).sort();
  const cards=rows.map((d,i)=>{
    const due=String(d.expectedReturn||d.expectedReturnDate||'');
    const late=d.status==='Overdue'||Number(d.overdueDays||0)>0;
    const mail=String(d.borrowerEmail||d.borrower_email||borrowerEmail||'').trim();
    const id=spEsc(d.idCode||d.id_code||'-');
    return `<article class="ces-rental-detail-item">
      <div class="ces-rental-detail-item-head">
        <div><small>ITEM ${i+1}</small><strong>${id}</strong></div>
        <div>${spBadge(d.status)}</div>
      </div>
      <div class="ces-rental-serial-grid">
        <div><span>SN</span><b>${spEsc(d.sn||d.serialNumber||'-')}</b></div>
        <div><span>AC SN</span><b>${spEsc(d.acPlugSn||d.ac_plug_sn||'-')}</b></div>
        <div><span>Clamp SN</span><b>${spEsc(d.clampSn||d.clamp_sn||'-')}</b></div>
      </div>
      <div class="ces-rental-detail-grid">
        <div><span>Brand / Model</span><b>${spEsc(d.brand||'-')} · ${spEsc(d.model||d.itemName||'-')}</b></div>
        <div><span>Borrower</span><b>${spEsc(d.borrower||'-')}</b></div>
        <div class="wide"><span>Borrower Email</span>${mail?`<a href="mailto:${spEsc(mail)}">${spEsc(mail)}</a>`:'<b>-</b>'}</div>
        <div><span>Borrow Date</span><b>${spFmtDate(d.borrowDate||d.borrow_date)}</b></div>
        <div><span>Due Date</span><b>${spFmtDate(due)}</b>${late?`<small class="late">Overdue ${spNum(d.overdueDays||0)} day(s)</small>`:''}</div>
        <div class="wide"><span>Action Required</span><b>${spEsc(d.actionRequired||d.action_required||'-')}</b></div>
      </div>
    </article>`;
  }).join('');
  const html=`
    <style>
      .ces-rental-detail-popup{border-radius:24px!important}.ces-rental-detail-popup .swal2-html-container{margin:0 22px 18px!important;overflow:visible!important}
      .ces-rental-detail-summary{display:grid;grid-template-columns:2fr repeat(3,1fr);gap:10px;margin:4px 0 12px;text-align:left}
      .ces-rental-detail-summary>div,.ces-rental-contact>div{border:1px solid #dfe7f1;background:#f8fafc;border-radius:14px;padding:11px 12px;min-width:0}
      .ces-rental-detail-summary small,.ces-rental-contact span,.ces-rental-detail-grid span,.ces-rental-serial-grid span{display:block;font-size:9px;font-weight:900;color:#64748b;text-transform:uppercase;letter-spacing:.03em;margin-bottom:4px}
      .ces-rental-detail-summary strong{display:block;font-size:13px;color:#0f172a;overflow-wrap:anywhere}.ces-rental-detail-summary .danger{color:#dc2626}
      .ces-rental-contact{display:grid;grid-template-columns:1fr 2fr;gap:10px;margin-bottom:12px;text-align:left}.ces-rental-contact b{font-size:12px;color:#0f172a;overflow-wrap:anywhere}
      .ces-rental-email-edit{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}.ces-rental-email-edit input{min-width:0;width:100%;border:1px solid #cbd5e1;border-radius:9px;padding:8px 10px;font-size:11px}.ces-rental-email-edit button{white-space:nowrap}
      .ces-rental-detail-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;max-height:54vh;overflow:auto;padding:2px 4px 8px 2px;text-align:left}
      .ces-rental-detail-item{border:1px solid #dfe7f1;border-radius:16px;background:#fff;padding:12px;box-shadow:0 4px 14px rgba(15,23,42,.035);min-width:0}
      .ces-rental-detail-item-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-bottom:9px;border-bottom:1px solid #edf2f7}.ces-rental-detail-item-head small{display:block;font-size:9px;color:#94a3b8;font-weight:900}.ces-rental-detail-item-head strong{font-size:13px;color:#0f4aa3;overflow-wrap:anywhere}
      .ces-rental-serial-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:9px}.ces-rental-serial-grid>div{background:#f8fafc;border-radius:10px;padding:8px;min-width:0}.ces-rental-serial-grid b{font-size:11px;color:#0f172a;overflow-wrap:anywhere}
      .ces-rental-detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:9px}.ces-rental-detail-grid>div{min-width:0}.ces-rental-detail-grid .wide{grid-column:1/-1}.ces-rental-detail-grid b,.ces-rental-detail-grid a{display:block;font-size:11px;line-height:1.35;color:#334155;overflow-wrap:anywhere}.ces-rental-detail-grid a{color:#2563eb}.ces-rental-detail-grid .late{display:block;color:#dc2626;font-size:9px;font-weight:900;margin-top:3px}
      @media(max-width:820px){.ces-rental-detail-summary{grid-template-columns:repeat(2,1fr)}.ces-rental-contact{grid-template-columns:1fr}.ces-rental-detail-list{grid-template-columns:1fr;max-height:58vh}}
      @media(max-width:520px){.ces-rental-serial-grid{grid-template-columns:1fr}.ces-rental-detail-grid{grid-template-columns:1fr}.ces-rental-detail-grid .wide{grid-column:auto}.ces-rental-email-edit{grid-template-columns:1fr}.ces-rental-detail-popup .swal2-html-container{margin:0 12px 14px!important}}
    </style>
    <div class="ces-rental-detail-summary">
      <div><small>LOCATION</small><strong>${spEsc(location)}</strong></div>
      <div><small>ITEMS</small><strong>${spNum(rows.length)}</strong></div>
      <div><small>OVERDUE</small><strong class="${overdue?'danger':''}">${spNum(overdue)}</strong></div>
      <div><small>EARLIEST DUE</small><strong>${dueDates[0]?spFmtDate(dueDates[0]):'-'}</strong></div>
    </div>
    <div class="ces-rental-contact">
      <div><span>Borrower</span><b>${spEsc(borrowers.join(', ')||'-')}</b></div>
      <div><span>Borrower Email / Contract Contact</span><div class="ces-rental-email-edit"><input id="sd-v245-borrower-email" type="email" value="${spEsc(borrowerEmail)}" placeholder="name@company.com"><button class="sp-btn" onclick='sd_saveRentalEmail(${JSON.stringify(location)})'>Save Email</button></div></div>
    </div>
    <div class="ces-rental-detail-list">${cards}</div>`;
  Swal.fire({title:'Rental Contract Detail',width:'min(1180px,96vw)',html,confirmButtonText:'Close',customClass:{popup:'ces-rental-detail-popup'}});
}

function sd_openRentalContractAlertPopup(){
  const rows=sdContractRows_().filter(r=>{if(!r.dueDate)return false;const due=new Date(r.dueDate+'T00:00:00'),today=new Date();today.setHours(0,0,0,0);if(isNaN(due))return r.overdue>0;const days=Math.round((due-today)/86400000);r.daysToDue=days;return days<=7;});
  const html=`<div style="text-align:left"><div style="display:flex;justify-content:flex-end;margin-bottom:10px"><button class="sp-btn soft" onclick="sd_openRentalAlertsSheet()"><i class="fas fa-table-list"></i> Rental Alerts Sheet</button></div><div class="sp-table-wrap"><table class="sp-table"><thead><tr><th>Contract / Location</th><th>Borrower</th><th>Email</th><th>Due</th><th>Items</th><th>Status</th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${spEsc(r.location)}</b></td><td>${spEsc(r.borrower)}</td><td>${spEsc(r.borrowerEmail)}</td><td>${spFmtDate(r.dueDate)}</td><td>${spNum(r.total)}</td><td>${r.daysToDue<0?`<span class="sp-chip low">Overdue ${Math.abs(r.daysToDue)}d</span>`:`<span class="sp-chip ok">Due in ${r.daysToDue}d</span>`}</td></tr>`).join('')||'<tr><td colspan="6" class="sp-muted">No contract alert in the next 7 days</td></tr>'}</tbody></table></div></div>`;
  Swal.fire({title:'Rental Contract Alerts',width:950,html,confirmButtonText:'Close'});
}
window.sd_openRentalAlertsSheet=sd_openRentalAlertsSheet;window.sd_saveRentalEmail=sd_saveRentalEmail;window.sd_openRentalContractAlertPopup=sd_openRentalContractAlertPopup;


/* ============================================================
   CES Stock Pro V24.8 — Rental workflow cards
============================================================ */
const SD_RENTAL_SOURCE_V248='https://docs.google.com/spreadsheets/d/1X7f6BatQ-y5ZW6VYTv2oT34rbsCLeNgac0APt7njFrk/edit?gid=554643121#gid=554643121';
function sd_rentalStatusClass_(s){
  s=String(s||'OPEN').toUpperCase();
  if(s==='COMPLETED')return 'complete';
  if(s==='WAITING_RETURN')return 'return';
  if(s==='WAITING_RENEWAL')return 'renew';
  if(s==='IN_PROGRESS')return 'progress';
  if(s==='FOLLOW_UP_SENT')return 'follow';
  return 'open';
}
function sd_rentalActionLabel_(a){
  a=String(a||'NONE').toUpperCase();
  if(a==='RETURN_REQUESTED')return 'Return requested';
  if(a==='RENEWAL_REQUESTED')return 'Renewal requested';
  return 'No borrower response';
}
let SD_RENTAL_WORKFLOW_V260={cards:[],summary:{}};
const SD_RENTAL_CACHE_KEY_V262='CES_RENTAL_WORKFLOW_CACHE_V262';
const SD_RENTAL_CACHE_TTL_V262=6*60*60*1000;
function sdReadRentalCache_(){try{let raw=localStorage.getItem(SD_RENTAL_CACHE_KEY_V262);if(!raw){raw=sessionStorage.getItem(SD_RENTAL_CACHE_KEY_V262);if(raw)localStorage.setItem(SD_RENTAL_CACHE_KEY_V262,raw);}const x=JSON.parse(raw||'null');return x&&x.data&&(Date.now()-Number(x.ts||0)<SD_RENTAL_CACHE_TTL_V262)?x.data:null;}catch(e){return null;}}
function sdSaveRentalCache_(data){try{localStorage.setItem(SD_RENTAL_CACHE_KEY_V262,JSON.stringify({ts:Date.now(),data:data}));}catch(e){}}
function sd_primeRentalWorkflow_(){
  const cached=sdReadRentalCache_();
  if(cached&&document.getElementById('sdRentalWorkflowCardsV248')){sd_renderRentalWorkflow(cached);return true;}
  return false;
}
function sd_readyStockBenchmarkData_(){
  // V26.6: read the exact counts attached to the visible Model Cards first.
  // This guarantees Ready Stock Benchmark = the "พร้อมส่ง" number users see.
  const visible=[...document.querySelectorAll('#sdModelCards .sp-model-card[data-ready-stock]')].map(el=>({
    brand:el.getAttribute('data-brand')||'',model:el.getAttribute('data-model')||'',
    readyStock:Number(el.getAttribute('data-ready-stock')||0)
  }));
  if(visible.length)return visible.map(x=>{const minimum=10,ready=Number(x.readyStock||0);return{brand:x.brand,model:x.model,readyStock:ready,minimum,gap:Math.max(0,minimum-ready),low:ready<minimum};});
  const live=Array.isArray(window.CES_READY_STOCK_MODEL_COUNTS_V264)?window.CES_READY_STOCK_MODEL_COUNTS_V264:[];
  if(live.length)return live.map(x=>{const ready=Number(x.readyStock||0),minimum=10;return{brand:x.brand||'',model:x.model||'',readyStock:ready,minimum,gap:Math.max(0,minimum-ready),low:ready<minimum};});
  const rows=typeof sdFilteredDevices==='function'?sdFilteredDevices():[];
  const cards=typeof sd_filteredModelCards_==='function'?sd_filteredModelCards_(rows):[];
  return cards.map(x=>{const ready=Number(x.stock||0),minimum=10;return{brand:x.brand||'',model:x.label||'',readyStock:ready,minimum,gap:Math.max(0,minimum-ready),low:ready<minimum};});
}
function sd_updateReadyStockBenchmark(){
  const rows=sd_readyStockBenchmarkData_(),low=rows.filter(x=>x.low).length,badge=document.getElementById('sdReadyStockAlertCountV263'),btn=document.getElementById('sdReadyStockAlertBtnV263');
  if(badge)badge.textContent=String(low);if(btn){btn.classList.toggle('has-alert',low>0);btn.title=low?`${low} model(s) below minimum ready stock 10`:'All models meet minimum ready stock 10';}
  return rows;
}
function sd_openReadyStockBenchmark(){
  const rows=sd_updateReadyStockBenchmark();
  if(!rows.length){Swal.fire('Ready Stock Benchmark','No model data available.','info');return;}
  const html=`<div class="ces-ready-stock-popup-v263"><div class="ces-ready-stock-note-v263"><b>Benchmark:</b> minimum <b>10 ready-to-deliver units per model</b><br><span>HTML email summary is scheduled to ADMIN every Monday around 09:10.</span></div><div class="sp-table-wrap"><table class="sp-table"><thead><tr><th>Model</th><th>Ready Stock</th><th>Minimum</th><th>Gap</th><th>Status</th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${spEsc(r.brand)}</b><span class="sp-sub">${spEsc(r.model)}</span></td><td><b>${spNum(r.readyStock)}</b></td><td>${r.minimum}</td><td>${r.gap?`<b style="color:#dc2626">-${r.gap}</b>`:'0'}</td><td>${r.low?'<span class="sp-chip low">LOW STOCK</span>':'<span class="sp-chip ok">OK</span>'}</td></tr>`).join('')}</tbody></table></div></div>`;
  Swal.fire({title:'Ready Stock Benchmark',html,width:'min(760px,96vw)',confirmButtonText:'Close',confirmButtonColor:'#003DA5',animation:false});
}
window.sd_openReadyStockBenchmark=sd_openReadyStockBenchmark;
window.sd_updateReadyStockBenchmark=sd_updateReadyStockBenchmark;

async function sd_testRentalNotification(){
  try{
    const r=await window.CES_API.callFunction('sd_sendRentalNotificationTest',[],{transport:'iframe',timeoutMs:90000,priority:'user',userAction:true,loadingLabel:'Sending rental test mail…'});
    if(!r||r.success===false)throw new Error((r&&r.message)||'Rental test mail failed.');
    const recipients=Array.isArray(r.to)?r.to.join(', '):(r.recipient||r.to||'');
    Swal.fire({icon:'success',title:'Weekly Rental HTML Sent',html:`Open <b>${Number(r.open||0)}</b> · Overdue <b>${Number(r.overdue||0)}</b> · Due ≤30d <b>${Number(r.due30||0)}</b>${recipients?`<br>${spEsc(recipients)}`:''}`});
  }catch(e){Swal.fire({icon:'error',title:'Rental Test Mail',text:e.message||String(e)});}
}
window.sd_testRentalNotification=sd_testRentalNotification;
function sdSummary_(cards){cards=cards||[];const open=cards.filter(x=>String(x.workflowStatus||'').toUpperCase()!=='COMPLETED').length;return{total:cards.length,open:open,completed:cards.length-open,followupSent:cards.filter(x=>String(x.workflowStatus||'').toUpperCase()==='FOLLOW_UP_SENT').length,waitingReturn:cards.filter(x=>String(x.workflowStatus||'').toUpperCase()==='WAITING_RETURN').length,waitingRenewal:cards.filter(x=>String(x.workflowStatus||'').toUpperCase()==='WAITING_RENEWAL').length};}
function sdIndexDevices_(){const map={};((SD_DASH.raw&&SD_DASH.raw.devices)||[]).forEach(d=>{const due=sdIsoDate_(d.expectedReturn||d.expectedReturnDate||d.dueDate||''),k=[String(d.location||''),String(d.borrower||''),due].join('||');(map[k]||(map[k]=[])).push(d);});return map;}
function sd_rentalDueLabel_(days){
  days=Number(days||0);
  return days<0?`Overdue ${Math.abs(days)}d`:`Due in ${days}d`;
}
function sd_renderRentalWorkflow(data){
  const wrap=document.getElementById('sdRentalWorkflowCardsV248'),sum=document.getElementById('sdRentalWorkflowSummaryV248');
  if(!wrap)return;
  const cards=(data&&data.cards)||[],sm=(data&&data.summary)||{};
  SD_RENTAL_WORKFLOW_V260={cards:cards.slice(),summary:sm,deviceIndex:sdIndexDevices_()};
  sdSaveRentalCache_({success:true,cards:cards,summary:sm,sourceSheetUrl:data&&data.sourceSheetUrl||SD_RENTAL_SOURCE_V248,defaultEmail:data&&data.defaultEmail||''});
  if(sum)sum.innerHTML=`<span class="sp-chip">${spNum(sm.open||0)} active</span> <span class="sp-chip" style="background:#e0f2fe;color:#0369a1">${spNum(sm.followupSent||0)} follow-up</span> <span class="sp-chip low">${spNum(sm.waitingReturn||0)} return</span> <span class="sp-chip ok">${spNum(sm.waitingRenewal||0)} renewal</span> <span class="sp-chip">${spNum(sm.completed||0)} completed</span>`;
  if(!cards.length){wrap.innerHTML='<div class="sp-muted">No rental workflow records.</div>';return;}
  wrap.innerHTML=`<div class="sp-table-wrap ces-rental-follow-table-wrap-v261"><table class="sp-table ces-rental-follow-table-v261"><thead><tr><th>Status</th><th>Contract / Borrower</th><th>Due</th><th>Items</th><th>Last Email</th><th>Follow-up Action</th><th>Detail</th></tr></thead><tbody>${cards.map((c,index)=>{
    const days=Number(c.daysToDue||0),status=String(c.workflowStatus||'OPEN').toUpperCase(),mail=String(c.borrowerEmail||'').trim(),closed=status==='COMPLETED';
    const key=encodeURIComponent(c.contractKey||'');
    const actions=closed?'<span class="ces-rental-closed-v261"><i class="fas fa-circle-check"></i> Closed</span>':`<div class="ces-rental-actions-v261"><button type="button" class="ces-rental-action-v261 follow" onclick="sd_updateRentalWorkflow('${key}','FOLLOW_UP_SENT',false)" title="Send follow-up email"><i class="fas fa-paper-plane"></i><span>Follow</span></button><button type="button" class="ces-rental-action-v261 return" onclick="sd_updateRentalWorkflow('${key}','WAITING_RETURN',false)" title="Set Return status"><i class="fas fa-rotate-left"></i><span>Return</span></button><button type="button" class="ces-rental-action-v261 renew" onclick="sd_updateRentalWorkflow('${key}','WAITING_RENEWAL',false)" title="Set Renewal status"><i class="fas fa-calendar-plus"></i><span>Renew</span></button><button type="button" class="ces-rental-action-v261 complete" onclick="sd_updateRentalWorkflow('${key}','COMPLETED',false)" title="Complete follow-up"><i class="fas fa-check"></i><span>Complete</span></button></div>`;
    return `<tr class="ces-rental-row-v261 ${sd_rentalStatusClass_(status)}">
      <td><span class="ces-rental-status-v260 ${sd_rentalStatusClass_(status)}">${spEsc(status.replaceAll('_',' '))}</span></td>
      <td><b>${spEsc(c.location||'-')}</b><span class="sp-sub">${spEsc(c.borrower||'-')}${mail?' · '+spEsc(mail):''}</span></td>
      <td><b class="${days<0?'ces-rental-over-v260':''}">${spEsc(c.dueDate||'-')}</b><span class="sp-sub ${days<0?'ces-rental-over-v260':''}">${spEsc(sd_rentalDueLabel_(days))}</span></td>
      <td>${spNum(c.itemCount||0)}</td>
      <td>${spEsc(c.lastEmailType||'Not sent')}<span class="sp-sub">${spEsc(c.lastEmailAt||c.alertStatus||'-')}</span></td>
      <td>${actions}</td>
      <td><button type="button" class="sp-btn soft ces-rental-view-btn-v260" onclick="sd_openRentalWorkflowDetail(${index})"><i class="fas fa-eye"></i> View</button></td>
    </tr>`;
  }).join('')}</tbody></table></div>`;
}
function sdIsoDate_(value){
  const text=String(value||'').trim();if(!text)return '';
  const m=text.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return `${m[1]}-${m[2]}-${m[3]}`;
  const d=new Date(text);if(isNaN(d))return text.slice(0,10);return d.toISOString().slice(0,10);
}
function sd_openRentalWorkflowDetail(index){
  const c=(SD_RENTAL_WORKFLOW_V260.cards||[])[Number(index)];
  if(!c){Swal.fire('Rental Contract','Contract record not found.','info');return;}
  const targetDue=sdIsoDate_(c.dueDate),targetLocation=String(c.location||''),targetBorrower=String(c.borrower||'');
  const deviceKey=[targetLocation,targetBorrower,targetDue].join('||');
  const devices=((SD_RENTAL_WORKFLOW_V260.deviceIndex||{})[deviceKey]||[]).slice();
  const rows=devices.map((d,i)=>`<tr><td>${i+1}</td><td><b>${spEsc(d.idCode||d.id_code||'-')}</b></td><td>${spEsc(d.sn||d.serialNumber||'-')}</td><td>${spEsc(d.acPlugSn||d.ac_plug_sn||'-')}</td><td>${spEsc(d.clampSn||d.clamp_sn||'-')}</td><td>${spEsc(d.brand||'-')}<span class="sp-sub">${spEsc(d.model||d.itemName||'-')}</span></td><td>${spEsc(d.status||'-')}</td><td>${spEsc(d.actionRequired||d.action_required||'-')}</td></tr>`).join('');
  const status=String(c.workflowStatus||'OPEN').toUpperCase(),canComplete=status!=='COMPLETED';
  const html=`<div class="ces-rental-v260-detail">
    <div class="ces-rental-v260-detail-grid"><div><small>LOCATION</small><b>${spEsc(c.location||'-')}</b></div><div><small>BORROWER</small><b>${spEsc(c.borrower||'-')}</b></div><div><small>BORROWER EMAIL</small><b>${c.borrowerEmail?`<a href="mailto:${spEsc(c.borrowerEmail)}">${spEsc(c.borrowerEmail)}</a>`:'-'}</b></div><div><small>DUE DATE</small><b>${spEsc(c.dueDate||'-')}</b></div><div><small>ITEMS</small><b>${spNum(c.itemCount||devices.length||0)}</b></div><div><small>STATUS</small><b>${spEsc(status.replaceAll('_',' '))}</b></div><div><small>BORROWER ACTION</small><b>${spEsc(sd_rentalActionLabel_(c.borrowerAction))}</b></div><div><small>LAST EMAIL</small><b>${spEsc(c.lastEmailType||'Not sent')} ${c.lastEmailAt?'· '+spEsc(c.lastEmailAt):''}</b></div></div>
    ${c.newRenewalDate||c.renewalName||c.renewalEmail?`<div class="ces-renewal-summary-v262"><div><small>RENEWAL REQUESTED</small><b>${spEsc(c.renewalRequestedAt||'-')}</b></div><div><small>NEW RENEWAL DATE</small><b>${spEsc(c.newRenewalDate||'-')}</b></div><div><small>CONTACT NAME</small><b>${spEsc(c.renewalName||'-')}</b></div><div><small>EMAIL</small><b>${spEsc(c.renewalEmail||'-')}</b></div></div>`:''}
    ${c.lastError?`<div class="ces-rental-v260-error">${spEsc(c.lastError)}</div>`:''}
    <div class="sp-table-wrap ces-rental-v260-device-wrap"><table class="sp-table"><thead><tr><th>#</th><th>ID Code</th><th>SN</th><th>AC Plug SN</th><th>Clamp SN</th><th>Brand / Model</th><th>Status</th><th>Action Required</th></tr></thead><tbody>${rows||'<tr><td colspan="8" class="sp-muted">No item-level rows matched this contract key.</td></tr>'}</tbody></table></div>
    <div class="ces-rental-v260-detail-actions">${canComplete?`<button class="sp-btn primary" onclick="sd_updateRentalWorkflow('${encodeURIComponent(c.contractKey||'')}','FOLLOW_UP_SENT',true)"><i class="fas fa-paper-plane"></i> Send Follow-up</button><button class="sp-btn warn" onclick="sd_updateRentalWorkflow('${encodeURIComponent(c.contractKey||'')}','WAITING_RETURN',true)"><i class="fas fa-rotate-left"></i> Return</button><button class="sp-btn success" onclick="sd_updateRentalWorkflow('${encodeURIComponent(c.contractKey||'')}','WAITING_RENEWAL',true)"><i class="fas fa-calendar-plus"></i> Renewal</button><button class="sp-btn dark" onclick="sd_updateRentalWorkflow('${encodeURIComponent(c.contractKey||'')}','COMPLETED',true)"><i class="fas fa-check"></i> Complete</button>`:'<span class="sp-chip ok"><i class="fas fa-check"></i> Closed</span>'}<a class="sp-btn ghost" href="${SD_RENTAL_SOURCE_V248}" target="_blank" rel="noopener"><i class="fas fa-link"></i> Source</a></div>
  </div>`;
  Swal.fire({title:'Rental Contract Follow-up Detail',width:'min(1220px,97vw)',html,confirmButtonText:'Close',animation:false,customClass:{popup:'ces-rental-v260-detail-popup'}});
}
function sd_switchStockTab(tab){
  tab=String(tab||'dashboard').toLowerCase();
  const isContract=tab==='contract';
  const dash=document.getElementById('sdDashboardPanelV260'),contract=document.getElementById('sdContractPanelV260');
  const dashBtn=document.getElementById('sdTabDashboardV260'),contractBtn=document.getElementById('sdTabContractV260');
  if(dash)dash.classList.toggle('hidden',isContract);if(contract)contract.classList.toggle('hidden',!isContract);
  if(dashBtn)dashBtn.classList.toggle('active',!isContract);if(contractBtn)contractBtn.classList.toggle('active',isContract);
  if(isContract){try{sd_renderContractSummary();}catch(e){};sd_loadRentalWorkflow(false).catch(()=>{});}
  try{sessionStorage.setItem('CES_STOCK_TAB_V260',isContract?'contract':'dashboard');}catch(e){}
}
async function sd_loadRentalWorkflow(force=false){
  const wrap=document.getElementById('sdRentalWorkflowCardsV248');if(!wrap)return;
  if(!force){const cached=sdReadRentalCache_();if(cached){sd_renderRentalWorkflow(cached);return cached;}}
  if(force)wrap.insertAdjacentHTML('afterbegin','<div id="sdRentalSyncNoteV262" class="ces-rental-sync-note-v262"><i class="fas fa-rotate fa-spin"></i> Syncing latest contracts…</div>');
  try{
    const r=await window.CES_API.callFunction('sd_getRentalWorkflowCards',[force===true],{priority:'active',background:false,dedupe:!force,userAction:true,module:'stock_dashboard',silentLoading:false});
    if(!r||!r.success)throw new Error((r&&r.message)||'Rental workflow unavailable');
    sd_renderRentalWorkflow(r);return r;
  }catch(e){if(!SD_RENTAL_WORKFLOW_V260.cards.length)wrap.innerHTML=`<div class="sp-muted">Rental workflow unavailable: ${spEsc(e.message||String(e))}</div>`;throw e;
  }finally{const n=document.getElementById('sdRentalSyncNoteV262');if(n)n.remove();}
}
async function sd_updateRentalWorkflow(contractKey,status,closePopup){
  try{contractKey=decodeURIComponent(String(contractKey||''));}catch(ignore){}
  status=String(status||'IN_PROGRESS').toUpperCase();
  const card=(SD_RENTAL_WORKFLOW_V260.cards||[]).find(x=>String(x.contractKey||'')===contractKey)||{};
  let extra={};
  if(status==='WAITING_RENEWAL'){
    const nowLocal=new Date(),today=[nowLocal.getFullYear(),String(nowLocal.getMonth()+1).padStart(2,'0'),String(nowLocal.getDate()).padStart(2,'0')].join('-'),defaultNew=card.newRenewalDate||card.dueDate||today;
    const result=await Swal.fire({title:'Renewal Contract',animation:false,showCancelButton:true,confirmButtonText:'Save Renewal',confirmButtonColor:'#059669',focusConfirm:false,html:`<div class="ces-renewal-form-v262"><label>Renewal Date (Today)<input id="sd-renew-today-v262" type="date" value="${spEsc(today)}" readonly></label><label>New Renewal Date <span>*</span><input id="sd-renew-new-v262" type="date" value="${spEsc(sdIsoDate_(defaultNew))}"></label><label>Contact Name <span>*</span><input id="sd-renew-name-v262" type="text" value="${spEsc(card.renewalName||card.borrower||'')}"></label><label>Email <span>*</span><input id="sd-renew-email-v262" type="email" value="${spEsc(card.renewalEmail||card.borrowerEmail||'')}"></label></div>`,preConfirm:()=>{const newDate=document.getElementById('sd-renew-new-v262').value,name=document.getElementById('sd-renew-name-v262').value.trim(),email=document.getElementById('sd-renew-email-v262').value.trim();if(!newDate||!name||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){Swal.showValidationMessage('กรอก New Renewal Date, Name และ Email ให้ครบ');return false;}return{renewalRequestedAt:today,newRenewalDate:newDate,renewalName:name,renewalEmail:email};}});
    if(!result.isConfirmed)return;extra=result.value||{};
  }else{
    const confirms={FOLLOW_UP_SENT:{title:'Send follow-up email?',text:'Send a contract follow-up email to the borrower now.',confirm:'Send Follow-up',color:'#2563eb'},WAITING_RETURN:{title:'Set status to Return?',text:'Mark this contract for return follow-up. This does not receive the equipment into stock yet.',confirm:'Return',color:'#d97706'},COMPLETED:{title:'Complete rental follow-up?',text:'Close the follow-up workflow after all required return / renewal actions are finished.',confirm:'Complete',color:'#0f172a'}};
    const cfg=confirms[status];if(cfg){const ok=await Swal.fire({icon:'question',title:cfg.title,text:cfg.text,showCancelButton:true,confirmButtonText:cfg.confirm,confirmButtonColor:cfg.color,animation:false});if(!ok.isConfirmed)return;}
  }
  const button=document.activeElement&&document.activeElement.tagName==='BUTTON'?document.activeElement:null,oldHtml=button?button.innerHTML:'';if(button){button.disabled=true;button.innerHTML='<i class="fas fa-circle-notch fa-spin"></i>';}
  try{
    const payload=Object.assign({contractKey,status},extra);
    const r=await window.CES_API.callFunction('sd_updateRentalWorkflowStatus',[payload],{priority:'user',loadingLabel:'Updating contract…'});
    if(!r||!r.success)throw new Error((r&&r.message)||'Update failed');
    const idx=(SD_RENTAL_WORKFLOW_V260.cards||[]).findIndex(x=>String(x.contractKey||'')===contractKey);
    if(idx>=0&&r.card)SD_RENTAL_WORKFLOW_V260.cards[idx]=Object.assign({},SD_RENTAL_WORKFLOW_V260.cards[idx],r.card);
    const data={success:true,cards:(SD_RENTAL_WORKFLOW_V260.cards||[]).slice(),summary:sdSummary_(SD_RENTAL_WORKFLOW_V260.cards||[]),sourceSheetUrl:SD_RENTAL_SOURCE_V248};
    sd_renderRentalWorkflow(data);try{sd_renderContractSummary();}catch(ignore){}
    if(closePopup&&typeof Swal!=='undefined'&&Swal.isVisible())Swal.close();else if(status==='FOLLOW_UP_SENT')Swal.fire({icon:'success',title:'Follow-up sent',timer:1100,showConfirmButton:false,animation:false});
  }catch(e){Swal.fire({icon:'error',title:'Rental workflow',text:e.message||String(e),animation:false});}
  finally{if(button&&button.isConnected){button.disabled=false;button.innerHTML=oldHtml;}}
}

window.sd_loadRentalWorkflow=sd_loadRentalWorkflow;
window.sd_updateRentalWorkflow=sd_updateRentalWorkflow;
window.sd_openRentalWorkflowDetail=sd_openRentalWorkflowDetail;
window.sd_switchStockTab=sd_switchStockTab;
