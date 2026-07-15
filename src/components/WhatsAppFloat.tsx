'use client';

import { MessageCircle } from 'lucide-react';

export default function WhatsAppFloat() {
  return (
    <a
      href="https://api.whatsapp.com/send?phone=919322401398&text=Hi,%20I%20would%20like%20to%20enquire%20about%20your%20machines."
      target="_blank"
      rel="noopener noreferrer"
      style={{
        position: 'fixed',
        bottom: '80px',
        right: '28px',
        width: '56px',
        height: '56px',
        backgroundColor: '#25d366',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        boxShadow: '0 8px 24px rgba(37, 211, 102, 0.45)',
        zIndex: 9998,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.08) translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 12px 30px rgba(37, 211, 102, 0.55)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1) translateY(0)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(37, 211, 102, 0.45)';
      }}
      aria-label="Contact us on WhatsApp"
    >
      <MessageCircle size={28} fill="white" stroke="none" />
    </a>
  );
}
