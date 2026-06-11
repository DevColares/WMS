export interface InventoryItem {
    id: string;
    sku: string;
    ean?: string;
    name: string;
    quantity: number;
    validity: string; // MM/AA
    storageLocation: string;
    mappedAt: { seconds: number; nanoseconds: number } | Date;
    mappedBy: string;
}

export interface FirestoreTimestamp {
    seconds: number;
    nanoseconds: number;
}

export interface RequestItem {
    id: string;
    sku: string;
    name: string;
    quantity: number;
    destination: 'PICKING' | 'LOJA' | 'TRANSFERENCIA';
    fulfilledAt?: { seconds: number; nanoseconds: number } | Date;
    cancelledBy?: string;
    cancelledAt?: { seconds: number; nanoseconds: number } | Date;
}

export interface MappingSessionItem {
    sku: string;
    ean: string;
    name: string;
    quantity: number;
    validity: string;
}