import React from 'react';

interface WorkflowNodeProps {
  id: string;
  icon: React.ElementType;
  label: string;
  left: string;
  top: string;
  isClimax?: boolean;
  metric?: string;
}

export default function WorkflowNode({ id, icon: Icon, label, left, top, isClimax, metric }: WorkflowNodeProps) {
  return (
    <div
      id={id}
      className={`workflow-node absolute z-20 ${isClimax ? 'workflow-node-climax' : ''}`}
      style={{ left, top, transform: 'translate(-50%, -50%)', width: '180px', height: '112px' }}
    >
      {/* Outer expanding ring — animated in by GSAP on activation */}
      <div
        className="workflow-outer-ring absolute rounded-2xl border border-[rgba(221,184,146,0.35)] opacity-0 pointer-events-none"
        style={{ inset: '-10px' }}
      />

      {/* Main glass card */}
      <div
        className="relative w-full h-full rounded-xl flex flex-col items-center justify-center overflow-hidden"
        style={{
          background: 'rgba(10,6,3,0.82)',
          border: '1px solid rgba(221,184,146,0.2)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {/* Inner radial glow (activated by GSAP) */}
        <div
          className="workflow-glow absolute inset-0 opacity-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 90%, rgba(156,102,68,0.35) 0%, transparent 68%)' }}
        />

        {/* Border glow + inset highlight (activated by GSAP) */}
        <div
          className="workflow-border-glow absolute inset-0 rounded-xl opacity-0 pointer-events-none"
          style={{ boxShadow: '0 0 36px rgba(156,102,68,0.7), inset 0 1px 0 rgba(221,184,146,0.3)' }}
        />

        {isClimax && (
          <div
            className="workflow-climax-glow absolute inset-0 rounded-xl opacity-0 pointer-events-none"
            style={{
              boxShadow:
                '0 0 90px rgba(156,102,68,1), 0 0 180px rgba(156,102,68,0.55), inset 0 0 40px rgba(156,102,68,0.25)',
              background: 'rgba(156,102,68,0.14)',
            }}
          />
        )}

        {/* Top shimmer sweep line */}
        <div
          className="workflow-accent-line absolute top-0 left-0 right-0 h-px opacity-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(221,184,146,0.95) 50%, transparent 100%)',
          }}
        />

        {/* Segments burst (node 3) */}
        <div className="workflow-segments-burst absolute inset-0 flex items-center justify-center opacity-0 pointer-events-none">
          <span
            className="dot-green absolute h-3 w-3 rounded-full"
            style={{ background: '#4A7C59', boxShadow: '0 0 14px #4A7C59' }}
          />
          <span
            className="dot-amber absolute h-3 w-3 rounded-full"
            style={{ background: '#DDB892', boxShadow: '0 0 14px #DDB892' }}
          />
          <span
            className="dot-red absolute h-3 w-3 rounded-full"
            style={{ background: '#9C2020', boxShadow: '0 0 14px #9C2020' }}
          />
        </div>

        {/* Ping ripple (node 4) */}
        <div className="workflow-ping-ripple absolute inset-0 flex items-center justify-center opacity-0 pointer-events-none">
          <span
            className="ripple-circle absolute h-14 w-14 rounded-full border-2"
            style={{ borderColor: 'rgba(156,102,68,0.85)' }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center gap-1.5 px-3 w-full">
          {/* Icon container */}
          <div
            className="relative flex items-center justify-center w-10 h-10 rounded-xl"
            style={{
              background: 'rgba(156,102,68,0.12)',
              border: '1px solid rgba(221,184,146,0.18)',
            }}
          >
            <div className="workflow-icon text-[var(--walnut)] opacity-55">
              <Icon size={20} stroke={1.75} />
            </div>
          </div>

          <span className="workflow-label font-body text-[10.5px] font-semibold tracking-wide text-[var(--walnut)] opacity-55 text-center leading-tight">
            {label}
          </span>

          {/* Metric — revealed when node activates */}
          {metric && (
            <div className="workflow-metric opacity-0 mt-0.5">
              <span
                className="font-display text-[11px] font-bold tracking-wider"
                style={{ color: '#DDB892', textShadow: '0 0 14px rgba(221,184,146,0.7)' }}
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
