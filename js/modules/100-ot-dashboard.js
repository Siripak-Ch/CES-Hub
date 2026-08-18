// ============================================================
// 100-ot-dashboard.js — CES Hub V18
// Reliable OT dashboard with real data, stable charts and section loading.
// ============================================================

let rawOTData = [];
let currentFilteredOTData = [];
let currentOTTeam = 'ALL';
let trendChartInstance = null;
let teamChartInstance = null;
let otSystemInitialized = false;
let otRequestInFlight = null;
let otChartRetryTimer = null;
let otRequestVersion = 0;

function initOTData() { return initOTSystem(); }

function initOTSystem() {
  populateOTDateDropdowns();
  if (!otSystemInitialized) {
    otSystemInitialized = true;
    return fetchOTData(false);
  }
  applyOTFilters();
  return Promise.resolve(rawOTData);
}

function populateOTDateDropdowns() {
  const monthSelect = document.getElementById('ot-filter-month');
  const yearSelect = document.getElementById('ot-filter-year');
  if (!monthSelect || !yearSelect) return;
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  if (!monthSelect.options.length) {
    monthSelect.innerHTML = '<option value="ALL">All Months</option>' + months.map((m,i) => `<option value="${i+1}">${m}</option>`).join('');
  }
  if (!yearSelect.options.length) yearSelect.innerHTML = '<option value="ALL">All Years</option>';
  const currentYear = String(new Date().getFullYear());
  if (![...yearSelect.options].some(o => o.value === currentYear)) yearSelect.insertAdjacentHTML('beforeend', `<option value="${currentYear}">${currentYear}</option>`);
  if (!yearSelect.dataset.cesInitialized) {
    yearSelect.value = currentYear;
    monthSelect.value = String(new Date().getMonth()+1);
    yearSelect.dataset.cesInitialized = '1';
  }
}

function setOTDataState_(mode, text) {
  const badge = document.getElementById('ot-data-state');
  if (!badge) return;
  badge.className = `ces-ot-state ${mode || ''}`.trim();
  const icon = mode === 'live' ? 'fa-circle-check' : mode === 'empty' ? 'fa-circle-info' : mode === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-notch fa-spin';
  badge.innerHTML = `<i class="fas ${icon}"></i> ${escapeOTHtml_(text || '')}`;
}

function fetchOTData(forceRefresh) {
  if (otRequestInFlight && !forceRefresh) return otRequestInFlight;
  const requestVersion = ++otRequestVersion;
  const loadingToken = window.CES_UI && typeof window.CES_UI.begin === 'function'
    ? window.CES_UI.begin({ target:'#view-ot', mode:'section', owner:'ot', message:'Loading OT data…' }) : '';
  setOTDataState_('', forceRefresh ? 'Refreshing OT data' : 'Loading OT data');

  const request = (window.CES_API && typeof window.CES_API.callFunction === 'function')
    ? window.CES_API.callFunction('getOTDashboardData', [!!forceRefresh], { transport:'jsonp', timeoutMs:120000, dedupe:!forceRefresh, priority:'active', userAction:true, module:'ot' })
    : Promise.reject(new Error('CES API bridge is not available.'));

  otRequestInFlight = Promise.resolve(request).then(function(data) {
    if (requestVersion !== otRequestVersion) return rawOTData;
    rawOTData = normalizeOTRecords_(data && data.records ? data.records : data);
    ensureOTYears_(rawOTData);
    selectLatestAvailableOTPeriod_(rawOTData, true);
    setOTDataState_(rawOTData.length ? 'live' : 'empty', rawOTData.length ? `${rawOTData.length} live records` : 'No calculated OT records');
    applyOTFilters();
    if (forceRefresh && window.Swal) {
      Swal.fire({ icon:rawOTData.length ? 'success' : 'info', title:'OT data updated', text:rawOTData.length ? `${rawOTData.length} real records loaded` : 'ไม่พบข้อมูล OT จริงที่คำนวณแล้ว', timer:2000, showConfirmButton:false });
    }
    return rawOTData;
  }).catch(function(error) {
    if (requestVersion !== otRequestVersion) return rawOTData;
    rawOTData = [];
    currentFilteredOTData = [];
    ensureOTYears_(rawOTData);
    setOTDataState_('error', 'OT data unavailable');
    applyOTFilters();
    if (window.Swal) Swal.fire({ icon:'warning', title:'OT data unavailable', text:otErrorMessage_(error), confirmButtonColor:'#003DA5' });
    return rawOTData;
  }).finally(function() {
    if (loadingToken && window.CES_UI) window.CES_UI.end(loadingToken);
    if (requestVersion === otRequestVersion) otRequestInFlight = null;
  });
  return otRequestInFlight;
}

