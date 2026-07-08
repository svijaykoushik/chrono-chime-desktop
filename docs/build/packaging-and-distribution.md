# ChronoChime — Packaging & Distribution

ChronoChime targets **Windows and Linux only** (no macOS). Builds are produced
with Electron Forge.

## Two stages: package vs. distributable

| Stage | Command | Output | Purpose |
| --- | --- | --- | --- |
| **Package** | `npm run package` | `out/ChronoChime-<platform>-<arch>/` (a runnable app folder) | Bundles the app + Electron runtime. No installer. |
| **Distributable** | `npm run make` (alias: `npm run dist`) | `out/make/...` | Packages first, then builds platform installers. |

`make`/`dist` always run `package` internally, so you do not need to run
`package` first — it is the standalone build for quick local runs of the
unpacked app.

## Makers (configured in `forge.config.js`)

| Platform | Maker | Artifact | Build-host requirements |
| --- | --- | --- | --- |
| Windows | `@electron-forge/maker-squirrel` | `*.exe` (Setup) + `*.nupkg` | Build on **Windows**, or on Linux with **mono + wine** installed. |
| Linux | `@electron-forge/maker-deb` | `chronochime_<version>_<arch>.deb` | `dpkg` and `fakeroot` on the build host. |

`electron-forge make` builds for the **current host platform** by default. To
target a specific platform/arch explicitly:

```bash
npm run make -- --platform=linux --arch=x64    # → .deb
npm run make -- --platform=win32 --arch=x64    # → Squirrel .exe (needs Windows or mono+wine)
```

Cross-compiling the Windows installer from Linux is possible but requires
`mono` + `wine`; the reliable path for Windows artifacts is a Windows build host
(e.g. a Windows CI runner).

## Output locations

```
out/
  ChronoChime-linux-x64/          # packaged app (from `package`)
    chronochime                   # the executable (lowercase: executableName)
  make/
    deb/x64/chronochime_2.0.0_amd64.deb
    squirrel.windows/x64/*.exe    # when built on Windows
```

## Native module note

`better-sqlite3` is a native module and must match the Electron ABI in shipped
builds. The `prepackage` / `premake` npm scripts run `electron-rebuild` before
packaging, and Forge's packaging step unpacks `better_sqlite3.node` from the
asar (`@electron-forge/plugin-auto-unpack-natives`). See
[`technical-design-document.md`](../design/technical-design-document.md) and the
project memory on Forge+Vite native packaging.

## Versioning & releases

ChronoChime follows [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`.

- **Source of truth:** `package.json` `version`. The makers name artifacts from it
  (e.g. `chronochime_<version>_amd64.deb`).
- **Tags drive releases:** the release workflow triggers on tags matching `v*`
  and uses the tag verbatim as the release name. **The tag must equal
  `v<package.json version>`** — bump `package.json` first, then tag.
  Example: set `version` to `1.0.0`, then `git tag v1.0.0 && git push origin v1.0.0`.

### History & the 1.0.0 decision

The only prior release was the pre-release `v1.0.0-beta.1.0`. In SemVer a
pre-release sorts *before* its target, so **no stable `1.0.0` ever shipped** — the
beta was a preview of it. The v2 rewrite therefore ships as the first stable
release **`v1.0.0`** (not `v2.0.0`): a desktop app has no public API to break, and
with no migration path and effectively no installed user base there is no reason
to skip the `1.0.0` number. Reserve `2.0.0` for a future change that breaks
compatibility *after* a stable `1.0.0` is out.

### Bumping going forward

- **PATCH** (`1.0.x`) — bug fixes, no behavior change for users.
- **MINOR** (`1.x.0`) — new backward-compatible features.
- **MAJOR** (`x.0.0`) — changes that break existing installs (e.g. a data-format
  change with no migration). Note significant breaking changes in the release.

## Install / run the artifacts

- **Linux (.deb):** `sudo dpkg -i out/make/deb/x64/chronochime_2.0.0_amd64.deb`
  (or `sudo apt install ./<file>.deb` to pull dependencies). Launch from the app
  menu or run `chronochime`.
- **Windows (.exe):** run the generated Setup `.exe`; Squirrel installs per-user
  and creates Start Menu / desktop shortcuts.

## Release Failure Runbook

If a GitHub Actions release workflow run fails after pushing a semver version tag (e.g. `v1.0.0-rc.1`), follow this runbook to resolve the failure and re-release on the same tag.

### 1. Identify the Cause
Check the failing step in the GitHub Actions runner console:
- **Windows Squirrel Maker Failures:** Typically caused by missing package metadata required by NuGet (e.g., `Authors is required`). Ensure `author` is defined in `package.json` and `authors` is passed to the `MakerSquirrel` config in `forge.config.js`.
- **Dependency/Build Issues:** Errors due to native module rebuilds, mismatching Node/Electron ABIs, or syntax compilation failures.

### 2. Clean Up and Reset the Release Tag
Because GitHub Actions release workflows trigger specifically on new tag pushes, pushing updates to the branch will not automatically re-run the workflow for that tag. You must move the tag to point to the commit containing the fix.

Follow these steps:

1. **Delete the tag locally:**
   ```bash
   git tag -d <tag_name>
   ```
   *Example:* `git tag -d v1.0.0-rc.1`

2. **Delete the tag remotely on GitHub:**
   ```bash
   git push origin --delete <tag_name>
   ```
   *Example:* `git push origin --delete v1.0.0-rc.1`

3. **Apply the fix and commit:**
   Implement the necessary code or config fixes, then commit and push to the release branch (e.g., `main`):
   ```bash
   git add .
   git commit -m "chore: fix release build issue [details]"
   git push origin main
   ```

4. **Re-create the tag on the new commit:**
   Make sure your local branch is up-to-date, then tag the new commit:
   ```bash
   git tag <tag_name>
   ```
   *Example:* `git tag v1.0.0-rc.1`

5. **Push the tag to trigger the workflow again:**
   ```bash
   git push origin <tag_name>
   ```
   *Example:* `git push origin v1.0.0-rc.1`
