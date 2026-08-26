// CES Hub — Memo & Work Order dashboard (canonical single-version module)
(function(){
'use strict';
var state={loading:false,rows:[],summary:{},teamSummary:[],page:1,pageSize:50};
var allowedTeams=['MED','LAB','EHS','ENV','TES'];

function claimActiveTab(){
  try{
    window.currentTab='memo_workorder';window.CES_ACTIVE_TAB='memo_workorder';
    document.body.setAttribute('data-ces-active-tab','memo_workorder');
    document.querySelectorAll('.nav-item').forEach(function(btn){var on=btn.getAttribute('data-ces-tab')==='memo_workorder';btn.classList.toggle('active',on);btn.classList.toggle('bg-slate-50',on);btn.classList.toggle('text-indigo-600',on);});
    var h=document.getElementById('header-page-title');if(h)h.textContent='Memo & Work Order';
    try{sessionStorage.setItem('CES_ACTIVE_TAB_V60','memo_workorder');localStorage.setItem('CES_ACTIVE_TAB_V60','memo_workorder');}catch(ignore){}
  }catch(ignore2){}
}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}
function el(id){return document.getElementById(id);}
function normalizeTeam(v){var t=String(v||'').trim().toUpperCase().replace(/\s+/g,'');if(t==='CAL-LAB'||t==='CALLAB'||t==='LAB')return'LAB';if(t==='CAL-MED'||t==='CALMED'||t==='MED')return'MED';if(t.indexOf('EHS')>=0)return'EHS';if(t.indexOf('ENV')>=0)return'ENV';if(t.indexOf('TES')>=0)return'TES';return t;}
function filters(){return{team:(el('mwoTeam')&&el('mwoTeam').value)||'ALL',year:(el('mwoYear')&&el('mwoYear').value)||'ALL',month:(el('mwoMonth')&&el('mwoMonth').value)||'ALL',type:(el('mwoType')&&el('mwoType').value)||'ALL',search:(el('mwoSearch')&&el('mwoSearch').value||'').trim()};}
function kpi(label,value,icon){return '<div class="ces-mwo-kpi"><span><i class="fas '+icon+'"></i></span><div><small>'+esc(label)+'</small><strong>'+esc(value)+'</strong></div></div>';}
function renderSummary(){var s=state.summary||{},box=el('mwoKpi');if(box)box.innerHTML=kpi('Total Records',Number(s.total||0).toLocaleString(),'fa-file-lines')+kpi('Memo',Number(s.memoCount||0).toLocaleString(),'fa-file-signature')+kpi('Work Order',Number(s.workOrderCount||0).toLocaleString(),'fa-screwdriver-wrench');}
function renderTeamSummary(){var box=el('mwoTeamSummary');if(!box)return;var map={};(state.teamSummary||[]).forEach(function(x){map[normalizeTeam(x.team)]=x;});box.innerHTML=allowedTeams.map(function(team){var x=map[team]||{total:0,memo:0,workOrder:0};return '<div class="ces-mwo-team-card team-'+team.toLowerCase()+'"><div class="ces-mwo-team-name">'+team+'</div><strong>'+Number(x.total||0).toLocaleString()+'</strong><div><span>Memo <b>'+Number(x.memo||0).toLocaleString()+'</b></span><span>Work Order <b>'+Number(x.workOrder||0).toLocaleString()+'</b></span></div></div>';}).join('');}
function monthLabel(key){var names=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],n=Number(String(key||'').replace(/[^0-9]/g,''));return n>=1&&n<=12?names[n-1]:String(key||'');}
function renderFilters(meta){var teams=(meta&&meta.teams)||allowedTeams,years=(meta&&meta.years)||[],monthsByYear=(meta&&meta.monthsByYear)||{},team=el('mwoTeam'),year=el('mwoYear'),month=el('mwoMonth');if(team){var v=team.value||'ALL';team.innerHTML='<option value="ALL">All Teams</option>'+allowedTeams.map(function(x){return '<option value="'+x+'">'+x+'</option>';}).join('');team.value=allowedTeams.indexOf(v)>=0?v:'ALL';}var yv=year?(year.value||'ALL'):'ALL';if(year){year.innerHTML='<option value="ALL">All Years</option>'+years.map(function(y){return '<option value="'+esc(y)+'">'+esc(y)+'</option>';}).join('');year.value=years.indexOf(yv)>=0?yv:'ALL';yv=year.value;}if(month){var mv=month.value||'ALL',available=yv==='ALL'?((meta&&meta.monthNumbers)||[]):((monthsByYear&&monthsByYear[yv])||[]);month.innerHTML='<option value="ALL">All Months</option>'+available.map(function(x){return '<option value="'+esc(x)+'">'+esc(monthLabel(x))+'</option>';}).join('');month.value=available.indexOf(mv)>=0?mv:'ALL';}}
function fileLink(r){if(!r.url)return'-';return '<a href="'+esc(r.url)+'" target="_blank" rel="noopener" class="ces-mwo-file-link"><i class="fas fa-arrow-up-right-from-square"></i> Open</a>';}
function renderTable(){var body=el('mwoTable'),rows=state.rows||[],s=state.summary||{};if(el('mwoCount'))el('mwoCount').textContent=Number(s.filtered||s.total||rows.length).toLocaleString()+' records';if(body)body.innerHTML=rows.length?rows.map(function(r){var team=normalizeTeam(r.team||'');return '<tr class="ces-mwo-row team-'+team.toLowerCase()+'" data-team="'+esc(team)+'"><td>'+esc(r.date||'-')+'</td><td><span class="ces-mwo-team-chip team-'+team.toLowerCase()+'">'+esc(team||'-')+'</span></td><td>'+esc(r.type==='WORK_ORDER'?'Work Order':'Memo')+'</td><td><b>'+esc(r.docNo||'-')+'</b></td><td>'+esc(r.customer||'-')+'</td><td>'+fileLink(r)+'</td></tr>';}).join(''):'<tr><td colspan="6"><div class="ces-mwo-empty">No records found</div></td></tr>';var page=Number(s.page||1),pages=Number(s.pages||1),nav=el('mwoPagination');if(nav)nav.innerHTML='<button '+(page<=1?'disabled':'')+' onclick="memoWorkOrderPage('+(page-1)+')"><i class="fas fa-chevron-left"></i></button><span>Page '+page+' / '+pages+'</span><button '+(page>=pages?'disabled':'')+' onclick="memoWorkOrderPage('+(page+1)+')"><i class="fas fa-chevron-right"></i></button>';}

