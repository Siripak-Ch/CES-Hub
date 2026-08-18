// ============================================================
// 10-management-overview-dashboard.js
// Extracted from original index.html. Keep load order from index.html.
// ============================================================

// ==========================================
// 1. GLOBAL VARIABLES
// ==========================================
let homeChartTrend = null, homeChartPie = null, homeFilterTeam = 'All';
let homeCheckinData = [], homeRevCache = null, homeRevChart = null;
let homeOTDataCache = [], homeYearlyOTPieChart = null, homeYearlyOTTrendChart = null;
let currentHomeTab = 'yearly';
let chartsCache = {}; // ระบบจัดการ Chart ใหม่ป้องกันการทับซ้อนและ Canvas ขัดข้อง
let homeQualitySummary = null, homeQualityPromise = null;
let homeSecondaryLoadAt = 0;
const CES_MANAGEMENT_QUALITY_LOCAL_CACHE = 'CES_MANAGEMENT_QUALITY_LOCAL_CACHE';
try {
    const cachedQuality = JSON.parse(localStorage.getItem(CES_MANAGEMENT_QUALITY_LOCAL_CACHE) || 'null');
    if (cachedQuality && cachedQuality.data) homeQualitySummary = cachedQuality.data;
} catch (ignoreQualityCache) {}

// ==========================================
// 2. HELPER FUNCTIONS
// ==========================================
const $id = id => document.getElementById(id);
const $txt = (id, val) => { const e = $id(id); if(e) e.innerText = val; };
const $html = (id, val) => { const e = $id(id); if(e) e.innerHTML = val; };
const $style = (id, prop, val) => { const e = $id(id); if(e) e.style[prop] = val; };

// Plugin สร้างหลอดสีเทา (Target) ซ้อนหลัง Bar Chart
const globalTargetBarPlugin = {
    id: 'targetLayer',
    beforeDatasetsDraw(chart) {
        if(chart.config.type !== 'bar') return; // กัน Error ถ้านำไปใช้กับ Pie Chart
        const { ctx, scales: { y } } = chart;
        chart.data.datasets.forEach((dataset, i) => {
            if (!dataset.targetData) return;
            chart.getDatasetMeta(i).data.forEach((bar, index) => {
                const targetVal = dataset.targetData[index];
                if (targetVal == null) return;
                ctx.save();
                ctx.fillStyle = '#e2e8f0'; 
                ctx.fillRect(bar.x - (bar.width/2), y.getPixelForValue(targetVal), bar.width, y.getPixelForValue(0) - y.getPixelForValue(targetVal));
                ctx.restore();
            });
        });
    }
};

// ==========================================
// 3. CORE LOGIC & STATE MANAGEMENT
// ==========================================
function setHomeFilter(team) {
    homeFilterTeam = team;
    ['All','MED','LAB','EHS','ENV','TES'].forEach(t => {
        const btn = $id('btn-h-' + t.toLowerCase());
        if (!btn) return;
        const active = t === team;
        btn.classList.toggle('active', active);
        const style = t === 'All'
            ? { color:'#003DA5', text:'#ffffff' }
            : (typeof window.cesGetTeamStyle === 'function' ? window.cesGetTeamStyle(t) : { color:'#003DA5', text:'#ffffff' });
        btn.style.setProperty('--ces-segment-active', style.color || '#003DA5');
        btn.style.setProperty('--ces-segment-active-text', style.text || '#ffffff');
    });
    currentHomeTab === 'yearly' ? renderYearlyView() : renderMonthlyView();
}

function switchHomeView(tab) {
    currentHomeTab = tab;
    const yearlyBtn = $id('tab-home-yearly');
    const monthlyBtn = $id('tab-home-monthly');
    if (yearlyBtn) yearlyBtn.classList.toggle('active', tab === 'yearly');
    if (monthlyBtn) monthlyBtn.classList.toggle('active', tab === 'monthly');
    if ($id('home-view-yearly')) $id('home-view-yearly').classList.toggle('hidden', tab !== 'yearly');
    if ($id('home-view-monthly')) $id('home-view-monthly').classList.toggle('hidden', tab !== 'monthly');
    setTimeout(() => { tab === 'yearly' ? renderYearlyView() : renderMonthlyView(); }, 50);
}

function updateHomeMonthlyView() { 
    renderMonthlyView(); 
}

function managementApiCall_(fn, args, options) {
    args = Array.isArray(args) ? args : [];
    options = options || {};
    if (window.CES_API && typeof window.CES_API.callFunction === 'function') {
        return window.CES_API.callFunction(fn, args, Object.assign({
            transport:'jsonp', timeoutMs:90000, dedupe:true,
            priority:'normal', module:'management_overview', silentLoading:true
        }, options));
    }
    return new Promise((resolve, reject) => {
        if (typeof google === 'undefined' || !google.script || !google.script.run) { reject(new Error('CES API is unavailable')); return; }
        let runner = google.script.run.withSuccessHandler(resolve).withFailureHandler(reject);
        runner[fn].apply(runner, args);
    });
}

