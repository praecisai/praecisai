'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils/cn';

interface Beam {
  x: number; y: number; width: number; length: number;
  angle: number; speed: number; opacity: number;
  hue: number; pulse: number; pulseSpeed: number;
}

function createBeam(w: number, h: number): Beam {
  return {
    x: Math.random() * w * 1.5 - w * 0.25,
    y: Math.random() * h * 1.5 - h * 0.25,
    width: 30 + Math.random() * 60,
    length: h * 2.5,
    angle: -35 + Math.random() * 10,
    speed: 0.5 + Math.random() * 1.0,
    opacity: 0.10 + Math.random() * 0.14,
    // Warm amber-gold palette: hue 22–50
    hue: 22 + Math.random() * 28,
    pulse: Math.random() * Math.PI * 2,
    pulseSpeed: 0.02 + Math.random() * 0.03,
  };
}

interface BeamsBackgroundProps {
  className?: string;
  intensity?: 'subtle' | 'medium' | 'strong';
}

const opacityMap = { subtle: 0.65, medium: 0.82, strong: 1 };

export default function BeamsBackground({ className, intensity = 'medium' }: BeamsBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const beamsRef     = useRef<Beam[]>([]);
  const rafRef       = useRef<number>(0);
  const isDarkRef    = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d')!;
    if (!ctx) return;

    // Track dark mode
    const updateDark = () => {
      isDarkRef.current = document.documentElement.classList.contains('dark');
    };
    const mo = new MutationObserver(updateDark);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    updateDark();

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = width  * dpr;
      canvas.height = height * dpr;
      canvas.style.width  = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
      beamsRef.current = Array.from({ length: 24 }, () => createBeam(width, height));
    };

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    function resetBeam(beam: Beam, i: number, total: number, w: number, h: number) {
      const col = i % 3;
      const spacing = w / 3;
      beam.y     = h + 100;
      beam.x     = col * spacing + spacing / 2 + (Math.random() - 0.5) * spacing * 0.5;
      beam.width = 80 + Math.random() * 100;
      beam.speed = 0.4 + Math.random() * 0.5;
      beam.hue   = 22 + (i * 28) / total;
      beam.opacity = 0.12 + Math.random() * 0.1;
    }

    function draw(beam: Beam) {
      ctx.save();
      ctx.translate(beam.x, beam.y);
      ctx.rotate((beam.angle * Math.PI) / 180);

      const op = beam.opacity * (0.8 + Math.sin(beam.pulse) * 0.2) * opacityMap[intensity];

      // Light mode: richer amber  Dark mode: slightly brighter gold
      const sat  = isDarkRef.current ? '70%' : '65%';
      const lit  = isDarkRef.current ? '68%' : '42%';
      const hsl  = `hsla(${beam.hue}, ${sat}, ${lit},`;

      const g = ctx.createLinearGradient(0, 0, 0, beam.length);
      g.addColorStop(0,   `${hsl} 0)`);
      g.addColorStop(0.1, `${hsl} ${op * 0.5})`);
      g.addColorStop(0.4, `${hsl} ${op})`);
      g.addColorStop(0.6, `${hsl} ${op})`);
      g.addColorStop(0.9, `${hsl} ${op * 0.5})`);
      g.addColorStop(1,   `${hsl} 0)`);

      ctx.fillStyle = g;
      ctx.fillRect(-beam.width / 2, 0, beam.width, beam.length);
      ctx.restore();
    }

    function animate() {
      const w = container!.getBoundingClientRect().width;
      const h = container!.getBoundingClientRect().height;
      ctx.clearRect(0, 0, w, h);
      ctx.filter = 'blur(32px)';

      const total = beamsRef.current.length;
      beamsRef.current.forEach((b, i) => {
        b.y     -= b.speed;
        b.pulse += b.pulseSpeed;
        if (b.y + b.length < -100) resetBeam(b, i, total, w, h);
        draw(b);
      });

      rafRef.current = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      mo.disconnect();
    };
  }, [intensity]);

  return (
    <div ref={containerRef} className={cn('absolute inset-0 overflow-hidden', className)}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ filter: 'blur(12px)' }}
      />
      {/* Soft vignette to fade edges */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,var(--cream)_100%)] dark:bg-[radial-gradient(ellipse_at_center,transparent_30%,#0A0603_100%)]" />
    </div>
  );
}
