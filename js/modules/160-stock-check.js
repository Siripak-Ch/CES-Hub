/* ============================================================
   CES Stock Pro V3 — Stock_Check_java.html
============================================================ */
let SC = { mode:'CHECK-IN', logs:[] };

function initStockCheckModule(force=false){
  spEnsureStyle();
  sc_loadLogs(force===true);
  if(force===true&&window.CES_API&&typeof window.CES_API.callFunction==='function')window.CES_API.callFunction('sc_getAccessoryLookupOptions',[],{transport:'jsonp',timeoutMs:30000}).catch(function(){});
}
function sc_setMode(mode){
  SC.mode=mode;
  document.getElementById('scModeIn')?.classList.toggle('active',mode==='CHECK-IN');
  document.getElementById('scModeIn')?.classList.toggle('in',mode==='CHECK-IN');
  document.getElementById('scModeOut')?.classList.toggle('active',mode==='CHECK-OUT');
  document.getElementById('scModeOut')?.classList.toggle('out',mode==='CHECK-OUT');
  const txt=document.getElementById('scModeText');
  if(txt){txt.style.color=mode==='CHECK-IN'?'#059669':'#dc2626';txt.innerHTML=mode==='CHECK-IN'?'● โหมด: รับเข้าคลัง':'● โหมด: เพิ่มเป็นรายการยืม';}
}
function sc_lookup(){
  const q=spVal('scKeyword','').trim();
  if(!q){Swal.fire('กรุณากรอกรหัส','','info');return;}
  spSetHtml('scResult','<div class="stockpro-card"><div class="sp-muted">กำลังค้นหา...</div></div>');
  google.script.run.withSuccessHandler(res=>{
    if(!res||!res.success){Swal.fire('Check Stock Error',(res&&res.message)||'Lookup failed','error');return;}
    sc_renderResult(res.data||[]);
    sc_loadLogs();
  }).withFailureHandler(err=>Swal.fire('Check Stock Error',err.message||String(err),'error')).sc_lookupStockDevice(q);
}
function sc_renderResult(rows){
  if(!rows.length){spSetHtml('scResult','<div class="stockpro-card"><h3>ไม่พบข้อมูล</h3><div class="sp-muted">ลองตรวจสอบ ID / SN อีกครั้ง</div></div>');return;}
  spSetHtml('scResult',rows.map(d=>`<div class="stockpro-card sc-result-compact" onclick='sc_openResultPopup(${JSON.stringify(d).replace(/'/g,"&#39;")})' style="cursor:pointer"><div class="stockpro-card-head"><h3>${spEsc(d.idCode)} ${spBadge(d.status)}</h3><span class="sp-pill">${spEsc(d.model||d.itemName||'-')}</span></div><div class="sp-result-grid sc-result-summary"><div class="sp-field"><div class="k">SN</div><div class="v">${spEsc(d.sn||'-')}</div></div><div class="sp-field"><div class="k">Location</div><div class="v">${spEsc(d.location||'-')}</div></div><div class="sp-field"><div class="k">Rental</div><div class="v">${spEsc(d.rentalStatus||'-')}</div></div><div class="sp-field"><div class="k">CAL / PM</div><div class="v">${spEsc(d.calPm||d.actionRequired||'-')}</div></div></div><div class="sp-muted" style="margin-top:8px">กดเพื่อดูรายละเอียดและ Action</div></div>`).join(''));
}
function sc_openResultPopup(d){
  if(!d)return;
  const field=(k,v)=>`<div class=\"sc-popup-field\"><span>${spEsc(k)}</span><b>${spEsc(v||'-')}</b></div>`;
  const id=spEsc(d.idCode||d.id||'');
  const status=String(d.equipmentStatus||d.status||'').trim();
  const rental=String(d.rentalStatus||'').trim();
  const model=d.model||d.itemName||d.name||'-';
  const rentalFlow=/เช่า|ยืม|overdue|in[ -]?use/i.test(status+' '+rental);
  const calibrationFlow=/รอสอบเทียบ|recheck|calibration/i.test(status);
  const readyFlow=/พร้อมส่ง|ready|stock/i.test(status);
  const actions=[];
  if(rentalFlow){actions.push(`<button class=\"sc-white-action green\" onclick=\"sc_record('${id}','CHECK-IN');Swal.close()\"><i class=\"fas fa-rotate-left\"></i> รับคืน</button>`);}
  if(calibrationFlow){actions.push(`<button class=\"sc-white-action blue\" onclick=\"sc_record('${id}','CALIBRATION_CONFIRM');Swal.close()\"><i class=\"fas fa-circle-check\"></i> ยืนยันสอบเทียบ</button>`);actions.push(`<button class=\"sc-white-action orange\" onclick=\"sc_record('${id}','PM_CONFIRM');Swal.close()\"><i class=\"fas fa-screwdriver-wrench\"></i> ยืนยัน PM</button>`);}
  if(readyFlow && !rentalFlow && !calibrationFlow){actions.push(`<button class=\"sc-white-action blue\" onclick=\"sc_checkoutPrompt('${id}','${spEsc(d.brand||'')}','${spEsc(model)}','${spEsc(d.sn||d.serialNumber||'')}');\"><i class=\"fas fa-right-from-bracket\"></i> Check-Out</button>`);}
  actions.push(`<button class=\"sc-white-action red\" onclick=\"sc_record('${id}','CANCEL');Swal.close()\"><i class=\"fas fa-xmark\"></i> ยกเลิก</button>`);
  Swal.fire({title:`${id||'-'} · ${spEsc(model)}`,width:'min(620px,94vw)',html:`<div class=\"sc-popup-grid sc-popup-grid-minimal\">${field('Serial ID',d.sn||d.serialNumber)}${field('ID Code',d.idCode||d.id)}${field('Name',model)}${field('Status',status||rental||'-')}</div><div class=\"sc-popup-actions\">${actions.join('')}</div>`,showConfirmButton:false,showCloseButton:true});
}

