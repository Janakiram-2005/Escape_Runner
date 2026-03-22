export interface Point {
  x: number;
  y: number;
}

export interface Arrow extends Point {
  dx: number;
  dy: number;
  isFake: boolean;
}

export interface Coin extends Point {
  id: string;
}

export interface Trap extends Point {
  type: 'spike' | 'invert';
  phase: number;
}

export interface MysteryBox extends Point {
  id: string;
}

export interface Level {
  width: number;
  height: number;
  grid: number[][]; // 1 = wall, 0 = path
  start: Point;
  exit: Point;
  arrows: Arrow[];
  coins: Coin[];
  traps: Trap[];
  mysteryBoxes: MysteryBox[];
}

export function generateLevel(levelNumber: number): Level {
  const width = 15 + levelNumber * 4;
  const height = 15 + levelNumber * 4;
  
  const grid = Array.from({ length: height }, () => Array(width).fill(1));
  
  const stack: Point[] = [];
  const start = { x: 1, y: 1 };
  grid[start.y][start.x] = 0;
  stack.push(start);
  
  const dirs = [
    { dx: 0, dy: -2 },
    { dx: 2, dy: 0 },
    { dx: 0, dy: 2 },
    { dx: -2, dy: 0 }
  ];
  
  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const unvisited = dirs.map(d => ({ x: current.x + d.dx, y: current.y + d.dy, dx: d.dx, dy: d.dy }))
      .filter(p => p.x > 0 && p.x < width - 1 && p.y > 0 && p.y < height - 1 && grid[p.y][p.x] === 1);
      
    if (unvisited.length > 0) {
      const next = unvisited[Math.floor(Math.random() * unvisited.length)];
      grid[current.y + next.dy / 2][current.x + next.dx / 2] = 0;
      grid[next.y][next.x] = 0;
      stack.push({ x: next.x, y: next.y });
    } else {
      stack.pop();
    }
  }
  
  const exit = { x: width - 2, y: height - 2 };
  grid[exit.y][exit.x] = 0; // ensure it's a path
  
  const path = findShortestPath(grid, start, exit);
  
  const arrows: Arrow[] = [];
  const coins: Coin[] = [];
  
  if (path) {
    for (let i = 0; i < path.length - 1; i++) {
      const current = path[i];
      const next = path[i + 1];
      
      // True arrows
      if (Math.random() < 0.03) {
        arrows.push({
          x: current.x,
          y: current.y,
          dx: Math.sign(next.x - current.x),
          dy: Math.sign(next.y - current.y),
          isFake: false
        });
      }
      
      // Fake arrows
      if (Math.random() < 0.05) {
        const possibleFakes = [
          { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }
        ].filter(d => {
          const nx = current.x + d.dx;
          const ny = current.y + d.dy;
          return grid[ny][nx] === 0 && (nx !== next.x || ny !== next.y);
        });
        
        if (possibleFakes.length > 0) {
          const fakeDir = possibleFakes[Math.floor(Math.random() * possibleFakes.length)];
          arrows.push({
            x: current.x,
            y: current.y,
            dx: fakeDir.dx,
            dy: fakeDir.dy,
            isFake: true
          });
        }
      }
    }
  }
  
  let numCoins = levelNumber * 2 + 2;
  let attempts = 0;
  while (numCoins > 0 && attempts < 100) {
    attempts++;
    const px = Math.floor(Math.random() * (width - 2)) + 1;
    const py = Math.floor(Math.random() * (height - 2)) + 1;
    if (grid[py][px] === 0 && (px !== start.x || py !== start.y) && (px !== exit.x || py !== exit.y)) {
      if (!coins.some(c => c.x === px && c.y === py)) {
        coins.push({ x: px, y: py, id: `coin-${numCoins}` });
        numCoins--;
      }
    }
  }
  
  let numTraps = levelNumber > 1 ? Math.floor(levelNumber * 1.5) : 0;
  let trapAttempts = 0;
  const traps: Trap[] = [];
  while (numTraps > 0 && trapAttempts < 200) {
    trapAttempts++;
    const px = Math.floor(Math.random() * (width - 2)) + 1;
    const py = Math.floor(Math.random() * (height - 2)) + 1;
    if (grid[py][px] === 0 && (px !== start.x || py !== start.y) && (px !== exit.x || py !== exit.y)) {
      if (!coins.some(c => c.x === px && c.y === py) && !traps.some(t => t.x === px && t.y === py)) {
        const type = (levelNumber >= 3 && Math.random() < 0.4) ? 'invert' : 'spike';
        traps.push({ x: px, y: py, type, phase: Math.random() * Math.PI * 2 });
        numTraps--;
      }
    }
  }
  
  let numBoxes = Math.max(1, Math.floor(levelNumber / 2));
  let boxAttempts = 0;
  const mysteryBoxes: MysteryBox[] = [];
  while (numBoxes > 0 && boxAttempts < 100) {
    boxAttempts++;
    const px = Math.floor(Math.random() * (width - 2)) + 1;
    const py = Math.floor(Math.random() * (height - 2)) + 1;
    if (grid[py][px] === 0 && (px !== start.x || py !== start.y) && (px !== exit.x || py !== exit.y)) {
      if (!coins.some(c => c.x === px && c.y === py) && !traps.some(t => t.x === px && t.y === py) && !mysteryBoxes.some(b => b.x === px && b.y === py)) {
        mysteryBoxes.push({ x: px, y: py, id: `box-${numBoxes}` });
        numBoxes--;
      }
    }
  }
  
  return { width, height, grid, start, exit, arrows, coins, traps, mysteryBoxes };
}

function findShortestPath(grid: number[][], start: Point, exit: Point): Point[] | null {
  const queue: { p: Point, path: Point[] }[] = [{ p: start, path: [start] }];
  const visited = new Set<string>();
  visited.add(`${start.x},${start.y}`);
  
  while (queue.length > 0) {
    const { p, path } = queue.shift()!;
    if (p.x === exit.x && p.y === exit.y) return path;
    
    const dirs = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }];
    for (const d of dirs) {
      const nx = p.x + d.dx;
      const ny = p.y + d.dy;
      if (grid[ny][nx] === 0 && !visited.has(`${nx},${ny}`)) {
        visited.add(`${nx},${ny}`);
        queue.push({ p: { x: nx, y: ny }, path: [...path, { x: nx, y: ny }] });
      }
    }
  }
  return null;
}
