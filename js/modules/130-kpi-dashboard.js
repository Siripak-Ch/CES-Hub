// ============================================================
// 130-kpi-dashboard.js
// Extracted from original index.html. Keep load order from index.html.
// ============================================================

// ==========================================
// KPI_java.html - Logic & Rendering V32
// Adds EHS Executive Summary cards + detailed status filters
// ==========================================

let globalKpiData = [];
let globalKpiSummary = null;
let currentKpiTeam = 'EHS';

// ============================================================
// CES KPI Tracking V36 — client cache, date sorting and 10-row paging
// Keeps one dashboard payload per team in localStorage so switching
// MED / LAB / EHS does not re-read the source Sheet every time.
// Manual Refresh and every status update bypass the cache.
// ============================================================
const CES_KPI_CACHE_TTL_MS_V36 = 30 * 60 * 1000;
const CES_KPI_MEMORY_CACHE_V36 = {};
const KPI_TABLE_PAGE_SIZE_V36 = 10;
let KPI_TABLE_PAGE_V36 = 1;
let KPI_FILTER_SIGNATURE_V36 = '';

function cesKpiCacheKeyV36(team) {
    return 'ces_kpi_dashboard_v16_sheet_aligned_' + String(team || 'EHS').toUpperCase();
}
function cesKpiReadCacheV36(team) {
    const key = cesKpiCacheKeyV36(team);
    const memory = CES_KPI_MEMORY_CACHE_V36[key];
    if (memory && Date.now() - Number(memory.ts || 0) <= CES_KPI_CACHE_TTL_MS_V36) return memory.payload || null;
    if (memory) delete CES_KPI_MEMORY_CACHE_V36[key];
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const saved = JSON.parse(raw);
        if (!saved || !saved.ts || Date.now() - Number(saved.ts) > CES_KPI_CACHE_TTL_MS_V36) {
            localStorage.removeItem(key);
            return null;
        }
        CES_KPI_MEMORY_CACHE_V36[key] = saved;
        return saved.payload || null;
    } catch (ignore) {
        return null;
    }
}
function cesKpiWriteCacheV36(team, payload) {
    const key = cesKpiCacheKeyV36(team);
    const saved = { ts:Date.now(), payload:payload };
    CES_KPI_MEMORY_CACHE_V36[key] = saved;
    try { localStorage.setItem(key, JSON.stringify(saved)); } catch (ignore) {}
}
function cesKpiClearCacheV36(team) {
    const key = cesKpiCacheKeyV36(team);
    delete CES_KPI_MEMORY_CACHE_V36[key];
    try { localStorage.removeItem(key); } catch (ignore) {}
}
window.cesKpiReadCacheV36 = cesKpiReadCacheV36;
window.cesKpiWriteCacheV36 = cesKpiWriteCacheV36;
window.cesKpiClearCacheV36 = cesKpiClearCacheV36;

function kpiDateValueV36(value) {
    const d = typeof kpiParseDateObj === 'function' ? kpiParseDateObj(value) : null;
    return d && !isNaN(d.getTime()) ? d.getTime() : 0;
}
function kpiSortRowsByDateV36(rows) {
    const mode = document.getElementById('kpi-filter-date-sort')?.value || 'date_desc';
    const list = Array.isArray(rows) ? rows.slice() : [];
    list.sort((a, b) => {
        const aDate = mode.indexOf('target_') === 0
            ? kpiDateValueV36(a.targetDate || a.deadline)
            : kpiDateValueV36(a.receivedDate || a.calDate);
        const bDate = mode.indexOf('target_') === 0
            ? kpiDateValueV36(b.targetDate || b.deadline)
            : kpiDateValueV36(b.receivedDate || b.calDate);
        const diff = aDate - bDate;
        if (diff !== 0) return mode.endsWith('_asc') ? diff : -diff;
        return String(a.customerId || a.jobNo || '').localeCompare(String(b.customerId || b.jobNo || ''));
    });
    return list;
}
window.kpiSortRowsByDateV36 = kpiSortRowsByDateV36;

function kpiCurrentFilterSignatureV36() {
    const ids = [
        'kpi-filter-search','kpi-filter-year','kpi-filter-month','kpi-filter-date-sort',
        'kpi-filter-worktype','kpi-filter-status','kpi-filter-team'
    ];
    return [currentKpiTeam, KPI_STAGE_FILTER, KPI_QUICK_STATUS_FILTER]
        .concat(ids.map(id => document.getElementById(id)?.value || ''))
        .join('|');
}
function kpiPaginateRowsV36(rows) {
    const signature = kpiCurrentFilterSignatureV36();
    if (signature !== KPI_FILTER_SIGNATURE_V36) {
        KPI_FILTER_SIGNATURE_V36 = signature;
        KPI_TABLE_PAGE_V36 = 1;
    }
    const total = rows.length;
    const pages = Math.max(1, Math.ceil(total / KPI_TABLE_PAGE_SIZE_V36));
    KPI_TABLE_PAGE_V36 = Math.max(1, Math.min(KPI_TABLE_PAGE_V36, pages));
    const start = (KPI_TABLE_PAGE_V36 - 1) * KPI_TABLE_PAGE_SIZE_V36;
    return {
        rows:rows.slice(start, start + KPI_TABLE_PAGE_SIZE_V36),
        page:KPI_TABLE_PAGE_V36,
        pages:pages,
        total:total,
        start:total ? start + 1 : 0,
        end:Math.min(start + KPI_TABLE_PAGE_SIZE_V36, total)
    };
}
window.kpiPaginateRowsV36 = kpiPaginateRowsV36;

function kpiRenderPaginationV36(meta) {
    const wrap = document.getElementById('kpi-table-pagination');
    if (!wrap) return;
    if (!meta || !meta.total) {
        wrap.innerHTML = '<span class="text-[10px] font-bold text-slate-400">0 records</span>';
        return;
    }
    const prevDisabled = meta.page <= 1 ? 'disabled opacity-40 cursor-not-allowed' : '';
    const nextDisabled = meta.page >= meta.pages ? 'disabled opacity-40 cursor-not-allowed' : '';
    wrap.innerHTML = `
        <span class="text-[10px] font-black text-slate-500">Showing ${meta.start}-${meta.end} of ${meta.total} · 10 rows per page</span>
        <div class="flex items-center gap-2">
            <button ${prevDisabled} onclick="kpiChangePageV36(${meta.page - 1})" class="h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-xs font-black"><i class="fas fa-chevron-left mr-1"></i>Prev</button>
            <span class="min-w-[92px] text-center text-xs font-black text-slate-600">Page ${meta.page} / ${meta.pages}</span>
            <button ${nextDisabled} onclick="kpiChangePageV36(${meta.page + 1})" class="h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-xs font-black">Next<i class="fas fa-chevron-right ml-1"></i></button>
        </div>`;
}
window.kpiRenderPaginationV36 = kpiRenderPaginationV36;
function kpiChangePageV36(page) {
    KPI_TABLE_PAGE_V36 = Math.max(1, Number(page || 1));
    renderKPITable();
    const scroll = document.getElementById('kpi-table-scroll');
    if (scroll) scroll.scrollTop = 0;
}
window.kpiChangePageV36 = kpiChangePageV36;

const KPI_DRIVE_LINKS = {
    'LAB': 'https://bdmsgroup-my.sharepoint.com/shared?listurl=https%3A%2F%2Fbdmsgroup%2Dmy%2Esharepoint%2Ecom%2Fpersonal%2Fnhbmecallab%5Fbdms%5Fco%5Fth%2FDocuments&id=%2Fpersonal%2Fnhbmecallab%5Fbdms%5Fco%5Fth%2FDocuments%2F42%2E%20%E0%B9%83%E0%B8%9A%E0%B8%A3%E0%B8%B2%E0%B8%A2%E0%B8%87%E0%B8%B2%E0%B8%99%E0%B8%9C%E0%B8%A5%E0%B8%AA%E0%B8%AD%E0%B8%9A%E0%B9%80%E0%B8%97%E0%B8%B5%E0%B8%A2%E0%B8%9A%202026&ct=1784621792322&or=Teams%2DHL&shareLink=1&ga=1&LOF=1',
    'EHS': 'https://bdmsgroup-my.sharepoint.com/shared?listurl=https%3A%2F%2Fbdmsgroup%2Dmy%2Esharepoint%2Ecom%2Fpersonal%2Fchiraphat%5Fbu%5Fbdms%5Fco%5Fth%2FDocuments&id=%2Fpersonal%2Fchiraphat%5Fbu%5Fbdms%5Fco%5Fth%2FDocuments%2FEnvironment%20ENV%2FReport&ct=1784621491590&or=Teams%2DHL&shareLink=1&ga=1',
    'ENV': 'https://bdmsgroup-my.sharepoint.com/shared?listurl=https%3A%2F%2Fbdmsgroup%2Dmy%2Esharepoint%2Ecom%2Fpersonal%2Fchiraphat%5Fbu%5Fbdms%5Fco%5Fth%2FDocuments&id=%2Fpersonal%2Fchiraphat%5Fbu%5Fbdms%5Fco%5Fth%2FDocuments%2FEnvironment%20ENV%2FReport&ct=1784621491590&or=Teams%2DHL&shareLink=1&ga=1',
    'MED': '#',
    'MNG': '#',
    'TES': '#'
};
window.CES_KPI_DRIVE_DEFAULTS = Object.assign({}, KPI_DRIVE_LINKS);
function kpiDriveLinkFor(team) {
    const cfg = (typeof globalConfig !== 'undefined' && globalConfig) ? globalConfig : {};
    const configured = cfg['KPI_DRIVE_' + team];
    return String(configured || KPI_DRIVE_LINKS[team] || '#').trim();
}

