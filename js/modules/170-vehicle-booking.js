// ============================================================
// CES Hub V31 — Vehicle Booking Stable Request / Return
// - Uses the current logged-in profile automatically.
// - Loads onsite jobs from Calendar_Summary by selected team.
// - Displays booking availability even before API data arrives.
// - Supports return bill / receipt file upload.
// - Uses only the V31 public API names.
// ============================================================

const CES_BOOKING_V31 = {
  version: 'V55',
  allowedTeams: ['MED', 'LAB', 'EHS', 'ENV', 'TES', 'MNG'],
  testEmail: '',
  productionEmail: true,
  ccEmail: 'Siripak.Ch@nhealth-asia.com, Thippayawaree.Kh@nhealth-asia.com',
  workspaceCacheMs: (window.CES_CONFIG&&window.CES_CONFIG.PERFORMANCE&&Number(window.CES_CONFIG.PERFORMANCE.VEHICLE_CACHE_TTL_MS)) || 5 * 60 * 1000,
  planCacheMs: 20 * 60 * 1000,
  inFlight: { CAR:false, VAN:false, CAR_RETURN:false, VAN_RETURN:false },
  state: {
    CAR: { loaded:false, loadingPromise:null, lastLoadedAt:0, rows:[], plans:[], approvers:[], signatures:[], profile:null, summary:{}, month:new Date(), mode:'REQUEST', userKey:'', team:'' },
    VAN: { loaded:false, loadingPromise:null, lastLoadedAt:0, rows:[], plans:[], approvers:[], signatures:[], profile:null, summary:{}, month:new Date(), mode:'REQUEST', userKey:'', team:'' }
  }
};

// Legacy state alias retained for older modules and diagnostics.
const CES_BOOKINGS = CES_BOOKING_V31.state;
const CES_BOOKING_CACHE_PREFIX = 'ces_vehicle_workspace_v55_';
const CES_BOOKING_PLAN_CACHE_PREFIX = 'ces_vehicle_plans_v55_';
const CES_BOOKING_ALLOWED_TEAMS = CES_BOOKING_V31.allowedTeams;

function cesBookType_(type) {
  return String(type || 'CAR').toUpperCase() === 'VAN' ? 'VAN' : 'CAR';
}
function cesBookPrefix_(type) {
  return cesBookType_(type) === 'VAN' ? 'van' : 'car';
}
function cesBookEsc_(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function(ch) {
    return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch];
  });
}
function cesBookSet_(id, value) {
  var el = document.getElementById(id);
  if (el) el.value = value == null ? '' : value;
}
function cesBookGet_(id) {
  var el = document.getElementById(id);
  return el ? el.value : '';
}
function cesBookDateRange_(startValue, endValue) {
  var startKey = cesBookingDateKey_(startValue);
  var endKey = cesBookingDateKey_(endValue || startValue) || startKey;
  if (!startKey || !endKey) return [];
  var start = new Date(startKey + 'T00:00:00');
  var end = new Date(endKey + 'T00:00:00');
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return [];
  var out = [];
  for (var d = new Date(start); d <= end && out.length < 370; d.setDate(d.getDate() + 1)) {
    out.push(d.getFullYear() + '-' + ('0' + (d.getMonth()+1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2));
  }
  return out;
}
function cesBookClearInvalid_(type) {
  var root = document.getElementById('view-' + cesBookPrefix_(type) + '_booking');
  if (!root) return;
  root.querySelectorAll('.ces-book-invalid').forEach(function(el) {
    el.classList.remove('ces-book-invalid'); el.removeAttribute('aria-invalid');
  });
}
function cesBookMarkMissing_(type, items, title) {
  cesBookClearInvalid_(type);
  var missing = [];
  (items || []).forEach(function(item) {
    if (!item || !item.missing) return;
    var el = document.getElementById(item.id);
    if (el) { el.classList.add('ces-book-invalid'); el.setAttribute('aria-invalid','true'); }
    missing.push({ label:item.label, el:el });
  });
  if (!missing.length) return false;
  var first = missing.find(function(x){ return x.el; });
  Swal.fire({
    title:title || 'กรอกข้อมูลไม่ครบ',
    html:'<div class="text-left text-sm"><p class="mb-2 text-slate-500">กรุณากรอกข้อมูลที่จำเป็นในช่องกรอบสีแดงก่อนส่ง:</p><ul class="list-disc pl-5 space-y-1">' + missing.map(function(x){ return '<li>' + cesBookEsc_(x.label) + '</li>'; }).join('') + '</ul></div>',
    icon:'warning', confirmButtonColor:'#003DA5'
  }).then(function(){ if(first && first.el){ first.el.scrollIntoView({behavior:'smooth',block:'center'}); setTimeout(function(){ first.el.focus(); },250); } });
  return true;
}
function cesBookAttachInvalidClear_(type) {
  var root = document.getElementById('view-' + cesBookPrefix_(type) + '_booking');
  if (!root || root.dataset.invalidClearV37 === '1') return;
  root.dataset.invalidClearV37 = '1';
  ['input','change'].forEach(function(evt){ root.addEventListener(evt, function(e){ if(e.target && e.target.classList && e.target.classList.contains('ces-book-invalid')){ e.target.classList.remove('ces-book-invalid'); e.target.removeAttribute('aria-invalid'); } }, true); });
}
function cesBookToday_() {
  var now = new Date();
  var local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}
function cesBookNowTime_() {
  return new Date().toTimeString().slice(0, 5);
}
function cesBookMoney_(value) {
  return '฿' + Number(value || 0).toLocaleString('th-TH', { maximumFractionDigits:2 });
}
function cesBookNumber_(value) {
  return Number(value || 0).toLocaleString('th-TH', { maximumFractionDigits:1 });
}
function cesBookStatusClass_(status) {
  var s = String(status || '').toUpperCase();
  if (s === 'COMPLETED') return 'bg-blue-50 text-blue-700 border border-blue-100';
  if (s === 'CONFIRMED' || s === 'IN_PROGRESS') return 'bg-blue-50 text-[#003DA5] border border-blue-100';
  if (s === 'PENDING_APPROVAL') return 'bg-slate-100 text-slate-700 border border-slate-200';
  if (s === 'REJECTED' || s === 'CANCELLED') return 'bg-red-50 text-red-600';
  return 'bg-slate-100 text-slate-600';
}

function cesBookTeamClass_(team) {
  var value = String(team || '').toUpperCase();
  if (value === 'MED') return 'ces-team-code ces-team-med';
  if (value === 'LAB') return 'ces-team-code ces-team-lab';
  if (value === 'EHS') return 'ces-team-code ces-team-ehs';
  if (value === 'ENV') return 'ces-team-code ces-team-env';
  if (value === 'TES') return 'ces-team-code ces-team-tes';
  return 'ces-team-code ces-team-default';
}

function cesBookingCurrentUser_() {
  var live = null;
  try {
    if (typeof currentUser !== 'undefined' && currentUser && (currentUser.id || currentUser.userId)) live = currentUser;
  } catch (ignore) {}
  if (!live && window.CES_CURRENT_USER) live = window.CES_CURRENT_USER;

  var saved = null;
  try { saved = JSON.parse(localStorage.getItem('ces_user') || 'null'); } catch (ignore2) {}
  var user = live || saved || {};
  return {
    id: String(user.id || user.userId || user.empId || '').trim(),
    name: user.name_eng || user.nameEng || user.name_th || user.nameTh || user.name || '',
    nameEng: user.name_eng || user.nameEng || '',
    nameTh: user.name_th || user.nameTh || '',
    team: String(user.team || '').trim().toUpperCase(),
    position: user.position || '',
    email: user.email || '',
    tel: user.tel || user.phone || '',
    role: String(user.role || '').trim().toUpperCase()
  };
}
function cesBookUser_() { return cesBookingCurrentUser_(); }
function cesBookingUserKey_() {
  var u = cesBookingCurrentUser_();
  return [u.id, u.email, u.team].join('|');
}

function cesBookingInjectStyles_() {
  if (document.getElementById('ces-booking-v31-style')) return;
  var style = document.createElement('style');
  style.id = 'ces-booking-v31-style';
  style.textContent = [
    '.vehicle-mode-btn{padding:10px 12px;border-radius:12px;font-size:12px;font-weight:900;color:#64748b;transition:.2s}',
    '.vehicle-mode-btn.active{background:#fff;color:#003DA5;box-shadow:0 4px 14px rgba(15,23,42,.08)}',
    '.vehicle-calendar-nav{width:36px;height:36px;border-radius:11px;border:1px solid #dbe7f5;background:#fff;color:#003DA5}',
    '.vehicle-calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px}',
    '.vehicle-calendar-weekday{padding:7px;text-align:center;font-size:10px;font-weight:900;color:#94a3b8;text-transform:uppercase}',
    '.vehicle-calendar-day{min-height:76px;border:1px solid #e2e8f0;border-radius:14px;padding:8px;background:#fff;position:relative;overflow:hidden}',
    '.vehicle-calendar-day.muted{opacity:.38}',
    '.vehicle-calendar-day.available{border-color:#e2e8f0;background:#ffffff}',
    '.vehicle-calendar-day.pending{border-color:#93c5fd;background:#eff6ff}',
    '.vehicle-calendar-day.unavailable{border-color:#fca5a5;background:#fef2f2}',
    '.vehicle-calendar-day.completed{border-color:#60a5fa;background:#dbeafe}',
    '.vehicle-calendar-day.partial{border-color:#fbbf24;background:#fffbeb;cursor:pointer}',
    '.vehicle-calendar-day.available{cursor:pointer}',
    '.vehicle-calendar-day.unavailable{cursor:pointer}',
    '.ces-booking-usage-pie{width:58px;height:58px;border-radius:50%;display:grid;place-items:center;position:relative;background:conic-gradient(#004aad var(--usage,0%),#e2e8f0 0)}',
    '.ces-booking-usage-pie:after{content:"";position:absolute;inset:8px;border-radius:50%;background:#fff}',
    '.ces-booking-usage-pie span{position:relative;z-index:1;font-size:10px;font-weight:900;color:#334155}',
    '.vehicle-calendar-number{font-size:12px;font-weight:900;color:#334155}',
    '.vehicle-calendar-state{font-size:9px;font-weight:900;margin-top:10px;line-height:1.2}',
    '.vehicle-calendar-count{position:absolute;right:7px;top:7px;min-width:18px;height:18px;border-radius:9px;padding:0 5px;display:grid;place-items:center;font-size:8px;font-weight:900;background:#fff;border:1px solid rgba(148,163,184,.35)}',
    '.ces-book-input{width:100%;border:1px solid #dbe7f5;background:#f8fbff;border-radius:12px;padding:10px 12px;outline:none}',
    '.ces-book-input:focus{border-color:#60a5fa;box-shadow:0 0 0 3px #dbeafe}',
    '.ces-book-input.ces-book-invalid{border:2px solid #ef4444!important;background:#fff1f2!important;box-shadow:0 0 0 4px rgba(239,68,68,.12)!important;animation:cesBookPulseV37 1.2s ease-in-out 2}',
    '@keyframes cesBookPulseV37{0%,100%{transform:translateX(0)}25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}',
    '.ces-form-label{display:block;font-size:10px;font-weight:900;color:#52647a;text-transform:uppercase;letter-spacing:.03em;margin-bottom:6px}',
    '.ces-booking-usage-pie{flex:0 0 auto;min-width:58px;min-height:58px}',
    '#view-car_booking,#view-van_booking{font-size:12px;padding:.5rem!important;row-gap:.75rem!important}',
    '#view-car_booking .p-5,#view-van_booking .p-5{padding:.85rem!important}',
    '#view-car_booking .p-4,#view-van_booking .p-4{padding:.7rem!important}',
    '#view-car_booking .gap-5,#view-van_booking .gap-5{gap:.85rem!important}',
    '#view-car_booking .space-y-5> :not([hidden])~ :not([hidden]),#view-van_booking .space-y-5> :not([hidden])~ :not([hidden]){margin-top:.85rem!important}',
    '#view-car_booking .space-y-4> :not([hidden])~ :not([hidden]),#view-van_booking .space-y-4> :not([hidden])~ :not([hidden]){margin-top:.65rem!important}',
    '#view-car_booking h2,#view-van_booking h2{font-size:1rem;line-height:1.2}',
    '#view-car_booking h3,#view-van_booking h3{font-size:.85rem;line-height:1.2}',
    '#view-car_booking .ces-book-input,#view-van_booking .ces-book-input{border-radius:10px;padding:7px 9px;font-size:12px;min-height:34px}',
    '#view-car_booking textarea.ces-book-input,#view-van_booking textarea.ces-book-input{min-height:54px}',
    '#view-car_booking .ces-form-label,#view-van_booking .ces-form-label{font-size:8px;margin-bottom:4px}',
    '#view-car_booking .vehicle-summary-grid>div,#view-van_booking .van-summary-grid>div{min-height:82px;padding:.65rem!important}',
    '#view-car_booking .vehicle-summary-grid .text-2xl,#view-van_booking .van-summary-grid .text-2xl{font-size:1.15rem;line-height:1.4rem}',
    '#view-car_booking .vehicle-summary-grid .text-sm{font-size:.72rem;line-height:1rem}',
    '#view-car_booking .ces-booking-usage-pie{width:50px;height:50px;min-width:50px;min-height:50px}',
    '#view-car_booking .ces-booking-usage-pie:after{inset:7px}',
    '#view-car_booking .vehicle-calendar-grid{gap:5px}',
    '#view-car_booking .vehicle-calendar-day{min-height:62px;border-radius:11px;padding:6px}',
    '#view-car_booking .vehicle-calendar-weekday{padding:5px;font-size:8px}',
    '#view-car_booking .vehicle-calendar-nav{width:32px;height:32px}',
    '#view-car_booking .vehicle-mode-btn{padding:8px 10px;font-size:10px}',
    '#view-car_booking .vehicle-workspace-grid{display:grid;grid-template-columns:1fr;gap:.85rem}',
    '#view-van_booking .van-detail-grid{display:grid;grid-template-columns:1fr;gap:.85rem}',
    '#view-van_booking .van-calendar-shell{height:min(82vh,900px);min-height:680px;border-radius:24px;box-shadow:0 18px 45px rgba(15,23,42,.08)}',
    '#view-van_booking .van-calendar-toolbar{height:54px}',
    '#view-van_booking .van-calendar-frame{position:absolute;left:0;right:0;top:54px;bottom:0;width:100%;height:calc(100% - 54px)}',
    '@media (min-width:1100px){#view-car_booking .vehicle-summary-grid{grid-template-columns:minmax(160px,1.25fr) repeat(5,minmax(105px,1fr))}#view-car_booking .vehicle-workspace-grid{grid-template-columns:minmax(360px,410px) minmax(0,1fr)}#view-van_booking .van-summary-grid{grid-template-columns:repeat(7,minmax(0,1fr))}#view-van_booking .van-detail-grid{grid-template-columns:minmax(0,1.35fr) minmax(280px,.65fr)}}',
    '@media (max-width:1099px){#view-car_booking .vehicle-summary-grid{grid-template-columns:repeat(3,minmax(0,1fr))}#view-van_booking .van-summary-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}',
    '@media (max-width:767px){#view-car_booking,#view-van_booking{padding:.25rem!important}#view-car_booking .vehicle-summary-grid,#view-van_booking .van-summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}#view-car_booking .vehicle-form-two-col{grid-template-columns:1fr}#view-car_booking .vehicle-form-two-col>*{grid-column:span 1/span 1}}'
  ].join('');
  document.head.appendChild(style);
}

function cesBookingState_(type) {
  return CES_BOOKING_V31.state[cesBookType_(type)];
}
function cesBookingResetUserState_(type, userKey) {
  var state = cesBookingState_(type);
  if (state.userKey === userKey) return;
  state.loaded = false;
  state.loadingPromise = null;
  state.lastLoadedAt = 0;
  state.rows = [];
  state.plans = [];
  state.approvers = [];
  state.signatures = [];
  state.profile = null;
  state.summary = {};
  state.userKey = userKey;
  state.team = '';
  state.month = new Date();
}
function cesBookingWorkspaceCacheKey_(type, userId, team) {
  return ['ces_vehicle_workspace_v56', cesBookType_(type), userId || 'unknown', team || 'none'].join('_');
}
function cesBookingPlanCacheKey_(team) {
  return 'ces_vehicle_plans_v38_' + String(team || '').toUpperCase();
}
function cesBookingReadCache_(key, maxAge) {
  try {
    var payload = JSON.parse(localStorage.getItem(key) || 'null');
    if (payload && payload.ts && Date.now() - Number(payload.ts) < maxAge) return payload.data;
  } catch (ignore) {}
  return null;
}
function cesBookingWriteCache_(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ ts:Date.now(), data:data })); } catch (ignore) {}
}

async function cesBookingApiCall_(names, args, options) {
  var list = Array.isArray(names) ? names : [names];
  var lastError = null;
  for (var i = 0; i < list.length; i++) {
    try {
      return await window.CES_API.callFunction(list[i], args || [], options || {});
    } catch (err) {
      lastError = err;
      var text = String(err && err.message ? err.message : err);
      if (!/not allowed|not found|Cannot connect|timeout/i.test(text)) throw err;
    }
  }
  throw lastError || new Error('Vehicle Booking API is not available.');
}

