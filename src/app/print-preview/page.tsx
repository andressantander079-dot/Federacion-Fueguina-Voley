'use client';
import OfficialMatchSheet from '@/components/match/OfficialMatchSheet';

export default function PrintPreviewPage() {
    return (
        <div className="min-h-screen bg-slate-50 relative pt-4">
            <OfficialMatchSheet redirectAfterSubmit="" readOnly={true} matchIdOverride="d49434c0-89d0-4c4a-a4d5-8f0a6b3b33d7" />
        </div>
    );
}