function normalizeOTRecords_(records) {
  if (!Array.isArray(records)) return [];
  return records.map((record,index) => {
    const team = String(record && record.team || '').trim().toUpperCase();
    const month = parseInt(record && record.month,10);
    const year = parseInt(record && record.year,10);
    const otHours = Number(record && record.otHours);
    const workHours = Number(record && record.workHours);
    return {
      id:String(record && record.id || `OT-${index+1}`),
      source:String(record && record.source || ''),
      date:String(record && record.date || ''),
      month:Number.isFinite(month) ? month : 0,
      year:Number.isFinite(year) ? year : 0,
      team:['MED','LAB','EHS'].includes(team) ? team : team || 'OTHER',
      name:String(record && record.name || record && record.userId || 'Unknown Staff').trim(),
      userId:String(record && record.userId || ''),
      otHours:Number.isFinite(otHours) ? Math.max(0,otHours) : 0,
      workHours:Number.isFinite(workHours) ? Math.max(0,workHours) : 0
    };
  }).filter(r => r.month >= 1 && r.month <= 12 && r.year >= 2020 && ['MED','LAB','EHS'].includes(r.team) && (r.otHours > 0 || r.workHours > 0));
}

function ensureOTYears_(records) {
  const select = document.getElementById('ot-filter-year');
  if (!select) return;
  const selected = select.value;
  const years = [...new Set(records.map(r => r.year).filter(Boolean))].sort((a,b) => b-a);
  select.innerHTML = '<option value="ALL">All Years</option>' + years.map(y => `<option value="${y}">${y}</option>`).join('');
  if ([...select.options].some(o => o.value === selected)) select.value = selected;
}

function selectLatestAvailableOTPeriod_(records, onlyWhenEmpty) {
  const monthSelect = document.getElementById('ot-filter-month');
  const yearSelect = document.getElementById('ot-filter-year');
  if (!monthSelect || !yearSelect || !records.length) return;
  const selectedYear = Number(yearSelect.value);
  const selectedMonth = Number(monthSelect.value);
  const hasSelected = records.some(r => (yearSelect.value === 'ALL' || r.year === selectedYear) && (monthSelect.value === 'ALL' || r.month === selectedMonth));
  if (onlyWhenEmpty && hasSelected) return;
  const latest = records.slice().sort((a,b) => b.year-a.year || b.month-a.month)[0];
  yearSelect.value = String(latest.year);
  monthSelect.value = String(latest.month);
}

function setOTTeamFilter(team) {
  currentOTTeam = String(team || 'ALL').toUpperCase();
  document.querySelectorAll('#view-ot .ot-team-btn').forEach(button => button.classList.toggle('active', button.id === `ot-btn-${currentOTTeam}`));
  applyOTFilters();
}

