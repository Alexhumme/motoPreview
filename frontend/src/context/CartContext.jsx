import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

// Lee el carrito guardado sin romper la app si el dato está corrupto o el
// almacenamiento no está disponible (modo privado, datos manipulados, etc.).
function leerCarritoGuardado() {
  try {
    const guardado = JSON.parse(localStorage.getItem('carrito') || '[]');
    if (!Array.isArray(guardado)) return [];
    return guardado.filter(
      (linea) => linea?.accesorio?.id_accesorio && Number.isFinite(linea.cantidad) && linea.cantidad >= 1
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(leerCarritoGuardado);

  useEffect(() => {
    try {
      localStorage.setItem('carrito', JSON.stringify(items));
    } catch {
      // Sin almacenamiento disponible: el carrito sigue funcionando en memoria.
    }
  }, [items]);

  function agregarItem(accesorio) {
    setItems((prev) => {
      const existente = prev.find((i) => i.accesorio.id_accesorio === accesorio.id_accesorio);
      if (existente) {
        return prev.map((i) =>
          i.accesorio.id_accesorio === accesorio.id_accesorio
            ? { ...i, cantidad: i.cantidad + 1 }
            : i
        );
      }
      return [...prev, { accesorio, cantidad: 1 }];
    });
  }

  function actualizarCantidad(id_accesorio, cantidad) {
    if (cantidad < 1) return;
    setItems((prev) =>
      prev.map((i) => (i.accesorio.id_accesorio === id_accesorio ? { ...i, cantidad } : i))
    );
  }

  function eliminarItem(id_accesorio) {
    setItems((prev) => prev.filter((i) => i.accesorio.id_accesorio !== id_accesorio));
  }

  function vaciarCarrito() {
    setItems([]);
  }

  const totalItems = items.reduce((suma, i) => suma + i.cantidad, 0);
  const totalPrecio = items.reduce((suma, i) => suma + i.cantidad * Number(i.accesorio.acc_precio), 0);

  return (
    <CartContext.Provider
      value={{ items, agregarItem, actualizarCantidad, eliminarItem, vaciarCarrito, totalItems, totalPrecio }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}