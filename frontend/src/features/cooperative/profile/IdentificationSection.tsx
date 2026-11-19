import { SimpleGrid, Text, TextInput } from '@mantine/core';
import { useState } from 'react';
import type { CooperativeProfileResponse } from '@/api/generated/model';
import { formatCuit } from '@/features/organizations/cuit';
import { ORGANIZATION_TYPE_LABELS } from '@/features/organizations/labels';
import { useSaveIdentification } from '../api/useManagedProfile';
import { ProfileField } from './ProfileField';
import { SectionForm } from './SectionForm';

export interface SectionProps {
  profile: CooperativeProfileResponse;
  nextLabel?: string | undefined;
  onNext?: () => void;
}

export function IdentificationSection({ profile, nextLabel, onNext }: SectionProps) {
  const save = useSaveIdentification(profile.id);
  const [name, setName] = useState(profile.name);
  const [legalName, setLegalName] = useState(profile.legalName ?? '');
  const [legalNamePublic, setLegalNamePublic] = useState(profile.legalNamePublic);
  const [problem, setProblem] = useState<{ name?: string; legalName?: string }>({});

  function submit() {
    const problems = {
      ...(name.trim() ? {} : { name: 'Ingresá el nombre de la entidad.' }),
      ...(legalName.trim() ? {} : { legalName: 'Ingresá la razón social.' }),
    };
    setProblem(problems);
    if (Object.keys(problems).length > 0) return;
    save.mutate({ name, legalName, legalNamePublic });
  }

  return (
    <SectionForm
      id="section-identification"
      title="Identificación"
      description="Lo que declaraste en el alta y aprobó el observatorio."
      saving={save.isPending}
      saved={save.isSuccess}
      error={save.error}
      onSubmit={submit}
      nextLabel={nextLabel}
      {...(onNext && { onNext })}
    >
      <ProfileField
        htmlFor="profile-name"
        label="Nombre de la entidad"
        fixed="public"
        error={problem.name}
      >
        <TextInput
          id="profile-name"
          maxLength={200}
          value={name}
          error={Boolean(problem.name)}
          onChange={(event) => {
            setName(event.currentTarget.value);
          }}
        />
      </ProfileField>
      <ProfileField
        htmlFor="profile-legal-name"
        label="Razón social"
        visibility={{ isPublic: legalNamePublic, onChange: setLegalNamePublic }}
        error={problem.legalName}
      >
        <TextInput
          id="profile-legal-name"
          maxLength={200}
          value={legalName}
          error={Boolean(problem.legalName)}
          onChange={(event) => {
            setLegalName(event.currentTarget.value);
          }}
        />
      </ProfileField>
      <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
        <ProfileField htmlFor="profile-type" label="Tipo de entidad" fixed="public">
          <TextInput
            id="profile-type"
            value={ORGANIZATION_TYPE_LABELS[profile.type]}
            disabled
            readOnly
          />
        </ProfileField>
        <ProfileField htmlFor="profile-cuit" label="CUIT" fixed="private">
          <TextInput id="profile-cuit" value={formatCuit(profile.cuit)} disabled readOnly />
        </ProfileField>
      </SimpleGrid>
      <Text size="sm" c="dimmed">
        El tipo y el CUIT los validó el observatorio. Si hay un error, escribile al observatorio.
      </Text>
    </SectionForm>
  );
}