async function load(force){if(state.loading)return;state.loading=true;var f=filters();try{var res=await window.CES_API.callFunction('getMemoWorkOrderDashboard',[{force:!!force,team:f.team,year:f.year,month:f.month,search:f.search,page:state.page,pageSize:state.pageSize,type:f.type}],{transport:'jsonp',timeoutMs:60000,dedupe:false});if(!res||res.success===false)throw new Error((res&&res.message)||'Cannot load Memo & Work Order');state.rows=res.rows||[];state.summary=res.summary||{};state.teamSummary=res.teamSummary||[];renderFilters(res.meta||{});renderSummary();renderTeamSummary();renderTable();}catch(e){console.error(e);if(window.Swal)Swal.fire('Memo & Work Order',e.message||String(e),'error');}finally{state.loading=false;}}
function excelDate(v){if(v instanceof Date&&!isNaN(v))return v.toISOString().slice(0,10);if(typeof v==='number'&&window.XLSX&&XLSX.SSF){var d=XLSX.SSF.parse_date_code(v);if(d)return [d.y,String(d.m).padStart(2,'0'),String(d.d).padStart(2,'0')].join('-');}var s=String(v||'').trim();if(!s)return'';var m=s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);if(m)return m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');return s;}
function rowsFromSheet(ws){return ws?XLSX.utils.sheet_to_json(ws,{defval:'',raw:true}):[];}
function pick(obj,names){for(var i=0;i<names.length;i++){if(Object.prototype.hasOwnProperty.call(obj,names[i])&&String(obj[names[i]]==null?'':obj[names[i]]).trim()!=='')return obj[names[i]];}return'';}
async function exportMemoWorkOrderExcel(){
  if(!window.XLSX){if(window.Swal)Swal.fire('Export Excel','XLSX library is not ready.','error');return;}
  var f=filters(),all=[],page=1,pages=1;
  try{
    if(window.Swal)Swal.fire({title:'Preparing Excel...',allowOutsideClick:false,showConfirmButton:false,didOpen:function(){Swal.showLoading();}});
    do{
      var res=await window.CES_API.callFunction('getMemoWorkOrderDashboard',[{force:false,team:f.team,year:f.year,month:f.month,search:f.search,page:page,pageSize:100,type:f.type}],{transport:'jsonp',timeoutMs:60000,dedupe:false});
      if(!res||res.success===false)throw new Error((res&&res.message)||'Cannot load export data');
      all=all.concat(res.rows||[]);pages=Number(res.summary&&res.summary.pages||1);page++;
    }while(page<=pages&&page<=100);
    var data=all.map(function(r){return{'Date':r.date||'','Team':normalizeTeam(r.team||''),'Type':r.type==='WORK_ORDER'?'Work Order':'Memo','Document No.':r.docNo||'','Form ID':r.formId||'','Customer':r.customer||'','File URL':r.url||''};});
    var ws=XLSX.utils.json_to_sheet(data),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Memo & Work Order');
    var suffix=[f.team,f.year,f.month,f.type].filter(function(x){return x&&x!=='ALL';}).join('_')||'All';
    XLSX.writeFile(wb,'CES_Memo_WorkOrder_'+suffix+'_'+new Date().toISOString().slice(0,10)+'.xlsx');
    if(window.Swal)Swal.close();
  }catch(e){if(window.Swal)Swal.fire('Export Excel',e.message||String(e),'error');}
}
function memoWorkOrderCutoffDate(){var now=new Date();return new Date(now.getFullYear(),now.getMonth()-2,1);}
function memoWorkOrderRecent3Months_(dateValue){var raw=String(dateValue||'').trim();if(!raw)return false;var d=new Date(raw);if(isNaN(d.getTime())){var m=raw.match(/^(\d{4})[-\/](\d{1,2})/);if(m)d=new Date(Number(m[1]),Number(m[2])-1,1);}if(isNaN(d.getTime()))return false;return d.getTime()>=memoWorkOrderCutoffDate().getTime();}
function memoWorkOrderParseWorkbookWorker_(file){
  return new Promise(function(resolve,reject){
    var workerSource=`importScripts('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
function normTeam(v){var t=String(v||'').trim().toUpperCase().replace(/\\s+/g,'');if(t==='CAL-LAB'||t==='CALLAB'||t==='LAB')return'LAB';if(t==='CAL-MED'||t==='CALMED'||t==='MED')return'MED';if(t.indexOf('EHS')>=0)return'EHS';if(t.indexOf('ENV')>=0)return'ENV';if(t.indexOf('TES')>=0)return'TES';return t;}
function pick(o,n){for(var i=0;i<n.length;i++){if(Object.prototype.hasOwnProperty.call(o,n[i])&&String(o[n[i]]==null?'':o[n[i]]).trim()!=='')return o[n[i]];}return'';}
function excelDate(v){if(typeof v==='number'&&XLSX.SSF){var d=XLSX.SSF.parse_date_code(v);if(d)return d.y+'-'+String(d.m).padStart(2,'0')+'-'+String(d.d).padStart(2,'0');}var s=String(v||'').trim();if(!s)return'';var m=s.match(/^(\\d{1,2})[\\/\\-](\\d{1,2})[\\/\\-](\\d{4})$/);if(m)return m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');m=s.match(/^(\\d{4})[\\/\\-](\\d{1,2})/);if(m)return m[1]+'-'+m[2].padStart(2,'0')+'-01';return s;}
function recent3(v){return !!String(v||'').trim();}
function rows(ws){return ws?XLSX.utils.sheet_to_json(ws,{defval:'',raw:true}):[];}
self.onmessage=function(ev){try{var wb=XLSX.read(ev.data,{type:'array',cellDates:true}),woRaw=rows(wb.Sheets.WorkOrder),memoRaw=rows(wb.Sheets.Memo);if(!memoRaw.length&&!woRaw.length)throw new Error('ไม่พบ Sheet Memo หรือ WorkOrder ในไฟล์');var teamByForm={};woRaw.forEach(function(r){var form=String(pick(r,['FormID','Form ID'])||'').trim(),team=normTeam(pick(r,['Team2','Team']));if(form&&team)teamByForm[form]=team;});var wo=woRaw.map(function(r,i){var form=String(pick(r,['FormID','Form ID'])||'').trim();return{sourceRow:i+2,formId:form,docNo:String(pick(r,['Job No.','Job No','Work Order No.','WorkOrder No.'])||'').trim(),date:excelDate(pick(r,['Start Date/Time','Date','Start Date'])),endDate:excelDate(pick(r,['End Date/Time','End Date'])),customer:String(pick(r,['Customer Name','Customer'])||'').trim(),team:normTeam(pick(r,['Team2','Team'])),url:String(pick(r,['WorkOrderURL','Work Order URL','URL'])||'').trim()};}).filter(function(r){return(r.formId||r.docNo||r.customer)&&recent3(r.date);});var memo=memoRaw.map(function(r,i){var form=String(pick(r,['FormID','Form ID'])||'').trim();return{sourceRow:i+2,formId:form,docNo:String(pick(r,['Memo No.','MemoNo','Memo No'])||'').trim(),date:excelDate(pick(r,['Start Date','วันที่','Date'])),endDate:excelDate(pick(r,['End Date'])),customer:String(pick(r,['Customer Name','Customer'])||'').trim(),team:normTeam(pick(r,['Team'])||teamByForm[form]||''),url:String(pick(r,['MemoOrderURL','Memo URL','URL'])||'').trim()};}).filter(function(r){return(r.formId||r.docNo||r.customer)&&recent3(r.date);});self.postMessage({ok:true,memoRows:memo,workOrderRows:wo});}catch(e){self.postMessage({ok:false,error:e&&e.message?e.message:String(e)});}};`;
    var blob=new Blob([workerSource],{type:'application/javascript'}),url=URL.createObjectURL(blob),worker=new Worker(url),done=false;
    function finish(fn,v){if(done)return;done=true;try{worker.terminate();}catch(e){}URL.revokeObjectURL(url);fn(v);}
    worker.onmessage=function(e){var d=e.data||{};d.ok?finish(resolve,d):finish(reject,new Error(d.error||'Unable to read workbook'));};worker.onerror=function(e){finish(reject,new Error(e.message||'Workbook parser worker failed'));};file.arrayBuffer().then(function(buf){worker.postMessage(buf,[buf]);}).catch(function(e){finish(reject,e);});
  });
}
async function handleMemoWorkOrderUpload(file){
  if(!file)return;if(!window.XLSX){Swal.fire('Upload','XLSX library is not ready. Refresh and try again.','error');return;}
  try{Swal.fire({title:'Reading Memo / Work Order...',html:'<div class="text-xs text-slate-500">กำลังอ่านเฉพาะ 3 เดือนล่าสุดใน background เพื่อไม่ให้หน้าเว็บค้าง</div>',allowOutsideClick:false,showConfirmButton:false,didOpen:function(){Swal.showLoading();}});
    var parsed=await memoWorkOrderParseWorkbookWorker_(file);
    if(!parsed.memoRows.length&&!parsed.workOrderRows.length)throw new Error('ไม่พบข้อมูล Memo / Work Order ในช่วง 3 เดือนล่าสุด');
    var result=await window.CES_API.callFunction('saveMemoWorkOrderImport',[{sourceFile:file.name,uploadedAt:new Date().toISOString(),memoRows:parsed.memoRows,workOrderRows:parsed.workOrderRows}],{transport:'iframe',timeoutMs:120000,dedupe:false,priority:'active',userAction:true,module:'memo_workorder'});
    if(!result||result.success===false)throw new Error((result&&result.message)||'Upload failed');
    Swal.fire({icon:'success',title:'Import complete',html:'3 เดือนล่าสุด · Memo <b>'+Number(result.memoAdded||0)+'</b> added · Work Order <b>'+Number(result.workOrderAdded||0)+'</b> added · Duplicate <b>'+Number(result.duplicate||0)+'</b><br><span class="text-[10px] text-slate-400">Service CSI 2026 sync will continue in background</span>',confirmButtonColor:'#003DA5'});
    state.page=1;await load(true);setTimeout(function(){syncMemoWorkOrderServiceCSI_(result,parsed.memoRows,parsed.workOrderRows);},250);
  }catch(e){Swal.fire('Upload Error',e.message||String(e),'error');}
}
async function syncMemoWorkOrderServiceCSI_(result,memoRows,workOrderRows){
  try{if(!result||!result.uploadId||!window.CES_API)return;var months=[].concat(memoRows||[],workOrderRows||[]).map(function(r){return String(r.date||'').slice(0,7);}).filter(function(m){return /^2026-\d{2}$/.test(m);});months=[...new Set(months)];if(!months.length)return;
    var svc=await window.CES_API.callFunction('getServiceDataForMemoSync',[{months:months}],{transport:'jsonp',timeoutMs:60000,dedupe:true,priority:'background',background:true,silentLoading:true,module:'memo_workorder'}),csiRows=Array.isArray(svc&&svc.rows)?svc.rows:[];if(!csiRows.length||typeof window.svcBuildMemoMappingV55_!=='function')return;
    var run=function(){try{var previous=window.serviceRawData;window.serviceRawData=csiRows;var mapping=window.svcBuildMemoMappingV55_(memoRows.map(function(r){return Object.assign({type:'MEMO'},r);}),workOrderRows.map(function(r){return Object.assign({type:'WORK_ORDER'},r);}));window.serviceRawData=previous;if(!mapping.length)return;var compact=typeof window.svcMapV55CompactRow_==='function'?mapping.map(window.svcMapV55CompactRow_):mapping;window.CES_API.callFunction('saveServiceMemoMapping',[{uploadId:result.uploadId,sourceFile:result.sourceFile||'',uploadedAt:new Date().toISOString(),targetYear:2026,importMonths:months,memoRows:memoRows,workOrderRows:workOrderRows,mappingRows:compact}],{transport:'iframe',timeoutMs:180000,dedupe:false,priority:'background',background:true,silentLoading:true,module:'memo_workorder'}).catch(function(e){console.warn('[Memo → Service CSI] background save failed',e);});}catch(e){console.warn('[Memo → Service CSI] background match failed',e);}};
    if(window.requestIdleCallback)window.requestIdleCallback(run,{timeout:4000});else setTimeout(run,500);
  }catch(e){console.warn('[Memo → Service CSI] background load failed',e);}
}

