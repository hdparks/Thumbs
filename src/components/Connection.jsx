import { useState } from 'react';

export function Connection({ 
  peerId, 
  connected, 
  isHost, 
  onStartGame 
}) {
  const [copied, setCopied] = useState(false);
  
  const roomUrl = `${window.location.origin}${window.location.pathname}?room=${peerId}`;
  console.log('[Connection] Generating URL with peerId:', peerId, 'url:', roomUrl);
  
  const copyUrl = async () => {
    await navigator.clipboard.writeText(roomUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = () => {
    if (!peerId) return 'bg-gray-500';
    if (connected) return 'bg-green-500';
    return 'bg-yellow-500 animate-pulse';
  };

  const getStatusText = () => {
    if (!peerId) return 'Initializing...';
    if (connected) return 'Connected!';
    return 'Waiting for opponent...';
  };

  return (
    <div className="bg-gray-900/80 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
        <span className="text-white font-medium">{getStatusText()}</span>
      </div>
      
      {peerId && !connected && (
        <div className="mb-4">
          <p className="text-gray-400 text-sm mb-2">Share this link with your opponent:</p>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={roomUrl}
              className="flex-1 bg-gray-800 text-white text-sm px-3 py-2 rounded border border-gray-700"
            />
            <button
              onClick={copyUrl}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-medium transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {connected && (
        <button
          onClick={onStartGame}
          className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg text-xl transition-all hover:scale-105 shadow-[0_4px_0_rgb(21,128,61)] active:shadow-none active:translate-y-1"
        >
          {isHost ? 'START GAME' : 'Waiting for host to start...'}
        </button>
      )}
    </div>
  );
}