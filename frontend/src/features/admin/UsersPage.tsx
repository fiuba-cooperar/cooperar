import {
  Alert,
  Anchor,
  Badge,
  Button,
  Checkbox,
  CloseButton,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  VisuallyHidden,
} from '@mantine/core';
import { IconAlertCircle, IconSearch } from '@tabler/icons-react';
import { PageNavigation } from '@/components/PageNavigation';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Role, type AdminUserResponse } from '@/api/generated/model';
import { adminUserPath } from './adminSections';
import { useUsers } from './api/useUsers';
import {
  hasFilters,
  readFilters,
  toParams,
  USERS_PAGE_SIZE,
  writeFilters,
  type EmailFilter,
  type UserFilters,
} from './userFilters';
import { fullName, ROLE_LABELS, userCount, type UserListState } from './users';
import styles from './UsersPage.module.css';

/** How long the search waits after the last key before asking the server. */
const SEARCH_DELAY_MS = 300;

const ALL = 'all';

const ROLE_OPTIONS = [
  { value: ALL, label: 'Todos' },
  { value: Role.COOPERATIVE, label: ROLE_LABELS[Role.COOPERATIVE] },
  { value: Role.ADMIN, label: ROLE_LABELS[Role.ADMIN] },
];

const EMAIL_OPTIONS: { value: EmailFilter | typeof ALL; label: string }[] = [
  { value: ALL, label: 'Todos' },
  { value: 'verified', label: 'Confirmado' },
  { value: 'unverified', label: 'Sin confirmar' },
];

const DATE_FORMAT = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** «Usuarios»: the accounts of the platform, the newest first, searched and filtered from the address. */
export function UsersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = readFilters(searchParams);
  const { data, isPending, isError, isPlaceholderData } = useUsers(toParams(filters));
  const pages = data ? Math.ceil(data.total / USERS_PAGE_SIZE) : 0;

  function update(changes: Partial<UserFilters>) {
    // Changing what is searched starts again from the first page.
    setSearchParams(writeFilters({ ...filters, page: 1, ...changes }));
  }

  return (
    <Stack gap={24}>
      <Stack gap={6}>
        <Title order={1}>Usuarios</Title>
        <Text c="dimmed">Las cuentas de la plataforma, de la más nueva a la más vieja.</Text>
      </Stack>
      <Filters filters={filters} onChange={update} total={data?.total} />
      {isPending && <Text role="status">Cargando los usuarios…</Text>}
      {isError && (
        <Alert color="red" icon={<IconAlertCircle aria-hidden />} role="alert">
          No pudimos cargar los usuarios. Intentá de nuevo en unos minutos.
        </Alert>
      )}
      {data?.total === 0 && (
        <Paper withBorder radius="lg" className={styles.empty}>
          <Stack gap={6} align="center" maw={440}>
            <Title order={2} fz={20}>
              No encontramos usuarios con esos filtros
            </Title>
            <Text c="dimmed">Probá con otras palabras o quitá algún filtro.</Text>
          </Stack>
          {hasFilters(filters) && (
            <Button
              variant="default"
              h={44}
              onClick={() => {
                setSearchParams({});
              }}
            >
              Limpiar los filtros
            </Button>
          )}
        </Paper>
      )}
      {data && data.items.length > 0 && (
        <Paper withBorder radius="lg" className={styles.tableCard} aria-busy={isPlaceholderData}>
          <table className={styles.table}>
            <VisuallyHidden component="caption">Listado de usuarios</VisuallyHidden>
            <thead>
              <tr>
                <th scope="col">Nombre</th>
                <th scope="col">Email</th>
                <th scope="col">Rol</th>
                <th scope="col">Email confirmado</th>
                <th scope="col">Alta</th>
                <th scope="col" className={styles.number}>
                  Entidades
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((user) => (
                <UserRow key={user.id} user={user} listSearch={searchParams.toString()} />
              ))}
            </tbody>
          </table>
        </Paper>
      )}
      {pages > 1 && (
        <PageNavigation
          label="Páginas de usuarios"
          total={pages}
          value={filters.page}
          onChange={(page) => {
            setSearchParams(writeFilters({ ...filters, page }));
          }}
        />
      )}
    </Stack>
  );
}

/** The search by name, surname or email and the filters of the list. */
function Filters({
  filters,
  onChange,
  total,
}: {
  filters: UserFilters;
  onChange: (changes: Partial<UserFilters>) => void;
  total: number | undefined;
}) {
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
      <div className={styles.filters} role="search" aria-label="Buscar entre los usuarios">
        <form
          className={styles.search}
          onSubmit={(event) => {
            event.preventDefault();
            onChange({ query: text.trim() });
          }}
        >
          <TextInput
            type="search"
            label="Buscar"
            placeholder="Nombre, apellido o email"
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
          label="Rol"
          data={ROLE_OPTIONS}
          value={filters.role ?? ALL}
          allowDeselect={false}
          onChange={(value) => {
            onChange({ role: value === Role.ADMIN || value === Role.COOPERATIVE ? value : null });
          }}
        />
        <Select
          label="Email"
          data={EMAIL_OPTIONS}
          value={filters.email ?? ALL}
          allowDeselect={false}
          onChange={(value) => {
            onChange({ email: value === 'verified' || value === 'unverified' ? value : null });
          }}
        />
        <Checkbox
          className={styles.checkbox}
          label="Sin entidades"
          checked={filters.withoutOrganizations}
          onChange={(event) => {
            onChange({ withoutOrganizations: event.currentTarget.checked });
          }}
        />
      </div>
      {total !== undefined && (
        <Text fz={14} c="dimmed" role="status">
          {userCount(total)}
        </Text>
      )}
    </Stack>
  );
}

function UserRow({ user, listSearch }: { user: AdminUserResponse; listSearch: string }) {
  const name = fullName(user);
  const state: UserListState = { listSearch };
  return (
    <tr>
      <td>
        <Anchor
          component={Link}
          to={adminUserPath(user.id)}
          state={state}
          fz={14}
          fw={600}
          // Several accounts may have no name, so the link says whose it is.
          {...(!name && { c: 'dimmed', 'aria-label': `Sin nombre (${user.email})` })}
        >
          {name || 'Sin nombre'}
        </Anchor>
      </td>
      <td>
        <Text fz={14}>{user.email}</Text>
      </td>
      <td>
        <Badge variant="light" color={user.role === Role.ADMIN ? 'brand' : 'gray'}>
          {ROLE_LABELS[user.role]}
        </Badge>
      </td>
      <td>
        {user.emailVerified ? (
          <Text fz={14}>Confirmado</Text>
        ) : (
          <Badge variant="light" color="orange">
            Sin confirmar
          </Badge>
        )}
      </td>
      <td>
        <Text fz={14}>{DATE_FORMAT.format(new Date(user.createdAt))}</Text>
      </td>
      <td className={styles.number}>
        {/* An observatory account never manages organizations, so 0 would read as missing ones. */}
        {user.role === Role.ADMIN ? (
          <Text fz={14} c="dimmed">
            <span aria-hidden>—</span>
            <VisuallyHidden>No corresponde</VisuallyHidden>
          </Text>
        ) : (
          <Text fz={14}>{user.organizationCount}</Text>
        )}
      </td>
    </tr>
  );
}
