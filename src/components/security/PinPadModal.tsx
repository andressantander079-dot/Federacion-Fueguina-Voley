'use client';

import React, { useState, useEffect } from 'react';
import { X, Delete, Lock, Unlock, CheckCircle2, AlertCircle } from 'lucide-react';

interface PinPadModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    mode: 'set' | 'access' | 'remove';
    onSuccess: (pin: string) => void;
    squadName: string;
    currentPin?: string;
    onSwitchMode?: (newMode: 'set' | 'access' | 'remove') => void;
}

export default function PinPadModal({ isOpen, onClose, title, mode, onSuccess, squadName, currentPin, onSwitchMode }: PinPadModalProps) {
    const [pin, setPin] = useState('');
    const [step, setStep] = useState(1); // 1 = first entry, 2 = confirmation
    const [tempPin, setTempPin] = useState('');
    const [error, setError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setPin('');
            setStep(1);
            setTempPin('');
            setError('');
            setIsSuccess(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleNumberClick = (num: string) => {
        if (pin.length < 4) {
            setError('');
            setPin(prev => prev + num);
        }
    };

    const handleDelete = () => {
        setPin(prev => prev.slice(0, -1));
    };

    const handleSubmit = () => {
        if (pin.length !== 4) {
            setError('Ingresa 4 dígitos');
            return;
        }

        if (mode === 'set') {
            if (step === 1) {
                setTempPin(pin);
                setPin('');
                setStep(2);
            } else {
                if (pin === tempPin) {
                    executeSuccess();
                } else {
                    setError('Los PINs no coinciden');
                    setPin('');
                    setStep(1);
                }
            }
        } else if (mode === 'access') {
            if (pin === currentPin) {
                executeSuccess();
            } else {
                setError('PIN Incorrecto');
                setPin('');
            }
        } else if (mode === 'remove') {
            // User must enter current PIN twice to confirm removal
            if (pin === currentPin) {
                if (step === 1) {
                    setStep(2);
                    setPin('');
                } else {
                    executeSuccess();
                }
            } else {
                setError('PIN Incorrecto');
                setPin('');
                setStep(1);
            }
        }
    };

    const executeSuccess = () => {
        setIsSuccess(true);
        setTimeout(() => {
            onSuccess(mode === 'remove' ? '' : (mode === 'set' ? tempPin : pin));
            onClose();
        }, 1000);
    };

    const getInstruction = () => {
        if (mode === 'set') {
            return step === 1 ? 'Elige tu nuevo PIN de 4 dígitos' : 'Confirma tu nuevo PIN';
        }
        if (mode === 'access') {
            return 'Ingresa el PIN para ver jugadoras';
        }
        if (mode === 'remove') {
            return step === 1 ? 'Ingresa el PIN actual' : 'Confirma ingresando el PIN actual nuevamente';
        }
        return '';
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-zinc-900 border border-white/10 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">

                {/* Background Glow */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-tdf-orange/20 blur-[80px] rounded-full" />

                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-full transition-colors"
                >
                    <X size={24} />
                </button>

                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${isSuccess ? 'bg-green-500 text-white' : 'bg-tdf-orange text-white'}`}>
                            {isSuccess ? <CheckCircle2 size={32} /> : (mode === 'access' ? <Lock size={32} /> : <Unlock size={32} />)}
                        </div>
                    </div>
                    <h2 className="text-2xl font-black text-white mb-1 uppercase tracking-tight">{title}</h2>
                    <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">{squadName}</p>
                </div>

                <div className="space-y-8">
                    {/* Status / Instruction */}
                    <div className="text-center">
                        <p className={`text-sm font-medium h-5 transition-colors ${error ? 'text-red-500' : 'text-zinc-400'}`}>
                            {error ? (
                                <span className="flex items-center justify-center gap-1"><AlertCircle size={14} /> {error}</span>
                            ) : getInstruction()}
                        </p>
                    </div>

                    {/* Pin Display Wells */}
                    <div className="flex justify-center gap-4">
                        {[0, 1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className={`w-12 h-16 rounded-2xl border-2 flex items-center justify-center transition-all duration-200 ${pin.length > i
                                    ? 'border-tdf-orange bg-tdf-orange/10 scale-105'
                                    : 'border-white/5 bg-white/5'
                                    }`}
                            >
                                {pin.length > i && (
                                    <div className="w-3 h-3 bg-white rounded-full animate-in zoom-in duration-200" />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Numeric Keypad */}
                    <div className="grid grid-cols-3 gap-3">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                            <button
                                key={num}
                                onClick={() => handleNumberClick(num)}
                                className="h-16 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-2xl font-bold transition-all active:scale-90 flex items-center justify-center border border-white/5"
                            >
                                {num}
                            </button>
                        ))}
                        <div />
                        <button
                            onClick={() => handleNumberClick('0')}
                            className="h-16 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-2xl font-bold transition-all active:scale-90 flex items-center justify-center border border-white/5"
                        >
                            0
                        </button>
                        <button
                            onClick={handleDelete}
                            className="h-16 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all active:scale-90 flex items-center justify-center"
                        >
                            <Delete size={24} />
                        </button>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={pin.length < 4 || isSuccess}
                        className={`w-full py-4 rounded-2xl font-black text-lg transition-all shadow-xl flex items-center justify-center gap-2 ${pin.length === 4
                                ? 'bg-tdf-orange text-white shadow-orange-900/20'
                                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                            }`}
                    >
                        {mode === 'access' ? 'DESBLOQUEAR' : 'CONFIRMAR'}
                    </button>

                    {mode === 'access' && onSwitchMode && (
                        <button
                            onClick={() => onSwitchMode('remove')}
                            className="w-full text-zinc-500 hover:text-red-500 text-xs font-bold uppercase tracking-widest transition-colors"
                        >
                            Quitar Protección
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
