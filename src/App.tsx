import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Game from './components/Game';
import { Skull, Play, Trophy, RotateCcw, Lock, Info, Home, ChevronRight, Clock, AlertTriangle, Zap, MapPin, Eye, RefreshCcw } from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<'menu' | 'intro' | 'levels' | 'playing' | 'level_end' | 'victory'>('menu');
  const [level, setLevel] = useState(1);
  const [unlockedLevel, setUnlockedLevel] = useState(() => {
    const saved = localStorage.getItem('escape_runner_progress');
    return saved ? parseInt(saved, 10) : 1;
  });
  const [levelTime, setLevelTime] = useState(0);

  const handleLevelComplete = (time: number) => {
    setLevelTime(time);
    if (level === 7) {
      setGameState('victory');
    } else {
      if (level >= unlockedLevel) {
        const next = level + 1;
        setUnlockedLevel(next);
        localStorage.setItem('escape_runner_progress', next.toString());
      }
      setGameState('level_end');
    }
  };

  return (
    <div className="w-full h-screen bg-black text-zinc-100 overflow-hidden font-sans selection:bg-rose-500/30">
      <AnimatePresence mode="wait">
        {gameState === 'menu' && (
          <motion.div 
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full flex flex-col items-center justify-center relative"
          >
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
              <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-500/20 rounded-full blur-[120px]" />
              <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px]" />
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
                onClick={() => setGameState('intro')}
                className="bg-white text-black px-10 py-5 rounded-full font-black text-lg flex items-center gap-3 mx-auto transition-colors shadow-[0_0_40px_rgba(255,255,255,0.2)]"
              >
                <Play className="w-6 h-6 fill-current" />
                START ESCAPE
              </motion.button>
            </div>
          </motion.div>
        )}

        {gameState === 'intro' && (
          <motion.div 
            key="intro"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="w-full h-full flex flex-col items-center justify-center relative p-6"
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
                  <div className="w-12 h-12 bg-purple-300 shadow-[0_0_15px_#d8b4fe] shrink-0" style={{ clipPath: 'polygon(100% 50%, 0 0, 20% 50%, 0 100%)' }} />
                  <div>
                    <h3 className="font-bold text-lg text-white">Arrows</h3>
                    <p className="text-sm text-zinc-400">Some guide you. Some are <span className="text-rose-400">fake</span>.</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
                  <div className="w-12 h-12 bg-sky-400 shadow-[0_0_15px_#38bdf8] shrink-0 flex items-center justify-center" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}>
                    <Eye className="text-sky-900 w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">Vision Orb</h3>
                    <p className="text-sm text-zinc-400">Temporarily expands your sight.</p>
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
                onClick={() => setGameState('levels')}
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
            className="w-full h-full flex flex-col items-center justify-center relative p-6"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#1e1b4b_0%,#000_100%)] opacity-50" />
            
            <div className="z-10 max-w-4xl w-full">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-white">Select Level</h2>
                <button 
                  onClick={() => setGameState('menu')}
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                >
                  <Home className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {Array.from({length: 7}).map((_, i) => {
                  const lvl = i + 1;
                  const isUnlocked = lvl <= unlockedLevel;
                  return (
                    <motion.button 
                      key={lvl}
                      whileHover={isUnlocked ? { scale: 1.05, y: -5 } : {}}
                      whileTap={isUnlocked ? { scale: 0.95 } : {}}
                      disabled={!isUnlocked}
                      onClick={() => { setLevel(lvl); setGameState('playing'); }}
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
              onWin={handleLevelComplete} 
            />
          </motion.div>
        )}

        {gameState === 'level_end' && (
          <motion.div 
            key="level_end"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="w-full h-full flex flex-col items-center justify-center relative p-6"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#064e3b_0%,#000_100%)] opacity-50" />
            
            <div className="z-10 max-w-md w-full bg-black/60 backdrop-blur-xl border border-emerald-500/30 rounded-3xl p-8 text-center shadow-2xl shadow-emerald-500/20">
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/50">
                <Zap className="w-10 h-10 text-emerald-400" />
              </div>
              
              <h2 className="text-4xl font-black tracking-tight text-white mb-2">Level {level} Cleared!</h2>
              
              <div className="flex items-center justify-center gap-2 text-emerald-300 mb-10 bg-emerald-500/10 py-3 rounded-xl border border-emerald-500/20">
                <Clock className="w-5 h-5" />
                <span className="text-xl font-bold">{levelTime.toFixed(2)}s</span>
              </div>

              <div className="flex flex-col gap-4">
                <button
                  onClick={() => { setLevel(level + 1); setGameState('playing'); }}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-4 rounded-xl font-black text-lg transition-colors shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                >
                  NEXT LEVEL
                </button>
                <button
                  onClick={() => setGameState('levels')}
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
            className="w-full h-full flex flex-col items-center justify-center relative"
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
                  setUnlockedLevel(1); 
                  localStorage.setItem('escape_runner_progress', '1');
                  setLevel(1); 
                  setGameState('menu'); 
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
    </div>
  );
}
