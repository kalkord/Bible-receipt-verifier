const assert=require('node:assert/strict');
const {createMacRelay}=require('./dist/relay');
assert.throws(()=>createMacRelay('short'));
const key='test-key-'.repeat(8);
const server=createMacRelay(key).listen(0,'127.0.0.1');
server.on('error',e=>{console.error(e);process.exitCode=1});
server.on('listening',async()=>{
 const base=`http://127.0.0.1:${server.address().port}`;
 try {
 assert.equal((await fetch(base+'/health')).status,200);
 assert.equal((await fetch(base+'/verify-telebirr',{method:'POST'})).status,401);
 for(const path of ['/accounts','/admin'])assert.equal((await fetch(base+path,{headers:{'x-api-key':key}})).status,404);
 assert.equal((await fetch(base+'/verify-cbe',{headers:{'x-api-key':key}})).status,405);
 const post=body=>fetch(base+'/verify-cbe',{method:'POST',headers:{'x-api-key':key,'content-type':'application/json'},body});
 assert.equal((await post('{}')).status,400);
 assert.equal((await post('{')).status,400);
 assert.equal((await post(JSON.stringify({x:'x'.repeat(33000)}))).status,413);
 const axios=require('axios');
 axios.get=async()=>({data:'<html>not a receipt</html>'});
 const result=await fetch(base+'/verify-telebirr',{method:'POST',headers:{'x-api-key':key,'content-type':'application/json'},body:JSON.stringify({reference:'ABCD123456'})});
 assert.equal((await result.json()).success,false);
 axios.get=async()=>{throw Error('upstream unavailable')};
 const cbe=await post(JSON.stringify({reference:'FT12345678',accountSuffix:'12345678'}));assert.equal((await cbe.json()).success,false);
 console.log('PASS: authentication, private routes, POST-only, JSON/body limits, invalid receipt and upstream failure remain unverified.');
 } catch(e) {console.error(e);process.exitCode=1} finally {server.close()}
});
