'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const formSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  phone: z.string().regex(/^(\+91)?\d{10}$/, 'Valid 10-digit Indian phone number required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  businessName: z.string().min(2, 'Business name is required'),
  businessType: z.enum(['Textile/Garments', 'Distribution/Wholesale', 'Manufacturing', 'Retail', 'Other'], {
    message: 'Please select a business type',
  }),
  partiesRange: z.enum(['<100', '100-500', '500-2000', '2000+'], {
    message: 'Please select number of parties',
  }),
  outstandingRange: z.enum(['<10L', '10-50L', '50L-1Cr', '1Cr+'], {
    message: 'Please select monthly outstanding',
  }),
});

type FormData = z.infer<typeof formSchema>;

export default function DemoSignupForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setGlobalError(null);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${backendUrl}/api/v1/demo-leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        if (res.status === 409) {
          throw new Error("You've already claimed your demo.");
        }
        throw new Error('Failed to create demo. Please try again.');
      }

      const result = await res.json();
      setIsRedirecting(true);

      // 1.2s delay for "setting up" feel
      setTimeout(() => {
        router.push(`/demo-dashboard/${result.data.demoToken}`);
      }, 1200);
    } catch (err: any) {
      setGlobalError(err.message);
      setIsSubmitting(false);
    }
  };

  if (isRedirecting) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-[var(--mahogany)] mb-4" />
        <h3 className="font-display text-xl font-semibold text-[var(--dark-brown)]">
          Setting up your demo...
        </h3>
        <p className="mt-2 font-body text-sm text-[var(--walnut)]">
          Generating your custom dataset and dashboard
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full text-left">
      {globalError && (
        <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-200">
          {globalError}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {/* Full Name */}
        <div>
          <label className="mb-1.5 block font-body text-[13px] font-semibold text-[var(--dark-brown)]">
            Full Name *
          </label>
          <input
            {...register('name')}
            className={cn(
              "w-full rounded-xl border border-[var(--caramel)] bg-[var(--surface-warm)] px-4 py-3 font-body text-[14px] text-[var(--dark-brown)] outline-none transition-colors focus:border-[var(--mahogany)] focus:ring-1 focus:ring-[var(--mahogany)]",
              errors.name && "border-red-500 focus:border-red-500 focus:ring-red-500"
            )}
            placeholder="John Doe"
          />
          {errors.name && <p className="mt-1.5 text-xs text-red-500">{errors.name.message}</p>}
        </div>

        {/* Phone */}
        <div>
          <label className="mb-1.5 block font-body text-[13px] font-semibold text-[var(--dark-brown)]">
            Phone *
          </label>
          <input
            {...register('phone')}
            className={cn(
              "w-full rounded-xl border border-[var(--caramel)] bg-[var(--surface-warm)] px-4 py-3 font-body text-[14px] text-[var(--dark-brown)] outline-none transition-colors focus:border-[var(--mahogany)] focus:ring-1 focus:ring-[var(--mahogany)]",
              errors.phone && "border-red-500 focus:border-red-500 focus:ring-red-500"
            )}
            placeholder="9876543210"
          />
          {errors.phone && <p className="mt-1.5 text-xs text-red-500">{errors.phone.message}</p>}
        </div>

        {/* Email */}
        <div>
          <label className="mb-1.5 block font-body text-[13px] font-semibold text-[var(--dark-brown)]">
            Email (Optional)
          </label>
          <input
            {...register('email')}
            className="w-full rounded-xl border border-[var(--caramel)] bg-[var(--surface-warm)] px-4 py-3 font-body text-[14px] text-[var(--dark-brown)] outline-none transition-colors focus:border-[var(--mahogany)] focus:ring-1 focus:ring-[var(--mahogany)]"
            placeholder="john@business.com"
          />
          {errors.email && <p className="mt-1.5 text-xs text-red-500">{errors.email.message}</p>}
        </div>

        {/* Business Name */}
        <div>
          <label className="mb-1.5 block font-body text-[13px] font-semibold text-[var(--dark-brown)]">
            Business Name *
          </label>
          <input
            {...register('businessName')}
            className={cn(
              "w-full rounded-xl border border-[var(--caramel)] bg-[var(--surface-warm)] px-4 py-3 font-body text-[14px] text-[var(--dark-brown)] outline-none transition-colors focus:border-[var(--mahogany)] focus:ring-1 focus:ring-[var(--mahogany)]",
              errors.businessName && "border-red-500 focus:border-red-500 focus:ring-red-500"
            )}
            placeholder="ABC Enterprises"
          />
          {errors.businessName && <p className="mt-1.5 text-xs text-red-500">{errors.businessName.message}</p>}
        </div>

        {/* Business Type */}
        <div className="sm:col-span-2">
          <label className="mb-1.5 block font-body text-[13px] font-semibold text-[var(--dark-brown)]">
            Business Type *
          </label>
          <select
            {...register('businessType')}
            className={cn(
              "w-full rounded-xl border border-[var(--caramel)] bg-[var(--surface-warm)] px-4 py-3 font-body text-[14px] text-[var(--dark-brown)] outline-none transition-colors focus:border-[var(--mahogany)] focus:ring-1 focus:ring-[var(--mahogany)]",
              errors.businessType && "border-red-500 focus:border-red-500 focus:ring-red-500"
            )}
          >
            <option value="">Select industry</option>
            <option value="Textile/Garments">Textile/Garments</option>
            <option value="Distribution/Wholesale">Distribution/Wholesale</option>
            <option value="Manufacturing">Manufacturing</option>
            <option value="Retail">Retail</option>
            <option value="Other">Other</option>
          </select>
          {errors.businessType && <p className="mt-1.5 text-xs text-red-500">{errors.businessType.message}</p>}
        </div>

        {/* Parties Range */}
        <div className="sm:col-span-2">
          <label className="mb-1.5 block font-body text-[13px] font-semibold text-[var(--dark-brown)]">
            Number of Parties *
          </label>
          <Controller
            name="partiesRange"
            control={control}
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {['<100', '100-500', '500-2000', '2000+'].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => field.onChange(option)}
                    className={cn(
                      "rounded-full border px-4 py-2 font-body text-[13px] font-medium transition-colors",
                      field.value === option
                        ? "border-[var(--mahogany)] bg-[var(--mahogany)] text-white"
                        : "border-[var(--caramel)] bg-[var(--surface-warm)] text-[var(--walnut)] hover:border-[var(--mahogany)]"
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          />
          {errors.partiesRange && <p className="mt-1.5 text-xs text-red-500">{errors.partiesRange.message}</p>}
        </div>

        {/* Outstanding Range */}
        <div className="sm:col-span-2">
          <label className="mb-1.5 block font-body text-[13px] font-semibold text-[var(--dark-brown)]">
            Monthly Outstanding *
          </label>
          <Controller
            name="outstandingRange"
            control={control}
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {['<10L', '10-50L', '50L-1Cr', '1Cr+'].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => field.onChange(option)}
                    className={cn(
                      "rounded-full border px-4 py-2 font-body text-[13px] font-medium transition-colors",
                      field.value === option
                        ? "border-[var(--mahogany)] bg-[var(--mahogany)] text-white"
                        : "border-[var(--caramel)] bg-[var(--surface-warm)] text-[var(--walnut)] hover:border-[var(--mahogany)]"
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          />
          {errors.outstandingRange && <p className="mt-1.5 text-xs text-red-500">{errors.outstandingRange.message}</p>}
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-8 w-full flex items-center justify-center rounded-xl bg-[var(--mahogany)] px-6 py-4 font-display text-[15px] font-semibold text-[var(--cream)] transition-all hover:bg-[var(--rust)] disabled:opacity-70"
      >
        {isSubmitting ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            Access Live Demo Now
            <ArrowRight className="ml-2 h-5 w-5" />
          </>
        )}
      </button>
    </form>
  );
}
