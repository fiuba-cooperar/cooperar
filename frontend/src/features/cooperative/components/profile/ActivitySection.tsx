import { Chip, Group, NumberInput, SimpleGrid, Stack, Text, Textarea } from '@mantine/core';
import { CharacterCount } from '@/components/form/CharacterCount';
import { useState } from 'react';
import {
  ActivityType,
  Sector,
  Visibility,
  type CooperativeOrganizationProfileResponse,
} from '@/api/generated/model';
import { ACTIVITY_TYPE_LABELS, SECTOR_LABELS } from '@/features/organizations/labels';
import { SectionForm } from './SectionForm';
import { differs, hasErrors, type Errors, type SectionProps } from './sectionProps';
import { FieldHeader, VisibilityBadge, VisibilityToggle } from './Visibility';
import styles from './ProfileSections.module.css';

const SECTORS = Object.values(Sector);
const ACTIVITY_TYPES = Object.values(ActivityType);
const DESCRIPTION_MAX = 1500;
const FIRST_YEAR = 1800;
const MAX_WORKERS = 99_999;
const DESCRIPTION_HINT = 'Hasta 1.500 caracteres. Es lo primero que lee el público.';
const START_YEAR_HINT =
  'Desde cuándo trabajan como cooperativa. En una empresa recuperada, el año en que los trabajadores la recuperaron.';

interface Form {
  sectors: Sector[];
  activityTypes: ActivityType[];
  description: string;
  startYear: number | string;
  workerCount: number | string;
  workerCountVisibility: Visibility;
}

function fromProfile({ activity }: CooperativeOrganizationProfileResponse): Form {
  return {
    sectors: activity.sectors,
    activityTypes: activity.activityTypes,
    description: activity.description ?? '',
    startYear: activity.startYear ?? '',
    workerCount: activity.workerCount ?? '',
    workerCountVisibility: activity.workerCountVisibility,
  };
}

/** A whole number typed in a NumberInput, which gives '' while it is empty. */
function wholeNumber(value: number | string): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) ? value : undefined;
}

function validate(form: Form, currentYear: number): Errors<Form> {
  const errors: Errors<Form> = {};
  if (form.sectors.length === 0) errors.sectors = 'Elegí al menos un rubro.';
  if (form.activityTypes.length === 0) errors.activityTypes = 'Elegí al menos una opción.';
  if (form.startYear !== '') {
    const year = wholeNumber(form.startYear);
    if (year === undefined || year < FIRST_YEAR || year > currentYear)
      errors.startYear = `Ingresá un año entre ${String(FIRST_YEAR)} y ${String(currentYear)}.`;
  }
  if (form.workerCount !== '') {
    const count = wholeNumber(form.workerCount);
    if (count === undefined || count < 1 || count > MAX_WORKERS) {
      errors.workerCount = `Ingresá un número entre 1 y ${MAX_WORKERS.toLocaleString('es-AR')}.`;
    }
  }
  return errors;
}

