// ============================================================
// 20-service-csi.js
// Extracted from original index.html. Keep load order from index.html.
// ============================================================

let serviceRawData = [];
let serviceFilteredData = [];
let customerRawData = []; 
let custSortCol = null; 
let custSortAsc = false;

// เริ่มต้นหน้าเว็บที่ปี 2026
let sFilters = { team: 'All', year: '2026', month: 'All', customer: 'All', status: 'All' };
const S_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Target Config
const TEAM_TARGET_CONFIG = {
  'MED': 60,
  'LAB': 30,
  'EHS': 30,
  'TES': 30,
  'All': 150 
};

// Team Mapping
const S_TEAM_MAP = { 
  'Medical Equipment': 'MED', 
  'Lab & Testing': 'LAB', 
  'Environmental Health': 'EHS',
  'TES': 'TES',
  'Technical': 'TES',
  'Technical Engineering Service': 'TES'
};

// Colors
const COLORS = new Proxy({}, {
  get: function(_target, key) {
    const team = String(key || '').toUpperCase();
    if (typeof window.cesGetTeamColor === 'function') return window.cesGetTeamColor(team === 'OTHER' ? 'MED' : team);
    return ({MED:'#004aad',LAB:'#19a7ce',EHS:'#0fc1a1',ENV:'#7ed957',TES:'#ffde59',OTHER:'#64748b'})[team] || '#64748b';
  }
});

const YEARLY_COLORS = {
  'Grand Total': '#ffc000',
  'Commercial': '#E4002B',
  'Network': '#64748b',
};

let serviceCharts = {};

function initService(data) {
    serviceRawData = data || [];
    
    // [ADDED] ดึงข้อมูลรายชื่อลูกค้าจาก Google Apps Script ทันทีที่โหลด
    google.script.run.withSuccessHandler(custData => {
        customerRawData = custData || [];
        renderCustomerList(); 
    }).getCustomerListData();

    populateServiceDropdowns();
    populateCompareDropdowns(); 
    applyServiceFilters();
    // V55: restore the saved 2026 comparison from browser cache immediately.
    // The shared Sheet snapshot is read only once when this browser has no cache.
    if (typeof svcMapCacheLoad_ === 'function') svcMapCacheLoad_();
}

function refreshServiceFilters() {
    sFilters = { team: 'All', year: '2026', month: 'All', customer: 'All', status: 'All' };
    if(document.getElementById('s-filter-year')) document.getElementById('s-filter-year').value = '2026';
    if(document.getElementById('s-filter-month')) document.getElementById('s-filter-month').value = 'All';
    if(document.getElementById('s-filter-customer')) document.getElementById('s-filter-customer').value = 'All';
    if(document.getElementById('s-filter-status')) document.getElementById('s-filter-status').value = 'All';
    applyServiceFilters();
}

function applyServiceFilters() {
    serviceFilteredData = serviceRawData.filter(d => {
        const teamShort = S_TEAM_MAP[d.team] || d.team;
        return (sFilters.team === 'All' || teamShort === sFilters.team) &&
        (sFilters.year === 'All' || String(d.year) === String(sFilters.year)) &&
        (sFilters.month === 'All' || d.monthOnly === sFilters.month) &&
        (sFilters.customer === 'All' || d.customer === sFilters.customer) &&
        (sFilters.status === 'All' || (sFilters.status === 'Yes' ? String(d.finished).toLowerCase() === 'yes' : String(d.finished).toLowerCase() !== 'yes'))
    });

    ['All','MED','LAB','EHS','TES'].forEach(function(t) {
        const idMap = {All:'All', MED:'Med', LAB:'Lab', EHS:'Env', TES:'Tes'};
        const btn = document.getElementById('btn-team-' + idMap[t]);
        if (!btn) return;
        btn.className = 'ces-segmented-btn' + (sFilters.team === t ? ' active' : '');
        btn.style.cssText = '';
    });
    
    // [ADDED] สั่งอัปเดตตาราง Customer List เมื่อเปลี่ยน Filter
    renderCustomerList(); 
    updateServiceUI(serviceFilteredData);
}

