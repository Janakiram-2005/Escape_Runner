import React, { useEffect, useRef, useState } from 'react';
import { generateLevel, Level, Coin } from '../game/MazeGenerator';
import { Joystick } from './Joystick';
import { Eye, MapPin, RefreshCcw, Compass, Search, Coins, Pause, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SaveData } from '../types';

interface GameProps {
  level: number;
  saveData: SaveData;
  onWin: (time: number, coinsCollected: number) => void;
  onConsumePowerup: (type: keyof SaveData['inventory']) => void;
  onGainPowerup: (type: keyof SaveData['inventory']) => void;
  onQuit: () => void;
  onOpenSettings: () => void;
}

export default function Game({ level, saveData, onWin, onConsumePowerup, onGainPowerup, onQuit, onOpenSettings }: GameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [levelData, setLevelData] = useState<Level | null>(null);
  const onWinRef = useRef(onWin);
  const onConsumePowerupRef = useRef(onConsumePowerup);
  const onGainPowerupRef = useRef(onGainPowerup);
  const saveDataRef = useRef(saveData);

  useEffect(() => { onWinRef.current = onWin; }, [onWin]);
  useEffect(() => { onConsumePowerupRef.current = onConsumePowerup; }, [onConsumePowerup]);
  useEffect(() => { onGainPowerupRef.current = onGainPowerup; }, [onGainPowerup]);
  useEffect(() => { saveDataRef.current = saveData; }, [saveData]);
  const [showTutorial, setShowTutorial] = useState(level === 1);
  const showTutorialRef = useRef(showTutorial);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    showTutorialRef.current = showTutorial;
  }, [showTutorial]);

  // Generate level data when level changes
  useEffect(() => {
    const lvl = generateLevel(level);
    setLevelData(lvl);
  }, [level]);
  
  const [visionTimeUI, setVisionTimeUI] = useState(0);
  const [invertTimeUI, setInvertTimeUI] = useState(0);
  const [exitTimeUI, setExitTimeUI] = useState(0);
  const [clueTimeUI, setClueTimeUI] = useState(0);
  const [speedTimeUI, setSpeedTimeUI] = useState(0);
  
  const [inventoryUI, setInventoryUI] = useState(saveData.inventory);
  const [collectedCoinsUI, setCollectedCoinsUI] = useState(0);

  const [trapMessage, setTrapMessage] = useState<{text: string, type: 'bad' | 'good'} | null>(null);
  const trapMessageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const showTrapMessageRef = useRef((text: string, type: 'bad' | 'good' = 'bad') => {
    setTrapMessage({text, type});
    if (trapMessageTimeoutRef.current) clearTimeout(trapMessageTimeoutRef.current);
    trapMessageTimeoutRef.current = setTimeout(() => setTrapMessage(null), 3000);
  });

  const joystickRef = useRef({ dx: 0, dy: 0 });
  const actionRef = useRef({ vision: false, exit: false, clue: false, speed: false });

  useEffect(() => {
    if (!levelData) return;
    
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    let player = { x: levelData.start.x + 0.5, y: levelData.start.y + 0.5, radius: 0.25 };
    let keys: Record<string, boolean> = {};
    
    let visionBoostTime = 0;
    let invertTime = 0;
    let exitFinderTime = 0;
    let clueMakerTime = 0;
    let speedBoostTime = 0;
    
    let coins = [...levelData.coins];
    let collectedCoins = 0;
    let activeTraps = [...levelData.traps];
    let activeBoxes = [...(levelData.mysteryBoxes || [])];
    let trail: {x: number, y: number}[] = [];
    
    let currentInventory = { ...saveData.inventory };

    const onKeyDown = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let lastTime = performance.now();
    let startTime = performance.now();
    let animationFrameId: number;

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const dpr = window.devicePixelRatio || 1;
      const screenW = canvas.width / dpr;
      const screenH = canvas.height / dpr;

      if (!isPausedRef.current && !showTutorialRef.current) {
        // Check Powerups
        const checkPowerup = (type: 'vision' | 'exit' | 'clue' | 'speed', key: string, timeVar: number) => {
          if ((keys[key?.toLowerCase()] || actionRef.current[type]) && currentInventory[type] > 0 && timeVar <= 0) {
            currentInventory[type]--;
            setInventoryUI({ ...currentInventory });
            onConsumePowerupRef.current(type);
            keys[key?.toLowerCase()] = false; // debounce
            actionRef.current[type] = false;
            return 10; // 10 seconds duration
          }
          actionRef.current[type] = false;
          return timeVar;
        };

        visionBoostTime = checkPowerup('vision', saveDataRef.current.controls.p1, visionBoostTime);
        exitFinderTime = checkPowerup('exit', saveDataRef.current.controls.p2, exitFinderTime);
        clueMakerTime = checkPowerup('clue', saveDataRef.current.controls.p3, clueMakerTime);
        speedBoostTime = checkPowerup('speed', saveDataRef.current.controls.p4, speedBoostTime);

        let dx = 0;
        let dy = 0;
        if (keys[saveDataRef.current.controls.up?.toLowerCase()] || keys['arrowup']) dy -= 1;
        if (keys[saveDataRef.current.controls.down?.toLowerCase()] || keys['arrowdown']) dy += 1;
        if (keys[saveDataRef.current.controls.left?.toLowerCase()] || keys['arrowleft']) dx -= 1;
        if (keys[saveDataRef.current.controls.right?.toLowerCase()] || keys['arrowright']) dx += 1;

        if (dx === 0 && dy === 0) {
          dx = joystickRef.current.dx;
          dy = joystickRef.current.dy;
        } else {
          const len = Math.hypot(dx, dy);
          if (len > 0) {
            dx /= len;
            dy /= len;
          }
        }

        if (invertTime > 0) {
          dx = -dx;
          dy = -dy;
        }

        const baseSpeed = 5;
        const speed = speedBoostTime > 0 ? baseSpeed * 1.8 : baseSpeed;
        let newX = player.x + dx * speed * dt;
        let newY = player.y + dy * speed * dt;

        const r = player.radius;
        const grid = levelData.grid;
        
        const checkWall = (cx: number, cy: number) => {
          if (cy < 0 || cy >= levelData.height || cx < 0 || cx >= levelData.width) return true;
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

        if (Math.floor(player.x) === levelData.exit.x && Math.floor(player.y) === levelData.exit.y) {
          const timeTaken = (performance.now() - startTime) / 1000;
          onWinRef.current(timeTaken, collectedCoins);
          return;
        }

        coins = coins.filter(c => {
          if (Math.hypot(c.x + 0.5 - player.x, c.y + 0.5 - player.y) < 0.8) {
            collectedCoins++;
            setCollectedCoinsUI(collectedCoins);
            return false;
          }
          return true;
        });

        activeBoxes = activeBoxes.filter(box => {
          if (Math.hypot(box.x + 0.5 - player.x, box.y + 0.5 - player.y) < 0.8) {
            const powerups: (keyof SaveData['inventory'])[] = ['vision', 'exit', 'clue', 'speed'];
            const randomPowerup = powerups[Math.floor(Math.random() * powerups.length)];
            currentInventory[randomPowerup]++;
            setInventoryUI({ ...currentInventory });
            onGainPowerupRef.current(randomPowerup);
            showTrapMessageRef.current(`Found a Mystery Box! +1 ${randomPowerup.toUpperCase()}`, 'good');
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

        // Update Timers
        if (visionBoostTime > 0) {
          visionBoostTime -= dt;
          setVisionTimeUI(Math.ceil(visionBoostTime));
        } else setVisionTimeUI(0);

        if (invertTime > 0) {
          invertTime -= dt;
          setInvertTimeUI(Math.ceil(invertTime));
        } else setInvertTimeUI(0);

        if (exitFinderTime > 0) {
          exitFinderTime -= dt;
          setExitTimeUI(Math.ceil(exitFinderTime));
        } else setExitTimeUI(0);

        if (clueMakerTime > 0) {
          clueMakerTime -= dt;
          setClueTimeUI(Math.ceil(clueMakerTime));
        } else setClueTimeUI(0);

        if (speedBoostTime > 0) {
          speedBoostTime -= dt;
          setSpeedTimeUI(Math.ceil(speedBoostTime));
        } else setSpeedTimeUI(0);
      }

      // Rendering
      const tileSize = 60;
      const cameraX = player.x * tileSize - screenW / 2;
      const cameraY = player.y * tileSize - screenH / 2;

      ctx.clearRect(0, 0, screenW, screenH);

      ctx.save();
      ctx.translate(-cameraX, -cameraY);

      ctx.fillStyle = '#18181b'; // Lighter path color
      ctx.fillRect(0, 0, levelData.width * tileSize, levelData.height * tileSize);

      ctx.strokeStyle = '#27272a'; // Lighter grid lines
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= levelData.width; x++) {
        ctx.moveTo(x * tileSize, 0);
        ctx.lineTo(x * tileSize, levelData.height * tileSize);
      }
      for (let y = 0; y <= levelData.height; y++) {
        ctx.moveTo(0, y * tileSize);
        ctx.lineTo(levelData.width * tileSize, y * tileSize);
      }
      ctx.stroke();

      ctx.fillStyle = '#4338ca'; // Brighter wall color
      for (let y = 0; y < levelData.height; y++) {
        for (let x = 0; x < levelData.width; x++) {
          if (levelData.grid[y][x] === 1) {
            ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
            ctx.strokeStyle = '#818cf8'; // Brighter wall border
            ctx.lineWidth = 2;
            ctx.strokeRect(x * tileSize + 1, y * tileSize + 1, tileSize - 2, tileSize - 2);
          }
        }
      }

      const visibleArrows = clueMakerTime > 0 ? levelData.arrows.filter(a => !a.isFake) : levelData.arrows;
      for (const arrow of visibleArrows) {
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
      ctx.fillRect(levelData.exit.x * tileSize + 10, levelData.exit.y * tileSize + 10, tileSize - 20, tileSize - 20);
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
              player.x = levelData.start.x + 0.5;
              player.y = levelData.start.y + 0.5;
              trail = [];
              showTrapMessageRef.current("Entered into the trap so start from the starting position !", 'bad');
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

      for (const c of coins) {
        ctx.save();
        ctx.translate(c.x * tileSize + tileSize/2, c.y * tileSize + tileSize/2);
        ctx.rotate(time / 500);
        ctx.fillStyle = '#fbbf24';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.ellipse(0, 0, tileSize/6, tileSize/4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef3c7';
        ctx.beginPath();
        ctx.ellipse(0, 0, tileSize/12, tileSize/6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      for (const box of activeBoxes) {
        ctx.save();
        ctx.translate(box.x * tileSize + tileSize/2, box.y * tileSize + tileSize/2);
        const floatY = Math.sin(time / 300) * 5;
        ctx.translate(0, floatY);
        ctx.fillStyle = '#8b5cf6'; // Violet
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 15 + Math.sin(time / 200) * 5;
        ctx.fillRect(-tileSize/4, -tileSize/4, tileSize/2, tileSize/2);
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${tileSize/3}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', 0, 0);
        ctx.restore();
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

      // Exit Finder Compass
      if (exitFinderTime > 0) {
        const angle = Math.atan2(levelData.exit.y - player.y, levelData.exit.x - player.x);
        ctx.save();
        ctx.translate(player.x * tileSize, player.y * tileSize);
        ctx.rotate(angle);
        ctx.fillStyle = 'rgba(52, 211, 153, 0.8)';
        ctx.shadowColor = '#34d399';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.moveTo(tileSize * 1.2, 0);
        ctx.lineTo(tileSize * 0.8, -tileSize * 0.2);
        ctx.lineTo(tileSize * 0.8, tileSize * 0.2);
        ctx.fill();
        ctx.restore();
      }

      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.arc(player.x * tileSize, player.y * tileSize, player.radius * tileSize, 0, Math.PI * 2);
      ctx.shadowColor = '#e11d48';
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.restore();

      const baseVision = 6 * tileSize;
      const currentVision = visionBoostTime > 0 ? baseVision * 1.8 : baseVision;

      // Create a proper fog of war gradient
      const gradient = ctx.createRadialGradient(screenW/2, screenH/2, currentVision * 0.1, screenW/2, screenH/2, currentVision);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(0.3, 'rgba(0, 0, 0, 0.2)');
      gradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.7)');
      gradient.addColorStop(0.85, 'rgba(0, 0, 0, 0.95)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 1)'); // Fully black outside vision

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, screenW, screenH);

      // Add a subtle noise/grain overlay to the dark areas for atmosphere
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * screenW;
        const y = Math.random() * screenH;
        const dist = Math.hypot(x - screenW/2, y - screenH/2);
        if (dist > currentVision * 0.5) {
          ctx.fillRect(x, y, 2, 2);
        }
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      resizeObserver.disconnect();
    };
  }, [levelData]);

  return (
    <div ref={containerRef} className={`relative w-full h-full bg-black overflow-hidden ${(!isPaused && !showTutorial) ? 'touch-none' : ''}`}>
      <canvas ref={canvasRef} className="block w-full h-full" />
      
      <AnimatePresence>
        {!levelData && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-black flex flex-col items-center justify-center gap-4"
          >
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-indigo-400 font-black tracking-widest uppercase animate-pulse">Generating Maze...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {levelData && (
        <>
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]" />
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(transparent_50%,#000_50%)] bg-[length:100%_4px]" />

          <AnimatePresence>
            {trapMessage && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                className={`absolute top-20 left-1/2 -translate-x-1/2 z-30 backdrop-blur-md text-white px-6 py-3 rounded-2xl font-bold border text-center max-w-[90vw] ${
                  trapMessage.type === 'bad' 
                    ? 'bg-red-500/90 shadow-[0_0_30px_rgba(239,68,68,0.5)] border-red-400' 
                    : 'bg-purple-500/90 shadow-[0_0_30px_rgba(168,85,247,0.5)] border-purple-400'
                }`}
              >
                {trapMessage.text}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none z-10">
            <div className="flex flex-col gap-4">
              <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center gap-4">
                <div className="w-10 h-10 bg-rose-500/20 rounded-full flex items-center justify-center border border-rose-500/30">
                  <MapPin className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white tracking-wider uppercase">Level {level}</h2>
                  <p className="text-zinc-400 text-xs font-medium tracking-widest uppercase mt-0.5">Find the green exit</p>
                </div>
              </div>
              
              <div className="bg-black/40 backdrop-blur-md border border-amber-500/30 rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3">
                <Coins className="w-5 h-5 text-amber-400" />
                <span className="text-lg font-black text-amber-400">{collectedCoinsUI}</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-4 items-end pointer-events-auto">
              <button 
                onClick={() => setIsPaused(true)}
                className="bg-black/40 backdrop-blur-md border border-white/10 p-3 rounded-full text-white hover:bg-white/20 transition-colors shadow-2xl"
              >
                <Pause className="w-6 h-6" />
              </button>
              <div className="flex flex-col gap-2 items-end pointer-events-none">
                <AnimatePresence>
                  {visionTimeUI > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: -20, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="bg-blue-500/20 backdrop-blur-md border border-blue-500/50 text-blue-400 rounded-2xl px-5 py-3 flex items-center gap-3 shadow-[0_0_30px_rgba(59,130,246,0.3)]"
                    >
                      <Eye className="w-5 h-5 animate-pulse" />
                      <span className="font-black tracking-wider text-lg">{visionTimeUI}s</span>
                    </motion.div>
                  )}
                  
                  {exitTimeUI > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: -20, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="bg-emerald-500/20 backdrop-blur-md border border-emerald-500/50 text-emerald-400 rounded-2xl px-5 py-3 flex items-center gap-3 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                    >
                      <Compass className="w-5 h-5 animate-pulse" />
                      <span className="font-black tracking-wider text-lg">{exitTimeUI}s</span>
                    </motion.div>
                  )}

                  {clueTimeUI > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: -20, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="bg-purple-500/20 backdrop-blur-md border border-purple-500/50 text-purple-400 rounded-2xl px-5 py-3 flex items-center gap-3 shadow-[0_0_30px_rgba(168,85,247,0.3)]"
                    >
                      <Search className="w-5 h-5 animate-pulse" />
                      <span className="font-black tracking-wider text-lg">{clueTimeUI}s</span>
                    </motion.div>
                  )}

                  {speedTimeUI > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: -20, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="bg-rose-500/20 backdrop-blur-md border border-rose-500/50 text-rose-400 rounded-2xl px-5 py-3 flex items-center gap-3 shadow-[0_0_30px_rgba(244,63,94,0.3)]"
                    >
                      <Zap className="w-5 h-5 animate-pulse" />
                      <span className="font-black tracking-wider text-lg">{speedTimeUI}s</span>
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
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div 
            className="absolute flex gap-4 z-20 md:!bottom-8 md:!left-1/2 md:!-translate-x-1/2 md:!right-auto"
            style={{
              bottom: `${saveData.mobileLayout?.powerupsOffset ?? 10}vh`,
              left: saveData.mobileLayout?.powerupsSide === 'left' ? '2rem' : saveData.mobileLayout?.powerupsSide === 'right' ? 'auto' : '50%',
              right: saveData.mobileLayout?.powerupsSide === 'right' ? '2rem' : 'auto',
              transform: (!saveData.mobileLayout || saveData.mobileLayout.powerupsSide === 'center') ? 'translateX(-50%)' : 'none',
            }}
          >
            <button 
              onPointerDown={() => actionRef.current.vision = true}
              disabled={inventoryUI.vision <= 0 || visionTimeUI > 0}
              className="relative bg-blue-900/40 backdrop-blur-md border border-blue-500/50 p-4 rounded-2xl disabled:opacity-50 disabled:grayscale transition-all hover:bg-blue-800/50 active:scale-95"
            >
              <Eye className="w-6 h-6 text-blue-400" />
              <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">{inventoryUI.vision}</span>
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-zinc-500 font-bold uppercase tracking-wider hidden md:block">{saveData.controls.p1}</span>
            </button>

            <button 
              onPointerDown={() => actionRef.current.exit = true}
              disabled={inventoryUI.exit <= 0 || exitTimeUI > 0}
              className="relative bg-emerald-900/40 backdrop-blur-md border border-emerald-500/50 p-4 rounded-2xl disabled:opacity-50 disabled:grayscale transition-all hover:bg-emerald-800/50 active:scale-95"
            >
              <Compass className="w-6 h-6 text-emerald-400" />
              <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">{inventoryUI.exit}</span>
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-zinc-500 font-bold uppercase tracking-wider hidden md:block">{saveData.controls.p2}</span>
            </button>

            <button 
              onPointerDown={() => actionRef.current.clue = true}
              disabled={inventoryUI.clue <= 0 || clueTimeUI > 0}
              className="relative bg-purple-900/40 backdrop-blur-md border border-purple-500/50 p-4 rounded-2xl disabled:opacity-50 disabled:grayscale transition-all hover:bg-purple-800/50 active:scale-95"
            >
              <Search className="w-6 h-6 text-purple-400" />
              <span className="absolute -top-2 -right-2 bg-purple-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">{inventoryUI.clue}</span>
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-zinc-500 font-bold uppercase tracking-wider hidden md:block">{saveData.controls.p3}</span>
            </button>

            <button 
              onPointerDown={() => actionRef.current.speed = true}
              disabled={inventoryUI.speed <= 0 || speedTimeUI > 0}
              className="relative bg-rose-900/40 backdrop-blur-md border border-rose-500/50 p-4 rounded-2xl disabled:opacity-50 disabled:grayscale transition-all hover:bg-rose-800/50 active:scale-95"
            >
              <Zap className="w-6 h-6 text-rose-400" />
              <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">{inventoryUI.speed}</span>
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-zinc-500 font-bold uppercase tracking-wider hidden md:block">{saveData.controls.p4}</span>
            </button>
          </div>

          <div 
            className="absolute z-20 md:hidden"
            style={{
              bottom: `${saveData.mobileLayout?.joystickOffset ?? 10}vh`,
              left: saveData.mobileLayout?.joystickSide === 'right' ? 'auto' : '2rem',
              right: saveData.mobileLayout?.joystickSide === 'right' ? '2rem' : 'auto',
            }}
          >
            <Joystick onChange={(dx, dy) => {
              joystickRef.current = { dx, dy };
            }} />
          </div>
          
          <div className="absolute bottom-8 right-8 hidden md:block bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-4 text-zinc-400 text-sm font-medium tracking-wide pointer-events-none z-10">
            Use {saveData.controls.up.toUpperCase()}{saveData.controls.left.toUpperCase()}{saveData.controls.down.toUpperCase()}{saveData.controls.right.toUpperCase()} or Arrow Keys to move
          </div>

          <AnimatePresence>
            {isPaused && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute inset-0 z-50 flex items-start justify-center p-6 bg-black/60 backdrop-blur-sm overflow-y-auto"
              >
                <div className="my-auto bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center flex flex-col gap-4">
                  <h2 className="text-3xl font-black text-white mb-6">Paused</h2>
                  <button onClick={() => setIsPaused(false)} className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-4 rounded-xl transition-colors text-lg">
                    Resume Game
                  </button>
                  <button onClick={onOpenSettings} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded-xl transition-colors text-lg">
                    Settings
                  </button>
                  <button onClick={onQuit} className="w-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 font-bold py-4 rounded-xl transition-colors text-lg">
                    Quit to Menu
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showTutorial && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute inset-0 z-50 flex items-start justify-center p-6 bg-black/60 backdrop-blur-sm overflow-y-auto"
              >
                <div className="my-auto bg-zinc-900 border border-indigo-500/50 rounded-3xl p-8 max-w-md w-full shadow-2xl shadow-indigo-500/20 text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
                  
                  <h3 className="text-2xl font-black text-white mb-4">Welcome to the Maze</h3>
                  
                  <div className="space-y-4 text-zinc-300 mb-8 text-left">
                    <p className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 font-bold text-white shrink-0">1</span>
                      Use <strong>{saveData.controls.up.toUpperCase()}{saveData.controls.left.toUpperCase()}{saveData.controls.down.toUpperCase()}{saveData.controls.right.toUpperCase()}</strong> or <strong>Arrow Keys</strong> to move your character (the red dot).
                    </p>
                    <p className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 font-bold text-white shrink-0">2</span>
                      Find the glowing green <strong className="text-emerald-400">Exit</strong> to complete the level.
                    </p>
                    <p className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 font-bold text-white shrink-0">3</span>
                      Collect <strong className="text-amber-400">Coins</strong> to buy powerups in the Market later.
                    </p>
                    <p className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 font-bold text-white shrink-0">4</span>
                      Beware of <strong className="text-purple-400">Arrows</strong>. Some point the right way, others lead to dead ends.
                    </p>
                  </div>

                  <button 
                    onClick={() => setShowTutorial(false)}
                    className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-3 rounded-xl transition-colors"
                  >
                    I'm Ready
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