const KPI_DETAIL_STATUS_OPTIONS = [
    'กำลังทำ',
    'เสร็จพร้อมตรวจ',
    'กำลังตรวจ',
    'ตรวจเสร็จ',
    'รอส่ง Report',
    'ส่ง Report เสร็จแล้ว',
    'รอแก้ไข'
];

function initKPITab() {
    switchKpiTab('EHS');
}

function switchKpiTab(team) {
    currentKpiTeam = team;

    ['MED', 'LAB', 'EHS'].forEach(t => {
        const btn = document.getElementById(`kpi-tab-${t.toLowerCase()}`);
        if (btn) {
            btn.className = t === team
                ? 'px-5 py-2 rounded-lg text-xs font-bold bg-white text-indigo-600 shadow-sm transition-all'
                : 'px-5 py-2 rounded-lg text-xs font-bold text-slate-500 hover:text-indigo-600 transition-all';
        }
    });

    const dLink = document.getElementById('kpi-drive-link');
    const dTitle = document.getElementById('kpi-drive-title');
    const ehsLink = document.getElementById('kpi-drive-ehs-link');
    const envLink = document.getElementById('kpi-drive-env-link');
    [dLink, ehsLink, envLink].forEach(el => { if (el) { el.classList.add('hidden'); el.classList.remove('flex'); } });

    if (team === 'EHS') {
        const ehsUrl = kpiDriveLinkFor('EHS');
        const envUrl = kpiDriveLinkFor('ENV');
        if (ehsLink && ehsUrl && ehsUrl !== '#') { ehsLink.href = ehsUrl; ehsLink.classList.remove('hidden'); ehsLink.classList.add('flex'); }
        if (envLink && envUrl && envUrl !== '#') { envLink.href = envUrl; envLink.classList.remove('hidden'); envLink.classList.add('flex'); }
    } else if (dLink && dTitle) {
        const driveUrl = kpiDriveLinkFor(team);
        if (driveUrl && driveUrl !== '#') {
            dLink.href = driveUrl; dTitle.innerText = `Drive ${team}`; dLink.classList.remove('hidden'); dLink.classList.add('flex');
        }
    }

    const sheetLink = document.getElementById('kpi-sheet-link');
    if (sheetLink) {
        const key = team === 'EHS' ? 'KPI_EHS_SHEET' : (team === 'LAB' ? 'KPI_LAB_SHEET' : '');
        const url = key && typeof window.cesExternalLink === 'function' ? window.cesExternalLink(key) : '';
        sheetLink.href = url || '#';
        sheetLink.classList.toggle('hidden', !url);
        sheetLink.classList.toggle('flex', !!url);
        sheetLink.title = team === 'EHS' ? 'Open EHS KPI Sheet' : (team === 'LAB' ? 'Open LAB KPI Sheet' : 'Open KPI Sheet');
    }

    const summaryWrap = document.getElementById('kpi-summary-section');
    if (summaryWrap) summaryWrap.classList.toggle('hidden', team !== 'EHS');

    fetchKPIData();
}

function kpiApplyDashboardResponseV36(res, keepOpenRowId, fromCache) {
    if (!res || !res.success) return false;
    globalKpiData = kpiApplyStrictWorkflowStatus(res.data || []);
    globalKpiSummary = res.summary || null;
    KPI_TABLE_PAGE_V36 = 1;
    KPI_FILTER_SIGNATURE_V36 = '';

    populateKpiStatusFilter(res.statusOptions || KPI_DETAIL_STATUS_OPTIONS);
    populateKpiYearMonthFilters();
    renderKpiExecutiveSummary();
    renderKPITable();
    updateLateBadge();

    const updated = document.getElementById('kpi-summary-updated');
    if (fromCache && updated && currentKpiTeam === 'EHS') {
        updated.title = 'Loaded from the 30-minute browser cache. Use Refresh to read the source Sheet now.';
    }

    if (keepOpenRowId) {
        const updatedRow = globalKpiData.find(r => String(r.rowId) === String(keepOpenRowId));
        if (updatedRow) openUpdateModal(updatedRow);
    }
    return true;
}

function fetchKPIData(keepOpenRowId = null, forceRefresh = false) {
    const tbody = document.getElementById('kpi-table-body');
    const requestedTeam = String(currentKpiTeam || 'EHS').toUpperCase();
    const bypassCache = !!forceRefresh || !!keepOpenRowId;

    if (!bypassCache) {
        const cached = cesKpiReadCacheV36(requestedTeam);
        if (cached && kpiApplyDashboardResponseV36(cached, null, true)) return;
    } else {
        cesKpiClearCacheV36(requestedTeam);
    }

    if (!keepOpenRowId && tbody) {
        tbody.innerHTML = `<tr><td colspan="8" class="py-16 text-center text-slate-400">
            <i class="fas fa-circle-notch fa-spin text-3xl mb-3 text-slate-300"></i>
            <p class="font-bold text-xs uppercase tracking-widest">Syncing Data...</p>
        </td></tr>`;
    }

    google.script.run
        .withFailureHandler(err => {
            Swal.fire('Error', err.message || String(err), 'error');
            if (!keepOpenRowId && tbody) {
                tbody.innerHTML = `<tr><td colspan="8" class="text-center text-red-500 py-10 font-bold">${kpiEsc(err.message || String(err))}</td></tr>`;
            }
        })
        .withSuccessHandler(res => {
            if (res && res.success) {
                cesKpiWriteCacheV36(requestedTeam, res);
                if (String(currentKpiTeam || '').toUpperCase() === requestedTeam) {
                    kpiApplyDashboardResponseV36(res, keepOpenRowId, false);
                }
            } else {
                Swal.fire('Error', (res && res.message) || 'Cannot load KPI data', 'error');
                if (!keepOpenRowId && tbody) {
                    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-10">${kpiEsc((res && res.message) || 'Cannot load data')}</td></tr>`;
                }
            }
        })
        .getKPIDashboardData(requestedTeam, !!forceRefresh || !!keepOpenRowId);
}

function populateKpiStatusFilter(options) {
    const el = document.getElementById('kpi-filter-detail-status');
    if (!el) return;

    const current = el.value || 'All';
    const opts = ['All'].concat(options || KPI_DETAIL_STATUS_OPTIONS);
    el.innerHTML = opts.map(o => `<option value="${kpiEsc(o)}">${o === 'All' ? 'All Detailed Status' : kpiEsc(o)}</option>`).join('');
    el.value = opts.includes(current) ? current : 'All';
}

function populateKpiYearMonthFilters() {
    const yearEl = document.getElementById('kpi-filter-year');
    const monthEl = document.getElementById('kpi-filter-month');
    if (!yearEl || !monthEl) return;

    const curY = yearEl.value || 'All';
    const curM = monthEl.value || 'All';

    const years = [...new Set(globalKpiData.map(r => {
        const p = parseKpiDateParts(r.calDate);
        return p.year;
    }).filter(Boolean))].sort().reverse();

    if (years.length) {
        yearEl.innerHTML = `<option value="All">All Years</option>` + years.map(y => `<option value="${y}">${y}</option>`).join('');
        yearEl.value = years.includes(curY) ? curY : 'All';
    }

    monthEl.value = curM;
}





