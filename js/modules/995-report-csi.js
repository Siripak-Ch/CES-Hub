/* ============================================================
   CES Hub V31 — Header Icon Direct Fix + Report CSI API Recovery
   - Header icons are marked directly in each runtime view.
   - Report CSI uses the existing public API name saveReportDataArray.
   - Backend V31 overrides that existing API with upsert behavior.
============================================================ */
(function (window, document) {
  'use strict';
  if (window.__CES_HEADER_REPORT_V31__) return;
  window.__CES_HEADER_REPORT_V31__ = true;

  var VERSION = 'V31';
  var BLUE = '#003DA5';
  var CACHE_KEY = 'CES_REPORT_CSI_CACHE_V31';
  var refreshPromise = null;
  var overlayWatchdog = null;
  var chartRefreshTimer = null;

  function id(name) { return document.getElementById(name); }
  function text(value) { return String(value == null ? '' : value).trim(); }
  function messageOf(err) { return err && err.message ? err.message : String(err || 'Unknown error'); }
  function configuredApiUrl() {
    return window.CES_CONFIG && window.CES_CONFIG.GAS_API_URL ? String(window.CES_CONFIG.GAS_API_URL) : '';
  }

  function applyHeaderIcons() {
    var nodes = document.querySelectorAll('.ces-page-header-icon-v31');
    Array.prototype.forEach.call(nodes, function (node) {
      node.style.setProperty('background', '#fff', 'important');
      node.style.setProperty('background-color', '#fff', 'important');
      node.style.setProperty('background-image', 'none', 'important');
      node.style.setProperty('color', BLUE, 'important');
      node.style.setProperty('border', '1px solid #d9e5f3', 'important');
      node.style.setProperty('box-shadow', '0 6px 16px rgba(16,42,86,.08)', 'important');
      Array.prototype.forEach.call(node.querySelectorAll('i,svg'), function (icon) {
        icon.style.setProperty('color', BLUE, 'important');
      });
    });
  }

  function showOverlay(label) {
    var overlay = id('loadingOverlay');
    var loadingText = id('loadingText');
    if (loadingText) loadingText.textContent = label || 'Processing...';
    if (overlay) {
      overlay.style.removeProperty('display');
      overlay.classList.remove('hidden');
    }
    clearTimeout(overlayWatchdog);
    overlayWatchdog = setTimeout(function () {
      hideOverlay();
      console.warn('[Report CSI V31] stale overlay closed automatically');
    }, 15000);
  }

  function hideOverlay() {
    clearTimeout(overlayWatchdog);
    overlayWatchdog = null;
    var overlay = id('loadingOverlay');
    if (!overlay) return;
    overlay.classList.add('hidden');
    overlay.style.setProperty('display', 'none', 'important');
    setTimeout(function () { overlay.style.removeProperty('display'); }, 100);
  }

  function timeout(promise, milliseconds, label) {
    var timer;
    return Promise.race([
      Promise.resolve(promise),
      new Promise(function (_, reject) {
        timer = setTimeout(function () {
          reject(new Error((label || 'Request') + ' timed out after ' + Math.round(milliseconds / 1000) + ' seconds'));
        }, milliseconds);
      })
    ]).finally(function () { clearTimeout(timer); });
  }

  function apiCall(name, args, options) {
    args = Array.isArray(args) ? args : [];
    options = options || {};
    if (!window.CES_API || typeof window.CES_API.callFunction !== 'function') {
      return Promise.reject(new Error('CES_API is not available. Check js/gas-polyfill.js and js/config.js.'));
    }
    return window.CES_API.callFunction(name, args, options);
  }

  function apiHealth() {
    if (!window.CES_API || typeof window.CES_API.health !== 'function') {
      return Promise.reject(new Error('CES_API health function is unavailable'));
    }
    return timeout(window.CES_API.health(), 25000, 'Apps Script API health check');
  }

  function cacheReadBox() {
    try {
      var cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      return cached && cached.data ? cached : null;
    } catch (_) { return null; }
  }
  function cacheRead() { var box = cacheReadBox(); return box ? box.data : null; }
  function cacheWrite(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts:Date.now(), data:data })); } catch (_) {}
  }
  function cacheClear() { try { localStorage.removeItem(CACHE_KEY); } catch (_) {} }

  function scheduleChartRefresh_(){clearTimeout(chartRefreshTimer);chartRefreshTimer=setTimeout(function(){try{if(typeof window.reportResizeCharts_==='function')window.reportResizeCharts_();else if(window.reportCharts){Object.keys(window.reportCharts).forEach(function(k){var c=window.reportCharts[k];if(c&&typeof c.resize==='function')c.resize();});}}catch(ignore){}},60);}
  function renderReport(payload) {
    payload = payload || {};
    var normalized = {
      report:Array.isArray(payload.report) ? payload.report : [],
      tickets:Array.isArray(payload.tickets) ? payload.tickets : []
    };
    try{if (typeof window.initReport === 'function') window.initReport(normalized.report, normalized.tickets);else if (typeof initReport === 'function') initReport(normalized.report, normalized.tickets);}finally{scheduleChartRefresh_();}
    cacheWrite(normalized);
    return normalized;
  }

  function loadReportCSIData_(force, showLoading) {
    force = force === true;
    showLoading = showLoading === true;
    var cacheBox = cacheReadBox();
    var cached = cacheBox && cacheBox.data;
    var cacheAge = cacheBox ? Date.now() - Number(cacheBox.ts || 0) : Infinity;
    var cacheFresh = cacheAge < 30 * 60 * 1000;
    if (!force && cached) {
      renderReport(cached);
      if (cacheFresh) return Promise.resolve(cached);
    }
    if (refreshPromise) return refreshPromise;
    var backgroundRefresh = !force && !!cached;
    if (showLoading && !cached) showOverlay('Loading Report CSI...');

    refreshPromise = timeout(
      apiCall('getReportDataOnly', [], {
        transport:'jsonp', timeoutMs:50000, dedupe:true,
        priority:backgroundRefresh?'background':'active', background:backgroundRefresh,
        silentLoading:backgroundRefresh, userAction:!backgroundRefresh, module:'report'
      }),
      55000,
      'Report CSI load'
    ).then(renderReport).catch(function (err) {
      if (cached) {
        renderReport(cached);
        if (force && window.Swal) Swal.fire({ icon:'warning', title:'Using cached Report CSI', text:messageOf(err), timer:2500, showConfirmButton:false });
        return cached;
      }
      throw err;
    }).finally(function () {
      refreshPromise = null;
      hideOverlay();
    });
    return refreshPromise;
  }

  function patchReportControls() {
    var input = id('reportFileInput');
    if (input) input.setAttribute('onchange', 'handleReportUpload(event)');
    var refresh = document.querySelector('#view-report button[title="Refresh Data"],#view-report button[title="Refresh Report CSI"]');
    if (refresh) {
      refresh.setAttribute('onclick', 'loadReportCSIOnly(true,true)');
      refresh.setAttribute('title', 'Refresh Report CSI');
    }
  }

  function apply() {
    applyHeaderIcons();
    patchReportControls();
  }

  window.loadReportCSIOnly = function (forceRefresh, showLoading) {
    if (arguments.length >= 2) return loadReportCSIData_(forceRefresh === true, showLoading === true);
    return loadReportCSIData_(forceRefresh === true, forceRefresh === true);
  };

  document.addEventListener('visibilitychange',function(){if(!document.hidden)scheduleChartRefresh_();});
  window.addEventListener('resize',scheduleChartRefresh_);

  apply();
  setTimeout(apply, 100);
  setTimeout(apply, 800);
  setTimeout(apply, 1800);

  var originalSwitchTab = window.switchTab;
  if (typeof originalSwitchTab === 'function' && !originalSwitchTab.__cesV31Wrapped) {
    window.switchTab = function () {
      var result = originalSwitchTab.apply(this, arguments);
      setTimeout(apply, 0);
      setTimeout(apply, 180);
      return result;
    };
    window.switchTab.__cesV31Wrapped = true;
  }

  window.CES_REPORT_API_TEST = function () {
    return apiHealth().then(function (result) {
      console.log('[CES Report V31 API Test] connected', result);
      return { ok:true, result:result, apiUrl:configuredApiUrl() };
    }).catch(function (err) {
      var out = { ok:false, error:messageOf(err), apiUrl:configuredApiUrl() };
      console.error('[CES Report V31 API Test] failed', out);
      return out;
    });
  };

  window.CES_REPORT_UI_RECHECK = function () {
    var icons = Array.prototype.slice.call(document.querySelectorAll('.ces-page-header-icon-v31'));
    var notWhite = icons.filter(function (node) {
      return getComputedStyle(node).backgroundColor !== 'rgb(255, 255, 255)';
    });
    var input = id('reportFileInput');
    var result = {
      version:VERSION,
      headerIcons:icons.length,
      nonWhiteHeaderIcons:notWhite.length,
      uploadHandler:input ? input.getAttribute('onchange') : '',
      apiUrl:configuredApiUrl(),
      endpoint:'saveReportDataArray',
      uploadHandlerReady:typeof window.handleReportUpload === 'function',
      refreshPending:!!refreshPromise
    };
    console.log('[CES Report V31 Recheck]', result);
    return result;
  };
})(window, document);
