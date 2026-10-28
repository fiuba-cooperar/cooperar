import axe from 'axe-core';
import { expect } from 'vitest';

/** Fails the test if axe-core finds WCAG 2.x A/AA violations inside `container`. */
export async function expectNoA11yViolations(container: Element) {
  const results = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  });
  expect(results.violations.map(({ id, help }) => `${id}: ${help}`)).toEqual([]);
}
