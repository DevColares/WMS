'use client';

import { useEffect, useState } from 'react';
import { subscribeInventory, subscribeDailyRequests } from '@/lib/api';
import { formatFirestoreDate, isNearExpiration, parseValidity } from '@/lib/utils';
import type { InventoryItem, RequestItem } from '@/types/inventory';

export default function DashboardPage() {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [requests, setRequests] = useState<RequestItem[]>([]);

    useEffect(() => {
        const unsubInventory = subscribeInventory((items) => setInventory(items));
        const unsubRequests = subscribeDailyRequests((items) => setRequests(items));
        return () => {
            unsubInventory();
            unsubRequests();
        };
    }, []);

    const totalSkus = new Set(inventory.map((p) => p.sku)).size;
    const totalItems = inventory.reduce((sum, p) => sum + (p.quantity || 0), 0);
    const pendingRequests = requests.filter((r) => r.status === 'pending').length;

    const nearExpiration = inventory
        .filter((p) => isNearExpiration(p.validity))
        .sort((a, b) => {
            const da = parseValidity(a.validity);
            const db = parseValidity(b.validity);
            return (da?.getTime() || 0) - (db?.getTime() || 0);
        });

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-500 dark:text-blue-300">
                            <i className="fas fa-box-open text-2xl"></i>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400">SKUs no Estoque</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalSkus}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-green-100 dark:bg-green-900 text-green-500 dark:text-green-300">
                            <i className="fas fa-boxes-stacked text-2xl"></i>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Itens em Estoque</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalItems}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-500 dark:text-yellow-300">
                            <i className="fas fa-hourglass-half text-2xl"></i>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Solicitações Pendentes</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingRequests}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Near Expiration */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="p-4 border-b dark:border-gray-700">
                    <h4 className="text-lg font-semibold flex items-center text-gray-700 dark:text-gray-200">
                        <i className="fas fa-calendar-times text-red-500 mr-3"></i>
                        Produtos com Vencimento Próximo (3 meses)
                    </h4>
                </div>
                <div className="max-h-64 overflow-y-auto">
                    {nearExpiration.length === 0 ? (
                        <p className="text-gray-500 text-center p-6">Nenhum produto com vencimento próximo.</p>
                    ) : (
                        nearExpiration.map((p) => (
                            <div
                                key={p.id}
                                className="flex justify-between items-center py-3 px-4 border-b dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                <div>
                                    <p className="font-semibold text-gray-800 dark:text-white">SKU: {p.sku}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{p.name || 'Sem descrição'}</p>
                                    <p className="text-sm text-gray-500">Endereço: {p.storageLocation}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-red-500">{p.validity}</p>
                                    <p className="text-xs text-gray-500">Validade</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}