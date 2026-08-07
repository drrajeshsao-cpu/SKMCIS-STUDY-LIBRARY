const $=id=>document.getElementById(id);
let INDEX=[],CHAPTERS={},activeGold='SKM-SPN-0001';let deferredPrompt=null;
const stateKey='skmcis-study-v1';
function state(){try{return JSON.parse(localStorage.getItem(stateKey)||'{}')}catch{return {}}}
function saveState(s){localStorage.setItem(stateKey,JSON.stringify(s))}
function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}

const CORE_FILES=["data/sciatica.json", "data/cervical-radiculopathy.json", "data/mechanical-low-back-pain.json", "data/lumbar-disc-herniation-radiculopathy.json", "data/lumbar-spinal-stenosis-neurogenic-claudication.json"];
const EXPANSION_FILES=["gold-chapters/05-cervical-spondylosis.json", "gold-chapters/06-degenerative-cervical-myelopathy.json", "gold-chapters/07-lumbar-spondylolysis.json", "gold-chapters/08-adult-lumbar-spondylolisthesis.json", "gold-chapters/09-vertebral-compression-fracture.json", "gold-chapters/10-scoliosis.json", "gold-chapters/11-native-vertebral-osteomyelitis-discitis.json", "gold-chapters/12-spinal-metastases-metastatic-spinal-cord-compression.json", "13-lumbar-spondylosis-degenerative-disc-facet-disease.json", "14-lumbar-facet-mediated-pain.json", "15-sacroiliac-joint-pain-dysfunction.json", "16-thoracic-myelopathy-thoracic-spinal-cord-compression.json", "17-osteoporosis.json", "18-adult-degenerative-kyphosis-hyperkyphosis.json", "19-ankylosing-spondylitis-radiographic-axial-spondyloarthritis.json", "20-knee-osteoarthritis.json", "21-hip-osteoarthritis.json", "22-rheumatoid-arthritis.json", "23-gout.json", "24-adhesive-capsulitis-frozen-shoulder.json", "25-rotator-cuff-tendinopathy-rotator-cuff-related-shoulder-pain.json", "26-carpal-tunnel-syndrome.json", "27-peripheral-polyneuropathy.json"];

function normalizeV11(d){
  const red=(d.redFlags||[]).map(x=>typeof x==='string'?x:x.item).filter(Boolean);
  const inv=[];
  if(d.investigations?.principle)inv.push(d.investigations.principle);
  if(d.investigations?.MRI)inv.push('MRI: '+d.investigations.MRI);
  if(d.investigations?.radiographs)inv.push('Radiographs: '+d.investigations.radiographs);
  const mg=[
    ...(d.management?.green||[]),
    ...(d.management?.amber||[]).map(x=>'CAUTION / individualized decision: '+x),
    ...(d.management?.red||[]).map(x=>'URGENT / safety: '+x)
  ];
  const ayText=d.ayurvedaFramework?.text||'Ayurveda correlation remains unvalidated and must be documented in parallel with the modern diagnosis.';
  const src=(d.sources||[]).map(s=>({
    short:s.organization||'Source',
    title:s.title||'Reference',
    url:s.url||'',
    role:'Source checked '+(s.checked||d.provenance?.lastEvidenceCheck||'')
  }));
  const patient=[];
  if(d.patientEducation?.summary)patient.push(d.patientEducation.summary);
  if(d.patientEducation?.urgent)patient.push(d.patientEducation.urgent);
  patient.push('This is study/patient-education information and does not replace individual clinical assessment.');
  return {
    id:d.canonicalId,
    slug:(d.name||'chapter').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),
    name:d.name,
    ayurveda:ayText,
    category:d.category||'SKMCIS Gold Expansion',
    status:'Gold chapter draft - source checked, clinician validation pending',
    version:d.contentVersion||'1.0.0',
    updated:d.provenance?.lastEvidenceCheck||'2026-08-07',
    synonyms:d.synonyms||[],
    definition:d.definition||'',
    presentation:d.clinicalPattern?.typical||[],
    redFlags:red,
    exam:d.examination?.core||[],
    differentials:d.differentials||[],
    investigations:inv,
    management:mg,
    ayurvedaFramework:{
      vyadhi:'Phenotype / correlation only — not an automatic one-to-one classical equivalent',
      principle:ayText,
      assessment:['Nidana Panchaka','Dosha/Doshabheda and Guna','Ama/Nirama','Agni and Koshtha','Dushya/Dhatu','Srotas/Srotodushti','Rogamarga','Bala/Avastha','Samprapti Ghataka'],
      clinicalFeatures:'Document the modern diagnosis and the individualized Ayurvedic assessment as parallel layers.',
      treatmentSafety:'Red flags and urgent modern pathways override routine conservative or Panchakarma pathways. Individual contraindication review is required.'
    },
    patientHandout:patient,
    sources:src
  };
}

