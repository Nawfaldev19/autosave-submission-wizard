import type { CodegenConfig } from '@graphql-codegen/cli';

// Types come from the server's committed SDL; regenerate with `npm run codegen`.
const config: CodegenConfig = {
  schema: '../server/schema.graphql',
  documents: ['src/api/**/*.ts'],
  generates: {
    'src/gql/': {
      preset: 'client',
      presetConfig: { fragmentMasking: false },
      config: {
        enumsAsTypes: true,
        useTypeImports: true,
        strictScalars: true,
        scalars: { Date: 'string', DateTime: 'string', File: 'File' },
      },
    },
  },
};

export default config;
