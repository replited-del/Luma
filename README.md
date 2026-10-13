# Luma

A free, open-source offline music player for Windows. Import your own music, organize playlists and albums, edit track information, tune the 10-band equalizer, and enjoy crossfades, track waveforms and real audio visualization. Back up your entire collection locally. No account, subscription or ads. Available in English and Russian, with Windows and macOS window styles.

[Download for Windows](https://github.com/replited-del/Luma/releases/latest) · [Changelog](CHANGELOG.md) · [Roadmap](ROADMAP.md) · [Report a bug](https://github.com/replited-del/Luma/issues)

![Luma interface](docs/images/interface.png)

## Getting started

1. Download the EXE from [GitHub Releases](https://github.com/replited-del/Luma/releases/latest). Close any previous version and run `Luma-1.3.0-Windows.exe`. No Node.js installation is needed to use the player.
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
- Optional crossfades between tracks, with a duration of 1–12 seconds.
- Real track waveforms on the seek bar, cached locally and independently switchable.
- Track title, artist, album, genre, year, track number and cover editing.
- Full local library backups with integrity checks and recovery before restoring.
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

## Crossfades and track waveforms

Open **Settings → Sound and comfort → Crossfade** and choose Off, 1, 2, 3, 5, 8 or 12 seconds. Crossfade is off by default. During automatic playback, the next queued track fades in while the current track fades out. Both pass through the same equalizer and visualization. Short tracks use a shorter overlap. Repeat-one and the last track of a queue without repeat do not crossfade. Manual skipping switches immediately; pausing or seeking ends the overlap so no old track keeps playing.

The seek bar displays the selected track's actual audio waveform. Click or drag it to seek, or focus it and use the arrow keys. Turn it off independently with **Settings → Sound and comfort → Track waveform**. Waveforms are computed on demand and cached in `%APPDATA%/luma-music/waveforms`. Recordings longer than 30 minutes or files larger than 96 MB use the regular seek bar to bound decoding memory; unsupported decoders also fall back to regular seeking.

![Track waveform](docs/images/waveform.png)

## Edit track information

Open a track's **⋯** menu or right-click its row and select **Track information**. Edit its title, artist, album, genre, year and track number, then choose **Save**. You can replace or remove its cover art; the picker accepts PNG and JPEG images up to 10 MB.

Edits change the Luma catalog and cover copy, including search results, album grouping and the playing track. They do not rewrite tags in original or imported audio files. Track identifiers, favorites and playlist membership are preserved.

![Track information editor](docs/images/track-editor.png)

## Back up and restore

Use **Settings → Library backup → Create backup**, then select a destination outside the active Luma library. A new `Luma-backup-...` folder contains the catalog, settings, playlists, all music and covers referenced by the catalog, and a SHA-256 manifest. Keep the entire folder together, preferably on another drive. Removed tracks' leftover copies and waveform caches are excluded.

To restore, choose **Settings → Library backup → Restore**, confirm replacement and select a previously created backup folder. Playback stops. Luma verifies file sizes, checksums and catalog paths before replacing music, covers and the catalog. Invalid backups leave the current library intact; a failed replacement rolls back its changes. The restored library starts paused.

Before replacement, Luma saves the current library in `%APPDATA%/luma-music/backups/Before-restore-...` and shows that path after success. These recovery folders can also be selected for restoration. They are not deleted automatically. Backups need disk space for a full copy; restoration needs space for the staged collection and the recovery copy. Original files outside the Luma library stay in place.

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

`npm test` launches real Electron instances with isolated test libraries. The smoke suite covers import, duplicates, invalid files, search, favorites, playlists, playback, seeking, equalizer, queue, persistence, visualization and language/style switching. The feature suite checks real crossfade overlap, waveform amplitude and cache, metadata/cover edits, full backup restoration, damaged and unsafe backup rejection, and rollback after a simulated directory-swap failure. Test files are stored in the neighboring `work` folder unless `LUMA_TEST_ROOT` is set.

Built with Electron, JavaScript, HTML/CSS, the Web Audio API and music-metadata. The UI uses local assets. Node.js access is disabled in the renderer; file operations are handled by the main process through a restricted preload API.

GitHub Actions checks changes and pull requests and runs daily. Version tags `vX.Y.Z` trigger a Windows build, packaged app tests and EXE publication in Releases. Dependabot proposes dependency updates. See [CONTRIBUTING.md](CONTRIBUTING.md) for the release process.

Windows builds are not digitally signed.

## License

[MIT](LICENSE).
