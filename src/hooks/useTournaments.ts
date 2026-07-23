import { useState } from 'react';

export function useTournaments() {
    const [isPending, setIsPending] = useState(false);

    const deleteTournament = async (tournamentId: string, securityCode: string) => {
        setIsPending(true);
        try {
            const response = await fetch('/api/admin/delete-tournament', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ tournamentId, securityCode }),
            });

            const data = await response.json();
            if (!response.ok || data.error) {
                return { success: false, error: data.error || 'Error al eliminar el torneo' };
            }
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message || 'Error de red' };
        } finally {
            setIsPending(false);
        }
    };

    return {
        deleteTournament,
        isPending
    };
}
