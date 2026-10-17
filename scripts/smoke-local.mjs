import Database from "better-sqlite3";
import path from "node:path";

const base=process.env.SMOKE_BASE_URL||"http://127.0.0.1:5173";
const setupKey=process.env.LOCAL_SETUP_KEY;
if(!setupKey)throw new Error("Set LOCAL_SETUP_KEY in the environment before running this smoke test");
const stamp=Date.now();
const residentEmail=`resident-${stamp}@local.test`,teamEmail=`team-${stamp}@local.test`,password="LocalTest!2026";
let residentCookie="",teamCookie="",noticeId="",reportReference="";
async function request(route,{cookie="",...options}={}){const headers={Origin:base,...(options.headers||{})};if(cookie)headers.Cookie=cookie;const response=await fetch(base+route,{...options,headers,redirect:"manual"});const body=await response.json().catch(()=>null);if(!response.ok)throw new Error(`${response.status} ${route}: ${JSON.stringify(body)}`);return{response,body,cookie:response.headers.get("set-cookie")?.split(";")[0]||cookie};}
try{
  const guest=await request("/api/notices");
  if(!guest.body.notices.length||guest.body.notices[0].bodyEn)throw new Error("Guest notice summaries are incorrect");
  let result=await request("/api/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"setup-team",name:"QA Team",email:teamEmail,password,setupKey})});teamCookie=result.cookie;
  result=await request("/api/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"register",name:"QA Resident",email:residentEmail,password})});residentCookie=result.cookie;
  const full=await request("/api/notices",{cookie:residentCookie});if(!full.body.notices[0].bodyEn)throw new Error("Signed-in resident cannot read notice content");
  result=await request("/api/notices",{cookie:teamCookie,method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind:"closure",status:"published",titleEn:`QA notice ${stamp}`,bodyEn:"Temporary QA construction notice.",location:"QA location"})});noticeId=result.body.notice.id;
  const detail=await fetch(`${base}/updates/${noticeId}`,{headers:{Cookie:residentCookie},redirect:"manual"});if(detail.status!==200)throw new Error(`Resident detail returned ${detail.status}`);
  const form=new FormData();form.set("kind","safety");form.set("location","QA local location");form.set("description","A temporary local safety report for integration testing.");form.set("photo",new Blob([new Uint8Array([137,80,78,71,13,10,26,10])],{type:"image/png"}),"qa.png");
  result=await request("/api/reports",{cookie:residentCookie,method:"POST",body:form});reportReference=result.body.reference;
  await request("/api/admin/reports",{cookie:teamCookie,method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({reference:reportReference,status:"reviewing",noteEn:"QA review started."})});
  const tracked=await request("/api/reports/track",{cookie:residentCookie,method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reference:reportReference})});if(tracked.body.report.status!=="reviewing")throw new Error("Report status was not updated");
  await request("/api/subscriptions",{cookie:residentCookie,method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({categories:["closure","safety"]})});
  console.log(JSON.stringify({ok:true,guestSummary:true,residentLogin:true,teamLogin:true,noticeDetail:true,photoUpload:true,reportStatus:tracked.body.report.status,subscriptions:true}));
}finally{
  const db=new Database(path.join(process.cwd(),"data","mutiara-community.db"));
  if(reportReference){const row=db.prepare("SELECT id,photo_key AS photoKey FROM reports WHERE reference=?").get(reportReference);if(row){db.prepare("DELETE FROM report_events WHERE report_id=?").run(row.id);db.prepare("DELETE FROM reports WHERE id=?").run(row.id);if(row.photoKey){const fs=await import("node:fs");fs.rmSync(path.join(process.cwd(),"data","uploads",row.photoKey),{force:true});}}}
  if(noticeId)db.prepare("DELETE FROM notices WHERE id=?").run(noticeId);
  db.prepare("DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email IN (?,?))").run(residentEmail,teamEmail);
  db.prepare("DELETE FROM subscriptions WHERE user_id IN (SELECT id FROM users WHERE email IN (?,?))").run(residentEmail,teamEmail);
  db.prepare("DELETE FROM users WHERE email IN (?,?)").run(residentEmail,teamEmail);
  db.close();
}
