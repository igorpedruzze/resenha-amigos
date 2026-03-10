/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PartyPopper, 
  Calendar, 
  MapPin, 
  User, 
  Mail, 
  Phone, 
  Instagram, 
  Lock, 
  ArrowRight, 
  LogOut, 
  Bell, 
  Wallet, 
  Clock, 
  CheckCircle, 
  TrendingUp, 
  Users, 
  Filter, 
  Plus,
  QrCode,
  Upload,
  ExternalLink,
  Globe,
  Hash,
  XCircle,
  Check,
  X,
  Eye,
  Trash2,
  Edit,
  Search,
  Settings,
  Cog,
  MessageCircle,
  MessageSquare,
  DollarSign,
  History,
  RefreshCw,
  Key,
  Info,
  Send,
  Camera,
  AlertCircle
} from 'lucide-react';

// Types
interface UserData {
  id: number;
  nome: string;
  email: string;
  whatsapp: string;
  instagram: string;
  role: 'admin' | 'guest';
  valor_total?: number;
  codigo_convidado?: string;
  status?: 'ativo' | 'pendente' | 'recusado';
  rsvp_status?: 'confirmado' | 'desistente' | 'lista_espera' | null;
  companion_count?: number;
  acompanhantes_count?: number;
  companions?: { nome: string; instagram?: string }[];
  foto_perfil?: string;
}

interface Companion {
  id: number;
  usuario_id: number;
  nome: string;
  instagram?: string;
  status: 'pendente' | 'aprovado';
}

interface EventConfig {
  nome: string;
  local: string;
  data: string;
  valor: number;
  pixKey: string;
  flyer_landing?: string;
  flyer_landing_mobile?: string;
  flyer_dashboard?: string;
  capacidade_maxima?: number;
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_pass?: string;
  email_method?: 'smtp' | 'resend';
  resend_api_key?: string;
  from_email?: string;
  system_url?: string;
  info_texto?: string;
  flyer_info?: string;
  limite_acompanhantes?: number;
  prazo_rsvp?: string;
}

interface OrganizerConfig {
  nome: string;
  email: string;
  whatsapp: string;
}

interface ConfigData {
  event: EventConfig;
  organizador: OrganizerConfig;
}

interface Payment {
  id: number;
  valor: number;
  status: 'pendente' | 'concluido' | 'rejeitado';
  data_pagamento: string;
  comprovante_url?: string;
  user_name?: string;
  user_email?: string;
  whatsapp?: string;
  observacao?: string;
}

interface BalanceData {
  totalDue: number;
  totalPaid: number;
  balance: number;
  history: Payment[];
  pixKey?: string;
  info_texto?: string;
  flyer_info?: string;
}

interface AdminStats {
  totalArrecadado: number;
  totalEsperado: number;
  confirmedCount: number;
  totalRequests: number;
  capacity: number;
  guests: (UserData & { paid: number })[];
  eventValue: number;
  pixKey?: string;
}

interface ActivityLog {
  id: number;
  data_hora: string;
  usuario_id: number | null;
  usuario_nome: string;
  acao: string;
  mensagem: string;
}

interface Template {
  tipo: 'cobranca' | 'confirmacao_pix' | 'baixa_manual';
  conteudo: string;
}

// Components
const Input = ({ label, icon: Icon, id, ...props }: any) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="text-sm font-bold text-slate-700 ml-1">{label}</label>
    <div className="relative">
      <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
      <input 
        id={id}
        className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-900 text-base"
        {...props}
      />
    </div>
  </div>
);

