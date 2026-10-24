// HEAVEN cloud staging broker. NOT the HEAVEN game server.
// All mutation endpoints require a server-side secret; never put it in browser JS.
const headers = {"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"};
const reply = (value,status=200) => new Response(JSON.stringify(value),{status,headers});
const bad = (message,status=400) => reply({error:message},status);
const ttlMs=2*60*60*1000;
const unclaimedTicketMs=5*60*1000;
const reconnectGraceMs=90*1000;
const validCode=code=>/^[a-f0-9]{24}$/.test(code);
const freshToken=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,"0")).join("");
async function tokenHash(token){
  const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,"0")).join("");
}
function parseJson(request){
  if(!/^application\/json(?:;|$)/i.test(request.headers.get("content-type")||""))throw Error("Expected JSON");
  const length=Number(request.headers.get("content-length")||0);
  if(length>2048)throw Error("Payload too large");
  return request.text().then(s=>{
    if(s.length>2048)throw Error("Payload too large");
    const v=JSON.parse(s);
    if(!v||typeof v!=="object"||Array.isArray(v))throw Error("Expected JSON object");
    return v;
  });
}
const internal=(path,body)=>new Request("https://mesh.internal"+path,{
  method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)
});
export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname==="/v1/status"&&request.method==="GET") {
      return reply({service:"HEAVEN Cloud Mesh",enabled:env.MESH_ENABLED==="true"&&Boolean(env.MESH_INTERNAL_BETA_KEY),mode:"staging-signaling",gameplayReady:false});
    }
    if(env.MESH_ENABLED!=="true"||!env.MESH_INTERNAL_BETA_KEY||!env.MESH_ROOMS)return bad("Cloud mesh staging is disabled",503);
    const path=url.pathname;
    const match=path.match(/^\/v1\/rooms\/([a-f0-9]{24})(?:\/(join|ws))?$/);
    const create=path==="/v1/rooms"&&request.method==="POST";
    const join=match&&match[2]==="join"&&request.method==="POST";
    const close=match&&!match[2]&&request.method==="DELETE";
    const status=match&&!match[2]&&request.method==="GET";
    const socket=match&&match[2]==="ws"&&request.method==="GET";
    if(!create&&!join&&!close&&!status&&!socket)return bad("Not found",404);
    // This key is for the trusted backend / deploy wizard, never a player credential.
    if((create||join||close)&&request.headers.get("authorization")!=="Bearer "+env.MESH_INTERNAL_BETA_KEY)
      return bad("Backend authorization required",403);
    if(create){
      let input;
      try{input=await parseJson(request);}catch{return bad("Invalid JSON room request");}
      const maxPlayers=Number(input.maxPlayers??4);
      const title=String(input.title??"Private HEAVEN Room").trim();
      if(!Number.isInteger(maxPlayers)||maxPlayers<2||maxPlayers>12||!title||title.length>60)
        return bad("Use a title of 1-60 characters and maxPlayers between 2 and 12");
      const roomId=freshToken().slice(0,24);
      const hostTicket=freshToken();
      const stub=env.MESH_ROOMS.get(env.MESH_ROOMS.idFromName(roomId));
      const result=await stub.fetch(internal("/create",{roomId,hostTicket,title,maxPlayers}));
      if(!result.ok)return bad("Could not create staging room",503);
      return reply({roomId,hostTicket,expiresInSeconds:ttlMs/1000,mode:"signaling-only"},201);
    }
    if(!validCode(match[1]))return bad("Not found",404);
    const stub=env.MESH_ROOMS.get(env.MESH_ROOMS.idFromName(match[1]));
    if(join){
      let input;
      try{input=await parseJson(request);}catch{return bad("Invalid JSON join request");}
      const name=String(input.name??"Player").trim();
      if(!name||name.length>32)return bad("Name must be 1-32 characters");
      return stub.fetch(internal("/join",{name}));
    }
    if(close){
      const ticket=request.headers.get("x-host-ticket")||"";
      if(!/^[a-f0-9]{64}$/.test(ticket))return bad("Host ticket required",403);
      return stub.fetch(internal("/close",{ticket}));
    }
    if(status)return stub.fetch(new Request("https://mesh.internal/status"));
    if((request.headers.get("upgrade")||"").toLowerCase()!=="websocket")
      return bad("WebSocket upgrade required",426);
    return stub.fetch(new Request("https://mesh.internal/ws",{headers:request.headers}));
  }
};

