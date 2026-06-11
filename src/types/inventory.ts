export interface InventoryItem {
    id: string;
    sku: string;
    ean?: string;
    name: string;
    quantity: number;
    validity: string; // MM/AA
    storageLocation: string;
    mappedAt: FirestoreTimestamp;
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
    fefoAddress: string;
    status: 'pending' | 'fulfilled' | 'cancelled';
    createdAt: FirestoreTimestamp;
    requestedBy: string;
    fulfilledBy?: string;
    fulfilledAt?: FirestoreTimestamp;
    cancelledBy?: string;
    cancelledAt?: FirestoreTimestamp;
}

export interface MappingSessionItem {
    sku: string;
    ean: string;
    name: string;
    quantity: number;
    validity: string;
}
