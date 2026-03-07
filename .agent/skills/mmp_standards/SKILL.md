---
name: MMP Standards & Zero Friction
description: Reglas críticas para el desarrollo de la Fase 2 (Minimum Marketable Product), incluyendo Onboarding, Validaciones y Notificaciones In-App.
---

# Minimum Marketable Product (MMP) Standards

Para que la plataforma de FVU alcance nivel comercial (MMP) y garantice una experiencia sin fricciones (Zero Friction), todo componente o vista desarrollada debe adherirse a los siguientes 4 principios cardinales.

## 1. Onboarding y Empty States (Cero Pantallas Vacías)
- **Nunca** renderizar una tabla vacía o un espacio en blanco si no hay datos.
- **Siempre** proveer un "Empty State": un ícono grande (usar `lucide-react`), un título descriptivo ("No hay planteles creados"), una breve explicación y un botón de "Llamada a la Acción" (Call to Action - CTA) para ayudar al usuario a dar el primer paso.

## 2. Robustez y Edge Cases (Validaciones Defensivas)
- No confiar exclusivamente en el frontend. Validar en el backend (API o Server Actions) datos críticos como: unicidad de DNI, unicidad de correos electrónicos, y restricciones lógicas (ej. edad para una categoría).
- Mostrar siempre feedback visual inmediato mediante Notificaciones Toast (rojo para error, verde para éxito) explicando *exactamente* qué salió mal, en lugar de un error genérico "Error 500".

## 3. Notificaciones Transaccionales In-App
- Dado que las cuentas de los Clubes son creadas por la Administración y no poseen validación de email real, **NO** enviar correos usando servicios externos (SendGrid/Resend).
- Toda comunicación transaccional (ej: "Trámite Aprobado", "Partido Programado", "Sanción Aplicada") debe insertarse directamente en la tabla `messages` (y `message_recipients`), para que aparezca como un correo interno en la sección `/club/mensajes`.
- Sistema emisor para notificaciones automáticas: `sender_id` debe ser el ID del Admin o un UUID especial de sistema, y usar `priority = 'high'` para destacar.

## 4. Analítica de Valor (Dashboards)
- Las vistas de resumen (`/admin/treasury`, `/admin`, `/club`) deben mostrar más que simples listas.
- Se deben calcular KPIs (Key Performance Indicators) como: Ingresos del Mes vs Mes Pasado, Cantidad de Jugadores Promedio por Club, etc.
- Utilizar barras de progreso, badges de colores y estadísticas resumidas para facilitar la lectura de los datos.
