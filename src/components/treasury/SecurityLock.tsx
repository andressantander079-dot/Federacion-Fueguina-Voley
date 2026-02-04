'use client'

import React, { useState, useEffect } from 'react'
import { Lock, Delete, ArrowRight, ShieldCheck } from 'lucide-react'

interface SecurityLockProps {
    onUnlock: () => void
}

export default function SecurityLock({ onUnlock }: SecurityLockProps) {
    const [pin, setPin] = useState('')
    const [error, setError] = useState(false)
    const [shake, setShake] = useState(false)

    // Master PIN hardcoded as per requirements
    const MASTER_PIN = '0258'

    useEffect(() => {
        if (pin.length === 4) {
            handleVerify()
        }
    }, [pin])

    const handleVerify = () => {
        if (pin === MASTER_PIN) {
            setError(false)
            onUnlock()
        } else {
            setError(true)
            setShake(true)
            setTimeout(() => {
                setPin('')
                setShake(false)
                setError(false)
            }, 600)
        }
    }

    const handleNumberClick = (num: number) => {
        if (pin.length < 4) {
            setPin(prev => prev + num)
        }
    }

    const handleDelete = () => {
        setPin(prev => prev.slice(0, -1))
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/95 backdrop-blur-sm animate-in fade-in duration-500">
            <div className={`w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-zinc-800 ${shake ? 'animate-shake' : ''}`}>

                {/* Header */}
                <div className="p-8 pb-4 text-center">
                    <div className="mx-auto w-16 h-16 bg-tdf-blue/10 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-6 text-tdf-blue dark:text-blue-400">
                        {pin.length === 4 && !error ? <ShieldCheck className="w-8 h-8 animate-bounce" /> : <Lock className="w-8 h-8" />}
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Acceso Restringido</h2>
                    <p className="text-slate-500 text-sm">Ingrese el PIN de Seguridad para acceder al módulo de Tesorería.</p>
                </div>

                {/* PIN Display */}
                <div className="flex justify-center gap-4 mb-4">
                    {[0, 1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className={`w-4 h-4 rounded-full transition-all duration-300 ${pin.length > i
                                ? error ? 'bg-red-500 scale-110' : 'bg-tdf-blue dark:bg-blue-500 scale-110'
                                : 'bg-gray-200 dark:bg-zinc-700'
                                }`}
                        />
                    ))}
                </div>

                {/* Error Message */}
                <div className="h-6 text-center">
                    {error && <span className="text-red-500 text-xs font-bold animate-pulse">PIN INCORRECTO</span>}
                </div>

                {/* Keypad */}
                <div className="p-8 pt-4 grid grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <button
                            key={num}
                            onClick={() => handleNumberClick(num)}
                            className="h-16 rounded-2xl bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 text-xl font-bold text-slate-700 dark:text-gray-200 transition-colors active:scale-95 flex items-center justify-center"
                        >
                            {num}
                        </button>
                    ))}

                    <div className="h-16 flex items-center justify-center text-slate-300 pointer-events-none">
                        {/* Empty Space */}
                    </div>

                    <button
                        onClick={() => handleNumberClick(0)}
                        className="h-16 rounded-2xl bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 text-xl font-bold text-slate-700 dark:text-gray-200 transition-colors active:scale-95 flex items-center justify-center"
                    >
                        0
                    </button>

                    <button
                        onClick={handleDelete}
                        className="h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors active:scale-95 flex items-center justify-center"
                    >
                        <Delete className="w-6 h-6" />
                    </button>
                </div>
            </div>

            <style jsx global>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                .animate-shake {
                    animation: shake 0.4s ease-in-out;
                }
            `}</style>
        </div>
    )
}
