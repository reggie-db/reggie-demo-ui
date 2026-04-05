"use client";

import * as React from "react";

export type DetectionOverlayDetection = {
  id?: number | string;
  label: string;
  class_id: number;
  confidence: number;
  bbox: [number, number, number, number];
};

export type DetectionOverlayScale = {
  /** Scale from natural pixels to displayed pixels (X). */
  scaleX: number;
  /** Scale from natural pixels to displayed pixels (Y). */
  scaleY: number;
  /** Letterbox offset inside the displayed <img> element (X). */
  offsetX: number;
  /** Letterbox offset inside the displayed <img> element (Y). */
  offsetY: number;
  /** Displayed <img> element width in CSS pixels. */
  containerWidth: number;
  /** Displayed <img> element height in CSS pixels. */
  containerHeight: number;
};

type DetectionOverlayProps = {
  detections: DetectionOverlayDetection[];
  scale: DetectionOverlayScale;
};

const _COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
  "#ec4899", // pink
];

/**
 * SVG overlay for drawing detection bounding boxes on top of an <img>.
 *
 * The overlay assumes the parent is `position: relative` and the target <img>
 * is positioned normally within it.
 */
export function DetectionOverlay({ detections, scale }: DetectionOverlayProps) {
  if (!detections.length) return null;

  return (
    <svg
      className="absolute inset-0"
      style={{
        width: `${scale.containerWidth}px`,
        height: `${scale.containerHeight}px`,
      }}
    >
      <style>
        {`
          .bbox-group {
            opacity: 0.75;
            transition: opacity 0.2s ease-in-out, stroke-width 0.2s ease-in-out;
            cursor: pointer;
          }
          .bbox-group:hover {
            opacity: 1;
          }
          .bbox-group:hover rect {
            opacity: 1 !important;
            stroke-width: 3 !important;
          }
          .bbox-group:hover text {
            opacity: 1 !important;
          }
        `}
      </style>

      {detections.map((detection, index) => {
        const [x1, y1, x2, y2] = detection.bbox;

        // Scale natural bounding box coordinates into the displayed <img> element.
        const scaledX1 = x1 * scale.scaleX + scale.offsetX;
        const scaledY1 = y1 * scale.scaleY + scale.offsetY;
        const scaledX2 = x2 * scale.scaleX + scale.offsetX;
        const scaledY2 = y2 * scale.scaleY + scale.offsetY;

        const width = scaledX2 - scaledX1;
        const height = scaledY2 - scaledY1;

        const color = _COLORS[detection.class_id % _COLORS.length];
        const confidencePercent =
          (detection.confidence > 1 ? detection.confidence / 100 : detection.confidence) *
          100;

        // Label positioning: keep it inside the SVG.
        const labelY = Math.max(14, scaledY1 - 6);
        const labelBgY = Math.max(0, scaledY1 - 20);

        return (
          <g
            key={detection.id ?? index}
            className="bbox-group"
            onMouseEnter={(e) => {
              // Bring hovered group to front.
              const group = e.currentTarget;
              const svg = group.parentElement;
              if (svg) {
                svg.appendChild(group);
              }
            }}
          >
            <rect
              x={scaledX1}
              y={scaledY1}
              width={width}
              height={height}
              fill="none"
              stroke={color}
              strokeWidth="2"
              opacity="0.75"
            />
            <rect
              x={scaledX1}
              y={labelBgY}
              width={Math.max(120, detection.label.length * 7 + 60)}
              height={20}
              fill={color}
              opacity="0.75"
            />
            <text
              x={scaledX1 + 5}
              y={labelY}
              fill="white"
              fontSize="12"
              fontWeight="bold"
              opacity="0.75"
              style={{ pointerEvents: "none" }}
            >
              {detection.label} {confidencePercent.toFixed(1)}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}

