'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message?: string;
    icon?: string;
    children?: ReactNode;
    actions?: ReactNode;
}

export function Modal({ isOpen, onClose, title, message, children, actions }: ModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEsc);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={(e) => e.target === overlayRef.current && onClose()}
        >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm transform transition-all">
                <div className="p-6 text-center">
                    {children || (
                        <>
                            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                                {title}
                            </h3>
                            {message && (
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                                    {message}
                                </p>
                            )}
                        </>
                    )}
                    {actions && (
                        <div className="flex justify-center gap-4 mt-4">
                            {actions}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}