import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

const request=(path,options)=>new Request('https://projectheaven.site'+path,options);
test('game gateway only enables Play for a verified ready HEAVEN response',async t=>{
  const nativeFetch=globalThis.fetch;
  try{
    for(const [name,status,body,expected] of [
      ['ready',200,{ok:true,ready:true,service:'HEAVEN GAME DEV',version:'test',runtime:{onlinePlayers:2}},{online:true,version:'test',players:2,destination:'https://play.projectheaven.site/'}],
      ['preparing',503,{ok:true,ready:false,service:'HEAVEN GAME DEV'},{online:false,state:'preparing'}],
      ['proxy failure',503,'upstream unavailable',{online:false}],
      ['unrelated service',503,{ok:true,ready:false,service:'Other'},{online:false}],
      ['legacy health',200,{ok:true,service:'HEAVEN GAME DEV'},{online:false}],
      ['auth required',401,{error:'Authentication required'},{online:false}]
    ])await t.test(name,async()=>{
      globalThis.fetch=async(url,options)=>{
        assert.equal(url,'https://play.projectheaven.site/api/ready');
        assert.equal(options.redirect,'error');assert.ok(options.signal);
        return new Response(typeof body==='string'?body:JSON.stringify(body),{status});
      };
      const result=await worker.fetch(request('/api/game-health'),{});
      assert.deepEqual(await result.json(),expected);assert.equal(result.headers.get('Cache-Control'),'no-store');
    });
    globalThis.fetch=async()=>{throw new Error('DNS lookup failed');};
    assert.deepEqual(await (await worker.fetch(request('/api/game-health'),{})).json(),{online:false});
  }finally{globalThis.fetch=nativeFetch;}
});
test('developer routes fail closed for missing config, malformed cookies and spoofed headers',async()=>{
  const env={CF_ACCESS_TEAM_DOMAIN:'test.cloudflareaccess.com',CF_ACCESS_AUD:'audience',CF_DEV_EMAIL:'owner@example.com'};
  for(const path of ['/dev','/api/admin/projects','/api/admin/inventory']){
    assert.equal((await worker.fetch(request(path),{})).status,503);
    assert.equal((await worker.fetch(request(path,{headers:{cookie:'CF_Authorization=%ZZ'}}),env)).status,403);
    assert.equal((await worker.fetch(request(path,{headers:{'Cf-Access-Authenticated-User-Email':'owner@example.com'}}),env)).status,403);
    assert.equal((await worker.fetch(new Request('https://portfolio.samueldbarnhurst.workers.dev'+path),env)).status,403);
  }
});
test('public inventory excludes drafts and private descriptions',async()=>{
  const response=await worker.fetch(request('/api/projects'),{});
  assert.equal(response.status,200);
  const {projects}=await response.json();assert.ok(projects.length);
  assert.ok(projects.every(p=>p.published&&!('description' in p)));
  assert.equal((await worker.fetch(request('/api/projects',{method:'POST'}),{})).status,405);
});
