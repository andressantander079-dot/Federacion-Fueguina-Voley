'use client';

import { Calendar, Download } from 'lucide-react';
import { CalendarEvent, downloadICS } from '@/lib/icsUtils';

interface CalendarSyncButtonProps {
    events: CalendarEvent[];
    filename?: string;
    label?: string;
    compact?: boolean;
}

export default function CalendarSyncButton({
    events,
    filename = 'calendario-voley',
    label = 'Sincronizar Calendario',
    compact = false
}: CalendarSyncButtonProps) {

    const handleDownload = () => {
        if (events.length === 0) {
            alert('No hay eventos para sincronizar.');
            return;
        }
        downloadICS(filename, events);
    };

    if (compact) {
        return (
            <button
                onClick={handleDownload}
                title="Sincronizar con tu calendario"
                className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-full text-slate-600 dark:text-slate-300 transition-colors"
            >
                <Calendar size={18} />
            </button>
        );
    }

    return (
        <button
            onClick={handleDownload}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95"
        >
            <Calendar size={16} />
            <span>{label}</span>
            <Download size={14} className="opacity-50" />
        </button>
    );
}
