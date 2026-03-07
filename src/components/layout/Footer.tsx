'use client';

import { useSettings } from '@/hooks/useSettings';
import { Mail, Phone, MapPin, Instagram, Facebook } from 'lucide-react';

export default function Footer() {
    const { settings } = useSettings();

    return (
        <footer className="mt-20 border-t border-slate-200 dark:border-white/10 pt-16 pb-8 bg-slate-50 dark:bg-zinc-950">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12 text-center md:text-left">

                    {/* INFO */}
                    <div className="md:col-span-2">
                        <h4 className="text-2xl font-black text-slate-900 dark:text-white mb-4 uppercase tracking-tight flex items-center justify-center md:justify-start gap-3">
                            {settings?.logo_url && <img src={settings.logo_url} className="w-8 h-8 object-contain" alt="Logo" />}
                            Federación de Voley Ushuaia
                        </h4>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 max-w-sm mx-auto md:mx-0">
                            Promoviendo el deporte, la integración y la competencia sana en el fin del mundo.
                        </p>

                        {/* REDES */}
                        <div className="flex justify-center md:justify-start gap-4">
                            {settings?.contact_instagram && (
                                <a href={settings.contact_instagram} target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-200 dark:bg-white/10 rounded-full text-slate-600 hover:bg-tdf-blue hover:text-white transition">
                                    <Instagram size={18} />
                                </a>
                            )}
                            {/* Placeholder for future Facebook add */}
                            {/* <a href="#" className="p-2 bg-slate-200 dark:bg-white/10 rounded-full text-slate-600 hover:bg-tdf-blue hover:text-white transition"><Facebook size={18} /></a> */}
                        </div>
                    </div>

                    {/* CONTACTO */}
                    <div className="md:col-span-2 flex flex-col items-center md:items-end gap-3 md:pl-20">
                        <h5 className="font-bold text-slate-900 dark:text-white uppercase tracking-widest text-xs mb-2">Contacto</h5>

                        {settings?.contact_address && (
                            <div className="flex items-center gap-2 text-slate-500 text-sm">
                                <span>{settings.contact_address}</span>
                                <MapPin size={16} className="text-tdf-orange" />
                            </div>
                        )}

                        {settings?.contact_email && (
                            <a href={`mailto:${settings.contact_email}`} className="flex items-center gap-2 text-slate-500 text-sm hover:text-tdf-blue transition">
                                <span>{settings.contact_email}</span>
                                <Mail size={16} className="text-tdf-orange" />
                            </a>
                        )}

                        {settings?.contact_phone && (
                            <div className="flex items-center gap-2 text-slate-500 text-sm">
                                <span>{settings.contact_phone}</span>
                                <Phone size={16} className="text-tdf-orange" />
                            </div>
                        )}
                    </div>

                </div>

                <div className="border-t border-slate-200 dark:border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center md:text-left">
                        &copy; {new Date().getFullYear()} FFV • Todos los derechos reservados
                    </div>
                    <div className="text-[10px] text-slate-300 font-medium">
                        Hecho con pasión en Tierra del Fuego
                    </div>
                </div>
            </div>
        </footer>
    );
}
