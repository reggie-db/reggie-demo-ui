"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { cn } from "./utils";
import { DetectionOverlay, type DetectionOverlayDetection, type DetectionOverlayScale } from "./detection-overlay";

type FrameImageWithOverlayProps = {
  src: string;
  alt: string;
  detections: DetectionOverlayDetection[];
  className?: string;
  /** Fixed height for consistent layout (recommended for grids). */
  heightClassName?: string;
  onClick?: () => void;
  /**
   * Optional callback when image load state changes.
   * Useful for displaying shared progress in parent UIs (like modals).
   */
  onLoadedChange?: (loaded: boolean) => void;
};

const _computeScale = (img: HTMLImageElement): DetectionOverlayScale | null => {
  const rect = img.getBoundingClientRect();
  const containerWidth = rect.width;
  const containerHeight = rect.height;
  const naturalWidth = img.naturalWidth;
  const naturalHeight = img.naturalHeight;

  if (!containerWidth || !containerHeight || !naturalWidth || !naturalHeight) {
    return null;
  }

  // For object-fit: contain: rendered image is scaled uniformly, with letterboxing.
  const scale = Math.min(containerWidth / naturalWidth, containerHeight / naturalHeight);
  const renderedWidth = naturalWidth * scale;
  const renderedHeight = naturalHeight * scale;
  const offsetX = (containerWidth - renderedWidth) / 2;
  const offsetY = (containerHeight - renderedHeight) / 2;

  return {
    scaleX: scale,
    scaleY: scale,
    offsetX,
    offsetY,
    containerWidth,
    containerHeight,
  };
};

/**
 * Image component that shows:
 * - A loading overlay until the image bytes arrive
 * - Optional detection bounding boxes overlayed on top of the image
 */
export function FrameImageWithOverlay({
  src,
  alt,
  detections,
  className,
  heightClassName = "h-[320px]",
  onClick,
  onLoadedChange,
}: FrameImageWithOverlayProps) {
  const imgRef = React.useRef<HTMLImageElement | null>(null);
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [scale, setScale] = React.useState<DetectionOverlayScale | null>(null);

  // Reset loading state if src changes.
  React.useEffect(() => {
    setLoaded(false);
    setScale(null);
    onLoadedChange?.(false);
  }, [src]);

  const recompute = React.useCallback(() => {
    if (!imgRef.current) return;
    const next = _computeScale(imgRef.current);
    if (next) {
      setScale(next);
    }
  }, []);

  React.useEffect(() => {
    // Recompute whenever the wrapper size changes (dialogs + responsive grids).
    if (!wrapperRef.current) return;
    const el = wrapperRef.current;
    const observer = new ResizeObserver(() => {
      recompute();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [recompute]);

  React.useEffect(() => {
    // Recompute on resize to keep overlay aligned.
    const onResize = () => recompute();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [recompute]);

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "relative w-full overflow-hidden rounded-md border border-slate-200 bg-black",
        heightClassName,
        onClick ? "cursor-pointer" : undefined,
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40">
          <div className="flex items-center gap-2 text-xs text-white/90">
            <Loader2 className="size-4 animate-spin" />
            Loading image...
          </div>
        </div>
      )}

      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={cn("h-full w-full object-contain", className)}
        loading="lazy"
        onLoad={() => {
          setLoaded(true);
          onLoadedChange?.(true);
          // Ensure layout has settled before measuring.
          window.setTimeout(() => recompute(), 0);
        }}
        onError={() => {
          setLoaded(true);
          onLoadedChange?.(true);
          setScale(null);
        }}
      />

      {scale && detections.length > 0 && (
        <DetectionOverlay detections={detections} scale={scale} />
      )}
    </div>
  );
}

