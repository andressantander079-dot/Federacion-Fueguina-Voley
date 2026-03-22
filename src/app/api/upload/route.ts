import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const bucketName = formData.get('bucketName') as string;
        const fileName = formData.get('fileName') as string;

        if (!file || !bucketName || !fileName) {
            return NextResponse.json({ error: 'Faltan parámetros obligatorios (file, bucketName, fileName)' }, { status: 400 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(fileName, file, {
                upsert: true
            });

        if (error) {
            console.error("Supabase Storage Error:", error);
            throw error;
        }

        const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(fileName);

        return NextResponse.json({ publicUrl, success: true });
    } catch (e: any) {
        console.error("Upload API Error:", e);
        return NextResponse.json({ error: e.message || 'Error interno al subir archivo' }, { status: 500 });
    }
}
