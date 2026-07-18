import {
  ShieldCheck, CheckCircle2, BadgeIndianRupee, Truck, Factory, Layers, Headphones,
} from 'lucide-react';

/* ============================================================================
   "Why Choose Our Products?" — a reusable, fully-responsive value-props grid.
   Rendered on both the Product List page and the homepage (single source of
   truth, no duplicated markup). Server component: pure presentational.
   ========================================================================= */

const POINTS: { Icon: typeof ShieldCheck; text: string }[] = [
  { Icon: ShieldCheck, text: 'Professionally inspected machines available for immediate purchase' },
  { Icon: CheckCircle2, text: 'Every machine is quality checked and verified' },
  { Icon: BadgeIndianRupee, text: 'Competitive pricing with excellent value' },
  { Icon: Truck, text: 'Ready for fast delivery and installation' },
  { Icon: Factory, text: 'Machines sourced from trusted manufacturers' },
  { Icon: Layers, text: 'Suitable for a wide range of industrial applications' },
  { Icon: Headphones, text: 'Expert assistance in selecting the right machine' },
];

export default function WhyChooseProducts({
  heading = 'Why Choose Our Products?',
  eyebrow = 'The Ajmera advantage',
}: { heading?: string; eyebrow?: string }) {
  return (
    <section aria-labelledby="why-choose-heading">
      <div style={{ marginBottom: 28 }}>
        <span className="eyebrow" style={{ marginBottom: 10 }}>{eyebrow}</span>
        <h2 id="why-choose-heading" style={{ fontSize: 'clamp(24px, 3.2vw, 34px)' }}>{heading}</h2>
      </div>

      <div
        className="why-choose-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {POINTS.map(({ Icon, text }) => (
          <div
            key={text}
            className="surface"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '18px 20px',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <span
              style={{
                display: 'grid',
                placeItems: 'center',
                width: 44,
                height: 44,
                flexShrink: 0,
                borderRadius: 12,
                background: 'var(--accent-soft)',
                color: 'var(--accent)',
              }}
            >
              <Icon size={22} />
            </span>
            <p style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.45, margin: 0 }}>
              {text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
