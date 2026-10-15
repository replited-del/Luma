# Luma roadmap

These are proposals for future updates. Version 1.6.0 adds a Spotify button backed by spotDL for matched local downloads, progress, cancellation and source playlists. Version 1.5.0 added saved service links and official embedded players. Version 1.4.0 introduced the immersive listening screen and local synchronized lyrics, alongside the crossfades, waveforms, metadata editor and backups from 1.3.0. The features below have not been implemented yet.

## Next: resume listening

Restore the queue and current track position after closing the app. Start paused so the user chooses when to resume playback. Save state periodically and on a normal close, and handle deleted or unavailable tracks. This makes it easier to return to a listening session without finding the previous position manually.

## Music folders

Let users select collection folders and refresh the library to discover new files while skipping duplicates. Offer automatic folder watching as a separate option that can be disabled. A missing external drive must not remove music already imported. Preserve the current behavior of storing copies unless the user explicitly chooses another mode.

## Queue management

Support drag-to-reorder, removal, clear queue and Play next. Identify repeated tracks by their queue position so adding the same track twice works predictably. Editing the queue must not interrupt the current track.

## Reliability and collection support

- Recover automatically from a damaged active catalog, beyond the manual backup/restore available in 1.3.0.
- Expand codec tests to FLAC, M4A and OGG, alongside existing WAV fixtures and generated MP3 download fixtures.
- Improve provider diagnostics and compatibility when upstream spotDL updates resolve matching or download failures. Never turn a source rejection into a success status or silently substitute unrelated audio.
- Measure search and rendering performance on large collections; render only visible rows if delays are confirmed.
- Update music-metadata after checking tags and cover art across formats.
- Resolve the build dependency audit warning for sprintf-js when a compatible fix is available. The current full audit reports eight moderate entries in the electron-builder dependency chain; the production-only audit reports none. Do not downgrade the build tool automatically to silence the report.

## Appearance

Add accent colors and visualization modes while preserving Windows/macOS styles and English/Russian localization. All effects should be optional and respond to real audio.

Each feature should ship with scenario tests, persistence checks, a tested Windows EXE and a changelog entry. Local listening must remain free of accounts, subscriptions and a permanent internet connection; optional services must explain their separate requirements.
