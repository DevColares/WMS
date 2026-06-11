export type UserRole = 'admin' | 'operator' | 'viewer';

export interface AppUser {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    storeName: string;
    jobTitle: string;
    photoURL?: string;
    createdAt: Date;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface AuthState {
    user: AppUser | null;
    isLoading: boolean;
    error: string | null;
}