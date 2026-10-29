/** Sections of the public site, in menu order. None of them exists yet, so they render a "coming soon" page. */
export const PUBLIC_SECTIONS = [
  { path: '/organizations', label: 'Empresas' },
  { path: '/catalog', label: 'Catálogo' },
  { path: '/map', label: 'Mapa' },
  { path: '/fairs', label: 'Ferias' },
  { path: '/history', label: 'Historia del sector' },
] as const;

// TODO(#11): replace the "coming soon" page with the registration flow.
export const REGISTER_PATH = '/register';
