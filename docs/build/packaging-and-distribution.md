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

## Install / run the artifacts

- **Linux (.deb):** `sudo dpkg -i out/make/deb/x64/chronochime_2.0.0_amd64.deb`
  (or `sudo apt install ./<file>.deb` to pull dependencies). Launch from the app
  menu or run `chronochime`.
- **Windows (.exe):** run the generated Setup `.exe`; Squirrel installs per-user
  and creates Start Menu / desktop shortcuts.