function loadManagementQualitySummary_(force) {
    if (homeQualityPromise && !force) return homeQualityPromise;
    homeQualityPromise = managementApiCall_('getManagementQualitySummary', [{force:!!force}], {
        priority:'active', userAction:true, dedupe:!force,
        loadingLabel:'Loading Quality & Satisfaction…'
    }).then(data => {
        if (data && data.success !== false) {
            homeQualitySummary = data;
            try { localStorage.setItem(CES_MANAGEMENT_QUALITY_LOCAL_CACHE, JSON.stringify({at:Date.now(), data:data})); } catch (ignoreStore) {}
            currentHomeTab === 'yearly' ? calculateAndRenderQuality('y', 'All') : calculateAndRenderQuality('m', $id('m-filter-month')?.value || 'All');
        }
        return data;
    }).catch(error => {
        console.warn('[Management quality summary]', error);
        return homeQualitySummary;
    }).finally(() => { homeQualityPromise = null; });
    return homeQualityPromise;
}

function renderManagementOverviewDashboard(skipFetch = false) {
    // Render cached/read-model content first so opening the page never waits for CSI modules.
    const announceBox = $id('home-announcement-container');
    if (announceBox && typeof globalConfig !== 'undefined') {
        const isActive = globalConfig.ANNOUNCE_ACTIVE === 'true' && globalConfig.ANNOUNCE_MSG?.trim();
        announceBox.classList.toggle('hidden', !isActive);
        if (isActive) $txt('home-announcement-text', globalConfig.ANNOUNCE_MSG);
    }
    currentHomeTab === 'yearly' ? renderYearlyView() : renderMonthlyView();
    if (skipFetch) return;

    // Quality is the first foreground request because it is the first card group on this page.
    loadManagementQualitySummary_(false);

    // Secondary sections start just after the quality read. Re-entry within 30 s reuses current data.
    if (Date.now() - homeSecondaryLoadAt < 30000) return;
    homeSecondaryLoadAt = Date.now();
    setTimeout(() => {
        const d = new Date();
        const dStr = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;

        managementApiCall_('getCheckinDashboardData', [dStr, currentUser], {priority:'normal'}).then(data => {
            homeCheckinData = data?.activityLogs || [];
            if(currentHomeTab === 'monthly') renderHomeActivityTable();
        }).catch(error => console.warn('[Management check-in]', error));

        setTimeout(() => loadHomeWeeklyData(), 80);

        managementApiCall_('getRevenueDashboardData', [d.getFullYear()], {priority:'normal'}).then(data => {
            homeRevCache = data;
            currentHomeTab === 'yearly' ? renderYearlyView() : renderMonthlyView();
        }).catch(error => console.warn('[Management revenue]', error));

        managementApiCall_('getOTDashboardData', [], {priority:'normal'}).then(data => {
            homeOTDataCache = data || [];
            if(currentHomeTab === 'yearly') renderYearlyOTView();
        }).catch(error => console.warn('[Management OT]', error));
    }, 180);
}

function renderYearlyView() {
    calculateAndRenderQuality('y', 'All');
    updateHomeRevenueCommon('y');
    updateHomeJobStatsCommon('y');
    renderYearlyOTView();
}

