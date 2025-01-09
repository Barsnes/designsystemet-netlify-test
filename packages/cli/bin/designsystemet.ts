#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { Argument, createCommand, program } from '@commander-js/extra-typings';
import chalk from 'chalk';
import * as R from 'ramda';
import { fromError } from 'zod-validation-error';

import { convertToHex } from '../src/colors/index.js';
import type { CssColor } from '../src/colors/types.js';
import migrations from '../src/migrations/index.js';
import { buildTokens } from '../src/tokens/build.js';
import { colorCliOptions, createTokens } from '../src/tokens/create.js';
import { writeTokens } from '../src/tokens/write.js';
import { type CombinedConfigSchema, combinedConfigSchema, configFileSchema } from './config.js';
import { type OptionGetter, getDefaultOrExplicitOption, getExplicitOptionOnly } from './options.js';

program.name('designsystemet').description('CLI for working with Designsystemet').showHelpAfterError();

function makeTokenCommands() {
  const tokenCmd = createCommand('tokens');
  const DEFAULT_TOKENS_DIR = './design-tokens';
  const DEFAULT_BUILD_DIR = './design-tokens-build';
  const DEFAULT_FONT = 'Inter';
  const DEFAULT_THEME_NAME = 'theme';
  const DEFAULT_CONFIG_FILE = 'designsystemet.config.json';

  tokenCmd
    .command('build')
    .description('Build Designsystemet tokens')
    .option('-t, --tokens <string>', `Path to ${chalk.blue('design-tokens')}`, DEFAULT_TOKENS_DIR)
    .option('-o, --out-dir <string>', `Output directory for built ${chalk.blue('design-tokens')}`, DEFAULT_BUILD_DIR)
    .option('--dry [boolean]', `Dry run for built ${chalk.blue('design-tokens')}`, false)
    .option('-p, --preview', 'Generate preview token.ts files', false)
    .option('--verbose', 'Enable verbose output', false)
    .action((opts) => {
      const { preview, verbose } = opts;
      const tokens = typeof opts.tokens === 'string' ? opts.tokens : DEFAULT_TOKENS_DIR;
      const outDir = typeof opts.outDir === 'string' ? opts.outDir : './dist/tokens';
      const dry = Boolean(opts.dry);

      console.log(`Building tokens in ${chalk.green(tokens)}`);

      if (dry) {
        console.log(`Performing dry run, no files will be written`);
      }

      return buildTokens({ tokens, outDir, preview, verbose, dry });
    });

  tokenCmd
    .command('create')
    .description('Create Designsystemet tokens')
    .option(`-m, --${colorCliOptions.main} <name:hex...>`, `Main colors`, parseColorValues)
    .option(`-s, --${colorCliOptions.support} <name:hex...>`, `Support colors`, parseColorValues)
    .option(`-n, --${colorCliOptions.neutral} <hex>`, `Neutral hex color`, convertToHex)
    .option('-o, --out-dir <string>', `Output directory for created ${chalk.blue('design-tokens')}`, DEFAULT_TOKENS_DIR)
    .option('--dry [boolean]', `Dry run for created ${chalk.blue('design-tokens')}`, false)
    .option('-f, --font-family <string>', `Font family`, DEFAULT_FONT)
    .option(
      '-b, --border-radius <number>',
      `Unitless base border-radius in px`,
      (radiusAsString) => Number(radiusAsString),
      4,
    )
    .option('--theme <string>', 'Theme name (ignored when using JSON config file)', DEFAULT_THEME_NAME)
    .option('--json <string>', `Path to JSON config file (default: "${DEFAULT_CONFIG_FILE}")`, (value) =>
      parseJsonConfig(value, { allowFileNotFound: false }),
    )
    .action(async (opts, cmd) => {
      const dry = Boolean(opts.dry);

      if (dry) {
        console.log(`Performing dry run, no files will be written`);
      }

      /*
       * Get json config file by looking for the optional default file, or using --json option if supplied.
       * The file must exist if specified through --json, but is not required otherwise.
       */
      const configFile = await (opts.json
        ? opts.json
        : parseJsonConfig(DEFAULT_CONFIG_FILE, { allowFileNotFound: true }));
      const propsFromJson = configFile?.config;

      if (propsFromJson) {
        /*
         * Check that we're not creating multiple themes with different color names.
         * For the themes' modes to work in Figma and when building css, the color names must be consistent
         */
        const themeColors = Object.values(propsFromJson?.themes ?? {}).map(
          (x) => new Set([...R.keys(x.colors.main), ...R.keys(x.colors.support)]),
        );
        if (!R.all(R.equals(R.__, themeColors[0]), themeColors)) {
          console.error(
            chalk.redBright(
              `In JSON config ${configFile.path}, all themes must have the same custom color names, but we found:`,
            ),
          );
          const themeNames = R.keys(propsFromJson.themes ?? {});
          themeColors.forEach((colors, index) => {
            const colorNames = Array.from(colors);
            console.log(`  - ${themeNames[index]}: ${colorNames.join(', ')}`);
          });
          console.log();
          process.exit(1);
        }
      }

      /*
       * Create final config from JSON config file and command-line options
       */
      const noUndefined = R.reject(R.isNil);

      const getThemeOptions = (optionGetter: OptionGetter) =>
        noUndefined({
          colors: noUndefined({
            main: optionGetter(cmd, 'mainColors'),
            support: optionGetter(cmd, 'supportColors'),
            neutral: optionGetter(cmd, 'neutralColor'),
          }),
          typography: noUndefined({
            fontFamily: optionGetter(cmd, 'fontFamily'),
          }),
          borderRadius: optionGetter(cmd, 'borderRadius'),
        });

      const unvalidatedConfig = noUndefined({
        outDir: propsFromJson?.outDir ?? getDefaultOrExplicitOption(cmd, 'outDir'),
        themes: propsFromJson?.themes
          ? // For each theme specified in the JSON config, we override the config values
            // with the explicitly set options from the CLI.
            R.map((theme) => R.mergeDeepRight(theme, getThemeOptions(getExplicitOptionOnly)), propsFromJson.themes)
          : // If there are no themes specified in the JSON config, we use both explicit
            // and default theme options from the CLI.
            {
              [opts.theme]: getThemeOptions(getDefaultOrExplicitOption),
            },
      });

      /*
       * Check that the config is valid
       */
      let config: CombinedConfigSchema;
      try {
        config = combinedConfigSchema.parse(unvalidatedConfig);
      } catch (err) {
        console.error(chalk.redBright('Invalid config after combining defaults, json config and options'));
        const validationError = makeFriendlyError(err);
        console.error(validationError.toString());
        process.exit(1);
      }

      console.log(`Creating tokens with configuration ${chalk.green(JSON.stringify(config, null, 2))}`);

      /*
       * Create and write tokens for each theme
       */
      for (const [name, themeWithoutName] of Object.entries(config.themes)) {
        const theme = { name, ...themeWithoutName };
        const tokens = createTokens(theme);
        await writeTokens({ outDir: config.outDir, tokens, theme, dry });
      }
    });

  return tokenCmd;
}

