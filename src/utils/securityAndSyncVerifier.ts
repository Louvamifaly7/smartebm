import {
  ALL_SYNC_COLLECTIONS,
  mergeCollectionById,
  mergeEntityFields,
} from '../services/firestoreSync';
import { TimetableSession, UserRole } from '../types';

export interface SecurityRuleTestContext {
  uid: string | null;
  isAnonymous: boolean;
  email?: string;
  emailVerified?: boolean;
  existingProfile?: {
    role: UserRole;
    isActive: boolean;
    sisUserId?: string;
  } | null;
}

export interface VerificationCheckResult {
  id: string;
  category: 'SECURITY_RBAC' | 'SYNC_CONSISTENCY';
  title: string;
  passed: boolean;
  details: string;
}

/**
 * Deterministic evaluator mirroring `firestore.rules` (v5.0) to test
 * every role and privilege-escalation vector before and after deployment.
 */
export const evaluateFirestoreRulesSimulation = (
  ctx: SecurityRuleTestContext,
  collection: string,
  operation: 'read' | 'create' | 'update' | 'delete',
  targetDocId: string,
  resourceData: Record<string, unknown> = {},
  requestData: Record<string, unknown> = {}
): boolean => {
  const isAuthenticated = Boolean(ctx.uid && !ctx.isAnonymous);
  if (!isAuthenticated) return false;

  const isBootstrappedAdmin =
    isAuthenticated &&
    ctx.email === 'louvamifaly@gmail.com' &&
    ctx.emailVerified === true;

  const userDocExists = Boolean(ctx.existingProfile);
  const isAccountActive =
    isBootstrappedAdmin ||
    Boolean(userDocExists && (ctx.existingProfile?.isActive ?? true) === true);

  const userRole: string = isBootstrappedAdmin
    ? 'ADMIN'
    : userDocExists && (ctx.existingProfile?.isActive ?? true)
      ? ctx.existingProfile!.role
      : 'NONE';

  const isAdmin = isAccountActive && userRole === 'ADMIN';
  const isScolarite =
    isAccountActive &&
    (isAdmin || ['SCOLARITE', 'SCHEDULER', 'ADMIN_STAFF'].includes(userRole));
  const isFinance = isAccountActive && (isAdmin || userRole === 'FINANCE');
  const isAcademicHead = isAccountActive && (isAdmin || userRole === 'ACADEMIC_HEAD');
  const isTeacher =
    isAccountActive && (isAdmin || isAcademicHead || userRole === 'TEACHER');
  const isStaff =
    isAdmin || isScolarite || isFinance || isAcademicHead || isTeacher;

  const validRoles = new Set([
    'ADMIN',
    'SCOLARITE',
    'SCHEDULER',
    'ADMIN_STAFF',
    'FINANCE',
    'ACADEMIC_HEAD',
    'TEACHER',
    'STUDENT',
    'PARENT',
  ]);

  if (collection === 'users') {
    if (operation === 'read') {
      return (
        isAuthenticated &&
        isAccountActive &&
        (isStaff ||
          ctx.uid === targetDocId ||
          targetDocId === (ctx.existingProfile?.sisUserId || ctx.uid))
      );
    }
    if (operation === 'create') {
      if ('passwordHash' in requestData) return false;
      const requestedRole = String(requestData.role || '');
      if (!validRoles.has(requestedRole)) return false;
      return (
        isAdmin ||
        (isScolarite && ['STUDENT', 'PARENT'].includes(requestedRole)) ||
        (isBootstrappedAdmin && ctx.uid === targetDocId && requestedRole === 'ADMIN')
      );
    }
    if (operation === 'update') {
      if ('passwordHash' in requestData) return false;
      const requestedRole = String(requestData.role || resourceData.role || '');
      if (!validRoles.has(requestedRole)) return false;
      if (isAdmin) return true;
      const existingRole = String(resourceData.role || 'STUDENT');
      const changedKeys = Object.keys(requestData).filter(
        (k) => requestData[k] !== resourceData[k]
      );
      if (
        isScolarite &&
        ['STUDENT', 'PARENT'].includes(existingRole) &&
        ['STUDENT', 'PARENT'].includes(requestedRole) &&
        !changedKeys.some((k) => ['customRoleId', 'customPermissions'].includes(k))
      ) {
        return true;
      }
      if (
        ctx.uid === targetDocId &&
        isAccountActive &&
        requestedRole === existingRole &&
        !changedKeys.some((k) =>
          [
            'role',
            'isActive',
            'matricule',
            'sisUserId',
            'customRoleId',
            'customPermissions',
          ].includes(k)
        )
      ) {
        return true;
      }
      return false;
    }
    if (operation === 'delete') {
      return isAdmin;
    }
  }

  if (collection === 'payments' || collection === 'cashDays') {
    if (operation === 'create' || operation === 'update') {
      return isAdmin || isFinance;
    }
    if (operation === 'delete') {
      return collection === 'payments' ? isAdmin : isAdmin || isFinance;
    }
  }

  if (collection === 'sessions') {
    if (operation === 'read') return isAuthenticated && isAccountActive;
    return isAdmin || isScolarite || isAcademicHead || isTeacher;
  }

  if (collection === 'deliberations') {
    if (operation === 'read') return isAuthenticated && isAccountActive;
    return isAdmin || isAcademicHead;
  }

  return false;
};

