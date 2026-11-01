import { renderHook, act } from '@testing-library/react';
import { TemaProvider } from '../../context/TemaContext';
import { useTema } from '../../context/useTema';

describe('useTema', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('inicia en oscuro por defecto', () => {
    const { result } = renderHook(() => useTema(), { wrapper: TemaProvider });
    expect(result.current.tema).toBe('oscuro');
  });

  it('alterna a claro y persiste en localStorage', () => {
    const { result } = renderHook(() => useTema(), { wrapper: TemaProvider });
    act(() => result.current.alternarTema());
    expect(result.current.tema).toBe('claro');
    expect(window.localStorage.getItem('motopreview-tema')).toBe('claro');
  });

  it('alterna de vuelta a oscuro', () => {
    const { result } = renderHook(() => useTema(), { wrapper: TemaProvider });
    act(() => result.current.alternarTema());
    act(() => result.current.alternarTema());
    expect(result.current.tema).toBe('oscuro');
  });

  it('lee el tema guardado al montar', () => {
    window.localStorage.setItem('motopreview-tema', 'claro');
    const { result } = renderHook(() => useTema(), { wrapper: TemaProvider });
    expect(result.current.tema).toBe('claro');
  });
});
