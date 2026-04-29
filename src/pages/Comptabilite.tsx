import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  Filter,
  Download,
  Calendar,
  Tag,
  MoreVertical,
  Trash2
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { ComptabiliteOp } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const Comptabilite: React.FC = () => {
  const [operations, setOperations] = useState<ComptabiliteOp[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'recette' | 'depense'>('all');

  // Form state
  const [newOp, setNewOp] = useState({
    libelle: '',
    montant: '',
    type: 'recette' as 'recette' | 'depense',
    categorie: 'Agriculture',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    const q = query(collection(db, 'comptabilite'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setOperations(snap.docs.map(d => ({ id: d.id, ...d.data() } as ComptabiliteOp)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOp.libelle || !newOp.montant) return;

    try {
      await addDoc(collection(db, 'comptabilite'), {
        ...newOp,
        montant: Number(newOp.montant),
        dateCreation: serverTimestamp()
      });
      setIsModalOpen(false);
      setNewOp({
        libelle: '',
        montant: '',
        type: 'recette',
        categorie: 'Agriculture',
        date: format(new Date(), 'yyyy-MM-dd')
      });
    } catch (err) {
      console.error("Error adding operation:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Supprimer cette opération ?")) {
      await deleteDoc(doc(db, 'comptabilite', id));
    }
  };

  const solde = operations.reduce((acc, op) => 
    op.type === 'recette' ? acc + op.montant : acc - op.montant, 0
  );

  const filteredOps = operations.filter(op => 
    filterType === 'all' ? true : op.type === filterType
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Header & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Solde Total</p>
          <h3 className="text-2xl font-black text-slate-900 font-mono">{solde.toLocaleString()} F</h3>
          <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 w-full"></div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Recettes</p>
          <div className="flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xl font-bold text-emerald-600 font-mono">
              {operations.filter(o => o.type === 'recette').reduce((a, b) => a + b.montant, 0).toLocaleString()} F
            </h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Dépenses</p>
          <div className="flex items-center gap-2">
            <ArrowDownLeft className="w-4 h-4 text-rose-500" />
            <h3 className="text-xl font-bold text-rose-600 font-mono">
              {operations.filter(o => o.type === 'depense').reduce((a, b) => a + b.montant, 0).toLocaleString()} F
            </h3>
          </div>
        </div>
      </div>

      {/* Actions & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 p-1 bg-slate-50 rounded-xl">
          <button 
            onClick={() => setFilterType('all')}
            className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", filterType === 'all' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}
          >
            Tous
          </button>
          <button 
            onClick={() => setFilterType('recette')}
            className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", filterType === 'recette' ? "bg-emerald-500 text-white shadow-sm" : "text-slate-400")}
          >
            Recettes
          </button>
          <button 
            onClick={() => setFilterType('depense')}
            className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", filterType === 'depense' ? "bg-rose-500 text-white shadow-sm" : "text-slate-400")}
          >
            Dépenses
          </button>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/20 active:scale-95"
        >
          <Plus className="w-4 h-4" /> Nouvelle Opération
        </button>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Libellé / Catégorie</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Montant</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredOps.map((op) => (
              <tr key={op.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <span className="text-xs font-bold text-slate-900">{format(new Date(op.date), 'dd MMM yyyy', { locale: fr })}</span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-slate-800">{op.libelle}</p>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{op.categorie}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter",
                    op.type === 'recette' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                  )}>
                    {op.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className={cn(
                    "text-sm font-black font-mono",
                    op.type === 'recette' ? "text-emerald-600" : "text-rose-500"
                  )}>
                    {op.type === 'recette' ? '+' : '-'}{op.montant.toLocaleString()} F
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => handleDelete(op.id!)}
                    className="p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {filteredOps.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                  Aucune opération trouvée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Form */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8"
            >
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-6">Nouvelle Opération</h2>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4 p-1 bg-slate-100 rounded-xl">
                  <button 
                    type="button"
                    onClick={() => setNewOp({...newOp, type: 'recette'})}
                    className={cn("py-2 rounded-lg text-xs font-bold transition-all", newOp.type === 'recette' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400")}
                  >
                    Recette
                  </button>
                  <button 
                    type="button"
                    onClick={() => setNewOp({...newOp, type: 'depense'})}
                    className={cn("py-2 rounded-lg text-xs font-bold transition-all", newOp.type === 'depense' ? "bg-white text-rose-600 shadow-sm" : "text-slate-400")}
                  >
                    Dépense
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Libellé</label>
                  <input 
                    type="text"
                    required
                    value={newOp.libelle}
                    onChange={e => setNewOp({...newOp, libelle: e.target.value})}
                    placeholder="Ex: Vente arachides..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Montant (F)</label>
                    <input 
                      type="number"
                      required
                      value={newOp.montant}
                      onChange={e => setNewOp({...newOp, montant: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-bold font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                    <input 
                      type="date"
                      required
                      value={newOp.date}
                      onChange={e => setNewOp({...newOp, date: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Catégorie</label>
                  <select 
                    value={newOp.categorie}
                    onChange={e => setNewOp({...newOp, categorie: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium"
                  >
                    <option>Agriculture</option>
                    <option>Élevage</option>
                    <option>Maraîchage</option>
                    <option>Maintenance</option>
                    <option>Salaire</option>
                    <option>Transport</option>
                    <option>Autre</option>
                  </select>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 border border-slate-200 text-slate-400 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                  >
                    Enregistrer
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Comptabilite;
