
import React from 'react';
import { Wind, ArrowUp, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

const WindSettings = ({
  windDirection,
  setWindDirection,
  isExpanded,
  toggleExpanded
}) => {
  const handleDirectionChange = (value) => {
    setWindDirection(value[0]);
  };

  if (!isExpanded) {
    return (
      <Button
        onClick={toggleExpanded}
        className="absolute top-4 right-4 z-10 bg-white/80 hover:bg-white shadow-md rounded-full p-2.5 h-auto w-auto"
        variant="outline"
      >
        <div className="flex flex-col items-center">
          <div className="relative h-8 w-8 flex items-center justify-center">
            <Wind className="w-5 h-5 text-blue-600" />
            <div 
              className="absolute w-4 h-4 flex items-center justify-center"
              style={{ 
                transform: `rotate(${windDirection}deg)`,
                transition: 'transform 0.3s ease' 
              }}
            >
              <div className="w-0.5 h-4 bg-blue-600 absolute top-0"></div>
              <div className="w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-blue-600 absolute -top-2"></div>
            </div>
          </div>
          <span className="text-xs font-bold text-blue-600 mt-1">{windDirection}°</span>
        </div>
      </Button>
    );
  }

  return (
    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md rounded-lg p-4 shadow-md z-10 w-64">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium flex items-center">
          <Wind className="w-4 h-4 mr-2 text-blue-600" />
          Wind Direction
        </h3>
        <Button variant="ghost" size="icon" onClick={toggleExpanded} className="h-8 w-8 rounded-full">
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="space-y-6">
        <div className="flex justify-center items-center">
          <div className="relative h-28 w-28 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 flex items-center justify-center shadow-inner">
            <div className="absolute h-28 w-28 rounded-full">
              {/* Direction markers */}
              {['N', 'E', 'S', 'W'].map((dir, i) => (
                <div 
                  key={dir} 
                  className="absolute flex items-center justify-center w-full h-full"
                  style={{ transform: `rotate(${i * 90}deg)` }}
                >
                  <span className="absolute top-0 text-xs font-bold text-blue-600">{dir}</span>
                  <div className="w-full h-0.5 bg-blue-200"></div>
                </div>
              ))}
              
              <div 
                className="absolute inset-0 flex items-center justify-center"
                style={{ transform: `rotate(${windDirection}deg)` }}
              >
                <div className="absolute h-full w-0.5 bg-blue-600 top-0 origin-bottom" style={{ height: '40%' }}>
                  <div className="w-0 h-0 border-l-2 border-r-2 border-b-4 border-l-transparent border-r-transparent border-b-blue-600 absolute -top-1 left-50 transform -translate-x-1/2"></div>
                </div>
              </div>
            </div>
            <span className="font-bold text-xl text-blue-800">{windDirection}°</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-blue-700">
            <span>0°</span>
            <span>180°</span>
            <span>359°</span>
          </div>
          <Slider
            value={[windDirection]}
            min={0}
            max={359}
            step={1}
            onValueChange={handleDirectionChange}
            className="mt-2"
          />
          <div className="flex justify-center mt-4">
            <Button 
              variant="outline" 
              className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
              onClick={() => setWindDirection(0)}
            >
              Reset to North
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WindSettings;