function addIndexForGold(D,raw){
  const exists=INDEX.some(x=>x.goldChapterId===D.id||x.recordId===D.id);
  if(exists)return;
  INDEX.push({
    recordId:D.id,
    name:D.name,
    category:D.category,
    sourceLayer:'Gold Expansion',
    sourceId:D.id,
    modernName:D.name,
    ayurveda:D.ayurveda||'Individualized correlation',
    contentStatus:raw?.contentStatus||'NEW_SOURCE_CHECKED_DRAFT',
    validationStatus:'Source checked draft - clinician review',
    provenance:'SKMCIS Gold Expansion Series',
    goldChapterId:D.id
  });
}

async function fetchJSON(path){
  const r=await fetch('./'+path,{cache:'no-store'});
  if(!r.ok)throw new Error(path+' HTTP '+r.status);
  return r.json();
}

async function load(){
  INDEX=await fetch('./data/master-index.json',{cache:'no-store'}).then(r=>r.json());

  for(const f of CORE_FILES){
    try{
      const d=await fetchJSON(f);
      CHAPTERS[d.id]=d;
    }catch(e){console.warn('Core chapter load failed',e)}
  }

  for(const f of EXPANSION_FILES){
    try{
      const raw=await fetchJSON(f);
      if(!raw?.canonicalId)continue;
      const d=normalizeV11(raw);
      CHAPTERS[d.id]=d;
      addIndexForGold(d,raw);
    }catch(e){console.warn('Expansion chapter load failed',e)}
  }
  init();
}

function init(){
 const layers=[...new Set(INDEX.map(x=>x.sourceLayer))].sort(),statuses=[...new Set(INDEX.map(x=>x.validationStatus))].sort();
 $('layer').innerHTML='<option value="">All source layers</option>';
 $('status').innerHTML='<option value="">All validation states</option>';
 layers.forEach(x=>$('layer').insertAdjacentHTML('beforeend',`<option>${esc(x)}</option>`));
 statuses.forEach(x=>$('status').insertAdjacentHTML('beforeend',`<option>${esc(x)}</option>`));
 $('stats').innerHTML=[['Master index',INDEX.length],['Legacy V1 slots',INDEX.filter(x=>x.sourceLayer==='Legacy V1').length],['Reference chart',INDEX.filter(x=>x.sourceLayer==='Anukta 100 Chart').length],['Gold chapters',Object.keys(CHAPTERS).length]].map(([t,n])=>`<div class=stat><b>${n}</b><span>${t}</span></div>`).join('');
 $('goldSelect').innerHTML=Object.values(CHAPTERS).map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
 if(!CHAPTERS[activeGold])activeGold=Object.keys(CHAPTERS)[0];
 $('goldSelect').value=activeGold;
 $('goldSelect').onchange=()=>{activeGold=$('goldSelect').value;renderGold();renderPatient();renderSources()};
 renderLibrary();renderGold();renderPatient();renderSources();
}