function cesBookingApiNames_(type, genericName) {
  const map={
    getVehicleBookingWorkspace:'getVehicleBookingWorkspace', getVehicleOnsitePlans:'getVehicleOnsitePlans',
    uploadCarBookingMemo:'uploadCarBookingMemo', createVehicleBookingRequest:'createVehicleBookingRequest',
    createVehicleBookingRequestFast:'createVehicleBookingRequestFast', updateVehicleBookingRecord:'updateVehicleBookingRecord',
    uploadVehicleReturnBill:'uploadVehicleReturnBill', uploadVehicleReturnPhoto:'uploadVehicleReturnPhoto',
    completeVehicleReturn:'completeVehicleReturn', cancelVehicleBooking:'cancelVehicleBooking',
    sendVehicleBookingNotification:'sendVehicleBookingNotification'
  };
  return [map[genericName]||genericName];
}
async function resyncVehicleBooking(type, button) {
  const btn=button || (typeof event!=='undefined' ? event.currentTarget : null);
  if(btn){btn.classList.add('is-loading');btn.disabled=true;btn.setAttribute('aria-busy','true');}
  try { await loadVehicleBookingWorkspace(type,true); if(typeof showToast==='function')showToast(cesBookType_(type)+' booking resynced','success'); }
  catch(err){Swal.fire('Resync Error',err.message||String(err),'error');}
  finally{if(btn){btn.classList.remove('is-loading');btn.disabled=false;btn.removeAttribute('aria-busy');}}
}
window.resyncVehicleBooking=resyncVehicleBooking;

function cesVehicleSyncCompactPage_(){
  // V58 uses one global desktop scale for every CES Hub function.  Remove the
  // former vehicle-only shell class so Car/Van Booking cannot change sidebar,
  // header or content dimensions independently from KPI and other modules.
  if(document.body)document.body.classList.remove('ces-vehicle-compact');
}
function cesVehicleEnableCompactObserver_(){
  cesVehicleSyncCompactPage_();
  window.CES_VEHICLE_COMPACT_OBSERVER_V57=true;
}

function switchCarBookingWorkspace(mode){
  mode=String(mode||'DASHBOARD').toUpperCase();
  if(['DASHBOARD','BOOKING','EVALUATION'].indexOf(mode)<0)mode='DASHBOARD';
  var dash=document.getElementById('car-workspace-dashboard-panel'),book=document.getElementById('car-workspace-booking-panel'),evaluation=document.getElementById('car-workspace-evaluation-panel');
  var dashBtn=document.getElementById('car-workspace-dashboard-btn'),bookBtn=document.getElementById('car-workspace-booking-btn'),evaluationBtn=document.getElementById('car-workspace-evaluation-btn');
  if(dash)dash.classList.toggle('hidden',mode!=='DASHBOARD');
  if(book)book.classList.toggle('hidden',mode!=='BOOKING');
  if(evaluation)evaluation.classList.toggle('hidden',mode!=='EVALUATION');
  if(dashBtn)dashBtn.classList.toggle('active',mode==='DASHBOARD');
  if(bookBtn)bookBtn.classList.toggle('active',mode==='BOOKING');
  if(evaluationBtn)evaluationBtn.classList.toggle('active',mode==='EVALUATION');
  try{sessionStorage.setItem('CES_CAR_WORKSPACE_V204',mode);}catch(e){}
  if(mode==='DASHBOARD'){setTimeout(function(){renderVehicleCalendar_('CAR');renderVehicleSummary('CAR');renderVehicleBookings('CAR');},20);}
  if(mode==='EVALUATION'){setTimeout(function(){renderCarEvaluationWorkspace();},20);}
  if(window.CES_LANGUAGE&&window.CES_LANGUAGE.apply)window.CES_LANGUAGE.apply();
}
window.switchCarBookingWorkspace=switchCarBookingWorkspace;

function initVehicleBooking(type, forceRefresh) {
  type = cesBookType_(type);
  cesBookingInjectStyles_();
  cesVehicleEnableCompactObserver_();
  if (type === 'VAN') { initVanBookingCalendar(); return; }
  cesBookAttachInvalidClear_(type);
  var prefix = cesBookPrefix_(type);
  var root = document.getElementById('view-' + prefix + '_booking');
  if (!root) return;

  var state = cesBookingState_(type);
  var user = cesBookingCurrentUser_();
  cesBookingResetUserState_(type, cesBookingUserKey_());

  // Immediate UI: profile + default values + an available calendar.
  autoFillVehicleProfile(type, false);
  if (!cesBookGet_(prefix + '-book-start')) cesBookSet_(prefix + '-book-start', '08:00');
  if (!cesBookGet_(prefix + '-book-end')) cesBookSet_(prefix + '-book-end', '17:00');
  if (!cesBookGet_(prefix + '-book-return-date')) cesBookSet_(prefix + '-book-return-date', cesBookGet_(prefix + '-book-date') || cesBookToday_());
  if (!cesBookGet_(prefix + '-book-passengers')) cesBookSet_(prefix + '-book-passengers', '1');
  if (!cesBookGet_(prefix + '-return-date')) cesBookSet_(prefix + '-return-date', cesBookToday_());
  if (!cesBookGet_(prefix + '-return-time')) cesBookSet_(prefix + '-return-time', cesBookNowTime_());
  if (!state.month || isNaN(state.month.getTime())) state.month = new Date();
  renderVehicleCalendar_(type);
  switchVehicleBookingMode(type, state.mode || 'REQUEST', true);
  if(type==='CAR'){var saved='DASHBOARD';try{saved=sessionStorage.getItem('CES_CAR_WORKSPACE_V204')||'DASHBOARD';}catch(e){}switchCarBookingWorkspace(saved);}

  loadVehicleBookingWorkspace(type, !!forceRefresh);
}

function autoFillVehicleProfile(type, forceProfile) {
  type = cesBookType_(type);
  var prefix = cesBookPrefix_(type);
  var state = cesBookingState_(type);
  var login = cesBookingCurrentUser_();
  var profile = state.profile || {};
  var sameUser = profile && String(profile.id || profile.userId || '') === String(login.id || '');

  var data = {
    id: login.id || (sameUser ? (profile.id || profile.userId || '') : ''),
    name: (sameUser ? (profile.nameEng || profile.nameTh || profile.name || '') : '') || login.name,
    team: String((sameUser ? profile.team : '') || login.team || '').toUpperCase(),
    position: (sameUser ? profile.position : '') || login.position,
    email: (sameUser ? profile.email : '') || login.email,
    tel: (sameUser ? profile.tel : '') || login.tel
  };

  // Always populate automatically on initial load or after backend profile arrives.
  if (forceProfile || !cesBookGet_(prefix + '-requester-id')) cesBookSet_(prefix + '-requester-id', data.id);
  if (forceProfile || !cesBookGet_(prefix + '-requester-name')) cesBookSet_(prefix + '-requester-name', data.name);
  if (forceProfile || !cesBookGet_(prefix + '-requester-position')) cesBookSet_(prefix + '-requester-position', data.position);
  if (forceProfile || !cesBookGet_(prefix + '-requester-email')) cesBookSet_(prefix + '-requester-email', data.email);
  if (forceProfile || !cesBookGet_(prefix + '-book-contact')) cesBookSet_(prefix + '-book-contact', data.tel);

  var currentTeam = cesBookGet_(prefix + '-requester-team');
  if ((forceProfile || !CES_BOOKING_V31.allowedTeams.includes(currentTeam)) && CES_BOOKING_V31.allowedTeams.includes(data.team)) {
    cesBookSet_(prefix + '-requester-team', data.team);
    currentTeam = data.team;
  }
  state.team = currentTeam || data.team || '';
}

function clearVehicleProfile(type) {
  type = cesBookType_(type);
  var prefix = cesBookPrefix_(type);
  ['requester-name','requester-id','requester-position','requester-email','book-contact'].forEach(function(key) {
    cesBookSet_(prefix + '-' + key, '');
  });
  cesBookSet_(prefix + '-requester-team', '');
  cesBookingState_(type).plans = [];
  cesBookingState_(type).team = '';
  renderVehiclePlanOptions_(type);
}

async function loadVehicleBookingWorkspace(type, forceRefresh, silent) {
  type = cesBookType_(type);
  var prefix = cesBookPrefix_(type);
  var state = cesBookingState_(type);
  var user = cesBookingCurrentUser_();
  var selectedTeam = cesBookGet_(prefix + '-requester-team');
  if (!CES_BOOKING_V31.allowedTeams.includes(selectedTeam)) selectedTeam = user.team;
  if (!CES_BOOKING_V31.allowedTeams.includes(selectedTeam)) selectedTeam = '';
  var cacheKey = cesBookingWorkspaceCacheKey_(type, user.id || user.email, selectedTeam);
  if (!forceRefresh && state.loaded && Date.now() - Number(state.lastLoadedAt || 0) < CES_BOOKING_V31.workspaceCacheMs) {
    renderVehicleWorkspace_(type);
    return state.summary;
  }
  if (state.loadingPromise && !forceRefresh) return state.loadingPromise;

  if (!forceRefresh) {
    var cached = cesBookingReadCache_(cacheKey, CES_BOOKING_V31.workspaceCacheMs);
    if (cached && (!cached.profile || !user.id || String(cached.profile.id || '') === String(user.id))) {
      applyVehicleWorkspace_(type, cached, true, !!silent);
    }
  }

  var list = document.getElementById(prefix + '-book-list');
  if (list && !state.loaded) {
    list.innerHTML = '<div class="py-12 text-center text-slate-400"><i class="fas fa-circle-notch fa-spin text-2xl mb-3"></i><div class="text-xs font-bold">Loading booking workspace...</div></div>';
  }

  try {
    var workspaceNames=cesBookingApiNames_(type,'getVehicleBookingWorkspace');
    var workspaceArgs=type==='VAN' ? [selectedTeam,user.id,!!forceRefresh] : [type,selectedTeam,user.id,!!forceRefresh];
    state.loadingPromise = cesBookingApiCall_(workspaceNames,workspaceArgs,{ transport:'jsonp', timeoutMs:90000 });
    var result = await state.loadingPromise;
    if (!result || !result.success) throw new Error((result && result.message) || 'Cannot load booking workspace.');
    applyVehicleWorkspace_(type, result, false, !!silent);
    cesBookingWriteCache_(cacheKey, result);
  } catch (err) {
    if (!state.loaded && list) {
      list.innerHTML = '<div class="py-12 px-4 text-center text-red-500 font-bold">' + cesBookEsc_(err.message || String(err)) +
        '<div class="mt-3"><button class="px-3 py-2 rounded-lg bg-red-50" onclick="loadVehicleBookingWorkspace(\'' + type + '\',true)">Retry</button></div></div>';
    }
    renderVehicleCalendar_(type);
  } finally { state.loadingPromise = null; }
}

function applyVehicleWorkspace_(type, result, fromCache, silent) {
  type = cesBookType_(type);
  var state = cesBookingState_(type);
  var login = cesBookingCurrentUser_();
  state.loaded = true;
  state.lastLoadedAt = Date.now();
  state.rows = result.bookings || result.data || [];
  state.plans = result.plans || [];
  state.approvers = result.approvers || [];
  state.signatures = result.signatures || [];
  state.summary = result.summary || {};
  state.team = String(result.plansTeam || result.team || state.team || login.team || '').toUpperCase();
  if (result.profile && (!login.id || String(result.profile.id || '') === String(login.id))) state.profile = result.profile;

  autoFillVehicleProfile(type, true);
  renderVehicleWorkspace_(type);
  if (!fromCache && !silent && typeof showToast === 'function') showToast('Booking data updated', 'success');
}

function renderVehicleWorkspace_(type) {
  renderVehiclePlanOptions_(type);
  renderVehicleReturnOptions_(type);
  populateVehicleSummaryFilters_(type);
  if(type==='CAR'&&document.getElementById('car-workspace-evaluation-panel'))renderCarEvaluationWorkspace();
  renderVehicleSummary(type);
  renderVehicleCalendar_(type);
  renderVehicleBookings(type);
  switchVehicleBookingMode(type, cesBookingState_(type).mode || 'REQUEST', true);
}

async function changeVehicleBookingTeam(type) {
  type = cesBookType_(type);
  var prefix = cesBookPrefix_(type);
  var team = cesBookGet_(prefix + '-requester-team');
  cesBookingState_(type).team = team;
  ['onsite-plan','calendar-key','calendar-team','job-title','book-date','book-return-date','book-destination','book-purpose'].forEach(function(key) {
    cesBookSet_(prefix + '-' + key, '');
  });
  if (!CES_BOOKING_V31.allowedTeams.includes(team)) {
    cesBookingState_(type).plans = [];
    renderVehiclePlanOptions_(type);
    return;
  }
  await loadVehiclePlans(type, team, false);
}

async function loadVehiclePlans(type, team, forceRefresh) {
  type = cesBookType_(type);
  team = String(team || '').toUpperCase();
  if (!CES_BOOKING_V31.allowedTeams.includes(team)) return;
  var state = cesBookingState_(type);
  var prefix = cesBookPrefix_(type);
  var select = document.getElementById(prefix + '-onsite-plan');
  var key = cesBookingPlanCacheKey_(team);

  if (!forceRefresh) {
    var cached = cesBookingReadCache_(key, CES_BOOKING_V31.planCacheMs);
    if (cached && Array.isArray(cached.plans)) {
      state.plans = cached.plans;
      state.team = team;
      renderVehiclePlanOptions_(type);
    }
  }

  if (select && !state.plans.length) select.innerHTML = '<option value="">Loading onsite plans...</option>';
  try {
    var result = await cesBookingApiCall_(
      cesBookingApiNames_(type,'getVehicleOnsitePlans'),
      [team, !!forceRefresh],
      { transport:'jsonp', timeoutMs:90000 }
    );
    if (!result || !result.success) throw new Error((result && result.message) || 'Cannot load Master Calendar plans.');
    state.plans = result.plans || [];
    state.team = team;
    cesBookingWriteCache_(key, result);
    renderVehiclePlanOptions_(type);
  } catch (err) {
    if (select && !state.plans.length) select.innerHTML = '<option value="">Cannot load calendar: ' + cesBookEsc_(err.message || String(err)) + '</option>';
  }
}

function renderVehiclePlanOptions_(type) {
  type = cesBookType_(type);
  var prefix = cesBookPrefix_(type);
  var select = document.getElementById(prefix + '-onsite-plan');
  if (!select) return;
  var state = cesBookingState_(type);
  var current = select.value;
  var plans = state.plans || [];
  var html = '<option value="">— Select onsite work from team calendar —</option>';
  html += '<option value="__MANUAL__">✍️ Manual / งานไม่มีใน Calendar</option>';
  if (!plans.length) html += '<option value="" disabled>No upcoming onsite work found — use Manual</option>';
  plans.forEach(function(plan, index) {
    var label = plan.optionLabel || ('[' + (plan.startDate || plan.date || '') + '] ' + (plan.title || '') + ' @ ' + (plan.location || plan.title || ''));
    html += '<option value="' + index + '">' + cesBookEsc_(label) + '</option>';
  });
  select.innerHTML = html;
  if (current === '__MANUAL__') select.value = '__MANUAL__';
  else if (current && Number(current) < plans.length) select.value = current;

  if (type === 'CAR') {
    var approverSelect = document.getElementById('car-approver');
    if (approverSelect) {
      var selected = approverSelect.value;
      var approvers = state.approvers || [];
      approverSelect.innerHTML = '<option value="">— Select Approver —</option>' + approvers.map(function(a, index) {
        var email = a.email ? ' · ' + a.email : ' · Email not found';
        return '<option value="' + index + '" ' + (a.email ? '' : 'disabled') + '>' + cesBookEsc_((a.nameEng || a.nameTh || a.id) + email) + '</option>';
      }).join('');
      if (selected && Number(selected) < approvers.length) approverSelect.value = selected;
      updateVehicleApproverNote();
    }
  }
}

function updateVehicleApproverNote() {
  var select = document.getElementById('car-approver');
  var note = document.getElementById('car-approver-signature-note');
  if (!select || !note) return;
  var approver = select.value === '' ? null : (cesBookingState_('CAR').approvers || [])[Number(select.value)];
  note.className = 'text-[10px] text-slate-500 mt-1';
  note.innerHTML = approver
    ? '<i class="fas fa-envelope-circle-check mr-1"></i>Approval alert will be sent to ' + cesBookEsc_(approver.email || '-') + '. No signature document is generated.'
    : '<i class="fas fa-envelope mr-1"></i>Select the approver who will receive the Confirm / Reject alert.';
}


function applyVehicleOnsitePlan(type) {
  type = cesBookType_(type);
  var prefix = cesBookPrefix_(type);
  var value = cesBookGet_(prefix + '-onsite-plan');
  var jobInput = document.getElementById(prefix + '-job-title');
  if (value === '__MANUAL__') {
    cesBookSet_(prefix + '-calendar-key', '');
    cesBookSet_(prefix + '-calendar-team', cesBookGet_(prefix + '-requester-team'));
    if (jobInput) { jobInput.readOnly = false; jobInput.classList.remove('bg-slate-50'); jobInput.focus(); }
    return;
  }
  var plan = value === '' ? null : cesBookingState_(type).plans[Number(value)];
  if (!plan) return;
  if (jobInput) jobInput.readOnly = false; // V24.3: calendar values are editable after selection.
  cesBookSet_(prefix + '-calendar-key', plan.eventKey || plan.uniqueKey || '');
  cesBookSet_(prefix + '-calendar-team', plan.team || cesBookGet_(prefix + '-requester-team'));
  cesBookSet_(prefix + '-job-title', plan.title || '');
  cesBookSet_(prefix + '-book-date', plan.startDate || plan.date || '');
  cesBookSet_(prefix + '-book-return-date', plan.endDate || plan.startDate || plan.date || '');
  cesBookSet_(prefix + '-book-start', plan.startTime || '08:00');
  cesBookSet_(prefix + '-book-end', plan.endTime || '17:00');
  cesBookSet_(prefix + '-book-destination', plan.location || plan.title || '');
  cesBookSet_(prefix + '-book-purpose', plan.title || '');
}

