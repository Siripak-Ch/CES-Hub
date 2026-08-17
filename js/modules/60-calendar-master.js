// ============================================================
// 60-calendar-master.js
// Extracted from original index.html. Keep load order from index.html.
// ============================================================

// ==========================================
    // ส่วนที่ 1: ฟังก์ชันเดิม (Global & Calendar UI)
    // ==========================================
    let currentDisplayDate = new Date();
    let currentService = 'ALL';
    let calendarCapacityDetailV38 = {};
    let calendarCapacityMetaV38 = {};
    let calendarFullInstanceV40 = null;
    
    const CAL_MAP = {
        'ALL': "https://calendar.google.com/calendar/embed?height=600&wkst=1&bgcolor=%23ffffff&ctz=Asia%2FBangkok&showTitle=0&showNav=0&showDate=1&showPrint=0&showTabs=0&showCalendars=0&showTz=1" +
               "&src=cescalmedteam%40gmail.com&color=%23004aad" + 
               "&src=nhealthcallab%40gmail.com&color=%2319a7ce" + 
               "&src=natkanok.8942%40gmail.com&color=%230fc1a1" +
               "&src=chiraphat.env%40gmail.com&color=%237ed957" +
               "&src=technicalsupport.tes%40gmail.com&color=%23ffde59" +
               "&src=cesmanagement2026%40gmail.com&color=%23b4b4b4", 
        'MED': "https://calendar.google.com/calendar/embed?showTitle=0&showNav=0&src=cescalmedteam%40gmail.com&ctz=Asia%2FBangkok&color=%23004aad",
        'LAB': "https://calendar.google.com/calendar/embed?showTitle=0&showNav=0&src=nhealthcallab%40gmail.com&ctz=Asia%2FBangkok&color=%2319a7ce",
        'EHS': "https://calendar.google.com/calendar/embed?showTitle=0&showNav=0&src=natkanok.8942%40gmail.com&ctz=Asia%2FBangkok&color=%230fc1a1",
        'ENV': "https://calendar.google.com/calendar/embed?showTitle=0&showNav=0&src=chiraphat.env%40gmail.com&ctz=Asia%2FBangkok&color=%237ed957",
        'TES': "https://calendar.google.com/calendar/embed?showTitle=0&showNav=0&src=technicalsupport.tes%40gmail.com&ctz=Asia%2FBangkok&color=%23ffde59",
        'MGT': "https://calendar.google.com/calendar/embed?src=cesmanagement2026%40gmail.com&ctz=Asia%2FBangkok"
    };

    function calendarEmbedUrlV41_(service) {
        const cfg=(typeof globalConfig!=='undefined'&&globalConfig)||{};
        const ids={MED:cfg.CAL_ID_MED||'cescalmedteam@gmail.com',LAB:cfg.CAL_ID_LAB||'nhealthcallab@gmail.com',EHS:cfg.CAL_ID_EHS||'natkanok.8942@gmail.com',ENV:cfg.CAL_ID_ENV||'chiraphat.env@gmail.com',TES:cfg.CAL_ID_TES||'technicalsupport.tes@gmail.com',MGT:cfg.CAL_ID_MNG||'cesmanagement2026@gmail.com'};
        const teams=service==='ALL'?['MED','LAB','EHS','ENV','TES','MGT']:[service];
        let url='https://calendar.google.com/calendar/embed?height=600&wkst=1&bgcolor=%23ffffff&ctz=Asia%2FBangkok&showTitle=0&showNav=0&showDate=1&showPrint=0&showTabs=0&showCalendars=0&showTz=1';
        teams.forEach(team=>{ if(!ids[team])return; const color=calendarTeamStyleV41_(team).color; url+='&src='+encodeURIComponent(ids[team])+'&color='+encodeURIComponent(color); });
        return url;
    }

    function initCalendar(calData) {
        if (calData) window.globalCalData = calData;
        initCalendarFilters();
        updateCalendarUI();
    }

    function initCalendarFilters() {
        const monthSelect = document.getElementById('cal-filter-month');
        const yearSelect = document.getElementById('cal-filter-year');
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        if(monthSelect) {
            monthSelect.innerHTML = "";
            monthNames.forEach((m, index) => {
                let option = document.createElement("option");
                option.value = index; option.text = m;
                monthSelect.appendChild(option);
            });
        }
        if(yearSelect) {
            yearSelect.innerHTML = "";
            const currentYear = new Date().getFullYear();
            for(let y = currentYear - 2; y <= currentYear + 5; y++) {
                let option = document.createElement("option");
                option.value = y; option.text = y;
                yearSelect.appendChild(option);
            }
        }
    }

    function jumpToDateFromFilter() {
        const m = parseInt(document.getElementById('cal-filter-month').value);
        const y = parseInt(document.getElementById('cal-filter-year').value);
        currentDisplayDate.setMonth(m);
        currentDisplayDate.setFullYear(y);
        updateCalendarUI();
    }

    function changeCalendarMonth(offset) {
        currentDisplayDate.setMonth(currentDisplayDate.getMonth() + offset);
        updateCalendarUI();
    }


    function calendarTeamStyleV41_(team) {
        const normalized = calendarNormalizeTeamV34(team);
        if (typeof window.cesGetTeamStyle === 'function') return window.cesGetTeamStyle(normalized === 'MGT' ? 'MNG' : normalized);
        const defaults = {MED:'#004aad',LAB:'#19a7ce',EHS:'#0fc1a1',ENV:'#7ed957',TES:'#ffde59',MGT:'#b4b4b4'};
        const color = defaults[normalized] || '#64748b';
        return {color,soft:'#f8fafc',border:color,text:(normalized==='MED'?'#ffffff':'#17324d')};
    }

    function calendarGoogleEventUrlV41_(eventId, calendarId) {
        const id = String(eventId || '').trim(), cal = String(calendarId || '').trim();
        if (!id || !cal) return '';
        try {
            const encoded = btoa(id + ' ' + cal).replace(/=+$/,'');
            return 'https://calendar.google.com/calendar/event?eid=' + encodeURIComponent(encoded);
        } catch (ignore) { return ''; }
    }


    function calendarGoogleCreateUrlV42_(title,startDate,endDate,location) {
        const start=String(startDate||'').replace(/-/g,'');
        const endExclusive=String(calendarAddDaysIsoV40_(endDate||startDate,1)||'').replace(/-/g,'');
        if(!start||!endExclusive)return '';
        return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text='+encodeURIComponent(title||'CES Hub Job')+'&dates='+start+'/'+endExclusive+'&location='+encodeURIComponent(location||'');
    }

    function calendarShowEventPopupV42_(event) {
        const p=event.extendedProps||{};
        const start=p.firstDate||event.startStr||'';
        const end=p.lastDate||start;
        const dateText=start===end?start:`${start} – ${end}`;
        const style=calendarTeamStyleV41_(p.team||'');
        const googleUrl=p.googleUrl||calendarGoogleEventUrlV41_(p.eventId,p.calendarId);
        const copyUrl=calendarGoogleCreateUrlV42_(event.title,start,end,p.location||'');
        const buttons=[
          googleUrl?`<a href="${calendarEscV37_(googleUrl)}" target="_blank" rel="noopener" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black text-[#003DA5] hover:bg-blue-50"><i class="far fa-external-link"></i>More details</a>`:'',
          copyUrl?`<a href="${calendarEscV37_(copyUrl)}" target="_blank" rel="noopener" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black text-[#003DA5] hover:bg-blue-50"><i class="fas fa-plus"></i>Copy to my calendar</a>`:''
        ].filter(Boolean).join('');
        Swal.fire({
          html:`<div class="text-left p-1"><div class="flex items-start gap-4"><span class="mt-1.5 w-4 h-4 rounded shrink-0" style="background:${style.color}"></span><div class="min-w-0"><div class="text-2xl font-medium text-slate-800 leading-snug">${calendarEscV37_(event.title)}</div><div class="text-sm text-slate-600 mt-2">${calendarEscV37_(dateText)}</div>${p.location?`<div class="text-sm text-slate-600 mt-4 flex gap-3"><i class="fas fa-location-dot mt-1 text-slate-400"></i><span>${calendarEscV37_(p.location)}</span></div>`:''}<div class="text-xs font-black mt-3" style="color:${style.color}">${calendarEscV37_(p.team||'')}</div></div></div><div class="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-2">${buttons||'<span class="text-sm text-slate-400">Google Calendar link is unavailable for this event.</span>'}</div></div>`,
          width:560,showConfirmButton:false,showCloseButton:true,customClass:{popup:'rounded-[1.5rem]'}
        });
    }

    function calendarDateIsoV40_(value) {
        const parts = String(value || '').trim().split('/');
        if (parts.length !== 3) return '';
        return `${parts[2]}-${String(parts[1]).padStart(2,'0')}-${String(parts[0]).padStart(2,'0')}`;
    }

    function calendarAddDaysIsoV40_(iso, days) {
        const d = new Date(`${iso}T00:00:00`);
        if (Number.isNaN(d.getTime())) return iso;
        d.setDate(d.getDate() + Number(days || 0));
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }

    function calendarEventBaseV40_(uniqueKey) {
        return String(uniqueKey || '').replace(/_\d{8}_[A-Z]+_.+$/, '') || String(uniqueKey || '');
    }

    function buildSolidCalendarEventsV40_(data) {
        const groups = new Map();
        (Array.isArray(data) ? data : []).forEach(item => {
            const team = calendarSourceTeamV39(item);
            if (currentService !== 'ALL' && team !== currentService) return;
            const iso = calendarDateIsoV40_(item.date);
            if (!iso || !String(item.title || '').trim()) return;
            const base = calendarEventBaseV40_(item.uniqueKey) || `${team}|${item.title}|${item.location || ''}`;
            const key = [team, base, item.title, item.location || ''].join('|');
            if (!groups.has(key)) groups.set(key, { team, title:String(item.title || '').trim(), location:String(item.location || '').trim(), dates:[], uniqueKey:item.uniqueKey || key, calendarId:String(item.calendarId || ''), eventId:calendarEventBaseV40_(item.uniqueKey) });
            groups.get(key).dates.push(iso);
        });

        const events = [];
        groups.forEach(group => {
            const dates = Array.from(new Set(group.dates)).sort();
            if (!dates.length) return;
            let segmentStart = dates[0], previous = dates[0], segmentNo = 0;
            const pushSegment = endDate => {
                const style = calendarTeamStyleV41_(group.team);
                const endExclusive = calendarAddDaysIsoV40_(endDate, 1);
                events.push({
                    id:`${group.uniqueKey}-${segmentNo++}`,
                    title:group.title,
                    start:segmentStart,
                    end:endExclusive,
                    allDay:true,
                    display:'block',
                    backgroundColor:style.color,
                    borderColor:style.color,
                    textColor:style.text,
                    extendedProps:{ team:group.team, location:group.location, firstDate:segmentStart, lastDate:endDate, calendarId:group.calendarId, eventId:group.eventId, googleUrl:calendarGoogleEventUrlV41_(group.eventId, group.calendarId) }
                });
            };
            for (let i=1;i<dates.length;i++) {
                if (dates[i] === calendarAddDaysIsoV40_(previous, 1)) {
                    previous = dates[i];
                } else {
                    pushSegment(previous);
                    segmentStart = previous = dates[i];
                }
            }
            pushSegment(previous);
        });
        return events;
    }

    function renderSolidCalendarV40_(year, month) {
        const host = document.getElementById('calendar-fullcalendar-v40');
        const iframe = document.getElementById('calendar-iframe');
        if (calendarFullInstanceV40) {
            try { calendarFullInstanceV40.destroy(); } catch (ignore) {}
            calendarFullInstanceV40 = null;
        }
        if (host) host.classList.add('hidden');
        if (!iframe) return;
        iframe.classList.remove('hidden');
        const lastDay = new Date(Number(year), Number(month), 0).getDate();
        const ym = `${year}${String(month).padStart(2,'0')}`;
        const startDate = `${ym}01`;
        const endDate = `${ym}${String(lastDay).padStart(2,'0')}`;
        const nextUrl = calendarEmbedUrlV41_(currentService) + `&mode=MONTH&dates=${startDate}/${endDate}`;
        if (iframe.dataset.cesCalendarUrl !== nextUrl) {
            iframe.dataset.cesCalendarUrl = nextUrl;
            iframe.src = nextUrl;
        }
    }

    function updateCalendarUI() {
        const year = currentDisplayDate.getFullYear();
        const month = currentDisplayDate.getMonth() + 1; 
        const monthIndex = currentDisplayDate.getMonth();
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        
        const titleEl = document.getElementById('calendar-dynamic-title');
        // เปลี่ยนสีตัวอักษรของเดือนให้เป็นโทนส้ม
        if(titleEl) titleEl.innerHTML = `<span class="text-[#003DA5]">${monthNames[monthIndex]}</span> <span class="text-gray-400 font-light">|</span> ${year}`;

        const mSel = document.getElementById('cal-filter-month');
        const ySel = document.getElementById('cal-filter-year');
        if(mSel) mSel.value = monthIndex;
        if(ySel) ySel.value = year;

        renderSolidCalendarV40_(year, month);

        if (window.globalCalData) {
            processCalendarData(window.globalCalData, month, year);
        }
    }

    function changeService(service) {
        currentService = service;
        ['all', 'med', 'lab', 'ehs', 'env', 'tes', 'mgt'].forEach(id => {
            const btn = document.getElementById('btn-cal-' + id);
            if (btn) {
                if (id === service.toLowerCase()) {
                    // ปรับสีให้เป็นส้มเมื่อคลิก (Active State)
                    btn.className = "px-3 py-1 text-xs font-bold rounded bg-[#003DA5]/10 text-[#003DA5] shadow-sm ring-1 ring-[#003DA5] transition-all";
                } else {
                    // ปรับสีปุ่มปกติ (Hover เป็นสีส้มเข้ม)
                    btn.className = "px-3 py-1 text-xs font-bold rounded hover:bg-[#003DA5] hover:text-white transition-all text-gray-500";
                }
            }
        });
        updateCalendarUI();
    }

    // ==========================================
    // ส่วนที่ 2: ฟังก์ชันเดิม (จัดการ Job, Leave, KPI และ Capacity)
    // ==========================================
    function checkIsLeaveEvent(title) {
        if (!title) return false;
        const titleLower = title.toLowerCase();
        const engLeaveRegex = /\b(leave|day off|dayoff|off|vacation|sick|personal|annual)\b/;
        const exactThaiLeaves = ['ลากิจ', 'ลาป่วย', 'ลาพักร้อน', 'ลาพักผ่อน', 'ลาคลอด', 'ลาบวช', 'ลาชดเชย', 'วันหยุด', 'เทศกาล'];

        if (engLeaveRegex.test(titleLower)) return true;
        for (let w of exactThaiLeaves) {
            if (titleLower.includes(w)) return true;
        }

        const checkShortWords = ['ลา', 'หยุด', 'ป่วย'];
        for (let w of checkShortWords) {
            if (titleLower.includes(w)) {
                if (w === 'ลา' && (
                    titleLower.includes('เวลา') || titleLower.includes('ตลาด') || 
                    titleLower.includes('กีฬา') || titleLower.includes('ตุลา') ||
                    titleLower.includes('สงขลา') || titleLower.includes('ลานสกา') ||
                    titleLower.includes('ศาลา') || titleLower.includes('ลาด') ||
                    titleLower.includes('พลาสติก') || titleLower.includes('คลาส') ||
                    titleLower.includes('พารามิเตอร์') || titleLower.includes('พาลามิเตอร์')
                )) continue;
                if (w === 'ป่วย' && titleLower.includes('ผู้ป่วย')) continue;

                return true; 
            }
        }
        return false;
    }

    function calendarNormalizeTeamV34(team) {
        const value = String(team || '').trim().toUpperCase();
        if (value === 'MNG' || value === 'MANAGEMENT') return 'MGT';
        return value;
    }

    function calendarSourceTeamV39(item) {
        const calendarId = String((item && item.calendarId) || '').trim().toLowerCase();
        if (calendarId === 'chiraphat.env@gmail.com') return 'ENV';
        if (calendarId === 'natkanok.8942@gmail.com') return 'EHS';
        if (calendarId === 'cescalmedteam@gmail.com') return 'MED';
        if (calendarId === 'nhealthcallab@gmail.com') return 'LAB';
        if (calendarId === 'technicalsupport.tes@gmail.com') return 'TES';
        if (calendarId === 'cesmanagement2026@gmail.com') return 'MGT';
        return calendarNormalizeTeamV34(item && item.team);
    }

    function calendarServiceMatchesV34(team) {
        const normalized = calendarNormalizeTeamV34(team);
        return currentService === 'ALL' || normalized === currentService;
    }

    function calendarCapacityTeamV39(item, sourceTeam) {
        return calendarNormalizeTeamV34(sourceTeam || calendarSourceTeamV39(item));
    }
    function calendarCapacityTeamV37(item, sourceTeam) {
        return calendarCapacityTeamV39(item, sourceTeam);
    }

    function processCalendarData(data, targetM, targetY) {
        const teamNames = ['MED', 'LAB', 'EHS', 'ENV', 'TES', 'MGT'];
        const capacityTeams = ['MED', 'LAB', 'EHS', 'ENV', 'TES'];
        let teamJobUniqueSet = {};
        let teamManDays = {};
        let capacityDetails = {};
        teamNames.forEach(team => { teamJobUniqueSet[team] = new Set(); teamManDays[team] = 0; });
        capacityTeams.forEach(team => { capacityDetails[team] = []; });
        let jobListForTable = [];
        let leaveListForTable = [];

        (data || []).forEach(item => {
            const itemM = parseInt(item.month);
            const itemY = parseInt(item.year);
            if (itemM !== targetM || itemY !== targetY) return;

            const title = (item.title || '').trim();
            const sourceTeam = calendarSourceTeamV39(item);
            const capacityTeam = calendarCapacityTeamV39(item, sourceTeam);
            const dParts = String(item.date || '').split('/');
            const dObj = dParts.length === 3 ? new Date(dParts[2], dParts[1] - 1, dParts[0]) : new Date(0);
            const dayOfWeek = dObj.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            // Calendar/source data stays unchanged. displayTeam is only a UI label.
            const displayTeam = sourceTeam;
            const normalizedItem = Object.assign({}, item, { team: sourceTeam, capacityTeam, displayTeam });

            if (checkIsLeaveEvent(title)) {
                if (calendarServiceMatchesV34(sourceTeam)) leaveListForTable.push(normalizedItem);
                return;
            }
            if (!title) return;

            if (!(sourceTeam === 'MED' && isWeekend) && teamManDays[capacityTeam] !== undefined) {
                teamManDays[capacityTeam]++;
                if (capacityDetails[capacityTeam]) capacityDetails[capacityTeam].push(normalizedItem);
            }
            if (item.uniqueKey && teamJobUniqueSet[sourceTeam]) teamJobUniqueSet[sourceTeam].add(item.uniqueKey);
            if (calendarServiceMatchesV34(sourceTeam)) jobListForTable.push(normalizedItem);
        });

        calendarCapacityDetailV38 = capacityDetails;
        window.calendarCapacityDetailV38 = capacityDetails;
        calendarCapacityMetaV38 = { month:targetM, year:targetY, weekdays:getWeekdaysInMonth(targetM,targetY), manDays:teamManDays };

        const totalUnique = ['MED','LAB','EHS','ENV','TES'].reduce((total, team) => total + teamJobUniqueSet[team].size, 0);
        const values = { total:totalUnique, med:teamJobUniqueSet.MED.size, lab:teamJobUniqueSet.LAB.size, ehs:teamJobUniqueSet.EHS.size, env:teamJobUniqueSet.ENV.size, tes:teamJobUniqueSet.TES.size };
        Object.keys(values).forEach(key => { const el = document.getElementById('stat-' + key); if (el) el.innerText = values[key]; });

        const weekdays = calendarCapacityMetaV38.weekdays;
        const days = document.getElementById('capacity-days-display');
        if (days) days.innerText = `${weekdays} Weekdays`;
        renderCapacityBars(teamManDays, weekdays);
        renderJobTable(jobListForTable);
        renderLeaveList(leaveListForTable);
    }

    function calendarCapacityConfigV38_(manDays, weekdays) {
        const cfg = (typeof globalConfig !== 'undefined' && globalConfig) ? globalConfig : {};
        const number = (value, fallback) => { const parsed = Number(value); return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback; };
        return [
            { name:'MED', val:number(manDays.MED,0), limit:number(cfg.CAPACITY_MED || cfg.MED,12) },
            { name:'LAB', val:number(manDays.LAB,0), limit:number(cfg.CAPACITY_LAB || cfg.LAB,3) },
            { name:'EHS', val:number(manDays.EHS,0), limit:number(cfg.CAPACITY_EHS || cfg.EHS,3) },
            { name:'ENV', val:number(manDays.ENV,0), limit:number(cfg.CAPACITY_ENV || cfg.ENV,3) },
            { name:'TES', val:number(manDays.TES,0), limit:number(cfg.CAPACITY_TES || cfg.TES,4) }
        ].map(team => {
            team.target = weekdays * team.limit;
            team.pct = team.target > 0 ? Math.round((team.val / team.target) * 100) : 0;
            team.over = team.pct > 100;
            return team;
        });
    }

    function renderCapacityBars(manDays, weekdays) {
        const container = document.getElementById('capacity-dashboard-grid');
        if (!container) return;
        const teams = calendarCapacityConfigV38_(manDays, weekdays);
        container.innerHTML = teams.map(team => {
            const width = Math.min(100, Math.max(0, team.pct));
            const teamStyleV185 = calendarTeamStyleV41_(team.name);
            const tone = team.over ? '#E4002B' : teamStyleV185.color;
            const softTone = team.over ? '#FFF1F2' : (teamStyleV185.soft || '#f8fafc');
            return `<button type="button" class="ces-capacity-card ces-capacity-card-v38 ces-capacity-team-${team.name.toLowerCase()}" style="--team-color:${tone};--team-soft:${softTone}" onclick="openCapacityDetailV38('${team.name}')" aria-label="Open ${team.name} capacity details">
                <div class="flex justify-between items-center gap-2 mb-1.5">
                    <div class="min-w-0 text-left"><span class="ces-capacity-team">${team.name}</span><span class="ces-capacity-limit">${team.limit}/day</span></div>
                    <div class="flex items-center shrink-0"><span class="ces-capacity-pct" style="color:${tone}">${team.pct}%</span>${team.over ? '<i class="fas fa-triangle-exclamation text-[#E4002B] ml-1 text-[10px]"></i>' : ''}</div>
                </div>
                <div class="ces-capacity-track"><div class="ces-capacity-fill" style="width:${width}%;background:${tone}"></div></div>
                <div class="ces-capacity-footer"><span>Actual <b>${team.val}</b></span><span>Cap. <b>${team.target}</b></span></div>
                <div class="ces-capacity-open-hint"><i class="fas fa-up-right-from-square"></i> Detail</div>
            </button>`;
        }).join('');
    }

    function openCapacityDetailV38(team) {
        team = String(team || '').toUpperCase();
        const items = (calendarCapacityDetailV38[team] || []).slice().sort((a,b) => {
            const da = new Date(String(a.date || '').split('/').reverse().join('-'));
            const db = new Date(String(b.date || '').split('/').reverse().join('-'));
            return da - db || String(a.title || '').localeCompare(String(b.title || ''));
        });
        const meta = calendarCapacityMetaV38 || {};
        const cfg = calendarCapacityConfigV38_(meta.manDays || {}, meta.weekdays || 0).find(x => x.name === team) || {val:0,target:0,pct:0,limit:0,over:false};
        const tone = cfg.over ? '#E4002B' : '#003DA5';
        const rows = items.length ? items.map((item,index) => `<tr class="border-b border-slate-100 hover:bg-blue-50/50">
            <td class="p-2.5 text-slate-400 font-bold">${index+1}</td>
            <td class="p-2.5 whitespace-nowrap font-bold text-slate-700">${calendarEscV37_(item.date || '-')}</td>
            <td class="p-2.5"><div class="font-bold text-slate-800">${calendarEscV37_(item.title || '-')}</div><div class="text-[10px] text-slate-400 mt-0.5">${calendarEscV37_(item.location || '-')}</div></td>
            <td class="p-2.5"><span class="inline-flex px-2 py-1 rounded-lg bg-blue-50 text-[#003DA5] border border-blue-100 text-[10px] font-black">${calendarEscV37_(item.capacityTeam || team)}</span></td>
        </tr>`).join('') : '<tr><td colspan="4" class="p-10 text-center text-slate-400">No capacity jobs in this month.</td></tr>';
        Swal.fire({
            title:`<div class="text-left"><div class="text-xl font-black text-[#003DA5]">${calendarEscV37_(team)} Capacity Detail</div><div class="text-xs text-slate-400 mt-1">${calendarEscV37_(String(meta.month || ''))}/${calendarEscV37_(String(meta.year || ''))}</div></div>`,
            html:`<div class="text-left"><div class="grid grid-cols-3 gap-2 mb-4"><div class="rounded-xl bg-blue-50 border border-blue-100 p-3"><div class="text-[10px] text-slate-400 font-black">ACTUAL</div><div class="text-xl font-black text-[#003DA5]">${cfg.val} MD</div></div><div class="rounded-xl bg-slate-50 border border-slate-200 p-3"><div class="text-[10px] text-slate-400 font-black">CAPACITY</div><div class="text-xl font-black text-slate-700">${cfg.target} MD</div></div><div class="rounded-xl border p-3" style="background:${cfg.over?'#FEF2F2':'#EFF6FF'};border-color:${cfg.over?'#FCA5A5':'#BFDBFE'}"><div class="text-[10px] text-slate-400 font-black">UTILIZATION</div><div class="text-xl font-black" style="color:${tone}">${cfg.pct}%</div></div></div><div class="max-h-[520px] overflow-auto rounded-xl border border-slate-200"><table class="w-full text-xs"><thead class="sticky top-0 bg-slate-50 text-slate-500 uppercase"><tr><th class="p-2.5">#</th><th class="p-2.5">Date</th><th class="p-2.5">Job / Location</th><th class="p-2.5">Label</th></tr></thead><tbody>${rows}</tbody></table></div></div>`,
            width:850, showConfirmButton:false, showCloseButton:true, customClass:{popup:'rounded-[1.75rem]'}
        });
    }
    window.openCapacityDetailV38 = openCapacityDetailV38;

    function getWeekdaysInMonth(month, year) {
        let count = 0;
        const daysInMonth = new Date(year, month, 0).getDate();
        for(let d=1; d<=daysInMonth; d++) {
            const dayOfWeek = new Date(year, month-1, d).getDay();
            if(dayOfWeek !== 0 && dayOfWeek !== 6) count++; 
        }
        return count;
    }

    function renderJobTable(list) {
        const tbody = document.getElementById('table-job-list');
        if (!tbody) return;
        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="text-center py-10 text-gray-400 italic bg-gray-50/50">No jobs found for this period.</td></tr>`;
            return;
        }
        list.sort((a, b) => {
            const dateA = new Date(a.date.split('/').reverse().join('-'));
            const dateB = new Date(b.date.split('/').reverse().join('-'));
            if (dateA - dateB !== 0) return dateA - dateB;
            return a.title.localeCompare(b.title);
        });
        let html = '';
        list.forEach(item => {
            const jobTeam = item.displayTeam || item.capacityTeam || item.team;
            const teamStyle = calendarTeamStyleV41_(jobTeam);
            html += `
                <tr class="bg-white border-b hover:bg-[#003DA5]/50 transition-colors group">
                    <td class="px-4 py-3 font-medium text-gray-500 whitespace-nowrap align-top text-xs w-24">
                        ${item.date}
                    </td>
                    <td class="px-4 py-3 align-top w-20">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold border uppercase" style="color:${teamStyle.color};background:${teamStyle.soft};border-color:${teamStyle.border}">
                            ${jobTeam}
                        </span>
                    </td>
                    <td class="px-4 py-3 align-top">
                        <div class="font-bold text-gray-800 text-sm mb-0.5 group-hover:text-[#003DA5] transition-colors">${item.title}</div>
                        <div class="text-[10px] text-gray-400 flex items-center gap-1">
                            <i class="fas fa-map-marker-alt text-gray-300"></i> ${item.location || '-'}
                        </div>
                    </td>
                </tr>`;
        });
        tbody.innerHTML = html;
    }

    function renderLeaveList(list) {
        const ul = document.getElementById('list-leave');
        if (!ul) return;
        if (list.length === 0) {
            ul.innerHTML = `<li class="text-center text-sm text-gray-400 py-10 italic bg-white/50 rounded-xl border border-dashed border-gray-200">No leave records.</li>`;
            return;
        }
        list.sort((a, b) => {
            const dateA = new Date(a.date.split('/').reverse().join('-'));
            const dateB = new Date(b.date.split('/').reverse().join('-'));
            return dateA - dateB;
        });
        let html = '';
        list.forEach(item => {
            const jobTeam = item.displayTeam || item.capacityTeam || item.team;
            const teamStyle = calendarTeamStyleV41_(jobTeam);
            html += `
                <li class="bg-white p-3 rounded-xl border border-red-50 shadow-sm flex flex-col hover:shadow-md transition-all group cursor-default">
                    <div class="flex justify-between items-center w-full mb-1">
                        <span class="text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider" style="color:${teamStyle.color};background:${teamStyle.soft};border:1px solid ${teamStyle.border}">${jobTeam}</span>
                        <span class="text-xs text-gray-400 font-medium font-mono">${item.date}</span>
                    </div>
                    <p class="text-xs font-bold text-gray-700 group-hover:text-red-600 transition-colors line-clamp-2">${item.title}</p>
                </li>`;
        });
        ul.innerHTML = html;
    }

    // ฟังก์ชัน Export ข้อมูล Master Calendar
    function exportMasterCalendarToCSV() {
        if (!window.globalCalData || window.globalCalData.length === 0) {
            Swal.fire('No Data', 'ไม่มีข้อมูลสำหรับ Export', 'info');
            return;
        }

        const targetM = currentDisplayDate.getMonth() + 1;
        const targetY = currentDisplayDate.getFullYear();

        let filteredData = window.globalCalData.filter(item => {
            const itemM = parseInt(item.month);
            const itemY = parseInt(item.year);
            if (itemM !== targetM || itemY !== targetY) return false;
            if (currentService !== 'ALL' && calendarSourceTeamV39(item) !== currentService) return false;
            return true;
        });

        if (filteredData.length === 0) {
            Swal.fire('No Data', `ไม่มีข้อมูลในเดือน ${targetM}/${targetY} สำหรับทีมที่เลือก`, 'info');
            return;
        }

        let csvContent = "\uFEFF"; 
        csvContent += "Date,Team,Type,Activity Title,Location\n";

        filteredData.sort((a, b) => {
            const dateA = new Date(a.date.split('/').reverse().join('-'));
            const dateB = new Date(b.date.split('/').reverse().join('-'));
            return dateA - dateB;
        }).forEach(item => {
            const isLeave = checkIsLeaveEvent(item.title);
            const type = isLeave ? "Leave/Off" : "Job";
            let safeTitle = `"${(item.title || "").replace(/"/g, '""')}"`;
            let safeLocation = `"${(item.location || "-").replace(/"/g, '""')}"`;
            csvContent += `${item.date},${calendarSourceTeamV39(item)},${type},${safeTitle},${safeLocation}\n`;
        });

        let blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        let link = document.createElement("a");
        let url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `MasterCalendar_${currentService}_${targetM}_${targetY}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }


    // ======================================================================
    // ส่วนที่ 3: ระบบใหม่ (2025 Plan Tracker & Export แบบแยก Start/End)
    // ======================================================================
    let trackerMatchedData = [];
    let currentFilteredTrackerData = []; 

    function parseDateStrToObj(ddmmyyyy) {
        let [d,m,y] = ddmmyyyy.split('/');
        return new Date(y, m-1, d);
    }

    function formatDateRangeStr(dateArray) {
        if(!dateArray || dateArray.length === 0) return "-";
        let dObjs = dateArray.map(parseDateStrToObj).sort((a,b) => a-b);
        let start = dObjs[0];
        let end = dObjs[dObjs.length-1];
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        
        if (start.getTime() === end.getTime()) {
            return `${start.getDate()} ${months[start.getMonth()]}`;
        } else if (start.getMonth() === end.getMonth()) {
            return `${start.getDate()} - ${end.getDate()} ${months[start.getMonth()]}`;
        } else {
            return `${start.getDate()} ${months[start.getMonth()]} - ${end.getDate()} ${months[end.getMonth()]}`;
        }
    }

    // แยก Start Date สำหรับ Export
    function formatExportDateStart(dateArray) {
        if(!dateArray || dateArray.length === 0) return "-";
        let dObjs = dateArray.map(parseDateStrToObj).sort((a,b) => a-b);
        let start = dObjs[0];
        let d = String(start.getDate()).padStart(2, '0');
        let m = String(start.getMonth() + 1).padStart(2, '0');
        let y = start.getFullYear();
        return `${d}-${m}-${y}`;
    }

    // แยก End Date สำหรับ Export
    function formatExportDateEnd(dateArray) {
        if(!dateArray || dateArray.length === 0) return "-";
        let dObjs = dateArray.map(parseDateStrToObj).sort((a,b) => a-b);
        let end = dObjs[dObjs.length-1];
        let d = String(end.getDate()).padStart(2, '0');
        let m = String(end.getMonth() + 1).padStart(2, '0');
        let y = end.getFullYear();
        return `${d}-${m}-${y}`;
    }

    function getCalLinkFromDate(dateStr) {
        if(!dateStr || dateStr === '-') return '#';
        let [d,m,y] = dateStr.split('/');
        return `https://calendar.google.com/calendar/u/0/r/month/${y}/${parseInt(m)}/${parseInt(d)}`;
    }

    function groupDataByMonthAndTitle(dataArray) {
        let grouped = {};
        dataArray.forEach(job => {
            let clTitle = job.title.trim().toLowerCase();
            let key = `${job.team}_${clTitle}_${job.month}`;
            if (!grouped[key]) {
                grouped[key] = { ...job, dates: [job.date] };
            } else {
                if (!grouped[key].dates.includes(job.date)) {
                    grouped[key].dates.push(job.date);
                }
            }
        });
        return Object.values(grouped);
    }

    function findMatchIn2026Grouped(title2025, groupedData2026, team) {
        if (!title2025) return null;
        let t25 = title2025.toLowerCase().trim();
        
        const ignoreList = ['โจ', 'ไผ่', 'test', 'เทส', 'ทดสอบ', 'ลา', 'ลาป่วย', 'ป่วย', 'หยุด', 'dayoff', 'day off', 'วันหยุด', 'เทศกาล', 'พี่', 'น้อง', 'ทีม'];
        let clean25 = t25;
        ignoreList.forEach(w => {
            clean25 = clean25.replace(new RegExp(w, 'gi'), ''); 
        });
        clean25 = clean25.trim();
        
        if (clean25.length < 2) return null; 

        const keywordRegex = /(รพ\.|โรงพยาบาล|คลินิก|คลีนิค|clinic|ศูนย์|site|บ\.|บริษัท|ม\.|มหาวิทยาลัย|สถาบัน)\s*[a-zA-Zก-ฮะ-์0-9]+/gi;
        let strongKeywords = t25.match(keywordRegex) || [];

        for (let item of groupedData2026) {
            if (item.team !== team) continue;
            let t26 = (item.title || "").toLowerCase();
            
            if (strongKeywords.length > 0) {
                for (let kw of strongKeywords) {
                    if (t26.includes(kw.toLowerCase())) return item;
                }
            }
            if (t26.includes(clean25) || clean25.includes(t26)) return item;
        }
        return null;
    }

    function tesExcelDateKeyV37_(value, fallbackMonth) {
        if (value instanceof Date && !isNaN(value.getTime())) {
            const y = value.getFullYear();
            return `${y}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;
        }
        if (typeof value === 'number' && value > 20000) {
            const epoch = new Date(Date.UTC(1899, 11, 30));
            const d = new Date(epoch.getTime() + Math.round(value) * 86400000);
            return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
        }
        const text = String(value || '').trim();
        if (!text) return '';
        let m = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
        if (m) return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
        m = text.match(/^(\d{1,2})[-/.](\d{1,2})(?:[-/.](\d{2,4}))?/);
        if (m) {
            let y = Number(m[3] || 2026); if (y < 100) y += 2000; if (y > 2400) y -= 543;
            return `${y}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
        }
        if (fallbackMonth && /^\d{1,2}$/.test(text)) return `2026-${String(fallbackMonth).padStart(2,'0')}-${String(text).padStart(2,'0')}`;
        const d = new Date(text);
        return isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }

    function tesTimeRangeV37_(value) {
        const text = String(value || '').trim();
        const times = text.match(/\d{1,2}[.:]\d{2}/g) || [];
        const norm = t => { const p=t.split(/[.:]/); return `${String(Math.min(23,Number(p[0]))).padStart(2,'0')}:${String(Math.min(59,Number(p[1]))).padStart(2,'0')}`; };
        return { startTime:times[0] ? norm(times[0]) : '09:00', endTime:times[1] ? norm(times[1]) : '17:00' };
    }


    function parseTesWorkbookV40_(workbook) {
        const result = [];
        const dedupe = new Set();
        const monthMap = {JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12};
        const clean = value => String(value == null ? '' : value).replace(/\s+/g,' ').trim();
        const norm = value => clean(value).toLowerCase().replace(/[()]/g,'');
        const findHeader = (row, tests) => {
            for (let c=0;c<row.length;c++) {
                const h=norm(row[c]);
                if (tests.some(test => typeof test === 'string' ? h.includes(test) : test.test(h))) return c;
            }
            return -1;
        };
        (workbook.SheetNames || []).forEach(sheetName => {
            const month = monthMap[String(sheetName || '').trim().slice(0,3).toUpperCase()];
            if (!month) return;
            const ws = workbook.Sheets[sheetName]; if (!ws) return;
            const rows = XLSX.utils.sheet_to_json(ws, {header:1, defval:'', raw:true});
            let headerIndex=-1, map=null;
            for (let i=0;i<Math.min(rows.length,8);i++) {
                const row=rows[i]||[];
                const customer=findHeader(row,['ชื่อลูกค้า','account name']);
                const actualDate=findHeader(row,['วันที่เข้าดำเนินการจริง']);
                if(customer<0||actualDate<0) continue;
                map={
                    customer,
                    equipment:findHeader(row,['เครื่องมือ']),
                    engineer:findHeader(row,['assigned to','ผู้รับผิดชอบ']),
                    contact:findHeader(row,['ผู้ติดต่อ/เบอร์โทร โปรดระบุ','ผู้ติดต่อ/เบอร์โทร']),
                    alternateContact:findHeader(row,[/^ผู้ติดต่อ\/เบอร์โทร$/]),
                    actualDate,
                    quantity:findHeader(row,['count of จำนวน','จำนวน']),
                    confirmedDate:findHeader(row,['วันที่ลูกค้ายืนยัน']),
                    confirmedTime:findHeader(row,['เวลาที่ลูกค้ายืนยัน']),
                    status:findHeader(row,['สถานะการดำเนินการ']),
                    remark:findHeader(row,['remark'])
                };
                headerIndex=i; break;
            }
            if(headerIndex<0||!map) return;
            let carry={customer:'',equipment:'',engineer:'',contact:''};
            for(let i=headerIndex+1;i<rows.length;i++) {
                const r=rows[i]||[];
                const valueAt = idx => idx>=0 ? r[idx] : '';
                const rawCustomer=clean(valueAt(map.customer));
                const rawEquipment=clean(valueAt(map.equipment)).replace(/^#N\/A$/i,'');
                const rawEngineer=clean(valueAt(map.engineer));
                const primaryContact=clean(valueAt(map.contact)).replace(/^\(blank\)$/i,'');
                const alternateContact=map.alternateContact>=0&&map.alternateContact!==map.contact?clean(valueAt(map.alternateContact)).replace(/^\(blank\)$/i,''):'';
                if(rawCustomer) carry.customer=rawCustomer;
                if(rawEquipment) carry.equipment=rawEquipment;
                if(rawEngineer) carry.engineer=rawEngineer;
                if(primaryContact||alternateContact) carry.contact=[primaryContact,alternateContact].filter(Boolean).join(' / ');
                const customer=rawCustomer||carry.customer;
                if(!customer||/ชื่อลูกค้า|account name|grand total|sum of|รวม/i.test(customer)) continue;
                const planDate=tesExcelDateKeyV37_(valueAt(map.actualDate),month);
                const confirmedDate=tesExcelDateKeyV37_(valueAt(map.confirmedDate),month);
                if(!planDate&&!confirmedDate) continue;
                const rawStatus=clean(valueAt(map.status));
                const isConfirmed=/^confirm(?:ed)?$/i.test(rawStatus);
                const date=isConfirmed?(confirmedDate||planDate):(planDate||confirmedDate);
                if(!date||!date.startsWith('2026-')) continue;
                const time=tesTimeRangeV37_(valueAt(map.confirmedTime));
                const equipment=rawEquipment||carry.equipment;
                const engineer=rawEngineer||carry.engineer;
                const contact=[primaryContact,alternateContact].filter(Boolean).join(' / ')||carry.contact;
                const titleBase=customer+(equipment?' - '+equipment:'');
                const key=[sheetName,planDate||date,customer,equipment,engineer].join('|').toLowerCase();
                if(dedupe.has(key)) continue; dedupe.add(key);
                result.push({
                    date, planDate:planDate||date,
                    startTime:time.startTime,endTime:time.endTime,
                    confirmedTime:isConfirmed?clean(valueAt(map.confirmedTime)):'',
                    status:rawStatus||'Plan',isConfirmed,jobNo:'',customer,contact,
                    location:customer,equipment,
                    quantity:Number(valueAt(map.quantity)||0)||0,
                    engineer,remark:clean(valueAt(map.remark)),sourceSheet:sheetName,
                    sourceRow:i+1,calendarTitle:isConfirmed?('CF-'+titleBase):titleBase
                });
            }
        });
        return result.sort((a,b)=>String(a.date+a.customer+a.equipment).localeCompare(String(b.date+b.customer+b.equipment)));
    }
    function parseTesWorkbookV48_(workbook) { return parseTesWorkbookV40_(workbook); }
    function parseTesWorkbookV47_(workbook) { return parseTesWorkbookV40_(workbook); }
    function parseTesWorkbookV37_(workbook) { return parseTesWorkbookV40_(workbook); }

    function calendarEscV37_(value) {
        return String(value == null ? '' : value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
    }

    async function handleTesPlanFileV38(input) {
        const file = input && input.files ? input.files[0] : null;
        if (!file) return;
        try {
            if (!window.XLSX) throw new Error('XLSX library is not loaded.');
            Swal.fire({ title:'Reading Booking Service TES plan…', allowOutsideClick:false, showConfirmButton:false, didOpen:()=>Swal.showLoading() });
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type:'array', cellDates:true });
            const rows = parseTesWorkbookV48_(workbook);
            Swal.close();
            if (!rows.length) throw new Error('No dated TES rows were found in Booking Service TES workbook.');
            const confirmedCount = rows.filter(r => r.isConfirmed || /^confirm$/i.test(String(r.status||''))).length;
            const sample = rows.slice(0,8).map(r => `<tr><td>${calendarEscV37_(r.date)}</td><td>${r.isConfirmed?'<span class="font-black text-emerald-700">CF</span>':'<span class="text-slate-400">PLAN</span>'}</td><td>${calendarEscV37_(r.customer)}</td><td>${calendarEscV37_(r.equipment||'-')}</td></tr>`).join('');
            const answer = await Swal.fire({
                title:'Import Booking Service TES plan?',
                html:`<div class="text-left text-xs"><div class="mb-3"><b>${rows.length}</b> dated TES plans found in <b>${file.name}</b> · <b>${confirmedCount}</b> Confirm.</div><div class="max-h-64 overflow-auto border rounded-xl"><table class="w-full"><thead class="bg-slate-50"><tr><th class="p-2">Date</th><th class="p-2">Status</th><th class="p-2">Customer</th><th class="p-2">Equipment</th></tr></thead><tbody>${sample}</tbody></table></div><p class="mt-3 text-slate-500">All dated monthly-plan rows are imported. Confirm rows are titled <b>CF-Customer - Equipment</b>. Re-import updates the current TES plan and removes stale CES-imported rows.</p></div>`,
                icon:'question', showCancelButton:true, confirmButtonText:'Import to TES Calendar', confirmButtonColor:'#003DA5', width:720
            });
            if (!answer.isConfirmed) return;
            Swal.fire({ title:'Importing TES calendar…', html:'Creating/updating events and refreshing current month.', allowOutsideClick:false, showConfirmButton:false, didOpen:()=>Swal.showLoading() });
            const result = await window.CES_API.callFunction('importTesJobPlan', [{ rows }, { calendarId:'technicalsupport.tes@gmail.com', syncDashboard:true, replaceImported:true, hardReplace:true }], { transport:'iframe', timeoutMs:240000 });
            if (!result || !result.success) throw new Error((result && (result.message || (result.errors||[]).join('\n'))) || 'TES import failed.');
            Swal.close();
            await Swal.fire('TES Import Complete', `${result.created || 0} created · ${result.updated || 0} updated · ${result.deleted || 0} old rows removed · ${result.validRows || rows.length} total plans · ${result.confirmedRows || confirmedCount} CF`, 'success');
            if (typeof loadAllData === 'function') loadAllData(true);
        } catch (error) {
            Swal.close();
            Swal.fire({title:'TES Import Error',html:'<div class="text-left text-sm">' + calendarEscV37_(error.message || String(error)).replace(/\n/g,'<br>') + '<hr class="my-3"><b>Direct Calendar setup:</b><ol class="list-decimal pl-5 mt-1 space-y-1"><li>Share the TES calendar with the Apps Script deployment account.</li><li>Permission must be <b>Make changes to events</b>.</li><li>Set Config <code>CAL_ID_TES</code> to the TES calendar ID, then deploy a new version.</li></ol><p class="mt-3 text-slate-500">When cross-account sharing is not possible, configure TES_IMPORT_WEBAPP_URL and TES_IMPORT_SECRET using the optional receiver included in the patch.</p></div>',icon:'error',width:720,confirmButtonColor:'#003DA5'});
        } finally {
            if (input) input.value = '';
        }
    }
    window.handleTesPlanFileV48 = handleTesPlanFileV38;
    window.handleTesPlanFileV47 = handleTesPlanFileV38;
    window.handleTesPlanFileV40 = handleTesPlanFileV38;
    window.handleTesPlanFileV38 = handleTesPlanFileV38;
    window.handleTesPlanFileV37 = handleTesPlanFileV38;


    // ============================================================
    // MED Monthly Work Plan import V53
    // ============================================================
    function medMonthNumberV53_(value){const map={JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12};return map[String(value||'').trim().slice(0,3).toUpperCase()]||0;}
    function medIsoV53_(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
    function medWeekRangeV53_(month,week){const startDay=[1,1,8,15,22,29][week]||1;const last=new Date(2026,month,0).getDate();if(startDay>last)return null;const endDay=week<5?Math.min(last,startDay+7):last+1;return{start:new Date(2026,month-1,startDay),end:week<5?new Date(2026,month-1,endDay):new Date(2026,month,1)};}
    function parseMedWorkbookV53_(workbook){
      const sheet=workbook.Sheets['Master Plan']||workbook.Sheets['Calendar Upload']||workbook.Sheets[workbook.SheetNames[0]];if(!sheet)return[];
      const rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:true});
      const clean=v=>String(v==null?'':v).replace(/\s+/g,' ').trim();
      const normalized=v=>clean(v).toLowerCase();
      let headerRow=-1,headers={};
      for(let i=0;i<Math.min(rows.length,10);i++){
        const row=rows[i]||[];
        row.forEach((value,col)=>{const h=normalized(value);if(h)headers[h]=col;});
        if(headers['record id']!=null&&headers['month no.']!=null&&headers['work plan / location']!=null){headerRow=i;break;}
        headers={};
      }
      if(headerRow<0)return[];
      const col=(...names)=>{for(const name of names){const key=normalized(name);if(headers[key]!=null)return headers[key];}return-1;};
      const idx={year:col('Year'),monthNo:col('Month No.'),month:col('Month'),team:col('Team'),week:col('Week'),title:col('Work Plan / Location'),engineerQty:col('Engineer Qty'),engineerDetail:col('Engineer Detail'),note:col('Note'),status:col('Status'),start:col('Start Date'),end:col('End Date'),subject:col('Calendar Subject'),description:col('Calendar Description')};
      const out=[];
      for(let i=headerRow+1;i<rows.length;i++){
        const r=rows[i]||[],at=k=>idx[k]>=0?r[idx[k]]:'';
        const year=Number(at('year')||2026),month=Number(at('monthNo')||medMonthNumberV53_(at('month'))),week=Number(at('week'));
        const title=clean(at('title'));
        if(year!==2026||month<1||month>12||week<1||week>5||!title||title==='-')continue;
        let startKey=tesExcelDateKeyV37_(at('start'),month),endKey=tesExcelDateKeyV37_(at('end'),month);
        if(!startKey){const range=medWeekRangeV53_(month,week);if(!range)continue;startKey=medIsoV53_(range.start);endKey=medIsoV53_(range.end);}
        else if(!endKey){const d=new Date(startKey+'T00:00:00');d.setDate(d.getDate()+1);endKey=medIsoV53_(d);}
        else {const d=new Date(endKey+'T00:00:00');if(!isNaN(d.getTime())){d.setDate(d.getDate()+1);endKey=medIsoV53_(d);}}
        const qty=Number(at('engineerQty')||0)||0,detail=clean(at('engineerDetail'));
        const engineer=detail||(qty?qty+' engineer'+(qty===1?'':'s'):'');
        const item={startDate:startKey,endDate:endKey,title,customer:title,location:title,teamGroup:clean(at('team')),engineer,month:clean(at('month'))||String(month),weekLabel:'Week '+week,sourceSheet:'Master Plan',sourceRow:i+1,note:clean(at('note')),status:clean(at('status')),calendarSubject:clean(at('subject')),calendarDescription:clean(at('description'))};
        const previous=out[out.length-1];
        if(previous&&previous.title===item.title&&previous.teamGroup===item.teamGroup&&previous.engineer===item.engineer&&previous.endDate===item.startDate){previous.endDate=item.endDate;previous.weekLabel+='–'+week;continue;}
        out.push(item);
      }
      return out;
    }
    async function handleMedPlanFileV53(input){
      const file=input&&input.files?input.files[0]:null;if(!file)return;
      try{
        if(!window.XLSX)throw new Error('XLSX library is not loaded.');
        Swal.fire({title:'Reading MED Monthly Work Plan…',allowOutsideClick:false,showConfirmButton:false,didOpen:()=>Swal.showLoading()});
        const workbook=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true}),rows=parseMedWorkbookV53_(workbook);Swal.close();
        if(!rows.length)throw new Error('No MED weekly plan rows were found.');
        const sample=rows.slice(0,10).map(r=>`<tr><td class="p-2">${calendarEscV37_(r.startDate)} → ${calendarEscV37_(r.endDate)}</td><td class="p-2">${calendarEscV37_(r.teamGroup)}</td><td class="p-2">${calendarEscV37_(r.title)}</td><td class="p-2">${calendarEscV37_(r.engineer||'-')}</td></tr>`).join('');
        const answer=await Swal.fire({title:'Import MED Monthly Work Plan Jul–Oct 2026?',html:`<div class="text-left text-xs"><div class="mb-3"><b>${rows.length}</b> MED work-plan blocks found in <b>${calendarEscV37_(file.name)}</b>.</div><div class="max-h-72 overflow-auto border rounded-xl"><table class="w-full"><thead class="bg-slate-50"><tr><th class="p-2">Date range</th><th class="p-2">Team</th><th class="p-2">Work plan</th><th class="p-2">Engineer</th></tr></thead><tbody>${sample}</tbody></table></div><p class="mt-3 text-slate-500">Only Monday–Friday are added. Re-import deletes only CES-imported MED events, then recreates weekday events from this workbook. Manual MED Calendar events remain unchanged.</p></div>`,icon:'question',showCancelButton:true,confirmButtonText:'Import to MED Calendar',confirmButtonColor:'#004aad',width:820});
        if(!answer.isConfirmed)return;
        Swal.fire({title:'Importing MED calendar…',html:'Replacing previous CES-imported MED work-plan events with Monday–Friday events and refreshing the dashboard.',allowOutsideClick:false,showConfirmButton:false,didOpen:()=>Swal.showLoading()});
        const result=await window.CES_API.callFunction('importMedMonthlyWorkPlan',[{rows,sourceFile:file.name},{calendarId:'cescalmedteam@gmail.com',syncDashboard:true,hardReplace:true}],{transport:'iframe',timeoutMs:300000});
        if(!result||(!result.success&&Number(result.created||0)===0)){
          const details=result&&Array.isArray(result.errors)&&result.errors.length?'\n'+result.errors.join('\n'):'';
          throw new Error((result&&result.message)||'MED import failed.'+details);
        }
        Swal.close();
        const warnings=Array.isArray(result.errors)?result.errors:[];
        if(result.partial||warnings.length){
          const warningHtml=warnings.slice(0,8).map(x=>'<li>'+calendarEscV37_(x)+'</li>').join('');
          await Swal.fire({title:'MED Import Complete with Warnings',html:`<div class="text-left text-sm"><p><b>${result.created||0}</b> / <b>${result.validRows||rows.length}</b> events created · <b>${result.deleted||0}</b> previous CES MED imports removed.</p>${warningHtml?'<div class="mt-3 text-amber-700"><b>Warnings</b><ul class="list-disc pl-5 mt-1 space-y-1">'+warningHtml+'</ul></div>':''}</div>`,icon:'warning',confirmButtonColor:'#004aad',width:720});
        }else{
          await Swal.fire('MED Import Complete',`${result.created||0} weekday events created · ${result.deleted||0} previous CES MED imports removed · ${result.validRows||rows.length} source blocks`,'success');
        }
        if(typeof loadAllData==='function')loadAllData(true);
      }catch(error){
        Swal.close();
        const message=String(error&&error.message||error||'MED import failed.');
        const setup=/not accessible|permission|calendar/i.test(message)?'<hr class="my-3"><b>Calendar setup:</b><ol class="list-decimal pl-5 mt-1 space-y-1"><li>Share <code>cescalmedteam@gmail.com</code> calendar with the Apps Script deployment account.</li><li>Permission must be <b>Make changes to events</b>.</li><li>Set Config <code>CAL_ID_MED</code> when another Calendar ID is used.</li></ol>':'';
        Swal.fire({title:'MED Import Error',html:'<div class="text-left text-sm">'+calendarEscV37_(message).replace(/\n/g,'<br>')+setup+'</div>',icon:'error',width:720,confirmButtonColor:'#004aad'});
      }finally{if(input)input.value='';}
    }
    window.handleMedPlanFileV53=handleMedPlanFileV53;

    async function openJobTracker2025() {
        if (!globalCalData || globalCalData.length === 0) {
            Swal.fire('No Data', 'กรุณารอให้ระบบโหลดข้อมูลเสร็จสิ้นก่อน', 'warning');
            return;
        }

        const filteredGlobalData = globalCalData.filter(item => !checkIsLeaveEvent(item.title));
        const raw2025 = filteredGlobalData.filter(item => item.year == "2025");
        const raw2026 = filteredGlobalData.filter(item => item.year == "2026");
        
        const unique2025 = groupDataByMonthAndTitle(raw2025);
        const unique2026 = groupDataByMonthAndTitle(raw2026);

        trackerMatchedData = unique2025.map((job25,jobIndex) => {
            const match = findMatchIn2026Grouped(job25.title, unique2026, job25.team);
            return {
                team: job25.team,
                title: job25.title,
                month25: job25.month,
                firstDate25: job25.dates[0], 
                dateRange25: formatDateRangeStr(job25.dates), 
                exportStartDate25: formatExportDateStart(job25.dates),  
                exportEndDate25: formatExportDateEnd(job25.dates),  
                status: match ? 'Matched' : 'Pending',
                matchTitle: match ? match.title : '-',
                matchMonth: match ? match.month : '-',
                matchFirstDate26: match ? match.dates[0] : '-',
                dateRange26: match ? formatDateRangeStr(match.dates) : '-', 
                exportStartDate26: match ? formatExportDateStart(match.dates) : '-',
                exportEndDate26: match ? formatExportDateEnd(match.dates) : '-'
            };
        });

        let containerHtml = `
            <div class="text-left font-prompt ces-plan-comparison-content-v37">
                <div class="mb-6 space-y-4 bg-slate-50 p-4 rounded-2xl border border-blue-100 shadow-sm">
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div class="flex flex-wrap bg-white p-1 rounded-xl border border-slate-200 shadow-sm gap-1">
                            <button onclick="filterTracker('ALL')" id="btn-tracker-ALL" class="tracker-btn active px-4 py-1.5 rounded-lg text-xs font-bold transition-all bg-[#003DA5] text-white shadow-sm">All</button>
                            <button onclick="filterTracker('MED')" id="btn-tracker-MED" class="tracker-btn px-4 py-1.5 rounded-lg text-xs font-bold transition-all text-gray-500 hover:bg-blue-50 hover:text-[#003DA5]">MED</button>
                            <button onclick="filterTracker('LAB')" id="btn-tracker-LAB" class="tracker-btn px-4 py-1.5 rounded-lg text-xs font-bold transition-all text-gray-500 hover:bg-blue-50 hover:text-[#003DA5]">LAB</button>
                            <button onclick="filterTracker('EHS')" id="btn-tracker-EHS" class="tracker-btn px-4 py-1.5 rounded-lg text-xs font-bold transition-all text-gray-500 hover:bg-slate-100">EHS</button>
                            <button onclick="filterTracker('ENV')" id="btn-tracker-ENV" class="tracker-btn px-4 py-1.5 rounded-lg text-xs font-bold transition-all text-gray-500 hover:bg-slate-100">ENV</button>
                            <button onclick="filterTracker('TES')" id="btn-tracker-TES" class="tracker-btn px-4 py-1.5 rounded-lg text-xs font-bold transition-all text-gray-500 hover:bg-slate-100">TES</button>
                            <button onclick="filterTracker('MGT')" id="btn-tracker-MGT" class="tracker-btn px-4 py-1.5 rounded-lg text-xs font-bold transition-all text-gray-500 hover:bg-slate-100">MGT</button>
                        </div>
                        <div class="flex flex-wrap items-center gap-2">
                            <select id="tracker-status-select" onchange="filterTracker()" class="bg-white border border-[#003DA5] rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#003DA5] cursor-pointer shadow-sm">
                                <option value="ALL">All Status</option>
                                <option value="Matched">Matched</option>
                                <option value="Pending">Pending</option>
                            </select>
                            <select id="tracker-month-select" onchange="filterTracker()" class="bg-white border border-[#003DA5] rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#003DA5] cursor-pointer shadow-sm">
                                <option value="ALL">All Months</option>
                                <option value="1">Jan</option><option value="2">Feb</option><option value="3">Mar</option>
                                <option value="4">Apr</option><option value="5">May</option><option value="6">Jun</option>
                                <option value="7">Jul</option><option value="8">Aug</option><option value="9">Sep</option>
                                <option value="10">Oct</option><option value="11">Nov</option><option value="12">Dec</option>
                            </select>
                            <button onclick="exportTrackerToCSV()" class="bg-[#059669] hover:bg-[#047857] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm">
                                <i class="fas fa-file-excel mr-1"></i> Export Excel
                            </button>
                        </div>
                    </div>
                </div>
                <div class="overflow-auto max-h-[65vh] border border-gray-100 rounded-2xl bg-white shadow-sm custom-scrollbar ces-plan-comparison-table-v37">
                    <table class="w-full min-w-[1280px] text-xs border-collapse">
                        <thead class="bg-gray-50 sticky top-0 z-10 border-b border-gray-100 shadow-sm">
                            <tr>
                                <th class="p-4 text-center font-bold text-gray-500 uppercase tracking-wider w-[8%]">Team</th>
                                <th class="p-4 text-center font-bold text-indigo-600 uppercase tracking-wider w-[43%] border-r border-gray-100"><i class="fas fa-history"></i> 2025 Plan</th>
                                <th class="p-4 text-center font-bold text-gray-300 uppercase tracking-wider w-[6%]"><i class="fas fa-exchange-alt"></i></th>
                                <th class="p-4 text-center font-bold text-[#003DA5] uppercase tracking-wider w-[43%]"><i class="fas fa-calendar-check"></i> 2026 Status</th>
                            </tr>
                        </thead>
                        <tbody id="tracker-tbody" class="divide-y divide-gray-100 bg-white">
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        Swal.fire({
            title: '<div class="flex items-center gap-3"><i class="fas fa-tasks text-[#003DA5]"></i> Plan Comparison: 2025 vs 2026</div>',
            html: containerHtml,
            width: 'min(1540px, 98vw)',
            showCloseButton: true,
            showConfirmButton: false,
            customClass: {
                container: 'font-prompt',
                popup: 'rounded-[2rem] ces-plan-comparison-popup-v37'
            },
            didOpen: () => {
                filterTracker('ALL');
            }
        });
    }

    function trackerPaletteV37_(team) {
        const map = {
            MED:{ color:'#1D4ED8', soft:'#EFF6FF', border:'#BFDBFE' },
            LAB:{ color:'#0E7490', soft:'#ECFEFF', border:'#A5F3FC' },
            EHS:{ color:'#0F766E', soft:'#F0FDFA', border:'#99F6E4' },
            ENV:{ color:'#15803D', soft:'#F0FDF4', border:'#BBF7D0' },
            TES:{ color:'#B45309', soft:'#FFFBEB', border:'#FDE68A' },
            MGT:{ color:'#6D28D9', soft:'#F5F3FF', border:'#DDD6FE' }
        };
        return map[team] || { color:'#334155', soft:'#F8FAFC', border:'#CBD5E1' };
    }

    function filterTracker(team) {
        if (team) currentTrackerTeam = team;
        const month = document.getElementById('tracker-month-select').value;
        const status = document.getElementById('tracker-status-select').value;
        const tbody = document.getElementById('tracker-tbody');

        document.querySelectorAll('.tracker-btn').forEach(btn => {
            btn.classList.remove('bg-[#003DA5]', 'text-white', 'shadow-sm', 'active');
            btn.classList.add('text-gray-500');
        });
        
        const activeBtn = document.getElementById(`btn-tracker-${currentTrackerTeam}`);
        if (activeBtn) {
            activeBtn.classList.remove('text-gray-500');
            activeBtn.classList.add('bg-[#003DA5]', 'text-white', 'shadow-sm', 'active');
        }

        let filtered = trackerMatchedData.filter(item => {
            const teamMatch = (currentTrackerTeam === 'ALL' || item.team === currentTrackerTeam);
            const monthMatch = (month === 'ALL' || item.month25 == month);
            const statusMatch = (status === 'ALL' || item.status === status);
            return teamMatch && monthMatch && statusMatch;
        });

        filtered.sort((a, b) => {
            let dateA = parseDateStrToObj(a.firstDate25);
            let dateB = parseDateStrToObj(b.firstDate25);
            return dateA - dateB;
        });

        currentFilteredTrackerData = filtered; 

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="p-10 text-center text-gray-400 italic">No data found for this filter.</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(r => {
            const palette = trackerPaletteV37_(r.team);
            let teamBadge = `<span class="px-2.5 py-1.5 rounded-md text-[10px] font-black shadow-sm" style="background:${palette.soft};color:${palette.color};border:1px solid ${palette.border}">${r.team}</span>`;

            const calLink25 = getCalLinkFromDate(r.firstDate25);
            const calLink26 = getCalLinkFromDate(r.matchFirstDate26);

            let rightSideUI = '';
            if (r.status === 'Matched') {
                rightSideUI = `
                    <a href="${calLink26}" target="_blank" class="block rounded-xl p-3 w-full shadow-sm text-left hover:shadow-md transition-all cursor-pointer group/link" style="background:${palette.soft};border:1px solid ${palette.border}">
                        <div class="flex items-center gap-1.5 mb-2">
                            <i class="fas fa-check-circle text-sm" style="color:${palette.color}"></i>
                            <span class="text-[10px] font-extrabold uppercase tracking-widest bg-white px-2 py-0.5 rounded shadow-sm" style="color:${palette.color}">Matched in 2026</span>
                        </div>
                        <div class="text-sm font-bold text-slate-800 leading-snug mb-2">${r.matchTitle}</div>
                        <div class="flex flex-col gap-1.5">
                            <div class="text-xs text-gray-600 flex items-center gap-2"><i class="far fa-calendar-alt w-3 text-center" style="color:${palette.color}"></i> <span class="font-medium bg-white px-2 py-0.5 rounded" style="color:${palette.color};border:1px solid ${palette.border}">${r.dateRange26}</span></div>
                        </div>
                    </a>
                `;
            } else {
                rightSideUI = `
                    <div class="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-4 w-full h-full flex flex-col items-center justify-center text-center transition-all hover:bg-slate-100">
                        <i class="fas fa-clock text-slate-500 text-2xl mb-2"></i>
                        <span class="text-xs font-extrabold text-slate-600 uppercase tracking-wide">Pending</span>
                        <span class="text-[10px] text-slate-500 mt-1 font-medium bg-white px-2 py-1 rounded-md shadow-sm border border-slate-200">No similar job found in 2026</span>
                    </div>
                `;
            }

            return `
            <tr class="hover:bg-slate-50 border-b border-gray-100 transition-colors group">
                <td class="p-4 align-middle text-center w-[8%]">
                    ${teamBadge}
                </td>
                <td class="p-4 align-top w-[43%] border-r border-gray-100">
                    <a href="${calLink25}" target="_blank" class="block bg-white rounded-xl p-3 w-full shadow-sm transition-all text-left hover:shadow-md cursor-pointer group/link25" style="border:1px solid ${palette.border};border-left:4px solid ${palette.color}">
                        <div class="flex justify-between items-center mb-2">
                            <div class="text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1" style="color:${palette.color}">
                                <i class="fas fa-history"></i> 2025 Plan
                            </div>
                            <i class="fas fa-external-link-alt text-gray-300 text-[10px] group-hover/link25:text-indigo-400"></i>
                        </div>
                        <div class="text-sm font-bold text-gray-800 leading-snug mb-2 group-hover/link25:text-indigo-600">${r.title}</div>
                        <div class="flex flex-col gap-1.5">
                            <div class="text-xs text-gray-600 flex items-center gap-2"><i class="far fa-calendar-alt w-3 text-center" style="color:${palette.color}"></i> <span class="font-medium px-2 py-0.5 rounded" style="background:${palette.soft};color:${palette.color}">${r.dateRange25}</span></div>
                        </div>
                    </a>
                </td>
                <td class="p-4 align-middle text-center w-[6%] bg-gray-50/30">
                    <div class="flex justify-center items-center h-full">
                        <div class="bg-white text-gray-300 rounded-full w-8 h-8 flex items-center justify-center shadow-sm border border-gray-100 group-hover:text-[#003DA5] group-hover:border-[#003DA5] transition-all">
                            <i class="fas fa-arrow-right"></i>
                        </div>
                    </div>
                </td>
                <td class="p-4 align-top w-[43%] bg-gray-50/30">
                    ${rightSideUI}
                </td>
            </tr>
            `;
        }).join('');
    }

    // ฟังก์ชัน Export Excel (2025 Plan Tracker) โดยแยก Start/End Date ออกจากกัน
    function exportTrackerToCSV() {
        if (currentFilteredTrackerData.length === 0) {
            Swal.fire('No Data', 'ไม่มีข้อมูลสำหรับ Export ในตารางปัจจุบัน', 'info');
            return;
        }
        
        let csvContent = "\uFEFF"; 
        csvContent += "Team,2025 Job Title,2025 Start Dates,2025 End Dates,Status,2026 Matched Job,2026 Start Dates,2026 End Dates\n";

        currentFilteredTrackerData.forEach(r => {
            let title25 = `"${r.title.replace(/"/g, '""')}"`;
            let title26 = `"${r.matchTitle.replace(/"/g, '""')}"`;
            
            csvContent += `${r.team},${title25},${r.exportStartDate25},${r.exportEndDate25},${r.status},${title26},${r.exportStartDate26},${r.exportEndDate26}
`;
        });

        let blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        let link = document.createElement("a");
        let url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `PlanTracker_Export_${new Date().toISOString().slice(0,10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

// CES Calendar V39 compatibility helpers
window.CES_CALENDAR_UI_V42_RECHECK = function(){ return window.CES_CALENDAR_UI_V43_RECHECK(); };
window.CES_CALENDAR_UI_V43_RECHECK = function(){ return {version:'V43', renderer:'google-calendar-embed', nativeEventPopup:true, tabs:['ALL','MED','LAB','EHS','ENV','TES','MGT'], jobRecordTeams:['MED','LAB','EHS','ENV','TES'], capacityTeams:['MED','LAB','EHS','ENV','TES'], ehsCalendar:'natkanok.8942@gmail.com', envCalendar:'chiraphat.env@gmail.com'}; };

window.CES_CALENDAR_UI_V41_RECHECK = window.CES_CALENDAR_UI_V42_RECHECK;
window.CES_CALENDAR_UI_V40_RECHECK = window.CES_CALENDAR_UI_V42_RECHECK;
window.CES_CALENDAR_UI_V39_RECHECK = window.CES_CALENDAR_UI_V42_RECHECK;
window.CES_CALENDAR_UI_V49_RECHECK = function(){ const out=window.CES_CALENDAR_UI_V43_RECHECK(); out.version='V49'; out.planComparisonColumns=['TEAM','2025 PLAN','2026 STATUS']; out.memoKeywordMatchRemoved=true; return out; };
