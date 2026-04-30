import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, Trash2, Edit3, Download, FileText, Printer, Eye, CheckCircle2, Clock, Send } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Facture } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const STATUTS = [
  { value: 'brouillon', label: 'Brouillon', color: 'bg-slate-50 text-slate-600 border-slate-200', icon: Edit3 },
  { value: 'émise', label: 'Émise', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Send },
  { value: 'payée', label: 'Payée', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
];
const emptyLigne = { designation: '', quantite: 1, prixUnitaire: 0, total: 0 };
const emptyForm = {
  destinataire: { nom: '', adresse: '', telephone: '' },
  lignes: [{ ...emptyLigne }],
  tva: 18,
  dateFacture: format(new Date(), 'yyyy-MM-dd'),
};

const Facturation: React.FC = () => {
  const [factures, setFactures] = useState<Facture[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [detail, setDetail] = useState<Facture | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'factures'), orderBy('dateCreation', 'desc'));
    return onSnapshot(q, s => setFactures(s.docs.map(d => ({ id: d.id, ...d.data() } as Facture))));
  }, []);

  const genNumero = async () => {
    const now = new Date();
    const prefix = `FACT-${format(now, 'yyyyMM')}`;
    const snap = await getDocs(collection(db, 'factures'));
    const existing = snap.docs.filter(d => (d.data().numero || '').startsWith(prefix)).length;
    return `${prefix}-${String(existing + 1).padStart(3, '0')}`;
  };

  const updateLigne = (idx: number, field: string, value: any) => {
    const lignes = [...form.lignes];
    (lignes[idx] as any)[field] = value;
    lignes[idx].total = lignes[idx].quantite * lignes[idx].prixUnitaire;
    setForm({ ...form, lignes });
  };
  const addLigne = () => setForm({ ...form, lignes: [...form.lignes, { ...emptyLigne }] });
  const removeLigne = (idx: number) => { if (form.lignes.length > 1) { const l = [...form.lignes]; l.splice(idx, 1); setForm({ ...form, lignes: l }); } };

  const sousTotal = form.lignes.reduce((a, l) => a + l.total, 0);
  const tvaAmount = Math.round(sousTotal * form.tva / 100);
  const total = sousTotal + tvaAmount;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.destinataire.nom || form.lignes.some(l => !l.designation)) return;
    const numero = await genNumero();
    await addDoc(collection(db, 'factures'), {
      numero, dateFacture: form.dateFacture, destinataire: form.destinataire,
      lignes: form.lignes, sousTotal, tva: tvaAmount, total, statut: 'brouillon', dateCreation: serverTimestamp(),
    });
    setModal(false); setForm(emptyForm);
  };

  const updateStatut = async (id: string, statut: string) => {
    await updateDoc(doc(db, 'factures', id), { statut });
    if (detail?.id === id) setDetail({ ...detail!, statut: statut as Facture['statut'] });
  };

  const del = async (id: string) => { if (window.confirm('Supprimer cette facture ?')) { await deleteDoc(doc(db, 'factures', id)); setDetail(null); } };

  const generatePDF = (f: Facture) => {
    const pdf = new jsPDF();
    pdf.setFontSize(20); pdf.setTextColor(22, 163, 74);
    pdf.text('GIE AND LIGUEYE DIANKE KAW', 20, 25);
    pdf.setFontSize(10); pdf.setTextColor(100);
    pdf.text('Agriculture & Élevage', 20, 32);
    pdf.setDrawColor(22, 163, 74); pdf.setLineWidth(0.5); pdf.line(20, 38, 190, 38);
    pdf.setFontSize(16); pdf.setTextColor(30); pdf.text(`FACTURE ${f.numero}`, 20, 50);
    pdf.setFontSize(10); pdf.setTextColor(100);
    const d = f.dateFacture ? (typeof f.dateFacture === 'string' ? f.dateFacture : format(f.dateFacture?.toDate ? f.dateFacture.toDate() : new Date(), 'dd/MM/yyyy')) : '';
    pdf.text(`Date: ${d}`, 20, 58);
    pdf.setFontSize(11); pdf.setTextColor(30); pdf.text('Destinataire:', 120, 50);
    pdf.setFontSize(10); pdf.setTextColor(80);
    pdf.text(f.destinataire.nom, 120, 57); pdf.text(f.destinataire.adresse || '', 120, 63); pdf.text(f.destinataire.telephone || '', 120, 69);
    autoTable(pdf, {
      startY: 80, head: [['Désignation', 'Qté', 'PU (FCFA)', 'Total (FCFA)']],
      body: f.lignes.map(l => [l.designation, l.quantite.toString(), l.prixUnitaire.toLocaleString(), l.total.toLocaleString()]),
      theme: 'striped', headStyles: { fillColor: [22, 163, 74], textColor: 255 },
      styles: { fontSize: 10 },
    });
    const finalY = (pdf as any).lastAutoTable.finalY + 10;
    pdf.setFontSize(10); pdf.setTextColor(100);
    pdf.text(`Sous-total: ${f.sousTotal.toLocaleString()} FCFA`, 140, finalY);
    pdf.text(`TVA: ${f.tva.toLocaleString()} FCFA`, 140, finalY + 7);
    pdf.setFontSize(12); pdf.setTextColor(22, 163, 74); pdf.setFont(undefined as any, 'bold');
    pdf.text(`TOTAL: ${f.total.toLocaleString()} FCFA`, 140, finalY + 16);
    pdf.setFontSize(8); pdf.setTextColor(150); pdf.setFont(undefined as any, 'normal');
    pdf.text('GIE AND LIGUEYE DIANKE KAW — Merci pour votre confiance.', 20, 280);
    pdf.save(`${f.numero}.pdf`);
  };

  const getStat = (s: string) => STATUTS.find(x => x.value === s) || STATUTS[0];
  const filtered = factures.filter(f => filter === 'all' || f.statut === filter);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-black text-slate-900 tracking-tight">Facturation</h1><p className="text-sm text-slate-400 mt-1">Créez et gérez vos factures.</p></div>
        <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/20 active:scale-95"><Plus className="w-4 h-4" />Nouvelle Facture</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Facturé</p><p className="text-2xl font-black font-mono text-slate-900">{factures.reduce((a, f) => a + f.total, 0).toLocaleString()} F</p></div>
        {STATUTS.map(s => { const c = factures.filter(f => f.statut === s.value); return (
          <button key={s.value} onClick={() => setFilter(filter === s.value ? 'all' : s.value)} className={cn("p-6 rounded-2xl border transition-all text-left", filter === s.value ? "ring-2 ring-emerald-500" : "", s.color)}>
            <s.icon className="w-4 h-4 mb-2" /><p className="text-2xl font-black font-mono">{c.length}</p><p className="text-[10px] font-bold uppercase tracking-widest">{s.label}</p>
          </button>); })}
      </div>

      {/* List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead><tr className="bg-slate-50 border-b border-slate-100">
            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">N° Facture</th>
            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Destinataire</th>
            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut</th>
            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
            <th className="px-6 py-4"></th>
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(f => { const st = getStat(f.statut); const d = f.dateFacture ? (typeof f.dateFacture === 'string' ? f.dateFacture : format(f.dateFacture?.toDate ? f.dateFacture.toDate() : new Date(), 'dd/MM/yyyy', { locale: fr })) : ''; return (
              <tr key={f.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => setDetail(f)}>
                <td className="px-6 py-4"><span className="text-sm font-bold text-emerald-700 font-mono">{f.numero}</span></td>
                <td className="px-6 py-4"><p className="text-sm font-bold text-slate-800">{f.destinataire.nom}</p></td>
                <td className="px-6 py-4"><span className="text-xs font-bold text-slate-500">{d}</span></td>
                <td className="px-6 py-4"><span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border", st.color)}>{st.label}</span></td>
                <td className="px-6 py-4 text-right"><span className="text-sm font-black font-mono text-slate-900">{f.total.toLocaleString()} F</span></td>
                <td className="px-6 py-4 text-right"><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                  <button onClick={e => { e.stopPropagation(); generatePDF(f); }} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"><Download className="w-3.5 h-3.5" /></button>
                  <button onClick={e => { e.stopPropagation(); del(f.id); }} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                </div></td>
              </tr>); })}
            {filtered.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">Aucune facture trouvée.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>{detail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDetail(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <div><span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", getStat(detail.statut).color)}>{getStat(detail.statut).label}</span><h2 className="text-xl font-black text-emerald-700 font-mono mt-2">{detail.numero}</h2></div>
              <div className="flex gap-2"><button onClick={() => generatePDF(detail)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl" title="Télécharger PDF"><Download className="w-4 h-4" /></button><button onClick={() => del(detail.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"><Trash2 className="w-4 h-4" /></button><button onClick={() => setDetail(null)} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-400" /></button></div>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl mb-4"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Destinataire</p><p className="text-sm font-bold text-slate-900">{detail.destinataire.nom}</p>{detail.destinataire.adresse && <p className="text-xs text-slate-500">{detail.destinataire.adresse}</p>}{detail.destinataire.telephone && <p className="text-xs text-slate-500">{detail.destinataire.telephone}</p>}</div>
            <table className="w-full text-left mb-4"><thead><tr className="border-b border-slate-200"><th className="py-2 text-[10px] font-black text-slate-400 uppercase">Désignation</th><th className="py-2 text-[10px] font-black text-slate-400 uppercase text-center">Qté</th><th className="py-2 text-[10px] font-black text-slate-400 uppercase text-right">PU</th><th className="py-2 text-[10px] font-black text-slate-400 uppercase text-right">Total</th></tr></thead>
              <tbody>{detail.lignes.map((l, i) => <tr key={i} className="border-b border-slate-50"><td className="py-2 text-sm font-medium text-slate-800">{l.designation}</td><td className="py-2 text-sm text-center text-slate-600">{l.quantite}</td><td className="py-2 text-sm text-right font-mono text-slate-600">{l.prixUnitaire.toLocaleString()}</td><td className="py-2 text-sm text-right font-mono font-bold text-slate-900">{l.total.toLocaleString()}</td></tr>)}</tbody>
            </table>
            <div className="text-right space-y-1 mb-6"><p className="text-xs text-slate-500">Sous-total: <span className="font-bold font-mono text-slate-700">{detail.sousTotal.toLocaleString()} F</span></p><p className="text-xs text-slate-500">TVA: <span className="font-bold font-mono text-slate-700">{detail.tva.toLocaleString()} F</span></p><p className="text-lg font-black text-emerald-700 font-mono">{detail.total.toLocaleString()} FCFA</p></div>
            <div className="pt-4 border-t border-slate-100"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Statut</p><div className="flex gap-2">{STATUTS.map(s => <button key={s.value} onClick={() => updateStatut(detail.id, s.value)} className={cn("px-4 py-2 rounded-xl text-xs font-bold border transition-all", detail.statut === s.value ? "ring-2 ring-emerald-500" : "hover:shadow-sm", s.color)}>{s.label}</button>)}</div></div>
          </motion.div>
        </div>
      )}</AnimatePresence>

      {/* Create Modal */}
      <AnimatePresence>{modal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Nouvelle Facture</h2><button onClick={() => setModal(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-400" /></button></div>
            <form onSubmit={submit} className="space-y-5">
              {/* Destinataire */}
              <div className="bg-slate-50 p-4 rounded-2xl space-y-3"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Destinataire</p>
                <input type="text" required value={form.destinataire.nom} onChange={e => setForm({ ...form, destinataire: { ...form.destinataire, nom: e.target.value } })} placeholder="Nom / Entreprise" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium" />
                <div className="grid grid-cols-2 gap-3"><input type="text" value={form.destinataire.adresse} onChange={e => setForm({ ...form, destinataire: { ...form.destinataire, adresse: e.target.value } })} placeholder="Adresse" className="px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium" /><input type="text" value={form.destinataire.telephone} onChange={e => setForm({ ...form, destinataire: { ...form.destinataire, telephone: e.target.value } })} placeholder="Téléphone" className="px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium" /></div>
              </div>
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date facture</label><input type="date" value={form.dateFacture} onChange={e => setForm({ ...form, dateFacture: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-bold" /></div>
              {/* Lignes */}
              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lignes de facture</p>
                {form.lignes.map((l, i) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4 lg:space-y-0 lg:bg-transparent lg:border-none lg:p-0 lg:flex lg:gap-2 lg:items-end">
                    <div className="flex-1 space-y-1.5">
                      <label className="text-[9px] font-bold text-slate-400 uppercase lg:hidden">Désignation</label>
                      <input 
                        type="text" 
                        required 
                        value={l.designation} 
                        onChange={e => updateLigne(i, 'designation', e.target.value)} 
                        placeholder="Désignation" 
                        className="w-full px-4 py-3 bg-white lg:bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium" 
                      />
                    </div>
                    <div className="flex gap-3 lg:gap-2">
                      <div className="flex-1 lg:w-20 space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase lg:hidden">Qté</label>
                        <input 
                          type="number" 
                          min={1} 
                          value={l.quantite} 
                          onChange={e => updateLigne(i, 'quantite', Number(e.target.value))} 
                          className="w-full px-4 py-3 bg-white lg:bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-bold font-mono text-center" 
                        />
                      </div>
                      <div className="flex-[2] lg:w-28 space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase lg:hidden">Prix Unitaire</label>
                        <input 
                          type="number" 
                          min={0} 
                          value={l.prixUnitaire} 
                          onChange={e => updateLigne(i, 'prixUnitaire', Number(e.target.value))} 
                          className="w-full px-4 py-3 bg-white lg:bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-bold font-mono" 
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between lg:justify-end lg:w-32 pt-2 lg:pt-0 border-t lg:border-none border-slate-200">
                      <div className="lg:hidden text-[9px] font-bold text-slate-400 uppercase">Total</div>
                      <span className="text-sm font-black font-mono text-slate-700">{l.total.toLocaleString()} F</span>
                      <button type="button" onClick={() => removeLigne(i)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg lg:ml-2">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={addLigne} className="w-full py-3 border-2 border-dashed border-slate-200 text-slate-400 rounded-xl text-xs font-bold hover:border-emerald-400 hover:text-emerald-600 transition-colors bg-white">
                  <Plus className="w-3.5 h-3.5 inline mr-1" />Ajouter une ligne
                </button>
              </div>
              {/* TVA & Total */}
              <div className="bg-slate-50 p-4 rounded-2xl space-y-2"><div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-500">Sous-total</span><span className="text-sm font-bold font-mono text-slate-700">{sousTotal.toLocaleString()} F</span></div><div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-500 flex items-center gap-2">TVA <input type="number" min={0} max={100} value={form.tva} onChange={e => setForm({ ...form, tva: Number(e.target.value) })} className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold font-mono text-center" />%</span><span className="text-sm font-bold font-mono text-slate-700">{tvaAmount.toLocaleString()} F</span></div><div className="flex items-center justify-between pt-2 border-t border-slate-200"><span className="text-sm font-black text-slate-900">TOTAL</span><span className="text-xl font-black font-mono text-emerald-700">{total.toLocaleString()} F</span></div></div>
              <div className="pt-4 flex gap-3"><button type="button" onClick={() => setModal(false)} className="flex-1 py-3 border border-slate-200 text-slate-400 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all">Annuler</button><button type="submit" className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20">Créer la facture</button></div>
            </form>
          </motion.div>
        </div>
      )}</AnimatePresence>
    </div>
  );
};
export default Facturation;
