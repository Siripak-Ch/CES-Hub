/* ============================================================
   CES Hub V31 — Report CSI Fast Upload
   - One iframe POST for the complete update (instead of 1-row JSONP batches)
   - Client-side diff sends only new/changed Response IDs when current data exists
   - Immediate local refresh; server refresh continues in background
   - Falls back to idempotent JSONP chunks only if iframe POST fails
============================================================ */
(function (window, document) {
  'use strict';
  if (window.__CES_REPORT_FAST_V31__) return;
  window.__CES_REPORT_FAST_V31__ = true;

  var BLUE = '#003DA5';
  var CACHE_KEY = 'CES_REPORT_CSI_CACHE_V31';
  var active = false;
  var watchdog = null;

  function byId(id) { return document.getElementById(id); }
  function txt(value) { return String(value == null ? '' : value).trim(); }
  function errText(err) { return err && err.message ? err.message : String(err || 'Unknown error'); }

  function show(label) {
    var overlay = byId('loadingOverlay');
    var labelEl = byId('loadingText');
    if (labelEl) labelEl.textContent = label || 'Updating Report CSI...';
    if (overlay) {
      overlay.style.removeProperty('display');
      overlay.classList.remove('hidden');
    }
    clearTimeout(watchdog);
    watchdog = setTimeout(hide, 125000);
  }

  function hide() {
    clearTimeout(watchdog);
    watchdog = null;
    var overlay = byId('loadingOverlay');
    if (!overlay) return;
    overlay.classList.add('hidden');
    overlay.style.setProperty('display', 'none', 'important');
    setTimeout(function () { overlay.style.removeProperty('display'); }, 120);
  }

  function timeout(promise, ms, label) {
    var timer;
    return Promise.race([
      Promise.resolve(promise),
      new Promise(function (_, reject) {
        timer = setTimeout(function () { reject(new Error((label || 'Request') + ' timed out')); }, ms);
      })
    ]).finally(function () { clearTimeout(timer); });
  }

  function callApi(name, args, options) {
    if (!window.CES_API || typeof window.CES_API.callFunction !== 'function') {
      return Promise.reject(new Error('CES_API is unavailable'));
    }
    return window.CES_API.callFunction(name, Array.isArray(args) ? args : [], options || {});
  }

  function normalize(value) {
    return txt(value).toLowerCase().replace(/\s+/g, ' ');
  }

  function normalizeHeader(value) {
    return txt(value).toLowerCase()
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\u00a0/g, ' ')
      .replace(/[\r\n]+/g, ' ')
      .replace(/[._:()\[\]{}\-–—\/\\]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function findHeader(headers, aliases) {
    var items = headers.map(function (raw) { return { raw:raw, key:normalizeHeader(raw) }; });
    var keys = aliases.map(normalizeHeader);
    var exact = items.find(function (item) { return keys.indexOf(item.key) >= 0; });
    if (exact) return exact.raw;
    var partial = items.find(function (item) {
      return keys.some(function (key) { return key && (item.key.indexOf(key) >= 0 || key.indexOf(item.key) >= 0); });
    });
    return partial ? partial.raw : '';
  }

  function mapWorkbookRows(rows) {
    if (!rows.length) return [];
    var headers = Object.keys(rows[0]);
    var key = {
      id:findHeader(headers, ['Response ID','ResponseID','ลำดับ','ID','เลขที่ตอบกลับ']),
      timestamp:findHeader(headers, ['Timestamp','วันที่','Date','Response Date']),
      finished:findHeader(headers, ['Finished','สถานะ','Status']),
      customer:findHeader(headers, ['ชื่อลูกค้า','Customer','Customer Name','1']),
      team:findHeader(headers, ['Service Team','Service','ทีม','Team','2']),
      complete:findHeader(headers, ['IsComplete','ครบถ้วน','Complete','3']),
      issue:findHeader(headers, ['Issue','ปัญหา','Complaint','4']),
      onTime:findHeader(headers, ['IsOnTime','ภายใน 14 วัน','On Time','5']),
      lateDate:findHeader(headers, ['LateDate','เกินกำหนด','Overdue','Late','6']),
      satisfaction:findHeader(headers, ['Satisfaction','พึงพอใจ','Score','7']),
      comment:findHeader(headers, ['Comment','ข้อเสนอแนะ','Feedback','8'])
    };
    if (!key.id || !key.customer) throw new Error('ไม่พบคอลัมน์ Response ID หรือ Customer ในไฟล์ Excel');
    var seen = Object.create(null);
    return rows.map(function (row) {
      var responseId = txt(row[key.id]);
      var customer = txt(row[key.customer]);
      if (!responseId || !customer || /^(aa|test|ทดสอบ)/i.test(customer) || seen[responseId]) return null;
      seen[responseId] = true;
      return [
        responseId,
        key.timestamp ? row[key.timestamp] : '',
        key.finished ? row[key.finished] : '',
        customer,
        normalizeTeam(key.team ? row[key.team] : ''),
        key.complete ? row[key.complete] : '',
        key.issue ? row[key.issue] : '',
        key.onTime ? row[key.onTime] : '',
        key.lateDate ? row[key.lateDate] : '',
        key.satisfaction ? row[key.satisfaction] : '',
        key.comment ? row[key.comment] : ''
      ];
    }).filter(Boolean);
  }

  function ensureXlsx() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (typeof window.CES_loadLib !== 'function') return Promise.reject(new Error('XLSX library loader is unavailable'));
    return timeout(
      window.CES_loadLib('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'),
      30000,
      'XLSX library load'
    ).then(function () {
      if (!window.XLSX) throw new Error('XLSX library did not load');
      return window.XLSX;
    });
  }

  function parseWorkbookV31(file) {
    return ensureXlsx().then(function () {
      return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onerror = function () { reject(new Error('Cannot read selected Excel file')); };
        reader.onload = function (event) {
          try {
            var workbook = XLSX.read(new Uint8Array(event.target.result), { type:'array', cellDates:true });
            var sheetName = workbook.SheetNames[0];
            if (!sheetName) throw new Error('Excel file has no worksheet');
            var rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval:'', raw:false });
            var mapped = mapWorkbookRows(rawRows);
            if (!mapped.length) throw new Error('ไม่พบข้อมูล Report CSI ที่นำเข้าได้');
            resolve({ rows:mapped, sourceRows:rawRows.length, skipped:rawRows.length - mapped.length });
          } catch (err) { reject(err); }
        };
        reader.readAsArrayBuffer(file);
      });
    });
  }

  function normalizeTeam(value) {
    var upper = txt(value).toUpperCase();
    if (/MED|MEDICAL/.test(upper)) return 'MED';
    if (/LAB|TESTING|LABORATORY/.test(upper)) return 'LAB';
    if (/EHS|ENV|ENVIRONMENT/.test(upper)) return 'EHS';
    if (/TES|TECHNICAL/.test(upper)) return 'TES';
    return txt(value) || 'Other';
  }

  function rowBusinessKey(row) {
    // Timestamp is intentionally excluded to avoid false differences caused by Excel/display formatting.
    return [row[0], row[2], row[3], normalizeTeam(row[4]), row[5], row[6], row[7], row[8], row[9], row[10]]
      .map(normalize).join('\u001f');
  }

  function objectBusinessKey(item) {
    item = item || {};
    return [item.id, item.finished, item.customer, normalizeTeam(item.team), item.isComplete,
      item.issue, item.isOnTime, item.lateDate, item.satisfaction, item.comment]
      .map(normalize).join('\u001f');
  }

  function currentReportRows() {
    try {
      if (typeof reportRawData !== 'undefined' && Array.isArray(reportRawData)) return reportRawData;
    } catch (_) {}
    try {
      var cache = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      return cache && cache.data && Array.isArray(cache.data.report) ? cache.data.report : [];
    } catch (_) { return []; }
  }

  function selectChangedRows(rows) {
    var existing = currentReportRows();
    if (!existing.length) return { rows:rows.slice(), unchangedClient:0 };
    var map = Object.create(null);
    existing.forEach(function (item) {
      var id = txt(item && item.id);
      if (id) map[id] = objectBusinessKey(item);
    });
    var changed = [];
    var unchanged = 0;
    rows.forEach(function (row) {
      var id = txt(row && row[0]);
      if (id && map[id] === rowBusinessKey(row)) unchanged++;
      else changed.push(row);
    });
    return { rows:changed, unchangedClient:unchanged };
  }

  function rowToObject(row) {
    var rawDate = row[1] || '';
    var date = rawDate instanceof Date ? rawDate : new Date(rawDate);
    var month = '', year = '';
    if (!isNaN(date.getTime())) {
      month = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][date.getMonth()];
      year = String(date.getFullYear());
    }
    return {
      id:txt(row[0]), timestamp:rawDate, finished:row[2], customer:row[3], team:normalizeTeam(row[4]),
      isComplete:row[5], issue:row[6], isOnTime:row[7], lateDate:row[8], satisfaction:row[9],
      comment:row[10], month:month, year:year
    };
  }

  function applyLocalRows(rows) {
    var current = currentReportRows().slice();
    var byResponse = Object.create(null);
    current.forEach(function (item, index) { if (item && txt(item.id)) byResponse[txt(item.id)] = index; });
    rows.forEach(function (row) {
      var obj = rowToObject(row);
      if (!obj.id) return;
      if (Object.prototype.hasOwnProperty.call(byResponse, obj.id)) current[byResponse[obj.id]] = obj;
      else { byResponse[obj.id] = current.length; current.push(obj); }
    });
    var tickets = [];
    try { if (typeof reportTickets !== 'undefined' && Array.isArray(reportTickets)) tickets = reportTickets; } catch (_) {}
    try {
      if (typeof initReport === 'function') initReport(current, tickets);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts:Date.now(), data:{ report:current, tickets:tickets } }));
    } catch (err) { console.warn('[Report CSI V31] local refresh skipped', err); }
  }

  async function uploadSingleRequest(rows) {
    var label = byId('loadingText');
    if (label) label.textContent = 'Updating Report CSI... ' + rows.length + ' rows in one request';
    return timeout(
      callApi('saveReportDataArray', [rows], { transport:'iframe', timeoutMs:115000 }),
      120000,
      'Report CSI fast upload'
    );
  }

  async function fallbackChunks(rows) {
    if (!window.CES_API || typeof window.CES_API.chunkedRows !== 'function') {
      throw new Error('Fast upload failed and chunk transport is unavailable');
    }
    var label = byId('loadingText');
    return timeout(window.CES_API.chunkedRows('saveReportDataArray', rows, {}, {
      maxUrlLength:7000,
      timeoutMs:90000,
      onProgress:function (done, total, count) {
        if (label) label.textContent = 'Retrying Report CSI... ' + done + '/' + total + ' (' + count + ' rows)';
      }
    }), 190000, 'Report CSI fallback upload');
  }

  function summarize(result, parsed, clientUnchanged) {
    var list = result && Array.isArray(result.results) ? result.results : [result || {}];
    var summary = { added:0, updated:0, unchanged:Number(clientUnchanged || 0), skipped:Number(parsed.skipped || 0) };
    list.forEach(function (item) {
      if (typeof item === 'number') summary.added += Number(item) || 0;
      else if (item) {
        summary.added += Number(item.added || 0) || 0;
        summary.updated += Number(item.updated || 0) || 0;
        summary.unchanged += Number(item.unchanged || 0) || 0;
        summary.skipped += Number(item.skipped || 0) || 0;
      }
    });
    return summary;
  }

  async function handleReportUploadV31(event) {
    var input = event && event.target ? event.target : byId('reportFileInput');
    var file = input && input.files ? input.files[0] : null;
    if (!file || active) return;
    active = true;
    show('Reading Report CSI Excel file...');
    try {
      var parsed = await parseWorkbookV31(file);
      var diff = selectChangedRows(parsed.rows);
      hide();

      if (!diff.rows.length) {
        if (window.Swal) Swal.fire('No changes', 'ข้อมูลทั้งหมดเหมือนกับข้อมูลในระบบแล้ว', 'info');
        return;
      }

      if (window.Swal) {
        var confirmed = await Swal.fire({
          icon:'question', title:'Update Report CSI?',
          html:'พบข้อมูลทั้งหมด <b>' + parsed.rows.length + '</b> รายการ<br>' +
            'ต้องเขียนจริง <b>' + diff.rows.length + '</b> รายการ<br>' +
            '<span style="font-size:12px;color:#64748b">ส่งข้อมูลครั้งเดียวเพื่อให้เร็วขึ้น</span>',
          showCancelButton:true, confirmButtonText:'Update Data', cancelButtonText:'Cancel', confirmButtonColor:BLUE
        });
        if (!confirmed.isConfirmed) return;
      }

      show('Updating Report CSI... ' + diff.rows.length + ' rows in one request');
      var result;
      try {
        result = await uploadSingleRequest(diff.rows);
      } catch (fastError) {
        console.warn('[Report CSI V31] single POST failed; fallback to chunks', fastError);
        result = await fallbackChunks(diff.rows);
      }

      var summary = summarize(result, parsed, diff.unchangedClient);
      applyLocalRows(diff.rows);
      hide();

      // Do not block the user while reading the sheet again. The page already reflects the uploaded rows.
      setTimeout(function () {
        try {
          if (typeof loadReportCSIOnlyV31 === 'function') {
            Promise.resolve(loadReportCSIOnlyV31(true, false)).catch(function (e) { console.warn('[Report CSI V31] background refresh failed', e); });
          }
        } catch (_) {}
      }, 100);

      if (window.Swal) {
        Swal.fire({
          icon:'success', title:'Report CSI Updated',
          html:'<div style="font-size:13px;line-height:1.8;text-align:left;color:#475569">' +
            '<b>เพิ่มใหม่:</b> ' + summary.added + ' รายการ<br>' +
            '<b>อัปเดตข้อมูลเดิม:</b> ' + summary.updated + ' รายการ<br>' +
            '<b>ข้อมูลเหมือนเดิม:</b> ' + summary.unchanged + ' รายการ<br>' +
            '<b>ข้าม:</b> ' + summary.skipped + ' รายการ</div>'
        });
      }
    } catch (err) {
      console.error('[Report CSI V31]', err);
      if (window.Swal) Swal.fire('Report CSI Update Error', errText(err), 'error');
      else alert(errText(err));
    } finally {
      active = false;
      hide();
      if (input) input.value = '';
    }
  }

  function install() {
    var input = byId('reportFileInput');
    if (input) input.setAttribute('onchange', 'handleReportUploadV31(event)');
    window.handleReportUploadV31 = handleReportUploadV31;
    window.handleReportUpload = handleReportUploadV31;
  }

  window.CES_REPORT_V31_RECHECK = function () {
    var input = byId('reportFileInput');
    var ui = null;
    try {
      if (typeof window.CES_REPORT_UI_V31_RECHECK === 'function') ui = window.CES_REPORT_UI_V31_RECHECK();
    } catch (ignore) {}
    return {
      version:'V31', installed:!!window.__CES_REPORT_FAST_V31__,
      inputHandler:input ? input.getAttribute('onchange') : '', active:active,
      transport:'single iframe POST with JSONP fallback', currentRecords:currentReportRows().length,
      ui:ui
    };
  };

  install();
  document.addEventListener('DOMContentLoaded', install);
  setTimeout(install, 400);
})(window, document);
