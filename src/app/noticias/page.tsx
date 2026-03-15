import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import NewsFeed from '@/components/home/NewsFeed'

export default function NoticiasPage() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-black font-sans text-slate-800 dark:text-slate-100 flex flex-col">
            <Navbar />
            <main className="flex-grow pt-28 px-6 max-w-7xl mx-auto w-full">
                <header className="mb-12 text-center">
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4">
                        Noticias <span className="text-tdf-orange">FVF</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto">
                        Toda la actualidad del voley fueguino, resultados, convocatorias y más.
                    </p>
                </header>
                <NewsFeed />
            </main>
            <Footer />
        </div>
    )
}
