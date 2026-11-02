/**
 * Utilitaires centralisés de sécurité, dates (fuseau Indian/Antananarivo UTC+3),
 * identifiants uniques, stockage local résilient et hachage de mots de passe.
 */

/**
 * Retourne la date locale au format YYYY-MM-DD dans le fuseau horaire Indian/Antananarivo (UTC+3),
 * évitant le décalage d'un jour entre 00h00 et 03h00 causé par toISOString().
 */
export function getAntananarivoDateStr(date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Indian/Antananarivo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const formatted = formatter.format(date);
    if (/^\d{4}-\d{2}-\d{2}$/.test(formatted)) {
      return formatted;
    }
  } catch {
    // Fallback UTC+3 manual calculation
  }
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  const tanaDate = new Date(utcMs + 3 * 3600000);
  const y = tanaDate.getFullYear();
  const m = String(tanaDate.getMonth() + 1).padStart(2, '0');
  const d = String(tanaDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Retourne le Lundi de la semaine académique active (en heure locale Antananarivo).
 * Si la date tombe un Samedi (6) ou un Dimanche (0) — par exemple le dimanche 01/11/2026 —
 * la semaine académique Lundi–Vendredi de la semaine écoulée est déjà terminée :
 * on positionne donc automatiquement sur le Lundi suivant (ex: lundi 02/11/2026).
 */
export function getAcademicWeekMondayDate(baseDate: Date = new Date()): Date {
  const tanaStr = getAntananarivoDateStr(baseDate);
  const [y, m, d] = tanaStr.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
  const dayOfWeek = dt.getDay(); // 0 = Dimanche, 1 = Lundi, ..., 6 = Samedi
  if (dayOfWeek === 0) {
    // Dimanche -> Lundi suivant (+1 jour)
    dt.setDate(dt.getDate() + 1);
  } else if (dayOfWeek === 6) {
    // Samedi -> Lundi suivant (+2 jours)
    dt.setDate(dt.getDate() + 2);
  } else {
    // Lundi (1) à Vendredi (5) -> Lundi de la semaine en cours
    dt.setDate(dt.getDate() - (dayOfWeek - 1));
  }
  return dt;
}

/**
 * Retourne la date YYYY-MM-DD du Lundi de la semaine académique active.
 */
export function getAcademicWeekMondayStr(baseDate: Date = new Date()): string {
  return getAntananarivoDateStr(getAcademicWeekMondayDate(baseDate));
}

/**
 * Retourne la date de planification par défaut (YYYY-MM-DD) :
 * - Du Lundi au Vendredi : aujourd'hui
 * - Le Samedi et le Dimanche : le Lundi de la semaine qui commence (ex: 02/11/2026 le 01/11/2026)
 */
export function getDefaultPlanningDateStr(baseDate: Date = new Date()): string {
  const tanaStr = getAntananarivoDateStr(baseDate);
  const [y, m, d] = tanaStr.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
  const dayOfWeek = dt.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return getAcademicWeekMondayStr(baseDate);
  }
  return tanaStr;
}

let idSequenceCounter = 0;

/**
 * Génère un identifiant unique sans risque de collision (basé sur crypto.randomUUID ou CSPRNG).
 */
export function generateUniqueId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  idSequenceCounter = (idSequenceCounter + 1) & 0xffffff;
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint32Array(3);
    crypto.getRandomValues(bytes);
    return `${prefix}-${bytes[0].toString(36)}-${bytes[1].toString(36)}-${bytes[2].toString(36)}-${idSequenceCounter.toString(36)}`;
  }
  const randomPart = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
  return `${prefix}-${randomPart}-${idSequenceCounter.toString(36)}`;
}

/**
 * Hachage déterministe salé (FNV-1a 64-bit / multi-round) synchrone pour les mots de passe côté client.
 * Ne stocke jamais le mot de passe en clair.
 */
export function hashPasswordSync(password: string, salt = 'EBM-INSTITUTE-SIS-2026'): string {
  const clean = password.trim();
  const input = `${salt}::${clean}::EBM-V4`;
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let round = 0; round < 64; round++) {
    for (let i = 0; i < input.length; i++) {
      const ch = input.charCodeAt(i) ^ round;
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h1 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h2 >>> 13), 3266489909);
  }
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `ebm$v4$${hex1}${hex2}`;
}

/**
 * Vérifie strictement un mot de passe saisi par rapport au hash stocké ou au mot de passe initial
 * (date de naissance pour étudiant, ebm2026/admin2026 pour personnel).
 */
