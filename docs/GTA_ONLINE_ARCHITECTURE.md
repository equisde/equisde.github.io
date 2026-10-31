# Parallax GTA Online: arquitectura de mundo abierto

## Objetivo

Convertir el prototipo Three.js actual en un vertical slice multijugador autoritativo: tráfico terrestre, aéreo y marítimo; jugadores remotos con crew/chat; taller de tuning; respuesta policial; entrega de vehículos por teléfono; y estado `wasted -> hospital respawn`.

La arquitectura conserva `game3d.html`, `cyber_city_3d.js`, el manifiesto de `assets/models/` y Socket.io. El cliente renderiza e interpola; el servidor decide movimiento, posesión, daño, wanted, economía y transiciones de misión.

## Límites y autoridad

```text
Cliente Three.js                 Socket.io                Servidor Node
input + cámara + render  ─────── commands ──────────────> validación/tick 20 Hz
HUD + interpolación       <──── snapshots/events ─────── NPC/vehículos/heat
assets/models/*.glb                                      persistencia futura
```

- El servidor es autoritativo para `player`, `vehicle`, `npc`, `wanted`, `damage`, `delivery` y `tuning`.
- El cliente envía intención (`throttle`, `steer`, `pitch`, `fire`), nunca posición final.
- Snapshots a 10 Hz, inputs a 20 Hz, interpolación remota con buffer de 100 ms.
- `entityId` estable, `ownerId` opcional y `serverTick` monotónico. Validar velocidad máxima, distancia recorrida, cooldown y permisos de tripulación.
- Para escala: una instancia/shard de 64 jugadores, celdas de 256 m y suscripción por proximidad. NPC y vehículos se simulan sólo en celdas activas; el resto usa spawn determinista.

## Entidades y datos

```js
Vehicle {
  id, kind, zone: 'land'|'air'|'water', modelKey, state: 'npc'|'owned'|'delivery'|'destroyed',
  pos, rot, velocity, health, driverId, ownerId, tuning: { paint, neon, armor },
  ai: { routeId, mode: 'traffic'|'police'|'air_support'|'boat_patrol', targetId }
}
Player { id, name, crew: { id, tag, color }, pos, vehicleId, health, armor, wanted, state }
```

`modelKey` usa el catálogo existente: `gta-sports-car`, `sedan`, `taxi`, `suv`, `truck`, `ambulance`, `gta-bus`, `motorbike`, `helicopter`, `jet-fighter`, `speedboat`, `gta-police-car` y `police`. No se crean variantes por modelo: las variantes visuales se aplican como tuning/materiales.

## Simulación NPC y vehículos

Crear `server/world/` con `World`, `VehicleSystem`, `NpcDirector`, `TrafficGraph`, `WantedSystem` y `DeliverySystem`.

- Tierra: grafo de carriles con waypoints, semáforos y avoidance; pesos por tipo (taxi/ambulancia/policial).
- Aire: volúmenes de navegación y corredores; helicóptero mantiene órbita/altura y el jet usa ruta spline.
- Agua: splines de costa y zonas navegables; speedboat usa steering sobre el plano XZ.
- Cada entidad recibe `spawnSeed` para que el cliente pueda cargar el mismo GLB y aplicar LOD. El servidor no transporta mallas.
- `NpcDirector` mantiene pools por celda y respawnea sólo cuando no hay jugadores observando la destrucción.

Cliente: `VehicleRegistry` carga GLB bajo demanda, `VehicleView` aplica materiales/tuning, `RemoteInterpolator` suaviza snapshots, y `VehicleController` traduce input a comandos. El modelo activo del jugador debe ser una vista de una entidad del servidor, no un objeto paralelo.

## Protocolo Socket.io v2

Cliente -> servidor:

```text
session:join { name, crewId?, crewTag? }
input:vehicle { vehicleId, seq, throttle, steer, brake, handbrake, pitch, yaw, roll }
player:action { action: 'enter'|'exit'|'carjack'|'fire' }
chat:send { channel: 'global'|'crew'|'local', text }
tuning:apply { vehicleId, paint?, neon?, armor? }
phone:deliver { vehicleClass, dropPointId }
player:damage { amount, sourceId } // sólo para pruebas; producción lo emite el servidor
```

Servidor -> cliente:

