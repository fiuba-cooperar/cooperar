import {
  Alert,
  CloseButton,
  Badge,
  Group,
  Paper,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { IconAlertCircle, IconMessages, IconSearch } from '@tabler/icons-react';
import { PageNavigation } from '@/components/PageNavigation';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { InquiryStatus, type InquirySummaryResponse } from '@/api/generated/model';
import { useInquiries } from './api/useInquiries';
import {
  INQUIRIES_PAGE_SIZE,
  INQUIRY_STATUS_COLORS,
  INQUIRY_STATUS_FILTER_LABELS,
  INQUIRY_STATUS_LABELS,
  type InquiryListState,
  readInquiryFilters,
  toInquiryParams,
  writeInquiryFilters,
} from './inquiries';
import { useActiveOrganization, usePanelPaths } from './useActiveOrganization';
import styles from './InquiriesPage.module.css';

const dateFormat = new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' });

const ALL = 'all';

/** "Consultas": the inbox of the inquiries the active organization received, newest first, by status. */
export function InquiriesPage() {
  const organization = useActiveOrganization();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = readInquiryFilters(searchParams);
  // Stable, so the pause before searching is not restarted by every render.
  const search = useCallback(
    (query: string) => {
      setSearchParams((current) =>
        writeInquiryFilters({ ...readInquiryFilters(current), query, page: 1 }),
      );
    },
    [setSearchParams],
  );
  const { data, isPending, isError, isPlaceholderData } = useInquiries(
    organization.id,
    toInquiryParams(filters),
  );
  const pages = data ? Math.ceil(data.total / INQUIRIES_PAGE_SIZE) : 0;
  const counts = data?.counts;
  const all = counts ? counts.newCount + counts.respondedCount + counts.closedCount : undefined;
  const countOf: Record<InquiryStatus, number | undefined> = {
    [InquiryStatus.NEW]: counts?.newCount,
    [InquiryStatus.RESPONDED]: counts?.respondedCount,
    [InquiryStatus.CLOSED]: counts?.closedCount,
  };

  return (
    <Stack gap={24}>
      <Title order={1} fz={32} mb={-12}>
        Consultas
      </Title>
      {((all !== undefined && all > 0) || filters.query) && (
        <div className={styles.toolbar}>
          {/* Also while a search finds nothing, so the row does not jump; its counts are then zero. */}
          {all !== undefined && (all > 0 || filters.query) && (
            <SegmentedControl
              aria-label="Estado de las consultas"
              className={styles.filter}
              value={filters.status ?? ALL}
              onChange={(value) => {
                const status = Object.values(InquiryStatus).find((each) => each === value) ?? null;
                setSearchParams(writeInquiryFilters({ ...filters, status, page: 1 }));
              }}
              data={[
                { value: ALL, label: `Todas (${String(all)})` },
                ...Object.values(InquiryStatus).map((status) => ({
                  value: status,
                  label: `${INQUIRY_STATUS_FILTER_LABELS[status]} (${String(countOf[status] ?? 0)})`,
                })),
              ]}
            />
          )}
          <InquirySearch query={filters.query} onSearch={search} />
        </div>
      )}
      {isPending && <Text role="status">Cargando las consultas…</Text>}
      {isError && (
        <Alert
          color="red"
          icon={<IconAlertCircle aria-hidden />}
          title="No pudimos cargar las consultas"
        >
          Probá de nuevo en unos minutos.
        </Alert>
      )}
      {all === 0 && filters.query && (
        <NoResults>Ninguna consulta coincide con «{filters.query}».</NoResults>
      )}
      {all === 0 && !filters.query && (
        <Paper withBorder radius="lg" className={styles.empty}>
          <ThemeIcon variant="light" size={64} radius="xl" aria-hidden>
            <IconMessages size={32} stroke={1.6} />
          </ThemeIcon>
          <Stack gap={6} align="center" maw={440}>
            <Title order={2} fz={20}>
              Todavía no se recibieron consultas
            </Title>
            <Text c="dimmed">
              Las consultas enviadas desde el catálogo sobre tus productos y servicios se mostrarán
              en esta sección.
            </Text>
          </Stack>
        </Paper>
      )}
      {data?.total === 0 && all !== 0 && <NoResults>No hay consultas en este estado.</NoResults>}
      {data && data.items.length > 0 && (
        <Paper withBorder radius="lg" aria-busy={isPlaceholderData}>
          <ul className={styles.list} aria-label="Consultas recibidas">
            {data.items.map((inquiry) => (
              <InquiryRow key={inquiry.id} inquiry={inquiry} />
            ))}
          </ul>
        </Paper>
      )}
      {pages > 1 && (
        <PageNavigation
          label="Páginas de consultas"
          total={pages}
          value={filters.page}
          onChange={(page) => {
            setSearchParams(writeInquiryFilters({ ...filters, page }));
          }}
        />
      )}
    </Stack>
  );
}

/** In the place of the list, so it lines up with it and the filters above. */
function NoResults({ children }: { children: ReactNode }) {
  return (
    <Paper withBorder radius="lg" p="xl">
      <Text c="dimmed" ta="center">
        {children}
      </Text>
    </Paper>
  );
}

const SEARCH_DELAY_MS = 300;

/** Searches while typing, once the person pauses; Enter does not wait. */
function InquirySearch({ query, onSearch }: { query: string; onSearch: (query: string) => void }) {
  const [text, setText] = useState(query);
  const [lastQuery, setLastQuery] = useState(query);
  // Going back changes the query from outside the box.
  if (query !== lastQuery) {
    setLastQuery(query);
    setText(query);
  }
  useEffect(() => {
    const typed = text.trim();
    if (typed === query) return;
    const timer = setTimeout(() => {
      // The query comes back from the box itself: it must not reset what the person kept typing meanwhile.
      setLastQuery(typed);
      onSearch(typed);
    }, SEARCH_DELAY_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [text, query, onSearch]);

  return (
    <form
      role="search"
      aria-label="Buscar entre las consultas"
      className={styles.search}
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(text.trim());
      }}
    >
      <TextInput
        type="search"
        aria-label="Buscar consultas"
        size="sm"
        // The theme makes every field 48px tall; this one keeps to the height of the status filter beside it.
        styles={{ input: { height: 36, minHeight: 36 } }}
        placeholder="Buscar consultas…"
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
                if (query) onSearch('');
              }}
            />
          ) : null
        }
        onChange={(event) => {
          setText(event.currentTarget.value);
        }}
      />
    </form>
  );
}

