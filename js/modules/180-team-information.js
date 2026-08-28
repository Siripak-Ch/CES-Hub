// CES Hub V19 — Team Information cache-first + team colors + Admin edit
let CES_TEAM_INFO={loaded:false,rows:[],team:'ALL',generatedAt:'',cacheSource:''};
let CES_TEAM_INFO_ROW_MAP_V3020=Object.create(null);
const CES_TEAM_INFO_LOCAL_KEY='ces_team_information_v19';
const CES_TEAM_INFO_LOCAL_TTL=30*24*60*60*1000; // 30 days

function cesTeamEsc_(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function cesTeamIsAdmin_(){try{return typeof currentUser!=='undefined'&&currentUser&&String(currentUser.role||'').toUpperCase()==='ADMIN';}catch(e){return false;}}
function cesTeamActorId_(){try{return (typeof currentUser!=='undefined'&&currentUser&&(currentUser.id||currentUser.empId))||'';}catch(e){return '';}}
function cesTeamColor_(team){
  return {bg:'#f8fafc',text:'#475569',border:'#cbd5e1',contrast:'#0f172a'};
}
function cesTeamReadLocal_(){try{const x=JSON.parse(localStorage.getItem(CES_TEAM_INFO_LOCAL_KEY)||'null');return x&&Array.isArray(x.data)?x:null;}catch(e){return null;}}
function cesTeamWriteLocal_(rows,generatedAt){try{localStorage.setItem(CES_TEAM_INFO_LOCAL_KEY,JSON.stringify({ts:Date.now(),generatedAt:generatedAt||'',data:rows||[]}));}catch(e){}}

function initTeamInformation(){
  if(CES_TEAM_INFO.loaded){renderTeamTabs_();renderTeamInformation();return;}
  const cached=cesTeamReadLocal_();
  if(cached){
    CES_TEAM_INFO.loaded=true;CES_TEAM_INFO.rows=cached.data;CES_TEAM_INFO.generatedAt=cached.generatedAt||'';CES_TEAM_INFO.cacheSource='browser';
    renderTeamTabs_();renderTeamInformation();
    if(Date.now()-Number(cached.ts||0)>CES_TEAM_INFO_LOCAL_TTL) loadTeamInformation(false,true);
    return;
  }
  loadTeamInformation(false,false);
}
function loadTeamInformation(force,background){
  const root=document.getElementById('team-info-table');
  if(root&&!background)root.innerHTML='<div class="py-12 text-center text-slate-400"><i class="fas fa-circle-notch fa-spin text-2xl mb-3"></i><div class="font-bold text-xs">Loading Staff_Data...</div></div>';
  const ok=res=>{
    if(!res||!res.success){if(!background&&root)root.innerHTML='<div class="text-red-500 py-12 text-center font-bold">'+cesTeamEsc_((res&&res.message)||'Cannot load team information')+'</div>';return;}
    CES_TEAM_INFO.loaded=true;CES_TEAM_INFO.rows=res.data||[];CES_TEAM_INFO.generatedAt=res.generatedAt||'';CES_TEAM_INFO.cacheSource='sheet';
    cesTeamWriteLocal_(CES_TEAM_INFO.rows,CES_TEAM_INFO.generatedAt);renderTeamTabs_();renderTeamInformation();
  };
  const fail=err=>{if(!background&&root)root.innerHTML='<div class="text-red-500 py-12 text-center font-bold">'+cesTeamEsc_(err.message||String(err))+'</div>';};
  if(window.CES_API&&typeof window.CES_API.callFunction==='function'){
    window.CES_API.callFunction('getTeamInformation',[!!force],{transport:'jsonp',timeoutMs:45000,dedupe:true,priority:background?'background':'active',background:!!background,silentLoading:!!background,module:'team_information'}).then(ok).catch(fail);
  }else if(window.google&&google.script&&google.script.run){
    google.script.run.withSuccessHandler(ok).withFailureHandler(fail).getTeamInformation(!!force);
  }else fail(new Error('CES API bridge is not ready.'));
}
function renderTeamTabs_(){
  const teams=['ALL','MED','LAB','EHS','ENV','TES','QM','MNG','SALES'],root=document.getElementById('team-info-tabs');if(!root)return;
  root.innerHTML=teams.map(t=>{const c=cesTeamColor_(t);const active=CES_TEAM_INFO.team===t;return `<button onclick="CES_TEAM_INFO.team='${t}';renderTeamTabs_();renderTeamInformation()" class="px-3 py-2 rounded-xl text-[10px] font-black border transition-all" style="${active?`background:${c.text};color:#fff;border-color:${c.text}`:`background:${c.bg};color:${c.text};border-color:${c.border}`}">${t}</button>`;}).join('');
}
function openTeamInformationDetailV30_(row){row=row||{};var entries=Object.keys(row).filter(function(k){return row[k]!==null&&row[k]!==undefined&&String(row[k]).trim()!=='';});var html='<div class="text-left max-h-[70vh] overflow-auto pr-1"><div class="grid grid-cols-1 md:grid-cols-2 gap-2">'+entries.map(function(k){var v=String(row[k]),safe=cesTeamEsc_(v);if(/^https?:\/\//i.test(v))safe='<a href="'+safe+'" target="_blank" rel="noopener" class="text-[#003DA5] underline break-all">'+safe+'</a>';if(k.toLowerCase().includes('email')&&v.indexOf('@')>0)safe='<a href="mailto:'+cesTeamEsc_(v)+'" class="text-[#003DA5] underline break-all">'+cesTeamEsc_(v)+'</a>';return '<div class="rounded-xl border border-slate-100 bg-slate-50 p-3"><div class="text-[9px] uppercase tracking-wide font-black text-slate-400">'+cesTeamEsc_(k)+'</div><div class="mt-1 text-xs font-bold text-slate-700 break-words">'+safe+'</div></div>';}).join('')+'</div></div>';if(window.Swal)Swal.fire({title:cesTeamEsc_(row.nameEng||row.nameTh||row.id||'Staff Detail'),html:html,width:'min(920px,94vw)',confirmButtonText:'Close',confirmButtonColor:'#003DA5'});}
function openTeamInformationDetailByKeyV3020_(key){var row=CES_TEAM_INFO_ROW_MAP_V3020[String(key||'')];if(row)openTeamInformationDetailV30_(row);}
function editTeamInformationByKeyV3020_(key){var row=CES_TEAM_INFO_ROW_MAP_V3020[String(key||'')];if(row)editTeamInformation(row);}
function renderTeamInformation(){
  const rows=CES_TEAM_INFO.rows||[],q=(document.getElementById('team-info-search')?.value||'').toLowerCase().trim();
  const filtered=rows.filter(r=>{const rawTeam=(r.team||'').toUpperCase();const team=['MED','LAB','EHS','ENV','TES','QM','MNG','SALES'].includes(rawTeam)?rawTeam:'MNG';const matchTeam=CES_TEAM_INFO.team==='ALL'||team===CES_TEAM_INFO.team;const text=[r.id,r.nameTh,r.nameEng,r.email,r.team,r.position,r.supervisor,r.tel,r.costCenter].join(' ').toLowerCase();return matchTeam&&(!q||text.includes(q));});
  renderTeamSummary_(rows);const root=document.getElementById('team-info-table');if(!root)return;
  const meta=document.getElementById('team-info-cache-status');if(meta)meta.textContent=`${CES_TEAM_INFO.cacheSource==='browser'?'Cached data':'Staff_Data'}${CES_TEAM_INFO.generatedAt?' · '+new Date(CES_TEAM_INFO.generatedAt).toLocaleString('th-TH'):''}`;
  if(!filtered.length){root.innerHTML='<div class="py-14 text-center text-slate-400"><i class="fas fa-user-slash text-3xl mb-3 text-slate-300"></i><div class="font-bold">No staff found</div></div>';return;}
  const admin=cesTeamIsAdmin_();
  CES_TEAM_INFO_ROW_MAP_V3020=Object.create(null);
  root.innerHTML=`<div class="ces-team-info-table-wrap overflow-auto rounded-2xl border border-slate-200 max-h-[680px]"><table class="ces-team-info-table w-full min-w-[1280px] text-xs text-left"><thead class="sticky top-0 z-20 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><tr><th class="p-3 sticky left-0 z-30 bg-slate-50 min-w-[250px]">Staff</th><th class="p-3 min-w-[90px]">Team</th><th class="p-3 min-w-[260px]">Position / Role</th><th class="p-3 min-w-[250px]">Email</th><th class="p-3 min-w-[190px]">Supervisor</th><th class="p-3 min-w-[150px]">Employee Type</th><th class="p-3 min-w-[140px]">Contact</th>${admin?'<th class="p-3 text-center min-w-[80px]">Action</th>':''}</tr></thead><tbody class="divide-y divide-slate-100">${filtered.map((r,index)=>{const key='r'+index+'_'+String(r.id||'').replace(/[^a-z0-9_-]/gi,'');CES_TEAM_INFO_ROW_MAP_V3020[key]=r;const rawTeam=String(r.team||'').toUpperCase();const displayTeam=['MED','LAB','EHS','ENV','TES','QM','MNG','SALES'].includes(rawTeam)?rawTeam:'MNG';const c=cesTeamColor_(displayTeam);return `<tr class="hover:bg-slate-50/80 cursor-pointer" style="border-left:4px solid ${c.text}" onclick="openTeamInformationDetailByKeyV3020_('${key}')"><td class="p-3 sticky left-0 bg-white group-hover:bg-slate-50 z-10"><b class="text-slate-800 whitespace-nowrap">${cesTeamEsc_(r.nameEng||r.nameTh||r.id)}</b><div class="text-[10px] text-slate-400 whitespace-nowrap">${cesTeamEsc_(r.nameTh||'')} · ${cesTeamEsc_(r.id||'')}</div></td><td class="p-3"><span class="inline-flex px-2.5 py-1 rounded-full font-black whitespace-nowrap" style="background:${c.bg};color:${c.text};border:1px solid ${c.border}">${cesTeamEsc_(displayTeam)}</span></td><td class="p-3 font-bold text-slate-600"><div class="leading-5">${cesTeamEsc_(r.position||'-')}</div><div class="text-[10px] text-slate-400 mt-1 whitespace-nowrap">${cesTeamEsc_(r.role||'-')}</div></td><td class="p-3 text-slate-600 whitespace-nowrap"><a onclick="event.stopPropagation()" class="hover:underline" href="mailto:${cesTeamEsc_(r.email||'')}">${cesTeamEsc_(r.email||'-')}</a></td><td class="p-3 text-slate-600 whitespace-nowrap">${cesTeamEsc_(r.supervisor||'-')}</td><td class="p-3 text-slate-600 whitespace-nowrap">${cesTeamEsc_(r.empType||'-')}</td><td class="p-3 text-slate-600 whitespace-nowrap">${cesTeamEsc_(r.tel||'-')}</td>${admin?`<td class="p-3 text-center"><button class="w-8 h-8 rounded-lg bg-blue-50 text-[#003DA5] border border-blue-100" onclick="event.stopPropagation();editTeamInformationByKeyV3020_('${key}')" title="Edit"><i class="fas fa-pen"></i></button></td>`:''}</tr>`;}).join('')}</tbody></table></div><div class="mt-3 text-[10px] font-bold text-slate-400">${admin?'Admin edit enabled':'Read-only'} · ${filtered.length} staff · Scroll horizontally to view all columns</div>`;
}
function renderTeamSummary_(rows){
  const teams=['MED','LAB','EHS','ENV','TES','QM','MNG','SALES'],root=document.getElementById('team-info-summary');if(!root)return;
  root.innerHTML=teams.map(t=>{const n=rows.filter(r=>{const raw=(r.team||'').toUpperCase();const x=['MED','LAB','EHS','ENV','TES','QM','MNG','SALES'].includes(raw)?raw:'MNG';return x===t;}).length,c=cesTeamColor_(t);return `<div class="rounded-2xl border p-3 text-center" style="background:${c.bg};border-color:${c.border}"><div class="text-[10px] font-black" style="color:${c.text}">${t}</div><div class="text-xl font-black mt-1" style="color:${c.text}">${n}</div></div>`;}).join('');
}
function cesTeamApplyCurrentUserUpdateV51_(staff){
  if(!staff)return; const actor=cesTeamActorId_(); if(String(actor)!==String(staff.id)&&String(actor)!==String(staff.originalId||''))return;
  const patch={id:staff.id,empId:staff.id,nameTh:staff.nameTh,nameEng:staff.nameEng,name:staff.nameEng||staff.nameTh,email:staff.email,team:staff.team,position:staff.position,role:staff.role,costCenter:staff.costCenter,supervisor:staff.supervisor,empType:staff.empType,tel:staff.tel};
  try{if(typeof currentUser!=='undefined'&&currentUser)Object.assign(currentUser,patch);}catch(e){}
  try{window.CES_CURRENT_USER=Object.assign({},window.CES_CURRENT_USER||{},patch);}catch(e){}
  try{localStorage.setItem('ces_user',JSON.stringify(window.CES_CURRENT_USER||patch));}catch(e){}
  try{if(typeof cesPersistSessionV50_==='function')cesPersistSessionV50_(window.CES_CURRENT_USER||patch,'team_information','STAFF_INFO_UPDATED');}catch(e){}
  try{if(typeof updateProfileUI==='function')updateProfileUI();}catch(e){}
}

function editTeamInformation(row){
  if(!cesTeamIsAdmin_()){Swal.fire('Permission Denied','Admin permission is required.','error');return;}
  const teams=['MED','LAB','EHS','ENV','TES','QM','MNG','SALES'],roles=['ADMIN','MANAGER','SUPERVISOR','STAFF'];
  Swal.fire({title:'Edit Team Information',width:820,html:`<div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-left"><div><label class="ces-form-label">Staff ID</label><input id="ti-id" class="swal2-input !m-0 !w-full" value="${cesTeamEsc_(row.id)}"></div><div><label class="ces-form-label">Email</label><input id="ti-email" class="swal2-input !m-0 !w-full" value="${cesTeamEsc_(row.email)}"></div><div><label class="ces-form-label">Thai Name</label><input id="ti-th" class="swal2-input !m-0 !w-full" value="${cesTeamEsc_(row.nameTh)}"></div><div><label class="ces-form-label">English Name</label><input id="ti-en" class="swal2-input !m-0 !w-full" value="${cesTeamEsc_(row.nameEng)}"></div><div><label class="ces-form-label">Team</label><select id="ti-team" class="swal2-select !m-0 !w-full">${teams.map(x=>`<option ${x===((['MED','LAB','EHS','ENV','TES','QM','MNG','SALES'].includes(String(row.team||'').toUpperCase()))?String(row.team||'').toUpperCase():'MNG')?'selected':''}>${x}</option>`).join('')}</select></div><div><label class="ces-form-label">Role</label><select id="ti-role" class="swal2-select !m-0 !w-full">${roles.map(x=>`<option ${x===row.role?'selected':''}>${x}</option>`).join('')}</select></div><div><label class="ces-form-label">Position</label><input id="ti-position" class="swal2-input !m-0 !w-full" value="${cesTeamEsc_(row.position)}"></div><div><label class="ces-form-label">Supervisor</label><input id="ti-supervisor" class="swal2-input !m-0 !w-full" value="${cesTeamEsc_(row.supervisor)}"></div><div><label class="ces-form-label">Cost Center</label><input id="ti-cost" class="swal2-input !m-0 !w-full" value="${cesTeamEsc_(row.costCenter)}"></div><div><label class="ces-form-label">Employee Type</label><input id="ti-type" class="swal2-input !m-0 !w-full" value="${cesTeamEsc_(row.empType)}"></div><div><label class="ces-form-label">Contact</label><input id="ti-tel" class="swal2-input !m-0 !w-full" value="${cesTeamEsc_(row.tel)}"></div></div>`,showCancelButton:true,confirmButtonText:'Save Staff Data',preConfirm:()=>({actorId:cesTeamActorId_(),originalId:row.id,id:document.getElementById('ti-id').value.trim(),nameTh:document.getElementById('ti-th').value.trim(),nameEng:document.getElementById('ti-en').value.trim(),email:document.getElementById('ti-email').value.trim(),team:document.getElementById('ti-team').value,position:document.getElementById('ti-position').value.trim(),role:document.getElementById('ti-role').value,costCenter:document.getElementById('ti-cost').value.trim(),supervisor:document.getElementById('ti-supervisor').value.trim(),empType:document.getElementById('ti-type').value.trim(),tel:document.getElementById('ti-tel').value.trim()})}).then(async result=>{
    if(!result.isConfirmed)return;
    Swal.fire({title:'Updating Staff_Data...',allowOutsideClick:false,didOpen:()=>Swal.showLoading()});
    try{const res=await window.CES_API.callFunction('updateTeamInformation',[result.value],{transport:'jsonp',timeoutMs:60000});if(!res||!res.success)throw new Error((res&&res.message)||'Update failed');cesTeamApplyCurrentUserUpdateV51_(res.data);localStorage.removeItem(CES_TEAM_INFO_LOCAL_KEY);CES_TEAM_INFO.loaded=false;await Swal.fire('Updated',res.message||'Staff information updated','success');loadTeamInformation(true,false);}catch(err){Swal.fire('Update Error',err.message||String(err),'error');}
  });
}


// ============================================================
// CES Hub V20 — Training Record (2026)
// ============================================================
const CES_TRAINING_V20={loaded:false,data:null,mode:'directory',planLoaded:false,planData:null,planDirty:{},planSheet:'STEP FORWARD 2026'};
function refreshTeamInformationV20(){
  if(CES_TRAINING_V20.mode==='training') loadTrainingDashboardV20(true);
  else if(CES_TRAINING_V20.mode==='plan') loadTrainingPlan(true);
  else loadTeamInformation(true,false);
}
function switchTeamInfoModeV20(mode){
  CES_TRAINING_V20.mode=(mode==='training'||mode==='plan')?mode:'directory';
  const dir=document.getElementById('team-info-directory-panel'),training=document.getElementById('team-info-training-panel'),plan=document.getElementById('team-info-plan-panel');
  if(dir)dir.classList.toggle('hidden',CES_TRAINING_V20.mode!=='directory');
  if(training)training.classList.toggle('hidden',CES_TRAINING_V20.mode!=='training');
  if(plan)plan.classList.toggle('hidden',CES_TRAINING_V20.mode!=='plan');
  const d=document.getElementById('team-info-directory-tab'),tr=document.getElementById('team-info-training-tab'),pl=document.getElementById('team-info-plan-tab');
  if(d)d.classList.toggle('active',CES_TRAINING_V20.mode==='directory');
  if(tr)tr.classList.toggle('active',CES_TRAINING_V20.mode==='training');
  if(pl)pl.classList.toggle('active',CES_TRAINING_V20.mode==='plan');
  if(CES_TRAINING_V20.mode==='training'&&!CES_TRAINING_V20.loaded)loadTrainingDashboardV20(false);
  if(CES_TRAINING_V20.mode==='plan'&&!CES_TRAINING_V20.planLoaded)loadTrainingPlan(false);
  if(window.CES_LANGUAGE&&window.CES_LANGUAGE.apply)window.CES_LANGUAGE.apply();
}
async function loadTrainingDashboardV20(force){
  const root=document.getElementById('training-people-list');
  if(root&&!CES_TRAINING_V20.loaded)root.innerHTML='<div class="lg:col-span-2 py-12 text-center text-slate-400"><i class="fas fa-circle-notch fa-spin text-2xl"></i><div class="mt-2 font-bold">Loading Training Records…</div></div>';
  try{
    if(!window.CES_API)throw new Error('CES API is not ready.');
    const res=await window.CES_API.callFunction('getTrainingDashboard',[{forceRefresh:!!force}],{transport:'jsonp',timeoutMs:45000});
    if(!res||res.success===false)throw new Error((res&&res.message)||'Cannot load training records.');
    CES_TRAINING_V20.loaded=true;CES_TRAINING_V20.data=res;renderTrainingDashboardV20();
  }catch(err){if(root)root.innerHTML='<div class="lg:col-span-2 py-12 text-center text-red-500 font-bold">'+cesTeamEsc_(err.message||String(err))+'</div>';}
}
function renderTrainingDashboardV20(){
  const data=CES_TRAINING_V20.data||{people:[],teams:[],overall:{}};
  const overall=data.overall||{},rate=Number(overall.completionRate||0);
  const donut=document.getElementById('training-overall-donut');if(donut)donut.style.setProperty('--progress',Math.max(0,Math.min(100,rate))+'%');
  const rateEl=document.getElementById('training-overall-rate');if(rateEl)rateEl.textContent=rate.toFixed(1)+'%';
  const teams=document.getElementById('training-team-summary');
  if(teams)teams.innerHTML=(data.teams||[]).map(t=>`<div class="ces-training-team-card"><div><b>${cesTeamEsc_(t.team)}</b><span>${Number(t.completed||0)}/${Number(t.eligible||0)} completed</span></div><strong>${Number(t.totalHours||0).toFixed(1)} / ${Number(t.targetHours||0).toFixed(0)} hr</strong><div class="ces-training-progress"><i style="width:${Math.min(100,Number(t.progress||0))}%"></i></div></div>`).join('')||'<div class="text-slate-400 text-xs">No eligible staff.</div>';
  const team=(document.getElementById('training-team-filter')?.value||'ALL').toUpperCase();
  const q=(document.getElementById('training-search')?.value||'').toLowerCase().trim();
  const people=(data.people||[]).filter(p=>(team==='ALL'||String(p.team).toUpperCase()===team)&&(!q||[p.id,p.nameTh,p.nameEng,p.position,p.team].join(' ').toLowerCase().includes(q)));
  const root=document.getElementById('training-people-list');if(!root)return;
  root.innerHTML=people.map(p=>{const records=(data.records||[]).filter(r=>String(r.userId||'')===String(p.id||'')&&String(r.completedStatus||'').toLowerCase()==='completed').slice(0,5);const history=records.length?`<details class="ces-training-history"><summary>Learning History (${Number(p.recordCount||records.length||0)})</summary>${records.map(r=>`<div><b>${cesTeamEsc_(r.contentName||'Training')}</b><span>Completed · ${cesTeamEsc_(r.completedDate||'-')} · ${Number(r.totalHour||0).toFixed(1)} hr</span></div>`).join('')}</details>`:'';return `<article class="ces-training-person"><div class="ces-training-person-head"><div><b>${cesTeamEsc_(p.nameEng||p.nameTh||p.id)}</b><span>${cesTeamEsc_(p.nameTh||'')} · ${cesTeamEsc_(p.id)} · ${cesTeamEsc_(p.team)}</span><small>${cesTeamEsc_(p.position||'-')}</small></div><strong>${Number(p.hours||0).toFixed(1)}${p.eligible?' / 60':' hr'}</strong></div><div class="ces-training-progress ${p.eligible?'':'excluded'}"><i style="width:${p.eligible?Math.min(100,Number(p.progress||0)):100}%"></i></div><div class="ces-training-person-foot"><span>${p.eligible?(p.completed?'Completed':'Remaining '+Number(p.remainingHours||0).toFixed(1)+' hr'):'Excluded from target'}</span>${p.id?`<button onclick="openTrainingManualV20('${cesTeamEsc_(p.id)}')"><i class="fas fa-plus"></i> Add</button>`:'<span class="text-[9px] text-slate-400">No Employee ID</span>'}</div>${history}</article>`;}).join('')||'<div class="lg:col-span-2 py-12 text-center text-slate-400">No staff found.</div>';
}
function cesTrainingExcelDateV20_(value){
  if(value instanceof Date&&!isNaN(value.getTime()))return value.toISOString().slice(0,10);
  if(typeof value==='number'&&window.XLSX&&XLSX.SSF){try{return XLSX.SSF.format('yyyy-mm-dd',value);}catch(e){}}
  const s=String(value==null?'':value).trim();
  const m=s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if(m){const year=Number(m[3])<100?2000+Number(m[3]):Number(m[3]);return year+'-'+String(Number(m[2])).padStart(2,'0')+'-'+String(Number(m[1])).padStart(2,'0');}
  return s;
}
function cesTrainingHoursV20_(value){
  if(typeof value==='number')return value>0&&value<1?value*24:value;
  const s=String(value==null?'':value).trim();
  if(/^\d{1,3}:\d{2}(?::\d{2})?$/.test(s)){const a=s.split(':').map(Number);return a[0]+a[1]/60+(a[2]||0)/3600;}
  return Number(s.replace(',','.'))||0;
}
async function importTrainingWorkbookV20(file){
  if(!file)return;
  if(!window.XLSX){Swal.fire('Import Error','SheetJS library is not ready.','error');return;}
  Swal.fire({title:'Reading Learning Report…',allowOutsideClick:false,didOpen:()=>Swal.showLoading()});
  try{
    const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});
    const detail=wb.Sheets['Learning Detail'],history=wb.Sheets['Learning History'];
    if(!history)throw new Error('Sheet "Learning History" was not found.');
    let userId='';
    if(detail){const matrix=XLSX.utils.sheet_to_json(detail,{header:1,defval:'',raw:false});const map={};matrix.forEach(r=>{map[String(r[0]||'').trim().toLowerCase()]=String(r[1]||'').trim();});userId=map['user id']||map['username']||String((matrix[0]&&matrix[0][1])||'').trim();}
    if(!userId)userId=String(cesTeamActorId_()||'').trim();
    const rows=XLSX.utils.sheet_to_json(history,{defval:'',raw:true});if(!userId&&rows.length)userId=String(rows[0]['Username']||'').trim();
    const records=rows.map((r,index)=>({
      recordId:String(r['Record ID']||('EXCEL-'+userId+'-'+index)).trim(),userId:userId,
      contentName:String(r['Content Name']||r['Content Program Name']||'Training').trim(),contentType:String(r['Content Type']||'').trim(),provider:String(r['Content Provider']||'').trim(),category:String(r['Category']||'').trim(),
      startDate:cesTrainingExcelDateV20_(r['Start Date']),endDate:cesTrainingExcelDateV20_(r['End Date']),completedStatus:String(r['Completed Status']||'').trim(),completedDate:cesTrainingExcelDateV20_(r['Completed Date']),totalHour:cesTrainingHoursV20_(r['Total Hour'])
    })).filter(r=>{const d=String(r.completedDate||r.endDate||r.startDate);return r.completedStatus.toLowerCase()==='completed'&&/^2026(?:-|$)/.test(d)&&r.totalHour>0;});
    if(!records.length)throw new Error('No Completed learning records for 2026 were found.');
    const res=await window.CES_API.callFunction('saveTrainingRecords',[{actorId:cesTeamActorId_(),userId:userId,sourceFile:file.name,entryType:'IMPORT',records:records}],{transport:'iframe',timeoutMs:120000});
    if(!res||res.success===false)throw new Error((res&&res.message)||'Import failed.');
    await loadTrainingDashboardV20(true);
    Swal.fire({icon:'success',title:'Training records imported',text:`Added ${res.added||0} · Updated ${res.updated||0} · Skipped ${res.skipped||0} · Staff_Data P:AB`});
  }catch(err){Swal.fire('Import Error',err.message||String(err),'error');}
}
async function openTrainingManualV20(userId){
  userId=String(userId||cesTeamActorId_()||'');
  var today=new Date(), defaultDate=today.getFullYear()===2026?today.toISOString().slice(0,10):'2026-12-31';
  const result=await Swal.fire({title:'Add Learning Hours',width:680,showCancelButton:true,confirmButtonText:'Save',html:`<div class="text-left grid grid-cols-1 md:grid-cols-2 gap-3"><label class="md:col-span-2 text-xs font-bold">Employee ID<input id="tr-user" class="swal2-input !m-0 !w-full" value="${cesTeamEsc_(userId)}"></label><label class="md:col-span-2 text-xs font-bold">Course / Content<input id="tr-name" class="swal2-input !m-0 !w-full"></label><label class="text-xs font-bold">Completed Date<input id="tr-date" type="date" class="swal2-input !m-0 !w-full" value="${defaultDate}"></label><label class="text-xs font-bold">Learning Hour<input id="tr-hour" type="number" min="0.1" step="0.1" class="swal2-input !m-0 !w-full"></label><label class="md:col-span-2 text-xs font-bold">Note<textarea id="tr-note" class="swal2-textarea !m-0 !w-full"></textarea></label></div>`,preConfirm:()=>({actorId:cesTeamActorId_(),userId:document.getElementById('tr-user').value.trim(),contentName:document.getElementById('tr-name').value.trim(),completedDate:document.getElementById('tr-date').value,totalHour:Number(document.getElementById('tr-hour').value||0),note:document.getElementById('tr-note').value.trim()})});
  if(!result.isConfirmed)return;
  try{const res=await window.CES_API.callFunction('saveTrainingManualRecord',[result.value],{transport:'iframe',timeoutMs:60000});if(!res||res.success===false)throw new Error((res&&res.message)||'Save failed');await loadTrainingDashboardV20(true);Swal.fire({icon:'success',title:'Learning hour saved',timer:1300,showConfirmButton:false});}catch(err){Swal.fire('Save Error',err.message||String(err),'error');}
}

// ============================================================
// Training Plan 2026 — editable view backed by CES Staff List & Training Plan 2026
// ============================================================
function trainingPlanSheet_(){return CES_TRAINING_V20.planSheet||'STEP FORWARD 2026';}
function trainingPlanEscape_(v){return cesTeamEsc_(v);}
function trainingPlanColumnName_(n){let s='';while(n>0){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26);}return s;}
function setTrainingPlanSheet(sheetName){
  CES_TRAINING_V20.planSheet=String(sheetName||'STEP FORWARD 2026');
  CES_TRAINING_V20.planLoaded=false;
  document.querySelectorAll('[data-training-plan-sheet]').forEach(function(btn){
    btn.classList.toggle('active',btn.getAttribute('data-training-plan-sheet')===CES_TRAINING_V20.planSheet);
  });
  loadTrainingPlan(false);
}
async function loadTrainingPlan(force){
  const root=document.getElementById('training-plan-grid');if(root)root.innerHTML='<div class="py-14 text-center text-slate-400"><i class="fas fa-circle-notch fa-spin text-xl"></i><div class="mt-2 text-xs font-bold">Loading Training Plan…</div></div>';
  try{
    const res=await window.CES_API.callFunction('getTrainingPlan',[{sheetName:trainingPlanSheet_(),force:!!force}],{transport:'jsonp',timeoutMs:60000,dedupe:false});
    if(!res||res.success===false)throw new Error((res&&res.message)||'Cannot load training plan');
    CES_TRAINING_V20.planLoaded=true;CES_TRAINING_V20.planData=res;CES_TRAINING_V20.planDirty={};renderTrainingPlan();
  }catch(err){if(root)root.innerHTML='<div class="py-14 text-center text-red-500 font-bold">'+trainingPlanEscape_(err.message||String(err))+'</div>';}
}
function renderTrainingPlan(){
  const data=CES_TRAINING_V20.planData||{},root=document.getElementById('training-plan-grid');if(!root)return;
  const rows=Array.isArray(data.values)?data.values:[],headerRows=Number(data.headerRows||0),formulaMap=data.formulas||[];
  const maxCols=Number(data.columnCount||0)||Math.max(0,...rows.map(r=>r.length));
  const merges=Array.isArray(data.merges)?data.merges:[];
  const startMap={},covered={};
  merges.forEach(function(m){
    const key=m.row+':'+m.col;startMap[key]=m;
    for(let rr=m.row;rr<m.row+Number(m.numRows||1);rr++)for(let cc=m.col;cc<m.col+Number(m.numCols||1);cc++){
      if(rr!==m.row||cc!==m.col)covered[rr+':'+cc]=true;
    }
  });
  let html='<div class="ces-training-plan-scroll"><table class="ces-training-plan-table">';
  if(maxCols){
    html+='<colgroup>';
    for(let ci=0;ci<maxCols;ci++){
      const raw=Number((data.columnWidths||[])[ci]||100);
      let px;
      if(trainingPlanSheet_()==='STEP FORWARD 2026'){
        const preset=[54,76,92,360,58,88];
        px=preset[ci]||Math.max(62,Math.min(180,Math.round(raw*0.8)));
      }else{
        px=Math.max(ci===1?220:58,Math.min(ci===1?380:220,Math.round(raw*0.92)));
      }
      html+='<col style="width:'+px+'px;min-width:'+px+'px">';
    }
    html+='</colgroup>';
  }
  html+='<tbody>';
  rows.forEach((row,ri)=>{
    const sheetRow=ri+1,rawH=Number((data.rowHeights||[])[ri]||28),height=Math.max(28,Math.min(90,rawH));
    html+='<tr style="height:'+height+'px">';
    for(let ci=0;ci<maxCols;ci++){
      const sheetCol=ci+1,key=sheetRow+':'+sheetCol;if(covered[key])continue;
      const value=row[ci]==null?'':row[ci],formula=(formulaMap[ri]&&formulaMap[ri][ci])||'',readOnly=sheetRow<=headerRows||!!formula;
      const merge=startMap[key],attrs=merge?' colspan="'+Number(merge.numCols||1)+'" rowspan="'+Number(merge.numRows||1)+'"':'';
      const ref=trainingPlanColumnName_(sheetCol)+sheetRow;
      const cls=(readOnly?'read-only':'editable')+(merge?' merged':'')+(sheetRow<=headerRows?' heading':'');
      html+='<td class="'+cls+'" data-ref="'+ref+'"'+attrs+'>';
      html+=readOnly?'<span>'+trainingPlanEscape_(value)+'</span>':'<textarea rows="1" data-row="'+sheetRow+'" data-col="'+sheetCol+'" oninput="markTrainingPlanCell(this)">'+trainingPlanEscape_(value)+'</textarea>';
      html+='</td>';
    }
    html+='</tr>';
  });
  html+='</tbody></table></div>';root.innerHTML=html;
  root.querySelectorAll('textarea').forEach(function(t){t.style.height='auto';t.style.height=Math.min(88,Math.max(30,t.scrollHeight))+'px';t.addEventListener('input',function(){this.style.height='auto';this.style.height=Math.min(88,Math.max(30,this.scrollHeight))+'px';});});
  const meta=document.getElementById('training-plan-meta');if(meta)meta.textContent=(data.title||'CES Staff List & Training Plan 2026')+' · '+(data.sheetName||'')+' · '+rows.length+' rows';
  const save=document.getElementById('training-plan-save');if(save){save.disabled=true;save.innerHTML='<i class="fas fa-floppy-disk"></i> Save changes';}
  document.querySelectorAll('[data-training-plan-sheet]').forEach(function(btn){btn.classList.toggle('active',btn.getAttribute('data-training-plan-sheet')===trainingPlanSheet_());});
}
function markTrainingPlanCell(input){
  const row=Number(input.dataset.row||0),col=Number(input.dataset.col||0);if(!row||!col)return;CES_TRAINING_V20.planDirty[row+':'+col]={row:row,col:col,value:input.value};
  const save=document.getElementById('training-plan-save');if(save){save.disabled=false;save.innerHTML='<i class="fas fa-floppy-disk"></i> Save '+Object.keys(CES_TRAINING_V20.planDirty).length+' change(s)';}
}
async function saveTrainingPlan(){
  const changes=Object.values(CES_TRAINING_V20.planDirty||{});if(!changes.length)return;const btn=document.getElementById('training-plan-save');if(btn)btn.disabled=true;
  try{const res=await window.CES_API.callFunction('saveTrainingPlanChanges',[{actorId:cesTeamActorId_(),sheetName:trainingPlanSheet_(),changes:changes}],{transport:'iframe',timeoutMs:90000,dedupe:false});if(!res||res.success===false)throw new Error((res&&res.message)||'Save failed');await loadTrainingPlan(true);Swal.fire({icon:'success',title:'Training Plan updated',text:(res.updated||changes.length)+' cells saved',timer:1500,showConfirmButton:false});}
  catch(err){if(btn)btn.disabled=false;Swal.fire('Training Plan',err.message||String(err),'error');}
}
function openTrainingPlanSource(){const url=(typeof window.cesExternalLink==='function'&&window.cesExternalLink('TRAINING_PLAN_2026'))||(CES_TRAINING_V20.planData&&CES_TRAINING_V20.planData.sourceUrl)||'';if(url)window.open(url,'_blank','noopener,noreferrer');}

window.refreshTeamInformationV20=refreshTeamInformationV20;window.openTeamInformationDetailV30_=openTeamInformationDetailV30_;window.openTeamInformationDetailByKeyV3020_=openTeamInformationDetailByKeyV3020_;window.editTeamInformationByKeyV3020_=editTeamInformationByKeyV3020_;
window.switchTeamInfoModeV20=switchTeamInfoModeV20;
window.loadTrainingDashboardV20=loadTrainingDashboardV20;
window.renderTrainingDashboardV20=renderTrainingDashboardV20;
window.importTrainingWorkbookV20=importTrainingWorkbookV20;
window.openTrainingManualV20=openTrainingManualV20;
window.setTrainingPlanSheet=setTrainingPlanSheet;
window.loadTrainingPlan=loadTrainingPlan;
window.renderTrainingPlan=renderTrainingPlan;
window.markTrainingPlanCell=markTrainingPlanCell;
window.saveTrainingPlan=saveTrainingPlan;
window.openTrainingPlanSource=openTrainingPlanSource;

// V22.5 standalone Information > Team Plan
window.initTeamPlanV225=function(){try{if(typeof window.loadTrainingPlan==='function')return window.loadTrainingPlan(false);}catch(e){console.warn('[Team Plan V22.5]',e);}return null;};