function enableManualVehicleWork(type) {
  type = cesBookType_(type || 'CAR');
  var prefix = cesBookPrefix_(type);
  var select = document.getElementById(prefix + '-onsite-plan');
  if (select) select.value = '__MANUAL__';
  applyVehicleOnsitePlan(type);
  var job = document.getElementById(prefix + '-job-title');
  if (job) job.scrollIntoView({behavior:'smooth',block:'center'});
}
window.enableManualVehicleWork = enableManualVehicleWork;

function setVehicleCustomTime(startTime,endTime) {
  cesBookSet_('car-book-start',startTime);
  cesBookSet_('car-book-end',endTime);
  if (typeof showToast === 'function') showToast('Time selected: '+startTime+'–'+endTime,'success');
}
window.setVehicleCustomTime = setVehicleCustomTime;

function cesOpenNativePicker(id,event){
  var el=document.getElementById(id);if(!el)return;
  // Clicking anywhere on the field card opens the native picker. Keep the
  // fallback non-recursive so the wrapper onclick cannot loop.
  try{if(typeof el.showPicker==='function'){el.showPicker();return;}}catch(ignore){}
  try{el.focus({preventScroll:true});}catch(ignore2){try{el.focus();}catch(ignore3){}}
}
window.cesOpenNativePicker=cesOpenNativePicker;

function cesBookingSummaryDateParts_(value) {
  var key = cesBookingDateKey_(value);
  var m = key.match(/^(\d{4})-(\d{2})-/);
  return m ? { year:m[1], month:m[2], key:key } : { year:'', month:'', key:'' };
}

function populateVehicleSummaryFilters_(type) {
  type = cesBookType_(type);
  var prefix = cesBookPrefix_(type);
  var rows = cesBookingState_(type).rows || [];
  var years = {};
  rows.forEach(function(row) {
    var p = cesBookingSummaryDateParts_(row.bookingDate || row.onsiteDate || row.createdAt);
    if (p.year) years[p.year] = true;
  });
  var options = Object.keys(years).sort().reverse();
  [document.getElementById(prefix + '-summary-year-filter'), type==='CAR'?document.getElementById('car-evaluation-year-filter'):null].forEach(function(yearEl){
    if(!yearEl)return;
    var current = yearEl.value || 'All';
    yearEl.innerHTML = '<option value="All">All Years</option>' + options.map(function(y) {
      return '<option value="' + cesBookEsc_(y) + '">' + cesBookEsc_(y) + '</option>';
    }).join('');
    var nowV263 = new Date(), currentYearV263 = String(nowV263.getFullYear());
    if(!yearEl.dataset.cesV263DefaultApplied){
      if(options.indexOf(currentYearV263)<0){
        yearEl.insertAdjacentHTML('beforeend','<option value="'+currentYearV263+'">'+currentYearV263+'</option>');
        options.push(currentYearV263);
      }
      yearEl.value=currentYearV263;
      yearEl.dataset.cesV263DefaultApplied='1';
    }else yearEl.value = Array.from(yearEl.options).some(function(o){return o.value===current;}) ? current : 'All';
  });
  var monthEl=document.getElementById(prefix+'-summary-month-filter');
  if(monthEl&&!monthEl.dataset.cesV263DefaultApplied){monthEl.value=String(new Date().getMonth()+1).padStart(2,'0');monthEl.dataset.cesV263DefaultApplied='1';}
}

function cesBookingWorkingPeriod_(year, month, rows) {
  var currentYear = String(new Date().getFullYear());
  if (year !== 'All') return { years:[String(year)], month:month };
  var years = {};
  (rows || []).forEach(function(row) {
    var p = cesBookingSummaryDateParts_(row.bookingDate || row.onsiteDate || row.createdAt);
    if (p.year) years[p.year] = true;
  });
  var list = Object.keys(years).sort();
  if (month !== 'All') {
    if (list.indexOf(currentYear) >= 0) list = [currentYear];
    else if (list.length) list = [list[list.length - 1]];
    else list = [currentYear];
  } else if (!list.length) {
    list = [currentYear];
  }
  return { years:list, month:month };
}
function cesBookingWorkingDays_(year, month, rows) {
  var period = cesBookingWorkingPeriod_(year, month, rows);
  var total = 0;
  period.years.forEach(function(yearValue) {
    var y = Number(yearValue);
    var startMonth = period.month === 'All' ? 0 : Number(period.month) - 1;
    var monthCount = period.month === 'All' ? 12 : 1;
    for (var m = startMonth; m < startMonth + monthCount; m++) {
      var last = new Date(y, m + 1, 0).getDate();
      for (var d = 1; d <= last; d++) {
        var day = new Date(y, m, d).getDay();
        if (day !== 0 && day !== 6) total++;
      }
    }
  });
  return total;
}
function cesBookingUsedWorkingDays_(dateKeys, year, month, rows) {
  var period = cesBookingWorkingPeriod_(year, month, rows);
  var allowedYears = {};
  period.years.forEach(function(value) { allowedYears[String(value)] = true; });
  return Object.keys(dateKeys || {}).filter(function(key) {
    var match = String(key).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match || !allowedYears[match[1]]) return false;
    if (period.month !== 'All' && match[2] !== period.month) return false;
    var day = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getDay();
    return day !== 0 && day !== 6;
  }).length;
}
function renderVehicleSummary(type) {
  type = cesBookType_(type);
  var prefix = cesBookPrefix_(type);
  var rows = cesBookingState_(type).rows || [];
  var year = cesBookGet_(prefix + '-summary-year-filter') || 'All';
  var month = cesBookGet_(prefix + '-summary-month-filter') || 'All';
  var team = cesBookGet_(prefix + '-summary-team-filter') || 'All';
  var dates = {}, totalBill = 0, totalKm = 0, completedKm = 0, totalJobs = 0;
  var filtered = rows.filter(function(row) {
    var p = cesBookingSummaryDateParts_(row.bookingDate || row.onsiteDate || row.createdAt);
    var rowTeam = String(row.team || row.calendarTeam || '').toUpperCase();
    if (year !== 'All' && p.year !== year) return false;
    if (month !== 'All' && p.month !== month) return false;
    if (team !== 'All' && rowTeam !== team) return false;
    return true;
  });
  filtered.forEach(function(row) {
    var status = String(row.status || '').toUpperCase();
    if (status === 'CANCELLED' || status === 'REJECTED') return;
    var p = cesBookingSummaryDateParts_(row.bookingDate || row.onsiteDate || row.createdAt);
    var usageDates = cesBookDateRange_(row.bookingDate || row.onsiteDate || p.key, row.plannedReturnDate || row.bookingEndDate || row.bookingDate || p.key);
    (usageDates.length ? usageDates : (p.key ? [p.key] : [])).forEach(function(key){ dates[key] = true; });
    totalJobs++;
    var rowKm = Number(row.actualTotalKm || row.totalKm || row.roundTripKm || 0);
    totalKm += rowKm;
    if (status === 'COMPLETED') { completedKm += rowKm; totalBill += Number(row.electricBill || 0); }
  });
  var regularCost = completedKm * 5;
  var feeSaved = Math.max(0, regularCost - totalBill);
  var feeSavedPercent = regularCost > 0 ? Math.round(feeSaved * 1000 / regularCost) / 10 : 0;
  var usedDays = Object.keys(dates).length;
  var workingDays = cesBookingWorkingDays_(year, month, filtered);
  var usedWorkingDays = cesBookingUsedWorkingDays_(dates, year, month, filtered);
  var usagePercent = workingDays ? Math.min(100, Math.round(usedWorkingDays * 1000 / workingDays) / 10) : 0;
  var values = { bill:cesBookMoney_(totalBill), km:cesBookNumber_(totalKm), regular:cesBookMoney_(regularCost), saved:cesBookMoney_(feeSaved), days:cesBookNumber_(usedDays), jobs:cesBookNumber_(totalJobs), working:cesBookNumber_(workingDays) };
  var regularNote = document.getElementById(prefix + '-summary-regular-note');
  if (regularNote) {
    regularNote.innerHTML = '<span>5 Baht/km</span><span>Van ฿2,200/day</span>';
    regularNote.className = 'ces-car-rate-note-v4';
  }
  var savedNote = document.getElementById(prefix + '-summary-saved-note');
  if (savedNote) { var th=window.CES_LANGUAGE&&window.CES_LANGUAGE.get&&window.CES_LANGUAGE.get()==='TH'; savedNote.textContent = th ? ('ประหยัด '+feeSavedPercent.toFixed(1)+'% เทียบอัตราปกติ') : (feeSavedPercent.toFixed(1)+'% saved vs regular rate'); }
  Object.keys(values).forEach(function(key) { var el=document.getElementById(prefix+'-summary-'+key);if(el)el.textContent=values[key]; });
  var pie=document.getElementById(prefix+'-summary-usage-pie');if(pie){pie.style.setProperty('--usage',usagePercent+'%');var span=pie.querySelector('span');if(span)span.textContent=usagePercent+'%';}
  var usageNote=document.getElementById(prefix+'-summary-usage-note');if(usageNote)usageNote.textContent=usedWorkingDays+' used weekdays / '+workingDays+' working days';
  var note = document.getElementById(prefix + '-summary-filter-note');
  if (note) note.textContent = filtered.length + ' matched records · ' + year + ' · ' + month + ' · ' + team;
}
function cesRenderCarEvaluationSummary_(rows) {
  var rated=(Array.isArray(rows)?rows:[]).filter(function(row){
    return [row.vehicleRatingPerformance,row.vehicleRatingComfort,row.vehicleRatingValue].some(function(v){return Number(v)>0;});
  });
  function average(key){
    var vals=rated.map(function(row){return Number(row[key]||0);}).filter(function(v){return isFinite(v)&&v>0&&v<=5;});
    return vals.length?vals.reduce(function(a,b){return a+b;},0)/vals.length:0;
  }
  var perf=average('vehicleRatingPerformance'),comfort=average('vehicleRatingComfort'),value=average('vehicleRatingValue');
  var available=[perf,comfort,value].filter(function(v){return v>0;});
  var overall=available.length?available.reduce(function(a,b){return a+b;},0)/available.length:0;
  function set(id,value){var el=document.getElementById(id);if(el)el.textContent=value>0?value.toFixed(2):'-';}
  set('car-eval-performance-v22',perf);set('car-eval-comfort-v22',comfort);set('car-eval-value-v22',value);set('car-eval-overall-v22',overall);
  var count=document.getElementById('car-evaluation-response-count-v22');if(count)count.textContent=rated.length+' evaluation'+(rated.length===1?'':'s');
}
window.cesRenderCarEvaluationSummary_=cesRenderCarEvaluationSummary_;
function renderCarEvaluationWorkspace(){
  var rows=cesBookingState_('CAR').rows||[];
  var year=cesBookGet_('car-evaluation-year-filter')||'All',month=cesBookGet_('car-evaluation-month-filter')||'All',team=cesBookGet_('car-evaluation-team-filter')||'All';
  var filtered=rows.filter(function(row){
    var p=cesBookingSummaryDateParts_(row.vehicleRatingAt||row.returnDate||row.bookingDate||row.onsiteDate||row.createdAt);
    var rowTeam=String(row.team||row.calendarTeam||'').toUpperCase();
    if(year!=='All'&&p.year!==year)return false;
    if(month!=='All'&&p.month!==month)return false;
    if(team!=='All'&&rowTeam!==team)return false;
    return [row.vehicleRatingPerformance,row.vehicleRatingComfort,row.vehicleRatingValue].some(function(v){return Number(v)>0;});
  });
  cesRenderCarEvaluationSummary_(filtered);
  var note=document.getElementById('car-evaluation-filter-note');if(note)note.textContent=filtered.length+' matched evaluations · '+year+' · '+month+' · '+team;
  var root=document.getElementById('car-evaluation-list-v222');if(!root)return;
  if(!filtered.length){root.innerHTML='<div class="py-12 text-center text-slate-400"><i class="fas fa-inbox text-3xl mb-3"></i><div class="font-bold">No post-use evaluation in this filter</div></div>';return;}
  root.innerHTML='<div class="overflow-auto rounded-2xl border border-slate-200 max-h-[560px]"><table class="w-full min-w-[980px] text-xs text-left"><thead class="sticky top-0 bg-slate-50 text-[9px] uppercase tracking-wider text-slate-500"><tr><th class="p-3">Date / Booking</th><th class="p-3">Requester / Team</th><th class="p-3">Performance</th><th class="p-3">Comfort</th><th class="p-3">Value</th><th class="p-3">Comment</th></tr></thead><tbody class="divide-y divide-slate-100">'+filtered.slice().reverse().map(function(r){return '<tr class="align-top hover:bg-slate-50"><td class="p-3"><b>'+cesBookEsc_(r.vehicleRatingAt||r.returnDate||r.bookingDate||'-')+'</b><div class="text-[10px] text-slate-400 mt-1">'+cesBookEsc_(r.bookingId||'-')+'</div></td><td class="p-3"><b>'+cesBookEsc_(r.requesterName||r.vehicleRatingBy||'-')+'</b><div class="text-[10px] text-slate-400 mt-1">'+cesBookEsc_(r.team||r.calendarTeam||'-')+'</div></td><td class="p-3 font-black">'+cesBookEsc_(r.vehicleRatingPerformance||'-')+' / 5</td><td class="p-3 font-black">'+cesBookEsc_(r.vehicleRatingComfort||'-')+' / 5</td><td class="p-3 font-black">'+cesBookEsc_(r.vehicleRatingValue||'-')+' / 5</td><td class="p-3 min-w-[280px] whitespace-normal">'+cesBookEsc_(r.vehicleRatingComment||'-')+'</td></tr>';}).join('')+'</tbody></table></div>';
}
window.renderCarEvaluationWorkspace=renderCarEvaluationWorkspace;
window.renderVehicleSummary = renderVehicleSummary;

