'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogOut } from 'lucide-react';

interface SignOutButtonProps {
  className?: string;
  children?: React.ReactNode;
  variant?: 'button' | 'link';
}

export default function SignOutButton({
  className = '',
  children,
  variant = 'button',
}: SignOutButtonProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const label = children ?? 'Sign out';

  if (variant === 'link') {
    return (
      <button
        type="button"
        onClick={handleSignOut}
        className={`text-gray-600 hover:text-gray-900 text-sm font-medium inline-flex items-center gap-2 ${className}`}
      >
        <LogOut className="w-4 h-4" />
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className={`inline-flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors ${className}`}
    >
      <LogOut className="w-4 h-4" />
      {label}
    </button>
  );
}
