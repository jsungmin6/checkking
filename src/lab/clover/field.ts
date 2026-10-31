import { random } from './domain';

export const WORLD = 960;
export const FIELD_EDGE = 90;
export const FIELD_RIM = 52;
const BACKGROUND_PLANT_COUNT = 97;
export type Plant = { x: number; y: number; size: number; angle: number; variant: number; phase: number; four: boolean };

function chooseEvenlyDistributed(candidates: Array<{ plant: Plant; rank: number }>, count: number): Plant[] {
  if (candidates.length <= count) return candidates.map(candidate => candidate.plant);
  const selected = new Set<number>();
  const nearestDistance = candidates.map(() => Infinity);
  const chosen: Plant[] = [];
  let last = candidates.reduce((best, candidate, index, all) => candidate.rank < all[best].rank ? index : best, 0);

  while (chosen.length < count) {
    selected.add(last);
    const origin = candidates[last].plant;
    chosen.push(origin);
    let next = -1;
    let farthest = -1;
    for (let index = 0; index < candidates.length; index++) {
      if (selected.has(index)) continue;
      const plant = candidates[index].plant;
      const distance = (plant.x - origin.x) ** 2 + (plant.y - origin.y) ** 2;
      nearestDistance[index] = Math.min(nearestDistance[index], distance);
      if (nearestDistance[index] > farthest ||
        (nearestDistance[index] === farthest && candidates[index].rank < candidates[next]?.rank)) {
        farthest = nearestDistance[index];
        next = index;
      }
    }
    last = next;
  }
  return chosen;
}

export function generateField(seed: number, targetCount = 3): Plant[] {
  const rnd = random(seed);
  const targetLimit = Math.max(1, Math.min(3, Math.floor(targetCount)));
  const targets = [{ x: 260 + rnd() * 440, y: 230 + rnd() * 500 }];
  for (let slot = 1; slot < targetLimit; slot++) {
    let placed = false;
    for (let attempt = 0; attempt < 120; attempt++) {
      const candidate = { x: 260 + rnd() * 440, y: 230 + rnd() * 500 };
      if (targets.every(target => Math.hypot(candidate.x - target.x, candidate.y - target.y) > 230)) {
        targets.push(candidate); placed = true; break;
      }
    }
    if (!placed) {
      let fallback = { x: 480, y: 480 }, bestDistance = -1;
      for (let y = 230; y <= 730; y += 50) for (let x = 260; x <= 700; x += 50) {
        const candidate = { x, y };
        const distance = Math.min(...targets.map(target => Math.hypot(candidate.x - target.x, candidate.y - target.y)));
        if (distance > bestDistance) { fallback = candidate; bestDistance = distance; }
      }
      targets.push(fallback);
    }
  }
  const plants: Plant[] = [];
  const backgroundCandidates: Array<{ plant: Plant; rank: number }> = [];
  // Fill the plot up to its pebble rim, while keeping each whole sprite inside it.
  const innerEdge = FIELD_EDGE + FIELD_RIM;
  const innerFarEdge = WORLD - innerEdge;
  // Keep the background canopy about 10% lighter so the enlarged clovers
  // remain distinct and easier to scan.
  const plantingInterval = 35;
  for (let y = FIELD_EDGE; y < WORLD - FIELD_EDGE; y += plantingInterval) {
    for (let x = FIELD_EDGE; x < WORLD - FIELD_EDGE; x += plantingInterval) {
      const px = x + (rnd() - .5) * 8;
      const py = y + (rnd() - .5) * 8;
      // Rank valid plants deterministically, then choose a consistent count
      // so one seed does not create a noticeably harder meadow than another.
      let densityHash = Math.imul((seed >>> 0) ^ Math.imul(x + 1, 374761393), 668265263);
      densityHash = Math.imul(densityHash ^ Math.imul(y + 1, 2246822519), 3266489917);
      densityHash ^= densityHash >>> 15;
      const densitySlot = densityHash >>> 0;
      const size = 30 + rnd() * 20;
      const variant = Math.floor(rnd() * 8);
      const renderSize = size * 2.7;
      const root = (80 + 48 * plantStemLength(variant) * 1.9) / 180 * renderSize;
      const sideExtent = renderSize * .46;
      const topExtent = root - renderSize * .15;
      const bottomExtent = Math.max(0, renderSize * .95 - root);
      if (px - sideExtent < innerEdge || px + sideExtent > innerFarEdge ||
        py - topExtent < innerEdge || py + bottomExtent > innerFarEdge) continue;
      if (targets.some(target => Math.hypot(px - target.x, py - target.y) < 20)) continue;
      backgroundCandidates.push({
        rank: densitySlot,
        plant: { x: px, y: py, size, angle: (rnd() - .5) * .42,
          variant, phase: rnd() * Math.PI * 2, four: false },
      });
    }
  }
  plants.push(...chooseEvenlyDistributed(backgroundCandidates, BACKGROUND_PLANT_COUNT));
  targets.forEach((target, index) => plants.push({ ...target, size: [42, 53, 48][index], angle: (rnd() - .5) * .28,
    variant: [1, 6, 3][index], phase: rnd() * Math.PI * 2, four: true }));
  return plants.sort((a, b) => a.y - b.y);
}

