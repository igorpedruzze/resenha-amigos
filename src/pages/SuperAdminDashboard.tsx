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
  ArrowRight
} from 'lucide-react';
import { motion } from 'motion/react';

interface Organization {
  id: number;
  nome: string;
  slug: string;
  status: 'ativo' | 'inativo';
  data_criacao: string;
  events_count: number;
  guests_count: number;
}

interface GlobalStats {
  totalOrganizations: number;
  totalEvents: number;
  totalGuests: number;
  totalRevenue: number;
}

export default function SuperAdminDashboard() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [orgsRes, statsRes] = await Promise.all([
        fetch('/api/superadmin/organizations'),
        fetch('/api/superadmin/stats')
      ]);
      
      if (orgsRes.ok && statsRes.ok) {
        const orgsData = await orgsRes.json();
        const statsData = await statsRes.json();
        setOrgs(orgsData);
        setStats(statsData);
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
          <p className="text-slate-500">Gerenciamento global de organizações e estatísticas</p>
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

      {/* Organizations List */}
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
                <th className="px-6 py-4 text-center">Eventos</th>
                <th className="px-6 py-4 text-center">Convidados</th>
                <th className="px-6 py-4">Data de Criação</th>
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
                  <td className="px-6 py-4 text-center font-medium text-slate-700">
                    {org.events_count}
                  </td>
                  <td className="px-6 py-4 text-center font-medium text-slate-700">
                    {org.guests_count}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(org.data_criacao).toLocaleDateString('pt-BR')}
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
