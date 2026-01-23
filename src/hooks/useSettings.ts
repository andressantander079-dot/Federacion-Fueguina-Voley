import { createClient } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';

export const useSettings = () => {
    const [settings, setSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        async function fetchSettings() {
            try {
                // Ensure singleton key is true or fetch the first row
                const { data, error } = await supabase.from('settings').select('*').single();
                if (data) setSettings(data);
            } catch (error) {
                console.error("Error fetching settings:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchSettings();
    }, []);

    return { settings, loading };
};
