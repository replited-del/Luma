# Changelog

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
