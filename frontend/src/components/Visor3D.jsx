import { Component, Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment } from '@react-three/drei';
import './Visor3D.css';

function ModeloReal({ url }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} scale={1.5} />;
}

function ModeloReemplazo() {
  return (
    <mesh rotation={[0.4, 0.6, 0]}>
      <torusKnotGeometry args={[1, 0.35, 128, 32]} />
      <meshStandardMaterial color="#0E6E6E" metalness={0.4} roughness={0.3} />
    </mesh>
  );
}

class ErrorBoundary3D extends Component {
  constructor(props) {
    super(props);
    this.state = { huboError: false };
  }
  static getDerivedStateFromError() {
    return { huboError: true };
  }
  componentDidCatch() {
    this.props.onError?.();
  }
  render() {
    if (this.state.huboError) return null;
    return this.props.children;
  }
}

function ModeloConFallback({ url }) {
  const [fallo, setFallo] = useState(false);

  if (fallo || !url) return <ModeloReemplazo />;

  return (
    <ErrorBoundary3D onError={() => setFallo(true)}>
      <ModeloReal url={url} />
    </ErrorBoundary3D>
  );
}

export default function Visor3D({ url, nombreAccesorio }) {
  return (
    <div className="visor3d">
      <Canvas camera={{ position: [3, 2, 3], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <Suspense fallback={null}>
          <ModeloConFallback url={url} />
          <Environment preset="city" />
        </Suspense>
        <OrbitControls enablePan={false} minDistance={2} maxDistance={8} />
      </Canvas>
      {!url && (
        <p className="visor3d__aviso">
          {nombreAccesorio} aún no tiene un modelo 3D real cargado — mostrando vista de referencia.
        </p>
      )}
    </div>
  );
}