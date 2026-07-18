const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const pad=n=>String(n).padStart(2,'0');
const keyDate=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const today=new Date(); today.setHours(0,0,0,0);
let cursor=new Date(today.getFullYear(),today.getMonth(),1);
let calendarMode='month';
let calendars=JSON.parse(localStorage.getItem('daynote-calendars')||'null')||['仕事','プライベート','学習'];
let notebooks=JSON.parse(localStorage.getItem('daynote-notebooks')||'null')||['仕事','プライベート','アイデア'];
let calendarColors=JSON.parse(localStorage.getItem('daynote-calendar-colors')||'null')||{'仕事':'#557bea','プライベート':'#ed8e74','学習':'#51b99e'};
let notebookColors=JSON.parse(localStorage.getItem('daynote-notebook-colors')||'null')||{'仕事':'#557bea','プライベート':'#ed8e74','アイデア':'#51b99e'};
let filters=new Set(calendars);
const starterEvents=[
  {id:'e1',title:'チーム定例',date:keyDate(today),time:'10:00',category:'仕事',memo:'今週の進捗とブロッカーを共有'},
  {id:'e2',title:'企画レビュー',date:keyDate(new Date(today.getFullYear(),today.getMonth(),today.getDate()+2)),time:'14:30',category:'仕事',memo:'新しい企画案を確認'},
  {id:'e3',title:'英語レッスン',date:keyDate(new Date(today.getFullYear(),today.getMonth(),today.getDate()+4)),time:'19:00',category:'学習',memo:'Unit 6 の復習'},
  {id:'e4',title:'友人とディナー',date:keyDate(new Date(today.getFullYear(),today.getMonth(),today.getDate()+6)),time:'18:30',category:'プライベート',memo:'駅前のレストラン'}
];
const starterNotes=[
  {id:'n1',title:'今週のフォーカス',body:'・企画書の初稿を完成させる\n・毎朝30分の読書\n・金曜日までに予約する',pinned:true,updated:Date.now()},
  {id:'n2',title:'アイデアメモ',body:'カレンダーの予定から、そのまま会議メモを開けるようにする。',pinned:false,updated:Date.now()-86400000}
];
let events=JSON.parse(localStorage.getItem('daynote-events')||'null')||starterEvents;
let notes=JSON.parse(localStorage.getItem('daynote-notes')||'null')||starterNotes;
notes=notes.map(n=>({...n,notebook:n.notebook||'アイデア'}));
let activeNotebook='すべて';
events=events.map(e=>({...e,type:e.type||'event',endDate:e.endDate||e.date,endTime:e.endTime||'',dueTime:e.dueTime||'23:59',allDay:e.allDay||false,completed:e.completed||false,reminders:e.reminders||{hour:false,day:false},updated:Number(e.updated)||0}));
let editingType='event';
let exerciseNames=JSON.parse(localStorage.getItem('tsukinote-exercises')||'null')||['腕立て伏せ','屈伸','腹筋','スクワット'];
let exerciseRecords=JSON.parse(localStorage.getItem('tsukinote-exercise-records')||'{}');
let exerciseTargets=JSON.parse(localStorage.getItem('tsukinote-exercise-targets')||'{}');
let diaryEntries=JSON.parse(localStorage.getItem('tsukinote-diary')||'{}');
let selectedMood='';
const goals=JSON.parse(localStorage.getItem('daynote-goals')||'{}');
$('#monthlyGoal').value=goals.monthly||'';$('#weeklyGoal').value=goals.weekly||'';
function saveGoals(){localStorage.setItem('daynote-goals',JSON.stringify({monthly:$('#monthlyGoal').value,weekly:$('#weeklyGoal').value}));recordLocalChange()}
$('#monthlyGoal').oninput=saveGoals;$('#weeklyGoal').oninput=saveGoals;
function openGoal(type){const monthly=type==='monthly';$('#goalType').value=type;$('#goalDialogTitle').textContent=monthly?'今月の目標':'今週の目標';$('#goalText').value=$(monthly?'#monthlyGoal':'#weeklyGoal').value;$('#goalDialog').showModal();setTimeout(()=>$('#goalText').focus(),50)}
$('.monthly-goal').onclick=e=>{if(e.target.id!=='monthlyGoal')openGoal('monthly')};$('.weekly-goal').onclick=e=>{if(e.target.id!=='weeklyGoal')openGoal('weekly')};
$('#monthlyGoal').ondblclick=()=>openGoal('monthly');$('#weeklyGoal').ondblclick=()=>openGoal('weekly');
$('#goalForm').onsubmit=()=>{const target=$('#goalType').value==='monthly'?'#monthlyGoal':'#weeklyGoal';$(target).value=$('#goalText').value.trim();saveGoals();refreshMobileGoals()};
$('#closeGoalDialog').onclick=$('#cancelGoalDialog').onclick=()=>$('#goalDialog').close();
function refreshMobileGoals(){const monthly=$('#monthlyGoal').value.trim(),weekly=$('#weeklyGoal').value.trim();$('#mobileMonthlyGoalPreview').textContent=monthly||'まだ設定されていません';$('#mobileWeeklyGoalPreview').textContent=weekly||'まだ設定されていません'}
$('#mobileGoalsButton').onclick=()=>{refreshMobileGoals();$('#mobileGoalsDialog').showModal()};$('#closeMobileGoals').onclick=()=>$('#mobileGoalsDialog').close();$$('[data-mobile-goal]').forEach(button=>button.onclick=()=>{$('#mobileGoalsDialog').close();openGoal(button.dataset.mobileGoal)});
const save=()=>{localStorage.setItem('daynote-events',JSON.stringify(events));localStorage.setItem('daynote-notes',JSON.stringify(notes));recordLocalChange();scheduleAzureCalendarSync();schedulePushReminderSync()};
const saveCollections=()=>{localStorage.setItem('daynote-calendars',JSON.stringify(calendars));localStorage.setItem('daynote-notebooks',JSON.stringify(notebooks));localStorage.setItem('daynote-calendar-colors',JSON.stringify(calendarColors));localStorage.setItem('daynote-notebook-colors',JSON.stringify(notebookColors));recordLocalChange()};

