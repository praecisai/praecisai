import React from 'react';

interface PathData {
  id: string;
  d: string;        // edge-to-edge — visible glow line
  motionD: string;  // center-to-center — invisible, GSAP MotionPath
}
interface WorkflowPathProps { paths: PathData[]; }

export default function WorkflowPath({ paths }: WorkflowPathProps) {
  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      <svg className="w-full h-full overflow-visible" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {/*
            IMPORTANT: filterUnits="userSpaceOnUse" with absolute pixel coords.
            Horizontal paths have a zero-height bounding box, so percentage-based
            y filters collapse to 0px and the glow never renders.
            All paths sit at y=165 in the 1500×340 canvas.
          */}
          <filter id="path-glow" filterUnits="userSpaceOnUse" x="-100" y="110" width="1700" height="110">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="b1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="6"   result="b2" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="16"  result="b3" />
            <feMerge>
              <feMergeNode in="b3" />
              <feMergeNode in="b2" />
              <feMergeNode in="b1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Comet head — circle has real bounding box, % filter is fine */}
          <filter id="dot-glow" x="-300%" y="-300%" width="700%" height="700%">
            <feGaussianBlur stdDeviation="4"  result="b1" />
            <feGaussianBlur stdDeviation="14" result="b2" />
            <feMerge>
              <feMergeNode in="b2" />
              <feMergeNode in="b1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Trail dots */}
          <filter id="trail-glow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Invisible center-to-center paths — GSAP MotionPathPlugin uses these */}
        {paths.map((p) => (
          <path key={`motion-${p.id}`} id={`motion-${p.id}`} d={p.motionD} fill="none" stroke="none" />
        ))}

        {/* Faint dashed baseline rail between node edges */}
        {paths.map((p) => (
          <path
            key={`rail-${p.id}`}
            className="workflow-path-rail"
            d={p.d}
            fill="none"
            stroke="rgba(221,184,146,0.1)"
            strokeWidth="1"
            strokeDasharray="3 14"
          />
        ))}

        {/*
          Active glow paths — drawn by GSAP via strokeDashoffset so the line
          grows left-to-right exactly as the comet travels over it.
          Path length = 80px (260px spacing − 180px node width).
          Using 84 gives a 4px buffer so the full line is always covered.
        */}
        {paths.map((p) => (
          <g key={p.id}>
            {/* Bloom layer */}
            <path
              id={p.id}
              className="workflow-path-active"
              d={p.d}
              fill="none"
              stroke="#B08968"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="84"
              filter="url(#path-glow)"
              style={{ strokeDashoffset: 84, opacity: 1 }}
            />
            {/* Bright inner core */}
            <path
              id={`${p.id}-core`}
              d={p.d}
              fill="none"
              stroke="rgba(240,220,195,0.8)"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeDasharray="84"
              style={{ strokeDashoffset: 84, opacity: 1 }}
            />
          </g>
        ))}

        {/* ── Comet system (back → front) ── */}
        <circle id="workflow-dot-trail-2" r="2.5"  fill="rgba(156,102,68,0.3)"  filter="url(#trail-glow)" style={{ opacity: 0 }} />
        <circle id="workflow-dot-trail-1" r="5"    fill="rgba(221,184,146,0.5)" filter="url(#trail-glow)" style={{ opacity: 0 }} />
        <circle id="workflow-dot"         r="11"   fill="rgba(156,102,68,0.22)" filter="url(#dot-glow)"   style={{ opacity: 0 }} />
        <circle id="workflow-dot-mid"     r="5.5"  fill="rgba(221,184,146,0.9)"                           style={{ opacity: 0 }} />
        <circle id="workflow-dot-core"    r="2.5"  fill="#FFFDF9"                                         style={{ opacity: 0 }} />
      </svg>
    </div>
  );
}
