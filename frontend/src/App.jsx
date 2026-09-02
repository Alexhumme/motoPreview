import { Routes, Route } from 'react-router-dom';
import Login from './pages/auth/Login';
import Catalogo from './pages/public/Catalogo';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Catalogo />} />
    </Routes>
  );
}

export default App;