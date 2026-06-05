"use client";
import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/uitils";

export const MaskContainer = ({
  children,
  revealText,
  size = 24,
  revealSize = 240,
  className
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  useEffect(() => {
    // TRACKS GLOBALLY: Tracks mouse coordinates across the entire screen layout
    const updateMousePosition = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      
      // Calculates positions accurately relative to the parent bounding canvas screen box
      setMousePosition({ 
        x: e.clientX - rect.left, 
        y: e.clientY - rect.top 
      });
    };

    // Listen to the window layer instead of the individual container boundary box
    window.addEventListener("mousemove", updateMousePosition);
    
    return () => {
      window.removeEventListener("mousemove", updateMousePosition);
    };
  }, []);

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);

  let maskSize = isHovered ? revealSize : size;

  const inlineSvgMask = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'><circle cx='100' cy='100' r='100' fill='black'/></svg>")`;

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full h-full overflow-hidden", className)}
    >
      {/* 1. SPOTLIGHT REVEAL LENS LAYER */}
      <motion.div
        className="absolute inset-0 flex h-full w-full items-center justify-center bg-white pointer-events-none z-20"
        style={{
          WebkitMaskImage: inlineSvgMask,
          maskImage: inlineSvgMask,
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
        }}
        animate={{
          WebkitMaskPosition: `${mousePosition.x - maskSize / 2}px ${mousePosition.y - maskSize / 2}px`,
          maskPosition: `${mousePosition.x - maskSize / 2}px ${mousePosition.y - maskSize / 2}px`,
          WebkitMaskSize: `${maskSize}px ${maskSize}px`,
          maskSize: `${maskSize}px ${maskSize}px`,
        }}
        transition={{
          maskSize: { duration: 0.25, ease: "easeInOut" },
          maskPosition: { duration: 0, ease: "linear" },
          WebkitMaskSize: { duration: 0.25, ease: "easeInOut" },
          WebkitMaskPosition: { duration: 0, ease: "linear" },
        }}
      >
        <div className="absolute inset-0 bg-transparent flex items-center justify-center w-full h-full">
          {revealText}
        </div>
      </motion.div>

      {/* 2. UNDERLYING STABLE TEXT LAYER */}
      <div className="flex h-full w-full items-center justify-center bg-transparent relative z-10">
        <div 
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="pointer-events-auto block"
        >
          {children}
        </div>
      </div>
    </div>
  );
};