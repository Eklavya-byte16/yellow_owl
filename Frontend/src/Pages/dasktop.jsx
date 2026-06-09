import React, { useState, useEffect, useRef, useCallback } from "react";
import logo from "@/public/Logo/logo.jpeg";
import { io } from "socket.io-client";

import {
  EditorTabs,
  TreeNode,
  CtxMenu,
  Modal,
  findNode,
  findParentChildren,
  deleteFromTree,
} from "@/lib/Functions.jsx";
import universalFormatter from "@/lib/Formator";


import FolderSidebar from "@/Components/FolderSidebar";
import FolderPanel from "@/Components/FolderPanel";
import ProjectUpload, {
  buildTreeFromFiles,
  buildAIContext,
} from "@/Components/ProjectUpload";

import { Editor } from "@monaco-editor/react";

// ─── helpers ────────────────────────────────────────────────────────────────

const extColor = (name) => EXT_COLOR[getExt(name)] || "#7cb7e3";
const EXT_ICON = {
  jsx: "⚛",
  tsx: "⚛",
  js: "JS",
  ts: "TS",
  css: "🎨",
  json: "{ }",
  md: "MD",
  env: "🔒",
  html: "🌐",
  py: "🐍",
  sh: "$",
};
const EXT_COLOR = {
  jsx: "#61dafb",
  tsx: "#3178c6",
  js: "#f7df1e",
  ts: "#3178c6",
  css: "#e44d9e",
  json: "#f59e0b",
  md: "#aaa",
  env: "#f87171",
  html: "#e06c75",
  py: "#3776ab",
  sh: "#10b981",
};
const getExt = (name) => name.split(".").pop().toLowerCase();

