import React from 'react';
import { useRouteError, isRouteErrorResponse } from 'react-router-dom';

const RouteError: React.FC = () => {
  const error = useRouteError();
  console.error('Route error:', error);

  let errorMessage = "Une erreur inattendue s'est produite.";
  let isTranslationError = false;

  if (isRouteErrorResponse(error)) {
    errorMessage = error.statusText || errorMessage;
  } else if (error instanceof Error) {
    errorMessage = error.message;
    isTranslationError = errorMessage.includes('removeChild') || errorMessage.includes('insertBefore');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F1F5F2] p-6 font-sans text-slate-800">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-8 text-center">
        <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        
        <h1 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Oups ! L'application a planté</h1>
        <p className="text-slate-500 text-sm mb-6">
          {isTranslationError 
            ? "Il semble que la traduction automatique du navigateur interfère avec l'application. Veuillez désactiver la traduction pour ce site."
            : "Une erreur critique s'est produite lors du chargement de cette page."}
        </p>

        <div className="bg-slate-50 rounded-2xl p-4 mb-8 text-left overflow-hidden">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Détails techniques</p>
          <p className="text-xs font-mono text-slate-600 break-words line-clamp-3">
            {errorMessage}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-emerald-600 text-white py-3 rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
          >
            Retour à l'accueil
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full border border-slate-200 text-slate-600 py-3 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all"
          >
            Actualiser la page
          </button>
        </div>
      </div>
    </div>
  );
};

export default RouteError;
