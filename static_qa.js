#!/usr/bin/env node
'use strict';

const fs=require('fs');
const path=require('path');
const cp=require('child_process');
const root=path.resolve(__dirname,'..');
const failures=[];
function read(rel){return fs.readFileSync(path.join(root,rel),'utf8');}
function check(ok,label){if(!ok)failures.push(label);else process.stdout.write('PASS '+label+'\n');}
function has(rel,re,label){check(re.test(read(rel)),label);}
function lacks(rel,re,label){check(!re.test(read(rel)),label);}

const appFiles=[];
function walk(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,ent.name);if(ent.isDirectory())walk(p);else if(ent.isFile()&&p.endsWith('.js'))appFiles.push(p);}}
walk(path.join(root,'backend'));walk(path.join(root,'frontend'));
for(const file of appFiles){const result=cp.spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(result.status!==0)failures.push('JavaScript syntax: '+path.relative(root,file));}
check(!failures.some(x=>x.startsWith('JavaScript syntax:')),'all '+appFiles.length+' application JavaScript files parse');

const allJs=appFiles.map(p=>fs.readFileSync(p,'utf8')).join('\n');
check(!/function\s+[A-Za-z_$][\w$]*(?:_V\d+|V\d+)\s*\(/.test(allJs),'no version-suffixed function declarations');
check(!/(?:window\.|globalThis\.)?[A-Za-z_$][\w$]*(?:_V\d+|V\d+)\s*=\s*function\s*\(/.test(allJs),'no version-suffixed function assignments');

const requiredFunctions={
  'backend/System_Settings_Permissions.js':['ensureConfigSchema','CES_MODULE_LINKS_SETUP'],
  'backend/MEMO.js':['CES_MEMO_WORKORDER_SYNC_SOURCE','CES_MEMO_WORKORDER_RECHECK'],
  'backend/Stock_Dashboard.js':['sd_getInfusionTabExportLatest','CES_EXPORT_RECHECK'],
  'backend/System_Setup.js':['CES_TRIGGER_SETUP_LATEST','CES_TRIGGER_RECHECK_LATEST','CES_SETUP_AFTER_DEPLOYMENT'],
  'backend/API_LIFF_Bridge.js':['CES_API_DEPLOYMENT_PROBE','CES_API_RECHECK'],
  'backend/Release_Core.js':['CES_RELEASE_RECHECK','CES_LINE_FUNCTION_RECHECK'],
  'backend/Automation_Notifications.js':['CES_NOTIFICATION_SETUP','CES_NOTIFICATION_HANDLER_RECHECK'],
  'backend/Team_Information.js':['CES_TEAM_INFORMATION_RECHECK'],
  'backend/Line_OA.js':['CES_LINE_RECHECK'],
  'backend/Audit_Log.js':['getAuditLogData','getAuditLogLatest','getAuditPersonSummary','saveAuditLogImport','saveAuditLogRow'],
  'backend/TE_Generate.js':['getTEGenerateData','saveTEGenerateData','saveAndGenerateTEReport','generateTEReport','CES_TE_GENERATE_RECHECK']
};
for(const [rel,names] of Object.entries(requiredFunctions)){const src=read(rel);for(const name of names)check(new RegExp('function\\s+'+name+'\\s*\\(').test(src),name+' in '+rel);}

const stock=read('backend/Stock_Dashboard.js');
for(const pair of [['summary','Summary'],['contract','Infusion Rental History'],['equipment','Infusion Pump Dashboard'],['accessories_dashboard','Accessories Dashboard'],['accessories_data','Accessories Data']])check(stock.includes(pair[0]+":'"+pair[1]+"'"),'export map '+pair[0]+' -> '+pair[1]);
has('frontend/js/modules/latest-fixes.js',/si_exportCurrent=function\(\).*tab==='acc'\?w\.si_exportAccessoriesData\(\):w\.si_exportAccessoriesDashboard\(\)/s,'Inventory export follows active tab');
has('frontend/js/modules/latest-fixes.js',/sd_exportContracts=function\(\).*key:'contract'.*Infusion Rental History/s,'Contract export uses exact sheet');
check(read('frontend/index.html').indexOf('latest-fixes.js')>read('frontend/index.html').indexOf('991-runtime-stock-final.js'),'latest frontend overrides load last');

const api=read('backend/API_LIFF_Bridge.js');
for(const name of ['CES_RELEASE_RECHECK','CES_MEMO_WORKORDER_SYNC_SOURCE','getAuditLogLatest','getAuditPersonSummary','saveAuditLogImport','sd_getInfusionTabExportLatest','si_getAccessoriesDashboardFast','CES_NOTIFICATION_SETUP','getTEGenerateData','saveTEGenerateData','saveAndGenerateTEReport','generateTEReport'])check(api.includes('"'+name+'"')||api.includes("'"+name+"'"),'API allowlist includes '+name);
check(!fs.existsSync(path.join(root,'backend/Release_Recheck.js')),'Release_Recheck.js is merged into Release_Core.js');
has('frontend/views/01-shell.html',/id="btn-te_generate"[\s\S]*TE Generate/,'TE Generate is in the Operation sidebar');
has('frontend/index.html',/views\/te_generate\.html[\s\S]*81-te-generate\.js/,'TE Generate view and module are in deferred manifest');
has('frontend/js/modules/900-app-controller.js',/tab === 'te_generate'[\s\S]*initTEGenerate/,'TE Generate route initializes its page');
has('backend/TE_Generate.js',/function\s+teFillPage_\s*\(/,'TE Generate declares the page fill entry function before wrapper setup');
has('backend/System_Setup.js',/Never manufacture \/exec[\s\S]*if\(\/\\\/dev\$\/i\.test\(runtime\)\)runtime=''/,'Post-deployment setup rejects editor dev URLs instead of guessing a production deployment');
has('frontend/js/modules/latest-fixes.js',/exportLoadedFallback[\s\S]*Export completed from loaded data/,'Infusion XLSX export falls back to loaded rows when API is unavailable');
lacks('frontend/views/stock_dashboard.html',/Infusion Pump · Equipment \+ Rental Workflow|sdDataFreshness/,'Infusion header subtitle and updated badge are removed');
has('backend/MEMO.js',/targetMonths=\[monthKey\(-1\),monthKey\(0\),monthKey\(1\)\]/,'Memo sync uses previous current and next month window');
has('backend/MEMO.js',/ROLLING_3_MONTH_REPLACE_KEEP_HISTORY/,'Memo sync replaces rolling source months without deleting history');
has('backend/MEMO.js',/fallbackMonthUsed/,'Memo sync safely falls back when the new month has no rows');
has('backend/MEMO.js',/Cost 1 \+ Cost 2 \+ Cost 3 \+ Accommodation Cost/,'Memo cost fallback is documented in result');
has('backend/Automation_Notifications.js',/inventory_low_stock_biweekly[\s\S]*weekday:'TUESDAY'[\s\S]*weekInterval:2[\s\S]*hour:10/,'low stock schedule Tuesday every 2 weeks at 10:00');
has('backend/Automation_Notifications.js',/type==='OTHER'\|\|team==='REPORT'/,'Accessories email includes Accessories Type OTHER and Team REPORT');
has('backend/Automation_Notifications.js',/columns=\['team','accessories_type','item_name','stock_qty','min_stock_qty','status'\]/,'Accessories email lists OTHER and REPORT detail with quantities and status');
has('frontend/js/modules/188-audit-log.js',/confirmButtonText:'Save',cancelButtonText:'Close'/,'Audit detail has Save and Close');
has('backend/Line_Inventory.js',/rows\.length && typeof cesLineHubCachePut_/,'LINE Inventory does not cache transient empty results');
has('backend/Line_Inventory.js',/return type==='OTHER'\|\|team==='REPORT'/,'LINE Inventory lists OTHER and REPORT rows');
has('frontend/js/modules/140-stock-dashboard.js',/Contract summary is independent from dashboard filters/,'Rental Contract Summary ignores dashboard filters');
has('frontend/views/van_booking.html',/Van Job List Details[\s\S]*van-job-list-v55/,'Van Job List Details is present');
check(!/van-available-list/.test(read('frontend/views/van_booking.html')),'Van Available Dates list is removed');
lacks('frontend/js/modules/170-vehicle-booking.js',/>Open event</,'Van Job List removes external Open event link');
has('frontend/js/modules/170-vehicle-booking.js',/>Usage<[\s\S]*>Cost</,'Van Usage and Cost use separate columns');
has('backend/Van_Booking.js',/costCenter:cesVanField/,'Van booking extracts Cost Center');
has('backend/Van_Booking.js',/CES Hub V55\.2[\s\S]*CalendarApp[\s\S]*Public Google Calendar ICS/,'Van backend restores V30.0.35 dashboard implementation');
has('frontend/views/inventory.html',/siInventorySourceLink[\s\S]*initStockInventoryModule\(true\)/,'Inventory header keeps source and refresh actions');
lacks('frontend/views/inventory.html',/Accessories & Inventory Dashboard|Updated <span/,'Inventory header subtitle and updated badge are removed');
lacks('frontend/views/inventory.html',/si_applyQuickSourceFilter\('(GENERAL|OTHER|REPORT)'\)/,'Inventory header General Other Report buttons removed');
has('frontend/js/modules/200-ai-local-assistant.js',/ces-ai-user-collapsed/,'AI CES collapses to a reopenable launcher');
has('frontend/js/modules/189-notification-config.js',/scheduleResync/,'Notification Config retries API automatically');
has('frontend/js/modules/189-notification-config.js',/w\.saveNotificationCard=saveNotificationCard/,'Notification card Save action is globally callable');
has('backend/Automation_Notifications.js',/V30\.0\.41-single-scheduler/,'Notification Config uses V30.0.41 single-scheduler backend');
lacks('frontend/views/van_booking.html',/getVanBookingDashboard/,'Van calendar view has no Apps Script dashboard dependency');
has('backend/MEMO.js',/CES_MWO_DASH_V36/,'Memo and Work Order API has V36 response cache');
has('backend/Stock_Config.js',/costea[\s\S]*totalCost:totalCost[\s\S]*inventoryValue:totalCost/,'Accessories Cost/ea and Total Cost columns are mapped');
has('backend/Stock_Config.js',/add\(STOCK_PRO\.SPREADSHEET_ID\);[\s\S]*CES_STOCK_SPREADSHEET_ID/,'Verified Inventory workbook takes priority over legacy properties');
has('backend/Stock_Inventory.js',/Cost\/ea/,'Accessories schema preserves Cost/ea header');
has('backend/Stock_Inventory.js',/Cost\/ea','Total Cost'[\s\S]*getRange\(2,28[\s\S]*sourceColumn:'AB · Total Cost'/,'Accessories column AB stores and summarizes Total Cost');
has('backend/Stock_Inventory.js',/Always read the small Accessories Data tab canonically[\s\S]*sp_getAccessories_\(\)/,'Inventory bypasses legacy zero-cost server cache');
has('backend/Stock_Inventory.js',/function si_getAccessoriesDashboardFast[\s\S]*CES_ACCESSORIES_DASHBOARD_V41/,'Inventory dashboard has a lightweight Accessories Data API');
has('frontend/js/modules/997-stock-inventory-settings-kpi.js',/function card_\(id[\s\S]*id="'\+id\+'"[\s\S]*card_\('siDashTotalAccCurrent'/,'Inventory KPI cards retain stable DOM ids');
has('frontend/js/modules/997-stock-inventory-settings-kpi.js',/si_getAccessoriesDashboardFast[\s\S]*si_renderAccessoriesDashboard/,'Inventory paints summary cards from the fast API');
has('frontend/js/modules/997-stock-inventory-settings-kpi.js',/function totalCost_[\s\S]*Sum of Total Cost column AB/,'Inventory Cost card uses column AB');
has('backend/Stock_Check.js',/function sc_getDeviceLookupOptions/,'Check Stock supports compact device preload');
has('backend/Automation_Notifications.js',/CES_ACCESSORY_DAILY_ISSUE_SUMMARY/,'Daily issued accessories notification exists');
has('backend/Automation_Notifications.js',/Reporting\.CVM@bdms\.co\.th/,'Daily issued accessories includes Reporting CVM');
has('backend/Automation_Notifications.js',/PLAN_PM[\s\S]*PLAN_CAL[\s\S]*PLAN_CAL\/PM/,'Infusion notification is limited to requested maintenance plans');
has('backend/MEMO.js',/type==='WORK_ORDER'\?\(r\[6\]\|\|r\[10\]\):r\[10\]/,'Work Order team derives from Job No');
has('frontend/js/modules/185-memo-workorder.js',/currentMonthNo\(\)/,'Memo default uses current Bangkok month');
lacks('frontend/views/memo_workorder.html',/mwoDateFromV3030|mwoDateToV3030/,'Memo date range inputs removed');
has('backend/OT_generate.js',/SHEET_EXPORT_URL/,'OT Generate defaults to direct export mode');
check(!fs.existsSync(path.join(root,'backend/Report_manage.js')),'obsolete Report_manage.js is removed');
has('backend/Runtime_Core.js',/unitCost: unitCost[\s\S]*totalCost:[\s\S]*inventoryValue:/,'shared Stock snapshot preserves Cost/ea and Total Cost');
has('frontend/js/modules/991-runtime-stock-final.js',/CES_STOCK_SNAPSHOT_V39_ACCESSORIES_AA/,'browser cache version invalidates zero-cost snapshots');
has('frontend/js/modules/188-audit-log.js',/1js3cGqlP9oGCYHcTrj-Wcrf5MMlJqkHj4Kcr1Mozug0/,'LAB Audit links exact Google working mirror');
has('frontend/js/modules/188-audit-log.js',/Summary%20CAR_OBS%20-%20External%20Audit/,'LAB Audit links exact SharePoint source');
has('backend/Document_Review_Alert.js',/\['MED','LAB','EHS','ENV'\]/,'Document Review validates exact MED LAB EHS ENV sheets');
has('backend/Document_Review_Alert.js',/1-iCqmkBoOc49lLrUxhsZZIlIHBaArp2CdUukmUqmIdc/,'Document Review uses the requested master source');
has('frontend/js/modules/189-notification-config.js',/weekdays=\['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY'\]/,'Notification weekday dropdown is Monday-Friday');
has('frontend/js/modules/189-notification-config.js',/weeks=\[1,2,3,4,5\]/,'Notification number-of-weeks dropdown is 1-5');
has('frontend/js/modules/189-notification-config.js',/saveNotificationAutomationCard[\s\S]*transport:'iframe'[\s\S]*runNotificationAutomationNow[\s\S]*transport:'iframe'/,'Notification send saves configuration and uses the reliable write transport');
has('frontend/views/notification_config.html',/button\{background:#64748b!important/,'Notification buttons are all gray');
lacks('frontend/views/notification_config.html',/GLOBAL FALLBACK|nc-admin-cc/,'Notification Config has no global CC field');
has('backend/Automation_Notifications.js',/CES_NOTIFICATION_SCHEDULER_TICK[\s\S]*everyMinutes\(15\)/,'Notification Automations use one shared scheduler');
has('backend/Automation_Notifications.js',/legacyNotificationTriggers:[\s\S]*globalCcDisabled:true/,'Notification recheck detects legacy triggers and disabled global CC');
has('backend/Audit_Log.js',/Audit Dashboard 2026[\s\S]*personSummary/,'EHS Audit uses dashboard person summary');
has('backend/Audit_Log.js',/function auditEhsDashboardSummary_[\s\S]*Responsible Person[\s\S]*calculated fallback/i,'EHS Audit dynamically finds dashboard tables and has a detail fallback');
has('backend/TE_Generate.js',/function teInfoTable_[\s\S]*Attachment URLs/,'TE_Info has a canonical editable table');
has('backend/TE_Generate.js',/Distance','Liters','Fuel'[\s\S]*totalDistance:distance,totalLiters:liters/,'TE stores liters and returns distance and liters summaries');
has('frontend/js/modules/81-te-generate.js',/สรุปรวมระยะทาง[\s\S]*สรุปรวมจำนวนลิตร[\s\S]*รวมค่าใช้จ่ายทั้งหมด/,'TE entries show all requested summaries');
has('frontend/js/modules/latest-fixes.js',/te-preview-pdf[\s\S]*te-preview-xlsx[\s\S]*te-result-frame/,'TE result dialog previews PDF and Excel');
has('frontend/views/te_generate.html',/TE Entries[\s\S]*Add row[\s\S]*>TE Generate<\/button>/,'TE Generate action is below TE Entries');
lacks('frontend/views/te_generate.html',/onclick="teSave\(\)"/,'TE removes separate Save TE_Info action');
has('frontend/js/modules/81-te-generate.js',/saveAndGenerateTEReport/,'TE uses combined allowlisted save-and-generate API');
lacks('frontend/views/te_generate.html',/te-page-postal|Load TE_Info/,'TE removes postal code and visible Load TE button');
has('frontend/js/modules/81-te-generate.js',/tePlaceChanged[\s\S]*teDuplicateRow[\s\S]*รวมค่าใช้จ่ายทั้งหมด/,'TE rows autofill places, duplicate\/delete and calculate totals');
has('frontend/js/modules/latest-fixes.js',/limit:500/,'Exact XLSX exports use reliable bounded chunks');
has('frontend/views/inventory.html',/siCheckoutEmployeeId[\s\S]*siCheckoutCostCenter/,'Accessories checkout has employee and Cost Center fields');
has('frontend/js/modules/latest-fixes.js',/Unit Cost[\s\S]*Line Total[\s\S]*Subtotal[\s\S]*VAT 7%[\s\S]*Grand Total/,'Accessories checkout calculates unit, line, VAT and grand totals');
has('frontend/views/stock_dashboard.html',/sdInfusionCartDrawerV41[\s\S]*sdInfusionDueDateV41/,'Infusion Pump has a separate checkout drawer');
has('frontend/js/modules/latest-fixes.js',/#sdCartFabCurrent,#view-inventory \.sp-cart-fab\{right:18px!important;left:auto!important;bottom:96px/,'Inventory carts are positioned above the AI launcher');
has('backend/Runtime_Core.js',/function cesStock_extendRentalBatch[\s\S]*setValues\(values\)[\s\S]*rentalStatus:'เช่ายืม'/,'Rental contract batch update uses one bulk sheet write');
has('backend/Runtime_Core.js',/function cesStockLegacy_editEquipment_[\s\S]*stockCore_appendRental_[\s\S]*stockCore_closeLatestRental_/,'Equipment status change keeps rental history consistent');
has('frontend/js/modules/991-runtime-stock-final.js',/si_returnPrompt=function[\s\S]*preConfirm:function\(\)[\s\S]*x\.value\.location/,'Equipment return captures modal values before the dialog closes');
has('backend/Stock_Inventory.js',/function si_checkoutCart[\s\S]*accessorySubtotal[\s\S]*accessoryVatRate = 0\.07[\s\S]*ACCESSORY_EXPENSE/,'Accessories checkout logs subtotal, VAT and grand total');
has('backend/Automation_Notifications.js',/cesNotificationLowStockFallback_[\s\S]*Accessories Data[\s\S]*Inventory Low Stock Summary/,'Low-stock notification remains available when its optional source file is missing');
has('frontend/js/modules/189-notification-config.js',/function run\(i,btn,mode\)[\s\S]*saveNotificationAutomationCard[\s\S]*runNotificationAutomationNow/,'Notification Test and Send always save the active card first');
has('frontend/js/modules/900-app-controller.js',/CES_CALENDAR_BACKGROUND_SYNC_AT[\s\S]*21600000[\s\S]*var request=force\?cesSyncCalendarRuntime_/,'Calendar paints cached data before throttled background synchronization');
has('backend/Signin.js',/while \(staffRow\.length < 29\) staffRow\.push\(''\)/,'Registration writes all 29 Staff_Data columns');
has('backend/Signin.js',/function cesStaffSchema_[\s\S]*lineUserId:find\(\['lineUserId'[\s\S]*function cesStaffUserFromRow_[\s\S]*lineUserId:cesStaffValue_/,'Login maps Staff_Data columns correctly');
has('frontend/views/00-login.html',/id="reg-position"[\s\S]*id="reg-role"/,'Registration separates Position and Role');
has('frontend/views/car_booking.html',/id="car-toll-fee"/,'Car return includes toll fee field');
has('backend/Vehical_Booking.js',/'Toll Fee':tollFee/,'Car return persists toll fee');
check(!fs.existsSync(path.join(root,'backend/Infusion_Pump_Source.js')),'Infusion Pump source is combined into Stock_Dashboard.js');
lacks('frontend/js/modules/latest-fixes.js',/Promise\.resolve\(p\)\.finally\(function\(\)\{w\.loadNotificationLog\(\);\}\)/,'Notification log is not auto-loaded with configuration');
has('backend/Home.js',/function getHomeDashboard\(options\)[\s\S]*getPortalDashboard\(options\)/,'Home dashboard routes to the portal dashboard without recursion');
lacks('backend/Home.js',/function getHomeDashboard\(options\)\s*\{\s*var result=getHomeDashboard/,'Home dashboard has no self recursion');
lacks('backend/Home.js',/function getHomeCritical\(options\)\s*\{[\s\S]{0,120}getHomeCritical\(/,'Home critical API has no self recursion');
has('frontend/js/modules/185-memo-workorder.js',/function injectStyle\(\)/,'Memo and Work Order defines its style injector');
has('frontend/views/stock_dashboard.html',/sdEquipmentBrandCurrent[\s\S]*sdEquipmentLocationCurrent/,'Infusion equipment list has Brand and Location filters');
has('frontend/js/modules/140-stock-dashboard.js',/sdEquipmentBrandCurrent[\s\S]*sdEquipmentLocationCurrent[\s\S]*sdEqActionButtons/,'Infusion equipment filters preserve all action buttons');
has('frontend/js/modules/189-notification-config.js',/nc-time-pair[\s\S]*id="nc-hour-[\s\S]*id="nc-minute-/,'Notification trigger hour and minute share one grouped field');
has('backend/Automation_Notifications.js',/accessories_daily_issue:[\s\S]*kind:'DAILY'[\s\S]*hour:16,minute:30/,'Daily Accessories Issued runs every day at 16:30');
has('backend/Automation_Notifications.js',/inventory_report_biweekly:[\s\S]*kind:'BIWEEKLY'[\s\S]*weekday:'TUESDAY'/,'Report inventory summary runs Tuesday biweekly');
has('backend/Automation_Notifications.js',/inventory_other_biweekly:[\s\S]*kind:'BIWEEKLY'[\s\S]*weekday:'TUESDAY'/,'Other inventory summary runs Tuesday biweekly');
has('backend/Automation_Notifications.js',/monthly_report_reminder:[\s\S]*kind:'WEEK_OF_MONTH'[\s\S]*weekOfMonth:4/,'Monthly Report reminder runs on the fourth Monday');
has('backend/Automation_Notifications.js',/function cesNotificationAddHubLink_[\s\S]*Back to CES Hub/,'Notification email templates include a Back to CES Hub button');
has('frontend/js/modules/20-service-csi.js',/function serviceCustomerFallback_[\s\S]*function loadServiceCustomerList[\s\S]*getCustomerListData/,'Service CSI customer list uses the public API with local fallback');
has('backend/Van_Booking.js',/memoNo:cesVanMemoNo/,'Van Booking extracts MEMO No from Calendar descriptions');
has('frontend/js/modules/170-vehicle-booking.js',/>MEMO No</,'Van Job List displays MEMO No');
has('frontend/views/van_booking.html',/ces-van-booking-links[\s\S]*LG Booking[\s\S]*N Mobile \(LG\)/,'Van Booking has two separated booking link cards');
has('frontend/views/van_booking.html',/https:\/\/giztix\.com\//,'Van Booking header includes delivery booking');
has('backend/Automation_Notifications.js',/calendar_weekly_summary:[\s\S]*weekday:'SUNDAY'/,'Calendar weekly notification runs Sunday');
has('backend/Automation_Notifications.js',/kpi_ehs_daily:[\s\S]*hour:16,minute:0/,'KPI Tracking EHS notification runs daily at 16:00');
has('backend/Automation_Notifications.js',/rows\.push\(Object\.assign\(\{\},def\|\|\{\},incoming,\{enabled:true\}\)\)/,'Notification card save supports required-card upsert');
has('frontend/js/modules/206-global-header-actions.js',/function normalizeActionOrder/,'Header actions are normalized by semantic order');
has('frontend/js/modules/206-global-header-actions.js',/score=reset\?50:excel\?40:pdf\?30:refresh\?20/,'Header right edge order is reset excel pdf resync');
has('frontend/js/modules/latest-fixes.js',/id=\\?"te-generated-result\\?"|te-generated-result/,'TE result renders inside the page');
has('frontend/js/modules/81-te-generate.js',/ห้ามใช้วันที่ซ้ำ/,'TE blocks duplicate dates');
has('backend/Checkin.js',/checkinValidateTransition_/,'Check-in validates IN and OUT transitions on the server');
has('backend/Line_Inventory.js',/รวมราคา/,'LINE Inventory shows issued price totals');
has('backend/Automation_Notifications.js',/Normal Stock/,'Inventory notification includes Low and Normal stock status');
has('backend/Automation_Notifications.js',/จำนวนงานที่เปลี่ยนวันนี้/,'KPI EHS notification uses today changes');
has('frontend/css/app.css',/V56 Daily Jobs: original vertical cards, compact and self-contained/,'Check-in Daily Jobs uses compact vertical cards');
has('frontend/js/modules/15-portal-dashboard.js',/getHomeDashboard[\s\S]*transport:'iframe'/,'Home retries the dashboard using iframe transport');
has('frontend/js/modules/990-runtime-system-final.js',/iframe retry failed/,'Service CSI retries using iframe transport');
has('backend/Signin.js',/schema\.lineUserId\+1[\s\S]*cesStaffValue_\(r,fallbackSchema,'lineUserId'\)/,'LINE login searches the live Staff_Data lineUserId header');
has('frontend/js/modules/00-auth-login.js',/launch\('jsonp', 24000\)[\s\S]*launch\('iframe', 42000\)[\s\S]*46000/,'LINE login tolerates Apps Script cold starts');
has('frontend/views/checkin.html',/md:grid-cols-3[\s\S]*max-h-\[540px\]/,'Daily Jobs renders a scrollable three-column grid');
has('frontend/js/modules/70-checkin.js',/ces-checkin-card-actions[\s\S]*aria-label="Check in to this job"[\s\S]*openActionModal/,'Daily Job IN and OUT actions remain directly accessible');
has('frontend/css/app.css',/V30\.0\.47[\s\S]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)[\s\S]*@media\(max-width:700px\)/,'Daily Jobs reflow from three columns to mobile without clipping actions');
has('backend/Signin.js',/expectedCurrentColumns:\{lineUserId:14,lineName:15\}/,'LINE linkage validates canonical Staff_Data N:O columns');
has('frontend/css/app.css',/Shared mobile usability[\s\S]*stockpro-actions[\s\S]*stockpro-kpi-grid[\s\S]*swal2-popup/,'Shared mobile layout keeps actions, KPI cards and dialogs usable');
has('frontend/css/app.css',/V30\.0\.32[^\n]*utilization charts below the KPI row[\s\S]*ces-car-utilization-section-v3032/,'Car Booking utilization section is emphasized below KPIs');
has('backend/Van_Booking.js',/MEMO\s*\(\?:NO|NUMBER\)[\s\S]*memoNo:cesVanMemoNo/,'Van MEMO parser accepts Calendar detail labels and exposes memoNo');
has('frontend/js/modules/991-runtime-stock-final.js',/u\.name_th\|\|u\.nameTh[\s\S]*nameTh:thai/,'Inventory checkout prioritizes the Thai borrower name');
has('frontend/js/modules/latest-fixes.js',/width:min\(600px,100vw\)[\s\S]*height:100dvh!important/,'Inventory and Infusion checkout drawer uses the full viewport height');
has('frontend/js/modules/60-calendar-master.js',/openJobTracker2025[\s\S]*getCalendarData',\[false\]/,'Plan Tracker reuses Calendar data before requesting the API');
has('frontend/js/modules/20-service-csi.js',/CES_loadLib\('https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/xlsx/,'Service CSI upload lazy-loads the XLSX parser');
has('backend/Automation_Notifications.js',/saveNotificationAutomationCard=function\(payload\)[\s\S]*enabled:true[\s\S]*saveNotificationAutomationConfig/,'Notification per-card save persists enabled configuration');
has('frontend/js/modules/180-team-information.js',/MED','LAB','EHS','ENV','INNO','MNG','TES/,'Team Information supports INNO in the canonical team list');
has('frontend/js/modules/900-app-controller.js',/window\.globalYearlyStats=globalYearlyStats;window\.globalCalData=globalCalData/,'Home and Management publish shared core data for dependent modules');
has('frontend/js/modules/900-app-controller.js',/CES_CORE_CACHE_TTL_V3032\s*=\s*10 \* 60 \* 1000/,'Core module data remains cached for ten minutes across tab changes');
has('backend/System_Authorization_OAuth.js',/getAuthorizationInfo\(ScriptApp\.AuthMode\.FULL\)/,'Authorization check uses manifest-derived Apps Script scopes');
lacks('backend/System_Authorization_OAuth.js',/var scopes=\[[^\]]*openid/,'Authorization check does not request invalid LIFF openid scope');
has('backend/API_LIFF_Bridge.js',/CES_INFUSION_ALERTS_RECHECK_V3030:'CES_INFUSION_ALERTS_RECHECK'/,'Legacy Infusion alert recheck resolves to the canonical function');
has('backend/API_LIFF_Bridge.js',/"syncCalendarMonthAndNextTwo"/,'Calendar three-month helper is API allowlisted');
has('backend/API_LIFF_Bridge.js',/Do not transform the editor-only \/dev endpoint[\s\S]*runtimeExec=\/\\\/exec\$\/i/,'API deployment probe rejects editor dev URL and requires the production exec URL');
has('backend/Stock_Inventory.js',/aliases=key==='total_cost'\?\['total_cost','sum_cost'\]/,'Inventory schema accepts SUM COST as the canonical total-cost column');
has('backend/Stock_Inventory.js',/totalIndex=normalized\.indexOf\('sum_cost'\)[\s\S]*success:unitIndex>=0&&totalIndex>=0/,'Stock source recheck finds cost columns dynamically');
has('backend/System_Setup.js',/stock:\{success:[\s\S]*missingAllowed:[\s\S]*failedModules:/,'Post-deployment setup writes a compact diagnostic log');
has('backend/System_Setup.js',/function CES_CONNECTIVITY_RECHECK\([\s\S]*function CES_CONNECTIVITY_REPAIR\([\s\S]*function CES_SYSTEM_SYNC_RECHECK\(/,'Connectivity repair, recheck and legacy sync entry points exist');
has('backend/System_Setup.js',/For security, do not paste the access token into source code/,'LINE token setup requires Script Properties instead of source code');
has('backend/Line_OA.js',/function CES_LINE_STATUS\([\s\S]*getProperty\('LINE_MESSAGING_CHANNEL_ACCESS_TOKEN'\)[\s\S]*actionRequired/,'LINE status reports a missing token without throwing');
has('backend/Line_OA.js',/LINE_ACCESS_TOKEN_INVALID[\s\S]*Do not use LINE_CHANNEL_SECRET as the access token[\s\S]*function CES_LINE_TOKEN_DIAGNOSTIC/,'LINE HTTP 401 returns an actionable token diagnostic without exposing secrets');
lacks('backend/System_Properties_Cleanup.js',/'LINE_MESSAGING_CHANNEL_ACCESS_TOKEN'\s*,/,'Property cleanup never deletes the required LINE access token');
has('backend/Automation_Notifications.js',/cesNotificationWriteConfigSheet=function[\s\S]*mismatched[\s\S]*configSheetVerified=true/,'Notification save verifies every Config sheet value before success');
has('backend/Automation_Notifications.js',/parseCalendarDate_\(r\[1\][\s\S]*cesRentalHtml_\(r\[3\][\s\S]*cesRentalHtml_\(r\[4\]/,'Calendar weekly mail maps event title and location to the correct columns');
has('backend/Automation_Notifications.js',/cesNotificationKpiDateIsToday_[\s\S]*raw\.repDate[\s\S]*raw\.supDate[\s\S]*raw\.engDate/,'KPI EHS daily mail uses workflow stage dates changed today');
has('frontend/css/app.css',/V30\.0\.50[\s\S]*ces-checkin-job-card\{[\s\S]*height:218px[\s\S]*overflow:hidden[\s\S]*ces-checkin-card-actions/,'Final Daily Jobs cards contain their IN and OUT actions');
has('frontend/js/modules/206-global-header-actions.js',/CES_resetCurrentViewFields[\s\S]*title='Reset Field'[\s\S]*normalizeActionOrder/,'Every module header gets a safe Reset Field action and canonical ordering');
has('frontend/js/modules/185-memo-workorder.js',/async function handleUpload\(file\)[\s\S]*Sheets\.Memo[\s\S]*Sheets\.WorkOrder[\s\S]*mwoUploadChunks_/,'Memo and Work Order upload parses the supplied workbook and writes bounded chunks');
has('frontend/js/modules/185-memo-workorder.js',/getMemoWorkOrderDashboard[\s\S]*transport:'jsonp'[\s\S]*timeoutMs:35000/,'Memo dashboard uses the fast cached read transport');
has('backend/Stock_Dashboard.js',/CES_RENTAL_ACTIVE_CACHE_V3047[\s\S]*activeContracts:activeContracts/,'Infusion Contract uses the dashboard active-contract cache');
has('frontend/js/modules/140-stock-dashboard.js',/activeContracts[\s\S]*provisional[\s\S]*sd_getRentalWorkflowCards[\s\S]*transport:'jsonp'/,'Infusion Contract renders cached rows before background workflow sync');
has('backend/Team_Information.js',/CES_STAFF_DATA_HEADERS_V3047[\s\S]*'lineUserId','lineName'[\s\S]*'Training Source File','Training Source File'/,'Staff_Data enforces the requested 29-column schema');
has('backend/Team_Information.js',/put\('teamName',updatedTeam\);put\('team',updatedTeam\)[\s\S]*CES_STAFF_DATA_SCHEMA_REPAIR/,'Team Information writes both team columns and repairs legacy shifted rows');
has('backend/Team_Information.js',/team:cesStaffCanonicalTeam\(r\[7\]\|\|r\[4\]\)/,'Training reads canonical Team column H with fallback');
has('backend/TE_Generate.js',/costCenter:String\(hit\[cc\]\|\|''\)/,'TE profile reads the Staff_Data Cost Center instead of a constant');
has('backend/Vehical_Booking.js',/team: String\(row\[7\] \|\| row\[4\][\s\S]*costCenter: row\[9\][\s\S]*tel: row\[12\]/,'Car Booking reads canonical Staff_Data Team Cost Center and Tel columns');

if(failures.length){process.stderr.write('\nFAILURES\n- '+failures.join('\n- ')+'\n');process.exit(1);}
process.stdout.write('\nALL STATIC QA CHECKS PASSED\n');
