import { Anchor, Badge, Button, Group, Paper, Stack, Text, Title, Tooltip } from '@mantine/core';
import { IconArrowRight, IconMapPin } from '@tabler/icons-react';
import { Link } from 'react-router';
import type { CatalogProductResponse } from '@/api/generated/model';
import { ownItemLabel, placeLabel, priceLines, SALE_MODE_LABELS } from '../labels';
import { productPath } from '../productSearch';
import { useManagesOrganization } from '../useManagesOrganization';
import styles from './ProductCard.module.css';

/** A product or service of the public catalog, with the way to its page and to ask its organization for a quote. */
export function ProductCard({ product }: { product: CatalogProductResponse }) {
  const isOwn = useManagesOrganization(product.organization.slug);
  const headingId = `product-${product.id}`;
  const organizationPath = `/organizations/${product.organization.slug}`;
  const quoteButton = {
    variant: 'light',
    mih: 44,
    h: 'auto',
    py: 8,
    styles: { label: { whiteSpace: 'normal', textAlign: 'center' } },
    rightSection: <IconArrowRight size={18} stroke={2} aria-hidden />,
    'aria-label': `Pedir presupuesto de ${product.name}`,
  } as const;
  const cover = product.photos[0];
  const price = priceLines(product.indicativePrice);
  return (
    <Paper
      component="article"
      withBorder
      radius={14}
      className={styles.card}
      aria-labelledby={headingId}
    >
      {cover ? (
        <img src={cover.url} alt="" loading="lazy" className={styles.photo} />
      ) : (
        <div className={styles.photo} aria-hidden>
          Sin foto
        </div>
      )}
      <div className={styles.body}>
        <Badge variant="light" style={{ alignSelf: 'flex-start' }}>
          {product.category.name}
        </Badge>
        <Title order={3} fz={17} lh={1.3} id={headingId}>
          <Link to={productPath(product.id)} className={styles.name}>
            {product.name}
          </Link>
        </Title>
        <Anchor component={Link} to={organizationPath} fz={14} fw={500} underline="hover">
          {product.organization.name}
        </Anchor>
        <Group gap={6} wrap="nowrap" align="flex-start" fz={13} c="dimmed" component="span">
          <IconMapPin size={15} stroke={2} aria-hidden style={{ flex: 'none', marginTop: 2 }} />
          {placeLabel(product.organization)}
        </Group>
        {product.description && (
          <Text fz={14} lh={1.5} lineClamp={3}>
            {product.description}
          </Text>
        )}
        <Group gap={6}>
          {[...product.saleModes].sort().map((mode) => (
            <Badge key={mode} variant="light" color="gray">
              {SALE_MODE_LABELS[mode]}
            </Badge>
          ))}
        </Group>
        <Stack gap={1} className={styles.price}>
          <Text fz={12} c="dimmed">
            {price.caption}
          </Text>
          <Text fz={20} fw={700}>
            {price.amount}
          </Text>
        </Stack>
        {isOwn ? (
          <Tooltip label={ownItemLabel(product.type)} withArrow>
            {/* Kept focusable and not `disabled`, so the tooltip also shows with the keyboard. */}
            <Button {...quoteButton} data-disabled aria-disabled>
              Pedir presupuesto
            </Button>
          </Tooltip>
        ) : (
          <Button {...quoteButton} component={Link} to={`/catalog/${product.id}#inquiry`}>
            Pedir presupuesto
          </Button>
        )}
      </div>
    </Paper>
  );
}
