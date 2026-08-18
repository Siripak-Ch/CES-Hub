// ============================================================
// 131-lab-kpi-dashboard.js
// Dedicated LAB Equipment KPI frontend for the existing KPI Tracking page.
// Loads after 130-kpi-dashboard.js and delegates EHS / ENV / MED back to it.
// ============================================================

(function (window, document) {
  'use strict';

  var VERSION = '20260722-lab-kpi-front-v36';
  var original = {
    switchKpiTab: window.switchKpiTab,
    fetchKPIData: window.fetchKPIData,
    renderKpiExecutiveSummary: window.renderKpiExecutiveSummary,
    getKpiFilteredRows: window.getKpiFilteredRows,
    renderKPITable: window.renderKPITable,
    renderKpiPerformanceSummary: window.renderKpiPerformanceSummary,
    openUpdateModal: window.openUpdateModal,
    saveJobStatus: window.saveJobStatus,
    kpiResetFilters: window.kpiResetFilters,
    triggerLateEmail: window.triggerLateEmail
  };

  var uiDefaults = null;
  var currentLabModalRowId = '';

  var STAGE_LABELS = {
    RECEIVED: 'Received',
    OPERATION: 'Operation',
    SUPERVISOR: 'Supervisor / AM',
    REPORT: 'Report',
    REPORT_DONE: 'Report Completed',
    FINANCE: 'INV. / Allocate',
    COMPLETE: 'Complete',
    EXCEPTION: 'Exception',
    CANCEL: 'Cancel',
    UNMAPPED: 'Unmapped'
  };

  var STAGE_FILTER_LABELS = {
    pendingOperation: 'Pending Operation',
    pendingSupervisor: 'Pending Supervisor / AM',
    pendingReport: 'Pending Report',
    pendingFinance: 'Pending INV. / Allocate'
  };

  var NOTE_REQUIRED = [
    'รอแก้ไข Cer',
    'ส่งซ่อม',
    'ยกเลิก',
    'ชดใช้ลูกค้า (ทำพัง)'
  ];

  function isLabTeam() {
    try { return String(currentKpiTeam || '').toUpperCase() === 'LAB'; }
    catch (e) { return false; }
  }

  function isLabRow(row) {
    row = row || {};
    return String(row.workflowType || row.serviceTeam || row.team || '').toUpperCase() === 'LAB';
  }

  function esc(v) {
    if (typeof window.kpiEsc === 'function') return window.kpiEsc(v);
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (m) {
      return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[m];
    });
  }

  function attr(v) {
    if (typeof window.kpiAttr === 'function') return window.kpiAttr(v);
    return String(v == null ? '' : v).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  function num(v) {
    var n = Number(v || 0);
    return isNaN(n) ? 0 : n.toLocaleString();
  }

  function labProviderLabel(rowOrProvider) {
    var provider = typeof rowOrProvider === 'object' && rowOrProvider
      ? (rowOrProvider.providerShort || rowOrProvider.provider || '')
      : String(rowOrProvider || '');
    var compact = String(provider || '').replace(/\s+/g, '').toLowerCase();
    if (compact.indexOf('calibrationinhouse') >= 0 || compact.indexOf('inhouse') >= 0) return 'INHOUSE';
    if (compact.indexOf('calibrationonsite') >= 0 || compact.indexOf('onsite') >= 0) return 'ONSITE';
    if (compact.indexOf('outsource') >= 0) return 'OUTSOURCE';
    return provider || '-';
  }

  function byId(id) { return document.getElementById(id); }

  function performanceText(valueId) {
    var valueEl = byId(valueId);
    if (!valueEl || !valueEl.parentElement) return '';
    var ps = valueEl.parentElement.querySelectorAll('p');
    return ps.length ? ps[ps.length - 1].textContent : '';
  }

  function captureUiDefaults() {
    if (uiDefaults) return;
    var headers = Array.prototype.slice.call(document.querySelectorAll('#view-kpi table thead th'));
    var summary = byId('kpi-summary-section');
    var title = summary ? summary.querySelector('h3') : null;
    var desc = summary ? summary.querySelector('h3 + p') : null;
    var detailHint = summary ? summary.querySelector('.border-t .flex span') : null;
    var modalTitle = document.querySelector('#modal-kpi-update h3');

    uiDefaults = {
      workTypeHtml: byId('kpi-filter-worktype') ? byId('kpi-filter-worktype').innerHTML : '',
      teamHtml: byId('kpi-filter-team') ? byId('kpi-filter-team').innerHTML : '',
      teamTitle: byId('kpi-filter-team') ? byId('kpi-filter-team').title : '',
      searchPlaceholder: byId('kpi-filter-search') ? byId('kpi-filter-search').placeholder : '',
      tableHeaders: headers.map(function (h) { return h.innerHTML; }),
      summaryTitle: title ? title.innerHTML : '',
      summaryDesc: desc ? desc.innerHTML : '',
      detailHint: detailHint ? detailHint.innerHTML : '',
      modalTitle: modalTitle ? modalTitle.innerHTML : '',
      perfEarlyText: performanceText('kpi-perf-early'),
      perfOnText: performanceText('kpi-perf-on'),
      perfLateText: performanceText('kpi-perf-late')
    };
  }

  function ensureLabUi() {
    captureUiDefaults();

    var summary = byId('kpi-summary-section');
    if (summary) summary.classList.remove('hidden');

    var title = summary ? summary.querySelector('h3') : null;
    var desc = summary ? summary.querySelector('h3 + p') : null;
    var detailHint = summary ? summary.querySelector('.border-t .flex span') : null;
    if (title) title.innerHTML = '<i class="fas fa-flask text-indigo-500"></i> LAB Equipment Executive Summary';
    if (desc) desc.textContent = 'Active Equipment / Action Required / Report Completed / Final Complete';
    if (detailHint) detailHint.textContent = 'Pending Operation / Supervisor / Report / INV. • คลิกซ้ำเพื่อยกเลิก';

    var search = byId('kpi-filter-search');
    if (search) search.placeholder = 'Search customer / equipment / provider / remark...';

    var teamFilter = byId('kpi-filter-team');
    if (teamFilter) teamFilter.title = 'Filter by LAB current workflow status';

    setTableHeaders([
      'Equipment Information',
      'Received / CAL Date',
      'Provider',
      'Unit',
      'Progress Status',
      'Target Date',
      'Timeline / KPI Result'
    ]);

    ensureLabNoteField();

    var modalTitle = document.querySelector('#modal-kpi-update h3');
    if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-flask text-indigo-500"></i> LAB Equipment Workflow & Action';
  }

  function restoreStandardUi() {
    captureUiDefaults();
    if (!uiDefaults) return;

    try { KPI_STAGE_FILTER = 'All'; KPI_QUICK_STATUS_FILTER = 'All'; } catch (ignore) {}

    var workType = byId('kpi-filter-worktype');
    if (workType) { workType.innerHTML = uiDefaults.workTypeHtml; workType.value = 'All'; }

    var team = byId('kpi-filter-team');
    if (team) { team.innerHTML = uiDefaults.teamHtml; team.title = uiDefaults.teamTitle; team.value = 'All'; }

    var search = byId('kpi-filter-search');
    if (search) search.placeholder = uiDefaults.searchPlaceholder;

    setTableHeaders(uiDefaults.tableHeaders, true);

    var summary = byId('kpi-summary-section');
    var title = summary ? summary.querySelector('h3') : null;
    var desc = summary ? summary.querySelector('h3 + p') : null;
    var detailHint = summary ? summary.querySelector('.border-t .flex span') : null;
    if (title) title.innerHTML = uiDefaults.summaryTitle;
    if (desc) desc.innerHTML = uiDefaults.summaryDesc;
    if (detailHint) detailHint.innerHTML = uiDefaults.detailHint;

    var noteWrap = byId('lab-kpi-note-wrap');
    if (noteWrap) noteWrap.classList.add('hidden');

    var modalTitle = document.querySelector('#modal-kpi-update h3');
    if (modalTitle) modalTitle.innerHTML = uiDefaults.modalTitle;

    setPerformanceSubtext('kpi-perf-early', uiDefaults.perfEarlyText || 'เสร็จก่อนกำหนด หรือยังไม่ถึงกำหนด');
    setPerformanceSubtext('kpi-perf-on', uiDefaults.perfOnText || 'เสร็จวันครบกำหนด หรือครบกำหนดวันนี้');
    setPerformanceSubtext('kpi-perf-late', uiDefaults.perfLateText || 'เลยกำหนด หรือเสร็จหลังกำหนด');
  }

  function setTableHeaders(labels, rawHtml) {
    var headers = Array.prototype.slice.call(document.querySelectorAll('#view-kpi table thead th'));
    labels.forEach(function (label, i) {
      if (!headers[i]) return;
      if (rawHtml) headers[i].innerHTML = label;
      else headers[i].textContent = label;
    });
  }

  function ensureLabNoteField() {
    var existing = byId('lab-kpi-note-wrap');
    if (existing) { existing.classList.remove('hidden'); return; }

    var grid = document.querySelector('#modal-kpi-update .p-6.bg-white .grid');
    if (!grid) return;

    var wrap = document.createElement('div');
    wrap.id = 'lab-kpi-note-wrap';
    wrap.className = 'md:col-span-2';
    wrap.innerHTML = '' +
      '<label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Note / Reason</label>' +
      '<textarea id="lab-kpi-note" rows="2" class="w-full text-sm border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-100 bg-white font-medium text-slate-700" placeholder="ระบุหมายเหตุ โดยเฉพาะกรณีแก้ไข / ซ่อม / ยกเลิก / ข้ามขั้นตอน"></textarea>' +
      '<p id="lab-kpi-note-hint" class="text-[9px] text-slate-400 font-bold mt-1">สถานะพิเศษบางรายการจำเป็นต้องกรอกหมายเหตุ</p>';

    var buttonWrap = grid.lastElementChild;
    if (buttonWrap) grid.insertBefore(wrap, buttonWrap);
    else grid.appendChild(wrap);
  }

  function populateSelect(el, values, allLabel, current) {
    if (!el) return;
    values = Array.isArray(values) ? values : [];
    var unique = [];
    var seen = {};
    values.forEach(function (v) {
      v = String(v == null ? '' : v).trim();
      if (!v || seen[v]) return;
      seen[v] = true;
      unique.push(v);
    });
    el.innerHTML = '<option value="All">' + esc(allLabel) + '</option>' + unique.map(function (v) {
      return '<option value="' + esc(v) + '">' + esc(v) + '</option>';
    }).join('');
    el.value = unique.indexOf(current) >= 0 ? current : 'All';
  }

  function populateLabFilters(res) {
    var filters = (res && res.filters) || {};

    var yearEl = byId('kpi-filter-year');
    var yearCurrent = yearEl ? yearEl.value : 'All';
    populateSelect(yearEl, filters.years || [], 'All Years', yearCurrent);

    var monthEl = byId('kpi-filter-month');
    if (monthEl && !monthEl.querySelector('option[value="01"]')) {
      monthEl.innerHTML = '<option value="All">All Months</option>' + [
        ['01','Jan'],['02','Feb'],['03','Mar'],['04','Apr'],['05','May'],['06','Jun'],
        ['07','Jul'],['08','Aug'],['09','Sep'],['10','Oct'],['11','Nov'],['12','Dec']
      ].map(function (x) { return '<option value="' + x[0] + '">' + x[1] + '</option>'; }).join('');
    }

    var wt = byId('kpi-filter-worktype');
    var wtCurrent = wt ? wt.value : 'All';
    populateSelect(wt, filters.providers || [], 'All Provider', wtCurrent);

    var status = byId('kpi-filter-team');
    var statusCurrent = status ? status.value : 'All';
    populateSelect(status, filters.statuses || [], 'All Current Status', statusCurrent);
  }

  function labFilteredRows() {
    var fYear = byId('kpi-filter-year') ? byId('kpi-filter-year').value : 'All';
    var fMonth = byId('kpi-filter-month') ? byId('kpi-filter-month').value : 'All';
    var fOverall = byId('kpi-filter-status') ? byId('kpi-filter-status').value : 'All';
    var fProvider = byId('kpi-filter-worktype') ? byId('kpi-filter-worktype').value : 'All';
    var fCurrentStatus = byId('kpi-filter-team') ? byId('kpi-filter-team').value : 'All';
    var search = byId('kpi-filter-search') ? String(byId('kpi-filter-search').value || '').toLowerCase().trim() : '';

    var filtered = (globalKpiData || []).filter(function (row) {
      if (!isLabRow(row)) return false;
      if (fYear !== 'All' && String(row.year || '') !== String(fYear)) return false;
      if (fMonth !== 'All' && String(row.monthNumber || '') !== String(fMonth)) return false;
      if (fProvider !== 'All' && String(row.provider || '') !== String(fProvider)) return false;
      if (fCurrentStatus !== 'All' && String(row.currentStatus || '') !== String(fCurrentStatus)) return false;

      if (fOverall === 'Late' && row.kpiPerformance !== 'late') return false;
      if (fOverall === 'Completed' && !row.isJobCompleted) return false;
      if (fOverall === 'Process' && (!row.isActive || row.kpiPerformance === 'late')) return false;

      if (KPI_STAGE_FILTER === 'pendingOperation' && row.stage !== 'RECEIVED' && row.stage !== 'OPERATION' && row.stage !== 'EXCEPTION') return false;
      if (KPI_STAGE_FILTER === 'pendingSupervisor' && row.stage !== 'SUPERVISOR') return false;
      if (KPI_STAGE_FILTER === 'pendingReport' && row.stage !== 'REPORT') return false;
      if (KPI_STAGE_FILTER === 'pendingFinance' && row.stage !== 'REPORT_DONE' && row.stage !== 'FINANCE') return false;

      if (KPI_QUICK_STATUS_FILTER !== 'All' && String(row.currentStatus || '') !== String(KPI_QUICK_STATUS_FILTER)) return false;

      if (search) {
        var hay = [
          row.customerId, row.equipment, row.provider, row.remark, row.engineer,
          row.currentStatus, row.customerStatus, row.receivedDate, row.calDate,
          row.invAllocate, row.rowId
        ].join(' ').toLowerCase();
        if (hay.indexOf(search) < 0) return false;
      }
      return true;
    });
    return typeof window.kpiSortRowsByDateV36 === 'function'
      ? window.kpiSortRowsByDateV36(filtered)
      : filtered;
  }

  function labRenderExecutiveSummary() {
    ensureLabUi();
    var section = byId('kpi-summary-section');
    var cardsWrap = byId('kpi-summary-cards');
    var statusWrap = byId('kpi-status-summary');
    var updated = byId('kpi-summary-updated');
    if (!section || !cardsWrap || !statusWrap) return;

    section.classList.remove('hidden');
    cardsWrap.className = 'kpi-lab-summary-grid grid gap-3';
    statusWrap.className = 'kpi-lab-stage-grid grid gap-3';
    var s = globalKpiSummary || {};

    var cards = [
      { label:'Active Jobs', records:s.activeRecords, units:s.activeUnits, note:'งานที่ยังไม่ Final Complete', icon:'fa-briefcase' },
      { label:'Action Required / Risk', records:s.actionRequiredRecords, units:s.actionRequiredUnits, note:'Overdue / Due today / Exception / No Target', icon:'fa-triangle-exclamation' },
      { label:'All Work', records:s.totalRecords, units:s.totalUnits, note:'รายการและจำนวนเครื่องมือทั้งหมด', icon:'fa-layer-group' },
      { label:'Report Completed', records:s.reportCompletedRecords, units:s.reportCompletedUnits, note:'ส่ง Report แล้วหรืออยู่ขั้นหลังจากนั้น', icon:'fa-file-circle-check' },
      { label:'Final Complete', records:s.jobCompletedRecords, units:s.jobCompletedUnits, note:'ออก INV. แล้ว / Allocate แล้ว', icon:'fa-circle-check' }
    ];

    cardsWrap.innerHTML = cards.map(function (c) {
      return '<div class="rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm text-slate-600">' +
        '<div class="flex items-start justify-between gap-3"><div>' +
        '<p class="text-[10px] font-black uppercase tracking-widest text-slate-400">' + esc(c.label) + '</p>' +
        '<h3 class="text-xl font-black text-slate-700 mt-1">' + num(c.records) + '</h3>' +
        '<p class="text-[10px] font-black text-slate-600 mt-0.5">' + num(c.units) + ' Units</p>' +
        '<p class="text-[10px] font-bold text-slate-500 mt-1 leading-tight">' + esc(c.note) + '</p>' +
        '</div><div class="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm"><i class="fas ' + c.icon + '"></i></div></div></div>';
    }).join('');

    var stageCounts = s.stageCounts || {};
    var stageUnits = s.stageUnits || {};
    var stageCards = [
      { key:'pendingOperation', label:'Pending Operation', sub:'Received / Cal / Outsource / Onsite', records:(stageCounts.received || 0) + (stageCounts.pendingOperation || 0) + (stageCounts.exception || 0), units:(stageUnits.received || 0) + (stageUnits.pendingOperation || 0) + (stageUnits.exception || 0), icon:'fa-gears' },
      { key:'pendingSupervisor', label:'Pending Supervisor / AM', sub:'รอ Save / ตรวจ / แก้ไข Report', records:stageCounts.pendingSupervisor || 0, units:stageUnits.pendingSupervisor || 0, icon:'fa-user-check' },
      { key:'pendingReport', label:'Pending Report', sub:'Soft Report / Hard Copy / Report Done', records:stageCounts.pendingReport || 0, units:stageUnits.pendingReport || 0, icon:'fa-file-signature' },
      { key:'pendingFinance', label:'Pending INV. / Allocate', sub:'Technical Complete แต่ยังไม่ Final', records:stageCounts.pendingFinance || 0, units:stageUnits.pendingFinance || 0, icon:'fa-file-invoice-dollar' }
    ];

    statusWrap.innerHTML = stageCards.map(function (c) {
      var active = KPI_STAGE_FILTER === c.key;
      return '<button onclick="labKpiApplyStageFilter_(\'' + attr(c.key) + '\')" class="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 px-4 py-3 text-left hover:shadow-sm transition ' + (active ? 'ring-2 ring-slate-300 shadow-md bg-slate-100' : '') + '">' +
        '<div class="flex items-center gap-3 min-w-0"><div class="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm"><i class="fas ' + c.icon + '"></i></div>' +
        '<div class="min-w-0"><p class="text-xs font-black text-slate-700 leading-tight">' + esc(c.label) + (active ? ' <span class="text-[9px] text-slate-400">ACTIVE</span>' : '') + '</p>' +
        '<p class="text-[10px] font-bold text-slate-500 truncate">' + esc(c.sub) + '</p></div></div>' +
        '<div class="text-right"><span class="text-xl font-black text-slate-700 block">' + num(c.records) + '</span><span class="text-[9px] font-black text-slate-500">' + num(c.units) + ' Units</span></div></button>';
    }).join('');

    if (updated) updated.textContent = 'LAB EquipmentStatus • ' + num(s.totalRecords || 0) + ' Records / ' + num(s.totalUnits || 0) + ' Units • ' + (s.updatedAt || '-');
  }

  function labStatusClass() {
    return 'bg-slate-50 text-slate-600 border-slate-200';
  }

  function labProgressHtml(row) {
    var cls = labStatusClass(row);
    return '<div class="flex flex-col border rounded-xl px-3 py-2 shadow-sm w-full max-w-[230px] ' + cls + '">' +
      '<span class="text-[8px] font-black uppercase tracking-wider opacity-70 mb-1">' + esc(STAGE_LABELS[row.stage] || row.stage || 'Unmapped') + '</span>' +
      '<div class="text-[10px] font-bold flex items-center gap-1.5 leading-tight"><i class="fas fa-circle-nodes"></i><span>' + esc(row.currentStatus || 'ยังไม่ระบุสถานะ') + '</span></div>' +
      '<span class="text-[9px] font-bold opacity-70 mt-1">Customer: ' + esc(row.customerStatus || '-') + '</span></div>';
  }

  function labTargetHtml(row) {
    var calculated = row && row.kpiResult && row.kpiResult.code !== 'NO_TARGET' && /คำนวณ/.test(String(row.targetSource || ''));
    return '<div class="flex flex-col items-start gap-1 min-w-[150px]">' +
      '<span class="text-[8px] font-black text-slate-400 uppercase tracking-wide leading-tight">' + esc(row.targetSource || 'KPI Target') + '</span>' +
      '<div class="bg-slate-100 text-slate-700 font-black text-xs px-2.5 py-1.5 rounded-md border border-slate-200 shadow-sm flex items-center gap-1.5"><i class="far fa-calendar-alt text-slate-400"></i> ' + esc(row.targetDate || '-') + '</div>' +
      (calculated ? '<span class="text-[8px] font-bold text-amber-600">Auto calculated</span>' : '') +
      '</div>';
  }


  function labTimelineHtml(row) {
    var perf = String(row.kpiPerformance || 'noTarget');
    var code = String(row.kpiResultCode || '');
    var map = {
      early: { label:'ก่อน KPI', icon:'fa-arrow-trend-up', cls:'bg-green-50 text-green-700 border-green-300' },
      on: { label:'ตรง KPI', icon:'fa-bullseye', cls:'bg-green-50 text-green-700 border-green-300' },
      late: { label:'เกิน KPI', icon:'fa-triangle-exclamation', cls:'bg-red-50 text-red-700 border-red-300' },
      process: { label:'กำลังดำเนินการ', icon:'fa-clock', cls:'bg-slate-50 text-slate-600 border-slate-200' },
      paused: { label:'หยุดนับ KPI', icon:'fa-pause', cls:'bg-slate-100 text-slate-600 border-slate-300' },
      excluded: { label:'ไม่นับ KPI', icon:'fa-ban', cls:'bg-slate-100 text-slate-600 border-slate-300' },
      noTarget: { label:'ไม่มี Target', icon:'fa-circle-question', cls:'bg-slate-50 text-slate-500 border-slate-200' }
    };
    if (code === 'NO_TARGET') perf = 'noTarget';
    if (code === 'EXCLUDED') perf = 'excluded';
    if (code === 'PAUSED') perf = 'paused';
    var m = map[perf] || map.process;
    return '<div class="' + m.cls + ' border px-3 py-2 rounded-xl text-center flex flex-col justify-center min-w-[150px] mx-auto shadow-sm">' +
      '<span class="text-[10px] font-black flex items-center justify-center gap-1"><i class="fas ' + m.icon + '"></i> ' + esc(m.label) + '</span>' +
      '<span class="text-[10px] font-black mt-1">' + esc(row.kpiResultLabel || 'อยู่ระหว่างดำเนินการ') + '</span>' +
      '<span class="text-[8px] font-bold opacity-75 mt-1">Final KPI: ' + esc(row.targetDate || '-') + '</span>' +
      (row.isJobCompleted && row.actualDate ? '<span class="text-[8px] font-bold opacity-75 mt-0.5">Complete: ' + esc(row.actualDate) + '</span>' : '') +
      '</div>';
  }

  function labRenderTable() {
    labRenderExecutiveSummary();
    var tbody = byId('kpi-table-body');
    if (!tbody) return;

    var filtered = labFilteredRows();
    labRenderPerformance(filtered);
    var pageMeta = typeof window.kpiPaginateRowsV36 === 'function'
      ? window.kpiPaginateRowsV36(filtered)
      : { rows:filtered.slice(0, 10), page:1, pages:Math.max(1, Math.ceil(filtered.length / 10)), total:filtered.length, start:0, end:Math.min(10, filtered.length) };
    if (typeof window.kpiRenderPaginationV36 === 'function') window.kpiRenderPaginationV36(pageMeta);

    var counter = byId('kpi-filtered-count');
    if (counter) {
      var units = filtered.reduce(function (sum, r) { return sum + Number(r.unit || 0); }, 0);
      var stageLabel = KPI_STAGE_FILTER !== 'All' ? ' • ' + (STAGE_FILTER_LABELS[KPI_STAGE_FILTER] || KPI_STAGE_FILTER) : '';
      var pageLabel = filtered.length ? ' • Page ' + pageMeta.page + '/' + pageMeta.pages : '';
      counter.textContent = filtered.length + ' / ' + (globalKpiData || []).length + ' records • ' + num(units) + ' units' + pageLabel + stageLabel;
    }

    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="py-12 text-center text-slate-400 italic font-bold">No LAB equipment records found for selected filters.</td></tr>';
      return;
    }

    tbody.innerHTML = pageMeta.rows.map(function (row) {
      return '<tr onclick="labKpiOpenById_(\'' + attr(row.rowId) + '\')" class="kpi-detail-row cursor-pointer hover:bg-slate-50 border-b border-slate-100 transition-colors">' +
        '<td class="p-4 align-middle"><h4 class="text-sm font-black text-slate-800">' + esc(row.customerId || '-') + '</h4>' +
        '<p class="text-[10px] font-black text-slate-600 mt-1">' + esc(row.equipment || '-') + '</p>' +
        '<p class="text-[9px] font-bold text-slate-400 mt-1 line-clamp-2">' + esc(row.remark || '') + '</p>' +
        '<span class="inline-flex mt-1 px-2 py-0.5 rounded-md text-[8px] font-black border bg-slate-50 text-slate-600 border-slate-200">LAB</span></td>' +
        '<td class="p-4 align-middle text-center"><p class="font-black text-slate-600 text-xs">' + esc(row.receivedDate || '-') + '</p>' +
        '<p class="text-[9px] font-bold text-slate-400 mt-1">CAL: ' + esc(row.calDate || '-') + '</p></td>' +
        '<td class="p-4 align-middle text-center"><span title="' + esc(row.provider || '') + '" class="px-2.5 py-1 rounded text-[9px] font-black shadow-sm bg-slate-50 text-slate-600 border border-slate-200">' + esc(labProviderLabel(row)) + '</span>' +
        (row.engineer ? '<p class="text-[9px] font-bold text-slate-400 mt-1">' + esc(row.engineer) + '</p>' : '') + '</td>' +
        '<td class="p-4 align-middle text-center font-black text-slate-700 text-sm">' + num(row.unit || 0) + '</td>' +
        '<td class="p-4 align-middle">' + labProgressHtml(row) + '</td>' +
        '<td class="p-4 align-middle">' + labTargetHtml(row) + '</td>' +
        '<td class="p-4 align-middle">' + labTimelineHtml(row) + '</td></tr>';
    }).join('');
  }

  function labRenderPerformance(rows) {
    rows = Array.isArray(rows) ? rows : labFilteredRows();
    var counts = { early:0, on:0, late:0 };
    var units = { early:0, on:0, late:0 };
    rows.forEach(function (r) {
      var p = String(r.kpiPerformance || '');
      if (counts[p] === undefined) return;
      counts[p]++;
      units[p] += Number(r.unit || 0);
    });

    var early = byId('kpi-perf-early');
    var on = byId('kpi-perf-on');
    var late = byId('kpi-perf-late');
    if (early) early.textContent = num(counts.early);
    if (on) on.textContent = num(counts.on);
    if (late) late.textContent = num(counts.late);

    setPerformanceSubtext('kpi-perf-early', num(units.early) + ' Units • Final Complete ก่อนกำหนด');
    setPerformanceSubtext('kpi-perf-on', num(units.on) + ' Units • Final Complete ตรงกำหนด');
    setPerformanceSubtext('kpi-perf-late', num(units.late) + ' Units • Final Complete เกินกำหนด');

    var note = byId('kpi-performance-note');
    if (note) {
      var totalUnits = rows.reduce(function (sum, r) { return sum + Number(r.unit || 0); }, 0);
      note.textContent = 'Filtered: ' + rows.length + ' Records / ' + num(totalUnits) + ' Units';
    }

    var canvas = byId('kpi-performance-pie');
    var fallback = byId('kpi-performance-pie-fallback');
    if (!canvas) return;
    var chartData = [counts.early, counts.on, counts.late];

    if (typeof window.Chart === 'undefined') {
      canvas.classList.add('hidden');
      if (fallback) {
        fallback.classList.remove('hidden');
        fallback.innerHTML = 'ก่อน KPI: ' + counts.early + '<br>ตรง KPI: ' + counts.on + '<br>เกิน KPI: ' + counts.late;
      }
      return;
    }

    canvas.classList.remove('hidden');
    if (fallback) fallback.classList.add('hidden');
    try { if (KPI_PERFORMANCE_CHART) KPI_PERFORMANCE_CHART.destroy(); } catch (ignore) {}
    KPI_PERFORMANCE_CHART = new window.Chart(canvas.getContext('2d'), {
      type: 'pie',
      data: {
        labels: ['ก่อน KPI', 'ตรง KPI', 'เกิน KPI'],
        datasets: [{ data: chartData, backgroundColor: ['#16a34a', '#16a34a', '#E4002B'], borderColor: '#ffffff', borderWidth: 3 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position:'bottom', labels:{ boxWidth:10, font:{ size:10, weight:'bold' } } },
          tooltip: { callbacks:{ label:function (ctx) { return ctx.label + ': ' + ctx.raw + ' Records'; } } }
        }
      }
    });
  }

  function setPerformanceSubtext(valueId, text) {
    var valueEl = byId(valueId);
    if (!valueEl || !valueEl.parentElement) return;
    var ps = valueEl.parentElement.querySelectorAll('p');
    if (ps.length) ps[ps.length - 1].textContent = text;
  }

  function stageOrder(stage) {
    return ({ RECEIVED:10, OPERATION:20, SUPERVISOR:30, REPORT:40, REPORT_DONE:50, FINANCE:60, COMPLETE:70 })[stage] || 0;
  }

  function labOpenModal(row) {
    ensureLabUi();
    currentLabModalRowId = row.rowId || '';

    var rowInput = byId('upd-row-id');
    if (rowInput) rowInput.value = row.rowId || '';

    var header = byId('upd-job-header');
    if (header) header.innerHTML = '<div class="flex flex-wrap gap-2 w-full">' +
      badge('fa-hospital', row.customerId || '-') +
      badge('fa-flask', row.equipment || '-') +
      badge('fa-building', labProviderLabel(row)) +
      badge('fa-boxes-stacked', 'Unit: ' + num(row.unit || 0)) +
      badge('fa-calendar-day', 'Received: ' + (row.receivedDate || '-')) +
      badge('fa-calendar-check', 'CAL: ' + (row.calDate || '-')) +
      badge('fa-flag-checkered', 'KPI: ' + (row.targetDate || '-')) +
      '</div>';

    var devices = byId('modal-devices-container');
    if (devices) {
      var stageKpis = Array.isArray(row.intermediateKpis) ? row.intermediateKpis : [];
      var stageHtml = stageKpis.map(function (k) {
        return '<div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">' +
          '<div class="text-[9px] font-black text-slate-500 uppercase">' + esc(k.label || 'Stage KPI') + '</div>' +
          '<div class="mt-1 text-[10px] font-bold text-slate-700">Target: ' + esc(k.targetDate || '-') + ' • Actual: ' + esc(k.actualDate || '-') + '</div>' +
          '<div class="mt-1 text-[9px] font-bold text-slate-500">' + esc(k.resultLabel || 'อยู่ระหว่างดำเนินการ') + '</div></div>';
      }).join('');
      devices.innerHTML = '' +
        '<div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] min-w-0 w-full">' +
          '<div class="bg-blue-50 px-3 py-2 rounded-xl border border-blue-200 text-blue-800"><span class="text-slate-500 font-bold">STATUS</span><br><b>' + esc(row.currentStatus || '-') + '</b></div>' +
          '<div class="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-slate-700"><span class="text-slate-500 font-bold">CUSTOMER STATUS</span><br><b>' + esc(row.customerStatus || '-') + '</b></div>' +
          '<div class="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-slate-700"><span class="text-slate-500 font-bold">EQUIPMENT DETAIL</span><br><b>' + num(row.unit || 0) + ' Units</b> • ' + esc(row.equipment || '-') + '</div>' +
          '<div class="bg-blue-50 px-3 py-2 rounded-xl border border-blue-200 text-blue-800"><span class="text-slate-500 font-bold">PROVIDER</span><br><b>' + esc(labProviderLabel(row)) + '</b></div>' +
          '<div class="md:col-span-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-slate-700"><span class="text-slate-500 font-bold">FINAL KPI</span><br><b>Target: ' + esc(row.targetDate || '-') + '</b> • ' + esc(row.kpiResultLabel || 'อยู่ระหว่างดำเนินการ') + '</div>' +
          '<div class="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-2">' + stageHtml + '</div>' +
          '<div class="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-slate-700"><span class="text-slate-500 font-bold">SOFT FILE DATE</span><br><b>' + esc(row.softFileDate || '-') + '</b></div>' +
          '<div class="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-slate-700"><span class="text-slate-500 font-bold">HARD COPY DATE</span><br><b>' + esc(row.hardCopyDate || '-') + '</b></div>' +
          (row.remark ? '<div class="md:col-span-2 bg-white px-3 py-2 rounded-xl border border-slate-200 text-slate-700"><span class="text-slate-500 font-bold">REMARK</span><br>' + esc(row.remark) + '</div>' : '') +
        '</div>';
    }

    renderLabStepper(row);

    var target = byId('upd-target-col');
    if (target) target.value = 'Final KPI • ' + (row.currentStatus || '-') + ' • Target: ' + (row.targetDate || '-');

    var select = byId('upd-new-status');
    var options = Array.isArray(row.allowedNextStatuses) ? row.allowedNextStatuses : [];
    if (select) select.innerHTML = options.length
      ? options.map(function (s) { return '<option value="' + esc(s) + '">' + esc(s) + '</option>'; }).join('')
      : '<option value="">ไม่มีสถานะถัดไป / งาน Final Complete</option>';

    var btn = byId('btn-save-kpi');
    if (btn) btn.disabled = !options.length;

    var note = byId('lab-kpi-note');
    if (note) note.value = '';
    updateNoteHint();
    if (select) select.onchange = updateNoteHint;

    var modal = byId('modal-kpi-update');
    if (modal) modal.classList.remove('hidden');
  }

  function badge(icon, text) {
    return '<span class="bg-white text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow-sm"><i class="fas ' + icon + ' text-slate-400"></i> ' + esc(text) + '</span>';
  }

  function renderLabStepper(row) {
    var stages = [
      { key:'RECEIVED', label:'Received', date:row.receivedDate },
      { key:'OPERATION', label:'Operation', date:row.equipmentReturnDate || row.calDate },
      { key:'SUPERVISOR', label:'Supervisor / AM', date:row.approveDate || row.saveDate },
      { key:'REPORT', label:'Report', date:row.softFileDate || row.hardCopyDate },
      { key:'FINANCE', label:'Close Job', date:row.invAllocate },
      { key:'COMPLETE', label:'Complete', date:row.lastUpdated }
    ];
    var currentOrder = stageOrder(row.stage);
    if (row.stage === 'REPORT_DONE') currentOrder = 50;
    if (row.stage === 'EXCEPTION') currentOrder = 20;
    if (row.stage === 'CANCEL') currentOrder = 0;

    var wrap = byId('modal-stepper-container');
    if (!wrap) return;
    wrap.innerHTML = '<div class="flex items-start justify-between min-w-[760px] w-full pt-4 relative">' + stages.map(function (s, i) {
      var order = stageOrder(s.key);
      var done = currentOrder >= order && row.stage !== 'CANCEL';
      var active = (row.stage === s.key) || (row.stage === 'REPORT_DONE' && s.key === 'REPORT') || (row.stage === 'EXCEPTION' && s.key === 'OPERATION');
      return '<div class="flex flex-col items-center flex-1 relative">' +
        '<div class="z-10 w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold transition-all shadow-sm ' +
        (active ? 'bg-[#003DA5] text-white ring-4 ring-blue-100' : done ? 'bg-blue-100 text-[#003DA5]' : 'bg-slate-100 text-slate-300 border-2 border-slate-200') + '">' +
        (done || active ? '<i class="fas ' + (active ? 'fa-location-dot' : 'fa-check') + '"></i>' : (i + 1)) + '</div>' +
        '<span class="text-[9px] font-extrabold mt-3 ' + (done || active ? 'text-slate-800' : 'text-slate-400') + ' text-center h-6 leading-tight">' + esc(s.label) + '</span>' +
        (s.date && done ? '<span class="text-[8px] font-bold text-[#003DA5] bg-blue-50 px-1.5 py-0.5 rounded mt-1 border border-blue-200 shadow-sm">' + esc(s.date) + '</span>' : '') +
        '</div>' + (i < stages.length - 1 ? '<div class="flex-1 h-[3px] mt-[18px] ' + (done ? 'bg-blue-300' : 'bg-slate-200') + '"></div>' : '');
    }).join('') + '</div>' +
      (row.stage === 'EXCEPTION' || row.stage === 'CANCEL' ? '<div class="mt-4 text-center text-xs font-black ' + (row.stage === 'CANCEL' ? 'text-slate-600' : 'text-rose-600') + '"><i class="fas fa-triangle-exclamation mr-1"></i>' + esc(STAGE_LABELS[row.stage]) + ': ' + esc(row.currentStatus) + '</div>' : '');
  }

  function updateNoteHint() {
    var status = byId('upd-new-status') ? byId('upd-new-status').value : '';
    var hint = byId('lab-kpi-note-hint');
    if (!hint) return;
    var required = NOTE_REQUIRED.indexOf(status) >= 0;
    hint.textContent = required ? 'สถานะนี้บังคับกรอกหมายเหตุ' : 'กรอกหมายเหตุเมื่อข้ามขั้นตอนหรือมีข้อมูลสำคัญ';
    hint.className = required ? 'text-[9px] text-rose-600 font-black mt-1' : 'text-[9px] text-slate-400 font-bold mt-1';
  }

  function labSaveStatus() {
    var rowId = byId('upd-row-id') ? byId('upd-row-id').value : currentLabModalRowId;
    var newStatus = byId('upd-new-status') ? byId('upd-new-status').value : '';
    var note = byId('lab-kpi-note') ? String(byId('lab-kpi-note').value || '').trim() : '';
    if (!newStatus) return;

    if (NOTE_REQUIRED.indexOf(newStatus) >= 0 && !note) {
      window.Swal.fire('กรุณาระบุหมายเหตุ', 'สถานะ “' + newStatus + '” จำเป็นต้องมีเหตุผลประกอบ', 'warning');
      return;
    }

    var btn = byId('btn-save-kpi');
    if (!btn) return;
    var oldHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving LAB Status...';
    btn.disabled = true;

    var actor = {};
    try {
      if (typeof currentUser !== 'undefined' && currentUser) {
        actor = {
          id: currentUser.id || '',
          email: currentUser.email || '',
          name_th: currentUser.name_th || '',
          name_eng: currentUser.name_eng || '',
          team: currentUser.team || '',
          position: currentUser.position || '',
          role: currentUser.role || ''
        };
      }
    } catch (ignoreActor) {}

    google.script.run
      .withFailureHandler(function (err) {
        window.Swal.fire('LAB KPI Error', ((err && err.errorCode) ? '[' + err.errorCode + '] ' : '') + (err && err.message ? err.message : String(err)), 'error');
        btn.innerHTML = oldHtml;
        btn.disabled = false;
      })
      .withSuccessHandler(function (res) {
        btn.innerHTML = oldHtml;
        btn.disabled = false;
        if (res && res.success) {
          window.Swal.fire({ icon:'success', title:'บันทึก LAB KPI แล้ว', timer:1000, showConfirmButton:false });
          if (typeof window.cesKpiClearCacheV36 === 'function') window.cesKpiClearCacheV36('LAB');
          window.fetchKPIData(rowId, true);
        } else {
          window.Swal.fire('LAB KPI Error', ((res && res.errorCode) ? '[' + res.errorCode + '] ' : '') + ((res && res.message) || 'Save failed'), 'error');
        }
      })
      .updateKPIStatusByTeam('LAB', rowId, 'LAB Status', newStatus, note, actor);
  }

  function labApplyDashboardResponseV36(res, keepOpenRowId, fromCache) {
    if (!res || !res.success) return false;
    globalKpiData = Array.isArray(res.data) ? res.data : [];
    globalKpiSummary = res.summary || null;
    KPI_STAGE_FILTER = 'All';
    KPI_QUICK_STATUS_FILTER = 'All';
    populateLabFilters(res);
    labRenderExecutiveSummary();
    labRenderTable();
    if (typeof window.updateLateBadge === 'function') window.updateLateBadge();

    var updated = byId('kpi-summary-updated');
    if (updated && fromCache) updated.textContent += ' • Cached';

    if (keepOpenRowId) {
      var row = globalKpiData.find(function (r) { return String(r.rowId) === String(keepOpenRowId); });
      if (row) labOpenModal(row);
      else if (byId('modal-kpi-update')) byId('modal-kpi-update').classList.add('hidden');
    }
    return true;
  }

  function labFetchData(keepOpenRowId, forceRefresh) {
    ensureLabUi();
    var tbody = byId('kpi-table-body');
    var bypassCache = !!forceRefresh || !!keepOpenRowId;

    if (!bypassCache && typeof window.cesKpiReadCacheV36 === 'function') {
      var cached = window.cesKpiReadCacheV36('LAB');
      if (cached && labApplyDashboardResponseV36(cached, null, true)) return;
    }

    if (!keepOpenRowId && tbody) {
      tbody.innerHTML = '<tr><td colspan="7" class="py-16 text-center text-slate-400"><i class="fas fa-circle-notch fa-spin text-3xl mb-3 text-slate-300"></i><p class="font-bold text-xs uppercase tracking-widest">Loading LAB EquipmentStatus...</p></td></tr>';
    }

    google.script.run
      .withFailureHandler(function (err) {
        window.Swal.fire('LAB KPI Error', err && err.message ? err.message : String(err), 'error');
        if (!keepOpenRowId && tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center text-red-500 py-10 font-bold">' + esc(err && err.message ? err.message : String(err)) + '</td></tr>';
      })
      .withSuccessHandler(function (res) {
        if (!res || !res.success) {
          window.Swal.fire('LAB KPI Error', (res && res.message) || 'Cannot load LAB KPI data', 'error');
          if (!keepOpenRowId && tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center py-10">' + esc((res && res.message) || 'Cannot load LAB data') + '</td></tr>';
          return;
        }
        if (typeof window.cesKpiWriteCacheV36 === 'function') window.cesKpiWriteCacheV36('LAB', res);
        labApplyDashboardResponseV36(res, keepOpenRowId, false);
      })
      .getKPIDashboardByTeam('LAB', { forceRefresh:!!forceRefresh || !!keepOpenRowId });
  }

  // ---------------- Public wrappers ----------------

  window.switchKpiTab = function (team) {
    team = String(team || 'EHS').toUpperCase();
    if (team !== 'LAB') restoreStandardUi();
    var result = typeof original.switchKpiTab === 'function' ? original.switchKpiTab.apply(this, arguments) : undefined;
    if (team === 'LAB') ensureLabUi();
    return result;
  };

  window.fetchKPIData = function (keepOpenRowId, forceRefresh) {
    if (!isLabTeam()) return typeof original.fetchKPIData === 'function' ? original.fetchKPIData.apply(this, arguments) : undefined;
    return labFetchData(keepOpenRowId || null, !!forceRefresh);
  };

  window.renderKpiExecutiveSummary = function () {
    if (!isLabTeam()) return typeof original.renderKpiExecutiveSummary === 'function' ? original.renderKpiExecutiveSummary.apply(this, arguments) : undefined;
    return labRenderExecutiveSummary();
  };

  window.getKpiFilteredRows = function () {
    if (!isLabTeam()) return typeof original.getKpiFilteredRows === 'function' ? original.getKpiFilteredRows.apply(this, arguments) : [];
    return labFilteredRows();
  };

  window.renderKPITable = function () {
    if (!isLabTeam()) return typeof original.renderKPITable === 'function' ? original.renderKPITable.apply(this, arguments) : undefined;
    return labRenderTable();
  };

  window.renderKpiPerformanceSummary = function (rows) {
    if (!isLabTeam()) return typeof original.renderKpiPerformanceSummary === 'function' ? original.renderKpiPerformanceSummary.apply(this, arguments) : undefined;
    return labRenderPerformance(rows);
  };

  window.openUpdateModal = function (row) {
    if (!isLabRow(row)) return typeof original.openUpdateModal === 'function' ? original.openUpdateModal.apply(this, arguments) : undefined;
    return labOpenModal(row);
  };

  window.saveJobStatus = function () {
    if (!isLabTeam()) return typeof original.saveJobStatus === 'function' ? original.saveJobStatus.apply(this, arguments) : undefined;
    return labSaveStatus();
  };

  window.kpiResetFilters = function () {
    if (!isLabTeam()) return typeof original.kpiResetFilters === 'function' ? original.kpiResetFilters.apply(this, arguments) : undefined;
    KPI_STAGE_FILTER = 'All';
    KPI_QUICK_STATUS_FILTER = 'All';
    ['kpi-filter-search','kpi-filter-year','kpi-filter-month','kpi-filter-worktype','kpi-filter-status','kpi-filter-team','kpi-filter-date-sort'].forEach(function (id) {
      var el = byId(id);
      if (!el) return;
      el.value = id === 'kpi-filter-search' ? '' : (id === 'kpi-filter-date-sort' ? 'date_desc' : 'All');
    });
    labRenderTable();
  };

  window.triggerLateEmail = function () {
    if (!isLabTeam()) return typeof original.triggerLateEmail === 'function' ? original.triggerLateEmail.apply(this, arguments) : undefined;
    window.Swal.fire('LAB KPI Notification', 'รายการล่าช้าดูได้จากปุ่มกระดิ่ง แต่ยังไม่ได้กำหนดผู้รับอีเมลของทีม LAB จึงยังไม่ส่งอีเมลอัตโนมัติ', 'info');
  };

  window.labKpiOpenById_ = function (rowId) {
    var row = (globalKpiData || []).find(function (r) { return String(r.rowId) === String(rowId); });
    if (row) labOpenModal(row);
  };

  window.labKpiApplyStageFilter_ = function (key) {
    KPI_STAGE_FILTER = KPI_STAGE_FILTER === key ? 'All' : key;
    KPI_QUICK_STATUS_FILTER = 'All';
    labRenderTable();
  };

  window.labKpiQuickStatusFilter_ = function (status) {
    KPI_QUICK_STATUS_FILTER = KPI_QUICK_STATUS_FILTER === status ? 'All' : status;
    KPI_STAGE_FILTER = 'All';
    labRenderTable();
  };

  window.labKpiFrontendRecheck = function () {
    return {
      ok: true,
      version: VERSION,
      currentTeam: (typeof currentKpiTeam !== 'undefined' ? currentKpiTeam : ''),
      isLab: isLabTeam(),
      rows: (typeof globalKpiData !== 'undefined' && globalKpiData ? globalKpiData.length : 0),
      summary: (typeof globalKpiSummary !== 'undefined' ? globalKpiSummary : null)
    };
  };

  console.log('[CES LAB KPI] Loaded', VERSION);
})(window, document);
