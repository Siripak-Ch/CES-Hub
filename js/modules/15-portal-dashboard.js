// CES Hub V19 — Employee Portal dashboard (cache-first)
(function(){
'use strict';
var state={loaded:false,loadedAt:0,loadingPromise:null,linkLoadingPromise:null,priorityPromise:null,data:null,clock:null,bar:null,pie:null,filterReady:false,usageAt:0,portalLinks:null,firstReady:false,overlayStartedAt:0};
var PORTAL_CACHE_KEY_V19='CES_PORTAL_CACHE_V206_';
var PORTAL_LINKS_CACHE_KEY_V203='CES_HOME_LINKS_CACHE_V3012';
var PORTAL_LINKS_FALLBACK_V203={success:true,source:'FRONTEND_FALLBACK',
applications:[
{id:'PL-N-SMART',section:'APPLICATION',titleTh:'N Smart Plus',titleEn:'N Smart Plus',descriptionTh:'ระบบบริหารทรัพย์สินและงานซ่อมบำรุงโรงพยาบาล',descriptionEn:'Hospital asset and repair management',url:'https://nsmartplus.nhealth-asia.com/login?redirect=',icon:'fa-wand-magic-sparkles',theme:'blue',featured:false,sortOrder:1},
{id:'PL-N-CERT',section:'APPLICATION',titleTh:'N Certificate',titleEn:'N Certificate',descriptionTh:'ระบบรับรองและบริการสอบเทียบ',descriptionEn:'Certification and calibration services',url:'https://necert.nhealth-asia.com/',icon:'fa-certificate',theme:'amber',sortOrder:20},
{id:'PL-IHB',section:'APPLICATION',titleTh:'IHB Web Portal',titleEn:'IHB Web Portal',descriptionTh:'ระบบสมัครงานของ N Health',descriptionEn:'N Health application portal',url:'https://ihb.nhealth-asia.com/',icon:'fa-id-card',theme:'indigo',sortOrder:30},
{id:'PL-E-MEMO',section:'APPLICATION',titleTh:'E-MEMO',titleEn:'E-MEMO',descriptionTh:'Microsoft E-MEMO',descriptionEn:'Microsoft E-MEMO',url:'https://apps.powerapps.com/play/e/fc9e2324-4803-e46b-bd37-c4595ba72885/a/4228a65b-7716-48fd-a633-61d0c9040025?appid=%2Fproviders%2FMicrosoft.PowerApps%2Fapps%2F4228a65b-7716-48fd-a633-61d0c9040025&tenantId=325c40be-6d2b-4006-b2c5-078947c856d2',icon:'fa-link',theme:'blue',sortOrder:35},
{id:'PL-STEP',section:'APPLICATION',titleTh:'Step Forward',titleEn:'Step Forward',descriptionTh:'ระบบบุคลากรและบริการ HR',descriptionEn:'People and HR services',url:'https://stepforward.nhealth-asia.com/',icon:'fa-heart-circle-check',theme:'pink',sortOrder:40},
{id:'PL-CALPM',section:'APPLICATION',titleTh:'CAL/PM Reminder',titleEn:'CAL/PM Reminder',descriptionTh:'Calibration and PM reminder list',descriptionEn:'Calibration and PM reminder list',url:'https://bdmsgroup.sharepoint.com/sites/PM-CalReminder/Lists/PMCal%20Reminder/AllItems.aspx?id=%2Fsites%2FPM%2DCalReminder%2FLists%2FPMCal%20Reminder%2FCentral%201&viewid=094c06a0%2D09c6%2D4e3c%2D8537%2D091bf90e5977&newTargetListUrl=%2Fsites%2FPM%2DCalReminder%2FLists%2FPMCal%20Reminder&viewpath=%2Fsites%2FPM%2DCalReminder%2FLists%2FPMCal%20Reminder%2FAllItems%2Easpx&ovuser=325c40be%2D6d2b%2D4006%2Db2c5%2D078947c856d2%2CSiripak%2ECh%40BDMS%2ECO%2ETH&TeamsCID=20955382%2Daa40%2D4b25%2D899f%2D3638337417b6&OR=Teams%2DHL&CT=1787643535138&clickparams=eyJBcHBOYW1lIjoiVGVhbXMtRGVza3RvcCIsIkFwcFZlcnNpb24iOiI0OS8yNjA3MTYxNjAxNCIsIkhhc0ZlZGVyYXRlZFVzZXIiOmZhbHNlfQ%3D%3D',icon:'fa-calendar-check',theme:'blue',featured:true,sortOrder:45},
{id:'PL-FORMBRICKS',section:'APPLICATION',titleTh:'Formbricks',titleEn:'Formbricks',descriptionTh:'ระบบแบบสำรวจและสรุปผล',descriptionEn:'Survey environment and result summary',url:'https://survey.nhealth-asia.com/',icon:'fa-chart-simple',theme:'cyan',sortOrder:50},
{id:'PL-EBOOK',section:'APPLICATION',titleTh:'E-Book',titleEn:'E-Book',descriptionTh:'คลังเรียนรู้และเอกสารอ้างอิง',descriptionEn:'Learning and reference library',url:'https://anyflip.com/bookcase/spgdj/',icon:'fa-book-open',theme:'green',sortOrder:60},
{id:'PL-CES-CSI',section:'APPLICATION',titleTh:'CES CSI',titleEn:'CES CSI',descriptionTh:'แบบประเมินความพึงพอใจลูกค้า',descriptionEn:'Customer satisfaction survey',url:'https://survey.nhealth-asia.com/s/cm1hci0mw00jf45vmps2myg1g',icon:'fa-face-smile',theme:'teal',sortOrder:70}],
nhealthServices:[
{id:'PL-NHEALTH-VPN',section:'NHEALTH_SERVICE',titleTh:'N Health VPN Portal',titleEn:'N Health VPN Portal',descriptionTh:'หน้าแรกระบบภายใน N Health ผ่าน VPN',descriptionEn:'N Health internal VPN portal',url:'http://10.101.20.47/',icon:'fa-shield-halved',theme:'blue',featured:true,sortOrder:1},
{id:'PL-ROOM-RESERVATION',section:'NHEALTH_SERVICE',titleTh:'Room Reservation (VPN)',titleEn:'Room Reservation (VPN)',descriptionTh:'ระบบจองห้องประชุมภายใน ต้องเชื่อมต่อ VPN',descriptionEn:'Internal room reservation — VPN required',url:'http://10.101.20.47/HSC-Req/login.php',icon:'fa-calendar-check',theme:'indigo',sortOrder:3},
{id:'PL-INTRANET',section:'NHEALTH_SERVICE',titleTh:'Intranet (VPN)',titleEn:'Intranet (VPN)',descriptionTh:'พอร์ทัลเครือข่ายภายใน N Health ต้องเชื่อมต่อ VPN',descriptionEn:'N Health intranet — VPN required',url:'http://10.101.20.47/Home/index.php',icon:'fa-network-wired',theme:'sky',sortOrder:4},
{id:'PL-IT',section:'NHEALTH_SERVICE',titleTh:'IT Support',titleEn:'IT Support',descriptionTh:'ศูนย์บริการและสนับสนุนด้านเทคนิค ต้องเชื่อมต่อ VPN',descriptionEn:'Service desk and technical support — VPN required',url:'https://nhitsm.nhealth-asia.com/support/home',icon:'fa-headset',theme:'violet',sortOrder:5},
{id:'PL-WORKFORCE',section:'NHEALTH_SERVICE',titleTh:'Workforce SAP',titleEn:'Workforce SAP',descriptionTh:'ระบบบริหาร Workforce',descriptionEn:'Workforce management system',url:'https://app-au3.wfs.cloud/#/login',icon:'fa-people-group',theme:'orange',sortOrder:6}],
innovations:[
{id:'PL-INNOV-1',section:'INNOVATION',titleTh:'SmartSense',titleEn:'SmartSense',descriptionTh:'ระบบติดตามและจัดการสภาพแวดล้อมอัจฉริยะ',descriptionEn:'Monitoring and smart environment solution',url:'https://www.smartsensemonitorseries.online/login',icon:'fa-lightbulb',theme:'teal',featured:true,sortOrder:10},
{id:'PL-INNOV-2',section:'INNOVATION',titleTh:'Promedguide',titleEn:'Promedguide',descriptionTh:'เครื่องมือและคู่มือดิจิทัลของทีม',descriptionEn:'Team-owned digital guide and solution',url:'#',icon:'fa-book-medical',theme:'slate',sortOrder:20}]};
function esc(v){return String(v==null?'':v).replace(/[&<>'"]/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'})[c];});}
function api(name,args,opt){if(!window.CES_API||typeof window.CES_API.callFunction!=='function')return Promise.reject(new Error('CES API bridge is unavailable.'));return window.CES_API.callFunction(name,Array.isArray(args)?args:[],Object.assign({transport:'jsonp',timeoutMs:45000},opt||{}));}
async function apiFirst(names,args,opt){var last=null;for(var i=0;i<names.length;i++){try{var r=await api(names[i],args,opt);if(r&&r.success!==false)return r;last=new Error((r&&r.message)||('API '+names[i]+' failed'));}catch(e){last=e;}}throw last||new Error('Home API is unavailable.');}
function user(){return window.CES_CURRENT_USER||window.currentUser||{};}
function admin(){return String(user().role||'').toUpperCase()==='ADMIN';}
function userDisplayNameV206_(){var u=user();return String(u.name_eng||u.nameEng||u.Name_ENG||u.name_th||u.nameTh||u.Name_TH||u.name||u.displayName||u.id||'CES Team').trim()||'CES Team';}
function primeHomeIdentityV206_(){setText('portal-user-name',userDisplayNameV206_());clock();return true;}
function setText(id,v){var e=document.getElementById(id);if(e)e.textContent=v==null?'':v;}
function color(t){if(typeof window.cesGetTeamColor==='function')return window.cesGetTeamColor(t);return({MED:'#004AAD',LAB:'#19A7CE',EHS:'#0FC1A1',ENV:'#7ED957',TES:'#F4C542',QM:'#F97316',MNG:'#64748B'})[String(t||'').toUpperCase()]||'#64748B';}
function clock(){if(state.clock)clearInterval(state.clock);function tick(){var n=new Date(),h=n.getHours();setText('portal-daypart-v186',h<12?'morning':h<18?'afternoon':'evening');try{setText('portal-local-time',new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(n));setText('portal-local-date',new Intl.DateTimeFormat((window.CES_LANGUAGE&&window.CES_LANGUAGE.get&&window.CES_LANGUAGE.get()==='TH')?'th-TH':'en-GB',{timeZone:'Asia/Bangkok',weekday:'short',day:'2-digit',month:'short'}).format(n));}catch(e){setText('portal-local-time',n.toLocaleTimeString());setText('portal-local-date',n.toLocaleDateString());}}tick();state.clock=setInterval(tick,1000);}
function meta(tab){var m={management_overview:['Management Overview','fa-chart-line'],yearly:['Job Dashboard','fa-chart-pie'],revenue:['Revenue Dashboard','fa-hand-holding-dollar'],ot:['OT Dashboard','fa-clock'],service:['Service CSI','fa-clipboard-check'],report:['Report CSI','fa-chart-bar'],calendar:['Calendar','fa-calendar-days'],checkin:['Check-in','fa-location-dot'],car_booking:['Car Booking','fa-car-side'],van_booking:['Van Booking','fa-van-shuttle'],weekly:['Weekly Report','fa-calendar-check'],kpi:['KPI Tracking','fa-chart-line'],report_manage:['OT Generate','fa-file-invoice-dollar'],stock_dashboard:['Infusion Pump Dashboard','fa-chart-pie'],inventory:['Inventory','fa-boxes-stacked'],check_stock:['Check Stock','fa-qrcode'],team_information:['Team Information','fa-address-book'],team_plan:['Team Plan','fa-calendar-days'],master_cal_pm_plan:['Master CAL/PM Plan','fa-screwdriver-wrench'],monthly_report:['Monthly Report','fa-file-circle-check'],users:['User Management','fa-users-gear'],ces_evaluation:['CES Hub Evaluation','fa-star-half-stroke'],ces_ai_knowledge:['CES AI Knowledge','fa-robot'],health:['System Health','fa-heart-pulse'],setting:['Setting','fa-gears']};return m[tab]||[String(tab||'Module').replace(/_/g,' '),'fa-cube'];}
function initials(n){return String(n||'?').split(/\s+/).filter(Boolean).slice(0,2).map(function(x){return x.charAt(0);}).join('').toUpperCase();}
function renderRecent(rows){var r=document.getElementById('portal-recent-modules');if(!r)return;rows=Array.isArray(rows)?rows:[];if(!rows.length){r.innerHTML='<div class="ces-portal-side-empty">No function visit has been recorded yet.</div>';return;}r.innerHTML=rows.slice(0,6).map(function(x){var tab=String(x.module||x.tab||'').toLowerCase(),m=meta(tab);return '<button type="button" onclick="switchTab(\''+esc(tab)+'\')"><i class="fas '+esc(m[1])+'"></i><span>'+esc(m[0])+'</span><small>'+esc(x.count?x.count+' visits':'')+'</small><i class="fas fa-chevron-right"></i></button>';}).join('');}
function renderUsers(rows){var r=document.getElementById('portal-top-users');if(!r)return;rows=Array.isArray(rows)?rows:[];r.innerHTML=rows.length?rows.slice(0,10).map(function(x,i){return '<div class="ces-portal-user-row"><span class="rank">'+String(i+1).padStart(2,'0')+'</span><span class="avatar" style="--avatar-color:'+color(x.team)+'">'+esc(initials(x.name))+'</span><div><b>'+esc(x.name||x.id)+'</b><p>'+esc(x.team||'MNG')+' · '+Number(x.count||0)+' visits</p></div></div>';}).join(''):'<div class="ces-portal-side-empty">No recent login activity.</div>';}
function eventCard(x){var liked=Array.isArray(x.likedBy)&&x.likedBy.map(String).indexOf(String(user().id||''))>=0;var image=x.imageUrl?'<img class="ces-portal-post-image-v186" src="'+esc(x.imageUrl)+'" alt="'+esc(x.title)+'" loading="lazy" onclick="openPortalEventDetail(\''+esc(x.id)+'\')" style="cursor:pointer">':'';var link=x.link?'<a class="ces-portal-post-link-v186" href="'+esc(x.link)+'" target="_blank" rel="noopener" onclick="portalViewEvent(\''+esc(x.id)+'\')">Open link <i class="fas fa-arrow-up-right-from-square"></i></a>':'';var actions=admin()?'<div class="ces-portal-event-actions"><button onclick="openPortalEventEditor(\''+esc(x.id)+'\')"><i class="fas fa-pen"></i></button><button class="danger" onclick="deletePortalEventFront(\''+esc(x.id)+'\')"><i class="fas fa-trash"></i></button></div>':'';return '<article class="ces-portal-post-v186">'+image+'<div class="ces-portal-post-body-v186"><div class="ces-portal-post-head-v186"><div><h4 onclick="openPortalEventDetail(\''+esc(x.id)+'\')" style="cursor:pointer">'+esc(x.title)+'</h4><span>'+esc(x.createdBy||'CES Team')+' · '+esc(x.createdAtDisplay||x.createdAt||'')+'</span></div>'+actions+'</div><p>'+esc(x.description||'')+'</p><button class="ces-portal-post-link-v186" type="button" onclick="openPortalEventDetail(\''+esc(x.id)+'\')">Read details <i class="fas fa-chevron-right"></i></button>'+link+'<div class="ces-portal-post-stats-v186"><button onclick="portalViewEvent(\''+esc(x.id)+'\')"><i class="fas fa-eye"></i><span id="portal-event-views-'+esc(x.id)+'">'+Number(x.views||0)+'</span></button><button class="'+(liked?'liked':'')+'" onclick="portalLikeEvent(\''+esc(x.id)+'\')"><i class="'+(liked?'fas':'far')+' fa-heart"></i><span id="portal-event-likes-'+esc(x.id)+'">'+Number(x.likes||0)+'</span></button></div></div></article>';}
function openPortalEventDetail(id){var x=byId(id);if(!x||!x.id)return;portalViewEvent(id);var image=x.imageUrl?'<img src="'+esc(x.imageUrl)+'" style="max-width:100%;max-height:360px;border-radius:14px;margin-bottom:14px">':'';var link=x.link?'<a href="'+esc(x.link)+'" target="_blank" rel="noopener" class="ces-portal-post-link-v186" style="display:inline-flex;margin-top:12px">Open related link <i class="fas fa-arrow-up-right-from-square"></i></a>':'';Swal.fire({title:esc(x.title),width:780,html:'<div style="text-align:left">'+image+'<div style="color:#64748b;font-size:12px;margin-bottom:10px">'+esc(x.createdBy||'CES Team')+' · '+esc(x.createdAtDisplay||x.createdAt||'')+'</div><div style="white-space:pre-wrap;color:#334155;line-height:1.7">'+esc(x.description||'-')+'</div>'+link+'</div>',confirmButtonText:'Close'});}
function renderEvents(rows){var r=document.getElementById('portal-event-grid');if(!r)return;rows=Array.isArray(rows)?rows:[];r.innerHTML=rows.length?rows.map(eventCard).join(''):'<div class="ces-portal-empty-card"><i class="fas fa-images"></i><b>No portal post</b><span>Admin can publish a post with image, description and link.</span></div>';}
function charts(rows){rows=(Array.isArray(rows)?rows:[]).filter(function(x){return ['MED','LAB','EHS','TES'].indexOf(String(x&&x.team||'').toUpperCase())>=0;});var labs=rows.map(function(x){return x.team;}),vals=rows.map(function(x){return Number(x.serviceResponses||0)+Number(x.reportResponses||0);}),cols=labs.map(color);if(state.bar)state.bar.destroy();if(state.pie)state.pie.destroy();var b=document.getElementById('portal-csi-bar'),p=document.getElementById('portal-csi-pie');if(!window.Chart||!b||!p)return;state.bar=new Chart(b.getContext('2d'),{type:'bar',data:{labels:labs,datasets:[{data:vals,backgroundColor:cols,borderRadius:7,maxBarThickness:42}]},options:{responsive:true,maintainAspectRatio:false,animation:{duration:180},plugins:{legend:{display:false},datalabels:{display:function(c){return Number(c.dataset.data[c.dataIndex]||0)>0;},anchor:'end',align:'top',color:'#334155',font:{weight:'bold',size:10},formatter:function(v){return Number(v||0).toLocaleString();}}},scales:{y:{beginAtZero:true,grace:'15%',grid:{color:'#e7eef7'}},x:{grid:{display:false}}}},plugins:window.ChartDataLabels?[ChartDataLabels]:[]});state.pie=new Chart(p.getContext('2d'),{type:'doughnut',data:{labels:labs,datasets:[{data:vals,backgroundColor:cols,borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,cutout:'68%',animation:{duration:180},plugins:{legend:{position:'right',labels:{boxWidth:10,usePointStyle:true,font:{size:10}}},datalabels:{display:function(c){return Number(c.dataset.data[c.dataIndex]||0)>0;},color:'#fff',font:{weight:'bold',size:10},formatter:function(v,c){var total=c.dataset.data.reduce(function(a,b){return a+Number(b||0);},0);var pct=total?Math.round(Number(v||0)*100/total):0;return Number(v||0)+' ('+pct+'%)';}}}},plugins:window.ChartDataLabels?[ChartDataLabels]:[]});}


function mergeCanonicalPortalV214_(incoming,defaults){
  incoming=Array.isArray(incoming)?incoming.filter(Boolean):[];defaults=Array.isArray(defaults)?defaults:[];
  var byId={};incoming.forEach(function(x){var id=String(x&&x.id||'').trim();if(id)byId[id]=x;});
  defaults.forEach(function(def){var id=String(def&&def.id||'').trim();if(!id)return;var current=byId[id]||{};byId[id]=Object.assign({},def,current,{id:id,status:'ACTIVE'});});
  var out=[];defaults.forEach(function(def){if(byId[def.id]){out.push(byId[def.id]);delete byId[def.id];}});
  Object.keys(byId).forEach(function(id){var x=byId[id];if(String(x.status||'ACTIVE').toUpperCase()==='ACTIVE')out.push(x);});
  return out;
}
function normalizePortalLinksV205_(data){
  data=data||{};
  if(data.portalLinks&&typeof data.portalLinks==='object')data=data.portalLinks;
  var rows=Array.isArray(data.data)?data.data:[];
  var apps=Array.isArray(data.applications)?data.applications:rows.filter(function(x){return String(x&&x.section||'').toUpperCase()==='APPLICATION'&&String(x&&x.status||'ACTIVE').toUpperCase()==='ACTIVE';});
  var services=Array.isArray(data.nhealthServices)?data.nhealthServices:rows.filter(function(x){return String(x&&x.section||'').toUpperCase()==='NHEALTH_SERVICE'&&String(x&&x.status||'ACTIVE').toUpperCase()==='ACTIVE';});
  var innovations=Array.isArray(data.innovations)?data.innovations:rows.filter(function(x){return String(x&&x.section||'').toUpperCase()==='INNOVATION'&&String(x&&x.status||'ACTIVE').toUpperCase()==='ACTIVE';});
  apps=mergeCanonicalPortalV214_(apps,PORTAL_LINKS_FALLBACK_V203.applications);
  services=mergeCanonicalPortalV214_(services,PORTAL_LINKS_FALLBACK_V203.nhealthServices);
  innovations=mergeCanonicalPortalV214_(innovations,PORTAL_LINKS_FALLBACK_V203.innovations);
  return {success:data.success!==false,source:data.source||'',applications:apps,nhealthServices:services,innovations:innovations,generatedAt:data.generatedAt||''};
}
function ensurePortalFallbackV205_(){
  var apps=document.getElementById('portal-app-grid'),services=document.getElementById('portal-services-grid'),innovations=document.getElementById('portal-innovation-grid');
  if(!apps||!services||!innovations)return false;
  var hasApps=!!apps.querySelector('.ces-portal-app-card');var hasServices=!!services.querySelector('.ces-portal-app-card');
  var hasInnovations=!!innovations.querySelector('.ces-portal-innovation');
  if(!hasApps||!hasServices||!hasInnovations){
    var cached=readPortalLinksCacheV203_();
    var usable=cached&&((cached.applications||[]).length||(cached.innovations||[]).length)?cached:PORTAL_LINKS_FALLBACK_V203;
    state.portalLinks=normalizePortalLinksV205_(usable);
    renderPortalLinksV20(state.portalLinks);
  }
  apps.dataset.portalFallback='true';services.dataset.portalFallback='true';innovations.dataset.portalFallback='true';
  return true;
}
function homeOverlayV205_(show,message){
  var box=document.getElementById('ces-home-priority-overlay');if(!box)return;
  var msg=document.getElementById('ces-home-priority-message');if(msg&&message)msg.textContent=message;
  if(show){state.overlayStartedAt=Date.now();box.classList.remove('hidden');box.setAttribute('aria-busy','true');}
  else{var wait=Math.max(0,260-(Date.now()-Number(state.overlayStartedAt||0)));setTimeout(function(){box.classList.add('hidden');box.setAttribute('aria-busy','false');var root=document.getElementById('view-portal');if(root)root.classList.add('ces-home-ready-v205');},wait);}
}
function dispatchHomeReadyV205_(detail){try{window.dispatchEvent(new CustomEvent('ces:home-ready',{detail:detail||{}}));}catch(ignore){}}
function portalLanguageV20(){try{return window.CES_LANGUAGE&&window.CES_LANGUAGE.get?window.CES_LANGUAGE.get():'EN';}catch(e){return'EN';}}
function renderPortalLinksV20(data){
  data=normalizePortalLinksV205_(data);
  var apps=document.getElementById('portal-app-grid'),services=document.getElementById('portal-services-grid'),innovations=document.getElementById('portal-innovation-grid');
  var lang=(window.CES_LANGUAGE&&window.CES_LANGUAGE.get&&window.CES_LANGUAGE.get())||'EN';
  var canonical=['PL-N-SMART','PL-N-CERT','PL-CALPM','PL-IHB','PL-E-MEMO','PL-STEP','PL-FORMBRICKS','PL-EBOOK','PL-CES-CSI'];
  var rank={};canonical.forEach(function(id,index){rank[id]=index;});
  function title(x){return lang==='TH'?(x.titleTh||x.titleEn):(x.titleEn||x.titleTh);}function desc(x){return lang==='TH'?(x.descriptionTh||x.descriptionEn):(x.descriptionEn||x.descriptionTh);}
  function portalIdentity_(x){var t=String(x&&((x.titleEn||x.titleTh)||'')).trim().toLowerCase().replace(/[^a-z0-9ก-๙]+/g,' ');var u=String(x&&x.url||'').trim().toLowerCase().replace(/[?#].*$/,'');return t+'|'+u;}
  function sortApps(rows){
    var seen={},unique=[];
    rows.forEach(function(x){var key=portalIdentity_(x);if(!key||seen[key])return;seen[key]=1;unique.push(x);});
    var canonicalRows=[];canonical.forEach(function(id){var found=unique.find(function(x){return String(x&&x.id||'')===id;});if(found){canonicalRows.push(found);unique=unique.filter(function(x){return x!==found;});}});
    unique.sort(function(a,b){return Number(a.sortOrder||999)-Number(b.sortOrder||999)||String(a.titleEn||a.titleTh||'').localeCompare(String(b.titleEn||b.titleTh||''));});
    return canonicalRows.concat(unique);
  }
  if(apps){var rows=sortApps((data.applications.length?data.applications:PORTAL_LINKS_FALLBACK_V203.applications).slice());apps.innerHTML=rows.map(function(x){var isVpn=/\(VPN\)/i.test(String(x.titleEn||x.titleTh||''));var forceWhite=String(x.id||'').toUpperCase()==='PL-CALPM';var featured=!!x.featured&&!forceWhite;return '<a class="ces-portal-app-card '+(featured?'featured ':'')+(forceWhite?'ces-portal-app-card-white ':'')+(isVpn?'vpn-card':'')+'" href="'+esc(x.url||'#')+'" target="_blank" rel="noopener"><div class="ces-portal-app-icon '+esc(x.theme||'blue')+'"><i class="fas '+esc(x.icon||'fa-link')+'"></i></div><div><h4>'+esc(title(x))+(isVpn?'<span class="ces-portal-vpn-badge">VPN</span>':'')+'</h4><p>'+esc(desc(x))+'</p></div><i class="fas fa-arrow-up-right-from-square open"></i></a>';}).join('');apps.dataset.portalFallback=String(!data.applications.length);}
  if(services){var serviceRows=(data.nhealthServices.length?data.nhealthServices:PORTAL_LINKS_FALLBACK_V203.nhealthServices).slice().sort(function(a,b){return Number(a.sortOrder||999)-Number(b.sortOrder||999);});services.innerHTML=serviceRows.map(function(x){var isVpn=/VPN|IT Support|Intranet/i.test(String(x.titleEn||x.titleTh||''));return '<a class="ces-portal-app-card '+(x.featured?'featured ':'')+(isVpn?'vpn-card':'')+'" href="'+esc(x.url||'#')+'" target="_blank" rel="noopener"><div class="ces-portal-app-icon '+esc(x.theme||'blue')+'"><i class="fas '+esc(x.icon||'fa-link')+'"></i></div><div><h4>'+esc(title(x))+(isVpn?'<span class="ces-portal-vpn-badge">VPN</span>':'')+'</h4><p>'+esc(desc(x))+'</p></div><i class="fas fa-arrow-up-right-from-square open"></i></a>';}).join('');services.dataset.portalFallback=String(!data.nhealthServices.length);}
  if(innovations){var items=(data.innovations.length?data.innovations:PORTAL_LINKS_FALLBACK_V203.innovations).slice().sort(function(a,b){return Number(a.sortOrder||999)-Number(b.sortOrder||999);});innovations.innerHTML=items.map(function(x){var theme=String(x.theme||'').toLowerCase();if(theme==='teal')theme='smart';if(theme==='slate')theme='promed';return '<a class="ces-portal-innovation '+esc(theme||'smart')+'" href="'+esc(x.url||'#')+'" target="_blank" rel="noopener"><div class="ces-portal-tool-icon"><i class="fas '+esc(x.icon||'fa-screwdriver-wrench')+'"></i></div><div class="ces-portal-tool-copy"><span>'+esc(lang==='TH'?'เครื่องมือ CES':'CES Tool')+'</span><h4>'+esc(title(x))+'</h4><p>'+esc(desc(x))+'</p></div><i class="fas fa-arrow-right"></i></a>';}).join('');innovations.dataset.portalFallback=String(!data.innovations.length);}
}
function homeCardsReadyV206_(){
  var apps=document.getElementById('portal-app-grid'),innov=document.getElementById('portal-innovation-grid');
  return !!(apps&&innov&&apps.querySelectorAll('.ces-portal-app-card').length>=1&&innov.querySelectorAll('.ces-portal-innovation').length>=1);
}
function renderHomeCriticalV206_(res){
  res=res||{};
  if(Object.prototype.hasOwnProperty.call(res,'onlineUsers'))setText('portal-online-count-v186',Math.max(user().id?1:0,Number(res.onlineUsers||0)));
  if(Array.isArray(res.events))renderEvents(res.events);
  if(Array.isArray(res.topActiveUsers))renderUsers(res.topActiveUsers);
  if(Array.isArray(res.recentModules))renderRecent(res.recentModules);
  var links=normalizePortalLinksV205_(res.portalLinks||(res.applications||res.innovations?res:{}));
  if(links.applications.length||links.innovations.length){state.portalLinks=links;renderPortalLinksV20(links);writePortalLinksCacheV203_(links);}
  else renderPortalLinksV20(state.portalLinks||PORTAL_LINKS_FALLBACK_V203);
  ensurePortalFallbackV205_();
  return homeCardsReadyV206_();
}
async function loadHomeCriticalV206_(force){
  primeHomeIdentityV206_();primePortalLinksV203_();ensurePortalFallbackV205_();
  var opt={force:!!force,userId:user().id||''};
  try{
    var res=await apiFirst(['getHomeCritical'],[opt],{timeoutMs:14000});
    if(res&&res.success!==false){renderHomeCriticalV206_(res);return res;}
  }catch(error){console.warn('[Home critical]',error);}
  try{await loadPortalLinksV20(!!force);}catch(ignore){}
  ensurePortalFallbackV205_();
  return {success:false,fallback:true,applications:(state.portalLinks&&state.portalLinks.applications)||PORTAL_LINKS_FALLBACK_V203.applications,innovations:(state.portalLinks&&state.portalLinks.innovations)||PORTAL_LINKS_FALLBACK_V203.innovations};
}
function readPortalLinksCacheV203_(){try{var x=JSON.parse(localStorage.getItem(PORTAL_LINKS_CACHE_KEY_V203)||'null');var d=x&&x.data?x.data:null;return d&&(Array.isArray(d.applications)||Array.isArray(d.innovations))?d:null;}catch(e){return null;}}
function writePortalLinksCacheV203_(data){try{localStorage.setItem(PORTAL_LINKS_CACHE_KEY_V203,JSON.stringify({at:Date.now(),data:data}));}catch(e){}}
function primePortalLinksV203_(){var cached=readPortalLinksCacheV203_();var usable=cached&&((cached.applications||[]).length||(cached.innovations||[]).length)?cached:PORTAL_LINKS_FALLBACK_V203;state.portalLinks=normalizePortalLinksV205_(usable);renderPortalLinksV20(state.portalLinks);ensurePortalFallbackV205_();return state.portalLinks;}
async function loadPortalLinksV20(force){
  if(!state.portalLinks)primePortalLinksV203_();if(state.linkLoadingPromise&&!force)return state.linkLoadingPromise;
  state.linkLoadingPromise=(async function(){try{var res=await apiFirst(['getPortalLinks'],[!!force],{timeoutMs:12000});var normalized=normalizePortalLinksV205_(res);if(normalized.success&&(normalized.applications.length||normalized.innovations.length)){state.portalLinks=normalized;renderPortalLinksV20(normalized);writePortalLinksCacheV203_(normalized);return normalized;}}catch(e){console.warn('[Home links]',e);}finally{state.linkLoadingPromise=null;}renderPortalLinksV20(state.portalLinks||PORTAL_LINKS_FALLBACK_V203);ensurePortalFallbackV205_();return state.portalLinks||normalizePortalLinksV205_(PORTAL_LINKS_FALLBACK_V203);})();return state.linkLoadingPromise;
}
function innovation(d){d=d||{};var c=document.getElementById('portal-promedguide-card'),n=document.getElementById('portal-promedguide-note');if(!c)return;if(d.promedguideUrl){c.href=d.promedguideUrl;c.target='_blank';c.rel='noopener';c.classList.remove('disabled');c.removeAttribute('aria-disabled');if(n)n.textContent='Open Promedguide team solution.';var i=c.querySelector(':scope > i');if(i)i.className='fas fa-arrow-right';}else{c.href='#';c.classList.add('disabled');c.setAttribute('aria-disabled','true');if(n)n.textContent='Set PORTAL_PROMEDGUIDE_URL in Setting.';}}
function filters(data){var y=document.getElementById('portal-csi-year-v186'),m=document.getElementById('portal-csi-month-v186');if(!y||!m)return;var now=new Date(),years=(data.availableYears||[now.getFullYear()]).map(Number).filter(Boolean).sort(function(a,b){return b-a;});var selectedYear=Number(data.selectedYear||now.getFullYear()),selectedMonth=String(data.selectedMonth||String(now.getMonth()+1).padStart(2,'0'));y.innerHTML=years.map(function(v){return '<option value="'+v+'"'+(v===selectedYear?' selected':'')+'>'+v+'</option>';}).join('');var names=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];m.innerHTML=names.map(function(n,i){var v=String(i+1).padStart(2,'0');return '<option value="'+v+'"'+(v===selectedMonth?' selected':'')+'>'+n+'</option>';}).join('');state.filterReady=true;}
function portalCacheKeyV19(){return PORTAL_CACHE_KEY_V19+String((user()&&user().id)||'anonymous');}
function readPortalCacheV19(){try{var x=JSON.parse(localStorage.getItem(portalCacheKeyV19())||'null');return x&&x.data?x:null;}catch(e){return null;}}
function writePortalCacheV19(data){try{localStorage.setItem(portalCacheKeyV19(),JSON.stringify({at:Date.now(),data:data}));}catch(e){}}
function renderPortalDataV19(res){
  if(!res)return;state.data=res;state.loaded=true;state.loadedAt=Date.now();setText('portal-online-count-v186',Math.max(user().id?1:0,Number(res.onlineUsers||0)));renderEvents(res.events);renderUsers(res.topActiveUsers);renderRecent(res.recentModules);charts(res.csiSummary);innovation(res.innovation);
  var links=normalizePortalLinksV205_(res.portalLinks||(res.applications||res.innovations?res:{}));if(links.applications.length||links.innovations.length){state.portalLinks=links;renderPortalLinksV20(links);writePortalLinksCacheV203_(links);}else{renderPortalLinksV20(state.portalLinks||primePortalLinksV203_());}
  ensurePortalFallbackV205_();if(!state.filterReady)filters(res);var add=document.getElementById('portal-add-event-btn');if(add)add.classList.toggle('hidden',!admin());
}
async function load(force){
  var root=document.getElementById('view-portal');if(!root)return null;ensurePortalFallbackV205_();
  var ttl=(window.CES_CONFIG&&window.CES_CONFIG.PERFORMANCE&&Number(window.CES_CONFIG.PERFORMANCE.PORTAL_CACHE_TTL_MS))||300000;
  if(!force&&state.loaded&&Date.now()-Number(state.loadedAt||0)<ttl)return state.data;if(state.loadingPromise&&!force)return state.loadingPromise;
  var cached=readPortalCacheV19();if(cached&&cached.data&&!state.loaded)renderPortalDataV19(cached.data);
  state.loadingPromise=(async function(){root.classList.add('ces-portal-is-loading');try{var y=document.getElementById('portal-csi-year-v186'),m=document.getElementById('portal-csi-month-v186');var opt={force:!!force,userId:user().id||'',year:y&&y.value?Number(y.value):0,month:m&&m.value?m.value:''};var res=await apiFirst(['getHomeDashboard'],[opt],{timeoutMs:28000});if(!res||res.success===false)throw new Error((res&&res.message)||'Home API returned no data.');renderPortalDataV19(res);writePortalCacheV19(res);return res;}catch(e){if(cached&&cached.data){renderPortalDataV19(cached.data);var r1=document.getElementById('portal-event-grid');if(r1&&!r1.querySelector('.ces-portal-cache-note-v19'))r1.insertAdjacentHTML('afterbegin','<div class="ces-portal-cache-note-v19">กำลังใช้ข้อมูลล่าสุดที่บันทึกไว้ · Backend: '+esc(e.message||e)+'</div>');return cached.data;}var r=document.getElementById('portal-event-grid');if(r&&!r.querySelector('.ces-portal-post-v186'))r.innerHTML='<div class="ces-portal-empty-card"><i class="fas fa-cloud-arrow-down"></i><b>Home ใช้ข้อมูลสำรองชั่วคราว</b><span>Applications และ Team Innovation พร้อมใช้งาน กด Refresh เพื่อโหลด Events และ Dashboard อีกครั้ง</span><button onclick="loadPortalDashboard(true)">Refresh</button></div>';renderPortalLinksV20(state.portalLinks||PORTAL_LINKS_FALLBACK_V203);ensurePortalFallbackV205_();return null;}finally{root.classList.remove('ces-portal-is-loading');state.loadingPromise=null;}})();return state.loadingPromise;
}
async function priorityBootstrapV205_(force){
  if(state.priorityPromise&&!force)return state.priorityPromise;
  primeHomeIdentityV206_();ensurePortalFallbackV205_();primePortalLinksV203_();
  var cached=readPortalCacheV19();if(cached&&cached.data)renderPortalDataV19(cached.data);
  homeOverlayV205_(true,cached&&cached.data?'Checking the latest Home data…':'Loading Home details from CES Hub…');
  state.priorityPromise=(async function(){
    var critical=null;
    try{
      critical=await loadHomeCriticalV206_(!!force);
      ensurePortalFallbackV205_();
      state.firstReady=true;
      homeOverlayV205_(false);
      dispatchHomeReadyV205_({success:!!(critical&&critical.success!==false),critical:true,fallback:!!(critical&&critical.fallback)});
      // Full CSI/activity payload is deliberately non-blocking after the visible
      // Home header, links and events are ready.
      setTimeout(function(){load(!!force).catch(function(error){console.warn('[Home full background]',error);});},40);
      return critical;
    }catch(error){
      ensurePortalFallbackV205_();state.firstReady=true;homeOverlayV205_(false);
      dispatchHomeReadyV205_({success:false,error:String(error&&error.message||error),fallback:true});
      return state.data||(cached&&cached.data)||null;
    }finally{state.priorityPromise=null;}
  })();
  var safety=setTimeout(function(){
    if(!state.firstReady){primeHomeIdentityV206_();ensurePortalFallbackV205_();state.firstReady=true;homeOverlayV205_(false);dispatchHomeReadyV205_({success:false,timeout:true,fallback:true});}
  },10000);
  state.priorityPromise.finally(function(){clearTimeout(safety);});
  return state.priorityPromise;
}

function bindPortalLinks(){var grid=document.getElementById('portal-app-grid');if(!grid||grid.dataset.boundV186==='1')return;grid.dataset.boundV186='1';grid.addEventListener('click',function(event){var link=event.target.closest('a');if(!link)return;var u=user();try{if(window.CES_API&&u.id&&Date.now()-Number(state.usageAt||0)>60000){state.usageAt=Date.now();window.CES_API.callFunction('recordPortalUsage',[{employeeId:u.id,name:u.name_eng||u.name_th||'',team:u.team||'',role:u.role||'',action:'OPEN_LINK',module:'portal',source:'web'}],{transport:'jsonp',timeoutMs:8000}).catch(function(){});}}catch(ignore){}});}
async function syncHomePortalV207_(){
  try{var btn=document.getElementById('ces-home-sync-btn');if(btn){btn.disabled=true;btn.classList.add('is-loading');}await Promise.allSettled([loadPortalLinksV20(true),load(true)]);}
  catch(e){console.warn('[Home Sync]',e);}
  finally{var btn2=document.getElementById('ces-home-sync-btn');if(btn2){btn2.disabled=false;btn2.classList.remove('is-loading');}}
}
function init(force){var u=user();primeHomeIdentityV206_();ensurePortalFallbackV205_();primePortalLinksV203_();setTimeout(function(){primeHomeIdentityV206_();ensurePortalFallbackV205_();},50);setTimeout(function(){ensurePortalFallbackV205_();},700);bindPortalLinks();var add=document.getElementById('portal-add-event-btn');if(add)add.classList.toggle('hidden',!admin());try{if(window.CES_API&&u.id&&Date.now()-Number(state.usageAt||0)>60000){state.usageAt=Date.now();window.CES_API.callFunction('recordPortalUsage',[{employeeId:u.id,name:u.name_eng||u.name_th||'',team:u.team||'',role:u.role||'',action:'ACTIVE',module:'portal',sessionId:(typeof cesSessionIdV50_==='function'?cesSessionIdV50_():''),source:'web'}],{transport:'jsonp',timeoutMs:12000}).catch(function(){});}}catch(ignore){}if(force||!state.loaded||!state.firstReady)priorityBootstrapV205_(!!force);else load(false).catch(function(){});}
function byId(id){return((state.data&&state.data.events)||[]).find(function(x){return String(x.id)===String(id);})||{};}
function readImage(file){return new Promise(function(resolve,reject){if(!file)return resolve(null);if(file.size>3*1024*1024)return reject(new Error('Image must be 3 MB or smaller.'));var fr=new FileReader();fr.onload=function(){resolve({name:file.name,mimeType:file.type||'image/jpeg',base64:String(fr.result||'').split(',').pop()});};fr.onerror=function(){reject(new Error('Cannot read image.'));};fr.readAsDataURL(file);});}
async function editor(id){if(!admin()){if(window.Swal)Swal.fire({icon:'warning',title:'Admin only'});return;}var x=byId(id);var result=await Swal.fire({title:id?'Edit Portal Post':'Post Portal Event',width:720,showCancelButton:true,confirmButtonText:'Publish',confirmButtonColor:'#003DA5',html:'<div class="ces-portal-event-form"><label>Subject *</label><input id="portal-event-title" value="'+esc(x.title||'')+'"><label>Description</label><textarea id="portal-event-description" rows="5">'+esc(x.description||'')+'</textarea><label>Link</label><input id="portal-event-link" type="url" value="'+esc(x.link||'')+'" placeholder="https://"><label>Image</label><input id="portal-event-image" type="file" accept="image/jpeg,image/png,image/webp"><small>JPEG / PNG / WEBP, max 3 MB. Leave blank to keep the current image.</small></div>',preConfirm:async function(){var title=document.getElementById('portal-event-title').value.trim();if(!title){Swal.showValidationMessage('Subject is required.');return false;}try{return{id:id||'',title:title,description:document.getElementById('portal-event-description').value.trim(),link:document.getElementById('portal-event-link').value.trim(),image:await readImage(document.getElementById('portal-event-image').files[0]),actorId:user().id};}catch(e){Swal.showValidationMessage(e.message);return false;}}});if(!result.isConfirmed||!result.value)return;Swal.fire({title:'Publishing…',allowOutsideClick:false,didOpen:function(){Swal.showLoading();}});try{var r=await api('savePortalEvent',[result.value],{transport:'iframe',timeoutMs:90000});if(!r||r.success===false)throw new Error((r&&r.message)||'Save failed.');await load(true);Swal.fire({icon:'success',title:'Post published',timer:1100,showConfirmButton:false});}catch(e){Swal.fire({icon:'error',title:'Save failed',text:e.message||String(e)});}}
async function remove(id){if(!admin())return;var ok=await Swal.fire({icon:'warning',title:'Delete this post?',showCancelButton:true,confirmButtonText:'Delete',confirmButtonColor:'#dc2626'});if(!ok.isConfirmed)return;var r=await api('deletePortalEvent',[{id:id,actorId:user().id}],{transport:'iframe',timeoutMs:50000});if(!r||r.success===false)return Swal.fire({icon:'error',title:'Delete failed',text:(r&&r.message)||''});await load(true);}
async function view(id){try{var r=await api('recordPortalEventView',[{id:id,userId:user().id}],{timeoutMs:15000});if(r&&r.success)setText('portal-event-views-'+id,r.views);}catch(e){}}
async function like(id){try{var r=await api('togglePortalEventLike',[{id:id,userId:user().id}],{transport:'iframe',timeoutMs:30000});if(r&&r.success){setText('portal-event-likes-'+id,r.likes);await load(false);}}catch(e){}}
function csiFilter(){if(state.filterReady)load(true);}
document.addEventListener('ces:language-changed',function(){if(state.portalLinks)renderPortalLinksV20(state.portalLinks);});
window.initPortalDashboard=init;window.loadPortalDashboard=load;window.CES_HOME_BOOTSTRAP=priorityBootstrapV205_;window.openPortalEventEditor=editor;window.openPortalEventDetail=openPortalEventDetail;window.deletePortalEventFront=remove;window.portalViewEvent=view;window.portalLikeEvent=like;window.changePortalCsiFilter=csiFilter;window.CES_HOME_PRIME=primePortalLinksV203_;window.syncHomePortalV207=syncHomePortalV207_;window.CES_PORTAL_FRONTEND_RECHECK=function(){return{success:true,stableApiNames:true,homeCombinedApi:true,frontendFallbackLinks:true,eventImages:true,usageLog:true,csiFilter:true};};
})();

// Prime static/cache Home links as soon as the view exists; backend refresh continues in background.
(function(){function p(){try{if(document.getElementById('portal-app-grid')&&window.CES_HOME_PRIME)window.CES_HOME_PRIME();}catch(e){}}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(p,0);});else setTimeout(p,0);window.addEventListener('ces:app-ready',function(){setTimeout(p,0);});})();
