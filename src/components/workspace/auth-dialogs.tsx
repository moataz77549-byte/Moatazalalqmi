'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Globe, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { toast } from 'sonner';

interface AuthDialogsProps {
  mode: 'login' | 'register';
  open: boolean;
  onClose: () => void;
  onSwitchMode: (mode: 'login' | 'register') => void;
}

export default function AuthDialogs({ mode, open, onClose, onSwitchMode }: AuthDialogsProps) {
  const { locale, setUser, setLocale } = useAppStore();
  const isRTL = locale === 'ar';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedLocale, setSelectedLocale] = useState(locale);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'register' && password !== confirmPassword) {
      setError(locale === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/v1/auth/login' : '/api/v1/auth/register';
      const payload =
        mode === 'login'
          ? { email, password }
          : { name, email, password, confirmPassword, locale: selectedLocale };

      const res = await fetch(`${endpoint}?XTransformPort=3000`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || t('common.error', locale));
        return;
      }

      setUser(
        {
          id: data.data.user.id,
          email: data.data.user.email,
          name: data.data.user.name,
          avatarUrl: data.data.user.avatarUrl,
          isSuperAdmin: data.data.user.isSuperAdmin,
          preferredLocale: data.data.user.preferredLocale || selectedLocale,
        },
        data.data.token
      );
      if (mode === 'register') setLocale(selectedLocale);
      onClose();
      // Reset
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      toast.success(mode === 'login' ? 'Welcome back!' : 'Account created!');
    } catch {
      setError(t('common.error', locale));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-brand-gradient flex items-center justify-center text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <DialogTitle className="text-xl bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
              {mode === 'login' ? t('auth.login', locale) : t('auth.register', locale)}
            </DialogTitle>
          </div>
          <DialogDescription>{t('brand.tagline', locale)}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              <span className="shrink-0">⚠</span>
              {error}
            </div>
          )}

          {mode === 'register' && (
            <div className="space-y-2">
              <Label htmlFor="auth-name">{t('auth.name', locale)}</Label>
              <Input
                id="auth-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={locale === 'ar' ? 'اسمك الكامل' : 'Your full name'}
                required
                autoComplete="name"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="auth-email">{t('auth.email', locale)}</Label>
            <Input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="auth-password">{t('auth.password', locale)}</Label>
            <div className="relative">
              <Input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              </Button>
            </div>
          </div>

          {mode === 'register' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="auth-confirm">{t('auth.confirmPassword', locale)}</Label>
                <Input
                  id="auth-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  {t('auth.locale', locale)}
                </Label>
                <div className="flex gap-2">
                  {(['en', 'ar'] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setSelectedLocale(l)}
                      className={cn(
                        'flex-1 py-2 px-3 rounded-md text-sm font-medium border transition',
                        selectedLocale === l
                          ? 'border-brand bg-brand/10 text-brand'
                          : 'border-border hover:bg-accent'
                      )}
                    >
                      {l === 'en' ? 'English' : 'العربية'}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {mode === 'login' && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox id="remember" />
                <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                  {t('auth.rememberMe', locale)}
                </Label>
              </div>
              <Button variant="link" className="px-0 text-brand h-auto" type="button">
                {t('auth.forgotPassword', locale)}
              </Button>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-brand-gradient hover:opacity-90 text-white h-10"
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'login' ? t('auth.signIn', locale) : t('auth.signUp', locale)}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            {mode === 'login' ? t('auth.noAccount', locale) : t('auth.hasAccount', locale)}{' '}
            <button
              type="button"
              onClick={() => onSwitchMode(mode === 'login' ? 'register' : 'login')}
              className="text-brand font-medium hover:underline"
            >
              {mode === 'login' ? t('auth.signUp', locale) : t('auth.signIn', locale)}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
