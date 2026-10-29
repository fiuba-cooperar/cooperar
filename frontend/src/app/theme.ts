import {
  createTheme,
  Input,
  InputWrapper,
  Title,
  type CSSVariablesResolver,
  type MantineColorsTuple,
} from '@mantine/core';

// Shades taken from the mocks: index 6 is the primary blue, 4 the light sky blue of the header strip.
const brand: MantineColorsTuple = [
  '#eaf3fb',
  '#dceaf7',
  '#bbd6ef',
  '#94bee5',
  '#74acdf',
  '#3f83bd',
  '#1b5e9b',
  '#174e82',
  '#134777',
  '#0e3558',
];

export const theme = createTheme({
  primaryColor: 'brand',
  colors: { brand },
  // Light text on the dark primary in light mode, dark text on the sky blue in dark mode.
  primaryShade: { light: 6, dark: 4 },
  autoContrast: true,
  defaultRadius: 'md',
  fontFamily: "'Inter Variable', system-ui, 'Segoe UI', Roboto, sans-serif",
  headings: { fontFamily: "'Inter Variable', system-ui, 'Segoe UI', Roboto, sans-serif" },
  components: {
    // 44px minimum touch targets, as in the mocks.
    Button: { defaultProps: { size: 'md' } },
    // Cards are white on the pale page background, as in the mocks.
    Paper: { defaultProps: { bg: 'var(--mantine-color-default)' } },
    // 48px fields with a border dark enough to meet the 3:1 contrast of WCAG 1.4.11.
    Input: Input.extend({
      styles: {
        input: { height: 48, borderColor: 'light-dark(#7c8b9a, #5e7186)' },
      },
    }),
    InputWrapper: InputWrapper.extend({
      styles: { label: { fontSize: 14, fontWeight: 600, marginBottom: 6 } },
    }),
    Title: Title.extend({ styles: { root: { letterSpacing: '-0.02em' } } }),
    TextInput: { defaultProps: { size: 'md' } },
    PasswordInput: { defaultProps: { size: 'md' } },
  },
});

// Page background and status colors per color scheme; components read them as CSS variables.
export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {
    '--mantine-color-body': '#f4f8fc',
    '--mantine-color-text': '#14202e',
    '--mantine-color-dimmed': '#51606f',
    '--color-danger': '#a32b2b',
    '--color-success': '#1b6b3a',
  },
  dark: {
    '--mantine-color-body': '#0f1923',
    '--color-danger': '#ff9d94',
    '--color-success': '#7fd49b',
  },
});
