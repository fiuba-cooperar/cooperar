import {
  OrganizationType,
  RegistrationStatus,
  type AdminRegistrationRequestResponse,
} from '@/api/generated/model';

interface StatusFilter {
  status: RegistrationStatus;
  slug: string;
  label: string;
  empty: string;
}

/** The review queue, which the page shows first. */
export const PENDING_FILTER: StatusFilter = {
  status: RegistrationStatus.PENDING,
  slug: 'pending',
  label: 'Pendientes',
  empty: 'No hay solicitudes pendientes.',
};

/** How the observatory names each status of a request in the filter. */
export const REGISTRATION_STATUS_FILTERS: readonly StatusFilter[] = [
  PENDING_FILTER,
  {
    status: RegistrationStatus.APPROVED,
    slug: 'approved',
    label: 'Aprobadas',
    empty: 'Todavía no hay solicitudes aprobadas.',
  },
  {
    status: RegistrationStatus.REJECTED,
    slug: 'rejected',
    label: 'Rechazadas',
    empty: 'No hay solicitudes rechazadas.',
  },
  {
    status: RegistrationStatus.CHANGES_REQUESTED,
    slug: 'changes-requested',
    label: 'Solicitud de cambios',
    empty: 'No hay solicitudes esperando cambios de la entidad.',
  },
];

interface TypeFilter {
  type: OrganizationType | undefined;
  slug: string;
  label: string;
}

/** Leaving the type filter on both shows every request. */
export const BOTH_TYPES_FILTER: TypeFilter = { type: undefined, slug: 'all', label: 'Ambas' };

export const REGISTRATION_TYPE_FILTERS: readonly TypeFilter[] = [
  BOTH_TYPES_FILTER,
  { type: OrganizationType.COOPERATIVE, slug: 'cooperative', label: 'Cooperativa de origen' },
  { type: OrganizationType.ERT, slug: 'ert', label: 'Empresa recuperada' },
];

type Registration = AdminRegistrationRequestResponse;

interface SortOrder {
  slug: string;
  label: string;
  compare: (a: Registration, b: Registration) => number;
}

const NAMES = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

function bySubmission(a: Registration, b: Registration) {
  return Date.parse(a.submittedAt) - Date.parse(b.submittedAt);
}

/** The queue is worked through from the request that has waited the longest. */
export const OLDEST_FIRST: SortOrder = {
  slug: 'oldest',
  label: 'Más antiguas',
  compare: bySubmission,
};

/** The history is read from the latest request back. */
export const NEWEST_FIRST: SortOrder = {
  slug: 'newest',
  label: 'Más nuevas',
  compare: (a, b) => bySubmission(b, a),
};

/** Dates go by when the request was last sent, the date its card shows. */
export const REGISTRATION_SORT_ORDERS: readonly SortOrder[] = [
  NEWEST_FIRST,
  OLDEST_FIRST,
  { slug: 'name-asc', label: 'Nombre (A-Z)', compare: (a, b) => NAMES.compare(a.name, b.name) },
  { slug: 'name-desc', label: 'Nombre (Z-A)', compare: (a, b) => NAMES.compare(b.name, a.name) },
];
