# Parallax Mega Map Architecture

## World contract

The playable envelope is `2400m x 2400m`, centered at `(0, 0, 0)`, with valid X/Z coordinates in `[-1200, 1200]`. The world is divided into `200m x 200m` chunks (`12 x 12`, 144 chunks). A chunk owns terrain, props, collision, ambient audio zones and network interest metadata.

The six biome regions are stable content IDs, not separate scenes:

| ID | Region | Gameplay/audio identity |
| --- | --- | --- |
| `downtown` | northwest core | dense towers, traffic, electrical hum |
| `industrial` | northeast | factories, rail, machinery and low-frequency rumble |
| `coast` | southwest edge | beach, marina, wind and surf |
| `desert` | southeast | dry basin, dust, sparse roads |
| `forest` | north rim | trees, trails, birds and wind |
| `badlands` | south-center ridge | cliffs, mines, wildlife and reverb |

Each chunk is generated from `mapSeed + chunkX + chunkZ`; this makes reconnects deterministic. The client keeps a 3x3 active ring, a 5x5 warm ring and unloads chunks outside the warm ring. Props use `InstancedMesh`, terrain uses LOD, and collision meshes are separate low-poly assets.

## Socket.IO session enforcement

`playerKey` is the stable identity from the local save/auth profile. `activeSessions[playerKey] -> socket.id` is authoritative. A newer join emits `session:replaced`, disconnects the old socket, removes its player, and broadcasts `player:left`. All mutating events resolve the player from the current socket, never from a client-supplied ID.

Production follow-up: replace the in-memory lease with Redis (`SET session:<playerKey> socketId NX EX`) when running multiple Node workers. Add a short grace TTL for mobile reconnects and authenticate `playerKey` with a signed access token; localStorage alone is not an account security boundary.

## `KHR_texture_transform`

The asset pipeline must preserve the glTF extension and the Three.js loader must be configured at the same version as the renderer. The warning is not fixed by hiding console output. On load, normalize every material texture (`map`, `normalMap`, `roughnessMap`, `metalnessMap`, `aoMap`, `emissiveMap`) and set `matrixAutoUpdate = true`; for assets authored without the extension, bake UV transforms during export or set the intended repeat/offset/rotation explicitly.

Acceptance: no `undefined extension` warning for shipped GLBs, and a texture-transform fixture renders with the expected offset/rotation/repeat.

## High-fidelity audio

Use one `AudioContext` after a user gesture and route sources through `master -> limiter -> destination`. Buses are `music`, `sfx`, `ambience`, `voice`; each has gain, EQ and optional convolution reverb. Vehicle/weapon/NPC sources use `THREE.PositionalAudio` or Web Audio `PannerNode` with distance models. Stream long music/ambience assets; decode short one-shots into an LRU `AudioBuffer` cache. Procedural oscillators remain only as a no-asset fallback.

The listener follows the camera/player each frame. Biome chunks publish an ambience set and crossfade it over 1.5 seconds. Audio is suspended when the tab is hidden and resumed on visibility/user gesture.

## Delivery phases

1. Contracts and session lease (done in server baseline): map metadata, stable player key, duplicate-session replacement, coordinate bounds.
2. Chunked terrain/biomes: registry, seeded generation, LOD/instancing, collision and interest updates.
3. Asset pipeline: GLB validation, baked texture transforms, KTX2/Draco version lock and fixture scene.
4. Audio: bus graph, decoded asset cache, positional emitters, biome crossfades and telemetry.
5. Scale test: 32 clients, 144 chunk traversal, reconnect race, duplicate-tab race, WebGL memory and audio CPU budgets.
