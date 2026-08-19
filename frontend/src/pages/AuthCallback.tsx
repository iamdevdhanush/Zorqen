import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMe } from '../services/api';
import api from '../services/api';
import { useWorkspace } from '../store/WorkspaceContext';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { signInGithub } = useWorkspace();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');

    if (error) {
      navigate('/?auth=error', { replace: true });
      return;
    }

    // Primary handoff: JWT delivered in the URL fragment (#token=...).
    // The fragment is never sent to the server; strip it from the address
    // bar as soon as it has been captured.
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const fragmentToken = hashParams.get('token');

    if (fragmentToken && fragmentToken.length > 0) {
      localStorage.setItem('zorqen_token', fragmentToken);
      // Remove the token from the URL so it does not remain visible
      history.replaceState(null, '', window.location.pathname + window.location.search);

      getMe()
        .then(({ data: userData }) => {
          localStorage.setItem('zorqen_user', JSON.stringify(userData));
          signInGithub(userData);
          navigate('/', { replace: true });
        })
        .catch(() => {
          localStorage.removeItem('zorqen_token');
          navigate('/?auth=failed', { replace: true });
        });
      return;
    }

    // Fallback: retrieve JWT from the secure HttpOnly cookie via the backend
    // endpoint (local development / legacy compatibility).
    api.get('/auth/token')
      .then(({ data }) => {
        const token = data.token;
        localStorage.setItem('zorqen_token', token);

        getMe()
          .then(({ data: userData }) => {
            localStorage.setItem('zorqen_user', JSON.stringify(userData));
            signInGithub(userData);
            navigate('/', { replace: true });
          })
          .catch(() => {
            localStorage.removeItem('zorqen_token');
            navigate('/?auth=failed', { replace: true });
          });
      })
      .catch(() => {
        navigate('/?auth=no_token', { replace: true });
      });
  }, [navigate, signInGithub]);

  return (
    <div className="h-full w-full flex items-center justify-center" style={{ background: 'var(--color-base)' }}>
      <div className="text-center">
        <div className="w-7 h-7 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="mono text-[12px] text-[var(--color-ink-2)]">Authenticating with GitHub…</p>
      </div>
    </div>
  );
}