function renderCollections(){
  $('#calendarListItems').innerHTML=calendars.map(name=>`<div class="collection-row"><label><input type="checkbox" checked data-filter="${esc(name)}"><i class="dot" style="background:${calendarColors[name]||'#557bea'}"></i><span>${esc(name)}</span></label><button data-delete-calendar="${esc(name)}" title="削除">×</button></div>`).join('');
  $('#eventCategory').innerHTML=calendars.map(n=>`<option>${esc(n)}</option>`).join('');filters=new Set(calendars);
  $('#notebookTabs').innerHTML=`<button class="${activeNotebook==='すべて'?'selected':''}" data-notebook="すべて"><span>▤</span>すべて</button>`+notebooks.map(n=>`<button class="${activeNotebook===n?'selected':''}" data-notebook="${esc(n)}"><span style="color:${notebookColors[n]||'#557bea'}">●</span>${esc(n)}<i data-delete-notebook="${esc(n)}">×</i></button>`).join('')+`<button class="add-tab" id="addNotebook">＋</button>`;
  $('#noteNotebook').innerHTML=notebooks.map(n=>`<option>${esc(n)}</option>`).join('');bindCollections();
}
function bindCollections(){
  $$('[data-filter]').forEach(c=>c.onchange=()=>{c.checked?filters.add(c.dataset.filter):filters.delete(c.dataset.filter);renderCalendar()});
  $$('[data-delete-calendar]').forEach(b=>b.onclick=()=>deleteCalendar(b.dataset.deleteCalendar));
  $$('[data-notebook]').forEach(b=>b.onclick=e=>{if(e.target.dataset.deleteNotebook)return;activeNotebook=b.dataset.notebook;$('.notes-header h1').textContent=activeNotebook==='すべて'?'すべてのメモ':activeNotebook+'ノート';renderCollections();renderNotes()});
  $$('[data-delete-notebook]').forEach(b=>b.onclick=e=>{e.stopPropagation();deleteNotebook(b.dataset.deleteNotebook)});$('#addNotebook').onclick=addNotebook;
}
function openCollectionDialog(type){$('#collectionType').value=type;$('#collectionDialogTitle').textContent=type==='calendar'?'カレンダーを追加':'ノートブックを追加';$('#collectionName').value='';$('#collectionColor').value=type==='calendar'?'#557bea':'#51b99e';$('#collectionName').placeholder=type==='calendar'?'例：家族、健康、プロジェクト':'例：旅行、勉強、日記';$('#collectionError').textContent='';$('#collectionDialog').showModal();setTimeout(()=>$('#collectionName').focus(),50)}
function addCalendar(){openCollectionDialog('calendar')}
function deleteCalendar(name){if(calendars.length===1){alert('カレンダーは1つ以上必要です');return}if(!confirm(`「${name}」を削除しますか？予定は別のカレンダーへ移動します。`))return;calendars=calendars.filter(n=>n!==name);events=events.map(e=>e.category===name?{...e,category:calendars[0],updated:Date.now()}:e);save();saveCollections();renderCollections();renderCalendar()}
function addNotebook(){openCollectionDialog('notebook')}
function deleteNotebook(name){if(notebooks.length===1){alert('ノートブックは1つ以上必要です');return}if(!confirm(`「${name}」を削除しますか？メモは別のノートブックへ移動します。`))return;notebooks=notebooks.filter(n=>n!==name);notes=notes.map(n=>n.notebook===name?{...n,notebook:notebooks[0]}:n);if(activeNotebook===name)activeNotebook='すべて';save();saveCollections();renderCollections();renderNotes()}
$('#addCalendar').onclick=addCalendar;
$('#collectionForm').onsubmit=e=>{e.preventDefault();const type=$('#collectionType').value,name=$('#collectionName').value.trim(),color=$('#collectionColor').value,list=type==='calendar'?calendars:notebooks;if(!name){$('#collectionError').textContent='名前を入力してください';return}if(list.includes(name)){ $('#collectionError').textContent='同じ名前がすでにあります';return}if(type==='calendar'){calendars.push(name);calendarColors[name]=color;filters.add(name);saveCollections();renderCollections();renderCalendar()}else{notebooks.push(name);notebookColors[name]=color;activeNotebook=name;saveCollections();renderCollections();renderNotes()}$('#collectionDialog').close()};
$('#closeCollectionDialog').onclick=$('#cancelCollectionDialog').onclick=()=>$('#collectionDialog').close();

function render(){renderCalendar();renderMini();renderNotes();renderSidebarTasks();renderExercises();renderDiaryHistory();}

