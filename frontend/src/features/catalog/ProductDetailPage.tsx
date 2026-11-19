import {
  Anchor,
  Avatar,
  Badge,
  Breadcrumbs,
  Button,
  Container,
  CopyButton,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconCheck, IconLink, IconMapPin, IconMessage } from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import type { CatalogProductResponse } from '@/api/generated/model';
import { NotFoundPage } from '@/features/errors/NotFoundPage';
import {
  ORGANIZATION_TYPE_LABELS,
  RESPONSE_TIME_LABELS,
  SECTOR_LABELS,
} from '@/features/organizations/labels';
import { initials } from '@/features/organizations/initials';
import { useProduct } from './api/useProduct';
import { ProductGrid } from './components/ProductGrid';
import { placeLabel, priceLines, SALE_MODE_LABELS } from './labels';
import { CATALOG_PATH } from './productSearch';
import styles from './ProductDetailPage.module.css';

const SECTION = { size: 1276, px: { base: 'md', sm: 48 } } as const;

function Gallery({ product }: { product: CatalogProductResponse }) {
  const [selected, setSelected] = useState(0);
  const { photos } = product;
  const current = photos[selected];
  return (
    <Stack component="section" aria-label="Fotos del producto" gap={14} className={styles.gallery}>
      <Paper withBorder radius={14} style={{ overflow: 'hidden' }}>
        {current ? (
          <img
            src={current.url}
            alt={`Foto ${String(selected + 1)} de ${product.name}`}
            className={styles.main}
          />
        ) : (
          <div className={styles.main}>Sin fotos</div>
        )}
      </Paper>
      {photos.length > 1 && (
        <Group gap={12} role="group" aria-label="Elegir foto">
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              className={styles.thumb}
              aria-pressed={index === selected}
              aria-label={`Ver la foto ${String(index + 1)} de ${String(photos.length)}`}
              onClick={() => {
                setSelected(index);
              }}
            >
              <img src={photo.url} alt="" />
            </button>
          ))}
        </Group>
      )}
    </Stack>
  );
}

