const $=id=>document.getElementById(id);
let INDEX=[],CHAPTERS={},activeGold='SKM-SPN-0001',PRESCRIBER={};let deferredPrompt=null;
const stateKey='skmcis-study-v1';
function state(){try{return JSON.parse(localStorage.getItem(stateKey)||'{}')}catch{return {}}}
function saveState(s){localStorage.setItem(stateKey,JSON.stringify(s))}
function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
const CORE_FILES=["data/sciatica.json","data/cervical-radiculopathy.json","data/mechanical-low-back-pain.json","data/lumbar-disc-herniation-radiculopathy.json","data/lumbar-spinal-stenosis-neurogenic-claudication.json"];
let EXPANSION_FILES=[];
async function loadGoldIndex(){try{const idx=await fetchJSON("gold-chapters/gold-index.json");EXPANSION_FILES=Array.isArray(idx.expansionFiles)?idx.expansionFiles:[]}catch(e){console.warn("Gold index load failed",e);EXPANSION_FILES=[]}}
function normalizeV11(d){
 const red=(d.redFlags||[]).map(x=>typeof x==='string'?x:x.item).filter(Boolean),inv=[];
 if(d.investigations?.principle)inv.push(d.investigations.principle);
 if(d.investigations?.MRI)inv.push('MRI: '+d.investigations.MRI);
 if(d.investigations?.radiographs)inv.push('Radiographs: '+d.investigations.radiographs);
 const mg=[...(d.management?.green||[]),...(d.management?.amber||[]).map(x=>'CAUTION / individualized decision: '+x),...(d.management?.red||[]).map(x=>'URGENT / safety: '+x)];
 const ayText=d.ayurvedaFramework?.text||'Ayurveda correlation remains unvalidated and must be documented in parallel with the modern diagnosis.';
 const src=(d.sources||[]).map(s=>({short:s.organization||'Source',title:s.title||'Reference',url:s.url||'',role:'Source checked '+(s.checked||d.provenance?.lastEvidenceCheck||'')}));
 const patient=[];if(d.patientEducation?.summary)patient.push(d.patientEducation.summary);if(d.patientEducation?.urgent)patient.push(d.patientEducation.urgent);patient.push('This is study/patient-education information and does not replace individual clinical assessment.');
 return {id:d.canonicalId,prescriber:d.prescriber||null,slug:(d.name||'chapter').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),name:d.name,ayurveda:ayText,category:d.category||'SKMCIS Gold Expansion',status:'Gold chapter draft - source checked, clinician validation pending',version:d.contentVersion||'1.0.0',updated:d.provenance?.lastEvidenceCheck||'2026-08-07',synonyms:d.synonyms||[],definition:d.definition||'',presentation:d.clinicalPattern?.typical||[],redFlags:red,exam:d.examination?.core||[],differentials:d.differentials||[],investigations:inv,management:mg,ayurvedaFramework:{vyadhi:'Phenotype / correlation only — not an automatic one-to-one classical equivalent',principle:ayText,assessment:['Nidana Panchaka','Dosha/Doshabheda and Guna','Ama/Nirama','Agni and Koshtha','Dushya/Dhatu','Srotas/Srotodushti','Rogamarga','Bala/Avastha','Samprapti Ghataka'],clinicalFeatures:'Document the modern diagnosis and the individualized Ayurvedic assessment as parallel layers.',treatmentSafety:'Red flags and urgent modern pathways override routine conservative or Panchakarma pathways. Individual contraindication review is required.'},patientHandout:patient,sources:src};
}
function addIndexForGold(D,raw){if(INDEX.some(x=>x.goldChapterId===D.id||x.recordId===D.id))return;INDEX.push({recordId:D.id,name:D.name,category:D.category,sourceLayer:'Gold Expansion',sourceId:D.id,modernName:D.name,ayurveda:D.ayurveda||'Individualized correlation',contentStatus:raw?.contentStatus||'NEW_SOURCE_CHECKED_DRAFT',validationStatus:'Source checked draft - clinician review',provenance:'SKMCIS Gold Expansion Series',goldChapterId:D.id})}
async function fetchJSON(path){const r=await fetch('./'+path,{cache:'no-store'});if(!r.ok)throw new Error(path+' HTTP '+r.status);return r.json()}
async function load(){
 INDEX=await fetch('./data/master-index.json',{cache:'no-store'}).then(r=>r.json());await loadGoldIndex();
 for(const f of CORE_FILES){try{const d=await fetchJSON(f);CHAPTERS[d.id]=d}catch(e){console.warn('Core chapter load failed',e)}}
 for(const f of EXPANSION_FILES){try{const raw=await fetchJSON(f);if(!raw?.canonicalId)continue;const d=normalizeV11(raw);CHAPTERS[d.id]=d;addIndexForGold(d,raw)}catch(e){console.warn('Expansion chapter load failed',e)}}
 try{
   const pr=await fetchJSON('data/prescriber-core-v1.json');
   PRESCRIBER=pr?.chapters||{};
   Object.keys(PRESCRIBER).forEach(id=>{if(CHAPTERS[id])CHAPTERS[id].prescriber=PRESCRIBER[id]});
 }catch(e){console.warn('Prescriber core load failed',e)}
 init();
}
function progressOf(id){return (state().progress||{})[id]||'unread'}
function setProgress(id,status){let s=state();s.progress=s.progress||{};if(status==='unread')delete s.progress[id];else s.progress[id]=status;s.lastGold=id;saveState(s);renderStudyUI();renderGoldSearch();renderReaderProgress()}
function isFavorite(id){return (state().favorites||[]).includes(id)}
function rememberChapter(id){let s=state();s.lastGold=id;s.progress=s.progress||{};if(!s.progress[id])s.progress[id]='reading';saveState(s)}
function init(){
 const layers=[...new Set(INDEX.map(x=>x.sourceLayer))].sort(),statuses=[...new Set(INDEX.map(x=>x.validationStatus))].sort();
 $('layer').innerHTML='<option value="">All source layers</option>';$('status').innerHTML='<option value="">All validation states</option>';
 layers.forEach(x=>$('layer').insertAdjacentHTML('beforeend',`<option>${esc(x)}</option>`));statuses.forEach(x=>$('status').insertAdjacentHTML('beforeend',`<option>${esc(x)}</option>`));
 $('stats').innerHTML=[['Master index',INDEX.length],['Legacy V1 slots',INDEX.filter(x=>x.sourceLayer==='Legacy V1').length],['Reference chart',INDEX.filter(x=>x.sourceLayer==='Anukta 100 Chart').length],['Gold chapters',Object.keys(CHAPTERS).length]].map(([t,n])=>`<div class=stat><b>${n}</b><span>${t}</span></div>`).join('');
 $('goldSelect').innerHTML=Object.values(CHAPTERS).sort((a,b)=>a.name.localeCompare(b.name)).map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
 let st=state();if(st.lastGold&&CHAPTERS[st.lastGold])activeGold=st.lastGold;if(!CHAPTERS[activeGold])activeGold=Object.keys(CHAPTERS)[0];$('goldSelect').value=activeGold;
 $('goldSelect').onchange=()=>openGold($('goldSelect').value,true);
 renderLibrary();renderGold();renderPatient();renderSources();renderGoldSearch();renderReaderProgress();
}
function go(v){document.querySelectorAll('.view').forEach(x=>x.classList.toggle('hidden',x.id!==v));document.querySelectorAll('#nav button').forEach(x=>x.classList.toggle('active',x.dataset.view===v));if(v==='gold'){rememberChapter(activeGold);renderGold();renderGoldSearch();renderReaderProgress()}scrollTo(0,0)}
document.querySelectorAll('#nav button').forEach(b=>b.onclick=()=>go(b.dataset.view));
document.addEventListener('click',e=>{if(e.target.dataset.go)go(e.target.dataset.go)})
function pillFor(x=''){if(x.includes('Validated'))return'green';if(x.includes('Source checked')||x.includes('clinician review'))return'amber';if(x.includes('unresolved')||x.includes('Unrecovered'))return'gray';if(x.includes('Recovered'))return'blue';return'gray'}
function renderLibrary(){let q=$('q').value.toLowerCase(),l=$('layer').value,s=$('status').value;let rows=INDEX.filter(x=>(!q||JSON.stringify(x).toLowerCase().includes(q))&&(!l||x.sourceLayer===l)&&(!s||x.validationStatus===s));$('resultCount').textContent=`${rows.length} records shown`;$('libraryRows').innerHTML=rows.map(x=>{let gid=x.goldChapterId&&CHAPTERS[x.goldChapterId]?x.goldChapterId:'';return `<div class="row ${gid?'clickable':''}" ${gid?`data-gold="${esc(gid)}" tabindex="0" role="button"`:''}><div><b>${esc(x.recordId)}</b><br><small>${esc(x.sourceLayer)}</small></div><div><b>${esc(x.name)}</b><br><small>${esc(x.category)}</small></div><div>${esc(x.ayurveda||'')}</div><div><span class="pill ${pillFor(x.validationStatus)}">${esc(x.validationStatus)}</span>${gid?`<br><small class="openHint">${progressOf(gid)==='completed'?'✓ Completed':progressOf(gid)==='reading'?'◐ Continue':'Open details →'}</small>`:''}</div></div>`}).join('')}
['q','layer','status'].forEach(id=>$(id).addEventListener(id==='q'?'input':'change',renderLibrary));
function openGoldFromRow(row){let gid=row?.dataset.gold;if(gid&&CHAPTERS[gid])openGold(gid,true)}
$('libraryRows').addEventListener('click',e=>openGoldFromRow(e.target.closest('[data-gold]')));
$('libraryRows').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.closest('[data-gold]')){e.preventDefault();openGoldFromRow(e.target.closest('[data-gold]'))}});
const sections=[['definition','Definition & scope','blue'],['classification','Classification','blue'],['pathophysiology','Pathophysiology & root compression','blue'],['anatomy','Anatomy & localization','blue'],['etiology','Etiology / causes','blue'],['riskFactors','Risk factors / recovery modifiers','amber'],['presentation','Clinical presentation','blue'],['redFlags','RED FLAGS - urgent assessment','red'],['history','Focused history','blue'],['exam','Focused examination','blue'],['rootMap','Practical root localization','blue'],['differentials','Differential diagnosis','amber'],['investigations','Investigations & imaging','blue'],['imagingCorrelation','Imaging-clinical correlation rules','amber'],['management','Management principles','green'],['rehab','Rehabilitation / graded return','green'],['outcomes','Outcome measures','blue'],['ayurvedaFramework','Ayurveda diagnostic framework','green'],['researchNote','Research note','amber']];
function list(v){return `<ul>${(v||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`}
function renderPrescriptionLayer(D){
 const p=D.prescriber||{};
 let html='';
 if(p.examination?.length){
   html+=`<h3>Clinical examination checklist</h3>${list(p.examination)}`;
 }
 if(p.investigations?.length){
   html+=`<h3>Preferred investigations</h3><table class="prescriberTable"><tr><th>Investigation</th><th>When / why</th><th>Priority</th></tr>${p.investigations.map(x=>`<tr><td><b>${esc(x.test||'')}</b></td><td>${esc(x.indication||'')}</td><td><span class="rxStatus ${esc(x.level||'blue')}">${esc(x.priority||'Routine')}</span></td></tr>`).join('')}</table>`;
 }
 if(p.medications?.length){
   html+=`<h3>Medication / prescription framework</h3><table class="prescriberTable"><tr><th>Generic</th><th>Formulation</th><th>Typical clinician-reviewed dose</th><th>Duration</th><th>Notes / safety</th></tr>${p.medications.map(x=>`<tr><td><b>${esc(x.generic||'')}</b>${x.brandExamples?.length?`<br><small>Example India brands: ${esc(x.brandExamples.join(', '))}</small>`:''}</td><td>${esc(x.formulation||'')}</td><td>${esc(x.dose||'')}</td><td>${esc(x.duration||'')}</td><td>${esc(x.notes||'')}</td></tr>`).join('')}</table>`;
 }
 if(p.nonDrug?.length) html+=`<h3>Non-drug treatment / rehabilitation</h3>${list(p.nonDrug)}`;
 if(p.followUp?.length) html+=`<h3>Follow-up / reassessment</h3>${list(p.followUp)}`;
 if(html) html+=`<div class="prescriberNote"><b>Clinical safety:</b> These prescribing fields are decision-support drafts. Verify allergies, pregnancy/lactation, renal/hepatic function, age, comorbidities, interactions, current medicines and local formulary before issuing a prescription.</div>`;
 return html;
}

