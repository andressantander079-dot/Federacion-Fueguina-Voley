import React from 'react';
import Link from 'next/link';

interface EmptyStateProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    actionLabel?: string;
    actionHref?: string;
    onAction?: () => void;
    className?: string;
}

export default function EmptyState({
    icon,
    title,
    description,
    actionLabel,
    actionHref,
    onAction,
    className = ''
}: EmptyStateProps) {
    return (
        <div className={`w-full bg-white dark:bg-zinc-900 rounded-3xl p-12 text-center shadow-lg border border-slate-200 dark:border-white/5 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500 ${className}`}>
            <div className="w-24 h-24 mb-6 text-slate-300 dark:text-zinc-700 bg-slate-50 dark:bg-black/20 rounded-full flex items-center justify-center shadow-inner">
                {/* Clone element to force sizes if needed, or rely on passed sizes */}
                {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { className: 'w-12 h-12 text-tdf-orange/80 dark:text-tdf-orange/60' }) : icon}
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white mb-3">
                {title}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8 font-medium leading-relaxed">
                {description}
            </p>

            {/* Action Button: Can be a Link or an onClick Button */}
            {actionLabel && (
                actionHref ? (
                    <Link
                        href={actionHref}
                        className="px-8 py-4 bg-tdf-orange hover:bg-tdf-orange-hover text-white rounded-xl font-bold transition-all shadow-xl hover:shadow-orange-500/20 transform hover:-translate-y-1 flex items-center gap-2"
                    >
                        {actionLabel}
                    </Link>
                ) : onAction ? (
                    <button
                        onClick={onAction}
                        className="px-8 py-4 bg-tdf-orange hover:bg-tdf-orange-hover text-white rounded-xl font-bold transition-all shadow-xl hover:shadow-orange-500/20 transform hover:-translate-y-1 flex items-center gap-2"
                    >
                        {actionLabel}
                    </button>
                ) : null
            )}
        </div>
    );
}
