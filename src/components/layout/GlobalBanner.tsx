'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AlertTriangle, X } from 'lucide-react';

export default function GlobalBanner() {
    const [banner, setBanner] = useState<{ active: boolean; text: string } | null>(null);
    const [visible, setVisible] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        async function fetchSettings() {
            // Fetch the single settings row (usually id=1 or just single())
            const { data, error } = await supabase.from('settings').select('warning_banner_active, warning_banner_text').single();

            if (data && data.warning_banner_active && data.warning_banner_text) {
                setBanner({ active: data.warning_banner_active, text: data.warning_banner_text });
                setVisible(true);

                // Auto-hide after 3 seconds as requested
                const timer = setTimeout(() => {
                    setVisible(false);
                }, 3000); // 3000ms = 3 seconds

                return () => clearTimeout(timer);
            }
        }

        fetchSettings();
    }, []);

    if (!visible || !banner) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-yellow-500 text-black font-bold px-4 py-3 shadow-lg flex items-center justify-center gap-3 animate-in slide-in-from-top duration-300">
            <AlertTriangle className="h-5 w-5 fill-black text-yellow-500" />
            <span className="uppercase tracking-wide text-sm md:text-base text-center">{banner.text}</span>
            <button onClick={() => setVisible(false)} className="absolute right-4 p-1 hover:bg-black/10 rounded-full">
                <X size={18} />
            </button>
        </div>
    );
}
