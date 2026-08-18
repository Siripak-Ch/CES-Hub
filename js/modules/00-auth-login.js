// ============================================================
// 00-auth-login.js
// Extracted from original index.html. Keep load order from index.html.
// ============================================================



// ──────────────────────────────────────────────────────────────────
//  V60 — remembered browser login and recent Employee IDs
// ──────────────────────────────────────────────────────────────────
const CES_RECENT_LOGIN_USERS_KEY_V60 = 'CES_RECENT_LOGIN_USERS_V60';
const CES_REMEMBER_LOGIN_KEY_V60 = 'CES_REMEMBER_LOGIN_V60';
const CES_LAST_EMPLOYEE_ID_KEY_V60 = 'ces_last_employee_id';
let CES_LOGIN_REQUEST_SEQ_V62 = 0;
let CES_REGISTER_REQUEST_SEQ_V62 = 0;


function cesRememberLoginEnabled_() {
    const checkbox = document.getElementById('rememberLogin');
    if (checkbox) return !!checkbox.checked;
    return localStorage.getItem(CES_REMEMBER_LOGIN_KEY_V60) !== '0';
}

function cesReadRecentLogins_() {
    try {
        const rows = JSON.parse(localStorage.getItem(CES_RECENT_LOGIN_USERS_KEY_V60) || '[]');
        return Array.isArray(rows) ? rows.filter(item => item && item.id).slice(0, 5) : [];
    } catch (e) {
        return [];
    }
}

function cesRecordRecentLogin_(userOrId) {
    const user = (userOrId && typeof userOrId === 'object') ? userOrId : { id: userOrId };
    const id = String(user.id || '').trim();
    if (!id) return;

    const remember = cesRememberLoginEnabled_();
    try {
        sessionStorage.setItem(CES_LAST_EMPLOYEE_ID_KEY_V60, id);
        if (remember) {
            localStorage.setItem(CES_REMEMBER_LOGIN_KEY_V60, '1');
            localStorage.setItem(CES_LAST_EMPLOYEE_ID_KEY_V60, id);
            const next = [{
                id: id,
                name: String(user.name_eng || user.name_th || '').trim(),
                team: String(user.team || '').trim(),
                lastLoginAt: new Date().toISOString()
            }].concat(cesReadRecentLogins_().filter(item => String(item.id) !== id)).slice(0, 5);
            localStorage.setItem(CES_RECENT_LOGIN_USERS_KEY_V60, JSON.stringify(next));
        }
    } catch (e) {}
    cesRenderLoginMemory_();
}

function cesRenderLoginMemory_() {
    const input = document.getElementById('loginId');
    const checkbox = document.getElementById('rememberLogin');
    const dataList = document.getElementById('recentEmployeeIds');
    const hint = document.getElementById('recentLoginHint');
    const remember = localStorage.getItem(CES_REMEMBER_LOGIN_KEY_V60) !== '0';
    const recent = cesReadRecentLogins_();
    const lastId = String(
        localStorage.getItem(CES_LAST_EMPLOYEE_ID_KEY_V60) ||
        sessionStorage.getItem(CES_LAST_EMPLOYEE_ID_KEY_V60) ||
        (recent[0] && recent[0].id) || ''
    ).trim();

    if (checkbox) checkbox.checked = remember;
    if (input && !input.value && lastId) input.value = lastId;

    // Native datalist was removed because it caused sluggish dropdown behavior
    // on some browsers/password-manager combinations. Keep the Recent button only.
    if (dataList) dataList.innerHTML = '';

    if (hint) {
        const latest = recent[0];
        if (latest && latest.id) {
            hint.textContent = 'Recent: ' + latest.id + (latest.name ? ' · ' + latest.name : '');
            hint.dataset.employeeId = latest.id;
            hint.classList.remove('hidden');
        } else {
            hint.textContent = '';
            hint.dataset.employeeId = '';
            hint.classList.add('hidden');
        }
    }
}

function cesUseMostRecentLogin_() {
    const recent = cesReadRecentLogins_();
    const input = document.getElementById('loginId');
    if (input && recent[0] && recent[0].id) {
        input.value = recent[0].id;
        input.focus();
    }
}

function cesHandleRememberLoginChange_() {
    const enabled = cesRememberLoginEnabled_();
    try {
        localStorage.setItem(CES_REMEMBER_LOGIN_KEY_V60, enabled ? '1' : '0');
        if (!enabled) {
            // Keep the Employee ID available for this tab only, but do not keep an
            // authenticated session after the browser is closed.
            localStorage.removeItem('CES_AUTH_SESSION_V50');
            localStorage.removeItem('ces_user');
        } else {
            const input = document.getElementById('loginId');
            if (input && input.value.trim()) localStorage.setItem(CES_LAST_EMPLOYEE_ID_KEY_V60, input.value.trim());
        }
    } catch (e) {}
    cesRenderLoginMemory_();
}