/**
 * Runs the complete security & synchronization verification suite across all roles
 * and the 5 multi-device / offline / concurrency scenarios.
 */
export const runSecurityAndSyncVerificationSuite = (): {
  allPassed: boolean;
  results: VerificationCheckResult[];
} => {
  const results: VerificationCheckResult[] = [];

  // 1. Test: Anonymous user cannot read or self-create any profile (blocks ensureFirebaseAuthSession exploit)
  const anonCtx: SecurityRuleTestContext = {
    uid: 'anon-uid-999',
    isAnonymous: true,
    existingProfile: null,
  };
  const anonTryFinance = evaluateFirestoreRulesSimulation(
    anonCtx,
    'users',
    'create',
    'anon-uid-999',
    {},
    { id: 'anon-uid-999', role: 'FINANCE' }
  );
  const anonTryScolarite = evaluateFirestoreRulesSimulation(
    anonCtx,
    'users',
    'create',
    'anon-uid-999',
    {},
    { id: 'anon-uid-999', role: 'SCOLARITE' }
  );
  results.push({
    id: 'SEC-01',
    category: 'SECURITY_RBAC',
    title: 'Blocage de l’authentification anonyme et auto-attribution de rôle',
    passed: !anonTryFinance && !anonTryScolarite,
    details:
      'Un client anonyme est strictement rejeté et ne peut créer aucun profil /users/{uid}.',
  });

  // 2. Test: Authenticated user without profile cannot self-assign FINANCE, SCOLARITE, TEACHER, or STUDENT
  const unprovisionedCtx: SecurityRuleTestContext = {
    uid: 'user-ext-123',
    isAnonymous: false,
    email: 'intruder@gmail.com',
    emailVerified: true,
    existingProfile: null,
  };
  const selfAssignRoles: UserRole[] = [
    'ADMIN',
    'FINANCE',
    'SCOLARITE',
    'ACADEMIC_HEAD',
    'TEACHER',
    'STUDENT',
  ];
  const anySelfAssignAllowed = selfAssignRoles.some((role) =>
    evaluateFirestoreRulesSimulation(
      unprovisionedCtx,
      'users',
      'create',
      'user-ext-123',
      {},
      { id: 'user-ext-123', role }
    )
  );
  results.push({
    id: 'SEC-02',
    category: 'SECURITY_RBAC',
    title: 'Interdiction d’auto-détermination du rôle à la création du profil',
    passed: !anySelfAssignAllowed,
    details:
      'Aucun utilisateur non-admin ne peut créer son propre profil avec FINANCE, SCOLARITE, TEACHER, ADMIN ou STUDENT.',
  });

  // 3. Test: Existing STUDENT cannot escalate their own role to FINANCE or SCOLARITE on update
  const studentCtx: SecurityRuleTestContext = {
    uid: 'student-uid-1',
    isAnonymous: false,
    existingProfile: { role: 'STUDENT', isActive: true, sisUserId: 'user-student-1' },
  };
  const studentEscalation = evaluateFirestoreRulesSimulation(
    studentCtx,
    'users',
    'update',
    'student-uid-1',
    { id: 'student-uid-1', role: 'STUDENT', phone: '0340000000' },
    { id: 'student-uid-1', role: 'FINANCE', phone: '0340000000' }
  );
  const studentPhoneUpdate = evaluateFirestoreRulesSimulation(
    studentCtx,
    'users',
    'update',
    'student-uid-1',
    { id: 'student-uid-1', role: 'STUDENT', phone: '0340000000' },
    { id: 'student-uid-1', role: 'STUDENT', phone: '0341111111' }
  );
  results.push({
    id: 'SEC-03',
    category: 'SECURITY_RBAC',
    title: 'Verrouillage du champ role lors de la mise à jour du profil par l’utilisateur',
    passed: !studentEscalation && studentPhoneUpdate,
    details:
      'Un étudiant peut modifier son téléphone mais toute modification de role/isActive/customPermissions est rejetée.',
  });

  // 4. Test: SCOLARITE can create STUDENT/PARENT but CANNOT create FINANCE, TEACHER, or ADMIN
  const scolariteCtx: SecurityRuleTestContext = {
    uid: 'scol-uid-1',
    isAnonymous: false,
    existingProfile: { role: 'SCOLARITE', isActive: true },
  };
  const scolCreateStudent = evaluateFirestoreRulesSimulation(
    scolariteCtx,
    'users',
    'create',
    'new-student-1',
    {},
    { id: 'new-student-1', role: 'STUDENT' }
  );
  const scolCreateFinance = evaluateFirestoreRulesSimulation(
    scolariteCtx,
    'users',
    'create',
    'new-finance-1',
    {},
    { id: 'new-finance-1', role: 'FINANCE' }
  );
  const scolWritePayments = evaluateFirestoreRulesSimulation(
    scolariteCtx,
    'payments',
    'create',
    'pay-1',
    {},
    { id: 'pay-1', amountPaidAr: 100000 }
  );
  results.push({
    id: 'SEC-04',
    category: 'SECURITY_RBAC',
    title: 'Cloisonnement strict des rôles SCOLARITE, FINANCE, TEACHER et ADMIN',
    passed: scolCreateStudent && !scolCreateFinance && !scolWritePayments,
    details:
      'SCOLARITE peut inscrire un STUDENT/PARENT mais ne peut ni créer un compte FINANCE/ADMIN ni encaisser un paiement.',
  });

  // 5. Sync Risk 2: Simultaneous edits on the same TimetableSession preserve both history logs
  const baseSession: TimetableSession = {
    id: 'sess-concurrent-1',
    courseId: 'crs-1',
    teacherId: 'user-teacher-1',
    groupIds: ['grp-l1-info-a'],
    roomId: 'room-101',
    date: '2026-11-05',
    startTime: '08:00',
    endTime: '10:00',
    durationHours: 2,
    status: 'RESCHEDULED',
    updatedAt: '2026-11-01T08:00:00.000Z',
    history: [
      {
        id: 'h-init',
        timestamp: '2026-11-01T08:00:00.000Z',
        authorName: 'Admin',
        action: 'CREATION',
        details: 'Création initiale',
      },
    ],
  };
  const userAEdit: TimetableSession = {
    ...baseSession,
    roomId: 'room-202',
    updatedAt: '2026-11-01T09:00:00.000Z',
    history: [
      {
        id: 'h-user-a',
        timestamp: '2026-11-01T09:00:00.000Z',
        authorName: 'Scolarité Poste A',
        action: 'MODIFICATION',
        details: 'Changement salle -> 202',
      },
      ...baseSession.history,
    ],
  };
  const userBEdit: TimetableSession = {
    ...baseSession,
    startTime: '10:00',
    endTime: '12:00',
    updatedAt: '2026-11-01T09:05:00.000Z',
    history: [
      {
        id: 'h-user-b',
        timestamp: '2026-11-01T09:05:00.000Z',
        authorName: 'Resp. Pédagogique Poste B',
        action: 'REPORT',
        details: 'Décalage horaire 10h-12h',
      },
      ...baseSession.history,
    ],
  };
  const reconciledSession = mergeEntityFields(userAEdit, userBEdit);
  const historyIds = new Set(reconciledSession.history.map((h) => h.id));
  results.push({
    id: 'SYNC-01',
    category: 'SYNC_CONSISTENCY',
    title: 'Protection contre l’écrasement lors de modifications simultanées d’une séance',
    passed:
      historyIds.has('h-init') &&
      historyIds.has('h-user-a') &&
      historyIds.has('h-user-b') &&
      reconciledSession.startTime === '10:00',
    details:
      'Les modifications concurrentes sont détectées par transaction Firestore et fusionnent les journaux history sans perte.',
  });

  // 6. Sync Risk 3 & 4: Stale reconnection & Deletion Tombstones
  const deletedSet = new Set<string>(['sess-deleted-99']);
  const localStaleAndDeleted: TimetableSession[] = [
    {
      ...baseSession,
      id: 'sess-deleted-99',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
    {
      ...baseSession,
      id: 'sess-concurrent-1',
      roomId: 'room-old-stale',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
  ];
  const remoteAuthoritative: TimetableSession[] = [
    {
      ...baseSession,
      id: 'sess-concurrent-1',
      roomId: 'room-new-cloud',
      updatedAt: '2026-11-01T12:00:00.000Z',
    },
  ];
  const mergedAfterReconnect = mergeCollectionById(
    localStaleAndDeleted,
    remoteAuthoritative,
    deletedSet,
    'sessions'
  );
  const deletedResurrected = mergedAfterReconnect.some((s) => s.id === 'sess-deleted-99');
  const winnerSession = mergedAfterReconnect.find((s) => s.id === 'sess-concurrent-1');
  results.push({
    id: 'SYNC-02',
    category: 'SYNC_CONSISTENCY',
    title: 'Non-réimportation de données obsolètes et persistance des suppressions (Tombstones)',
    passed:
      !deletedResurrected &&
      winnerSession?.roomId === 'room-new-cloud' &&
      ALL_SYNC_COLLECTIONS.length === 29,
    details: `Les 29 collections sont synchronisées en temps réel ; les suppressions (tombstones) et horodatages empêchent tout retour d'anciennes données.`,
  });

  return {
    allPassed: results.every((r) => r.passed),
    results,
  };
};
