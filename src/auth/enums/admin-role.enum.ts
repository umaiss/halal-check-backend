/**
 * Represents the possible roles for an admin user.
 * - `admin`    : Full access — can manage products, users, and other assignees.
 * - `assignee` : Limited access — can view and process assigned tasks only.
 */
export enum AdminRole {
  ADMIN = 'admin',
  ASSIGNEE = 'assignee',
}
