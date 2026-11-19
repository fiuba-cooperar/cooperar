import { SaleMode } from '@/api/generated/model';

export const SALE_MODE_LABELS: Record<SaleMode, string> = {
  [SaleMode.RETAIL]: 'Minorista',
  [SaleMode.WHOLESALE]: 'Mayorista',
};

/** "Minorista", "Mayorista" or "Minorista y mayorista". */
export function saleModesLabel(saleModes: SaleMode[]): string {
  const retail = saleModes.includes(SaleMode.RETAIL);
  const wholesale = saleModes.includes(SaleMode.WHOLESALE);
  if (retail && wholesale) return 'Minorista y mayorista';
  return wholesale ? SALE_MODE_LABELS[SaleMode.WHOLESALE] : SALE_MODE_LABELS[SaleMode.RETAIL];
}

/** The price is only indicative, so it is always shown as a starting point: "Desde $ 8.500". */
export function indicativePriceLabel(price: number): string {
  return `Desde $ ${price.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;
}
