// Webcam Stream Component
// Streams webcam video via WebSocket

import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
    captureVideoFrame,
    playVideoSafely,
    requestCameraStream,
    stopMediaStream,
    waitForVideoDimensions,
} from '../services/cameraService';
import { getClientId, getStreamId } from '../services/idService';
import { WebSocketClient } from '../services/websocketClient';
import { buildStreamMessage } from '../services/websocketStreamService';

interface WebcamStreamProps {
    isActive?: boolean;
}

const DEFAULT_FPS = 5;
const MIN_FPS = 1;
const MAX_FPS = 30;
const STREAM_ID_KEY = 'stream_id';
const JPEG_QUALITY = 0.7;

export function WebcamStream({ isActive = true }: WebcamStreamProps) {
    const location = useLocation();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [status, setStatus] = useState<string>('');
    const [streamId, setStreamId] = useState<string>('');
    const [fps, setFps] = useState<number>(DEFAULT_FPS);
    const [isPublishing, setIsPublishing] = useState<boolean>(false);

    const wsClientRef = useRef<WebSocketClient | null>(null);
    const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const videoTrackRef = useRef<MediaStreamTrack | null>(null);
    const clientIdRef = useRef<string>('');
    const streamIdDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const publicIPRef = useRef<string | null>(null);

    // Initialize client ID and stream ID
    useEffect(() => {
        clientIdRef.current = getClientId();
        setStreamId(getStreamId());

        // Fetch public IP
        fetch('https://api.ipify.org?format=json')
            .then((res) => res.json())
            .then((data) => {
                publicIPRef.current = data.ip;
            })
            .catch(() => { });

        // Request camera on mount
        requestCamera();
    }, []);

    /**
     * Request camera access and set up video element
     */
    const requestCamera = async () => {
        if (!videoRef.current) return;

        const stream = await requestCameraStream('environment');
        if (!stream) {
            setStatus('Camera access denied');
            return;
        }

        // Stop previous stream
        stopMediaStream(videoRef.current.srcObject as MediaStream | null);
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Set new stream
        videoRef.current.srcObject = stream;
        videoTrackRef.current = stream.getVideoTracks()[0];
        const settings = videoTrackRef.current.getSettings();
        setStatus(`Camera ready (${settings.width}x${settings.height})`);

        // Handle camera being revoked
        videoTrackRef.current.addEventListener('ended', () => {
            setStatus('Camera access removed');
            stop();
        });

        // Auto-start when video starts playing
        videoRef.current.addEventListener(
            'playing',
            () => {
                if (!isPublishing) {
                    start();
                }
            },
            { once: true }
        );

        // Play video
        try {
            await playVideoSafely(videoRef.current);
        } catch (error: any) {
            setStatus(`Video play error: ${error.message || 'Unknown error'}`);
        }
    };

    /**
     * Send a frame via WebSocket
     */
    const sendFrame = () => {
        if (!isPublishing || !wsClientRef.current || !videoRef.current) return;
        if (!wsClientRef.current.isConnected()) return;

        const frame = captureVideoFrame(videoRef.current, JPEG_QUALITY);
        if (!frame) return;

        const videoWidth = videoRef.current.videoWidth || 0;
        const videoHeight = videoRef.current.videoHeight || 0;
        const finalStreamId = streamId.trim() || clientIdRef.current;

        const message = buildStreamMessage(
            frame,
            videoWidth,
            videoHeight,
            finalStreamId,
            publicIPRef.current
        );

        wsClientRef.current.publish(message);
    };

    /**
     * Start/restart frame capture interval
     */
    const startFrameInterval = () => {
        if (streamIntervalRef.current) {
            clearInterval(streamIntervalRef.current);
        }
        const clampedFps = Math.min(Math.max(MIN_FPS, fps), MAX_FPS);
        streamIntervalRef.current = setInterval(sendFrame, 1000 / clampedFps);
    };

    /**
     * Stop publishing (but keep video stream)
     */
    const stopPublishing = () => {
        setIsPublishing(false);
        if (streamIntervalRef.current) {
            clearInterval(streamIntervalRef.current);
            streamIntervalRef.current = null;
        }
        if (streamIdDebounceTimerRef.current) {
            clearTimeout(streamIdDebounceTimerRef.current);
            streamIdDebounceTimerRef.current = null;
        }
        if (wsClientRef.current) {
            wsClientRef.current.disconnect();
            wsClientRef.current = null;
        }
    };

    /**
     * Start publishing frames
     */
    const start = async () => {
        if (isPublishing) return;

        try {
            // Ensure camera is available
            if (!videoTrackRef.current || !videoRef.current?.srcObject) {
                await requestCamera();
                if (!videoTrackRef.current || !videoRef.current?.srcObject) {
                    return;
                }
            }

            // Wait for video dimensions
            if (videoRef.current) {
                await waitForVideoDimensions(videoRef.current);
            }

            setIsPublishing(true);
            const currentStreamIdValue = streamId.trim() || clientIdRef.current;
            setStatus(`Connecting as ${clientIdRef.current}...`);

            // Create WebSocket client for "in" endpoint with "source" topic
            wsClientRef.current = new WebSocketClient(false, 'source');
            wsClientRef.current.connect();

            // Wait for connection and start frame interval
            const checkConnection = setInterval(() => {
                if (wsClientRef.current?.isConnected()) {
                    clearInterval(checkConnection);
                    setStatus(
                        `Connected as ${clientIdRef.current}${currentStreamIdValue ? ` (stream_id=${currentStreamIdValue})` : ''}`
                    );
                    startFrameInterval();
                }
            }, 100);

            // Cleanup check interval after 10 seconds
            setTimeout(() => {
                clearInterval(checkConnection);
            }, 10000);
        } catch (err: any) {
            console.error('Failed to start:', err);
            setStatus(`Failed to start: ${err.message}`);
            setIsPublishing(false);
        }
    };

    /**
     * Stop publishing and clean up resources
     */
    const stop = () => {
        if (!isPublishing && !videoTrackRef.current) return;

        stopPublishing();

        if (videoRef.current?.srcObject) {
            stopMediaStream(videoRef.current.srcObject as MediaStream);
            videoRef.current.srcObject = null;
        }

        if (videoTrackRef.current) {
            videoTrackRef.current.stop();
            videoTrackRef.current = null;
        }

        if (status !== 'Camera access removed') {
            setStatus('Stopped.');
        }
    };

    /**
     * Handle stream ID changes
     */
    const handleStreamIdChange = () => {
        const newStreamId = streamId.trim();
        if (newStreamId === clientIdRef.current) {
            localStorage.removeItem(STREAM_ID_KEY);
        } else if (newStreamId) {
            localStorage.setItem(STREAM_ID_KEY, newStreamId);
        } else {
            localStorage.removeItem(STREAM_ID_KEY);
        }

        if (isPublishing) {
            const finalStreamId = newStreamId || clientIdRef.current;
            setStatus(`Connected as ${clientIdRef.current}${finalStreamId ? ` (stream_id=${finalStreamId})` : ''}`);
        }
    };

    /**
     * Debounce stream ID input
     */
    const handleStreamIdInput = (value: string) => {
        setStreamId(value);
        if (streamIdDebounceTimerRef.current) {
            clearTimeout(streamIdDebounceTimerRef.current);
        }
        streamIdDebounceTimerRef.current = setTimeout(handleStreamIdChange, 1000);
    };

    /**
     * Handle FPS change
     */
    const handleFpsChange = (value: string) => {
        const newFps = parseInt(value, 10) || DEFAULT_FPS;
        setFps(newFps);
        if (isPublishing) {
            startFrameInterval();
        }
    };

    // Stop when view is not active
    useEffect(() => {
        const isLiveView = location.pathname.includes('/live');
        if ((!isActive || !isLiveView) && (isPublishing || videoTrackRef.current)) {
            stopPublishing();
            if (videoRef.current?.srcObject) {
                stopMediaStream(videoRef.current.srcObject as MediaStream);
                videoRef.current.srcObject = null;
            }
            if (videoTrackRef.current) {
                videoTrackRef.current.stop();
                videoTrackRef.current = null;
            }
        }
    }, [location.pathname, isPublishing, isActive]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopPublishing();
            if (videoRef.current?.srcObject) {
                stopMediaStream(videoRef.current.srcObject as MediaStream);
                videoRef.current.srcObject = null;
            }
            if (videoTrackRef.current) {
                videoTrackRef.current.stop();
                videoTrackRef.current = null;
            }
        };
    }, []);

    return (
        <div
            className="h-full overflow-hidden flex flex-col p-4 gap-4"
            style={{ maxHeight: '100vh', height: '100%', overflowY: 'hidden' }}
        >
            {/* Video Section */}
            <div
                className="flex-shrink flex items-center justify-center bg-black rounded-lg overflow-hidden"
                style={{ minHeight: 0, maxHeight: '100%', flex: '1 1 0%' }}
            >
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full max-w-full max-h-full object-contain"
                />
            </div>

            {/* Controls Section */}
            <div className="flex-shrink-0">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col gap-3 max-w-md mx-auto">
                    <h2 className="text-xl font-semibold text-slate-900 m-0">IOT Stream</h2>

                    <div className="flex flex-col text-left">
                        <label htmlFor="streamId" className="text-sm text-slate-600 font-medium mb-1">
                            Stream ID
                        </label>
                        <input
                            id="streamId"
                            type="text"
                            placeholder="Stream ID"
                            value={streamId}
                            onChange={(e) => handleStreamIdInput(e.target.value)}
                            onBlur={handleStreamIdChange}
                            className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900 text-sm focus:outline-none focus:border-blue-600 transition-colors"
                        />
                    </div>

                    <div className="flex flex-col text-left">
                        <label htmlFor="fps" className="text-sm text-slate-600 font-medium mb-1">
                            Frame rate (FPS)
                        </label>
                        <input
                            id="fps"
                            type="number"
                            min={MIN_FPS}
                            max={MAX_FPS}
                            value={fps}
                            onChange={(e) => handleFpsChange(e.target.value)}
                            className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900 text-sm focus:outline-none focus:border-blue-600 transition-colors"
                        />
                    </div>

                    <div className="text-xs text-slate-600 break-words leading-snug">{status}</div>
                </div>
            </div>
        </div>
    );
}
