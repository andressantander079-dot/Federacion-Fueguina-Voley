'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';

export default function WarningBanner() {
    const { settings } = useSettings();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (settings?.warning_banner_active && settings?.warning_banner_text) {
            setVisible(true);
            const timer = setTimeout(() => {
                setVisible(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [settings]);

    if (!visible || !settings) return null;

    return (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[100] w-[90%] max-w-2xl animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="bg-yellow-400 text-yellow-900 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 border-2 border-yellow-500/20 backdrop-blur-md">
                <div className="p-2 bg-yellow-500/20 rounded-full">
                    <AlertTriangle size={24} className="text-yellow-900" />
                </div>
                <div className="flex-1">
                    <h4 className="font-black uppercase text-xs tracking-wider opacity-70 mb-1">Comunicado Oficial</h4>
                    <p className="font-bold text-sm leading-tight">
                        {settings.warning_banner_text}
                    </p>
                </div>
                <button
                    onClick={() => setVisible(false)}
                    className="p-1 hover:bg-yellow-500/20 rounded-lg transition"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
}
