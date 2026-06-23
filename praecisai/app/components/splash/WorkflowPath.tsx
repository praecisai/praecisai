import React from 'react';

interface PathData { id: string; d: string; }
interface WorkflowPathProps { paths: PathData[]; }

export default function WorkflowPath({ paths }: WorkflowPathProps) {
  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      <svg className="w-full h-full overflow-visible" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {/* Double-layer path glow */}
          <filter id="path-glow" x="-60%" y="-300%" width="220%" height="700%">
            <feGaussianBlur stdDeviation="3" result="blur1" />
            <feGaussianBlur stdDeviation="8" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Comet head glow */}
          <filter id="dot-glow" x="-250%" y="-250%" width="600%" height="600%">
            <feGaussianBlur stdDeviation="5" result="blur1" />
            <feGaussianBlur stdDeviation="14" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Trail dot glow */}
          <filter id="trail-glow" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {paths.map((p) => (
          <g key={p.id}>
            {/* Dim dashed baseline */}
            <path
              d={p.d}
              fill="none"
              stroke="rgba(221,184,146,0.1)"
              strokeWidth="1.5"
              strokeDasharray="5 8"
            />
            {/* Active glowing path (faded in by GSAP) */}
            <path
              id={p.id}
              className="workflow-path-active"
              d={p.d}
              fill="none"
              stroke="#9C6644"
              strokeWidth="2.5"
              filter="url(#path-glow)"
              strokeLinecap="round"
              style={{ opacity: 0 }}
            />
          </g>
        ))}

        {/* Comet system — rendered back-to-front so core is on top */}
        {/* Trail 2 (farthest back) */}
        <circle
          id="workflow-dot-trail-2"
          r="3"
          fill="rgba(156,102,68,0.4)"
          filter="url(#trail-glow)"
          style={{ opacity: 0 }}
        />
        {/* Trail 1 */}
        <circle
          id="workflow-dot-trail-1"
          r="5"
          fill="rgba(221,184,146,0.55)"
          filter="url(#trail-glow)"
          style={{ opacity: 0 }}
        />
        {/* Outer halo */}
        <circle
          id="workflow-dot"
          r="10"
          fill="rgba(156,102,68,0.3)"
          filter="url(#dot-glow)"
          style={{ opacity: 0 }}
        />
        {/* Mid ring */}
        <circle
          id="workflow-dot-mid"
          r="5.5"
          fill="rgba(221,184,146,0.85)"
          style={{ opacity: 0 }}
        />
        {/* Bright white core */}
        <circle
          id="workflow-dot-core"
          r="2.5"
          fill="#FFFDF9"
          style={{ opacity: 0 }}
        />
      </svg>
    </div>
  );
}
