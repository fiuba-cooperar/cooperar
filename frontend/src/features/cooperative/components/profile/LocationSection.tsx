import { Button, Collapse, Group, Select, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconChevronDown, IconPlus, IconTrash } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  AddressType,
  type AddressRequest,
  type CooperativeOrganizationProfileResponse,
} from '@/api/generated/model';
import { mainAddress, otherAddresses } from '@/features/organizations/addresses';
import {
  ADDRESS_TYPE_LABELS,
  otherAddressTitle,
  PROVINCE_LABELS,
} from '@/features/organizations/labels';
import { AddressFields } from './AddressFields';
import {
  addressEntry,
  draftFrom,
  emptyDraft,
  validateAddress,
  type AddressDraft,
  type AddressForm,
} from './addressDraft';
import { SectionForm } from './SectionForm';
import { differs, hasErrors, type SectionProps } from './sectionProps';
import styles from './ProfileSections.module.css';

/** Addresses besides the main one, as the backend allows. */
export const MAX_OTHER_ADDRESSES = 10;

// An organization has a single main address, so it is not offered for the other ones.
const OTHER_TYPES = Object.values(AddressType).filter((type) => type !== AddressType.MAIN);
const TYPE_OPTIONS = OTHER_TYPES.map((value) => ({ value, label: ADDRESS_TYPE_LABELS[value] }));

const MAIN_KEY = 'main';

function mainFrom({ location }: CooperativeOrganizationProfileResponse): AddressDraft {
  const main = mainAddress(location.addresses);
  // A fixed key, so the main address stays open or closed across saves.
  if (!main) return { ...emptyDraft(), type: AddressType.MAIN, key: MAIN_KEY };
  return {
    ...draftFrom(main.name, main.address, main.streetVisibility, main.point, main),
    key: MAIN_KEY,
  };
}

/** The title of an address: its name, if it has one, and what it is. */
function titleOf(form: AddressForm, kind: string) {
  const name = form.name.trim();
  return name ? `${name} · ${kind}` : kind;
}

