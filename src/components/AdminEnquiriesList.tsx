'use client';

import { useState } from 'react';
import { Search, Trash2, Mail, Phone, Calendar, User, ExternalLink, Building } from 'lucide-react';
import { useAdminAlert } from '@/components/AdminModal';

interface EnquiryData {
  _id: string;
  productId?: string;
  productTitle?: string;
  stockNo?: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  message: string;
  status: 'Pending' | 'Reviewed' | 'Resolved';
  createdAt: string;
}

interface Props {
  initialEnquiries: EnquiryData[];
}

/**
 * Format a timestamp deterministically (fixed locale + IST timezone) so the
 * server (UTC) and the client (browser-local) render the SAME string — avoids
 * the "toLocaleString()" hydration mismatch.
 */
function formatSubmitted(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

export default function AdminEnquiriesList({ initialEnquiries }: Props) {
  const [enquiries, setEnquiries] = useState<EnquiryData[]>(initialEnquiries);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { modal, showError, showSuccess, confirm } = useAdminAlert();

  const handleStatusChange = async (id: string, newStatus: 'Pending' | 'Reviewed' | 'Resolved') => {
    try {
      const response = await fetch(`/api/enquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setEnquiries((prev) =>
          prev.map((e) => (e._id === id ? { ...e, status: newStatus } : e))
        );
      } else {
        showError('Could not update status', 'Please try again.');
      }
    } catch {
      showError('Network error', 'Could not update the enquiry status. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({ title: 'Delete this enquiry?', message: 'This action cannot be undone.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      const response = await fetch(`/api/enquiries/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setEnquiries((prev) => prev.filter((e) => e._id !== id));
        showSuccess('Enquiry deleted', 'The enquiry has been removed.');
      } else {
        showError('Could not delete enquiry', 'Please try again.');
      }
    } catch {
      showError('Network error', 'Could not delete the enquiry. Please try again.');
    }
  };

  // Filter & Search Logic
  const filteredEnquiries = enquiries.filter((e) => {
    const matchesStatus = filterStatus === 'All' || e.status === filterStatus;
    const matchesSearch =
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.productTitle && e.productTitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.stockNo && e.stockNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.company && e.company.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {modal}
      {/* Search and Filters Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
          <input
            suppressHydrationWarning
            type="text"
            placeholder="Search enquiries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
              fontSize: '14px',
              borderRadius: '8px',
            }}
          />
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
        </div>

        {/* Status Filters */}
        <div className="tabs">
          {['All', 'Pending', 'Reviewed', 'Resolved'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`tab ${filterStatus === status ? 'is-active' : ''}`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Enquiries Grid/List */}
      {filteredEnquiries.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {filteredEnquiries.map((enq) => (
            <div
              key={enq._id}
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                padding: '30px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              }}
            >
              {/* Header Info */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '16px',
                  borderBottom: '1px solid var(--border-light)',
                  paddingBottom: '16px',
                }}
              >
                <div>
                  <h4 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <User size={16} style={{ color: 'var(--accent)' }} /> {enq.name}
                  </h4>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Mail size={13} /> {enq.email}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Phone size={13} /> {enq.phone}
                    </span>
                    {enq.company && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Building size={13} /> {enq.company}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Status Dropdown */}
                  <select
                    suppressHydrationWarning
                    value={enq.status}
                    onChange={(e) => handleStatusChange(enq._id, e.target.value as 'Pending' | 'Reviewed' | 'Resolved')}
                    style={{
                      width: 'auto',
                      padding: '8px 12px',
                      fontSize: '13px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-strong)',
                      fontWeight: '700',
                      color:
                        enq.status === 'Pending'
                          ? 'var(--accent)'
                          : enq.status === 'Reviewed'
                          ? 'var(--secondary)'
                          : '#1faf52',
                    }}
                  >
                    <option value="Pending" style={{ color: 'var(--accent)', background: 'var(--bg-surface)' }}>Pending</option>
                    <option value="Reviewed" style={{ color: 'var(--secondary)', background: 'var(--bg-surface)' }}>Reviewed</option>
                    <option value="Resolved" style={{ color: '#25D366', background: 'var(--bg-surface)' }}>Resolved</option>
                  </select>

                  <button
                    onClick={() => handleDelete(enq._id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '8px',
                      borderRadius: '6px',
                      transition: 'var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#ff4d4d';
                      e.currentTarget.style.backgroundColor = 'rgba(255, 77, 77, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-muted)';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    aria-label="Delete enquiry"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Machinery Reference (if any) */}
              {enq.stockNo && (
                <div
                  style={{
                    background: 'var(--accent-soft)',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                    border: '1px solid var(--border-glow)',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-muted)', marginRight: '6px' }}>Enquiry Machine:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{enq.productTitle}</strong>
                    <span style={{ color: 'var(--accent)', marginLeft: '10px', fontWeight: '700' }}>({enq.stockNo})</span>
                  </div>
                  {enq.productId && (
                    <a
                      href={`/products/${enq.productId}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontSize: '12px',
                        color: 'var(--secondary)',
                        fontWeight: '700',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      View Specs <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              )}

              {/* Message Block */}
              <div>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                  Client Message:
                </span>
                <p style={{ fontSize: '15px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                  {enq.message}
                </p>
              </div>

              {/* Date */}
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '10px',
                }}
              >
                <Calendar size={13} /> Submitted on{' '}
                <span suppressHydrationWarning>{formatSubmitted(enq.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 0',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-secondary)',
          }}
        >
          No enquiries found matching your selections.
        </div>
      )}
    </div>
  );
}
