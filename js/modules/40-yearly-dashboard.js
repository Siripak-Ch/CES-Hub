// ============================================================
// 40-yearly-dashboard.js
// Extracted from original index.html. Keep load order from index.html.
// ============================================================

// --- Global Variables ---
    let yearlyPieChartInstance = null;
    let yearlyTrendChartInstance = null;
    let cachedYearlyStats = [];

    /**
     * Initialization
     */
    function renderYearlyStats(stats) {
        if (!stats) return;
        cachedYearlyStats = stats;
        
        // Load settings if not loaded, then init UI
        if (typeof globalConfig === 'undefined' || Object.keys(globalConfig).length === 0) {
             google.script.run.withSuccessHandler((cfg) => {
                 if(cfg) window.globalConfig = cfg;
                 initYearlyFilters(stats);
                 updateYearlyView();
             }).getSystemSettings();
        } else {
             initYearlyFilters(stats);
             updateYearlyView();
        }
    }

    /**
     * Filter Logic
     */
    function initYearlyFilters(stats) {
        const select = document.getElementById('yearly-filter-year');
        if(!select) return;

        const years = [...new Set(stats.map(item => item.year))].sort((a, b) => b - a);
        const currentValue = select.value; 
        select.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');

        const currentYear = new Date().getFullYear();
        if(years.includes(currentYear)) select.value = currentYear;
        else if(years.length > 0) select.value = years[0];
        
        if(currentValue && years.includes(parseInt(currentValue))) select.value = currentValue;
    }

    /**
     * Helper: Count Weekdays (Mon-Fri) in a month
     */
    function getYearlyWeekdays(month, year) {
        let count = 0;
        const daysInMonth = new Date(year, month, 0).getDate(); // month is 1-based index
        for(let d = 1; d <= daysInMonth; d++) {
            const dayOfWeek = new Date(year, month - 1, d).getDay();
            if(dayOfWeek !== 0 && dayOfWeek !== 6) count++; 
        }
        return count;
    }

    /**
     * Core Logic: Calculate KPI & Update UI
     */
    function updateYearlyView() {
        const selectedYear = parseInt(document.getElementById('yearly-filter-year').value);
        // Actual Data (From DB)
        const data = cachedYearlyStats.filter(d => d.year === selectedYear);

        // 1. Configs
        const gConfig = (typeof globalConfig !== 'undefined') ? globalConfig : {};
        const capMED = parseInt(gConfig.CAPACITY_MED || 12);
        const capLAB = parseInt(gConfig.CAPACITY_LAB || 3);
        const capEHS = parseInt(gConfig.CAPACITY_EHS || 3);

        // 2. Calculate Annual Target (Loop 1-12 months)
        let tgtMed = 0, tgtLab = 0, tgtEhs = 0;
        for (let m = 1; m <= 12; m++) {
            const wd = getYearlyWeekdays(m, selectedYear);
            tgtMed += (wd * capMED);
            tgtLab += (wd * capLAB);
            tgtEhs += (wd * capEHS);
        }
        const tgtAll = tgtMed + tgtLab + tgtEhs;

        // 3. Calculate Actuals (Sum from available data)
        let tMed = 0, tLab = 0, tEhs = 0, tAll = 0;
        data.forEach(d => {
            tMed += d.med; 
            tLab += d.lab; 
            tEhs += d.ehs; 
            tAll += d.total; 
        });

        // 4. Update KPI Boxes
        animateValue('y-act-all', 0, tAll, 800);
        animateValue('y-act-med', 0, tMed, 800);
        animateValue('y-act-lab', 0, tLab, 800);
        animateValue('y-act-ehs', 0, tEhs, 800);

        // Update Targets Text
        if(document.getElementById('y-tgt-all')) document.getElementById('y-tgt-all').innerText = tgtAll.toLocaleString();
        if(document.getElementById('y-tgt-med')) document.getElementById('y-tgt-med').innerText = tgtMed.toLocaleString();
        if(document.getElementById('y-tgt-lab')) document.getElementById('y-tgt-lab').innerText = tgtLab.toLocaleString();
        if(document.getElementById('y-tgt-ehs')) document.getElementById('y-tgt-ehs').innerText = tgtEhs.toLocaleString();

        // 5. Update Progress Bars
        const uAll = tgtAll > 0 ? Math.min(100, Math.round((tAll / tgtAll) * 100)) : 0;
        const uMed = tgtMed > 0 ? Math.min(100, Math.round((tMed / tgtMed) * 100)) : 0;
        const uLab = tgtLab > 0 ? Math.min(100, Math.round((tLab / tgtLab) * 100)) : 0;
        const uEhs = tgtEhs > 0 ? Math.min(100, Math.round((tEhs / tgtEhs) * 100)) : 0;

        updateProgressBar('y-bar-all', 'y-cap-all', uAll);
        updateProgressBar('y-bar-med', 'y-cap-med', uMed);
        updateProgressBar('y-bar-lab', 'y-cap-lab', uLab);
        updateProgressBar('y-bar-ehs', 'y-cap-ehs', uEhs);

        // 6. Charts
        renderYearlyCharts(data, { med: capMED, lab: capLAB, ehs: capEHS }, selectedYear);
        renderYearlyTable(data);
    }

    function updateProgressBar(barId, textId, pct) {
        const textEl = document.getElementById(textId);
        const barEl = document.getElementById(barId);
        if(textEl) textEl.innerText = pct + '%';
        if(barEl) barEl.style.width = pct + '%';
    }

    /**
     * Render Charts - [MODIFIED] to place Target bars behind Actual bars
     */
    function renderYearlyCharts(data, teamConfig, year) {
        const sorted = [...data].sort((a,b) => a.month - b.month);
        const labels = sorted.map(d => d.monthName.substring(0,3));

        // Calculate Monthly Targets for Chart
        const targets = sorted.map(d => {
            const wd = getYearlyWeekdays(d.month, year);
            return {
                med: wd * teamConfig.med,
                lab: wd * teamConfig.lab,
                ehs: wd * teamConfig.ehs
            };
        });

        const ctxT = document.getElementById('yearlyTrendChart').getContext('2d');
        if (yearlyTrendChartInstance) yearlyTrendChartInstance.destroy();
        
        // --- [MODIFIED SECTION BEGINS] ---
        // Setup datasets for layering: Target behind (order 2), Actual in front (order 1)
        // We use the same barPercentage to make them overlap perfectly.
        const barWidthSettings = { barPercentage: 0.6, categoryPercentage: 0.9 };
        const targetColor = '#e2e8f0'; // Light gray for background target

        yearlyTrendChartInstance = new Chart(ctxT, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    // --- Targets (Background Layer - Order 2) ---
                    { 
                        label: 'Target (MED)', data: targets.map(t=>t.med), backgroundColor: targetColor, hoverBackgroundColor: '#cbd5e1',
                        order: 2, borderRadius: 4, datalabels: { display: false }, ...barWidthSettings 
                    },
                    { 
                        label: 'Target (LAB)', data: targets.map(t=>t.lab), backgroundColor: targetColor, hoverBackgroundColor: '#cbd5e1',
                        order: 2, borderRadius: 4, datalabels: { display: false }, ...barWidthSettings
                    },
                    { 
                        label: 'Target (EHS)', data: targets.map(t=>t.ehs), backgroundColor: targetColor, hoverBackgroundColor: '#cbd5e1',
                        order: 2, borderRadius: 4, datalabels: { display: false }, ...barWidthSettings
                    },

                    // --- Actuals (Foreground Layer - Order 1) ---
                    { 
                        label: 'MED', data: sorted.map(d=>d.med), backgroundColor: '#004aad', 
                        order: 1, borderRadius: 4, ...barWidthSettings
                    },
                    { 
                        label: 'LAB', data: sorted.map(d=>d.lab), backgroundColor: '#19a7ce', 
                        order: 1, borderRadius: 4, ...barWidthSettings
                    },
                    { 
                        label: 'EHS', data: sorted.map(d=>d.ehs), backgroundColor: '#0fc1a1', 
                        order: 1, borderRadius: 4, ...barWidthSettings
                    }
                ]
            },
            options: { 
                responsive: true, maintainAspectRatio: false,
                scales: { 
                    // [IMPORTANT] stacked: false allows them to occupy the same space based on order
                    x: { stacked: false, grid: { display: false } }, 
                    y: { stacked: false, beginAtZero: true, grid: { color: '#f8fafc' } } 
                },
                plugins: { 
                    legend: { 
                        position: 'bottom', 
                        labels: { 
                            usePointStyle: true, boxWidth: 6,
                            // Hide the "Target (...)" datasets from legend
                            filter: (item) => !item.text.startsWith('Target') 
                        } 
                    },
                    datalabels: {
                        anchor: 'end', align: 'top',
                        // Only show labels for Actual datasets
                        formatter: (val, ctx) => (!ctx.dataset.label.startsWith('Target') && val > 0) ? val : '',
                        font: { weight: 'bold', size: 10 },
                        color: '#475569',
                        offset: -2
                    },
                    tooltip: {
                        mode: 'index', intersect: false, // Show all data for the month on hover
                        callbacks: {
                            label: (context) => {
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                if (context.parsed.y !== null) label += context.parsed.y;
                                return label;
                            }
                        }
                    }
                }
            },
            plugins: [ChartDataLabels]
        });
        // --- [MODIFIED SECTION ENDS] ---

        const ctxP = document.getElementById('yearlyPieChart').getContext('2d');
        if (yearlyPieChartInstance) yearlyPieChartInstance.destroy();
        let m=0, l=0, e=0; data.forEach(d=>{ m+=d.med; l+=d.lab; e+=d.ehs; });
        
        yearlyPieChartInstance = new Chart(ctxP, {
            type: 'doughnut',
            data: {
                labels: ['MED', 'LAB', 'EHS'],
                datasets: [{ data: [m,l,e], backgroundColor: ['#004aad', '#19a7ce', '#0fc1a1'], borderWidth: 0 }]
            },
            options: { 
                cutout: '75%', responsive: true, maintainAspectRatio: false, 
                plugins: { 
                    legend: { position: 'bottom' },
                    datalabels: { formatter: (v) => v > 0 ? v : '', color: '#fff', font: { weight: 'bold' } }
                } 
            },
            plugins: [ChartDataLabels]
        });
    }

    function renderYearlyTable(data) {
        const tbody = document.getElementById('yearly-table-body');
        const sorted = [...data].sort((a,b) => a.month - b.month);
        tbody.innerHTML = sorted.map(d => `
            <tr onclick="goToCalendarMonth(${d.month}, ${d.year})" class="hover:bg-gray-50 transition-colors cursor-pointer">
                <td class="text-center font-bold text-gray-400">${d.year}</td>
                <td class="text-center font-bold text-gray-700">${d.monthName}</td>
                <td class="text-right font-mono text-[#003DA5] font-bold">${d.med}</td>
                <td class="text-right font-mono text-[#19a7ce] font-bold">${d.lab}</td>
                <td class="text-right font-mono text-[#0fc1a1] font-bold">${d.ehs}</td>
                <td class="text-right font-mono text-slate-800 font-black bg-gray-50/30">${d.med + d.lab + d.ehs}</td>
                <td class="text-center">
                    <span class="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold uppercase tracking-wider">Details</span>
                </td>
            </tr>
        `).join('');
    }

    function goToCalendarMonth(month, year) {
        if(typeof switchTab === 'function') switchTab('calendar');
        const mF = document.getElementById('cal-filter-month');
        const yF = document.getElementById('cal-filter-year');
        if(mF && yF) {
            mF.value = (month - 1);
            yF.value = year;
            if(typeof jumpToDateFromFilter === 'function') jumpToDateFromFilter();
        }
    }

    async function syncCalendarToSheet() {
        Swal.fire({
            title: 'Synchronizing full calendar…',
            html: '<div style="font-size:12px;color:#64748b">Fetching MED, LAB, EHS, ENV, TES and MGT Calendar events for 2025–2026, then replacing Calendar_Summary.<br>Please keep this page open.</div>',
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => Swal.showLoading()
        });
        try {
            if (!window.CES_API || typeof window.CES_API.callFunction !== 'function') throw new Error('CES API bridge is not ready.');
            const result = await window.CES_API.callFunction('forceFullSyncCalendar2025_2026', [], { transport:'iframe', timeoutMs:360000, dedupe:false, priority:'active', userAction:true, module:'calendar', loadingLabel:'Full Sync Calendar 2025–2026…' });
            Swal.close();
            await Swal.fire({
                icon: 'success',
                title: 'Calendar synchronized',
                text: typeof result === 'string' ? result : 'Calendar_Summary and Job_Stats were rebuilt successfully.',
                confirmButtonColor: '#003DA5'
            });
            if (typeof loadAllData === 'function') loadAllData();
            else if (typeof loadYearlyDashboard === 'function') loadYearlyDashboard();
        } catch (error) {
            Swal.close();
            await Swal.fire({
                icon: 'error',
                title: 'Calendar Sync Error',
                text: error && error.message ? error.message : String(error),
                confirmButtonColor: '#003DA5'
            });
        }
    }

    function animateValue(id, start, end, duration) {
        // v7: Job Dashboard KPI cards must show the final value immediately.
        // The old count-up animation made the first-open state look unfinished.
        const obj = document.getElementById(id);
        if (!obj) return;
        const n = Number(end || 0);
        obj.innerHTML = Number.isFinite(n) ? n.toLocaleString() : String(end || '0');
    }

    function exportYearlyData() {
        if (!cachedYearlyStats.length) return Swal.fire('No Data', '', 'warning');
        const ws = XLSX.utils.json_to_sheet(cachedYearlyStats);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Yearly_KPI");
        const d = new Date();
        const dd = String(d.getDate()).padStart(2,'0');
        const mm = String(d.getMonth()+1).padStart(2,'0');
        const yyyy = d.getFullYear();
        XLSX.writeFile(wb, `CES_Yearly_Job_Data_${dd}_${mm}__${yyyy}.xlsx`);
    }

