import type { Metadata } from 'next';

import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Log in',
  description: 'Sign in to your My Award Tracker account.',
};

export default function LoginPage() {
  return <LoginForm />;
}
