// ============================================================
// 110-users-management.js
// Extracted from original index.html. Keep load order from index.html.
// ============================================================

let _userCache = null; 
    let _permConfig = {};
    const ALL_MODULES = [
        { id:'portal',name:'Home',group:'Main Dashboard',icon:'fa-house' },
        { id:'management_overview',name:'Management Overview',group:'Main Dashboard',icon:'fa-chart-line' },
        { id:'yearly',name:'Job Dashboard',group:'Main Dashboard',icon:'fa-chart-pie' },
        { id:'revenue',name:'Revenue Dashboard',group:'Main Dashboard',icon:'fa-hand-holding-usd' },
        { id:'ot',name:'OT Dashboard',group:'Main Dashboard',icon:'fa-clock' },
        { id:'service',name:'Service CSI',group:'Performance',icon:'fa-clipboard-check' },
        { id:'report',name:'Report CSI',group:'Performance',icon:'fa-chart-bar' },
        { id:'memo_workorder',name:'Memo & Work Order',group:'Performance',icon:'fa-file-circle-check' },
        { id:'calendar',name:'Calendar',group:'Operation',icon:'fa-calendar-alt' },
        { id:'checkin',name:'Check-in',group:'Operation',icon:'fa-map-marker-alt' },
        { id:'car_booking',name:'Car Booking',group:'Operation',icon:'fa-car-side' },
        { id:'van_booking',name:'Van Booking',group:'Operation',icon:'fa-van-shuttle' },
        { id:'weekly',name:'Weekly Report',group:'Operation',icon:'fa-calendar-check' },
        { id:'kpi',name:'KPI Tracking',group:'Operation',icon:'fa-chart-line' },
        { id:'report_manage',name:'OT Generate',group:'Operation',icon:'fa-file-invoice-dollar' },
        { id:'master_cal_pm_plan',name:'Master CAL/PM Plan',group:'Information',icon:'fa-screwdriver-wrench' },
        { id:'audit_log',name:'Audit Log',group:'Information',icon:'fa-clipboard-list' },
        { id:'stock_dashboard',name:'Infusion Pump Dashboard',group:'Inventory',icon:'fa-chart-pie' },
        { id:'inventory',name:'Inventory',group:'Inventory',icon:'fa-boxes-stacked' },
        { id:'check_stock',name:'Check Stock',group:'Inventory',icon:'fa-qrcode' },
        { id:'team_information',name:'Team Information',group:'Information',icon:'fa-address-book' },
        { id:'team_plan',name:'Team Plan',group:'Information',icon:'fa-calendar-days' },
        { id:'monthly_report',name:'Monthly Report',group:'Information',icon:'fa-file-circle-check' },
        { id:'setting',name:'Setting',group:'System',icon:'fa-cogs' },
        { id:'users',name:'User Management',group:'System',icon:'fa-users-cog' },
        { id:'ces_evaluation',name:'CES Hub Evaluation',group:'System',icon:'fa-star-half-stroke' },
        { id:'ces_ai_knowledge',name:'CES AI Knowledge',group:'System',icon:'fa-robot' },
        { id:'health',name:'System Health',group:'System',icon:'fa-heart-pulse' }
    ];

    function getPermissionModulesV228() {
        const byId = new Map(ALL_MODULES.map(m => [m.id, Object.assign({}, m)]));
        const ordered = [];
        const seen = new Set();
        document.querySelectorAll('#sidebar-menu .menu-group').forEach(group => {
            const groupName = (group.querySelector(':scope > div span')?.textContent || 'Other').trim();
            group.querySelectorAll(':scope > [data-ces-tab]').forEach(btn => {
                const id = String(btn.dataset.cesTab || '').trim();
                if (!id || seen.has(id)) return;
                const meta = byId.get(id) || {};
                const label = (btn.querySelector('span')?.textContent || meta.name || id).trim();
                const iconEl = btn.querySelector('i');
                const icon = iconEl ? Array.from(iconEl.classList).find(c => /^fa-/.test(c) && c !== 'fa-fw') : null;
                ordered.push({ id, name:label, group:groupName || meta.group || 'Other', icon:icon || meta.icon || 'fa-cube' });
                seen.add(id);
            });
        });
        ALL_MODULES.forEach(m => { if (!seen.has(m.id)) ordered.push(Object.assign({},m)); });
        return ordered;
    }
    window.CES_PERMISSION_MODULES_V228 = getPermissionModulesV228;


    function initUsers() {
        if (_userCache) {
            renderApprovalSection();
            filterUserTable();
        } else {
            refreshUserList();
        }
    }

    function refreshUserList(force = false) {
        if(force) _userCache = null;
        const tbody = document.getElementById('user-list-tbody');
        tbody.innerHTML = '<tr><td colspan="6" class="p-12 text-center text-gray-400 italic"><div class="flex flex-col items-center"><i class="fas fa-circle-notch fa-spin text-2xl mb-3 text-[#003DA5]"></i>Fetching user data...</div></td></tr>';
        google.script.run.withSuccessHandler(data => {
            _userCache = data;
            renderApprovalSection();
            filterUserTable();
        }).withFailureHandler(err => {
            tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-red-500">Error: ${err.message}</td></tr>`;
        }).getAllUsers();
    }

    function renderApprovalSection() {
        const pending = _userCache.filter(u => u && (u.pending === true || /^PENDING/.test(String(u.status || '').toUpperCase())));
        const sec = document.getElementById('approval-section');
        const cont = document.getElementById('approval-container');
        
        if (pending.length === 0) {
            sec.classList.add('hidden');
            return;
        }
        
        sec.classList.remove('hidden');
        cont.innerHTML = pending.map(u => `
            <div class="bg-white border border-[#003DA5] rounded-2xl p-4 shadow-sm relative overflow-hidden group">
                <div class="absolute top-0 right-0 w-16 h-16 bg-[#003DA5] rounded-bl-full -z-10 group-hover:bg-[#003DA5] transition-colors"></div>
                <div class="flex gap-3 mb-3">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-[#003DA5] to-[#004aad] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-md">
                        ${(u.name_eng || u.name_th || u.id).charAt(0).toUpperCase()}
                    </div>
                    <div class="min-w-0 flex-1">
                        <p class="font-bold text-gray-800 text-sm truncate">${u.name_eng || u.name_th}</p>
                        <p class="text-[10px] text-gray-500 truncate">${u.email || u.id}</p>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="handleApprove('${u.id}', ${u.rowIndex})" class="flex-1 bg-[#003DA5]/10 text-[#003DA5] hover:bg-[#003DA5] hover:text-white py-2 rounded-xl text-xs font-bold transition-all border border-[#003DA5] hover:border-[#003DA5]">
                        <i class="fas fa-check mr-1"></i> Approve
                    </button>
                    <button onclick="handleReject('${u.id}', ${u.rowIndex})" class="flex-1 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white py-2 rounded-xl text-xs font-bold transition-all border border-red-100 hover:border-red-500">
                        <i class="fas fa-times mr-1"></i> Reject
                    </button>
                </div>
            </div>
        `).join('');
    }

    function filterUserTable() {
        const query = (document.getElementById('user-search').value || '').toLowerCase();
        const activeUsers = _userCache.filter(u => !(u && (u.pending === true || /^PENDING/.test(String(u.status || '').toUpperCase()))));
        
        const filtered = activeUsers.filter(u => 
            (u.name_eng && u.name_eng.toLowerCase().includes(query)) ||
            (u.name_th && u.name_th.toLowerCase().includes(query)) ||
            (u.team && u.team.toLowerCase().includes(query)) ||
            (u.id && u.id.toLowerCase().includes(query))
        );
        const tbody = document.getElementById('user-list-tbody');
        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-gray-400 italic">No users found matching "${query}"</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map((u, i) => {
            let roleColor = 'gray';
            if(u.role === 'ADMIN') roleColor = 'blue';
            else if(u.role === 'MANAGER') roleColor = 'amber';
            else if(u.role === 'SUPERVISOR') roleColor = 'indigo';
            else if(u.role === 'STAFF') roleColor = 'slate';

            return `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="p-4 border-r text-center text-xs text-gray-400 font-bold">${i+1}</td>
                <td class="p-4 border-r">
                    <p class="font-bold text-gray-800 text-sm">${u.name_eng || u.name_th}</p>
                    <p class="text-[10px] text-gray-500">${u.email || u.id}</p>
                </td>
                <td class="p-4 border-r">
                    <span class="bg-gray-100 text-gray-600 px-2 py-1 rounded text-[10px] font-bold tracking-wider">${u.team || '-'}</span>
                    <p class="text-[11px] text-gray-500 mt-1 truncate max-w-[150px]">${u.position || '-'}</p>
                </td>
                <td class="p-4 border-r text-center">
                    <span class="bg-${roleColor}-100 text-${roleColor}-700 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase shadow-sm">${u.role}</span>
                </td>
                <td class="p-4 border-r text-center">
                    <span class="text-[#003DA5] text-xs font-bold"><i class="fas fa-circle text-[8px] mr-1"></i> Active</span>
                </td>
                <td class="p-4 text-center">
                    <button onclick="editUser('${u.id}')" class="text-indigo-500 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 p-2 rounded-lg transition-colors" title="Edit Role">
                        <i class="fas fa-pen"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');
    }

    function handleApprove(id, row) {
        Swal.fire({
            title: 'Approving...',
            text: 'Updating Staff_Data and sending the approval email.',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        google.script.run
            .withSuccessHandler(res => {
                if (res && res.success) {
                    const mailOk = !!(res.mail && res.mail.success);
                    const mailError = res.mail && res.mail.error || '';

                    Swal.fire({
                        icon: mailOk ? 'success' : 'warning',
                        title: 'Account Approved',
                        html:
                            '<p>Employee ID <b>' + id + '</b> is now active.</p>' +
                            (mailOk
                                ? '<p>✅ Approved email sent to the requester.</p>'
                                : '<p>⚠️ Account was approved, but the approved email could not be sent.</p>' +
                                  (mailError ? '<p class="text-xs text-slate-500">' + mailError + '</p>' : '')),
                        confirmButtonColor:'#004aad'
                    });

                    refreshUserList(true);
                } else {
                    Swal.fire(
                        'Error',
                        (res && res.message) || 'Approval failed.',
                        'error'
                    );
                }
            })
            .withFailureHandler(err => {
                Swal.fire(
                    'Approval Error',
                    (err && err.message) || 'Unable to approve the user.',
                    'error'
                );
            })
            .approveUser(id, row);
    }

    function handleReject(id, row) {
        Swal.fire({
            title: 'Reject User?', text: "They will be removed from the system.", icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#E4002B', confirmButtonText: 'Yes, Reject'
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({ title: 'Rejecting...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                google.script.run.withSuccessHandler(res => {
                    if(res.success) {
                        Swal.fire({ icon: 'success', title: 'Rejected', timer: 1500, showConfirmButton: false });
                        refreshUserList(true);
                    } else Swal.fire('Error', res.message, 'error');
                }).rejectUser(id, row);
            }
        });
    }

    function editUser(id) {
        const user = _userCache.find(u => u.id === id);
        if(!user) return;
        
        document.getElementById('edit-row').value = user.rowIndex;
        document.getElementById('edit-name').value = user.name_eng || user.name_th;
        document.getElementById('edit-email').value = user.email;
        
        document.getElementById('edit-team').value = ['MED','LAB','EHS','ENV','TES','QM','IT','MNG'].includes(String(user.team||'').toUpperCase()) ? String(user.team).toUpperCase() : 'MNG';
        document.getElementById('edit-position').value = user.position || '';
        document.getElementById('edit-role').value = user.role;

        document.getElementById('edit-costCenter').value = user.costCenter || '';
        document.getElementById('edit-supervisor').value = user.supervisor || '';
        document.getElementById('edit-empType').value = user.empType || '';
        document.getElementById('edit-tel').value = user.tel || '';

        document.getElementById('editUserModal').classList.remove('hidden');
    }

    function saveUserEdit() {
        const updates = {
            rowIndex: parseInt(document.getElementById('edit-row').value),
            team: document.getElementById('edit-team').value,
            position: document.getElementById('edit-position').value,
            role: document.getElementById('edit-role').value,
            costCenter: document.getElementById('edit-costCenter').value,
            supervisor: document.getElementById('edit-supervisor').value,
            empType: document.getElementById('edit-empType').value,
            tel: document.getElementById('edit-tel').value
        };
        const btn = document.querySelector('#editUserModal button:last-child');
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Saving...';
        btn.disabled = true;
        google.script.run.withSuccessHandler(res => {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
            if(res.success) {
                document.getElementById('editUserModal').classList.add('hidden');
                Swal.fire({ icon: 'success', title: 'Saved', text: 'User profile updated.', timer: 1500, showConfirmButton: false });
                refreshUserList(true);
            } else Swal.fire('Error', res.message, 'error');
        }).withFailureHandler(err => {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
            Swal.fire('Error', err.message, 'error');
        }).saveUserChange(updates);
    }

    function openPermissionModal() {
        // ROLE4: enforce the current 4-role matrix every time it opens.
        const roleModal = document.getElementById('permissionModal');
        if (roleModal) {
            const note = roleModal.querySelector('[data-role-permission-note]');
            if (note) note.innerHTML = '<b>Note:</b> ADMIN always has full access. Configure MANAGER, SUPERVISOR and STAFF for every CES Hub module.';
            const headRow = roleModal.querySelector('thead tr');
            if (headRow) headRow.innerHTML = `
              <th class="p-4 border-b border-blue-400/30 text-left text-white bg-[#003DA5]">MODULE NAME</th>
              <th class="p-4 border-b border-blue-400/30 text-center text-white bg-[#003DA5]">ADMIN</th>
              <th class="p-4 border-b border-blue-400/30 text-center text-white bg-[#003DA5]">MANAGER</th>
              <th class="p-4 border-b border-blue-400/30 text-center text-white bg-[#003DA5]">SUPERVISOR</th>
              <th class="p-4 border-b border-blue-400/30 text-center text-white bg-[#003DA5]">STAFF</th>`;
        }
        // V22.8: the permission dialog can be opened from Setting as well as User Management.
        // Move the fixed modal outside a hidden view so ancestor display:none never suppresses it.
        const permissionModalV228 = document.getElementById('permissionModal');
        if (permissionModalV228 && permissionModalV228.parentElement !== document.body) document.body.appendChild(permissionModalV228);
        const defaultPerms = {
            'MANAGER': [
                'portal', 'management_overview', 'yearly', 'revenue', 'ot',
                'service', 'report', 'memo_workorder',
                'calendar', 'checkin', 'car_booking', 'van_booking', 'weekly', 'kpi', 'report_manage',
                'stock_dashboard', 'inventory', 'check_stock',
                'team_information', 'team_plan', 'monthly_report', 'ces_evaluation'
            ],
            'SUPERVISOR': [
                'portal', 'management_overview', 'yearly', 'revenue', 'ot',
                'service', 'report',
                'calendar', 'checkin', 'car_booking', 'van_booking', 'weekly', 'kpi', 'report_manage',
                'stock_dashboard', 'inventory', 'check_stock', 'team_information'
            ],
            'STAFF': [
                'portal', 'management_overview',
                'checkin', 'car_booking', 'van_booking', 'weekly', 'report_manage', 'kpi',
                'stock_dashboard', 'inventory', 'check_stock', 'team_information'
            ],
            'ADMIN': getPermissionModulesV228().map(m => m.id)
        };

        if (!globalPermissions) {
            _permConfig = JSON.parse(JSON.stringify(defaultPerms));
        } else {
            _permConfig = JSON.parse(JSON.stringify(globalPermissions));

            // Auto-add missing arrays to avoid old Config breaking new modules.
            ['ADMIN', 'MANAGER', 'SUPERVISOR', 'STAFF'].forEach(role => {
                if (!_permConfig[role]) _permConfig[role] = defaultPerms[role] || [];
            });

            // ADMIN always sees every module.
            _permConfig.ADMIN = getPermissionModulesV228().map(m => m.id);
        }

        renderPermissionTable();
        if (permissionModalV228) permissionModalV228.classList.remove('hidden');
    }

    function renderPermissionTable() {
        const roles = ['ADMIN', 'MANAGER', 'SUPERVISOR', 'STAFF'];
        const tbody = document.getElementById('perm-tbody');
        if (!tbody) return;

        let currentGroup = '';
        const rows = [];

        getPermissionModulesV228().forEach(mod => {
            if (mod.group !== currentGroup) {
                currentGroup = mod.group;
                rows.push(`
                    <tr class="bg-slate-50">
                        <td colspan="5" class="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                            ${currentGroup}
                        </td>
                    </tr>
                `);
            }

            let rowHtml = `
                <tr class="hover:bg-indigo-50/30 transition-colors">
                    <td class="p-4 border-r text-sm font-bold text-gray-700">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <i class="fas ${mod.icon || 'fa-cube'} text-xs"></i>
                            </div>
                            <div>
                                <div>${mod.name}</div>
                                <div class="text-[10px] text-slate-400 font-bold">${mod.id}</div>
                            </div>
                        </div>
                    </td>
            `;

            roles.forEach(role => {
                let isChecked = false;

                if (role === 'ADMIN') {
                    isChecked = true;
                } else if (_permConfig[role] && _permConfig[role].includes(mod.id)) {
                    isChecked = true;
                }

                const disabled = role === 'ADMIN' ? 'disabled' : '';
                rowHtml += `
                    <td class="p-4 text-center bg-gray-50/20">
                        <input type="checkbox"
                               class="perm-chk w-5 h-5 accent-indigo-600 cursor-pointer rounded border-gray-300 focus:ring-indigo-500"
                               data-role="${role}"
                               data-mod="${mod.id}"
                               ${isChecked ? 'checked' : ''}
                               ${disabled}>
                    </td>
                `;
            });

            rows.push(rowHtml + '</tr>');
        });

        tbody.innerHTML = rows.join('');
        updatePermissionSummaryV228(_permConfig);
    }

    function updatePermissionSummaryV228(source) {
        try {
            const modules = getPermissionModulesV228();
            const total = modules.length;
            const perms = source && typeof source === 'object' ? source : ((typeof globalPermissions !== 'undefined' && globalPermissions) ? globalPermissions : _permConfig || {});
            const validIds = new Set(modules.map(m => m.id));
            const count = role => role === 'ADMIN' ? total : Array.from(new Set((perms[role] || []).filter(id => validIds.has(id)))).length;
            const write = (id, value) => { const el=document.getElementById(id); if(el) el.textContent=String(value); };
            write('perm-count-admin-v228', count('ADMIN'));
            write('perm-count-manager-v228', count('MANAGER'));
            write('perm-count-supervisor-v228', count('SUPERVISOR'));
            write('perm-count-staff-v228', count('STAFF'));
            write('perm-count-total-v228', total);
        } catch(ignore) {}
    }
    window.updatePermissionSummaryV228 = updatePermissionSummaryV228;

    function savePermissions() {
        const newPerms = { ADMIN: [], MANAGER: [], SUPERVISOR: [], STAFF: [] };

        // ADMIN always receives all modules; only the other roles are editable.
        newPerms.ADMIN = getPermissionModulesV228().map(m => m.id);
        document.querySelectorAll('.perm-chk:checked').forEach(chk => {
            const r = chk.dataset.role;
            const m = chk.dataset.mod;
            if (!newPerms[r]) newPerms[r] = [];
            if (!newPerms[r].includes(m)) newPerms[r].push(m);
        });

        ['MANAGER', 'SUPERVISOR', 'STAFF'].forEach(role => {
            if (!newPerms[role].includes('portal')) newPerms[role].unshift('portal');
        });

        Swal.fire({
            title: 'Saving permissions...',
            text: 'Updating sidebar module access',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        const normalizedJson = value => {
            try {
                const parsed = typeof value === 'string' ? JSON.parse(value || '{}') : (value || {});
                const out = {};
                ['ADMIN', 'MANAGER', 'SUPERVISOR', 'STAFF'].forEach(role => {
                    out[role] = Array.isArray(parsed[role])
                        ? Array.from(new Set(parsed[role].map(String))).sort()
                        : [];
                });
                return JSON.stringify(out);
            } catch (e) { return ''; }
        };
        const requestedJson = normalizedJson(newPerms);

        const readBackPermissions = async () => {
            if (!window.CES_API || typeof window.CES_API.callFunction !== 'function') return null;
            const cfg = await window.CES_API.callFunction(
                'getSystemSettings', [], { transport: 'jsonp', timeoutMs: 30000 }
            );
            if (!cfg || !cfg.ROLE_PERMISSIONS) return null;
            const parsed = JSON.parse(cfg.ROLE_PERMISSIONS);
            return normalizedJson(parsed) === requestedJson ? parsed : null;
        };

        const commitUi = savedPerms => {
            globalPermissions = savedPerms;
            _permConfig = JSON.parse(JSON.stringify(savedPerms));
            try { localStorage.setItem('ces_role_permissions_v21', JSON.stringify(savedPerms)); } catch(e) {}
            document.getElementById('permissionModal')?.classList.add('hidden');
            if (currentUser && typeof applyRolePermissions === 'function') applyRolePermissions(currentUser.role);
            Swal.fire({
                icon: 'success', title: 'Saved',
                text: 'Sidebar module permissions updated.',
                timer: 1500, showConfirmButton: false
            });
        };

        const failUi = err => {
            Swal.fire(
                'Error',
                'เกิดข้อผิดพลาดในการบันทึก: ' + ((err && err.message) || err || 'Unknown error'),
                'error'
            );
        };

        const saveThroughApi = async () => {
            if (!window.CES_API || typeof window.CES_API.callFunction !== 'function') {
                throw new Error('CES API is not available.');
            }

            let firstError = null;
            try {
                // Reliable write path for GitHub Pages: no-cors POST plus the
                // existing async operation-status poller.
                const res = await window.CES_API.callFunction(
                    'saveRolePermissions',
                    [JSON.stringify(newPerms)],
                    { transport: 'iframe', timeoutMs: 45000 }
                );
                if (res && res.success) {
                    return (res.permissions && typeof res.permissions === 'object') ? res.permissions : newPerms;
                }
                throw new Error((res && res.message) || 'Unable to save permissions');
            } catch (err) {
                firstError = err;
            }

            // A response can be lost after the Sheet write completed. Confirm
            // the Config value before attempting a second write.
            try {
                const verified = await readBackPermissions();
                if (verified) return verified;
            } catch (ignore) {}

            try {
                // Canonical small-request fallback for restricted POST clients.
                const res = await window.CES_API.callFunction(
                    'saveRolePermissions',
                    [JSON.stringify(newPerms)],
                    { transport: 'jsonp', timeoutMs: 30000 }
                );
                if (res && res.success) {
                    return (res.permissions && typeof res.permissions === 'object') ? res.permissions : newPerms;
                }
                throw new Error((res && res.message) || 'Unable to save permissions');
            } catch (fallbackError) {
                try {
                    const verified = await readBackPermissions();
                    if (verified) return verified;
                } catch (ignore) {}
                throw fallbackError || firstError || new Error('Unable to save permissions');
            }
        };

        if (window.CES_API && typeof window.CES_API.callFunction === 'function') {
            saveThroughApi().then(commitUi).catch(failUi);
            return;
        }

        google.script.run
            .withSuccessHandler(res => {
                if (res && res.success) {
                    commitUi((res.permissions && typeof res.permissions === 'object') ? res.permissions : newPerms);
                } else {
                    failUi((res && res.message) || 'Unable to save permissions');
                }
            })
            .withFailureHandler(failUi)
            .saveRolePermissions(JSON.stringify(newPerms));
    }

window.refreshPermissionSummaryV228=function(){try{updatePermissionSummaryV228();}catch(e){}};

function setAllRolePermissionsV240_(role,checked){role=String(role||'').toUpperCase();if(role==='ADMIN')return;document.querySelectorAll('.perm-chk[data-role="'+role+'"]').forEach(function(chk){chk.checked=!!checked;});}
window.setAllRolePermissionsV240_=setAllRolePermissionsV240_;
