import React, { useRef, useState, useCallback } from "react";
import { ImagesBadge } from "@/components/ui/images-badge";

// ─── helpers ─────────────────────────────────────────────────────────────────

const getExt = (name) => name.split(".").pop().toLowerCase();

const SKIP = new Set([
  "node_modules", ".git", "dist", "build", ".next", ".cache",
  "__pycache__", ".DS_Store", "thumbs.db", ".venv", "venv",
]);

const TEXT_EXTS = new Set([
  "js","jsx","ts","tsx","css","scss","sass","less","html","htm",
  "json","md","mdx","txt","env","sh","bash","py","rb","go","rs",
  "c","cpp","h","java","kt","swift","vue","svelte","yaml","yml",
  "toml","ini","conf","gitignore","prettierrc","eslintrc","xml",
]);

const EXT_LANG = {
  js:"javascript", jsx:"javascript", ts:"typescript", tsx:"typescript",
  py:"python", rb:"ruby", go:"go", rs:"rust", css:"css", scss:"scss",
  html:"html", json:"json", md:"markdown", sh:"shell", bash:"shell",
  c:"c", cpp:"cpp", h:"c", java:"java", kt:"kotlin", swift:"swift",
  vue:"vue", svelte:"svelte", yaml:"yaml", yml:"yaml",
};

/** Read a File as text; returns "" on binary/error */
const readText = (file) =>
  new Promise((res) => {
    if (!TEXT_EXTS.has(getExt(file.name))) return res(null); // binary → skip content
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => res("");
    r.readAsText(file);
  });

/**
 * Converts flat FileList (with webkitRelativePath) into a nested tree
 * matching OWL's { id, name, type, open, children, content } schema
 */
export function buildTreeFromFiles(fileList) {
  const root = {
    id: "root",
    name: "project",
    type: "folder",
    open: true,
    children: [],
  };

  const dirMap = { "": root }; // path → node

  // ensure folder node exists, create ancestors if needed
  const ensureDir = (parts) => {
    let path = "";
    let parent = root;
    for (const part of parts) {
      const prev = path;
      path = path ? `${path}/${part}` : part;
      if (!dirMap[path]) {
        const node = {
          id: crypto.randomUUID(),
          name: part,
          type: "folder",
          open: depth(path) < 2, // auto-open first 2 levels
          children: [],
        };
        dirMap[prev || ""].children.push(node);
        dirMap[path] = node;
      }
      parent = dirMap[path];
    }
    return parent;
  };

  const depth = (p) => p.split("/").length;

  for (const { relativePath, content } of fileList) {
    const parts = relativePath.split("/");
    // skip hidden/blocked dirs anywhere in path
    if (parts.some((p) => SKIP.has(p) || p.startsWith("."))) continue;

    const fileName = parts.pop();
    if (!fileName) continue; // directory entry

    const parentNode = ensureDir(parts);
    parentNode.children.push({
      id: crypto.randomUUID(),
      name: fileName,
      type: "file",
      content: content ?? `// ${fileName} (binary — not editable)`,
    });
  }

  return root;
}

/**
 * Builds a compact AI context index from the flat file list.
 * Returns { projectName, totalFiles, files: [{path, language, content, lineCount}] }
 */
