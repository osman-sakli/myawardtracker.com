import type { Metadata } from 'next';

import { SignupForm } from '@/components/auth/SignupForm';

export const metadata: Metadata = {
  title: 'Sign up',
  description: 'Create your My Award Tracker account and start tracking today.',
};

export default function SignupPage() {
  return <SignupForm />;
}
