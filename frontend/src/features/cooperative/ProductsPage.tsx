import {
  ActionIcon,
  Alert,
  Button,
  CloseButton,
  Group,
  Menu,
  Pagination,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
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
  IconSearch,
  IconTrash,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  ProductStatus,
  SaleMode,
  type OrganizationSummary,
  type ProductResponse,
} from '@/api/generated/model';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useProductCategories } from '@/features/catalog/api/useProductCategories';
import { indicativePriceLabel, SALE_MODE_LABELS, saleModesLabel } from '@/features/catalog/labels';
import {
  useDeleteProduct,
  useUnpublishProduct,
  useProducts,
  usePublishProduct,
} from './api/useProducts';
import { editProductPath, NEW_PRODUCT_PATH } from './cooperativeSections';
import {
  hasFilters,
  PRODUCTS_PAGE_SIZE,
  readFilters,
  toParams,
  writeFilters,
  type ProductFilters,
} from './productFilters';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = readFilters(searchParams);
  const filtered = hasFilters(filters);
  const { data, isPending, isError, isPlaceholderData } = useProducts(
    organization.id,
    toParams(filters),
  );
  const products = data?.items;
  const pages = data ? Math.ceil(data.total / PRODUCTS_PAGE_SIZE) : 0;
  const unpublish = useUnpublishProduct(organization);
  const publish = usePublishProduct(organization);
  const remove = useDeleteProduct(organization);
  const [toUnpublish, setToUnpublish] = useState<ProductResponse>();
  const [toDelete, setToDelete] = useState<ProductResponse>();

  function update(changes: Partial<ProductFilters>) {
    // Changing what is searched starts again from the first page.
    setSearchParams(writeFilters({ ...filters, page: 1, ...changes }));
  }

  // Deleting or hiding the last product of the last page leaves it empty: go back to the one before.
  useEffect(() => {
    if (data && !isPlaceholderData && pages > 0 && filters.page > pages) {
      setSearchParams(writeFilters({ ...readFilters(searchParams), page: pages }), {
        replace: true,
      });
    }
  }, [data, isPlaceholderData, pages, filters.page, searchParams, setSearchParams]);

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
            Lo que publiques se muestra en tu ficha y en el catálogo público.
          </Text>
        </Stack>
        <Button component={Link} to={NEW_PRODUCT_PATH} h={48} px={22}>
          Agregar producto o servicio
        </Button>
      </Group>
      {(filtered || (data && data.total > 0)) && (
        <Filters filters={filters} onChange={update} total={data?.total} />
      )}
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
      {data?.total === 0 && !filtered && (
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
      {data?.total === 0 && filtered && (
        <Paper withBorder radius="lg" className={styles.empty}>
          <Stack gap={6} align="center" maw={440}>
            <Title order={2} fz={20}>
              No encontramos productos con esos filtros
            </Title>
            <Text c="dimmed">Probá con otras palabras o quitá algún filtro.</Text>
          </Stack>
          <Button
            variant="default"
            h={44}
            onClick={() => {
              setSearchParams({});
            }}
          >
            Limpiar los filtros
          </Button>
        </Paper>
      )}
      {products && products.length > 0 && (
        <Paper withBorder radius="lg" className={styles.tableCard} aria-busy={isPlaceholderData}>
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
      {pages > 1 && (
        <Group component="nav" aria-label="Páginas de productos" justify="center">
          <Pagination
            total={pages}
            value={filters.page}
            withEdges={false}
            getItemProps={(page) => ({ 'aria-label': `Página ${String(page)}` })}
            getControlProps={(control) =>
              control === 'previous'
                ? { 'aria-label': 'Página anterior' }
                : control === 'next'
                  ? { 'aria-label': 'Página siguiente' }
                  : {}
            }
            onChange={(page) => {
              setSearchParams(writeFilters({ ...filters, page }));
            }}
          />
        </Group>
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

/** How long the search waits after the last key before asking the server. */
const SEARCH_DELAY_MS = 300;

const STATUS_OPTIONS = [
  {
    value: ProductStatus.PUBLISHED,
    label: 'Publicados',
    hint: 'Se ven en tu ficha y en el catálogo público.',
  },
  {
    value: ProductStatus.UNPUBLISHED,
    label: 'No publicados',
    hint: 'Solo los ves vos; el público no los ve.',
  },
];

const SALE_MODE_OPTIONS = [SaleMode.RETAIL, SaleMode.WHOLESALE].map((mode) => ({
  value: mode,
  label: SALE_MODE_LABELS[mode],
}));

/** The search by name and the filters of the list. */
function Filters({
  filters,
  onChange,
  total,
}: {
  filters: ProductFilters;
  onChange: (changes: Partial<ProductFilters>) => void;
  total: number | undefined;
}) {
  const { data: categories } = useProductCategories();
  const [text, setText] = useState(filters.query);
  const [lastQuery, setLastQuery] = useState(filters.query);
  // Clearing the filters, or going back, changes the query from outside the box.
  if (filters.query !== lastQuery) {
    setLastQuery(filters.query);
    setText(filters.query);
  }
  // Searches while typing, once the person pauses; Enter does not wait.
  useEffect(() => {
    const query = text.trim();
    if (query === filters.query) return;
    const timer = setTimeout(() => {
      onChange({ query });
    }, SEARCH_DELAY_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [text, filters.query, onChange]);

  return (
    <Stack gap="sm">
      <div className={styles.filters} role="search" aria-label="Buscar entre tus productos">
        <form
          className={styles.search}
          onSubmit={(event) => {
            event.preventDefault();
            onChange({ query: text.trim() });
          }}
        >
          <TextInput
            type="search"
            label="Buscar por nombre"
            placeholder="Buscá por nombre"
            value={text}
            maxLength={200}
            leftSection={<IconSearch size={18} aria-hidden />}
            rightSection={
              text ? (
                <CloseButton
                  size="sm"
                  aria-label="Limpiar la búsqueda"
                  onClick={() => {
                    setText('');
                    if (filters.query) onChange({ query: '' });
                  }}
                />
              ) : null
            }
            onChange={(event) => {
              setText(event.currentTarget.value);
            }}
          />
        </form>
        <Select
          label="Estado"
          placeholder="Todos"
          data={STATUS_OPTIONS.map(({ value, label }) => ({ value, label }))}
          comboboxProps={{ width: 300, position: 'bottom-start' }}
          renderOption={({ option }) => (
            <Stack gap={0}>
              <Text fz={14} fw={600}>
                {option.label}
              </Text>
              <Text fz={13} c="dimmed">
                {STATUS_OPTIONS.find(({ value }) => value === option.value)?.hint}
              </Text>
            </Stack>
          )}
          value={filters.status}
          clearable
          allowDeselect
          onChange={(value) => {
            onChange({
              status: STATUS_OPTIONS.find((option) => option.value === value)?.value ?? null,
            });
          }}
        />
        <Select
          label="Categoría"
          placeholder="Todas"
          data={(categories ?? []).map(({ id, name }) => ({ value: id, label: name }))}
          value={filters.categoryId}
          clearable
          searchable
          onChange={(value) => {
            onChange({ categoryId: value });
          }}
        />
        <Select
          label="Modalidad"
          placeholder="Todas"
          data={SALE_MODE_OPTIONS}
          value={filters.saleMode}
          clearable
          onChange={(value) => {
            onChange({
              saleMode: SALE_MODE_OPTIONS.find((option) => option.value === value)?.value ?? null,
            });
          }}
        />
      </div>
      {total !== undefined && (
        <Text fz={14} c="dimmed" role="status">
          {total === 1 ? '1 producto o servicio' : `${String(total)} productos y servicios`}
        </Text>
      )}
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