function sc_field(k,v){return `<div class="sp-field"><div class="k">${spEsc(k)}</div><div class="v">${spEsc(v||'-')}</div></div>`;}
function sc_record(idCode,action,payload={}){
  const p=Object.assign({action,idCode},payload);
  google.script.run.withSuccessHandler(res=>{
    if(res&&res.success){Swal.fire('สำเร็จ',res.message,'success');sc_lookup();sc_loadLogs();}
    else Swal.fire('ไม่สำเร็จ',(res&&res.message)||'Action failed','error');
  }).withFailureHandler(err=>Swal.fire('Error',err.message||String(err),'error')).sc_recordCheckAction(p);
}
function sc_checkoutPrompt(idCode,brand,model,sn){
  Swal.fire({
    title:'Check-Out',
    width:820,
    html:`<div class="sc-checkout-grid-v3029"><label>ผู้ยืม / Borrower *<input id="swBorrower" class="swal2-input" placeholder="Borrower"></label>
          <label>สถานที่ / Location *<input id="swLocation" class="swal2-input" placeholder="Location"></label>
          <label>Borrow Date *<input id="swBorrowDate" class="swal2-input" type="date" value="${new Date().toISOString().slice(0,10)}"></label>
          <label>Expected Return *<input id="swDue" class="swal2-input" type="date"></label>
          <label>รายละเอียดสัญญาเช่า/ระยะ<input id="swContractDetail" class="swal2-input" placeholder="Contract / duration"></label>
          <label>ผู้ประสานงาน<input id="swCoordinator" class="swal2-input" placeholder="Coordinator"></label>
          <label>Email ผู้ประสานงาน<input id="swCoordinatorEmail" class="swal2-input" type="email" placeholder="name@company.com"></label>
          <label>สัญญา CAL,PM<input id="swCalPm" class="swal2-input" placeholder="เช่น CAL1,PM2"></label>
          <label>PLAN CAL,PM<input id="swPlanCalPm" class="swal2-input" placeholder="Month / plan"></label>
          <label>PLAN PM<input id="swPlanPm" class="swal2-input" placeholder="Month / plan"></label>
          <label>AC Plug SN<input id="swAcPlug" class="swal2-input" placeholder="AC Plug serial"></label>
          <label>Clamp SN<input id="swClamp" class="swal2-input" placeholder="Clamp serial"></label>
          <label class="full">หมายเหตุ<input id="swNote" class="swal2-input" placeholder="Recheck note"></label></div>`,
    showCancelButton:true,
    confirmButtonText:'ยืนยัน',
    preConfirm:()=>({borrower:document.getElementById('swBorrower').value,location:document.getElementById('swLocation').value,borrowDate:document.getElementById('swBorrowDate').value,expectedReturnDate:document.getElementById('swDue').value,contractDetail:document.getElementById('swContractDetail').value,coordinator:document.getElementById('swCoordinator').value,coordinatorEmail:document.getElementById('swCoordinatorEmail').value,calPm:document.getElementById('swCalPm').value,planCalPm:document.getElementById('swPlanCalPm').value,planPm:document.getElementById('swPlanPm').value,acPlugSn:document.getElementById('swAcPlug').value,clampSn:document.getElementById('swClamp').value,note:document.getElementById('swNote').value})
  }).then(r=>{
    if(!r.isConfirmed)return;
    const v=r.value;
    if(!v.borrower||!v.location||!v.expectedReturnDate){Swal.fire('ข้อมูลไม่ครบ','','warning');return;}
    sc_record(idCode,'CHECK-OUT',Object.assign(v,{brand,model,serialNumber:sn}));
  });
}
function sc_renderImagePreview_(file,status){
  const box=document.getElementById('scImagePreview'); if(!box)return;
  if(!file){box.classList.add('hidden');box.innerHTML='';return;}
  try{
    const url=URL.createObjectURL(file);
    box.classList.remove('hidden');
    box.innerHTML=`<img src="${url}" alt="CESR / SN label preview" onload="try{URL.revokeObjectURL(this.src)}catch(e){}"><div><b>${spEsc(file.name||'Captured image')}</b><span>${spEsc(status||'กำลังเตรียมอ่านรหัส...')}</span></div>`;
  }catch(e){box.classList.remove('hidden');box.innerHTML=`<div><b>${spEsc(file.name||'Image')}</b><span>${spEsc(status||'กำลังอ่านรหัส...')}</span></div>`;}
}
function sc_setImagePreviewStatus_(status){
  const box=document.getElementById('scImagePreview'); if(!box)return;
  const span=box.querySelector('span'); if(span)span.textContent=String(status||'');
}
function sc_ensureOcrLib_(){
  if(typeof Tesseract!=='undefined')return Promise.resolve(Tesseract);
  const url=(window.CES_LIBS&&window.CES_LIBS.tesseract)||'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
  if(typeof window.CES_loadLib!=='function')return Promise.reject(new Error('OCR library loader is unavailable'));
  return window.CES_loadLib(url).then(function(){if(typeof Tesseract==='undefined')throw new Error('Tesseract.js failed to initialize');return Tesseract;});
}
function sc_ocrImage(input){
  const file=input&&input.files&&input.files[0]; if(!file)return;
  sc_renderImagePreview_(file,'กำลังโหลด OCR...');
  if(window.Swal)Swal.fire({title:'กำลังอ่านป้าย CESR / SN...',allowOutsideClick:false,didOpen:()=>Swal.showLoading()});
  sc_ensureOcrLib_().then(function(lib){
    sc_setImagePreviewStatus_('กำลังอ่านข้อความจากภาพ...');
    return lib.recognize(file,'eng');
  }).then(function(result){
    if(window.Swal)Swal.close();
    const text=result&&result.data?result.data.text:'';
    const code=sc_extractCode(text);
    if(code){
      const keyword=document.getElementById('scKeyword');if(keyword)keyword.value=code;
      sc_setImagePreviewStatus_('พบรหัส '+code+' — กำลังค้นหา...');
      sc_lookup();
    }else{
      sc_setImagePreviewStatus_('ไม่พบ CESR / SN ชัดเจน กรุณาพิมพ์รหัสเอง');
      if(window.Swal)Swal.fire('ไม่พบรหัสในภาพ','ลองถ่ายใหม่ให้ป้ายตรงและชัด หรือพิมพ์ ID / Serial Number ด้านล่าง','warning');
    }
  }).catch(function(err){
    if(window.Swal)Swal.close();
    sc_setImagePreviewStatus_('อ่านภาพไม่สำเร็จ — ยังสามารถพิมพ์รหัสเองได้');
    if(window.Swal)Swal.fire('OCR Error',err&&err.message?err.message:String(err),'error');
  }).finally(function(){try{input.value='';}catch(e){}});
}
function sc_extractCode(text){
  const t=String(text||'').toUpperCase().replace(/\s+/g,' ');
  const ces=t.match(/CESR\s*0*\d{1,6}/);
  if(ces) return ces[0].replace(/\s+/g,'').replace(/CESR0*(\d+)/,(_,n)=>'CESR'+String(n).padStart(5,'0'));
  const sn=t.match(/\b\d{8,14}\b/);
  if(sn) return sn[0];
  return '';
}
function sc_loadLogs(force){
  google.script.run.withSuccessHandler(res=>{
    SC.logs=res&&res.logs?res.logs:[];
    sc_renderLogs();
  }).sc_getScanLogs(50);
}
function sc_renderLogs(){
  const rows=SC.logs||[];
  if(!rows.length){spSetHtml('scLogTable','<div class="sp-muted">No scan logs</div>');return;}
  spSetHtml('scLogTable',`<div class="sp-table-wrap"><table class="sp-table"><thead><tr><th>Time</th><th>Action</th><th>ID</th><th>Result</th><th>Message</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${spEsc(r.timestamp)}</td><td>${spEsc(r.action)}</td><td><b>${spEsc(r.idCode)}</b></td><td>${spEsc(r.result)}</td><td>${spEsc(r.message)}</td></tr>`).join('')}</tbody></table></div>`);
}
function sc_hideWarning(){document.getElementById('scWarning')?.classList.add('hidden');}


/* ============================================================
   CES Stock Pro V15 — Check Stock Accessories Issue UI
============================================================ */
SC.accessories = SC.accessories || [];
SC.accFiltered = SC.accFiltered || [];

if(typeof window.scOriginalInitBeforeAccessory === 'undefined'){
  window.scOriginalInitBeforeAccessory = initStockCheckModule;
  initStockCheckModule = function(force=false){ window.scOriginalInitBeforeAccessory(force); setTimeout(()=>sc_loadAccessoryOptions(force),250); };
}

function sc_currentRequester_(){
  const u=(typeof currentUser!=='undefined'&&currentUser)?currentUser:{};
  return {id:u.id||'',name:u.name_eng||u.name_th||u.id||'',email:u.email||'',team:u.team||''};
}

function sc_loadAccessoryOptions(force=false){
  google.script.run.withSuccessHandler(res=>{
    if(!res||!res.success)return;
    SC.accessories=res.data||[]; SC.accFiltered=SC.accessories;
    const teams=[...new Set(SC.accessories.map(a=>a.team).filter(Boolean))].sort();
    const teamEl=document.getElementById('scAccTeam'); if(teamEl) teamEl.innerHTML='<option value="all">All Team</option>'+teams.map(t=>`<option value="${spEsc(t)}">${spEsc(t)}</option>`).join('');
    sc_filterAccessoryOptions();
  }).withFailureHandler(err=>console.warn('Accessory options error',err)).sc_getAccessoryLookupOptions();
}

function sc_filterAccessoryOptions(){
  const q=spVal('scAccSearch','').toLowerCase(), team=spVal('scAccTeam','all');
  SC.accFiltered=(SC.accessories||[]).filter(a=>{const text=[a.accessoryId,a.itemName,a.team,a.status,a.actionRequired].join(' ').toLowerCase(); if(q&&!text.includes(q))return false; if(team!=='all'&&a.team!==team)return false; return true;});
  const sel=document.getElementById('scAccSelect'); if(sel){sel.innerHTML='<option value="">เลือกอุปกรณ์</option>'+SC.accFiltered.map((a,i)=>`<option value="${i}">${spEsc(a.itemName)} (${spEsc(a.team)}) — ${spNum(a.stockQty)} pcs</option>`).join('');}
  sc_previewSelectedAccessory();
}
function sc_previewSelectedAccessory(){
  const i=Number(spVal('scAccSelect','-1')); const a=SC.accFiltered[i];
  if(!a){spSetHtml('scAccPreview','<div class="sp-muted">เลือก accessories เพื่อดูจำนวนคงเหลือ</div>');return;}
  spSetHtml('scAccPreview',`<div class="sp-field"><div class="k">${spEsc(a.team)} • ${spEsc(a.accessoryId)}</div><div class="v">${spEsc(a.itemName)} — คงเหลือ ${spNum(a.stockQty)} / Min ${spNum(a.minStockQty)}</div><div style="margin-top:8px"><input id="scAccQty" type="number" min="1" step="1" value="1" class="stockpro-control" style="max-width:140px;display:inline-block"> <input id="scAccBorrower" class="stockpro-control" style="max-width:240px;display:inline-block" placeholder="ผู้เบิก / requester"> <input id="scAccLocation" class="stockpro-control" style="max-width:240px;display:inline-block" placeholder="แผนก / location"></div></div>`);
}
function sc_issueSelectedAccessory(){
  const i=Number(spVal('scAccSelect','-1')); const a=SC.accFiltered[i]; if(!a){Swal.fire('กรุณาเลือก accessories','','info');return;}
  const qty=Math.max(1,Number(spVal('scAccQty','1'))||1); const stock=Number(a.stockQty||0), min=Number(a.minStockQty||0);
  if(stock<=min){Swal.fire('ต้อง Restock ก่อนเบิกใช้',`คงเหลือ ${stock} / Min ${min}`,'warning');return;}
  if(qty>stock){Swal.fire('จำนวนเกิน stock',`คงเหลือ ${stock}`,'warning');return;}
  const requester=sc_currentRequester_(); const borrower=spVal('scAccBorrower','').trim()||requester.name||'Accessory Issue'; const location=spVal('scAccLocation','').trim()||requester.team||'Issue';
  Swal.fire({title:'ส่งขออนุมัติเบิก...',allowOutsideClick:false,didOpen:()=>Swal.showLoading()});
  google.script.run.withSuccessHandler(res=>{if(res&&res.success){Swal.fire('ส่งขออนุมัติแล้ว',res.message,'success');sc_loadAccessoryOptions(true);sc_loadLogs();}else Swal.fire('ไม่สำเร็จ',(res&&res.message)||'Request failed','error');}).withFailureHandler(err=>Swal.fire('Error',err.message||String(err),'error')).sc_requestAccessoryIssue({accessory:a,qty,borrower,location,requester,note:'Issue from Check Stock'});
}




/* V16 — Check Stock accessory issue UX polish */
if(typeof window.scOriginalIssueSelectedAccessory==='undefined' && typeof sc_issueSelectedAccessory==='function'){
  window.scOriginalIssueSelectedAccessory=sc_issueSelectedAccessory;
  sc_issueSelectedAccessory=function(){
    Swal.fire({title:'Sending approval request...',allowOutsideClick:false,didOpen:()=>Swal.showLoading()});
    try { window.scOriginalIssueSelectedAccessory(); } finally { setTimeout(()=>{try{Swal.close();}catch(e){}},1200); }
  };
}

(function(){if(document.getElementById('sc-popup-style-current'))return;var st=document.createElement('style');st.id='sc-popup-style-current';st.textContent='#view-check_stock .sc-result-compact{transition:.15s}#view-check_stock .sc-result-compact:hover{transform:translateY(-1px);box-shadow:0 10px 24px rgba(15,23,42,.08)}.sc-popup-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;text-align:left;max-height:48vh;overflow:auto;padding:2px}.sc-popup-grid-minimal .sc-popup-field{min-height:54px}.sc-popup-field{border:1px solid #dbe5f0;background:#f8fbff;border-radius:10px;padding:8px 10px}.sc-popup-field span{display:block;font-size:9px;color:#64748b;font-weight:800}.sc-popup-field b{display:block;margin-top:2px;font-size:11px;color:#0f172a;word-break:break-word}.sc-popup-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:14px}.sc-white-action{border:0;border-radius:10px;padding:9px 12px;font-weight:900;color:#fff!important;cursor:pointer}.sc-white-action.green{background:#059669}.sc-white-action.blue{background:#2563eb}.sc-white-action.orange{background:#d97706}.sc-white-action.red{background:#dc2626}@media(max-width:600px){.sc-popup-grid{grid-template-columns:1fr}.sc-popup-actions{display:grid;grid-template-columns:1fr 1fr}.sc-white-action{width:100%;font-size:11px}}';document.head.appendChild(st)})();
