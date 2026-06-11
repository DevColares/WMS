'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login, error } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) return;
        setIsSubmitting(true);
        try {
            await login(email, password);
            router.push('/dashboard');
        } catch {
            // Error is handled by useAuth
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-200 dark:bg-gray-900">
            <div className="w-full max-w-sm p-8 space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
                <div className="text-center">
                    <i className="fas fa-cubes text-4xl text-blue-600"></i>
                    <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">Acesso ao WMS</h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Faça login com suas credenciais.
                    </p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder="seu@email.com"
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Senha
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder="Sua senha"
                        />
                    </div>

                    {error && (
                        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/50 dark:text-red-300 p-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    <div>
                        <Button type="submit" isLoading={isSubmitting} className="w-full">
                            Entrar
                        </Button>
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center space-y-1">
                        <p>Credenciais de teste:</p>
                        <p>admin@wms.com / operator@wms.com / viewer@wms.com</p>
                        <p>(qualquer senha com 6+ caracteres)</p>
                    </div>
                </form>
            </div>
        </div>
    );
}