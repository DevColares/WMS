'use client';

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

export function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    return (
        <aside className="hidden md:flex w-64 bg-blue-800 text-white flex-shrink-0 flex-col">
            <div className="h-16 flex items-center justify-center px-4 border-b border-blue-700">
                <i className="fas fa-cubes text-2xl mr-3"></i>
                <h1 className="text-xl font-bold">WMS-VDJT-23283</h1>
            </div>
            <nav className="flex-1 px-2 py-4 space-y-2">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            'flex items-center px-4 py-2.5 rounded-lg transition-colors duration-200',
                            pathname === item.href
                                ? 'bg-blue-700 text-white'
                                : 'hover:bg-blue-600 hover:text-white'
                        )}
                    >
                        <i className={`fas fa-${item.icon} w-6 text-center`}></i>
                        <span className="ml-3">{item.label}</span>
                    </Link>
                ))}
            </nav>
            {user && (
                <div className="text-center p-4 border-t border-blue-700 text-blue-200">
                    Bem-vindo, <strong className="font-semibold text-white">{user.name}</strong>
                </div>
            )}
            <button
                onClick={logout}
                className="flex items-center justify-center px-4 py-3 bg-blue-900 hover:bg-red-700 transition-colors duration-200 w-full"
            >
                <i className="fas fa-sign-out-alt w-6 text-center"></i>
                <span className="ml-3">Sair</span>
            </button>
        </aside>
    );
}