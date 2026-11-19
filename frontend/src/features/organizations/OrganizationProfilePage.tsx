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
import { ActivityType, type OrganizationProfileResponse } from '@/api/generated/model';
import { NotFoundPage } from '@/features/errors/NotFoundPage';
import { useOrganizationProfile } from './api/useOrganizationProfile';
import {
  ORGANIZATION_TYPE_BADGES,
  PROVINCE_LABELS,
  RESPONSE_TIME_LABELS,
  SECTOR_LABELS,
} from './labels';
import styles from './OrganizationProfilePage.module.css';

/** What the organization offers, in the plural the public page reads better with. */
const OFFER_LABELS: Record<ActivityType, string> = {
  [ActivityType.WORK]: 'Trabajo',
  [ActivityType.SERVICE]: 'Servicios',
  [ActivityType.PRODUCT]: 'Productos',
};

const LocationMap = lazy(() =>
  import('@/components/map/LocationMap').then((module) => ({ default: module.LocationMap })),
);

export function OrganizationProfilePage() {
  const { slug = '' } = useParams();
  const { data: profile, isPending, isError } = useOrganizationProfile(slug);

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

const SAFE_LINK = /^https?:\/\/\S+$/;

/** WhatsApp only opens from a number with its country code; without it the number is shown as text. */
function whatsappLink(number: string): string | null {
  const digits = number.replace(/\D/g, '');
  return digits.startsWith('54') ? `https://wa.me/${digits}` : null;
}

function Profile({ profile }: { profile: OrganizationProfileResponse }) {
  const place = `${profile.locality}, ${PROVINCE_LABELS[profile.province]}`;
  const address = [profile.street, profile.locality, profile.district].filter(Boolean).join(', ');
  const whatsapp = profile.whatsapp ? whatsappLink(profile.whatsapp) : null;

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
                <Badge variant="filled">{ORGANIZATION_TYPE_BADGES[profile.type]}</Badge>
                {profile.sectors.map((sector) => (
                  <Badge key={sector} variant="light">
                    {SECTOR_LABELS[sector]}
                  </Badge>
                ))}
                <Text c="dimmed">{place}</Text>
              </Group>
            </Stack>
          </Group>
          <Group gap="sm">
            {/* TODO(#22) */}
            <Button type="button">Enviar una consulta</Button>
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
            <Paper component="section" withBorder radius="lg" p="lg" aria-labelledby="about">
              <Title order={2} size="h3" id="about" mb="xs">
                Sobre la entidad
              </Title>
              {profile.description && (
                <Text className={styles.description} mb="md">
                  {profile.description}
                </Text>
              )}
              <dl className={styles.facts}>
                {profile.legalName && (
                  <div>
                    <dt>Razón social</dt>
                    <dd>{profile.legalName}</dd>
                  </div>
                )}
                {profile.foundingYear !== undefined && (
                  <div>
                    <dt>Año de inicio</dt>
                    <dd>{profile.foundingYear}</dd>
                  </div>
                )}
                {profile.workerCount !== undefined && (
                  <div>
                    <dt>Trabajadores</dt>
                    <dd>{profile.workerCount}</dd>
                  </div>
                )}
                <div>
                  <dt>Qué ofrecen</dt>
                  <dd>
                    <Group gap={6}>
                      {profile.activityTypes.map((type) => (
                        <Badge key={type} variant="light">
                          {OFFER_LABELS[type]}
                        </Badge>
                      ))}
                    </Group>
                  </dd>
                </div>
              </dl>
            </Paper>
            <section aria-labelledby="products">
              <Title order={2} size="h3" id="products" mb="xs">
                Productos y servicios
              </Title>
              {/* TODO(#21) */}
              <Text c="dimmed">Esta entidad todavía no cargó productos.</Text>
            </section>
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack gap="lg">
            <Paper component="section" withBorder radius="lg" p="lg" aria-labelledby="contact">
              <Title order={2} size="h4" id="contact" mb="sm">
                Datos de contacto
              </Title>
              <dl className={styles.contact}>
                <dt>Dirección</dt>
                <dd>{address}</dd>
                {profile.additionalReferences && (
                  <>
                    <dt>Referencias</dt>
                    <dd>{profile.additionalReferences}</dd>
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
                {profile.whatsapp && (
                  <>
                    <dt>WhatsApp</dt>
                    <dd>
                      {whatsapp ? (
                        <Anchor href={whatsapp}>{profile.whatsapp}</Anchor>
                      ) : (
                        profile.whatsapp
                      )}
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
                {(profile.website ?? profile.socialMedia) && (
                  <>
                    <dt>Sitio web y redes</dt>
                    <dd>
                      {profile.website &&
                        (SAFE_LINK.test(profile.website) ? (
                          <Anchor href={profile.website} target="_blank" rel="noopener noreferrer">
                            {profile.website.replace(/^https?:\/\//, '')}
                          </Anchor>
                        ) : (
                          profile.website
                        ))}
                      {profile.website && profile.socialMedia && ' · '}
                      {profile.socialMedia}
                    </dd>
                  </>
                )}
                {profile.openingHours && (
                  <>
                    <dt>Horarios de atención</dt>
                    <dd>{profile.openingHours}</dd>
                  </>
                )}
                {profile.responseTime && (
                  <>
                    <dt>Tiempo estimado de respuesta</dt>
                    <dd>{RESPONSE_TIME_LABELS[profile.responseTime]}</dd>
                  </>
                )}
              </dl>
              {/* TODO(#22) */}
              <Button type="button" fullWidth mt="md">
                Enviar una consulta
              </Button>
            </Paper>
            {profile.location && (
              <Paper component="section" withBorder radius="lg" p="lg" aria-labelledby="location">
                <Title order={2} size="h4" id="location" mb="sm">
                  Ubicación
                </Title>
                <Suspense fallback={<Text c="dimmed">Cargando el mapa…</Text>}>
                  <LocationMap
                    latitude={profile.location.latitude}
                    longitude={profile.location.longitude}
                    approximate={!profile.exactLocation}
                    label={`Mapa con la ubicación de ${profile.name}`}
                  />
                </Suspense>
                {!profile.exactLocation && (
                  <Text size="sm" c="dimmed" mt="xs">
                    La entidad no publicó su dirección exacta: el mapa marca solo la zona.
                  </Text>
                )}
              </Paper>
            )}
          </Stack>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
