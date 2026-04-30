import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, Upload, Download, Trash2, X, FileText, FileImage, File, FolderOpen, Tag, Eye, Loader2 } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { supabase } from '../supabase';
import { GedDocument } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const CATEGORIES = [
  { value: 'admin', label: 'Administratif', icon: '📋', color: 'bg-blue-50 text-blue-700 border-blue-100' },
  { value: 'contrats', label: 'Contrats', icon: '📄', color: 'bg-violet-50 text-violet-700 border-violet-100' },
  { value: 'agricole', label: 'Agricole', icon: '🌱', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  { value: 'élevage', label: 'Élevage', icon: '🐄', color: 'bg-amber-50 text-amber-700 border-amber-100' },
  { value: 'rapports', label: 'Rapports', icon: '📊', color: 'bg-cyan-50 text-cyan-700 border-cyan-100' },
  { value: 'autre', label: 'Autre', icon: '📁', color: 'bg-slate-50 text-slate-700 border-slate-100' },
];

const formatSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' o';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko';
  return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
};

const getFileIcon = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) return FileImage;
  if (['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx'].includes(ext || '')) return FileText;
  return File;
};

const GED: React.FC = () => {
  const [documents, setDocuments] = useState<GedDocument[]>([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [modal, setModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ titre: '', categorie: 'admin' as GedDocument['categorie'], tags: '', description: '', version: '1.0' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'documents'), orderBy('dateUpload', 'desc'));
    return onSnapshot(q, s => setDocuments(s.docs.map(d => ({ id: d.id, ...d.data() } as GedDocument))));
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!form.titre) setForm({ ...form, titre: file.name.replace(/\.[^.]+$/, '') });
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !form.titre) return;
    setUploading(true);
    setUploadProgress(10);
    try {
      const fileName = `${Date.now()}_${selectedFile.name.replace(/\s+/g, '_')}`;
      const filePath = `documents/${fileName}`;
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;
      setUploadProgress(70);

      // Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Save metadata to Firestore
      await addDoc(collection(db, 'documents'), {
        titre: form.titre, 
        categorie: form.categorie, 
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        description: form.description, 
        fileUrl: publicUrl, 
        fileName: selectedFile.name, 
        fileSize: selectedFile.size,
        filePath: filePath, // Store the path for deletion
        dateUpload: serverTimestamp(), 
        version: form.version,
      });

      setUploadProgress(100);
      setModal(false); 
      setForm({ titre: '', categorie: 'admin', tags: '', description: '', version: '1.0' }); 
      setSelectedFile(null); 
      setUploadProgress(0);
    } catch (err) { 
      console.error(err); 
      alert('Erreur lors de l\'upload : ' + (err as any).message);
    }
    setUploading(false);
  };

  const del = async (docu: GedDocument) => {
    if (!window.confirm('Supprimer ce document ?')) return;
    try {
      // Delete from Supabase Storage
      const path = (docu as any).filePath || docu.fileUrl.split('/public/documents/')[1];
      if (path) {
        await supabase.storage.from('documents').remove([path]);
      }
      
      // Delete from Firestore
      await deleteDoc(doc(db, 'documents', docu.id));
    } catch (err) { console.error(err); }
  };

  const getCat = (c: string) => CATEGORIES.find(x => x.value === c) || CATEGORIES[5];
  const filtered = documents.filter(d => {
    if (filterCat !== 'all' && d.categorie !== filterCat) return false;
    if (search) {
      const s = search.toLowerCase();
      return d.titre.toLowerCase().includes(s) || d.fileName.toLowerCase().includes(s) || d.tags?.some(t => t.toLowerCase().includes(s));
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-black text-slate-900 tracking-tight">Documents</h1><p className="text-sm text-slate-400 mt-1">Gestion électronique des documents de la GIE.</p></div>
        <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/20 active:scale-95"><Upload className="w-4 h-4" />Ajouter un document</button>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button onClick={() => setFilterCat('all')} className={cn("shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all border", filterCat === 'all' ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300")}>Tous ({documents.length})</button>
        {CATEGORIES.map(c => { const cnt = documents.filter(d => d.categorie === c.value).length; return (
          <button key={c.value} onClick={() => setFilterCat(filterCat === c.value ? 'all' : c.value)} className={cn("shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all border", filterCat === c.value ? cn(c.color, "shadow-sm ring-2 ring-offset-1 ring-slate-200") : "bg-white border-slate-200 text-slate-500 hover:border-slate-300")}>{c.icon} {c.label} ({cnt})</button>
        ); })}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <Search className="w-4 h-4 text-slate-400 ml-2" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom, tag..." className="flex-1 bg-transparent focus:outline-none text-sm font-medium" />
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(docu => { const cat = getCat(docu.categorie); const Icon = getFileIcon(docu.fileName); const d = docu.dateUpload?.toDate ? docu.dateUpload.toDate() : new Date(); return (
          <motion.div key={docu.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0"><Icon className="w-5 h-5 text-slate-400" /></div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900 truncate">{docu.titre}</h3>
                <p className="text-[10px] text-slate-400 font-bold">{docu.fileName} • {formatSize(docu.fileSize)}</p>
              </div>
            </div>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border inline-block mb-2", cat.color)}>{cat.icon} {cat.label}</span>
            {docu.tags?.length > 0 && <div className="flex flex-wrap gap-1 mb-2">{docu.tags.map((t, i) => <span key={i} className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">#{t}</span>)}</div>}
            {docu.description && <p className="text-xs text-slate-500 line-clamp-2 mb-3">{docu.description}</p>}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400">{format(d, 'dd/MM/yyyy', { locale: fr })} • v{docu.version}</span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <a href={docu.fileUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><Download className="w-3.5 h-3.5" /></a>
                <button onClick={() => del(docu)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </motion.div>
        ); })}
        {filtered.length === 0 && <div className="col-span-full text-center py-16 text-slate-400"><FolderOpen className="w-12 h-12 mx-auto mb-3 text-slate-300" /><p className="text-sm font-medium">Aucun document trouvé.</p></div>}
      </div>

      {/* Upload Modal */}
      <AnimatePresence>{modal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Ajouter un Document</h2><button onClick={() => setModal(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-400" /></button></div>
            <form onSubmit={submit} className="space-y-5">
              {/* File Upload */}
              <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-all">
                <input ref={fileRef} type="file" className="hidden" onChange={handleFileSelect} />
                {selectedFile ? (<div className="flex items-center gap-3 justify-center"><FileText className="w-8 h-8 text-emerald-600" /><div className="text-left"><p className="text-sm font-bold text-slate-900">{selectedFile.name}</p><p className="text-xs text-slate-400">{formatSize(selectedFile.size)}</p></div></div>)
                  : (<><Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" /><p className="text-sm font-bold text-slate-500">Cliquez pour sélectionner un fichier</p><p className="text-xs text-slate-400 mt-1">PDF, DOC, XLS, Images...</p></>)}
              </div>
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Titre</label><input type="text" required value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Catégorie</label><select value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value as any })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium">{CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Version</label><input type="text" value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium" /></div>
              </div>
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tags (séparés par des virgules)</label><input type="text" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="agriculture, contrat, 2024..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium" /></div>
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium resize-none" /></div>
              {uploading && <div className="space-y-1"><div className="flex justify-between text-xs font-bold text-slate-500"><span>Upload en cours...</span><span>{uploadProgress}%</span></div><div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${uploadProgress}%` }}></div></div></div>}
              <div className="pt-4 flex gap-3"><button type="button" onClick={() => setModal(false)} className="flex-1 py-3 border border-slate-200 text-slate-400 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all">Annuler</button><button type="submit" disabled={!selectedFile || uploading} className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50">{uploading ? 'Upload...' : 'Enregistrer'}</button></div>
            </form>
          </motion.div>
        </div>
      )}</AnimatePresence>
    </div>
  );
};
export default GED;
