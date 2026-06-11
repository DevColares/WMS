'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
    { href: '/dashboard', label: 'Visão Geral', icon: 'tachometer-alt' },
    { href: '/dashboard/receiving', label: 'Mapear SKU', icon: 'barcode' },
    { href: '/dashboard/requests', label: 'Solicitações', icon: 'clipboard-list' },
    { href: '/dashboard/inventory', label: 'Inventário', icon: 'boxes-stacked' },
];

export function Header() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const pathname = usePathname();
    const { user, logout } = useAuth();

    const pageTitles: Record<string, string> = {
        '/dashboard': 'Visão Geral',
        '/dashboard/receiving': 'Mapear SKU',
        '/dashboard/requests': 'Solicitações',
        '/dashboard/inventory': 'Inventário',
    };

    const currentTitle = pageTitles[pathname] || 'Dashboard';

    return (
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 bg-white dark:bg-gray-800 border-b dark:border-gray-700 flex-shrink-0 relative z-10">
            <div className="flex items-center">
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="text-gray-600 dark:text-gray-300 focus:outline-none md:hidden"
                    aria-label="Abrir menu"
                >
                    <i className="fas fa-bars text-xl"></i>
                </button>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white md:ml-0 ml-4">
                    {currentTitle}
                </h2>
            </div>
            {user && (
                <div className="text-sm text-gray-600 dark:text-gray-300">
                    <i className="fas fa-user mr-2"></i>
                    {user.name}
                </div>
            )}

            {/* Mobile Menu Dropdown */}
            {mobileMenuOpen && (
                <div className="md:hidden absolute top-full left-0 right-0 bg-white dark:bg-gray-800 shadow-lg border-t dark:border-gray-700">
                    <nav className="flex flex-col p-2">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className={cn(
                                    'flex items-center px-4 py-3 rounded-lg',
                                    pathname === item.href
                                        ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                                )}
                            >
                                <i className={`fas fa-${item.icon} w-6 text-center`}></i>
                                <span className="ml-3">{item.label}</span>
                            </Link>
                        ))}
                        <button
                            onClick={logout}
                            className="flex items-center px-4 py-3 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900 mt-2 border-t dark:border-gray-700 pt-3"
                        >
                            <i className="fas fa-sign-out-alt w-6 text-center"></i>
                            <span className="ml-3">Sair</span>
                        </button>
                    </nav>
                </div>
            )}
        </header>
    );
}