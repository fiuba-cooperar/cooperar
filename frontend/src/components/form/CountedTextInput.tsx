import { TextInput, type TextInputProps } from '@mantine/core';
import { CharacterCount } from './CharacterCount';

/** A text field that shows how much of its limit is used («12/50») inside the field. */
export function CountedTextInput({
  maxLength,
  value,
  ...props
}: Omit<TextInputProps, 'maxLength' | 'value' | 'rightSection'> & {
  maxLength: number;
  value: string;
}) {
  return (
    <TextInput
      {...props}
      maxLength={maxLength}
      value={value}
      rightSection={<CharacterCount length={value.length} max={maxLength} />}
      rightSectionWidth={maxLength >= 100 ? 68 : 56}
      rightSectionPointerEvents="none"
    />
  );
}