function go(v){document.querySelectorAll('.view').forEach(x=>x.classList.toggle('hidden',x.id!==v));document.querySelectorAll('#nav button').forEach(x=>x.classList.toggle('active',x.dataset.view===v));scrollTo(0,0)}
document.querySelectorAll('#nav button').forEach(b=>b.onclick=()=>go(b.dataset.view));
document.addEventListener('click',e=>{if(e.target.dataset.go)go(e.target.dataset.go)})
function pillFor(x=''){if(x.includes('Validated'))return'green';if(x.includes('Source checked')||x.includes('clinician review'))return'amber';if(x.includes('unresolved')||x.includes('Unrecovered'))return'gray';if(x.includes('Recovered'))return'blue';return'gray'}
function renderLibrary(){let q=$('q').value.toLowerCase(),l=$('layer').value,s=$('status').value;let rows=INDEX.filter(x=>(!q||JSON.stringify(x).toLowerCase().includes(q))&&(!l||x.sourceLayer===l)&&(!s||x.validationStatus===s));$('resultCount').textContent=`${rows.length} records shown`;
 $('libraryRows').innerHTML=rows.map(x=>{let gid=x.goldChapterId&&CHAPTERS[x.goldChapterId]?x.goldChapterId:'';return `<div class="row ${gid?'clickable':''}" ${gid?`data-gold="${esc(gid)}" tabindex="0" role="button" aria-label="Open ${esc(CHAPTERS[gid].name)} Gold Chapter"`:''}><div><b>${esc(x.recordId)}</b><br><small>${esc(x.sourceLayer)}</small></div><div><b>${esc(x.name)}</b><br><small>${esc(x.category)}</small></div><div>${esc(x.ayurveda||'')}</div><div><span class="pill ${pillFor(x.validationStatus)}">${esc(x.validationStatus)}</span><br><small>${esc(x.contentStatus)}</small>${gid?'<br><small class="openHint">Open details →</small>':''}</div></div>`}).join('')}
