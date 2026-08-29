import { NextResponse } from 'next/server';
import { executeLiveMatchCleanup } from '@/app/actions/liveMatchCleanup';

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    const expectedSecret = process.env.CRON_SECRET;

    // Si hay un secreto configurado, validar autenticación Bearer
    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
        return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const result = await executeLiveMatchCleanup();
        return NextResponse.json({ success: true, ...result });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
