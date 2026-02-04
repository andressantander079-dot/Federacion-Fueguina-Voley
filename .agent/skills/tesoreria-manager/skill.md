---
name: "Gerente de Tesorería"
description: "Experto en el módulo administrativo de Tesorería (Fintech), control de caja, auditoría y puente contable."
triggers:
  - "crear tesoreria"
  - "modulo finanzas"
  - "logica caja"
  - "reporte cierre"
---

# Contexto y Stack
- **Stack:** React + TypeScript + Tailwind CSS + Supabase.
- **Rol:** Módulo de alta eficiencia contable y seguridad.

# Reglas de Negocio (Estrictas)

## 1. Acceso y Seguridad (UI/UX)
- **Mosaico:** Nuevo Tile "Tesorería" en Dashboard Admin.
- **Bloqueo:** Modal/Pantalla de bloqueo obligatoria al intentar entrar.
- **PIN:** "0259" (Hardcoded). Validación estricta antes de mostrar datos sensibles.

## 2. Arquitectura del Módulo (Jerarquía)

### A. Configuración Estructural ("Cerebro Contable")
- **Plan de Cuentas Espejo:** Mapeo 1:1 entre "Acción Deportiva" (ej: Fichaje) y "Cuenta Contable" (ej: 4.1.02).
- **Centros de Costos:** Categorías imputables (ej: "Selección Sub-18", "Mantenimiento").

### B. Gestión de Ingresos (Automatización)
- **Pasarela (Trámites):** Pago confirmado -> Genera Recibo PDF automático -> Asiento contable automático.
- **Subsidios/Patrocinios:**
    - Registro manual con campos: Entidad, Monto, Fecha.
    - **Repositorio Legal:** Adjuntar PDF (Contrato).
    - **Alertas:** Notificación de feche límite para rendición de cuentas.

### C. Gestión de Egresos (Validación Fiscal)
- **Bloqueo Fiscal:** No permitir carga sin datos obligatorios.
- **Repositorio (OCR):** Subida de comprobante (Foto/PDF).
- **Clasificación:** Proveedor + Tipo Gasto + Centro de Costos.

### D. Herramientas de Control (Auditoría)
- **Conciliación:** Importar extracto bancario -> Match con movimientos internos.
- **Dashboard Presupuestario:** Barra de progreso (Presupuestado vs Ejecutado).

### E. Puente Contable (Exportación - Crítico)
Botón "Exportar Cierre Mensual" genera ZIP con:
1.  **Libro_IVA.csv:** (Fecha, CUIT, Razón Social, Neto, IVA, Total, Cuenta).
2.  **Comprobantes.pdf:** Todas los facturas merg-eadas cronológicamente.
3.  **Reporte_Caja.xlsx:** (Saldo Inicial + Ingresos - Egresos = Final).
4.  **Exportacion_Fiscal.txt:** Estructura plana para aplicativo (Retenciones).

# Instrucciones de Generación de Código

1.  **Base de Datos (Supabase):**
    - `treasury_accounts`: Plan de cuentas.
    - `treasury_movements`: Movimientos (con FK a cuentas y centros de costo).
    - `treasury_documents`: Links a archivos en Storage (Facturas/Contratos).
    - `treasury_budget`: Presupuestos asignados.

2.  **UI Components:**
    - `SecurityLock.tsx`: Manejo del PIN.
    - `AccountingMapper.tsx`: UI para configurar el plan de cuentas.
    - `FiscalUploader.tsx`: Componente de subida con validación de campos fiscales.
    - `MonthlyExportBtn.tsx`: Generador del ZIP client-side (JSZip).

3.  **Tecnologías:**
    - `jspdf` para recibos/merging.
    - `xlsx` para reportes Excel.
    - `jszip` para empaquetado final.
