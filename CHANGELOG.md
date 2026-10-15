# Changelog

## 1.5.0

- Add a Services collection for public Spotify tracks, albums and playlists, and SoundCloud tracks and playlists.
- Paste full or supported short share links, retrieve titles through official oEmbed endpoints, save custom names and reopen the official player inside Luma.
- Keep service audio separate from local files: opening a service pauses local audio, and playing local music or leaving Services unloads the embedded player. No service player loads at startup.
- Detect duplicate links, support search, renaming and confirmed removal, and preserve saved links in full library backups and after restarting.
- Explain internet, region and provider restrictions in both languages. Spotify may be preview-only in Electron; use Open in service for the provider's app/browser. Audio is not downloaded, and local EQ, lyrics and visualization do not process embedded audio.
- Isolate remote content in sandboxed frames, validate provider URLs and short-link redirects, bound metadata responses, and restrict IPC to Luma's main frame.
- Test link validation, offline metadata fallback, local/embedded audio handoff, remote isolation, live language switching, backups, restart and minimum-height navigation with offline provider fixtures.

## 1.4.0

- Replace the small expanded player with a large listening screen featuring optional cover-derived backgrounds, smooth cover transitions, playback controls and synchronized lyrics.
- Import local UTF-8 LRC or TXT files without interrupting playback or modifying original files.
- Follow timed lines and progressively highlight word/syllable markers in enhanced LRC; support repeated timestamps and LRC offset metadata.
- Seek by clicking a lyric line, pause following during manual scrolling, and save per-track timing corrections in 0.25-second steps.
- Keep lyrics and timing corrections in library backups, restoration and restart persistence; confirm lyric removal.
- Keep native window controls, the bottom seek waveform, English/Russian UI, Windows/macOS styling and reduced motion available.
- Add real app checks for lyric timing, word progress, input limits, safe text rendering, cover backgrounds, crossfade track changes, small-window layout and backup recovery.

## 1.3.0

- Add optional automatic crossfades from 1 to 12 seconds through the shared equalizer and analyser; handle pause, seeking, manual skipping and repeat modes.
- Add real audio waveforms on the seek bar, local peak caching, keyboard/pointer seeking and an independent visibility toggle.
- Add a track information editor for title, artist, album, genre, year, track number and local cover art without rewriting audio files.
- Keep the expanded player synchronized when current track metadata or artwork is edited.
- Create full local library backup folders with music, covers, catalog, playlists, settings and SHA-256 checksums.
- Validate backups before restoring, retain a recovery copy of the previous library and roll back failed file replacements.
- Add real app tests for new features, persistence, original-file preservation, corrupt backup rejection and restore failure recovery.
- Preserve Windows/macOS styles and English/Russian localization for all new controls.

## 1.2.1

- Preserve fresh volume, compact layout and visualization settings when favorites or other library actions refresh the catalog.
- Update the expanded Now playing window with the current title, artist, cover art and visualization when switching tracks.
- Close the expanded player when its current track is removed.
- Add regression checks for these scenarios in the real app tests.
- Publish the repository documentation and development roadmap in English.

## 1.2.0

- Add a frequency spectrum and volume/bass meters driven by real audio after the equalizer.
- Display visualization in the bottom player and the expanded Now playing window.
- Add a visualization toggle that persists across restarts.
- Clear the meters on pause and mute.

## 1.1.0

- Add Windows/macOS window style switching.
- Add live English/Russian language switching without interrupting playback.
- Increase text and button sizes and add quick actions, back navigation and clear search.

## 1.0.0

- Introduce a local music library with file and folder import.
- Add tags and cover art, search, albums, favorites and playlists.
- Add playback, queue controls, seeking, volume and a 10-band equalizer.