function applyOTFilters() {
  const monthSelect = document.getElementById('ot-filter-month');
  const yearSelect = document.getElementById('ot-filter-year');
  if (!monthSelect || !yearSelect) return;
  const selectedMonth = monthSelect.value;
  const selectedYear = yearSelect.value;
  currentFilteredOTData = rawOTData.filter(record =>
    (selectedMonth === 'ALL' || record.month === Number(selectedMonth)) &&
    (selectedYear === 'ALL' || record.year === Number(selectedYear)) &&
    (currentOTTeam === 'ALL' || record.team === currentOTTeam)
  );
  const totals = {ALL:0,MED:0,LAB:0,EHS:0};
  currentFilteredOTData.forEach(record => { totals.ALL += record.otHours; if (totals[record.team] != null) totals[record.team] += record.otHours; });
  setOTText_('card-total-ot',formatOTHours_(totals.ALL));
  setOTText_('card-med-ot',formatOTHours_(totals.MED));
  setOTText_('card-lab-ot',formatOTHours_(totals.LAB));
  setOTText_('card-ehs-ot',formatOTHours_(totals.EHS));
  updateOTPeriodLabel_(selectedYear,selectedMonth);
  renderOTTable(currentFilteredOTData);
  renderCharts(currentFilteredOTData);
}

function updateOTPeriodLabel_(year,month) {
  const names = ['All Months','January','February','March','April','May','June','July','August','September','October','November','December'];
  const badge = document.getElementById('ot-period-badge');
  if (badge) badge.textContent = `${month === 'ALL' ? names[0] : names[Number(month)] || month} ${year === 'ALL' ? '' : year}`.trim();
}

function renderOTTable(filteredData) {
  const tbody = document.getElementById('ot-table-body');
  const subtitle = document.getElementById('ot-table-subtitle');
  if (!tbody) return;
  const map = {};
  filteredData.forEach(record => {
    const key = `${record.userId || record.name}|${record.team}`;
    if (!map[key]) map[key] = {name:record.name,team:record.team,totalOT:0,totalWork:0,entries:0};
    map[key].totalOT += record.otHours; map[key].totalWork += record.workHours; map[key].entries++;
  });
  const rows = Object.values(map).sort((a,b) => b.totalOT-a.totalOT || a.name.localeCompare(b.name));
  if (subtitle) subtitle.textContent = `${rows.length} staff · ${filteredData.length} OT records`;
  if (!rows.length) { tbody.innerHTML = '<tr><td colspan="4" class="ces-ot-empty">ไม่พบข้อมูล OT ในช่วงเวลาที่เลือก</td></tr>'; return; }
  tbody.innerHTML = rows.map(staff => `<tr><td class="font-bold text-slate-700">${escapeOTHtml_(staff.name)}</td><td class="text-center"><span class="ces-team-label ${staff.team.toLowerCase()}">${staff.team}</span></td><td class="text-center font-bold text-slate-600">${staff.totalWork.toFixed(1)}</td><td class="text-center font-black text-[#003DA5]">${formatOTHours_(staff.totalOT)}</td></tr>`).join('');
}

function ensureApexCharts_() {
  if (typeof ApexCharts !== 'undefined') return Promise.resolve();
  if (window.CES_OT_APEX_PROMISE) return window.CES_OT_APEX_PROMISE;
  window.CES_OT_APEX_PROMISE = window.CES_loadLib
    ? window.CES_loadLib('https://cdn.jsdelivr.net/npm/apexcharts')
    : Promise.reject(new Error('ApexCharts is unavailable.'));
  return window.CES_OT_APEX_PROMISE;
}

function renderCharts(filteredData) {
  if (otChartRetryTimer) clearTimeout(otChartRetryTimer);
  ensureApexCharts_().then(function() { renderChartsReady_(filteredData); }).catch(function(error) {
    console.error('[OT charts]',error);
  });
}

