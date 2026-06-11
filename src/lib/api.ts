import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    runTransaction,
    writeBatch,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    onSnapshot,
    QueryDocumentSnapshot,
    Timestamp,
} from 'firebase/firestore';
import { getFirebaseDb, APP_ID } from './firebase';
import type { InventoryItem, RequestItem } from '@/types/inventory';

const DB_PATH = `artifacts/${APP_ID}/public/data`;

function getInventoryCollection() {
    return collection(getFirebaseDb(), `${DB_PATH}/inventory`);
}

function getRequestsCollection() {
    return collection(getFirebaseDb(), `${DB_PATH}/requests`);
}

// --- INVENTORY ---

export interface PaginatedResult<T> {
    items: T[];
    lastDoc: QueryDocumentSnapshot | null;
    hasMore: boolean;
}

export async function fetchInventoryPage(pageSize: number = 50, lastVisible?: QueryDocumentSnapshot): Promise<PaginatedResult<InventoryItem>> {
    let q = query(getInventoryCollection(), orderBy('sku'), limit(pageSize));

    if (lastVisible) {
        q = query(getInventoryCollection(), orderBy('sku'), startAfter(lastVisible), limit(pageSize));
    }

    const snapshot = await getDocs(q);
    const items: InventoryItem[] = [];
    snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as InventoryItem);
    });

    const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
    return { items, lastDoc, hasMore: snapshot.docs.length === pageSize };
}

export async function searchInventory(searchTerm: string): Promise<InventoryItem[]> {
    const snapshot = await getDocs(getInventoryCollection());
    const items: InventoryItem[] = [];
    snapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() } as InventoryItem;
        if (
            data.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
            data.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            data.storageLocation?.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
            items.push(data);
        }
    });
    return items;
}

export function subscribeInventory(callback: (items: InventoryItem[]) => void): () => void {
    const unsubscribe = onSnapshot(getInventoryCollection(), (snapshot) => {
        const items: InventoryItem[] = [];
        snapshot.forEach((doc) => {
            items.push({ id: doc.id, ...doc.data() } as InventoryItem);
        });
        callback(items);
    });
    return unsubscribe;
}

export async function createInventoryItem(data: Omit<InventoryItem, 'id'>): Promise<string> {
    const docRef = await addDoc(getInventoryCollection(), {
        ...data,
        mappedAt: Timestamp.fromDate(new Date()),
    });
    return docRef.id;
}

export async function batchCreateInventoryItems(items: Omit<InventoryItem, 'id'>[]): Promise<void> {
    const batch = writeBatch(getFirebaseDb());
    items.forEach((item) => {
        const docRef = doc(getInventoryCollection());
        batch.set(docRef, {
            ...item,
            mappedAt: Timestamp.fromDate(new Date()),
        });
    });
    await batch.commit();
}

// --- REQUESTS ---

export async function fetchDailyRequests(): Promise<RequestItem[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const q = query(
        getRequestsCollection(),
        where('createdAt', '>=', today),
        orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const items: RequestItem[] = [];
    snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as RequestItem);
    });
    return items;
}

export function subscribeDailyRequests(callback: (items: RequestItem[]) => void): () => void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const q = query(
        getRequestsCollection(),
        where('createdAt', '>=', today),
        orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const items: RequestItem[] = [];
        snapshot.forEach((doc) => {
            items.push({ id: doc.id, ...doc.data() } as RequestItem);
        });
        callback(items);
    });
    return unsubscribe;
}

export async function createRequest(data: {
    sku: string;
    name: string;
    quantity: number;
    destination: 'PICKING' | 'LOJA';
    fefoAddress: string;
    requestedBy: string;
}): Promise<string> {
    const docRef = await addDoc(getRequestsCollection(), {
        ...data,
        status: 'pending',
        createdAt: Timestamp.fromDate(new Date()),
    });
    return docRef.id;
}

export async function fulfillRequest(
    requestId: string,
    inventoryItems: InventoryItem[],
    fulfilledBy: string
): Promise<void> {
    const requestRef = doc(getRequestsCollection(), requestId);

    await runTransaction(getFirebaseDb(), async (transaction) => {
        const requestDoc = await transaction.get(requestRef);
        if (!requestDoc.exists()) throw new Error('Solicitação não encontrada.');

        const requestData = requestDoc.data() as RequestItem;
        if (requestData.status !== 'pending') {
            throw new Error('Esta solicitação não está mais pendente.');
        }

        let quantityToFulfill = requestData.quantity;
        const skuToFulfill = requestData.sku;

        // Filter and sort matching inventory by FEFO
        const matchingItems = inventoryItems
            .filter((p) => p.sku === skuToFulfill && p.quantity > 0)
            .sort((a, b) => {
                const dateA = a.validity.split('/');
                const dateB = b.validity.split('/');
                return (`20${dateA[1]}${dateA[0]}`).localeCompare(`20${dateB[1]}${dateB[0]}`);
            });

        const totalAvailable = matchingItems.reduce((sum, item) => sum + item.quantity, 0);
        if (totalAvailable < quantityToFulfill) {
            throw new Error(`Estoque insuficiente. Disponível: ${totalAvailable}, Solicitado: ${quantityToFulfill}.`);
        }

        for (const item of matchingItems) {
            if (quantityToFulfill <= 0) break;
            const itemRef = doc(getInventoryCollection(), item.id);
            const freshItemDoc = await transaction.get(itemRef);
            const currentQuantity = freshItemDoc.data()?.quantity || 0;
            const amountToDeduct = Math.min(currentQuantity, quantityToFulfill);
            transaction.update(itemRef, { quantity: currentQuantity - amountToDeduct });
            quantityToFulfill -= amountToDeduct;
        }

        transaction.update(requestRef, {
            status: 'fulfilled',
            fulfilledBy,
            fulfilledAt: Timestamp.fromDate(new Date()),
        });
    });
}

export async function cancelRequest(requestId: string, cancelledBy: string): Promise<void> {
    const requestRef = doc(getRequestsCollection(), requestId);
    await updateDoc(requestRef, {
        status: 'cancelled',
        cancelledBy,
        cancelledAt: Timestamp.fromDate(new Date()),
    });
}