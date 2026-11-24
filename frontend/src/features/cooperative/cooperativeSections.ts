import { IconBox, IconFileText, IconHome, IconUsers } from '@tabler/icons-react';

/** Entry of the panel: sends to the panel of one of the account's organizations. */
export const COOPERATIVE_PATH = '/cooperative';

/**
 * The addresses of the panel of an organization. The organization is part of the address, so reloading the page or
 * sharing the link keeps showing the same one.
 */
export function cooperativePanel(slug: string) {
  const home = `${COOPERATIVE_PATH}/${encodeURIComponent(slug)}`;
  return {
    home,
    profile: `${home}/profile`,
    products: `${home}/products`,
    newProduct: `${home}/products/new`,
    team: `${home}/team`,
    product: (id: string) => `${home}/products/${id}`,
  };
}

/** Sections of the cooperative panel, in menu order. `segment` is the part of the address after the organization. */
export const COOPERATIVE_SECTIONS = [
  { segment: '', label: 'Inicio', icon: IconHome },
  { segment: 'profile', label: 'Ficha', icon: IconFileText },
  { segment: 'products', label: 'Productos y servicios', icon: IconBox },
  // TODO(#68): replace the "coming soon" page with the team management.
  { segment: 'team', label: 'Usuarios', icon: IconUsers },
] as const;
