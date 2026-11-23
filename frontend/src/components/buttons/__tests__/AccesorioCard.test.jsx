import { render, screen, fireEvent } from '@testing-library/react';
import { CartProvider, useCart } from '../../../context/CartContext';
import { TemaProvider } from '../../../context/TemaContext';
import { MemoryRouter } from 'react-router-dom';
import AccesorioCard from '../AccesorioCard';

const accesorio = {
  id_accesorio: 'acc-1',
  acc_nombre: 'Escape deportivo',
  acc_precio: 150000,
  acc_estado: 'disponible',
  codigo_sku: 'SKU-001',
  imagen: null,
};

function Wrapper({ children }) {
  return (
    <MemoryRouter>
      <TemaProvider>
        <CartProvider>{children}</CartProvider>
      </TemaProvider>
    </MemoryRouter>
  );
}

describe('AccesorioCard', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('muestra el nombre y el precio formateado', () => {
    render(<AccesorioCard accesorio={accesorio} />, { wrapper: Wrapper });
    expect(screen.getByText('Escape deportivo')).toBeInTheDocument();
    expect(screen.getByText(/150/)).toBeInTheDocument();
  });

  it('muestra el badge "Disponible" cuando el estado es disponible', () => {
    render(<AccesorioCard accesorio={accesorio} />, { wrapper: Wrapper });
    expect(screen.getByText(/Disponible/)).toBeInTheDocument();
  });

  it('no muestra el badge cuando no está disponible', () => {
    render(<AccesorioCard accesorio={{ ...accesorio, acc_estado: 'agotado' }} />, { wrapper: Wrapper });
    expect(screen.queryByText(/Disponible/)).not.toBeInTheDocument();
  });

  it('no muestra el código SKU en la tarjeta', () => {
    render(<AccesorioCard accesorio={accesorio} />, { wrapper: Wrapper });
    expect(screen.queryByText('SKU-001')).not.toBeInTheDocument();
  });

  it('al hacer clic en el botón de agregar, el carrito recibe el item', () => {
    function ContadorCarrito() {
      const { totalItems } = useCart();
      return <span data-testid="cart-count">{totalItems}</span>;
    }
    render(
      <>
        <AccesorioCard accesorio={accesorio} />
        <ContadorCarrito />
      </>,
      { wrapper: Wrapper }
    );
    expect(screen.getByTestId('cart-count')).toHaveTextContent('0');
    const btn = screen.getByRole('button', { name: /agregar/i });
    fireEvent.click(btn);
    expect(screen.getByTestId('cart-count')).toHaveTextContent('1');
  });
});
