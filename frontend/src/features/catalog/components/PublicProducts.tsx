import { Badge, Group, Paper, Stack, Text } from '@mantine/core';
import { useOrganizationProducts } from '../api/useOrganizationProducts';
import { indicativePriceLabel, saleModesLabel } from '../labels';

/** The active products and services of an organization, as its public profile lists them. */
export function PublicProducts({ slug }: { slug: string }) {
  const { data: products, isPending, isError } = useOrganizationProducts(slug);

  if (isPending) return <Text role="status">Cargando los productos…</Text>;
  if (isError) return <Text c="dimmed">No pudimos cargar los productos y servicios.</Text>;
  if (products.length === 0) {
    return <Text c="dimmed">Esta entidad todavía no cargó productos.</Text>;
  }
  return (
    <Stack component="ul" gap="sm" m={0} p={0} style={{ listStyle: 'none' }}>
      {products.map((product) => (
        <Paper key={product.id} component="li" withBorder radius="lg" p="md">
          <Stack gap={6}>
            {product.photos[0] && (
              <img
                src={product.photos[0].url}
                alt={`Foto de ${product.name}`}
                loading="lazy"
                style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 8 }}
              />
            )}
            <Group justify="space-between" gap="sm">
              <Text fw={700}>{product.name}</Text>
              <Text c="dimmed" size="sm">
                {typeof product.indicativePrice === 'number'
                  ? indicativePriceLabel(product.indicativePrice)
                  : 'Sin precio'}
              </Text>
            </Group>
            <Group gap={6}>
              <Badge variant="light">{product.category.name}</Badge>
              <Badge variant="light" color="gray">
                {saleModesLabel(product.saleModes)}
              </Badge>
            </Group>
            {product.description && <Text size="sm">{product.description}</Text>}
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