function cesBookingFilteredRows_(type) {
  type = cesBookType_(type);
  var prefix = cesBookPrefix_(type);
  var year = cesBookGet_(prefix + '-summary-year-filter') || 'All';
  var month = cesBookGet_(prefix + '-summary-month-filter') || 'All';
  var team = cesBookGet_(prefix + '-summary-team-filter') || 'All';
  return (cesBookingState_(type).rows || []).filter(function(row) {
    var p = cesBookingSummaryDateParts_(row.bookingDate || row.onsiteDate || row.createdAt);
    var rowTeam = String(row.team || row.calendarTeam || '').toUpperCase();
    if (year !== 'All' && p.year !== year) return false;
    if (month !== 'All' && p.month !== month) return false;
    if (team !== 'All' && rowTeam !== team) return false;
    return true;
  });
}
function cesBookingXmlEsc_(value) {
  return String(value == null ? '' : value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}
function cesBookingExcelCell_(value, type) {
  var dataType = type || (typeof value === 'number' && isFinite(value) ? 'Number' : 'String');
  var content = value == null ? '' : value;
  return '<Cell><Data ss:Type="' + dataType + '">' + cesBookingXmlEsc_(content) + '</Data></Cell>';
}
function exportVehicleUsageExcel(type) {
  type = cesBookType_(type);
  var prefix = cesBookPrefix_(type);
  var rows = cesBookingFilteredRows_(type);
  var year = cesBookGet_(prefix + '-summary-year-filter') || 'All';
  var month = cesBookGet_(prefix + '-summary-month-filter') || 'All';
  var team = cesBookGet_(prefix + '-summary-team-filter') || 'All';
  var headers = ['Booking ID','Booking Date','Planned Return Date','Start Time','End Time','Requester ID','Requester Name','Team','Job / Customer','Destination','Estimated KM','Actual KM','Electric Bill (THB)','Regular Car Fee (THB)','Days Used','Status','Approver','Approver Email','Approved At','Return Date','Return Time','TE File URL','Counted in Usage'];
  var tableRows = rows.map(function(row) {
    var status = String(row.status || '').toUpperCase();
    var counted = ['CANCELLED','REJECTED'].indexOf(status) < 0;
    var actualKm = Number(row.actualTotalKm || 0);
    var estimatedKm = Number(row.totalKm || row.roundTripKm || 0);
    var feeKm = status === 'COMPLETED' ? actualKm : 0;
    var daysUsed = cesBookDateRange_(row.bookingDate || row.onsiteDate, row.plannedReturnDate || row.bookingDate).length;
    return [
      row.bookingId || '', row.bookingDate || row.onsiteDate || '', row.plannedReturnDate || '', row.startTime || '', row.endTime || '',
      row.requesterId || '', row.requesterName || '', row.team || row.calendarTeam || '', row.jobTitle || '', row.destination || '',
      estimatedKm, actualKm, Number(row.electricBill || 0), feeKm * 5, daysUsed, status, row.approverName || '', row.approverEmail || '',
      row.approvedAt || '', row.returnDate || '', row.returnTime || '', row.teFileUrl || '', counted ? 'Yes' : 'No'
    ];
  });
  var valid = rows.filter(function(row){ return ['CANCELLED','REJECTED'].indexOf(String(row.status||'').toUpperCase()) < 0; });
  var completed = valid.filter(function(row){ return String(row.status||'').toUpperCase() === 'COMPLETED'; });
  var totalKm = valid.reduce(function(sum,row){ return sum + Number(row.actualTotalKm || row.totalKm || row.roundTripKm || 0); },0);
  var totalBill = completed.reduce(function(sum,row){ return sum + Number(row.electricBill || 0); },0);
  var regularFee = completed.reduce(function(sum,row){ return sum + Number(row.actualTotalKm || 0) * 5; },0);
  var totalFeeSaved = Math.max(0, regularFee - totalBill);
  var xml = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>' +
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">' +
    '<Styles><Style ss:ID="Header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#004AAD" ss:Pattern="Solid"/></Style><Style ss:ID="Title"><Font ss:Bold="1" ss:Size="14"/></Style></Styles>' +
    '<Worksheet ss:Name="Summary"><Table>' +
      '<Row><Cell ss:StyleID="Title"><Data ss:Type="String">CES Hub Car Booking Usage</Data></Cell></Row>' +
      '<Row>' + cesBookingExcelCell_('Filter') + cesBookingExcelCell_('Year: '+year+' | Month: '+month+' | Team: '+team) + '</Row>' +
      '<Row>' + cesBookingExcelCell_('Exported At') + cesBookingExcelCell_(new Date().toLocaleString('th-TH')) + '</Row>' +
      '<Row>' + cesBookingExcelCell_('Matched Records') + cesBookingExcelCell_(rows.length,'Number') + '</Row>' +
      '<Row>' + cesBookingExcelCell_('Counted Jobs') + cesBookingExcelCell_(valid.length,'Number') + '</Row>' +
      '<Row>' + cesBookingExcelCell_('Total KM') + cesBookingExcelCell_(totalKm,'Number') + '</Row>' +
      '<Row>' + cesBookingExcelCell_('Electric Bill (THB)') + cesBookingExcelCell_(totalBill,'Number') + '</Row>' +
      '<Row>' + cesBookingExcelCell_('Regular Car Fee (THB)') + cesBookingExcelCell_(regularFee,'Number') + '</Row>' +
      '<Row>' + cesBookingExcelCell_('Total Fee Saved (THB)') + cesBookingExcelCell_(totalFeeSaved,'Number') + '</Row>' +
      '<Row>' + cesBookingExcelCell_('Rate Reference') + cesBookingExcelCell_('Car 5 Baht/km | Van Booking 2,200 Baht/day') + '</Row>' +
    '</Table></Worksheet>' +
    '<Worksheet ss:Name="Usage Data"><Table>' +
      '<Row>' + headers.map(function(value){ return '<Cell ss:StyleID="Header"><Data ss:Type="String">'+cesBookingXmlEsc_(value)+'</Data></Cell>'; }).join('') + '</Row>' +
      tableRows.map(function(row){ return '<Row>'+row.map(function(value,index){ return cesBookingExcelCell_(value,[10,11,12,13,14].indexOf(index)>=0?'Number':'String'); }).join('')+'</Row>'; }).join('') +
    '</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane></WorksheetOptions></Worksheet></Workbook>';
  var blob = new Blob(['\ufeff', xml], { type:'application/vnd.ms-excel;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var link = document.createElement('a');
  var stamp = new Date().toISOString().slice(0,10).replace(/-/g,'');
  link.href = url;
  link.download = 'CES_Car_Booking_Usage_' + year + '_' + month + '_' + team + '_' + stamp + '.xls';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(function(){ URL.revokeObjectURL(url); }, 1500);
  if (typeof showToast === 'function') showToast('Exported ' + rows.length + ' Car Booking records', 'success');
}
window.exportVehicleUsageExcel = exportVehicleUsageExcel;

function renderVehicleSummary_(type) {
  return renderVehicleSummary(type);
}

function cesBookingDateKey_(value) {
  var text = String(value || '').trim();
  var match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) return match[1] + '-' + ('0' + match[2]).slice(-2) + '-' + ('0' + match[3]).slice(-2);
  match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) return match[3] + '-' + ('0' + match[2]).slice(-2) + '-' + ('0' + match[1]).slice(-2);
  return '';
}
function cesBookingTimeMinutes_(value, fallback) {
  var match=String(value||'').match(/^(\d{1,2}):(\d{2})/);return match?Number(match[1])*60+Number(match[2]):fallback;
}
function cesBookingDayIntervals_(rows, key) {
  var intervals=[];
  (rows||[]).forEach(function(row){
    var status=String(row.status||'').toUpperCase();if(['PENDING_APPROVAL','CONFIRMED','IN_PROGRESS'].indexOf(status)<0)return;
    var startKey=cesBookingDateKey_(row.bookingDate||row.onsiteDate),endKey=cesBookingDateKey_(row.plannedReturnDate||row.bookingEndDate||row.bookingDate||row.onsiteDate)||startKey;
    if(!startKey||key<startKey||key>endKey)return;
    var start=key===startKey?cesBookingTimeMinutes_(row.startTime,480):480;
    var end=key===endKey?cesBookingTimeMinutes_(row.endTime,1020):1020;
    start=Math.max(480,Math.min(1020,start));end=Math.max(480,Math.min(1020,end));
    if(end>start)intervals.push({start:start,end:end,row:row});
  });
  intervals.sort(function(a,b){return a.start-b.start;});
  return intervals;
}
function cesBookingDayAvailability_(rows,key) {
  var intervals=cesBookingDayIntervals_(rows,key),merged=[];
  intervals.forEach(function(item){var last=merged[merged.length-1];if(last&&item.start<=last.end)last.end=Math.max(last.end,item.end);else merged.push({start:item.start,end:item.end});});
  var occupied=merged.reduce(function(sum,item){return sum+(item.end-item.start);},0),free=Math.max(0,540-occupied);
  if(!intervals.length)return{css:'available',label:'Available 9h',freeMinutes:540,intervals:intervals};
  if(free>0)return{css:'partial',label:'Available '+(free/60).toFixed(free%60?1:0)+'h',freeMinutes:free,intervals:intervals};
  return{css:'unavailable',label:'Fully booked',freeMinutes:0,intervals:intervals};
}
function cesBookingMinuteText_(minutes){return String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');}
function selectVehicleDaySlot_(key,startTime,endTime){
  key=String(key||'').trim();startTime=String(startTime||'').trim();endTime=String(endTime||'').trim();
  if(!key||!startTime||!endTime)return;
  try{sessionStorage.setItem('CES_CAR_WORKSPACE_V204','BOOKING');}catch(e){}
  switchCarBookingWorkspace('BOOKING');
  switchVehicleBookingMode('CAR','REQUEST',true);
  var apply=function(){
    cesBookSet_('car-book-date',key);
    cesBookSet_('car-book-return-date',key);
    cesBookSet_('car-book-start',startTime);
    cesBookSet_('car-book-end',endTime);
    var panel=document.getElementById('car-request-panel');
    if(panel)panel.scrollIntoView({behavior:'smooth',block:'start'});
    var onsite=document.getElementById('car-onsite-plan');
    if(onsite)try{onsite.focus({preventScroll:true});}catch(ignore){}
  };
  apply();
  setTimeout(apply,80);
  setTimeout(apply,220);
  try{if(typeof Swal!=='undefined'&&Swal.isVisible())Swal.close();}catch(e){}
}
window.selectVehicleDaySlot_=selectVehicleDaySlot_;

function showVehicleDaySlots(type,key){
  type=cesBookType_(type);var rows=cesBookingState_(type).rows||[],availability=cesBookingDayAvailability_(rows,key);
  var slots=[
    {start:480,end:1020,label:'08:00–17:00',kind:'Full day'},
    {start:480,end:720,label:'08:00–12:00',kind:'Morning'},
    {start:720,end:1020,label:'12:00–17:00',kind:'Afternoon'},
    {start:480,end:600,label:'08:00–10:00',kind:'2 hours'},
    {start:600,end:720,label:'10:00–12:00',kind:'2 hours'},
    {start:720,end:840,label:'12:00–14:00',kind:'2 hours'},
    {start:840,end:960,label:'14:00–16:00',kind:'2 hours'},
    {start:900,end:1020,label:'15:00–17:00',kind:'2 hours'}
  ].map(function(slot){slot.busy=availability.intervals.some(function(item){return slot.start<item.end&&slot.end>item.start;});return slot;});
  var safeKey=String(key||'').replace(/'/g,'&#39;');
  var html='<div class="text-left"><div class="mb-3 text-sm font-bold text-slate-500">Choose an available full-day, half-day or 2-hour slot. Selecting a time opens Booking / Return → Booking automatically.</div><div class="grid grid-cols-2 md:grid-cols-3 gap-2">'+slots.map(function(slot){var startText=cesBookingMinuteText_(slot.start),endText=cesBookingMinuteText_(slot.end);return '<button type="button" '+(slot.busy?'disabled':'onclick="selectVehicleDaySlot_(\''+safeKey+'\',\''+startText+'\',\''+endText+'\')"')+' class="px-3 py-3 rounded-xl border text-xs font-black '+(slot.busy?'bg-red-50 text-red-400 border-red-100 cursor-not-allowed':'bg-blue-50 text-[#003DA5] border-blue-100 hover:bg-[#003DA5] hover:text-white')+'">'+slot.label+'<div class="text-[9px] mt-1">'+(slot.busy?'Booked':slot.kind+' · Available')+'</div></button>';}).join('')+'</div></div>';
  Swal.fire({title:'Car time slots · '+key,html:html,width:680,showConfirmButton:false,showCloseButton:true});
}

function renderVehicleCalendar_(type) {
  type = cesBookType_(type);var prefix=cesBookPrefix_(type),state=cesBookingState_(type),root=document.getElementById(prefix+'-availability-calendar'),title=document.getElementById(prefix+'-calendar-title');if(!root)return;
  var month=state.month instanceof Date&&!isNaN(state.month.getTime())?state.month:new Date();month=new Date(month.getFullYear(),month.getMonth(),1);state.month=month;if(title)title.textContent=month.toLocaleDateString('en-US',{month:'long',year:'numeric'});
  var byDate={};(state.rows||[]).forEach(function(row){var keys=cesBookDateRange_(row.bookingDate||row.onsiteDate,row.plannedReturnDate||row.bookingEndDate||row.bookingDate||row.onsiteDate);keys.forEach(function(key){if(!byDate[key])byDate[key]=[];byDate[key].push(row);});});
  var today=typeof cesBookToday_==='function'?cesBookToday_():(new Date().toISOString().slice(0,10));
  var weekdays=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];var html=weekdays.map(function(day){return '<div class="vehicle-calendar-weekday">'+day+'</div>';}).join('');var first=new Date(month.getFullYear(),month.getMonth(),1),start=new Date(month.getFullYear(),month.getMonth(),1-first.getDay());
  for(var i=0;i<42;i++){
    var date=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i),key=date.getFullYear()+'-'+('0'+(date.getMonth()+1)).slice(-2)+'-'+('0'+date.getDate()).slice(-2),rows=byDate[key]||[],status=cesBookingDayAvailability_(rows,key),muted=date.getMonth()!==month.getMonth()?' muted':'',isPast=key<today;
    var tooltip=isPast?'Past date — booking is disabled':status.intervals.map(function(item){return cesBookingMinuteText_(item.start)+'–'+cesBookingMinuteText_(item.end)+' '+(item.row.jobTitle||item.row.destination||item.row.bookingId||'');}).join('\n');
    var clickable=type==='CAR'&&date.getMonth()===month.getMonth()&&!isPast;
    html+='<div class="vehicle-calendar-day '+status.css+muted+(isPast?' ces-booking-past-v212':'')+'" data-date="'+key+'" aria-disabled="'+(isPast?'true':'false')+'" title="'+cesBookEsc_(tooltip)+'" '+(clickable?'onclick="showVehicleDaySlots(\'CAR\',\''+key+'\')"':'')+'><div class="vehicle-calendar-number">'+date.getDate()+'</div>'+(status.intervals.length?'<span class="vehicle-calendar-count">'+status.intervals.length+'</span>':'')+'<div class="vehicle-calendar-state">'+(isPast?'Past date':status.label)+'</div></div>';
  }
  root.innerHTML=html;
}
window.showVehicleDaySlots=showVehicleDaySlots;
function changeVehicleCalendarMonth(type, delta) {
  type = cesBookType_(type);
  var state = cesBookingState_(type);
  var month = state.month || new Date();
  state.month = new Date(month.getFullYear(), month.getMonth() + Number(delta || 0), 1);
  renderVehicleCalendar_(type);
}

function renderVehicleReturnOptions_(type) {
  type = cesBookType_(type);
  var prefix = cesBookPrefix_(type);
  var select = document.getElementById(prefix + '-return-booking');
  if (!select) return;
  var current = select.value;
  var active = (cesBookingState_(type).rows || []).filter(function(row) {
    var status = String(row.status || '').toUpperCase();
    return status === 'CONFIRMED' || status === 'IN_PROGRESS';
  });
  select.innerHTML = '<option value="">— Select active booking —</option>' + active.map(function(row) {
    return '<option value="' + cesBookEsc_(row.bookingId) + '">' + cesBookEsc_((row.bookingDate || '') + ((row.plannedReturnDate && row.plannedReturnDate !== row.bookingDate) ? ' → ' + row.plannedReturnDate : '') + ' · ' + (row.jobTitle || row.destination || row.bookingId)) + '</option>';
  }).join('');
  if (current && active.some(function(row) { return String(row.bookingId) === String(current); })) select.value = current;
}
function applyVehicleReturnJob(type) {
  type = cesBookType_(type);
  var prefix = cesBookPrefix_(type);
  var bookingId = cesBookGet_(prefix + '-return-booking');
  var item = (cesBookingState_(type).rows || []).find(function(row) { return String(row.bookingId) === String(bookingId); });
  var detail = document.getElementById(prefix + '-return-detail');
  if (!item) {
    if (detail) detail.textContent = 'Select a booking to view details.';
    return;
  }
  if (detail) detail.innerHTML = '<b>' + cesBookEsc_(item.jobTitle || item.bookingId) + '</b><div class="mt-1 text-slate-500">' + cesBookEsc_(item.bookingDate) + ((item.plannedReturnDate && item.plannedReturnDate !== item.bookingDate) ? ' → ' + cesBookEsc_(item.plannedReturnDate) : '') + ' ' + cesBookEsc_(item.startTime) + '–' + cesBookEsc_(item.endTime) + ' · ' + cesBookEsc_(item.destination) + '</div>';
  cesBookSet_(prefix + '-return-date', cesBookToday_());
  cesBookSet_(prefix + '-return-time', cesBookNowTime_());
  cesBookSet_(prefix + '-return-km', ''); // V24.0: actual KM is entered only at return.
  if(type==='CAR'){
    cesBookSet_('car-returned-by', item.requesterName || item.requesterId || '');
  }
}
function openVehicleReturn(type, bookingId) {
  type = cesBookType_(type);
  switchVehicleBookingMode(type, 'RETURN');
  cesBookSet_(cesBookPrefix_(type) + '-return-booking', bookingId);
  applyVehicleReturnJob(type);
  var panel = document.getElementById(cesBookPrefix_(type) + '-return-panel');
  if (panel) panel.scrollIntoView({ behavior:'smooth', block:'start' });
}

function switchVehicleBookingMode(type, mode, quiet) {
  type = cesBookType_(type);
  mode = String(mode || 'REQUEST').toUpperCase() === 'RETURN' ? 'RETURN' : 'REQUEST';
  var prefix = cesBookPrefix_(type);
  cesBookingState_(type).mode = mode;
  var requestPanel = document.getElementById(prefix + '-request-panel');
  var returnPanel = document.getElementById(prefix + '-return-panel');
  var requestBtn = document.getElementById(prefix + '-mode-request');
  var returnBtn = document.getElementById(prefix + '-mode-return');
  if (requestPanel) requestPanel.classList.toggle('hidden', mode !== 'REQUEST');
  if (returnPanel) returnPanel.classList.toggle('hidden', mode !== 'RETURN');
  if (requestBtn) requestBtn.classList.toggle('active', mode === 'REQUEST');
  if (returnBtn) returnBtn.classList.toggle('active', mode === 'RETURN');
  if (mode === 'RETURN' && !quiet) renderVehicleReturnOptions_(type);
}

function renderVehicleBookings(type) {
  type = cesBookType_(type);
  var prefix = cesBookPrefix_(type);
  var root = document.getElementById(prefix + '-book-list');
  if (!root) return;
  var query = cesBookGet_(prefix + '-book-search').toLowerCase().trim();
  var selectedStatus = cesBookGet_(prefix + '-book-status') || 'all';
  var rows = (cesBookingState_(type).rows || []).filter(function(row) {
    var text = [row.bookingId,row.requesterName,row.team,row.destination,row.purpose,row.jobTitle,row.approverName,row.bookingDate].join(' ').toLowerCase();
    return (!query || text.indexOf(query) >= 0) && (selectedStatus === 'all' || String(row.status || '').toUpperCase() === selectedStatus);
  });
  if (!rows.length) {
    root.innerHTML = '<div class="py-14 text-center text-slate-400"><i class="fas fa-calendar-xmark text-3xl mb-3 text-slate-300"></i><div class="font-bold">No bookings found</div></div>';
    return;
  }
  root.innerHTML = '<div class="overflow-auto rounded-2xl border border-slate-200 max-h-[560px]"><table class="w-full min-w-[1050px] text-xs text-left"><thead class="sticky top-0 bg-slate-50 z-10 text-[10px] uppercase tracking-wider text-slate-500"><tr><th class="p-3">Date / Time</th><th class="p-3">Requester</th><th class="p-3">Job / Destination</th><th class="p-3">KM / Bill</th><th class="p-3">Status</th><th class="p-3">Documents</th><th class="p-3 text-center">Action</th></tr></thead><tbody class="divide-y divide-slate-100">' + rows.map(function(row) {
    var status = String(row.status || '').toUpperCase();
    var docs = '';
    if (row.memoFileUrl) docs += '<a href="' + cesBookEsc_(row.memoFileUrl) + '" target="_blank" onclick="event.stopPropagation()" class="w-8 h-8 grid place-items-center rounded-lg bg-blue-50 text-blue-600" title="MEMO / Work Order"><i class="fas fa-paperclip"></i></a>';
    if (row.returnBillFileUrl) docs += '<a href="' + cesBookEsc_(row.returnBillFileUrl) + '" target="_blank" onclick="event.stopPropagation()" class="w-8 h-8 grid place-items-center rounded-lg bg-amber-50 text-amber-600" title="Bill / Receipt"><i class="fas fa-receipt"></i></a>';
    if (row.returnCarPhotoFileUrls && row.returnCarPhotoFileUrls.length) docs += '<button type="button" onclick="event.stopPropagation();openVehicleBookingDetail(\''+type+'\',\''+cesBookEsc_(row.bookingId)+'\')" class="min-w-8 h-8 px-2 grid place-items-center rounded-lg bg-emerald-50 text-emerald-700" title="Car photos"><span><i class="fas fa-images"></i> '+row.returnCarPhotoFileUrls.length+'</span></button>';
    if (row.pdfUrl) docs += '<a href="' + cesBookEsc_(row.pdfUrl) + '" target="_blank" onclick="event.stopPropagation()" class="w-8 h-8 grid place-items-center rounded-lg bg-red-50 text-red-500" title="PDF"><i class="fas fa-file-pdf"></i></a>';
    var actions = '<button class="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 border border-slate-200" title="View / Edit details" onclick="event.stopPropagation();openVehicleBookingDetail(\''+type+'\',\'' + cesBookEsc_(row.bookingId) + '\')"><i class="fas fa-eye"></i></button>';
    var loginUserV185 = cesBookingCurrentUser_();
    var isAdminV185 = String((loginUserV185 && loginUserV185.role) || '').toUpperCase() === 'ADMIN';
    if (type === 'CAR' && status === 'PENDING_APPROVAL' && isAdminV185) {
      actions += '<button class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200" title="Approve on website" onclick="event.stopPropagation();approveCarBookingWebsiteFront(\'' + cesBookEsc_(row.bookingId) + '\',\'APPROVE\')"><i class="fas fa-check"></i></button>';
      actions += '<button class="w-8 h-8 rounded-lg bg-red-50 text-red-600 border border-red-200" title="Reject on website" onclick="event.stopPropagation();approveCarBookingWebsiteFront(\'' + cesBookEsc_(row.bookingId) + '\',\'REJECT\')"><i class="fas fa-xmark"></i></button>';
    }
    if (status === 'CONFIRMED' || status === 'IN_PROGRESS') actions += '<button class="w-8 h-8 rounded-lg bg-blue-50 text-[#003DA5] border border-blue-100" title="Return" onclick="event.stopPropagation();openVehicleReturn(\'' + type + '\',\'' + cesBookEsc_(row.bookingId) + '\')"><i class="fas fa-rotate-left"></i></button>';
    if (['COMPLETED','CANCELLED','REJECTED'].indexOf(status) < 0) actions += '<button class="w-8 h-8 rounded-lg bg-red-50 text-red-500 border border-red-100" title="Cancel" onclick="event.stopPropagation();cancelVehicleBooking(\'' + type + '\',\'' + cesBookEsc_(row.bookingId) + '\')"><i class="fas fa-ban"></i></button>';
    return '<tr class="hover:bg-blue-50/40 cursor-pointer transition-colors" onclick="openVehicleBookingDetail(\''+type+'\',\''+cesBookEsc_(row.bookingId)+'\')"><td class="p-3 font-bold text-slate-700 ces-booking-date-cell-v38"><div class="whitespace-nowrap">' + cesBookEsc_(row.bookingDate || '-') + ((row.plannedReturnDate && row.plannedReturnDate !== row.bookingDate) ? ' <span class="text-blue-600">→ ' + cesBookEsc_(row.plannedReturnDate) + '</span>' : '') + '</div><div class="text-[10px] text-slate-400 mt-1 whitespace-nowrap">' + cesBookEsc_(row.startTime || '') + ' – ' + cesBookEsc_(row.endTime || '') + '</div></td><td class="p-3"><b>' + cesBookEsc_(row.requesterName || '-') + '</b><div class="text-[10px] text-slate-400 flex items-center gap-1.5 mt-1"><span class="' + cesBookTeamClass_(row.team) + '">' + cesBookEsc_(row.team || '-') + '</span><span>· ' + cesBookEsc_(row.contact || '-') + '</span></div></td><td class="p-3"><b>' + cesBookEsc_(row.jobTitle || '-') + '</b><div class="text-[10px] text-slate-400 max-w-[240px] whitespace-normal">' + cesBookEsc_(row.destination || '-') + '</div></td><td class="p-3"><b>' + (Number(row.actualTotalKm||0)>0 ? cesBookEsc_(row.actualTotalKm)+' km' : 'KM at return') + '</b><div class="text-[10px] text-slate-400">' + (row.electricBill !== '' && row.electricBill != null ? cesBookMoney_(row.electricBill) : 'No bill') + '</div></td><td class="p-3"><span class="inline-flex px-2.5 py-1 rounded-full text-[10px] font-black ' + cesBookStatusClass_(status) + '">' + cesBookEsc_(status) + '</span></td><td class="p-3"><div class="flex gap-2">' + (docs || '<span class="text-slate-300">—</span>') + '</div></td><td class="p-3 text-center"><div class="flex justify-center gap-2">' + actions + '</div></td></tr>';
  }).join('') + '</tbody></table></div><div class="mt-2 text-[10px] text-slate-400"><i class="fas fa-circle-info mr-1"></i>Click any row to open full details and edit attachments.</div>';
}

function cesBookingDetailInput_(id,label,value,type,disabled) {
  type = type || 'text';
  var safeValue=(value==null?'':value); return '<div><label class="ces-detail-label-v243">'+cesBookEsc_(label)+'</label><input id="'+id+'" type="'+type+'" value="'+cesBookEsc_(safeValue)+'" '+(disabled?'disabled':'')+' class="ces-detail-input-v243"></div>';
}
function cesBookingDetailTextArea_(id,label,value,disabled) {
  var safeValue=(value==null?'':value); return '<div><label class="ces-detail-label-v243">'+cesBookEsc_(label)+'</label><textarea id="'+id+'" rows="2" '+(disabled?'disabled':'')+' class="ces-detail-input-v243">'+cesBookEsc_(safeValue)+'</textarea></div>';
}

async function openVehicleBookingDetail(type, bookingId) {
  type=cesBookType_(type); bookingId=String(bookingId||'');
  var row=(cesBookingState_(type).rows||[]).find(function(x){return String(x.bookingId)===bookingId;});
  if(!row)return Swal.fire('Booking details','Booking record not found. Please Refresh Data.','warning');
  var user=cesBookingCurrentUser_(),status=String(row.status||'').toUpperCase();
  var active=['PENDING_APPROVAL','CONFIRMED','IN_PROGRESS'].indexOf(status)>=0,completed=status==='COMPLETED';
  var canEdit=(String(user.role||'').toUpperCase()==='ADMIN'||String(user.id||'')===String(row.requesterId||''))&&(active||completed);
  var billUrls=(row.returnBillFileUrls&&row.returnBillFileUrls.length)?row.returnBillFileUrls:(row.returnBillFileUrl?[row.returnBillFileUrl]:[]);
  var billLinks=billUrls.map(function(url,i){return '<a target="_blank" href="'+cesBookEsc_(url)+'" class="ces-detail-doc-v243"><i class="fas fa-receipt"></i> Bill / Receipt '+(i+1)+'</a>';}).join('');
  var photoLinks=(row.returnCarPhotoFileUrls||[]).map(function(url,i){return '<a target="_blank" href="'+cesBookEsc_(url)+'" class="ces-detail-doc-v243"><i class="fas fa-image"></i> Car photo '+(i+1)+'</a>';}).join('');
  var docLinks=(row.memoFileUrl?'<a target="_blank" href="'+cesBookEsc_(row.memoFileUrl)+'" class="ces-detail-doc-v243"><i class="fas fa-paperclip"></i> MEMO / Work Order</a>':'')+billLinks+photoLinks;
  var html='<div class="ces-booking-detail-v243 text-left"><div class="ces-detail-head-v243"><div><small>BOOKING ID</small><b>'+cesBookEsc_(row.bookingId)+'</b></div><span class="'+cesBookStatusClass_(status)+'">'+cesBookEsc_(status)+'</span></div><div class="ces-detail-requester-v243"><b>'+cesBookEsc_(row.requesterName||'-')+'</b><span>'+cesBookEsc_(row.team||'-')+' · '+cesBookEsc_(row.requesterId||'-')+'</span></div>';
  if(active){html+='<div class="ces-detail-grid-v243">'+cesBookingDetailInput_('ces-edit-job-v243','Job / Customer',row.jobTitle,'text',!canEdit)+cesBookingDetailInput_('ces-edit-destination-v243','Destination',row.destination,'text',!canEdit)+cesBookingDetailInput_('ces-edit-date-v243','Start Date',row.bookingDate,'date',!canEdit)+cesBookingDetailInput_('ces-edit-return-date-v243','Planned Return',row.plannedReturnDate||row.bookingDate,'date',!canEdit)+cesBookingDetailInput_('ces-edit-start-v243','Start Time',row.startTime,'time',!canEdit)+cesBookingDetailInput_('ces-edit-end-v243','End Time',row.endTime,'time',!canEdit)+cesBookingDetailInput_('ces-edit-passengers-v243','Passengers',row.passengers||1,'number',!canEdit)+cesBookingDetailInput_('ces-edit-contact-v243','Contact',row.contact,'text',!canEdit)+'</div>'+cesBookingDetailTextArea_('ces-edit-purpose-v243','Purpose / Onsite Detail',row.purpose,!canEdit);}
  if(completed){html+='<div class="ces-detail-grid-v243">'+cesBookingDetailInput_('ces-edit-km-v243','Actual Total KM',row.actualTotalKm,'number',!canEdit)+cesBookingDetailInput_('ces-edit-bill-v243','Electric Bill (THB)',row.electricBill,'number',!canEdit)+'</div>'+cesBookingDetailTextArea_('ces-edit-return-note-v243','Return Note',row.returnNote,!canEdit);}
  html+='<div class="ces-detail-docs-v243">'+(docLinks||'<span class="text-slate-400">No document attached.</span>')+'</div>';
  if(canEdit){html+='<div class="ces-detail-upload-grid-v243"><div><label class="ces-detail-label-v243">Replace MEMO / Work Order</label><input id="ces-edit-memo-file-v243" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" class="ces-detail-file-v243"></div>'+(completed?'<div><label class="ces-detail-label-v243">Replace Bill / Receipt</label><input id="ces-edit-bill-file-v243" type="file" accept=".pdf,.jpg,.jpeg,.png,.heic" class="ces-detail-file-v243"></div><div class="ces-detail-upload-full-v243"><label class="ces-detail-label-v243">Add Car Pictures</label><input id="ces-edit-car-photos-v243" type="file" multiple accept=".jpg,.jpeg,.png,.heic,.webp" class="ces-detail-file-v243"></div>':'')+'</div>';}
  if(!canEdit)html+='<div class="mt-3 rounded-xl bg-slate-50 border p-3 text-xs text-slate-500">Read only: only the requester or ADMIN can edit this record.</div>';
  html+='</div>';
  var result=await Swal.fire({title:'Car Booking Details',html:html,width:900,showCancelButton:canEdit,showConfirmButton:true,confirmButtonText:canEdit?'Save Changes':'Close',cancelButtonText:'Cancel',confirmButtonColor:'#003DA5',focusConfirm:false,showLoaderOnConfirm:canEdit,allowOutsideClick:function(){return !Swal.isLoading();},preConfirm:canEdit?async function(){try{return await saveVehicleBookingDetail(type,row);}catch(error){Swal.showValidationMessage(error&&error.message?error.message:String(error));return false;}}:undefined});
  if(canEdit&&result.isConfirmed&&result.value){if(typeof showToast==='function')showToast('Booking updated','success');loadVehicleBookingWorkspace(type,true,true).catch(function(){});}
}
window.openVehicleBookingDetail=openVehicleBookingDetail;

async function saveVehicleBookingDetail(type,row){
  var user=cesBookingCurrentUser_(),status=String(row.status||'').toUpperCase(),active=['PENDING_APPROVAL','CONFIRMED','IN_PROGRESS'].indexOf(status)>=0,completed=status==='COMPLETED';
  var payload={bookingType:type,bookingId:row.bookingId,actorId:user.id};
  function val(id){var el=document.getElementById(id);return el?el.value:'';}
  if(active){payload.jobTitle=val('ces-edit-job-v243').trim();payload.destination=val('ces-edit-destination-v243').trim();payload.bookingDate=val('ces-edit-date-v243');payload.plannedReturnDate=val('ces-edit-return-date-v243');payload.startTime=val('ces-edit-start-v243');payload.endTime=val('ces-edit-end-v243');payload.passengers=Number(val('ces-edit-passengers-v243')||1);payload.contact=val('ces-edit-contact-v243').trim();payload.purpose=val('ces-edit-purpose-v243').trim();if(!payload.jobTitle||!payload.destination)throw new Error('Job / Customer and Destination are required.');}
  if(completed){payload.actualTotalKm=val('ces-edit-km-v243');payload.electricBill=val('ces-edit-bill-v243');payload.returnNote=val('ces-edit-return-note-v243').trim();}
  var memoEl=document.getElementById('ces-edit-memo-file-v243'),memoFile=memoEl&&memoEl.files?memoEl.files[0]:null;
  var billEl=document.getElementById('ces-edit-bill-file-v243'),billFile=billEl&&billEl.files?billEl.files[0]:null;
  var photosEl=document.getElementById('ces-edit-car-photos-v243'),photos=photosEl&&photosEl.files?Array.from(photosEl.files):[];
  if(memoFile){var memo=await cesReadBookingFile_(memoFile,10);memo.requesterId=user.id;memo.uploadToken=row.bookingId+'-EDIT-MEMO-'+Date.now();var mr=await cesBookingApiCall_(['uploadCarBookingMemo'],[memo],{transport:'iframe',timeoutMs:180000,loadingLabel:'Uploading MEMO / Work Order…'});if(!mr||!mr.success)throw new Error((mr&&mr.message)||'MEMO upload failed.');payload.memoFileId=mr.fileId;payload.memoFileUrl=mr.fileUrl;}
  if(billFile){var bill=await cesReadBookingFile_(billFile,8);bill.bookingType=type;bill.bookingId=row.bookingId;bill.requesterId=user.id;bill.uploadToken=row.bookingId+'-EDIT-BILL-'+Date.now();var br=await cesBookingApiCall_(['uploadVehicleReturnBill'],[bill],{transport:'iframe',timeoutMs:180000,loadingLabel:'Uploading Bill / Receipt…'});if(!br||!br.success)throw new Error((br&&br.message)||'Bill upload failed.');payload.billFileId=br.fileId;payload.billFileUrl=br.fileUrl;}
  if(photos.length){var photoResults=await Promise.all(photos.map(async function(file,i){var photo=await cesReadBookingFile_(file,10);photo.bookingType=type;photo.bookingId=row.bookingId;photo.requesterId=user.id;photo.uploadToken=row.bookingId+'-EDIT-PHOTO-'+Date.now()+'-'+i;return cesBookingApiCall_(['uploadVehicleReturnPhoto'],[photo],{transport:'iframe',timeoutMs:180000,loadingLabel:'Uploading car pictures…'});}));payload.addCarPhotoFileIds=[];payload.addCarPhotoFileUrls=[];payload.addCarPhotoFileNames=[];photoResults.forEach(function(r){if(!r||!r.success)throw new Error((r&&r.message)||'Car photo upload failed.');payload.addCarPhotoFileIds.push(r.fileId);payload.addCarPhotoFileUrls.push(r.fileUrl);payload.addCarPhotoFileNames.push(r.fileName);});}
  var saved=await cesBookingApiCall_(['updateVehicleBookingRecord'],[payload],{timeoutMs:60000,loadingLabel:'Saving booking changes…'});if(!saved||!saved.success)throw new Error((saved&&saved.message)||'Cannot update booking.');return saved;
}
window.saveVehicleBookingDetail=saveVehicleBookingDetail;

function cesBookingReadBlob_(blob, fileName, mimeType) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function() {
      var base64 = String(reader.result || '').split(',')[1] || '';
      resolve({ fileName:fileName, mimeType:mimeType || blob.type || 'application/octet-stream', base64:base64, byteSize:blob.size || 0 });
    };
    reader.onerror = function() { reject(new Error('Cannot read the selected file.')); };
    reader.readAsDataURL(blob);
  });
}

