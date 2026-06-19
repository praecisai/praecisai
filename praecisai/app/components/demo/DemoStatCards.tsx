'use client';

import { motion } from 'framer-motion';

export default function DemoStatCards() {
  const stats = [
    { label: 'Total Outstanding', value: '₹2,34,694', color: 'text-[var(--mahogany)]' },
    { label: 'Total Parties', value: '3', color: 'text-[var(--dark-brown)]' },
    { label: 'Soft Reminder', value: '1', color: 'text-[#085041]' },
    { label: 'Escalation', value: '1', color: 'text-[#7F1D1D]' },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-6">
      {stats.map((stat, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="flex flex-col justify-center rounded-2xl border border-[var(--caramel)] bg-[var(--surface-warm)] p-5 shadow-sm"
        >
          <p className="font-body text-xs font-semibold uppercase tracking-wider text-[var(--walnut)]">
            {stat.label}
          </p>
          <p className={`mt-1 font-display text-2xl font-bold sm:text-3xl ${stat.color}`}>
            {stat.value}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
