import React, { useEffect, useRef } from 'react';

interface Dot {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  size: number;
  baseSize: number;
  vx: number;
  vy: number;
}

const DottedBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<Dot[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initDots();
    };

    const DOT_SPACING = 50;
    const DOT_BASE_SIZE = 2;
    const MOUSE_RADIUS = 150;
    const CONNECTION_DISTANCE = 120;

    const initDots = () => {
      dotsRef.current = [];
      const cols = Math.ceil(canvas.width / DOT_SPACING);
      const rows = Math.ceil(canvas.height / DOT_SPACING);

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          dotsRef.current.push({
            x: i * DOT_SPACING + DOT_SPACING / 2,
            y: j * DOT_SPACING + DOT_SPACING / 2,
            baseX: i * DOT_SPACING + DOT_SPACING / 2,
            baseY: j * DOT_SPACING + DOT_SPACING / 2,
            size: DOT_BASE_SIZE,
            baseSize: DOT_BASE_SIZE,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
          });
        }
      }
    };

    const updateDots = () => {
      dotsRef.current.forEach(dot => {
        // Floating animation
        dot.x += dot.vx;
        dot.y += dot.vy;

        // Keep dots near their base position
        const maxOffset = 15;
        if (dot.x > dot.baseX + maxOffset) dot.vx = -Math.abs(dot.vx);
        if (dot.x < dot.baseX - maxOffset) dot.vx = Math.abs(dot.vx);
        if (dot.y > dot.baseY + maxOffset) dot.vy = -Math.abs(dot.vy);
        if (dot.y < dot.baseY - maxOffset) dot.vy = Math.abs(dot.vy);

        // Mouse interaction - shrink dots near mouse
        const dx = mouseRef.current.x - dot.x;
        const dy = mouseRef.current.y - dot.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < MOUSE_RADIUS) {
          const factor = distance / MOUSE_RADIUS;
          dot.size = dot.baseSize * factor * 0.5; // Shrink to 50% at closest

          // Move dots away from mouse slightly
          const pushFactor = (1 - factor) * 20;
          const angle = Math.atan2(dy, dx);
          dot.x = dot.baseX - Math.cos(angle) * pushFactor;
          dot.y = dot.baseY - Math.sin(angle) * pushFactor;
        } else {
          dot.size = dot.baseSize;
        }
      });
    };

    const drawDots = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connections first
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.08)';
      ctx.lineWidth = 1;

      for (let i = 0; i < dotsRef.current.length; i++) {
        const dot1 = dotsRef.current[i];

        // Only connect to nearby dots to improve performance
        for (let j = i + 1; j < dotsRef.current.length; j++) {
          const dot2 = dotsRef.current[j];
          const dx = dot1.x - dot2.x;
          const dy = dot1.y - dot2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < CONNECTION_DISTANCE) {
            ctx.beginPath();
            ctx.moveTo(dot1.x, dot1.y);
            ctx.lineTo(dot2.x, dot2.y);
            ctx.stroke();
          }
        }
      }

      // Draw dots
      dotsRef.current.forEach(dot => {
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(59, 130, 246, ${0.3 + (dot.size / dot.baseSize) * 0.4})`;
        ctx.fill();
      });
    };

    const animate = () => {
      updateDots();
      drawDots();
      animationRef.current = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    resizeCanvas();
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)' }}
    />
  );
};

export default DottedBackground;
