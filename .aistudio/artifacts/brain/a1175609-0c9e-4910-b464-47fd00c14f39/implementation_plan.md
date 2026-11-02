# Purge Intégrale de l'Emploi du Temps et Réinitialisation à Zéro

Ce plan décrit les opérations nécessaires pour supprimer toutes les séances et réservations de salles existantes, permettant de démarrer une planification propre sans conflit, tout en conservant intacts les cours, enseignants, salles et groupes d'étudiants, et en intégrant un bouton sécurisé de purge dans l'interface.

## Décisions Clés & Réponses de Cadrage

> [!IMPORTANT]
> Suite à vos réponses, les choix suivants ont été arrêtés :
> - **Périmètre de suppression** : Suppression exclusive de toutes les séances d'emploi du temps et réservations de salles (`sessions`). Le référentiel académique (Matières/Cours, Enseignants, Salles physiques, Filières et Groupes) reste 100 % intact.
> - **Sauvegarde** : Aucune sauvegarde préalable n'est requise, purge directe et immédiate des séances.
> - **Bouton dans l'interface** : Intégration d'un bouton sécurisé « Purger le planning » dans l'interface de l'Emploi du Temps, protégé par une boîte de dialogue de confirmation, permettant à la scolarité et à l'administration de réinitialiser le planning dès que nécessaire.

---

## 1. Vue d'Ensemble & Fonctionnalités

```
┌────────────────────────────────────────────────────────────────────────┐
│                        EBM SIS - EMPLOI DU TEMPS                       │
├────────────────────────────────────────────────────────────────────────┤
│ [Zone A: Navigation]       [Zone B: Actions]     [Zone C: Outils]      │
│ ◄ Aujourd'hui ► Semaine   + Planifier une séance  [Exporter ▼]          │
│ Semaine 45                Salles disponibles      [Synchronisation ▼]   │
│                           Importer Excel/CSV      [🗑️ Purger planning] │
├────────────────────────────────────────────────────────────────────────┤
│ État après purge :                                                     │
│ - 0 séance planifiée                                                   │
│ - 0 conflit détecté                                                    │
│ - Disponibilité totale de toutes les salles et de tous les professeurs │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Suppression immédiate des données planifiées** :
   - Vidage complet de la liste des séances (`sessions`) en mémoire et dans le stockage local (`localStorage`).
   - Propagation immédiate de la suppression dans Cloud Firestore avec mise à jour des pierres tombales (*tombstones*) pour empêcher toute résurrection automatique des séances distantes.
   - Enregistrement d'une entrée d'audit réglementaire (*AuditLog*) traçant l'opération de réinitialisation.
2. **Bouton sécurisé « Purger le planning » dans la barre d'outils** :
   - Positionné de manière ergonomique dans la barre supérieure de l'emploi du temps (Zone C / Outils).
   - Accès restreint aux rôles autorisés (Scolarité `SCHEDULER`, Responsable pédagogique `ACADEMIC_HEAD` et Administrateur `ADMIN`).
   - Modal de confirmation explicite avec rappel du nombre de séances qui seront supprimées pour éviter toute fausse manipulation.

---

## 2. Expérience Utilisateur & Design

- **Dialogue de confirmation sécurisé** :
  - Déclenchement d'une modale d'alerte avec icône d'avertissement rouge/ambrée.
  - Message explicite : *« Attention : vous vous apprêtez à supprimer les X séances planifiées de l'emploi du temps. Les matières, groupes et salles resteront intacts, mais toutes les réservations de créneaux seront remises à zéro pour repartir sans aucun conflit. »*
  - Bouton rouge vif « Confirmer la purge intégrale » et bouton neutre « Annuler ».
- **Notification Toast de confirmation** :
  - Toast de succès confirmant : *« Emploi du temps réinitialisé : X séance(s) supprimée(s). Le planning est désormais vierge de tout conflit. »*
- **Affichage zéro-conflit instantané** :
  - Les indicateurs de synthèse passent immédiatement à : *0 séance*, *0h planifiée*, *0 conflit*.

---

## 3. Architecture Technique & Flux de Données

```
                  ┌──────────────────────────────────────────────┐
                  │    Bouton UI « Purger le planning »          │
                  │   (TimetableGrid.tsx - Zone C Outils)        │
                  └───────────────────────┬──────────────────────┘
                                          │ Clic & Confirmation
                                          ▼
                  ┌──────────────────────────────────────────────┐
                  │  Méthode `purgeAllSessions()`                │
                  │  (AppContext.tsx)                            │
                  └───────────────┬──────────────────────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         ▼                        ▼                        ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ State React      │    │ LocalStorage     │    │ Cloud Firestore  │
│ sessions = []    │    │ ebm_sessions_v3  │    │ Purge batch &    │
│ Indicateurs à 0  │    │ vidé à []        │    │ tombstones sync  │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

### Étapes d'exécution détaillées :
1. **AppContext.tsx** :
   - Ajouter la fonction `purgeAllSessions(): { success: boolean; count: number }` exposée dans `useApp()`.
   - Vider l'état `sessions` (`setSessions([])`).
   - Synchroniser la suppression de chaque document de la collection `sessions` vers Firestore via `removeDocFromFirestore` et marquer les identifiants dans `deletedDocIdsRef` pour éviter la re-synchronisation du cache initial.
   - Ajuster l'initialisation pour que le tableau vide persisté ne soit pas écrasé par les données de démonstration initiales.
   - Enregistrer l'événement dans le journal d'audit (`logAudit('PURGE_EMPLOI_DU_TEMPS', ...)`).
2. **TimetableGrid.tsx** :
   - Ajouter le bouton d'action « Purger le planning » dans la barre d'outils avec contrôle RBAC (`canManage`).
   - Connecter la boîte de dialogue de confirmation `requestAppConfirm`.
   - Réinitialiser les filtres pour afficher la vue semaine prête à recevoir de nouvelles séances sans conflit.
3. **Exécution immédiate de la purge** :
   - Exécuter la purge dès l'approbation pour que votre espace de travail actuel soit immédiatement vierge et prêt pour votre nouvelle planification.
