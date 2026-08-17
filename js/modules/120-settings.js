// ============================================================
// 120-settings.js
// Extracted from original index.html. Keep load order from index.html.
// ============================================================

// --- Setting Module Logic ---
    let isSettingsLoaded = false;

    /**
     * ฟังก์ชันเริ่มต้นเมื่อเข้าหน้า Setting: ทำหน้าที่ดึงข้อมูลจาก Server มาแสดงผล[cite: 12]
     */
    function initSettings() {
        loadPortalLinksSettingV20(false);
        try { if (typeof window.refreshGeminiSettingV226 === 'function') window.refreshGeminiSettingV226(); } catch(ignore) {}
        try { if (typeof window.updatePermissionSummaryV228 === 'function') window.updatePermissionSummaryV228(); } catch(ignore2) {}
        if(isSettingsLoaded) return;
        
        // แสดงสถานะกำลังโหลด (Disable ช่องกรอกข้อมูลชั่วคราว)[cite: 12]
        document.querySelectorAll('#view-setting input').forEach(el => {
            el.disabled = true;
            el.classList.add('opacity-50', 'cursor-wait');
        });

        // เรียกฟังก์ชัน getSystemSettings จากฝั่ง Server เพื่อดึงค่าปัจจุบัน[cite: 12]
        google.script.run.withSuccessHandler(onSettingsLoaded).getSystemSettings();
    }

    /**
     * ฟังก์ชันจัดการข้อมูลที่ได้รับจาก Server เพื่อนำมาเติมในช่อง Input[cite: 12]
     */
    function onSettingsLoaded(data) {
        if(!data) return;
        
        // ฟังก์ชันช่วยเติมค่าลงในช่อง Input ตาม ID ที่กำหนด[cite: 12]
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if(el) {
                el.value = val !== undefined ? val : '';
                el.disabled = false;
                el.classList.remove('opacity-50', 'cursor-wait');
            }
        };

        // 1. ความสามารถของทีม (Capacity)[cite: 12]
        setVal('cfg-cap-med', data.CAPACITY_MED);
        setVal('cfg-cap-lab', data.CAPACITY_LAB);
        setVal('cfg-cap-ehs', data.CAPACITY_EHS);
        setVal('cfg-cap-env', data.CAPACITY_ENV);
        setVal('cfg-cap-mng', data.CAPACITY_MNG);
        setVal('cfg-cap-tes', data.CAPACITY_TES);

        // Core team colors — one Config value updates all modules.
        const colorDefaults = window.CES_TEAM_COLOR_DEFAULTS || {MED:'#004aad',LAB:'#19a7ce',EHS:'#0fc1a1',ENV:'#7ed957',TES:'#ffde59',QM:'#f97316',MNG:'#b4b4b4'};
        ['MED','LAB','EHS','ENV','TES','QM','MNG'].forEach(team => {
            const value = data['TEAM_COLOR_' + team] || colorDefaults[team];
            setVal('cfg-color-' + team.toLowerCase(), value);
            syncTeamColorPreviewV41(team, value, false);
        });
        if (typeof window.cesApplyTeamColorConfig === 'function') window.cesApplyTeamColorConfig(data);
        try { if (data.ROLE_PERMISSIONS && typeof window.updatePermissionSummaryV228 === 'function') window.updatePermissionSummaryV228(JSON.parse(data.ROLE_PERMISSIONS)); } catch(ignorePermV228) {}

        // 2. รหัสปฏิทิน (Calendar IDs)[cite: 12]
        setVal('cfg-cal-med', (!data.CAL_ID_MED || String(data.CAL_ID_MED).toLowerCase()==='bmecalibration@gmail.com') ? 'cescalmedteam@gmail.com' : data.CAL_ID_MED);
        setVal('cfg-cal-lab', data.CAL_ID_LAB);
        setVal('cfg-cal-ehs', data.CAL_ID_EHS);
        setVal('cfg-cal-env', data.CAL_ID_ENV);
        setVal('cfg-cal-mng', data.CAL_ID_MNG);
        setVal('cfg-cal-tes', data.CAL_ID_TES);

        // 3. เป้าหมายการดำเนินงาน (Operational Targets)[cite: 12]
        setVal('cfg-target-csi', data.TARGET_CSI);
        setVal('cfg-target-sla', data.TARGET_SLA_HRS);
        
        // 4. เป้าหมายรายได้ (Revenue Targets)[cite: 12]
        setVal('cfg-rev-med', data.TARGET_REV_MED);
        setVal('cfg-rev-lab', data.TARGET_REV_LAB);
        setVal('cfg-rev-ehs', data.TARGET_REV_EHS);
        setVal('cfg-rev-env', data.TARGET_REV_ENV);
        setVal('cfg-rev-mng', data.TARGET_REV_MNG);
        setVal('cfg-rev-tes', data.TARGET_REV_TES);

        // KPI Drive links
        setVal('cfg-kpi-drive-med', data.KPI_DRIVE_MED || '');
        setVal('cfg-kpi-drive-lab', data.KPI_DRIVE_LAB || window.CES_KPI_DRIVE_DEFAULTS?.LAB || '');
        setVal('cfg-kpi-drive-ehs', data.KPI_DRIVE_EHS || window.CES_KPI_DRIVE_DEFAULTS?.EHS || '');
        setVal('cfg-kpi-drive-env', data.KPI_DRIVE_ENV || window.CES_KPI_DRIVE_DEFAULTS?.ENV || data.KPI_DRIVE_EHS || '');
        setVal('cfg-kpi-drive-mng', data.KPI_DRIVE_MNG || '');
        setVal('cfg-kpi-drive-tes', data.KPI_DRIVE_TES || '');
        const linkDefaults = (window.CES_CONFIG && window.CES_CONFIG.EXTERNAL_LINKS) || {};
        setVal('cfg-link-service-csi-ces', data.LINK_SERVICE_CSI_CES_SUMMARY || linkDefaults.SERVICE_CSI_CES_SUMMARY || '');
        setVal('cfg-link-service-csi-tes', data.LINK_SERVICE_CSI_TES_SUMMARY || linkDefaults.SERVICE_CSI_TES_SUMMARY || '');
        setVal('cfg-link-report-csi', data.LINK_REPORT_CSI_SUMMARY || linkDefaults.REPORT_CSI_SUMMARY || '');
        setVal('cfg-link-revenue-dashboard', data.LINK_REVENUE_DASHBOARD || linkDefaults.REVENUE_DASHBOARD || '');
        setVal('cfg-link-kpi-ehs', data.LINK_KPI_EHS_SHEET || linkDefaults.KPI_EHS_SHEET || '');
        setVal('cfg-link-kpi-lab', data.LINK_KPI_LAB_SHEET || linkDefaults.KPI_LAB_SHEET || '');
        setVal('cfg-link-memo-workorder', data.LINK_MEMO_WORKORDER_SOURCE || linkDefaults.MEMO_WORKORDER_SOURCE || '');
        setVal('cfg-link-training-plan', data.LINK_TRAINING_PLAN_2026 || linkDefaults.TRAINING_PLAN_2026 || '');
        setVal('cfg-tes-import-url', data.TES_IMPORT_WEBAPP_URL || '');
        setVal('cfg-tes-import-secret', data.TES_IMPORT_SECRET || '');
        setVal('cfg-booking-memo-folder', data.BOOKING_MEMO_FOLDER_ID || '');
        setVal('cfg-booking-pdf-folder', data.BOOKING_PDF_FOLDER_ID || '');
        setVal('cfg-booking-return-bill-folder', data.BOOKING_RETURN_BILL_FOLDER_ID || '');
    
        // 5. Separate LINE tokens with legacy fallback
        const legacyLineToken = data.LINE_TOKEN || '';
        setVal('cfg-line-token-med', data.LINE_TOKEN_MED || legacyLineToken);
        setVal('cfg-line-token-lab', data.LINE_TOKEN_LAB || legacyLineToken);
        setVal('cfg-line-token-ehs', data.LINE_TOKEN_EHS || legacyLineToken);

        // 6. ข้อมูล Admin และการประกาศ (Admin & Announcement)[cite: 12]
        setVal('cfg-admin-email', data.ADMIN_NOTIFY_EMAIL);
        setVal('cfg-announce-msg', data.ANNOUNCE_MSG);
        
        // ตรรกะสำหรับ Checkbox การเปิด/ปิดประกาศ[cite: 12]
        const chkAnnounce = document.getElementById('cfg-announce-active');
        if(chkAnnounce) {
            chkAnnounce.checked = String(data.ANNOUNCE_ACTIVE).toUpperCase() === 'TRUE';
            chkAnnounce.disabled = false;
            chkAnnounce.classList.remove('opacity-50', 'cursor-wait');
        }

        isSettingsLoaded = true;
    }

    /**
     * ฟังก์ชันรวบรวมข้อมูลทั้งหมดจากหน้าเว็บเพื่อส่งไปบันทึกที่ Server[cite: 12]
     */
    function collectFullSystemConfig_() {
        const getVal = (id) => document.getElementById(id) ? document.getElementById(id).value : '';
        return {
            CONFIG_SCHEMA_VERSION:'23.8',
            CAPACITY_MED:getVal('cfg-cap-med'), CAPACITY_LAB:getVal('cfg-cap-lab'), CAPACITY_EHS:getVal('cfg-cap-ehs'), CAPACITY_ENV:getVal('cfg-cap-env'), CAPACITY_MNG:getVal('cfg-cap-mng'), CAPACITY_TES:getVal('cfg-cap-tes'),
            TEAM_COLOR_MED:getVal('cfg-color-med'), TEAM_COLOR_LAB:getVal('cfg-color-lab'), TEAM_COLOR_EHS:getVal('cfg-color-ehs'), TEAM_COLOR_ENV:getVal('cfg-color-env'), TEAM_COLOR_TES:getVal('cfg-color-tes'), TEAM_COLOR_QM:getVal('cfg-color-qm'), TEAM_COLOR_MNG:getVal('cfg-color-mng'),
            CAL_ID_MED:getVal('cfg-cal-med'), CAL_ID_LAB:getVal('cfg-cal-lab'), CAL_ID_EHS:getVal('cfg-cal-ehs'), CAL_ID_ENV:getVal('cfg-cal-env'), CAL_ID_MNG:getVal('cfg-cal-mng'), CAL_ID_TES:getVal('cfg-cal-tes'),
            TARGET_CSI:getVal('cfg-target-csi'), TARGET_SLA_HRS:getVal('cfg-target-sla'),
            TARGET_REV_MED:getVal('cfg-rev-med'), TARGET_REV_LAB:getVal('cfg-rev-lab'), TARGET_REV_EHS:getVal('cfg-rev-ehs'), TARGET_REV_ENV:getVal('cfg-rev-env'), TARGET_REV_MNG:getVal('cfg-rev-mng'), TARGET_REV_TES:getVal('cfg-rev-tes'),
            KPI_DRIVE_MED:getVal('cfg-kpi-drive-med'), KPI_DRIVE_LAB:getVal('cfg-kpi-drive-lab'), KPI_DRIVE_EHS:getVal('cfg-kpi-drive-ehs'), KPI_DRIVE_ENV:getVal('cfg-kpi-drive-env'), KPI_DRIVE_MNG:getVal('cfg-kpi-drive-mng'), KPI_DRIVE_TES:getVal('cfg-kpi-drive-tes'),
            LINK_SERVICE_CSI_CES_SUMMARY:getVal('cfg-link-service-csi-ces'), LINK_SERVICE_CSI_TES_SUMMARY:getVal('cfg-link-service-csi-tes'), LINK_REPORT_CSI_SUMMARY:getVal('cfg-link-report-csi'), LINK_REVENUE_DASHBOARD:getVal('cfg-link-revenue-dashboard'),
            LINK_KPI_EHS_SHEET:getVal('cfg-link-kpi-ehs'), LINK_KPI_LAB_SHEET:getVal('cfg-link-kpi-lab'), LINK_MEMO_WORKORDER_SOURCE:getVal('cfg-link-memo-workorder'), LINK_TRAINING_PLAN_2026:getVal('cfg-link-training-plan'),
            TES_IMPORT_WEBAPP_URL:getVal('cfg-tes-import-url'), TES_IMPORT_SECRET:getVal('cfg-tes-import-secret'),
            BOOKING_MEMO_FOLDER_ID:getVal('cfg-booking-memo-folder'), BOOKING_PDF_FOLDER_ID:getVal('cfg-booking-pdf-folder'), BOOKING_RETURN_BILL_FOLDER_ID:getVal('cfg-booking-return-bill-folder'),
            LINE_TOKEN_MED:getVal('cfg-line-token-med'), LINE_TOKEN_LAB:getVal('cfg-line-token-lab'), LINE_TOKEN_EHS:getVal('cfg-line-token-ehs'),
            LINE_TOKEN:getVal('cfg-line-token-ehs') || getVal('cfg-line-token-lab') || getVal('cfg-line-token-med'),
            ADMIN_NOTIFY_EMAIL:getVal('cfg-admin-email'), ANNOUNCE_MSG:getVal('cfg-announce-msg'),
            ANNOUNCE_ACTIVE:document.getElementById('cfg-announce-active')?.checked ? 'TRUE' : 'FALSE'
        };
    }

    function syncTeamColorPreviewV41(team, value, applyNow = true) {
        const code = String(team || '').toUpperCase();
        const hex = /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value).toLowerCase() : ((window.CES_TEAM_COLOR_DEFAULTS || {})[code] || '#64748b');
        const input = document.getElementById('cfg-color-' + code.toLowerCase());
        const label = document.getElementById('cfg-color-' + code.toLowerCase() + '-code');
        if (input && input.value !== hex) input.value = hex;
        if (label) label.textContent = hex;
        if (applyNow && typeof window.cesApplyTeamColorConfig === 'function') {
            const patch = {}; patch['TEAM_COLOR_' + code] = hex;
            const current = (typeof globalConfig !== 'undefined' && globalConfig) ? Object.assign({}, globalConfig, patch) : patch;
            window.cesApplyTeamColorConfig(current);
        }
    }
    window.syncTeamColorPreviewV41 = syncTeamColorPreviewV41;

    function resetTeamColorsV41() {
        const defaults = window.CES_TEAM_COLOR_DEFAULTS || {MED:'#004aad',LAB:'#19a7ce',EHS:'#0fc1a1',ENV:'#7ed957',TES:'#ffde59',QM:'#f97316',MNG:'#b4b4b4'};
        ['MED','LAB','EHS','ENV','TES','QM','MNG'].forEach(team => syncTeamColorPreviewV41(team, defaults[team], false));
        if (typeof window.cesApplyTeamColorConfig === 'function') {
            const patch = {}; ['MED','LAB','EHS','ENV','TES','QM','MNG'].forEach(team => patch['TEAM_COLOR_' + team] = defaults[team]);
            window.cesApplyTeamColorConfig(Object.assign({}, (typeof globalConfig !== 'undefined' ? globalConfig : {}), patch));
        }
    }
    window.resetTeamColorsV41 = resetTeamColorsV41;

    async function saveSettingsViaJsonp_(configData) {
        if (!window.CES_API || typeof window.CES_API.callFunction !== 'function') {
            throw new Error('CES API is not ready. Please refresh the page.');
        }

        // Long KPI Drive URLs can exceed the JSONP URL limit. Build safe chunks first
        // instead of waiting for one oversized request to fail or time out.
        const entries = Object.entries(configData || {});
        const chunks = [];
        let current = {}, currentLength = 0;
        entries.forEach(([key, value]) => {
            const size = encodeURIComponent(JSON.stringify([key, value])).length;
            if (Object.keys(current).length && currentLength + size > 1800) {
                chunks.push(current); current = {}; currentLength = 0;
            }
            current[key] = value;
            currentLength += size;
        });
        if (Object.keys(current).length) chunks.push(current);

        let result = null;
        for (let i = 0; i < chunks.length; i++) {
            result = await window.CES_API.callFunction(
                chunks.length === 1 ? 'saveConfigSettings' : 'saveConfigSettingsPatch',
                [chunks[i]],
                { transport:'jsonp', timeoutMs:90000 }
            );
            if (!(result === 'Saved' || (result && result.success))) {
                throw new Error((result && result.message) || `Save failed at batch ${i + 1}/${chunks.length}`);
            }
        }
        return result || {success:true};
    }


    const CES_SETTING_SECTION_KEYS_V264 = {
        announcement:['ADMIN_NOTIFY_EMAIL','ANNOUNCE_MSG','ANNOUNCE_ACTIVE'],
        capacity:['CAPACITY_MED','CAPACITY_LAB','CAPACITY_EHS','CAPACITY_ENV','CAPACITY_MNG','CAPACITY_TES'],
        links:['LINK_SERVICE_CSI_CES_SUMMARY','LINK_SERVICE_CSI_TES_SUMMARY','LINK_REPORT_CSI_SUMMARY','LINK_REVENUE_DASHBOARD','LINK_KPI_EHS_SHEET','LINK_KPI_LAB_SHEET','LINK_MEMO_WORKORDER_SOURCE','LINK_TRAINING_PLAN_2026'],
        colors:['TEAM_COLOR_MED','TEAM_COLOR_LAB','TEAM_COLOR_EHS','TEAM_COLOR_ENV','TEAM_COLOR_TES','TEAM_COLOR_QM','TEAM_COLOR_MNG'],
        calendar:['CAL_ID_MED','CAL_ID_LAB','CAL_ID_EHS','CAL_ID_ENV','CAL_ID_MNG','CAL_ID_TES'],
        targets:['TARGET_CSI','TARGET_SLA_HRS','TARGET_REV_MED','TARGET_REV_LAB','TARGET_REV_EHS','TARGET_REV_ENV','TARGET_REV_MNG','TARGET_REV_TES'],
        kpi:['KPI_DRIVE_MED','KPI_DRIVE_LAB','KPI_DRIVE_EHS','KPI_DRIVE_ENV','KPI_DRIVE_MNG','KPI_DRIVE_TES'],
        line:['LINE_TOKEN_MED','LINE_TOKEN_LAB','LINE_TOKEN_EHS','LINE_TOKEN']
    };

    async function saveSettingSectionV264(section, button) {
        const keys = CES_SETTING_SECTION_KEYS_V264[String(section || '').toLowerCase()] || [];
        if (!keys.length) return;
        const all = collectFullSystemConfig_(), patch = {CONFIG_SCHEMA_VERSION:'26.4'};
        keys.forEach(key => { patch[key] = all[key]; });
        const btn = button || null, oldHtml = btn ? btn.innerHTML : '';
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving'; }
        try {
            const res = await saveSettingsViaJsonp_(patch);
            if (!(res === 'Saved' || (res && res.success))) throw new Error((res && res.message) || 'Save failed');
            const saved = (res && res.savedConfig && typeof res.savedConfig === 'object') ? res.savedConfig : patch;
            if (typeof globalConfig !== 'undefined') Object.assign(globalConfig, saved);
            if (section === 'colors' && typeof window.cesApplyTeamColorConfig === 'function') window.cesApplyTeamColorConfig(saved);
            try { localStorage.setItem('ces_system_settings_v21', JSON.stringify({ts:Date.now(),data:Object.assign({},typeof globalConfig!=='undefined'?globalConfig:{},saved)})); } catch(ignoreCache) {}
            if (typeof showToast === 'function') showToast('Section saved', 'success');
            else Swal.fire({icon:'success',title:'Saved',timer:900,showConfirmButton:false});
        } catch (err) {
            Swal.fire('Save Section Error', err && err.message ? err.message : String(err), 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = oldHtml; }
        }
    }
    window.saveSettingSectionV264 = saveSettingSectionV264;

    async function saveFullSystemConfig() {
        const configData = collectFullSystemConfig_();
        const btn = document.querySelector('button[onclick="saveFullSystemConfig()"]');
        const oldHtml = btn ? btn.innerHTML : '';
        if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...'; btn.disabled = true; }
        try {
            const res = await saveSettingsViaJsonp_(configData);
            if (!(res === 'Saved' || (res && res.success))) throw new Error((res && res.message) || String(res || 'Save failed'));
            if (res && res.verified === false) throw new Error('Config was written but verification failed. Please retry.');
            const savedConfig = (res && res.savedConfig && typeof res.savedConfig === 'object') ? res.savedConfig : configData;
            if (typeof globalConfig !== 'undefined') Object.assign(globalConfig, savedConfig);
            if (typeof window.cesApplyTeamColorConfig === 'function') window.cesApplyTeamColorConfig(savedConfig);
            try { localStorage.setItem('ces_system_settings_v21', JSON.stringify({ts:Date.now(),data:savedConfig})); } catch(e) {}
            Swal.fire({icon:'success',title:'Configuration Saved',text:'Config values were saved and verified in the Final CES sheet.',timer:1900,showConfirmButton:false});
        } catch (err) {
            Swal.fire('Save Settings Error', err && err.message ? err.message : String(err), 'error');
        } finally {
            if (btn) { btn.innerHTML = oldHtml; btn.disabled = false; }
        }
    }


