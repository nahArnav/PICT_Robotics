import { useEffect, useRef, useState, Suspense, lazy, type ReactNode, type ComponentType } from 'react';

/* ----------------------------- useInView ----------------------------- */
export function useInView<T extends HTMLElement>(once = true) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) setInView(false);
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once]);
  return { ref, inView };
}

/* ----------------------------- Reveal (scroll animation) ----------------------------- */
export function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${inView ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ----------------------------- CountUp ----------------------------- */
export function CountUp({ value, className = '' }: { value: string; className?: string }) {
  // Parse leading number + suffix, e.g. "11+", "25+", "324"
  const match = value.match(/^(\d+)(.*)$/);
  const target = match ? parseInt(match[1], 10) : 0;
  const suffix = match ? match[2] : value;
  const { ref, inView } = useInView<HTMLSpanElement>();
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const dur = 1400;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target]);

  return <span ref={ref} className={className}>{match ? n : ''}{suffix}</span>;
}

/* ----------------------------- Line-following robot track ----------------------------- */
export function LineFollowerTrack({ className = '' }: { className?: string }) {
  const path =
    'M20,80 C60,20 120,20 160,80 S260,140 300,80 S400,20 440,80';
  return (
    <svg viewBox="0 0 460 160" className={className} fill="none">
      {/* track */}
      <path d={path} stroke="#7785ac" strokeWidth="10" strokeLinecap="round" opacity="0.25" />
      <path d={path} stroke="#5b2a86" strokeWidth="2" strokeDasharray="4 6" strokeLinecap="round" opacity="0.6" />
      {/* sensor sweep dot */}
      <circle r="6" fill="#a5e6ba">
        <animateMotion dur="5s" repeatCount="indefinite" rotate="auto" path={path} />
      </circle>
      {/* robot chassis riding the path */}
      <g>
        <animateMotion dur="5s" repeatCount="indefinite" rotate="auto" path={path} />
        <rect x="-11" y="-8" width="22" height="16" rx="3" fill="#360568" stroke="#9ac6c5" strokeWidth="1.5" />
        <circle cx="-6" cy="-10" r="2.5" fill="#5b2a86" />
        <circle cx="6" cy="-10" r="2.5" fill="#5b2a86" />
        <circle cx="0" cy="0" r="2.5" fill="#a5e6ba" />
      </g>
    </svg>
  );
}

/* ----------------------------- Telemetry gauge ----------------------------- */
export function Gauge({ label, value, unit = '%', color = '#5b2a86' }: { label: string; value: number; unit?: string; color?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / 1200, 1);
      setV((1 - Math.pow(1 - p, 3)) * value);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);

  const R = 34;
  const circ = 2 * Math.PI * R;
  const arc = circ * 0.75; // 270° gauge
  const offset = arc - (v / 100) * arc;

  return (
    <div ref={ref} className="flex flex-col items-center">
      <svg viewBox="0 0 90 90" className="h-24 w-24 -rotate-[135deg]">
        <circle cx="45" cy="45" r={R} fill="none" stroke="#e5e2ee" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${arc} ${circ}`} />
        <circle cx="45" cy="45" r={R} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${arc} ${circ}`} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.1s linear' }} />
      </svg>
      <div className="-mt-16 text-center">
        <div className="font-display text-xl font-extrabold">{Math.round(v)}<span className="text-xs text-ink-soft">{unit}</span></div>
      </div>
      <div className="mt-9 label text-[9px] text-glaucous">{label}</div>
    </div>
  );
}

/* ----------------------------- ROS-style terminal ----------------------------- */
const bootLines = [
  '$ roslaunch pict_robotics bringup.launch',
  '[ INFO] Initializing hardware interface...',
  '[ INFO] IMU calibrated · drift 0.02°/s',
  '[ INFO] LiDAR online · 360° @ 10Hz',
  '[  OK ] Motor controllers armed',
  '[ INFO] Loading nav2 planner · Nav2',
  '[  OK ] Localization converged · cov 0.03',
  '[ INFO] Vision node · detecting markers',
  '[  OK ] System nominal — ready to build.',
];

export function Terminal({ className = '' }: { className?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const [lines, setLines] = useState<string[]>([]);
  useEffect(() => {
    if (!inView) return;
    let i = 0;
    const id = setInterval(() => {
      setLines((l) => (i < bootLines.length ? [...l, bootLines[i++]] : l));
      if (i >= bootLines.length) clearInterval(id);
    }, 450);
    return () => clearInterval(id);
  }, [inView]);

  return (
    <div ref={ref} className={`overflow-hidden rounded-xl border border-white/10 bg-[#1a0b30] font-mono text-[12px] leading-relaxed shadow-xl ${className}`}>
      <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-2 text-[10px] text-white/40">pict-robotics — bringup</span>
      </div>
      <div className="h-52 space-y-0.5 overflow-hidden p-4">
        {lines.map((l, i) => (
          <div key={i} className={l.includes('[  OK ]') ? 'text-celadon' : l.startsWith('$') ? 'text-teal' : 'text-white/60'}>
            {l}
          </div>
        ))}
        {lines.length < bootLines.length && <span className="inline-block h-3.5 w-2 animate-pulse bg-celadon align-middle" />}
      </div>
    </div>
  );
}

/* ----------------------------- Lazy 3D wrapper ----------------------------- */
export function Lazy3D({
  load,
  className = '',
  fallback,
}: {
  load: () => Promise<{ default: ComponentType<{ className?: string }> }>;
  className?: string;
  fallback?: ReactNode;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const Comp = useRef<ReturnType<typeof lazy> | null>(null);
  if (!Comp.current) Comp.current = lazy(load);
  const C = Comp.current;
  return (
    <div ref={ref} className={className}>
      {inView ? (
        <Suspense fallback={fallback ?? <div className="h-full w-full animate-pulse rounded-2xl bg-white/5" />}>
          <C className="h-full w-full" />
        </Suspense>
      ) : (
        fallback ?? <div className="h-full w-full rounded-2xl bg-white/5" />
      )}
    </div>
  );
}
