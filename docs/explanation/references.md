# References

Specifications, standards, documentation and books the code and docs rely on.

## Standards

- **Diátaxis**, documentation framework. <https://diataxis.fr>
- **arc42**, architecture documentation template. <https://arc42.org>
- **C4 model**, architecture diagrams. <https://c4model.com>
- **MADR 4.0.0**, Markdown Architectural Decision Records. <https://adr.github.io/madr/>
- **Keep a Changelog 1.1.0.** <https://keepachangelog.com/en/1.1.0/>
- **Semantic Versioning 2.0.0.** <https://semver.org/spec/v2.0.0.html>
- **Conventional Commits 1.0.0.** <https://www.conventionalcommits.org/en/v1.0.0/>
- **TSDoc.** <https://tsdoc.org>
- **OWASP Application Security Verification Standard 5.0.0.** <https://owasp.org/www-project-application-security-verification-standard/>
- **STRIDE** threat modelling (Microsoft Threat Modeling Tool documentation). <https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats>
- **OpenSSF Scorecard checks.** <https://github.com/ossf/scorecard/blob/main/docs/checks.md>
- **W3C, WCAG 2.2.** <https://www.w3.org/TR/WCAG22/>
- **W3C, ARIA Authoring Practices Guide** (disclosure and dialog patterns). <https://www.w3.org/WAI/ARIA/apg/>
- **axe-core** accessibility rules engine. <https://github.com/dequelabs/axe-core>

## GraphQL

- **GraphQL specification (October 2021).** <https://spec.graphql.org/October2021/>
- **GraphQL multipart request specification** (jaydenseric/graphql-multipart-request-spec). <https://github.com/jaydenseric/graphql-multipart-request-spec>
- **GraphQL Yoga documentation:** file uploads, plugins, CSRF considerations. <https://the-guild.dev/graphql/yoga-server/docs>
- **Pothos documentation**, including the errors plugin. <https://pothos-graphql.dev/>
- **DataLoader** (graphql/dataloader). <https://github.com/graphql/dataloader>

## Data

- **PostgreSQL documentation, "Constraints"** (check constraints). <https://www.postgresql.org/docs/current/ddl-constraints.html>
- **PostgreSQL documentation, "Explicit Locking"** (`FOR UPDATE`). <https://www.postgresql.org/docs/current/explicit-locking.html>
- **Drizzle ORM documentation.** <https://orm.drizzle.team/docs/overview>
- **Martin Fowler, _Patterns of Enterprise Application Architecture_ (Addison-Wesley, 2002)**: Optimistic Offline Lock, the version-column pattern used for drafts.

## Web

- **React Router documentation:** `useBlocker`, data routers. <https://reactrouter.com/>
- **React Hook Form documentation.** <https://react-hook-form.com/>
- **Zod documentation.** <https://zod.dev/>
- **urql documentation:** document caching, file uploads. <https://nearform.com/open-source/urql/docs/>
- **Vite documentation:** server and preview options. <https://vite.dev/config/>
- **MDN, `Intl.DateTimeFormat.prototype.formatToParts()`.** <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/formatToParts>
- **MDN, Content-Security-Policy.** <https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy>

## Security

- **OWASP Cheat Sheet Series:** File Upload, Cross-Site Request Forgery Prevention, Password Storage, Session Management, HTTP Headers. <https://cheatsheetseries.owasp.org/>
- **RFC 7914, "The scrypt Password-Based Key Derivation Function".** <https://www.rfc-editor.org/rfc/rfc7914>
- **RFC 2104, "HMAC: Keyed-Hashing for Message Authentication".** <https://www.rfc-editor.org/rfc/rfc2104>
- **RFC 8187, "Indicating Character Encoding and Language for HTTP Header Field Parameters"** (`filename*`). <https://www.rfc-editor.org/rfc/rfc8187>
- **Node.js documentation, `crypto.scrypt` and `crypto.timingSafeEqual`.** <https://nodejs.org/api/crypto.html>
- **GitHub Advisory GHSA-vfj7-8cjw-p6xm** (braces). <https://github.com/advisories/GHSA-vfj7-8cjw-p6xm>
