import { useState, useEffect, useRef, useMemo } from "react";

// ─── Token colours ─────────────────────────────────────────────────────────
const TC = {
  command:  "#f5c842",
  flag:     "#7dd3fc",
  string:   "#86efac",
  number:   "#c4b5fd",
  operator: "#fb923c",
  path:     "#67e8f9",
  variable: "#f9a8d4",
  comment:  "#4b556380",
  default:  "#d1d5db",
};

function tokenize(text) {
  const out = []; let first = true;
  for (const w of text.split(/(\s+)/)) {
    if (/^\s+$/.test(w))        { out.push({t:"default",v:w}); continue; }
    if (w.startsWith("#"))      { out.push({t:"comment",v:w}); continue; }
    if (w.startsWith("$"))      { out.push({t:"variable",v:w}); first=false; continue; }
    if (/^--?[\w-]+/.test(w))   { out.push({t:"flag",v:w}); first=false; continue; }
    if (/^["'].*["']$/.test(w)) { out.push({t:"string",v:w}); first=false; continue; }
    if (/^\d+(\.\d+)?$/.test(w)){ out.push({t:"number",v:w}); first=false; continue; }
    if (/^[|>&<]+$/.test(w))    { out.push({t:"operator",v:w}); first=true; continue; }
    if (w.includes("/")||w.startsWith(".")||w.startsWith("~")) { out.push({t:"path",v:w}); first=false; continue; }
    if (first)                  { out.push({t:"command",v:w}); first=false; continue; }
    out.push({t:"default",v:w});
  }
  return out;
}

function Syntax({ text }) {
  return <>{tokenize(text).map((tok,i) => <span key={i} style={{color: TC[tok.t]}}>{tok.v}</span>)}</>;
}

function ProgressBar({ label }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    if (pct >= 100) return;
    const t = setTimeout(() => setPct(p => Math.min(p+2,100)), 28);
    return () => clearTimeout(t);
  }, [pct]);
  const f = Math.round(pct/5), e = 20-f;
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,fontSize:12,padding:"1px 0"}}>
      <span style={{color:"rgba(245,200,66,0.3)",fontSize:11,minWidth:90}}>{label}</span>
      <span style={{color:"rgba(245,200,66,0.4)"}}>[</span>
      <span style={{color:"#f5c842",letterSpacing:-1}}>{"█".repeat(f)}</span>
      <span style={{color:"rgba(245,200,66,0.18)",letterSpacing:-1}}>{"░".repeat(e)}</span>
      <span style={{color:"rgba(245,200,66,0.4)"}}>]</span>
      <span style={{color:"#f5c842",minWidth:32,fontVariantNumeric:"tabular-nums"}}>{pct}%</span>
    </div>
  );
}

function OutLine({ text }) {
  if (!text || typeof text !== "string") return null;
  let color = "rgba(245,200,66,0.5)";
  if (text.includes("✓")||text.includes("ONLINE")||text.includes("READY")||text.includes("ACTIVE")||text.includes("COMPLETE"))
    color = "#86efac";
  else if (text.includes("✗")||text.includes("DENIED")||text.includes("ERR")||text.includes("CLASSIFIED"))
    color = "#f87171";
  else if (text.includes("WARN")||text.includes("Risk")||text.includes("[WARN]"))
    color = "#fbbf24";
  else if (text.includes("──")||text.includes("┌")||text.includes("│")||text.includes("└"))
    color = "rgba(245,200,66,0.25)";
  else if (text.trim().startsWith("►")||text.trim().startsWith("→")||text.trim().startsWith("•"))
    color = "rgba(245,200,66,0.85)";
  return <span style={{color,display:"block"}}>{text}</span>;
}

