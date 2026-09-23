/** Browser scheduling implementation; checked against Scheduler.java. */
export function schedule(data){
 const started=performance.now();
 const lines=String(data.processes||'').trim().split(/\r?\n/).filter(s=>s.trim());
 if(lines.shift()?.trim()!=='id,arrival,burst')throw Error('CSV header must be id,arrival,burst.');
 const seen=new Set();
 const input=lines.map((line,index)=>{const fields=line.split(',').map(s=>s.trim());const [id,arrivalText,burstText]=fields;const arrival=Number(arrivalText),burst=Number(burstText);
 if(fields.length!==3||!(/^[A-Za-z0-9_-]{1,20}$/).test(id)||id==='IDLE'||seen.has(id))throw Error('Use unique process IDs (letters, numbers, _ or -); IDLE is reserved.');
 if(!/^\d+$/.test(arrivalText)||!/^\d+$/.test(burstText)||!Number.isSafeInteger(arrival)||!Number.isSafeInteger(burst)||arrival<0||arrival>10000||burst<1||burst>1000)throw Error('Arrival must be 0–10000 and burst 1–1000, as whole numbers.');
 seen.add(id);return {id,arrival,burst,index};});
 if(input.length<1||input.length>30)throw Error('Enter between 1 and 30 processes.');
 const quantum=Number(data.quantum??2);if(!Number.isInteger(quantum)||quantum<1||quantum>1000)throw Error('Quantum must be a whole number between 1 and 1000.');
 const results=['fcfs','sjf','rr'].map(algorithm=>{
 const pending=input.slice().sort((a,b)=>a.arrival-b.arrival||a.index-b.index),timeline=[],completed=new Map();let time=0;
 if(algorithm==='rr'){
 let next=0;const ready=[],remaining=new Map(input.map(p=>[p.id,p.burst]));
 while(next<pending.length||ready.length){
 if(!ready.length&&time<pending[next].arrival){timeline.push({id:'IDLE',start:time,end:pending[next].arrival});time=pending[next].arrival;}
 while(next<pending.length&&pending[next].arrival<=time)ready.push(pending[next++]);
 const p=ready.shift(),duration=Math.min(quantum,remaining.get(p.id));timeline.push({id:p.id,start:time,end:time+duration});time+=duration;remaining.set(p.id,remaining.get(p.id)-duration);
 while(next<pending.length&&pending[next].arrival<=time)ready.push(pending[next++]);
 if(remaining.get(p.id)>0)ready.push(p);else completed.set(p.id,time);
 }
 }else{
 while(pending.length){
 if(time<pending[0].arrival){timeline.push({id:'IDLE',start:time,end:pending[0].arrival});time=pending[0].arrival;}
 let index=0;if(algorithm==='sjf')for(let i=1;i<pending.length&&pending[i].arrival<=time;i++)if(pending[i].burst<pending[index].burst)index=i;
 const p=pending.splice(index,1)[0];timeline.push({id:p.id,start:time,end:time+p.burst});time+=p.burst;completed.set(p.id,time);
 }
 }
 const metrics=input.map(p=>({id:p.id,arrival:p.arrival,burst:p.burst,completion:completed.get(p.id),turnaround:completed.get(p.id)-p.arrival,waiting:completed.get(p.id)-p.arrival-p.burst}));
 return {algorithm:algorithm+(algorithm==='rr'?', quantum='+quantum:''),timeline,metrics,average_waiting:Number((metrics.reduce((s,m)=>s+m.waiting,0)/metrics.length).toFixed(3)),average_turnaround:Number((metrics.reduce((s,m)=>s+m.turnaround,0)/metrics.length).toFixed(3))};
 });
 return {results,processes:input.length,source:'Browser implementation verified against Scheduler.java',elapsed_seconds:Number(((performance.now()-started)/1000).toFixed(3)),computed_at:new Date().toISOString()};
}
