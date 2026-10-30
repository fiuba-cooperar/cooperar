import { Anchor, Badge, Button, Container, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { IconMapPinFilled, IconSearch } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { REGISTER_PATH } from '@/components/layout/publicSections';
import styles from './HomePage.module.css';

// 1180px of content between 48px gutters, as in the mock.
const SECTION = { size: 1276, px: { base: 'md', sm: 48 } } as const;

const SECTORS = [
  { slug: 'food', label: 'Alimentos' },
  { slug: 'textile', label: 'Textil' },
  { slug: 'metalworking', label: 'Metalúrgica' },
  { slug: 'printing', label: 'Gráfica' },
  { slug: 'services', label: 'Servicios' },
];

// Static until the observatory loads its own survey data.
const FIGURES = [
  { value: '398', label: 'empresas recuperadas en todo el país' },
  { value: '13.812', label: 'trabajadores y trabajadoras' },
];

function EntryIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={styles.entryIcon}
    >
      {children}
    </svg>
  );
}

const ENTRIES = [
  {
    to: '/organizations',
    icon: (
      <EntryIcon>
        <path d="M4 20V8l8-4 8 4v12" />
        <path d="M9 20v-6h6v6" />
      </EntryIcon>
    ),
    title: 'Encontrar empresas',
    description: 'Buscá por rubro, zona o palabra clave y mirá la ficha de cada cooperativa.',
  },
  {
    to: '/catalog',
    icon: (
      <EntryIcon>
        <path d="M4 7l8-4 8 4-8 4-8-4z" />
        <path d="M4 7v10l8 4 8-4V7" />
      </EntryIcon>
    ),
    title: 'Mirar los catálogos',
    description: 'Productos y servicios con precio orientativo y pedido de presupuesto directo.',
  },
  {
    to: '/fairs',
    icon: (
      <EntryIcon>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M3 10h18" />
      </EntryIcon>
    ),
    title: 'Visitar las ferias',
    description: 'Ferias, eventos y puntos de venta donde comprarle a las cooperativas.',
  },
  {
    to: '/history',
    icon: (
      <EntryIcon>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </EntryIcon>
    ),
    title: 'Conocer su historia',
    description: 'Líneas de tiempo con el proceso de recuperación de cada empresa.',
  },
];

// Decorative pins of the map preview, as percentages of the box.
const PINS = [
  { left: 34, top: 42 },
  { left: 56, top: 30 },
  { left: 48, top: 62 },
  { left: 70, top: 54, accent: true },
];

function ComingSoonBadge() {
  return (
    <Badge variant="light" size="sm">
      Próximamente
    </Badge>
  );
}

function Hero() {
  return (
    <section className={styles.hero}>
      <Container {...SECTION} py={{ base: 40, sm: 64 }}>
        <div className={styles.heroGrid}>
          <Stack gap={22} className={styles.heroText}>
            <Title order={1} className={styles.heroTitle}>
              Descubrí cooperativas y empresas recuperadas
            </Title>
            <Text fz={18} lh={1.55} maw={560} className={styles.heroLead}>
              Encontrá cooperativas y ERTs de todo el país, conocé su historia, mirá lo que producen
              y comprá sus productos.
            </Text>
            <Search />
            <Group gap={8}>
              <Text size="sm" c="dimmed" mr={4}>
                Por rubro:
              </Text>
              {SECTORS.map(({ slug, label }) => (
                <Link key={slug} to={`/organizations?sector=${slug}`} className={styles.chip}>
                  {label}
                </Link>
              ))}
            </Group>
          </Stack>
          <MapPreview />
        </div>
      </Container>
    </section>
  );
}

// TODO(#15): enable the search once it exists.
function Search() {
  return (
    <Stack gap={8} maw={600}>
      <form role="search" aria-label="Buscador" className={styles.search}>
        <IconSearch size={20} stroke={2.2} aria-hidden="true" className={styles.searchIcon} />
        <label htmlFor="home-search" className={styles.visuallyHidden}>
          Buscar
        </label>
        <input
          id="home-search"
          type="search"
          placeholder="Buscá una empresa, un producto o una zona"
          aria-describedby="home-search-soon"
          className={styles.searchInput}
          disabled
        />
        <Button type="submit" h={44} px={22} fz={16} className={styles.searchButton} disabled>
          Buscar
        </Button>
      </form>
      <Group gap="xs" id="home-search-soon">
        <ComingSoonBadge />
        <Text size="sm" c="dimmed">
          El buscador va a estar disponible muy pronto.
        </Text>
      </Group>
    </Stack>
  );
}

