#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const [, , currentJsonArg, extractedDirArg, outputJsonArg] = process.argv;

if (!currentJsonArg || !extractedDirArg || !outputJsonArg) {
  console.error(
    "Usage: node scripts/map-extracted-sounds.mjs <current-sounds-mp3.json> <extracted-dir> <output-sounds-mp3.json>"
  );
  process.exit(1);
}

const currentJson = resolve(currentJsonArg);
const extractedDir = resolve(extractedDirArg);
const outputJson = resolve(outputJsonArg);

if (!existsSync(currentJson)) fail(`Missing current sound map: ${currentJson}`);
if (!existsSync(extractedDir)) fail(`Missing extracted sound directory: ${extractedDir}`);

const current = JSON.parse(readFileSync(currentJson, "utf8"));
const extracted = JSON.parse(readFileSync(join(extractedDir, "sounds-mp3.json"), "utf8"));
const currentFeatures = new Map();
const extractedFeatures = new Map();

for (const [id, uri] of Object.entries(current)) {
  currentFeatures.set(id, analyzeDataUri(uri));
}

for (const [id, uri] of Object.entries(extracted)) {
  extractedFeatures.set(id, analyzeDataUri(uri));
}

const remaining = new Set(extractedFeatures.keys());
const mapped = {};
const rows = [];

for (const id of Object.keys(current).sort((a, b) => Number(a) - Number(b))) {
  const source = currentFeatures.get(id);
  const ranked = [...remaining]
    .map((candidateId) => ({
      id: candidateId,
      score: scoreFeatures(source, extractedFeatures.get(candidateId))
    }))
    .sort((a, b) => a.score - b.score);

  const best = ranked[0];
  if (!best) fail(`No extracted candidate left for sound ${id}`);

  remaining.delete(best.id);
  mapped[id] = extracted[best.id];
  rows.push({
    currentId: id,
    extractedId: best.id,
    score: Number(best.score.toFixed(4)),
    currentDuration: source.durationSeconds,
    extractedDuration: extractedFeatures.get(best.id).durationSeconds,
    currentRms: Number(source.rms.toFixed(6)),
    extractedRms: Number(extractedFeatures.get(best.id).rms.toFixed(6))
  });
}

mkdirSync(resolve(outputJson, ".."), { recursive: true });
writeFileSync(outputJson, `${JSON.stringify(mapped)}\n`);
writeFileSync(outputJson.replace(/\.json$/, ".mapping.json"), `${JSON.stringify(rows, null, 2)}\n`);

console.table(rows);
console.log(`Wrote ${outputJson}`);
console.log(`Wrote ${outputJson.replace(/\.json$/, ".mapping.json")}`);

function analyzeDataUri(uri) {
  const [, data] = String(uri).split(",");
  if (!data) fail("Invalid data URI");
  const decoded = decodePcm(Buffer.from(data, "base64"));
  return features(decoded);
}

function decodePcm(bytes) {
  const result = spawnSync(
    "ffmpeg",
    ["-v", "error", "-i", "pipe:0", "-ar", "11025", "-ac", "1", "-f", "f32le", "pipe:1"],
    {
      input: bytes,
      maxBuffer: 20_000_000
    }
  );

  if (result.status !== 0) {
    fail(result.stderr.toString() || "ffmpeg decode failed");
  }

  const buffer = result.stdout;
  return new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
}

function features(samples) {
  const length = samples.length;
  let sumSquares = 0;
  let peak = 0;
  let zeroCrossings = 0;
  let previous = 0;

  for (const sample of samples) {
    sumSquares += sample * sample;
    peak = Math.max(peak, Math.abs(sample));
    if ((sample < 0 && previous >= 0) || (sample >= 0 && previous < 0)) {
      zeroCrossings += 1;
    }
    previous = sample;
  }

  const rms = Math.sqrt(sumSquares / Math.max(1, length));
  const envelope = makeEnvelope(samples, 32);
  return {
    durationSeconds: length / 11025,
    envelope,
    length,
    peak,
    rms,
    zeroCrossingRate: zeroCrossings / Math.max(1, length)
  };
}

function makeEnvelope(samples, bins) {
  const envelope = [];
  const binSize = Math.max(1, Math.floor(samples.length / bins));

  for (let bin = 0; bin < bins; bin += 1) {
    const start = bin * binSize;
    const end = bin === bins - 1 ? samples.length : Math.min(samples.length, start + binSize);
    let sum = 0;
    for (let index = start; index < end; index += 1) {
      sum += Math.abs(samples[index] ?? 0);
    }
    envelope.push(sum / Math.max(1, end - start));
  }

  const max = Math.max(...envelope, 1e-8);
  return envelope.map((value) => value / max);
}

function scoreFeatures(a, b) {
  const duration = Math.abs(Math.log((a.durationSeconds + 0.001) / (b.durationSeconds + 0.001)));
  const rms = Math.abs(Math.log((a.rms + 1e-8) / (b.rms + 1e-8)));
  const peak = Math.abs(Math.log((a.peak + 1e-8) / (b.peak + 1e-8)));
  const zcr = Math.abs(a.zeroCrossingRate - b.zeroCrossingRate) * 10;
  const envelope =
    a.envelope.reduce((sum, value, index) => sum + Math.abs(value - (b.envelope[index] ?? 0)), 0) /
    a.envelope.length;

  return duration * 2 + rms + peak + zcr + envelope * 2;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
