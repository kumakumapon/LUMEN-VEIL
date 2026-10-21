import type { Area } from './types';
export type Point = { x: number; y: number };
export type Obstacle = { x: number; y: number; w: number; h: number };
// Normalized map coordinates. Obstacles are kept away from story markers and exits.
export const OBSTACLES: Record<Area, Obstacle[]> = {
  harbor: [{ x: .39, y: .60, w: .11, h: .12 }, { x: .75, y: .67, w: .10, h: .12 }],
  corridor: [{ x: .35, y: .59, w: .12, h: .09 }, { x: .63, y: .70, w: .09, h: .08 }],
  vault: [{ x: .52, y: .57, w: .12, h: .11 }],
  dock: [{ x: .46, y: .59, w: .12, h: .12 }],
  market: [{ x: .35, y: .55, w: .14, h: .11 }, { x: .62, y: .65, w: .12, h: .11 }],
  observatory: [{ x: .45, y: .58, w: .13, h: .10 }],
};
const margin = .015;
export function walkable(area: Area, x: number, y: number): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < .025 || x > .975 || y < .35 || y > .82) return false;
  return !OBSTACLES[area].some(o => x >= o.x - margin && x <= o.x + o.w + margin && y >= o.y - margin && y <= o.y + o.h + margin);
}
// A* over a small navigation mesh. Reject diagonal corner cutting and return a safe path.
export function routeTo(area: Area, start: Point, target: Point): Point[] {
  const cols = 46, rows = 23, minY = .35, maxY = .82;
  const point = (i: number): Point => ({ x: .025 + (i % cols) / (cols - 1) * .95, y: minY + Math.floor(i / cols) / (rows - 1) * (maxY - minY) });
  const all = Array.from({ length: cols * rows }, (_, i) => point(i));
  const allowed = all.map(p => walkable(area, p.x, p.y));
  const closest = (p: Point): number => {
    let index = -1, best = Infinity;
    for (let i = 0; i < all.length; i++) if (allowed[i]) {
      const distance = Math.hypot((all[i].x - p.x), (all[i].y - p.y) * 1.8);
      if (distance < best) { best = distance; index = i; }
    }
    return index;
  };
  const from = closest(start), to = closest(target);
  if (from < 0 || to < 0 || from === to) return [all[from] ?? start];
  const g = new Float64Array(all.length).fill(Infinity), parent = new Int32Array(all.length).fill(-1);
  const open = new Set<number>([from]), closed = new Set<number>();
  g[from] = 0;
  const heuristic = (i: number) => Math.hypot((all[i].x - all[to].x), (all[i].y - all[to].y) * 1.8);
  for (let steps = 0; open.size && steps < all.length; steps++) {
    let current = -1, best = Infinity;
    for (const i of open) { const score = g[i] + heuristic(i); if (score < best) { best = score; current = i; } }
    if (current === to) break;
    open.delete(current); closed.add(current);
    const cx = current % cols, cy = Math.floor(current / cols);
    for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,1],[1,-1],[-1,-1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const n = ny * cols + nx;
      if (!allowed[n] || closed.has(n)) continue;
      if (dx && dy && (!allowed[cy * cols + nx] || !allowed[ny * cols + cx])) continue;
      const distance = Math.hypot(all[n].x - all[current].x, (all[n].y - all[current].y) * 1.8);
      if (g[current] + distance < g[n]) { g[n] = g[current] + distance; parent[n] = current; open.add(n); }
    }
  }
  if (parent[to] === -1) return [all[from]];
  const path: Point[] = [];
  for (let i = to, safety = 0; i !== -1 && safety++ < all.length; i = parent[i]) path.push(all[i]);
  path.reverse();
  // Keep turning points to avoid creating a tween for every tiny grid segment.
  const reduced: Point[] = [];
  for (let i = 1; i < path.length - 1; i++) {
    const a = path[i - 1], b = path[i], c = path[i + 1];
    if (Math.abs((b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x)) > 1e-5) reduced.push(b);
  }
  reduced.push(path[path.length - 1]);
  return reduced;
}
