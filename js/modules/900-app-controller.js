// ============================================================
// 900-app-controller.js
// Extracted from original index.html. Keep load order from index.html.
// ============================================================

// ============================================================
    // CES Hub — Controller Script  (Dual Login: Browser + LINE LIFF)
    // ============================================================

    // ---------- Global App Variables ----------
    let currentTab  = 'portal';
    let currentUser = null;
    let currentRole = null;

    // Data Caches
    let globalCalData     = [];
    let globalYearlyStats = [];
    let globalConfig      = { MED: 12, LAB: 3, EHS: 3 };
    let globalPermissions = null;

    const CES_TAB_RUNTIME_V20 = {initialized:Object.create(null),lastSync:Object.create(null)};
    const CES_SYNC_POLICY = {
        calendar:60000, car_booking:30000, van_booking:30000, stock_dashboard:60000, inventory:60000, check_stock:30000
    };
    // Tabs not listed above initialize once per page session and then use cached/local data until manual refresh or full page reload.
    const CES_LIVE_TABS_V20 = Object.keys(CES_SYNC_POLICY).reduce(function(out,key){out[key]=true;return out;},{});
    const CES_CORE_CACHE_KEY_V20 = 'CES_CORE_DATA_CACHE_V20';
    let CES_CORE_LOAD_PROMISE = null;
    function cesLoadCoreDataOnDemand_(){
        if(CES_CORE_LOAD_PROMISE)return CES_CORE_LOAD_PROMISE;
        if(!window.CES_API||typeof window.CES_API.callFunction!=='function')return Promise.resolve(null);
        CES_CORE_LOAD_PROMISE=window.CES_API.callFunction('getCoreReadModelV267',[false],{transport:'jsonp',timeoutMs:60000,dedupe:true})
          .then(function(data){if(data&&typeof data==='object'){cesApplyCoreDataV20_(data);cesStoreCoreCacheV20_(data);}return data;})
          .catch(function(error){console.warn('[Core lazy load]',error);return null;})
          .finally(function(){CES_CORE_LOAD_PROMISE=null;});
        return CES_CORE_LOAD_PROMISE;
    }
    function cesApplyCoreDataV20_(data){
        if(!data||typeof data!=='object')return;
        if(data.config){globalConfig=data.config;try{if(data.config.ROLE_PERMISSIONS)globalPermissions=JSON.parse(data.config.ROLE_PERMISSIONS);}catch(e){}if(typeof window.cesApplyTeamColorConfig==='function')window.cesApplyTeamColorConfig(globalConfig);}
        globalYearlyStats=data.yearlyStats||globalYearlyStats||[];globalCalData=data.calSummary||globalCalData||[];
        if(currentUser)applyRolePermissions(currentUser.role);
        if(typeof renderYearlyStats==='function')renderYearlyStats(globalYearlyStats,globalConfig);
        if(typeof initCalendar==='function'&&!CES_TAB_RUNTIME_V20.initialized.calendar)initCalendar(globalCalData);
        if(typeof renderManagementOverviewDashboard==='function')renderManagementOverviewDashboard();
    }
    function cesRestoreCoreCacheV20_(){try{var c=JSON.parse(localStorage.getItem(CES_CORE_CACHE_KEY_V20)||'null');if(c&&c.data)cesApplyCoreDataV20_(c.data);}catch(e){}}
    function cesStoreCoreCacheV20_(data){try{localStorage.setItem(CES_CORE_CACHE_KEY_V20,JSON.stringify({at:Date.now(),data:data}));}catch(e){}}
    function cesTabNeedsInitV20_(tab){
        if(!CES_TAB_RUNTIME_V20.initialized[tab])return true;
        if(!CES_LIVE_TABS_V20[tab])return false;
        return Date.now()-Number(CES_TAB_RUNTIME_V20.lastSync[tab]||0)>Number(CES_SYNC_POLICY[tab]||60000);
    }
    function cesRefreshCalendarV20_(){
        if(typeof initCalendar==='function')initCalendar(globalCalData);
        if(!window.CES_API||typeof window.CES_API.callFunction!=='function')return;
        window.CES_API.callFunction('getCalendarData',[true],{transport:'jsonp',timeoutMs:60000}).then(function(rows){
            if(Array.isArray(rows)){globalCalData=rows;initCalendar(globalCalData);try{var cache=JSON.parse(localStorage.getItem(CES_CORE_CACHE_KEY_V20)||'{}');if(cache.data){cache.data.calSummary=rows;cache.at=Date.now();localStorage.setItem(CES_CORE_CACHE_KEY_V20,JSON.stringify(cache));}}catch(ignore){}}
        }).catch(function(error){console.warn('[V20 calendar refresh]',error);});
    }
    function cesRunTabInitV20_(tab){
        if(!cesTabNeedsInitV20_(tab))return;
        var isLive=!!CES_LIVE_TABS_V20[tab];
        CES_TAB_RUNTIME_V20.initialized[tab]=true;CES_TAB_RUNTIME_V20.lastSync[tab]=Date.now();
        if      (tab === 'portal'        && typeof initPortalDashboard === 'function') initPortalDashboard(false);
        else if (tab === 'management_overview' && typeof renderManagementOverviewDashboard === 'function') { cesLoadCoreDataOnDemand_().then(function(){renderManagementOverviewDashboard();}); }
        else if (tab === 'calendar') cesRefreshCalendarV20_();
        else if (tab === 'yearly'        && typeof renderYearlyStats === 'function') { cesLoadCoreDataOnDemand_().then(function(){renderYearlyStats(globalYearlyStats, globalConfig);}); }
        else if (tab === 'checkin'       && typeof initCheckin === 'function') initCheckin();
        else if (tab === 'revenue'       && typeof loadRevenueData === 'function') loadRevenueData();
        else if (tab === 'car_booking'   && typeof initVehicleBooking === 'function') initVehicleBooking('CAR', isLive);
        else if (tab === 'van_booking'   && typeof initVehicleBooking === 'function') initVehicleBooking('VAN', isLive);
        else if (tab === 'team_information' && typeof initTeamInformation === 'function') initTeamInformation();
        else if (tab === 'team_plan' && typeof window.initTeamPlanV225 === 'function') window.initTeamPlanV225();
        else if (tab === 'monthly_report' && typeof window.initMonthlyReportV226 === 'function') window.initMonthlyReportV226();
        else if (tab === 'users'         && typeof initUsers === 'function') initUsers();
        else if (tab === 'ces_evaluation' && typeof window.initCesHubEvaluationV22 === 'function') window.initCesHubEvaluationV22();
        else if (tab === 'ces_ai_knowledge' && typeof window.initCesAiKnowledgeV225 === 'function') window.initCesAiKnowledgeV225();
        else if (tab === 'setting'       && typeof initSettings === 'function') initSettings();
        else if (tab === 'health') { if (typeof initSystemHealthV17 === 'function') initSystemHealthV17(); else if (typeof initSystemHealthV14 === 'function') initSystemHealthV14(); }
        else if (tab === 'service') { if (typeof window.loadServiceCSIOnly === 'function') window.loadServiceCSIOnly(false); else if (typeof applyServiceFilters === 'function') applyServiceFilters(); }
        else if (tab === 'report') { if (typeof window.loadReportCSIOnly === 'function') window.loadReportCSIOnly(false); else if (typeof applyReportFilters === 'function') applyReportFilters(); }
        else if (tab === 'memo_workorder' && typeof initMemoWorkOrder === 'function') initMemoWorkOrder(false);
        else if (tab === 'ot'            && typeof initOTData === 'function') initOTData();
        else if (tab === 'weekly'        && typeof initWeekly === 'function') initWeekly();
        else if (tab === 'report_manage' && typeof initReportManage === 'function') initReportManage();
        else if (tab === 'kpi'           && typeof initKPITab === 'function') initKPITab();
        else if (tab === 'stock_dashboard' && typeof initStockDashboardModule === 'function') initStockDashboardModule(isLive);
        else if (tab === 'inventory'       && typeof initStockInventoryModule === 'function') initStockInventoryModule(isLive);
        else if (tab === 'check_stock'     && typeof initStockCheckModule === 'function') initStockCheckModule(isLive);
    }

    // ---------- LIFF / LINE Variables ----------
    const LIFF_ID = String((window.CES_CONFIG && window.CES_CONFIG.LINE_OA && window.CES_CONFIG.LINE_OA.LIFF_ID) || '2009944147-iluulCQj');
    let pendingLineProfile = null;             // Holds LINE profile while waiting for Employee-ID entry
    let pendingLineIdToken = null;             // Holds LINE idToken for server-side verification


    // ---------- Remembered login / latest usage V50 ----------
    const CES_AUTH_SESSION_KEY_V50 = 'CES_AUTH_SESSION_V50';
    const CES_LAST_USAGE_KEY_V50 = 'CES_LAST_USAGE_V50';
    const CES_AUTH_SESSION_TTL_V50 = 30 * 24 * 60 * 60 * 1000;
    const CES_ACTIVE_TAB_KEY_V60 = 'CES_ACTIVE_TAB_V60';
    const CES_VALID_TABS_V60 = ['portal','management_overview','yearly','revenue','ot','service','report','memo_workorder','calendar','checkin','car_booking','van_booking','weekly','report_manage','kpi','stock_dashboard','inventory','check_stock','team_information','team_plan','monthly_report','users','ces_evaluation','ces_ai_knowledge','setting','health'];
    let cesUsageHeartbeatV50 = null;
    let cesUsageLastApiV50 = { module:'', action:'', at:0 };

    function cesUsageSourceV50_() {
        return isLineEnvironment() ? 'line' : 'web';
    }
    function cesShouldRememberLoginV60_() {
        try {
            if (typeof window.cesRememberLoginEnabledV60_ === 'function') return !!window.cesRememberLoginEnabledV60_();
            return localStorage.getItem('CES_REMEMBER_LOGIN_V60') !== '0';
        } catch (e) {
            return true;
        }
    }
    function cesAuthStoreV60_() {
        return cesShouldRememberLoginV60_() ? localStorage : sessionStorage;
    }
    function cesStoreCurrentUserV60_(user) {
        if (!user) return;
        try {
            const target = cesAuthStoreV60_();
            target.setItem('ces_user', JSON.stringify(user));
            const other = target === localStorage ? sessionStorage : localStorage;
            other.removeItem('ces_user');
        } catch (e) {}
    }
    function cesValidTabV60_(tab) {
        tab = String(tab || '').toLowerCase().trim();
        if (tab === 'home') tab = 'portal';
        if (tab === 'dashboard' || tab === 'management-overview') tab = 'management_overview';
        return CES_VALID_TABS_V60.indexOf(tab) !== -1 ? tab : '';
    }
    function cesPersistActiveTabV60_(tab) {
        tab = cesValidTabV60_(tab);
        if (!tab) return '';
        try {
            sessionStorage.setItem(CES_ACTIVE_TAB_KEY_V60, tab);
            localStorage.setItem(CES_ACTIVE_TAB_KEY_V60, tab);
        } catch (e) {}
        try {
            const url = new URL(window.location.href);
            url.hash = 'tab=' + encodeURIComponent(tab);
            history.replaceState(history.state, document.title, url.pathname + url.search + url.hash);
        } catch (e) {}
        return tab;
    }
    function cesReadActiveTabV60_() {
        try {
            return cesValidTabV60_(sessionStorage.getItem(CES_ACTIVE_TAB_KEY_V60)) ||
                cesValidTabV60_(localStorage.getItem(CES_ACTIVE_TAB_KEY_V60));
        } catch (e) {
            return '';
        }
    }
    function cesVisibleTabV60_() {
        for (let i = 0; i < CES_VALID_TABS_V60.length; i++) {
            const tab = CES_VALID_TABS_V60[i];
            const view = document.getElementById('view-' + tab);
            if (view && !view.classList.contains('hidden')) return tab;
        }
        return '';
    }
    function cesSessionIdV50_() {
        let id = localStorage.getItem('CES_BROWSER_SESSION_ID_V50') || '';
        if (!id) {
            id = 'SES50-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10).toUpperCase();
            localStorage.setItem('CES_BROWSER_SESSION_ID_V50', id);
        }
        return id;
    }
    function cesReadRememberedSessionV50_() {
        const stores = cesShouldRememberLoginV60_() ? [localStorage, sessionStorage] : [sessionStorage];
        for (let s = 0; s < stores.length; s++) {
            try {
                const store = stores[s];
                const raw = store.getItem(CES_AUTH_SESSION_KEY_V50);
                if (!raw) continue;
                const session = JSON.parse(raw);
                if (!session || !session.user || !session.user.id) {
                    store.removeItem(CES_AUTH_SESSION_KEY_V50);
                    continue;
                }
                const lastActive = Date.parse(session.lastActiveAt || session.loginAt || 0) || 0;
                if (!lastActive || Date.now() - lastActive > CES_AUTH_SESSION_TTL_V50) {
                    store.removeItem(CES_AUTH_SESSION_KEY_V50);
                    continue;
                }
                return session;
            } catch (e) {}
        }
        return null;
    }
    function cesPersistSessionV50_(user, tab, action) {
        if (!user || !user.id) return null;
        const previous = cesReadRememberedSessionV50_();
        const now = new Date().toISOString();
        const session = {
            version:'V50',
            sessionId:cesSessionIdV50_(),
            user:user,
            loginAt:(previous && previous.user && String(previous.user.id) === String(user.id) && previous.loginAt) || now,
            lastActiveAt:now,
            lastTab:tab || (previous && previous.lastTab) || 'portal',
            lastAction:action || 'ACTIVE',
            source:cesUsageSourceV50_()
        };
        try {
            const target = cesAuthStoreV60_();
            const other = target === localStorage ? sessionStorage : localStorage;
            target.setItem(CES_AUTH_SESSION_KEY_V50, JSON.stringify(session));
            target.setItem('ces_user', JSON.stringify(user));
            other.removeItem(CES_AUTH_SESSION_KEY_V50);
            other.removeItem('ces_user');
            localStorage.setItem('ces_last_employee_id', String(user.id));
            localStorage.setItem(CES_LAST_USAGE_KEY_V50, JSON.stringify({
                employeeId:user.id,lastTab:session.lastTab,lastAction:session.lastAction,
                lastActiveAt:session.lastActiveAt,sessionId:session.sessionId
            }));
            cesPersistActiveTabV60_(session.lastTab);
        } catch (e) {}
        return session;
    }
    function cesRememberedTabV50_() {
        const active = cesReadActiveTabV60_();
        if (active) return active;
        const session = cesReadRememberedSessionV50_();
        return session && session.lastTab ? cesValidTabV60_(session.lastTab) : '';
    }
    function cesRecordLatestUsageV50_(action, moduleName, force) {
        if (!currentUser || !currentUser.id) return;
        const session = cesPersistSessionV50_(currentUser, moduleName || currentTab || 'portal', action || 'ACTIVE');
        if (!session || !window.CES_API || typeof window.CES_API.callFunction !== 'function') return;
        const now = Date.now();
        const moduleKey = moduleName || currentTab || 'portal';
        if (!force && cesUsageLastApiV50.module === moduleKey && cesUsageLastApiV50.action === action && now - cesUsageLastApiV50.at < 60000) return;
        cesUsageLastApiV50 = {module:moduleKey, action:action || 'ACTIVE', at:now};
        const payload = {
            employeeId:currentUser.id,
            name:currentUser.name_eng || currentUser.name_th || '',
            team:currentUser.team || '', role:currentUser.role || '',
            loginAt:session.loginAt, lastActiveAt:session.lastActiveAt,
            lastTab:session.lastTab, module:moduleKey, action:action || 'ACTIVE',
            source:session.source, sessionId:session.sessionId
        };
        window.CES_API.callFunction('recordUserLastUsage', [payload], {transport:'jsonp', timeoutMs:15000}).catch(function(){});
    }
    function cesStartUsageHeartbeatV50_() {
        if (cesUsageHeartbeatV50) clearInterval(cesUsageHeartbeatV50);
        cesUsageHeartbeatV50 = setInterval(function(){
            if (!document.hidden && currentUser) cesRecordLatestUsageV50_('ACTIVE', currentTab || 'portal', false);
        }, 45000);
    }


    // ============================================================
    // AUTHENTICATION
    // ============================================================

    /**
     * First-time LINE link UX:
     * after Staff_Data is linked successfully, send "เมนู" back into
     * the OA chat so the webhook can immediately respond with the
     * authenticated Quick Menu / Flex flow, then close LIFF.
     */
    async function cesLineReturnToChatAfterLink_(sendFallbackStart) {
        try {
            if (
                typeof window.liff === 'undefined' ||
                typeof liff.isInClient !== 'function' ||
                !liff.isInClient()
            ) return false;

            // Backend normally pushes "CES Hub Connected" + Main Menu directly.
            // Only send a user message when that push failed, avoiding a duplicate
            // menu bubble in the normal successful path.
            if (
                sendFallbackStart &&
                typeof liff.sendMessages === 'function'
            ) {
                await liff.sendMessages([
                    {
                        type: 'text',
                        text: 'เริ่มต้นใช้งาน'
                    }
                ]);
            }

            setTimeout(function(){
                try {
                    if (typeof liff.closeWindow === 'function') {
                        liff.closeWindow();
                    }
                } catch (ignore) {}
            }, 450);

            return true;
        } catch (error) {
            console.warn(
                '[LIFF] Unable to return to OA Quick Menu automatically:',
                error && error.message ? error.message : error
            );
            return false;
        }
    }


    /**
     * Called after a successful login.
     * @param {object}  user      – the user object from the backend
     * @param {boolean} skipLink  – true  → already linked, no need to write LINE ID
     *                              false → first-time LINE user, write LINE ID now
     */
    function onLoginSuccess(user, skipLink = true, loginAction = 'LOGIN') {
        currentUser = user;
        window.CES_CURRENT_USER = currentUser;
        window.currentUser = currentUser;
        currentRole = String(user.role || '').trim().toUpperCase();
        currentUser.role = currentRole;

        // ── LINE Account Linking (runs silently in background) ──
        // First-time LINE user: after Employee ID login, link LINE account by verified idToken.
        if (!skipLink && pendingLineProfile && pendingLineIdToken) {
            const profile = pendingLineProfile;
            const token   = pendingLineIdToken;

            pendingLineProfile = null;          // clear immediately – prevent double write
            pendingLineIdToken = null;

            google.script.run
                .withSuccessHandler((res) => {
                    console.log('[LIFF] Account link result:', res);

                    if (String(res).indexOf('Linked:') === 0) {
                        currentUser.lineUserId = profile.userId;
                        currentUser.lineName   = profile.displayName;
                        cesStoreCurrentUserV60_(currentUser);

                        // Native LINE OA onboarding:
                        // backend pushes Connected + Quick Menu; only fall back to
                        // a start message when that server push was unavailable.
                        const pushOk = String(res || '').indexOf('|PUSH_OK') >= 0;
                        cesLineReturnToChatAfterLink_(!pushOk);
                    } else {
                        console.warn('[LIFF] Linking failed:', res);
                    }
                })
                .withFailureHandler(err => {
                    console.warn('[LIFF] Linking failed (non-critical):', err.message);
                })
                .updateStaffLineDataByToken(user.id, token);
        }

        cesPersistSessionV50_(user, cesRememberedTabV50_() || 'portal', loginAction);
        cesStartUsageHeartbeatV50_();
        cesRecordLatestUsageV50_(loginAction, cesRememberedTabV50_() || 'portal', true);

        document.getElementById('login-container').classList.add('hidden');
        document.getElementById('main-dashboard').classList.remove('hidden');
        document.getElementById('main-dashboard').classList.add('flex');

        updateProfileUI();
        cesFastStartV19_();
    }

    function updateProfileUI() {
        if (!currentUser) return;
        const displayName = currentUser.name_eng || currentUser.name_th || currentUser.id;
        document.getElementById('user-name-display').innerText = displayName;
        document.getElementById('user-role-display').innerText = `${currentUser.position} | ${currentUser.team}`;
    }

    function logout() {
        cesRecordLatestUsageV50_('LOGOUT', currentTab || 'portal', true);
        Swal.fire({
            title: 'Signing out...',
            text: 'See you next time!',
            timer: 1000,
            showConfirmButton: false,
            didOpen: () => { Swal.showLoading(); }
        }).then(() => {
            localStorage.removeItem('ces_user');
            localStorage.removeItem(CES_AUTH_SESSION_KEY_V50);
            sessionStorage.removeItem('ces_user');
            sessionStorage.removeItem(CES_AUTH_SESSION_KEY_V50);
            currentUser      = null;
            window.CES_CURRENT_USER = null;
            window.currentUser = null;
            currentRole      = null;
            pendingLineProfile = null;
            pendingLineIdToken = null;

            // Also log out of LIFF when running inside LINE
            try {
                if (typeof liff !== 'undefined' && liff.isInClient && liff.isInClient()) {
                    liff.logout();
                }
            } catch (e) { /* ignore */ }

            document.getElementById('main-dashboard').classList.add('hidden');
            document.getElementById('main-dashboard').classList.remove('flex');
            document.getElementById('login-container').classList.remove('hidden');

            if (document.getElementById('loginId')) document.getElementById('loginId').value = localStorage.getItem('ces_last_employee_id') || '';
            const btnLogin = document.getElementById('btnLogin');
            if (btnLogin) {
                btnLogin.innerHTML = 'Login / Check ID <i class="fas fa-arrow-right ml-2"></i>';
                btnLogin.disabled  = false;
            }
        });
    }


    // ============================================================
    // PERMISSIONS
    // ============================================================

    function cesForceAdminSystemMenuV221_() {
        var role = String((currentUser && currentUser.role) || (window.currentUser && window.currentUser.role) || currentRole || '').trim().toUpperCase();
        if (role !== 'ADMIN') return false;
        ['setting','users','ces_evaluation','ces_ai_knowledge','health','team_information','team_plan','monthly_report'].forEach(function(id){
            var btn=document.getElementById('btn-'+id);
            if(btn){btn.classList.remove('hidden');btn.removeAttribute('hidden');btn.style.removeProperty('display');}
        });
        var evalBtn=document.getElementById('btn-ces_evaluation');
        if(evalBtn){var grp=evalBtn.closest('.menu-group');if(grp)grp.classList.remove('hidden');}
        return true;
    }
    window.cesForceAdminSystemMenuV221 = cesForceAdminSystemMenuV221_;

    function applyRolePermissions(role) {
        role = String(role || '').trim().toUpperCase();
        const allTabs = Array.from(document.querySelectorAll('#sidebar-menu [data-ces-tab]'))
            .map(btn => String(btn.getAttribute('data-ces-tab') || '').trim())
            .filter((id, index, list) => id && list.indexOf(id) === index);

        // Hide all first
        allTabs.forEach(id => {
            const btn = document.getElementById('btn-' + id);
            if (btn) btn.classList.add('hidden');
        });
        // Show according to role
        if (role === 'ADMIN') {
            allTabs.forEach(id => {
                const btn = document.getElementById('btn-' + id);
                if (btn) btn.classList.remove('hidden');
            });
        } else if (globalPermissions && globalPermissions[role]) {
            globalPermissions[role].forEach(tabId => {
                const btn = document.getElementById('btn-' + tabId);
                if (btn) btn.classList.remove('hidden');
            });
        } else {
            if (role === 'STAFF') {
                ['portal','management_overview','checkin','service','memo_workorder','ot','calendar','car_booking','van_booking','weekly','report_manage','kpi','team_information','team_plan','monthly_report'].forEach(t => {
                    const btn = document.getElementById('btn-' + t);
                    if (btn) btn.classList.remove('hidden');
                });
            }
            if (role === 'MANAGER') {
                ['portal','management_overview','yearly','revenue','ot','service','report','memo_workorder','calendar','checkin','car_booking','van_booking','weekly','report_manage','kpi','stock_dashboard','inventory','check_stock','team_information','team_plan','monthly_report','ces_evaluation'].forEach(t => {
                    const btn = document.getElementById('btn-' + t);
                    if (btn) btn.classList.remove('hidden');
                });
            }
            if (role === 'SUPERVISOR') {
                ['portal','management_overview','checkin','service','report','memo_workorder','ot','calendar','car_booking','van_booking','yearly','revenue','weekly','report_manage','kpi','stock_dashboard','inventory','check_stock','team_information','team_plan','monthly_report'].forEach(t => {
                    const btn = document.getElementById('btn-' + t);
                    if (btn) btn.classList.remove('hidden');
                });
            }
        }

        const portalButtonV185 = document.getElementById('btn-portal');
        if (portalButtonV185) portalButtonV185.classList.remove('hidden');

        // Smart group hiding
        document.querySelectorAll('.menu-group').forEach(group => {
            const visibleButtons = Array.from(group.querySelectorAll('button')).filter(btn => !btn.classList.contains('hidden'));
            group.classList.toggle('hidden', visibleButtons.length === 0);
        });

        cesForceAdminSystemMenuV221_();

        const canConfigureSystem = role === 'ADMIN' ||
            (globalPermissions && Array.isArray(globalPermissions[role]) && globalPermissions[role].includes('setting'));

        if (!canConfigureSystem) {
            if (!document.getElementById('admin-css-guard')) {
                const style = document.createElement('style');
                style.id = 'admin-css-guard';
                style.innerHTML = `button[onclick*="SettingsModal"], button[onclick*="saveConfig"], .fa-cog { display: none !important; }`;
                document.head.appendChild(style);
            }
        } else {
            const guard = document.getElementById('admin-css-guard');
            if (guard) guard.remove();
        }
    }


    // ============================================================
    // NAVIGATION & UI
    // ============================================================

    function toggleSidebar() {
        const sidebar = document.getElementById('sidebar-menu');
        if (sidebar) {
            sidebar.classList.toggle('hidden');
            sidebar.classList.toggle('flex');
        }
    }

    function cesCanAccessTabV228_(tab) {
        tab = cesValidTabV60_(tab);
        if (!tab) return false;
        var role = String((currentUser && currentUser.role) || currentRole || '').trim().toUpperCase();
        if (role === 'ADMIN') return true;
        if (tab === 'portal') return true;
        if (globalPermissions && Array.isArray(globalPermissions[role])) return globalPermissions[role].indexOf(tab) >= 0;
        var btn = document.getElementById('btn-' + tab);
        return !!(btn && !btn.classList.contains('hidden'));
    }
    window.cesCanAccessTabV228 = cesCanAccessTabV228_;

    function switchTab(tab) {
        var previousTabV4 = currentTab;
        tab = cesValidTabV60_(tab) || cesReadActiveTabV60_() || 'portal';
        if (currentUser && !cesCanAccessTabV228_(tab)) {
            var role = String(currentUser.role || '').trim().toUpperCase();
            var allowed = (globalPermissions && globalPermissions[role]) || [];
            var fallback = allowed.find(function(id){ return cesCanAccessTabV228_(id); }) || 'portal';
            console.warn('[V22.8 permission] blocked tab:', tab, 'role:', role);
            if (fallback !== tab) { setTimeout(function(){ switchTab(fallback); }, 0); }
            return;
        }
        if (!document.getElementById('view-' + tab) && typeof window.CES_loadDeferredModules === 'function') {
            window.CES_loadDeferredModules().then(function(){ switchTab(tab); }).catch(function(error){ console.warn('[V19 lazy module]', error); });
            return;
        }
        currentTab = tab;
        window.currentTab = tab;
        cesPersistActiveTabV60_(tab);
        document.body.setAttribute('data-ces-active-tab', tab);
        if (window.CES_UI && typeof window.CES_UI.normalize === 'function') window.CES_UI.normalize();
        if (currentUser) cesRecordLatestUsageV50_('ENTER_MODULE', tab, false);
        

        const allBtns = document.querySelectorAll('.nav-item');
        allBtns.forEach(btn => btn.classList.remove('active','bg-slate-50','text-indigo-600'));

        const activeBtn = document.getElementById(`btn-${tab}`);
        if (activeBtn) activeBtn.classList.add('active','bg-slate-50','text-indigo-600');
        // Re-assert the active navigation after any UI normalizer/runtime patch.
        // This prevents Home from remaining highlighted when Memo & Work Order (or any deferred tab) is open.
        requestAnimationFrame(function () {
            document.querySelectorAll('.nav-item').forEach(function (btn) {
                btn.classList.toggle('active', btn.getAttribute('data-ces-tab') === tab);
                btn.classList.toggle('bg-slate-50', btn.getAttribute('data-ces-tab') === tab);
                btn.classList.toggle('text-indigo-600', btn.getAttribute('data-ces-tab') === tab);
            });
        });

        const views = ['portal','management_overview','service','report','memo_workorder','yearly','revenue','calendar','checkin','car_booking','van_booking','team_information','team_plan','monthly_report','users','ces_evaluation','ces_ai_knowledge','setting','health','ot','weekly','report_manage','kpi','stock_dashboard','inventory','check_stock'];
        views.forEach(v => {
            const el = document.getElementById(`view-${v}`);
            if (el) { el.classList.add('hidden'); el.classList.remove('slide-up'); }
        });

        const activeView = document.getElementById(`view-${tab}`);
        if (activeView) { activeView.classList.remove('hidden'); activeView.classList.add('slide-up'); }

        const titles = {
            portal: 'Home', management_overview: 'Management Overview', service: 'Service CSI', report: 'Report CSI', memo_workorder:'Memo & Work Order',
            yearly: 'Job Dashboard', revenue: 'Revenue Dashboard',
            calendar: 'Master Calendar', checkin: 'Check-in',
            car_booking: 'Car Booking', van_booking: 'Van Booking', team_information: 'Team Information', team_plan:'Team Plan', monthly_report:'Monthly Report',
            users: 'User Management', ces_evaluation:'CES Hub Evaluation', ces_ai_knowledge:'CES AI Knowledge', setting: 'Setting', health: 'System Health Check',
            ot: 'OT Dashboard', weekly: 'Weekly Report',
            report_manage: 'Report Management',
            kpi: 'KPI Tracking',
            stock_dashboard: 'Infusion Pump Dashboard',
            inventory: 'Inventory',
            check_stock: 'Check Stock'
        };
        const headerTitle = document.getElementById('header-page-title');
        if (headerTitle) headerTitle.innerText = titles[tab] || 'Dashboard';
        // Canonical active-state writer. Deferred views and runtime wrappers must not leave Home selected.
        window.CES_ACTIVE_TAB = tab;
        setTimeout(function(){
          document.querySelectorAll('.nav-item').forEach(function(btn){var on=btn.getAttribute('data-ces-tab')===tab;btn.classList.toggle('active',on);btn.classList.toggle('bg-slate-50',on);btn.classList.toggle('text-indigo-600',on);});
          var h=document.getElementById('header-page-title');if(h)h.innerText=titles[tab]||'Dashboard';
          document.body.setAttribute('data-ces-active-tab',tab);
        },120);


        if (previousTabV4 === tab && activeView && !activeView.classList.contains('hidden')) {
            // The initial tab is already named `portal` before the first render.  The
            // old early-return skipped its initializer, leaving Home with CES Team,
            // --:--:-- and an empty Applications grid.  Run the idempotent tab
            // initializer before returning; cesRunTabInitV20_ de-duplicates it.
            cesRunTabInitV20_(tab);
            if (window.CES_LANGUAGE && typeof window.CES_LANGUAGE.apply === 'function') window.CES_LANGUAGE.apply();
            return;
        }

        cesRunTabInitV20_(tab);

        // Auto-close sidebar on mobile
        if (window.innerWidth < 768) {
            const sidebar = document.getElementById('sidebar-menu');
            if (sidebar && !sidebar.classList.contains('hidden') && typeof toggleSidebar === 'function') toggleSidebar();
        }
    }


    // ============================================================
    // MODALS — Profile
    // ============================================================

    function openProfileModal() {
        if (!currentUser) return;

        document.getElementById('prof-id').value       = currentUser.id       || '';
        document.getElementById('prof-role').value     = currentUser.role     || '';
        document.getElementById('prof-name-eng').value = currentUser.name_eng || '';
        document.getElementById('prof-name-th').value  = currentUser.name_th  || '';
        document.getElementById('prof-email').value    = currentUser.email    || '';
        document.getElementById('prof-team').value     = currentUser.team     || '';
        document.getElementById('prof-position').value = currentUser.position || '';

        const costCenterEl  = document.getElementById('prof-costCenter');
        const empTypeEl     = document.getElementById('prof-empType');
        const supervisorEl  = document.getElementById('prof-supervisor');
        const telEl         = document.getElementById('prof-tel');

        if (costCenterEl)  costCenterEl.value  = currentUser.costCenter  || currentUser.cost_center || '-';
        if (empTypeEl)     empTypeEl.value     = currentUser.empType     || currentUser.emp_type    || '-';
        if (supervisorEl)  supervisorEl.value  = currentUser.supervisor  || '-';
        if (telEl)         telEl.value         = currentUser.tel         || '-';

        // V24.7 — show the exact LINE OA account bound to this CES Hub user.
        const lineStatusEl = document.getElementById('prof-line-status');
        const lineNameEl = document.getElementById('prof-line-name');
        const lineUserIdEl = document.getElementById('prof-line-user-id');
        const linkedLineId = String(currentUser.lineUserId || '').trim();
        const linkedLineName = String(currentUser.lineName || '').trim();
        if (lineStatusEl) {
            lineStatusEl.innerText = linkedLineId ? '✅ Connected to CES Hub LINE OA' : '⚠️ LINE OA is not connected';
            lineStatusEl.className = linkedLineId ? 'text-xs font-bold text-emerald-700 mt-1' : 'text-xs font-bold text-amber-700 mt-1';
        }
        if (lineNameEl) lineNameEl.value = linkedLineName || (linkedLineId ? 'Connected LINE account' : '-');
        if (lineUserIdEl) lineUserIdEl.value = linkedLineId || '-';

        document.getElementById('profileModal').classList.remove('hidden');
    }

    function closeProfileModal() {
        document.getElementById('profileModal').classList.add('hidden');
    }

    function saveProfileChanges() {
        const updates = {
            id:       currentUser.id,
            name_eng: document.getElementById('prof-name-eng').value,
            name_th:  document.getElementById('prof-name-th').value,
            email:    document.getElementById('prof-email').value
        };
        const btn = document.querySelector('#profileModal button:last-child');
        const originalBtnHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        btn.disabled  = true;

        google.script.run
            .withSuccessHandler(res => {
                btn.innerHTML = originalBtnHtml;
                btn.disabled  = false;
                if (res.success) {
                    currentUser.name_eng = updates.name_eng;
                    currentUser.name_th  = updates.name_th;
                    currentUser.email    = updates.email;
                    window.CES_CURRENT_USER = currentUser;
                    window.currentUser = currentUser;
                    cesStoreCurrentUserV60_(currentUser);
                    updateProfileUI();
                    closeProfileModal();
                    Swal.fire({ icon: 'success', title: 'Saved', text: 'Profile updated successfully', timer: 1500, showConfirmButton: false });
                } else {
                    Swal.fire('Error', res.message, 'error');
                }
            })
            .withFailureHandler(err => {
                btn.innerHTML = originalBtnHtml;
                btn.disabled  = false;
                Swal.fire('Error', err.message, 'error');
            })
            .updateUserProfile(updates);
    }


    // ============================================================
    // MODALS — Reset
    // ============================================================

    function openResetModal() {
        let targetName = currentTab.toUpperCase();
        if (currentTab === 'calendar') targetName = 'CALENDAR SUMMARY';
        if (currentTab === 'management_overview') targetName = 'MANAGEMENT OVERVIEW (Read-Only)';
        if (currentTab === 'portal')   targetName = 'HOME PORTAL (Read-Only)';
        if (document.getElementById('resetTargetName')) document.getElementById('resetTargetName').innerText = targetName;
        if (document.getElementById('resetModal'))      document.getElementById('resetModal').classList.remove('hidden');
    }

    function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

    function confirmReset() {
        closeModal('resetModal');
        if (currentTab === 'management_overview' || currentTab === 'portal') return;
        document.getElementById('loadingOverlay').classList.remove('hidden');

        let fn = '';
        if (currentTab === 'service')  fn = 'clearServiceData';
        else if (currentTab === 'report')   fn = 'clearReportData';
        else if (currentTab === 'calendar') fn = 'clearCalendarData';

        if (fn) {
            google.script.run
                .withSuccessHandler(() => {
                    document.getElementById('loadingOverlay').classList.add('hidden');
                    Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1500, showConfirmButton: false });
                    loadAllData();
                })
                .withFailureHandler(e => {
                    document.getElementById('loadingOverlay').classList.add('hidden');
                    Swal.fire('Error', e.message, 'error');
                })[fn]();
        } else {
            document.getElementById('loadingOverlay').classList.add('hidden');
        }
    }



    function getRequestedTabFromUrl() {
        try {
            const params = new URLSearchParams(window.location.search || '');
            const hashParams = new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''));
            let tab = params.get('cesTab') || params.get('tab') || params.get('module') || params.get('app') || hashParams.get('cesTab') || hashParams.get('tab') || hashParams.get('module') || hashParams.get('app') || '';
            tab = String(tab || '').toLowerCase().trim();
            const alias = {
                home: 'portal',
                portal: 'portal',
                dashboard: 'management_overview',
                'management-overview': 'management_overview',
                'job-dashboard': 'yearly',
                job_dashboard: 'yearly',
                yearly: 'yearly',
                'revenue-dashboard': 'revenue',
                revenue_dashboard: 'revenue',
                'ot-dashboard': 'ot',
                ot_dashboard: 'ot',
                csi: 'service',
                'service-csi': 'service',
                'report-csi': 'report',
                report_csi: 'report',
                'master-calendar': 'calendar',
                master_calendar: 'calendar',
                'check-in': 'checkin',
                check_in: 'checkin',
                'car-booking': 'car_booking',
                car_booking: 'car_booking',
                'van-booking': 'van_booking',
                van_booking: 'van_booking',
                'team-information': 'team_information',
                team_information: 'team_information',
                'team-plan': 'team_plan',
                team_plan: 'team_plan',
                'monthly-report': 'monthly_report',
                monthly_report: 'monthly_report',
                'ces-ai-knowledge':'ces_ai_knowledge',
                ces_ai_knowledge:'ces_ai_knowledge',
                'weekly-report': 'weekly',
                weekly_report: 'weekly',
                'kpi-tracking': 'kpi',
                kpi_tracking: 'kpi',
                'report-management': 'report_manage',
                reportmanagement: 'report_manage',
                'stock-dashboard': 'stock_dashboard',
                stock_dashboard: 'stock_dashboard',
                'check-stock': 'check_stock',
                check_stock: 'check_stock',
                'user-management': 'users',
                user_management: 'users',
                settings: 'setting',
                healthcheck: 'health',
                'system-health': 'health',
                system_health: 'health'
            };
            tab = alias[tab] || tab;
            const valid = ['portal','management_overview','yearly','revenue','ot','service','report','memo_workorder','calendar','checkin','car_booking','van_booking','weekly','report_manage','kpi','stock_dashboard','inventory','check_stock','team_information','team_plan','monthly_report','users','ces_evaluation','ces_ai_knowledge','setting','health'];
            return valid.includes(tab) ? tab : '';
        } catch (e) {
            return '';
        }
    }


    // ============================================================
    // DATA LOADERS
    // ============================================================

    function cesFastStartV19_() {
        cesRestoreCoreCacheV20_();
        try {
            var cachedPerms=JSON.parse(localStorage.getItem('ces_role_permissions_v21')||'null');
            if(cachedPerms&&typeof cachedPerms==='object')globalPermissions=cachedPerms;
        } catch(ignore) {}
        if(currentUser)applyRolePermissions(currentUser.role);
        var requested=getRequestedTabFromUrl(),remembered=cesRememberedTabV50_(),start=cesValidTabV60_(requested||remembered||'portal')||'portal';
        if(!document.getElementById('view-'+start))start='portal';
        switchTab(start);
        var loader=document.getElementById('loadingOverlay');if(loader)loader.classList.add('hidden');
        var status=document.getElementById('lastUpdateText');if(status)status.innerHTML='<i class="fas fa-circle-notch fa-spin text-[#003DA5]"></i> Loading Home first';
        var homeFirstPromise=Promise.resolve();
        if(start==='portal'&&typeof window.CES_HOME_BOOTSTRAP==='function'){
          try{homeFirstPromise=Promise.resolve(window.CES_HOME_BOOTSTRAP(false));}catch(ignoreHome){homeFirstPromise=Promise.resolve();}
        }
        setTimeout(function(){
          if(window.CES_API&&typeof window.CES_API.callFunction==='function'){
            window.CES_API.callFunction('getStartupData',[],{transport:'jsonp',timeoutMs:25000}).then(function(data){
              if(data&&data.config){globalConfig=data.config;try{if(data.config.ROLE_PERMISSIONS){globalPermissions=JSON.parse(data.config.ROLE_PERMISSIONS);localStorage.setItem('ces_role_permissions_v21',JSON.stringify(globalPermissions));}}catch(ignore2){}if(typeof window.cesApplyTeamColorConfig==='function')window.cesApplyTeamColorConfig(globalConfig);if(currentUser)applyRolePermissions(currentUser.role);}
            }).catch(function(){});
          }
        },350);
        Promise.race([homeFirstPromise,new Promise(function(resolve){setTimeout(resolve,2200);})]).finally(function(){
          // Home is the first priority. Do not pull the large Calendar/Yearly payload at login.
          // Deferred UI modules are loaded after Home; data-heavy modules fetch only when opened or refreshed.
          setTimeout(function(){
            if(typeof window.CES_loadDeferredModules==='function')window.CES_loadDeferredModules().catch(function(){});
            var status=document.getElementById('lastUpdateText');if(status)status.innerHTML='<i class="fas fa-check-circle text-[#003DA5]"></i> Active';
          },120);
        });
    }

    function loadAllData(options) {
        if(options===true)options={force:true};
        options = options || {};
        const isInitial = options.initial === true;
        const activeBeforeLoad = cesValidTabV60_(options.tab) ||
            cesValidTabV60_(currentTab) || cesVisibleTabV60_() ||
            cesReadActiveTabV60_() || cesRememberedTabV50_() || 'portal';
        if (!isInitial) cesPersistActiveTabV60_(activeBeforeLoad);

        const loader = document.getElementById('loadingOverlay');
        let refreshTokenV14 = '';
        if (isInitial && options.nonBlocking !== true) {
            if (loader) loader.classList.remove('hidden');
        } else if (!isInitial && window.CES_UI && typeof window.CES_UI.begin === 'function') {
            refreshTokenV14 = window.CES_UI.begin({target:'#app-main-content', mode:'section', message:'Refreshing the current function…'});
        }
        const loadingText = document.getElementById('loadingText');
        if (loadingText) {
            const titleMap = {
                portal:'Home', management_overview:'Management Overview', yearly:'Job Dashboard', revenue:'Revenue Dashboard', ot:'OT Dashboard',
                service:'Service CSI', report:'Report CSI', calendar:'Master Calendar', checkin:'Check-in',
                car_booking:'Car Booking', van_booking:'Van Booking', weekly:'Weekly Report',
                report_manage:'Report Management', kpi:'KPI Tracking', stock_dashboard:'Infusion Pump Dashboard',
                inventory:'Inventory', check_stock:'Check Stock', team_information:'Team Information', team_plan:'Team Plan', monthly_report:'Monthly Report', ces_evaluation:'CES Hub Evaluation', ces_ai_knowledge:'CES AI Knowledge',
                users:'User Management', setting:'Setting', health:'System Health Check'
            };
            loadingText.innerText = options.message ||
                (isInitial ? 'Syncing data in background...' : 'Refreshing ' + (titleMap[activeBeforeLoad] || 'current page') + '...');
        }

        google.script.run
            .withSuccessHandler((data) => {
                cesApplyCoreDataV20_(data); cesStoreCoreCacheV20_(data);
                if (isInitial && loader) loader.classList.add('hidden');
                if (refreshTokenV14 && window.CES_UI) window.CES_UI.end(refreshTokenV14);

                if (data.config) {
                    globalConfig = data.config;
                    if (typeof window.cesApplyTeamColorConfig === 'function') window.cesApplyTeamColorConfig(globalConfig);
                    if (data.config.ROLE_PERMISSIONS) {
                        try { globalPermissions = JSON.parse(data.config.ROLE_PERMISSIONS); } catch (e) {}
                    }
                }

                // V21: use the most recently saved permission cache when getAllData is stale.
                try {
                    const cachedPerms = JSON.parse(localStorage.getItem('ces_role_permissions_v21') || 'null');
                    if (cachedPerms && typeof cachedPerms === 'object') globalPermissions = cachedPerms;
                } catch (e) {}

                globalYearlyStats = data.yearlyStats  || [];
                globalCalData     = data.calSummary   || [];

                if (currentUser) applyRolePermissions(currentUser.role);

                // V21: refresh only Config/Permissions independently from the heavier getAllData cache.
                // This lets another user see newly granted Car/Van permissions after login.
                try {
                    if (currentUser && window.CES_API && typeof window.CES_API.callFunction === 'function') {
                        window.CES_API.callFunction('getSystemSettings', [], {transport:'jsonp', timeoutMs:30000})
                            .then(cfg => {
                                if (!cfg || !cfg.ROLE_PERMISSIONS) return;
                                try {
                                    const freshPerms = JSON.parse(cfg.ROLE_PERMISSIONS);
                                    globalConfig = Object.assign({}, globalConfig || {}, cfg);
                                    if (typeof window.cesApplyTeamColorConfig === 'function') window.cesApplyTeamColorConfig(globalConfig);
                                    globalPermissions = freshPerms;
                                    localStorage.setItem('ces_role_permissions_v21', JSON.stringify(freshPerms));
                                    applyRolePermissions(currentUser.role);
                                } catch (e) {}
                            })
                            .catch(() => {});
                    }
                } catch (e) {}

                if (typeof renderYearlyStats   === 'function') renderYearlyStats(globalYearlyStats, globalConfig);
                if (typeof initCalendar        === 'function') initCalendar(globalCalData);
                if (typeof renderManagementOverviewDashboard === 'function') renderManagementOverviewDashboard();

                let requestedTab = getRequestedTabFromUrl();
                let rememberedTab = cesRememberedTabV50_();
                let startTab = isInitial
                    ? (requestedTab || rememberedTab || activeBeforeLoad || 'portal')
                    : (activeBeforeLoad || requestedTab || rememberedTab || 'portal');

                const canOpenTab = function(tab) {
                    const button = tab ? document.getElementById('btn-' + tab) : null;
                    return !!(button && !button.classList.contains('hidden'));
                };
                if (!canOpenTab(startTab)) {
                    if (requestedTab && canOpenTab(requestedTab)) startTab = requestedTab;
                    else if (rememberedTab && canOpenTab(rememberedTab)) startTab = rememberedTab;
                    else if (currentUser && currentUser.role !== 'ADMIN') {
                        const allowed = (globalPermissions && globalPermissions[currentUser.role]) || [];
                        startTab = allowed.find(canOpenTab) || (canOpenTab('calendar') ? 'calendar' : allowed[0]);
                    } else {
                        startTab = CES_VALID_TABS_V60.find(canOpenTab) || 'portal';
                    }
                }
                startTab = cesValidTabV60_(startTab) || 'portal';

                var userAlreadyNavigated = options.nonBlocking === true && currentTab && currentTab !== 'portal' && currentTab !== startTab;
                if (!userAlreadyNavigated) {
                    currentTab = startTab;
                    window.currentTab = startTab;
                    cesPersistActiveTabV60_(startTab);
                    switchTab(startTab);
                }

                if (document.getElementById('lastUpdateText')) {
                    document.getElementById('lastUpdateText').innerHTML = `<i class="fas fa-check-circle text-[#003DA5]"></i> Active`;
                }

                // Do not preload Service/Report/Stock dashboards at login. They are loaded only when the user opens that module.
                // This keeps Home/Core as first priority and avoids the multi-request sync burst shown in the header.
                if(typeof window.CES_loadDeferredModules==='function') window.CES_loadDeferredModules().catch(function(){});
            })
            .withFailureHandler(err => {
                if (isInitial && loader) loader.classList.add('hidden');
                if (refreshTokenV14 && window.CES_UI) window.CES_UI.end(refreshTokenV14);
                Swal.fire('Connection Error', (err && err.message ? err.message : 'Could not load system data. Please refresh.'), 'error');
            })
            .getCoreReadModelV267(options.force === true);
    }

    function loadHeavyDataBackground() {
        google.script.run
            .withSuccessHandler(data => {
                if (typeof initService === 'function') initService(data);
                if (currentTab === 'service' || currentTab === 'management_overview') {
                    if (currentTab === 'service') applyServiceFilters();
                    else renderManagementOverviewDashboard();
                }
            })
            .getServiceDataOnly();

        google.script.run
            .withSuccessHandler(data => {
                if (typeof initReport === 'function') initReport(data.report, data.tickets);
                if (currentTab === 'report') applyReportFilters();
            })
            .getReportDataOnly();
    }


    // ============================================================
    // LIFF / LINE ROUTING LOGIC
    // ============================================================

    /** Clean Release — true when CES Hub should initialize LIFF/LINE identity. */
    function isLineEnvironment() {
        try {
            const ua = String(navigator.userAgent || '');
            const params = new URLSearchParams(window.location.search || '');
            const hash = String(window.location.hash || '');
            const source = String(params.get('source') || '').toLowerCase();
            return /Line/i.test(ua) ||
                source === 'lineoa' ||
                params.has('liff.state') ||
                params.has('liff.referrer') ||
                /(?:^|[?#&])source=lineoa(?:$|[&#])/i.test(hash);
        } catch (e) {
            return /Line/i.test(String(navigator.userAgent || ''));
        }
    }

    function cesShouldInitLiff_() {
        const cfg = window.CES_CONFIG && window.CES_CONFIG.LINE_OA;
        return (!cfg || cfg.ENABLED !== false) && isLineEnvironment();
    }

    /** Show the login form UI */
    function showLoginForm() {
        document.getElementById('login-container').classList.remove('hidden');
        document.getElementById('main-dashboard').classList.add('hidden');

        const loginInputV38 = document.getElementById('loginId');
        if (loginInputV38) {
            if (pendingLineProfile) {
                // First-time LINE linking must require an explicit Employee ID.
                // Never auto-fill a cached browser identity into a new LINE account link.
                loginInputV38.value = '';
            } else if (!loginInputV38.value) {
                loginInputV38.value = localStorage.getItem('ces_last_employee_id') || sessionStorage.getItem('ces_last_employee_id') || '';
            }
        }
        if (!pendingLineProfile && typeof window.cesHydrateLoginMemoryV60_ === 'function') window.cesHydrateLoginMemoryV60_();

        if (typeof refreshLineNotice === 'function') {
            refreshLineNotice();
        }
    }

    /**
     * Initialise LIFF and decide:
     *   - Auto-login (Scenario C)   → LINE ID already in Staff_Data
     *   - Show login form (Scenario B) → first-time visitor, needs Employee-ID entry
     */
    async function initLiffAndRoute() {
        try {
            if (typeof window.liff === 'undefined') {
                throw new Error('LIFF SDK is not loaded. Check static.line-scdn.net/liff/edge/2/sdk.js');
            }

            await liff.init({
                liffId: LIFF_ID,
                withLoginOnExternalBrowser: true
            });

            // LINE restores parameters carried in liff.state only after liff.init().
            // Read/persist the requested module now, never before init during LINE flow.
            const requestedTabAfterLiff = getRequestedTabFromUrl();
            if (requestedTabAfterLiff) {
                try { sessionStorage.setItem(CES_ACTIVE_TAB_KEY_V60, requestedTabAfterLiff); } catch (ignore) {}
            }

            if (!liff.isLoggedIn()) {
                // In LIFF browser login is normally handled automatically. In an external
                // browser use LINE Login and return to the same CES endpoint URL.
                if (typeof liff.isInClient === 'function' && liff.isInClient()) {
                    throw new Error('LIFF is open in LINE but no authenticated LINE session is available.');
                }
                liff.login({ redirectUri: window.location.href });
                return;
            }

            const idToken = liff.getIDToken();
            if (!idToken) {
                throw new Error('No LINE ID token. Enable the openid scope in the LIFF app.');
            }

            // Profile scope is optional for account linking. Prefer decoded ID token and
            // use getProfile() only as an enhancement when profile scope is available.
            let decoded = null;
            try { decoded = liff.getDecodedIDToken ? liff.getDecodedIDToken() : null; } catch (ignoreDecoded) {}

            let lineUserId = String((decoded && decoded.sub) || '').trim();
            let lineName = String((decoded && decoded.name) || '').trim();

            try {
                const profile = await liff.getProfile();
                lineUserId = String((profile && profile.userId) || lineUserId || '').trim();
                lineName = String((profile && profile.displayName) || lineName || '').trim();
            } catch (profileError) {
                console.warn('[LIFF] Profile scope unavailable; using verified ID-token profile.', profileError);
            }

            pendingLineIdToken = idToken;

            // IMPORTANT Clean Release: gas-polyfill forces this credential call through POST.
            google.script.run
                .withSuccessHandler((res) => {
                    if (res && res.success && res.user) {
                        console.log('[LIFF] Verified auto-login for empId:', res.user.id);
                        cesStoreCurrentUserV60_(res.user);
                        if (res.user && res.user.id) localStorage.setItem('ces_last_employee_id', String(res.user.id));
                        onLoginSuccess(res.user, true, 'LINE_AUTO_LOGIN');
                    } else {
                        console.log('[LIFF] No linked CES account — Employee ID required once.');
                        pendingLineProfile = { userId: lineUserId, displayName: lineName || 'LINE User' };
                        showLoginForm();
                        if (typeof refreshLineNotice === 'function') refreshLineNotice();
                    }
                })
                .withFailureHandler((err) => {
                    console.error('[LIFF] checkUserByLineToken error:', err && err.message ? err.message : err);
                    pendingLineProfile = { userId: lineUserId, displayName: lineName || 'LINE User' };
                    showLoginForm();
                    if (typeof refreshLineNotice === 'function') refreshLineNotice();
                    Swal.fire({
                        icon:'warning',
                        title:'LINE connection needs attention',
                        text:'LINE identity could not be verified automatically. You can sign in with Employee ID and retry after the backend is deployed.',
                        confirmButtonColor:'#004aad'
                    });
                })
                .checkUserByLineToken(idToken);

        } catch (err) {
            console.error('[LIFF] Init error:', err);
            showLoginForm();
            Swal.fire({
                icon:'warning',
                title:'LINE Login unavailable',
                text:(err && err.message) ? err.message : 'Unable to initialize LINE Login.',
                confirmButtonColor:'#004aad'
            });
        }
    }


    // ============================================================
    // BOOTSTRAP — window.onload (Entry Point)
    // ============================================================

    document.addEventListener('visibilitychange', function(){
        if (!document.hidden && currentUser) cesRecordLatestUsageV50_('ACTIVE', currentTab || 'portal', false);
    });
    window.addEventListener('beforeunload', function(){
        cesPersistActiveTabV60_(currentTab || cesVisibleTabV60_() || 'portal');
        if (currentUser) cesPersistSessionV50_(currentUser, currentTab || 'portal', 'PAGE_CLOSED');
    });
    window.addEventListener('pageshow', function(){
        const tab = cesReadActiveTabV60_();
        if (currentUser && tab && tab !== currentTab) setTimeout(function(){ switchTab(tab); }, 0);
    });


    window.addEventListener('ces:deferred-ready', function(){
        try { if (currentUser) applyRolePermissions(currentRole || currentUser.role || ''); } catch(ignore) {}
        try { var b=document.getElementById('btn-memo_workorder'); if(b && String((currentUser&&currentUser.role)||'').toUpperCase()==='ADMIN') b.classList.remove('hidden'); } catch(ignore2) {}
    });

    async function cesBootstrapAppV19_() {
        if (typeof window.cesHydrateLoginMemoryV60_ === 'function') window.cesHydrateLoginMemoryV60_();

        // Clean Release SECURITY/IDENTITY ORDER:
        // A LINE-origin session must verify the current LINE identity BEFORE a remembered
        // browser Employee-ID session is restored. This prevents a stale browser session
        // from overriding the LINE account that actually opened the Rich Menu.
        if (cesShouldInitLiff_()) {
            console.log('[CES Hub] LINE origin detected → LIFF verification first.');
            await initLiffAndRoute();
            return;
        }

        // Standard browser: restore remembered CES session.
        const rememberedSessionV50 = cesReadRememberedSessionV50_();
        if (rememberedSessionV50 && rememberedSessionV50.user && rememberedSessionV50.user.id) {
            onLoginSuccess(rememberedSessionV50.user, true, 'SESSION_RESTORED');
            return;
        }

        // Migrate a valid legacy ces_user session once.
        const savedUser = cesShouldRememberLoginV60_()
            ? (localStorage.getItem('ces_user') || sessionStorage.getItem('ces_user'))
            : sessionStorage.getItem('ces_user');
        if (savedUser) {
            try {
                const user = JSON.parse(savedUser);
                if (user && user.id) {
                    cesPersistSessionV50_(user, 'portal', 'LEGACY_SESSION_MIGRATED');
                    onLoginSuccess(user, true, 'LEGACY_SESSION_MIGRATED');
                    return;
                }
            } catch (e) {
                localStorage.removeItem('ces_user');
            }
        }

        console.log('[CES Hub] Standard browser → showing login form.');
        showLoginForm();
    }
    if (document.readyState === 'complete') setTimeout(cesBootstrapAppV19_, 0);
    else window.addEventListener('load', cesBootstrapAppV19_, { once:true });


// CES Hub V41 — repaint cached team summaries/charts immediately after a core color change.
(function bindTeamColorRefreshV41_(){
    let timer=null;
    window.addEventListener('ces:team-colors-updated', function(){
        clearTimeout(timer);
        timer=setTimeout(function(){
            const visible=id=>{const el=document.getElementById(id);return !!(el&&!el.classList.contains('hidden'));};
            const safe=fn=>{try{if(typeof fn==='function')fn();}catch(err){console.warn('[Team Color Refresh]',err);}};
            if(visible('view-calendar')) safe(()=>updateCalendarUI());
            if(visible('view-yearly')) safe(()=>updateYearlyView());
            if(visible('view-management_overview')) safe(()=>renderManagementOverviewDashboard(true));
            if(visible('view-service')) safe(()=>applyServiceFilters());
            if(visible('view-report')) safe(()=>applyReportFilters());
            if(visible('view-revenue')) safe(()=>renderRevenueFromCache());
            if(visible('view-checkin')) { safe(()=>renderKPIs());safe(()=>renderJobList());safe(()=>renderRecentActivity());safe(()=>filterActivityTable()); }
            if(visible('view-weekly')) safe(()=>switchWeeklyTeam(wkCurrentTeam||'MED'));
            if(visible('view-team_information')) { safe(()=>renderTeamTabs_());safe(()=>renderTeamInformation()); }
            if(visible('view-ces_evaluation')) { safe(()=>window.initCesHubEvaluationV22&&window.initCesHubEvaluationV22()); }
        },80);
    });
})();

window.cesPersistActiveTabV60_ = cesPersistActiveTabV60_;
window.cesReadActiveTabV60_ = cesReadActiveTabV60_;
window.cesStoreCurrentUserV60_ = cesStoreCurrentUserV60_;


window.CES_FRONTEND_V214_RECHECK = function(){
  var q=function(sel){return document.querySelectorAll(sel).length;};
  return {
    success:true,version:'V21.4',build:window.CES_BUILD_HASH||'',
    home:{applications:q('#portal-app-grid .ces-portal-app-card'),services:q('#portal-services-grid .ces-portal-app-card'),cesCsi:!!Array.from(document.querySelectorAll('#portal-app-grid h4')).find(function(x){return /CES CSI/i.test(x.textContent||'');})},
    inventory:{bulkButton:!!document.querySelector('.ces-inventory-bulk-btn-v214'),exportXlsxButton:!!document.querySelector('.ces-inventory-export-btn-v214')},
    ai:{launcher:!!document.querySelector('#ces-ai-local-launcher .fa-circle-info'),evaluationScopes:q('#ces-ai-eval-scopes .ces-ai-eval-scope')},
    calendar:{tesYellow:!!document.querySelector('.ces-action-tes-upload-v213')},
    memoWorkOrder:{menu:!!document.getElementById('btn-memo_workorder'),view:!!document.getElementById('view-memo_workorder')},
    checkin:{view:!!document.getElementById('view-checkin')}
  };
};


// CES_V221_ADMIN_MENU_WATCHDOG — later compatibility modules must not hide ADMIN System tabs.
(function(){
  function fix(){try{if(typeof window.cesForceAdminSystemMenuV221==='function')window.cesForceAdminSystemMenuV221();}catch(e){}}
  ['ces:app-ready','ces:deferred-ready','ces:home-ready'].forEach(function(ev){window.addEventListener(ev,function(){setTimeout(fix,30);setTimeout(fix,600);});});
  var n=0,t=setInterval(function(){fix();if(++n>=20)clearInterval(t);},500);
})();

// V22.5 public state accessors
window.CES_getCurrentTabV225=function(){try{return currentTab||window.CES_ACTIVE_TAB||'portal';}catch(e){return window.CES_ACTIVE_TAB||'portal';}};
window.CES_getCurrentUserV225=function(){try{return currentUser||window.CES_CURRENT_USER||null;}catch(e){return window.CES_CURRENT_USER||null;}};
