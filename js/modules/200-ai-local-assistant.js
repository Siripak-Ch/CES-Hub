// ============================================================
// 200-ai-local-assistant.js
// CES Hub Assistant V22.5 — Gemini Online primary + verified CES data + separate Website/AI evaluation.
// ============================================================
(function () {
  'use strict';

  var VERSION = 'CES-AI-GEMINI-ONLINE-V22.5';
  var CACHE_KEY = 'CES_AI_LOCAL_KB_CACHE_V20';
  var EVAL_QUEUE_KEY = 'CES_AI_EVAL_QUEUE_V20';
  var EVAL_PENDING_KEY = 'CES_AI_EVAL_PENDING_V204';
  var HISTORY_KEY_PREFIX = 'CES_AI_LOCAL_HISTORY_V20_';
  var state = {
    ready:false,
    loading:false,
    knowledge:[],
    source:'DEFAULT',
    generatedAt:'',
    history:[],
    adminKnowledge:[],
    adminDashboard:null,
    currentLogIds:{},
    selectedId:'',
    lastResult:null,
    busy:false,
    pendingEvaluation:null,
    evaluationValues:{ease:0,speed:0,completeness:0},
    evaluationScope:'WEBSITE',
    evaluationTimer:null,
    onlineStatus:null
  };
  var el = {};

  function cfg() {
    var c = (window.CES_CONFIG && window.CES_CONFIG.AI_LOCAL) || {};
    return {
      enabled:c.ENABLED !== false,
      source:String(c.KNOWLEDGE_SOURCE || 'BACKEND').toUpperCase(),
      cacheMinutes:Number(c.CACHE_TTL_MINUTES || 30),
      minScore:Number(c.MIN_SCORE || 18),
      maxRelated:Number(c.MAX_RELATED || 3),
      logQuestions:c.LOG_QUESTIONS !== false,
      showSource:c.SHOW_SOURCE !== false,
      enableEvaluation:c.ENABLE_EVALUATION !== false,
      evaluationDelayMs:Math.max(30000,Number(c.EVALUATION_DELAY_MS || 90000)),
      onlineFallback:c.ONLINE_FALLBACK !== false
    };
  }

  function user() { return window.CES_CURRENT_USER || null; }
  function role() { return String((user() && user().role) || '').trim().toUpperCase(); }
  function team() { return String((user() && user().team) || '').trim().toUpperCase(); }
  function userId() { return String((user() && (user().id || user().empId)) || '').trim(); }
  function currentTab() { return String(window.currentTab || document.body.getAttribute('data-ces-active-tab') || 'portal'); }
  function loggedIn() {
    var dashboard = document.getElementById('main-dashboard');
    return !!(user() && dashboard && !dashboard.classList.contains('hidden'));
  }

  function normalize(value) {
    return String(value == null ? '' : value)
      .toLowerCase()
      .replace(/ทำยังไง/g, 'อย่างไร')
      .replace(/อัพเดท|อัปเดท/g, 'อัปเดต')
      .replace(/เช็ค/g, 'เช็ก')
      .replace(/สต๊อก/g, 'สต็อก')
      .replace(/รถยนต์|รถเก๋ง/g, 'car')
      .replace(/รถตู้/g, 'van')
      .replace(/ดาวโหลด/g, 'ดาวน์โหลด')
      .replace(/รีซิงค์|รีซิงก์/g, 'resync')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/[^a-z0-9ก-๙\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function list(value) {
    if (Array.isArray(value)) return value.map(function (x) { return String(x || '').trim(); }).filter(Boolean);
    return String(value || '').split(/[\n|,;]+/).map(function (x) { return x.trim(); }).filter(Boolean);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function ngrams(text, size) {
    var clean = normalize(text).replace(/\s+/g, '');
    var out = Object.create(null);
    if (!clean) return out;
    size = size || 3;
    if (clean.length <= size) { out[clean] = true; return out; }
    for (var i = 0; i <= clean.length - size; i++) out[clean.slice(i, i + size)] = true;
    return out;
  }

  function diceSimilarity(a, b) {
    var aa = ngrams(a, 3), bb = ngrams(b, 3);
    var aKeys = Object.keys(aa), bKeys = Object.keys(bb);
    if (!aKeys.length || !bKeys.length) return 0;
    var common = 0;
    aKeys.forEach(function (k) { if (bb[k]) common++; });
    return (2 * common) / (aKeys.length + bKeys.length);
  }

  function allowed(entry) {
    var roles = list(entry.allowedRoles).map(function (x) { return x.toUpperCase(); });
    var teams = list(entry.allowedTeams).map(function (x) { return x.toUpperCase(); });
    if (roles.length && roles.indexOf(role()) < 0) return false;
    if (teams.length && teams.indexOf(team()) < 0) return false;
    return String(entry.status || 'ACTIVE').toUpperCase() !== 'INACTIVE';
  }

  function scoreEntry(question, entry) {
    if (!allowed(entry)) return -999;
    var q = normalize(question);
    if (!q) return -999;
    var score = 0;
    var phraseHit = 0;
    var qCompact = q.replace(/\s+/g, '');
    var tab = currentTab();
    var title = normalize(entry.title);
    var patterns = list(entry.questionPatterns);
    var keywords = list(entry.keywords);

    if (entry.targetTab && String(entry.targetTab) === tab) score += 7;
    if (state.lastResult && q.length < 45 && entry.targetTab && entry.targetTab === state.lastResult.targetTab) score += 7;
    if (state.lastResult && q.length < 35 && entry.category && entry.category === state.lastResult.category) score += 5;
    var titleCompact = title.replace(/\s+/g, '');
    if (title && (q === title || qCompact === titleCompact)) { score += 35; phraseHit++; }
    else if (title && (q.indexOf(title) >= 0 || qCompact.indexOf(titleCompact) >= 0)) { score += 18; phraseHit++; }
    else if (title && (title.indexOf(q) >= 0 || titleCompact.indexOf(qCompact) >= 0) && q.length >= 4) { score += 10; phraseHit++; }

    patterns.forEach(function (pattern) {
      var p = normalize(pattern);
      if (!p) return;
      var pc = p.replace(/\s+/g, '');
      if (q === p || qCompact === pc) { score += 34; phraseHit++; }
      else if (q.indexOf(p) >= 0 || qCompact.indexOf(pc) >= 0) { score += Math.min(24, 9 + p.length * 0.55); phraseHit++; }
      else if ((p.indexOf(q) >= 0 || pc.indexOf(qCompact) >= 0) && q.length >= 4) { score += 8; phraseHit++; }
    });

    keywords.forEach(function (keyword) {
      var k = normalize(keyword);
      if (!k) return;
      var kc = k.replace(/\s+/g, '');
      var generic = ['ระบบ','หน้า','ข้อมูล','วิธี'].indexOf(kc) >= 0;
      if (q === k || qCompact === kc) { score += generic ? 4 : 24; if (!generic) phraseHit++; }
      else if (q.indexOf(k) >= 0 || qCompact.indexOf(kc) >= 0) { score += generic ? 2 : Math.min(20, 9 + k.length * 0.65); if (!generic) phraseHit++; }
    });

    var searchable = [entry.title].concat(patterns, keywords).join(' ');
    var similarity = diceSimilarity(q, searchable);
    score += similarity * (phraseHit > 0 || similarity >= 0.5 ? 18 : 5);
    score += Math.max(0, Math.min(100, Number(entry.priority || 50))) / 25;
    return Math.round(score * 10) / 10;
  }

  function rank(question) {
    return state.knowledge.map(function (entry) {
      return { entry:entry, score:scoreEntry(question, entry) };
    }).filter(function (x) { return x.score > 0; })
      .sort(function (a, b) { return b.score - a.score || Number(b.entry.priority || 0) - Number(a.entry.priority || 0); });
  }


  function visibleNode(node) {
    if (!node) return false;
    var style = window.getComputedStyle ? window.getComputedStyle(node) : null;
    return !node.classList.contains('hidden') && (!style || (style.display !== 'none' && style.visibility !== 'hidden'));
  }

  function cleanCellText(node) {
    return String(node && (node.innerText || node.textContent) || '').replace(/\s+/g, ' ').trim();
  }

  function collectCurrentPageSummary() {
    var root = document.getElementById('view-' + currentTab());
    if (!root || !visibleNode(root)) return null;
    var rows = [];
    root.querySelectorAll('.ces-vehicle-kpi-card,.ces-portal-status-card-v186,.ces-management-kpi-card,.kpi-card,[data-kpi-card]').forEach(function(card) {
      if (!visibleNode(card) || rows.length >= 18) return;
      var labelNode = card.querySelector(':scope > div:first-child, :scope > span:first-child, .label, .title');
      var valueNode = card.querySelector('strong,[data-value],.value');
      var noteNode = card.querySelector('small,.note');
      var label = cleanCellText(labelNode);
      var value = cleanCellText(valueNode);
      var note = cleanCellText(noteNode);
      if (label && value && label !== value) rows.push([label, value, note]);
    });

    var table = Array.from(root.querySelectorAll('table')).find(visibleNode);
    var tableData = null;
    if (table) {
      var headers = Array.from(table.querySelectorAll('thead th')).map(cleanCellText).filter(Boolean);
      var bodyRows = Array.from(table.querySelectorAll('tbody tr')).filter(visibleNode).slice(0, 20).map(function(tr) {
        return Array.from(tr.querySelectorAll('td')).map(cleanCellText);
      }).filter(function(r){ return r.some(Boolean); });
      if (!headers.length && bodyRows.length) headers = bodyRows[0].map(function(_,i){ return 'Column ' + (i+1); });
      if (headers.length && bodyRows.length) tableData = { headers:headers, rows:bodyRows };
    }
    if (!tableData && rows.length) tableData = { headers:['หัวข้อ','ข้อมูล','หมายเหตุ'], rows:rows };

    var headings = Array.from(root.querySelectorAll('h1,h2,h3')).filter(visibleNode).map(cleanCellText).filter(Boolean).slice(0,5);
    var title = headings[0] || currentTab();
    var lines = [];
    if (rows.length) rows.slice(0,10).forEach(function(r){ lines.push('• ' + r[0] + ': ' + r[1] + (r[2] ? ' (' + r[2] + ')' : '')); });
    if (!lines.length && tableData) lines.push('พบข้อมูลในตาราง ' + tableData.rows.length + ' แถว');
    if (!lines.length) {
      var text = cleanCellText(root).slice(0,900);
      if (text) lines.push(text);
    }
    return {
      title:title,
      answer:'สรุปข้อมูลที่กำลังแสดงในหน้า ' + title + '\n' + (lines.join('\n') || 'ยังไม่พบข้อมูลที่สรุปได้ในหน้าปัจจุบัน'),
      targetTab:currentTab(), score:100, id:'BUILTIN-PAGE-SUMMARY', related:[], unanswered:false,
      table:tableData, downloadName:'CES_' + currentTab() + '_summary.csv', category:'Live page summary'
    };
  }

  function contextualAnswer(question) {
    var q = normalize(question);
    if (/^(สวัสดี|หวัดดี|hello|hi|ดีครับ|ดีค่ะ)/.test(q)) {
      return { answer:'สวัสดีค่ะ ถามวิธีใช้งาน CES Hub หรือพิมพ์ “สรุปหน้านี้” เพื่อสรุปข้อมูลที่กำลังแสดงได้เลย', title:'ทักทาย', targetTab:'', score:100, id:'BUILTIN-GREETING', related:[], category:'General' };
    }
    if (/(สรุปหน้านี้|สรุปข้อมูลที่เห็น|ขอสรุป|current page summary|ขอเป็นตาราง|ดาวน์โหลดข้อมูลหน้านี้|export หน้านี้)/.test(q)) {
      return collectCurrentPageSummary();
    }
    if (q.indexOf('อยู่หน้าอะไร') >= 0 || q.indexOf('หน้าปัจจุบัน') >= 0) {
      return { answer:'ขณะนี้คุณอยู่ในหน้า ' + currentTab() + ' ค่ะ', title:'หน้าปัจจุบัน', targetTab:currentTab(), score:100, id:'BUILTIN-CONTEXT', related:[], category:'General' };
    }
    if (q.indexOf('ฉันเป็นใคร') >= 0 || q.indexOf('role อะไร') >= 0 || q.indexOf('ทีมอะไร') >= 0) {
      return { answer:'คุณเข้าสู่ระบบด้วยรหัส ' + (userId() || '-') + ' · Role: ' + (role() || '-') + ' · Team: ' + (team() || '-') + ' ค่ะ', title:'ข้อมูลผู้ใช้ปัจจุบัน', targetTab:'team_information', score:100, id:'BUILTIN-USER', related:[], category:'Account' };
    }
    if (q.indexOf('ทำอะไรได้บ้าง') >= 0 || q.indexOf('ถามอะไรได้') >= 0) {
      return { answer:'AI CES ใช้ Gemini เป็น reasoning layer เมื่อมี API key โดยระบบจะดึงเฉพาะข้อมูล CES ที่เกี่ยวข้องกับคำถามมาเป็น grounding ก่อน เช่น ช่วงเดือนที่ระบุใน CSI แล้วจึงให้ Gemini วิเคราะห์ หาก Online API ไม่พร้อมจะ fallback ไปยังข้อมูลจริง/ฐานความรู้ภายในแทน', title:'ความสามารถของระบบ', targetTab:'portal', score:100, id:'BUILTIN-CAPABILITY', related:[], category:'CES AI' };
    }
    return null;
  }

  function answerLocally(question) {
    var builtIn = contextualAnswer(question);
    if (builtIn) return builtIn;
    var ranked = rank(question);
    var best = ranked[0];
    if (!best || best.score < cfg().minScore) {
      return {
        answer:'ยังไม่พบคำตอบที่ตรงในฐานความรู้ค่ะ ลองระบุชื่อเมนูและสิ่งที่ต้องการ เช่น “วิธี Check-in”, “จองรถต้องแนบอะไร” หรือ “ข้อมูลไม่อัปเดต”\n\nคำถามนี้จะถูกส่งเข้า Training Log เพื่อให้ Admin เพิ่มคำตอบภายหลัง',
        title:'ไม่พบคำตอบ', targetTab:'', score:best ? best.score : 0, id:'', related:ranked.slice(0, cfg().maxRelated).map(function (x) { return x.entry; }), unanswered:true
      };
    }
    return {
      answer:best.entry.answer,
      title:best.entry.title,
      targetTab:best.entry.targetTab || '',
      score:best.score,
      id:best.entry.id,
      category:best.entry.category || '',
      related:ranked.slice(1, 1 + cfg().maxRelated).filter(function (x) { return x.score >= cfg().minScore * .65; }).map(function (x) { return x.entry; }),
      unanswered:false
    };
  }

  function setStatus(type, text) {
    if (el.statusDot) el.statusDot.className = 'ces-ai-local-status-dot ' + (type || '');
    if (el.statusText) el.statusText.textContent = text || '';
    updateSettingStatus();
  }

  function updateSettingStatus() {
    var status = document.getElementById('ces-ai-setting-status');
    if (status) status.textContent = state.ready ? (state.knowledge.length + ' entries · ' + state.source) : 'Not loaded';
  }


  function paintOnlineStatus(status) {
    state.onlineStatus = status || null;
    var footer = el.footer || document.getElementById('ces-ai-local-footer');
    if (!footer) return;
    if (status && status.enabled) {
      footer.textContent = 'GEMINI ONLINE · ' + String(status.model || 'gemini') + ' · VERIFIED CES DATA';
      footer.classList.add('online'); footer.classList.remove('fallback','checking');
    } else {
      var reason = status && status.keyConfigured === false ? 'GEMINI SETUP REQUIRED' : 'ONLINE UNAVAILABLE';
      footer.textContent = (status && status.keyConfigured === false) ? 'GEMINI SETUP REQUIRED · OPEN SETTING' : ('LOCAL FALLBACK · ' + reason);
      if(status && status.keyConfigured === false){footer.title='Click to configure Gemini Online';footer.style.cursor='pointer';footer.onclick=function(){try{if(typeof window.switchTab==='function')window.switchTab('setting');}catch(ignore){}};}else{footer.onclick=null;footer.style.cursor='';}
      footer.classList.add('fallback'); footer.classList.remove('online','checking');
    }
  }

  async function refreshOnlineStatus() {
    var footer = el.footer || document.getElementById('ces-ai-local-footer');
    if (footer) { footer.textContent = 'CHECKING GEMINI ONLINE…'; footer.classList.add('checking'); footer.classList.remove('online','fallback'); }
    if (!window.CES_API || typeof window.CES_API.callFunction !== 'function') { paintOnlineStatus({enabled:false,keyConfigured:false}); return null; }
    try {
      var status = await window.CES_API.callFunction('getCesAiOnlineStatus', [], {transport:'jsonp',timeoutMs:30000,dedupe:false});
      paintOnlineStatus(status || {enabled:false});
      return status;
    } catch (error) {
      paintOnlineStatus({enabled:false,keyConfigured:null,message:error && error.message});
      return null;
    }
  }

  window.refreshCesAiOnlineStatusV225 = refreshOnlineStatus;

  function addOperationStatus(text) {
    if (!el.messages) return null;
    var row=document.createElement('div'); row.className='ces-ai-local-message ces-ai-local-message-bot ces-ai-task-status';
    var bubble=document.createElement('div'); bubble.className='ces-ai-local-bubble';
    bubble.innerHTML='<span class="ces-ai-task-spinner"><i class="fas fa-circle-notch fa-spin"></i></span><span class="ces-ai-task-text"></span>';
    var txt=bubble.querySelector('.ces-ai-task-text'); if(txt) txt.textContent=String(text||'กำลังดำเนินการ...');
    row.appendChild(bubble); el.messages.appendChild(row); scrollBottom(); return row;
  }
  function finishOperationStatus(row, text, ok) {
    if (!row) return;
    var bubble=row.querySelector('.ces-ai-local-bubble'); if(!bubble)return;
    bubble.classList.toggle('ces-ai-task-success',!!ok); bubble.classList.toggle('ces-ai-task-error',!ok);
    bubble.innerHTML='<i class="fas '+(ok?'fa-circle-check':'fa-triangle-exclamation')+'"></i> <span></span>';
    var span=bubble.querySelector('span'); if(span) span.textContent=String(text||''); scrollBottom();
  }
  function setChatEvaluationBusy(busy) {
    if(el.send)el.send.disabled=!!busy || state.busy;
    if(el.input)el.input.disabled=!!busy;
    if(el.quickSuggestions)el.quickSuggestions.classList.toggle('ces-ai-disabled',!!busy);
  }

  function readCache(allowStale) {
    try {
      var cache = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (!cache || !Array.isArray(cache.knowledge) || !cache.knowledge.length) return null;
      var fresh = Date.now() - Number(cache.savedAt || 0) < cfg().cacheMinutes * 60000;
      if (!fresh && !allowStale) return null;
      return cache;
    } catch (ignore) { return null; }
  }

  function writeCache(knowledge, meta) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        savedAt:Date.now(), knowledge:knowledge, source:(meta && meta.source) || 'BACKEND', generatedAt:(meta && meta.generatedAt) || ''
      }));
    } catch (ignore) {}
  }

  function mergeKnowledgeWithDefaults(rows) {
    var map=Object.create(null),out=[];
    (window.CES_AI_DEFAULT_KNOWLEDGE||[]).forEach(function(item){if(item&&item.id){map[item.id]=item;out.push(item);}});
    (Array.isArray(rows)?rows:[]).forEach(function(item){if(!item||!item.id)return;if(map[item.id]){var idx=out.findIndex(function(x){return x.id===item.id;});if(idx>=0)out[idx]=item;}else out.push(item);map[item.id]=item;});
    return out;
  }

  async function flushEvaluationQueue() {
    if(!window.CES_API||typeof window.CES_API.callFunction!=='function')return;
    var queue=[];try{queue=JSON.parse(localStorage.getItem(EVAL_QUEUE_KEY)||'[]');}catch(ignore){}
    if(!Array.isArray(queue)||!queue.length)return;
    var remaining=[];
    for(var i=0;i<queue.length;i++){
      try{var r=await window.CES_API.callFunction('submitCesAiEvaluation',[queue[i]],{transport:'jsonp',timeoutMs:30000});if(!r||r.success===false)remaining.push(queue[i]);}
      catch(error){remaining=remaining.concat(queue.slice(i));break;}
    }
    try{localStorage.setItem(EVAL_QUEUE_KEY,JSON.stringify(remaining.slice(-30)));}catch(ignore2){}
  }

  async function loadKnowledge(force) {
    if (state.loading) return state.knowledge;
    state.loading = true;
    setStatus('', 'กำลังโหลดฐานความรู้...');
    try {
      var cached = !force ? readCache(false) : null;
      if (cached) {
        state.knowledge = mergeKnowledgeWithDefaults(cached.knowledge);
        state.source = cached.source || 'CACHE';
        state.generatedAt = cached.generatedAt || '';
        state.ready = true;
        setStatus('ready', state.knowledge.length + ' คำตอบ · Cache');
        return state.knowledge;
      }

      if (cfg().source === 'BACKEND' && window.CES_API && typeof window.CES_API.callFunction === 'function') {
        var res = await window.CES_API.callFunction('getCesAiKnowledgeBase', [{ role:role(), team:team(), userId:userId() }], { transport:'jsonp', timeoutMs:90000 });
        if (res && res.success !== false && Array.isArray(res.knowledge) && res.knowledge.length) {
          state.knowledge = mergeKnowledgeWithDefaults(res.knowledge);
          state.source = 'BACKEND';
          state.generatedAt = res.generatedAt || '';
          state.ready = true;
          writeCache(state.knowledge, { source:'BACKEND', generatedAt:state.generatedAt });
          setStatus('ready', state.knowledge.length + ' คำตอบ · Google Sheet');
          return state.knowledge;
        }
      }
      throw new Error('Backend knowledge unavailable');
    } catch (error) {
      var stale = readCache(true);
      if (stale) {
        state.knowledge = mergeKnowledgeWithDefaults(stale.knowledge);
        state.source = 'STALE_CACHE';
        state.ready = true;
        setStatus('ready', state.knowledge.length + ' คำตอบ · Offline Cache');
      } else {
        state.knowledge = (window.CES_AI_DEFAULT_KNOWLEDGE || []).slice();
        state.source = 'DEFAULT';
        state.ready = true;
        setStatus(state.knowledge.length ? 'ready' : 'error', state.knowledge.length + ' คำตอบ · Default');
      }
      return state.knowledge;
    } finally {
      state.loading = false;
    }
  }

  function historyKey() { return HISTORY_KEY_PREFIX + (userId() || 'anonymous'); }
  function loadHistory() {
    try {
      var data = JSON.parse(sessionStorage.getItem(historyKey()) || '[]');
      state.history = Array.isArray(data) ? data.slice(-20) : [];
    } catch (ignore) { state.history = []; }
  }
  function saveHistory() {
    try { sessionStorage.setItem(historyKey(), JSON.stringify(state.history.slice(-20))); } catch (ignore) {}
  }

  function scrollBottom() { if (el.messages) el.messages.scrollTop = el.messages.scrollHeight; }
  function addTyping() {
    var row = document.createElement('div');
    row.id = 'ces-ai-local-typing';
    row.className = 'ces-ai-local-message ces-ai-local-message-bot';
    row.innerHTML = '<div class="ces-ai-local-bubble"><span class="ces-ai-local-typing"><span>●</span><span>●</span><span>●</span></span></div>';
    el.messages.appendChild(row); scrollBottom();
  }
  function removeTyping() { var node = document.getElementById('ces-ai-local-typing'); if (node) node.remove(); }


  function csvEscape(value) {
    var text = String(value == null ? '' : value);
    return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  }
  function downloadResultTable(result) {
    if (!result || !result.table) return;
    var lines = [result.table.headers.map(csvEscape).join(',')].concat(result.table.rows.map(function(row){ return row.map(csvEscape).join(','); }));
    var blob = new Blob(['\ufeff' + lines.join('\r\n')], { type:'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = result.downloadName || 'CES_AI_summary.csv'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  }
  function renderResultTable(bubble, result) {
    if (!result || !result.table || !Array.isArray(result.table.rows)) return;
    var wrap = document.createElement('div'); wrap.className = 'ces-ai-local-table-wrap';
    var table = document.createElement('table'); table.className = 'ces-ai-local-table';
    var thead = document.createElement('thead'), trh = document.createElement('tr');
    (result.table.headers || []).forEach(function(h){ var th=document.createElement('th'); th.textContent=h; trh.appendChild(th); });
    thead.appendChild(trh); table.appendChild(thead);
    var tbody = document.createElement('tbody');
    result.table.rows.slice(0,20).forEach(function(row){ var tr=document.createElement('tr'); row.forEach(function(v){var td=document.createElement('td');td.textContent=v;tr.appendChild(td);});tbody.appendChild(tr); });
    table.appendChild(tbody); wrap.appendChild(table); bubble.appendChild(wrap);
  }
  function buildStars(group, valueHolder) {
    for (var i=1;i<=5;i++) (function(value){
      var b=document.createElement('button'); b.type='button'; b.className='ces-ai-star'; b.textContent='★'; b.setAttribute('aria-label',value+' ดาว');
      b.addEventListener('click',function(){ valueHolder.value=value; Array.from(group.querySelectorAll('.ces-ai-star')).forEach(function(x,idx){x.classList.toggle('active',idx<value);}); }); group.appendChild(b);
    })(i);
  }
  function closeEvaluationPopup() {
    if (el.evalPopup) el.evalPopup.classList.add('hidden');
    state.pendingEvaluation = null;
    clearPendingEvaluation();
  }
  function paintEvaluationStars(group, key, value) {
    state.evaluationValues[key] = value;
    if (!group) return;
    Array.from(group.querySelectorAll('.ces-ai-star')).forEach(function(node, index){ node.classList.toggle('active', index < value); });
  }
  function initEvaluationStars(group, key) {
    if (!group || group.dataset.bound === '1') return;
    group.dataset.bound = '1';
    group.innerHTML = '';
    for (var i=1;i<=5;i++) (function(value){
      var button=document.createElement('button');button.type='button';button.className='ces-ai-star';button.textContent='★';button.setAttribute('aria-label',value+' stars');
      button.addEventListener('click',function(){paintEvaluationStars(group,key,value);});group.appendChild(button);
    })(i);
  }
  function bindEvaluationScopes(){
    if(!el.evalScopes||el.evalScopes.dataset.bound==='1')return;
    el.evalScopes.dataset.bound='1';
    el.evalScopes.addEventListener('click',function(event){var btn=event.target.closest('.ces-ai-eval-scope');if(!btn)return;state.evaluationScope=btn.getAttribute('data-scope')||'WEBSITE';Array.from(el.evalScopes.querySelectorAll('.ces-ai-eval-scope')).forEach(function(x){x.classList.toggle('active',x===btn);});});
  }
  function openEvaluationPopup(question, result) {
    if (!cfg().enableEvaluation || !el.evalPopup) return;
    // V22.4: the star popup is Website Evaluation only. AI answer quality is collected exclusively by 👍 / 👎.
    state.pendingEvaluation = { question:'', result:{id:'WEBSITE-EVALUATION',title:'CES Hub Website Evaluation',targetTab:currentTab()} };
    state.evaluationValues = { ease:0, speed:0, completeness:0 };
    state.evaluationScope='WEBSITE';
    ['ease','speed','completeness'].forEach(function(key){ var group=el['eval'+key.charAt(0).toUpperCase()+key.slice(1)]; paintEvaluationStars(group,key,0); });
    if (el.evalSuggestion) el.evalSuggestion.value='';
    if (el.evalError) el.evalError.textContent='';
    if (el.evalSubmit) { el.evalSubmit.disabled=false; el.evalSubmit.innerHTML='<i class="fas fa-paper-plane"></i> ส่งแบบประเมิน'; }
    el.evalPopup.classList.remove('hidden');
    if (window.CES_LANGUAGE && window.CES_LANGUAGE.apply) window.CES_LANGUAGE.apply();
  }
  async function submitEvaluationPopup() {
    var pending=state.pendingEvaluation;
    if(!pending)return closeEvaluationPopup();
    var values=state.evaluationValues||{};
    if(!values.ease||!values.speed||!values.completeness){if(el.evalError)el.evalError.textContent='กรุณาให้คะแนนครบทั้ง 3 หัวข้อ';return;}
    var payload={userId:userId(),role:role(),team:team(),currentTab:currentTab(),scope:'WEBSITE',question:'',matchedId:'WEBSITE-EVALUATION',matchedTitle:'CES Hub Website Evaluation',ease:values.ease,speed:values.speed,completeness:values.completeness,suggestion:(el.evalSuggestion&&el.evalSuggestion.value||'').trim(),language:(window.CES_LANGUAGE&&window.CES_LANGUAGE.get?window.CES_LANGUAGE.get():'TH'),clientVersion:VERSION};
    var progress=addOperationStatus('กำลังส่งแบบประเมิน CES Hub กรุณารอสักครู่…');
    setChatEvaluationBusy(true);
    if(el.evalSubmit){el.evalSubmit.disabled=true;el.evalSubmit.innerHTML='<i class="fas fa-circle-notch fa-spin"></i> กำลังส่ง…';}
    try{
      if(!window.CES_API||typeof window.CES_API.callFunction!=='function')throw new Error('offline');
      var res=await window.CES_API.callFunction('submitCesAiEvaluation',[payload],{transport:'jsonp',timeoutMs:60000,dedupe:false});
      if(!res||res.success===false)throw new Error((res&&res.message)||'Save failed');
      if(el.evalSubmit)el.evalSubmit.innerHTML='<i class="fas fa-circle-check"></i> ส่งเรียบร้อย';
      finishOperationStatus(progress,'ขอบคุณที่ทำแบบประเมินการใช้งาน CES Hub',true);
      setTimeout(closeEvaluationPopup,700);
    }catch(error){
      try{var q=JSON.parse(localStorage.getItem(EVAL_QUEUE_KEY)||'[]');if(!Array.isArray(q))q=[];q.push(payload);localStorage.setItem(EVAL_QUEUE_KEY,JSON.stringify(q.slice(-30)));}catch(ignore){}
      if(el.evalSubmit){el.evalSubmit.disabled=false;el.evalSubmit.innerHTML='<i class="fas fa-rotate"></i> ลองส่งอีกครั้ง';}
      if(el.evalError)el.evalError.textContent='ยังส่งไม่สำเร็จ ระบบเก็บรายการไว้ในอุปกรณ์และจะลองส่งใหม่เมื่อ Online';
      finishOperationStatus(progress,'ยังส่งแบบประเมินไม่สำเร็จ ระบบเก็บไว้ในอุปกรณ์เพื่อส่งใหม่',false);
    } finally {
      setChatEvaluationBusy(false);
    }
  }
  // V22.4: legacy delayed/per-answer star evaluation disabled.
  function clearPendingEvaluation() { try { sessionStorage.removeItem(EVAL_PENDING_KEY); } catch (e) {} if (state.evaluationTimer) clearTimeout(state.evaluationTimer); state.evaluationTimer=null; if(el.launcher)el.launcher.classList.remove('has-evaluation'); }


  function splitAnswerStepsV208(text, maxParts) {
    var clean = String(text || '').replace(/\r/g,'').trim();
    if (!clean) return [];
    var parts = clean.split(/\n+/).map(function(x){return x.replace(/^\s*(?:[•\-*]|\d+[.)])\s*/,'').trim();}).filter(Boolean);
    if (parts.length < 2) {
      parts = clean.split(/(?:\.\s+|。\s*|\?\s+|!\s+|\s+(?=จากนั้น|ต่อมา|เมื่อ|หาก|สุดท้าย|กด|เลือก|ตรวจสอบ))/).map(function(x){return x.trim();}).filter(Boolean);
    }
    if (!parts.length) parts=[clean];
    maxParts=Math.max(1,Number(maxParts||4));
    if (parts.length > maxParts) parts = parts.slice(0,maxParts-1).concat([parts.slice(maxParts-1).join(' ')]);
    return parts;
  }
  function friendlyTabNameV208(tab) {
    var names={portal:'หน้า Home',management_overview:'Management Overview',yearly:'Job Dashboard',revenue:'Revenue Dashboard',ot:'OT Dashboard',service:'แบบประเมินการใช้บริการ',report:'แบบประเมินรายงานผล',calendar:'Master Calendar',checkin:'Check-in',car_booking:'Car Booking',van_booking:'Van Booking',weekly:'Weekly Report',kpi:'KPI Tracking',report_manage:'OT Generate',stock_dashboard:'Infusion Pump Dashboard',inventory:'Inventory',check_stock:'Check Stock',team_information:'Team Information',team_plan:'Team Plan',master_cal_pm_plan:'Master CAL/PM Plan',monthly_report:'Monthly Report',users:'User Management',ces_evaluation:'CES Hub Evaluation',ces_ai_knowledge:'CES AI Knowledge',health:'System Health',setting:'Setting'};
    return names[String(tab||'')] || String(tab||'ฟังก์ชันที่เกี่ยวข้อง').replace(/_/g,' ');
  }
  function renderStructuredAnswerV208(bubble, text, result) {
    var parts=splitAnswerStepsV208(text, result && result.targetTab ? 3 : 4);
    var ol=document.createElement('ol');ol.className='ces-ai-answer-steps-v208';
    parts.forEach(function(part){var li=document.createElement('li');var body=document.createElement('span');body.textContent=part;li.appendChild(body);ol.appendChild(li);});
    bubble.appendChild(ol);
  }

  function addMessage(roleName, text, result, question) {
    var row = document.createElement('div');
    row.className = 'ces-ai-local-message ' + (roleName === 'user' ? 'ces-ai-local-message-user' : 'ces-ai-local-message-bot');
    var bubble = document.createElement('div');
    bubble.className = 'ces-ai-local-bubble';
    if (roleName === 'user' || !result) bubble.textContent = String(text || '');
    else renderStructuredAnswerV208(bubble, text, result);
    row.appendChild(bubble);

    if (roleName !== 'user' && result) {
      if (cfg().showSource && result.title) {
        var meta = document.createElement('small');
        meta.className = 'ces-ai-local-meta';
        meta.textContent = 'แหล่งคำตอบ: ' + result.title + ' · ' + (result.onlineUsed ? ('Gemini Online' + (result.model ? ' ('+result.model+')' : '')) : 'Verified Local Fallback') + ' · Match ' + Math.round(result.score || 0);
        bubble.appendChild(meta);
      }
      var actions = document.createElement('div'); actions.className = 'ces-ai-local-actions';
      if (result.targetTab && typeof window.switchTab === 'function') {
        var openBtn = document.createElement('button'); openBtn.type = 'button'; openBtn.className = 'ces-ai-local-action';
        openBtn.innerHTML = '<span class="ces-ai-action-step-no">4</span><span><b>เปิดฟังก์ชัน</b><small>' + escapeHtml(friendlyTabNameV208(result.targetTab)) + '</small></span><i class="fas fa-arrow-up-right-from-square"></i>'; openBtn.classList.add('ces-ai-function-link-v208');
        openBtn.addEventListener('click', function () { window.switchTab(result.targetTab); }); actions.appendChild(openBtn);
      }
      var yes = document.createElement('button'); yes.type = 'button'; yes.className = 'ces-ai-local-feedback'; yes.textContent = '👍 มีประโยชน์';
      var no = document.createElement('button'); no.type = 'button'; no.className = 'ces-ai-local-feedback'; no.textContent = '👎 ยังไม่ตรง';
      yes.addEventListener('click', function () { submitFeedback(question, result, 'YES', yes, no); });
      no.addEventListener('click', function () { submitFeedback(question, result, 'NO', yes, no); });
      actions.appendChild(yes); actions.appendChild(no);
      if (result.table) { var dl=document.createElement('button'); dl.type='button'; dl.className='ces-ai-local-download'; dl.textContent='⬇ ดาวน์โหลด CSV'; dl.addEventListener('click',function(){downloadResultTable(result);}); actions.appendChild(dl); }
      bubble.appendChild(actions);
      renderResultTable(bubble, result);
      // V22.4: AI answer evaluation uses only 👍 มีประโยชน์ / 👎 ยังไม่ตรง.

      if (Array.isArray(result.related) && result.related.length) {
        var related = document.createElement('div'); related.className = 'ces-ai-local-related';
        result.related.forEach(function (item) {
          var btn = document.createElement('button'); btn.type = 'button'; btn.textContent = item.title;
          btn.addEventListener('click', function () { ask(item.title); }); related.appendChild(btn);
        });
        bubble.appendChild(related);
      }
    }
    el.messages.appendChild(row); scrollBottom(); return row;
  }

  async function logQuestion(question, result, forcedResult) {
    if (!cfg().logQuestions || !window.CES_API) return '';
    try {
      var res = await window.CES_API.callFunction('logCesAiQuestion', [{
        question:question,
        userId:userId(), role:role(), team:team(), currentTab:currentTab(),
        matchedId:result.id || '', matchedTitle:result.title || '', score:Number(result.score || 0),
        result:forcedResult || (result.unanswered ? 'UNANSWERED' : 'ANSWERED'), clientVersion:VERSION
      }], { transport:'jsonp', timeoutMs:45000 });
      return res && res.logId ? res.logId : '';
    } catch (ignore) { return ''; }
  }

  async function submitFeedback(question, result, helpful, yesBtn, noBtn) {
    yesBtn.disabled = true; noBtn.disabled = true;
    yesBtn.textContent = helpful === 'YES' ? 'กำลังบันทึก…' : '👍 มีประโยชน์';
    noBtn.textContent = helpful === 'NO' ? 'กำลังบันทึก…' : '👎 ยังไม่ตรง';
    try {
      var logId = result.logId || '';
      if (!logId) logId = await logQuestion(question, result, helpful === 'YES' ? 'POSITIVE_FEEDBACK' : 'NEGATIVE_FEEDBACK');
      if (logId && window.CES_API) {
        var snapshot=String(result.answer||'').replace(/\s+/g,' ').trim().slice(0,480);
        var saved=await window.CES_API.callFunction('submitCesAiFeedback', [{ logId:logId, helpful:helpful, note:snapshot }], { transport:'jsonp', timeoutMs:45000,dedupe:false });
        if(!saved||saved.success===false)throw new Error((saved&&saved.message)||'Feedback save failed');
        result.logId=logId;
      }
      yesBtn.textContent = helpful === 'YES' ? '✓ มีประโยชน์' : '👍 มีประโยชน์';
      noBtn.textContent = helpful === 'NO' ? '✓ บันทึกแล้ว' : '👎 ยังไม่ตรง';
    } catch (error) {
      yesBtn.disabled = false; noBtn.disabled = false;
      yesBtn.textContent = '👍 มีประโยชน์'; noBtn.textContent = '👎 ยังไม่ตรง';
      console.warn('[AI CES feedback]',error);
    }
  }


  async function liveDataAnswer(question){
    if(!window.CES_API||typeof window.CES_API.callFunction!=='function')return null;
    if(!/(สรุป|summary|เดือน|month|ล่าสุด|จำนวน|ยอด|ภาพรวม|เท่าไหร่|csi|check-?in|inventory|stock|memo|work order)/i.test(String(question||'')))return null;
    try{
      var res=await window.CES_API.callFunction('getCesAiLiveAnswer',[{question:String(question||''),currentTab:currentTab(),userId:userId(),team:team(),role:role()}],{transport:'jsonp',timeoutMs:60000,dedupe:false});
      if(res&&res.success&&res.handled&&res.answer)return {answer:res.answer,title:res.title||'VERIFIED LIVE DATA',targetTab:res.targetTab||'',score:100,id:'LIVE-DATA',category:'Verified live data',related:[],unanswered:false,onlineUsed:false,verifiedData:res.verifiedData!==false,period:res.period||null,table:res.table||null,facts:res.facts||null};
    }catch(e){console.warn('[AI CES live data]',e);}
    return null;
  }

  async function onlineFallback(question, baseResult) {
    // V22.4: Gemini Online is the primary reasoning/composition layer whenever configured.
    // Verified data/local knowledge is grounding only; if Gemini is unavailable, clearly label the fallback.
    if (!baseResult) return baseResult;
    if (!cfg().onlineFallback || !window.CES_API || typeof window.CES_API.callFunction !== 'function') { baseResult.engine='LOCAL_FALLBACK'; return baseResult; }
    if (!state.onlineStatus) await refreshOnlineStatus();
    if (state.onlineStatus && state.onlineStatus.enabled === false) { baseResult.engine='LOCAL_FALLBACK'; baseResult.onlineReason=state.onlineStatus.message||'Gemini is not configured'; return baseResult; }
    try {
      var ctx=[];
      var verifiedTitle=baseResult.verifiedData?'VERIFIED LIVE DATA · '+(baseResult.title||'CES Hub'):'CES grounded answer · '+(baseResult.title||'Local knowledge');
      var grounded=String(baseResult.answer||'');
      if(baseResult.facts){try{grounded+='\nStructured facts: '+JSON.stringify(baseResult.facts);}catch(ignore){}}
      if(baseResult.table&&Array.isArray(baseResult.table.rows)){grounded+='\nTable: '+JSON.stringify({headers:baseResult.table.headers||[],rows:baseResult.table.rows.slice(0,30)});}
      ctx.push({title:verifiedTitle,answer:grounded,targetTab:baseResult.targetTab||'',score:100});
      rank(question).slice(0,7).forEach(function(x){ctx.push({title:x.entry.title||'',answer:x.entry.answer||'',targetTab:x.entry.targetTab||'',score:x.score||0});});
      var history=(state.history||[]).slice(-8).map(function(x){return {role:x.role||'user',text:String(x.text||'').slice(0,900)};});
      var res=await window.CES_API.callFunction('askCesAssistantOnline',[{question:question,currentTab:currentTab(),context:ctx,history:history}],{transport:'jsonp',timeoutMs:70000,dedupe:false});
      if (res && res.success && res.onlineUsed && res.answer) {
        paintOnlineStatus({enabled:true,model:res.model||((state.onlineStatus||{}).model),keyConfigured:true}); return {answer:res.answer,title:'AI CES · Gemini Online',targetTab:baseResult.targetTab||'',score:Number(baseResult.score||0),id:baseResult.verifiedData?'ONLINE-GEMINI-LIVE':'ONLINE-GEMINI',category:baseResult.verifiedData?'Gemini Online + verified data':'Gemini Online + CES knowledge',related:baseResult.related||[],unanswered:false,onlineUsed:true,engine:'GEMINI_ONLINE',model:res.model||'',verifiedData:!!baseResult.verifiedData,period:baseResult.period||null,table:baseResult.table||null,facts:baseResult.facts||null};
      }
    } catch (error) { console.warn('[AI CES Gemini]', error); }
    baseResult.engine='LOCAL_FALLBACK';
    return baseResult;
  }

  async function ask(question) {
    question = String(question || '').trim();
    if (!question || state.busy) return;
    state.busy = true;
    if (el.send) el.send.disabled = true;
    addMessage('user', question);
    state.history.push({ role:'user', text:question, at:new Date().toISOString() }); saveHistory();
    addTyping();
    try {
      if (!state.ready) await loadKnowledge(false);
      await new Promise(function (resolve) { setTimeout(resolve, 120); });
      var result = await liveDataAnswer(question);
      if(!result)result = answerLocally(question);
      result = await onlineFallback(question, result);
      state.lastResult = result || null;
      result.logId = await logQuestion(question, result, '');
      removeTyping(); addMessage('bot', result.answer, result, question);
      state.history.push({ role:'assistant', text:result.answer, sourceId:result.id || '', at:new Date().toISOString() }); saveHistory();
    } catch (error) {
      removeTyping();
      addMessage('bot', 'ไม่สามารถค้นฐานความรู้ได้ในขณะนี้ กรุณากดปุ่ม Refresh ที่ด้านบนแล้วลองอีกครั้ง');
    } finally {
      state.busy = false;
      if (el.send) el.send.disabled = false;
      if (el.input) el.input.focus();
    }
  }

  function clearChat() {
    state.history = []; saveHistory();
    el.messages.innerHTML = '';
    addMessage('bot', 'ล้างบทสนทนาแล้วค่ะ ถามวิธีใช้งาน CES Hub ได้เลย');
  }

  function syncVisibility() {
    if (!el.root) return;
    var visible = cfg().enabled && loggedIn();
    el.root.classList.toggle('hidden', !visible);
    if (el.adminBtn) el.adminBtn.classList.toggle('hidden', role() !== 'ADMIN');
    updateSettingStatus();
  }

  function openPanel() {
    if (!el.panel) return;
    el.panel.classList.remove('hidden');
    el.launcher.setAttribute('aria-expanded', 'true');
    setTimeout(function () { if (el.input) el.input.focus(); }, 30);
    if (!state.ready) loadKnowledge(false);
    refreshOnlineStatus();
    flushEvaluationQueue();
  }
  function closePanel() { if (el.panel) el.panel.classList.add('hidden'); if (el.launcher) el.launcher.setAttribute('aria-expanded', 'false'); }
  function adminPayload(extra) {
    return Object.assign({ actorId:userId() }, extra || {});
  }

  async function loadAdminDirect() {
    if (role() !== 'ADMIN') { if (window.Swal) Swal.fire('Permission Denied', 'ADMIN permission is required', 'error'); return false; }
    try {
      var pair = await Promise.all([
        window.CES_API.callFunction('aiAdminListKnowledge', [{ actorId:userId() }], { transport:'jsonp', timeoutMs:45000 }),
        window.CES_API.callFunction('getCesAiTrainingDashboard', [{ actorId:userId() }], { transport:'jsonp', timeoutMs:45000 })
      ]);
      if (!pair[0] || pair[0].success === false) throw new Error((pair[0] && pair[0].message) || 'Cannot open knowledge base');
      state.adminKnowledge = pair[0].knowledge || [];
      state.adminDashboard = pair[1] || {};
      if (el.adminPinScreen) el.adminPinScreen.classList.add('hidden');
      if (el.adminWorkspace) el.adminWorkspace.classList.remove('hidden');
      if (el.adminPinError) el.adminPinError.textContent = '';
      renderAdminList(); renderDashboard(); resetAdminEditor();
      return true;
    } catch (error) {
      var msg=error.message||String(error);
      if(/not allowed|not found/i.test(msg)) msg='Backend ที่ Deploy ยังไม่ใช่ Latest Clean Release: ให้วาง Backend ชุดล่าสุดให้ครบ แล้ว Deploy > Manage deployments > Edit > New version';
      if (el.adminPinError) el.adminPinError.textContent = msg;
      if (window.Swal) Swal.fire('CES AI Training', msg, 'error');
      return false;
    }
  }
  function openAdmin() {
    if (role() !== 'ADMIN') { if (window.Swal) Swal.fire('Permission Denied', 'ADMIN permission is required', 'error'); return; }
    if (el.adminModal) el.adminModal.classList.remove('hidden');
    if (el.adminPinScreen) el.adminPinScreen.classList.add('hidden');
    if (el.adminWorkspace) el.adminWorkspace.classList.remove('hidden');
    loadAdminDirect();
  }
  function closeAdmin() { if (el.adminModal) el.adminModal.classList.add('hidden'); }
  async function verifyAdminPin() { return loadAdminDirect(); }
  function mountTrainingConsole(mount) {
    if (role() !== 'ADMIN') { if(mount)mount.innerHTML='<div class="py-16 text-center text-red-500 font-bold">ADMIN permission is required</div>'; return false; }
    if (!mount || !el.adminWorkspace) return false;
    if (el.adminWorkspace.parentElement !== mount) { mount.innerHTML=''; mount.appendChild(el.adminWorkspace); }
    el.adminWorkspace.classList.remove('hidden');
    el.adminWorkspace.classList.add('ces-ai-admin-workspace-embedded-v229');
    if (el.adminPinScreen) el.adminPinScreen.classList.add('hidden');
    if (el.adminModal) el.adminModal.classList.add('hidden');
    loadAdminDirect();
    return true;
  }

  async function reloadAdmin() {
    try {
      var pair = await Promise.all([
        window.CES_API.callFunction('aiAdminListKnowledge', [adminPayload()], { transport:'jsonp', timeoutMs:45000 }),
        window.CES_API.callFunction('getCesAiTrainingDashboard', [adminPayload()], { transport:'jsonp', timeoutMs:45000 })
      ]);
      state.adminKnowledge = pair[0].knowledge || [];
      state.adminDashboard = pair[1];
      renderAdminList(); renderDashboard();
    } catch (error) {
      if (window.Swal) Swal.fire('Load Error', error.message || String(error), 'error');
    }
  }

  async function loadAdminDashboard() {
    try {
      state.adminDashboard = await window.CES_API.callFunction('getCesAiTrainingDashboard', [adminPayload()], { transport:'jsonp', timeoutMs:45000 });
      renderDashboard();
    } catch (error) { el.adminSummary.textContent = 'Dashboard load failed'; }
  }

  function renderAdminList() {
    var query = normalize(el.adminSearch.value);
    var rows = state.adminKnowledge.filter(function (item) {
      if (!query) return true;
      return normalize([item.title,item.category,list(item.keywords).join(' '),item.answer].join(' ')).indexOf(query) >= 0;
    });
    el.adminList.innerHTML = rows.map(function (item) {
      var active = item.id === state.selectedId ? ' active' : '';
      var inactive = item.status === 'INACTIVE' ? '<small class="inactive">INACTIVE · ' + escapeHtml(item.category) + '</small>' : '<small>' + escapeHtml(item.category) + ' · ' + escapeHtml(list(item.keywords).slice(0,3).join(', ')) + '</small>';
      return '<div class="ces-ai-admin-list-item' + active + '" data-ai-kb-id="' + escapeHtml(item.id) + '"><strong>' + escapeHtml(item.title) + '</strong>' + inactive + '</div>';
    }).join('') || '<div style="padding:20px;text-align:center;color:#94a3b8;font-size:11px">ไม่พบรายการ</div>';
    el.adminList.querySelectorAll('[data-ai-kb-id]').forEach(function (node) {
      node.addEventListener('click', function () { editAdminEntry(node.getAttribute('data-ai-kb-id')); });
    });
    if (el.adminSummary && !state.adminDashboard) el.adminSummary.textContent = rows.length + ' entries';
  }

  function renderDashboard() {
    var d = state.adminDashboard || {}; var stats = d.stats || {};
    var avg = stats.evaluationAverages || {};
    var ratingText = Number(stats.evaluationCount || 0) > 0
      ? ' · Ratings ' + Number(stats.evaluationCount || 0) + ': ใช้งาน ' + Number(avg.ease || 0).toFixed(1) + '★ / เร็ว ' + Number(avg.speed || 0).toFixed(1) + '★ / ครบ ' + Number(avg.completeness || 0).toFixed(1) + '★'
      : '';
    el.adminSummary.textContent = (stats.activeKnowledge || 0) + ' active · ' + (stats.uniqueUnanswered || 0) + ' unanswered · ' + (stats.negativeFeedback || 0) + ' negative feedback' + ratingText;
    var rows = d.unanswered || [];
    el.adminUnanswered.innerHTML = rows.map(function (item, index) {
      return '<div class="ces-ai-unanswered-row"><div><strong>' + escapeHtml(item.question) + '</strong><small>พบ ' + Number(item.count || 1) + ' ครั้ง · หน้า ' + escapeHtml(item.currentTab || '-') + ' · ล่าสุด ' + escapeHtml(item.latestAt || '-') + '</small></div><button type="button" data-ai-train-index="' + index + '">สร้างคำตอบ</button></div>';
    }).join('') || '<div style="padding:18px;text-align:center;color:#94a3b8;font-size:11px">ยังไม่มีคำถามที่ต้อง Training</div>';
    el.adminUnanswered.querySelectorAll('[data-ai-train-index]').forEach(function (node) {
      node.addEventListener('click', function () {
        var item = rows[Number(node.getAttribute('data-ai-train-index'))];
        resetAdminEditor();
        el.fieldPatterns.value = item.question || '';
        el.fieldTab.value = item.currentTab || '';
        el.fieldTitle.focus();
      });
    });
  }

  function editAdminEntry(id) {
    var item = state.adminKnowledge.find(function (x) { return x.id === id; });
    if (!item) return;
    state.selectedId = id;
    el.fieldId.value = item.id || '';
    el.fieldCategory.value = item.category || '';
    el.fieldTitle.value = item.title || '';
    el.fieldPatterns.value = list(item.questionPatterns).join(' | ');
    el.fieldKeywords.value = list(item.keywords).join(' | ');
    el.fieldAnswer.value = item.answer || '';
    el.fieldTab.value = item.targetTab || '';
    el.fieldPriority.value = Number(item.priority || 50);
    el.fieldRoles.value = list(item.allowedRoles).join(' | ');
    el.fieldTeams.value = list(item.allowedTeams).join(' | ');
    el.fieldStatus.value = item.status || 'ACTIVE';
    el.fieldNotes.value = item.notes || '';
    el.adminEditorTitle.textContent = 'แก้ไขคำตอบ'; el.adminEntryId.textContent = item.id;
    el.adminDelete.classList.remove('hidden'); renderAdminList();
  }

  function resetAdminEditor() {
    state.selectedId = '';
    ['fieldId','fieldCategory','fieldTitle','fieldPatterns','fieldKeywords','fieldAnswer','fieldRoles','fieldTeams','fieldNotes'].forEach(function (k) { if (el[k]) el[k].value = ''; });
    el.fieldTab.value = ''; el.fieldPriority.value = '50'; el.fieldStatus.value = 'ACTIVE';
    el.adminEditorTitle.textContent = 'เพิ่มคำตอบใหม่'; el.adminEntryId.textContent = 'NEW'; el.adminDelete.classList.add('hidden'); renderAdminList();
  }

  function collectAdminEntry() {
    return {
      id:el.fieldId.value.trim(), category:el.fieldCategory.value.trim(), title:el.fieldTitle.value.trim(),
      questionPatterns:list(el.fieldPatterns.value), keywords:list(el.fieldKeywords.value), answer:el.fieldAnswer.value.trim(),
      targetTab:el.fieldTab.value, priority:Number(el.fieldPriority.value || 50), allowedRoles:list(el.fieldRoles.value),
      allowedTeams:list(el.fieldTeams.value), status:el.fieldStatus.value, notes:el.fieldNotes.value.trim()
    };
  }

  async function saveAdminEntry() {
    var entry = collectAdminEntry();
    if (!entry.title || !entry.answer) { if (window.Swal) Swal.fire('ข้อมูลไม่ครบ', 'กรุณากรอกชื่อหัวข้อและคำตอบ', 'warning'); return; }
    el.adminSave.disabled = true;
    try {
      var res = await window.CES_API.callFunction('saveCesAiKnowledgeEntry', [adminPayload({ entry:entry })], { transport:'iframe', timeoutMs:120000 });
      if (!res || res.success === false) throw new Error((res && res.message) || 'Save failed');
      localStorage.removeItem(CACHE_KEY); await reloadAdmin(); await loadKnowledge(true); editAdminEntry(res.id);
      if (window.Swal) Swal.fire({icon:'success',title:'Saved',text:'Knowledge Base อัปเดตแล้ว',timer:1400,showConfirmButton:false});
    } catch (error) { if (window.Swal) Swal.fire('Save Error', error.message || String(error), 'error'); }
    finally { el.adminSave.disabled = false; }
  }

  async function deleteAdminEntry() {
    var id = el.fieldId.value.trim(); if (!id) return;
    var confirmed = true;
    if (window.Swal) {
      var choice = await Swal.fire({icon:'warning',title:'ลบคำตอบนี้?',text:el.fieldTitle.value,showCancelButton:true,confirmButtonText:'Delete'});
      confirmed = choice.isConfirmed;
    }
    if (!confirmed) return;
    try {
      await window.CES_API.callFunction('deleteCesAiKnowledgeEntry', [adminPayload({ id:id })], { transport:'iframe', timeoutMs:90000 });
      localStorage.removeItem(CACHE_KEY); resetAdminEditor(); await reloadAdmin(); await loadKnowledge(true);
    } catch (error) { if (window.Swal) Swal.fire('Delete Error', error.message || String(error), 'error'); }
  }

  async function seedStarterKnowledge() {
    if (!window.CES_API) return;
    var confirmed = true;
    if (window.Swal) {
      var choice = await Swal.fire({
        icon:'question', title:'เพิ่ม Starter Knowledge?',
        text:'ระบบจะเพิ่มเฉพาะหัวข้อเริ่มต้นที่ยังไม่มี และไม่เขียนทับคำตอบที่แก้ไขแล้ว',
        showCancelButton:true, confirmButtonText:'เพิ่มข้อมูลเริ่มต้น'
      });
      confirmed = choice.isConfirmed;
    }
    if (!confirmed) return;
    if (el.adminSeed) el.adminSeed.disabled = true;
    try {
      var res = await window.CES_API.callFunction('aiAdminSeedStarterKnowledge', [adminPayload()], { transport:'iframe', timeoutMs:120000 });
      localStorage.removeItem(CACHE_KEY);
      await reloadAdmin();
      await loadKnowledge(true);
      if (window.Swal) Swal.fire({icon:'success',title:'Starter Knowledge พร้อมใช้',text:'เพิ่มใหม่ ' + Number(res.inserted || 0) + ' รายการ · มีอยู่แล้ว ' + Number(res.skipped || 0) + ' รายการ'});
    } catch (error) {
      if (window.Swal) Swal.fire('Seed Error', error.message || String(error), 'error');
    } finally { if (el.adminSeed) el.adminSeed.disabled = false; }
  }

  async function openMainSheet() {
    try {
      var info = await window.CES_API.callFunction('getCesAiDatabaseInfo', [adminPayload()], { transport:'jsonp', timeoutMs:30000 });
      if (info && info.spreadsheetUrl) window.open(info.spreadsheetUrl, '_blank', 'noopener');
      else throw new Error('AI database URL unavailable');
    } catch (error) { if (window.Swal) Swal.fire('Google Sheet', error.message || String(error), 'error'); }
  }

  function bindElements() {
    el.root = document.getElementById('ces-ai-local-root');
    if (!el.root || el.root.dataset.bound === '1') return false;
    // Keep the assistant outside #ces-app-stage so desktop scaling does not resize or clip it.
    if (el.root.parentElement !== document.body) document.body.appendChild(el.root);
    el.root.dataset.bound = '1';
    el.launcher = document.getElementById('ces-ai-local-launcher'); el.panel = document.getElementById('ces-ai-local-panel');
    el.statusDot = document.getElementById('ces-ai-local-status-dot'); el.statusText = document.getElementById('ces-ai-local-status-text');
    el.adminBtn = document.getElementById('ces-ai-local-admin'); el.refresh = document.getElementById('ces-ai-local-refresh');
    el.clear = document.getElementById('ces-ai-local-clear'); el.close = document.getElementById('ces-ai-local-close');
    el.messages = document.getElementById('ces-ai-local-messages'); el.form = document.getElementById('ces-ai-local-form');
    el.quickToggle = document.getElementById('ces-ai-quick-toggle'); el.quickSuggestions = document.getElementById('ces-ai-local-suggestions');
    el.input = document.getElementById('ces-ai-local-input'); el.send = document.getElementById('ces-ai-local-send');
    el.adminModal = document.getElementById('ces-ai-admin-modal'); el.adminClose = document.getElementById('ces-ai-admin-close');
    el.adminWorkspace = document.getElementById('ces-ai-admin-workspace');
    el.adminPinScreen = null; el.adminPin = null; el.adminPinSubmit = null; el.adminPinError = null;
    el.adminNew = document.getElementById('ces-ai-admin-new');
    el.adminReload = document.getElementById('ces-ai-admin-reload'); el.adminSeed = document.getElementById('ces-ai-admin-seed'); el.adminOpenSheet = document.getElementById('ces-ai-admin-open-sheet');
    el.adminSummary = document.getElementById('ces-ai-admin-summary'); el.adminSearch = document.getElementById('ces-ai-admin-search');
    el.adminList = document.getElementById('ces-ai-admin-list'); el.adminUnanswered = document.getElementById('ces-ai-admin-unanswered');
    el.adminEditorTitle = document.getElementById('ces-ai-admin-editor-title'); el.adminEntryId = document.getElementById('ces-ai-admin-entry-id');
    el.fieldId = document.getElementById('ces-ai-field-id'); el.fieldCategory = document.getElementById('ces-ai-field-category');
    el.fieldTitle = document.getElementById('ces-ai-field-title'); el.fieldPatterns = document.getElementById('ces-ai-field-patterns');
    el.fieldKeywords = document.getElementById('ces-ai-field-keywords'); el.fieldAnswer = document.getElementById('ces-ai-field-answer');
    el.fieldTab = document.getElementById('ces-ai-field-tab'); el.fieldPriority = document.getElementById('ces-ai-field-priority');
    el.fieldRoles = document.getElementById('ces-ai-field-roles'); el.fieldTeams = document.getElementById('ces-ai-field-teams');
    el.fieldStatus = document.getElementById('ces-ai-field-status'); el.fieldNotes = document.getElementById('ces-ai-field-notes');
    el.adminSave = document.getElementById('ces-ai-admin-save'); el.adminDelete = document.getElementById('ces-ai-admin-delete');
    el.adminReset = document.getElementById('ces-ai-admin-reset');
    el.evalPopup = document.getElementById('ces-ai-evaluation-popup'); el.evalClose = document.getElementById('ces-ai-evaluation-close');
    el.footer = document.getElementById('ces-ai-local-footer');
    el.evalScopes = document.getElementById('ces-ai-eval-scopes');
    el.evalEase = document.getElementById('ces-ai-eval-ease'); el.evalSpeed = document.getElementById('ces-ai-eval-speed'); el.evalCompleteness = document.getElementById('ces-ai-eval-completeness');
    el.evalSuggestion = document.getElementById('ces-ai-eval-suggestion'); el.evalError = document.getElementById('ces-ai-eval-error'); el.evalSubmit = document.getElementById('ces-ai-eval-submit');
    bindEvaluationScopes(); initEvaluationStars(el.evalEase,'ease'); initEvaluationStars(el.evalSpeed,'speed'); initEvaluationStars(el.evalCompleteness,'completeness');
    return true;
  }

  function handleGlobalShortcut(event) {
    if (!event.altKey || event.ctrlKey || event.metaKey) return;
    var key=String(event.key||'').toLowerCase();
    if(key==='a'){event.preventDefault();openPanel();return;}
    if(['1','2','3','4'].indexOf(key)>=0){
      var node=document.querySelector('[data-ces-ai-shortcut="'+key+'"]');
      if(node){event.preventDefault();openPanel();ask(node.getAttribute('data-ces-ai-question'));}
    }
  }

  function applyQuickAskCollapsed(collapsed) {
    if (!el.quickSuggestions) return;
    el.quickSuggestions.classList.toggle('ces-ai-quick-collapsed', !!collapsed);
    if (el.quickToggle) {
      el.quickToggle.classList.toggle('collapsed', !!collapsed);
      var icon=el.quickToggle.querySelector('i');if(icon){icon.className='fas '+(collapsed?'fa-chevron-down':'fa-chevron-up');}
      el.quickToggle.setAttribute('aria-expanded',collapsed?'false':'true');
    }
    try{localStorage.setItem('CES_AI_QUICK_COLLAPSED',collapsed?'1':'0');}catch(ignore){}
  }

  function init() {
    if (!bindElements()) { syncVisibility(); return; }
    el.launcher.addEventListener('click', function () { el.panel.classList.contains('hidden') ? openPanel() : closePanel(); });
    el.close.addEventListener('click', closePanel); if(el.clear)el.clear.addEventListener('click', clearChat);
    if(el.quickToggle){
      var quickCollapsed=false;try{quickCollapsed=localStorage.getItem('CES_AI_QUICK_COLLAPSED')==='1';}catch(ignore){}
      applyQuickAskCollapsed(quickCollapsed);
      el.quickToggle.addEventListener('click',function(){applyQuickAskCollapsed(!el.quickSuggestions.classList.contains('ces-ai-quick-collapsed'));});
    }
    el.refresh.addEventListener('click', async function () { el.refresh.querySelector('i').classList.add('fa-spin'); localStorage.removeItem(CACHE_KEY); await loadKnowledge(true); el.refresh.querySelector('i').classList.remove('fa-spin'); });
    el.form.addEventListener('submit', function (event) { event.preventDefault(); var value = el.input.value; el.input.value = ''; ask(value); });
    el.input.addEventListener('keydown', function (event) { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); el.form.requestSubmit(); } });
    document.querySelectorAll('[data-ces-ai-question]').forEach(function (node) { node.addEventListener('click', function () { ask(node.getAttribute('data-ces-ai-question')); }); });
    document.querySelectorAll('[data-ces-ai-evaluation-shortcut]').forEach(function(node){node.addEventListener('click',function(){openEvaluationPopup('',{id:'WEBSITE-EVALUATION',title:'CES Hub Website Evaluation',score:100,targetTab:currentTab()});});});
    if(el.adminBtn)el.adminBtn.addEventListener('click', openAdmin); if(el.adminClose)el.adminClose.addEventListener('click', closeAdmin);
    el.adminModal.addEventListener('click', function (event) { if (event.target === el.adminModal) closeAdmin(); });
    el.adminNew.addEventListener('click', resetAdminEditor); el.adminReload.addEventListener('click', reloadAdmin); if (el.adminSeed) el.adminSeed.addEventListener('click', seedStarterKnowledge); el.adminOpenSheet.addEventListener('click', openMainSheet);
    el.adminSearch.addEventListener('input', renderAdminList); el.adminSave.addEventListener('click', saveAdminEntry); el.adminDelete.addEventListener('click', deleteAdminEntry); el.adminReset.addEventListener('click', resetAdminEditor);
    if(el.evalClose)el.evalClose.addEventListener('click',closeEvaluationPopup); if(el.evalSubmit)el.evalSubmit.addEventListener('click',submitEvaluationPopup); if(el.evalPopup)el.evalPopup.addEventListener('click',function(event){if(event.target===el.evalPopup)closeEvaluationPopup();});
    loadHistory(); syncVisibility(); // Knowledge loads on first AI open/question to reduce login sync load.
    setInterval(syncVisibility, 5000);
    document.addEventListener('ces:language-changed', syncVisibility);
    document.addEventListener('keydown',handleGlobalShortcut);
    // V22.4: no automatic Website Evaluation popup after AI answers.
  }

  window.CES_AI_LOCAL = {
    init:init,
    ask:ask,
    answerLocally:answerLocally,
    refreshKnowledge:function () { localStorage.removeItem(CACHE_KEY); return loadKnowledge(true); },
    open:openPanel,
    openAdmin:openAdmin,
    mountTrainingConsole:mountTrainingConsole,
    seedStarterKnowledge:seedStarterKnowledge,
    getState:function () { return { version:VERSION, ready:state.ready, count:state.knowledge.length, source:state.source, onlineStatus:state.onlineStatus }; },
    refreshOnlineStatus:refreshOnlineStatus
  };

  window.addEventListener('ces:app-ready', init);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 0); });
  else setTimeout(init, 0);
})();
