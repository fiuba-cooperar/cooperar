import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <>
      <h1>Página no encontrada</h1>
      <p>
        La dirección que buscás no existe. <Link to="/">Volver al inicio</Link>
      </p>
    </>
  );
}
