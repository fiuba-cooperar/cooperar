import { Group, Input, TextInput } from '@mantine/core';
import { formatNumber, numberDigits, type PhoneParts } from './phone';

/** A phone as two fields, area code and number, side by side. The label of the number is the one of the field. */
export function PhoneField({
  id,
  label,
  value,
  error,
  autoComplete,
  description,
  onChange,
}: {
  /** Of the number, so the label of the field points at it. */
  id: string;
  /** What the area code input is called for assistive technology, e.g. "Característica del teléfono". */
  label: string;
  value: PhoneParts;
  error: string | undefined;
  autoComplete?: string;
  /** Read out with the number, as the hint next to the label is not reachable by keyboard. */
  description?: string;
  onChange: (value: PhoneParts) => void;
}) {
  const errorId = `${id}-error`;
  return (
    // The wrapper draws the error the same way as the other fields, under both inputs.
    <Input.Wrapper size="md" error={error} errorProps={{ id: errorId, mt: 5 }}>
      <Group gap="xs" align="flex-start" wrap="nowrap">
        <TextInput
          aria-label={label}
          placeholder="Ej.: 11"
          inputMode="numeric"
          maxLength={5}
          w={96}
          value={value.areaCode}
          error={error !== undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => {
            onChange({ ...value, areaCode: event.currentTarget.value.replace(/[^\d]/g, '') });
          }}
        />
        <TextInput
          id={id}
          type="tel"
          aria-description={description}
          autoComplete={autoComplete}
          placeholder="Ej.: 4444-5555"
          inputMode="numeric"
          flex={1}
          value={formatNumber(value.number)}
          error={error !== undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => {
            // Only digits are kept; the dash is drawn by the field.
            onChange({ ...value, number: numberDigits(event.currentTarget.value) });
          }}
        />
      </Group>
    </Input.Wrapper>
  );
}
