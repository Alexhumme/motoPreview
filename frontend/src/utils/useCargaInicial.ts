// Hook personalizado para refactorizar el patrón useEffect + useRef guard + fetch + setState
// Reutilizable en: Accesorios, Inventario, Usuarios, Tienda, Tiendas, ResumenTienda, Cotizaciones, Dashboard, Reportes, Seguridad

import { useEffect, useRef, useState } from 'react';

interface CargaInicialOptions<T> {
  fetch: () => Promise<T>;
  immediate?: boolean;
}

export function useCargaInicial<T>(fetch: () => Promise<T>, options: CargaInicialOptions = { immediate: true }) {
  const { immediate = true } = options;
  const [datos, setDatos] = useState<T | null>(null);
  const [cargando, setCargando] = useState(immediate ? true : false);
  const [error, setError] = useState<string | null>(null);
  const llamadoRef = useRef<boolean>(false);

  useEffect(() => {
    if (llamadoRef.current) return;
    if (!immediate) return;
    llamadoRef.current = true;

    async function cargar() {
      try {
        setCargando(true);
        const resultado = await fetch();
        setDatos(resultado);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : 'Error desconocido al cargar datos'
        );
      } finally {
        setCargando(false);
      }
    }

    cargar();
  }, [fetch]);

  return { datos, cargando, error };
}

export default useCargaInicial;