window.switchMemoWorkOrderTab=function(tab){var mode=String(tab||'dashboard').toLowerCase()==='mapping'?'mapping':'dashboard';var dash=el('mwoDashboardPanelV3010'),map=el('mwoMappingPanelV3010'),db=el('mwoTabDashboardV3010'),mb=el('mwoTabMappingV3010');if(dash)dash.classList.toggle('hidden',mode!=='dashboard');if(map)map.classList.toggle('hidden',mode!=='mapping');if(db)db.classList.toggle('active',mode==='dashboard');if(mb)mb.classList.toggle('active',mode==='mapping');if(mode==='mapping'){try{if(typeof window.openServiceMemoMapping==='function')window.openServiceMemoMapping();else if(typeof window.refreshServiceMemoMappingV55==='function')window.refreshServiceMemoMappingV55();}catch(e){console.error(e);}}};
window.initMemoWorkOrder=function(force){claimActiveTab();setTimeout(claimActiveTab,80);setTimeout(claimActiveTab,250);state.page=1;return load(!!force);};
window.memoWorkOrderApply=function(){state.page=1;return load(false);};
window.memoWorkOrderPage=function(page){state.page=Math.max(1,Number(page||1));return load(false);};
window.handleMemoWorkOrderUpload=handleMemoWorkOrderUpload;window.syncMemoWorkOrderServiceCSI_=syncMemoWorkOrderServiceCSI_;
window.exportMemoWorkOrderExcel=exportMemoWorkOrderExcel;
})();
