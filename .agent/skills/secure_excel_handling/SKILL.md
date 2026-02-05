---
name: Secure Excel Handling
description: Guía crítica y mandatoria para la generación segura de archivos Excel. PROHÍBE el uso de la librería xlsx (SheetJS) debido a vulnerabilidades.
---

# Secure Excel Handling

## 🚨 ALERTA DE SEGURIDAD CRÍTICA

**ESTÁ ESTRICTAMENTE PROHIBIDO EL USO DE LA LIBRERÍA `xlsx` (SheetJS)** en este proyecto.
Esta librería tiene vulnerabilidades de seguridad conocidas (CVE) y ha sido deprecada en favor de alternativas más modernas y seguras.

## ✅ La Librería Oficial: `exceljs`

Para cualquier tarea que involucre crear, leer o manipular archivos Excel (.xlsx), DEBES usar `exceljs`.

### Por qué `exceljs`?
- **Seguridad**: Mantenida y sin las vulnerabilidades críticas de `xlsx`.
- **Funcionalidad**: Soporte robusto para estilos, imágenes y formatos complejos.
- **Async**: API basada en Promesas, ideal para entornos modernos.

## Snippet de Implementación Estándar

Usa este patrón para generar descargas de Excel en el cliente:

```typescript
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const exportToExcel = async (data: any[], fileName: string) => {
    // 1. Crear Workbook y Worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Datos');

    // 2. Definir Columnas
    worksheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Nombre', key: 'name', width: 30 },
        { header: 'Fecha', key: 'date', width: 15 },
    ];

    // 3. Agregar filas
    worksheet.addRows(data);

    // 4. Estilos (Opcional pero recomendado)
    worksheet.getRow(1).font = { bold: true };

    // 5. Generar Buffer y Descargar
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    saveAs(blob, `${fileName}.xlsx`);
};
```

## Migración

Si encuentras código legacy importando `xlsx`:
1. **Reportalo**: Avísale al usuario o crea un plan de refactorización.
2. **Reemplázalo**: Reescribe la función usando `exceljs` siguiendo el patrón de arriba.
