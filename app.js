(function(){
"use strict";
const VIEWS=[["tuan","Tổng quan tuần","dash"],["thang","Theo tháng","cal"],["canhbao","Cảnh báo","warn"],["sosanh","So sánh","chart"],["nhap","Nhập KPI","plus"],["lichsu","Lịch sử ngày","hist"],["caidat","Cài đặt","sliders"],["them","Thêm","more"]];
const TABS=[["tuan","Tuần","dash"],["thang","Tháng","cal"],["nhap","Nhập","plus"],["canhbao","Cảnh báo","warn"],["them","Thêm","more"]];
const ICONS={
  dash:'<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  cal:'<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  warn:'<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  chart:'<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 6-7"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  hist:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
  sliders:'<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
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
  view:"tuan",nhapMode:"tay",week:null,search:"",sort:{key:"avg",dir:-1},wkMetric:"avg",flash:null,
  cmp:{emp:"__team",metric:"avg",year:null},
  entry:null,preview:null,importYear:thisYear,pasteDate:"",importMsg:"",rosterEdit:null,
  charts:[],barChart:null,after:[],
  months:new Map(),monthKeys:[],month:null,lbMetric:"avg",alertCache:null};

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

/* ---------- Supabase ---------- */
async function sbFetch(path,opts={}){
  const headers={apikey:SB_KEY,"Content-Type":"application/json",...(opts.headers||{})};
  if(SB_KEY.startsWith("eyJ"))headers.Authorization="Bearer "+SB_KEY; // khóa anon kiểu cũ (JWT)
  let res;try{res=await fetch(SB_URL+path,{...opts,headers,cache:"no-store"});}catch(e){throw {code:"network"};}
  const txt=await res.text();let body=null;try{body=txt?JSON.parse(txt):null;}catch(e){}
  if(!res.ok){if(body&&(body.message==="pin"||body.code==="28000"))throw {code:"pin"};
    throw {code:"server",message:(body&&(body.message||body.hint||body.error))||("HTTP "+res.status)};}
  return body;}
const sbRpc=(fn,args)=>sbFetch("/rest/v1/rpc/"+fn,{method:"POST",body:JSON.stringify(args||{})});
async function sbCall(action,data){const pin=lsGet("kpi:pin")||"";
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
  if(USE_SB){try{j=await sbRpc("kpi_load",{});}catch(e){throw new Error(e.code==="network"?"không kết nối được":e.message||"lỗi máy chủ");}
    j.needPin=true;S.version=j.version||null;S.schema=+j.schema||1;}
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
  catch(e){S.syncErr="Không cập nhật được";}
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

/* ---------- parsing (import) ---------- */
function num(v){if(v==null)return null;if(typeof v==="number")return isFinite(v)?v:null;
  let t=String(v).trim().replace(/\s/g,"");if(!t)return null;
  if(/^-?\d+([.,]\d+)?$/.test(t))return Number(t.replace(",","."));return null;}
const DATE_RE=/^(?:ngày\s*)?(\d{1,2})\s*[\/\-.]\s*(\d{1,2})(?:\s*[\/\-.]\s*(\d{2,4}))?$/i;
const DATE_IN_TEXT=/ngày\s*(\d{1,2})\s*[\/\-.]\s*(\d{1,2})(?:\s*[\/\-.]\s*(\d{2,4}))?/i;
function mkDate(d,mo,y){if(mo>12&&d<=12){const t=d;d=mo;mo=t;}
  if(y<100)y+=2000;if(mo<1||mo>12||d<1||d>31||y<2000||y>2100)return null;
  const dt=new Date(Date.UTC(y,mo-1,d));if(dt.getUTCMonth()!==mo-1)return null;return iso(y,mo,d);}
function parseDateText(t,year){const m=String(t||"").trim().match(DATE_RE);if(!m)return null;return mkDate(+m[1],+m[2],m[3]?+m[3]:year);}
function cleanName(raw){const s=String(raw).normalize("NFC").replace(/\s+/g," ").trim();
  const probation=/thu viec/.test(fold(s));
  const base=s.replace(/\s*\([^)]*\)\s*/g," ").replace(/\s+/g," ").trim()||s;
  return {name:base,probation,key:fold(base)};}
function cellText(row,c){const v=row[c];return v==null?"":String(v).trim();}
function readEmp(row){
  const a=cellText(row,0);
  if(!a||a.length>60||DATE_RE.test(a)||num(a)!=null)return null;
  const fa=fold(a);
  if(/^(tong|total|trung binh|tb$|stt|ho( va)? ten|ten nhan vien|nhan vien$|ghi chu)/.test(fa))return null;
  const raw=[1,2,3,4,5].map(c=>cellText(row,c));
  const v=raw.map(num);
  const off=raw.some(t=>/^(off|nghi)$/.test(fold(t)));
  const g=num(row[6]),target=num(row[7]),j=num(row[9]);
  const it=fold(cellText(row,8));
  const iRes=/(khong|chua) dat/.test(it)?false:(/^dat/.test(it)?true:null);
  if(!v.some(x=>x!=null)&&g==null&&iRes===null&&!off)return null;
  const total=g!=null?g:v.reduce((s,x)=>s+(x||0),0);
  const {name,probation,key}=cleanName(a);
  const pass=off?false:(iRes!==null?iRes:(target!=null?total>=target:null));
  return {name,key,probation,off,v,total,target,pass,j};
}
function parseGrid(grid,{sheet,year,fallbackDate}){
  const blocks=[];let pending=null,cur=null;
  const close=()=>{if(cur&&cur.rows.length)blocks.push(cur);cur=null;};
  for(const row0 of grid){
    const row=row0||[];
    const emp=readEmp(row);
    if(!emp){let first="";for(let c=0;c<Math.min(row.length,10);c++){const t=cellText(row,c);if(t){first=t;break;}}
      const d=first?parseDateText(first,year):null;
      if(d){close();pending=d;continue;}}
    if(emp){if(!cur){cur={sheet,labelDate:pending,textDate:null,fallback:fallbackDate||null,rows:[]};pending=null;}cur.rows.push(emp);}
    else if(!cellText(row,0)){close();}
    if(cur){for(let c=10;c<row.length;c++){const t=cellText(row,c);if(t&&t.length<300){const m=t.match(DATE_IN_TEXT);
      if(m&&!cur.textDate){const d=mkDate(+m[1],+m[2],m[3]?+m[3]:year);if(d)cur.textDate=d;}}}}
  }
  close();return blocks;
}
function blocksToItems(blocks){
  const items=blocks.map((b,i)=>({id:i,sheet:b.sheet,date:b.labelDate||b.textDate||b.fallback||"",
    how:b.labelDate?"label":b.textDate?"text":b.fallback?"paste":"none",rows:b.rows,include:true,dupe:false}));
  const seen=new Set();
  for(let i=items.length-1;i>=0;i--){const it=items[i];if(!it.date)continue;if(seen.has(it.date)){it.dupe=true;it.include=false;}else seen.add(it.date);}
  return items;
}
function refreshDupes(items){const count=new Map();items.forEach(it=>{if(it.date&&it.include)count.set(it.date,(count.get(it.date)||0)+1);});
  items.forEach(it=>{it.dupe=!!(it.date&&(count.get(it.date)||0)>1&&it.include);});}

/* ---------- data index ---------- */
function rebuild(){
  const weeks=new Map();
  for(const [date,doc] of S.days){const w=isoWeek(date);let W=weeks.get(w.key);
    if(!W){W={...w,dates:[],sheets:new Set()};weeks.set(w.key,W);}W.dates.push(date);if(doc.sheet)W.sheets.add(doc.sheet);}
  for(const W of weeks.values())W.dates.sort();
  S.weeks=weeks;S.weekKeys=[...weeks.keys()].sort();
  const emps=new Map();
  for(const date of [...S.days.keys()].sort()){for(const r of S.days.get(date).rows||[]){emps.set(r.key,{key:r.key,name:r.name,probation:!!r.probation,last:date});}}
  S.emps=emps;S.cache=new Map();
  if(!S.week||!weeks.has(S.week))S.week=S.weekKeys[S.weekKeys.length-1]||null;
  const years=[...new Set(S.weekKeys.map(k=>+k.slice(0,4)))];
  if(!S.cmp.year||(S.cmp.year!=="all"&&!years.includes(S.cmp.year)))S.cmp.year=years.length?Math.max(...years):"all";
  if(S.cmp.emp!=="__team"&&!emps.has(S.cmp.emp))S.cmp.emp="__team";
  rebuildMonths();S.alertCache=null;
}
function statsFor(dates,emp){
  let days=0,total=0,pass=0,offs=0,tsum=0,tn=0;const cols=Array(NSLOT).fill(0);
  for(const d of dates){for(const r of (S.days.get(d)?.rows||[])){if(emp&&r.key!==emp)continue;
    if(r.off){offs++;continue;}days++;total+=r.total||0;if(r.pass)pass++;
    (r.v||[]).forEach((x,i)=>{cols[i]+=x||0;});if(r.target!=null){tsum+=r.target;tn++;}}}
  return {days,total,pass,offs,cols,avg:days?total/days:null,rate:days?pass/days:null,target:tn?tsum/tn:null};
}
function ws(key,emp){const ck=key+"|"+(emp||"");let s=S.cache.get(ck);if(!s){s=statsFor(S.weeks.get(key)?.dates||[],emp);S.cache.set(ck,s);}return s;}
function ys(year,emp){const ck="Y"+year+"|"+(emp||"");let s=S.cache.get(ck);if(!s){s=statsFor([...S.days.keys()].filter(d=>d.startsWith(year+"-")),emp);S.cache.set(ck,s);}return s;}
function mv(s,m){if(!s||!s.days)return null;return m==="avg"?s.avg:m==="total"?s.total:s.rate*100;}
function delta(cur,prev,m){if(cur==null||prev==null)return null;if(m==="rate")return {v:cur-prev,unit:"pp"};if(prev===0)return null;return {v:(cur-prev)/prev*100,unit:"%"};}
function deltaEl(d){if(!d)return h("span",{class:"delta none"},"—");
  const s=d.v>0.05?"up":d.v<-0.05?"down":"flat";
  const txt=(d.v>0.05?"+":d.v<-0.05?"−":"±")+fmt(Math.abs(d.v),1)+(d.unit==="pp"?" điểm":"%");
  return h("span",{class:"delta "+s},(s==="up"?"▲ ":s==="down"?"▼ ":"")+txt);}
function deltaTxt(d){if(!d)return "";return (d.v>0?"+":"")+fmt(d.v,1)+(d.unit==="pp"?" điểm":"%");}
const prevKey=W=>isoWeek(addDays(W.monday,-7)).key;
const yoyKey=W=>`${W.year-1}-W${pad(W.week)}`;
function verdict(rate){if(rate==null)return ["Chưa có số liệu","none"];const r=rate*100;
  return r>=80?["Tốt","ok"]:r>=60?["Khá","info"]:r>=40?["Trung bình","warn"]:["Thấp","bad"];}

/* ---------- writes ---------- */
function writable(){return S.canWrite!==false;}
function guard(e){if(e&&e.code==="invalid_argument")S.canWrite=false;}
async function writeDays(list){
  if(S.mode==="remote"){S.busy=true;try{await apiWrite("writeDays",{days:list});}finally{S.busy=false;}
    const next=new Map(S.days);list.forEach(x=>next.set(x.date,fromServerDay(x.payload)));S.days=next;return;}
  for(const x of list)await writeDay(x.date,x.payload);}
async function writeDay(date,payload){if(S.mode==="remote")return writeDays([{date,payload}]);
  if(!S.db){const next=new Map(S.days);next.set(date,payload);persistLocal(LS.days,Object.fromEntries(next));S.days=next;return;}
  try{await S.db.doc("kpi_days/"+date).set(payload);}catch(e){guard(e);throw e;}}
async function deleteDay(date){if(S.mode==="remote"){S.busy=true;try{await apiWrite("deleteDay",{date});}finally{S.busy=false;}
    const next=new Map(S.days);next.delete(date);S.days=next;return;}
  if(!S.db){const next=new Map(S.days);next.delete(date);persistLocal(LS.days,Object.fromEntries(next));S.days=next;return;}
  try{await S.db.doc("kpi_days/"+date).delete();}catch(e){guard(e);throw e;}}
function errMsg(e){if(e&&e.code==="pin_cancel")return "Đã hủy, số liệu chưa được lưu.";
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
const PALETTE=()=>[cv("--brand"),"#E0891B","#2A9D8F","#B5487A","#7A62C9","#5C8A2E","#C2543B","#3B7EA1"];

/* ---------- shell ---------- */
function icon(n){const s=h("span",{class:"ic","aria-hidden":"true"});s.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[n]||""}</svg>`;return s;}
function renderNav(){
  const nA=S.days.size?computeAlerts().length:0;
  const badge=k=>k==="canhbao"&&nA?h("span",{class:"badge","aria-label":nA+" cảnh báo"},String(nA)):null;
  document.getElementById("nav").replaceChildren(...VIEWS.filter(v=>v[0]!=="them").map(([k,l,ic])=>
    h("button",{type:"button",class:"nv","aria-current":S.view===k?"page":null,onclick:()=>go(k)},icon(ic),h("span",{class:"lb"},l),badge(k))));
  const tb=document.getElementById("tabbar");
  if(tb)tb.replaceChildren(...TABS.map(([k,l,ic])=>h("button",{type:"button",class:"tb"+(k==="nhap"?" tb-main":""),
    "aria-current":(S.view===k||(k==="them"&&["sosanh","lichsu","caidat","them"].includes(S.view)))?"page":null,onclick:()=>go(k)},icon(ic),h("span",{class:"lb"},l),badge(k))));
  const t=document.getElementById("page-title");if(t)t.textContent=TITLES[S.view]||"";
  const e=document.getElementById("eyebrow");if(e)e.textContent=longDate(todayISO());
  document.title=(TITLES[S.view]?TITLES[S.view]+" – ":"")+"KPI nhóm hỗ trợ Nam Định";
}
function go(v){S.view=v;S.flash=null;if(v==="nhap"&&S.nhapMode==="tay"&&!S.entry)openEntry(todayISO(),true);render();window.scrollTo(0,0);}
function render(){
  renderNav();destroyCharts();S.after=[];
  const wrap=h("div",{class:"stack"});
  const b=statusBanner();if(b)wrap.append(b);
  if(S.view==="tuan"||S.view==="thang"){const a=alertStrip();if(a)wrap.append(a);}
  wrap.append({tuan:viewWeek,thang:viewMonth,canhbao:viewAlerts,sosanh:viewCompare,nhap:viewNhap,lichsu:viewHistory,caidat:viewSettings,them:viewMore}[S.view]());
  document.getElementById("main").replaceChildren(wrap);chartDefaults();renderSync();
  S.after.forEach(f=>f());S.after=[];
}
function softRender(){
  if(S.view==="caidat"&&(S.rosterEdit||S.colEdit))return;
  if(S.view==="nhap"){
    if(S.nhapMode==="tay"&&S.entry&&!S.entry.dirty&&!S.entry.saving){openEntry(S.entry.date,true);render();}
    else if(S.nhapMode!=="tay"&&!S.preview&&!S.mapping)render();
    return;}
  render();
}
function statusBanner(){
  if(S.mode==="remote"&&S.status==="error")return h("div",{class:"banner"},(USE_SB?"Không tải được dữ liệu từ Supabase ("+S.err+"). Kiểm tra supabaseUrl, supabaseKey trong config.js và đã chạy file supabase_setup.sql chưa.":"Không tải được dữ liệu từ máy chủ ("+S.err+"). Kiểm tra apiUrl trong config.js."));
  if(S.status==="local"&&!API&&S.lsOK)return h("div",{class:"banner info"},"Chưa nối cơ sở dữ liệu chung, số liệu đang lưu riêng trên máy này. Làm theo HUONG_DAN.md để cả nhóm dùng chung.");
  if(S.status==="local"&&!S.lsOK)return h("div",{class:"banner"},"Trình duyệt đang chặn bộ nhớ (có thể do chế độ ẩn danh), nên số liệu sẽ mất khi tải lại trang.");
  if(S.status==="error")return h("div",{class:"banner"},"Không đọc được dữ liệu chung ("+S.err+"). Tải lại trang để thử lại.");
  if(S.status==="loading"||S.status==="starting")return h("p",{class:"muted"},"Đang tải dữ liệu chung…");
  return null;
}
function emptyState(){return h("div",{class:"panel empty"},h("div",{class:"logo","aria-hidden":"true"},"KPI"),h("h2",{},"Chưa có số liệu nào"),
  h("p",{class:"muted"},"Bắt đầu bằng cách nhập KPI của ngày hôm nay, hoặc tải tệp Excel từ Google Sheets để đưa số liệu cũ vào."),
  h("div",{class:"row",style:"justify-content:center"},
    h("button",{class:"btn",type:"button",onclick:()=>{S.nhapMode="tay";openEntry(todayISO(),true);go("nhap");}},"Nhập tay hôm nay"),
    h("button",{class:"ghost",type:"button",onclick:()=>{S.nhapMode="tep";go("nhap");}},"Tải tệp Excel")));}
function weekOptions(){const byYear=new Map();for(const k of [...S.weekKeys].reverse()){const W=S.weeks.get(k);if(!byYear.has(W.year))byYear.set(W.year,[]);byYear.get(W.year).push(W);}
  return [...byYear].map(([y,list])=>h("optgroup",{label:"Năm "+y},list.map(W=>h("option",{value:W.key},`${weekLabel(W)} (${weekRange(W)})`+(W.sheets.size?`, tab ${[...W.sheets].join(", ")}`:"")))));}
function seg(options,value,onPick,label){return h("div",{class:"seg",role:"group","aria-label":label},options.map(([k,l])=>h("button",{type:"button","aria-pressed":String(k===value),onclick:()=>onPick(k)},l)));}
function resultChip(r){if(r.off)return h("span",{class:"chip off"},"Nghỉ");if(r.pass===true)return h("span",{class:"chip ok"},"Đạt");if(r.pass===false)return h("span",{class:"chip bad"},"Không đạt");return h("span",{class:"chip none"},"—");}

/* ---------- tháng & xếp hạng ---------- */
function rebuildMonths(){const m=new Map();for(const d of S.days.keys()){const k=d.slice(0,7);if(!m.has(k))m.set(k,[]);m.get(k).push(d);}
  for(const v of m.values())v.sort();S.months=m;S.monthKeys=[...m.keys()].sort();
  if(!S.month||!m.has(S.month))S.month=S.monthKeys[S.monthKeys.length-1]||null;}
function monthLabel(k){const p=k.split("-");return `Tháng ${+p[1]}/${p[0]}`;}
function shiftMonth(k,n){let [y,m]=k.split("-").map(Number);m+=n;while(m<1){m+=12;y--;}while(m>12){m-=12;y++;}return `${y}-${pad(m)}`;}
function mstat(k,emp){const ck="M"+k+"|"+(emp||"");let s=S.cache.get(ck);if(!s){s=statsFor(S.months.get(k)||[],emp);S.cache.set(ck,s);}return s;}
function ranking(k,metric){const keys=new Set();for(const d of S.months.get(k)||[])for(const r of S.days.get(d).rows||[])keys.add(r.key);
  const list=[...keys].map(e=>({k:e,name:S.emps.get(e)?.name||e,prob:!!S.emps.get(e)?.probation,s:mstat(k,e)})).filter(x=>x.s.days>0);
  list.forEach(x=>{x.val=mv(x.s,metric);});
  list.sort((a,b)=>((b.val||0)-(a.val||0))||((b.s.rate||0)-(a.s.rate||0))||((b.s.avg||0)-(a.s.avg||0))||a.name.localeCompare(b.name,"vi"));
  list.forEach((x,i)=>{x.rank=i+1;});return list;}
function tile(lab,val,sub,cmpEl,meter){return h("div",{class:"tile"},h("div",{class:"lab"},lab),h("div",{class:"val"},val),
  meter!=null?h("div",{class:"meter"},h("span",{style:`width:${Math.max(0,Math.min(100,meter))}%`})):null,h("div",{class:"sub"},sub),cmpEl||null);}
function rankChange(x,prev){const p=prev.get(x.k);if(p==null)return h("span",{class:"rk-ch new"},"mới");const d=p-x.rank;
  if(!d)return h("span",{class:"rk-ch flat",title:"Giữ hạng so với tháng trước"},"–");
  return h("span",{class:"rk-ch "+(d>0?"up":"down"),title:`Tháng trước hạng ${p}`},(d>0?"▲ ":"▼ ")+Math.abs(d));}
function calendar(k){
  const [y,mo]=k.split("-").map(Number);const nDays=new Date(Date.UTC(y,mo,0)).getUTCDate();const off=dow(iso(y,mo,1));
  const grid=h("div",{class:"cal"},WD.map(w=>h("div",{class:"cal-h"},w)));
  for(let i=0;i<off;i++)grid.append(h("div",{class:"cal-c empty"}));
  for(let d=1;d<=nDays;d++){const ds=iso(y,mo,d);
    if(!S.days.has(ds)){grid.append(h("div",{class:"cal-c none"},h("span",{class:"cal-d"},String(d))));continue;}
    const s=statsFor([ds]);const r=s.rate;const lvl=r==null?"none":r>=.8?"l4":r>=.6?"l3":r>=.4?"l2":"l1";
    grid.append(h("button",{type:"button",class:"cal-c "+lvl,title:`${longDate(ds)}: ${s.pass}/${s.days} đạt, KPI TB ${fmt(s.avg)}`,
      onclick:()=>{S.nhapMode="tay";openEntry(ds,true);go("nhap");}},h("span",{class:"cal-d"},String(d)),h("span",{class:"cal-v"},s.days?`${s.pass}/${s.days}`:"nghỉ")));}
  return grid;}
function viewMonth(){
  if(!S.monthKeys.length)return S.status==="ready"||S.status==="local"?emptyState():h("div");
  const k=S.month,idx=S.monthKeys.indexOf(k),pk=shiftMonth(k,-1),yk=shiftMonth(k,-12),m=S.lbMetric;
  const T=mstat(k),TP=mstat(pk),TY=mstat(yk);
  const out=h("div",{class:"stack"});
  const sel=h("select",{"aria-label":"Chọn tháng",onchange:e=>{S.month=e.target.value;render();}},[...S.monthKeys].reverse().map(x=>h("option",{value:x},monthLabel(x))));sel.value=k;
  out.append(h("div",{class:"weekbar"},
    h("button",{class:"ghost icon",type:"button","aria-label":"Tháng trước",disabled:idx<=0,onclick:()=>{S.month=S.monthKeys[idx-1];render();}},"‹"),sel,
    h("button",{class:"ghost icon",type:"button","aria-label":"Tháng sau",disabled:idx>=S.monthKeys.length-1,onclick:()=>{S.month=S.monthKeys[idx+1];render();}},"›")));
  const cmp=(cur,p,y,mm)=>h("div",{class:"cmp"},h("span",{},deltaEl(delta(cur,p,mm))," tháng trước"),h("span",{},deltaEl(delta(cur,y,mm))," cùng kỳ "+(+k.slice(0,4)-1)));
  const rate=mv(T,"rate");const [vt,vc]=verdict(T.rate);
  const staff=new Set(),prob=new Set();for(const d of S.months.get(k))for(const r of S.days.get(d).rows||[]){staff.add(r.key);if(r.probation)prob.add(r.key);}
  out.append(h("div",{class:"panel"},
    h("div",{class:"week-title"},h("h2",{},monthLabel(k)),h("span",{class:"chip "+vc},vt),h("span",{class:"muted small"},`${S.months.get(k).length} ngày có số liệu`)),
    h("div",{class:"tiles tiles-4"},
      tile("Tỷ lệ đạt",fmtM(rate,"rate"),`${T.pass}/${T.days} lượt đạt`,cmp(rate,mv(TP,"rate"),mv(TY,"rate"),"rate"),rate),
      tile("KPI trung bình mỗi ngày",fmt(T.avg),T.target!=null?"Mốc trung bình "+fmt(T.target):"\u00a0",cmp(T.avg,TP.avg,TY.avg,"avg")),
      tile("Tổng KPI",fmt(T.total,0),`${T.days} lượt làm việc`,cmp(mv(T,"total"),mv(TP,"total"),mv(TY,"total"),"total")),
      tile("Nhân sự",String(staff.size),(prob.size?prob.size+" thử việc, ":"")+T.offs+" lượt nghỉ",null))));

  const rk=ranking(k,m),prev=new Map(ranking(pk,m).map(x=>[x.k,x.rank]));
  const medal=["🥇","🥈","🥉"];
  const big=n=>{const a=avatar(n);a.classList.add("av-lg");return a;};
  const pod=h("div",{class:"podium"},[1,0,2].map(i=>{const x=rk[i];if(!x)return h("div",{});
    return h("button",{type:"button",class:"pod p"+(i+1),title:"Xem diễn biến của "+x.name,onclick:()=>{S.cmp.emp=x.k;go("sosanh");}},
      h("div",{class:"medal","aria-hidden":"true"},medal[i]),big(x.name),h("div",{class:"pod-n"},x.name),h("div",{class:"pod-v"},fmtM(x.val,m)),
      h("div",{class:"pod-s"},`${x.s.pass}/${x.s.days} ngày đạt`),h("div",{class:"pod-base"},String(i+1)));}));
  const legend=h("div",{class:"cal-legend"},h("span",{},"Tỷ lệ đạt của nhóm:"),
    [["l1","dưới 40%"],["l2","40–59%"],["l3","60–79%"],["l4","từ 80%"]].map(([c,t])=>h("span",{class:"lg"},h("i",{class:c}),t)));
  out.append(h("div",{class:"two-col"},
    h("div",{class:"panel"},h("div",{class:"panel-head"},h("h3",{},"Lịch tháng"),h("span",{class:"small muted"},"Bấm vào ngày để mở")),calendar(k),legend),
    h("div",{class:"panel"},h("div",{class:"panel-head"},h("h3",{class:"row",style:"gap:8px"},icon("trophy"),"Top 3 "+monthLabel(k).toLowerCase())),
      rk.length?pod:h("p",{class:"muted"},"Chưa có ai trong tháng này."))));

  const max=Math.max(1,...rk.map(x=>x.val||0));
  const barCls=x=>m==="avg"&&x.s.target!=null?(x.s.avg>=x.s.target?"ok":"bad"):m==="rate"?(x.val>=50?"ok":"bad"):"";
  out.append(h("div",{class:"panel"},
    h("div",{class:"panel-head"},h("h3",{},"Bảng xếp hạng"),seg(METRICS,m,v=>{S.lbMetric=v;render();},"Xếp hạng theo")),
    h("div",{class:"lb"},rk.map(x=>h("button",{type:"button",class:"lb-row",onclick:()=>{S.cmp.emp=x.k;go("sosanh");}},
      h("span",{class:"lb-rank"+(x.rank<=3?" top":"")},String(x.rank)),
      h("span",{class:"lb-who"},avatar(x.name),h("span",{class:"nm"},x.name),x.prob?h("span",{class:"tag"},"thử việc"):null),
      h("span",{class:"lb-bar"},h("span",{class:barCls(x),style:`width:${Math.max(2,(x.val||0)/max*100)}%`})),
      h("span",{class:"lb-val"},fmtM(x.val,m)),
      h("span",{class:"lb-sub"},`${x.s.pass}/${x.s.days} đạt`),
      rankChange(x,prev)))),
    h("p",{class:"hint",style:"margin-top:12px"},"Mũi tên là thay đổi thứ hạng so với "+monthLabel(pk).toLowerCase()+". Người có ít ngày làm trong tháng có thể bị xếp cao hoặc thấp bất thường.")));
  return out;}

/* ---------- cảnh báo ---------- */
function alertN(){const n=+lsGet("kpi:alertN");return n>=2&&n<=10?n:3;}
function computeAlerts(){if(S.alertCache)return S.alertCache;
  const N=alertN(),dates=[...S.days.keys()].sort(),lastDate=dates[dates.length-1],per=new Map();
  for(const d of dates)for(const r of S.days.get(d).rows||[]){if(!per.has(r.key))per.set(r.key,[]);per.get(r.key).push({d,r});}
  const out=[];
  for(const [k,list] of per){const last=list[list.length-1].d;
    if(lastDate&&(parseISO(lastDate)-parseISO(last))/864e5>14)continue;
    const streak=[];let prevD=null;
    for(let i=list.length-1;i>=0;i--){const x=list[i];
      if(prevD&&(parseISO(prevD)-parseISO(x.d))/864e5>7)break; // khoảng trống dữ liệu quá 7 ngày thì dừng chuỗi
      prevD=x.d;if(x.r.off)continue;if(x.r.pass===false)streak.push(x);else break;}
    if(streak.length<N)continue;
    streak.reverse();const tg=streak.filter(x=>x.r.target!=null);
    out.push({k,name:S.emps.get(k)?.name||k,prob:!!S.emps.get(k)?.probation,n:streak.length,from:streak[0].d,to:streak[streak.length-1].d,
      avg:streak.reduce((s,x)=>s+(x.r.total||0),0)/streak.length,target:tg.length?tg.reduce((s,x)=>s+x.r.target,0)/tg.length:null,
      recent:list.filter(x=>!x.r.off).slice(-10)});}
  out.sort((a,b)=>b.n-a.n||a.avg-b.avg);S.alertCache=out;return out;}
function alertStrip(){const a=S.days.size?computeAlerts():[];if(!a.length)return null;
  return h("button",{type:"button",class:"alert-strip",onclick:()=>go("canhbao")},icon("warn"),
    h("span",{},h("strong",{},`${a.length} nhân viên`),` không đạt từ ${alertN()} ngày làm việc liền trở lên`,h("span",{class:"as-names"},": "+a.slice(0,3).map(x=>x.name).join(", ")+(a.length>3?"…":""))),
    h("span",{class:"spacer"}),h("span",{class:"alert-go"},"Xem ›"));}
function viewAlerts(){
  if(!S.days.size)return S.status==="ready"||S.status==="local"?emptyState():h("div");
  const N=alertN(),list=computeAlerts();const out=h("div",{class:"stack"});
  out.append(h("div",{class:"panel"},h("div",{class:"row"},
    h("span",{},"Cảnh báo khi một người không đạt từ"),
    seg([["2","2"],["3","3"],["4","4"],["5","5"],["7","7"]],String(N),v=>{lsSet("kpi:alertN",v);S.alertCache=null;render();},"Số ngày liền"),
    h("span",{},"ngày làm việc liền trở lên")),
    h("p",{class:"hint",style:"margin-top:10px"},"Ngày nghỉ không làm đứt chuỗi. Người không có số liệu trong 14 ngày gần nhất được bỏ qua. Mức cảnh báo này lưu riêng trên máy đang dùng.")));
  if(!list.length){out.append(h("div",{class:"panel empty"},h("div",{class:"big-emoji","aria-hidden":"true"},"🎉"),h("h2",{},"Không ai cần cảnh báo"),
    h("p",{class:"muted"},`Tính đến ngày có số liệu gần nhất, chưa ai không đạt ${N} ngày làm việc liền.`)));return out;}
  out.append(h("div",{class:"alert-grid"},list.map(x=>{const sev=x.n>=N+2;const gap=x.target?((x.target-x.avg)/x.target*100):null;
    return h("div",{class:"panel alert-card"+(sev?" sev":"")},
      h("div",{class:"row"},avatar(x.name),h("div",{class:"ac-name"},h("strong",{},x.name),x.prob?h("span",{class:"tag"},"thử việc"):null),
        h("span",{class:"spacer"}),h("span",{class:"chip "+(sev?"bad":"warn")},sev?"Nghiêm trọng":"Cần chú ý")),
      h("div",{class:"ac-big"},h("span",{class:"ac-n"},String(x.n)),h("span",{},"ngày làm việc liền không đạt")),
      h("div",{class:"small muted"},`Từ ${x.from.slice(0,4)===x.to.slice(0,4)?fmtDM(x.from):fmtFull(x.from)} đến ${fmtFull(x.to)}. KPI TB ${fmt(x.avg)}`+(x.target!=null?` so với mốc ${fmt(x.target)}`+(gap>0?`, thiếu ${fmt(gap,0)}%`:""):"")+"."),
      h("div",{class:"dots"},x.recent.map(({d,r})=>h("span",{class:"dt "+(r.pass===true?"ok":r.pass===false?"bad":"none"),title:`${fmtDM(d)}: ${fmt(r.total)}`+(r.target!=null?` / ${fmt(r.target)}`:"")}))),
      h("div",{class:"small faint"},"10 ngày làm việc gần nhất, từ cũ đến mới"),
      h("div",{class:"row"},h("button",{class:"ghost",type:"button",onclick:()=>{S.cmp.emp=x.k;go("sosanh");}},"Xem diễn biến"),
        h("button",{class:"ghost",type:"button",onclick:()=>{S.nhapMode="tay";openEntry(x.to,true);go("nhap");}},"Mở ngày "+fmtDM(x.to))));})));
  return out;}

/* ---------- thêm (điện thoại) ---------- */
function viewMore(){return h("div",{class:"stack"},
  h("div",{class:"more-grid"},[["sosanh","So sánh","chart","Theo tuần và theo năm"],["lichsu","Lịch sử ngày","hist","Xem và sửa từng ngày"],["caidat","Cài đặt","sliders","Tên cột, nhân viên, sao lưu"]]
    .map(([k,l,ic,d])=>h("button",{type:"button",class:"panel more-item",onclick:()=>go(k)},icon(ic),h("div",{},h("strong",{},l),h("div",{class:"small muted"},d)),h("span",{class:"spacer"}),h("span",{class:"faint"},"›")))),
  h("div",{class:"panel small muted sync-slot"}));}

/* ---------- week overview ---------- */
function weekRows(){
  const W=S.weeks.get(S.week),pk=prevKey(W),yk=yoyKey(W),m=S.wkMetric;
  const keys=new Map();
  for(const d of W.dates)for(const r of S.days.get(d).rows||[]){if(!keys.has(r.key))keys.set(r.key,{name:r.name,prob:false});if(r.probation)keys.get(r.key).prob=true;}
  const q=fold(S.search);
  let rows=[...keys].map(([k,info])=>{const s=ws(S.week,k);const cur=mv(s,m);
    return {k,name:S.emps.get(k)?.name||info.name,prob:info.prob,s,
      cells:W.dates.map(d=>(S.days.get(d).rows||[]).find(r=>r.key===k)||null),
      val:cur,wow:delta(cur,mv(ws(pk,k),m),m),yoy:delta(cur,mv(ws(yk,k),m),m)};})
    .filter(r=>!q||fold(r.name).includes(q));
  const {key,dir}=S.sort;
  const get=r=>key==="name"?fold(r.name):key==="avg"?r.s.avg:key==="rate"?r.s.rate:key==="total"?r.s.total:key==="wow"?(r.wow&&r.wow.v):(r.yoy&&r.yoy.v);
  rows.sort((a,b)=>{const x=get(a),y=get(b);if(x==null&&y==null)return 0;if(x==null)return 1;if(y==null)return -1;
    if(typeof x==="string")return x.localeCompare(y,"vi")*dir;return (x-y)*dir;});
  return rows;
}
function viewWeek(){
  if(!S.weekKeys.length)return S.status==="ready"||S.status==="local"?emptyState():h("div");
  const W=S.weeks.get(S.week),idx=S.weekKeys.indexOf(S.week),pk=prevKey(W),yk=yoyKey(W),m=S.wkMetric;
  const T=ws(S.week),TP=ws(pk),TY=ws(yk);
  const out=h("div",{class:"stack"});

  const sel=h("select",{"aria-label":"Chọn tuần",onchange:e=>{S.week=e.target.value;S.flash=null;render();}},weekOptions());sel.value=S.week;
  const jump=h("input",{type:"date","aria-label":"Tìm tuần theo ngày",onchange:e=>{const v=e.target.value;if(!v)return;const k=isoWeek(v).key;
    if(S.weeks.has(k)){S.week=k;S.flash=null;}else S.flash="Chưa có số liệu cho tuần chứa ngày "+fmtFull(v)+".";render();}});
  out.append(h("div",{class:"weekbar"},
    h("button",{class:"ghost icon",type:"button","aria-label":"Tuần trước",disabled:idx<=0,onclick:()=>{S.week=S.weekKeys[idx-1];render();}},"‹"),
    sel,
    h("button",{class:"ghost icon",type:"button","aria-label":"Tuần sau",disabled:idx>=S.weekKeys.length-1,onclick:()=>{S.week=S.weekKeys[idx+1];render();}},"›"),
    h("label",{class:"row small muted",style:"gap:6px"},"Tìm tuần theo ngày",jump),
    h("span",{class:"spacer"}),
    h("button",{class:"ghost",type:"button",onclick:exportWeekCsv},"Tải bảng CSV")));
  if(S.flash)out.append(h("p",{class:"banner"},S.flash));

  // hero: tiles + notes
  const staff=new Set(),prob=new Set();
  for(const d of W.dates)for(const r of S.days.get(d).rows||[]){staff.add(r.key);if(r.probation)prob.add(r.key);}
  const yLab="cùng kỳ "+(W.year-1);
  const cmp=(cur,p,y,mm)=>h("div",{class:"cmp"},h("span",{},deltaEl(delta(cur,p,mm))," tuần trước"),h("span",{},deltaEl(delta(cur,y,mm))," "+yLab));
  const rate=mv(T,"rate");
  const tiles=h("div",{class:"tiles"},
    h("div",{class:"tile"},h("div",{class:"lab"},"Tỷ lệ đạt"),h("div",{class:"val"},fmtM(rate,"rate")),
      h("div",{class:"meter"},h("span",{style:`width:${rate==null?0:Math.min(100,rate)}%`})),h("div",{class:"sub"},`${T.pass}/${T.days} lượt đạt`),cmp(rate,mv(TP,"rate"),mv(TY,"rate"),"rate")),
    h("div",{class:"tile"},h("div",{class:"lab"},"KPI trung bình mỗi ngày"),h("div",{class:"val"},fmt(T.avg)),
      h("div",{class:"sub"},T.target!=null?"Mốc trung bình "+fmt(T.target):"\u00a0"),cmp(T.avg,TP.avg,TY.avg,"avg")),
    h("div",{class:"tile"},h("div",{class:"lab"},"Tổng KPI"),h("div",{class:"val"},fmt(T.total,0)),h("div",{class:"sub"},`${W.dates.length} ngày có số liệu`),cmp(T.total,mv(TP,"total"),mv(TY,"total"),"total")),
    h("div",{class:"tile"},h("div",{class:"lab"},"Nhân sự"),h("div",{class:"val"},String(staff.size)),h("div",{class:"sub"},(prob.size?prob.size+" thử việc, ":"")+T.offs+" lượt nghỉ")));
  const left=h("div",{class:"panel"},
    h("div",{class:"week-title"},h("h2",{},`${weekLabel(W)}`),h("span",{class:"muted"},weekRange(W)+"/"+W.year),
      W.sheets.size?h("span",{class:"chip info"},"Tab "+[...W.sheets].join(", ")):null),tiles);
  out.append(h("div",{class:"hero"},left,notesPanel(W)));

  // table
  const tablePanel=h("div",{class:"panel"});
  tablePanel.append(h("div",{class:"panel-head"},h("h3",{},"Chi tiết từng người"),
    h("div",{class:"row"},
      h("input",{type:"search",placeholder:"Tìm nhân viên…","aria-label":"Tìm nhân viên",value:S.search,oninput:e=>{S.search=e.target.value;fillWeek();}}),
      seg(METRICS,m,k=>{S.wkMetric=k;render();},"Chỉ số so sánh"))));
  tablePanel.append(h("div",{class:"scroll",id:"wk-table"}));
  tablePanel.append(h("div",{class:"legend",style:"margin-top:12px"},h("span",{class:"chip ok"},"Đạt"),h("span",{class:"chip bad"},"Không đạt"),h("span",{class:"chip off"},"Nghỉ"),
    h("span",{class:"small faint",style:"align-self:center"},"Rê chuột vào ô để xem từng cột. Bấm tên để xem so sánh.")));
  out.append(tablePanel);

  const trendBox=h("div",{class:"chartbox",style:"height:300px"},h("canvas",{"aria-label":"Xu hướng của nhóm qua các tuần"}));
  out.append(h("div",{class:"charts"},
    h("div",{class:"panel"},h("div",{class:"panel-head"},h("h3",{id:"wk-bar-title"},"")),h("div",{class:"chartbox",id:"wk-bar"})),
    h("div",{class:"panel"},h("div",{class:"panel-head"},h("h3",{},"Cả nhóm qua 12 tuần"),h("span",{class:"small muted"},"Cột: KPI TB/ngày, đường: tỷ lệ đạt")),trendBox)));

  S.after.push(()=>{fillWeek();
    const keys=S.weekKeys.slice(Math.max(0,idx-11),idx+1);
    const c=mkChart(trendBox.querySelector("canvas"),{data:{labels:keys.map(k=>{const X=S.weeks.get(k);return `T${X.week}/${String(X.year).slice(2)}`;}),
      datasets:[{type:"bar",label:"KPI TB/ngày",data:keys.map(k=>ws(k).avg),backgroundColor:keys.map(k=>k===S.week?cv("--brand"):cv("--brand-soft")),hoverBackgroundColor:cv("--brand"),yAxisID:"y",borderRadius:6,maxBarThickness:42},
        {type:"line",label:"Tỷ lệ đạt (%)",data:keys.map(k=>mv(ws(k),"rate")),borderColor:cv("--ok"),backgroundColor:cv("--ok"),yAxisID:"y1",tension:.3,pointRadius:3.5,borderWidth:2.5}]},
      options:{responsive:true,maintainAspectRatio:false,interaction:{mode:"index",intersect:false},
        plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>" "+ctx.dataset.label+": "+(ctx.dataset.yAxisID==="y1"?fmt(ctx.parsed.y,0)+"%":fmt(ctx.parsed.y))}}},
        scales:{x:{grid:{display:false}},y:{beginAtZero:true,border:{display:false}},y1:{position:"right",min:0,max:100,grid:{drawOnChartArea:false},border:{display:false},ticks:{callback:v=>v+"%"}}}}});
    if(c)S.charts.push(c);});
  return out;
}
function notesPanel(W){
  const T=ws(W.key),TP=ws(prevKey(W));
  const [vt,vc]=verdict(T.rate);
  const people=[];const seen=new Set();
  for(const d of W.dates)for(const r of S.days.get(d).rows||[]){if(seen.has(r.key))continue;seen.add(r.key);const s=ws(W.key,r.key);if(s.days)people.push({k:r.key,name:S.emps.get(r.key)?.name||r.name,s});}
  const good=people.filter(p=>p.s.rate===1).sort((a,b)=>(b.s.avg||0)-(a.s.avg||0)).slice(0,6);
  const weak=people.filter(p=>p.s.rate<0.5).sort((a,b)=>(a.s.rate-b.s.rate)||((a.s.avg||0)-(b.s.avg||0))).slice(0,5);
  const dRate=delta(mv(T,"rate"),mv(TP,"rate"),"rate");
  const line=dRate?(dRate.v>0.05?`Tỷ lệ đạt tăng ${fmt(dRate.v,0)} điểm so với tuần trước.`:dRate.v<-0.05?`Tỷ lệ đạt giảm ${fmt(-dRate.v,0)} điểm so với tuần trước.`:"Tỷ lệ đạt giữ nguyên so với tuần trước."):"Chưa có tuần trước để so sánh.";
  const li=p=>h("li",{},h("button",{class:"linkish who",type:"button",onclick:()=>{S.cmp.emp=p.k;go("sosanh");}},avatar(p.name),h("span",{class:"nm"},p.name)),h("span",{class:"spacer"}),
    h("span",{class:"small muted"},`${p.s.pass}/${p.s.days} đạt, TB ${fmt(p.s.avg)}`));
  return h("div",{class:"panel notes"},
    h("h3",{},"📌 Nhận xét tuần"),
    h("div",{class:"verdict"},h("span",{class:"chip "+vc,style:"font-size:15px;padding:4px 12px"},vt),h("span",{class:"small muted",style:"margin-left:10px;font-weight:400"},`${fmtM(mv(T,"rate"),"rate")} lượt đạt`)),
    h("p",{class:"small muted"},line),
    h("div",{class:"grp",style:"margin-top:14px"},h("div",{class:"grp-t"},"Đạt mọi ngày đã làm"),good.length?h("ul",{},good.map(li)):h("p",{class:"small faint",style:"margin-top:6px"},"Chưa có ai đạt trọn tuần.")),
    weak.length?h("div",{class:"grp"},h("div",{class:"grp-t"},"Cần hỗ trợ thêm (đạt dưới một nửa số ngày)"),h("ul",{},weak.map(li))):null);
}
function fillWeek(){
  const host=document.getElementById("wk-table");if(!host)return;
  const W=S.weeks.get(S.week),m=S.wkMetric,rows=weekRows(),L=S.settings.labels;
  const sortBtn=(key,label)=>h("button",{class:"sort",type:"button","data-on":S.sort.key===key?"":null,onclick:()=>{if(S.sort.key===key)S.sort.dir*=-1;else{S.sort={key,dir:key==="name"?1:-1};}fillWeek();}},
    label+(S.sort.key===key?(S.sort.dir>0?" ↑":" ↓"):""));
  const mLab=METRICS.find(x=>x[0]===m)[1];
  const head=h("tr",{},h("th",{class:"l"},sortBtn("name","Nhân viên")),
    W.dates.map(d=>h("th",{class:"c"},`${WD[dow(d)]} ${fmtDM(d)}`)),
    h("th",{},sortBtn("total","Tổng")),h("th",{},sortBtn("avg","TB/ngày")),h("th",{},sortBtn("rate","Đạt")),
    h("th",{title:mLab},sortBtn("wow","So tuần trước")),h("th",{title:mLab},sortBtn("yoy","So cùng kỳ "+(W.year-1))));
  const body=rows.map(r=>h("tr",{},
    h("td",{class:"l"},h("button",{class:"linkish",type:"button",title:"Xem so sánh của nhân viên này",onclick:()=>{S.cmp.emp=r.k;go("sosanh");}},who(r.name,r.prob))),
    r.cells.map(c=>{if(!c)return h("td",{class:"c"},h("span",{class:"chip none"},"·"));
      if(c.off)return h("td",{class:"c"},h("span",{class:"chip off"},"Nghỉ"));
      const parts=activeCols().map(col=>c.v&&c.v[col.slot]!=null?`${col.name}: ${fmt(c.v[col.slot])}`:null).filter(Boolean);
      if(c.target!=null)parts.push("Mốc: "+fmt(c.target));
      return h("td",{class:"c",title:parts.join("\n")},h("span",{class:"chip "+(c.pass===true?"ok":c.pass===false?"bad":"none")},fmt(c.total,1)));}),
    h("td",{},fmt(r.s.total,0)),h("td",{},h("strong",{},fmt(r.s.avg))),h("td",{},r.s.days?`${r.s.pass}/${r.s.days}`:"—"),
    h("td",{},deltaEl(r.wow)),h("td",{},deltaEl(r.yoy))));
  host.replaceChildren(rows.length?h("table",{class:"grid"},h("thead",{},head),h("tbody",{},body)):h("p",{class:"muted",style:"padding:12px 0"},"Không có nhân viên nào khớp với “"+S.search+"”."));

  const box=document.getElementById("wk-bar"),title=document.getElementById("wk-bar-title");if(!box)return;
  title.textContent=mLab+" theo nhân viên";
  if(S.barChart){S.barChart.destroy();S.barChart=null;}
  const list=rows.filter(r=>r.val!=null);
  box.style.height=Math.max(180,list.length*32+50)+"px";
  box.replaceChildren(h("canvas",{"aria-label":mLab+" theo nhân viên"}));
  const ok=cv("--ok"),bad=cv("--bad"),brand=cv("--brand");
  const ds=[{type:"bar",label:mLab,data:list.map(r=>r.val),borderRadius:6,maxBarThickness:22,
    backgroundColor:list.map(r=>m==="avg"&&r.s.target!=null?(r.s.avg>=r.s.target?ok:bad):brand)}];
  if(m==="avg")ds.push({type:"line",label:"Mốc TB",data:list.map(r=>r.s.target),showLine:false,pointStyle:"line",pointRadius:12,pointRotation:90,borderWidth:3,borderColor:cv("--ink"),backgroundColor:cv("--ink")});
  S.barChart=mkChart(box.querySelector("canvas"),{data:{labels:list.map(r=>r.name),datasets:ds},
    options:{indexAxis:"y",responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},
      tooltip:{callbacks:{label:ctx=>" "+ctx.dataset.label+": "+fmtM(ctx.parsed.x,m)}}},
      scales:{x:{beginAtZero:true,max:m==="rate"?100:undefined,border:{display:false},ticks:{callback:v=>m==="rate"?v+"%":v}},y:{grid:{display:false},border:{display:false}}}}});
}
async function exportWeekCsv(){
  const W=S.weeks.get(S.week),rows=weekRows();
  const esc=v=>{const s=v==null?"":String(v);return /[",\n;]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
  const head=["Nhân viên",...W.dates.map(d=>`${WD[dow(d)]} ${fmtDM(d)}`),"Ngày làm","Tổng","TB/ngày","Lượt đạt","So tuần trước","So cùng kỳ năm trước"];
  const lines=[head,...rows.map(r=>[r.name+(r.prob?" (thử việc)":""),...r.cells.map(c=>!c?"":c.off?"Nghỉ":c.total),r.s.days,r.s.total,r.s.avg==null?"":Math.round(r.s.avg*10)/10,r.s.pass,deltaTxt(r.wow),deltaTxt(r.yoy)])];
  const csv="\ufeff"+lines.map(l=>l.map(esc).join(",")).join("\n");
  await saveFile(`KPI_tuan_${W.week}_${W.year}.csv`,csv,"text/csv;charset=utf-8");
}

/* ---------- compare ---------- */
function viewCompare(){
  if(!S.weekKeys.length)return S.status==="ready"||S.status==="local"?emptyState():h("div");
  const emp=S.cmp.emp==="__team"?null:S.cmp.emp,m=S.cmp.metric,L=S.settings.labels;
  const years=[...new Set(S.weekKeys.map(k=>+k.slice(0,4)))].sort();
  const out=h("div",{class:"stack"});
  const names=[...S.emps.values()].sort((a,b)=>a.name.localeCompare(b.name,"vi"));
  const empSel=h("select",{"aria-label":"Nhân viên",onchange:e=>{S.cmp.emp=e.target.value;render();}},
    h("option",{value:"__team"},"Cả nhóm"),names.map(e=>h("option",{value:e.key},e.name+(e.probation?" (thử việc)":""))));empSel.value=S.cmp.emp;
  const yearSel=h("select",{"aria-label":"Năm",onchange:e=>{S.cmp.year=e.target.value==="all"?"all":+e.target.value;render();}},
    h("option",{value:"all"},"Mọi năm"),[...years].reverse().map(y=>h("option",{value:String(y)},"Năm "+y)));yearSel.value=String(S.cmp.year);
  const whoName=emp?S.emps.get(emp).name:"Cả nhóm",mLab=METRICS.find(x=>x[0]===m)[1];
  out.append(h("div",{class:"panel"},h("div",{class:"row"},
    emp?avatar(whoName):h("span",{class:"logo",style:"width:30px;height:30px;font-size:10px;border-radius:8px"},"ALL"),
    h("h2",{style:"font-size:21px"},whoName),h("span",{class:"spacer"}),empSel,yearSel,seg(METRICS,m,k=>{S.cmp.metric=k;render();},"Chỉ số"))));

  const keys=S.weekKeys.filter(k=>S.cmp.year==="all"||k.startsWith(S.cmp.year+"-")).filter(k=>ws(k,emp).days||ws(k,emp).offs);
  const lineBox=h("div",{class:"chartbox",style:"height:300px"},h("canvas",{"aria-label":mLab+" theo tuần"}));
  const yoyBox=h("div",{class:"chartbox",style:"height:300px"},h("canvas",{"aria-label":mLab+" theo năm"}));
  out.append(h("div",{class:"charts"},
    h("div",{class:"panel"},h("div",{class:"panel-head"},h("h3",{},mLab+" từng tuần")),lineBox),
    h("div",{class:"panel"},h("div",{class:"panel-head"},h("h3",{},"Cùng tuần, khác năm"),h("span",{class:"small muted"},"Mỗi đường là một năm")),yoyBox)));

  const wrows=[...keys].reverse().map(k=>{const W=S.weeks.get(k),s=ws(k,emp),cur=mv(s,m);
    return h("tr",{},h("td",{class:"l"},h("button",{class:"linkish",type:"button",onclick:()=>{S.week=k;go("tuan");}},h("strong",{},weekLabel(W))),h("span",{class:"muted small"}," "+weekRange(W))),
      h("td",{},String(s.days)),h("td",{},h("strong",{},fmtM(cur,m))),h("td",{},deltaEl(delta(cur,mv(ws(prevKey(W),emp),m),m))),h("td",{},deltaEl(delta(cur,mv(ws(yoyKey(W),emp),m),m))));});
  const yrows=years.map((y,i)=>{const s=ys(y,emp),cur=mv(s,m),p=i>0?mv(ys(years[i-1],emp),m):null;
    return h("tr",{},h("td",{class:"l"},h("strong",{},"Năm "+y)),h("td",{},String(s.days)),h("td",{},fmt(s.total,0)),h("td",{},fmt(s.avg)),h("td",{},fmtM(mv(s,"rate"),"rate")),h("td",{},i>0?deltaEl(delta(cur,p,m)):h("span",{class:"delta none"},"—")));});
  out.append(h("div",{class:"charts"},
    h("div",{class:"panel"},h("div",{class:"panel-head"},h("h3",{},"Tăng giảm theo tuần")),h("div",{class:"scroll",style:"max-height:440px;overflow-y:auto"},
      h("table",{},h("thead",{},h("tr",{},h("th",{class:"l"},"Tuần"),h("th",{},"Ngày làm"),h("th",{},mLab),h("th",{},"So tuần trước"),h("th",{},"So cùng kỳ"))),h("tbody",{},wrows)))),
    h("div",{class:"panel"},h("div",{class:"panel-head"},h("h3",{},"Tăng giảm theo năm")),h("div",{class:"scroll"},
      h("table",{},h("thead",{},h("tr",{},h("th",{class:"l"},"Năm"),h("th",{},"Ngày làm"),h("th",{},"Tổng"),h("th",{},"TB/ngày"),h("th",{},"Tỷ lệ đạt"),h("th",{},"So năm trước"))),h("tbody",{},yrows))),
      h("p",{class:"hint",style:"margin-top:12px"},"Cột “So năm trước” tính theo chỉ số đang chọn. Năm đang chạy chưa đủ tuần, nên so bằng KPI TB/ngày hoặc tỷ lệ đạt sẽ công bằng hơn so bằng tổng."))));

  let stackBox=null;
  if(emp){stackBox=h("div",{class:"chartbox",style:"height:300px"},h("canvas",{"aria-label":"Cơ cấu KPI theo cột"}));
    out.append(h("div",{class:"panel"},h("div",{class:"panel-head"},h("h3",{},"Cơ cấu KPI theo từng cột"),h("span",{class:"small muted"},"Tổng mỗi tuần, đổi tên cột trong Cài đặt")),stackBox));}

  S.after.push(()=>{
    const pal=PALETTE();
    const c1=mkChart(lineBox.querySelector("canvas"),{type:"line",data:{labels:keys.map(k=>{const W=S.weeks.get(k);return S.cmp.year==="all"?`${W.week}/${String(W.year).slice(2)}`:"T"+W.week;}),
      datasets:[{label:mLab,data:keys.map(k=>mv(ws(k,emp),m)),borderColor:pal[0],backgroundColor:pal[0]+"22",fill:true,tension:.3,pointRadius:3.5,borderWidth:2.5,spanGaps:true}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>" "+mLab+": "+fmtM(ctx.parsed.y,m)}}},
        scales:{x:{grid:{display:false}},y:{beginAtZero:true,border:{display:false},max:m==="rate"?100:undefined,ticks:{callback:v=>m==="rate"?v+"%":v}}}}});
    if(c1)S.charts.push(c1);
    const labels=Array.from({length:53},(_,i)=>String(i+1));
    const c2=mkChart(yoyBox.querySelector("canvas"),{type:"line",data:{labels,datasets:years.map((y,i)=>({label:"Năm "+y,
      data:labels.map(w=>{const k=`${y}-W${pad(+w)}`;return S.weeks.has(k)?mv(ws(k,emp),m):null;}),borderColor:pal[i%pal.length],backgroundColor:pal[i%pal.length],tension:.3,pointRadius:2.5,borderWidth:2.5,spanGaps:true}))},
      options:{responsive:true,maintainAspectRatio:false,interaction:{mode:"index",intersect:false},plugins:{legend:{position:"bottom"},tooltip:{callbacks:{title:it=>"Tuần "+it[0].label,label:ctx=>" "+ctx.dataset.label+": "+fmtM(ctx.parsed.y,m)}}},
        scales:{x:{grid:{display:false},title:{display:true,text:"Tuần trong năm"}},y:{beginAtZero:true,border:{display:false},max:m==="rate"?100:undefined,ticks:{callback:v=>m==="rate"?v+"%":v}}}}});
    if(c2)S.charts.push(c2);
    if(stackBox){const c3=mkChart(stackBox.querySelector("canvas"),{type:"bar",data:{labels:keys.map(k=>"T"+S.weeks.get(k).week+(S.cmp.year==="all"?"/"+String(S.weeks.get(k).year).slice(2):"")),
      datasets:activeCols().map((col,i)=>({label:col.name,data:keys.map(k=>ws(k,emp).cols[col.slot]),backgroundColor:pal[i%pal.length],stack:"s",borderRadius:3,maxBarThickness:40}))},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom"}},scales:{x:{stacked:true,grid:{display:false}},y:{stacked:true,beginAtZero:true,border:{display:false}}}}});
      if(c3)S.charts.push(c3);}
  });
  return out;
}

/* ---------- Nhập KPI ---------- */
function viewNhap(){
  const out=h("div",{class:"stack"});
  out.append(h("div",{class:"row"},null,h("span",{class:"spacer"}),
    seg([["tay","Nhập tay"],["tep","Tải tệp Excel"],["dan","Dán từ Sheets"]],S.nhapMode,k=>{S.nhapMode=k;if(k==="tay"&&!S.entry)openEntry(todayISO(),true);render();},"Cách nhập")));
  if(!writable())out.append(h("p",{class:"banner"},"Tài khoản này chỉ có quyền xem. Nhờ chủ sở hữu cấp quyền Contributor trong nút Share để nhập dữ liệu."));
  if(S.importMsg&&S.nhapMode!=="tay")out.append(h("p",{class:"banner info"},S.importMsg));
  if(S.nhapMode==="tay")out.append(viewEntry());
  else if(S.preview)out.append(viewPreview());
  else if(S.mapping)out.append(viewMapping());
  else out.append(S.nhapMode==="tep"?viewFile():viewPaste());
  return out;
}

/* ----- manual entry ----- */
let uid=0;
function blankRow(name="",target=null,j=null){return {id:++uid,name,v:blankV(),target:target??defaultTarget(),j,off:false};}
function rowsFromRoster(){return S.roster.filter(p=>p.active!==false).map(p=>blankRow(p.name+(p.probation?" (thử việc)":""),p.target??null,null));}
function rowsFromLast(before){const prior=[...S.days.keys()].filter(d=>!before||d<before).sort().pop()||[...S.days.keys()].sort().pop();
  if(!prior)return [];return (S.days.get(prior).rows||[]).map(r=>blankRow(r.name+(r.probation?" (thử việc)":""),r.target,null));}
function openEntry(date,silent){
  let rows,source,exists=S.days.has(date);
  const draft=lsGet("kpi-draft:"+date);
  if(draft){try{rows=JSON.parse(draft).map(r=>({...r,id:++uid}));source="draft";}catch(e){rows=null;}}
  if(!rows&&exists){rows=(S.days.get(date).rows||[]).map(r=>({id:++uid,name:r.name+(r.probation?" (thử việc)":""),v:padV(r.v),target:r.target,j:r.j,off:!!r.off}));source="saved";}
  if(!rows){rows=S.roster.length?rowsFromRoster():rowsFromLast(date);source=S.roster.length?"roster":"last";if(!rows.length){rows=[blankRow()];source="blank";}}
  S.entry={date,rows,source,exists,dirty:source==="draft",saving:false,confirmDel:false};
  if(!silent)render();
}
function rowTotal(r){return activeCols().reduce((s,c)=>s+(r.v[c.slot]||0),0);}
function rowFilled(r){return r.off||activeCols().some(c=>r.v[c.slot]!=null);}
function rowPass(r){if(r.off)return false;if(r.target==null||!rowFilled(r))return null;return rowTotal(r)>=r.target;}
let draftTimer=null;
function touch(){const E=S.entry;E.dirty=true;clearTimeout(draftTimer);
  draftTimer=setTimeout(()=>lsSet("kpi-draft:"+E.date,JSON.stringify(E.rows.map(({id,...r})=>r))),350);updateSummary();}
function updateSummary(){const E=S.entry,bar=document.getElementById("e-summary");if(!E||!bar)return;
  const named=E.rows.filter(r=>r.name.trim());const filled=named.filter(rowFilled);
  const ok=filled.filter(r=>rowPass(r)===true).length,bad=filled.filter(r=>rowPass(r)===false&&!r.off).length,off=filled.filter(r=>r.off).length;
  const pct=named.length?filled.length/named.length*100:0;
  bar.replaceChildren(
    h("div",{class:"small"},h("strong",{},`Đã nhập ${filled.length}/${named.length} người`),h("span",{class:"muted"},named.length-filled.length?`, ${named.length-filled.length} người chưa nhập sẽ không được lưu`:"")),
    h("div",{class:"meter"},h("span",{style:`width:${pct}%`})),
    h("div",{class:"legend"},h("span",{class:"chip ok"},ok+" đạt"),h("span",{class:"chip bad"},bad+" không đạt"),h("span",{class:"chip off"},off+" nghỉ"),
      E.dirty?h("span",{class:"chip warn"},"Chưa lưu"):h("span",{class:"chip info"},E.exists?"Đã lưu":"Ngày mới")));}
function viewEntry(){
  if(!S.entry)openEntry(todayISO(),true);
  const E=S.entry,L=S.settings.labels,ro=!writable();
  const out=h("div",{class:"stack"});
  const srcChip={draft:["warn","Đang dùng bản nháp chưa lưu"],saved:["info","Ngày đã có số liệu, đang sửa"],roster:["ok","Ngày mới, danh sách từ Cài đặt"],last:["ok","Ngày mới, danh sách từ ngày gần nhất"],blank:["ok","Ngày mới"]}[E.source];
  const dateIn=h("input",{type:"date","aria-label":"Ngày nhập",value:E.date,onchange:e=>{if(e.target.value)openEntry(e.target.value);}});
  out.append(h("div",{class:"panel datebar"},
    h("button",{class:"ghost icon",type:"button","aria-label":"Ngày trước",onclick:()=>openEntry(addDays(E.date,-1))},"‹"),
    h("div",{class:"dateinfo"},h("div",{class:"dname"},longDate(E.date)),
      h("div",{class:"row",style:"gap:8px;margin-top:4px"},h("span",{class:"small muted"},`${weekLabel(isoWeek(E.date))}`),h("span",{class:"chip "+srcChip[0]},srcChip[1]))),
    h("button",{class:"ghost icon",type:"button","aria-label":"Ngày sau",onclick:()=>openEntry(addDays(E.date,1))},"›"),
    dateIn,
    E.date!==todayISO()?h("button",{class:"ghost",type:"button",onclick:()=>openEntry(todayISO())},"Hôm nay"):null));

  if(!ro)out.append(h("div",{class:"etools"},
    h("button",{class:"ghost",type:"button",onclick:()=>{E.rows.push(blankRow());touch();render();setTimeout(()=>{const ins=document.querySelectorAll(".erow .ename input");ins[ins.length-1]?.focus();},0);}},"＋ Thêm nhân viên"),
    h("button",{class:"ghost",type:"button",onclick:()=>{const r=S.roster.length?rowsFromRoster():rowsFromLast(E.date);if(!r.length){toast("Chưa có danh sách nào để lấy.");return;}E.rows=r;touch();render();}},S.roster.length?"Lấy danh sách từ Cài đặt":"Lấy danh sách ngày gần nhất"),
    E.source==="draft"?h("button",{class:"ghost",type:"button",onclick:()=>{lsDel("kpi-draft:"+E.date);openEntry(E.date);}},"Bỏ bản nháp"):null,
    h("span",{class:"spacer"}),
    h("span",{class:"small faint"},"Nhấn Enter để sang ô kế tiếp. Bản nháp tự giữ trên máy này.")));

  const list=h("div",{class:"elist",style:`--ncol:${activeCols().length}`});
  list.append(h("div",{class:"ehead"},h("div",{},"Nhân viên"),activeCols().map(c=>h("div",{},c.name)),h("div",{},"Tổng"),h("div",{},"Mốc"),h("div",{},"Kết quả"),h("div",{},"Nghỉ"),h("div",{})));
  E.rows.forEach((r,i)=>{
    const tot=h("span",{},rowFilled(r)&&!r.off?fmt(rowTotal(r)):"—");
    const res=h("span",{});const rowEl=h("div",{class:"erow"+(r.off?" is-off":"")});
    const refresh=()=>{tot.textContent=rowFilled(r)&&!r.off?fmt(rowTotal(r)):"—";const p=rowPass(r);res.replaceChildren(resultChip({off:r.off,pass:p}));rowEl.classList.toggle("is-off",r.off);};
    refresh();
    const numIn=(get,set,lab)=>h("input",{type:"number",step:"any",inputmode:"decimal","data-nav":"",enterkeyhint:"next","aria-label":lab+" của "+(r.name||"nhân viên"),disabled:ro,value:get()==null?"":String(get()),
      oninput:e=>{const v=e.target.value.trim();set(v===""?null:Number(v));refresh();touch();}});
    const nameIn=h("input",{type:"text",placeholder:"Tên nhân viên","data-nav":"",enterkeyhint:"next","aria-label":"Tên nhân viên",disabled:ro,value:r.name,
      oninput:e=>{r.name=e.target.value;av.replaceWith(av=avatar(r.name));touch();}});
    let av=avatar(r.name||"?");
    rowEl.append(...[
      h("div",{class:"ename"},av,nameIn),
      activeCols().map(c=>h("label",{class:"ecell"},h("span",{class:"lbl"},c.name),numIn(()=>r.v[c.slot],v=>{r.v[c.slot]=v;},c.name))),
      h("div",{class:"ecell tot"},h("span",{class:"lbl"},"Tổng"),tot),
      h("label",{class:"ecell"},h("span",{class:"lbl"},"Mốc"),numIn(()=>r.target,v=>{r.target=v;},"Mốc KPI")),
      h("div",{class:"ecell res"},h("span",{class:"lbl"},"Kết quả"),res),
      h("div",{class:"ecell offt"},h("span",{class:"lbl"},"\u00a0"),h("label",{class:"toggle"},h("input",{type:"checkbox",role:"switch",disabled:ro,checked:r.off,"aria-label":"Nghỉ",onchange:e=>{r.off=e.target.checked;refresh();touch();}}),"Nghỉ")),
      ro?h("span",{}):h("button",{class:"rm",type:"button","aria-label":"Bỏ dòng "+(r.name||""),title:"Bỏ dòng này",onclick:()=>{E.rows.splice(i,1);touch();render();}},"×")].flat());
    list.append(rowEl);});
  list.addEventListener("keydown",e=>{if(e.key!=="Enter"||!e.target.matches("[data-nav]"))return;e.preventDefault();
    const all=[...list.querySelectorAll("input[data-nav]:not(:disabled)")];const i=all.indexOf(e.target);if(all[i+1]){all[i+1].focus();all[i+1].select?.();}});
  out.append(h("div",{class:"panel"},list));

  if(!ro){
    const bar=h("div",{class:"savebar"},h("div",{class:"progress",id:"e-summary"}),
      E.exists?h("button",{class:"ghost danger",type:"button",onclick:async()=>{if(!E.confirmDel){E.confirmDel=true;render();return;}
        try{await deleteDay(E.date);lsDel("kpi-draft:"+E.date);localRefresh();toast("Đã xóa số liệu ngày "+fmtFull(E.date)+".");openEntry(E.date,true);render();}catch(e){toast(errMsg(e));}}},E.confirmDel?"Bấm lần nữa để xóa":"Xóa ngày"):null,
      h("button",{class:"btn",type:"button",disabled:E.saving,onclick:saveEntry},E.saving?"Đang lưu…":(E.exists?"Cập nhật ":"Lưu ")+"ngày "+fmtDM(E.date)));
    out.append(bar);S.after.push(updateSummary);}
  return out;
}
async function saveEntry(){
  const E=S.entry;
  const rows=E.rows.filter(r=>r.name.trim()&&rowFilled(r)).map(r=>{const {name,key,probation}=cleanName(r.name);const total=r.off?0:rowTotal(r);
    return {name,key,probation,off:!!r.off,v:r.v.map(x=>x==null||!isFinite(x)?null:x),total,target:r.target==null||!isFinite(r.target)?null:r.target,
      pass:rowPass(r),j:r.j==null||!isFinite(r.j)?null:r.j};});
  if(!rows.length){toast("Chưa có ai được nhập số liệu.");return;}
  const keys=new Set();for(const r of rows){if(keys.has(r.key)){toast("Tên “"+r.name+"” bị trùng. Sửa lại rồi lưu.");return;}keys.add(r.key);}
  E.saving=true;render();
  const prev=S.days.get(E.date);
  try{await writeDay(E.date,{date:E.date,sheet:prev?.sheet||"",rows,updatedBy:S.uid||null,updatedAt:new Date().toISOString()});
    clearTimeout(draftTimer);lsDel("kpi-draft:"+E.date);localRefresh();
    toast(`Đã lưu ${rows.length} người cho ngày ${fmtFull(E.date)}.`);S.week=isoWeek(E.date).key;openEntry(E.date,true);render();}
  catch(e){E.saving=false;toast(errMsg(e));render();}
}

/* ----- file / paste import ----- */
// Hai kiểu file đọc được:
//  1) Bảng có dòng tiêu đề: mỗi dòng là 1 người trong 1 ngày (có cột "Ngày", "Nhân viên"...). Người dùng ghép cột.
//  2) Kiểu cũ: tên ở cột A, chỉ số B–F, mỗi ngày một khối (đọc bằng parseGrid).
const HDR={
  date:/^(ngay( lam( viec)?)?|date|thoi gian|ngay thang( nam)?)$/,
  name:/^(ho( va)? ten|ten|ten nhan vien|nhan vien|nv|ho ten nv|name|staff)$/,
  target:/^(moc|moc kpi|chi tieu|kpi muc tieu|muc tieu|target)$/,
  off:/^(nghi|off|vang|nghi phep)$/,
  total:/^(tong|tong kpi|total)$/,
  result:/^(ket qua|danh gia|dat\/khong dat)$/
};
function cellStr(v){return v==null?"":String(v).trim();}
function colLetter(i){let s="";i++;while(i>0){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26);}return s;}
function findHeader(grid){
  for(let r=0;r<Math.min(grid.length,15);r++){const row=grid[r]||[];
    const hasName=row.some(v=>HDR.name.test(fold(cellStr(v))));
    const filled=row.filter(v=>cellStr(v)).length;
    if(hasName&&filled>=3)return {row:r,headers:row.map(v=>cellStr(v))};}
  return null;}
function guessMap(headers){const used=new Set(),m={};
  const take=(field,test)=>{const i=headers.findIndex((x,c)=>!used.has(c)&&x&&test(fold(x)));if(i>=0){m[field]=headers[i];used.add(i);}};
  take("name",f=>HDR.name.test(f));take("date",f=>HDR.date.test(f));
  const cols=activeCols();
  cols.forEach(c=>{const n=fold(c.name);take("c"+c.slot,f=>f===n);});
  cols.forEach(c=>{if(!m["c"+c.slot]){const n=fold(c.name);take("c"+c.slot,f=>f.length>=3&&(f.includes(n)||n.includes(f)));}});
  take("target",f=>HDR.target.test(f));take("off",f=>HDR.off.test(f));take("total",f=>HDR.total.test(f));take("result",f=>HDR.result.test(f));
  return m;}
function toDate(v,year){if(v==null||v==="")return null;
  if(typeof v==="number"){if(v>20000&&v<80000&&window.XLSX){const d=XLSX.SSF.parse_date_code(v);return d?mkDate(d.d,d.m,d.y):null;}return null;}
  const s=String(v).trim();const m=s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);if(m)return mkDate(+m[3],+m[2],+m[1]);
  return parseDateText(s.replace(/\s.*$/,""),year);}
function flatItems(sheets,map,opt){
  const byDate=new Map();let skipped=0,noDate=0,dup=0,rowsN=0;const cols=activeCols();
  for(const sh of sheets){const H=sh.hdr.headers;
    const idx=f=>{const t=map[f];if(!t)return -1;return H.findIndex(x=>fold(x)===fold(t));};
    const ci={name:idx("name"),date:idx("date"),target:idx("target"),off:idx("off"),total:idx("total"),result:idx("result")};
    const cc=cols.map(c=>({slot:c.slot,i:idx("c"+c.slot)}));const anyCol=cc.some(x=>x.i>=0);
    if(ci.name<0)continue;
    for(let r=sh.hdr.row+1;r<sh.grid.length;r++){const row=sh.grid[r]||[];
      const rawName=cellStr(row[ci.name]);if(!rawName)continue;
      const fn=fold(rawName);if(HDR.name.test(fn)||/^(tong|total|trung binh)/.test(fn))continue;
      let date=ci.date>=0?toDate(row[ci.date],opt.year):null;if(!date)date=opt.fallback||null;if(!date){noDate++;continue;}
      const v=blankV();let offTxt=false;
      cc.forEach(({slot,i})=>{if(i<0)return;if(/^(off|nghi)$/.test(fold(cellStr(row[i]))))offTxt=true;v[slot]=num(row[i]);});
      const off=offTxt||(ci.off>=0&&/^(x|co|nghi|off|1|true|v|✓|✔)$/.test(fold(cellStr(row[ci.off]))));
      const {name,key,probation}=cleanName(rawName);
      let total=anyCol?cc.reduce((s,{slot})=>s+(v[slot]||0),0):(ci.total>=0?num(row[ci.total]):null);
      const hasVal=anyCol?cc.some(({slot,i})=>i>=0&&v[slot]!=null):total!=null;
      if(!hasVal&&!off){skipped++;continue;}
      if(total==null)total=0;
      let target=ci.target>=0?num(row[ci.target]):null;
      if(target==null){const rp=S.roster.find(p=>fold(p.name)===key);target=rp&&rp.target!=null?rp.target:defaultTarget();}
      const res=ci.result>=0?fold(cellStr(row[ci.result])):"";
      const pass=off?false:(target!=null?total>=target:(/(khong|chua) dat/.test(res)?false:(/^dat/.test(res)?true:null)));
      if(!byDate.has(date))byDate.set(date,{sheet:sh.name,rows:new Map()});
      const day=byDate.get(date);if(day.rows.has(key))dup++;else rowsN++;
      day.rows.set(key,{name,key,probation,off,v,total:off?0:total,target,pass,j:null});}}
  const items=[...byDate].sort((a,b)=>a[0]<b[0]?-1:1).map(([date,d])=>({sheet:d.sheet,date,how:"flat",rows:[...d.rows.values()],include:true,dupe:false}));
  return {items,skipped,noDate,dup,rowsN};}
function startImport(flat,blocks,source,fallback){
  if(!flat.length&&!blocks.length){toast("Không nhận ra dữ liệu nào. Xem lại cách sắp xếp file trong phần hướng dẫn.");return;}
  S.importMsg="";
  if(flat.length){const headers=[];flat.forEach(s=>s.hdr.headers.forEach(x=>{if(x&&!headers.includes(x))headers.push(x);}));
    const map=guessMap(flat[0].hdr.headers);
    let saved={};try{saved=JSON.parse(lsGet("kpi:map")||"{}")||{};}catch(e){}
    for(const [k,t] of Object.entries(saved))if(t&&headers.includes(t))map[k]=t;
    S.mapping={flat,blocks,source,fallback,headers,map};render();return;}
  const items=blocksToItems(blocks);items.forEach((it,i)=>it.id=i);
  S.preview={items,source,saving:false,progress:""};render();}
function viewMapping(){
  const M=S.mapping,cols=activeCols();
  const fields=[["date","Ngày","Ví dụ 28/10/2026"],["name","Nhân viên","Bắt buộc"],
    ...cols.map(c=>["c"+c.slot,c.name,"Cột chỉ số"]),
    ["target","Mốc","Bỏ trống thì dùng mốc riêng hoặc mốc mặc định"],["off","Nghỉ","Ô có x, nghỉ hoặc off"],
    ["total","Tổng","Chỉ dùng khi không ghép cột chỉ số nào"],["result","Kết quả","Chỉ dùng khi không có mốc"]];
  const out=h("div",{class:"stack-s"});
  out.append(h("p",{},h("strong",{},`Đã nhận ra bảng có dòng tiêu đề trong ${M.source}. `),
    h("span",{class:"muted"},`Mỗi mục bên trái lấy số liệu từ cột nào trong file? Trang đã đoán sẵn, cậu chỉnh lại nếu chưa đúng.`)));
  const grid=h("div",{class:"panel mapgrid"});
  fields.forEach(([k,l,hint])=>{
    const sel=h("select",{"aria-label":"Cột trong file cho "+l,onchange:e=>{M.map[k]=e.target.value||undefined;render();}},
      h("option",{value:""},"(bỏ qua)"),M.headers.map(x=>h("option",{value:x},x)));
    sel.value=M.map[k]||"";
    grid.append(h("div",{class:"maprow"+(k==="name"&&!M.map.name?" need":"")+(M.map[k]?" on":"")},
      h("div",{class:"map-l"},h("strong",{},l),h("span",{class:"small faint"},hint)),h("span",{class:"map-arrow","aria-hidden":"true"},"←"),sel));});
  out.append(grid);
  const yearSel=h("select",{"aria-label":"Năm",onchange:e=>{S.importYear=+e.target.value;render();}},
    Array.from({length:6},(_,i)=>thisYear-4+i).reverse().map(y=>h("option",{value:String(y)},String(y))));yearSel.value=String(S.importYear);
  out.append(h("div",{class:"row"},h("label",{class:"field"},"Năm, nếu cột Ngày chỉ ghi ngày/tháng",yearSel),
    h("label",{class:"field"},"Ngày cho dòng không ghi ngày",h("input",{type:"date",value:M.fallback||"",onchange:e=>{M.fallback=e.target.value||null;render();}}))));
  let res=null;
  if(!M.map.name)out.append(h("p",{class:"banner"},"Chọn cột chứa tên nhân viên để tiếp tục."));
  else{res=flatItems(M.flat,M.map,{year:S.importYear,fallback:M.fallback});
    const warn=[];if(res.noDate)warn.push(`${res.noDate} dòng không có ngày (chọn cột Ngày, hoặc điền “Ngày cho dòng không ghi ngày”)`);
    if(res.skipped)warn.push(`${res.skipped} dòng chưa có số liệu sẽ bỏ qua`);if(res.dup)warn.push(`${res.dup} dòng bị trùng người trong cùng ngày, lấy dòng sau cùng`);
    out.append(h("p",{},h("strong",{},`Đọc được ${res.rowsN} dòng, thuộc ${res.items.length} ngày.`),warn.length?h("span",{class:"muted"}," "+warn.join(". ")+"."):null));
    const first=res.items[0];
    if(first)out.append(h("div",{class:"panel"},h("div",{class:"panel-head"},h("h3",{},"Xem thử "+longDate(first.date)),h("span",{class:"small muted"},"5 dòng đầu")),
      h("div",{class:"scroll"},h("table",{},h("thead",{},h("tr",{},h("th",{class:"l"},"Nhân viên"),cols.map(c=>h("th",{},c.name)),h("th",{},"Tổng"),h("th",{},"Mốc"),h("th",{class:"c"},"Kết quả"))),
        h("tbody",{},first.rows.slice(0,5).map(r=>h("tr",{},h("td",{class:"l"},who(r.name,r.probation)),cols.map(c=>h("td",{},r.off?"":fmt(r.v[c.slot]))),
          h("td",{},r.off?"":fmt(r.total)),h("td",{},fmt(r.target)),h("td",{class:"c"},resultChip(r)))))))));}
  if(M.blocks.length)out.append(h("p",{class:"small muted"},`Kèm theo ${M.blocks.length} khối ngày kiểu cũ ở các trang tính khác, sẽ được gộp vào bước sau.`));
  out.append(h("div",{class:"savebar"},h("span",{class:"spacer"}),
    h("button",{class:"ghost",type:"button",onclick:()=>{S.mapping=null;render();}},"Hủy"),
    h("button",{class:"btn",type:"button",disabled:!res||!res.items.length,onclick:()=>{
      lsSet("kpi:map",JSON.stringify(M.map));
      const items=[...res.items,...blocksToItems(M.blocks)];items.forEach((it,i)=>it.id=i);refreshDupes(items);
      S.preview={items,source:M.source,saving:false,progress:""};S.mapping=null;render();}},"Tiếp tục kiểm tra ›")));
  return out;}
function downloadTemplate(){
  if(!window.XLSX){toast("Không tải được thư viện Excel. Kiểm tra mạng rồi tải lại trang.");return;}
  const cols=activeCols(),dt=defaultTarget();
  const head=["Ngày","Nhân viên",...cols.map(c=>c.name),"Mốc","Nghỉ"];
  let people=S.roster.length?S.roster.map(p=>[p.name+(p.probation?" (thử việc)":""),p.target??dt]):[...S.emps.values()].map(e=>[e.name,dt]);
  if(!people.length)people=[["Nguyễn Văn A",dt],["Trần Thị B",dt]];
  const d=fmtFull(todayISO());
  const ws=XLSX.utils.aoa_to_sheet([head,...people.slice(0,40).map(([n,t])=>[d,n,...cols.map(()=>null),t??null,null])]);
  ws["!cols"]=[{wch:12},{wch:28},...cols.map(()=>({wch:13})),{wch:8},{wch:7}];
  const guide=XLSX.utils.aoa_to_sheet([["Cách điền file này"],
    ["1. Mỗi dòng là 1 người trong 1 ngày. Nhiều ngày ghi chung một trang, mỗi dòng ghi đúng ngày của nó."],
    ["2. Cột Ngày ghi dạng ngày/tháng/năm, ví dụ 28/10/2026."],
    ["3. Các cột chỉ số ghi số. Bỏ trống nếu không có."],
    ["4. Cột Mốc có thể bỏ trống, web sẽ dùng mốc riêng của từng người hoặc mốc mặc định."],
    ["5. Cột Nghỉ ghi x nếu người đó nghỉ, để trống nếu đi làm."],
    ["6. Được đổi thứ tự cột hoặc thêm cột khác. Khi tải lên, web cho chọn lại cột nào là gì."],
    ["7. Đừng xóa hoặc đổi chữ ở dòng tiêu đề (dòng 1)."]]);
  guide["!cols"]=[{wch:100}];
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"KPI");XLSX.utils.book_append_sheet(wb,guide,"Hướng dẫn");
  saveFile("Mau_nhap_KPI.xlsx",XLSX.write(wb,{bookType:"xlsx",type:"array"}),"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");}
function fmtExample(cols){
  const c3=cols.slice(0,3),more=cols.length>3;
  const row=(d,n,vals,off)=>[d,n,...vals.slice(0,c3.length),...(more?["…"]:[]),"60",off];
  const head=["Ngày","Nhân viên",...c3.map(c=>c.name),...(more?["…"]:[]),"Mốc","Nghỉ"];
  const rows=[row("28/10/2026","Nguyễn Thị Tấm",["12","5","8"],""),row("28/10/2026","Lê Văn Hùng",["","",""],"x"),row("29/10/2026","Nguyễn Thị Tấm",["10","7","9"],"")];
  return h("div",{class:"scroll"},h("table",{class:"fmt-ex"},h("thead",{},h("tr",{},head.map(x=>h("th",{},x)))),h("tbody",{},rows.map(r=>h("tr",{},r.map(x=>h("td",{},x)))))));}
function formatGuide(){
  const cols=activeCols();
  return h("details",{class:"fmt-guide"},h("summary",{},"File cần sắp xếp thế nào để web đọc được?"),
    h("div",{class:"stack-s",style:"margin-top:10px"},
      h("p",{},h("strong",{},"Cách 1 (nên dùng): bảng có dòng tiêu đề."),h("span",{class:"muted"}," Dòng đầu là tên cột, mỗi dòng bên dưới là 1 người trong 1 ngày. Thứ tự cột tùy ý.")),
      fmtExample(cols),
      h("p",{class:"small muted"},"Tên tiêu đề nên trùng tên cột trong Cài đặt để web tự ghép. Nếu khác, web sẽ cho chọn lại. Tải file mẫu để có sẵn đúng các cột."),
      h("p",{},h("strong",{},"Cách 2: kiểu báo cáo cũ."),h("span",{class:"muted"}," Không có dòng tiêu đề. Tên ở cột A, chỉ số ở B–F, tổng ở G, mốc ở H, Đạt/Không đạt ở I. Mỗi ngày là một khối, có dòng ghi ngày như “17/3” hoặc dòng nhận xét “KPI ngày 16/03”."))));}
function viewFile(){
  const yearSel=h("select",{"aria-label":"Năm của dữ liệu",onchange:e=>{S.importYear=+e.target.value;}},
    Array.from({length:6},(_,i)=>thisYear-4+i).reverse().map(y=>h("option",{value:String(y)},String(y))));yearSel.value=String(S.importYear);
  const file=h("input",{type:"file",accept:".xlsx,.xls,.ods,.csv,.tsv","aria-label":"Chọn tệp"});
  return h("div",{class:"panel stack-s"},
    h("div",{class:"panel-head"},h("h3",{},"Tải tệp Excel hoặc Google Sheets"),
      h("button",{class:"ghost",type:"button",onclick:downloadTemplate},"⬇ Tải file mẫu")),
    h("ol",{class:"steps"},h("li",{},"Google Sheets: Tệp → Tải xuống → Microsoft Excel (.xlsx). Excel: lưu thành .xlsx."),
      h("li",{},"Chọn tệp, bấm Đọc tệp. Nếu file có dòng tiêu đề, web sẽ cho kiểm tra cột nào là gì."),h("li",{},"Xem lại từng ngày rồi lưu.")),
    h("div",{class:"row",style:"margin-top:14px"},h("label",{class:"field"},"Năm, nếu file chỉ ghi ngày/tháng",yearSel),h("label",{class:"field"},"Tệp",file),
      h("button",{class:"btn",type:"button",style:"align-self:flex-end",onclick:async()=>{const f=file.files&&file.files[0];if(!f){toast("Chọn tệp trước đã.");return;}await readFile(f);}},"Đọc tệp")),
    formatGuide());
}
function viewPaste(){
  const ta=h("textarea",{placeholder:"Dán các ô đã sao chép từ Google Sheets hoặc Excel vào đây, nên bôi đen cả dòng tiêu đề…","aria-label":"Dữ liệu dán"});
  const pd=h("input",{type:"date","aria-label":"Ngày của dữ liệu dán",value:S.pasteDate||todayISO(),onchange:e=>{S.pasteDate=e.target.value;}});
  return h("div",{class:"panel stack-s"},h("h3",{},"Dán từ Google Sheets hoặc Excel"),
    h("p",{class:"hint"},"Bôi đen vùng dữ liệu, nên lấy cả dòng tiêu đề, sao chép rồi dán vào ô dưới. Có dòng tiêu đề thì web sẽ cho ghép cột. Dòng nào không ghi ngày sẽ dùng ngày bên dưới."),
    ta,h("div",{class:"row"},h("label",{class:"field"},"Ngày",pd),h("button",{class:"btn",type:"button",style:"align-self:flex-end",onclick:()=>readPaste(ta.value,pd.value)},"Đọc đoạn dán")),
    formatGuide());
}
async function readFile(f){
  if(!window.XLSX){toast("Không tải được thư viện đọc Excel. Kiểm tra mạng rồi tải lại trang.");return;}
  try{const buf=await f.arrayBuffer();const isText=/\.(csv|tsv|txt)$/i.test(f.name);
    const wb=isText?XLSX.read(new TextDecoder("utf-8").decode(buf),{type:"string",raw:true}):XLSX.read(buf,{type:"array"});
    const flat=[],blocks=[];
    for(const name of wb.SheetNames){const ws=wb.Sheets[name];const sname=isText?f.name.replace(/\.[^.]+$/,""):name;
      const rawGrid=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:null,blankrows:true});
      const hdr=findHeader(rawGrid);
      if(hdr){flat.push({name:sname,grid:rawGrid,hdr});continue;}
      const grid=XLSX.utils.sheet_to_json(ws,{header:1,raw:false,defval:null,blankrows:true});
      blocks.push(...parseGrid(grid,{sheet:sname,year:S.importYear}));}
    startImport(flat,blocks,f.name,null);
  }catch(e){toast("Không đọc được tệp: "+(e&&e.message||"định dạng lạ")+".");}
}
function readPaste(text,date){
  if(!text.trim()){toast("Dán dữ liệu vào ô trước đã.");return;}
  const grid=text.replace(/\r/g,"").split("\n").map(l=>l.split("\t"));
  const hdr=findHeader(grid);
  if(hdr){startImport([{name:"",grid,hdr}],[],"đoạn dán",date||null);return;}
  const blocks=parseGrid(grid,{sheet:"",year:date?+date.slice(0,4):S.importYear,fallbackDate:date||null});
  startImport([],blocks,"đoạn dán",date||null);
}

function viewPreview(){
  const P=S.preview,L=S.settings.labels;const out=h("div",{class:"stack-s"});
  const ready=P.items.filter(it=>it.include&&it.date);
  const noDate=P.items.filter(it=>it.include&&!it.date).length;
  out.append(h("p",{},h("strong",{},`Tìm thấy ${P.items.length} khối ngày trong ${P.source}. `),h("span",{class:"muted"},"Kiểm tra ngày, bỏ chọn khối không cần, rồi lưu.")));
  const list=h("div",{class:"items"});
  P.items.forEach(it=>{const work=it.rows.filter(r=>!r.off);
    const how={label:["info","ngày từ dòng tiêu đề"],text:["info","ngày từ dòng nhận xét"],paste:["info","ngày đã chọn"],none:["warn","chưa có ngày"],flat:["info","ngày từ cột Ngày"]}[it.how];
    list.append(h("div",{class:"item"+(it.include?"":" skip")},
      h("div",{class:"row"},
        h("label",{class:"toggle"},h("input",{type:"checkbox",role:"switch","aria-label":"Lưu khối này",checked:it.include,onchange:e=>{it.include=e.target.checked;refreshDupes(P.items);render();}})),
        h("input",{type:"date","aria-label":"Ngày",value:it.date,onchange:e=>{it.date=e.target.value;it.how=it.date?(it.how==="none"?"paste":it.how):"none";refreshDupes(P.items);render();}}),
        h("strong",{},it.date?WDL[dow(it.date)]:""),
        h("span",{class:"muted small"},`${it.sheet?"Tab "+it.sheet+", ":""}${it.rows.length} người, ${work.filter(r=>r.pass).length}/${work.length} đạt`),
        h("span",{class:"chip "+how[0]},how[1]),
        it.date&&S.days.has(it.date)?h("span",{class:"chip warn"},"đã có, sẽ thay"):null,
        it.dupe?h("span",{class:"chip bad"},"trùng ngày trong tệp"):null),
      h("details",{},h("summary",{},"Xem các dòng"),h("div",{class:"scroll"},h("table",{},
        h("thead",{},h("tr",{},h("th",{class:"l"},"Nhân viên"),activeCols().map(c=>h("th",{},c.name)),h("th",{},"Tổng"),h("th",{},"Mốc"),h("th",{class:"c"},"Kết quả"))),
        h("tbody",{},it.rows.map(r=>h("tr",{},h("td",{class:"l"},who(r.name,r.probation)),
          activeCols().map(c=>h("td",{},r.off?"":fmt((r.v||[])[c.slot]))),h("td",{},r.off?"":fmt(r.total)),h("td",{},fmt(r.target)),h("td",{class:"c"},resultChip(r))))))))));});
  out.append(list);
  const dupes=P.items.some(it=>it.dupe);
  out.append(h("div",{class:"savebar"},
    h("div",{class:"small",style:"flex:1"},noDate?`${noDate} khối chưa có ngày sẽ không được lưu. `:"",dupes?h("span",{style:"color:var(--warn)"},"Có hai khối cùng một ngày, bỏ chọn một khối để lưu."):null),
    h("button",{class:"ghost",type:"button",disabled:P.saving,onclick:()=>{S.preview=null;render();}},"Hủy"),
    h("button",{class:"btn",type:"button",disabled:!ready.length||P.saving||!writable()||dupes,onclick:saveImport},P.saving?("Đang lưu "+P.progress):`Lưu ${ready.length} ngày`)));
  return out;
}
async function saveImport(){
  const P=S.preview;const items=P.items.filter(it=>it.include&&it.date);
  P.saving=true;let done=0;
  try{if(S.mode==="remote"){P.progress="…";render();
      await writeDays(items.map(it=>({date:it.date,payload:{date:it.date,sheet:it.sheet,rows:it.rows,updatedAt:new Date().toISOString()}})));done=items.length;}
    else for(const it of items){P.progress=`${done+1}/${items.length}…`;render();
      await writeDay(it.date,{date:it.date,sheet:it.sheet,rows:it.rows,updatedBy:S.uid||null,updatedAt:new Date().toISOString()});done++;}
    localRefresh();const last=items.map(i=>i.date).sort().pop();
    S.preview=null;S.importMsg="";if(last)S.week=isoWeek(last).key;S.view="tuan";render();toast(`Đã lưu ${done} ngày.`);
  }catch(e){P.saving=false;localRefresh();toast(errMsg(e)+(done?` Đã lưu được ${done} ngày.`:""));render();}
}

/* ---------- history ---------- */
function viewHistory(){
  const out=h("div",{class:"stack"});
  out.append(h("div",{class:"row"},null,h("span",{class:"spacer"}),
    writable()?h("button",{class:"btn",type:"button",onclick:()=>{S.nhapMode="tay";openEntry(todayISO(),true);go("nhap");}},"＋ Nhập ngày mới"):null));
  if(!S.weekKeys.length){out.append(emptyState());return out;}
  [...S.weekKeys].reverse().forEach((k,i)=>{const W=S.weeks.get(k),T=ws(k);const [vt,vc]=verdict(T.rate);
    const items=[...W.dates].reverse().map(d=>{const doc=S.days.get(d),rs=doc.rows||[],work=rs.filter(r=>!r.off),p=work.filter(r=>r.pass).length;
      return h("li",{},h("span",{class:"d"},`${WD[dow(d)]}, ${fmtFull(d)}`),
        h("span",{class:"chip "+(work.length&&p/work.length>=.6?"ok":work.length&&p/work.length>=.4?"warn":"bad")},`${p}/${work.length} đạt`),
        h("span",{class:"muted small"},`${rs.length} người`+(doc.sheet?`, tab ${doc.sheet}`:"")),
        h("span",{class:"spacer"}),
        h("button",{class:"ghost",type:"button",onclick:()=>{S.nhapMode="tay";openEntry(d,true);go("nhap");}},writable()?"Mở và sửa":"Xem"));});
    out.append(h("details",{class:"week panel",open:i<2?"":null},
      h("summary",{},h("span",{},`${weekLabel(W)}`),h("span",{class:"muted small",style:"font-weight:400"},weekRange(W)),h("span",{class:"spacer"}),h("span",{class:"chip "+vc},`${vt}, ${fmtM(mv(T,"rate"),"rate")}`)),
      h("ul",{class:"daylist"},items)));});
  return out;
}

/* ---------- settings ---------- */
function viewSettings(){
  const ro=!writable();const out=h("div",{class:"stack"});
  
  // roster
  if(!S.rosterEdit)S.rosterEdit=S.roster.map(p=>({...p,id:++uid}));
  const R=S.rosterEdit;
  const rlist=h("div",{class:"roster"});
  R.forEach((p,i)=>rlist.append(h("div",{class:"rrow"},
    h("div",{class:"who"},avatar(p.name||"?"),h("input",{type:"text",placeholder:"Tên nhân viên",disabled:ro,value:p.name,style:"flex:1;min-width:0",oninput:e=>{p.name=e.target.value;}})),
    h("input",{type:"number",step:"any",placeholder:"Mốc","aria-label":"Mốc KPI mặc định",disabled:ro,value:p.target==null?"":String(p.target),style:"width:100%",oninput:e=>{const v=e.target.value.trim();p.target=v===""?null:Number(v);}}),
    h("label",{class:"toggle"},h("input",{type:"checkbox",role:"switch",disabled:ro,checked:p.probation,onchange:e=>{p.probation=e.target.checked;}}),"Thử việc"),
    ro?h("span",{}):h("button",{class:"rm",type:"button","aria-label":"Bỏ "+(p.name||"dòng này"),onclick:()=>{R.splice(i,1);render();}},"×"))));
  out.append(h("div",{class:"panel"},
    h("div",{class:"panel-head"},h("h3",{},"Danh sách nhân viên"),h("span",{class:"small muted"},"Dùng để điền sẵn khi nhập tay một ngày mới")),
    R.length?rlist:h("p",{class:"muted small"},"Chưa có danh sách. Khi trống, ngày mới sẽ lấy danh sách của ngày gần nhất."),
    ro?null:h("div",{class:"row",style:"margin-top:14px"},
      h("button",{class:"ghost",type:"button",onclick:()=>{R.push({id:++uid,name:"",target:null,probation:false,active:true});render();}},"＋ Thêm người"),
      S.days.size?h("button",{class:"ghost",type:"button",onclick:()=>{const last=[...S.days.keys()].sort().pop();S.rosterEdit=(S.days.get(last).rows||[]).map(r=>({id:++uid,name:r.name,target:r.target,probation:!!r.probation,active:true}));render();}},"Lấy từ ngày gần nhất"):null,
      h("span",{class:"spacer"}),
      h("button",{class:"btn",type:"button",onclick:async()=>{
        const people=R.filter(p=>p.name.trim()).map(p=>({name:cleanName(p.name).name,target:p.target==null||!isFinite(p.target)?null:p.target,probation:!!p.probation,active:true}));
        try{await saveRoster(people);S.rosterEdit=null;toast("Đã lưu danh sách nhân viên.");render();}
        catch(e){guard(e);toast(errMsg(e));}}},"Lưu danh sách"))));
  out.append(columnsPanel(ro));
  if(S.mode==="remote")out.append(h("div",{class:"panel"},h("div",{class:"panel-head"},h("h3",{},"Mã nhập liệu"),
    h("span",{class:"small muted"},lsGet("kpi:pin")?"Máy này đã nhớ mã":"Máy này chưa lưu mã")),
    h("p",{class:"hint"},(USE_SB?"Mã do trưởng nhóm đặt trong Supabase.":"Mã do trưởng nhóm đặt trong Google Apps Script.")+" Ai có link đều xem được, nhưng chỉ người có mã mới lưu được số liệu."),
    lsGet("kpi:pin")?h("button",{class:"ghost",type:"button",style:"margin-top:12px",onclick:()=>{lsDel("kpi:pin");toast("Đã quên mã trên máy này.");render();}},"Quên mã trên máy này"):null));
  out.append(backupPanel(ro));
  if(ro)out.append(h("p",{class:"muted small"},"Tài khoản này chỉ có quyền xem."));
  return out;
}

function columnsPanel(ro){
  if(!S.colEdit)S.colEdit={cols:activeCols().map(c=>({...c,id:++uid})),target:defaultTarget(),retired:[...(S.settings.labels._retired||[])]};
  const E=S.colEdit,MAX=maxSlots();
  const freeSlot=()=>{const used=new Set(E.cols.map(c=>c.slot));
    for(let s=0;s<MAX;s++)if(!used.has(s)&&!E.retired.includes(s))return s;
    for(let s=0;s<MAX;s++)if(!used.has(s))return s;return -1;};
  const list=h("div",{class:"collist"});
  E.cols.forEach((c,i)=>list.append(h("div",{class:"colrow"},
    h("span",{class:"col-no"},String(i+1)),
    h("input",{type:"text",value:c.name,placeholder:"Tên cột, ví dụ EasyInvoice",disabled:ro,"aria-label":"Tên cột "+(i+1),oninput:e=>{c.name=e.target.value;}}),
    ro?null:h("div",{class:"col-act"},
      h("button",{class:"ghost icon",type:"button","aria-label":"Đưa lên",title:"Đưa lên",disabled:i===0,onclick:()=>{[E.cols[i-1],E.cols[i]]=[E.cols[i],E.cols[i-1]];render();}},"↑"),
      h("button",{class:"ghost icon",type:"button","aria-label":"Đưa xuống",title:"Đưa xuống",disabled:i===E.cols.length-1,onclick:()=>{[E.cols[i+1],E.cols[i]]=[E.cols[i],E.cols[i+1]];render();}},"↓"),
      h("button",{class:"rm",type:"button","aria-label":"Xóa cột "+c.name,title:"Xóa cột",disabled:E.cols.length<=1,onclick:()=>{E.cols.splice(i,1);if(!E.retired.includes(c.slot))E.retired.push(c.slot);render();}},"×")))));
  const canAdd=!ro&&E.cols.length<MAX&&freeSlot()>=0;
  return h("div",{class:"panel"},
    h("div",{class:"panel-head"},h("h3",{},"Cột chỉ số và mốc KPI"),h("span",{class:"small muted"},`${E.cols.length}/${MAX} cột`)),
    list,
    ro?null:h("div",{class:"row",style:"margin-top:12px"},
      h("button",{class:"ghost",type:"button",disabled:!canAdd,onclick:()=>{const s=freeSlot();if(s<0)return;E.cols.push({slot:s,name:"",id:++uid});render();
        setTimeout(()=>{const ins=document.querySelectorAll(".colrow input");ins[ins.length-1]?.focus();},0);}},"＋ Thêm cột"),
      MAX<NSLOT&&E.cols.length>=MAX?h("span",{class:"small muted"},"Đã đủ 5 cột. Muốn dùng tới 10 cột, chạy file nang_cap_cot.sql trong Supabase."):null),
    h("div",{class:"row",style:"margin-top:18px;padding-top:16px;border-top:1px solid var(--line)"},
      h("label",{class:"field"},"Mốc KPI mặc định",h("input",{type:"number",step:"any",min:"0",inputmode:"decimal",disabled:ro,placeholder:"Ví dụ 60",style:"width:140px;text-align:left",
        value:E.target==null?"":String(E.target),oninput:e=>{const v=e.target.value.trim();E.target=v===""?null:Number(v);}})),
      h("p",{class:"hint",style:"flex:1;min-width:220px;align-self:flex-end"},"Tự điền vào ô Mốc cho người chưa có mốc riêng khi nhập ngày mới. Mốc riêng từng người đặt ở Danh sách nhân viên bên trên.")),
    h("p",{class:"hint",style:"margin-top:12px"},"Tổng = cộng các cột đang hiện. Xóa cột chỉ ẩn cột đó khỏi bảng, số liệu cũ vẫn được giữ và tổng của các ngày đã lưu không đổi. Khi nhập từ Excel, cột B–F trong file được đưa vào 5 cột đầu tiên ban đầu."),
    ro?null:h("div",{class:"row",style:"margin-top:14px"},
      h("button",{class:"ghost",type:"button",onclick:()=>{S.colEdit=null;render();}},"Hoàn tác"),h("span",{class:"spacer"}),
      h("button",{class:"btn",type:"button",onclick:async()=>{
        const cols=E.cols.map(c=>({slot:c.slot,name:c.name.trim()}));
        if(cols.some(c=>!c.name)){toast("Đặt tên cho tất cả các cột trước khi lưu.");return;}
        const seen=new Set();for(const c of cols){const k=fold(c.name);if(seen.has(k)){toast("Tên cột “"+c.name+"” bị trùng.");return;}seen.add(k);}
        if(E.target!=null&&!(isFinite(E.target)&&E.target>=0)){toast("Mốc mặc định phải là một số không âm.");return;}
        const labels={...S.settings.labels,_cols:cols,_target:E.target,_retired:E.retired.filter(s=>!cols.some(c=>c.slot===s))};
        cols.forEach(c=>{if(c.slot<5)labels[COLS[c.slot]]=c.name;});
        try{await saveSettings(labels);S.colEdit=null;S.cache=new Map();toast("Đã lưu cột và mốc mặc định.");render();}
        catch(e){guard(e);toast(errMsg(e));}}},"Lưu cột và mốc")));
}
function backupPanel(ro){
  const file=h("input",{type:"file",accept:".json,application/json","aria-label":"Chọn file sao lưu"});
  return h("div",{class:"panel"},
    h("div",{class:"panel-head"},h("h3",{},"Sao lưu và khôi phục"),h("span",{class:"small muted"},`${S.days.size} ngày đang có`)),
    h("p",{class:"hint"},S.db||S.mode==="remote"?"Tải toàn bộ số liệu về một file .json để cất giữ, hoặc nạp lại từ file đó.":
      "Số liệu đang được lưu trên trình duyệt của máy này. Nên tải file sao lưu định kỳ. Muốn chuyển sang máy khác thì tải file ở đây rồi khôi phục bên máy kia."),
    h("div",{class:"row",style:"margin-top:14px"},
      h("button",{class:"ghost",type:"button",onclick:()=>{
        const data={app:"kpi-ho-tro-nam-dinh",version:1,exportedAt:new Date().toISOString(),days:Object.fromEntries(S.days),settings:{labels:S.settings.labels},roster:{people:S.roster}};
        saveFile(`KPI_sao_luu_${todayISO()}.json`,JSON.stringify(data),"application/json");}},"Tải file sao lưu"),
      ro?null:h("span",{class:"spacer"}),
      ro?null:file,
      ro?null:h("button",{class:"btn",type:"button",onclick:async()=>{
        const f=file.files&&file.files[0];if(!f){toast("Chọn file sao lưu trước đã.");return;}
        let data;try{data=JSON.parse(await f.text());}catch(e){toast("File không đúng định dạng sao lưu.");return;}
        if(!data||typeof data.days!=="object"){toast("File không đúng định dạng sao lưu.");return;}
        const dates=Object.keys(data.days).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&data.days[d]&&Array.isArray(data.days[d].rows));
        try{await writeDays(dates.map(d=>({date:d,payload:data.days[d]})));
          if(data.settings&&data.settings.labels)await saveSettings({...DEFAULT_LABELS,...data.settings.labels});
          if(data.roster&&Array.isArray(data.roster.people))await saveRoster(data.roster.people);
          localRefresh();S.rosterEdit=null;toast(`Đã khôi phục ${dates.length} ngày.`);render();}
        catch(e){toast(errMsg(e));}}},"Khôi phục từ file")));
}

/* ---------- start ---------- */
async function init(){
  const v=(location.hash||"").slice(1);if(VIEWS.some(x=>x[0]===v))S.view=v;
  document.getElementById("cta").addEventListener("click",()=>{S.nhapMode="tay";openEntry(todayISO(),true);go("nhap");});
  if(S.view==="nhap")openEntry(todayISO(),true);
  render();
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change",()=>{if(S.view!=="nhap")render();});
  const C=window.claude;
  S.lsOK=storageOK();
  if((!C||typeof C.use!=="function")&&(USE_SB||API)){S.mode="remote";S.status="loading";renderSync();render();
    try{await loadRemote();S.status="ready";}catch(e){S.status="error";S.err=(e&&e.message)||"lỗi không rõ";}
    if(S.view==="nhap")openEntry(S.entry&&!S.entry.dirty?S.entry.date:todayISO(),true);
    renderSync();render();
    setInterval(()=>{if(!document.hidden)refreshRemote();},USE_SB?30000:60000);
    document.addEventListener("visibilitychange",()=>{if(!document.hidden&&S.lastSync&&Date.now()-S.lastSync>20000)refreshRemote();});
    return;}
  if(!C||typeof C.use!=="function"){S.status="local";loadLocal();if(S.view==="nhap")openEntry(S.entry?S.entry.date:todayISO(),true);render();return;}
  let db=null,user=null,dl=null;
  try{[db,user,dl]=await Promise.all([C.use("db"),C.use("user"),C.use("downloads")]);}catch(e){}
  S.db=db;S.user=user;S.dl=dl;
  if(user){try{S.uid=await user.id();}catch(e){}try{S.canWrite=await user.can("data.write");}catch(e){}}
  if(!db){S.status="local";loadLocal();render();return;}
  S.status="loading";render();
  db.collection("kpi_days").orderBy("date","desc").limit(1000).onSnapshot(snap=>{
    S.days=new Map(snap.docs.filter(d=>d.exists).map(d=>[d.id,d.data()]));S.status="ready";rebuild();softRender();},
    err=>{S.status="error";S.err=(err&&err.message)||"lỗi không rõ";render();});
  db.doc("config/settings").onSnapshot(s=>{const L=s.exists?(s.data().labels||{}):{};S.settings.labels={...DEFAULT_LABELS,...L};softRender();},()=>{});
  db.doc("config/roster").onSnapshot(s=>{S.roster=s.exists?(s.data().people||[]):[];softRender();},()=>{});
}
init();
})();
