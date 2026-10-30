# Diagnostic Architectural & Plan de Mise en Production SIS — EBM Institute (Madagascar)

## 1. Diagnostic de l'Application Existante

### 1.1 Architecture Technique Actuelle
- **Stack Frontend** : Application monopage (SPA) **React 19 + TypeScript + Vite + Tailwind CSS**.
- **Gestion d'État (`src/context/AppContext.tsx`)** : Contexte React centralisé (~2 545 lignes) exposant l'ensemble des collections métier (`users`, `sessions`, `courses`, `rooms`, `studentGroups`, `academicYears`, `filieres`, `semesters`, `lmdUes`, `lmdEcs`, `studentEvals`, `tuitionStructures`, `feeInstallments`, `payments`, `cashRegisterDays`, `attendanceSessions`, `attendanceRecords`, `auditLogs`, etc.).
- **Persistance Actuelle** : Stockage purement local dans le navigateur via `localStorage` (clés `ebm_*_v3`), initialisé au premier chargement par les données de démonstration de `src/data/mockData.ts`.
- **Séparation Pôles Accueil** : Le pôle **Gestion Financière & Caisse** et le pôle **Communication & Vie Universitaire** sont désormais distincts dans le tableau de bord d'accueil (`HomePage.tsx`), la barre latérale (`Sidebar.tsx`) et l'en-tête (`Header.tsx`).

---

### 1.2 Inventaire des Fonctionnalités : Réellement Opérationnelles vs Données Fictives / Temporaires