function kpiStatusUi(row) {
    const isDone = row.isFinished;
    const isLate = !row.isFinished && row.daysLate > 0;
    const isEdit = row.hasEdit || row.currentStatus === 'รอแก้ไข';

    let statusBg = isDone ? 'bg-blue-50 border-blue-200 text-[#003DA5]'
        : isEdit ? 'bg-amber-50 border-amber-200 text-amber-700'
        : isLate ? 'bg-red-50 border-red-200 text-[#E4002B]'
        : 'bg-slate-50 border-slate-200 text-slate-700';

    let statusIcon = isDone ? 'fa-check-circle text-[#003DA5]'
        : isEdit ? 'fa-screwdriver-wrench text-[#003DA5]'
        : isLate ? 'fa-exclamation-circle text-[#003DA5]'
        : 'fa-spinner fa-spin text-[#003DA5]';

    let statusText = isDone ? 'COMPLETED'
        : isEdit ? 'WAITING EDIT'
        : isLate ? 'LATE PROCESS'
        : 'ON-PROCESS';

    return `
        <div class="flex flex-col border rounded-lg px-3 py-2 shadow-sm w-full max-w-[190px] ${statusBg}">
            <span class="text-[8px] font-black uppercase tracking-wider opacity-70 mb-1">${statusText}</span>
            <div class="text-[10px] font-bold flex items-center gap-1.5 leading-tight">
                <i class="fas ${statusIcon}"></i>
                <span class="truncate">${kpiEsc(row.currentStatus || 'รอเริ่มงาน')}</span>
            </div>
        </div>
    `;
}

function openUpdateModal(data) {
    document.getElementById('upd-row-id').value = data.rowId;

    document.getElementById('upd-job-header').innerHTML = `
        <div class="flex flex-wrap gap-2 w-full">
            <span class="bg-white text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow-sm"><i class="fas fa-hospital text-slate-400"></i> ${kpiEsc(data.customerId)}</span>
            <span class="bg-white text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow-sm"><i class="fas fa-hashtag text-slate-400"></i> Job: ${kpiEsc(data.jobNo)}</span>
            <span class="bg-white text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow-sm"><i class="fas fa-layer-group text-slate-400"></i> ${kpiEsc(data.sourceSheet || '-')}</span>
            <span class="bg-white text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow-sm"><i class="fas fa-user-tag text-slate-400"></i> Req: ${kpiEsc(data.requester || '-')}</span>
            <span class="bg-white text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow-sm"><i class="fas fa-calendar-alt text-slate-400"></i> CAL: ${kpiEsc(data.calDate)}</span>
            <span class="bg-white text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow-sm"><i class="fas fa-flag-checkered text-slate-400"></i> KPI: ${kpiEsc(data.deadline)}</span>
        </div>
    `;

    const devStr = Object.entries(data.devices || {})
        .filter(([k, v]) => v && v !== '0')
        .map(([k, v]) => `<span class="bg-slate-50 px-2 py-1 rounded border border-slate-200 text-slate-600 uppercase shadow-sm">${k}: <b class="text-slate-800">${kpiEsc(v)}</b></span>`)
        .join('');

    document.getElementById('modal-devices-container').innerHTML =
        `<div class="flex flex-wrap gap-2 text-[10px] font-bold">${devStr || '<span class="text-slate-400">No Device Specifics</span>'}</div>
         <div class="text-[11px] font-black text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">TOTAL: ${kpiEsc(data.totalAmount || '0')}</div>`;

    const r = data.rawStatus || {};

    const isEngDone = (r.eng === 'เสร็จพร้อมตรวจ');
    const isSupDone = isEngDone && (r.sup === 'ตรวจเสร็จ');
    const isRepDone = isSupDone && (r.rep === 'ส่ง Report เสร็จแล้ว');

    const isEngProcess = (r.eng === 'กำลังทำ' || isEngDone);
    const isSupProcess = isEngDone && (r.sup === 'กำลังตรวจ' || isSupDone || r.sup === 'รอแก้ไข');
    const isRepProcess = isSupDone && (r.rep === 'รอส่ง Report' || isRepDone || r.rep === 'รอแก้ไข');

    const isSupEdit = isEngDone && (r.sup === 'รอแก้ไข');
    const isRepEdit = isSupDone && (r.rep === 'รอแก้ไข');

    const steps = [
        { l: 'กำลังทำ', t: 'Engineer Status', d: isEngProcess, edit: false, date: r.engDate },
        { l: 'เสร็จพร้อมตรวจ', t: 'Engineer Status', d: isEngDone, edit: false, date: r.engDate },
        { l: 'กำลังตรวจ', t: 'Supervisor Status', d: isSupProcess, edit: isSupEdit, date: r.supDate },
        { l: 'ตรวจเสร็จ', t: 'Supervisor Status', d: isSupDone, edit: false, date: r.supDate },
        { l: 'รอส่ง Report', t: 'Report Status', d: isRepProcess, edit: isRepEdit, date: r.repDate },
        { l: 'ส่ง Report เสร็จแล้ว', t: 'Report Status', d: isRepDone, edit: false, date: r.repDate }
    ];

    document.getElementById('modal-stepper-container').innerHTML = `
        <div class="flex items-start justify-between min-w-[750px] w-full pt-6 relative">
            ${steps.map((s, i) => `
                <div class="flex flex-col items-center flex-1 relative">
                    ${(i === 0 || i === 2 || i === 4) ? `<span class="absolute -top-8 text-[9px] font-black ${s.d || s.edit ? 'text-indigo-600' : 'text-slate-400'} bg-white px-2 rounded border border-slate-200 shadow-sm">${s.t}</span>` : ''}
                    <div class="z-10 w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all shadow-sm
                        ${s.edit ? 'bg-[#003DA5] text-white ring-4 ring-[#003DA5]' : s.d ? 'bg-blue-100 text-[#003DA5] shadow-md' : 'bg-slate-100 text-slate-300 border-2 border-slate-200'}">
                        ${s.edit ? '<i class="fas fa-tools"></i>' : s.d ? '<i class="fas fa-check"></i>' : i + 1}
                    </div>
                    <span class="text-[9px] font-extrabold mt-3 ${s.d || s.edit ? 'text-slate-800' : 'text-slate-400'} text-center h-6 leading-tight">${s.l}</span>
                    ${s.date && s.d && !s.edit ? `<span class="text-[8px] font-bold text-[#003DA5] bg-blue-50 px-1.5 py-0.5 rounded mt-1 border border-blue-200 shadow-sm">${kpiEsc(s.date)}</span>` : ''}
                </div>
                ${i < steps.length - 1 ? `<div class="flex-1 h-[3px] mt-4 ${s.d ? 'bg-blue-300' : 'bg-slate-200'}"></div>` : ''}
            `).join('')}
        </div>`;

    let target = '';
    let opts = [];

    if (!r.eng || r.eng === '') {
        target = 'Engineer Status'; opts = ['กำลังทำ'];
    } else if (r.eng === 'กำลังทำ') {
        target = 'Engineer Status'; opts = ['เสร็จพร้อมตรวจ'];
    } else if (isEngDone && (!r.sup || r.sup === '')) {
        target = 'Supervisor Status'; opts = ['กำลังตรวจ'];
    } else if (isEngDone && (r.sup === 'กำลังตรวจ' || r.sup === 'รอแก้ไข')) {
        target = 'Supervisor Status'; opts = ['ตรวจเสร็จ', 'รอแก้ไข'];
    } else if (isSupDone && (!r.rep || r.rep === '')) {
        target = 'Report Status'; opts = ['รอส่ง Report'];
    } else if (isSupDone && (r.rep === 'รอส่ง Report' || r.rep === 'รอแก้ไข')) {
        target = 'Report Status'; opts = ['ส่ง Report เสร็จแล้ว', 'รอแก้ไข'];
    }

    document.getElementById('upd-target-col').value = target || 'Completed';
    document.getElementById('upd-new-status').innerHTML = opts.length
        ? opts.map(o => `<option value="${kpiEsc(o)}">${kpiEsc(o)}</option>`).join('')
        : '<option value="">งานเสร็จสมบูรณ์</option>';

    document.getElementById('btn-save-kpi').disabled = opts.length === 0;
    document.getElementById('modal-kpi-update').classList.remove('hidden');
}

