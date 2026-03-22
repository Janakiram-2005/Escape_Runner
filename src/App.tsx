import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Game from './components/Game';
import { Skull, Play, Trophy, RotateCcw, Lock, Info, Home, ChevronRight, Clock, AlertTriangle, Zap, MapPin, Eye, RefreshCcw, Settings, ShoppingCart, Coins, Compass, Search, Pause, Users } from 'lucide-react';
import { SaveData, defaultSaveData } from './types';
import { io } from 'socket.io-client';

const socket = io();

export default function App() {
  const [gameState, setGameState] = useState<'menu' | 'intro' | 'levels' | 'playing' | 'level_end' | 'victory' | 'shop'>(() => {
    const saved = localStorage.getItem('escape_runner_state');
    return (saved as any) || 'menu';
  });

  const navigate = (state: typeof gameState) => {
    if (state !== gameState) {
      window.history.pushState({ gameState: state }, '', '');
      setGameState(state);
    }
  };

  useEffect(() => {
    // Initial push to history to enable back button from menu
    if (window.history.state?.gameState !== gameState) {
      window.history.replaceState({ gameState: gameState }, '', '');
    }

    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.gameState) {
        setGameState(e.state.gameState);
      } else {
        setGameState('menu');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [level, setLevel] = useState(() => {
    const saved = localStorage.getItem('escape_runner_level');
    return saved ? parseInt(saved, 10) : 1;
  });
  const [saveData, setSaveData] = useState<SaveData>(() => {
    const saved = localStorage.getItem('escape_runner_save_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...defaultSaveData,
          ...parsed,
          inventory: { ...defaultSaveData.inventory, ...(parsed.inventory || {}) },
          controls: { ...defaultSaveData.controls, ...(parsed.controls || {}) },
          mobileLayout: { ...defaultSaveData.mobileLayout, ...(parsed.mobileLayout || {}) }
        };
      } catch (e) {
        return defaultSaveData;
      }
    }
    // Migrate old save if exists
    const oldSaved = localStorage.getItem('escape_runner_progress');
    if (oldSaved) {
      return { ...defaultSaveData, unlockedLevel: parseInt(oldSaved, 10) || 1 };
    }
    return defaultSaveData;
  });

  useEffect(() => {
    localStorage.setItem('escape_runner_state', gameState);
  }, [gameState]);

  useEffect(() => {
    localStorage.setItem('escape_runner_level', level.toString());
  }, [level]);

  const [levelTime, setLevelTime] = useState(0);
  const [levelCoins, setLevelCoins] = useState(0);

  const [liveStats, setLiveStats] = useState({ livePlayers: 0, totalVisitors: 0 });

  useEffect(() => {
    socket.on('stats', (stats) => {
      setLiveStats(stats);
    });
    return () => {
      socket.off('stats');
    };
  }, []);

  const updateSave = useCallback((newData: Partial<SaveData>) => {
    setSaveData(prev => {
      const updated = { ...prev, ...newData };
      localStorage.setItem('escape_runner_save_v2', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleLevelComplete = useCallback((time: number, coinsCollected: number) => {
    setLevelTime(time);
    const rewardCoins = level * 10 + coinsCollected;
    setLevelCoins(rewardCoins);
    
    const nextLevel = level >= saveData.unlockedLevel ? level + 1 : saveData.unlockedLevel;
    
    updateSave({
      coins: saveData.coins + rewardCoins,
      unlockedLevel: nextLevel
    });

    if (level === 7) {
      setGameState('victory');
    } else {
      setGameState('level_end');
    }
  }, [level, saveData.coins, saveData.unlockedLevel, updateSave]);

  const [editingKey, setEditingKey] = useState<keyof SaveData['controls'] | null>(null);

  useEffect(() => {
    if (!editingKey) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      updateSave({
        controls: { ...saveData.controls, [editingKey]: e.key }
      });
      setEditingKey(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editingKey, saveData]);

  const buyItem = (item: keyof SaveData['inventory'], price: number) => {
    if (saveData.coins >= price) {
      updateSave({
        coins: saveData.coins - price,
        inventory: { ...saveData.inventory, [item]: saveData.inventory[item] + 1 }
      });
    }
  };

  return (
    <div className={`w-full h-screen h-[100dvh] bg-black text-zinc-100 font-sans selection:bg-rose-500/30 ${gameState === 'playing' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
      
      {/* Live Tracker */}
      <div className="fixed top-4 left-4 z-50 flex items-center gap-4 bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 text-xs font-medium text-zinc-300 shadow-lg">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{liveStats.livePlayers} Online</span>
        </div>
        <div className="w-px h-3 bg-white/20" />
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-indigo-400" />
          <span>{liveStats.totalVisitors} Visitors</span>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {gameState === 'menu' && (
          <motion.div 
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-full w-full flex flex-col items-center justify-center relative py-12"
          >
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
              <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-500/20 rounded-full blur-[120px]" />
              <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px]" />
            </div>

            <div className="absolute top-6 right-6 flex gap-4 z-20">
              <div className="bg-amber-500/20 border border-amber-500/50 text-amber-400 px-4 py-2 rounded-full flex items-center gap-2 font-bold">
                <Coins className="w-5 h-5" /> {saveData.coins}
              </div>
              <button onClick={() => navigate('shop')} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors">
                <ShoppingCart className="w-6 h-6" />
              </button>
              <button onClick={() => setIsSettingsOpen(true)} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors">
                <Settings className="w-6 h-6" />
              </button>
            </div>

            <div className="z-10 text-center max-w-lg px-6">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
                className="mb-8 flex justify-center"
              >
                <div className="w-28 h-28 bg-black/50 backdrop-blur-xl border border-white/10 rounded-3xl flex items-center justify-center shadow-2xl shadow-rose-500/20 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 to-indigo-500/20" />
                  <Skull className="w-14 h-14 text-rose-500 relative z-10" />
                </div>
              </motion.div>
              
              <motion.h1 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-5xl md:text-7xl font-black tracking-tighter mb-6 bg-gradient-to-br from-white via-white to-zinc-500 bg-clip-text text-transparent"
              >
                Escape Runner
              </motion.h1>
              
              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-lg md:text-xl text-zinc-400 mb-12 font-medium tracking-wide"
              >
                A deceptive maze adventure. <br className="hidden md:block" />
                <span className="text-rose-400/80">Trust nothing. Not even the arrows.</span>
              </motion.p>

              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                whileHover={{ scale: 1.05, backgroundColor: "#f4f4f5" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('intro')}
                className="bg-white text-black px-10 py-5 rounded-full font-black text-lg flex items-center gap-3 mx-auto transition-colors shadow-[0_0_40px_rgba(255,255,255,0.2)]"
              >
                <Play className="w-6 h-6 fill-current" />
                START ESCAPE
              </motion.button>
            </div>
          </motion.div>
        )}



        {gameState === 'shop' && (
          <motion.div 
            key="shop"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="min-h-full w-full flex flex-col items-center justify-center relative p-6 py-12"
          >
            <div className="z-10 max-w-4xl w-full bg-black/60 backdrop-blur-xl border border-amber-500/30 rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-black tracking-tight text-white flex items-center gap-3"><ShoppingCart /> Market</h2>
                <div className="flex items-center gap-4">
                  <div className="bg-amber-500/20 border border-amber-500/50 text-amber-400 px-4 py-2 rounded-full flex items-center gap-2 font-bold">
                    <Coins className="w-5 h-5" /> {saveData.coins}
                  </div>
                  <button onClick={() => navigate('menu')} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
                    <Home className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-blue-900/20 border border-blue-500/30 p-6 rounded-2xl flex flex-col items-center text-center">
                  <Eye className="w-12 h-12 text-blue-400 mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Vision Booster</h3>
                  <p className="text-sm text-zinc-400 mb-4 flex-1">Expands your visibility radius for 10 seconds.</p>
                  <p className="text-xs text-blue-300 mb-4">Owned: {saveData.inventory.vision}</p>
                  <button onClick={() => buyItem('vision', 20)} disabled={saveData.coins < 20} className="w-full bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:hover:bg-blue-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                    Buy (20 <Coins className="w-4 h-4"/>)
                  </button>
                </div>

                <div className="bg-emerald-900/20 border border-emerald-500/30 p-6 rounded-2xl flex flex-col items-center text-center">
                  <Compass className="w-12 h-12 text-emerald-400 mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Exit Finder</h3>
                  <p className="text-sm text-zinc-400 mb-4 flex-1">Shows a glowing arrow pointing directly to the exit for 10 seconds.</p>
                  <p className="text-xs text-emerald-300 mb-4">Owned: {saveData.inventory.exit}</p>
                  <button onClick={() => buyItem('exit', 30)} disabled={saveData.coins < 30} className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                    Buy (30 <Coins className="w-4 h-4"/>)
                  </button>
                </div>

                <div className="bg-purple-900/20 border border-purple-500/30 p-6 rounded-2xl flex flex-col items-center text-center">
                  <Search className="w-12 h-12 text-purple-400 mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Clue Maker</h3>
                  <p className="text-sm text-zinc-400 mb-4 flex-1">Removes all fake arrows from the maze for 10 seconds.</p>
                  <p className="text-xs text-purple-300 mb-4">Owned: {saveData.inventory.clue}</p>
                  <button onClick={() => buyItem('clue', 40)} disabled={saveData.coins < 40} className="w-full bg-purple-500 hover:bg-purple-400 disabled:opacity-50 disabled:hover:bg-purple-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                    Buy (40 <Coins className="w-4 h-4"/>)
                  </button>
                </div>

                <div className="bg-rose-900/20 border border-rose-500/30 p-6 rounded-2xl flex flex-col items-center text-center">
                  <Zap className="w-12 h-12 text-rose-400 mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Speed Boost</h3>
                  <p className="text-sm text-zinc-400 mb-4 flex-1">Increases your movement speed significantly for 10 seconds.</p>
                  <p className="text-xs text-rose-300 mb-4">Owned: {saveData.inventory.speed}</p>
                  <button onClick={() => buyItem('speed', 25)} disabled={saveData.coins < 25} className="w-full bg-rose-500 hover:bg-rose-400 disabled:opacity-50 disabled:hover:bg-rose-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                    Buy (25 <Coins className="w-4 h-4"/>)
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {gameState === 'intro' && (
          <motion.div 
            key="intro"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="min-h-full w-full flex flex-col items-center justify-center relative p-6 py-12"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#1e1b4b_0%,#000_100%)] opacity-50" />
            
            <div className="z-10 max-w-3xl w-full bg-black/60 backdrop-blur-xl border border-indigo-500/30 rounded-3xl p-8 md:p-12 shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <Info className="w-8 h-8 text-indigo-400" />
                <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">How to Play</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                <div className="flex items-center gap-4 bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
                  <div className="w-12 h-12 rounded-full bg-rose-500 shadow-[0_0_15px_#f43f5e] shrink-0" />
                  <div>
                    <h3 className="font-bold text-lg text-white">You</h3>
                    <p className="text-sm text-zinc-400">Navigate the dark maze.</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
                  <div className="w-12 h-12 bg-emerald-400 shadow-[0_0_15px_#34d399] shrink-0 flex items-center justify-center rounded-lg">
                    <MapPin className="text-emerald-900 w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">The Exit</h3>
                    <p className="text-sm text-zinc-400">Reach this to escape the level.</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
                  <div className="w-12 h-12 bg-amber-400 shadow-[0_0_15px_#fbbf24] shrink-0 flex items-center justify-center rounded-full">
                    <Coins className="text-amber-900 w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">Coins</h3>
                    <p className="text-sm text-zinc-400">Collect these to buy powerups in the Market.</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
                  <div className="w-12 h-12 bg-sky-400 shadow-[0_0_15px_#38bdf8] shrink-0 flex items-center justify-center" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}>
                    <Eye className="text-sky-900 w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">Powerups</h3>
                    <p className="text-sm text-zinc-400">Use Vision, Exit Finder, or Clue Maker from your inventory.</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
                  <div className="w-12 h-12 bg-red-500 shadow-[0_0_15px_#ef4444] shrink-0 flex items-center justify-center" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}>
                    <AlertTriangle className="text-red-900 w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">Spike Traps (Level 2+)</h3>
                    <p className="text-sm text-zinc-400">They toggle on and off. Touching active spikes resets you to the start!</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
                  <div className="w-12 h-12 bg-purple-500 shadow-[0_0_15px_#a855f7] shrink-0 flex items-center justify-center rounded-full">
                    <RefreshCcw className="text-purple-900 w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">Scrambler (Level 3+)</h3>
                    <p className="text-sm text-zinc-400">Reverses your movement controls for a few seconds!</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate('levels')}
                className="w-full bg-indigo-500 hover:bg-indigo-400 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-colors"
              >
                Understood <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}

        {gameState === 'levels' && (
          <motion.div 
            key="levels"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="min-h-full w-full flex flex-col items-center justify-center relative p-6 py-12"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#1e1b4b_0%,#000_100%)] opacity-50" />
            
            <div className="z-10 max-w-4xl w-full">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-white">Select Level</h2>
                <div className="flex items-center gap-4">
                  <div className="bg-amber-500/20 border border-amber-500/50 text-amber-400 px-4 py-2 rounded-full flex items-center gap-2 font-bold">
                    <Coins className="w-5 h-5" /> {saveData.coins}
                  </div>
                  <button onClick={() => navigate('menu')} className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
                    <Home className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {Array.from({length: Math.max(8, saveData.unlockedLevel + 1)}).map((_, i) => {
                  const lvl = i + 1;
                  const isUnlocked = lvl <= saveData.unlockedLevel;
                  return (
                    <motion.button 
                      key={lvl}
                      whileHover={isUnlocked ? { scale: 1.05, y: -5 } : {}}
                      whileTap={isUnlocked ? { scale: 0.95 } : {}}
                      disabled={!isUnlocked}
                      onClick={() => { setLevel(lvl); navigate('playing'); }}
                      className={`relative aspect-square rounded-3xl border flex flex-col items-center justify-center overflow-hidden transition-all ${
                        isUnlocked 
                          ? 'bg-indigo-500/10 border-indigo-500/50 hover:bg-indigo-500/20 hover:border-indigo-400 hover:shadow-[0_0_30px_rgba(99,102,241,0.3)] cursor-pointer' 
                          : 'bg-zinc-900/50 border-zinc-800 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      {isUnlocked ? (
                        <>
                          <span className="text-5xl font-black text-white mb-2">{lvl}</span>
                          <span className="text-xs font-bold tracking-widest text-indigo-300 uppercase">Play</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-10 h-10 text-zinc-600 mb-3" />
                          <span className="text-xs font-bold tracking-widest text-zinc-600 uppercase">Locked</span>
                        </>
                      )}
                    </motion.button>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}

        {gameState === 'playing' && (
          <motion.div 
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full h-full"
          >
            <Game 
              level={level} 
              saveData={saveData}
              onWin={handleLevelComplete} 
              onConsumePowerup={(type) => {
                updateSave({
                  inventory: { ...saveData.inventory, [type]: saveData.inventory[type] - 1 }
                });
              }}
              onGainPowerup={(type) => {
                updateSave({
                  inventory: { ...saveData.inventory, [type]: saveData.inventory[type] + 1 }
                });
              }}
              onQuit={() => navigate('menu')}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          </motion.div>
        )}

        {gameState === 'level_end' && (
          <motion.div 
            key="level_end"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="min-h-full w-full flex flex-col items-center justify-center relative p-6 py-12"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#064e3b_0%,#000_100%)] opacity-50" />
            
            <div className="z-10 max-w-md w-full bg-black/60 backdrop-blur-xl border border-emerald-500/30 rounded-3xl p-8 text-center shadow-2xl shadow-emerald-500/20">
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/50">
                <Zap className="w-10 h-10 text-emerald-400" />
              </div>
              
              <h2 className="text-4xl font-black tracking-tight text-white mb-2">Level {level} Cleared!</h2>
              
              <div className="flex items-center justify-center gap-6 mb-10">
                <div className="flex items-center gap-2 text-emerald-300 bg-emerald-500/10 px-4 py-3 rounded-xl border border-emerald-500/20">
                  <Clock className="w-5 h-5" />
                  <span className="text-xl font-bold">{levelTime.toFixed(2)}s</span>
                </div>
                <div className="flex items-center gap-2 text-amber-300 bg-amber-500/10 px-4 py-3 rounded-xl border border-amber-500/20">
                  <Coins className="w-5 h-5" />
                  <span className="text-xl font-bold">+{levelCoins}</span>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <button
                  onClick={() => { setLevel(level + 1); navigate('playing'); }}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-4 rounded-xl font-black text-lg transition-colors shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                >
                  NEXT LEVEL
                </button>
                <button
                  onClick={() => navigate('shop')}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-black py-4 rounded-xl font-bold text-lg transition-colors"
                >
                  Visit Market
                </button>
                <button
                  onClick={() => navigate('levels')}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-4 rounded-xl font-bold text-lg transition-colors"
                >
                  Back to Home
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {gameState === 'victory' && (
          <motion.div 
            key="victory"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-full w-full flex flex-col items-center justify-center relative py-12"
          >
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/20 rounded-full blur-[120px]" />
            </div>

            <div className="z-10 text-center max-w-lg px-6">
              <motion.div 
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", bounce: 0.5, duration: 0.8 }}
                className="mb-8 flex justify-center"
              >
                <div className="w-32 h-32 bg-emerald-500/10 backdrop-blur-xl border border-emerald-500/30 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/30">
                  <Trophy className="w-16 h-16 text-emerald-400" />
                </div>
              </motion.div>
              
              <motion.h2 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-5xl md:text-6xl font-black tracking-tighter mb-6 bg-gradient-to-br from-white via-emerald-100 to-emerald-500 bg-clip-text text-transparent"
              >
                You Escaped!
              </motion.h2>
              
              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-lg md:text-xl text-emerald-200/80 mb-12 font-medium"
              >
                You successfully navigated through all 7 deceptive mazes.
              </motion.p>

              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                whileHover={{ scale: 1.05, backgroundColor: "#34d399" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { 
                  updateSave({ unlockedLevel: 1 });
                  setLevel(1); 
                  navigate('menu'); 
                }}
                className="bg-emerald-500 text-black px-10 py-5 rounded-full font-black text-lg flex items-center gap-3 mx-auto transition-colors shadow-[0_0_40px_rgba(16,185,129,0.3)]"
              >
                <RotateCcw className="w-6 h-6" />
                PLAY AGAIN
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute inset-0 z-[100] p-6 bg-black/80 backdrop-blur-sm overflow-y-auto"
          >
            <div className="min-h-full flex items-center justify-center py-10">
              <div className="max-w-2xl w-full bg-zinc-900 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-black tracking-tight text-white flex items-center gap-3"><Settings /> Settings</h2>
                  <button onClick={() => setIsSettingsOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-white">
                    ✕
                  </button>
                </div>
                
                <h3 className="text-xl font-bold text-white mb-4">Keyboard Controls</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  {(Object.keys(saveData.controls) as Array<keyof SaveData['controls']>).map(key => (
                    <div key={key} className="flex items-center justify-between bg-zinc-800/50 p-4 rounded-xl border border-white/5">
                      <span className="text-zinc-400 font-medium capitalize">{key.replace('p1', 'Powerup 1 (Vision)').replace('p2', 'Powerup 2 (Exit)').replace('p3', 'Powerup 3 (Clue)').replace('p4', 'Powerup 4 (Speed)')}</span>
                      <button 
                        onClick={() => setEditingKey(key)}
                        className={`px-4 py-2 rounded-lg font-bold min-w-[80px] ${editingKey === key ? 'bg-indigo-500 text-white animate-pulse' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                      >
                        {editingKey === key ? 'Press Key...' : saveData.controls[key].toUpperCase()}
                      </button>
                    </div>
                  ))}
                </div>

                <h3 className="text-xl font-bold text-white mb-4">Mobile Layout</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-zinc-800/50 p-4 rounded-xl border border-white/5">
                    <label className="text-zinc-400 font-medium block mb-3">Joystick Side</label>
                    <div className="flex gap-2">
                      <button onClick={() => updateSave({ mobileLayout: { ...saveData.mobileLayout, joystickSide: 'left' } })} className={`flex-1 py-2 rounded-lg font-bold transition-colors ${saveData.mobileLayout.joystickSide === 'left' ? 'bg-indigo-500 text-white' : 'bg-white/10 text-zinc-400 hover:bg-white/20'}`}>Left</button>
                      <button onClick={() => updateSave({ mobileLayout: { ...saveData.mobileLayout, joystickSide: 'right' } })} className={`flex-1 py-2 rounded-lg font-bold transition-colors ${saveData.mobileLayout.joystickSide === 'right' ? 'bg-indigo-500 text-white' : 'bg-white/10 text-zinc-400 hover:bg-white/20'}`}>Right</button>
                    </div>
                  </div>
                  <div className="bg-zinc-800/50 p-4 rounded-xl border border-white/5">
                    <label className="text-zinc-400 font-medium block mb-3">Joystick Bottom Offset ({saveData.mobileLayout.joystickOffset}vh)</label>
                    <input type="range" min="0" max="40" value={saveData.mobileLayout.joystickOffset} onChange={(e) => updateSave({ mobileLayout: { ...saveData.mobileLayout, joystickOffset: parseInt(e.target.value) } })} className="w-full accent-indigo-500" />
                  </div>
                  <div className="bg-zinc-800/50 p-4 rounded-xl border border-white/5">
                    <label className="text-zinc-400 font-medium block mb-3">Powerups Side</label>
                    <div className="flex gap-2">
                      <button onClick={() => updateSave({ mobileLayout: { ...saveData.mobileLayout, powerupsSide: 'left' } })} className={`flex-1 py-2 rounded-lg font-bold transition-colors ${saveData.mobileLayout.powerupsSide === 'left' ? 'bg-indigo-500 text-white' : 'bg-white/10 text-zinc-400 hover:bg-white/20'}`}>Left</button>
                      <button onClick={() => updateSave({ mobileLayout: { ...saveData.mobileLayout, powerupsSide: 'center' } })} className={`flex-1 py-2 rounded-lg font-bold transition-colors ${saveData.mobileLayout.powerupsSide === 'center' ? 'bg-indigo-500 text-white' : 'bg-white/10 text-zinc-400 hover:bg-white/20'}`}>Center</button>
                      <button onClick={() => updateSave({ mobileLayout: { ...saveData.mobileLayout, powerupsSide: 'right' } })} className={`flex-1 py-2 rounded-lg font-bold transition-colors ${saveData.mobileLayout.powerupsSide === 'right' ? 'bg-indigo-500 text-white' : 'bg-white/10 text-zinc-400 hover:bg-white/20'}`}>Right</button>
                    </div>
                  </div>
                  <div className="bg-zinc-800/50 p-4 rounded-xl border border-white/5">
                    <label className="text-zinc-400 font-medium block mb-3">Powerups Bottom Offset ({saveData.mobileLayout.powerupsOffset}vh)</label>
                    <input type="range" min="0" max="40" value={saveData.mobileLayout.powerupsOffset} onChange={(e) => updateSave({ mobileLayout: { ...saveData.mobileLayout, powerupsOffset: parseInt(e.target.value) } })} className="w-full accent-indigo-500" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
