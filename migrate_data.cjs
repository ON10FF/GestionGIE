const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, setDoc, doc } = require('firebase/firestore');

// --- ANCIEN PROJET (Source) ---
const oldConfig = {
  apiKey: "AIzaSyCs9uJafi08ZQPLI9kaGgxyocEZjDRkPm0",
  authDomain: "gen-lang-client-0237687185.firebaseapp.com",
  projectId: "gen-lang-client-0237687185",
  // Note: l'ancien projet utilisait un ID de base de données spécifique
  databaseId: "ai-studio-1784e0b2-a6eb-48aa-af81-fa743341e755"
};

// --- NOUVEAU PROJET (Destination) ---
const newConfig = {
  apiKey: "AIzaSyB2-os18-lSIjOjvStvpXsmczpkW9ukXQM",
  authDomain: "gie-gestion.firebaseapp.com",
  projectId: "gie-gestion"
};

const oldApp = initializeApp(oldConfig, 'old');
const newApp = initializeApp(newConfig, 'new');

const oldDb = getFirestore(oldApp, oldConfig.databaseId);
const newDb = getFirestore(newApp);

const collections = [
  'users',
  'documents',
  'factures',
  'comptabilite',
  'demandes',
  'agenda',
  'parametres',
  'typesDemandes'
];

async function migrate() {
  console.log("🚀 Démarrage de la migration...");

  for (const colName of collections) {
    console.log(`\n--- Collection: ${colName} ---`);
    try {
      const querySnapshot = await getDocs(collection(oldDb, colName));
      console.log(`📦 ${querySnapshot.size} documents trouvés.`);

      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();
        await setDoc(doc(newDb, colName, docSnap.id), data);
        console.log(`✅ Copié: ${docSnap.id}`);
      }
    } catch (err) {
      console.error(`❌ Erreur sur ${colName}:`, err.message);
    }
  }

  console.log("\n✨ Migration terminée avec succès !");
  process.exit(0);
}

migrate();
