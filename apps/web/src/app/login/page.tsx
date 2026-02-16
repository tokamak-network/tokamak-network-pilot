'use client';

import { Suspense, useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAtom } from 'jotai';
import {
  Mail,
  ArrowRight,
  Loader2,
  ShieldCheck,
  TreePine,
  Network,
  Brain,
  Search,
  Leaf,
} from 'lucide-react';
import { userAtom } from '@/store';
import { requestOtp, verifyOtp } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Step = 'email' | 'otp';

function FloatingParticles() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Animated glowing orbs */}
      <div className="animate-float-slow absolute top-[10%] left-[15%] size-2 rounded-full bg-[oklch(0.65_0.2_145)] opacity-40 blur-[1px]" />
      <div className="animate-float-medium absolute top-[25%] left-[70%] size-3 rounded-full bg-[oklch(0.75_0.18_170)] opacity-30 blur-[1px]" />
      <div className="animate-float-fast absolute top-[60%] left-[25%] size-1.5 rounded-full bg-[oklch(0.65_0.2_145)] opacity-50 blur-[1px]" />
      <div className="animate-float-slow absolute top-[75%] left-[60%] size-2.5 rounded-full bg-[oklch(0.55_0.15_200)] opacity-35 blur-[1px]" />
      <div className="animate-float-medium absolute top-[45%] left-[85%] size-1.5 rounded-full bg-[oklch(0.75_0.18_170)] opacity-45 blur-[1px]" />
      <div className="animate-float-fast absolute top-[85%] left-[40%] size-2 rounded-full bg-[oklch(0.65_0.2_145)] opacity-25 blur-[1px]" />
      <div className="animate-float-slow absolute top-[15%] left-[50%] size-1 rounded-full bg-[oklch(0.55_0.15_200)] opacity-55 blur-[1px]" />
      <div className="animate-float-medium absolute top-[50%] left-[10%] size-3 rounded-full bg-[oklch(0.65_0.2_145)] opacity-20 blur-[2px]" />
    </div>
  );
}

function NetworkGrid() {
  return (
    <svg
      className="absolute inset-0 size-full opacity-[0.07]"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id="grid"
          width="40"
          height="40"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 40 0 L 0 0 0 40"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-[oklch(0.65_0.2_145)]"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  );
}

