'use client';

import { AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { FormField, Input } from '@/components/ui/form';
import { useToast } from '@/components/ui/Toast';
import {
  confirmForgotPassword,
  confirmSignUp,
  forgotPassword,
  resendConfirmationCode,
  signIn,
} from '@/lib/auth';
import { isAuthConfigured } from '@/lib/env';
import { authErrorMessage, isUnconfirmedError } from './errors';
import { captureInviteFromUrl, consumePendingInvite } from './invite';

type Mode = 'signin' | 'confirm' | 'forgot' | 'reset';

function safeNext(): string {
  if (typeof window === 'undefined') return '/dashboard';
  const next = new URLSearchParams(window.location.search).get('next');
  return next && next.startsWith('/') ? next : '/dashboard';
}

/** After auth, redeem any captured invite and route accordingly. */
async function postAuthRoute(
  toast: (msg: string, tone?: 'success' | 'error' | 'info') => void,
): Promise<string> {
  try {
    const orgId = await consumePendingInvite();
    if (orgId) {
      toast('Invite accepted — welcome aboard.', 'success');
      return `/dashboard/org/?id=${orgId}`;
    }
  } catch (err) {
    toast(err instanceof Error ? err.message : 'Could not accept invite.', 'error');
  }
  return safeNext();
}

export function LoginForm() {
  const router = useRouter();
  const toast = useToast();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasInvite, setHasInvite] = useState(false);

  useEffect(() => {
    setHasInvite(Boolean(captureInviteFromUrl()));
  }, []);

  const run = async (fn: () => Promise<void>) => {
    setError('');
    setLoading(true);
    try {
      await fn();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      try {
        await signIn(email, password);
        router.replace(await postAuthRoute(toast));
      } catch (err) {
        if (isUnconfirmedError(err)) {
          await resendConfirmationCode(email).catch(() => undefined);
          setMode('confirm');
          toast('Please confirm your account — we sent you a new code.', 'info');
          return;
        }
        throw err;
      }
    });
  };

  const handleConfirm = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await confirmSignUp(email, code.trim());
      await signIn(email, password);
      router.replace(await postAuthRoute(toast));
    });
  };

  const handleForgot = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await forgotPassword(email);
      setMode('reset');
      toast('We sent a reset code to your email.', 'info');
    });
  };

  const handleReset = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await confirmForgotPassword(email, code.trim(), newPassword);
      setMode('signin');
      setPassword('');
      setCode('');
      setNewPassword('');
      toast('Password updated — please sign in.', 'success');
    });
  };

  const heading: Record<Mode, { title: string; subtitle: string }> = {
    signin: {
      title: 'Welcome back',
      subtitle: 'Sign in to your My Award Tracker account.',
    },
    confirm: {
      title: 'Confirm your account',
      subtitle: `Enter the 6-digit code we sent to ${email}.`,
    },
    forgot: {
      title: 'Reset your password',
      subtitle: 'Enter your email and we will send a reset code.',
    },
    reset: {
      title: 'Choose a new password',
      subtitle: `Enter the code sent to ${email} and a new password.`,
    },
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-content">
        {heading[mode].title}
      </h1>
      <p className="mt-1.5 text-sm text-content-muted">
        {heading[mode].subtitle}
      </p>

      {hasInvite && mode === 'signin' && (
        <div className="mt-5 rounded-xl border border-brand/25 bg-brand/10 p-3 text-sm text-content">
          You're accepting an organization invite. Sign in and we'll add you automatically.
        </div>
      )}

      {!isAuthConfigured && (
        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-warning/25 bg-warning/10 p-3 text-sm text-warning">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          Authentication is not configured yet. Set the Cognito environment
          variables to enable sign-in.
        </div>
      )}

      {error && (
        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-danger/25 bg-danger/10 p-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {mode === 'signin' && (
        <form onSubmit={handleSignIn} className="mt-6 space-y-4">
          <FormField label="Email" htmlFor="email" required>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </FormField>
          <FormField label="Password" htmlFor="password" required>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
            />
          </FormField>
          <button
            type="button"
            onClick={() => {
              setError('');
              setMode('forgot');
            }}
            className="text-sm text-brand-soft hover:text-brand"
          >
            Forgot your password?
          </button>
          <Button type="submit" loading={loading} className="w-full">
            Sign in
          </Button>
        </form>
      )}

      {mode === 'confirm' && (
        <form onSubmit={handleConfirm} className="mt-6 space-y-4">
          <FormField label="Confirmation code" htmlFor="code" required>
            <Input
              id="code"
              inputMode="numeric"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
            />
          </FormField>
          <Button type="submit" loading={loading} className="w-full">
            Confirm &amp; sign in
          </Button>
          <ResendCode email={email} />
        </form>
      )}

      {mode === 'forgot' && (
        <form onSubmit={handleForgot} className="mt-6 space-y-4">
          <FormField label="Email" htmlFor="forgot-email" required>
            <Input
              id="forgot-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </FormField>
          <Button type="submit" loading={loading} className="w-full">
            Send reset code
          </Button>
        </form>
      )}

      {mode === 'reset' && (
        <form onSubmit={handleReset} className="mt-6 space-y-4">
          <FormField label="Reset code" htmlFor="reset-code" required>
            <Input
              id="reset-code"
              inputMode="numeric"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
            />
          </FormField>
          <FormField
            label="New password"
            htmlFor="reset-password"
            hint="At least 10 characters."
            required
          >
            <Input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••••"
            />
          </FormField>
          <Button type="submit" loading={loading} className="w-full">
            Update password
          </Button>
        </form>
      )}

      {mode === 'signin' ? (
        <p className="mt-6 text-center text-sm text-content-muted">
          New to My Award Tracker?{' '}
          <Link href="/signup" className="font-medium text-brand-soft hover:text-brand">
            Create an account
          </Link>
        </p>
      ) : (
        <button
          type="button"
          onClick={() => {
            setError('');
            setMode('signin');
          }}
          className="mt-6 flex w-full items-center justify-center gap-1.5 text-sm text-content-muted hover:text-content"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </button>
      )}
    </div>
  );
}

function ResendCode({ email }: { email: string }) {
  const toast = useToast();
  const [sending, setSending] = useState(false);

  const resend = async () => {
    setSending(true);
    try {
      await resendConfirmationCode(email);
      toast('A new code is on its way.', 'success');
    } catch {
      toast('Could not resend the code. Try again shortly.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={resend}
      disabled={sending}
      className="w-full text-center text-sm text-brand-soft hover:text-brand disabled:opacity-50"
    >
      {sending ? 'Sending…' : 'Resend confirmation code'}
    </button>
  );
}
