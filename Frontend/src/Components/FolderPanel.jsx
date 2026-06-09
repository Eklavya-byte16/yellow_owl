import React, { useState, useEffect } from "react";
import { Editor } from "@monaco-editor/react";

// ─── helpers ──────────────────────────────────────────────────────────────────

const getLanguageFromFileName = (fileName) => {
  const ext = fileName.split(".").pop().toLowerCase();
  const langMap = {
    js: "javascript", jsx: "javascript",
    ts: "typescript", tsx: "typescript",
    py: "python", java: "java", cpp: "cpp", c: "c",
    css: "css", html: "html", json: "json",
    md: "markdown", sql: "sql", sh: "shell",
  };
  return langMap[ext] || "plaintext";
};

// ─── tab bar ──────────────────────────────────────────────────────────────────

const TabBar = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: "files", label: "Files", icon: "📂" },
    { id: "agent", label: "AI Agent", icon: "◈" },
  ];
  return (
    <div className="flex bg-[#111827] border-b border-[#1f2937] select-none">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center gap-1.5 px-5 py-2.5 font-mono text-[13px] transition-all border-b-2 ${
            activeTab === tab.id
              ? "bg-[#0d1117] border-blue-600 text-gray-200"
              : "border-transparent text-gray-500 hover:text-gray-300"
          }`}
        >
          <span>{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
};

// ─── main component ──────────────────────────────────────────────────────────

const FolderPanel = ({ folderId, onFileSelect, socket }) => {
  const [activeTab, setActiveTab] = useState("files");
  const [folderInfo, setFolderInfo] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [editMode, setEditMode] = useState(false);
  // ✅ FIX: track save status for user feedback
  const [saveStatus, setSaveStatus] = useState(null); // null | "saving" | "saved" | "error"

  useEffect(() => {
    if (folderId && socket) {
      fetchFolderDetails();
    }
  // ✅ FIX: depend on folderId AND socket — handles the race where socket arrives late
  }, [folderId, socket]);

  const fetchFolderDetails = () => {
    if (!socket || !folderId) return;
    setLoading(true);
    socket.emit("folder:tree", {}, (response) => {
      if (response?.success) {
        const find = (nodes) => {
          for (const n of nodes) {
            if (String(n._id) === String(folderId)) return n;
            if (n.children?.length) { const r = find(n.children); if (r) return r; }
          }
          return null;
        };
        const folder = find(response.data ?? []);
        if (folder) {
          setFolderInfo({ name: folder.name, path: folder.path });
          setFiles(folder.files ?? []);
        }
      }
      setLoading(false);
    });
  };

  const handleFilesTabFocus = () => {
    setActiveTab("files");
    if (folderId) fetchFolderDetails();
  };

  const handleCreateFile = () => {
    if (!newFileName.trim()) return;
    if (!socket) return;

    socket.emit(
      "folder:file:create",
      { folderId, fileName: newFileName, content: "" },
      (response) => {
        if (response?.success) {
          setNewFileName("");
          setShowNewFileInput(false);
          fetchFolderDetails(); // ✅ re-fetch so new file appears in list
        } else {
          alert("Failed to create file");
        }
      }
    );
  };

  const handleSelectFile = (file) => {
    setSelectedFile(file);
    setEditMode(false);
    setSaveStatus(null);
    if (!socket) return;

    socket.emit(
      "folder:file:read",
      { folderId, fileName: file.name },
      (response) => {
        if (response?.success) {
          setFileContent(response.data.content);
          onFileSelect(file.name);
        }
      }
    );
  };

  const handleSaveFile = () => {
    if (!socket || !selectedFile) return;
    setSaveStatus("saving");

    socket.emit(
      "folder:file:update",
      { folderId, fileName: selectedFile.name, content: fileContent },
      (response) => {
        if (response?.success) {
          setEditMode(false);
          setSaveStatus("saved");
          // ✅ FIX: re-fetch to confirm server actually persisted the change
          fetchFolderDetails();
          setTimeout(() => setSaveStatus(null), 2000);
        } else {
          setSaveStatus("error");
          alert("Failed to save file");
        }
      }
    );
  };

  const handleDeleteFile = (fileName) => {
    if (!confirm(`Delete ${fileName}?`)) return;
    if (!socket) return;

    socket.emit(
      "folder:file:delete",
      { folderId, fileName },
      (response) => {
        if (response?.success) {
          if (selectedFile?.name === fileName) {
            setSelectedFile(null);
            setFileContent("");
            setSaveStatus(null);
          }
          fetchFolderDetails();
        } else {
          alert("Failed to delete file");
        }
      }
    );
  };

  if (!folderId) {
    return (
      <div className="flex-1 bg-[#0d1117] flex items-center justify-center text-gray-500">
        <div className="text-center font-mono">
          <p className="text-lg">📁 Select a folder to begin</p>
          <p className="text-xs text-gray-600 mt-2">Create or open a folder from the sidebar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1117]">
      {/* Folder header */}
      {folderInfo && (
        <div className="px-4 py-3 border-b border-[#1f2937] bg-[#111827]">
          <h2 className="text-gray-200 font-semibold text-[15px]">📂 {folderInfo.name}</h2>
          <p className="text-gray-600 text-[11px] font-mono mt-0.5">{folderInfo.path}</p>
        </div>
      )}

      {/* Tab bar */}
      <TabBar
        activeTab={activeTab}
        onTabChange={(tab) =>
          tab === "files" ? handleFilesTabFocus() : setActiveTab("agent")
        }
      />

      {/* Tab content */}
      {activeTab === "files" ? (
        <div className="flex flex-1 overflow-hidden gap-4 p-4">
          {/* Files list */}
          <div className="w-56 bg-[#111827] border border-[#1f2937] rounded-lg flex flex-col overflow-hidden shrink-0">
            <div className="px-3 py-2.5 border-b border-[#1f2937] text-gray-400 font-mono text-[11px] font-semibold uppercase tracking-wider">
              FILES
              {loading && (
                <span className="ml-2 text-zinc-700 animate-pulse normal-case tracking-normal">
                  loading...
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-1.5 scrollbar-none">
              {/* ✅ FIX: show loading state clearly instead of silently showing empty */}
              {loading ? (
                <div className="text-center py-4 font-mono text-[11px] text-zinc-700 animate-pulse">
                  Fetching files...
                </div>
              ) : files.filter((f) => !f.isDirectory).length === 0 ? (
                <div className="text-center py-4 font-mono text-[11px] text-zinc-700 italic">
                  No files yet
                </div>
              ) : (
                files
                  .filter((f) => !f.isDirectory)
                  .map((file) => (
                    <div
                      key={file.name}
                      className={`flex items-center justify-between px-2 py-1.5 mb-0.5 rounded-md cursor-pointer group font-mono text-[12px] transition-colors ${
                        selectedFile?.name === file.name
                          ? "bg-blue-700 text-white"
                          : "text-gray-300 hover:bg-[#1f2937]"
                      }`}
                    >
                      <span
                        className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
                        onClick={() => handleSelectFile(file)}
                        title={file.name}
                      >
                        {file.name}
                      </span>
                      <button
                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 text-[11px] px-0.5 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFile(file.name);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))
              )}

              {showNewFileInput && (
                <div className="p-1.5 mt-1">
                  <input
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    placeholder="filename.js"
                    autoFocus
                    className="w-full bg-[#1f2937] border border-[#374151] rounded text-gray-200 font-mono text-[12px] px-2 py-1 outline-none focus:border-blue-500 box-border"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateFile();
                      if (e.key === "Escape") setShowNewFileInput(false);
                    }}
                  />
                </div>
              )}
            </div>

            <div className="p-2 border-t border-[#1f2937]">
              <button
                onClick={() => setShowNewFileInput(true)}
                className="w-full bg-[#1f2937] hover:bg-[#374151] border border-[#374151] rounded-md text-gray-400 hover:text-gray-200 font-mono text-[12px] py-1.5 transition-colors"
              >
                + New File
              </button>
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 bg-[#111827] border border-[#1f2937] rounded-lg flex flex-col overflow-hidden">
            {selectedFile ? (
              <>
                <div className="px-3.5 py-2 border-b border-[#1f2937] flex items-center justify-between bg-[#0d1117]">
                  <span className="text-gray-400 font-mono text-[12px]">{selectedFile.name}</span>

                  <div className="flex items-center gap-2">
                    {/* ✅ save status indicator */}
                    {saveStatus === "saving" && (
                      <span className="font-mono text-[11px] text-zinc-500 animate-pulse">saving…</span>
                    )}
                    {saveStatus === "saved" && (
                      <span className="font-mono text-[11px] text-emerald-500">✓ saved</span>
                    )}
                    {saveStatus === "error" && (
                      <span className="font-mono text-[11px] text-red-400">✕ save failed</span>
                    )}

                    {editMode && (
                      <button
                        onClick={handleSaveFile}
                        className="bg-[#166534] border border-[#15803d] rounded text-emerald-200 font-mono text-[12px] px-3 py-1 hover:bg-[#15803d] transition-colors"
                      >
                        Save
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditMode(!editMode);
                        setSaveStatus(null);
                      }}
                      className={`border rounded font-mono text-[12px] px-3 py-1 transition-colors ${
                        editMode
                          ? "bg-[#1c1917] border-[#292524] text-stone-400 hover:text-stone-200"
                          : "bg-[#1e3a5f] border-blue-700 text-blue-300 hover:bg-blue-800/40"
                      }`}
                    >
                      {editMode ? "Cancel" : "Edit"}
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-hidden">
                  {editMode ? (
                    <textarea
                      value={fileContent}
                      onChange={(e) => setFileContent(e.target.value)}
                      className="w-full h-full bg-[#0d1117] text-gray-200 p-4 font-mono text-[13px] border-none outline-none resize-none leading-relaxed box-border"
                      spellCheck="false"
                    />
                  ) : (
                    <Editor
                      height="100%"
                      language={getLanguageFromFileName(selectedFile.name)}
                      value={fileContent}
                      theme="vs-dark"
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        fontSize: 13,
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                        padding: { top: 12 },
                      }}
                    />
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-zinc-700 font-mono text-[13px]">
                ← select a file to view
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-zinc-600 font-mono text-[13px]">
          Agent panel coming soon
        </div>
      )}
    </div>
  );
};

export default FolderPanel;