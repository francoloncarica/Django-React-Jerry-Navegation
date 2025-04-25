
import { TrackData } from '../components/GpxUploader';

// Trail types
export type TrailType = 'speed' | 'tail' | 'full-tail';

export const renderTrail = (
  context: CanvasRenderingContext2D,
  track: TrackData,
  currentIndex: number,
  trailType: TrailType,
  scale: number = 1
) => {
  if (!track.points || track.points.length === 0) return;

  const MAX_TAIL_LENGTH = 15;
  const points = track.points;
  const color = track.color;

  // Always clear the canvas before drawing
  context.setLineDash([]);

  // Function to set color based on speed
  const getSpeedColor = (speed: number): string => {
    if (speed < 3) return 'rgba(0, 0, 255, 0.8)';
    if (speed < 6) return 'rgba(0, 255, 0, 0.8)';
    if (speed < 9) return 'rgba(255, 255, 0, 0.8)';
    return 'rgba(255, 0, 0, 0.8)';
  };

  switch (trailType) {
    case 'speed':
      // Draw colored segments based on speed
      if (currentIndex > 0) {
        for (let i = 1; i <= currentIndex; i++) {
          const prevPoint = points[i - 1];
          const currentPoint = points[i];
          
          context.beginPath();
          context.moveTo(prevPoint.lon * scale, prevPoint.lat * scale);
          context.lineTo(currentPoint.lon * scale, currentPoint.lat * scale);
          
          context.strokeStyle = getSpeedColor(currentPoint.sog);
          context.lineWidth = 0.4; // Líneas aún más delgadas (antes 0.8)
          context.stroke();
        }
      }
      break;
      
    case 'tail':
      // Draw temporary trail behind the boat with progressive fade effect
      const startIndex = Math.max(0, currentIndex - MAX_TAIL_LENGTH);
      
      if (startIndex < currentIndex) {
        // Calculate maximum alpha value based on total segments
        const maxAlpha = Math.min(0.9, 0.3 + ((currentIndex - startIndex) / MAX_TAIL_LENGTH) * 0.7);
        
        // Draw segments with smoother gradient opacity and width
        for (let i = startIndex; i < currentIndex; i++) {
          // Calculate progress to determine opacity (fade from tail to current position)
          const segmentProgress = (i - startIndex) / (currentIndex - startIndex);
          const opacity = 0.1 + (segmentProgress * maxAlpha); // Smoother fade from 0.1 to maxAlpha
          
          // Skip rendering if points are too close together (improves performance)
          if (i + 1 < points.length) {
            context.beginPath();
            context.moveTo(points[i].lon * scale, points[i].lat * scale);
            context.lineTo(points[i + 1].lon * scale, points[i + 1].lat * scale);
            
            // Parse color components for rgba
            const baseColor = color.startsWith('#') 
              ? color.substring(1) 
              : color.replace(/[^\d,]/g, '').split(',').map(n => parseInt(n, 10).toString(16).padStart(2, '0')).join('');
            
            let r, g, b;
            
            if (baseColor.length === 6) {
              r = parseInt(baseColor.substring(0, 2), 16);
              g = parseInt(baseColor.substring(2, 4), 16);
              b = parseInt(baseColor.substring(4, 6), 16);
            } else {
              // Default fallback if color parsing fails
              r = 100; g = 100; b = 255;
            }
            
            // Enhanced tail color with proper opacity
            const tailColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
            
            // Line width progressively increases towards current position but stays thinner
            const lineWidth = 0.2 + (segmentProgress * 0.4); // Reducimos aún más el grosor (antes 0.3 + 0.8)
            
            context.strokeStyle = tailColor;
            context.lineWidth = lineWidth;
            context.stroke();
          }
        }
      }
      break;
      
    case 'full-tail':
      // Draw full path up to current position
      if (currentIndex > 0) {
        context.beginPath();
        context.moveTo(points[0].lon * scale, points[0].lat * scale);
        
        for (let i = 1; i <= currentIndex; i++) {
          context.lineTo(points[i].lon * scale, points[i].lat * scale);
        }
        
        context.strokeStyle = color;
        context.lineWidth = 0.4; // Líneas aún más delgadas (antes 0.8)
        context.stroke();
      }
      break;
  }
};
