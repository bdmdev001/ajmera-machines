'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { KeyRound, User, Loader2, ArrowLeft } from 'lucide-react';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setStatus('error');
      setErrorMsg('Please enter both your username and password.');
      return;
    }
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
          <div style={{ background: '#080b12', padding: '34px 30px', textAlign: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://res.cloudinary.com/z5xktswf/image/upload/f_auto,q_auto,w_760/v1784268556/ajmera/homepage/ajmera-logo-footer.png"
              alt="Ajmera Enterprise"
              width={362}
              height={90}
              style={{ height: 80, width: 'auto', maxWidth: '100%', objectFit: 'contain', display: 'block', margin: '0 auto 16px' }}
            />
            <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, letterSpacing: '0.01em' }}>Admin Panel</h2>
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
