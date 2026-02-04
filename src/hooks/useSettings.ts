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
                // EXPLICITLY SELECT ALL COLUMNS TO AVOID STALE CACHE ISSUES
                const { data, error } = await supabase.from('settings')
                    .select('*, bank_name, bank_holder, bank_cbu, bank_alias, bank_cuit, procedure_fees, player_fee')
                    .single();

                if (data) setSettings(data);
                if (error) console.error("Error retrieving settings:", error);
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