function renderGold(){const D=CHAPTERS[activeGold];if(!D)return;$('goldTitle').textContent=D.name;$('goldMeta').textContent=`${D.id} • ${D.category} • ${D.status} • Updated ${D.updated}`;$('goldSelect').value=activeGold;
 $('quicknav').innerHTML=sections.filter(([id])=>D[id]!=null).map(([id,t])=>`<a href="#sec-${id}" data-section="${id}">${esc(t)}</a>`).join('');
 $('goldContent').innerHTML=sections.filter(([id])=>D[id]!=null).map(([id,t,c])=>{let v=D[id],body='';if(Array.isArray(v)&&id==='rootMap')body=`<table class=rootTable><tr><th>Root</th><th>Typical sensory tendency</th><th>Motor emphasis</th><th>Reflex</th>${v.some(r=>r.typicalDisc)?'<th>Common disc relationship</th>':''}</tr>${v.map(r=>`<tr><td>${esc(r.root)}</td><td>${esc(r.typicalSensory||r.sensory)}</td><td>${esc(r.motor)}</td><td>${esc(r.reflex)}</td>${v.some(x=>x.typicalDisc)?`<td>${esc(r.typicalDisc||'')}</td>`:''}</tr>`).join('')}</table>`;else if(Array.isArray(v))body=list(v);else if(id==='ayurvedaFramework')body=`<p><b>Vyadhi/correlation:</b> ${esc(v.vyadhi)}</p><p>${esc(v.principle)}</p><h3>Assessment domains</h3>${list(v.assessment)}<p><b>Clinical documentation:</b> ${esc(v.clinicalFeatures)}</p><p><b>Safety:</b> ${esc(v.treatmentSafety)}</p>`;else body=`<p>${esc(v)}</p>`;
 if(['exam','investigations','management','outcomes'].includes(id)&&D.prescriber) body+=renderPrescriptionLayer({prescriber:{examination:id==='exam'?D.prescriber.examination:[],investigations:id==='investigations'?D.prescriber.investigations:[],medications:id==='management'?D.prescriber.medications:[],nonDrug:id==='management'?D.prescriber.nonDrug:[],followUp:id==='outcomes'?D.prescriber.followUp:[]}});
 return `<section class="kb ${c==='red'?'redsec':c==='green'?'greensec':c==='amber'?'ambersec':'bluesec'}" id="sec-${id}"><h2>${esc(t)}</h2>${body}</section>`}).join('');
 $('favGold').textContent=isFavorite(D.id)?'★ Bookmarked':'☆ Bookmark';renderStudyUI();
}
function renderStudyUI(){const p=progressOf(activeGold),gold=$('gold'),badge=$('currentStudyBadge');if(!gold||!badge)return;gold.classList.toggle('study-reading',p==='reading');gold.classList.toggle('study-completed',p==='completed');badge.className='studyBadge '+p;badge.textContent=p==='completed'?'✓ COMPLETED':p==='reading'?'◐ READING':'○ UNREAD'}
function openGold(id,mark=true){if(!CHAPTERS[id])return;activeGold=id;$('goldSelect').value=id;if(mark)rememberChapter(id);renderGold();renderPatient();renderSources();renderGoldSearch();renderReaderProgress();go('gold');let s=state();if(s.lastSection){setTimeout(()=>document.getElementById('sec-'+s.lastSection)?.scrollIntoView({behavior:'smooth',block:'start'}),100)}}
$('favGold').onclick=()=>{const D=CHAPTERS[activeGold];let s=state();s.favorites=s.favorites||[];s.favorites=s.favorites.includes(D.id)?s.favorites.filter(x=>x!==D.id):[...s.favorites,D.id];saveState(s);renderGold();renderGoldSearch();renderReaderProgress()}
if($('markReading')) $('markReading').onclick=()=>setProgress(activeGold,'reading');
if($('markCompleted')) $('markCompleted').onclick=()=>setProgress(activeGold,'completed');
if($('markUnread')) $('markUnread').onclick=()=>setProgress(activeGold,'unread');
$('printGold').onclick=()=>window.print();
if($('quicknav')) $('quicknav').addEventListener('click',e=>{let a=e.target.closest('[data-section]');if(!a)return;let s=state();s.lastGold=activeGold;s.lastSection=a.dataset.section;saveState(s)});
document.addEventListener('click',e=>{let b=e.target.closest('[data-jump]');if(!b)return;let id='sec-'+b.dataset.jump,el=document.getElementById(id);if(el){el.scrollIntoView({behavior:'smooth',block:'start'});let s=state();s.lastGold=activeGold;s.lastSection=b.dataset.jump;saveState(s)}});
function searchable(D){return [D.id,D.name,D.category,D.ayurveda,...(D.synonyms||[])].join(' ').toLowerCase()}
function renderGoldSearch(){if(!$('goldSearch'))return;let q=$('goldSearch').value.trim().toLowerCase(),f=$('studyFilter').value,s=state(),favorites=s.favorites||[];let arr=Object.values(CHAPTERS).filter(D=>{let p=progressOf(D.id);if(q&&!searchable(D).includes(q))return false;if(f==='favorite'&&!favorites.includes(D.id))return false;if(f&&f!=='favorite'&&p!==f)return false;return true}).sort((a,b)=>a.name.localeCompare(b.name));$('goldSearchMeta').textContent=`${arr.length} of ${Object.keys(CHAPTERS).length} Gold Chapters`;let show=(q||f)?arr.slice(0,80):[];$('goldSearchResults').innerHTML=show.length?show.map(D=>{let p=progressOf(D.id),fav=favorites.includes(D.id);return `<div class="goldResult ${p} ${fav?'favorite':''}" data-open-gold="${esc(D.id)}" tabindex="0"><div><b>${esc(D.name)}</b><small>${esc(D.id)} • ${esc(D.category)}</small></div><div class="resultRight"><span class="studyBadge ${p}">${p==='completed'?'✓ Completed':p==='reading'?'◐ Reading':'○ Unread'}</span>${fav?'<small>★ Bookmark</small>':''}</div></div>`}).join(''):(q||f?'<div class="searchEmpty">No matching Gold Chapter found.</div>':'')}
if($('goldSearch')) $('goldSearch').addEventListener('input',renderGoldSearch);
if($('studyFilter')) $('studyFilter').addEventListener('change',renderGoldSearch);
if($('goldSearchResults')){
 $('goldSearchResults').addEventListener('click',e=>{let r=e.target.closest('[data-open-gold]');if(r)openGold(r.dataset.openGold,true)});
 $('goldSearchResults').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.closest('[data-open-gold]')){e.preventDefault();openGold(e.target.closest('[data-open-gold]').dataset.openGold,true)}});
}
if($('continueReading')) $('continueReading').onclick=()=>{let s=state(),id=s.lastGold&&CHAPTERS[s.lastGold]?s.lastGold:activeGold;openGold(id,true)};
function renderReaderProgress(){if(!$('readerProgress'))return;let ids=Object.keys(CHAPTERS),s=state(),fav=(s.favorites||[]).filter(id=>CHAPTERS[id]).length,reading=ids.filter(id=>progressOf(id)==='reading').length,completed=ids.filter(id=>progressOf(id)==='completed').length,unread=ids.length-reading-completed,pct=ids.length?Math.round(completed*100/ids.length):0;$('readerProgress').innerHTML=`<div class=progressMini><b>${unread}</b><span>Unread</span></div><div class=progressMini><b>${reading}</b><span>Reading</span></div><div class=progressMini><b>${completed}</b><span>Completed</span></div><div class=progressMini><b>${fav}</b><span>Bookmarked</span></div><div class=progressBarWrap title="${pct}% completed"><div class=progressBar style="width:${pct}%"></div></div>`}
function renderPatient(){const D=CHAPTERS[activeGold];if(!D)return;$('patientTitle').textContent=`${D.name} — simple patient explanation`;$('patientHandout').innerHTML=list(D.patientHandout||[])}
$('printHandout').onclick=()=>{go('patient');window.print()}
$('copyHandout').onclick=async()=>{const D=CHAPTERS[activeGold];let txt=D.name.toUpperCase()+` - PATIENT EDUCATION\n\n`+(D.patientHandout||[]).map(x=>'• '+x).join('\n');await navigator.clipboard.writeText(txt);$('copyHandout').textContent='Copied';setTimeout(()=>$('copyHandout').textContent='Copy text',1200)}
function renderSources(){const D=CHAPTERS[activeGold];if(!D)return;$('sourceCards').innerHTML=(D.sources||[]).map(s=>`<div class=sourceCard><b>${esc(s.short)} - ${esc(s.title)}</b><p>${esc(s.role)}</p>${s.url?`<a href="${esc(s.url)}" target=_blank rel=noopener>${esc(s.url)}</a>`:'<span class=muted>Recovered local source</span>'}</div>`).join('')}
$('exportState').onclick=()=>{let blob=new Blob([JSON.stringify({schema:'SKMCIS-study-state-v1',exported:new Date().toISOString(),state:state()},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='SKMCIS_Study_State_Backup.json';a.click();URL.revokeObjectURL(a.href);$('backupMsg').textContent='Study-state backup exported.'}
$('restoreState').onchange=async e=>{let f=e.target.files[0];if(!f)return;try{let j=JSON.parse(await f.text());if(j.schema!=='SKMCIS-study-state-v1')throw Error('Wrong backup schema');saveState(j.state||{});$('backupMsg').textContent='Study state restored.';renderGold();renderGoldSearch();renderReaderProgress()}catch(err){$('backupMsg').textContent='Restore failed: '+err.message}}
$('clearState').onclick=()=>{if(confirm('Clear bookmarks and local study progress?')){localStorage.removeItem(stateKey);$('backupMsg').textContent='Local study state cleared.';renderGold();renderGoldSearch();renderReaderProgress()}}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('installBtn').hidden=false});
$('installBtn').onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('installBtn').hidden=true}}
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.error));
load().catch(err=>{
 console.error('SKMCIS load failed',err);
 const g=document.getElementById('goldContent');
 if(g) g.innerHTML='<div class="card redbox"><h2>Library load error</h2><p>Please press Ctrl + F5 once. If the problem continues, reopen the site after GitHub Pages deployment turns green.</p><p class="muted">'+esc(err.message||String(err))+'</p></div>';
});
