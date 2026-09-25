import { useEffect, useRef, useState, type ReactElement } from 'react';

/**
 * Playful robotics gear that occasionally peeks in from the edges of the screen —
 * as if curious about what you're doing — then retreats. Purely decorative,
 * pointer-events-none, and disabled for reduced-motion users.
 */

type Edge = 'left' | 'right' | 'top' | 'bottom';
type Peek = { key: number; Item: (p: { size?: number }) => ReactElement; edge: Edge; pos: number };

const P = { indigo: '#360568', tekhelet: '#5b2a86', glaucous: '#7785ac', teal: '#9ac6c5', celadon: '#a5e6ba' };

/* ------------------------- SVG equipment ------------------------- */
const Gear = ({ size = 100 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <g className="animate-spin-slow">
      <path fill={P.tekhelet} d="M50 12l4 10a30 30 0 0 1 7 3l10-4 8 8-4 10a30 30 0 0 1 3 7l10 4v12l-10 4a30 30 0 0 1-3 7l4 10-8 8-10-4a30 30 0 0 1-7 3l-4 10H38l-4-10a30 30 0 0 1-7-3l-10 4-8-8 4-10a30 30 0 0 1-3-7l-10-4V50l10-4a30 30 0 0 1 3-7l-4-10 8-8 10 4a30 30 0 0 1 7-3l4-10z" />
      <circle cx="50" cy="56" r="15" fill={P.indigo} />
      <circle cx="50" cy="56" r="6" fill={P.celadon} />
    </g>
  </svg>
);

const Servo = ({ size = 100 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <rect x="28" y="34" width="44" height="46" rx="4" fill={P.tekhelet} />
    <rect x="20" y="42" width="8" height="14" rx="2" fill={P.glaucous} />
    <rect x="72" y="42" width="8" height="14" rx="2" fill={P.glaucous} />
    <circle cx="50" cy="30" r="12" fill={P.indigo} />
    <circle cx="50" cy="30" r="5" fill={P.celadon} />
    <rect x="34" y="52" width="32" height="4" rx="2" fill={P.teal} opacity="0.7" />
    <rect x="34" y="62" width="24" height="4" rx="2" fill={P.teal} opacity="0.7" />
  </svg>
);

const Chip = ({ size = 100 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    {[...Array(5)].map((_, i) => (
      <g key={i}>
        <rect x="18" y={30 + i * 9} width="8" height="4" fill={P.glaucous} />
        <rect x="74" y={30 + i * 9} width="8" height="4" fill={P.glaucous} />
      </g>
    ))}
    <rect x="26" y="26" width="48" height="48" rx="5" fill={P.indigo} />
    <circle cx="34" cy="34" r="3" fill={P.celadon} />
    <path d="M40 44h20M40 52h20M40 60h14" stroke={P.teal} strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

// Ultrasonic sensor — the classic two-eye "peeker"
const Sensor = ({ size = 100 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <rect x="14" y="30" width="72" height="40" rx="8" fill={P.tekhelet} />
    <circle cx="35" cy="50" r="15" fill={P.indigo} />
    <circle cx="65" cy="50" r="15" fill={P.indigo} />
    <circle cx="35" cy="50" r="9" fill={P.glaucous} />
    <circle cx="65" cy="50" r="9" fill={P.glaucous} />
    <circle cx="38" cy="47" r="3.5" fill={P.celadon} />
    <circle cx="68" cy="47" r="3.5" fill={P.celadon} />
    <rect x="44" y="72" width="4" height="10" fill={P.glaucous} />
    <rect x="52" y="72" width="4" height="10" fill={P.glaucous} />
  </svg>
);

const Bolt = ({ size = 100 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <path fill={P.glaucous} d="M50 20l17 10v20L50 60 33 50V30z" />
    <circle cx="50" cy="40" r="9" fill={P.indigo} />
    <rect x="46" y="58" width="8" height="26" rx="2" fill={P.glaucous} />
    <path d="M46 66h8M46 72h8M46 78h8" stroke={P.indigo} strokeWidth="2" />
  </svg>
);

const Battery = ({ size = 100 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <rect x="24" y="30" width="52" height="44" rx="5" fill={P.indigo} />
    <rect x="42" y="24" width="16" height="8" rx="2" fill={P.tekhelet} />
    <rect x="30" y="58" width="40" height="10" rx="2" fill={P.celadon} />
    <rect x="30" y="44" width="40" height="10" rx="2" fill={P.teal} opacity="0.6" />
    <path d="M52 34l-8 12h7l-6 12 16-16h-8l6-8z" fill={P.celadon} />
  </svg>
);

const RobotHead = ({ size = 100 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <line x1="50" y1="14" x2="50" y2="26" stroke={P.glaucous} strokeWidth="3" />
    <circle cx="50" cy="12" r="4" fill={P.celadon} />
    <rect x="24" y="26" width="52" height="46" rx="12" fill={P.tekhelet} />
    <rect x="32" y="38" width="36" height="20" rx="8" fill={P.indigo} />
    <circle cx="43" cy="48" r="5" fill={P.celadon} />
    <circle cx="57" cy="48" r="5" fill={P.celadon} />
    <rect x="40" y="64" width="20" height="3" rx="1.5" fill={P.teal} />
    <rect x="18" y="40" width="6" height="16" rx="3" fill={P.glaucous} />
    <rect x="76" y="40" width="6" height="16" rx="3" fill={P.glaucous} />
  </svg>
);

const Wrench = ({ size = 100 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <path fill={P.glaucous} d="M66 24a16 16 0 0 0-19 21L22 70a6 6 0 0 0 8 8l25-25a16 16 0 0 0 21-19l-9 9-8-2-2-8z" />
  </svg>
);

const ITEMS = [Gear, Servo, Chip, Sensor, Bolt, Battery, RobotHead, Wrench];

const edgeTransforms: Record<Edge, { hidden: string; peek: string; anchor: React.CSSProperties }> = {
  left: { hidden: 'translateX(-120%)', peek: 'translateX(-34%)', anchor: { left: 0 } },
  right: { hidden: 'translateX(120%)', peek: 'translateX(34%)', anchor: { right: 0 } },
  top: { hidden: 'translateY(-120%)', peek: 'translateY(-38%)', anchor: { top: 0 } },
  bottom: { hidden: 'translateY(120%)', peek: 'translateY(38%)', anchor: { bottom: 0 } },
};

function PeekItem({ peek, onDone }: { peek: Peek; onDone: (key: number) => void }) {
  const [phase, setPhase] = useState<'hidden' | 'peek' | 'exit'>('hidden');
  const cfg = edgeTransforms[peek.edge];

  useEffect(() => {
    const inT = setTimeout(() => setPhase('peek'), 40);
    const holdT = setTimeout(() => setPhase('exit'), 40 + 2600);
    const doneT = setTimeout(() => onDone(peek.key), 40 + 2600 + 900);
    return () => { clearTimeout(inT); clearTimeout(holdT); clearTimeout(doneT); };
  }, [peek.key, onDone]);

  const vertical = peek.edge === 'left' || peek.edge === 'right';
  const anchor: React.CSSProperties = vertical
    ? { ...cfg.anchor, top: `${peek.pos}%` }
    : { ...cfg.anchor, left: `${peek.pos}%` };

  return (
    <div
      className="pointer-events-none fixed z-30 drop-shadow-[0_10px_25px_rgba(54,5,104,0.25)]"
      style={{
        ...anchor,
        transform: phase === 'peek' ? cfg.peek : cfg.hidden,
        transition: 'transform 0.85s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <div className={phase === 'peek' ? 'animate-peek-wobble' : ''} style={{ transformOrigin: vertical ? (peek.edge === 'left' ? 'left center' : 'right center') : 'center' }}>
        <peek.Item size={92} />
      </div>
    </div>
  );
}

export function PeekingEquipment() {
  const [peeks, setPeeks] = useState<Peek[]>([]);
  const keyRef = useRef(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timer: ReturnType<typeof setTimeout>;

    const schedule = () => {
      const delay = 4000 + Math.random() * 6000;
      timer = setTimeout(() => {
        const edges: Edge[] = ['left', 'right', 'left', 'right', 'bottom', 'top'];
        const edge = edges[Math.floor(Math.random() * edges.length)];
        const Item = ITEMS[Math.floor(Math.random() * ITEMS.length)];
        const pos = 12 + Math.random() * 66; // avoid corners
        const key = ++keyRef.current;
        setPeeks((p) => (p.length < 2 ? [...p, { key, Item, edge, pos }] : p));
        schedule();
      }, delay);
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);

  const remove = (key: number) => setPeeks((p) => p.filter((x) => x.key !== key));

  return (
    <div aria-hidden className="pointer-events-none">
      {peeks.map((p) => (
        <PeekItem key={p.key} peek={p} onDone={remove} />
      ))}
    </div>
  );
}