function renderMonthlyView() {
    const month = $id('m-filter-month')?.value || 'All';
    $txt('m-qual-period-label', month === 'All' ? 'All Months (YTD)' : month);
    calculateAndRenderQuality('m', month); 
    updateHomeRevenueCommon('m');
    updateHomeJobStatsCommon('m');
    renderHomeActivityTable(); 
}
// ==========================================
// 4. DATA CALCULATION & RENDERING
// ==========================================
function calculateAndRenderQuality(prefix, monthFilter) {
    const teamMap = {'Medical Equipment':'MED','Lab & Testing':'LAB','Environmental Health':'EHS','Environmental':'ENV','ENV':'ENV','Technical Engineering Service':'TES','Technical':'TES','TES':'TES'};
    const isTeamMatch = t => {
        if (!t) return false;
        const raw = String(t).trim();
        const teamStr = (teamMap[raw] || raw).toUpperCase();
        const filterStr = homeFilterTeam.toUpperCase();
        if (filterStr === 'ALL') return true;
        // Service CSI keeps EHS and ENV as one combined EHS service summary.
        if (filterStr === 'EHS' || filterStr === 'ENV') return teamStr === 'EHS' || teamStr === 'ENV';
        return teamStr === filterStr;
    };
    
    const mNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const pStr = prefix === 'y' ? 'yearly' : 'monthly';
    const yearFilter = String($id('m-filter-year')?.value || new Date().getFullYear());

    // Preferred path: compact backend aggregate cached specifically for Management Overview.
    // This avoids waiting for the full Service CSI / Report CSI tabs and their large datasets.
    if (homeQualitySummary && Array.isArray(homeQualitySummary.service) && Array.isArray(homeQualitySummary.report)) {
        const targetMonth = monthFilter === 'All' ? 0 : (mNames.indexOf(monthFilter) + 1);
        const sumRows = rows => (rows || []).reduce((out, row) => {
            if (String(row.year || '') !== yearFilter) return out;
            if (targetMonth && Number(row.month || 0) !== targetMonth) return out;
            if (!isTeamMatch(row.team)) return out;
            out.sum += Number(row.sum || 0);
            out.count += Number(row.count || 0);
            return out;
        }, {sum:0,count:0});
        const svc = sumRows(homeQualitySummary.service);
        const rpt = sumRows(homeQualitySummary.report);
        const svcAvg = svc.count ? (svc.sum / svc.count) : 0;
        const rptAvg = rpt.count ? (rpt.sum / rpt.count) : 0;
        $txt(`kpi-${pStr}-service-score`, svcAvg ? svcAvg.toFixed(2) : '0.00');
        $txt(`kpi-${pStr}-service-sat-pct`, svcAvg ? ((svcAvg / 5) * 100).toFixed(0) + '%' : '0%');
        $txt(`kpi-${pStr}-report-sat`, rptAvg ? rptAvg.toFixed(2) : '0.00');
        $txt(`kpi-${pStr}-report-sat-pct`, rptAvg ? ((rptAvg / 5) * 100).toFixed(0) + '%' : '0%');
        return;
    }

    // ฟังก์ชันจัดการวันที่: หา 'ปี' และ 'เดือน' ตรงๆ จากคอลัมน์ใหม่
    const checkDateMatch = (mVal, dateVal, yVal) => {
        let yStr = String(yVal || '').trim();
        let mStr = String(mVal || '').trim();
        let dStr = String(dateVal || '').trim().split(/[ T]/)[0]; // Fallback เผื่อไว้
        
        let matchYear = false;

        // 1. ตรวจสอบ "ปี" (คอลัมน์ Year สำคัญที่สุด)
        if (yStr !== '') {
            matchYear = (yStr === yearFilter);
        } else if (dStr !== '') { 
            // Fallback กรณีที่บางแถวยังไม่มีค่า Year (ข้อมูลเก่า)
            let parts = dStr.split(/[\/\-]/);
            if (parts.length >= 3) {
                let y = parts.find(p => p.length === 4) || parts[2];
                matchYear = (String(y) === yearFilter);
            } else {
                let dObj = new Date(dStr);
                if (!isNaN(dObj.getTime())) matchYear = (String(dObj.getFullYear()) === yearFilter);
            }
        }

        // ตัดข้อมูลทิ้งถ่าปีไม่ตรง
        if (!matchYear) return false; 
        if (monthFilter === 'All') return true; 

        // 2. ตรวจสอบ "เดือน"
        let targetM = mNames.indexOf(monthFilter) + 1;
        let matchMonth = false;
        
        if (mStr !== '') {
            if (mStr === monthFilter) matchMonth = true;
            else if (parseInt(mStr) === targetM) matchMonth = true;
        } else if (dStr !== '') {
            let parts = dStr.split(/[\/\-]/);
            if (parts.length >= 3) {
                let p0 = parseInt(parts[0]);
                let p1 = parseInt(parts[1]);
                if (p0 === targetM || p1 === targetM) matchMonth = true;
            } else {
                let dObj = new Date(dStr);
                if (!isNaN(dObj.getTime())) matchMonth = ((dObj.getMonth() + 1) === targetM);
            }
        }

        return matchMonth;
    };

    // --------------------------------------------------
    // 1. คำนวณ Service Quality
    // --------------------------------------------------
    if(typeof serviceRawData !== 'undefined' && serviceRawData.length) {
        let sum = 0, cnt = 0;
        serviceRawData.filter(d => {
            let matchTeam = isTeamMatch(d.team || d.Team);
            let matchDate = checkDateMatch(d.monthOnly || d.MonthOnly || d.month, d.date || d.Date || d.finished, d.year || d.Year);
            return matchTeam && matchDate;
        }).forEach(d => {
            [d.s1||d.scoreS1, d.s2||d.scoreS2, d.s3||d.scoreS3, d.s4||d.scoreS4, d.s5||d.scoreS5].forEach(v => { 
                let num = Number(v);
                if(!isNaN(num) && num > 0) { sum += num; cnt++; } 
            });
        });
        const avg = cnt > 0 ? (sum / cnt).toFixed(2) : "0.00";
        const sat = cnt > 0 ? ((sum / cnt / 5) * 100).toFixed(0) + '%' : '0%';
        $txt(`kpi-${pStr}-service-score`, avg);
        $txt(`kpi-${pStr}-service-sat-pct`, sat);
    }

    // --------------------------------------------------
    // 2. คำนวณ Report Quality
    // --------------------------------------------------
    if(typeof reportRawData !== 'undefined' && reportRawData.length) {
        let sumRpt = 0, cntRpt = 0;
        
        reportRawData.filter(d => {
            let rTeam = d.team || d.Team || d['Service Team'] || d.ServiceTeam;
            let matchTeam = isTeamMatch(rTeam);
            
            // 🔥 ส่งค่า d.month และ d.year ตัวใหม่เข้าไปตรวจสอบ
            let matchDate = checkDateMatch(d.month || d.Month, d.finished || d.Finished, d.year || d.Year);
            
            return matchTeam && matchDate;
        }).forEach(d => {
            let score = Number(d.satisfaction || d.Satisfaction);
            if (!isNaN(score) && score > 0) {
                sumRpt += score;
                cntRpt++;
            }
        });
        
        const avgRpt = cntRpt > 0 ? (sumRpt / cntRpt).toFixed(2) : "0.00";
        const satRpt = cntRpt > 0 ? ((avgRpt / 5) * 100).toFixed(0) + '%' : '0%';
        
        $txt(`kpi-${pStr}-report-sat`, avgRpt); 
        $txt(`kpi-${pStr}-report-sat-pct`, satRpt);
    }
}
function updateHomeRevenueCommon(mode) {
    if(!homeRevCache?.monthly) return;
    const selMonth = mode === 'm' ? ($id('m-filter-month')?.value || 'All') : 'All';
    let s = { med:{act:0,tgt:0}, lab:{act:0,tgt:0}, ehs:{act:0,tgt:0}, total:{act:0,tgt:0} };
    
    homeRevCache.monthly.forEach(m => {
        if (selMonth === 'All' || m.month === selMonth) {
            ['med','lab','ehs'].forEach(t => { s[t].act += m[t].a; s[t].tgt += m[t].t; });
            s.total.act += (m.med.a + m.lab.a + m.ehs.a); s.total.tgt += (m.med.t + m.lab.t + m.ehs.t);
        }
    });

    updateRevCard(s.total, `${mode}-rev-total`);
    renderRevBreakdownList(`${mode}-rev-breakdown`, s, false); // แสดงแบบ List ใหญ่
    
    if(mode === 'y') {
        renderHomeRevenueChart(homeRevCache.charts, 'yRevenueChart');
    } else {
        // กราฟเปรียบเทียบในเดือนที่เลือก
        let mChartData = { labels:[selMonth === 'All' ? 'YTD' : selMonth], med_a:[s.med.act], lab_a:[s.lab.act], ehs_a:[s.ehs.act], med_t:[s.med.tgt], lab_t:[s.lab.tgt], ehs_t:[s.ehs.tgt] };
        renderHomeRevenueChart(mChartData, 'mRevenueChart');
    }
}

