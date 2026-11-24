/** Longest name an organization can have; the same limit the API validates. */
export const ORGANIZATION_NAME_MAX_LENGTH = 50;

/** Longest legal name (razón social), which carries the type and the legal suffix besides the name. */
export const LEGAL_NAME_MAX_LENGTH = 120;

/** What is wrong with a typed legal name, or undefined when it can be sent. */
export function legalNameProblem(legalName: string): string | undefined {
  const length = legalName.trim().length;
  if (length === 0) return 'Ingresá la razón social.';
  if (length > LEGAL_NAME_MAX_LENGTH) {
    return `La razón social puede tener hasta ${String(LEGAL_NAME_MAX_LENGTH)} caracteres.`;
  }
  return undefined;
}

/** What is wrong with a typed organization name, or undefined when it can be sent. */
export function organizationNameProblem(name: string): string | undefined {
  const length = name.trim().length;
  if (length === 0) return 'Ingresá el nombre de la entidad.';
  if (length > ORGANIZATION_NAME_MAX_LENGTH) {
    return `El nombre puede tener hasta ${String(ORGANIZATION_NAME_MAX_LENGTH)} caracteres.`;
  }
  return undefined;
}
