import React from 'react';

interface WorkflowNodeProps {
  id: string;
  icon: React.ElementType;
  label: string;
  left: string;
  top: string;
  isClimax?: boolean;
  metric?: string;
  step?: string;
}

export default function WorkflowNode({ id, icon: Icon, label, left, top, isClimax, metric, step }: WorkflowNodeProps) {
  return (
    <div
      id={id}
      className={`workflow-node absolute z-20 ${isClimax ? 'workflow-node-climax' : ''}`}
      style={{ left, top, transform: 'translate(-50%, -50%)', width: '180px', height: '138px' }}
    >
      {/* Outer expanding ring — animated in by GSAP */}
      <div
        className="workflow-outer-ring absolute rounded-2xl border-2 opacity-0 pointer-events-none"
        style={{ inset: '-12px', borderColor: isClimax ? 'rgba(221,184,146,0.5)' : 'rgba(221,184,146,0.25)' }}
      />

      {/* Second outer pulse ring — offset for depth */}
      <div
        className="workflow-outer-ring-2 absolute rounded-2xl border opacity-0 pointer-events-none"
        style={{ inset: '-22px', borderColor: 'rgba(156,102,68,0.12)' }}
      />

      {/* Main card */}
      <div
        className="relative w-full h-full rounded-2xl flex flex-col overflow-hidden"
        style={{
          background: isClimax
            ? 'linear-gradient(160deg, rgba(30,14,4,0.99) 0%, rgba(18,8,2,0.99) 100%)'
            : 'rgba(7,4,1,0.98)',
          border: `1px solid rgba(221,184,146,${isClimax ? 0.35 : 0.14})`,
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
        }}
      >
        {/* Top shimmer sweep (GSAP) */}
        <div
          className="workflow-accent-line absolute top-0 left-0 right-0 h-px opacity-0 pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(221,184,146,1) 50%, transparent 100%)' }}
        />

        {/* Inner glow — bottom-up warm bloom (GSAP) */}
        <div
          className="workflow-glow absolute inset-0 opacity-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 110%, rgba(156,102,68,0.45) 0%, transparent 62%)' }}
        />

        {/* Border + outer halo (GSAP) */}
        <div
          className="workflow-border-glow absolute inset-0 rounded-2xl opacity-0 pointer-events-none"
          style={{ boxShadow: '0 0 32px rgba(156,102,68,0.55), 0 0 70px rgba(156,102,68,0.2), inset 0 1px 0 rgba(221,184,146,0.22)' }}
        />

        {/* Climax gold explosion */}
        {isClimax && (
          <div
            className="workflow-climax-glow absolute inset-0 rounded-2xl opacity-0 pointer-events-none"
            style={{
              boxShadow: '0 0 90px rgba(221,184,146,0.95), 0 0 180px rgba(156,102,68,0.5), inset 0 0 50px rgba(156,102,68,0.28)',
              background: 'rgba(156,102,68,0.1)',
            }}
          />
        )}

        {/* Ping ripple (node 4 only) */}
        <div className="workflow-ping-ripple absolute inset-0 flex items-center justify-center opacity-0 pointer-events-none">
          <span className="ripple-circle absolute h-16 w-16 rounded-full border-2" style={{ borderColor: 'rgba(156,102,68,0.75)' }} />
        </div>

        {/* ── Card body ── */}
        <div className="relative z-10 flex flex-col h-full px-4 pt-3 pb-3">

          {/* Header row: step number + subtle divider */}
          <div className="flex items-center justify-between mb-2.5">
            <span
              className="workflow-step font-mono text-[9px] font-bold tracking-[0.25em] opacity-0"
              style={{ color: isClimax ? 'rgba(221,184,146,0.7)' : 'rgba(176,137,104,0.45)' }}
            >
              {step}
            </span>
            {/* Active dot indicator */}
            <div
              className="workflow-active-dot w-1.5 h-1.5 rounded-full opacity-0"
              style={{
                background: isClimax ? '#DDB892' : '#7F5539',
                boxShadow: `0 0 8px ${isClimax ? 'rgba(221,184,146,0.9)' : 'rgba(156,102,68,0.7)'}`,
              }}
            />
          </div>

          {/* Icon */}
          <div className="flex items-center justify-center mb-2">
            <div
              className="relative flex items-center justify-center w-11 h-11 rounded-2xl"
              style={{
                background: isClimax ? 'rgba(156,102,68,0.18)' : 'rgba(156,102,68,0.09)',
                border: `1px solid rgba(221,184,146,${isClimax ? 0.3 : 0.14})`,
              }}
            >
              <div
                className="workflow-icon"
                style={{ color: isClimax ? '#DDB892' : '#9C6644', opacity: 0.45 }}
              >
                <Icon size={20} stroke={1.6} />
              </div>
            </div>
          </div>

          {/* Label */}
          <span
            className="workflow-label text-center font-semibold leading-tight"
            style={{
              fontSize: '10.5px',
              color: isClimax ? 'rgba(237,224,212,0.85)' : 'rgba(221,184,146,0.5)',
              letterSpacing: '0.04em',
            }}
          >
            {label}
          </span>

          {/* Metric — GSAP reveals */}
          {metric && (
            <div className="workflow-metric flex items-center justify-center mt-1.5 opacity-0">
              <span
                className="font-display font-bold"
                style={{
                  fontSize: isClimax ? '13px' : '11px',
                  color: isClimax ? '#EDE0D4' : '#DDB892',
                  textShadow: `0 0 18px rgba(221,184,146,${isClimax ? 0.95 : 0.55})`,
                  letterSpacing: '0.05em',
                }}
              >
                {metric}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