// ─── Core terminal ─────────────────────────────────────────────────────────
function OwlTerminal({ commands=[], outputs={}, typingSpeed=30, delayBetween=400, initialDelay=200, onComplete }) {
  const bodyRef = useRef(null);
  const [lines, setLines]           = useState([]);
  const [currentText, setCurrentText] = useState("");
  const [cmdIdx, setCmdIdx]         = useState(0);
  const [charIdx, setCharIdx]       = useState(0);
  const [outputIdx, setOutputIdx]   = useState(-1);
  const [phase, setPhase]           = useState("idle");
  const [cursorOn, setCursorOn]     = useState(true);

  const currentCmd  = commands[cmdIdx] || "";
  const currentOuts = useMemo(() => outputs[cmdIdx] || [], [outputs, cmdIdx]);
  const isLast      = cmdIdx === commands.length - 1;

  useEffect(() => { const t = setInterval(()=>setCursorOn(v=>!v),530); return ()=>clearInterval(t); }, []);
  useEffect(() => { bodyRef.current?.scrollTo({top:bodyRef.current.scrollHeight,behavior:"smooth"}); }, [lines, phase, currentText]);
  useEffect(() => { if(phase!=="idle")return; const t=setTimeout(()=>setPhase("typing"),initialDelay); return ()=>clearTimeout(t); },[phase,initialDelay]);

  useEffect(() => {
    if (phase !== "typing") return;
    if (charIdx < currentCmd.length) {
      const t = setTimeout(() => { setCurrentText(currentCmd.slice(0,charIdx+1)); setCharIdx(c=>c+1); }, typingSpeed+Math.random()*18);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setPhase("executing"), 70);
    return () => clearTimeout(t);
  }, [phase, charIdx, currentCmd, typingSpeed]);

  useEffect(() => {
    if (phase !== "executing") return;
    setLines(l=>[...l,{kind:"cmd",content:currentCmd}]);
    setCurrentText("");
    if (currentOuts.length>0) { setOutputIdx(0); setPhase("outputting"); }
    else if (isLast) setPhase("done");
    else setPhase("pausing");
  }, [phase]);

  useEffect(() => {
    if (phase !== "outputting" || outputIdx < 0) return;
    if (outputIdx < currentOuts.length) {
      const out = currentOuts[outputIdx];
      const t = setTimeout(() => { setLines(l=>[...l,{kind:"output",content:out}]); setOutputIdx(i=>i+1); }, 120);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => { if(isLast) setPhase("done"); else setPhase("pausing"); }, 220);
    return () => clearTimeout(t);
  }, [phase, outputIdx, currentOuts, isLast]);

  useEffect(() => {
    if (phase !== "pausing") return;
    const t = setTimeout(() => { setCharIdx(0); setOutputIdx(-1); setCmdIdx(c=>c+1); setPhase("typing"); }, delayBetween);
    return () => clearTimeout(t);
  }, [phase, delayBetween]);

  useEffect(() => { if(phase==="done") onComplete?.(); }, [phase]);

  const Prompt = () => (
    <span style={{userSelect:"none",flexShrink:0}}>
      <span style={{color:"rgba(245,200,66,0.5)"}}>owl</span>
      <span style={{color:"rgba(245,200,66,0.25)"}}>@</span>
      <span style={{color:"rgba(240,165,0,0.6)"}}>yellowowl</span>
      <span style={{color:"rgba(245,200,66,0.25)"}}>:~</span>
      <span style={{color:"rgba(245,200,66,0.4)"}}>$ </span>
    </span>
  );

  return (
    <div style={{width:"100%",maxWidth:640,margin:"0 auto",fontFamily:"'JetBrains Mono','Fira Code','Cascadia Code',monospace",position:"relative"}}>
      {/* ambient glow */}
      <div style={{position:"absolute",inset:-40,background:"radial-gradient(ellipse at 50% 55%, rgba(245,200,66,0.07) 0%, transparent 65%)",pointerEvents:"none",zIndex:0}} />

      {/* glass panel */}
      <div style={{
        position:"relative",zIndex:1,borderRadius:14,
        border:"1px solid rgba(245,200,66,0.1)",
        background:"rgba(8,6,1,0.88)",
        backdropFilter:"blur(24px) saturate(1.5)",
        WebkitBackdropFilter:"blur(24px) saturate(1.5)",
        boxShadow:"0 0 0 1px rgba(245,200,66,0.03), 0 28px 72px rgba(0,0,0,0.7), 0 0 50px rgba(245,200,66,0.04)",
        overflow:"hidden",
      }}>
        {/* top accent */}
        <div style={{height:1,background:"linear-gradient(90deg,transparent 0%,rgba(245,200,66,0.35) 25%,rgba(240,165,0,0.55) 50%,rgba(245,200,66,0.35) 75%,transparent 100%)"}} />

        {/* status bar */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 16px 8px",borderBottom:"1px solid rgba(245,200,66,0.05)"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6.5" stroke="rgba(245,200,66,0.35)" strokeWidth="1"/>
              <circle cx="5.5" cy="7.2" r="1.4" fill="rgba(245,200,66,0.65)"/>
              <circle cx="10.5" cy="7.2" r="1.4" fill="rgba(245,200,66,0.65)"/>
              <path d="M6 10.5 Q8 12 10 10.5" stroke="rgba(245,200,66,0.45)" strokeWidth="0.8" fill="none" strokeLinecap="round"/>
            </svg>
            <span style={{fontSize:10,color:"rgba(245,200,66,0.4)",letterSpacing:"0.14em",fontWeight:500}}>YELLOW OWL</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:10,color:"rgba(245,200,66,0.2)",letterSpacing:"0.08em"}}>{phase==="done"?"READY":"INITIALISING"}</span>
            <span style={{
              width:6,height:6,borderRadius:"50%",display:"inline-block",
              background: phase==="done" ? "#22c55e" : "#f5c842",
              boxShadow: phase==="done" ? "0 0 7px rgba(34,197,94,0.55)" : "0 0 7px rgba(245,200,66,0.65)",
              animation: phase!=="done" ? "ypulse 1.4s ease-in-out infinite" : "none",
            }} />
          </div>
        </div>

        {/* body */}
        <div ref={bodyRef} style={{height:300,overflowY:"auto",padding:"16px 20px",scrollbarWidth:"none"}}>
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500&display=swap');
            @keyframes ypulse{0%,100%{opacity:1}50%{opacity:0.25}}
            @keyframes yslide{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}
          `}</style>

          {lines.map((line,i) => (
            <div key={i} style={{fontSize:12,lineHeight:1.8,whiteSpace:"pre-wrap",wordBreak:"break-all",animation:"yslide 0.16s ease both"}}>
              {line.kind==="cmd" ? (
                <div style={{display:"flex"}}><Prompt/><Syntax text={line.content}/></div>
              ) : line.kind==="output" && typeof line.content === "object" && line.content?.type==="progress" ? (
                <ProgressBar label={line.content.label}/>
              ) : (
                <OutLine text={line.content}/>
              )}
            </div>
          ))}

          {phase==="typing" && (
            <div style={{fontSize:12,lineHeight:1.8,display:"flex",animation:"yslide 0.16s ease both"}}>
              <Prompt/><Syntax text={currentText}/>
              <span style={{display:"inline-block",width:7,height:13,background:"#f5c842",verticalAlign:"middle",marginLeft:1,borderRadius:1,opacity:0.9}}/>
            </div>
          )}

          {(phase==="done"||phase==="pausing"||phase==="outputting") && (
            <div style={{fontSize:12,lineHeight:1.8,display:"flex"}}>
              <Prompt/>
              <span style={{display:"inline-block",width:7,height:13,background:"#f5c842",verticalAlign:"middle",marginLeft:1,borderRadius:1,opacity:cursorOn?0.9:0,transition:"opacity 0.05s"}}/>
            </div>
          )}
        </div>

        {/* bottom bar */}
        <div style={{borderTop:"1px solid rgba(245,200,66,0.05)",padding:"6px 16px",display:"flex",justifyContent:"space-between"}}>
          <span style={{fontSize:10,color:"rgba(245,200,66,0.18)",letterSpacing:"0.06em"}}>senior ai developer · v1.0.0</span>
          <span style={{fontSize:10,color:"rgba(245,200,66,0.18)",letterSpacing:"0.06em"}}>{new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Scene configs ──────────────────────────────────────────────────────────
const SCENES = [
  {
    label: "/ Landing",
    commands: ["owl --wake --mode senior-dev","mount --knowledge-base --domain full-stack"],
    outputs: {
      0:["  Loading cognition engine...","  Indexing 47,000 design patterns...",{type:"progress",label:"INITIALISING"},"  ✓ Core systems online."],
      1:["  React / Next.js    ██████████  expert","  Node / Express     ██████████  expert","  System design      █████████░  senior","  Security / Auth    █████████░  senior","  ✓ Knowledge base ready. Ask me anything."],
    }
  },
  {
    label: "/login",
    commands: ["owl auth-gate --challenge","await --credential-input"],
    outputs: {
      0:["  TLS 1.3 handshake: COMPLETE","  CSRF shield: ACTIVE","  Rate limiting: 5 req / min","  ✓ Channel secured."],
      1:["  ┌─────────────────────────────────┐","  │  Awaiting identity verification  │","  └─────────────────────────────────┘","  → WHO ARE YOU?  IDENTIFY YOURSELF."],
    }
  },
  {
    label: "/Terminal",
    commands: ["owl --init-workspace --user $SESSION","connect --brokerage-api --all-exchanges","start --prediction-engine --confidence 0.87"],
    outputs: {
      0:["  Mounting virtual workspace...","  Loaded: glass_morphism_ui.css","  ✓ OK"],
      1:["  NSE real-time feed: ACTIVE   Latency: 4ms","  BSE real-time feed: ACTIVE   Latency: 6ms","  ✓ All exchanges connected."],
      2:["  Waking neural nets...",{type:"progress",label:"MODEL LOAD"},"  LSTM ensemble: ONLINE","  ✓ PREDICTION ENGINE LIVE. WELCOME BACK."],
    }
  },
  {
    label: "ACCESS DENIED",
    commands: ["owl --auth-check","redirect --target /login --escalate"],
    outputs: {
      0:["  ✗ ERR_CODE: 0x4F3A — INVALID_SESSION","  ✗ ACCESS DENIED.","  Clearing volatile memory..."],
      1:["  THIS SECTOR IS CLASSIFIED.","  Routing to secure gateway..."],
    }
  },
  {
    label: "/logout",
    commands: ["owl logout --secure --wipe-session","audit-log --write --event LOGOUT"],
    outputs: {
      0:["  Revoking session tokens...","  Clearing HttpOnly cookies...",{type:"progress",label:"TEARDOWN"},"  ✓ All connections terminated."],
      1:["  Timestamped exit written to audit trail.","  → TERMINAL OFFLINE. THE MARKET GOES ON."],
    }
  },
];

// ─── Preview shell ─────────────────────────────────────────────────────────
export default function App() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [key, setKey] = useState(0);

  function switchScene(i) {
    setActiveIdx(i);
    setKey(k => k+1);
  }

  return (
    <div style={{
      minHeight:"100vh",
      background:"radial-gradient(ellipse at 50% 35%, rgba(245,200,66,0.05) 0%, #060502 55%)",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      gap:24,padding:"32px 16px",
    }}>
      {/* subtle grid */}
      <div style={{position:"fixed",inset:0,backgroundImage:"linear-gradient(rgba(245,200,66,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(245,200,66,0.02) 1px,transparent 1px)",backgroundSize:"52px 52px",maskImage:"radial-gradient(ellipse at center,black 20%,transparent 75%)",pointerEvents:"none",zIndex:0}}/>

      {/* scene tabs */}
      <div style={{position:"relative",zIndex:1,display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center"}}>
        {SCENES.map((s,i)=>(
          <button
            key={i}
            onClick={()=>switchScene(i)}
            style={{
              padding:"6px 14px",fontSize:10,fontFamily:"'JetBrains Mono',monospace",
              border:`1px solid ${activeIdx===i?"rgba(245,200,66,0.4)":"rgba(245,200,66,0.12)"}`,
              background: activeIdx===i?"rgba(245,200,66,0.1)":"transparent",
              color: activeIdx===i?"#f5c842":"rgba(245,200,66,0.35)",
              borderRadius:6,cursor:"pointer",letterSpacing:"0.06em",
              transition:"all 0.18s",
            }}
          >{s.label}</button>
        ))}
      </div>

      {/* terminal */}
      <div style={{position:"relative",zIndex:1,width:"100%",maxWidth:640}}>
        <OwlTerminal
          key={key}
          commands={SCENES[activeIdx].commands}
          outputs={SCENES[activeIdx].outputs}
          typingSpeed={28}
          delayBetween={380}
          initialDelay={280}
        />
      </div>

      {/* replay */}
      <button
        onClick={()=>setKey(k=>k+1)}
        style={{
          position:"relative",zIndex:1,
          padding:"7px 20px",fontSize:10,fontFamily:"'JetBrains Mono',monospace",
          border:"1px solid rgba(245,200,66,0.2)",background:"transparent",
          color:"rgba(245,200,66,0.4)",borderRadius:6,cursor:"pointer",
          letterSpacing:"0.1em",transition:"all 0.18s",
        }}
        onMouseOver={e=>e.target.style.color="#f5c842"}
        onMouseOut={e=>e.target.style.color="rgba(245,200,66,0.4)"}
      >↻ REPLAY</button>
    </div>
  );
}