/** `npm run schema:dump`: writes the SDL the web client is generated from (server/schema.graphql). */

import { writeFile } from 'node:fs/promises';
import { printSchema } from 'graphql';
import { schema } from './schema';

await writeFile(new URL('../../schema.graphql', import.meta.url), `${printSchema(schema)}\n`);
