import React, { useState } from 'react'
import { BackgroundRippleEffect } from '@/Components/ui/background-ripple-effect.jsx'
import { MaskContainer } from '@/Components/ui/svg-mask-effect'
import { 
  Navbar, 
  NavBody, 
  NavItems, 
  NavbarButton, 
  MobileNav, 
  MobileNavHeader, 
  MobileNavToggle, 
  MobileNavMenu 
} from '@/Components/ui/resizable-navbar.jsx'

import logo from "@/public/Logo/logo.jpeg"

function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  const navLinks = [
    { name: "Features", link: "#features" },
    { name: "Products", link: "#products" },
    { name: "Pricing", link: "#pricing" },
    { name: "Contact", link: "#contact" }
  ]

  return (
    <main className="w-full min-h-screen bg-black relative">
      {/* NAVBAR */}
      <Navbar>
        <NavBody>
          {/* Logo path set to root public folder */}
          <a href="/" className="flex items-center">
            <img src={logo} alt="Yellow Owl Logo" className="h-9 w-auto object-contain rounded-md" />
          </a>
          <NavItems items={navLinks} />
          <div className="flex items-center space-x-2">
            <NavbarButton href="/login" variant="primary">Log In</NavbarButton>
            <NavbarButton href="/Signup" variant="dark" className="border border-white/10">Sign Up</NavbarButton>
          </div>
        </NavBody>

        <MobileNav>
          <MobileNavHeader>
            <a href="/" className="flex items-center">
              <img src={logo} alt="Yellow Owl Logo" className="h-8 w-auto object-contain rounded-md" />
            </a>
            <MobileNavToggle isOpen={mobileMenuOpen} onClick={() => setMobileMenuOpen(!mobileMenuOpen)} />
          </MobileNavHeader>
          <MobileNavMenu isOpen={mobileMenuOpen}>
            {navLinks.map((item, idx) => (
              <a key={idx} href={item.link} className="text-neutral-300 py-1 text-base w-full">
                {item.name}
              </a>
            ))}
            <div className="w-full border-t border-neutral-800 my-2 pt-4 flex flex-col gap-2">
              <NavbarButton href="/login" variant="secondary" className="w-full">Log In</NavbarButton>
              <NavbarButton href="/Signup" variant="dark" className="w-full border border-white/10">Sign Up</NavbarButton>
            </div>
          </MobileNavMenu>
        </MobileNav>
      </Navbar>

      {/* HERO SECTION */}
      <section className='relative mx-4 my-4 bg-zinc-950 rounded-3xl h-[95vh] w-[calc(100%-2rem)] overflow-hidden flex items-center justify-center border border-white/[0.05]'>
        <BackgroundRippleEffect />
        
        <MaskContainer
          size={24}          
          revealSize={260}    
          className="absolute inset-0 w-full h-full z-10"
          
          // REVEAL STATE (INSIDE WHITE LENS)
          revealText={
            <div className="text-center px-8 w-full max-w-4xl select-none pointer-events-none flex flex-col items-center justify-center gap-6">
              
              {/* Row 1: Badge */}
              <div className="h-8 flex items-center justify-center">
                <div className="flex items-center gap-2 bg-amber-600/10 border border-amber-600/30 px-3 py-1 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-600"></span>
                  <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-amber-700 font-bold">
                    Owl Agent Active
                  </span>
                </div>
              </div>

              {/* Row 2: Fixed-height text block matching the layout exactly */}
              <div className="min-h-[140px] md:min-h-[100px] w-full flex items-center justify-center max-w-2xl">
                <p className="text-xl md:text-3xl font-extrabold tracking-tight text-black leading-relaxed">
                  Meet <span className="text-amber-600 font-black">Yellow Owl</span>. The personalized AI assistant for you.
                </p>
              </div>
              
              {/* Row 3: Buttons */}
              <div className="h-12 flex items-center gap-3 mt-2">
                <NavbarButton 
                  href="/login"
                  variant="dark" 
                  className="bg-neutral-900 text-white border border-transparent shadow-none px-6 py-2.5 rounded-xl text-sm font-semibold"
                >
                  Log In
                </NavbarButton>
                <NavbarButton 
                  href="/Signup"
                  variant="primary" 
                  className="bg-amber-600 text-white border border-transparent shadow-none px-6 py-2.5 rounded-xl text-sm font-semibold"
                >
                  Sign Up
                </NavbarButton>
              </div>
            </div>
          }
        >
          {/* DEFAULT BASE STATE (OUTSIDE LENS) */}
          <div className="text-center px-8 w-full max-w-4xl select-none pointer-events-auto flex flex-col items-center justify-center gap-6">
            
            {/* Row 1: Badge */}
            <div className="h-8 flex items-center justify-center">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-white/40">
                  [ Legacy Prompt Interface ]
                </span>
              </div>
            </div>

            {/* Row 2: Identical fixed-height text block layout */}
            <div className="min-h-[140px] md:min-h-[100px] w-full flex items-center justify-center max-w-2xl">
              <p className="text-xl md:text-3xl font-sans font-bold tracking-tight text-white leading-relaxed">
                Writing endless prompt code and giving context to each step manually is exhausting.
              </p>
            </div>
            
            {/* Row 3: Buttons */}
            <div className="h-12 flex items-center gap-3 mt-2">
              <NavbarButton 
                href="/login"
                variant="secondary" 
                className="bg-transparent text-white border border-white/10 hover:bg-white/5 px-6 py-2.5 rounded-xl text-sm font-semibold shadow-none"
              >
                Log In
              </NavbarButton>
              <NavbarButton 
                href="/Signup"
                variant="primary" 
                className="bg-white text-black hover:bg-neutral-100 px-6 py-2.5 rounded-xl text-sm font-semibold shadow-none"
              >
                Sign Up
              </NavbarButton>
            </div>
          </div>
        </MaskContainer>

      </section>
    </main>
  )
}

export default Home;