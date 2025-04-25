import React, { useRef, useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Video, X, Maximize2, Minimize2, Clock, ArrowRightLeft, Cpu } from 'lucide-react';
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useVideoProcessing } from '../hooks/useVideoProcessing';

interface VideoPlayerProps {
  videoUrl: string | null;
  playing: boolean;
  progress: number;
  playbackSpeed: number;
  onClose: () => void;
  onVideoLoaded: (duration: number) => void;
  onTimeSync?: (videoTime: number, videoDate: Date | null) => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  playing,
  progress,
  playbackSpeed,
  onClose,
  onVideoLoaded,
  onTimeSync
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [manualSync, setManualSync] = useState(false);
  const [manualOffset, setManualOffset] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [showSyncControls, setShowSyncControls] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastProgressRef = useRef<number>(progress);

  const [videoStartTime, setVideoStartTime] = useState<Date | null>(null);

  const { 
    isWorkerReady, 
    isProcessing,
    extractMetadata, 
    syncVideoTime, 
    workerSupported 
  } = useVideoProcessing({
    enableWorker: true,
    onMetadataExtracted: (metadata) => {
      console.log("Worker extracted metadata:", metadata);
      if (metadata.success && metadata.creationTime) {
        try {
          const creationTime = new Date(metadata.creationTime);
          setVideoStartTime(creationTime);
          if (onTimeSync) {
            onTimeSync(0, creationTime);
          }
        } catch (e) {
          console.error("Error parsing creation time from worker:", e);
        }
      }
    },
    onTimeSync: (syncData) => {
      if (syncData && syncData.offset !== undefined) {
        setManualOffset(syncData.offset);
        toast({
          title: "Video synchronized",
          description: `Offset: ${syncData.offset.toFixed(1)} seconds (confidence: ${(syncData.confidence * 100).toFixed(0)}%)`
        });
      }
    },
    onError: (error) => {
      console.error("Video processing error:", error);
      toast({
        title: "Video processing error",
        description: error,
        variant: "destructive"
      });
    }
  });

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo de video válido",
        variant: "destructive",
      });
      return;
    }

    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }

    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    
    if (workerSupported && isWorkerReady) {
      extractMetadata(url);
      toast({
        title: "Processing video",
        description: "Extracting metadata using background worker"
      });
    }

    console.log("Video loaded:", file.name);
    toast({
      title: "Video cargado",
      description: file.name
    });
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const handleMetadata = () => {
      if (video.duration && !isNaN(video.duration)) {
        console.log("Video duration detected:", video.duration);
        onVideoLoaded(video.duration);
        
        if (!isProcessing && !isWorkerReady) {
          if (video.videoWidth > 0 && video.videoHeight > 0 && video.src) {
            console.log("Attempting to extract video metadata");
            fetch(video.src)
              .then(response => response.blob())
              .then(blob => {
                blob.arrayBuffer().then(buffer => {
                  const dataView = new DataView(buffer);
                  if (buffer.byteLength < 100) return;
    
                  if (dataView.getUint32(4, false) === 0x66747970) {
                    for (let i = 0; i < buffer.byteLength - 8; i++) {
                      if (dataView.getUint32(i, false) === 0xA9646174) {
                        let start = i + 6;
                        let end = start;
                        while (end < buffer.byteLength && dataView.getUint8(end) !== 0) {
                          end++;
                        }
                        try {
                          const creationTimeStr = new TextDecoder().decode(buffer.slice(start, end));
                          const creationTime = new Date(creationTimeStr);
                          if (!isNaN(creationTime.getTime())) {
                            setVideoStartTime(creationTime);
                            console.log("Video creation time from metadata:", creationTime);
                            
                            if (onTimeSync) {
                              onTimeSync(0, creationTime);
                            }
                            break;
                          }
                        } catch (e) {
                          console.error("Error decoding creation time:", e);
                        }
                      }
                    }
                  }
                });
              })
              .catch(error => console.error("Error fetching video:", error));
          }
        }
      }
    };
    
    video.addEventListener('loadedmetadata', handleMetadata);
    
    if (video.readyState >= 1 && video.duration && !isNaN(video.duration)) {
      handleMetadata();
    }
    
    return () => {
      video.removeEventListener('loadedmetadata', handleMetadata);
    };
  }, [objectUrl, videoUrl, onVideoLoaded, onTimeSync, isProcessing, isWorkerReady]);

  useEffect(() => {
    const video = videoRef.current;
    const actualVideoUrl = objectUrl || videoUrl;
    
    if (!video || !actualVideoUrl) return;
    
    if (video.src !== actualVideoUrl) {
      video.src = actualVideoUrl;
      video.load();
    }

    if (!manualSync && video.duration && !isNaN(video.duration)) {
      const targetTime = progress * video.duration;
      
      if (isSeeking || Math.abs(video.currentTime - targetTime) > 0.5) {
        console.log(`Seeking video to ${targetTime} (progress: ${progress})`);
        video.currentTime = targetTime;
      }
    }

    if (playing && video.paused) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.error("Error playing video:", err);
          if (err.name === "NotAllowedError") {
            toast({
              title: "Reproducción automática bloqueada",
              description: "Haz clic en el video para reproducirlo"
            });
          }
        });
      }
    } else if (!playing && !video.paused) {
      video.pause();
    }

    if (playbackSpeed && playbackSpeed !== 10) {
      const rate = playbackSpeed / 10;
      const safeRate = Math.max(0.1, Math.min(rate, 16.0));
      video.playbackRate = safeRate;
    }
  }, [playing, progress, videoUrl, objectUrl, playbackSpeed, isSeeking, manualSync]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const handleTimeUpdate = () => {
      setCurrentVideoTime(video.currentTime);
      
      if (manualSync && videoStartTime && onTimeSync) {
        onTimeSync(video.currentTime + manualOffset, videoStartTime);
      }
    };
    
    video.addEventListener('timeupdate', handleTimeUpdate);
    
    const handleWaiting = () => {
      setIsBuffering(true);
      console.log("Video buffering...");
    };
    
    const handlePlaying = () => {
      setIsBuffering(false);
      console.log("Video playing");
    };
    
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
    };
  }, [manualSync, manualOffset, videoStartTime, onTimeSync]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    video.preload = "auto";
    video.playsInline = true;
    
    if ('preservesPitch' in video) {
      video.preservesPitch = false;
    }
    
    const handleWaiting = () => {
      console.log("Video buffering...");
    };
    
    const handleCanPlayThrough = () => {
      console.log("Video can play through");
      if (playing) {
        video.play().catch(console.error);
      }
    };
    
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplaythrough', handleCanPlayThrough);
    
    return () => {
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplaythrough', handleCanPlayThrough);
    };
  }, [playing]);

  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    video.crossOrigin = 'anonymous';
    
    const handleCanPlayThrough = () => {
      if (playing) {
        video.play().catch(console.error);
      }
    };
    
    video.addEventListener('canplaythrough', handleCanPlayThrough);
    
    return () => {
      video.removeEventListener('canplaythrough', handleCanPlayThrough);
    };
  }, [playing]);

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const toggleSyncControls = () => {
    setShowSyncControls(!showSyncControls);
  };

  const handleManualOffsetChange = (value: number[]) => {
    const newOffset = value[0];
    setManualOffset(newOffset);
    
    const video = videoRef.current;
    if (video && manualSync && videoStartTime && onTimeSync) {
      onTimeSync(video.currentTime + newOffset, videoStartTime);
    }
  };

  const actualVideoUrl = objectUrl || videoUrl;
  
  if (!actualVideoUrl) {
    return (
      <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-border rounded-lg bg-background/80 backdrop-blur-md min-h-[200px]">
        <input
          ref={fileInputRef}
          type="file"
          id="video-upload"
          accept="video/mp4,video/*"
          className="hidden"
          onChange={handleVideoUpload}
        />
        <div className="flex flex-col items-center space-y-2 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
          <Video className="h-12 w-12 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Upload MP4 video to sync with tracks</span>
          <Button variant="outline" size="sm">
            Select Video
          </Button>
          
          {workerSupported && (
            <div className="flex items-center gap-1 text-xs mt-2 text-muted-foreground">
              <Cpu className="h-3 w-3" />
              <span>{isWorkerReady ? "Worker ready" : "Worker initializing..."}</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className={`relative rounded-lg overflow-hidden shadow-lg transition-all duration-300 ${
        isMinimized ? 'w-48 h-32' : 'w-full'
      }`}
      style={{ display: 'block' }}
    >
      <video
        ref={videoRef}
        className="w-full h-auto bg-black"
        src={actualVideoUrl}
        playsInline
        preload="auto"
        onClick={() => {
          const video = videoRef.current;
          if (video) {
            if (video.muted) {
              video.muted = false;
            }
            if (playing && video.paused) {
              video.play();
            }
          }
        }}
      />
      
      {isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
            <span className="text-white text-xs">Processing video...</span>
          </div>
        </div>
      )}
      
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
        </div>
      )}
      
      <div className="absolute top-2 right-2 flex gap-2">
        {workerSupported && (
          <div className={`px-1.5 py-1 rounded-sm text-xs flex items-center gap-1 ${
            isWorkerReady ? 'bg-green-500/20 text-green-500' : 'bg-amber-500/20 text-amber-500'
          }`}>
            <Cpu className="h-3 w-3" />
          </div>
        )}
        
        <Button
          variant="outline"
          size="icon"
          className="bg-background/80"
          onClick={toggleSyncControls}
        >
          <ArrowRightLeft className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          className="bg-background/80"
          onClick={toggleMinimize}
        >
          {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          className="bg-background/80"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {showSyncControls && !isMinimized && (
        <div className="absolute bottom-0 left-0 right-0 bg-background/90 backdrop-blur-md p-3 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Switch
                checked={manualSync}
                onCheckedChange={setManualSync}
                id="manual-sync"
              />
              <Label htmlFor="manual-sync" className="text-xs font-medium">
                Sincronización manual
              </Label>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {Math.floor(currentVideoTime / 60).toString().padStart(2, '0')}:
                {Math.floor(currentVideoTime % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>
          
          {manualSync && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs">Ajuste de tiempo:</span>
                <span className="text-xs font-mono">{manualOffset > 0 ? '+' : ''}{manualOffset}s</span>
              </div>
              <Slider
                value={[manualOffset]}
                min={-300}
                max={300}
                step={1}
                onValueChange={handleManualOffsetChange}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>-5min</span>
                <span>0</span>
                <span>+5min</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
