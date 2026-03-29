import { useState, type FormEvent } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface LoginPageProps {
  onLogin: (token: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        setError('아이디 또는 비밀번호가 틀렸습니다.');
        return;
      }

      const data = await res.json();
      localStorage.setItem('auth_token', data.token);
      onLogin(data.token);
    } catch {
      setError('서버에 연결할 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      background: 'var(--color-bg)',
    }}>
      <div style={{
        background: 'var(--color-white)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '40px',
        width: '320px',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <h2 style={{ marginBottom: '24px', fontSize: '1.25rem', color: 'var(--color-text)' }}>
          로그인
        </h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="text"
            placeholder="아이디"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={inputStyle}
          />
          {error && (
            <p style={{ color: '#D32F2F', fontSize: 'var(--font-size-sm)', margin: 0 }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '8px',
              padding: '10px',
              background: 'var(--color-accent)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--font-size-base)',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  fontSize: 'var(--font-size-base)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  outline: 'none',
};
