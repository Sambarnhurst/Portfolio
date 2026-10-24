"use strict";
(function(){
const status=document.getElementById("server-status");
const detail=document.getElementById("server-detail");
const banner=document.getElementById("server-banner");
const play=document.getElementById("play-button");
const admin=document.getElementById("dev-game-link");
const refresh=document.getElementById("refresh-button");
let active=false;
async function updateStatus(){
 if(active)return;active=true;
 refresh.disabled=true;
 status.textContent="Checking live server…";detail.textContent="Checking whether multiplayer is reachable";
 banner.className="server-banner";
 play.hidden=true;admin.hidden=true;
 try {
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),6000);
  try {
   const response=await fetch("/api/game-health",{cache:"no-store",signal:controller.signal,headers:{Accept:"application/json"}});
   if(!response.ok)throw new Error("Game status unavailable");
   // Keep the timeout active while reading the response body, not just the headers.
   // A stalled JSON stream must not leave the portal stuck in "Checking" forever.
   const state=await response.json();
  if(state.online===true && state.destination==="https://play.projectheaven.site/"){
    banner.className="server-banner online";
    status.textContent="Server online";
    detail.textContent="Build "+String(state.version||"unknown")+" · "+Math.max(0,Math.floor(Number(state.players)||0))+" players connected";
    play.hidden=false;admin.hidden=false;
    play.href=state.destination;admin.href=state.destination;
  }else if(state.state==="preparing"){
    banner.className="server-banner offline";
    status.textContent="Preparing game server";
    detail.textContent="Host reachable, but assets or first-time setup still incomplete";
  }else{throw new Error("Offline");}
  }finally{clearTimeout(timeout);}
 }catch{
  banner.className="server-banner offline";
  status.textContent="Server offline";
  detail.textContent="Multiplayer readiness is not confirmed. The host may be offline, still starting, or missing setup.";
 }
 refresh.disabled=false;active=false;
}
refresh.addEventListener("click",updateStatus);
updateStatus();
setInterval(()=>{if(!document.hidden)updateStatus()},30000);
})();