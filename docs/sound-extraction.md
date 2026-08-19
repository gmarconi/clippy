# Sound Extraction

The bundled `public/agents` assets are converted from the historical ClippyJS exports. To re-export sounds from an original Microsoft Agent character file, use:

```bash
node scripts/extract-agent-sounds.mjs /path/to/CLIPPIT.ACS /tmp/clippit-sounds
```

The script:

- scans the binary file for embedded `RIFF/WAVE` chunks
- writes the raw chunks to `wav/`
- transcodes them to MP3 with `ffmpeg`
- writes `sounds-mp3.json`
- writes `manifest.json` with offsets, durations, and peak volume

The original Clippit ACS contains 15 sound chunks, matching the web export's 15 sound IDs. Some clips are intentionally very short or quiet; Clippy sound `10` maps to one of those quiet attention ticks, so a faithful re-export preserves that behavior.

The script does not download or commit original Microsoft character files.