function renderChartsReady_(filteredData) {
  const teamTotals = {MED:0,LAB:0,EHS:0};
  filteredData.forEach(r => { if (teamTotals[r.team] != null) teamTotals[r.team] += r.otHours; });
  const donutTarget = document.querySelector('#ot-team-chart');
  const donutOptions = {
    series:[teamTotals.MED,teamTotals.LAB,teamTotals.EHS], labels:['MED','LAB','EHS'],
    chart:{type:'donut',height:260,fontFamily:'Prompt',animations:{enabled:true,speed:250}},
    colors:['#004AAD','#19A7CE','#0FC1A1'], stroke:{width:3,colors:['#fff']},
    plotOptions:{pie:{donut:{size:'68%',labels:{show:true,total:{show:true,label:'TOTAL OT',formatter:() => formatOTHours_(teamTotals.MED+teamTotals.LAB+teamTotals.EHS)}}}}},
    legend:{position:'bottom',fontSize:'11px',fontWeight:700}, dataLabels:{enabled:false}, noData:{text:'No OT data'}
  };
  if (donutTarget) {
    if (!teamChartInstance) { teamChartInstance = new ApexCharts(donutTarget,donutOptions); teamChartInstance.render(); }
    else { teamChartInstance.updateOptions(donutOptions,false,true); }
  }

  const monthLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const series = [{name:'MED',data:Array(12).fill(0)},{name:'LAB',data:Array(12).fill(0)},{name:'EHS',data:Array(12).fill(0)}];
  const yearValue = document.getElementById('ot-filter-year')?.value || 'ALL';
  rawOTData.forEach(r => {
    if (yearValue !== 'ALL' && r.year !== Number(yearValue)) return;
    if (currentOTTeam !== 'ALL' && r.team !== currentOTTeam) return;
    const idx = r.team === 'MED' ? 0 : r.team === 'LAB' ? 1 : r.team === 'EHS' ? 2 : -1;
    if (idx >= 0) series[idx].data[r.month-1] += r.otHours;
  });
  const maxValue = Math.max(10,...series.flatMap(s => s.data));
  const trendOptions = {
    series:series,
    chart:{type:'bar',height:260,fontFamily:'Prompt',toolbar:{show:false},animations:{enabled:true,speed:250}},
    plotOptions:{bar:{columnWidth:'48%',borderRadius:4}}, colors:['#004AAD','#19A7CE','#0FC1A1'],
    xaxis:{categories:monthLabels,labels:{style:{fontSize:'10px',fontWeight:600,colors:'#64748b'}}},
    yaxis:{min:0,max:Math.ceil(maxValue/10)*10,tickAmount:5,labels:{formatter:v=>Math.round(v),style:{fontSize:'10px',colors:'#64748b'}},title:{text:'OT Hours',style:{fontSize:'10px',fontWeight:700,color:'#64748b'}}},
    legend:{position:'top',horizontalAlign:'right',fontSize:'11px',fontWeight:700}, grid:{borderColor:'#e8eef7',strokeDashArray:3},
    dataLabels:{enabled:false}, tooltip:{shared:true,intersect:false,y:{formatter:v=>`${Number(v).toFixed(1)} hrs`}}, noData:{text:'No OT data'}
  };
  const trendTarget = document.querySelector('#ot-trend-chart');
  if (trendTarget) {
    if (!trendChartInstance) { trendChartInstance = new ApexCharts(trendTarget,trendOptions); trendChartInstance.render(); }
    else { trendChartInstance.updateOptions(trendOptions,false,true); }
  }
}

function exportOTData() {
  if (!currentFilteredOTData.length) { if (window.Swal) Swal.fire('No data','ไม่มีข้อมูลสำหรับ Export','info'); return; }
  const summary = {};
  currentFilteredOTData.forEach(r => { const key=`${r.userId||r.name}|${r.team}`; if(!summary[key]) summary[key]={name:r.name,team:r.team,work:0,ot:0}; summary[key].work+=r.workHours; summary[key].ot+=r.otHours; });
  let csv='\uFEFFStaff Name,Team,Working Hours,OT Hours\n';
  Object.values(summary).forEach(r => { csv += [r.name,r.team,r.work.toFixed(2),r.ot.toFixed(2)].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')+'\n'; });
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=`OT_Report_${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),500);
}
function setOTText_(id,value){const el=document.getElementById(id);if(el)el.textContent=value;}
function formatOTHours_(value){const n=Number(value)||0;return n.toLocaleString(undefined,{minimumFractionDigits:n%1?1:0,maximumFractionDigits:1});}
function otErrorMessage_(error){return String(error&&(error.message||error)||'Apps Script API error').replace(/^Exception:\s*/i,'');}
function escapeOTHtml_(value){return String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
