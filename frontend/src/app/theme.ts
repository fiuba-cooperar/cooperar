import {
  createTheme,
  Input,
  InputWrapper,
  Select,
  Title,
  type CSSVariablesResolver,
  type MantineColorsTuple,
} from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';
import { createElement } from 'react';

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
        input: { height: 48, borderColor: 'var(--color-field-border)' },
      },
    }),
    InputWrapper: InputWrapper.extend({
      // Block labels: inline-block ones sit on the line box and drop 2px below a label that has a hint icon.
      styles: { label: { display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6 } },
    }),
    Title: Title.extend({ styles: { root: { letterSpacing: '-0.02em' } } }),
    TextInput: { defaultProps: { size: 'md' } },
    PasswordInput: { defaultProps: { size: 'md' } },
    // A plain chevron like the mocks, instead of Mantine's up-and-down arrows.
    Select: Select.extend({
      defaultProps: {
        size: 'md',
        rightSection: createElement(IconChevronDown, {
          size: 18,
          stroke: 2.2,
          'aria-hidden': true,
        }),
        rightSectionPointerEvents: 'none',
      },
    }),
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
    '--color-field-border': '#7c8b9a',
    // Field errors in the same AA red as the alerts; Mantine's default red is too light on white.
    '--mantine-color-error': '#a32b2b',
    '--color-success': '#1b6b3a',
    // Sun yellow of the flag, for the main call to action; always paired with dark text.
    '--color-accent': '#f6b40e',
    '--color-accent-text': '#14202e',
    '--color-hero': '#e3f0fa',
    '--color-hero-lead': '#3f4d5b',
    '--color-map': '#d3e4f4',
    '--color-band': '#16324f',
    '--color-band-text': '#d5e3f0',
    // Side menu of the panels, on the navy band.
    '--color-panel-nav-text': '#e6eef6',
    '--color-panel-nav-muted': '#b9cde0',
    '--color-panel-nav-hover': '#21466b',
    '--color-panel-nav-active': '#2f5e8f',
  },
  dark: {
    '--mantine-color-body': '#0f1923',
    '--color-accent': '#f6b40e',
    '--color-accent-text': '#14202e',
    '--color-hero': '#13283b',
    '--color-hero-lead': '#c4cfda',
    '--color-map': '#0e3558',
    '--color-band': '#16324f',
    '--color-band-text': '#d5e3f0',
    // Side menu of the panels, on the navy band.
    '--color-panel-nav-text': '#e6eef6',
    '--color-panel-nav-muted': '#b9cde0',
    '--color-panel-nav-hover': '#21466b',
    '--color-panel-nav-active': '#2f5e8f',
    '--color-danger': '#ff9d94',
    '--color-field-border': '#5e7186',
    '--mantine-color-error': '#ff9d94',
    '--color-success': '#7fd49b',
  },
});
