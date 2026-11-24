import {
  Alert,
  Anchor,
  Avatar,
  Badge,
  Button,
  CopyButton,
  Grid,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconCheck, IconLink } from '@tabler/icons-react';
import { Fragment, lazy, Suspense } from 'react';
import { useParams } from 'react-router';
import type { OrganizationProfileResponse } from '@/api/generated/model';
import { PublicProducts } from '@/features/catalog/components/PublicProducts';
import { NotFoundPage } from '@/features/errors/NotFoundPage';
import { mainAddress, otherAddresses } from './addresses';
import { initials } from './initials';
import { formatOpeningHours } from './openingHours';
import { useOrganizationProfile } from './api/useOrganizationProfile';
import {
  ACTIVITY_TYPE_LABELS,
  otherAddressTitle,
  ORGANIZATION_TYPE_LABELS,
  PROVINCE_LABELS,
  RESPONSE_TIME_LABELS,
  SECTOR_LABELS,
} from './labels';
import styles from './OrganizationProfilePage.module.css';

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

function phoneHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

function Profile({ profile }: { profile: OrganizationProfileResponse }) {
  const main = mainAddress(profile.addresses);
  const others = otherAddresses(profile.addresses);
  const mainPoint = main?.location;
  const place = main ? `${main.locality}, ${PROVINCE_LABELS[main.province]}` : '';
  const address = main
    ? [main.street, main.locality, main.district].filter(Boolean).join(', ')
    : '';

  return (
    <Stack gap="lg">
      <title>{`${profile.name} · CooperAR`}</title>
      <Paper withBorder radius="lg" className={styles.summary}>
        {/* Without a cover there is no empty strip: the card starts with the logo and the name. */}
        {profile.photos.coverUrl && (
          // Decorative: it shows the place, and the name right below says whose it is.
          <img src={profile.photos.coverUrl} alt="" className={styles.cover} />
        )}
        <Group justify="space-between" gap="md" p="lg">
          <Group gap="md" wrap="nowrap" miw={0}>
            {/* Without a logo, the initials of the name, as in the catalog. */}
            <Avatar
              src={profile.photos.logoUrl ?? null}
              alt={profile.photos.logoUrl ? `Logo de ${profile.name}` : ''}
              size={80}
              radius="50%"
              color="brand"
              aria-hidden={profile.photos.logoUrl ? undefined : true}
            >
              {initials(profile.name)}
            </Avatar>
            <Stack gap="xs" miw={0}>
              <Title order={1}>{profile.name}</Title>
              <Group gap="sm">
                <Badge variant="light">{ORGANIZATION_TYPE_LABELS[profile.type]}</Badge>
                {profile.sectors.map((sector) => (
                  <Badge key={sector} variant="light" color="gray">
                    {SECTOR_LABELS[sector]}
                  </Badge>
                ))}
                <Text c="dimmed">{place}</Text>
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
            {/* Always there: every organization offers at least one activity type. */}
            <Paper component="section" withBorder radius="lg" p="lg" aria-labelledby="about">
              <Title order={2} size="h3" id="about" mb="xs">
                Sobre la entidad
              </Title>
              {profile.description && (
                <Text className={styles.description}>{profile.description}</Text>
              )}
              <dl className={styles.facts}>
                {profile.legalName && (
                  <div>
                    <dt>Razón social</dt>
                    <dd>{profile.legalName}</dd>
                  </div>
                )}
                {profile.startYear && (
                  <div>
                    <dt>Año de inicio</dt>
                    <dd>{profile.startYear}</dd>
                  </div>
                )}
                {profile.workerCount && (
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
                          {ACTIVITY_TYPE_LABELS[type]}
                        </Badge>
                      ))}
                    </Group>
                  </dd>
                </div>
              </dl>
            </Paper>
            {profile.photos.gallery.length > 0 && (
              <section aria-labelledby="photos">
                <Title order={2} size="h3" id="photos" mb="xs">
                  Fotos
                </Title>
                <SimpleGrid
                  component="ul"
                  cols={{ base: 2, sm: 3 }}
                  spacing="sm"
                  className={styles.gallery}
                >
                  {profile.photos.gallery.map((photo, index) => (
                    <li key={photo.id}>
                      <a href={photo.url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={photo.url}
                          alt={`Foto ${String(index + 1)} de ${profile.name}`}
                          loading="lazy"
                          className={styles.galleryPhoto}
                        />
                      </a>
                    </li>
                  ))}
                </SimpleGrid>
              </section>
            )}
            <section aria-labelledby="products">
              <PublicProducts slug={profile.slug} />
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
                {main && (
                  <>
                    <dt>{main.name ?? 'Dirección'}</dt>
                    <dd>{address}</dd>
                  </>
                )}
                {main?.additionalReferences && (
                  <>
                    <dt>Cómo llegar</dt>
                    <dd>{main.additionalReferences}</dd>
                  </>
                )}
                {others.map((other, index) => (
                  // The API sends no id for them, and their order only changes when the organization saves.
                  <Fragment key={index}>
                    <dt>{otherAddressTitle(other.name, other.type, other.district)}</dt>
                    <dd>
                      {[
                        other.street,
                        other.locality,
                        other.district,
                        PROVINCE_LABELS[other.province],
                      ]
                        .filter(Boolean)
                        .join(', ')}
                      {other.additionalReferences && (
                        <Text size="sm" c="dimmed" component="span" display="block">
                          {other.additionalReferences}
                        </Text>
                      )}
                    </dd>
                  </Fragment>
                ))}
                {profile.phone && (
                  <>
                    <dt>Teléfono</dt>
                    <dd>
                      <Anchor href={phoneHref(profile.phone)}>{profile.phone}</Anchor>
                    </dd>
                  </>
                )}
                {profile.whatsapp && (
                  <>
                    <dt>WhatsApp</dt>
                    <dd>
                      <Anchor href={phoneHref(profile.whatsapp)}>{profile.whatsapp}</Anchor>
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
                {profile.website && (
                  <>
                    <dt>Sitio web</dt>
                    <dd>
                      <Anchor href={profile.website} target="_blank" rel="noopener noreferrer">
                        {profile.website.replace(/^https?:\/\//, '')}
                      </Anchor>
                    </dd>
                  </>
                )}
                {profile.socialMedia && (
                  <>
                    <dt>Redes sociales</dt>
                    <dd>{profile.socialMedia}</dd>
                  </>
                )}
                {profile.openingHours.length > 0 && (
                  <>
                    <dt>Horarios de atención</dt>
                    <dd>
                      {formatOpeningHours(profile.openingHours).map(({ days, hours }) => (
                        <div key={days}>
                          {days}: {hours}
                        </div>
                      ))}
                    </dd>
                  </>
                )}
                {profile.responseTime && (
                  <>
                    <dt>Tiempo estimado de respuesta</dt>
                    <dd>{RESPONSE_TIME_LABELS[profile.responseTime]}</dd>
                  </>
                )}
              </dl>
            </Paper>
            {mainPoint && (
              <Paper component="section" withBorder radius="lg" p="lg" aria-labelledby="location">
                <Title order={2} size="h4" id="location" mb="sm">
                  Ubicación
                </Title>
                <Suspense fallback={<Text c="dimmed">Cargando el mapa…</Text>}>
                  <LocationMap
                    latitude={mainPoint.latitude}
                    longitude={mainPoint.longitude}
                    approximate={mainPoint.approximate}
                    label={
                      mainPoint.approximate
                        ? `Mapa con la zona de ${profile.name}`
                        : `Mapa con la ubicación de ${profile.name}`
                    }
                  />
                </Suspense>
                {mainPoint.approximate && (
                  <Text size="sm" c="dimmed" mt="xs">
                    El mapa marca solo la zona: la entidad no publica su dirección exacta.
                  </Text>
                )}
              </Paper>
            )}
            <Text size="sm" c="dimmed">
              Solo se muestran los datos que la entidad eligió hacer públicos.
            </Text>
          </Stack>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
