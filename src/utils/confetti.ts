const COLORS = ["#3182F6", "#34C759", "#FF9500", "#FFD700", "#F04452", "#5B9CF6"];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  life: number;
}

export function launchConfetti(isFirstPlace = false) {
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d")!;
  const particles: Particle[] = [];
  const count = isFirstPlace ? 120 : 60;

  for (let i = 0; i < count; i++) {
    particles.push({
      x: canvas.width / 2 + (Math.random() - 0.5) * 200,
      y: canvas.height * 0.4,
      vx: (Math.random() - 0.5) * (isFirstPlace ? 16 : 10),
      vy: -Math.random() * (isFirstPlace ? 18 : 12) - 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)] ?? "#3182F6",
      size: Math.random() * (isFirstPlace ? 10 : 7) + 4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      life: 1,
    });
  }

  let frame = 0;
  const maxFrames = isFirstPlace ? 120 : 80;

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.3;
      p.vx *= 0.99;
      p.rotation += p.rotationSpeed;
      p.life -= 1 / maxFrames;

      if (p.life <= 0) continue;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = Math.min(p.life * 2, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }

    frame++;
    if (frame < maxFrames) {
      requestAnimationFrame(animate);
    } else {
      canvas.remove();
    }
  }

  requestAnimationFrame(animate);
}
