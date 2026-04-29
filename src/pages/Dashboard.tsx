import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Clock, ArrowRight, FileCode, CalendarCheck } from 'lucide-react';
import { collection, query, limit, orderBy, onSnapshot, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Demande, ComptabiliteOp, AgendaEvent } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [lastDemandes, setLastDemandes] = useState<Demande[]>([]);
  const [nextEvents, setNextEvents] = useState<AgendaEvent[]>([]);
  const [recentOps, setRecentOps] = useState<ComptabiliteOp[]>([]);
  const [stats, setStats] = useState({ solde: 0, recettes: 0, depenses: 0, demandesPending: 0, docsCount: 0, facturesCount: 0 });

  useEffect(() => {
    // Real-time demandes
    const qDem = query(collection(db, 'demandes'), orderBy('dateCreation', 'desc'), limit(5));
    const unsubDem = onSnapshot(qDem, (snap) => {
      const dems = snap.docs.map(d => ({ id: d.id, ...d.data() } as Demande));
      setLastDemandes(dems);
    });

    // Real-time events
    const qEv = query(collection(db, 'agenda'), orderBy('dateDebut', 'asc'), limit(3));
    const unsubEv = onSnapshot(qEv, (snap) => {
      setNextEvents(snap.docs.map(d => ({ id: d.id, ...d.data() } as AgendaEvent)));
    });

    // Real-time comptabilite
    const qComp = query(collection(db, 'comptabilite'), orderBy('date', 'desc'));
    const unsubComp = onSnapshot(qComp, (snap) => {
      const ops = snap.docs.map(d => ({ id: d.id, ...d.data() } as ComptabiliteOp));
      setRecentOps(ops.slice(0, 5));
      const recettes = ops.filter(o => o.type === 'recette').reduce((a, b) => a + b.montant, 0);
      const depenses = ops.filter(o => o.type === 'depense').reduce((a, b) => a + b.montant, 0);
      setStats(prev => ({ ...prev, recettes, depenses, solde: recettes - depenses }));
    });

    // Counts
    const unsubDemandesCount = onSnapshot(collection(db, 'demandes'), (snap) => {
      const pending = snap.docs.filter(d => ['en attente', 'en cours'].includes(d.data().statut)).length;
      setStats(prev => ({ ...prev, demandesPending: pending }));
    });
    const unsubDocs = onSnapshot(collection(db, 'documents'), (snap) => setStats(prev => ({ ...prev, docsCount: snap.size })));
    const unsubFact = onSnapshot(collection(db, 'factures'), (snap) => setStats(prev => ({ ...prev, facturesCount: snap.size })));

    return () => { unsubDem(); unsubEv(); unsubComp(); unsubDemandesCount(); unsubDocs(); unsubFact(); };
  }, []);

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
  const pctRecettes = stats.recettes + stats.depenses > 0 ? Math.round((stats.recettes / (stats.recettes + stats.depenses)) * 100) : 50;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="lg:hidden mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Tableau de bord</h2>
        <p className="text-sm text-slate-500">Vue d'ensemble de l'exploitation.</p>
      </div>

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 grid-rows-auto lg:grid-rows-3 gap-6">
        {/* Finances */}
        <motion.div variants={itemVariants} className="md:col-span-2 row-span-1 bg-white rounded-3xl border border-slate-200 p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Trésorerie Actuelle</span>
              <span className="text-3xl font-black text-slate-900 font-mono tracking-tighter">{stats.solde.toLocaleString()} FCFA</span>
            </div>
            <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1", stats.solde >= 0 ? "text-emerald-500 bg-emerald-50 border-emerald-100" : "text-rose-500 bg-rose-50 border-rose-100")}>
              <TrendingUp className="w-3 h-3" />{stats.solde >= 0 ? '+' : ''}{stats.recettes > 0 ? Math.round(((stats.recettes - stats.depenses) / stats.recettes) * 100) : 0}%
            </span>
          </div>
          <div className="mt-8">
            <div className="flex gap-6 text-xs mb-3">
              <div className="flex flex-col"><span className="text-slate-400 uppercase font-bold text-[9px] mb-0.5">Recettes</span><span className="font-bold text-slate-700">{stats.recettes.toLocaleString()} F</span></div>
              <div className="flex flex-col"><span className="text-slate-400 uppercase font-bold text-[9px] mb-0.5">Dépenses</span><span className="font-bold text-rose-500">{stats.depenses.toLocaleString()} F</span></div>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pctRecettes}%` }}></div>
              <div className="h-full bg-rose-400 rounded-full -ml-1" style={{ width: `${100 - pctRecettes}%` }}></div>
            </div>
          </div>
        </motion.div>

        {/* Demandes */}
        <motion.div variants={itemVariants} onClick={() => navigate('/demandes')} className="col-span-1 row-span-1 bg-white rounded-3xl border border-slate-200 p-8 flex flex-col shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Demandes</span>
          <div className="mt-auto flex items-end gap-2">
            <span className="text-6xl font-light text-emerald-600 leading-none">{stats.demandesPending.toString().padStart(2, '0')}</span>
            <div className="flex flex-col mb-1"><span className="text-xs font-bold text-slate-800">En cours</span><span className="text-[10px] text-slate-400 uppercase font-bold">À traiter</span></div>
          </div>
        </motion.div>

        {/* Gemini Analysis */}
        <motion.div variants={itemVariants} className="col-span-1 row-span-1 bg-emerald-900 rounded-3xl p-8 text-white flex flex-col shadow-lg shadow-emerald-900/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-400/30 transition-colors"></div>
          <div className="flex items-center gap-2 mb-4 relative z-10">
            <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-sm"><span className="text-sm">✨</span></div>
            <span className="text-[10px] font-bold tracking-widest uppercase opacity-70">Analyse Gemini</span>
          </div>
          <p className="text-xs font-medium leading-relaxed italic opacity-90 relative z-10">
            {stats.depenses > stats.recettes ? '"Attention : les dépenses dépassent les recettes. Optimisez vos coûts."' :
              stats.recettes > 0 ? `"Bonne gestion : marge de ${Math.round(((stats.recettes - stats.depenses) / stats.recettes) * 100)}%. Continuez ainsi."` :
                '"Commencez à enregistrer vos opérations pour obtenir une analyse."'}
          </p>
          <div className="mt-auto pt-4 border-t border-emerald-800 relative z-10">
            <button onClick={() => navigate('/comptabilite')} className="text-[10px] font-black text-emerald-300 uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all">Voir comptabilité <ArrowRight className="w-3 h-3" /></button>
          </div>
        </motion.div>

        {/* Recent Activities */}
        <motion.div variants={itemVariants} className="md:col-span-2 row-span-2 bg-white rounded-3xl border border-slate-200 p-8 flex flex-col shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Activités Récentes</h3>
            <button onClick={() => navigate('/comptabilite')} className="text-[10px] font-bold text-emerald-600 uppercase">Tout voir</button>
          </div>
          <div className="space-y-5 flex-1">
            {recentOps.length > 0 ? recentOps.map((op, i) => {
              const d = op.date ? (typeof op.date === 'string' ? op.date : '') : '';
              return (
                <div key={op.id || i} className="flex items-center gap-4 group cursor-default">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                    {op.type === 'recette' ? '💰' : '📤'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate tracking-tight">{(op as any).libelle || op.description || op.categorie}</p>
                    <p className="text-[10px] font-bold text-slate-400 flex items-center gap-2">{d} <span className="w-1 h-1 rounded-full bg-slate-300"></span> {op.categorie}</p>
                  </div>
                  <div className="text-right">
                    <span className={cn("text-sm font-black font-mono", op.type === 'recette' ? "text-emerald-600" : "text-rose-500")}>{op.type === 'recette' ? '+' : '-'}{op.montant.toLocaleString()} F</span>
                  </div>
                </div>);
            }) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Aucune activité récente.</div>
            )}
          </div>
        </motion.div>

        {/* Agenda */}
        <motion.div variants={itemVariants} onClick={() => navigate('/agenda')} className="md:col-span-2 row-span-1 bg-white rounded-3xl border border-slate-200 p-8 flex flex-col shadow-sm cursor-pointer hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Prochain événement</h3>
            <div className="flex gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span><span className="w-2 h-2 rounded-full bg-emerald-200"></span><span className="w-2 h-2 rounded-full bg-emerald-100"></span></div>
          </div>
          {nextEvents.length > 0 ? (() => {
            const ev = nextEvents[0];
            const d = ev.dateDebut?.toDate ? ev.dateDebut.toDate() : new Date(ev.dateDebut);
            return (
              <div className="flex items-stretch gap-6 h-full">
                <div className="w-16 bg-emerald-50 rounded-2xl flex flex-col items-center justify-center p-2 border border-emerald-100 shadow-inner">
                  <span className="text-[10px] text-emerald-600 font-black uppercase mb-1">{format(d, 'EEE', { locale: fr }).slice(0, 3)}</span>
                  <span className="text-3xl font-black text-emerald-800 font-mono tracking-tighter leading-none">{format(d, 'dd')}</span>
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <p className="text-base font-black text-slate-900 tracking-tight leading-tight">{ev.titre}</p>
                  <p className="text-xs font-medium text-slate-500 mt-1 flex items-center gap-1.5"><Clock className="w-3 h-3" />{format(d, 'HH:mm')} {ev.lieu ? `- ${ev.lieu}` : ''}</p>
                  <button className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-3 flex items-center gap-1 group">Voir l'agenda <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" /></button>
                </div>
              </div>);
          })() : <p className="text-sm text-slate-400 flex-1 flex items-center justify-center">Aucun événement prévu.</p>}
        </motion.div>

        {/* Documents */}
        <motion.div variants={itemVariants} onClick={() => navigate('/ged')} className="col-span-1 row-span-1 bg-white rounded-3xl border border-slate-200 p-8 flex flex-col shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">GED</span>
          <div className="mt-auto"><span className="text-4xl font-black text-slate-900 font-mono tracking-tighter">{stats.docsCount}</span><p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Fichiers sécurisés</p></div>
          <div className="mt-4 flex -space-x-2">{[1, 2, 3].map(i => (<div key={i} className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center"><FileCode className="w-3 h-3 text-slate-400" /></div>))}</div>
        </motion.div>

        {/* Factures */}
        <motion.div variants={itemVariants} onClick={() => navigate('/facturation')} className="col-span-1 row-span-1 bg-amber-50 rounded-3xl border border-amber-100 p-8 flex flex-col shadow-sm relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 p-4 opacity-10"><CalendarCheck className="w-16 h-16 text-amber-900" /></div>
          <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1 relative z-10">Facturation</span>
          <div className="mt-auto relative z-10">
            <span className="text-4xl font-black text-slate-900 font-mono tracking-tighter">{stats.facturesCount}</span>
            <p className="text-[10px] font-bold text-amber-700/60 uppercase mt-1">Factures créées</p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
