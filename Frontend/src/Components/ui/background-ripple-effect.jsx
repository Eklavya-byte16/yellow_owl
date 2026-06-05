"use client";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/uitils"; // fixed: was @/lib/uitils (typo)

export const BackgroundRippleEffect = ({
  rows = 16,
  cols = 32,
  cellSize = 55,
}) => {
  const [clickedCell, setClickedCell] = useState(null);
  const [rippleKey, setRippleKey] = useState(0);
  const ref = useRef(null);

  const handleCellClick = useCallback((row, col) => {
    setClickedCell({ row, col });
    setRippleKey((k) => k + 1);
  }, []);

  return (
    <div
      ref={ref}
      className="absolute inset-0 h-full w-full flex items-center justify-center overflow-hidden"
    >
      {/* Radial mask — fades grid to bg near edges */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[4] h-full w-full"
        style={{
          background:
            "radial-gradient(circle at center, transparent 10%, var(--bg-base, rgba(10,10,11,1)) 95%)",
        }}
      />

      <DivGrid
        key={`base-${rippleKey}`}
        rows={rows}
        cols={cols}
        cellSize={cellSize}
        clickedCell={clickedCell}
        onCellClick={handleCellClick}
        interactive
      />
    </div>
  );
};

const DivGrid = ({
  rows,
  cols,
  cellSize,
  clickedCell = null,
  onCellClick = () => {},
  interactive = true,
}) => {
  const cells = useMemo(
    () => Array.from({ length: rows * cols }, (_, idx) => idx),
    [rows, cols]
  );

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
    gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
    width: `${cols * cellSize}px`,
    height: `${rows * cellSize}px`,
  };

  return (
    <div className="relative z-[3]" style={gridStyle}>
      {cells.map((idx) => {
        const rowIdx = Math.floor(idx / cols);
        const colIdx = idx % cols;
        const distance = clickedCell
          ? Math.hypot(clickedCell.row - rowIdx, clickedCell.col - colIdx)
          : 0;
        const delay = clickedCell ? Math.max(0, distance * 45) : 0;
        const duration = 180 + distance * 70;

        const style = clickedCell
          ? { "--delay": `${delay}ms`, "--duration": `${duration}ms` }
          : {};

        return (
          <div
            key={idx}
            className={cn(
              "cell relative border-[0.5px] border-white/[0.04] bg-transparent transition-all duration-300 will-change-transform",
              "hover:border-white/20 hover:bg-white/[0.01]",
              clickedCell && "animate-cell-ripple [animation-fill-mode:none]",
              !interactive && "pointer-events-none"
            )}
            style={style}
            onClick={
              interactive ? () => onCellClick(rowIdx, colIdx) : undefined
            }
          />
        );
      })}
    </div>
  );
};