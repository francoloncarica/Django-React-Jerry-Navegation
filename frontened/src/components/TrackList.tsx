
import React from 'react';
import { Button } from "@/components/ui/button";
import { Trash2, Layers } from 'lucide-react';
import { TrackData } from './GpxUploader';

interface TrackListProps {
  tracks: TrackData[];
  onRemoveTrack: (index: number) => void;
}

const TrackList: React.FC<TrackListProps> = ({ tracks, onRemoveTrack }) => {
  if (tracks.length === 0) {
    return null;
  }

  return (
    <div className="bg-card rounded-lg p-4 shadow-md">
      <h3 className="font-medium text-lg mb-2 flex items-center gap-2">
        <Layers className="h-4 w-4" />
        Loaded Tracks
      </h3>
      
      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {tracks.map((track, index) => (
          <div 
            key={index} 
            className="flex items-center justify-between bg-background p-2 rounded"
          >
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: track.color }}
              />
              <span className="text-sm font-medium truncate max-w-[150px]">
                {track.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {track.points.length} points
              </span>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemoveTrack(index)}
              title="Remove track"
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrackList;
