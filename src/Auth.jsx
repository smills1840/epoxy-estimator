import { useState } from 'react';
import { supabase } from './supabaseClient';

const S = {
  bg: "#0f1117", card: "#181b24", cardBorder: "#25282f",
  surface: "#1e212c", surfaceBorder: "#2a2d38",
  text: "#e2e4e9", textBright: "#f5f5f7", textMuted: "#a0a3b1",
  textDim: "#6b7084", textFaint: "#4a4d5a",
  amber: "#f59e0b", amberDark: "#d97706",
  red: "#ef4444", green: "#10b981",
};

export default function Auth() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Check your email for a confirmation link, then sign in.');
        setMode('login');
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        setMessage('Password reset link sent to your email.');
        setMode('login');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    background: S.surface,
    border: `1px solid ${S.surfaceBorder}`,
    borderRadius: 8,
    color: S.text,
    fontSize: 14,
    fontFamily: "'DM Sans', sans-serif",
    outline: 'none',
    transition: 'border-color 0.15s',
  };

  return (
    <div style={{
      minHeight: '100vh', background: S.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif", padding: 20,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder { color: ${S.textFaint}; }
        input:focus { border-color: ${S.amber} !important; }
      `}</style>

      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: `linear-gradient(135deg, ${S.amber}, ${S.amberDark})`,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 700, color: S.bg, marginBottom: 16,
          }}>E</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: S.textBright, letterSpacing: '-0.5px' }}>
            Epoxy Floor Estimator
          </h1>
          <p style={{ fontSize: 13, color: S.textDim, marginTop: 6 }}>
            {mode === 'signup' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : 'Sign in to your account'}
          </p>
        </div>

        <div style={{ background: S.card, border: `1px solid ${S.cardBorder}`, borderRadius: 16, padding: 32 }}>
          {error && (
            <div style={{ background: `${S.red}15`, border: `1px solid ${S.red}33`, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#f87171', marginBottom: 20 }}>
              {error}
            </div>
          )}
          {message && (
            <div style={{ background: `${S.green}15`, border: `1px solid ${S.green}33`, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#34d399', marginBottom: 20 }}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: S.textDim, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required style={inputStyle} />
            </div>

            {mode !== 'forgot' && (
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: S.textDim, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'Create a password (min 6 chars)' : 'Your password'}
                  required minLength={6} style={inputStyle} />
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '13px',
              background: loading ? S.surface : `linear-gradient(135deg, ${S.amber}, ${S.amberDark})`,
              color: loading ? S.textDim : S.bg,
              border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700,
              fontFamily: "'DM Sans', sans-serif", cursor: loading ? 'wait' : 'pointer',
            }}>
              {loading ? 'Please wait...' : mode === 'signup' ? 'Create Account' : mode === 'forgot' ? 'Send Reset Link' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13 }}>
            {mode === 'login' && (
              <>
                <button onClick={() => { setMode('forgot'); setError(null); setMessage(null); }}
                  style={{ background: 'none', border: 'none', color: S.textDim, cursor: 'pointer', fontSize: 13, fontFamily: "'DM Sans'" }}>
                  Forgot password?
                </button>
                <div style={{ marginTop: 12, color: S.textFaint }}>
                  Don't have an account?{' '}
                  <button onClick={() => { setMode('signup'); setError(null); setMessage(null); }}
                    style={{ background: 'none', border: 'none', color: S.amber, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans'" }}>
                    Sign up
                  </button>
                </div>
              </>
            )}
            {mode === 'signup' && (
              <div style={{ color: S.textFaint }}>
                Already have an account?{' '}
                <button onClick={() => { setMode('login'); setError(null); setMessage(null); }}
                  style={{ background: 'none', border: 'none', color: S.amber, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans'" }}>
                  Sign in
                </button>
              </div>
            )}
            {mode === 'forgot' && (
              <div style={{ color: S.textFaint }}>
                <button onClick={() => { setMode('login'); setError(null); setMessage(null); }}
                  style={{ background: 'none', border: 'none', color: S.amber, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans'" }}>
                  Back to sign in
                </button>
              </div>
            )}
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: S.textFaint, marginTop: 24 }}>
          Your data is stored securely and private to your account.
        </p>
      </div>
    </div>
  );
}
