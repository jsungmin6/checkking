import { useEffect, useRef, useState } from 'react';
import { FIELD_EDGE, FIELD_RIM, generateField, makePlantSprite, plantStemLength, WORLD } from './field';
import { THEMES, type ActiveField } from './domain';

type Props = { field: ActiveField; onFound: (index: number) => void; onInspect: (message: string, penaltySeconds?: number) => void; hintSignal: number; readOnly?: boolean; demoMode?: 'find' | 'drag' | 'zoom' };
type Controls = { hint: () => void };

export function Meadow({ field, onFound, onInspect, hintSignal, readOnly = false, demoMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controls = useRef<Controls | null>(null);
  const fieldRef = useRef(field); fieldRef.current = field;
  const foundRef = useRef(onFound);
  const inspectRef = useRef(onInspect);
  foundRef.current = onFound;
  inspectRef.current = onInspect;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d', { alpha: false })!;
    const plants = generateField(field.seed, 1);
    const targets = plants.filter(p => p.four);
    const theme = THEMES[field.theme];
    const sprites = Array.from({ length: 8 }, (_, i) => makePlantSprite(false, i, theme.hue));
    // 황금 여부는 서버 상태에만 보관한다. 밭에서는 외형으로 미리 드러내지 않고,
    // 실제로 찾았을 때 결과 모달에서만 황금 클로버를 보여준다.
    const fourSprites = targets.map(target => makePlantSprite(true, target.variant, theme.hue));
    const soilTexture = document.createElement('canvas');
    soilTexture.width = 256; soilTexture.height = 256;
    const soilCtx = soilTexture.getContext('2d')!;
    let soilSeed = field.seed >>> 0;
    const soilRandom = () => { soilSeed = (soilSeed * 1664525 + 1013904223) >>> 0; return soilSeed / 4294967296; };
    for (let i = 0; i < 420; i++) {
      const light = soilRandom() > .48;
      soilCtx.fillStyle = light ? `rgba(235,202,151,${.08 + soilRandom() * .12})` : `rgba(69,45,24,${.05 + soilRandom() * .12})`;
      const x = soilRandom() * 256, y = soilRandom() * 256, r = .4 + soilRandom() * 1.5;
      soilCtx.beginPath(); soilCtx.ellipse(x, y, r * 1.5, r, soilRandom() * Math.PI, 0, Math.PI * 2); soilCtx.fill();
    }
    soilCtx.strokeStyle = 'rgba(235,205,163,.07)'; soilCtx.lineWidth = 1;
    for (let row = 0; row < 4; row++) {
      soilCtx.beginPath(); soilCtx.moveTo(0, 30 + row * 72);
      soilCtx.bezierCurveTo(80, 18 + row * 72, 170, 44 + row * 72, 256, 28 + row * 72); soilCtx.stroke();
    }
    const soilPattern = ctx.createPattern(soilTexture, 'repeat');
    const offsets = plants.map(() => ({ x: 0, y: 0, until: 0 }));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const zoomTarget = demoMode === 'zoom' ? targets[0] : undefined;
    const camera = { x: zoomTarget?.x ?? WORLD / 2, y: zoomTarget?.y ?? WORLD / 2, zoom: demoMode === 'zoom' ? 1.6 : 1 };
    // The hint marker is a one-shot clockwise sweep, not a persistent target ring.
    let hintRing: { index: number; startedAt: number } | null = demoMode === 'zoom'
      ? { index: 0, startedAt: performance.now() }
      : null;
    let width = 0, height = 0, base = 1, raf = 0, last = 0;
    let demoStartedAt = 0;
    let cameraAnimation: { fromX: number; fromY: number; fromZoom: number; toX: number; toY: number; toZoom: number; startedAt: number } | null = null;
    let animatingTarget: { index: number; startedAt: number } | null = null;
    let brush: { x: number; y: number; at: number } | null = null;
    const pointers = new Map<number, { x: number; y: number }>();
    let down = { x: 0, y: 0, at: 0 }, dragged = false, multi = false;
    let previousGesture: { x: number; y: number; distance: number } | null = null;

    function constrain() {
      const halfW = width / (base * camera.zoom * 2);
      const halfH = height / (base * camera.zoom * 2);
      const clampToField = (value: number, half: number) => {
        const min = FIELD_EDGE + half, max = WORLD - FIELD_EDGE - half;
        return min > max ? WORLD / 2 : Math.max(min, Math.min(max, value));
      };
      camera.x = clampToField(camera.x, halfW);
      camera.y = clampToField(camera.y, halfH);
    }
    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = rect.width; height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      base = Math.max(width / 780, height / 800);
      constrain();
    }
    function world(x: number, y: number) {
      return { x: (x - width / 2) / (base * camera.zoom) + camera.x, y: (y - height / 2) / (base * camera.zoom) + camera.y };
    }
    function zoomAt(factor: number, x = width / 2, y = height / 2) {
      cameraAnimation = null;
      const before = world(x, y);
      camera.zoom = Math.min(2.8, Math.max(1, camera.zoom * factor));
      const after = world(x, y);
      camera.x += before.x - after.x; camera.y += before.y - after.y;
      constrain();
    }
    function point(event: PointerEvent) {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }
    function gesture() {
      const [a, b] = [...pointers.values()];
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, distance: Math.hypot(a.x - b.x, a.y - b.y) };
    }
    function pushGrass(p: { x: number; y: number }, time: number) {
      const pos = world(p.x, p.y);
      brush = { ...p, at: time };
      plants.forEach((plant, i) => {
        const offset = offsets[i];
        const dx = plant.x + offset.x - pos.x, dy = plant.y + offset.y - pos.y;
        const distance = Math.hypot(dx, dy);
        if (distance > 95) return;
        const force = (1 - distance / 95) * 44;
        offset.x = dx / Math.max(distance, 1) * force;
        offset.y = dy / Math.max(distance, 1) * force;
        offset.until = time + 900;
      });
    }
    function inspect(x: number, y: number) {
      if (animatingTarget) return;
      const p = world(x, y);
      const active = fieldRef.current;
      for (let index = 0; index < targets.length; index++) {
        if (active.foundIndexes.includes(index)) continue;
        const target = targets[index];
        const offset = offsets[plants.indexOf(target)];
        const sway = reduced ? 0 : Math.sin(performance.now() / 920 + target.phase + target.x * .002);
        const size = target.size * 2.55;
        const leafOffset = size * 48 * plantStemLength(target.variant) * 1.9 / 180;
        const targetX = target.x + offset.x + sway * 2;
        const targetY = target.y + offset.y - leafOffset + sway * 2.5;
        if (Math.hypot(p.x - targetX, p.y - targetY) < target.size * 1.1) {
          animatingTarget = { index, startedAt: performance.now() };
          return;
        }
      }
      const time = performance.now();
      for (const plant of plants) {
        if (plant.four) continue;
        const offset = offsets[plants.indexOf(plant)];
        const sway = reduced ? 0 : Math.sin(time / 1150 + plant.phase + plant.x * .012) + Math.sin(time / 2900 + plant.y * .008) * .55;
        const size = plant.size * 2.7;
        const leafOffset = size * 48 * plantStemLength(plant.variant) * 1.9 / 180;
        const leafX = plant.x + offset.x + sway * 2;
        const leafY = plant.y + offset.y - leafOffset + sway * 2.5;
        if (Math.hypot(p.x - leafX, p.y - leafY) < plant.size * .72) {
          inspectRef.current('세잎클로버예요', 1);
          return;
        }
      }
      inspectRef.current('풀숲을 더 살펴보세요');
    }
    function onDown(event: PointerEvent) {
      if (event.button !== 0 && event.button !== 1) return;
      event.preventDefault();
      cameraAnimation = null;
      canvas.dataset.focusSource = 'pointer';
      canvas.focus({ preventScroll: true });
      canvas.setPointerCapture(event.pointerId);
      const p = point(event);
      pointers.set(event.pointerId, p);
      if (pointers.size === 1) { down = { ...p, at: performance.now() }; dragged = false; multi = false; }
      if (pointers.size >= 2) { multi = true; previousGesture = gesture(); }
    }
    function onMove(event: PointerEvent) {
      if (!pointers.has(event.pointerId)) return;
      event.preventDefault();
      const old = pointers.get(event.pointerId)!;
      const p = point(event);
      pointers.set(event.pointerId, p);
      if (Math.hypot(p.x - down.x, p.y - down.y) > 8) dragged = true;
      if (pointers.size >= 2) {
        const next = gesture();
        if (previousGesture) {
          zoomAt(next.distance / Math.max(1, previousGesture.distance), previousGesture.x, previousGesture.y);
          camera.x -= (next.x - previousGesture.x) / (base * camera.zoom);
          camera.y -= (next.y - previousGesture.y) / (base * camera.zoom);
          constrain();
        }
        previousGesture = next;
      } else if (event.shiftKey || event.buttons === 4) {
        camera.x -= (p.x - old.x) / (base * camera.zoom);
        camera.y -= (p.y - old.y) / (base * camera.zoom);
        constrain();
      } else if (!multi) {
        pushGrass(p, performance.now());
      }
    }
    function onUp(event: PointerEvent) {
      if (!pointers.has(event.pointerId)) return;
      const p = point(event);
      if (event.type === 'pointerup' && !dragged && !multi && performance.now() - down.at < 700) inspect(p.x, p.y);
      pointers.delete(event.pointerId);
      previousGesture = null;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    }
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      zoomAt(Math.exp(-event.deltaY * .0015), event.clientX - rect.left, event.clientY - rect.top);
    }
    function onKey(event: KeyboardEvent) {
      canvas.dataset.focusSource = 'keyboard';
      const step = 32 / camera.zoom;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Enter', ' '].includes(event.key)) event.preventDefault();
      if (event.key === 'ArrowLeft') camera.x -= step;
      if (event.key === 'ArrowRight') camera.x += step;
      if (event.key === 'ArrowUp') camera.y -= step;
      if (event.key === 'ArrowDown') camera.y += step;
      if (event.key === '+' || event.key === '=') zoomAt(1.2);
      if (event.key === '-') zoomAt(1 / 1.2);
      if (event.key === 'Enter') inspect(width / 2, height / 2);
      if (event.key === ' ') pushGrass({ x: width / 2, y: height / 2 }, performance.now());
      constrain();
    }

    function render(time: number) {
      raf = requestAnimationFrame(render);
      if (document.hidden || time - last < 30) return;
      const delta = Math.min(60, time - last); last = time;
      if (cameraAnimation) {
        const progress = Math.min(1, (time - cameraAnimation.startedAt) / 1250);
        const eased = progress < .5 ? 4 * progress ** 3 : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        camera.x = cameraAnimation.fromX + (cameraAnimation.toX - cameraAnimation.fromX) * eased;
        camera.y = cameraAnimation.fromY + (cameraAnimation.toY - cameraAnimation.fromY) * eased;
        camera.zoom = cameraAnimation.fromZoom + (cameraAnimation.toZoom - cameraAnimation.fromZoom) * eased;
        constrain();
        if (progress >= 1) cameraAnimation = null;
      }
      if (demoMode === 'drag') {
        if (!demoStartedAt) demoStartedAt = time;
        const cycle = (time - demoStartedAt) % 2400;
        const progress = cycle < 1200 ? cycle / 1200 : 1 - (cycle - 1200) / 1200;
        pushGrass({ x: width * (.28 + .42 * progress), y: height * (.68 - .28 * Math.sin(progress * Math.PI)) }, time);
      }
      const dpr = canvas.width / width;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#59452d'; ctx.fillRect(0, 0, width, height);
      const soil = ctx.createLinearGradient(0, 0, width * .85, height);
      soil.addColorStop(0, '#a27c4d'); soil.addColorStop(.48, '#927047'); soil.addColorStop(1, '#7d6242');
      ctx.fillStyle = soil; ctx.fillRect(0, 0, width, height);
      if (soilPattern) { ctx.globalAlpha = .72; ctx.fillStyle = soilPattern; ctx.fillRect(0, 0, width, height); ctx.globalAlpha = 1; }
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(base * camera.zoom, base * camera.zoom);
      ctx.translate(-camera.x, -camera.y);
      // A gravel-and-stone rim is drawn in world coordinates and moves with the map.
      const edgeEnd = WORLD - FIELD_EDGE;
      const rimColors = ['#a99a7d', '#c0ad8b', '#887f6c', '#b69a76', '#9b886e', '#c6b696', '#8a7460'];
      ctx.fillStyle = '#6e553b';
      ctx.fillRect(FIELD_EDGE, FIELD_EDGE + FIELD_RIM, FIELD_RIM, WORLD - FIELD_EDGE * 2 - FIELD_RIM * 2);
      ctx.fillRect(edgeEnd - FIELD_RIM, FIELD_EDGE + FIELD_RIM, FIELD_RIM, WORLD - FIELD_EDGE * 2 - FIELD_RIM * 2);
      const drawRimStone = (x: number, y: number, index: number, horizontal: boolean) => {
        const value = Math.sin((field.seed + 1) * 12.9898 + index * 78.233) * 43758.5453;
        const rand = value - Math.floor(value);
        const rx = horizontal ? 10 + rand * 7 : 7 + rand * 5;
        const ry = horizontal ? 7 + rand * 5 : 10 + rand * 7;
        const tilt = (rand - .5) * .55;
        ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
        ctx.fillStyle = rimColors[(index + Math.floor(rand * 7)) % rimColors.length];
        ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#5d4935'; ctx.lineWidth = 2; ctx.stroke();
        ctx.strokeStyle = '#e0cfaa99'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(-rx * .18, -ry * .2, rx * .56, ry * .42, -.25, Math.PI * 1.05, Math.PI * 1.8); ctx.stroke();
        ctx.restore();
      };
      for (let row = 0; row < 2; row++) {
        const xLeft = FIELD_EDGE + 13 + row * 25;
        const xRight = edgeEnd - 13 - row * 25;
        for (let y = FIELD_EDGE + FIELD_RIM + 10 + row * 12, index = row * 1000; y < edgeEnd - FIELD_RIM - 10; y += 25, index++) {
          drawRimStone(xLeft, y, index, false); drawRimStone(xRight, y, index + 400, false);
        }
      }
      const view = { left: camera.x - width / base / camera.zoom / 2 - 80,
        right: camera.x + width / base / camera.zoom / 2 + 80,
        top: camera.y - height / base / camera.zoom / 2 - 80,
        bottom: camera.y + height / base / camera.zoom / 2 + 80 };
      // Fine blades underneath the clover canopy, with independent wind phases.
      ctx.lineWidth = 1.1;
      for (let i = 0; i < plants.length; i += 2) {
        const p = plants[i];
        if (p.x < view.left || p.x > view.right || p.y < view.top || p.y > view.bottom) continue;
        const gust = Math.sin(time / 1150 + p.phase + p.x * .012) + Math.sin(time / 2900 + p.y * .008) * .55;
        const sway = reduced ? 0 : gust * 15;
        ctx.strokeStyle = i % 4 ? '#8e9b5870' : '#c0a66d80';
        ctx.beginPath(); ctx.moveTo(p.x, p.y + 20);
        ctx.quadraticCurveTo(p.x - 12 + sway, p.y - 18, p.x - 8 + sway, p.y - 57); ctx.stroke();
      }
      // Sparse warm-toned pebbles sit beneath the clover canopy, like stones in a field.
      for (let i = 13; i < plants.length; i += 13) {
        const p = plants[i];
        if (p.four || p.x < view.left || p.x > view.right || p.y < view.top || p.y > view.bottom) continue;
        const phase = p.phase;
        const x = p.x - 12 + Math.sin(phase) * 5, y = p.y + 13 + Math.cos(phase) * 4;
        const scale = .48 + ((p.variant * 3 + Math.floor(Math.abs(phase) * 2)) % 7) * .2;
        const stoneColors = ['#aa9473', '#c0a987', '#8e826e', '#b49a78', '#9b8770', '#c5b391', '#887d6b', '#a67f62'];
        ctx.save(); ctx.translate(x, y); ctx.rotate(p.angle * .25);
        ctx.fillStyle = 'rgba(45,34,23,.24)';
        ctx.beginPath(); ctx.ellipse(1, 2, 8 * scale, 5.2 * scale, -.12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = stoneColors[(p.variant + Math.floor(Math.abs(phase) * 3)) % stoneColors.length];
        ctx.beginPath(); ctx.moveTo(-8 * scale, 1 * scale);
        ctx.quadraticCurveTo(-9 * scale, -5 * scale, -3 * scale, -6 * scale);
        ctx.quadraticCurveTo(2 * scale, -8 * scale, 7 * scale, -2 * scale);
        ctx.quadraticCurveTo(10 * scale, 2 * scale, 4 * scale, 5 * scale);
        ctx.quadraticCurveTo(-3 * scale, 7 * scale, -8 * scale, 1 * scale); ctx.fill();
        ctx.strokeStyle = 'rgba(238,218,185,.5)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-3 * scale, -3 * scale); ctx.quadraticCurveTo(0, -5 * scale, 3 * scale, -3 * scale); ctx.stroke();
        ctx.fillStyle = stoneColors[(p.variant + 3) % stoneColors.length];
        ctx.beginPath(); ctx.ellipse(12 * scale, 5 * scale, 2.5 * scale, 1.7 * scale, .35, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      plants.forEach((p, i) => {
        if (p.x < view.left || p.x > view.right || p.y < view.top || p.y > view.bottom) return;
        // In the guide's first scene, keep the example target visible above the grass.
        if (demoMode === 'find' && p.four) return;
        const sway = reduced ? 0 : Math.sin(time / 1000 + p.phase + p.x * .008) + Math.sin(time / 2700 + p.y * .006) * .35;
        const offset = offsets[i];
        const renderSize = p.size * (p.four ? 2.55 : 2.7);
        const root = (80 + 48 * plantStemLength(p.variant) * 1.9) / 180 * renderSize;
        if (p.four) {
          const index = targets.indexOf(p);
          if (fieldRef.current.foundIndexes.includes(index) || animatingTarget?.index === index) return;
        }
        if (time > offset.until) { const decay = Math.exp(-delta / 620); offset.x *= decay; offset.y *= decay; }
        ctx.save();
        ctx.translate(p.x + offset.x, p.y + offset.y);
        ctx.rotate(p.angle + sway * .11 + offset.x * .003);
        const sprite = p.four ? fourSprites[targets.indexOf(p)] : sprites[p.variant];
        ctx.drawImage(sprite, -renderSize / 2, -root, renderSize, renderSize * sprite.height / sprite.width);
        ctx.restore();
      });
      if (demoMode === 'find') {
        targets.forEach((target, index) => {
          if (fieldRef.current.foundIndexes.includes(index)) return;
          const size = target.size * 2.55 * 1.12;
          const root = (80 + 48 * plantStemLength(target.variant) * 1.9) / 180 * size;
          const leafOffset = size * 48 * plantStemLength(target.variant) * 1.9 / 180;
          const plantIndex = plants.indexOf(target);
          const offset = offsets[plantIndex];
          const sway = reduced ? 0 : Math.sin(time / 1000 + target.phase + target.x * .008) + Math.sin(time / 2700 + target.y * .006) * .35;
          const sprite = fourSprites[index];
          // Draw the guide target last so foreground clovers cannot hide the example.
          ctx.save();
          ctx.translate(target.x + offset.x, target.y + offset.y);
          ctx.rotate(target.angle + sway * .11 + offset.x * .003);
          ctx.shadowColor = 'rgba(255, 244, 184, .9)'; ctx.shadowBlur = 14 / (base * camera.zoom);
          ctx.drawImage(sprite, -size / 2, -root, size, size * sprite.height / sprite.width);
          ctx.restore();
          const radius = target.size * 1.46 * 1.12;
          ctx.save(); ctx.translate(target.x + offset.x + sway * 2, target.y + offset.y - leafOffset + sway * 2.5);
          ctx.shadowColor = '#fff2a6'; ctx.shadowBlur = 17 / (base * camera.zoom);
          ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2);
          ctx.strokeStyle = '#fff4b8'; ctx.lineWidth = 5 / (base * camera.zoom); ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2);
          ctx.strokeStyle = '#25a873'; ctx.lineWidth = 2.5 / (base * camera.zoom); ctx.stroke();
          ctx.restore();
        });
      }
      if (hintRing) {
        const elapsed = time - hintRing.startedAt;
        const duration = 2400;
        const progress = Math.min(1, elapsed / duration);
        const drawProgress = Math.min(1, progress / .38);
        const opacity = progress < .38 ? 1 : Math.max(0, 1 - (progress - .38) / .62);
        const target = targets[hintRing.index];
        if (target && !fieldRef.current.foundIndexes.includes(hintRing.index)) {
          const size = target.size * 2.55;
          const leafOffset = size * 48 * plantStemLength(target.variant) * 1.9 / 180;
          const offset = offsets[plants.indexOf(target)];
          const sway = reduced ? 0 : Math.sin(time / 1000 + target.phase + target.x * .008) + Math.sin(time / 2700 + target.y * .006) * .35;
          const radius = target.size * 1.46;
          const endAngle = -Math.PI / 2 + Math.PI * 2 * drawProgress;
          ctx.save();
          ctx.translate(target.x + offset.x + sway * 2, target.y + offset.y - leafOffset + sway * 2.5);
          ctx.globalAlpha = opacity;
          ctx.beginPath(); ctx.arc(0, 0, radius, -Math.PI / 2, endAngle);
          ctx.strokeStyle = 'rgba(22, 74, 45, .96)'; ctx.lineWidth = 9 / (base * camera.zoom); ctx.lineCap = 'round'; ctx.stroke();
          ctx.shadowColor = '#fff2a6'; ctx.shadowBlur = 17 / (base * camera.zoom);
          ctx.beginPath(); ctx.arc(0, 0, radius, -Math.PI / 2, endAngle);
          ctx.strokeStyle = '#fff4b8'; ctx.lineWidth = 5 / (base * camera.zoom); ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.beginPath(); ctx.arc(0, 0, radius, -Math.PI / 2, endAngle);
          ctx.strokeStyle = '#25a873'; ctx.lineWidth = 2.5 / (base * camera.zoom); ctx.stroke();
          ctx.restore();
        }
        if (progress >= 1) hintRing = null;
      }
      if (animatingTarget) {
        const { index, startedAt } = animatingTarget;
        const elapsed = time - startedAt;
        const progress = Math.min(1, elapsed / 760);
        const ease = 1 - Math.pow(1 - progress, 3);
        const target = targets[index];
        const offset = offsets[plants.indexOf(target)];
        const sway = reduced ? 0 : Math.sin(time / 1000 + target.phase + target.x * .008) + Math.sin(time / 2700 + target.y * .006) * .35;
        const size = target.size * 2.55;
        ctx.save();
        ctx.translate(target.x + offset.x, target.y + offset.y - ease * 78);
        ctx.rotate(target.angle + Math.sin(progress * Math.PI * 2) * .14);
        ctx.scale(1 + ease * .38, 1 + ease * .38);
        const leafOffset = size * 48 * plantStemLength(target.variant) * 1.9 / 180;
        ctx.shadowColor = '#e4ff9b'; ctx.shadowBlur = 30 * (1 - progress * .45);
        ctx.beginPath(); ctx.arc(0, -leafOffset, size * .72, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(239,255,187,${.27 * (1 - progress * .5)})`; ctx.fill();
        ctx.strokeStyle = `rgba(236,255,160,${.9 * (1 - progress * .45)})`; ctx.lineWidth = 3; ctx.stroke();
        const root = (80 + 48 * plantStemLength(target.variant) * 1.9) / fourSprites[index].width * size;
        ctx.drawImage(fourSprites[index], -size / 2, -root, size, size * fourSprites[index].height / fourSprites[index].width);
        ctx.restore();
        if (progress >= 1) {
          animatingTarget = null;
          foundRef.current(index);
        }
      }
      // Tiny chamomile flowers and dew are scenery, never hidden hit targets.
      for (let i = 7; i < plants.length; i += 51) {
        const p = plants[i];
        ctx.save(); ctx.translate(p.x + 17, p.y + 10);
        ctx.rotate(p.phase + (reduced ? 0 : Math.sin(time / 2400 + i) * .06));
        ctx.fillStyle = '#eeecc7';
        for (let k = 0; k < 6; k++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.ellipse(0, -5, 2.2, 4.5, 0, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#d8ba61'; ctx.beginPath(); ctx.arc(0, 0, 2.4, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      for (let i = 11; i < plants.length; i += 17) {
        const p = plants[i]; ctx.fillStyle = 'rgba(231,245,215,.6)';
        ctx.beginPath(); ctx.ellipse(p.x + 9, p.y - 10, 1.2, 2.1, .4, 0, Math.PI * 2); ctx.fill();
      }
      // Foreground stones neatly contain the denser leaves along the map edge.
      for (let row = 0; row < 2; row++) {
        const xLeft = FIELD_EDGE + 13 + row * 25;
        const xRight = edgeEnd - 13 - row * 25;
        for (let y = FIELD_EDGE + FIELD_RIM + 10 + row * 12, index = row * 1000; y < edgeEnd - FIELD_RIM - 10; y += 25, index++) {
          drawRimStone(xLeft, y, index, false); drawRimStone(xRight, y, index + 400, false);
        }
      }
      ctx.restore();
      const sunlight = ctx.createLinearGradient(0, 0, width, height);
      sunlight.addColorStop(0, 'rgba(243,218,166,.14)'); sunlight.addColorStop(.6, 'rgba(156,139,94,0)'); sunlight.addColorStop(1, 'rgba(37,26,15,.28)');
      ctx.fillStyle = sunlight; ctx.fillRect(0, 0, width, height);
      const vignette = ctx.createRadialGradient(width / 2, height / 2, height * .22, width / 2, height / 2, height * .78);
      vignette.addColorStop(0, 'rgba(30,21,11,0)'); vignette.addColorStop(1, 'rgba(30,21,11,.28)');
      ctx.fillStyle = vignette; ctx.fillRect(0, 0, width, height);
      if (brush && time - brush.at < 600) {
        ctx.strokeStyle = `rgba(240,246,219,${.3 * (1 - (time - brush.at) / 600)})`;
        ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(brush.x, brush.y, 32, 0, Math.PI * 2); ctx.stroke();
      }
      // Reuse the same stone rim painter on the fixed north and south edges of the meadow.
      const rimScale = base * camera.zoom;
      const rimLeft = camera.x - width / rimScale / 2;
      const rimRight = camera.x + width / rimScale / 2;
      const rimTop = camera.y - height / rimScale / 2;
      const rimBottom = camera.y + height / rimScale / 2;
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(rimScale, rimScale);
      ctx.translate(-camera.x, -camera.y);
      ctx.fillStyle = '#6e553b';
      ctx.fillRect(rimLeft, rimTop, rimRight - rimLeft, FIELD_RIM);
      ctx.fillRect(rimLeft, rimBottom - FIELD_RIM, rimRight - rimLeft, FIELD_RIM);
      for (let row = 0; row < 2; row++) {
        const yNorth = rimTop + 13 + row * 25;
        const ySouth = rimBottom - 13 - row * 25;
        for (let x = rimLeft + 12 + row * 12, index = row * 100; x < rimRight - 12; x += 25, index++) {
          drawRimStone(x, yNorth, index, true);
          drawRimStone(x, ySouth, index + 400, true);
        }
      }
      ctx.restore();
    }

    function onBlur() { delete canvas.dataset.focusSource; }

    controls.current = { hint: () => {
      const active = fieldRef.current;
      const remaining = targets.map((_, index) => index).filter(index => !active.foundIndexes.includes(index));
      if (!remaining.length) return;
      const target = targets[remaining[Math.floor(Math.random() * remaining.length)]];
      hintRing = { index: targets.indexOf(target), startedAt: performance.now() };
      const size = target.size * 2.55;
      const leafOffset = size * 48 * plantStemLength(target.variant) * 1.9 / 180;
      cameraAnimation = { fromX: camera.x, fromY: camera.y, fromZoom: camera.zoom,
        toX: target.x, toY: target.y - leafOffset, toZoom: 1.6, startedAt: performance.now() };
    } };
    resize();
    const observer = new ResizeObserver(resize); observer.observe(canvas);
    if (!readOnly && !demoMode) {
      canvas.addEventListener('pointerdown', onDown);
      canvas.addEventListener('pointermove', onMove);
      canvas.addEventListener('pointerup', onUp);
      canvas.addEventListener('pointercancel', onUp);
      canvas.addEventListener('wheel', onWheel, { passive: false });
      canvas.addEventListener('keydown', onKey);
      canvas.addEventListener('blur', onBlur);
    }
    raf = requestAnimationFrame(render);
    return () => {
      observer.disconnect(); cancelAnimationFrame(raf); controls.current = null;
      if (!readOnly && !demoMode) {
        canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove);
        canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp);
        canvas.removeEventListener('wheel', onWheel); canvas.removeEventListener('keydown', onKey);
        canvas.removeEventListener('blur', onBlur);
      }
    };
  }, [field.id, field.seed, field.theme, readOnly, demoMode]);

  useEffect(() => { if (hintSignal > 0) controls.current?.hint(); }, [hintSignal]);

  return <div className={`meadow meadow-theme-${field.theme}${readOnly ? ' meadow--readonly' : ''}${demoMode ? ' meadow--demo' : ''}`}>
    <canvas ref={canvasRef} className="meadow-canvas" tabIndex={readOnly ? -1 : 0} aria-hidden={readOnly || undefined}
      aria-label={readOnly ? undefined : '네잎클로버 하나가 숨은 풀밭. 드래그해 풀을 헤치고 두 손가락으로 확대하거나 이동해 찾아보세요.'} />
  </div>;
}
