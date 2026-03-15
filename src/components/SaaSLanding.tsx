import React from 'react';
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
  Globe
} from 'lucide-react';
import { motion } from 'motion/react';

interface SaaSLandingProps {
  onStart: () => void;
  onLogin: () => void;
}

export default function SaaSLanding({ onStart, onLogin }: SaaSLandingProps) {
  return (
    <div className="min-h-screen bg-white font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-600">
            <ShieldCheck className="size-8" />
            <span className="text-xl font-black tracking-tighter text-slate-900 uppercase">EventMaster</span>
          </div>
          <div className="flex items-center gap-6">
            <button 
              onClick={onLogin}
              className="text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors"
            >
              Entrar
            </button>
            <button 
              onClick={onStart}
              className="px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-full hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
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
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-widest mb-6">
              <Zap className="size-3 fill-current" />
              A plataforma definitiva para organizadores
            </span>
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter mb-8 leading-[0.9]">
              Gerencie seus eventos <br />
              <span className="text-blue-600">como um profissional.</span>
            </h1>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
              Inscrições, pagamentos, aprovações e comunicação via WhatsApp em um só lugar. 
              Escalável, seguro e pronto para qualquer tamanho de evento.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={onStart}
                className="w-full sm:w-auto px-10 py-5 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-2xl shadow-blue-200 flex items-center justify-center gap-3 group"
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

          {/* Mockup Preview */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="mt-20 relative"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10" />
            <div className="bg-slate-900 rounded-[2rem] p-4 shadow-2xl border border-slate-800 max-w-5xl mx-auto overflow-hidden">
              <div className="bg-slate-800 rounded-xl overflow-hidden aspect-video flex items-center justify-center">
                 <div className="text-slate-500 flex flex-col items-center gap-4">
                    <BarChart3 className="size-20 opacity-20" />
                    <span className="font-bold uppercase tracking-widest text-xs">Dashboard Preview</span>
                 </div>
              </div>
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
            />
            <FeatureCard 
              icon={<DollarSign className="size-6" />}
              title="Financeiro Integrado"
              description="Controle de pagamentos via PIX, upload de comprovantes e fluxo de caixa em tempo real."
            />
            <FeatureCard 
              icon={<MessageCircle className="size-6" />}
              title="WhatsApp & E-mail"
              description="Notificações automáticas para confirmações, lembretes e avisos importantes."
            />
            <FeatureCard 
              icon={<Smartphone className="size-6" />}
              title="Multi-dispositivo"
              description="Painel responsivo que funciona perfeitamente no celular, tablet ou computador."
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
              <span className="text-blue-600">não na burocracia.</span>
            </h2>
            <div className="space-y-6">
              <BenefitItem text="Isolamento total de dados por organização" />
              <BenefitItem text="Templates de mensagens personalizáveis" />
              <BenefitItem text="Logs de atividades para auditoria completa" />
              <BenefitItem text="Relatórios de custos e vendas extras" />
              <BenefitItem text="Sistema de backup de configurações" />
            </div>
          </div>
          <div className="bg-blue-600 rounded-[3rem] p-12 text-white relative overflow-hidden">
            <Globe className="absolute -bottom-20 -right-20 size-80 opacity-10" />
            <div className="relative z-10">
              <div className="bg-white/20 size-16 rounded-2xl backdrop-blur-md flex items-center justify-center mb-8">
                <Smartphone className="size-8" />
              </div>
              <h3 className="text-3xl font-black mb-4">Pronto para escalar</h3>
              <p className="text-blue-100 text-lg leading-relaxed mb-8">
                Nossa arquitetura SaaS permite que você gerencie múltiplos eventos simultaneamente sem perder o controle.
              </p>
              <button 
                onClick={onStart}
                className="px-8 py-4 bg-white text-blue-600 font-black rounded-2xl hover:bg-blue-50 transition-all"
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
            <ShieldCheck className="size-6" />
            <span className="text-sm font-bold tracking-tighter uppercase">EventMaster &copy; 2026</span>
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

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-100 transition-all group">
      <div className="bg-slate-50 text-slate-600 size-14 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
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
