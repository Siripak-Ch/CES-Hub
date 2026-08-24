// CES Hub V4 lightweight TH/EN UI switch. No external translation service.
(function(){
  'use strict';
  var KEY='CES_HUB_LANGUAGE_V20';
  var lang=(localStorage.getItem(KEY)||'EN').toUpperCase()==='TH'?'TH':'EN';
  var nav={
    portal:['หน้าแรก','Home'],management_overview:['ภาพรวมผู้บริหาร','Management Overview'],yearly:['แดชบอร์ดงาน','Job Dashboard'],revenue:['แดชบอร์ดรายได้','Revenue Dashboard'],ot:['แดชบอร์ด OT','OT Dashboard'],service:['แบบประเมินการใช้บริการ','Service CSI'],report:['แบบประเมินรายงานผล','Report CSI'],memo_workorder:['Memo และ Work Order','Memo & Work Order'],calendar:['ปฏิทิน','Calendar'],checkin:['เช็กอิน','Check-in'],car_booking:['จองรถยนต์','Car Booking'],van_booking:['จองรถตู้','Van Booking'],weekly:['รายงานประจำสัปดาห์','Weekly Report'],kpi:['ติดตาม KPI','KPI Tracking'],report_manage:['จัดการรายงาน','Report Management'],stock_dashboard:['แดชบอร์ด Infusion Pump','Infusion Pump Dashboard'],inventory:['คลังอุปกรณ์','Inventory'],check_stock:['ตรวจสอบสต็อก','Check Stock'],team_information:['ข้อมูลทีม','Team Information'],team_plan:['แผนทีม','Team Plan'],monthly_report:['รายงานประจำเดือน','Monthly Report'],users:['จัดการผู้ใช้','User Management'],ces_evaluation:['แบบประเมิน CES Hub','CES Hub Evaluation'],ces_ai_knowledge:['ฐานความรู้ CES AI','CES AI Knowledge'],health:['สุขภาพระบบ','System Health'],setting:['ตั้งค่า','Setting']
  };
  var scopedTextMap={
    'Service CSI':['แบบประเมินการใช้บริการ','Service CSI'],
    'Customer Satisfaction & Maintenance':['ความพึงพอใจลูกค้าและงานบริการ','Customer Satisfaction & Maintenance'],
    'Memo Mapping':['จับคู่ Memo','Memo Mapping'],
    'All Customers':['ลูกค้าทั้งหมด','All Customers'],'Commercial':['Commercial','Commercial'],'Network':['Network','Network'],
    'All Status':['ทุกสถานะ','All Status'],'Finished':['เสร็จสิ้น','Finished'],'Not Finish':['ยังไม่เสร็จ','Not Finish'],
    'Total Response':['จำนวนแบบประเมิน','Total Response'],'Avg Score':['คะแนนเฉลี่ย','Avg Score'],'Target 4.7':['เป้าหมาย 4.7','Target 4.7'],
    'Satisfaction':['ความพึงพอใจ','Satisfaction'],'Achieved Target':['บรรลุเป้าหมาย','Achieved Target'],
    'Monthly Trend (Response)':['แนวโน้มรายเดือน (แบบประเมิน)','Monthly Trend (Response)'],'Service Share (%)':['สัดส่วนบริการ (%)','Service Share (%)'],
    'Customer List':['รายชื่อลูกค้า','Customer List'],'Score Analysis & Growth':['วิเคราะห์คะแนนและการเติบโต','Score Analysis & Growth'],
    'Report CSI':['แบบประเมินรายงานผล','Report CSI'],'Report Customer Satisfaction Dashboard':['แดชบอร์ดความพึงพอใจต่อรายงานผล','Report Customer Satisfaction Dashboard'],
    'Incident':['ข้อร้องเรียน','Incident'],'Resolved':['แก้ไขแล้ว','Resolved'],'Incident Tracker':['ติดตามข้อร้องเรียน','Incident Tracker'],
    'Customer Feedback':['ความคิดเห็นลูกค้า','Customer Feedback'],'Action Required':['รายการที่ต้องดำเนินการ','Action Required'],
    'Root Cause (สาเหตุ)':['สาเหตุหลัก','Root Cause'],'Solution (การแก้ไข)':['แนวทางแก้ไข','Solution'],
    'Save & Close':['บันทึกและปิด','Save & Close'],'Cancel':['ยกเลิก','Cancel'],'Close':['ปิด','Close'],
    'Date':['วันที่','Date'],'Customer':['ลูกค้า','Customer'],'Team':['ทีม','Team'],'Issue / Comment':['ปัญหา / ความคิดเห็น','Issue / Comment'],'Status':['สถานะ','Status'],'Action':['ดำเนินการ','Action'],
    'All':['ทั้งหมด','All'],'Items':['รายการ','Items'],'Records':['รายการ','Records']
  };
  var scopedPlaceholderMap={
    'Search Customer...':['ค้นหาลูกค้า...','Search Customer...'],
    'ค้นหาชื่อลูกค้า/ปัญหา...':['ค้นหาชื่อลูกค้า/ปัญหา...','Search customer / issue...']
  };
  function translateScopedText(root){
    if(!root)return;
    var walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);var node;
    while((node=walker.nextNode())){
      var raw=String(node.nodeValue||''),trim=raw.trim();if(!trim)continue;
      if(!node.__cesEnglishText&&scopedTextMap[trim])node.__cesEnglishText=trim;
      var key=node.__cesEnglishText;if(!key||!scopedTextMap[key])continue;
      var leading=(raw.match(/^\s*/)||[''])[0],trailing=(raw.match(/\s*$/)||[''])[0];node.nodeValue=leading+(lang==='TH'?scopedTextMap[key][0]:scopedTextMap[key][1])+trailing;
    }
    root.querySelectorAll('input[placeholder],textarea[placeholder]').forEach(function(n){var p=n.getAttribute('placeholder')||'';if(!n.dataset.cesEnglishPlaceholder&&scopedPlaceholderMap[p])n.dataset.cesEnglishPlaceholder=p;var key=n.dataset.cesEnglishPlaceholder;if(key&&scopedPlaceholderMap[key])n.placeholder=lang==='TH'?scopedPlaceholderMap[key][0]:scopedPlaceholderMap[key][1];});
  }
  function txt(selector,th,en){var n=document.querySelector(selector);if(n)n.textContent=lang==='TH'?th:en;}
  function apply(){
    document.documentElement.lang=lang==='TH'?'th':'en';
    document.querySelectorAll('[data-i18n-th][data-i18n-en]').forEach(function(node){
      var value=lang==='TH'?node.getAttribute('data-i18n-th'):node.getAttribute('data-i18n-en');
      // Never replace textContent on a container because doing so removes all
      // nested cards, inputs and buttons. Translate leaf nodes only. A future
      // container can opt in by pointing to a child selector through
      // data-i18n-target.
      var targetSelector=node.getAttribute('data-i18n-target');
      if(targetSelector){
        var target=node.querySelector(targetSelector);
        if(target)target.textContent=value;
        return;
      }
      if(node.childElementCount===0)node.textContent=value;
    });
    document.querySelectorAll('[data-placeholder-th][data-placeholder-en]').forEach(function(node){node.placeholder=lang==='TH'?node.getAttribute('data-placeholder-th'):node.getAttribute('data-placeholder-en');});
    Object.keys(nav).forEach(function(id){txt('#btn-'+id+' span',nav[id][0],nav[id][1]);});
    var tab=String(window.currentTab||document.body.getAttribute('data-ces-active-tab')||'portal');
    if(nav[tab])txt('#header-page-title',nav[tab][0],nav[tab][1]);
    txt('#ces-language-current-v4',lang==='TH'?'TH':'EN',lang==='TH'?'TH':'EN');
    var b=document.getElementById('ces-language-toggle-v4');if(b){b.setAttribute('title',lang==='TH'?'เปลี่ยนเป็น English':'Switch to Thai');b.classList.toggle('is-th',lang==='TH');b.classList.toggle('is-en',lang!=='TH');b.setAttribute('aria-pressed',lang==='TH'?'true':'false');}
    txt('#view-car_booking h2','จองรถยนต์','Car Booking');
    txt('#view-car_booking .vehicle-summary-filter-bar>div:nth-child(1) label','ปีสรุป','Summary Year');
    txt('#view-car_booking .vehicle-summary-filter-bar>div:nth-child(2) label','เดือนสรุป','Summary Month');
    txt('#view-car_booking .vehicle-summary-filter-bar>div:nth-child(3) label','ทีมสรุป','Summary Team');
    txt('#view-car_booking .ces-car-mini-grid-v186 .ces-vehicle-kpi-card:nth-child(1)>div','ระยะทางรวม','Total KM');
    txt('#view-car_booking .ces-car-mini-grid-v186 .ces-vehicle-kpi-card:nth-child(2)>div','จำนวนวันใช้งาน','Days of Use');
    txt('#view-car_booking .ces-car-mini-grid-v186 .ces-vehicle-kpi-card:nth-child(3)>div','จำนวนงาน','Total Jobs');
    txt('#view-car_booking .ces-car-mini-grid-v186 .ces-vehicle-kpi-card:nth-child(4)>div','ค่าไฟฟ้า','Electric Bill');
    txt('#view-car_booking .ces-car-mini-grid-v186 .ces-vehicle-kpi-card:nth-child(5)>div','ค่าใช้รถปกติ','Regular Car Fee');
    txt('#view-car_booking .ces-car-mini-grid-v186 .ces-vehicle-kpi-card:nth-child(6)>div','ประหยัดค่าใช้จ่ายรวม','Total Fee Saved');
    txt('#view-car_booking .ces-car-utilization-title-v186 span','อัตราการใช้วันทำงาน','Day Utilization');
    txt('#ces-ai-local-launcher span','AI CES','AI CES');
    txt('.ces-ai-local-header-copy strong','AI CES','AI CES');
    var input=document.getElementById('ces-ai-local-input');if(input)input.placeholder=lang==='TH'?'พิมพ์คำถามเกี่ยวกับ CES Hub...':'Ask about CES Hub...';
    var suggestion=document.getElementById('ces-ai-eval-suggestion');if(suggestion)suggestion.placeholder='แนะนำการพัฒนาเพิ่มเติม (ไม่บังคับ)';
    translateScopedText(document.getElementById('view-service'));translateScopedText(document.getElementById('view-report'));
    var evalSubmit=document.getElementById('ces-ai-eval-submit');if(evalSubmit&&!evalSubmit.disabled)evalSubmit.innerHTML='<i class="fas fa-paper-plane"></i> ส่งแบบประเมิน';
    window.dispatchEvent(new CustomEvent('ces:language-applied',{detail:{language:lang}}));document.dispatchEvent(new CustomEvent('ces:language-applied',{detail:{language:lang}}));
    // Home contains dynamic bilingual cards. Re-prime them after applying the
    // language so an initial page load and a language switch behave the same.
    if(document.getElementById('portal-app-grid')&&typeof window.CES_HOME_PRIME_V204==='function'){
      setTimeout(function(){try{window.CES_HOME_PRIME_V204();}catch(ignore){}},0);
    }
  }
  function toggle(){lang=lang==='TH'?'EN':'TH';localStorage.setItem(KEY,lang);apply();document.dispatchEvent(new CustomEvent('ces:language-changed',{detail:{language:lang}}));}
  window.CES_LANGUAGE={get:function(){return lang;},set:function(v){lang=String(v||'').toUpperCase()==='TH'?'TH':'EN';localStorage.setItem(KEY,lang);apply();},apply:apply,toggle:toggle};
  window.toggleCesLanguageV4=toggle;
  window.addEventListener('ces:app-ready',function(){setTimeout(apply,0);});
  document.addEventListener('DOMContentLoaded',function(){setTimeout(apply,0);});
  window.addEventListener('ces:tab-changed',function(e){var t=e&&e.detail&&e.detail.tab;if(t==='service'||t==='report')setTimeout(apply,30);});
})();
