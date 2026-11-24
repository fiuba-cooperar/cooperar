/** Sections of the public site, in menu order. Those that do not exist yet render a "coming soon" page. */
export const PUBLIC_SECTIONS = [
  { path: '/organizations', label: 'Entidades' },
  { path: '/catalog', label: 'Catálogo' },
  { path: '/fairs', label: 'Ferias' },
  { path: '/history', label: 'Historia del sector' },
] as const;

export const REGISTER_PATH = '/register';
