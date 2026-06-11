

import { useEffect, useState, useMemo } from 'react';
import { subscribeInventory } from '@/lib/api';
import { formatFirestoreDate } from '@/lib/utils';
import type { InventoryItem } from '@/types/inventory';
import { Button } from '@/components/ui/Button';

export default function InventoryPage() {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 50;

    useEffect(() => {
        const unsubscribe = subscribeInventory((items) => setInventory(items));
        return () => unsubscribe();
    }, []);

    const filteredInventory = useMemo(() => {
        if (!searchTerm) return inventory;
        const term = searchTerm.toLowerCase();
        return inventory.filter(
            (p) =>
                p.sku?.toLowerCase().includes(term) ||
                p.name?.toLowerCase().includes(term) ||
                p.storageLocation?.toLowerCase().includes(term)
        );
    }, [inventory, searchTerm]);

    const totalPages = Math.ceil(filteredInventory.length / ITEMS_PER_PAGE);
    const paginatedItems = filteredInventory.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const exportToExcel = () => {
        if (inventory.length === 0) return;
        const headers = ['SKU', 'Descrição', 'Quantidade', 'Validade', 'Endereço', 'Data Mapeamento', 'Mapeado Por'];
        const rows = inventory.map((p) => [
            p.sku,
            p.name,
            p.quantity,
            p.validity,
            p.storageLocation,
            formatFirestoreDate(p.mappedAt),
            p.mappedBy,
        ]);

        const worksheet = [
            '<html><head><meta charset="UTF-8"></head><body><table>',
            '<thead><tr>' + headers.map((h) => `<th>${h}</th>`).join('') + '</tr></thead>',
            '<tbody>',
            rows.map((row) => '<tr>' + row.map((cell) => `<td>${cell}</td>`).join('') + '</tr>').join(''),
            '</tbody></table></body></html>',
        ].join('');

        const blob = new Blob([worksheet], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'inventario.xls';
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative w-full md:w-1/3">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                        placeholder="Buscar por SKU, descrição, endereço..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                </div>
                <Button variant="secondary" onClick={exportToExcel} className="w-full md:w-auto">
                    <i className="fas fa-file-excel"></i> Exportar para Excel
                </Button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th scope="col" className="px-6 py-3">SKU</th>
                            <th scope="col" className="px-6 py-3">Descrição</th>
                            <th scope="col" className="px-6 py-3 text-center">Quantidade</th>
                            <th scope="col" className="px-6 py-3 text-center">Validade</th>
                            <th scope="col" className="px-6 py-3">Endereço</th>
                            <th scope="col" className="px-6 py-3">Data de Mapeamento</th>
                            <th scope="col" className="px-6 py-3">Mapeado Por</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedItems.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center p-6 text-gray-500">
                                    {inventory.length === 0 ? 'Carregando inventário...' : 'Nenhum produto encontrado.'}
                                </td>
                            </tr>
                        ) : (
                            paginatedItems.map((product) => (
                                <tr
                                    key={product.id}
                                    className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                                >
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                        {product.sku}
                                    </td>
                                    <td className="px-6 py-4">{product.name}</td>
                                    <td className="px-6 py-4 text-center">{product.quantity}</td>
                                    <td className="px-6 py-4 text-center">{product.validity}</td>
                                    <td className="px-6 py-4">{product.storageLocation}</td>
                                    <td className="px-6 py-4">{formatFirestoreDate(product.mappedAt)}</td>
                                    <td className="px-6 py-4">{product.mappedBy || 'N/A'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                    >
                        Anterior
                    </Button>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        Página {currentPage} de {totalPages} ({filteredInventory.length} itens)
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                    >
                        Próxima
                    </Button>
                </div>
            )}
        </div>
    );
}
