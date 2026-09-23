import {schedule} from './scheduler.mjs';
const $ = id => document.getElementById(id);
const esc = value => String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const percent = value => (value*100).toFixed(1)+'%';
const table = (headers, rows) => '<div class="table-wrap"><table><thead><tr>'+headers.map(x=>'<th scope="col">'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(x=>'<td>'+esc(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
const stat = (value,label)=>'<div class="stat"><strong>'+esc(value)+'</strong><span>'+esc(label)+'</span></div>';
let app, latest;
const configs = {
 diabetes:{title:'Diabetes classification benchmark',intro:'Re-run a reproducible comparison of K-nearest neighbors and Naive Bayes on the historical Pima dataset. Explore how the train/test split changes the measured results.',repo:'diabetes-prediction-system',eyebrow:'MACHINE LEARNING / PYTHON',notice:'Educational benchmark, not a diagnostic tool. Uses OpenML dataset 37 (768 rows). The first run downloads the Python runtime; loading may take a minute. Preprocessing is fitted within training folds; the 25% holdout is reserved for evaluation.',fields:'<label>Random seed<input name="seed" type="number" min="0" max="999999" step="1" value="42" required></label><label>Cross-validation folds<select name="folds"><option>2</option><option>3</option><option>4</option><option selected>5</option></select></label>'},
};
function render(r){
 let out='';
 if(app==='cpu'){
   out='<p class="meta">All three algorithms computed for '+esc(r.processes)+' processes.</p>';
   for(const a of r.results){out+='<h3>'+esc(a.algorithm.toUpperCase())+'</h3><div class="summary">'+stat(a.average_waiting,'Average waiting time')+stat(a.average_turnaround,'Average turnaround')+'</div><div class="timeline" aria-label="Execution timeline">'+a.timeline.map(s=>'<div class="slice" style="flex-grow:'+Math.min(s.end-s.start,20)+'"><b>'+esc(s.id)+'</b>'+s.start+' → '+s.end+'</div>').join('')+'</div>'+table(['Process','Arrival','Burst','Completion','Turnaround','Waiting'],a.metrics.map(m=>[m.id,m.arrival,m.burst,m.completion,m.turnaround,m.waiting]));}
 }else if(app==='diabetes'){
   out='<div class="summary">'+stat(r.train_rows,'Training rows')+stat(r.test_rows,'Holdout rows')+stat(r.folds,'CV folds')+'</div><p>Selected by training CV recall: <strong>'+esc(r.selected_model)+'</strong></p>'+table(['Model','Accuracy','Precision','Recall','F1','ROC AUC'],Object.entries(r.models).map(([name,m])=>[name,percent(m.accuracy),percent(m.precision),percent(m.recall),percent(m.f1),m.roc_auc.toFixed(3)]))+'<h3>Holdout confusion matrices</h3>'+table(['Model','True negative','False positive','False negative','True positive'],Object.entries(r.models).map(([name,m])=>[name,m.confusion_matrix.tn,m.confusion_matrix.fp,m.confusion_matrix.fn,m.confusion_matrix.tp]))+'<p class="meta">'+esc(r.limitations)+'</p><a href="https://www.openml.org/d/37" target="_blank" rel="noopener">Dataset source ↗</a>';
 }else{
   out='<div class="summary">'+stat(r.predicted_demo_label,'Predicted synthetic label')+'</div><h3>Nearest fictional facilities</h3>'+table(['Facility','Distance (km)','Latitude','Longitude'],r.nearby_fictional_hospitals.map(h=>[h.name,h.distance_km,h.latitude,h.longitude]))+'<h3>Model evaluation on synthetic data</h3>'+table(['Model','Training CV macro F1','Holdout accuracy','Holdout macro F1'],Object.entries(r.models).map(([n,m])=>[n,m.training_cv_macro_f1.toFixed(3),percent(m.test_accuracy),m.test_macro_f1.toFixed(3)]))+'<p class="meta">Selected model: '+esc(r.selected_model)+'. The low scores reflect this arbitrary synthetic task; they do not establish clinical usefulness.</p>';
 }
 $('results').innerHTML=out+'<p class="meta">Computed '+esc(new Date(r.computed_at).toLocaleTimeString())+' · '+esc(r.elapsed_seconds)+' seconds</p>';
 $('json').textContent=JSON.stringify(r,null,2); $('raw').hidden=false;
}
$('form').addEventListener('submit',async e=>{
 e.preventDefault();if(!app)return;
 const f=new FormData(e.target), data=Object.fromEntries(f); if(app==='hospital')data.symptoms=f.getAll('symptoms');
 $('run').disabled=true; $('status').textContent=app==='cpu'?'Computing…':'Loading Python / computing…'; $('results').innerHTML='<p class="empty">Running the project code…</p>'; $('raw').hidden=true;
 try {const r=app==='cpu'?schedule(data):await pythonRun(app,data);latest=r;render(r);$('status').textContent='Run completed';}
 catch(error){$('results').innerHTML='<p class="error">'+esc(error.message)+'</p>';$('status').textContent='Unable to run';}
 finally{$('run').disabled=false;}
});
$('download').addEventListener('click',()=>{if(!latest)return;const url=URL.createObjectURL(new Blob([JSON.stringify(latest,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=app+'-result.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
let worker, pending, runId=0;
function pythonRun(app,data){
 if(!worker){worker=new Worker(new URL('./engine-worker.js',import.meta.url));
 worker.onmessage=({data:m})=>{if(m.progress){$('status').textContent=m.progress;return;}if(!pending||m.id!==pending.id)return;clearTimeout(pending.timer);const p=pending;pending=null;if(m.error)p.reject(Error(m.error));else p.resolve(m.result);};
 worker.onerror=()=>{if(pending){clearTimeout(pending.timer);pending.reject(Error('Python could not load. Please check your connection and try again.'));pending=null;}worker.terminate();worker=null;};}
 return new Promise((resolve,reject)=>{const id=++runId;const timer=setTimeout(()=>{worker.terminate();worker=null;pending=null;reject(Error('This run took too long. Try again on a desktop browser with a stable connection.'));},240000);pending={id,resolve,reject,timer};worker.postMessage({id,app,data});});
}
try{const path=location.pathname;app=document.body.dataset.app || (path.endsWith('diabetes.html')?'diabetes':path.endsWith('hospital.html')?'hospital':'cpu');const c=configs[app];document.title=c.title+' · Suraj Suman';for(const k of ['title','intro','notice','eyebrow'])$(k).textContent=c[k];$('fields').innerHTML=c.fields;$('source').href='https://github.com/surajsuman23/'+c.repo;document.querySelector('[data-app="'+app+'"]')?.setAttribute('aria-current','page');
if(app==='cpu')$('form').requestSubmit();else $('results').innerHTML='<p class="empty">Choose your inputs and select Run project. The first run loads Python and the scientific packages in your browser.</p>';
}catch(e){$('title').textContent='Unable to load the app';$('intro').textContent=e.message;}
