'use client';

import { useEffect, useState } from 'react';
import OfficialMatchSheet from '@/components/match/OfficialMatchSheet';
import { createClient } from '@/lib/supabase/client';
import { useParams } from 'next/navigation';

export default function LiveMatchPage() {
    const { id } = useParams();
    const [valid, setValid] = useState(false);
    const [loading, setLoading] = useState(true);

    // We reuse OfficialMatchSheet in readOnly mode.
    // Ideally, OfficialMatchSheet handles 'readOnly' by modifying its UI (no inputs)
    // and subscribing to changes if not present.

    // For now, let's just render it. The component needs 'readOnly' prop support.
    // I will update OfficialMatchSheet.tsx next.

    return (
        <div className="min-h-screen bg-black">
            <OfficialMatchSheet readOnly={true} redirectAfterSubmit="/" />
        </div>
    );
}
