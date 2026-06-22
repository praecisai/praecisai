import React from 'react';

interface WorkflowNodeProps {
  id: string;
  icon: React.ElementType;
  label: string;
  left: string;
  top: string;
  isClimax?: boolean;
}

export default function WorkflowNode({ id, icon: Icon, label, left, top, isClimax }: WorkflowNodeProps) {
  return (
    <div
      id={id}
      className={`workflow-node absolute flex flex-col items-center justify-center rounded-xl border border-[rgba(221,184,146,0.25)] bg-[rgba(255,255,255,0.02)] shadow-sm z-20 overflow-hidden backdrop-blur-md ${
        isClimax ? 'workflow-node-climax' : ''
      }`}
      style={{
        left,
        top,
        transform: 'translate(-50%, -50%)',
        width: '180px',
        height: '80px',
      }}
    >
      {/* Glow background layer to fade in instead of animating box-shadow directly */}
      <div className="workflow-glow absolute inset-0 bg-[rgba(156,102,68,0.2)] opacity-0 pointer-events-none" />
      <div className="workflow-border-glow absolute inset-0 rounded-xl opacity-0 pointer-events-none shadow-[0_0_32px_rgba(156,102,68,0.85)]" />
      {isClimax && (
        <div className="workflow-climax-glow absolute inset-0 rounded-xl opacity-0 pointer-events-none shadow-[0_0_60px_rgba(156,102,68,1)] bg-[rgba(156,102,68,0.3)]" />
      )}

      {/* Special effects layers (targeted by GSAP) */}
      <div className="workflow-segments-burst absolute inset-0 flex items-center justify-center opacity-0 pointer-events-none">
        <span className="dot-green absolute h-2 w-2 rounded-full bg-[#4A7C59]" />
        <span className="dot-amber absolute h-2 w-2 rounded-full bg-[#DDB892]" />
        <span className="dot-red absolute h-2 w-2 rounded-full bg-[#7F1D1D]" />
      </div>

      <div className="workflow-ping-ripple absolute inset-0 flex items-center justify-center opacity-0 pointer-events-none">
        <span className="ripple-circle h-10 w-10 rounded-full border border-[var(--rust)]" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-2">
        <div className="workflow-icon text-[var(--walnut)] opacity-70">
          <Icon size={22} stroke={2.5} />
        </div>
        <span className="workflow-label font-body text-[12px] font-semibold tracking-wide text-[var(--walnut)] opacity-70 text-center leading-tight px-3">
          {label}
        </span>
      </div>
    </div>
  );
}
