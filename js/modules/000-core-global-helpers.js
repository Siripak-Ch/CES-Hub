/**
 * 000-core-global-helpers.js
 * Shared frontend helpers loaded before every module.
 * Fixes legacy module errors such as: spEsc is not defined.
 */
(function (window, document) {
  'use strict';

  function text(v) { return v === null || v === undefined ? '' : String(v); }

  function esc(v) {
    return text(v).replace(/[&<>"']/g, function (m) {
      return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[m];
    });
  }

  function num(v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    var n = Number(text(v).replace(/[,฿%\s]/g, ''));
    return isFinite(n) ? n : 0;
  }

  function fmt(v, digit) {
    return num(v).toLocaleString('en-US', { maximumFractionDigits: digit == null ? 0 : digit });
  }

  function setHtml(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html == null ? '' : String(html);
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value == null ? '' : String(value);
  }

  function val(id, fallback) {
    var el = document.getElementById(id);
    return el ? el.value : (fallback == null ? '' : fallback);
  }

  function normStatus(input) {
    var s = text(input).replace(/\s+/g, ' ').trim();
    var c = s.replace(/\s+/g, '').toLowerCase();
    if (!s) return '';
    if (/ไม่พบ|missing|notfound|lost/.test(c)) return 'ไม่พบในรายการ';
    if (/ใช้งานไม่ได้|ชำรุด|เสีย|broken|damage|notworking|outofservice/.test(c)) return 'ใช้งานไม่ได้';
    if (/เช่ายืม|เช่า|ยืม|rental|rent|borrow|loan|checkout|check-out/.test(c) && !/คืน|return|returned/.test(c)) return 'เช่ายืม';
    if (/พร้อมส่ง|ready|available|passed|cf|calpm|cal\/pm/.test(c) && !/รอ|pending|wait/.test(c)) return 'พร้อมส่ง';
    if (/รอสอบเทียบ|pending|waiting|calibration|สอบเทียบ|warehouse|คลัง/.test(c)) return 'รอสอบเทียบ';
    return s;
  }

  window.spEsc = window.spEsc || esc;
  window.spNum = window.spNum || fmt;
  window.spSetHtml = window.spSetHtml || setHtml;
  window.spSetText = window.spSetText || setText;
  window.spVal = window.spVal || val;
  window.spNormStatus = window.spNormStatus || normStatus;
  window.CES_SAFE = window.CES_SAFE || { esc: esc, num: num, fmt: fmt, setHtml: setHtml, setText: setText, val: val, normStatus: normStatus };

  // ============================================================
  // CES Hub V41 — single source of truth for team colors.
  // Values are read from Config and exposed as CSS variables so
  // cards, charts, tables and generated UI stay consistent.
  // ============================================================
  var TEAM_COLOR_DEFAULTS_V41 = {
    MED:'#004aad', LAB:'#19a7ce', EHS:'#0fc1a1', ENV:'#7ed957',
    TES:'#ffde59', QM:'#f97316', MNG:'#b4b4b4', MGT:'#b4b4b4', OTHER:'#b4b4b4', ALL:'#475569'
  };

  function normalizeTeamV41(team) {
    var value = text(team).trim().toUpperCase();
    if (value === 'MANAGEMENT' || value === 'MGT' || value === 'OTHER' || !value) return 'MNG';
    return value;
  }

  function validHexV41(value) {
    var v = text(value).trim();
    if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
    if (/^[0-9a-f]{6}$/i.test(v)) return ('#' + v).toLowerCase();
    return '';
  }

  function readConfigV41() {
    try {
      if (typeof globalConfig !== 'undefined' && globalConfig && typeof globalConfig === 'object') return globalConfig;
    } catch (ignoreGlobal) {}
    if (window.globalConfig && typeof window.globalConfig === 'object') return window.globalConfig;
    try {
      var cached = JSON.parse(localStorage.getItem('ces_system_settings_v21') || 'null');
      if (cached && cached.data && typeof cached.data === 'object') return cached.data;
    } catch (ignoreCache) {}
    return {};
  }

  function teamColorV41(team, config) {
    var code = normalizeTeamV41(team);
    var cfg = config || readConfigV41();
    var key = 'TEAM_COLOR_' + code;
    var value = validHexV41(cfg[key]);
    if (!value && code === 'MNG') value = validHexV41(cfg.TEAM_COLOR_MGT);
    return value || TEAM_COLOR_DEFAULTS_V41[code] || TEAM_COLOR_DEFAULTS_V41.MNG;
  }

  function hexRgbV41(hex) {
    var value = validHexV41(hex) || '#64748b';
    return {r:parseInt(value.slice(1,3),16), g:parseInt(value.slice(3,5),16), b:parseInt(value.slice(5,7),16)};
  }

  function mixV41(hex, whiteRatio) {
    var rgb = hexRgbV41(hex), p = Math.max(0, Math.min(1, Number(whiteRatio == null ? .88 : whiteRatio)));
    var c = function(v){ return Math.round(v * (1-p) + 255 * p).toString(16).padStart(2,'0'); };
    return '#' + c(rgb.r) + c(rgb.g) + c(rgb.b);
  }

  function readableTextV41(hex) {
    var c = hexRgbV41(hex);
    var channel = function(v){ v=v/255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); };
    var lum = 0.2126*channel(c.r) + 0.7152*channel(c.g) + 0.0722*channel(c.b);
    var whiteContrast = 1.05 / (lum + 0.05);
    var darkLum = 0.0085; // approximately #0f172a
    var darkContrast = (lum + 0.05) / (darkLum + 0.05);
    return darkContrast >= whiteContrast ? '#0f172a' : '#ffffff';
  }

  function teamStyleV41(team, config) {
    var color = teamColorV41(team, config);
    return { color:color, text:readableTextV41(color), soft:mixV41(color,.88), border:mixV41(color,.62) };
  }

  function applyTeamColorConfigV41(config) {
    var cfg = config || readConfigV41();
    var root = document.documentElement;
    ['MED','LAB','EHS','ENV','TES','QM','MNG'].forEach(function(team){
      var color = teamColorV41(team, cfg);
      root.style.setProperty('--ces-team-' + team.toLowerCase(), color);
      root.style.setProperty('--ces-team-' + team.toLowerCase() + '-soft', mixV41(color,.88));
      root.style.setProperty('--ces-team-' + team.toLowerCase() + '-border', mixV41(color,.62));
      root.style.setProperty('--ces-team-' + team.toLowerCase() + '-text', readableTextV41(color));
    });
    // MGT is a UI alias of MNG.
    root.style.setProperty('--ces-team-mgt', teamColorV41('MNG', cfg));
    root.style.setProperty('--ces-team-mgt-soft', mixV41(teamColorV41('MNG', cfg),.88));

    document.querySelectorAll('[data-ces-team]').forEach(function(el){
      var style = teamStyleV41(el.getAttribute('data-ces-team'), cfg);
      el.style.setProperty('--ces-team-color', style.color);
      el.style.setProperty('--ces-team-soft', style.soft);
      el.style.setProperty('--ces-team-border', style.border);
      el.style.setProperty('--ces-team-text', style.text);
    });
    try { window.dispatchEvent(new CustomEvent('ces:team-colors-updated', {detail:{config:cfg}})); } catch(ignoreEvent) {}
    return cfg;
  }



  // ============================================================
  // Canonical external-link resolver. Config sheet values have
  // priority; frontend defaults are used only when Config is blank.
  // ============================================================
  var CES_LINK_CONFIG_KEYS = {
    SERVICE_CSI_CES_SUMMARY:'LINK_SERVICE_CSI_CES_SUMMARY',
    SERVICE_CSI_TES_SUMMARY:'LINK_SERVICE_CSI_TES_SUMMARY',
    REPORT_CSI_SUMMARY:'LINK_REPORT_CSI_SUMMARY',
    REVENUE_DASHBOARD:'LINK_REVENUE_DASHBOARD',
    KPI_EHS_SHEET:'LINK_KPI_EHS_SHEET',
    KPI_LAB_SHEET:'LINK_KPI_LAB_SHEET',
    MEMO_WORKORDER_SOURCE:'LINK_MEMO_WORKORDER_SOURCE',
    TRAINING_PLAN_2026:'LINK_TRAINING_PLAN_2026'
  };
  function cesExternalLink(key) {
    key = text(key).trim().toUpperCase();
    var cfg = readConfigV41();
    var configKey = CES_LINK_CONFIG_KEYS[key] || ('LINK_' + key);
    var configured = text(cfg[configKey]).trim();
    if (configured) return configured;
    var defaults = window.CES_CONFIG && window.CES_CONFIG.EXTERNAL_LINKS || {};
    return text(defaults[key]).trim();
  }
  function cesOpenExternalLink(key) {
    var url = cesExternalLink(key);
    if (!url) {
      if (window.Swal) window.Swal.fire('Link not configured', key, 'info');
      return false;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    return true;
  }
  window.cesExternalLink = cesExternalLink;
  window.cesOpenExternalLink = cesOpenExternalLink;

  window.CES_TEAM_COLOR_DEFAULTS = TEAM_COLOR_DEFAULTS_V41;
  window.cesNormalizeTeamCode = normalizeTeamV41;
  window.cesGetTeamColor = teamColorV41;
  window.cesGetTeamStyle = teamStyleV41;
  window.cesReadableTextColor = readableTextV41;
  window.cesMixTeamColor = mixV41;
  window.cesApplyTeamColorConfig = applyTeamColorConfigV41;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ applyTeamColorConfigV41(); });
  else applyTeamColorConfigV41();

  window.CES_CORE_HELPERS_RECHECK = function () {
    return {
      ok: true,
      hasSpEsc: typeof window.spEsc === 'function',
      hasSpNum: typeof window.spNum === 'function',
      hasGasApi: !!(window.CES_API && typeof window.CES_API.callFunction === 'function'),
      gasUrl: window.CES_CONFIG && window.CES_CONFIG.GAS_API_URL || '',
      teamColors: ['MED','LAB','EHS','ENV','TES','QM','MNG'].reduce(function(out,t){out[t]=teamColorV41(t);return out;},{})
    };
  };
})(window, document);
