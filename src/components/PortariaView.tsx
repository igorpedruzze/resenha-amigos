import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Search, UserCheck, UserX, LogOut, CheckCircle, XCircle, Clock, QrCode, ShieldCheck } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface PortariaViewProps {
  user: any;
  onLogout: () => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export default function PortariaView({ user, onLogout, showToast }: PortariaViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<any>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (isScanning) {
      scannerRef.current = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );
      scannerRef.current.render(onScanSuccess, onScanFailure);
    } else {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => console.error("Failed to clear scanner", error));
        scannerRef.current = null;
      }
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => console.error("Failed to clear scanner", error));
      }
    };
  }, [isScanning]);

  const onScanSuccess = (decodedText: string) => {
    setIsScanning(false);
    handleSearch(decodedText);
  };

  const onScanFailure = (error: any) => {
    // console.warn(`Code scan error = ${error}`);
  };

  const handleSearch = async (query: string) => {
    if (!query) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/checkin?search=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
        if (data.length === 1) {
          setSelectedPerson(data[0]);
        }
      }
    } catch (error) {
      showToast('Erro ao buscar convidado', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCheckin = async (person: any) => {
    setLoading(true);
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: person.type, 
          id: person.id 
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Check-in realizado com sucesso!', 'success');
        setSelectedPerson({ ...person, checkin_at: new Date().toISOString() });
        // Update search results if needed
        setSearchResults(prev => prev.map(p => p.id === person.id && p.type === person.type ? { ...p, checkin_at: new Date().toISOString() } : p));
      } else {
        showToast(data.error || 'Erro ao realizar check-in', 'error');
      }
    } catch (error) {
      showToast('Erro de conexão', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">
      <header className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-slate-900/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl">
            <ShieldCheck className="size-6" />
          </div>
          <div>
            <h1 className="font-black text-lg leading-none">PORTARIA</h1>
            <p className="text-[10px] text-white/50 uppercase tracking-widest mt-1">{user.nome}</p>
          </div>
        </div>
        <button onClick={onLogout} className="p-2 text-white/50 hover:text-white transition-colors">
          <LogOut className="size-6" />
        </button>
      </header>

      <main className="max-w-md mx-auto p-6 space-y-6">
        {/* Scanner Section */}
        <div className="bg-white/5 rounded-3xl p-6 border border-white/10">
          {!isScanning ? (
            <button 
              onClick={() => setIsScanning(true)}
              className="w-full py-12 flex flex-col items-center justify-center gap-4 bg-blue-600/20 rounded-2xl border-2 border-dashed border-blue-600/40 hover:bg-blue-600/30 transition-all group"
            >
              <div className="bg-blue-600 p-4 rounded-full group-hover:scale-110 transition-transform">
                <Camera className="size-8" />
              </div>
              <span className="font-black uppercase tracking-widest text-sm">Abrir Câmera (Scanner)</span>
            </button>
          ) : (
            <div className="space-y-4">
              <div id="reader" className="overflow-hidden rounded-2xl border-2 border-blue-600"></div>
              <button 
                onClick={() => setIsScanning(false)}
                className="w-full py-3 bg-white/10 text-white rounded-xl font-bold"
              >
                Cancelar Scanner
              </button>
            </div>
          )}
        </div>

        {/* Manual Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 size-5" />
          <input 
            type="text" 
            placeholder="Buscar por Nome ou ID..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch(searchQuery)}
          />
        </div>

        {/* Search Results */}
        <AnimatePresence>
          {searchResults.length > 0 && !selectedPerson && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <h3 className="text-xs font-black text-white/40 uppercase tracking-widest ml-2">Resultados da Busca</h3>
              {searchResults.map((p) => (
                <button 
                  key={`${p.type}-${p.id}`}
                  onClick={() => setSelectedPerson(p)}
                  className="w-full bg-white/5 hover:bg-white/10 p-4 rounded-2xl border border-white/10 flex items-center justify-between group transition-all"
                >
                  <div className="text-left">
                    <p className="font-bold text-lg">{p.nome}</p>
                    <p className="text-xs text-white/50 uppercase tracking-wider">{p.type === 'guest' ? 'Convidado' : 'Acompanhante'}</p>
                  </div>
                  {p.checkin_at ? (
                    <UserCheck className="text-emerald-500 size-6" />
                  ) : (
                    <div className="bg-white/10 p-2 rounded-lg group-hover:bg-blue-600 transition-colors">
                      <UserCheck className="size-5" />
                    </div>
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selected Person Details */}
        <AnimatePresence>
          {selectedPerson && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl p-8 text-slate-900 shadow-2xl"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 ${
                    selectedPerson.type === 'guest' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                  }`}>
                    {selectedPerson.type === 'guest' ? 'Convidado Principal' : 'Acompanhante'}
                  </span>
                  <h2 className="text-3xl font-black leading-tight">{selectedPerson.nome}</h2>
                  <p className="text-slate-500 font-medium">ID: {selectedPerson.qr_code_id || selectedPerson.id}</p>
                </div>
                <button 
                  onClick={() => { setSelectedPerson(null); setSearchResults([]); setSearchQuery(''); }}
                  className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"
                >
                  <XCircle className="size-6" />
                </button>
              </div>

              {selectedPerson.checkin_at ? (
                <div className="bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-6 text-center">
                  <div className="bg-emerald-500 text-white size-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <UserCheck className="size-8" />
                  </div>
                  <h3 className="text-xl font-black text-emerald-900">CHECK-IN REALIZADO</h3>
                  <p className="text-emerald-600 font-medium mt-1">
                    Entrada confirmada em: {new Date(selectedPerson.checkin_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    <div className="flex items-center gap-3 text-slate-600 mb-2">
                      <Clock className="size-5" />
                      <span className="font-bold">Aguardando Entrada</span>
                    </div>
                    <p className="text-sm text-slate-500">Verifique o documento de identidade antes de confirmar.</p>
                  </div>

                  <button 
                    onClick={() => handleConfirmCheckin(selectedPerson)}
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-3 text-lg uppercase tracking-widest disabled:opacity-50"
                  >
                    {loading ? <Clock className="size-6 animate-spin" /> : <UserCheck className="size-6" />}
                    Confirmar Entrada
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
