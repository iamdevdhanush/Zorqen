import { useEffect, useState, useCallback } from 'react';

export interface GithubProfileData {
  avatar_url: string;
  name: string;
  login: string;
  bio?: string;
  followers: number;
  following: number;
  public_repos: number;
  html_url: string;
}

const PROFILE_CACHE_KEY_PREFIX = 'zorqen_github_profile_v1_';

export function useGithubProfile(login?: string | null) {
  const [profile, setProfile] = useState<GithubProfileData | null>(() => {
    if (!login) return null;
    try {
      const cached = localStorage.getItem(`${PROFILE_CACHE_KEY_PREFIX}${login}`);
      return cached ? (JSON.parse(cached) as GithubProfileData) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState<boolean>(!profile && Boolean(login));
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (username: string) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('zorqen_token');
      const headers: Record<string, string> = {
        Accept: 'application/vnd.github+json',
      };
      
      // If a GitHub OAuth token or JWT is stored, attach bearer token
      if (token && !token.startsWith('ey')) {
        headers.Authorization = `Bearer ${token}`;
      }

      // First try /user endpoint if we have an OAuth token, else fallback to /users/{username}
      let res = await fetch('https://api.github.com/user', { headers });
      
      if (!res.ok) {
        // Fallback to public GitHub profile endpoint for login
        res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
          headers: { Accept: 'application/vnd.github+json' },
        });
      }

      if (!res.ok) {
        throw new Error(`GitHub API returned ${res.status}`);
      }

      const data = await res.json();
      
      const parsed: GithubProfileData = {
        avatar_url: data.avatar_url || `https://github.com/${username}.png`,
        name: data.name || username,
        login: data.login || username,
        bio: data.bio || '',
        followers: typeof data.followers === 'number' ? data.followers : 0,
        following: typeof data.following === 'number' ? data.following : 0,
        public_repos: typeof data.public_repos === 'number' ? data.public_repos : 0,
        html_url: data.html_url || `https://github.com/${username}`,
      };

      setProfile(parsed);
      localStorage.setItem(`${PROFILE_CACHE_KEY_PREFIX}${username}`, JSON.stringify(parsed));
    } catch (err) {
      console.warn('[ZORQEN][GITHUB_PROFILE] Failed to fetch live profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!login) {
      setProfile(null);
      setLoading(false);
      return;
    }

    // Load cached profile immediately if available
    try {
      const cached = localStorage.getItem(`${PROFILE_CACHE_KEY_PREFIX}${login}`);
      if (cached) {
        setProfile(JSON.parse(cached));
        setLoading(false);
      }
    } catch {
      /* ignore */
    }

    // Always fetch fresh profile data in background or on initial load
    void fetchProfile(login);
  }, [login, fetchProfile]);

  return { profile, loading, error, refetch: () => login && fetchProfile(login) };
}