export function leafPath(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-7, -5, -22, -13, -20, -26);
  ctx.bezierCurveTo(-19, -39, -4, -40, 0, -30);
  ctx.bezierCurveTo(6, -40, 21, -38, 21, -25);
  ctx.bezierCurveTo(22, -13, 8, -4, 0, 0);
  ctx.closePath();
}

export function plantStemLength(variant: number): number {
  return .58 + (variant % 8) * .13;
}

export function makePlantSprite(four: boolean, variant: number, hue: number, golden = false): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 180;
  canvas.height = 240;
  const ctx = canvas.getContext('2d')!;
  ctx.translate(90, 80);
  ctx.scale(1.9, 1.9);
  const hueShift = [-8, -3, 1, 5, 9, -5, 4, 12][variant % 8];
  const plantHue = golden ? 43 + hueShift * .12 : hue + hueShift;
  const light = 25 + variant * 1.7;
  ctx.strokeStyle = golden ? '#8c641b' : `hsl(${plantHue - 4} 31% 25%)`;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  const stemLength = plantStemLength(variant);
  ctx.bezierCurveTo(-7, 17 * stemLength, 8, 35 * stemLength, 1, 48 * stemLength);
  ctx.stroke();
  const count = four ? 4 : 3;
  for (let i = 0; i < count; i++) {
    ctx.save();
    ctx.rotate(i * Math.PI * 2 / count);
    const gradient = ctx.createLinearGradient(-17, -32, 15, 0);
    gradient.addColorStop(0, golden ? '#fff2a8' : `hsl(${plantHue - 8} 40% ${light + 19}%)`);
    gradient.addColorStop(.5, golden ? '#f6c94b' : `hsl(${plantHue} 39% ${light + 6}%)`);
    gradient.addColorStop(1, golden ? '#bd811b' : `hsl(${plantHue + 9} 42% ${light - 5}%)`);
    leafPath(ctx);
    ctx.shadowColor = '#0c251866';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetY = 1.5;
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(24,61,25,.15)';
    ctx.lineWidth = .65;
    ctx.stroke();
    ctx.strokeStyle = golden ? 'rgba(255,248,205,.72)' : `hsla(${hue - 6}, 32%, 78%, .35)`;
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(-13, -25);
    ctx.quadraticCurveTo(-4, -21, 0, -14);
    ctx.quadraticCurveTo(5, -22, 14, -25);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(214,230,166,.2)';
    ctx.lineWidth = .6;
    ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(0, -28); ctx.stroke();
    for (let k = 0; k < 4; k++) {
      const y = -7 - k * 5;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(-9 - k, y - 7);
      ctx.moveTo(0, y); ctx.lineTo(9 + k, y - 7); ctx.stroke();
    }
    ctx.restore();
  }
  return canvas;
}
