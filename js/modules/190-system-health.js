// ============================================================
// 190-system-health.js — CES Hub V18
// Backend API E2E + frontend deployment/runtime health dashboard.
// ============================================================
(function () {
  'use strict';

  var state = {
    report: null,
    frontend: null,
    probeFilter: 'ALL',
    loading: false,
    initialized: false,
    loadingToken: ''
  };

  function el(id) { return document.getElementById(id); }
  function arr(value) { return Array.isArray(value) ? value : []; }
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch];
    });
  }
  function number(value) { return Number(value || 0).toLocaleString('en-US'); }
  function status(value) {
    value = String(value || 'SKIP').toUpperCase();
    return ['PASS','WARN','FAIL','SKIP'].indexOf(value) >= 0 ? value : 'SKIP';
  }
  function worstStatus(values) {
    var rows = arr(values).map(status);
    return rows.indexOf('FAIL') >= 0 ? 'FAIL' : rows.indexOf('WARN') >= 0 ? 'WARN' : rows.indexOf('PASS') >= 0 ? 'PASS' : 'SKIP';
  }
  function statusLabel(value) {
    var s = status(value);
    var icon = s === 'PASS' ? 'fa-circle-check' : s === 'WARN' ? 'fa-triangle-exclamation' : s === 'FAIL' ? 'fa-circle-xmark' : 'fa-circle-minus';
    return '<span class="ces-health-status ces-health-status-' + s.toLowerCase() + '"><i class="fas ' + icon + '"></i>' + s + '</span>';
  }

  function callApi(fn, args, options) {
    if (!window.CES_API || typeof window.CES_API.callFunction !== 'function') {
      return Promise.reject(new Error('CES API bridge is not available.'));
    }
    return window.CES_API.callFunction(fn, args || [], options || {});
  }

  function setLoading(flag, message) {
    state.loading = !!flag;
    var view = el('view-health');
    if (view) view.classList.toggle('ces-is-loading', state.loading);
    Array.prototype.forEach.call(document.querySelectorAll('[data-ces-health-action]'), function (button) {
      button.disabled = state.loading;
      button.classList.toggle('ces-button-loading', state.loading);
    });
    if (flag) {
      if (state.loadingToken && window.CES_UI) window.CES_UI.end(state.loadingToken);
      state.loadingToken = window.CES_UI && typeof window.CES_UI.begin === 'function'
        ? window.CES_UI.begin({ target:'#view-health', mode:'section', owner:'health', message:message || 'Checking system health…' }) : '';
      var updated = el('health-last-updated');
      if (updated) updated.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> ' + esc(message || 'Checking…');
    } else {
      if (state.loadingToken && window.CES_UI) window.CES_UI.end(state.loadingToken);
      state.loadingToken = '';
    }
  }

  function showError(error) {
    var message = error && error.message ? error.message : String(error || 'Unknown system health error');
    if (window.Swal) Swal.fire({ icon:'error', title:'System Health Check Failed', text:message, confirmButtonColor:'#003DA5' });
    else alert(message);
  }

  function countRows(rows) {
    var out = {PASS:0,WARN:0,FAIL:0,SKIP:0};
    arr(rows).forEach(function (row) { var key = status(row && row.status); out[key] = (out[key] || 0) + 1; });
    return out;
  }

  function frontendStatus() {
    return state.frontend ? status(state.frontend.overall) : 'SKIP';
  }

  function combinedOverall(report) {
    return worstStatus([report && report.overall, frontendStatus()]);
  }

  function setSummary(report) {
    report = report || {};
    var summary = report.summary || {};
    var overall = combinedOverall(report);
    var overallNode = el('health-overall-value');
    if (overallNode) {
      overallNode.textContent = overall;
      overallNode.className = 'ces-health-overall-' + overall.toLowerCase();
    }
    if (el('health-overall-note')) el('health-overall-note').textContent = report.mode === 'FULL_E2E' ? 'API E2E + frontend deployment' : 'Quick infrastructure + frontend deployment';

    var routesPassed = Number(summary.apiRoutesPassed || 0);
    var routesTotal = Number(summary.apiRoutes || 0);
    if (el('health-routes-value')) el('health-routes-value').textContent = number(routesPassed) + '/' + number(routesTotal);
    if (el('health-routes-note')) el('health-routes-note').textContent = Number(summary.apiRoutesFailed || 0) ? number(summary.apiRoutesFailed) + ' unresolved route(s)' : 'All public routes resolved';

    var probes = summary.liveProbes || {};
    var probeTotal = Number(probes.PASS || 0) + Number(probes.WARN || 0) + Number(probes.FAIL || 0) + Number(probes.SKIP || 0);
    if (el('health-probes-value')) el('health-probes-value').textContent = probeTotal ? number(probes.PASS || 0) + '/' + number(probeTotal) : 'Not run';
    if (el('health-probes-note')) el('health-probes-note').textContent = probeTotal ? number(probes.FAIL || 0) + ' fail · ' + number(probes.WARN || 0) + ' warn' : 'Run API E2E to invoke safe modules';

    var frontend = state.frontend;
    var frontendCounts = frontend ? frontend.counts : {PASS:0,WARN:0,FAIL:0,SKIP:0};
    var frontendTotal = frontend ? frontend.rows.length : 0;
    if (el('health-frontend-value')) el('health-frontend-value').textContent = frontend ? number(frontendCounts.PASS) + '/' + number(frontendTotal) : 'Not run';
    if (el('health-frontend-note')) el('health-frontend-note').textContent = frontend ? number(frontendCounts.FAIL) + ' fail · ' + number(frontendCounts.WARN) + ' warn' : 'Check deployed HTML, JS, CSS and runtime';

    var infrastructure = summary.infrastructure || {};
    var sourceTotal = Number(infrastructure.PASS || 0) + Number(infrastructure.WARN || 0) + Number(infrastructure.FAIL || 0) + Number(infrastructure.SKIP || 0);
    if (el('health-sources-value')) el('health-sources-value').textContent = sourceTotal ? number(infrastructure.PASS || 0) + '/' + number(sourceTotal) : '—';
    if (el('health-sources-note')) el('health-sources-note').textContent = sourceTotal ? number(infrastructure.FAIL || 0) + ' fail · ' + number(infrastructure.WARN || 0) + ' warn' : 'Waiting for Quick Check';

    if (el('health-errors-value')) el('health-errors-value').textContent = number(summary.recentErrors || arr(report.recentErrors).length);
    if (el('health-errors-note')) el('health-errors-note').textContent = arr(report.recentErrors).length ? 'Review latest API failures below' : 'No recent API error records';
  }

  function renderInfrastructure(report) {
    var rows = arr(report && report.infrastructure);
    var root = el('health-service-grid');
    if (!root) return;
    if (el('health-service-count')) el('health-service-count').textContent = number(rows.length) + ' checks';
    if (!rows.length) {
      root.innerHTML = '<div class="ces-health-empty"><i class="fas fa-heart-pulse"></i><span>No infrastructure results.</span></div>';
      return;
    }
    root.innerHTML = rows.map(function (row) {
      var s = status(row.status);
      var extra = row.missingSheets && row.missingSheets.length ? '<div class="ces-health-service-extra">Missing: ' + esc(row.missingSheets.join(', ')) + '</div>' : '';
      return '<div class="ces-health-service-item ces-health-border-' + s.toLowerCase() + '">' +
        '<div class="ces-health-service-top"><div class="ces-health-service-name">' + esc(row.service || row.type || 'Service') + '</div>' + statusLabel(s) + '</div>' +
        '<div class="ces-health-service-detail">' + esc(row.detail || row.message || '') + '</div>' +
        extra + '<div class="ces-health-service-meta"><span>' + esc(row.type || '') + '</span><span>' + number(row.elapsedMs || 0) + ' ms</span></div></div>';
    }).join('');
  }

  function renderProbes(report) {
    var rows = arr(report && report.liveProbes);
    if (state.probeFilter !== 'ALL') rows = rows.filter(function (row) { return status(row.status) === state.probeFilter; });
    var body = el('health-probe-table-body');
    if (!body) return;
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="5" class="ces-health-table-empty">' + (report && report.mode === 'FULL_E2E' ? 'No rows match this filter.' : 'API E2E audit has not been run.') + '</td></tr>';
      return;
    }
    body.innerHTML = rows.map(function (row) {
      var summary = row.summary || {};
      var resultText = row.message || '';
      if (summary.type) resultText += (resultText ? ' · ' : '') + summary.type + (summary.count != null ? ' (' + summary.count + ')' : '');
      return '<tr><td><strong>' + esc(row.module || '') + '</strong><small>' + esc(row.transport || 'API router') + '</small></td>' +
        '<td><code>' + esc(row.functionName || '') + '</code><small>→ ' + esc(row.resolvedFunctionName || '') + '</small></td>' +
        '<td>' + statusLabel(row.status) + '</td><td class="ces-health-time">' + number(row.elapsedMs || 0) + ' ms</td>' +
        '<td class="ces-health-result-text">' + esc(resultText) + '</td></tr>';
    }).join('');
  }

  function renderApiInventory() {
    var inventory = state.report && state.report.apiInventory || {};
    var rows = arr(inventory.rows);
    var query = String(el('health-api-search') && el('health-api-search').value || '').toLowerCase().trim();
    var mode = String(el('health-api-mode') && el('health-api-mode').value || 'ALL');
    rows = rows.filter(function (row) {
      if (query && String(row.name + ' ' + row.resolved).toLowerCase().indexOf(query) < 0) return false;
      if (mode === 'FAIL') return status(row.status) === 'FAIL';
      return mode === 'ALL' || row.mode === mode;
    });
    if (el('health-api-count')) el('health-api-count').textContent = number(rows.length) + ' routes';
    var body = el('health-api-table-body');
    if (!body) return;
    if (!rows.length) { body.innerHTML = '<tr><td colspan="5" class="ces-health-table-empty">No API routes match this filter.</td></tr>'; return; }
    body.innerHTML = rows.map(function (row) {
      return '<tr><td><code>' + esc(row.name) + '</code></td><td><code>' + esc(row.resolved) + '</code></td>' +
        '<td><span class="ces-health-mode ' + (row.mode === 'READ_ROUTE' ? 'read' : 'write') + '">' + esc(row.mode) + '</span></td>' +
        '<td>' + number(row.parameterCount || 0) + '</td><td>' + statusLabel(row.status) + '</td></tr>';
    }).join('');
  }

  function renderErrors(report) {
    var rows = arr(report && report.recentErrors);
    var root = el('health-error-list');
    if (!root) return;
    if (el('health-error-count')) el('health-error-count').textContent = number(rows.length) + ' errors';
    if (!rows.length) {
      root.innerHTML = '<div class="ces-health-empty ces-health-empty-success"><i class="fas fa-circle-check"></i><span>No recent API errors.</span></div>';
      return;
    }
    root.innerHTML = rows.map(function (row) {
      return '<div class="ces-health-error-item"><div class="ces-health-error-head"><strong>' + esc(row.module || 'API') + '</strong><span>' + esc(row.timestamp || '') + '</span></div>' +
        '<div class="ces-health-error-action">' + esc(row.action || '') + '</div><p>' + esc(row.message || '') + '</p></div>';
    }).join('');
  }

  function renderFrontendAudit() {
    var body = el('health-frontend-table-body');
    if (!body) return;
    var rows = state.frontend ? state.frontend.rows.slice() : [];
    var filter = String(el('health-frontend-filter') && el('health-frontend-filter').value || 'ALL');
    if (filter !== 'ALL') rows = rows.filter(function (row) { return status(row.status) === filter; });
    if (el('health-frontend-count')) el('health-frontend-count').textContent = number(rows.length) + ' checks';
    if (!rows.length) { body.innerHTML = '<tr><td colspan="5" class="ces-health-table-empty">Frontend audit has not been run or no rows match this filter.</td></tr>'; return; }
    body.innerHTML = rows.map(function (row) {
      return '<tr><td><span class="ces-health-mode ' + (row.type === 'RUNTIME' ? 'write' : 'read') + '">' + esc(row.type) + '</span></td>' +
        '<td><code>' + esc(row.name || row.url || '') + '</code></td><td>' + statusLabel(row.status) + '</td>' +
        '<td class="ces-health-time">' + number(row.elapsedMs || 0) + ' ms</td><td class="ces-health-result-text">' + esc(row.detail || '') + '</td></tr>';
    }).join('');
  }

  function renderReport(report) {
    state.report = report || {};
    try { localStorage.setItem('CES_HEALTH_REPORT_V18', JSON.stringify(state.report)); } catch (e) {}
    var updated = el('health-last-updated');
    if (updated) updated.innerHTML = '<i class="far fa-clock"></i> ' + esc(state.report.generatedAt || new Date().toLocaleString());
    setSummary(state.report);
    renderInfrastructure(state.report);
    renderProbes(state.report);
    renderApiInventory();
    renderErrors(state.report);
    renderFrontendAudit();
  }

  function assetUrl(path, nonce) {
    path = String(path || '').replace(/[?&]v=[^&]*/g, '').replace(/[?&]$/, '');
    var sep = path.indexOf('?') >= 0 ? '&' : '?';
    return path + sep + 'healthAudit=' + encodeURIComponent(nonce);
  }

  function fetchAsset(item, nonce) {
    var started = Date.now();
    var url = item.url;
    return fetch(assetUrl(url, nonce), { method:'GET', cache:'no-store', credentials:'same-origin' }).then(function (response) {
      return {
        type:item.type,
        name:url,
        status:response.ok ? 'PASS' : 'FAIL',
        elapsedMs:Date.now() - started,
        detail:response.ok ? 'HTTP ' + response.status + ' · ' + (item.required ? 'required' : 'optional') : 'HTTP ' + response.status + ' · file unavailable'
      };
    }).catch(function (error) {
      return { type:item.type, name:url, status:'FAIL', elapsedMs:Date.now()-started, detail:error && error.message || String(error) };
    });
  }

  function runtimeRows() {
    var snapshot = window.CES_UI && typeof window.CES_UI.runtimeSnapshot === 'function' ? window.CES_UI.runtimeSnapshot() : {};
    var rows = [];
    function add(name, ok, detail, warn) {
      rows.push({ type:'RUNTIME', name:name, status:ok ? 'PASS' : (warn ? 'WARN' : 'FAIL'), elapsedMs:0, detail:detail });
    }
    add('API bridge', !!snapshot.apiBridgeReady, snapshot.apiBridgeReady ? 'CES_API.callFunction is ready.' : 'CES_API.callFunction is missing.');
    add('Duplicate HTML IDs', !arr(snapshot.duplicateIds).length, arr(snapshot.duplicateIds).length ? arr(snapshot.duplicateIds).join(', ') : 'No duplicate IDs detected.');
    add('Required module views', !arr(snapshot.missingViews).length, arr(snapshot.missingViews).length ? 'Missing: ' + arr(snapshot.missingViews).join(', ') : 'All expected views are mounted.');
    add('View load failures', !arr(snapshot.failedViews).length, arr(snapshot.failedViews).length ? 'Unavailable: ' + arr(snapshot.failedViews).join(', ') : 'No view fallback/error sections.');
    add('Core controller globals', !arr(snapshot.missingGlobals).length, arr(snapshot.missingGlobals).length ? 'Missing: ' + arr(snapshot.missingGlobals).join(', ') : 'switchTab and loadAllData are ready.');
    add('Image assets', !arr(snapshot.failedImages).length, arr(snapshot.failedImages).length ? 'Broken: ' + arr(snapshot.failedImages).join(', ') : 'All rendered images loaded.');
    add('Pending loading jobs', Number(snapshot.pendingApi || 0) + Number(snapshot.pendingUiJobs || 0) === 0, 'API: ' + Number(snapshot.pendingApi || 0) + ' · UI jobs: ' + Number(snapshot.pendingUiJobs || 0), true);
    var boot = snapshot.bootReport || {};
    var failedBoot = arr(boot.failures);
    add('Boot asset report', !failedBoot.length, failedBoot.length ? failedBoot.map(function (x) { return x.url; }).join(', ') : 'No failed assets during current boot.');
    return rows;
  }

  async function runFrontendAssetAudit(force) {
    if (state.loading) return;
    setLoading(true, 'Checking deployed frontend files…');
    try {
      var manifest = window.CES_BOOT_MANIFEST || { styles:[], html:[], scripts:[] };
      var items = [];
      arr(manifest.styles).forEach(function (item) { items.push({ type:'CSS', url:item.url, required:item.required !== false }); });
      arr(manifest.html).forEach(function (item) { items.push({ type:'HTML', url:item.url, required:item.required === true }); });
      arr(manifest.scripts).forEach(function (item) { items.push({ type:'JS', url:item.url, required:item.required === true }); });
      items.unshift({ type:'JS', url:'js/core/include-loader.js', required:true });
      var nonce = Date.now();
      var rows = [];
      var cursor = 0;
      async function worker() {
        while (cursor < items.length) {
          var index = cursor++;
          rows[index] = await fetchAsset(items[index], nonce);
        }
      }
      var workers = [];
      for (var i = 0; i < Math.min(6, items.length); i++) workers.push(worker());
      await Promise.all(workers);
      rows = rows.concat(runtimeRows());
      var counts = countRows(rows);
      state.frontend = { generatedAt:new Date().toISOString(), rows:rows, counts:counts, overall:worstStatus(rows.map(function (x) { return x.status; })) };
      try { localStorage.setItem('CES_FRONTEND_HEALTH_V18', JSON.stringify(state.frontend)); } catch (e) {}
      renderFrontendAudit();
      setSummary(state.report || {});
      if (force && window.Swal) {
        Swal.fire({
          icon:state.frontend.overall === 'PASS' ? 'success' : state.frontend.overall === 'WARN' ? 'warning' : 'error',
          title:'Frontend Audit: ' + state.frontend.overall,
          text:counts.FAIL + ' failed · ' + counts.WARN + ' warning · ' + counts.PASS + ' passed',
          confirmButtonColor:'#003DA5'
        });
      }
      return state.frontend;
    } catch (error) {
      showError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function loadSystemHealth(force) {
    if (state.loading) return;
    setLoading(true, 'Running quick backend health check…');
    try {
      var report = await callApi('getSystemHealthReport', [{ force:!!force }], { transport:'jsonp', timeoutMs:180000 });
      renderReport(report || {});
      setLoading(false);
      if (!state.frontend || force) await runFrontendAssetAudit(false);
      return report;
    } catch (error) {
      var cached=null;
      try{cached=JSON.parse(localStorage.getItem('CES_HEALTH_REPORT_V18')||'null');}catch(ignore){}
      if(cached){
        renderReport(cached);
        if(window.Swal)Swal.fire({icon:'warning',title:'Live health check unavailable',text:'Showing the last saved health report. Retry after the Apps Script deployment is reachable.',confirmButtonColor:'#003DA5'});
        return cached;
      }
      showError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function runFullAudit() {
    if (state.loading) return;
    var confirmed = true;
    if (window.Swal) {
      var answer = await Swal.fire({
        icon:'info', title:'Run Full API End-to-End Audit?',
        html:'Safe read functions will run through the real Apps Script API router.<br><b>No save, upload, email, approval, cancel or delete function will execute.</b>',
        showCancelButton:true, confirmButtonText:'Run API E2E', cancelButtonText:'Cancel', confirmButtonColor:'#003DA5'
      });
      confirmed = answer.isConfirmed;
    }
    if (!confirmed) return;
    setLoading(true, 'Running API end-to-end audit…');
    try {
      var report = await callApi('runApiEndToEndAudit', [{ maxMs:45000, forceInfrastructure:true }], { transport:'jsonp', timeoutMs:120000, dedupe:false });
      renderReport(report || {});
      setLoading(false);
      await runFrontendAssetAudit(false);
      if (window.Swal) {
        var overall = combinedOverall(report);
        var issues = ((report && report.liveProbes) || []).filter(function(row){ return row && (row.status === 'FAIL' || row.status === 'WARN'); });
        ((report && report.infrastructure) || []).forEach(function(row){if(row&&(row.status==='FAIL'||row.status==='WARN'))issues.push({module:row.service||row.type,status:row.status,message:row.detail||row.message||''});});
        if(report&&report.apiInventory&&Number(report.apiInventory.failed||0)>0)issues.push({module:'API routes',status:'FAIL',message:Number(report.apiInventory.failed)+' unresolved route(s)'});
        var issueHtml = issues.length ? '<div class="ces-health-e2e-summary">' + issues.slice(0,12).map(function(row){ return '<div><b>' + escapeHtml(row.module || row.functionName) + ' · ' + escapeHtml(row.status) + '</b><span>' + escapeHtml(row.message || '') + '</span></div>'; }).join('') + '</div>' : '<p class="text-slate-500">All infrastructure checks, API routes and safe probes completed successfully.</p>';
        Swal.fire({ icon:overall === 'PASS' ? 'success' : overall === 'WARN' ? 'warning' : 'error', title:'System E2E: ' + overall, html:'<p>Backend completed in ' + number(report && report.elapsedMs || 0) + ' ms</p>' + issueHtml, width:720, confirmButtonColor:'#003DA5' });
      }
      return report;
    } catch (error) {
      showError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  function filterProbes(filter) {
    state.probeFilter = filter === 'ALL' ? 'ALL' : status(filter);
    var root = el('health-probe-filter');
    if (root) Array.prototype.forEach.call(root.querySelectorAll('button'), function (button) { button.classList.toggle('active', button.dataset.status === filter); });
    renderProbes(state.report || {});
  }

  function exportJson() {
    var payload = { backend:state.report, frontend:state.frontend, exportedAt:new Date().toISOString(), build:window.CES_BUILD_HASH || '' };
    if (!payload.backend && !payload.frontend) { showError(new Error('Run a health check before exporting.')); return; }
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'CES_HUB_System_Health_V18_' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function init() {
    if (state.initialized) return;
    state.initialized = true;
    try { state.report = JSON.parse(localStorage.getItem('CES_HEALTH_REPORT_V18') || 'null'); } catch (e) {}
    try { state.frontend = JSON.parse(localStorage.getItem('CES_FRONTEND_HEALTH_V18') || 'null'); } catch (e2) {}
    if (state.report) renderReport(state.report); else renderFrontendAudit();
    loadSystemHealth(false).catch(function () {});
  }

  window.initSystemHealthV18 = init;
  window.initSystemHealthV17 = init;
  window.loadSystemHealthV18 = loadSystemHealth;
  window.loadSystemHealthV17 = loadSystemHealth;
  window.runFullApiAuditV18 = runFullAudit;
  window.runFullApiAuditV17 = runFullAudit;
  window.runFrontendAssetAuditV18 = runFrontendAssetAudit;
  window.runFrontendAssetAuditV17 = runFrontendAssetAudit;
  window.filterHealthProbesV18 = filterProbes;
  window.filterHealthProbesV17 = filterProbes;
  window.renderHealthApiInventoryV18 = renderApiInventory;
  window.renderHealthApiInventoryV17 = renderApiInventory;
  window.renderFrontendAuditV18 = renderFrontendAudit;
  window.renderFrontendAuditV17 = renderFrontendAudit;
  window.exportSystemHealthJsonV18 = exportJson;
  window.exportSystemHealthJsonV17 = exportJson;

  // Backward-compatible names used by cached V14/V16 HTML/controller.
  window.initSystemHealthV14 = init;
  window.loadSystemHealthV14 = loadSystemHealth;
  window.runFullApiAuditV14 = runFullAudit;
  window.filterHealthProbesV14 = filterProbes;
  window.renderHealthApiInventoryV14 = renderApiInventory;
  window.exportSystemHealthJsonV14 = exportJson;
})();
