import { Anchor, Badge, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { IconPhoto } from '@tabler/icons-react';
import { useState } from 'react';
import { Link } from 'react-router';
import type { PublicProductResponse } from '@/api/generated/model';
import { useOrganizationProducts } from '../api/useOrganizationProducts';
import { indicativePriceLabel, saleModesLabel } from '../labels';
import { CATALOG_PATH, productPath } from '../productSearch';
import { useGridColumns } from '../useGridColumns';
import styles from './PublicProducts.module.css';

/** The profile lists this many full rows of products before sending the visitor to the catalog for the rest. */
const PROFILE_ROWS = 2;
const CARD_MIN_WIDTH = 180;
const GRID_GAP = 12;

/** The active products and services of an organization, as its public profile lists them: a grid of small cards. */
export function PublicProducts({ slug }: { slug: string }) {
  const { data: products, isPending, isError } = useOrganizationProducts(slug);
  const [element, setElement] = useState<HTMLElement | null>(null);
  const columns = useGridColumns(element, CARD_MIN_WIDTH, GRID_GAP);
  // Whole rows only: as many cards as fit in two rows at this width.
  const limit = (columns ?? 0) * PROFILE_ROWS;

  const total = products?.length ?? 0;
  const hasMore = total > limit;

  return (
    <Stack gap="xs" ref={setElement}>
      <Group gap="xs" justify="space-between">
        <Group gap="xs">
          <Title order={2} size="h3" id="products">
            Productos y servicios
          </Title>
          {total > 0 && (
            <Badge variant="light" color="gray" size="lg" aria-label={`${String(total)} en total`}>
              {total}
            </Badge>
          )}
        </Group>
        {hasMore && columns !== null && (
          <Anchor component={Link} to={`${CATALOG_PATH}?organization=${slug}`} fw={600}>
            Ver todos
          </Anchor>
        )}
      </Group>
      {isPending && <Text role="status">Cargando los productos…</Text>}
      {isError && <Text c="dimmed">No pudimos cargar los productos y servicios.</Text>}
      {products?.length === 0 && <Text c="dimmed">Esta entidad todavía no cargó productos.</Text>}
      {products && products.length > 0 && <Cards products={products.slice(0, limit)} />}
    </Stack>
  );
}

function Cards({ products }: { products: PublicProductResponse[] }) {
  return (
    <ul
      className={styles.list}
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(${String(CARD_MIN_WIDTH)}px, 1fr))`,
        gap: GRID_GAP,
      }}
    >
      {products.map((product) => (
        <Paper key={product.id} component="li" withBorder radius="lg" className={styles.card}>
          <div className={styles.photo}>
            {product.photos[0] ? (
              <img src={product.photos[0].url} alt={`Foto de ${product.name}`} loading="lazy" />
            ) : (
              <IconPhoto size={32} stroke={1.5} aria-hidden />
            )}
          </div>
          <Stack gap={6} className={styles.body}>
            <Text
              fw={700}
              lh={1.3}
              component={Link}
              to={productPath(product.id)}
              c="inherit"
              td="none"
              className={styles.name}
            >
              {product.name}
            </Text>
            <Text c="dimmed" size="sm">
              {typeof product.indicativePrice === 'number'
                ? indicativePriceLabel(product.indicativePrice)
                : 'Sin precio'}
            </Text>
            <Group gap={6}>
              <Badge variant="light">{product.category.name}</Badge>
              <Badge variant="light" color="gray">
                {saleModesLabel(product.saleModes)}
              </Badge>
            </Group>
            {product.description && (
              <Text size="sm" lineClamp={3}>
                {product.description}
              </Text>
            )}
          </Stack>
        </Paper>
      ))}
    </ul>
  );
}