function updateRevCard(data, pfx) {
    const pct = data.tgt > 0 ? (data.act / data.tgt) * 100 : 0;
    $txt(`${pfx}-act`, formatHomeCurrencyShort(data.act)); $txt(`${pfx}-tgt`, formatHomeCurrencyShort(data.tgt));
    $txt(`${pfx}-pct`, pct.toFixed(0) + '%'); $style(`${pfx}-prog`, 'width', Math.min(pct, 100) + '%');
}

function renderRevBreakdownList(cId, s, isCompact) {
    const teams = [{id:'med',c:'blue',n:'MED'}, {id:'lab',c:'cyan',n:'LAB'}, {id:'ehs',c:'emerald',n:'EHS'}];
    $html(cId, teams.map(t => {
        const d = s[t.id], pct = d.tgt > 0 ? (d.act/d.tgt)*100 : 0;
        return isCompact 
            ? `<div class="flex justify-between items-center p-2 rounded-lg bg-${t.c}-50 border border-${t.c}-100"><span class="text-[10px] font-bold text-${t.c}-600 w-10">${t.n}</span><span class="text-xs font-bold text-gray-700">${formatHomeCurrencyShort(d.act)}</span><span class="text-[9px] font-bold text-gray-400 w-8 text-right">${pct.toFixed(0)}%</span></div>`
            : `<div class="p-3 rounded-xl border border-gray-100 bg-white hover:border-${t.c}-200 transition-all flex flex-col"><div class="flex justify-between items-center mb-1"><span class="text-[10px] font-bold text-${t.c}-600 bg-${t.c}-50 px-2 py-0.5 rounded">${t.n}</span><span class="text-[10px] font-bold text-gray-500">${pct.toFixed(0)}%</span></div><div class="flex justify-between items-end"><div class="text-sm font-black text-gray-700">${formatHomeCurrencyShort(d.act)}</div><div class="text-[9px] text-gray-400">/ ${formatHomeCurrencyShort(d.tgt)}</div></div><div class="w-full bg-gray-100 h-1.5 rounded-full mt-2"><div class="bg-${t.c}-500 h-1.5 rounded-full" style="width: ${Math.min(pct, 100)}%"></div></div></div>`;
    }).join(''));
}