```text
world:init { tick, mapSeed, entities, crews, player }
world:snapshot { tick, entities: [{id,pos,rot,velocity,state}] }
entity:spawn / entity:despawn
player:state { id, health, armor, wanted, state }
wanted:update { level, causes, expiresAt }
police:air_support { helicopterId, targetId, spotlight }
delivery:accepted / delivery:spawned / delivery:arrived / delivery:failed
tuning:updated { vehicleId, tuning }
chat:message { id, sender, crewTag, channel, text, createdAt }
player:wasted { hospitalId, respawnAt, bill }
```

Todos los textos se recortan a 240 caracteres, se escapan en el HUD y se rate-limitan. El servidor ignora `crewTag` enviado por clientes no autorizados y lo resuelve desde la sesión.

## Crew tags y chat

`crew:join` valida invitación y límite; el snapshot de jugador incluye `crewId`, `tag`, `color`. El canal `local` se filtra por distancia, `crew` por miembros y `global` por shard. El historial no se persiste en el primer slice; Redis adapter y PostgreSQL quedan para presencia y auditoría cuando haya más de un proceso.

## Los Santos Customs

La interacción abre un modal HTML existente o nuevo y bloquea input de conducción. Cambios se envían como transacción idempotente con `requestId`; el servidor valida saldo, vehículo poseído y límites:

```js
paint: { primary, secondary, pearlescent }
neon: { enabled, color, intensity }
armor: 0..4
```

Guardar tuning en `owned_vehicles`; publicar `tuning:updated` después del commit. En cliente, `VehicleView.applyTuning()` clona materiales antes de cambiar color y crea cuatro luces emisivas sólo para vehículos cercanos.

## Wanted y helicóptero

`WantedSystem.add(level, reason)` es la única entrada para subir estrellas. A partir de 3 estrellas, `NpcDirector` reserva un helicóptero por distrito; `PoliceAirSupport` lo lleva al objetivo, conmuta `spotlight=true` cuando el cono intersecta al jugador y emite pulsos de búsqueda cada 250 ms. Al perder línea de visión, usa la última posición conocida y libera la unidad tras un cooldown. El cliente sólo muestra luces, sonido y HUD.

## Teléfono y entrega

`phone:deliver` crea una orden con precio, ETA y `dropPointId`; se descuenta dinero al aceptar y se reembolsa si falla por timeout. `DeliverySystem` elige un vehículo del pool `owned` o crea un NPC repartidor, lo conduce por la red y transfiere `ownerId` al llegar. Estados: `requested -> enroute -> arrived -> claimed|failed`. Reintentos requieren otra orden, evitando duplicados mediante `requestId`.

## Wasted y hospital

El servidor reduce `health`; al llegar a cero cambia `Player.state='wasted'`, bloquea inputs, destruye/abandona el vehículo y emite `player:wasted`. Tras 5 s, `hospital:respawn` coloca al jugador en el hospital más cercano, restaura salud/armadura base, cobra factura configurable y elimina wanted. El cliente muestra overlay de 5 s con cámara y botón sólo después de `respawnAt`; nunca decide el respawn localmente.

## Orden de entrega

1. Extraer `cyber_city_3d.js` en módulos ES: registry/render, input, networking, HUD y gameplay.
2. Implementar `World` + snapshots y reemplazar `player:move` por `input:vehicle`.
3. Añadir pools/grafos de NPC para tierra, aire y agua; después sincronizar entidades remotas.
4. Añadir crew/chat, luego tuning persistente y teléfono.
5. Integrar wanted autoritativo, air support, wasted/hospital.
6. Optimizar por celdas, LOD, instancing y Redis adapter sólo cuando las métricas lo requieran.

## Criterios de aceptación

- Dos pestañas ven al mismo jugador, vehículos y crew tag sin teletransporte visible.
- Cada clase de vehículo aparece con NPC y respeta su superficie de navegación.
- Tuning sobrevive reconexión y no puede aplicarse a un vehículo ajeno.
- Con 3+ estrellas se genera un helicóptero, sigue al jugador y proyecta spotlight.
- Una entrega no duplica vehículo ni saldo al repetir la petición.
- Daño letal produce `WASTED`, respawn server-side en hospital y sincronización correcta en la otra pestaña.
- Chat filtra por canal, alcance, longitud y frecuencia.

## Riesgos

El servidor actual mantiene `connectedPlayers` en memoria y acepta posiciones arbitrarias en `player:move`; no debe exponerse como autoridad de producción. La URL Heroku embebida en el cliente también debe reemplazarse por una variable de configuración (`window.GAME_SOCKET_URL`). Los GLB existentes son suficientes para prototipo, pero la escala, colisiones y animaciones deben normalizarse por `VehicleSpec` antes de una beta.
