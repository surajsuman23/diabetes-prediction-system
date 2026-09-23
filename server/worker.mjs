import reference from '../docs/reference-result.json' with {type:'json'};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
let remaining=120,windowStart=Date.now();
async function readJson(request){
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||''))throw Object.assign(Error('Send application/json'),{status:415});
 const reader=request.body?.getReader();let chunks=[],length=0;if(!reader)throw Object.assign(Error('Body required'),{status:400});
 while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>16384){await reader.cancel();throw Object.assign(Error('Body exceeds 16 KB'),{status:413});}chunks.push(value);}
 const data=new Uint8Array(length);let offset=0;for(const c of chunks){data.set(c,offset);offset+=c.length;}try{return JSON.parse(new TextDecoder().decode(data));}catch{throw Object.assign(Error('Invalid JSON'),{status:400});}
}
export default {async fetch(request,env){const url=new URL(request.url),path=url.pathname;try{
 if(path==='/api/health/ready')return reply({status:'ready',project:'diabetes-prediction-system'});
 if(path==='/api/v1/benchmark/reference'&&request.method==='GET')return reply({...reference,presentation:{kind:'saved_reference'}});
 if(path==='/api/v1/benchmark/config'&&request.method==='GET')return reply({dataset:'OpenML 37',rows:768,features:8,seedRange:[0,999999],folds:[2,3,4,5],computation:'Live scientific experiments execute in a browser Python worker; the server serves the reference and application assets.'});
 if(path.startsWith('/api/'))return reply({error:{message:'Route not found'}},404);
 if(!['GET','HEAD'].includes(request.method))return reply({error:{message:'Method not allowed'}},405);
 return env.ASSETS?env.ASSETS.fetch(request):new Response('Asset binding unavailable',{status:503});
 }catch(e){return reply({error:{message:e.status?e.message:'Unexpected API failure'}},e.status||500)}}};
