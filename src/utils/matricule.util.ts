/**
 * Normalisation stricte d'un matricule BCRG :
 * Supprime les espaces superflus et met en majuscules.
 */
export function normalizeMatricule(matricule: string | null | undefined): string {
  if (!matricule) return '';
  return matricule.replace(/\s+/g, '').toUpperCase();
}

/**
 * Génère toutes les variantes courantes d'un matricule BCRG afin de résoudre
 * les disparités de saisie entre les fichiers CSV des RH et l'Active Directory.
 */
export function getMatriculeVariants(rawMatricule: string | null | undefined): string[] {
  const norm = normalizeMatricule(rawMatricule);
  if (!norm) return [];

  const variants = new Set<string>();
  variants.add(norm);

  // Variante sans tiret
  const noDash = norm.replace(/-/g, '');
  variants.add(noDash);

  if (norm.startsWith('BCRG')) {
    const afterBcrg = norm.replace(/^BCRG-?/, '');
    if (afterBcrg) {
      variants.add(afterBcrg);
      variants.add(`BCRG-${afterBcrg}`);
      variants.add(`BCRG${afterBcrg}`);

      const strippedZeros = afterBcrg.replace(/^0+/, '');
      if (strippedZeros && strippedZeros !== afterBcrg) {
        variants.add(strippedZeros);
        variants.add(`BCRG${strippedZeros}`);
        variants.add(`BCRG-${strippedZeros}`);
      }
    }
  } else {
    variants.add(`BCRG${norm}`);
    variants.add(`BCRG-${norm}`);

    const strippedZeros = norm.replace(/^0+/, '');
    if (strippedZeros && strippedZeros !== norm) {
      variants.add(strippedZeros);
      variants.add(`BCRG${strippedZeros}`);
      variants.add(`BCRG-${strippedZeros}`);
    }
  }

  return Array.from(variants);
}

/**
 * Supprime les accents, met en minuscule et retire la ponctuation
 * pour comparaison phonétique et textuelle fiable.
 */
export function sanitizeNameToken(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les diacritiques/accents
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .trim();
}

/**
 * Vérifie si deux identités correspondent, indépendamment de l'ordre Nom/Prénom,
 * de la casse et des accents.
 *
 * Exemples :
 * - "Conté Mohamed Lamine" <-> "Conte Mohamed Lamine" -> true
 * - "Kaba Karamo" <-> "Karamo Kaba" -> true
 */
export function matchPersonNames(
  adLastName: string | null | undefined,
  adFirstName: string | null | undefined,
  dbNom: string | null | undefined,
  dbPrenom: string | null | undefined
): boolean {
  const adClean = sanitizeNameToken(`${adLastName || ''} ${adFirstName || ''}`);
  const dbClean = sanitizeNameToken(`${dbNom || ''} ${dbPrenom || ''}`);

  if (!adClean || !dbClean) return false;
  if (adClean === dbClean) return true;

  const adTokens = adClean.split(/\s+/).filter(Boolean).sort();
  const dbTokens = dbClean.split(/\s+/).filter(Boolean).sort();

  // Même ensemble de mots composants le nom
  if (adTokens.join(' ') === dbTokens.join(' ')) return true;

  // Tolérance pour les prénoms composés abrégés (ex: "Almamy 2 Sylla" vs "Sylla Almamy")
  const common = adTokens.filter(t => dbTokens.includes(t));
  if (common.length >= 2 && (common.length === adTokens.length || common.length === dbTokens.length)) {
    return true;
  }

  return false;
}

/**
 * Vérifie si un email ou identifiant Active Directory correspond au nom/prénom d'un profil.
 *
 * Exemples :
 * - "karamo.kaba@bcrg-guinee.org" avec Nom: "Kaba", Prénom: "Karamo" -> true
 * - "kkaba@bcrg-guinee.org" avec Nom: "Kaba", Prénom: "Karamo" -> true
 * - "mohamed.conte@bcrg-guinee.org" avec Nom: "Conté", Prénom: "Mohamed Lamine" -> true
 */
export function matchEmailWithPerson(
  emailOrUsername: string | null | undefined,
  dbNom: string | null | undefined,
  dbPrenom: string | null | undefined
): boolean {
  if (!emailOrUsername) return false;

  const prefix = sanitizeNameToken(emailOrUsername.includes('@') ? emailOrUsername.split('@')[0] : emailOrUsername);
  const nomClean = sanitizeNameToken(dbNom);
  const prenomClean = sanitizeNameToken(dbPrenom);

  if (!nomClean || !prenomClean) return false;

  // Cas standard : identifiant de type prenom.nom ou nom.prenom
  const nomFirst = nomClean.split(/\s+/)[0];
  const prenomFirst = prenomClean.split(/\s+/)[0];

  if (nomFirst && prenomFirst && prefix.includes(nomFirst) && prefix.includes(prenomFirst)) {
    return true;
  }

  // Cas initiale + nom (ex: "kkaba" pour "Karamo Kaba")
  if (prenomClean.length > 0 && nomFirst && nomFirst.length > 2) {
    const initialPlusNom = `${prenomClean[0]}${nomFirst}`;
    if (prefix === initialPlusNom) return true;
  }

  return false;
}
