(function(){
"use strict";
const VIEWS=[["tonghop","Tổng hợp KPI","dash"],["phongban","Theo phòng ban","building"],["dichvu","Theo dịch vụ","layers"],["nhap","Nhập KPI tháng","plus"],["congviec","Công việc tháng","hist"],["kehoach","Kế hoạch tháng","cal"],["baocao","Báo cáo & Thống kê","chart"],["danhmuc","Danh mục","list"],["caidat","Cài đặt","sliders"],["taikhoan","Tài khoản","users"],["them","Thêm","more"]];
const TABS=[["tonghop","Tổng hợp","dash"],["phongban","Phòng ban","building"],["nhap","Nhập","plus"],["dichvu","Dịch vụ","layers"],["them","Thêm","more"]];
const ICONS={
  dash:'<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  cal:'<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  warn:'<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  chart:'<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 6-7"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  hist:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
  sliders:'<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  building:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3"/>',
  layers:'<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  list:'<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>',
  more:'<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  trophy:'<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>'
};
const TITLES=Object.fromEntries(VIEWS.map(v=>[v[0],v[1]]));
const DEFAULT_LABELS={b:"Cột B",c:"Cột C",d:"Cột D",e:"Cột E",f:"Cột F",j:"Cột J"};
const COLS=["b","c","d","e","f"];
const NSLOT=10; // số ô số tối đa mỗi người mỗi ngày (cần nâng cấp SQL để dùng quá 5)
const blankV=()=>Array(NSLOT).fill(null);
const padV=v=>(v||[]).slice(0,NSLOT).concat(blankV()).slice(0,NSLOT);
function activeCols(){const L=S.settings.labels;
  if(Array.isArray(L._cols)&&L._cols.length)return L._cols.filter(c=>Number.isInteger(c.slot)&&c.slot>=0&&c.slot<NSLOT);
  return COLS.map((k,i)=>({slot:i,name:L[k]||DEFAULT_LABELS[k]}));}
function maxSlots(){if(S.mode==="remote")return USE_SB&&S.schema>=2?NSLOT:5;return NSLOT;}
function defaultTarget(){const t=S.settings.labels._target;return typeof t==="number"&&isFinite(t)?t:null;}
const WD=["T2","T3","T4","T5","T6","T7","CN"];
const WDL=["Thứ Hai","Thứ Ba","Thứ Tư","Thứ Năm","Thứ Sáu","Thứ Bảy","Chủ nhật"];
const METRICS=[["avg","KPI TB/ngày"],["total","Tổng KPI"],["rate","Tỷ lệ đạt"]];
const thisYear=new Date().getFullYear();

const S={db:null,user:null,dl:null,uid:null,canWrite:null,status:"starting",err:"",
  days:new Map(),weeks:new Map(),weekKeys:[],emps:new Map(),cache:new Map(),
  settings:{labels:{...DEFAULT_LABELS}},roster:[],
  view:"tonghop",nhapMode:"tay",week:null,search:"",sort:{key:"avg",dir:-1},wkMetric:"avg",flash:null,
  cmp:{emp:"__team",metric:"avg",year:null},
  entry:null,preview:null,importYear:thisYear,pasteDate:"",importMsg:"",rosterEdit:null,
  charts:[],barChart:null,after:[],
  months:new Map(),monthKeys:[],month:null,lbMetric:"avg",alertCache:null,
  kpi:new Map(),kmonths:new Map(),kmKeys:[],nv:[],dv:[],pb:[],cong:{},year:null,ent:null,dm:null,imp:null,dmTab:"nv",
  cv:null,cvLoading:false,cvErr:"",cvThang:null,cvMa:"",catalog:null,catLoading:false,catErr:"",
  kh:null,khLoading:false,khErr:"",khThang:null,khMa:"",khEdit:null,
  bcThang:null,bcPb:"",bcMa:"",bcCv:null,bcCvLoading:false,bcCvErr:"",bcKh:null,bcKhLoading:false,bcKhErr:""};

/* ---------- helpers ---------- */
function h(tag,attrs,...kids){const el=document.createElement(tag);
  for(const [k,v] of Object.entries(attrs||{})){if(v==null||v===false)continue;
    if(k==="class")el.className=v;else if(k==="text")el.textContent=v;
    else if(k.startsWith("on")&&typeof v==="function")el.addEventListener(k.slice(2),v);
    else if(k==="value")el.value=v;else if(k==="checked")el.checked=!!v;
    else el.setAttribute(k,v===true?"":v);}
  for(const kid of kids.flat()){if(kid==null||kid===false)continue;el.append(kid instanceof Node?kid:String(kid));}
  return el;}
const pad=n=>String(n).padStart(2,"0");
const iso=(y,m,d)=>`${y}-${pad(m)}-${pad(d)}`;
function parseISO(s){const [y,m,d]=s.split("-").map(Number);return new Date(Date.UTC(y,m-1,d));}
function toISO(d){return iso(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate());}
function addDays(s,n){return toISO(new Date(parseISO(s).getTime()+n*864e5));}
function todayISO(){const t=new Date();return iso(t.getFullYear(),t.getMonth()+1,t.getDate());}
function fmtDM(s){const p=s.split("-");return `${p[2]}/${p[1]}`;}
function fmtFull(s){const p=s.split("-");return `${p[2]}/${p[1]}/${p[0]}`;}
function dow(s){return (parseISO(s).getUTCDay()+6)%7;}
function longDate(s){return `${WDL[dow(s)]}, ${fmtFull(s)}`;}
function isoWeek(s){const d=parseISO(s);const mon=new Date(d.getTime()-dow(s)*864e5);const thu=new Date(mon.getTime()+3*864e5);
  const y=thu.getUTCFullYear();const week=Math.floor((thu.getTime()-Date.UTC(y,0,1))/864e5/7)+1;
  return {key:`${y}-W${pad(week)}`,year:y,week,monday:toISO(mon)};}
function weekRange(W){return `${fmtDM(W.monday)} – ${fmtDM(addDays(W.monday,6))}`;}
function weekLabel(W){return `Tuần ${W.week}/${W.year}`;}
function fold(s){return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[đĐ]/g,"d").toLowerCase().replace(/\s+/g," ").trim();}
function fmt(v,dec=1){if(v==null||!isFinite(v))return "—";return v.toLocaleString("vi-VN",{maximumFractionDigits:dec});}
function fmtM(v,m){if(v==null)return "—";return m==="rate"?fmt(v,0)+"%":fmt(v,m==="total"?0:1);}
function cv(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim();}
function toast(msg){document.querySelectorAll(".toast").forEach(t=>t.remove());const t=h("div",{class:"toast",role:"status"},msg);document.body.append(t);setTimeout(()=>t.remove(),3400);}
function avatar(name){const w=String(name||"?").replace(/\([^)]*\)/g," ").trim().split(/\s+/).filter(Boolean);
  const ini=((w.length>1?w[w.length-2][0]:"")+(w.length?w[w.length-1][0]:"?")).toUpperCase();
  let hsh=0;for(const ch of fold(name))hsh=(hsh*31+ch.charCodeAt(0))%360;
  return h("span",{class:"av",style:`--h:${hsh}`,"aria-hidden":"true"},ini);}
function who(name,prob){return h("span",{class:"who"},avatar(name),h("span",{class:"nm"},name),prob?h("span",{class:"tag"},"thử việc"):null);}
function lsGet(k){try{return localStorage.getItem(k);}catch(e){return null;}}
function lsSet(k,v){try{localStorage.setItem(k,v);}catch(e){}}
function lsDel(k){try{localStorage.removeItem(k);}catch(e){}}

/* ---------- lưu trữ trên trình duyệt (khi chạy ngoài Claude) ----------
   Muốn dùng chung cho cả nhóm qua server riêng, thay phần thân của
   loadLocal / persistLocal / writeDay / deleteDay / saveSettings / saveRoster
   bằng lời gọi API của server. */
const LS={days:"kpi:days",settings:"kpi:settings",roster:"kpi:roster"};
const CFG=window.KPI_CONFIG||{};
const API=String(CFG.apiUrl||"").trim();
const SB_URL=String(CFG.supabaseUrl||"").trim().replace(/\/+$/,"");
const SB_KEY=String(CFG.supabaseKey||CFG.supabaseAnonKey||"").trim();
const USE_SB=!!(SB_URL&&SB_KEY);

/* ---------- Đăng nhập (Supabase Auth) ---------- */
const AUTH={sess:null,refreshing:null};
function loadSess(){try{AUTH.sess=JSON.parse(lsGet("kpi:sess")||"null");}catch(e){AUTH.sess=null;}}
function saveSess(s){AUTH.sess=s;if(s)lsSet("kpi:sess",JSON.stringify(s));else lsDel("kpi:sess");}
function sessFrom(j){return {access_token:j.access_token,refresh_token:j.refresh_token,
  expires_at:j.expires_at||Math.floor(Date.now()/1000)+(+j.expires_in||3600),user:j.user||null};}
function siteURL(){return location.origin+location.pathname;}
async function authFetch(path,body,opts={}){
  const headers={apikey:SB_KEY,"Content-Type":"application/json"};if(opts.token)headers.Authorization="Bearer "+opts.token;
  let res;try{res=await fetch(SB_URL+"/auth/v1"+path,{method:opts.method||"POST",headers,body:body?JSON.stringify(body):undefined});}
  catch(e){throw {code:"network"};}
  const txt=await res.text();let j=null;try{j=txt?JSON.parse(txt):null;}catch(e){}
  if(!res.ok)throw {code:"auth",status:res.status,message:(j&&(j.error_description||j.msg||j.message||j.error))||("HTTP "+res.status)};
  return j;}
async function ensureToken(){const s=AUTH.sess;if(!s)return null;
  if(s.expires_at-Date.now()/1000>60)return s.access_token;
  if(!AUTH.refreshing)AUTH.refreshing=(async()=>{
    try{const j=await authFetch("/token?grant_type=refresh_token",{refresh_token:s.refresh_token});saveSess(sessFrom(j));}
    catch(e){if(e.code!=="network")saveSess(null);throw e.code==="network"?e:{code:"session_expired"};}
    finally{AUTH.refreshing=null;}})();
  await AUTH.refreshing;return AUTH.sess&&AUTH.sess.access_token;}
function authMsg(e){const m=String((e&&e.message)||"");
  if(e&&e.code==="network")return "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.";
  if(/invalid login credentials|invalid_grant/i.test(m))return "Email hoặc mật khẩu không đúng.";
  if(/email not confirmed/i.test(m))return "Email chưa được xác nhận. Mở hộp thư (cả mục Spam), bấm vào đường link xác nhận rồi đăng nhập lại.";
  if(/already (been )?registered|already exists/i.test(m))return "Email này đã có tài khoản. Hãy đăng nhập, hoặc bấm Quên mật khẩu.";
  if(/password/i.test(m)&&/(at least|characters|weak|short)/i.test(m))return "Mật khẩu quá yếu. Dùng ít nhất 8 ký tự, có cả chữ và số.";
  if(/same.*password|different from the old/i.test(m))return "Mật khẩu mới phải khác mật khẩu cũ.";
  if((e&&e.status===429)||/rate limit|too many/i.test(m))return "Thao tác quá nhiều lần. Đợi vài phút rồi thử lại.";
  if(/signups? not allowed|signup.*disabled/i.test(m))return "Web đang tắt đăng ký tài khoản mới. Nhờ quản lý tạo tài khoản giúp.";
  if(/invalid.*email|unable to validate email/i.test(m))return "Email không hợp lệ.";
  if(e&&e.code==="session_expired")return "Phiên đăng nhập đã hết hạn. Đăng nhập lại nhé.";
  return "Có lỗi: "+(m||"không rõ")+".";}

/* ---------- Supabase ---------- */
async function sbFetch(path,opts={},retry=true){
  const headers={apikey:SB_KEY,"Content-Type":"application/json",...(opts.headers||{})};
  const tok=AUTH.sess?await ensureToken():null;
  if(tok)headers.Authorization="Bearer "+tok;else if(SB_KEY.startsWith("eyJ"))headers.Authorization="Bearer "+SB_KEY; // khóa anon kiểu cũ (JWT)
  let res;try{res=await fetch(SB_URL+path,{...opts,headers,cache:"no-store"});}catch(e){throw {code:"network"};}
  const txt=await res.text();let body=null;try{body=txt?JSON.parse(txt):null;}catch(e){}
  if(!res.ok){const msg=(body&&(body.message||body.hint||body.error))||("HTTP "+res.status);
    if(res.status===401&&AUTH.sess&&retry){AUTH.sess.expires_at=0;await ensureToken();return sbFetch(path,opts,false);}
    if(body&&(body.message==="pin"||body.code==="28000"))throw {code:"pin"};
    if(["login_required","khong_co_quyen","chi_quan_ly","chi_admin","last_admin"].includes(msg))throw {code:msg};
    if(res.status===401)throw {code:"session_expired"};
    throw {code:"server",message:msg};}
  return body;}
const sbRpc=(fn,args)=>sbFetch("/rest/v1/rpc/"+fn,{method:"POST",body:JSON.stringify(args||{})});
async function sbCall(action,data){
  if(S.authMode){
    if(action==="writeDays")return sbRpc("kpi_save_days",{p_days:data.days});
    if(action==="deleteDay")return sbRpc("kpi_remove_day",{p_date:data.date});
    if(action==="saveCfg")return sbRpc("kpi_set_config",{p_key:data.key,p_value:data.value});}
  const pin=lsGet("kpi:pin")||"";
  if(action==="writeDays")return sbRpc("kpi_write_days",{p_pin:pin,p_days:data.days});
  if(action==="deleteDay")return sbRpc("kpi_delete_day",{p_pin:pin,p_date:data.date});
  if(action==="saveCfg")return sbRpc("kpi_save_config",{p_pin:pin,p_key:data.key,p_value:data.value});
  throw {code:"server",message:"thao tác lạ"};}

/* ---------- máy chủ chung (Google Apps Script) ---------- */
function fromServerDay(day){return {...day,rows:(day.rows||[]).map(r=>{const c=cleanName(r.name);
  return {name:c.name,key:c.key,probation:!!r.probation||c.probation,off:!!r.off,v:padV(r.v),
    total:r.total==null?0:r.total,target:r.target==null?null:r.target,pass:r.off?false:(r.pass==null?null:!!r.pass),j:r.j==null?null:r.j};})};}
async function loadRemote(){
  let j;
  if(USE_SB){j=await sbRpc("kpi_load",{});
    S.schema=+j.schema||1;S.authMode=S.schema>=3;S.me=j.me||null;
    if(j.blocked)throw {code:"blocked"};
    j.needPin=!S.authMode;S.version=j.version||null;
    if(S.schema>=5){applyKpiLoad(j);S.needUpgrade=false;S.needPin=false;S.lastSync=new Date();S.syncErr="";rebuild();return;}
    S.needUpgrade=true;}
  else{const res=await fetch(API+(API.includes("?")?"&":"?")+"action=load&t="+Date.now(),{cache:"no-store"});
    j=await res.json();if(!j.ok)throw new Error(j.error||"máy chủ báo lỗi");}
  const m=new Map();for(const [d,day] of Object.entries(j.days||{}))m.set(d,fromServerDay(day));
  S.days=m;S.settings.labels={...DEFAULT_LABELS,...(j.labels||{})};S.roster=Array.isArray(j.roster)?j.roster:[];
  S.needPin=!!j.needPin;S.lastSync=new Date();S.syncErr="";rebuild();}
async function apiCall(action,data){
  if(USE_SB)return sbCall(action,data);
  let res;try{res=await fetch(API,{method:"POST",body:JSON.stringify({action,pin:lsGet("kpi:pin")||"",...data})});}
  catch(e){throw {code:"network"};}
  let j;try{j=await res.json();}catch(e){throw {code:"server",message:"máy chủ trả về dữ liệu lạ"};}
  if(!j.ok)throw j.error==="pin"?{code:"pin"}:{code:"server",message:j.error};return j;}
async function apiWrite(action,data){
  if(S.needPin&&!lsGet("kpi:pin")){const p=await askPin(false);if(!p)throw {code:"pin_cancel"};lsSet("kpi:pin",p);}
  for(let i=0;i<3;i++){try{return await apiCall(action,data);}
    catch(e){if(e.code!=="pin")throw e;lsDel("kpi:pin");S.needPin=true;const p=await askPin(true);if(!p)throw {code:"pin_cancel"};lsSet("kpi:pin",p);}}
  throw {code:"pin"};}
function askPin(wrong){return new Promise(resolve=>{
  const inp=h("input",{type:"password",inputmode:"numeric",autocomplete:"off","aria-label":"Mã nhập liệu",style:"width:100%;font-size:18px;text-align:center;letter-spacing:.2em"});
  const done=v=>{ov.remove();resolve(v);};
  const ov=h("div",{class:"modal-bg",onclick:e=>{if(e.target===ov)done(null);}},
    h("div",{class:"modal",role:"dialog","aria-modal":"true","aria-label":"Nhập mã"},
      h("h3",{},"🔒 Nhập mã nhập liệu"),
      h("p",{class:"small muted",style:"margin:6px 0 14px"},wrong?"Mã chưa đúng, thử lại nhé. Hỏi trưởng nhóm nếu chưa có mã.":"Cần mã để lưu số liệu vào dữ liệu chung. Mã được nhớ trên máy này cho lần sau."),
      inp,
      h("div",{class:"row",style:"margin-top:16px;justify-content:flex-end"},
        h("button",{class:"ghost",type:"button",onclick:()=>done(null)},"Hủy"),
        h("button",{class:"btn",type:"button",onclick:()=>done(inp.value.trim()||null)},"Xác nhận"))));
  inp.addEventListener("keydown",e=>{if(e.key==="Enter")done(inp.value.trim()||null);if(e.key==="Escape")done(null);});
  document.body.append(ov);setTimeout(()=>inp.focus(),30);});}
async function refreshRemote(force){if(S.mode!=="remote"||S.busy)return;
  try{
    if(USE_SB&&!force&&S.status==="ready"){ // chỉ tải lại khi có thay đổi
      const v=await sbFetch("/rest/v1/kpi_config?select=value&key=eq.version");
      const ver=v&&v[0]?v[0].value:null;
      if(ver===S.version){S.lastSync=new Date();S.syncErr="";renderSync();return;}}
    await loadRemote();S.status="ready";}
  catch(e){
    if(e.code==="login_required"||e.code==="session_expired"){S.gate="login";S.authUI={msg:"Phiên đăng nhập đã hết hạn. Đăng nhập lại nhé."};render();return;}
    if(e.code==="blocked"){S.gate="pending";render();return;}
    S.syncErr="Không cập nhật được";}
  renderSync();softRender();}
function renderSync(){document.querySelectorAll(".sync-slot").forEach(el=>{
  if(S.mode!=="remote"){el.textContent=S.status==="local"?"Đang lưu trên máy này":"Theo dõi KPI theo ngày, tuần và năm";return;}
  const t=S.lastSync?S.lastSync.toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"}):"…";
  el.replaceChildren(h("span",{class:"dot"+(S.syncErr?" bad":"")}),S.syncErr?S.syncErr+" ":"Cập nhật "+t+" ",
    h("button",{class:"linkish sync",type:"button",onclick:async e=>{e.target.textContent="Đang tải…";await refreshRemote(true);}},"Làm mới"));});}
function storageOK(){try{localStorage.setItem("kpi:test","1");localStorage.removeItem("kpi:test");return true;}catch(e){return false;}}
function loadLocal(){
  try{S.days=new Map(Object.entries(JSON.parse(lsGet(LS.days)||"{}")));}catch(e){S.days=new Map();}
  try{const st=JSON.parse(lsGet(LS.settings)||"null");if(st&&st.labels)S.settings.labels={...DEFAULT_LABELS,...st.labels};}catch(e){}
  try{const r=JSON.parse(lsGet(LS.roster)||"null");if(r&&Array.isArray(r.people))S.roster=r.people;}catch(e){}
  rebuild();}
function persistLocal(key,value){try{localStorage.setItem(key,JSON.stringify(value));}
  catch(e){throw {code:"quota_exceeded",message:"bộ nhớ trình duyệt đã đầy"};}}
async function saveSettings(labels){if(S.mode==="remote")await apiWrite("saveCfg",{key:"labels",value:labels});else if(S.db)await S.db.doc("config/settings").set({labels});else persistLocal(LS.settings,{labels});S.settings.labels=labels;}
async function saveRoster(people){if(S.mode==="remote")await apiWrite("saveCfg",{key:"roster",value:people});else if(S.db)await S.db.doc("config/roster").set({people});else persistLocal(LS.roster,{people});S.roster=people;}
async function saveFile(filename,data,mime){
  if(S.dl){try{await S.dl.save({filename,data});}catch(e){if(e&&e.code!=="declined")toast("Không tải được tệp.");}return;}
  const url=URL.createObjectURL(new Blob([data],{type:mime||"application/octet-stream"}));
  const a=h("a",{href:url,download:filename,style:"display:none"});document.body.append(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},1000);}

/* ---------- writes ---------- */
function writable(){if(S.authMode)return !!S.me&&["nhan_vien","quan_ly","admin"].includes(S.me.vai_tro);return S.canWrite!==false;}
function isAdmin(){return S.authMode?!!(S.me&&(S.me.vai_tro==="quan_ly"||S.me.vai_tro==="admin")):writable();}
function isSuperAdmin(){return !!(S.authMode&&S.me&&S.me.vai_tro==="admin");}
function guard(e){if(e&&e.code==="invalid_argument")S.canWrite=false;}
async function writeDays(list){
  if(S.mode==="remote"){S.busy=true;try{await apiWrite("writeDays",{days:list});}finally{S.busy=false;}
    const who=S.me?(S.me.ho_ten||S.me.email):null;
    const next=new Map(S.days);list.forEach(x=>next.set(x.date,fromServerDay({...x.payload,updatedBy:who||x.payload.updatedBy,updatedAt:new Date().toISOString()})));S.days=next;return;}
  for(const x of list)await writeDay(x.date,x.payload);}
async function writeDay(date,payload){if(S.mode==="remote")return writeDays([{date,payload}]);
  if(!S.db){const next=new Map(S.days);next.set(date,payload);persistLocal(LS.days,Object.fromEntries(next));S.days=next;return;}
  try{await S.db.doc("kpi_days/"+date).set(payload);}catch(e){guard(e);throw e;}}
async function deleteDay(date){if(S.mode==="remote"){S.busy=true;try{await apiWrite("deleteDay",{date});}finally{S.busy=false;}
    const next=new Map(S.days);next.delete(date);S.days=next;return;}
  if(!S.db){const next=new Map(S.days);next.delete(date);persistLocal(LS.days,Object.fromEntries(next));S.days=next;return;}
  try{await S.db.doc("kpi_days/"+date).delete();}catch(e){guard(e);throw e;}}
function errMsg(e){
  if(e&&(e.code==="login_required"||e.code==="session_expired")){setTimeout(()=>{S.gate="login";S.authUI={msg:"Phiên đăng nhập đã hết hạn. Đăng nhập lại nhé."};render();},1500);return "Phiên đăng nhập đã hết hạn.";}
  if(e&&e.code==="blocked")return "Tài khoản chưa được duyệt hoặc đã bị khóa.";
  if(e&&e.code==="khong_co_quyen")return "Tài khoản này chưa được cấp quyền nhập số liệu.";
  if(e&&e.code==="chi_quan_ly")return "Chỉ quản lý mới làm được việc này.";
  if(e&&e.code==="chi_admin")return "Chỉ Admin mới làm được việc này.";
  if(e&&e.code==="last_admin")return "Phải còn ít nhất một quản lý. Hãy cấp quyền quản lý cho người khác trước.";if(e&&e.code==="pin_cancel")return "Đã hủy, số liệu chưa được lưu.";
  if(e&&e.code==="pin")return "Sai mã nhập liệu.";
  if(e&&e.code==="network")return "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.";
  if(e&&e.code==="server")return "Máy chủ báo lỗi: "+(e.message||"không rõ")+".";if(e&&e.code==="invalid_argument"&&S.canWrite===false)return "Tài khoản này chỉ có quyền xem nên không lưu được.";
  if(e&&e.code==="quota_exceeded")return "Bộ nhớ đã đầy. Sao lưu rồi xóa bớt các ngày cũ, sau đó thử lại.";
  return "Không lưu được: "+((e&&e.message)||"lỗi không rõ")+".";}
function localRefresh(){if(!S.db)rebuild();}

/* ---------- charts ---------- */
function destroyCharts(){S.charts.forEach(c=>c.destroy());S.charts=[];if(S.barChart){S.barChart.destroy();S.barChart=null;}}
function chartDefaults(){if(!window.Chart)return;Chart.defaults.font.family='"Be Vietnam Pro",system-ui,sans-serif';
  Chart.defaults.color=cv("--muted");Chart.defaults.borderColor=cv("--line");
  Chart.defaults.animation=matchMedia("(prefers-reduced-motion: reduce)").matches?false:{duration:350};
  Chart.defaults.plugins.tooltip.backgroundColor=cv("--ink");Chart.defaults.plugins.tooltip.titleColor=cv("--surface");Chart.defaults.plugins.tooltip.bodyColor=cv("--surface");
  Chart.defaults.plugins.tooltip.padding=10;Chart.defaults.plugins.tooltip.cornerRadius=8;Chart.defaults.plugins.legend.labels.usePointStyle=true;}
function mkChart(canvas,cfg){if(!window.Chart){canvas.replaceWith(h("p",{class:"muted small"},"Không tải được thư viện biểu đồ. Kiểm tra mạng rồi tải lại trang."));return null;}
  return new Chart(canvas,cfg);}
const PALETTE=()=>[cv("--brand"),"#3CC48A","#1C86B8","#E0891B","#7A62C9","#B5487A","#5C8A2E","#C2543B"];

/* ---------- vai trò & tài khoản ---------- */
const ROLES=[["cho_duyet","Chờ duyệt","warn"],["nhan_vien","Nhân viên","info"],["quan_ly","Quản lý","ok"],["admin","Admin","ok"],["khoa","Đã khóa","bad"]];
function roleLabel(r){const x=ROLES.find(z=>z[0]===r);return x?x[1]:"Chưa rõ";}
function roleChip(r){const x=ROLES.find(z=>z[0]===r);return h("span",{class:"chip "+(x?x[2]:"none")},x?x[1]:"Chưa rõ");}
async function logout(){
  const tok=AUTH.sess&&AUTH.sess.access_token;
  if(tok)authFetch("/logout",null,{token:tok}).catch(()=>{});
  saveSess(null);S.me=null;S.days=new Map();S.members=null;S.entry=null;S.preview=null;S.mapping=null;S.kpi=new Map();S.nv=[];S.dv=[];S.pb=[];S.cong={};S.ent=null;S.dm=null;S.imp=null;rebuild();
  S.gate="login";S.authUI={ok:"Đã đăng xuất."};render();}
