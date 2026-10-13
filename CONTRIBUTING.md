# Contributing and releasing

Luma is a local music player for Windows. Preserve playback without an account, subscription or internet connection, both Windows/macOS window styles, and the English/Russian interface. User music and playlist names must never be translated or committed to this repository.

Keep repository documentation, release notes, code comments and package metadata in English. Russian UI strings and localization test fixtures are intentional and should remain supported.

## Validate changes

Install Node.js 24, run `npm ci`, then run `node node_modules/electron/install.js`. `npm test` launches the real Electron app with an isolated library and tests playback and UI behavior. CI stores temporary library data in `LUMA_TEST_ROOT` and screenshots in `LUMA_SCREENSHOT_DIR`.

The **App checks** workflow validates changes and runs daily at 06:17 UTC (09:17 Moscow time). Dependabot proposes dependency updates daily; accept them only after compatibility checks and passing tests.

## Release a version

1. Update `package.json`, `package-lock.json`, the version shown in the app settings, and `CHANGELOG.md`.
2. Run `npm test` and `npm run build`.
3. Set `LUMA_TEST_EXEC` to the built `../Luma-build/win-unpacked/Luma.exe` and run `npm test` again to validate the packaged app.
4. Push the changes to `main`, wait for passing checks, then create and push a `vX.Y.Z` tag matching the package version.

The **Windows release** workflow builds the portable EXE, tests the packaged app and publishes it in GitHub Releases. A manual workflow run without a version tag creates a downloadable build artifact only. Windows builds are not digitally signed.

Create releases only for useful changes. Store EXEs in Releases rather than Git history. Never modify a user's real music library during testing or stop a player instance they are using.