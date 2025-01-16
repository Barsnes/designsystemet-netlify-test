'use client';
import { useState } from 'react';

import {
  type ColorInfo,
  type ColorNumber,
  type CssColor,
  generateColorSchemes,
  getColorNameFromNumber,
} from '@digdir/designsystemet';
import { ToggleGroup } from '@digdir/designsystemet-react';
import { OverviewComponents } from '../OverviewComponents/OverviewComponents';
import classes from './Previews.module.css';

const themes: {
  [key: string]: {
    name: string;
    value: string;
    hex: CssColor;
    cssVars?: Record<string, string>;
  };
} = {
  blue: {
    name: 'Eksempel 1',
    value: 'blue',
    hex: '#0062BA',
  },
  purple: {
    name: 'Eksempel 2',
    value: 'purple',
    hex: '#740c7e',
    cssVars: {
      '--ds-border-radius-base': '9999px',
      '--ds-border-radius-scale': '0.25rem',
      '--ds-border-radius-sm':
        'min(var(--ds-border-radius-base) * 0.5, var(--ds-border-radius-scale))',
      '--ds-border-radius-md':
        'min(var(--ds-border-radius-base), var(--ds-border-radius-scale) * 2)',
      '--ds-border-radius-lg':
        'min(var(--ds-border-radius-base) * 2, var(--ds-border-radius-scale) * 5)',
      '--ds-border-radius-xl':
        'min(var(--ds-border-radius-base) * 3, var(--ds-border-radius-scale) * 7)',
      '--ds-border-radius-default': 'var(--ds-border-radius-base)',
      '--ds-border-radius-full': '624.9375rem',
    },
  },
};

export const Previews = () => {
  const [theme, setTheme] = useState<keyof typeof themes>('blue');
  const [appearance, setAppearance] = useState<'light' | 'dark'>('light');

  const getDsMainVars = (colors: {
    light: ColorInfo[];
    dark: ColorInfo[];
  }) => {
    const style = {} as Record<string, string>;

    let lightColors = colors.light;

    if (appearance === 'dark') {
      lightColors = colors.dark;
    }

    for (let i = 0; i < lightColors.length; i++) {
      const number = (i + 1) as ColorNumber;
      style[
        `--ds-color-${getColorNameFromNumber(number)
          .replace(/\s+/g, '-')
          .toLowerCase()}`
      ] = lightColors[i].hex;
    }

    return style;
  };

  const getThemeVariables = (hex: CssColor) => {
    const generatedTheme = generateColorSchemes(hex);
    const vars = {} as Record<string, string>;

    Object.assign(vars, getDsMainVars(generatedTheme));

    return vars;
  };

  return (
    <>
      <div className={classes.toolbar} data-size='sm'>
        <ToggleGroup
          value={theme as string}
          onChange={(v) => setTheme(v as keyof typeof themes)}
        >
          <ToggleGroup.Item value='blue'>{themes.blue.name}</ToggleGroup.Item>
          <ToggleGroup.Item value='purple'>
            {themes.purple.name}
          </ToggleGroup.Item>
        </ToggleGroup>
        <ToggleGroup
          value={appearance}
          onChange={(v) => setAppearance(v as 'light' | 'dark')}
        >
          <ToggleGroup.Item value='light'>Lys</ToggleGroup.Item>
          <ToggleGroup.Item value='dark'>Mørk</ToggleGroup.Item>
        </ToggleGroup>
      </div>

      <div
        className={classes.preview}
        data-color-scheme={appearance}
        style={{
          ...getThemeVariables(themes[theme].hex),
          ...themes[theme].cssVars,
        }}
      >
        <OverviewComponents />
      </div>
    </>
  );
};
