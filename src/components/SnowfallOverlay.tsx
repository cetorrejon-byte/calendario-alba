import { useEffect, useRef } from 'react';

interface Flake {
  x: number;
  y: number;
  radius: number;
  speedY: number;
  driftPhase: number;
  driftSpeed: number;
  driftAmp: number;
  opacity: number;
  isChampagne: boolean;
}

export function SnowfallOverlay() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionQuery.matches) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();

    const targetCount = width < 640 ? 22 : 36;
    const flakes: Flake[] = Array.from({ length: targetCount }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: 1.4 + Math.random() * 2.2,
      speedY: 14 + Math.random() * 20,
      driftPhase: Math.random() * Math.PI * 2,
      driftSpeed: 0.5 + Math.random() * 0.7,
      driftAmp: 10 + Math.random() * 14,
      opacity: 0.35 + Math.random() * 0.4,
      isChampagne: i % 5 === 0,
    }));

    let rafId = 0;
    let lastTime = performance.now();

    const drawFrame = (now: number) => {
      if (document.hidden) {
        lastTime = now;
        rafId = requestAnimationFrame(drawFrame);
        return;
      }

      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      for (const f of flakes) {
        f.y += f.speedY * dt;
        f.driftPhase += f.driftSpeed * dt;
        const drawX = f.x + Math.sin(f.driftPhase) * f.driftAmp;

        if (f.y - f.radius > height) {
          f.y = -f.radius - Math.random() * 20;
          f.x = Math.random() * width;
        }

        ctx.beginPath();
        ctx.arc(drawX, f.y, f.radius, 0, Math.PI * 2);
        if (f.isChampagne) {
          ctx.fillStyle = `rgba(212, 168, 83, ${f.opacity * 0.6})`;
        } else {
          ctx.fillStyle = `rgba(255, 255, 255, ${f.opacity})`;
        }
        ctx.fill();
      }

      rafId = requestAnimationFrame(drawFrame);
    };

    rafId = requestAnimationFrame(drawFrame);

    const handleVisibility = () => {
      if (!document.hidden) {
        lastTime = performance.now();
      }
    };

    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-20"
    />
  );
}
