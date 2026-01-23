import { Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { getStreamId } from '../services/idService';
import { WebSocketClient } from '../services/websocketClient';
import { buildStreamMessage } from '../services/websocketStreamService';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';

/**
 * Component for uploading images to WebSocket endpoint
 * Converts images to base64 and sends them via WebSocket
 */
export function ImageUpload() {
    const topic = 'source'; // Hardcoded to 'source'
    const [streamId, setStreamId] = useState<string>('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initialize stream ID on mount
    useEffect(() => {
        const initialStreamId = getStreamId();
        setStreamId(initialStreamId);
    }, []);

    /**
     * Handle file selection
     */
    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        setSelectedFile(file);

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    /**
     * Get image dimensions from file
     */
    const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
        return new Promise((resolve) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(url);
                resolve({ width: img.width, height: img.height });
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                // Default dimensions if we can't read the image
                resolve({ width: 1280, height: 720 });
            };
            img.src = url;
        });
    };

    /**
     * Convert file to base64 data URL
     */
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                resolve(result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    /**
     * Upload image to WebSocket endpoint
     */
    const handleUpload = async () => {
        if (!selectedFile) {
            toast.error('Please select an image file');
            return;
        }

        // Get the final stream ID (use override if provided, otherwise use default from service)
        const finalStreamId = streamId.trim() || getStreamId();

        setUploading(true);

        try {
            // Get image dimensions
            const { width, height } = await getImageDimensions(selectedFile);

            // Convert to base64
            const dataUrl = await fileToBase64(selectedFile);

            // Build message payload using utility
            const message = buildStreamMessage(dataUrl, width, height, finalStreamId);

            // Create WebSocket client for "in" endpoint
            const wsClient = new WebSocketClient(false, topic);
            wsClient.connect();

            // Wait for connection and send message
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    wsClient.disconnect();
                    reject(new Error('WebSocket connection timeout'));
                }, 10000);

                const checkConnection = setInterval(() => {
                    if (wsClient.isConnected()) {
                        clearInterval(checkConnection);
                        clearTimeout(timeout);

                        // Send message
                        wsClient.publish(message);

                        // Close after sending
                        setTimeout(() => {
                            wsClient.disconnect();
                            resolve();
                        }, 1000);
                    }
                }, 100);
            });

            toast.success(`Image uploaded successfully! Dimensions: ${width}x${height}`);
        } catch (error) {
            console.error('Upload error:', error);
            toast.error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setUploading(false);
        }
    };

    /**
     * Clear selected file
     */
    const handleClear = () => {
        setSelectedFile(null);
        setPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        Image Upload
                    </CardTitle>
                    <CardDescription>
                        Upload an image file to the WebSocket endpoint. The image will be converted to base64 and sent via WebSocket.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Stream ID Input */}
                    <div className="space-y-2">
                        <Label htmlFor="stream-id">Stream ID</Label>
                        <Input
                            id="stream-id"
                            type="text"
                            placeholder={`Default: ${getStreamId()}`}
                            value={streamId}
                            onChange={(e) => setStreamId(e.target.value)}
                            disabled={uploading}
                        />
                        <p className="text-xs text-slate-500">
                            Leave empty to use auto-generated stream ID, or enter a custom value
                        </p>
                    </div>

                    {/* File Input */}
                    <div className="space-y-2">
                        <Label htmlFor="file-input">Image File *</Label>
                        <Input
                            id="file-input"
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            disabled={uploading}
                        />
                    </div>

                    {/* Preview */}
                    {preview && (
                        <div className="space-y-2">
                            <Label>Preview</Label>
                            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                                <img
                                    src={preview}
                                    alt="Preview"
                                    className="max-w-full max-h-64 mx-auto rounded"
                                />
                                {selectedFile && (
                                    <p className="text-sm text-slate-600 mt-2 text-center">
                                        {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-4">
                        <Button
                            onClick={handleUpload}
                            disabled={!selectedFile || uploading}
                            className="flex-1"
                        >
                            {uploading ? 'Uploading...' : 'Upload Image'}
                        </Button>
                        {selectedFile && (
                            <Button
                                onClick={handleClear}
                                variant="outline"
                                disabled={uploading}
                            >
                                Clear
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

