import test from "node:test";
import assert from "node:assert/strict";
import worker, {MeshRoom} from "../cloud-mesh/src/index.js";

function req(path,options={}){return new Request("https://mesh.example.test"+path,options);}
const auth={"authorization":"Bearer backend-test-key","content-type":"application/json"};
function storage(){
  const map=new Map();
  return {get:async k=>map.get(k),put:async(k,v)=>{map.set(k,v);},
    setAlarm:async()=>{},deleteAll:async()=>{map.clear();}};
}
test("cloud mesh fails closed without enable switch and secret",async()=>{
  const status=await worker.fetch(req("/v1/status"),{});
  assert.deepEqual(await status.json(),{service:"HEAVEN Cloud Mesh",enabled:false,mode:"staging-signaling",gameplayReady:false});
  assert.equal((await worker.fetch(req("/v1/rooms",{method:"POST"}),{})).status,503);
});
test("room creation and private join enforce backend authorization",async()=>{
  const ctx={storage:storage(),getWebSockets:()=>[],acceptWebSocket:()=>{}};
  const room=new MeshRoom(ctx,{});
  const env={MESH_ENABLED:"true",MESH_INTERNAL_BETA_KEY:"backend-test-key",MESH_ROOMS:{
    idFromName:s=>s,get:()=>({fetch:r=>room.fetch(r)})
  }};
  assert.equal((await worker.fetch(req("/v1/rooms",{method:"POST",headers:{"content-type":"application/json"},body:"{}"}),env)).status,403);
  const badCount=await worker.fetch(req("/v1/rooms",{method:"POST",headers:auth,body:JSON.stringify({title:"room",maxPlayers:100})}),env);
  assert.equal(badCount.status,400);
  const created=await worker.fetch(req("/v1/rooms",{method:"POST",headers:auth,body:JSON.stringify({title:"Mobile test",maxPlayers:2})}),env);
  assert.equal(created.status,201);
  const {roomId,hostTicket}=await created.json();
  assert.match(roomId,/^[a-f0-9]{24}$/);assert.match(hostTicket,/^[a-f0-9]{64}$/);
  const snapshot=await worker.fetch(req("/v1/rooms/"+roomId),env);
  assert.deepEqual(Object.keys(await snapshot.json()).sort(),["connected","expiresAt","gameplayReady","maxPlayers","roomId","title"].sort());
  const joinPath="/v1/rooms/"+roomId+"/join";
  assert.equal((await worker.fetch(req(joinPath,{method:"POST",headers:auth,body:'{"name":"Player"}'}),env)).status,201);
  assert.equal((await worker.fetch(req(joinPath,{method:"POST",headers:auth,body:'{"name":"Second"}'}),env)).status,409);
  assert.equal((await worker.fetch(req("/v1/rooms/"+roomId,{method:"DELETE",headers:{...auth,"x-host-ticket":"0".repeat(64)}}),env)).status,403);
  assert.equal((await worker.fetch(req("/v1/rooms/"+roomId,{method:"DELETE",headers:{...auth,"x-host-ticket":hostTicket}}),env)).status,200);
  assert.equal((await worker.fetch(req("/v1/rooms/"+roomId),env)).status,404);
});
test("mesh broker does not expose dev or arbitrary API paths",async()=>{
  const env={MESH_ENABLED:"true",MESH_INTERNAL_BETA_KEY:"test",MESH_ROOMS:{}};
  assert.equal((await worker.fetch(req("/dev"),env)).status,404);
  assert.equal((await worker.fetch(req("/api/admin/users"),env)).status,404);
  assert.equal((await worker.fetch(req("/v1/rooms/not-a-room"),env)).status,404);
});

test("expired unused invitations release capacity and cannot reconnect",async()=>{
  const store=storage();
  const ctx={storage:store,getWebSockets:()=>[],acceptWebSocket:()=>{}};
  const room=new MeshRoom(ctx,{});
  const env={MESH_ENABLED:"true",MESH_INTERNAL_BETA_KEY:"backend-test-key",MESH_ROOMS:{
    idFromName:s=>s,get:()=>({fetch:r=>room.fetch(r)})
  }};
  const created=await worker.fetch(req("/v1/rooms",{method:"POST",headers:auth,
    body:JSON.stringify({title:"Expiry test",maxPlayers:2})}),env);
  assert.equal(created.status,201);
  const {roomId}=await created.json();
  const path="/v1/rooms/"+roomId+"/join";
  const first=await worker.fetch(req(path,{method:"POST",headers:auth,body:'{"name":"First"}'}),env);
  assert.equal(first.status,201);
  const {ticket:expiredTicket}=await first.json();
  assert.equal((await worker.fetch(req(path,{method:"POST",headers:auth,body:'{"name":"Second"}'}),env)).status,409);
  const state=await store.get("room");
  for(const p of Object.values(state.tickets))p.expiresAt=Date.now()-1;
  await store.put("room",state);
  const second=await worker.fetch(req(path,{method:"POST",headers:auth,body:'{"name":"Second"}'}),env);
  assert.equal(second.status,201);
  const stale=await worker.fetch(req("/v1/rooms/"+roomId+"/ws",{
    headers:{"sec-websocket-protocol":"heaven.mesh.v1, ticket."+expiredTicket}
  }),env);
  assert.equal(stale.status,403);
});
test("disconnected guest retains a temporary reconnect reservation",async()=>{
  const store=storage();
  const fakeSocket={deserializeAttachment:()=>({id:"guest-1"}),send:()=>{}};
  const ctx={storage:store,getWebSockets:()=>[],acceptWebSocket:()=>{}};
  const room=new MeshRoom(ctx,{});
  await store.put("room",{roomId:"test",maxPlayers:2,expiresAt:Date.now()+3600000,
    hostHash:"0".repeat(64),tickets:{"hash":{id:"guest-1",name:"Guest",expiresAt:Date.now()+3600000}}});
  await room.webSocketClose(fakeSocket);
  const saved=await store.get("room");
  assert.ok(saved.tickets.hash.expiresAt>Date.now());
  assert.ok(saved.tickets.hash.expiresAt<=Date.now()+90000);
});