function mondayOf(date=new Date()){const d=new Date(date);d.setHours(0,0,0,0);const day=d.getDay()||7;d.setDate(d.getDate()-day+1);return d}
function exerciseWeekKey(){return keyDate(mondayOf())}
function saveExercises(){localStorage.setItem('tsukinote-exercises',JSON.stringify(exerciseNames));localStorage.setItem('tsukinote-exercise-records',JSON.stringify(exerciseRecords));localStorage.setItem('tsukinote-exercise-targets',JSON.stringify(exerciseTargets));recordLocalChange()}
function renderExercises(){const monday=mondayOf(),weekKey=exerciseWeekKey(),week=exerciseRecords[weekKey]||{};const sunday=new Date(monday);sunday.setDate(monday.getDate()+6);$('#exerciseWeekLabel').textContent=`${monday.getMonth()+1}月${monday.getDate()}日 – ${sunday.getMonth()+1}月${sunday.getDate()}日`;const days=['月','火','水','木','金','土','日'];$('#exerciseTableHead').innerHTML=`<tr><th>種目</th>${days.map((day,i)=>{const d=new Date(monday);d.setDate(monday.getDate()+i);return `<th class="${keyDate(d)===keyDate(today)?'exercise-today':''}">${day}<small>${d.getDate()}</small></th>`}).join('')}<th>合計</th><th></th></tr>`;$('#exerciseTableBody').innerHTML=exerciseNames.map((name,row)=>{const values=week[name]||Array(7).fill(0),total=values.reduce((a,b)=>a+(Number(b)||0),0);return `<tr><th><span class="exercise-mark">${row+1}</span>${esc(name)}</th>${values.map((value,i)=>`<td><input type="number" min="0" max="9999" inputmode="numeric" value="${Number(value)||0}" data-exercise="${esc(name)}" data-exercise-day="${i}" aria-label="${esc(name)} ${days[i]}曜日"></td>`).join('')}<td class="exercise-total">${total}<small>回</small></td><td><button class="exercise-delete" data-delete-exercise="${esc(name)}" title="種目を削除">×</button></td></tr>`}).join('');$$('[data-exercise]').forEach(input=>input.oninput=()=>{const name=input.dataset.exercise,day=Number(input.dataset.exerciseDay);exerciseRecords[weekKey]??={};exerciseRecords[weekKey][name]??=Array(7).fill(0);exerciseRecords[weekKey][name][day]=Math.max(0,Number(input.value)||0);saveExercises();renderExercises()});$$('[data-delete-exercise]').forEach(b=>b.onclick=()=>{if(!confirm(`「${b.dataset.deleteExercise}」を削除しますか？`))return;exerciseNames=exerciseNames.filter(n=>n!==b.dataset.deleteExercise);saveExercises();renderExercises()});const all=exerciseNames.flatMap(n=>week[n]||Array(7).fill(0)).map(Number);$('#weeklyExerciseTotal').textContent=all.reduce((a,b)=>a+(b||0),0);$('#completedExerciseCells').textContent=all.filter(v=>v>0).length;const activeDays=new Set();exerciseNames.forEach(n=>(week[n]||[]).forEach((v,i)=>{if(Number(v)>0)activeDays.add(i)}));$('#activeExerciseDays').textContent=activeDays.size}
$('#addExerciseButton').onclick=()=>{$('#exerciseName').value='';$('#exerciseError').textContent='';$('#exerciseDialog').showModal();setTimeout(()=>$('#exerciseName').focus(),50)};$('#closeExerciseDialog').onclick=$('#cancelExerciseDialog').onclick=()=>$('#exerciseDialog').close();$('#exerciseForm').onsubmit=e=>{e.preventDefault();const name=$('#exerciseName').value.trim();if(!name){$('#exerciseError').textContent='種目名を入力してください';return}if(exerciseNames.includes(name)){ $('#exerciseError').textContent='同じ種目がすでにあります';return}exerciseNames.push(name);saveExercises();$('#exerciseDialog').close();renderExercises()};
function updateExerciseGoalState(row,name){const total=(exerciseRecords[exerciseWeekKey()]?.[name]||[]).reduce((a,b)=>a+(Number(b)||0),0),target=Number(exerciseTargets[name])||0;row.classList.toggle('exercise-achieved',target>0&&total>=target);const totalCell=row.querySelector('.exercise-total');if(totalCell)totalCell.title=target?`目標 ${target}回中 ${total}回`:'目標回数を設定してください'}
function enhanceExerciseTable(){const header=$('#exerciseTableHead tr');if(!header)return;const totalHead=header.children[header.children.length-2];header.insertBefore(totalHead,header.children[1]);const goalHead=document.createElement('th');goalHead.innerHTML='目標<small>回数</small>';header.insertBefore(goalHead,totalHead);$$('#exerciseTableBody tr').forEach((row,i)=>{const name=exerciseNames[i],totalCell=row.children[row.children.length-2];row.insertBefore(totalCell,row.children[1]);const goalCell=document.createElement('td');goalCell.className='exercise-goal';goalCell.innerHTML=`<input type="number" min="0" max="99999" inputmode="numeric" value="${Number(exerciseTargets[name])||0}" aria-label="${esc(name)}の週間目標回数">`;row.insertBefore(goalCell,totalCell);goalCell.querySelector('input').oninput=e=>{exerciseTargets[name]=Math.max(0,Number(e.target.value)||0);saveExercises();updateExerciseGoalState(row,name)};updateExerciseGoalState(row,name)})}
const baseRenderExercises=renderExercises;renderExercises=function(){baseRenderExercises();enhanceExerciseTable()};
document.addEventListener('input',e=>{const input=e.target;if(!input.matches?.('[data-exercise]'))return;e.stopImmediatePropagation();const weekKey=exerciseWeekKey(),name=input.dataset.exercise,day=Number(input.dataset.exerciseDay);exerciseRecords[weekKey]??={};exerciseRecords[weekKey][name]??=Array(7).fill(0);exerciseRecords[weekKey][name][day]=Math.max(0,Number(input.value)||0);saveExercises();const week=exerciseRecords[weekKey],rowTotal=(week[name]||[]).reduce((a,b)=>a+(Number(b)||0),0),row=input.closest('tr');row.querySelector('.exercise-total').innerHTML=`${rowTotal}<small>回</small>`;updateExerciseGoalState(row,name);const all=exerciseNames.flatMap(n=>week[n]||Array(7).fill(0)).map(Number),activeDays=new Set();exerciseNames.forEach(n=>(week[n]||[]).forEach((v,i)=>{if(Number(v)>0)activeDays.add(i)}));$('#weeklyExerciseTotal').textContent=all.reduce((a,b)=>a+(b||0),0);$('#completedExerciseCells').textContent=all.filter(v=>v>0).length;$('#activeExerciseDays').textContent=activeDays.size},true);
function renderCalendar(){
  $('#monthLabel').textContent=calendarMode==='month'?`${cursor.getFullYear()}年 ${cursor.getMonth()+1}月`:`${cursor.getFullYear()}年 ${cursor.getMonth()+1}月 ${cursor.getDate()}日を含む週`;
  const grid=$('#calendarGrid'); grid.innerHTML='';
  grid.classList.toggle('week-mode',calendarMode==='week');
  const start=calendarMode==='month'?new Date(cursor.getFullYear(),cursor.getMonth(),1-cursor.getDay()):new Date(cursor.getFullYear(),cursor.getMonth(),cursor.getDate()-cursor.getDay());
  const q=$('#searchInput').value.trim().toLowerCase();
  const cellCount=calendarMode==='month'?42:7;
  for(let i=0;i<cellCount;i++){
    const d=new Date(start);d.setDate(start.getDate()+i);const k=keyDate(d);
    const cell=document.createElement('div');cell.className='day-cell';
    if(d.getMonth()!==cursor.getMonth())cell.classList.add('other-month');
    if(k===keyDate(today))cell.classList.add('today-cell');
    cell.innerHTML=`<span class="day-number">${d.getDate()}</span>`;
    const matches=events.filter(e=>e.date<=k&&(e.endDate||e.date)>=k&&filters.has(e.category)&&(!q||(e.title+' '+e.memo).toLowerCase().includes(q))).sort(compareCalendarItems);
    const itemLimit=calendarMode==='week'?8:(window.matchMedia('(max-width:760px)').matches?2:3);
    matches.slice(0,itemLimit).forEach(e=>{const b=document.createElement('button');b.className=`event-chip ${e.type==='task'?'task-chip':''} ${e.completed?'completed':''}`;const color=calendarColors[e.category]||'#557bea';b.style.borderColor=color;b.style.background=hexAlpha(color,'18');b.style.color=color;const range=e.time+(e.endTime?'–'+e.endTime:'');const prefix=e.type==='task'?(e.completed?'☑ ':`☐ <time>${formatRemaining(e)}</time>`):(!e.allDay&&e.time?`<time>${range}</time>`:e.allDay?'<time>終日</time>':'');b.innerHTML=`${prefix}${esc(e.title)}`;b.onclick=x=>{x.stopPropagation();openEvent(e)};cell.appendChild(b)});
    if(matches.length>itemLimit)cell.insertAdjacentHTML('beforeend',`<div class="more-events">他 ${matches.length-itemLimit} 件</div>`);
    cell.onclick=()=>openDayAgenda(k);grid.appendChild(cell);
  }
}
function renderMini(){
  $('#miniMonthLabel').textContent=`${cursor.getFullYear()}年 ${cursor.getMonth()+1}月`;
  const el=$('#miniCalendar');el.innerHTML='';['日','月','火','水','木','金','土'].forEach(x=>el.insertAdjacentHTML('beforeend',`<span class="mini-weekday">${x}</span>`));
  const start=new Date(cursor.getFullYear(),cursor.getMonth(),1-cursor.getDay());
  for(let i=0;i<42;i++){const d=new Date(start);d.setDate(start.getDate()+i);const s=document.createElement('span');s.textContent=d.getDate();s.dataset.date=keyDate(d);s.title=`${d.getMonth()+1}月${d.getDate()}日の予定を見る`;if(d.getMonth()!==cursor.getMonth())s.className='dim';if(keyDate(d)===keyDate(today))s.className='selected';s.onclick=()=>openDayAgenda(s.dataset.date);el.appendChild(s)}
}
let agendaDate=keyDate(today);
function calendarItemTime(item){if(item.type==='task')return item.dueTime||'23:59';return item.allDay||!item.time?'00:00':item.time}
function compareCalendarItems(a,b){const byTime=calendarItemTime(a).localeCompare(calendarItemTime(b));return byTime||a.title.localeCompare(b.title,'ja')}
function openDayAgenda(date){agendaDate=date;const d=new Date(date+'T00:00:00');$('#dayAgendaTitle').textContent=`${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日の予定`;const items=events.filter(e=>e.date<=date&&(e.endDate||e.date)>=date&&filters.has(e.category)).sort(compareCalendarItems);$('#dayAgendaList').innerHTML=items.length?items.map(e=>{const color=calendarColors[e.category]||'#557bea',range=e.time+(e.endTime?'–'+e.endTime:'');return `<button class="agenda-item ${e.completed?'completed':''}" data-agenda-id="${e.id}" style="--agenda-color:${color}"><span class="agenda-time">${e.type==='task'?(e.completed?'☑':'☐'):(range||'終日')}</span><span class="agenda-content"><strong>${esc(e.title)}</strong><small>${esc(e.category)}${e.memo?' ・ '+esc(e.memo).slice(0,45):''}</small></span><span>›</span></button>`}).join(''):'<div class="agenda-empty">この日の予定はありません</div>';$('#agendaOpenDiary').classList.toggle('hidden',!diaryEntries[date]);$$('[data-agenda-id]').forEach(b=>b.onclick=()=>{const item=events.find(e=>e.id===b.dataset.agendaId);$('#dayAgendaDialog').close();openEvent(item)});$('#dayAgendaDialog').showModal()}
$('#closeDayAgenda').onclick=()=>$('#dayAgendaDialog').close();$('#agendaNewItem').onclick=()=>{$('#dayAgendaDialog').close();openEvent(null,agendaDate)};
$('#agendaOpenDiary').onclick=()=>{$('#dayAgendaDialog').close();$('[data-view="diary"]').click();loadDiary(agendaDate)};
function renderNotes(){
  $('#noteCount').textContent=notes.length;const q=$('#searchInput').value.trim().toLowerCase();
  const list=notes.filter(n=>(activeNotebook==='すべて'||n.notebook===activeNotebook)&&(!q||(n.title+' '+n.body).toLowerCase().includes(q))).sort((a,b)=>b.pinned-a.pinned||b.updated-a.updated);
  const cards=list.length?list.map(noteHTML).join(''):'<div class="empty">まだメモがありません。<br>思いついたことを書き留めましょう。</div>';
  $('#quickNotesList').innerHTML=cards;$('#notesGrid').innerHTML=cards;
  $$('.note-card').forEach(c=>c.onclick=()=>openNote(notes.find(n=>n.id===c.dataset.id)));
}
function noteHTML(n){const color=notebookColors[n.notebook]||'#557bea';return `<article class="note-card" data-id="${n.id}"><div class="notebook-badge" style="background:${hexAlpha(color,'18')};color:${color}">${esc(n.notebook)}</div><h3>${n.pinned?'<span class="pin">◆</span> ':''}${esc(n.title)}</h3><p>${esc(n.body).slice(0,180)}</p><div class="note-meta"><span>${new Date(n.updated).toLocaleDateString('ja-JP')}</span><span>編集 ›</span></div></article>`}
const moodEmoji={'最高':'😄','良い':'🙂','普通':'😐','疲れた':'😮‍💨','つらい':'😔'};let diarySaveTimer;
function saveCurrentDiary(){clearTimeout(diarySaveTimer);const date=$('#diaryDate').value,title=$('#diaryTitle').value.trim(),body=$('#diaryBody').value.trim();if(!date)return;if(!title&&!body&&!selectedMood){$('#diarySaveStatus').textContent='内容を入力してください';return}diaryEntries[date]={date,title,body,mood:selectedMood,updated:Date.now()};localStorage.setItem('tsukinote-diary',JSON.stringify(diaryEntries));recordLocalChange();$('#diarySaveStatus').textContent='保存済み';renderDiaryHistory()}
function queueDiarySave(){clearTimeout(diarySaveTimer);$('#diarySaveStatus').textContent='自動保存中…';diarySaveTimer=setTimeout(saveCurrentDiary,900)}
function loadDiary(date){clearTimeout(diarySaveTimer);const entry=diaryEntries[date];$('#diaryDate').value=date;$('#diaryTitle').value=entry?.title||'';$('#diaryBody').value=entry?.body||'';selectedMood=entry?.mood||'';$$('[data-mood]').forEach(b=>b.classList.toggle('selected',b.dataset.mood===selectedMood));$('#diaryWordCount').textContent=`${($('#diaryTitle').value+$('#diaryBody').value).length}文字`;$('#diarySaveStatus').textContent=entry?'保存済み':'新しい日記';$('#deleteDiary').style.visibility=entry?'visible':'hidden'}
function renderDiaryHistory(){const q=$('#diarySearch')?.value.trim().toLowerCase()||'',entries=Object.values(diaryEntries).filter(e=>!q||(e.title+' '+e.body).toLowerCase().includes(q)).sort((a,b)=>b.date.localeCompare(a.date));$('#diaryCount').textContent=Object.keys(diaryEntries).length;$('#diaryHistoryList').innerHTML=entries.length?entries.map(e=>{const d=new Date(e.date+'T00:00:00');return `<button class="diary-history-item" data-diary-date="${e.date}"><span class="diary-history-date"><strong>${d.getDate()}</strong><small>${d.getFullYear()}.${pad(d.getMonth()+1)}</small></span><span class="diary-history-content"><strong>${esc(e.title||'無題の日記')}</strong><small>${esc(e.body).slice(0,55)}</small></span><span class="diary-history-mood">${moodEmoji[e.mood]||'・'}</span></button>`}).join(''):'<div class="diary-empty">まだ日記がありません。<br>今日の出来事を書いてみましょう。</div>';$$('[data-diary-date]').forEach(b=>b.onclick=()=>loadDiary(b.dataset.diaryDate))}
$('#diaryDate').onchange=e=>loadDiary(e.target.value);$('#diaryTitle').oninput=$('#diaryBody').oninput=()=>{$('#diaryWordCount').textContent=`${($('#diaryTitle').value+$('#diaryBody').value).length}文字`;queueDiarySave()};$$('[data-mood]').forEach(b=>b.onclick=()=>{selectedMood=b.dataset.mood;$$('[data-mood]').forEach(x=>x.classList.toggle('selected',x===b));queueDiarySave()});$('#saveDiary').onclick=saveCurrentDiary;$('#deleteDiary').onclick=()=>{const date=$('#diaryDate').value;if(!diaryEntries[date]||!confirm('この日の日記を削除しますか？'))return;delete diaryEntries[date];localStorage.setItem('tsukinote-diary',JSON.stringify(diaryEntries));recordLocalChange();loadDiary(date);renderDiaryHistory()};$('#diarySearch').oninput=renderDiaryHistory;loadDiary(keyDate(today));

