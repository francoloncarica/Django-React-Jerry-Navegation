import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, LogOut, MapPin } from 'lucide-react';
import Map from '@/components/Map';
import GpxUploader, { TrackData } from '@/components/GpxUploader';
import TelemetryChart from '@/components/TelemetryChart';
import VideoPlayer from '@/components/VideoPlayer';
import TrackList from '@/components/TrackList';
import WindSettings from '@/components/WindSettings';
import BoatPanel from '@/components/BoatPanel';
import ComparativeReport from '@/components/ComparativeReport';
import { Map as MapIcon, LineChart, Settings, List, FileText, Play, BarChart3, Wind, Pause, ChevronLeft, ChevronRight, RefreshCw, Video, Layers } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getInterpolatedPoint } from '@/utils/interpolation';
import type { TrackPoint } from '@/components/GpxUploader';


type DisplayMode = 'lines' | 'points' | 'both';
type TrailType = 'speed' | 'tail' | 'full-tail';
type MapType = 'streets' | 'satellite' | 'outdoors' | 'light' | 'dark';

const Index = () => {
  const [tracks, setTracks] = useState<TrackData[]>([]);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(10);
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoSyncMode, setVideoSyncMode] = useState('auto');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('lines');
  const [trailType, setTrailType] = useState<TrailType>('full-tail');
  const [mapType, setMapType] = useState<MapType>('streets');
  const [showSOG, setShowSOG] = useState(true);
  const [showCOG, setShowCOG] = useState(false);
  const [showTWA, setShowTWA] = useState(false);
  const [showVMG, setShowVMG] = useState(false);
  const [windDirection, setWindDirection] = useState(0);
  const [isWindSettingsExpanded, setIsWindSettingsExpanded] = useState(false);
  const [startRaceIndex, setStartRaceIndex] = useState<number | undefined>(undefined);
  const [endRaceIndex, setEndRaceIndex] = useState<number | undefined>(undefined);
  const [ghostBoatIndex, setGhostBoatIndex] = useState<number | null>(null);
  const [showVideoUpload, setShowVideoUpload] = useState(false);
  const [videoKey, setVideoKey] = useState(0);
  const [videoTimePosition, setVideoTimePosition] = useState<{
    time: number;
    date: Date | null;
  }>({
    time: 0,
    date: null
  });

  const playbackOptions = [{
    value: "1",
    label: "0.1x"
  }, {
    value: "2",
    label: "0.2x"
  }, {
    value: "5",
    label: "0.5x"
  }, {
    value: "10",
    label: "1x"
  }, {
    value: "20",
    label: "2x"
  }, {
    value: "50",
    label: "5x"
  }, {
    value: "100",
    label: "10x"
  }, {
    value: "200",
    label: "20x"
  }];

  const handleMapLoaded = (mapInstance: any) => {
    console.log("Map fully loaded");
  };

  const handleGpxLoaded = (trackData: TrackData, fileName: string) => {
    const relativeTime = new Date();
    const updatedPoints = trackData.points.map(point => {
      const relativeWindAngle = (windDirection - point.cog + 360) % 360;
      const twa = relativeWindAngle > 180 ? 360 - relativeWindAngle : relativeWindAngle;
      const vmg = Math.abs(point.sog * Math.cos(relativeWindAngle * Math.PI / 180));
      return {
        ...point,
        twa,
        vmg
      };
    });
    setTracks(prev => [...prev, {
      ...trackData,
      points: updatedPoints,
      uploadDate: relativeTime
    }]);
    toast({
      title: "Track loaded",
      description: `${fileName} has been successfully loaded.`
    });
  };

  useEffect(() => {
    if (tracks.length === 0) return;
    const updatedTracks = tracks.map(track => {
      const updatedPoints = track.points.map(point => {
        const relativeWindAngle = (windDirection - point.cog + 360) % 360;
        const twa = relativeWindAngle > 180 ? 360 - relativeWindAngle : relativeWindAngle;
        const vmg = Math.abs(point.sog * Math.cos(relativeWindAngle * Math.PI / 180));
        return {
          ...point,
          twa,
          vmg
        };
      });
      return {
        ...track,
        points: updatedPoints
      };
    });
    setTracks(updatedTracks);
  }, [windDirection]);

  const togglePlay = () => {
    setPlaying(prev => !prev);
  };

  const reset = () => {
    setPlaying(false);
    setProgress(0);
    setCurrentTimeIndex(0);
  };

  const skipForward = () => {
    setProgress(prev => Math.min(prev + 0.01, 1));
  };

  const skipBackward = () => {
    setProgress(prev => Math.max(prev - 0.01, 0));
  };

  const handleVideoLoaded = (duration: number) => {
    console.log("Video duration received:", duration);
    setVideoDuration(duration);
  };

  const handleVideoUpload = (file: File) => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    const url = URL.createObjectURL(file);
    console.log("Video loaded:", url);
    setVideoUrl(url);
    setVideoKey(prev => prev + 1);
    setShowVideoUpload(true);
    toast({
      title: "Video cargado",
      description: "Video listo para sincronizar con datos de trayectoria"
    });
  };

  const handleVideoTimeSync = (videoTime: number, videoDate: Date | null) => {
    console.log(`Video time sync: ${videoTime}s, Date: ${videoDate}`);
    setVideoTimePosition({
      time: videoTime,
      date: videoDate
    });
    if (videoDate && tracks.length > 0) {
      const trackPoints = tracks[0].points;
      if (!trackPoints.length) return;

      const videoCurrentDate = new Date(videoDate.getTime());
      videoCurrentDate.setSeconds(videoCurrentDate.getSeconds() + videoTime);

      let closestPointIndex = 0;
      let minTimeDiff = Math.abs(trackPoints[0].time.getTime() - videoCurrentDate.getTime());
      for (let i = 1; i < trackPoints.length; i++) {
        const timeDiff = Math.abs(trackPoints[i].time.getTime() - videoCurrentDate.getTime());
        if (timeDiff < minTimeDiff) {
          closestPointIndex = i;
          minTimeDiff = timeDiff;
        }
      }

      if (minTimeDiff < 60000) {
        setCurrentTimeIndex(closestPointIndex);
        setProgress(closestPointIndex / (trackPoints.length - 1));
        console.log(`Synced video to track point ${closestPointIndex}`);
      }
    }
  };

  const handleCloseVideo = () => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
    }
    setShowVideoUpload(false);
  };

  const handleRemoveTrack = (index: number) => {
    if (tracks.length === 1) {
      setTracks([]);
      setCurrentTimeIndex(0);
      setProgress(0);
      setPlaying(false);
      setStartRaceIndex(undefined);
      setEndRaceIndex(undefined);
      setGhostBoatIndex(null);
      toast({
        title: "All tracks removed",
        description: "All track data has been cleared."
      });
    } else {
      setTracks(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleHoverPositionChange = (timeIndex: number) => {
    setGhostBoatIndex(timeIndex);
  };

  const handlePositionClick = (timeIndex: number) => {
    setCurrentTimeIndex(timeIndex);
    setGhostBoatIndex(null);
    if (tracks.length > 0) {
      const maxPoints = tracks.reduce((max, track) => Math.max(max, track.points.length), 0);
      setProgress(timeIndex / (maxPoints - 1));
    }
  };

  const handleSelectInterval = (start: number, end: number) => {
    setStartRaceIndex(start);
    setEndRaceIndex(end);
  };

  useEffect(() => {
    if (tracks.length === 0) return;
    const maxPointsTrack = tracks.reduce((max, track) => track.points.length > max.points.length ? track : max, tracks[0]);
    const index = Math.min(Math.floor(progress * maxPointsTrack.points.length), maxPointsTrack.points.length - 1);
    setCurrentTimeIndex(index);
    setGhostBoatIndex(null);
  }, [progress, tracks]);

  useEffect(() => {
    if (!playing) return;
    let lastTime = performance.now();
    let animationFrameId: number;
    const animate = (time: number) => {
      const deltaTime = time - lastTime;
      lastTime = time;
      const secondsPerPoint = 0.1;
      const adjustedPlaybackSpeed = playbackSpeed / 10;
      const increment = deltaTime / 1000 / (secondsPerPoint / adjustedPlaybackSpeed);
      setProgress(prev => {
        let newProgress = prev + increment / (tracks[0]?.points?.length || 100);
        if (startRaceIndex !== undefined && endRaceIndex !== undefined) {
          const maxPoints = tracks[0]?.points?.length || 1;
          const startProgress = startRaceIndex / maxPoints;
          const endProgress = endRaceIndex / maxPoints;
          if (newProgress >= endProgress) {
            return startProgress;
          }
          if (newProgress < startProgress) {
            return startProgress;
          }
          return newProgress;
        } else {
          if (newProgress >= 1) {
            setPlaying(false);
            return 1;
          }
          return newProgress;
        }
      });
      if (playing) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };
    animationFrameId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [playing, playbackSpeed, startRaceIndex, endRaceIndex, tracks]);

  const toggleWindSettings = () => {
    setIsWindSettingsExpanded(prev => !prev);
  };

  const handleSave = () => {
    toast({
      title: "Guardado exitoso",
      description: "Los cambios han sido guardados correctamente."
    });
  };

  const handleLogout = () => {
    toast({
      title: "Cerrando sesión",
      description: "Redirigiendo al inicio de sesión..."
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 sticky top-0 z-40 backdrop-blur-md border-b border-gray-200/50 py-2">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold flex items-center gap-2 text-gray-700">
              <MapIcon className="h-5 w-5 text-blue-400" /> 
              BoatIQ Analytics
            </h1>
            <div className="flex items-center gap-3">
              <GpxUploader onGpxLoaded={handleGpxLoaded} />
              
              <Button variant="ghost" size="sm" onClick={() => setShowVideoUpload(!showVideoUpload)} className="hover:bg-gray-200/70 text-gray-700">
                <Video className="h-4 w-4 mr-1" />
                Video
              </Button>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="hover:bg-gray-200/70 text-gray-700">
                    <Layers className="h-4 w-4 mr-1" />
                    Map Style
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56">
                  <div className="grid gap-1">





                    
                    <Button variant={mapType === 'streets' ? 'default' : 'ghost'} onClick={() => setMapType('streets')} size="sm" className="justify-start">
                      Streets
                    </Button>
                    <Button variant={mapType === 'satellite' ? 'default' : 'ghost'} onClick={() => setMapType('satellite')} size="sm" className="justify-start">
                      Satellite
                    </Button>
                    <Button variant={mapType === 'outdoors' ? 'default' : 'ghost'} onClick={() => setMapType('outdoors')} size="sm" className="justify-start">
                      Outdoors
                    </Button>
                    <Button variant={mapType === 'light' ? 'default' : 'ghost'} onClick={() => setMapType('light')} size="sm" className="justify-start">
                      Light
                    </Button>
                    <Button variant={mapType === 'dark' ? 'default' : 'ghost'} onClick={() => setMapType('dark')} size="sm" className="justify-start">
                      Dark
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              
              <div className="flex gap-1 bg-gray-100/80 rounded-md overflow-hidden border border-gray-200/50">
                <Button variant={trailType === 'speed' ? 'secondary' : 'ghost'} onClick={() => setTrailType('speed')} size="sm" className="flex items-center gap-1 rounded-none h-8 hover:bg-gray-200/70 text-gray-700">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Speed
                </Button>
                <Button variant={trailType === 'tail' ? 'secondary' : 'ghost'} onClick={() => setTrailType('tail')} size="sm" className="flex items-center gap-1 rounded-none h-8 hover:bg-gray-200/70 text-gray-700">
                  <Play className="h-3.5 w-3.5" />
                  Tail
                </Button>
                <Button variant={trailType === 'full-tail' ? 'secondary' : 'ghost'} onClick={() => setTrailType('full-tail')} size="sm" className="flex items-center gap-1 rounded-none h-8 hover:bg-gray-200/70 text-gray-700">
                  <MapIcon className="h-3.5 w-3.5" />
                  Full
                </Button>
              </div>
              
              <Button variant="outline" size="sm" onClick={handleSave} className="text-gray-700 border-gray-300 hover:bg-gray-100 hover:text-gray-900">
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
              
              <Button variant="outline" size="sm" onClick={handleLogout} className="text-gray-700 border-gray-300 hover:bg-gray-100 hover:text-gray-900">
                <LogOut className="h-4 w-4 mr-1" />
                Exit
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-4 space-y-4">
        <div className="space-y-4">
          <div className="relative w-full">
            <Map tracks={tracks} currentTimeIndex={currentTimeIndex} displayMode={displayMode} windDirection={windDirection} trailType={trailType} mapType={mapType} onHoverPositionChange={handleHoverPositionChange} onMapLoaded={handleMapLoaded} ghostBoatIndex={ghostBoatIndex} onPositionClick={handlePositionClick}>
              <WindSettings windDirection={windDirection} setWindDirection={setWindDirection} isExpanded={isWindSettingsExpanded} toggleExpanded={toggleWindSettings} />
              <BoatPanel tracks={tracks} currentTimeIndex={currentTimeIndex} />
              
              {showVideoUpload && <div className="absolute top-4 right-4 z-20 w-1/3 max-w-md">
                  <VideoPlayer key={videoKey} videoUrl={videoUrl} playing={playing} progress={progress} playbackSpeed={playbackSpeed} onClose={handleCloseVideo} onVideoLoaded={handleVideoLoaded} onTimeSync={handleVideoTimeSync} />
                </div>}
            </Map>
          </div>
          
          <div className="rounded-lg p-3 shadow-md flex items-center justify-between bg-slate-100">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={skipBackward} className="hover:bg-white/20 text-zinc-950">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              
              <Button variant="ghost" size="sm" onClick={togglePlay} className="hover:bg-white/20 text-zinc-950">
                {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
              
              <Button variant="ghost" size="sm" onClick={skipForward} className="hover:bg-white/20 text-gray-950">
                <ChevronRight className="h-5 w-5" />
              </Button>
              
              <Button variant="ghost" size="sm" onClick={reset} className="hover:bg-white/20 text-gray-950">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex-1 mx-4">
              <input type="range" min="0" max="1" step="0.001" value={progress} onChange={e => setProgress(parseFloat(e.target.value))} className="w-full" />
            </div>
            
            <div>
              <select value={playbackSpeed} onChange={e => setPlaybackSpeed(Number(e.target.value))} className="text-white text-sm border border-white/20 rounded px-2 py-1 bg-zinc-300">
                {playbackOptions.map(option => <option key={option.value} value={option.value} className="bg-gray-800">
                    {option.label}
                  </option>)}
              </select>
            </div>
          </div>
          
          <div className="h-[30vh] bg-card rounded-lg p-4 shadow-lg w-full relative">
            <TelemetryChart 
              tracks={tracks}
              currentTimeIndex={currentTimeIndex}
              showSOG={showSOG}
              showCOG={showCOG}
              showTWA={showTWA}
              showVMG={showVMG}
              onHoverPositionChange={handleHoverPositionChange}
              onPositionClick={handlePositionClick}
              startRaceIndex={startRaceIndex}
              endRaceIndex={endRaceIndex}
              onSelectInterval={handleSelectInterval}
              videoTimePosition={videoTimePosition}
            />
          </div>
        </div>
        
        <Tabs defaultValue="tracks" className="pt-4">
          <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto">
            <TabsTrigger value="tracks" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Tracks
            </TabsTrigger>
            <TabsTrigger value="report" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Report
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="tracks">
            <TrackList tracks={tracks} onRemoveTrack={handleRemoveTrack} />
          </TabsContent>
          
          <TabsContent value="report">
            <ComparativeReport 
              tracks={tracks} 
              startRaceIndex={startRaceIndex} 
              endRaceIndex={endRaceIndex} 
            />
          </TabsContent>
          
          <TabsContent value="settings">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-card rounded-lg p-4 shadow-md">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Chart Options
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant={showSOG ? "default" : "outline"} onClick={() => setShowSOG(!showSOG)} className="w-full">
                    Show SOG
                  </Button>
                  <Button variant={showCOG ? "default" : "outline"} onClick={() => setShowCOG(!showCOG)} className="w-full">
                    Show COG
                  </Button>
                  <Button variant={showTWA ? "default" : "outline"} onClick={() => setShowTWA(!showTWA)} className="w-full">
                    Show TWA
                  </Button>
                  <Button variant={showVMG ? "default" : "outline"} onClick={() => setShowVMG(!showVMG)} className="w-full">
                    Show VMG
                  </Button>
                </div>

                {startRaceIndex !== undefined && endRaceIndex !== undefined && (
                  <div className="mt-4">
                    <Button 
                      onClick={() => {
                        setStartRaceIndex(undefined);
                        setEndRaceIndex(undefined);
                      }} 
                      variant="destructive" 
                      size="sm"
                    >
                      Clear Interval Selection
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="bg-card rounded-lg p-4 shadow-md">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <Wind className="h-4 w-4" />
                  Wind Direction
                </h3>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <input type="range" min="0" max="359" value={windDirection} onChange={e => setWindDirection(parseInt(e.target.value))} className="w-full" />
                  </div>
                  <div className="w-16 text-center">
                    <span className="text-lg font-mono">{windDirection}°</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
