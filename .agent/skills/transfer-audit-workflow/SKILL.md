---
name: transfer-audit-workflow
description: Define las reglas de negocio, la máquina de estados de 7 pasos y el flujo de auditoría para los trámites de pases de jugadores entre clubes. Úsalo siempre que trabajes con transferencias, validación de comprobantes de pago, firmas de jugadores menores de edad y notificaciones internas de pases.
---

# Flujo de Auditoría de Pases de Jugadores (Máquina de Estados)

## Objetivo
Controlar estrictamente el ciclo de vida de un pase de jugador (transferencia) garantizando que se cumplan las validaciones de pago, las firmas legales (especialmente de menores de edad) y las reglas de privacidad en las notificaciones.

## Instrucciones y Máquina de Estados (7 Pasos Estrictos)
Al desarrollar o analizar el código de pases, debes asegurar que el flujo siga EXACTAMENTE estos estados en orden:

1. **Inicio (Club Solicitante - Club A):** El Club A inicia el trámite con el DNI del jugador. Es OBLIGATORIO adjuntar el comprobante de pago. Al enviar, pasa a FVF.
2. **Revisión Inicial (FVF):** La Administración revisa el comprobante de pago. Si es correcto, aprueba y avanza.
3. **Notificación (Club Solicitado - Club B):** El trámite llega a la bandeja de entrada del Club Solicitado (Club de Origen del jugador). Mientras tanto, el Club A solo puede observar el progreso en modo solo-lectura.
4. **Decisión (Club Origen del jugador - Club B):** 
   - **Si rechaza:** Es OBLIGATORIO requerir un motivo escrito. Este motivo se envía por Mensajería Interna al Club Solicitante (Club A). El trámite se neutraliza.
   - **Si aprueba:** Firman de conformidad. El sistema genera credenciales temporales en una nueva Fase para el jugador, alertando que el usuario/credencial expirará en 72 horas.
   - **Notificación de credenciales:** El mensaje interno con el usuario temporal y contraseña le debe llegar ÚNICAMENTE al Club Solicitado (Club B) y a la Administración FVF. **Es responsabilidad humana del Dirigente/Técnico del Club B (o FVF) entregar estas credenciales al jugador.**
   - **Vencimiento (72hs):** Si el jugador NO firma dentro de las 72 horas, la cuenta expira, las credenciales se bloquean para siempre y el trámite COMPLETO **se cancela automáticamente**. El Club A deberá tramitar todo de cero.
5. **Firma (Jugador):** El jugador ingresa con sus credenciales y firma dentro del plazo definido. **Regla de Menores:** Si el jugador es menor de 18 años, el sistema debe exigir obligatoriamente la firma y DNI del padre/madre/tutor.
6. **Auditoría Final (FVF):** La FVF recibe todas las verificaciones documentales e historial de firmas.
   - **Aprobación:** FVF acepta y avanza.
   - **Soft Reject (Rechazo Suave):** Si hay un error documental (ej. imagen borrosa), NO se cancela el trámite completo. Cambia el estado a 'Rechazado Temporalmente' y **la solicitud vuelve a la bandeja del Club Solicitante (Club A)** para que ellos corrijan el documento. Las firmas previas se conservan.
7. **Ejecución Final:** El jugador es transferido y se envía un Mensaje Interno confirmando el éxito a ambos clubes.

## ⚠️ RESTRICCIONES CRÍTICAS (Constraints)
- **Privacidad de Notificaciones (Fase Credenciales):** Las credenciales temporales se envían EXCLUSIVAMENTE a la Administración y al Club de Origen (Club B). **El jugador NUNCA recibe este mensaje por medios automáticos, y el Club Solicitante (Club A) no debe enterarse de la contraseña.**
- **Visibilidad del Club A:** El Club A **sólo puede esperar y ver textos simples** genéricos sobre el estado (ej. "Estado: Esperando firma del Club Origen", "Estado: Esperando firma del Jugador").
- **Preservación de Datos:** En el paso 6 (Soft Reject), por ningún motivo la base de datos debe eliminar los registros de firmas obtenidos en los pasos 4 y 5.
