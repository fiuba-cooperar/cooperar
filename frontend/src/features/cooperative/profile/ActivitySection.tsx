import { Chip, Group, NumberInput, SimpleGrid, Stack, Text, Textarea } from '@mantine/core';
import { useState } from 'react';
import { ActivityType, Sector } from '@/api/generated/model';
import { ACTIVITY_TYPE_LABELS, SECTOR_LABELS } from '@/features/organizations/labels';
import { useSaveActivity } from '../api/useManagedProfile';
import { ProfileField, VisibilityBadge } from './ProfileField';
import { SectionForm } from './SectionForm';
import type { SectionProps } from './IdentificationSection';

const SECTORS = Object.values(Sector);
const ACTIVITY_TYPES = Object.values(ActivityType);
const MAX_DESCRIPTION = 1500;

function toNumber(value: string | number): number | null {
  return typeof value === 'number' ? value : null;
}

export function ActivitySection({ profile, nextLabel, onNext }: SectionProps) {
  const save = useSaveActivity(profile.id);
  const [sectors, setSectors] = useState<Sector[]>(profile.sectors);
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>(profile.activityTypes);
  const [description, setDescription] = useState(profile.description ?? '');
  const [foundingYear, setFoundingYear] = useState<number | null>(profile.foundingYear ?? null);
  const [workerCount, setWorkerCount] = useState<number | null>(profile.workerCount ?? null);
  const [workerCountPublic, setWorkerCountPublic] = useState(profile.workerCountPublic);
  const [problem, setProblem] = useState<Record<string, string>>({});

  function submit() {
    const problems: Record<string, string> = {};
    if (sectors.length === 0) problems.sectors = 'Elegí al menos un rubro.';
    if (activityTypes.length === 0) problems.activityTypes = 'Elegí al menos una opción.';
    if (foundingYear !== null && (foundingYear < 1800 || foundingYear > 2100))
      problems.foundingYear = 'Ingresá un año entre 1800 y 2100.';
    if (workerCount !== null && workerCount < 1)
      problems.workerCount = 'Ingresá una cantidad mayor a cero.';
    setProblem(problems);
    if (Object.keys(problems).length > 0) return;
    save.mutate({
      sectors,
      activityTypes,
      description,
      ...(foundingYear !== null && { foundingYear }),
      ...(workerCount !== null && { workerCount }),
      workerCountPublic,
    });
  }

  return (
    <SectionForm
      id="section-activity"
      title="Actividad"
      description="Sirve para que te encuentren en el buscador y en el catálogo."
      saving={save.isPending}
      saved={save.isSuccess}
      error={save.error}
      onSubmit={submit}
      nextLabel={nextLabel}
      {...(onNext && { onNext })}
    >
      <ChipChoice
        label="Rubros"
        hint="Podés elegir más de uno. La lista la mantiene el observatorio."
        options={SECTORS.map((value) => ({ value, label: SECTOR_LABELS[value] }))}
        selected={sectors}
        error={problem.sectors}
        onChange={(values) => {
          setSectors(SECTORS.filter((sector) => values.includes(sector)));
        }}
      />
      <ChipChoice
        label="Qué ofrecen"
        options={ACTIVITY_TYPES.map((value) => ({ value, label: ACTIVITY_TYPE_LABELS[value] }))}
        selected={activityTypes}
        error={problem.activityTypes}
        onChange={(values) => {
          setActivityTypes(ACTIVITY_TYPES.filter((type) => values.includes(type)));
        }}
      />
      <ProfileField htmlFor="profile-description" label="Descripción" fixed="public">
        <Textarea
          id="profile-description"
          rows={5}
          maxLength={MAX_DESCRIPTION}
          placeholder="Contá qué producen, desde cuándo trabajan, cómo se organizan y quiénes la integran."
          value={description}
          onChange={(event) => {
            setDescription(event.currentTarget.value);
          }}
        />
        <Text size="sm" c="dimmed">
          Hasta 1.500 caracteres. Es lo primero que lee el público.
        </Text>
      </ProfileField>
      <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
        <ProfileField
          htmlFor="profile-founding-year"
          label="Año de inicio"
          fixed="public"
          error={problem.foundingYear}
        >
          <NumberInput
            id="profile-founding-year"
            placeholder="Ej.: 2003"
            hideControls
            allowDecimal={false}
            allowNegative={false}
            value={foundingYear ?? ''}
            onChange={(value) => {
              setFoundingYear(toNumber(value));
            }}
          />
          <Text size="sm" c="dimmed">
            En una ERT, el año en que los trabajadores la recuperaron.
          </Text>
        </ProfileField>
        <ProfileField
          htmlFor="profile-worker-count"
          label="Cantidad de trabajadores"
          visibility={{ isPublic: workerCountPublic, onChange: setWorkerCountPublic }}
          error={problem.workerCount}
        >
          <NumberInput
            id="profile-worker-count"
            placeholder="Ej.: 45"
            hideControls
            allowDecimal={false}
            allowNegative={false}
            value={workerCount ?? ''}
            onChange={(value) => {
              setWorkerCount(toNumber(value));
            }}
          />
        </ProfileField>
      </SimpleGrid>
    </SectionForm>
  );
}

function ChipChoice<T extends string>({
  label,
  hint,
  options,
  selected,
  error,
  onChange,
}: {
  label: string;
  hint?: string;
  options: { value: T; label: string }[];
  selected: T[];
  error: string | undefined;
  onChange: (values: T[]) => void;
}) {
  return (
    <Stack component="fieldset" gap={6} m={0} p={0} bd={0} miw={0}>
      <Group justify="space-between" mih={28}>
        <Text component="legend" fw={600} size="sm" p={0}>
          {label}
        </Text>
        <VisibilityBadge visibility="public" />
      </Group>
      <Chip.Group
        multiple
        value={selected}
        onChange={(values) => {
          onChange(
            values.filter((value): value is T => options.some((option) => option.value === value)),
          );
        }}
      >
        <Group gap="sm">
          {options.map((option) => (
            <Chip key={option.value} value={option.value} size="md">
              {option.label}
            </Chip>
          ))}
        </Group>
      </Chip.Group>
      {hint && (
        <Text size="sm" c="dimmed">
          {hint}
        </Text>
      )}
      {error && (
        <Text size="sm" c="red.8" role="alert">
          {error}
        </Text>
      )}
    </Stack>
  );
}
