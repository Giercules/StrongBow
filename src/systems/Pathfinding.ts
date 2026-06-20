import { TILE_SIZE } from '../core/constants';

export type Walkable = (x: number, y: number) => boolean;

const NB: [number, number][] = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

/**
 * Breadth-first flow field over the tile grid. compute(tx,ty) floods outward
 * from a target tile; sample(px,py) then returns a unit vector pointing one
 * step along the shortest walkable path toward that target. Diagonals are only
 * taken when both orthogonal neighbours are open, so paths never clip wall
 * corners — which is exactly what was making followers snag on corners.
 */
export class FlowField {
  readonly W: number;
  readonly H: number;
  private walk: Walkable;
  readonly dist: Int32Array;
  readonly dirX: Float32Array;
  readonly dirY: Float32Array;
  private targetX = -1;
  private targetY = -1;
  private queue: Int32Array;

  constructor(W: number, H: number, walk: Walkable) {
    this.W = W;
    this.H = H;
    this.walk = walk;
    const n = W * H;
    this.dist = new Int32Array(n);
    this.dirX = new Float32Array(n);
    this.dirY = new Float32Array(n);
    this.queue = new Int32Array(n);
  }

  target(): { x: number; y: number } {
    return { x: this.targetX, y: this.targetY };
  }

  /** True if the target tile differs from the last compute() target. */
  needsRecompute(tx: number, ty: number): boolean {
    return tx !== this.targetX || ty !== this.targetY;
  }

  compute(tx: number, ty: number): void {
    const { W, H, dist, dirX, dirY, walk, queue } = this;
    this.targetX = tx;
    this.targetY = ty;
    dist.fill(-1);
    if (tx < 0 || ty < 0 || tx >= W || ty >= H || !walk(tx, ty)) return;
    let head = 0;
    let tail = 0;
    const start = ty * W + tx;
    dist[start] = 0;
    dirX[start] = 0;
    dirY[start] = 0;
    queue[tail++] = start;
    while (head < tail) {
      const cur = queue[head++];
      const cx = cur % W;
      const cy = (cur / W) | 0;
      const cd = dist[cur];
      for (let k = 0; k < NB.length; k++) {
        const dx = NB[k][0];
        const dy = NB[k][1];
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const ni = ny * W + nx;
        if (dist[ni] !== -1 || !walk(nx, ny)) continue;
        if (dx !== 0 && dy !== 0 && (!walk(cx + dx, cy) || !walk(cx, cy + dy))) continue;
        dist[ni] = cd + 1;
        const len = Math.hypot(dx, dy) || 1;
        dirX[ni] = -dx / len; // point back toward the (closer) current cell
        dirY[ni] = -dy / len;
        queue[tail++] = ni;
      }
    }
  }

  /** Unit step toward target from a world position, or {0,0} if none. */
  sample(px: number, py: number): { x: number; y: number } {
    const tx = (px / TILE_SIZE) | 0;
    const ty = (py / TILE_SIZE) | 0;
    if (tx < 0 || ty < 0 || tx >= this.W || ty >= this.H) return { x: 0, y: 0 };
    const i = ty * this.W + tx;
    if (this.dist[i] <= 0) return { x: 0, y: 0 };
    return { x: this.dirX[i], y: this.dirY[i] };
  }
}