export function ActivitySection({
  profile,
  hidden,
  saving,
  next,
  save,
  onDirtyChange,
  revision,
}: SectionProps) {
  const [form, setForm] = useState(() => fromProfile(profile));
  const [errors, setErrors] = useState<Errors<Form>>({});
  const [seenRevision, setSeenRevision] = useState(revision);
  if (seenRevision !== revision) {
    setSeenRevision(revision);
    setForm(fromProfile(profile));
    setErrors({});
  }
  const currentYear = new Date().getFullYear();

  function update<K extends keyof Form>(field: K, value: Form[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function onSave() {
    const validation = validate(form, currentYear);
    setErrors(validation);
    if (hasErrors(validation)) return false;
    const startYear = wholeNumber(form.startYear);
    const workerCount = wholeNumber(form.workerCount);
    const saved = await save({
      section: 'activity',
      data: {
        sectors: form.sectors,
        activityTypes: form.activityTypes,
        ...(form.description.trim() && { description: form.description.trim() }),
        ...(startYear !== undefined && { startYear }),
        ...(workerCount !== undefined && { workerCount }),
        workerCountVisibility: form.workerCountVisibility,
      },
    });
    setForm(fromProfile(saved));
    return true;
  }

  return (
    <SectionForm
      id="activity"
      title="Actividad"
      description="Sirve para que te encuentren en el buscador y en el catálogo."
      hidden={hidden}
      saving={saving}
      next={next}
      dirty={differs(form, fromProfile(profile))}
      onDirtyChange={onDirtyChange}
      onSave={onSave}
    >
      <Stack gap="lg">
        <fieldset className={styles.fieldset}>
          <FieldHeader
            legend
            label="Rubros"
            hint="Podés elegir más de uno. Si tu rubro no aparece, podés pedirle al observatorio que lo agregue."
            visibility={<VisibilityBadge visibility={Visibility.PUBLIC} />}
          />
          <Chip.Group
            multiple
            value={form.sectors}
            onChange={(values) => {
              update(
                'sectors',
                SECTORS.filter((sector) => values.includes(sector)),
              );
            }}
          >
            <Group gap="xs">
              {SECTORS.map((sector) => (
                <Chip key={sector} value={sector} variant="outline">
                  {SECTOR_LABELS[sector]}
                </Chip>
              ))}
            </Group>
          </Chip.Group>
          {errors.sectors && (
            <Text size="sm" c="red.8" mt={6}>
              {errors.sectors}
            </Text>
          )}
        </fieldset>
        <fieldset className={styles.fieldset}>
          <FieldHeader
            legend
            label="Qué ofrecen"
            visibility={<VisibilityBadge visibility={Visibility.PUBLIC} />}
          />
          <Chip.Group
            multiple
            value={form.activityTypes}
            onChange={(values) => {
              update(
                'activityTypes',
                ACTIVITY_TYPES.filter((type) => values.includes(type)),
              );
            }}
          >
            <Group gap="xs">
              {ACTIVITY_TYPES.map((type) => (
                <Chip key={type} value={type} variant="outline">
                  {ACTIVITY_TYPE_LABELS[type]}
                </Chip>
              ))}
            </Group>
          </Chip.Group>
          {errors.activityTypes && (
            <Text size="sm" c="red.8" mt={6}>
              {errors.activityTypes}
            </Text>
          )}
        </fieldset>
        <div>
          <FieldHeader
            htmlFor="profile-description"
            label="Descripción"
            hint={DESCRIPTION_HINT}
            visibility={<VisibilityBadge visibility={Visibility.PUBLIC} />}
          />
          <Textarea
            id="profile-description"
            rows={5}
            // Dragging the corner makes it taller too; the text keeps its own scroll at any size.
            resize="vertical"
            maxLength={DESCRIPTION_MAX}
            placeholder="Contá qué producen, desde cuándo trabajan, cómo se organizan y quiénes la integran."
            aria-description={DESCRIPTION_HINT}
            value={form.description}
            onChange={(event) => {
              update('description', event.currentTarget.value);
            }}
          />
          <Group justify="flex-end" mt={4}>
            <CharacterCount length={form.description.length} max={DESCRIPTION_MAX} />
          </Group>
        </div>
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
          <div>
            <FieldHeader
              htmlFor="profile-start-year"
              label="Año de inicio"
              hint={START_YEAR_HINT}
              visibility={<VisibilityBadge visibility={Visibility.PUBLIC} />}
            />
            <NumberInput
              id="profile-start-year"
              placeholder="Ej.: 2003"
              min={FIRST_YEAR}
              max={currentYear}
              clampBehavior="none"
              allowDecimal={false}
              allowNegative={false}
              thousandSeparator=""
              // A year has four digits: nothing more can be typed.
              isAllowed={({ value }) => value.length <= 4}
              hideControls
              aria-description={START_YEAR_HINT}
              value={form.startYear}
              error={errors.startYear}
              onChange={(value) => {
                update('startYear', value);
              }}
            />
          </div>
          <div>
            <FieldHeader
              htmlFor="profile-worker-count"
              label="Cantidad de trabajadores"
              visibility={
                <VisibilityToggle
                  field="la cantidad de trabajadores"
                  value={form.workerCountVisibility}
                  onChange={(visibility) => {
                    update('workerCountVisibility', visibility);
                  }}
                />
              }
            />
            <NumberInput
              id="profile-worker-count"
              placeholder="Ej.: 45"
              min={1}
              max={MAX_WORKERS}
              // Nothing above the limit can be typed.
              isAllowed={({ floatValue }) => floatValue === undefined || floatValue <= MAX_WORKERS}
              clampBehavior="none"
              allowDecimal={false}
              allowNegative={false}
              hideControls
              value={form.workerCount}
              error={errors.workerCount}
              onChange={(value) => {
                update('workerCount', value);
              }}
            />
          </div>
        </SimpleGrid>
      </Stack>
    </SectionForm>
  );
}
