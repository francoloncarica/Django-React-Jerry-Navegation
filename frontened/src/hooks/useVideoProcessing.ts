
import { useState, useEffect, useRef } from 'react';

interface VideoProcessingOptions {
  enableWorker: boolean;
  onMetadataExtracted?: (metadata: any) => void;
  onTimeSync?: (syncData: any) => void;
  onError?: (error: string) => void;
}

export function useVideoProcessing(options: VideoProcessingOptions = { enableWorker: true }) {
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize the worker
  useEffect(() => {
    if (!options.enableWorker) return;
    
    try {
      // Create the worker
      const worker = new Worker(new URL('../workers/videoWorker.ts', import.meta.url), { type: 'module' });
      
      // Set up message handler
      worker.onmessage = (event) => {
        const { type, data, error } = event.data;
        
        switch (type) {
          case 'WORKER_READY':
            setIsWorkerReady(true);
            console.log("Video processing worker is ready");
            break;
            
          case 'METADATA_EXTRACTED':
            setIsProcessing(false);
            if (options.onMetadataExtracted) {
              options.onMetadataExtracted(data);
            }
            break;
            
          case 'TIME_SYNCED':
            setIsProcessing(false);
            if (options.onTimeSync) {
              options.onTimeSync(data);
            }
            break;
            
          case 'ERROR':
            setIsProcessing(false);
            console.error("Video worker error:", error);
            if (options.onError) {
              options.onError(error);
            }
            break;
        }
      };
      
      // Store the worker reference
      workerRef.current = worker;
      
      // Clean up worker when component unmounts
      return () => {
        worker.terminate();
        workerRef.current = null;
      };
    } catch (err) {
      console.error("Failed to create video worker:", err);
      if (options.onError) {
        options.onError("Failed to initialize video processing worker");
      }
    }
  }, [options.enableWorker]);

  // Function to extract video metadata
  const extractMetadata = (videoUrl: string) => {
    if (!workerRef.current || !isWorkerReady) {
      // Fallback to main thread processing if worker is not available
      console.log("Using main thread for video processing (worker not available)");
      // Implement fallback here if needed
      return false;
    }
    
    setIsProcessing(true);
    workerRef.current.postMessage({
      type: 'EXTRACT_METADATA',
      data: { videoUrl }
    });
    
    return true;
  };

  // Function to sync video time with track time
  const syncVideoTime = (videoTime: number, trackTime: number) => {
    if (!workerRef.current || !isWorkerReady) {
      // Fallback to main thread processing
      return false;
    }
    
    setIsProcessing(true);
    workerRef.current.postMessage({
      type: 'SYNC_TIME',
      data: { videoTime, trackTime }
    });
    
    return true;
  };

  return {
    isWorkerReady,
    isProcessing,
    extractMetadata,
    syncVideoTime,
    workerSupported: typeof Worker !== 'undefined'
  };
}
