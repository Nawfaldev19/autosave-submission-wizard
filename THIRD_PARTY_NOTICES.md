# Third-party notices

Submission Wizard's own code is MIT-licensed (see `LICENSE`). Versions are from `package-lock.json` at the time of writing.

## Runtime (server and browser)

| Package                                                                                                          | Version       | Licence                              | Used by                    |
| ---------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------ | -------------------------- |
| graphql                                                                                                          | 16.14.2       | MIT                                  | server (and the web tests) |
| graphql-yoga                                                                                                     | 5.24.6        | MIT                                  | server                     |
| @pothos/core, @pothos/plugin-errors                                                                              | 4.15.1, 4.9.3 | ISC                                  | server                     |
| drizzle-orm                                                                                                      | 0.45.4        | Apache-2.0                           | server                     |
| pg                                                                                                               | 8.23.1        | MIT                                  | server                     |
| dataloader                                                                                                       | 2.2.3         | MIT                                  | server                     |
| zod                                                                                                              | 4.6.7         | MIT                                  | shared, server             |
| react, react-dom                                                                                                 | 19.3.1        | MIT                                  | web                        |
| react-router                                                                                                     | 7.18.4        | MIT                                  | web                        |
| urql, @urql/core                                                                                                 | 5.0.4, 6.0.3  | MIT                                  | web                        |
| react-hook-form                                                                                                  | 7.90.0        | MIT                                  | web                        |
| @hookform/resolvers                                                                                              | 5.9.1         | MIT                                  | web                        |
| lucide-react                                                                                                     | 1.58.0        | ISC                                  | web                        |
| @fontsource-variable/bricolage-grotesque, @fontsource/atkinson-hyperlegible, @fontsource-variable/jetbrains-mono | 5.3.0         | SIL OFL 1.1 (fonts), MIT (packaging) | web                        |

## Development only

| Package                                                                                                | Version      | Licence      |
| ------------------------------------------------------------------------------------------------------ | ------------ | ------------ |
| typescript                                                                                             | 6.0.3        | Apache-2.0   |
| tsx                                                                                                    | 4.23.15      | MIT          |
| vite, @vitejs/plugin-react                                                                             | 8.3.4, 6.1.2 | MIT          |
| vitest, @vitest/browser, @vitest/browser-playwright, @vitest/coverage-v8                               | 5.0.5        | MIT          |
| vitest-browser-react                                                                                   | 2.3.0        | MIT          |
| wonka                                                                                                  | 6.3.6        | MIT          |
| playwright, @playwright/test                                                                           | 1.64.1       | Apache-2.0   |
| @graphql-codegen/cli, @graphql-codegen/client-preset                                                   | 7.4.6, 6.2.3 | MIT          |
| eslint, @eslint/js, typescript-eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals | 10.x / 8.x   | MIT          |
| prettier                                                                                               | 3.9.10       | MIT          |
| eslint-plugin-jsdoc                                                                                    | 65.0.2       | BSD-3-Clause |
| @types/node, @types/pg, @types/react, @types/react-dom                                                 | —            | MIT          |

### Transitive development packages with other licences

None of these ship to browsers or run in the server at runtime.

| Package                          | Licence                                                                         | Pulled in by                                    |
| -------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------- |
| lightningcss (+ platform binary) | MPL-2.0 (file-level copyleft; applies only to modified copies of its own files) | vite                                            |
| caniuse-lite                     | CC-BY-4.0                                                                       | browserslist                                    |
| minimatch                        | BlueOak-1.0.0 (permissive)                                                      | eslint and others                               |
| spdx-exceptions                  | CC-BY-3.0 (a data list of licence exception identifiers)                        | eslint-plugin-jsdoc (via spdx-expression-parse) |
| spdx-license-ids                 | CC0-1.0 (a data list of licence identifiers)                                    | eslint-plugin-jsdoc (via spdx-expression-parse) |

## Fonts and icons

- Bricolage Grotesque, Atkinson Hyperlegible and JetBrains Mono are under the SIL Open Font License 1.1 (<https://openfontlicense.org>). They are self-hosted.
- Lucide icons are under the ISC licence (<https://lucide.dev/license>). The Submission Wizard mark is original SVG.
