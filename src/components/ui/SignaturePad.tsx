'use client'

import { useRef, useEffect, useState } from 'react';
import { Eraser } from 'lucide-react';

interface SignaturePadProps {
    onSign: (dataUrl: string) => void;
    label?: string;
    onClear?: () => void;
}

export default function SignaturePad({ onSign, label = "FIRMAR AQUÍ", onClear }: SignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.strokeStyle = '#020617'; // slate-950
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }, []);

    const startDrawing = (e: any) => {
        setIsDrawing(true);
        draw(e);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.beginPath();
        // Trigger save
        onSign(canvas.toDataURL('image/png'));
    };

    const draw = (e: any) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        // Support touch & mouse
        const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;
        
        // Handle scaling if CSS width/height differs from canvas width/height attributes
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const clear = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        onSign(''); // Clear signature
        ctx.beginPath(); // Reset path
        if(onClear) onClear();
    }

    return (
        <div className="relative border-2 border-dashed border-zinc-700 hover:border-tdf-blue rounded-3xl bg-white overflow-hidden group transition group-focus-within:border-tdf-blue">
            <canvas
                ref={canvasRef}
                width={800}
                height={400} // High internal resolution for crisp lines
                className="w-full h-48 sm:h-64 touch-none cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseUp={stopDrawing}
                onMouseMove={draw}
                onMouseOut={stopDrawing}
                onTouchStart={startDrawing}
                onTouchEnd={stopDrawing}
                onTouchMove={draw}
            />
            {label && <p className="absolute bottom-6 left-0 right-0 text-center text-slate-200 font-black text-3xl md:text-5xl pointer-events-none select-none z-0">{label}</p>}
            
            <button 
                type="button" 
                onClick={clear} 
                className="absolute top-4 right-4 bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-500 p-3 rounded-xl transition shadow-sm z-10"
                title="Borrar Firma"
            >
                <Eraser size={20}/>
            </button>
        </div>
    );
}
