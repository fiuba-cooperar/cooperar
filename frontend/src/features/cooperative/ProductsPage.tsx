import {
  ActionIcon,
  Alert,
  Button,
  Group,
  Menu,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
  VisuallyHidden,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconBox,
  IconDots,
  IconEye,
  IconEyeOff,
  IconPencil,
  IconTrash,
} from '@tabler/icons-react';
import { useState } from 'react';
import { Link } from 'react-router';
import {
  ProductStatus,
  type OrganizationSummary,
  type ProductResponse,
} from '@/api/generated/model';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { indicativePriceLabel, saleModesLabel } from '@/features/catalog/labels';
import {
  useDeleteProduct,
  useUnpublishProduct,
  useProducts,
  usePublishProduct,
} from './api/useProducts';
import { editProductPath, NEW_PRODUCT_PATH } from './cooperativeSections';
import { useActiveOrganization } from './useActiveOrganization';
import styles from './ProductsPage.module.css';

/** "Productos y servicios": what the active organization offers, with the entries to add, edit, publish and unpublish. */
export function ProductsPage() {
  const organization = useActiveOrganization();
  if (!organization) {
    return (
      <Text c="dimmed">
        Vas a poder cargar tus productos y servicios cuando el observatorio apruebe tu solicitud.
      </Text>
    );
  }
  // Remounted per organization, so a pending confirmation never refers to another one's product.
  return <ProductsList key={organization.id} organization={organization} />;
}

function ProductsList({ organization }: { organization: OrganizationSummary }) {
  const { data: products, isPending, isError } = useProducts(organization.id);
  const unpublish = useUnpublishProduct(organization);
  const publish = usePublishProduct(organization);
  const remove = useDeleteProduct(organization);
  const [toUnpublish, setToUnpublish] = useState<ProductResponse>();
  const [toDelete, setToDelete] = useState<ProductResponse>();

  function confirmUnpublish() {
    if (!toUnpublish) return;
    unpublish.mutate(toUnpublish.id, {
      onSettled: () => {
        setToUnpublish(undefined);
      },
    });
  }

  function confirmDelete() {
    if (!toDelete) return;
    remove.mutate(toDelete.id, {
      onSettled: () => {
        setToDelete(undefined);
      },
    });
  }

  return (
    <Stack gap={24}>
      <Group justify="space-between" align="center" gap="md">
        <Stack gap={6} maw={640}>
          <Title order={1} fz={32}>
            Productos y servicios
          </Title>
          <Text c="dimmed" fz={16}>
            Lo que ofrecés se muestra en tu ficha y en el catálogo público.
          </Text>
        </Stack>
        <Button component={Link} to={NEW_PRODUCT_PATH} h={48} px={22}>
          Agregar producto o servicio
        </Button>
      </Group>
      {isPending && <Text role="status">Cargando tus productos y servicios…</Text>}
      {isError && (
        <Alert
          color="red"
          icon={<IconAlertCircle aria-hidden />}
          title="No pudimos cargar tus productos y servicios"
        >
          Probá de nuevo en unos minutos.
        </Alert>
      )}
      {(publish.isError || remove.isError) && (
        <Alert color="red" icon={<IconAlertCircle aria-hidden />} role="alert">
          No pudimos completar la acción. Probá de nuevo en unos minutos.
        </Alert>
      )}
      {unpublish.isError && (
        <Alert color="red" icon={<IconAlertCircle aria-hidden />} role="alert">
          No pudimos ocultar el producto. Probá de nuevo en unos minutos.
        </Alert>
      )}
      {products?.length === 0 && (
        <Paper withBorder radius="lg" className={styles.empty}>
          <ThemeIcon variant="light" size={64} radius="xl" aria-hidden>
            <IconBox size={32} stroke={1.6} />
          </ThemeIcon>
          <Stack gap={6} align="center" maw={440}>
            <Title order={2} fz={20}>
              Mostrá lo que ofrecés
            </Title>
            <Text c="dimmed">
              Agregá tus productos y servicios para que quienes visiten tu perfil puedan conocer tu
              oferta.
            </Text>
          </Stack>
          <Button component={Link} to={NEW_PRODUCT_PATH} h={48} px={22}>
            Agregar el primero
          </Button>
        </Paper>
      )}
      {products && products.length > 0 && (
        <Paper withBorder radius="lg" className={styles.tableCard}>
          <table className={styles.table}>
            <VisuallyHidden component="caption">Listado de productos y servicios</VisuallyHidden>
            <thead>
              <tr>
                <th scope="col">Foto</th>
                <th scope="col">Nombre</th>
                <th scope="col">Categoría</th>
                <th scope="col">Modalidad</th>
                <th scope="col">Precio orientativo</th>
                <th scope="col">Estado</th>
                <th scope="col">
                  <VisuallyHidden>Acciones</VisuallyHidden>
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  onUnpublish={() => {
                    setToUnpublish(product);
                  }}
                  onPublish={() => {
                    publish.mutate(product.id);
                  }}
                  onDelete={() => {
                    setToDelete(product);
                  }}
                />
              ))}
            </tbody>
          </table>
        </Paper>
      )}
      <Text fz={13} c="dimmed">
        Los productos no publicados no se muestran al público. Los precios son solo orientativos.
      </Text>
      <ConfirmDialog
        opened={toDelete !== undefined}
        title="Eliminar definitivamente"
        icon={<IconTrash size={20} stroke={1.8} />}
        confirmLabel="Eliminar"
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onClose={() => {
          setToDelete(undefined);
        }}
      >
        <strong>{toDelete?.name}</strong> se va a eliminar con sus fotos y no se puede recuperar. Si
        solo querés que no se vea, dejalo sin publicar.
      </ConfirmDialog>
      <ConfirmDialog
        opened={toUnpublish !== undefined}
        title="Ocultar del catálogo"
        icon={<IconEyeOff size={20} stroke={1.8} />}
        confirmLabel="Ocultar"
        loading={unpublish.isPending}
        onConfirm={confirmUnpublish}
        onClose={() => {
          setToUnpublish(undefined);
        }}
      >
        <strong>{toUnpublish?.name}</strong> va a dejar de verse en tu ficha y en el catálogo
        público. Lo vas a seguir viendo en este listado y lo podés publicar de nuevo cuando quieras.
      </ConfirmDialog>
    </Stack>
  );
}

