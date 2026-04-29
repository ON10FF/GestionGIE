import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Wallet, 
  Calendar, 
  FileText, 
  FolderSearch, 
  Receipt, 
  Settings, 
  LogOut, 
  Wifi, 
  WifiOff,
  Menu,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const Layout: React.FC = () => {
  const { userProfile, signOut } = useAuth();
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const navItems = [
    { name: 'Tableau de bord', path: '/', icon: LayoutDashboard },
    { name: 'Comptabilité', path: '/comptabilite', icon: Wallet },
    { name: 'Agenda', path: '/agenda', icon: Calendar },
    { name: 'Demandes', path: '/demandes', icon: FileText },
    { name: 'Documents', path: '/ged', icon: FolderSearch },
    { name: 'Facturation', path: '/facturation', icon: Receipt },
  ];

  if (userProfile?.role === 'admin') {
    navItems.push({ name: 'Paramètres', path: '/parametres', icon: Settings });
  }

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="flex h-screen w-full overflow-hidden font-sans text-slate-800 bg-[#F1F5F2]">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 lg:relative lg:translate-x-0",
        !isSidebarOpen && "-translate-x-full"
      )}>
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-xl uppercase leading-none">AL</span>
            </div>
            <div>
              <h1 className="text-xs font-bold text-emerald-800 uppercase tracking-wider leading-tight">GIE AND LIGUEYE</h1>
              <p className="text-[10px] text-slate-400">DIANKE KAW</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsSidebarOpen(false)}
              className={({ isActive }) => cn(
                "px-3 py-2.5 rounded-xl flex items-center gap-3 text-sm font-medium transition-all group",
                isActive 
                  ? "bg-emerald-50 text-emerald-700 shadow-sm" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-colors",
                location.pathname === item.path ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600"
              )} />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 border border-slate-100">
            <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold uppercase overflow-hidden">
              {userProfile?.prenom?.[0]}{userProfile?.nom?.[0]}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold text-slate-900 truncate">
                {userProfile?.prenom} {userProfile?.nom}
              </p>
              <p className="text-[10px] text-slate-400 capitalize">{userProfile?.role}</p>
            </div>
            <button 
              onClick={handleSignOut}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Déconnexion"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 bg-white/50 backdrop-blur-sm border-b border-slate-200 lg:bg-transparent lg:border-none">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 text-slate-600 lg:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden lg:block">
              <h2 className="text-lg font-bold text-slate-900">
                {location.pathname === '/' ? `Bienvenue, ${userProfile?.prenom}` : navItems.find(i => i.path === location.pathname)?.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold transition-all",
              isOnline 
                ? "bg-white border-emerald-200 text-emerald-600 shadow-sm" 
                : "bg-rose-50 border-rose-200 text-rose-600"
            )}>
              <span className={cn(
                "w-2 h-2 rounded-full",
                isOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
              )}></span>
              {isOnline ? 'MODE EN LIGNE' : 'MODE HORS-LIGNE'}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
