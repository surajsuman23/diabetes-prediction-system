/* Runs the original Python implementation in a dedicated worker. */
const INDEX='https://cdn.jsdelivr.net/pyodide/v0.27.5/full/';
let ready;
async function initialize(app){
 postMessage({progress:'Loading Python runtime…'});
 importScripts(INDEX+'pyodide.js');
 const py=await loadPyodide({indexURL:INDEX});
 postMessage({progress:'Loading scientific packages…'});
 await py.loadPackage(['numpy','pandas','scikit-learn']);
 py.FS.mkdir('/project');
 const files=['browser_runner.py','diabetes.py','diabetes.csv'];
 await Promise.all(files.map(async name=>{const r=await fetch(new URL(name,self.location.href));if(!r.ok)throw Error('Unable to load '+name);py.FS.writeFile('/project/'+name,await r.text());}));
 await py.runPythonAsync("import sys, json\nsys.path.insert(0, '/project')\nfrom browser_runner import browser_run");
 return py;
}
onmessage=async ({data:{id,app,data}})=>{
 try{
 if(!ready)ready=initialize(app).catch(error=>{ready=null;throw error;});
 const py=await ready;postMessage({progress:'Computing results…'});
 py.globals.set('browser_app',app);py.globals.set('browser_payload',JSON.stringify(data));
 const output=await py.runPythonAsync('browser_run(browser_app, json.loads(browser_payload))');
 postMessage({id,result:JSON.parse(output)});
 }catch(error){postMessage({id,error:String(error.message||error)});}
};
