import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, AlertTriangle, Clock, CheckCircle2, XCircle, Archive, Sparkles, X, Trash2, Eye, Loader2 } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Demande, DemandeStatut, Urgence } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';

const STATUTS: { value: DemandeStatut; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'en attente', label: 'En attente', icon: Clock, color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'en cours', label: 'En cours', icon: Loader2, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'approuvée', label: 'Approuvée', icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'rejetée', label: 'Rejetée', icon: XCircle, color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { value: 'clôturée', label: 'Clôturée', icon: Archive, color: 'bg-slate-50 text-slate-700 border-slate-200' },
];
const URGENCES: { value: Urgence; label: string; color: string }[] = [
  { value: 'normale', label: 'Normale', color: 'bg-slate-100 text-slate-600' },
  { value: 'haute', label: 'Haute', color: 'bg-amber-100 text-amber-700' },
  { value: 'urgente', label: 'Urgente', color: 'bg-rose-100 text-rose-700' },
];

const Demandes: React.FC = () => {
  const { userProfile } = useAuth();
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [filter, setFilter] = useState<'all'|DemandeStatut>('all');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [detail, setDetail] = useState<Demande|null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({ typeDemande:'', description:'', urgence:'normale' as Urgence, quantite:'', montant:'', justification:'' });

  useEffect(() => {
    const q = query(collection(db,'demandes'), orderBy('dateCreation','desc'));
    return onSnapshot(q, s => setDemandes(s.docs.map(d=>({id:d.id,...d.data()} as Demande))));
  }, []);

  const submit = async(e:React.FormEvent)=>{
    e.preventDefault(); if(!form.typeDemande||!form.description) return;
    await addDoc(collection(db,'demandes'), {
      userId: userProfile?.uid||'', typeDemande:form.typeDemande, description:form.description, urgence:form.urgence,
      statut:'en attente', quantite:form.quantite?Number(form.quantite):null, montant:form.montant?Number(form.montant):null,
      justification:form.justification, dateCreation:serverTimestamp(), piecesJointes:[], reponseIA:'', reponseFinale:'', observations:''
    });
    setModal(false); setForm({typeDemande:'',description:'',urgence:'normale',quantite:'',montant:'',justification:''});
  };

  const updateStatut = async(id:string, statut:DemandeStatut)=>{
    await updateDoc(doc(db,'demandes',id), { statut, ...(statut!=='en attente'&&statut!=='en cours'?{dateReponse:serverTimestamp()}:{}) });
    if(detail?.id===id) setDetail({...detail!, statut});
  };

  const analyseIA = async(dem:Demande)=>{
    setAiLoading(true);
    try {
      const apiKey = (typeof process !== 'undefined' && (process as any).env?.GEMINI_API_KEY) || '';
      if(!apiKey){ await updateDoc(doc(db,'demandes',dem.id),{reponseIA:"Clé API Gemini non configurée. Veuillez la configurer dans les paramètres."}); setAiLoading(false); return; }
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });
      const resp = await ai.models.generateContent({
        model:'gemini-2.0-flash', contents:`Tu es un assistant de gestion pour une GIE agricole au Sénégal. Analyse cette demande et donne une recommandation concise:\n\nType: ${dem.typeDemande}\nDescription: ${dem.description}\nUrgence: ${dem.urgence}\nMontant: ${dem.montant||'N/A'} FCFA\nQuantité: ${dem.quantite||'N/A'}\nJustification: ${dem.justification||'N/A'}\n\nDonne ta recommandation (approuver/rejeter/demander plus d'infos) avec justification en 3-4 phrases.`
      });
      const text = resp.text || "Impossible d'obtenir une réponse.";
      await updateDoc(doc(db,'demandes',dem.id), {reponseIA:text});
      if(detail?.id===dem.id) setDetail({...detail!,reponseIA:text});
    } catch(err){ console.error(err); }
    setAiLoading(false);
  };

  const del = async(id:string)=>{ if(window.confirm('Supprimer cette demande ?')){ await deleteDoc(doc(db,'demandes',id)); setDetail(null); } };

  const filtered = demandes.filter(d => {
    if(filter!=='all'&&d.statut!==filter) return false;
    if(search&&!d.typeDemande.toLowerCase().includes(search.toLowerCase())&&!d.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const getStatut = (s:DemandeStatut) => STATUTS.find(x=>x.value===s)||STATUTS[0];
  const getUrg = (u:Urgence) => URGENCES.find(x=>x.value===u)||URGENCES[0];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-black text-slate-900 tracking-tight">Demandes</h1><p className="text-sm text-slate-400 mt-1">Gestion des demandes administratives de la GIE.</p></div>
        <button onClick={()=>setModal(true)} className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/20 active:scale-95"><Plus className="w-4 h-4"/>Nouvelle Demande</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {STATUTS.map(s=>{const c=demandes.filter(d=>d.statut===s.value).length; return(
          <button key={s.value} onClick={()=>setFilter(filter===s.value?'all':s.value)} className={cn("p-4 rounded-2xl border transition-all text-left",filter===s.value?"ring-2 ring-emerald-500 shadow-md":"hover:shadow-sm",s.color)}>
            <s.icon className="w-4 h-4 mb-2"/><p className="text-2xl font-black font-mono">{c}</p><p className="text-[10px] font-bold uppercase tracking-widest">{s.label}</p>
          </button>);
        })}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <Search className="w-4 h-4 text-slate-400 ml-2"/>
        <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher une demande..." className="flex-1 bg-transparent focus:outline-none text-sm font-medium"/>
        {filter!=='all'&&<button onClick={()=>setFilter('all')} className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">Tous</button>}
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.map(dem=>{const st=getStatut(dem.statut), urg=getUrg(dem.urgence); const d=dem.dateCreation?.toDate?dem.dateCreation.toDate():new Date(); return(
          <motion.div key={dem.id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group" onClick={()=>setDetail(dem)}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border",st.color)}>{st.label}</span>
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",urg.color)}>{urg.label}</span>
                  {dem.reponseIA&&<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-100 flex items-center gap-1"><Sparkles className="w-3 h-3"/>IA</span>}
                </div>
                <h3 className="text-sm font-bold text-slate-900 truncate">{dem.typeDemande}</h3>
                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{dem.description}</p>
              </div>
              <div className="text-right shrink-0">
                {dem.montant&&<p className="text-sm font-black font-mono text-slate-900">{dem.montant.toLocaleString()} F</p>}
                <p className="text-[10px] text-slate-400 font-bold">{format(d,'dd/MM/yyyy',{locale:fr})}</p>
              </div>
            </div>
          </motion.div>);
        })}
        {filtered.length===0&&<div className="text-center py-16 text-slate-400"><p className="text-sm font-medium">Aucune demande trouvée.</p></div>}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>{detail&&(
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setDetail(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"/>
          <motion.div initial={{y:100,opacity:0}} animate={{y:0,opacity:1}} exit={{y:100,opacity:0}} className="relative w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">{(()=>{const s=getStatut(detail.statut); return <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border",s.color)}>{s.label}</span>})()}<span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",getUrg(detail.urgence).color)}>{getUrg(detail.urgence).label}</span></div>
                <h2 className="text-xl font-black text-slate-900">{detail.typeDemande}</h2>
              </div>
              <div className="flex gap-2"><button onClick={()=>del(detail.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"><Trash2 className="w-4 h-4"/></button><button onClick={()=>setDetail(null)} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-400"/></button></div>
            </div>
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Description</p><p className="text-sm text-slate-700">{detail.description}</p></div>
              {detail.justification&&<div className="bg-slate-50 p-4 rounded-2xl"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Justification</p><p className="text-sm text-slate-700">{detail.justification}</p></div>}
              <div className="grid grid-cols-2 gap-3">
                {detail.montant!=null&&<div className="bg-slate-50 p-4 rounded-2xl"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Montant</p><p className="text-lg font-black font-mono text-slate-900">{detail.montant?.toLocaleString()} F</p></div>}
                {detail.quantite!=null&&<div className="bg-slate-50 p-4 rounded-2xl"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Quantité</p><p className="text-lg font-black font-mono text-slate-900">{detail.quantite}</p></div>}
              </div>
              {/* IA Analysis */}
              <div className="bg-violet-50 border border-violet-100 p-4 rounded-2xl">
                <div className="flex items-center justify-between mb-2"><p className="text-[10px] font-black text-violet-600 uppercase tracking-widest flex items-center gap-1"><Sparkles className="w-3 h-3"/>Analyse Gemini</p>
                  <button onClick={()=>analyseIA(detail)} disabled={aiLoading} className="text-[10px] font-bold text-violet-600 bg-white px-3 py-1 rounded-lg border border-violet-200 hover:bg-violet-100 transition-colors disabled:opacity-50">{aiLoading?'Analyse...':'Analyser'}</button>
                </div>
                {detail.reponseIA?<p className="text-sm text-violet-900 leading-relaxed">{detail.reponseIA}</p>:<p className="text-xs text-violet-400 italic">Cliquez sur "Analyser" pour obtenir une recommandation IA.</p>}
              </div>
              {/* Status Actions */}
              {userProfile?.role==='admin'&&<div className="pt-4 border-t border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Changer le statut</p>
                <div className="flex flex-wrap gap-2">{STATUTS.map(s=><button key={s.value} onClick={()=>updateStatut(detail.id,s.value)} className={cn("px-3 py-1.5 rounded-xl text-xs font-bold border transition-all",detail.statut===s.value?"ring-2 ring-emerald-500":"hover:shadow-sm",s.color)}>{s.label}</button>)}</div>
              </div>}
              {detail.reponseFinale&&<div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100"><p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Réponse finale</p><p className="text-sm text-emerald-900">{detail.reponseFinale}</p></div>}
            </div>
          </motion.div>
        </div>
      )}</AnimatePresence>

      {/* Create Modal */}
      <AnimatePresence>{modal&&(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"/>
          <motion.div initial={{scale:0.9,opacity:0,y:20}} animate={{scale:1,opacity:1,y:0}} exit={{scale:0.9,opacity:0,y:20}} className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Nouvelle Demande</h2><button onClick={()=>setModal(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-400"/></button></div>
            <form onSubmit={submit} className="space-y-5">
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type de demande</label><select value={form.typeDemande} onChange={e=>setForm({...form,typeDemande:e.target.value})} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium"><option value="">Sélectionner...</option><option>Achat fournitures</option><option>Achat semences</option><option>Achat aliments bétail</option><option>Demande de financement</option><option>Maintenance matériel</option><option>Transport</option><option>Location terrain</option><option>Autre</option></select></div>
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label><textarea required value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={3} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium resize-none"/></div>
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Urgence</label><div className="flex gap-2">{URGENCES.map(u=><button key={u.value} type="button" onClick={()=>setForm({...form,urgence:u.value})} className={cn("flex-1 py-2 rounded-xl text-xs font-bold transition-all border",form.urgence===u.value?cn(u.color,"ring-2 ring-offset-1 ring-slate-300"):cn("border-slate-100 text-slate-400"))}>{u.label}</button>)}</div></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantité</label><input type="number" value={form.quantite} onChange={e=>setForm({...form,quantite:e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-bold font-mono"/></div>
                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Montant (F)</label><input type="number" value={form.montant} onChange={e=>setForm({...form,montant:e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-bold font-mono"/></div>
              </div>
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Justification</label><textarea value={form.justification} onChange={e=>setForm({...form,justification:e.target.value})} rows={2} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium resize-none"/></div>
              <div className="pt-4 flex gap-3"><button type="button" onClick={()=>setModal(false)} className="flex-1 py-3 border border-slate-200 text-slate-400 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all">Annuler</button><button type="submit" className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20">Soumettre</button></div>
            </form>
          </motion.div>
        </div>
      )}</AnimatePresence>
    </div>
  );
};
export default Demandes;
