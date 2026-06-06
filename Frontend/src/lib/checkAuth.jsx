"use client";
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { OwlTerminal } from "../Components/Loadder"; // adjust path as needed

// ─── Scene definitions ────────────────────────────────────────────────────────
// Each scene: { commands: string[], outputs: Record<number, any[]> }
// Output items can be strings or { type: "progress", label: string }

const SCENES = {
  // ── / Landing or public pages ─────────────────────────────────────────────
  publicReady: {
    duration: 3800,
    commands: [
      "owl --wake --mode senior-dev",
      "mount --knowledge-base --domain full-stack",
    ],
    outputs: {
      0: [
        "  Loading cognition engine...",
        "  Indexing 47,000 design patterns...",
        { type: "progress", label: "INITIALISING" },
        "  ✓ Core systems online.",
      ],
      1: [
        "  React / Next.js    ██████████  expert",
        "  Node / Express     ██████████  expert",
        "  System design      █████████░  senior",
        "  Security / Auth    █████████░  senior",
        "  ✓ Knowledge base ready. Ask me anything.",
      ],
    },
  },

  // ── /login — unauthenticated ───────────────────────────────────────────────
  loginGate: {
    duration: 3200,
    commands: [
      "owl auth-gate --challenge",
      "await --credential-input",
    ],
    outputs: {
      0: [
        "  TLS 1.3 handshake: COMPLETE",
        "  CSRF shield: ACTIVE",
        "  Rate limiting: 5 req / min",
        "  ✓ Channel secured.",
      ],
      1: [
        "  ┌─────────────────────────────────┐",
        "  │  Awaiting identity verification  │",
        "  └─────────────────────────────────┘",
        "  → WHO ARE YOU?  IDENTIFY YOURSELF.",
      ],
    },
  },

  // ── Already logged in, hit public route → redirect ─────────────────────────
  alreadyAuthed: {
    duration: 2200,
    commands: ["check-session --silent", "redirect --target /Terminal"],
    outputs: {
      0: ["  Session token: VALID", "  Bypassing public route..."],
      1: ["  Routing you to your workspace..."],
    },
  },

  // ── /Terminal — authenticated dashboard boot ──────────────────────────────
  dashboardBoot: {
    duration: 5800,
    commands: [
      "owl --init-workspace --user $SESSION",
      "connect --brokerage-api --all-exchanges",
      "start --prediction-engine --confidence 0.87",
    ],
    outputs: {
      0: [
        "  Mounting virtual workspace...",
        "  Loaded: glass_morphism_ui.css",
        "  Loaded: prediction_overlays.js",
        "  ✓ OK",
      ],
      1: [
        "  NSE real-time feed: ACTIVE   Latency: 4ms",
        "  BSE real-time feed: ACTIVE   Latency: 6ms",
        "  Crypto feed: ACTIVE          Latency: 11ms",
        "  ✓ All exchanges connected.",
      ],
      2: [
        "  Waking neural nets...",
        { type: "progress", label: "MODEL LOAD" },
        "  LSTM ensemble: ONLINE",
        "  Sentiment feed: ACTIVE",
        "  ✓ PREDICTION ENGINE LIVE. WELCOME BACK.",
      ],
    },
  },

  // ── Access denied — no token on protected route ────────────────────────────
  accessDenied: {
    duration: 3800,
    commands: ["owl --auth-check", "redirect --target /login --escalate"],
    outputs: {
      0: [
        "  ✗ ERR_CODE: 0x4F3A — INVALID_SESSION",
        "  ✗ ACCESS DENIED.",
        "  Clearing volatile memory...",
        "  Locking down access vectors...",
      ],
      1: [
        "  THIS SECTOR IS CLASSIFIED.",
        "  Routing to secure gateway...",
      ],
    },
  },

  // ── /logout ────────────────────────────────────────────────────────────────
  logout: {
    duration: 4000,
    commands: [
      "owl logout --secure --wipe-session",
      "audit-log --write --event LOGOUT",
    ],
    outputs: {
      0: [
        "  Revoking session tokens...",
        "  Clearing HttpOnly cookies...",
        { type: "progress", label: "TEARDOWN" },
        "  ✓ All connections terminated.",
      ],
      1: [
        "  Timestamped exit written to audit trail.",
        "  → TERMINAL OFFLINE. THE MARKET GOES ON.",
      ],
    },
  },
};

// ─── CheckAuth ────────────────────────────────────────────────────────────────
function CheckAuth({ children, protectedRoute }) {
  const navigate   = useNavigate();
  const isMounted  = useRef(true);
  const [loading,  setLoading]  = useState(true);
  const [scene,    setScene]    = useState(null);

  useEffect(() => {
    isMounted.current = true;
    const token = localStorage.getItem("token"); // swap for /api/me call when ready

    let chosen;
    let redirectTo = null;
    let showDuration = 3000;

    if (protectedRoute) {
      if (!token) {
        chosen      = SCENES.accessDenied;
        redirectTo  = "/login";
      } else {
        chosen       = SCENES.dashboardBoot;
        showDuration = chosen.duration;
      }
    } else {
      if (token) {
        chosen       = SCENES.alreadyAuthed;
        redirectTo   = "/Terminal";
      } else {
        // pick scene based on current path
        const path = window.location.pathname;
        chosen = path === "/login" || path === "/Signup"
          ? SCENES.loginGate
          : SCENES.publicReady;
      }
    }

    setScene(chosen);

    const timer = setTimeout(() => {
      if (!isMounted.current) return;
      if (redirectTo) {
        navigate(redirectTo);
      } else {
        setLoading(false);
      }
    }, chosen.duration);

    return () => {
      isMounted.current = false;
      clearTimeout(timer);
    };
  }, [navigate, protectedRoute]);

  if (loading && scene) {
    return (
      <div
        style={{
          minHeight: "100svh",
          background: "#000000",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 16px",
          position: "relative",
          overflow: "hidden",
          // Dark minimal background with subtle white gradient
          backgroundColor: "#000000",
          background: "radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.05) 0%, #000000 60%)",
        }}
      >
        {/* Ultra-subtle grid */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: [
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)",
              "linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            ].join(","),
            backgroundSize: "52px 52px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
          }}
        />

        <OwlTerminal
          commands={scene.commands}
          outputs={scene.outputs}
          typingSpeed={28}
          delayBetween={350}
          initialDelay={300}
        />
      </div>
    );
  }

  return children;
}

export default CheckAuth;