import {
  Alert,
  Button,
  Checkbox,
  Group,
  NumberInput,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { BackLink } from '@/components/BackLink';
import { useState, type SyntheticEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import {
  ProductStatus,
  ProductType,
  SaleMode,
  type OrganizationSummary,
  type ProductRequest,
  type ProductResponse,
} from '@/api/generated/model';
import { LabelWithHint } from '@/components/form/LabelWithHint';
import { NotFoundPage } from '@/features/errors/NotFoundPage';
import { useProductCategories } from '@/features/catalog/api/useProductCategories';
import { ProductSaveError, useProduct, useProductPhotos, useSaveProduct } from './api/useProducts';
import { PhotosField } from './components/PhotosField';
import { MAX_PHOTOS, PHOTOS_HINT, photoProblem } from './components/photoRules';
import { useActiveOrganization, usePanelPaths } from './useActiveOrganization';
import styles from './ProductFormPage.module.css';

const MODES: { value: SaleMode; title: string; description: string }[] = [
  {
    value: SaleMode.RETAIL,
    title: 'Minorista',
    description: 'Venta por unidad, a consumidores finales',
  },
  {
    value: SaleMode.WHOLESALE,
    title: 'Mayorista',
    description: 'Venta por cantidad, a comercios y otras cooperativas',
  },
];

const TYPE_DESCRIPTIONS: Record<ProductType, string> = {
  [ProductType.PRODUCT]: 'Un bien que se fabrica o se vende',
  [ProductType.SERVICE]: 'Un trabajo o una prestación a pedido',
};

const TYPE_LABELS: Record<ProductType, string> = {
  [ProductType.PRODUCT]: 'Producto',
  [ProductType.SERVICE]: 'Servicio',
};

const NAME_MAX = 120;
const DESCRIPTION_MAX = 2000;
const PRICE_HINT = 'Es opcional. En la ficha pública se muestra como "precio orientativo".';
const MODES_HINT = 'Podés elegir las dos.';

const SAVE_ERRORS: Record<ProductSaveError['reason'], string> = {
  invalid: 'Revisá los datos: hay alguno que no pudimos guardar.',
  unavailable: 'No pudimos guardar el producto. Probá de nuevo en unos minutos.',
};

interface Form {
  name: string;
  type: ProductType;
  /** Id of the chosen category. */
  categoryId: string | null;
  saleModes: SaleMode[];
  description: string;
  showPrice: boolean;
  /** What a NumberInput gives: '' while it is empty. */
  price: number | string;
}

type Errors = Partial<Record<'name' | 'categoryId' | 'saleModes' | 'price', string>>;

const EMPTY_FORM: Form = {
  name: '',
  type: ProductType.PRODUCT,
  categoryId: null,
  saleModes: [SaleMode.RETAIL],
  description: '',
  showPrice: true,
  price: '',
};

function fromProduct(product: ProductResponse): Form {
  return {
    name: product.name,
    type: product.type,
    categoryId: product.category.id,
    saleModes: product.saleModes,
    description: product.description ?? '',
    // The API sends null, not nothing, when there is no price or description.
    showPrice: typeof product.indicativePrice === 'number',
    price: product.indicativePrice ?? '',
  };
}

function validate(form: Form): Errors {
  const errors: Errors = {};
  if (!form.name.trim()) errors.name = 'Ingresá el nombre.';
  if (form.categoryId === null) errors.categoryId = 'Elegí una categoría.';
  if (form.saleModes.length === 0) errors.saleModes = 'Elegí al menos una modalidad.';
  if (form.showPrice && form.price !== '' && (typeof form.price !== 'number' || form.price < 0))
    errors.price = 'Ingresá un precio válido.';
  return errors;
}

/** The request for a form that passed {@link validate}; null when it did not. */
function toRequest(form: Form, publish: boolean): ProductRequest | null {
  if (form.categoryId === null) return null;
  const description = form.description.trim();
  return {
    name: form.name.trim(),
    type: form.type,
    categoryId: form.categoryId,
    saleModes: MODES.map(({ value }) => value).filter((mode) => form.saleModes.includes(mode)),
    ...(description && { description }),
    ...(form.showPrice && typeof form.price === 'number' && { indicativePrice: form.price }),
    ...(publish && { publish }),
  };
}

/** The text without accents and in lower case, to compare what was typed with what is listed. */
function plain(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/** How much of the limit a text field has used, so nobody finds out about the limit by hitting it. */
function CharCount({ value, max }: { value: string; max: number }) {
  return (
    <Text size="xs" c="dimmed" className={styles.count} aria-hidden>
      {value.length}/{max}
    </Text>
  );
}

/** A copy of the list with the item at `from` moved to the place `to`. */
function move<T>(list: T[], from: number, to: number): T[] {
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  if (item === undefined) return list;
  copy.splice(to, 0, item);
  return copy;
}

/** "Nuevo producto o servicio" and "Editar producto o servicio", depending on whether the route carries an id. */
export function ProductFormPage() {
  const organization = useActiveOrganization();
  // Remounted per organization, so the form never mixes the data of two of them.
  return <ProductFormLoader key={organization.id} organization={organization} />;
}

function ProductFormLoader({ organization }: { organization: OrganizationSummary }) {
  const { id } = useParams();
  const { data: product, isPending, isError } = useProduct(organization.id, id);

  if (id === undefined) return <ProductForm key="new" organization={organization} />;
  if (isPending) return <Text role="status">Cargando el producto…</Text>;
  if (isError) {
    return (
      <Alert
        color="red"
        icon={<IconAlertCircle aria-hidden />}
        title="No pudimos cargar el producto"
      >
        Probá de nuevo en unos minutos.
      </Alert>
    );
  }
  if (!product) return <NotFoundPage />;
  return <ProductForm key={product.id} organization={organization} product={product} />;
}

function ProductForm({
  organization,
  product,
}: {
  organization: OrganizationSummary;
  product?: ProductResponse;
}) {
  const paths = usePanelPaths();
  const navigate = useNavigate();
  const { data: categories, isError: categoriesError } = useProductCategories();
  const categoryOptions = (categories ?? []).map(({ id, name }) => ({ value: id, label: name }));
  const { mutateAsync } = useSaveProduct(organization, product?.id);
  const [saving, setSaving] = useState<'save' | 'publish'>();
  // A published product keeps being published when saved; the others can be saved as they are or published too.
  const canPublish = product?.status !== ProductStatus.PUBLISHED;
  const [form, setForm] = useState(() => (product ? fromProduct(product) : EMPTY_FORM));
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<ProductSaveError['reason']>();
  const { upload, remove: removePhoto, reorder } = useProductPhotos(organization);
  const [files, setFiles] = useState<File[]>([]);
  // After a save in which some photos failed, the form reopens on the product with this notice.
  const location = useLocation();
  const failedPhotos = (location.state as { failedPhotos?: number } | null)?.failedPhotos;
  const [photoError, setPhotoError] = useState<string | undefined>(
    failedPhotos
      ? `Guardamos el producto, pero ${String(failedPhotos)} foto(s) no se pudieron subir. Probá de nuevo.`
      : undefined,
  );
  const photos = product?.photos ?? [];

  function addFiles(chosen: File[]) {
    const problem = chosen.map(photoProblem).find((message) => message !== null);
    const room = MAX_PHOTOS - photos.length - files.length;
    const accepted = chosen.filter((file) => photoProblem(file) === null).slice(0, room);
    setPhotoError(
      problem ??
        (chosen.length > room
          ? `Solo podés tener ${String(MAX_PHOTOS)} fotos por producto.`
          : undefined),
    );
    setFiles((current) => [...current, ...accepted]);
  }

  function update<K extends keyof Form>(field: K, value: Form[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function toggleMode(mode: SaleMode) {
    update(
      'saleModes',
      form.saleModes.includes(mode)
        ? form.saleModes.filter((current) => current !== mode)
        : [...form.saleModes, mode],
    );
  }

  /** Saves the product; with `publish` it is also shown on the public profile, without it its status is kept. */
  async function save(publish: boolean) {
    setFailure(undefined);
    const validation = validate(form);
    setErrors(validation);
    const request = toRequest(form, publish);
    if (Object.keys(validation).length > 0 || !request) return;
    setSaving(publish ? 'publish' : 'save');
    try {
      const saved = await mutateAsync(request);
      const failed = await upload(saved.id, files);
      if (failed > 0) {
        setFiles([]);
        await navigate(paths.product(saved.id), {
          state: { failedPhotos: failed },
          replace: true,
        });
        return;
      }
      await navigate(paths.products);
    } catch (caught) {
      setFailure(caught instanceof ProductSaveError ? caught.reason : 'unavailable');
    } finally {
      setSaving(undefined);
    }
  }

  return (
    <Stack gap={24}>
      <Stack gap={6}>
        <BackLink to={paths.products}>Volver al listado</BackLink>
        <Title order={1} fz={32}>
          {product ? 'Editar producto o servicio' : 'Nuevo producto o servicio'}
        </Title>
      </Stack>
      <Paper
        component="form"
        withBorder
        radius="lg"
        p={{ base: 'md', sm: 32 }}
        className={styles.form}
        noValidate
        onSubmit={(event: SyntheticEvent<HTMLFormElement>) => {
          event.preventDefault();
          void save(false);
        }}
      >
        <Stack gap={22}>
          <div className={styles.counted}>
            <TextInput
              label="Nombre"
              placeholder="Ej.: Remera de algodón"
              maxLength={NAME_MAX}
              value={form.name}
              error={errors.name}
              onChange={(event) => {
                update('name', event.currentTarget.value);
              }}
            />
            <CharCount value={form.name} max={NAME_MAX} />
          </div>
          <div role="radiogroup" aria-labelledby="product-type" className={styles.fieldset}>
            <div id="product-type" className={styles.legend}>
              Tipo
            </div>
            <div className={styles.modes}>
              {Object.values(ProductType).map((type) => {
                const on = form.type === type;
                return (
                  <button
                    key={type}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={TYPE_LABELS[type]}
                    className={styles.mode}
                    onClick={() => {
                      update('type', type);
                    }}
                  >
                    <span className={styles.modeText}>
                      <strong>{TYPE_LABELS[type]}</strong>
                      <span className={styles.modeDescription}>{TYPE_DESCRIPTIONS[type]}</span>
                    </span>
                    <span className={styles.modeBox} aria-hidden>
                      {on && <IconCheck size={14} stroke={3.2} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <Select
            label="Categoría"
            placeholder="Elegí una categoría"
            data={categoryOptions}
            searchable
            nothingFoundMessage="No encontramos esa categoría"
            // "grafica" has to find "Gráfica": the search ignores accents and case.
            filter={({ options, search }) => {
              const wanted = plain(search);
              return options.filter(
                (option) => 'label' in option && plain(option.label).includes(wanted),
              );
            }}
            allowDeselect={false}
            maw={360}
            disabled={categories === undefined}
            value={form.categoryId}
            error={
              errors.categoryId ??
              (categoriesError ? 'No pudimos cargar las categorías.' : undefined)
            }
            onChange={(value) => {
              update('categoryId', value);
            }}
          />
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Modalidad de venta</legend>
            <div className={styles.modes}>
              {MODES.map(({ value, title, description }) => {
                const on = form.saleModes.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    className={styles.mode}
                    aria-pressed={on}
                    onClick={() => {
                      toggleMode(value);
                    }}
                  >
                    <span className={styles.modeText}>
                      <strong>{title}</strong>
                      <span className={styles.modeDescription}>{description}</span>
                    </span>
                    <span className={styles.modeBox} aria-hidden>
                      {on && <IconCheck size={14} stroke={3.2} />}
                    </span>
                  </button>
                );
              })}
            </div>
            <Text
              size="sm"
              mt={8}
              c={errors.saleModes ? 'var(--color-danger)' : 'dimmed'}
              role={errors.saleModes ? 'alert' : undefined}
            >
              {errors.saleModes ?? MODES_HINT}
            </Text>
          </fieldset>
          <div className={styles.counted}>
            <Textarea
              label="Descripción"
              placeholder="Contá de qué está hecho, medidas, cantidades mínimas, etc."
              rows={4}
              styles={{ input: { height: 'auto' } }}
              maxLength={DESCRIPTION_MAX}
              value={form.description}
              onChange={(event) => {
                update('description', event.currentTarget.value);
              }}
            />
            <CharCount value={form.description} max={DESCRIPTION_MAX} />
          </div>
          <PhotosField
            id="photos-button"
            label="Fotos"
            hint={PHOTOS_HINT}
            max={MAX_PHOTOS}
            firstIsCover
            photos={photos}
            files={files}
            error={photoError}
            removing={removePhoto.isPending}
            onAdd={addFiles}
            onRemoveFile={(index) => {
              setFiles((current) => current.filter((_, position) => position !== index));
            }}
            onReorderFiles={(from, to) => {
              setFiles((current) => move(current, from, to));
            }}
            onReorderPhotos={(photoIds) => {
              if (product) reorder.mutate({ productId: product.id, photoIds });
            }}
            onRemovePhoto={(photoId) => {
              if (product) removePhoto.mutate({ productId: product.id, photoId });
            }}
          />
          <Stack gap={8}>
            <Checkbox
              label="Mostrar un precio orientativo"
              size="sm"
              styles={{
                label: { fontSize: 15 },
                root: { minHeight: 44, display: 'flex', alignItems: 'center' },
              }}
              checked={form.showPrice}
              onChange={(event) => {
                update('showPrice', event.currentTarget.checked);
              }}
            />
            <Stack gap={6} maw={320}>
              <LabelWithHint htmlFor="price" label="Precio orientativo (ARS)" hint={PRICE_HINT} />
              <NumberInput
                id="price"
                placeholder="Ej.: 8500"
                hideControls
                allowNegative={false}
                decimalScale={2}
                decimalSeparator=","
                thousandSeparator="."
                disabled={!form.showPrice}
                value={form.price}
                error={errors.price}
                aria-description={PRICE_HINT}
                onChange={(value) => {
                  update('price', value);
                }}
              />
            </Stack>
          </Stack>
          {failure && (
            <Alert color="red" icon={<IconAlertCircle aria-hidden />} role="alert">
              {SAVE_ERRORS[failure]}
            </Alert>
          )}
          <Group gap={12} className={styles.actions}>
            {canPublish && (
              <Button
                type="button"
                h={48}
                px={24}
                loading={saving === 'publish'}
                disabled={saving === 'save'}
                loaderProps={{ type: 'dots' }}
                onClick={() => void save(true)}
              >
                Guardar y publicar
              </Button>
            )}
            <Button
              type="submit"
              variant={canPublish ? 'default' : 'filled'}
              h={48}
              px={24}
              loading={saving === 'save'}
              disabled={saving === 'publish'}
              loaderProps={{ type: 'dots' }}
            >
              Guardar
            </Button>
            <Button component={Link} to={paths.products} variant="default" h={48} px={24}>
              Cancelar
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Stack>
  );
}