async function enterApp(){
  S.gate=null;S.status="loading";S.authUI=null;render();
  try{await loadRemote();S.status="ready";startPolling();}
  catch(e){if(e.code==="blocked"){S.gate="pending";}
    else if(e.code==="login_required"||e.code==="session_expired"){S.gate="login";
      S.authUI=AUTH.sess||e.code==="session_expired"?{msg:"Phiên đăng nhập đã hết hạn. Đăng nhập lại nhé."}:{};saveSess(null);}
    else{S.status="error";S.err=e.code==="network"?"không kết nối được":(e.message||e.code||"lỗi không rõ");}}
  renderSync();render();}
function startPolling(){if(S.polling)return;S.polling=true;
  setInterval(()=>{if(!document.hidden&&!S.gate)refreshRemote();},USE_SB?30000:60000);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&!S.gate&&S.lastSync&&Date.now()-S.lastSync>20000)refreshRemote();});}
function handleAuthRedirect(){
  const hs=(location.hash||"").slice(1);if(!/(^|&)(access_token|error|error_description)=/.test(hs))return null;
  const p=new URLSearchParams(hs);history.replaceState(null,"",location.pathname+location.search);
  if(p.get("error")||p.get("error_description")){S.gate="login";S.authUI={msg:"Đường link đã hết hạn hoặc đã được dùng. Hãy yêu cầu gửi lại."};return "error";}
  saveSess({access_token:p.get("access_token"),refresh_token:p.get("refresh_token"),
    expires_at:+p.get("expires_at")||Math.floor(Date.now()/1000)+(+p.get("expires_in")||3600),user:null});
  const t=p.get("type");
  if(t==="recovery"){S.gate="reset";S.authUI={};return "recovery";}
  if(t==="signup"||t==="email"||t==="invite")S.welcome="Đã xác nhận email.";
  return t||"ok";}
function viewGate(){
  const G=S.gate;const A=S.authUI||(S.authUI={});
  const card=h("div",{class:"auth-card"});const add=(...xs)=>card.append(...xs.filter(x=>x!=null&&x!==false));
  add(h("div",{class:"auth-brand"},h("div",{class:"brand-full",role:"img","aria-label":"EasySupport"}),h("div",{class:"small muted"},"Báo cáo KPI Đội Hỗ trợ & CSKH")));
  const go_=(s,keep)=>{S.gate=s;S.authUI=keep||{};render();};
  const msgEl=()=>A.msg?h("p",{class:"auth-msg bad",role:"alert"},A.msg):A.ok?h("p",{class:"auth-msg ok",role:"status"},A.ok):null;
  const field=(label,attrs)=>h("label",{class:"field"},label,h("input",attrs));
  const pw=(label,name,auto)=>{const inp=h("input",{type:"password",name,autocomplete:auto,required:true,minlength:auto==="new-password"?"8":null});
    const tg=h("button",{type:"button",class:"pw-tg","aria-label":"Hiện hoặc ẩn mật khẩu",onclick:()=>{inp.type=inp.type==="password"?"text":"password";tg.textContent=inp.type==="password"?"Hiện":"Ẩn";}},"Hiện");
    return h("label",{class:"field"},label,h("div",{class:"pw"},inp,tg));};
  const form=(fields,btnText,onSubmit)=>{const btn=h("button",{class:"btn",type:"submit"},btnText);
    const f=h("form",{novalidate:true,onsubmit:async e=>{e.preventDefault();if(btn.disabled)return;
      const data=Object.fromEntries(new FormData(f).entries());btn.disabled=true;const old=btn.textContent;btn.textContent="Đang xử lý…";
      try{await onSubmit(data);}catch(err){S.authUI={...S.authUI,msg:authMsg(err),ok:""};render();}
      finally{btn.disabled=false;btn.textContent=old;}}},fields,btn);return f;};
  const links=(...l)=>h("div",{class:"auth-links"},l);
  const lk=(t,fn)=>h("button",{type:"button",onclick:fn},t);
  const emailIn=()=>field("Email",{type:"email",name:"email",autocomplete:"username",required:true,value:A.email||lsGet("kpi:lastEmail")||"",inputmode:"email"});
  const need=(d,keys)=>{for(const k of keys)if(!String(d[k]||"").trim())throw {message:"Điền đủ các ô trước đã."};};

  if(G==="login"){
    add(h("h2",{},"Đăng nhập"),h("p",{class:"small muted"},"Đăng nhập để xem báo cáo KPI của nhóm."),msgEl(),
      form([emailIn(),pw("Mật khẩu","password","current-password")],"Đăng nhập",async d=>{
        need(d,["email","password"]);const email=d.email.trim().toLowerCase();
        const j=await authFetch("/token?grant_type=password",{email,password:d.password});
        saveSess(sessFrom(j));lsSet("kpi:lastEmail",email);await enterApp();}),
      links(lk("Quên mật khẩu?",()=>go_("forgot",{email:A.email})),lk("Chưa có tài khoản? Đăng ký",()=>go_("signup"))));
  }else if(G==="signup"){
    add(h("h2",{},"Tạo tài khoản"),h("p",{class:"small muted"},"Sau khi tạo, tài khoản cần quản lý duyệt mới xem được báo cáo."),msgEl(),
      form([field("Họ và tên",{type:"text",name:"name",autocomplete:"name",required:true}),emailIn(),
        pw("Mật khẩu (ít nhất 8 ký tự)","password","new-password"),pw("Nhập lại mật khẩu","password2","new-password")],"Tạo tài khoản",async d=>{
        need(d,["name","email","password","password2"]);
        if(d.password.length<8)throw {message:"Mật khẩu cần ít nhất 8 ký tự."};
        if(d.password!==d.password2)throw {message:"Hai lần nhập mật khẩu chưa khớp."};
        const email=d.email.trim().toLowerCase();lsSet("kpi:lastEmail",email);
        const j=await authFetch("/signup?redirect_to="+encodeURIComponent(siteURL()),{email,password:d.password,data:{ho_ten:d.name.trim()}});
        if(j&&j.access_token){saveSess(sessFrom(j));await enterApp();return;}
        go_("login",{email,ok:`Đã gửi email xác nhận tới ${email}. Mở hộp thư (cả mục Spam), bấm vào đường link trong thư, rồi quay lại đây đăng nhập.`});}),
      links(lk("‹ Đã có tài khoản? Đăng nhập",()=>go_("login"))));
  }else if(G==="forgot"){
    add(h("h2",{},"Quên mật khẩu"),h("p",{class:"small muted"},"Nhập email đã đăng ký. Web sẽ gửi một đường link để đặt mật khẩu mới."),msgEl(),
      form([emailIn()],"Gửi link đặt lại mật khẩu",async d=>{need(d,["email"]);const email=d.email.trim().toLowerCase();
        await authFetch("/recover?redirect_to="+encodeURIComponent(siteURL()),{email});
        go_("login",{email,ok:`Nếu ${email} đã có tài khoản, một đường link đặt lại mật khẩu vừa được gửi tới. Mở hộp thư (cả mục Spam) và bấm vào link.`});}),
      links(lk("‹ Quay lại đăng nhập",()=>go_("login"))));
  }else if(G==="reset"){
    add(h("h2",{},"Đặt mật khẩu mới"),msgEl(),
      form([pw("Mật khẩu mới (ít nhất 8 ký tự)","password","new-password"),pw("Nhập lại mật khẩu mới","password2","new-password")],"Lưu mật khẩu mới",async d=>{
        if((d.password||"").length<8)throw {message:"Mật khẩu cần ít nhất 8 ký tự."};
        if(d.password!==d.password2)throw {message:"Hai lần nhập mật khẩu chưa khớp."};
        await authFetch("/user",{password:d.password},{method:"PUT",token:await ensureToken()});
        toast("Đã đổi mật khẩu.");await enterApp();}),
      links(lk("‹ Quay lại đăng nhập",()=>{saveSess(null);go_("login");})));
  }else{ // pending / khóa
    const r=S.me&&S.me.vai_tro;
    add(h("div",{class:"big-emoji","aria-hidden":"true"},r==="khoa"?"🔒":"⏳"),
      h("h2",{},r==="khoa"?"Tài khoản đã bị khóa":"Đang chờ quản lý duyệt"),
      h("p",{class:"muted"},r==="khoa"?"Tài khoản này không còn quyền xem báo cáo. Liên hệ quản lý nếu cần mở lại.":
        "Tài khoản của bạn đã được tạo. Nhờ quản lý vào mục Tài khoản để duyệt, rồi bấm Kiểm tra lại."),
      S.me?h("p",{class:"small muted",style:"margin-top:8px"},"Đang đăng nhập: "+S.me.email):null,msgEl(),
      h("div",{class:"row",style:"margin-top:16px"},h("button",{class:"btn",type:"button",style:"flex:1",onclick:enterApp},"Kiểm tra lại"),
        h("button",{class:"ghost",type:"button",onclick:logout},"Đăng xuất")));
  }
  add(h("p",{class:"auth-foot"},"Chỉ thành viên Đội Hỗ trợ & CSKH được duyệt mới xem được báo cáo."));
  return h("div",{class:"auth-wrap"},card);}
function myAccountPanel(){
  const me=S.me||{};
  const nameIn=h("input",{type:"text",value:me.ho_ten||"",placeholder:"Tên hiển thị","aria-label":"Tên hiển thị",autocomplete:"name"});
  const p1=h("input",{type:"password",placeholder:"Mật khẩu mới (ít nhất 8 ký tự)",autocomplete:"new-password","aria-label":"Mật khẩu mới"});
  const p2=h("input",{type:"password",placeholder:"Nhập lại mật khẩu mới",autocomplete:"new-password","aria-label":"Nhập lại mật khẩu mới"});
  return h("div",{class:"panel"},
    h("div",{class:"panel-head"},h("h3",{},"Tài khoản của tôi"),roleChip(me.vai_tro)),
    h("div",{class:"row"},avatar(me.ho_ten||me.email||"?"),h("div",{style:"min-width:0"},h("strong",{},me.ho_ten||"(chưa đặt tên)"),h("div",{class:"small muted"},me.email||"")),
      h("span",{class:"spacer"}),h("button",{class:"ghost",type:"button",onclick:logout},icon("logout"),"Đăng xuất")),
    h("div",{class:"acc-forms"},
      h("div",{class:"row"},nameIn,h("button",{class:"ghost",type:"button",onclick:async()=>{const n=nameIn.value.trim();if(!n){toast("Nhập tên trước đã.");return;}
        try{await sbRpc("kpi_set_my_name",{p_ho_ten:n});S.me.ho_ten=n;toast("Đã đổi tên hiển thị.");render();}catch(e){toast(errMsg(e));}}},"Lưu tên")),
      h("div",{class:"row"},p1,p2,h("button",{class:"ghost",type:"button",onclick:async()=>{
        if(p1.value.length<8){toast("Mật khẩu cần ít nhất 8 ký tự.");return;}if(p1.value!==p2.value){toast("Hai lần nhập mật khẩu chưa khớp.");return;}
        try{await authFetch("/user",{password:p1.value},{method:"PUT",token:await ensureToken()});p1.value="";p2.value="";toast("Đã đổi mật khẩu.");}
        catch(e){toast(e.code==="auth"||e.code==="network"?authMsg(e):errMsg(e));}}},"Đổi mật khẩu"))));}
function viewAccounts(){
  if(!S.authMode||!isAdmin())return h("p",{class:"banner"},"Chỉ quản lý mới xem được mục này.");
  if(!S.members&&!S.membersLoading){S.membersLoading=true;S.membersErr="";
    sbRpc("kpi_list_members",{}).then(l=>{S.members=(l||[]).map(m=>({...m,_role:m.vai_tro,_name:m.ho_ten,_ma:m.ma_nv}));})
      .catch(e=>{S.membersErr=errMsg(e);}).finally(()=>{S.membersLoading=false;if(S.view==="taikhoan"&&!S.gate)render();});}
  const out=h("div",{class:"stack"});
  out.append(h("div",{class:"panel"},h("div",{class:"panel-head"},h("h3",{},"Cách thêm người vào nhóm")),
    h("ol",{class:"steps"},h("li",{},"Gửi link web cho người đó. Họ mở web, bấm “Chưa có tài khoản? Đăng ký”."),
      h("li",{},"Tài khoản mới hiện ở danh sách dưới với nhãn Chờ duyệt."),
      h("li",{},"Chọn vai trò Nhân viên (hoặc Quản lý) rồi bấm Lưu. Người đó bấm “Kiểm tra lại” là vào được.")),
    h("p",{class:"hint",style:"margin-top:8px"},"Muốn chặn ai đó: chọn Đã khóa. Muốn xóa hẳn tài khoản: vào Supabase → Authentication → Users."),
    h("p",{class:"hint",style:"margin-top:4px"},"Admin có mọi quyền của Quản lý, cộng thêm quyền riêng: thiết lập danh mục công việc cố định và lập/phân bổ kế hoạch tháng. Gán đúng Mã NV cho mỗi tài khoản để người đó tự cập nhật đúng công việc của mình ở mục Công việc tháng.")));
  if(S.membersErr)out.append(h("p",{class:"banner"},S.membersErr));
  if(!S.members){out.append(h("p",{class:"muted"},"Đang tải danh sách…"));return out;}
  const pend=S.members.filter(m=>m.vai_tro==="cho_duyet").length;
  const list=h("div",{class:"acc-list"});
  S.members.forEach(m=>{
    const sel=h("select",{"aria-label":"Vai trò của "+(m.ho_ten||m.email),onchange:e=>{m._role=e.target.value;upd();}},ROLES.map(([k,l])=>h("option",{value:k},l)));sel.value=m._role;
    const nm=h("input",{type:"text",value:m._name||"",placeholder:"Tên hiển thị","aria-label":"Tên của "+m.email,oninput:e=>{m._name=e.target.value;upd();}});
    const maIn=h("input",{type:"text",value:m._ma||"",placeholder:"Mã NV","aria-label":"Mã nhân viên của "+m.email,style:"width:90px",oninput:e=>{m._ma=e.target.value;upd();}});
    const save=h("button",{class:"btn",type:"button",disabled:true,onclick:async()=>{save.disabled=true;save.textContent="Đang lưu…";
      try{await sbRpc("kpi_set_member",{p_user:m.id,p_vai_tro:m._role,p_ho_ten:m._name,p_ma_nv:m._ma||null});
        toast(`Đã lưu ${m._name||m.email}: ${roleLabel(m._role)}.`);S.members=null;
        if(m.la_toi&&m._role!=="quan_ly"&&m._role!=="admin"){await enterApp();return;}
        refreshRemote(true).then(()=>renderNav());render();}
      catch(e){toast(errMsg(e));save.disabled=false;save.textContent="Lưu";}}},"Lưu");
    function upd(){save.disabled=(m._role===m.vai_tro&&(m._name||"")===(m.ho_ten||"")&&(m._ma||"")===(m.ma_nv||""));}
    const d=m.tao_luc?new Date(m.tao_luc):null;
    list.append(h("div",{class:"acc-row"+(m.vai_tro==="cho_duyet"?" pending":"")},
      h("div",{class:"who"},avatar(m.ho_ten||m.email),h("div",{style:"min-width:0;flex:1"},h("div",{class:"row",style:"gap:6px"},nm,maIn),h("div",{class:"small muted acc-mail"},m.email,m.la_toi?h("span",{class:"tag"},"bạn"):null))),
      h("div",{class:"small muted"},d&&!isNaN(d)?"Tạo ngày "+d.toLocaleDateString("vi-VN"):""),
      sel,save));});
  out.append(h("div",{class:"panel"},h("div",{class:"panel-head"},h("h3",{},"Danh sách tài khoản"),
    h("span",{class:"small muted"},`${S.members.length} tài khoản`+(pend?`, ${pend} chờ duyệt`:""))),list));
  return out;}


/* =====================================================================
   CÔNG VIỆC THÁNG & KẾ HOẠCH THÁNG
   ===================================================================== */
const TRANG_THAI_CV=[["chua_bat_dau","Chưa bắt đầu"],["dang_thuc_hien","Đang thực hiện"],["hoan_thanh","Hoàn thành"],["qua_han","Quá hạn"],["khong_hoan_thanh","Không hoàn thành"]];
function trangThaiChip(t){const x=TRANG_THAI_CV.find(z=>z[0]===t);const cls=t==="hoan_thanh"?"ok":t==="qua_han"||t==="khong_hoan_thanh"?"bad":t==="dang_thuc_hien"?"info":"none";
  return h("span",{class:"chip "+cls},x?x[1]:"—");}
function empName(ma){const n=nvByMa(ma);return (n&&n.ten)||ma;}
// Sao 1–5: tự vẽ lại bằng tay khi bấm, KHÔNG gọi render() toàn trang để không mất
// các ô đang gõ dở khác trên cùng dòng.
function starRow(value,onPick,ro){
  const btns=[];
  const wrap=h("span",{class:"row",style:"gap:1px;flex-wrap:nowrap"});
  const paint=v=>btns.forEach((b,i)=>{const filled=v&&v>=i+1;b.textContent=filled?"★":"☆";b.style.color=filled?"var(--brand)":"var(--line)";});
  for(let i=1;i<=5;i++){
    const b=h("button",{type:"button",disabled:ro,"aria-label":i+" sao",
      style:"background:none;border:none;padding:1px;font-size:17px;line-height:1;cursor:"+(ro?"default":"pointer")},"");
    if(!ro)b.addEventListener("click",()=>{value=(value===i?null:i);paint(value);onPick(value);});
    btns.push(b);wrap.append(b);
  }
  paint(value);wrap._get=()=>value;return wrap;}
function catalogPanel(){
  if(!S.catalog&&!S.catLoading){S.catLoading=true;S.catErr="";
    sbFetch("/rest/v1/kpi_cv_dinh_ky?select=*&order=id").then(l=>{S.catalog=l||[];})
      .catch(e=>{S.catErr=errMsg(e);}).finally(()=>{S.catLoading=false;if(S.view==="congviec")render();});}
  const out=h("div",{class:"panel"});
  out.append(h("div",{class:"panel-head"},h("h3",{},"Danh mục công việc cố định hàng tháng"),h("span",{class:"small muted"},"Chỉ Admin thiết lập được")));
  if(S.catErr)out.append(h("p",{class:"banner"},S.catErr));
  if(!S.catalog){out.append(h("p",{class:"muted"},"Đang tải…"));return out;}
  const list=h("div",{class:"acc-list"});
  S.catalog.forEach(c=>{
    const tenIn=h("input",{type:"text",value:c.ten_cv,"aria-label":"Tên công việc",oninput:e=>{c._ten=e.target.value;upd();}});
    const moIn=h("input",{type:"text",value:c.mo_ta||"",placeholder:"Mô tả","aria-label":"Mô tả",oninput:e=>{c._mo=e.target.value;upd();}});
    const pbIn=h("input",{type:"text",value:c.phong_ban||"",placeholder:"Phòng ban (để trống = tất cả)","aria-label":"Phòng ban áp dụng",oninput:e=>{c._pb=e.target.value;upd();}});
    const actCk=h("input",{type:"checkbox",checked:c.dang_hoat_dong,onchange:e=>{c._act=e.target.checked;upd();}});
    const save=h("button",{class:"btn",type:"button",disabled:true,onclick:async()=>{save.disabled=true;
      try{await sbRpc("kpi_cv_dm_set",{p_id:c.id,p_ten_cv:c._ten==null?c.ten_cv:c._ten,p_mo_ta:(c._mo==null?c.mo_ta:c._mo)||null,
        p_phong_ban:(c._pb==null?c.phong_ban:c._pb)||null,p_dang_hoat_dong:c._act==null?c.dang_hoat_dong:c._act});
        toast("Đã lưu.");S.catalog=null;render();}catch(e){toast(errMsg(e));save.disabled=false;}}},"Lưu");
    function upd(){save.disabled=!((c._ten!=null&&c._ten!==c.ten_cv)||(c._mo!=null&&c._mo!==(c.mo_ta||""))||
      (c._pb!=null&&c._pb!==(c.phong_ban||""))||(c._act!=null&&c._act!==c.dang_hoat_dong));}
    const del=h("button",{class:"ghost danger",type:"button",onclick:async()=>{if(!confirm(`Xóa "${c.ten_cv}" khỏi danh mục?`))return;
      try{await sbRpc("kpi_cv_dm_xoa",{p_id:c.id});toast("Đã xóa.");S.catalog=null;render();}catch(e){toast(errMsg(e));}}},"Xóa");
    list.append(h("div",{class:"acc-row"},
      h("div",{style:"min-width:0"},h("div",{class:"row",style:"gap:6px"},tenIn),h("div",{class:"row",style:"gap:6px;margin-top:6px"},moIn,pbIn)),
      h("label",{class:"toggle"},actCk,"Đang dùng"),save,del));});
  out.append(list);
  const nTen=h("input",{type:"text",placeholder:"Tên công việc mới","aria-label":"Tên công việc mới"});
  const nMo=h("input",{type:"text",placeholder:"Mô tả (tùy chọn)","aria-label":"Mô tả công việc mới"});
  const nPb=h("input",{type:"text",placeholder:"Phòng ban (để trống = tất cả)","aria-label":"Phòng ban áp dụng"});
  out.append(h("div",{class:"row",style:"margin-top:12px"},nTen,nMo,nPb,h("button",{class:"btn",type:"button",onclick:async()=>{
    const t=nTen.value.trim();if(!t){toast("Nhập tên công việc trước đã.");return;}
    try{await sbRpc("kpi_cv_dm_set",{p_id:null,p_ten_cv:t,p_mo_ta:nMo.value.trim()||null,p_phong_ban:nPb.value.trim()||null,p_dang_hoat_dong:true});
      nTen.value="";nMo.value="";nPb.value="";toast("Đã thêm vào danh mục.");S.catalog=null;render();}catch(e){toast(errMsg(e));}}},"+ Thêm")));
  return out;}
function addTaskPanel(thang,amManager){
  const myMa=S.me&&S.me.ma_nv;
  if(!amManager&&!myMa)return null;
  const maSel=amManager?h("select",{"aria-label":"Giao việc cho"},S.nv.map(n=>h("option",{value:n.ma},n.ten||n.ma))):null;
  if(maSel)maSel.value=S.cvMa||(S.nv[0]&&S.nv[0].ma)||"";
  const tenIn=h("input",{type:"text",placeholder:"Tên công việc phát sinh","aria-label":"Tên công việc phát sinh"});
  const moIn=h("input",{type:"text",placeholder:"Mô tả (tùy chọn)","aria-label":"Mô tả"});
  let hanVal=null;const hanEl=dateBox(null,v=>{hanVal=v;},"Hạn hoàn thành");
  const btn=h("button",{class:"btn",type:"button",onclick:async()=>{
    const ten=tenIn.value.trim();if(!ten){toast("Nhập tên công việc trước đã.");return;}
    const ma=amManager?maSel.value:myMa;
    try{await sbRpc("kpi_cv_them_phat_sinh",{p_thang:thang,p_ma_nv:ma,p_ten_cv:ten,p_mo_ta:moIn.value.trim()||null,p_han:hanVal});
      tenIn.value="";moIn.value="";hanVal=null;toast("Đã thêm việc phát sinh.");S.cv=null;render();}catch(e){toast(errMsg(e));}}},"+ Thêm việc phát sinh");
  return h("div",{class:"panel"},h("div",{class:"panel-head"},h("h3",{},"Thêm công việc phát sinh trong tháng")),
    h("div",{class:"row"},maSel,tenIn,moIn,hanEl,btn));}
function cvRow(r,showEmp,amManager){
  const myMa=S.me&&S.me.ma_nv;
  const canEditOwn=isSuperAdmin()||(!!myMa&&myMa===r.ma_nv);
  const canEval=amManager;
  const tienDoIn=h("input",{type:"number",min:"0",max:"100",value:String(r.tien_do==null?0:r.tien_do),style:"width:60px",disabled:!canEditOwn,"aria-label":"Tiến độ %"});
  const tt=h("select",{disabled:!canEditOwn,"aria-label":"Trạng thái"},TRANG_THAI_CV.map(([k,l])=>h("option",{value:k},l)));tt.value=r.trang_thai||"chua_bat_dau";
  const kq=h("textarea",{rows:"2",disabled:!canEditOwn,"aria-label":"Kết quả thực hiện",placeholder:"Kết quả thực hiện…"});kq.value=r.ket_qua||"";
  const tuStars=starRow(r.tu_sao||null,()=>{},!canEditOwn);
  const qlStars=starRow(r.qly_sao||null,()=>{},!canEval);
  const qlNx=h("textarea",{rows:"2",disabled:!canEval,"aria-label":"Nhận xét quản lý",placeholder:"Nhận xét của quản lý…"});qlNx.value=r.qly_nhan_xet||"";
  const save=h("button",{class:"btn",type:"button",onclick:async()=>{
    try{
      if(canEditOwn)await sbRpc("kpi_cv_cap_nhat",{p_id:r.id,p_tien_do:+tienDoIn.value||0,p_trang_thai:tt.value,p_ket_qua:kq.value,p_tu_danh_gia_sao:tuStars._get()});
      if(canEval)await sbRpc("kpi_cv_danh_gia",{p_id:r.id,p_danh_gia_qly_sao:qlStars._get(),p_nhan_xet_qly:qlNx.value});
      toast("Đã lưu.");S.cv=null;render();
    }catch(e){toast(errMsg(e));}}},"Lưu");
  const canDel=isSuperAdmin()||(r.loai==="phat_sinh"&&canEditOwn&&r.trang_thai!=="hoan_thanh");
  const del=canDel?h("button",{class:"ghost danger",type:"button",onclick:async()=>{if(!confirm(`Xóa công việc "${r.ten_cv}"?`))return;
    try{await sbRpc("kpi_cv_xoa",{p_id:r.id});toast("Đã xóa.");S.cv=null;render();}catch(e){toast(errMsg(e));}}},"Xóa"):null;
  return h("tr",{},
    showEmp?h("td",{class:"l"},who(empName(r.ma_nv))):null,
    h("td",{class:"l"},h("strong",{},r.ten_cv),r.mo_ta?h("div",{class:"small muted"},r.mo_ta):null),
    h("td",{},r.loai==="dinh_ky"?h("span",{class:"chip info"},"Cố định"):h("span",{class:"chip"},"Phát sinh")),
    h("td",{},r.han?fmtFull(r.han):"—"),
    h("td",{},tienDoIn,"%"),
    h("td",{},tt,canEditOwn?null:trangThaiChip(r.trang_thai)),
    h("td",{class:"l",style:"min-width:160px"},kq),
    h("td",{},tuStars),
    h("td",{},qlStars),
    h("td",{class:"l",style:"min-width:160px"},qlNx),
    h("td",{},save,del));}
