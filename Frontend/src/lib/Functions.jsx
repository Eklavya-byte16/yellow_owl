import React, { useState, useEffect, useRef, useCallback } from "react";
const extColor = (name) => EXT_COLOR[getExt(name)] || "#7cb7e3";
const EXT_ICON = {
  jsx: "⚛", tsx: "⚛", js: "JS", ts: "TS",
  css: "🎨", json: "{ }", md: "MD", env: "🔒",
  html: "🌐", py: "🐍", sh: "$",
};
const EXT_COLOR = {
  jsx: "#61dafb", tsx: "#3178c6", js: "#f7df1e", ts: "#3178c6",
  css: "#e44d9e", json: "#f59e0b", md: "#aaa", env: "#f87171",
  html: "#e06c75", py: "#3776ab", sh: "#10b981",
};
const getExt   = (name) => name.split(".").pop().toLowerCase();


const DEFAULT_CONTENT = {
  jsx: 'import React from "react";\n\nfunction Component() {\n  return <div>Hello OWL</div>;\n}\n\nexport default Component;',
  js:  '// JavaScript file\nconsole.log("owl");',
  css: '/* styles */\nbody {\n  margin: 0;\n}',
  json:'{\n  "name": "owl-project"\n}',
  md:  '# Title\n\nWrite your docs here.',
  env: 'VITE_SERVER_BACKEND=http://localhost:3000\n',
};

const makeFile = (name) => ({
  id: crypto.randomUUID(),
  name,
  type: "file",
  content: DEFAULT_CONTENT[getExt(name)] ?? `// ${name}\n`,
});

const makeFolder = (name) => ({
  id: crypto.randomUUID(),
  name,
  type: "folder",
  open: true,
  children: [],
});

const clone = (node) => JSON.parse(JSON.stringify(node));
// mutates tree — returns true if deleted
export function deleteFromTree(children, id) {
  const idx = children.findIndex((n) => n.id === id);
  if (idx !== -1) { children.splice(idx, 1); return true; }
  return children.some((n) => n.type === "folder" && deleteFromTree(n.children, id));
}

export function findParentChildren(root, id) {
  if (root.children?.some((n) => n.id === id)) return root.children;
  for (const c of root.children ?? []) {
    const r = findParentChildren(c, id);
    if (r) return r;
  }
  return null;
}

export function findNode(root, id) {
  if (root.id === id) return root;
  for (const c of root.children ?? []) {
    const r = findNode(c, id);
    if (r) return r;
  }
  return null;
}

// ─── Modal ──────────────────────────────────────────────────────────────────

