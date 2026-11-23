import { describe, expect, it } from 'vitest';
import { byDistance, distanceKm, formatDistance } from './geo';

describe('geo', () => {
  it('measures along the surface of the Earth', () => {
    // From the Obelisco to the Plaza de Mayo, about a kilometer.
    expect(
      distanceKm(
        { latitude: -34.6037, longitude: -58.3816 },
        { latitude: -34.6083, longitude: -58.3712 },
      ),
    ).toBeCloseTo(1.07, 1);
  });

  it('sorts the places by distance, the nearest first', () => {
    const from = { latitude: 0, longitude: 0 };
    const sorted = byDistance(
      [
        { name: 'far', latitude: 1, longitude: 0 },
        { name: 'near', latitude: 0.1, longitude: 0 },
      ],
      from,
    );
    expect(sorted.map(({ place }) => place.name)).toEqual(['near', 'far']);
  });

  it('writes the distance in meters, then with one decimal and then in whole kilometers', () => {
    expect(formatDistance(0.012)).toBe('a 50 m');
    expect(formatDistance(0.348)).toBe('a 350 m');
    expect(formatDistance(1.24)).toBe('a 1,2 km');
    expect(formatDistance(45.6)).toBe('a 46 km');
    expect(formatDistance(1234)).toBe('a 1.234 km');
  });
});
