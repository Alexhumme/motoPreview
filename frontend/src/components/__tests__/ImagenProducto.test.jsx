import { render, screen } from '@testing-library/react';
import { TemaProvider } from '../../context/TemaContext';
import ImagenProducto from '../ImagenProducto';

function renderConTema(ui, tema = 'oscuro') {
  // Fuerza el tema inicial vía localStorage antes de montar.
  window.localStorage.setItem('motopreview-tema', tema);
  return render(<TemaProvider>{ui}</TemaProvider>);
}

describe('ImagenProducto', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('usa el placeholder oscuro cuando no hay src en tema oscuro', () => {
    renderConTema(<ImagenProducto alt="Foto de prueba" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/placeholder_pendiente_oscuro.png');
  });

  it('usa el placeholder claro cuando no hay src en tema claro', () => {
    renderConTema(<ImagenProducto alt="Foto de prueba" />, 'claro');
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/placeholder_pendiente.png');
  });

  it('usa el src proporcionado cuando existe', () => {
    renderConTema(<ImagenProducto src="https://example.com/foto.jpg" alt="Foto" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/foto.jpg');
  });

  it('aplica la clase CSS recibida', () => {
    renderConTema(<ImagenProducto src="x.jpg" className="product-image" alt="Foto" />);
    const img = screen.getByRole('img');
    expect(img).toHaveClass('product-image');
  });
});
