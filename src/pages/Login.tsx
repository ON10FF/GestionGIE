import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';

const Login: React.FC = () => {
  const { user, userProfile, signIn, loading, error } = useAuth();

  if (user && userProfile) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-emerald-600 p-6 relative overflow-hidden">
      {/* Decorative Circles */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/20 blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-400/10 blur-3xl"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-8 flex flex-col items-center justify-center relative z-10"
      >
        <div className="w-20 h-20 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg mb-6">
          <span className="text-white font-black text-3xl italic">AL</span>
        </div>

        <h1 className="text-2xl font-black text-emerald-900 uppercase tracking-tighter mb-1">AND LIGUEYE</h1>
        <p className="text-sm text-slate-400 font-medium tracking-widest uppercase mb-10">DIANKE KAW</p>

        <div className="w-full space-y-6">
          <div className="text-center">
            <h2 className="text-lg font-bold text-slate-800">Gestion Intégrée GIE</h2>
            <p className="text-sm text-slate-500 mt-1">Connectez-vous pour accéder à votre espace de gestion.</p>
          </div>

          {error && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-rose-50 border border-rose-200 text-rose-600 text-xs p-4 rounded-xl font-medium leading-relaxed"
            >
              ⚠️ {error}
            </motion.div>
          )}

          <button
            onClick={signIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 py-3.5 px-6 rounded-2xl text-slate-700 font-bold hover:bg-slate-50 active:scale-95 transition-all shadow-sm group"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            ) : (
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-5.38z"
                />
              </svg>
            )}
            Se connecter avec Google
          </button>
        </div>

        <div className="mt-12 text-[10px] text-slate-300 font-bold uppercase tracking-[0.2em]">
          Version 1.0 • PWA Sécurisée
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