function updateHomeJobStatsCommon(mode) {
    // Home dashboard must use the same normalized yearly job data as Job Dashboard.
    // Previous logic expected monthNum, while the fixed Job Dashboard uses month.
    const sourceRows = (typeof cachedYearlyStats !== 'undefined' && Array.isArray(cachedYearlyStats))
        ? cachedYearlyStats
        : (Array.isArray(window.globalYearlyStats) ? window.globalYearlyStats : []);
    if (!sourceRows.length) return;

    const monthShort = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthFull  = ['','January','February','March','April','May','June','July','August','September','October','November','December'];
    const n = v => {
        const x = Number(String(v == null ? '' : v).replace(/[^0-9.-]/g, ''));
        return Number.isFinite(x) ? x : 0;
    };
    const getMonthNum = r => {
        let m = n(r.monthNum ?? r.month ?? r.Month ?? r.month_no ?? r.monthNo);
        if (m >= 1 && m <= 12) return m;
        const name = String(r.monthName || r.MonthName || r.monthText || r.month || '').trim().toLowerCase();
        if (!name) return 0;
        const idxShort = monthShort.findIndex(x => x.toLowerCase() === name.substring(0, 3));
        if (idxShort > 0) return idxShort;
        const idxFull = monthFull.findIndex(x => x.toLowerCase() === name);
        return idxFull > 0 ? idxFull : 0;
    };
    const weekdaysInMonth = (month, year) => {
        let count = 0;
        const days = new Date(year, month, 0).getDate();
        for (let d = 1; d <= days; d++) {
            const dow = new Date(year, month - 1, d).getDay();
            if (dow !== 0 && dow !== 6) count++;
        }
        return count;
    };

    const selectedYear = n($id('m-filter-year')?.value || $id('yearly-filter-year')?.value || new Date().getFullYear()) || new Date().getFullYear();
    const selectedMonth = mode === 'm' ? ($id('m-filter-month')?.value || 'All') : 'All';
    const visibleTeams = homeFilterTeam === 'All' ? ['MED','LAB','EHS','ENV','TES'] : [homeFilterTeam];

    const cfg = (typeof globalConfig !== 'undefined' && globalConfig) ? globalConfig : {};
    const cap = {
        MED: n(cfg.CAPACITY_MED || cfg.MED || cfg.med || 12) || 12,
        LAB: n(cfg.CAPACITY_LAB || cfg.LAB || cfg.lab || 3) || 3,
        EHS: n(cfg.CAPACITY_EHS || cfg.EHS || cfg.ehs || 3) || 3,
        ENV: n(cfg.CAPACITY_ENV || cfg.ENV || cfg.env || 3) || 3,
        TES: n(cfg.CAPACITY_TES || cfg.TES || cfg.tes || 3) || 3
    };

    const rowsByMonth = {};
    sourceRows.forEach(r => {
        const y = n(r.year ?? r.Year);
        const m = getMonthNum(r);
        if (y !== selectedYear || m < 1 || m > 12) return;
        if (!rowsByMonth[m]) rowsByMonth[m] = { year: selectedYear, month: m, monthName: monthFull[m], med: 0, lab: 0, ehs: 0, env: 0, tes: 0, total: 0 };
        rowsByMonth[m].med += n(r.med ?? r.MED ?? r.Medical ?? r.medJobs);
        rowsByMonth[m].lab += n(r.lab ?? r.LAB ?? r.Lab ?? r.labJobs);
        rowsByMonth[m].ehs += n(r.ehs ?? r.EHS ?? r.ehsJobs);
        rowsByMonth[m].env += n(r.env ?? r.ENV ?? r.envJobs);
        rowsByMonth[m].tes += n(r.tes ?? r.TES ?? r.tesJobs);
    });

    const rows = [];
    for (let m = 1; m <= 12; m++) {
        const r = rowsByMonth[m] || { year: selectedYear, month: m, monthName: monthFull[m], med: 0, lab: 0, ehs: 0, env: 0, tes: 0, total: 0 };
        r.total = n(r.med) + n(r.lab) + n(r.ehs) + n(r.env) + n(r.tes);
        rows.push(r);
    }

    const monthMatch = r => selectedMonth === 'All' || monthShort[r.month] === selectedMonth || monthFull[r.month] === selectedMonth;
    const summary = { MED: 0, LAB: 0, EHS: 0, ENV: 0, TES: 0, ALL: 0 };
    const capacity = { MED: 0, LAB: 0, EHS: 0, ENV: 0, TES: 0, ALL: 0 };

    rows.filter(monthMatch).forEach(r => {
        ['MED','LAB','EHS','ENV','TES'].forEach(team => {
            const actual = n(r[team.toLowerCase()]);
            const target = weekdaysInMonth(r.month, selectedYear) * cap[team];
            if (visibleTeams.includes(team)) {
                summary[team] += actual;
                summary.ALL += actual;
                capacity[team] += target;
                capacity.ALL += target;
            }
        });
    });

    if (mode === 'y') {
        const chartData = { labels: [], med_a: [], lab_a: [], ehs_a: [], env_a: [], tes_a: [], med_t: [], lab_t: [], ehs_t: [], env_t: [], tes_t: [], visibleTeams };
        rows.forEach(r => {
            chartData.labels.push(monthShort[r.month]);
            ['MED','LAB','EHS','ENV','TES'].forEach(team => {
                const key = team.toLowerCase();
                chartData[`${key}_a`].push(visibleTeams.includes(team) ? n(r[key]) : 0);
                chartData[`${key}_t`].push(visibleTeams.includes(team) ? weekdaysInMonth(r.month, selectedYear) * cap[team] : 0);
            });
        });
        renderHomeJobCharts(chartData, summary, 'yJobTrendChart', 'yJobPieChart');
    } else {
        const label = selectedMonth === 'All' ? 'YTD' : selectedMonth;
        const chartData = {
            labels: [label],
            med_a: [summary.MED], lab_a: [summary.LAB], ehs_a: [summary.EHS], env_a: [summary.ENV], tes_a: [summary.TES],
            med_t: [capacity.MED], lab_t: [capacity.LAB], ehs_t: [capacity.EHS], env_t: [capacity.ENV], tes_t: [capacity.TES],
            visibleTeams
        };
        renderHomeJobCharts(chartData, summary, 'mJobBarChart', 'mJobPieChart');
    }
}

