import { useState, useEffect, useMemo, useCallback } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts";

// ── Supabase ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

const sbFetch = (path, opts = {}) => fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
  ...opts,
  headers: {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    "Prefer": opts.prefer || "return=representation",
  },
});

const db = {
  async fetchAll()        { const r=await sbFetch("expenses?select=*&order=created_at.desc"); if(!r.ok)throw new Error(await r.text()); return r.json(); },
  async fetchAccounts()   { const r=await sbFetch("accounts?select=*&order=name.asc"); if(!r.ok)throw new Error(await r.text()); return r.json(); },
  async fetchSubcats()    { const r=await sbFetch("subcategories?select=*&order=name.asc"); if(!r.ok)throw new Error(await r.text()); return r.json(); },
  async insertExpense(e)  { const r=await sbFetch("expenses",{method:"POST",body:JSON.stringify({category:e.category,subcategory:e.subcategory,amount:e.amount,date:e.date,bank:e.bank,note:e.note||""})}); if(!r.ok)throw new Error(await r.text()); return (await r.json())[0]; },
  async deleteExpense(id) { const r=await sbFetch(`expenses?id=eq.${id}`,{method:"DELETE",prefer:"return=minimal"}); if(!r.ok)throw new Error(await r.text()); },
  async insertAccount(name)     { const r=await sbFetch("accounts",{method:"POST",body:JSON.stringify({name})}); if(!r.ok)throw new Error(await r.text()); return (await r.json())[0]; },
  async deleteAccount(id)       { const r=await sbFetch(`accounts?id=eq.${id}`,{method:"DELETE",prefer:"return=minimal"}); if(!r.ok)throw new Error(await r.text()); },
  async insertSubcat(category,name) { const r=await sbFetch("subcategories",{method:"POST",body:JSON.stringify({category,name})}); if(!r.ok)throw new Error(await r.text()); return (await r.json())[0]; },
  async deleteSubcat(id)        { const r=await sbFetch(`subcategories?id=eq.${id}`,{method:"DELETE",prefer:"return=minimal"}); if(!r.ok)throw new Error(await r.text()); },
  async migrateFromLocal() {
    try {
      const raw=localStorage.getItem("fintrack_v2"); if(!raw)return 0;
      const items=JSON.parse(raw); if(!items.length)return 0;
      for(const item of items){try{await db.insertExpense(item);}catch{}}
      localStorage.removeItem("fintrack_v2"); return items.length;
    } catch{return 0;}
  }
};

// ── Constants ─────────────────────────────────────────────────────────────────
const CAT_META = {
  Needs:       { color:"#34d399", icon:"🏠" },
  Wants:       { color:"#fb923c", icon:"✨" },
  Investments: { color:"#60a5fa", icon:"📈" },
};
const CAT_COLORS = { Needs:"#34d399", Wants:"#fb923c", Investments:"#60a5fa" };
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const fmt = n => { if(!n)return"₹0"; if(n>=100000)return`₹${(n/100000).toFixed(1)}L`; if(n>=1000)return`₹${(n/1000).toFixed(1)}K`; return`₹${Math.round(n).toLocaleString("en-IN")}`; };
const fmtDate = s => new Date(s).toLocaleDateString("en-IN",{day:"numeric",month:"short"});
const getMonthExp = (expenses,month,year) => expenses.filter(e=>{const d=new Date(e.date);return d.getMonth()===month&&d.getFullYear()===year;});

