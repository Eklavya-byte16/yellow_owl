"use client";
import React, { useEffect, useRef, useState, useMemo } from "react";

// ─── Syntax token colours (Updated to Monochrome) ─────────
const TOKEN_COLORS = {
  command:  "#ffffff",
  flag:     "#a3a3a3",
  string:   "#d4d4d4",
  number:   "#e5e5e5",
  operator: "#737373",
  path:     "#a3a3a3",
  variable: "#d4d4d4",
  comment:  "#525252",
  default:  "#a3a3a3",
};

function tokenize(text) {
  const tokens = [];
  let firstWord = true;
  for (const word of text.split(/(\s+)/)) {
    if (/^\s+$/.test(word))            { tokens.push({ type: "default",  value: word }); continue; }
    if (word.startsWith("#"))          { tokens.push({ type: "comment",  value: word }); continue; }
    if (word.startsWith("$"))          { tokens.push({ type: "variable", value: word }); firstWord = false; continue; }
    if (/^--?[\w-]+/.test(word))       { tokens.push({ type: "flag",     value: word }); firstWord = false; continue; }
    if (/^["'].*["']$/.test(word))     { tokens.push({ type: "string",   value: word }); firstWord = false; continue; }
    if (/^\d+(\.\d+)?$/.test(word))    { tokens.push({ type: "number",   value: word }); firstWord = false; continue; }
    if (/^[|>&<]+$/.test(word))        { tokens.push({ type: "operator", value: word }); firstWord = true;  continue; }
    if (word.includes("/") || word.startsWith(".") || word.startsWith("~"))
                                       { tokens.push({ type: "path",     value: word }); firstWord = false; continue; }
    if (firstWord)                     { tokens.push({ type: "command",  value: word }); firstWord = false; continue; }
    tokens.push({ type: "default", value: word });
  }
  return tokens;
}

function SyntaxLine({ text }) {
  return (
    <>
      {tokenize(text).map((tok, i) => (
        <span key={i} style={{ color: TOKEN_COLORS[tok.type] }}>{tok.value}</span>
      ))}
    </>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ label, onDone, speed = 28 }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    if (pct >= 100) { onDone?.(); return; }
    const t = setTimeout(() => setPct(p => Math.min(p + 2, 100)), speed);
    return () => clearTimeout(t);
  }, [pct, speed, onDone]);

  const filled = Math.round(pct / 5);
  const empty  = 20 - filled;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "2px 0", fontFamily: "inherit", fontSize: 12 }}>
      <span style={{ color: "#ffffff60", fontSize: 11 }}>{label}</span>
      <span style={{ color: "#ffffff40" }}>[</span>
      <span style={{ color: "#ffffff",   letterSpacing: -1 }}>{"█".repeat(filled)}</span>
      <span style={{ color: "#ffffff15", letterSpacing: -1 }}>{"░".repeat(empty)}</span>
      <span style={{ color: "#ffffff40" }}>]</span>
      <span style={{ color: "#ffffff", minWidth: 34, fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export function OwlTerminal({
  commands          = [],
  outputs           = {},
  typingSpeed       = 30,
  delayBetween      = 400,
  initialDelay      = 200,
  username          = "owl",
  hostname          = "yellowowl",
  onComplete        = null,
}) {
  const bodyRef   = useRef(null);
  const containerRef = useRef(null);

  const [lines,       setLines]       = useState([]);
  const [currentText, setCurrentText] = useState("");
  const [cmdIdx,      setCmdIdx]      = useState(0);
  const [charIdx,     setCharIdx]     = useState(0);
  const [outputIdx,   setOutputIdx]   = useState(-1);
  const [phase,       setPhase]       = useState("idle");
  const [cursorOn,    setCursorOn]    = useState(true);

  const currentCmd  = commands[cmdIdx] || "";
  const currentOuts = useMemo(() => outputs[cmdIdx] || [], [outputs, cmdIdx]);
  const isLast      = cmdIdx === commands.length - 1;

  // cursor blink
  useEffect(() => {
    const t = setInterval(() => setCursorOn(v => !v), 530);
    return () => clearInterval(t);
  }, []);

  // scroll
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [lines, phase, currentText]);

  // idle → typing
  useEffect(() => {
    if (phase !== "idle") return;
    const t = setTimeout(() => setPhase("typing"), initialDelay);
    return () => clearTimeout(t);
  }, [phase, initialDelay]);

  // typing
  useEffect(() => {
    if (phase !== "typing") return;
    if (charIdx < currentCmd.length) {
      const t = setTimeout(() => {
        setCurrentText(currentCmd.slice(0, charIdx + 1));
        setCharIdx(c => c + 1);
      }, typingSpeed + Math.random() * 20);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setPhase("executing"), 80);
    return () => clearTimeout(t);
  }, [phase, charIdx, currentCmd, typingSpeed]);

  // executing
  useEffect(() => {
    if (phase !== "executing") return;
    setLines(l => [...l, { kind: "cmd", content: currentCmd }]);
    setCurrentText("");
    if (currentOuts.length > 0) { setOutputIdx(0); setPhase("outputting"); }
    else if (isLast)              setPhase("done");
    else                          setPhase("pausing");
  }, [phase]);

  // outputting
  useEffect(() => {
    if (phase !== "outputting") return;
    if (outputIdx < 0) return;

    if (outputIdx < currentOuts.length) {
      const out = currentOuts[outputIdx];
      const t = setTimeout(() => {
        setLines(l => [...l, { kind: "output", content: out }]);
        setOutputIdx(i => i + 1);
      }, out?.type === "progress" ? 0 : 130);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      if (isLast) setPhase("done");
      else        setPhase("pausing");
    }, 250);
    return () => clearTimeout(t);
  }, [phase, outputIdx, currentOuts, isLast]);

  // pausing
  useEffect(() => {
    if (phase !== "pausing") return;
    const t = setTimeout(() => {
      setCharIdx(0);
      setOutputIdx(-1);
      setCmdIdx(c => c + 1);
      setPhase("typing");
    }, delayBetween);
    return () => clearTimeout(t);
  }, [phase, delayBetween]);

  // done callback
  useEffect(() => {
    if (phase === "done") onComplete?.();
  }, [phase]);

  // ─── Render ────────────────────────────────────────────────────────────────
  const Prompt = () => (
    <span style={{ userSelect: "none" }}>
      <span style={{ color: "#ffffff", opacity: 0.7 }}>{username}</span>
      <span style={{ color: "#ffffff40" }}>@</span>
      <span style={{ color: "#ffffff", opacity: 0.9 }}>{hostname}</span>
      <span style={{ color: "#ffffff40" }}>:~</span>
      <span style={{ color: "#ffffff60" }}>$ </span>
    </span>
  );

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        maxWidth: 680,
        margin: "0 auto",
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Courier New', monospace",
        position: "relative",
      }}
    >
      {/* Ambient glow behind the panel (Changed to subtle white) */}
      <div style={{
        position: "absolute",
        inset: -32,
        background: "radial-gradient(ellipse at 50% 60%, rgba(255,255,255,0.03) 0%, transparent 70%)",
        pointerEvents: "none",
        zIndex: 0,
      }} />

      {/* Glass panel */}
      <div style={{
        position: "relative",
        zIndex: 1,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(10,10,10,0.82)",
        backdropFilter: "blur(24px) saturate(1.4)",
        WebkitBackdropFilter: "blur(24px) saturate(1.4)",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 32px 80px rgba(0,0,0,0.8), 0 0 60px rgba(255,255,255,0.02)",
        overflow: "hidden",
      }}>

        {/* Top accent line */}
        <div style={{
          height: 1,
          background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 30%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.2) 70%, transparent 100%)",
        }} />

        {/* Status bar */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 18px 8px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Owl icon — minimal */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="rgba(255,255,255,0.4)" strokeWidth="1"/>
              <circle cx="5.5" cy="7" r="1.5" fill="rgba(255,255,255,0.7)"/>
              <circle cx="10.5" cy="7" r="1.5" fill="rgba(255,255,255,0.7)"/>
              <path d="M6 10.5 Q8 12 10 10.5" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" fill="none" strokeLinecap="round"/>
            </svg>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", letterSpacing: "0.12em", fontWeight: 500 }}>
              YELLOW OWL
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em" }}>
              {phase === "done" ? "READY" : "INITIALISING"}
            </span>
            {/* Live dot */}
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: phase === "done" ? "#ffffff" : "#a3a3a3",
              boxShadow: phase === "done"
                ? "0 0 8px rgba(255,255,255,0.6)"
                : "0 0 8px rgba(255,255,255,0.2)",
              animation: phase !== "done" ? "pulse 1.4s ease-in-out infinite" : "none",
              display: "inline-block",
            }} />
          </div>
        </div>

        {/* Terminal body */}
        <div
          ref={bodyRef}
          style={{
            height: 340,
            overflowY: "auto",
            padding: "18px 22px 18px",
            scrollbarWidth: "none",
          }}
        >
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500&display=swap');
            ::-webkit-scrollbar { display: none; }
            @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
            @keyframes fadeSlideIn {
              from { opacity: 0; transform: translateY(4px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          {lines.map((line, i) => (
            <div
              key={i}
              style={{
                fontSize: 12.5,
                lineHeight: "1.8",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                animation: "fadeSlideIn 0.18s ease both",
              }}
            >
              {line.kind === "cmd" ? (
                <div style={{ display: "flex" }}>
                  <Prompt />
                  <SyntaxLine text={line.content} />
                </div>
              ) : line.kind === "output" && line.content?.type === "progress" ? (
                <ProgressBar label={line.content.label} />
              ) : (
                <OutputLine text={line.content} />
              )}
            </div>
          ))}

          {/* Active typing line */}
          {phase === "typing" && (
            <div style={{ fontSize: 12.5, lineHeight: "1.8", display: "flex", animation: "fadeSlideIn 0.18s ease both" }}>
              <Prompt />
              <SyntaxLine text={currentText} />
              <span style={{
                display: "inline-block", width: 7, height: 14,
                background: "#ffffff", verticalAlign: "middle",
                marginLeft: 1, borderRadius: 1,
                opacity: 0.9,
              }} />
            </div>
          )}

          {/* Idle cursor after output */}
          {(phase === "done" || phase === "pausing" || phase === "outputting") && (
            <div style={{ fontSize: 12.5, lineHeight: "1.8", display: "flex" }}>
              <Prompt />
              <span style={{
                display: "inline-block", width: 7, height: 14,
                background: "#ffffff", verticalAlign: "middle",
                marginLeft: 1, borderRadius: 1,
                opacity: cursorOn ? 0.9 : 0,
                transition: "opacity 0.05s",
              }} />
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "7px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em" }}>
            senior ai developer · v1.0.0
          </span>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em" }}>
            {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Output line styling ───────────────────────────────────────────────────────
function OutputLine({ text }) {
  if (!text || typeof text !== "string") return null;

  let color = "rgba(255,255,255,0.55)";

  if (text.trimStart().startsWith("✓") || text.includes("OK") || text.includes("ONLINE") || text.includes("READY")) {
    color = "#ffffff";
  } else if (text.trimStart().startsWith("✗") || text.includes("ERR") || text.includes("DENIED") || text.includes("FAIL")) {
    color = "#a3a3a3";
  } else if (text.trimStart().startsWith("[WARN]") || text.includes("WARN") || text.includes("Risk")) {
    color = "#d4d4d4";
  } else if (text.includes("──") || text.includes("═══") || text.includes("───")) {
    color = "rgba(255,255,255,0.15)";
  } else if (text.trim().startsWith("►") || text.trim().startsWith("•")) {
    color = "rgba(255,255,255,0.75)";
  }

  return <span style={{ color, display: "block" }}>{text}</span>;
}

export default OwlTerminal;