function saveJobStatus() {
    const rId = document.getElementById('upd-row-id').value;
    const tCol = document.getElementById('upd-target-col').value;
    const nSt = document.getElementById('upd-new-status').value;

    if (!nSt) return;

    const btn = document.getElementById('btn-save-kpi');
    const oldHtml = btn.innerHTML;

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    btn.disabled = true;

    google.script.run
        .withFailureHandler(err => {
            Swal.fire('Error', err.message || String(err), 'error');
            btn.innerHTML = oldHtml;
            btn.disabled = false;
        })
        .withSuccessHandler(res => {
            if (res && res.success) {
                Swal.fire({ icon: 'success', title: 'Saved!', timer: 1000, showConfirmButton: false });
                fetchKPIData(rId);
            } else {
                Swal.fire('Error', (res && res.message) || 'Save failed', 'error');
            }
            btn.innerHTML = oldHtml;
            btn.disabled = false;
        })
        .updateJobStatus(currentKpiTeam, rId, tCol, nSt);
}

function updateLateBadge() {
    const lateJobs = globalKpiData.filter(r => !r.isFinished && r.daysLate > 0);
    const b = document.getElementById('kpi-late-badge');
    if (!b) return;
    b.innerText = lateJobs.length;
    b.classList.remove('hidden');
}

function openLateAlertModal() {
    ['late-search', 'late-f-year', 'late-f-month'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = (id === 'late-search' ? '' : 'All');
    });
    renderLateJobsUI();
    document.getElementById('modal-kpi-late').classList.remove('hidden');
}

function renderLateJobsUI() {
    const s = (document.getElementById('late-search')?.value || '').toLowerCase();
    const fY = document.getElementById('late-f-year')?.value || 'All';
    const fM = document.getElementById('late-f-month')?.value || 'All';
    const srt = document.getElementById('late-f-sort')?.value || 'desc';

    let lateJobs = globalKpiData.filter(r => !r.isFinished && r.daysLate > 0).filter(job => {
        if (s && !String(job.customerId).toLowerCase().includes(s) && !String(job.jobNo).toLowerCase().includes(s)) return false;

        const p = parseKpiDateParts(job.calDate);
        if (fY !== 'All' && String(p.year) !== String(fY)) return false;
        if (fM !== 'All' && String(p.month) !== String(fM)) return false;

        return true;
    }).sort((a, b) => srt === 'desc' ? b.daysLate - a.daysLate : a.daysLate - b.daysLate);

    const target = document.getElementById('late-jobs-container');
    if (!target) return;

    target.innerHTML = lateJobs.length === 0
        ? `<div class="p-8 text-center font-bold text-slate-400">ไม่มีงานล่าช้าในเงื่อนไขนี้!</div>`
        : lateJobs.map(job => `<div onclick='closeModal("modal-kpi-late"); openUpdateModal(${JSON.stringify(job).replace(/'/g, "\\'")})' class="bg-white p-4 rounded-xl shadow-sm border border-[#003DA5] mb-3 flex justify-between items-center cursor-pointer hover:border-[#003DA5] transition-all">
            <div>
                <h4 class="font-extrabold text-sm text-slate-800">${kpiEsc(job.customerId)}</h4>
                <p class="text-[10px] text-slate-500 font-bold mt-1">Job: ${kpiEsc(job.jobNo)} | ${kpiEsc(job.kpiStageLabel || 'Current KPI')} ${kpiEsc(job.kpiLimit || '')}D: ${kpiEsc(job.stageDeadline || job.deadline)} | Overall ${kpiEsc(job.overallKpiLimit || '')}D: ${kpiEsc(job.overallDeadline || '-')}</p>
            </div>
            <div class="text-right"><span class="text-[11px] font-black text-[#003DA5] bg-red-50 px-3 py-1.5 rounded border border-red-200 shadow-sm">LATE +${job.daysLate} Days</span></div>
        </div>`).join('');
}

function triggerLateEmail() {
    const btn = document.getElementById('btn-send-late-email');
    const oldHtml = btn.innerHTML;

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending Email...';
    btn.disabled = true;

    google.script.run
        .withFailureHandler(err => {
            Swal.fire('Error', err.message || String(err), 'error');
            btn.innerHTML = oldHtml;
            btn.disabled = false;
        })
        .withSuccessHandler(res => {
            btn.innerHTML = oldHtml;
            btn.disabled = false;

            if (res && res.success) {
                Swal.fire('Success!', res.message, 'success');
                closeModal('modal-kpi-late');
            } else {
                Swal.fire('Error', (res && res.message) || 'Cannot send email', 'error');
            }
        })
        .sendLateKpiEmail(currentKpiTeam);
}

// ==========================================
// Small helpers
// ==========================================
function parseKpiDateParts(v) {
    const s = String(v || '').trim();
    let d = '', m = '', y = '';

    if (s.includes('/')) {
        const p = s.split('/');
        d = p[0] || '';
        m = String(p[1] || '').padStart(2, '0');
        y = p[2] || '';
        if (String(y).length === 2) y = '20' + y;
    } else if (/^\d{4}-\d{1,2}-\d{1,2}/.test(s)) {
        const p = s.slice(0, 10).split('-');
        y = p[0]; m = String(p[1]).padStart(2, '0'); d = p[2];
    }

    return { day: d, month: m, year: y };
}

function kpiStatusMiniClass(status) {
    if (status === 'ส่ง Report เสร็จแล้ว') return { box: 'bg-blue-50 border-blue-200', text: 'text-[#003DA5]' };
    if (status === 'รอแก้ไข') return { box: 'bg-amber-50 border-amber-200', text: 'text-amber-700' };
    if (status === 'รอส่ง Report') return { box: 'bg-cyan-50 border-cyan-100', text: 'text-cyan-700' };
    if (status === 'กำลังตรวจ' || status === 'ตรวจเสร็จ') return { box: 'bg-indigo-50 border-[#003DA5]/20', text: 'text-indigo-700' };
    if (status === 'กำลังทำ' || status === 'เสร็จพร้อมตรวจ') return { box: 'bg-blue-50 border-blue-100', text: 'text-blue-700' };
    return { box: 'bg-slate-50 border-slate-100', text: 'text-slate-700' };
}

function kpiStatusPillClass(status) {
    return kpiStatusMiniClass(status).box + ' ' + kpiStatusMiniClass(status).text;
}

function kpiNum(v) {
    const n = Number(String(v || '').replace(/,/g, ''));
    if (!isNaN(n)) return n.toLocaleString();
    return kpiEsc(v || '0');
}

