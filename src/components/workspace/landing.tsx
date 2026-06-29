'use client';

import React, { useState } from 'react';
import {
  Bot,
  Brain,
  Github,
  Globe,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import AuthDialogs from './auth-dialogs';

export default function Landing() {
  const { locale, setLocale } = useAppStore();
  const isRTL = locale === 'ar';
  const [authMode, setAuthMode] = useState<'login' | 'register' | null>(null);

  const features = [
    {
      icon: Zap,
      title: t('hero.feature.providers', locale),
      desc: t('hero.feature.providers.desc', locale),
      accent: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
    },
    {
      icon: Bot,
      title: t('hero.feature.agents', locale),
      desc: t('hero.feature.agents.desc', locale),
      accent: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      icon: Brain,
      title: t('hero.feature.memory', locale),
      desc: t('hero.feature.memory.desc', locale),
      accent: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      icon: Shield,
      title: t('hero.feature.security', locale),
      desc: t('hero.feature.security.desc', locale),
      accent: 'text-rose-400',
      bg: 'bg-rose-500/10',
    },
  ];

  return (
    <div
      className={cn('min-h-screen flex flex-col relative bg-background overflow-hidden', isRTL && 'rtl')}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Background orbs */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-brand/10 rounded-full blur-[120px] animate-orb" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] animate-orb [animation-delay:3s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-emerald-500/5 rounded-full blur-[120px] animate-orb [animation-delay:6s]" />
      </div>

      {/* Grid pattern */}
      <div
        className="absolute inset-0 -z-10 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4 md:px-12 lg:px-20 relative z-10">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-brand-gradient flex items-center justify-center shadow-lg shadow-brand/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold text-gradient-brand block leading-none">
              {t('brand.name', locale)}
            </span>
            <span className="text-[10px] text-muted-foreground">v1.0</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
            className="text-muted-foreground hover:text-foreground"
          >
            <Globe className="h-4 w-4 mr-1" />
            {locale === 'en' ? 'العربية' : 'English'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setAuthMode('login')}
            className="text-muted-foreground hover:text-foreground"
          >
            {t('hero.cta.login', locale)}
          </Button>
          <Button
            onClick={() => setAuthMode('register')}
            className="bg-brand-gradient hover:opacity-90 text-white shadow-md shadow-brand/20"
          >
            {t('hero.cta.register', locale)}
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-16 relative z-10">
        <div className="text-center max-w-4xl mx-auto animate-fade-in-up">
          <Badge
            variant="outline"
            className="mb-6 border-brand/30 text-brand bg-brand/10 px-4 py-1.5 backdrop-blur-sm"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-brand mr-2 animate-pulse" />
            Phase 3 — AI Workspace is here
          </Badge>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
            <span className="text-gradient-brand">{t('brand.name', locale)}</span>
          </h1>

          <p className="text-xl md:text-2xl text-foreground/90 font-medium mb-4">
            {t('brand.tagline', locale)}
          </p>

          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            {t('brand.description', locale)}
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button
              size="lg"
              onClick={() => setAuthMode('register')}
              className="bg-brand-gradient hover:opacity-90 text-white h-12 px-8 text-base shadow-lg shadow-brand/20"
            >
              <Sparkles className="h-5 w-5 mr-2" />
              {t('hero.cta.register', locale)}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setAuthMode('login')}
              className="h-12 px-8 text-base border-brand/30 text-brand hover:bg-brand/10"
            >
              {t('hero.cta.login', locale)}
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 max-w-xl mx-auto mt-12">
            <Stat value="13+" label="Providers" />
            <Stat value="100+" label="Models" />
            <Stat value="∞" label="Possibilities" />
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-20 w-full max-w-6xl">
          {features.map((f, i) => (
            <Card
              key={i}
              className="bg-card/50 backdrop-blur border-border/50 hover:border-brand/30 transition-all duration-300 animate-fade-in-up"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <CardHeader className="pb-3">
                <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center mb-2', f.bg)}>
                  <f.icon className={cn('h-5 w-5', f.accent)} />
                </div>
                <CardTitle className="text-base">{f.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">{f.desc}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Showcase strip */}
        <div className="mt-20 w-full max-w-6xl">
          <div className="rounded-2xl border border-border bg-card/40 backdrop-blur p-1 shadow-2xl">
            <div className="rounded-xl bg-background/80 overflow-hidden">
              {/* Fake browser chrome */}
              <div className="h-9 border-b border-border flex items-center gap-2 px-3">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
                </div>
                <div className="ml-3 flex-1 h-5 rounded-md bg-muted/40 text-[10px] text-muted-foreground flex items-center px-2 font-mono">
                  moataz.ai/workspace
                </div>
              </div>
              {/* Fake workspace layout */}
              <div className="h-[280px] grid grid-cols-[180px_1fr_220px] gap-0">
                <div className="border-r border-border bg-sidebar/40 p-3 space-y-2">
                  <div className="h-7 rounded-md bg-brand-gradient opacity-90" />
                  <div className="h-5 rounded bg-muted/40" />
                  <div className="h-5 rounded bg-muted/40" />
                  <div className="h-5 rounded bg-muted/40 w-2/3" />
                  <div className="h-5 rounded bg-muted/40 w-3/4" />
                </div>
                <div className="p-3 space-y-3 overflow-hidden">
                  <div className="flex justify-end">
                    <div className="h-12 w-2/3 rounded-2xl rounded-tr-sm bg-brand-gradient opacity-90" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-7 w-7 rounded-md bg-brand-gradient opacity-80 shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3 rounded bg-muted/50 w-1/3" />
                      <div className="h-3 rounded bg-muted/30 w-full" />
                      <div className="h-3 rounded bg-muted/30 w-5/6" />
                      <div className="h-12 rounded bg-[#0d1117] border border-border/40 mt-2" />
                    </div>
                  </div>
                </div>
                <div className="border-l border-border bg-sidebar/30 p-3 space-y-2">
                  <div className="h-3 rounded bg-muted/50 w-1/2" />
                  <div className="h-16 rounded-lg bg-muted/30" />
                  <div className="h-3 rounded bg-muted/50 w-2/3" />
                  <div className="h-16 rounded-lg bg-muted/30" />
                </div>
              </div>
              <div className="h-6 border-t border-border px-3 flex items-center gap-3 text-[9px] text-muted-foreground font-mono">
                <span className="flex items-center gap-1">
                  <span className="h-1 w-1 rounded-full bg-emerald-400" />
                  Connected
                </span>
                <span>·</span>
                <span>gpt-4o</span>
                <span>·</span>
                <span>1,234 tokens</span>
                <span>·</span>
                <span>$0.012</span>
                <span className="ml-auto">Moataz AI v1.0</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-20 text-center text-xs text-muted-foreground">
          <div className="flex items-center justify-center gap-4 mb-2">
            <a className="hover:text-foreground transition flex items-center gap-1" href="#">
              <Github className="h-3 w-3" />
              GitHub
            </a>
            <span>·</span>
            <a className="hover:text-foreground transition" href="#">Documentation</a>
            <span>·</span>
            <a className="hover:text-foreground transition" href="#">Privacy</a>
            <span>·</span>
            <a className="hover:text-foreground transition" href="#">Terms</a>
          </div>
          <div>© 2025 Moataz AI. All rights reserved.</div>
        </footer>
      </main>

      {authMode && (
        <AuthDialogs
          mode={authMode}
          open={!!authMode}
          onClose={() => setAuthMode(null)}
          onSwitchMode={setAuthMode}
        />
      )}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-3xl font-extrabold text-gradient-brand">{value}</div>
      <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}