function openEvent(e,date){
  $('#eventForm').reset();$('#eventId').value=e?.id||'';$('#eventDialogTitle').textContent=e?'予定を編集':'新しい予定';
  const start=e?.date||date||keyDate(today);editingType=e?.type||'event';$('#eventTitle').value=e?.title||'';$('#eventDate').value=start;$('#eventEndDate').value=e?.endDate||start;$('#eventAllDay').checked=e?.allDay||false;$('#eventTime').value=e?.time||'';$('#eventEndTime').value=e?.endTime||'';$('#taskDueTime').value=e?.dueTime||'23:59';$('#taskCompleted').checked=e?.completed||false;$('#remind30').checked=e?.reminders?.thirty||false;$('#remindHour').checked=e?.reminders?.hour||false;$('#remindDay').checked=e?.reminders?.day||false;$('#eventCategory').value=e?.category||calendars[0];$('#eventMemo').value=e?.memo||'';updateNotificationStatus();updateItemType();toggleAllDay();$('#deleteEvent').style.visibility=e?'visible':'hidden';$('#eventDialog').showModal();setTimeout(()=>$('#eventTitle').focus(),50);
}
function openNote(n){
  $('#noteForm').reset();$('#noteId').value=n?.id||'';$('#noteTitle').value=n?.title||'';$('#noteNotebook').value=n?.notebook||(activeNotebook==='すべて'?notebooks[0]:activeNotebook);$('#noteBody').value=n?.body||'';$('#notePinned').checked=n?.pinned||false;$('#deleteNote').style.visibility=n?'visible':'hidden';$('#noteDialog').showModal();setTimeout(()=>$('#noteTitle').focus(),50);
}
$('#eventForm').onsubmit=e=>{if($('#eventEndDate').value<$('#eventDate').value){e.preventDefault();alert('終了日は開始日以降にしてください');return}if(editingType==='event'&&!$('#eventAllDay').checked&&$('#eventDate').value===$('#eventEndDate').value&&$('#eventTime').value&&$('#eventEndTime').value&&$('#eventEndTime').value<=$('#eventTime').value){e.preventDefault();alert('終了時刻は開始時刻より後にしてください');return}const id=$('#eventId').value,timed=editingType==='event'&&!$('#eventAllDay').checked;const item={id:id||crypto.randomUUID(),type:editingType,title:$('#eventTitle').value.trim(),date:$('#eventDate').value,endDate:$('#eventEndDate').value,allDay:editingType==='event'&&$('#eventAllDay').checked,time:timed?$('#eventTime').value:'',endTime:timed?$('#eventEndTime').value:'',dueTime:editingType==='task'?$('#taskDueTime').value:'',completed:editingType==='task'&&$('#taskCompleted').checked,reminders:{thirty:$('#remind30').checked,hour:$('#remindHour').checked,day:$('#remindDay').checked},category:$('#eventCategory').value,memo:$('#eventMemo').value.trim(),updated:Date.now()};events=id?events.map(e=>e.id===id?item:e):[...events,item];save();if(item.reminders.thirty||item.reminders.hour||item.reminders.day)requestNotificationPermission();render()};
$('#noteForm').onsubmit=()=>{const id=$('#noteId').value;const item={id:id||crypto.randomUUID(),title:$('#noteTitle').value.trim(),notebook:$('#noteNotebook').value,body:$('#noteBody').value.trim(),pinned:$('#notePinned').checked,updated:Date.now()};notes=id?notes.map(n=>n.id===id?item:n):[item,...notes];save();render()};
$('#deleteEvent').onclick=()=>{const id=$('#eventId').value,deleted=JSON.parse(localStorage.getItem('tsukinote-deleted-events')||'{}');if(id)deleted[id]=Date.now();localStorage.setItem('tsukinote-deleted-events',JSON.stringify(deleted));events=events.filter(e=>e.id!==id);save();$('#eventDialog').close();render()};
$('#deleteNote').onclick=()=>{notes=notes.filter(n=>n.id!==$('#noteId').value);save();$('#noteDialog').close();render()};
$('#newEventButton').onclick=()=>{closeMobileSidebar();openEvent()};$('#mobileNewEvent').onclick=()=>openEvent();$('#newNoteButton').onclick=()=>openNote();
function toggleAllDay(){$('#eventTimeLabel').classList.toggle('hidden',editingType==='event'&&$('#eventAllDay').checked)}
function updateItemType(){$$('[data-item-type]').forEach(b=>b.classList.toggle('selected',b.dataset.itemType===editingType));$('#scheduleOptions').classList.toggle('hidden',editingType==='task');$('#taskDueTimeLabel').classList.toggle('hidden',editingType!=='task');$('#taskCompleteLabel').classList.toggle('hidden',editingType!=='task');$('#reminderOptions').classList.toggle('hidden',editingType!=='event');$('#eventDialogTitle').textContent=$('#eventId').value?(editingType==='task'?'タスクを編集':'予定を編集'):(editingType==='task'?'新しいタスク':'新しい予定');$('#eventTitle').placeholder=editingType==='task'?'タスクのタイトル':'予定のタイトル'}
$$('[data-item-type]').forEach(b=>b.onclick=()=>{editingType=b.dataset.itemType;updateItemType();toggleAllDay()});
$('#eventAllDay').onchange=toggleAllDay;$('#eventDate').onchange=()=>{if(!$('#eventEndDate').value||$('#eventEndDate').value<$('#eventDate').value)$('#eventEndDate').value=$('#eventDate').value};
$('#addQuickNote').onclick=()=>{const body=$('#quickNoteInput').value.trim();if(!body)return;notes.unshift({id:crypto.randomUUID(),title:body.split('\n')[0].slice(0,30)||'無題のメモ',body,notebook:activeNotebook==='すべて'?notebooks[0]:activeNotebook,pinned:false,updated:Date.now()});$('#quickNoteInput').value='';save();render()};
$('#prevMonth').onclick=()=>{calendarMode==='month'?cursor.setMonth(cursor.getMonth()-1):cursor.setDate(cursor.getDate()-7);render()};$('#nextMonth').onclick=()=>{calendarMode==='month'?cursor.setMonth(cursor.getMonth()+1):cursor.setDate(cursor.getDate()+7);render()};$('#miniPrev').onclick=()=>{cursor.setMonth(cursor.getMonth()-1);render()};$('#miniNext').onclick=()=>{cursor.setMonth(cursor.getMonth()+1);render()};$('#todayButton').onclick=()=>{cursor=calendarMode==='month'?new Date(today.getFullYear(),today.getMonth(),1):new Date(today);render()};
$('#weekViewButton').onclick=()=>{calendarMode='week';if(cursor.getDate()===1)cursor=new Date(today);$('#weekViewButton').classList.add('selected');$('#monthViewButton').classList.remove('selected');renderCalendar()};$('#monthViewButton').onclick=()=>{calendarMode='month';cursor=new Date(cursor.getFullYear(),cursor.getMonth(),1);$('#monthViewButton').classList.add('selected');$('#weekViewButton').classList.remove('selected');renderCalendar()};
$$('.close-dialog').forEach(b=>b.onclick=()=>$('#eventDialog').close());$$('.close-note-dialog').forEach(b=>b.onclick=()=>$('#noteDialog').close());
function closeMobileSidebar(){$('#sidebar').classList.remove('mobile-open');$('#sidebarBackdrop').classList.remove('visible');document.body.classList.remove('mobile-sidebar-open');$('#mobileMenuButton').setAttribute('aria-expanded','false')}
function setActiveView(view){$$('[data-view]').forEach(button=>button.classList.toggle('active',button.dataset.view===view));$$('.view').forEach(section=>section.classList.toggle('active-view',section.id===`${view}View`));$('#mobileNewEvent').classList.toggle('hidden',view!=='calendar');closeMobileSidebar();document.querySelector('.main').scrollTo({top:0,behavior:'smooth'})}
$$('[data-view]').forEach(b=>b.onclick=()=>setActiveView(b.dataset.view));
$('#mobileMenuButton').onclick=()=>{const open=!$('#sidebar').classList.contains('mobile-open');$('#sidebar').classList.toggle('mobile-open',open);$('#sidebarBackdrop').classList.toggle('visible',open);document.body.classList.toggle('mobile-sidebar-open',open);$('#mobileMenuButton').setAttribute('aria-expanded',String(open))};$('#sidebarBackdrop').onclick=closeMobileSidebar;
$('#searchInput').oninput=render;$('#themeButton').onclick=()=>document.body.classList.toggle('dark');
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#searchInput').focus()}if(e.key==='n'&&(e.ctrlKey||e.metaKey)){e.preventDefault();openEvent()}});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMobileSidebar()});
function updateNotificationStatus(){if(localStorage.getItem('tsukinote-push-key')){$('#notificationStatus').textContent='プッシュ通知オン';return}if(!('Notification'in window)){$('#notificationStatus').textContent='このブラウザは通知非対応';return}$('#notificationStatus').textContent=Notification.permission==='granted'?'この画面を開いている間は通知オン':Notification.permission==='denied'?'通知がブロックされています':'「データ」からプッシュ通知を設定'}
function taskDeadline(task){return new Date(`${task.endDate||task.date}T${task.dueTime||'23:59'}:00`).getTime()}
function formatRemaining(task){const ms=taskDeadline(task)-Date.now(),abs=Math.abs(ms),days=Math.floor(abs/86400000),hours=Math.floor(abs%86400000/3600000),mins=Math.floor(abs%3600000/60000),secs=Math.floor(abs%60000/1000);const parts=[];if(days)parts.push(`${days}日`);if(days||hours)parts.push(`${hours}時間`);if(days||hours||mins)parts.push(`${mins}分`);parts.push(`${secs}秒`);const text=parts.join('');return ms<0?`期限超過 ${text}`:`あと${text}`}
function renderSidebarTasks(){
  const tasks=events.filter(e=>e.type==='task'&&!e.completed).sort((a,b)=>taskDeadline(a)-taskDeadline(b));
  $('#openTaskCount').textContent=`${tasks.length}件`;$('#mobileOpenTaskCount').textContent=`${tasks.length}件`;
  $('#sidebarTaskList').innerHTML=tasks.slice(0,5).map(t=>{const overdue=taskDeadline(t)<Date.now(),color=calendarColors[t.category]||'#557bea';return `<button class="sidebar-task ${overdue?'overdue':''}" data-sidebar-task="${t.id}" style="--task-color:${color};--task-bg:${hexAlpha(color,'14')}"><span><i style="background:${color}"></i>${esc(t.title)}</span><small>${formatRemaining(t)}</small></button>`}).join('')||'<div class="sidebar-task-empty">未完了タスクはありません</div>';
  $('#mobileTaskList').innerHTML=tasks.slice(0,4).map(t=>{const overdue=taskDeadline(t)<Date.now(),color=calendarColors[t.category]||'#557bea';return `<button class="mobile-task-card ${overdue?'overdue':''}" data-mobile-task="${t.id}" style="--task-color:${color};--task-bg:${hexAlpha(color,'14')}"><strong>${esc(t.title)}</strong><small>${formatRemaining(t)}</small></button>`}).join('')||'<div class="mobile-task-empty">未完了タスクはありません</div>';
  $$('[data-sidebar-task]').forEach(b=>b.onclick=()=>openEvent(events.find(e=>e.id===b.dataset.sidebarTask)));$$('[data-mobile-task]').forEach(b=>b.onclick=()=>openEvent(events.find(e=>e.id===b.dataset.mobileTask)));
}
async function requestNotificationPermission(){if(!('Notification'in window)||Notification.permission!=='default')return;try{await Notification.requestPermission();updateNotificationStatus()}catch(e){console.warn('通知を有効にできませんでした')}}
function checkReminders(){if(localStorage.getItem('tsukinote-push-key')||!('Notification'in window)||Notification.permission!=='granted')return;const now=Date.now(),sent=JSON.parse(localStorage.getItem('daynote-sent-reminders')||'{}');events.filter(e=>e.type==='event').forEach(e=>{const base=new Date(`${e.date}T${e.time||'09:00'}:00`).getTime();[['thirty',1800000,'30分後'],['hour',3600000,'1時間後'],['day',86400000,'明日']].forEach(([kind,offset,label])=>{const notifyAt=base-offset,key=`${e.id}-${kind}-${e.date}`;if(e.reminders?.[kind]&&!sent[key]&&now>=notifyAt&&now<notifyAt+60000){new Notification(e.title,{body:`${label}の予定です${e.time?'（'+e.time+'）':''}`,tag:key});sent[key]=Date.now()}})});localStorage.setItem('daynote-sent-reminders',JSON.stringify(sent))}
setInterval(checkReminders,30000);setInterval(renderSidebarTasks,1000);checkReminders();