const ProfileAvatar = ({ user, size = 'md', onUpdate, showToast }: { 
  user: UserData, 
  size?: 'sm' | 'md' | 'lg', 
  onUpdate: (newUrl: string) => void,
  showToast: (msg: string, type?: 'success' | 'error') => void
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('A imagem deve ter no máximo 5MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      setUploading(true);
      try {
        const res = await fetch('/api/user/profile-picture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, imageBase64: reader.result })
        });
        const data = await res.json();
        if (res.ok) {
          onUpdate(data.fotoUrl);
          showToast('Foto de perfil atualizada!');
        } else {
          showToast(data.error || 'Erro ao atualizar foto', 'error');
        }
      } catch (err) {
        showToast('Erro de conexão', 'error');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const sizeClasses = {
    sm: 'size-8 md:size-10',
    md: 'size-10 md:size-12',
    lg: 'size-20 md:size-24'
  };

  const iconSize = size === 'lg' ? 'size-6' : 'size-4';

  return (
    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden border-2 border-white/20 shadow-lg relative`}>
        {uploading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
            <RefreshCw className="size-4 text-white animate-spin" />
          </div>
        )}
        <img 
          src={user.foto_perfil || `https://picsum.photos/seed/${user.id}/200`} 
          alt="Perfil" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Camera className={iconSize + " text-white"} />
        </div>
      </div>
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleFileChange} 
      />
    </div>
  );
};

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [view, setView] = useState<'signup' | 'login' | 'dashboard' | 'admin' | 'forgot-password' | 'reset-password'>('signup');
  const [adminTab, setAdminTab] = useState<'stats' | 'validation' | 'guests' | 'messages' | 'settings' | 'logs'>('stats');
  const [user, setUser] = useState<UserData | null>(null);
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [publicEvent, setPublicEvent] = useState<{
    nome: string, 
    local: string, 
    data: string, 
    valor: number, 
    flyer_landing?: string, 
    flyer_landing_mobile?: string, 
    flyer_dashboard?: string,
    limite_acompanhantes?: number,
    admin_foto?: string,
    prazo_rsvp?: string,
    capacidade_maxima?: number,
    ocupacao_atual?: number
  } | null>(null);
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);
  const [guests, setGuests] = useState<UserData[]>([]);
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [showCompanionForm, setShowCompanionForm] = useState(false);
  const [companionFormData, setCompanionFormData] = useState({ nome: '', instagram: '' });
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [companionDeleteConfirmId, setCompanionDeleteConfirmId] = useState<number | null>(null);
  const [rejectConfirmId, setRejectConfirmId] = useState<number | null>(null);
  const [rejectGuestConfirmId, setRejectGuestConfirmId] = useState<number | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [showReceiptForm, setShowReceiptForm] = useState(false);
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [editingGuest, setEditingGuest] = useState<UserData | null>(null);
  const [guestFormData, setGuestFormData] = useState({
    nome: '',
    email: '',
    whatsapp: '',
    instagram: '',
    password: '',
    valor_total: '',
    acompanhantes_count: 0,
    rsvp_status: ''
  });
  const [logSearchId, setLogSearchId] = useState('');
  const [adminPixInput, setAdminPixInput] = useState('');
  const [configForm, setConfigForm] = useState<ConfigData>({
    event: { 
      nome: '', 
      local: '', 
      data: '', 
      valor: 0, 
      pixKey: '', 
      flyer_landing: '', 
      flyer_landing_mobile: '', 
      flyer_dashboard: '', 
      capacidade_maxima: 50,
      email_method: 'smtp',
      resend_api_key: '',
      from_email: '',
      system_url: '',
      info_texto: '',
      flyer_info: '',
      limite_acompanhantes: 4
    },
    organizador: { nome: '', email: '', whatsapp: '' }
  });
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [confirmPixName, setConfirmPixName] = useState(false);
  const [showManualPayment, setShowManualPayment] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [resetPasswordForm, setResetPasswordForm] = useState({ password: '', confirm: '' });
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [manualPaymentData, setManualPaymentData] = useState({
    userId: 0,
    userName: '',
    amount: '',
    observation: '',
    totalDue: 0,
    paid: 0
  });
  const [lastActionNotification, setLastActionNotification] = useState<{
    userName: string;
    whatsapp: string;
    amount: number;
    newBalance: number;
    type: 'manual' | 'approval';
  } | null>(null);
  const [guestFilter, setGuestFilter] = useState<'ativo' | 'pendente' | 'recusado'>('ativo');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<'nome' | 'id' | 'instagram' | 'whatsapp'>('nome');
  const [updateAllValue, setUpdateAllValue] = useState('');
  const [showUpdateAllConfirm, setShowUpdateAllConfirm] = useState(false);

  const hasPendingActions = pendingPayments.length > 0 || 
    guests.some(g => g.status === 'pendente') ||
    guests.some(g => g.companions?.some((c: any) => c.status === 'pendente_aprovacao'));


  useEffect(() => {
    if (lastActionNotification) {
      const timer = setTimeout(() => setLastActionNotification(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [lastActionNotification]);

  // Form states
  const [signupData, setSignupData] = useState({
    name: '',
    email: '',
    whatsapp: '',
    instagram: '',
    password: '',
    confirmPassword: '',
    companionsCount: 0
  });
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchMe = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch (error) {
      console.error('Error fetching me:', error);
    }
  };

  const handleRSVP = async (action: 'confirm' | 'decline') => {
    if (!user) return;

    if (action === 'decline' && companions.length > 0) {
      const confirmDecline = window.confirm(
        `Atenção: Você possui ${companions.length} acompanhante(s) cadastrado(s). \n\nAo confirmar sua desistência, TODOS os seus acompanhantes serão removidos automaticamente para liberar as vagas no evento. \n\nDeseja continuar?`
      );
      if (!confirmDecline) return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/user/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, action })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || (action === 'confirm' ? 'Presença confirmada!' : 'Desistência registrada.'), 'success');
        
        // Update local state immediately for better UX
        if (user && data.status) {
          setUser({ ...user, rsvp_status: data.status });
        }
        
        fetchMe();
        fetchPublicEvent();
        if (action === 'decline') fetchCompanions(); // Refresh companions list after auto-removal
      } else {
        showToast(data.error, 'error');
      }
    } catch (error) {
      showToast('Erro ao processar RSVP', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setBalance(null);
    setAdminStats(null);
    setView('login');
    setIsSidebarOpen(false);
  };

  useEffect(() => {
    if (publicEvent) {
      // Update Title
      document.title = publicEvent.nome || 'Resenha';

      // Update Favicon
      if (publicEvent.admin_foto) {
        let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = publicEvent.admin_foto;
      }
    } else {
      document.title = 'Resenha';
    }
  }, [publicEvent]);

  useEffect(() => {
    fetchPublicEvent();
    
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check for reset token in URL
    const token = urlParams.get('token');
    if (token) {
      setResetToken(token);
      setView('reset-password');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (user) {
      setLoadingData(true);
      setDataError(null);
      const loadData = async () => {
        try {
          if (user.role === 'admin') {
            await Promise.all([fetchAdminStats(), fetchPendingPayments(), fetchGuests(), fetchConfig(), fetchTemplates(), fetchLogs()]);
          } else {
            await Promise.all([fetchBalance(), fetchCompanions(), fetchPublicEvent()]);
          }
        } catch (error) {
          console.error('Error loading data:', error);
          setDataError('Não foi possível carregar as informações do evento. Verifique sua conexão.');
        } finally {
          setLoadingData(false);
        }
      };
      loadData();
    }
  }, [user]);

  const fetchPublicEvent = async () => {
    const res = await fetch('/api/public/event');
    if (res.ok) setPublicEvent(await res.json());
  };

  const fetchConfig = async () => {
    const res = await fetch('/api/admin/config');
    if (res.ok) {
      const data = await res.json();
      setConfig(data);
      setConfigForm(data);
    }
  };

  const fetchTemplates = async () => {
    const res = await fetch('/api/admin/templates');
    if (res.ok) {
      setTemplates(await res.json());
    }
  };

  const fetchLogs = async () => {
    const res = await fetch('/api/admin/logs');
    if (res.ok) {
      setLogs(await res.json());
    }
  };

  const fetchGuests = async () => {
    const res = await fetch('/api/admin/guests');
    if (res.ok) {
      const data = await res.json();
      setGuests(data);
    }
  };

  const fetchBalance = async () => {
    if (!user) return;
    const res = await fetch(`/api/user/${user.id}/balance`);
    if (res.ok) {
      const data = await res.json();
      setBalance(data);
    }
  };

  const fetchCompanions = async () => {
    if (!user) return;
    const res = await fetch(`/api/companions/${user.id}`);
    if (res.ok) setCompanions(await res.json());
  };

  const handleAddCompanion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch('/api/companions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, ...companionFormData })
      });
      if (res.ok) {
        showToast('Acompanhante adicionado com sucesso! Aguarde a aprovação do organizador.', 'success');
        setCompanionFormData({ nome: '', instagram: '' });
        setShowCompanionForm(false);
        await Promise.all([fetchBalance(), fetchCompanions()]);
      } else {
        const data = await res.json();
        showToast(data.error || 'Erro ao adicionar acompanhante', 'error');
      }
    } catch (err) {
      showToast('Erro de conexão', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCompanion = async (companionId: number, targetUserId?: number) => {
    if (!user) return;
    const isAdmin = user.role === 'admin';
    
    setLoading(true);
    try {
      console.log(`Frontend: Removing companion ${companionId} for user ${targetUserId || user.id}`);
      const url = `/api/companions/${companionId}?userId=${targetUserId || user.id}&isAdmin=${isAdmin}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        showToast('Acompanhante removido!');
        if (isAdmin) {
          await fetchAdminStats();
        } else {
          await Promise.all([fetchBalance(), fetchCompanions()]);
        }
      } else {
        const data = await res.json();
        showToast(data.error || 'Erro ao remover acompanhante', 'error');
      }
    } catch (err: any) {
      console.error('Remove companion error:', err);
      showToast('Erro de conexão: ' + err.message, 'error');
    } finally {
      setLoading(false);
      setCompanionDeleteConfirmId(null);
    }
  };

  const handleApproveCompanion = async (companionId: number) => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/companions/${companionId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        showToast('Acompanhante aprovado!');
        await Promise.all([fetchAdminStats(), fetchGuests()]);
      } else {
        const data = await res.json();
        showToast(data.error || 'Erro ao aprovar', 'error');
      }
    } catch (err) {
      showToast('Erro de conexão', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectCompanion = async (companionId: number) => {
    if (!user) return;
    setLoading(true);
    try {
      console.log(`Frontend: Rejecting companion ${companionId}`);
      const res = await fetch(`/api/admin/companions/${companionId}/reject`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        showToast('Acompanhante recusado.');
        await Promise.all([fetchAdminStats(), fetchGuests()]);
      } else {
        const data = await res.json();
        showToast(data.error || 'Erro ao recusar', 'error');
      }
    } catch (err: any) {
      console.error('Reject companion error:', err);
      showToast('Erro de conexão: ' + err.message, 'error');
    } finally {
      setLoading(false);
      setRejectConfirmId(null);
    }
  };

  const fetchAdminStats = async () => {
    const res = await fetch('/api/admin/stats');
    if (res.ok) {
      const data = await res.json();
      setAdminStats(data);
      if (data.pixKey) setAdminPixInput(data.pixKey);
    }
  };

  const fetchPendingPayments = async () => {
    const res = await fetch('/api/admin/pending-payments');
    if (res.ok) {
      const data = await res.json();
      setPendingPayments(data);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotPasswordEmail })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'success');
        setView('login');
      } else {
        setAuthError(data.error);
      }
    } catch (error) {
      setAuthError("Erro ao processar solicitação.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetPasswordForm.password !== resetPasswordForm.confirm) {
      setAuthError("As senhas não coincidem.");
      return;
    }

    // Password complexity validation: min 6 chars, 1 letter
    const hasLetter = /[a-zA-Z]/.test(resetPasswordForm.password);
    if (resetPasswordForm.password.length < 6 || !hasLetter) {
      setAuthError("A senha deve ter no mínimo 6 caracteres e conter pelo menos 1 letra.");
      return;
    }

    setLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, newPassword: resetPasswordForm.password })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'success');
        setView('login');
      } else {
        setAuthError(data.error);
      }
    } catch (error) {
      setAuthError("Erro ao redefinir senha.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);

    // Password complexity validation: min 6 chars, 1 letter
    const hasLetter = /[a-zA-Z]/.test(signupData.password);

    if (signupData.password.length < 6 || !hasLetter) {
      setAuthError("A senha deve ter no mínimo 6 caracteres e conter pelo menos 1 letra.");
      setLoading(false);
      return;
    }

    if (signupData.password !== signupData.confirmPassword) {
      setAuthError("As senhas não coincidem.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupData.name,
          email: signupData.email,
          whatsapp: signupData.whatsapp,
          instagram: signupData.instagram,
          password: signupData.password,
          companionsCount: signupData.companionsCount
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Cadastro recebido! O organizador está analisando sua solicitação. Você receberá uma confirmação em breve.', 'success');
        setSignupData({ name: '', email: '', whatsapp: '', instagram: '', password: '', confirmPassword: '' });
        setView('login');
      } else {
        setAuthError(data.error || 'Erro ao realizar cadastro');
        showToast(data.error || 'Erro ao realizar cadastro', 'error');
        fetchPublicEvent();
      }
    } catch (error) {
      setAuthError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data);
        setView(data.role === 'admin' ? 'admin' : 'dashboard');
      } else {
        setAuthError(data.error || 'E-mail ou senha incorretos');
      }
    } catch (error) {
      setAuthError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('O arquivo é muito grande (máx 5MB)', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadstart = () => setLoading(true);
      reader.onloadend = () => {
        setReceiptBase64(reader.result as string);
        setLoading(false);
        setConfirmPixName(false); // Clear confirmation if receipt is attached
      };
      reader.onerror = () => {
        showToast('Erro ao ler arquivo', 'error');
        setLoading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const submitReceipt = async () => {
    if (!user || !paymentAmount) {
      showToast('Preencha o valor do pagamento', 'error');
      return;
    }

    if (!receiptBase64 && !confirmPixName) {
      showToast('Anexe o comprovante ou confirme a titularidade da conta', 'error');
      return;
    }
    
    setIsPaying(true);
    try {
      const res = await fetch('/api/payments/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id, 
          amount: Number(paymentAmount),
          comprovanteBase64: receiptBase64
        })
      });
      if (res.ok) {
        showToast('Comprovante enviado com sucesso! Aguarde a validação.');
        setShowReceiptForm(false);
        setPaymentAmount('');
        setReceiptBase64(null);
        setConfirmPixName(false);
        fetchBalance();
      } else {
        showToast('Erro ao enviar comprovante', 'error');
      }
    } catch (error) {
      console.error('Submit error:', error);
      showToast('Erro de conexão', 'error');
    } finally {
      setIsPaying(false);
    }
  };

  const handleAdminAction = async (paymentId: number, action: 'approve' | 'reject') => {
    const payment = pendingPayments.find(p => p.id === paymentId);
    const res = await fetch(`/api/admin/payments/${paymentId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    if (res.ok) {
      showToast(action === 'approve' ? 'Pagamento aprovado!' : 'Pagamento rejeitado.');
      
      if (action === 'approve' && payment) {
        const guest = adminStats?.guests.find(g => g.id === payment.usuario_id);
        const totalDue = guest?.valor_total !== undefined && guest.valor_total !== null ? guest.valor_total : (adminStats?.eventValue || 500);
        const currentPaid = guest?.paid || 0;
        const newPaid = currentPaid + payment.valor;
        const newBalance = totalDue - newPaid;
        
        setLastActionNotification({
          userName: payment.user_name || 'Convidado',
          whatsapp: payment.whatsapp || '',
          amount: payment.valor,
          newBalance: newBalance,
          type: 'approval',
          companionCount: guest?.companion_count
        });
      }
      
      fetchPendingPayments();
      fetchAdminStats();
    } else {
      showToast('Erro ao processar ação', 'error');
    }
  };

  const handleApproveGuest = async (guestId: number) => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/approve-guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestId, adminId: user.id, adminName: user.nome })
      });
      if (res.ok) {
        showToast('Convidado aprovado com sucesso!');
        
        const approvedGuest = guests.find(g => g.id === guestId);
        if (approvedGuest) {
          setLastActionNotification({
            userName: approvedGuest.nome,
            whatsapp: approvedGuest.whatsapp || '',
            amount: 0,
            newBalance: approvedGuest.valor_total || config?.event.valor || 0,
            type: 'approval',
            companionCount: approvedGuest.companion_count
          });
        }

        fetchAdminStats();
        fetchGuests();
      } else {
        const data = await res.json();
        showToast(data.error || 'Erro ao aprovar convidado', 'error');
      }
    } catch (err) {
      showToast('Erro de conexão ao aprovar', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectGuest = async (guestId: number) => {
    if (!user) return;
    setLoading(true);
    try {
      console.log(`Frontend: Rejecting guest ${guestId}`);
      const res = await fetch('/api/admin/reject-guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestId, adminId: user.id, adminName: user.nome })
      });
      if (res.ok) {
        showToast('Cadastro recusado com sucesso.');
        if (editingGuest?.id === guestId) {
          setEditingGuest(null);
          setGuestFormData({ nome: '', email: '', whatsapp: '', instagram: '', password: '', valor_total: '' });
        }
        await Promise.all([fetchAdminStats(), fetchGuests()]);
      } else {
        const data = await res.json();
        showToast(data.error || 'Erro ao recusar convidado', 'error');
      }
    } catch (err) {
      console.error('Reject guest error:', err);
      showToast('Erro de conexão ao recusar', 'error');
    } finally {
      setLoading(false);
      setRejectGuestConfirmId(null);
    }
  };

  const handleReactivateGuest = async (guestId: number) => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/reactivate-guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestId, adminId: user.id, adminName: user.nome })
      });
      if (res.ok) {
        showToast('Convidado reativado com sucesso!');
        await Promise.all([fetchAdminStats(), fetchGuests()]);
      } else {
        const data = await res.json();
        showToast(data.error || 'Erro ao reativar convidado', 'error');
      }
    } catch (err) {
      showToast('Erro de conexão ao reativar', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGuest = async (id: number) => {
    if (!user) return;
    setLoading(true);
    try {
      console.log(`Frontend: Deleting guest ${id}`);
      const res = await fetch(`/api/admin/guests/${id}?adminId=${user.id}&adminName=${encodeURIComponent(user.nome)}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Convidado excluído permanentemente');
        await Promise.all([fetchGuests(), fetchAdminStats()]);
      } else {
        const data = await res.json();
        showToast(data.error || 'Erro ao excluir convidado', 'error');
      }
    } catch (err: any) {
      console.error('Delete guest error:', err);
      showToast('Erro de conexão: ' + err.message, 'error');
    } finally {
      setLoading(false);
      setDeleteConfirmId(null);
    }
  };

  const handleSaveGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingGuest ? `/api/admin/guests/${editingGuest.id}` : '/api/admin/guests';
    const method = editingGuest ? 'PUT' : 'POST';
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...guestFormData,
        valor_total: guestFormData.valor_total ? Number(guestFormData.valor_total) : undefined,
        acompanhantes_count: guestFormData.acompanhantes_count
      })
    });
    
    if (res.ok) {
      showToast(editingGuest ? 'Convidado atualizado!' : 'Convidado cadastrado com sucesso!');
      fetchGuests();
      fetchAdminStats(); // Refresh stats too
      setShowGuestForm(false);
      setEditingGuest(null);
      setGuestFormData({ nome: '', email: '', whatsapp: '', instagram: '', password: '', valor_total: '', acompanhantes_count: 0, rsvp_status: '' });
    } else {
      const data = await res.json();
      showToast(data.error || 'Erro ao salvar convidado', 'error');
    }
  };

  const handleUpdateAllGuestValues = async () => {
    if (!updateAllValue || isNaN(Number(updateAllValue))) {
      showToast('Informe um valor válido', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/guests/update-all-values', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valor: Number(updateAllValue) })
      });

      if (res.ok) {
        showToast(`Valor de todos os convidados atualizado para R$ ${updateAllValue}!`);
        setShowUpdateAllConfirm(false);
        setUpdateAllValue('');
        await Promise.all([fetchGuests(), fetchAdminStats()]);
      } else {
        const data = await res.json();
        showToast(data.error || 'Erro ao atualizar valores', 'error');
      }
    } catch (err) {
      showToast('Erro de conexão', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const replaceTags = (text: string, data: {
    nome_convidado?: string;
    valor_pago?: number;
    saldo_devedor?: number;
    nome_evento?: string;
    chave_pix?: string;
  }) => {
    let result = text;
    if (data.nome_convidado) result = result.replace(/{nome_convidado}/g, data.nome_convidado);
    if (data.valor_pago !== undefined) result = result.replace(/{valor_pago}/g, formatCurrency(data.valor_pago));
    if (data.saldo_devedor !== undefined) result = result.replace(/{saldo_devedor}/g, formatCurrency(data.saldo_devedor));
    if (data.nome_evento) result = result.replace(/{nome_evento}/g, data.nome_evento);
    if (data.chave_pix) result = result.replace(/{chave_pix}/g, data.chave_pix);
    return result;
  };

  const handleSaveTemplates = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templates })
      });
      if (res.ok) {
        showToast('Modelos de mensagem salvos!');
        fetchTemplates();
      } else {
        showToast('Erro ao salvar modelos', 'error');
      }
    } catch (err) {
      showToast('Erro de conexão', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleManualPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPaymentData.amount || isNaN(Number(manualPaymentData.amount)) || Number(manualPaymentData.amount) <= 0) {
      showToast('Informe um valor válido', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/payments/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: manualPaymentData.userId,
          amount: Number(manualPaymentData.amount),
          observation: manualPaymentData.observation || 'Recebimento Manual pelo Organizador'
        })
      });
      if (res.ok) {
        showToast('Pagamento registrado com sucesso!');
        
        const guest = guests.find(g => g.id === manualPaymentData.userId);
        const newPaid = manualPaymentData.paid + Number(manualPaymentData.amount);
        const newBalance = manualPaymentData.totalDue - newPaid;
        
        setLastActionNotification({
          userName: manualPaymentData.userName,
          whatsapp: guest?.whatsapp || '',
          amount: Number(manualPaymentData.amount),
          newBalance: newBalance,
          type: 'manual',
          companionCount: guest?.companion_count
        });

        setShowManualPayment(false);
        setManualPaymentData({ userId: 0, userName: '', amount: '', observation: '', totalDue: 0, paid: 0 });
        fetchAdminStats();
        fetchGuests();
      } else {
        const data = await res.json();
        showToast(data.error || 'Erro ao registrar pagamento', 'error');
      }
    } catch (err) {
      showToast('Erro de conexão ao registrar', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configForm)
      });
      if (res.ok) {
        showToast('Configurações salvas com sucesso!');
        fetchConfig();
        fetchAdminStats();
        fetchPublicEvent();
      } else {
        const data = await res.json();
        showToast(data.error || 'Erro ao salvar configurações', 'error');
      }
    } catch (err) {
      showToast('Erro de conexão ao salvar', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      showToast('As senhas não coincidem', 'error');
      return;
    }

    // Password complexity validation: min 6 chars, 1 letter
    const hasLetter = /[a-zA-Z]/.test(passwordForm.new);
    if (passwordForm.new.length < 6 || !hasLetter) {
      showToast('A senha deve ter no mínimo 6 caracteres e conter pelo menos 1 letra', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.current,
          newPassword: passwordForm.new
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Senha alterada com sucesso!');
        setPasswordForm({ current: '', new: '', confirm: '' });
      } else {
        showToast(data.error || 'Erro ao alterar senha', 'error');
      }
    } catch (err) {
      showToast('Erro de conexão', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'flyer_landing' | 'flyer_landing_mobile' | 'flyer_dashboard' | 'flyer_info') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('O arquivo é muito grande (máx 5MB)', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setConfigForm(prev => ({
          ...prev,
          event: {
            ...prev.event,
            [type]: reader.result as string
          }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  if (view === 'signup' || view === 'login' || view === 'forgot-password' || view === 'reset-password') {
    return (
      <div className="min-h-screen bg-white font-sans flex flex-col">
        {/* Toast Notification */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 50, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: 20, x: '-50%' }}
              className={`fixed bottom-8 left-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${
                toast.type === 'success' 
                  ? 'bg-emerald-500 text-white border-emerald-400' 
                  : 'bg-red-500 text-white border-red-400'
              }`}
            >
              {toast.type === 'success' ? <CheckCircle className="size-5" /> : <XCircle className="size-5" />}
              <span className="font-bold text-sm tracking-tight">{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <header className="flex items-center justify-between px-6 md:px-20 py-6 bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100">
          <div className="flex items-center gap-3 text-blue-600">
            <PartyPopper className="size-8" />
            <h2 className="text-slate-900 text-lg md:text-xl font-black tracking-tighter uppercase truncate max-w-[200px] md:max-w-none">{publicEvent?.nome || 'Comemoração de Aniversário'}</h2>
          </div>
          <button 
            onClick={() => {
              setView(view === 'signup' ? 'login' : 'signup');
              setAuthError(null);
            }}
            className="px-4 md:px-8 py-2.5 rounded-full bg-slate-900 text-white text-[10px] md:text-sm font-black uppercase tracking-widest hover:bg-blue-600 hover:scale-105 transition-all shadow-xl whitespace-nowrap"
          >
            {view === 'signup' ? 'Login' : 'Cadastrar'}
          </button>
        </header>

        <main className="flex-1 flex flex-col md:flex-row">
          {/* Left Side: Flyer / Info */}
          <div className="flex-1 bg-slate-50 flex flex-col items-center justify-center p-4 md:p-20">
            {/* Desktop Flyer */}
            {publicEvent?.flyer_landing && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="hidden md:block w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border-8 border-white mb-8"
              >
                <img src={publicEvent.flyer_landing} alt="Arte Desktop" className="w-full h-auto" referrerPolicy="no-referrer" />
              </motion.div>
            )}

            {/* Mobile Flyer (or fallback to desktop if mobile not set) */}
            {(publicEvent?.flyer_landing_mobile || publicEvent?.flyer_landing) && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`${publicEvent?.flyer_landing ? 'md:hidden' : ''} w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border-4 border-white mb-4 max-h-[25vh] md:max-h-none`}
              >
                <img 
                  src={publicEvent?.flyer_landing_mobile || publicEvent?.flyer_landing} 
                  alt="Arte Mobile" 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer" 
                />
              </motion.div>
            )}

            {!publicEvent?.flyer_landing && !publicEvent?.flyer_landing_mobile && (
              <div className="w-full max-w-lg aspect-[3/4] bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl flex flex-col items-center justify-center text-white p-6 md:p-12 text-center mb-8 shadow-2xl">
                <PartyPopper className="size-16 md:size-24 mb-4 md:mb-6 opacity-50" />
                <h1 className="text-2xl md:text-4xl font-black mb-2 md:mb-4 uppercase tracking-tighter">{publicEvent?.nome || 'Minha Resenha de Aniversário'}</h1>
                <p className="text-blue-100 text-sm md:text-base font-medium">Vibe Infinita... Essa Vibe é nossa!</p>
              </div>
            )}

            <div className="hidden md:grid w-full max-w-lg grid-cols-1 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="size-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Calendar className="size-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data do Evento</p>
                  <p className="font-bold text-slate-900">{publicEvent?.data || 'A definir'}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="size-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <MapPin className="size-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Localização</p>
                  <p className="font-bold text-slate-900">{publicEvent?.local || 'A definir'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Form */}
          <div className="w-full md:w-[500px] flex flex-col items-center justify-center p-8 md:p-20 bg-white">
            <div className="w-full max-w-sm">
              <div className="mb-10">
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">
                  {view === 'signup' && 'Bora pra Resenha!'}
                  {view === 'login' && 'Bem-vindo de volta'}
                  {view === 'forgot-password' && 'Recuperar Senha'}
                  {view === 'reset-password' && 'Nova Senha'}
                </h2>
                <p className="text-slate-500 font-medium">
                  {view === 'signup' && 'Preencha os dados abaixo para não ficar de fora dessa resenha!'}
                  {view === 'login' && 'Acesse seu painel para ter informações atualizadas.'}
                  {view === 'forgot-password' && 'Informe seu e-mail para receber o link de recuperação.'}
                  {view === 'reset-password' && 'Crie uma nova senha segura para sua conta.'}
                </p>
              </div>

              {view === 'forgot-password' ? (
                <form onSubmit={handleForgotPassword} method="POST" className="space-y-5">
                  <Input 
                    id="forgot_email"
                    name="email"
                    label="E-mail Cadastrado" 
                    icon={Mail} 
                    type="email"
                    autoComplete="email"
                    placeholder="seu@email.com"
                    value={forgotPasswordEmail}
                    onChange={(e: any) => setForgotPasswordEmail(e.target.value)}
                    required
                  />
                  {authError && (
                    <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl flex items-center gap-2">
                      <XCircle className="size-4" />
                      {authError}
                    </div>
                  )}
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                  >
                    {loading ? <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Enviar Link de Recuperação'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setView('login')}
                    className="w-full text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest text-center"
                  >
                    Voltar para o Login
                  </button>
                </form>
              ) : view === 'reset-password' ? (
                <form onSubmit={handleResetPassword} method="POST" className="space-y-5">
                  <Input 
                    id="user_secure_password"
                    name="user_secure_password"
                    label="Nova Senha" 
                    icon={Lock} 
                    type="password" 
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={resetPasswordForm.password}
                    onChange={(e: any) => setResetPasswordForm({...resetPasswordForm, password: e.target.value})}
                    required
                  />
                  <Input 
                    id="confirm_user_secure_password"
                    name="confirm_user_secure_password"
                    label="Confirmar Nova Senha" 
                    icon={Lock} 
                    type="password" 
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={resetPasswordForm.confirm}
                    onChange={(e: any) => setResetPasswordForm({...resetPasswordForm, confirm: e.target.value})}
                    required
                  />
                  {authError && (
                    <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl flex items-center gap-2">
                      <XCircle className="size-4" />
                      {authError}
                    </div>
                  )}
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                  >
                    {loading ? <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Alterar Senha'}
                  </button>
                </form>
              ) : view === 'signup' && publicEvent && publicEvent.ocupacao_atual !== undefined && publicEvent.capacidade_maxima !== undefined && publicEvent.ocupacao_atual >= publicEvent.capacidade_maxima ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="size-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-red-200">
                    <XCircle className="size-12" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-4 uppercase tracking-tight">Vagas Esgotadas! 🚀</h2>
                  <p className="text-slate-500 font-medium mb-8 max-w-xs mx-auto">
                    Infelizmente atingimos o limite máximo de convidados para este evento.
                  </p>
                  <button 
                    onClick={() => setView('login')}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-xl shadow-xl transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                  >
                    Já sou cadastrado? Faça login
                  </button>
                </div>
              ) : view === 'signup' ? (
                <form onSubmit={handleSignup} method="POST" className="space-y-5">
                  <Input 
                    id="signup_name"
                    name="name"
                    label="Nome Completo" 
                    icon={User} 
                    autoComplete="name"
                    placeholder="Como quer ser chamado?"
                    value={signupData.name}
                    onChange={(e: any) => setSignupData({...signupData, name: e.target.value})}
                    required
                  />
                  <Input 
                    id="signup_email"
                    name="email"
                    label="E-mail" 
                    icon={Mail} 
                    type="email"
                    autoComplete="username"
                    placeholder="seu@email.com"
                    value={signupData.email}
                    onChange={(e: any) => setSignupData({...signupData, email: e.target.value})}
                    required
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                      id="signup_whatsapp"
                      name="whatsapp"
                      label="WhatsApp" 
                      icon={Phone} 
                      autoComplete="tel"
                      placeholder="(00) 00000-0000"
                      value={signupData.whatsapp}
                      onChange={(e: any) => setSignupData({...signupData, whatsapp: e.target.value})}
                      required
                    />
                    <Input 
                      id="signup_instagram"
                      name="instagram"
                      label="Instagram" 
                      icon={Instagram} 
                      autoComplete="off"
                      placeholder="@seu.perfil"
                      value={signupData.instagram}
                      onChange={(e: any) => setSignupData({...signupData, instagram: e.target.value})}
                    />
                  </div>

                  <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 mb-2">
                    <div className="flex items-start gap-2">
                      <Info className="size-4 text-blue-600 mt-0.5 shrink-0" />
                      <p className="text-[10px] text-blue-700 font-medium leading-tight">
                        Sua senha deve ter no mínimo **6 caracteres**, contendo pelo menos **1 letra** e **5 números**.
                      </p>
                    </div>
                  </div>

                  <Input 
                    id="user_secure_password"
                    name="user_secure_password"
                    label="Crie uma Senha" 
                    icon={Lock} 
                    type="password"
                    autoComplete="new-password"
                    placeholder="Mínimo 6 caracteres (1 letra, 5 números)"
                    value={signupData.password}
                    onChange={(e: any) => setSignupData({...signupData, password: e.target.value})}
                    required
                  />

                  <Input 
                    id="confirm_user_secure_password"
                    name="confirm_user_secure_password"
                    label="Confirme sua Senha" 
                    icon={Lock} 
                    type="password"
                    autoComplete="new-password"
                    placeholder="Repita a senha criada"
                    value={signupData.confirmPassword}
                    onChange={(e: any) => setSignupData({...signupData, confirmPassword: e.target.value})}
                    required
                  />
                  
                  {authError && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold border border-red-100">
                      {authError}
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest py-4 rounded-2xl transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? 'Processando...' : 'PRÉ CADASTRO'}
                    <ArrowRight className="size-5" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleLogin} method="POST" className="space-y-5">
                  <Input 
                    id="auth_email_address"
                    name="auth_email_address"
                    label="E-mail" 
                    icon={Mail} 
                    type="email"
                    autoComplete="username"
                    placeholder="seu@email.com"
                    value={loginData.email}
                    onChange={(e: any) => setLoginData({...loginData, email: e.target.value})}
                    required
                  />
                  <Input 
                    id="auth_user_password"
                    name="auth_user_password"
                    label="Senha" 
                    icon={Lock} 
                    type="password"
                    autoComplete="current-password"
                    placeholder="Digite sua senha"
                    value={loginData.password}
                    onChange={(e: any) => setLoginData({...loginData, password: e.target.value})}
                    required
                  />
                  <div className="flex justify-end">
                    <button 
                      type="button"
                      onClick={() => {
                        setView('forgot-password');
                        setAuthError(null);
                      }}
                      className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest"
                    >
                      Esqueci minha senha
                    </button>
                  </div>

                  {authError && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold border border-red-100">
                      {authError}
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest py-4 rounded-2xl transition-all shadow-xl shadow-slate-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? 'Entrando...' : 'Acessar Painel'}
                    <ArrowRight className="size-5" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (view === 'dashboard' && user && balance) {
    const progress = (balance.totalPaid / balance.totalDue) * 100;
    const isPaid = balance.balance <= 0;
    
    const rsvpDeadlinePassed = publicEvent?.prazo_rsvp ? new Date() > new Date(publicEvent.prazo_rsvp) : false;
    const showRSVP = user.status === 'ativo';
    const isSoldOut = publicEvent && publicEvent.ocupacao_atual !== undefined && publicEvent.capacidade_maxima !== undefined && publicEvent.ocupacao_atual >= publicEvent.capacidade_maxima;
    
    const PENDING_IMAGE = "https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=80&w=1000&auto=format&fit=crop";
    const PAID_IMAGE = "https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=1000&auto=format&fit=crop";

    return (
      <div className="min-h-screen bg-slate-50 font-sans">
        {/* Toast Notification */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 50, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: 20, x: '-50%' }}
              className={`fixed bottom-8 left-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${
                toast.type === 'success' 
                  ? 'bg-emerald-500 text-white border-emerald-400' 
                  : 'bg-red-500 text-white border-red-400'
              }`}
            >
              {toast.type === 'success' ? <CheckCircle className="size-5" /> : <XCircle className="size-5" />}
              <span className="font-bold text-sm tracking-tight">{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
        <header className="flex items-center justify-between px-4 md:px-20 py-4 bg-white border-b border-slate-100 sticky top-0 z-50">
          <div className="flex items-center gap-2 md:gap-3 text-blue-600 min-w-0">
            <PartyPopper className="size-6 md:size-8 shrink-0" />
            <h2 className="text-slate-900 text-sm md:text-lg font-bold truncate">{publicEvent?.nome || 'Evento'}</h2>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <button className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all">
              <Bell className="size-4 md:size-5" />
            </button>
            <ProfileAvatar 
              user={user} 
              size="sm" 
              showToast={showToast} 
              onUpdate={(newUrl) => {
                setUser(prev => prev ? { ...prev, foto_perfil: newUrl } : null);
                if (user.role === 'admin') fetchPublicEvent();
              }} 
            />
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition-all">
              <LogOut className="size-4 md:size-5" />
            </button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-10">
          {/* Hidden input to help browser password manager identify the correct username */}
          <input type="text" name="username" style={{ display: 'none' }} autoComplete="username" value={user.email} readOnly />
          
          <div className="mb-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-4xl font-black text-slate-900 mb-1">Olá, {user.nome.split(' ')[0]}!</h1>
                <div className="flex items-center gap-2">
                  <p className="text-slate-500 text-xs md:text-base">Painel da Resenha</p>
                  <span className="text-[10px] font-black bg-slate-200 text-slate-600 px-2 py-0.5 rounded uppercase tracking-widest">ID: #{user.codigo_convidado}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 mb-8">
            {/* RSVP Section */}
            {showRSVP && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-blue-600 rounded-3xl p-6 md:p-8 shadow-xl shadow-blue-600/20 text-white relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Clock className="size-32 rotate-12" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                      <Bell className="size-6" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight">Confirmação de Presença</h3>
                  </div>
                  <p className="text-blue-100 text-sm md:text-base mb-6 max-w-xl">
                    {user.rsvp_status === 'confirmado' ? (
                      <span className="flex items-center gap-2 font-black text-white bg-emerald-500/30 px-3 py-1 rounded-lg w-fit mb-2">
                        <CheckCircle className="size-5" /> VOCÊ ESTÁ CONFIRMADO!
                      </span>
                    ) : user.rsvp_status === 'desistente' ? (
                      <span className="flex items-center gap-2 font-black text-white bg-red-500/30 px-3 py-1 rounded-lg w-fit mb-2">
                        <XCircle className="size-5" /> VOCÊ INFORMOU QUE NÃO PODERÁ IR.
                      </span>
                    ) : user.rsvp_status === 'lista_espera' ? (
                      <span className="flex items-center gap-2 font-black text-white bg-amber-500/30 px-3 py-1 rounded-lg w-fit mb-2">
                        <Clock className="size-5" /> VOCÊ ESTÁ NA LISTA DE ESPERA.
                      </span>
                    ) : (
                      "Sua vaga está reservada! Clique abaixo para confirmar sua presença ou liberar para outra pessoa."
                    )}
                    
                    {publicEvent?.prazo_rsvp && (
                      <span className="block mt-2 font-bold text-white/80 text-xs">
                        Prazo limite para alterações: {new Date(publicEvent.prazo_rsvp).toLocaleString('pt-BR')}
                      </span>
                    )}
                  </p>
                  
                  {rsvpDeadlinePassed ? (
                    <div className="bg-white/10 border border-white/20 p-4 rounded-2xl backdrop-blur-md flex items-center gap-3">
                      <Lock className="size-6 text-white" />
                      <p className="font-black uppercase tracking-widest text-sm">O prazo para confirmação expirou</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex flex-col md:flex-row gap-4">
                        {user.rsvp_status === 'confirmado' ? (
                          <div className="flex-1 bg-emerald-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 uppercase tracking-widest text-xs shadow-lg shadow-emerald-500/20">
                            <CheckCircle className="size-5" /> Presença Confirmada
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleRSVP('confirm')}
                            disabled={loading}
                            className="flex-1 bg-white text-blue-600 hover:bg-blue-50 font-black py-4 rounded-2xl transition-all shadow-lg shadow-black/10 flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                          >
                            {loading ? 'Processando...' : (isSoldOut ? 'Entrar na Lista de Espera' : (user.rsvp_status === 'desistente' ? 'Mudei de ideia, vou sim!' : 'Confirmar Presença'))}
                            <Check className="size-5" />
                          </button>
                        )}
                        
                        {user.rsvp_status !== 'desistente' && (
                          <button 
                            onClick={() => handleRSVP('decline')}
                            disabled={loading}
                            className="flex-1 bg-blue-700/50 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all border border-white/20 flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                          >
                            {user.rsvp_status === 'confirmado' ? 'Não poderei ir mais' : 'Desistir da Vaga'}
                            <X className="size-5" />
                          </button>
                        )}
                      </div>
                      
                      {/* Dynamic status message below buttons */}
                      <p className="text-[10px] md:text-xs font-bold text-white/70 italic text-center md:text-left">
                        {user.rsvp_status === 'confirmado' && "Sua vaga está garantida! Agora você pode adicionar seus acompanhantes."}
                        {user.rsvp_status === 'desistente' && "Você informou que não poderá comparecer. Caso mude de ideia, ainda pode confirmar sua presença se houver vagas."}
                        {user.rsvp_status === 'lista_espera' && "Você está na lista de espera. Avisaremos assim que uma vaga for liberada!"}
                        {!user.rsvp_status && "Confirme sua presença para garantir sua vaga no evento."}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Bloco de Saldo */}
            <div className="bg-white rounded-3xl p-5 md:p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6 w-full md:w-auto">
                <div 
                  className="w-24 h-16 md:w-28 md:h-20 rounded-2xl bg-cover bg-center shrink-0 shadow-inner border border-slate-100" 
                  style={{ backgroundImage: `url(${publicEvent?.flyer_dashboard || (isPaid ? PAID_IMAGE : PENDING_IMAGE)})` }}
                ></div>
                <div>
                  <p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-1">Status Financeiro</p>
                  <h3 className={`text-2xl md:text-3xl font-black ${isPaid ? 'text-emerald-600' : 'text-slate-900'}`}>
                    {isPaid ? 'Pagamento Confirmado!' : `Saldo Devedor: ${formatCurrency(balance.balance)}`}
                  </h3>
                  <div className="mt-2">
                    <p className="text-xs text-slate-500">{formatCurrency(balance.totalPaid)} de {formatCurrency(balance.totalDue)} pagos</p>
                    <div className="w-48 bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className={`h-full ${isPaid ? 'bg-emerald-500' : 'bg-amber-400'} rounded-full`}
                      />
                    </div>
                    {isPaid && (
                      <p className="text-[10px] md:text-xs text-emerald-600 font-bold mt-2 flex items-center gap-1">
                        <CheckCircle className="size-3" />
                        Sua presença na Resenha está confirmada. Nos vemos lá!
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right hidden md:block">
                <span className={`${isPaid ? 'text-emerald-500' : 'text-amber-500'} font-black text-4xl`}>{Math.round(progress)}%</span>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Pago</p>
              </div>
            </div>

            {/* Informações do Evento */}
            {(balance.flyer_info || balance.info_texto) && (
              <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="p-4 md:p-6 bg-slate-50/50 border-b border-slate-100 flex items-center gap-3">
                  <Info className="size-5 text-blue-600" />
                  <h4 className="font-black text-xs md:text-sm text-slate-900 uppercase tracking-widest">Informações da Resenha</h4>
                </div>
                <div className="p-0">
                  {balance.flyer_info && (
                    <div className="w-full">
                      <img 
                        src={balance.flyer_info} 
                        alt="Flyer do Evento" 
                        className="w-full h-auto block"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                  {balance.info_texto && (
                    <div className="p-6 md:p-8">
                      <p className="text-slate-600 text-sm md:text-base leading-relaxed whitespace-pre-wrap font-medium">
                        {balance.info_texto}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bloco de Chave Pix */}
            {balance.pixKey && !isPaid && (
              <div className="bg-blue-600 rounded-3xl p-6 md:p-8 shadow-lg shadow-blue-600/20 text-white flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-2xl bg-white/20 flex items-center justify-center">
                    <QrCode className="size-6 text-white" />
                  </div>
                  <div>
                    <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest">Chave Pix para Pagamento</p>
                    <h4 className="text-xl md:text-2xl font-mono font-black select-all break-all">{balance.pixKey}</h4>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/20">
                  <p className="text-[10px] text-blue-50 font-medium italic">Copie a chave e faça o Pix de qualquer valor para abater seu saldo.</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-8 mb-10">
            <div className="bg-white p-5 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
              {!showReceiptForm ? (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row gap-3 md:gap-4">
                    <div className="flex-1 relative">
                      <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
                      <input 
                        type="number" 
                        placeholder="Valor enviado (R$)"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold text-base"
                      />
                    </div>
                    <button 
                      onClick={() => {
                        if (!paymentAmount || Number(paymentAmount) <= 0) {
                          showToast('Informe o valor que você enviou via Pix', 'error');
                          return;
                        }
                        setShowReceiptForm(true);
                      }}
                      className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-black px-8 py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                    >
                      <CheckCircle className="size-5" />
                      Informar Pagamento
                    </button>
                  </div>
                  <p className="text-center text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                    Faça um Pix de qualquer valor para a chave acima para abater seu saldo.
                  </p>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-black text-slate-900">Enviar Comprovante</h4>
                    <button onClick={() => setShowReceiptForm(false)} className="text-slate-400 hover:text-slate-600">
                      <Plus className="size-6 rotate-45" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative group h-full min-h-[120px]">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      />
                      <div className={`border-2 border-dashed rounded-xl p-4 h-full flex flex-col items-center justify-center gap-2 transition-colors relative ${receiptBase64 ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50 group-hover:border-blue-400'}`}>
                        {receiptBase64 ? (
                          <div className="relative w-full h-full flex flex-col items-center">
                            <img src={receiptBase64} alt="Prévia" className="h-16 w-auto object-contain rounded shadow-sm mb-1" />
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-tight">Comprovante Anexado</p>
                            <button 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setReceiptBase64(null);
                              }}
                              className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 z-20"
                            >
                              <Plus className="size-3 rotate-45" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <Upload className="size-8 text-slate-400 group-hover:text-blue-500" />
                            <p className="text-xs font-bold text-slate-500 text-center">Anexar Comprovante<br/><span className="text-[10px] font-normal">(Opcional se confirmar nome)</span></p>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col justify-center gap-3">
                      <p className="text-xs text-slate-500">Valor informado: <span className="font-bold text-slate-900">{formatCurrency(Number(paymentAmount))}</span></p>
                      
                      {!receiptBase64 && (
                        <label className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100 cursor-pointer group animate-in fade-in slide-in-from-top-2">
                          <input 
                            type="checkbox" 
                            checked={confirmPixName}
                            onChange={(e) => setConfirmPixName(e.target.checked)}
                            className="mt-1 size-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                          />
                          <div className="flex-1">
                            <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider leading-tight">Confirmação de Titularidade</p>
                            <p className="text-[11px] text-amber-700 leading-snug mt-0.5">
                              Confirmo que o Pix foi realizado por uma conta em **meu nome** ({user.nome}).
                            </p>
                          </div>
                        </label>
                      )}

                      <button 
                        onClick={submitReceipt}
                        disabled={isPaying || (!receiptBase64 && !confirmPixName)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                      >
                        {isPaying ? <Clock className="size-5 animate-spin" /> : <CheckCircle className="size-5" />}
                        Confirmar Envio
                      </button>
                      <p className="text-[9px] text-slate-400 text-center italic">
                        Opcional: Anexe o comprovante para agilizar a validação.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Meus Acompanhantes Section */}
            <div className="bg-white rounded-3xl p-5 md:p-8 shadow-sm border border-slate-200 space-y-6">
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                <div className="flex-1">
                  <h3 className="text-xl font-black text-slate-900">Meus Acompanhantes</h3>
                  <p className="text-slate-500 text-xs">Adicione pessoas que irão com você (máx {publicEvent?.limite_acompanhantes || 4}).</p>
                  <p className="text-[10px] text-blue-600 font-bold mt-1 leading-tight">
                    Ao adicionar um acompanhante, o valor de {formatCurrency(publicEvent?.valor || 0)} será somado ao seu saldo devedor após a aprovação do administrador.
                  </p>
                </div>
                <button 
                  onClick={() => setShowCompanionForm(true)}
                  disabled={user.rsvp_status !== 'confirmado' || companions.length >= (publicEvent?.limite_acompanhantes || 4)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 md:px-4 md:py-2 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 w-full md:w-auto"
                >
                  <Plus className="size-4" />
                  {user.rsvp_status !== 'confirmado' ? 'Confirme Presença Primeiro' : (companions.length >= (publicEvent?.limite_acompanhantes || 4) ? 'Limite Atingido' : 'Adicionar')}
                </button>
              </div>

              {user.rsvp_status !== 'confirmado' ? (
                <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl flex flex-col items-center text-center gap-3">
                  <AlertCircle className="size-10 text-amber-600 mb-2" />
                  <p className="text-sm text-amber-800 font-black leading-relaxed max-w-xs">
                    ⚠️ Você precisa confirmar sua presença no botão acima antes de poder gerenciar seus acompanhantes.
                  </p>
                  <p className="text-xs text-amber-700 font-medium">
                    A liberação para adicionar acompanhantes é automática após a confirmação.
                  </p>
                </div>
              ) : (
                <>
                  {companions.some(c => c.status === 'pendente_aprovacao') && (
                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3 animate-pulse">
                      <Clock className="size-5 text-amber-600 mt-0.5" />
                      <p className="text-xs text-amber-800 font-medium leading-relaxed">
                        Acompanhante aguardando aprovação do organizador. O valor será atualizado após a confirmação.
                      </p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {companions.map((c) => (
                      <div key={c.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className={`size-10 rounded-full flex items-center justify-center font-bold ${c.status === 'aprovado' ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
                            {c.nome.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900">{c.nome}</p>
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${c.status === 'aprovado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                {c.status === 'aprovado' ? 'Aprovado' : 'Pendente'}
                              </span>
                            </div>
                            {c.instagram && <p className="text-xs text-slate-500">{c.instagram}</p>}
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            if (companionDeleteConfirmId === c.id) {
                              handleRemoveCompanion(c.id);
                            } else {
                              setCompanionDeleteConfirmId(c.id);
                              setTimeout(() => setCompanionDeleteConfirmId(null), 3000);
                            }
                          }}
                          disabled={balance ? (balance.totalPaid >= balance.totalDue && balance.totalDue > 0) : false}
                          className={`p-2 rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-transparent ${companionDeleteConfirmId === c.id ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}
                          title={companionDeleteConfirmId === c.id ? "Clique novamente para confirmar" : (balance && balance.totalPaid >= balance.totalDue && balance.totalDue > 0 ? "Não é possível remover após o pagamento" : "Remover Acompanhante")}
                        >
                          {companionDeleteConfirmId === c.id ? <Check className="size-4" /> : <Trash2 className="size-4" />}
                        </button>
                      </div>
                    ))}
                    {companions.length === 0 && (
                      <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                        <Users className="size-8 text-slate-200 mx-auto mb-2" />
                        <p className="text-slate-400 text-sm">Nenhum acompanhante adicionado.</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Histórico de Pagamentos */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Clock className="text-amber-500 size-5" />
                <h2 className="text-xl font-bold text-slate-900">Histórico de Pagamentos</h2>
              </div>
              <div className="space-y-3">
                {balance.history.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className={`size-10 rounded-full flex items-center justify-center ${
                        p.status === 'concluido' ? 'bg-green-50 text-green-600' : 
                        p.status === 'rejeitado' ? 'bg-red-50 text-red-600' : 
                        'bg-amber-50 text-amber-600'
                      }`}>
                        {p.status === 'concluido' ? <CheckCircle className="size-5" /> : 
                         p.status === 'rejeitado' ? <XCircle className="size-5" /> : 
                         <Clock className="size-5" />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{formatCurrency(p.valor)}</p>
                        <p className="text-xs text-slate-500">{new Date(p.data_pagamento).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                        {p.observacao && <p className="text-[10px] text-blue-600 font-bold mt-0.5 italic">{p.observacao}</p>}
                      </div>
                    </div>
                    <span className={`text-xs font-bold ${
                      p.status === 'concluido' ? 'text-green-600' : 
                      p.status === 'rejeitado' ? 'text-red-600' : 
                      'text-amber-600'
                    }`}>
                      {p.status === 'concluido' ? 'Confirmado' : 
                       p.status === 'rejeitado' ? 'Rejeitado' : 
                       'Aguardando Validação'}
                    </span>
                  </div>
                ))}
                {balance.history.length === 0 && (
                  <p className="text-center py-8 text-slate-400 italic">Nenhum pagamento realizado ainda.</p>
                )}
              </div>
            </div>
          </div>

          {/* Modais Compartilhados para o Painel do Convidado */}
          {showCompanionForm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
              >
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-blue-600 text-white">
                  <h3 className="text-xl font-black">Novo Acompanhante</h3>
                  <button onClick={() => setShowCompanionForm(false)} className="text-white/60 hover:text-white">
                    <XCircle className="size-6" />
                  </button>
                </div>
                <form onSubmit={handleAddCompanion} className="p-8 space-y-6">
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-2">
                    <p className="text-xs text-blue-700 font-medium leading-relaxed">
                      Ao adicionar um acompanhante, o valor de <span className="font-black">{formatCurrency(publicEvent?.valor || 0)}</span> será somado ao seu saldo devedor após a aprovação do administrador. <span className="block mt-1 font-bold">O saldo só aumenta quando o organizador aprova a solicitação.</span>
                    </p>
                  </div>
                  <Input 
                    label="Nome Completo" 
                    icon={User} 
                    placeholder="Ex: Maria Souza"
                    value={companionFormData.nome}
                    onChange={(e: any) => setCompanionFormData({...companionFormData, nome: e.target.value})}
                    required
                  />
                  <Input 
                    label="Instagram (@)" 
                    icon={Instagram} 
                    placeholder="@maria.souza"
                    value={companionFormData.instagram}
                    onChange={(e: any) => setCompanionFormData({...companionFormData, instagram: e.target.value})}
                  />
                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                  >
                    {loading ? <Clock className="size-5 animate-spin" /> : <CheckCircle className="size-5" />}
                    {loading ? 'Enviando...' : 'Confirmar Adição'}
                  </button>
                </form>
              </motion.div>
            </div>
          )}

          {selectedReceipt && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-md" onClick={() => setSelectedReceipt(null)}>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-4xl max-h-full overflow-hidden rounded-3xl shadow-2xl">
                <img src={selectedReceipt} alt="Prévia do Comprovante" className="max-w-full max-h-[80vh] object-contain" />
              </motion.div>
            </div>
          )}

          {/* Flyer do Painel - Removido conforme solicitação */}
        </main>
      </div>
    );
  }

  if (view === 'admin' && user && adminStats) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans flex overflow-hidden">
        {/* Hidden input to help browser password manager identify the correct username */}
        <input type="text" name="username" style={{ display: 'none' }} autoComplete="username" value={user.email} readOnly />
        {/* Toast Notification */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 50, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: 20, x: '-50%' }}
              className={`fixed bottom-8 left-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${
                toast.type === 'success' 
                  ? 'bg-emerald-500 text-white border-emerald-400' 
                  : 'bg-red-500 text-white border-red-400'
              }`}
            >
              {toast.type === 'success' ? <CheckCircle className="size-5" /> : <XCircle className="size-5" />}
              <span className="font-bold text-sm tracking-tight">{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-[100] w-72 bg-blue-700 flex flex-col h-full shadow-2xl transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                <PartyPopper className="text-white size-8" />
              </div>
              <div>
                <h1 className="text-white text-lg font-bold leading-none">Minha Resenha</h1>
                <p className="text-white/60 text-[10px] font-medium uppercase tracking-wider mt-1">Gestão do Niver</p>
              </div>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-white/60 hover:text-white">
              <Plus className="size-6 rotate-45" />
            </button>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            <button 
              onClick={() => { setAdminTab('stats'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${adminTab === 'stats' ? 'bg-white/10 text-white font-medium' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}
            >
              <TrendingUp className="size-5" />
              <span>Dashboard</span>
            </button>
            <button 
              onClick={() => { setAdminTab('validation'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${adminTab === 'validation' ? 'bg-white/10 text-white font-medium' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}
            >
              <CheckCircle className="size-5" />
              <span>Validar Pagamentos</span>
              {pendingPayments.length > 0 && (
                <span className="ml-auto size-5 bg-amber-400 text-slate-900 text-[10px] font-black rounded-full flex items-center justify-center">
                  {pendingPayments.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => { setAdminTab('guests'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${adminTab === 'guests' ? 'bg-white/10 text-white font-medium' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}
            >
              <Users className="size-5" />
              <span>Convidados</span>
            </button>
            <button 
              onClick={() => { setAdminTab('messages'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${adminTab === 'messages' ? 'bg-white/10 text-white font-medium' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}
            >
              <MessageSquare className="size-5" />
              <span>Mensagens</span>
            </button>
            <button 
              onClick={() => { setAdminTab('logs'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${adminTab === 'logs' ? 'bg-white/10 text-white font-medium' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}
            >
              <History className="size-5" />
              <span>Histórico</span>
            </button>
            <button 
              onClick={() => { setAdminTab('settings'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${adminTab === 'settings' ? 'bg-white/10 text-white font-medium' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}
            >
              <Settings className="size-5" />
              <span>Configurações</span>
            </button>
          </nav>
          <div className="p-6">
            <div className="bg-white/10 rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-3 mb-3">
                <ProfileAvatar 
                  user={user} 
                  size="sm" 
                  showToast={showToast} 
                  onUpdate={(newUrl) => {
                    setUser(prev => prev ? { ...prev, foto_perfil: newUrl } : null);
                    if (user.role === 'admin') fetchPublicEvent();
                  }} 
                />
                <div className="truncate">
                  <p className="text-white text-sm font-semibold truncate">{user.nome}</p>
                  <p className="text-white/50 text-[10px]">Organizador</p>
                </div>
              </div>
              <button onClick={() => setView('signup')} className="w-full py-2 bg-white/10 hover:bg-white/20 text-white text-[10px] font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
                <LogOut className="size-3" />
                Sair do CRM
              </button>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile sidebar */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-[90] md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main */}
        <main className="flex-1 flex flex-col overflow-y-auto">
          <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-10 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 rounded-lg bg-slate-100 text-slate-600 md:hidden"
              >
                <Plus className="size-6" />
              </button>
              <h2 className="text-lg md:text-xl font-bold tracking-tight truncate max-w-[150px] md:max-w-none">Dashboard de Evento</h2>
              <span className="px-3 py-1 bg-blue-100 text-blue-600 text-[10px] font-bold rounded-full hidden sm:inline">ATIVO</span>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <button className={`p-2 rounded-lg relative transition-colors ${hasPendingActions ? 'text-red-500 bg-red-50' : 'text-slate-500 hover:bg-slate-100'}`}>
                <Bell className="size-5" />
                {hasPendingActions && (
                  <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </button>
            </div>
          </header>

          <div className="p-8 space-y-8">
            {adminTab === 'stats' && adminStats && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-slate-500 text-sm font-medium">Total Arrecadado</p>
                      <h3 className="text-2xl md:text-3xl font-black text-slate-900">{formatCurrency(adminStats.totalArrecadado)}</h3>
                      <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-bold">
                        <TrendingUp className="size-3" />
                        <span>+15.2% vs ontem</span>
                      </div>
                    </div>
                    <div className="size-12 md:size-14 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                      <Wallet className="size-6 md:size-8" />
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-slate-500 text-sm font-medium">Total a Receber</p>
                      <h3 className="text-2xl md:text-3xl font-black text-slate-900">{formatCurrency(adminStats.totalEsperado - adminStats.totalArrecadado)}</h3>
                      <div className="flex items-center gap-1 text-blue-600 text-[10px] font-bold">
                        <Clock className="size-3" />
                        <span>Pendentes</span>
                      </div>
                    </div>
                    <div className="size-12 md:size-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <Clock className="size-6 md:size-8" />
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                    <div className="flex-1 mr-4">
                      <p className="text-slate-500 text-sm font-medium">Ocupação do Evento</p>
                      <h3 className="text-2xl md:text-3xl font-black text-slate-900">
                        {adminStats.confirmedCount}
                        <span className="text-slate-400 text-sm md:text-base font-medium ml-2">/ {adminStats.capacity} Confirmados (RSVP)</span>
                      </h3>
                      <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${adminStats.confirmedCount >= adminStats.capacity ? 'bg-red-500' : 'bg-blue-600'}`} 
                          style={{ width: `${Math.min(100, (adminStats.confirmedCount / adminStats.capacity) * 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-widest">
                        Total de Solicitações: {adminStats.totalRequests}
                      </p>
                    </div>
                    <div className="size-12 md:size-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                      <Users className="size-6 md:size-8" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-6 md:px-8 py-5 border-b border-slate-200 flex items-center justify-between">
                    <h4 className="font-bold text-slate-800">Lista de Convidados Detalhada</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[800px]">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                          <th className="px-6 md:px-8 py-4">ID</th>
                          <th className="px-6 md:px-8 py-4">Nome</th>
                          <th className="px-6 md:px-8 py-4">WhatsApp</th>
                          <th className="px-6 md:px-8 py-4 text-right">Valor do Convite</th>
                          <th className="px-6 md:px-8 py-4 text-right">Total Pago</th>
                          <th className="px-6 md:px-8 py-4 text-center">Status</th>
                          <th className="px-6 md:px-8 py-4 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {adminStats.guests.filter(g => g.status === 'ativo').map((g) => {
                          const totalDue = g.valor_total !== undefined && g.valor_total !== null ? g.valor_total : ((adminStats as any).eventValue || 500);
                          const paid = g.paid || 0;
                          const status = paid >= totalDue ? 'QUITADO' : paid > 0 ? 'PARCIAL' : 'PENDENTE';
                          const statusColor = status === 'QUITADO' ? 'bg-emerald-100 text-emerald-600' : status === 'PARCIAL' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600';
                          
                          const approvedCompanions = g.companions ? g.companions.filter((c: any) => c.status === 'aprovado') : [];
                          const pendingCompanions = g.companions ? g.companions.filter((c: any) => c.status === 'pendente_aprovacao') : [];
                          const totalCompanionCount = (g.companions || []).length;
                          const approvedCompanionCount = approvedCompanions.length;

                          return (
                            <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 md:px-8 py-4">
                                <span className="font-mono text-xs font-bold text-slate-400">#{g.codigo_convidado || '---'}</span>
                              </td>
                              <td className="px-6 md:px-8 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="size-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                    {g.nome.substring(0, 2).toUpperCase()}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-sm">
                                      {g.nome} {totalCompanionCount > 0 ? <span className="text-blue-600 font-black">+{totalCompanionCount}</span> : ''}
                                    </span>
                                    {(g.companions || []).length > 0 && (
                                      <div className="mt-2 space-y-1">
                                        {(g.companions || []).map((c: any) => (
                                          <div key={c.id} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100">
                                            <div className="flex items-center gap-2">
                                              {c.instagram ? (
                                                <a 
                                                  href={`https://instagram.com/${c.instagram.replace('@', '')}`}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline decoration-blue-600/30 underline-offset-2 flex items-center gap-1 group"
                                                  title={`Ver Instagram de ${c.nome}`}
                                                >
                                                  {c.nome}
                                                  <Instagram className="size-2.5 group-hover:scale-110 transition-transform" />
                                                </a>
                                              ) : (
                                                <span className="text-[10px] font-bold text-slate-700">{c.nome}</span>
                                              )}
                                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${c.status === 'aprovado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {c.status === 'aprovado' ? 'Aprovado' : 'Pendente'}
                                              </span>
                                              <button 
                                                onClick={() => {
                                                  if (companionDeleteConfirmId === c.id) {
                                                    handleRemoveCompanion(c.id, g.id);
                                                  } else {
                                                    setCompanionDeleteConfirmId(c.id);
                                                    setTimeout(() => setCompanionDeleteConfirmId(null), 3000);
                                                  }
                                                }}
                                                className={`p-1.5 rounded transition-colors ${companionDeleteConfirmId === c.id ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}
                                                title={companionDeleteConfirmId === c.id ? "Clique novamente para confirmar" : "Excluir Acompanhante"}
                                              >
                                                {companionDeleteConfirmId === c.id ? <Check className="size-4" /> : <Trash2 className="size-4" />}
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 md:px-8 py-4">
                                <a 
                                  href={`https://wa.me/${(g.whatsapp || '').replace(/\D/g, '').length <= 11 ? '55' + (g.whatsapp || '').replace(/\D/g, '') : (g.whatsapp || '').replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-slate-600 text-sm hover:text-emerald-600 transition-colors flex items-center gap-2 group"
                                >
                                  <Phone className="size-3 text-green-500 group-hover:scale-110 transition-transform" />
                                  {g.whatsapp || 'N/A'}
                                </a>
                              </td>
                              <td className="px-6 md:px-8 py-4 text-right font-medium text-sm">{formatCurrency(totalDue)}</td>
                              <td className="px-6 md:px-8 py-4 text-right font-medium text-sm">{formatCurrency(g.paid)}</td>
                              <td className="px-6 md:px-8 py-4 text-center">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${statusColor}`}>
                                  {status}
                                </span>
                              </td>
                              <td className="px-6 md:px-8 py-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {status !== 'QUITADO' && (
                                    <button 
                                      onClick={() => {
                                        const amountDue = totalDue - g.paid;
                                        const template = templates.find(t => t.tipo === 'cobranca')?.conteudo || '';
                                        const displayName = g.companion_count && g.companion_count > 0 ? `${g.nome} (e acompanhantes)` : g.nome;
                                        const message = replaceTags(template, {
                                          nome_convidado: displayName,
                                          saldo_devedor: amountDue,
                                          nome_evento: config?.event.nome,
                                          chave_pix: config?.event.pixKey
                                        });
                                        const encodedMessage = encodeURIComponent(message);
                                        const phone = g.whatsapp.replace(/\D/g, '');
                                        const finalPhone = phone.length <= 11 ? `55${phone}` : phone;
                                        window.open(`https://wa.me/${finalPhone}?text=${encodedMessage}`, '_blank');
                                      }}
                                      className="p-2 rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors w-full sm:w-auto flex items-center justify-center"
                                      title="Cobrar via WhatsApp"
                                    >
                                      <MessageCircle className="size-4" />
                                      <span className="ml-2 sm:hidden">COBRAR</span>
                                    </button>
                                  )}
                                  {status !== 'QUITADO' && (
                                    <button 
                                      onClick={() => {
                                        const totalDue = (adminStats as any).eventValue || 500;
                                        setManualPaymentData({
                                          userId: g.id,
                                          userName: g.nome,
                                          amount: '',
                                          observation: '',
                                          totalDue,
                                          paid: g.paid
                                        });
                                        setShowManualPayment(true);
                                      }}
                                      className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors w-full sm:w-auto flex items-center justify-center"
                                      title="Quitar Manualmente"
                                    >
                                      <DollarSign className="size-4" />
                                      <span className="ml-2 sm:hidden">Quitar</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
            {adminTab === 'validation' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-slate-900">Validar Pagamentos</h3>
                  <p className="text-slate-500 text-sm font-medium">{pendingPayments.length} pendentes de validação</p>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  {pendingPayments.map((p) => (
                    <div key={p.id} className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4 md:gap-6">
                        <div className="size-14 md:size-16 rounded-xl bg-slate-100 overflow-hidden relative group cursor-pointer flex items-center justify-center shrink-0" onClick={() => p.comprovante_url && setSelectedReceipt(p.comprovante_url)}>
                          {p.comprovante_url ? (
                            <>
                              <img src={p.comprovante_url} alt="Comprovante" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Eye className="text-white size-6" />
                              </div>
                            </>
                          ) : (
                            <div className="flex flex-col items-center justify-center text-slate-400">
                              <XCircle className="size-6 mb-1" />
                              <span className="text-[8px] font-black uppercase">Sem Anexo</span>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-slate-900 text-base md:text-lg">{formatCurrency(p.valor)}</p>
                          <p className="text-sm font-bold text-slate-600 truncate">{p.user_name}</p>
                          <p className="text-[10px] md:text-xs text-slate-400 truncate">{p.user_email}</p>
                        </div>
                      </div>
                      <div className="flex gap-3 w-full md:w-auto">
                        <button 
                          onClick={() => handleAdminAction(p.id, 'reject')}
                          className="flex-1 md:flex-none px-4 md:px-6 py-3 rounded-xl border border-red-200 text-red-600 font-bold hover:bg-red-50 transition-all flex items-center justify-center gap-2 text-sm"
                        >
                          <XCircle className="size-4 md:size-5" />
                          Rejeitar
                        </button>
                        <button 
                          onClick={() => handleAdminAction(p.id, 'approve')}
                          className="flex-1 md:flex-none px-4 md:px-6 py-3 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 text-sm"
                        >
                          <CheckCircle className="size-4 md:size-5" />
                          Confirmar
                        </button>
                      </div>
                    </div>
                  ))}
                  {pendingPayments.length === 0 && (
                    <div className="bg-white p-20 rounded-3xl border border-dashed border-slate-200 text-center">
                      <CheckCircle className="size-12 text-emerald-500 mx-auto mb-4" />
                      <h4 className="text-xl font-bold text-slate-900">Tudo em dia!</h4>
                      <p className="text-slate-500">Não há pagamentos pendentes de validação.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {adminTab === 'guests' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">Gestão de Convidados</h3>
                    <p className="text-slate-500">Adicione, edite ou remova participantes do evento.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                      <button 
                        onClick={() => setGuestFilter('ativo')}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${guestFilter === 'ativo' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Ativos
                      </button>
                      <button 
                        onClick={() => setGuestFilter('pendente')}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all relative ${guestFilter === 'pendente' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Pendentes
                        {guests.filter(g => g.status === 'pendente').length > 0 && (
                          <span className="absolute -top-1 -right-1 size-4 bg-red-500 text-white text-[8px] flex items-center justify-center rounded-full animate-pulse">
                            {guests.filter(g => g.status === 'pendente').length}
                          </span>
                        )}
                      </button>
                      <button 
                        onClick={() => setGuestFilter('recusado')}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${guestFilter === 'recusado' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Recusados
                      </button>
                    </div>
                    <button 
                      onClick={() => {
                        setEditingGuest(null);
                        setGuestFormData({ 
                          nome: '', 
                          email: '', 
                          whatsapp: '', 
                          instagram: '', 
                          password: '',
                          valor_total: config?.event.valor.toString() || '',
                          acompanhantes_count: 0,
                          rsvp_status: ''
                        });
                        setShowGuestForm(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20"
                    >
                      <Plus className="size-5" />
                      <span className="hidden md:inline">Novo Convidado</span>
                    </button>
                  </div>
                </div>

                {/* Search and Filter System */}
                <div className="bg-white p-4 md:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
                      <input 
                        type="text"
                        placeholder="Buscar convidado..."
                        className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-900 font-medium"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <select 
                        className="px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-900 font-bold text-sm min-w-[140px]"
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value as any)}
                      >
                        <option value="nome">Nome</option>
                        <option value="id">ID (Código)</option>
                        <option value="instagram">Instagram</option>
                        <option value="whatsapp">WhatsApp</option>
                      </select>
                      <button 
                        onClick={() => {
                          setSearchQuery('');
                          setSearchFilter('nome');
                        }}
                        className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold hover:bg-slate-50 transition-all flex items-center gap-2 whitespace-nowrap"
                      >
                        <X className="size-4" />
                        Limpar Filtros
                      </button>
                    </div>
                  </div>
                </div>

                {/* Update All Values Section */}
                <div className="bg-amber-50 border border-amber-200 p-4 md:p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="size-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                      <RefreshCw className="size-6" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900">Atualizar Valor de Todos</h4>
                      <p className="text-sm text-slate-600 font-medium">Define um novo valor de convite para TODOS os convidados cadastrados.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-32">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                      <input 
                        type="number"
                        placeholder="0,00"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all outline-none text-slate-900 font-bold text-sm"
                        value={updateAllValue}
                        onChange={(e) => setUpdateAllValue(e.target.value)}
                      />
                    </div>
                    <button 
                      onClick={() => setShowUpdateAllConfirm(true)}
                      disabled={!updateAllValue || loading}
                      className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-amber-500/20 text-sm whitespace-nowrap"
                    >
                      Atualizar Todos
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">ID</th>
                          <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Nome</th>
                          <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Contato</th>
                          <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Valor Convite</th>
                          <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Saldo Devedor</th>
                          <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {guests.filter(g => {
                          const matchesStatus = (g.status || 'ativo') === guestFilter;
                          if (!matchesStatus) return false;
                          
                          if (!searchQuery) return true;
                          
                          const query = searchQuery.toLowerCase();
                          switch (searchFilter) {
                            case 'nome':
                              return g.nome.toLowerCase().includes(query);
                            case 'id':
                              return (g.codigo_convidado || '').toLowerCase().includes(query);
                            case 'instagram':
                              return (g.instagram || '').toLowerCase().includes(query);
                            case 'whatsapp':
                              return (g.whatsapp || '').toLowerCase().includes(query);
                            default:
                              return true;
                          }
                        }).map((g) => {
                          const guestStats = adminStats?.guests.find(as => as.id === g.id);
                          const paid = guestStats?.paid || 0;
                          const totalDue = g.valor_total !== undefined && g.valor_total !== null ? g.valor_total : (adminStats?.eventValue || 500);
                          const amountDue = totalDue - paid;
                          
                          return (
                            <tr key={g.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4">
                                <span className="font-mono text-xs font-bold text-slate-400">#{g.codigo_convidado || '---'}</span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="size-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">
                                    {g.nome.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold text-slate-900 truncate">{g.nome}</p>
                                    <p className="text-[10px] md:text-xs text-slate-500 truncate">{g.email}</p>
                                    
                                    {g.companions && g.companions.length > 0 && (
                                      <div className="mt-2 space-y-1">
                                        {g.companions.map((c: any) => (
                                          <div key={c.id} className="flex items-center justify-between bg-slate-50 p-1.5 rounded-lg border border-slate-100 text-[10px]">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                              <span className="font-bold text-slate-700 truncate">{c.nome}</span>
                                              <span className={`px-1.5 py-0.5 rounded-full font-black uppercase text-[8px] ${
                                                c.status === 'aprovado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                              }`}>
                                                {c.status === 'aprovado' ? 'Aprovado' : 'Pendente'}
                                              </span>
                                            </div>
                                            {c.status === 'pendente_aprovacao' && (
                                              <div className="flex items-center gap-1 shrink-0 ml-2">
                                                <button 
                                                  onClick={() => handleApproveCompanion(c.id)}
                                                  className="p-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded transition-colors"
                                                  title="Aprovar Acompanhante"
                                                >
                                                  <Check className="size-3" />
                                                </button>
                                                <button 
                                                  onClick={() => handleRejectCompanion(c.id)}
                                                  className="p-1 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                                                  title="Recusar Acompanhante"
                                                >
                                                  <X className="size-3" />
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col gap-1">
                                  <a 
                                    href={`https://wa.me/${(g.whatsapp || '').replace(/\D/g, '').length <= 11 ? '55' + (g.whatsapp || '').replace(/\D/g, '') : (g.whatsapp || '').replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 text-slate-600 hover:text-emerald-600 transition-colors group"
                                  >
                                    <Phone className="size-3 text-green-500 group-hover:scale-110 transition-transform" />
                                    <span className="text-xs font-medium">{g.whatsapp || 'N/A'}</span>
                                  </a>
                                  {g.instagram && (
                                    <a 
                                      href={`https://instagram.com/${g.instagram.replace('@', '')}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center gap-2 text-slate-600 hover:text-pink-600 transition-colors group"
                                    >
                                      <Instagram className="size-3 text-pink-500 group-hover:scale-110 transition-transform" />
                                      <span className="text-[10px] font-medium">{g.instagram}</span>
                                    </a>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className="text-sm font-bold text-slate-900">{formatCurrency(totalDue)}</span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className={`text-sm font-black ${amountDue <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {formatCurrency(amountDue)}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-1 md:gap-2">
                                  {g.status === 'pendente' ? (
                                    <>
                                      <button 
                                        onClick={() => handleApproveGuest(g.id)}
                                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1"
                                      >
                                        <Check className="size-3" />
                                        Aprovar
                                      </button>
                                      <button 
                                        onClick={() => {
                                          if (rejectGuestConfirmId === g.id) {
                                            handleRejectGuest(g.id);
                                          } else {
                                            setRejectGuestConfirmId(g.id);
                                            setTimeout(() => setRejectGuestConfirmId(null), 3000);
                                          }
                                        }}
                                        className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1 ${rejectGuestConfirmId === g.id ? 'bg-red-700 text-white animate-pulse' : 'bg-red-500 hover:bg-red-600 text-white'}`}
                                        title={rejectGuestConfirmId === g.id ? "Clique novamente para confirmar" : "Recusar"}
                                      >
                                        <X className="size-3" />
                                        {rejectGuestConfirmId === g.id ? "Confirmar?" : "Recusar"}
                                      </button>
                                    </>
                                  ) : g.status === 'recusado' ? (
                                    <>
                                      <button 
                                        onClick={() => handleReactivateGuest(g.id)}
                                        className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1"
                                      >
                                        <RefreshCw className="size-3" />
                                        Reativar
                                      </button>
                                      <button 
                                        onClick={() => {
                                          if (deleteConfirmId === g.id) {
                                            handleDeleteGuest(g.id);
                                          } else {
                                            setDeleteConfirmId(g.id);
                                            setTimeout(() => setDeleteConfirmId(null), 3000);
                                          }
                                        }}
                                        className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1 ${deleteConfirmId === g.id ? 'bg-red-700 text-white animate-pulse' : 'bg-red-500 hover:bg-red-600 text-white'}`}
                                        title={deleteConfirmId === g.id ? "Clique novamente para confirmar" : "Excluir Permanentemente"}
                                      >
                                        <Trash2 className="size-3" />
                                        {deleteConfirmId === g.id ? "Confirmar?" : "Excluir"}
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button 
                                        onClick={() => {
                                          const template = templates.find(t => t.tipo === 'wa_cobranca')?.conteudo || '';
                                          const message = replaceTags(template, {
                                            nome_convidado: g.nome,
                                            saldo_devedor: amountDue,
                                            nome_evento: config?.event.nome,
                                            chave_pix: config?.event.pixKey
                                          });
                                          const encodedMessage = encodeURIComponent(message);
                                          const phone = g.whatsapp?.replace(/\D/g, '') || '';
                                          const finalPhone = phone.length <= 11 ? `55${phone}` : phone;
                                          window.open(`https://wa.me/${finalPhone}?text=${encodedMessage}`, '_blank');
                                        }}
                                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all flex items-center gap-2"
                                        title="Cobrar via WhatsApp"
                                      >
                                        <MessageCircle className="size-4 md:size-5" />
                                        <span className="sr-only sm:not-sr-only sm:text-[10px] sm:font-bold sm:uppercase">COBRAR</span>
                                      </button>
                                      <button 
                                        onClick={() => {
                                          if (paid >= totalDue) return;
                                          setManualPaymentData({
                                            userId: g.id,
                                            userName: g.nome,
                                            amount: '',
                                            observation: '',
                                            totalDue,
                                            paid
                                          });
                                          setShowManualPayment(true);
                                        }}
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all flex items-center gap-2"
                                        title="Quitar Manualmente"
                                      >
                                        <DollarSign className="size-4 md:size-5" />
                                        <span className="sr-only sm:not-sr-only sm:text-[10px] sm:font-bold sm:uppercase">Quitar</span>
                                      </button>
                                      <button 
                                        onClick={() => {
                                          setEditingGuest(g);
                                          setGuestFormData({
                                            nome: g.nome,
                                            email: g.email,
                                            whatsapp: g.whatsapp || '',
                                            instagram: g.instagram || '',
                                            password: '',
                                            valor_total: g.valor_total?.toString() || '',
                                            acompanhantes_count: g.acompanhantes_count || 0,
                                            rsvp_status: g.rsvp_status || ''
                                          });
                                          setShowGuestForm(true);
                                        }}
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                      >
                                        <Edit className="size-4 md:size-5" />
                                      </button>
                                      <button 
                                        onClick={() => {
                                          if (deleteConfirmId === g.id) {
                                            handleDeleteGuest(g.id);
                                          } else {
                                            setDeleteConfirmId(g.id);
                                            setTimeout(() => setDeleteConfirmId(null), 3000);
                                          }
                                        }}
                                        className={`p-2 rounded-lg transition-all ${deleteConfirmId === g.id ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}
                                        title={deleteConfirmId === g.id ? "Clique novamente para confirmar" : "Excluir Convidado"}
                                      >
                                        {deleteConfirmId === g.id ? <Check className="size-4 md:size-5" /> : <Trash2 className="size-4 md:size-5" />}
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {guests.filter(g => (g.status || 'ativo') === guestFilter).length === 0 && (
                    <div className="p-20 text-center">
                      <Users className="size-12 text-slate-200 mx-auto mb-4" />
                      <p className="text-slate-500">Nenhum convidado encontrado nesta categoria.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {adminTab === 'messages' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col gap-1">
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Modelos de Mensagens</h2>
                  <p className="text-slate-500 font-medium">Personalize os textos enviados via WhatsApp para seus convidados.</p>
                </div>

                <form onSubmit={handleSaveTemplates} className="space-y-8">
                  <div className="grid grid-cols-1 gap-8">
                    {[
                      { id: 'wa_cobranca', label: 'WhatsApp: Cobrança', desc: 'Enviado ao clicar no ícone de WhatsApp na lista de convidados.' },
                      { id: 'wa_confirmacao_pix', label: 'WhatsApp: Confirmação de Pix', desc: 'Enviado após aprovar um comprovante no painel.' },
                      { id: 'wa_baixa_manual', label: 'WhatsApp: Baixa Manual', desc: 'Enviado após registrar um pagamento manual (dinheiro).' },
                      { id: 'wa_welcome', label: 'WhatsApp: Boas-vindas', desc: 'Enviado após o cadastro.' },
                      { id: 'wa_approval_guest', label: 'WhatsApp: Aprovação', desc: 'Enviado quando o convidado é aprovado.' },
                      { id: 'wa_approval_companion', label: 'WhatsApp: Acompanhante', desc: 'Enviado quando um acompanhante é aprovado.' },
                      { id: 'wa_payment_confirm', label: 'WhatsApp: Pagamento', desc: 'Enviado após confirmação de pagamento.' },
                      
                      { id: 'email_welcome', label: 'E-mail: Boas-vindas', desc: 'Enviado após o cadastro.' },
                      { id: 'email_approval_guest', label: 'E-mail: Aprovação', desc: 'Enviado quando o convidado é aprovado.' },
                      { id: 'email_approval_companion', label: 'E-mail: Acompanhante', desc: 'Enviado quando um acompanhante é aprovado.' },
                      { id: 'email_payment_confirm', label: 'E-mail: Pagamento', desc: 'Enviado após confirmação de pagamento.' },
                      { id: 'email_password_recovery', label: 'E-mail: Recuperação de Senha', desc: 'Enviado ao solicitar nova senha.' }
                    ].map((t) => (
                      <div key={t.id} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-4">
                        <div className="flex flex-col gap-1">
                          <h4 className="font-bold text-slate-900">{t.label}</h4>
                          <p className="text-xs text-slate-500">{t.desc}</p>
                        </div>
                        <textarea 
                          className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-900 min-h-[120px] font-medium text-sm"
                          value={templates.find(temp => temp.tipo === t.id)?.conteudo || ''}
                          onChange={(e) => {
                            const newTemplates = [...templates];
                            const index = newTemplates.findIndex(temp => temp.tipo === t.id);
                            if (index !== -1) {
                              newTemplates[index].conteudo = e.target.value;
                              setTemplates(newTemplates);
                            }
                          }}
                          placeholder="Digite o modelo da mensagem..."
                          required
                        />
                        <div className="flex flex-wrap gap-2">
                          {['{nome}', '{id}', '{codigo_convidado}', '{valor}', '{link}', '{evento}', '{saldo}', '{chave_pix}'].map(tag => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => {
                                const newTemplates = [...templates];
                                const index = newTemplates.findIndex(temp => temp.tipo === t.id);
                                if (index !== -1) {
                                  newTemplates[index].conteudo += tag;
                                  setTemplates(newTemplates);
                                }
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] font-bold transition-colors"
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <button 
                      type="submit"
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-black px-10 py-4 rounded-2xl transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50"
                    >
                      {loading ? 'Salvando...' : 'Salvar Modelos'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {adminTab === 'settings' && config && (
              <div className="max-w-4xl space-y-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-900">Configurações do Sistema</h3>
                  <p className="text-slate-500">Gerencie os dados do evento, organizador e segurança.</p>
                </div>

                <form onSubmit={handleSaveConfig} className="space-y-6">
                  {/* Seção Organizador */}
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                      <User className="text-blue-600 size-6" />
                      <h4 className="font-bold text-slate-900">Dados do Organizador</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Input 
                        label="Nome" 
                        icon={User} 
                        value={configForm.organizador.nome}
                        onChange={(e: any) => setConfigForm({
                          ...configForm, 
                          organizador: { ...configForm.organizador, nome: e.target.value }
                        })}
                      />
                      <Input 
                        label="E-mail de Login" 
                        icon={Mail} 
                        type="email"
                        value={configForm.organizador.email}
                        onChange={(e: any) => setConfigForm({
                          ...configForm, 
                          organizador: { ...configForm.organizador, email: e.target.value }
                        })}
                      />
                      <Input 
                        label="WhatsApp" 
                        icon={Phone} 
                        value={configForm.organizador.whatsapp}
                        onChange={(e: any) => setConfigForm({
                          ...configForm, 
                          organizador: { ...configForm.organizador, whatsapp: e.target.value }
                        })}
                      />
                    </div>
                  </div>

                  {/* Seção E-mail */}
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <Mail className="text-blue-600 size-6" />
                        <h4 className="font-bold text-slate-900">Configuração de E-mail</h4>
                      </div>
                      
                      <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setConfigForm({ ...configForm, event: { ...configForm.event, email_method: 'smtp' } })}
                          className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${configForm.event.email_method === 'smtp' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          SMTP
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfigForm({ ...configForm, event: { ...configForm.event, email_method: 'resend' } })}
                          className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${configForm.event.email_method === 'resend' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          Resend API
                        </button>
                      </div>
                    </div>

                    {configForm.event.email_method === 'resend' ? (
                      <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
                          <Info className="size-5 text-blue-600 mt-0.5" />
                          <p className="text-xs text-blue-800 leading-relaxed">
                            O <strong>Resend</strong> é uma plataforma moderna para envio de e-mails. 
                            Ao usar a API Key, o sistema ignora as configurações de SMTP e utiliza a infraestrutura do Resend para maior confiabilidade.
                          </p>
                        </div>
                        <Input 
                          id="resend_api_key"
                          name="resend_api_key"
                          label="API Key do Resend" 
                          icon={Key} 
                          type="password"
                          autoComplete="off"
                          placeholder="re_123456789..."
                          value={configForm.event.resend_api_key || ''}
                          onChange={(e: any) => setConfigForm({
                            ...configForm, 
                            event: { ...configForm.event, resend_api_key: e.target.value }
                          })}
                        />
                        <Input 
                          label="E-mail do Remetente" 
                          icon={Mail} 
                          placeholder="contato@seudominio.com"
                          value={configForm.event.from_email || ''}
                          onChange={(e: any) => setConfigForm({
                            ...configForm, 
                            event: { ...configForm.event, from_email: e.target.value }
                          })}
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2">
                        <Input 
                          label="Host SMTP" 
                          icon={Globe} 
                          placeholder="smtp.exemplo.com"
                          value={configForm.event.smtp_host || ''}
                          onChange={(e: any) => setConfigForm({
                            ...configForm, 
                            event: { ...configForm.event, smtp_host: e.target.value }
                          })}
                        />
                        <Input 
                          label="Porta SMTP" 
                          icon={Hash} 
                          type="number"
                          placeholder="587 ou 465"
                          value={configForm.event.smtp_port || ''}
                          onChange={(e: any) => setConfigForm({
                            ...configForm, 
                            event: { ...configForm.event, smtp_port: Number(e.target.value) }
                          })}
                        />
                        <Input 
                          label="Usuário SMTP" 
                          icon={User} 
                          placeholder="contato@exemplo.com"
                          value={configForm.event.smtp_user || ''}
                          onChange={(e: any) => setConfigForm({
                            ...configForm, 
                            event: { ...configForm.event, smtp_user: e.target.value }
                          })}
                        />
                        <Input 
                          id="smtp_password"
                          name="smtp_password"
                          label="Senha SMTP" 
                          icon={Lock} 
                          type="password"
                          autoComplete="off"
                          placeholder="••••••••"
                          value={configForm.event.smtp_pass || ''}
                          onChange={(e: any) => setConfigForm({
                            ...configForm, 
                            event: { ...configForm.event, smtp_pass: e.target.value }
                          })}
                        />
                      </div>
                    )}

                    <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                        Método selecionado: <span className="text-blue-600">{configForm.event.email_method === 'resend' ? 'Resend API' : 'SMTP'}</span>
                      </p>
                      <button
                        type="button"
                        onClick={async () => {
                          const email = configForm.organizador.email;
                          if (!email) {
                            showToast("E-mail do administrador não configurado", "error");
                            return;
                          }
                          
                          setLoading(true);
                          try {
                            const res = await fetch('/api/admin/test-email', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ email, config: configForm.event })
                            });
                            const data = await res.json();
                            if (res.ok) {
                              showToast(data.message, 'success');
                            } else {
                              showToast(data.error || "Erro ao enviar e-mail de teste", 'error');
                            }
                          } catch (error: any) {
                            showToast(error.message || "Erro ao enviar e-mail de teste", "error");
                          } finally {
                            setLoading(false);
                          }
                        }}
                        className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        <Send className="size-3" />
                        Enviar E-mail de Teste
                      </button>
                    </div>
                  </div>

                  {/* Seção Evento */}
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-8">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                      <PartyPopper className="text-blue-600 size-6" />
                      <h4 className="font-bold text-slate-900">Configurações do Evento</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <Input 
                          label="Nome do Evento" 
                          icon={PartyPopper} 
                          value={configForm.event.nome}
                          onChange={(e: any) => setConfigForm({ ...configForm, event: { ...configForm.event, nome: e.target.value } })}
                          required
                        />
                        <Input 
                          label="Local do Evento" 
                          icon={MapPin} 
                          value={configForm.event.local}
                          onChange={(e: any) => setConfigForm({ ...configForm, event: { ...configForm.event, local: e.target.value } })}
                          required
                        />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Input 
                            label="Data" 
                            icon={Calendar} 
                            value={configForm.event.data}
                            onChange={(e: any) => setConfigForm({ ...configForm, event: { ...configForm.event, data: e.target.value } })}
                            required
                          />
                          <Input 
                            label="Valor (R$)" 
                            icon={Wallet} 
                            type="number"
                            value={configForm.event.valor}
                            onChange={(e: any) => setConfigForm({ ...configForm, event: { ...configForm.event, valor: Number(e.target.value) } })}
                            required
                          />
                          <Input 
                            label="Lotação Máxima do Evento" 
                            icon={Users} 
                            type="number"
                            value={configForm.event.capacidade_maxima || 50}
                            onChange={(e: any) => setConfigForm({ ...configForm, event: { ...configForm.event, capacidade_maxima: Number(e.target.value) } })}
                            required
                          />
                          <Input 
                            label="Limite de Acompanhantes" 
                            icon={Users} 
                            type="number"
                            value={configForm.event.limite_acompanhantes || 4}
                            onChange={(e: any) => setConfigForm({ ...configForm, event: { ...configForm.event, limite_acompanhantes: Number(e.target.value) } })}
                            required
                          />
                          <Input 
                            label="Prazo Limite para Confirmação" 
                            icon={Clock} 
                            type="datetime-local"
                            value={configForm.event.prazo_rsvp || ''}
                            onChange={(e: any) => setConfigForm({ ...configForm, event: { ...configForm.event, prazo_rsvp: e.target.value } })}
                          />
                        </div>
                        <Input 
                          label="Chave Pix para Recebimento" 
                          icon={QrCode} 
                          placeholder="E-mail, CPF, CNPJ ou Chave Aleatória"
                          value={configForm.event.pixKey}
                          onChange={(e: any) => setConfigForm({ ...configForm, event: { ...configForm.event, pixKey: e.target.value } })}
                          required
                        />
                        <Input 
                          label="URL do Sistema (Link Oficial)" 
                          icon={Globe} 
                          placeholder="https://sua-resenha.up.railway.app"
                          value={configForm.event.system_url || ''}
                          onChange={(e: any) => setConfigForm({ ...configForm, event: { ...configForm.event, system_url: e.target.value } })}
                          required
                        />
                        <div className="space-y-3">
                          <label className="text-sm font-black text-slate-700 uppercase tracking-widest ml-1">Informações da Resenha (Avisos/Detalhes)</label>
                          <textarea 
                            className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium text-sm min-h-[120px]"
                            placeholder="Digite aqui avisos, regras ou detalhes importantes do evento..."
                            value={configForm.event.info_texto || ''}
                            onChange={(e: any) => setConfigForm({ ...configForm, event: { ...configForm.event, info_texto: e.target.value } })}
                          />
                        </div>
                      </div>

                      <div className="space-y-8">
                        {/* Flyer Landing */}
                        <div className="space-y-3">
                          <label className="text-sm font-black text-slate-700 uppercase tracking-widest ml-1">Flyer de Cadastro (Banner Desktop)</label>
                          <div className="relative group w-full rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 overflow-hidden flex flex-col items-center justify-center hover:border-blue-400 transition-all min-h-[200px]">
                            {configForm.event.flyer_landing ? (
                              <>
                                <img src={configForm.event.flyer_landing} alt="Prévia do Banner" className="max-w-full h-auto block" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                  <label className="cursor-pointer bg-white text-slate-900 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform">
                                    Alterar
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'flyer_landing')} />
                                  </label>
                                  <button 
                                    type="button"
                                    onClick={() => setConfigForm(prev => ({ ...prev, event: { ...prev.event, flyer_landing: '' } }))}
                                    className="bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform"
                                  >
                                    Remover
                                  </button>
                                </div>
                              </>
                            ) : (
                              <label className="cursor-pointer flex flex-col items-center gap-3 py-10">
                                <Upload className="size-10 text-slate-300" />
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center px-4">Upload Flyer Landing (Banner)</span>
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'flyer_landing')} />
                              </label>
                            )}
                          </div>
                        </div>

                        {/* Flyer Landing Mobile */}
                        <div className="space-y-3">
                          <label className="text-sm font-black text-slate-700 uppercase tracking-widest ml-1">Flyer de Cadastro (Mobile Vertical)</label>
                          <div className="relative group w-full max-w-[250px] aspect-[9/16] mx-auto rounded-[2rem] bg-slate-100 border-4 border-white shadow-lg overflow-hidden flex flex-col items-center justify-center hover:scale-[1.02] transition-all">
                            {configForm.event.flyer_landing_mobile ? (
                              <>
                                <img src={configForm.event.flyer_landing_mobile} alt="Prévia Mobile" className="w-full h-full object-cover block" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                  <label className="cursor-pointer bg-white text-slate-900 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform">
                                    Alterar
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'flyer_landing_mobile')} />
                                  </label>
                                  <button 
                                    type="button"
                                    onClick={() => setConfigForm(prev => ({ ...prev, event: { ...prev.event, flyer_landing_mobile: '' } }))}
                                    className="bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform"
                                  >
                                    Remover
                                  </button>
                                </div>
                              </>
                            ) : (
                              <label className="cursor-pointer flex flex-col items-center gap-3 py-10 w-full h-full justify-center">
                                <Upload className="size-10 text-slate-300" />
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center px-4">Upload Flyer Landing (Mobile)</span>
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'flyer_landing_mobile')} />
                              </label>
                            )}
                          </div>
                        </div>

                        {/* Flyer Dashboard */}
                        <div className="space-y-3">
                          <label className="text-sm font-black text-slate-700 uppercase tracking-widest ml-1">Flyer do Painel (Dashboard)</label>
                          <div className="relative group w-full rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 overflow-hidden flex flex-col items-center justify-center hover:border-blue-400 transition-all min-h-[200px]">
                            {configForm.event.flyer_dashboard ? (
                              <>
                                <img src={configForm.event.flyer_dashboard} alt="Prévia do Painel" className="max-w-full h-auto block" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                  <label className="cursor-pointer bg-white text-slate-900 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform">
                                    Alterar
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'flyer_dashboard')} />
                                  </label>
                                  <button 
                                    type="button"
                                    onClick={() => setConfigForm(prev => ({ ...prev, event: { ...prev.event, flyer_dashboard: '' } }))}
                                    className="bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform"
                                  >
                                    Remover
                                  </button>
                                </div>
                              </>
                            ) : (
                              <label className="cursor-pointer flex flex-col items-center gap-3 py-10">
                                <Upload className="size-10 text-slate-300" />
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center px-4">Upload Flyer Dashboard</span>
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'flyer_dashboard')} />
                              </label>
                            )}
                          </div>
                        </div>

                        {/* Flyer Informativo */}
                        <div className="space-y-3">
                          <label className="text-sm font-black text-slate-700 uppercase tracking-widest ml-1">Flyer Informativo (Arte do Evento)</label>
                          <div className="relative group w-full rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 overflow-hidden flex flex-col items-center justify-center hover:border-blue-400 transition-all min-h-[200px]">
                            {configForm.event.flyer_info ? (
                              <>
                                <img src={configForm.event.flyer_info} alt="Prévia Informativo" className="max-w-full h-auto block" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                  <label className="cursor-pointer bg-white text-slate-900 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform">
                                    Alterar
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'flyer_info')} />
                                  </label>
                                  <button 
                                    type="button"
                                    onClick={() => setConfigForm(prev => ({ ...prev, event: { ...prev.event, flyer_info: '' } }))}
                                    className="bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform"
                                  >
                                    Remover
                                  </button>
                                </div>
                              </>
                            ) : (
                              <label className="cursor-pointer flex flex-col items-center gap-3 py-10">
                                <Upload className="size-10 text-slate-300" />
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center px-4">Upload Flyer Informativo</span>
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'flyer_info')} />
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                  <div className="flex justify-end">
                    <button 
                      type="submit"
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-black px-10 py-4 rounded-2xl transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50"
                    >
                      {loading ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                  </div>
                </form>

                {/* Seção Segurança */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <Lock className="text-red-600 size-6" />
                    <h4 className="font-bold text-slate-900">Segurança</h4>
                  </div>
                  <form onSubmit={handleChangePassword} method="POST" className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    <Input 
                      id="current_user_secure_password"
                      name="current_user_secure_password"
                      label="Senha Atual" 
                      icon={Lock} 
                      type="password"
                      autoComplete="current-password"
                      value={passwordForm.current}
                      onChange={(e: any) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                      required
                    />
                    <Input 
                      id="user_secure_password"
                      name="user_secure_password"
                      label="Nova Senha" 
                      icon={Lock} 
                      type="password"
                      autoComplete="new-password"
                      value={passwordForm.new}
                      onChange={(e: any) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                      required
                    />
                    <Input 
                      id="confirm_user_secure_password"
                      name="confirm_user_secure_password"
                      label="Confirmar Nova Senha" 
                      icon={Lock} 
                      type="password"
                      autoComplete="new-password"
                      value={passwordForm.confirm}
                      onChange={(e: any) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                      required
                    />
                    <div className="md:col-span-3 flex justify-end">
                      <button 
                        type="submit"
                        disabled={loading}
                        className="bg-slate-900 hover:bg-black text-white font-bold px-8 py-3 rounded-xl transition-all disabled:opacity-50"
                      >
                        Alterar Senha
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {adminTab === 'logs' && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-3">
                      <History className="text-blue-600 size-6" />
                      <h4 className="font-bold text-slate-900">Histórico de Atividades</h4>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                        <input 
                          type="text" 
                          placeholder="Filtrar por ID (ex: 123456)"
                          value={logSearchId}
                          onChange={(e) => setLogSearchId(e.target.value)}
                          className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none w-64"
                        />
                      </div>
                      <button 
                        onClick={fetchLogs}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-blue-600"
                      >
                        <RefreshCw className="size-5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {logs.filter(log => logSearchId ? log.usuario_nome.includes(logSearchId) : true).length === 0 ? (
                      <div className="text-center py-12">
                        <History className="size-12 text-slate-200 mx-auto mb-4" />
                        <p className="text-slate-400 font-medium">Nenhuma atividade encontrada para os critérios de busca.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100">
                              <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Data/Hora</th>
                              <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Usuário / ID</th>
                              <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Ação</th>
                              <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Mensagem</th>
                            </tr>
                          </thead>
                          <tbody>
                            {logs
                              .filter(log => logSearchId ? log.usuario_nome.includes(logSearchId) : true)
                              .map((log) => (
                              <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                <td className="py-4 px-4 whitespace-nowrap">
                                  <span className="text-xs font-bold text-slate-500">
                                    {new Date(log.data_hora).toLocaleString('pt-BR')}
                                  </span>
                                </td>
                                <td className="py-4 px-4">
                                  <span className="text-xs font-black text-slate-900 uppercase tracking-tight">
                                    {log.usuario_nome}
                                  </span>
                                </td>
                                <td className="py-4 px-4">
                                  <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
                                    log.acao === 'Cadastro' ? 'bg-emerald-100 text-emerald-700' :
                                    log.acao === 'Aprovação de Pix' ? 'bg-blue-100 text-blue-700' :
                                    log.acao === 'Rejeição de Pix' ? 'bg-red-100 text-red-700' :
                                    log.acao === 'Baixa Manual' ? 'bg-amber-100 text-amber-700' :
                                    'bg-slate-100 text-slate-700'
                                  }`}>
                                    {log.acao}
                                  </span>
                                </td>
                                <td className="py-4 px-4">
                                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                                    {log.mensagem}
                                  </p>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Modal de Formulário de Convidado */}
          {showGuestForm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
              >
                <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="text-xl font-black text-slate-900">
                    {editingGuest ? 'Editar Convidado' : 'Novo Convidado'}
                  </h3>
                  <button onClick={() => setShowGuestForm(false)} className="text-slate-400 hover:text-slate-600">
                    <Plus className="size-6 rotate-45" />
                  </button>
                </div>
                <form onSubmit={handleSaveGuest} method="POST" className="p-8 space-y-4">
                  <Input 
                    id="guest_name"
                    name="name"
                    label="Nome Completo" 
                    icon={User} 
                    placeholder="Ex: João Silva"
                    value={guestFormData.nome}
                    onChange={(e: any) => setGuestFormData({...guestFormData, nome: e.target.value})}
                    required
                  />
                  <Input 
                    id="guest_email"
                    name="email"
                    label="E-mail" 
                    icon={Mail} 
                    type="email"
                    autoComplete="email"
                    placeholder="joao@email.com"
                    value={guestFormData.email}
                    onChange={(e: any) => setGuestFormData({...guestFormData, email: e.target.value})}
                    required
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input 
                      id="guest_whatsapp"
                      name="whatsapp"
                      label="WhatsApp" 
                      icon={Phone} 
                      placeholder="(11) 99999-9999"
                      value={guestFormData.whatsapp}
                      onChange={(e: any) => setGuestFormData({...guestFormData, whatsapp: e.target.value})}
                      required
                    />
                    <Input 
                      id="guest_instagram"
                      name="instagram"
                      label="Instagram" 
                      icon={Instagram} 
                      placeholder="@usuario"
                      value={guestFormData.instagram}
                      onChange={(e: any) => setGuestFormData({...guestFormData, instagram: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input 
                      id="guest_value"
                      name="value"
                      label="Valor Convite (R$)" 
                      icon={Wallet} 
                      type="number"
                      step="0.01"
                      placeholder={config?.event.valor.toString()}
                      value={guestFormData.valor_total}
                      onChange={(e: any) => setGuestFormData({...guestFormData, valor_total: e.target.value})}
                      required
                    />
                    <Input 
                      id="guest_companions"
                      name="companions"
                      label="Qtd Acomp." 
                      icon={Users} 
                      type="number"
                      min="0"
                      max={config?.event.limite_acompanhantes || 4}
                      value={guestFormData.acompanhantes_count || 0}
                      onChange={(e: any) => {
                        const val = parseInt(e.target.value) || 0;
                        const limit = config?.event.limite_acompanhantes || 4;
                        if (val > limit) {
                          showToast(`O limite máximo de acompanhantes para este evento é ${limit}`, 'error');
                          setGuestFormData({...guestFormData, acompanhantes_count: limit});
                        } else {
                          setGuestFormData({...guestFormData, acompanhantes_count: val});
                        }
                      }}
                    />
                  </div>
                  {!editingGuest && (
                    <Input 
                      id="user_secure_password"
                      name="user_secure_password"
                      label="Senha Provisória" 
                      icon={Lock} 
                      type="password" 
                      autoComplete="new-password"
                      placeholder="Mínimo 6 caracteres"
                      value={guestFormData.password}
                      onChange={(e: any) => setGuestFormData({...guestFormData, password: e.target.value})}
                      required
                    />
                  )}
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Status RSVP</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
                      <select 
                        className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-900 font-medium appearance-none"
                        value={guestFormData.rsvp_status}
                        onChange={(e) => setGuestFormData({...guestFormData, rsvp_status: e.target.value})}
                      >
                        <option value="">Pendente</option>
                        <option value="confirmado">Confirmado</option>
                        <option value="desistente">Desistente</option>
                        <option value="lista_espera">Lista de Espera</option>
                      </select>
                    </div>
                  </div>
                  <div className="pt-4 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setShowGuestForm(false)}
                      className="flex-1 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-blue-600/20"
                    >
                      {editingGuest ? 'Salvar Alterações' : 'Cadastrar Convidado'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}

          {/* Modal de Formulário de Acompanhante */}
          {showCompanionForm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
              >
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-blue-600 text-white">
                  <h3 className="text-xl font-black">Novo Acompanhante</h3>
                  <button onClick={() => setShowCompanionForm(false)} className="text-white/60 hover:text-white">
                    <XCircle className="size-6" />
                  </button>
                </div>
                <form onSubmit={handleAddCompanion} className="p-8 space-y-6">
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-2">
                    <p className="text-xs text-blue-700 font-medium leading-relaxed">
                      Ao adicionar um acompanhante, o valor de <span className="font-black">{formatCurrency(config?.event.valor || 0)}</span> será somado ao seu saldo devedor.
                    </p>
                  </div>
                  <Input 
                    label="Nome Completo" 
                    icon={User} 
                    placeholder="Ex: Maria Souza"
                    value={companionFormData.nome}
                    onChange={(e: any) => setCompanionFormData({...companionFormData, nome: e.target.value})}
                    required
                  />
                  <Input 
                    label="Instagram (@)" 
                    icon={Instagram} 
                    placeholder="@maria.souza"
                    value={companionFormData.instagram}
                    onChange={(e: any) => setCompanionFormData({...companionFormData, instagram: e.target.value})}
                  />
                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                  >
                    {loading ? <Clock className="size-5 animate-spin" /> : <CheckCircle className="size-5" />}
                    Confirmar Adição
                  </button>
                </form>
              </motion.div>
            </div>
          )}

          {/* Modal de Prévia do Comprovante */}
          {selectedReceipt && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-md" onClick={() => setSelectedReceipt(null)}>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-4xl max-h-full overflow-hidden rounded-3xl shadow-2xl">
                <img src={selectedReceipt} alt="Prévia do Comprovante" className="max-w-full max-h-[80vh] object-contain" />
              </motion.div>
            </div>
          )}

          {/* Confirmation Modal for Update All */}
          <AnimatePresence>
            {showUpdateAllConfirm && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="bg-white rounded-[2.5rem] p-8 md:p-10 max-w-md w-full shadow-2xl border border-slate-100 text-center"
                >
                  <div className="size-20 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <RefreshCw className="size-10 animate-spin-slow" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-3">Confirmar Atualização?</h3>
                  <p className="text-slate-500 font-medium leading-relaxed mb-8">
                    Isso alterará o valor do convite de <span className="text-slate-900 font-black">TODOS</span> os convidados para <span className="text-amber-600 font-black">R$ {updateAllValue}</span>. 
                    Esta ação não pode ser desfeita em massa.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setShowUpdateAllConfirm(false)}
                      className="py-4 rounded-2xl border border-slate-200 text-slate-600 font-black hover:bg-slate-50 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleUpdateAllGuestValues}
                      disabled={loading}
                      className="py-4 rounded-2xl bg-amber-500 text-white font-black hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
                    >
                      {loading ? 'Processando...' : 'Sim, Atualizar'}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Modal Baixa Manual */}
          <AnimatePresence>
            {showManualPayment && (
              <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
                >
                  <div className="bg-blue-600 p-6 text-white">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-xl font-black">Baixa Manual</h3>
                      <button onClick={() => setShowManualPayment(false)} className="hover:bg-white/20 p-1 rounded-lg transition-colors">
                        <XCircle className="size-6" />
                      </button>
                    </div>
                    <p className="text-blue-100 text-sm font-medium">Registrar recebimento para <span className="font-black text-white">{manualPaymentData.userName}</span></p>
                  </div>

                  <form onSubmit={handleManualPaymentSubmit} className="p-8 space-y-6">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Saldo Devedor</p>
                        <p className="text-lg font-black text-slate-900">{formatCurrency(manualPaymentData.totalDue - manualPaymentData.paid)}</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setManualPaymentData({...manualPaymentData, amount: (manualPaymentData.totalDue - manualPaymentData.paid).toString()})}
                        className="px-4 py-2 bg-blue-100 text-blue-600 rounded-xl text-xs font-black hover:bg-blue-200 transition-all"
                      >
                        QUITAR TOTAL
                      </button>
                    </div>

                    <Input 
                      label="Valor Recebido (R$)" 
                      icon={DollarSign} 
                      type="number" 
                      step="0.01"
                      placeholder="0,00"
                      value={manualPaymentData.amount}
                      onChange={(e: any) => setManualPaymentData({...manualPaymentData, amount: e.target.value})}
                      required
                    />

                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-bold text-slate-700 ml-1">Observação</label>
                      <textarea 
                        className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-900 min-h-[100px]"
                        placeholder="Ex: Pago em dinheiro no churrasco"
                        value={manualPaymentData.observation}
                        onChange={(e) => setManualPaymentData({...manualPaymentData, observation: e.target.value})}
                      />
                    </div>

                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                    >
                      {loading ? <Clock className="size-5 animate-spin" /> : <CheckCircle className="size-5" />}
                      Confirmar Recebimento
                    </button>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Notificação Flutuante WhatsApp */}
          <AnimatePresence>
            {lastActionNotification && (
              <motion.div 
                initial={{ opacity: 0, y: 100, x: '-50%' }}
                animate={{ opacity: 1, y: 0, x: '-50%' }}
                exit={{ opacity: 0, y: 100, x: '-50%' }}
                className="fixed bottom-24 left-1/2 z-[100] w-full max-w-sm px-4"
              >
                <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-2xl border border-emerald-500 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-white/20 flex items-center justify-center">
                      <MessageCircle className="size-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-100 uppercase tracking-wider">
                        {lastActionNotification.type === 'approval' ? 'Aprovação Realizada!' : 'Baixa Realizada!'}
                      </p>
                      <p className="text-sm font-black">
                        {lastActionNotification.type === 'approval' 
                          ? `Enviar boas-vindas para ${lastActionNotification.userName.split(' ')[0]}?`
                          : `Enviar recibo para ${lastActionNotification.userName.split(' ')[0]}?`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        const { userName, whatsapp, amount, newBalance, type, companionCount } = lastActionNotification;
                        let message = '';
                        const displayName = companionCount && companionCount > 0 ? `${userName} (e acompanhantes)` : userName;
                        
                        if (type === 'approval') {
                          message = `Olá ${displayName}! Seu cadastro para o ${config?.event.nome} foi aprovado! 🎉\n\nAcesse agora o seu painel para ver os detalhes e saldo: ${window.location.origin}\n\nSeja bem-vindo!`;
                        } else {
                          const templateType = 'baixa_manual';
                          const template = templates.find(t => t.tipo === templateType)?.conteudo || '';
                          message = replaceTags(template, {
                            nome_convidado: displayName,
                            valor_pago: amount,
                            saldo_devedor: newBalance,
                            nome_evento: config?.event.nome,
                            chave_pix: config?.event.pixKey
                          });
                        }
                        
                        const encodedMessage = encodeURIComponent(message);
                        const phone = whatsapp.replace(/\D/g, '');
                        const finalPhone = phone.length <= 11 ? `55${phone}` : phone;
                        window.open(`https://wa.me/${finalPhone}?text=${encodedMessage}`, '_blank');
                        setLastActionNotification(null);
                      }}
                      className="bg-white text-emerald-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-emerald-50 transition-all shadow-lg"
                    >
                      ENVIAR
                    </button>
                    <button 
                      onClick={() => setLastActionNotification(null)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <XCircle className="size-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    );
  }

  if (user && (view === 'dashboard' || view === 'admin') && (loadingData || (view === 'dashboard' && !balance) || (view === 'admin' && !adminStats))) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6 p-6 text-center">
        {/* Toast Notification */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 50, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: 20, x: '-50%' }}
              className={`fixed bottom-8 left-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${
                toast.type === 'success' 
                  ? 'bg-emerald-500 text-white border-emerald-400' 
                  : 'bg-red-500 text-white border-red-400'
              }`}
            >
              {toast.type === 'success' ? <CheckCircle className="size-5" /> : <XCircle className="size-5" />}
              <span className="font-bold text-sm tracking-tight">{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex flex-col items-center gap-4 max-w-sm">
          {dataError ? (
            <>
              <div className="size-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-2">
                <XCircle className="size-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Ops! Algo deu errado</h3>
              <p className="text-slate-500 font-medium">{dataError}</p>
            </>
          ) : (
            <>
              <div className="size-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-500 font-medium animate-pulse">Carregando informações do evento...</p>
            </>
          )}
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          {dataError && (
            <button 
              onClick={() => {
                setLoadingData(true);
                setDataError(null);
                const loadData = async () => {
                  try {
                    if (user.role === 'admin') {
                      await Promise.all([fetchAdminStats(), fetchPendingPayments(), fetchGuests()]);
                    } else {
                      await fetchBalance();
                    }
                  } catch (error) {
                    setDataError('Falha ao tentar novamente. Verifique sua conexão.');
                  } finally {
                    setLoadingData(false);
                  }
                };
                loadData();
              }}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
            >
              Tentar Novamente
            </button>
          )}
          <button 
            onClick={() => {
              setUser(null);
              setBalance(null);
              setAdminStats(null);
              setView('login');
            }}
            className="w-full text-slate-400 hover:text-red-500 text-sm font-bold flex items-center justify-center gap-2 transition-all py-2"
          >
            <LogOut className="size-4" />
            Sair e voltar ao login
          </button>
        </div>
      </div>
    );
  }

  return null;
}
