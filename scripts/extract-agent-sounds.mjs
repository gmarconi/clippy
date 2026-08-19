#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const [, , inputArg, outputArg] = process.argv;

if (!inputArg || !outputArg) {
  console.error("Usage: node scripts/extract-agent-sounds.mjs <agent.acs|agent.act> <output-dir>");
  process.exit(1);
}

const input = resolve(inputArg);
const outputDir = resolve(outputArg);

if (!existsSync(input)) {
  console.error(`Input file does not exist: ${input}`);
  process.exit(1);
}

assertCommand("ffmpeg");
assertCommand("ffprobe");

const wavDir = join(outputDir, "wav");
const mp3Dir = join(outputDir, "mp3");
rmSync(outputDir, { recursive: true, force: true });
mkdirSync(wavDir, { recursive: true });
mkdirSync(mp3Dir, { recursive: true });

const chunks = extractRiffWaveChunks(input, wavDir);
const sounds = {};
const manifest = [];

for (const chunk of chunks) {
  const mp3Path = join(mp3Dir, `${chunk.id}.mp3`);
  execFileSync("ffmpeg", [
    "-y",
    "-v",
    "error",
    "-i",
    chunk.wavPath,
    "-ar",
    "22050",
    "-ac",
    "1",
    "-codec:a",
    "libmp3lame",
    "-q:a",
    "3",
    mp3Path
  ]);

  const stats = inspectAudio(mp3Path);
  sounds[String(Number(chunk.id))] = `data:audio/mpeg;base64,${readFileSync(mp3Path).toString("base64")}`;
  manifest.push({
    id: String(Number(chunk.id)),
    sourceOffset: chunk.offset,
    wavBytes: chunk.size,
    durationSeconds: stats.duration,
    maxVolumeDb: stats.maxVolume
  });
}

writeFileSync(join(outputDir, "sounds-mp3.json"), `${JSON.stringify(sounds)}\n`);
writeFileSync(join(outputDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Extracted ${chunks.length} WAV chunks from ${basename(input)}`);
console.log(`Wrote ${join(outputDir, "sounds-mp3.json")}`);
console.log(`Wrote ${join(outputDir, "manifest.json")}`);
for (const item of manifest) {
  console.log(
    `${item.id.padStart(2, "0")} duration=${item.durationSeconds}s max=${item.maxVolumeDb}dB offset=${item.sourceOffset}`
  );
}

function extractRiffWaveChunks(file, outDir) {
  const data = readFileSync(file);
  const chunks = [];
  let position = -1;

  while ((position = data.indexOf(Buffer.from("RIFF"), position + 1)) !== -1) {
    if (position + 12 > data.length) continue;
    if (data.toString("ascii", position + 8, position + 12) !== "WAVE") continue;

    const size = data.readUInt32LE(position + 4) + 8;
    if (size <= 12 || position + size > data.length) continue;

    const id = String(chunks.length + 1).padStart(2, "0");
    const wavPath = join(outDir, `${id}.wav`);
    writeFileSync(wavPath, data.subarray(position, position + size));
    chunks.push({ id, offset: position, size, wavPath });
  }

  return chunks;
}

function inspectAudio(file) {
  const duration = execFileSync("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=nw=1:nk=1",
    file
  ])
    .toString()
    .trim();

  const volume = spawnSync("ffmpeg", ["-i", file, "-af", "volumedetect", "-f", "null", "-"], {
    encoding: "utf8"
  });
  const output = `${volume.stdout ?? ""}\n${volume.stderr ?? ""}`;
  const match = output.match(/max_volume:\s*(-?\d+(?:\.\d+)?) dB/);

  return {
    duration: Number(duration).toFixed(6),
    maxVolume: match?.[1] ?? null
  };
}

function assertCommand(command) {
  const result = spawnSync(command, ["-version"], { stdio: "ignore" });
  if (result.error || result.status !== 0) {
    console.error(`${command} is required.`);
    process.exit(1);
  }
}
