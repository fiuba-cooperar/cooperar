import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { fill } from '@/test/form';
import { renderRoute } from '@/test/render';
import { PROFILE_URL, PROFILE, signedIn, sentBody } from './profileTestSupport';

/** The opening hours of the contact section are a line with their summary; it opens the dialog to edit them. */
async function openHours() {
  const toggle = await screen.findByRole('button', { name: /Sin horarios cargados|: \d/ });
  await userEvent.click(toggle);
}

/** Picks a time of the list in one of the fields of the opening hours. */
async function setTime(name: string, time: string) {
  await userEvent.click(screen.getByRole('combobox', { name }));
  await userEvent.click(await screen.findByRole('option', { name: time }));
}

/** Closes the dialog of the opening hours without applying what was edited, confirming the discard if needed. */
async function closeHours(confirm = false) {
  await userEvent.keyboard('{Escape}');
  if (confirm) {
    await userEvent.click(await screen.findByRole('button', { name: 'Descartar cambios' }));
  }
  await waitFor(() => {
    expect(screen.queryByRole('dialog', { name: 'Horarios de atención' })).toBeNull();
  });
}

/** Applies the hours edited in the dialog to the form; the profile is saved with the button of the section. */
async function applyHours() {
  const dialog = await screen.findByRole('dialog', { name: 'Horarios de atención' });
  await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
}

describe('ProfilePage contact', () => {
  it('checks the email and the website, and sends only the filled in contact details', async () => {
    const fetchMock = signedIn({ [`PUT ${PROFILE_URL}/contact`]: { body: PROFILE } });

    renderRoute('/cooperative/la-litoralena/profile?section=contact');
    const email = await screen.findByRole('textbox', { name: 'Email de contacto' });
    await fill(email, 'no-es-un-email');
    await fill(screen.getByRole('textbox', { name: 'Sitio web' }), 'litoralena.org');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText(/Revisá el email/)).toBeVisible();
    expect(screen.getByText(/empezando con https:\/\//)).toBeVisible();
    expect(sentBody(fetchMock, 'PUT', `${PROFILE_URL}/contact`)).toBeUndefined();

    await userEvent.clear(email);
    await fill(email, 'hola@litoralena.org');
    await userEvent.clear(screen.getByRole('textbox', { name: 'Sitio web' }));
    const phoneVisibility = screen.getByRole('radiogroup', { name: 'Visibilidad de el teléfono' });
    await userEvent.click(within(phoneVisibility).getByRole('radio', { name: 'Privado' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await screen.findByText(/Guardamos los cambios/);
    expect(sentBody(fetchMock, 'PUT', `${PROFILE_URL}/contact`)).toEqual({
      phone: '(0341) 000-0000',
      phoneVisibility: 'PRIVATE',
      whatsappVisibility: 'PUBLIC',
      email: 'hola@litoralena.org',
      emailVisibility: 'PUBLIC',
      openingHours: [],
    });
  });

  // The rules of the hours are tested with the field alone (OpeningHoursField) and as functions (openingHoursForm);
  // here, only the dialog where they are edited and how they reach the profile.
  it('edits the hours in a dialog, and saves them only with the section', async () => {
    const fetchMock = signedIn({ [`PUT ${PROFILE_URL}/contact`]: { body: PROFILE } });

    renderRoute('/cooperative/la-litoralena/profile?section=contact');
    await openHours();
    await userEvent.click(await screen.findByRole('switch', { name: 'Lunes' }));
    await setTime('Lunes, apertura', '08:00');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar una franja el lunes' }));
    await applyHours();
    // The range added and left empty is dropped, and the hours are in the form but not yet in the profile.
    expect(await screen.findByRole('button', { name: /Lunes: 8:00 a 18:00/ })).toBeVisible();
    expect(sentBody(fetchMock, 'PUT', `${PROFILE_URL}/contact`)).toBeUndefined();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await screen.findByText(/Guardamos los cambios/);
    expect(sentBody(fetchMock, 'PUT', `${PROFILE_URL}/contact`)).toMatchObject({
      openingHours: [{ day: 'MONDAY', opensAt: '08:00', closesAt: '18:00' }],
    });
  });

  it('discards the hours edited in the dialog when it is closed without saving them', async () => {
    signedIn();

    renderRoute('/cooperative/la-litoralena/profile?section=contact');
    await openHours();
    await userEvent.click(await screen.findByRole('switch', { name: 'Miércoles' }));
    await userEvent.keyboard('{Escape}');
    // It asks before losing the edit, and keeps the dialog if the person goes back.
    expect(await screen.findByText(/se pierden los horarios que editaste/)).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('switch', { name: 'Miércoles' })).toBeChecked();
    await closeHours(true);

    await openHours();
    expect(await screen.findByRole('switch', { name: 'Miércoles' })).not.toBeChecked();
  });

  it('keeps the dialog open with the problem of a day, and applies nothing', async () => {
    const fetchMock = signedIn({ [`PUT ${PROFILE_URL}/contact`]: { body: PROFILE } });

    renderRoute('/cooperative/la-litoralena/profile?section=contact');
    await openHours();
    await userEvent.click(await screen.findByRole('switch', { name: 'Lunes' }));
    await userEvent.click(screen.getByRole('button', { name: 'Agregar una franja el lunes' }));
    await setTime('Lunes, franja 2, apertura', '19:00');
    await applyHours();

    expect(await screen.findByText('Completá la hora de apertura y la de cierre.')).toBeVisible();
    expect(screen.getByRole('dialog', { name: 'Horarios de atención' })).toBeVisible();
    expect(sentBody(fetchMock, 'PUT', `${PROFILE_URL}/contact`)).toBeUndefined();
  });

  it('asks for the phone as an area code and a number, and saves it formatted', async () => {
    const fetchMock = signedIn({ [`PUT ${PROFILE_URL}/contact`]: { body: PROFILE } });

    renderRoute('/cooperative/la-litoralena/profile?section=contact');
    // The phone of the profile comes split into its two fields.
    expect(await screen.findByRole('textbox', { name: 'Característica del teléfono' })).toHaveValue(
      '341',
    );
    expect(screen.getByRole('textbox', { name: 'Teléfono' })).toHaveValue('000-0000');

    const whatsappArea = screen.getByRole('textbox', { name: 'Característica del WhatsApp' });
    const whatsapp = screen.getByRole('textbox', { name: 'WhatsApp' });
    // Only digits go in the area code.
    await userEvent.type(whatsappArea, '1a1');
    expect(whatsappArea).toHaveValue('11');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByText('Completá la característica y el número.')).toBeVisible();

    // The number takes only digits, and the field draws the dash.
    await userEvent.type(whatsapp, '4444-a55');
    expect(whatsapp).toHaveValue('44-4455');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(
      await screen.findByText('Entre la característica y el número tienen que sumar 10 dígitos.'),
    ).toBeVisible();
    expect(sentBody(fetchMock, 'PUT', `${PROFILE_URL}/contact`)).toBeUndefined();

    await userEvent.type(whatsapp, '55');
    expect(whatsapp).toHaveValue('4444-5555');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await screen.findByText(/Guardamos los cambios/);
    expect(sentBody(fetchMock, 'PUT', `${PROFILE_URL}/contact`)).toMatchObject({
      phone: '(0341) 000-0000',
      whatsapp: '(011) 4444-5555',
    });
  });
});
