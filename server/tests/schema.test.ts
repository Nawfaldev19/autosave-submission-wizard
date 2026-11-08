import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { schema } from '../src/graphql/schema';

// Pothos builds the schema with the CommonJS build of graphql, while this file would
// import the ESM build; graphql refuses to mix the two, so use the same build here.
const graphql = createRequire(import.meta.url)('graphql') as typeof import('graphql');
const {
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isObjectType,
  isScalarType,
  isSpecifiedScalarType,
  printSchema,
} = graphql;

/** Lists every schema element without a description, as `Type`, `Type.field`, `Type.field(arg)` or `Enum.VALUE`. */
function undocumented(): string[] {
  const missing: string[] = [];
  const need = (description: string | null | undefined, path: string) => {
    if (!description?.trim()) missing.push(path);
  };
  for (const type of Object.values(schema.getTypeMap())) {
    if (type.name.startsWith('__')) continue;
    if (isScalarType(type) && isSpecifiedScalarType(type)) continue;
    need(type.description, type.name);
    if (isObjectType(type) || isInterfaceType(type)) {
      for (const field of Object.values(type.getFields())) {
        need(field.description, `${type.name}.${field.name}`);
        for (const arg of field.args) need(arg.description, `${type.name}.${field.name}(${arg.name})`);
      }
    } else if (isInputObjectType(type)) {
      for (const field of Object.values(type.getFields()))
        need(field.description, `${type.name}.${field.name}`);
    } else if (isEnumType(type)) {
      for (const value of type.getValues()) need(value.description, `${type.name}.${value.name}`);
    }
  }
  return missing;
}

describe('GraphQL schema documentation', () => {
  it('describes every type, field, argument, enum value and input field', () => {
    expect(undocumented()).toEqual([]);
  });

  it('matches the committed SDL (run `npm run schema:dump --workspace @submission-wizard/server` after changes)', async () => {
    const committed = await readFile(new URL('../schema.graphql', import.meta.url), 'utf8');
    expect(committed).toBe(`${printSchema(schema)}\n`);
  });
});
