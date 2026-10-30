/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Tile server for the maps, as a Leaflet URL template. Defaults to the public OpenStreetMap tiles. */
  readonly VITE_MAP_TILE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