function ForestIllustration() {
  return (
    <div className="relative mx-auto w-full max-w-[340px] aspect-square">
      <svg viewBox="0 0 340 340" className="size-full" xmlns="http://www.w3.org/2000/svg">
        {/* Ground / horizon line */}
        <ellipse cx="170" cy="280" rx="140" ry="8" fill="oklch(0.65 0.2 145)" opacity="0.08" />

        {/* Back trees (faded, distant) */}
        <g opacity="0.15">
          <polygon points="60,280 75,160 90,280" fill="oklch(0.55 0.15 200)" />
          <polygon points="90,280 108,140 126,280" fill="oklch(0.5 0.12 150)" />
          <polygon points="240,280 255,150 270,280" fill="oklch(0.55 0.15 200)" />
          <polygon points="270,280 282,170 294,280" fill="oklch(0.5 0.12 150)" />
        </g>

        {/* Mid trees */}
        <g opacity="0.25">
          <polygon points="110,280 130,130 150,280" fill="oklch(0.6 0.18 145)" />
          <polygon points="100,280 130,160 160,280" fill="oklch(0.55 0.15 150)" />
          <polygon points="190,280 210,120 230,280" fill="oklch(0.6 0.18 145)" />
          <polygon points="185,280 210,150 235,280" fill="oklch(0.55 0.15 150)" />
        </g>

        {/* Central large tree */}
        <g className="animate-float-slow" style={{ animationDuration: '12s' }}>
          {/* Tree trunk */}
          <rect x="165" y="220" width="10" height="60" rx="2" fill="oklch(0.4 0.08 80)" opacity="0.4" />
          
          {/* Tree layers (bottom to top, wider to narrower) */}
          <polygon points="170,70 210,160 130,160" fill="oklch(0.65 0.2 145)" opacity="0.5" />
          <polygon points="170,100 220,200 120,200" fill="oklch(0.55 0.18 145)" opacity="0.45" />
          <polygon points="170,140 230,240 110,240" fill="oklch(0.5 0.15 145)" opacity="0.4" />
          
          {/* Tree glow */}
          <circle cx="170" cy="160" r="50" fill="oklch(0.65 0.2 145)" opacity="0.04" />
        </g>

        {/* Connecting data lines between trees (network-in-forest) */}
        <g className="animate-pulse-slow">
          <line x1="130" y1="180" x2="75" y2="200" stroke="oklch(0.65 0.2 145)" strokeWidth="0.5" opacity="0.25" strokeDasharray="3 5" />
          <line x1="210" y1="180" x2="255" y2="190" stroke="oklch(0.65 0.2 145)" strokeWidth="0.5" opacity="0.25" strokeDasharray="3 5" />
          <line x1="130" y1="200" x2="210" y2="200" stroke="oklch(0.75 0.18 170)" strokeWidth="0.3" opacity="0.15" strokeDasharray="4 6" />
        </g>

        {/* Floating leaf particles */}
        <g className="animate-float-medium">
          <circle cx="90" cy="120" r="2" fill="oklch(0.75 0.18 170)" opacity="0.5" />
          <circle cx="250" cy="100" r="1.5" fill="oklch(0.65 0.2 145)" opacity="0.4" />
        </g>
        <g className="animate-float-fast">
          <circle cx="200" cy="80" r="1.5" fill="oklch(0.65 0.2 145)" opacity="0.45" />
          <circle cx="140" cy="90" r="1" fill="oklch(0.75 0.18 170)" opacity="0.5" />
        </g>
        <g className="animate-float-slow">
          <circle cx="120" cy="70" r="2" fill="oklch(0.55 0.15 200)" opacity="0.3" />
          <circle cx="220" cy="60" r="1.5" fill="oklch(0.65 0.2 145)" opacity="0.35" />
        </g>

        {/* Small glowing nodes on trees */}
        <circle cx="170" cy="100" r="3" fill="oklch(0.65 0.2 145)" opacity="0.6" className="animate-pulse" />
        <circle cx="170" cy="100" r="6" fill="none" stroke="oklch(0.65 0.2 145)" strokeWidth="0.5" opacity="0.3" />
        <circle cx="130" cy="170" r="2" fill="oklch(0.75 0.18 170)" opacity="0.5" className="animate-pulse" />
        <circle cx="210" cy="165" r="2" fill="oklch(0.75 0.18 170)" opacity="0.5" className="animate-pulse" />
      </svg>
    </div>
  );
}