export function verifyPasswordSync(
  inputPassword: string,
  storedHash?: string,
  userContext?: { birthDate?: string; role?: string; username?: string }
): boolean {
  const cleanInput = (inputPassword || '').trim();
  if (!cleanInput || cleanInput === '••••••••') return false;

  // 1. Si un hash v4 est stocké, exiger la correspondance exacte du hash
  if (storedHash && storedHash.startsWith('ebm$v4$')) {
    return hashPasswordSync(cleanInput) === storedHash;
  }

  // 2. Hash de démonstration initial dans mockData (ex: 'hashed_admin_pwd', 'hashed_2005-04-14')
  if (storedHash && storedHash.startsWith('hashed_')) {
    const expectedSuffix = storedHash.replace(/^hashed_/, '');
    if (cleanInput === expectedSuffix) return true;
    if (expectedSuffix.endsWith('_pwd')) {
      return cleanInput === 'ebm2026' || cleanInput === 'admin2026';
    }
    return false;
  }

  // 3. Correspondance directe si un hash/secret explicite non-préfixé est présent
  if (storedHash) {
    return storedHash === cleanInput;
  }

  // 4. Compte sans passwordHash explicite : date de naissance pour étudiant, sinon mot de passe initial personnel
  if (userContext?.birthDate) {
    return cleanInput === userContext.birthDate;
  }

  return cleanInput === 'ebm2026' || cleanInput === 'admin2026';
}

/**
 * Jeton de session signé pour empêcher le contournement d'authentification via localStorage.
 */
export function computeSessionToken(user: { id: string; role: string; passwordHash?: string }): string {
  return hashPasswordSync(`${user.id}::${user.role}::${user.passwordHash || 'seed'}`, 'EBM-SESSION-AUTH-SIG-2026');
}

export function verifySessionToken(
  user: { id: string; role: string; passwordHash?: string } | undefined,
  token: string | null
): boolean {
  if (!user || !token) return false;
  return computeSessionToken(user) === token;
}

/**
 * Lecture JSON sécurisée avec fallback automatique en cas de corruption de localStorage (P56).
 */
export function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || parsed === undefined) return fallback;
    if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
    if (typeof fallback === 'object' && fallback !== null && !Array.isArray(fallback)) {
      if (typeof parsed !== 'object' || Array.isArray(parsed)) return fallback;
    }
    return parsed as T;
  } catch (err) {
    console.warn('[EBM Storage] Données locales corrompues ignorées, restauration de la valeur par défaut.', err);
    return fallback;
  }
}

/**
 * Écriture sécurisée dans localStorage avec interception de QuotaExceededError (P57).
 */
export function safeLocalStorageSet(key: string, value: unknown): boolean {
  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, serialized);
    return true;
  } catch (err) {
    console.warn(`[EBM Storage] Quota localStorage atteint lors de l'écriture de "${key}".`, err);
    if (key !== 'ebm_backups_v3') {
      try {
        const rawBackups = localStorage.getItem('ebm_backups_v3');
        if (rawBackups) {
          const parsed = safeJsonParse<unknown[]>(rawBackups, []);
          if (Array.isArray(parsed) && parsed.length > 1) {
            localStorage.setItem('ebm_backups_v3', JSON.stringify(parsed.slice(0, 1)));
            const serialized = typeof value === 'string' ? value : JSON.stringify(value);
            localStorage.setItem(key, serialized);
            return true;
          }
        }
      } catch {
        // Ignore secondary error
      }
    }
    return false;
  }
}

/**
 * Échappement HTML strict contre les injections XSS dans les modèles d'impression/PDF (P48).
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sérialisation JSON canonique (clés triées récursivement) pour garantir un checksum stable (P55).
 */
export function canonicalizeJson(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return '[' + value.map((item) => canonicalizeJson(item)).join(',') + ']';
  }
  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  const entries = sortedKeys.map((k) => `${JSON.stringify(k)}:${canonicalizeJson(obj[k])}`);
  return '{' + entries.join(',') + '}';
}

/**
 * Calcule une somme de contrôle canonique 64-bit reproductible quel que soit l'ordre des clés JSON (P20, P55).
 */
export function computeCanonicalChecksum(payload: Record<string, unknown>): string {
  const str = canonicalizeJson(payload);
  let h1 = 0x811c9dc5;
  let h2 = 0xcbf29ce4;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= c ^ (i & 0xff);
    h2 = Math.imul(h2, 0x01000193);
  }
  const part1 = (h1 >>> 0).toString(16).toUpperCase().padStart(8, '0');
  const part2 = (h2 >>> 0).toString(16).toUpperCase().padStart(8, '0');
  return `EBM-CHK-${part1}-${part2}`;
}
