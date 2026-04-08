'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { logout, getActorFromToken } from '@/lib/auth';

const LINKS = [
  { href: '/',       label: 'Dashboard',         icon: '📊' },
  { href: '/live',   label: 'Live Ops',           icon: '🔴' },
  { href: '/orders', label: 'Orders',             icon: '📦' },
  { href: '/mix',    label: 'Mix & Migration',    icon: '📈' },
];

export default function Nav() {
  const pathname = usePathname();
  const router   = useRouter();

  const [actor, setActor] = useState<{ email: string; role: string } | null>(null);

  useEffect(() => {
    setActor(getActorFromToken());
  }, []);

  // Hide nav entirely on login page
  if (pathname === '/login') return null;

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-200">
        <span className="text-sm font-bold text-brand-dark tracking-tight">
          🌿 EcoBite Ops
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex flex-col gap-0.5 p-3 flex-1">
        {LINKS.map(({ href, label, icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-green-50 text-green-800 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="text-base leading-none">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer — user identity + sign out */}
      <div className="p-4 border-t border-gray-100 flex flex-col gap-2.5">
        {actor && (
          <div className="flex flex-col gap-0.5">
            <p className="text-[10px] font-medium text-gray-500 capitalize leading-none">
              {actor.role}
            </p>
            <p className="text-[11px] text-gray-400 truncate leading-snug">
              {actor.email}
            </p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-[11px] text-gray-400 hover:text-gray-600 transition-colors text-left"
        >
          <span>↪</span> Sign out
        </button>
      </div>
    </aside>
  );
}
