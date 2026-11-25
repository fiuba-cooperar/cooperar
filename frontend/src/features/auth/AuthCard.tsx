import { Image, Paper, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import type { ReactNode } from 'react';

/** The card of the sign-in pages: the logo, a title, what it is about and the rest below. */
export function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Paper withBorder radius="lg" p="xl" maw={486} mx="auto" w="100%">
      <Stack gap="md">
        <Stack gap={6} align="center" ta="center">
          <Image src="/brand/logo-transparent.png" alt="cooperAR" w={180} h="auto" mb="xs" />
          <Title order={1} size="h2">
            {title}
          </Title>
          {description && (
            <Text c="dimmed" fz={15}>
              {description}
            </Text>
          )}
        </Stack>
        {children}
      </Stack>
    </Paper>
  );
}

/** What happened, with a large icon instead of the logo: an email on its way or a link that no longer works. */
export function AuthOutcome({
  icon,
  color,
  title,
  children,
}: {
  icon: ReactNode;
  color: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <Paper withBorder radius="lg" p="xl" maw={486} mx="auto" w="100%">
      <Stack align="center" ta="center" gap="md">
        <ThemeIcon variant="transparent" size={56} color={color} aria-hidden>
          {icon}
        </ThemeIcon>
        <Title order={1} fz={26}>
          {title}
        </Title>
        {children}
      </Stack>
    </Paper>
  );
}
