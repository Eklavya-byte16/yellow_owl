"use client";
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

function CheckAuth({ children, protectedRoute }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    const token = localStorage.getItem("token");

    if (protectedRoute) {
      if (!token) {
        navigate("/login");
      } else {
        // BUG FIX: was missing setLoading(false) here — caused infinite loading for authed users
        if (isMounted.current) setLoading(false);
      }
    } else {
      if (token) {
        navigate("/Terminal");
      } else {
        if (isMounted.current) setLoading(false);
      }
    }

    return () => {
      isMounted.current = false;
    };
  }, [navigate, protectedRoute]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100svh",
          background: "#0a0a0b",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          fontFamily: "'Space Mono', 'Courier New', monospace",
        }}
      >
        {/* Subtle grid lines background */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
          {/* Status dot */}
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#4ade80",
              margin: "0 auto 20px",
              boxShadow: "0 0 12px #4ade80aa",
              animation: "pulse 1.2s ease-in-out infinite",
            }}
          />

          <p
            style={{
              fontSize: "11px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#4ade80cc",
              marginBottom: "8px",
            }}
          >
            SECURE_CANVAS://INITIALIZING
          </p>

          <p
            style={{
              fontSize: "13px",
              color: "#ffffff30",
              letterSpacing: "0.05em",
            }}
          >
            Authenticating session
            <span
              style={{
                display: "inline-block",
                animation: "blink 1s step-end infinite",
                marginLeft: "2px",
              }}
            >
              _
            </span>
          </p>
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(0.85); }
          }
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }
        `}</style>
      </div>
    );
  }

  return children;
}

export default CheckAuth;