const pushApiBase='https://tsukinotepush-hnbabucsa3bpg0f5.japanwest-01.azurewebsites.net/api';
let pushSyncTimer=null,pushSyncBusy=false;
let calendarSyncTimer=null,calendarSyncBusy=false;
function setPushStatus(message,state=''){
  $('#pushStatus').textContent=message;$('#pushIndicator').textContent=state||'未設定';$('#pushIndicator').className=state==='通知オン'?'synced':state==='エラー'?'error':'';
  const enabled=!!localStorage.getItem('tsukinote-push-key');$('#enablePush').classList.toggle('hidden',enabled);$('#disablePush').classList.toggle('hidden',!enabled);$('#pushAccessKey').classList.toggle('hidden',enabled);$('#pushAccessKey').closest('label').classList.toggle('hidden',enabled);updateNotificationStatus();
}
function pushDeviceId(){let id=localStorage.getItem('tsukinote-push-device-id');if(!id){id=crypto.randomUUID();localStorage.setItem('tsukinote-push-device-id',id)}return id}
function urlBase64ToUint8Array(value){const padding='='.repeat((4-value.length%4)%4),base64=(value+padding).replace(/-/g,'+').replace(/_/g,'/'),raw=atob(base64);return Uint8Array.from([...raw].map(char=>char.charCodeAt(0)))}
function buildPushReminders(){
  const offsets=[['thirty',1800000,'30分後'],['hour',3600000,'1時間後'],['day',86400000,'明日']],result=[];
  events.filter(item=>item.type==='event').forEach(item=>{const time=item.time||'09:00',base=new Date(`${item.date}T${time}:00`).getTime();offsets.forEach(([kind,offset,label])=>{if(!item.reminders?.[kind])return;const notifyAt=base-offset;if(notifyAt<Date.now()-86400000)return;result.push({id:`${item.id}-${kind}-${item.date}-${time}`,notifyAt:new Date(notifyAt).toISOString(),title:item.title,body:`${label}の予定です${item.time?'（'+item.time+'）':''}`,tag:`${item.id}-${kind}`})})});
  return result;
}
async function pushRequest(path,options={}){
  const key=options.key||localStorage.getItem('tsukinote-azure-key')||localStorage.getItem('tsukinote-push-key')||'';
  const response=await fetch(pushApiBase+path,{...options,headers:{'Content-Type':'application/json','X-TsukiNote-Key':key,...options.headers}});
  if(!response.ok){const detail=await response.json().catch(()=>({}));const error=new Error(detail.error||`push-${response.status}`);error.status=response.status;throw error}return response.json().catch(()=>({}));
}
function setCalendarSyncStatus(message,state=''){
  $('#calendarSyncStatus').textContent=message;$('#calendarSyncIndicator').textContent=state||'未設定';$('#calendarSyncIndicator').className=state==='同期済み'?'synced':state==='エラー'?'error':'';
  const enabled=!!localStorage.getItem('tsukinote-azure-key');
  $('#calendarAccessKeyLabel').classList.toggle('hidden',enabled);$('#enableCalendarSync').classList.toggle('hidden',enabled);$('#syncCalendarNow').classList.toggle('hidden',!enabled);$('#disableCalendarSync').classList.toggle('hidden',!enabled);$('#syncCalendarNow').disabled=calendarSyncBusy||!enabled;
}
function normalizeCalendarEvents(list){return list.map(e=>({...e,type:e.type||'event',endDate:e.endDate||e.date,endTime:e.endTime||'',dueTime:e.dueTime||'23:59',allDay:e.allDay||false,completed:e.completed||false,reminders:e.reminders||{hour:false,day:false},updated:Number(e.updated)||1}))}
async function syncAzureCalendar(){
  const key=localStorage.getItem('tsukinote-azure-key');if(calendarSyncBusy||!key||!navigator.onLine)return;calendarSyncBusy=true;clearTimeout(calendarSyncTimer);setCalendarSyncStatus('Azureと予定を統合しています…','同期中');
  try{
    const deleted=JSON.parse(localStorage.getItem('tsukinote-deleted-events')||'{}'),state=await pushRequest('/calendar-data',{method:'POST',key,body:JSON.stringify({events,deleted})});
    if(!Array.isArray(state.events)||!state.deleted||typeof state.deleted!=='object')throw new Error('invalid-calendar-state');
    events=normalizeCalendarEvents(state.events);localStorage.setItem('daynote-events',JSON.stringify(events));localStorage.setItem('tsukinote-deleted-events',JSON.stringify(state.deleted));localStorage.setItem('tsukinote-calendar-last-sync',String(Date.now()));render();schedulePushReminderSync();setCalendarSyncStatus(`同期しました（${new Date().toLocaleString('ja-JP')}）`,'同期済み');
  }catch(error){console.warn('Azure予定同期に失敗しました',error);setCalendarSyncStatus(error.status===401?'アクセスコードが一致しません。同期設定を解除して再登録してください。':error.status===503?'Azure Functionsが停止中です。Azureで再起動してから再試行してください。':'予定を同期できませんでした。通信状態を確認してください。','エラー')}
  finally{calendarSyncBusy=false;$('#syncCalendarNow').disabled=!localStorage.getItem('tsukinote-azure-key')}
}
function scheduleAzureCalendarSync(delay=1800){if(!localStorage.getItem('tsukinote-azure-key')){setCalendarSyncStatus('Azureのアクセスコードを登録すると、通知とは別に予定とタスクを自動同期できます。','未設定');return}clearTimeout(calendarSyncTimer);calendarSyncTimer=setTimeout(syncAzureCalendar,delay)}
async function enableAzureCalendarSync(){
  const key=$('#calendarAccessKey').value.trim();if(key.length<20){setCalendarSyncStatus('20文字以上のAzureアクセスコードを入力してください。','エラー');return}
  $('#enableCalendarSync').disabled=true;setCalendarSyncStatus('Azureへの接続を確認しています…','設定中');
  try{await pushRequest('/calendar-data',{method:'GET',key});localStorage.setItem('tsukinote-azure-key',key);$('#calendarAccessKey').value='';setCalendarSyncStatus('接続できました。予定とタスクを同期します。','同期中');await syncAzureCalendar()}
  catch(error){setCalendarSyncStatus(error.status===401?'アクセスコードが一致しません。':error.status===503?'Azure Functionsが停止中です。Azureで再起動してから再試行してください。':'Azureに接続できませんでした。通信状態を確認してください。','エラー')}
  finally{$('#enableCalendarSync').disabled=false}
}
function disableAzureCalendarSync(){localStorage.removeItem('tsukinote-azure-key');clearTimeout(calendarSyncTimer);$('#calendarAccessKey').value='';setCalendarSyncStatus('Azure同期を解除しました。端末内の予定は削除されません。','未設定')}
async function syncPushReminders(){
  if(pushSyncBusy||!localStorage.getItem('tsukinote-push-key')||!navigator.onLine)return;pushSyncBusy=true;clearTimeout(pushSyncTimer);
  try{await pushRequest('/reminders',{method:'POST',body:JSON.stringify({reminders:buildPushReminders()})});setPushStatus('予定の通知時刻をAzureと同期しました。','通知オン')}
  catch(error){console.warn('プッシュ通知時刻を同期できませんでした',error);setPushStatus(error.status===401?'アクセスコードが一致しません。いったん通知を解除して再設定してください。':'通知サーバーと同期できませんでした。通信状態を確認してください。','エラー')}
  finally{pushSyncBusy=false}
}
function schedulePushReminderSync(){if(!localStorage.getItem('tsukinote-push-key'))return;clearTimeout(pushSyncTimer);pushSyncTimer=setTimeout(syncPushReminders,1800)}
async function enablePushNotifications(){
  const key=$('#pushAccessKey').value.trim();if(key.length<20){setPushStatus('20文字以上の通知アクセスコードを入力してください。','エラー');return}
  if(!isSecureContext||!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window)){setPushStatus('この環境はWebプッシュ通知に対応していません。GitHub Pagesをホーム画面に追加して開いてください。','エラー');return}
  $('#enablePush').disabled=true;setPushStatus('通知を設定しています…','設定中');
  try{
    const permission=await Notification.requestPermission();if(permission!=='granted')throw new Error('permission-denied');
    const configResponse=await fetch(pushApiBase+'/push-config',{cache:'no-store'});if(configResponse.status===503)throw new Error('server-unavailable');if(!configResponse.ok)throw new Error('server-not-configured');const config=await configResponse.json();
    const registration=await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;
    let subscription=await registration.pushManager.getSubscription();if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(config.publicKey)});
    await pushRequest('/push-subscriptions',{method:'POST',key,body:JSON.stringify({deviceId:pushDeviceId(),subscription:subscription.toJSON()})});
    localStorage.setItem('tsukinote-push-key',key);if(!localStorage.getItem('tsukinote-azure-key'))localStorage.setItem('tsukinote-azure-key',key);await syncAzureCalendar();await syncPushReminders();setPushStatus('この端末への通知を有効にしました。','通知オン');
  }catch(error){console.warn('プッシュ通知を有効にできませんでした',error);const message=error.message==='permission-denied'?'通知が許可されませんでした。端末の設定を確認してください。':error.message==='server-unavailable'?'Azure Functionsが停止中です。Azureで再起動してください。':error.message==='server-not-configured'?'Azure側の通知鍵がまだ設定されていません。':'通知を有効にできませんでした。アクセスコードと通信状態を確認してください。';setPushStatus(message,'エラー')}
  finally{$('#enablePush').disabled=false}
}
async function disablePushNotifications(){
  try{const registration=await navigator.serviceWorker.getRegistration('./sw.js'),subscription=await registration?.pushManager.getSubscription();if(subscription){try{await pushRequest('/push-subscriptions',{method:'DELETE',body:JSON.stringify({endpoint:subscription.endpoint})})}catch{}await subscription.unsubscribe()}}
  finally{localStorage.removeItem('tsukinote-push-key');$('#pushAccessKey').value='';setPushStatus('この端末のプッシュ通知を解除しました。Azure予定同期はそのまま利用できます。','未設定')}
}
async function initializePushNotifications(){
  const key=localStorage.getItem('tsukinote-push-key');if(!key){setPushStatus('iPhoneではSafariの共有メニューから「ホーム画面に追加」したTsukiNoteで設定してください。','未設定');return}
  if(!('serviceWorker'in navigator)||!('PushManager'in window)){setPushStatus('この端末はWebプッシュ通知に対応していません。','エラー');return}
  try{await navigator.serviceWorker.register('./sw.js');const registration=await navigator.serviceWorker.ready,subscription=await registration.pushManager.getSubscription();if(subscription){setPushStatus('この端末の通知は有効です。','通知オン');scheduleAzureCalendarSync(0);schedulePushReminderSync()}else{localStorage.removeItem('tsukinote-push-key');setPushStatus('通知登録が解除されています。もう一度有効にしてください。','未設定')}}catch{setPushStatus('通知の状態を確認できませんでした。','エラー')}
}
$('#enablePush').onclick=enablePushNotifications;$('#disablePush').onclick=disablePushNotifications;
$('#enableCalendarSync').onclick=enableAzureCalendarSync;$('#disableCalendarSync').onclick=disableAzureCalendarSync;$('#syncCalendarNow').onclick=syncAzureCalendar;
function esc(s=''){return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function hexAlpha(hex,alpha){return hex+alpha}
const backupKeys=['daynote-events','daynote-notes','daynote-calendars','daynote-notebooks','daynote-calendar-colors','daynote-notebook-colors','daynote-goals','tsukinote-exercises','tsukinote-exercise-records','tsukinote-exercise-targets','tsukinote-diary','tsukinote-deleted-events'];
const oneDriveBackupKeys=backupKeys.filter(key=>key!=='daynote-events'&&key!=='tsukinote-deleted-events');
const backupArrayKeys=new Set(['daynote-events','daynote-notes','daynote-calendars','daynote-notebooks','tsukinote-exercises']);
const cloudClientId='4e330336-9a95-42ff-a190-f7c91d71be89';
const cloudScopes=['Files.ReadWrite.AppFolder'];
const cloudFileUrl='https://graph.microsoft.com/v1.0/me/drive/special/approot:/TsukiNote-data.json:/content';
const cloudFileMetadataUrl='https://graph.microsoft.com/v1.0/me/drive/special/approot:/TsukiNote-data.json';
const cloudRedirectUri='https://yappi21.github.io/TsukiNote-ver1/';
let cloudSyncTimer=null,cloudSyncSuppressed=false,cloudSyncBusy=false,cloudReconcileBusy=false,cloudAccount=null,msalApp=null;
function recordLocalChange(){
  if(cloudSyncSuppressed)return;
  localStorage.setItem('tsukinote-local-updated-at',String(Date.now()));
  if(cloudAccount&&localStorage.getItem('tsukinote-cloud-linked')==='1')scheduleCloudSync();
}
function scheduleCloudSync(){clearTimeout(cloudSyncTimer);cloudSyncTimer=setTimeout(()=>uploadCloudData(true),1800)}
function validateBackup(backup,allowedKeys=backupKeys){
  if(!backup||backup.format!=='tsukinote-backup'||backup.version!==1||!backup.data||typeof backup.data!=='object')throw new Error('format');
  const entries=Object.entries(backup.data).filter(([key])=>allowedKeys.includes(key));
  if(!entries.length)throw new Error('empty');
  entries.forEach(([key,value])=>{if(typeof value!=='string')throw new Error('value');const parsed=JSON.parse(value),shouldBeArray=backupArrayKeys.has(key);if(shouldBeArray!==Array.isArray(parsed)||(!shouldBeArray&&(!parsed||typeof parsed!=='object')))throw new Error('shape')});
  return entries;
}
function applyBackupData(backup,allowedKeys=backupKeys){const entries=validateBackup(backup,allowedKeys);cloudSyncSuppressed=true;allowedKeys.forEach(key=>localStorage.removeItem(key));entries.forEach(([key,value])=>localStorage.setItem(key,value));cloudSyncSuppressed=false}
function setCloudStatus(message,state=''){
  $('#cloudSyncStatus').textContent=message;$('#cloudSyncIndicator').textContent=state||(!cloudAccount?'未接続':'接続済み');
  $('#cloudSyncIndicator').className=state==='同期済み'?'synced':state==='エラー'?'error':'';
}
function updateCloudControls(){
  const connected=!!cloudAccount;$('#cloudLogin').classList.toggle('hidden',connected);$('#cloudUpload').classList.toggle('hidden',!connected);$('#cloudDownload').classList.toggle('hidden',!connected);$('#cloudLogout').classList.toggle('hidden',!connected);
  if(connected)setCloudStatus(`${cloudAccount.username} で接続しています。初回は保存元を選んでください。`,'接続済み');
}
async function cloudAccessToken(){
  if(!msalApp||!cloudAccount)throw new Error('signin');
  try{return (await msalApp.acquireTokenSilent({account:cloudAccount,scopes:cloudScopes})).accessToken}
  catch(error){console.warn('OneDriveトークンを更新できませんでした',error);throw new Error('reauth')}
}
async function readCloudSnapshot(){
  const token=await cloudAccessToken(),headers={Authorization:`Bearer ${token}`};
  const metadataResponse=await fetch(cloudFileMetadataUrl,{headers});
  if(metadataResponse.status===404)return null;if(!metadataResponse.ok)throw new Error(`graph-${metadataResponse.status}`);
  const metadata=await metadataResponse.json(),response=await fetch(cloudFileUrl,{headers});
  if(!response.ok)throw new Error(`graph-${response.status}`);const backup=await response.json();validateBackup(backup,oneDriveBackupKeys);return {backup,etag:metadata.eTag||''};
}
async function readCloudData(){return (await readCloudSnapshot())?.backup||null}
async function uploadCloudData(automatic=false){
  if(cloudSyncBusy||!cloudAccount)return;cloudSyncBusy=true;clearTimeout(cloudSyncTimer);setCloudStatus(automatic?'変更をOneDriveへ同期中…':'OneDriveへ保存中…','同期中');
  try{
    cloudSyncSuppressed=true;const localBackup=prepareBackupData(oneDriveBackupKeys);cloudSyncSuppressed=false;let backup,response;
    for(let attempt=0;attempt<3;attempt++){
      const snapshot=await readCloudSnapshot();backup=localBackup;
      const headers={Authorization:`Bearer ${await cloudAccessToken()}`,'Content-Type':'application/json'};if(snapshot?.etag)headers['If-Match']=snapshot.etag;
      response=await fetch(cloudFileUrl,{method:'PUT',headers,body:JSON.stringify(backup)});if(response.status===412)continue;if(!response.ok)throw new Error(`graph-${response.status}`);break;
    }
    if(!response?.ok)throw new Error('sync-conflict');
    const syncedAt=Date.parse(backup.exportedAt);localStorage.setItem('tsukinote-cloud-linked','1');localStorage.setItem('tsukinote-last-cloud-sync',String(syncedAt));localStorage.setItem('tsukinote-local-updated-at',String(syncedAt));setCloudStatus(`同期しました（${new Date(syncedAt).toLocaleString('ja-JP')}）`,'同期済み');
  }catch(error){cloudSyncSuppressed=false;console.warn('OneDriveへ保存できませんでした',error);setCloudStatus(error.message==='reauth'?'ログインの有効期限が切れました。ログアウト後、再度ログインしてください。':'OneDriveへ保存できませんでした。通信状態を確認してください。','エラー')}
  finally{cloudSyncBusy=false}
}
async function downloadCloudData(manual=true){
  if(cloudSyncBusy||!cloudAccount)return;cloudSyncBusy=true;setCloudStatus('OneDriveから読み込み中…','同期中');
  try{
    const backup=await readCloudData();if(!backup){setCloudStatus('OneDriveにTsukiNoteデータがまだありません。この端末から保存してください。','接続済み');return}
    const savedDate=new Date(backup.exportedAt).toLocaleString('ja-JP');if(manual&&!confirm(`${savedDate}のOneDriveにあるメモ・日記などを、この端末へ読み込みます。よろしいですか？`)){setCloudStatus('読み込みをキャンセルしました。','接続済み');return}
    applyBackupData(backup,oneDriveBackupKeys);const syncedAt=Date.parse(backup.exportedAt)||Date.now();localStorage.setItem('tsukinote-cloud-linked','1');localStorage.setItem('tsukinote-last-cloud-sync',String(syncedAt));localStorage.setItem('tsukinote-local-updated-at',String(syncedAt));alert('OneDriveのメモ・日記データを読み込みました。TsukiNoteを再読み込みします。');location.reload();
  }catch(error){console.warn('OneDriveから読み込めませんでした',error);setCloudStatus(error.message==='reauth'?'ログインの有効期限が切れました。ログアウト後、再度ログインしてください。':'OneDriveから読み込めませんでした。','エラー')}
  finally{cloudSyncBusy=false}
}
async function reconcileCloudData(){
  if(localStorage.getItem('tsukinote-cloud-linked')!=='1'||cloudSyncBusy||cloudReconcileBusy)return;cloudReconcileBusy=true;
  try{
    setCloudStatus('OneDriveの更新を確認中…','同期中');const remote=await readCloudData();if(!remote){await uploadCloudData(true);return}
    const remoteAt=Date.parse(remote.exportedAt)||0,lastAt=Number(localStorage.getItem('tsukinote-last-cloud-sync'))||0,localAt=Number(localStorage.getItem('tsukinote-local-updated-at'))||0;
    if(remoteAt>lastAt&&localAt>lastAt){await uploadCloudData(true);return}
    if(remoteAt>lastAt){applyBackupData(remote,oneDriveBackupKeys);localStorage.setItem('tsukinote-last-cloud-sync',String(remoteAt));localStorage.setItem('tsukinote-local-updated-at',String(remoteAt));location.reload();return}
    if(localAt>lastAt){await uploadCloudData(true);return}setCloudStatus('最新の状態です。','同期済み');
  }catch(error){console.warn('自動同期を確認できませんでした',error);setCloudStatus('自動同期を確認できませんでした。「データ」から再試行できます。','エラー')}
  finally{cloudReconcileBusy=false}
}
async function initializeOneDrive(){
  if(!window.msal){setCloudStatus('Microsoftログイン機能を読み込めませんでした。インターネット接続を確認してください。','エラー');return}
  msalApp=new msal.PublicClientApplication({auth:{clientId:cloudClientId,authority:'https://login.microsoftonline.com/consumers',redirectUri:cloudRedirectUri},cache:{cacheLocation:'localStorage',storeAuthStateInCookie:false}});
  try{await msalApp.initialize();const result=await msalApp.handleRedirectPromise();cloudAccount=result?.account||msalApp.getAllAccounts()[0]||null;if(cloudAccount)msalApp.setActiveAccount(cloudAccount);updateCloudControls();if(cloudAccount)await reconcileCloudData()}
  catch(error){console.warn('Microsoftログインを完了できませんでした',error);setCloudStatus('Microsoftログインを完了できませんでした。もう一度お試しください。','エラー')}
}
function prepareBackupData(keys=backupKeys){
  save();saveCollections();saveExercises();saveGoals();
  if($('#diaryDate').value&&($('#diaryTitle').value.trim()||$('#diaryBody').value.trim()||selectedMood))saveCurrentDiary();
  localStorage.setItem('tsukinote-diary',JSON.stringify(diaryEntries));
  const data={};keys.forEach(key=>{const value=localStorage.getItem(key);if(value!==null)data[key]=value});
  return {format:'tsukinote-backup',version:1,app:'TsukiNote',exportedAt:new Date().toISOString(),data};
}
function exportBackup(){
  const backup=prepareBackupData(),blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=`TsukiNote-backup-${keyDate(new Date())}.json`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  $('#backupStatus').textContent='バックアップを書き出しました。大切な場所に保管してください。';
}
async function importBackup(file){
  try{
    const backup=JSON.parse(await file.text());
    const entries=validateBackup(backup);
    const savedDate=backup.exportedAt?new Date(backup.exportedAt).toLocaleString('ja-JP'):'日時不明';
    if(!confirm(`${savedDate}のバックアップを読み込みます。\n現在のTsukiNoteデータは上書きされます。よろしいですか？`)){$('#backupStatus').textContent='読み込みをキャンセルしました。';return}
    cloudSyncSuppressed=true;backupKeys.forEach(key=>localStorage.removeItem(key));entries.forEach(([key,value])=>localStorage.setItem(key,value));cloudSyncSuppressed=false;localStorage.setItem('tsukinote-local-updated-at',String(Date.now()));
    alert('データを復元しました。TsukiNoteを再読み込みします。');location.reload();
  }catch(error){
    console.warn('バックアップを読み込めませんでした',error);$('#backupStatus').textContent='読み込めませんでした。TsukiNoteから書き出したJSONファイルを選んでください。';
  }finally{$('#importFile').value=''}
}
$('#backupButton').onclick=()=>{$('#backupStatus').textContent='';$('#backupDialog').showModal()};
$('#closeBackupDialog').onclick=$('#cancelBackupDialog').onclick=()=>$('#backupDialog').close();
$('#exportData').onclick=exportBackup;$('#importData').onclick=()=>$('#importFile').click();$('#importFile').onchange=e=>{const file=e.target.files[0];if(file)importBackup(file)};
$('#cloudLogin').onclick=()=>{if(location.protocol==='file:'){setCloudStatus('OneDrive同期はGitHub Pagesで公開したTsukiNoteから使用してください。','エラー');return}msalApp?.loginRedirect({scopes:cloudScopes,prompt:'select_account'})};
$('#cloudLogout').onclick=()=>msalApp?.logoutRedirect({account:cloudAccount,postLogoutRedirectUri:cloudRedirectUri});
$('#cloudUpload').onclick=()=>{if(confirm('この端末のメモ・日記などをOneDriveへ保存します。続けますか？'))uploadCloudData(false)};
$('#cloudDownload').onclick=()=>downloadCloudData(true);
renderCollections();render();
initializeOneDrive();
initializePushNotifications();
scheduleAzureCalendarSync(400);
window.addEventListener('online',()=>{if(cloudAccount&&localStorage.getItem('tsukinote-cloud-linked')==='1')reconcileCloudData()});
window.addEventListener('online',()=>scheduleAzureCalendarSync(0));
window.addEventListener('focus',()=>{if(cloudAccount)reconcileCloudData();scheduleAzureCalendarSync(0)});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&cloudAccount)reconcileCloudData();if(!document.hidden)scheduleAzureCalendarSync(0)});
setInterval(()=>{if(cloudAccount&&!document.hidden)reconcileCloudData()},30000);
setInterval(()=>{if(!document.hidden&&localStorage.getItem('tsukinote-azure-key'))scheduleAzureCalendarSync(0)},30000);
