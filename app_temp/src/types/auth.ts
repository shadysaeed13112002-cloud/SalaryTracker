// Central role definitions — single source of truth.
// Mirrors the `user_role` ENUM from the DB schema.

export type UserRole = 'admin' | 'instructor';

export interface AppUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
}
