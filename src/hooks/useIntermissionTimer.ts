'use client';

import { useState, useEffect, useRef } from 'react';

interface UseIntermissionTimerProps {
    intermissionStartAt: number | null;
    onTimerEnd?: () => void;
}

export function useIntermissionTimer({ intermissionStartAt, onTimerEnd }: UseIntermissionTimerProps) {
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [beepPlayed, setBeepPlayed] = useState(false);
    const [audioBlockedWarning, setAudioBlockedWarning] = useState(false);

    // Singleton AudioContext a nivel de referencia (Lazy Instantiation)
    const audioCtxRef = useRef<AudioContext | null>(null);
    // Referencia para la alarma en bucle
    const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Lógica robusta de cálculo de bloqueo (Null-Safety estricto)
    const isScoringBlocked = intermissionStartAt !== null && 
        (Date.now() - new Date(intermissionStartAt).getTime()) < 180000;

    const playBeep = () => {
        try {
            // Lazy singleton initialization
            let ctx = audioCtxRef.current;
            if (!ctx) {
                const AudioContextClass = typeof window !== 'undefined' ? (window.AudioContext || (window as any).webkitAudioContext) : null;
                if (!AudioContextClass) {
                    setAudioBlockedWarning(true);
                    return;
                }
                ctx = new AudioContextClass();
                audioCtxRef.current = ctx;
            }

            // Resumir si el contexto está suspendido (requerimiento de navegadores modernos)
            if (ctx.state === 'suspended') {
                ctx.resume();
            }

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start();
            osc.stop(ctx.currentTime + 0.35);
            setAudioBlockedWarning(false);
        } catch (err) {
            console.warn("No se pudo reproducir la alerta sonora (permisos de usuario):", err);
            setAudioBlockedWarning(true);
        }
    };

    const clearAlarm = () => {
        if (alarmIntervalRef.current) {
            clearInterval(alarmIntervalRef.current);
            alarmIntervalRef.current = null;
        }
    };

    useEffect(() => {
        if (intermissionStartAt !== null) {
            const startMs = new Date(intermissionStartAt).getTime();
            const elapsed = Math.floor((Date.now() - startMs) / 1000);
            const remaining = Math.max(0, 180 - elapsed);
            setTimeLeft(remaining);
            
            if (remaining > 0) {
                setBeepPlayed(false);
                setAudioBlockedWarning(false);
                clearAlarm();
            }
        } else {
            setTimeLeft(0);
            setBeepPlayed(false);
            setAudioBlockedWarning(false);
            clearAlarm();
        }
    }, [intermissionStartAt]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        
        if (intermissionStartAt !== null) {
            const startMs = new Date(intermissionStartAt).getTime();
            
            interval = setInterval(() => {
                const elapsed = Math.floor((Date.now() - startMs) / 1000);
                const remaining = Math.max(0, 180 - elapsed);
                
                setTimeLeft(remaining);

                if (remaining === 0) {
                    setBeepPlayed(true);
                    
                    // Iniciar la alarma en bucle (pitidos repetidos cada 2 segundos)
                    if (!alarmIntervalRef.current) {
                        playBeep(); // Pitido inicial inmediato
                        alarmIntervalRef.current = setInterval(() => {
                            playBeep();
                        }, 2000);
                        
                        if (onTimerEnd) {
                            onTimerEnd();
                        }
                    }
                }
            }, 500);
        }

        return () => {
            if (interval) clearInterval(interval);
            clearAlarm();
        };
    }, [intermissionStartAt, onTimerEnd]);

    return {
        timeLeft,
        isScoringBlocked,
        beepPlayed,
        audioBlockedWarning,
        playBeep,
        clearAlarm
    };
}