// ============================================================== //
// [NEW] ระบบ Customer List & Sorting
// ============================================================== //
function sortCustomerList(col) {
    if (custSortCol === col) custSortAsc = !custSortAsc; 
    else { custSortCol = col; custSortAsc = false; }
    renderCustomerList(); 
}
function renderCustomerList() {
    const tbody = document.getElementById('customer-list-body');
    const badge = document.getElementById('customer-count-badge');
    if (!tbody) return;

    let filteredCustomers = customerRawData.filter(c => {
        const teamShort = S_TEAM_MAP[c.team] || c.team;
        return (sFilters.team === 'All' || teamShort === sFilters.team) &&
        (sFilters.year === 'All' || String(c.year) === String(sFilters.year)) &&
        (sFilters.month === 'All' || c.monthOnly === sFilters.month) &&
        (sFilters.customer === 'All' || c.customerType === sFilters.customer) &&
        (sFilters.status === 'All' || (sFilters.status === 'Yes' ? String(c.finished).toLowerCase() === 'yes' : String(c.finished).toLowerCase() !== 'yes'));
    });

    if (custSortCol) {
        filteredCustomers.sort((a, b) => {
            let valA = parseFloat(a[custSortCol]) || 0;
            let valB = parseFloat(b[custSortCol]) || 0;
            return custSortAsc ? (valA - valB) : (valB - valA);
        });
    }

    ['s1','s2','s3','s4','s5'].forEach(col => {
        let icon = document.getElementById('icon-sort-' + col);
        if(icon) {
            icon.className = (custSortCol === col) 
                ? (custSortAsc ? "fas fa-sort-up ml-1 text-indigo-500" : "fas fa-sort-down ml-1 text-indigo-500") 
                : "fas fa-sort ml-1 opacity-50 hover:opacity-100";
        }
    });

    let html = '';
    filteredCustomers.forEach(c => {
        const teamShort = S_TEAM_MAP[c.team] || c.team;
        const teamColor = COLORS[teamShort] || '#C8C9C7';
        const formatScore = (val) => { const num = parseFloat(val); return (!isNaN(num) && num > 0) ? num.toFixed(2) : '-'; };
        const getBg = (col) => custSortCol === col ? 'bg-indigo-50/50 text-indigo-700 font-bold' : 'text-gray-600';

        // --- การแก้ไขขั้นเด็ดขาด: ใช้ Flexbox ควบคุมกล่อง และใช้ Span + padding-top เพื่อชดเชย Baseline ของฟอนต์ไทย ---
        html += `
            <tr class="hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
                <td class="p-3 align-middle whitespace-nowrap">
                    <div style="background-color: ${teamColor}; color: white; border-radius: 4px; width: 45px; height: 24px; display: inline-flex; align-items: center; justify-content: center;">
                        <span style="font-size: 10px; font-weight: bold; line-height: 1; padding-top: 1.5px;">${teamShort}</span>
                    </div>
                </td>
                <td class="p-3 align-middle text-sm font-semibold text-gray-800 truncate max-w-[200px]" title="${c.customer}">${c.customer}</td>
                <td class="p-3 align-middle text-center text-xs ${getBg('s1')}">${formatScore(c.s1)}</td>
                <td class="p-3 align-middle text-center text-xs ${getBg('s2')}">${formatScore(c.s2)}</td>
                <td class="p-3 align-middle text-center text-xs ${getBg('s3')}">${formatScore(c.s3)}</td>
                <td class="p-3 align-middle text-center text-xs ${getBg('s4')}">${formatScore(c.s4)}</td>
                <td class="p-3 align-middle text-center text-xs ${getBg('s5')}">${formatScore(c.s5)}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html || '<tr><td colspan="7" class="p-10 text-center text-gray-400">No data available for selected filters</td></tr>';
    if(badge) badge.innerText = `${filteredCustomers.length} Items`;
}
// ============================================================== //

function updateServiceUI(data) {
    const total = data.length;
    const yes = data.filter(d => String(d.finished).toLowerCase() === 'yes').length;
    
    const notFinished = total - yes;
    const finishPct = total > 0 ? ((yes / total) * 100).toFixed(1) + '%' : '0%';
    const notFinishPct = total > 0 ? ((notFinished / total) * 100).toFixed(1) + '%' : '0%';

    let gSum=0, gCnt=0;
    data.forEach(d => { [d.s1, d.s2, d.s3, d.s4, d.s5].forEach(v => { if(v > 0) { gSum += v; gCnt++; } }); });
    const avg = gCnt > 0 ? (gSum / gCnt).toFixed(2) : "0.00";

    if(document.getElementById('s-total')) document.getElementById('s-total').innerText = total;
    if(document.getElementById('s-finish')) document.getElementById('s-finish').innerText = yes;
    if(document.getElementById('s-finish-pct')) document.getElementById('s-finish-pct').innerText = finishPct;
    if(document.getElementById('s-notfinish')) document.getElementById('s-notfinish').innerText = notFinished;
    if(document.getElementById('s-notfinish-pct')) document.getElementById('s-notfinish-pct').innerText = notFinishPct;
    if(document.getElementById('s-avg')) document.getElementById('s-avg').innerText = avg;
    if(document.getElementById('s-pct')) document.getElementById('s-pct').innerText = ((avg / 5) * 100).toFixed(1) + '%';

    const targetTeams = sFilters.team === 'All' ? ['MED', 'LAB', 'EHS', 'TES'] : [sFilters.team];
    const yearTarget = targetTeams.reduce((sum, t) => sum + ((TEAM_TARGET_CONFIG[t] || 0) * 12), 0);
    const achievedPct = yearTarget > 0 ? ((yes / yearTarget) * 100).toFixed(1) : 0;
    
    if(document.getElementById('s-achieved')) document.getElementById('s-achieved').innerText = achievedPct + '%';
    if(document.getElementById('s-target-desc')) document.getElementById('s-target-desc').innerText = `Target: ${yearTarget}/yr`;

    updateAnalysisSection();
    renderServiceCharts(data);
    renderSummaryPage();
    renderServiceComments(data);
}

function renderServiceCharts(data) {
    const activeTeams = (sFilters.team && sFilters.team !== 'All') ? [sFilters.team] : ['MED', 'LAB', 'EHS', 'TES'];
    const months = S_MONTHS;
    const countByTeamMonth = {};
    const targetByTeamMonth = {};

    activeTeams.forEach(t => {
        countByTeamMonth[t] = {};
        targetByTeamMonth[t] = {};
        months.forEach(m => {
            const count = data.filter(d => (S_TEAM_MAP[d.team] || d.team) === t && d.monthOnly === m).length;
            countByTeamMonth[t][m] = count;
            // Show target only where this team has records. This keeps TES from showing Jan-Dec bars
            // when TES_Service_Data only contains May/Jun data.
            targetByTeamMonth[t][m] = count > 0 ? (TEAM_TARGET_CONFIG[t] || 0) : 0;
        });
    });

    const ctxM = document.getElementById('monthlyChart');
    if(ctxM) {
        if(serviceCharts.monthly) serviceCharts.monthly.destroy();

        function drawRoundedBar(ctx, x, y, width, height, radius) {
            if (!height || height < 0) return;
            const r = Math.max(0, Math.min(radius || 4, width / 2, height / 2));
            if (typeof ctx.roundRect === 'function') {
                ctx.beginPath();
                ctx.roundRect(x, y, width, height, r);
                ctx.fill();
                return;
            }
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + width - r, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + r);
            ctx.lineTo(x + width, y + height);
            ctx.lineTo(x, y + height);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
            ctx.fill();
        }

        const targetBackBarPlugin = {
            id: 'cesServiceTargetBackBar',
            beforeDatasetsDraw(chart) {
                const yScale = chart.scales && chart.scales.y;
                if (!yScale) return;
                const ctx = chart.ctx;
                ctx.save();
                ctx.fillStyle = 'rgba(226, 232, 240, 0.95)';
                ctx.strokeStyle = 'rgba(203, 213, 225, 0.95)';
                ctx.lineWidth = 1;

                chart.data.datasets.forEach((dataset, datasetIndex) => {
                    const team = String(dataset.label || '').replace(/\s*Actual$/i, '');
                    if (!targetByTeamMonth[team]) return;
                    const meta = chart.getDatasetMeta(datasetIndex);
                    if (!meta || meta.hidden) return;
                    (meta.data || []).forEach((bar, index) => {
                        const month = chart.data.labels[index];
                        const target = Number(targetByTeamMonth[team][month] || 0);
                        if (!target) return;
                        const props = bar.getProps ? bar.getProps(['x', 'width'], true) : bar;
                        const base = yScale.getPixelForValue(0);
                        const top = yScale.getPixelForValue(target);
                        const height = Math.max(0, base - top);
                        const width = Math.max(10, (props.width || 12) * 1.65);
                        const x = (props.x || bar.x) - width / 2;
                        drawRoundedBar(ctx, x, top, width, height, 5);
                    });
                });
                ctx.restore();
            }
        };

        const actualDatasets = activeTeams.map(t => ({
            label: t,
            data: months.map(m => countByTeamMonth[t][m]),
            backgroundColor: COLORS[t],
            borderColor: COLORS[t],
            borderWidth: 0,
            borderRadius: 5,
            categoryPercentage: activeTeams.length === 1 ? 0.56 : 0.82,
            barPercentage: activeTeams.length === 1 ? 0.45 : 0.58,
            maxBarThickness: 32,
            datalabels: {
                display: true,
                anchor: 'end',
                align: 'top',
                offset: -2,
                font: { weight: 'bold', size: 9 },
                color: '#475569',
                formatter: (val) => val > 0 ? val : ''
            }
        }));

        const maxActual = Math.max(0, ...activeTeams.flatMap(t => months.map(m => Number(countByTeamMonth[t][m]) || 0)));
        const maxTarget = Math.max(0, ...activeTeams.flatMap(t => months.map(m => Number(targetByTeamMonth[t][m]) || 0)));
        const maxVal = Math.max(1, maxActual, maxTarget);

        serviceCharts.monthly = new Chart(ctxM, {
            type: 'bar',
            data: { labels: months, datasets: actualDatasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    x: { stacked: false, grid: { display: false }, ticks: { font: { family: 'Prompt', size: 10 } } },
                    y: {
                        stacked: false,
                        beginAtZero: true,
                        suggestedMax: Math.ceil(maxVal * 1.18),
                        grid: { color: '#f1f5f9', borderDash: [2, 2] },
                        ticks: { precision: 0, font: { family: 'Prompt', size: 10 } }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { usePointStyle: true, boxWidth: 8, font: { family: 'Prompt', size: 11 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: c => {
                                const team = c.dataset.label;
                                const month = c.label;
                                const actual = Number(c.raw || 0);
                                const target = Number((targetByTeamMonth[team] || {})[month] || 0);
                                return ` ${team}: ${actual}${target ? ' / Target ' + target : ''}`;
                            },
                            afterBody: items => {
                                if (!items || !items.length) return '';
                                return 'Grey bar = Monthly target';
                            }
                        }
                    }
                }
            },
            plugins: (typeof ChartDataLabels !== 'undefined') ? [targetBackBarPlugin, ChartDataLabels] : [targetBackBarPlugin]
        });
    }

    const ctxP = document.getElementById('teamPieChart');
    if(ctxP) {
        if(serviceCharts.pie) serviceCharts.pie.destroy();
        const pieTeams = activeTeams;
        serviceCharts.pie = new Chart(ctxP, {
            type: 'doughnut',
            data: {
                labels: pieTeams,
                datasets: [{
                    data: pieTeams.map(t => data.filter(d => (S_TEAM_MAP[d.team]||d.team) === t).length),
                    backgroundColor: pieTeams.map(t => COLORS[t]),
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '70%',
                plugins: {
                    legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8, font: {size: 11} } },
                    datalabels: {
                        color: '#fff', font: { weight: 'bold', size: 10 },
                        formatter: (v, ctx) => {
                            let sum = 0; ctx.chart.data.datasets[0].data.forEach(d => sum += d);
                            return sum > 0 && v > 0 ? ((v * 100) / sum).toFixed(0) + "%" : '';
                        }
                    }
                }
            },
            plugins: (typeof ChartDataLabels !== 'undefined') ? [ChartDataLabels] : []
        });
    }
}

function renderSummaryPage() {
    if(!serviceRawData.length) return;
    const t = sFilters.team;
    const sumData = serviceRawData.filter(d => {
        const teamShort = S_TEAM_MAP[d.team] || d.team;
        return (sFilters.team === 'All' || teamShort === sFilters.team) &&
               (sFilters.year === 'All' || String(d.year) === String(sFilters.year)) &&
               (sFilters.customer === 'All' || d.customer === sFilters.customer) &&
               (sFilters.status === 'All' || (sFilters.status === 'Yes' ? String(d.finished).toLowerCase() === 'yes' : String(d.finished).toLowerCase() !== 'yes'));
    });

    const configRows = (t === 'All') ?
        [{label:'Grand Total', color:YEARLY_COLORS['Grand Total'], filter:()=>true, type:'Total'}, {label:'Commercial', color:YEARLY_COLORS['Commercial'], filter:d=>d.customer==='Commercial', type:'Com'}, {label:'Network', color:YEARLY_COLORS['Network'], filter:d=>d.customer==='Network', type:'Net'}] :
        [{label:t, color:COLORS[t]||YEARLY_COLORS['Grand Total'], filter:d=>(S_TEAM_MAP[d.team]||d.team)===t, type:'Total'}, {label:'Commercial', color:YEARLY_COLORS['Commercial'], filter:d=>(S_TEAM_MAP[d.team]||d.team)===t && d.customer==='Commercial', type:'Com'}, {label:'Network', color:YEARLY_COLORS['Network'], filter:d=>(S_TEAM_MAP[d.team]||d.team)===t && d.customer==='Network', type:'Net'}];
        
    let matrix = {};
    configRows.forEach(r => {
        matrix[r.label] = S_MONTHS.map(m => {
            let subData = sumData.filter(d => d.monthOnly === m && r.filter(d));
            let s=0, c=0;
            subData.forEach(d => { [d.s1, d.s2, d.s3, d.s4, d.s5].forEach(v=>{if(v>0){s+=v;c++}}) });
            return c>0 ? (s/c) : 0;
        });
    });

    const tbody = document.getElementById('summaryTableBody');
    if(tbody) {
        let html = '';
        configRows.forEach(r => {
            let ySum=0, yCnt=0;
            const rowBgColor = r.type === 'Total' ? 'bg-gray-50/50' : (r.type === 'Com' ? 'bg-blue-50/30' : 'bg-blue-50/30');
            let scoreCells = matrix[r.label].map(v => {
                if(v > 0) { ySum+=v; yCnt++; return `<td class="p-2 text-center font-medium text-gray-500 text-xs border-r border-white">${v.toFixed(2)}</td>`; }
                return `<td class="p-2 text-center text-gray-200 border-r border-white">-</td>`;
            }).join('');
            const pctColorClass = r.type === 'Com' ? 'text-blue-400' : (r.type === 'Net' ? 'text-[#003DA5]' : 'text-gray-400');
            let pctCells = matrix[r.label].map(v => {
                if(v > 0) return `<td class="p-1 text-center font-semibold ${pctColorClass} text-[10px] opacity-80 border-r border-white">${(v/5*100).toFixed(0)}%</td>`;
                return `<td class="p-1 text-center text-gray-200 border-r border-white">-</td>`;
            }).join('');
            const yAvg = yCnt > 0 ? (ySum/yCnt) : 0;
            html += `<tr class="border-t border-white ${rowBgColor}"><td rowspan="2" class="p-3 font-bold border-r border-white text-sm" style="color:${r.color}">${r.label}</td>${scoreCells}<td class="p-2 text-center font-bold bg-gray-50 text-gray-700 text-xs">${yAvg > 0 ? yAvg.toFixed(2) : '-'}</td></tr><tr class="border-b border-gray-100 ${rowBgColor}">${pctCells}<td class="p-1 text-center font-bold ${pctColorClass} text-[10px] bg-gray-50/50">${yAvg > 0 ? (yAvg/5*100).toFixed(1)+'%' : '-'}</td></tr>`;
        });
        tbody.innerHTML = html;
    }

    const ctxSum = document.getElementById('summaryLineChart');
    if(ctxSum) {
        if(serviceCharts.summary) serviceCharts.summary.destroy();
        serviceCharts.summary = new Chart(ctxSum, {
            type: 'line',
            data: { 
                labels: S_MONTHS, 
                datasets: [
                    ...configRows.map(r => ({
                        label: r.label, 
                        data: matrix[r.label].map(v => v>0?(v/5)*100:null), 
                        borderColor: r.color, 
                        backgroundColor: r.color, 
                        borderWidth: 2.5, 
                        tension: 0.3, 
                        spanGaps: true, 
                        pointBackgroundColor: '#fff', 
                        pointRadius: 3
                    })),
                    {
                        label: 'Target 95%',
                        data: Array(12).fill(95),
                        borderColor: '#E4002B', 
                        borderWidth: 2,
                        borderDash: [5, 5], 
                        pointRadius: 0,
                        fill: false,
                        order: 0
                    }
                ] 
            },
            options: { 
                responsive:true, 
                maintainAspectRatio:false, 
                scales:{ 
                    y:{ 
                        min:60, max:105, 
                        ticks:{ stepSize: 10, callback: v => v <= 100 ? v+'%' : '', font:{size:10} }, 
                        grid:{color:'#f1f5f9'} 
                    }, 
                    x:{ grid:{display:false}, ticks:{font:{size:10}} } 
                }, 
                plugins: { 
                    legend:{ labels:{boxWidth:12, font:{size:11}} }, 
                    tooltip: { callbacks: { label: c => c.dataset.label + ': ' + (c.parsed.y ? c.parsed.y.toFixed(1) + '%' : '-') } },
                    datalabels: { display: false }
                } 
            }
        });
    }
}

function renderServiceComments(filteredData) {
    const boxes = {'MED': 'comm-med', 'LAB': 'comm-lab', 'EHS': 'comm-env', 'TES': 'comm-tes'};
    Object.values(boxes).forEach(id => { const el = document.getElementById(id); if(el) el.innerHTML = ''; });
    const dataToRender = filteredData || serviceFilteredData;
    dataToRender.forEach(d => {
        try {
            const team = S_TEAM_MAP[d.team] || d.team;
            const comms = JSON.parse(d.comments || "[]");
            if(comms.length && boxes[team]) {
                const styleClass = team === 'MED' ? 'border-l-blue-600' : (team === 'LAB' ? 'border-l-cyan-500' : (team === 'EHS' ? 'border-l-[#0fc1a1]' : 'border-l-[#ffc000]'));
                comms.forEach(c => {
                    const html = `
                    <div class="bg-white p-3 rounded-xl shadow-sm border border-gray-100 border-l-4 ${styleClass} mb-2 transition-all hover:shadow-md">
                        <div class="flex justify-between items-center mb-1">
                            <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">${d.monthOnly} • ${d.year}</span>
                            <span class="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">${c.topic}</span>
                        </div>
                        <p class="text-xs text-gray-700 italic leading-relaxed">"${c.text}"</p>
                        <div class="text-[10px] text-right text-gray-400 mt-2 border-t border-gray-50 pt-1 font-medium truncate">
                            <i class="fas fa-user-tag mr-1 opacity-50"></i>${c.customer}
                        </div>
                    </div>`;
                    document.getElementById(boxes[team]).innerHTML += html;
                });
            }
        } catch(e) { console.error('Comment Parse Error', e); }
    });
}

function populateServiceDropdowns() {
    const years = [...new Set(serviceRawData.map(d=>d.year))].filter(y=>y!=='Unknown' && y!==null).sort();
    
    const fill = (id, arr, hasAll=true) => {
        const el = document.getElementById(id);
        if(!el) return;
        el.innerHTML = (hasAll ? '<option value="All">All</option>' : '') + arr.map(x => `<option value="${x}">${x}</option>`).join('');
    };

    fill('s-filter-year', years);
    fill('s-filter-month', S_MONTHS);
    
    const yearEl = document.getElementById('s-filter-year');
    if (yearEl) yearEl.value = sFilters.year; 
}


async function saveServiceRowsStableForGithub(rows, meta, loadingText) {
    rows = Array.isArray(rows) ? rows : [];
    meta = meta || {};
    if (!rows.length) return { total: 0, main: 0, tes: 0, duplicate: 0 };
    if (window.CES_API && typeof window.CES_API.chunkedRows === 'function') {
        return await window.CES_API.chunkedRows('saveServiceDataArray', rows, meta, {
            maxUrlLength: 5600,
            timeoutMs: 120000,
            onProgress: function (current, total, rowsInChunk) {
                if (loadingText) loadingText.innerText = `Saving Service CSI data... chunk ${current}/${total} (${rowsInChunk} rows)`;
            }
        });
    }
    if (window.CES_API && typeof window.CES_API.callFunction === 'function') {
        return await window.CES_API.callFunction('saveServiceDataArray', [rows, meta], { transport: 'iframe', timeoutMs: 150000 });
    }
    return await new Promise((resolve, reject) => {
        google.script.run
            .withSuccessHandler(resolve)
            .withFailureHandler(reject)
            .saveServiceDataArray(rows, meta);
    });
}

function handleServiceUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    document.getElementById('loadingOverlay').classList.remove('hidden');
    document.getElementById('loadingText').innerText = "Processing Service File...";
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = firstSheet ? XLSX.utils.sheet_to_json(firstSheet, {defval: ""}) : [];
            if (!jsonData.length) throw new Error('ไม่พบข้อมูลในไฟล์ Excel');
            processServiceUpload(jsonData, { fileName: file.name || '' });
        } catch (err) {
            alert("Error: " + err.message);
            document.getElementById('loadingOverlay').classList.add('hidden');
        }
    };
    reader.readAsArrayBuffer(file);
}


window.setSFilter = (k, v) => { sFilters[k] = v; applyServiceFilters(); };

// ============================================================== //
// วางโค้ดส่วน Compare แบบใหม่ (รองรับ Default 2025 vs 2026)
// ============================================================== //
let manualCompareEnabled = false;

function populateCompareDropdowns() {
    let y1 = document.getElementById("compare-p1-year");
    let m1 = document.getElementById("compare-p1-month");
    let y2 = document.getElementById("compare-p2-year");
    let m2 = document.getElementById("compare-p2-month");
    if(!y1 || !m1 || !y2 || !m2) return;
    
    let years = [...new Set(serviceRawData.map(d=>d.year))].filter(y=>y!=='Unknown' && y!==null).sort();
    
    let yearHtml = '<option value="All">Year</option>';
    years.forEach(y => yearHtml += `<option value="${y}">${y}</option>`);
    
    let monthHtml = '<option value="All">Month</option>';
    S_MONTHS.forEach(m => monthHtml += `<option value="${m}">${m}</option>`);
    
    y1.innerHTML = yearHtml;
    y2.innerHTML = yearHtml;
    m1.innerHTML = monthHtml;
    m2.innerHTML = monthHtml;

    if(!manualCompareEnabled) {
        const currentMonth = S_MONTHS[new Date().getMonth()];
        y1.value = "2025";
        m1.value = currentMonth;
        y2.value = "2026";
        m2.value = currentMonth;
    }
}

function runCustomCompare() {
    manualCompareEnabled = true;
    updateAnalysisSection();
}

function updateAnalysisSection() {
    let p1Year = "All", p1Month = "All";
    let p2Year = "All", p2Month = "All";
    
    let y1 = document.getElementById("compare-p1-year");
    let m1 = document.getElementById("compare-p1-month");
    let y2 = document.getElementById("compare-p2-year");
    let m2 = document.getElementById("compare-p2-month");
    
    const currentMonthName = S_MONTHS[new Date().getMonth()];

    if(!manualCompareEnabled && sFilters.year === 'All') {
        p1Year = "2025"; p2Year = "2026"; p1Month = currentMonthName; p2Month = currentMonthName;
        if(y1) y1.value = p1Year; if(m1) m1.value = p1Month; if(y2) y2.value = p2Year; if(m2) m2.value = p2Month;
    } 
    else if (manualCompareEnabled) {
        p1Year = y1.value; p1Month = m1.value; p2Year = y2.value; p2Month = m2.value;
    }
    else {
        p2Year = String(sFilters.year); p2Month = sFilters.month;
        if (sFilters.year === 'All') {
            p1Year = "All"; p1Month = "All";
        } else {
            if (sFilters.month === 'All') {
                p1Year = String(parseInt(sFilters.year) - 1); p1Month = "All";
            } else {
                let mIdx = S_MONTHS.indexOf(sFilters.month);
                if(mIdx === 0) { p1Month = "Dec"; p1Year = String(parseInt(sFilters.year) - 1); }
                else { p1Month = S_MONTHS[mIdx - 1]; p1Year = sFilters.year; }
            }
        }
        if(y1 && p1Year !== 'All') y1.value = p1Year;
        if(m1 && p1Month !== 'All') m1.value = p1Month;
        if(y2 && p2Year !== 'All') y2.value = p2Year;
        if(m2 && p2Month !== 'All') m2.value = p2Month;
    }

    let lbl1 = (p1Year === "All" && p1Month === "All") ? "All Time" : `${p1Month === "All" ? "" : p1Month + " "}${p1Year}`;
    let lbl2 = (p2Year === "All" && p2Month === "All") ? "All Time" : `${p2Month === "All" ? "" : p2Month + " "}${p2Year}`;

    function filterByPeriod(year, month) {
        if(year === "All" && month === "All") return serviceRawData.filter(d => checkMainFilters(d));
        return serviceRawData.filter(d => {
            if(!checkMainFilters(d)) return false;
            if(year !== 'All' && String(d.year) !== year) return false;
            if(month !== 'All' && d.monthOnly !== month) return false;
            return true;
        });
    }

    function checkMainFilters(d) {
        const teamShort = S_TEAM_MAP[d.team] || d.team;
        if(sFilters.team !== 'All' && teamShort !== sFilters.team) return false;
        if(sFilters.customer !== 'All' && d.customer !== sFilters.customer) return false;
        if(sFilters.status !== 'All') {
           const isYes = String(d.finished).toLowerCase() === 'yes';
           if (sFilters.status === 'Yes' && !isYes) return false;
           if (sFilters.status === 'No' && isYes) return false;
        }
        return true;
    }

    let data1 = filterByPeriod(p1Year, p1Month);
    let data2 = filterByPeriod(p2Year, p2Month);

    function getScoreAvg(dataArr, field) {
        let sum = 0, count = 0;
        dataArr.forEach(d => { let v = parseFloat(d[field]); if(!isNaN(v) && v>0){sum+=v; count++;} });
        return count > 0 ? (sum / count) : 0;
    }

    let fields = ['s1', 's2', 's3', 's4', 's5'];
    let scores1 = fields.map(f => getScoreAvg(data1, f));
    let scores2 = fields.map(f => getScoreAvg(data2, f));
    
    let criteriaLabels = ["Service Staff", "Process", "Quality", "Product", "Overall Satisfy"];
    let shortLabels = ["Staff", "Process", "Quality", "Product", "Overall"];
    
    let tbodyHtml = "";
    for(let i = 0; i < 5; i++) {
        let c = scores2[i];
        let p = scores1[i];
        let diff = c - p;
        let colorClass = "text-gray-500 bg-gray-50";
        let diffText = "-";
        
        if(p !== 0 && c !== 0) {
            let pct = (diff / p) * 100; // สูตรคำนวณ % Growth
            diffText = (diff > 0 ? '+' : '') + diff.toFixed(2) + " (" + (pct > 0 ? '+' : '') + pct.toFixed(1) + "%)";
            if(diff > 0) colorClass = "text-[#003DA5] bg-blue-50";
            else if(diff < 0) colorClass = "text-[#E4002B] bg-red-50";
        }

        tbodyHtml += `
        <tr class="hover:bg-blue-50/20 transition-colors border-b border-gray-100 last:border-0">
            <td class="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">${criteriaLabels[i]}</td>
            <td class="px-4 py-3 text-right font-medium text-gray-500">${p===0 ? '-' : p.toFixed(2)}</td>
            <td class="px-4 py-3 text-right font-medium text-gray-800">${c===0 ? '-' : c.toFixed(2)}</td>
            <td class="px-4 py-3 text-right font-bold">
                <span class="px-2 py-1 rounded text-[10px] ${colorClass}">${diffText}</span>
            </td>
        </tr>`;
    }
    
    const tBodyEl = document.getElementById("growth-table-body");
    if(tBodyEl) tBodyEl.innerHTML = tbodyHtml;
    if(document.getElementById("th-prev-period")) document.getElementById("th-prev-period").innerText = lbl1;
    if(document.getElementById("th-curr-period")) document.getElementById("th-curr-period").innerText = lbl2;

    const canvas = document.getElementById('scoreAnalysisChart');
    if(!canvas) return;
    if(serviceCharts.analysis) serviceCharts.analysis.destroy();
    
    let allValidScores = [...scores1, ...scores2].filter(v => v > 0);
    let minScore = 0;
    if(allValidScores.length > 0) {
        minScore = Math.floor(Math.min(...allValidScores) * 10) / 10;
        minScore = Math.max(0, Math.min(3.5, minScore - 0.2)); 
    }

    serviceCharts.analysis = new Chart(canvas.getContext('2d'), {
        data: {
            labels: shortLabels,
            datasets: [
                {
                    type: 'line',
                    label: lbl2 + ' (Trend)',
                    data: scores2,
                    borderColor: '#E4002B',
                    backgroundColor: '#E4002B',
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: 4,
                    pointBackgroundColor: '#fff',
                    pointBorderWidth: 2,
                    datalabels: { display: false },
                    order: 0
                },
                {
                    type: 'bar',
                    label: lbl1, 
                    data: scores1,
                    backgroundColor: '#cbd5e1', 
                    borderRadius: 4,
                    barPercentage: 0.6,
                    categoryPercentage: 0.8,
                    order: 1
                },
                {
                    type: 'bar',
                    label: lbl2, 
                    data: scores2,
                    backgroundColor: ['#003da5', '#003DA5', '#004aad', '#5B7F95', '#C8C9C7'],
                    borderRadius: 4,
                    barPercentage: 0.6,
                    categoryPercentage: 0.8,
                    order: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    position: 'top',
                    labels: { 
                        boxWidth: 12, 
                        usePointStyle: true, 
                        font: {family: 'Prompt'},
                        generateLabels: function(chart) {
                            return [
                                { text: lbl1, fillStyle: '#cbd5e1', strokeStyle: '#cbd5e1' },
                                { text: lbl2, fillStyle: '#004aad', strokeStyle: '#004aad' },
                                { text: 'Trend', fillStyle: '#E4002B', strokeStyle: '#E4002B'}
                            ];
                        }
                    }
                },
                datalabels: {
                    anchor: 'end',
                    align: 'top',
                    formatter: val => val > 0 ? val.toFixed(2) : '', 
                    font: { size: 10, family: 'Prompt', weight: 'bold' },
                    color: '#475569'
                }
            },
            scales: {
                y: { 
                    min: minScore, 
                    max: 5.1, 
                    ticks: { 
                        font: {family: 'Prompt'},
                        stepSize: 0.2
                    },
                    grid: { color: '#f1f5f9' }
                },
                x: {
                    ticks: { font: {family: 'Prompt', size: 10} },
                    grid: { display: false }
                }
            }
        }
    });
}
/**
 * ฟังก์ชันสำหรับ Export ข้อมูล Service CSI ทั้งหมดเป็น Excel
 * ดึงข้อมูลจากตัวแปร serviceFilteredData ที่ผ่านการกรองแล้ว
 */
function exportServiceToExcel() {
    if (!serviceFilteredData || serviceFilteredData.length === 0) {
        Swal.fire('No Data', 'ไม่พบข้อมูลที่ต้องการส่งออก', 'warning');
        return;
    }

    // เตรียมข้อมูลสำหรับไฟล์ Excel
    const exportData = serviceFilteredData.map(row => ({
        'Timestamp': row.timestamp || '',
        'Month': row.monthOnly || '',
        'Year': row.year || '',
        'Finished': row.finished || '',
        'Team': row.team || '',
        'Customer Type': row.customer || '',
        'Customer Name': row.customerName || '',
        'S1 (Staff)': row.s1 || 0,
        'S2 (Process)': row.s2 || 0,
        'S3 (Quality)': row.s3 || 0,
        'S4 (Product)': row.s4 || 0,
        'S5 (Overall)': row.s5 || 0,
        'Comments': row.comment || ''
    }));

    // สร้าง Workbook
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Service_CSI_Data");

    // กำหนดชื่อไฟล์ตาม Filter ปัจจุบัน
    const fileName = `Service_CSI_${sFilters.team}_${sFilters.month}_${sFilters.year}.xlsx`;

    // ดาวน์โหลดไฟล์
    XLSX.writeFile(workbook, fileName);
}

// แก้ไขฟังก์ชัน applySFilters เดิมให้รองรับการเปลี่ยนสีปุ่มธีมเดียวกันทั้งหมด (ถ้ามี)
// หรือตรวจสอบว่า CSS/Class ของปุ่ม Team มีการเรียกใช้ธีมสีฟ้าอย่างถูกต้อง
function updateTeamButtonUI() {
    const map = {All:'All', Med:'MED', Lab:'LAB', Env:'EHS', Tes:'TES'};
    Object.keys(map).forEach(function(id) {
        const btn = document.getElementById('btn-team-' + id);
        if (!btn) return;
        btn.className = 'ces-segmented-btn' + (sFilters.team === map[id] ? ' active' : '');
        btn.style.cssText = '';
    });
}

async function exportServiceToPDF() {
    // --- 0. Guard: libraries must be loaded ---
    if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
        Swal.fire('Missing Library', 'html2canvas or jsPDF did not load. Check your CDN scripts.', 'error');
        return;
    }
    const { jsPDF } = window.jspdf;

    // --- 1. แสดง Loading ---
    Swal.fire({
        title: 'กำลังเตรียมหน้า Preview...',
        html: 'ระบบกำลังประมวลผลและจัดหน้ากระดาษ กรุณารอสักครู่...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    const target = document.getElementById('view-service');

    // --- 2. จัดการ CSS ชั่วคราวเพื่อ Capture ---
    const scrollWrappers = target.querySelectorAll('.pdf-expand');
    const originalStyles = [];
    scrollWrappers.forEach(el => {
        originalStyles.push({
            el,
            height:    el.style.height,
            maxHeight: el.style.maxHeight,
            overflow:  el.style.overflow
        });
        el.style.height    = 'auto';
        el.style.maxHeight = 'none';
        el.style.overflow  = 'visible';
    });

    // แก้ไข fixed-height ของ Card ที่ครอบอยู่
    const fixedCards = [
        target.querySelector('.h-\\[420px\\]'),  // customer list card
        ...target.querySelectorAll('.h-80')        // feedback panels & chart cards
    ].filter(Boolean);
    const cardOriginal = [];
    fixedCards.forEach(el => {
        cardOriginal.push({ el, height: el.style.height });
        el.style.height = 'auto';
    });

    target.classList.add('pdf-capture-mode');

    // ★ ส่วนสำคัญ: บังคับความกว้างให้คงที่ (1400px) เพื่อให้ Layout สมมาตร ไม่ขาด ไม่ล้น
    const originalWidth = target.style.width;
    target.style.width = '1400px';

    // รอให้ DOM จัดเรียงตัวให้เสร็จ
    await new Promise(r => setTimeout(r, 400));

    try {
        // --- 3. Capture หน้าจอ ---
        const canvas = await html2canvas(target, {
            scale:           1.5,          // ใช้ 1.5 เพื่อให้ภาพคมชัดแต่ไฟล์ไม่หนักเกินตอนโหลด Preview
            useCORS:         true,
            allowTaint:      true,
            backgroundColor: '#f8fafc',    
            logging:         false,
            windowWidth:     1400,         // ล็อคให้ตรงกับความกว้างที่เซ็ตไว้
            width:           1400,
            height:          target.scrollHeight,
            scrollX:         0,
            scrollY:         -window.scrollY
        });

        // --- 4. คืนค่า CSS ทันที (เพื่อให้ฉากหลังไม่เพี้ยนตอนแสดง Preview) ---
        target.style.width = originalWidth;
        target.classList.remove('pdf-capture-mode');
        originalStyles.forEach(s => {
            s.el.style.height    = s.height;
            s.el.style.maxHeight = s.maxHeight;
            s.el.style.overflow  = s.overflow;
        });
        cardOriginal.forEach(s => {
            s.el.style.height = s.height;
        });

        // --- 5. สร้าง PDF (A4 Landscape) ---
        const PDF_W   = 297;   
        const PDF_H   = 210;   
        const MARGIN  = 10;    
        const CONTENT_W = PDF_W - (MARGIN * 2);
        const CONTENT_H = PDF_H - (MARGIN * 2);

        const imgW  = canvas.width;
        const imgH  = canvas.height;

        // คำนวณสัดส่วนให้พอดีกับความกว้างของหน้ากระดาษ
        const ratio     = CONTENT_W / imgW;
        const scaledH   = imgH * ratio;   
        const scaledW   = imgW * ratio;
        
        // จัดให้อยู่กึ่งกลางหน้ากระดาษพอดี
        const xOffset = MARGIN + ((CONTENT_W - scaledW) / 2);

        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

        const filterLabel = [
            'Team: ' + sFilters.team,
            'Year: ' + sFilters.year,
            'Month: ' + sFilters.month,
            'Customer: ' + sFilters.customer
        ].join('  |  ');
        const exportDate = new Date().toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        const pxPerPage = (CONTENT_H / ratio);   
        const totalPages = Math.ceil(imgH / pxPerPage);

        for (let page = 0; page < totalPages; page++) {
            if (page > 0) pdf.addPage();

            const srcY = Math.round(page * pxPerPage);
            const srcH = Math.min(pxPerPage, imgH - srcY);

            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width  = imgW;
            sliceCanvas.height = Math.round(srcH);
            
            // เติมพื้นหลังสีขาวกันภาพโปร่งใส
            const ctx = sliceCanvas.getContext('2d');
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(0, 0, imgW, Math.round(srcH));
            ctx.drawImage(canvas, 0, srcY, imgW, srcH, 0, 0, imgW, Math.round(srcH));
            
            const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.95);
            const sliceHmm  = srcH * ratio;     

            // แปะรูปลง PDF
            pdf.addImage(sliceData, 'JPEG', xOffset, MARGIN, scaledW, sliceHmm, '', 'FAST');

            // ใส่ Header สีน้ำเงิน
            pdf.setFillColor(30, 58, 138);   
            pdf.rect(0, 0, PDF_W, 7, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'bold');
            pdf.text('Service CSI Dashboard', MARGIN, 5);
            pdf.setFont('helvetica', 'normal');
            pdf.text(filterLabel, PDF_W / 2, 5, { align: 'center' });
            pdf.text(exportDate, PDF_W - MARGIN, 5, { align: 'right' });

            // ใส่ Footer
            pdf.setFillColor(248, 250, 252);  
            pdf.rect(0, PDF_H - 6, PDF_W, 6, 'F');
            pdf.setTextColor(100, 116, 139);  
            pdf.setFontSize(7);
            pdf.setFont('helvetica', 'normal');
            pdf.text('CES Dashboard System — Confidential', MARGIN, PDF_H - 2);
            pdf.text(`Page ${page + 1} of ${totalPages}`, PDF_W - MARGIN, PDF_H - 2, { align: 'right' });
        }

       // --- 6. แสดง Preview ด้วย SweetAlert2 (เปลี่ยนเป็น Image เพื่อป้องกัน Chrome Block) ---
        // แปลงภาพ canvas ที่ได้จากการแคปหน้าจอมาแสดงเป็น Preview 
        const previewImg = canvas.toDataURL('image/jpeg', 0.8);

        Swal.fire({
            title: 'ตรวจสอบความถูกต้อง (Preview)',
            html: `
                <p class="text-sm mb-3 text-gray-500">กรุณาตรวจสอบรายละเอียดความเรียบร้อยก่อนดาวน์โหลดเอกสาร (ภาพจำลองโครงสร้าง)</p>
                <div style="width:100%; height:500px; overflow-y:auto; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:8px; padding:20px; text-align:center;">
                    <img src="${previewImg}" style="max-width:100%; height:auto; box-shadow:0 4px 10px rgba(0,0,0,0.15); background:#fff;">
                </div>
            `,
            width: '1000px',
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-download mr-1"></i> ยืนยันการดาวน์โหลด PDF',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#004aad', 
            cancelButtonColor: '#C8C9C7',
            customClass: {
                confirmButton: 'font-bold rounded-xl px-5',
                cancelButton: 'font-bold rounded-xl px-5'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                // หากกดยืนยัน ให้ดาวน์โหลดไฟล์ PDF ตัวจริง
                const fileName = `Service_CSI_${sFilters.team}_${sFilters.month}_${sFilters.year}.pdf`;
                pdf.save(fileName);
                Swal.fire({
                    icon: 'success',
                    title: 'บันทึกสำเร็จ!',
                    text: 'เอกสารถูกดาวน์โหลดเรียบร้อยแล้ว',
                    timer: 2000,
                    showConfirmButton: false
                });
            }
        });

    } catch (err) {
        console.error('PDF export error:', err);
        Swal.fire('Export Failed', err.message || 'เกิดข้อผิดพลาดขณะสร้าง PDF', 'error');
        
        // คืนค่า CSS ในกรณีที่มี Error เกิดขึ้นระหว่างทาง
        target.style.width = originalWidth;
        target.classList.remove('pdf-capture-mode');
        originalStyles.forEach(s => { s.el.style.height = s.height; s.el.style.maxHeight = s.maxHeight; s.el.style.overflow = s.overflow; });
        cardOriginal.forEach(s => { s.el.style.height = s.height; });
    }
}


/* ============================================================
   V23 Recovery Guard — ensure Service CSI reloads data if V22 stale JS cached
============================================================ */
function serviceReloadData() {
  Swal.fire({title:'Reloading Service CSI...', allowOutsideClick:false, didOpen:()=>Swal.showLoading()});
  google.script.run
    .withSuccessHandler(data => {
      serviceRawData = data || [];
      google.script.run.withSuccessHandler(cust => {
        customerRawData = cust || [];
        populateServiceDropdowns();
        populateCompareDropdowns();
        applyServiceFilters();
        Swal.close();
      }).getCustomerListData();
    })
    .withFailureHandler(err => Swal.fire('Service Load Error', err.message, 'error'))
    .getServiceDataOnly();
}

// ==============================================================
// V8 override: Service CSI Excel upload
// Fixes blank Formbricks rows being saved as Team = Other and uses
// a single fast backend POST instead of many small JSONP chunks.
// ==============================================================

// ============================================================
// V9 Service CSI Upload Mapper
// Reference format:
// - CES export  -> Service_Data
// - TES export  -> TES_Service_Data
// Exact Formbricks column mapping, skip incomplete/blank responses,
// and avoid saving Team = Other.
// ============================================================

// ============================================================
// V12 Service CSI upload speed patch
// - Skips Response IDs that are already loaded on the page before calling Apps Script
// - Sends compact TSV payload instead of a large nested JSON array
// - Updates the UI immediately after save instead of forcing a full reload
// ============================================================
function processServiceUpload(jsonData, meta) {
    meta = meta || {};
    const loader = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    const uploadFileName = String(meta.fileName || '').trim();
    if (loader) loader.classList.remove('hidden');
    if (loadingText) loadingText.innerText = 'Mapping Service CSI file...';

    const rows = Array.isArray(jsonData) ? jsonData : [];
    if (!rows.length) {
        if (loader) loader.classList.add('hidden');
        Swal.fire('No data', 'ไม่พบข้อมูลในไฟล์ Excel', 'warning');
        return;
    }

    const headers = Object.keys(rows[0] || {});
    const text = v => String(v == null ? '' : v).trim();
    const lower = v => text(v).toLowerCase();
    const cleanHeader = h => text(h).replace(/\s+/g, ' ');
    const hasHeader = keyword => headers.some(h => cleanHeader(h).toLowerCase().includes(String(keyword).toLowerCase()));
    const findKey = (...keywords) => {
        for (const keyword of keywords) {
            const k = headers.find(h => cleanHeader(h).toLowerCase().includes(String(keyword).toLowerCase()));
            if (k) return k;
        }
        return '';
    };

    const fileLower = lower(uploadFileName);
    const activeTeam = String((typeof sFilters !== 'undefined' && sFilters.team) ? sFilters.team : 'All').toUpperCase();
    const isTESFile = fileLower.includes('export-tes') || fileLower.includes('tes_') || (!hasHeader('Services ที่ใช้บริการ') && hasHeader('ด้านการออกใบรายงาน'));
    const fileType = isTESFile ? 'TES' : 'CES';
    const forceTeam = isTESFile || activeTeam === 'TES' ? 'TES' : '';

    const K = {
        id: findKey('response id'),
        timestamp: findKey('timestamp'),
        serviceDate: findKey('วันที่เข้ารับบริการ'),
        finished: findKey('finished'),
        place: findKey('สถานที่รับบริการ'),
        customerType: findKey('ประเภทลูกค้า'),
        service: isTESFile ? '' : findKey('services ที่ใช้บริการ', 'services')
    };

    function questionHeaders(sectionNo) {
        const sectionText = 'ส่วนที่ ' + sectionNo;
        return headers.filter(h => {
            const s = cleanHeader(h);
            return s.includes(sectionText) &&
                !s.includes('ความคิดเห็น') &&
                !s.includes('ข้อเสนอแนะ') &&
                !s.includes('แนะนำ') &&
                !s.toLowerCase().includes('option id');
        });
    }

    const scoreKeys = {
        s1: questionHeaders(1),
        s2: questionHeaders(2),
        s3: questionHeaders(3),
        s4: questionHeaders(4),
        s5: headers.filter(h => cleanHeader(h).includes('ความประทับใจ') && !cleanHeader(h).includes('ความคิดเห็น') && !cleanHeader(h).includes('แนะนำ'))
    };

    const commentKeys = headers.filter(h => {
        const s = cleanHeader(h);
        return s && (s.includes('ความคิดเห็นเพิ่มเติม') || s.includes('ข้อเสนอแนะ') || s.toLowerCase().includes('suggestion'));
    });

    function parseExcelDate(v) {
        if (v instanceof Date && !isNaN(v.getTime())) return v;
        const raw = text(v);
        if (!raw) return null;
        const n = Number(raw);
        if (Number.isFinite(n) && n > 20000 && n < 80000) {
            const d = new Date(Math.round((n - 25569) * 86400 * 1000));
            return isNaN(d.getTime()) ? null : d;
        }
        let d = new Date(raw);
        if (!isNaN(d.getTime())) return d;
        const m = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
        if (m) {
            let y = Number(m[3]);
            if (y < 100) y += 2000;
            if (y > 2400) y -= 543;
            d = new Date(y, Number(m[2]) - 1, Number(m[1]));
            if (!isNaN(d.getTime())) return d;
        }
        return null;
    }

    function normalizeFinished(v) {
        const s = lower(v);
        if (['yes','y','true','1','finish','finished','complete','completed','done'].includes(s)) return 'Yes';
        if (['no','n','false','0','not finish','not finished','pending'].includes(s)) return 'No';
        return s ? text(v) : 'No';
    }

    function normalizeCustomerType(v) {
        const s = lower(v);
        if (s.includes('network') || s.includes('bdms')) return 'Network';
        return 'Commercial';
    }

    function detectTeam(rawService) {
        if (forceTeam === 'TES') return 'TES';
        const s = lower(rawService);
        if (!s) return '';
        if (s.includes('medical') || s.includes('cal-med') || s.includes('เครื่องมือแพทย์')) return 'MED';
        if (s.includes('lab') || s.includes('testing') || s.includes('ห้องปฏิบัติการ')) return 'LAB';
        if (s.includes('environmental') || s.includes('environment') || s.includes('health') || s.includes('ehs') || s.includes('env') || s.includes('สิ่งแวดล้อม')) return 'EHS';
        if (s.includes('tes') || s.includes('technical') || s.includes('engineering')) return 'TES';
        return '';
    }

    function avgScore(row, keys) {
        let sum = 0, count = 0;
        (keys || []).forEach(k => {
            const raw = text(row[k]);
            if (raw === '') return;
            const n = Number(raw.replace(/,/g, ''));
            if (Number.isFinite(n)) { sum += n; count += 1; }
        });
        return count ? Number((sum / count).toFixed(6)) : 0;
    }

    // V29 compatibility names retained from the previous upload implementation.
    // They stay local to the canonical uploader and do not create global duplicates.
    function scoreAvg(row, keys) { return avgScore(row, keys); }
    function hasAnyScore(scores) { return (scores || []).some(v => Number(v) > 0); }

    function isBadCustomerName(name) {
        const s = lower(name);
        if (!s) return true;
        if (['a','aa','.', '-', 'test', 'เทส', 'ทดสอบ'].includes(s)) return true;
        return s.includes('test') || s.includes('ทดสอบ');
    }

    function toServiceObject(r) {
        return {
            id: r[0], monthFull: r[1], monthOnly: r[2], year: r[3], finished: r[4],
            team: r[5], customer: r[6], s1: Number(r[7]) || 0, s2: Number(r[8]) || 0,
            s3: Number(r[9]) || 0, s4: Number(r[10]) || 0, s5: Number(r[11]) || 0,
            comments: r[12] || '', raw: r[13] || '', customerName: r[14] || '',
            sourceSheet: r[5] === 'TES' ? 'TES_Service_Data' : 'Service_Data'
        };
    }

    function packRowsForAppsScript(rowsToPack) {
        // TSV payload is much smaller/faster than nested JSON arrays through iframe POST.
        // Strip tabs/newlines from individual cells so split is deterministic.
        return rowsToPack.map(r => r.map(v => String(v == null ? '' : v)
            .replace(/[\t\r\n]+/g, ' ')
            .replace(/\s{2,}/g, ' ')
            .trim()).join('\t')).join('\n');
    }

    const existingIds = new Set((Array.isArray(serviceRawData) ? serviceRawData : []).map(d => {
        if (Array.isArray(d)) return text(d[0]);
        return text(d && (d.id || d.ID || d.responseId || d['Response ID']));
    }).filter(Boolean));

    const seen = new Set();
    let skippedBlank = 0;
    let skippedOther = 0;
    let skippedDuplicateInFile = 0;
    let skippedDuplicateExisting = 0;
    let skippedTest = 0;

    const mappedRows = [];
    rows.forEach(row => {
        const id = text(row[K.id]);
        if (!id) { skippedBlank++; return; }
        if (seen.has(id)) { skippedDuplicateInFile++; return; }
        seen.add(id);

        const customerName = text(row[K.place]);
        const customerBad = isBadCustomerName(customerName);
        if (lower(customerName).includes('test') || ['aa','test','ทดสอบ'].includes(lower(customerName))) {
            skippedTest++;
            return;
        }

        const rawService = isTESFile ? 'TES' : text(row[K.service]);
        const team = detectTeam(rawService);
        const scores = [
            scoreAvg(row, scoreKeys.s1),
            scoreAvg(row, scoreKeys.s2),
            scoreAvg(row, scoreKeys.s3),
            scoreAvg(row, scoreKeys.s4),
            scoreAvg(row, scoreKeys.s5)
        ];
        const hasScore = hasAnyScore(scores);

        if (!team) { skippedOther++; return; }
        if (!hasScore && !rawService) { skippedBlank++; return; }
        if (!hasScore && customerBad) { skippedBlank++; return; }

        const dateObj = parseExcelDate(row[K.serviceDate]) || parseExcelDate(row[K.timestamp]);
        const monthOnly = dateObj ? S_MONTHS[dateObj.getMonth()] : 'Unknown';
        const monthFull = dateObj ? dateObj.toLocaleString('en-US', { month: 'long' }) : 'Unknown';
        const year = dateObj ? String(dateObj.getFullYear()) : 'Unknown';

        const comments = [];
        commentKeys.forEach(k => {
            const val = text(row[k]);
            if (val.length > 2 && val !== '-' && val !== '[]' && !/^\d+(\.\d+)?$/.test(val)) {
                comments.push({ topic: 'Feedback', text: val.substring(0, 400), customer: (customerName || 'Unknown').substring(0, 120) });
            }
        });

        mappedRows.push([
            id, monthFull, monthOnly, year, normalizeFinished(row[K.finished]), team,
            normalizeCustomerType(row[K.customerType]), scores[0], scores[1], scores[2], scores[3], scores[4],
            comments.length ? JSON.stringify(comments) : '', rawService || team, customerName
        ]);
    });

    const uploadRows = mappedRows.filter(r => {
        const id = text(r[0]);
        if (existingIds.has(id)) { skippedDuplicateExisting++; return false; }
        return true;
    });

    if (!mappedRows.length) {
        if (loader) loader.classList.add('hidden');
        Swal.fire('No valid rows', `ไม่พบแถวที่นำเข้าได้จากไฟล์นี้<br>Skipped blank: ${skippedBlank}<br>Skipped other: ${skippedOther}`, 'warning');
        return;
    }

    if (!uploadRows.length) {
        if (loader) loader.classList.add('hidden');
        Swal.fire({
            icon: 'info',
            title: 'No new Service CSI rows',
            html: [
                `Mapped rows: ${mappedRows.length}`,
                `Already in dashboard: ${skippedDuplicateExisting}`,
                `Duplicate inside file: ${skippedDuplicateInFile}`,
                `Skipped blank/test/other: ${skippedBlank + skippedOther + skippedTest}`
            ].join('<br>')
        });
        return;
    }

    const uploadMeta = {
        fileName: uploadFileName,
        fileType: fileType,
        forceTeam: forceTeam,
        cleanupInvalid: false,
        packedFormat: 'service-v17-stable-rows',
        crossSheetDedup: false,
        source: 'service-csi-v17-stable-github-upload'
    };

    (async () => {
        try {
            if (loadingText) {
                loadingText.innerText = `Preparing ${uploadRows.length} new Service CSI rows... (${skippedDuplicateExisting} existing skipped)`;
            }

            let result;
            // Stable GitHub mode: use the existing backend function only.
            // Previous builds tried saveServiceDataArrayInstant/saveServiceDataArrayFast (disabled in v17 stable frontend),
            // but many deployed Apps Script versions did not whitelist those new names.
            // This path avoids "Function not allowed or not found" completely.
            if (window.CES_API && typeof window.CES_API.chunkedRows === 'function') {
                const chunksResult = await window.CES_API.chunkedRows('saveServiceDataArray', uploadRows, uploadMeta, {
                    maxUrlLength: 5600,
                    timeoutMs: 120000,
                    onProgress: function (current, total, rowsInChunk) {
                        if (loadingText) {
                            loadingText.innerText = `Saving Service CSI data... chunk ${current}/${total} (${rowsInChunk} rows)`;
                        }
                    }
                });
                result = chunksResult;
            } else if (window.CES_API && typeof window.CES_API.callFunction === 'function') {
                // Fallback for older gas-polyfill without chunkedRows.
                result = await window.CES_API.callFunction('saveServiceDataArray', [uploadRows, uploadMeta], { transport: 'iframe', timeoutMs: 150000 });
            } else {
                result = await new Promise((resolve, reject) => {
                    google.script.run
                        .withSuccessHandler(resolve)
                        .withFailureHandler(reject)
                        .saveServiceDataArray(uploadRows, uploadMeta);
                });
            }

            // Immediate local update. This removes the slow full reload after upload.
            const locallyAdded = uploadRows.map(toServiceObject);
            if (Array.isArray(serviceRawData)) serviceRawData = serviceRawData.concat(locallyAdded);
            if (Array.isArray(customerRawData)) {
                customerRawData = customerRawData.concat(locallyAdded.map(r => ({
                    monthOnly: r.monthOnly, year: r.year, finished: r.finished, team: r.team,
                    customerType: r.customer, customer: r.customerName, s1: r.s1, s2: r.s2, s3: r.s3, s4: r.s4, s5: r.s5
                })));
            }
            if (typeof populateServiceDropdowns === 'function') populateServiceDropdowns();
            if (typeof populateCompareDropdowns === 'function') populateCompareDropdowns();
            if (typeof applyServiceFilters === 'function') applyServiceFilters();

            if (loader) loader.classList.add('hidden');
            const summary = (result && typeof result === 'object')
                ? [
                    `File type: ${fileType}`,
                    `Mapped rows: ${mappedRows.length}`,
                    `Sent new rows: ${uploadRows.length}`,
                    `Added: ${result.total || 0}`,
                    `Service_Data: ${result.main || 0}`,
                    `TES_Service_Data: ${result.tes || 0}`,
                    `Already skipped before upload: ${skippedDuplicateExisting}`,
                    `Backend duplicate: ${result.duplicate || 0}`,
                    result.elapsedMs ? `Backend save: ${result.elapsedMs} ms` : ''
                  ].filter(Boolean).join('<br>')
                : `Processed ${result} records.`;
            Swal.fire({ icon: 'success', title: 'Service CSI uploaded', html: summary });
        } catch (err) {
            if (loader) loader.classList.add('hidden');
            Swal.fire('Upload failed', (err && err.message) ? err.message : String(err), 'error');
        }
    })();
}


// ============================================================
// Memo / Work Order ↔ Service CSI V55
// Monthly import merge; persistent comparison; browser cache first
// ============================================================
let serviceMemoMappingRowsV55 = [];
let serviceMemoMappingMetaV55 = null;
let serviceMemoMappingLoadedV55 = false;
let serviceMemoMappingLoadingV55 = false;
let serviceMemoMappingPopupOpenV55 = false;
let serviceActiveTabV266 = 'dashboard';
let serviceMemoMappingFiltersV55 = {status:'ALL',year:'2026',month:'ALL',team:'ALL'};
let serviceMemoMappingPageV55 = 1;
const CES_SERVICE_MEMO_V55_TARGET_YEAR = 2026;
const CES_SERVICE_MEMO_V55_PAGE_SIZE = 50;
const CES_SERVICE_MEMO_V55_CACHE_KEY = 'CES_SERVICE_MEMO_COMPARISON_V55_2026';
const CES_SERVICE_MEMO_V55_RESTORE_KEY = 'CES_SERVICE_MEMO_RESTORE_V55';
const CES_SERVICE_MEMO_V55_MATCH_THRESHOLD = 70; // MATCHED requires score > 70.
const CES_SERVICE_MEMO_V55_PROVINCES = ['กรุงเทพ','นนทบุรี','ปทุมธานี','สมุทรปราการ','สมุทรสาคร','สมุทรสงคราม','นครปฐม','พระนครศรีอยุธยา','อยุธยา','สระบุรี','ลพบุรี','สุพรรณบุรี','กาญจนบุรี','ราชบุรี','เพชรบุรี','ประจวบคีรีขันธ์','ชลบุรี','ระยอง','จันทบุรี','ตราด','ฉะเชิงเทรา','ปราจีนบุรี','นครนายก','สระแก้ว','นครราชสีมา','ขอนแก่น','อุดรธานี','อุบลราชธานี','บุรีรัมย์','สุรินทร์','ศรีสะเกษ','ร้อยเอ็ด','มหาสารคาม','กาฬสินธุ์','สกลนคร','นครพนม','มุกดาหาร','หนองคาย','บึงกาฬ','เลย','หนองบัวลำภู','ยโสธร','อำนาจเจริญ','เชียงใหม่','เชียงราย','ลำปาง','ลำพูน','พะเยา','แพร่','น่าน','แม่ฮ่องสอน','อุตรดิตถ์','พิษณุโลก','สุโขทัย','ตาก','กำแพงเพชร','พิจิตร','เพชรบูรณ์','นครสวรรค์','อุทัยธานี','สุราษฎร์ธานี','สุราษฎร์','นครศรีธรรมราช','สงขลา','ภูเก็ต','กระบี่','พังงา','ตรัง','พัทลุง','สตูล','ชุมพร','ระนอง','ปัตตานี','ยะลา','นราธิวาส'];
const CES_SERVICE_MEMO_V55_LEGACY_KEYS = ['CES_SERVICE_MEMO_COMPARISON_V54_2026','CES_SERVICE_MEMO_COMPARISON_V53_2026','CES_SERVICE_MEMO_COMPARISON_V52_2026','CES_SERVICE_MEMO_COMPARISON_V50_2026','CES_SERVICE_MEMO_COMPARISON_V45','CES_SERVICE_MEMO_COMPARISON_V43','CES_SERVICE_MEMO_COMPARISON'];

function svcMapEsc_(value){return String(value==null?'':value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function svcMapText_(value){return String(value==null?'':value).trim();}
function svcMapDate_(value){
  if(value instanceof Date&&!isNaN(value.getTime()))return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;
  if(typeof value==='number'&&value>20000&&value<80000&&window.XLSX&&XLSX.SSF){const d=XLSX.SSF.parse_date_code(value);return d?`${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`:'';}
  const text=svcMapText_(value);let m=text.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
  if(m){let y=Number(m[1]);if(y>2400)y-=543;return `${y}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;}
  m=text.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
  if(m){let y=Number(m[3]);if(y<100)y+=2000;if(y>2400)y-=543;return `${y}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;}
  return '';
}
function svcMapMonthFromDate_(value){const found=String(value||'').match(/^(\d{4})-(\d{2})/);return found?`${found[1]}-${found[2]}`:'';}
function svcMapMonthKey_(row){
  const monthMap={JAN:'01',FEB:'02',MAR:'03',APR:'04',MAY:'05',JUN:'06',JUL:'07',AUG:'08',SEP:'09',OCT:'10',NOV:'11',DEC:'12'};
  const raw=String((row&&row.monthOnly)||'').trim();const month=/^\d{1,2}$/.test(raw)?String(Number(raw)).padStart(2,'0'):(monthMap[raw.slice(0,3).toUpperCase()]||'');
  let year=Number(row&&row.year||0);if(year>2400)year-=543;return `${year||''}-${month}`;
}
function svcMapSafeUrl_(value){const url=svcMapText_(value);return /^(https?:\/\/)/i.test(url)?svcMapEsc_(url):'';}
function svcMapHeaderIndex_(headers,candidates){
  const norm=headers.map(svcMapNorm_);for(const candidate of candidates){const wanted=svcMapNorm_(candidate);const exact=norm.indexOf(wanted);if(exact>=0)return exact;const partial=norm.findIndex(h=>h.includes(wanted)||wanted.includes(h));if(partial>=0)return partial;}return -1;
}
function svcMapSheetRows_(worksheet,type){
  if(!worksheet)return [];
  const all=XLSX.utils.sheet_to_json(worksheet,{header:1,defval:'',raw:true});if(!all.length)return [];
  let headerRow=0;for(let i=0;i<Math.min(12,all.length);i++){const line=all[i].map(svcMapNorm_).join('|');if(line.includes('formid')||line.includes('memo no')||line.includes('job no')){headerRow=i;break;}}
  const headers=all[headerRow]||[];
  const idx={
    form:svcMapHeaderIndex_(headers,['FormID','Form ID']),
    no:svcMapHeaderIndex_(headers,type==='MEMO'?['Memo No.','MemoNo','เลขที่บันทึก']:['Job No.','Work Order No']),
    date:svcMapHeaderIndex_(headers,type==='MEMO'?['Start Date','วันที่','Date']:['Start Date/Time','Date','Start Date']),
    end:svcMapHeaderIndex_(headers,type==='MEMO'?['End Date']:['End Date/Time','End Date']),
    customer:svcMapHeaderIndex_(headers,['Customer Name','ชื่อลูกค้า']),
    team:svcMapHeaderIndex_(headers,type==='WORK_ORDER'?['Team2','Team']:['Team','Team2']),
    url:svcMapHeaderIndex_(headers,type==='MEMO'?['MemoOrderURL','Memo URL','URL']:['WorkOrderURL','Work Order URL','URL'])
  };
  return all.slice(headerRow+1).map((row,index)=>({
    type,sourceRow:headerRow+index+2,formId:idx.form>=0?svcMapText_(row[idx.form]):'',docNo:idx.no>=0?svcMapText_(row[idx.no]):'',
    date:idx.date>=0?svcMapDate_(row[idx.date]):'',endDate:idx.end>=0?svcMapDate_(row[idx.end]):'',
    customer:idx.customer>=0?svcMapText_(row[idx.customer]):'',team:idx.team>=0?svcMapText_(row[idx.team]):'',url:idx.url>=0?svcMapText_(row[idx.url]):''
  })).filter(row=>(row.formId||row.docNo||row.customer)&&svcMapMonthFromDate_(row.date).startsWith('2026-'));
}
function svcMapServiceRows_(){
  return (Array.isArray(serviceRawData)?serviceRawData:[]).filter(row=>{let year=Number(row&&row.year||0);if(year>2400)year-=543;if(year===CES_SERVICE_MEMO_V55_TARGET_YEAR)return true;return String((row&&row.date)||(row&&row.receivedDate)||'').includes(String(CES_SERVICE_MEMO_V55_TARGET_YEAR));});
}
function svcMapThaiCanon_(value){
  return svcMapText_(value).toLowerCase()
    .replace(/กรุงเทพฯ/g,'กรุงเทพ')
    .replace(/กทม\.?/g,'กรุงเทพ')
    .replace(/พระนครศรีอยุธยา/g,'อยุธยา')
    .replace(/สุราษฎร์ธานี/g,'สุราษฎร์')
    .replace(/นครราชสีมา/g,'โคราช')
    .replace(/จุฬาฯ/g,'จุฬาลงกรณ์')
    .replace(/ศิริราชพยาบาล/g,'ศิริราช')
    .replace(/สมเด็จพระยุพราช/g,'ยุพราช')
    .replace(/รพ\.สต\.?/g,'โรงพยาบาลส่งเสริมสุขภาพตำบล')
    .replace(/บีเอ็นเอช/g,'bnh')
    .replace(/บีเอชคิว/g,'bhq');
}
function svcMapNorm_(value){
  return svcMapThaiCanon_(value)
    .replace(/โรงพยาบาลส่งเสริมสุขภาพตำบล/g,' รพสต ')
    .replace(/โรงพยาบาล/g,' ')
    .replace(/รพ\s*\.?/g,' ')
    .replace(/บริษัท|บจก\s*\.?|จำกัด|มหาชน|คลินิกเวชกรรม/g,' ')
    .replace(/\b(hospital|company|co\.?|ltd\.?|limited|public|by|the|and|windchill|commercial|service|services)\b/gi,' ')
    .replace(/\([^)]*\)/g,' ')
    .replace(/\b(?:pm|cpt|bsc|hood|filter|calibration|preventive|maintenance)\b/gi,' ')
    .replace(/[^a-z0-9ก-๙]+/g,' ')
    .replace(/\s+/g,' ').trim();
}
function svcMapTokens_(value){
  const stop=new Set(['สาขา','ศูนย์','งาน','รอบ','ครั้ง','ครั้งที่','แผนก','ฝ่าย','medical','center','centre','service','services','health','แห่ง','จังหวัด','อำเภอ','ตำบล','โรงพยาบาล','รพสต']);
  return svcMapNorm_(value).split(' ').map(x=>x.trim()).filter(x=>x.length>=2&&!stop.has(x));
}
function svcMapCompactName_(value){return svcMapNorm_(value).replace(/\s+/g,'');}
function svcMapNgrams_(value,size){
  const text=svcMapCompactName_(value),out=[];size=size||3;
  if(text.length<size)return text?[text]:[];
  for(let i=0;i<=text.length-size;i++)out.push(text.slice(i,i+size));
  return [...new Set(out)];
}
function svcMapDice_(a,b){
  const aa=svcMapNgrams_(a,3),bb=svcMapNgrams_(b,3);if(!aa.length||!bb.length)return 0;
  const bs=new Set(bb);let common=0;aa.forEach(x=>{if(bs.has(x))common++;});return (2*common)/(aa.length+bb.length);
}
function svcMapProvinceTokens_(value){
  const text=svcMapThaiCanon_(value);return [...new Set(CES_SERVICE_MEMO_V55_PROVINCES.filter(name=>text.includes(name)).map(name=>name==='พระนครศรีอยุธยา'?'อยุธยา':name==='สุราษฎร์ธานี'?'สุราษฎร์':name))];
}
function svcMapTokenSimilarity_(a,b){
  if(a===b)return 1;
  if(Math.min(a.length,b.length)>=4&&(a.includes(b)||b.includes(a)))return .9;
  return svcMapDice_(a,b);
}
function svcMapLearnedPairScore_(sourceName,targetName){
  const a=svcMapNorm_(sourceName),b=svcMapNorm_(targetName);if(!a||!b||!Array.isArray(serviceMemoMappingRowsV55))return 0;
  for(const row of serviceMemoMappingRowsV55){
    if(Number(row&&row.score||0)<90)continue;
    const sa=svcMapNorm_(row&&row.source&&row.source.customer),sb=svcMapNorm_(row&&row.match&&(row.match.customerName||row.match.customer));
    if((sa===a&&sb===b)||(sa===b&&sb===a))return 96;
  }
  return 0;
}
function svcMapNameScore_(sourceName,targetName){
  const a=svcMapCompactName_(sourceName),b=svcMapCompactName_(targetName);if(!a||!b)return 0;
  const learned=svcMapLearnedPairScore_(sourceName,targetName);if(learned)return learned;
  if(a===b)return 98;
  if(Math.min(a.length,b.length)>=5&&(a.includes(b)||b.includes(a)))return 91;
  const at=svcMapTokens_(sourceName),bt=svcMapTokens_(targetName);
  let matchedWeight=0,totalWeight=0;
  at.forEach(token=>{const weight=Math.min(10,Math.max(2,token.length));totalWeight+=weight;let best=0;bt.forEach(other=>{best=Math.max(best,svcMapTokenSimilarity_(token,other));});if(best>=.62)matchedWeight+=weight*best;});
  const coverage=totalWeight?matchedWeight/totalWeight:0;
  const reverse=bt.length?bt.filter(token=>at.some(other=>svcMapTokenSimilarity_(token,other)>=.68)).length/bt.length:0;
  const dice=svcMapDice_(sourceName,targetName);
  return Math.min(96,Math.round(Math.max(coverage*90,reverse*82,dice*88)));
}
function svcMapDateObject_(value){
  const key=svcMapDate_(value);if(!key)return null;const d=new Date(key+'T00:00:00');return isNaN(d.getTime())?null:d;
}
function svcMapCsiDate_(csi){
  const fields=[csi&&csi.date,csi&&csi.receivedDate,csi&&csi.serviceDate,csi&&csi.timestamp,csi&&csi.id];
  for(const value of fields){
    const direct=svcMapDate_(value);if(direct)return direct;
    const text=String(value||'');let m=text.match(/(20\d{2})[-_\/]?(\d{2})[-_\/]?(\d{2})/);if(m)return `${m[1]}-${m[2]}-${m[3]}`;
  }
  const monthKey=svcMapMonthKey_(csi);return /^\d{4}-\d{2}$/.test(monthKey)?monthKey+'-15':'';
}
function svcMapEffectiveSourceDate_(source){
  const wo=source&&source.workOrder||{};return wo.date||source.date||wo.endDate||source.endDate||'';
}
function svcMapSimilarity_(source,csi){
  const sourceName=(source&&source.customer)||((source&&source.workOrder&&source.workOrder.customer)||'');
  const csiName=(csi&&(csi.customerName||csi.customer))||'';
  const raw=svcMapNorm_([csi&&csi.id,csi&&csi.raw,csi&&csi.comments,csiName].join(' '));
  const formKey=svcMapNorm_(source&&source.formId),docKey=svcMapNorm_((source&&source.docNo)||((source&&source.workOrder&&source.workOrder.docNo)||''));
  if(formKey&&raw.includes(formKey))return 100;if(docKey&&raw.includes(docKey))return 99;
  const nameScore=svcMapNameScore_(sourceName,csiName);let score=nameScore;
  const sourceProvinces=svcMapProvinceTokens_(sourceName),targetProvinces=svcMapProvinceTokens_(csiName);
  const provinceConflict=sourceProvinces.length&&targetProvinces.length&&!sourceProvinces.some(p=>targetProvinces.includes(p));
  const sourceDate=svcMapDateObject_(svcMapEffectiveSourceDate_(source)),csiDate=svcMapDateObject_(svcMapCsiDate_(csi));
  if(sourceDate&&csiDate){const diff=Math.abs(Math.round((sourceDate-csiDate)/86400000));if(diff<=7)score+=10;else if(diff<=31)score+=6;else if(diff<=62)score+=2;else if(diff>180)score-=10;}
  else{const sourceMonth=svcMapMonthFromDate_(svcMapEffectiveSourceDate_(source)),csiMonth=svcMapMonthKey_(csi);if(sourceMonth&&csiMonth)score+=sourceMonth===csiMonth?5:-6;}
  const sourceTeam=svcMapTeamCode_(source&&source.team),csiTeam=svcMapTeamCode_((window.S_TEAM_MAP&&S_TEAM_MAP[csi&&csi.team])||(csi&&csi.team));
  if(sourceTeam&&csiTeam)score+=sourceTeam===csiTeam?3:-5;
  if(provinceConflict)score=Math.min(score,45);
  if(nameScore<45)score=Math.min(score,54);else if(nameScore<58)score=Math.min(score,69);
  return Math.max(0,Math.min(100,Math.round(score)));
}
function svcBuildMemoMapping_(memoRows,workOrderRows){
  const workOrderByForm={};workOrderRows.forEach(row=>{if(row.formId)workOrderByForm[svcMapNorm_(row.formId)]=row;});
  const memoForms=new Set(memoRows.map(row=>svcMapNorm_(row.formId)).filter(Boolean));
  const sources=memoRows.map(row=>Object.assign({},row,{workOrder:workOrderByForm[svcMapNorm_(row.formId)]||null}));
  workOrderRows.filter(row=>!memoForms.has(svcMapNorm_(row.formId))).forEach(row=>sources.push({type:'WORK_ORDER',sourceRow:row.sourceRow,formId:row.formId,docNo:'',date:row.date,endDate:row.endDate,customer:row.customer,team:row.team,url:'',workOrder:row}));
  const csiRows=svcMapServiceRows_();
  return sources.map(source=>{let best=null,bestScore=0;csiRows.forEach(csi=>{const score=svcMapSimilarity_(source,csi);if(score>bestScore){bestScore=score;best=csi;}});const matched=bestScore>CES_SERVICE_MEMO_V55_MATCH_THRESHOLD;return{source,match:matched?best:null,score:bestScore,status:matched?'MATCHED':'UNMATCHED'};}).sort((a,b)=>String(a.source.date||'').localeCompare(String(b.source.date||''))||b.score-a.score);
}
function svcMapCompactRow_(row){
  const source=row.source||{},match=row.match||{},workOrder=source.workOrder||{};
  return {status:Number(row.score||0)>CES_SERVICE_MEMO_V55_MATCH_THRESHOLD&&row.match?'MATCHED':'UNMATCHED',score:Number(row.score||0),sourceType:source.type||'MEMO',sourceRow:source.sourceRow||'',formId:source.formId||'',memoNo:source.type==='MEMO'?(source.docNo||''):'',workOrderNo:workOrder.docNo||(source.type==='WORK_ORDER'?source.docNo:'')||'',sourceDate:svcMapEffectiveSourceDate_(source)||source.date||'',sourceEndDate:(workOrder.endDate||source.endDate||''),customer:source.customer||'',sourceTeam:source.team||'',memoUrl:source.url||'',workOrderUrl:workOrder.url||'',csiId:match.id||'',csiCustomer:match.customerName||match.customer||'',csiTeam:match.team||'',csiMonth:match.monthOnly||'',csiYear:match.year||'',evidence:`Name score ${svcMapNameScore_(source.customer,match.customerName||match.customer||'')}% | Keywords: ${svcMapTokens_(source.customer).slice(0,8).join(', ')||'-'} | Work Order date ${svcMapEffectiveSourceDate_(source)||'-'} | CSI ${row.match?svcMapMonthKey_(match):'-'}`};
}
function svcMapStoredRow_(row){
  const sourceType=String(row.sourceType||'MEMO').toUpperCase(),workOrder={docNo:row.workOrderNo||'',url:row.workOrderUrl||''};
  const source={type:sourceType,sourceRow:row.sourceRow||'',formId:row.formId||'',docNo:sourceType==='MEMO'?(row.memoNo||''):(row.workOrderNo||''),date:row.sourceDate||'',endDate:row.sourceEndDate||'',customer:row.customer||'',team:row.sourceTeam||'',url:row.memoUrl||'',workOrder:Object.assign(workOrder,{date:row.sourceDate||'',endDate:row.sourceEndDate||'',customer:row.customer||'',team:row.sourceTeam||''})};
  const hasMatch=!!(row.csiId||row.csiCustomer||row.csiTeam||row.csiYear);const match=hasMatch?{id:row.csiId||'',customerName:row.csiCustomer||'',customer:row.csiCustomer||'',team:row.csiTeam||'',monthOnly:row.csiMonth||'',year:row.csiYear||'',raw:row.evidence||''}:null;
  const score=Number(row.score||0);const status=hasMatch&&score>CES_SERVICE_MEMO_V55_MATCH_THRESHOLD?'MATCHED':'UNMATCHED';return{source,match:status==='MATCHED'?match:null,score,status,evidence:row.evidence||''};
}
function svcMapTeamCode_(value){const text=String(value||'').trim().toUpperCase();if(!text)return'';if(text.includes('ENV'))return'ENV';if(text.includes('EHS'))return'EHS';if(text.includes('LAB'))return'LAB';if(text.includes('MED'))return'MED';if(text.includes('TES')||text.includes('TECHNICAL'))return'TES';return text.replace(/^CAL[-_ ]?/,'');}
function svcMapRowMonth_(row){return svcMapMonthFromDate_(row&&row.source&&row.source.date);}
function svcMapClearLegacyCache_(){CES_SERVICE_MEMO_V55_LEGACY_KEYS.forEach(key=>{try{localStorage.removeItem(key);}catch(ignore){}});}
function svcMapSummary_(rows){rows=rows||[];const matched=rows.filter(row=>row.status==='MATCHED').length;return{all:rows.length,matched,unmatched:rows.length-matched,percent:rows.length?Math.round(matched*10000/rows.length)/100:0};}
function svcMapCacheSave_(){
  try{const summary=svcMapSummary_(serviceMemoMappingRowsV55);const payload={version:'V55',savedAt:new Date().toISOString(),targetYear:2026,meta:Object.assign({},serviceMemoMappingMetaV55||{},summary),rows:serviceMemoMappingRowsV55.map(svcMapCompactRow_)};localStorage.setItem(CES_SERVICE_MEMO_V55_CACHE_KEY,JSON.stringify(payload));svcMapClearLegacyCache_();return true;}catch(error){console.warn('[Memo V55 cache save]',error);return false;}
}
function svcMapParseCachedRows_(cached){
  if(!cached||!Array.isArray(cached.rows))return false;
  const rows=cached.rows.map(row=>{if(!row)return null;if(!row.source)return svcMapStoredRow_(row);const score=Number(row.score||0),hasMatch=!!row.match;row.status=hasMatch&&score>CES_SERVICE_MEMO_V55_MATCH_THRESHOLD?'MATCHED':'UNMATCHED';if(row.status!=='MATCHED')row.match=null;return row;}).filter(Boolean);
  if(!rows.length)return false;
  serviceMemoMappingRowsV55=rows;const summary=svcMapSummary_(rows);
  serviceMemoMappingMetaV55=Object.assign({success:true,version:'V55',targetYear:2026,rowCount:summary.all,mappingRows:summary.all,matchedRows:summary.matched,unmatchedRows:summary.unmatched,matchPercent:summary.percent,storageMode:'BROWSER_CACHE'},cached.meta||{});
  serviceMemoMappingLoadedV55=true;return true;
}
function svcMapCacheLoad_(){
  try{
    const current=localStorage.getItem(CES_SERVICE_MEMO_V55_CACHE_KEY);
    if(current&&svcMapParseCachedRows_(JSON.parse(current))){svcMapCacheSave_();return true;}
    // One-time browser migration: reuse a valid V50/V52/V53 cache before removing it.
    for(const key of CES_SERVICE_MEMO_V55_LEGACY_KEYS){
      const raw=localStorage.getItem(key);if(!raw)continue;
      try{if(svcMapParseCachedRows_(JSON.parse(raw))){serviceMemoMappingMetaV55.storageMode='MIGRATED_BROWSER_CACHE';svcMapCacheSave_();return true;}}catch(ignoreLegacy){}
    }
    return false;
  }catch(error){console.warn('[Memo V55 cache load]',error);return false;}
}
async function svcMapSnapshotRows_(snapshot){
  if(snapshot&&Array.isArray(snapshot.rows)&&snapshot.rows.length)return snapshot.rows;
  if(!snapshot||snapshot.rowsEncoding!=='gzip-base64')return Array.isArray(snapshot&&snapshot.rows)?snapshot.rows:[];
  const payload=(snapshot.rowsPayloadChunks||[]).join('');
  if(!payload)return[];
  if(typeof DecompressionStream!=='function')throw new Error('This browser cannot open the compressed saved comparison. Please update Chrome and try again.');
  const binary=atob(payload);const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const json=await new Response(stream).text();const rows=JSON.parse(json||'[]');return Array.isArray(rows)?rows:[];
}
async function svcMapRestoreSaved_(force){
  if(serviceMemoMappingLoadingV55)return serviceMemoMappingRowsV55;if(!force&&serviceMemoMappingLoadedV55)return serviceMemoMappingRowsV55;if(!window.CES_API||typeof window.CES_API.callFunction!=='function')return serviceMemoMappingRowsV55;
  localStorage.setItem(CES_SERVICE_MEMO_V55_RESTORE_KEY,String(Date.now()));serviceMemoMappingLoadingV55=true;serviceMemoMappingMetaV55=Object.assign({},serviceMemoMappingMetaV55||{},{restoring:true,restoreError:''});renderServiceMemoMapping_();
  try{
    const snapshot=await window.CES_API.callFunction('getServiceMemoMappingSnapshot',[],{transport:'iframe',timeoutMs:240000});if(!snapshot||!snapshot.success)throw new Error((snapshot&&snapshot.message)||'Unable to restore the saved Memo comparison.');
    const restoredRows=await svcMapSnapshotRows_(snapshot);serviceMemoMappingRowsV55=restoredRows.map(svcMapStoredRow_);serviceMemoMappingMetaV55=Object.assign({},snapshot,{rows:undefined,rowsPayloadChunks:undefined,restoring:false,restoreError:''});serviceMemoMappingLoadedV55=true;svcMapCacheSave_();renderServiceMemoMapping_();return serviceMemoMappingRowsV55;
  }catch(error){console.warn('[Memo V55 restore]',error);serviceMemoMappingMetaV55=Object.assign({},serviceMemoMappingMetaV55||{},{success:false,restoring:false,restoreError:error.message||String(error),targetYear:2026});serviceMemoMappingLoadedV55=true;renderServiceMemoMapping_();return serviceMemoMappingRowsV55;}
  finally{serviceMemoMappingLoadingV55=false;}
}
function svcMapMergeLocal_(incoming,months){const monthSet=new Set(months||[]);const kept=(serviceMemoMappingRowsV55||[]).filter(row=>!monthSet.has(svcMapRowMonth_(row)));const map=new Map();kept.concat(incoming||[]).forEach(row=>{const source=row.source||{},workOrder=source.workOrder||{};const key=[source.type,source.formId,source.docNo,workOrder.docNo,source.date].join('|').toUpperCase();map.set(key,row);});return Array.from(map.values()).sort((a,b)=>String(a.source&&a.source.date||'').localeCompare(String(b.source&&b.source.date||''))||b.score-a.score);}
async function recalculateServiceMemoMapping(){
  if(!serviceMemoMappingRowsV55.length){Swal.fire('Recalculate Match','No saved source rows are available. Import the template first.','info');return;}
  try{
    if(!Array.isArray(serviceRawData)||!serviceRawData.length)throw new Error('Service CSI 2026 data is not loaded yet.');
    const months=[...new Set(serviceMemoMappingRowsV55.map(svcMapRowMonth_).filter(m=>/^2026-\d{2}$/.test(m)))].sort(),latestMonth=months[months.length-1];
    if(!latestMonth)throw new Error('No valid 2026 month is available to recalculate.');
    const monthRows=serviceMemoMappingRowsV55.filter(row=>svcMapRowMonth_(row)===latestMonth);
    Swal.fire({title:'Recalculating latest month…',html:`Only <b>${latestMonth}</b> is recalculated. Older months stay unchanged.`,allowOutsideClick:false,showConfirmButton:false,didOpen:()=>Swal.showLoading()});
    const memoRows=[],workOrderRows=[],seenMemo=new Set(),seenWo=new Set();
    monthRows.forEach(row=>{const source=row.source||{},wo=source.workOrder||{};if(source.type==='MEMO'){const key=[source.formId,source.docNo,source.date].join('|');if(!seenMemo.has(key)){seenMemo.add(key);memoRows.push({type:'MEMO',sourceRow:source.sourceRow,formId:source.formId,docNo:source.docNo,date:source.date,endDate:source.endDate,customer:source.customer,team:source.team,url:source.url});}}if(wo&&(wo.formId||wo.docNo||wo.customer)){const key=[wo.formId,wo.docNo,wo.date].join('|');if(!seenWo.has(key)){seenWo.add(key);workOrderRows.push({type:'WORK_ORDER',sourceRow:wo.sourceRow,formId:wo.formId||source.formId,docNo:wo.docNo,date:wo.date||source.date,endDate:wo.endDate||source.endDate,customer:wo.customer||source.customer,team:wo.team||source.team,url:wo.url});}}});
    const mappingRows=svcBuildMemoMapping_(memoRows,workOrderRows),importMonths=[latestMonth];
    const payload={uploadId:'MM55-RECALC-'+Date.now(),sourceFile:(serviceMemoMappingMetaV55&&serviceMemoMappingMetaV55.sourceFile)||'Saved Memo comparison',uploadedAt:new Date().toISOString(),targetYear:2026,importMonths,memoRows,workOrderRows,mappingRows:mappingRows.map(svcMapCompactRow_)};
    serviceMemoMappingRowsV55=svcMapMergeLocal_(mappingRows,importMonths);serviceMemoMappingLoadedV55=true;svcMapCacheSave_();
    const saved=await window.CES_API.callFunction('saveServiceMemoMapping',[payload],{transport:'iframe',timeoutMs:180000});if(!saved||!saved.success)throw new Error((saved&&saved.message)||'Unable to save recalculated matches.');
    serviceMemoMappingMetaV55=Object.assign({},saved,{recalculatedMonth:latestMonth});serviceMemoMappingPageV55=1;svcMapCacheSave_();Swal.close();serviceMemoMappingPopupOpenV55=true;renderServiceMemoMapping_();
    if(typeof showToast==='function')showToast(`Recalculated ${latestMonth} only`,'success');
  }catch(error){Swal.close();serviceMemoMappingPopupOpenV55=true;renderServiceMemoMapping_();Swal.fire('Recalculate Match',error.message||String(error),'error');}
}
function triggerServiceMemoMappingImport(){const input=document.getElementById('serviceMemoMappingInput');if(input)input.click();}
function refreshServiceMemoMapping(){try{localStorage.removeItem(CES_SERVICE_MEMO_V55_CACHE_KEY);localStorage.removeItem(CES_SERVICE_MEMO_V55_RESTORE_KEY);}catch(ignore){}serviceMemoMappingRowsV55=[];serviceMemoMappingLoadedV55=false;return svcMapRestoreSaved_(true);}
let serviceMemoFilterRenderV264=0;
function setServiceMemoMappingFilter(key,value){
  serviceMemoMappingFiltersV55[key]=value||'ALL';serviceMemoMappingPageV55=1;
  if(serviceMemoFilterRenderV264)cancelAnimationFrame(serviceMemoFilterRenderV264);
  serviceMemoFilterRenderV264=requestAnimationFrame(()=>{serviceMemoFilterRenderV264=0;renderServiceMemoMapping_();});
}
function setServiceMemoMappingPage(page){const max=Math.max(1,Math.ceil(svcMapFiltered_().length/CES_SERVICE_MEMO_V55_PAGE_SIZE));serviceMemoMappingPageV55=Math.max(1,Math.min(Number(page||1),max));renderServiceMemoMapping_();}
function svcMapFiltered_(){const filter=serviceMemoMappingFiltersV55;return(serviceMemoMappingRowsV55||[]).filter(row=>{const month=svcMapRowMonth_(row),team=svcMapTeamCode_((row.source&&row.source.team)||(row.match&&row.match.team));return(filter.status==='ALL'||row.status===filter.status)&&(filter.month==='ALL'||month===filter.month)&&(filter.team==='ALL'||team===filter.team);});}
function exportServiceMemoMapping(){
  const rows=svcMapFiltered_();if(!rows.length){Swal.fire('Export Memo VS CSI','No rows match the selected filters.','info');return;}
  if(!window.XLSX){Swal.fire('Export Error','XLSX library is not loaded.','error');return;}
  const data=rows.map(row=>{const source=row.source||{},match=row.match||{},workOrder=source.workOrder||{};return{'Status':row.status,'Match %':Number(row.score||0),'Date':source.date||'','Team':svcMapTeamCode_(source.team||match.team),'Customer / Memo':source.customer||'','Form ID':source.formId||'','Memo No.':source.type==='MEMO'?(source.docNo||''):'','Work Order No.':workOrder.docNo||(source.type==='WORK_ORDER'?source.docNo:'')||'','Memo URL':source.url||'','Work Order URL':workOrder.url||'','CSI Customer':match.customerName||match.customer||'','CSI Team':match.team||'','CSI Month':match.monthOnly||'','CSI Year':match.year||'','Evidence':row.evidence||''};});
  const sheet=XLSX.utils.json_to_sheet(data),book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,sheet,'Memo VS CSI');const month=serviceMemoMappingFiltersV55.month==='ALL'?'ALL':serviceMemoMappingFiltersV55.month;XLSX.writeFile(book,`Memo_VS_CSI_2026_${month}.xlsx`);
}
function svcMapPopupHtml_(){
  const allRows=serviceMemoMappingRowsV55||[],filtered=svcMapFiltered_(),filter=serviceMemoMappingFiltersV55,summary=svcMapSummary_(filtered),allSummary=svcMapSummary_(allRows);
  const months=[...new Set(allRows.map(svcMapRowMonth_).filter(Boolean))].sort(),teams=[...new Set(allRows.map(row=>svcMapTeamCode_((row.source&&row.source.team)||(row.match&&row.match.team))).filter(Boolean))].sort();
  const monthNames={'2026-01':'Jan 2026','2026-02':'Feb 2026','2026-03':'Mar 2026','2026-04':'Apr 2026','2026-05':'May 2026','2026-06':'Jun 2026','2026-07':'Jul 2026','2026-08':'Aug 2026','2026-09':'Sep 2026','2026-10':'Oct 2026','2026-11':'Nov 2026','2026-12':'Dec 2026'};
  let banner='';
  if(serviceMemoMappingMetaV55&&serviceMemoMappingMetaV55.restoring)banner='<div class="mb-3 rounded-xl bg-blue-50 border border-blue-100 px-3 py-3 text-sm text-[#003DA5] font-bold"><i class="fas fa-circle-notch fa-spin mr-2"></i>Loading the saved comparison snapshot once…</div>';
  else if(serviceMemoMappingMetaV55&&serviceMemoMappingMetaV55.restoreError&&!allRows.length)banner=`<div class="mb-3 rounded-xl bg-amber-50 border border-amber-200 px-3 py-3 text-sm text-amber-800 font-bold flex items-center justify-between gap-2"><span><i class="fas fa-circle-info mr-2"></i>${svcMapEsc_(serviceMemoMappingMetaV55.restoreError)}</span><button class="px-3 py-2 rounded-xl bg-white border" onclick="refreshServiceMemoMapping()"><i class="fas fa-rotate mr-1"></i>Refresh saved data</button></div>`;
  else if(!allRows.length)banner='<div class="mb-3 rounded-xl bg-slate-50 border border-slate-200 px-3 py-3 text-sm text-slate-600 font-bold"><i class="fas fa-arrow-up-from-bracket mr-2"></i>Import a 2026 Memo Form + Work Order Form template. Later imports replace only the month(s) in the new file.</div>';
  else banner=`<div class="mb-3 grid grid-cols-1 md:grid-cols-4 gap-2"><div class="rounded-xl bg-slate-50 border p-3"><div class="text-[10px] font-black text-slate-400">SAVED ROWS</div><div class="text-xl font-black text-slate-800">${allSummary.all}</div></div><div class="rounded-xl bg-emerald-50 border border-emerald-100 p-3"><div class="text-[10px] font-black text-emerald-600">MATCHED</div><div class="text-xl font-black text-emerald-700">${allSummary.matched}</div></div><div class="rounded-xl bg-rose-50 border border-rose-100 p-3"><div class="text-[10px] font-black text-rose-600">UNMATCHED</div><div class="text-xl font-black text-rose-700">${allSummary.unmatched}</div></div><div class="rounded-xl bg-blue-50 border border-blue-100 p-3"><div class="text-[10px] font-black text-[#003DA5]">MATCH RATE</div><div class="text-xl font-black text-[#003DA5]">${allSummary.percent}%</div></div></div>`;
  const totalPages=Math.max(1,Math.ceil(filtered.length/CES_SERVICE_MEMO_V55_PAGE_SIZE));if(serviceMemoMappingPageV55>totalPages)serviceMemoMappingPageV55=totalPages;const start=(serviceMemoMappingPageV55-1)*CES_SERVICE_MEMO_V55_PAGE_SIZE,pageRows=filtered.slice(start,start+CES_SERVICE_MEMO_V55_PAGE_SIZE);
  const body=pageRows.map(row=>{const source=row.source||{},match=row.match||{},workOrder=source.workOrder||{},matched=row.status==='MATCHED';return`<tr class="border-b border-slate-100 hover:bg-slate-50"><td class="p-3"><span class="px-2 py-1 rounded-lg text-[10px] font-black ${matched?'bg-emerald-50 text-emerald-700':'bg-rose-50 text-rose-700'}">${row.status}</span><div class="text-[9px] text-slate-400 mt-1">${Number(row.score||0)}%</div></td><td class="p-3 whitespace-nowrap font-bold text-slate-600">${svcMapEsc_(source.date||'-')}</td><td class="p-3 whitespace-nowrap"><span class="px-2 py-1 rounded-lg bg-slate-50 border text-[10px] font-bold">${svcMapEsc_(svcMapTeamCode_(source.team||match.team)||'-')}</span></td><td class="p-3 min-w-[340px]"><div class="font-bold text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis max-w-[370px]" title="${svcMapEsc_(source.customer||'')}">${svcMapEsc_(source.customer||'-')}</div><div class="text-[10px] text-slate-400 whitespace-nowrap">${svcMapEsc_(source.docNo||'-')} · Form ${svcMapEsc_(source.formId||'-')}</div>${source.url?`<a class="text-[#003DA5] font-bold" href="${svcMapSafeUrl_(source.url)}" target="_blank">Open Memo</a>`:''}</td><td class="p-3 min-w-[280px]"><div class="font-bold text-slate-700 whitespace-nowrap overflow-hidden text-ellipsis max-w-[300px]">${svcMapEsc_(workOrder.docNo||'-')}</div>${workOrder.url?`<a class="text-[#003DA5] font-bold" href="${svcMapSafeUrl_(workOrder.url)}" target="_blank">Open Work Order</a>`:''}</td><td class="p-3 min-w-[420px]"><div class="font-bold text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis max-w-[430px]">${svcMapEsc_(match.customerName||match.customer||'-')}</div><div class="text-[10px] text-slate-400 whitespace-nowrap">${svcMapEsc_(match.team||'-')} · ${svcMapEsc_(match.monthOnly||'-')} ${svcMapEsc_(match.year||'')}</div></td><td class="p-3 min-w-[300px] text-[11px] text-slate-500">${svcMapEsc_(row.evidence||'-')}</td></tr>`;}).join('')||'<tr><td colspan="7" class="p-12 text-center text-slate-400">No mapping rows for the selected filters.</td></tr>';
  return`<div class="text-left">${banner}<div class="flex flex-wrap gap-2 mb-3 items-center"><button class="px-3 py-2 rounded-xl text-xs font-black border ${filter.status==='ALL'?'bg-[#003DA5] text-white':'bg-white text-slate-600'}" onclick="setServiceMemoMappingFilter('status','ALL')">All ${allSummary.all}</button><button class="px-3 py-2 rounded-xl text-xs font-black border ${filter.status==='MATCHED'?'bg-emerald-600 text-white':'bg-white text-slate-600'}" onclick="setServiceMemoMappingFilter('status','MATCHED')">Matched ${allSummary.matched}</button><button class="px-3 py-2 rounded-xl text-xs font-black border ${filter.status==='UNMATCHED'?'bg-rose-600 text-white':'bg-white text-slate-600'}" onclick="setServiceMemoMappingFilter('status','UNMATCHED')">Unmatched ${allSummary.unmatched}</button><select class="px-3 py-2 rounded-xl text-xs font-bold border bg-white" onchange="setServiceMemoMappingFilter('month',this.value)"><option value="ALL">All Months</option>${months.map(month=>`<option value="${month}" ${filter.month===month?'selected':''}>${monthNames[month]||month}</option>`).join('')}</select><select class="px-3 py-2 rounded-xl text-xs font-bold border bg-white" onchange="setServiceMemoMappingFilter('team',this.value)"><option value="ALL">All Teams</option>${teams.map(team=>`<option value="${team}" ${filter.team===team?'selected':''}>${team}</option>`).join('')}</select><button class="ml-auto px-3 py-2 rounded-xl text-xs font-black bg-violet-50 text-violet-700 border border-violet-100" onclick="recalculateServiceMemoMapping()"><i class="fas fa-wand-magic-sparkles mr-1"></i>Recalculate Match</button><button class="px-3 py-2 rounded-xl text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-100" onclick="exportServiceMemoMapping()"><i class="fas fa-file-excel mr-1"></i>Export Memo VS CSI</button><button class="px-3 py-2 rounded-xl text-xs font-black bg-blue-50 text-[#003DA5] border border-blue-100" onclick="triggerServiceMemoMappingImport()"><i class="fas fa-arrow-up-from-bracket mr-1"></i>${allRows.length?'Import / Update Month':'Import Template'}</button></div><div class="flex items-center justify-between gap-3 text-[10px] font-bold text-slate-400 mb-2"><span>Showing ${filtered.length?start+1:0}-${Math.min(start+pageRows.length,filtered.length)} of ${filtered.length} · Filter match ${summary.percent}%</span><span class="flex items-center gap-2"><button class="px-2 py-1 rounded-lg border bg-white disabled:opacity-40" ${serviceMemoMappingPageV55<=1?'disabled':''} onclick="setServiceMemoMappingPage(${serviceMemoMappingPageV55-1})">Previous</button><b class="text-slate-600">Page ${serviceMemoMappingPageV55} / ${totalPages}</b><button class="px-2 py-1 rounded-lg border bg-white disabled:opacity-40" ${serviceMemoMappingPageV55>=totalPages?'disabled':''} onclick="setServiceMemoMappingPage(${serviceMemoMappingPageV55+1})">Next</button></span></div><div class="max-h-[72vh] overflow-auto border border-slate-200 rounded-xl"><table class="w-full text-xs min-w-[1680px] table-fixed"><thead class="sticky top-0 z-20 bg-slate-50 text-slate-500"><tr><th class="p-3 w-[110px]">Status</th><th class="p-3 w-[120px]">Date</th><th class="p-3 w-[100px]">Team</th><th class="p-3 w-[340px]">Memo</th><th class="p-3 w-[280px]">Work Order</th><th class="p-3 w-[420px]">Service CSI 2026 Match</th><th class="p-3 w-[300px]">Evidence</th></tr></thead><tbody>${body}</tbody></table></div><p class="text-[10px] text-slate-400 mt-3">Comparison results are saved and reused. Matched requires a score above 70%. A later import updates only its 2026 month(s); other months remain unchanged.</p></div>`;
}
function renderServiceMemoMapping_(){
  const inline=document.getElementById('serviceMemoMappingInlineV266');
  if(inline&&serviceActiveTabV266==='memo'){inline.innerHTML='<div class="ces-service-memo-inline-v266">'+svcMapPopupHtml_()+'</div>';return;}
  if(!serviceMemoMappingPopupOpenV55)return;
  const options={title:'<div class="text-left text-[#003DA5] font-black"><i class="fas fa-code-compare mr-2"></i>Memo / Work Order ↔ Service CSI 2026</div>',html:svcMapPopupHtml_(),width:'min(1920px,99vw)',showConfirmButton:false,showCloseButton:true,customClass:{popup:'rounded-[1.75rem] ces-service-memo-popup-v264'},didClose:()=>{serviceMemoMappingPopupOpenV55=false;}};
  if(Swal.isVisible()&&document.querySelector('.swal2-popup'))Swal.update(options);else Swal.fire(options);
}
async function switchServiceTab(tab){
  serviceActiveTabV266=String(tab||'dashboard').toLowerCase()==='memo'?'memo':'dashboard';
  const dash=document.getElementById('serviceDashboardPanelV266'),memo=document.getElementById('serviceMemoPanelV266');
  const dashBtn=document.getElementById('serviceTabDashboardV266'),memoBtn=document.getElementById('serviceTabMemoV266');
  if(dash)dash.classList.toggle('hidden',serviceActiveTabV266!=='dashboard');
  if(memo)memo.classList.toggle('hidden',serviceActiveTabV266!=='memo');
  if(dashBtn)dashBtn.classList.toggle('active',serviceActiveTabV266==='dashboard');
  if(memoBtn)memoBtn.classList.toggle('active',serviceActiveTabV266==='memo');
  if(serviceActiveTabV266!=='memo')return serviceMemoMappingRowsV55;
  if(!serviceMemoMappingLoadedV55)svcMapCacheLoad_();
  serviceMemoMappingPopupOpenV55=true;
  renderServiceMemoMapping_();
  // Stale-while-revalidate: do not hit the server when a saved browser copy exists.
  if(serviceMemoMappingLoadedV55&&serviceMemoMappingRowsV55.length)return serviceMemoMappingRowsV55;
  return svcMapRestoreSaved_(true);
}
async function openServiceMemoMapping(){return switchServiceTab('memo');}
async function handleServiceMemoMapping(event){
  const input=event&&event.target,file=input&&input.files&&input.files[0];if(!file)return;
  try{
    if(!Array.isArray(serviceRawData)||!serviceRawData.length)throw new Error('Service CSI data is not loaded yet.');if(!window.XLSX)throw new Error('XLSX library is not loaded.');if(!svcMapServiceRows_().length)throw new Error('No Service CSI data for 2026 is loaded.');
    Swal.fire({title:'Importing Memo / Work Order…',html:'Mapping the imported month(s) and preserving every other saved month.',allowOutsideClick:false,showConfirmButton:false,didOpen:()=>Swal.showLoading()});
    const workbook=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});const memoRows=svcMapSheetRows_(workbook.Sheets.Memo,'MEMO'),workOrderRows=svcMapSheetRows_(workbook.Sheets.WorkOrder,'WORK_ORDER');
    if(!memoRows.length&&!workOrderRows.length)throw new Error('No dated 2026 rows were found in Memo or WorkOrder.');const mappingRows=svcBuildMemoMapping_(memoRows,workOrderRows);if(!mappingRows.length)throw new Error('No comparison rows could be created.');
    const importMonths=[...new Set(mappingRows.map(svcMapRowMonth_).filter(Boolean))].sort();if(!importMonths.length)throw new Error('No valid 2026 month was detected.');
    const payload={uploadId:'MM55-'+Date.now()+'-'+Math.random().toString(36).slice(2,8).toUpperCase(),sourceFile:file.name,uploadedAt:new Date().toISOString(),targetYear:2026,importMonths,memoRows,workOrderRows,mappingRows:mappingRows.map(svcMapCompactRow_)};
    serviceMemoMappingRowsV55=svcMapMergeLocal_(mappingRows,importMonths);const localSummary=svcMapSummary_(serviceMemoMappingRowsV55);serviceMemoMappingMetaV55={success:true,version:'V55',uploadId:payload.uploadId,sourceFile:file.name,uploadedAt:payload.uploadedAt,targetYear:2026,rowCount:localSummary.all,mappingRows:localSummary.all,matchedRows:localSummary.matched,unmatchedRows:localSummary.unmatched,matchPercent:localSummary.percent,updatedMonths:importMonths,storageMode:'LOCAL_SAVE_PENDING'};serviceMemoMappingLoadedV55=true;svcMapCacheSave_();
    if(!window.CES_API||typeof window.CES_API.callFunction!=='function')throw new Error('CES API is not ready. The browser copy is saved, but the shared snapshot was not updated.');
    const saved=await window.CES_API.callFunction('saveServiceMemoMapping',[payload],{transport:'iframe',timeoutMs:300000});if(!saved||!saved.success)throw new Error((saved&&saved.message)||'Unable to save the Memo comparison.');
    serviceMemoMappingMetaV55=Object.assign({},saved);serviceMemoMappingFiltersV55={status:'ALL',year:'2026',month:importMonths.length===1?importMonths[0]:'ALL',team:'ALL'};serviceMemoMappingPageV55=1;svcMapCacheSave_();Swal.close();serviceMemoMappingPopupOpenV55=true;renderServiceMemoMapping_();if(typeof showToast==='function')showToast(`Memo comparison updated: ${importMonths.join(', ')} · ${saved.matchPercent}% matched`,'success');
  }catch(error){Swal.close();serviceMemoMappingPopupOpenV55=true;renderServiceMemoMapping_();Swal.fire({icon:serviceMemoMappingRowsV55.length?'warning':'error',title:'Memo Mapping',text:error.message||String(error)});}finally{if(input)input.value='';}
}

window.switchServiceTab=switchServiceTab;
window.openServiceMemoMapping=openServiceMemoMapping;
window.handleServiceMemoMapping=handleServiceMemoMapping;
window.triggerServiceMemoMappingImport=triggerServiceMemoMappingImport;
window.refreshServiceMemoMapping=refreshServiceMemoMapping;
window.setServiceMemoMappingFilter=setServiceMemoMappingFilter;
window.setServiceMemoMappingPage=setServiceMemoMappingPage;
window.exportServiceMemoMapping=exportServiceMemoMapping;
window.recalculateServiceMemoMapping=recalculateServiceMemoMapping;
window.CES_SERVICE_MEMO_RECHECK=function(){const summary=svcMapSummary_(serviceMemoMappingRowsV55);return{success:true,version:'V55',targetYear:2026,latestFunctionNames:true,pageApiRemoved:true,monthlyMerge:true,keywordDateScoring:true,thaiAwareMatching:true,matchThreshold:'>70%',rows:summary.all,matchedRows:summary.matched,unmatchedRows:summary.unmatched,matchPercent:summary.percent,loadedFromCache:serviceMemoMappingLoadedV55,meta:serviceMemoMappingMetaV55};};

