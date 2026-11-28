import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { expectNoA11yViolations } from '@/test/axe';
import { renderRoute } from '@/test/render';
import {
  PROFILE_URL,
  MAIN_ADDRESS,
  PROFILE,
  signedIn,
  sentBody,
  sectionNav,
} from './profileTestSupport';

describe('ProfilePage', () => {
  it('shows the identification first, with what is missing in each section', async () => {
    signedIn();

    renderRoute('/cooperative/la-litoralena/profile');

    expect(await screen.findByRole('heading', { level: 1, name: 'Ficha' })).toBeVisible();
    expect(await screen.findByRole('textbox', { name: 'Nombre de la entidad' })).toHaveValue(
      'La Litoraleña',
    );
    expect(screen.getByRole('textbox', { name: 'CUIT' })).toHaveValue('30-71234567-1');
    expect(screen.getByRole('textbox', { name: 'CUIT' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'Tipo de entidad' })).toHaveValue(
      'Empresa recuperada',
    );
    expect(screen.getByRole('link', { name: 'Ver ficha pública' })).toHaveAttribute(
      'href',
      '/organizations/la-litoralena',
    );

    const nav = sectionNav();
    expect(within(nav).getByRole('button', { name: /Identificación/ })).toHaveAttribute(
      'aria-current',
      'step',
    );
    // The open section lists each piece of data, saying whether it is there ("completo") or missing ("falta").
    expect(within(nav).getByRole('button', { name: /Identificación/ })).toHaveTextContent(
      'Razón social: completo',
    );
    // The others only count them.
    expect(within(nav).getByRole('button', { name: /Actividad/ })).toHaveTextContent(/\d de 3/);
    expect(within(nav).getByRole('button', { name: /Contacto/ })).toHaveTextContent('1 de 7');

    await userEvent.click(within(nav).getByRole('button', { name: /Contacto/ }));

    expect(within(nav).getByRole('button', { name: /Contacto/ })).toHaveTextContent(
      'Horarios: falta',
    );
    expect(within(nav).getByRole('button', { name: /Contacto/ })).toHaveTextContent(
      'Sitio web: falta',
    );
    expect(within(nav).getByRole('button', { name: /Identificación/ })).toHaveTextContent(
      'Completo',
    );
  });

  it('warns before leaving the profile with changes that are not saved', async () => {
    signedIn();

    renderRoute('/cooperative/la-litoralena/profile');
    const name = await screen.findByRole('textbox', { name: 'Nombre de la entidad' });
    await userEvent.type(name, ' Ltda.');
    const menu = screen.getByRole('navigation', { name: 'Panel de la cooperativa' });
    await userEvent.click(within(menu).getByRole('link', { name: 'Inicio' }));

    const dialog = await screen.findByRole('dialog', { name: 'Tenés cambios sin guardar' });
    expect(screen.getByRole('heading', { level: 1, name: 'Ficha' })).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Tenés cambios sin guardar' })).toBeNull();
    });
    expect(screen.getByRole('textbox', { name: 'Nombre de la entidad' })).toHaveValue(
      'La Litoraleña Ltda.',
    );

    await userEvent.click(within(menu).getByRole('link', { name: 'Inicio' }));
    await userEvent.click(
      await within(await screen.findByRole('dialog')).findByRole('button', {
        name: 'Salir sin guardar',
      }),
    );
    await waitFor(() => {
      expect(screen.queryByRole('heading', { level: 1, name: 'Ficha' })).toBeNull();
    });
  });

  it('asks before leaving a section with changes that are not saved, and discards them if so', async () => {
    signedIn();

    renderRoute('/cooperative/la-litoralena/profile');
    const name = await screen.findByRole('textbox', { name: 'Nombre de la entidad' });
    await userEvent.type(name, ' (editado)');
    const sections = screen.getByRole('navigation', { name: 'Secciones de la ficha' });
    await userEvent.click(within(sections).getByRole('button', { name: /Actividad/ }));

    // It stays where it was if the person goes back.
    const dialog = await screen.findByRole('dialog', { name: 'Tenés cambios sin guardar' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByDisplayValue('La Litoraleña (editado)')).toBeInTheDocument();

    await userEvent.click(within(sections).getByRole('button', { name: /Actividad/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Descartar cambios' }));
    await userEvent.click(within(sections).getByRole('button', { name: /Identificación/ }));
    // The name is back to the saved one, without what was typed.
    expect(await screen.findByDisplayValue('La Litoraleña')).toBeVisible();
    expect(screen.queryByDisplayValue('La Litoraleña (editado)')).toBeNull();
    // With nothing pending, moving between sections does not ask.
    await userEvent.click(within(sections).getByRole('button', { name: /Actividad/ }));
    expect(screen.queryByRole('dialog', { name: 'Tenés cambios sin guardar' })).toBeNull();
  });

  it('does not warn when nothing changed, or when the changes were saved', async () => {
    signedIn({ [`PUT ${PROFILE_URL}/identification`]: { body: PROFILE } });

    renderRoute('/cooperative/la-litoralena/profile');
    const name = await screen.findByRole('textbox', { name: 'Nombre de la entidad' });
    await userEvent.type(name, 'X');
    await userEvent.clear(name);
    await userEvent.type(name, 'La Litoraleña');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await screen.findByText(/Guardamos los cambios/);
    const menu = screen.getByRole('navigation', { name: 'Panel de la cooperativa' });
    await userEvent.click(within(menu).getByRole('link', { name: 'Inicio' }));

    await waitFor(() => {
      expect(screen.queryByRole('heading', { level: 1, name: 'Ficha' })).toBeNull();
    });
    expect(screen.queryByRole('dialog', { name: 'Tenés cambios sin guardar' })).toBeNull();
  });

  it('explains the visibility of the data in a dialog', async () => {
    signedIn();

    renderRoute('/cooperative/la-litoralena/profile');
    await userEvent.click(await screen.findByRole('button', { name: '¿Quién ve mis datos?' }));

    const dialog = await screen.findByRole('dialog', { name: '¿Quién ve mis datos?' });
    expect(within(dialog).getByText('Visible para visitantes externos.')).toBeVisible();
    expect(within(dialog).getByText('Visible únicamente para el observatorio.')).toBeVisible();
    expect(within(dialog).getByText(/Lo configurás vos/)).toBeVisible();
  });

  it('opens the section in the URL and moves to the next one', async () => {
    signedIn();

    renderRoute('/cooperative/la-litoralena/profile?section=photos');

    expect(await screen.findByRole('heading', { name: 'Fotos' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Cargar logo' })).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Seguir con ubicación' }));

    expect(screen.getByRole('heading', { name: 'Ubicación' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Fotos' })).not.toBeInTheDocument();
  });

  it('saves the identification with the chosen visibility and reloads the account', async () => {
    const fetchMock = signedIn({
      [`PUT ${PROFILE_URL}/identification`]: {
        body: {
          ...PROFILE,
          identification: {
            name: 'La Litoraleña Nueva',
            legalName: 'La Litoraleña Ltda.',
            legalNameVisibility: 'PUBLIC',
          },
        },
      },
    });

    renderRoute('/cooperative/la-litoralena/profile');
    const name = await screen.findByRole('textbox', { name: 'Nombre de la entidad' });
    await userEvent.clear(name);
    await userEvent.type(name, 'La Litoraleña Nueva');
    const visibility = screen.getByRole('radiogroup', { name: 'Visibilidad de la razón social' });
    await userEvent.click(within(visibility).getByRole('radio', { name: 'Público' }));
    const meCalls = fetchMock.mock.calls.filter(([input]) => input === '/api/me').length;
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText(/Guardamos los cambios/)).toBeVisible();
    expect(sentBody(fetchMock, 'PUT', `${PROFILE_URL}/identification`)).toEqual({
      name: 'La Litoraleña Nueva',
      legalName: 'La Litoraleña Ltda.',
      legalNameVisibility: 'PUBLIC',
    });
    await waitFor(() => {
      expect(fetchMock.mock.calls.filter(([input]) => input === '/api/me').length).toBe(
        meCalls + 1,
      );
    });
  });

  it('asks for the name before saving', async () => {
    const fetchMock = signedIn();

    renderRoute('/cooperative/la-litoralena/profile');
    await userEvent.clear(await screen.findByRole('textbox', { name: 'Nombre de la entidad' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Ingresá el nombre de la entidad.')).toBeVisible();
    expect(sentBody(fetchMock, 'PUT', `${PROFILE_URL}/identification`)).toBeUndefined();
  });

  it('counts the characters of the name and stops at the limit', async () => {
    signedIn();

    renderRoute('/cooperative/la-litoralena/profile');
    const name = await screen.findByRole('textbox', { name: 'Nombre de la entidad' });
    expect(name).toHaveAttribute('maxlength', '50');
    await userEvent.clear(name);
    await userEvent.type(name, 'x'.repeat(60));

    expect(name).toHaveValue('x'.repeat(50));
    expect(screen.getByText('50/50')).toBeVisible();
  });

  it('asks to shorten a name saved before the limit existed', async () => {
    const longName = 'x'.repeat(80);
    const fetchMock = signedIn({
      [`GET ${PROFILE_URL}`]: {
        body: { ...PROFILE, identification: { ...PROFILE.identification, name: longName } },
      },
    });

    renderRoute('/cooperative/la-litoralena/profile');
    expect(await screen.findByText('80/50')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('El nombre puede tener hasta 50 caracteres.')).toBeVisible();
    expect(sentBody(fetchMock, 'PUT', `${PROFILE_URL}/identification`)).toBeUndefined();
  });

  it('counts the characters of the legal name and asks to shorten one over the limit', async () => {
    const fetchMock = signedIn({
      [`GET ${PROFILE_URL}`]: {
        body: {
          ...PROFILE,
          identification: { ...PROFILE.identification, legalName: 'x'.repeat(130) },
        },
      },
    });

    renderRoute('/cooperative/la-litoralena/profile');
    const legalName = await screen.findByRole('textbox', { name: 'Razón social' });
    expect(legalName).toHaveAttribute('maxlength', '120');
    expect(screen.getByText('130/120')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(
      await screen.findByText('La razón social puede tener hasta 120 caracteres.'),
    ).toBeVisible();
    expect(sentBody(fetchMock, 'PUT', `${PROFILE_URL}/identification`)).toBeUndefined();
  });

  it('saves the activity, leaving out what was not filled in', async () => {
    const fetchMock = signedIn({ [`PUT ${PROFILE_URL}/activity`]: { body: PROFILE } });

    renderRoute('/cooperative/la-litoralena/profile?section=activity');
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Textil' }));
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Descripción' }),
      'Pastas frescas desde 2003.',
    );
    await userEvent.type(screen.getByRole('textbox', { name: 'Cantidad de trabajadores' }), '45');
    const visibility = screen.getByRole('radiogroup', {
      name: 'Visibilidad de la cantidad de trabajadores',
    });
    await userEvent.click(within(visibility).getByRole('radio', { name: 'Privado' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await screen.findByText(/Guardamos los cambios/);
    expect(sentBody(fetchMock, 'PUT', `${PROFILE_URL}/activity`)).toEqual({
      sectors: ['FOOD', 'TEXTILE'],
      activityTypes: ['PRODUCT'],
      description: 'Pastas frescas desde 2003.',
      workerCount: 45,
      workerCountVisibility: 'PRIVATE',
    });
  });

  it('rejects a start year in the future', async () => {
    const fetchMock = signedIn();

    renderRoute('/cooperative/la-litoralena/profile?section=activity');
    await userEvent.type(
      await screen.findByRole('textbox', { name: 'Año de inicio' }),
      String(new Date().getFullYear() + 1),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText(/Ingresá un año entre 1800 y/)).toBeVisible();
    expect(sentBody(fetchMock, 'PUT', `${PROFILE_URL}/activity`)).toBeUndefined();
  });

  it('tells when a section could not be saved', async () => {
    signedIn({ [`PUT ${PROFILE_URL}/identification`]: { status: 500, body: { status: 500 } } });

    renderRoute('/cooperative/la-litoralena/profile');
    await screen.findByRole('textbox', { name: 'Nombre de la entidad' });
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos guardar los cambios');
  });

  it('tells when the profile could not be loaded', async () => {
    signedIn({ [`GET ${PROFILE_URL}`]: { status: 500, body: { status: 500 } } });

    renderRoute('/cooperative/la-litoralena/profile');

    expect(await screen.findByText('No pudimos cargar tu ficha')).toBeVisible();
  });

  it('has no accessibility violations', async () => {
    signedIn();

    const { container } = renderRoute('/cooperative/la-litoralena/profile?section=contact');
    await screen.findByRole('textbox', { name: 'Email de contacto' });

    await expectNoA11yViolations(container);
  });

  it('does not take more than four digits for the start year', async () => {
    signedIn();

    renderRoute('/cooperative/la-litoralena/profile?section=activity');
    const year = await screen.findByRole('textbox', { name: /Año de inicio/ });
    await userEvent.type(year, '200345');

    expect(year).toHaveValue('2003');
  });

  it('does not take more workers than the limit', async () => {
    signedIn();

    renderRoute('/cooperative/la-litoralena/profile?section=activity');
    const workers = await screen.findByRole('textbox', { name: /Cantidad de trabajadores/ });
    await userEvent.type(workers, '123456');

    expect(workers).toHaveValue('12345');
  });

  it('counts the characters of the description', async () => {
    signedIn();

    renderRoute('/cooperative/la-litoralena/profile?section=activity');
    const description = await screen.findByRole('textbox', { name: 'Descripción' });
    await userEvent.type(description, 'Hacemos remeras');

    expect(screen.getByText(/^15\/\d+$/)).toBeVisible();
    expect(screen.queryByRole('button', { name: /Agrandar|Achicar/ })).not.toBeInTheDocument();
  });

  // Every section is in the page at once, hidden or not, so a repeated id would point a label at another field.
  it('gives every field of every section its own id', async () => {
    signedIn({
      [`GET ${PROFILE_URL}`]: {
        body: {
          ...PROFILE,
          location: {
            addresses: [
              MAIN_ADDRESS,
              {
                id: 'a1',
                type: 'SECONDARY',
                address: MAIN_ADDRESS.address,
                streetVisibility: 'PUBLIC',
              },
            ],
          },
        },
      },
    });

    const { container } = renderRoute('/cooperative/la-litoralena/profile?section=location');
    await userEvent.click(await screen.findByRole('button', { name: /Dirección principal/ }));
    await userEvent.click(screen.getByRole('button', { name: /^Secundaria Rosario/ }));

    const ids = Array.from(container.querySelectorAll('[id]'), (element) => element.id);
    expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([]);
  });
});
