---
name: prestamo-workflow
description: Define las reglas de negocio, el flujo de firma y el ciclo de vida para los Pases a Préstamo de jugadores entre clubes (costo $0). Úsalo SIEMPRE que trabajés con préstamos temporales, su distinción respecto a los pases definitivos, la disponibilidad del jugador en el plantel destino y las notificaciones de credenciales.
---

# Flujo de Pase a Préstamo (Costo $0 — Máquina de Estados)

## Diferencia Clave con el Pase Definitivo
| Aspecto | Pase Definitivo | Pase a Préstamo |
|---|---|---|
| Costo | Con arancel (comprobante obligatorio) | **$0** — Sin comprobante |
| Impacto en Tesorería | Genera un ingreso | **No genera ingreso** |
| Tipo en DB | `tipo_pase = 'definitivo'` | `tipo_pase = 'prestamo'` |
| Acta | "Traspaso" | "Préstamo" |
| Liberación del jugador | Permanente | Temporal (duración a definir) |

## Columna en Base de Datos
La tabla `tramites_pases` maneja el préstamo con tres columnas clave:
```sql
tipo_pase TEXT DEFAULT 'definitivo' CHECK (tipo_pase IN ('definitivo', 'prestamo'))
fecha_desde DATE
fecha_hasta DATE
```
**Regla de Temporalidad:** Si el pase es préstamo (`tipo_pase = 'prestamo'`), `fecha_desde` y `fecha_hasta` son campos OBLIGATORIOS. La fecha de caducidad `fecha_hasta` NO puede superar el 31 de Diciembre del año en curso.

## Flujo de Estados (Idéntico al Pase Definitivo)
1. **Club Solicitante (Club A)** inicia el préstamo con el DNI del jugador **sin adjuntar comprobante**
2. **FVF** recibe y revisa la solicitud. La aprueba pasando a estado `esperando_firma_origen`
3. **Club Origen (Club B)** recibe la notificación + credenciales temporales del jugador
4. **Jugador** inicia sesión en `/pases` y firma el **Acta de Préstamo** (no Traspaso)
5. **FVF** hace auditoría final y pasa el trámite a `aprobado`
6. El jugador queda disponible para ser inscripto en el plantel del Club A

## Reglas Críticas
- **Sin Tesorería:** Al aprobar un préstamo, el sistema NO debe crear un movimiento en `treasury_movements`
- **Acta Diferenciada:** El acta en `/pases` debe mostrar "PRÉSTAMO" o "TRASPASO" según `tipo_pase`
- **Disponibilidad en Plantel:** Al aprobarse, el jugador queda disponible para ser asignado AL PLANTEL DEL CLUB SOLICITANTE (Club A). Sin embargo, sigue perteneciendo al Club Origen en términos de padrón permanente.
- **Notificación de Credenciales:** Igual que el pase definitivo — las credenciales llegan ÚNICAMENTE al Club Origen (Club B). El Club Solicitante NO ve la contraseña.

## Integración con el Panel Admin
- En la Mesa de Entrada (`/admin/tramites/pases`), el tipo de pase se muestra en el listado con una badge PRÉSTAMO o DEFINITIVO
- Al aprobar un PRÉSTAMO, se omite la lógica de Tesorería
- El estado de aprobación final activa la disponibilidad del jugador en el plantel del Club A

## Retorno Automático (Workflow de expiración)
Al llegar a las 00:00 (medianoche), un script `pg_cron` de Supabase ejecutará la función `fvf_procesar_retornos_prestamos_expirados()`.
Dicha función escanea todos los pases que estén en estado `completado`, con `tipo_pase='prestamo'`, y donde `fecha_hasta < CURRENT_DATE`. 
Para esos jugadores, se actualizará su `team_id` forzosamente al `origen_club_id` y su `squad_id` quedará en null, efectivamente retornándolos y finalizando la vigencia deportiva en el club de destino.