function viewCongViec(){
  const out=h("div",{class:"stack"});
  const amAdmin=isSuperAdmin(),amManager=isAdmin();
  const thang=S.cvThang||S.month||thisMonth();S.cvThang=thang;
  const empSel=amManager?h("select",{"aria-label":"Nhân viên",onchange:e=>{S.cvMa=e.target.value;S.cv=null;render();}},
    h("option",{value:""},"Toàn đội"),S.nv.map(n=>h("option",{value:n.ma},n.ten||n.ma))):null;
  if(empSel)empSel.value=S.cvMa||"";
  out.append(h("div",{class:"row"},monthBar(v=>{S.cvThang=v;S.cv=null;render();}),empSel,h("span",{class:"spacer"}),
    amAdmin?h("button",{class:"ghost",type:"button",onclick:async()=>{
      try{const n=await sbRpc("kpi_cv_tao_thang",{p_thang:thang,p_ma_nv_list:null});toast(`Đã tạo ${n} việc cố định cho tháng ${monthLabel(thang).toLowerCase()}.`);S.cv=null;render();}
      catch(e){toast(errMsg(e));}}},"Tạo việc cố định cho tháng này"):null));
  const myMa=S.me&&S.me.ma_nv;
  if(!amManager&&!myMa){out.append(h("p",{class:"banner"},"Tài khoản của bạn chưa được liên kết với Mã NV. Nhờ Admin vào mục Tài khoản để gán mã nhân viên cho bạn."));return out;}
  if(!S.cv&&!S.cvLoading){S.cvLoading=true;S.cvErr="";
    const maFilter=amManager?(S.cvMa||null):myMa;
    sbRpc("kpi_cv_list_thang",{p_thang:thang,p_ma_nv:maFilter}).then(l=>{S.cv=l||[];})
      .catch(e=>{S.cvErr=errMsg(e);}).finally(()=>{S.cvLoading=false;if(S.view==="congviec")render();});}
  if(amAdmin)out.append(catalogPanel());
  out.append(addTaskPanel(thang,amManager));
  if(S.cvErr)out.append(h("p",{class:"banner"},S.cvErr));
  if(!S.cv){out.append(h("p",{class:"muted"},"Đang tải…"));return out;}
  if(!S.cv.length){out.append(h("div",{class:"panel empty"},h("p",{class:"muted"},"Chưa có công việc nào trong tháng này.")));return out;}
  const showEmp=amManager&&!S.cvMa;
  const head=h("tr",{},showEmp?h("th",{class:"l"},"Nhân viên"):null,h("th",{class:"l"},"Công việc"),h("th",{},"Loại"),h("th",{},"Hạn"),
    h("th",{},"Tiến độ"),h("th",{},"Trạng thái"),h("th",{class:"l"},"Kết quả"),h("th",{},"Tự đánh giá"),h("th",{},"QL đánh giá"),h("th",{class:"l"},"Nhận xét QL"),h("th",{},""));
  const body=S.cv.map(r=>cvRow(r,showEmp,amManager));
  out.append(h("div",{class:"panel"},h("div",{class:"panel-head"},h("h3",{},"Công việc tháng "+monthLabel(thang).toLowerCase())),
    h("div",{class:"scroll"},h("table",{class:"grid"},h("thead",{},head),h("tbody",{},body))),
    h("p",{class:"hint",style:"margin-top:10px"},"Việc cố định do Admin thiết lập theo danh mục; việc phát sinh do từng người hoặc Quản lý/Admin thêm trong tháng. Thang tự đánh giá và đánh giá của quản lý theo 1–5 sao.")));
  return out;}
function khForm(thang){
  const editing=S.khEdit;
  const maSel=h("select",{"aria-label":"Nhân viên"},S.nv.map(n=>h("option",{value:n.ma},n.ten||n.ma)));
  maSel.value=(editing&&editing.ma_nv)||S.khMa||(S.nv[0]&&S.nv[0].ma)||"";
  const tenIn=h("input",{type:"text",placeholder:"Công việc dự kiến","aria-label":"Công việc dự kiến"});tenIn.value=(editing&&editing.ten_cv_du_kien)||"";
  const tgIn=h("input",{type:"text",placeholder:"Thời gian dự kiến (vd: Tuần 2, 10–15/11)","aria-label":"Thời gian dự kiến"});tgIn.value=(editing&&editing.thoi_gian_du_kien)||"";
  const kqIn=h("input",{type:"text",placeholder:"Kết quả mong muốn","aria-label":"Kết quả mong muốn"});kqIn.value=(editing&&editing.ket_qua_mong_muon)||"";
  const gcIn=h("input",{type:"text",placeholder:"Ghi chú","aria-label":"Ghi chú"});gcIn.value=(editing&&editing.ghi_chu)||"";
  const submit=h("button",{class:"btn",type:"button",onclick:async()=>{
    const t=tenIn.value.trim();if(!t){toast("Nhập công việc dự kiến trước đã.");return;}
    try{await sbRpc("kpi_kh_set",{p_id:editing?editing.id:null,p_thang:thang,p_ma_nv:maSel.value,p_ten_cv_du_kien:t,
      p_thoi_gian_du_kien:tgIn.value.trim()||null,p_ket_qua_mong_muon:kqIn.value.trim()||null,p_ghi_chu:gcIn.value.trim()||null});
      toast(editing?"Đã cập nhật kế hoạch.":"Đã thêm vào kế hoạch.");S.kh=null;S.khEdit=null;render();}
    catch(e){toast(errMsg(e));}}},editing?"Lưu thay đổi":"+ Thêm vào kế hoạch");
  const cancel=editing?h("button",{class:"ghost",type:"button",onclick:()=>{S.khEdit=null;render();}},"Hủy"):null;
  return h("div",{class:"panel"},h("div",{class:"panel-head"},h("h3",{},editing?"Sửa dòng kế hoạch":"Lập kế hoạch tháng"),h("span",{class:"small muted"},"Chỉ Admin lập/phân bổ được")),
    h("div",{class:"row"},maSel,tenIn,tgIn),h("div",{class:"row",style:"margin-top:8px"},kqIn,gcIn,submit,cancel));}
function doiChieuPanel(thang,ma){
  const key=thang+"|"+ma;
  if(!S._doiChieu||S._doiChieu.key!==key){
    if(!S._doiChieu||!S._doiChieu.loading){S._doiChieu={key,loading:true};
      sbRpc("kpi_cv_list_thang",{p_thang:thang,p_ma_nv:ma}).then(l=>{S._doiChieu={key,loading:false,list:l||[]};if(S.view==="kehoach")render();}).catch(()=>{S._doiChieu={key,loading:false,list:[]};});}
    return h("p",{class:"muted"},"Đang tải đối chiếu…");}
  const list=S._doiChieu.list||[];
  if(!list.length)return null;
  const rows=list.map(r=>h("tr",{},h("td",{class:"l"},r.ten_cv),h("td",{},r.trang_thai==="hoan_thanh"?h("span",{class:"chip ok"},"Hoàn thành"):h("span",{},r.tien_do+"%")),h("td",{class:"l"},r.ket_qua||"—")));
  return h("div",{class:"panel"},h("div",{class:"panel-head"},h("h3",{},"Đối chiếu với kết quả thực tế")),
    h("div",{class:"scroll"},h("table",{class:"grid"},h("thead",{},h("tr",{},h("th",{class:"l"},"Công việc thực tế"),h("th",{},"Tiến độ/Trạng thái"),h("th",{class:"l"},"Kết quả"))),h("tbody",{},rows))),
    h("p",{class:"hint",style:"margin-top:8px"},"So sánh thủ công giữa công việc dự kiến ở bảng trên và công việc thực tế ghi nhận ở bảng này."));}
function viewKeHoach(){
  const out=h("div",{class:"stack"});
  const amAdmin=isSuperAdmin(),amManager=isAdmin();
  const thang=S.khThang||S.month||thisMonth();S.khThang=thang;
  const empSel=amManager?h("select",{"aria-label":"Nhân viên",onchange:e=>{S.khMa=e.target.value;S.kh=null;S._doiChieu=null;render();}},
    h("option",{value:""},"Toàn đội"),S.nv.map(n=>h("option",{value:n.ma},n.ten||n.ma))):null;
  if(empSel)empSel.value=S.khMa||"";
  out.append(h("div",{class:"row"},monthBar(v=>{S.khThang=v;S.kh=null;S._doiChieu=null;render();}),empSel));
  const myMa=S.me&&S.me.ma_nv;
  if(!amManager&&!myMa){out.append(h("p",{class:"banner"},"Tài khoản của bạn chưa được liên kết với Mã NV. Nhờ Admin vào mục Tài khoản để gán mã nhân viên cho bạn."));return out;}
  if(!S.kh&&!S.khLoading){S.khLoading=true;S.khErr="";
    const maFilter=amManager?(S.khMa||null):myMa;
    sbRpc("kpi_kh_list",{p_thang:thang,p_ma_nv:maFilter}).then(l=>{S.kh=l||[];})
      .catch(e=>{S.khErr=errMsg(e);}).finally(()=>{S.khLoading=false;if(S.view==="kehoach")render();});}
  if(amAdmin)out.append(khForm(thang));
  if(S.khErr)out.append(h("p",{class:"banner"},S.khErr));
  if(!S.kh){out.append(h("p",{class:"muted"},"Đang tải…"));return out;}
  if(S.kh.length){
    const showEmp=amManager&&!S.khMa;
    const head=h("tr",{},showEmp?h("th",{class:"l"},"Nhân viên"):null,h("th",{class:"l"},"Công việc dự kiến"),h("th",{},"Thời gian dự kiến"),
      h("th",{class:"l"},"Kết quả mong muốn"),h("th",{class:"l"},"Ghi chú"),amAdmin?h("th",{},""):null);
    const body=S.kh.map(r=>h("tr",{},
      showEmp?h("td",{class:"l"},who(empName(r.ma_nv))):null,
      h("td",{class:"l"},r.ten_cv_du_kien),h("td",{},r.thoi_gian_du_kien||"—"),h("td",{class:"l"},r.ket_qua_mong_muon||"—"),h("td",{class:"l"},r.ghi_chu||"—"),
      amAdmin?h("td",{},h("button",{class:"ghost",type:"button",onclick:()=>{S.khEdit=r;render();window.scrollTo(0,0);}},"Sửa"),
        h("button",{class:"ghost danger",type:"button",onclick:async()=>{if(!confirm("Xóa dòng kế hoạch này?"))return;
          try{await sbRpc("kpi_kh_xoa",{p_id:r.id});toast("Đã xóa.");S.kh=null;render();}catch(e){toast(errMsg(e));}}},"Xóa")):null));
    out.append(h("div",{class:"panel"},h("div",{class:"panel-head"},h("h3",{},"Kế hoạch tháng "+monthLabel(thang).toLowerCase())),
      h("div",{class:"scroll"},h("table",{class:"grid"},h("thead",{},head),h("tbody",{},body)))));
  }else out.append(h("div",{class:"panel empty"},h("p",{class:"muted"},"Chưa có kế hoạch nào trong tháng này.")));
  const ma2=amManager?S.khMa:myMa;
  if(ma2){const dc=doiChieuPanel(thang,ma2);if(dc)out.append(dc);}
  return out;}


/* =====================================================================
   BÁO CÁO & THỐNG KÊ
   ===================================================================== */
function pbOfMa(ma){const n=nvByMa(ma);return n?pbName(n.pb):"";}
function bcKpiDichVuPanel(thang,rows){
  if(!S.dv.length)return h("div",{class:"panel"},h("p",{class:"muted"},"Chưa có danh sách dịch vụ. Vào Danh mục → Dịch vụ để khai báo."));
  const sumSvc=ma=>rows.reduce((s,r)=>s+(+(r.sl||{})[ma]||0),0);
  const total=agg(rows).total;
  const trs=S.dv.map(d=>{const v=sumSvc(d.ma);return h("tr",{},h("td",{class:"l"},h("strong",{},d.ten),h("span",{class:"muted small mono"}," "+d.ma)),
    h("td",{},fmt(v,0)),h("td",{},total?fmt(v/total*100,0)+"%":"—"));});
  const box=h("div",{class:"chartbox",style:"height:280px"},h("canvas",{"aria-label":"KPI theo dịch vụ trong tháng"}));
  const out=h("div",{class:"panel"},h("div",{class:"panel-head"},h("h3",{},"Tổng hợp KPI theo dịch vụ, "+monthLabel(thang).toLowerCase()),
    h("span",{class:"small muted"},`${rows.length} nhân viên, tổng ${fmt(total,0)} case`)),box,
    h("div",{class:"scroll",style:"margin-top:14px"},h("table",{class:"grid"},h("thead",{},h("tr",{},h("th",{class:"l"},"Dịch vụ"),h("th",{},"Tổng case"),h("th",{},"Tỷ trọng"))),
      h("tbody",{},trs.length?trs:[h("tr",{},h("td",{class:"l",colspan:"3"},"Chưa có số liệu."))]))));
  S.after.push(()=>{const pal=PALETTE();const c=mkChart(box.querySelector("canvas"),{type:"doughnut",
    data:{labels:S.dv.map(d=>d.ten),datasets:[{data:S.dv.map(d=>sumSvc(d.ma)),backgroundColor:S.dv.map((_,i)=>pal[i%pal.length])}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"right",labels:{boxWidth:10}}}}});if(c)S.charts.push(c);});
  return out;}
function bcCongViecPanel(list){
  const m=new Map();
  for(const r of list){
    if(!m.has(r.ma_nv))m.set(r.ma_nv,{tong:0,dinh_ky:0,phat_sinh:0,hoan_thanh:0,dang:0,qua_han:0,chua_ht:0,tuSum:0,tuN:0,qlSum:0,qlN:0});
    const s=m.get(r.ma_nv);s.tong++;
    if(r.loai==="dinh_ky")s.dinh_ky++;else s.phat_sinh++;
    if(r.trang_thai==="hoan_thanh")s.hoan_thanh++;
    else if(r.trang_thai==="dang_thuc_hien")s.dang++;
    else if(r.trang_thai==="qua_han")s.qua_han++;
    else s.chua_ht++;
    if(r.tu_sao){s.tuSum+=r.tu_sao;s.tuN++;}
    if(r.qly_sao){s.qlSum+=r.qly_sao;s.qlN++;}}
  const keys=[...m.keys()].sort((a,b)=>empName(a).localeCompare(empName(b),"vi"));
  const rows=keys.map(ma=>{const s=m.get(ma);const rate=s.tong?s.hoan_thanh/s.tong*100:null;
    return h("tr",{},h("td",{class:"l"},who(empName(ma))),h("td",{},s.tong),h("td",{},s.dinh_ky),h("td",{},s.phat_sinh),
      h("td",{},s.hoan_thanh),h("td",{},s.dang),h("td",{},s.qua_han),h("td",{},s.chua_ht),
      h("td",{},rate==null?"—":fmt(rate,0)+"%"),h("td",{},s.tuN?fmt(s.tuSum/s.tuN,1)+" ★":"—"),h("td",{},s.qlN?fmt(s.qlSum/s.qlN,1)+" ★":"—"));});
  const tongViec=list.length,tongHT=list.filter(r=>r.trang_thai==="hoan_thanh").length;
  const box=h("div",{class:"chartbox",style:"height:280px"},h("canvas",{"aria-label":"Tỷ lệ hoàn thành công việc theo nhân viên"}));
  const out=h("div",{class:"panel"},h("div",{class:"panel-head"},h("h3",{},"Thống kê công việc theo nhân viên"),
    h("span",{class:"small muted"},`${tongViec} việc, ${tongViec?fmt(tongHT/tongViec*100,0):0}% hoàn thành toàn đội`)),box,
    h("div",{class:"scroll",style:"margin-top:14px"},h("table",{class:"grid"},h("thead",{},h("tr",{},h("th",{class:"l"},"Nhân viên"),h("th",{},"Tổng việc"),h("th",{},"Cố định"),h("th",{},"Phát sinh"),
      h("th",{},"Hoàn thành"),h("th",{},"Đang làm"),h("th",{},"Quá hạn"),h("th",{},"Chưa HT"),h("th",{},"Tỷ lệ HT"),h("th",{},"Tự đánh giá"),h("th",{},"QL đánh giá"))),
      h("tbody",{},rows.length?rows:[h("tr",{},h("td",{class:"l",colspan:"10"},"Chưa có công việc nào trong tháng này."))]))));
  S.after.push(()=>{const pal=PALETTE();const c=mkChart(box.querySelector("canvas"),{type:"bar",
    data:{labels:keys.map(empName),datasets:[{label:"Tỷ lệ hoàn thành (%)",data:keys.map(ma=>{const s=m.get(ma);return s.tong?Math.round(s.hoan_thanh/s.tong*100):0;}),backgroundColor:pal[0],borderRadius:4,maxBarThickness:28}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false}},y:{beginAtZero:true,max:100,border:{display:false}}}}});if(c)S.charts.push(c);});
  return out;}
function bcKeHoachPanel(khList,cvList){
  const khM=new Map();for(const r of khList)khM.set(r.ma_nv,(khM.get(r.ma_nv)||0)+1);
  const cvM=new Map();for(const r of cvList){if(!cvM.has(r.ma_nv))cvM.set(r.ma_nv,{tong:0,ht:0});const s=cvM.get(r.ma_nv);s.tong++;if(r.trang_thai==="hoan_thanh")s.ht++;}
  const keys=[...new Set([...khM.keys(),...cvM.keys()])].sort((a,b)=>empName(a).localeCompare(empName(b),"vi"));
  const rows=keys.map(ma=>{const kh=khM.get(ma)||0;const cv=cvM.get(ma)||{tong:0,ht:0};
    return h("tr",{},h("td",{class:"l"},who(empName(ma))),h("td",{},kh),h("td",{},cv.tong),h("td",{},cv.ht),h("td",{},kh?fmt(cv.ht/kh*100,0)+"%":"—"));});
  return h("div",{class:"panel"},h("div",{class:"panel-head"},h("h3",{},"So sánh kế hoạch với kết quả thực tế"),h("span",{class:"small muted"},"Theo số đầu việc")),
    h("div",{class:"scroll"},h("table",{class:"grid"},h("thead",{},h("tr",{},h("th",{class:"l"},"Nhân viên"),h("th",{},"Số việc trong kế hoạch"),h("th",{},"Số việc thực hiện"),h("th",{},"Số việc hoàn thành"),h("th",{},"Hoàn thành/Kế hoạch"))),
      h("tbody",{},rows.length?rows:[h("tr",{},h("td",{class:"l",colspan:"5"},"Chưa có dữ liệu kế hoạch hoặc công việc trong tháng này."))]))),
    h("p",{class:"hint",style:"margin-top:8px"},"So sánh theo số lượng đầu việc. Muốn đối chiếu từng việc cụ thể theo từng người, xem ở mục Kế hoạch tháng."));}
function bcHieuSuatPanel(y,pb){
  const months=Array.from({length:12},(_,i)=>`${y}-${pad(i+1)}`);
  const people=(pb?S.nv.filter(n=>pbName(n.pb)===pb):S.nv).filter(n=>!S.bcMa||n.ma===S.bcMa);
  const box=h("div",{class:"chartbox",style:"height:320px"},h("canvas",{"aria-label":"So sánh hiệu suất nhân viên theo tháng"}));
  const rows=people.map(n=>h("tr",{},h("td",{class:"l"},who(n.ten||n.ma)),months.map(m=>{const r=S.kpi.get(m+"|"+n.ma);const c=r?calc(r):null;return h("td",{},c&&c.avg!=null?fmt(c.avg):"·");})));
  const out=h("div",{class:"panel"},h("div",{class:"panel-head"},h("h3",{},"So sánh hiệu suất nhân viên theo tháng"),h("span",{class:"small muted"},"TB case/ngày, năm "+y)),box,
    h("div",{class:"scroll",style:"margin-top:14px"},h("table",{class:"grid"},h("thead",{},h("tr",{},h("th",{class:"l"},"Nhân viên"),months.map(m=>h("th",{},"T"+(+m.slice(5)))))),
      h("tbody",{},rows.length?rows:[h("tr",{},h("td",{class:"l",colspan:"13"},"Không có nhân viên."))]))));
  S.after.push(()=>{const pal=PALETTE();const c=mkChart(box.querySelector("canvas"),{type:"line",
    data:{labels:months.map(m=>"T"+(+m.slice(5))),datasets:people.map((n,i)=>({label:n.ten||n.ma,data:months.map(m=>{const r=S.kpi.get(m+"|"+n.ma);return r?calc(r).avg:null;}),borderColor:pal[i%pal.length],backgroundColor:pal[i%pal.length],tension:.3,pointRadius:2.5,spanGaps:true}))},
    options:{responsive:true,maintainAspectRatio:false,interaction:{mode:"index",intersect:false},plugins:{legend:{position:"bottom",labels:{boxWidth:10}}},scales:{x:{grid:{display:false}},y:{beginAtZero:true,border:{display:false}}}}});if(c)S.charts.push(c);});
  return out;}
function exportBaoCao(thang,pb,ma){
  if(!window.XLSX){toast("Không tải được thư viện Excel.");return;}
  const rows=monthRows(thang,pb).filter(r=>!ma||r.ma===ma);
  const wsKpi=XLSX.utils.aoa_to_sheet([["Mã NV","Họ tên","Phòng ban",...S.dv.map(d=>d.ten),"Tổng KPI","TB/ngày","Mục tiêu","Kết quả"],
    ...rows.map(r=>{const c=calc(r);return [r.ma,r.ten,r.pb,...S.dv.map(d=>+(r.sl||{})[d.ma]||0),c.total,c.avg,c.chuan,c.pass==null?"":c.pass?"Đạt":"Không đạt"];})]);
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,wsKpi,"KPI dich vu");
  const cvAll=(S.bcCv&&S.bcCv._thang===thang)?S.bcCv.list:[];
  const cvList=cvAll.filter(r=>(!ma||r.ma_nv===ma)&&(!pb||pbOfMa(r.ma_nv)===pb));
  const wsCv=XLSX.utils.aoa_to_sheet([["Mã NV","Họ tên","Loại","Công việc","Hạn","Tiến độ %","Trạng thái","Kết quả","Tự đánh giá","QL đánh giá","Nhận xét QL"],
    ...cvList.map(r=>[r.ma_nv,empName(r.ma_nv),r.loai==="dinh_ky"?"Cố định":"Phát sinh",r.ten_cv,r.han||"",r.tien_do,r.trang_thai,r.ket_qua||"",r.tu_sao||"",r.qly_sao||"",r.qly_nhan_xet||""])]);
  XLSX.utils.book_append_sheet(wb,wsCv,"Cong viec");
  const khAll=(S.bcKh&&S.bcKh._thang===thang)?S.bcKh.list:[];
  const khList=khAll.filter(r=>(!ma||r.ma_nv===ma)&&(!pb||pbOfMa(r.ma_nv)===pb));
  const wsKh=XLSX.utils.aoa_to_sheet([["Mã NV","Họ tên","Công việc dự kiến","Thời gian dự kiến","Kết quả mong muốn","Ghi chú"],
    ...khList.map(r=>[r.ma_nv,empName(r.ma_nv),r.ten_cv_du_kien,r.thoi_gian_du_kien||"",r.ket_qua_mong_muon||"",r.ghi_chu||""])]);
  XLSX.utils.book_append_sheet(wb,wsKh,"Ke hoach");
  saveFile(`EasySupport_BaoCao_${thang}.xlsx`,XLSX.write(wb,{bookType:"xlsx",type:"array"}),"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");}
function viewBaoCao(){
  const out=h("div",{class:"stack"});
  if(!S.authMode||!isAdmin())return h("p",{class:"banner"},"Chỉ Quản lý/Admin mới xem được mục này.");
  const thang=S.bcThang||S.month||thisMonth();S.bcThang=thang;
  const y=+thang.slice(0,4),pb=S.bcPb||"";
  const maSel=h("select",{"aria-label":"Nhân viên",onchange:e=>{S.bcMa=e.target.value;render();}},h("option",{value:""},"Toàn đội"),S.nv.map(n=>h("option",{value:n.ma},n.ten||n.ma)));
  maSel.value=S.bcMa||"";
  out.append(h("div",{class:"row"},monthBar(v=>{S.bcThang=v;S.bcCv=null;S.bcKh=null;render();}),deptSelect(pb,v=>{S.bcPb=v;render();}),maSel,h("span",{class:"spacer"}),
    h("button",{class:"ghost",type:"button",onclick:()=>exportBaoCao(thang,pb,S.bcMa)},"⬇ Tải Excel báo cáo")));
  const rowsAll=monthRows(thang,pb).filter(r=>!S.bcMa||r.ma===S.bcMa);
  out.append(bcKpiDichVuPanel(thang,rowsAll));
  if((!S.bcCv||S.bcCv._thang!==thang)&&!S.bcCvLoading){S.bcCvLoading=true;S.bcCvErr="";
    sbRpc("kpi_cv_list_thang",{p_thang:thang,p_ma_nv:null}).then(l=>{S.bcCv={_thang:thang,list:l||[]};})
      .catch(e=>{S.bcCvErr=errMsg(e);}).finally(()=>{S.bcCvLoading=false;if(S.view==="baocao")render();});}
  if((!S.bcKh||S.bcKh._thang!==thang)&&!S.bcKhLoading){S.bcKhLoading=true;S.bcKhErr="";
    sbRpc("kpi_kh_list",{p_thang:thang,p_ma_nv:null}).then(l=>{S.bcKh={_thang:thang,list:l||[]};})
      .catch(e=>{S.bcKhErr=errMsg(e);}).finally(()=>{S.bcKhLoading=false;if(S.view==="baocao")render();});}
  if(S.bcCvErr)out.append(h("p",{class:"banner"},S.bcCvErr));
  if(S.bcKhErr)out.append(h("p",{class:"banner"},S.bcKhErr));
  if(!S.bcCv||S.bcCv._thang!==thang||!S.bcKh||S.bcKh._thang!==thang){out.append(h("p",{class:"muted"},"Đang tải số liệu công việc & kế hoạch…"));return out;}
  const cvList=S.bcCv.list.filter(r=>(!S.bcMa||r.ma_nv===S.bcMa)&&(!pb||pbOfMa(r.ma_nv)===pb));
  const khList=S.bcKh.list.filter(r=>(!S.bcMa||r.ma_nv===S.bcMa)&&(!pb||pbOfMa(r.ma_nv)===pb));
  out.append(bcCongViecPanel(cvList));
  out.append(bcKeHoachPanel(khList,cvList));
  out.append(bcHieuSuatPanel(y,pb));
  return out;}


