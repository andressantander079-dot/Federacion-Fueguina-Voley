// src/lib/useConfig.ts
import { useState, useEffect } from 'react';
import { supabase } from './supabase'; // Asegúrate que esta ruta sea correcta según tu estructura

// 1. Definimos los valores por defecto (Safety First)
// Si falla internet o la base de datos, el sistema usa esto para no romperse.
const DEFAULT_CONFIG = {
  // General
  temporada_actual: 'Temporada 2026',
  mensaje_global: '', // Si está vacío, no muestra alerta
  
  // Reglas
  libro_pases_abierto: true,
  listas_buena_fe_cerradas: false,
  
  // Economía (Valores $0 para detectar error visualmente si no carga)
  arancel_jugador: 0,
  arancel_equipo: 0,
  arancel_pase: 0,
  
  // Banco
  banco_nombre: 'Consultar Administración',
  banco_cbu: '',
  banco_alias: '',
  banco_titular: '',
  
  // Legal
  terminos_legales: 'Cargando términos...',
  
  // Contacto
  email_soporte: '',
  url_web: '',
  email_notificaciones: ''
};

export type AppConfig = typeof DEFAULT_CONFIG;

export function useConfig() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchConfig() {
      try {
        // A. Intentamos leer de la caché local primero (para velocidad instantánea)
        const cached = typeof window !== 'undefined' ? localStorage.getItem('federacion_config') : null;
        if (cached) {
          const parsed = JSON.parse(cached);
          // Verificamos si la caché es vieja (opcional: mayor a 1 hora)
          // Por ahora, cargamos la caché para mostrar algo rápido
          if (mounted) setConfig({ ...DEFAULT_CONFIG, ...parsed });
        }

        // B. Buscamos la config fresca en Supabase
        // Asumimos que existe una tabla 'system_settings' o similar con una sola fila
        // O que guardamos un JSON en una tabla de configuración clave-valor.
        
        // OPCIÓN 1: Si tienes una tabla con columnas (ej: id, key, value)
        // const { data, error } = await supabase.from('system_config').select('*');
        
        // OPCIÓN 2 (Recomendada para empezar): Usamos una tabla 'organization_settings' con 1 fila
        const { data, error } = await supabase
          .from('organization_settings')
          .select('*')
          .single(); // Trae la primera fila

        if (error) throw error;

        if (data && mounted) {
          // Mapeamos los datos de la DB a nuestro objeto de config
          // (Asegúrate que los nombres de columnas en DB coincidan con las claves de abajo)
          const newConfig = {
            ...DEFAULT_CONFIG,
            ...data // Sobrescribe los defaults con lo que venga de DB
          };

          setConfig(newConfig);
          
          // Guardamos en caché para la próxima recarga
          if (typeof window !== 'undefined') {
            localStorage.setItem('federacion_config', JSON.stringify(newConfig));
          }
        }

      } catch (err: any) {
        console.error("Error cargando configuración:", err.message);
        setError(err.message);
        // Si falla, nos quedamos con el DEFAULT_CONFIG o lo que había en caché
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchConfig();

    return () => { mounted = false; };
  }, []);

  return { config, loading, error };
}