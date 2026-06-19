import DemoDashboardClient from './DemoDashboardClient';
import { use } from 'react';

export default function DemoDashboardPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  return <DemoDashboardClient token={resolvedParams.token} />;
}
