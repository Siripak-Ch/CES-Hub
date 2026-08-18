/* ============================================================
   CES Hub V31 — Frontend reference-alignment and regression fixes
   Loaded last. Additive only: keeps all existing public functions.
============================================================ */
(function (window, document) {
  'use strict';
  if (window.__CES_FRONTEND_REFERENCE_FIX_V31__) return;
  window.__CES_FRONTEND_REFERENCE_FIX_V31__ = true;

  var COLORS = {
    navy: '#172033', blue: '#003DA5', blue2: '#0A5BD3', cyan: '#00A9E0',
    green: '#00A88E', soft: '#EEF5FF', border: '#DCE7F5', muted: '#63748A'
  };

  function byId(id) { return document.getElementById(id); }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (s) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s];
  }); }
  function dateText(v) {
    if (!v) return '-';
    var d = new Date(v);
    if (isNaN(d.getTime())) return esc(v);
    try { return new Intl.DateTimeFormat('th-TH', {day:'2-digit', month:'short', year:'numeric'}).format(d); }
    catch (e) { return esc(v); }
  }

  function installStyle() {
    if (byId('ces-reference-fix-v31-style')) return;
    var style = document.createElement('style');
    style.id = 'ces-reference-fix-v31-style';
    style.textContent = `
      /* Keep page titles neutral; blue is reserved for active/accent states. */
      #view-management_overview h1,#view-management_overview h2,#view-management_overview h3,
      #view-report h1,#view-report h2,#view-report h3,
      #view-kpi h1,#view-kpi h2,#view-kpi h3{color:${COLORS.navy}!important}

      /* Home header icon follows the shared white-card standard. */
      #view-management_overview .ces-view-header .ces-view-icon,
      #view-management_overview .ces-view-header>.flex:first-child>div:first-child,
      #view-management_overview>.ces-view-header .p-3{background:#FFFFFF!important;color:${COLORS.blue}!important;border:1px solid #DBE7F4!important;box-shadow:0 5px 13px rgba(16,42,86,.075)!important}
      #view-management_overview .ces-view-header .ces-view-icon i,
      #view-management_overview .ces-view-header>.flex:first-child>div:first-child i{color:${COLORS.blue}!important}

      /* Report CSI reference header and team tabs. */
      #view-report .ces-view-header .ces-view-icon,
      #view-report .ces-view-header>.flex:first-child>div:first-child{background:#FFFFFF!important;color:${COLORS.blue}!important;border:1px solid #DBE7F4!important;box-shadow:0 5px 13px rgba(16,42,86,.075)!important}
      #view-report .ces-view-header .ces-view-icon i,
      #view-report .ces-view-header>.flex:first-child>div:first-child i{color:${COLORS.blue}!important}
      #view-report .ces-report-team-tabs{background:#EEF2F7!important;border:1px solid #E2E8F0!important;border-radius:13px!important;padding:3px!important;display:flex!important;gap:2px!important;box-shadow:none!important}
      #view-report .ces-report-team-tabs button{min-width:44px;border:0!important;border-radius:10px!important;box-shadow:none!important;transform:none!important}

      /* KPI reference icon and team tab bar. */
      #view-kpi .ces-view-header .ces-view-icon,
      #view-kpi .ces-view-header>.flex:first-child>div:first-child{background:#FFFFFF!important;color:${COLORS.blue}!important;border:1px solid #DBE7F4!important;box-shadow:0 5px 13px rgba(16,42,86,.075)!important}
      #view-kpi .ces-view-header .ces-view-icon i,
      #view-kpi .ces-view-header>.flex:first-child>div:first-child i{color:${COLORS.blue}!important}
      #view-kpi .ces-kpi-team-tabs{background:#EEF2F7!important;border:1px solid #E2E8F0!important;border-radius:13px!important;padding:3px!important;box-shadow:none!important}
      #view-kpi .ces-kpi-team-tabs button{border-radius:10px!important;box-shadow:none!important;transform:none!important}

      /* Infusion Pump Dashboard: align to main content left edge. */
      #view-stock_dashboard{width:100%!important}
      #view-stock_dashboard .stockpro-shell{width:100%!important;max-width:none!important;margin:0!important;padding-left:0!important;padding-right:0!important}
      #view-stock_dashboard .stockpro-header-card{margin-left:0!important;margin-right:0!important}
      #btn-stock_dashboard span{line-height:1.2!important;text-align:left!important}

      /* Rental alert popup: readable columns, no letter-by-letter wrapping. */
      .ces-stock-alert-popup{width:min(1180px,96vw)!important;padding:24px!important}
      .ces-stock-alert-popup .swal2-html-container{margin:12px 0 0!important;overflow:visible!important}
      .ces-alert-table-wrap{max-height:62vh;overflow:auto;border:1px solid #E2E8F0;border-radius:14px;background:#fff}
      .ces-alert-table{width:100%;min-width:940px;border-collapse:separate;border-spacing:0;table-layout:auto;font-size:12px;text-align:left}
      .ces-alert-table th{position:sticky;top:0;z-index:2;background:#F8FAFC;color:#64748B;font-size:10px;text-transform:uppercase;letter-spacing:.04em;padding:11px 12px;border-bottom:1px solid #E2E8F0;white-space:nowrap}
      .ces-alert-table td{padding:10px 12px;border-bottom:1px solid #EEF2F7;color:#475569;vertical-align:top;white-space:nowrap;word-break:normal!important;overflow-wrap:normal!important}
      .ces-alert-table td.ces-alert-model,.ces-alert-table td.ces-alert-borrower{white-space:normal;min-width:150px;max-width:230px;line-height:1.35}
      .ces-alert-overdue{display:block;color:#DC2626;font-size:10px;font-weight:800;margin-top:3px;white-space:nowrap}
      .ces-alert-status{display:inline-flex;white-space:nowrap;border-radius:999px;padding:4px 9px;background:#FEE2E2;color:#B91C1C;font-size:10px;font-weight:900}

      /* Inventory compact action buttons remain on one line. */
      #view-inventory .csv5-table th:last-child,#view-inventory .csv5-table td:last-child{min-width:184px!important;width:184px!important}
      #view-inventory .csv5-actions{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:5px!important;flex-wrap:nowrap!important;white-space:nowrap!important;min-width:max-content!important}
      #view-inventory .csv5-action{flex:0 0 30px!important}

      @media(max-width:900px){
        #view-inventory .csv5-table th:last-child,#view-inventory .csv5-table td:last-child{min-width:174px!important;width:174px!important}
        #view-stock_dashboard .stockpro-actions{gap:6px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function paintReportTabs() {
    var first = byId('btn-rteam-All');
    var wrap = first && first.parentElement;
    if (!wrap) return;
    wrap.classList.add('ces-report-team-tabs','ces-segmented-control');
    var active = window.__CES_REPORT_ACTIVE_TEAM || 'All';
    ['All','MED','LAB','EHS'].forEach(function (team) {
      var btn = byId('btn-rteam-' + team); if (!btn) return;
      var selected = active === team;
      btn.className = 'ces-segmented-btn' + (selected ? ' active' : '');
      btn.style.cssText = '';
      btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
  }

  function paintKpiTabs() {
    var first = byId('kpi-tab-med');
    var wrap = first && first.parentElement;
    if (!wrap) return;
    wrap.classList.add('ces-kpi-team-tabs');
    var active = window.__CES_KPI_ACTIVE_TEAM || 'EHS';
    ['MED','LAB','EHS'].forEach(function (team) {
      var btn = byId('kpi-tab-' + team.toLowerCase()); if (!btn) return;
      var selected = active === team;
      btn.style.cssText = 'background:' + (selected ? '#FFFFFF' : 'transparent') + '!important;color:' + (selected ? COLORS.blue : '#64748B') + '!important;border:1px solid ' + (selected ? '#D7E4F6' : 'transparent') + '!important;';
      btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
  }

  function isEnvRow(row) {
    row = row || {};
    var s = [row.serviceTeam,row.workflowType,row.sourceSheet,row.workType].join(' ').toUpperCase();
    return /(^|\W)ENV($|\W)|ENVIRONMENT/.test(s);
  }
  function norm(v) { return String(v == null ? '' : v).trim(); }
  function normalizeEnvStatus(row) {
    if (!isEnvRow(row)) return row;
    row.rawStatus = row.rawStatus || {};
    var sup = norm(row.rawStatus.sup || row.supStatus || row.supervisorStatus);
    var rep = norm(row.rawStatus.rep || row.reportStatus);
    var current = 'กำลังตรวจ';
    if (rep === 'ส่ง Report เสร็จแล้ว') current = 'ส่ง Report เสร็จแล้ว';
    else if (rep === 'รอแก้ไข') current = 'รอแก้ไข';
    else if (rep === 'รอส่ง Report') current = 'รอส่ง Report';
    else if (sup === 'รอแก้ไข') current = 'รอแก้ไข';
    else if (sup === 'ตรวจเสร็จ') current = 'ตรวจเสร็จ';
    else if (sup === 'กำลังตรวจ' || !sup) current = 'กำลังตรวจ';
    else current = sup;
    row.serviceTeam = 'ENV';
    row.workflowType = 'ENV';
    row.rawStatus.eng = '';
    row.rawStatus.engDate = '';
    row.rawStatus.sup = sup;
    row.rawStatus.rep = rep;
    row.currentStatus = current;
    row.statusDetail = current;
    row.isFinished = current === 'ส่ง Report เสร็จแล้ว';
    row.hasEdit = sup === 'รอแก้ไข' || rep === 'รอแก้ไข';
    return row;
  }

  function patchKpiEnvWorkflow() {
    var original = window.kpiApplyStrictWorkflowStatus;
    if (typeof original === 'function' && !original.__cesV31EnvPatched) {
      var wrapped = function (rows) {
        var out = original.call(this, rows);
        return (Array.isArray(out) ? out : []).map(normalizeEnvStatus);
      };
      wrapped.__cesV31EnvPatched = true;
      window.kpiApplyStrictWorkflowStatus = wrapped;
    }
    if (Array.isArray(window.globalKpiData)) {
      window.globalKpiData = window.globalKpiData.map(normalizeEnvStatus);
    }
  }

  function freshnessIconOnly(id) {
    var node = byId(id); if (!node) return;
    var label = (node.textContent || '').trim();
    if (label) { node.title = label; node.setAttribute('aria-label', label); }
  }

  function alertTable(rows) {
    return '<div class="ces-alert-table-wrap"><table class="ces-alert-table"><thead><tr>' +
      '<th>ID</th><th>SN</th><th>Model</th><th>Borrower</th><th>Borrow Date</th><th>Due Date</th><th>Status</th>' +
      '</tr></thead><tbody>' + rows.map(function (d) {
        return '<tr><td><b>' + esc(d.idCode || d.id_code) + '</b></td>' +
          '<td>' + esc(d.sn || d.serialNumber || d.serial_number || '-') + '</td>' +
          '<td class="ces-alert-model">' + esc(d.model || d.itemName || '-') + '</td>' +
          '<td class="ces-alert-borrower">' + esc(d.borrower || '-') + '</td>' +
          '<td>' + dateText(d.borrowDate || d.borrow_date) + '</td>' +
          '<td>' + dateText(d.expectedReturn || d.expectedReturnDate || d.expected_return_date) +
            (Number(d.overdueDays || d.overdue_days || 0) > 0 ? '<span class="ces-alert-overdue">เลย ' + Number(d.overdueDays || d.overdue_days) + ' วัน</span>' : '') + '</td>' +
          '<td><span class="ces-alert-status">Overdue</span></td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function patchAlertPopup() {
    window.sd_openAlertPopup = function () {
      var rows = Array.isArray(window.CES_STOCK_V7_ALERTS) ? window.CES_STOCK_V7_ALERTS : [];
      if (!window.Swal) return;
      window.Swal.fire({
        title: 'Rental Alerts',
        width: 'min(1180px, 96vw)',
        html: rows.length ? alertTable(rows) : '<div style="padding:28px;color:#64748B">ไม่มีสัญญาเกินกำหนด</div>',
        confirmButtonText: 'ปิด',
        customClass: {popup:'ces-swal-popup ces-stock-alert-popup'}
      });
    };
  }

  function patchRuntimeHooks() {
    var oldReport = window.applyReportFilters;
    if (typeof oldReport === 'function' && !oldReport.__cesV31Painted) {
      window.applyReportFilters = function () {
        var result = oldReport.apply(this, arguments);
        paintReportTabs();
        return result;
      };
      window.applyReportFilters.__cesV31Painted = true;
    }
    var oldKpiSwitch = window.switchKpiTab;
    if (typeof oldKpiSwitch === 'function' && !oldKpiSwitch.__cesV31Painted) {
      window.switchKpiTab = function () {
        window.__CES_KPI_ACTIVE_TEAM = arguments[0] || 'EHS';
        var result = oldKpiSwitch.apply(this, arguments);
        setTimeout(function () { patchKpiEnvWorkflow(); paintKpiTabs(); }, 0);
        return result;
      };
      window.switchKpiTab.__cesV31Painted = true;
    }
    var oldProgress = window.getKpiProgressInfo;
    if (typeof oldProgress === 'function' && !oldProgress.__cesV31EnvPatched) {
      window.getKpiProgressInfo = function (row) {
        normalizeEnvStatus(row);
        return oldProgress.call(this, row);
      };
      window.getKpiProgressInfo.__cesV31EnvPatched = true;
    }
    var oldSetRFilter = window.setRFilter;
    if (typeof oldSetRFilter === 'function' && !oldSetRFilter.__cesV31Painted) {
      window.setRFilter = function (key, value) {
        if (key === 'team') window.__CES_REPORT_ACTIVE_TEAM = value || 'All';
        var result = oldSetRFilter.apply(this, arguments);
        paintReportTabs();
        return result;
      };
      window.setRFilter.__cesV31Painted = true;
    }
    var oldRenderKpi = window.renderKPITable;
    if (typeof oldRenderKpi === 'function' && !oldRenderKpi.__cesV31EnvPatched) {
      window.renderKPITable = function () {
        patchKpiEnvWorkflow();
        var result = oldRenderKpi.apply(this, arguments);
        paintKpiTabs();
        return result;
      };
      window.renderKPITable.__cesV31EnvPatched = true;
    }
  }

  function refresh() {
    installStyle();
    if (!window.__CES_REPORT_ACTIVE_TEAM) window.__CES_REPORT_ACTIVE_TEAM = 'All';
    if (!window.__CES_KPI_ACTIVE_TEAM) window.__CES_KPI_ACTIVE_TEAM = 'EHS';
    var stockView = byId('view-stock_dashboard');
    var pageTitle = byId('header-page-title');
    if (pageTitle && stockView && !stockView.classList.contains('hidden')) pageTitle.textContent = 'Infusion Pump Dashboard';
    patchKpiEnvWorkflow();
    patchAlertPopup();
    patchRuntimeHooks();
    paintReportTabs();
    paintKpiTabs();
  }

  installStyle();
  patchAlertPopup();
  patchRuntimeHooks();
  refresh();

  var observer = new MutationObserver(function (mutations) {
    var needsRefresh = false;
    mutations.forEach(function (m) {
      if (m.addedNodes && m.addedNodes.length) needsRefresh = true;
    });
    if (needsRefresh) setTimeout(refresh, 0);
  });
  observer.observe(document.documentElement, {subtree:true, childList:true, characterData:true});

  var oldSwitchTab = window.switchTab;
  if (typeof oldSwitchTab === 'function' && !oldSwitchTab.__cesV31Wrapped) {
    window.switchTab = function () {
      var result = oldSwitchTab.apply(this, arguments);
      setTimeout(refresh, 20);
      return result;
    };
    window.switchTab.__cesV31Wrapped = true;
  }

  window.CES_FRONTEND_RECHECK = function () {
    var envSample = [];
    try {
      var envResult = typeof window.kpiEnvWorkflowRecheck === 'function' ? window.kpiEnvWorkflowRecheck() : null;
      envSample = envResult && Array.isArray(envResult.sample) ? envResult.sample : [];
    } catch (e) {}
    var badEnv = envSample.filter(function (r) { return !r.currentStatus || r.currentStatus === 'รอเริ่มงาน'; });
    var actionGroups = Array.from(document.querySelectorAll('#view-inventory .csv5-actions'));
    var out = {
      version: 'V31',
      systemRuntimeCompleted: !!window.CESUI && typeof window.kpiEnvWorkflowRecheck === 'function',
      stockRuntimeLoaded: typeof window.CES_STOCK_RECHECK === 'function' && typeof window.initStockDashboardModule === 'function',
      envWorkflowSample: envSample.map(function(r){return r.currentStatus;}),
      envRowsWithWrongStartStatus: badEnv.length,
      reportTabs: !!document.querySelector('#view-report .ces-report-team-tabs'),
      stockLeftAligned: !!document.querySelector('#view-stock_dashboard .stockpro-shell'),
      inventoryActionGroups: actionGroups.length,
      alertPopup: typeof window.sd_openAlertPopup === 'function'
    };
    console.log('[CES Frontend V31 Recheck]', out);
    return out;
  };
})(window, document);

  function cesFixSidebarSelection_(){
    var tab=String(window.currentTab||document.body.getAttribute('data-ces-active-tab')||'portal').toLowerCase();
    if(tab==='home')tab='portal';
    document.querySelectorAll('.nav-item').forEach(function(btn){
      var active=btn.id==='btn-'+tab;
      btn.classList.toggle('active',active);
      btn.classList.toggle('bg-slate-50',active);
      btn.classList.toggle('text-indigo-600',active);
      if(active)btn.setAttribute('aria-current','page');else btn.removeAttribute('aria-current');
    });
  }
  window.addEventListener('ces:tab-changed',cesFixSidebarSelection_);
  document.addEventListener('DOMContentLoaded',function(){setTimeout(cesFixSidebarSelection_,120);});
