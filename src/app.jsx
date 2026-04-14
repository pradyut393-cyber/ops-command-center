import { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";

/* ─── CONSTANTS ──────────────────────────────────────────────────────── */
const SEV = {
  P1: { color: "#ff3d3d", bg: "rgba(255,61,61,0.14)", border: "rgba(255,61,61,0.45)" },
  P2: { color: "#ff9100", bg: "rgba(255,145,0,0.14)", border: "rgba(255,145,0,0.45)" },
  P3: { color: "#ffd60a", bg: "rgba(255,214,10,0.12)", border: "rgba(255,214,10,0.38)" },
  P4: { color: "#00e5ff", bg: "rgba(0,229,255,0.10)", border: "rgba(0,229,255,0.35)" },
};
const STATUS_COLOR = {
  "Open": "#ff3d3d", "In Progress": "#ff9100", "Waiting-Partner": "#c084fc",
  "Waiting-Client": "#60a5fa", "Escalated": "#f43f5e", "RCA Pending": "#ffd60a", "Closed": "#4ade80",
};
const SOURCES   = ["WhatsApp","Email","Call","Client Meeting","Monitoring","Jira","Chat Thread","Verbal"];
const VERTICALS = ["NOC","TPMA","Binge","Content","Partner","App Support"];
const STATUSES  = ["Open","In Progress","Waiting-Partner","Waiting-Client","Escalated","RCA Pending","Closed"];
const SEVERITIES= ["P1","P2","P3","P4"];
const OWNERS    = ["Self","Rahul S","Priya M","Aditya K","Neha R","Vikram T","Sanjay P","TBD"];
const CHART_COLORS = ["#ff3d3d","#ff9100","#ffd60a","#00e5ff","#4ade80","#c084fc","#60a5fa","#f43f5e"];

/* ─── HELPERS ────────────────────────────────────────────────────────── */
const ts = () => new Date().toISOString();
const pad = n => String(n).padStart(2,"0");
const toISO = v => { try { return v ? new Date(v).toISOString() : null; } catch { return null; } };
const fmt = iso => {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${pad(d.getDate())} ${d.toLocaleString("en",{month:"short"})} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fmtDate = iso => {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${pad(d.getDate())} ${d.toLocaleString("en",{month:"short"})}`;
};
const toLocal = iso => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return ""; }
};
const hoursAgo  = iso => iso ? (Date.now()-new Date(iso))/3600000 : 0;
const daysAgo   = iso => hoursAgo(iso)/24;
const isOverdue = iso => !!iso && new Date(iso) < new Date();
const genId     = n => `OPS-${String(n).padStart(4,"0")}`;

/* ─── SAMPLE DATA ────────────────────────────────────────────────────── */
function makeSample() {
  const b = Date.now();
  const h  = n => new Date(b - n*3600000).toISOString();
  const hf = n => new Date(b + n*3600000).toISOString();
  return [
    {id:"OPS-0001",dateOpened:h(2),source:"Monitoring",vertical:"NOC",platform:"Live TV – Ch.201",summary:"Audio dropout on HD feed – 15 min outage observed by NOC",severity:"P1",clientImpact:"10K+ HD channel viewers affected",reportedBy:"NOC Team",owner:"Rahul S",dependencyOwner:"Broadcast Ops",eta:hf(1),nextFollowUp:h(0.5),status:"In Progress",closureDate:null,remarks:"Encoder restart done, monitoring feed quality",lastUpdated:h(1.5)},
    {id:"OPS-0002",dateOpened:h(26),source:"Jira",vertical:"TPMA",platform:"DRM System",summary:"Widevine license failure – all Android devices blocked from premium content",severity:"P1",clientImpact:"All Android premium subscribers unable to play",reportedBy:"Priya M",owner:"Priya M",dependencyOwner:"Google Widevine",eta:hf(2),nextFollowUp:hf(0.5),status:"Waiting-Partner",closureDate:null,remarks:"Escalated to Google – ticket WV-8821 raised",lastUpdated:h(25)},
    {id:"OPS-0003",dateOpened:h(5),source:"WhatsApp",vertical:"Binge",platform:"Binge Platform",summary:"3 Bollywood titles showing incorrect thumbnails on home screen",severity:"P3",clientImpact:"UX degraded – user complaints on Twitter/social",reportedBy:"Content Team",owner:"Aditya K",dependencyOwner:"CMS Team",eta:hf(24),nextFollowUp:hf(2),status:"Open",closureDate:null,remarks:"CMS batch update scheduled tonight",lastUpdated:h(5)},
    {id:"OPS-0004",dateOpened:h(96),source:"Email",vertical:"Partner",platform:"Partner Portal API",summary:"Partner ABC intermittent API timeouts on content ingestion endpoint",severity:"P2",clientImpact:"Content go-live delayed by 2 days – SLA risk",reportedBy:"Partner ABC",owner:"Vikram T",dependencyOwner:"Partner ABC Infra",eta:h(24),nextFollowUp:h(48),status:"Waiting-Partner",closureDate:null,remarks:"Awaiting partner network logs – followed up twice",lastUpdated:h(72)},
    {id:"OPS-0005",dateOpened:h(1),source:"Client Meeting",vertical:"App Support",platform:"App (iOS)",summary:"iOS 17.4 video player crash on seek during live stream",severity:"P2",clientImpact:"All iOS 17.4 users on live stream – large audience",reportedBy:"Client SDM",owner:"Neha R",dependencyOwner:"iOS Dev Team",eta:hf(8),nextFollowUp:hf(2),status:"In Progress",closureDate:null,remarks:"Hotfix in progress – dev team investigating AVPlayer regression",lastUpdated:h(1)},
    {id:"OPS-0006",dateOpened:h(8),source:"WhatsApp",vertical:"Content",platform:"VOD Library",summary:"Premium movie 'Title X' playing wrong dubbed audio track (Hindi instead of Tamil)",severity:"P2",clientImpact:"All users playing this title across regions",reportedBy:"QA Analyst",owner:"Aditya K",dependencyOwner:"Content Ops",eta:hf(4),nextFollowUp:h(2),status:"In Progress",closureDate:null,remarks:"Re-encoding initiated – should be live in 3 hrs",lastUpdated:h(7)},
    {id:"OPS-0007",dateOpened:h(48),source:"Monitoring",vertical:"NOC",platform:"CDN – Akamai",summary:"Akamai Mumbai PoP edge node failure – 15% traffic hit in west India",severity:"P1",clientImpact:"Mumbai/Pune region users experiencing severe buffering",reportedBy:"NOC Auto-Alert",owner:"Sanjay P",dependencyOwner:"Akamai Support",eta:h(24),nextFollowUp:h(36),status:"Escalated",closureDate:null,remarks:"SLA breach raised with Akamai – awaiting RCA and permanent fix",lastUpdated:h(47)},
    {id:"OPS-0008",dateOpened:h(3),source:"Email",vertical:"TPMA",platform:"EPG Service",summary:"EPG data missing 48-hour window for all Sports channels",severity:"P2",clientImpact:"Guide shows blank – user complaints rising, social media backlash",reportedBy:"Operations",owner:"Vikram T",dependencyOwner:"EPG Data Provider",eta:hf(6),nextFollowUp:hf(1),status:"Open",closureDate:null,remarks:"EPG provider contacted – data refresh triggered",lastUpdated:h(3)},
    {id:"OPS-0009",dateOpened:h(24),source:"Verbal",vertical:"Binge",platform:"Binge Platform",summary:"Search returning irrelevant results for Bollywood genre queries",severity:"P3",clientImpact:"User discovery degraded – engagement metrics dropping",reportedBy:"Product Manager",owner:"Priya M",dependencyOwner:"Search/ML Team",eta:hf(48),nextFollowUp:h(12),status:"Open",closureDate:null,remarks:"Search index rebuild triggered – est. 36hrs",lastUpdated:h(23)},
    {id:"OPS-0010",dateOpened:h(72),source:"Jira",vertical:"App Support",platform:"App (Android)",summary:"Login failure for 2% of users post auth service upgrade v4.2",severity:"P2",clientImpact:"~50K users unable to login – growing NPS impact",reportedBy:"Dev Team",owner:"Rahul S",dependencyOwner:"Auth Service Team",eta:h(48),nextFollowUp:h(24),status:"RCA Pending",closureDate:h(12),remarks:"Fixed via hotfix 2.1.4 – RCA document pending from auth team",lastUpdated:h(12)},
    {id:"OPS-0011",dateOpened:h(0.5),source:"Chat Thread",vertical:"Content",platform:"CMS / Metadata",summary:"IPL match metadata incorrect – wrong match time shown to users",severity:"P2",clientImpact:"Users missing live match due to wrong start time displayed",reportedBy:"Content QA",owner:"Neha R",dependencyOwner:"Metadata Team",eta:hf(2),nextFollowUp:hf(0.5),status:"Open",closureDate:null,remarks:"Manual CMS correction in progress",lastUpdated:h(0.5)},
    {id:"OPS-0012",dateOpened:h(6),source:"Monitoring",vertical:"NOC",platform:"STB Platform",summary:"STB firmware v3.2.1 causing channel change freeze on 200K devices",severity:"P3",clientImpact:"Users on this firmware experiencing channel change hang",reportedBy:"STB Team",owner:"Sanjay P",dependencyOwner:"STB Vendor",eta:hf(12),nextFollowUp:hf(3),status:"Waiting-Partner",closureDate:null,remarks:"Rollback plan ready – vendor confirmation pending for deployment",lastUpdated:h(6)},
    {id:"OPS-0013",dateOpened:h(120),source:"Email",vertical:"Partner",platform:"Content Delivery API",summary:"Partner XYZ content refresh jobs failing silently – 45 titles missing",severity:"P2",clientImpact:"45 titles unavailable to end users",reportedBy:"Partner XYZ",owner:"Vikram T",dependencyOwner:"Partner XYZ",eta:h(48),nextFollowUp:h(72),status:"Closed",closureDate:h(96),remarks:"Fixed via pipeline restart and retry logic – partner confirmed",lastUpdated:h(96)},
    {id:"OPS-0014",dateOpened:h(0.25),source:"WhatsApp",vertical:"App Support",platform:"App (Android)",summary:"Push notification delivery rate dropped to 40% – major user communication impact",severity:"P2",clientImpact:"60% of push notifications not reaching users",reportedBy:"Marketing Team",owner:"Neha R",dependencyOwner:"Firebase/FCM",eta:hf(4),nextFollowUp:hf(1),status:"Open",closureDate:null,remarks:"FCM quota exceeded – upgrading plan, manual retry queued",lastUpdated:h(0.25)},
  ];
}

/* ─── STORAGE ────────────────────────────────────────────────────────── */
const SK = "ops_cmd_v4_issues", CK = "ops_cmd_v4_ctr";
async function storeGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
async function storeSet(k, v) { try { localStorage.setItem(k, v); } catch {} }

/* ─── MAIN APP ───────────────────────────────────────────────────────── */
export default function App() {
  const [issues,   setIssues]   = useState([]);
  const [ctr,      setCtr]      = useState(15);
  const [view,     setView]     = useState("dashboard");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [filters,  setFilters]  = useState({ sev:"",vert:"",status:"",owner:"",q:"" });
  const [notif,    setNotif]    = useState(null);
  const [waText,   setWaText]   = useState("");
  const [waParsed, setWaParsed] = useState(null);
  const [waLoading,setWaLoading]= useState(false);
  const [loaded,   setLoaded]   = useState(false);
  const [sortDir,  setSortDir]  = useState("desc");

  useEffect(() => {
    (async () => {
      const raw = await storeGet(SK);
      const cnt = await storeGet(CK);
      setIssues(raw ? JSON.parse(raw) : makeSample());
      if (!raw) storeSet(SK, JSON.stringify(makeSample()));
      if (cnt)  setCtr(parseInt(cnt));
      setLoaded(true);
    })();
  }, []);

  const save = async arr => { setIssues(arr); await storeSet(SK, JSON.stringify(arr)); };
  const toast = (msg, type="ok") => { setNotif({msg,type}); setTimeout(()=>setNotif(null),3200); };

  const addIssue = async data => {
    const n = ctr+1; setCtr(n); storeSet(CK, String(n));
    const issue = {...data, id:genId(n), dateOpened:ts(), lastUpdated:ts()};
    await save([issue,...issues]);
    toast(`${issue.id} logged successfully`);
    setShowForm(false); setEditItem(null);
  };
  const updateIssue = async (id, data) => {
    await save(issues.map(i => i.id===id ? {...i,...data,lastUpdated:ts()} : i));
    toast(`${id} updated`); setShowForm(false); setEditItem(null);
  };
  const closeIssue = async id => {
    await save(issues.map(i => i.id===id ? {...i,status:"Closed",closureDate:ts(),lastUpdated:ts()} : i));
    toast(`${id} closed ✓`);
  };
  const openForm = item => { setEditItem(item||null); setShowForm(true); };

  /* computed */
  const open         = useMemo(()=>issues.filter(i=>i.status!=="Closed"),[issues]);
  const p1           = useMemo(()=>open.filter(i=>i.severity==="P1"),[open]);
  const p2           = useMemo(()=>open.filter(i=>i.severity==="P2"),[open]);
  const overdue      = useMemo(()=>open.filter(i=>isOverdue(i.nextFollowUp)),[open]);
  const stale        = useMemo(()=>open.filter(i=>hoursAgo(i.lastUpdated)>24),[open]);
  const aging3       = useMemo(()=>open.filter(i=>daysAgo(i.dateOpened)>3),[open]);
  const waitPart     = useMemo(()=>open.filter(i=>i.status==="Waiting-Partner"&&daysAgo(i.dateOpened)>2),[open]);
  const todayQ = useMemo(()=>{
    const e = new Date(new Date().setHours(23,59,59,999));
    return open.filter(i=>i.nextFollowUp && new Date(i.nextFollowUp)<=e)
               .sort((a,b)=>new Date(a.nextFollowUp)-new Date(b.nextFollowUp));
  },[open]);
  const sevOrd = {P1:0,P2:1,P3:2,P4:3};
  const filtered = useMemo(()=>issues.filter(i=>{
    if(filters.sev    && i.severity!==filters.sev)    return false;
    if(filters.vert   && i.vertical!==filters.vert)   return false;
    if(filters.status && i.status!==filters.status)   return false;
    if(filters.owner  && i.owner!==filters.owner)     return false;
    if(filters.q && !`${i.summary}${i.id}${i.platform}${i.reportedBy}`.toLowerCase().includes(filters.q.toLowerCase())) return false;
    return true;
  }).sort((a,b)=> sevOrd[a.severity]-sevOrd[b.severity] || (sortDir==="desc"?-1:1)*(new Date(a.dateOpened)-new Date(b.dateOpened))),[issues,filters,sortDir]);

  const allOwners = useMemo(()=>[...new Set(issues.map(i=>i.owner))],[issues]);

  /* WA Converter – AI parse */
  const convertWA = async () => {
    if(!waText.trim()) return;
    setWaLoading(true); setWaParsed(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:1000,
          messages:[{role:"user",content:`Extract an issue ticket from this message. Return ONLY valid JSON, no markdown, no preamble.
Message: """${waText}"""
JSON structure:
{"source":"WhatsApp","vertical":"one of NOC/TPMA/Binge/Content/Partner/App Support","platform":"infer from message","summary":"concise summary under 100 chars","severity":"P1/P2/P3/P4 – infer from urgency","clientImpact":"who/what is impacted","reportedBy":"name or Unknown","owner":"Self","dependencyOwner":"any external party or TBD","status":"Open","remarks":"extra context"}`}]
        })
      });
      const d = await res.json();
      const txt = d.content.map(c=>c.text||"").join("");
      setWaParsed(JSON.parse(txt.replace(/```json|```/g,"").trim()));
    } catch { toast("AI parse failed – please fill manually","err"); }
    setWaLoading(false);
  };

  const useWAParsed = () => {
    if(waParsed){ openForm({...waParsed,isNew:true}); setWaText(""); setWaParsed(null); setView("issues"); }
  };

  if(!loaded) return (
    <div style={{background:"#070b16",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:"#00e5ff",fontFamily:"'Syne',sans-serif",fontSize:"1.2rem",letterSpacing:"-0.02em"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>⚡</div>
        <div>OPS COMMAND CENTER</div>
        <div style={{fontSize:"0.8rem",color:"#334155",marginTop:"0.5rem",fontFamily:"monospace"}}>loading...</div>
      </div>
    </div>
  );

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:"#070b16",minHeight:"100vh",color:"#cbd5e1",display:"flex",flexDirection:"column"}}>
      <Styles />
      <Nav view={view} setView={setView} p1cnt={p1.length} overdue={overdue.length} onAdd={()=>openForm(null)} />
      <main style={{flex:1,overflowY:"auto",padding:"0 1rem 2rem"}}>
        {view==="dashboard"  && <Dashboard open={open} p1={p1} p2={p2} overdue={overdue} stale={stale} aging3={aging3} waitPart={waitPart} todayQ={todayQ} issues={issues} setView={setView} onEdit={openForm} closeIssue={closeIssue}/>}
        {view==="issues"     && <IssuesTable issues={filtered} filters={filters} setFilters={setFilters} onEdit={openForm} onClose={closeIssue} allOwners={allOwners} sortDir={sortDir} setSortDir={setSortDir}/>}
        {view==="queue"      && <Queue todayQ={todayQ} overdue={overdue} stale={stale} aging3={aging3} waitPart={waitPart} onEdit={openForm}/>}
        {view==="analytics"  && <Analytics issues={issues} open={open}/>}
        {view==="leadership" && <Leadership open={open} p1={p1} p2={p2} overdue={overdue} waitPart={waitPart} issues={issues} aging3={aging3}/>}
        {view==="wa"         && <WAConvert waText={waText} setWaText={setWaText} waParsed={waParsed} waLoading={waLoading} onConvert={convertWA} onUse={useWAParsed}/>}
      </main>

      {showForm && (
        <IssueForm
          init={editItem}
          onSave={data => (editItem && !editItem.isNew) ? updateIssue(editItem.id,data) : addIssue(data)}
          onClose={()=>{setShowForm(false);setEditItem(null);}}
        />
      )}

      {notif && (
        <div style={{position:"fixed",bottom:"1.5rem",right:"1.5rem",zIndex:1100,
          background:notif.type==="err"?"#ff3d3d":"#4ade80",color:"#000",
          padding:"0.7rem 1.4rem",borderRadius:"10px",fontWeight:700,fontSize:"0.85rem",
          boxShadow:"0 4px 24px rgba(0,0,0,0.5)"}}>
          {notif.msg}
        </div>
      )}
    </div>
  );
}

/* ─── STYLES ──────────────────────────────────────────────────────────── */
function Styles() {
  return <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800&family=IBM+Plex+Mono:wght@400;600&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    ::-webkit-scrollbar{width:5px;height:5px}
    ::-webkit-scrollbar-track{background:#0c1428}
    ::-webkit-scrollbar-thumb{background:#1e3550;border-radius:3px}
    .card{background:#0c1428;border:1px solid #1a2e4a;border-radius:12px}
    .btn{cursor:pointer;border:none;border-radius:7px;padding:0.45rem 0.9rem;font-family:inherit;font-size:0.82rem;font-weight:600;transition:filter 0.15s,transform 0.1s;}
    .btn:hover{filter:brightness(1.18);transform:translateY(-1px)}
    .btn:active{transform:translateY(0)}
    .btn-cyan{background:#00e5ff;color:#000}
    .btn-ghost{background:#162038;color:#64748b;border:1px solid #1a2e4a}
    .btn-green{background:rgba(74,222,128,0.18);color:#4ade80}
    .btn-red{background:#ff3d3d;color:#fff}
    @keyframes blink{0%,100%{opacity:1}50%{opacity:0.25}}
    .blink{animation:blink 1.1s ease-in-out infinite}
    @keyframes fadein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
    .fadein{animation:fadein 0.2s ease}
    table{border-collapse:collapse;width:100%}
    th{text-align:left;font-weight:600}
    input,select,textarea{font-family:inherit;outline:none}
    input::placeholder{color:#334155}
    .row-hover:hover{background:#111e36!important;cursor:pointer}
    .pill{display:inline-flex;align-items:center;border-radius:5px;padding:0.12rem 0.38rem;font-size:0.66rem;font-weight:700;white-space:nowrap;font-family:'IBM Plex Mono',monospace}
  `}</style>;
}

/* ─── NAV ─────────────────────────────────────────────────────────────── */
const TABS = [
  {id:"dashboard",label:"⚡ Dashboard"},
  {id:"issues",   label:"📋 Issues"},
  {id:"queue",    label:"🎯 Queue"},
  {id:"analytics",label:"📊 Analytics"},
  {id:"leadership",label:"👑 Leadership"},
  {id:"wa",       label:"💬 WA Convert"},
];
function Nav({view,setView,p1cnt,overdue,onAdd}) {
  return (
    <header style={{background:"#090e1c",borderBottom:"1px solid #1a2e4a",padding:"0 1rem",position:"sticky",top:0,zIndex:200}}>
      <div style={{maxWidth:1440,margin:"0 auto",display:"flex",alignItems:"center",gap:"0.5rem",height:52}}>
        <div style={{marginRight:"1rem",flexShrink:0}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"1.05rem",color:"#00e5ff",letterSpacing:"-0.03em",lineHeight:1}}>
            OPS<span style={{color:"#e2e8f0"}}>CMD</span>
          </div>
          <div style={{fontSize:"0.55rem",color:"#334155",fontFamily:"'IBM Plex Mono',monospace",letterSpacing:"0.12em",marginTop:2}}>SDM COMMAND CENTER</div>
        </div>
        <nav style={{display:"flex",gap:"0.18rem",flex:1,overflowX:"auto"}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setView(t.id)} className="btn" style={{
              background:view===t.id?"rgba(0,229,255,0.1)":"transparent",
              color:view===t.id?"#00e5ff":"#475569",
              border:view===t.id?"1px solid rgba(0,229,255,0.3)":"1px solid transparent",
              borderRadius:7,padding:"0.38rem 0.7rem",fontSize:"0.78rem",whiteSpace:"nowrap",flexShrink:0
            }}>{t.label}</button>
          ))}
        </nav>
        <div style={{display:"flex",gap:"0.5rem",alignItems:"center",flexShrink:0}}>
          {p1cnt>0 && <span className="blink pill" style={{background:"rgba(255,61,61,0.18)",color:"#ff3d3d",border:"1px solid rgba(255,61,61,0.3)"}}>🔴 {p1cnt} P1 OPEN</span>}
          {overdue>0&& <span className="pill" style={{background:"rgba(255,145,0,0.15)",color:"#ff9100",border:"1px solid rgba(255,145,0,0.3)"}}>⏰ {overdue} Overdue</span>}
          <button className="btn btn-cyan" onClick={onAdd} style={{whiteSpace:"nowrap"}}>+ Log Issue</button>
        </div>
      </div>
    </header>
  );
}

