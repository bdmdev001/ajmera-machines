'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, KeyRound, User, Loader2, ArrowLeft } from 'lucide-react';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok) {
        router.push('/admin');
        router.refresh();
      } else {
        setStatus('error');
        setErrorMsg(data.error || 'Invalid credentials');
      }
    } catch {
      setStatus('error');
      setErrorMsg('Failed to connect to the authentication server.');
    }
  };

  const iconStyle: React.CSSProperties = { position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' };

  return (
    <div style={{ minHeight: '78vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 20px' }}>
      <div style={{ width: '100%', maxWidth: 430 }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 18 }}>
          <ArrowLeft size={15} /> Back to site
        </Link>

        <div className="surface" style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
          {/* Dark header */}
          <div style={{ background: 'linear-gradient(135deg, #0a192f 0%, #102a43 35%, #1e3a5f 70%, #2d6ea3 100%)', padding: '32px 30px', textAlign: 'center' }}>
            <div style={{ width: 54, height: 54, borderRadius: 14, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
              <ShieldCheck size={26} />
            </div>
            <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>Admin Dashboard</h2>
            <p style={{ fontSize: 13, color: 'rgba(238,241,244,0.6)', marginTop: 4 }}>Authorized personnel only</p>
          </div>

          <div style={{ padding: '30px' }}>
            {status === 'error' && (
              <div style={{ background: 'var(--hot-soft)', border: '1px solid rgba(236,68,51,0.3)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', fontSize: 13, color: 'var(--hot)', marginBottom: 22 }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font-display)' }}>Username</label>
                <div style={{ position: 'relative' }}>
                  <input suppressHydrationWarning type="text" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username" style={{ paddingLeft: 42 }} />
                  <User size={16} style={iconStyle} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font-display)' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input suppressHydrationWarning type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" style={{ paddingLeft: 42 }} />
                  <KeyRound size={16} style={iconStyle} />
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-lg" disabled={status === 'loading'} style={{ justifyContent: 'center', marginTop: 4 }}>
                {status === 'loading' ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Authenticating…</> : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div >
  );
}
