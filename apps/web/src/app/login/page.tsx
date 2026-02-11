'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSetAtom } from 'jotai';
import { Mail, ArrowRight, Loader2, ShieldCheck, Zap } from 'lucide-react';
import { userAtom } from '@/store';
import { requestOtp, verifyOtp } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type Step = 'email' | 'otp';

export default function LoginPage() {
  const router = useRouter();
  const setUser = useSetAtom(userAtom);

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // ─── Step 1: Request OTP ───────────────────────────────
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

  // ─── Step 2: Verify OTP ────────────────────────────────
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
        // Store token
        localStorage.setItem('tokamak_token', res.token);
        // Update global state
        setUser(res.user);
        // Redirect to home
        router.push('/');
      } catch (err: any) {
        setError(err.message || 'Invalid or expired code');
      } finally {
        setLoading(false);
      }
    },
    [email, otp, setUser, router],
  );

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Zap className="size-6" />
          </div>
          <CardTitle className="text-xl">Sign in to Tokamak Pilot</CardTitle>
          <CardDescription>
            {step === 'email'
              ? 'Enter your @tokamak.network email to receive a login code.'
              : `We sent a 6-digit code to ${email}`}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {step === 'email' ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="you@tokamak.network"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    autoFocus
                    disabled={loading}
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    Send Login Code
                    <ArrowRight className="ml-2 size-4" />
                  </>
                )}
              </Button>

              <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
                <ShieldCheck className="size-4 shrink-0 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Only <strong>@tokamak.network</strong> email addresses are
                  allowed. No password required — we use secure one-time codes.
                </p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  className="text-center text-2xl tracking-[0.5em] font-mono"
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

              <Button type="submit" className="w-full" disabled={loading}>
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
                className="w-full text-sm"
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
        </CardContent>
      </Card>
    </div>
  );
}
