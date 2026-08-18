// ============================================================
// CES Hub include-loader.js — V24.1 Cache-safe Stability
// Resilient parallel asset loading with ordered DOM/script execution.
// A missing optional module is reported without stopping the whole app.
// ============================================================
(function (window, document) {
  'use strict';

  var report = window.CES_BOOT_REPORT || {
    version: 'V18',
    startedAt: new Date().toISOString(),
    completedAt: '',
    assets: [],
    failures: []
  };
  window.CES_BOOT_REPORT = report;

  function nowMs() { return Date.now ? Date.now() : new Date().getTime(); }

  function cacheBust(url) {
    var hash = window.CES_BUILD_HASH || 'dev';
    if (!url || /^(?:data:|blob:|https?:\/\/)/i.test(url)) return url;
    if (/[?&]v=/.test(url)) return url;
    return url + (url.indexOf('?') === -1 ? '?' : '&') + 'v=' + encodeURIComponent(hash);
  }

  function baseUrl(url) {
    return String(url || '').replace(/([?&])v=[^&]*/g, '$1').replace(/[?&]$/, '');
  }

  function pushAsset(item, type, status, elapsedMs, message) {
    var row = {
      type: type,
      url: baseUrl(item && item.url || item || ''),
      optional: !!(item && item.optional),
      status: status,
      elapsedMs: Number(elapsedMs || 0),
      message: String(message || '')
    };
    report.assets.push(row);
    if (status === 'FAIL') report.failures.push(row);
    try {
      window.dispatchEvent(new CustomEvent('ces:boot-asset', { detail: row }));
    } catch (ignore) {}
    return row;
  }

  function getTextSync(url) {
    var requestUrl = cacheBust(url);
    var xhr = new XMLHttpRequest();
    xhr.open('GET', requestUrl, false);
    try { xhr.send(null); }
    catch (err) { throw new Error('Cannot load ' + baseUrl(url) + ': ' + (err && err.message ? err.message : err)); }
    if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 0) return xhr.responseText;
    throw new Error('Cannot load ' + baseUrl(url) + ': HTTP ' + xhr.status);
  }

  function getText(url) {
    var requestUrl = cacheBust(url);
    if (typeof fetch !== 'function') return Promise.resolve(getTextSync(url));
    return fetch(requestUrl, { credentials: 'same-origin', cache: 'no-cache' })
      .then(function (response) {
        if (!response.ok) throw new Error('Cannot load ' + baseUrl(url) + ': HTTP ' + response.status);
        return response.text();
      })
      .catch(function (err) {
        // file:// and some embedded browsers can reject fetch but allow XHR.
        try { return getTextSync(url); }
        catch (fallbackErr) { throw fallbackErr || err; }
      });
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch];
    });
  }

  function fallbackView(item, error) {
    if (item.fallbackHtml) return item.fallbackHtml;
    var clean = baseUrl(item.url);
    var name = clean.split('/').pop().replace(/\.html?$/i, '') || 'module';
    var viewId = item.viewId || ('view-' + name.replace(/_/g, '-'));
    return '<section id="' + escapeHtml(viewId) + '" class="hidden ces-standard-page ces-module-unavailable" data-ces-load-failed="1">' +
      '<div class="ces-standard-card ces-module-unavailable-card">' +
      '<div class="ces-module-unavailable-icon"><i class="fas fa-triangle-exclamation"></i></div>' +
      '<h2>Module unavailable</h2><p>' + escapeHtml(clean) + '</p>' +
      '<small>' + escapeHtml(error && error.message ? error.message : error) + '</small>' +
      '</div></section>';
  }

  function showBootError(err) {
    console.error('[CESBoot]', err);
    var box = document.getElementById('ces-boot-error');
    if (!box) return;
    box.className = 'fixed inset-x-4 top-4 z-[9999] rounded-2xl bg-red-50 border border-red-200 text-red-700 p-4 shadow-xl font-sans';
    box.innerHTML = '<div class="font-bold mb-1">CES Hub boot error</div><div class="text-sm">' +
      escapeHtml(err && err.message ? err.message : err) +
      '</div><div class="text-xs mt-2 text-red-500">Core application files are missing. Open System Health after restoring the listed path.</div>';
  }

  function normalizeItem(value) {
    return typeof value === 'string' ? { url: value, optional: false } : (value || {});
  }

  function loadHtml(items) {
    items = (items || []).map(normalizeItem);
    return Promise.all(items.map(function (item) {
      var started = nowMs();
      return getText(item.url)
        .then(function (html) {
          pushAsset(item, 'HTML', 'PASS', nowMs() - started, 'Loaded');
          return { item: item, html: html, failed: false };
        })
        .catch(function (error) {
          pushAsset(item, 'HTML', 'FAIL', nowMs() - started, error && error.message ? error.message : error);
          if (!item.optional) throw error;
          return { item: item, html: fallbackView(item, error), failed: true, error: error };
        });
    })).then(function (results) {
      results.forEach(function (result) {
        var target = document.querySelector(result.item.target || 'body');
        if (!target) {
          var targetError = new Error('Target not found for ' + baseUrl(result.item.url) + ': ' + result.item.target);
          pushAsset(result.item, 'HTML_TARGET', 'FAIL', 0, targetError.message);
          if (!result.item.optional) throw targetError;
          return;
        }
        target.insertAdjacentHTML('beforeend', result.html);
      });
      return results;
    }).catch(function (err) { showBootError(err); throw err; });
  }

  function loadScripts(items) {
    items = (items || []).map(normalizeItem);
    return Promise.all(items.map(function (item) {
      var started = nowMs();
      return getText(item.url)
        .then(function (code) {
          pushAsset(item, 'SCRIPT', 'PASS', nowMs() - started, 'Loaded');
          return { item: item, code: code, failed: false };
        })
        .catch(function (error) {
          pushAsset(item, 'SCRIPT', 'FAIL', nowMs() - started, error && error.message ? error.message : error);
          if (!item.optional) throw error;
          return { item: item, code: '', failed: true, error: error };
        });
    })).then(function (results) {
      // Preserve script execution order, but yield between optional/deferred
      // modules. Previously every fetched script was appended in one long
      // synchronous task, which delayed clicks and local SweetAlert modals.
      var chain = Promise.resolve();
      results.forEach(function (result) {
        chain = chain.then(function () {
          if (result.failed || !result.code) return null;
          var script = document.createElement('script');
          script.setAttribute('data-ces-source', baseUrl(result.item.url));
          script.text = result.code + '\n//# sourceURL=' + baseUrl(result.item.url);
          document.head.appendChild(script);
          if (!result.item.optional) return null;
          return new Promise(function (resolve) {
            if (typeof requestAnimationFrame === 'function') requestAnimationFrame(function(){setTimeout(resolve,0);});
            else setTimeout(resolve,0);
          });
        });
      });
      return chain.then(function () {
        report.completedAt = new Date().toISOString();
        try { window.dispatchEvent(new CustomEvent('ces:boot-complete', { detail: report })); } catch (ignore) {}
        return results;
      });
    }).catch(function (err) { showBootError(err); throw err; });
  }

  function getReport() {
    return JSON.parse(JSON.stringify(report));
  }

  window.CESBoot = {
    cacheBust: cacheBust,
    getText: getText,
    getTextSync: getTextSync,
    loadHtml: loadHtml,
    loadScripts: loadScripts,
    getReport: getReport,
    showBootError: showBootError
  };
})(window, document);