// ============================================================
// CES Hub V20 — Configurable Portal Links / cleaner navigation
// ============================================================
let CES_PORTAL_LINKS_SETTING_V20=[];
function cesScrollSettingV20(id){const el=document.getElementById(id);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});}
async function loadPortalLinksSettingV20(force){
  const root=document.getElementById('setting-portal-links-list');if(!root)return;
  if(force||!CES_PORTAL_LINKS_SETTING_V20.length)root.innerHTML='<div class="lg:col-span-2 py-8 text-center text-slate-400"><i class="fas fa-circle-notch fa-spin"></i> Loading links…</div>';
  try{const res=await (async()=>{let last;for(const fn of ['getPortalLinks']){try{const r=await window.CES_API.callFunction(fn,[!!force],{transport:'jsonp',timeoutMs:30000});if(r&&r.success!==false)return r;last=new Error((r&&r.message)||fn+' failed');}catch(e){last=e;}}throw last||new Error('Cannot load portal links');})();if(!res||res.success===false)throw new Error((res&&res.message)||'Cannot load portal links');CES_PORTAL_LINKS_SETTING_V20=res.data||[];renderPortalLinksSettingV20();}
  catch(err){root.innerHTML='<div class="lg:col-span-2 py-8 text-center text-red-500 font-bold">'+String(err.message||err)+'</div>';}
}
function renderPortalLinksSettingV20(){
  const root=document.getElementById('setting-portal-links-list');if(!root)return;
  const sectionLabel=(code)=>({APPLICATION:'Applications & Services',NHEALTH_SERVICE:'N Health Services',INNOVATION:'Innovation'}[String(code||'').toUpperCase()]||code||'Other');
  const sectionIcon=(code)=>({APPLICATION:'fa-th-large',NHEALTH_SERVICE:'fa-hospital',INNOVATION:'fa-lightbulb'}[String(code||'').toUpperCase()]||'fa-link');
  const sectionClass=(code)=>String(code||'').toLowerCase().replace(/_/g,'-');
  const sectionRank={APPLICATION:1,NHEALTH_SERVICE:2,INNOVATION:3};
  const rows=(CES_PORTAL_LINKS_SETTING_V20||[]).slice().sort((a,b)=>(sectionRank[String(a.section||'').toUpperCase()]||9)-(sectionRank[String(b.section||'').toUpperCase()]||9)||Number(a.sortOrder||999)-Number(b.sortOrder||999));
  const groups=['APPLICATION','NHEALTH_SERVICE','INNOVATION'].map(code=>({code,rows:rows.filter(x=>String(x.section||'').toUpperCase()===code)})).filter(g=>g.rows.length);
  const card=(x)=>`<article class="ces-setting-link-card ${sectionClass(x.section)}"><div class="ces-setting-link-icon"><i class="fas ${x.icon||'fa-link'}"></i></div><div class="min-w-0"><div class="ces-setting-link-meta"><b>${x.titleEn||x.titleTh}</b><em>#${Number(x.sortOrder||999)}</em><small>${x.status}</small></div><p>${x.descriptionEn||x.descriptionTh||''}</p><code>${x.url||'#'}</code></div><div class="ces-setting-link-actions"><button onclick='openPortalLinkEditorV20(${JSON.stringify(x).replace(/'/g,"&#39;")})' title="Edit"><i class="fas fa-pen"></i></button><button class="danger" onclick="deletePortalLinkSettingV20('${x.id}')" title="Delete"><i class="fas fa-trash"></i></button></div></article>`;
  root.innerHTML=groups.map(g=>`<section class="ces-setting-link-section-v223 ${sectionClass(g.code)}"><div class="ces-setting-link-section-head-v223"><div><i class="fas ${sectionIcon(g.code)}"></i><strong>${sectionLabel(g.code)}</strong></div><span>${g.rows.length} links</span></div><div class="ces-setting-link-section-grid-v223">${g.rows.map(card).join('')}</div></section>`).join('')||'<div class="py-8 text-center text-slate-400">No portal links configured.</div>';
}
async function openPortalLinkEditorV20(row){
  row=row||{};const currentSection=String(row.section||'APPLICATION').toUpperCase();const currentSort=Math.max(1,Math.min(50,Number(row.sortOrder||1)));
  const sortOptions=Array.from({length:50},(_,i)=>i+1).map(n=>`<option value="${n}" ${n===currentSort?'selected':''}>${n}</option>`).join('');
  const result=await Swal.fire({title:row.id?'Edit Portal Link':'Add Portal Link',width:780,showCancelButton:true,confirmButtonText:'Save Link',customClass:{popup:'ces-portal-link-editor-popup'},html:`<div class="ces-portal-editor-grid">
    <label><span>Section</span><select id="pl-section" class="ces-portal-editor-control"><option value="APPLICATION" ${currentSection==='APPLICATION'?'selected':''}>Applications & Services</option><option value="NHEALTH_SERVICE" ${currentSection==='NHEALTH_SERVICE'?'selected':''}>N Health Services</option><option value="INNOVATION" ${currentSection==='INNOVATION'?'selected':''}>Innovation</option></select></label>
    <label><span>Sort Order</span><select id="pl-sort" class="ces-portal-editor-control">${sortOptions}</select></label>
    <label><span>Title TH</span><input id="pl-title-th" class="ces-portal-editor-control" value="${row.titleTh||''}"></label><label><span>Title EN</span><input id="pl-title-en" class="ces-portal-editor-control" value="${row.titleEn||''}"></label>
    <label class="wide"><span>Description TH</span><textarea id="pl-desc-th" class="ces-portal-editor-control">${row.descriptionTh||''}</textarea></label><label class="wide"><span>Description EN</span><textarea id="pl-desc-en" class="ces-portal-editor-control">${row.descriptionEn||''}</textarea></label>
    <label class="wide"><span>URL</span><input id="pl-url" class="ces-portal-editor-control" type="url" value="${row.url||'#'}"></label>
    <label><span>Font Awesome Icon</span><input id="pl-icon" class="ces-portal-editor-control" value="${row.icon||'fa-link'}"></label><label><span>Theme</span><input id="pl-theme" class="ces-portal-editor-control" value="${row.theme||'blue'}"></label>
    <label><span>Status</span><select id="pl-status" class="ces-portal-editor-control"><option value="ACTIVE" ${row.status!=='INACTIVE'?'selected':''}>ACTIVE</option><option value="INACTIVE" ${row.status==='INACTIVE'?'selected':''}>INACTIVE</option></select></label>
    <label class="ces-portal-featured-toggle"><input id="pl-featured" type="checkbox" ${row.featured?'checked':''}><span>Featured / Big card</span></label>
  </div>`,preConfirm:()=>({id:row.id||'',actorId:(window.CES_CURRENT_USER||{}).id||'',section:document.getElementById('pl-section').value,sortOrder:Number(document.getElementById('pl-sort').value||1),titleTh:document.getElementById('pl-title-th').value.trim(),titleEn:document.getElementById('pl-title-en').value.trim(),descriptionTh:document.getElementById('pl-desc-th').value.trim(),descriptionEn:document.getElementById('pl-desc-en').value.trim(),url:document.getElementById('pl-url').value.trim(),icon:document.getElementById('pl-icon').value.trim(),theme:document.getElementById('pl-theme').value.trim(),status:document.getElementById('pl-status').value,featured:document.getElementById('pl-featured').checked})});
  if(!result.isConfirmed)return;
  try{const res=await window.CES_API.callFunction('savePortalLink',[result.value],{transport:'iframe',timeoutMs:60000});if(!res||res.success===false)throw new Error((res&&res.message)||'Save failed');await loadPortalLinksSettingV20(true);try{localStorage.removeItem('CES_PORTAL_CACHE_V19_'+String((window.CES_CURRENT_USER||{}).id||'anonymous'));}catch(e){}Swal.fire({icon:'success',title:'Portal link saved',timer:1200,showConfirmButton:false});}catch(err){Swal.fire('Save Error',err.message||String(err),'error');}
}
async function deletePortalLinkSettingV20(id){const ok=await Swal.fire({icon:'warning',title:'Delete portal link?',showCancelButton:true,confirmButtonText:'Delete',confirmButtonColor:'#dc2626'});if(!ok.isConfirmed)return;try{const res=await window.CES_API.callFunction('deletePortalLink',[{id:id,actorId:(window.CES_CURRENT_USER||{}).id||''}],{transport:'iframe',timeoutMs:50000});if(!res||res.success===false)throw new Error((res&&res.message)||'Delete failed');await loadPortalLinksSettingV20(true);}catch(err){Swal.fire('Delete Error',err.message||String(err),'error');}}
window.cesScrollSettingV20=cesScrollSettingV20;window.loadPortalLinksSettingV20=loadPortalLinksSettingV20;window.openPortalLinkEditorV20=openPortalLinkEditorV20;window.deletePortalLinkSettingV20=deletePortalLinkSettingV20;
