/** The Pothos schema builder: scalar shapes, non-null by default, and the errors plugin. */

import SchemaBuilder from '@pothos/core';
import ErrorsPlugin from '@pothos/plugin-errors';
import type { Context } from './context';

/**
 * The one schema builder. Fields are non-null unless marked `nullable`, and
 * fields that declare `errors` return a result union (see docs/adr/0002-errors-as-result-unions.md).
 */
export const builder = new SchemaBuilder<{
  Context: Context;
  DefaultFieldNullability: false;
  Scalars: {
    Date: { Input: string; Output: string };
    DateTime: { Input: never; Output: Date };
    File: { Input: File; Output: never };
  };
}>({
  plugins: [ErrorsPlugin],
  defaultFieldNullability: false,
  errors: { defaultTypes: [] },
});
