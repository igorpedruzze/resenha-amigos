import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  Calendar, 
  DollarSign, 
  ShieldCheck, 
  Power, 
  PowerOff,
  Search,
  Activity,
  ArrowRight,
  Image as ImageIcon,
  Plus,
  Trash2,
  Upload,
  Palette,
  Type,
  Layout
} from 'lucide-react';
import { motion } from 'motion/react';

interface Plan {
  id: number;
  name: string;
  max_guests: number;
  price: number;
  status: 'ativo' | 'inativo';
}

interface Organization {
  id: number;
  nome: string;
  slug: string;
  status: 'ativo' | 'inativo';
  data_criacao: string;
  events_count: number;
  guests_count: number;
  plan_id: number | null;
  plan_name: string | null;
  plan_max_guests: number | null;
}

interface GlobalStats {
  totalOrganizations: number;
  totalEvents: number;
  totalGuests: number;
  totalRevenue: number;
}

export default function SuperAdminDashboard() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'orgs' | 'plans' | 'settings' | 'appearance'>('orgs');
  const [platformSettings, setPlatformSettings] = useState<Record<string, string>>({});
  const [banners, setBanners] = useState<{id: number, url: string, ordem: number}[]>([]);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Plan Modal State
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planForm, setPlanForm] = useState({ name: '', max_guests: 50, price: 0, status: 'ativo' as const });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [orgsRes, statsRes, plansRes, settingsRes, bannersRes] = await Promise.all([
        fetch('/api/superadmin/organizations'),
        fetch('/api/superadmin/stats'),
        fetch('/api/superadmin/plans'),
        fetch('/api/superadmin/settings'),
        fetch('/api/superadmin/banners')
      ]);
      
      if (orgsRes.ok && statsRes.ok && plansRes.ok && settingsRes.ok && bannersRes.ok) {
        const orgsData = await orgsRes.json();
        const statsData = await statsRes.json();
        const plansData = await plansRes.json();
        const settingsData = await settingsRes.json();
        const bannersData = await bannersRes.json();
        setOrgs(orgsData);
        setStats(statsData);
        setPlans(plansData);
        setPlatformSettings(settingsData);
        setBanners(bannersData);
      }
    } catch (error) {
      console.error('Error fetching superadmin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleOrgStatus = async (id: number) => {
    try {
      const res = await fetch(`/api/superadmin/organizations/${id}/toggle`, {
        method: 'POST'
      });
      if (res.ok) {
        setOrgs(orgs.map(org => {
          if (org.id === id) {
            return { ...org, status: org.status === 'ativo' ? 'inativo' : 'ativo' };
          }
          return org;
        }));
      }
    } catch (error) {
      console.error('Error toggling org status:', error);
    }
  };

  const updateOrgPlan = async (orgId: number, planId: number) => {
    try {
      const res = await fetch(`/api/superadmin/organizations/${orgId}/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error updating org plan:', error);
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingPlan ? `/api/superadmin/plans/${editingPlan.id}` : '/api/superadmin/plans';
      const method = editingPlan ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planForm)
      });
      
      if (res.ok) {
        setIsPlanModalOpen(false);
        setEditingPlan(null);
        setPlanForm({ name: '', max_guests: 50, price: 0, status: 'ativo' });
        fetchData();
      }
    } catch (error) {
      console.error('Error saving plan:', error);
    }
  };

  const deletePlan = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este plano?')) return;
    try {
      const res = await fetch(`/api/superadmin/plans/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        fetchData();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
    }
  };

  const updateSetting = async (key: string, value: string) => {
    setIsSavingSettings(true);
    try {
      const res = await fetch('/api/superadmin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      });
      if (res.ok) {
        setPlatformSettings(prev => ({ ...prev, [key]: value }));
      }
    } catch (error) {
      console.error('Error updating setting:', error);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleFileUpload = async (file: File, type: 'logo' | 'favicon' | 'banner') => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/superadmin/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        if (type === 'logo') {
          await updateSetting('platform_logo', data.url);
        } else if (type === 'favicon') {
          await updateSetting('platform_favicon', data.url);
        } else if (type === 'banner') {
          await fetch('/api/superadmin/banners', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: data.url, ordem: banners.length })
          });
          const bRes = await fetch('/api/superadmin/banners');
          const bData = await bRes.json();
          setBanners(bData);
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const deleteBanner = async (id: number) => {
    try {
      const res = await fetch(`/api/superadmin/banners/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setBanners(banners.filter(b => b.id !== id));
      }
    } catch (error) {
      console.error('Delete banner error:', error);
    }
  };

  const filteredOrgs = orgs.filter(org => 
    org.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="text-emerald-600" />
            Painel do Dono da Plataforma
          </h1>
          <p className="text-slate-500">Gerenciamento global de organizações, planos e estatísticas</p>
        </div>
      </header>

      {/* Global Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Organizações" 
          value={stats?.totalOrganizations || 0} 
          icon={<Building2 className="w-6 h-6" />}
          color="bg-blue-500"
        />
        <StatCard 
          title="Eventos Totais" 
          value={stats?.totalEvents || 0} 
          icon={<Calendar className="w-6 h-6" />}
          color="bg-purple-500"
        />
        <StatCard 
          title="Convidados Totais" 
          value={stats?.totalGuests || 0} 
          icon={<Users className="w-6 h-6" />}
          color="bg-emerald-500"
        />
        <StatCard 
          title="Receita Global" 
          value={`R$ ${(stats?.totalRevenue || 0).toLocaleString()}`} 
          icon={<DollarSign className="w-6 h-6" />}
          color="bg-amber-500"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('orgs')}
          className={`pb-4 px-2 font-medium transition-colors relative ${activeTab === 'orgs' ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Organizações
          {activeTab === 'orgs' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />}
        </button>
        <button 
          onClick={() => setActiveTab('plans')}
          className={`pb-4 px-2 font-medium transition-colors relative ${activeTab === 'plans' ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Planos de Assinatura
          {activeTab === 'plans' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />}
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`pb-4 px-2 font-medium transition-colors relative ${activeTab === 'settings' ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Configurações
          {activeTab === 'settings' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />}
        </button>
        <button 
          onClick={() => setActiveTab('appearance')}
          className={`pb-4 px-2 font-medium transition-colors relative ${activeTab === 'appearance' ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Aparência Home
          {activeTab === 'appearance' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />}
        </button>
      </div>

      {activeTab === 'orgs' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              <Activity className="text-slate-400 w-5 h-5" />
              Organizações Cadastradas
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar organização..."
                className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none w-full md:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-sm font-medium">
                <tr>
                  <th className="px-6 py-4">Organização</th>
                  <th className="px-6 py-4">Plano Atual</th>
                  <th className="px-6 py-4 text-center">Eventos</th>
                  <th className="px-6 py-4 text-center">Convidados</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrgs.map((org) => (
                  <motion.tr 
                    key={org.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                          {org.nome.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{org.nome}</div>
                          <div className="text-xs text-slate-500">slug: {org.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={org.plan_id || ''} 
                        onChange={(e) => updateOrgPlan(org.id, parseInt(e.target.value))}
                        className="text-sm border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">Sem Plano</option>
                        {plans.map(plan => (
                          <option key={plan.id} value={plan.id}>{plan.name} ({plan.max_guests} conv.)</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-center font-medium text-slate-700">
                      {org.events_count}
                    </td>
                    <td className="px-6 py-4 text-center font-medium text-slate-700">
                      <div className="flex flex-col items-center">
                        <span>{org.guests_count}</span>
                        {org.plan_max_guests && (
                          <div className="w-16 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                            <div 
                              className={`h-full ${org.guests_count >= org.plan_max_guests ? 'bg-red-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(100, (org.guests_count / org.plan_max_guests) * 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        org.status === 'ativo' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {org.status === 'ativo' ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => toggleOrgStatus(org.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          org.status === 'ativo'
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={org.status === 'ativo' ? 'Desativar' : 'Ativar'}
                      >
                        {org.status === 'ativo' ? <PowerOff className="w-5 h-5" /> : <Power className="w-5 h-5" />}
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'plans' ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-slate-800">Gestão de Planos</h2>
            <button 
              onClick={() => {
                setEditingPlan(null);
                setPlanForm({ name: '', max_guests: 50, price: 0, status: 'ativo' });
                setIsPlanModalOpen(true);
              }}
              className="bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors font-medium flex items-center gap-2"
            >
              + Novo Plano
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map(plan => (
              <div key={plan.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                    <p className="text-emerald-600 font-semibold text-2xl">R$ {plan.price.toFixed(2)}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${plan.status === 'ativo' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                    {plan.status === 'ativo' ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Limite de Convidados:</span>
                    <span className="font-bold text-slate-900">{plan.max_guests}</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <button 
                    onClick={() => {
                      setEditingPlan(plan);
                      setPlanForm({ name: plan.name, max_guests: plan.max_guests, price: plan.price, status: plan.status });
                      setIsPlanModalOpen(true);
                    }}
                    className="flex-1 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                  >
                    Editar
                  </button>
                  <button 
                    onClick={() => deletePlan(plan.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <PowerOff className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === 'settings' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-2xl">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">Configurações da Plataforma</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Número de WhatsApp de Suporte
              </label>
              <div className="flex gap-4">
                <input 
                  type="text"
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={platformSettings.support_whatsapp || ''}
                  onChange={(e) => setPlatformSettings({ ...platformSettings, support_whatsapp: e.target.value })}
                  placeholder="Ex: 28998847855"
                />
                <button 
                  onClick={() => updateSetting('support_whatsapp', platformSettings.support_whatsapp)}
                  disabled={isSavingSettings}
                  className="bg-emerald-600 text-white px-6 py-2 rounded-xl hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50"
                >
                  {isSavingSettings ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Este número será usado para os botões de "Suporte / Upgrade" no painel dos organizadores.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Text Content */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6">
              <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <Type className="text-emerald-600 w-5 h-5" />
                Conteúdo da Home
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Plataforma</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={platformSettings.platform_name || ''}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, platform_name: e.target.value })}
                    onBlur={() => updateSetting('platform_name', platformSettings.platform_name)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Título Hero</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={platformSettings.hero_title || ''}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, hero_title: e.target.value })}
                    onBlur={() => updateSetting('hero_title', platformSettings.hero_title)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Subtítulo Hero</label>
                  <textarea 
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none h-24"
                    value={platformSettings.hero_subtitle || ''}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, hero_subtitle: e.target.value })}
                    onBlur={() => updateSetting('hero_subtitle', platformSettings.hero_subtitle)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Texto do Rodapé</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={platformSettings.footer_text || ''}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, footer_text: e.target.value })}
                    onBlur={() => updateSetting('footer_text', platformSettings.footer_text)}
                  />
                </div>
              </div>
            </div>

            {/* Visual Identity */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6">
              <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <Palette className="text-emerald-600 w-5 h-5" />
                Identidade Visual
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Cor Principal</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="color"
                      className="w-12 h-12 rounded-lg cursor-pointer border-none"
                      value={platformSettings.primary_color || '#059669'}
                      onChange={(e) => setPlatformSettings({ ...platformSettings, primary_color: e.target.value })}
                      onBlur={() => updateSetting('primary_color', platformSettings.primary_color)}
                    />
                    <input 
                      type="text"
                      className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                      value={platformSettings.primary_color || '#059669'}
                      onChange={(e) => setPlatformSettings({ ...platformSettings, primary_color: e.target.value })}
                      onBlur={() => updateSetting('primary_color', platformSettings.primary_color)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Logo</label>
                    <div className="space-y-4">
                      {platformSettings.platform_logo && (
                        <img src={platformSettings.platform_logo} alt="Logo" className="h-12 object-contain bg-slate-50 p-2 rounded-lg border border-slate-100" />
                      )}
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors">
                        <Upload className="w-6 h-6 text-slate-400" />
                        <span className="text-xs text-slate-500 mt-2">Upload Logo</span>
                        <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'logo')} />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Favicon</label>
                    <div className="space-y-4">
                      {platformSettings.platform_favicon && (
                        <img src={platformSettings.platform_favicon} alt="Favicon" className="w-8 h-8 object-contain bg-slate-50 p-1 rounded-lg border border-slate-100" />
                      )}
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors">
                        <Upload className="w-6 h-6 text-slate-400" />
                        <span className="text-xs text-slate-500 mt-2">Upload Favicon</span>
                        <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'favicon')} />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Banners */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <ImageIcon className="text-emerald-600 w-5 h-5" />
                Banners do Carrossel (Home)
              </h2>
              <label className="bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors font-medium flex items-center gap-2 cursor-pointer">
                <Plus className="w-4 h-4" />
                Adicionar Banner
                <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'banner')} />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {banners.map((banner) => (
                <div key={banner.id} className="relative group aspect-video rounded-xl overflow-hidden border border-slate-200">
                  <img src={banner.url} alt="Banner" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                      onClick={() => deleteBanner(banner.id)}
                      className="p-2 bg-white text-red-600 rounded-full hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
              {banners.length === 0 && (
                <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                  <ImageIcon className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                  <p className="text-slate-400">Nenhum banner cadastrado</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Plan Modal */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
          >
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              {editingPlan ? 'Editar Plano' : 'Novo Plano'}
            </h2>
            <form onSubmit={handleSavePlan} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Plano</label>
                <input 
                  type="text" 
                  required
                  value={planForm.name}
                  onChange={e => setPlanForm({ ...planForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Ex: Plano Bronze"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Limite de Convidados</label>
                  <input 
                    type="number" 
                    required
                    value={planForm.max_guests}
                    onChange={e => setPlanForm({ ...planForm, max_guests: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Preço (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={planForm.price}
                    onChange={e => setPlanForm({ ...planForm, price: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select 
                  value={planForm.status}
                  onChange={e => setPlanForm({ ...planForm, status: e.target.value as 'ativo' | 'inativo' })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="flex-1 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium"
                >
                  Salvar
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string, value: string | number, icon: React.ReactNode, color: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
      <div className={`${color} p-3 rounded-xl text-white`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