function kpiEsc(v) {
    return String(v === null || v === undefined ? '' : v)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function kpiAttr(v) {
    return String(v || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}


// ============================================================
// CES KPI Tracking V33 — Filter + Summary UX Fix
// Additive frontend override. Keeps V32 functions and fixes:
// 1) detailed status filter can match currentStatus OR raw Eng/SUP/Report status
// 2) summary split into Executive cards + Pending Engineer/SUP/Report
// ============================================================
let KPI_STAGE_FILTER = 'All';

function kpiNormalizeStatus(v) {
    const s = String(v || '').replace(/\s+/g, ' ').trim();
    if (!s) return '';
    const compact = s.replace(/\s+/g, '').toLowerCase();

    if (compact.includes('ส่งreportเสร็จแล้ว') || compact.includes('ส่งรายงานเสร็จ') || compact.includes('completed')) return 'ส่ง Report เสร็จแล้ว';
    if (compact.includes('รอส่งreport') || compact.includes('รอส่งรายงาน')) return 'รอส่ง Report';
    if (compact.includes('ตรวจเสร็จ') || compact.includes('supdone')) return 'ตรวจเสร็จ';
    if (compact.includes('กำลังตรวจ') || compact.includes('checking')) return 'กำลังตรวจ';
    if (compact.includes('เสร็จพร้อมตรวจ') || compact.includes('พร้อมตรวจ') || compact.includes('readytocheck')) return 'เสร็จพร้อมตรวจ';
    if (compact.includes('กำลังทำ') || compact.includes('doing') || compact.includes('process')) return 'กำลังทำ';
    if (compact.includes('รอแก้ไข') || compact.includes('แก้ไข') || compact.includes('revise') || compact.includes('edit')) return 'รอแก้ไข';
    return s;
}

function kpiRowStatusList(row) {
    const r = row.rawStatus || {};
    return [row.currentStatus, row.statusDetail, r.eng, r.sup, r.rep]
        .map(kpiNormalizeStatus)
        .filter(Boolean);
}

function kpiIsEnvWorkflowRow(row) {
    return String(row?.workflowType || '').toUpperCase() === 'ENV' ||
        String(row?.serviceTeam || '').toUpperCase() === 'ENV' ||
        String(row?.sourceSheet || '').toUpperCase().includes('ENV');
}

function kpiIsPendingEngineer(row) {
    if (kpiIsEnvWorkflowRow(row)) return false;
    const eng = kpiNormalizeStatus(row.rawStatus?.eng);
    return !row.isFinished && (!eng || eng === 'กำลังทำ' || eng === 'รอแก้ไข' ||
        row.currentStatus === 'กำลังทำ' || row.currentStatus === 'รอเริ่มงาน');
}

function kpiIsPendingSup(row) {
    const sup = kpiNormalizeStatus(row.rawStatus?.sup);
    const rep = kpiNormalizeStatus(row.rawStatus?.rep);

    if (kpiIsEnvWorkflowRow(row)) {
        return !row.isFinished && sup !== 'ตรวจเสร็จ' &&
            (!rep || rep === 'รอแก้ไข' || rep === 'รอส่ง Report');
    }

    const eng = kpiNormalizeStatus(row.rawStatus?.eng);
    return !row.isFinished && eng === 'เสร็จพร้อมตรวจ' &&
        (!sup || sup === 'กำลังตรวจ' || sup === 'รอแก้ไข');
}

function kpiIsPendingReport(row) {
    const sup = kpiNormalizeStatus(row.rawStatus?.sup);
    const rep = kpiNormalizeStatus(row.rawStatus?.rep);

    if (kpiIsEnvWorkflowRow(row)) {
        return !row.isFinished && sup === 'ตรวจเสร็จ' &&
            (!rep || rep === 'รอส่ง Report' || rep === 'รอแก้ไข');
    }

    return !row.isFinished && sup === 'ตรวจเสร็จ' &&
        (!rep || rep === 'รอส่ง Report' || rep === 'รอแก้ไข');
}






const kpi_v33_old_renderKPITable = renderKPITable;

function getKpiProgressInfo(row) {
    const statusBg = row.isFinished ? 'bg-blue-50 border-blue-200 text-[#003DA5]' : (row.daysLate > 0 ? 'bg-red-50 border-red-200 text-[#E4002B]' : 'bg-slate-50 border-slate-200 text-slate-700');
    const statusIcon = row.isFinished ? 'fa-check-circle text-[#003DA5]' : (row.daysLate > 0 ? 'fa-exclamation-circle text-[#003DA5]' : 'fa-spinner fa-spin text-[#003DA5]');
    const statusText = row.isFinished ? 'COMPLETED' : (row.daysLate > 0 ? 'LATE PROCESS' : 'ON-PROCESS');
    const curStepText = row.isFinished ? 'ส่ง Report เสร็จแล้ว' : (row.currentStatus || row.rawStatus?.rep || row.rawStatus?.sup || row.rawStatus?.eng || 'รอเริ่มงาน');

    return `<div class="flex flex-col border rounded-lg px-3 py-2 shadow-sm w-full max-w-[180px] ${statusBg}">
        <span class="text-[8px] font-black uppercase tracking-wider opacity-70 mb-1">${statusText}</span>
        <div class="text-[10px] font-bold flex items-center gap-1.5 leading-tight">
            <i class="fas ${statusIcon}"></i> <span class="truncate">${kpiEsc(curStepText)}</span>
        </div>
    </div>`;
}

function getKpiTargetHtml(row) {
    const stageLabel = row?.kpiStageLabel || (row?.isFinished ? 'Overall KPI' : 'Current KPI');
    const stageDays = Number(row?.kpiLimit || 0);
    const stageDate = row?.stageDeadline || row?.deadline || 'N/A';
    const overallDays = Number(row?.overallKpiLimit || (kpiIsEnvWorkflowRow(row) ? 20 : 14));
    const overallDate = row?.overallDeadline || row?.overallKpiDate || row?.deadline || 'N/A';
    const stageLate = Number(row?.stageDaysLate ?? row?.daysLate ?? 0);
    const stageTone = !row?.isFinished && stageLate > 0
        ? 'bg-red-50 text-red-700 border-red-200'
        : (!row?.isFinished && stageLate === 0
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : 'bg-slate-100 text-slate-700 border-slate-200');

    return `<div class="flex flex-col items-start gap-1 min-w-[126px]">
        <span class="text-[8px] font-black text-slate-400 uppercase tracking-wider">${kpiEsc(stageLabel)}${stageDays ? ` · ${stageDays}D` : ''}</span>
        <div class="${stageTone} font-black text-[11px] px-2.5 py-1.5 rounded-md border shadow-sm flex items-center gap-1.5">
            <i class="far fa-calendar-alt opacity-60"></i> ${kpiEsc(stageDate)}
        </div>
        <span class="text-[8px] font-bold text-slate-400">Overall ${overallDays}D: ${kpiEsc(overallDate)}</span>
    </div>`;
}


function getKpiWorkTypeClass(v) {
    const t = String(v || '').toLowerCase();
    if (t.includes('network')) return 'bg-[#003DA5]/10 text-[#003DA5] border border-[#003DA5]';
    if (t.includes('commercial')) return 'bg-[#003DA5]/10 text-[#003DA5] border border-[#003DA5]';
    return 'bg-slate-50 text-slate-600 border border-slate-200';
}


// ============================================================
// CES KPI Tracking V34 — STRICT WORKFLOW STATUS FIX
// Frontend safety normalization. This prevents stale/incorrect sheet values
// in later stages from overriding the actual current strict workflow stage.
// ============================================================
function kpiStrictCurrentStatusFromRaw(rawStatus) {
    const r = rawStatus || {};
    const eng = kpiNormalizeStatus(r.eng);
    const sup = kpiNormalizeStatus(r.sup);
    const rep = kpiNormalizeStatus(r.rep);

    // Engineer is the gate. If not finished, ignore SUP/Report columns.
    if (!eng) return 'รอเริ่มงาน';
    if (eng === 'รอแก้ไข') return 'รอแก้ไข';
    if (eng === 'กำลังทำ') return 'กำลังทำ';
    if (eng !== 'เสร็จพร้อมตรวจ') return eng || 'รอเริ่มงาน';

    // Supervisor stage starts only after engineer finished.
    if (!sup) return 'เสร็จพร้อมตรวจ';
    if (sup === 'รอแก้ไข') return 'รอแก้ไข';
    if (sup === 'กำลังตรวจ') return 'กำลังตรวจ';
    if (sup !== 'ตรวจเสร็จ') return sup || 'เสร็จพร้อมตรวจ';

    // Report stage starts only after supervisor finished.
    if (!rep) return 'ตรวจเสร็จ';
    if (rep === 'รอแก้ไข') return 'รอแก้ไข';
    if (rep === 'รอส่ง Report') return 'รอส่ง Report';
    if (rep === 'ส่ง Report เสร็จแล้ว') return 'ส่ง Report เสร็จแล้ว';

    return rep || 'ตรวจเสร็จ';
}

function kpiApplyStrictWorkflowStatus(rows) {
    return (rows || []).map(row => {
        const strict = kpiStrictCurrentStatusFromRaw(row.rawStatus || {});
        return Object.assign({}, row, {
            currentStatus: strict,
            statusDetail: strict,
            isFinished: strict === 'ส่ง Report เสร็จแล้ว',
            hasEdit: strict === 'รอแก้ไข' || kpiRowStatusList(row).includes('รอแก้ไข')
        });
    });
}



// ============================================================
// CES KPI Tracking V35 — TEAM FILTER FIX
// Replace the duplicated Detailed Status dropdown with EHS / ENV team filter.
// Detailed Status Summary remains as action cards and no longer conflicts with filter bar.
// ============================================================
let KPI_QUICK_STATUS_FILTER = 'All';

function kpiGetTeamFilterValue() {
    const el = document.getElementById('kpi-filter-team');
    return el ? (el.value || 'All') : 'All';
}

function kpiRowServiceTeam(row) {
    const explicit = String(row?.serviceTeam || '').trim().toUpperCase();
    if (explicit === 'ENV' || explicit === 'EHS') return explicit;

    const source = String(row?.sourceSheet || '').trim().toUpperCase();
    if (source.indexOf('ENV') >= 0) return 'ENV';
    if (source.indexOf('EHS') >= 0) return 'EHS';

    const workType = String(row?.workType || '').trim().toUpperCase();
    if (workType.indexOf('ENV') >= 0) return 'ENV';

    return 'EHS';
}

function kpiApplyStageFilter(stage) {
    const next = stage || 'All';
    // Toggle behavior: click the active Summary card again to unselect it.
    KPI_STAGE_FILTER = (KPI_STAGE_FILTER === next) ? 'All' : next;
    KPI_QUICK_STATUS_FILTER = 'All';
    renderKPITable();
}

function kpiClearStageFilter() {
    KPI_STAGE_FILTER = 'All';
}

function kpiQuickStatusFilter(status) {
    const next = kpiNormalizeStatus(status) || 'All';
    KPI_STAGE_FILTER = 'All';
    // Toggle behavior for Executive card such as รอแก้ไข.
    KPI_QUICK_STATUS_FILTER = (KPI_QUICK_STATUS_FILTER === next) ? 'All' : next;
    renderKPITable();
}

function kpiClearQuickStatusFilter() {
    KPI_QUICK_STATUS_FILTER = 'All';
}

function kpiFilteredBaseRowsForSummary() {
    const fTeam = kpiGetTeamFilterValue();
    return (globalKpiData || []).filter(row => {
        if (currentKpiTeam === 'EHS' && fTeam !== 'All' && kpiRowServiceTeam(row) !== fTeam) return false;
        return true;
    });
}

function renderKpiExecutiveSummary() {
    const section = document.getElementById('kpi-summary-section');
    const cardsWrap = document.getElementById('kpi-summary-cards');
    const statusWrap = document.getElementById('kpi-status-summary');
    const updated = document.getElementById('kpi-summary-updated');
    if (!section || !cardsWrap || !statusWrap) return;
    if (currentKpiTeam !== 'EHS') { section.classList.add('hidden'); return; }
    section.classList.remove('hidden');

    const rows = kpiFilteredBaseRowsForSummary();
    const stageCounts = {
        pendingEngineer: rows.filter(kpiIsPendingEngineer).length,
        pendingSup: rows.filter(kpiIsPendingSup).length,
        pendingReport: rows.filter(kpiIsPendingReport).length
    };
    const waitingEdit = rows.filter(r => r.hasEdit || kpiRowStatusList(r).includes('รอแก้ไข')).length;
    const active = rows.filter(r => !r.isFinished).length;
    const overdue = rows.filter(r => !r.isFinished && Number(r.daysLate || 0) > 0).length;
    const dueToday = rows.filter(r => !r.isFinished && Number(r.daysLate || 0) === 0).length;
    const actionRisk = overdue + dueToday + waitingEdit;
    const fTeam = kpiGetTeamFilterValue();
    const scopeNote = fTeam === 'All' ? 'EHS + ENV' : fTeam;
    const neutral = { color:'text-slate-600', bg:'bg-slate-50', border:'border-slate-200' };
    const cards = [
        { label:'Active Jobs', value:active, note:scopeNote + ' • ยังไม่ส่ง Report เสร็จ', icon:'fa-briefcase', action:'' },
        { label:'Action Required / Risk', value:actionRisk, note:'Overdue / Due today / รอแก้ไข', icon:'fa-triangle-exclamation', action:'' },
        { label:'All Work ทั้งหมด', value:rows.length, note:scopeNote + ' • จำนวนงานทั้งหมด', icon:'fa-layer-group', action:'' },
        { label:'รอแก้ไข', value:waitingEdit, note:'รายการที่ถูกตีกลับให้แก้ไข', icon:'fa-screwdriver-wrench', action:"kpiQuickStatusFilter('รอแก้ไข')" }
    ];
    cardsWrap.innerHTML = cards.map(c => `
        <button onclick="${c.action || ''}" class="kpi-ehs-neutral-card text-left rounded-2xl border ${neutral.border} ${neutral.bg} p-4 shadow-sm hover:shadow-md transition w-full">
            <div class="flex items-start justify-between gap-3"><div>
                <p class="text-[10px] font-black uppercase tracking-widest text-slate-500">${kpiEsc(c.label)}</p>
                <h3 class="text-2xl font-black ${neutral.color} mt-1">${kpiNum(c.value)}</h3>
                <p class="text-[10px] font-bold text-slate-500 mt-1 leading-tight">${kpiEsc(c.note || '')}</p>
            </div><div class="w-10 h-10 rounded-xl bg-white flex items-center justify-center ${neutral.color} border border-slate-200 shadow-sm"><i class="fas ${c.icon || 'fa-chart-simple'}"></i></div></div>
        </button>`).join('');

    const stageCards = [
        { key:'pendingEngineer', label:'Pending Engineer', sub:'กำลังทำ / ยังไม่พร้อมตรวจ', value:stageCounts.pendingEngineer || 0, icon:'fa-person-digging' },
        { key:'pendingSup', label:'Pending SUP', sub:'เสร็จพร้อมตรวจ / กำลังตรวจ', value:stageCounts.pendingSup || 0, icon:'fa-user-check' },
        { key:'pendingReport', label:'Pending Report', sub:'ตรวจเสร็จ / รอส่ง Report', value:stageCounts.pendingReport || 0, icon:'fa-file-signature' }
    ];
    statusWrap.innerHTML = stageCards.map(s => {
        const selected = KPI_STAGE_FILTER === s.key;
        return `<button onclick="kpiApplyStageFilter('${s.key}')" title="คลิกเพื่อกรอง / คลิกซ้ำเพื่อยกเลิก" class="kpi-ehs-neutral-card flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 px-4 py-3 text-left hover:shadow-sm transition ${selected ? 'ring-2 ring-slate-400 shadow-md' : ''}">
            <div class="flex items-center gap-3 min-w-0"><div class="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm"><i class="fas ${s.icon}"></i></div>
            <div class="min-w-0"><p class="text-xs font-black leading-tight">${kpiEsc(s.label)} ${selected ? '<span class="ml-1 text-[9px] opacity-70">ACTIVE</span>' : ''}</p><p class="text-[10px] font-bold opacity-70 truncate">${kpiEsc(s.sub)}</p></div></div>
            <span class="text-xl font-black">${kpiNum(s.value)}</span></button>`;
    }).join('');
    if (updated) updated.innerText = `Scope: ${scopeNote} • Records: ${rows.length}`;
}

function getKpiFilteredRows() {
    const fYear = document.getElementById('kpi-filter-year')?.value || 'All';
    const fMonth = document.getElementById('kpi-filter-month')?.value || 'All';
    const fStatus = document.getElementById('kpi-filter-status')?.value || 'All';
    const fTeam = kpiGetTeamFilterValue();
    const fWorkType = (document.getElementById('kpi-filter-worktype')?.value || 'All').toLowerCase();
    const search = (document.getElementById('kpi-filter-search')?.value || '').toLowerCase().trim();

    const filtered = (globalKpiData || []).filter(row => {
        if (!row.calDate || !row.jobNo || !row.customerId || !row.workType) return false;

        const p = parseKpiDateParts(row.calDate);
        if (fYear !== 'All' && String(p.year) !== String(fYear)) return false;
        if (fMonth !== 'All' && String(p.month) !== String(fMonth)) return false;
        if (fWorkType !== 'all' && String(row.workType || '').toLowerCase() !== fWorkType) return false;

        if (currentKpiTeam === 'EHS' && fTeam !== 'All' && kpiRowServiceTeam(row) !== fTeam) return false;

        const overallLate = Number(row?.overallDaysLate ?? row?.daysLate ?? 0);
        if (fStatus === 'Late' && (row.isFinished || overallLate <= 0)) return false;
        if (fStatus === 'Completed' && !row.isFinished) return false;
        if (fStatus === 'Process' && (row.isFinished || overallLate > 0)) return false;

        if (KPI_STAGE_FILTER === 'pendingEngineer' && !kpiIsPendingEngineer(row)) return false;
        if (KPI_STAGE_FILTER === 'pendingSup' && !kpiIsPendingSup(row)) return false;
        if (KPI_STAGE_FILTER === 'pendingReport' && !kpiIsPendingReport(row)) return false;

        if (KPI_QUICK_STATUS_FILTER !== 'All') {
            const statuses = kpiRowStatusList(row);
            if (!statuses.includes(KPI_QUICK_STATUS_FILTER)) return false;
        }

        if (search) {
            const hay = [
                row.customerId, row.jobNo, row.calDate, row.workType, row.requester,
                row.sourceSheet, row.serviceTeam, kpiRowServiceTeam(row), row.currentStatus,
                row.rawStatus?.eng, row.rawStatus?.sup, row.rawStatus?.rep
            ].join(' ').toLowerCase();
            if (!hay.includes(search)) return false;
        }

        return true;
    });
    return kpiSortRowsByDateV36(filtered);
}


function kpiResetFilters() {
    KPI_STAGE_FILTER = 'All';
    KPI_QUICK_STATUS_FILTER = 'All';
    ['kpi-filter-search','kpi-filter-year','kpi-filter-month','kpi-filter-date-sort','kpi-filter-worktype','kpi-filter-status','kpi-filter-team'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = id === 'kpi-filter-search' ? '' : (id === 'kpi-filter-date-sort' ? 'date_desc' : 'All');
    });
    KPI_TABLE_PAGE_V36 = 1;
    KPI_FILTER_SIGNATURE_V36 = '';
    renderKPITable();
}



// ============================================================
// CES KPI Tracking V38 — TABLE CLEANUP + KPI TIMELINE PIE FIX
// 1) Remove Detailed Status column from table rendering
// 2) Timeline shows finish date and KPI outcome: ก่อน / ตรง / เกิน KPI
// 3) Adds KPI Performance pie chart based on current filtered rows
// ============================================================
let KPI_PERFORMANCE_CHART = null;

function kpiParseDateObj(v) {
    const s = String(v || '').trim();
    if (!s || s === '-' || s.toUpperCase() === 'N/A') return null;

    if (s.includes('/')) {
        const p = s.split('/');
        if (p.length >= 3) {
            let d = Number(p[0]);
            let m = Number(p[1]);
            let y = Number(String(p[2]).trim());
            if (y < 100) y += 2000;
            if (y > 2400) y -= 543;
            const out = new Date(y, m - 1, d);
            out.setHours(0,0,0,0);
            return isNaN(out.getTime()) ? null : out;
        }
    }

    const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (iso) {
        const out = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
        out.setHours(0,0,0,0);
        return isNaN(out.getTime()) ? null : out;
    }

    const native = new Date(s);
    if (isNaN(native.getTime())) return null;
    native.setHours(0,0,0,0);
    return native;
}

function kpiFormatDateShort(v) {
    const d = kpiParseDateObj(v);
    if (!d) return '-';
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
}

function kpiGetFinishDate(row) {
    const r = row?.rawStatus || {};
    if (row?.isFinished) return r.repDate || r.hard || '';
    return '';
}

function kpiGetPerformanceResult(row) {
    // KPI outcome is always measured against the fixed Overall KPI:
    // EHS 14 calendar days / ENV 20 calendar days.
    const deadlineRaw = row?.overallDeadline || row?.overallKpiDate || row?.deadline;
    const deadline = kpiParseDateObj(deadlineRaw);
    const finishDateRaw = kpiGetFinishDate(row);
    const finishDate = kpiParseDateObj(finishDateRaw);

    // COMPLETED: compare Report Complete Date with Overall KPI.
    if (row?.isFinished && deadline && finishDate) {
        const diffDays = Math.round((finishDate.getTime() - deadline.getTime()) / 86400000);
        if (diffDays > 0) {
            return { key:'late', label:'เกิน KPI', short:'เกิน', days:diffDays, finishDate:finishDateRaw, icon:'fa-triangle-exclamation', box:'bg-red-50 text-[#E4002B] border-red-300' };
        }
        if (diffDays === 0) {
            return { key:'on', label:'ตรง KPI', short:'ตรง', days:0, finishDate:finishDateRaw, icon:'fa-bullseye', box:'bg-green-50 text-green-700 border-green-300' };
        }
        return { key:'early', label:'ก่อน KPI', short:'ก่อน', days:Math.abs(diffDays), finishDate:finishDateRaw, icon:'fa-check-circle', box:'bg-green-50 text-green-700 border-green-300' };
    }

    // UNFINISHED: show remaining/late against Overall KPI.
    const overallDaysLate = Number(row?.overallDaysLate ?? row?.daysLate ?? 0);
    if (!row?.isFinished && overallDaysLate > 0) {
        return { key:'late', label:'เกิน KPI', short:'เกิน', days:overallDaysLate, finishDate:'', icon:'fa-clock', box:'bg-red-50 text-[#E4002B] border-red-300' };
    }
    if (!row?.isFinished && overallDaysLate === 0) {
        return { key:'on', label:'ตรง KPI', short:'ตรง', days:0, finishDate:'', icon:'fa-bullseye', box:'bg-green-50 text-green-700 border-green-300' };
    }

    const remaining = Math.abs(overallDaysLate);
    if (remaining <= 3) {
        return { key:'near', label:'ใกล้ KPI', short:'ใกล้', days:remaining, finishDate:'', icon:'fa-hourglass-half', box:'bg-yellow-50 text-yellow-700 border-yellow-300' };
    }
    return { key:'early', label:'ก่อน KPI', short:'ก่อน', days:remaining, finishDate:'', icon:'fa-hourglass-half', box:'bg-green-50 text-green-700 border-green-300' };
}


function getKpiTimelineHtml(row) {
    const p = kpiGetPerformanceResult(row);
    const finishDate = kpiGetFinishDate(row);
    const finishLine = row?.isFinished
        ? `<span class="text-[9px] font-black text-slate-500 mt-1">เสร็จ: ${kpiEsc(kpiFormatDateShort(finishDate))}</span>`
        : `<span class="text-[9px] font-black text-slate-500 mt-1">ยังไม่เสร็จ</span>`;

    let dayLine = '';
    if (row?.isFinished) {
        if (p.key === 'late') dayLine = `<span class="text-[9px] font-bold opacity-80">ช้ากว่า ${p.days} วัน</span>`;
        else if (p.key === 'early') dayLine = `<span class="text-[9px] font-bold opacity-80">เร็วกว่า ${p.days} วัน</span>`;
        else dayLine = `<span class="text-[9px] font-bold opacity-80">เสร็จตรงวัน KPI</span>`;
    } else {
        if (p.key === 'late') dayLine = `<span class="text-[9px] font-bold opacity-80">เลย ${p.days} วัน</span>`;
        else if (p.key === 'early') dayLine = `<span class="text-[9px] font-bold opacity-80">เหลือ ${p.days} วัน</span>`;
        else if (p.key === 'near') dayLine = `<span class="text-[9px] font-bold opacity-80">เหลือ ${p.days} วัน · ใกล้กำหนด</span>`;
        else dayLine = `<span class="text-[9px] font-bold opacity-80">ครบกำหนดวันนี้</span>`;
    }

    return `<div class="${p.box} border px-3 py-2 rounded-2xl text-center shadow-sm flex flex-col justify-center min-w-[112px] mx-auto">
        <span class="text-[10px] font-black flex items-center justify-center gap-1"><i class="fas ${p.icon}"></i> ${kpiEsc(p.label)}</span>
        ${finishLine}
        ${dayLine}
    </div>`;
}

function renderKpiPerformanceSummary(rows) {
    const list = Array.isArray(rows) ? rows : getKpiFilteredRows();
    const counts = { within:0, late:0 };
    list.forEach(row => {
        const result = kpiGetPerformanceResult(row);
        if (result.key === 'late') counts.late++;
        else counts.within++; // ก่อน KPI + ตรง KPI + ใกล้ KPI = อยู่ใน KPI
    });

    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = kpiNum(val); };
    const total = counts.within + counts.late;
    const withinPct = total ? (counts.within * 100 / total) : 0;
    const latePct = total ? (counts.late * 100 / total) : 0;
    setText('kpi-perf-within', counts.within);
    setText('kpi-perf-within-pct', withinPct.toFixed(1) + '%');
    setText('kpi-perf-late', counts.late);
    setText('kpi-perf-late-pct', latePct.toFixed(1) + '%');

    const note = document.getElementById('kpi-performance-note');
    if (note) note.innerText = `Filtered records: ${list.length}`;

    const canvas = document.getElementById('kpi-performance-pie');
    const fallback = document.getElementById('kpi-performance-pie-fallback');
    if (!canvas) return;

    const chartData = [counts.within, counts.late];

    if (typeof Chart === 'undefined') {
        canvas.classList.add('hidden');
        if (fallback) {
            fallback.classList.remove('hidden');
            fallback.innerHTML = `อยู่ใน KPI: ${counts.within} (${withinPct.toFixed(1)}%)<br>เกิน KPI: ${counts.late} (${latePct.toFixed(1)}%)`;
        }
        return;
    }

    canvas.classList.remove('hidden');
    if (fallback) fallback.classList.add('hidden');

    if (KPI_PERFORMANCE_CHART) KPI_PERFORMANCE_CHART.destroy();
    KPI_PERFORMANCE_CHART = new Chart(canvas.getContext('2d'), {
        type: 'pie',
        data: {
            labels: [`อยู่ใน KPI ${withinPct.toFixed(1)}%`, `เกิน KPI ${latePct.toFixed(1)}%`],
            datasets: [{
                data: chartData,
                backgroundColor: ['#16a34a', '#E4002B'],
                borderColor: '#ffffff',
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10, weight: 'bold' } } },
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.label}: ${ctx.raw} งาน`
                    }
                }
            }
        }
    });
    renderKpiMonthlyPerformanceSummary(list);
}

function kpiSummaryFilterChanged() {
    const links = [['kpi-summary-year','kpi-filter-year'],['kpi-summary-month','kpi-filter-month']];
    if (currentKpiTeam === 'EHS') links.push(['kpi-summary-team','kpi-filter-team']);
    links.forEach(pair => { const from=document.getElementById(pair[0]), to=document.getElementById(pair[1]); if(from&&to) to.value=from.value; });
    KPI_TABLE_PAGE_V36=1;
    renderKPITable();
}

function kpiSyncSummaryFilters_() {
    const links=[['kpi-filter-year','kpi-summary-year'],['kpi-filter-month','kpi-summary-month']];
    if(currentKpiTeam==='EHS')links.push(['kpi-filter-team','kpi-summary-team']);
    links.forEach(pair=>{
        const from=document.getElementById(pair[0]),to=document.getElementById(pair[1]);if(from&&to)to.value=from.value;
    });
    const team=document.getElementById('kpi-summary-team');
    if(team){team.disabled=currentKpiTeam!=='EHS';if(currentKpiTeam!=='EHS')team.value='All';}
}

function renderKpiMonthlyPerformanceSummary(rows) {
    const host=document.getElementById('kpi-monthly-performance-summary');
    if(!host)return;
    const map={};
    (rows||[]).forEach(row=>{
        const p=parseKpiDateParts(row.calDate);if(!p.year||!p.month)return;
        const key=String(p.year)+'-'+String(p.month).padStart(2,'0');
        if(!map[key])map[key]={within:0,late:0};
        if(kpiGetPerformanceResult(row).key==='late')map[key].late++;else map[key].within++;
    });
    const keys=Object.keys(map).sort();
    if(!keys.length){host.innerHTML='<div class="text-xs text-slate-400">No monthly data.</div>';return;}
    host.innerHTML='<table class="w-full text-xs"><thead><tr class="bg-slate-50"><th class="p-2 text-left">Month</th><th class="p-2 text-right">Total</th><th class="p-2 text-right text-green-700">อยู่ใน KPI</th><th class="p-2 text-right text-green-700">อยู่ใน KPI %</th><th class="p-2 text-right text-red-600">เกิน KPI</th><th class="p-2 text-right text-red-600">เกิน KPI %</th></tr></thead><tbody>'+keys.map(key=>{const x=map[key],t=x.within+x.late,wp=t?x.within*100/t:0,lp=t?x.late*100/t:0;return `<tr class="border-t"><td class="p-2 font-bold">${key}</td><td class="p-2 text-right">${t}</td><td class="p-2 text-right font-bold text-green-700">${x.within}</td><td class="p-2 text-right">${wp.toFixed(1)}%</td><td class="p-2 text-right font-bold text-red-600">${x.late}</td><td class="p-2 text-right">${lp.toFixed(1)}%</td></tr>`;}).join('')+'</tbody></table>';
}

function kpiExportData(scope) {
    const rows=(scope==='all' ? (globalKpiData||[]) : getKpiFilteredRows()).map(row=>{
        const result=kpiGetPerformanceResult(row);
        return {Team:kpiRowServiceTeam(row),Source:row.sourceSheet||'',CAL_Date:row.calDate||'',Job_No:row.jobNo||'',Customer:row.customerId||'',Work_Type:row.workType||'',Total:row.totalAmount||'',Requester:row.requester||'',Current_Status:row.currentStatus||'',Overall_KPI_Date:kpiFormatDateShort(row.overallDeadline||row.overallKpiDate||row.deadline),Finish_Date:kpiFormatDateShort(kpiGetFinishDate(row)),KPI_Group:result.key==='late'?'เกิน KPI':'อยู่ใน KPI',KPI_Detail:result.label,KPI_Days:Number(result.days||0)};
    });
    if(!rows.length){if(window.Swal)Swal.fire('No Data','ไม่มีข้อมูลสำหรับ Export','info');return;}
    const stamp=new Date().toISOString().slice(0,10),name=`KPI_Tracking_${scope==='all'?'All':'Filtered'}_${stamp}`;
    if(window.XLSX){const wb=XLSX.utils.book_new(),ws=XLSX.utils.json_to_sheet(rows);ws['!cols']=Object.keys(rows[0]).map(k=>({wch:Math.min(40,Math.max(12,k.length+2))}));XLSX.utils.book_append_sheet(wb,ws,'KPI');XLSX.writeFile(wb,name+'.xlsx');return;}
    const h=Object.keys(rows[0]),csv='\uFEFF'+[h].concat(rows.map(r=>h.map(k=>r[k]))).map(a=>a.map(v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"').join(',')).join('\n');const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));link.download=name+'.csv';link.click();URL.revokeObjectURL(link.href);
}

function renderKPITable() {
    kpiSyncSummaryFilters_();
    renderKpiExecutiveSummary();
    const tbody = document.getElementById('kpi-table-body');
    if (!tbody) return;

    const filtered = getKpiFilteredRows();
    renderKpiPerformanceSummary(filtered);
    const pageMeta = kpiPaginateRowsV36(filtered);
    kpiRenderPaginationV36(pageMeta);

    const counter = document.getElementById('kpi-filtered-count');
    if (counter) {
        const stageLabel = KPI_STAGE_FILTER !== 'All'
            ? ' • ' + ({pendingEngineer:'Pending Engineer', pendingSup:'Pending SUP', pendingReport:'Pending Report'}[KPI_STAGE_FILTER] || KPI_STAGE_FILTER)
            : '';
        const quickLabel = KPI_QUICK_STATUS_FILTER !== 'All' ? ' • ' + KPI_QUICK_STATUS_FILTER : '';
        const teamLabel = currentKpiTeam === 'EHS' ? ' • ' + kpiGetTeamFilterValue() : '';
        counter.innerText = `${filtered.length} / ${globalKpiData.length} records${teamLabel}${stageLabel}${quickLabel} • page ${pageMeta.page}/${pageMeta.pages}`;
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-slate-400 italic font-bold">No tracking records found for selected filters.</td></tr>`;
        return;
    }

    tbody.innerHTML = pageMeta.rows.map(row => {
        const statusInfo = getKpiProgressInfo(row);
        const timelineCell = getKpiTimelineHtml(row);
        const wtClass = getKpiWorkTypeClass(row.workType);
        const serviceBadge = kpiRowServiceTeam(row);
        const serviceCls = serviceBadge === 'ENV' ? 'bg-green-50 text-green-700 border-green-300' : 'bg-indigo-50 text-indigo-600 border-[#003DA5]/20';

        return `<tr onclick='openUpdateModal(${JSON.stringify(row).replace(/'/g, "\'")})' class="kpi-detail-row cursor-pointer hover:bg-slate-50 border-b border-slate-100 transition-colors">
            <td class="p-4 align-middle">
                <h4 class="text-sm font-black text-slate-800">${kpiEsc(row.customerId)}</h4>
                <p class="text-[10px] font-bold text-indigo-500 mt-1">Job: ${kpiEsc(row.jobNo)}</p>
                <div class="flex items-center gap-1 mt-1">
                    <span class="inline-flex px-2 py-0.5 rounded-md text-[8px] font-black border ${serviceCls}">${serviceBadge}</span>
                    <span class="text-[9px] font-bold text-slate-400">${kpiEsc(row.sourceSheet || '')}</span>
                </div>
            </td>
            <td class="p-4 align-middle text-center font-bold text-slate-600 text-xs">${kpiEsc(row.calDate)}</td>
            <td class="p-4 align-middle text-center"><span class="px-2.5 py-1 rounded text-[9px] font-bold uppercase shadow-sm ${wtClass}">${kpiEsc(row.workType)}</span></td>
            <td class="p-4 align-middle text-center font-black text-slate-600 text-xs">${kpiEsc(row.totalAmount || '-')}</td>
            <td class="p-4 align-middle">${statusInfo}</td>
            <td class="p-4 align-middle">${getKpiTargetHtml(row)}</td>
            <td class="p-4 align-middle">${timelineCell}</td>
        </tr>`;
    }).join('');
}
