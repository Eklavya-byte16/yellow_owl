import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    const performLogout = async () => {
      try {
        // 1. Call your backend API to destroy the session
        await fetch(`${import.meta.env.VITE_SERVER_BACKEND}auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          },
        });
      } catch (error) {
        console.error("Backend logout error:", error);
      } finally {
        // 2. Clear credentials locally no matter what (even if server fails)
        localStorage.removeItem("token"); 
        localStorage.removeItem("user");
        
        // 3. Bounce them out to the login page immediately
        navigate("/login");
      }
    };

    performLogout();
  }, [navigate]);

  // Show your beautiful CheckAuth loading screen layout while processing
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
        <p
          style={{
            fontSize: "11px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#ef4444", // Red/Orange warning accent for closing down
            marginBottom: "8px",
          }}
        >
          SECURE_CANVAS://TERMINATING_SESSION
        </p>
        <p style={{ fontSize: "13px", color: "#ffffff30" }}>
          Clearing local secure keys...
        </p>
      </div>
    </div>
  );
}

export default Logout;