import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
  Brush,
  Scatter,
  Area
} from "recharts";
import { TrackData } from './GpxUploader';
import { useChartData } from '../hooks/useChartData';
import { useChartConfig } from '../hooks/useChartConfig';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Maximize, Video } from "lucide-react";

interface TelemetryChartProps {
  tracks: TrackData[];
  currentTimeIndex: number;
  showSOG: boolean;
  showCOG: boolean;
  showTWA: boolean;
  showVMG: boolean;
  onHoverPositionChange: (index: number) => void;
  onPositionClick: (index: number) => void;
  startRaceIndex?: number;
  endRaceIndex?: number;
  onSelectInterval?: (start: number, end: number) => void;
  videoTimePosition?: { time: number, date: Date | null };
}

const TelemetryChart: React.FC<TelemetryChartProps> = ({
  tracks,
  currentTimeIndex,
  showSOG,
  showCOG,
  showTWA,
  showVMG,
  onHoverPositionChange,
  onPositionClick,
  startRaceIndex,
  endRaceIndex,
  onSelectInterval,
  videoTimePosition
}) => {
  const [selecting, setSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const [showBrush, setShowBrush] = useState(false);
  const [brushStartIndex, setBrushStartIndex] = useState<number | undefined>(undefined);
  const [brushEndIndex, setBrushEndIndex] = useState<number | undefined>(undefined);
  
  const [activeMetrics, setActiveMetrics] = useState({
    SOG: true,
    COG: false,
    TWA: false,
    VMG: false
  });
  
  const [activeBoats, setActiveBoats] = useState(
    tracks.reduce((acc, track) => {
      acc[track.name] = true;
      return acc;
    }, {} as Record<string, boolean>)
  );

  useEffect(() => {
    setActiveMetrics(prev => ({
      ...prev,
      SOG: showSOG,
      COG: showCOG,
      TWA: showTWA,
      VMG: showVMG
    }));
  }, [showSOG, showCOG, showTWA, showVMG]);

  useEffect(() => {
    if (tracks.length > 0) {
      setActiveBoats(
        tracks.reduce((acc, track) => {
          acc[track.name] = activeBoats[track.name] !== undefined ? activeBoats[track.name] : true;
          return acc;
        }, {} as Record<string, boolean>)
      );
    }
  }, [tracks]);

  const chartData = useChartData(
    tracks,
    activeMetrics.SOG,
    activeMetrics.COG,
    activeMetrics.TWA,
    activeMetrics.VMG,
    1000  // 1 s de muestreo
  );
  
  const chartConfig = useChartConfig(tracks, 
    activeMetrics.SOG, 
    activeMetrics.COG, 
    activeMetrics.TWA, 
    activeMetrics.VMG
  );

  const findCurrentIndex = () => {
    if (chartData.length === 0 || currentTimeIndex === undefined) return null;
    const ratio = currentTimeIndex / (tracks[0]?.points?.length || 1);
    return Math.floor(ratio * chartData.length);
  };

  const currentChartIndex = findCurrentIndex();

  const handleMouseDown = (e: any) => {
    if (!e?.activeLabel) return;
    
    const index = chartData.findIndex(d => d.formattedTime === e.activeLabel);
    if (index !== -1) {
      setSelecting(true);
      setSelectionStart(index);
      setSelectionEnd(null);
    }
  };

  const handleMouseMove = (e: any) => {
    if (e?.activeLabel) {
      const index = chartData.findIndex(d => d.formattedTime === e.activeLabel);
      if (index !== -1) {
        const ratio = index / chartData.length;
        const trackIndex = Math.floor(ratio * (tracks[0]?.points?.length || 1));
        
        onHoverPositionChange(trackIndex);
      }
    }
    
    if (!selecting || !e?.activeLabel) return;
    
    const index = chartData.findIndex(d => d.formattedTime === e.activeLabel);
    if (index !== -1) {
      setSelectionEnd(index);
    }
  };

  const handleMouseUp = () => {
    if (!selecting || selectionStart === null || !onSelectInterval) {
      setSelecting(false);
      return;
    }
    
    if (selectionEnd !== null && Math.abs(selectionEnd - selectionStart) > 5) {
      const start = Math.min(selectionStart, selectionEnd);
      const end = Math.max(selectionStart, selectionEnd);
      
      onSelectInterval(start, end);
      setBrushStartIndex(start);
      setBrushEndIndex(end);
    }
    
    setSelecting(false);
  };

  const handleClickChart = (e: any) => {
    if (!e?.activeLabel) return;
    
    const index = chartData.findIndex(d => d.formattedTime === e.activeLabel);
    if (index !== -1) {
      const ratio = index / chartData.length;
      const trackIndex = Math.floor(ratio * (tracks[0]?.points?.length || 1));
      onPositionClick(trackIndex);
    }
  };

  const handleTooltipClick = (trackIndex: number) => {
    if (onPositionClick && trackIndex !== undefined) {
      onPositionClick(trackIndex);
    }
  };

  const toggleMetric = (metric: keyof typeof activeMetrics) => {
    setActiveMetrics(prev => ({
      ...prev,
      [metric]: !prev[metric]
    }));
  };

  const toggleBoat = (boatName: string) => {
    setActiveBoats(prev => ({
      ...prev,
      [boatName]: !prev[boatName]
    }));
  };

  const handleBrushChange = (e: any) => {
    if (e.startIndex !== undefined && e.endIndex !== undefined) {
      setBrushStartIndex(e.startIndex);
      setBrushEndIndex(e.endIndex);
      if (onSelectInterval) {
        onSelectInterval(e.startIndex, e.endIndex);
      }
    }
  };

  // Find video position in chart data
  const videoPositionIndex = useMemo(() => {
    if (!videoTimePosition?.date || !chartData.length) return null;
    
    const videoDate = new Date(videoTimePosition.date);
    videoDate.setSeconds(videoDate.getSeconds() + videoTimePosition.time);
    
    return chartData.findIndex(point => 
      point.videoMarker === 1 || (point.videoProximity && Number(point.videoProximity) > 0.8)
    );
  }, [chartData, videoTimePosition]);

  if (!tracks.length) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Upload a GPX file to see telemetry data</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <div className="absolute right-4 top-4 z-10 flex flex-wrap gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2 bg-background/80 backdrop-blur-md">
              Metrics <ChevronsUpDown className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48">
            <div className="space-y-2">
              <div 
                className={`flex items-center space-x-2 rounded-md px-2 py-1 cursor-pointer ${activeMetrics.SOG ? 'bg-accent' : ''}`}
                onClick={() => toggleMetric('SOG')}
              >
                <div className={`h-3 w-3 ${activeMetrics.SOG ? 'bg-primary' : 'bg-muted'} rounded-sm`} />
                <span>Speed Over Ground</span>
              </div>
              <div 
                className={`flex items-center space-x-2 rounded-md px-2 py-1 cursor-pointer ${activeMetrics.COG ? 'bg-accent' : ''}`}
                onClick={() => toggleMetric('COG')}
              >
                <div className={`h-3 w-3 ${activeMetrics.COG ? 'bg-primary' : 'bg-muted'} rounded-sm`} />
                <span>Course Over Ground</span>
              </div>
              <div 
                className={`flex items-center space-x-2 rounded-md px-2 py-1 cursor-pointer ${activeMetrics.TWA ? 'bg-accent' : ''}`}
                onClick={() => toggleMetric('TWA')}
              >
                <div className={`h-3 w-3 ${activeMetrics.TWA ? 'bg-primary' : 'bg-muted'} rounded-sm`} />
                <span>True Wind Angle</span>
              </div>
              <div 
                className={`flex items-center space-x-2 rounded-md px-2 py-1 cursor-pointer ${activeMetrics.VMG ? 'bg-accent' : ''}`}
                onClick={() => toggleMetric('VMG')}
              >
                <div className={`h-3 w-3 ${activeMetrics.VMG ? 'bg-primary' : 'bg-muted'} rounded-sm`} />
                <span>Velocity Made Good</span>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2 bg-background/80 backdrop-blur-md">
              Boats <ChevronsUpDown className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48">
            <div className="space-y-2">
              {tracks.map(track => (
                <div 
                  key={track.name}
                  className={`flex items-center space-x-2 rounded-md px-2 py-1 cursor-pointer ${activeBoats[track.name] ? 'bg-accent' : ''}`}
                  onClick={() => toggleBoat(track.name)}
                >
                  <div className="h-3 w-3 rounded-sm" style={{backgroundColor: activeBoats[track.name] ? track.color : '#ccc'}} />
                  <span>{track.name}</span>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {showBrush && (
          <Button 
            variant="outline" 
            className="flex items-center gap-2 bg-background/80 backdrop-blur-md"
            onClick={() => setShowBrush(!showBrush)}
          >
            <Maximize className="h-4 w-4" />
            {showBrush ? "Hide Zoom" : "Show Zoom"}
          </Button>
        )}
        
        {videoPositionIndex !== null && videoTimePosition && (
          <div className="px-2 py-1 bg-red-500/20 backdrop-blur-sm rounded-md border border-red-200 text-xs flex items-center gap-1">
            <Video className="h-3 w-3" />
            <span>Video Active</span>
          </div>
        )}
      </div>

      <ChartContainer config={chartConfig} className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: showBrush ? 40 : 10 }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClick={handleClickChart}
          >
            <defs>
              {tracks.map(track => (
                <linearGradient 
                  key={`gradient-${track.name}`} 
                  id={`colorGradient-${track.name}`} 
                  x1="0" 
                  y1="0" 
                  x2="0" 
                  y2="1"
                >
                  <stop offset="5%" stopColor={track.color} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={track.color} stopOpacity={0.2}/>
                </linearGradient>
              ))}
              <linearGradient 
                id="videoMarkerGradient" 
                x1="0" 
                y1="0" 
                x2="0" 
                y2="1"
              >
                <stop offset="5%" stopColor="#ff0000" stopOpacity={0.9}/>
                <stop offset="95%" stopColor="#ff0000" stopOpacity={0.5}/>
              </linearGradient>
              
              <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#555" 
              strokeOpacity={0.1} 
              horizontal={true}
              vertical={false}
            />
            
            <XAxis 
              dataKey="formattedTime" 
              tick={{ fill: '#888', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              height={30}
            />
            
            <YAxis 
              tick={{ fill: '#888', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            
            <Tooltip 
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                
                const ratio = chartData.findIndex(d => d.formattedTime === label) / chartData.length;
                const trackIndex = Math.floor(ratio * (tracks[0]?.points?.length || 1));
                
                const visibleEntries = payload.filter(entry => {
                  const nameStr = String(entry.name || '');
                  if (nameStr.startsWith('sog-') && activeMetrics.SOG) return true;
                  if (nameStr.startsWith('cog-') && activeMetrics.COG) return true;
                  if (nameStr.startsWith('twa-') && activeMetrics.TWA) return true;
                  if (nameStr.startsWith('vmg-') && activeMetrics.VMG) return true;
                  return false;
                });
                
                return (
                  <div className="bg-background/90 backdrop-blur-md p-3 rounded-lg border border-border shadow-xl">
                    <div className="space-y-2">
                      {visibleEntries.map((entry, index) => {
                        if (!activeBoats[entry.name?.toString().split('-')[1] || '']) return null;
                        
                        const metricType = entry.name?.toString().split('-')[0] || '';
                        let metricLabel = '';
                        
                        switch (metricType) {
                          case 'sog': metricLabel = 'SOG'; break;
                          case 'cog': metricLabel = 'COG'; break;
                          case 'twa': metricLabel = 'TWA'; break;
                          case 'vmg': metricLabel = 'VMG'; break;
                        }
                        
                        let formattedValue = typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value;
                        if (metricType === 'cog' || metricType === 'twa') formattedValue += '°';
                        if (metricType === 'sog' || metricType === 'vmg') formattedValue += ' kn';
                        
                        return (
                          <div 
                            key={index} 
                            className="flex items-center justify-between cursor-pointer hover:bg-accent/50 p-1 rounded"
                            onClick={() => handleTooltipClick(trackIndex)}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                              <span className="font-medium">{metricLabel}:</span>
                            </div>
                            <span className="font-medium ml-3">{formattedValue}</span>
                          </div>
                        );
                      })}
                      
                      {payload.some(entry => entry.dataKey === 'videoProximity' && Number(entry.value) > 0) && (
                        <div className="flex items-center gap-2 pt-1 mt-1 border-t border-border">
                          <div className="w-3 h-3 rounded-full bg-red-500" />
                          <span className="text-sm">Video position</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }}
              wrapperStyle={{ zIndex: 100 }}
            />
            
            {selecting && selectionStart !== null && selectionEnd !== null && (
              <ReferenceArea
                x1={chartData[Math.min(selectionStart, selectionEnd)]?.formattedTime}
                x2={chartData[Math.max(selectionStart, selectionEnd)]?.formattedTime}
                strokeOpacity={0.3}
                fill="#8884d8"
                fillOpacity={0.3}
              />
            )}
            
            {startRaceIndex !== undefined && endRaceIndex !== undefined && (
              <ReferenceArea
                x1={chartData[startRaceIndex]?.formattedTime}
                x2={chartData[endRaceIndex]?.formattedTime}
                strokeOpacity={0.3}
                fill="#82ca9d"
                fillOpacity={0.3}
              />
            )}
            
            {currentChartIndex !== null && chartData[currentChartIndex] && (
              <ReferenceLine
                x={chartData[currentChartIndex]?.formattedTime}
                stroke="red"
                strokeWidth={2}
                strokeDasharray="3 3"
              />
            )}
            
            {videoTimePosition && videoTimePosition.date && (
              <ReferenceLine
                x={chartData.find(d => d.videoMarker === 1)?.formattedTime}
                stroke="red"
                strokeWidth={2}
                label={{
                  value: "VIDEO",
                  position: "insideTopRight",
                  fill: "red",
                  fontSize: 10,
                  fontWeight: "bold"
                }}
              />
            )}
            
            <Scatter
              name="videoMarker"
              dataKey="videoMarker"
              fill="red"
              shape={(props: any) => {
                const { cx, cy } = props;
                const dataPoint = props.payload;
                
                if (!dataPoint.videoMarker) return null;
                
                return (
                  <g filter="url(#glow)">
                    <circle 
                      cx={cx} 
                      cy={30} 
                      r={8} 
                      fill="url(#videoMarkerGradient)" 
                      stroke="red"
                      strokeWidth={2}
                    />
                    <path
                      d={`M${cx-4},${30-4} L${cx+4},${30+4} M${cx+4},${30-4} L${cx-4},${30+4}`}
                      stroke="white"
                      strokeWidth={2}
                    />
                  </g>
                );
              }}
            />
            
            <Area
              type="monotone"
              dataKey="videoProximity"
              stroke="rgba(255,0,0,0.4)"
              strokeWidth={1}
              fillOpacity={0.4}
              fill="rgba(255,0,0,0.3)"
              activeDot={false}
            />
            
            {tracks.map(track => {
              if (!activeBoats[track.name]) return null;
              
              return (
                <React.Fragment key={track.name}>
                  {activeMetrics.SOG && (
                    <Line 
                      type="monotone"
                      dataKey={`sog-${track.name}`}
                      name={`sog-${track.name}`}
                      stroke={track.color}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6, stroke: 'white', strokeWidth: 2 }}
                      fill={`url(#colorGradient-${track.name})`}
                    />
                  )}
                  {activeMetrics.COG && (
                    <Line 
                      type="monotone"
                      dataKey={`cog-${track.name}`}
                      name={`cog-${track.name}`}
                      stroke={track.color}
                      strokeDasharray="5 5"
                      strokeWidth={1.5}
                      dot={false}
                    />
                  )}
                  {activeMetrics.TWA && (
                    <Line 
                      type="monotone"
                      dataKey={`twa-${track.name}`}
                      name={`twa-${track.name}`}
                      stroke={`${track.color}88`}
                      strokeWidth={1.5}
                      dot={false}
                      strokeDasharray="3 3"
                    />
                  )}
                  {activeMetrics.VMG && (
                    <Line 
                      type="monotone"
                      dataKey={`vmg-${track.name}`}
                      name={`vmg-${track.name}`}
                      stroke={`${track.color}88`}
                      strokeDasharray="2 2"
                      strokeWidth={1.5}
                      dot={false}
                    />
                  )}
                </React.Fragment>
              );
            })}

            {chartData.some(d => d.videoMarker === 1) && (
              <ReferenceLine
                x={chartData.find(d => d.videoMarker === 1)?.formattedTime}
                stroke="red"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            )}

            {showBrush && (
              <Brush 
                dataKey="formattedTime"
                height={30}
                stroke="#8884d8"
                startIndex={brushStartIndex}
                endIndex={brushEndIndex}
                onChange={handleBrushChange}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
};

export default TelemetryChart;
