import { useState, useCallback, useEffect, useRef } from 'react';

export function Thumb({ 
  isTouching, 
  onTouchStart, 
  onTouchEnd, 
  onEscapeTap,
  isPinned,
  escapeTaps,
  disabled
}) {
  const [isPressed, setIsPressed] = useState(false);
  const tapCountRef = useRef(0);
  const lastTapTimeRef = useRef(0);

  const handlePointerDown = useCallback(() => {
    if (disabled) return;
    
    if (isPinned) {
      const now = Date.now();
      tapCountRef.current += 1;
      lastTapTimeRef.current = now;
      onEscapeTap(tapCountRef.current);
    }
    
    onTouchStart();
    setIsPressed(true);
  }, [disabled, isPinned, onTouchStart, onEscapeTap]);

  const handlePointerUp = useCallback(() => {
    if (disabled) return;
    onTouchEnd();
    setIsPressed(false);
  }, [disabled, onTouchEnd]);

  const handlePointerLeave = useCallback(() => {
    if (disabled) return;
    if (isPressed) {
      onTouchEnd();
      setIsPressed(false);
    }
  }, [disabled, isPressed, onTouchEnd]);

  useEffect(() => {
    if (!isPinned) {
      tapCountRef.current = 0;
    }
  }, [isPinned]);

  return (
    <div className="relative">
      <button
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onPointerCancel={handlePointerUp}
        disabled={disabled}
        className={`
          w-40 h-40 rounded-full text-2xl font-bold transition-all duration-100
          flex flex-col items-center justify-center gap-2 select-none
          ${disabled 
            ? 'bg-gray-600 cursor-not-allowed opacity-50' 
            : isPressed
              ? isPinned
                ? 'bg-red-600 scale-95 shadow-[0_0_30px_rgba(220,38,38,0.8)]'
                : 'bg-green-500 scale-95 shadow-[0_0_30px_rgba(34,197,94,0.6)]'
              : isPinned
                ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]'
                : 'bg-blue-500 hover:bg-blue-400 shadow-[0_8px_0_rgb(30,64,175),0_10px_20px_rgba(0,0,0,0.3)]'
          }
        `}
      >
        <span className="text-white">
          {isPinned ? `ESCAPE! ${5 - escapeTaps}` : 'TAP TO TOUCH'}
        </span>
      </button>
      
      {isPinned && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex gap-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${
                i < escapeTaps ? 'bg-red-500' : 'bg-gray-600'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}