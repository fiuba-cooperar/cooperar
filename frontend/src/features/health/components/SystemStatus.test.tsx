import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderRoute } from '@/test/render';
import { stubFetchJson, stubFetchNetworkError } from '@/test/http';
import { SystemStatus } from './SystemStatus';

const renderStatus = () => renderRoute('/', [{ path: '/', element: <SystemStatus /> }]);

describe('SystemStatus', () => {
  it('queries the backend health endpoint', async () => {
    const fetchMock = stubFetchJson({ status: 'UP', database: 'UP' });

    renderStatus();

    expect(await screen.findByText(/funcionan correctamente/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/health', expect.anything());
  });

  it('shows that the database is down when the backend answers 503', async () => {
    stubFetchJson({ status: 'DOWN', database: 'DOWN' }, 503);

    renderStatus();

    expect(await screen.findByText(/base de datos no está disponible/)).toBeInTheDocument();
  });

  it('shows a connection error when the backend is unreachable', async () => {
    stubFetchNetworkError();

    renderStatus();

    expect(await screen.findByText(/No pudimos conectarnos/)).toBeInTheDocument();
  });

  it('announces the status to assistive technologies', async () => {
    stubFetchJson({ status: 'UP', database: 'UP' });

    renderStatus();

    expect(screen.getByRole('status')).toHaveTextContent(/Consultando/);
    await screen.findByText(/funcionan correctamente/);
    expect(screen.getByRole('status')).toHaveTextContent(/funcionan correctamente/);
  });
});
