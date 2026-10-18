// Run only after the owner has pushed the reviewed static build to a public repository.
const args=process.argv.slice(2),repo=args.find(a=>a.startsWith('https://github.com/'));
if(!repo||!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(repo))throw new Error('Usage: node scripts/startng-publish.mjs https://github.com/OWNER/REPO [--publish]');
const body={repo_url:repo.replace(/\/$/,''),name:'inkbreak'};
async function call(action){const response=await fetch(`https://api.start.ng/games/${action}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(90000)});const text=await response.text();let result;try{result=JSON.parse(text);}catch{throw new Error(`start.ng returned ${response.status}: ${text.slice(0,200)}`);}console.log(JSON.stringify({action,status:response.status,...result},null,2));if(!response.ok||result.ok===false)throw new Error(`start.ng ${action} failed; fix the reported errors before publishing.`);return result;}
await call('check');
if(args.includes('--publish')){const result=await call('publish');if(result.approve_url)console.log(`Owner approval required: ${result.approve_url}`);}
