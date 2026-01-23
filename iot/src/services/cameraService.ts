// Camera Service
// Utilities for managing camera/media stream access

const VIDEO_WIDTH_IDEAL = 1280;
const VIDEO_HEIGHT_IDEAL = 720;

/**
 * Request camera access with ideal constraints
 * @param facingMode - Camera facing mode ('environment' for back, 'user' for front)
 * @returns Promise resolving to MediaStream or null if failed
 */
export async function requestCameraStream(
    facingMode: 'environment' | 'user' = 'environment'
): Promise<MediaStream | null> {
    try {
        const constraints: MediaStreamConstraints = {
            video: {
                facingMode: { ideal: facingMode },
                width: { ideal: VIDEO_WIDTH_IDEAL, max: VIDEO_WIDTH_IDEAL },
                height: { ideal: VIDEO_HEIGHT_IDEAL, max: VIDEO_HEIGHT_IDEAL },
            },
        };

        return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
        console.error('Camera access error:', error);
        return null;
    }
}

/**
 * Stop all tracks in a media stream
 * @param stream - MediaStream to stop
 */
export function stopMediaStream(stream: MediaStream | null): void {
    if (stream) {
        stream.getTracks().forEach((track) => {
            if (track.readyState !== 'ended') {
                track.stop();
            }
        });
    }
}

/**
 * Play video element, handling interruptions gracefully
 * @param video - HTMLVideoElement to play
 * @param retryDelay - Delay before retry in ms (default: 100)
 * @returns Promise that resolves when video is playing
 */
export async function playVideoSafely(
    video: HTMLVideoElement,
    retryDelay: number = 100
): Promise<void> {
    try {
        const playPromise = video.play();
        if (playPromise !== undefined) {
            await playPromise;
        }
    } catch (error: any) {
        // AbortError is expected when switching streams - retry once
        if (error.name === 'AbortError') {
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
            if (video.srcObject) {
                try {
                    const retryPromise = video.play();
                    if (retryPromise !== undefined) {
                        await retryPromise;
                    }
                } catch (retryError: any) {
                    if (retryError.name !== 'AbortError') {
                        throw retryError;
                    }
                }
            }
        } else {
            throw error;
        }
    }
}

/**
 * Wait for video element to have valid dimensions
 * @param video - HTMLVideoElement to wait for
 * @param timeoutMs - Timeout in milliseconds (default: 5000)
 * @returns Promise that resolves when video has dimensions
 */
export function waitForVideoDimensions(
    video: HTMLVideoElement,
    timeoutMs: number = 5000
): Promise<void> {
    return new Promise((resolve, reject) => {
        // Already has dimensions
        if (video.videoWidth > 0 && video.videoHeight > 0) {
            resolve();
            return;
        }

        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error('Timeout waiting for video dimensions'));
        }, timeoutMs);

        const checkDimensions = () => {
            if (video.videoWidth > 0 && video.videoHeight > 0) {
                clearTimeout(timeout);
                cleanup();
                resolve();
            }
        };

        const cleanup = () => {
            video.removeEventListener('loadedmetadata', checkDimensions);
            video.removeEventListener('playing', checkDimensions);
        };

        video.addEventListener('loadedmetadata', checkDimensions, { once: true });
        video.addEventListener('playing', checkDimensions, { once: true });
    });
}

/**
 * Capture a frame from video element as base64 JPEG
 * @param video - HTMLVideoElement to capture from
 * @param quality - JPEG quality 0-1 (default: 0.7)
 * @returns Base64 data URL
 */
export function captureVideoFrame(
    video: HTMLVideoElement,
    quality: number = 0.7
): string | null {
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        return null;
    }

    const videoWidth = video.videoWidth || 0;
    const videoHeight = video.videoHeight || 0;

    if (videoWidth <= 0 || videoHeight <= 0) {
        return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = videoWidth;
    canvas.height = videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return null;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
}

