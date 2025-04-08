import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Heading } from '@digdir/designsystemet-react';
import { ComponentIcon } from '@navikt/aksel-icons';
import cl from 'clsx/lite';
import {} from '~/_components/banner/banner';
import { MDXComponents } from '~/_components/mdx-components/mdx-components';
import { formatDateNorwegian } from '~/_utils/date';
import { generateFromMdx } from '~/_utils/generate-from-mdx';
import type { Route } from './+types/page';
import classes from './page.module.css';

export async function loader({ params }: Route.LoaderArgs) {
  const { '*': file } = params;
  const filePath = join(
    process.cwd(),
    'app',
    'content',
    'grunnleggende',
    params.lang,
    `${file}.mdx`,
  );

  console.log(filePath);

  const nbExists = existsSync(
    join(process.cwd(), 'app', 'content', 'grunnleggende', 'nb', `${file}.mdx`),
  );

  const enExists = existsSync(
    join(process.cwd(), 'app', 'content', 'grunnleggende', 'en', `${file}.mdx`),
  );

  if (!existsSync(filePath)) {
    throw new Response('Not Found', {
      status: 404,
      statusText: 'Not Found',
    });
  }

  // Read the file content
  const fileContent = readFileSync(filePath, 'utf-8');

  // Bundle the MDX content
  const result = await generateFromMdx(fileContent);

  return {
    name: params.file,
    code: result.code,
    frontmatter: result.frontmatter,
    currentLang: params.lang,
    availableLanguages: {
      nb: nbExists,
      en: enExists,
    },
  };
}

export const meta = ({ data }: Route.MetaArgs) => {
  return [{ title: `${data.frontmatter.title} - Designsystemet` }];
};

export default function Grunnleggende({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <div className={classes.header}>
        <div className={classes.headerText}>
          <Heading data-size='lg' level={1}>
            {loaderData.frontmatter.title}
          </Heading>
          {loaderData.frontmatter.date && (
            <div className={classes.date}>
              {formatDateNorwegian(loaderData.frontmatter.date)}
            </div>
          )}
        </div>
        <div className={cl(classes.iconContainer)}>
          <ComponentIcon fontSize='4rem' aria-hidden='true' />
        </div>
      </div>
      <div className={classes.content}>
        <MDXComponents code={loaderData.code} />
      </div>
    </>
  );
}
