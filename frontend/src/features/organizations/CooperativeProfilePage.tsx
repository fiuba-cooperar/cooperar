import {
  Alert,
  Anchor,
  Badge,
  Button,
  CopyButton,
  Grid,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconCheck, IconLink } from '@tabler/icons-react';
import { lazy, Suspense } from 'react';
import { useParams } from 'react-router';
import type { CooperativeProfileResponse } from '@/api/generated/model';
import { NotFoundPage } from '@/features/errors/NotFoundPage';
import { useCooperativeProfile } from './api/useCooperativeProfile';
import styles from './CooperativeProfilePage.module.css';

const LocationMap = lazy(() =>
  import('@/components/map/LocationMap').then((module) => ({ default: module.LocationMap })),
);

export function CooperativeProfilePage() {
  const { slug = '' } = useParams();
  const { data: profile, isPending, isError } = useCooperativeProfile(slug);

  if (isPending) return <Text role="status">Cargando la ficha…</Text>;
  if (isError) {
    return (
      <Alert color="red" title="No pudimos cargar la ficha">
        Probá de nuevo en unos minutos.
      </Alert>
    );
  }
  if (!profile) return <NotFoundPage />;
  return <Profile profile={profile} />;
}

function Profile({ profile }: { profile: CooperativeProfileResponse }) {
  const place = [profile.locality, profile.province].filter(Boolean).join(', ');
  const hasContact = [profile.address, profile.phone, profile.email].some(Boolean);

  return (
    <Stack gap="lg">
      <title>{`${profile.name} · CooperAR`}</title>
      <Paper withBorder radius="lg" className={styles.summary}>
        {/* TODO(#13): show the cover photo. */}
        <div className={styles.cover} />
        <Group justify="space-between" gap="md" p="lg">
          <Group gap="md" wrap="nowrap" miw={0}>
            {/* TODO(#13): show the logo. */}
            <div className={styles.logo} />
            <Stack gap="xs" miw={0}>
              <Title order={1}>{profile.name}</Title>
              <Group gap="sm">
                {profile.industry && <Badge variant="light">{profile.industry}</Badge>}
                {place && <Text c="dimmed">{place}</Text>}
              </Group>
            </Stack>
          </Group>
          <Group gap="sm">
            {/* TODO(#22) */}
            <Button type="button">Contactar</Button>
            <CopyButton value={window.location.href}>
              {({ copied, copy }) => (
                <Button
                  type="button"
                  variant="outline"
                  leftSection={copied ? <IconCheck size={18} /> : <IconLink size={18} />}
                  onClick={copy}
                >
                  {copied ? 'Enlace copiado' : 'Copiar enlace'}
                </Button>
              )}
            </CopyButton>
          </Group>
        </Group>
      </Paper>

      <Grid gap="lg">
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stack gap="lg">
            {profile.description && (
              <Paper component="section" withBorder radius="lg" p="lg" aria-labelledby="about">
                <Title order={2} size="h3" id="about" mb="xs">
                  Sobre la cooperativa
                </Title>
                <Text className={styles.description}>{profile.description}</Text>
              </Paper>
            )}
            <section aria-labelledby="products">
              <Title order={2} size="h3" id="products" mb="xs">
                Productos y servicios
              </Title>
              {/* TODO(#21) */}
              <Text c="dimmed">Esta cooperativa todavía no cargó productos.</Text>
            </section>
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack gap="lg">
            {hasContact && (
              <Paper component="section" withBorder radius="lg" p="lg" aria-labelledby="contact">
                <Title order={2} size="h4" id="contact" mb="sm">
                  Datos de contacto
                </Title>
                <dl className={styles.contact}>
                  {profile.address && (
                    <>
                      <dt>Dirección</dt>
                      <dd>{profile.address}</dd>
                    </>
                  )}
                  {profile.phone && (
                    <>
                      <dt>Teléfono</dt>
                      <dd>
                        <Anchor href={`tel:${profile.phone.replace(/[^\d+]/g, '')}`}>
                          {profile.phone}
                        </Anchor>
                      </dd>
                    </>
                  )}
                  {profile.email && (
                    <>
                      <dt>Email</dt>
                      <dd>
                        <Anchor href={`mailto:${profile.email}`}>{profile.email}</Anchor>
                      </dd>
                    </>
                  )}
                </dl>
              </Paper>
            )}
            {profile.location && (
              <Paper component="section" withBorder radius="lg" p="lg" aria-labelledby="location">
                <Title order={2} size="h4" id="location" mb="sm">
                  Ubicación
                </Title>
                <Suspense fallback={<Text c="dimmed">Cargando el mapa…</Text>}>
                  <LocationMap
                    latitude={profile.location.latitude}
                    longitude={profile.location.longitude}
                    label={`Mapa con la ubicación de ${profile.name}`}
                  />
                </Suspense>
              </Paper>
            )}
          </Stack>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
