import { SignUp } from '@clerk/nextjs';
import { AuthShell } from '@/components/AuthShell';

export const metadata = { title: 'Sign up · StayOn' };

export default function SignUpPage() {
  return (
    <AuthShell title="Create your account" subtitle="Join StayOn to book stays with no fees — or list your own place.">
      <SignUp signInUrl="/sign-in" />
    </AuthShell>
  );
}
