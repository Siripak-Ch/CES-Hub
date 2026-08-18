// ============================================================
// gas-polyfill.js
// CES Hub GitHub Frontend → Apps Script API Bridge
//
// Replaces google.script.run on GitHub Pages / LINE LIFF.
// Transport:
// - JSONP GET for read/small calls
// - No-CORS form POST + async result polling for save/process/large calls
// - Hidden iframe is fallback only when fetch cannot submit
// Backend expected:
//   /exec?api=1&action=call&fn=getAllData&args=[]&callback=...
//   POST form fields: api, action, fn, args, callback, operationId
// ============================================================

(function () {
  'use strict';

  const JSONP_TIMEOUT_MS = 90000;
  const IFRAME_TIMEOUT_MS = 180000;
  const JSONP_URL_LIMIT = 6500;
  let seq = 0;
  const inflightReads = new Map();

  // Active-page-first scheduler.
  // - Current tab reads: latest queued read first, max 3 concurrent.
  // - Current tab writes: FIFO, max 1 concurrent per browser to preserve save order.
  // - Normal work: max 1 concurrent.
  // - Background sync/prefetch: single-flight and only when foreground is idle.
  // This prevents unrelated sync bursts from delaying the page/button the user is using.
  const taskState = {
    activeReads: 0,
    activeWrites: 0,
    normal: 0,
    background: 0,
    activeTab: '',
    lastInteractionAt: 0,
    lastInteractionTab: ''
  };
  const activeReadQueue = [];
  const activeWriteQueue = [];
  const normalQueue = [];
  const backgroundQueue = [];
  const MAX_ACTIVE_READS = 3;
  const MAX_ACTIVE_WRITES = 1;
  const MAX_NORMAL_REQUESTS = 1;
  const MAX_BACKGROUND_REQUESTS = 1;
  const MAX_TOTAL_REQUESTS = 5;
  const idleWaiters = [];
  const BACKGROUND_INTERACTION_GRACE_MS = 1400;
  const DIRECT_INTERACTION_PRIORITY_MS = 350;
  let backgroundWakeTimer = null;

  function getActiveTab_(){
    try {
      return String(taskState.activeTab || window.CES_ACTIVE_TAB || window.currentTab || (document.body && document.body.getAttribute('data-ces-active-tab')) || '').trim();
    } catch(ignore) { return String(taskState.activeTab || ''); }
  }

  function inferRequestModule_(fnName, options){
    options=options||{};
    if(options.module)return String(options.module);
    var fn=String(fnName||'');
    if(/^(?:cesStock_getDashboardData|sd_)/i.test(fn))return 'stock_dashboard';
    if(/^(?:cesStock_getInventoryData|si_)/i.test(fn)||/Accessory/i.test(fn))return 'inventory';
    if(/^(?:cesStock_(?:lookup|verifyCalibration|getLogs|scanCalPm|cfCalPm)|sc_)/i.test(fn))return 'check_stock';
    if(/^cesStock_/i.test(fn)||/Stock|Infusion/i.test(fn)){
      var stockTab=typeof getActiveTab_==='function'?String(getActiveTab_()||''):'';
      return /^(?:stock_dashboard|inventory|check_stock)$/.test(stockTab)?stockTab:'stock';
    }
    if(/Calendar/i.test(fn))return 'calendar';
    if(/CoreReadModel|AllData/i.test(fn))return 'core';
    if(/ManagementOverview/i.test(fn))return 'management_overview';
    if(/Yearly|JobDashboard/i.test(fn))return 'yearly';
    if(/Revenue/i.test(fn))return 'revenue';
    if(/Vehicle|CarBooking/i.test(fn))return 'car_booking';
    if(/VanBooking/i.test(fn))return 'van_booking';
    if(/Checkin/i.test(fn))return 'checkin';
    if(/TeamInformation/i.test(fn))return 'team_information';
    if(/TeamPlan/i.test(fn))return 'team_plan';
    if(/MonthlyReport/i.test(fn))return 'monthly_report';
    if(/ReportManage|RM/i.test(fn))return 'report_manage';
    if(/ServiceCSI/i.test(fn))return 'service';
    if(/ReportCSI/i.test(fn))return 'report';
    if(/Memo|WorkOrder/i.test(fn))return 'memo_workorder';
    if(/KPI/i.test(fn))return 'kpi';
    if(/User|Permission|Setting/i.test(fn))return 'setting';
    if(/Home|Portal|Startup/i.test(fn))return 'portal';
    return '';
  }

  function moduleMatchesActiveTab_(moduleName, activeTab){
    moduleName=String(moduleName||'');activeTab=String(activeTab||'');
    if(!moduleName||!activeTab)return false;
    if(moduleName==='stock')return /^(?:stock_dashboard|inventory|check_stock)$/.test(activeTab);
    if(moduleName==='core')return /^(?:portal|management_overview|yearly|calendar)$/.test(activeTab);
    if(moduleName==='car_booking')return activeTab==='car_booking';
    if(moduleName==='van_booking')return activeTab==='van_booking';
    return moduleName===activeTab;
  }

  function totalActive_(){return taskState.activeReads+taskState.activeWrites+taskState.normal+taskState.background;}
  function foregroundBusy_(){return taskState.activeReads+taskState.activeWrites+taskState.normal>0||activeReadQueue.length>0||activeWriteQueue.length>0||normalQueue.length>0;}
  function backgroundGraceRemaining_(){return Math.max(0,BACKGROUND_INTERACTION_GRACE_MS-(Date.now()-Number(taskState.lastInteractionAt||0)));}
  function scheduleBackgroundWake_(){var wait=backgroundGraceRemaining_();if(!backgroundQueue.length||wait<=0)return;clearTimeout(backgroundWakeTimer);backgroundWakeTimer=setTimeout(function(){backgroundWakeTimer=null;flushTaskQueue_();},wait+20);}

  function removeQueuedJob_(job){
    [activeReadQueue,activeWriteQueue,normalQueue,backgroundQueue].some(function(q){
      var i=q.indexOf(job);if(i<0)return false;q.splice(i,1);return true;
    });
  }

  function queueForLane_(lane,writeLike){
    if(lane==='active')return writeLike?activeWriteQueue:activeReadQueue;
    if(lane==='background')return backgroundQueue;
    return normalQueue;
  }

  function startJob_(job,counter){
    if(!job||job.state!=='queued')return;
    job.state='running';job.startedAt=Date.now();taskState[counter]+=1;
    Promise.resolve().then(job.factory).then(job.resolve,job.reject).finally(function(){
      taskState[counter]=Math.max(0,taskState[counter]-1);job.state='done';job.finishedAt=Date.now();
      flushTaskQueue_();notifyIdleWaiters_();
    });
  }

  function flushTaskQueue_(){
    var progressed=true;
    while(progressed&&totalActive_()<MAX_TOTAL_REQUESTS){
      progressed=false;
      if(activeWriteQueue.length&&taskState.activeWrites<MAX_ACTIVE_WRITES){startJob_(activeWriteQueue.shift(),'activeWrites');progressed=true;continue;}
      if(activeReadQueue.length&&taskState.activeReads<MAX_ACTIVE_READS){startJob_(activeReadQueue.pop(),'activeReads');progressed=true;continue;}
      if(!activeWriteQueue.length&&!activeReadQueue.length&&normalQueue.length&&taskState.normal<MAX_NORMAL_REQUESTS){startJob_(normalQueue.shift(),'normal');progressed=true;continue;}
      if(!foregroundBusy_()&&taskState.background<MAX_BACKGROUND_REQUESTS&&backgroundQueue.length&&backgroundGraceRemaining_()===0){startJob_(backgroundQueue.shift(),'background');progressed=true;continue;}
      if(backgroundQueue.length&&backgroundGraceRemaining_()>0)scheduleBackgroundWake_();
    }
    notifyIdleWaiters_();
  }

  function notifyIdleWaiters_(){
    if(foregroundBusy_())return;
    while(idleWaiters.length){
      var item=idleWaiters.shift();clearTimeout(item.timer);setTimeout(item.callback,0);
    }
  }

  function resolveLane_(fnName,options,writeLike){
    options=options||{};
    var explicit=String(options.priority||'').toLowerCase();
    if(options.background===true||explicit==='background')return 'background';
    if(explicit==='user'||explicit==='active'||options.userAction===true)return 'active';
    if(explicit==='normal')return 'normal';
    var moduleName=inferRequestModule_(fnName,options),activeTab=getActiveTab_();
    if(moduleMatchesActiveTab_(moduleName,activeTab))return 'active';
    // A server call fired synchronously by the user's current click/change is
    // interactive even when its backend function belongs to a shared module
    // (for example Calendar sync launched from Job Dashboard).  Keep this
    // window intentionally short; explicit background work was returned above
    // and can never be promoted by this heuristic.
    var directAge=Date.now()-Number(taskState.lastInteractionAt||0);
    if(directAge>=0&&directAge<=DIRECT_INTERACTION_PRIORITY_MS&&String(taskState.lastInteractionTab||'')===String(activeTab||''))return 'active';
    return 'normal';
  }

  // Create a scheduled Promise and keep its queued job available for dedupe
  // promotion when the same read becomes necessary on the active page.
  function createScheduledRequest_(factory,meta){
    var jobRef=null;
    var promise=new Promise(function(resolve,reject){
      jobRef={factory:factory,resolve:resolve,reject:reject,lane:meta.lane||'normal',writeLike:!!meta.writeLike,module:meta.module||'',fnName:meta.fnName||'',state:'queued',queuedAt:Date.now()};
      queueForLane_(jobRef.lane,jobRef.writeLike).push(jobRef);
      flushTaskQueue_();
    });
    promise.__cesJob=jobRef;
    return promise;
  }

  function promoteQueuedJob_(job,targetLane){
    if(!job||job.state!=='queued'||job.lane===targetLane)return;
    if(targetLane!=='active')return;
    removeQueuedJob_(job);job.lane='active';queueForLane_('active',job.writeLike).push(job);flushTaskQueue_();
  }

  function setActiveTab_(tab){
    tab=String(tab||'').trim();if(!tab)return;
    taskState.activeTab=tab;
    // Promote queued reads for the page the user just opened and demote stale
    // queued reads from pages no longer visible. Writes are never reordered.
    normalQueue.slice().forEach(function(job){if(!job.writeLike&&moduleMatchesActiveTab_(job.module,tab)){removeQueuedJob_(job);job.lane='active';activeReadQueue.push(job);}});
    activeReadQueue.slice().forEach(function(job){if(job.module&&!moduleMatchesActiveTab_(job.module,tab)){removeQueuedJob_(job);job.lane='background';backgroundQueue.push(job);}});
    flushTaskQueue_();
  }

  function noteInteraction_(tab){taskState.lastInteractionAt=Date.now();taskState.lastInteractionTab=String(tab||getActiveTab_()||'');if(tab)setActiveTab_(tab);if(backgroundQueue.length)scheduleBackgroundWake_();}

  try{['click','submit','change'].forEach(function(evt){document.addEventListener(evt,function(){noteInteraction_(getActiveTab_());},true);});}catch(ignore){}

  window.CES_TASK_PRIORITY={
    setActiveTab:setActiveTab_,
    noteInteraction:noteInteraction_,
    whenIdle:function(callback,options){
      options=options||{};if(typeof callback!=='function')return;
      if(!foregroundBusy_()){setTimeout(callback,0);return;}
      var item={callback:callback,timer:null};
      item.timer=setTimeout(function(){var i=idleWaiters.indexOf(item);if(i>=0)idleWaiters.splice(i,1);callback();},Number(options.timeout||2500));
      idleWaiters.push(item);
    },
    stats:function(){return{activeTab:getActiveTab_(),activeReads:taskState.activeReads,activeWrites:taskState.activeWrites,normal:taskState.normal,background:taskState.background,activeReadQueued:activeReadQueue.length,activeWriteQueued:activeWriteQueue.length,normalQueued:normalQueue.length,backgroundQueued:backgroundQueue.length,totalActive:totalActive_()};},
    version:'ACTIVE-FIRST-STABLE'
  };
  let writeLoadingCount = 0;
  let writeLoadingTimer = null;
  let loadingShowDelayTimer = null;
  let loadingWatchdogTimer = null;

  // V24.7 — routine API activity is non-blocking.
  // No modal, no grey backdrop, no page lock. CES_UI renders the thin top
  // progress bar + header Syncing status and each feature may still disable
  // its own submit button when duplicate submission would be unsafe.
  function ensureWriteLoadingUi() { return null; }

  function shouldShowWriteLoading(fnName, options) {
    if (options && (options.silentLoading === true || options.globalLoading === false)) return false;
    return !/^(?:recordUserLastUsage|recordPortalUsage|recordPortalEventView|logCesAiQuestion)$/i.test(String(fnName || ''));
  }

  function beginWriteLoading(fnName, options) {
    if (!shouldShowWriteLoading(fnName, options)) return false;
    writeLoadingCount += 1;
    var label = (options && options.loadingLabel) || (/upload/i.test(fnName) ? 'Uploading file…' : /return/i.test(fnName) ? 'Saving return…' : /approve|reject/i.test(fnName) ? 'Updating approval…' : /^(?:get|load|fetch|read)/i.test(fnName) ? 'Loading data…' : 'Saving data…');
    var uiToken = null;
    try {
      if (window.CES_UI && typeof window.CES_UI.begin === 'function') {
        uiToken = window.CES_UI.begin({ message:label, owner:'gas-api', mode:'global' });
      } else {
        var status = document.getElementById('lastUpdateText');
        if (status) status.innerHTML = '<i class="fas fa-circle-notch fa-spin text-[8px]"></i> Syncing…';
      }
    } catch(ignore) {}
    return { active:true, uiToken:uiToken };
  }

  function endWriteLoading(ticket) {
    if (!ticket) return;
    writeLoadingCount = Math.max(0, writeLoadingCount - 1);
    try { if (ticket.uiToken && window.CES_UI && typeof window.CES_UI.end === 'function') window.CES_UI.end(ticket.uiToken); } catch(ignore) {}
    if (writeLoadingCount === 0) {
      try {
        var legacy = document.getElementById('ces-global-write-loading-v243');
        if (legacy) legacy.classList.remove('show');
      } catch(ignore2) {}
    }
  }

  function getGasApiUrl() {
    if (!window.CES_CONFIG || !window.CES_CONFIG.GAS_API_URL) {
      throw new Error('Missing window.CES_CONFIG.GAS_API_URL in js/config.js');
    }
    const url = String(window.CES_CONFIG.GAS_API_URL || '').trim();
    if (!url || url.includes('PASTE_')) {
      throw new Error('GAS_API_URL is not configured correctly in js/config.js');
    }
    return url;
  }

  function nextId(prefix) {
    seq += 1;
    return '__CES_' + prefix + '_' + Date.now() + '_' + seq + '__';
  }

  function safeStringify(value) {
    try {
      return JSON.stringify(value == null ? [] : value);
    } catch (err) {
      console.error('[CES API] JSON stringify error:', err);
      return '[]';
    }
  }

  function normalizeError(err) {
    if (!err) return { message: 'Unknown API error', stack: '' };
    if (typeof err === 'string') return { message: err, stack: '' };
    return { message: err.message || String(err), stack: err.stack || '', raw: err };
  }

  function unwrapApiResponse(raw, options) {
    options = options || {};
    if (options.raw === true) return raw;
    if (!raw) throw new Error('Empty API response');
    if (raw.success === false) throw new Error(raw.message || raw.error || 'Apps Script API returned success:false');
    if (raw.ok === false) throw new Error(raw.message || raw.error || 'Apps Script API returned ok:false');

    // Expected API bridge wrapper:
    // { success:true, data:{ functionName, resolvedFunctionName, elapsedMs, result } }
    if (raw.data && typeof raw.data === 'object' && Object.prototype.hasOwnProperty.call(raw.data, 'result')) {
      return raw.data.result;
    }
    if (Object.prototype.hasOwnProperty.call(raw, 'result')) return raw.result;
    if (Object.prototype.hasOwnProperty.call(raw, 'data')) return raw.data;
    return raw;
  }

  function buildJsonpUrl(fnName, args, callbackName) {
    const baseUrl = getGasApiUrl();
    const params = new URLSearchParams();
    params.set('api', '1');
    params.set('action', fnName === 'health' ? 'health' : 'call');
    if (fnName !== 'health') {
      params.set('fn', fnName);
      params.set('functionName', fnName);
      params.set('args', safeStringify(args || []));
      // Compatibility for newer Apps Script routers that read one payload object.
      params.set('payload', safeStringify({ fn: fnName, functionName: fnName, args: args || [] }));
    }
    params.set('callback', callbackName);
    params.set('_ts', String(Date.now()));
    return baseUrl + (baseUrl.includes('?') ? '&' : '?') + params.toString();
  }

  function jsonpByUrl(url, options) {
    options = options || {};
    return new Promise(function (resolve, reject) {
      let timeoutId = null;
      const script = document.createElement('script');
      const match = url.match(/[?&]callback=([^&]+)/);
      const callbackName = match ? decodeURIComponent(match[1]) : '';
      if (!callbackName) {
        reject(normalizeError(new Error('Missing JSONP callback name')));
        return;
      }

      function cleanup() {
        if (timeoutId) clearTimeout(timeoutId);
        try { delete window[callbackName]; } catch (e) { window[callbackName] = undefined; }
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      window[callbackName] = function (response) {
        cleanup();
        try { resolve(unwrapApiResponse(response, options)); }
        catch (err) { reject(normalizeError(err)); }
      };

      script.onerror = function () {
        cleanup();
        reject(normalizeError(new Error('Cannot connect to Apps Script API')));
      };

      timeoutId = setTimeout(function () {
        cleanup();
        reject(normalizeError(new Error('Apps Script API timeout')));
      }, options.timeoutMs || JSONP_TIMEOUT_MS);

      script.async = true;
      script.src = url;
      document.head.appendChild(script);
    });
  }

  function jsonpCall(fnName, args, options) {
    options = options || {};
    function attempt(n) {
      const callbackName = nextId('JSONP_CB');
      const url = buildJsonpUrl(fnName, args || [], callbackName);
      if (window.CES_CONFIG && window.CES_CONFIG.DEBUG) console.log('[CES API] JSONP', fnName, args || [], 'attempt', n);
      return jsonpByUrl(url, options).catch(function (err) {
        const msg = String(err && err.message || err || '');
        if (n < 2 && /Cannot connect to Apps Script API|Apps Script API timeout/i.test(msg)) {
          return new Promise(function(resolve){setTimeout(resolve,350);}).then(function(){return attempt(n+1);});
        }
        throw err;
      });
    }
    return attempt(1);
  }

  function iframePostCall(fnName, args, options) {
    options = options || {};
    return new Promise(function (resolve, reject) {
      const callbackName = nextId('POST_CB');
      const operationId = nextId('ASYNC_OP');
      let timeoutId = null;
      let pollTimer = null;
      let settled = false;
      let pollBusy = false;
      let fallbackFrame = null;
      let fallbackForm = null;

      function cleanup() {
        if (timeoutId) clearTimeout(timeoutId);
        if (pollTimer) clearTimeout(pollTimer);
        window.removeEventListener('message', onMessage);
        setTimeout(function () {
          if (fallbackForm && fallbackForm.parentNode) fallbackForm.parentNode.removeChild(fallbackForm);
          if (fallbackFrame && fallbackFrame.parentNode) fallbackFrame.parentNode.removeChild(fallbackFrame);
        }, 50);
      }

      function finishOk(response) {
        if (settled) return;
        settled = true;
        cleanup();
        try { resolve(unwrapApiResponse(response, options)); }
        catch (err) { reject(normalizeError(err)); }
      }

      function finishError(error) {
        if (settled) return;
        settled = true;
        cleanup();
        reject(normalizeError(error));
      }

      function onMessage(event) {
        const msg = event && event.data;
        if (!msg || msg.type !== 'CES_API_IFRAME_RESPONSE' || msg.callback !== callbackName) return;
        finishOk(msg.payload);
      }

      async function pollOperation() {
        if (settled || pollBusy) return;
        pollBusy = true;
        try {
          const status = await jsonpCall('getApiAsyncOperationStatus', [operationId], { timeoutMs: 30000 });
          if (status && status.done && status.response) finishOk(status.response);
        } catch (err) {
          if (window.CES_CONFIG && window.CES_CONFIG.DEBUG) console.warn('[CES API] async poll retry', fnName, err);
        } finally {
          pollBusy = false;
        }
      }

      const fields = {
        api: '1',
        action: 'call',
        fn: fnName,
        functionName: fnName,
        args: safeStringify(args || []),
        callback: callbackName,
        transport: 'iframe',
        operationId: operationId,
        _ts: String(Date.now())
      };

      function submitIframeFallback() {
        if (settled) return;
        const frameName = callbackName + '_frame';
        fallbackFrame = document.createElement('iframe');
        fallbackFrame.name = frameName;
        fallbackFrame.style.display = 'none';
        fallbackFrame.setAttribute('aria-hidden', 'true');
        document.body.appendChild(fallbackFrame);

        fallbackForm = document.createElement('form');
        fallbackForm.method = 'POST';
        fallbackForm.action = getGasApiUrl();
        fallbackForm.target = frameName;
        fallbackForm.style.display = 'none';
        fallbackForm.acceptCharset = 'UTF-8';
        Object.keys(fields).forEach(function (key) {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = fields[key];
          fallbackForm.appendChild(input);
        });
        document.body.appendChild(fallbackForm);
        fallbackForm.submit();
      }

      timeoutId = setTimeout(function () {
        finishError(new Error('Apps Script API timeout: ' + fnName + '. The saved data can be checked with Refresh Data.'));
      }, options.timeoutMs || IFRAME_TIMEOUT_MS);

      window.addEventListener('message', onMessage);
      const pollStartedAt = Date.now();
      function schedulePoll(delay) {
        if (settled) return;
        pollTimer = setTimeout(async function () {
          await pollOperation();
          if (settled) return;
          const elapsed = Date.now() - pollStartedAt;
          schedulePoll(elapsed < 12000 ? 650 : (elapsed < 60000 ? 1100 : 1800));
        }, delay);
      }
      schedulePoll(300);

      if (window.CES_CONFIG && window.CES_CONFIG.DEBUG) console.log('[CES API] NO-CORS POST + POLL', fnName, operationId);

      // A no-cors form POST is substantially more reliable than rendering the
      // Apps Script response inside a third-party iframe. The response is opaque;
      // the result is obtained from the JSONP status endpoint above.
      if (typeof fetch === 'function') {
        fetch(getGasApiUrl(), {
          method: 'POST',
          mode: 'no-cors',
          cache: 'no-store',
          credentials: 'include',
          redirect: 'follow',
          body: new URLSearchParams(fields)
        }).catch(function (err) {
          if (window.CES_CONFIG && window.CES_CONFIG.DEBUG) console.warn('[CES API] fetch POST fallback to iframe', err);
          submitIframeFallback();
        });
      } else {
        submitIframeFallback();
      }
    });
  }

  function isWriteLikeFunction(fnName) {
    return /(save|create|update|delete|clear|sync|submit|record|process|send|upload|import|bulk|approve|reject|checkout|return|complete|extend|restock|issue|adjust|mark|edit|link|write)/i.test(String(fnName || ''));
  }

  function shouldUseIframe(fnName, args, options) {
    if (options && options.transport === 'jsonp') return false;
    if (options && options.transport === 'iframe') return true;

    const testUrl = buildJsonpUrl(fnName, args || [], 'x');

    // V23.8: LINE ID tokens are credentials. Never put them in a JSONP/GET URL,
    // browser history, proxy log or referrer. Force POST + async polling.
    if (/^(?:verifyLineIdToken|checkUserByLineToken|updateStaffLineDataByToken)$/i.test(String(fnName || ''))) {
      return true;
    }

    // Revenue save payloads are small and previously could hang on hidden iframe POST
    // in GitHub Pages / LIFF. Use JSONP when URL length is safe.
    if (/^(saveRevenueData|saveRevenueTargetData|saveBulkRevenueData)$/i.test(String(fnName || '')) && testUrl.length <= JSONP_URL_LIMIT) {
      return false;
    }


    // Inventory module calls are small but write-like names normally force hidden iframe POST.
    // On GitHub Pages / LIFF, iframe POST can hang; use JSONP when URL length is safe.
    if (/^(?:si_(checkoutCart|submitMixedCheckout|editEquipment|markEquipmentBroken|deleteEquipment|extendRental|returnEquipment|restockAccessory|issueAccessory|adjustAccessory|updateAccessoryMinStock|updateAccessoryMinStockBatch|updateAccessoryCheckResult|updateAccessoryCheckResultBatch|approveAccessoryRequestFromWeb|rejectAccessoryRequestFromWeb)|cesStock_(cfCalPm|checkout|checkoutBatch|return|markBroken|markMissing|recover|editEquipment|extendRental|extendRentalBatch|returnBatch))$/i.test(String(fnName || '')) && testUrl.length <= JSONP_URL_LIMIT) {
      return false;
    }

    // Small writes are safe through JSONP and avoid third-party POST/frame
    // restrictions. File/base64 payloads and large requests use POST + polling.
    const alwaysPost = /^(upload|syncCalendar|processRM|saveMultipleWeeklyReports)/i.test(String(fnName || ''));
    if (isWriteLikeFunction(fnName)) {
      if (!alwaysPost && testUrl.length <= 5800) return false;
      return true;
    }
    return testUrl.length > JSONP_URL_LIMIT;
  }

  function callFunction(fnName, args, options) {
    options = options || {};
    args = Array.isArray(args) ? args : [];
    const writeLike = isWriteLikeFunction(fnName);
    const schedulerWriteLike = writeLike && !/^(?:syncCalendarToSheet|syncCalendarDashboard|fullSyncCalendar2025_2026)$/i.test(String(fnName||''));
    const transport = shouldUseIframe(fnName, args, options) ? 'iframe' : 'jsonp';
    const moduleName = inferRequestModule_(fnName, options);
    const lane = resolveLane_(fnName, options, writeLike);
    const key = !writeLike && options.dedupe !== false
      ? String(fnName) + '|' + safeStringify(args) + '|' + transport
      : '';

    if (key && inflightReads.has(key)) {
      const existing = inflightReads.get(key);
      if (lane === 'active' && existing && existing.job) promoteQueuedJob_(existing.job, 'active');
      return existing && existing.promise ? existing.promise : existing;
    }

    // Background sync is intentionally silent in the global header. The active
    // page/function owns visible loading feedback and always receives the next slot.
    const effectiveOptions = Object.assign({}, options);
    if (lane === 'background' && typeof effectiveOptions.silentLoading === 'undefined') effectiveOptions.silentLoading = true;
    const requestFactory = function(){
      const loadingTicket = beginWriteLoading(fnName, Object.assign({}, effectiveOptions, { loadingLabel:(effectiveOptions&&effectiveOptions.loadingLabel)||(writeLike?undefined:'Loading data…') }));
      const actual = transport === 'iframe' ? iframePostCall(fnName, args, effectiveOptions) : jsonpCall(fnName, args, effectiveOptions);
      return Promise.resolve(actual).finally(function(){ endWriteLoading(loadingTicket); });
    };
    const wrapped = createScheduledRequest_(requestFactory, {lane:lane,writeLike:schedulerWriteLike,module:moduleName,fnName:fnName});
    if (!key) return wrapped;

    const tracked = wrapped.finally(function () { inflightReads.delete(key); });
    inflightReads.set(key, {promise:tracked,job:wrapped.__cesJob});
    return tracked;
  }


  // Chunk large Excel uploads into safe JSONP requests.
  // This avoids hidden-iframe POST timeouts on GitHub Pages / LIFF while keeping each URL below browser/Apps Script limits.
  function makeRowChunksForJsonp(fnName, rows, meta, options) {
    options = options || {};
    rows = Array.isArray(rows) ? rows : [];
    const maxUrlLength = options.maxUrlLength || 5800;
    const chunks = [];
    let current = [];

    function argsFor(batch) {
      if (/^saveServiceDataArray$/i.test(String(fnName || ''))) return [batch, meta || {}];
      if (typeof meta !== 'undefined' && meta !== null && /^save.*Service/i.test(String(fnName || ''))) return [batch, meta || {}];
      return [batch];
    }

    function urlLen(batch) {
      try { return buildJsonpUrl(fnName, argsFor(batch), 'x').length; }
      catch (e) { return 999999; }
    }

    rows.forEach(function (row) {
      const next = current.concat([row]);
      if (current.length && urlLen(next) > maxUrlLength) {
        chunks.push(current);
        current = [row];
      } else {
        current = next;
      }
    });
    if (current.length) chunks.push(current);
    return chunks;
  }

  function aggregateChunkResults(fnName, chunks, results) {
    const out = { success: true, functionName: fnName, chunks: chunks.length, rowsSent: chunks.reduce(function (a, c) { return a + c.length; }, 0), total: 0, main: 0, tes: 0, results: results || [] };
    (results || []).forEach(function (r) {
      if (typeof r === 'number') {
        out.total += r;
      } else if (r && typeof r === 'object') {
        out.total += Number(r.total || r.added || r.updated || r.count || 0) || 0;
        out.main += Number(r.main || 0) || 0;
        out.tes += Number(r.tes || 0) || 0;
        if (r.pdfUrl) out.pdfUrl = r.pdfUrl;
        if (r.pdfWarning) out.pdfWarning = r.pdfWarning;
      }
    });
    return out;
  }

  async function chunkedRowsCall(fnName, rows, meta, options) {
    options = options || {};
    rows = Array.isArray(rows) ? rows : [];
    if (!rows.length) return { success: true, functionName: fnName, chunks: 0, rowsSent: 0, total: 0, main: 0, tes: 0, results: [] };

    const chunks = makeRowChunksForJsonp(fnName, rows, meta, options);
    const results = [];
    const uploadId = (meta && meta.uploadId) || nextId('ROW_UPLOAD');
    for (let i = 0; i < chunks.length; i++) {
      if (typeof options.onProgress === 'function') {
        try { options.onProgress(i + 1, chunks.length, chunks[i].length); } catch (e) {}
      }
      const chunkMeta = Object.assign({}, meta || {}, {
        uploadId: uploadId,
        chunkIndex: i + 1,
        chunkTotal: chunks.length,
        totalRows: rows.length,
        finalChunk: i === chunks.length - 1
      });
      const args = /^saveServiceDataArray$/i.test(String(fnName || '')) ? [chunks[i], chunkMeta] : [chunks[i]];
      const res = await callFunction(fnName, args, { transport: 'jsonp', timeoutMs: options.timeoutMs || 120000 });
      results.push(res);
    }
    return aggregateChunkResults(fnName, chunks, results);
  }

  window.CES_API = {
    callFunction: callFunction,
    call: function (fnName, payload, options) {
      const args = Array.isArray(payload) ? payload : (typeof payload === 'undefined' ? [] : [payload]);
      return callFunction(fnName, args, options || {});
    },
    raw: function (fnName, args, options) {
      options = options || {};
      options.raw = true;
      return callFunction(fnName, Array.isArray(args) ? args : [], options);
    },
    health: function () { return jsonpCall('health', [], { raw: true }); },
    login: function (employeeId) { return callFunction('checkLogin', [employeeId], {}); },
    getAllData: function () { return callFunction('getAllData', [], {}); },
    chunkedRows: function (fnName, rows, meta, options) { return chunkedRowsCall(fnName, rows, meta || {}, options || {}); }
  };

  function createRunner(successHandler, failureHandler, userObject) {
    return new Proxy({}, {
      get: function (target, prop) {
        if (prop === 'withSuccessHandler') {
          return function (handler) { return createRunner(handler, failureHandler, userObject); };
        }
        if (prop === 'withFailureHandler') {
          return function (handler) { return createRunner(successHandler, handler, userObject); };
        }
        if (prop === 'withUserObject') {
          return function (obj) { return createRunner(successHandler, failureHandler, obj); };
        }
        if (prop === 'then' || prop === 'catch' || prop === 'finally') return undefined;

        return function () {
          const fnName = String(prop);
          const args = Array.prototype.slice.call(arguments);
          callFunction(fnName, args, {})
            .then(function (result) {
              if (typeof successHandler === 'function') {
                if (typeof userObject !== 'undefined') successHandler(result, userObject);
                else successHandler(result);
              }
            })
            .catch(function (err) {
              const normalized = normalizeError(err);
              if (typeof failureHandler === 'function') {
                if (typeof userObject !== 'undefined') failureHandler(normalized, userObject);
                else failureHandler(normalized);
              } else {
                console.error('[google.script.run polyfill]', fnName, normalized);
              }
            });
          return createRunner(null, null, undefined);
        };
      }
    });
  }

  window.google = window.google || {};
  window.google.script = window.google.script || {};
  window.google.script.run = createRunner(null, null, undefined);

  window.CES_API_TEST = {
    health: function () { return window.CES_API.health(); },
    checkLogin: function (employeeId) { return window.CES_API.login(employeeId || '51032'); },
    getAllData: function () { return window.CES_API.getAllData(); },
    call: function (fnName, args, options) { return window.CES_API.callFunction(fnName, Array.isArray(args) ? args : [], options || {}); },
    runBasicTest: async function (employeeId) {
      console.group('CES API Basic Test');
      try { console.log('Health OK:', await window.CES_API_TEST.health()); } catch (e) { console.error('Health FAIL:', e); }
      try { console.log('Login OK:', await window.CES_API_TEST.checkLogin(employeeId || '51032')); } catch (e) { console.error('Login FAIL:', e); }
      try {
        const allData = await window.CES_API_TEST.getAllData();
        console.log('getAllData OK:', allData);
        console.log('config:', allData && allData.config);
        console.log('yearlyStats:', allData && allData.yearlyStats ? allData.yearlyStats.length : 0);
        console.log('calSummary:', allData && allData.calSummary ? allData.calSummary.length : 0);
      } catch (e) { console.error('getAllData FAIL:', e); }
      console.groupEnd();
    }
  };


  window.CES_API_RECHECK_GAS_POLYFILL = function () {
    return window.CES_API.health()
      .then(function (res) { console.log('[CES_API_RECHECK_GAS_POLYFILL] connected', res); return { ok: true, result: res }; })
      .catch(function (err) { console.error('[CES_API_RECHECK_GAS_POLYFILL] failed', err); return { ok: false, error: err && err.message ? err.message : String(err) }; });
  };


  // V24.5 UI watchdog: clear orphan SweetAlert backdrops that can leave the
  // application as a grey, non-interactive screen after a failed modal render.
  // A real SweetAlert popup is never touched.
  setInterval(function () {
    try {
      const containers = document.querySelectorAll('.swal2-container');
      containers.forEach(function (container) {
        const popup = container.querySelector('.swal2-popup');
        const visiblePopup = popup && getComputedStyle(popup).display !== 'none' && popup.offsetParent !== null;
        if (!visiblePopup && container.parentNode) container.parentNode.removeChild(container);
      });
      if (!document.querySelector('.swal2-container .swal2-popup')) {
        document.body && document.body.classList.remove('swal2-shown','swal2-height-auto');
        document.documentElement && document.documentElement.classList.remove('swal2-shown','swal2-height-auto');
      }
    } catch (ignore) {}
  }, 2500);

  console.log('[CES Hub] gas-polyfill.js loaded: active-page-first scheduler + adaptive transport');
})();
