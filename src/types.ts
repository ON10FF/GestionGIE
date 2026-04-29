export type UserRole = 'admin' | 'gestionnaire';

export interface UserProfile {
  uid: string;
  email: string;
  nom: string;
  prenom: string;
  role: UserRole;
}

export type DemandeStatut = 'en attente' | 'en cours' | 'approuvée' | 'rejetée' | 'clôturée';
export type Urgence = 'normale' | 'haute' | 'urgente';

export interface Demande {
  id: string;
  userId: string;
  typeDemande: string;
  description: string;
  urgence: Urgence;
  statut: DemandeStatut;
  quantite?: number;
  montant?: number;
  justification?: string;
  piecesJointes?: string[];
  reponseIA?: string;
  reponseFinale?: string;
  dateCreation: any; // Firestore Timestamp
  dateReponse?: any;
  observations?: string;
}

export interface TypeDemande {
  id: string;
  libelle: string;
  actif: boolean;
  champsSupplementaires: string[];
  dateCreation: any;
}

export interface ComptabiliteOp {
  id: string;
  type: 'recette' | 'depense';
  montant: number;
  date: any;
  categorie: string;
  activite: 'agriculture' | 'elevage';
  description: string;
  justificatif?: string;
}

export interface AgendaEvent {
  id: string;
  titre: string;
  description: string;
  type: 'réunion' | 'travaux agricoles' | 'travaux élevage' | 'formation' | 'autre';
  dateDebut: any;
  dateFin: any;
  lieu: string;
  rappel: boolean;
}

export interface GedDocument {
  id: string;
  titre: string;
  categorie: 'admin' | 'contrats' | 'agricole' | 'élevage' | 'rapports' | 'autre';
  tags: string[];
  description: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  dateUpload: any;
  version: string;
}

export interface Facture {
  id: string;
  numero: string;
  dateFacture: any;
  destinataire: {
    nom: string;
    adresse: string;
    telephone: string;
  };
  lignes: {
    designation: string;
    quantite: number;
    prixUnitaire: number;
    total: number;
  }[];
  sousTotal: number;
  tva: number;
  total: number;
  statut: 'brouillon' | 'émise' | 'payée';
  pdfUrl?: string;
  dateCreation: any;
}

export interface GieParametres {
  nomGie: string;
  adresse: string;
  telephone: string;
  email: string;
  numeroAgrement: string;
}
