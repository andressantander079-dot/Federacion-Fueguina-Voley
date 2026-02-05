'use client';

import OfficialMatchSheet from '@/components/match/OfficialMatchSheet';

export default function PublicLiveMatchPage() {
    return <OfficialMatchSheet redirectAfterSubmit="/" readOnly={true} />;
}
