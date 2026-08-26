// ============================================================
// 80-report-management.js
// Extracted from original index.html. Keep load order from index.html.
// ============================================================

const thaiHolidays = [
        "2024-01-01", "2024-02-24", "2024-02-26", "2024-04-06", "2024-04-08",
        "2024-04-13", "2024-04-14", "2024-04-15", "2024-04-16", "2024-05-01",
        "2024-05-04", "2024-05-06", "2024-05-22", "2024-06-03", "2024-07-20",
        "2024-07-22", "2024-07-28", "2024-07-29", "2024-08-12", "2024-10-13",
        "2024-10-14", "2024-10-23", "2024-12-05", "2024-12-10", "2024-12-30", "2024-12-31",
        "2025-01-01", "2025-02-12", "2025-04-06", "2025-04-13", "2025-04-14", "2025-04-15",
        "2025-05-01", "2025-05-04", "2025-05-11", "2025-06-03", "2025-07-10", "2025-07-28",
        "2025-08-12", "2025-10-13", "2025-10-23", "2025-12-05", "2025-12-10", "2025-12-31",
        "2026-01-01", "2026-03-03", "2026-04-06", "2026-04-13", "2026-04-14", "2026-04-15",
        "2026-05-01", "2026-05-04", "2026-05-31", "2026-06-03", "2026-07-29", "2026-07-30",
        "2026-08-12", "2026-10-13", "2026-10-23", "2026-12-05", "2026-12-10", "2026-12-31"
    ];

    let lastRMResult = null;
    let lastRMFormData = null;
    const RM_ALLOWED_COST_CENTERS_V3015 = ['106130','106067','106206','106207','106154'];
    const RM_TEAM_COST_CENTER_V3015 = { MED:'106130', LAB:'106067', EHS:'106206', ENV:'106207', MNG:'106154', MANAGEMENT:'106154', OTHER:'106154' };
    const RM_OLD_COST_CENTER_MAP_V3015 = { '6130':'106130', '6067':'106067', '6206':'106206', '6207':'106207', '6154':'106154' };


    function rmErrorMessageV209(value) {
        if (window.cesSwalMessageV209) return window.cesSwalMessageV209(value);
        if (value == null) return 'Unexpected report error.';
        if (typeof value === 'string') return value;
        if (value && (value.message || value.error || value.details)) return String(value.message || value.error || value.details);
        try { return JSON.stringify(value); } catch (ignore) { return 'Unexpected report error.'; }
    }

    function rmValidateResultV209(res) {
        if (!res || res.success === false) throw new Error(rmErrorMessageV209(res));
        if (!res.templatePDF || !res.timesheetPDF || !Array.isArray(res.tsData)) {
            throw new Error('Report backend returned incomplete output. Please deploy the latest Report Management backend and retry.');
        }
        return res;
    }


    function rmEscapeHtmlV22(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    }
    function rmRenderSheetPreviewV22(targetId, rows, options) {
        const target = document.getElementById(targetId);
        if (!target) return;
        rows = Array.isArray(rows) ? rows : [];
        options = options || {};
        if (!rows.length) {
            target.innerHTML = '<div class="rm-preview-empty"><i class="fas fa-triangle-exclamation"></i><span>No preview data returned.</span></div>';
            return;
        }
        const maxCols = Math.max.apply(null, rows.map(r => Array.isArray(r) ? r.length : 0).concat([1]));
        let html = '<div class="rm-sheet-preview-scroll"><table class="rm-sheet-preview-table"><tbody>';
        rows.forEach((row, ri) => {
            row = Array.isArray(row) ? row : [];
            html += '<tr>';
            for (let ci=0; ci<maxCols; ci++) {
                const text = row[ci] == null ? '' : row[ci];
                const tag = ri <= (options.headerRows || 0) ? 'th' : 'td';
                html += '<'+tag+'>'+rmEscapeHtmlV22(text)+'</'+tag+'>';
            }
            html += '</tr>';
        });
        html += '</tbody></table></div>';
        target.innerHTML = html;
    }
    function rmSetArtifactLinkV22(id, artifact, fallback) {
        const el=document.getElementById(id); if(!el)return;
        const href=(artifact && (artifact.download||artifact.view||artifact.preview)) || fallback || '#';
        el.href=href; el.classList.toggle('pointer-events-none',href==='#'); el.setAttribute('aria-disabled',href==='#'?'true':'false');
    }

    // =========================================================================
    // 🔥 THE ULTIMATE FIREWALL
    // =========================================================================
    document.addEventListener('DOMContentLoaded', () => {
        const rmView = document.getElementById('view-report_manage');
        if (!rmView) return;

        const allViews = document.querySelectorAll('div[id^="view-"]');
        allViews.forEach(view => {
            if (view.id !== 'view-report_manage') {
                const obs = new MutationObserver(mutations => {
                    mutations.forEach(m => {
                        if (m.attributeName === 'class' && !view.classList.contains('hidden')) {
                            rmView.classList.add('hidden');
                        }
                    });
                });
                obs.observe(view, { attributes: true, attributeFilter: ['class'] });
            }
        });

        const selfObs = new MutationObserver(mutations => {
            mutations.forEach(m => {
                if (m.attributeName === 'class') {
                    if (rmView.classList.contains('hidden')) {
                        document.getElementById('rm-resultSection')?.classList.add('hidden');
                        document.getElementById('rm-tablePreviewSection')?.classList.add('hidden');
                        document.getElementById('rm-sendEmailSection')?.classList.add('hidden');
                    } else {
                        fillUserInfoRM();
                    }
                }
            });
        });
        selfObs.observe(rmView, { attributes: true, attributeFilter: ['class'] });

        setInterval(() => {
            if (typeof currentTab !== 'undefined' && currentTab !== 'report_manage' && currentTab !== 'report') {
                if (!rmView.classList.contains('hidden')) {
                    rmView.classList.add('hidden');
                }
            }
        }, 500);

        initReportManage();
    });

    /**
 * ฟังก์ชันดึงข้อมูลพนักงานและเลือกทีมอัตโนมัติ (รองรับ MANAGEMENT)
 */
