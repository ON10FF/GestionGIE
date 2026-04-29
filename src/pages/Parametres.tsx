import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Save, Plus, Trash2, UserPlus, Users, Shield, Building2, Settings, X, Loader2, CheckCircle2 } from 'lucide-react';
import { collection, doc, getDoc, setDoc, onSnapshot, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { GieParametres, UserProfile } from '../types';
import { cn } from '../lib/utils';

const Parametres: React.FC = () => {
  const [tab, setTab] = useState<'gie' | 'users' | 'types'>('gie');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // GIE Settings
  const [gie, setGie] = useState<GieParametres>({ nomGie: 'GIE AND LIGUEYE DIANKE KAW', adresse: '', telephone: '', email: '', numeroAgrement: '' });

  // Users
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'gestionnaire'>('gestionnaire');
  const [addingUser, setAddingUser] = useState(false);

  // Types Demandes
  const [types, setTypes] = useState<{ id: string; libelle: string; actif: boolean }[]>([]);
  const [newType, setNewType] = useState('');

  useEffect(() => {
    // Load GIE params
    getDoc(doc(db, 'parametres', 'gie')).then(snap => { if (snap.exists()) setGie(snap.data() as GieParametres); });
    // Load users
    const unsubUsers = onSnapshot(collection(db, 'users'), s => setUsers(s.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile))));
    // Load types demandes
    const unsubTypes = onSnapshot(collection(db, 'typesDemandes'), s => setTypes(s.docs.map(d => ({ id: d.id, ...d.data() } as any))));
    return () => { unsubUsers(); unsubTypes(); };
  }, []);

  const saveGie = async () => {
    setSaving(true);
    await setDoc(doc(db, 'parametres', 'gie'), gie);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const addUser = async () => {
    if (!newUserEmail) return;
    setAddingUser(true);
    // Create a placeholder user doc (will be matched when user signs in)
    const placeholder = { email: newUserEmail, nom: '', prenom: '', role: newUserRole };
    // Use email as temp ID (will be updated on first sign-in)
    await setDoc(doc(db, 'users', newUserEmail.replace(/[^a-zA-Z0-9]/g, '_')), placeholder);
    setNewUserEmail(''); setAddingUser(false);
  };

  const deleteUser = async (uid: string) => {
    if (!window.confirm('Supprimer cet utilisateur ?')) return;
    await deleteDoc(doc(db, 'users', uid));
  };

  const toggleRole = async (u: UserProfile) => {
    const newRole = u.role === 'admin' ? 'gestionnaire' : 'admin';
    await setDoc(doc(db, 'users', u.uid), { ...u, role: newRole }, { merge: true });
  };

  const addType = async () => {
    if (!newType) return;
    await setDoc(doc(collection(db, 'typesDemandes')), { libelle: newType, actif: true, dateCreation: new Date() });
    setNewType('');
  };

  const toggleType = async (t: { id: string; actif: boolean }) => {
    await setDoc(doc(db, 'typesDemandes', t.id), { actif: !t.actif }, { merge: true });
  };

  const deleteType = async (id: string) => {
    if (!window.confirm('Supprimer ce type ?')) return;
    await deleteDoc(doc(db, 'typesDemandes', id));
  };

  const TABS = [
    { key: 'gie' as const, label: 'Informations GIE', icon: Building2 },
    { key: 'users' as const, label: 'Utilisateurs', icon: Users },
    { key: 'types' as const, label: 'Types de Demandes', icon: Settings },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div><h1 className="text-2xl font-black text-slate-900 tracking-tight">Paramètres</h1><p className="text-sm text-slate-400 mt-1">Administration de la GIE.</p></div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all", tab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600")}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {/* GIE Info */}
      {tab === 'gie' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-5">
          <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom de la GIE</label><input type="text" value={gie.nomGie} onChange={e => setGie({ ...gie, nomGie: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-bold" /></div>
          <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Adresse</label><input type="text" value={gie.adresse} onChange={e => setGie({ ...gie, adresse: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Téléphone</label><input type="text" value={gie.telephone} onChange={e => setGie({ ...gie, telephone: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium" /></div>
            <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label><input type="email" value={gie.email} onChange={e => setGie({ ...gie, email: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium" /></div>
          </div>
          <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Numéro d'agrément</label><input type="text" value={gie.numeroAgrement} onChange={e => setGie({ ...gie, numeroAgrement: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium font-mono" /></div>
          <button onClick={saveGie} disabled={saving} className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}{saved ? 'Enregistré !' : 'Sauvegarder'}
          </button>
        </motion.div>
      )}

      {/* Users Management */}
      {tab === 'users' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Add User */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-4">Ajouter un utilisateur</h3>
            <div className="flex gap-3">
              <input type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="Email..." className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium" />
              <select value={newUserRole} onChange={e => setNewUserRole(e.target.value as any)} className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium">
                <option value="gestionnaire">Gestionnaire</option><option value="admin">Admin</option>
              </select>
              <button onClick={addUser} disabled={addingUser || !newUserEmail} className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50">
                {addingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}Ajouter
              </button>
            </div>
          </div>
          {/* Users List */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100"><h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Utilisateurs ({users.length})</h3></div>
            <div className="divide-y divide-slate-50">
              {users.map(u => (
                <div key={u.uid} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold uppercase shrink-0">{u.prenom?.[0] || u.email[0]}{u.nom?.[0] || ''}</div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-bold text-slate-900 truncate">{u.prenom || ''} {u.nom || u.email}</p><p className="text-[10px] text-slate-400 font-bold">{u.email}</p></div>
                  <button onClick={() => toggleRole(u)} className={cn("px-3 py-1 rounded-full text-[10px] font-bold border transition-all", u.role === 'admin' ? "bg-violet-50 text-violet-700 border-violet-200" : "bg-slate-50 text-slate-600 border-slate-200")}><Shield className="w-3 h-3 inline mr-1" />{u.role}</button>
                  <button onClick={() => deleteUser(u.uid)} className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              {users.length === 0 && <div className="p-8 text-center text-slate-400 text-sm">Aucun utilisateur.</div>}
            </div>
          </div>
        </motion.div>
      )}

      {/* Types Demandes */}
      {tab === 'types' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-4">Ajouter un type de demande</h3>
            <div className="flex gap-3">
              <input type="text" value={newType} onChange={e => setNewType(e.target.value)} placeholder="Ex: Achat fournitures..." className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium" />
              <button onClick={addType} disabled={!newType} className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"><Plus className="w-4 h-4" />Ajouter</button>
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100"><h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Types configurés ({types.length})</h3></div>
            <div className="divide-y divide-slate-50">
              {types.map(t => (
                <div key={t.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors">
                  <button onClick={() => toggleType(t)} className={cn("w-10 h-10 rounded-xl border flex items-center justify-center transition-all", t.actif ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200")}>{t.actif ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <X className="w-5 h-5 text-slate-400" />}</button>
                  <span className={cn("flex-1 text-sm font-bold", t.actif ? "text-slate-900" : "text-slate-400 line-through")}>{t.libelle}</span>
                  <button onClick={() => deleteType(t.id)} className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              {types.length === 0 && <div className="p-8 text-center text-slate-400 text-sm">Aucun type configuré.</div>}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
export default Parametres;
