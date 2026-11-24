import { Button } from '@mantine/core';
import { IconList, IconMap } from '@tabler/icons-react';

/** Switches the results between the list and the map, in the same page. */
export function ViewToggle({ map, onChange }: { map: boolean; onChange: (map: boolean) => void }) {
  return (
    <Button
      variant="outline"
      h={44}
      px={16}
      leftSection={
        map ? (
          <IconList size={18} stroke={2} aria-hidden />
        ) : (
          <IconMap size={18} stroke={2} aria-hidden />
        )
      }
      onClick={() => {
        onChange(!map);
      }}
    >
      {map ? 'Ver el listado' : 'Ver en el mapa'}
    </Button>
  );
}
