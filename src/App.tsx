import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { Home, ChevronLeft, ChevronRight, Zap, ArrowRight, Newspaper, ExternalLink, Calendar, RefreshCw, Lock, Moon, Sun, Loader2 } from 'lucide-react';

export interface Source {
  name: string;
  url: string;
}

export interface Article {
  id: number;
  title: string;
  iconName: string;
  category: string;
  theme?: string;
  color?: string;
  bgColor?: string;
  summary: string;
  impact: string;
  sources: Source[];
}

export default function App() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchArticles = async () => {
    try {
      const res = await fetch('/api/articles');
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setArticles(data);
          // Sauvegarde locale en cache au cas où
          localStorage.setItem('pm_radar_articles', JSON.stringify(data));
          return;
        }
      }
      
      // Fallback si l'API est vide ou échoue
      const storedArticles = localStorage.getItem('pm_radar_articles');
      if (storedArticles) {
        setArticles(JSON.parse(storedArticles));
      }
    } catch (e) {
      console.error(e);
      // Fallback en cas d'erreur réseau
      const storedArticles = localStorage.getItem('pm_radar_articles');
      if (storedArticles) {
        setArticles(JSON.parse(storedArticles));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check if URL has ?admin=true
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === 'true') {
      setIsAdmin(true);
    }
    
    fetchArticles();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    setCurrentDate(`Édition du ${yesterday.toLocaleDateString('fr-CA', options)}`);
  }, []);

  const getThemeClasses = (article: Article) => {
    const themeMap: Record<string, string> = {
      red: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
      blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
      green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
      yellow: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
      purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
      stone: 'bg-stone-50 text-stone-600 dark:bg-stone-900/30 dark:text-stone-400',
    };
    if (article.theme && themeMap[article.theme]) return themeMap[article.theme];
    return `${article.bgColor || 'bg-stone-50'} ${article.color || 'text-stone-600'} dark:bg-stone-800 dark:text-stone-300`;
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleGenerate = async () => {
    const password = prompt("Veuillez entrer le mot de passe administrateur (CRON_SECRET) :");
    if (!password) return;

    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/cron', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${password}`
        }
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        if (data.articles) {
          setArticles(data.articles);
        } else {
          await fetchArticles();
        }
        setCurrentPage(0);
      } else {
        setErrorMsg(`Erreur lors de la génération: ${data.error || 'Erreur inconnue'}`);
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(`Erreur de connexion: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const navigateTo = (page: number) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentPage(page);
      window.scrollTo(0, 0);
      setIsTransitioning(false);
    }, 300);
  };

  const handlePrev = () => {
    if (currentPage > 0) navigateTo(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < articles.length) navigateTo(currentPage + 1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fcfcfc] dark:bg-slate-950">
        <div className="animate-spin text-yellow-500"><RefreshCw size={32} /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-50 flex flex-col selection:bg-yellow-200 selection:text-slate-900 transition-colors duration-300">
      
      {/* FULL SCREEN LOADING OVERLAY */}
      {isGenerating && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center text-white p-4 animate-in fade-in duration-300">
          <Loader2 size={64} className="animate-spin text-yellow-500 mb-8" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-center">Génération IA en cours...</h2>
          <p className="text-slate-300 text-lg md:text-xl max-w-2xl text-center leading-relaxed">
            Notre agent IA parcourt actuellement le web pour analyser les dernières actualités du secteur de la quincaillerie. 
            <br/><br/>
            <span className="text-yellow-400 font-medium">Veuillez patienter environ 30 à 60 secondes.</span>
          </p>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => navigateTo(0)}
          >
            <div className="bg-yellow-400 p-2 rounded-xl text-slate-900 group-hover:bg-yellow-300 transition-colors shadow-sm">
              <Newspaper size={20} className="font-bold" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-extrabold text-lg tracking-tight leading-none text-slate-900 dark:text-white">LE RADAR</span>
                <span className="font-black text-lg tracking-tighter leading-none text-[#FFD100] drop-shadow-sm">PATRICK MORIN</span>
              </div>
              <div className="flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                <Calendar size={12} />
                {currentDate}
              </div>
            </div>
            <h1 className="font-extrabold text-lg tracking-tight sm:hidden flex items-center gap-1">
              RADAR <span className="text-[#FFD100] drop-shadow-sm">PM</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 transition-all duration-200 active:scale-95"
              title="Basculer le thème"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

            <button 
              onClick={handlePrev}
              disabled={currentPage === 0}
              className={`p-2 rounded-full flex items-center justify-center transition-all duration-200 ${currentPage === 0 ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 active:scale-95'}`}
            >
              <ChevronLeft size={22} />
            </button>
            
            <span className="text-xs font-semibold tracking-widest text-slate-400 dark:text-slate-500 w-16 text-center">
              {currentPage === 0 ? 'ACCUEIL' : `${currentPage} / ${articles.length}`}
            </span>

            <button 
              onClick={handleNext}
              disabled={currentPage === articles.length || articles.length === 0}
              className={`p-2 rounded-full flex items-center justify-center transition-all duration-200 ${currentPage === articles.length || articles.length === 0 ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 active:scale-95'}`}
            >
              <ChevronRight size={22} />
            </button>
            
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

            <button 
              onClick={() => navigateTo(0)}
              className="ml-1 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 transition-all duration-200 active:scale-95"
            >
              <Home size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={`flex-grow transition-opacity duration-300 ease-in-out ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
        
        {/* HOME PAGE */}
        {currentPage === 0 && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
            <div className="mb-16 text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-500 text-xs font-bold tracking-wider uppercase mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                </span>
                Édition de la Semaine
              </div>
              <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6 leading-tight">
                Veille Stratégique <br className="hidden md:block"/> & Category Management
              </h2>
              <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                Décryptage des tendances, innovations et enjeux macro-économiques impactant le secteur de la quincaillerie et de la rénovation.
              </p>
            </div>

            {articles.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm">
                <Newspaper size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">Aucun article pour le moment</h3>
                <p className="text-slate-500 dark:text-slate-500 mb-6">Générez la première édition pour commencer.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {articles.map((article) => {
                  const IconComponent = (Icons as any)[article.iconName] || Icons.Newspaper;
                  return (
                    <div 
                      key={article.id}
                      onClick={() => navigateTo(article.id)}
                      className="bg-white dark:bg-slate-900 rounded-[24px] p-6 md:p-8 border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300 ease-out cursor-pointer group flex flex-col h-full"
                    >
                      <div className="flex items-center gap-3 mb-6">
                        <div className={`p-3 rounded-2xl ${getThemeClasses(article)} group-hover:scale-110 transition-transform duration-300 ease-out`}>
                          <IconComponent size={22} strokeWidth={2.5} />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                          {article.category}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 group-hover:text-yellow-600 dark:group-hover:text-yellow-500 transition-colors leading-snug break-words hyphens-auto" style={{ wordBreak: 'break-word' }}>
                        {article.title}
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400 line-clamp-4 mb-8 flex-grow text-sm leading-relaxed whitespace-pre-wrap">
                        {article.summary}
                      </p>
                      <div className="flex items-center text-sm font-bold text-slate-900 dark:text-white mt-auto group-hover:text-yellow-600 dark:group-hover:text-yellow-500 transition-colors">
                        Lire l'analyse 
                        <ArrowRight size={16} className="ml-2 group-hover:translate-x-1.5 transition-transform duration-300" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Admin Section */}
            {isAdmin && (
              <div className="mt-24 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center">
                {errorMsg && (
                  <div className="mb-4 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium">
                    {errorMsg}
                  </div>
                )}
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Lock size={16} />
                  Admin : Générer la nouvelle édition
                </button>
              </div>
            )}
          </div>
        )}

        {/* ARTICLE PAGES */}
        {currentPage > 0 && currentPage <= articles.length && (
          <article className="max-w-3xl mx-auto px-4 sm:px-6 py-12 md:py-20">
            {(() => {
              const article = articles[currentPage - 1];
              const IconComponent = (Icons as any)[article.iconName] || Icons.Newspaper;
              return (
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
                  {/* Article Header */}
                  <div className="mb-12">
                    <div className="flex items-center gap-2 mb-6">
                      <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest ${getThemeClasses(article)}`}>
                        <IconComponent size={16} strokeWidth={2.5} />
                        {article.category}
                      </span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white leading-tight mb-6 tracking-tight break-words hyphens-auto" style={{ wordBreak: 'break-word' }}>
                      {article.title}
                    </h1>
                  </div>

                  {/* Summary Section */}
                  <div className="bg-white dark:bg-slate-900 rounded-[24px] p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-slate-100 dark:border-slate-800 mb-8">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-5 flex items-center gap-2">
                      Résumé de la News
                    </h2>
                    <div className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {article.summary}
                    </div>
                  </div>

                  {/* Impact Section - Highlighted */}
                  <div className="bg-gradient-to-br from-yellow-50 to-amber-50/50 dark:from-yellow-900/20 dark:to-amber-900/10 rounded-[24px] p-8 md:p-10 border border-yellow-100 dark:border-yellow-900/30 mb-12 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10 text-yellow-500 pointer-events-none">
                      <Zap size={120} />
                    </div>
                    <h2 className="text-xs font-bold uppercase tracking-widest text-yellow-800 dark:text-yellow-500 mb-5 flex items-center gap-2 relative z-10">
                      <Zap size={16} strokeWidth={2.5} />
                      Impact Category Manager (Action)
                    </h2>
                    <p className="text-lg font-medium text-slate-900 dark:text-white leading-relaxed relative z-10">
                      {article.impact}
                    </p>
                  </div>

                  {/* Sources Footer */}
                  <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">
                      Sources & Références
                    </h3>
                    <ul className="flex flex-wrap gap-3">
                      {article.sources.map((source, idx) => (
                        <li key={idx}>
                          <a 
                            href={source.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white px-4 py-2 rounded-xl transition-all duration-200 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow"
                          >
                            {source.name}
                            <ExternalLink size={14} className="text-slate-400 dark:text-slate-500" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Bottom Navigation */}
                  <div className="mt-20 flex justify-between items-center pt-8">
                    <button 
                      onClick={handlePrev}
                      className="flex items-center gap-2 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white font-semibold transition-colors group"
                    >
                      <div className="p-2 rounded-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm group-hover:border-slate-300 dark:group-hover:border-slate-600 transition-colors">
                        <ChevronLeft size={18} />
                      </div>
                      <span className="hidden sm:inline">{currentPage === 1 ? 'Accueil' : 'Précédent'}</span>
                    </button>
                    
                    {currentPage < articles.length && (
                      <button 
                        onClick={handleNext}
                        className="flex items-center gap-2 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white font-semibold transition-colors group"
                      >
                        <span className="hidden sm:inline">Suivant</span>
                        <div className="p-2 rounded-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm group-hover:border-slate-300 dark:group-hover:border-slate-600 transition-colors">
                          <ChevronRight size={18} />
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </article>
        )}
      </main>
    </div>
  );
}
