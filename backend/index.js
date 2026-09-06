const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes'); 
const categoriaRoutes = require('./routes/categoriaRoutes');
const rolRoutes = require('./routes/rolRoutes');
const marcaRoutes = require('./routes/marcaRoutes');
const modeloMotoRoutes = require('./routes/modeloMotoRoutes');
const motoRoutes = require('./routes/motoRoutes');
const tiendaRoutes = require('./routes/tiendaRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const modelo3dRoutes = require('./routes/modelo3dRoutes');
const accesorioRoutes = require('./routes/accesorioRoutes');
const inventarioRoutes = require('./routes/inventarioRoutes');
const cotizacionRoutes = require('./routes/cotizacionRoutes');
const compatibilidadRoutes = require('./routes/compatibilidadRoutes');

const app = express();
app.set('trust proxy', 1);

app.use(cors({
  origin: [
    "http://localhost:5173",           // desarrollo local
    "https://motopreview.vercel.app",  // dominio principal en producción
    /\.vercel\.app$/                   // cualquier subdominio de vercel.app (previews)
  ],
  credentials: true
}));
app.options(/.*/, cors());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  next();
});

app.use(express.json());

app.use('/api/modelos-moto', modeloMotoRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/motos', motoRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/roles', rolRoutes);
app.use('/api/tiendas', tiendaRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/modelos-3d', modelo3dRoutes);
app.use('/api/marcas', marcaRoutes);
app.use('/api/accesorios', accesorioRoutes);
app.use('/api/compatibilidad', compatibilidadRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/cotizaciones', cotizacionRoutes);

app.get('/', (req, res) => {
  res.json({ mensaje: 'API de MotoPreview funcionando' });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
