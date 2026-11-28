import { describe, expect, it } from 'vitest';
import type { OrganizationMapResponse } from '@/api/generated/model';
import { nearbyOf, pinsOf } from './pins';

const VISITOR = { latitude: -34.6, longitude: -58.4 };

/** An organization with an address this many degrees south of the visitor for each value. */
function organization(slug: string, ...south: number[]): OrganizationMapResponse {
  return {
    slug,
    name: slug,
    type: 'COOPERATIVE',
    sectors: ['FOOD'],
    places: south.map((degrees) => ({
      type: 'MAIN',
      province: 'BUENOS_AIRES',
      district: 'Avellaneda',
      locality: 'Sarandí',
      latitude: VISITOR.latitude - degrees,
      longitude: VISITOR.longitude,
      approximate: false,
    })),
  };
}

describe('nearbyOf', () => {
  it('frames the visitor and every address within 5 km, counting each organization once', () => {
    const pins = pinsOf([organization('two-near', 0.01, 0.03), organization('far', 1)]);

    const nearby = nearbyOf(pins, VISITOR);

    expect(nearby.count).toBe(1);
    expect(nearby.frame).toEqual([VISITOR, pins[0], pins[1]]);
    expect(nearby.nearestKm).toBeCloseTo(1.1, 1);
  });

  it('frames the nearest one when none is within 5 km', () => {
    const pins = pinsOf([organization('far', 2), organization('farther', 3)]);

    const nearby = nearbyOf(pins, VISITOR);

    expect(nearby.count).toBe(0);
    expect(nearby.frame).toEqual([VISITOR, pins[0]]);
    expect(nearby.nearestKm).toBeCloseTo(222, 0);
  });

  it('frames only the visitor when the map has no organizations', () => {
    expect(nearbyOf([], VISITOR)).toEqual({ frame: [VISITOR], count: 0, nearestKm: null });
  });
});
