import React, { useState, useEffect, useRef } from "react";

const FolderSidebar = ({ selectedFolder, onSelectFolder, onRefresh, socket }) => {
  const [folders, setFolders] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);

  useEffect(() => {
    if (socket) fetchFolders();
  }, [onRefresh, socket]);

  // Also re-fetch when backend confirms a project:upload finished
  useEffect(() => {
    if (!socket) return;
    const onUploadDone = () => fetchFolders();
    socket.on("folder:upload:progress", (data) => {
      if (data?.done === true) fetchFolders();
    });
    return () => socket.off("folder:upload:progress", onUploadDone);
  }, [socket]);

  const fetchFolders = () => {
    if (!socket) return;
    setLoading(true);
    // BUG FIX 1: was "folders:tree" — correct event is "folder:tree"
    // BUG FIX 2: setLoading(false) was in finally{} which ran BEFORE the async callback
    socket.emit("folder:tree", {}, (response) => {
      if (response?.success) {
        setFolders(response.data ?? []);
      } else {
        console.error("[FolderSidebar] folder:tree failed:", response?.error);
      }
      setLoading(false); // inside callback, not finally
    });
  };

  const toggleFolder = (folderId) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      next.has(folderId) ? next.delete(folderId) : next.add(folderId);
      return next;
    });
  };

  const handleCreateFolder = (parentFolderId = null) => {
    if (!newFolderName.trim()) { alert("Please enter a folder name"); return; }
    if (!socket) return;
    // BUG FIX 3: was "folders:create"
    socket.emit("folder:create", { name: newFolderName, parentFolderId: parentFolderId || null }, (response) => {
      if (response?.success) {
        setNewFolderName("");
        setShowNewFolderInput(false);
        if (parentFolderId) setExpandedFolders((prev) => new Set(prev).add(parentFolderId));
        fetchFolders();
      } else {
        alert("Failed to create folder: " + (response?.error ?? "unknown"));
      }
    });
  };

  const handleRenameFolder = (folderId, currentName) => {
    const newName = prompt("Enter new folder name:", currentName);
    if (!newName || newName === currentName) return;
    if (!socket) return;
    // BUG FIX 4: was "folders:rename"
    socket.emit("folder:rename", { folderId, newName }, (response) => {
      if (response?.success) fetchFolders();
      else alert("Failed to rename folder");
    });
  };

  const handleDeleteFolder = (folderId) => {
    if (!confirm("Delete this folder and all its contents?")) return;
    if (!socket) return;
    // BUG FIX 5: was "folders:delete"
    socket.emit("folder:delete", { folderId }, (response) => {
      if (response?.success) {
        if (selectedFolder === folderId) onSelectFolder(null);
        fetchFolders();
      } else {
        alert("Failed to delete folder");
      }
    });
  };

  const renderFolderTree = (folderList, depth = 0) => {
    return folderList.map((folder) => (
      <div key={folder._id}>
        <div
          className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer group transition-colors ${
            selectedFolder === folder._id
              ? "bg-blue-700/40 text-white"
              : "hover:bg-gray-700 text-gray-200"
          }`}
          style={{ paddingLeft: 8 + depth * 14 + "px" }}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY, folderId: folder._id, folderName: folder.name });
          }}
        >
          <div className="flex items-center gap-1.5 flex-1 min-w-0" onClick={() => onSelectFolder(folder._id)}>
            <span
              className="shrink-0 w-4 text-center text-xs text-gray-500 select-none"
              onClick={(e) => { e.stopPropagation(); toggleFolder(folder._id); }}
            >
              {folder.children?.length > 0 ? (expandedFolders.has(folder._id) ? "▾" : "▸") : " "}
            </span>
            <span className="text-sm truncate">📁 {folder.name}</span>
            {/* BUG FIX 6: file count badge — shows how many files are in the folder */}
            {folder.files?.length > 0 && (
              <span className="ml-auto shrink-0 text-[10px] text-gray-500 font-mono">
                {folder.files.length}f
              </span>
            )}
          </div>

          {/* hover actions — BUG FIX 7: was "hidden group-hover:flex" which never worked without group on parent */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              className="text-xs text-gray-400 hover:text-yellow-400 px-1"
              onClick={(e) => { e.stopPropagation(); handleRenameFolder(folder._id, folder.name); }}
              title="Rename"
            >✎</button>
            <button
              className="text-xs text-gray-400 hover:text-red-400 px-1"
              onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder._id); }}
              title="Delete"
            >✕</button>
          </div>
        </div>

        {expandedFolders.has(folder._id) && folder.children?.length > 0 && (
          <div>{renderFolderTree(folder.children, depth + 1)}</div>
        )}
      </div>
    ));
  };

  return (
    <div className="w-64 bg-gray-800 text-gray-100 border-r border-gray-700 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h3 className="font-bold text-lg">📂 Your Folders</h3>
        {/* manual refresh always visible */}
        <button
          onClick={fetchFolders}
          className="text-gray-400 hover:text-white text-sm transition-colors"
          title="Refresh"
        >🔄</button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="text-center py-4 text-gray-400 text-sm animate-pulse">Loading...</div>
        ) : folders.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">
            No folders yet
            <br />
            <span className="text-xs text-gray-600">Upload a project or create a folder</span>
          </div>
        ) : (
          renderFolderTree(folders)
        )}

        {showNewFolderInput && (
          <div className="mt-2 p-2 bg-gray-700 rounded flex gap-2">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name..."
              autoFocus
              className="flex-1 bg-gray-600 text-white px-2 py-1 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFolder();
                if (e.key === "Escape") setShowNewFolderInput(false);
              }}
            />
            <button onClick={() => handleCreateFolder()} className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-sm">✓</button>
            <button onClick={() => setShowNewFolderInput(false)} className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-sm">✕</button>
          </div>
        )}
      </div>

      <div className="p-2 border-t border-gray-700">
        <button
          onClick={() => setShowNewFolderInput(true)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium"
        >
          + New Folder
        </button>
      </div>

      {contextMenu && (
        <div
          className="fixed bg-gray-700 border border-gray-600 rounded shadow-lg z-50 min-w-[140px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseLeave={() => setContextMenu(null)}
        >
          <button className="block w-full text-left px-4 py-2 text-sm text-gray-100 hover:bg-gray-600"
            onClick={() => { handleRenameFolder(contextMenu.folderId, contextMenu.folderName); setContextMenu(null); }}>
            ✎ Rename
          </button>
          <button className="block w-full text-left px-4 py-2 text-sm text-gray-100 hover:bg-gray-600"
            onClick={() => { setNewFolderName(""); setShowNewFolderInput(true); setContextMenu(null); }}>
            + New Folder
          </button>
          <button className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-600"
            onClick={() => { handleDeleteFolder(contextMenu.folderId); setContextMenu(null); }}>
            🗑 Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default FolderSidebar;