// ============================================================
// Job Dashboard robust patch for GitHub migration
// - Normalizes numeric/string years
// - Always renders 12 months for the selected year
// - Prevents blank dashboard when Job_Stats was not prebuilt
// ============================================================
(function () {
  'use strict';
  const MONTH_FULL = ['', 'January','February','March','April','May','June','July','August','September','October','November','December'];

  function yNum(v) {
    const n = Number(String(v == null ? '' : v).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }

  function normalizeStats(rows) {
    return (Array.isArray(rows) ? rows : []).map(r => ({
      year: yNum(r.year),
      month: yNum(r.month),
      monthName: r.monthName || MONTH_FULL[yNum(r.month)] || '',
      med: yNum(r.med),
      lab: yNum(r.lab),
      ehs: yNum(r.ehs),
      total: yNum(r.total || (yNum(r.med) + yNum(r.lab) + yNum(r.ehs)))
    })).filter(r => r.year && r.month >= 1 && r.month <= 12);
  }

  function completeYearRows(rows, year) {
    const map = {};
    normalizeStats(rows).filter(r => r.year === year).forEach(r => { map[r.month] = r; });
    const out = [];
    for (let m = 1; m <= 12; m++) {
      const r = map[m] || { year: year, month: m, monthName: MONTH_FULL[m], med: 0, lab: 0, ehs: 0, total: 0 };
      r.total = yNum(r.total || (r.med + r.lab + r.ehs));
      out.push(r);
    }
    return out;
  }

  window.renderYearlyStats = function (stats) {
    cachedYearlyStats = normalizeStats(stats || []);
    const cfgReady = (typeof globalConfig !== 'undefined' && globalConfig && Object.keys(globalConfig).length > 0);
    if (!cfgReady && window.google && google.script && google.script.run) {
      google.script.run.withSuccessHandler((cfg) => {
        if (cfg) window.globalConfig = cfg;
        initYearlyFilters(cachedYearlyStats);
        updateYearlyView();
      }).withFailureHandler(() => {
        initYearlyFilters(cachedYearlyStats);
        updateYearlyView();
      }).getSystemSettings();
    } else {
      initYearlyFilters(cachedYearlyStats);
      updateYearlyView();
    }
  };

  window.initYearlyFilters = function (stats) {
    const select = document.getElementById('yearly-filter-year');
    if (!select) return;
    const normalized = normalizeStats(stats || cachedYearlyStats || []);
    let years = Array.from(new Set(normalized.map(r => r.year))).filter(Boolean).sort((a, b) => b - a);
    const currentYear = new Date().getFullYear();
    if (!years.length) years = [currentYear];
    const previous = yNum(select.value);
    select.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
    if (previous && years.includes(previous)) select.value = String(previous);
    else if (years.includes(currentYear)) select.value = String(currentYear);
    else select.value = String(years[0]);
  };

  window.updateYearlyView = function () {
    const select = document.getElementById('yearly-filter-year');
    const selectedYear = yNum(select && select.value) || new Date().getFullYear();
    const data = completeYearRows(cachedYearlyStats || [], selectedYear);

    const gConfig = (typeof globalConfig !== 'undefined' && globalConfig) ? globalConfig : {};
    const capMED = yNum(gConfig.CAPACITY_MED || gConfig.MED || 12) || 12;
    const capLAB = yNum(gConfig.CAPACITY_LAB || gConfig.LAB || 3) || 3;
    const capEHS = yNum(gConfig.CAPACITY_EHS || gConfig.EHS || 3) || 3;

    let tgtMed = 0, tgtLab = 0, tgtEhs = 0;
    for (let m = 1; m <= 12; m++) {
      const wd = getYearlyWeekdays(m, selectedYear);
      tgtMed += wd * capMED;
      tgtLab += wd * capLAB;
      tgtEhs += wd * capEHS;
    }
    const tgtAll = tgtMed + tgtLab + tgtEhs;
    const tMed = data.reduce((a, d) => a + yNum(d.med), 0);
    const tLab = data.reduce((a, d) => a + yNum(d.lab), 0);
    const tEhs = data.reduce((a, d) => a + yNum(d.ehs), 0);
    const tAll = tMed + tLab + tEhs;

    animateValue('y-act-all', 0, tAll, 600);
    animateValue('y-act-med', 0, tMed, 600);
    animateValue('y-act-lab', 0, tLab, 600);
    animateValue('y-act-ehs', 0, tEhs, 600);

    const set = (id, value) => { const el = document.getElementById(id); if (el) el.innerText = Number(value || 0).toLocaleString(); };
    set('y-tgt-all', tgtAll); set('y-tgt-med', tgtMed); set('y-tgt-lab', tgtLab); set('y-tgt-ehs', tgtEhs);

    updateProgressBar('y-bar-all', 'y-cap-all', tgtAll > 0 ? Math.min(100, Math.round((tAll / tgtAll) * 100)) : 0);
    updateProgressBar('y-bar-med', 'y-cap-med', tgtMed > 0 ? Math.min(100, Math.round((tMed / tgtMed) * 100)) : 0);
    updateProgressBar('y-bar-lab', 'y-cap-lab', tgtLab > 0 ? Math.min(100, Math.round((tLab / tgtLab) * 100)) : 0);
    updateProgressBar('y-bar-ehs', 'y-cap-ehs', tgtEhs > 0 ? Math.min(100, Math.round((tEhs / tgtEhs) * 100)) : 0);

    renderYearlyCharts(data, { med: capMED, lab: capLAB, ehs: capEHS }, selectedYear);
    renderYearlyTable(data);
  };

  window.renderYearlyCharts = function (data, teamConfig, year) {
    const rows = completeYearRows(data || [], year);
    const labels = rows.map(d => String(d.monthName || MONTH_FULL[d.month]).substring(0, 3));
    const targets = rows.map(d => {
      const wd = getYearlyWeekdays(d.month, year);
      return { med: wd * teamConfig.med, lab: wd * teamConfig.lab, ehs: wd * teamConfig.ehs };
    });

    const canvasT = document.getElementById('yearlyTrendChart');
    if (canvasT && window.Chart) {
      const ctxT = canvasT.getContext('2d');
      if (yearlyTrendChartInstance) yearlyTrendChartInstance.destroy();
      const barWidthSettings = { barPercentage: 0.6, categoryPercentage: 0.9 };
      const targetColor = '#e2e8f0';
      yearlyTrendChartInstance = new Chart(ctxT, {
        type: 'bar',
        data: { labels, datasets: [
          { label: 'Target (MED)', data: targets.map(t=>t.med), backgroundColor: targetColor, order: 2, borderRadius: 4, datalabels: { display: false }, ...barWidthSettings },
          { label: 'Target (LAB)', data: targets.map(t=>t.lab), backgroundColor: targetColor, order: 2, borderRadius: 4, datalabels: { display: false }, ...barWidthSettings },
          { label: 'Target (EHS)', data: targets.map(t=>t.ehs), backgroundColor: targetColor, order: 2, borderRadius: 4, datalabels: { display: false }, ...barWidthSettings },
          { label: 'MED', data: rows.map(d=>d.med), backgroundColor: '#004aad', order: 1, borderRadius: 4, ...barWidthSettings },
          { label: 'LAB', data: rows.map(d=>d.lab), backgroundColor: '#19a7ce', order: 1, borderRadius: 4, ...barWidthSettings },
          { label: 'EHS', data: rows.map(d=>d.ehs), backgroundColor: '#0fc1a1', order: 1, borderRadius: 4, ...barWidthSettings }
        ] },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: false, grid: { display: false } }, y: { stacked: false, beginAtZero: true, grid: { color: '#f8fafc' } } }, plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 6, filter: item => !String(item.text || '').startsWith('Target') } }, datalabels: { anchor: 'end', align: 'top', formatter: (val, ctx) => (!String(ctx.dataset.label || '').startsWith('Target') && val > 0) ? val : '', font: { weight: 'bold', size: 10 }, color: '#475569', offset: -2 } } },
        plugins: window.ChartDataLabels ? [ChartDataLabels] : []
      });
    }

    const canvasP = document.getElementById('yearlyPieChart');
    if (canvasP && window.Chart) {
      const ctxP = canvasP.getContext('2d');
      if (yearlyPieChartInstance) yearlyPieChartInstance.destroy();
      const med = rows.reduce((a, d) => a + yNum(d.med), 0), lab = rows.reduce((a, d) => a + yNum(d.lab), 0), ehs = rows.reduce((a, d) => a + yNum(d.ehs), 0);
      yearlyPieChartInstance = new Chart(ctxP, { type: 'doughnut', data: { labels: ['MED','LAB','EHS'], datasets: [{ data: [med, lab, ehs], backgroundColor: ['#004aad','#19a7ce','#0fc1a1'], borderWidth: 0 }] }, options: { cutout: '75%', responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, datalabels: { formatter: v => v > 0 ? v : '', color: '#fff', font: { weight: 'bold' } } } }, plugins: window.ChartDataLabels ? [ChartDataLabels] : [] });
    }
  };

  window.renderYearlyTable = function (data) {
    const tbody = document.getElementById('yearly-table-body');
    if (!tbody) return;
    const rows = (Array.isArray(data) ? data : []).sort((a,b) => yNum(a.month) - yNum(b.month));
    tbody.innerHTML = rows.map(d => `
      <tr onclick="goToCalendarMonth(${yNum(d.month)}, ${yNum(d.year)})" class="hover:bg-gray-50 transition-colors cursor-pointer">
        <td class="text-center font-bold text-gray-400">${yNum(d.year)}</td>
        <td class="text-center font-bold text-gray-700">${d.monthName || MONTH_FULL[yNum(d.month)]}</td>
        <td class="text-right font-mono text-[#003DA5] font-bold">${yNum(d.med)}</td>
        <td class="text-right font-mono text-[#19a7ce] font-bold">${yNum(d.lab)}</td>
        <td class="text-right font-mono text-[#0fc1a1] font-bold">${yNum(d.ehs)}</td>
        <td class="text-right font-mono text-slate-800 font-black bg-gray-50/30">${yNum(d.med) + yNum(d.lab) + yNum(d.ehs)}</td>
        <td class="text-center"><span class="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold uppercase tracking-wider">Details</span></td>
      </tr>`).join('');
  };
})();

