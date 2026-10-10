'use client';

import { useId, useState } from 'react';
import { Plus, MessageCircle, ArrowRight } from 'lucide-react';
import Reveal from './Reveal';

/* ============================================================================
   Homepage FAQ — premium two-column layout: a sticky intro + CTA card on the
   left, an accordion of real buyer/seller questions on the right. Pure
   CSS-driven expand/collapse (grid-template-rows 0fr -> 1fr) so there is no
   height measurement or layout jank; only one answer is open at a time.
   ========================================================================= */

const FAQS = [
  {
    q: 'What types of used industrial machines do you sell?',
    a: 'We deal in used industrial machinery, including CNC machines, lathes, grinders, VTLs, milling machines, drilling machines and gear-cutting equipment, subject to availability.',
  },
  {
    q: 'Do you sell CNC and conventional machinery?',
    a: 'Yes, we deal in both used CNC and conventional machines for various metalworking and manufacturing applications.',
  },
  {
    q: 'Where can I buy used industrial machinery in India?',
    a: 'You can purchase used industrial machinery from Ajmera Machines in Navi Mumbai, India. Contact us to check availability, specifications and pricing.',
  },
  {
    q: 'Can you source a specific machine or specification?',
    a: 'Yes, share your required machine type, make, model, capacity and specifications. Our team can help explore suitable options.',
  },
  {
    q: 'Do you export used machinery internationally?',
    a: 'Yes, we cater to international machinery enquiries. Contact us to discuss machine availability, export documentation and shipping arrangements.',
  },
  {
    q: 'Can I request machine photos, videos and specifications?',
    a: 'Yes, you can request available machine photos, videos and technical specifications to evaluate the equipment before purchasing.',
  },
  {
    q: 'How can I sell my used industrial machinery?',
    a: 'Contact Ajmera Machines with your machine details, make, model, condition and photos to discuss its valuation and potential resale.',
  },
];

export default function FAQSection({ whatsappHref }: { whatsappHref: string }) {
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();

  return (
    <div className="faq-grid">
      {/* ---- Left: sticky intro + CTA ---- */}
      <Reveal className="faq-intro">
        <span className="eyebrow" style={{ marginBottom: 12 }}>Need to Know More?</span>
        <h2 style={{ fontSize: 'clamp(26px, 3.2vw, 38px)', marginBottom: 14 }}>
          Frequently Asked Questions
        </h2>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 28, maxWidth: 380 }}>
          Everything you need to know about buying, selling, sourcing and exporting used industrial machinery with Ajmera Enterprise.
        </p>

        <div className="faq-cta">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 46, height: 46, borderRadius: 14, background: 'var(--accent-soft)', color: 'var(--accent)', flexShrink: 0 }}>
              <MessageCircle size={21} />
            </span>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Still have a question?</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Our team replies within hours.</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp btn-sm">
              <MessageCircle size={15} /> WhatsApp Us
            </a>
            <a href="/contact" className="btn btn-secondary btn-sm">
              Contact Us <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </Reveal>

      {/* ---- Right: accordion ---- */}
      <div className="faq-list">
        {FAQS.map((item, i) => {
          const isOpen = open === i;
          const panelId = `${baseId}-panel-${i}`;
          const buttonId = `${baseId}-button-${i}`;
          return (
            <Reveal key={item.q} delay={i * 50}>
              <div className={`faq-item ${isOpen ? 'is-open' : ''}`}>
                <button
                  type="button"
                  id={buttonId}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="faq-item__trigger"
                >
                  <span className="faq-item__index">{String(i + 1).padStart(2, '0')}</span>
                  <span className="faq-item__question">{item.q}</span>
                  <span className="faq-item__icon" aria-hidden>
                    <Plus size={18} />
                  </span>
                </button>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className="faq-item__panel"
                >
                  <p className="faq-item__answer">{item.a}</p>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>

      <style>{`
        .faq-grid {
          display: grid;
          grid-template-columns: 360px 1fr;
          gap: clamp(32px, 5vw, 64px);
          align-items: start;
        }
        .faq-intro { position: sticky; top: 110px; }
        .faq-cta {
          background: var(--bg-surface);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm);
          padding: 22px;
        }

        .faq-list { display: flex; flex-direction: column; gap: 12px; }

        .faq-item {
          background: var(--bg-surface);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-xs);
          transition: border-color var(--transition-normal), box-shadow var(--transition-normal), background var(--transition-normal);
          overflow: hidden;
        }
        .faq-item.is-open {
          border-color: var(--accent);
          box-shadow: var(--shadow-md);
          background: var(--bg-surface);
        }

        .faq-item__trigger {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 16px;
          text-align: left;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 20px 22px;
          font-family: var(--font-sans);
        }
        .faq-item__index {
          font-family: var(--font-display);
          font-size: 13px;
          font-weight: 700;
          color: var(--accent);
          opacity: 0.55;
          flex-shrink: 0;
          letter-spacing: 0.02em;
        }
        .faq-item.is-open .faq-item__index { opacity: 1; }
        .faq-item__question {
          flex: 1;
          font-family: var(--font-display);
          font-weight: 600;
          font-size: 15.5px;
          color: var(--text-primary);
          line-height: 1.4;
        }
        .faq-item__icon {
          display: grid;
          place-items: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--accent-soft);
          color: var(--accent);
          flex-shrink: 0;
          transition: transform var(--transition-normal), background var(--transition-normal), color var(--transition-normal);
        }
        .faq-item.is-open .faq-item__icon {
          transform: rotate(135deg);
          background: var(--accent);
          color: #fff;
        }

        .faq-item__panel {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows var(--transition-normal);
        }
        .faq-item.is-open .faq-item__panel { grid-template-rows: 1fr; }
        .faq-item__panel > .faq-item__answer {
          min-height: 0;
          overflow: hidden;
          padding: 0 22px 0 58px;
          font-size: 14.5px;
          line-height: 1.65;
          color: var(--text-secondary);
        }
        .faq-item.is-open .faq-item__panel > .faq-item__answer {
          padding-bottom: 22px;
        }

        @media (max-width: 860px) {
          .faq-grid { grid-template-columns: 1fr; gap: 28px; }
          .faq-intro { position: static; }
          .faq-item__panel > .faq-item__answer { padding-left: 22px; }
        }
      `}</style>
    </div>
  );
}
