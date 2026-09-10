# Sound

Eleven slots, listed in `manifest.json`. Anything not listed stays silent. Swap any one by
dropping a file here and changing the manifest — no code changes. Levels live in
`audio.js` (`SLOTS[...].gain`).

## What is in here now

All from **Mixkit** (mixkit.co, by Envato) — free for commercial and personal use, no
attribution, no sign-up. Originals in `src/` (git-ignored); the cuts below are what ships.

| Slot | Plays when | File | Source | Cut |
|---|---|---|---|---|
| `ambient` | after the gate, loops | `ambient.mp3` 120 s | music 188 **"Echoes"** — cinematic · dark · drone | 0:23→2:23, last 3 s cross-faded into 0:20→0:23 so the loop point is seamless, −24 LUFS |
| `hover` | pointer enters a link, button, planet label | `hover.mp3` 70 ms | sfx 1109 "Select click" | first 70 ms |
| `click` | any click | `click.mp3` 160 ms | sfx 2573 "Interface option select" | 0.09→0.25 s — the transient |
| `type` | every few characters of readout typing | `type.mp3` 25 ms | sfx 1109 "Select click" | first 25 ms, −10 dBFS |
| `warp` | every outbound flight; played at `2.6 / flightDuration` so it always spans the flight | `warp.mp3` 2.6 s | sfx 2297 "Bass rumble hum" + sfx 1486 "Fast rocket whoosh" | symmetric pass-by, whoosh peak at 1.3 s = the speed peak |
| `retro` | every return flight, same re-timing | `retro.mp3` 2.6 s | the `warp` cut pitched down 10 % | identical shape so out and back are mirrors |
| `arrive` | readout opens | `arrive.mp3` 1.0 s | sfx 914 "Sci Fi confirmation" | whole, −4 dBFS |
| `core` | clicking the sun · hyperdrive | `core.mp3` 2.6 s | sfx 2523 "Futuristic space intro" | first 2.6 s |
| `thud` | currently unused (kept for a future hard-stop variant) | `thud.mp3` 1.3 s | sfx 774 "Space impact" | first 1.3 s |
| `beltHit` | a jump crosses the asteroid belt | `belt-hit.mp3` 1.6 s | sfx 400 "Stones and rocks falling" | 0.1→1.7 s, −6 dBFS |
| `belt` | loops; level follows how close the camera is to the belt | `belt.mp3` 8 s | sfx 1718 "Rocket rumble in the distance" + sfx 403 "Stone debris falling" at −16 dB | 8 s seamless loop |

Preview any source at `https://assets.mixkit.co/active_storage/sfx/<id>/<id>-preview.mp3`
(music: `https://assets.mixkit.co/music/<id>/<id>.mp3`).

## How they were chosen

Measured, not guessed: 27 SFX and 13 tracks were run through ffmpeg for RMS after a 400 Hz
low-pass (bass weight) and a 2 kHz high-pass (brightness). "Serious" = bass near full level,
treble well below; bright bleeps were rejected. Echoes was the darkest bed on the site
(treble 22 dB under the fundamentals, no melody, no beat).

## If you replace one

mp3 or ogg. Keep SFX under ~200 KB, the bed under ~2 MB. Rough targets: SFX peak −2 dBFS,
bed around −24 LUFS. For a seamless loop, cross-fade the tail into the head (see the
`acrossfade` recipe in the plan file) — a plain fade-out/fade-in dips audibly every cycle.
