'use client';

import { STAGE_ORDER, type LifecycleStage } from '@/types/crm';

/**
 * Compact lifecycle indicator: Enquiry → Lead → Customer, with the current
 * stage filled/highlighted and completed stages marked. Purely presentational.
 */
export default function LifecycleStepper({ stage, size = 'md' }: { stage: LifecycleStage; size?: 'sm' | 'md' }) {
  const currentIdx = STAGE_ORDER.indexOf(stage);
  const dot = size === 'sm' ? 9 : 12;
  const font = size === 'sm' ? 11.5 : 13;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: size === 'sm' ? 6 : 8, flexWrap: 'wrap' }} aria-label={`Lifecycle stage: ${stage}`}>
      {STAGE_ORDER.map((s, i) => {
        const done = i < currentIdx;
        const current = i === currentIdx;
        const color = current ? 'var(--accent)' : done ? '#1faf52' : 'var(--text-muted)';
        return (
          <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: size === 'sm' ? 6 : 8 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{
                width: dot, height: dot, borderRadius: '50%', flexShrink: 0,
                background: current || done ? color : 'transparent',
                border: `2px solid ${color}`,
                boxShadow: current ? `0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent)` : 'none',
              }} />
              <span style={{ fontSize: font, fontWeight: current ? 700 : 600, color: current ? 'var(--text-primary)' : done ? 'var(--text-secondary)' : 'var(--text-muted)' }}>{s}</span>
            </span>
            {i < STAGE_ORDER.length - 1 && (
              <span style={{ color: 'var(--text-muted)', fontSize: font }}>→</span>
            )}
          </span>
        );
      })}
    </div>
  );
}