function MapPreview() {
  return (
    <Paper withBorder radius={14} p={14} className={styles.mapCard}>
      <div className={styles.mapBox}>
        <span className={styles.mapLabel}>Mapa de cooperativas</span>
        {/* TODO(#17): replace the preview with the real map. */}
        <span className={styles.mapSoon}>
          <ComingSoonBadge />
        </span>
        {PINS.map(({ left, top, accent }) => (
          <IconMapPinFilled
            key={`${String(left)}-${String(top)}`}
            size={26}
            aria-hidden="true"
            className={accent ? styles.pinAccent : styles.pin}
            style={{ left: `${String(left)}%`, top: `${String(top)}%` }}
          />
        ))}
        <Text fz={13} c="dimmed">
          Vista previa del mapa
        </Text>
      </div>
      <Group justify="space-between" px={6} pt={14} pb={4}>
        <Text size="sm" c="dimmed">
          Cooperativas cerca tuyo
        </Text>
        <Anchor component={Link} to="/map" fw={600} size="sm" underline="always">
          Abrir el mapa →
        </Anchor>
      </Group>
    </Paper>
  );
}

function SectorFigures() {
  return (
    <Container component="section" {...SECTION} pt={44} pb={8} aria-labelledby="figures-title">
      <h2 id="figures-title" className={styles.visuallyHidden}>
        El sector en números
      </h2>
      <div className={styles.figures}>
        {FIGURES.map(({ value, label }) => (
          <Paper key={value} withBorder radius={14} px={24} py={22} className={styles.figureCard}>
            <Text className={styles.figure}>{value}</Text>
            <Text c="dimmed" fz={15}>
              {label}
            </Text>
          </Paper>
        ))}
        <Text fz={13} c="dimmed" lh={1.5} className={styles.source}>
          Fuente: Informe ERT 2025, Programa Facultad Abierta (UBA), datos a agosto de 2025.
        </Text>
      </div>
    </Container>
  );
}

function Entries() {
  return (
    <Container component="section" {...SECTION} pt={40} pb={8} aria-labelledby="entries-title">
      <Stack gap={20}>
        <Title order={2} id="entries-title" fz={26}>
          Qué podés hacer en este sitio
        </Title>
        <div className={styles.entries}>
          {ENTRIES.map(({ to, icon, title, description }) => (
            <Paper
              key={to}
              component={Link}
              to={to}
              withBorder
              radius={14}
              p={24}
              className={styles.entry}
            >
              {icon}
              <Text fw={700} fz={18}>
                {title}
              </Text>
              <Text c="dimmed" fz={15} lh={1.5}>
                {description}
              </Text>
            </Paper>
          ))}
        </div>
      </Stack>
    </Container>
  );
}

function FeaturedCooperatives() {
  return (
    <Container component="section" {...SECTION} pt={40} pb={8} aria-labelledby="featured-title">
      <Stack gap={20}>
        <Group justify="space-between" align="baseline" gap="xs">
          <Title order={2} id="featured-title" fz={26}>
            Cooperativas para conocer
          </Title>
          <Anchor component={Link} to="/organizations" fw={600} fz={15} underline="always">
            Ver todas →
          </Anchor>
        </Group>
        {/* TODO(#15): list featured cooperatives once the directory exists. */}
        <Paper radius={14} p="xl" className={styles.placeholder}>
          <Stack gap="xs" align="center" ta="center">
            <ComingSoonBadge />
            <Text c="dimmed">Muy pronto vas a ver acá algunas cooperativas para conocer.</Text>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}

function RegisterBand() {
  return (
    <Container component="section" {...SECTION} pt={48} pb={56} aria-labelledby="register-title">
      <div className={styles.band}>
        <Stack gap={6} flex="1 1 380px">
          <Title order={2} id="register-title" fz={24} className={styles.bandTitle}>
            ¿Sos parte de una cooperativa o empresa recuperada?
          </Title>
          <Text fz={16} lh={1.5} className={styles.bandText}>
            Registrate, mostrá lo que producís y formá parte de la red.
          </Text>
        </Stack>
        <Button
          component={Link}
          to={REGISTER_PATH}
          h={48}
          px={24}
          fz={16}
          className={styles.bandButton}
          // Set as variables so they win over the colors Mantine computes for the filled variant.
          vars={() => ({
            root: {
              '--button-bg': 'var(--color-accent)',
              '--button-hover': 'color-mix(in srgb, var(--color-accent) 88%, black)',
              '--button-color': 'var(--color-accent-text)',
            },
          })}
        >
          Registrá tu organización
        </Button>
      </div>
    </Container>
  );
}

export function HomePage() {
  return (
    <>
      <Hero />
      <SectorFigures />
      <Entries />
      <FeaturedCooperatives />
      <RegisterBand />
    </>
  );
}
