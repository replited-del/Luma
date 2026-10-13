# Luma

A free, open-source offline music player for Windows. Import your own music, organize playlists and albums, tune the 10-band equalizer, and enjoy a real-time spectrum with volume and bass meters. No account, subscription or ads. Available in English and Russian, with Windows and macOS window styles.

[Download for Windows](https://github.com/replited-del/Luma/releases/latest) · [Changelog](CHANGELOG.md) · [Roadmap](ROADMAP.md) · [Report a bug](https://github.com/replited-del/Luma/issues)

![Luma interface](docs/images/interface.png)

## Getting started

1. Download the EXE from [GitHub Releases](https://github.com/replited-del/Luma/releases/latest). Close any previous version and run `Luma-1.2.1-Windows.exe`. No Node.js installation is needed to use the player.
2. Click **Add music** and select files or a folder. You can also drag files and folders into the window.
3. Open **All tracks** and click a track title or its play button. Clicking the current track title again toggles pause.
4. Click **+** next to Playlists, name your playlist, and use **Add tracks** to choose its music.

Luma starts in Russian by default. Open the gear button in the top-right corner or **Настройки** in the sidebar, then choose **English** under **Язык интерфейса**.

The player works without an account or an internet connection. Music is not included: add your own collection.

## Features

- File and folder import, including subfolders, with duplicate detection.
- Track tags and cover art, search, albums, favorites and playlists.
- Listening history, playback queue, shuffle, repeat and seeking.
- Volume control and a 10-band equalizer with presets.
- A real audio spectrum, volume meter and bass meter that can be disabled.
- Windows and macOS window styles, English and Russian UI, compact library rows and reduced motion.

Supported containers: MP3, FLAC, WAV, M4A, AAC, OGG, OPUS and WEBM. Playback depends on the codec inside each file; DRM-protected files are not supported. Automated playback tests currently use WAV fixtures.

## Appearance and language

Open **Settings** using the sidebar or the top-right gear button.

- **Window style → Windows:** standard minimize, maximize/restore and close buttons on the right. This is the default style.
- **Window style → macOS:** colored window buttons on the left and rounded interface elements.
- **Interface language → English / Russian:** translates navigation, buttons, settings, import dialogs, track menus and tooltips. Your track metadata and playlist names stay as you entered them.

Changes apply immediately, survive a restart and do not interrupt playback. Existing libraries from earlier versions remain compatible.

## Music visualization

The spectrum and volume/bass meters appear in the bottom player and the expanded **Now playing** window. Click the cover art to open that window. The meters analyze the actual audio after the equalizer; the bass range is 30–250 Hz. Values use a logarithmic scale and represent relative digital signal levels, not room sound pressure.

Disable them under **Settings → Sound and comfort → Music visualization**. The setting is saved between sessions. Pausing clears the meters, disabling visualization leaves playback running, and drawing stops while the window is hidden. **Reduce motion** lowers the refresh rate.

![Expanded player and music visualization](docs/images/visualizer.png)

## Your music and data

Imported files are copied to `%APPDATA%/luma-music/music`, covers are stored in `covers`, and the catalog and settings are stored in `library.json`. Original files are never changed or deleted. Duplicate files are identified by their contents.

**Remove from library** removes a track from the catalog and playlists. The imported copy remains in the application folder, and the original stays in its original location. To back up your library, close Luma and copy the entire `%APPDATA%/luma-music` folder.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| Space | Play / pause |
| Ctrl K | Search |
| Ctrl O | Import music |
| Ctrl → / Ctrl ← | Next / previous track |
| Enter on a track row | Play the track |
| Esc | Close a dialog or the queue |

## Development

Requires Node.js 24 LTS and Windows 10/11 x64.

```powershell
npm ci
node node_modules/electron/install.js
npm start
npm test
npm run build
```

The explicit Electron install step also handles npm versions that do not automatically run its installation script.

`npm test` launches a real Electron instance with an isolated test library, generates short audio fixtures, and checks import, duplicates, invalid files, search, favorites, playlists, playback, seeking, equalizer controls, queue behavior, settings persistence and restart. It also checks visualization and live English/Russian and Windows/macOS switching. Test files are stored in the neighboring `work` folder unless `LUMA_TEST_ROOT` is set.

Built with Electron, JavaScript, HTML/CSS, the Web Audio API and music-metadata. The UI uses local assets. Node.js access is disabled in the renderer; file operations are handled by the main process through a restricted preload API.

GitHub Actions checks changes and pull requests and runs daily. Version tags `vX.Y.Z` trigger a Windows build, packaged app tests and EXE publication in Releases. Dependabot proposes dependency updates. See [CONTRIBUTING.md](CONTRIBUTING.md) for the release process.

Windows builds are not digitally signed.

## License

[MIT](LICENSE).
