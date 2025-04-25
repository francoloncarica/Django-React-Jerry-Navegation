
import React from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';

interface PlaybackControlsProps {
  playing: boolean;
  togglePlay: () => void;
  reset: () => void;
  skipForward: () => void;
  skipBackward: () => void;
  progress: number;
  setProgress: (value: number) => void;
  playbackSpeed: number;
  setPlaybackSpeed: (value: number) => void;
}

const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  playing,
  togglePlay,
  reset,
  skipForward,
  skipBackward,
  progress,
  setProgress,
  playbackSpeed,
  setPlaybackSpeed
}) => {
  const handleProgressChange = (value: number[]) => {
    setProgress(value[0]);
  };

  const handleSpeedChange = (value: number[]) => {
    setPlaybackSpeed(value[0]);
  };

  return (
    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 shadow-sm border border-gray-200/50 space-y-4">
      <div className="flex items-center justify-center space-x-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={reset}
          title="Reset"
          className="hover:bg-gray-200/70 text-gray-700"
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={skipBackward}
          title="Skip backward"
          className="hover:bg-gray-200/70 text-gray-700"
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={togglePlay}
          title={playing ? "Pause" : "Play"}
          className="hover:bg-gray-200/70 text-gray-700"
        >
          {playing ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={skipForward}
          title="Skip forward"
          className="hover:bg-gray-200/70 text-gray-700"
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-xs text-gray-600">Progress</span>
          <span className="text-xs font-medium text-gray-700">
            {Math.round(progress * 100)}%
          </span>
        </div>
        <Slider
          value={[progress * 100]}
          min={0}
          max={100}
          step={0.1}
          onValueChange={(value) => handleProgressChange([value[0] / 100])}
          className="cursor-pointer"
        />
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-xs text-gray-600">Speed</span>
          <span className="text-xs font-medium text-gray-700">{playbackSpeed}x</span>
        </div>
        <Slider
          value={[playbackSpeed]}
          min={0.1}
          max={5}
          step={0.1}
          onValueChange={handleSpeedChange}
          className="cursor-pointer"
        />
      </div>
    </div>
  );
};

export default PlaybackControls;