function Product({
  product,
  more,
}: {
  product: CatalogProductResponse;
  more: CatalogProductResponse[];
}) {
  const { organization } = product;
  const organizationPath = `/organizations/${organization.slug}`;
  const price = priceLines(product.indicativePrice);
  return (
    <Container {...SECTION} pt={28} pb={56}>
      <title>{`${product.name} · CooperAR`}</title>
      <Stack gap={28}>
        <Group justify="space-between" gap={12}>
          <Breadcrumbs component="nav" aria-label="Ruta" fz={14}>
            <Anchor component={Link} to={CATALOG_PATH}>
              Catálogo
            </Anchor>
            <Anchor component={Link} to={`${CATALOG_PATH}?category=${product.category.id}`}>
              {product.category.name}
            </Anchor>
            <Text span fz={14}>
              {product.name}
            </Text>
          </Breadcrumbs>
          <CopyButton value={window.location.href}>
            {({ copied, copy }) => (
              <Button
                variant="subtle"
                h={40}
                leftSection={
                  copied ? <IconCheck size={16} aria-hidden /> : <IconLink size={16} aria-hidden />
                }
                onClick={copy}
              >
                {copied ? 'Enlace copiado' : 'Copiar enlace'}
              </Button>
            )}
          </CopyButton>
        </Group>

        <div className={styles.layout}>
          <Gallery product={product} />
          <Stack gap={20} className={styles.info}>
            <Stack gap={12}>
              <Badge variant="light" style={{ alignSelf: 'flex-start' }}>
                {product.category.name}
              </Badge>
              <Title order={1} fz={36} lh={1.15} style={{ letterSpacing: '-0.03em' }}>
                {product.name}
              </Title>
              <Anchor component={Link} to={organizationPath} fw={600} fz={16} underline="hover">
                {organization.name}
              </Anchor>
              <Group gap={6} wrap="nowrap" fz={14} c="dimmed" component="span">
                <IconMapPin size={16} stroke={2} aria-hidden />
                {placeLabel(organization)}
              </Group>
            </Stack>

            <Paper withBorder radius={14} p="lg">
              <Stack gap={14}>
                <Stack gap={2}>
                  <Text fz={13} c="dimmed">
                    {price.caption}
                  </Text>
                  <Text fz={32} fw={700} style={{ letterSpacing: '-0.03em' }}>
                    {price.amount}
                  </Text>
                </Stack>
                <Group gap={6}>
                  {[...product.saleModes].sort().map((mode) => (
                    <Badge key={mode} variant="light" color="gray">
                      {SALE_MODE_LABELS[mode]}
                    </Badge>
                  ))}
                </Group>
                <Button
                  component={Link}
                  to={organizationPath}
                  fullWidth
                  h={52}
                  fz={16}
                  leftSection={<IconMessage size={20} stroke={2} aria-hidden />}
                >
                  Pedir presupuesto
                </Button>
                <Text fz={13} c="dimmed" lh={1.5}>
                  Solicitá un presupuesto a la cooperativa. Ellos te informarán el precio final y
                  las condiciones. Tené en cuenta que los pagos se realizan directamente con la
                  cooperativa, fuera de CooperAR.
                </Text>
              </Stack>
            </Paper>
          </Stack>
        </div>

        {product.description && (
          <Paper component="section" aria-labelledby="description" withBorder radius={14} p="lg">
            <Stack gap={10}>
              <Title order={2} fz={20} id="description">
                Descripción
              </Title>
              <Text fz={16} lh={1.65} style={{ whiteSpace: 'pre-line' }}>
                {product.description}
              </Text>
            </Stack>
          </Paper>
        )}

        <Paper component="section" aria-labelledby="organization" withBorder radius={14} p="lg">
          <Group justify="space-between" gap={20}>
            <Group gap={16} wrap="nowrap" miw={0}>
              {/* Decorative: the name next to it says whose it is. Without a logo, its initials. */}
              <Avatar
                src={organization.logoUrl ?? null}
                alt=""
                size={64}
                radius="50%"
                color="brand"
                aria-hidden
              >
                {initials(organization.name)}
              </Avatar>
              <Stack gap={6}>
                <Title order={2} fz={18} id="organization">
                  {organization.name}
                </Title>
                <Group gap={8} fz={14} c="dimmed">
                  <Badge variant="light">{ORGANIZATION_TYPE_LABELS[organization.type]}</Badge>
                  {organization.sectors.map((sector) => (
                    <Badge key={sector} variant="light" color="gray">
                      {SECTOR_LABELS[sector]}
                    </Badge>
                  ))}
                  {organization.responseTime && (
                    <span>Responde en {RESPONSE_TIME_LABELS[organization.responseTime]}</span>
                  )}
                </Group>
              </Stack>
            </Group>
            <Button component={Link} to={organizationPath} variant="outline" h={44}>
              Ver ficha de la cooperativa
            </Button>
          </Group>
        </Paper>

        {more.length > 0 && (
          <Stack component="section" aria-labelledby="more" gap={16}>
            <Title order={2} fz={22} id="more" style={{ letterSpacing: '-0.02em' }}>
              Más de esta cooperativa
            </Title>
            <ProductGrid products={more} />
          </Stack>
        )}
      </Stack>
    </Container>
  );
}

/** A published product or service, with its photos, its organization and the way to ask for a quote. */
export function ProductDetailPage() {
  const { id = '' } = useParams();
  const { data, isPending, isError } = useProduct(id);

  if (isPending) return <Text role="status">Cargando el producto…</Text>;
  if (isError) {
    return (
      <Container {...SECTION} py={28}>
        <Text role="alert">No pudimos cargar el producto. Probá de nuevo en unos minutos.</Text>
      </Container>
    );
  }
  if (!data) return <NotFoundPage />;
  return <Product product={data.product} more={data.moreFromOrganization} />;
}