function InquiryRow({ inquiry }: { inquiry: InquirySummaryResponse }) {
  const paths = usePanelPaths();
  const [searchParams] = useSearchParams();
  const isNew = inquiry.status === InquiryStatus.NEW;
  const state: InquiryListState = { listSearch: searchParams.toString() };
  return (
    <li>
      <Link to={paths.inquiry(inquiry.id)} state={state} className={styles.row}>
        <Group justify="space-between" wrap="nowrap" align="flex-start" gap="sm">
          <Stack gap={2} miw={0}>
            <Text fw={isNew ? 700 : 600}>{inquiry.senderName}</Text>
            <Text size="sm" c="dimmed" truncate>
              {inquiry.productName}
            </Text>
          </Stack>
          <Stack gap={4} align="flex-end" style={{ flexShrink: 0 }}>
            <Badge color={INQUIRY_STATUS_COLORS[inquiry.status]} variant="light">
              {INQUIRY_STATUS_LABELS[inquiry.status]}
            </Badge>
            <Text size="xs" c="dimmed">
              {dateFormat.format(new Date(inquiry.createdAt))}
            </Text>
          </Stack>
        </Group>
        <Text size="sm" mt={6} lineClamp={2}>
          {inquiry.message}
        </Text>
      </Link>
    </li>
  );
}
