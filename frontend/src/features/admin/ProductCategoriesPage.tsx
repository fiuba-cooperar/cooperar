import {
  Alert,
  Button,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
  type TextInputProps,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { AppModal } from '@/components/AppModal';
import { useState, type SyntheticEvent } from 'react';
import type { AdminProductCategoryResponse } from '@/api/generated/model';
import {
  ProductCategoryError,
  useAdminProductCategories,
  useCreateCategory,
  useDeleteCategory,
  useRenameCategory,
} from './api/useProductCategories';
import styles from './ProductCategoriesPage.module.css';

const NAME_MAX = 80;

const ERRORS: Record<ProductCategoryError['reason'], string> = {
  conflict: 'Ya hay una categoría con ese nombre.',
  invalid: 'Revisá el nombre: no pudimos guardarlo.',
  unavailable: 'No pudimos guardar el cambio. Probá de nuevo en unos minutos.',
};

function errorMessage(error: unknown) {
  return ERRORS[error instanceof ProductCategoryError ? error.reason : 'unavailable'];
}

function productCountLabel(count: number) {
  if (count === 0) return 'Sin productos';
  return `${String(count)} ${count === 1 ? 'producto' : 'productos'}`;
}

const NAME_FIELD: Pick<TextInputProps, 'maxLength'> = { maxLength: NAME_MAX };

/** The categories products and services are filed under, which the observatory adds, renames and deletes. */
export function ProductCategoriesPage() {
  const { data: categories, isPending, isError } = useAdminProductCategories();

  return (
    <Stack gap="lg">
      <Stack gap={6} maw={640}>
        <Title order={1}>Categorías de productos</Title>
        <Text c="dimmed">
          Las cooperativas eligen una de estas categorías al cargar un producto o servicio. Una
          categoría con productos no se puede eliminar.
        </Text>
      </Stack>
      <AddCategory />
      {isPending && <Text role="status">Cargando las categorías…</Text>}
      {isError && (
        <Alert color="red" icon={<IconAlertCircle aria-hidden />} role="alert">
          No pudimos cargar las categorías. Intentá de nuevo en unos minutos.
        </Alert>
      )}
      {categories && (
        <Paper withBorder radius="lg" component="ul" className={styles.list}>
          {categories.map((category) => (
            <CategoryRow key={category.id} category={category} />
          ))}
        </Paper>
      )}
    </Stack>
  );
}

function AddCategory() {
  const create = useCreateCategory();
  const [name, setName] = useState('');
  const [error, setError] = useState<string>();

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Ingresá el nombre de la categoría.');
      return;
    }
    setError(undefined);
    try {
      await create.mutateAsync(name);
      setName('');
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        void submit(event);
      }}
    >
      <Group align="flex-start" gap="sm">
        <TextInput
          label="Nueva categoría"
          placeholder="Ej.: Juguetes"
          value={name}
          error={error}
          w={{ base: '100%', xs: 320 }}
          {...NAME_FIELD}
          onChange={(event) => {
            setName(event.currentTarget.value);
            setError(undefined);
          }}
        />
        <Button type="submit" h={48} mt={{ base: 0, xs: 26 }} loading={create.isPending}>
          Agregar categoría
        </Button>
      </Group>
    </form>
  );
}

function CategoryRow({ category }: { category: AdminProductCategoryResponse }) {
  const [mode, setMode] = useState<'view' | 'rename' | 'delete'>('view');
  return (
    <li className={styles.item}>
      {mode === 'rename' ? (
        <RenameForm
          category={category}
          onDone={() => {
            setMode('view');
          }}
        />
      ) : (
        <>
          <Text fw={600} className={styles.name}>
            {category.name}
          </Text>
          <Text size="sm" c="dimmed">
            {productCountLabel(category.productCount)}
          </Text>
          <Group gap="xs">
            <Button
              variant="default"
              aria-label={`Renombrar ${category.name}`}
              onClick={() => {
                setMode('rename');
              }}
            >
              Renombrar
            </Button>
            <Button
              variant="default"
              color="red.8"
              aria-label={`Eliminar ${category.name}`}
              disabled={category.productCount > 0}
              onClick={() => {
                setMode('delete');
              }}
            >
              Eliminar
            </Button>
          </Group>
        </>
      )}
      <DeleteModal
        category={category}
        opened={mode === 'delete'}
        onClose={() => {
          setMode('view');
        }}
      />
    </li>
  );
}

function RenameForm({
  category,
  onDone,
}: {
  category: AdminProductCategoryResponse;
  onDone: () => void;
}) {
  const rename = useRenameCategory();
  const [name, setName] = useState(category.name);
  const [error, setError] = useState<string>();

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Ingresá el nombre de la categoría.');
      return;
    }
    try {
      await rename.mutateAsync({ id: category.id, name });
      onDone();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  return (
    <form
      noValidate
      style={{ display: 'contents' }}
      onSubmit={(event) => {
        void submit(event);
      }}
    >
      <TextInput
        aria-label={`Nuevo nombre de ${category.name}`}
        value={name}
        error={error}
        flex="1 1 200px"
        {...NAME_FIELD}
        onChange={(event) => {
          setName(event.currentTarget.value);
          setError(undefined);
        }}
      />
      <Group gap="xs">
        <Button type="submit" loading={rename.isPending}>
          Guardar
        </Button>
        <Button variant="default" onClick={onDone}>
          Cancelar
        </Button>
      </Group>
    </form>
  );
}

function DeleteModal({
  category,
  opened,
  onClose,
}: {
  category: AdminProductCategoryResponse;
  opened: boolean;
  onClose: () => void;
}) {
  const remove = useDeleteCategory();
  const [error, setError] = useState<string>();

  async function confirm() {
    try {
      await remove.mutateAsync(category.id);
      onClose();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  return (
    <AppModal opened={opened} onClose={onClose} title="Eliminar categoría">
      <Stack gap="lg">
        <Text>
          Vas a eliminar la categoría <strong>{category.name}</strong>. No se puede deshacer.
        </Text>
        {error && (
          <Alert color="red" icon={<IconAlertCircle aria-hidden />} role="alert">
            {error}
          </Alert>
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            color="red.8"
            loading={remove.isPending}
            onClick={() => {
              void confirm();
            }}
          >
            Eliminar
          </Button>
        </Group>
      </Stack>
    </AppModal>
  );
}
