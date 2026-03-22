import React, { useEffect, useRef, useState } from 'react';

interface JoystickProps {
  onChange: (dx: number, dy: number) => void;
}

export function Joystick({ onChange }: JoystickProps) {
  const [active, setActive] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const baseRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number, clientY: number) => {
    if (!baseRef.current) return;
    const rect = baseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const maxDist = rect.width / 2;
    
    const dist = Math.hypot(dx, dy);
    if (dist > maxDist) {
      dx = (dx / dist) * maxDist;
      dy = (dy / dist) * maxDist;
    }
    
    setPos({ x: dx, y: dy });
    onChange(dx / maxDist, dy / maxDist);
  };

  const handleEnd = () => {
    setActive(false);
    setPos({ x: 0, y: 0 });
    onChange(0, 0);
  };

  useEffect(() => {
    const onMouseUp = () => {
      if (active) handleEnd();
    };
    const onMouseMove = (e: MouseEvent) => {
      if (active) handleMove(e.clientX, e.clientY);
    };
    
    if (active) {
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('mousemove', onMouseMove);
    }
    return () => {
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [active]);

  return (
    <div 
      ref={baseRef}
      className="w-32 h-32 rounded-full bg-white/10 border border-white/20 relative touch-none"
      onMouseDown={(e) => {
        setActive(true);
        handleMove(e.clientX, e.clientY);
      }}
      onTouchStart={(e) => {
        setActive(true);
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }}
      onTouchMove={(e) => {
        if (active) {
          e.preventDefault();
          handleMove(e.touches[0].clientX, e.touches[0].clientY);
        }
      }}
      onTouchEnd={handleEnd}
      onTouchCancel={handleEnd}
    >
      <div 
        className="w-12 h-12 rounded-full bg-white/50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none shadow-lg"
        style={{ transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))` }}
      />
    </div>
  );
}
