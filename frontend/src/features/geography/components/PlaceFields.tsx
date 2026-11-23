import { Autocomplete, type AutocompleteProps } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import type { Province } from '@/api/generated/model';
import { useDistrictNames, useLocalities, useStreetNames } from '../api/useGeography';
import { accentInsensitiveFilter, placeKey, streetName } from '../placeNames';

/** How many suggestions are shown at once: a province can have hundreds of localities. */
const SUGGESTION_LIMIT = 50;

type FieldProps = Omit<AutocompleteProps, 'data' | 'value' | 'onChange' | 'filter'> & {
  province: Province | null;
  value: string;
  onChange: (value: string) => void;
};

/**
 * The departamento, partido or comuna, suggested from the official list of the province. Anything can still be
 * typed: the list may lack a place, or not load at all.
 */
export function DistrictInput({ province, value, onChange, ...props }: FieldProps) {
  const { data = [] } = useDistrictNames(province);
  return (
    <Autocomplete
      {...props}
      autoComplete="off"
      data={data}
      limit={SUGGESTION_LIMIT}
      filter={accentInsensitiveFilter}
      value={value}
      onChange={onChange}
    />
  );
}

/**
 * The locality or neighborhood, suggested from those of the district (or of the province, while there is no
 * district). Picking one of a single district fills the district when it is empty.
 */
export function LocalityInput({
  province,
  district,
  onDistrictFound,
  value,
  onChange,
  ...props
}: FieldProps & { district: string; onDistrictFound: (district: string) => void }) {
  const { data: localities = [] } = useLocalities(province);
  const wanted = placeKey(district);
  const ofDistrict = wanted
    ? localities.filter((locality) => placeKey(locality.district) === wanted)
    : localities;
  // A district typed by hand that is not on the list should not hide every suggestion.
  const candidates = ofDistrict.length > 0 ? ofDistrict : localities;
  const names = [...new Set(candidates.map(({ name }) => name))];
  return (
    <Autocomplete
      {...props}
      autoComplete="off"
      data={names}
      limit={SUGGESTION_LIMIT}
      filter={accentInsensitiveFilter}
      value={value}
      onChange={onChange}
      onOptionSubmit={(name) => {
        if (district.trim()) return;
        const districts = new Set(
          localities
            .filter((locality) => locality.name === name)
            .map((locality) => locality.district),
        );
        const [only] = districts;
        if (districts.size === 1 && only) onDistrictFound(only);
      }}
    />
  );
}

/**
 * The street and number, with the streets of the district that match what was typed. The number is typed after
 * picking the street.
 */
export function StreetInput({
  province,
  district,
  value,
  onChange,
  ...props
}: FieldProps & { district: string }) {
  const [typed] = useDebouncedValue(streetName(value), 300);
  const { data = [] } = useStreetNames(province, district, typed);
  // Once there is a number the street was chosen: suggesting it again would only get in the way.
  const suggestions = streetName(value) === value.trim() ? data : [];
  return (
    <Autocomplete
      {...props}
      autoComplete="off"
      data={suggestions}
      // The backend already matched them, accents and abbreviations included.
      filter={({ options }) => options}
      value={value}
      onChange={onChange}
    />
  );
}