function cesHydrateLoginMemory_() {
    cesRenderLoginMemory_();
    const input = document.getElementById('loginId');
    if (input && !input.dataset.cesLoginBound) {
        input.dataset.cesLoginBound = '1';
        input.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                checkLogin();
            }
        });
        input.addEventListener('change', function() {
            const id = input.value.trim();
            if (id && cesRememberLoginEnabled_()) localStorage.setItem(CES_LAST_EMPLOYEE_ID_KEY_V60, id);
        });
    }
}

window.cesRememberLoginEnabled_ = cesRememberLoginEnabled_;
window.cesRecordRecentLogin_ = cesRecordRecentLogin_;
window.cesRenderLoginMemory_ = cesRenderLoginMemory_;
window.cesUseMostRecentLogin_ = cesUseMostRecentLogin_;
window.cesHandleRememberLoginChange_ = cesHandleRememberLoginChange_;
window.cesHydrateLoginMemory_ = cesHydrateLoginMemory_;

// ──────────────────────────────────────────────────────────────────
    //  LOGIN  — Employee ID verification
    //  Key change: passes pendingLineProfile flag to onLoginSuccess()
    // ──────────────────────────────────────────────────────────────────
    function cesLoginStatus_(message, state) {
        const btn = document.getElementById('btnLogin');
        if (!btn) return;
        let el = document.getElementById('ces-login-status-v249');
        if (!el) {
            el = document.createElement('div');
            el.id = 'ces-login-status-v249';
            el.setAttribute('role', 'status');
            el.style.marginTop = '10px';
            el.style.padding = '9px 12px';
            el.style.borderRadius = '12px';
            el.style.fontSize = '12px';
            el.style.fontWeight = '700';
            el.style.lineHeight = '1.45';
            el.style.display = 'none';
            btn.insertAdjacentElement('afterend', el);
        }
        if (!message) {
            el.textContent = '';
            el.style.display = 'none';
            return;
        }
        const palette = {
            loading: ['#eff6ff', '#1d4ed8', '#bfdbfe'],
            success: ['#ecfdf5', '#047857', '#a7f3d0'],
            warning: ['#fffbeb', '#b45309', '#fde68a'],
            error:   ['#fef2f2', '#b91c1c', '#fecaca']
        };
        const c = palette[state] || palette.loading;
        el.textContent = message;
        el.style.background = c[0];
        el.style.color = c[1];
        el.style.border = '1px solid ' + c[2];
        el.style.display = 'block';
    }

    function cesLoginApi_(userId) {
        // V24.9: hedge the normal JSONP login with a delayed POST/poll request.
        // This avoids a single transport hanging for 30+ seconds in mobile/LIFF while
        // keeping login read-only and idempotent. Whichever valid response arrives first wins.
        if (window.CES_API && typeof window.CES_API.callFunction === 'function') {
            return new Promise((resolve, reject) => {
                let settled = false;
                let pending = 0;
                let launched = 0;
                let lastError = null;
                const timers = [];

                function finishOk(value) {
                    if (settled) return;
                    settled = true;
                    timers.forEach(clearTimeout);
                    resolve(value);
                }
                function finishErr(err) {
                    pending = Math.max(0, pending - 1);
                    lastError = err || lastError;
                    if (!settled && pending === 0 && launched >= 2) {
                        settled = true;
                        timers.forEach(clearTimeout);
                        reject(lastError || new Error('Unable to contact CES Hub.'));
                    }
                }
                function launch(transport, timeoutMs) {
                    if (settled) return;
                    launched += 1;
                    pending += 1;
                    window.CES_API.callFunction('checkLogin', [userId], {
                        transport: transport,
                        timeoutMs: timeoutMs,
                        dedupe: false,
                        silentLoading: true,
                        globalLoading: false
                    }).then(finishOk).catch(finishErr);
                }

                launch('jsonp', 24000);
                timers.push(setTimeout(() => {
                    if (!settled) {
                        cesLoginStatus_('Connection is slower than usual — retrying securely…', 'warning');
                        launch('iframe', 42000);
                    }
                }, 1800));
                timers.push(setTimeout(() => {
                    if (settled) return;
                    settled = true;
                    reject(lastError || new Error('CES Hub login service did not respond. Please retry.'));
                }, 46000));
            });
        }

        // Apps Script-hosted fallback.
        return new Promise((resolve, reject) => {
            try {
                google.script.run.withSuccessHandler(resolve).withFailureHandler(reject).checkLogin(userId);
            } catch (err) { reject(err); }
        });
    }

    function checkLogin() {
        const idInput = document.getElementById('loginId');
        const userId = String(idInput && idInput.value || '').trim();

        if (!userId) {
            cesLoginStatus_('Please enter your Employee ID.', 'warning');
            if (idInput) idInput.focus();
            return;
        }

        try {
            sessionStorage.setItem(CES_LAST_EMPLOYEE_ID_KEY_V60, userId);
            if (cesRememberLoginEnabled_()) {
                localStorage.setItem(CES_LAST_EMPLOYEE_ID_KEY_V60, userId);
                localStorage.setItem(CES_REMEMBER_LOGIN_KEY_V60, '1');
            }
        } catch (e) {}

        const btn = document.getElementById('btnLogin');
        if (!btn || btn.disabled) return;
        const oldHtml = btn.innerHTML;
        const requestSeq = ++CES_LOGIN_REQUEST_SEQ_V62;
        let settled = false;

        function finish() {
            if (requestSeq !== CES_LOGIN_REQUEST_SEQ_V62 || settled) return false;
            settled = true;
            btn.innerHTML = oldHtml;
            btn.disabled = false;
            return true;
        }

        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Checking ID…';
        btn.disabled = true;
        cesLoginStatus_('Checking your CES Hub account…', 'loading');

        cesLoginApi_(userId).then((res) => {
            if (!finish()) return;
            if (res && res.success) {
                cesLoginStatus_('Account verified. Opening CES Hub…', 'success');
                try {
                    idInput.blur();
                    idInput.setAttribute('autocomplete', 'off');
                    idInput.setAttribute('name', 'ces_employee_id_verified_' + Date.now());
                    idInput.setAttribute('data-form-type', 'other');
                } catch (ignorePasswordManager) {}
                cesRecordRecentLogin_(res.user || { id:userId });
                const skipLink = (typeof pendingLineProfile === 'undefined' || pendingLineProfile === null);
                onLoginSuccess(res.user, skipLink, 'LOGIN');
                setTimeout(() => cesLoginStatus_('', 'success'), 800);
                return;
            }
            cesLoginStatus_((res && res.message) || 'Employee ID could not be verified.', 'error');
            if (idInput) { idInput.focus(); idInput.select(); }
        }).catch((err) => {
            if (!finish()) return;
            const message = (err && err.message) || 'Unable to contact CES Hub.';
            cesLoginStatus_('Login service connection failed: ' + message + ' Tap Login / Check ID to retry.', 'error');
            console.error('[CES Login V24.9]', err);
        });
    }

    // Show LINE banner if pendingLineProfile is already set when the form renders
    // (called from initLiffAndRoute in Controller_Script)
    function refreshLineNotice() {
        const notice  = document.getElementById('line-link-notice');
        const nameEl  = document.getElementById('line-link-name');
        if (!notice) return;
        if (typeof pendingLineProfile !== 'undefined' && pendingLineProfile) {
            notice.classList.remove('hidden');
            if (nameEl) nameEl.innerText = `Linking: ${pendingLineProfile.displayName}`;
        } else {
            notice.classList.add('hidden');
        }
    }


    // V24.8 — explicit LINE OA / LIFF connection entry from Sign in.
    function cesConnectLineOA_() {
        const cfg = (window.CES_CONFIG && window.CES_CONFIG.LINE_OA) || {};
        const liffId = String(cfg.LIFF_ID || '').trim();
        const addFriend = 'https://line.me/R/ti/p/@032jntyw';
        const target = liffId
            ? ('https://liff.line.me/' + encodeURIComponent(liffId) + '/?source=signin-connect')
            : addFriend;
        try { window.location.href = target; }
        catch (e) { window.open(target, '_blank', 'noopener'); }
    }
    window.cesConnectLineOA_ = cesConnectLineOA_;

    // ──────────────────────────────────────────────────────────────────
    //  REGISTER MODAL
    // ──────────────────────────────────────────────────────────────────
    function cesResetRegisterForm_() {
        const ids = ['reg-id','reg-name-th','reg-name-eng','reg-email','reg-costCenter','reg-supervisor','reg-empType','reg-tel'];
        ids.forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
        const team=document.getElementById('reg-team'); if(team) team.value='';
        const level=document.getElementById('reg-position'); if(level) level.value='';
    }

    function openRegisterModal() {
        // V23.1: every registration field starts blank. Never inherit Employee ID from the login box.
        cesResetRegisterForm_();
        document.getElementById('registerModal').classList.remove('hidden');
        setTimeout(() => { const first=document.getElementById('reg-id'); if(first) first.focus(); }, 40);
    }

    function closeRegisterModal() {
        document.getElementById('registerModal').classList.add('hidden');
        cesResetRegisterForm_();
    }

    function registerUser() {
        const form = {
            id:          String(document.getElementById('reg-id').value || '').trim(),
            name_th:     String(document.getElementById('reg-name-th').value || '').trim(),
            name_eng:    String(document.getElementById('reg-name-eng').value || '').trim(),
            email:       String(document.getElementById('reg-email').value || '').trim(),
            team:        document.getElementById('reg-team').value,
            position:    document.getElementById('reg-position').value,
            requestedRole: document.getElementById('reg-position').value,
            costCenter:  String(document.getElementById('reg-costCenter').value || '').trim(),
            supervisor:  String(document.getElementById('reg-supervisor').value || '').trim(),
            empType:     String(document.getElementById('reg-empType').value || '').trim(),
            tel:         String(document.getElementById('reg-tel').value || '').trim()
        };

        if (!form.id || !form.name_th || !form.name_eng || !form.email || !form.team || !form.position) {
            Swal.fire(
                'Missing Information',
                'Please fill in all required fields highlighted in red.',
                'warning'
            );
            return;
        }

        const btn = document.getElementById('btnRegisterSubmit');
        if (!btn || btn.disabled) return;

        const oldHtml = btn.innerHTML;
        const requestSeq = ++CES_REGISTER_REQUEST_SEQ_V62;
        let settled = false;

        function finish() {
            if (requestSeq !== CES_REGISTER_REQUEST_SEQ_V62) return false;
            if (settled) return false;
            settled = true;
            btn.innerHTML = oldHtml;
            btn.disabled = false;
            return true;
        }

        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Processing...';
        btn.disabled = true;

        const timeout = setTimeout(() => {
            if (!finish()) return;
            CES_REGISTER_REQUEST_SEQ_V62++;
            Swal.fire({
                icon:'warning',
                title:'Request is taking longer than expected',
                html:'<p>Your request may still be processing on the server.</p><p class="text-sm text-slate-500">Please wait a moment before trying again.</p>',
                confirmButtonColor:'#004aad'
            });
        }, 45000);

        google.script.run
            .withSuccessHandler((res) => {
                clearTimeout(timeout);
                if (!finish()) return;

                if (res && res.success) {
                    cesRecordRecentLogin_({
                        id:form.id,
                        name_eng:form.name_eng,
                        name_th:form.name_th,
                        team:form.team
                    });

                    // Hide the registration modal first, then show a separate
                    // success popup. This fixes the old "Processing..." header bug.
                    const modal = document.getElementById('registerModal');
                    if (modal) modal.classList.add('hidden');
                    cesResetRegisterForm_();

                    const adminMailOk = !!(
                        res.mail &&
                        res.mail.admin &&
                        res.mail.admin.success
                    );

                    const userMailOk = !!(
                        res.mail &&
                        res.mail.user &&
                        res.mail.user.success
                    );

                    const adminRecipients =
                        (res.mail && res.mail.adminRecipients || []).join(', ');

                    setTimeout(() => {
                        Swal.fire({
                            icon: adminMailOk && userMailOk ? 'success' : 'warning',
                            title: 'Request Submitted',
                            html:
                                '<div style="text-align:left">' +
                                '<p><b>Employee ID:</b> ' + form.id + '</p>' +
                                '<p><b>Status:</b> PENDING APPROVAL</p>' +
                                '<p class="mt-3">Your registration request was saved successfully.</p>' +
                                (userMailOk
                                    ? '<p>✅ Confirmation email sent to <b>' + form.email + '</b></p>'
                                    : '<p>⚠️ Request saved, but requester confirmation email could not be sent.</p>') +
                                (adminMailOk
                                    ? '<p>✅ Admin notification sent' + (adminRecipients ? ' to <b>' + adminRecipients + '</b>' : '') + '.</p>'
                                    : '<p>⚠️ Admin email notification could not be sent. The request is still available in User Management.</p>') +
                                '</div>',
                            confirmButtonColor:'#004aad',
                            confirmButtonText:'Back to Login',
                            returnFocus:false
                        });
                    }, 60);
                } else {
                    Swal.fire(
                        'Error',
                        (res && res.message) || 'Registration could not be saved.',
                        'error'
                    );
                }
            })
            .withFailureHandler((err) => {
                clearTimeout(timeout);
                if (!finish()) return;
                Swal.fire(
                    'Error',
                    (err && err.message) || 'Unable to submit the request.',
                    'error'
                );
            })
            .registerNewUser(form);
    }


if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cesHydrateLoginMemory_, { once:true });
} else {
    setTimeout(cesHydrateLoginMemory_, 0);
}
