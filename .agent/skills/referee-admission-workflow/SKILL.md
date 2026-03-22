---
name: referee-admission-workflow
description: Define el flujo de trabajo, reglas de negocio y ciclo de vida para la admisión de nuevos árbitros. Úsalo siempre que trabajes con la creación de perfiles arbitrales, diseño de interfaces de modo restringido, aprobaciones, rechazos e integraciones financieras con tesorería.
---
# Flujo de Admisión y Ecosistema Arbitral

## Objetivo
Garantizar un flujo seguro y controlado para los nuevos árbitros que se registran en la plataforma, asegurando que no tengan acceso al sistema hasta que la Administración valide su pago, y automatizando el impacto financiero de su alta.

## Reglas de Estado y Seguridad (Máquina de Estados)
1. **Estado Inicial (Pendiente):** Cuando la Administración crea un perfil de árbitro, su estado por defecto OBLIGATORIO es "pendiente" (en minúsculas para coincidir con la base de datos).
2. **Arquitectura de Base de Datos:** Los Árbitros en estado pendiente **NO tienen un `user_id` asociado** aún. Sus datos (nombre, apellido, email) residen directamente en las columnas `first_name`, `last_name` y `email` de la tabla `referees`. **IMPORTANTE:** No intentes hacer JOIN con la tabla `profiles` para obtener estos datos durante la validación o causará que no aparezcan en las listas.
3. **Modo Restringido (UX):** Si un usuario con estado "pendiente" inicia sesión, NO debe poder navegar por la app. 
   - Oculta o bloquea completamente el menú lateral y redirecciona a un Layout Restringido.
   - Renderiza únicamente una pantalla limpia con este texto exacto: *"Tu perfil está siendo evaluado por la Administración. Por favor, envía tu comprobante de pago de la Temporada 2026 por los canales oficiales para ser habilitado."*
   - **Restricción:** No debe haber ningún botón para subir archivos en esta vista.

## Flujo de Resolución (Mesa de Entrada Administrativa)
Los perfiles "pendientes" deben intergrarse en la vista general unificada de la **Mesa de Entrada** (/admin/tramites).
**Consideración de Código:** Dado que los árbitros usan `status === 'pendiente'`, asegúrate de incluir esta condición explícita al renderizar botones de acción (ej. `showActions`), ya que los Trámites y Jugadores usan otros estados como 'en_revision' o 'pending'.

### Caso A: Rechazo (Soft Delete - OBLIGATORIO)
Si la administración rechaza al árbitro, **NUNCA ejecutes un DELETE físico** en la base de datos para evitar romper relaciones (foreign keys). En su lugar, aplica un borrado lógico o *Soft Delete* (cambiando el `status` a 'rechazado'), mediante un endpoint en `/api/admin/reject-referee`.

### Caso B: Aprobación e Impacto Financiero
Si la administración acepta al árbitro, la vista de la Mesa de Entrada debe incluir una advertencia de "Validación Manual Requerida". Al confirmar, deben ocurrir las siguientes acciones mediante una API transaccional (`/api/admin/approve-referee`):
1. El estado del árbitro cambia a "activo", otorgándole acceso total a la plataforma.
2. **Impacto en Tesorería:** El sistema debe insertar automáticamente un ingreso en la tabla `treasury_movements` bajo el concepto pertinente a Inscripción de Árbitro. 
   - El monto de este ingreso debe consultarse dinámicamente (`getFee`) desde la lista `procedure_fees` de la tabla `settings`, buscando el **Ítem 9**.
