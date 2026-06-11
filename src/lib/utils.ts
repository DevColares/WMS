import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function parseMasterCode(code: string): {
    sku: string;
    ean: string;
    quantity: number;
    validity: string;
    name: string;
} | null {
    const minLength = 5 + 13 + 4 + 5; // SKU+EAN+QTD+VALIDADE
    if (code.length < minLength) return null;

    let currentIndex = 0;
    const sku = code.substring(currentIndex, currentIndex + 5);
    currentIndex += 5;
    const ean = code.substring(currentIndex, currentIndex + 13);
    currentIndex += 13;
    const quantity = parseInt(code.substring(currentIndex, currentIndex + 4), 10) || 0;
    currentIndex += 4;
    const validityRaw = code.substring(currentIndex, currentIndex + 5);
    let validity = '';
    if (validityRaw.length === 5) {
        validity = `${validityRaw.substring(0, 2)}/${validityRaw.substring(3, 5)}`;
    }
    currentIndex += 5;
    const name = code.substring(currentIndex);
    if (!sku || !ean || !quantity || !validity || !name) return null;
    return { sku, ean, quantity, validity, name };
}

export function sortByFefo(items: { validity: string }[]): any[] {
    return [...items].sort((a, b) => {
        const dateA = a.validity.split('/');
        const dateB = b.validity.split('/');
        return (`20${dateA[1]}${dateA[0]}`).localeCompare(`20${dateB[1]}${dateB[0]}`);
    });
}

export function parseValidity(validity: string): Date | null {
    if (!validity || typeof validity !== 'string') return null;
    const parts = validity.split('/');
    if (parts.length !== 2) return null;
    const month = parseInt(parts[0], 10);
    const yearPart = parts[1];
    if (!yearPart) return null;
    const year = parseInt(`20${yearPart}`, 10);
    if (isNaN(month) || isNaN(year)) return null;
    return new Date(year, month, 0);
}

export function isNearExpiration(validity: string, monthsAhead: number = 3): boolean {
    const expirationDate = parseValidity(validity);
    if (!expirationDate) return false;
    const currentDate = new Date();
    const futureDate = new Date();
    futureDate.setMonth(currentDate.getMonth() + monthsAhead);
    return expirationDate > currentDate && expirationDate <= futureDate;
}

export function formatFirestoreDate(timestamp: { seconds: number; nanoseconds: number } | Date | undefined): string {
    if (!timestamp) return 'N/A';
    if (timestamp instanceof Date) return timestamp.toLocaleString('pt-BR');
    return new Date(timestamp.seconds * 1000).toLocaleString('pt-BR');
}

export function getDateFromTimestamp(timestamp: { seconds: number; nanoseconds: number } | Date): Date {
    if (timestamp instanceof Date) return timestamp;
    return new Date(timestamp.seconds * 1000);
}