['q','layer','status'].forEach(id=>$(id).addEventListener(id==='q'?'input':'change',renderLibrary));
function openGoldFromRow(row){let gid=row?.dataset.gold;if(gid&&CHAPTERS[gid]){activeGold=gid;$('goldSelect').value=gid;renderGold();renderPatient();renderSources();go('gold')}}
$('libraryRows').addEventListener('click',e=>openGoldFromRow(e.target.closest('[data-gold]')));
$('libraryRows').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.closest('[data-gold]')){e.preventDefault();openGoldFromRow(e.target.closest('[data-gold]'))}});
const sections=[['definition','Definition & scope','blue'],['classification','Classification','blue'],['pathophysiology','Pathophysiology & root compression','blue'],['anatomy','Anatomy & localization','blue'],['etiology','Etiology / causes','blue'],['riskFactors','Risk factors / recovery modifiers','amber'],['presentation','Clinical presentation','blue'],['redFlags','RED FLAGS - urgent assessment','red'],['history','Focused history','blue'],['exam','Focused examination','blue'],['rootMap','Practical root localization','blue'],['differentials','Differential diagnosis','amber'],['investigations','Investigations & imaging','blue'],['imagingCorrelation','Imaging-clinical correlation rules','amber'],['management','Management principles','green'],['rehab','Rehabilitation / graded return','green'],['outcomes','Outcome measures','blue'],['ayurvedaFramework','Ayurveda diagnostic framework','green'],['researchNote','Research note','amber']];
function list(v){return `<ul>${(v||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`}
function renderGold(){const D=CHAPTERS[activeGold];if(!D)return;
 $('goldTitle').textContent=D.name;$('goldMeta').textContent=`${D.id} • ${D.category} • ${D.status} • Updated ${D.updated}`;$('goldSelect').value=activeGold;
 $('quicknav').innerHTML=sections.filter(([id])=>D[id]!=null).map(([id,t])=>`<a href="#sec-${id}">${esc(t)}</a>`).join('');
 $('goldContent').innerHTML=sections.filter(([id])=>D[id]!=null).map(([id,t,c])=>{let v=D[id],body='';
 if(Array.isArray(v)&&id==='rootMap')body=`<table class=rootTable><tr><th>Root</th><th>Typical sensory tendency</th><th>Motor emphasis</th><th>Reflex</th>${v.some(r=>r.typicalDisc)?'<th>Common disc relationship</th>':''}</tr>${v.map(r=>`<tr><td>${esc(r.root)}</td><td>${esc(r.typicalSensory||r.sensory)}</td><td>${esc(r.motor)}</td><td>${esc(r.reflex)}</td>${v.some(x=>x.typicalDisc)?`<td>${esc(r.typicalDisc||'')}</td>`:''}</tr>`).join('')}</table>`;
 else if(Array.isArray(v))body=list(v);
 else if(id==='ayurvedaFramework')body=`<p><b>Vyadhi/correlation:</b> ${esc(v.vyadhi)}</p><p>${esc(v.principle)}</p><h3>Assessment domains</h3>${list(v.assessment)}<p><b>Clinical documentation:</b> ${esc(v.clinicalFeatures)}</p><p><b>Safety:</b> ${esc(v.treatmentSafety)}</p>`;
 else body=`<p>${esc(v)}</p>`;
 return `<section class="kb ${c==='red'?'redsec':c==='green'?'greensec':c==='amber'?'ambersec':'bluesec'}" id="sec-${id}"><h2>${esc(t)}</h2>${body}</section>`}).join('');
 let st=state();$('favGold').textContent=(st.favorites||[]).includes(D.id)?'★ Favorite':'☆ Favorite';
}
$('favGold').onclick=()=>{const D=CHAPTERS[activeGold];let s=state();s.favorites=s.favorites||[];s.favorites=s.favorites.includes(D.id)?s.favorites.filter(x=>x!==D.id):[...s.favorites,D.id];saveState(s);renderGold()}
$('printGold').onclick=()=>window.print();
function renderPatient(){const D=CHAPTERS[activeGold];if(!D)return;$('patientTitle').textContent=`${D.name} — simple patient explanation`;$('patientHandout').innerHTML=list(D.patientHandout||[])}
$('printHandout').onclick=()=>{go('patient');window.print()}
$('copyHandout').onclick=async()=>{const D=CHAPTERS[activeGold];let txt=D.name.toUpperCase()+` - PATIENT EDUCATION\n\n`+(D.patientHandout||[]).map(x=>'• '+x).join('\n');await navigator.clipboard.writeText(txt);$('copyHandout').textContent='Copied';setTimeout(()=>$('copyHandout').textContent='Copy text',1200)}
function renderSources(){const D=CHAPTERS[activeGold];if(!D)return;$('sourceCards').innerHTML=(D.sources||[]).map(s=>`<div class=sourceCard><b>${esc(s.short)} - ${esc(s.title)}</b><p>${esc(s.role)}</p>${s.url?`<a href="${esc(s.url)}" target=_blank rel=noopener>${esc(s.url)}</a>`:'<span class=muted>Recovered local source</span>'}</div>`).join('')}
$('exportState').onclick=()=>{let blob=new Blob([JSON.stringify({schema:'SKMCIS-study-state-v1',exported:new Date().toISOString(),state:state()},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='SKMCIS_Study_State_Backup.json';a.click();URL.revokeObjectURL(a.href);$('backupMsg').textContent='Study-state backup exported.'}
$('restoreState').onchange=async e=>{let f=e.target.files[0];if(!f)return;try{let j=JSON.parse(await f.text());if(j.schema!=='SKMCIS-study-state-v1')throw Error('Wrong backup schema');saveState(j.state||{});$('backupMsg').textContent='Study state restored.';renderGold()}catch(err){$('backupMsg').textContent='Restore failed: '+err.message}}
$('clearState').onclick=()=>{if(confirm('Clear favorites and local study progress?')){localStorage.removeItem(stateKey);$('backupMsg').textContent='Local study state cleared.';renderGold()}}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('installBtn').hidden=false});
$('installBtn').onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('installBtn').hidden=true}}
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.error));
load();
