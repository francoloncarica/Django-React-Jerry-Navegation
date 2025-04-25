
import React from 'react';
import { Gauge, Navigation } from 'lucide-react';

interface MapTooltipProps {
  sog: number;
  cog: number;
  position: { x: number; y: number };
  color: string;
}

const MapTooltip: React.FC<MapTooltipProps> = ({ sog, cog, position, color }) => {
  return (
    <div 
      className="absolute z-50 bg-black/80 backdrop-blur-md text-white rounded-lg shadow-xl border border-white/10 px-4 py-3 pointer-events-none transform -translate-x-1/2 -translate-y-full flex flex-col gap-3 animate-fade-in"
      style={{ 
        left: position.x, 
        top: position.y - 10,
        minWidth: '120px'
      }}
    >
      <div className="text-center font-medium text-sm border-b border-white/10 pb-1 mb-1">Data</div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-white/10 rounded-full">
            <Gauge className="h-3 w-3" />
          </div>
          <span className="text-xs text-white/80">SOG:</span>
        </div>
        <span className="font-mono font-medium">{sog.toFixed(1)} kn</span>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-white/10 rounded-full">
            <Navigation className="h-3 w-3" />
          </div>
          <span className="text-xs text-white/80">COG:</span>
        </div>
        <span className="font-mono font-medium">{cog.toFixed(0)}°</span>
      </div>
      
      <div 
        className="absolute bottom-0 left-1/2 w-2 h-2 bg-black/80 border-l border-b border-white/10 transform translate-y-1/2 rotate-45 -translate-x-1/2"
      ></div>
    </div>
  );
};

export default MapTooltip;
