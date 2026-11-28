import userEvent from '@testing-library/user-event';

/**
 * Puts the whole value in the field at once, as pasting it. Typing it key by key re-renders the form on every key,
 * which in jsdom takes seconds for a long form: this is for tests that only need the field filled in, while the ones
 * about typing (a counter, a limit, the suggestions) keep typing.
 */
export async function fill(field: HTMLElement, value: string) {
  await userEvent.click(field);
  await userEvent.paste(value);
}
