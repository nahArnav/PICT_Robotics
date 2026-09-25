import { Link } from 'react-router';
import clubLogo from '../assets/pict-robotics-club-logo.png';

export function Logo({ dark = false, className = '' }: { dark?: boolean; className?: string }) {
  const text = dark ? 'text-white' : 'text-indigo';
  return (
    <Link to="/" aria-label="PICT Robotics Club home" className={`group inline-flex items-center gap-2.5 ${className}`}>
      <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-[9px] bg-black">
        <img src={clubLogo} alt="PICT Robotics Club" className="h-full w-full object-cover" />
      </span>
      <span className="flex flex-col leading-none">
        <span className={`font-display text-[15px] font-extrabold tracking-tight ${text}`}>
          PICT <span className="text-tekhelet">ROBOTICS</span>
        </span>
        <span className="label text-[8px] text-glaucous mt-0.5">Build · Compete · Innovate</span>
      </span>
    </Link>
  );
}

// Abstract schematic hero visual — nodes, traces, coordinate grid.
export function SchematicVisual({ className = '' }: { className?: string }) {
  const labels = [
    { t: 'CONTROL', x: '6%', y: '12%' },
    { t: 'VISION', x: '70%', y: '6%' },
    { t: 'EMBEDDED', x: '4%', y: '78%' },
    { t: 'MECHANICAL', x: '64%', y: '86%' },
    { t: 'AUTONOMY', x: '78%', y: '48%' },
  ];
  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 480 460" className="w-full h-auto" fill="none">
        <defs>
          <linearGradient id="trace" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#a5e6ba" />
            <stop offset="1" stopColor="#9ac6c5" />
          </linearGradient>
        </defs>
        {/* coordinate grid */}
        {Array.from({ length: 12 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 40} y1="0" x2={i * 40} y2="460" stroke="rgba(255,255,255,0.06)" />
        ))}
        {Array.from({ length: 12 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 40} x2="480" y2={i * 40} stroke="rgba(255,255,255,0.06)" />
        ))}
        {/* PCB traces */}
        <path d="M60 90 H180 V170 H300 V250 H400" stroke="url(#trace)" strokeWidth="2" opacity="0.9" />
        <path d="M60 370 H150 V300 H260 V220 H360 V120" stroke="#7785ac" strokeWidth="1.6" opacity="0.7" />
        <path d="M120 420 H240 V330 H340" stroke="#9ac6c5" strokeWidth="1.6" opacity="0.6" />
        {/* nodes */}
        {[
          [60, 90], [180, 170], [300, 250], [400, 250], [150, 300], [260, 220], [360, 120], [240, 330], [340, 330],
        ].map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="8" fill="#360568" stroke="#a5e6ba" strokeWidth="1.5" />
            <circle cx={x} cy={y} r="2.5" fill="#a5e6ba" />
          </g>
        ))}
        {/* central robot core */}
        <rect x="188" y="188" width="104" height="104" rx="12" fill="#5b2a86" stroke="#9ac6c5" strokeWidth="1.5" />
        <circle cx="240" cy="240" r="26" stroke="#a5e6ba" strokeWidth="2" />
        <circle cx="240" cy="240" r="8" fill="#a5e6ba" />
        <line x1="240" y1="214" x2="240" y2="188" stroke="#9ac6c5" strokeWidth="2" />
        <line x1="240" y1="266" x2="240" y2="292" stroke="#9ac6c5" strokeWidth="2" />
      </svg>
      {labels.map((l) => (
        <span key={l.t} className="label absolute text-[9px] text-teal/90 border border-teal/25 rounded px-1.5 py-0.5 bg-indigo/40 backdrop-blur-sm"
          style={{ left: l.x, top: l.y }}>
          {l.t}
        </span>
      ))}
    </div>
  );
}
