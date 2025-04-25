
import { useMemo } from 'react';

export const useChartConfig = (
  tracks,
  showSOG,
  showCOG,
  showTWA,
  showVMG
) => {
  return useMemo(() => {
    const config = {};
    
    if (tracks.length === 0) {
      return config;
    }
    
    tracks.forEach(track => {
      if (showSOG) {
        config[`sog-${track.name}`] = {
          label: `SOG ${track.name}`,
          color: track.color
        };
      }
      
      if (showCOG) {
        config[`cog-${track.name}`] = {
          label: `COG ${track.name}`,
          color: track.color
        };
      }
      
      if (showTWA) {
        config[`twa-${track.name}`] = {
          label: `TWA ${track.name}`,
          color: track.color
        };
      }
      
      if (showVMG) {
        config[`vmg-${track.name}`] = {
          label: `VMG ${track.name}`,
          color: track.color
        };
      }
    });
    
    return config;
  }, [tracks, showSOG, showCOG, showTWA, showVMG]);
};