/* =====================================================================
   KPI THÁNG: dữ liệu, công chuẩn, nhập liệu, danh mục, báo cáo
   ===================================================================== */
function num(v){if(v==null)return null;if(typeof v==="number")return isFinite(v)?v:null;
  let t=String(v).trim().replace(/\s/g,"");if(!t)return null;
  if(/^-?\d+([.,]\d+)?$/.test(t))return Number(t.replace(",","."));return null;}
function cellStr(v){return v==null?"":String(v).trim();}
function cleanName(raw){const s=String(raw||"").normalize("NFC").replace(/\s+/g," ").trim();const probation=/thu viec/.test(fold(s));
  const base=s.replace(/\s*\([^)]*\)\s*/g," ").replace(/\s+/g," ").trim()||s;return {name:base,probation,key:fold(base)};}
const thisMonth=()=>todayISO().slice(0,7);
function monthLabel(k){const p=k.split("-");return `Tháng ${+p[1]}/${p[0]}`;}
function monthShort(k){const p=k.split("-");return `T${+p[1]}/${p[0].slice(2)}`;}
function shiftMonth(k,n){let [y,m]=k.split("-").map(Number);m+=n;while(m<1){m+=12;y--;}while(m>12){m-=12;y++;}return `${y}-${pad(m)}`;}
function uid2(){return Math.random().toString(36).slice(2,9);}
function dateOrNull(s){return s&&/^\d{4}-\d{2}-\d{2}$/.test(s)?s:null;}
function parseAnyDate(v){if(v==null||v==="")return null;
  if(typeof v==="number"&&v>20000&&v<80000&&window.XLSX){const d=XLSX.SSF.parse_date_code(v);return d?iso(d.y,d.m,d.d):null;}
  const s=String(v).trim();let m=s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);if(m)return iso(+m[1],+m[2],+m[3]);
  m=s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/);if(m)return iso(+m[3],+m[2],+m[1]);return null;}
function toMonth(v,year){if(v==null||v==="")return null;
  if(typeof v==="number"){if(v>20000&&v<80000&&window.XLSX){const d=XLSX.SSF.parse_date_code(v);return d?`${d.y}-${pad(d.m)}`:null;}
    if(v>=1&&v<=12)return `${year}-${pad(v)}`;return null;}
  const s=fold(String(v)).replace(/^thang\s*|^t\s*/,"").trim();let m;
  if((m=s.match(/^(\d{4})[-\/.](\d{1,2})/)))return +m[2]>=1&&+m[2]<=12?`${m[1]}-${pad(+m[2])}`:null;
  if((m=s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/)))return +m[2]>=1&&+m[2]<=12?`${m[3]}-${pad(+m[2])}`:null;
  if((m=s.match(/^(\d{1,2})\s*[-\/.]\s*(\d{4})$/)))return +m[1]>=1&&+m[1]<=12?`${m[2]}-${pad(+m[1])}`:null;
  if((m=s.match(/^(\d{1,2})$/)))return +m[1]>=1&&+m[1]<=12?`${year}-${pad(+m[1])}`:null;
  return null;}
function seniority(d){ // Thâm niên = Ngày hiện tại − Ngày chính thức
  if(!d)return "Chưa chính thức";const t=todayISO();if(d>t)return "Chưa đến ngày";
  const a=parseISO(d),b=parseISO(t);let mo=(b.getUTCFullYear()-a.getUTCFullYear())*12+(b.getUTCMonth()-a.getUTCMonth());
  if(b.getUTCDate()<a.getUTCDate())mo--;
  if(mo<1)return Math.round((b-a)/864e5)+" ngày";
  const y=Math.floor(mo/12),r=mo%12;return [y?y+" năm":"",r?r+" tháng":""].filter(Boolean).join(" ");}

/* ---------- danh mục ---------- */
const CHUC_VU=["Trưởng phòng","Key","Chính thức","Thử việc","CTV","TTS"];
const KHU_VUC=["Hà Nội","Nam Định","Đà Nẵng","Sài Gòn"];
function kvMatch(s){const f=fold(s||"");if(!f)return null;if(/(ho chi minh|hcm|tphcm|sai gon|saigon)/.test(f))return "Sài Gòn";if(/(ha noi|hanoi|hn$)/.test(f))return "Hà Nội";
  return KHU_VUC.find(x=>fold(x)===f)||null;}
function cvOf(ma){const n=nvByMa(ma);return n&&n.cv?n.cv:"";}
function cvTag(ma){const c=cvOf(ma);return c?h("span",{class:"tag cv"},c):null;}
function dmy(d){return d&&/^\d{4}-\d{2}-\d{2}$/.test(d)?fmtFull(d):"";}
function parseDMY(s){s=String(s||"").trim();if(!s)return {ok:true,v:null};
  const m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);if(!m)return {ok:false};
  const d=+m[1],mo=+m[2],y=+m[3];const dt=new Date(Date.UTC(y,mo-1,d));
  if(y<1900||y>2100||dt.getUTCMonth()!==mo-1||dt.getUTCDate()!==d)return {ok:false};return {ok:true,v:iso(y,mo,d)};}
function dateBox(val,onSet,lab,ro){
  const inp=h("input",{type:"text",inputmode:"numeric",placeholder:"dd/mm/yyyy",maxlength:"10",value:dmy(val),disabled:ro,class:"dmy","aria-label":lab,autocomplete:"off",
    oninput:e=>{const t=e.target;t.classList.remove("bad");
      if(e.inputType&&!e.inputType.startsWith("insert"))return;           // đang xóa thì để yên
      const raw=t.value;if(/^\d\/|\/\d\//.test(raw))return;              // người dùng tự gõ dạng 1/2/2001
      let v=raw.replace(/\D/g,"").slice(0,8);
      if(v.length>=4)v=v.slice(0,2)+"/"+v.slice(2,4)+(v.length>4||raw.endsWith("/")?"/"+v.slice(4):"");
      else if(v.length>=2)v=v.slice(0,2)+(v.length>2||raw.endsWith("/")?"/"+v.slice(2):"");
      t.value=v;},
    onchange:e=>{const r=parseDMY(e.target.value);if(!r.ok){e.target.classList.add("bad");onSet(undefined);toast(lab+": ngày không hợp lệ, nhập dạng dd/mm/yyyy.");return;}
      e.target.classList.remove("bad");if(r.v)e.target.value=dmy(r.v);onSet(r.v);}});
  const btn=h("button",{type:"button",class:"dmy-btn",disabled:ro,"aria-label":"Chọn "+lab.toLowerCase()+" trên lịch",title:"Chọn trên lịch",
    onclick:e=>{e.preventDefault();if(calPop&&calPop._for===inp){closeCal();return;}const r=parseDMY(inp.value);
      openCal(inp,r.ok?r.v:null,v=>{inp.value=dmy(v);inp.classList.remove("bad");onSet(v);});}},
    h("svg",{}));
  btn.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/></svg>';
  return h("span",{class:"dmy-wrap"},inp,btn);}

/* ---------- lịch chọn ngày ---------- */
let calPop=null;
function closeCal(){if(!calPop)return;const f=calPop._for;calPop.remove();calPop=null;
  document.removeEventListener("mousedown",calOutside,true);document.removeEventListener("keydown",calKey,true);window.removeEventListener("scroll",calScroll,true);window.removeEventListener("resize",placeCal);
  if(f&&document.body.contains(f))f.focus();}
function calOutside(e){if(calPop&&!calPop.contains(e.target)&&!(e.target.closest&&e.target.closest(".dmy-btn")))closeCal();}
function calKey(e){if(e.key==="Escape"){e.preventDefault();closeCal();}}
function calScroll(e){if(calPop&&!calPop.contains(e.target))placeCal();}
function placeCal(){if(!calPop)return;const input=calPop._for;if(!input||!document.body.contains(input)){closeCal();return;}
  const r=input.getBoundingClientRect();if(r.bottom<0||r.top>window.innerHeight){closeCal();return;}   // ô ngày đã cuộn ra khỏi màn hình
  const pw=calPop.offsetWidth,ph=calPop.offsetHeight;let top=r.bottom+6;const left=Math.min(Math.max(8,r.left),window.innerWidth-pw-8);
  if(top+ph>window.innerHeight-8&&r.top-ph-6>8)top=r.top-ph-6;calPop.style.top=Math.max(8,top)+"px";calPop.style.left=Math.max(8,left)+"px";}
function openCal(input,cur,onPick){
  closeCal();
  const today=todayISO();const base=parseISO(cur||today);let y=base.getUTCFullYear(),m=base.getUTCMonth();
  const pop=h("div",{class:"cal-pop",role:"dialog","aria-label":"Chọn ngày"});pop._for=input;
  const MN=Array.from({length:12},(_,i)=>"Tháng "+(i+1));
  const draw=()=>{
    const ySel=h("select",{"aria-label":"Năm",onchange:e=>{y=+e.target.value;draw();}},
      Array.from({length:Math.max(2040,y+1)-1940+1},(_,i)=>1940+i).reverse().map(v=>h("option",{value:String(v)},String(v))));ySel.value=String(y);
    const mSel=h("select",{"aria-label":"Tháng",onchange:e=>{m=+e.target.value;draw();}},MN.map((t,i)=>h("option",{value:String(i)},t)));mSel.value=String(m);
    const step=n=>{m+=n;if(m<0){m=11;y--;}if(m>11){m=0;y++;}draw();};
    const first=new Date(Date.UTC(y,m,1));const off=(first.getUTCDay()+6)%7;const nd=new Date(Date.UTC(y,m+1,0)).getUTCDate();
    const cells=[];for(let i=0;i<off;i++)cells.push(h("span",{class:"cd out"}));
    for(let d=1;d<=nd;d++){const v=iso(y,m+1,d);const w=(off+d-1)%7;
      cells.push(h("button",{type:"button",class:"cd"+(v===cur?" sel":"")+(v===today?" today":"")+(w>=5?" we":""),"aria-label":fmtFull(v),"aria-pressed":v===cur?"true":"false",
        onclick:()=>{onPick(v);closeCal();}},String(d)));}
    pop.replaceChildren(
      h("div",{class:"cal-head"},h("button",{type:"button",class:"cal-nav","aria-label":"Tháng trước",onclick:()=>step(-1)},"‹"),mSel,ySel,
        h("button",{type:"button",class:"cal-nav","aria-label":"Tháng sau",onclick:()=>step(1)},"›")),
      h("div",{class:"cal-grid"},["T2","T3","T4","T5","T6","T7","CN"].map(t=>h("span",{class:"cw"},t)),cells),
      h("div",{class:"cal-foot"},h("button",{type:"button",class:"linkish sync",onclick:()=>{onPick(today);closeCal();}},"Hôm nay"),
        h("button",{type:"button",class:"linkish",style:"color:var(--bad);font-weight:600",onclick:()=>{onPick(null);closeCal();}},"Xóa")));
    const f=pop.querySelector(".cd.sel")||pop.querySelector(".cd.today");if(f&&pop.isConnected)f.focus({preventScroll:true});};
  draw();document.body.append(pop);calPop=pop;placeCal();
  const f=pop.querySelector(".cd.sel")||pop.querySelector(".cd.today");if(f)f.focus({preventScroll:true});
  // cú bấm mở lịch đã qua (mousedown xảy ra trước click), nên gắn ngay được
  document.addEventListener("mousedown",calOutside,true);document.addEventListener("keydown",calKey,true);
  window.addEventListener("scroll",calScroll,true);window.addEventListener("resize",placeCal);}
const pbById=id=>S.pb.find(p=>p.id===id)||null;
const pbName=id=>(pbById(id)||{}).ten||"";
const pbOrder=()=>S.pb.map(p=>p.ten);
const nvByMa=ma=>S.nv.find(n=>fold(n.ma)===fold(ma))||null;

/* ---------- dịch vụ riêng của từng phòng ban ---------- */
function pbByName(name){const f=fold(name||"");return S.pb.find(p=>fold(p.ten)===f)||null;}
function dvFor(pbName){const p=pbByName(pbName);if(!p||!Array.isArray(p.dvs)||!p.dvs.length)return S.dv;const set=new Set(p.dvs);return S.dv.filter(d=>set.has(d.ma));}
function dvUnion(names){const set=new Set();for(const n of names)for(const d of dvFor(n))set.add(d.ma);return S.dv.filter(d=>set.has(d.ma));}
/* ---------- sắp xếp theo thâm niên ---------- */
const SORTS=[["","Mặc định"],["tn_desc","Thâm niên: lâu nhất trước"],["tn_asc","Thâm niên: mới nhất trước"],["ma","Mã NV"],["ten","Tên A → Z"]];
function nctOf(ma){const n=nvByMa(ma);return n&&n.nct?n.nct:null;}
function cmpBy(mode,getMa,getTen){return (a,b)=>{
  if(mode==="tn_desc"||mode==="tn_asc"){const x=nctOf(getMa(a)),y=nctOf(getMa(b));if(!x&&!y)return 0;if(!x)return 1;if(!y)return -1;return mode==="tn_desc"?x.localeCompare(y):y.localeCompare(x);}
  if(mode==="ten"){const ta=String(getTen(a)||"").trim().split(/\s+/).pop(),tb=String(getTen(b)||"").trim().split(/\s+/).pop();return ta.localeCompare(tb,"vi")||String(getTen(a)).localeCompare(String(getTen(b)),"vi");}
  if(mode==="ma")return String(getMa(a)).localeCompare(String(getMa(b)),"vi",{numeric:true});return 0;};}
function sortSelect(value,onPick){const s=h("select",{"aria-label":"Sắp xếp",class:"sort-sel",onchange:e=>onPick(e.target.value)},SORTS.map(([k,l])=>h("option",{value:k},"↕ "+l)));s.value=value||"";return s;}
/* ---------- sinh nhật ---------- */
function bdayToday(){const t=todayISO(),md=t.slice(5),y=+t.slice(0,4),leap=(y%4===0&&y%100!==0)||y%400===0;
  return S.nv.filter(n=>n.ns&&(n.ns.slice(5)===md||(!leap&&md==="02-28"&&n.ns.slice(5)==="02-29")));}
function bdayEl(){const list=bdayToday();if(!list.length)return null;const key="bday|"+todayISO();if(lsGet("kpi:bday-hide")===key)return null;
  const me=S.me&&S.me.ho_ten?fold(S.me.ho_ten):"";const mine=list.find(n=>me&&fold(n.ten)===me);
  const age=n=>{const a=+todayISO().slice(0,4)-+n.ns.slice(0,4);return a>0&&a<100?a:null;};
  const short=n=>n.ten.trim().split(/\s+/).pop();
  let txt;
  if(mine){const others=list.filter(n=>n!==mine);
    txt=[h("strong",{},`Chúc mừng sinh nhật ${short(mine)}! 🎉`)," Chúc bạn tuổi mới thật nhiều sức khỏe, niềm vui và thành công."+(others.length?` Hôm nay cũng là sinh nhật của ${others.map(n=>n.ten).join(", ")} nữa đó!`:"")];}
  else txt=[h("strong",{},"Hôm nay là sinh nhật của "),...list.flatMap((n,i)=>[i?(i===list.length-1?" và ":", "):"",h("strong",{class:"bd-name"},n.ten),pbName(n.pb)?h("span",{class:"bd-pb"},` (${pbName(n.pb)})`):""]),"! Cùng gửi lời chúc mừng nhé 🎉"];
  return h("div",{class:"bday",id:"bday",role:"status"},h("span",{class:"bd-ic","aria-hidden":"true"},"🎂"),h("div",{class:"bd-txt"},txt),
    h("span",{class:"bd-conf","aria-hidden":"true"},"🎈🎊"),
    h("button",{class:"g-x",type:"button","aria-label":"Ẩn lời chúc sinh nhật",title:"Ẩn trong hôm nay",onclick:()=>{lsSet("kpi:bday-hide",key);const el=document.getElementById("bday");if(el)el.remove();}},"×"));}
function bdayMonthPanel(k){const m=k.slice(5);const list=S.nv.filter(n=>n.ns&&n.ns.slice(5,7)===m).sort((a,b)=>a.ns.slice(8).localeCompare(b.ns.slice(8)));
  if(!list.length)return null;const today=todayISO();
  return h("div",{class:"panel bd-month"},h("div",{class:"panel-head"},h("h3",{},`🎂 Sinh nhật ${monthLabel(k).toLowerCase()} này`),h("span",{class:"small muted"},`${list.length} người`)),
    h("div",{class:"bd-chips"},list.map(n=>{const isT=today.slice(5)===n.ns.slice(5);const past=k===today.slice(0,7)&&n.ns.slice(8)<today.slice(8);
      return h("span",{class:"bd-chip"+(isT?" today":past?" past":"")},h("span",{class:"bd-day"},n.ns.slice(8)+"/"+m),avatar(n.ten),h("span",{},n.ten),isT?h("span",{class:"bd-now"},"Hôm nay 🎉"):null);})));}

/* ---------- công chuẩn: nhập tay ---------- */
const validNum=v=>v!=null&&v!==""&&isFinite(+v);
function congDefault(){const d=S.cong&&S.cong.macdinh;return validNum(d)?+d:24;}
function congSet(thang){const o=S.cong&&S.cong.override&&S.cong.override[thang];return validNum(o)?+o:null;}
function congChuan(thang){const o=congSet(thang);return o!=null?o:congDefault();}
/* ---------- tính toán ---------- */
function rowTotal(r){const sl=r.sl||{};
  if(!S.dv.length)return Object.values(sl).reduce((s,x)=>s+(+x||0),0);
  return S.dv.reduce((s,d)=>s+(+sl[d.ma]||0),0);}
function calc(r){const total=rowTotal(r);const cs=congSet(r.thang);const cong=cs!=null?cs:validNum(r.cong)?+r.cong:congDefault();
  const nghi=+r.nghi||0;const tt=Math.max(0,cong-nghi);const avg=tt>0?total/tt:null;
  const chuan=r.chuan!=null&&r.chuan!==""&&isFinite(+r.chuan)?+r.chuan:null;
  return {total,cong,nghi,tt,avg,chuan,pass:avg!=null&&chuan!=null?avg>=chuan:null,truc:+r.truc||0};}
function prevPct(r){const p=S.kpi.get(shiftMonth(r.thang,-1)+"|"+r.ma);if(!p)return null;const a=calc(p).total;return a>0?calc(r).total/a*100:null;}
function agg(rows){let total=0,tt=0,n=0,pass=0,judged=0,truc=0,chs=0,chw=0;
  for(const r of rows){const c=calc(r);total+=c.total;truc+=c.truc;
    if(c.tt>0){tt+=c.tt;n++;if(c.pass!=null){judged++;if(c.pass)pass++;}if(c.chuan!=null){chs+=c.chuan*c.tt;chw+=c.tt;}}}
  return {total,tt,n,pass,judged,truc,rows:rows.length,avg:tt>0?total/tt:null,rate:judged?pass/judged:null,chuan:chw?chs/chw:null};}
function monthRows(k,pb){return (S.kmonths.get(k)||[]).filter(r=>!pb||r.pb===pb);}
function yearRows(y,pb){const out=[];for(const [k,rs] of S.kmonths)if(k.startsWith(y+"-"))for(const r of rs)if(!pb||r.pb===pb)out.push(r);return out;}
function deptsIn(rows){const set=new Set(rows.map(r=>r.pb||""));const ord=pbOrder();
  return [...set].sort((a,b)=>{const ia=ord.indexOf(a),ib=ord.indexOf(b);return (ia<0?999:ia)-(ib<0?999:ib)||a.localeCompare(b,"vi");});}
function allDepts(){const s=new Set(pbOrder());for(const r of S.kpi.values())if(r.pb)s.add(r.pb);return [...s];}
function rebuild(){
  const byM=new Map();for(const r of S.kpi.values()){if(!byM.has(r.thang))byM.set(r.thang,[]);byM.get(r.thang).push(r);}
  S.kmonths=byM;S.kmKeys=[...byM.keys()].sort();
  if(!S.month)S.month=S.kmKeys[S.kmKeys.length-1]||thisMonth();
  const ys=[...new Set(S.kmKeys.map(k=>+k.slice(0,4)))];if(!S.year||!ys.includes(S.year))S.year=ys.length?Math.max(...ys):thisYear;}
function applyKpiLoad(j){
  S.kpi=new Map((j.kpi||[]).map(r=>[r.thang+"|"+r.ma,{...r,sl:r.sl||{}}]));
  S.nv=Array.isArray(j.nhanvien)?j.nhanvien:[];S.dv=Array.isArray(j.dichvu)?j.dichvu:[];
  S.pb=Array.isArray(j.phongban)?j.phongban:[];S.cong=j.cong&&typeof j.cong==="object"?j.cong:{};}

/* ---------- hiển thị nhỏ ---------- */
function pctEl(p){if(p==null||!isFinite(p))return h("span",{class:"delta none"},"—");
  const c=p>=100.05?"up":p<=99.95?"down":"flat";return h("span",{class:"delta "+c},(c==="up"?"▲ ":c==="down"?"▼ ":"")+fmt(p,0)+"%");}
function chg(cur,prev,kind){if(cur==null||prev==null||(kind!=="pp"&&!prev))return h("span",{class:"delta none"},"—");
  if(kind==="pp"){const d=cur-prev;const c=d>0.05?"up":d<-0.05?"down":"flat";return h("span",{class:"delta "+c},(c==="up"?"▲ +":c==="down"?"▼ −":"± ")+fmt(Math.abs(d),1)+" điểm");}
  return pctEl(cur/prev*100);}
function kqChip(c){return c.pass===true?h("span",{class:"chip ok"},"Đạt"):c.pass===false?h("span",{class:"chip bad"},"Không đạt"):h("span",{class:"chip none"},"—");}
function monthOptions(extra){const set=new Set([...S.kmKeys,thisMonth(),...(extra||[])]);
  for(let i=1;i<=3;i++)set.add(shiftMonth(thisMonth(),-i));
  return [...set].sort().reverse().map(k=>h("option",{value:k},monthLabel(k)+(S.kmonths.has(k)?"":" (chưa có số liệu)")));}
function monthBar(onPick){
  const sel=h("select",{"aria-label":"Chọn tháng",onchange:e=>onPick(e.target.value)},monthOptions([S.month]));sel.value=S.month;
  return h("div",{class:"mbar"},h("button",{class:"ghost icon",type:"button","aria-label":"Tháng trước",onclick:()=>onPick(shiftMonth(S.month,-1))},"‹"),sel,
    h("button",{class:"ghost icon",type:"button","aria-label":"Tháng sau",onclick:()=>onPick(shiftMonth(S.month,1))},"›"));}
function deptSelect(value,onPick,allLabel="Tất cả phòng ban"){const d=allDepts();
  const s=h("select",{"aria-label":"Phòng ban",onchange:e=>onPick(e.target.value)},h("option",{value:""},allLabel),d.map(x=>h("option",{value:x},x||"(chưa có phòng ban)")));s.value=value||"";return s;}
function yearSelect(onPick){const ys=[...new Set([...S.kmKeys.map(k=>+k.slice(0,4)),thisYear])].sort((a,b)=>b-a);
  const s=h("select",{"aria-label":"Năm",onchange:e=>onPick(+e.target.value)},ys.map(y=>h("option",{value:String(y)},"Năm "+y)));s.value=String(S.year);return s;}
function setupChecklist(){
  const items=[["Phòng ban và KPI chuẩn",S.pb.length>0,"pb"],["Danh sách dịch vụ",S.dv.length>0,"dv"],["Danh sách nhân viên",S.nv.length>0,"nv"],["Công chuẩn mặc định",validNum(S.cong&&S.cong.macdinh),"cong"]];
  if(items.every(x=>x[1]))return null;
  return h("div",{class:"panel setup"},h("div",{class:"panel-head"},h("h3",{},"🧭 Thiết lập ban đầu"),h("span",{class:"small muted"},isAdmin()?"Làm lần lượt các bước dưới":"Nhờ Quản lý hoàn tất các bước dưới")),
    h("ol",{class:"setup-list"},items.map(([t,ok,tab])=>h("li",{class:ok?"done":""},h("span",{class:"chip "+(ok?"ok":"warn")},ok?"Xong":"Chưa có"),
      h("span",{},t),isAdmin()&&!ok?h("button",{class:"linkish sync",type:"button",onclick:()=>{S.dmTab=tab;go("danhmuc");}},"Khai báo ›"):null))));}

/* =====================================================================
   BÁO CÁO 1: TỔNG HỢP KPI THEO PHÒNG BAN
   ===================================================================== */
function viewTongHop(){
  const out=h("div",{class:"stack"});const st=setupChecklist();if(st)out.append(st);
  const k=S.month,pb=S.thPb||"",q=fold(S.search||"");
  const rowsAll=monthRows(k,pb),rows=rowsAll.filter(r=>!q||fold(r.ten).includes(q)||fold(r.ma).includes(q));
  const T=agg(rowsAll),TP=agg(monthRows(shiftMonth(k,-1),pb)),TY=agg(monthRows(shiftMonth(k,-12),pb));
  out.append(h("div",{class:"row"},monthBar(v=>{S.month=v;render();}),deptSelect(pb,v=>{S.thPb=v;render();}),h("span",{class:"spacer"}),
    h("button",{class:"ghost",type:"button",onclick:()=>exportTongHop(k,pb)},"⬇ Tải Excel")));
  if(!rowsAll.length){out.append(h("div",{class:"panel empty"},h("div",{class:"big-emoji"},"📭"),h("h2",{},monthLabel(k)+" chưa có số liệu"),
    h("p",{class:"muted"},"Vào Nhập KPI tháng để nhập tay hoặc tải file Excel."),h("button",{class:"btn",type:"button",onclick:()=>go("nhap")},"Nhập KPI tháng")));return out;}
  const cmp=(a,b,c,kind)=>h("div",{class:"cmp"},h("span",{},chg(a,b,kind)," tháng trước"),h("span",{},chg(a,c,kind)," cùng kỳ "+(+k.slice(0,4)-1)));
  out.append(heroCard(k,pb,T,TP));
  out.append(h("div",{class:"tiles tiles-4"},
    tile("Tổng KPI tháng (case)",fmt(T.total,0),`${T.rows} nhân viên`,cmp(T.total,TP.total||null,TY.total||null,"pct")),
    tile("TB case/ngày chung",fmt(T.avg),T.chuan!=null?"KPI chuẩn TB "+fmt(T.chuan):"\u00a0",cmp(T.avg,TP.avg,TY.avg,"pct")),
    tile("Tỷ lệ đạt",T.rate==null?"—":fmt(T.rate*100,0)+"%",`${T.pass}/${T.judged} người đạt`,cmp(T.rate==null?null:T.rate*100,TP.rate==null?null:TP.rate*100,TY.rate==null?null:TY.rate*100,"pp"),T.rate==null?null:T.rate*100),
    tile("Giờ trực",fmt(T.truc,1),`${fmt(T.tt,1)} công thực tế`,null)));
  out.append(topNeedPanels(rowsAll));
  const bdp=bdayMonthPanel(thisMonth());if(bdp)out.append(bdp);
  const showDv=!!S.showDv&&S.dv.length;
  const dvCols=showDv?(pb?dvFor(pb):S.dv):[];
  const head=h("tr",{},h("th",{class:"l"},"Mã NV"),h("th",{class:"l"},"Nhân viên"),dvCols.map(d=>h("th",{title:d.ten},d.ma)),
    h("th",{},"KPI tháng"),h("th",{},"Nghỉ"),h("th",{},"Công TT"),h("th",{},"TB/ngày"),h("th",{title:"KPI mục tiêu của từng người (case/ngày)"},"Mục tiêu"),h("th",{class:"c"},"Kết quả"),h("th",{},"So T.trước"),h("th",{},"Giờ trực"));
  const ncol=10+dvCols.length;const body=[];
  for(const dname of deptsIn(rows)){const rs=rows.filter(r=>(r.pb||"")===dname);const A=agg(rs);
    body.push(h("tr",{class:"grp"},h("td",{class:"l",colspan:String(2+dvCols.length)},h("strong",{},dname||"(chưa có phòng ban)"),h("span",{class:"muted small"},`  ${rs.length} người`)),
      h("td",{},h("strong",{},fmt(A.total,0))),h("td",{},""),h("td",{},fmt(A.tt,1)),h("td",{},h("strong",{},fmt(A.avg))),h("td",{},fmt(A.chuan)),
      h("td",{class:"c"},A.judged?h("span",{class:"small"},`${A.pass}/${A.judged} đạt`):""),h("td",{},""),h("td",{},fmt(A.truc,1))));
    rs.sort((a,b)=>(calc(b).avg||0)-(calc(a).avg||0)).forEach(r=>{const c=calc(r);
      body.push(h("tr",{},h("td",{class:"l mono"},r.ma),h("td",{class:"l"},h("div",{class:"who-cv"},who(r.ten||r.ma),cvTag(r.ma))),dvCols.map(d=>h("td",{},fmt(num((r.sl||{})[d.ma]),0))),
        h("td",{},h("strong",{},fmt(c.total,0))),h("td",{},fmt(c.nghi,1)),h("td",{},fmt(c.tt,1)),
        h("td",{class:"tb "+(c.pass===true?"ok":c.pass===false?"bad":"")},fmt(c.avg)),h("td",{},fmt(c.chuan)),h("td",{class:"c"},kqChip(c)),
        h("td",{},pctEl(prevPct(r))),h("td",{},fmt(c.truc,1))));});}
  out.append(h("div",{class:"panel"},h("div",{class:"panel-head"},h("h3",{},"Tổng hợp KPI nhân viên theo phòng ban, "+monthLabel(k).toLowerCase()),
      h("div",{class:"row"},h("input",{type:"search",placeholder:"Tìm mã hoặc tên…","aria-label":"Tìm nhân viên",value:S.search||"",
        oninput:e=>{S.search=e.target.value;clearTimeout(S._st);S._st=setTimeout(render,250);}}),
        S.dv.length?h("label",{class:"toggle"},h("input",{type:"checkbox",role:"switch",checked:showDv,onchange:e=>{S.showDv=e.target.checked;render();}}),"Chi tiết dịch vụ"):null)),
    h("div",{class:"scroll"},h("table",{class:"grid kt-report"},h("thead",{},head),h("tbody",{},body.length?body:[h("tr",{},h("td",{class:"l",colspan:String(ncol)},"Không có nhân viên nào khớp."))]))),
    h("p",{class:"hint",style:"margin-top:10px"},"Công thực tế = Công chuẩn − Ngày nghỉ. TB/ngày = KPI tháng ÷ Công thực tế. Đạt khi TB/ngày ≥ Mục tiêu của người đó. So T.trước = KPI tháng này ÷ KPI tháng trước × 100%.")));
  const s=document.querySelector("input[type=search]");
  S.after.push(()=>{const i=document.querySelector(".panel input[type=search]");if(i&&S.search&&document.activeElement!==i){i.focus();i.setSelectionRange(i.value.length,i.value.length);}});
  return out;}
function donut(rate){const r=46,c=2*Math.PI*r,v=rate==null?0:Math.max(0,Math.min(1,rate));
  const s=document.createElementNS("http://www.w3.org/2000/svg","svg");s.setAttribute("viewBox","0 0 120 120");s.setAttribute("class","donut");s.setAttribute("aria-hidden","true");
  s.innerHTML=`<circle cx="60" cy="60" r="${r}" class="d-bg"/><circle cx="60" cy="60" r="${r}" class="d-fg" stroke-dasharray="${(c*v).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 60 60)"/>`;
  return h("div",{class:"donut-wrap"},s,h("div",{class:"donut-txt"},h("strong",{},rate==null?"—":fmt(rate*100,0)+"%"),h("span",{},"đạt mục tiêu")));}
function heroCard(k,pb,T,TP){
  const ch=T.avg!=null&&TP.avg?T.avg/TP.avg*100-100:null;
  const trend=ch==null?"":Math.abs(ch)<0.5?", giữ nguyên so với tháng trước":ch>0?`, tăng ${fmt(ch,1)}% so với tháng trước`:`, giảm ${fmt(-ch,1)}% so với tháng trước`;
  return h("div",{class:"hero-k"},h("div",{class:"hk-text"},
      h("div",{class:"hk-eyebrow"},pb||"Toàn bộ phòng ban"),h("div",{class:"hk-title"},monthLabel(k)),
      h("p",{class:"hk-sum"},h("strong",{},`${T.pass}/${T.judged} người`)," đạt mục tiêu. Trung bình ",h("strong",{},`${fmt(T.avg)} case/ngày`),trend+"."),
      h("div",{class:"hk-facts"},h("span",{},"📦 ",h("strong",{},fmt(T.total,0))," case"),h("span",{},"👥 ",h("strong",{},String(T.rows))," nhân viên"),h("span",{},"🕒 ",h("strong",{},fmt(T.truc,1))," giờ trực"))),
    donut(T.rate));}
function topNeedPanels(rows){
  const sc=rows.map(r=>{const c=calc(r);return {r,c,ratio:c.avg!=null&&c.chuan?c.avg/c.chuan:null,p:prevPct(r)};}).filter(x=>x.ratio!=null);
  if(!sc.length)return h("div");
  const top=[...sc].sort((a,b)=>b.ratio-a.ratio).slice(0,5);
  const need=sc.filter(x=>x.c.pass===false).sort((a,b)=>a.ratio-b.ratio).slice(0,5);
  const medal=["🥇","🥈","🥉"];
  const item=(x,i,kind)=>h("button",{type:"button",class:"tn-item",title:"Xem phòng "+(x.r.pb||""),onclick:()=>{S.pbDept=x.r.pb;go("phongban");}},
    h("span",{class:"tn-rank"+(kind==="top"&&i<3?" medal":"")},kind==="top"&&i<3?medal[i]:String(i+1)),
    avatar(x.r.ten||x.r.ma),
    h("span",{class:"tn-who"},h("span",{class:"tn-name"},x.r.ten||x.r.ma,cvTag(x.r.ma)),h("span",{class:"tn-sub"},(x.r.pb?x.r.pb+", ":"")+`TB ${fmt(x.c.avg)} / mục tiêu ${fmt(x.c.chuan)}`)),
    h("span",{class:"tn-val"},h("strong",{class:kind==="top"?"ok":"bad"},fmt(x.ratio*100,0)+"%"),
      h("span",{class:"tn-bar"},h("span",{class:kind,style:`width:${Math.min(100,x.ratio/1.5*100)}%`})),
      h("span",{class:"tn-prev"},x.p==null?"":(x.p>=100?"▲ ":"▼ ")+fmt(x.p,0)+"% T.trước")));
  return h("div",{class:"two-col tops"},
    h("div",{class:"panel tn top"},h("div",{class:"panel-head"},h("h3",{},"🏆 Xuất sắc tháng"),h("span",{class:"small muted"},"% so với mục tiêu")),
      h("div",{class:"tn-list"},top.map((x,i)=>item(x,i,"top")))),
    h("div",{class:"panel tn need"},h("div",{class:"panel-head"},h("h3",{},"🤝 Cần hỗ trợ"),h("span",{class:"small muted"},need.length?"Chưa đạt, thấp nhất trước":"")),
      need.length?h("div",{class:"tn-list"},need.map((x,i)=>item(x,i,"need"))):h("div",{class:"tn-empty"},h("div",{class:"big-emoji"},"🎉"),h("p",{},"Cả nhóm đều đạt mục tiêu tháng này!"))));}
function tile(lab,val,sub,cmpEl,meter){return h("div",{class:"tile"},h("div",{class:"lab"},lab),h("div",{class:"val"},val),
  meter!=null?h("div",{class:"meter"},h("span",{style:`width:${Math.max(0,Math.min(100,meter))}%`})):null,h("div",{class:"sub"},sub),cmpEl||null);}
function exportTongHop(k,pb){
  if(!window.XLSX){toast("Không tải được thư viện Excel.");return;}
  const rows=monthRows(k,pb);const aoa=[["BÁO CÁO TỔNG HỢP KPI "+monthLabel(k).toUpperCase()+(pb?" – "+pb:"")],[],
    ["Phòng ban","Mã NV","Nhân viên","Chức vụ",...S.dv.map(d=>d.ten),"KPI tháng","Ngày nghỉ","Công chuẩn","Công thực tế","TB case/ngày","Mục tiêu (case/ngày)","Kết quả","So tháng trước (%)","Giờ trực"]];
  for(const dname of deptsIn(rows)){const rs=rows.filter(r=>(r.pb||"")===dname);
    rs.forEach(r=>{const c=calc(r);const p=prevPct(r);
      aoa.push([dname,r.ma,r.ten,cvOf(r.ma),...S.dv.map(d=>num((r.sl||{})[d.ma])),c.total,c.nghi,c.cong,c.tt,c.avg==null?null:Math.round(c.avg*100)/100,c.chuan,
        c.pass===true?"Đạt":c.pass===false?"Không đạt":"",p==null?null:Math.round(p),c.truc]);});
    const A=agg(rs);aoa.push(["Cộng "+(dname||""),"","","",...S.dv.map(d=>rs.reduce((s,r)=>s+(+(r.sl||{})[d.ma]||0),0)),A.total,"","",A.tt,A.avg==null?null:Math.round(A.avg*100)/100,A.chuan==null?null:Math.round(A.chuan*100)/100,`${A.pass}/${A.judged} đạt`,"",A.truc]);}
  const ws=XLSX.utils.aoa_to_sheet(aoa);ws["!cols"]=[{wch:18},{wch:10},{wch:26},{wch:13},...S.dv.map(()=>({wch:12})),{wch:11},{wch:9},{wch:10},{wch:11},{wch:12},{wch:10},{wch:10},{wch:14},{wch:9}];
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Tong hop");
  saveFile(`KPI_tong_hop_${k}${pb?"_"+fold(pb).replace(/\s+/g,"_"):""}.xlsx`,XLSX.write(wb,{bookType:"xlsx",type:"array"}),"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");}

/* =====================================================================
   BÁO CÁO 2 + 3: THEO PHÒNG BAN
   ===================================================================== */
function viewPhongBan(){
  const out=h("div",{class:"stack"});const st=setupChecklist();if(st)out.append(st);
  if(!S.kpi.size){out.append(emptyState());return out;}
  const y=S.year,depts=allDepts().filter(d=>yearRows(y,d).length);
  // --- bảng TB chung theo tháng
  const months=Array.from({length:12},(_,i)=>`${y}-${pad(i+1)}`);
  const trs=depts.map(d=>h("tr",{},h("td",{class:"l"},h("strong",{},d||"(chưa có)")),months.map(m=>{const A=agg(monthRows(m,d));
      return h("td",{class:"hc "+(A.avg==null?"":A.chuan!=null?(A.avg>=A.chuan?"ok":"bad"):""),title:A.avg==null?"":`${monthLabel(m)}: ${fmt(A.avg)} case/ngày, ${A.pass}/${A.judged} đạt`},A.avg==null?"·":fmt(A.avg));}),
    (()=>{const A=agg(yearRows(y,d));return h("td",{class:"hc yr"},h("strong",{},fmt(A.avg)));})()));
  const all=h("tr",{class:"grp"},h("td",{class:"l"},h("strong",{},"Toàn bộ")),months.map(m=>{const A=agg(monthRows(m));return h("td",{},A.avg==null?"·":fmt(A.avg));}),h("td",{},h("strong",{},fmt(agg(yearRows(y)).avg))));
  const lineBox=h("div",{class:"chartbox",style:"height:300px"},h("canvas",{"aria-label":"KPI trung bình chung theo tháng"}));
  out.append(h("div",{class:"panel"},h("div",{class:"panel-head"},h("h3",{},"KPI trung bình chung của từng phòng ban theo tháng"),yearSelect(v=>{S.year=v;render();})),
    h("div",{class:"scroll"},h("table",{class:"grid"},h("thead",{},h("tr",{},h("th",{class:"l"},"Phòng ban"),months.map(m=>h("th",{},"T"+(+m.slice(5)))),h("th",{},"Cả năm"))),h("tbody",{},trs,all))),
    h("p",{class:"hint",style:"margin:10px 0 14px"},"Đơn vị: case/ngày công. TB chung = tổng KPI cả phòng ÷ tổng công thực tế. Ô xanh là đạt KPI chuẩn của phòng, ô đỏ là chưa đạt."),lineBox));
  // --- so sánh nhân viên trong phòng
  const dsel=S.pbDept&&depts.includes(S.pbDept)?S.pbDept:depts[0];S.pbDept=dsel;
  const m=S.month,metric=S.pbMetric||"avg";
  const rs=monthRows(m,dsel).map(r=>({r,c:calc(r),p:prevPct(r)}));
  const val=x=>metric==="avg"?x.c.avg:metric==="total"?x.c.total:x.p;
  rs.sort((a,b)=>(val(b)??-1)-(val(a)??-1));
  const barBox=h("div",{class:"chartbox",style:`height:${Math.max(200,rs.length*34+60)}px`},h("canvas",{"aria-label":"So sánh nhân viên"}));
  const trendBox=h("div",{class:"chartbox",style:"height:300px"},h("canvas",{"aria-label":"Diễn biến nhân viên"}));
  const ds=deptSelect(dsel,v=>{S.pbDept=v;render();},"Chọn phòng ban");ds.firstChild.remove();
  out.append(h("div",{class:"panel"},h("div",{class:"panel-head"},h("h3",{},"So sánh nhân viên trong phòng ban"),
      h("div",{class:"row"},ds,monthBar(v=>{S.month=v;render();}),seg([["avg","TB/ngày"],["total","KPI tháng"],["prev","So T.trước %"]],metric,v=>{S.pbMetric=v;render();},"Chỉ số"))),
    rs.length?barBox:h("p",{class:"muted"},`${dsel||"Phòng ban này"} chưa có số liệu ${monthLabel(m).toLowerCase()}.`),
    h("h3",{style:"margin:18px 0 8px"},`Diễn biến TB case/ngày từng người, năm ${y}`),trendBox));
  S.after.push(()=>{const pal=PALETTE();
    const c1=mkChart(lineBox.querySelector("canvas"),{type:"line",data:{labels:months.map(m=>"T"+(+m.slice(5))),datasets:depts.map((d,i)=>({label:d||"(chưa có)",
      data:months.map(mm=>agg(monthRows(mm,d)).avg),borderColor:pal[i%pal.length],backgroundColor:pal[i%pal.length],tension:.3,pointRadius:3,spanGaps:true}))},
      options:{responsive:true,maintainAspectRatio:false,interaction:{mode:"index",intersect:false},plugins:{legend:{position:"bottom"},tooltip:{callbacks:{label:c=>` ${c.dataset.label}: ${fmt(c.parsed.y)}`}}},
        scales:{x:{grid:{display:false}},y:{beginAtZero:true,border:{display:false},title:{display:true,text:"case/ngày"}}}}});if(c1)S.charts.push(c1);
    if(rs.length){const ok=cv("--ok"),bad=cv("--bad"),brand=cv("--brand");
      const dsets=[{type:"bar",label:metric==="avg"?"TB case/ngày":metric==="total"?"KPI tháng":"So tháng trước (%)",data:rs.map(val),borderRadius:6,maxBarThickness:24,
        backgroundColor:rs.map(x=>metric==="avg"?(x.c.pass===true?ok:x.c.pass===false?bad:brand):metric==="prev"?((x.p||0)>=100?ok:bad):brand)}];
      if(metric==="avg")dsets.push({type:"line",label:"KPI chuẩn",data:rs.map(x=>x.c.chuan),showLine:false,pointStyle:"line",pointRadius:13,pointRotation:90,borderWidth:3,borderColor:cv("--ink"),backgroundColor:cv("--ink")});
      if(metric==="prev")dsets.push({type:"line",label:"100%",data:rs.map(()=>100),showLine:false,pointStyle:"line",pointRadius:13,pointRotation:90,borderWidth:2,borderColor:cv("--muted")});
      const c2=mkChart(barBox.querySelector("canvas"),{data:{labels:rs.map(x=>x.r.ten||x.r.ma),datasets:dsets},options:{indexAxis:"y",responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>` ${c.dataset.label}: ${fmt(c.parsed.x,metric==="total"?0:1)}${metric==="prev"?"%":""}`}}},
        scales:{x:{beginAtZero:true,border:{display:false}},y:{grid:{display:false},border:{display:false}}}}});if(c2)S.charts.push(c2);}
    const people=[...new Map(yearRows(y,dsel).map(r=>[r.ma,r.ten||r.ma])).entries()];
    const c3=mkChart(trendBox.querySelector("canvas"),{type:"line",data:{labels:months.map(m=>"T"+(+m.slice(5))),datasets:people.map(([ma,ten],i)=>({label:ten,
      data:months.map(mm=>{const r=S.kpi.get(mm+"|"+ma);return r?calc(r).avg:null;}),borderColor:pal[i%pal.length],backgroundColor:pal[i%pal.length],tension:.3,pointRadius:2.5,spanGaps:true}))},
      options:{responsive:true,maintainAspectRatio:false,interaction:{mode:"index",intersect:false},plugins:{legend:{position:"bottom",labels:{boxWidth:10}},tooltip:{callbacks:{label:c=>` ${c.dataset.label}: ${fmt(c.parsed.y)}`}}},
        scales:{x:{grid:{display:false}},y:{beginAtZero:true,border:{display:false}}}}});if(c3)S.charts.push(c3);});
  return out;}

