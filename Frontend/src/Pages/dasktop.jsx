import React, { useState, useEffect, useRef } from 'react';
import logo from "@/public/Logo/logo.jpeg";
import { io } from 'socket.io-client'; 

function Terminal() {
  const [inputValue, setInputValue] = useState('');
  const [terminalLogs, setTerminalLogs] = useState([
    { type: 'system', text: '// Owl core shell pipeline initialized safely.' },
    { type: 'system', text: '[SYS] Background process agent listener active.' }
  ]);
  const [fileList, setFileList] = useState([
  { name: 'index.js', type: 'file' },
  { name: 'components', type: 'folder' }
]);
  
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);
  const logEndRef = useRef(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLogs]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log("🔍 Token from localStorage:", token ? token.substring(0, 20) + "..." : "NOT FOUND");
    
    // Initialize socket connection ONLY inside useEffect
    const socket = io(import.meta.env.VITE_SERVER_BACKEND, {
      auth: { token },
      transports: ['websocket', 'polling'],
      withCredentials: true
    });

    socket.on("connect", () => {
      console.log("✅ Connected! Socket ID:", socket.id);
      setIsConnected(true);
    });

    socket.on("connect_error", (err) => {
      console.error("❌ Connection failed:", err.message);
      setIsConnected(false);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socketRef.current = socket;

    // Proper Cleanup
    return () => {
      socket.disconnect();
    };
  }, []);

  const createItem = (type) => {
  const name = prompt(`Enter ${type} name:`);
  if (name && socketRef.current) {
    socketRef.current.emit('file:create', { name, type });
  }
};

  const handleCommandSubmit = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      const userCommand = inputValue.trim();
      setTerminalLogs((prev) => [...prev, { type: 'user', text: `owl-user@machine:~$ ${userCommand}` }]);
      
      // Emit only if connected
      if (socketRef.current && isConnected) {
        socketRef.current.emit('agent:command', { command: userCommand });
      } else {
        setTerminalLogs((prev) => [...prev, { type: 'system', text: '[ERROR] Socket not connected.' }]);
      }
      setInputValue('');
    }
  };
  return (
    <main className='flex flex-col h-screen w-screen bg-[#0b0b0c] text-[#e4e4e7] font-sans overflow-hidden select-none'>
      
      {/* 1. ORIGINAL TOP TITLE BAR */}
      <div className='flex items-center justify-between px-4 h-11 border-b border-[#1c1c1e] bg-[#0b0b0c]'>
        <div className='flex items-center space-x-6 font-mono text-xs'>
          <div className='flex items-center space-x-2 font-semibold tracking-wider text-white'>
            {/* Logo asset scaled and brightened using imported Next.js image reference */}
            <img 
              src={logo.src || logo}
              alt="Owl Logo" 
              className='w-20 h-20 object-contain rounded-sm invert brightness-150 contrast-150 mix-blend-screen'
            />
            <span className='text-zinc-600 text-sm'>/</span>
            {/* Enlarged, bright, and luminous header text */}
            <span className='text-sm text-white/90 font-medium tracking-wide drop-shadow-[0_0_8px_rgba(255,255,255,0.25)]'>
              workspace
            </span>
          </div>
          <button className='text-zinc-400 hover:text-zinc-200 transition-colors'>Files</button>
          <button className='text-zinc-400 hover:text-zinc-200 transition-colors'>Edites</button>
          <button className='text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded text-[11px] font-medium'>
            Activate
          </button>
        </div>
        
        {/* The Sleek Central Status Bar Layout */}
        <div className='flex items-center space-x-3 border border-[#1c1c1e] bg-[#121214] px-6 py-1 rounded text-[11px] font-mono'>
          <div className='flex items-center space-x-2'>
            <span className='w-1.5 h-1.5 rounded-full bg-emerald-500'></span>
            <span className='text-zinc-300 font-medium'>Owl Status: Legend</span>
          </div>
          <span className='text-zinc-800'>|</span>
          <div className='text-zinc-400'>
            Terminal: <span className='text-zinc-200'>Killer</span>
          </div>
        </div>

        {/* System info / Branch alignment */}
        <div className='text-[11px] font-mono text-zinc-500'>
          main_branch*
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className='flex flex-1 w-full overflow-hidden'>
      <div className='w-32 flex flex-col pt-6 px-4 space-y-3 text-zinc-500 font-mono text-[11px] tracking-wide bg-[#0b0b0c] border-r border-[#1c1c1e]'>
  <div className='flex justify-between items-center'>
    <span className='text-zinc-200 font-medium'>Explorer</span>
    <div className='flex space-x-2'>
      <button onClick={() => createItem('file')} className='hover:text-white'>+</button>
      <button onClick={() => createItem('folder')} className='hover:text-white'>📁</button>
    </div>
  </div>
  {/* Add a list to render files dynamically */}
  {fileList.map((file) => (
    <div key={file.name} className='hover:text-zinc-300 cursor-pointer'>{file.name}</div>
  ))}
</div>


        {/* 3. CENTER EDITING CORE */}
        <div className='flex-1 flex flex-col bg-[#0e0e10] border-r border-[#1c1c1e] overflow-hidden'>
          
          {/* File Tabs */}
          <div className='flex h-9 bg-[#0b0b0c] border-b border-[#1c1c1e] font-mono text-xs items-center'>
            <div className='px-6 h-full flex items-center space-x-2 text-zinc-200 bg-[#0e0e10] border-r border-[#1c1c1e] font-medium'>
              <span className='text-amber-500 text-[10px]'>•</span>
              <span>file names</span>
            </div>
          </div>

          {/* Code Workspace */}
          <div className='flex-1 p-6 font-mono text-[13px] text-zinc-400 overflow-y-auto space-y-1 bg-[#0e0e10] leading-relaxed'>
            <div><span className='text-[#e06c75]'>import</span> React <span className='text-[#e06c75]'>from</span> <span className='text-[#98c379]'>'react'</span>;</div>
            <br />
            <div><span className='text-[#61afef]'>function</span> <span className='text-[#e5c07b]'>Terminal</span>() &#123;</div>
            <div className='pl-6 text-zinc-500'>
              <span className='text-[#e06c75]'>return</span> (
              <div className='pl-6 text-zinc-400'>
                &lt;<span className='text-[#e06c75]'>main</span> className=<span className='text-[#98c379]'>'flex flex-col'</span>&gt;
                <div className='pl-6 text-zinc-600'>
                  code ...
                </div>
                &lt;/<span className='text-[#e06c75]'>main</span>&gt;
              </div>
              )
            </div>
            <div>&#125;</div>
          </div>

          {/* 4. ACTIVE LIVE CLIENT TESTING TERMINAL PANEL */}
          <div className='h-52 border-t border-[#1c1c1e] bg-[#0b0b0c] flex flex-col font-mono text-xs'>
            <div className='flex items-center px-4 h-8 bg-[#0b0b0c] border-b border-[#1c1c1e] text-zinc-500 space-x-4 select-none'>
              <span className='text-zinc-200 font-medium border-b border-zinc-200 pb-2 pt-1'>Terminal</span>
              <span className='hover:text-zinc-300 cursor-pointer'>Output</span>
              <span className='hover:text-zinc-300 cursor-pointer'>Problems</span>
            </div>
            
            {/* Scrollable Command Streams Window */}
            <div className='flex-1 p-4 overflow-y-auto font-mono text-[12px] bg-[#0b0b0c] space-y-1.5 scrollbar-none'>
              {terminalLogs.map((log, index) => (
                <div 
                  key={index} 
                  className={
                    log.type === 'system' ? 'text-zinc-600' : 
                    log.type === 'agent' ? 'text-amber-400 font-medium' : 'text-zinc-200'
                  }
                >
                  {log.text}
                </div>
              ))}
              
              {/* Dynamic Living Shell Line Hook */}
              <div className='flex items-center text-zinc-300 pt-0.5'>
                <span className='text-emerald-500 font-medium shrink-0'>owl-user@machine:~/project$ </span>
                <input 
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleCommandSubmit}
                  className='flex-1 bg-transparent border-none outline-none text-zinc-100 font-mono text-[12px] p-0 m-0 focus:ring-0 selection:bg-zinc-700'
                  placeholder="Ask background AI agent to execute instructions..."
                  autoFocus
                />
              </div>
              <div ref={logEndRef} />
            </div>
          </div>

        </div>

        {/* 5. THE OWL ASSISTANT SIDEBAR */}
        <div className='w-80 h-full bg-[#0b0b0c] flex flex-col overflow-hidden'>
          
          {/* Header */}
          <div className='p-3 border-b border-[#1c1c1e] bg-[#0b0b0c] flex items-center justify-between'>
            <div className='font-mono text-sm font-semibold uppercase tracking-wider text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]'>
              OWL Communication
            </div>
            <span className='text-[10px] font-mono text-zinc-500'>v4.2</span>
          </div>

          {/* AI State/Voice Feed Panel */}
          <div className='p-4 border-b border-[#1c1c1e] bg-[#121214]/40 flex flex-col items-center space-y-4'>
            
            {/* Clean Logo Container Block - Patched dynamically with your imported image asset variable */}
            <div className='w-full h-36 bg-[#070708] border border-[#1c1c1e] rounded-lg flex items-center justify-center p-4 overflow-hidden shadow-inner relative'>
              <div className='absolute inset-0 bg-white/[0.01] pointer-events-none' />
              <img 
                src={logo.src || logo} 
                alt="OWL AI Agent View" 
                className='h-full w-auto object-contain invert contrast-150 brightness-110 mix-blend-screen opacity-95'
              />
            </div>

            <div className='w-full space-y-2'>
              <div className='text-[11px] font-mono text-zinc-500 uppercase tracking-wider'>
                Voice Feed Input
              </div>
              <div className='h-8 bg-[#0e0e10] border border-[#1c1c1e] rounded flex items-center px-3 justify-between font-mono text-xs text-zinc-400'>
                <span className='text-zinc-500 italic'>Awaiting voice command...</span>
                <div className='flex space-x-0.5 items-center h-3'>
                  <div className='w-[2px] h-2 bg-zinc-600'></div>
                  <div className='w-[2px] h-3 bg-zinc-500'></div>
                  <div className='w-[2px] h-1 bg-zinc-600'></div>
                </div>
              </div>
            </div>

          </div>

          {/* AI Response Feed */}
          <div className='flex-1 p-4 font-mono text-xs overflow-y-auto space-y-4 bg-[#0b0b0c]'>
            
            <div className='space-y-1.5'>
              <div className='text-amber-500 font-medium text-[11px]'>OWL:</div>
              <div className='text-zinc-300 bg-[#0e0e10] p-3 rounded border border-[#1c1c1e] leading-relaxed'>
                I am watching your layout workspace. You can tell me to modify elements, generate Aceternity elements, or append components here dynamically.
              </div>
            </div>

            <div className='p-2.5 rounded border border-[#1c1c1e] bg-[#121214]/30 text-zinc-500 text-[10px] leading-normal'>
              <span className='text-zinc-400 font-semibold uppercase block mb-0.5'>Active Context</span>
              Analyzing file changes on <span className='text-zinc-300'>file names</span> tab window.
            </div>

          </div>

        </div>

      </div>

      {/* 6. FOOTER STATUS BAR */}
      <div className='h-6 bg-[#0b0b0c] text-zinc-600 flex items-center justify-between px-4 text-xs border-t border-[#1c1c1e] font-mono text-[10px]'>
        <div className='flex items-center space-x-4'>
          <span className='text-zinc-400'>OWL_CONNECTED</span>
          <span>Prettier</span>
        </div>
        <div>
          <span>JavaScript JSX</span>
        </div>
      </div>

    </main>
  );
}

export default Terminal;