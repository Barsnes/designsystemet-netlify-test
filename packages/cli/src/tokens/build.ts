import path from 'node:path';
import type { ThemeObject } from '@tokens-studio/types';
import chalk from 'chalk';
import type { DesignToken } from 'style-dictionary/types';
import { cleanDir, mkdir, readFile, writeFile } from '../utils.js';
import { createThemeCSSFiles } from './format.js';
import { type BuildOptions, processPlatform } from './process/platform.js';
import type { OutputFile } from './types.js';

async function write(files: OutputFile[], outDir: string, dry?: boolean) {
  for (const { destination, output } of files) {
    if (destination) {
      const filePath = path.join(outDir, destination);
      const fileDir = path.dirname(filePath);
      await mkdir(fileDir, dry);
      await writeFile(filePath, output, dry);
    }
  }
}

export const buildTokens = async (options: Omit<BuildOptions, 'process' | '$themes'>) => {
  const $themes = JSON.parse(await readFile(path.resolve(`${options.tokensDir}/$themes.json`))) as ThemeObject[];

  const resolvedOutDir = path.resolve(options.outDir);
  const processedBuilds = await processPlatform<DesignToken>({
    ...options,
    outDir: resolvedOutDir,
    tokensDir: path.resolve(options.tokensDir),
    process: 'build',
    $themes,
  });

  if (options.clean) {
    await cleanDir(resolvedOutDir, options.dry);
  }

  console.log(`\nWriting build to ${chalk.green(options.outDir)}`);

  // https://github.com/digdir/designsystemet/issues/3434
  // Disabled for now so that we can re-enable it later if needed (under a feature flag)
  // for (const [_, buildResults] of Object.entries(processedBuilds)) {
  //   for (const { formatted } of buildResults) {
  //     await write(formatted, resolvedOutDir, options.dry);
  //   }
  // }

  // Write types (colors.d.ts) to the output directory
  for (const { formatted } of processedBuilds.types) {
    await write(formatted, resolvedOutDir, options.dry);
  }

  // Write theme CSS files (<theme>.css) to the output directory
  await write(createThemeCSSFiles(processedBuilds), resolvedOutDir, options.dry);

  console.log(`\n✅ Finished building tokens!`);
  return processedBuilds;
};
