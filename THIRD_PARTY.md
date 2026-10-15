# Optional download components

Luma prepares these tools on the first Spotify download, stores them in its application data directory, and runs them as separate processes. Source code and releases are maintained by their respective projects. Luma does not include music or service credentials.

- **spotDL 4.5.2** — [source and MIT license](https://github.com/spotDL/spotify-downloader/tree/v4.5.2). Reads Spotify metadata and matches recordings on other sources; it does not export Spotify original audio.
- **FFmpeg 6.1.1 Windows x64 build** — [binary, license and build information](https://github.com/eugeneware/ffmpeg-static/releases/tag/b6.1.1), [FFmpeg source](https://ffmpeg.org/download.html). This optional build is GPL-3.0 licensed and is downloaded directly from its upstream distributor.
- **Deno 2.9.7** — [source and MIT license](https://github.com/denoland/deno/tree/v2.9.7). JavaScript runtime used by spotDL's downloader.
- **yauzl 3.4.0** — [source and MIT license](https://github.com/thejoshwolfe/yauzl). Bundled ZIP reader used to extract the one expected Deno executable to a fixed destination.

Pinned versions, download lengths and SHA-256 values are in `spotdl-download.cjs`. Luma does not silently replace these with the newest available releases. Dependency updates require review and validation.
