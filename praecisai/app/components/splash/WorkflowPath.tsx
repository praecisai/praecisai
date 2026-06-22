import React from 'react';

interface PathData {
  id: string;
  d: string;
}

interface WorkflowPathProps {
  paths: PathData[];
}

export default function WorkflowPath({ paths }: WorkflowPathProps) {
  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="path-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="dot-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {paths.map((p) => (
          <g key={p.id}>
            {/* Default dim dashed path */}
            <path
              d={p.d}
              fill="none"
              stroke="rgba(221,184,146,0.15)"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            {/* Active glowing path (animated by GSAP) */}
            <path
              id={p.id}
              className="workflow-path-active"
              d={p.d}
              fill="none"
              stroke="#9C6644"
              strokeWidth="2.5"
              filter="url(#path-glow)"
              style={{ opacity: 0 }}
            />
          </g>
        ))}

        {/* The traveling glowing dot */}
        <circle
          id="workflow-dot"
          r="6"
          fill="#FFFDF9"
          filter="url(#dot-glow)"
          style={{ opacity: 0 }}
        />
        <circle
          id="workflow-dot-core"
          r="3"
          fill="#ffffff"
          style={{ opacity: 0 }}
        />
      </svg>
    </div>
  );
}