/* ============================================================
   CES Hub v19 — Job Dashboard Target/Actual Overlay Chart Fix
   - Draws each service target as a grey background bar exactly behind its actual bar.
   - Keeps only MED/LAB/EHS datasets in Chart.js to prevent 6 separated bars.
   - Tooltip shows Actual / Target per service.
============================================================ */
(function () {
  'use strict';
  const MONTH_FULL_V19 = ['', 'January','February','March','April','May','June','July','August','September','October','November','December'];
  const TEAM_COLORS_V19 = { MED: '#004aad', LAB: '#19a7ce', EHS: '#0fc1a1' };
  const TARGET_COLOR_V19 = '#e2e8f0';

  function yearlyNumV31_(v) {
    const n = Number(String(v == null ? '' : v).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }

  function yearlyWeekdaysV31_(month, year) {
    if (typeof getYearlyWeekdays === 'function') return getYearlyWeekdays(month, year);
    let count = 0;
    const days = new Date(year, month, 0).getDate();
    for (let d = 1; d <= days; d++) {
      const dow = new Date(year, month - 1, d).getDay();
      if (dow !== 0 && dow !== 6) count++;
    }
    return count;
  }

  function yearlyCompleteRowsV31_(data, year) {
    const map = {};
    (Array.isArray(data) ? data : []).forEach(r => {
      const m = yearlyNumV31_(r.month);
      if (m >= 1 && m <= 12) {
        map[m] = {
          year: yearlyNumV31_(r.year) || year,
          month: m,
          monthName: r.monthName || MONTH_FULL_V19[m],
          med: yearlyNumV31_(r.med),
          lab: yearlyNumV31_(r.lab),
          ehs: yearlyNumV31_(r.ehs)
        };
      }
    });
    const out = [];
    for (let m = 1; m <= 12; m++) {
      out.push(map[m] || { year, month: m, monthName: MONTH_FULL_V19[m], med: 0, lab: 0, ehs: 0 });
    }
    return out;
  }

  const targetOverlayPluginV19 = {
    id: 'cesJobTargetOverlayV19',
    beforeDatasetsDraw(chart, args, opts) {
      const targetsByTeam = (opts && opts.targets) || {};
      const ctx = chart.ctx;
      const yScale = chart.scales && chart.scales.y;
      if (!ctx || !yScale) return;

      ctx.save();
      ctx.fillStyle = (opts && opts.color) || TARGET_COLOR_V19;
      ctx.globalAlpha = 1;

      chart.data.datasets.forEach((dataset, datasetIndex) => {
        const team = String(dataset.label || '').toLowerCase();
        const targets = targetsByTeam[team];
        if (!targets) return;
        const meta = chart.getDatasetMeta(datasetIndex);
        if (!meta || !meta.data) return;

        meta.data.forEach((bar, index) => {
          const targetValue = yearlyNumV31_(targets[index]);
          if (targetValue <= 0 || !bar) return;
          const props = bar.getProps(['x', 'width'], true);
          const baseY = yScale.getPixelForValue(0);
          const targetY = yScale.getPixelForValue(targetValue);
          const h = Math.max(1, Math.abs(baseY - targetY));
          const w = Math.max((props.width || 8) * 1.65, (props.width || 8) + 5);
          const x = props.x - (w / 2);
          const y = Math.min(baseY, targetY);
          const r = Math.min(5, w / 2, h / 2);

          // rounded rect, compatible with older browsers
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.lineTo(x + w - r, y);
          ctx.quadraticCurveTo(x + w, y, x + w, y + r);
          ctx.lineTo(x + w, y + h - r);
          ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
          ctx.lineTo(x + r, y + h);
          ctx.quadraticCurveTo(x, y + h, x, y + h - r);
          ctx.lineTo(x, y + r);
          ctx.quadraticCurveTo(x, y, x + r, y);
          ctx.closePath();
          ctx.fill();
        });
      });
      ctx.restore();
    }
  };

  window.renderYearlyCharts = function (data, teamConfig, year) {
    const selectedYear = yearlyNumV31_(year) || new Date().getFullYear();
    const rows = yearlyCompleteRowsV31_(data || [], selectedYear);
    const labels = rows.map(d => String(d.monthName || MONTH_FULL_V19[d.month]).substring(0, 3));
    const cfg = teamConfig || {};
    const cap = {
      med: yearlyNumV31_(cfg.med || 12) || 12,
      lab: yearlyNumV31_(cfg.lab || 3) || 3,
      ehs: yearlyNumV31_(cfg.ehs || 3) || 3
    };
    const targets = {
      med: rows.map(d => yearlyWeekdaysV31_(d.month, selectedYear) * cap.med),
      lab: rows.map(d => yearlyWeekdaysV31_(d.month, selectedYear) * cap.lab),
      ehs: rows.map(d => yearlyWeekdaysV31_(d.month, selectedYear) * cap.ehs)
    };

    const canvasT = document.getElementById('yearlyTrendChart');
    if (canvasT && window.Chart) {
      const ctxT = canvasT.getContext('2d');
      if (yearlyTrendChartInstance) yearlyTrendChartInstance.destroy();
      yearlyTrendChartInstance = new Chart(ctxT, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: 'MED', data: rows.map(d => yearlyNumV31_(d.med)), backgroundColor: TEAM_COLORS_V19.MED, borderRadius: 5, barPercentage: 0.48, categoryPercentage: 0.72 },
            { label: 'LAB', data: rows.map(d => yearlyNumV31_(d.lab)), backgroundColor: TEAM_COLORS_V19.LAB, borderRadius: 5, barPercentage: 0.48, categoryPercentage: 0.72 },
            { label: 'EHS', data: rows.map(d => yearlyNumV31_(d.ehs)), backgroundColor: TEAM_COLORS_V19.EHS, borderRadius: 5, barPercentage: 0.48, categoryPercentage: 0.72 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 350 },
          scales: {
            x: { stacked: false, grid: { display: false } },
            y: { stacked: false, beginAtZero: true, grid: { color: '#f1f5f9' } }
          },
          plugins: {
            cesJobTargetOverlayV19: { targets, color: TARGET_COLOR_V19 },
            legend: {
              position: 'bottom',
              labels: { usePointStyle: true, boxWidth: 7 }
            },
            datalabels: {
              anchor: 'end',
              align: 'top',
              formatter: (val) => val > 0 ? val : '',
              font: { weight: 'bold', size: 10 },
              color: '#475569',
              offset: -2,
              clip: false
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              callbacks: {
                label: function (ctx) {
                  const team = String(ctx.dataset.label || '').toLowerCase();
                  const actual = yearlyNumV31_(ctx.parsed && ctx.parsed.y);
                  const target = yearlyNumV31_(targets[team] && targets[team][ctx.dataIndex]);
                  return `${String(ctx.dataset.label || '').toUpperCase()}: ${actual.toLocaleString()} / Target ${target.toLocaleString()}`;
                }
              }
            }
          }
        },
        plugins: [targetOverlayPluginV19].concat(window.ChartDataLabels ? [ChartDataLabels] : [])
      });
    }

    const canvasP = document.getElementById('yearlyPieChart');
    if (canvasP && window.Chart) {
      const ctxP = canvasP.getContext('2d');
      if (yearlyPieChartInstance) yearlyPieChartInstance.destroy();
      const med = rows.reduce((a, d) => a + yearlyNumV31_(d.med), 0);
      const lab = rows.reduce((a, d) => a + yearlyNumV31_(d.lab), 0);
      const ehs = rows.reduce((a, d) => a + yearlyNumV31_(d.ehs), 0);
      yearlyPieChartInstance = new Chart(ctxP, {
        type: 'doughnut',
        data: {
          labels: ['MED', 'LAB', 'EHS'],
          datasets: [{ data: [med, lab, ehs], backgroundColor: [TEAM_COLORS_V19.MED, TEAM_COLORS_V19.LAB, TEAM_COLORS_V19.EHS], borderWidth: 0 }]
        },
        options: {
          cutout: '75%',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' },
            datalabels: { formatter: v => v > 0 ? v : '', color: '#fff', font: { weight: 'bold' } }
          }
        },
        plugins: window.ChartDataLabels ? [ChartDataLabels] : []
      });
    }
  };
})();

