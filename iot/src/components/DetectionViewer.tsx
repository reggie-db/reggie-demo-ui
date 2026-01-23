// Detection Viewer Component
// Displays real-time detection cards from SSE stream

import { X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../services/config';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Dialog, DialogContent } from './ui/dialog';

/**
 * Detection event structure from SSE
 */
interface DetectionEvent {
    type: "detection";
    data: {
        id: number;
        frame_id: string; // UUID
        timestamp: string; // ISO
        label: string;
        class_id: number;
        confidence: number;
        bbox: [number, number, number, number]; // [x1, y1, x2, y2]
    };
}

/**
 * Frame event structure from SSE
 */
interface FrameEvent {
    type: "frame";
    data: {
        id: string; // UUID
        timestamp: string; // ISO
        ingest_timestamp: string; // ISO
        update_timestamp: string; // ISO
        stream_id: string;
        fps: number;
        scale: number;
    };
}

/**
 * SSE message can be either detection or frame event
 */
type SSEMessage = DetectionEvent | FrameEvent;

/**
 * Label with score structure
 */
interface LabelWithScore {
    label: string;
    score: number; // Normalized percentage (0-1)
}

/**
 * Aggregated detection data for a frame
 */
interface FrameDetections {
    frameId: string;
    detections: Array<{
        id: number;
        label: string;
        class_id: number;
        confidence: number;
        bbox: [number, number, number, number];
        timestamp: string;
    }>;
    labels: Map<string, number>; // Map of label -> highest confidence score
    detectionCount: number;
}

/**
 * Frame data with detections
 */
interface FrameData {
    id: string;
    timestamp: string;
    ingest_timestamp: string;
    update_timestamp: string;
    stream_id: string;
    fps: number;
    scale: number;
    imageUrl?: string; // URL for the image fetched from /image/{id}
    detections: FrameDetections;
}

/**
 * Detection card data structure (one per stream_id, showing latest frame)
 */
interface DetectionCard {
    frameData: FrameData;
    messageTimestamp: number; // Parsed timestamp for comparison
}

const MAX_IMAGE_WIDTH = 400;
const MAX_IMAGE_HEIGHT = 300;

/**
 * Detection Viewer Component with Live SSE streaming
 */
export function DetectionViewer({ alertsEnabled = false }: { alertsEnabled?: boolean }) {
    const [status, setStatus] = useState<string>('Connecting...');
    const [isLive, setIsLive] = useState<boolean>(true);
    // Map<stream_id, DetectionCard> - only latest frame per stream
    const [detections, setDetections] = useState<Map<string, DetectionCard>>(new Map());
    // Map<frame_id, FrameDetections> - temporary storage for detections before frame arrives
    const pendingDetectionsRef = useRef<Map<string, FrameDetections>>(new Map());
    // Map<frame_id, FrameEvent> - temporary storage for frames that arrived before detections
    const pendingFramesRef = useRef<Map<string, FrameEvent>>(new Map());
    const knownStreamIdsRef = useRef<Set<string>>(new Set());
    const [zoomedImage, setZoomedImage] = useState<{ url: string; frameData: FrameData } | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const [imageScale, setImageScale] = useState<{ scaleX: number; scaleY: number; offsetX: number; offsetY: number; displayWidth: number; displayHeight: number } | null>(null);

    // Build SSE URL using API_BASE_URL
    const getSSEUrl = () => {
        return `${API_BASE_URL}/sse/detections?offset=200`;
    };

    /**
     * Normalize confidence to percentage (0-1)
     * If confidence > 1, divide by 100 to normalize
     */
    const normalizeScore = (confidence: number): number => {
        if (confidence > 1) {
            return confidence / 100;
        }
        return confidence;
    };

    /**
     * Fetch image from /image/{id} endpoint
     */
    const fetchImage = async (imageId: string): Promise<string | null> => {
        try {
            const response = await fetch(`${API_BASE_URL}/image/${imageId}`);
            if (!response.ok) {
                console.error(`Failed to fetch image ${imageId}: ${response.statusText}`);
                return null;
            }
            
            // Get image as blob
            const blob = await response.blob();
            
            // Convert blob to base64 data URL
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    resolve(reader.result as string);
                };
                reader.onerror = () => {
                    console.error(`Error reading image blob for ${imageId}`);
                    resolve(null);
                };
                reader.readAsDataURL(blob);
            });
        } catch (err) {
            console.error(`Error fetching image ${imageId}:`, err);
            return null;
        }
    };

    /**
     * Handle detection event - store detection for later aggregation with frame
     */
    const handleDetectionEvent = (event: DetectionEvent) => {
        try {
            const { frame_id, label, confidence, id, class_id, bbox, timestamp } = event.data;

            if (!frame_id) return;

            // Get or create pending detections for this frame
            let frameDetections = pendingDetectionsRef.current.get(frame_id);
            if (!frameDetections) {
                frameDetections = {
                    frameId: frame_id,
                    detections: [],
                    labels: new Map<string, number>(),
                    detectionCount: 0,
                };
                pendingDetectionsRef.current.set(frame_id, frameDetections);
            }

            // Add detection to frame
            frameDetections.detections.push({
                id,
                label,
                class_id,
                confidence,
                bbox,
                timestamp,
            });

            // Update label map with highest confidence
            const normalizedScore = normalizeScore(confidence);
            const currentScore = frameDetections.labels.get(label);
            if (!currentScore || normalizedScore > currentScore) {
                frameDetections.labels.set(label, normalizedScore);
            }

            frameDetections.detectionCount = frameDetections.detections.length;

            // Check if there's a pending frame waiting for detections
            const pendingFrame = pendingFramesRef.current.get(frame_id);
            if (pendingFrame) {
                // Try to create the card now that we have detections
                handleFrameEvent(pendingFrame);
                pendingFramesRef.current.delete(frame_id);
            }
        } catch (err) {
            console.error('Error handling detection event:', err);
        }
    };

    /**
     * Handle frame event - create/update detection card with aggregated detections
     */
    const handleFrameEvent = async (event: FrameEvent) => {
        try {
            const frameData = event.data;
            const { stream_id, id: frameId, timestamp } = frameData;

            if (!stream_id || !frameId) return;

            // Get pending detections for this frame
            const frameDetections = pendingDetectionsRef.current.get(frameId) || {
                frameId,
                detections: [],
                labels: new Map<string, number>(),
                detectionCount: 0,
            };

            // If no detections yet, store frame and wait for detections
            if (frameDetections.detectionCount === 0) {
                pendingFramesRef.current.set(frameId, event);
                return;
            }

            // Parse timestamp
            const messageTimestamp = new Date(timestamp).getTime();

            // Fetch image from API
            const imageUrl = await fetchImage(frameId);

            // Check if this is a new stream_id using ref (synchronous check)
            const isNewStreamId = !knownStreamIdsRef.current.has(stream_id);

            setDetections((prev) => {
                const newDetections = new Map(prev);
                const wasStreamIdNew = !prev.has(stream_id);

                const existing = newDetections.get(stream_id);

                // Only update if timestamp is greater than current (or if it's a new stream)
                if (existing && messageTimestamp <= existing.messageTimestamp) {
                    return prev; // Don't update if timestamp is not newer
                }

                // Create frame data with detections and image
                const frameDataWithDetections: FrameData = {
                    ...frameData,
                    imageUrl: imageUrl || undefined,
                    detections: frameDetections,
                };

                // Create or update detection card (replace previous frame for this stream)
                newDetections.set(stream_id, {
                    frameData: frameDataWithDetections,
                    messageTimestamp,
                });

                // Clean up pending detections for this frame
                pendingDetectionsRef.current.delete(frameId);

                // Show toast notification for new stream_id (only once per stream_id) if alerts are enabled
                if (wasStreamIdNew && isNewStreamId && alertsEnabled) {
                    knownStreamIdsRef.current.add(stream_id);
                    toast(`New stream: ${stream_id}`, {
                        duration: 3000,
                        position: 'top-right',
                        icon: '📡',
                        style: {
                            fontSize: '0.875rem',
                            padding: '0.5rem 0.75rem',
                        },
                    });
                }

                return newDetections;
            });
        } catch (err) {
            console.error('Error handling frame event:', err);
        }
    };

    /**
     * Connect to SSE endpoint
     */
    const connect = () => {
        setStatus('Connecting...');

        // Close existing connection if any
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        if (!isLive) {
            setStatus('Paused');
            return;
        }

        const eventSource = new EventSource(getSSEUrl());
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
            setStatus('Connected');
        };

        eventSource.onmessage = (event) => {
            try {
                const parsed = JSON.parse(event.data);
                const message = parsed as SSEMessage;

                // Skip keepalive messages
                if (!message || !message.type) {
                    return;
                }

                // Handle error messages
                if ('error' in message && (message as any).error) {
                    console.error('Server error:', (message as any).error);
                    setStatus(`Error: ${(message as any).error}`);
                    return;
                }

                // Route to appropriate handler based on event type
                if (message.type === 'detection') {
                    handleDetectionEvent(message);
                } else if (message.type === 'frame') {
                    handleFrameEvent(message);
                } else {
                    // This should never happen, but handle gracefully
                    const unknownMessage = message as { type?: string };
                    console.warn('Unknown event type:', unknownMessage.type);
                }
            } catch (err) {
                console.error('Error parsing message:', err);
            }
        };

        eventSource.onerror = (err) => {
            console.error('SSE error:', err);
            setStatus('Connection error - reconnecting...');
            // EventSource will automatically reconnect, but we can also manually reconnect
            setTimeout(() => {
                if (eventSourceRef.current && eventSourceRef.current.readyState === EventSource.CLOSED) {
                    if (isLive) {
                        connect();
                    }
                }
            }, 1000);
        };
    };

    // Connect/disconnect based on live state
    useEffect(() => {
        if (isLive) {
            connect();
        } else {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
            setStatus('Paused');
        }

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        };
    }, [isLive]);

    // Get sorted labels with scores for a card
    const getCardLabels = (streamId: string): LabelWithScore[] => {
        const card = detections.get(streamId);
        if (!card) return [];

        return Array.from(card.frameData.detections.labels.entries())
            .map(([label, score]) => ({ label, score }))
            .sort((a, b) => b.score - a.score); // Sort by score descending
    };

    // Render detection cards (sorted alphabetically by stream_id)
    const renderDetectionCards = () => {
        const cards: React.ReactElement[] = [];

        // Convert Map to array and sort alphabetically by streamId (case-insensitive)
        const sortedEntries = Array.from(detections.entries()).sort(([streamIdA], [streamIdB]) => {
            return streamIdA.localeCompare(streamIdB, undefined, { sensitivity: 'base' });
        });

        sortedEntries.forEach(([streamId, card]) => {
            const frameData = card.frameData;
            const labels = getCardLabels(streamId);
            const detectionCount = frameData.detections.detectionCount;

            cards.push(
                <Card key={streamId} className="self-start">
                    <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-semibold text-slate-900">
                                {streamId}
                            </div>
                            <div className="text-xs text-slate-600">
                                {detectionCount} detection{detectionCount !== 1 ? 's' : ''}
                            </div>
                        </div>

                        {/* Tags with scores */}
                        {labels.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {labels.map((labelWithScore) => (
                                    <Badge key={labelWithScore.label} variant="default" className="text-xs">
                                        {labelWithScore.label} ({(labelWithScore.score * 100).toFixed(1)}%)
                                    </Badge>
                                ))}
                            </div>
                        )}

                        {/* Image */}
                        {frameData.imageUrl && (
                            <div
                                className="w-full flex items-center justify-center bg-black rounded overflow-hidden mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => setZoomedImage({ url: frameData.imageUrl!, frameData })}
                            >
                                <img
                                    src={frameData.imageUrl}
                                    alt={`Detection frame ${frameData.id}`}
                                    className="max-w-full max-h-full object-contain"
                                    style={{
                                        maxWidth: `${MAX_IMAGE_WIDTH}px`,
                                        maxHeight: `${MAX_IMAGE_HEIGHT}px`,
                                    }}
                                />
                            </div>
                        )}

                        {/* Metadata */}
                        {frameData.timestamp && (
                            <div className="text-xs text-slate-600">
                                Time: {new Date(frameData.timestamp).toLocaleTimeString()}
                            </div>
                        )}
                    </CardContent>
                </Card>
            );
        });

        return cards;
    };

    return (
        <div className="h-full flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Detection Viewer</h2>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div
                            className={`w-2 h-2 rounded-full ${isLive && status === 'Connected' ? 'bg-green-500 animate-pulse' : 'bg-slate-400'
                                }`}
                        />
                        <span className="text-sm text-slate-600">{status}</span>
                    </div>
                    <button
                        onClick={() => setIsLive(!isLive)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isLive
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                    >
                        {isLive ? 'Pause' : 'Live'}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {renderDetectionCards()}
                </div>
                {detections.size === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <p className="text-slate-600">No detections received yet</p>
                        <p className="text-sm text-slate-500 mt-2">
                            {isLive ? 'Waiting for detections...' : 'Live streaming is paused'}
                        </p>
                    </div>
                )}
            </div>

            {/* Zoomed Image Modal */}
            <Dialog open={zoomedImage !== null} onOpenChange={(open: boolean) => {
                if (!open) {
                    setZoomedImage(null);
                    setImageScale(null);
                }
            }}>
                <DialogContent className="max-w-[80vw] max-h-[80vh] w-[80vw] h-[80vh] p-0 border-none flex items-center justify-center [&>button]:hidden bg-transparent">
                    {zoomedImage && (
                        <div className="w-full h-full flex items-center justify-center p-4 box-border relative">
                            <div className="relative inline-block">
                                <img
                                    ref={imageRef}
                                    src={zoomedImage.url}
                                    alt="Zoomed detection"
                                    className="max-w-full max-h-full block"
                                    style={{
                                        objectFit: 'contain',
                                    }}
                                    onLoad={(e) => {
                                        const img = e.currentTarget;
                                        const naturalWidth = img.naturalWidth;
                                        const naturalHeight = img.naturalHeight;
                                        const maxViewportWidth = window.innerWidth * 0.8;
                                        const maxViewportHeight = window.innerHeight * 0.8;

                                        let targetWidth = naturalWidth;
                                        let targetHeight = naturalHeight;

                                        // Check if image is smaller than 1080p (1920x1080)
                                        if (naturalWidth < 1920 || naturalHeight < 1080) {
                                            // Scale up to 1080p size while maintaining aspect ratio
                                            const target1080pWidth = 1920;
                                            const target1080pHeight = 1080;

                                            // Calculate scale to reach 1080p
                                            const scaleTo1080pX = target1080pWidth / naturalWidth;
                                            const scaleTo1080pY = target1080pHeight / naturalHeight;
                                            const scaleTo1080p = Math.min(scaleTo1080pX, scaleTo1080pY); // Maintain aspect ratio

                                            targetWidth = naturalWidth * scaleTo1080p;
                                            targetHeight = naturalHeight * scaleTo1080p;
                                        }

                                        // Now apply 80% viewport constraint while maintaining aspect ratio
                                        const scaleX = maxViewportWidth / targetWidth;
                                        const scaleY = maxViewportHeight / targetHeight;
                                        const scaleToFit = Math.min(scaleX, scaleY, 1); // Don't scale up beyond target size

                                        const finalWidth = targetWidth * scaleToFit;
                                        const finalHeight = targetHeight * scaleToFit;

                                        img.style.width = `${finalWidth}px`;
                                        img.style.height = `${finalHeight}px`;
                                        img.style.objectFit = 'contain';
                                        img.style.maxWidth = `${maxViewportWidth}px`;
                                        img.style.maxHeight = `${maxViewportHeight}px`;

                                        // Calculate scale factors and offsets for bounding box overlay
                                        // Get the actual displayed dimensions after browser applies object-fit: contain
                                        setTimeout(() => {
                                            const rect = img.getBoundingClientRect();
                                            const displayWidth = rect.width;
                                            const displayHeight = rect.height;
                                            
                                            // Calculate scale from natural to displayed size
                                            // Since object-fit: contain maintains aspect ratio, use the smaller scale
                                            const scaleX = displayWidth / naturalWidth;
                                            const scaleY = displayHeight / naturalHeight;
                                            const scale = Math.min(scaleX, scaleY); // Use uniform scale for aspect ratio
                                            
                                            // Calculate the actual rendered size (may be smaller than display size due to aspect ratio)
                                            const renderedWidth = naturalWidth * scale;
                                            const renderedHeight = naturalHeight * scale;
                                            
                                            // Calculate offset to center the rendered image within the display area
                                            const offsetX = (displayWidth - renderedWidth) / 2;
                                            const offsetY = (displayHeight - renderedHeight) / 2;
                                            
                                            setImageScale({
                                                scaleX: scale,
                                                scaleY: scale,
                                                offsetX,
                                                offsetY,
                                                displayWidth: renderedWidth,
                                                displayHeight: renderedHeight,
                                            });
                                        }, 0);
                                    }}
                                />
                                {/* SVG Overlay for Bounding Boxes */}
                                {imageScale && zoomedImage.frameData.detections.detections.length > 0 && (
                                    <svg
                                        className="absolute"
                                        style={{
                                            left: `${imageScale.offsetX}px`,
                                            top: `${imageScale.offsetY}px`,
                                            width: `${imageScale.displayWidth}px`,
                                            height: `${imageScale.displayHeight}px`,
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
                                        {zoomedImage.frameData.detections.detections.map((detection, index) => {
                                            const [x1, y1, x2, y2] = detection.bbox;
                                            
                                            // Scale bounding box coordinates
                                            const scaledX1 = x1 * imageScale.scaleX + imageScale.offsetX;
                                            const scaledY1 = y1 * imageScale.scaleY + imageScale.offsetY;
                                            const scaledX2 = x2 * imageScale.scaleX + imageScale.offsetX;
                                            const scaledY2 = y2 * imageScale.scaleY + imageScale.offsetY;
                                            
                                            const width = scaledX2 - scaledX1;
                                            const height = scaledY2 - scaledY1;
                                            
                                            // Generate color based on label
                                            const colors = [
                                                '#3b82f6', // blue
                                                '#10b981', // green
                                                '#f59e0b', // amber
                                                '#ef4444', // red
                                                '#8b5cf6', // purple
                                                '#ec4899', // pink
                                            ];
                                            const colorIndex = detection.class_id % colors.length;
                                            const color = colors[colorIndex];
                                            
                                            const confidencePercent = (detection.confidence > 1 
                                                ? detection.confidence / 100 
                                                : detection.confidence) * 100;
                                            
                                            return (
                                                <g 
                                                    key={detection.id || index}
                                                    className="bbox-group"
                                                    onMouseEnter={(e) => {
                                                        // Move hovered element to end of SVG to render on top
                                                        const group = e.currentTarget;
                                                        const svg = group.parentElement;
                                                        if (svg) {
                                                            svg.appendChild(group);
                                                        }
                                                    }}
                                                >
                                                    {/* Bounding box rectangle */}
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
                                                    {/* Label background */}
                                                    <rect
                                                        x={scaledX1}
                                                        y={scaledY1 - 20}
                                                        width={Math.max(120, detection.label.length * 7 + 60)}
                                                        height={20}
                                                        fill={color}
                                                        opacity="0.75"
                                                    />
                                                    {/* Label text */}
                                                    <text
                                                        x={scaledX1 + 5}
                                                        y={scaledY1 - 5}
                                                        fill="white"
                                                        fontSize="12"
                                                        fontWeight="bold"
                                                        opacity="0.75"
                                                        style={{ pointerEvents: 'none' }}
                                                    >
                                                        {detection.label} {confidencePercent.toFixed(1)}%
                                                    </text>
                                                </g>
                                            );
                                        })}
                                    </svg>
                                )}
                                <button
                                    className="absolute top-2 right-2 z-50 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none bg-white/90 hover:bg-white text-slate-900 p-1.5 shadow-lg"
                                    onClick={() => {
                                        setZoomedImage(null);
                                        setImageScale(null);
                                    }}
                                    aria-label="Close"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

