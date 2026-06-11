'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMappingStore } from '@/store/mappingStore';
import { batchCreateInventoryItems, subscribeInventory } from '@/lib/api';
import { parseMasterCode } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import type { MappingSessionItem, InventoryItem } from '@/types/inventory';

export default function ReceivingPage() {
    const { user } = useAuth();
    const { showToast } = useToast();
    const store = useMappingStore();
    const [locationInput, setLocationInput] = useState('');
    const [codeInput, setCodeInput] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [locationConfirmed, setLocationConfirmed] = useState(false);
    const codeInputRef = useRef<HTMLInputElement>(null);

    const handleConfirmLocation = () => {
        if (!locationInput.trim()) {
            showToast('Por favor, insira um local de armazenamento.', 'error');
            return;
        }
        store.setLocation(locationInput.trim());
        setLocationConfirmed(true);
        setTimeout(() => codeInputRef.current?.focus(), 100);
    };

    const handleCodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();

        const code = codeInput.trim();
        if (!code) return;

        const parsed = parseMasterCode(code);
        if (!parsed) {
            showToast('Código unificado inválido ou incompleto.', 'error');
            return;
        }

        store.addItem(parsed);
        setCodeInput('');
        showToast(`SKU ${parsed.sku} adicionado (${parsed.quantity} unidades)`, 'success');
    };

    const handleSaveSession = async () => {
        if (store.session.length === 0) {
            showToast('Nenhum item na sessão para salvar.', 'error');
            return;
        }
        if (!store.currentLocation) return;

        setIsSaving(true);
        try {
            const items = store.session.map((item: MappingSessionItem) => ({
                sku: item.sku,
                ean: item.ean,
                name: item.name,
                quantity: item.quantity,
                validity: item.validity,
                storageLocation: store.currentLocation!,
                mappedBy: user?.name || 'N/A',
            }));
            await batchCreateInventoryItems(items);
            showToast(`${store.session.length} itens mapeados salvos com sucesso!`, 'success');
            store.clearSession();
            setLocationConfirmed(false);
            setLocationInput('');
        } catch (err: unknown) {
            const error = err as Error;
            showToast(error.message || 'Erro ao salvar itens.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleResetSession = () => {
        store.clearSession();
        setLocationConfirmed(false);
        setLocationInput('');
        showToast('Sessão reiniciada.', 'info');
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow max-w-6xl mx-auto p-6">
                <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                    Mapear SKU e Cadastrar Produtos
                </h3>

                {/* Location Input */}
                <div className="space-y-4 mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        1. Defina o Local de Armazenamento (Pressione Enter para confirmar)
                    </label>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={locationInput}
                            onChange={(e) => setLocationInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleConfirmLocation())}
                            disabled={locationConfirmed}
                            className="w-full md:w-1/3 p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white disabled:opacity-50"
                            placeholder="Ex: Corredor A, Prateleira 3"
                        />
                        <Button
                            variant="secondary"
                            onClick={handleConfirmLocation}
                            disabled={locationConfirmed}
                        >
                            Confirmar
                        </Button>
                    </div>
                </div>

                {/* Mapping Section */}
                {locationConfirmed && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                2. Insira o Código SKU (Pressione Enter para adicionar)
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    ref={codeInputRef}
                                    type="text"
                                    value={codeInput}
                                    onChange={(e) => setCodeInput(e.target.value)}
                                    onKeyDown={handleCodeScan}
                                    className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                                    placeholder="Cole o código e pressione Enter..."
                                />
                                <Button variant="secondary" onClick={handleResetSession}>
                                    <i className="fas fa-undo"></i> Novo Local
                                </Button>
                            </div>
                        </div>

                        {/* Session Table */}
                        <div className="mt-6">
                            <h4 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-200">
                                Endereço indicado:{' '}
                                <span className="text-blue-600">{store.currentLocation}</span>
                            </h4>
                            <div className="overflow-x-auto rounded-lg border dark:border-gray-700">
                                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                    <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-700 dark:text-gray-400">
                                        <tr>
                                            <th className="px-4 py-2">SKU</th>
                                            <th className="px-4 py-2">Descrição</th>
                                            <th className="px-4 py-2 text-center">Qtd</th>
                                            <th className="px-4 py-2 text-center">Validade</th>
                                            <th className="px-4 py-2 text-center">Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {store.session.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="text-center p-4 text-gray-500">
                                                    Nenhum item mapeado para este local.
                                                </td>
                                            </tr>
                                        ) : (
                                            store.session.map((item, index) => (
                                                <tr
                                                    key={`${item.sku}-${item.validity}`}
                                                    className="border-b dark:border-gray-700"
                                                >
                                                    <td className="px-4 py-2">{item.sku}</td>
                                                    <td className="px-4 py-2">{item.name}</td>
                                                    <td className="px-4 py-2 text-center">{item.quantity}</td>
                                                    <td className="px-4 py-2 text-center">{item.validity}</td>
                                                    <td className="px-4 py-2 text-center">
                                                        <button
                                                            onClick={() => store.removeItem(index)}
                                                            className="text-red-500 hover:text-red-700"
                                                        >
                                                            <i className="fas fa-trash-alt"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-end pt-4">
                            <Button
                                variant="primary"
                                size="lg"
                                onClick={handleSaveSession}
                                isLoading={isSaving}
                                disabled={store.session.length === 0}
                            >
                                Salvar Itens Mapeados
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}