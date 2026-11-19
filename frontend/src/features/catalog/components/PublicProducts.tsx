import { Badge, Group, Paper, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconPhoto } from '@tabler/icons-react';
import { useOrganizationProducts } from '../api/useOrganizationProducts';
import { indicativePriceLabel, saleModesLabel } from '../labels';
import styles from './PublicProducts.module.css';

/** The active products and services of an organization, as its public profile lists them: a grid of small cards. */
export function PublicProducts({ slug }: { slug: string }) {
  const { data: products, isPending, isError } = useOrganizationProducts(slug);

  if (isPending) return <Text role="status">Cargando los productos…</Text>;
  if (isError) return <Text c="dimmed">No pudimos cargar los productos y servicios.</Text>;
  if (products.length === 0) {
    return <Text c="dimmed">Esta entidad todavía no cargó productos.</Text>;
  }
  return (
    <SimpleGrid
      component="ul"
      cols={{ base: 1, xs: 2, sm: 3 }}
      spacing="sm"
      className={styles.list}
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
            <Text fw={700} lh={1.3}>
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
    </SimpleGrid>
  );
}
