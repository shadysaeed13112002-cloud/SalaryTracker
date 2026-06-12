/**
 * Legacy /login route — redirects to /signin
 * Kept for backwards compatibility with bookmarks and links.
 */
import { redirect } from 'next/navigation';

export default function LoginPage() {
  redirect('/signin');
}
