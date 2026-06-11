'use client';

import { useEffect, useState, useCallback } from 'react';
import { subscribeDailyRequests, subscribeInventory, createRequest, fulfillRequest, cancelRequest } from '@/lib/api';
import { sortByFefo } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { InventoryItem, RequestItem } from '@/types/inventory';

export default function RequestsPage() {
    const { user } = useAuth();
    const { showToast } = useToast();

    const [requests, setRequests] = useState<RequestItem[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);

    const [sku, setSku] = useState('');
    const [quantity, setQuantity] = useState('');
    const [destination, setDestination] = useState<'PICKING' | 'LOJA'>('PICKING');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Modal state
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    useEffect(() => {
        if (!user) return;
        const unsubRequests = subscribeDailyRequests(user.tenantId, (items) => setRequests(items));
        const unsubInventory = subscribeInventory(user.tenantId, (items) => setInventory(items));
        return () => {
            unsubRequests();
            unsubInventory();
        };
    }, [user]);

    const productInfo = (() => {
        if (!sku) return null;
        const matching = inventory.filter((p) => p.sku === sku && p.quantity > 0);
        if (matching.length === 0) return null;
        const sorted = sortByFefo(matching);
        return {
            name: sorted[0].name,
            totalQuantity: matching.reduce((sum, p) => sum + p.quantity, 0),
            fefoAddress: sorted[0].storageLocation,
        };
    })();

    const handleCreateRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sku || !quantity || !user) return;

        const qty = parseInt(quantity);
        if (isNaN(qty) || qty <= 0) {
            showToast('Quantidade inválida.', 'error');
            return;
        }

        if (!productInfo) {
            showToast('SKU não encontrado ou sem estoque.', 'error');
            return;
        }

        if (qty > productInfo.totalQuantity) {
            showToast(`Estoque insuficiente. Disponível: ${productInfo.totalQuantity}`, 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            await createRequest(user.tenantId, {
                sku,
                name: productInfo.name,
                quantity: qty,
                destination,
                fefoAddress: productInfo.fefoAddress,
                requestedBy: user.name,
            });
            showToast('Solicitação criada com sucesso!');
            setSku('');
            setQuantity('');
        } catch (err: unknown) {
            const error = err as Error;
            showToast(error.message || 'Erro ao criar solicitação.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFulfill = (requestId: string) => {
        if (!user) return;
        setConfirmModal({
            isOpen: true,
            title: 'Atender Solicitação',
            message: 'Isso irá deduzir os itens do estoque. Deseja continuar?',
            onConfirm: async () => {
                try {
                    await fulfillRequest(user.tenantId, requestId, inventory, user.name || '');
                    showToast('Solicitação atendida e estoque atualizado!');
                } catch (err: unknown) {
                    const error = err as Error;
                    showToast(error.message || 'Erro ao atender solicitação.', 'error');
                }
                setConfirmModal((prev) => ({ ...prev, isOpen: false }));
            },
        });
    };

    const handleCancel = (requestId: string) => {
        if (!user) return;
        setConfirmModal({
            isOpen: true,
            title: 'Cancelar Solicitação',
            message: 'Tem certeza que deseja cancelar esta solicitação?',
            onConfirm: async () => {
                try {
                    await cancelRequest(user.tenantId, requestId, user.name || '');
                    showToast('Solicitação cancelada com sucesso!');
                } catch (err: unknown) {
                    const error = err as Error;
                    showToast(error.message || 'Erro ao cancelar solicitação.', 'error');
                }
                setConfirmModal((prev) => ({ ...prev, isOpen: false }));
            },
        });
    };

    const statusInfo: Record<RequestItem['status'], { bg: string; text: string; icon: string; label: string }> = {
        pending: { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-800 dark:text-yellow-300', icon: 'fa-hourglass-half', label: 'Pendente' },
        fulfilled: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-300', icon: 'fa-check-circle', label: 'Atendida' },
        cancelled: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-800 dark:text-red-300', icon: 'fa-times-circle', label: 'Cancelada' },
    };

    const exportToExcel = () => {
        if (requests.length === 0) return;
        const headers = ['ID', 'Status', 'Data Criação', 'SKU', 'Produto', 'Quantidade', 'Destino', 'Endereço Retirada', 'Solicitado Por', 'Atendido Por', 'Cancelado Por'];
        const rows = requests.map((req) => [
            req.id,
            req.status,
            new Date(req.createdAt.seconds * 1000).toLocaleString('pt-BR'),
            req.sku,
            req.name,
            req.quantity.toString(),
            req.destination,
            req.fefoAddress,
            req.requestedBy,
            req.fulfilledBy || '',
            req.cancelledBy || '',
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
        link.download = 'solicitacoes.xls';
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            {/* New Request Form */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Criar Nova Solicitação</h3>
                <form onSubmit={handleCreateRequest} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-2">
                        <label htmlFor="requestSku" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            SKU do Produto
                        </label>
                        <input
                            id="requestSku"
                            type="text"
                            value={sku}
                            onChange={(e) => setSku(e.target.value)}
                            className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="requestQuantity" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            Quantidade
                        </label>
                        <input
                            id="requestQuantity"
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="requestDestination" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            Destino
                        </label>
                        <select
                            id="requestDestination"
                            value={destination}
                            onChange={(e) => setDestination(e.target.value as 'PICKING' | 'LOJA')}
                            className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                            required
                        >
                            <option value="PICKING">PICKING</option>
                            <option value="LOJA">LOJA</option>
                        </select>
                    </div>
                    <div className="md:col-span-4 flex justify-between items-center mt-4 flex-wrap gap-4">
                        {productInfo && (
                            <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1 flex-grow">
                                <p><strong>Descrição:</strong> {productInfo.name}</p>
                                <p>
                                    <strong>Estoque Total:</strong> {productInfo.totalQuantity} |{' '}
                                    <strong>Endereço (FEFO):</strong> {productInfo.fefoAddress}
                                </p>
                            </div>
                        )}
                        <Button type="submit" isLoading={isSubmitting} className="ml-auto">
                            Solicitar
                        </Button>
                    </div>
                </form>
            </div>

            {/* Requests List */}
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Histórico de Solicitações do Dia</h3>
                <Button variant="secondary" onClick={exportToExcel}>
                    <i className="fas fa-file-excel"></i> Exportar Lista
                </Button>
            </div>

            <div className="space-y-4">
                {requests.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center text-gray-500">
                        Nenhuma solicitação encontrada para hoje.
                    </div>
                ) : (
                    requests.map((req) => {
                        const status = statusInfo[req.status];
                        return (
                            <div key={req.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 transition-all">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                                    <div className="flex-1 mb-4 md:mb-0">
                                        <p className="font-semibold text-gray-800 dark:text-white">
                                            Solicitação para: {req.destination}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            Criada em: {new Date(req.createdAt.seconds * 1000).toLocaleString('pt-BR')}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">por: {req.requestedBy}</p>
                                        {req.fulfilledBy && (
                                            <p className="text-xs text-gray-500 mt-1">Atendido por: {req.fulfilledBy}</p>
                                        )}
                                        {req.cancelledBy && (
                                            <p className="text-xs text-gray-500 mt-1">Cancelado por: {req.cancelledBy}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4 w-full md:w-auto">
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`}
                                        >
                                            <i className={`fas ${status.icon} mr-1.5`}></i>
                                            {status.label}
                                        </span>
                                        {req.status === 'pending' && (
                                            <>
                                                <Button size="sm" variant="primary" onClick={() => handleFulfill(req.id)}>
                                                    Atender
                                                </Button>
                                                <Button size="sm" variant="danger" onClick={() => handleCancel(req.id)}>
                                                    Cancelar
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t dark:border-gray-700">
                                    <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-200">Item:</h4>
                                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-300">
                                        <li>
                                            {req.name} (SKU: {req.sku}) - <strong>Qtd: {req.quantity}</strong>
                                            <div className="mt-1">
                                                <strong className="font-semibold">
                                                    Endereço de Retirada (FEFO): {req.fefoAddress}
                                                </strong>
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Confirm Modal */}
            <Modal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                title={confirmModal.title}
                message={confirmModal.message}
                actions={
                    <>
                        <Button variant="ghost" onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}>
                            Cancelar
                        </Button>
                        <Button variant="danger" onClick={confirmModal.onConfirm}>
                            Confirmar
                        </Button>
                    </>
                }
            />
        </div>
    );
}