/* ─── BADGES ──────────────────────────────────────────────────────────── */
function SevBadge({s}) {
  const c = SEV[s]||SEV.P4;
  return <span className="pill" style={{background:c.bg,color:c.color,border:`1px solid ${c.border}`}}>{s}</span>;
}
function StatusBadge({s}) {
  const c = STATUS_COLOR[s]||"#94a3b8";
  return <span className="pill" style={{background:`${c}18`,color:c,border:`1px solid ${c}30`,fontFamily:"'DM Sans',sans-serif",fontWeight:600}}>{s}</span>;
}

/* ─── DASHBOARD ───────────────────────────────────────────────────────── */
function Dashboard({open,p1,p2,overdue,stale,aging3,waitPart,todayQ,issues,setView,onEdit,closeIssue}) {
  const closed = issues.filter(i=>i.status==="Closed");
  const kpis = [
    {label:"Total Open",  val:open.length,  color:"#00e5ff",icon:"📂",blink:false},
    {label:"P1 Critical", val:p1.length,    color:"#ff3d3d",icon:"🚨",blink:p1.length>0},
    {label:"P2 High",     val:p2.length,    color:"#ff9100",icon:"⚠️",blink:false},
    {label:"Overdue F/U", val:overdue.length,color:"#f43f5e",icon:"⏰",blink:overdue.length>0},
    {label:"Stale 24h+",  val:stale.length, color:"#ffd60a",icon:"💤",blink:false},
    {label:"Ageing 3d+",  val:aging3.length,color:"#c084fc",icon:"📅",blink:false},
    {label:"Waiting Partner",val:waitPart.length,color:"#60a5fa",icon:"🤝",blink:false},
    {label:"Closed Total",val:closed.length,color:"#4ade80",icon:"✅",blink:false},
  ];
  const critAlerts = [...p1,...overdue.filter(i=>!p1.find(p=>p.id===i.id))].slice(0,6);

  return (
    <div className="fadein" style={{maxWidth:1440,margin:"0 auto",padding:"1rem 0"}}>
      {/* Alert strip */}
      {critAlerts.length>0 && (
        <div style={{background:"rgba(255,61,61,0.08)",border:"1px solid rgba(255,61,61,0.25)",borderRadius:10,padding:"0.6rem 1rem",marginBottom:"1rem",display:"flex",gap:"0.75rem",alignItems:"center",overflowX:"auto",flexWrap:"nowrap"}}>
          <span style={{color:"#ff3d3d",fontWeight:800,fontSize:"0.75rem",whiteSpace:"nowrap",flexShrink:0}}>🚨 CRITICAL:</span>
          {critAlerts.map(i=>(
            <button key={i.id} onClick={()=>onEdit(i)} className="btn" style={{
              background:"rgba(255,61,61,0.12)",color:"#fca5a5",border:"1px solid rgba(255,61,61,0.2)",
              fontSize:"0.72rem",whiteSpace:"nowrap",padding:"0.2rem 0.55rem",flexShrink:0}}>
              {i.id} · {i.summary.substring(0,38)}...
            </button>
          ))}
        </div>
      )}
      {/* KPI grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(145px,1fr))",gap:"0.65rem",marginBottom:"1.25rem"}}>
        {kpis.map(k=>(
          <div key={k.label} className="card" style={{padding:"0.9rem",borderColor:k.blink?"rgba(255,61,61,0.35)":"#1a2e4a"}}>
            <div style={{fontSize:"1.2rem",marginBottom:"0.3rem"}}>{k.icon}</div>
            <div className={k.blink?"blink":""} style={{fontSize:"1.9rem",fontWeight:800,fontFamily:"'IBM Plex Mono',monospace",color:k.color,lineHeight:1}}>{k.val}</div>
            <div style={{fontSize:"0.7rem",color:"#94a3b8",fontWeight:600,marginTop:"0.25rem"}}>{k.label}</div>
          </div>
        ))}
      </div>
      {/* Grid of panels */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.9rem"}}>
        {/* Today's queue */}
        <div className="card" style={{padding:"1rem"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.7rem"}}>
            <h3 style={{fontFamily:"'Syne',sans-serif",color:"#e2e8f0",fontSize:"0.9rem"}}>🎯 Today's Action Queue</h3>
            <button className="btn btn-ghost" onClick={()=>setView("queue")} style={{fontSize:"0.68rem",padding:"0.2rem 0.45rem"}}>All →</button>
          </div>
          {todayQ.length===0
            ? <div style={{color:"#334155",fontSize:"0.82rem",textAlign:"center",padding:"1.5rem 0"}}>✅ Queue clear</div>
            : <div style={{display:"flex",flexDirection:"column",gap:"0.45rem",maxHeight:260,overflowY:"auto"}}>
                {todayQ.slice(0,8).map(i=>(
                  <div key={i.id} onClick={()=>onEdit(i)} className="row-hover" style={{display:"flex",alignItems:"center",gap:"0.5rem",padding:"0.45rem 0.5rem",background:"#0f1c33",borderRadius:7,borderLeft:`3px solid ${SEV[i.severity]?.color||"#94a3b8"}`}}>
                    <SevBadge s={i.severity}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:"0.74rem",color:"#e2e8f0",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{i.summary}</div>
                      <div style={{fontSize:"0.63rem",color:"#475569"}}>{i.id} · {i.owner} · <span style={{color:isOverdue(i.nextFollowUp)?"#ff3d3d":"#94a3b8"}}>{fmt(i.nextFollowUp)}</span></div>
                    </div>
                    <StatusBadge s={i.status}/>
                  </div>
                ))}
              </div>
          }
        </div>
        {/* P1 panel */}
        <div className="card" style={{padding:"1rem",borderColor:p1.length?"rgba(255,61,61,0.25)":"#1a2e4a"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.7rem"}}>
            <h3 className={p1.length?"blink":""} style={{fontFamily:"'Syne',sans-serif",color:p1.length?"#ff3d3d":"#e2e8f0",fontSize:"0.9rem"}}>🚨 P1 Critical Open</h3>
            <span style={{color:"#475569",fontSize:"0.72rem"}}>{p1.length} issues</span>
          </div>
          {p1.length===0
            ? <div style={{color:"#4ade80",fontSize:"0.82rem",textAlign:"center",padding:"1.5rem 0"}}>🎉 No P1 issues!</div>
            : <div style={{display:"flex",flexDirection:"column",gap:"0.45rem",maxHeight:260,overflowY:"auto"}}>
                {p1.map(i=>(
                  <div key={i.id} onClick={()=>onEdit(i)} className="row-hover" style={{padding:"0.5rem 0.6rem",background:"rgba(255,61,61,0.07)",borderRadius:7,border:"1px solid rgba(255,61,61,0.18)"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"0.2rem"}}>
                      <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.68rem",color:"#ff3d3d"}}>{i.id}</span>
                      <StatusBadge s={i.status}/>
                    </div>
                    <div style={{fontSize:"0.78rem",color:"#fca5a5",fontWeight:600}}>{i.summary}</div>
                    <div style={{fontSize:"0.63rem",color:"#64748b",marginTop:"0.2rem"}}>{i.vertical} · {i.owner} · {Math.round(hoursAgo(i.dateOpened))}h open · ETA {fmt(i.eta)}</div>
                  </div>
                ))}
              </div>
          }
        </div>
        {/* Vertical bars */}
        <div className="card" style={{padding:"1rem"}}>
          <h3 style={{fontFamily:"'Syne',sans-serif",color:"#e2e8f0",fontSize:"0.9rem",marginBottom:"0.9rem"}}>📊 Open by Vertical</h3>
          {VERTICALS.map(v=>{
            const cnt = open.filter(i=>i.vertical===v).length;
            const pct = open.length ? Math.round(cnt/open.length*100) : 0;
            return (
              <div key={v} style={{marginBottom:"0.55rem"}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.77rem",marginBottom:"0.2rem"}}>
                  <span style={{color:"#94a3b8"}}>{v}</span>
                  <span style={{color:"#e2e8f0",fontWeight:700,fontFamily:"'IBM Plex Mono',monospace"}}>{cnt}</span>
                </div>
                <div style={{height:5,background:"#162038",borderRadius:3}}>
                  <div style={{height:5,width:`${pct}%`,background:"linear-gradient(90deg,#00b4d8,#00e5ff)",borderRadius:3,transition:"width 0.4s"}}/>
                </div>
              </div>
            );
          })}
        </div>
        {/* Overdue panel */}
        <div className="card" style={{padding:"1rem"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.7rem"}}>
            <h3 style={{fontFamily:"'Syne',sans-serif",color:overdue.length?"#ff9100":"#e2e8f0",fontSize:"0.9rem"}}>⏰ Overdue Follow-ups</h3>
            <span style={{color:"#475569",fontSize:"0.72rem"}}>{overdue.length} overdue</span>
          </div>
          {overdue.length===0
            ? <div style={{color:"#4ade80",fontSize:"0.82rem",textAlign:"center",padding:"1.5rem 0"}}>✅ No overdue follow-ups</div>
            : <div style={{display:"flex",flexDirection:"column",gap:"0.45rem",maxHeight:260,overflowY:"auto"}}>
                {overdue.map(i=>(
                  <div key={i.id} onClick={()=>onEdit(i)} className="row-hover" style={{display:"flex",gap:"0.5rem",padding:"0.45rem 0.5rem",background:"rgba(255,145,0,0.07)",borderRadius:7,borderLeft:"3px solid #ff9100"}}>
                    <SevBadge s={i.severity}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:"0.74rem",color:"#e2e8f0",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{i.summary}</div>
                      <div style={{fontSize:"0.63rem",color:"#ff9100"}}>Was due: {fmt(i.nextFollowUp)} · {i.owner}</div>
                    </div>
                    <button onClick={e=>{e.stopPropagation();closeIssue(i.id)}} className="btn btn-green" style={{padding:"0.15rem 0.4rem",fontSize:"0.65rem",flexShrink:0}}>✓ Close</button>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>
    </div>
  );
}

/* ─── ISSUES TABLE ────────────────────────────────────────────────────── */
function IssuesTable({issues,filters,setFilters,onEdit,onClose,allOwners,sortDir,setSortDir}) {
  const f = filters;
  const inp = {background:"#0f1c33",border:"1px solid #1a2e4a",borderRadius:6,padding:"0.38rem 0.65rem",color:"#e2e8f0",fontSize:"0.82rem"};
  return (
    <div className="fadein" style={{maxWidth:1440,margin:"0 auto",padding:"1rem 0"}}>
      <div className="card" style={{padding:"0.7rem",marginBottom:"0.9rem",display:"flex",gap:"0.5rem",flexWrap:"wrap",alignItems:"center"}}>
        <input placeholder="🔍 Search..." value={f.q} onChange={e=>setFilters({...f,q:e.target.value})} style={{...inp,width:190}}/>
        {[{k:"sev",opts:["","P1","P2","P3","P4"],ph:"Severity"},{k:"vert",opts:["","NOC","TPMA","Binge","Content","Partner","App Support"],ph:"Vertical"},{k:"status",opts:["","Open","In Progress","Waiting-Partner","Waiting-Client","Escalated","RCA Pending","Closed"],ph:"Status"},{k:"owner",opts:["",...allOwners],ph:"Owner"}].map(({k,opts,ph})=>(
          <select key={k} value={f[k]} onChange={e=>setFilters({...f,[k]:e.target.value})} style={{...inp,color:f[k]?"#00e5ff":"#475569"}}>
            {opts.map(o=><option key={o||"_"} value={o}>{o||ph}</option>)}
          </select>
        ))}
        <button className="btn btn-ghost" onClick={()=>setFilters({sev:"",vert:"",status:"",owner:"",q:""})}>Clear</button>
        <button className="btn btn-ghost" onClick={()=>setSortDir(d=>d==="desc"?"asc":"desc")} style={{fontSize:"0.75rem"}}>Age {sortDir==="desc"?"↓":"↑"}</button>
        <span style={{marginLeft:"auto",color:"#475569",fontSize:"0.78rem"}}>{issues.length} issues</span>
      </div>
      <div className="card" style={{overflowX:"auto"}}>
        <table>
          <thead>
            <tr style={{borderBottom:"1px solid #1a2e4a"}}>
              {["ID","Sev","Vertical","Platform","Summary","Owner","Status","Follow-up","Age","Actions"].map(h=>(
                <th key={h} style={{padding:"0.55rem 0.7rem",fontSize:"0.67rem",color:"#475569",letterSpacing:"0.06em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {issues.map((i,idx)=>{
              const od = isOverdue(i.nextFollowUp) && i.status!=="Closed";
              const sl = hoursAgo(i.lastUpdated)>24 && i.status!=="Closed";
              const age = daysAgo(i.dateOpened);
              return (
                <tr key={i.id} className="row-hover" style={{borderBottom:"1px solid #0f1c2e",background:idx%2===0?"transparent":"rgba(10,20,38,0.5)"}}
                  onClick={()=>onEdit(i)}>
                  <td style={{padding:"0.45rem 0.7rem",whiteSpace:"nowrap"}}>
                    <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.7rem",color:SEV[i.severity]?.color||"#94a3b8"}}>{i.id}</div>
                    {sl && <div style={{fontSize:"0.58rem",color:"#ffd60a"}}>💤 stale</div>}
                  </td>
                  <td style={{padding:"0.45rem 0.4rem"}}><SevBadge s={i.severity}/></td>
                  <td style={{padding:"0.45rem 0.4rem",fontSize:"0.73rem",color:"#94a3b8",whiteSpace:"nowrap"}}>{i.vertical}</td>
                  <td style={{padding:"0.45rem 0.4rem",fontSize:"0.7rem",color:"#475569",maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{i.platform}</td>
                  <td style={{padding:"0.45rem 0.7rem",maxWidth:270}}>
                    <div style={{fontSize:"0.77rem",color:"#e2e8f0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{i.summary}</div>
                    <div style={{fontSize:"0.62rem",color:"#334155",marginTop:"0.1rem"}}>{i.source} · {fmtDate(i.dateOpened)}</div>
                  </td>
                  <td style={{padding:"0.45rem 0.4rem",fontSize:"0.73rem",color:"#94a3b8",whiteSpace:"nowrap"}}>{i.owner}</td>
                  <td style={{padding:"0.45rem 0.4rem"}}><StatusBadge s={i.status}/></td>
                  <td style={{padding:"0.45rem 0.4rem",fontSize:"0.7rem",color:od?"#ff3d3d":"#475569",whiteSpace:"nowrap"}}>{od&&"⏰ "}{fmtDate(i.nextFollowUp)}</td>
                  <td style={{padding:"0.45rem 0.4rem",fontSize:"0.72rem",color:age>3?"#c084fc":age>1?"#ff9100":"#64748b",whiteSpace:"nowrap",fontFamily:"'IBM Plex Mono',monospace"}}>
                    {age<1?`${Math.round(age*24)}h`:age<2?"1d":`${Math.round(age)}d`}
                  </td>
                  <td style={{padding:"0.45rem 0.4rem"}} onClick={e=>e.stopPropagation()}>
                    <div style={{display:"flex",gap:"0.25rem"}}>
                      <button className="btn btn-ghost" onClick={()=>onEdit(i)} style={{padding:"0.18rem 0.4rem",fontSize:"0.67rem"}}>Edit</button>
                      {i.status!=="Closed" && <button className="btn btn-green" onClick={()=>onClose(i.id)} style={{padding:"0.18rem 0.4rem",fontSize:"0.67rem"}}>✓</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {issues.length===0 && <div style={{textAlign:"center",padding:"2.5rem",color:"#334155"}}>No issues match the current filters.</div>}
      </div>
    </div>
  );
}

/* ─── ACTION QUEUE ────────────────────────────────────────────────────── */
function Queue({todayQ,overdue,stale,aging3,waitPart,onEdit}) {
  const sections = [
    {title:"⏰ Overdue Follow-ups",          items:overdue,                                                              color:"#ff3d3d",desc:"Take immediate action"},
    {title:"🎯 Follow-ups Due Today",         items:todayQ.filter(i=>!isOverdue(i.nextFollowUp)),                       color:"#ff9100",desc:"Complete by end of day"},
    {title:"💤 Stale – No Update >24h",       items:stale.filter(i=>!overdue.find(o=>o.id===i.id)),                    color:"#ffd60a",desc:"Send update or escalate"},
    {title:"📅 Ageing >3 Days",               items:aging3.filter(i=>!stale.find(s=>s.id===i.id)&&!overdue.find(o=>o.id===i.id)), color:"#c084fc",desc:"Review and consider escalation"},
    {title:"🤝 Partner Waiting >2 Days",      items:waitPart.filter(i=>!aging3.find(a=>a.id===i.id)),                  color:"#60a5fa",desc:"Chase partner – SLA risk"},
  ];
  const total = sections.reduce((acc,s)=>acc+s.items.length,0);

  return (
    <div className="fadein" style={{maxWidth:960,margin:"0 auto",padding:"1rem 0"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
        <div>
          <h2 style={{fontFamily:"'Syne',sans-serif",color:"#e2e8f0",fontSize:"1.15rem"}}>🎯 Daily Action Queue</h2>
          <p style={{color:"#475569",fontSize:"0.78rem",marginTop:"0.2rem"}}>Work through this every morning. Target: under 20 minutes.</p>
        </div>
        <div style={{background:"rgba(0,229,255,0.1)",border:"1px solid rgba(0,229,255,0.25)",borderRadius:10,padding:"0.5rem 1.1rem",textAlign:"center"}}>
          <div style={{fontSize:"1.6rem",fontWeight:800,color:"#00e5ff",fontFamily:"'IBM Plex Mono',monospace",lineHeight:1}}>{total}</div>
          <div style={{fontSize:"0.67rem",color:"#475569",marginTop:3}}>actions needed</div>
        </div>
      </div>
      {sections.map(sec => sec.items.length===0 ? null : (
        <div key={sec.title} className="card fadein" style={{marginBottom:"0.9rem",padding:"0.9rem",borderColor:`${sec.color}28`}}>
          <div style={{display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"0.7rem"}}>
            <h3 style={{color:sec.color,fontFamily:"'Syne',sans-serif",fontSize:"0.88rem"}}>{sec.title}</h3>
            <span className="pill" style={{background:`${sec.color}18`,color:sec.color}}>{sec.items.length}</span>
            <span style={{color:"#334155",fontSize:"0.72rem"}}>— {sec.desc}</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"0.45rem"}}>
            {sec.items.map(i=>(
              <div key={i.id} style={{display:"flex",alignItems:"center",gap:"0.65rem",padding:"0.55rem 0.7rem",background:"#0f1c33",borderRadius:8,borderLeft:`3px solid ${sec.color}`}}>
                <SevBadge s={i.severity}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:"0.78rem",color:"#e2e8f0",fontWeight:600}}>{i.summary}</div>
                  <div style={{fontSize:"0.63rem",color:"#475569",marginTop:"0.15rem"}}>{i.id} · {i.vertical} · {i.platform} · Owner: {i.owner}{i.dependencyOwner && ` · Dep: ${i.dependencyOwner}`}</div>
                </div>
                <div style={{textAlign:"right",fontSize:"0.63rem",color:"#475569",whiteSpace:"nowrap",flexShrink:0}}>
                  <div style={{color:isOverdue(i.nextFollowUp)?"#ff3d3d":"#94a3b8"}}>F/U: {fmt(i.nextFollowUp)}</div>
                  <div>ETA: {fmt(i.eta)}</div>
                </div>
                <StatusBadge s={i.status}/>
                <button className="btn btn-ghost" onClick={()=>onEdit(i)} style={{padding:"0.2rem 0.45rem",fontSize:"0.68rem",flexShrink:0}}>Act</button>
              </div>
            ))}
          </div>
        </div>
      ))}
      {total===0 && (
        <div className="card" style={{padding:"3.5rem",textAlign:"center"}}>
          <div style={{fontSize:"3rem",marginBottom:"0.75rem"}}>🎉</div>
          <div style={{color:"#4ade80",fontSize:"1.1rem",fontFamily:"'Syne',sans-serif"}}>Queue clear! No immediate actions needed.</div>
          <div style={{color:"#334155",marginTop:"0.5rem",fontSize:"0.82rem"}}>Great discipline. Keep up the follow-up habit.</div>
        </div>
      )}
    </div>
  );
}

/* ─── ANALYTICS ───────────────────────────────────────────────────────── */
function Analytics({issues,open}) {
  const byVert  = VERTICALS.map(v=>({name:v,Open:open.filter(i=>i.vertical===v).length,Closed:issues.filter(i=>i.vertical===v&&i.status==="Closed").length}));
  const bySev   = SEVERITIES.map(s=>({name:s,value:open.filter(i=>i.severity===s).length})).filter(d=>d.value>0);
  const byOwner = [...new Set(issues.map(i=>i.owner))].map(o=>({name:o,Open:open.filter(i=>i.owner===o).length})).filter(d=>d.Open>0);
  const bySrc   = SOURCES.map(s=>({name:s,count:issues.filter(i=>i.source===s).length})).filter(d=>d.count>0);
  const byStatus= STATUSES.map(s=>({name:s,value:issues.filter(i=>i.status===s).length})).filter(d=>d.value>0);
  const ttp = {contentStyle:{background:"#0c1428",border:"1px solid #1a2e4a",borderRadius:8,color:"#e2e8f0",fontSize:"0.78rem"},labelStyle:{color:"#94a3b8"}};
  const avgAge = open.length ? Math.round(open.reduce((a,i)=>a+daysAgo(i.dateOpened),0)/open.length*10)/10 : 0;
  const topVert = VERTICALS.reduce((a,v)=>open.filter(i=>i.vertical===v).length>open.filter(i=>i.vertical===a).length?v:a,"NOC");
  const topOwner= byOwner.reduce((a,b)=>b.Open>a.Open?b:a,{name:"—",Open:0}).name;

  return (
    <div className="fadein" style={{maxWidth:1440,margin:"0 auto",padding:"1rem 0"}}>
      <h2 style={{fontFamily:"'Syne',sans-serif",color:"#e2e8f0",marginBottom:"1rem",fontSize:"1.1rem"}}>📊 Analytics & Trends</h2>
      {/* Summary metrics */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))",gap:"0.65rem",marginBottom:"1rem"}}>
        {[
          {l:"Avg Age (open)",v:`${avgAge}d`,c:"#00e5ff"},
          {l:"% Waiting Partner",v:`${open.length?Math.round(open.filter(i=>i.status==="Waiting-Partner").length/open.length*100):0}%`,c:"#c084fc"},
          {l:"% Escalated",v:`${open.length?Math.round(open.filter(i=>i.status==="Escalated").length/open.length*100):0}%`,c:"#f43f5e"},
          {l:"Closure Rate",v:`${issues.length?Math.round(issues.filter(i=>i.status==="Closed").length/issues.length*100):0}%`,c:"#4ade80"},
          {l:"Top Vertical",v:topVert,c:"#ff9100"},
          {l:"Highest Workload",v:topOwner,c:"#ffd60a"},
        ].map(m=>(
          <div key={m.l} className="card" style={{padding:"0.8rem"}}>
            <div style={{fontSize:"1.3rem",fontWeight:800,color:m.c,fontFamily:"'IBM Plex Mono',monospace"}}>{m.v}</div>
            <div style={{fontSize:"0.68rem",color:"#475569",marginTop:"0.2rem"}}>{m.l}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.9rem"}}>
        <div className="card" style={{padding:"1rem"}}>
          <h3 style={{color:"#94a3b8",fontSize:"0.8rem",marginBottom:"0.8rem",fontWeight:600}}>OPEN / CLOSED BY VERTICAL</h3>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={byVert} barSize={10} barGap={3}>
              <XAxis dataKey="name" tick={{fill:"#475569",fontSize:10}} />
              <YAxis tick={{fill:"#475569",fontSize:10}} />
              <Tooltip {...ttp}/>
              <Legend wrapperStyle={{fontSize:"0.72rem",color:"#64748b"}}/>
              <Bar dataKey="Open"   fill="#ff9100" radius={[3,3,0,0]}/>
              <Bar dataKey="Closed" fill="#4ade80" radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card" style={{padding:"1rem"}}>
          <h3 style={{color:"#94a3b8",fontSize:"0.8rem",marginBottom:"0.8rem",fontWeight:600}}>OPEN ISSUES BY SEVERITY</h3>
          <ResponsiveContainer width="100%" height={190}>
            <PieChart>
              <Pie data={bySev} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={72} label={({name,value})=>`${name}: ${value}`} labelLine={{stroke:"#334155"}}>
                {bySev.map((_,i)=><Cell key={i} fill={CHART_COLORS[i]}/>)}
              </Pie>
              <Tooltip {...ttp}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card" style={{padding:"1rem"}}>
          <h3 style={{color:"#94a3b8",fontSize:"0.8rem",marginBottom:"0.8rem",fontWeight:600}}>WORKLOAD BY OWNER</h3>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={byOwner} layout="vertical" barSize={12}>
              <XAxis type="number" tick={{fill:"#475569",fontSize:10}}/>
              <YAxis dataKey="name" type="category" tick={{fill:"#475569",fontSize:10}} width={62}/>
              <Tooltip {...ttp}/>
              <Bar dataKey="Open" fill="#00e5ff" radius={[0,3,3,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card" style={{padding:"1rem"}}>
          <h3 style={{color:"#94a3b8",fontSize:"0.8rem",marginBottom:"0.8rem",fontWeight:600}}>ISSUES BY SOURCE</h3>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={bySrc} barSize={13}>
              <XAxis dataKey="name" tick={{fill:"#475569",fontSize:9}} angle={-18} textAnchor="end" height={40}/>
              <YAxis tick={{fill:"#475569",fontSize:10}}/>
              <Tooltip {...ttp}/>
              <Bar dataKey="count" fill="#c084fc" radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ─── LEADERSHIP ──────────────────────────────────────────────────────── */
function Leadership({open,p1,p2,overdue,waitPart,issues,aging3}) {
  const closed     = issues.filter(i=>i.status==="Closed");
  const escalated  = open.filter(i=>i.status==="Escalated");
  const waitClient = open.filter(i=>i.status==="Waiting-Client");
  const rcaPending = open.filter(i=>i.status==="RCA Pending");
  const todayClosed= closed.filter(i=>{ const d=new Date(i.closureDate||0); return d.toDateString()===new Date().toDateString(); });

  const copyText = () => {
    const lines = [
      `OPS STATUS SUMMARY – ${new Date().toLocaleDateString("en-IN",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})}`,
      "=".repeat(55),
      `Total Open Issues   : ${open.length}`,
      `P1 Critical         : ${p1.length}`,
      `P2 High             : ${p2.length}`,
      `Overdue Follow-ups  : ${overdue.length}`,
      `Escalated           : ${escalated.length}`,
      `Waiting on Partner  : ${waitPart.length}`,
      `Waiting on Client   : ${waitClient.length}`,
      `RCA Pending         : ${rcaPending.length}`,
      `Closed Today        : ${todayClosed.length}`,
      `Ageing (3d+)        : ${aging3.length}`,
      "",
      "P1 INCIDENTS:",
      ...(p1.length ? p1.map(i=>`  • ${i.id}: ${i.summary}\n    Owner: ${i.owner} | Status: ${i.status} | ETA: ${fmt(i.eta)}`) : ["  None"]),
      "",
      "ESCALATIONS:",
      ...(escalated.length ? escalated.map(i=>`  • ${i.id}: ${i.summary}`) : ["  None"]),
      "",
      "TOP AGEING RISKS:",
      ...(aging3.slice(0,5).map(i=>`  • ${i.id} (${Math.round(daysAgo(i.dateOpened))}d): ${i.summary}`)),
      "=".repeat(55),
    ].join("\n");
    navigator.clipboard.writeText(lines).then(()=>alert("Summary copied to clipboard!")).catch(()=>alert(lines));
  };

  const kpis = [
    {l:"Total Open",v:open.length,    c:"#00e5ff",icon:"📂",blink:false},
    {l:"P1 Critical",v:p1.length,     c:"#ff3d3d",icon:"🚨",blink:p1.length>0},
    {l:"P2 High",v:p2.length,         c:"#ff9100",icon:"⚠️",blink:false},
    {l:"Escalated",v:escalated.length,c:"#f43f5e",icon:"📢",blink:escalated.length>0},
    {l:"Waiting Partner",v:waitPart.length,c:"#c084fc",icon:"🤝",blink:false},
    {l:"Closed Today",v:todayClosed.length,c:"#4ade80",icon:"✅",blink:false},
  ];

  return (
    <div className="fadein" style={{maxWidth:1000,margin:"0 auto",padding:"1rem 0"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1rem"}}>
        <div>
          <h2 style={{fontFamily:"'Syne',sans-serif",color:"#e2e8f0",fontSize:"1.15rem"}}>👑 Leadership Summary</h2>
          <p style={{color:"#475569",fontSize:"0.78rem",marginTop:"0.2rem"}}>
            As of {new Date().toLocaleString("en-IN",{weekday:"long",day:"2-digit",month:"long",hour:"2-digit",minute:"2-digit"})}
          </p>
        </div>
        <button className="btn btn-cyan" onClick={copyText}>📋 Copy for Slack/Email</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.7rem",marginBottom:"1rem"}}>
        {kpis.map(k=>(
          <div key={k.l} className="card" style={{padding:"0.85rem",textAlign:"center"}}>
            <div style={{fontSize:"1.3rem"}}>{k.icon}</div>
            <div className={k.blink?"blink":""} style={{fontSize:"1.9rem",fontWeight:800,fontFamily:"'IBM Plex Mono',monospace",color:k.c,lineHeight:1.1}}>{k.v}</div>
            <div style={{fontSize:"0.7rem",color:"#475569",marginTop:"0.2rem"}}>{k.l}</div>
          </div>
        ))}
      </div>

      {/* P1 detail */}
      {p1.length>0 && (
        <div className="card" style={{padding:"1rem",marginBottom:"0.9rem",borderColor:"rgba(255,61,61,0.28)"}}>
          <h3 style={{color:"#ff3d3d",fontFamily:"'Syne',sans-serif",fontSize:"0.88rem",marginBottom:"0.7rem"}}>🚨 P1 Incidents Requiring Attention</h3>
          {p1.map(i=>(
            <div key={i.id} style={{marginBottom:"0.5rem",padding:"0.55rem 0.7rem",background:"rgba(255,61,61,0.07)",borderRadius:7}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"0.2rem"}}>
                <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.72rem",color:"#ff3d3d"}}>{i.id}</span>
                <StatusBadge s={i.status}/>
              </div>
              <div style={{fontSize:"0.82rem",color:"#fca5a5",fontWeight:600,marginBottom:"0.2rem"}}>{i.summary}</div>
              <div style={{fontSize:"0.68rem",color:"#475569"}}>Impact: {i.clientImpact} · Owner: {i.owner} · Open: {Math.round(hoursAgo(i.dateOpened))}h · ETA: {fmt(i.eta)}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.9rem",marginBottom:"0.9rem"}}>
        <div className="card" style={{padding:"1rem"}}>
          <h3 style={{color:"#c084fc",fontFamily:"'Syne',sans-serif",fontSize:"0.85rem",marginBottom:"0.55rem"}}>🤝 Awaiting Partner Input</h3>
          {waitPart.length===0
            ? <div style={{color:"#334155",fontSize:"0.78rem"}}>None</div>
            : waitPart.map(i=><div key={i.id} style={{fontSize:"0.73rem",color:"#94a3b8",marginBottom:"0.3rem",borderBottom:"1px solid #0f1c2e",paddingBottom:"0.3rem"}}>
                <span style={{fontFamily:"'IBM Plex Mono',monospace",color:"#c084fc"}}>{i.id}</span> · {i.summary.substring(0,55)}... ({i.dependencyOwner})
              </div>)
          }
        </div>
        <div className="card" style={{padding:"1rem"}}>
          <h3 style={{color:"#60a5fa",fontFamily:"'Syne',sans-serif",fontSize:"0.85rem",marginBottom:"0.55rem"}}>👤 Awaiting Client Input</h3>
          {waitClient.length===0
            ? <div style={{color:"#334155",fontSize:"0.78rem"}}>None</div>
            : waitClient.map(i=><div key={i.id} style={{fontSize:"0.73rem",color:"#94a3b8",marginBottom:"0.3rem",borderBottom:"1px solid #0f1c2e",paddingBottom:"0.3rem"}}>
                <span style={{fontFamily:"'IBM Plex Mono',monospace",color:"#60a5fa"}}>{i.id}</span> · {i.summary.substring(0,55)}...
              </div>)
          }
        </div>
      </div>

      {aging3.length>0 && (
        <div className="card" style={{padding:"1rem"}}>
          <h3 style={{color:"#ffd60a",fontFamily:"'Syne',sans-serif",fontSize:"0.85rem",marginBottom:"0.6rem"}}>📅 Ageing Risks (3+ days open)</h3>
          {aging3.slice(0,6).map(i=>(
            <div key={i.id} style={{display:"flex",gap:"0.5rem",alignItems:"center",fontSize:"0.73rem",color:"#94a3b8",marginBottom:"0.3rem"}}>
              <SevBadge s={i.severity}/>
              <span style={{fontFamily:"'IBM Plex Mono',monospace",color:"#ffd60a",flexShrink:0}}>{i.id}</span>
              <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{i.summary}</span>
              <span style={{color:"#c084fc",flexShrink:0,fontFamily:"'IBM Plex Mono',monospace"}}>{Math.round(daysAgo(i.dateOpened))}d</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── WA CONVERTER ────────────────────────────────────────────────────── */
function WAConvert({waText,setWaText,waParsed,waLoading,onConvert,onUse}) {
  const inp = {background:"#0f1c33",border:"1px solid #1a2e4a",borderRadius:7,padding:"0.45rem 0.7rem",color:"#e2e8f0",fontSize:"0.83rem"};
  return (
    <div className="fadein" style={{maxWidth:820,margin:"0 auto",padding:"1rem 0"}}>
      <h2 style={{fontFamily:"'Syne',sans-serif",color:"#e2e8f0",marginBottom:"0.4rem",fontSize:"1.1rem"}}>💬 WhatsApp / Chat Issue Converter</h2>
      <p style={{color:"#475569",fontSize:"0.8rem",marginBottom:"1rem"}}>Paste any WhatsApp message, chat excerpt, or email text — AI extracts it into a structured issue ticket instantly.</p>

      <div className="card" style={{padding:"1rem",marginBottom:"1rem"}}>
        <label style={{fontSize:"0.72rem",color:"#475569",textTransform:"uppercase",letterSpacing:"0.06em",display:"block",marginBottom:"0.4rem"}}>Paste message here</label>
        <textarea value={waText} onChange={e=>setWaText(e.target.value)} rows={6}
          placeholder={`Example:\n"Rahul bhai – Live TV Ch.201 audio has been dropping for past 20 mins. Many customers calling. Please check ASAP. Also check Binge stream quality for same – might be CDN issue in Mumbai. Super urgent!"`}
          style={{...inp,width:"100%",resize:"vertical",lineHeight:1.65}}/>
        <button className="btn btn-cyan" onClick={onConvert} disabled={waLoading||!waText.trim()} style={{marginTop:"0.8rem",opacity:(waLoading||!waText.trim())?0.5:1}}>
          {waLoading ? "🔄 Parsing with AI..." : "⚡ Convert to Issue"}
        </button>
      </div>

      {waParsed && (
        <div className="card fadein" style={{padding:"1rem",borderColor:"rgba(0,229,255,0.28)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.8rem"}}>
            <h3 style={{color:"#00e5ff",fontFamily:"'Syne',sans-serif",fontSize:"0.9rem"}}>✅ Extracted Issue</h3>
            <button className="btn btn-cyan" onClick={onUse}>Use → Open Log Form</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem"}}>
            {Object.entries(waParsed).filter(([k,v])=>v!=null&&k!=="isNew").map(([k,v])=>(
              <div key={k} style={{background:"#0f1c33",borderRadius:6,padding:"0.45rem 0.65rem"}}>
                <div style={{fontSize:"0.62rem",color:"#334155",textTransform:"uppercase",letterSpacing:"0.06em"}}>{k}</div>
                <div style={{fontSize:"0.78rem",color:"#e2e8f0",fontWeight:600,marginTop:"0.1rem"}}>{String(v)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{padding:"1rem",marginTop:"1rem",borderColor:"rgba(255,214,10,0.18)"}}>
        <h3 style={{color:"#ffd60a",fontFamily:"'Syne',sans-serif",fontSize:"0.85rem",marginBottom:"0.6rem"}}>💡 Tips for Quick Logging</h3>
        <div style={{fontSize:"0.77rem",color:"#64748b",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.4rem"}}>
          {["Forward WhatsApp chats directly and paste here","Works with email text, Slack messages, meeting notes","AI infers severity from urgency keywords","Always review before final logging","You can edit all fields in the form before saving","Use for batch backlog clearing of old chats"].map((t,i)=>(
            <div key={i} style={{display:"flex",gap:"0.4rem",alignItems:"flex-start"}}>
              <span style={{color:"#ffd60a",flexShrink:0}}>→</span><span>{t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── ISSUE FORM MODAL ────────────────────────────────────────────────── */
function IssueForm({init,onSave,onClose}) {
  const isEdit = init && !init.isNew;
  const def = {source:"WhatsApp",vertical:"NOC",platform:"",summary:"",severity:"P2",clientImpact:"",reportedBy:"",owner:"Self",dependencyOwner:"",eta:"",nextFollowUp:"",status:"Open",closureDate:"",remarks:""};
  const [form,setForm] = useState(isEdit ? {...def,...init,eta:toLocal(init.eta),nextFollowUp:toLocal(init.nextFollowUp),closureDate:toLocal(init.closureDate)} : {...def,...(init||{})});
  const fld = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleSave = () => {
    if(!form.summary.trim()) return alert("Issue summary is required.");
    onSave({...form, eta:toISO(form.eta), nextFollowUp:toISO(form.nextFollowUp), closureDate:toISO(form.closureDate)});
  };

  const inp = {background:"#0c1731",border:"1px solid #1a2e4a",borderRadius:7,padding:"0.4rem 0.65rem",color:"#e2e8f0",fontSize:"0.83rem",width:"100%"};
  const lbl = {fontSize:"0.67rem",color:"#475569",display:"block",marginBottom:"0.25rem",textTransform:"uppercase",letterSpacing:"0.06em"};

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="fadein" style={{background:"#0c1428",border:"1px solid #1a2e4a",borderRadius:16,width:"100%",maxWidth:720,maxHeight:"92vh",overflowY:"auto",padding:"1.5rem",boxShadow:"0 8px 60px rgba(0,0,0,0.7)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.25rem"}}>
          <div>
            <h2 style={{fontFamily:"'Syne',sans-serif",color:"#e2e8f0",fontSize:"1.05rem"}}>{isEdit?"✏️ Edit Issue":"➕ Log New Issue"}</h2>
            {isEdit && <span style={{fontFamily:"'IBM Plex Mono',monospace",color:"#00e5ff",fontSize:"0.78rem"}}>{init.id}</span>}
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{padding:"0.2rem 0.5rem"}}>✕</button>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.7rem"}}>
          <div><label style={lbl}>Source *</label>
            <select style={inp} value={form.source} onChange={e=>fld("source",e.target.value)}>
              {SOURCES.map(s=><option key={s}>{s}</option>)}
            </select></div>
          <div><label style={lbl}>Vertical *</label>
            <select style={inp} value={form.vertical} onChange={e=>fld("vertical",e.target.value)}>
              {VERTICALS.map(s=><option key={s}>{s}</option>)}
            </select></div>
          <div><label style={lbl}>Platform / Application</label>
            <input style={inp} value={form.platform} onChange={e=>fld("platform",e.target.value)} placeholder="Live TV, Binge, DRM..."/></div>
          <div><label style={lbl}>Severity *</label>
            <select style={{...inp,color:SEV[form.severity]?.color||"#e2e8f0",fontWeight:700}} value={form.severity} onChange={e=>fld("severity",e.target.value)}>
              {SEVERITIES.map(s=><option key={s}>{s}</option>)}
            </select></div>
          <div style={{gridColumn:"1/-1"}}><label style={lbl}>Issue Summary *</label>
            <textarea style={{...inp,minHeight:70,resize:"vertical"}} value={form.summary} onChange={e=>fld("summary",e.target.value)} placeholder="Concise description of the issue..."/></div>
          <div style={{gridColumn:"1/-1"}}><label style={lbl}>Client Impact</label>
            <input style={inp} value={form.clientImpact} onChange={e=>fld("clientImpact",e.target.value)} placeholder="Who/what is affected and how..."/></div>
          <div><label style={lbl}>Reported By</label>
            <input style={inp} value={form.reportedBy} onChange={e=>fld("reportedBy",e.target.value)} placeholder="Name or team..."/></div>
          <div><label style={lbl}>Owner</label>
            <select style={inp} value={form.owner} onChange={e=>fld("owner",e.target.value)}>
              {OWNERS.map(o=><option key={o}>{o}</option>)}
            </select></div>
          <div><label style={lbl}>Dependency Owner</label>
            <input style={inp} value={form.dependencyOwner} onChange={e=>fld("dependencyOwner",e.target.value)} placeholder="Partner / vendor / team..."/></div>
          <div><label style={lbl}>Status</label>
            <select style={{...inp,color:STATUS_COLOR[form.status]||"#e2e8f0",fontWeight:600}} value={form.status} onChange={e=>fld("status",e.target.value)}>
              {STATUSES.map(s=><option key={s}>{s}</option>)}
            </select></div>
          <div><label style={lbl}>ETA</label>
            <input type="datetime-local" style={inp} value={form.eta} onChange={e=>fld("eta",e.target.value)}/></div>
          <div><label style={lbl}>Next Follow-up</label>
            <input type="datetime-local" style={inp} value={form.nextFollowUp} onChange={e=>fld("nextFollowUp",e.target.value)}/></div>
          <div style={{gridColumn:"1/-1"}}><label style={lbl}>Remarks / Current Update</label>
            <textarea style={{...inp,minHeight:60,resize:"vertical"}} value={form.remarks} onChange={e=>fld("remarks",e.target.value)} placeholder="Actions taken, updates, blockers..."/></div>
        </div>

        <div style={{display:"flex",justifyContent:"flex-end",gap:"0.5rem",marginTop:"1.2rem",borderTop:"1px solid #1a2e4a",paddingTop:"1rem"}}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-cyan" onClick={handleSave}>{isEdit ? "💾 Save Changes" : "🚀 Log Issue"}</button>
        </div>
      </div>
    </div>
  );
}