| Domaine / Module | Ce qui fonctionne réellement (Logique métier active côté client) | Ce qui est simulé / temporaire (À migrer pour la mise en production) |
| :--- | :--- | :--- |
| **Base de données & Persistance** | Manipulation réactive de toutes les entités en mémoire + sauvegarde locale dans `localStorage`. | **Aucune base de données serveur/cloud.** Les modifications faites sur un ordinateur ou téléphone ne sont pas visibles par les autres utilisateurs. Risque de perte si le cache du navigateur est vidé. |
| **Authentification (`LoginPage.tsx`)** | Connexion par e-mail/mot de passe, sélection rapide de comptes de démonstration, création de compte local, changement de mot de passe local. | **Authentification 100 % locale.** Mots de passe stockés en clair dans l'état local (`localStorage`). Aucune session cryptographique ni jeton JWT vérifié côté serveur. |
| **Rôles & Permissions (RBAC)** | 5 rôles implémentés (`ADMIN`, `SCHEDULER`, `ACADEMIC_HEAD`, `TEACHER`, `STUDENT`) + cloisonnement de visibilité (`src/utils/studentVisibility.ts`). | **Sécurité uniquement visuelle (UI).** Le rôle `FINANCE` (comptable/caissier dédié) et la distinction claire `SCOLARITE` doivent être formalisés pour couvrir les **6 rôles SIS exigés** (`ADMIN`, `SCOLARITE`, `FINANCE`, `ACADEMIC_HEAD`, `TEACHER`, `STUDENT`) avec contrôle d'accès serveur dans `firestore.rules`. |
| **Configuration Académique (LMD)** | Création/sélection d'Années Académiques (`AcademicYearManagement.tsx`), Semestres, Filières/Mentions, Niveaux (L1–M2), UE, EC, Crédits ECTS, duplication de maquette (`LmdCurriculumView.tsx`). | Manque le concept explicite de **Parcours** (ex. *Finance & Comptabilité*, *Marketing Digital*, *Génie Logiciel* au sein d'une mention) et le **paramétrage dynamique des règles de validation/compensation** (seuil de validation UE, note éliminatoire, compensation inter-UE, crédits requis pour passage conditionnel L1→L2→L3) sans toucher au code. |
| **Étudiants, Inscriptions & Réinscriptions** | Annuaire étudiant multi-filtres (`StudentManagement.tsx`), import CSV avec détection de doublons de matricule, fiche étudiant 3 onglets (Notes, Finances, Profil), export sélectif Excel/CSV. | Le workflow formel d'**Inscription initiale** et de **Réinscription annuelle** (historique multi-années d'un même matricule, statut *Inscrit / Réinscrit / Redoublant / Passant conditionnel / Diplômé*, pièces justificatives du dossier) est partiel (`inscriptions` basique). |
| **Notes, Relevés & Délibérations** | Saisie des notes (`40% Quiz / 60% Examen` ou `100% Examen`), calcul automatique des moyennes d'EC et d'UE pondérées, génération et impression de relevé de notes (`GradeManagementView.tsx`). | **Module de Délibération du Jury incomplet :** pas de session officielle de délibération avec rachat/bonification jury, compensation automatique semestrielle/annuelle, décision finale (*Admis, Ajourné, Autorisé à passer avec dette d'UE*), verrouillage définitif des notes après signature du PV de jury. |
| **Emplois du Temps & Salles** | Grille hebdomadaire Lun–Ven (Sam/Dim dynamiques), détection temps réel des 4 types de conflits (`conflictDetector.ts`), équipements personnalisables par salle, export `.ics` & Google Agenda, suivi des volumes horaires. | Fonctionnel en local, mais nécessite la synchronisation temps réel Cloud Firestore pour que les modifications d'emploi du temps se répercutent instantanément chez les étudiants et enseignants. |
| **Présences & Absences** | Appel par QR Code dynamique + OTP à durée limitée (`QrAttendanceView.tsx`), calcul du taux de présence. | Manque la **gestion administrative des absences** : saisie manuelle d'absence par la scolarité/enseignant, dépôt et validation de **justificatifs d'absence** (certificat médical, autorisation), et alertes de dépassement du quota d'absences. |
| **Gestion Financière & Caisse (Ariary)** | Barèmes par niveau/année/groupe, encaissement rapide par saisie de matricule, calcul des soldes et impayés (`balanceDueAr`), reçus numérotés imprimables, clôture journalière de caisse (`FinancialManagementView.tsx`). | Nécessite des **transactions atomiques Firestore** pour garantir l'unicité stricte des numéros de reçus entre plusieurs caissiers simultanés, l'inaltérabilité des écritures comptables et des rapports financiers consolidés par période/mode de paiement. |
| **Sauvegarde, Restauration & Audit** | Journal d'audit local (`AuditLogView.tsx`) enregistrant les actions en mémoire. | **Aucun système d'export/restauration de sauvegarde complète (Backup/Restore JSON chiffré ou Snapshot)** et journal d'audit actuellement modifiable si `localStorage` est altéré. |

---

## 2. Plan de Mise en Production Priorisé (Sans Perte de Fonctionnalités)

### Phase 1 : Sauvegarde Préventive, Provisionnement Firebase & Synchronisation Hybride
1. **Système de Sauvegarde Immédiate (Avant toute migration)** :
   - Ajout d'un utilitaire de **Sauvegarde & Restauration complète (JSON Horodaté + Checksum)** permettant d'exporter instantanément toutes les données actuelles du navigateur (`localStorage`) et de les restaurer à tout moment.
2. **Provisionnement Firebase Authentication & Cloud Firestore** :
   - Activation de Firebase Auth (Email/Mot de passe + Google Sign-In) et Cloud Firestore.
   - Création d'un service de synchronisation bidirectionnelle (`src/services/firestoreSync.ts`) qui conserve l'architecture `AppContext.tsx` existante (zéro régression sur les composants UI) tout en persistant chaque collection dans Cloud Firestore en temps réel (`onSnapshot`).
   - Assistant de **Migration Initiale en 1 Clic** transférant proprement les données existantes vers Firestore sans écraser les enregistrements déjà présents.

### Phase 2 : Authentification Réelle, RBAC (6 Rôles) & Règles de Sécurité (`firestore.rules`)
1. **Extension du Modèle de Rôles aux 6 Profils Institutionnels EBM** :
   - `ADMIN` (Administrateur Système / Direction Générale)
   - `SCOLARITE` (Service Scolarité & Planification — compatible avec l'ancien code `SCHEDULER`)
   - `FINANCE` (Service Financier, Comptabilité & Caisse)
   - `ACADEMIC_HEAD` (Responsable Pédagogique / Chef de Mention)
   - `TEACHER` (Enseignant titulaire ou vacataire)
   - `STUDENT` (Étudiant inscrit)
2. **Tableaux de Bord & Menus Adaptés aux Droits** :
   - Filtrage strict des entrées de menu (vertical et horizontal) et des cartes d'accueil selon la matrice de permissions des 6 rôles.
3. **Règles de Sécurité Cloud Firestore (`firestore.rules`) Zéro Accès Public** :
   - Refus total de tout accès non authentifié (`request.auth != null` obligatoire sur 100 % des collections).
   - Contrôle granulaire par rôle et par propriétaire :
     - Un étudiant ne peut lire que ses propres notes, ses propres paiements/reçus et son dossier d'inscription.
     - Seul le rôle `FINANCE` ou `ADMIN` peut enregistrer un encaissement, modifier un échéancier ou clôturer la caisse.
     - Seuls `TEACHER` (pour ses cours assignés), `ACADEMIC_HEAD`, `SCOLARITE` et `ADMIN` peuvent saisir des notes, et uniquement si la délibération du semestre n'est pas verrouillée.
     - La collection `auditLogs` est en **ajout seul (append-only)** : aucune modification ni suppression n'est autorisée, même par un administrateur.

### Phase 3 : Configuration Académique 100 % Dynamique (Sans Modifier le Code Source)
1. **Référentiel Académique Configurable en Base de Données** :
   - CRUD complet pour : **Années Universitaires**, **Semestres** (dates, statut ouvert/clôturé), **Formations / Mentions**, **Niveaux** (`L1`, `L2`, `L3`, `M1`, `M2`), **Parcours** spécialisés, **UE**, **EC**, **Crédits ECTS** et **Coefficients**.
2. **Moteur de Règles Académiques Paramétrable (`AcademicValidationRules`)** :
   - Interface de paramétrage permettant à la Direction Pédagogique de définir sans toucher au code :
     - Moyenne minimale de validation d'un EC et d'une UE (ex. `10/20`).
     - Note plancher / éliminatoire (ex. `< 06/20`).
     - Activation/désactivation de la compensation intra-UE et inter-UE au sein d'un semestre.
     - Nombre minimum de crédits ECTS requis pour le passage en année supérieure (ex. `60 ECTS` pour Admis, `45 ECTS` pour Passage Conditionnel / Dette d'UE).
     - Poids par défaut Contrôle Continu / Examen (`40/60`, `50/50`, `100% Examen`).

### Phase 4 : Cycle de Vie Étudiant Complet (Inscriptions, Réinscriptions, Absences, Délibérations)
1. **Inscriptions & Réinscriptions Multi-Années** :
   - Gestion du dossier administratif de l'étudiant (statut d'inscription, affectation Année + Mention + Niveau + Parcours + Groupe, suivi des pièces du dossier : CIN/Acte de naissance, diplôme Bacc, photos, quitus financier).
   - Assistant de **Réinscription Annuelle** conservant le matricule unique et tout l'historique académique et financier des années précédentes.
2. **Gestion Complète des Absences & Justificatifs** :
   - Suivi des présences/absences par séance (QR Code dynamique + appel manuel), statut (*Présent, Absent non justifié, Absent justifié, Retard*), motif et pièce justificative, avec récapitulatif sur le bulletin.
3. **Module de Délibération du Jury & Procès-Verbal (PV)** :
   - Vue dédiée aux **Délibérations par Promotion / Semestre** calculant automatiquement les moyennes générales, les crédits ECTS acquis, la compensation selon les règles configurées, la proposition de décision (*Admis*, *Admis par compensation*, *Passage conditionnel*, *Ajourné / Redoublement*), l'application de points de jury, le verrouillage officiel des notes et l'édition du **Procès-Verbal de Délibération** et des **Relevés de Notes Officiels**.

### Phase 5 : Gestion Financière Sécurisée & Rapports Comptables
1. **Transactions Atomiques & Reçus Infalsifiables** :
   - Génération transactionnelle des paiements et reçus en Ariary (`MGA / Ar`), ventilation par tranche d'échéancier, statut temps réel (*Payé, Partiel, En retard*), blocage optionnel de l'accès au relevé de notes officiel en cas d'impayé échu (configurable), et états financiers exportables.

### Phase 6 : Sauvegarde/Restauration, Journalisation Immuable & Batterie de Tests de Mise en Production
1. **Centre de Sauvegarde & Restauration** :
   - Export JSON complet des collections Firestore/Local, restauration contrôlée avec prévisualisation et sauvegarde automatique pré-restauration.
2. **Tests de Sécurité & Recette Fonctionnelle** :
   - Enrichissement du module de **Contrôle de Conformité (`ReceptionTestsModal.tsx`)** avec des tests automatisés vérifiant : l'authentification Firebase, l'étanchéité des règles RBAC pour les 6 rôles, la persistance Firestore, les calculs de délibération LMD, l'intégrité des soldes financiers et le fonctionnement de la sauvegarde/restauration.