export function Modal({ title, defaultValue, onConfirm, onClose }) {
  const [val, setVal] = useState(defaultValue ?? "");
  const ref = useRef(null);
  useEffect(() => { ref.current?.select(); ref.current?.focus(); }, []);

  const confirm = () => { if (val.trim()) { onConfirm(val.trim()); onClose(); } };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#141416] border border-[#2a2a2e] rounded-lg p-6 w-80 font-mono">
        <p className="text-white text-sm font-semibold mb-3">{title}</p>
        <input
          ref={ref}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") confirm(); if (e.key === "Escape") onClose(); }}
          className="w-full bg-[#0e0e10] border border-[#333] text-white font-mono text-xs px-3 py-2 rounded outline-none focus:border-amber-500/60"
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="text-zinc-500 border border-[#2a2a2e] text-[11px] px-4 py-1.5 rounded hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={confirm}
            className="text-amber-400 border border-amber-500/30 text-[11px] px-4 py-1.5 rounded hover:bg-amber-500/10 transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Context Menu ────────────────────────────────────────────────────────────

export function CtxMenu({ x, y, items, onClose }) {
  useEffect(() => {
    const close = () => onClose();
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [onClose]);

  return (
    <div
      className="fixed z-50 bg-[#141416] border border-[#2a2a2e] rounded-md overflow-hidden font-mono text-[11px] shadow-2xl min-w-[160px]"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, i) =>
        item === "sep" ? (
          <div key={i} className="h-px bg-[#1f1f23] my-1" />
        ) : (
          <button
            key={i}
            onClick={() => { item.fn(); onClose(); }}
            className={`flex w-full items-center gap-2.5 px-4 py-2 text-left hover:bg-[#1f1f23] transition-colors ${
              item.danger ? "text-red-400 hover:text-red-300" : "text-zinc-300 hover:text-white"
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        )
      )}
    </div>
  );
}

// ─── TreeNode ────────────────────────────────────────────────────────────────

export function TreeNode({ node, depth, selectedId, onSelect, onOpen, onCtx }) {
  const isFolder = node.type === "folder";
  const isSelected = node.id === selectedId;

  return (
    <>
      <div
        className={`flex items-center gap-1.5 py-[3px] pr-2 cursor-pointer group font-mono text-[11px] transition-colors ${
          isSelected ? "bg-[#1c1c20] text-white" : "text-zinc-500 hover:bg-[#141416] hover:text-zinc-200"
        }`}
        style={{ paddingLeft: 8 + depth * 14 + "px" }}
        onClick={() => { onSelect(node); if (isFolder) onOpen(node.id); }}
        onContextMenu={(e) => { e.preventDefault(); onCtx(e, node); }}
      >
        {/* chevron */}
        <span className="w-3 text-zinc-700 shrink-0 text-[10px]">
          {isFolder ? (node.open ? "▾" : "▸") : ""}
        </span>

        {/* icon */}
        <span
          className="shrink-0 text-[10px] font-bold"
          style={{ color: isFolder ? "#c9a227" : extColor(node.name) }}
        >
          {isFolder ? (node.open ? "📂" : "📁") : (EXT_ICON[getExt(node.name)] ?? "📄")}
        </span>

        <span className="flex-1 truncate">{node.name}</span>

        {/* hover actions */}
        <span className="hidden group-hover:flex items-center gap-1 shrink-0">
          {isFolder && (
            <>
              <span
                title="New File"
                onClick={(e) => { e.stopPropagation(); onCtx(e, node, "new-file"); }}
                className="hover:text-white px-0.5"
              >＋</span>
              <span
                title="New Folder"
                onClick={(e) => { e.stopPropagation(); onCtx(e, node, "new-folder"); }}
                className="hover:text-white px-0.5"
              >🗂</span>
            </>
          )}
          <span
            title="Rename"
            onClick={(e) => { e.stopPropagation(); onCtx(e, node, "rename"); }}
            className="hover:text-white px-0.5"
          >✏️</span>
          <span
            title="Delete"
            onClick={(e) => { e.stopPropagation(); onCtx(e, node, "delete"); }}
            className="hover:text-red-400 px-0.5"
          >🗑</span>
        </span>
      </div>

      {/* children */}
      {isFolder && node.open &&
        [...(node.children ?? [])]
          .sort((a, b) => {
            if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
            return a.name.localeCompare(b.name);
          })
          .map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onOpen={onOpen}
              onCtx={onCtx}
            />
          ))}
    </>
  );
}

// ─── Editor tabs ─────────────────────────────────────────────────────────────

export function EditorTabs({ tabs, activeId, onSwitch, onClose }) {
  return (
    <div className="flex h-9 bg-[#0b0b0c] border-b border-[#1c1c1e] font-mono text-xs overflow-x-auto scrollbar-none">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => onSwitch(tab.id)}
          className={`flex items-center gap-2 px-4 border-r border-[#1c1c1e] cursor-pointer whitespace-nowrap shrink-0 ${
            tab.id === activeId
              ? "bg-[#0e0e10] text-zinc-100"
              : "text-zinc-500 hover:text-zinc-300 hover:bg-[#141416]"
          }`}
        >
          <span style={{ color: extColor(tab.name), fontSize: 10 }}>
            {EXT_ICON[getExt(tab.name)] ?? "📄"}
          </span>
          {tab.dirty && <span className="text-amber-500 text-[9px]">●</span>}
          <span>{tab.name}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(tab.id); }}
            className="text-zinc-700 hover:text-zinc-300 ml-1 text-[10px]"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

export default{
    EditorTabs,
    TreeNode,
    CtxMenu,
    Modal,
    findNode,
    findParentChildren,
    deleteFromTree
}