/* =====================================================================
   BÁO CÁO 4: THEO DỊCH VỤ
   ===================================================================== */
function viewDichVu(){
  const out=h("div",{class:"stack"});const st=setupChecklist();if(st)out.append(st);
  if(!S.kpi.size||!S.dv.length){out.append(S.kpi.size?h("p",{class:"banner"},"Chưa có danh sách dịch vụ. Quản lý vào Danh mục → Dịch vụ để khai báo."):emptyState());return out;}
  const y=S.year,pb=S.dvPb||"";const months=Array.from({length:12},(_,i)=>`${y}-${pad(i+1)}`);
  const sumSvc=(rows,ma)=>rows.reduce((s,r)=>s+(+(r.sl||{})[ma]||0),0);
  const years=[...new Set(S.kmKeys.map(k=>+k.slice(0,4)))].sort();
  out.append(h("div",{class:"row"},yearSelect(v=>{S.year=v;render();}),deptSelect(pb,v=>{S.dvPb=v;render();})));
  const trs=S.dv.map(d=>{const tot=sumSvc(yearRows(y,pb),d.ma);return h("tr",{},h("td",{class:"l"},h("strong",{},d.ten),h("span",{class:"muted small mono"}," "+d.ma)),
    months.map(m=>{const v=sumSvc(monthRows(m,pb),d.ma);return h("td",{},v?fmt(v,0):"·");}),h("td",{},h("strong",{},fmt(tot,0))));});
  const tot=h("tr",{class:"grp"},h("td",{class:"l"},h("strong",{},"Tổng")),months.map(m=>{const v=agg(monthRows(m,pb)).total;return h("td",{},v?fmt(v,0):"·");}),h("td",{},h("strong",{},fmt(agg(yearRows(y,pb)).total,0))));
  const mBox=h("div",{class:"chartbox",style:"height:320px"},h("canvas",{"aria-label":"KPI dịch vụ theo tháng"}));
  out.append(h("div",{class:"panel"},h("div",{class:"panel-head"},h("h3",{},`KPI theo dịch vụ từng tháng, năm ${y}`),h("span",{class:"small muted"},"Đơn vị: case")),mBox,
    h("div",{class:"scroll",style:"margin-top:16px"},h("table",{class:"grid"},h("thead",{},h("tr",{},h("th",{class:"l"},"Dịch vụ"),months.map(m=>h("th",{},"T"+(+m.slice(5)))),h("th",{},"Cả năm"))),h("tbody",{},trs,tot)))));
  const yBox=h("div",{class:"chartbox",style:"height:300px"},h("canvas",{"aria-label":"KPI dịch vụ theo năm"}));
  const yr=S.dv.map(d=>{const vals=years.map(yy=>sumSvc(yearRows(yy,pb),d.ma));const last=vals[vals.length-1],prev=vals[vals.length-2];
    return h("tr",{},h("td",{class:"l"},h("strong",{},d.ten)),vals.map(v=>h("td",{},fmt(v,0))),h("td",{},years.length>1&&prev?pctEl(last/prev*100):h("span",{class:"delta none"},"—")));});
  out.append(h("div",{class:"panel"},h("div",{class:"panel-head"},h("h3",{},"So sánh KPI dịch vụ theo năm"),h("span",{class:"small muted"},"Tổng case cả năm")),yBox,
    h("div",{class:"scroll",style:"margin-top:16px"},h("table",{class:"grid"},h("thead",{},h("tr",{},h("th",{class:"l"},"Dịch vụ"),years.map(yy=>h("th",{},"Năm "+yy)),h("th",{},years.length>1?`${years[years.length-1]} so ${years[years.length-2]}`:"So năm trước"))),h("tbody",{},yr))),
    h("p",{class:"hint",style:"margin-top:10px"},"Năm đang chạy chưa đủ 12 tháng, nên so với năm trước chỉ mang tính tham khảo.")));
  S.after.push(()=>{const pal=PALETTE();
    const c1=mkChart(mBox.querySelector("canvas"),{type:"bar",data:{labels:months.map(m=>"T"+(+m.slice(5))),datasets:S.dv.map((d,i)=>({label:d.ten,data:months.map(m=>sumSvc(monthRows(m,pb),d.ma)),backgroundColor:pal[i%pal.length],borderRadius:4,maxBarThickness:22}))},
      options:{responsive:true,maintainAspectRatio:false,interaction:{mode:"index",intersect:false},plugins:{legend:{position:"bottom"}},scales:{x:{grid:{display:false}},y:{beginAtZero:true,border:{display:false}}}}});if(c1)S.charts.push(c1);
    const c2=mkChart(yBox.querySelector("canvas"),{type:"bar",data:{labels:S.dv.map(d=>d.ten),datasets:years.map((yy,i)=>({label:"Năm "+yy,data:S.dv.map(d=>sumSvc(yearRows(yy,pb),d.ma)),backgroundColor:pal[i%pal.length],borderRadius:4,maxBarThickness:34}))},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom"}},scales:{x:{grid:{display:false}},y:{beginAtZero:true,border:{display:false}}}}});if(c2)S.charts.push(c2);});
  return out;}

/* =====================================================================
   NHẬP KPI THÁNG
   ===================================================================== */
function defTarget(thang,ma,ex,p){
  if(ex&&validNum(ex.chuan))return +ex.chuan;
  const pv=S.kpi.get(shiftMonth(thang,-1)+"|"+ma);if(pv&&validNum(pv.chuan))return +pv.chuan;
  return p&&validNum(p.chuan)?+p.chuan:null;}
function openEnt(thang){
  const map=new Map();
  for(const n of S.nv){const ex=S.kpi.get(thang+"|"+n.ma);const p=pbById(n.pb);
    map.set(n.ma,{ma:n.ma,ten:n.ten,pb:p?p.ten:(ex?ex.pb:""),chuan:defTarget(thang,n.ma,ex,p),
      sl:{...(ex?ex.sl:{})},nghi:ex?ex.nghi:null,truc:ex?ex.truc:null,exists:!!ex,baseAt:ex?ex.at||null:null,_chg:new Set()});}
  for(const r of S.kpi.values())if(r.thang===thang&&!map.has(r.ma))map.set(r.ma,{ma:r.ma,ten:r.ten,pb:r.pb,chuan:r.chuan,sl:{...r.sl},nghi:r.nghi,truc:r.truc,exists:true,old:true,baseAt:r.at||null,_chg:new Set()});
  let rows=[...map.values()];const ord=pbOrder();
  sortEnt(rows);
  // bản nháp chỉ chứa những ô người dùng đã sửa, áp lên số mới nhất
  let draft=null;try{draft=JSON.parse(lsGet("kpi:draft3:"+thang)||"null");}catch(e){}
  let nd=0;
  if(draft&&draft.rows)rows.forEach(r=>{const d=draft.rows[r.ma];if(!d||!Array.isArray(d.chg))return;
    for(const k of d.chg){if(k.startsWith("sl:")){const dm=k.slice(3);const v=d.sl?d.sl[dm]:null;if(v==null||v==="")delete r.sl[dm];else r.sl[dm]=v;}
      else if(k==="nghi")r.nghi=d.nghi;else if(k==="truc")r.truc=d.truc;else if(k==="chuan")r.chuan=d.chuan;r._chg.add(k);}nd++;});
  S.ent={thang,rows,dirty:nd>0,draft:nd>0,saving:false,confirmDel:false};}
function sortEnt(rows){const ord=pbOrder(),m=S.entSort||"",c=cmpBy(m,r=>r.ma,r=>r.ten);
  rows.sort((a,b)=>{const ia=ord.indexOf(a.pb),ib=ord.indexOf(b.pb);return (ia<0?999:ia)-(ib<0?999:ib)||c(a,b)||String(a.ma).localeCompare(String(b.ma),"vi",{numeric:true});});}
function entFilled(r){return Object.values(r.sl||{}).some(v=>v!=null&&v!=="")||(r.nghi!=null&&r.nghi!=="")||(r.truc!=null&&r.truc!=="");}
let entTimer=null;
function entTouch(){const E=S.ent;E.dirty=true;clearTimeout(entTimer);
  entTimer=setTimeout(()=>{const d={};E.rows.forEach(r=>{if(r._chg&&r._chg.size){const sl={};for(const k of r._chg)if(k.startsWith("sl:"))sl[k.slice(3)]=r.sl[k.slice(3)]??null;
      d[r.ma]={chg:[...r._chg],sl,nghi:r.nghi,truc:r.truc,chuan:r.chuan};}});
    if(Object.keys(d).length)lsSet("kpi:draft3:"+E.thang,JSON.stringify({at:new Date().toISOString(),rows:d}));else lsDel("kpi:draft3:"+E.thang);},400);entSummary();}
function entSummary(){const E=S.ent,el=document.getElementById("ent-sum");if(!E||!el)return;
  const filled=E.rows.filter(entFilled);const cs=filled.map(r=>calc({...r,thang:E.thang,cong:null}));
  const ok=cs.filter(c=>c.pass===true).length,bad=cs.filter(c=>c.pass===false).length;
  el.replaceChildren(h("div",{class:"small"},h("strong",{},`Đã nhập ${filled.length}/${E.rows.length} người`)),
    h("div",{class:"meter"},h("span",{style:`width:${E.rows.length?filled.length/E.rows.length*100:0}%`})),
    h("div",{class:"legend"},h("span",{class:"chip ok"},ok+" đạt"),h("span",{class:"chip bad"},bad+" không đạt"),E.dirty?h("span",{class:"chip warn"},"Chưa lưu"):h("span",{class:"chip info"},"Đã lưu")));}
function viewNhap(){
  const out=h("div",{class:"stack"});
  out.append(h("div",{class:"row"},h("span",{class:"spacer"}),seg([["tay","Nhập tay"],["tep","Tải tệp Excel"],["dan","Dán từ Sheets"]],S.nhapMode,k=>{S.nhapMode=k;S.imp=null;render();},"Cách nhập")));
  if(!writable())out.append(h("p",{class:"banner"},"Tài khoản này chỉ có quyền xem."));
  if(!S.nv.length){out.append(setupChecklist()||h("div"));return out;}
  if(S.nhapMode==="tay")out.append(viewEnt());else if(S.imp)out.append(viewImpPreview());else out.append(viewImport());
  return out;}
function viewEnt(){
  if(!S.ent||S.ent.thang!==S.month)openEnt(S.month);
  const E=S.ent,ro=!writable(),own=congSet(E.thang)!=null;
  const dv=S.entPb?dvFor(S.entPb):dvUnion([...new Set(E.rows.map(r=>r.pb))]);
  const snapC=(()=>{const c=new Map();for(const r of S.kmonths.get(E.thang)||[])if(validNum(r.cong))c.set(+r.cong,(c.get(+r.cong)||0)+1);let b=null,n=0;for(const [k,v] of c)if(v>n){b=k;n=v;}return b;})();
  const cc=own?congSet(E.thang):snapC!=null?snapC:congDefault();
  const out=h("div",{class:"stack"});
  const cIn=h("input",{type:"number",step:"0.5",min:"0",max:"31",value:String(cc),"aria-label":"Công chuẩn "+monthLabel(E.thang),class:"cong-in"});
  const congBox=h("div",{class:"cong-box"},h("div",{class:"lab small muted"},"Công chuẩn tháng"),
    isAdmin()?h("div",{class:"row cong-edit"},cIn,h("button",{class:"btn",type:"button",onclick:async e=>{const v=cIn.value.trim();
        if(!validNum(v)||+v<=0||+v>31){toast("Nhập công chuẩn từ 1 đến 31.");return;}
        const nc={...S.cong,override:{...(S.cong.override||{}),[E.thang]:+v}};e.target.disabled=true;
        try{await saveCfg2("cong",nc);S.dm=null;toast(`Đã đặt công chuẩn ${monthLabel(E.thang).toLowerCase()}: ${v}.`);render();}catch(err){toast(errMsg(err));e.target.disabled=false;}}},"Lưu"))
      :h("div",{class:"cong-v"},String(cc)),
    h("div",{class:"small muted"},own?"Đã đặt riêng cho tháng này":snapC!=null?"Theo số liệu đã lưu của tháng":`Đang dùng công chuẩn mặc định (${congDefault()})`));
  out.append(h("div",{class:"panel datebar"},monthBar(v=>{if(S.ent&&S.ent.dirty)toast("Bản nháp tháng "+S.ent.thang.slice(5)+" vẫn được giữ trên máy.");S.month=v;S.ent=null;render();}),
    h("div",{class:"dateinfo"},h("div",{class:"dname"},monthLabel(E.thang)),h("span",{class:"chip "+(E.draft?"warn":E.rows.some(r=>r.exists)?"info":"ok")},E.draft?"Đang dùng bản nháp chưa lưu":E.rows.some(r=>r.exists)?"Tháng đã có số liệu, đang sửa":"Tháng mới")),congBox));
  const q=fold(S.entQ||""),pbF=S.entPb||"";
  out.append(h("div",{class:"etools"},h("input",{type:"search",placeholder:"Lọc mã hoặc tên…","aria-label":"Lọc nhân viên",value:S.entQ||"",oninput:e=>{S.entQ=e.target.value;filterEnt();}}),
    deptSelect(pbF,v=>{S.entPb=v;render();}),sortSelect(S.entSort,v=>{S.entSort=v;sortEnt(E.rows);render();}),E.draft&&!ro?h("button",{class:"ghost",type:"button",onclick:()=>{lsDel("kpi:draft3:"+E.thang);S.ent=null;render();}},"Bỏ bản nháp"):null,
    h("span",{class:"spacer"}),h("span",{class:"small faint"},"Nhấn Enter để sang ô kế tiếp. Bản nháp tự giữ trên máy này.")));
  const head=h("tr",{},h("th",{class:"l"},"Mã"),h("th",{class:"l"},"Nhân viên"),h("th",{class:"tgt-h",title:"KPI mục tiêu của từng người (case/ngày)"},"Mục tiêu"),dv.map(d=>h("th",{title:d.ten},d.ten)),h("th",{},"KPI tháng"),h("th",{},"Ngày nghỉ"),h("th",{},"Công TT"),h("th",{},"TB/ngày"),h("th",{class:"c"},"Kết quả"),h("th",{},"So T.trước"),h("th",{},"Giờ trực"));
  const body=h("tbody",{});let lastPb=null;
  const inp=(get,set,lab,r,upd,key)=>h("input",{type:"number",step:"any",min:"0",inputmode:"decimal",class:"cell-in","data-nav":"",disabled:ro,"aria-label":lab+" của "+r.ten,value:get()==null?"":String(get()),
    oninput:e=>{const v=e.target.value.trim();set(v===""?null:Number(v));r._chg.add(key);upd();entTouch();}});
  E.rows.forEach(r=>{
    if(r.pb!==lastPb){lastPb=r.pb;body.append(h("tr",{class:"grp","data-pb":r.pb||""},h("td",{class:"l",colspan:String(10+dv.length)},h("strong",{},r.pb||"(chưa có phòng ban)"))));}
    const own=new Set(dvFor(r.pb).map(d=>d.ma));
    const cTot=h("td",{}),cTT=h("td",{}),cAvg=h("td",{class:"tb"}),cKq=h("td",{class:"c"}),cPct=h("td",{});
    const upd=()=>{const c=calc({...r,thang:E.thang,cong:null});const f=entFilled(r);cTot.textContent=f?fmt(c.total,0):"—";cTT.textContent=fmt(c.tt,1);
      cAvg.textContent=f?fmt(c.avg):"—";cAvg.className="tb "+(f&&c.pass===true?"ok":f&&c.pass===false?"bad":"");cKq.replaceChildren(f?kqChip(c):h("span",{class:"chip none"},"—"));
      const p=S.kpi.get(shiftMonth(E.thang,-1)+"|"+r.ma);const pt=p?calc(p).total:0;cPct.replaceChildren(f&&pt>0?pctEl(c.total/pt*100):h("span",{class:"delta none"},"—"));};
    upd();
    body.append(h("tr",{"data-ma":fold(r.ma),"data-ten":fold(r.ten),"data-pb":r.pb||""},h("td",{class:"l mono"},r.ma),h("td",{class:"l"},h("div",{class:"who-cv"},who(r.ten),cvTag(r.ma),r.old?h("span",{class:"tag"},"không còn trong danh sách"):null),
        (S.entSort||"").startsWith("tn")?h("div",{class:"sen"},"Thâm niên: "+seniority(nctOf(r.ma))):null),
      h("td",{class:"tgt-cell"},isAdmin()&&!ro?inp(()=>r.chuan,v=>{r.chuan=v;},"Mục tiêu",r,upd,"chuan"):h("strong",{},fmt(r.chuan))),
      dv.map(d=>own.has(d.ma)||validNum(r.sl[d.ma])?h("td",{},inp(()=>r.sl[d.ma],v=>{if(v==null)delete r.sl[d.ma];else r.sl[d.ma]=v;},d.ten,r,upd,"sl:"+d.ma)):h("td",{class:"na",title:`Phòng ${r.pb||""} không phụ trách ${d.ten}`},"–")),
      cTot,h("td",{},inp(()=>r.nghi,v=>{r.nghi=v;},"Ngày nghỉ",r,upd,"nghi")),cTT,cAvg,cKq,cPct,h("td",{},inp(()=>r.truc,v=>{r.truc=v;},"Giờ trực",r,upd,"truc"))));});
  const table=h("table",{class:"grid kt-entry"},h("thead",{},head),body);
  table.addEventListener("keydown",e=>{if(e.key!=="Enter"||!e.target.matches("[data-nav]"))return;e.preventDefault();
    const all=[...table.querySelectorAll("tr:not([hidden]) input[data-nav]:not(:disabled)")];const i=all.indexOf(e.target);if(all[i+1]){all[i+1].focus();all[i+1].select();}});
  out.append(h("div",{class:"panel"},h("div",{class:"scroll"},table),
    h("p",{class:"hint",style:"margin-top:10px"},"Chỉ cần nhập số lượng từng dịch vụ, ngày nghỉ và giờ trực. KPI tháng, công thực tế, TB/ngày và kết quả tự tính. Mục tiêu (case/ngày) tự điền theo tháng trước của người đó, chưa có thì theo KPI chuẩn phòng ban; Quản lý sửa được từng người.")));
  if(!ro)out.append(h("div",{class:"savebar"},h("div",{class:"progress",id:"ent-sum"}),
    isAdmin()&&E.rows.some(r=>r.exists)?h("button",{class:"ghost danger",type:"button",onclick:async()=>{if(!E.confirmDel){E.confirmDel=true;render();return;}
      try{S.busy=true;await sbRpc("kpi_delete_kpi",{p_thang:E.thang,p_ma_nv:null});for(const k of [...S.kpi.keys()])if(k.startsWith(E.thang+"|"))S.kpi.delete(k);
        lsDel("kpi:draft3:"+E.thang);rebuild();S.ent=null;toast("Đã xóa số liệu "+monthLabel(E.thang).toLowerCase()+".");render();}catch(e){toast(errMsg(e));}finally{S.busy=false;}}},E.confirmDel?"Bấm lần nữa để xóa cả tháng":"Xóa cả tháng"):null,
    h("button",{class:"btn",type:"button",disabled:E.saving,onclick:saveEnt},E.saving?"Đang lưu…":"Lưu "+monthLabel(E.thang).toLowerCase())));
  S.after.push(()=>{entSummary();filterEnt();});
  return out;}
function filterEnt(){const q=fold(S.entQ||""),pb=S.entPb||"";const t=document.querySelector(".kt-entry");if(!t)return;
  t.querySelectorAll("tbody tr").forEach(tr=>{const isG=tr.classList.contains("grp");const okPb=!pb||tr.dataset.pb===pb;
    tr.hidden=isG?!okPb:!(okPb&&(!q||tr.dataset.ma.includes(q)||tr.dataset.ten.includes(q)));});}
async function saveKpiRows(rows,dels){
  S.busy=true;try{
    if(rows.length)await sbRpc("kpi_save_kpi",{p_rows:rows});
    for(const [th,ma] of dels||[])await sbRpc("kpi_delete_kpi",{p_thang:th,p_ma_nv:ma});
  }finally{S.busy=false;}
  const by=S.me?(S.me.ho_ten||S.me.email):"";const at=new Date().toISOString();
  rows.forEach(r=>S.kpi.set(r.thang+"|"+r.ma,{...r,by,at}));(dels||[]).forEach(([th,ma])=>S.kpi.delete(th+"|"+ma));rebuild();}
async function loadLatest(){if(!USE_SB)return;const j=await sbRpc("kpi_load",{});if(j&&+j.schema>=5){applyKpiLoad(j);S.version=j.version||S.version;rebuild();}}
async function saveEnt(){
  const E=S.ent;const changed=E.rows.filter(r=>r._chg&&r._chg.size);
  if(!changed.length){toast("Chưa có ô nào được sửa nên không có gì để lưu.");return;}
  E.saving=true;render();
  try{
    await loadLatest();                       // lấy số mới nhất, tránh ghi đè số người khác vừa nhập
    const cs=congSet(E.thang),rows=[],dels=[];let merged=0;
    for(const r of changed){const base=S.kpi.get(E.thang+"|"+r.ma);
      if(base&&(base.at||null)!==(r.baseAt||null))merged++;
      const m={thang:E.thang,ma:r.ma,ten:r.ten||(base?base.ten:""),pb:r.pb||(base?base.pb:""),sl:{...(base?base.sl:{})},
        nghi:base?+base.nghi||0:0,truc:base?+base.truc||0:0,
        cong:cs!=null?cs:base&&validNum(base.cong)?+base.cong:congDefault(),chuan:base&&base.chuan!=null?base.chuan:r.chuan};
      for(const k of r._chg){if(k.startsWith("sl:")){const dm=k.slice(3);const v=r.sl[dm];if(v==null||v==="")delete m.sl[dm];else m.sl[dm]=+v;}
        else if(k==="nghi")m.nghi=+r.nghi||0;else if(k==="truc")m.truc=+r.truc||0;else if(k==="chuan")m.chuan=validNum(r.chuan)?+r.chuan:null;}
      const onlyTarget=[...r._chg].every(k=>k==="chuan");
      const empty=!Object.keys(m.sl).length&&!m.nghi&&!m.truc&&!(onlyTarget&&base);
      if(empty){if(base)dels.push([E.thang,r.ma]);}else rows.push(m);}
    await saveKpiRows(rows,dels);clearTimeout(entTimer);lsDel("kpi:draft3:"+E.thang);S.ent=null;
    toast(`Đã lưu ${rows.length+dels.length} nhân viên cho ${monthLabel(E.thang).toLowerCase()}.`+(merged?` Có ${merged} người vừa được người khác cập nhật, web đã giữ số của họ và chỉ thay các ô bạn sửa.`:""));render();}
  catch(e){E.saving=false;toast(errMsg(e));render();}}

/* ----- nhập từ file / dán ----- */
const HDR2={ma:/^(ma( so)?( nv| nhan vien)?|msnv|ma so nhan vien|id)$/,ten:/^(ho( va)? ten|ten|ten nhan vien|nhan vien|ten nv|ho ten nv)$/,
  thang:/^(thang|ky|thang\/nam|thang nam|thoi gian|month)$/,nghi:/^(ngay nghi|so ngay nghi|nghi)$/,truc:/^(gio truc|thoi gian truc|truc|so gio truc)$/,chuan:/^(muc tieu|kpi muc tieu|muc tieu \(case\/ngay\)|chuan|kpi chuan|target)$/};
function findHeader2(grid){for(let r=0;r<Math.min(grid.length,15);r++){const row=grid[r]||[];
  if(row.some(v=>{const f=fold(cellStr(v));return HDR2.ma.test(f)||HDR2.ten.test(f);})&&row.filter(v=>cellStr(v)).length>=2)return {row:r,headers:row.map(v=>cellStr(v))};}return null;}
function guessMap2(H){const used=new Set(),m={};const take=(k,t)=>{const i=H.findIndex((x,c)=>!used.has(c)&&x&&t(fold(x)));if(i>=0){m[k]=H[i];used.add(i);}};
  take("ma",f=>HDR2.ma.test(f));take("ten",f=>HDR2.ten.test(f));take("thang",f=>HDR2.thang.test(f));take("nghi",f=>HDR2.nghi.test(f));take("truc",f=>HDR2.truc.test(f));take("chuan",f=>HDR2.chuan.test(f));
  S.dv.forEach(d=>take("dv:"+d.ma,f=>f===fold(d.ma)||f===fold(d.ten)));S.dv.forEach(d=>{if(!m["dv:"+d.ma])take("dv:"+d.ma,f=>f.length>=3&&(f.includes(fold(d.ten))||fold(d.ten).includes(f)));});return m;}
function impRows(I){const res=[],unknown=new Set();let noMonth=0;
  for(const sh of I.sheets){const H=sh.hdr.headers;const idx=k=>{const t=I.map[k];return t?H.findIndex(x=>fold(x)===fold(t)):-1;};
    const ci={ma:idx("ma"),ten:idx("ten"),thang:idx("thang"),nghi:idx("nghi"),truc:idx("truc"),chuan:idx("chuan")};const dvi=S.dv.map(d=>({ma:d.ma,i:idx("dv:"+d.ma)}));
    if(ci.ma<0&&ci.ten<0)continue;
    for(let r=sh.hdr.row+1;r<sh.grid.length;r++){const row=sh.grid[r]||[];const ma=ci.ma>=0?cellStr(row[ci.ma]):"",ten=ci.ten>=0?cellStr(row[ci.ten]):"";
      if(!ma&&!ten)continue;if(/^(tong|cong|total)/.test(fold(ma||ten)))continue;
      const nv=(ma&&nvByMa(ma))||(ten&&S.nv.find(n=>fold(n.ten)===fold(ten)))||null;if(!nv){unknown.add(ma||ten);continue;}
      const th=(ci.thang>=0?toMonth(row[ci.thang],I.year):null)||I.fallback;if(!th){noMonth++;continue;}
      const ex=S.kpi.get(th+"|"+nv.ma);const p=pbById(nv.pb);
      const sl={...(ex?ex.sl:{})};dvi.forEach(({ma:dm,i})=>{if(i<0)return;const v=num(row[i]);if(v==null)delete sl[dm];else sl[dm]=v;});
      res.push({thang:th,ma:nv.ma,ten:nv.ten,pb:p?p.ten:(ex?ex.pb:""),sl,nghi:ci.nghi>=0?(num(row[ci.nghi])||0):(ex?+ex.nghi||0:0),truc:ci.truc>=0?(num(row[ci.truc])||0):(ex?+ex.truc||0:0),
        cong:congChuan(th),chuan:(ci.chuan>=0&&num(row[ci.chuan])!=null)?num(row[ci.chuan]):defTarget(th,nv.ma,ex,p),exists:!!ex});}}
  const uniq=new Map();res.forEach(r=>uniq.set(r.thang+"|"+r.ma,r));return {rows:[...uniq.values()],unknown:[...unknown],noMonth,dup:res.length-uniq.size};}
function startImp(sheets,source){if(!sheets.length){toast("Không thấy dòng tiêu đề có cột Mã NV hoặc Tên nhân viên.");return;}
  const H=[];sheets.forEach(s=>s.hdr.headers.forEach(x=>{if(x&&!H.includes(x))H.push(x);}));
  const map=guessMap2(sheets[0].hdr.headers);let saved={};try{saved=JSON.parse(lsGet("kpi:map2")||"{}")||{};}catch(e){}
  for(const [k,t] of Object.entries(saved))if(t&&H.includes(t))map[k]=t;
  S.imp={sheets,source,headers:H,map,year:+S.month.slice(0,4),fallback:S.month,saving:false};render();}
function viewImport(){
  const file=h("input",{type:"file",accept:".xlsx,.xls,.ods,.csv","aria-label":"Chọn tệp"});
  const ta=h("textarea",{placeholder:"Dán vùng dữ liệu đã sao chép từ Google Sheets hoặc Excel, gồm cả dòng tiêu đề…","aria-label":"Dữ liệu dán"});
  const isFile=S.nhapMode==="tep";
  return h("div",{class:"panel stack-s"},h("div",{class:"panel-head"},h("h3",{},isFile?"Tải tệp Excel hoặc Google Sheets":"Dán từ Google Sheets hoặc Excel"),
      h("button",{class:"ghost",type:"button",onclick:downloadTemplate2},"⬇ Tải file mẫu")),
    h("p",{class:"hint"},"File cần có dòng tiêu đề. Mỗi dòng là 1 nhân viên trong 1 tháng. Cột bắt buộc: Mã NV (hoặc Tên nhân viên). Nên có: Tháng (ví dụ 11/2026), mỗi dịch vụ một cột, Ngày nghỉ, Giờ trực. Thứ tự cột tùy ý."),
    isFile?h("div",{class:"row"},file,h("button",{class:"btn",type:"button",onclick:async()=>{const f=file.files&&file.files[0];if(!f){toast("Chọn tệp trước đã.");return;}
      if(!window.XLSX){toast("Không tải được thư viện đọc Excel.");return;}
      try{const buf=await f.arrayBuffer();const wb=/\.csv$/i.test(f.name)?XLSX.read(new TextDecoder("utf-8").decode(buf),{type:"string",raw:true}):XLSX.read(buf,{type:"array"});
        const sheets=[];for(const n of wb.SheetNames){const grid=XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:true,defval:null,blankrows:true});const hdr=findHeader2(grid);if(hdr)sheets.push({name:n,grid,hdr});}
        startImp(sheets,f.name);}catch(e){toast("Không đọc được tệp: "+(e.message||"định dạng lạ"));}}},"Đọc tệp"))
    :h("div",{class:"stack-s"},ta,h("button",{class:"btn",type:"button",onclick:()=>{const t=ta.value;if(!t.trim()){toast("Dán dữ liệu vào ô trước đã.");return;}
      const grid=t.replace(/\r/g,"").split("\n").map(l=>l.split("\t"));const hdr=findHeader2(grid);startImp(hdr?[{name:"",grid,hdr}]:[],"đoạn dán");}},"Đọc đoạn dán")),
    h("p",{class:"hint"},"Chỉ những cột được ghép mới ghi đè số liệu. Cột không ghép thì giữ nguyên số cũ trên web. Nhân viên không có trong Danh mục sẽ được bỏ qua và liệt kê ra."));}
function viewImpPreview(){
  const I=S.imp;const out=h("div",{class:"stack-s"});
  const fields=[["ma","Mã NV","Khớp với Danh mục nhân viên"],["ten","Tên nhân viên","Dùng khi không có Mã NV"],["thang","Tháng","Ví dụ 11/2026"],
    ...S.dv.map(d=>["dv:"+d.ma,d.ten,"Số lượng dịch vụ "+d.ma]),["nghi","Ngày nghỉ","Số ngày nghỉ trong tháng"],["truc","Giờ trực","Đơn vị: tiếng"],["chuan","Mục tiêu","case/ngày; bỏ trống thì giữ như cũ"]];
  const grid=h("div",{class:"panel mapgrid"});
  fields.forEach(([k,l,hint])=>{const sel=h("select",{"aria-label":"Cột cho "+l,onchange:e=>{I.map[k]=e.target.value||undefined;render();}},h("option",{value:""},"(bỏ qua)"),I.headers.map(x=>h("option",{value:x},x)));
    sel.value=I.map[k]||"";grid.append(h("div",{class:"maprow"+(I.map[k]?" on":"")},h("div",{class:"map-l"},h("strong",{},l),h("span",{class:"small faint"},hint)),h("span",{class:"map-arrow"},"←"),sel));});
  out.append(h("p",{},h("strong",{},`Ghép cột cho ${I.source}. `),h("span",{class:"muted"},"Trang đã đoán sẵn, chỉnh lại nếu chưa đúng.")),grid);
  const ysel=h("select",{"aria-label":"Năm",onchange:e=>{I.year=+e.target.value;render();}},Array.from({length:6},(_,i)=>thisYear-4+i).reverse().map(y=>h("option",{value:String(y)},String(y))));ysel.value=String(I.year);
  const msel=h("select",{"aria-label":"Tháng mặc định",onchange:e=>{I.fallback=e.target.value;render();}},monthOptions([I.fallback]));msel.value=I.fallback;
  out.append(h("div",{class:"row"},h("label",{class:"field"},"Tháng cho dòng không ghi tháng",msel),h("label",{class:"field"},"Năm, nếu cột Tháng chỉ ghi số tháng",ysel)));
  if(!I.map.ma&&!I.map.ten){out.append(h("p",{class:"banner"},"Chọn cột Mã NV hoặc Tên nhân viên để tiếp tục."));return out;}
  const R=impRows(I);const months=[...new Set(R.rows.map(r=>r.thang))].sort();
  out.append(h("p",{},h("strong",{},`Đọc được ${R.rows.length} dòng`),months.length?` thuộc ${months.map(monthLabel).join(", ").toLowerCase()}.`:".",
    R.rows.filter(r=>r.exists).length?h("span",{class:"chip warn",style:"margin-left:8px"},`${R.rows.filter(r=>r.exists).length} dòng sẽ cập nhật số đã có`):null));
  if(R.unknown.length)out.append(h("p",{class:"banner"},`Không tìm thấy trong Danh mục (bỏ qua): ${R.unknown.slice(0,12).join(", ")}${R.unknown.length>12?"…":""}. Thêm họ vào Danh mục nhân viên rồi đọc lại.`));
  if(R.noMonth)out.append(h("p",{class:"banner"},`${R.noMonth} dòng không xác định được tháng.`));
  const cols=S.dv;
  out.append(h("div",{class:"panel"},h("div",{class:"panel-head"},h("h3",{},"Xem thử"),h("span",{class:"small muted"},"10 dòng đầu")),h("div",{class:"scroll"},h("table",{class:"grid"},
    h("thead",{},h("tr",{},h("th",{class:"l"},"Tháng"),h("th",{class:"l"},"Mã"),h("th",{class:"l"},"Nhân viên"),cols.map(d=>h("th",{},d.ten)),h("th",{},"KPI tháng"),h("th",{},"Nghỉ"),h("th",{},"TB/ngày"),h("th",{class:"c"},"Kết quả"),h("th",{},"Giờ trực"))),
    h("tbody",{},R.rows.slice(0,10).map(r=>{const c=calc(r);return h("tr",{},h("td",{class:"l"},monthShort(r.thang)),h("td",{class:"l mono"},r.ma),h("td",{class:"l"},r.ten),cols.map(d=>h("td",{},fmt(num(r.sl[d.ma]),0))),
      h("td",{},fmt(c.total,0)),h("td",{},fmt(c.nghi,1)),h("td",{},fmt(c.avg)),h("td",{class:"c"},kqChip(c)),h("td",{},fmt(c.truc,1)));}))))));
  out.append(h("div",{class:"savebar"},h("span",{class:"spacer"}),h("button",{class:"ghost",type:"button",onclick:()=>{S.imp=null;render();}},"Hủy"),
    h("button",{class:"btn",type:"button",disabled:!R.rows.length||I.saving||!writable(),onclick:async()=>{I.saving=true;render();lsSet("kpi:map2",JSON.stringify(I.map));
      try{await loadLatest();const R2=impRows(I);await saveKpiRows(R2.rows.map(({exists,...r})=>r),[]);S.imp=null;S.month=months[months.length-1]||S.month;S.ent=null;toast(`Đã lưu ${R.rows.length} dòng.`);go("tonghop");}
      catch(e){I.saving=false;toast(errMsg(e));render();}}},I.saving?"Đang lưu…":`Lưu ${R.rows.length} dòng`)));
  return out;}
function downloadTemplate2(){if(!window.XLSX){toast("Không tải được thư viện Excel.");return;}
  const head=["Tháng","Mã NV","Tên nhân viên","Phòng ban",...S.dv.map(d=>d.ten),"Ngày nghỉ","Giờ trực","Mục tiêu"];
  const m=S.month.split("-");const label=`${m[1]}/${m[0]}`;
  const rows=(S.nv.length?S.nv:[{ma:"NV001",ten:"Nguyễn Văn A",pb:null}]).map(n=>[label,n.ma,n.ten,pbName(n.pb),...S.dv.map(()=>null),null,null,defTarget(S.month,n.ma,S.kpi.get(S.month+"|"+n.ma),pbById(n.pb))]);
  const ws=XLSX.utils.aoa_to_sheet([head,...rows]);ws["!cols"]=[{wch:9},{wch:10},{wch:26},{wch:18},...S.dv.map(()=>({wch:13})),{wch:10},{wch:9}];
  const g=XLSX.utils.aoa_to_sheet([["Cách điền"],["1. Mỗi dòng là 1 nhân viên trong 1 tháng. Cột Tháng ghi dạng 11/2026."],["2. Mã NV phải trùng với Danh mục nhân viên trên web."],
    ["3. Các cột dịch vụ ghi số lượng case đạt được trong tháng. Bỏ trống nếu không có."],["4. Ngày nghỉ: số ngày nghỉ trong tháng. Giờ trực: tổng số tiếng trực."],
    ["5. Không cần ghi KPI tháng, công thực tế, TB/ngày: web tự tính."],["6. Đừng sửa chữ ở dòng tiêu đề."]]);g["!cols"]=[{wch:90}];
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"KPI thang");XLSX.utils.book_append_sheet(wb,g,"Huong dan");
  saveFile(`Mau_KPI_thang_${S.month}.xlsx`,XLSX.write(wb,{bookType:"xlsx",type:"array"}),"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");}

/* =====================================================================
   DANH MỤC: nhân viên, dịch vụ, phòng ban, công chuẩn
   ===================================================================== */
const ch=(o,f)=>{(o._chg||(o._chg=new Set())).add(f);};
const NV_F=["ma","ten","pb","cv","kv","ns","ntv","nct"],DV_F=["ma","ten"],PB_F=["id","ten","chuan","dvs"];
const clean=o=>Object.fromEntries(Object.entries(o).filter(([k])=>!k.startsWith("_")));
// Ghép thay đổi của mình vào danh sách MỚI NHẤT trên máy chủ: chỉ thay đúng ô đã sửa
function mergeList(latest,draft,dels,keyF,fields){let lost=0;
  const out=latest.map(x=>({...x}));const idx=k=>out.findIndex(x=>keyF(x)===k);
  for(const k of dels){const i=idx(k);if(i>=0)out.splice(i,1);}
  for(const d of draft){if(!d._chg||!d._chg.size)continue;
    const k0=d._k0!=null?d._k0:keyF(d);const i=idx(k0);
    if(i<0){if(d._k0!=null){lost++;continue;}              // người khác vừa xóa mục này
      const o={};fields.forEach(f=>{if(d[f]!==undefined)o[f]=d[f];});out.push(o);continue;}
    d._chg.forEach(f=>{out[i][f]=d[f];});}
  return {list:out,lost};}
function dmDirty(){return !!(S.dm&&Object.values(S.dm.dirty).some(Boolean));}
function dmInit(){if(S.dm)return;S.dm={nv:S.nv.map(n=>({...n,_id:uid2(),_k0:fold(n.ma),_chg:new Set()})),dv:S.dv.map(d=>({...d,_id:uid2(),_saved:true,_k0:d.ma,_chg:new Set()})),
  pb:S.pb.map(p=>({...p,dvs:Array.isArray(p.dvs)?[...p.dvs]:null,_k0:p.id,_chg:new Set()})),del:{nv:new Set(),dv:new Set(),pb:new Set()},dvOrder:false,
  cong:{macdinh:S.cong.macdinh??null,override:{...(S.cong.override||{})}},dirty:{}};}
function viewDanhMuc(){
  dmInit();const D=S.dm,ro=!isAdmin(),tab=S.dmTab||"nv";
  const out=h("div",{class:"stack"});
  out.append(h("div",{class:"row"},seg([["nv",`Nhân viên (${D.nv.length})`],["dv",`Dịch vụ (${D.dv.length})`],["pb",`Phòng ban (${D.pb.length})`],["cong","Công chuẩn"]],tab,v=>{S.dmTab=v;render();},"Danh mục"),
    tab==="nv"?(()=>{const s=h("select",{"aria-label":"Lọc theo phòng ban",class:"cv-filter",onchange:e=>{S.dmPb=e.target.value;render();}},
      h("option",{value:""},"Tất cả phòng ban"),D.pb.map(p=>h("option",{value:p.id},`${p.ten} (${D.nv.filter(n=>n.pb===p.id).length})`)),
      h("option",{value:"_none"},`Chưa chọn phòng ban (${D.nv.filter(n=>!n.pb).length})`));s.value=S.dmPb||"";return s;})():null,
    tab==="nv"?(()=>{const s=h("select",{"aria-label":"Lọc theo chức vụ",class:"cv-filter",onchange:e=>{S.dmCv=e.target.value;render();}},
      h("option",{value:""},"Tất cả chức vụ"),CHUC_VU.map(c=>h("option",{value:c},`${c} (${D.nv.filter(n=>n.cv===c).length})`)),
      h("option",{value:"_none"},`Chưa chọn chức vụ (${D.nv.filter(n=>!n.cv).length})`));s.value=S.dmCv||"";return s;})():null,
    tab==="nv"?(()=>{const s=h("select",{"aria-label":"Lọc theo khu vực",class:"cv-filter",onchange:e=>{S.dmKv=e.target.value;render();}},
      h("option",{value:""},"Tất cả khu vực"),KHU_VUC.map(c=>h("option",{value:c},`${c} (${D.nv.filter(n=>n.kv===c).length})`)),
      h("option",{value:"_none"},`Chưa chọn khu vực (${D.nv.filter(n=>!n.kv).length})`));s.value=S.dmKv||"";return s;})():null,
    h("span",{class:"spacer"}),ro?h("span",{class:"small muted"},"Chỉ Quản lý sửa được danh mục."):null));
  const mark=k=>{D.dirty[k]=true;const b=document.getElementById("dm-save");if(b)b.disabled=false;
    const s=document.getElementById("dm-state");if(s){s.textContent="⚠ Có thay đổi chưa lưu, nhớ bấm Lưu";s.className="small unsaved";}};
  const saveBtn=(k,fn)=>ro?null:h("div",{class:"savebar"},h("span",{id:"dm-state",class:"small "+(D.dirty[k]?"unsaved":"muted"),style:"flex:1"},D.dirty[k]?"⚠ Có thay đổi chưa lưu, nhớ bấm Lưu":"Chưa có thay đổi"),
    h("button",{class:"ghost",type:"button",onclick:()=>{S.dm=null;render();}},"Hoàn tác"),h("button",{class:"btn",type:"button",id:"dm-save",disabled:!D.dirty[k],onclick:fn},"Lưu"));
  if(tab==="nv"){
    const q=fold(S.dmQ||""),cvF=S.dmCv||"",kvF=S.dmKv||"",pbF2=S.dmPb||"";const pbOpts=()=>[h("option",{value:""},"(chọn phòng ban)"),...D.pb.map(p=>h("option",{value:p.id},p.ten))];
    const cvOpts=()=>[h("option",{value:""},"(chọn)"),...CHUC_VU.map(c=>h("option",{value:c},c))];
    const kvOpts=()=>[h("option",{value:""},"(chọn)"),...KHU_VUC.map(c=>h("option",{value:c},c))];
    const rows=D.nv.filter(n=>(!q||fold(n.ma).includes(q)||fold(n.ten).includes(q))&&(!cvF||(cvF==="_none"?!n.cv:n.cv===cvF))&&(!kvF||(kvF==="_none"?!n.kv:n.kv===kvF))&&(!pbF2||(pbF2==="_none"?!n.pb:n.pb===pbF2)));
    if(S.dmSort)rows.sort(cmpBy(S.dmSort,n=>n.ma,n=>n.ten));
    const tb=h("tbody",{},rows.map(n=>{
      const sel=h("select",{disabled:ro,"aria-label":"Phòng ban của "+n.ten,onchange:e=>{n.pb=e.target.value||null;ch(n,"pb");mark("nv");}},pbOpts());sel.value=n.pb||"";
      const cv=h("select",{disabled:ro,"aria-label":"Chức vụ của "+n.ten,onchange:e=>{n.cv=e.target.value||null;ch(n,"cv");mark("nv");}},cvOpts());cv.value=n.cv||"";
      const kvSel=h("select",{disabled:ro,"aria-label":"Khu vực của "+n.ten,onchange:e=>{n.kv=e.target.value||null;ch(n,"kv");mark("nv");}},kvOpts());kvSel.value=n.kv||"";
      const sen=h("div",{class:"sen",title:"Thâm niên = Ngày hiện tại − Ngày chính thức"},seniority(n.nct));
      const setD=(k,lab)=>v=>{n._bad=n._bad||{};if(v===undefined){n._bad[k]=true;return;}delete n._bad[k];n[k]=v;ch(n,k);mark("nv");sen.textContent=seniority(n.nct);};
      return h("tr",{},h("td",{},h("input",{type:"text",value:n.ma,disabled:ro,class:"mono",style:"width:100px","aria-label":"Mã NV",oninput:e=>{n.ma=e.target.value.trim();ch(n,"ma");mark("nv");}})),
        h("td",{},h("input",{type:"text",value:n.ten,disabled:ro,style:"min-width:190px;width:100%","aria-label":"Họ tên",oninput:e=>{n.ten=e.target.value;ch(n,"ten");mark("nv");}})),
        h("td",{},sel),h("td",{},cv),h("td",{},kvSel),
        h("td",{},dateBox(n.ns,setD("ns"),"Ngày sinh",ro)),
        h("td",{},dateBox(n.ntv,setD("ntv"),"Ngày thử việc",ro)),
        h("td",{},dateBox(n.nct,setD("nct"),"Ngày chính thức",ro),sen),
        h("td",{},ro?null:h("button",{class:"rm",type:"button","aria-label":"Xóa "+n.ten,onclick:()=>{if(n._k0!=null)D.del.nv.add(n._k0);D.nv.splice(D.nv.indexOf(n),1);mark("nv");render();}},"×")));}));
    const cnt=c=>D.nv.filter(n=>c==="_none"?!n.cv:n.cv===c).length;
    const paste=h("textarea",{placeholder:"Mã NV ⇥ Họ tên ⇥ Phòng ban ⇥ Chức vụ ⇥ Ngày sinh ⇥ Ngày thử việc ⇥ Ngày chính thức ⇥ Khu vực (mỗi người một dòng, copy thẳng từ Excel)","aria-label":"Dán danh sách nhân viên",style:"min-height:110px"});
    out.append(h("div",{class:"panel"},h("div",{class:"panel-head"},h("h3",{},"Danh sách nhân viên",h("span",{class:"small muted",style:"font-weight:400"},`  ${rows.length}/${D.nv.length} người`)),
        h("div",{class:"row"},sortSelect(S.dmSort,v=>{S.dmSort=v;render();}),h("input",{type:"search",placeholder:"Tìm mã hoặc tên…",value:S.dmQ||"","aria-label":"Tìm nhân viên",oninput:e=>{S.dmQ=e.target.value;clearTimeout(S._dq);S._dq=setTimeout(render,300);}}),
          ro?null:h("button",{class:"ghost",type:"button",onclick:()=>{D.nv.push({ma:"",ten:"",pb:D.pb[0]?D.pb[0].id:null,cv:null,kv:null,ns:null,ntv:null,nct:null,_id:uid2(),_k0:null,_chg:new Set(NV_F)});S.dmQ="";S.dmCv="";S.dmKv="";S.dmPb="";S.dmSort="";mark("nv");render();
            setTimeout(()=>{const i=document.querySelectorAll(".dm-nv tbody tr:last-child input");i[0]&&i[0].focus();},0);}},"＋ Thêm nhân viên"))),
      h("div",{class:"scroll"},h("table",{class:"grid dm-nv dm-tbl"},h("thead",{},h("tr",{},h("th",{class:"l"},"Mã NV"),h("th",{class:"l"},"Họ tên"),h("th",{class:"l"},"Phòng ban"),h("th",{class:"l"},"Chức vụ"),h("th",{class:"l"},"Khu vực"),
        h("th",{class:"l"},"Ngày sinh"),h("th",{class:"l"},"Ngày thử việc"),h("th",{class:"l",title:"Dòng nhỏ bên dưới là thâm niên = Ngày hiện tại − Ngày chính thức"},"Ngày chính thức / Thâm niên"),h("th",{}))),
        h("tbody",{},rows.length?[...tb.childNodes]:[h("tr",{},h("td",{class:"l",colspan:"9"},h("span",{class:"muted"},"Không có nhân viên nào khớp bộ lọc.")))]))),
      h("p",{class:"hint",style:"margin-top:10px"},"Ngày nhập dạng dd/mm/yyyy, gõ liền 8 số (ví dụ 15031995) web tự thêm dấu /, hoặc bấm biểu tượng lịch để chọn. Thâm niên = Ngày hiện tại − Ngày chính thức."),
      ro?null:h("details",{class:"fmt-guide"},h("summary",{},"Dán nhanh danh sách từ Excel"),h("div",{class:"stack-s",style:"margin-top:10px"},paste,
        h("p",{class:"hint"},"Thứ tự cột: Mã NV, Họ tên, Phòng ban, Chức vụ, Ngày sinh, Ngày thử việc, Ngày chính thức, Khu vực (Hà Nội, Nam Định, Đà Nẵng, Sài Gòn). Ngày ghi dd/mm/yyyy. Có dòng tiêu đề cũng được. Trùng Mã NV thì cập nhật, phòng ban chưa có thì tự thêm."),
        h("button",{class:"btn",type:"button",onclick:()=>{let n=0,u=0,bad=0;for(const line of paste.value.replace(/\r/g,"").split("\n")){const c=line.split("\t").map(x=>x.trim());
            if(!c[0]||!c[1]||/^ma/.test(fold(c[0]))&&/ten/.test(fold(c[1])))continue;
            let pb=null;if(c[2]){let p=D.pb.find(x=>fold(x.ten)===fold(c[2]));if(!p){p={id:uid2(),ten:c[2],chuan:null,_k0:null,_chg:new Set(PB_F)};D.pb.push(p);D.dirty.pb=true;}pb=p.id;}
            const cvv=CHUC_VU.find(x=>fold(x)===fold(c[3]||""))||null;
            const dd=s=>{if(!s)return null;const r=parseDMY(s);if(r.ok)return r.v;const a=parseAnyDate(num(s)??s);if(!a)bad++;return a;};
            const rec={ma:c[0],ten:c[1],pb,cv:cvv,ns:dd(c[4]),ntv:dd(c[5]),nct:dd(c[6])};if(c[7])rec.kv=kvMatch(c[7]);
            const ex=D.nv.find(x=>fold(x.ma)===fold(c[0]));if(ex){Object.assign(ex,rec);Object.keys(rec).forEach(k=>ch(ex,k));u++;}else{D.nv.push({...rec,_id:uid2(),_k0:null,_chg:new Set(NV_F)});n++;}}
          if(!n&&!u){toast("Không đọc được dòng nào.");return;}mark("nv");
          toast(`Thêm ${n}, cập nhật ${u} nhân viên.`+(bad?` ${bad} ô ngày không đọc được.`:"")+" Bấm Lưu để ghi lại."+(D.dirty.pb?" Có phòng ban mới, nhớ lưu cả tab Phòng ban.":""));render();}},"Thêm vào danh sách")))));
    out.append(saveBtn("nv",async()=>{
      if(D.nv.some(n=>n._bad&&Object.keys(n._bad).length)){toast("Còn ô ngày nhập sai (viền đỏ). Sửa lại dạng dd/mm/yyyy rồi lưu.");return;}
      if(D.nv.some(n=>n._chg&&n._chg.size&&(!(n.ma||"").trim()||!(n.ten||"").trim()))){toast("Mỗi nhân viên cần có Mã NV và Họ tên.");return;}
      try{await loadLatest();                                         // lấy danh sách mới nhất trước khi ghép
        let lost=0;
        if(D.dirty.pb){const r=mergeList(S.pb,D.pb,D.del.pb,x=>x.id,PB_F);lost+=r.lost;await saveCfg2("phongban",r.list.map(clean));}
        const r=mergeList(S.nv,D.nv,D.del.nv,x=>fold(x.ma),NV_F);lost+=r.lost;
        const list=r.list.map(n=>({...clean(n),ma:(n.ma||"").trim(),ten:(n.ten||"").trim()}));
        const s=new Set();for(const n of list){const k=fold(n.ma);if(s.has(k)){toast("Mã NV “"+n.ma+"” bị trùng.");return;}s.add(k);}
        await saveCfg2("nhanvien",list);S.dm=null;toast("Đã lưu danh sách nhân viên."+(lost?` ${lost} người vừa bị người khác xóa nên không lưu thay đổi.`:""));render();}
      catch(e){toast(errMsg(e));}}));
    S.dmCvCount=cnt;}
  else if(tab==="dv"){
    const tb=h("tbody",{},D.dv.map((d,i)=>h("tr",{},
      h("td",{},h("input",{type:"text",value:d.ma,disabled:ro||d._saved,class:"mono",style:"width:120px","aria-label":"Mã DV",title:d._saved?"Mã dịch vụ đã lưu không đổi được, vì số liệu cũ gắn theo mã":"",oninput:e=>{d.ma=e.target.value.trim();ch(d,"ma");mark("dv");}})),
      h("td",{},h("input",{type:"text",value:d.ten,disabled:ro,style:"min-width:220px;width:100%","aria-label":"Tên dịch vụ",oninput:e=>{d.ten=e.target.value;ch(d,"ten");mark("dv");}})),
      h("td",{},ro?null:h("div",{class:"col-act"},h("button",{class:"ghost icon",type:"button","aria-label":"Đưa lên",disabled:i===0,onclick:()=>{[D.dv[i-1],D.dv[i]]=[D.dv[i],D.dv[i-1]];D.dvOrder=true;mark("dv");render();}},"↑"),
        h("button",{class:"ghost icon",type:"button","aria-label":"Đưa xuống",disabled:i===D.dv.length-1,onclick:()=>{[D.dv[i+1],D.dv[i]]=[D.dv[i],D.dv[i+1]];D.dvOrder=true;mark("dv");render();}},"↓"),
        h("button",{class:"rm",type:"button","aria-label":"Xóa "+d.ten,onclick:()=>{if(d._k0!=null)D.del.dv.add(d._k0);D.dv.splice(i,1);mark("dv");render();}},"×"))))));
    out.append(h("div",{class:"panel"},h("div",{class:"panel-head"},h("h3",{},"Danh sách dịch vụ"),ro?null:h("button",{class:"ghost",type:"button",onclick:()=>{D.dv.push({ma:"",ten:"",_id:uid2(),_k0:null,_chg:new Set(DV_F)});mark("dv");render();}},"＋ Thêm dịch vụ")),
      h("div",{class:"scroll"},h("table",{class:"grid dm-tbl dm-dv"},h("thead",{},h("tr",{},h("th",{class:"l"},"Mã DV"),h("th",{class:"l"},"Tên dịch vụ"),h("th",{}))),tb)),
      h("p",{class:"hint",style:"margin-top:10px"},"Thứ tự ở đây là thứ tự cột trên màn nhập và báo cáo. Xóa dịch vụ chỉ ẩn khỏi màn nhập và báo cáo, số liệu cũ vẫn được giữ. Mã dịch vụ đã lưu thì không đổi được.")));
    out.append(saveBtn("dv",async()=>{
      if(D.dv.some(d=>d._chg&&d._chg.size&&(!(d.ma||"").trim()||!(d.ten||"").trim()))){toast("Mỗi dịch vụ cần có Mã DV và Tên.");return;}
      try{await loadLatest();const r=mergeList(S.dv,D.dv,D.del.dv,x=>x.ma,DV_F);let list=r.list.map(d=>({ma:(d.ma||"").trim(),ten:(d.ten||"").trim()}));
        if(D.dvOrder){const rank=new Map(D.dv.map((d,i)=>[(d.ma||"").trim(),i]));list.sort((x,y)=>(rank.has(x.ma)?rank.get(x.ma):999)-(rank.has(y.ma)?rank.get(y.ma):999));}
        const s=new Set();for(const d of list){const k=fold(d.ma);if(s.has(k)){toast("Mã DV “"+d.ma+"” bị trùng.");return;}s.add(k);}
        await saveCfg2("dichvu",list);S.dm=null;S.ent=null;toast("Đã lưu danh sách dịch vụ.");render();}catch(e){toast(errMsg(e));}}));}
  else if(tab==="pb"){
    const cnt=id=>D.nv.filter(n=>n.pb===id).length;
    const tb=h("tbody",{},D.pb.map((p,i)=>h("tr",{},h("td",{},h("input",{type:"text",value:p.ten,disabled:ro,style:"min-width:220px;width:100%","aria-label":"Tên phòng ban",oninput:e=>{p.ten=e.target.value;ch(p,"ten");mark("pb");}})),
      h("td",{},h("input",{type:"number",step:"any",min:"0",value:p.chuan==null?"":String(p.chuan),disabled:ro,style:"width:120px","aria-label":"KPI chuẩn",oninput:e=>{const v=e.target.value.trim();p.chuan=v===""?null:Number(v);ch(p,"chuan");mark("pb");}})),
      h("td",{},h("div",{class:"dv-chips"},S.dv.map(d=>{const all=!Array.isArray(p.dvs)||!p.dvs.length;const on=all||p.dvs.includes(d.ma);
        return h("button",{type:"button",class:"dv-chip"+(on?" on":"")+(all?" all":""),disabled:ro,"aria-pressed":String(on),title:on?"Đang hiển thị, bấm để bỏ":"Bấm để hiển thị",
          onclick:()=>{let cur=all?S.dv.map(x=>x.ma):[...p.dvs];cur=on?cur.filter(x=>x!==d.ma):[...cur,d.ma];
            p.dvs=cur.length===S.dv.length||!cur.length?null:S.dv.map(x=>x.ma).filter(x=>cur.includes(x));ch(p,"dvs");mark("pb");render();}},d.ten);}),
        !Array.isArray(p.dvs)||!p.dvs.length?h("span",{class:"small faint"},"(tất cả)"):null)),
      h("td",{class:"small muted"},cnt(p.id)+" người"),
      h("td",{},ro?null:h("button",{class:"rm",type:"button","aria-label":"Xóa "+p.ten,onclick:()=>{if(cnt(p.id)&&!confirm(`Phòng ${p.ten} đang có ${cnt(p.id)} nhân viên. Vẫn xóa?`))return;if(p._k0!=null)D.del.pb.add(p._k0);D.pb.splice(i,1);D.nv.forEach(n=>{if(n.pb===p.id){n.pb=null;ch(n,"pb");}});D.dirty.nv=true;mark("pb");render();}},"×")))));
    out.append(h("div",{class:"panel"},h("div",{class:"panel-head"},h("h3",{},"Phòng ban và KPI chuẩn"),ro?null:h("button",{class:"ghost",type:"button",onclick:()=>{D.pb.push({id:uid2(),ten:"",chuan:null,_k0:null,_chg:new Set(PB_F)});mark("pb");render();}},"＋ Thêm phòng ban")),
      h("div",{class:"scroll"},h("table",{class:"grid dm-tbl dm-pb"},h("thead",{},h("tr",{},h("th",{class:"l"},"Tên phòng ban"),h("th",{class:"l"},"KPI chuẩn (case/ngày)"),h("th",{class:"l",title:"Dịch vụ hiện trên màn Nhập KPI tháng cho phòng này"},"Dịch vụ hiển thị"),h("th",{class:"l"},"Nhân viên"),h("th",{}))),tb)),
      h("p",{class:"hint",style:"margin-top:10px"},"KPI chuẩn áp dụng khi nhập tháng mới. Các tháng đã lưu giữ nguyên KPI chuẩn lúc lưu, để báo cáo cũ không bị đổi.")));
    if(!ro&&S.kmKeys.length){
      const months=[...S.kmKeys].reverse();
      const fromSel=h("select",{"aria-label":"Áp dụng từ tháng"},months.map(m=>h("option",{value:m},monthLabel(m))));
      const preview=h("p",{class:"small muted",style:"margin-top:8px"});
      const plan=from=>{const cur=new Map(S.pb.map(p=>[fold(p.ten),p.chuan]));
        return [...S.kpi.values()].filter(r=>r.thang>=from&&cur.has(fold(r.pb||""))&&validNum(cur.get(fold(r.pb||"")))&&!(validNum(r.chuan)&&+r.chuan===+cur.get(fold(r.pb||""))))
          .map(r=>({thang:r.thang,ma:r.ma,ten:r.ten,pb:r.pb,sl:{...(r.sl||{})},nghi:+r.nghi||0,truc:+r.truc||0,cong:validNum(r.cong)?+r.cong:congChuan(r.thang),chuan:+cur.get(fold(r.pb||""))}));};
      const showPlan=()=>{const n=plan(fromSel.value).length;preview.textContent=n?`Sẽ đổi KPI chuẩn cho ${n} dòng số liệu từ ${monthLabel(fromSel.value).toLowerCase()} trở đi.`:"Các tháng này đã dùng đúng KPI chuẩn hiện tại, không cần đổi.";};
      fromSel.addEventListener("change",showPlan);S.after.push(showPlan);
      out.append(h("div",{class:"panel"},h("div",{class:"panel-head"},h("h3",{},"Áp dụng KPI chuẩn mới cho số liệu đã lưu")),
        h("p",{class:"hint"},"Số liệu đã lưu giữ mục tiêu tại lúc nhập. Muốn các tháng đã nhập tính theo KPI chuẩn phòng ban đang đặt ở bảng trên, chọn tháng bắt đầu rồi bấm Áp dụng. Lưu ý: thao tác này GHI ĐÈ cả mục tiêu riêng đã sửa cho từng người trong các tháng được chọn. Không đổi số lượng. Mọi thay đổi đều được ghi vào nhật ký."),
        h("div",{class:"row",style:"margin-top:10px"},h("label",{class:"field"},"Áp dụng từ tháng",fromSel),
          h("button",{class:"btn",type:"button",style:"align-self:flex-end",onclick:async e=>{
            if(dmDirty()){toast("Bảng phòng ban còn thay đổi chưa lưu. Bấm Lưu trước rồi mới Áp dụng.");return;}
            const btn=e.currentTarget;btn.disabled=true;
            try{await loadLatest();const rows=plan(fromSel.value);
              if(!rows.length){toast("Không có dòng nào cần đổi.");btn.disabled=false;showPlan();return;}
              if(!confirm(`Đổi KPI chuẩn cho ${rows.length} dòng số liệu từ ${monthLabel(fromSel.value).toLowerCase()} trở đi?`)){btn.disabled=false;return;}
              for(let i=0;i<rows.length;i+=300)await saveKpiRows(rows.slice(i,i+300),[]);
              S.ent=null;toast(`Đã áp dụng KPI chuẩn mới cho ${rows.length} dòng.`);render();}
            catch(err){toast(errMsg(err));btn.disabled=false;}}},"Áp dụng")),preview));}
    out.append(saveBtn("pb",async()=>{if(D.pb.some(p=>!(p.ten||"").trim())){toast("Mỗi phòng ban cần có tên.");return;}
      try{await loadLatest();const r=mergeList(S.pb,D.pb,D.del.pb,x=>x.id,PB_F);await saveCfg2("phongban",r.list.map(p=>({...clean(p),ten:(p.ten||"").trim()})));
        if(D.dirty.nv){const rn=mergeList(S.nv,D.nv,D.del.nv,x=>fold(x.ma),NV_F);await saveCfg2("nhanvien",rn.list.map(clean));}S.dm=null;S.ent=null;toast("Đã lưu phòng ban.");render();}catch(e){toast(errMsg(e));}}));}
  else{
    const y=S.year||thisYear;const months=Array.from({length:12},(_,i)=>`${y}-${pad(i+1)}`);
    const def=validNum(D.cong.macdinh)?+D.cong.macdinh:24;
    const snap=m=>{const c=new Map();for(const r of S.kmonths.get(m)||[])if(validNum(r.cong))c.set(+r.cong,(c.get(+r.cong)||0)+1);let best=null,bn=0;for(const [k,v] of c)if(v>bn){best=k;bn=v;}return best;};
    const trs=months.map(m=>{const o=D.cong.override[m];const sv=snap(m);const used=validNum(o)?+o:sv!=null?sv:def;const n=(S.kmonths.get(m)||[]).length;
      return h("tr",{},h("td",{class:"l"},h("strong",{},monthLabel(m))),
        h("td",{},h("input",{type:"number",step:"0.5",min:"0",max:"31",value:validNum(o)?String(o):"",placeholder:String(def),disabled:ro,style:"width:100px","aria-label":"Công chuẩn "+monthLabel(m),
          oninput:e=>{const v=e.target.value.trim();if(v==="")delete D.cong.override[m];else D.cong.override[m]=Number(v);mark("cong");}})),
        h("td",{},h("strong",{},String(used)),validNum(o)?null:h("span",{class:"small faint"},sv!=null?" (theo số liệu đã lưu)":" (mặc định)")));});
    out.append(h("div",{class:"panel"},h("div",{class:"panel-head"},h("h3",{},"Công chuẩn"),yearSelect(v=>{S.year=v;render();})),
      h("p",{class:"hint"},"Nhập tay số công chuẩn của từng tháng. Tháng nào để trống thì dùng công chuẩn mặc định. Công thực tế của mỗi người = Công chuẩn − Ngày nghỉ. Có thể đặt nhanh ngay trên màn Nhập KPI tháng."),
      h("div",{class:"row",style:"margin:12px 0"},h("label",{class:"field"},"Công chuẩn mặc định",h("input",{type:"number",step:"0.5",min:"1",max:"31",value:validNum(D.cong.macdinh)?String(D.cong.macdinh):"",placeholder:"24",disabled:ro,style:"width:120px",
        oninput:e=>{const v=e.target.value.trim();D.cong.macdinh=v===""?null:Number(v);mark("cong");}}))),
      h("div",{class:"scroll"},h("table",{class:"grid dm-tbl dm-cong"},h("thead",{},h("tr",{},h("th",{class:"l"},"Tháng"),h("th",{},"Công chuẩn (nhập tay)"),h("th",{},"Đang dùng"))),h("tbody",{},trs)))));
    out.append(saveBtn("cong",async()=>{const bad=[D.cong.macdinh,...Object.values(D.cong.override)].some(v=>validNum(v)&&(+v<=0||+v>31));
      if(bad){toast("Công chuẩn phải từ 1 đến 31.");return;}
      try{await saveCfg2("cong",{macdinh:validNum(D.cong.macdinh)?+D.cong.macdinh:null,override:D.cong.override});S.dm=null;S.ent=null;toast("Đã lưu công chuẩn.");render();}catch(e){toast(errMsg(e));}}));}
  return out;}
async function saveCfg2(key,value){S.busy=true;try{await sbRpc("kpi_set_config",{p_key:key,p_value:value});}finally{S.busy=false;}
  if(key==="nhanvien")S.nv=value;else if(key==="dichvu")S.dv=value;else if(key==="phongban")S.pb=value;else if(key==="cong")S.cong=value;}

/* =====================================================================
   CÀI ĐẶT, SAO LƯU, THÊM (điện thoại)
   ===================================================================== */
function viewSettings(){const out=h("div",{class:"stack"});if(S.authMode)out.append(myAccountPanel());out.append(backupPanel2());return out;}
function backupPanel2(){const file=h("input",{type:"file",accept:".json","aria-label":"Chọn file sao lưu"});const ad=isAdmin();
  return h("div",{class:"panel"},h("div",{class:"panel-head"},h("h3",{},"Sao lưu và khôi phục"),h("span",{class:"small muted"},`${S.kpi.size} dòng KPI, ${S.nv.length} nhân viên`)),
    h("p",{class:"hint"},"Tải toàn bộ danh mục và số liệu KPI về một file .json để cất giữ. Nên làm mỗi tháng một lần."),
    h("div",{class:"row",style:"margin-top:12px"},h("button",{class:"ghost",type:"button",onclick:()=>{
      const data={app:"easysupport-kpi",version:2,exportedAt:new Date().toISOString(),nhanvien:S.nv,dichvu:S.dv,phongban:S.pb,cong:S.cong,kpi:[...S.kpi.values()]};
      saveFile(`EasySupport_sao_luu_${todayISO()}.json`,JSON.stringify(data),"application/json");}},"Tải file sao lưu"),
      ad?h("span",{class:"spacer"}):null,ad?file:null,ad?h("button",{class:"btn",type:"button",onclick:async()=>{const f=file.files&&file.files[0];if(!f){toast("Chọn file sao lưu trước đã.");return;}
        let d;try{d=JSON.parse(await f.text());}catch(e){toast("File không đúng định dạng.");return;}
        if(!d||d.version!==2||!Array.isArray(d.kpi)){toast("File không phải bản sao lưu KPI tháng.");return;}
        try{for(const k of ["phongban","dichvu","nhanvien","cong"])if(d[k]!=null)await saveCfg2(k,d[k]);
          const rows=d.kpi.filter(r=>r&&r.thang&&r.ma).map(({by,at,...r})=>r);for(let i=0;i<rows.length;i+=300)await saveKpiRows(rows.slice(i,i+300),[]);
          toast(`Đã khôi phục ${rows.length} dòng KPI.`);S.dm=null;S.ent=null;render();}catch(e){toast(errMsg(e));}}},"Khôi phục từ file"):null));}
function viewMore(){
  const items=[];
  if(S.authMode)items.push(["congviec","Công việc tháng","hist","Việc cố định & phát sinh, tiến độ, đánh giá"],
    ["kehoach","Kế hoạch tháng","cal","Lập kế hoạch và đối chiếu kết quả"]);
  items.push(["danhmuc","Danh mục","list","Nhân viên, dịch vụ, phòng ban, công chuẩn"],["caidat","Cài đặt","sliders","Tài khoản của tôi, sao lưu"]);
  if(S.authMode&&isAdmin())items.push(["baocao","Báo cáo & Thống kê","chart","Tổng hợp KPI, công việc, kế hoạch cả đội"],
    ["taikhoan","Tài khoản","users","Duyệt và phân quyền"+(S.me&&+S.me.pending?` (${S.me.pending} chờ duyệt)`:"")]);
  return h("div",{class:"stack"},
    S.authMode&&S.me?h("div",{class:"panel row"},avatar(S.me.ho_ten||S.me.email),h("div",{style:"min-width:0"},h("strong",{},S.me.ho_ten||S.me.email),h("div",{class:"small muted"},S.me.email+", "+roleLabel(S.me.vai_tro))),
      h("span",{class:"spacer"}),h("button",{class:"ghost",type:"button",onclick:logout},icon("logout"),"Đăng xuất")):null,
    h("div",{class:"more-grid"},items.map(([k,l,ic,d])=>h("button",{type:"button",class:"panel more-item",onclick:()=>go(k)},icon(ic),h("div",{},h("strong",{},l),h("div",{class:"small muted"},d)),h("span",{class:"spacer"}),h("span",{class:"faint"},"›")))),
    h("div",{class:"panel small muted sync-slot"}));}

/* =====================================================================
   KHUNG: menu, hiển thị
   ===================================================================== */
function icon(n){const s=h("span",{class:"ic","aria-hidden":"true"});s.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[n]||""}</svg>`;return s;}
function seg(options,value,onPick,label){return h("div",{class:"seg",role:"group","aria-label":label},options.map(([k,l])=>h("button",{type:"button","aria-pressed":String(k===value),onclick:()=>onPick(k)},l)));}
function renderNav(){
  const nP=S.authMode&&isAdmin()&&S.me?+S.me.pending||0:0;
  const badge=k=>k==="taikhoan"&&nP?h("span",{class:"badge","aria-label":nP+" người chờ duyệt"},String(nP)):null;
  const ub=document.getElementById("user-box");
  if(ub)ub.replaceChildren(...(S.authMode&&S.me?[avatar(S.me.ho_ten||S.me.email),h("div",{style:"min-width:0"},h("div",{class:"u-n"},S.me.ho_ten||S.me.email),h("div",{class:"u-r"},roleLabel(S.me.vai_tro))),
    h("button",{class:"u-out",type:"button",title:"Đăng xuất","aria-label":"Đăng xuất",onclick:logout},icon("logout"))]:[]));
  document.getElementById("nav").replaceChildren(...VIEWS.filter(v=>v[0]!=="them"&&(v[0]!=="taikhoan"||(S.authMode&&isAdmin()))&&(v[0]!=="baocao"||(S.authMode&&isAdmin()))&&((v[0]!=="congviec"&&v[0]!=="kehoach")||S.authMode)).map(([k,l,ic])=>
    h("button",{type:"button",class:"nv","aria-current":S.view===k?"page":null,onclick:()=>go(k)},icon(ic),h("span",{class:"lb"},l),badge(k))));
  const tb=document.getElementById("tabbar");
  if(tb)tb.replaceChildren(...TABS.map(([k,l,ic])=>h("button",{type:"button",class:"tb"+(k==="nhap"?" tb-main":""),
    "aria-current":(S.view===k||(k==="them"&&["danhmuc","caidat","taikhoan","them"].includes(S.view)))?"page":null,onclick:()=>go(k)},icon(ic),h("span",{class:"lb"},l),badge(k))));
  const t=document.getElementById("page-title");if(t)t.textContent=TITLES[S.view]||"";
  const e=document.getElementById("eyebrow");if(e)e.textContent=longDate(todayISO());
  document.title=(TITLES[S.view]?TITLES[S.view]+" – ":"")+"EasySupport – Đội Hỗ trợ & CSKH";}
function go(v){if(S.view==="danhmuc"&&v!=="danhmuc"&&dmDirty())toast("Danh mục còn thay đổi chưa lưu. Quay lại Danh mục để bấm Lưu.");
  if(v==="danhmuc"&&S.dm&&!dmDirty())S.dm=null;S.view=v;render();window.scrollTo(0,0);
  if(v==="danhmuc"&&S.mode==="remote")refreshRemote(true);}
function render(){
  closeCal();
  document.body.classList.toggle("gated",!!S.gate);
  if(S.gate){destroyCharts();document.getElementById("main").replaceChildren(viewGate());
    const f=document.querySelector(".auth-card input:not([type=hidden])");if(f&&!f.value)setTimeout(()=>f.focus(),30);return;}
  renderNav();destroyCharts();S.after=[];
  const wrap=h("div",{class:"stack"});const b=statusBanner();if(b)wrap.append(b);
  if(S.status==="ready"&&S.authMode!==undefined){const gr=greetEl();if(gr)wrap.append(gr);const bd=bdayEl();if(bd)wrap.append(bd);}
  if(S.status==="ready"){const fn={tonghop:viewTongHop,phongban:viewPhongBan,dichvu:viewDichVu,nhap:viewNhap,congviec:viewCongViec,kehoach:viewKeHoach,baocao:viewBaoCao,danhmuc:viewDanhMuc,caidat:viewSettings,taikhoan:viewAccounts,them:viewMore}[S.view]||viewTongHop;wrap.append(fn());}
  document.getElementById("main").replaceChildren(wrap);chartDefaults();renderSync();
  S.after.forEach(f=>f());S.after=[];}
function softRender(){if(S.gate||S.view==="taikhoan")return;
  if(S.view==="danhmuc"&&S.dm&&Object.values(S.dm.dirty).some(Boolean))return;
  if(S.view==="nhap"&&((S.ent&&S.ent.dirty)||S.imp))return;
  if(S.view==="danhmuc")S.dm=null;if(S.view==="nhap")S.ent=null;render();}
function statusBanner(){
  if(S.needUpgrade)return h("div",{class:"banner"},"Cơ sở dữ liệu chưa được nâng cấp lên bản KPI tháng. Quản lý chạy file kpi_thang.sql trong Supabase → SQL Editor.");
  if(S.mode==="remote"&&S.status==="error")return h("div",{class:"banner"},"Không tải được dữ liệu ("+S.err+"). Kiểm tra mạng rồi tải lại trang.");
  if(S.mode!=="remote"&&S.status==="local")return h("div",{class:"banner"},"Chưa cấu hình kết nối Supabase (config.js).");
  if(S.status==="loading"||S.status==="starting")return h("p",{class:"muted"},"Đang tải dữ liệu…");
  return null;}
function emptyState(){return h("div",{class:"panel empty"},h("div",{class:"logo","aria-hidden":"true"}),h("h2",{},"Chưa có số liệu KPI"),
  h("p",{class:"muted"},"Nhập KPI tháng bằng tay, hoặc tải file Excel theo mẫu."),h("button",{class:"btn",type:"button",onclick:()=>go("nhap")},"Nhập KPI tháng"));}

/* ---------- lời chào theo buổi ---------- */
function greetInfo(d){d=d||new Date();const m=d.getHours()*60+d.getMinutes(),wd=d.getDay(),dd=d.getDate(),mm=d.getMonth()+1;
  const p=m>=300&&m<660?"morning":m>=660&&m<810?"noon":m>=810&&m<1080?"afternoon":m>=1080&&m<1320?"evening":"night";
  const name=S.me&&S.me.ho_ten?S.me.ho_ten.trim().split(/\s+/).pop():"";const hi=name?", "+name:"";
  const base={morning:["☀️",`Chào buổi sáng${hi}!`,"Chúc bạn một ngày mới tốt lành và tràn đầy năng lượng."],
    noon:["🍱",`Chào buổi trưa${hi}!`,"Nhớ ăn trưa và nghỉ ngơi một chút nhé."],
    afternoon:["☕",`Chào buổi chiều${hi}!`,"Chúc bạn buổi chiều làm việc vui vẻ."],
    evening:["🌙",`Chào buổi tối${hi}!`,"Cảm ơn bạn đã vất vả cả ngày hôm nay."],
    night:["🌟",`Khuya rồi${hi}!`,"Nhớ nghỉ ngơi sớm để giữ sức khỏe nhé."]}[p];
  let [icon,title,msg]=base;
  if(wd===1&&p==="morning")msg="Đầu tuần rồi, chúc bạn một tuần mới thật năng lượng!";
  else if(wd===5&&(p==="afternoon"||p==="evening"))msg="Chiều thứ Sáu rồi, cố lên, cuối tuần sắp tới!";
  else if((wd===6||wd===0)&&p!=="night")msg="Cuối tuần vẫn ghé làm việc, cảm ơn bạn nhiều nhé!";
  const sp={"1-1":["🎆","Chúc mừng năm mới! Chúc bạn một năm thật nhiều niềm vui và thành công."],"14-2":["💝","Chúc bạn một ngày Valentine thật ngọt ngào!"],
    "8-3":["🌷","Chúc mừng ngày Quốc tế Phụ nữ 8/3!"],"30-4":["🇻🇳","Chúc mừng ngày Giải phóng miền Nam 30/4!"],"1-5":["🛠️","Chúc mừng ngày Quốc tế Lao động 1/5!"],
    "2-9":["🇻🇳","Chúc mừng Quốc khánh 2/9!"],"20-10":["💐","Chúc mừng ngày Phụ nữ Việt Nam 20/10!"],"20-11":["📚","Chúc mừng ngày Nhà giáo Việt Nam 20/11!"],
    "24-12":["🎄","Đêm Giáng sinh an lành và ấm áp nhé!"],"25-12":["🎄","Chúc bạn Giáng sinh an lành!"],"31-12":["🎉","Ngày cuối năm rồi, cảm ơn bạn đã đồng hành suốt một năm qua!"]}[`${dd}-${mm}`];
  if(sp){icon=sp[0];msg=sp[1];}
  return {p,icon,title,msg,key:p+"|"+todayISO()};}
function greetEl(){const g=greetInfo();if(lsGet("kpi:greet-hide")===g.key)return null;
  return h("div",{class:"greet g-"+g.p,id:"greet",role:"status"},h("span",{class:"g-ic","aria-hidden":"true"},g.icon),
    h("div",{class:"g-txt"},h("strong",{},g.title),h("span",{},g.msg)),
    h("button",{class:"g-x",type:"button","aria-label":"Ẩn lời chào",title:"Ẩn đến buổi sau",onclick:()=>{lsSet("kpi:greet-hide",g.key);const el=document.getElementById("greet");if(el)el.remove();}},"×"));}

/* ---------- bông tuyết ---------- */
const SNOW={on:false,cv:null,ctx:null,fl:[],raf:0,w:0,h:0,spr:null,dark:false};
function snowPref(){const v=lsGet("kpi:snow");if(v==="on")return true;if(v==="off")return false;return !matchMedia("(prefers-reduced-motion: reduce)").matches;}
// Hạt tuyết vẽ sẵn thành ảnh nhỏ có quầng sáng, để vẽ nhanh khi có nhiều hạt
function snowSprites(){SNOW.dark=matchMedia("(prefers-color-scheme: dark)").matches&&document.documentElement.dataset.theme!=="light";
  const cols=SNOW.dark?["255,255,255","225,240,255","200,228,255","190,245,235"]:["120,180,240","90,160,230","110,200,225","170,205,250"];
  const mk=(col,blur)=>{const s=64,c=document.createElement("canvas");c.width=c.height=s;const g=c.getContext("2d");
    const gr=g.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);
    if(blur){gr.addColorStop(0,`rgba(${col},.85)`);gr.addColorStop(.35,`rgba(${col},.45)`);gr.addColorStop(1,`rgba(${col},0)`);}
    else{gr.addColorStop(0,"rgba(255,255,255,1)");gr.addColorStop(.18,`rgba(${col},1)`);gr.addColorStop(.42,`rgba(${col},.55)`);gr.addColorStop(1,`rgba(${col},0)`);}
    g.fillStyle=gr;g.fillRect(0,0,s,s);return c;};
  SNOW.spr={sharp:cols.map(c=>mk(c,false)),soft:cols.map(c=>mk(c,true)),line:SNOW.dark?"235,245,255":"95,160,230"};}
function newFlake(anyY){const t=Math.random();let f;
  if(t<.55)f={k:"dot",r:1.2+Math.random()*1.0,vy:.35+Math.random()*.45,a:.6+Math.random()*.35};          // hạt li ti ở xa
  else if(t<.80)f={k:"dot",r:2.6+Math.random()*2.0,vy:.7+Math.random()*.6,a:.65+Math.random()*.3};       // bông vừa
  else if(t<.88)f={k:"bokeh",r:7+Math.random()*8,vy:1.1+Math.random()*.8,a:.25+Math.random()*.25};      // đốm sáng to, mờ, ở gần
  else f={k:"star",r:5+Math.random()*6,vy:.6+Math.random()*.6,a:.6+Math.random()*.35,rot:Math.random()*6.28,vr:(Math.random()-.5)*.02}; // bông 6 cánh
  f.x=Math.random()*SNOW.w;f.y=anyY?Math.random()*SNOW.h:-20;f.ph=Math.random()*6.28;f.amp=.3+Math.random()*.9;f.ci=Math.floor(Math.random()*4);return f;}
function snowSize(){const c=SNOW.cv;if(!c)return;const dpr=Math.min(window.devicePixelRatio||1,1.5);SNOW.w=innerWidth;SNOW.h=innerHeight;
  c.width=Math.round(SNOW.w*dpr);c.height=Math.round(SNOW.h*dpr);SNOW.ctx.setTransform(dpr,0,0,dpr,0,0);
  const want=Math.round(Math.min(280,Math.max(70,SNOW.w*SNOW.h/5500)));while(SNOW.fl.length<want)SNOW.fl.push(newFlake(true));SNOW.fl.length=want;}
function drawFlake(g,f){const S=SNOW.spr;g.globalAlpha=f.a;
  if(f.k==="dot"){const d=f.r*4.2;g.drawImage(S.sharp[f.ci],f.x-d/2,f.y-d/2,d,d);return;}
  if(f.k==="bokeh"){const d=f.r*3;g.drawImage(S.soft[f.ci],f.x-d/2,f.y-d/2,d,d);return;}
  const d=f.r*2.6;g.drawImage(S.soft[f.ci],f.x-d/2,f.y-d/2,d,d);
  g.save();g.translate(f.x,f.y);g.rotate(f.rot);g.strokeStyle=`rgba(${S.line},1)`;g.lineWidth=1.3;g.lineCap="round";g.beginPath();
  for(let i=0;i<6;i++){const a=i*Math.PI/3,L=f.r,cx=Math.cos(a),sy=Math.sin(a),bx=cx*L*.58,by=sy*L*.58,b=L*.32;
    g.moveTo(0,0);g.lineTo(cx*L,sy*L);g.moveTo(bx,by);g.lineTo(bx+Math.cos(a+.65)*b,by+Math.sin(a+.65)*b);g.moveTo(bx,by);g.lineTo(bx+Math.cos(a-.65)*b,by+Math.sin(a-.65)*b);}
  g.stroke();g.restore();}
function snowTick(){const g=SNOW.ctx;g.clearRect(0,0,SNOW.w,SNOW.h);
  for(const f of SNOW.fl){f.y+=f.vy;f.ph+=.01;f.x+=Math.sin(f.ph)*f.amp*.35+.08;if(f.rot!=null)f.rot+=f.vr;
    if(f.y>SNOW.h+24||f.x<-30||f.x>SNOW.w+30)Object.assign(f,newFlake(false));drawFlake(g,f);}
  g.globalAlpha=1;SNOW.raf=requestAnimationFrame(snowTick);}
function setSnow(on,save){SNOW.on=on;if(save)lsSet("kpi:snow",on?"on":"off");
  if(on&&!SNOW.cv){const c=document.createElement("canvas");c.className="snow";c.setAttribute("aria-hidden","true");document.body.prepend(c);
    SNOW.cv=c;SNOW.ctx=c.getContext("2d");snowSprites();snowSize();window.addEventListener("resize",snowSize);
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change",snowSprites);}
  if(SNOW.cv)SNOW.cv.style.display=on?"block":"none";cancelAnimationFrame(SNOW.raf);if(on)SNOW.raf=requestAnimationFrame(snowTick);
  document.querySelectorAll(".snow-tg").forEach(b=>{b.setAttribute("aria-pressed",String(on));b.title=on?"Tắt tuyết rơi":"Bật tuyết rơi";});}

/* ---------- start ---------- */
async function init(){
  const v=(location.hash||"").slice(1);if(VIEWS.some(x=>x[0]===v))S.view=v;
  document.getElementById("cta").addEventListener("click",()=>{S.month=thisMonth();S.ent=null;S.nhapMode="tay";go("nhap");});
  document.querySelectorAll(".snow-tg").forEach(b=>b.addEventListener("click",()=>{setSnow(!SNOW.on,true);toast(SNOW.on?"Đã bật tuyết rơi ❄":"Đã tắt tuyết rơi");}));
  setSnow(snowPref(),false);
  setInterval(()=>{const el=document.getElementById("greet");if(!el)return;const g=greetInfo();
    if(!el.classList.contains("g-"+g.p)||el.querySelector(".g-txt span").textContent!==g.msg){const n=greetEl();if(n)el.replaceWith(n);else el.remove();}},60000);
  render();
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change",()=>{if(S.view!=="nhap"&&S.view!=="danhmuc")render();});
  S.lsOK=storageOK();
  window.addEventListener("beforeunload",e=>{if(dmDirty()||(S.ent&&S.ent.dirty&&!S.ent.saving)){e.preventDefault();e.returnValue="";}});
  try{for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k&&k.startsWith("kpi:draft2:"))localStorage.removeItem(k);}}catch(e){}
  if(USE_SB){S.mode="remote";loadSess();const r=handleAuthRedirect();if(r==="recovery"||r==="error"){render();return;}
    await enterApp();if(S.welcome&&!S.gate){toast(S.welcome);S.welcome=null;}return;}
  S.status="local";render();
}
init();
})();
