/** Only the password recovery destination is accepted from an auth callback. */
export function postAuthDestination(next: string | null): '/' | '/update-password' {
  return next === '/update-password' ? '/update-password' : '/';
}
