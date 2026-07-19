'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { TenantForm, TenantFormValues } from '../../../../components/admin/TenantForm';
import { useAdminCreateTenant } from '../../../../lib/api/hooks';

export default function NewTenantPage() {
  const router = useRouter();
  const create = useAdminCreateTenant();

  function submit(values: TenantFormValues) {
    create.mutate(values, {
      onSuccess: (tenant: any) => {
        toast.success('Tenant created');
        router.push(`/admin/tenants/${tenant.id}`);
      },
      onError: (err: any) => toast.error(err.message),
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-[var(--dark-brown)]">New tenant</h1>
        <p className="text-xs text-[var(--walnut)]">
          API keys are stored encrypted and shown only as last-4 previews after saving
        </p>
      </div>
      <div className="glass-card p-5">
        <TenantForm saving={create.isPending} submitLabel="Create tenant" onSubmit={submit} />
      </div>
    </div>
  );
}
