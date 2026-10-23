import { STARTER_PROJECTS } from "./starter-projects.js";
import { PORTFOLIO_INVENTORY } from "./portfolio-inventory.js";
import { ADMIN_HTML } from "./admin-page.js";

// Private endpoints are not exposed as static assets. All access checks run inside the Worker.
// Cloudflare Access application + signed JWT verification + exact developer email are required.
const textHeaders = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "Cache-Control": "no-store",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
};
const json = (body, status=200) => new Response(JSON.stringify(body), {status,headers:{"Content-Type":"application/json; charset=utf-8",...textHeaders}});
const err = (message,status=400) => json({error:message},status);
let keyCache = {origin:"",at:0,keys:[]};
function decodeBase64Url(value) {
  const clean = value.replace(/-/g,"+").replace(/_/g,"/");
  return Uint8Array.from(atob(clean.padEnd(Math.ceil(clean.length/4)*4,"=")),c=>c.charCodeAt(0));
}
function decodeJSON(value) { return JSON.parse(new TextDecoder().decode(decodeBase64Url(value))); }
function tokenFromRequest(request) {
  const assertion=request.headers.get("Cf-Access-Jwt-Assertion");
  if (assertion) return assertion;
  const cookie=request.headers.get("Cookie")||"";
  const match=cookie.match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}