/** The address in one line, for when it is collapsed. */
function summary(form: AddressForm) {
  const parts = [
    form.street.trim(),
    form.locality.trim(),
    form.district.trim(),
    form.province ? PROVINCE_LABELS[form.province] : '',
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Sin completar';
}

interface AddressBlockProps {
  draft: AddressDraft;
  title: string;
  open: boolean;
  onToggle: () => void;
  /** Next to the toggle, like the button that removes the address. */
  actions?: ReactNode;
  children: ReactNode;
}

/** One address, collapsed to a line with its summary until the person opens it. */
function AddressBlock({ draft, title, open, onToggle, actions, children }: AddressBlockProps) {
  const contentId = `${draft.key}-fields`;
  return (
    <Stack gap={0} component="fieldset" className={styles.addressGroup}>
      <Group component="legend" gap="xs" wrap="nowrap" className={styles.addressLegend}>
        <UnstyledButton
          type="button"
          className={styles.addressToggle}
          aria-expanded={open}
          aria-controls={contentId}
          onClick={onToggle}
        >
          <IconChevronDown
            size={20}
            aria-hidden
            className={styles.chevron}
            data-expanded={open || undefined}
          />
          <span className={styles.addressHeading}>
            <span className={styles.addressTitle}>{title}</span>
            <span className={styles.addressSummary}>{summary(draft.form)}</span>
          </span>
        </UnstyledButton>
        {actions}
      </Group>
      <Collapse expanded={open} id={contentId}>
        <div className={styles.addressContent}>{children}</div>
      </Collapse>
    </Stack>
  );
}

function othersFrom({ location }: CooperativeOrganizationProfileResponse) {
  return otherAddresses(location.addresses).map((other) =>
    draftFrom(other.name, other.address, other.streetVisibility, other.point, other),
  );
}

function validated(draft: AddressDraft): AddressDraft {
  return { ...draft, errors: validateAddress(draft.form) };
}

/** The main address and the other ones (a branch, another plant), each with its point on the map. */
/** What the person can change in the addresses; not the errors or the keys, which are bookkeeping. */
function editable(main: AddressDraft, others: AddressDraft[]) {
  const pick = ({ id, type, form, moved }: AddressDraft) => ({ id, type, form, moved });
  return { main: pick(main), others: others.map(pick) };
}

export function LocationSection({
  profile,
  hidden,
  saving,
  next,
  save,
  onDirtyChange,
  revision,
}: SectionProps) {
  const [main, setMain] = useState(() => mainFrom(profile));
  const [others, setOthers] = useState(() => othersFrom(profile));
  const [seenRevision, setSeenRevision] = useState(revision);
  // Every address starts collapsed; a new one opens, and so does one with errors when saving.
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  if (seenRevision !== revision) {
    setSeenRevision(revision);
    setMain(mainFrom(profile));
    setOthers(othersFrom(profile));
    setOpen(new Set());
  }

  function toggle(key: string) {
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }

  function updateOther(key: string, change: (draft: AddressDraft) => AddressDraft) {
    setOthers((current) => current.map((draft) => (draft.key === key ? change(draft) : draft)));
  }

  async function onSave() {
    const checkedMain = validated(main);
    const checkedOthers = others.map(validated);
    setMain(checkedMain);
    setOthers(checkedOthers);
    const withErrors = [checkedMain, ...checkedOthers]
      .filter((draft) => hasErrors(draft.errors))
      .map(({ key }) => key);
    if (withErrors.length > 0) setOpen((current) => new Set([...current, ...withErrors]));
    const entries = [checkedMain, ...checkedOthers].map(addressEntry);
    if (withErrors.length > 0 || entries.some((entry) => entry === null)) {
      return false;
    }
    const saved = await save({
      section: 'location',
      data: { addresses: entries.filter((entry): entry is AddressRequest => entry !== null) },
    });
    setMain(mainFrom(saved));
    const savedOthers = othersFrom(saved);
    setOthers(savedOthers);
    // A new address gets its id from the server, and with it a new key: it stays open if it was.
    setOpen((current) => {
      const next = new Set(current);
      checkedOthers.forEach((draft, index) => {
        const savedKey = savedOthers[index]?.key;
        if (savedKey && current.has(draft.key)) next.add(savedKey);
      });
      return next;
    });
    return true;
  }

  return (
    <SectionForm
      id="location"
      title="Ubicación"
      hidden={hidden}
      saving={saving}
      next={next}
      dirty={differs(editable(main, others), editable(mainFrom(profile), othersFrom(profile)))}
      onDirtyChange={onDirtyChange}
      onSave={onSave}
    >
      <Stack gap={0}>
        <AddressBlock
          draft={main}
          title={titleOf(main.form, 'Dirección principal')}
          open={open.has(main.key)}
          onToggle={() => {
            toggle(main.key);
          }}
        >
          <AddressFields
            organizationId={profile.id}
            idPrefix="profile"
            draft={main}
            onChange={setMain}
            mapSubject="tu entidad"
            namePlaceholder="Ej.: planta, local"
          />
        </AddressBlock>
        {others.map((draft) => {
          const title = otherAddressTitle(draft.form.name, draft.type, draft.form.district);
          return (
            <AddressBlock
              key={draft.key}
              draft={draft}
              title={title}
              open={open.has(draft.key)}
              onToggle={() => {
                toggle(draft.key);
              }}
              actions={
                <Button
                  type="button"
                  variant="subtle"
                  color="red"
                  size="compact-sm"
                  leftSection={<IconTrash size={16} aria-hidden />}
                  aria-label={`Quitar la dirección ${title}`}
                  onClick={() => {
                    setOthers((current) => current.filter((other) => other.key !== draft.key));
                  }}
                >
                  Quitar
                </Button>
              }
            >
              <Stack gap="md">
                <Select
                  label="Tipo de dirección"
                  data={TYPE_OPTIONS}
                  value={draft.type}
                  allowDeselect={false}
                  w={{ base: '100%', xs: 240 }}
                  onChange={(value) => {
                    const type = OTHER_TYPES.find((option) => option === value);
                    if (type) updateOther(draft.key, (current) => ({ ...current, type }));
                  }}
                />
                <AddressFields
                  organizationId={profile.id}
                  idPrefix={`other-${draft.key}`}
                  draft={draft}
                  onChange={(changed) => {
                    updateOther(draft.key, () => changed);
                  }}
                  mapSubject={`la dirección ${title}`}
                  namePlaceholder="Ej.: sucursal, depósito"
                />
              </Stack>
            </AddressBlock>
          );
        })}
        {others.length < MAX_OTHER_ADDRESSES ? (
          <Button
            type="button"
            variant="default"
            leftSection={<IconPlus size={18} aria-hidden />}
            w="fit-content"
            mt="md"
            onClick={() => {
              const added = emptyDraft();
              setOthers((current) => [...current, added]);
              setOpen((current) => new Set([...current, added.key]));
            }}
          >
            Agregar otra dirección
          </Button>
        ) : (
          <Text size="sm" c="dimmed" mt="md">
            Llegaste al máximo de {MAX_OTHER_ADDRESSES} direcciones además de la principal.
          </Text>
        )}
      </Stack>
    </SectionForm>
  );
}