/* ========================================================================== 
 * CES Hub V40 — Job Dashboard five-team final renderer
 * MED | LAB | EHS | ENV | TES. MGT intentionally remains calendar-only.
 * ========================================================================== */
(function(){
  const TEAM_ORDER_V40 = ['MED','LAB','EHS','ENV','TES'];
  const TEAM_META_V40 = {
    MED:{key:'med'}, LAB:{key:'lab'}, EHS:{key:'ehs'}, ENV:{key:'env'}, TES:{key:'tes'}
  };
  function color40(team){ return typeof window.cesGetTeamColor==='function' ? window.cesGetTeamColor(team) : ({MED:'#004aad',LAB:'#19a7ce',EHS:'#0fc1a1',ENV:'#7ed957',TES:'#ffde59'})[team]; }
  function n40(v){ const x=Number(v); return Number.isFinite(x)?x:0; }
  function normalize40(rows){
    return (Array.isArray(rows)?rows:[]).map(r=>{
      const med=n40(r.med),lab=n40(r.lab),ehs=n40(r.ehs),env=n40(r.env),tes=n40(r.tes);
      return {year:n40(r.year)||r.year,month:n40(r.month),monthName:r.monthName||'',med,lab,ehs,env,tes,total:med+lab+ehs+env+tes};
    });
  }
  function fullYear40(rows, year){
    const map={}; rows.filter(r=>Number(r.year)===Number(year)).forEach(r=>{map[Number(r.month)]=r;});
    const names=['','January','February','March','April','May','June','July','August','September','October','November','December'];
    return Array.from({length:12},(_,i)=>map[i+1]||{year:Number(year),month:i+1,monthName:names[i+1],med:0,lab:0,ehs:0,env:0,tes:0,total:0});
  }
  function capacities40(){
    const c=(typeof globalConfig!=='undefined'&&globalConfig)||{};
    return {
      MED:n40(c.CAPACITY_MED||12)||12,
      LAB:n40(c.CAPACITY_LAB||3)||3,
      EHS:n40(c.CAPACITY_EHS||3)||3,
      ENV:n40(c.CAPACITY_ENV||3)||3,
      TES:n40(c.CAPACITY_TES||4)||4
    };
  }
  function setText40(id,value){ const el=document.getElementById(id); if(el) el.textContent=Number(value||0).toLocaleString(); }
  function setKpi40(team,actual,target){
    const id=team.toLowerCase();
    if(typeof animateValue==='function') animateValue('y-act-'+id,0,actual,500); else setText40('y-act-'+id,actual);
    setText40('y-tgt-'+id,target);
    const pct=target>0?Math.round(actual/target*100):0;
    if(typeof updateProgressBar==='function') updateProgressBar('y-bar-'+id,'y-cap-'+id,Math.min(100,pct));
    const pctEl=document.getElementById('y-cap-'+id); if(pctEl) pctEl.textContent=pct+'%';
  }
  function openYearlyMonthV40_(year,month){
    const y = Number(year), m = Number(month);
    if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return;
    if (typeof switchTab === 'function') switchTab('calendar');
    else if (typeof showView === 'function') showView('calendar');
    if (typeof currentDisplayDate !== 'undefined') currentDisplayDate = new Date(y, m - 1, 1);
    const applyCalendarPeriod = function(){
      const monthSelect = document.getElementById('cal-filter-month');
      const yearSelect = document.getElementById('cal-filter-year');
      if (monthSelect) monthSelect.value = String(m - 1);
      if (yearSelect) yearSelect.value = String(y);
      if (typeof jumpToDateFromFilter === 'function' && monthSelect && yearSelect) jumpToDateFromFilter();
      else if (typeof updateCalendarUI === 'function') updateCalendarUI();
    };
    requestAnimationFrame(function(){ requestAnimationFrame(applyCalendarPeriod); });
  }
  window.openYearlyMonthV40_=openYearlyMonthV40_;

  const targetOverlayV40={
    id:'yearlyTargetOverlayV40',
    beforeDatasetsDraw(chart,args,opts){
      const {ctx,scales}=chart; if(!scales||!scales.y) return;
      chart.data.datasets.forEach((ds,di)=>{
        if(!Array.isArray(ds.targetData)) return;
        const meta=chart.getDatasetMeta(di); if(meta.hidden) return;
        meta.data.forEach((bar,i)=>{
          const target=n40(ds.targetData[i]); if(target<=0||!bar) return;
          const y=scales.y.getPixelForValue(target); const base=scales.y.getPixelForValue(0);
          const width=Math.max(4,(bar.width||12)+4);
          ctx.save(); ctx.fillStyle='rgba(203,213,225,.45)';
          ctx.fillRect(bar.x-width/2,y,width,Math.max(0,base-y)); ctx.restore();
        });
      });
    }
  };

  renderYearlyStats=function(stats){
    cachedYearlyStats=normalize40(stats);
    const start=()=>{ initYearlyFilters(cachedYearlyStats); updateYearlyView(); };
    if(typeof globalConfig==='undefined'||!globalConfig||!Object.keys(globalConfig).length){
      if(window.CES_API&&CES_API.callFunction){ CES_API.callFunction('getSystemSettings',[],{timeoutMs:60000}).then(cfg=>{window.globalConfig=cfg||{};start();}).catch(start); }
      else if(window.google&&google.script&&google.script.run) google.script.run.withSuccessHandler(cfg=>{window.globalConfig=cfg||{};start();}).withFailureHandler(start).getSystemSettings();
      else start();
    } else start();
  };
  initYearlyFilters=function(stats){
    const select=document.getElementById('yearly-filter-year'); if(!select) return;
    const years=[...new Set(normalize40(stats).map(x=>Number(x.year)).filter(Boolean))].sort((a,b)=>b-a);
    const old=Number(select.value), now=new Date().getFullYear();
    select.innerHTML=years.map(y=>`<option value="${y}">${y}</option>`).join('');
    select.value=years.includes(old)?old:(years.includes(now)?now:(years[0]||now));
  };
  updateYearlyView=function(){
    const select=document.getElementById('yearly-filter-year'); if(!select) return;
    const year=Number(select.value)||new Date().getFullYear();
    const rows=fullYear40(normalize40(cachedYearlyStats),year), caps=capacities40();
    const actual={MED:0,LAB:0,EHS:0,ENV:0,TES:0}, target={MED:0,LAB:0,EHS:0,ENV:0,TES:0};
    rows.forEach(r=>TEAM_ORDER_V40.forEach(t=>{actual[t]+=n40(r[TEAM_META_V40[t].key]);}));
    for(let m=1;m<=12;m++){ const wd=getYearlyWeekdays(m,year); TEAM_ORDER_V40.forEach(t=>target[t]+=wd*caps[t]); }
    TEAM_ORDER_V40.forEach(t=>{setKpi40(t,actual[t],target[t]); const color=color40(t),id=t.toLowerCase(); ['y-cap-'+id,'y-bar-'+id].forEach(x=>{const el=document.getElementById(x);if(el){el.style.color=color;if(el.id.indexOf('y-bar-')===0)el.style.background=color;}});});
    const actualAll=TEAM_ORDER_V40.reduce((s,t)=>s+actual[t],0), targetAll=TEAM_ORDER_V40.reduce((s,t)=>s+target[t],0);
    if(typeof animateValue==='function') animateValue('y-act-all',0,actualAll,500); else setText40('y-act-all',actualAll);
    setText40('y-tgt-all',targetAll);
    const allPct=targetAll?Math.round(actualAll/targetAll*100):0;
    if(typeof updateProgressBar==='function') updateProgressBar('y-bar-all','y-cap-all',Math.min(100,allPct));
    const allPctEl=document.getElementById('y-cap-all'); if(allPctEl) allPctEl.textContent=allPct+'%';
    renderYearlyCharts(rows,caps,year); renderYearlyTable(rows);
  };
  renderYearlyCharts=function(rows,caps,year){
    const labels=rows.map(r=>(r.monthName||'').slice(0,3));
    const datasets=TEAM_ORDER_V40.map(t=>{
      const def=TEAM_META_V40[t];
      return {label:t,data:rows.map(r=>n40(r[def.key])),targetData:rows.map(r=>getYearlyWeekdays(r.month,year)*caps[t]),backgroundColor:color40(t),borderRadius:5,barPercentage:.58,categoryPercentage:.8};
    });
    const trend=document.getElementById('yearlyTrendChart');
    if(trend){
      if(yearlyTrendChartInstance) yearlyTrendChartInstance.destroy();
      yearlyTrendChartInstance=new Chart(trend.getContext('2d'),{type:'bar',data:{labels,datasets},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},scales:{x:{grid:{display:false}},y:{beginAtZero:true,grid:{color:'#f1f5f9'}}},plugins:{legend:{position:'bottom',labels:{usePointStyle:true,boxWidth:7}},tooltip:{callbacks:{afterLabel(ctx){return 'Target: '+Number(ctx.dataset.targetData?.[ctx.dataIndex]||0).toLocaleString();}},},datalabels:{anchor:'end',align:'top',formatter:v=>v>0?v:'',color:'#475569',font:{weight:'bold',size:9}}}},plugins:[targetOverlayV40].concat(window.ChartDataLabels?[ChartDataLabels]:[])});
    }
    const totals=TEAM_ORDER_V40.map(t=>rows.reduce((s,r)=>s+n40(r[TEAM_META_V40[t].key]),0));
    const pie=document.getElementById('yearlyPieChart');
    if(pie){
      if(yearlyPieChartInstance) yearlyPieChartInstance.destroy();
      yearlyPieChartInstance=new Chart(pie.getContext('2d'),{type:'doughnut',data:{labels:TEAM_ORDER_V40,datasets:[{data:totals,backgroundColor:TEAM_ORDER_V40.map(t=>color40(t)),borderWidth:0}]},options:{cutout:'72%',responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{usePointStyle:true,boxWidth:7}},datalabels:{formatter:v=>v>0?v:'',color:ctx=>typeof window.cesReadableTextColor==='function'?window.cesReadableTextColor(ctx.dataset.backgroundColor[ctx.dataIndex]):'#fff',font:{weight:'bold'}}}},plugins:window.ChartDataLabels?[ChartDataLabels]:[]});
    }
  };
  renderYearlyTable=function(rows){
    const body=document.getElementById('yearly-table-body'); if(!body) return;
    body.innerHTML=rows.map(r=>`<tr class="ces-yearly-month-row cursor-pointer" role="button" tabindex="0" title="Open ${r.monthName} ${r.year} in Master Calendar" onclick="openYearlyMonthV40_(${Number(r.year)},${Number(r.month)})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openYearlyMonthV40_(${Number(r.year)},${Number(r.month)})}"><td class="text-center font-bold">${r.year}</td><td class="text-center font-bold text-[#003DA5]">${r.monthName}</td><td class="text-right">${n40(r.med).toLocaleString()}</td><td class="text-right">${n40(r.lab).toLocaleString()}</td><td class="text-right">${n40(r.ehs).toLocaleString()}</td><td class="text-right">${n40(r.env).toLocaleString()}</td><td class="text-right">${n40(r.tes).toLocaleString()}</td><td class="text-right font-black">${n40(r.total).toLocaleString()}</td><td class="text-center"><button type="button" class="w-8 h-8 rounded-lg bg-blue-50 text-[#003DA5] hover:bg-[#003DA5] hover:text-white" onclick="event.stopPropagation();openYearlyMonthV40_(${Number(r.year)},${Number(r.month)})" aria-label="Open ${r.monthName} ${r.year} in Master Calendar"><i class="fas fa-calendar-alt"></i></button></td></tr>`).join('');
  };
  window.CES_YEARLY_UI_V41_RECHECK=function(){return{version:'V41',teams:TEAM_ORDER_V40.slice(),mgtVisible:false};};
})();

window.CES_YEARLY_UI_V41_RECHECK = window.CES_YEARLY_UI_V41_RECHECK || function(){return{version:'V41',teams:['MED','LAB','EHS','ENV','TES'],colors:['MED','LAB','EHS','ENV','TES'].reduce((o,t)=>(o[t]=cesGetTeamColor(t),o),{})};};
