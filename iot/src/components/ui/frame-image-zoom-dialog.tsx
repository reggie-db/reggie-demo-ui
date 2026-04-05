"use client";

import * as React from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import { FrameImageWithOverlay } from "./frame-image-with-overlay";
import type { DetectionOverlayDetection } from "./detection-overlay";

type FrameImageZoomDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  src: string;
  frameId: string;
  timestampLabel?: string;
  detections: DetectionOverlayDetection[];
};

/**
 * Reusable zoom dialog for a single frame image with overlays.
 *
 * This centralizes zoom sizing and overlay rendering so Trends and other pages
 * can share the same behavior.
 */
export function FrameImageZoomDialog({
  open,
  onOpenChange,
  title,
  src,
  frameId,
  timestampLabel,
  detections,
}: FrameImageZoomDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[80vw] w-[80vw] h-[80vh] sm:max-w-[80vw] sm:w-[80vw] sm:h-[80vh] p-0 overflow-hidden flex flex-col gap-0 pointer-events-auto">
        <div className="h-full flex flex-col min-h-0">
          <DialogHeader className="px-6 pt-6 pb-3">
            <DialogTitle className="text-slate-900">{title}</DialogTitle>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {timestampLabel && (
                <div className="text-xs text-slate-600">{timestampLabel}</div>
              )}
              <div className="text-xs font-mono text-slate-500 break-all">{frameId}</div>
            </div>
          </DialogHeader>
          <div className="flex-1 px-6 pb-6 overflow-auto min-h-0">
            <div className="mx-auto max-w-[75vw]">
              <FrameImageWithOverlay
                src={src}
                alt={`Frame ${frameId}`}
                detections={detections}
                heightClassName="h-[80vh]"
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

