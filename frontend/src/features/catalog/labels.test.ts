import { describe, expect, it } from 'vitest';
import { ProductType, SaleMode } from '@/api/generated/model';
import { indicativePriceLabel, ownItemLabel, saleModesLabel } from './labels';

describe('saleModesLabel', () => {
  it('names the modes the product is sold in', () => {
    expect(saleModesLabel([SaleMode.RETAIL])).toBe('Minorista');
    expect(saleModesLabel([SaleMode.WHOLESALE])).toBe('Mayorista');
    expect(saleModesLabel([SaleMode.WHOLESALE, SaleMode.RETAIL])).toBe('Minorista y mayorista');
  });
});

describe('indicativePriceLabel', () => {
  it('formats the price as a starting point, in the Argentine way', () => {
    expect(indicativePriceLabel(8500)).toBe('Desde $ 8.500');
    expect(indicativePriceLabel(1234.5)).toBe('Desde $ 1.234,5');
  });
});

describe('ownItemLabel', () => {
  it('says whether the own item is a product or a service', () => {
    expect(ownItemLabel(ProductType.SERVICE)).toBe(
      'Este servicio pertenece a una de tus entidades',
    );
    expect(ownItemLabel(ProductType.PRODUCT)).toBe(
      'Este producto pertenece a una de tus entidades',
    );
  });
});
