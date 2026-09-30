// Group presentation only: every task retains its ID, revision and permissions.
const placePeopleBefore81=schedulePlacePeople69;
let appendTarget81=null;
schedulePlacePeople69=function(list){
 placePeopleBefore81(list);
 const panel=list.parentNode.querySelector('#schedule-people-top69');if(!panel)return;
 const rows=()=>[...panel.children];
 const rowFor=task=>rows().find(r=>r.dataset.taskIndex===task.dataset.taskIndex);
 const selected=task=>[...rowFor(task).querySelectorAll('.schedule-choice60 input:checked')].map(i=>i.value);
 const known=new Map();
 for(const task of list.querySelectorAll('.schedule-task60')){
  const names=selected(task),key=JSON.stringify([...names].sort());
  if(!task.dataset.group81){task.dataset.group81=appendTarget81?.group||((task.dataset.existingId&&names.length&&known.get(key))||crypto.randomUUID());
   if(appendTarget81)rowFor(task).querySelectorAll('.schedule-choice60 input').forEach(i=>i.checked=appendTarget81.names.includes(i.value));
  }
  if(names.length)known.set(key,task.dataset.group81);
 }
 for(const task of [...list.querySelectorAll('.schedule-task60')]){
  let group=[...list.children].find(g=>g.dataset.groupContainer81===task.dataset.group81);
  if(!group){group=document.createElement('section');group.className='schedule-person-group81';group.dataset.groupContainer81=task.dataset.group81;list.insertBefore(group,task.closest('.schedule-person-group81')||task);}
  group.append(task);task.querySelector('.schedule-add-near70')?.remove();
 }
 list.querySelectorAll('.schedule-person-group81').forEach(g=>{if(!g.querySelector('.schedule-task60'))g.remove()});
 if(!panel.dataset.sync81){panel.dataset.sync81='1';panel.addEventListener('change',event=>{
  const row=event.target.closest('.schedule-people-row69');if(!row)return;
  const task=[...list.querySelectorAll('.schedule-task60')].find(t=>t.dataset.taskIndex===row.dataset.taskIndex);if(!task)return;
  const names=selected(task);
  for(const other of list.querySelectorAll('.schedule-task60'))if(other.dataset.group81===task.dataset.group81&&other!==task)rowFor(other).querySelectorAll('.schedule-choice60 input').forEach(i=>i.checked=names.includes(i.value));
  schedulePlacePeople69(list);
 });}
 [...list.children].forEach((group,index)=>{
  const tasks=[...group.querySelectorAll('.schedule-task60')];if(!tasks.length)return;
  tasks.forEach((task,i)=>{rowFor(task).hidden=i>0;task.querySelector('h3').hidden=i>0;});
  rowFor(tasks[0]).querySelector('strong').textContent='人員名單 · 工作區塊 '+(index+1);
  const heading=tasks[0].querySelector('h3');heading.textContent=selected(tasks[0]).join('、')||'尚未選擇人員';
  let add=group.querySelector('.append-work81');if(!add){add=document.createElement('button');add.type='button';add.className='append-work81';add.textContent='＋ 追加工作';group.append(add);}
  group.append(add);add.onclick=()=>{
   appendTarget81={group:group.dataset.groupContainer81,names:selected(tasks[0])};
   try{document.querySelector(list.id==='schedule-task-list60'?'#schedule-add-task60':'#schedule-group-add65').click();}finally{appendTarget81=null;}
  };
 });
};
function bindAdd81(){
 for(const b of document.querySelectorAll('#schedule-add-task60,#schedule-group-add65')){
  b.textContent='＋ 新增工作區塊';
  if(!b.dataset.guard81){b.dataset.guard81='1';b.addEventListener('click',event=>{if(document.querySelectorAll('#modal .schedule-task60').length>=20){event.stopImmediatePropagation();toast('每次最多可編輯 20 項工作');}},true);}
 }
}
const entryBefore81=scheduleEntryDialog56;
scheduleEntryDialog56=function(...args){entryBefore81(...args);bindAdd81();};
const groupBefore81=scheduleGroupDialog65;
scheduleGroupDialog65=function(...args){groupBefore81(...args);bindAdd81();};
const recordBefore81=scheduleDayRecord56;
scheduleDayRecord56=function(day,section='jobs',...args){
 recordBefore81(day,section,...args);if(section!=='jobs')return;
 const list=document.querySelector('#modal .schedule-daily-list67');if(!list)return;
 const groups=new Map();
 for(const row of [...list.querySelectorAll('.schedule-daily-job67')]){
  const name=row.querySelector('span > strong');if(!name)continue;
  let group=groups.get(name.textContent);if(!group){group=document.createElement('section');group.className='schedule-record-person81';const label=document.createElement('strong');label.className='person-name81';label.textContent=name.textContent;group.append(label);list.insertBefore(group,row);groups.set(name.textContent,group);}
  name.remove();group.append(row);
 }
};
const reportBefore81=scheduleReportDialog56;
scheduleReportDialog56=function(...args){
 reportBefore81(...args);
 if(!matchMedia('(pointer:coarse)').matches&&!matchMedia('(max-width:700px)').matches)return;
 const input=document.querySelector('#modal input[name=photo]');if(!input)return;
 input.classList.add('mobile-photo-input81');
 const camera=document.createElement('input');camera.type='file';camera.accept='image/*';camera.setAttribute('capture','environment');camera.hidden=true;camera.dataset.paste71='1';
 const bar=document.createElement('div');bar.className='mobile-photo-actions81';
 for(const [text,target]of [['直接拍照',camera],['從相簿選擇',input]]){const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=()=>target.click();bar.append(b);}
 input.after(bar,camera);
 camera.onchange=()=>{if(!camera.files?.length)return;const transfer=new DataTransfer();transfer.items.add(camera.files[0]);input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));camera.value='';};
};
