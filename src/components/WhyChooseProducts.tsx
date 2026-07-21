import {
  Search, ShieldCheck, Settings, MessagesSquare, Globe, Handshake,
} from 'lucide-react';

/* ============================================================================
   "Why Choose Ajmera Machines?" — the single, reusable value-props section.
   One source of truth: rendered on the homepage and the Product List page.
   Server component, purely presentational. Responsive 3×2 grid (desktop) →
   2 columns (tablet) → 1 column (mobile) via .why-choose-grid in globals.css.
   ========================================================================= */

const CARDS: { Icon: typeof Search; title: string; text: string }[] = [
  {
    Icon: Search,
    title: 'Find the Right Machine for Your Requirement',
    text: 'Explore available machinery or share your specific requirement to discover suitable options.',
  },
  {
    Icon: ShieldCheck,
    title: 'Buy with Confidence',
    text: 'Get clear and honest information about machine condition, specifications and suitability.',
  },
  {
    Icon: Settings,
    title: 'Quality Pre-Owned Machinery',
    text: 'Carefully selected second-hand machines for a wide range of industrial applications.',
  },
  {
    Icon: MessagesSquare,
    title: 'Get Guidance That Works for You',
    text: 'Not sure which machine is right for your needs? Get practical guidance based on your specific requirement.',
  },
  {
    Icon: Globe,
    title: 'Explore More Possibilities',
    text: 'Whether you are looking for a machine from our available range or something specific, we help you explore the right opportunities.',
  },
  {
    Icon: Handshake,
    title: 'Simple, Clear & Transparent Dealings',
    text: 'Straightforward communication and honest information to make your buying decision easier.',
  },
];

export default function WhyChooseProducts({
  heading = 'Why Choose Ajmera Machines?',
  eyebrow = 'The Ajmera Advantage',
}: { heading?: string; eyebrow?: string }) {
  return (
    <section aria-labelledby="why-choose-heading">
      <div style={{ marginBottom: 'clamp(24px, 3vw, 40px)' }}>
        <span className="eyebrow" style={{ marginBottom: 12 }}>{eyebrow}</span>
        <h2 id="why-choose-heading" className="display" style={{ fontSize: 'clamp(26px, 4vw, 44px)' }}>{heading}</h2>
      </div>

      <div className="why-choose-grid">
        {CARDS.map(({ Icon, title, text }) => (
          <article key={title} className="why-card">
            <span className="why-card__icon" aria-hidden>
              <Icon size={26} strokeWidth={1.75} />
            </span>
            <div style={{ minWidth: 0 }}>
              <h3 className="why-card__title">{title}</h3>
              <p className="why-card__text">{text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
