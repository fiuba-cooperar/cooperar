import type { CatalogProductResponse } from '@/api/generated/model';
import { ProductCard } from './ProductCard';
import styles from './ProductGrid.module.css';

export const CARD_MIN_WIDTH = 260;
export const GRID_GAP = 20;

/** Product cards in a responsive grid: the catalog and "more from this organization" share it, so they look the same. */
export function ProductGrid({ products }: { products: CatalogProductResponse[] }) {
  return (
    <ul
      className={styles.grid}
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(${String(CARD_MIN_WIDTH)}px, 1fr))`,
        gap: GRID_GAP,
      }}
    >
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
