---
name: dt-management-workflow
description: Define las reglas de negocio, validación condicional de DNI, reactivación de perfiles y el ciclo de vida para la gestión de Directores Técnicos (DTs). Úsalo siempre que trabajes con la inscripción de técnicos, validaciones de identidad, bajas de personal, asignación a planteles y auditoría de la Federación.
---
# Flujo de Gestión y Auditoría de Directores Técnicos (DTs)

## Objetivo
Garantizar la unicidad de los perfiles de los técnicos en la base de datos, manejando correctamente sus transferencias entre clubes mediante "Reactivación de Perfil", aplicando bajas lógicas (Soft Delete) y automatizando el impacto financiero sin generar credenciales de acceso.

## Reglas de Negocio Estrictas (Máquina de Estados)

### 1. Validación Condicional de DNI (CRÍTICO)
Al intentar inscribir un DT, el sistema debe consultar el DNI en la base de datos:
- **Si el DNI está 'Habilitado' o 'Pendiente' en cualquier club:** Arrojar ERROR BLOQUEANTE con el texto exacto: *"Este DNI ya se encuentra activo o en trámite en otro club. El club actual debe darle de baja primero."*
- **Si el DNI está en 'Baja/Inactivo':** Permitir el trámite e iniciar el flujo de "Reactivación de Perfil".
- **Si el DNI no existe:** Iniciar trámite como registro nuevo.

### 2. Reactivación de Perfil (Manejo de Base de Datos)
Si un club inscribe a un DT en estado 'Baja/Inactivo', **NO crees un usuario nuevo**. 
- Actualiza el `club_id` del registro existente al del nuevo club solicitante.
- Cambia su estado de 'Baja/Inactivo' a 'Pendiente'.
- Exige obligatoriamente que el nuevo club suba una nueva foto del DNI y el comprobante de pago.

### 3. Auditoría FVF y Tesorería
El trámite viaja a la bandeja de la Federación:
- **Rechazo Suave (Soft Reject):** Si la FVF rechaza (ej. foto borrosa), el estado cambia a 'Rechazado'. Se exige motivo obligatorio. Vuelve a la bandeja del club permitiendo reemplazar archivos sin perder los datos ya cargados.
- **Aprobación e Impacto Financiero:** Si la FVF aprueba, el estado cambia a 'Habilitado'. El sistema inserta un ingreso en Tesorería bajo el concepto: *"Ítem #5: Inscripción de Técnicos ([Club] - [Nombre del Técnico])"*. **El monto de este ítem DEBE buscarse leyendo dinámicamente la tabla de tarifarios/aranceles de la administración.**

### 4. Reglas de Baja (Soft Delete y Protección)
Si un club intenta 'Dar de baja' a un Técnico:
- **Verificación:** Si el DT está asignado a algún plantel activo, BLOQUEAR la acción con el mensaje: *"No puedes eliminar a este técnico porque dirige planteles activos. Asigna un reemplazo primero."*
- **Ejecución (Soft Delete):** Si no tiene planteles, cambia su estado a 'Baja/Inactivo'. **NUNCA ejecutes un DELETE físico en la base de datos.**

### 5. RESTRICCIÓN DE CREDENCIALES
Bajo ninguna circunstancia este flujo debe crear usuarios de sistema ni contraseñas para los Directores Técnicos. Su gestión es puramente administrativa y no requieren login en la plataforma.