const DEFAULT_CONTENT = {
  jsx: 'import React from "react";\n\nfunction Component() {\n  return <div>Hello OWL</div>;\n}\n\nexport default Component;',
  js: '// JavaScript file\nconsole.log("owl");',
  css: "/* styles */\nbody {\n  margin: 0;\n}",
  json: '{\n  "name": "owl-project"\n}',
  md: "# Title\n\nWrite your docs here.",
  env: "VITE_SERVER_BACKEND=http://localhost:3000\n",
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

// ─── Main Component ──────────────────────────────────────────────────────────

function OWLDesktop() {
  // ── file tree state ──
  const [tree, setTree] = useState({
    id: "root",
    name: "project",
    type: "folder",
    open: true,
    children: [],
  });

  const [projectLoaded, setProjectLoaded] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [aiContextReady, setAiContextReady] = useState(false);

  // ── server folder id returned from project:upload callback ──
  // used to wire folder:file:update on every Ctrl+S
  const [serverFolderId, setServerFolderId] = useState(null);

  const [selectedUserFolder, setSelectedUserFolder] = useState(null);
  const [folderRefresh, setFolderRefresh] = useState(0);
  const [viewMode, setViewMode] = useState("local"); // "local" or "user-folders"

  // ── tabs / editor ──
  const [tabs, setTabs] = useState([]); // { id, name, content, dirty }
  const [activeTabId, setActiveTabId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  // ── modal ──
  const [modal, setModal] = useState(null); // { title, defaultValue, onConfirm }

  // ── context menu ──
  const [ctx, setCtx] = useState(null); // { x, y, items }

  // ── terminal ──
  const [inputValue, setInputValue] = useState("");
  const [terminalLogs, setTerminalLogs] = useState([
    { type: "system", text: "// Owl core shell pipeline initialized safely." },
    { type: "system", text: "[SYS] Background process agent listener active." },
  ]);

  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef(null);
  const logEndRef = useRef(null);
  const editorRef = useRef(null);

  // ── scroll terminal ──
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalLogs]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const socket = io(import.meta.env.VITE_SERVER_BACKEND, {
      auth: { token },
      transports: ["websocket", "polling"],
      withCredentials: true,
    });
    socket.on("connect", () => {
      console.log("[OWL Socket] Connected — id:", socket.id);
      setIsConnected(true);
    });
    socket.on("connect_error", (err) => {
      console.error("[OWL Socket] Connection error:", err.message);
      setIsConnected(false);
    });
    socket.on("disconnect", (reason) => {
      console.warn("[OWL Socket] Disconnected:", reason);
      setIsConnected(false);
    });

    socket.on("file:created", ({ name, type, parentId }) => {
      setTree((prev) => {
        const t = clone(prev);
        const parent = parentId ? findNode(t, parentId) : t;
        if (parent?.children) {
          parent.children.push(
            type === "folder" ? makeFolder(name) : makeFile(name),
          );
        }
        return t;
      });
    });

    socket.on("agent:response", ({ text }) => {
      setTerminalLogs((prev) => [
        ...prev,
        { type: "agent", text: `[OWL] ${text}` },
      ]);
    });

    // ── listen for live folder tree updates pushed from server ──
    // backend should emit this after any file write (FolderAgent, etc.)
    socket.on("folder:tree:updated", ({ folderId }) => {
      if (folderId) {
        console.log("[OWL Socket] folder:tree:updated for folderId:", folderId);
        setFolderRefresh((n) => n + 1);
      }
    });

    socketRef.current = socket;
    return () => socket.disconnect();
  }, []);

  // ─── socket emit helper ──────────────────────────────────────────────────
  // Waits for socket to be connected before emitting.
  // If already connected → emits immediately.
  // If not connected yet → queues on the next "connect" event.
  const emitWhenReady = useCallback((event, data, callback) => {
    const sock = socketRef.current;
    const safeCb = typeof callback === "function" ? callback : () => {};

    if (!sock) {
      console.error(`[emitWhenReady] Socket not initialized, dropping: ${event}`);
      safeCb({ success: false, error: "Socket not initialized" });
      return;
    }

    if (sock.connected) {
      console.log(`[emitWhenReady] Emitting immediately: ${event}`);
      sock.emit(event, data, safeCb);
    } else {
      console.warn(`[emitWhenReady] Socket not connected — queuing: ${event}`);
      sock.once("connect", () => {
        console.log(`[emitWhenReady] Socket now connected, emitting queued: ${event}`);
        sock.emit(event, data, safeCb);
      });
    }
  }, []);

  // ─── tree helpers ────────────────────────────────────────────────────────

  const toggleFolder = useCallback((id) => {
    setTree((prev) => {
      const t = clone(prev);
      const n = findNode(t, id);
      if (n) n.open = !n.open;
      return t;
    });
  }, []);

  const addNode = useCallback((parentId, type, name) => {
    setTree((prev) => {
      const t = clone(prev);
      const parent = findNode(t, parentId);
      if (!parent) return t;
      parent.open = true;
      const newNode = type === "folder" ? makeFolder(name) : makeFile(name);
      parent.children.push(newNode);
      socketRef.current?.emit("file:create", { name, type, parentId });
      if (type === "file") {
        setTimeout(() => openTab(newNode), 0);
      }
      return t;
    });
  }, []);

  const renameNode = useCallback((id, newName) => {
    setTree((prev) => {
      const t = clone(prev);
      const n = findNode(t, id);
      if (n) n.name = newName;
      return t;
    });
    setTabs((prev) =>
      prev.map((tab) => (tab.id === id ? { ...tab, name: newName } : tab)),
    );
    addTermLog(`Renamed → ${newName}`, "ok");
  }, []);

  const deleteNode = useCallback((id, name) => {
    setTree((prev) => {
      const t = clone(prev);
      deleteFromTree(t.children, id);
      return t;
    });
    setTabs((prev) => prev.filter((t) => t.id !== id));
    setActiveTabId((prev) => (prev === id ? null : prev));
    addTermLog(`Deleted ${name}`, "ok");
  }, []);

  const duplicateNode = useCallback((node) => {
    setTree((prev) => {
      const t = clone(prev);
      const siblings = findParentChildren(t, node.id);
      if (!siblings) return t;
      const copy = clone(node);
      copy.id = crypto.randomUUID();
      const ext = node.name.includes(".") ? "." + getExt(node.name) : "";
      const base = node.name.replace(ext, "");
      copy.name = base + "_copy" + ext;
      siblings.push(copy);
      return t;
    });
    addTermLog(`Duplicated ${node.name}`, "ok");
  }, []);

  // ─── project upload pipeline ─────────────────────────────────────────────

  const handleProjectUpload = useCallback((uploadedTree, aiCtx) => {
    // 1. Set the real file tree
    setTree(uploadedTree);
    setProjectLoaded(true);
    setAiContextReady(false);
    setServerFolderId(null); // reset until server confirms

    addTermLog(
      `[OWL] Project "${uploadedTree.name}" loaded — ${aiCtx.indexedFiles} files indexed.`,
      "ok",
    );

    // 2. Emit full tree to backend — use emitWhenReady to handle race condition
    //    where upload finishes before socket connects
    emitWhenReady(
      "project:upload",
      {
        tree: uploadedTree,
        meta: {
          projectName: aiCtx.projectName,
          totalFiles: aiCtx.totalFiles,
          indexedFiles: aiCtx.indexedFiles,
        },
      },
      (res) => {
        console.log("[project:upload] server ack:", res);
        if (res?.success) {
          // Store folderId so Ctrl+S can call folder:file:update
          setServerFolderId(res.folderId);
          addTermLog(`[OWL] Project synced to server. folderId: ${res.folderId}`, "ok");
          setViewMode("user-folders");
          setFolderRefresh((n) => n + 1);
        } else {
          addTermLog("[OWL] ⚠ Server sync failed: " + (res?.error ?? "unknown"), "error");
        }
      },
    );

    // 3. Send AI context index
    emitWhenReady(
      "project:index",
      {
        projectName: aiCtx.projectName,
        files: aiCtx.files.map((f) => ({
          path: f.path,
          language: f.language,
          lineCount: f.lineCount,
          content: f.content.split("\n").slice(0, 500).join("\n"),
        })),
      },
      (res) => {
        console.log("[project:index] server ack:", res);
        if (res?.success) {
          setAiContextReady(true);
          addTermLog(
            "[OWL AI] Project context indexed. Agent is now aware of your codebase.",
            "system",
          );
        }
      },
    );
  }, [emitWhenReady]);

  const handleEjectProject = useCallback(() => {
    if (!confirm("Eject project? This clears the current workspace.")) return;
    setTree({
      id: "root",
      name: "project",
      type: "folder",
      open: true,
      children: [],
    });
    setTabs([]);
    setActiveTabId(null);
    setProjectLoaded(false);
    setAiContextReady(false);
    setServerFolderId(null);
    addTermLog("[OWL] Workspace cleared.", "system");
  }, []);

  const openTab = (node) => {
    if (node.type !== "file") return;
    setTabs((prev) => {
      if (prev.find((t) => t.id === node.id)) return prev;
      return [
        ...prev,
        {
          id: node.id,
          name: node.name,
          content: node.content ?? "",
          dirty: false,
        },
      ];
    });
    setActiveTabId(node.id);
  };

  const handleEditorChange = (value) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId ? { ...t, content: value, dirty: true } : t,
      ),
    );
    setTree((prev) => {
      const t = clone(prev);
      const n = findNode(t, activeTabId);
      if (n) n.content = value;
      return t;
    });
  };

  const handleEditorMount = (editor) => {
    editorRef.current = editor;
  };

  const closeTab = (id) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      const next = prev.filter((t) => t.id !== id);
      if (activeTabId === id) {
        setActiveTabId(next[Math.min(idx, next.length - 1)]?.id ?? null);
      }
      return next;
    });
  };

  // Prettier Formatting + Core Sync Save Action
  const handleSaveAndFormat = async () => {
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTabId || !activeTab) return;

    let finalContent = editorRef.current
      ? editorRef.current.getValue()
      : activeTab.content;

    console.log(
      "%c[Monaco Extract Success]",
      "color: #a78bfa; font-weight: bold;",
      {
        fileName: activeTab.name,
        characterCount: finalContent.length,
        rawText: finalContent,
      },
    );

    const fileExtension = getExt(activeTab.name);

    if (editorRef.current) {
      try {
        finalContent = await universalFormatter(finalContent, fileExtension);
        editorRef.current.setValue(finalContent);
        addTermLog(`[Prettier] Formatted ${activeTab.name} smoothly.`, "ok");
      } catch (error) {
        console.error("Formatting error:", error);
        addTermLog(
          `[Prettier Warning] Syntax issue detected. Document saved raw.`,
          "error",
        );
        finalContent = editorRef.current.getValue();
      }
    }

    // Atomic update: set content + clear dirty flag
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId
          ? { ...t, content: finalContent, dirty: false }
          : t,
      ),
    );

    setTree((prev) => {
      const t = clone(prev);
      const n = findNode(t, activeTabId);
      if (n) n.content = finalContent;
      return t;
    });

    // ── Persist to server disk via folder:file:update ──
    // serverFolderId is set after project:upload ack from backend
    if (serverFolderId) {
      const sock = socketRef.current;
      console.log(
        "%c[Save → Server]",
        "color: #34d399; font-weight: bold;",
        { folderId: serverFolderId, fileName: activeTab.name, bytes: finalContent.length },
      );
      emitWhenReady(
        "folder:file:update",
        {
          folderId: serverFolderId,
          fileName: activeTab.name,
          content: finalContent,
        },
        (res) => {
          if (res?.success) {
            addTermLog(`[OWL] ${activeTab.name} saved to server.`, "ok");
          } else {
            addTermLog(`[OWL] ⚠ Server save failed: ${res?.error ?? "unknown"}`, "error");
          }
        },
      );
    } else {
      addTermLog("File saved locally. (Not synced — project not uploaded yet)", "system");
    }
  };

  // Ctrl+S Keyboard Interceptor Pipeline
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSaveAndFormat();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeTabId, tabs, serverFolderId]);

  // ─── context menu builder ────────────────────────────────────────────────

  const showCtxMenu = (e, node, quickAction) => {
    e.preventDefault();
    const x = Math.min(e.clientX, window.innerWidth - 180);
    const y = Math.min(e.clientY, window.innerHeight - 220);

    if (quickAction === "rename") {
      setModal({
        title: `Rename "${node.name}"`,
        defaultValue: node.name,
        onConfirm: (val) => renameNode(node.id, val),
      });
      return;
    }
    if (quickAction === "delete") {
      if (confirm(`Delete "${node.name}"?`)) deleteNode(node.id, node.name);
      return;
    }
    if (quickAction === "new-file") {
      setModal({
        title: "New file name",
        defaultValue: "untitled.js",
        onConfirm: (val) => addNode(node.id, "file", val),
      });
      return;
    }
    if (quickAction === "new-folder") {
      setModal({
        title: "New folder name",
        defaultValue: "new-folder",
        onConfirm: (val) => addNode(node.id, "folder", val),
      });
      return;
    }

    const isFolder = node.type === "folder";
    const items = isFolder
      ? [
          {
            icon: "📄",
            label: "New File",
            fn: () =>
              setModal({
                title: "New file name",
                defaultValue: "untitled.js",
                onConfirm: (v) => addNode(node.id, "file", v),
              }),
          },
          {
            icon: "📁",
            label: "New Folder",
            fn: () =>
              setModal({
                title: "New folder name",
                defaultValue: "new-folder",
                onConfirm: (v) => addNode(node.id, "folder", v),
              }),
          },
          "sep",
          {
            icon: "✏️",
            label: "Rename",
            fn: () =>
              setModal({
                title: `Rename "${node.name}"`,
                defaultValue: node.name,
                onConfirm: (v) => renameNode(node.id, v),
              }),
          },
          {
            icon: "🗑",
            label: "Delete",
            fn: () => {
              if (confirm(`Delete "${node.name}"?`))
                deleteNode(node.id, node.name);
            },
            danger: true,
          },
        ]
      : [
          { icon: "▶", label: "Open", fn: () => openTab(node) },
          {
            icon: "📋",
            label: "Duplicate",
            fn: () => duplicateNode(node),
          },
          "sep",
          {
            icon: "✏️",
            label: "Rename",
            fn: () =>
              setModal({
                title: `Rename "${node.name}"`,
                defaultValue: node.name,
                onConfirm: (v) => renameNode(node.id, v),
              }),
          },
          {
            icon: "🗑",
            label: "Delete",
            fn: () => {
              if (confirm(`Delete "${node.name}"?`))
                deleteNode(node.id, node.name);
            },
            danger: true,
          },
        ];

    setCtx({ x, y, items });
  };

  const addTermLog = (text, type = "system") => {
    setTerminalLogs((prev) => [...prev, { type, text }]);
  };

  const handleCommandSubmit = (e) => {
    if (e.key !== "Enter" || !inputValue.trim()) return;
    const cmd = inputValue.trim();
    setInputValue("");
    addTermLog(`owl-user@machine:~/project$ ${cmd}`, "user");

    const [c, ...args] = cmd.split(" ");

    switch (c) {
      case "ls":
        addTermLog(tree.children.map((n) => n.name).join("  "), "ok");
        break;
      case "touch":
        if (args[0]) {
          addNode("root", "file", args[0]);
          addTermLog(`Created: ${args[0]}`, "ok");
        }
        break;
      case "mkdir":
        if (args[0]) {
          addNode("root", "folder", args[0]);
          addTermLog(`Directory created: ${args[0]}`, "ok");
        }
        break;
      case "rm":
        if (args[0]) {
          const n = tree.children.find((x) => x.name === args[0]);
          if (n) deleteNode(n.id, n.name);
          else addTermLog(`No such file: ${args[0]}`, "error");
        }
        break;
      case "clear":
        setTerminalLogs([]);
        break;
      case "help":
        ["ls", "touch <name>", "mkdir <name>", "rm <name>", "clear"].forEach(
          (l) => addTermLog(l, "system"),
        );
        break;
      default:
        if (socketRef.current && isConnected) {
          socketRef.current.emit("agent:command", { command: cmd });
        } else {
          addTermLog("[ERROR] Socket not connected.", "error");
        }
    }
  };

  // ─── derived ─────────────────────────────────────────────────────────────

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;
  const activeFileName = activeTab?.name ?? null;

  return (
    <main className="flex flex-col h-screen w-screen bg-[#0b0b0c] text-[#e4e4e7] font-sans antialiased overflow-hidden select-none">
      {/* ── TITLE BAR ── */}
      <div className="flex items-center justify-between px-4 h-11 border-b border-[#1c1c1e] bg-[#0b0b0c] shrink-0">
        <div className="flex items-center space-x-6 font-mono text-xs">
          <div className="flex items-center space-x-2 font-semibold tracking-wider text-white">
            <img
              src={logo.src || logo}
              alt="Owl Logo"
              className="w-8 h-8 object-contain rounded-sm invert brightness-150 contrast-150 mix-blend-screen"
            />
            <span className="text-zinc-600 text-sm">/</span>
            <span className="text-sm text-white/90 font-medium tracking-wide drop-shadow-[0_0_8px_rgba(255,255,255,0.25)]">
              workspace
            </span>
          </div>
          <button className="text-zinc-400 hover:text-zinc-200 transition-colors">
            Files
          </button>
          <button className="text-zinc-400 hover:text-zinc-200 transition-colors">
            Edit
          </button>
          <button className="text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded text-[11px] font-medium">
            Activate
          </button>
        </div>

        <div className="flex items-center space-x-3 border border-[#1c1c1e] bg-[#121214] px-6 py-1 rounded text-[11px] font-mono">
          <div className="flex items-center space-x-2">
            <span
              className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-500" : "bg-zinc-600"}`}
            />
            <span className="text-zinc-300 font-medium">
              Owl Status: {isConnected ? "Legend" : "Offline"}
            </span>
          </div>
          <span className="text-zinc-800">|</span>
          <div className="text-zinc-400">
            Terminal: <span className="text-zinc-200">Active</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#121214] border border-[#1c1c1e] rounded overflow-hidden font-mono text-[11px]">
            <button
              onClick={() => setViewMode("local")}
              className={`px-3 py-1 transition-colors ${viewMode === "local" ? "bg-[#1c1c1e] text-white" : "text-zinc-500 hover:text-zinc-300"}`}
            >Local</button>
            <button
              onClick={() => { setViewMode("user-folders"); setFolderRefresh((n) => n + 1); }}
              className={`px-3 py-1 transition-colors ${viewMode === "user-folders" ? "bg-[#1c1c1e] text-white" : "text-zinc-500 hover:text-zinc-300"}`}
            >Folders</button>
          </div>
          <div className="text-[11px] font-mono text-zinc-500">main_branch*</div>
        </div>
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div className="flex flex-1 w-full overflow-hidden">
        {viewMode === "local" ? (
          <>
            {/* ── LOCAL FILE EXPLORER ── */}
            <div className="w-52 flex flex-col bg-[#0b0b0c] border-r border-[#1c1c1e] overflow-hidden shrink-0">
              <div className="flex items-center justify-between px-3 py-2 border-b border-[#1c1c1e] shrink-0">
                <span className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
                  {projectLoaded ? tree.name : "Explorer"}
                </span>
                <div className="flex items-center gap-1">
                  {projectLoaded ? (
                    <>
                      {/* AI context badge */}
                      <span
                        title={
                          aiContextReady ? "AI context ready" : "Indexing..."
                        }
                        className={`text-[9px] font-mono px-1 py-0.5 rounded border ${
                          aiContextReady
                            ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
                            : "text-zinc-600 border-zinc-700 animate-pulse"
                        }`}
                      >
                        {aiContextReady ? "AI ✓" : "AI…"}
                      </span>
                      <button
                        title="Eject project"
                        onClick={handleEjectProject}
                        className="text-zinc-700 hover:text-red-400 text-xs px-1 transition-colors"
                      >
                        ⏏
                      </button>
                      <button
                        title="Collapse All"
                        onClick={() =>
                          setTree((prev) => {
                            const t = clone(prev);
                            const collapse = (n) => {
                              if (n.type === "folder") {
                                n.open = false;
                                (n.children ?? []).forEach(collapse);
                              }
                            };
                            (t.children ?? []).forEach(collapse);
                            return t;
                          })
                        }
                        className="text-zinc-600 hover:text-zinc-200 text-xs px-1"
                      >
                        ⊟
                      </button>
                    </>
                  ) : null}
                </div>
              </div>

              {projectLoaded ? (
                <div className="flex-1 overflow-y-auto py-1 scrollbar-none">
                  {tree.children
                    .slice()
                    .sort((a, b) => {
                      if (a.type !== b.type)
                        return a.type === "folder" ? -1 : 1;
                      return a.name.localeCompare(b.name);
                    })
                    .map((node) => (
                      <TreeNode
                        key={node.id}
                        node={node}
                        depth={0}
                        selectedId={selectedId}
                        onSelect={(n) => {
                          setSelectedId(n.id);
                          if (n.type === "file") openTab(n);
                        }}
                        onOpen={toggleFolder}
                        onCtx={showCtxMenu}
                      />
                    ))}
                </div>
              ) : (
                /* compact upload prompt inside the sidebar */
                <div
                  className="flex-1 flex flex-col items-center justify-center gap-3 p-4 cursor-pointer group"
                  onClick={() =>
                    document.getElementById("owl-folder-input")?.click()
                  }
                >
                  <div className="text-2xl group-hover:scale-110 transition-transform">
                   😭
                  </div>
                  <p className="font-mono text-[10px] text-zinc-600 text-center leading-relaxed">
                    Upload a folder
                    <br />
                    to get started
                  </p>
                </div>
              )}
            </div>

            {/* ── CENTER EDITOR OR UPLOAD DROP ZONE ── */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Editor Tabs */}
              <EditorTabs
                tabs={tabs}
                activeId={activeTabId}
                onSwitch={setActiveTabId}
                onClose={closeTab}
              />

              {/* Editor Area or Upload Zone */}
              {projectLoaded ? (
                <Editor
                  height="100%"
                  language={
                    activeFileName ? getExt(activeFileName) : "javascript"
                  }
                  value={activeTab?.content || ""}
                  onChange={handleEditorChange}
                  onMount={handleEditorMount}
                  theme="vs-dark"
                />
              ) : (
                <ProjectUpload
                  onUpload={handleProjectUpload}
                  loading={uploadLoading}
                />
              )}
            </div>
          </>
        ) : (
          <>
            {/* ── USER FOLDERS SIDEBAR ── */}
            <FolderSidebar
              selectedFolder={selectedUserFolder}
              onSelectFolder={setSelectedUserFolder}
              onRefresh={folderRefresh}
              socket={socketRef.current}
            />

            {/* ── FOLDER PANEL ── */}
            <FolderPanel
              folderId={selectedUserFolder}
              onFileSelect={(fileName) => {
                addTermLog(`Opened file: ${fileName}`, "ok");
              }}
              socket={socketRef.current}
            />
          </>
        )}

        {/* ── OWL ASSISTANT SIDEBAR ── */}
        <div className="w-80 h-full bg-[#0b0b0c] flex flex-col overflow-hidden shrink-0">
          <div className="p-3 border-b border-[#1c1c1e] flex items-center justify-between">
            <div className="font-mono text-sm font-semibold uppercase tracking-wider text-white drop-shadow-[0_0_10px_rgba(255,200,0,0.3)]">
              OWL Communication
            </div>
            <span className="text-[10px] font-mono text-zinc-500">v4.2</span>
          </div>

          <div className="p-4 border-b border-[#1c1c1e] bg-[#121214]/40 flex flex-col items-center space-y-4">
            <div className="w-full h-36 bg-[#070708] border border-[#1c1c1e] rounded-lg flex items-center justify-center p-4 overflow-hidden relative">
              <div className="absolute inset-0 bg-white/[0.01] pointer-events-none" />
              <img
                src={logo.src || logo}
                alt="OWL AI Agent View"
                className="h-full w-auto object-contain invert contrast-150 brightness-110 mix-blend-screen opacity-95"
              />
            </div>
            <div className="w-full space-y-2">
              <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
                Voice Feed Input
              </div>
              <div className="h-8 bg-[#0e0e10] border border-[#1c1c1e] rounded flex items-center px-3 justify-between font-mono text-xs text-zinc-400">
                <span className="text-zinc-500 italic">
                  Awaiting voice command...
                </span>
                <div className="flex space-x-0.5 items-center h-3">
                  <div className="w-[2px] h-2 bg-zinc-600" />
                  <div className="w-[2px] h-3 bg-zinc-500" />
                  <div className="w-[2px] h-1 bg-zinc-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-4 bg-[#0b0b0c]">
            <div className="space-y-1.5">
              <div className="text-amber-500 font-medium text-[11px]">OWL:</div>
              <div className="text-zinc-300 bg-[#0e0e10] p-3 rounded border border-[#1c1c1e] leading-relaxed">
                I am watching your layout workspace. You can tell me to modify
                elements, generate Aceternity elements, or append components
                here dynamically.
              </div>
            </div>
            <div className="p-2.5 rounded border border-[#1c1c1e] bg-[#121214]/30 text-zinc-500 text-[10px] leading-normal">
              <span className="text-zinc-400 font-semibold uppercase block mb-0.5">
                Active Context
              </span>
              {aiContextReady ? (
                <>
                  <span className="text-amber-400">⬡ Project indexed.</span>{" "}
                  Analyzing <span className="text-zinc-300">{tree.name}</span>.{" "}
                  {activeFileName && (
                    <>
                      Focused on{" "}
                      <span className="text-zinc-300">{activeFileName}</span>.
                    </>
                  )}
                </>
              ) : projectLoaded ? (
                <span className="text-zinc-600 animate-pulse">
                  Indexing project…
                </span>
              ) : activeFileName ? (
                <>
                  Analyzing{" "}
                  <span className="text-zinc-300">{activeFileName}</span> tab
                  window.
                </>
              ) : (
                "No project loaded. Upload a folder to begin."
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div className="h-6 bg-[#0b0b0c] text-zinc-600 flex items-center justify-between px-4 border-t border-[#1c1c1e] font-mono text-[10px] shrink-0">
        <div className="flex items-center space-x-4">
          <span className={isConnected ? "text-emerald-500" : "text-zinc-600"}>
            {isConnected ? "⬡ OWL_CONNECTED" : "⬡ OWL_OFFLINE"}
          </span>
          <span>Prettier</span>
          <span className="text-zinc-700">Ctrl+S to save</span>
          {serverFolderId && (
            <span className="text-amber-500/60">⬡ synced</span>
          )}
        </div>
        <div>
          <span>
            {activeFileName
              ? getExt(activeFileName).toUpperCase() + " File"
              : "JavaScript JSX"}
          </span>
        </div>
      </div>

      {/* ── MODAL ── */}
      {modal && (
        <Modal
          title={modal.title}
          defaultValue={modal.defaultValue}
          onConfirm={modal.onConfirm}
          onClose={() => setModal(null)}
        />
      )}

      {/* ── CONTEXT MENU ── */}
      {ctx && (
        <CtxMenu
          x={ctx.x}
          y={ctx.y}
          items={ctx.items}
          onClose={() => setCtx(null)}
        />
      )}
    </main>
  );
}

export default OWLDesktop;