export function buildAIContext(fileList, projectName = "project") {
  const textFiles = fileList.filter((f) => f.content !== null);
  return {
    projectName,
    totalFiles: fileList.length,
    indexedFiles: textFiles.length,
    files: textFiles.map(({ relativePath, content }) => ({
      path: relativePath,
      language: EXT_LANG[getExt(relativePath.split("/").pop())] ?? "plaintext",
      lineCount: content.split("\n").length,
      content,
    })),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Props:
 *   onUpload(tree, aiContext)  — called with the built tree + AI index
 *   loading                    — bool, show spinner
 */
export default function ProjectUpload({ onUpload, loading }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(null); // null | { done, total }

  const processEntry = useCallback(async (entry, basePath = "") => {
    if (entry.isFile) {
      return new Promise((res) => {
        entry.file(async (file) => {
          const relativePath = basePath ? `${basePath}/${file.name}` : file.name;
          const content = await readText(file);
          res([{ relativePath, content }]);
        });
      });
    } else if (entry.isDirectory) {
      const name = entry.name;
      if (SKIP.has(name) || name.startsWith(".")) return [];
      const reader = entry.createReader();
      const entries = await new Promise((res) => {
        const all = [];
        const read = () => reader.readEntries((batch) => {
          if (!batch.length) return res(all);
          all.push(...batch);
          read();
        });
        read();
      });
      const childPath = basePath ? `${basePath}/${name}` : name;
      const nested = await Promise.all(
        entries.map((e) => processEntry(e, childPath))
      );
      return nested.flat();
    }
    return [];
  }, []);

  const processFiles = useCallback(async (items) => {
    setProgress({ done: 0, total: items.length });
    let allFiles = [];

    // DataTransferItemList (drag)
    if (items[0] instanceof DataTransferItem) {
      const entries = [];
      for (const item of items) {
        const e = item.webkitGetAsEntry?.();
        if (e) entries.push(e);
      }
      for (let i = 0; i < entries.length; i++) {
        const batch = await processEntry(entries[i]);
        allFiles.push(...batch);
        setProgress({ done: i + 1, total: entries.length });
      }
    } else {
      // FileList (input[type=file])
      const files = Array.from(items);
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const relativePath = f.webkitRelativePath || f.name;
        // skip blocked dirs
        const parts = relativePath.split("/");
        if (parts.some((p) => SKIP.has(p) || (p.startsWith(".") && p !== ".env"))) {
          setProgress({ done: i + 1, total: files.length });
          continue;
        }
        const content = await readText(f);
        allFiles.push({ relativePath, content });
        setProgress({ done: i + 1, total: files.length });
      }
    }

    setProgress(null);
    const projectName = allFiles[0]?.relativePath.split("/")[0] ?? "project";
    const tree = buildTreeFromFiles(allFiles);
    tree.name = projectName;
    const aiCtx = buildAIContext(allFiles, projectName);
    onUpload(tree, aiCtx);
  }, [processEntry, onUpload]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const items = Array.from(e.dataTransfer.items);
    if (items.length) processFiles(items);
  }, [processFiles]);

  const onInputChange = useCallback((e) => {
    const files = e.target.files;
    if (files?.length) processFiles(files);
    e.target.value = "";
  }, [processFiles]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#0b0b0c] relative overflow-hidden select-none">
      {/* ambient glow */}
      <div className="absolute w-64 h-64 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`
          relative z-10 flex flex-col items-center gap-5 p-10 rounded-xl border transition-all duration-200 cursor-pointer
          ${dragging
            ? "border-amber-500/60 bg-amber-500/5 scale-[1.02]"
            : "border-[#2a2a2e] bg-[#121214] hover:border-amber-500/30 hover:bg-[#141416]"
          }
        `}
        onClick={() => !loading && inputRef.current?.click()}
      >
        {/* icon */}
        <div className="relative">
          <div className="text-5xl">
            <ImagesBadge
            
            images={[
          "https://assets.aceternity.com/pro/agenforce-1.webp",
          "https://assets.aceternity.com/pro/agenforce-2.webp",
          "https://assets.aceternity.com/pro/agenforce-3.webp",
        ]}/>
                
          </div>
          {dragging && (
            <div className="absolute -inset-2 rounded-full border border-amber-500/40 animate-ping" />
          )}
        </div>

        <div className="text-center space-y-1.5">
          <p className="font-mono text-sm text-zinc-200 font-semibold tracking-wide">
            {loading ? "Processing..." : dragging ? "Drop to upload" : "Upload your project"}
          </p>
          <p className="font-mono text-xs text-zinc-600 leading-relaxed">
            Drag & drop a folder  ·  or click to browse
          </p>
          <p className="font-mono text-[10px] text-zinc-700 mt-1">
            node_modules, .git, dist are auto-skipped
          </p>
        </div>

        {/* progress bar */}
        {progress && (
          <div className="w-48">
            <div className="h-0.5 bg-[#1c1c1e] rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-100"
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
            <p className="text-center font-mono text-[10px] text-zinc-600 mt-1">
              {progress.done} / {progress.total} files
            </p>
          </div>
        )}

        {!loading && !progress && (
          <button
            onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
            className="font-mono text-[11px] px-5 py-2 rounded border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors tracking-wider uppercase"
          >
            Choose Folder
          </button>
        )}
      </div>

      {/* hidden file input */}
      <input
        ref={inputRef}
        type="file"
        // @ts-ignore
        webkitdirectory=""
        multiple
        className="hidden"
        onChange={onInputChange}
      />
    </div>
  );
}