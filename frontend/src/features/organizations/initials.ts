/** The capitalized words of a name, two at most, for the avatar of an organization without a logo. */
export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter((word) => /^\p{Lu}/u.test(word))
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('');
}