function cesBookingCompressImage_(file) {
  return new Promise(function(resolve) {
    var type = String(file.type || '').toLowerCase();
    if (!/^image\/(jpeg|jpg|png|webp)$/.test(type) || file.size < 700 * 1024) {
      resolve(null);
      return;
    }
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function() {
      try {
        var maxSide = 1600;
        var scale = Math.min(1, maxSide / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
        var width = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
        var height = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
        var canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(function(blob) {
          URL.revokeObjectURL(url);
          if (!blob || blob.size >= file.size) { resolve(null); return; }
          var stem = String(file.name || 'attachment').replace(/\.[^.]+$/, '');
          resolve({ blob:blob, fileName:stem + '-compressed.jpg', mimeType:'image/jpeg' });
        }, 'image/jpeg', 0.82);
      } catch (ignore) {
        URL.revokeObjectURL(url);
        resolve(null);
      }
    };
    img.onerror = function() { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

async function cesReadBookingFile_(file, maxMb) {
  if (!file) throw new Error('File is required.');
  if (file.size > maxMb * 1024 * 1024) throw new Error('File is too large. Maximum ' + maxMb + ' MB.');
  var compressed = await cesBookingCompressImage_(file);
  if (compressed) {
    var result = await cesBookingReadBlob_(compressed.blob, compressed.fileName, compressed.mimeType);
    result.originalFileName = file.name;
    result.compressed = true;
    return result;
  }
  var raw = await cesBookingReadBlob_(file, file.name, file.type || 'application/octet-stream');
  raw.originalFileName = file.name;
  raw.compressed = false;
  return raw;
}


var CES_BOOKING_AUTH_V31_CACHE = { checkedAt:0, result:null };

/**
 * V31 does not block Booking with a global authorization preflight.
 * Each backend operation validates only the service it actually uses. This
 * prevents an optional Calendar/Docs scope from freezing a valid Sheet save.
 */
async function cesBookingAuthorizationPreflight_() {
  return { authorized:true, mode:'service-specific-v31', nonBlocking:true };
}

function cesBookingRequestId_(type, requesterId) {
  return [String(type || 'VEHICLE').toUpperCase(), String(requesterId || 'USER'), Date.now(), Math.random().toString(36).slice(2, 10)].join('-');
}

function cesBookingPromiseTimeout_(promise, timeoutMs, label) {
  return Promise.race([
    promise,
    new Promise(function(_, reject) {
      setTimeout(function() { reject(new Error((label || 'Operation') + ' timeout. The saved data can be checked with Refresh Data.')); }, timeoutMs);
    })
  ]);
}

function cesBookingProgress_(title, detail) {
  if (typeof Swal === 'undefined' || !Swal.isVisible()) return;
  Swal.update({
    title:title,
    html:'<div style="font-size:12px;color:#64748b;margin-top:8px">' + cesBookEsc_(detail || '') + '</div>',
    showConfirmButton:false,
    allowOutsideClick:false
  });
  Swal.showLoading();
}

async function submitVehicleRequest(type) {
  type = cesBookType_(type);
  var prefix = cesBookPrefix_(type), state = cesBookingState_(type);
  var planValue = cesBookGet_(prefix + '-onsite-plan');
  var manualWork = planValue === '__MANUAL__';
  var plan = (!manualWork && planValue !== '') ? state.plans[Number(planValue)] : null;
  var fileInput = document.getElementById(prefix + '-memo-file');
  var file = fileInput && fileInput.files ? fileInput.files[0] : null;
  var payload = {
    bookingType:type, clientRequestId:'', calendarUniqueKey:manualWork?'':cesBookGet_(prefix + '-calendar-key'),
    calendarTeam:cesBookGet_(prefix + '-calendar-team') || cesBookGet_(prefix + '-requester-team'),
    bookingDate:cesBookGet_(prefix + '-book-date'), plannedReturnDate:cesBookGet_(prefix + '-book-return-date'),
    startTime:cesBookGet_(prefix + '-book-start') || '08:00', endTime:cesBookGet_(prefix + '-book-end') || '17:00',
    requesterId:cesBookGet_(prefix + '-requester-id').trim(), requesterName:cesBookGet_(prefix + '-requester-name').trim(),
    requesterEmail:cesBookGet_(prefix + '-requester-email').trim(), requesterPosition:cesBookGet_(prefix + '-requester-position').trim(),
    team:String(cesBookGet_(prefix + '-requester-team') || '').toUpperCase(), jobTitle:cesBookGet_(prefix + '-job-title').trim(),
    destination:cesBookGet_(prefix + '-book-destination').trim(), purpose:cesBookGet_(prefix + '-book-purpose').trim(),
    passengers:Number(cesBookGet_(prefix + '-book-passengers') || 1), contact:cesBookGet_(prefix + '-book-contact').trim(), totalKm:0,
    attachmentLink:type==='CAR'?(cesBookGet_('car-attachment-link')||'').trim():''
  };
  var selectedApproverV260 = null;
  if(type==='CAR'){
    var approverIndexV260=cesBookGet_('car-approver');
    selectedApproverV260=approverIndexV260===''?null:(state.approvers||[])[Number(approverIndexV260)];
    if(selectedApproverV260){
      payload.approverId=String(selectedApproverV260.id||'');
      payload.approverName=String(selectedApproverV260.nameEng||selectedApproverV260.nameTh||selectedApproverV260.id||'');
      payload.approverEmail=String(selectedApproverV260.email||'');
    }
  }
  payload.clientRequestId = cesBookingRequestId_(type, payload.requesterId);
  var todayIso=(function(){var d=new Date(),o=d.getTimezoneOffset()*60000;return new Date(d.getTime()-o).toISOString().slice(0,10);})();
  if(payload.bookingDate && payload.bookingDate<todayIso){cesBookMarkMissing_(type,[{id:prefix+'-book-date',label:'Start Date must be today or later',missing:true}],'ไม่สามารถจองย้อนหลังได้');return;}
  var requestMissing=[
    {id:prefix+'-requester-id',label:'Employee ID',missing:!payload.requesterId},{id:prefix+'-requester-name',label:'Requester Name',missing:!payload.requesterName},
    {id:prefix+'-requester-team',label:'Team',missing:!CES_BOOKING_V31.allowedTeams.includes(payload.team)},
    {id:prefix+'-job-title',label:'Job / Customer',missing:!payload.jobTitle},{id:prefix+'-book-date',label:'Start Date',missing:!payload.bookingDate},
    {id:prefix+'-book-return-date',label:'Planned Return Date',missing:!payload.plannedReturnDate},{id:prefix+'-book-start',label:'Start Time',missing:!payload.startTime},
    {id:prefix+'-book-end',label:'End Time',missing:!payload.endTime},{id:prefix+'-book-destination',label:'Destination',missing:!payload.destination},
    {id:'car-approver',label:'Approver',missing:type==='CAR'&&(!selectedApproverV260||!payload.approverEmail)},
    {id:prefix+'-memo-file',label:'MEMO / Work Order',missing:type==='CAR'&&!file}
  ];
  if(cesBookMarkMissing_(type,requestMissing,'กรอกข้อมูลคำขอไม่ครบ'))return;
  var dateRange=cesBookDateRange_(payload.bookingDate,payload.plannedReturnDate);if(!dateRange.length){cesBookMarkMissing_(type,[{id:prefix+'-book-return-date',label:'Planned Return Date ต้องไม่น้อยกว่า Start Date',missing:true}],'ช่วงวันที่ไม่ถูกต้อง');return;}
  if(payload.bookingDate===payload.plannedReturnDate&&payload.endTime<=payload.startTime){cesBookMarkMissing_(type,[{id:prefix+'-book-end',label:'End Time ต้องมากกว่า Start Time',missing:true}],'เวลาไม่ถูกต้อง');return;}
  var approvalSummaryV260=type==='CAR'
    ? '<br><b>Approver:</b> '+cesBookEsc_(payload.approverName||'-')+' · '+cesBookEsc_(payload.approverEmail||'-')+'<br><b>Always CC:</b> Siripak.Ch@nhealth-asia.com · Thippayawaree.Kh@nhealth-asia.com'
    : '';
  var confirm=await Swal.fire({title:'Submit '+type+' Request?',html:'<div style="text-align:left;font-size:13px"><b>Requester:</b> '+cesBookEsc_(payload.requesterName)+' ('+cesBookEsc_(payload.team)+')<br><b>Work source:</b> '+(manualWork?'Manual / not in Calendar':'Master Calendar')+'<br><b>Job:</b> '+cesBookEsc_(payload.jobTitle)+'<br><b>Date:</b> '+cesBookEsc_(payload.bookingDate)+(payload.plannedReturnDate!==payload.bookingDate?' → '+cesBookEsc_(payload.plannedReturnDate):'')+' '+cesBookEsc_(payload.startTime)+'–'+cesBookEsc_(payload.endTime)+'<br><b>Destination:</b> '+cesBookEsc_(payload.destination)+approvalSummaryV260+'</div>',icon:'question',showCancelButton:true,confirmButtonText:'Confirm & Submit',confirmButtonColor:'#003DA5'});if(!confirm.isConfirmed)return;
  if(CES_BOOKING_V31.inFlight[type]){Swal.fire('Please wait','This booking request is already being submitted.','info');return;}CES_BOOKING_V31.inFlight[type]=true;
  var submitBtn=document.getElementById('car-submit-request-v243');if(submitBtn){submitBtn.disabled=true;submitBtn.setAttribute('aria-busy','true');}
  var submitStartedV243=Date.now();
  try{
    Swal.fire({title:'Submitting booking…',html:'<div style="font-size:12px;color:#64748b">Uploading MEMO / Work Order and saving request in one operation.</div>',allowOutsideClick:false,allowEscapeKey:false,showConfirmButton:false,didOpen:function(){Swal.showLoading();}});
    await cesBookingAuthorizationPreflight_();
    var savedResult;
    if(type==='CAR'){
      cesBookingProgress_('Preparing MEMO / Work Order…',file.name);
      var memo=await cesReadBookingFile_(file,10);memo.requesterId=payload.requesterId;memo.clientRequestId=payload.clientRequestId;memo.uploadToken=payload.clientRequestId;
      cesBookingProgress_('Saving booking…','Upload + booking save are processed together for faster submission.');
      savedResult=await cesBookingPromiseTimeout_(cesBookingApiCall_(cesBookingApiNames_(type,'createVehicleBookingRequestFast'),[payload,memo],{transport:'iframe',timeoutMs:210000,loadingLabel:'Submitting Car Booking…'}),220000,'Booking submit');
    }else{
      savedResult=await cesBookingPromiseTimeout_(cesBookingApiCall_(cesBookingApiNames_(type,'createVehicleBookingRequest'),[payload],{timeoutMs:60000,loadingLabel:'Submitting Booking…'}),70000,'Request save');
    }
    if(!savedResult||!savedResult.success)throw new Error((savedResult&&savedResult.message)||'Cannot save request.');
    state.loaded=false;resetVehicleRequest_(type);Swal.close();
    var elapsedV243=Math.max(0,Math.round((Date.now()-submitStartedV243)/100)/10);
    await Swal.fire({title:'Booking Complete',html:'<div style="text-align:center"><b>Upload done · Submit done</b><br>Booking <b>'+cesBookEsc_(savedResult.bookingId)+'</b> was saved successfully.<br><span style="font-size:12px;color:#64748b">Completed in '+elapsedV243+' sec · Approval notification is queued in the background.</span></div>',icon:'success',confirmButtonText:'Done',confirmButtonColor:'#059669'});
    loadVehicleBookingWorkspace(type,true,true).catch(function(){});
  }catch(err){Swal.close();await Swal.fire({title:type+' Booking Error',text:err.message||String(err),icon:'error',confirmButtonColor:'#003DA5'});}finally{CES_BOOKING_V31.inFlight[type]=false;if(submitBtn){submitBtn.disabled=false;submitBtn.removeAttribute('aria-busy');}}
}


// V26.3: return completes immediately; TE generation UI is removed.
function cesVehicleReturnRatingRow_(key,title,detail){
  return '<div class="ces-return-rating-row-v209"><div><b>'+cesBookEsc_(title)+'</b><small>'+cesBookEsc_(detail)+'</small></div><div class="ces-vehicle-stars-v209" data-rating-key="'+key+'">'+[1,2,3,4,5].map(function(n){return '<button type="button" data-rating="'+n+'" aria-label="'+n+' stars"><i class="fas fa-star"></i></button>';}).join('')+'</div></div>';
}
async function cesVehicleSaveReturnEvaluation_(type,bookingId,ratings,comment){
  ratings=ratings||{};comment=String(comment||'').trim();
  if(!Number(ratings.performance||0)&&!Number(ratings.comfort||0)&&!Number(ratings.value||0)&&!comment)return {success:true,skipped:true};
  var u=cesBookingCurrentUser_();
  try{return await cesBookingApiCall_(['saveVehicleReturnEvaluation'],[{bookingType:type,bookingId:bookingId,performance:Number(ratings.performance||0),comfort:Number(ratings.comfort||0),value:Number(ratings.value||0),comment:comment,ratedBy:u.name||u.id||''}],{transport:'iframe',timeoutMs:60000});}
  catch(error){console.warn('[Vehicle evaluation]',error);return {success:false,message:error&&error.message?error.message:String(error)};}
}
async function showVehicleReturnSuccess_(type,result,payload){
  result=result||{};payload=payload||{};
  var km=Number(result.actualTotalKm||payload.actualTotalKm||0),bill=Number(result.electricBill||payload.electricBill||0),normal=Number(result.normalCost||km*5),saving=Number(result.saving!=null?result.saving:normal-bill),isSaving=saving>=0,pct=normal?Math.round(Math.abs(saving)*10000/normal)/100:0;
  var values={performance:0,comfort:0,value:0,comment:''};
  var html='<div class="text-left"><div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4"><div class="rounded-xl border bg-slate-50 p-3"><div class="text-[10px] font-black text-slate-400">REGULAR CAR FEE</div><div class="text-xl font-black text-slate-700">'+cesBookMoney_(normal)+'</div><div class="text-[10px] text-slate-400">'+km+' km × 5 THB/km</div></div><div class="rounded-xl border border-emerald-100 bg-emerald-50 p-3"><div class="text-[10px] font-black text-emerald-600">ELECTRIC BILL</div><div class="text-xl font-black text-emerald-700">'+cesBookMoney_(bill)+'</div><div class="text-[10px] text-emerald-600">Actual charging cost</div></div><div class="rounded-xl '+(isSaving?'bg-green-600':'bg-red-600')+' p-3 text-white"><div class="text-[10px] font-black opacity-80">'+(isSaving?'TOTAL SAVING':'ADDITIONAL COST')+'</div><div class="text-xl font-black">'+cesBookMoney_(Math.abs(saving))+'</div><div class="text-[10px] opacity-80">'+pct+'% '+(isSaving?'lower':'higher')+' than regular fee</div></div></div>'+
    '<div class="text-xs font-black text-slate-700 mb-2">ประเมินการใช้งานรถ 1–5 ดาว</div><div class="ces-return-rating-grid-v209">'+
    cesVehicleReturnRatingRow_('performance','1. สมรรถนะและการขับขี่','อัตราเร่ง การเบรก และการทรงตัว')+
    cesVehicleReturnRatingRow_('comfort','2. ความสะดวกสบายและฟังก์ชัน','เบาะนั่ง แอร์ หน้าจอ และพื้นที่โดยสาร')+
    cesVehicleReturnRatingRow_('value','3. ความคุ้มค่าและอัตราสิ้นเปลือง','การประหยัดน้ำมัน/ไฟฟ้า และความคุ้มค่า')+
    '</div><textarea id="ces-vehicle-rating-comment-v209" class="w-full mt-3 rounded-xl border border-slate-200 p-3 text-xs" rows="2" placeholder="4. ความคิดเห็นเพิ่มเติม (ไม่บังคับ)"></textarea></div>';
  var answer=await Swal.fire({title:'Return Complete',html:'<div class="mb-3 rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-emerald-700 text-sm font-black text-center"><i class="fas fa-circle-check mr-1"></i> Upload done · Return submitted successfully</div>'+html,icon:'success',width:760,confirmButtonText:'Save Evaluation & Close',confirmButtonColor:'#059669',allowOutsideClick:false,didOpen:function(){document.querySelectorAll('.ces-vehicle-stars-v209').forEach(function(group){group.querySelectorAll('button').forEach(function(btn){btn.addEventListener('click',function(){var n=Number(btn.dataset.rating||0),key=group.dataset.ratingKey;values[key]=n;group.querySelectorAll('button').forEach(function(b){b.classList.toggle('active',Number(b.dataset.rating||0)<=n);});});});});},willClose:function(){var c=document.getElementById('ces-vehicle-rating-comment-v209');values.comment=c?c.value:'';}});
  var evalResult=await cesVehicleSaveReturnEvaluation_(type,result.bookingId||payload.bookingId,values,values.comment);
  if(evalResult&&evalResult.success===false&&typeof showToast==='function')showToast('คืนรถสำเร็จ แต่บันทึกแบบประเมินไม่สำเร็จ','warning');
  return answer;
}
async function generateVehicleMonthlyTeFront(type,options){
  type=cesBookType_(type);options=options||{};if(type!=='CAR')return;
  var u=cesBookingCurrentUser_(),year=String(options.year||cesBookGet_('car-summary-year-filter')||'').trim(),month=String(options.month||cesBookGet_('car-summary-month-filter')||'').trim();
  var now=new Date();if(!/^\d{4}$/.test(year))year=String(now.getFullYear());if(!/^\d{2}$/.test(month)||month==='All')month=String(now.getMonth()+1).padStart(2,'0');
  var requesterId=String(options.requesterId||u.id||cesBookGet_('car-requester-id')||'').trim(),team=String(options.team||u.team||cesBookGet_('car-requester-team')||'').trim();
  if(!requesterId){return Swal.fire('Generate TE','ไม่พบรหัสพนักงานสำหรับสร้าง TE','warning');}
  if(!options.skipConfirm){var confirm=await Swal.fire({title:'Generate Monthly TE?',html:'รวมรายการคืนรถที่เสร็จสมบูรณ์ของ <b>'+cesBookEsc_(requesterId)+'</b><br>เดือน <b>'+cesBookEsc_(year+'-'+month)+'</b>',icon:'question',showCancelButton:true,confirmButtonText:'Generate',confirmButtonColor:'#003DA5'});if(!confirm.isConfirmed)return;}
  try{Swal.fire({title:'Generating Monthly TE…',html:'กำลังรวมรายการใช้งานรถในเดือน '+cesBookEsc_(year+'-'+month),allowOutsideClick:false,showConfirmButton:false,didOpen:function(){Swal.showLoading();}});var result=await cesBookingPromiseTimeout_(cesBookingApiCall_(['generateVehicleMonthlyTe'],[{bookingType:'CAR',requesterId:requesterId,team:team,year:Number(year),month:month}],{transport:'iframe',timeoutMs:240000}),250000,'Monthly TE generation');if(!result||!result.success)throw new Error((result&&result.message)||'Monthly TE generation failed.');var links='<div class="text-left"><div class="grid grid-cols-2 gap-3 mb-3"><div class="rounded-xl bg-slate-50 border p-3"><small class="text-slate-400">USAGE RECORDS</small><b class="block text-lg">'+Number(result.recordCount||0)+'</b></div><div class="rounded-xl bg-green-50 border border-green-100 p-3"><small class="text-green-600">TOTAL SAVING</small><b class="block text-lg text-green-700">'+cesBookMoney_(result.saving||0)+'</b></div></div><div class="flex flex-wrap gap-2"><a class="px-4 py-2 rounded-xl bg-[#003DA5] text-white text-xs font-black" href="'+cesBookEsc_(result.pdfUrl||'#')+'" target="_blank"><i class="fas fa-file-pdf mr-1"></i>Open PDF</a><a class="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black" href="'+cesBookEsc_(result.xlsxUrl||'#')+'" target="_blank"><i class="fas fa-file-excel mr-1"></i>Open Excel</a></div></div>';return Swal.fire({title:'Monthly TE ready',html:links,icon:'success',confirmButtonColor:'#003DA5'});}catch(error){return Swal.fire('Monthly TE Error',error&&error.message?error.message:String(error),'error');}
}
window.generateVehicleMonthlyTeFront=generateVehicleMonthlyTeFront;

async function submitVehicleReturn(type) {
  type=cesBookType_(type);var prefix=cesBookPrefix_(type),billInput=document.getElementById(prefix+'-return-bill-file'),billFiles=billInput&&billInput.files?Array.from(billInput.files):[],photoInput=document.getElementById(prefix+'-return-car-photos'),carPhotos=type==='CAR'&&photoInput&&photoInput.files?Array.from(photoInput.files):[],bookingId=cesBookGet_(prefix+'-return-booking'),item=(cesBookingState_(type).rows||[]).find(function(row){return String(row.bookingId)===String(bookingId);});
  var payload={bookingType:type,bookingId:bookingId,returnDate:cesBookGet_(prefix+'-return-date'),returnTime:cesBookGet_(prefix+'-return-time'),actualTotalKm:Number(cesBookGet_(prefix+'-return-km')||0),electricBill:Number(cesBookGet_(prefix+'-electric-bill')||0),note:cesBookGet_(prefix+'-return-note').trim(),returnedById:item?item.requesterId:'',returnedByName:item?item.requesterName:''};
  var returnMissing=[{id:prefix+'-return-booking',label:'Select Job',missing:!payload.bookingId},{id:prefix+'-return-date',label:'Return Date',missing:!payload.returnDate},{id:prefix+'-return-time',label:'Return Time',missing:!payload.returnTime},{id:prefix+'-return-km',label:'Actual Total KM',missing:!(payload.actualTotalKm>0)},{id:prefix+'-electric-bill',label:'Electric Bill',missing:payload.electricBill<0||cesBookGet_(prefix+'-electric-bill')===''},{id:prefix+'-return-bill-file',label:'Bill / Receipt',missing:!billFiles.length},{id:prefix+'-return-car-photos',label:'Car Return Pictures',missing:type==='CAR'&&!carPhotos.length}];
  if(cesBookMarkMissing_(type,returnMissing,'กรอกข้อมูลคืนรถไม่ครบ'))return;
  var confirm=await Swal.fire({title:'Confirm vehicle return?',html:'<div style="text-align:left;font-size:13px"><b>Booking:</b> '+cesBookEsc_(payload.bookingId)+'<br><b>Returned By:</b> '+cesBookEsc_(payload.returnedByName)+'<br><b>Actual distance:</b> '+payload.actualTotalKm+' km<br><b>Electric bill:</b> '+cesBookMoney_(payload.electricBill)+'<br><b>Bill / Receipt files:</b> '+billFiles.length+'<br><b>Car pictures:</b> '+carPhotos.length+'</div>',icon:'question',showCancelButton:true,confirmButtonText:'Confirm Return',confirmButtonColor:'#003DA5'});if(!confirm.isConfirmed)return;
  var returnFlightKey=type+'_RETURN';if(CES_BOOKING_V31.inFlight[returnFlightKey]){Swal.fire('Please wait','This vehicle return is already being submitted.','info');return;}CES_BOOKING_V31.inFlight[returnFlightKey]=true;
  try{
    Swal.fire({title:'Saving return…',html:'กำลังอัปโหลดไฟล์แนบและบันทึกข้อมูลคืนรถ',allowOutsideClick:false,showConfirmButton:false,didOpen:function(){Swal.showLoading();}});await cesBookingAuthorizationPreflight_();
    var billsPromise=Promise.all(billFiles.map(async function(file,i){var attachment=await cesReadBookingFile_(file,8);attachment.bookingType=type;attachment.bookingId=payload.bookingId;attachment.requesterId=payload.returnedById;attachment.uploadToken=payload.bookingId+'-RETURN-BILL-'+payload.returnDate+'-'+(i+1);return cesBookingPromiseTimeout_(cesBookingApiCall_(cesBookingApiNames_(type,'uploadVehicleReturnBill'),[attachment],{transport:'iframe',timeoutMs:240000,priority:'user'}),250000,'Receipt '+(i+1)+' upload');}));
    var photosPromise=Promise.all(carPhotos.map(async function(file,i){var photo=await cesReadBookingFile_(file,10);photo.bookingType=type;photo.bookingId=payload.bookingId;photo.requesterId=payload.returnedById;photo.uploadToken=payload.bookingId+'-CAR-'+payload.returnDate+'-'+(i+1);return cesBookingPromiseTimeout_(cesBookingApiCall_(['uploadVehicleReturnPhoto'],[photo],{transport:'iframe',timeoutMs:240000,priority:'user'}),250000,'Car photo upload');}));
    var uploadedAll=await Promise.all([billsPromise,photosPromise]),billResults=uploadedAll[0],photoResults=uploadedAll[1];payload.billFileIds=[];payload.billFileUrls=[];payload.billFileNames=[];billResults.forEach(function(uploaded,i){if(!uploaded||!uploaded.success)throw new Error((uploaded&&uploaded.message)||('Return bill '+(i+1)+' upload failed.'));payload.billFileIds.push(uploaded.fileId);payload.billFileUrls.push(uploaded.fileUrl);payload.billFileNames.push(uploaded.fileName);});payload.billFileId=payload.billFileIds[0]||'';payload.billFileUrl=payload.billFileUrls[0]||'';payload.carPhotoFileIds=[];payload.carPhotoFileUrls=[];payload.carPhotoFileNames=[];photoResults.forEach(function(photoResult,i){if(!photoResult||!photoResult.success)throw new Error((photoResult&&photoResult.message)||('Car photo '+(i+1)+' upload failed.'));payload.carPhotoFileIds.push(photoResult.fileId);payload.carPhotoFileUrls.push(photoResult.fileUrl);payload.carPhotoFileNames.push(photoResult.fileName);});
    var result=await cesBookingPromiseTimeout_(cesBookingApiCall_(cesBookingApiNames_(type,'completeVehicleReturn'),[payload],{timeoutMs:60000,loadingLabel:'Saving return…'}),70000,'Return save');if(!result||!result.success)throw new Error((result&&result.message)||'Cannot save return.');cesBookingState_(type).loaded=false;resetVehicleReturn_(type);Swal.close();await showVehicleReturnSuccess_(type,result,payload);loadVehicleBookingWorkspace(type,true).catch(function(){});
  }catch(err){Swal.close();Swal.fire('Return Error',err&&err.message?err.message:String(err),'error');}finally{CES_BOOKING_V31.inFlight[returnFlightKey]=false;}
}

function resetVehicleRequest_(type) {
  type = cesBookType_(type);
  var prefix = cesBookPrefix_(type);
  ['onsite-plan','calendar-key','calendar-team','job-title','book-date','book-return-date','book-destination','book-purpose','total-km','approver'].forEach(function(key) {
    cesBookSet_(prefix + '-' + key, '');
  });
  cesBookSet_(prefix + '-book-start', '08:00');
  cesBookSet_(prefix + '-book-end', '17:00');
  cesBookSet_(prefix + '-book-passengers', '1');
  var memo = document.getElementById(prefix + '-memo-file');
  if (memo) memo.value = '';
  var jobInputV243 = document.getElementById(prefix + '-job-title');
  if (jobInputV243) jobInputV243.readOnly = false;
  autoFillVehicleProfile(type, true);
}
function resetVehicleReturn_(type) {
  type = cesBookType_(type);
  var prefix = cesBookPrefix_(type);
  ['return-booking','return-km','electric-bill','return-note'].forEach(function(key) { cesBookSet_(prefix + '-' + key, ''); });
  cesBookSet_(prefix + '-return-date', cesBookToday_());
  cesBookSet_(prefix + '-return-time', cesBookNowTime_());
  var file = document.getElementById(prefix + '-return-bill-file');
  if (file) file.value = '';
  var photos = document.getElementById(prefix + '-return-car-photos');
  if (photos) photos.value = '';
  if(type==='CAR') cesBookSet_('car-returned-by','');
  var detail = document.getElementById(prefix + '-return-detail');
  if (detail) detail.textContent = 'Select a booking to view details.';
}

function cancelVehicleBooking(type, bookingId) {
  type = cesBookType_(type);
  Swal.fire({ title:'Cancel this booking?', text:bookingId, icon:'warning', showCancelButton:true, confirmButtonColor:'#dc2626', confirmButtonText:'Cancel Booking' }).then(async function(answer) {
    if (!answer.isConfirmed) return;
    var user = cesBookingCurrentUser_();
    try {
      Swal.fire({ title:'Cancelling booking…', allowOutsideClick:false, showConfirmButton:false, didOpen:function(){ Swal.showLoading(); } });
      var result = await cesBookingPromiseTimeout_(
        cesBookingApiCall_(cesBookingApiNames_(type,'cancelVehicleBooking'), [{ bookingType:type, bookingId:bookingId, updatedBy:user.name || user.id }], { transport:'iframe', timeoutMs:60000 }),
        65000,
        'Booking cancellation'
      );
      if (!result || !result.success) throw new Error((result && result.message) || 'Cannot cancel booking.');
      cesBookingState_(type).loaded = false;
      try { await loadVehicleBookingWorkspace(type, true); } catch (ignore) {}
      Swal.close();
      await Swal.fire('Cancelled', 'Booking cancelled. The status email is queued.', 'success');
    } catch (err) {
      Swal.close();
      Swal.fire('Error', err.message || String(err), 'error');
    }
  });
}


// Stable unversioned wrappers used by the app controller.
function loadCarBookingFormData(force) { return loadVehicleBookingWorkspace('CAR', force); }
function applyCarOnsitePlan() { return applyVehicleOnsitePlan('CAR'); }
function loadVehicleBookings(type, force) { return loadVehicleBookingWorkspace(type, force); }
function submitCarBookingRequest() { return submitVehicleRequest('CAR'); }
function submitVehicleBooking(type) { return submitVehicleRequest(type); }

window.CES_BOOKING_RECHECK=function(){return{success:true,version:'V20.9',requestDocument:false,requestApproval:true,requestEmailQueued:true,returnApproval:false,returnEmailQueued:true,returnOutput:'MONTHLY_TE_ON_DEMAND',multiPhotoReturn:true,regularRatePerKm:5,approvers:7,hourlyAvailability:true,workingDayUtilization:true,compactVehicleLayout:true,vanFilterResync:true,vanCalendarFilterSync:true,vanEndpointBilling:true,vanCalendar:'4a66f8df81e68d752715957a3805219e951d91c7b1c375e8996424ca2c55fef6@group.calendar.google.com'};};

const CES_VAN_V55={
  loaded:false,
  loading:false,
  requestSeq:0,
  events:[],
  availableDates:[],
  summary:{},
  baseEmbedUrl:'',
  forceFrameRefresh:false,
  calendarCursor:null,
  calendarId:'4a66f8df81e68d752715957a3805219e951d91c7b1c375e8996424ca2c55fef6@group.calendar.google.com'
};
function cesVanMoney_(value){return '฿'+Number(value||0).toLocaleString('th-TH',{maximumFractionDigits:0});}
function cesVanTeamBadge_(team){const map={MED:'bg-blue-50 text-[#004aad] border-blue-100',LAB:'bg-cyan-50 text-[#1587a7] border-cyan-100',EHS:'bg-emerald-50 text-[#0b8f78] border-emerald-100',ENV:'bg-lime-50 text-[#4c9c2e] border-lime-100',OTHER:'bg-slate-100 text-slate-600 border-slate-200'};return map[String(team||'OTHER').toUpperCase()]||map.OTHER;}
function cesVanSetText_(id,value){const el=document.getElementById(id);if(el)el.textContent=value;}
function cesVanMonthName_(month){return['January','February','March','April','May','June','July','August','September','October','November','December'][Math.max(0,Math.min(11,Number(month||1)-1))];}
function cesVanEnsureYearOption_(year){
  const yearEl=document.getElementById('van-year-filter-v55');if(!yearEl)return;
  const value=String(year);
  if(!Array.from(yearEl.options).some(option=>option.value===value)){
    const option=document.createElement('option');option.value=value;option.textContent=value;yearEl.appendChild(option);
    Array.from(yearEl.options).sort((a,b)=>Number(a.value)-Number(b.value)).forEach(option=>yearEl.appendChild(option));
  }
}
function cesVanInitFilters_(){
  const yearEl=document.getElementById('van-year-filter-v55'),monthEl=document.getElementById('van-month-filter-v55');
  if(yearEl&&!yearEl.options.length){const year=new Date().getFullYear();for(let y=year-1;y<=year+2;y++){const option=document.createElement('option');option.value=String(y);option.textContent=String(y);if(y===year)option.selected=true;yearEl.appendChild(option);}}
  if(monthEl&&!monthEl.dataset.initialized){monthEl.dataset.initialized='1';monthEl.value=String(new Date().getMonth()+1).padStart(2,'0');}
}
function cesVanSelectedPeriod_(){
  cesVanInitFilters_();
  const now=new Date();
  const year=Number(document.getElementById('van-year-filter-v55')?.value||now.getFullYear());
  let month=String(document.getElementById('van-month-filter-v55')?.value||String(now.getMonth()+1).padStart(2,'0')).toUpperCase();
  if(month==='ALL'){
    const cursor=CES_VAN_V55.calendarCursor;
    month=String(cursor&&cursor.year===year?cursor.month:(year===now.getFullYear()?now.getMonth()+1:1)).padStart(2,'0');
  }
  return{year:year,month:month};
}
function cesVanCalendarRange_(year,month){
  const start=new Date(Number(year),Number(month)-1,1);
  const end=new Date(Number(year),Number(month),1);
  const key=date=>String(date.getFullYear())+String(date.getMonth()+1).padStart(2,'0')+String(date.getDate()).padStart(2,'0');
  return{start:key(start),end:key(end)};
}
function cesVanBuildEmbedUrl_(baseUrl,year,month){
  const fallback='https://calendar.google.com/calendar/u/0/embed?src='+encodeURIComponent(CES_VAN_V55.calendarId)+'&ctz=Asia%2FBangkok&mode=MONTH&showTitle=0&showPrint=0&showTabs=0&showCalendars=0&showTz=0';
  const range=cesVanCalendarRange_(year,month);
  try{
    const url=new URL(baseUrl||fallback,window.location.href);
    url.searchParams.set('mode','MONTH');
    url.searchParams.set('showTitle','0');
    url.searchParams.set('showPrint','0');
    url.searchParams.set('showTabs','0');
    url.searchParams.set('showCalendars','0');
    url.searchParams.set('showTz','0');
    url.searchParams.set('showNav','0');
    url.searchParams.set('showDate','0');
    url.searchParams.set('dates',range.start+'/'+range.end);
    return url.toString();
  }catch(ignore){
    return fallback+'&showNav=0&showDate=0&dates='+range.start+'%2F'+range.end;
  }
}
function cesVanSetCalendarPeriod_(year,month){
  CES_VAN_V55.calendarCursor={year:Number(year),month:Number(month)};
  cesVanSetText_('van-calendar-period-v57',cesVanMonthName_(month)+' '+year);
}
function cesVanSyncCalendarFrame_(baseUrl,year,month,force){
  const frame=document.getElementById('van-google-calendar-v55');if(!frame)return;
  const src=cesVanBuildEmbedUrl_(baseUrl||CES_VAN_V55.baseEmbedUrl||frame.dataset.baseSrc||frame.dataset.src,year,month);
  frame.dataset.src=src;
  cesVanSetCalendarPeriod_(year,month);
  if(force||frame.src!==src){
    frame.src='about:blank';
    window.setTimeout(()=>{frame.src=src;},60);
  }
}
function changeVanCalendarMonth(delta){
  const current=cesVanSelectedPeriod_();
  const date=new Date(current.year,Number(current.month)-1+Number(delta||0),1);
  const year=date.getFullYear(),month=String(date.getMonth()+1).padStart(2,'0');
  cesVanEnsureYearOption_(year);
  const yearEl=document.getElementById('van-year-filter-v55'),monthEl=document.getElementById('van-month-filter-v55');
  if(yearEl)yearEl.value=String(year);
  if(monthEl)monthEl.value=month;
  CES_VAN_V55.forceFrameRefresh=true;
  return loadVanBookingDashboard(true);
}
function goVanCalendarToday(){
  const now=new Date(),year=now.getFullYear(),month=String(now.getMonth()+1).padStart(2,'0');
  cesVanEnsureYearOption_(year);
  const yearEl=document.getElementById('van-year-filter-v55'),monthEl=document.getElementById('van-month-filter-v55');
  if(yearEl)yearEl.value=String(year);
  if(monthEl)monthEl.value=month;
  CES_VAN_V55.forceFrameRefresh=true;
  return loadVanBookingDashboard(true);
}
function changeVanBookingFilter(){
  CES_VAN_V55.forceFrameRefresh=true;
  return loadVanBookingDashboard(true);
}
function cesVanRenderSourceWarning_(result){
  const warning=document.getElementById('van-source-warning-v56');if(!warning)return;
  const message=String(result.sourceWarning||'').trim();
  if(!message){warning.classList.add('hidden');warning.textContent='';return;}
  warning.classList.remove('hidden');
  warning.innerHTML='<i class="fas fa-circle-info mr-2"></i>'+cesBookEsc_(message);
}
function cesVanRenderAvailableDates_(dates){
  const root=document.getElementById('van-available-list-v56');
  const list=Array.isArray(dates)?dates:[];
  cesVanSetText_('van-available-count-v56',`${list.length} dates`);
  if(!root)return;
  if(!list.length){root.innerHTML='<div class="py-12 text-center text-slate-400"><i class="fas fa-calendar-check text-3xl text-slate-300 mb-3"></i><div class="font-bold">No available weekdays in this period</div></div>';return;}
  root.innerHTML='<div class="overflow-auto rounded-xl border border-slate-200 max-h-[560px]"><table class="w-full min-w-[340px] text-xs text-left"><thead class="sticky top-0 z-10 bg-slate-50 text-[9px] uppercase tracking-wider text-slate-500"><tr><th class="p-3">Date</th><th class="p-3">Day</th><th class="p-3">Status</th></tr></thead><tbody class="divide-y divide-slate-100">'+list.map(item=>`<tr class="hover:bg-emerald-50/40"><td class="p-3 font-black text-slate-700 whitespace-nowrap">${cesBookEsc_(item.dateLabel||item.date||'-')}</td><td class="p-3 text-slate-500">${cesBookEsc_(item.dayLabel||'')}</td><td class="p-3"><span class="inline-flex px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-black">Available</span></td></tr>`).join('')+'</tbody></table></div>';
}
function renderVanBookingDashboard_(result){
  CES_VAN_V55.loaded=true;CES_VAN_V55.events=result.events||[];CES_VAN_V55.availableDates=result.availableDates||[];CES_VAN_V55.summary=result.summary||{};
  const summary=CES_VAN_V55.summary,counts=summary.teamCounts||{};
  cesVanSetText_('van-kpi-jobs-v55',Number(summary.totalJobs||0).toLocaleString('th-TH'));
  cesVanSetText_('van-kpi-days-v55',Number(summary.totalDays||0).toLocaleString('th-TH'));
  cesVanSetText_('van-kpi-cost-v55',cesVanMoney_(summary.totalCost));
  cesVanSetText_('van-kpi-billing-days-v57',Number(summary.totalBillingDays||0).toLocaleString('th-TH')+' billed date(s)');
  ['med','lab','ehs','env'].forEach(key=>cesVanSetText_('van-kpi-'+key+'-v55',Number(counts[key.toUpperCase()]||0).toLocaleString('th-TH')));
  const sourceLabel=result.dataSource==='PUBLIC_ICS'?'Public calendar feed':'Apps Script calendar access';
  cesVanSetText_('van-filter-note-v55',`${result.events.length} events · ${result.month==='ALL'?'All months':result.month+'/'+result.year} · ${result.selectedTeam||'ALL'} · ${sourceLabel} · synced ${result.generatedAt||''}`);
  cesVanSetText_('van-list-count-v55',`${result.events.length} events`);
  cesVanRenderSourceWarning_(result);
  cesVanRenderAvailableDates_(result.availableDates||[]);
  const root=document.getElementById('van-job-list-v55');if(!root)return;
  if(!result.events.length){root.innerHTML='<div class="py-14 text-center text-slate-400"><i class="fas fa-calendar-xmark text-3xl text-slate-300 mb-3"></i><div class="font-bold">No van bookings in this filter</div></div>';return;}
  root.innerHTML='<div class="overflow-auto rounded-xl border border-slate-200 max-h-[560px]"><table class="w-full min-w-[900px] text-xs text-left"><thead class="sticky top-0 z-10 bg-slate-50 text-[9px] uppercase tracking-wider text-slate-500"><tr><th class="p-3">Date / Time</th><th class="p-3">Team</th><th class="p-3">Booking / Route</th><th class="p-3">Usage / Cost</th><th class="p-3">Details</th></tr></thead><tbody class="divide-y divide-slate-100">'+result.events.map(item=>{
    const details=[item.jobId?`Job ID: ${item.jobId}`:'',item.traveller?`Traveller: ${item.traveller}`:'',item.driver?`Driver: ${item.driver}`:'',item.phone?`Phone: ${item.phone}`:''].filter(Boolean).join('<br>');
    const route=item.route||item.location||item.description||'-';
    const title=cesBookEsc_(item.title||'-');
    const link=item.calendarUrl?`<a href="${cesBookEsc_(item.calendarUrl)}" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-[#003DA5] font-black mt-2"><i class="fas fa-arrow-up-right-from-square"></i>Open event</a>`:'';
    const billingDays=Number(item.billingDays||item.chargeDays||item.days||0);
    return `<tr class="hover:bg-slate-50 align-top"><td class="p-3"><b class="whitespace-nowrap text-slate-700">${cesBookEsc_(item.dateLabel||'-')}</b><div class="text-[9px] text-slate-400 mt-1 whitespace-nowrap">${cesBookEsc_(item.timeLabel||'')}</div></td><td class="p-3"><span class="inline-flex px-2 py-1 rounded-full border text-[9px] font-black ${cesVanTeamBadge_(item.team)}">${cesBookEsc_(item.team||'MNG')}</span></td><td class="p-3 min-w-[290px]"><b class="text-slate-800">${title}</b><div class="mt-1 text-slate-500 whitespace-normal leading-relaxed">${cesBookEsc_(route)}</div>${link}</td><td class="p-3"><b>${Number(item.days||0)} calendar day(s)</b><div class="text-[9px] text-slate-400 mt-1">${billingDays} billed date(s): departure / return</div><div class="text-amber-700 font-black mt-1">${cesVanMoney_(item.cost)}</div></td><td class="p-3 min-w-[220px] text-slate-500 leading-relaxed">${details||'-'}</td></tr>`;
  }).join('')+'</tbody></table></div>';
}
async function loadVanBookingDashboard(force){
  cesVanInitFilters_();
  const requestId=++CES_VAN_V55.requestSeq;
  const year=document.getElementById('van-year-filter-v55')?.value||new Date().getFullYear();
  const month=document.getElementById('van-month-filter-v55')?.value||String(new Date().getMonth()+1).padStart(2,'0');
  const team=document.getElementById('van-team-filter-v55')?.value||'ALL';
  const root=document.getElementById('van-job-list-v55');
  const availableRoot=document.getElementById('van-available-list-v56');
  cesVanSetText_('van-filter-note-v55','Resyncing calendar data…');
  if(root&&!CES_VAN_V55.loaded)root.innerHTML='<div class="py-14 text-center text-slate-400"><i class="fas fa-circle-notch fa-spin text-xl mb-3"></i><div class="text-xs font-bold">Loading van bookings…</div></div>';
  if(availableRoot&&!CES_VAN_V55.loaded)availableRoot.innerHTML='<div class="py-14 text-center text-slate-400"><i class="fas fa-circle-notch fa-spin text-xl mb-3"></i><div class="text-xs font-bold">Loading available dates…</div></div>';
  const task=(async()=>{
    try{
      const result=await window.CES_API.callFunction('getVanBookingDashboard',[year,month,team,!!force],{transport:'iframe',timeoutMs:120000});
      if(!result||!result.success)throw new Error((result&&result.message)||'Unable to load Van Booking calendar.');
      if(requestId!==CES_VAN_V55.requestSeq)return result;
      renderVanBookingDashboard_(result);
      CES_VAN_V55.baseEmbedUrl=result.embedUrl||CES_VAN_V55.baseEmbedUrl;
      const period=cesVanSelectedPeriod_();
      cesVanSyncCalendarFrame_(CES_VAN_V55.baseEmbedUrl,period.year,period.month,CES_VAN_V55.forceFrameRefresh);
      CES_VAN_V55.forceFrameRefresh=false;
      const open=document.getElementById('van-open-calendar-v55');if(open&&result.openUrl)open.href=result.openUrl;
      const book=document.getElementById('van-book-form-v55');if(book&&result.bookUrl)book.href=result.bookUrl;
      return result;
    }catch(error){
      if(requestId!==CES_VAN_V55.requestSeq)return null;
      CES_VAN_V55.forceFrameRefresh=false;
      const explanation='The embedded Google Calendar uses the signed-in browser account, but Van Job List Details is loaded by the Apps Script deployment account. The patch also tries the public ICS feed; if both sources are unavailable, share the calendar with the deployment account using “See all event details”.';
      if(root)root.innerHTML=`<div class="py-12 px-5 text-center text-red-500"><i class="fas fa-triangle-exclamation text-3xl mb-3"></i><div class="font-black">Van job details unavailable</div><div class="text-xs mt-2 text-slate-500">${cesBookEsc_(error.message||String(error))}</div><div class="text-[10px] mt-3 text-slate-400">${cesBookEsc_(explanation)}</div><button class="mt-4 px-3 py-2 rounded-xl bg-red-50 text-red-600 font-black text-xs" onclick="loadVanBookingDashboard(true)">Retry</button></div>`;
      if(availableRoot)availableRoot.innerHTML='<div class="py-12 text-center text-slate-400"><i class="fas fa-calendar-xmark text-3xl text-slate-300 mb-3"></i><div class="font-bold">Availability cannot be calculated</div></div>';
      cesVanSetText_('van-list-count-v55','0 events');cesVanSetText_('van-available-count-v56','0 dates');
      cesVanSetText_('van-filter-note-v55','Resync failed · '+(error.message||String(error)));
      throw error;
    }finally{
      if(requestId===CES_VAN_V55.requestSeq)CES_VAN_V55.loading=false;
    }
  })();
  CES_VAN_V55.loading=task;
  return task;
}

function exportVanBookingExcel(){
  if(!window.XLSX){if(window.Swal)Swal.fire('Van Booking Excel','XLSX library is not ready.','error');return;}
  var rows=(CES_VAN_V55.events||[]).map(function(item){return{
    'Date':item.dateLabel||'', 'Time':item.timeLabel||'', 'Team':item.team||'', 'Booking / Job':item.title||'',
    'Route / Location':item.route||item.location||item.description||'', 'Traveller':item.traveller||'', 'Driver':item.driver||'',
    'Phone':item.phone||'', 'Calendar Days':Number(item.days||0), 'Billed Dates':Number(item.billingDays||item.chargeDays||0),
    'Cost (THB)':Number(item.cost||0), 'Calendar URL':item.calendarUrl||''
  };});
  if(!rows.length){if(window.Swal)Swal.fire('Van Booking Excel','No van booking records in the current filter.','info');return;}
  var ws=XLSX.utils.json_to_sheet(rows),wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Van Booking');
  var year=document.getElementById('van-year-filter-v55')?.value||'All';
  var month=document.getElementById('van-month-filter-v55')?.value||'ALL';
  var team=document.getElementById('van-team-filter-v55')?.value||'ALL';
  XLSX.writeFile(wb,'CES_Van_Booking_'+year+'_'+month+'_'+team+'_'+new Date().toISOString().slice(0,10)+'.xlsx');
}
window.exportVanBookingExcel=exportVanBookingExcel;

function initVanBookingCalendar(){
  cesVanInitFilters_();
  const frame=document.getElementById('van-google-calendar-v55');
  if(frame){
    frame.dataset.baseSrc=frame.dataset.baseSrc||frame.dataset.src||frame.getAttribute('src')||'';
    CES_VAN_V55.baseEmbedUrl=CES_VAN_V55.baseEmbedUrl||frame.dataset.baseSrc;
  }
  const period=cesVanSelectedPeriod_();
  cesVanSetCalendarPeriod_(period.year,period.month);
  loadVanBookingDashboard(true).catch(function(){});
}
function refreshVanBookingCalendar(button){
  const btn=button||document.getElementById('van-refresh-v55');if(btn){btn.disabled=true;btn.classList.add('animate-spin');}
  CES_VAN_V55.forceFrameRefresh=true;
  return loadVanBookingDashboard(true).catch(function(){return null;}).finally(()=>{if(btn){btn.disabled=false;btn.classList.remove('animate-spin');}});
}
window.initVanBookingCalendar=initVanBookingCalendar;
window.refreshVanBookingCalendar=refreshVanBookingCalendar;
window.loadVanBookingDashboard=loadVanBookingDashboard;
window.changeVanBookingFilter=changeVanBookingFilter;
window.changeVanCalendarMonth=changeVanCalendarMonth;
window.goVanCalendarToday=goVanCalendarToday;



async function approveCarBookingWebsiteFront(bookingId, decision) {
  var login = cesBookingCurrentUser_();
  if (!login || String(login.role || '').toUpperCase() !== 'ADMIN') {
    if (window.Swal) Swal.fire('Permission Denied','Admin permission is required.','error');
    return;
  }
  decision = String(decision || '').toUpperCase();
  var approve = decision === 'APPROVE';
  var note = '';
  if (window.Swal) {
    var answer = await Swal.fire({
      icon:approve ? 'question' : 'warning',
      title:(approve ? 'Approve' : 'Reject') + ' this car booking?',
      input:'textarea', inputLabel:'Note (optional)', inputPlaceholder:'Approval / rejection note',
      showCancelButton:true, confirmButtonText:approve ? 'Approve' : 'Reject',
      confirmButtonColor:approve ? '#059669' : '#dc2626'
    });
    if (!answer.isConfirmed) return;
    note = answer.value || '';
    Swal.fire({title:'Updating booking…',allowOutsideClick:false,didOpen:function(){Swal.showLoading();}});
  }
  try {
    var result = await window.CES_API.callFunction('approveCarBookingFromWebsite', [{bookingId:bookingId,decision:decision,note:note,actorId:login.id}], {transport:'iframe',timeoutMs:70000,dedupe:false});
    if (!result || result.success === false) throw new Error((result && result.message) || 'Approval failed.');
    await loadVehicleBookingWorkspace('CAR', true);
    if (window.Swal) Swal.fire({icon:'success',title:approve?'Booking approved':'Booking rejected',timer:1400,showConfirmButton:false});
  } catch (error) {
    if (window.Swal) Swal.fire({icon:'error',title:'Update failed',text:error.message || String(error)});
  }
}
window.approveCarBookingWebsiteFront = approveCarBookingWebsiteFront;


/* CES Hub V21 — prevent past booking dates */
(function(){
  function applyBookingDateMinimum(){
    var d=new Date(),off=d.getTimezoneOffset()*60000,today=new Date(d.getTime()-off).toISOString().slice(0,10);
    ['car-book-date','car-book-return-date','van-book-date','van-book-return-date'].forEach(function(id){
      var el=document.getElementById(id);if(el){el.min=today;if(el.value&&el.value<today)el.value='';}
    });
    document.querySelectorAll('.vehicle-calendar-day').forEach(function(cell){
      var date=cell.getAttribute('data-date');if(date&&date<today){cell.classList.add('ces-booking-past-v21');cell.setAttribute('aria-disabled','true');}
    });
  }
  window.addEventListener('ces:tab-changed',function(e){if(e&&['car_booking','van_booking'].indexOf(e.detail&&e.detail.tab)>=0)setTimeout(applyBookingDateMinimum,50);});
  window.applyBookingDateMinimum=applyBookingDateMinimum;
})();


// V63 — stable Car Booking refresh.
// The previous 15-second polling repeatedly activated the global CES "SYNCING"
// overlay and made Car Booking appear frozen. Refresh only when the user
// returns to the tab/window, with a cooldown.
const CES_CAR_RESUME_SYNC_V63 = {
  running:false,
  lastSyncAt:0,
  minIntervalMs:30000
};

function cesCarBookingViewVisible_(){
  var view=document.getElementById('view-car_booking');
  if(!view || document.hidden)return false;
  return !view.classList.contains('hidden') && view.offsetParent!==null;
}

async function cesCarBookingRefreshOnResume_(force){
  if(!cesCarBookingViewVisible_())return;
  if(CES_CAR_RESUME_SYNC_V63.running)return;

  var now=Date.now();
  if(!force && now-Number(CES_CAR_RESUME_SYNC_V63.lastSyncAt||0)<CES_CAR_RESUME_SYNC_V63.minIntervalMs)return;

  CES_CAR_RESUME_SYNC_V63.running=true;
  try{
    await loadVehicleBookingWorkspace('CAR',true,true);
    CES_CAR_RESUME_SYNC_V63.lastSyncAt=Date.now();
  }catch(ignoreRefresh){}
  finally{
    CES_CAR_RESUME_SYNC_V63.running=false;
  }
}

window.addEventListener('focus',function(){
  setTimeout(function(){
    cesCarBookingRefreshOnResume_(false);
  },150);
});

document.addEventListener('visibilitychange',function(){
  if(!document.hidden){
    setTimeout(function(){
      cesCarBookingRefreshOnResume_(false);
    },150);
  }
});

window.addEventListener('ces:tab-changed',function(event){
  var tab=event && event.detail && event.detail.tab;
  if(tab==='car_booking'){
    setTimeout(function(){
      cesCarBookingRefreshOnResume_(false);
    },150);
  }
});

window.cesCarBookingRefreshOnResume_=cesCarBookingRefreshOnResume_;
