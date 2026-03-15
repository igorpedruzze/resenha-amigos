import React, { useState, useEffect } from 'react';
import { 
  Users, 
  DollarSign, 
  MessageCircle, 
  Smartphone, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck,
  Zap,
  BarChart3,
  Globe,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SaaSLandingProps {
  onStart: () => void;
  onLogin: () => void;
}

export default function SaaSLanding({ onStart, onLogin }: SaaSLandingProps) {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [banners, setBanners] = useState<{id: number, url: string}[]>([]);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/public/settings')
      .then(res => res.json())
      .then(data => {
        setSettings(data.settings);
        setBanners(data.banners);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching settings:', err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (banners.length > 1) {
      const timer = setInterval(() => {
        setCurrentBanner(prev => (prev + 1) % banners.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [banners]);

  const primaryColor = settings.primary_color || '#059669';
  const platformName = settings.platform_name || 'EventMaster';
  const heroTitle = settings.hero_title || 'Gerencie seus eventos como um profissional.';
  const heroSubtitle = settings.hero_subtitle || 'Inscrições, pagamentos, aprovações e comunicação via WhatsApp em um só lugar. Escalável, seguro e pronto para qualquer tamanho de evento.';
  const footerText = settings.footer_text || `© 2026 ${platformName}. Todos os direitos reservados.`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-emerald-100 selection:text-emerald-900">
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --primary-color: ${primaryColor};
        }
        .bg-primary { background-color: var(--primary-color); }
        .text-primary { color: var(--primary-color); }
        .border-primary { border-color: var(--primary-color); }
        .focus-ring-primary:focus { --tw-ring-color: var(--primary-color); }
      `}} />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            {settings.platform_logo ? (
              <img src={settings.platform_logo} alt={platformName} className="h-10 object-contain" />
            ) : (
              <>
                <ShieldCheck className="size-8" />
                <span className="text-xl font-black tracking-tighter text-slate-900 uppercase">{platformName}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-6">
            <button 
              onClick={onLogin}
              className="text-sm font-bold text-slate-600 hover:text-primary transition-colors"
            >
              Entrar
            </button>
            <button 
              onClick={onStart}
              style={{ backgroundColor: primaryColor }}
              className="px-6 py-2.5 text-white text-sm font-bold rounded-full hover:opacity-90 transition-all shadow-lg"
            >
              Começar Agora
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-widest mb-6">
              <Zap className="size-3 fill-current text-primary" />
              A plataforma definitiva para organizadores
            </span>
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter mb-8 leading-[0.9] whitespace-pre-line">
              {heroTitle}
            </h1>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
              {heroSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={onStart}
                style={{ backgroundColor: primaryColor }}
                className="w-full sm:w-auto px-10 py-5 text-white font-black rounded-2xl hover:opacity-90 transition-all shadow-2xl flex items-center justify-center gap-3 group"
              >
                Criar Minha Organização
                <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={onLogin}
                className="w-full sm:w-auto px-10 py-5 bg-slate-100 text-slate-900 font-black rounded-2xl hover:bg-slate-200 transition-all"
              >
                Acessar Painel
              </button>
            </div>
          </motion.div>

          {/* Banner Carousel */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="mt-20 relative max-w-5xl mx-auto"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10 pointer-events-none" />
            <div className="bg-slate-900 rounded-[2rem] p-4 shadow-2xl border border-slate-800 overflow-hidden relative aspect-video">
              <AnimatePresence mode="wait">
                {banners.length > 0 ? (
                  <motion.img
                    key={banners[currentBanner].id}
                    src={banners[currentBanner].url}
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <div className="absolute inset-0 bg-slate-800 rounded-xl flex items-center justify-center">
                    <div className="text-slate-500 flex flex-col items-center gap-4">
                      <BarChart3 className="size-20 opacity-20" />
                      <span className="font-bold uppercase tracking-widest text-xs">Dashboard Preview</span>
                    </div>
                  </div>
                )}
              </AnimatePresence>

              {banners.length > 1 && (
                <>
                  <button 
                    onClick={() => setCurrentBanner(prev => (prev - 1 + banners.length) % banners.length)}
                    className="absolute left-8 top-1/2 -translate-y-1/2 z-20 p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors"
                  >
                    <ChevronLeft className="size-6" />
                  </button>
                  <button 
                    onClick={() => setCurrentBanner(prev => (prev + 1) % banners.length)}
                    className="absolute right-8 top-1/2 -translate-y-1/2 z-20 p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors"
                  >
                    <ChevronRight className="size-6" />
                  </button>
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                    {banners.map((_, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setCurrentBanner(idx)}
                        className={`size-2 rounded-full transition-all ${idx === currentBanner ? 'bg-white w-6' : 'bg-white/40'}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-4">Tudo o que você precisa.</h2>
            <p className="text-slate-500 font-medium">Recursos pensados para facilitar a vida do organizador e do convidado.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard 
              icon={<Users className="size-6" />}
              title="Gestão de Convidados"
              description="Aprovação manual ou automática, controle de acompanhantes e lista de espera inteligente."
              primaryColor={primaryColor}
            />
            <FeatureCard 
              icon={<DollarSign className="size-6" />}
              title="Financeiro Integrado"
              description="Controle de pagamentos via PIX, upload de comprovantes e fluxo de caixa em tempo real."
              primaryColor={primaryColor}
            />
            <FeatureCard 
              icon={<MessageCircle className="size-6" />}
              title="WhatsApp & E-mail"
              description="Notificações automáticas para confirmações, lembretes e avisos importantes."
              primaryColor={primaryColor}
            />
            <FeatureCard 
              icon={<Smartphone className="size-6" />}
              title="Multi-dispositivo"
              description="Painel responsivo que funciona perfeitamente no celular, tablet ou computador."
              primaryColor={primaryColor}
            />
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter mb-8 leading-none">
              Foco na experiência, <br />
              <span className="text-primary">não na burocracia.</span>
            </h2>
            <div className="space-y-6">
              <BenefitItem text="Isolamento total de dados por organização" />
              <BenefitItem text="Templates de mensagens personalizáveis" />
              <BenefitItem text="Logs de atividades para auditoria completa" />
              <BenefitItem text="Relatórios de custos e vendas extras" />
              <BenefitItem text="Sistema de backup de configurações" />
            </div>
          </div>
          <div style={{ backgroundColor: primaryColor }} className="rounded-[3rem] p-12 text-white relative overflow-hidden">
            <Globe className="absolute -bottom-20 -right-20 size-80 opacity-10" />
            <div className="relative z-10">
              <div className="bg-white/20 size-16 rounded-2xl backdrop-blur-md flex items-center justify-center mb-8">
                <Smartphone className="size-8" />
              </div>
              <h3 className="text-3xl font-black mb-4">Pronto para escalar</h3>
              <p className="text-white/80 text-lg leading-relaxed mb-8">
                Nossa arquitetura SaaS permite que você gerencie múltiplos eventos simultaneamente sem perder o controle.
              </p>
              <button 
                onClick={onStart}
                className="px-8 py-4 bg-white text-slate-900 font-black rounded-2xl hover:bg-slate-50 transition-all"
              >
                Experimentar Grátis
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-slate-400">
            {settings.platform_logo ? (
              <img src={settings.platform_logo} alt={platformName} className="h-6 object-contain grayscale opacity-50" />
            ) : (
              <ShieldCheck className="size-6" />
            )}
            <span className="text-sm font-bold tracking-tighter uppercase">{footerText}</span>
          </div>
          <div className="flex items-center gap-8 text-sm font-bold text-slate-400">
            <a href="#" className="hover:text-slate-600">Termos</a>
            <a href="#" className="hover:text-slate-600">Privacidade</a>
            <a href="#" className="hover:text-slate-600">Suporte</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description, primaryColor }: { icon: React.ReactNode, title: string, description: string, primaryColor: string }) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="bg-white p-8 rounded-[2.5rem] border border-slate-100 hover:shadow-2xl transition-all group"
      style={{ borderColor: isHovered ? primaryColor + '40' : undefined }}
    >
      <div 
        className="bg-slate-50 text-slate-600 size-14 rounded-2xl flex items-center justify-center mb-6 transition-colors"
        style={{ 
          backgroundColor: isHovered ? primaryColor : undefined,
          color: isHovered ? 'white' : undefined
        }}
      >
        {icon}
      </div>
      <h3 className="text-xl font-black text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function BenefitItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="bg-emerald-100 text-emerald-600 p-1 rounded-full">
        <CheckCircle2 className="size-4" />
      </div>
      <span className="font-bold text-slate-700">{text}</span>
    </div>
  );
}
