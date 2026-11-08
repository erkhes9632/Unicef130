import "server-only";

/**
 * Hook for optional notifications (e.g. e-mail to the club leaders) when a new application or
 * contact message arrives. Intentionally a no-op for now — implement here later
 * (Cloudflare Email Service, a webhook, etc.) without touching the form code.
 */
export type NewApplicationEvent = {
  id: string;
  fullName: string;
  className: string;
  createdAt: Date;
};
export type NewContactMessageEvent = { id: string; name: string; email: string; subject: string };

export async function notifyNewApplication(event: NewApplicationEvent): Promise<void> {
  void event;
}

export async function notifyNewContactMessage(event: NewContactMessageEvent): Promise<void> {
  void event;
}
