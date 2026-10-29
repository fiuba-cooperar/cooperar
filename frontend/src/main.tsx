import { StrictMode } from 'react';
import '@mantine/core/styles.css';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import './index.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root not found');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