program.addCommand(makeTokenCommands());

program
  .command('migrate')
  .description('run a Designsystemet migration')
  .addArgument(new Argument('[migration]', 'Available migrations').choices(Object.keys(migrations)))
  .option('-l --list', 'List available migrations')
  .option('-g --glob <glob>', 'Glob for files upon which to apply the migration', './**/*.(tsx|css)')
  .action((migrationKey, opts) => {
    const { glob, list } = opts;

    if (list) {
      for (const key of Object.keys(migrations)) {
        console.log(key);
      }
    } else if (migrationKey) {
      const migration = migrations[migrationKey as keyof typeof migrations];
      if (!migration) {
        console.error('Migration not found!');
        throw 'Aborting';
      }

      console.log(`Applying migration ${chalk.blue(migrationKey)} with glob: ${chalk.green(glob)}`);
      migration?.(glob)
        .then(() => console.log(`Migration ${chalk.blue(migrationKey)} finished`))
        .catch((error) => console.log(error));
    } else {
      console.log('Migrate: please specify a migration name or --list');
    }
  });

await program.parseAsync(process.argv);

async function parseJsonConfig(
  jsonPath: string,
  options: {
    allowFileNotFound: boolean;
  },
) {
  const resolvedPath = path.resolve(process.cwd(), jsonPath);

  let jsonFile: string;
  try {
    jsonFile = await fs.readFile(resolvedPath, { encoding: 'utf-8' });
  } catch (err) {
    if (err instanceof Error) {
      const nodeErr = err as NodeJS.ErrnoException;
      if (nodeErr.code === 'ENOENT' && options.allowFileNotFound) {
        // Suppress error when the file isn't found, instead the promise returns undefined.
        return;
      }
    }
    throw err;
  }
  try {
    return {
      path: jsonPath,
      config: await configFileSchema.parseAsync(JSON.parse(jsonFile)),
    };
  } catch (err) {
    console.error(chalk.redBright(`Invalid json config in ${jsonPath}`));
    const validationError = makeFriendlyError(err);
    console.error(validationError.toString());
    process.exit(1);
  }
}

function makeFriendlyError(err: unknown) {
  return fromError(err, {
    messageBuilder: (issues) =>
      issues
        .map((issue) => {
          const issuePath = issue.path.join('.');
          return `  - ${chalk.red(issuePath)}: ${issue.message} (${chalk.dim(issue.code)})`;
        })
        .join('\n'),
  });
}

function parseColorValues(value: string, previous: Record<string, CssColor> = {}): Record<string, CssColor> {
  const [name, hex] = value.split(':');
  previous[name] = convertToHex(hex);
  return previous;
}
