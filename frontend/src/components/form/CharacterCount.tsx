import { Text } from '@mantine/core';

/** «12/50», for the right section of a field with a character limit; turns red once the limit is passed. */
export function CharacterCount({ length, max }: { length: number; max: number }) {
  return (
    <Text size="xs" c={length > max ? 'red.8' : 'dimmed'} aria-hidden>
      {length}/{max}
    </Text>
  );
}
