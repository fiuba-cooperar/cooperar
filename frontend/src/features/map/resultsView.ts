/**
 * The directory and the catalog show their results as a list or on a map, kept in the address with the rest of the
 * search: `/organizations?q=pan&view=map`. The list is the default and leaves the parameter out.
 */
const VIEW_PARAM = 'view';
const MAP_VIEW = 'map';

export function isMapView(params: URLSearchParams): boolean {
  return params.get(VIEW_PARAM) === MAP_VIEW;
}

/** The same search, on the map or as a list. */
export function withView(params: URLSearchParams, map: boolean): URLSearchParams {
  const next = new URLSearchParams(params);
  if (map) next.set(VIEW_PARAM, MAP_VIEW);
  else next.delete(VIEW_PARAM);
  return next;
}
