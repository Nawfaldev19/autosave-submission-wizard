# Enable the repository's security features

A checklist for the repository owner after the first push to GitHub. These are settings, not files, so they cannot be committed. Names follow GitHub's settings pages as of 2026.

1. **Private vulnerability reporting:** Settings → Security (Advanced Security / Code security) → **Private vulnerability reporting** → Enable. [SECURITY.md](../../SECURITY.md) relies on it.
2. **Dependency graph and Dependabot alerts:** same page → enable **Dependency graph**, **Dependabot alerts** and **Dependabot security updates**. Version updates come from [`.github/dependabot.yml`](../../.github/dependabot.yml).
3. **Secret protection and push protection:** same page → enable **Secret Protection** (secret detection) and **Push protection**, so commits containing credentials are blocked.
4. **Code analysis (CodeQL):** Settings → Code security → **CodeQL analysis** → **Default**; choose the languages `javascript-typescript` and `actions`, and keep the default query suite. This is the repository's SAST control: there is deliberately no CodeQL workflow file, so default setup is the only way it runs.
5. **Branch protection:** Settings → Rules → Rulesets → New branch ruleset for `main`: require a pull request, require status checks to pass (`Lint, types, tests, build and end-to-end`, `Dependency audit and SBOM`, `review`, and the CodeQL results of default setup), block force pushes and deletion.
6. **Actions permissions:** Settings → Actions → General → Workflow permissions → **Read repository contents and packages permissions**; leave "Allow GitHub Actions to create and approve pull requests" off.
7. **Scorecard:** the [`scorecard.yml`](../../.github/workflows/scorecard.yml) workflow publishes results (badge and OpenSSF viewer) after its first run on `main`, and keeps the SARIF as an artifact. It does not upload findings to the repository's code analysis alerts, because that needs a job permission the workflow does not grant.
