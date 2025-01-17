import {
  Button,
  Heading,
  Paragraph,
  Textfield,
  Tooltip,
} from '@digdir/designsystemet-react';
import { ChevronLeftIcon, TrashIcon } from '@navikt/aksel-icons';
import { ColorPicker, type IColor } from 'react-color-palette';
import { useThemeStore } from '../../../store';

import cl from 'clsx/lite';
import classes from './ColorPane.module.css';

type ColorPaneProps = {
  onClose: () => void;
  onPrimaryClicked: (color: string, name: string) => void;
  show?: boolean;
  type: 'addColor' | 'editColor' | 'none';
  color: IColor;
  setColor: (color: IColor) => void;
  name: string;
  setName: (name: string) => void;
  onRemove: () => void;
  colorType: 'main' | 'neutral' | 'support';
};

export const ColorPane = ({
  onClose,
  onPrimaryClicked,
  show = false,
  type,
  color,
  setColor,
  name,
  setName,
  onRemove,
  colorType,
}: ColorPaneProps) => {
  const mainColors = useThemeStore((state) => state.colors.main);
  const disableRemoveButton = colorType === 'main' && mainColors.length === 1;

  const getHeading = () => {
    const t = colorType === 'main' ? 'hovedfarge' : 'støttefarge';
    return type === 'addColor' ? 'Legg til ' + t : 'Rediger farge';
  };

  return (
    <div
      className={cl(classes.colorPage, type.includes('Color') && classes.show)}
    >
      <div className={classes.topBtnGroup}>
        <Button
          data-size='sm'
          variant='tertiary'
          onClick={() => onClose()}
          className={classes.back}
        >
          <ChevronLeftIcon title='a11y-title' fontSize='1.5rem' /> Gå tilbake
        </Button>
        <Tooltip
          content='Du må ha minst en hovedfarge'
          hidden={!disableRemoveButton}
        >
          <Button
            data-size='sm'
            variant='tertiary'
            data-color='danger'
            onClick={() => {
              if (disableRemoveButton) return;
              onRemove();
            }}
            className={cl(classes.removeBtn)}
            hidden={type !== 'editColor' || colorType === 'neutral'}
            aria-disabled={disableRemoveButton || undefined}
          >
            Fjern farge
            <TrashIcon title='søppelkasse' fontSize='1.5rem' />
          </Button>
        </Tooltip>
      </div>
      <Heading data-size='xs' className={classes.title}>
        {getHeading()}
      </Heading>
      {colorType === 'neutral' && (
        <Paragraph data-size='sm' className={classes.desc}>
          Neutral fargen kan ikke fjernes eller endres navn på.
        </Paragraph>
      )}
      {colorType !== 'neutral' && (
        <Textfield
          placeholder='Skriv navnet her...'
          label='Navn'
          description='Kun bokstaver, tall og bindestrek'
          className={classes.name}
          data-size='sm'
          value={name}
          onChange={(e) => {
            const value = e.currentTarget.value
              .replace(/\s+/g, '-')
              .replace(/[^A-Z0-9-]+/gi, '')
              .toLowerCase();
            setName(value);
          }}
        />
      )}
      <div className={classes.label}>Farge</div>
      <div className={classes.colorPreviewContainer}>
        <div
          style={{ backgroundColor: color.hex }}
          className={classes.colorPreview}
        ></div>
      </div>
      <ColorPicker
        hideAlpha
        color={color}
        onChange={setColor}
        hideInput={['rgb', 'hsv']}
      />
      <div className={classes.btnGroup}>
        <Button
          data-size='sm'
          color='neutral'
          onClick={() => {
            onPrimaryClicked(color.hex, name);
          }}
        >
          {type === 'addColor' ? 'Legg til' : 'Lagre'}
        </Button>

        <Button
          data-size='sm'
          color='neutral'
          variant='secondary'
          onClick={() => {
            onClose();
          }}
        >
          Avbryt
        </Button>
      </div>
    </div>
  );
};
