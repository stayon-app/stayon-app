import { SignIn } from '@clerk/nextjs';
import { AuthShell } from '@/components/AuthShell';

export const metadata = { title: 'Log in · StayOn' };

export default function SignInPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Log in to manage your trips, saved stays and bookings.">
      <SignIn signUpUrl="/sign-up" />
    </AuthShell>
  );
}
