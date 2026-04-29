import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  User
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

interface UserProfile {
  uid: string;
  email: string;
  nom: string;
  prenom: string;
  role: 'admin' | 'gestionnaire';
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setError(null);

      if (firebaseUser) {
        console.log("Utilisateur détecté :", firebaseUser.email, "UID:", firebaseUser.uid);
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            console.log("Profil trouvé :", userDoc.data());
            setUser(firebaseUser);
            setUserProfile(userDoc.data() as UserProfile);
          } else if (['moonlights7480@gmail.com', 'fatoumorsylla17@gmail.com'].includes(firebaseUser.email || '')) {
            console.log("Auto-enregistrement en cours pour :", firebaseUser.email);
            // Auto-register authorized users
            const isAdmin = firebaseUser.email === 'moonlights7480@gmail.com';
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              nom: firebaseUser.displayName?.split(' ').pop() || '',
              prenom: firebaseUser.displayName?.split(' ')[0] || '',
              role: isAdmin ? 'admin' : 'gestionnaire'
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
            console.log("Profil créé avec succès.");
            setUser(firebaseUser);
            setUserProfile(newProfile);
          } else {
            console.warn("Email non autorisé :", firebaseUser.email);
            // Email not authorized
            await firebaseSignOut(auth);
            setUser(null);
            setUserProfile(null);
            setError(`Accès refusé : l'email ${firebaseUser.email} n'est pas autorisé.`);
          }
        } catch (err) {
          console.error("Erreur lors de la vérification du profil :", err);
          setError("Une erreur est survenue lors de la vérification de vos accès.");
          await firebaseSignOut(auth);
          setUser(null);
          setUserProfile(null);
        }
      } else {
        console.log("Aucun utilisateur connecté.");
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Sign in error:", err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError("Erreur lors de la connexion avec Google.");
      }
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, error, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
