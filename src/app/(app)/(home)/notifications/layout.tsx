// Force dynamic rendering for notifications page
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