function fillUserInfoRM() {
    let empName = "", empId = "", dept = "", staffTeam = "", costCenterValue = "";
    let userObj = {};
    
    try {
        const storedUser = localStorage.getItem('user');
        if(storedUser) userObj = JSON.parse(storedUser);
    } catch(e) {}

    if ((!userObj.id && !userObj.empId) && typeof currentUser !== 'undefined' && currentUser) {
        userObj = currentUser;
    }

    empName = userObj.name_th || userObj['Name (TH)'] || userObj.name || "";
    empId = userObj.id || userObj.empId || userObj['ID'] || "";
    dept = userObj.department || userObj.dept || userObj['Department'] || "Clinical Engineering Service";
    staffTeam = userObj.team || userObj.Team || userObj['Team'] || "";
    costCenterValue = String(userObj.costCenter || userObj.cost_center || userObj['Cost Center'] || userObj['CostCenter'] || '').trim();

    document.getElementById('rm-empName').value = empName;
    document.getElementById('rm-empId').value = empId;
    document.getElementById('rm-dept').value = dept;
    const ccList = document.getElementById('rm-costCenterList');
    if (ccList) ccList.innerHTML = RM_ALLOWED_COST_CENTERS_V3015.map(v => `<option value="${v}"></option>`).join('');

    const teamSelect = document.getElementById('rm-mainTeam');
    let targetCode = "";
    if(teamSelect && staffTeam) {
        const teamVal = staffTeam.toString().toUpperCase().trim();
        const mapping = {
           'MEDICAL EQUIPMENT': 'MED',
            'LAB & TESTING': 'LAB',
            'ENVIRONMENTAL HEALTH': 'EHS',
            'MANAGEMENT': 'MNG', // ถ้าใน Sheet เขียนว่า Management ให้เลือก OTHER
            'OTHER': 'MNG',      // ถ้าใน Sheet เขียนว่า Other ให้เลือก OTHER
            'MED': 'MED', 'LAB': 'LAB', 'EHS': 'EHS'
        };
        
        targetCode = mapping[teamVal] || teamVal;
        const exists = Array.from(teamSelect.options).some(opt => opt.value === targetCode);
        if(exists) {
            teamSelect.value = targetCode;
        }
    }
    const ccInput = document.getElementById('rm-costCenter');
    if (ccInput && !ccInput.value) {
        const raw = costCenterValue.replace(/\D/g,'');
        ccInput.value = RM_ALLOWED_COST_CENTERS_V3015.includes(raw) ? raw : (RM_OLD_COST_CENTER_MAP_V3015[raw] || RM_TEAM_COST_CENTER_V3015[String(targetCode || staffTeam || '').toUpperCase()] || '');
    }
}
    function initReportManage() {
        fillUserInfoRM();
        const select = document.getElementById('rm-sigId');
        if (select) select.innerHTML = '<option value="none">Loading signatures…</option>';
        const applySignatures = sigs => {
            sigs = Array.isArray(sigs) && sigs.length ? sigs : [{name:'Blank (No Signature)',id:'none'}];
            if (select) select.innerHTML = sigs.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        };
        const signatureFail = err => {
            console.warn('Signature list unavailable:', err);
            applySignatures([{name:'Blank (No Signature)',id:'none'}]);
        };
        if (window.CES_API && typeof window.CES_API.callFunction === 'function') {
            window.CES_API.callFunction('getRMSignatures', [], {transport:'jsonp', timeoutMs:25000, dedupe:false}).then(applySignatures).catch(signatureFail);
        } else {
            google.script.run.withSuccessHandler(applySignatures).withFailureHandler(signatureFail).getRMSignatures();
        }

        const rowBody = document.getElementById('rm-rowBody');
        if(rowBody && rowBody.children.length === 0) addRowRM(); 
    }

    function askResetRM() {
        Swal.fire({
            title: 'Confirm Reset?',
            text: "All data on the screen and in the generated report will be cleared!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#E4002B',
            cancelButtonColor: '#64748b',
            confirmButtonText: '<i class="fas fa-trash-alt mr-2"></i> Reset Data',
            cancelButtonText: '<i class="fas fa-times mr-2"></i> Cancel',
            customClass: { popup: 'rounded-3xl shadow-xl' }
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({ title: 'Clearing Data...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

                const resetPromise = (window.CES_API && typeof window.CES_API.callFunction === 'function')
                    ? window.CES_API.callFunction('clearRMSheetsInternal', [], {transport:'iframe',timeoutMs:60000,dedupe:false})
                    : Promise.reject(new Error('CES API is unavailable.'));
                resetPromise.then(res => {
                    document.getElementById('rm-rowBody').innerHTML = "";
                    document.getElementById('rm-resultSection').classList.add('hidden');
                    document.getElementById('rm-tablePreviewSection').classList.add('hidden');
                    document.getElementById('rm-sendEmailSection').classList.add('hidden');
                    const costCenter = document.getElementById('rm-costCenter'); if (costCenter) costCenter.value = "";
                    const mainTeam = document.getElementById('rm-mainTeam'); if (mainTeam) mainTeam.value = "";
                    initReportManage();
                    Swal.fire({ icon: 'success', title: 'Reset Successful', text: 'Data has been cleared.', timer: 2000, showConfirmButton: false, customClass: { popup: 'rounded-3xl' } });
                }).catch(err => Swal.fire('Error', 'ไม่สามารถล้างข้อมูลใน Sheet ได้: ' + rmErrorMessageV209(err), 'error'));
            }
        });
    }

    function getHourOptions(selected) {
        let opts = '';
        for(let i=0; i<24; i++) {
            let hr = i.toString().padStart(2, '0') + ':00';
            opts += `<option value="${hr}" ${hr===selected?'selected':''}>${hr}</option>`;
        }
        return opts;
    }

    function addRowRM() {
        const tbody = document.getElementById('rm-rowBody');
        const tr = document.createElement('tr');
        tr.className = "border-b hover:bg-gray-50 transition-colors";
        
        tr.innerHTML = `
            <td class="p-2"><input type="date" class="rm-date w-full bg-white border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-indigo-500 transition-colors" onchange="checkHolidayRM(this); this.classList.remove('border-red-500', 'bg-red-50');"></td>
            <td class="p-2"><input type="text" class="rm-location w-full bg-white border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-indigo-500 transition-colors" placeholder="Location" oninput="this.classList.remove('border-red-500', 'bg-red-50');"></td>
            <td class="p-2">
                <select class="rm-start w-full bg-white border border-gray-200 rounded-lg p-2 text-sm text-center outline-none focus:border-indigo-500 transition-colors cursor-pointer" onchange="calcRM(this); this.classList.remove('border-red-500', 'bg-red-50');">
                    ${getHourOptions('08:00')}
                </select>
            </td>
            <td class="p-2">
                <select class="rm-end w-full bg-white border border-gray-200 rounded-lg p-2 text-sm text-center outline-none focus:border-indigo-500 transition-colors cursor-pointer" onchange="calcRM(this); this.classList.remove('border-red-500', 'bg-red-50');">
                    ${getHourOptions('17:00')}
                </select>
            </td>
            <td class="p-2 text-center"><input type="checkbox" class="rm-holiday w-4 h-4 text-indigo-600 rounded" onchange="calcRM(this)"></td>
            <td class="p-2"><input type="number" class="rm-hrs10 w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm text-center outline-none" placeholder="-" readonly></td>
            <td class="p-2"><input type="number" class="rm-hrs15 w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm text-center outline-none" placeholder="-" readonly></td>
            <td class="p-2 text-center whitespace-nowrap">
                <button onclick="duplicateRowRM(this)" class="text-blue-400 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-all mr-1" title="Duplicate Row">
                    <i class="fas fa-copy"></i>
                </button>
                <button onclick="deleteRowRM(this)" class="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-all" title="Delete Row">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
        calcRM(tr.querySelector('.rm-start')); 
    }

    function duplicateRowRM(btn) {
        const currentRow = btn.closest('tr');
        const tbody = document.getElementById('rm-rowBody');
        const newRow = currentRow.cloneNode(true);
        newRow.querySelector('.rm-date').value = '';
        newRow.querySelector('.rm-date').classList.remove('border-red-500', 'bg-red-50');
        tbody.appendChild(newRow);
        calcRM(newRow.querySelector('.rm-start'));
        updateSummaryRM();
    }

    function deleteRowRM(btn) {
        const tbody = document.getElementById('rm-rowBody');
        if (tbody.children.length > 1) {
            btn.closest('tr').remove();
            updateSummaryRM();
        } else {
            Swal.fire('Warning', 'At least one row is required.', 'warning');
        }
    }

    function checkHolidayRM(element) {
        const row = element.closest('tr');
        const dateVal = row.querySelector('.rm-date').value;
        const holCheck = row.querySelector('.rm-holiday');
        if (dateVal) {
            let isDuplicate = false;
            document.querySelectorAll('.rm-date').forEach(input => {
                if (input !== element && input.value === dateVal) isDuplicate = true;
            });
            if (isDuplicate) {
                Swal.fire({ icon: 'warning', title: 'Duplicate Date', text: 'ไม่สามารถเลือกวันที่ซ้ำกันได้', timer: 2000, showConfirmButton: false, customClass: { popup: 'rounded-3xl' } });
                element.value = ''; holCheck.checked = false; calcRM(element); return;
            }
            const d = new Date(dateVal);
            const day = d.getDay();
            const isThaiHoliday = thaiHolidays.includes(dateVal);
            holCheck.checked = (day === 0 || day === 6 || isThaiHoliday);
        }
        calcRM(element); 
    }

    function setRMRowValues_(tr, data) {
        if (!tr) return;
        const set = (selector, value) => { const node = tr.querySelector(selector); if (node && value != null) node.value = value; };
        set('.rm-date', data.date || '');
        set('.rm-location', data.location || data.team || 'OT');
        set('.rm-start', data.start || '08:00');
        set('.rm-end', data.end || '17:00');
        const hol = tr.querySelector('.rm-holiday');
        if (hol) hol.checked = !!data.isHoliday;
        calcRM(tr.querySelector('.rm-start'));
        if (data.hrs10 != null) set('.rm-hrs10', data.hrs10 || '');
        if (data.hrs15 != null) set('.rm-hrs15', data.hrs15 || '');
    }

    function loadRowsFromOTDashboardRM() {
        const tbody = document.getElementById('rm-rowBody');
        if (!tbody) return;
        const userId = String((document.getElementById('rm-empId') || {}).value || '').trim();
        const rows = Array.isArray(window.CES_OT_DASHBOARD_ROWS) ? window.CES_OT_DASHBOARD_ROWS : [];
        const selected = rows.filter(r => (!userId || String(r.userId || r.empId || '') === userId) && ((Number(r.otHours || 0) > 0) || (Number(r.workHours || 0) > 0)));
        if (!selected.length) {
            if (window.Swal) Swal.fire('OT Dashboard', 'ไม่พบ OT Dashboard data สำหรับพนักงานนี้ ให้เปิด OT Dashboard หรือกด refresh OT ก่อน', 'info');
            return;
        }
        tbody.innerHTML = '';
        selected.slice(0, 31).forEach(r => {
            addRowRM();
            const tr = tbody.lastElementChild;
            setRMRowValues_(tr, { date:r.date || '', location:r.location || r.team || 'OT', start:r.start || '08:00', end:r.end || '17:00', hrs10:r.workHours || r.hrs10 || '', hrs15:r.otHours || r.hrs15 || '', isHoliday:!!r.isHoliday });
        });
        updateSummaryRM();
    }

    function calcRM(element) {
        const row = element.closest('tr');
        const start = row.querySelector('.rm-start').value;
        const end = row.querySelector('.rm-end').value;
        const isHol = row.querySelector('.rm-holiday').checked;
        const h10Input = row.querySelector('.rm-hrs10');
        const h15Input = row.querySelector('.rm-hrs15');

        if (!start || !end) {
            h10Input.value = ""; h15Input.value = ""; updateSummaryRM(); return;
        }

        let sHour = parseInt(start.split(':')[0]) + parseInt(start.split(':')[1]) / 60;
        let eHour = parseInt(end.split(':')[0]) + parseInt(end.split(':')[1]) / 60;
        if (eHour <= sHour) eHour += 24; 

        let lunchDeduct = (sHour <= 12 && eHour >= 13) ? 1 : 0;
        let normalStart = Math.max(sHour, 8);
        let normalEnd = Math.min(eHour, 17);
        let normalHrs = Math.max(0, normalEnd - normalStart) - lunchDeduct;

        let otStart = Math.max(sHour, 17);
        let otEnd = Math.max(eHour, 17);
        let otHrs = Math.max(0, otEnd - otStart);

        let h10 = isHol ? normalHrs : 0;
        let h15 = otHrs;

        h10Input.value = h10 > 0 ? Math.round(h10) : "";
        h15Input.value = h15 > 0 ? Math.round(h15) : "";
        updateSummaryRM();
    }

    function updateSummaryRM() {
        let total10 = 0; let total15 = 0;
        document.querySelectorAll('#rm-rowBody tr').forEach(tr => {
            total10 += parseFloat(tr.querySelector('.rm-hrs10').value) || 0;
            total15 += parseFloat(tr.querySelector('.rm-hrs15').value) || 0;
        });
        const sum10 = document.getElementById('rm-sum10');
        const sum15 = document.getElementById('rm-sum15');
        if (sum10) sum10.innerText = total10 > 0 ? Math.round(total10) : "-";
        if (sum15) sum15.innerText = total15 > 0 ? Math.round(total15) : "-";
    }

    async function generateReportRM() {
        let isComplete = true;
        const empNameInput = document.getElementById('rm-empName');
        const empIdInput = document.getElementById('rm-empId');
        const costCenterInput = document.getElementById('rm-costCenter');
        const mainTeamInput = document.getElementById('rm-mainTeam');

        if (!empNameInput.value) { empNameInput.classList.add('border-red-500', 'bg-red-50'); isComplete = false; }
        if (!empIdInput.value) { empIdInput.classList.add('border-red-500', 'bg-red-50'); isComplete = false; }
        if (!costCenterInput.value) { costCenterInput.classList.add('border-red-500', 'bg-red-50'); isComplete = false; }
        if (!mainTeamInput.value) { mainTeamInput.classList.add('border-red-500', 'bg-red-50'); isComplete = false; }

        let rowData = [];
        document.querySelectorAll('#rm-rowBody tr').forEach(tr => {
            const dateInput = tr.querySelector('.rm-date');
            const locInput = tr.querySelector('.rm-location');
            const startInput = tr.querySelector('.rm-start');
            const endInput = tr.querySelector('.rm-end');
            if(!dateInput.value && !locInput.value) return; 
            if (!dateInput.value) { dateInput.classList.add('border-red-500', 'bg-red-50'); isComplete = false; }
            if (!locInput.value) { locInput.classList.add('border-red-500', 'bg-red-50'); isComplete = false; }
            if (dateInput.value && locInput.value && startInput.value && endInput.value) {
                rowData.push({
                    date: dateInput.value, location: locInput.value, start: startInput.value, end: endInput.value,
                    isHoliday: tr.querySelector('.rm-holiday').checked,
                    hrs10: tr.querySelector('.rm-hrs10').value || 0,
                    hrs15: tr.querySelector('.rm-hrs15').value || 0
                });
            }
        });

        if (!isComplete || rowData.length === 0) {
            Swal.fire('Incomplete Data', 'Please fill in all required fields.', 'error'); return;
        }

        const btn = document.getElementById('rm-generateBtn');
        const btnText = document.getElementById('rm-btnText');
        const btnIcon = document.getElementById('rm-btnIcon');
        const loader = document.getElementById('rm-loadingSpinner');

        btn.disabled = true; btnText.innerText = "GENERATING...";
        btnIcon.classList.add('hidden'); loader.classList.remove('hidden');

        document.getElementById('rm-resultSection').classList.add('hidden');
        document.getElementById('rm-tablePreviewSection').classList.add('hidden');
        document.getElementById('rm-sendEmailSection').classList.add('hidden');

        const formData = {
            empName: empNameInput.value, empId: empIdInput.value,
            dept: document.getElementById('rm-dept').value || "-",
            costCenter: costCenterInput.value, mainTeam: mainTeamInput.value,
            sigId: document.getElementById('rm-sigId').value, rows: rowData
        };

        try {
            const resRaw = await window.CES_API.callFunction('processRM', [formData], { transport:'iframe', timeoutMs:240000, dedupe:false });
            btn.disabled = false; loader.classList.add('hidden'); btnIcon.classList.remove('hidden');
            btnText.innerText = "GENERATE & EXPORT REPORT";
            let res;
            try {
                res = rmValidateResultV209(resRaw);
            } catch (validationError) {
                throw validationError;
            }

            lastRMResult = res;
            lastRMFormData = formData;

            document.getElementById('rm-resultSection').classList.remove('hidden');
            document.getElementById('rm-tablePreviewSection').classList.remove('hidden');
            document.getElementById('rm-sendEmailSection').classList.remove('hidden');

            // Exact inline preview from backend sheet values; no private Sheet iframe dependency.
            rmRenderSheetPreviewV22('rm-tempPdfFrame', res.templatePreviewRows, {headerRows:4});
            rmRenderSheetPreviewV22('rm-tsPdfFrame', res.timesheetPreviewRows, {headerRows:2});
            rmSetArtifactLinkV22('rm-tempPdfView', {download:res.templatePDF.view || res.templatePDF.preview}, res.templatePDF.preview);
            rmSetArtifactLinkV22('rm-tempPdfDown', res.templatePDF, res.templatePDF.download);
            rmSetArtifactLinkV22('rm-tempExcelDown', res.templateExcel, res.excelTemplateUrl);
            rmSetArtifactLinkV22('rm-tsPdfView', {download:res.timesheetPDF.view || res.timesheetPDF.preview}, res.timesheetPDF.preview);
            rmSetArtifactLinkV22('rm-tsPdfDown', res.timesheetPDF, res.timesheetPDF.download);
            rmSetArtifactLinkV22('rm-tsExcelDown', res.timesheetExcel, res.excelTimesheetUrl);

            document.getElementById('rm-tsPreviewBody').innerHTML = res.tsData.map(r => 
                `<tr class="border-b hover:bg-gray-50">` + r.map(c => `<td class="p-3 border-r text-gray-700">${c}</td>`).join('') + `</tr>`
            ).join('');

            window.scrollTo({ top: document.getElementById('rm-resultSection').offsetTop - 30, behavior: 'smooth' });
            if (typeof currentTab === 'undefined' || currentTab === 'report_manage' || currentTab === 'report') {
                Swal.fire({ icon: 'success', title: 'Report Generated!', text: 'Your report is ready.', timer: 2200, showConfirmButton: false, customClass: { popup: 'rounded-3xl shadow-lg' } });
            }
        } catch (err) {
            btn.disabled = false; loader.classList.add('hidden'); btnIcon.classList.remove('hidden');
            btnText.innerText = "GENERATE & EXPORT REPORT";
            console.error('Report Management:', err);
            if (typeof currentTab === 'undefined' || currentTab === 'report_manage' || currentTab === 'report') {
                Swal.fire('Error', rmErrorMessageV209(err), 'error');
            }
        }
    }

    function sendToManagerRM() {
        if(!lastRMResult || !lastRMFormData) return;
        const btn = document.getElementById('rm-sendBtn');
        const spinner = document.getElementById('rm-sendSpinner');

        Swal.fire({
            title: 'Send to Manager?',
            text: `ยืนยันการร่างเมลส่งให้หัวหน้าทีม ${lastRMFormData.mainTeam} หรือไม่?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Send it!',
            customClass: { popup: 'rounded-3xl' }
        }).then((result) => {
            if (result.isConfirmed) {
                btn.disabled = true;
                spinner.classList.remove('hidden');
                window.CES_API.callFunction('sendEmailRM', [lastRMFormData, lastRMResult], {transport:'iframe',timeoutMs:120000,dedupe:false}).then(response => {
                    btn.disabled = false; spinner.classList.add('hidden');
                    Swal.fire({ icon: 'success', title: 'Sent!', text: 'Email has been sent to your manager successfully.', customClass: { popup: 'rounded-3xl' } });
                    document.getElementById('rm-sendEmailSection').classList.add('hidden');
                }).catch(error => { btn.disabled=false; spinner.classList.add('hidden'); Swal.fire('Error', rmErrorMessageV209(error), 'error'); });
            }
        });
    }

    /** Canonical user-facing entry point; keeps report_manage internals compatible. */
    function initOTGenerate(force) { return initReportManage(force); }
    window.initOTGenerate = initOTGenerate;
