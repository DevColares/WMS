'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    User as FirebaseUser,
} from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';
import type { AppUser, UserRole } from '@/types/auth';

const MOCK_USERS: Record<string, { name: string; role: UserRole }> = {
    'admin@wms.com': { name: 'Admin', role: 'admin' },
    'operator@wms.com': { name: 'Operador', role: 'operator' },
    'viewer@wms.com': { name: 'Visualizador', role: 'viewer' },
};

export function useAuth() {
    const [user, setUser] = useState<AppUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const auth = getFirebaseAuth();
        if (!auth) {
            setIsLoading(false);
            return;
        }
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
            if (firebaseUser) {
                const email = firebaseUser.email || '';
                const mockUser = MOCK_USERS[email] || { name: email.split('@')[0], role: 'viewer' as UserRole };
                setUser({
                    id: firebaseUser.uid,
                    email: email,
                    name: mockUser.name,
                    role: mockUser.role,
                    photoURL: firebaseUser.photoURL || undefined,
                    createdAt: firebaseUser.metadata.creationTime
                        ? new Date(firebaseUser.metadata.creationTime)
                        : new Date(),
                });
            } else {
                setUser(null);
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const auth = getFirebaseAuth();
            if (!auth) throw new Error('Firebase não configurado corretamente.');
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err: any) {
            const message = err.code === 'auth/invalid-credential'
                ? 'Credenciais inválidas. Tente novamente.'
                : err.message || 'Erro ao fazer login.';
            setError(message);
            setIsLoading(false);
            throw new Error(message);
        }
    }, []);

    const logout = useCallback(async () => {
        const auth = getFirebaseAuth();
        if (auth) {
            await signOut(auth);
        }
        setUser(null);
    }, []);

    return { user, isLoading, error, login, logout };
}