export class MeshRoom {
  constructor(ctx,env){this.ctx=ctx;this.env=env;}
  async fetch(request){
    const path=new URL(request.url).pathname;
    const room=await this.ctx.storage.get("room");
    if(path==="/create"&&request.method==="POST"){
      if(room)return bad("Room already exists",409);
      const data=await parseJson(request);
      const next={
        roomId:data.roomId, title:data.title,maxPlayers:data.maxPlayers,
        hostHash:await tokenHash(data.hostTicket),tickets:{},
        expiresAt:Date.now()+ttlMs
      };
      await this.ctx.storage.put("room",next);
      await this.ctx.storage.setAlarm(next.expiresAt);
      return reply({created:true},201);
    }
    if(!room||room.expiresAt<=Date.now())return bad("Room not found or expired",404);
    if(path==="/status"&&request.method==="GET")
      return reply({roomId:room.roomId,title:room.title,maxPlayers:room.maxPlayers,
        connected:this.ctx.getWebSockets().length,expiresAt:room.expiresAt,gameplayReady:false});
    if(path==="/join"&&request.method==="POST"){
      // Unclaimed invitations must not permanently exhaust a room's capacity.
      // A connected participant retains a slot; a disconnected participant
      // gets a short reconnect grace period before the slot is reclaimed.
      const now=Date.now();
      const activeIds=new Set(this.ctx.getWebSockets().map(ws=>ws.deserializeAttachment()?.id));
      for(const [hash,player] of Object.entries(room.tickets)){
        if(!activeIds.has(player.id)&&player.expiresAt<=now)delete room.tickets[hash];
      }
      if(Object.keys(room.tickets).length>=room.maxPlayers-1){
        await this.ctx.storage.put("room",room);
        return bad("Room is full",409);
      }
      const data=await parseJson(request);
      const ticket=freshToken(),id=freshToken().slice(0,16);
      room.tickets[await tokenHash(ticket)]={id,name:data.name,expiresAt:now+unclaimedTicketMs};
      await this.ctx.storage.put("room",room);
      return reply({roomId:room.roomId,playerId:id,ticket,expiresAt:room.expiresAt},201);
    }
    if(path==="/close"&&request.method==="POST"){
      const data=await parseJson(request);
      if(await tokenHash(data.ticket)!==room.hostHash)return bad("Host ticket invalid",403);
      for(const ws of this.ctx.getWebSockets())try{ws.close(1000,"Room closed");}catch{}
      await this.ctx.storage.deleteAll();
      return reply({closed:true});
    }
    if(path==="/ws"&&request.method==="GET"){
      const protocols=(request.headers.get("sec-websocket-protocol")||"").split(",").map(x=>x.trim());
      const auth=protocols.find(x=>/^ticket\.[a-f0-9]{64}$/.test(x));
      if(!protocols.includes("heaven.mesh.v1")||!auth)return bad("WebSocket ticket required",401);
      const key=await tokenHash(auth.slice(7));
      const guest=room.tickets[key];
      const person=key===room.hostHash?{id:"host",name:"Host",role:"host"}:
        guest&&guest.expiresAt>Date.now()?{id:guest.id,name:guest.name,role:"player"}:null;
      if(!person)return bad("Invalid WebSocket ticket",403);
      const sockets=this.ctx.getWebSockets();
      if(sockets.length>=room.maxPlayers)return bad("Room capacity reached",409);
      if(sockets.some(ws=>ws.deserializeAttachment()?.id===person.id))return bad("Player already connected",409);
      const pair=new WebSocketPair();
      const client=pair[0], server=pair[1];
      server.serializeAttachment(person);
      this.ctx.acceptWebSocket(server);
      if(person.role==="player"){
        room.tickets[key].expiresAt=room.expiresAt;
        await this.ctx.storage.put("room",room);
      }
      server.send(JSON.stringify({type:"welcome",self:person.id,
        peers:sockets.map(ws=>ws.deserializeAttachment()).filter(Boolean).map(p=>({id:p.id,name:p.name}))}));
      for(const ws of sockets)try{ws.send(JSON.stringify({type:"peer_joined",id:person.id,name:person.name}));}catch{}
      return new Response(null,{status:101,webSocket:client,headers:{"sec-websocket-protocol":"heaven.mesh.v1"}});
    }
    return bad("Not found",404);
  }
  webSocketMessage(ws,message){
    if(typeof message!=="string"||message.length>8192){ws.close(1009,"Invalid signaling frame");return;}
    let value;
    try{value=JSON.parse(message);}catch{return;}
    if(value?.type!=="signal"||!["offer","answer","candidate"].includes(value.kind)||
       typeof value.target!=="string"||!value.payload||typeof value.payload!=="object"||
       JSON.stringify(value.payload).length>4096)return;
    const src=ws.deserializeAttachment()?.id;
    const target=this.ctx.getWebSockets().find(other=>other.deserializeAttachment()?.id===value.target);
    if(!src||!target||target===ws)return;
    try{target.send(JSON.stringify({type:"signal",from:src,kind:value.kind,payload:value.payload}));}catch{}
  }
  async webSocketClose(ws){
    const id=ws.deserializeAttachment()?.id;
    if(!id)return;
    const room=await this.ctx.storage.get("room");
    if(room){
      for(const player of Object.values(room.tickets)){
        if(player.id===id)player.expiresAt=Math.min(room.expiresAt,Date.now()+reconnectGraceMs);
      }
      await this.ctx.storage.put("room",room);
    }
    for(const other of this.ctx.getWebSockets())if(other!==ws)try{other.send(JSON.stringify({type:"peer_left",id}));}catch{}
  }
  webSocketError(ws){try{ws.close(1011,"Connection error");}catch{}}
  async alarm(){
    for(const ws of this.ctx.getWebSockets())try{ws.close(1000,"Room expired");}catch{}
    await this.ctx.storage.deleteAll();
  }
}
