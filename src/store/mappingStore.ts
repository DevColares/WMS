import { create } from 'zustand';
import type { MappingSessionItem } from '@/types/inventory';

interface MappingState {
    session: MappingSessionItem[];
    currentLocation: string | null;
    addItem: (item: MappingSessionItem) => void;
    removeItem: (index: number) => void;
    updateQuantity: (index: number, quantity: number) => void;
    setLocation: (location: string) => void;
    clearSession: () => void;
    totalItems: () => number;
}

export const useMappingStore = create<MappingState>((set, get) => ({
    session: [],
    currentLocation: null,

    addItem: (item) => {
        const { session } = get();
        const existingIndex = session.findIndex(
            (s) => s.sku === item.sku && s.validity === item.validity
        );

        if (existingIndex >= 0) {
            const updated = [...session];
            updated[existingIndex] = {
                ...updated[existingIndex],
                quantity: updated[existingIndex].quantity + item.quantity,
            };
            set({ session: updated });
        } else {
            set({ session: [...session, item] });
        }
    },

    removeItem: (index) => {
        const { session } = get();
        set({ session: session.filter((_, i) => i !== index) });
    },

    updateQuantity: (index, quantity) => {
        const { session } = get();
        if (index >= 0 && index < session.length) {
            const updated = [...session];
            updated[index] = { ...updated[index], quantity };
            set({ session: updated });
        }
    },

    setLocation: (location) => set({ currentLocation: location }),

    clearSession: () => set({ session: [], currentLocation: null }),

    totalItems: () => {
        return get().session.reduce((sum, item) => sum + item.quantity, 0);
    },
}));