function accessConfigured(env) {
  return Boolean(env.CF_ACCESS_TEAM_DOMAIN && env.CF_ACCESS_AUD && env.CF_DEV_EMAIL);
}
async function verifyDeveloper(request,env) {
  if (!accessConfigured(env)) return false;
  const hostname=new URL(request.url).hostname.toLowerCase();
  // The public workers.dev fallback is not a developer-login domain.
  if (hostname!=="projectheaven.site" && hostname!=="www.projectheaven.site") return false;
  const domain=String(env.CF_ACCESS_TEAM_DOMAIN).toLowerCase().replace(/^https?:\/\//,"").replace(/\/$/,"");
  if (!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(domain)) return false;
  const token=tokenFromRequest(request);
  if (!token || token.length>12000) return false;
  const parts=token.split(".");
  if(parts.length!==3) return false;
  try {
    const header=decodeJSON(parts[0]), payload=decodeJSON(parts[1]);
    if(header.alg!=="RS256" || typeof header.kid!=="string") return false;
    const expectedIssuer="https://"+domain;
    const aud=Array.isArray(payload.aud)?payload.aud:[payload.aud];
    const now=Math.floor(Date.now()/1000);
    if(payload.iss!==expectedIssuer || !aud.includes(env.CF_ACCESS_AUD) ||
      !Number.isFinite(payload.exp) || payload.exp<=now ||
      (payload.nbf!==undefined && (!Number.isFinite(payload.nbf)||payload.nbf>now)) ||
      (payload.iat!==undefined && (!Number.isFinite(payload.iat)||payload.iat>now+60)) ||
      typeof payload.email!=="string" ||
      payload.email.toLowerCase()!==String(env.CF_DEV_EMAIL).trim().toLowerCase()) return false;
    if(keyCache.origin!==expectedIssuer || Date.now()-keyCache.at>300000) {
      const response=await fetch(expectedIssuer+"/cdn-cgi/access/certs",{redirect:"error"});
      if(!response.ok) return false;
      const data=await response.json();
      if(!Array.isArray(data.keys)) return false;
      keyCache={origin:expectedIssuer,at:Date.now(),keys:data.keys};
    }
    const jwk=keyCache.keys.find(k=>k.kid===header.kid && k.kty==="RSA");
    if(!jwk) return false;
    const key=await crypto.subtle.importKey("jwk",jwk,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
    return await crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,decodeBase64Url(parts[2]),new TextEncoder().encode(parts[0]+"."+parts[1]));
  } catch {return false;}
}
function normalizeUrl(value) {
  const url=String(value||"").trim();
  if(!url) return "";
  if(url.length>500) throw Error("URL is too long");
  if(url.startsWith("/")&&!url.startsWith("//")&&!/^\/(?:dev(?:\/|$)|api\/admin(?:\/|$))/i.test(url))return url;
  try{const parsed=new URL(url);if(parsed.protocol==="https:"||parsed.protocol==="http:")return url;}catch{}
  throw Error("Use a relative site path or an http(s) URL");
}
const categories=new Set(["HEAVEN","AI","Tools","Apps"]);
const statuses=new Set(["Concept","Planned","Prototype","Local build","Source build","In development","Live","Paused","Archived"]);
function cleanProject(input) {
  const s=v=>String(v??"").trim();
  const slug=s(input.slug).toLowerCase();
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>80)throw Error("Slug must contain lowercase letters, numbers and hyphens");
  const title=s(input.title), summary=s(input.summary), description=s(input.description),label=s(input.label);
  if(!title||title.length>110||!summary||summary.length>600||description.length>3000||label.length>60)throw Error("Check title, summary, description, and label lengths");
  const category=s(input.category), status=s(input.status);
  if(!categories.has(category)||!statuses.has(status))throw Error("Invalid category or status");
  const order=Number(input.sort_order ?? 100);
  if(!Number.isInteger(order)||order<0||order>100000)throw Error("Invalid display order");
  return {id:slug,slug,title,category,status,summary,description,url:normalizeUrl(input.url),label,featured:input.featured?1:0,published:input.published?1:0,sort_order:order};
}
function securityHeaders(html=false) {
  return {...textHeaders,...(html?{"Content-Type":"text/html; charset=utf-8","Content-Security-Policy":"default-src 'none'; base-uri 'none'; form-action 'self'; connect-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'"}:{})};
}
function publicStarterProjects() {return STARTER_PROJECTS.filter(p=>p.published).map(({description,...rest})=>rest);}
async function publicProjects(env) {
  if(!env.DB) return publicStarterProjects();
  try {
    const {results}=await env.DB.prepare("SELECT slug,title,category,status,summary,url,label,featured,published,sort_order FROM projects WHERE published=1 ORDER BY featured DESC,sort_order ASC,title ASC").all();
    return results||[];
  } catch(e) {
    console.error("Public projects query failed",e);
    return publicStarterProjects();
  }
}
async function adminProjects(env) {
  if(!env.DB)return {projects:STARTER_PROJECTS,readOnly:true,message:"Connect a Cloudflare D1 database and run the migration to enable saving and publishing."};
  const {results}=await env.DB.prepare("SELECT slug,title,category,status,summary,description,url,label,featured,published,sort_order,created_at,updated_at FROM projects ORDER BY sort_order ASC,title ASC").all();
  return {projects:results||[],readOnly:false};
}
async function readBody(request) {
  if(!String(request.headers.get("Content-Type")||"").toLowerCase().startsWith("application/json")) throw Error("Expected JSON request");
  const body=await request.text();
  if(body.length>10000)throw Error("Request too large");
  const input=JSON.parse(body);
  if(!input||typeof input!=="object"||Array.isArray(input))throw Error("Expected project object");
  return input;
}
function sameOrigin(request) {
  const origin=request.headers.get("Origin");
  return Boolean(origin && origin===new URL(request.url).origin);
}
async function adminApi(request,env,path) {
  if(request.method==="GET"&&path==="/api/admin/inventory") return json({inventory:PORTFOLIO_INVENTORY});
  if(request.method==="GET"&&path==="/api/admin/projects") {
    try{return json(await adminProjects(env));}catch{return err("Database is not initialized. Run the D1 migration.",503);}
  }
  if(!["POST","PUT","DELETE"].includes(request.method))return err("Not found",404);
  if(!sameOrigin(request))return err("Invalid request origin",403);
  if(!env.DB)return err("D1 database is not connected",503);
  if(request.method==="POST"&&path==="/api/admin/projects") {
    try{
      const p=cleanProject(await readBody(request));
      await env.DB.prepare("INSERT INTO projects(slug,title,category,status,summary,description,url,label,featured,published,sort_order) VALUES(?,?,?,?,?,?,?,?,?,?,?)")
        .bind(p.slug,p.title,p.category,p.status,p.summary,p.description,p.url,p.label,p.featured,p.published,p.sort_order).run();
      return json({ok:true,project:p},201);
    }catch(e){return err(e.message?.includes("UNIQUE")?"Project slug already exists":e.message||"Save failed",400);}
  }
  const match=path.match(/^\/api\/admin\/projects\/([a-z0-9-]{1,80})$/);
  if(!match)return err("Not found",404);
  const slug=match[1];
  if(request.method==="DELETE") {
    try{const result=await env.DB.prepare("DELETE FROM projects WHERE slug=?").bind(slug).run();return json({ok:true,deleted:result.meta?.changes||0});}
    catch{return err("Delete failed",500);}
  }
  if(request.method==="PUT") {
    try{
      const p=cleanProject(await readBody(request));
      if(p.slug!==slug)return err("Project slug cannot be changed after creation",400);
      const result=await env.DB.prepare("UPDATE projects SET title=?,category=?,status=?,summary=?,description=?,url=?,label=?,featured=?,published=?,sort_order=?,updated_at=datetime('now') WHERE slug=?")
        .bind(p.title,p.category,p.status,p.summary,p.description,p.url,p.label,p.featured,p.published,p.sort_order,slug).run();
      if(!result.meta?.changes)return err("Project not found",404);
      return json({ok:true,project:p});
    }catch(e){return err(e.message||"Update failed",400);}
  }
  return err("Method not allowed",405);
}
export default {
  async fetch(request,env) {
    const path=new URL(request.url).pathname;
    if(path==="/api/projects") {
      if(request.method!=="GET")return err("Method not allowed",405);
      return json({projects:await publicProjects(env)});
    }
    const privatePath=(path==="/dev"||path.startsWith("/dev/")||path==="/api/admin"||path.startsWith("/api/admin/"));
    if(privatePath) {
      if(!accessConfigured(env))return err("Developer access has not been configured",503);
      if(!await verifyDeveloper(request,env))return err("Developer access denied",403);
      if(path==="/dev"||path==="/dev/") {
        if(request.method!=="GET")return err("Method not allowed",405);
        return new Response(ADMIN_HTML,{headers:securityHeaders(true)});
      }
      if(path.startsWith("/api/admin/"))return adminApi(request,env,path);
      return err("Not found",404);
    }
    if(path.startsWith("/api/"))return err("Not found",404);
    return env.ASSETS.fetch(request);
  }
};