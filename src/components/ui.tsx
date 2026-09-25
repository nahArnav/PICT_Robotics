import { Link } from 'react-router';
import type { ReactNode } from 'react';

/* ----------------------------- Button ----------------------------- */
type ButtonVariant = 'cta' | 'primary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

const btnBase =
  'inline-flex items-center justify-center gap-2 font-medium rounded-[10px] transition-all duration-200 focus-ring disabled:opacity-45 disabled:pointer-events-none select-none';

const btnVariants: Record<ButtonVariant, string> = {
  cta: 'bg-celadon text-white hover:brightness-110 hover:-translate-y-px shadow-[0_1px_0_rgba(0,0,0,0.04)]',
  primary: 'bg-indigo text-white hover:bg-tekhelet',
  outline: 'border border-line-strong text-ink hover:border-tekhelet hover:text-tekhelet bg-white/60',
  ghost: 'text-ink-soft hover:text-tekhelet hover:bg-paper-2',
};

const btnSizes: Record<ButtonSize, string> = {
  sm: 'text-sm px-3 py-1.5',
  md: 'text-sm px-4 py-2.5',
  lg: 'text-base px-6 py-3.5',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  to,
  href,
  className = '',
  ...rest
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  to?: string;
  href?: string;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = `${btnBase} ${btnVariants[variant]} ${btnSizes[size]} ${className}`;
  if (to) return <Link to={to} className={cls}>{children}</Link>;
  if (href) return <a href={href} className={cls}>{children}</a>;
  return <button className={cls} {...rest}>{children}</button>;
}

/* ----------------------------- Label / Kicker ----------------------------- */
export function Kicker({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`label text-[11px] text-glaucous ${className}`}>{children}</span>
  );
}

/* ----------------------------- Badge / Status Chip ----------------------------- */
type Tone = 'open' | 'progress' | 'done' | 'locked' | 'warn' | 'info' | 'neutral';

const tones: Record<Tone, string> = {
  open: 'bg-celadon/25 text-[#1e6b43] border-celadon/50',
  progress: 'bg-teal/25 text-[#215d5c] border-teal/50',
  done: 'bg-celadon/20 text-[#1e6b43] border-celadon/40',
  locked: 'bg-paper-2 text-ink-soft border-line',
  warn: 'bg-[#fbe9c9] text-[#8a5a12] border-[#f0d199]',
  info: 'bg-glaucous/15 text-tekhelet border-glaucous/30',
  neutral: 'bg-paper-2 text-ink-soft border-line',
};

export function StatusChip({ tone = 'neutral', dot = true, children }: { tone?: Tone; dot?: boolean; children: ReactNode }) {
  const dotColor: Record<Tone, string> = {
    open: 'bg-[#2f9e63]', progress: 'bg-[#2f9393]', done: 'bg-[#2f9e63]',
    locked: 'bg-glaucous', warn: 'bg-[#c88a1e]', info: 'bg-tekhelet', neutral: 'bg-glaucous',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold label ${tones[tone]}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotColor[tone]}`} />}
      {children}
    </span>
  );
}

/* ----------------------------- Card ----------------------------- */
export function Card({ children, className = '', hover = false }: { children: ReactNode; className?: string; hover?: boolean }) {
  return (
    <div
      className={`rounded-[14px] border border-line bg-white ${hover ? 'transition-all duration-200 hover:border-line-strong hover:shadow-[0_8px_30px_-12px_rgba(54,5,104,0.18)]' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

/* ----------------------------- Section wrapper ----------------------------- */
export function Section({ children, className = '', id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`mx-auto w-full max-w-[1240px] px-6 md:px-10 ${className}`}>
      {children}
    </section>
  );
}

/* ----------------------------- Corner frame (schematic) ----------------------------- */
export function Corners({ className = '' }: { className?: string }) {
  const c = 'absolute h-3 w-3 border-tekhelet/40';
  return (
    <>
      <span className={`${c} left-0 top-0 border-l border-t ${className}`} />
      <span className={`${c} right-0 top-0 border-r border-t ${className}`} />
      <span className={`${c} bottom-0 left-0 border-b border-l ${className}`} />
      <span className={`${c} bottom-0 right-0 border-b border-r ${className}`} />
    </>
  );
}

/* ----------------------------- Field ----------------------------- */
export function Field({ label, hint, children, required }: { label: string; hint?: string; children: ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink">
        {label} {required && <span className="text-tekhelet">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>}
    </label>
  );
}

/* ----------------------------- Brand icons (not in lucide) ----------------------------- */
export function GithubIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.2 11.39.6.11.82-.26.82-.58v-2.02c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.96 0-1.31.47-2.39 1.24-3.23-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.92 1.23 3.23 0 4.63-2.8 5.65-5.48 5.95.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 24 12.5C24 5.87 18.63.5 12 .5Z" />
    </svg>
  );
}
export function LinkedinIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14ZM7.12 20.45H3.55V9h3.57v11.45ZM22.22 0H1.77C.8 0 0 .78 0 1.75v20.5C0 23.22.8 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.75V1.75C24 .78 23.2 0 22.22 0Z" />
    </svg>
  );
}

export const inputCls =
  'w-full rounded-[10px] border border-line-strong bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-tekhelet focus:outline-none focus:ring-2 focus:ring-tekhelet/15 transition';
