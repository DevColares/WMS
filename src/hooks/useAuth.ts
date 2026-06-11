'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb, APP_ID } from '@/lib/firebase';
import type { AppUser, UserRole } from '@/types/auth';

const MOCK_USERS: Record<string, { name: string; role: UserRole; storeName: string; jobTitle: string }> = {
    'admin@wms.com': { name: 'Admin', role: 'admin', storeName: 'Matriz', jobTitle: 'Administrador' },
    'operator@wms.com': { name: 'Operador', role: 'operator', storeName: 'Loja 01', jobTitle: 'Operador de Logística' },
    'viewer@wms.com': { name: 'Visualizador', role: 'viewer', storeName: 'Loja 02', jobTitle: 'Consultor' },
};

const USERS_COLLECTION = `artifacts/${APP_ID}/public/data/users`;

export function useAuth() {
    const [user, setUser] = useState<AppUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const auth = getFirebaseAuth();
        if (!auth) {
            const timer = setTimeout(() => setIsLoading(false), 0);
            return () => clearTimeout(timer);
        }
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
            if (firebaseUser) {
                const email = firebaseUser.email || '';
                
                // 1. Check Firestore for user data
                const db = getFirebaseDb();
                let userData: Partial<AppUser> = {};
                
                if (db) {
                    try {
                        const userDoc = await getDoc(doc(db, USERS_COLLECTION, firebaseUser.uid));
                        if (userDoc.exists()) {
                            userData = userDoc.data() as AppUser;
                        }
                    } catch (e) {
                        console.error('Erro ao buscar dados do usuário no Firestore:', e);
                    }
                }

                // 2. Fallback to MOCK_USERS or defaults
                const mockUser = MOCK_USERS[email] || { 
                    name: email.split('@')[0], 
                    role: 'viewer' as UserRole,
                    storeName: 'N/A',
                    jobTitle: 'N/A'
                };

                setUser({
                    id: firebaseUser.uid,
                    email: email,
                    name: userData.name || mockUser.name,
                    role: (userData.role || mockUser.role) as UserRole,
                    storeName: userData.storeName || mockUser.storeName,
                    jobTitle: userData.jobTitle || mockUser.jobTitle,
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
        } catch (err: unknown) {
            const firebaseError = err as { code?: string; message?: string };
            const message = firebaseError.code === 'auth/invalid-credential'
                ? 'Credenciais inválidas. Tente novamente.'
                : firebaseError.message || 'Erro ao fazer login.';
            setError(message);
            setIsLoading(false);
            throw new Error(message);
        }
    }, []);

    const signUp = useCallback(async (email: string, password: string, name: string, jobTitle: string, storeName: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const auth = getFirebaseAuth();
            const db = getFirebaseDb();
            if (!auth || !db) throw new Error('Firebase não configurado corretamente.');

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const newUser: Omit<AppUser, 'createdAt'> = {
                id: userCredential.user.uid,
                email,
                name,
                jobTitle,
                storeName,
                role: 'operator'
            };

            await setDoc(doc(db, USERS_COLLECTION, newUser.id), {
                ...newUser,
                createdAt: new Date()
            });

            // State will be updated by onAuthStateChanged
        } catch (err: unknown) {
            const firebaseError = err as { code?: string; message?: string };
            const message = firebaseError.code === 'auth/email-already-in-use'
                ? 'Este e-mail já está sendo usado.'
                : firebaseError.message || 'Erro ao criar conta.';
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

    return { user, isLoading, error, login, signUp, logout };
}