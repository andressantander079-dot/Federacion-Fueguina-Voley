// src/components/SponsorsBanner.tsx
'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function SponsorsBanner() {
  const [sponsors, setSponsors] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('sponsors').select('*').eq('active', true);
      if (data) setSponsors(data);
    };
    fetch();
  }, []);

  if (sponsors.length === 0) return null;

  return (
    <div className="w-full bg-slate-50 border-y border-slate-200 py-10 my-10">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">
            Acompañan al Voley
        </p>
        <div className="flex flex-wrap justify-center items-center gap-12 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
            {sponsors.map((s: any) => (
                <img 
                  key={s.id} 
                  src={s.logo_url} 
                  alt={s.name} 
                  title={s.name}
                  className="h-12 md:h-16 object-contain mix-blend-multiply hover:scale-105 transition duration-300"
                />
            ))}
        </div>
      </div>
    </div>
  );
}