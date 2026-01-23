import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SponsorsBanner() {
    const [sponsors, setSponsors] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        async function fetchSponsors() {
            try {
                const { data } = await supabase
                    .from('sponsors')
                    .select('*')
                    .eq('active', true)
                    .order('display_order', { ascending: true })

                if (data) setSponsors(data)
            } catch (error) {
                console.error("Error loading sponsors:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchSponsors()
    }, [])

    if (sponsors.length === 0 && !loading) return null

    return (
        <section className="w-full bg-white dark:bg-zinc-950 py-24 border-y border-gray-100 dark:border-white/5">
            <div className="max-w-7xl mx-auto px-4 text-center mb-12">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">
                    Nos Acompañan
                </h3>
                <div className="w-12 h-1 bg-tdf-orange mx-auto rounded-full"></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 overflow-hidden">
                {loading ? (
                    <div className="flex justify-center gap-8 animate-pulse">
                        <div className="w-32 h-16 bg-gray-100 rounded"></div>
                        <div className="w-32 h-16 bg-gray-100 rounded"></div>
                        <div className="w-32 h-16 bg-gray-100 rounded"></div>
                    </div>
                ) : (
                    <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20">
                        {sponsors.map((sponsor) => (
                            <a
                                key={sponsor.id}
                                href={sponsor.link_url || '#'}
                                target={sponsor.link_url ? "_blank" : undefined}
                                className={`relative group transition-all duration-300 transform hover:scale-110 ${!sponsor.link_url && 'pointer-events-none'}`}
                            >
                                <div className="relative w-32 h-16 md:w-48 md:h-24 filter grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500">
                                    <img
                                        src={sponsor.logo_url}
                                        alt={sponsor.name}
                                        className="object-contain w-full h-full"
                                    />
                                </div>
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </section>
    )
}
