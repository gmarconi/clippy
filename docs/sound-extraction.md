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

## Mapping Extracted Sounds

Extracted chunks are not guaranteed to be in the same order as ClippyJS sound IDs. To map by similarity against an existing sound map:

```bash
node scripts/map-extracted-sounds.mjs \
  public/agents/Clippy/sounds-mp3.json \
  /tmp/clippit-sounds \
  /tmp/clippit-mapped/sounds-mp3.json
```

The mapper decodes both sides to PCM, compares duration, RMS, peak level, zero crossing rate, and a coarse amplitude envelope, then writes:

```text
/tmp/clippit-mapped/sounds-mp3.json
/tmp/clippit-mapped/sounds-mp3.mapping.json
```

After reviewing the mapping, copy the mapped sound map into the repo:

```bash
cp /tmp/clippit-mapped/sounds-mp3.json public/agents/Clippy/sounds-mp3.json
```

The current Clippy MP3 map was generated this way from `CLIPPIT.ACS`. The mapping report is committed at [clippy-sound-map-from-acs.json](clippy-sound-map-from-acs.json).
