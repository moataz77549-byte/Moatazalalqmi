'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { apiGet } from '@/lib/api-client';
import Landing from '@/components/workspace/landing';
import WorkspaceShell from '@/components/workspace/workspace-shell';

export default function HomePage() {
  const { user, token, setUser, logout } = useAppStore();
  const [bootstrapped, setBootstrapped] = useState(false);

  // On mount, if we have a token, try to fetch the user profile
  useEffect(() => {
    if (!token) {
      setBootstrapped(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        // Use /api/v1/auth/refresh with the token — it returns the user if valid
        // We use the organizations endpoint as a lightweight "verify token" check,
        // but actually it returns data only if authed. If 401, we log out.
        const res = await apiGet<any[]>('/api/v1/organizations', { limit: 1 });
        if (cancelled) return;
        if (!res.success) {
          // Token invalid
          logout();
        } else if (!user) {
          // We don't have the user object — fetch via a lightweight endpoint.
          // Since we don't have a /me endpoint, parse from token or leave user null
          // but mark authed. We'll treat presence-of-token + successful-API as authed
          // and synthesize a minimal user object.
          // Prefer the locally-stored user if any.
          try {
            const stored = localStorage.getItem('moataz_user');
            if (stored) {
              const u = JSON.parse(stored);
              setUser(u, token);
            }
          } catch {
            /* ignore */
          }
        }
      } catch {
        if (!cancelled) logout();
      } finally {
        if (!cancelled) setBootstrapped(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist user to localStorage so a refresh doesn't lose identity
  useEffect(() => {
    if (user) {
      localStorage.setItem('moataz_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('moataz_user');
    }
  }, [user]);

  if (!bootstrapped) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-brand-gradient flex items-center justify-center text-white animate-pulse">
            <span className="text-lg font-bold">M</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-3 w-3 rounded-full border-2 border-brand/30 border-t-brand animate-spin" />
            Loading Moataz AI…
          </div>
        </div>
      </div>
    );
  }

  if (!user || !token) {
    return <Landing />;
  }

  return <WorkspaceShell />;
}
