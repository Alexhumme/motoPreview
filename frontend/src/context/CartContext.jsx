import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    const guardado = localStorage.getItem('carrito');
    return guardado ? JSON.parse(guardado) : [];
  });

  useEffect(() => {
    localStorage.setItem('carrito', JSON.stringify(items));
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