// ==========================================
// 5. CHARTS (REFACTORED WITH CHARTSCACHE)
// ==========================================
function renderHomeRevenueChart(cData, canvasId) {
    const ctx = $id(canvasId); if(!ctx) return;
    if(chartsCache[canvasId]) chartsCache[canvasId].destroy();
    
    chartsCache[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: { labels: cData.labels, datasets: [
            { label:'MED', data:cData.med_a, backgroundColor:'#004aad', targetData:cData.med_t, categoryPercentage:0.8, barPercentage:0.7 },
            { label:'LAB', data:cData.lab_a, backgroundColor:'#19a7ce', targetData:cData.lab_t, categoryPercentage:0.8, barPercentage:0.7 },
            { label:'EHS', data:cData.ehs_a, backgroundColor:'#0fc1a1', targetData:cData.ehs_t, categoryPercentage:0.8, barPercentage:0.7 }
        ]},
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position:'bottom', labels:{usePointStyle:true, boxWidth:8} }, tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${formatHomeCurrencyShort(c.raw)} / ${formatHomeCurrencyShort(c.dataset.targetData[c.dataIndex])}` } } }, scales: { y: { beginAtZero:true, grid:{color:'#004aad'}, ticks: { callback: v => (v/1000000).toFixed(1) + 'M', font: {size:10} } }, x: { grid:{display:false}, ticks:{font:{size:10}} } } },
        plugins: [globalTargetBarPlugin]
    });
}

function renderHomeJobCharts(tData, sData, trendId, pieId) {
    const ctxT = $id(trendId), ctxP = $id(pieId);
    const teamDef = {
        MED: { key: 'med' }, LAB: { key: 'lab' }, EHS: { key: 'ehs' }, ENV: { key: 'env' }, TES: { key: 'tes' }
    };
    Object.keys(teamDef).forEach(t => teamDef[t].color = typeof window.cesGetTeamColor==='function' ? window.cesGetTeamColor(t) : ({MED:'#004aad',LAB:'#19a7ce',EHS:'#0fc1a1',ENV:'#7ed957',TES:'#ffde59'})[t]);
    const teams = (tData?.visibleTeams && tData.visibleTeams.length) ? tData.visibleTeams : ['MED','LAB','EHS','ENV','TES'];
    const dlPlugin = (typeof ChartDataLabels !== 'undefined') ? [ChartDataLabels] : [];

    if (ctxT && tData && typeof Chart !== 'undefined') {
        if (chartsCache[trendId]) chartsCache[trendId].destroy();

        // Home Job chart now matches Job Dashboard / Revenue style:
        // grey capacity target is drawn behind each colored actual bar through targetData.
        const actualDatasets = teams.map(team => {
            const def = teamDef[team];
            return {
                label: team,
                data: tData[`${def.key}_a`] || [],
                backgroundColor: def.color,
                hoverBackgroundColor: def.color,
                borderRadius: 4,
                targetData: tData[`${def.key}_t`] || [],
                categoryPercentage: 0.8,
                barPercentage: 0.7
            };
        });

        const allValues = [];
        teams.forEach(team => {
            const def = teamDef[team];
            allValues.push(...(tData[`${def.key}_a`] || []), ...(tData[`${def.key}_t`] || []));
        });
        const maxVal = Math.max(1, ...allValues.map(v => Number(v) || 0));

        chartsCache[trendId] = new Chart(ctxT, {
            type: 'bar',
            data: { labels: tData.labels || [], datasets: actualDatasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { stacked: false, grid: { display: false }, ticks: { font: { size: 10 } } },
                    y: { stacked: false, beginAtZero: true, suggestedMax: Math.ceil(maxVal * 1.15), grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 } } }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { usePointStyle: true, boxWidth: 8, font: { size: 10 } }
                    },
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        formatter: (val) => Number(val) > 0 ? val : '',
                        font: { weight: 'bold', size: 10 },
                        color: '#475569',
                        offset: -2
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: '#1e293b',
                        padding: 10,
                        cornerRadius: 8,
                        callbacks: {
                            label: c => {
                                const target = Array.isArray(c.dataset.targetData) ? c.dataset.targetData[c.dataIndex] : 0;
                                return ` ${c.dataset.label}: ${c.raw} / ${target}`;
                            },
                            afterBody: () => 'Grey bar = capacity target'
                        }
                    }
                }
            },
            plugins: [...dlPlugin, globalTargetBarPlugin]
        });
    }

    if (ctxP && sData && typeof Chart !== 'undefined') {
        if (chartsCache[pieId]) chartsCache[pieId].destroy();
        const labels = teams;
        const values = teams.map(team => Number(sData[team] || 0));
        chartsCache[pieId] = new Chart(ctxP, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: teams.map(team => teamDef[team].color),
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, font: { size: 10 } } },
                    datalabels: {
                        color: '#fff',
                        font: { weight: 'bold', size: 10 },
                        formatter: v => Number(v) > 0 ? Number(v).toLocaleString() : ''
                    }
                }
            },
            plugins: dlPlugin
        });
    }
}

function renderYearlyOTView() {
    if (!homeOTDataCache?.length) return;
    const fOT = homeFilterTeam === 'All' ? homeOTDataCache : homeOTDataCache.filter(i => i.team === homeFilterTeam);
    const cy = new Date().getFullYear().toString(), mOT = Array(12).fill(0), tOT = {};

    fOT.forEach(i => {
        if (i.year === cy) {
            const m = parseInt(i.month) - 1; if (m>=0 && m<12) mOT[m] += parseFloat(i.otHrs||0);
            tOT[i.team||'Unknown'] = (tOT[i.team||'Unknown']||0) + parseFloat(i.otHrs||0);
        }
    });

    const pCtx = $id('homeYearlyOTPie'), tCtx = $id('homeYearlyOTTrend');
    if (pCtx) {
        if (chartsCache['otPie']) chartsCache['otPie'].destroy();
        const otLabels = Object.keys(tOT);
        chartsCache['otPie'] = new Chart(pCtx, { type: 'doughnut', data: { labels: otLabels, datasets: [{ data: Object.values(tOT), backgroundColor: otLabels.map((team,index)=>typeof window.cesGetTeamColor==='function'?window.cesGetTeamColor(team):['#004aad','#19a7ce','#0fc1a1','#7ed957','#ffde59','#b4b4b4'][index%6]), borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, font: { family: 'Prompt', size: 10 } } } } } });
    }
    if (tCtx) {
        if (chartsCache['otTrend']) chartsCache['otTrend'].destroy();
        chartsCache['otTrend'] = new Chart(tCtx, { type: 'bar', data: { labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], datasets: [{ label: 'Total OT (Hrs)', data: mOT, backgroundColor: '#94a3b8', hoverBackgroundColor: '#004aad', borderRadius: 6, barPercentage: 0.6 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { borderDash: [4, 4], color: '#f1f5f9' }, ticks: { font: { family: 'Prompt', size: 10 } } }, x: { grid: { display: false }, ticks: { font: { family: 'Prompt', size: 10 } } } }, plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1e293b', padding: 10, titleFont: { family: 'Prompt' }, bodyFont: { family: 'Prompt' }, cornerRadius: 8 } } } });
    }
}

// ==========================================
// 6. TABLES & INFOGRAPHICS 
// ==========================================
function renderHomeActivityTable() {
    let logs = (homeFilterTeam === 'All' ? homeCheckinData : homeCheckinData?.filter(l => String(l.team||'').toUpperCase() === homeFilterTeam)) || [];
    
    // ตาราง Activity Log
    $html('home-activity-tbody', logs.length === 0 ? '<tr><td colspan="6" class="text-center py-4 text-gray-300 italic text-xs">No activity found today</td></tr>' : logs.slice(0, 10).map(l => {
        const teamStyle = typeof window.cesGetTeamStyle==='function'?window.cesGetTeamStyle(l.team):{color:'#64748b',soft:'#f8fafc',border:'#e2e8f0'};
        const actionBtn = (l.gps?.includes('http')) ? `<a href="${l.gps}" target="_blank" class="text-indigo-500 hover:text-indigo-700 font-bold text-[10px] flex items-center justify-end gap-1"><i class="fas fa-map-marker-alt"></i> Map</a>` : '-';
        return `<tr class="border-b border-gray-50 hover:bg-gray-50 transition-colors"><td class="p-4 font-mono text-xs text-gray-500">${l.time || l.ts || '-'}</td><td class="p-4"><span class="px-2 py-0.5 rounded text-[10px] font-bold" style="color:${teamStyle.color};background:${teamStyle.soft};border:1px solid ${teamStyle.border}">${l.team||'-'}</span></td><td class="p-4 font-bold text-xs text-gray-700 flex items-center gap-2"><div class="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-500"><i class="fas fa-user"></i></div>${l.name||l.user||l.staff||l.username||'Unknown'}</td><td class="p-4">${l.type==='IN'?'<span class="bg-[#003DA5]/10 text-[#003DA5] px-2 py-0.5 rounded text-[9px] font-bold"><i class="fas fa-sign-in-alt mr-1"></i>IN</span>':'<span class="bg-[#003DA5]/10 text-[#003DA5] px-2 py-0.5 rounded text-[9px] font-bold"><i class="fas fa-sign-out-alt mr-1"></i>OUT</span>'}</td><td class="p-4 text-xs text-gray-500 truncate max-w-[150px]">${l.job||'-'}</td><td class="p-4 text-right pr-6 flex justify-end items-center">${actionBtn}</td></tr>`;
    }).join(''));

    // วาดกราฟ Check-in Pie Chart (ด้านข้างตาราง)
    let cS = { MED:0, LAB:0, EHS:0, ENV:0, TES:0 };
    logs.forEach(l => { const t = String(l.team||'').toUpperCase(); if(l.type==='IN' && cS.hasOwnProperty(t)) cS[t]++; });
    
    const cCtx = $id('mCheckinPieChart');
    if(cCtx) {
        if(chartsCache['checkinPie']) chartsCache['checkinPie'].destroy();
        chartsCache['checkinPie'] = new Chart(cCtx, { type: 'doughnut', data: { labels:['MED','LAB','EHS','ENV','TES'], datasets:[{data:[cS.MED, cS.LAB, cS.EHS, cS.ENV, cS.TES], backgroundColor:['MED','LAB','EHS','ENV','TES'].map(t=>typeof cesGetTeamColor==='function'?cesGetTeamColor(t):'#64748b'), borderWidth:0}] }, options: { responsive:true, maintainAspectRatio:false, cutout:'70%', plugins:{ legend:{display:false} } } });
        
        let total = cS.MED + cS.LAB + cS.EHS + cS.ENV + cS.TES;
        $html('m-checkin-stats', ['MED','LAB','EHS','ENV','TES'].map(t => {
            const style = typeof window.cesGetTeamStyle==='function' ? window.cesGetTeamStyle(t) : {color:'#64748b',soft:'#f8fafc',border:'#e2e8f0'};
            let pct = total > 0 ? (cS[t]/total)*100 : 0;
            return `<div class="flex justify-between items-center px-3 py-1.5 rounded-lg border" style="background:${style.soft};border-color:${style.border}"><span class="text-[10px] font-bold" style="color:${style.color}">${t}</span><span class="text-[10px] font-bold text-gray-700">${cS[t]} <span class="text-gray-400 font-normal ml-1">(${pct.toFixed(0)}%)</span></span></div>`;
        }).join(''));
    }
}

function formatHomeCurrencyShort(num) { return (!num || isNaN(num)) ? '0' : num >= 1000000 ? '฿' + (num/1000000).toFixed(2) + 'M' : num >= 1000 ? '฿' + (num/1000).toFixed(0) + 'K' : '฿' + num.toLocaleString(); }

function loadHomeWeeklyData() { google.script.run.withSuccessHandler(renderHomeWeeklySection).getLatestWeeklyReports(6); }

function renderHomeWeeklySection(data) {
    let d = homeFilterTeam === 'All' ? data : data?.filter(x => x.team === homeFilterTeam);
    $html('home-weekly-grid', !d?.length ? '<div class="col-span-3 text-center text-gray-300 text-xs py-8 border-2 border-dashed border-gray-100 rounded-xl">No weekly reports found.</div>' : d.map(r => {
        let imgs = []; try { imgs = JSON.parse(r.photo); if(!Array.isArray(imgs)) imgs = [r.photo]; } catch(e) { imgs = [r.photo]; }
        imgs = imgs.filter(url => url !== '-' && !url.startsWith('Error'));
        const photoHtml = imgs.length ? `<div class="h-40 bg-gray-100 relative group overflow-hidden"><img src="${getDriveImgUrl(imgs[0])}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" onerror="this.onerror=null;this.src='https://placehold.co/400x300?text=No+Image';">${imgs.length>1?`<div class="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">+${imgs.length-1}</div>`:''}</div>` : '<div class="h-32 bg-gray-50 flex items-center justify-center text-gray-300 text-[10px]">No Photo</div>';
        const tStyle = typeof window.cesGetTeamStyle==='function'?window.cesGetTeamStyle(r.team):{color:'#64748b',soft:'#f8fafc',border:'#e2e8f0'};
        return `<div class="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col cursor-pointer group" onclick='if(typeof viewDetail==="function") viewDetail(${JSON.stringify(r)})'>${photoHtml}<div class="p-4 flex-1 flex flex-col"><div class="flex justify-between items-start mb-2"><span class="text-[9px] font-bold px-2 py-0.5 rounded uppercase" style="color:${tStyle.color};background:${tStyle.soft};border:1px solid ${tStyle.border}">${r.team}</span><span class="text-[9px] font-bold ${r.status==='Finish'?'bg-[#003DA5]/10 text-[#003DA5]':'bg-[#003DA5]/10 text-[#003DA5]'} px-2 py-0.5 rounded-full">${r.status}</span></div><h4 class="font-bold text-gray-800 text-xs mb-2 leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors">${r.job}</h4><div class="mt-auto pt-2 border-t border-dashed border-gray-100"><div class="mb-2"><div class="flex justify-between text-[9px] mb-1"><span class="text-gray-400 font-bold"><i class="fas fa-microchip mr-1"></i> Device</span><span class="font-bold text-gray-600">${r.deviceAct}/${r.deviceTotal}</span></div><div class="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden"><div class="bg-blue-400 h-1.5 rounded-full transition-all duration-500" style="width: ${Math.min(100, Math.round((r.deviceAct/r.deviceTotal)*100)||0)}%"></div></div></div><div class="mb-3"><div class="flex justify-between items-center mb-1"><span class="text-[9px] text-gray-400 font-bold"><i class="fas fa-chart-line mr-1"></i> Job</span><span class="text-[9px] font-bold text-gray-600">${r.progressText}</span></div><div class="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden"><div class="h-1.5 rounded-full bg-[#003DA5]/60" style="width: ${r.progressVal}%"></div></div></div><div class="flex items-center gap-2"><div class="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[8px] font-bold text-gray-500">${r.reporter.charAt(0)}</div><span class="text-[10px] text-gray-400 truncate max-w-[80px]">${r.reporter.split(' ')[0]}</span></div></div></div></div>`;
    }).join(''));
}

window.CES_HOME_UI_RECHECK=function(){return{version:'V41',teams:['MED','LAB','EHS','ENV','TES'],serviceCsi:{EHS:['EHS','ENV']}};};

window.CES_HOME_UI_V40_RECHECK=window.CES_HOME_UI_RECHECK;

// V18.6 canonical name; legacy alias is retained only for cached frontends.
window.renderManagementOverviewDashboard = renderManagementOverviewDashboard;
window.renderHomeDashboard = renderManagementOverviewDashboard;
