import type { CurrentUserResponse } from '@/api/generated/model';

type NamedUser = Pick<CurrentUserResponse, 'email' | 'firstName' | 'lastName'>;

function fullName({ firstName, lastName }: NamedUser): string {
  return [firstName, lastName].filter(Boolean).join(' ');
}

/** First and last name, or the email when the account has no name (the initial admin may not). */
export function displayName(user: NamedUser): string {
  return fullName(user) || user.email;
}

/** Two uppercase letters for the avatar: the initials of the name, or the start of the email. */
export function initials(user: NamedUser): string {
  const words = fullName(user).split(' ').filter(Boolean);
  const letters =
    words.length > 1 ? words.map((word) => word.charAt(0)).join('') : (words[0] ?? user.email);
  return letters.slice(0, 2).toUpperCase();
}
