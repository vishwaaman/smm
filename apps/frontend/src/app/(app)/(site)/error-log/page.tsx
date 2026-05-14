export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { ErrorLogDashboard } from '@gitroom/frontend/components/error-log/error-log.dashboard';

export const metadata: Metadata = {
  title: 'Error Log',
  description: 'Admin error log dashboard',
};

export default async function ErrorLogPage() {
  return <ErrorLogDashboard />;
}
