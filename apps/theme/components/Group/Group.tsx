import { RovingFocusItem } from '@digdir/designsystemet-react';
import {
  type Color,
  type ColorNumber,
  type ThemeInfo,
  getColorMetadataByNumber,
} from '@digdir/designsystemet/color';
import cl from 'clsx/lite';

import { Color as ColorPreview } from '../Color/Color';

import { ColorModal } from '@repo/components';
import { Fragment, createRef, useRef } from 'react';
import { useThemeStore } from '../../store';
import classes from './Group.module.css';

type GroupProps = {
  header: string;
  colorNumbers: ColorNumber[];
  colorScale: ThemeInfo;
  showColorMeta?: boolean;
  names?: string[];
  namespace: string;
};

export const Group = ({
  header,
  colorNumbers,
  showColorMeta,
  names,
  colorScale,
  namespace,
}: GroupProps) => {
  const colorScheme = useThemeStore((state) => state.colorScheme);

  const colorModalRefs = useRef<React.RefObject<HTMLDialogElement | null>[]>(
    [],
  );
  if (colorModalRefs.current.length !== colorNumbers.length) {
    colorModalRefs.current = Array(colorNumbers.length)
      .fill(null)
      .map(() => createRef<HTMLDialogElement>());
  }

  return (
    <div className={classes.group}>
      {header && <div className={cl(classes.header)}>{header}</div>}
      {header && names && (
        <div className={classes.names}>
          {names.map((name, index) => (
            <div key={index + 'name' + namespace}>{name}</div>
          ))}
        </div>
      )}

      <div className={cl(classes.colors)}>
        {colorNumbers.map((colorNumber, index) => {
          const { number, hex } = colorScale[colorScheme][colorNumber - 1];
          const color: Color = {
            ...getColorMetadataByNumber(number),
            number,
            hex,
          };
          return (
            <Fragment key={index + 'fragment' + namespace}>
              <ColorModal
                colorModalRef={colorModalRefs.current[index]}
                namespace={namespace}
                color={color}
              />
              <RovingFocusItem value={namespace + number} asChild>
                <ColorPreview
                  color={hex}
                  colorNumber={colorNumber}
                  contrast={'dd'}
                  lightness={'dd'}
                  showColorMeta={showColorMeta}
                  aria-label={`Se mer om ${namespace} ${color?.displayName}`}
                  onClick={() =>
                    colorModalRefs.current[index]?.current?.showModal()
                  }
                />
              </RovingFocusItem>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
};
