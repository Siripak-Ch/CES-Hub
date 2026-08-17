// ============================================================
// 005-ui-standard.js — CES Hub V18.1
// Shared layout normalization, non-blocking loading states and tab persistence.
// ============================================================
(function () {
  'use strict';

  var VERSION = 'V18.4';
  var seq = 0;
  var jobs = Object.create(null);
  var pendingApi = 0;
  var apiPatched = false;
  var switchPatched = false;
  var activeTab = '';
  var SCROLL_KEY = 'CES_TAB_SCROLL_V18';
  var MAX_JOB_MS = 180000;

  function now() { return Date.now ? Date.now() : new Date().getTime(); }
  function asArray(list) { return Array.prototype.slice.call(list || []); }
  function safeText(value) { return String(value == null ? '' : value); }

  function ensureTopBar() {
    var bar = document.getElementById('ces-global-progress-v17');
    if (bar) return bar;
    bar = document.createElement('div');
    bar.id = 'ces-global-progress-v17';
    bar.className = 'ces-global-progress ces-global-progress-v17';
    bar.setAttribute('aria-hidden', 'true');
    bar.innerHTML = '<span></span>';
    document.body.appendChild(bar);
    return bar;
  }

  function updateHeaderStatus() {
    var active = pendingApi > 0 || Object.keys(jobs).length > 0;
    var status = document.getElementById('lastUpdateText');
    if (!status) return;
    if (active) {
      var count = pendingApi + Object.keys(jobs).length;
      status.innerHTML = '<i class="fas fa-circle-notch fa-spin text-[8px]"></i> Syncing' + (count > 1 ? ' ' + count + ' requests' : '…');
      status.setAttribute('aria-busy', 'true');
    } else {
      status.innerHTML = '<i class="fas fa-check-circle text-[#003DA5]"></i> Active';
      status.removeAttribute('aria-busy');
    }
  }

  function updateTopBar() {
    var bar = ensureTopBar();
    var active = pendingApi > 0 || Object.keys(jobs).length > 0;
    bar.classList.toggle('active', active);
    bar.setAttribute('aria-hidden', active ? 'false' : 'true');
    updateHeaderStatus();
  }

  function resolveTarget(target) {
    if (!target) return null;
    if (typeof target === 'string') return document.querySelector(target);
    return target && target.nodeType === 1 ? target : null;
  }

  function directChildByClass(target, className) {
    if (!target) return null;
    for (var i = 0; i < target.children.length; i++) {
      if (target.children[i].classList && target.children[i].classList.contains(className)) return target.children[i];
    }
    return null;
  }

  function makeSectionOverlay(target, message) {
    if (!target) return null;
    var overlay = directChildByClass(target, 'ces-section-loading');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'ces-section-loading';
      overlay.innerHTML = '<div class="ces-section-loading-panel" role="status" aria-live="polite">' +
        '<span class="ces-section-spinner"></span><div><strong></strong><small>Data is loading without leaving this function</small></div></div>';
      target.appendChild(overlay);
    }
    var title = overlay.querySelector('strong');
    if (title) title.textContent = message || 'Loading data…';
    target.classList.add('ces-loading-host');
    target.setAttribute('aria-busy', 'true');
    overlay.classList.add('active');
    return overlay;
  }

  function begin(options) {
    options = typeof options === 'string' ? { message: options } : (options || {});
    var token = 'CES_UI_' + now() + '_' + (++seq);
    var mode = options.mode === 'section' ? 'section' : 'global';
    var target = resolveTarget(options.target);
    var overlay = mode === 'section' ? makeSectionOverlay(target, options.message) : null;
    jobs[token] = {
      mode: mode,
      target: target,
      overlay: overlay,
      startedAt: now(),
      message: options.message || '',
      owner: options.owner || ''
    };
    updateTopBar();
    return token;
  }

  function end(token) {
    var job = jobs[token];
    if (!job) return;
    delete jobs[token];
    if (job.overlay) {
      var stillOverlay = Object.keys(jobs).some(function (key) { return jobs[key].overlay === job.overlay; });
      if (!stillOverlay) job.overlay.classList.remove('active');
    }
    if (job.target) {
      var stillBusy = Object.keys(jobs).some(function (key) { return jobs[key].target === job.target; });
      if (!stillBusy) {
        job.target.classList.remove('ces-loading-host');
        job.target.removeAttribute('aria-busy');
      }
    }
    updateTopBar();
  }

  function endAll(owner) {
    Object.keys(jobs).forEach(function (token) {
      if (!owner || jobs[token].owner === owner) end(token);
    });
  }

  function withLoading(promiseOrFactory, options) {
    var token = begin(options || {});
    var value;
    try { value = typeof promiseOrFactory === 'function' ? promiseOrFactory() : promiseOrFactory; }
    catch (error) { end(token); throw error; }
    return Promise.resolve(value).then(function (result) {
      end(token); return result;
    }, function (error) {
      end(token); throw error;
    });
  }

  function trackButton(button, promiseOrFactory, label) {
    button = resolveTarget(button);
    if (!button) return withLoading(promiseOrFactory, { mode:'global', message:label || 'Processing…' });
    var previous = button.innerHTML;
    var previousDisabled = button.disabled;
    button.disabled = true;
    button.classList.add('ces-button-loading');
    button.setAttribute('aria-busy', 'true');
    if (label) button.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> ' + safeText(label);
    return withLoading(promiseOrFactory, { mode:'global', message:label || 'Processing…' }).then(function (result) {
      button.innerHTML = previous;
      button.disabled = previousDisabled;
      button.classList.remove('ces-button-loading');
      button.removeAttribute('aria-busy');
      return result;
    }, function (error) {
      button.innerHTML = previous;
      button.disabled = previousDisabled;
      button.classList.remove('ces-button-loading');
      button.removeAttribute('aria-busy');
      throw error;
    });
  }

  function setSkeleton(target, rows) {
    target = resolveTarget(target);
    if (!target) return;
    rows = Math.max(1, Math.min(Number(rows || 3), 12));
    var html = '';
    for (var i = 0; i < rows; i++) html += '<div class="ces-skeleton-row"><span></span><span></span><span></span></div>';
    target.innerHTML = html;
  }

  function normalizeTable(table) {
    if (!table || table.dataset.cesStandardTable === '1') return;
    table.dataset.cesStandardTable = '1';
    table.classList.add('ces-standard-table');
    var parent = table.parentElement;
    if (parent && !parent.classList.contains('ces-table-responsive') && !parent.hasAttribute('data-ces-no-table-wrap')) {
      parent.classList.add('ces-table-responsive');
    }
  }

  function directHeaderCandidate(view) {
    if (!view) return null;
    var selectors = [
      ':scope > .ces-function-header', ':scope > .ces-standard-header', ':scope > .ces-view-header',
      ':scope > .ces-ot-header', ':scope > .ces-booking-header', ':scope > [data-ces-function-header]',
      ':scope > .stockpro-header-card', '.stockpro-shell > .stockpro-header-card',
      '.stockpro-shell .stockpro-header-card', '.ces-page-header', '.ces-header-card'
    ];
    for (var i = 0; i < selectors.length; i++) {
      var found = null;
      try { found = view.querySelector(selectors[i]); } catch (ignore) {}
      if (found && found.querySelector('h1,h2,h3')) return found;
    }
    var children = asArray(view.children);
    for (var j = 0; j < children.length; j++) {
      var child = children[j];
      if (child.matches && child.matches('style,script,template')) continue;
      /* Inventory pages wrap their real header in a shell. Resolve that header
         before the broad h1/h2 fallback so the whole page is never styled as a header. */
      if (child.classList && child.classList.contains('stockpro-shell')) {
        var nested = child.querySelector('.stockpro-header-card,.stockpro-header,[data-ces-function-header]');
        if (nested && nested.querySelector('h1,h2,h3')) return nested;
      }
      if (child.querySelector && child.querySelector('h1,h2') && child.getBoundingClientRect) return child;
    }
    return null;
  }

  function directChildContaining(root, node) {
    if (!root || !node) return null;
    var current = node;
    while (current && current.parentElement && current.parentElement !== root) current = current.parentElement;
    return current && current.parentElement === root ? current : null;
  }

  function findHeaderIcon(titleWrap, title) {
    if (!titleWrap) return null;
    var selectors = [
      '.ces-function-icon', '.ces-standard-icon', '.ces-page-header-icon-v15', '.ces-view-icon',
      '.stockpro-icon', '.ces-booking-header-icon', '.ces-ot-title-icon', '.ces-report-icon-v17',
      '[data-ces-function-icon]'
    ];
    for (var i = 0; i < selectors.length; i++) {
      var matched = titleWrap.querySelector(selectors[i]);
      if (matched) return matched;
    }
    var children = asArray(titleWrap.children);
    for (var j = 0; j < children.length; j++) {
      var child = children[j];
      if (title && (child === title || child.contains(title))) continue;
      if (child.matches && child.matches('button,a,input,select,label')) continue;
      if ((child.matches && child.matches('i,svg,img')) || (child.querySelector && child.querySelector('i,svg,img'))) return child;
    }
    return null;
  }


  function actionFingerprint(node) {
    if (!node) return '';
    return [node.title,node.getAttribute && node.getAttribute('aria-label'),node.textContent,node.getAttribute && node.getAttribute('onclick'),node.className].join(' ').toLowerCase();
  }

  function normalizeActionControl(node) {
    if (!node || !node.classList) return;
    var fp = actionFingerprint(node);
    var icon = node.querySelector && node.querySelector('i');
    var iconClass = icon ? String(icon.className || '').toLowerCase() : '';

    // CES V22.3 icon contract: upload uses a neutral upload glyph distinct from Excel export.
    var isUploadAction = /upload|import template|import data|bulk upload/.test(fp) && !/download|export/.test(fp);
    if (isUploadAction && icon) {
      icon.className = 'fas fa-arrow-up-from-bracket';
      node.classList.add('ces-upload-standardized-v222');
    }
    if (node.classList.contains('ces-upload-icon-btn')) {
      if (icon) icon.className = 'fas fa-arrow-up-from-bracket';
      asArray(node.querySelectorAll('.ces-upload-arrow')).forEach(function(x){x.remove();});
      node.classList.add('ces-standard-icon-btn');
    }
    if (node.classList.contains('ces-external-link-btn')) {
      if (icon) icon.className = 'fas fa-link';
      node.classList.add('ces-standard-icon-btn');
    }

    var isFilterReset = /reset\s*filter|clear\s*filter/.test(fp) ||
      node.classList.contains('ces-filter-reset-word-v227') ||
      node.classList.contains('ces-stock-filter-reset-v226') ||
      node.classList.contains('ces-filter-reset-v228');
    var destructive = !isFilterReset && (/(^|\s|[-_])(delete|clear|reset|remove)(\s|$|[-_])/.test(fp) ||
      /clear form|clear data|reset data|reset form|fa-trash|fa-eraser/.test(fp + ' ' + iconClass));
    var isExcel = /export[^a-z]*(excel|xlsx)|file-excel/.test(fp + ' ' + iconClass);
    var isPdf = /export[^a-z]*pdf|print[^a-z]*pdf|file-pdf/.test(fp + ' ' + iconClass);
    var isWarning = /alert|notification/.test(fp) || /fa-bell/.test(iconClass);
    var isImport = /import/.test(fp) || /fa-file-import/.test(iconClass);
    var isNeutral = /refresh|reload|resync|sync data|upload|drive|google calendar/.test(fp) ||
      /fa-(sync|rotate|upload|file-arrow-up|arrow-up-from-bracket|google-drive)/.test(iconClass);
    var inMasterCalendar = !!(node.closest && node.closest('#view-calendar'));

    if (destructive || isExcel || isPdf || isWarning || isNeutral || (isImport && inMasterCalendar)) {
      node.classList.remove(
        'ces-action-neutral','ces-action-primary','ces-action-excel','ces-action-pdf',
        'ces-action-pdf-danger','ces-action-delete','ces-action-warning'
      );
    }

    if (destructive) {
      node.classList.add('ces-action-delete');
      node.dataset.cesDestructive = '1';
      if (icon) icon.className = 'fas fa-trash-can';
      if (!node.title) node.title = 'Clear / Reset';
    } else {
      delete node.dataset.cesDestructive;
      if (isFilterReset) {
        node.classList.remove('ces-action-delete');
        node.classList.add('ces-action-neutral','ces-filter-reset-v228');
        if (icon) icon.className = 'fas fa-rotate-left';
      } else if (isExcel) node.classList.add('ces-action-excel');
      else if (isPdf) node.classList.add('ces-action-pdf');
      else if (isWarning) node.classList.add('ces-action-warning');
      else if (isImport && inMasterCalendar) node.classList.add('ces-action-neutral');
      else if (isNeutral || isImport) node.classList.add('ces-action-neutral');
    }

    if (node.querySelectorAll && node.querySelectorAll(':scope > i,:scope > svg').length === 1 &&
        !String(node.textContent || '').trim()) {
      node.classList.add('ces-action-icon-only');
    }
  }

  function reorderHeaderActions(container) {
    if (!container || !container.querySelectorAll) return;
    var destructive = asArray(container.querySelectorAll('[data-ces-destructive="1"]'));
    destructive.forEach(function (node) {
      if (node.parentElement === container) container.appendChild(node);
    });
  }

  function normalizeFunctionHeader(view) {
    var header = directHeaderCandidate(view);
    if (!header) return;
    header.classList.add('ces-function-header');
    header.setAttribute('data-ces-function-header', '1');

    var title = header.querySelector('h1,h2,h3');
    if (!title) return;
    title.classList.add('ces-function-title');

    var titleWrap = directChildContaining(header, title) || title.parentElement;
    if (titleWrap) titleWrap.classList.add('ces-function-title-wrap');

    var titleTextWrap = title.parentElement;
    if (titleTextWrap) titleTextWrap.classList.add('ces-function-copy');
    var subtitle = titleTextWrap ? titleTextWrap.querySelector(':scope > p') : null;
    if (!subtitle) subtitle = header.querySelector('.ces-ot-subtitle,.ces-standard-subtitle,.ces-page-subtitle,p');
    if (subtitle) subtitle.classList.add('ces-function-subtitle');

    var icon = findHeaderIcon(titleWrap, title);
    if (icon) {
      icon.classList.add('ces-function-icon');
      icon.setAttribute('data-ces-function-icon', '1');
      icon.classList.remove('blue');
    }

    var actionCandidates = asArray(header.children).filter(function(node) {
      return node !== titleWrap && node.querySelector && node.querySelector('button,a,select,input,label');
    });
    if (actionCandidates.length) {
      actionCandidates.forEach(function(node) {
        node.classList.add('ces-function-actions','ces-horizontal-action-rail');
        asArray(node.querySelectorAll('button,a,label')).forEach(normalizeActionControl);
        reorderHeaderActions(node);
      });
    }
  }

  function normalizeView(view) {
    if (!view || view.hasAttribute('data-ces-no-standard')) return;
    if (view.dataset.cesStandardized !== '1') {
      view.dataset.cesStandardized = '1';
      view.classList.add('ces-standard-page');
    }
    normalizeFunctionHeader(view);
    asArray(view.querySelectorAll('table')).forEach(normalizeTable);
    asArray(view.querySelectorAll('button,a,label')).forEach(normalizeActionControl);
    asArray(view.querySelectorAll('input,select,textarea,button')).forEach(function (node) {
      if (!node.hasAttribute('aria-label') && node.title) node.setAttribute('aria-label', node.title);
    });
  }

  function normalizeAllViews() {
    asArray(document.querySelectorAll('#app-main-content [id^="view-"]')).forEach(normalizeView);
  }

  function patchApi() {
    if (apiPatched || !window.CES_API || typeof window.CES_API.callFunction !== 'function') return false;
    var original = window.CES_API.callFunction.bind(window.CES_API);
    window.CES_API.callFunction = function (fnName, args, options) {
      options = options || {};
      if (options.silent === true || options.trackLoading === false) return original(fnName, args, options);
      pendingApi++;
      updateTopBar();
      var startedAt = now();
      var promise;
      try { promise = Promise.resolve(original(fnName, args, options)); }
      catch (error) {
        pendingApi = Math.max(0, pendingApi - 1);
        updateTopBar();
        throw error;
      }
      return promise.then(function (result) {
        pendingApi = Math.max(0, pendingApi - 1);
        updateTopBar();
        try { window.dispatchEvent(new CustomEvent('ces:api-complete', { detail:{functionName:fnName,elapsedMs:now()-startedAt,success:true} })); } catch (ignore) {}
        return result;
      }, function (error) {
        pendingApi = Math.max(0, pendingApi - 1);
        updateTopBar();
        try { window.dispatchEvent(new CustomEvent('ces:api-complete', { detail:{functionName:fnName,elapsedMs:now()-startedAt,success:false,message:error && error.message || String(error)} })); } catch (ignore2) {}
        throw error;
      });
    };
    apiPatched = true;
    try { window.dispatchEvent(new CustomEvent('ces:ui-api-patched', { detail:{version:VERSION} })); } catch (ignore) {}
    return true;
  }

  function readScrollMap() {
    try { return JSON.parse(sessionStorage.getItem(SCROLL_KEY) || '{}') || {}; }
    catch (e) { return {}; }
  }

  function writeScrollMap(map) {
    try { sessionStorage.setItem(SCROLL_KEY, JSON.stringify(map || {})); } catch (e) {}
  }

  function scrollRoot() {
    return document.querySelector('[data-ces-scroll-root]') || document.scrollingElement || document.documentElement;
  }

  function saveScroll(tab) {
    tab = safeText(tab || activeTab).toLowerCase();
    if (!tab) return;
    var root = scrollRoot();
    var map = readScrollMap();
    map[tab] = { top:Number(root.scrollTop || window.pageYOffset || 0), left:Number(root.scrollLeft || window.pageXOffset || 0) };
    writeScrollMap(map);
  }

  function restoreScroll(tab) {
    tab = safeText(tab).toLowerCase();
    var map = readScrollMap();
    var pos = map[tab] || {top:0,left:0};
    requestAnimationFrame(function () {
      var root = scrollRoot();
      try { root.scrollTo ? root.scrollTo(pos.left || 0, pos.top || 0) : (root.scrollTop = pos.top || 0); }
      catch (e) { root.scrollTop = pos.top || 0; }
    });
  }

  function patchSwitchTab() {
    if (switchPatched || typeof window.switchTab !== 'function') return false;
    var original = window.switchTab;
    window.switchTab = function (tab) {
      var next = safeText(tab).toLowerCase();
      if (next === 'home') next = 'portal';
      if (next === 'dashboard' || next === 'management-overview') next = 'management_overview';
      if (activeTab && activeTab !== next) saveScroll(activeTab);
      var result = original.apply(this, arguments);
      activeTab = next || activeTab;
      try {
        document.body.dataset.cesTab = activeTab;
        sessionStorage.setItem('CES_ACTIVE_TAB_V60', activeTab);
        localStorage.setItem('CES_ACTIVE_TAB_V60', activeTab);
      } catch (e) {}
      normalizeAllViews();
      restoreScroll(activeTab);
      try { window.dispatchEvent(new CustomEvent('ces:tab-changed', { detail:{tab:activeTab} })); } catch (ignore) {}
      return result;
    };
    switchPatched = true;
    return true;
  }

  function runtimeSnapshot() {
    var duplicateIds = [];
    var seen = Object.create(null);
    asArray(document.querySelectorAll('[id]')).forEach(function (node) {
      var id = node.id;
      if (!id) return;
      if (seen[id]) duplicateIds.push(id); else seen[id] = true;
    });
    var expectedTabs = ['portal','management_overview','yearly','revenue','ot','service','report','memo_workorder','calendar','checkin','car_booking','van_booking','weekly','report_manage','kpi','stock_dashboard','inventory','check_stock','team_information','team_plan','monthly_report','users','ces_evaluation','ces_ai_knowledge','setting','health'];
    var missingViews = expectedTabs.filter(function (tab) { return !document.getElementById('view-' + tab); });
    var failedViews = asArray(document.querySelectorAll('[data-ces-load-failed="1"]')).map(function (node) { return node.id || 'unknown'; });
    var requiredGlobals = ['switchTab','loadAllData'];
    var missingGlobals = requiredGlobals.filter(function (name) { return typeof window[name] !== 'function'; });
    var failedImages = asArray(document.images).filter(function (image) {
      return image.getAttribute('src') && image.complete && Number(image.naturalWidth || 0) === 0;
    }).map(function (image) { return image.getAttribute('src'); });
    return {
      version: VERSION,
      generatedAt: new Date().toISOString(),
      duplicateIds: duplicateIds,
      missingViews: missingViews,
      failedViews: failedViews,
      missingGlobals: missingGlobals,
      failedImages: failedImages,
      apiBridgeReady: !!(window.CES_API && typeof window.CES_API.callFunction === 'function'),
      currentTab: window.currentTab || activeTab || '',
      pendingApi: pendingApi,
      pendingUiJobs: Object.keys(jobs).length,
      bootReport: window.CESBoot && typeof window.CESBoot.getReport === 'function' ? window.CESBoot.getReport() : (window.CES_BOOT_REPORT || null)
    };
  }

  function staleJobSweep() {
    var cutoff = now() - MAX_JOB_MS;
    Object.keys(jobs).forEach(function (token) {
      if (jobs[token].startedAt < cutoff) end(token);
    });
  }

  function init() {
    ensureTopBar();
    normalizeAllViews();
    patchApi();
    patchSwitchTab();
    var root = document.getElementById('app-main-content');
    if (root && typeof MutationObserver !== 'undefined') {
      var normalizeFrame = 0;
      new MutationObserver(function () {
        if (normalizeFrame) return;
        normalizeFrame = requestAnimationFrame(function () {
          normalizeFrame = 0;
          normalizeAllViews();
        });
      }).observe(root, { childList:true, subtree:true });
    }
    var attempts = 0;
    var timer = setInterval(function () {
      attempts++;
      patchApi();
      patchSwitchTab();
      staleJobSweep();
      if ((apiPatched && switchPatched && attempts > 3) || attempts > 120) clearInterval(timer);
    }, 500);
    window.addEventListener('beforeunload', function () { saveScroll(activeTab || window.currentTab || ''); });
  }

  window.CES_UI = {
    version: VERSION,
    begin: begin,
    end: end,
    endAll: endAll,
    withLoading: withLoading,
    trackButton: trackButton,
    setSkeleton: setSkeleton,
    normalize: normalizeAllViews,
    saveScroll: saveScroll,
    restoreScroll: restoreScroll,
    runtimeSnapshot: runtimeSnapshot,
    getPendingCount: function () { return pendingApi + Object.keys(jobs).length; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