function ProductRow({
  product,
  onUnpublish,
  onPublish,
  onDelete,
}: {
  product: ProductResponse;
  onUnpublish: () => void;
  onPublish: () => void;
  onDelete: () => void;
}) {
  const published = product.status === ProductStatus.PUBLISHED;
  return (
    <tr>
      <td>
        {product.photos[0] ? (
          <img src={product.photos[0].url} alt="" className={styles.photo} />
        ) : (
          <span className={styles.photo} aria-hidden />
        )}
      </td>
      <td>
        <strong>{product.name}</strong>
      </td>
      <td>{product.category.name}</td>
      <td>{saleModesLabel(product.saleModes)}</td>
      <td>
        {typeof product.indicativePrice === 'number' ? (
          indicativePriceLabel(product.indicativePrice)
        ) : (
          <Text span c="dimmed">
            Sin precio
          </Text>
        )}
      </td>
      <td>
        <span className={[styles.tag, published ? styles.published : styles.unpublished].join(' ')}>
          {published ? 'Publicado' : 'No publicado'}
        </span>
      </td>
      <td>
        <div className={styles.actions}>
          <Button
            component={Link}
            to={editProductPath(product.id)}
            variant="default"
            size="sm"
            h={38}
            leftSection={<IconPencil size={16} aria-hidden />}
            aria-label={`Editar ${product.name}`}
          >
            Editar
          </Button>
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                size={40}
                radius="md"
                aria-label={`Más acciones de ${product.name}`}
              >
                <IconDots size={20} aria-hidden />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {published ? (
                <Menu.Item leftSection={<IconEyeOff size={16} aria-hidden />} onClick={onUnpublish}>
                  Ocultar del catálogo
                </Menu.Item>
              ) : (
                <Menu.Item leftSection={<IconEye size={16} aria-hidden />} onClick={onPublish}>
                  Publicar
                </Menu.Item>
              )}
              <Menu.Divider />
              <Menu.Item
                color="red"
                leftSection={<IconTrash size={16} aria-hidden />}
                onClick={onDelete}
              >
                Eliminar
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </div>
      </td>
    </tr>
  );
}
