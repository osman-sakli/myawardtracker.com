'use client';

import { AlertCircle, ArrowLeft, Check } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { FormField, Input } from '@/components/ui/form';
import { useToast } from '@/components/ui/Toast';
import { confirmSignUp, resendConfirmationCode, signIn, signUp } from '@/lib/auth';
import { isAuthConfigured } from '@/lib/env';
import { authErrorMessage } from './errors';
import { captureInviteFromUrl, consumePendingInvite } from './invite';

const RULES = [
  { label: 'At least 10 characters', test: (p: string) => p.length >= 10 },
  { label: 'A lowercase and uppercase letter', test: (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { label: 'A number', test: (p: string) => /\d/.test(p) },
];

export function SignupForm() {
  const router = useRouter();
  const toast = useToast();

  const [mode, setMode] = useState<'signup' | 'confirm'>('signup');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasInvite, setHasInvite] = useState(false);

  useEffect(() => {
    setHasInvite(Boolean(captureInviteFromUrl()));
  }, []);

  const passwordValid = RULES.every((r) => r.test(password));

  const handleSignUp = (e: FormEvent) => {
    e.preventDefault();
    if (!passwordValid) {
      setError('Please choose a stronger password.');
      return;
    }
    setError('');
    setLoading(true);
    signUp(email, password, fullName.trim())
      .then(() => {
        setMode('confirm');
        toast('Account created — check your email for a code.', 'success');
      })
      .catch((err) => setError(authErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  const handleConfirm = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    confirmSignUp(email, code.trim())
      .then(() => signIn(email, password))
      .then(async () => {
        try {
          const orgId = await consumePendingInvite();
          if (orgId) {
            toast('Invite accepted — welcome aboard.', 'success');
            router.replace(`/dashboard/org/?id=${orgId}`);
            return;
          }
        } catch (err) {
          // Don't block dashboard entry on a bad invite; surface it as a toast.
          toast(err instanceof Error ? err.message : 'Could not accept invite.', 'error');
        }
        router.replace('/dashboard');
      })
      .catch((err) => {
        setError(authErrorMessage(err));
        setLoading(false);
      });
  };

  if (mode === 'confirm') {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-content">
          Confirm your account
        </h1>
        <p className="mt-1.5 text-sm text-content-muted">
          Enter the 6-digit code we sent to {email}.
        </p>

        {error && (
          <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-danger/25 bg-danger/10 p-3 text-sm text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

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
            Confirm &amp; continue
          </Button>
        </form>

        <button
          type="button"
          onClick={() =>
            resendConfirmationCode(email)
              .then(() => toast('A new code is on its way.', 'success'))
              .catch(() => toast('Could not resend the code.', 'error'))
          }
          className="mt-4 w-full text-center text-sm text-brand-soft hover:text-brand"
        >
          Resend confirmation code
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-content">
        Create your account
      </h1>
      <p className="mt-1.5 text-sm text-content-muted">
        Start tracking activities and award progress in minutes.
      </p>

      {hasInvite && (
        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-brand/25 bg-brand/10 p-3 text-sm text-content">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          <span>
            You're accepting an invite — finish signing up and we'll add you to the
            organization automatically.
          </span>
        </div>
      )}

      {!isAuthConfigured && (
        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-warning/25 bg-warning/10 p-3 text-sm text-warning">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          Authentication is not configured yet. Set the Cognito environment
          variables to enable sign-up.
        </div>
      )}

      {error && (
        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-danger/25 bg-danger/10 p-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSignUp} className="mt-6 space-y-4">
        <FormField label="Full name" htmlFor="name" required>
          <Input
            id="name"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jordan Lee"
          />
        </FormField>
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
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••"
          />
        </FormField>

        <ul className="space-y-1.5">
          {RULES.map((rule) => {
            const ok = rule.test(password);
            return (
              <li
                key={rule.label}
                className={`flex items-center gap-2 text-xs ${
                  ok ? 'text-success' : 'text-content-subtle'
                }`}
              >
                <Check className="h-3.5 w-3.5" />
                {rule.label}
              </li>
            );
          })}
        </ul>

        <Button type="submit" loading={loading} className="w-full">
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-content-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-brand-soft hover:text-brand">
          Sign in
        </Link>
      </p>

      <Link
        href="/"
        className="mt-3 flex w-full items-center justify-center gap-1.5 text-sm text-content-subtle hover:text-content"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>
    </div>
  );
}
