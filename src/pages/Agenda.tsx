import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin, Bell, BellOff, X, Trash2, Edit3, Users, MoreHorizontal } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { AgendaEvent } from '../types';
import { cn } from '../lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';

const EVENT_TYPES = [
  { value: 'réunion', label: 'Réunion', color: 'bg-blue-500', light: 'bg-blue-50 text-blue-700 border-blue-100' },
  { value: 'travaux agricoles', label: 'Agricole', color: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  { value: 'travaux élevage', label: 'Élevage', color: 'bg-amber-500', light: 'bg-amber-50 text-amber-700 border-amber-100' },
  { value: 'formation', label: 'Formation', color: 'bg-violet-500', light: 'bg-violet-50 text-violet-700 border-violet-100' },
  { value: 'autre', label: 'Autre', color: 'bg-slate-500', light: 'bg-slate-50 text-slate-700 border-slate-100' },
];
const DAYS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
const emptyForm = { titre:'', description:'', type:'réunion' as AgendaEvent['type'], dateDebut:'', dateFin:'', lieu:'', rappel:true };

const Agenda: React.FC = () => {
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [month, setMonth] = useState(new Date());
  const [selDay, setSelDay] = useState<Date|null>(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<AgendaEvent|null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const q = query(collection(db,'agenda'), orderBy('dateDebut','asc'));
    return onSnapshot(q, s => setEvents(s.docs.map(d=>({id:d.id,...d.data()} as AgendaEvent))));
  }, []);

  const days = useMemo(() => {
    const s = startOfWeek(startOfMonth(month),{weekStartsOn:1});
    const e = endOfWeek(endOfMonth(month),{weekStartsOn:1});
    return eachDayOfInterval({start:s,end:e});
  }, [month]);

  const evFor = (d:Date) => events.filter(ev => {
    const ed = ev.dateDebut?.toDate ? ev.dateDebut.toDate() : new Date(ev.dateDebut);
    return isSameDay(ed,d);
  });
  const tc = (t:string) => EVENT_TYPES.find(x=>x.value===t)||EVENT_TYPES[4];

  const openCreate = (d?:Date) => {
    setEditing(null);
    const dd = d||new Date();
    setForm({...emptyForm, dateDebut:format(dd,"yyyy-MM-dd'T'HH:mm"), dateFin:format(dd,"yyyy-MM-dd'T'HH:mm")});
    setModal(true);
  };
  const openEdit = (ev:AgendaEvent) => {
    setEditing(ev);
    const d1 = ev.dateDebut?.toDate?ev.dateDebut.toDate():new Date(ev.dateDebut);
    const d2 = ev.dateFin?.toDate?ev.dateFin.toDate():new Date(ev.dateFin);
    setForm({titre:ev.titre,description:ev.description,type:ev.type,dateDebut:format(d1,"yyyy-MM-dd'T'HH:mm"),dateFin:format(d2,"yyyy-MM-dd'T'HH:mm"),lieu:ev.lieu,rappel:ev.rappel});
    setModal(true);
  };
  const submit = async(e:React.FormEvent)=>{
    e.preventDefault(); if(!form.titre||!form.dateDebut)return;
    const data = {titre:form.titre,description:form.description,type:form.type,dateDebut:Timestamp.fromDate(new Date(form.dateDebut)),dateFin:form.dateFin?Timestamp.fromDate(new Date(form.dateFin)):Timestamp.fromDate(new Date(form.dateDebut)),lieu:form.lieu,rappel:form.rappel};
    try { if(editing) await updateDoc(doc(db,'agenda',editing.id),data); else await addDoc(collection(db,'agenda'),data); setModal(false);setForm(emptyForm);setEditing(null); } catch(err){console.error(err);}
  };
  const del = async(id:string)=>{ if(window.confirm('Supprimer ?')) await deleteDoc(doc(db,'agenda',id)); };
  const selEvs = selDay ? evFor(selDay) : [];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-black text-slate-900 tracking-tight">Agenda</h1><p className="text-sm text-slate-400 mt-1">Planifiez vos activités agricoles et d'élevage.</p></div>
        <button onClick={()=>openCreate()} className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/20 active:scale-95"><Plus className="w-4 h-4"/>Nouvel Événement</button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <button onClick={()=>setMonth(subMonths(month,1))} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><ChevronLeft className="w-5 h-5 text-slate-600"/></button>
            <h2 className="text-lg font-black text-slate-900 capitalize">{format(month,'MMMM yyyy',{locale:fr})}</h2>
            <button onClick={()=>setMonth(addMonths(month,1))} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><ChevronRight className="w-5 h-5 text-slate-600"/></button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">{DAYS.map(d=><div key={d} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest py-2">{d}</div>)}</div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day,i)=>{
              const de=evFor(day), cm=isSameMonth(day,month), sel=selDay&&isSameDay(day,selDay), td=isToday(day);
              return(<motion.button key={i} whileTap={{scale:0.95}} onClick={()=>setSelDay(day)} className={cn("relative h-20 sm:h-24 p-1.5 rounded-xl border transition-all text-left flex flex-col",!cm&&"opacity-30",sel?"border-emerald-500 bg-emerald-50 shadow-sm":"border-transparent hover:border-slate-200 hover:bg-slate-50",td&&!sel&&"border-emerald-200 bg-emerald-50/50")}>
                <span className={cn("text-xs font-bold w-6 h-6 flex items-center justify-center rounded-lg",td?"bg-emerald-600 text-white":"text-slate-700")}>{format(day,'d')}</span>
                <div className="flex-1 mt-0.5 space-y-0.5 overflow-hidden">{de.slice(0,2).map((ev,j)=><div key={j} className={cn("text-[9px] font-bold px-1 py-0.5 rounded truncate",tc(ev.type).light)}>{ev.titre}</div>)}{de.length>2&&<span className="text-[9px] font-bold text-slate-400 px-1">+{de.length-2}</span>}</div>
              </motion.button>);
            })}
          </div>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-4">{selDay?format(selDay,'EEEE d MMMM',{locale:fr}):"Sélectionnez un jour"}</h3>
          {selDay&&<button onClick={()=>openCreate(selDay)} className="w-full mb-4 flex items-center justify-center gap-2 py-2 border-2 border-dashed border-slate-200 text-slate-400 rounded-xl text-xs font-bold hover:border-emerald-400 hover:text-emerald-600 transition-colors"><Plus className="w-3.5 h-3.5"/>Ajouter</button>}
          <div className="flex-1 space-y-3 overflow-y-auto">
            {selEvs.length===0&&<p className="text-xs text-slate-400 text-center py-8">{selDay?"Aucun événement ce jour.":"Cliquez sur un jour."}</p>}
            {selEvs.map(ev=>{const t=tc(ev.type), ed=ev.dateDebut?.toDate?ev.dateDebut.toDate():new Date(ev.dateDebut); return(
              <motion.div key={ev.id} initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} className="p-4 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all group">
                <div className="flex items-start justify-between mb-2"><span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border",t.light)}>{t.label}</span><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={()=>openEdit(ev)} className="p-1 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50"><Edit3 className="w-3.5 h-3.5"/></button><button onClick={()=>del(ev.id)} className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"><Trash2 className="w-3.5 h-3.5"/></button></div></div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">{ev.titre}</h4>
                {ev.description&&<p className="text-xs text-slate-500 mb-2 line-clamp-2">{ev.description}</p>}
                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400"><span className="flex items-center gap-1"><Clock className="w-3 h-3"/>{format(ed,'HH:mm')}</span>{ev.lieu&&<span className="flex items-center gap-1"><MapPin className="w-3 h-3"/>{ev.lieu}</span>}{ev.rappel?<Bell className="w-3 h-3 text-emerald-500"/>:<BellOff className="w-3 h-3 text-slate-300"/>}</div>
              </motion.div>);})}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Légende</p><div className="flex flex-wrap gap-2">{EVENT_TYPES.map(t=><span key={t.value} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500"><span className={cn("w-2 h-2 rounded-full",t.color)}></span>{t.label}</span>)}</div></div>
        </div>
      </div>
      <AnimatePresence>{modal&&(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"/>
          <motion.div initial={{scale:0.9,opacity:0,y:20}} animate={{scale:1,opacity:1,y:0}} exit={{scale:0.9,opacity:0,y:20}} className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{editing?'Modifier':'Nouvel'} Événement</h2><button onClick={()=>setModal(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5 text-slate-400"/></button></div>
            <form onSubmit={submit} className="space-y-5">
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</label><div className="grid grid-cols-3 gap-2">{EVENT_TYPES.map(t=><button key={t.value} type="button" onClick={()=>setForm({...form,type:t.value as AgendaEvent['type']})} className={cn("px-3 py-2 rounded-xl text-xs font-bold transition-all border",form.type===t.value?cn(t.light,"shadow-sm"):"border-slate-100 text-slate-400 hover:border-slate-200")}>{t.label}</button>)}</div></div>
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Titre</label><input type="text" required value={form.titre} onChange={e=>setForm({...form,titre:e.target.value})} placeholder="Ex: Réunion mensuelle..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium"/></div>
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={2} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium resize-none"/></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Début</label><input type="datetime-local" required value={form.dateDebut} onChange={e=>setForm({...form,dateDebut:e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-xs font-bold"/></div>
                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fin</label><input type="datetime-local" value={form.dateFin} onChange={e=>setForm({...form,dateFin:e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-xs font-bold"/></div>
              </div>
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lieu</label><input type="text" value={form.lieu} onChange={e=>setForm({...form,lieu:e.target.value})} placeholder="Ex: Salle des fêtes..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium"/></div>
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 rounded-2xl border border-slate-200"><input type="checkbox" checked={form.rappel} onChange={e=>setForm({...form,rappel:e.target.checked})} className="w-4 h-4 text-emerald-600 rounded"/><span className="text-sm font-bold text-slate-700">Activer le rappel</span></label>
              <div className="pt-4 flex gap-3"><button type="button" onClick={()=>setModal(false)} className="flex-1 py-3 border border-slate-200 text-slate-400 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all">Annuler</button><button type="submit" className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20">{editing?'Modifier':'Créer'}</button></div>
            </form>
          </motion.div>
        </div>
      )}</AnimatePresence>
    </div>
  );
};
export default Agenda;
