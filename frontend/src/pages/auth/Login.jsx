import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROL_ADMIN, ROL_VENDEDOR } from '../../constants/roles';

export default function Login() {
  const [usu_email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

 async function manejarSubmit(e) {
  e.preventDefault();
  setError('');
  try {
    const usuarioLogueado = await login(usu_email, password);
    if (usuarioLogueado.id_rol === ROL_ADMIN || usuarioLogueado.id_rol === ROL_VENDEDOR) {
      navigate('/admin');
    } else {
      navigate('/');
    }
  } catch (err) {
    setError('Credenciales inválidas');
  }
}

  return (
    <div style={{ maxWidth: 400, margin: '50px auto' }}>
      <h2>Iniciar sesión</h2>
      <form onSubmit={manejarSubmit}>
        <div>
          <label>Email</label>
          <input type="email" value={usu_email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%' }} />
        </div>
        <div style={{ marginTop: 10 }}>
          <label>Contraseña</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%' }} />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" style={{ marginTop: 10 }}>Entrar</button>
      </form>
    </div>
  );
}