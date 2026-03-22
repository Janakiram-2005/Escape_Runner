import React, { useEffect, useRef, useState } from 'react';
import { generateLevel, Level, PowerUp } from '../game/MazeGenerator';
import { Joystick } from './Joystick';
import { Eye, MapPin, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GameProps {
  level: number;
  onWin: (time: number) => void;
}

export default function Game({ level, onWin }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [levelData, setLevelData] = useState<Level | null>(null);
  const [visionTime, setVisionTime] = useState(0);
  const [invertTimeUI, setInvertTimeUI] = useState(0);
  const joystickRef = useRef({ dx: 0, dy: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    window.addEventListener('resize', resize);
    resize();

    const lvl = generateLevel(level);
    setLevelData(lvl);

    let player = { x: lvl.start.x + 0.5, y: lvl.start.y + 0.5, radius: 0.25 };
    let keys = { w: false, a: false, s: false, d: false, ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false };
    
    let visionBoostTime = 0;
    let invertTime = 0;
    let powerUps = [...lvl.powerUps];
    let activeTraps = [...lvl.traps];
    let trail: {x: number, y: number}[] = [];

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key in keys) keys[e.key as keyof typeof keys] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key in keys) keys[e.key as keyof typeof keys] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let lastTime = performance.now();
    let startTime = performance.now();
    let animationFrameId: number;

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      let dx = 0;
      let dy = 0;
      if (keys.w || keys.ArrowUp) dy -= 1;
      if (keys.s || keys.ArrowDown) dy += 1;
      if (keys.a || keys.ArrowLeft) dx -= 1;
      if (keys.d || keys.ArrowRight) dx += 1;

      if (dx === 0 && dy === 0) {
        dx = joystickRef.current.dx;
        dy = joystickRef.current.dy;
      } else {
        const len = Math.hypot(dx, dy);
        dx /= len;
        dy /= len;
      }

      if (invertTime > 0) {
        dx = -dx;
        dy = -dy;
      }

      const speed = 5;
      let newX = player.x + dx * speed * dt;
      let newY = player.y + dy * speed * dt;

      const r = player.radius;
      const grid = lvl.grid;
      
      const checkWall = (cx: number, cy: number) => {
        if (cy < 0 || cy >= lvl.height || cx < 0 || cx >= lvl.width) return true;
        return grid[Math.floor(cy)][Math.floor(cx)] === 1;
      };

      if (checkWall(newX + Math.sign(dx) * r, player.y - r + 0.05) ||
          checkWall(newX + Math.sign(dx) * r, player.y + r - 0.05)) {
        newX = player.x;
      }
      if (checkWall(newX - r + 0.05, newY + Math.sign(dy) * r) ||
          checkWall(newX + r - 0.05, newY + Math.sign(dy) * r)) {
        newY = player.y;
      }

      player.x = newX;
      player.y = newY;

      if (dx !== 0 || dy !== 0) {
        trail.push({x: player.x, y: player.y});
        if (trail.length > 15) trail.shift();
      } else if (trail.length > 0) {
        trail.shift();
      }

      if (Math.floor(player.x) === lvl.exit.x && Math.floor(player.y) === lvl.exit.y) {
        const timeTaken = (performance.now() - startTime) / 1000;
        onWin(timeTaken);
        return;
      }

      powerUps = powerUps.filter(p => {
        if (Math.hypot(p.x + 0.5 - player.x, p.y + 0.5 - player.y) < 0.8) {
          visionBoostTime = 5;
          return false;
        }
        return true;
      });

      activeTraps = activeTraps.filter(trap => {
        if (trap.type === 'invert') {
          if (Math.hypot(player.x - (trap.x + 0.5), player.y - (trap.y + 0.5)) < 0.5) {
            invertTime = 5;
            return false;
          }
          return true;
        }
        return true;
      });

      if (visionBoostTime > 0) {
        visionBoostTime -= dt;
        setVisionTime(Math.ceil(visionBoostTime));
      } else if (visionTime !== 0) {
        setVisionTime(0);
      }

      if (invertTime > 0) {
        invertTime -= dt;
        setInvertTimeUI(Math.ceil(invertTime));
      } else if (invertTimeUI !== 0) {
        setInvertTimeUI(0);
      }

      const tileSize = 60;
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;

      const cameraX = player.x * tileSize - screenW / 2;
      const cameraY = player.y * tileSize - screenH / 2;

      ctx.clearRect(0, 0, screenW, screenH);

      ctx.save();
      ctx.translate(-cameraX, -cameraY);

      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, lvl.width * tileSize, lvl.height * tileSize);

      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= lvl.width; x++) {
        ctx.moveTo(x * tileSize, 0);
        ctx.lineTo(x * tileSize, lvl.height * tileSize);
      }
      for (let y = 0; y <= lvl.height; y++) {
        ctx.moveTo(0, y * tileSize);
        ctx.lineTo(lvl.width * tileSize, y * tileSize);
      }
      ctx.stroke();

      ctx.fillStyle = '#1e1b4b';
      for (let y = 0; y < lvl.height; y++) {
        for (let x = 0; x < lvl.width; x++) {
          if (lvl.grid[y][x] === 1) {
            ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
            ctx.strokeStyle = '#4f46e5';
            ctx.lineWidth = 2;
            ctx.strokeRect(x * tileSize + 1, y * tileSize + 1, tileSize - 2, tileSize - 2);
          }
        }
      }

      for (const arrow of lvl.arrows) {
        const arrowPulse = Math.sin(time / 200 + arrow.x * 10 + arrow.y * 10) * 8;
        ctx.save();
        ctx.translate(arrow.x * tileSize + tileSize/2, arrow.y * tileSize + tileSize/2);
        const angle = Math.atan2(arrow.dy, arrow.dx);
        ctx.rotate(angle);
        
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 12 + Math.max(0, arrowPulse);
        ctx.fillStyle = '#d8b4fe';
        
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(-8, -10);
        ctx.lineTo(-4, 0);
        ctx.lineTo(-8, 10);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      const exitPulse = Math.sin(time / 200) * 5;
      ctx.fillStyle = '#34d399';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 20 + exitPulse;
      ctx.fillRect(lvl.exit.x * tileSize + 10, lvl.exit.y * tileSize + 10, tileSize - 20, tileSize - 20);
      ctx.shadowBlur = 0;

      for (const trap of activeTraps) {
        if (trap.type === 'spike') {
          const trapActive = Math.sin(time / 400 + trap.phase) > 0;
          
          ctx.save();
          ctx.translate(trap.x * tileSize + tileSize/2, trap.y * tileSize + tileSize/2);
          
          if (trapActive) {
            ctx.fillStyle = '#ef4444';
            ctx.shadowColor = '#dc2626';
            ctx.shadowBlur = 10;
            
            ctx.beginPath();
            ctx.moveTo(0, -tileSize/3);
            ctx.lineTo(tileSize/3, tileSize/3);
            ctx.lineTo(-tileSize/3, tileSize/3);
            ctx.fill();
            
            if (Math.hypot(player.x - (trap.x + 0.5), player.y - (trap.y + 0.5)) < 0.4) {
              player.x = lvl.start.x + 0.5;
              player.y = lvl.start.y + 0.5;
              trail = [];
            }
          } else {
            ctx.fillStyle = '#3f3f46';
            ctx.beginPath();
            ctx.arc(0, 0, tileSize/4, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        } else if (trap.type === 'invert') {
          const pulse = Math.sin(time / 200 + trap.phase) * 5;
          ctx.save();
          ctx.translate(trap.x * tileSize + tileSize/2, trap.y * tileSize + tileSize/2);
          ctx.rotate(-time / 500);
          ctx.fillStyle = '#a855f7';
          ctx.shadowColor = '#9333ea';
          ctx.shadowBlur = 15 + pulse;
          
          ctx.beginPath();
          for(let i=0; i<4; i++) {
            ctx.lineTo(0, -tileSize/3);
            ctx.rotate(Math.PI / 2);
            ctx.lineTo(0, -tileSize/8);
            ctx.rotate(Math.PI / 2);
          }
          ctx.fill();
          ctx.restore();
        }
      }

      for (const p of powerUps) {
        const pulse = Math.sin(time / 150) * 3;
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#0ea5e9';
        ctx.shadowBlur = 15 + pulse;
        
        ctx.save();
        ctx.translate(p.x * tileSize + tileSize/2, p.y * tileSize + tileSize/2);
        ctx.rotate(time / 1000);
        
        const size = tileSize / 5 + pulse / 5;
        ctx.beginPath();
        ctx.moveTo(0, -size * 1.5);
        ctx.lineTo(size, 0);
        ctx.lineTo(0, size * 1.5);
        ctx.lineTo(-size, 0);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
        ctx.shadowBlur = 0;
      }

      if (trail.length > 1) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (let i = 0; i < trail.length - 1; i++) {
          const pt1 = trail[i];
          const pt2 = trail[i+1];
          ctx.beginPath();
          ctx.moveTo(pt1.x * tileSize, pt1.y * tileSize);
          ctx.lineTo(pt2.x * tileSize, pt2.y * tileSize);
          
          const alpha = (i / trail.length) * 0.6;
          ctx.strokeStyle = `rgba(244, 63, 94, ${alpha})`;
          ctx.lineWidth = player.radius * tileSize * 1.5 * (0.3 + 0.7 * (i / trail.length));
          ctx.stroke();
        }
      }

      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.arc(player.x * tileSize, player.y * tileSize, player.radius * tileSize, 0, Math.PI * 2);
      ctx.shadowColor = '#e11d48';
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.restore();

      const baseVision = 5.5 * tileSize;
      const currentVision = visionBoostTime > 0 ? baseVision * 1.8 : baseVision;

      const gradient = ctx.createRadialGradient(screenW/2, screenH/2, currentVision * 0.4, screenW/2, screenH/2, currentVision);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.85)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 1)');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, screenW, screenH);

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [level, onWin]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <canvas ref={canvasRef} className="block w-full h-full" />
      
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]" />
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(transparent_50%,#000_50%)] bg-[length:100%_4px]" />

      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none z-10">
        <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center gap-4">
          <div className="w-10 h-10 bg-rose-500/20 rounded-full flex items-center justify-center border border-rose-500/30">
            <MapPin className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-wider uppercase">Level {level}</h2>
            <p className="text-zinc-400 text-xs font-medium tracking-widest uppercase mt-0.5">Find the green exit</p>
          </div>
        </div>
        
        <AnimatePresence>
          <div className="flex flex-col gap-2 items-end">
            {visionTime > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-blue-500/20 backdrop-blur-md border border-blue-500/50 text-blue-400 rounded-2xl px-5 py-3 flex items-center gap-3 shadow-[0_0_30px_rgba(59,130,246,0.3)]"
              >
                <Eye className="w-5 h-5 animate-pulse" />
                <span className="font-black tracking-wider text-lg">{visionTime}s</span>
              </motion.div>
            )}
            
            {invertTimeUI > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-purple-500/20 backdrop-blur-md border border-purple-500/50 text-purple-400 rounded-2xl px-5 py-3 flex items-center gap-3 shadow-[0_0_30px_rgba(168,85,247,0.3)]"
              >
                <RefreshCcw className="w-5 h-5 animate-spin" />
                <span className="font-black tracking-wider text-lg">{invertTimeUI}s</span>
              </motion.div>
            )}
          </div>
        </AnimatePresence>
      </div>

      <div className="absolute bottom-8 left-8 md:hidden z-20">
        <Joystick onChange={(dx, dy) => {
          joystickRef.current = { dx, dy };
        }} />
      </div>
      
      <div className="absolute bottom-8 right-8 hidden md:block bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-4 text-zinc-400 text-sm font-medium tracking-wide pointer-events-none z-10">
        Use WASD or Arrow Keys to move
      </div>
    </div>
  );
}
