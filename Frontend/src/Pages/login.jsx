import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MaskContainer } from '@/Components/ui/svg-mask-effect'
import logo from "@/public/Logo/logo.jpeg"

function login() {
  const [form, setForm] = useState({ email: "", password: "", username: "" });
  const [loding, setLoadding] = useState(false);
  const [spotlightSize, setSpotlightSize] = useState(60); 
  const navigate = useNavigate();

  const Handlechange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  };

  const hanglelogin = async (e) => {
    e.preventDefault();
    setLoadding(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_BACKEND}auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });
      
      const data = await res.json();
      if (res.ok) {
        console.log("✅ Login response:", data);
        localStorage.setItem("token", data.token)
        localStorage.setItem("user", JSON.stringify(data.user))
        console.log("✅ Token stored:", localStorage.getItem("token"));
        navigate("/Terminal");
      } else {
        alert(data.message || "login fail");
      }
    } catch (error) {
      alert("login - somthing went wrong")
    } finally {
      setLoadding(false)
    }
  };

  return (
    <div className="w-full min-h-screen bg-black relative flex items-center justify-center p-4 selection:bg-white selection:text-black overflow-hidden font-sans">
      
      {/* COMPLEMENTARY MONOCHROME BACKGROUND CANVAS */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
        <MaskContainer
          size={spotlightSize}          
          revealSize={spotlightSize}    
          className="w-full h-full"
          revealText={
            /* INSIDE THE CIRCLE: Soft White Spotlight */
            <div className="w-screen h-screen bg-black flex items-center justify-center">
              <div className="relative w-[550px] h-[550px] flex items-center justify-center">
                <div className="absolute w-[550px] h-[550px] bg-white/10 rounded-full blur-[90px]" />
                <div className="absolute w-[200px] h-[200px] bg-neutral-400/20 rounded-full blur-[40px]" />
              </div>
            </div>
          }
        >
          {/* OUTSIDE THE CIRCLE: Deep, Ambient Glow + Tech Grid */}
          <div className="w-screen h-screen bg-black flex items-center justify-center relative">
            <div className="absolute w-[600px] h-[600px] bg-white/5 rounded-full blur-[120px]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:3rem_3rem]" />
          </div>
        </MaskContainer>
      </div>

      {/* REACTIVE GLASSMORPHIC FORM CARD */}
      <div 
        onMouseEnter={() => setSpotlightSize(500)} 
        onMouseLeave={() => setSpotlightSize(60)}   
        className="w-full max-w-md bg-zinc-950/40 backdrop-blur-2xl border border-white/[0.06] rounded-3xl p-8 relative z-10 pointer-events-auto transition-all duration-300 hover:border-white/20 hover:shadow-[0_0_60px_-10px_rgba(255,255,255,0.1)]"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="p-2 bg-black rounded-2xl border border-white/[0.08] shadow-inner mb-4 transition-transform duration-300 hover:scale-105">
            <img 
              src={logo}
              alt="Yellow Owl Logo" 
              className="h-12 w-auto object-contain rounded-xl"
            />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Welcome Back</h2>
          <p className="text-sm text-neutral-400 mt-1.5 font-medium">Log in to control your Owl Agent</p>
        </div>

        <form onSubmit={hanglelogin} className="space-y-5">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2 font-semibold">Email Address</label>
            <input 
              type="email" 
              name="email"
              value={form.email}
              onChange={Handlechange}
              required
              placeholder="name@example.com"
              className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/30 transition-all duration-200 text-sm shadow-inner"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2 font-semibold">Password</label>
            <input 
              type="password" 
              name="password"
              value={form.password}
              onChange={Handlechange}
              required
              placeholder="••••••••"
              className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/30 transition-all duration-200 text-sm shadow-inner"
            />
          </div>

          <button 
            type="submit" 
            disabled={loding}
            className="w-full bg-white hover:bg-neutral-200 active:scale-[0.98] disabled:bg-neutral-900 disabled:text-neutral-500 text-black font-semibold py-3 px-4 rounded-xl transition-all duration-200 mt-2 text-sm flex items-center justify-center gap-2 shadow-lg shadow-white/5 border border-white/10"
          >
            {loding ? (
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                <span>Authorizing Link...</span>
              </div>
            ) : (
              "Access Terminal"
            )}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-white/[0.04] pt-5">
          <p className="text-xs text-neutral-500 font-medium">
            Don't have an account?{" "}
            <a href="/Signup" className="text-white hover:text-neutral-300 font-semibold transition-colors duration-200 underline underline-offset-4 decoration-white/30">
              Create one now
            </a>
          </p>
        </div>
      </div>

    </div>
  )
}

export default login