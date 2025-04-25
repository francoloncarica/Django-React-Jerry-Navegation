
import React from 'react';
import { TrackData } from './GpxUploader';
import { Gauge, Navigation, Compass, Wind, Anchor, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatTime } from '../utils/timeFormat';

interface BoatPanelProps {
  tracks: TrackData[];
  currentTimeIndex: number;
}

const BoatPanel: React.FC<BoatPanelProps> = ({ tracks, currentTimeIndex }) => {
  if (tracks.length === 0) return null;

  return (
    <div className="absolute bottom-4 left-4 z-10 space-y-2 w-80 max-h-[calc(100%-2rem)] overflow-y-auto">
      {tracks.map((track, trackIndex) => {
        const currentPoint = track.points[currentTimeIndex] || track.points[0];
        if (!currentPoint) return null;

        return (
          <Card key={trackIndex} className="bg-black/70 backdrop-blur-lg text-white border-none shadow-xl overflow-hidden rounded-xl hover:bg-black/80 transition-colors">
            <div 
              className="w-1 absolute top-0 bottom-0 left-0" 
              style={{ backgroundColor: track.color }}
            />
            <CardContent className="p-4 pl-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full" style={{ backgroundColor: track.color }} />
                  <h3 className="font-medium">{track.name}</h3>
                </div>
                
                <div className="flex items-center gap-2 text-xs px-2 py-1 bg-white/20 rounded-full">
                  <Clock className="h-3 w-3" />
                  <span>{formatTime(currentPoint.time.getTime())}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl backdrop-blur-sm hover:bg-white/15 transition-colors">
                  <div className="bg-white/20 p-2 rounded-full">
                    <Gauge className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xs text-white/70">SOG</div>
                    <div className="font-medium text-lg">{currentPoint.sog.toFixed(1)} <span className="text-sm text-white/70">kn</span></div>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl backdrop-blur-sm hover:bg-white/15 transition-colors">
                  <div className="bg-white/20 p-2 rounded-full">
                    <Navigation className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xs text-white/70">COG</div>
                    <div className="font-medium text-lg">{currentPoint.cog.toFixed(0)}<span className="text-sm text-white/70">°</span></div>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl backdrop-blur-sm hover:bg-white/15 transition-colors">
                  <div className="bg-white/20 p-2 rounded-full">
                    <Wind className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xs text-white/70">TWA</div>
                    <div className="font-medium text-lg">{currentPoint.twa.toFixed(0)}<span className="text-sm text-white/70">°</span></div>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl backdrop-blur-sm hover:bg-white/15 transition-colors">
                  <div className="bg-white/20 p-2 rounded-full">
                    <Compass className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xs text-white/70">VMG</div>
                    <div className="font-medium text-lg">{currentPoint.vmg.toFixed(1)} <span className="text-sm text-white/70">kn</span></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default BoatPanel;
