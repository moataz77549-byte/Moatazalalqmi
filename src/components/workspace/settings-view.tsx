'use client';

import React, { useState } from 'react';
import {
  Bell,
  Globe,
  Keyboard,
  Lock,
  Monitor,
  Moon,
  Palette,
  Save,
  Shield,
  Sun,
  User as UserIcon,
  Cpu,
  Server,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import ModelSelector from './model-selector';

const TABS = [
  { id: 'profile', label: 'Profile', icon: UserIcon },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'models', label: 'AI Models', icon: Cpu },
  { id: 'workspace', label: 'Workspace', icon: Server },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy', icon: Lock },
  { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
];

export default function SettingsView() {
  const {
    user,
    locale,
    setLocale,
    theme,
    setTheme,
    selectedModel,
    setSelectedModel,
    modelParams,
    setModelParams,
    availableModels,
  } = useAppStore();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(false);
  const [notifDigest, setNotifDigest] = useState(true);
  const [privacyHistory, setPrivacyHistory] = useState(true);
  const [privacyTelemetry, setPrivacyTelemetry] = useState(false);

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="h-14 shrink-0 border-b border-border flex items-center px-4">
        <h2 className="text-lg font-semibold">Settings</h2>
      </div>

      <Tabs defaultValue="profile" className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <TabsList
          orientation="vertical"
          className="md:w-56 md:h-auto md:grid md:grid-cols-1 grid-cols-3 md:rounded-none md:border-b-0 border-b border-border bg-transparent p-2 gap-1"
        >
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="md:justify-start gap-2 data-[state=active]:bg-accent"
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden md:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <ScrollArea className="flex-1 scrollbar-thin">
          <div className="p-6 max-w-3xl">
            <TabsContent value="profile" className="mt-0 space-y-6">
              <Section title="Profile" desc="Manage your personal information.">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-16 w-16 rounded-full bg-brand-gradient flex items-center justify-center text-white text-2xl font-bold">
                    {(name[0] || email[0] || 'U').toUpperCase()}
                  </div>
                  <div>
                    <Button variant="outline" size="sm">Upload avatar</Button>
                    <p className="text-xs text-muted-foreground mt-1">PNG or JPG, up to 2MB.</p>
                  </div>
                </div>
                <Field label="Display Name">
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                </Field>
                <Field label="Email">
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
                </Field>
                <Field label="Language">
                  <Select value={locale} onValueChange={(v) => setLocale(v as 'en' | 'ar')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">العربية (RTL)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </Section>
              <SaveBar onClick={() => toast.success('Profile saved')} />
            </TabsContent>

            <TabsContent value="appearance" className="mt-0 space-y-6">
              <Section title="Theme" desc="Choose your preferred color scheme.">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'light', label: 'Light', icon: Sun },
                    { id: 'dark', label: 'Dark', icon: Moon },
                    { id: 'system', label: 'System', icon: Monitor },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setTheme(opt.id as any)}
                      className={cn(
                        'rounded-xl border-2 p-4 text-center transition',
                        theme === opt.id
                          ? 'border-brand bg-brand/5'
                          : 'border-border hover:border-brand/40'
                      )}
                    >
                      <opt.icon className="h-6 w-6 mx-auto mb-2 text-brand" />
                      <div className="text-sm font-medium">{opt.label}</div>
                    </button>
                  ))}
                </div>
              </Section>
              <Section title="Language" desc="Interface language and direction.">
                <Field label="Language">
                  <Select value={locale} onValueChange={(v) => setLocale(v as 'en' | 'ar')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English (LTR)</SelectItem>
                      <SelectItem value="ar">العربية (RTL)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </Section>
            </TabsContent>

            <TabsContent value="models" className="mt-0 space-y-6">
              <Section title="Default Model" desc="The model used when starting a new chat.">
                <ModelSelector />
                <p className="text-xs text-muted-foreground mt-2">
                  {availableModels.length} models available across providers.
                </p>
              </Section>
              <Section title="Default Parameters" desc="Defaults applied to all new chats.">
                <div className="space-y-4">
                  <ParamSlider
                    label="Temperature"
                    value={modelParams.temperature}
                    min={0}
                    max={2}
                    step={0.05}
                    onChange={(v) => setModelParams({ temperature: v })}
                  />
                  <ParamSlider
                    label="Top P"
                    value={modelParams.topP}
                    min={0}
                    max={1}
                    step={0.05}
                    onChange={(v) => setModelParams({ topP: v })}
                  />
                  <ParamSlider
                    label="Max Tokens"
                    value={modelParams.maxTokens}
                    min={256}
                    max={32768}
                    step={256}
                    onChange={(v) => setModelParams({ maxTokens: v })}
                    integer
                  />
                </div>
              </Section>
              <SaveBar onClick={() => toast.success('Model preferences saved')} />
            </TabsContent>

            <TabsContent value="workspace" className="mt-0 space-y-6">
              <Section title="Workspace" desc="Workspace-level preferences and integrations.">
                <Field label="Default organization">
                  <Input value="Personal" disabled />
                </Field>
                <Field label="Storage usage">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>2.4 GB / 10 GB</span>
                      <span className="text-muted-foreground">24%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-brand-gradient" style={{ width: '24%' }} />
                    </div>
                  </div>
                </Field>
              </Section>
            </TabsContent>

            <TabsContent value="notifications" className="mt-0 space-y-6">
              <Section title="Notifications" desc="Choose how you want to be notified.">
                <ToggleRow
                  label="Email notifications"
                  desc="Receive product updates and security alerts."
                  checked={notifEmail}
                  onChange={setNotifEmail}
                />
                <ToggleRow
                  label="Push notifications"
                  desc="Real-time notifications in your browser."
                  checked={notifPush}
                  onChange={setNotifPush}
                />
                <ToggleRow
                  label="Weekly digest"
                  desc="A weekly summary of your AI usage and activity."
                  checked={notifDigest}
                  onChange={setNotifDigest}
                />
              </Section>
            </TabsContent>

            <TabsContent value="privacy" className="mt-0 space-y-6">
              <Section title="Privacy" desc="Control how your data is used.">
                <ToggleRow
                  label="Save chat history"
                  desc="Store conversations for future reference and context."
                  checked={privacyHistory}
                  onChange={setPrivacyHistory}
                />
                <ToggleRow
                  label="Anonymous telemetry"
                  desc="Share usage analytics to help improve Moataz AI."
                  checked={privacyTelemetry}
                  onChange={setPrivacyTelemetry}
                />
                <div className="pt-4 border-t border-border">
                  <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                    <Shield className="h-4 w-4 mr-2" />
                    Delete all my data
                  </Button>
                </div>
              </Section>
            </TabsContent>

            <TabsContent value="shortcuts" className="mt-0 space-y-6">
              <Section title="Keyboard Shortcuts" desc="Speed up your workflow.">
                <div className="space-y-2">
                  {[
                    { keys: ['⌘', 'K'], desc: 'Open command palette' },
                    { keys: ['⌘', '/'], desc: 'Focus chat input' },
                    { keys: ['⌘', 'B'], desc: 'Toggle sidebar' },
                    { keys: ['⌘', 'I'], desc: 'Toggle right panel' },
                    { keys: ['⌘', 'N'], desc: 'New chat' },
                    { keys: ['Enter'], desc: 'Send message' },
                    { keys: ['Shift', 'Enter'], desc: 'New line in message' },
                    { keys: ['Esc'], desc: 'Close dialog / cancel' },
                  ].map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-accent/30 transition"
                    >
                      <span className="text-sm">{s.desc}</span>
                      <div className="flex gap-1">
                        {s.keys.map((k, j) => (
                          <kbd
                            key={j}
                            className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono"
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-base font-semibold">{title}</h3>
      {desc && <p className="text-xs text-muted-foreground mt-1 mb-4">{desc}</p>}
      <div className={desc ? '' : 'mt-3'}>{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <Label className="text-xs text-muted-foreground mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between py-2.5">
      <div className="flex-1 mr-4">
        <div className="text-sm font-medium">{label}</div>
        {desc && <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function ParamSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  integer,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  integer?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="font-medium">{label}</span>
        <span className="font-mono text-brand">{integer ? value : value.toFixed(2)}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0])}
      />
    </div>
  );
}

function SaveBar({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex justify-end">
      <Button className="bg-brand-gradient text-white" onClick={onClick}>
        <Save className="h-4 w-4 mr-2" />
        Save changes
      </Button>
    </div>
  );
}