function CreativePanel() {
  const features = [
    { icon: Leaf, label: 'Deep Knowledge Roots' },
    { icon: Search, label: 'Semantic Search' },
    { icon: Network, label: 'Connected Canopy' },
  ];

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[oklch(0.12_0.04_150)] p-8 lg:p-12">
      {/* Background layers */}
      <NetworkGrid />
      <FloatingParticles />

      {/* Radial gradient overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 60%, oklch(0.65 0.2 145 / 0.08) 0%, transparent 60%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-10 text-center">
        {/* Forest illustration */}
        <ForestIllustration />

        {/* Brand text */}
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-[oklch(0.65_0.2_145)] shadow-[0_0_20px_oklch(0.65_0.2_145_/_0.3)]">
              <TreePine className="size-5 text-[oklch(0.1_0.05_150)]" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[oklch(0.9_0.05_150)]">
              Tokamak Forest
            </h1>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-[oklch(0.6_0.08_150)]">
            Navigate the knowledge forest of the Tokamak Network ecosystem.
            Explore deep, discover more.
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {features.map((f) => (
            <div
              key={f.label}
              className="flex items-center gap-2 rounded-full border border-[oklch(0.25_0.06_150)] bg-[oklch(0.15_0.04_150)] px-4 py-2"
            >
              <f.icon className="size-3.5 text-[oklch(0.65_0.2_145)]" />
              <span className="text-xs font-medium text-[oklch(0.7_0.06_150)]">
                {f.label}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom decorative line */}
        <div className="flex items-center gap-2 opacity-30">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-[oklch(0.65_0.2_145)]" />
          <div className="size-1 rounded-full bg-[oklch(0.65_0.2_145)]" />
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-[oklch(0.65_0.2_145)]" />
        </div>
      </div>

      {/* Corner decorations */}
      <div className="absolute top-6 left-6 size-16 border-t border-l border-[oklch(0.25_0.06_150)] opacity-40" />
      <div className="absolute right-6 bottom-6 size-16 border-r border-b border-[oklch(0.25_0.06_150)] opacity-40" />
    </div>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useAtom(userAtom);

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const requestedNextPath = searchParams.get('next');
  const nextPath =
    requestedNextPath && requestedNextPath.startsWith('/')
      ? requestedNextPath
      : '/';

  const handleRequestOtp = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setMessage('');

      if (!email.trim()) {
        setError('Please enter your email');
        return;
      }

      setLoading(true);
      try {
        const res = await requestOtp(email.trim());
        setMessage(res.message);
        setStep('otp');
      } catch (err: any) {
        setError(err.message || 'Failed to send OTP');
      } finally {
        setLoading(false);
      }
    },
    [email],
  );

  const handleVerifyOtp = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      if (otp.length !== 6) {
        setError('Please enter the 6-digit code');
        return;
      }

      setLoading(true);
      try {
        const res = await verifyOtp(email.trim(), otp);
        localStorage.setItem('tokamak_token', res.token);
        setUser(res.user);
        router.push(nextPath);
      } catch (err: any) {
        setError(err.message || 'Invalid or expired code');
      } finally {
        setLoading(false);
      }
    },
    [email, otp, setUser, router, nextPath],
  );

  useEffect(() => {
    if (user) {
      router.replace(nextPath);
    }
  }, [nextPath, router, user]);

  if (user) return null;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left: Creative Panel */}
      <div className="hidden lg:block">
        <CreativePanel />
      </div>

      {/* Right: Sign-in Form */}
      <div className="flex flex-col items-center justify-center bg-background p-6 sm:p-10">
        <div className="w-full max-w-[420px]">
          {/* Mobile-only brand header */}
          <div className="mb-10 flex items-center gap-2.5 lg:hidden">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary">
              <TreePine className="size-4.5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Tokamak Forest
            </span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="mb-2 text-2xl font-bold tracking-tight">
              {step === 'email' ? 'Enter the Forest' : 'Check your email'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {step === 'email'
                ? 'Sign in with your @tokamak.network email to continue.'
                : (
                  <>
                    We sent a 6-digit code to{' '}
                    <span className="font-medium text-foreground">{email}</span>
                  </>
                )}
            </p>
          </div>

          {/* Form */}
          {step === 'email' ? (
            <form onSubmit={handleRequestOtp} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="email-input">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email-input"
                    type="email"
                    placeholder="you@tokamak.network"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 pl-10"
                    autoFocus
                    disabled={loading}
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button type="submit" className="h-11 w-full text-sm" disabled={loading}>
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    Send Login Code
                    <ArrowRight className="ml-2 size-4" />
                  </>
                )}
              </Button>

              <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/30 p-3.5">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary/70" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Only <strong className="text-foreground/70">@tokamak.network</strong>{' '}
                  email addresses are allowed. No password needed — we use
                  secure one-time codes.
                </p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="otp-input">
                  Verification code
                </label>
                <Input
                  id="otp-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  className="h-12 text-center text-2xl tracking-[0.5em] font-mono"
                  autoFocus
                  disabled={loading}
                />
              </div>

              {message && !error && (
                <p className="text-sm text-muted-foreground">{message}</p>
              )}
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button type="submit" className="h-11 w-full text-sm" disabled={loading}>
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    Verify & Sign In
                    <ShieldCheck className="ml-2 size-4" />
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full text-sm text-muted-foreground"
                onClick={() => {
                  setStep('email');
                  setOtp('');
                  setError('');
                  setMessage('');
                }}
                disabled={loading}
              >
                Use a different email
              </Button>
            </form>
          )}

          {/* Footer */}
          <p className="mt-10 text-center text-xs text-muted-foreground/60">
            Tokamak Network &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