// ── Excel Export ──────────────────────────────────────────────────────────────
async function exportToExcel(expenses) {
  if(!window.XLSX){await new Promise((res,rej)=>{const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";s.onload=res;s.onerror=rej;document.head.appendChild(s);});}
  const XLSX=window.XLSX, wb=XLSX.utils.book_new(), HDR=["Date","Category","Subcategory","Amount (₹)","Bank","Note"], toRow=e=>[e.date,e.category,e.subcategory,e.amount,e.bank,e.note||""], CW=[{wch:12},{wch:14},{wch:16},{wch:14},{wch:16},{wch:26}];
  const wsAll=XLSX.utils.aoa_to_sheet([HDR,...[...expenses].sort((a,b)=>new Date(a.date)-new Date(b.date)).map(toRow)]); wsAll["!cols"]=CW;
  XLSX.utils.book_append_sheet(wb,wsAll,"All Expenses");
  const grouped={};
  expenses.forEach(e=>{const d=new Date(e.date);const k=`${MONTHS[d.getMonth()]} ${d.getFullYear()}`;(grouped[k]=grouped[k]||[]).push(e);});
  Object.entries(grouped).sort().forEach(([label,rows])=>{
    const s=[...rows].sort((a,b)=>new Date(a.date)-new Date(b.date));
    const n=s.filter(e=>e.category==="Needs").reduce((a,b)=>a+b.amount,0), w=s.filter(e=>e.category==="Wants").reduce((a,b)=>a+b.amount,0), i=s.filter(e=>e.category==="Investments").reduce((a,b)=>a+b.amount,0);
    const ws=XLSX.utils.aoa_to_sheet([HDR,...s.map(toRow),[],["","","🏠 Needs",n,"",""],["","","✨ Wants",w,"",""],["","","📈 Investments",i,"",""],["","","TOTAL",n+w+i,"",""]]);
    ws["!cols"]=CW; XLSX.utils.book_append_sheet(wb,ws,label);
  });
  XLSX.writeFile(wb,`FinanceTracker_${new Date().toISOString().split("T")[0]}.xlsx`);
}

// ════════════════════════════════════════════════════════════════════════════════
// GLOBAL STYLES
// ════════════════════════════════════════════════════════════════════════════════
const GS = () => <style>{`
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  :root{--bg:#0a0b0f;--surface:#13151c;--surface2:#1b1e29;--border:rgba(255,255,255,0.07);--text:#eef0f8;--muted:rgba(238,240,248,0.38);--accent:#818cf8;}
  body{background:var(--bg);font-family:'Outfit',sans-serif;color:var(--text);}
  button{cursor:pointer;} input,select,textarea{font-family:'Outfit',sans-serif;}
  ::-webkit-scrollbar{width:0;height:0;}
  .fade{animation:fadeUp .25s ease both;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
  .spin{animation:spin 1s linear infinite;display:inline-block;}
  @keyframes spin{to{transform:rotate(360deg)}}
`}</style>;

// ════════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════════════════════════════════════
function Dashboard({ expenses, selMonth, setSelMonth, onGoEntries, onExport, exporting }) {
  const {month,year}=selMonth;
  const monthExp=useMemo(()=>getMonthExp(expenses,month,year),[expenses,month,year]);
  const totals=useMemo(()=>{const t={Needs:0,Wants:0,Investments:0};monthExp.forEach(e=>{if(t[e.category]!==undefined)t[e.category]+=e.amount;});return t;},[monthExp]);
  const total=totals.Needs+totals.Wants+totals.Investments;
  const pieData=Object.entries(totals).filter(([,v])=>v>0).map(([k,v])=>({name:k,value:v}));
  const subBreakdown=useMemo(()=>{const m={};monthExp.forEach(e=>{const k=`${e.category}__${e.subcategory}`;m[k]=(m[k]||0)+e.amount;});return m;},[monthExp]);
  const barData=useMemo(()=>{
    const result=[];let y=2026,m=0;const now=new Date();
    while(y<now.getFullYear()||(y===now.getFullYear()&&m<=now.getMonth())){
      const ex=getMonthExp(expenses,m,y);
      result.push({label:MONTHS[m],month:m,year:y,needs:ex.filter(e=>e.category==="Needs").reduce((a,b)=>a+b.amount,0),wants:ex.filter(e=>e.category==="Wants").reduce((a,b)=>a+b.amount,0),invest:ex.filter(e=>e.category==="Investments").reduce((a,b)=>a+b.amount,0)});
      m++;if(m>11){m=0;y++;}
    }
    return result;
  },[expenses]);
  const prevM=()=>{let m=month-1,y=year;if(m<0){m=11;y--;}if(y<2026)return;setSelMonth({month:m,year:y});};
  const nextM=()=>{const now=new Date();let m=month+1,y=year;if(m>11){m=0;y++;}if(y>now.getFullYear()||(y===now.getFullYear()&&m>now.getMonth()))return;setSelMonth({month:m,year:y});};

  return <div style={{padding:"22px 16px 0"}} className="fade">
    <style>{`
      .dh{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;}
      .dh-l .t{font-size:21px;font-weight:800;letter-spacing:-0.02em;}
      .sb-badge{display:flex;align-items:center;gap:5px;font-size:10px;color:rgba(52,211,153,0.7);font-family:'JetBrains Mono',monospace;margin-top:3px;}
      .sb-dot{width:5px;height:5px;border-radius:50%;background:#34d399;box-shadow:0 0 5px #34d399;}
      .dh-r{display:flex;flex-direction:column;align-items:flex-end;gap:8px;}
      .mnav{display:flex;align-items:center;gap:8px;}
      .mb{background:var(--surface2);border:1px solid var(--border);border-radius:8px;width:28px;height:28px;color:var(--text);font-size:13px;display:flex;align-items:center;justify-content:center;}
      .mb:hover{background:var(--surface);}
      .ml{font-size:13px;font-weight:600;min-width:76px;text-align:center;font-family:'JetBrains Mono',monospace;}
      .exbtn{display:flex;align-items:center;gap:5px;background:rgba(52,211,153,0.1);border:1px solid rgba(52,211,153,0.25);border-radius:8px;padding:5px 10px;color:#34d399;font-family:'Outfit',sans-serif;font-size:11px;font-weight:700;transition:all .2s;white-space:nowrap;}
      .exbtn:hover{background:rgba(52,211,153,0.18);}
      .tc{background:linear-gradient(135deg,#1b1e2e,#12141f);border:1px solid rgba(129,140,248,0.18);border-radius:20px;padding:22px;margin-bottom:16px;position:relative;overflow:hidden;}
      .tc::before{content:'';position:absolute;top:-50px;right:-50px;width:160px;height:160px;background:radial-gradient(circle,rgba(129,140,248,0.13),transparent 70%);border-radius:50%;}
      .tl{font-size:11px;color:var(--muted);font-family:'JetBrains Mono',monospace;letter-spacing:.1em;text-transform:uppercase;}
      .ta{font-size:38px;font-weight:800;margin:4px 0 14px;letter-spacing:-0.03em;}
      .cpills{display:flex;gap:7px;flex-wrap:wrap;}
      .cpill{display:flex;align-items:center;gap:5px;background:rgba(255,255,255,0.06);border-radius:99px;padding:4px 11px;font-size:11px;font-weight:600;}
      .cdot{width:6px;height:6px;border-radius:50%;}
      .sec{font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.09em;margin-bottom:11px;font-family:'JetBrains Mono',monospace;}
      .pr{display:flex;align-items:center;gap:14px;margin-bottom:18px;}
      .leg{flex:1;display:flex;flex-direction:column;gap:9px;}
      .li{display:flex;align-items:center;justify-content:space-between;}
      .ll{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:500;min-width:80px;}
      .lbw{flex:1;height:3px;background:rgba(255,255,255,0.07);border-radius:99px;margin:0 8px;overflow:hidden;}
      .lb{height:100%;border-radius:99px;transition:width .5s ease;}
      .lv{font-size:11px;font-family:'JetBrains Mono',monospace;color:var(--muted);}
      .sg{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:18px;}
      .sc{background:var(--surface);border:1px solid var(--border);border-radius:13px;padding:11px 13px;border-left-width:3px;}
      .scc{font-size:9px;color:var(--muted);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.08em;}
      .scn{font-size:13px;font-weight:700;margin:2px 0;}
      .sca{font-size:14px;font-weight:700;font-family:'JetBrains Mono',monospace;}
      .bc{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:14px;margin-bottom:18px;}
      .bl{display:flex;gap:14px;justify-content:center;margin-top:8px;}
      .bli{display:flex;align-items:center;gap:4px;font-size:11px;color:var(--muted);}
      .bld{width:8px;height:8px;border-radius:2px;}
      .vb{width:100%;padding:14px;background:var(--surface2);border:1px solid var(--border);border-radius:14px;color:var(--text);font-family:'Outfit',sans-serif;font-size:14px;font-weight:600;margin-bottom:16px;transition:all .2s;}
      .vb:hover{background:var(--surface);border-color:rgba(129,140,248,.3);}
      .emp{text-align:center;padding:40px 20px;color:var(--muted);}
      .empi{font-size:38px;margin-bottom:10px;}
      .empt{font-size:15px;font-weight:700;color:var(--text);margin-bottom:4px;}
    `}</style>
    <div className="dh">
      <div className="dh-l"><div className="t">Finance Tracker</div><div className="sb-badge"><span className="sb-dot"/>Supabase · Live</div></div>
      <div className="dh-r">
        <div className="mnav"><button className="mb" onClick={prevM}>‹</button><div className="ml">{MONTHS[month]} {year}</div><button className="mb" onClick={nextM}>›</button></div>
        <button className="exbtn" onClick={onExport} disabled={exporting}>{exporting?<span className="spin">⟳</span>:"⬇"} Export Excel</button>
      </div>
    </div>
    <div className="tc">
      <div className="tl">Total Spent</div>
      <div className="ta">{fmt(total)}</div>
      <div className="cpills">
        {Object.entries(totals).map(([cat,val])=>(
          <div className="cpill" key={cat}><div className="cdot" style={{background:CAT_COLORS[cat]}}/>{CAT_META[cat].icon} {cat}<span style={{color:CAT_COLORS[cat],fontFamily:"JetBrains Mono,monospace"}}>{fmt(val)}</span></div>
        ))}
      </div>
    </div>
    {monthExp.length===0?(
      <div className="emp"><div className="empi">📭</div><div className="empt">No entries for {MONTHS[month]} {year}</div><div>Tap + to add your first expense</div></div>
    ):(<>
      {pieData.length>0&&<><div className="sec">Breakdown</div>
        <div className="pr">
          <div style={{width:120,height:120,flexShrink:0}}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={34} outerRadius={54} dataKey="value" strokeWidth={0}>{pieData.map(e=><Cell key={e.name} fill={CAT_COLORS[e.name]}/>)}</Pie><Tooltip formatter={v=>fmt(v)} contentStyle={{background:"#1b1e29",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,fontFamily:"Outfit"}}/></PieChart>
            </ResponsiveContainer>
          </div>
          <div className="leg">{Object.entries(totals).map(([cat,val])=>(
            <div className="li" key={cat}><div className="ll"><div className="cdot" style={{background:CAT_COLORS[cat]}}/>{cat}</div><div className="lbw"><div className="lb" style={{width:`${total?(val/total)*100:0}%`,background:CAT_COLORS[cat]}}/></div><div className="lv">{total?Math.round((val/total)*100):0}%</div></div>
          ))}</div>
        </div>
      </>}
      {Object.keys(subBreakdown).length>0&&<><div className="sec">Top Items</div>
        <div className="sg">{Object.entries(subBreakdown).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([key,val])=>{
          const [cat,sub]=key.split("__");
          return <div className="sc" key={key} style={{borderLeftColor:CAT_COLORS[cat]}}><div className="scc">{cat}</div><div className="scn">{sub}</div><div className="sca" style={{color:CAT_COLORS[cat]}}>{fmt(val)}</div></div>;
        })}</div>
      </>}
    </>)}
    {barData.some(d=>d.needs+d.wants+d.invest>0)&&<>
      <div className="sec">Monthly Overview · 2026</div>
      <div className="bc">
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={barData} barSize={7} barGap={2} onClick={d=>d?.activePayload&&setSelMonth({month:d.activePayload[0].payload.month,year:d.activePayload[0].payload.year})}>
            <XAxis dataKey="label" tick={{fill:"rgba(238,240,248,0.35)",fontSize:10,fontFamily:"JetBrains Mono"}} axisLine={false} tickLine={false}/>
            <YAxis hide/>
            <Tooltip formatter={(v,n)=>[fmt(v),n.charAt(0).toUpperCase()+n.slice(1)]} contentStyle={{background:"#1b1e29",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,fontFamily:"Outfit",fontSize:12}} cursor={{fill:"rgba(255,255,255,0.03)"}}/>
            <Bar dataKey="needs" fill="#34d399" radius={[3,3,0,0]}/><Bar dataKey="wants" fill="#fb923c" radius={[3,3,0,0]}/><Bar dataKey="invest" fill="#60a5fa" radius={[3,3,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
        <div className="bl">{[["Needs","#34d399"],["Wants","#fb923c"],["Investments","#60a5fa"]].map(([l,c])=><div className="bli" key={l}><div className="bld" style={{background:c}}/>{l}</div>)}</div>
      </div>
    </>}
    <button className="vb" onClick={onGoEntries}>View All Entries for {MONTHS[month]} →</button>
  </div>;
}

// ════════════════════════════════════════════════════════════════════════════════
// ADD EXPENSE
// ════════════════════════════════════════════════════════════════════════════════
function AddExpense({ onAdd, onCancel, saving, accounts, subcatMap }) {
  const [category,setCategory]=useState("Needs");
  const [subcategory,setSub]=useState("");
  const [amount,setAmount]=useState("");
  const [date,setDate]=useState(()=>new Date().toISOString().split("T")[0]);
  const [bank,setBank]=useState(accounts[0]?.name||"");
  const [note,setNote]=useState("");
  const [error,setError]=useState("");

  // Set default sub when category changes
  useEffect(()=>{
    const subs=subcatMap[category]||[];
    setSub(subs[0]?.name||"");
  },[category,subcatMap]);

  useEffect(()=>{ if(accounts.length>0&&!bank) setBank(accounts[0].name); },[accounts]);

  const color=CAT_COLORS[category];
  const subs=subcatMap[category]||[];

  const submit=()=>{
    if(!amount||isNaN(amount)||Number(amount)<=0){setError("Enter a valid amount");return;}
    if(!subcategory){setError("Pick a subcategory");return;}
    if(!bank){setError("Pick an account");return;}
    setError("");
    onAdd({category,subcategory,amount:Number(amount),date,bank,note:note.trim()});
  };

  return <div style={{padding:"22px 16px"}} className="fade">
    <style>{`
      .ah{display:flex;align-items:center;gap:12px;margin-bottom:26px;}
      .abk{background:var(--surface2);border:1px solid var(--border);border-radius:10px;width:36px;height:36px;color:var(--text);font-size:15px;display:flex;align-items:center;justify-content:center;}
      .atit{font-size:20px;font-weight:800;}
      .flbl{font-size:11px;font-weight:600;color:var(--muted);letter-spacing:.1em;text-transform:uppercase;font-family:'JetBrains Mono',monospace;margin-bottom:8px;}
      .fg{margin-bottom:20px;}
      .ctabs{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;}
      .ctab{padding:12px 8px;border-radius:14px;border:2px solid var(--border);background:var(--surface);color:var(--muted);font-family:'Outfit',sans-serif;font-size:12px;font-weight:700;text-align:center;transition:all .2s;}
      .ctab .ti{font-size:20px;display:block;margin-bottom:4px;}
      .ctab.act{color:var(--text);}
      /* KEY FIX: flex-wrap so chips go to next line */
      .ss{display:flex;gap:7px;flex-wrap:wrap;padding-bottom:2px;}
      .sch{padding:6px 13px;border-radius:99px;border:1px solid var(--border);background:var(--surface);color:var(--muted);font-family:'Outfit',sans-serif;font-size:13px;font-weight:600;white-space:nowrap;transition:all .15s;}
      .aiw{background:var(--surface);border:2px solid var(--border);border-radius:16px;display:flex;align-items:center;padding:0 12px;transition:border-color .2s;}
      .aiw:focus-within{border-color:var(--accent);}
      .rs{font-size:22px;font-weight:700;color:var(--muted);margin-right:7px;}
      .ai{background:none;border:none;outline:none;font-family:'JetBrains Mono',monospace;font-size:26px;font-weight:700;color:var(--text);width:100%;padding:15px 0;}
      .ai::-webkit-outer-spin-button,.ai::-webkit-inner-spin-button{-webkit-appearance:none;margin:0;}
      .ai[type=number]{-moz-appearance:textfield;}
      .amt-stepper{display:flex;flex-direction:column;gap:3px;margin-left:6px;}
      .amt-step{background:var(--surface2);border:1px solid var(--border);border-radius:6px;width:26px;height:22px;color:var(--muted);font-size:13px;display:flex;align-items:center;justify-content:center;transition:all .15s;line-height:1;}
      .amt-step:hover{background:var(--accent);border-color:var(--accent);color:white;}
      .rw{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
      .sf,.df{background:var(--surface);border:2px solid var(--border);border-radius:13px;padding:12px 13px;color:var(--text);font-family:'Outfit',sans-serif;font-size:14px;font-weight:500;width:100%;outline:none;transition:border-color .2s;-webkit-appearance:none;appearance:none;}
      .sf:focus,.df:focus{border-color:var(--accent);} .sf option{background:#1b1e29;}
      .ni2{background:var(--surface);border:2px solid var(--border);border-radius:13px;padding:13px;color:var(--text);font-family:'Outfit',sans-serif;font-size:14px;width:100%;outline:none;resize:none;height:70px;transition:border-color .2s;}
      .ni2:focus{border-color:var(--accent);} .ni2::placeholder{color:var(--muted);}
      .er{color:#f87171;font-size:12px;margin:4px 0 8px;}
      .svb{width:100%;padding:16px;border-radius:16px;border:none;font-family:'Outfit',sans-serif;font-size:16px;font-weight:700;transition:all .2s;color:#0a0b0f;margin-top:6px;display:flex;align-items:center;justify-content:center;gap:8px;}
      .svb:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 22px rgba(0,0,0,.35);}
      .svb:disabled{opacity:.6;}
      .no-subs{font-size:13px;color:var(--muted);padding:8px 0;}
    `}</style>
    <div className="ah"><button className="abk" onClick={onCancel}>←</button><div className="atit">Add Expense</div></div>
    <div className="fg">
      <div className="flbl">Category</div>
      <div className="ctabs">
        {Object.entries(CAT_META).map(([cat,{icon}])=>(
          <button key={cat} className={`ctab${category===cat?" act":""}`} style={category===cat?{borderColor:CAT_COLORS[cat],background:`${CAT_COLORS[cat]}18`}:{}} onClick={()=>setCategory(cat)}>
            <span className="ti">{icon}</span>{cat}
          </button>
        ))}
      </div>
    </div>
    <div className="fg">
      <div className="flbl">Subcategory</div>
      {subs.length===0
        ? <div className="no-subs">No subcategories yet — add them in Personalise tab.</div>
        : <div className="ss">
            {subs.map(s=>(
              <button key={s.id} className={`sch${subcategory===s.name?" act":""}`}
                style={subcategory===s.name?{borderColor:color,background:`${color}22`,color}:{}}
                onClick={()=>setSub(s.name)}>{s.name}</button>
            ))}
          </div>
      }
    </div>
    <div className="fg">
      <div className="flbl">Amount</div>
      <div className="aiw">
        <span className="rs">₹</span>
        <input className="ai" type="number" placeholder="0" value={amount} onChange={e=>setAmount(e.target.value)} min="0"/>
        <div className="amt-stepper">
          <button className="amt-step" onClick={()=>setAmount(v=>String(Math.max(0,(Number(v)||0)+100)))}>▲</button>
          <button className="amt-step" onClick={()=>setAmount(v=>String(Math.max(0,(Number(v)||0)-100)))}>▼</button>
        </div>
      </div>
    </div>
    <div className="fg">
      <div className="rw">
        <div><div className="flbl">Date</div><input className="df" type="date" value={date} onChange={e=>setDate(e.target.value)} style={{colorScheme:"dark"}}/></div>
        <div>
          <div className="flbl">Account</div>
          <select className="sf" value={bank} onChange={e=>setBank(e.target.value)}>
            {accounts.length===0 ? <option>No accounts</option> : accounts.map(a=><option key={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>
    </div>
    <div className="fg"><div className="flbl">Note (optional)</div><textarea className="ni2" placeholder="Add a note..." value={note} onChange={e=>setNote(e.target.value)}/></div>
    {error&&<div className="er">⚠ {error}</div>}
    <button className="svb" style={{background:`linear-gradient(135deg,${color},${color}bb)`}} onClick={submit} disabled={saving||subs.length===0||accounts.length===0}>
      {saving?<><span className="spin" style={{filter:"invert(1)"}}>⟳</span> Saving…</>:"Save Expense"}
    </button>
  </div>;
}

// ════════════════════════════════════════════════════════════════════════════════
// MONTH VIEW
// ════════════════════════════════════════════════════════════════════════════════
function MonthView({ expenses, selMonth, setSelMonth, onDelete, onBack }) {
  const {month,year}=selMonth;
  const [filterCat,setFilter]=useState("All");
  const [confirmDel,setConfDel]=useState(null);
  const monthExp=useMemo(()=>getMonthExp(expenses,month,year).sort((a,b)=>new Date(b.date)-new Date(a.date)),[expenses,month,year]);
  const filtered=filterCat==="All"?monthExp:monthExp.filter(e=>e.category===filterCat);
  const totals=useMemo(()=>{const t={Needs:0,Wants:0,Investments:0,total:0};monthExp.forEach(e=>{t[e.category]=(t[e.category]||0)+e.amount;t.total+=e.amount;});return t;},[monthExp]);
  const prevM=()=>{let m=month-1,y=year;if(m<0){m=11;y--;}if(y<2026)return;setSelMonth({month:m,year:y});};
  const nextM=()=>{const now=new Date();let m=month+1,y=year;if(m>11){m=0;y++;}if(y>now.getFullYear()||(y===now.getFullYear()&&m>now.getMonth()))return;setSelMonth({month:m,year:y});};
  return <div style={{padding:"22px 16px 0"}} className="fade">
    <style>{`
      .mvh{display:flex;align-items:center;gap:10px;margin-bottom:18px;}
      .mvbk{background:var(--surface2);border:1px solid var(--border);border-radius:10px;width:36px;height:36px;color:var(--text);font-size:15px;display:flex;align-items:center;justify-content:center;}
      .mvt{font-size:20px;font-weight:800;}
      .mvnav{margin-left:auto;display:flex;align-items:center;gap:8px;}
      .mvnav button{background:var(--surface2);border:1px solid var(--border);border-radius:8px;width:28px;height:28px;color:var(--text);font-size:13px;display:flex;align-items:center;justify-content:center;}
      .mvnl{font-size:12px;font-weight:600;min-width:72px;text-align:center;font-family:'JetBrains Mono',monospace;}
      .strip{display:flex;gap:7px;margin-bottom:14px;}
      .si{flex:1;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:9px 10px;}
      .sil{font-size:9px;color:var(--muted);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.08em;}
      .siv{font-size:13px;font-weight:700;margin-top:2px;font-family:'JetBrains Mono',monospace;}
      .frow{display:flex;gap:6px;margin-bottom:14px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px;}
      .fc{padding:5px 13px;border-radius:99px;border:1px solid var(--border);background:var(--surface);color:var(--muted);font-family:'Outfit',sans-serif;font-size:12px;font-weight:600;white-space:nowrap;flex-shrink:0;transition:all .15s;}
      .fc.act{color:var(--text);border-color:var(--accent);background:rgba(129,140,248,.1);}
      .elist{display:flex;flex-direction:column;gap:7px;}
      .ecard{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:13px;display:flex;align-items:center;gap:11px;animation:fadeUp .2s ease;}
      .eico{width:38px;height:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;}
      .einf{flex:1;min-width:0;}
      .esub{font-size:14px;font-weight:700;}
      .emeta{font-size:10px;color:var(--muted);margin-top:2px;display:flex;gap:5px;align-items:center;flex-wrap:wrap;}
      .ebank{background:var(--surface2);padding:2px 6px;border-radius:99px;font-family:'JetBrains Mono',monospace;}
      .enote{font-style:italic;opacity:.7;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100px;}
      .ert{text-align:right;flex-shrink:0;}
      .eamt{font-size:15px;font-weight:700;font-family:'JetBrains Mono',monospace;}
      .edt{font-size:10px;color:var(--muted);margin-top:2px;}
      .edel{background:none;border:none;color:rgba(248,113,113,.35);font-size:15px;padding:4px;transition:color .2s;}
      .edel:hover{color:#f87171;}
      .ov{position:fixed;inset:0;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;z-index:200;padding:20px;}
      .mod{background:var(--surface2);border:1px solid var(--border);border-radius:20px;padding:24px;max-width:290px;width:100%;}
      .mod-t{font-size:17px;font-weight:700;margin-bottom:8px;}
      .mod-s{font-size:13px;color:var(--muted);margin-bottom:18px;}
      .mod-b{display:flex;gap:8px;}
      .mc{flex:1;padding:12px;background:var(--surface);border:1px solid var(--border);border-radius:12px;color:var(--text);font-family:'Outfit',sans-serif;font-size:14px;font-weight:600;}
      .md{flex:1;padding:12px;background:rgba(248,113,113,.13);border:1px solid rgba(248,113,113,.3);border-radius:12px;color:#f87171;font-family:'Outfit',sans-serif;font-size:14px;font-weight:600;}
      .emv{text-align:center;padding:46px 20px;color:var(--muted);font-size:14px;}
    `}</style>
    <div className="mvh">
      <button className="mvbk" onClick={onBack}>←</button><div className="mvt">Entries</div>
      <div className="mvnav"><button onClick={prevM}>‹</button><div className="mvnl">{MONTHS[month]} {year}</div><button onClick={nextM}>›</button></div>
    </div>
    <div className="strip">
      {[["Total",totals.total,"#818cf8"],["Needs",totals.Needs,"#34d399"],["Wants",totals.Wants,"#fb923c"],["Invest",totals.Investments,"#60a5fa"]].map(([l,v,c])=>(
        <div className="si" key={l}><div className="sil">{l}</div><div className="siv" style={{color:c}}>{fmt(v||0)}</div></div>
      ))}
    </div>
    <div className="frow">
      {["All","Needs","Wants","Investments"].map(f=>(
        <button key={f} className={`fc${filterCat===f?" act":""}`} onClick={()=>setFilter(f)}>{f==="All"?"All":`${CAT_META[f].icon} ${f}`}</button>
      ))}
    </div>
    {filtered.length===0?<div className="emv">No entries found</div>:(
      <div className="elist">
        {filtered.map(e=>(
          <div className="ecard" key={e.id}>
            <div className="eico" style={{background:`${CAT_COLORS[e.category]}18`}}>{CAT_META[e.category]?.icon||"•"}</div>
            <div className="einf">
              <div className="esub">{e.subcategory}</div>
              <div className="emeta"><span style={{color:CAT_COLORS[e.category],fontWeight:600}}>{e.category}</span><span className="ebank">{e.bank}</span>{e.note&&<span className="enote">{e.note}</span>}</div>
            </div>
            <div className="ert"><div className="eamt" style={{color:CAT_COLORS[e.category]}}>−{fmt(e.amount)}</div><div className="edt">{fmtDate(e.date)}</div></div>
            <button className="edel" onClick={()=>setConfDel(e.id)}>✕</button>
          </div>
        ))}
      </div>
    )}
    {confirmDel&&(
      <div className="ov" onClick={()=>setConfDel(null)}>
        <div className="mod" onClick={e=>e.stopPropagation()}>
          <div className="mod-t">Delete entry?</div><div className="mod-s">Permanently deleted from Supabase.</div>
          <div className="mod-b"><button className="mc" onClick={()=>setConfDel(null)}>Cancel</button><button className="md" onClick={()=>{onDelete(confirmDel);setConfDel(null);}}>Delete</button></div>
        </div>
      </div>
    )}
  </div>;
}

// ════════════════════════════════════════════════════════════════════════════════
// PERSONALISE TAB
// ════════════════════════════════════════════════════════════════════════════════
function Personalise({ accounts, subcatMap, onAddAccount, onDeleteAccount, onAddSubcat, onDeleteSubcat }) {
  const [newAccount, setNewAccount] = useState("");
  const [activeSubCat, setActiveSubCat] = useState("Needs");
  const [newSubcat, setNewSubcat]   = useState("");
  const [accErr, setAccErr]   = useState("");
  const [subErr, setSubErr]   = useState("");

  const submitAccount = () => {
    const v = newAccount.trim();
    if (!v) { setAccErr("Enter account name"); return; }
    if (accounts.find(a=>a.name.toLowerCase()===v.toLowerCase())) { setAccErr("Already exists"); return; }
    setAccErr(""); setNewAccount("");
    onAddAccount(v);
  };

  const submitSubcat = () => {
    const v = newSubcat.trim();
    if (!v) { setSubErr("Enter subcategory name"); return; }
    const existing = subcatMap[activeSubCat]||[];
    if (existing.find(s=>s.name.toLowerCase()===v.toLowerCase())) { setSubErr("Already exists"); return; }
    setSubErr(""); setNewSubcat("");
    onAddSubcat(activeSubCat, v);
  };

  const color = CAT_COLORS[activeSubCat];

  return <div style={{padding:"22px 16px 0"}} className="fade">
    <style>{`
      .ph{font-size:21px;font-weight:800;letter-spacing:-0.02em;margin-bottom:4px;}
      .ps{font-size:12px;color:var(--muted);margin-bottom:24px;}
      .psec{font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.09em;font-family:'JetBrains Mono',monospace;margin-bottom:12px;}
      .pcard{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:16px;margin-bottom:20px;}
      .tag-wrap{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:14px;}
      .ptag{display:flex;align-items:center;gap:6px;background:var(--surface2);border:1px solid var(--border);border-radius:99px;padding:5px 12px;font-size:13px;font-weight:600;}
      .ptag-del{background:none;border:none;color:rgba(248,113,113,.4);font-size:13px;line-height:1;padding:0;transition:color .2s;}
      .ptag-del:hover{color:#f87171;}
      .add-row{display:flex;gap:8px;}
      .add-input{flex:1;background:var(--surface2);border:2px solid var(--border);border-radius:12px;padding:10px 14px;color:var(--text);font-family:'Outfit',sans-serif;font-size:14px;outline:none;transition:border-color .2s;}
      .add-input:focus{border-color:var(--accent);}
      .add-input::placeholder{color:var(--muted);}
      .add-btn{background:var(--accent);border:none;border-radius:12px;padding:10px 16px;color:white;font-family:'Outfit',sans-serif;font-size:14px;font-weight:700;transition:all .2s;white-space:nowrap;}
      .add-btn:hover{opacity:.85;}
      .perr{color:#f87171;font-size:12px;margin-top:6px;}
      .cat-tabs2{display:flex;gap:7px;margin-bottom:14px;flex-wrap:wrap;}
      .ct2{padding:6px 14px;border-radius:99px;border:2px solid var(--border);background:var(--surface2);color:var(--muted);font-family:'Outfit',sans-serif;font-size:12px;font-weight:700;transition:all .2s;}
      .ct2.act{color:var(--text);}
      .empty-tags{font-size:13px;color:var(--muted);padding:4px 0 10px;}
    `}</style>

    <div className="ph">Personalise</div>
    <div className="ps">Manage your accounts and expense categories</div>

    {/* ACCOUNTS */}
    <div className="psec">Bank Accounts</div>
    <div className="pcard">
      <div className="tag-wrap">
        {accounts.length===0 && <div className="empty-tags">No accounts yet</div>}
        {accounts.map(a=>(
          <div className="ptag" key={a.id}>
            🏦 {a.name}
            <button className="ptag-del" onClick={()=>onDeleteAccount(a.id)}>✕</button>
          </div>
        ))}
      </div>
      <div className="add-row">
        <input className="add-input" placeholder="e.g. Zerodha, PayTM..." value={newAccount} onChange={e=>{setNewAccount(e.target.value);setAccErr("");}} onKeyDown={e=>e.key==="Enter"&&submitAccount()}/>
        <button className="add-btn" onClick={submitAccount}>+ Add</button>
      </div>
      {accErr&&<div className="perr">⚠ {accErr}</div>}
    </div>

    {/* SUBCATEGORIES */}
    <div className="psec">Subcategories</div>
    <div className="pcard">
      <div className="cat-tabs2">
        {Object.entries(CAT_META).map(([cat,{icon}])=>(
          <button key={cat} className={`ct2${activeSubCat===cat?" act":""}`}
            style={activeSubCat===cat?{borderColor:CAT_COLORS[cat],background:`${CAT_COLORS[cat]}18`,color:CAT_COLORS[cat]}:{}}
            onClick={()=>{setActiveSubCat(cat);setSubErr("");setNewSubcat("");}}>
            {icon} {cat}
          </button>
        ))}
      </div>
      <div className="tag-wrap">
        {(subcatMap[activeSubCat]||[]).length===0 && <div className="empty-tags">No subcategories yet</div>}
        {(subcatMap[activeSubCat]||[]).map(s=>(
          <div className="ptag" key={s.id} style={{borderColor:`${color}40`}}>
            <span style={{color}}>{s.name}</span>
            <button className="ptag-del" onClick={()=>onDeleteSubcat(s.id)}>✕</button>
          </div>
        ))}
      </div>
      <div className="add-row">
        <input className="add-input" placeholder={`Add to ${activeSubCat}...`} value={newSubcat} onChange={e=>{setNewSubcat(e.target.value);setSubErr("");}} onKeyDown={e=>e.key==="Enter"&&submitSubcat()}
          style={{borderColor: newSubcat ? `${color}60` : ""}}/>
        <button className="add-btn" style={{background:color}} onClick={submitSubcat}>+ Add</button>
      </div>
      {subErr&&<div className="perr">⚠ {subErr}</div>}
    </div>
  </div>;
}

// ════════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ════════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [tab,setTab]           = useState("dashboard");
  const [expenses,setExpenses] = useState([]);
  const [accounts,setAccounts] = useState([]);
  const [subcats,setSubcats]   = useState([]);
  const [loading,setLoading]   = useState(true);
  const [saving,setSaving]     = useState(false);
  const [exporting,setExporting] = useState(false);
  const [selMonth,setSelMonth] = useState(()=>{const n=new Date();return{month:n.getMonth(),year:n.getFullYear()};});
  const [toast,setToast]       = useState(null);
  const [dbError,setDbError]   = useState(null);

  const showToast = useCallback((msg,isErr=false)=>{setToast({msg,isErr});setTimeout(()=>setToast(null),3000);},[]);

  // subcatMap: { Needs: [{id,name}, ...], Wants: [...], Investments: [...] }
  const subcatMap = useMemo(()=>{
    const m={Needs:[],Wants:[],Investments:[]};
    subcats.forEach(s=>{if(m[s.category])m[s.category].push(s);});
    return m;
  },[subcats]);

  useEffect(()=>{
    (async()=>{
      try {
        setLoading(true);
        const migrated = await db.migrateFromLocal();
        if(migrated>0) showToast(`✓ Migrated ${migrated} entries to Supabase`);
        const [exps, accs, subs] = await Promise.all([db.fetchAll(), db.fetchAccounts(), db.fetchSubcats()]);
        setExpenses(exps); setAccounts(accs); setSubcats(subs);
      } catch(e) {
        setDbError("Cannot connect to Supabase. Check your network.");
        showToast("Connection error",true);
      } finally { setLoading(false); }
    })();
  },[]);

  const addExpense = async (exp) => {
    try { setSaving(true); const saved=await db.insertExpense(exp); setExpenses(p=>[saved,...p]); showToast("✓ Saved to Supabase"); setTab("dashboard"); }
    catch { showToast("Failed to save",true); }
    finally { setSaving(false); }
  };
  const deleteExpense = async (id) => {
    try { await db.deleteExpense(id); setExpenses(p=>p.filter(e=>e.id!==id)); showToast("Deleted"); }
    catch { showToast("Delete failed",true); }
  };
  const addAccount = async (name) => {
    try { const a=await db.insertAccount(name); setAccounts(p=>[...p,a].sort((a,b)=>a.name.localeCompare(b.name))); showToast(`✓ Added ${name}`); }
    catch { showToast("Failed to add account",true); }
  };
  const deleteAccount = async (id) => {
    try { await db.deleteAccount(id); setAccounts(p=>p.filter(a=>a.id!==id)); showToast("Account removed"); }
    catch { showToast("Failed to remove",true); }
  };
  const addSubcat = async (category,name) => {
    try { const s=await db.insertSubcat(category,name); setSubcats(p=>[...p,s]); showToast(`✓ Added "${name}"`); }
    catch { showToast("Failed to add subcategory",true); }
  };
  const deleteSubcat = async (id) => {
    try { await db.deleteSubcat(id); setSubcats(p=>p.filter(s=>s.id!==id)); showToast("Subcategory removed"); }
    catch { showToast("Failed to remove",true); }
  };
  const handleExport = async () => {
    if(expenses.length===0){showToast("No data to export");return;}
    try { setExporting(true); await exportToExcel(expenses); showToast("✓ Excel downloaded!"); }
    catch { showToast("Export failed",true); }
    finally { setExporting(false); }
  };

  return <>
    <GS/>
    <style>{`
      .root{min-height:100vh;background:var(--bg);max-width:480px;margin:0 auto;position:relative;display:flex;flex-direction:column;}
      .content{flex:1;padding-bottom:76px;}
      .nav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:480px;background:rgba(18,20,26,0.96);backdrop-filter:blur(20px);border-top:1px solid var(--border);display:flex;z-index:100;padding:7px 0 11px;}
      .nb{flex:1;background:none;border:none;display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px;color:var(--muted);font-family:'Outfit',sans-serif;font-size:10px;font-weight:600;transition:color .2s;letter-spacing:.02em;}
      .nb.act{color:var(--accent);} .nb .ni{font-size:19px;}
      .nb.addnb .ni{background:linear-gradient(135deg,#818cf8,#60a5fa);border-radius:13px;width:42px;height:42px;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 4px 18px rgba(129,140,248,.4);margin-bottom:1px;}
      .nb.addnb{color:var(--text);}
      .tst{position:fixed;top:18px;left:50%;transform:translateX(-50%);border-radius:99px;padding:9px 18px;font-size:13px;font-weight:500;z-index:999;animation:fadeUp .3s ease;white-space:nowrap;}
      .ls{position:fixed;inset:0;background:var(--bg);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;z-index:500;}
      .ls-ico{font-size:36px;} .ls-txt{font-size:14px;color:var(--muted);}
      .ls-bar{width:160px;height:2px;background:var(--surface2);border-radius:99px;overflow:hidden;}
      .ls-fill{height:100%;width:40%;background:linear-gradient(90deg,#818cf8,#60a5fa);border-radius:99px;animation:ldg 1.2s ease-in-out infinite;}
      @keyframes ldg{0%{transform:translateX(-100%)}100%{transform:translateX(400%)}}
      .es{text-align:center;padding:60px 24px;color:var(--muted);}
      .es-i{font-size:36px;margin-bottom:12px;} .es-t{font-size:16px;font-weight:700;color:#f87171;margin-bottom:6px;}
    `}</style>

    {loading&&<div className="ls"><div className="ls-ico">💰</div><div className="ls-txt">Loading your data…</div><div className="ls-bar"><div className="ls-fill"/></div></div>}

    <div className="root">
      <div className="content">
        {dbError?(
          <div className="es"><div className="es-i">⚠️</div><div className="es-t">Connection Failed</div><div>{dbError}</div></div>
        ):(
          <>
            {tab==="dashboard"  && <Dashboard expenses={expenses} selMonth={selMonth} setSelMonth={setSelMonth} onGoEntries={()=>setTab("month")} onExport={handleExport} exporting={exporting}/>}
            {tab==="add"        && <AddExpense onAdd={addExpense} onCancel={()=>setTab("dashboard")} saving={saving} accounts={accounts} subcatMap={subcatMap}/>}
            {tab==="month"      && <MonthView  expenses={expenses} selMonth={selMonth} setSelMonth={setSelMonth} onDelete={deleteExpense} onBack={()=>setTab("dashboard")}/>}
            {tab==="personalise"&& <Personalise accounts={accounts} subcatMap={subcatMap} onAddAccount={addAccount} onDeleteAccount={deleteAccount} onAddSubcat={addSubcat} onDeleteSubcat={deleteSubcat}/>}
          </>
        )}
      </div>
      {!loading&&!dbError&&(
        <nav className="nav">
          <button className={`nb${tab==="dashboard"?" act":""}`}   onClick={()=>setTab("dashboard")}><span className="ni">◎</span>Overview</button>
          <button className="nb addnb"                              onClick={()=>setTab("add")}><span className="ni">＋</span>Add</button>
          <button className={`nb${tab==="month"?" act":""}`}       onClick={()=>setTab("month")}><span className="ni">☰</span>Entries</button>
          <button className={`nb${tab==="personalise"?" act":""}`} onClick={()=>setTab("personalise")}><span className="ni">⚙</span>Personalise</button>
        </nav>
      )}
      {toast&&<div className="tst" style={{background:toast.isErr?"rgba(248,113,113,0.15)":"var(--surface2)",border:`1px solid ${toast.isErr?"rgba(248,113,113,0.3)":"var(--border)"}`,color:toast.isErr?"#f87171":"var(--text)"}}>{toast.msg}</div>}
    </div>
  </>;
}