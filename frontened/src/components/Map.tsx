import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { TrackData } from './GpxUploader';
import { Navigation } from 'lucide-react';

interface MapProps {
  tracks: TrackData[];
  currentTimeIndex: number;
  displayMode: 'lines' | 'points' | 'both';
  windDirection: number;
  children?: React.ReactNode;
  onHoverPositionChange?: (timeIndex: number) => void;
  trailType: 'speed' | 'tail' | 'full-tail';
  mapType: 'streets' | 'satellite' | 'outdoors' | 'light' | 'dark';
  onMapLoaded?: (map: maplibregl.Map) => void;
  ghostBoatIndex?: number | null;
  onPositionClick?: (timeIndex: number) => void;
}

type PointGeometry = GeoJSON.Point;
type LineStringGeometry = GeoJSON.LineString;
type FeatureProperties = {
  [name: string]: any;
  trackName?: string;
  timeIndex?: number;
  sog?: number;
  cog?: number;
  twa?: number;
  vmg?: number;
  opacity?: number;
};
type PointFeature = GeoJSON.Feature<PointGeometry, FeatureProperties>;
type LineStringFeature = GeoJSON.Feature<LineStringGeometry, FeatureProperties>;

const getColorFromSOG = (sog: number): string => {
  if (sog < 5) return '#4ade80'; // Green for low speed
  if (sog < 10) return '#fbbf24'; // Yellow for medium speed
  return '#f87171'; // Red for high speed
};

const Map: React.FC<MapProps> = ({ 
  tracks, 
  currentTimeIndex, 
  displayMode = 'lines',
  windDirection,
  children,
  onHoverPositionChange,
  trailType = 'full-tail',
  mapType = 'streets',
  onMapLoaded,
  ghostBoatIndex,
  onPositionClick
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const sourcesRef = useRef<string[]>([]);
  const layersRef = useRef<string[]>([]);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [initialBoundsSet, setInitialBoundsSet] = useState(false);
  const tracksRef = useRef<TrackData[]>([]);
  const lastDisplayModeRef = useRef(displayMode);
  const lastTrailTypeRef = useRef(trailType);
  const lastWindDirectionRef = useRef(windDirection);
  const lastMapTypeRef = useRef(mapType);
  const [tracksRendered, setTracksRendered] = useState(false);
  const [hoveredTrackPoint, setHoveredTrackPoint] = useState<any>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const ghostMarkerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const getMapStyle = () => {
      switch (mapType) {
        case 'satellite':
          return 'https://api.maptiler.com/maps/satellite/style.json?key=ir5GXRGkBDBqGMuI62C4';
        case 'outdoors':
          return 'https://api.maptiler.com/maps/outdoor/style.json?key=ir5GXRGkBDBqGMuI62C4';
        case 'light':
          return 'https://api.maptiler.com/maps/dataviz-light/style.json?key=ir5GXRGkBDBqGMuI62C4';
        case 'dark':
          return 'https://api.maptiler.com/maps/dataviz-dark/style.json?key=ir5GXRGkBDBqGMuI62C4';
        case 'streets':
        default:
          return 'https://api.maptiler.com/maps/dataviz/style.json?key=ir5GXRGkBDBqGMuI62C4';
      }
    };

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: getMapStyle(),
      center: [0, 0],
      zoom: 2,
      attributionControl: false
    });

    map.current.on('load', () => {
      setMapInitialized(true);
      if (onMapLoaded && map.current) {
        onMapLoaded(map.current);
      }
      
      const existingControls = document.querySelectorAll('.maplibregl-ctrl-top-right');
      existingControls.forEach(control => control.remove());
      
      if (tracks.length > 0 && !tracksRendered) {
        updateTrackRendering();
        setTracksRendered(true);
      }
    });

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }

      if (ghostMarkerRef.current) {
        ghostMarkerRef.current.remove();
        ghostMarkerRef.current = null;
      }
      
      if (map.current) {
        layersRef.current.forEach(layerId => {
          if (map.current && map.current.getLayer(layerId)) {
            map.current.removeLayer(layerId);
          }
        });
        
        sourcesRef.current.forEach(sourceId => {
          if (map.current && map.current.getSource(sourceId)) {
            map.current.removeSource(sourceId);
          }
        });
        
        map.current.remove();
        map.current = null;
      }
    };
  }, [mapType]);

  useEffect(() => {
    if (map.current && mapInitialized) {
      if (mapType !== lastMapTypeRef.current) {
        const getMapStyle = () => {
          switch (mapType) {
            case 'satellite':
              return 'https://api.maptiler.com/maps/satellite/style.json?key=ir5GXRGkBDBqGMuI62C4';
            case 'outdoors':
              return 'https://api.maptiler.com/maps/outdoor/style.json?key=ir5GXRGkBDBqGMuI62C4';
            case 'light':
              return 'https://api.maptiler.com/maps/dataviz-light/style.json?key=ir5GXRGkBDBqGMuI62C4';
            case 'dark':
              return 'https://api.maptiler.com/maps/dataviz-dark/style.json?key=ir5GXRGkBDBqGMuI62C4';
            case 'streets':
            default:
              return 'https://api.maptiler.com/maps/dataviz/style.json?key=ir5GXRGkBDBqGMuI62C4';
          }
        };

        map.current.setStyle(getMapStyle());
        lastMapTypeRef.current = mapType;
        
        map.current.once('style.load', () => {
          updateTrackRendering();
          updateBoatMarkers();
        });
      }
    }
  }, [mapType, mapInitialized]);

  useEffect(() => {
    if (map.current && mapInitialized && windDirection !== lastWindDirectionRef.current) {
      map.current.rotateTo(windDirection, { duration: 1000 });
      lastWindDirectionRef.current = windDirection;
    }
  }, [windDirection, mapInitialized]);

  useEffect(() => {
    if (displayMode !== lastDisplayModeRef.current || trailType !== lastTrailTypeRef.current) {
      lastDisplayModeRef.current = displayMode;
      lastTrailTypeRef.current = trailType;
      
      if (map.current && mapInitialized && tracks.length > 0) {
        updateTrackRendering();
      }
    }
  }, [displayMode, trailType, mapInitialized]);

  useEffect(() => {
    if (JSON.stringify(tracks) !== JSON.stringify(tracksRef.current)) {
      tracksRef.current = [...tracks];
      
      if (map.current && mapInitialized) {
        updateTrackRendering();
        updateInitialBounds();
        setTracksRendered(true);
      }
    }
  }, [tracks, mapInitialized]);

  useEffect(() => {
    if (map.current && mapInitialized) {
      updateBoatMarkers();
      updateGhostBoat();
      
      if (trailType === 'tail') {
        updateTrackRendering();
      }
    }
  }, [currentTimeIndex, mapInitialized, ghostBoatIndex]);

  const updateInitialBounds = () => {
    if (!map.current || tracks.length === 0) return;
    
    const bounds = new maplibregl.LngLatBounds();
    
    tracks.forEach(track => {
      if (track.points && track.points.length > 0) {
        track.points.forEach(point => {
          bounds.extend([point.lon, point.lat]);
        });
      }
    });

    if (!bounds.isEmpty() && !initialBoundsSet) {
      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 16
      });
      setInitialBoundsSet(true);
    }
  };

  const handleTrackInteraction = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] | undefined }) => {
    if (!onHoverPositionChange || !map.current || !e.features || e.features.length === 0) return;
    
    const feature = e.features[0];
    if (!feature || !feature.properties) return;
    
    const trackIndex = feature.properties.timeIndex;
    if (trackIndex !== undefined) {
      setHoveredTrackPoint({
        coordinates: feature.geometry.type === 'Point' ? (feature.geometry as PointGeometry).coordinates : null,
        properties: feature.properties
      });
      
      onHoverPositionChange(parseInt(String(trackIndex)));
      
      if (feature.geometry.type === 'Point') {
        const pointGeometry = feature.geometry as PointGeometry;
        const coordinates = pointGeometry.coordinates.slice() as [number, number];
        
        if (!popupRef.current) {
          popupRef.current = new maplibregl.Popup({
            closeButton: false,
            className: 'track-popup'
          })
          .setLngLat(coordinates)
          .setHTML(createPopupContent(feature.properties))
          .addTo(map.current);
        } else {
          popupRef.current
            .setLngLat(coordinates)
            .setHTML(createPopupContent(feature.properties));
        }
      }
    }
  };
  
  const handleTrackClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] | undefined }) => {
    if (!onPositionClick || !map.current || !e.features || e.features.length === 0) return;
    
    const feature = e.features[0];
    if (!feature || !feature.properties) return;
    
    const trackIndex = feature.properties.timeIndex;
    if (trackIndex !== undefined) {
      onPositionClick(parseInt(String(trackIndex)));
    }
  };

  const createPopupContent = (properties: any) => {
    const trackName = properties.trackName;
    const timeIndex = properties.timeIndex;
    const sog = properties.sog;
    const cog = properties.cog;
    const twa = properties.twa;
    const vmg = properties.vmg;
    
    return `
      <div class="bg-background/90 backdrop-blur-md p-3 rounded-lg border shadow-lg text-sm">
        <div class="font-semibold border-b pb-1 mb-2">${trackName}</div>
        <div class="grid grid-cols-2 gap-x-4 gap-y-1">
          <div>SOG:</div><div class="font-medium">${sog?.toFixed(2)} kts</div>
          <div>COG:</div><div class="font-medium">${cog?.toFixed(1)}°</div>
          <div>TWA:</div><div class="font-medium">${twa?.toFixed(1)}��</div>
          <div>VMG:</div><div class="font-medium">${vmg?.toFixed(2)} kts</div>
        </div>
      </div>
    `;
  };

  const updateGhostBoat = () => {
    if (!map.current || ghostBoatIndex === null || !tracks.length) {
      if (ghostMarkerRef.current) {
        ghostMarkerRef.current.remove();
        ghostMarkerRef.current = null;
      }
      return;
    }

    const track = tracks[0];
    const ghostPoint = track?.points[ghostBoatIndex];
    
    if (!ghostPoint) {
      if (ghostMarkerRef.current) {
        ghostMarkerRef.current.remove();
        ghostMarkerRef.current = null;
      }
      return;
    }

    const el = document.createElement('div');
    el.className = 'ghost-boat-marker';
    el.style.color = track.color;
    
    el.style.transform = `rotate(${ghostPoint.cog}deg)`;
    
    el.innerHTML = `
      <div class="ghost-boat-container">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="${track.color}40" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 3v18m-5-5l5-2 5 2M9.5 5h5" />
          <path d="m6 12 3-2v2m6-2 3 2m-3-2v2" />
        </svg>
        <div class="ghost-boat-name">Preview</div>
      </div>
    `;
    
    if (ghostMarkerRef.current) {
      ghostMarkerRef.current.remove();
    }
    
    ghostMarkerRef.current = new maplibregl.Marker({
      element: el,
      rotationAlignment: 'map'
    })
    .setLngLat([ghostPoint.lon, ghostPoint.lat])
    .addTo(map.current);
  };

  const updateBoatMarkers = () => {
    if (!map.current || !mapInitialized) return;
    
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    
    tracks.forEach((track) => {
      const currentPoint = track.points[currentTimeIndex];
      if (!currentPoint) return;
      
      const el = document.createElement('div');
      el.className = 'boat-marker';
      el.style.color = track.color;
      
      el.style.transform = `rotate(${currentPoint.cog}deg)`;
      
      el.innerHTML = `
        <div class="boat-icon-container">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="${track.color}" stroke="white" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12,2 20,18 12,14 4,18" />
          </svg>
          <div class="boat-name">${track.name}</div>
        </div>
      `;
      
      const marker = new maplibregl.Marker({
        element: el,
        rotationAlignment: 'map'
      })
      .setLngLat([currentPoint.lon, currentPoint.lat])
      .addTo(map.current);
      
      markersRef.current.push(marker);
    });
  };

  const updateTrackRendering = () => {
    if (!map.current || !mapInitialized || tracks.length === 0) return;
    
    layersRef.current.forEach(layerId => {
      if (map.current?.getLayer(layerId)) {
        map.current.removeLayer(layerId);
      }
    });
    
    sourcesRef.current.forEach(sourceId => {
      if (map.current?.getSource(sourceId)) {
        map.current.removeSource(sourceId);
      }
    });
    
    layersRef.current = [];
    sourcesRef.current = [];
    
    tracks.forEach((track, trackIndex) => {
      if (!track.points || track.points.length === 0) return;
      
      let visiblePoints = [];
      const currentPoint = track.points[currentTimeIndex];
      
      if (trailType === 'speed' || trailType === 'full-tail') {
        visiblePoints = [...track.points];
      } else if (trailType === 'tail' && currentPoint) {
        const tailLength = 15;
        const startIdx = Math.max(0, currentTimeIndex - tailLength);
        visiblePoints = track.points.slice(startIdx, currentTimeIndex + 1);
      }
      
      if (visiblePoints.length === 0) return;
      
      if (trailType === 'tail') {
        const features: PointFeature[] = visiblePoints.map((point, idx) => {
          const actualIndex = Math.max(0, currentTimeIndex - (visiblePoints.length - 1 - idx));
          return {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [point.lon, point.lat]
            },
            properties: {
              trackName: track.name,
              timeIndex: actualIndex,
              sog: point.sog,
              cog: point.cog,
              twa: point.twa,
              vmg: point.vmg,
              opacity: (idx + 1) / visiblePoints.length
            }
          };
        });

        for (let i = 1; i < visiblePoints.length; i++) {
          const sourceId = `track-line-${trackIndex}-segment-${i}`;
          const layerId = `track-line-layer-${trackIndex}-segment-${i}`;
          const startPoint = visiblePoints[i-1];
          const endPoint = visiblePoints[i];
          const opacity = i / visiblePoints.length;
          
          map.current.addSource(sourceId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {
                opacity: opacity
              },
              geometry: {
                type: 'LineString',
                coordinates: [
                  [startPoint.lon, startPoint.lat],
                  [endPoint.lon, endPoint.lat]
                ]
              }
            } as LineStringFeature
          });
          
          map.current.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': track.color,
              'line-width': 1.5,
              'line-opacity': opacity
            }
          });
          
          sourcesRef.current.push(sourceId);
          layersRef.current.push(layerId);
        }
        
        const pointsSourceId = `track-points-${trackIndex}`;
        const pointsLayerId = `track-points-layer-${trackIndex}`;
        
        map.current.addSource(pointsSourceId, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: features
          }
        });
        
        if (displayMode === 'points' || displayMode === 'both') {
          map.current.addLayer({
            id: `${pointsLayerId}-visible`,
            type: 'circle',
            source: pointsSourceId,
            paint: {
              'circle-radius': 4,
              'circle-color': track.color,
              'circle-opacity': ['get', 'opacity']
            }
          });
          layersRef.current.push(`${pointsLayerId}-visible`);
        }
        
        map.current.addLayer({
          id: pointsLayerId,
          type: 'circle',
          source: pointsSourceId,
          paint: {
            'circle-radius': 10,
            'circle-color': track.color,
            'circle-opacity': 0
          }
        });
        
        sourcesRef.current.push(pointsSourceId);
        layersRef.current.push(pointsLayerId);
        
        map.current.on('click', pointsLayerId, handleTrackClick);
        map.current.on('mousemove', pointsLayerId, handleTrackInteraction);
        
        map.current.on('mouseenter', pointsLayerId, () => {
          if (map.current) map.current.getCanvas().style.cursor = 'pointer';
        });
        
        map.current.on('mouseleave', pointsLayerId, () => {
          if (map.current) map.current.getCanvas().style.cursor = '';
          
          if (popupRef.current) {
            popupRef.current.remove();
            popupRef.current = null;
          }
        });
      } else if (trailType === 'speed') {
        let speedSegments = [];
        let currentSegment = [];
        let currentSegmentProps = [];
        let currentColor = getColorFromSOG(visiblePoints[0].sog);
        
        for (let i = 0; i < visiblePoints.length; i++) {
          const point = visiblePoints[i];
          const pointColor = getColorFromSOG(point.sog);
          
          if (pointColor !== currentColor || i === visiblePoints.length - 1) {
            if (i === visiblePoints.length - 1) {
              currentSegment.push([point.lon, point.lat]);
              currentSegmentProps.push({
                trackName: track.name,
                timeIndex: i,
                sog: point.sog,
                cog: point.cog,
                twa: point.twa,
                vmg: point.vmg
              });
            }
            
            if (currentSegment.length > 0) {
              const features: PointFeature[] = currentSegment.map((coords, idx) => ({
                type: "Feature",
                geometry: {
                  type: "Point",
                  coordinates: coords
                },
                properties: currentSegmentProps[idx]
              }));
              
              speedSegments.push({
                coordinates: [...currentSegment],
                color: currentColor,
                features: features
              });
              
              currentSegment = [[point.lon, point.lat]];
              currentSegmentProps = [{
                trackName: track.name,
                timeIndex: i,
                sog: point.sog,
                cog: point.cog,
                twa: point.twa,
                vmg: point.vmg
              }];
              currentColor = pointColor;
            }
          } else {
            currentSegment.push([point.lon, point.lat]);
            currentSegmentProps.push({
              trackName: track.name,
              timeIndex: i,
              sog: point.sog,
              cog: point.cog,
              twa: point.twa,
              vmg: point.vmg
            });
          }
        }
        
        speedSegments.forEach((segment, segIndex) => {
          if (segment.coordinates.length < 2) return;
          
          const sourceId = `track-source-${trackIndex}-${segIndex}`;
          const layerId = `track-layer-${trackIndex}-${segIndex}`;
          
          map.current?.addSource(sourceId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: segment.coordinates
              }
            } as LineStringFeature
          });
          
          map.current?.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': segment.color,
              'line-width': 1.5,
              'line-opacity': 0.8
            }
          });
          
          sourcesRef.current.push(sourceId);
          layersRef.current.push(layerId);
          
          const pointsSourceId = `track-points-${trackIndex}-${segIndex}`;
          const pointsLayerId = `track-points-layer-${trackIndex}-${segIndex}`;
          
          map.current?.addSource(pointsSourceId, {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: segment.features
            }
          });
          
          if (displayMode === 'points' || displayMode === 'both') {
            map.current?.addLayer({
              id: `${pointsLayerId}-visible`,
              type: 'circle',
              source: pointsSourceId,
              paint: {
                'circle-radius': 4,
                'circle-color': segment.color,
                'circle-opacity': 0.8
              }
            });
            layersRef.current.push(`${pointsLayerId}-visible`);
          }
          
          map.current?.addLayer({
            id: pointsLayerId,
            type: 'circle',
            source: pointsSourceId,
            paint: {
              'circle-radius': 10,
              'circle-color': segment.color,
              'circle-opacity': 0
            }
          });
          
          sourcesRef.current.push(pointsSourceId);
          layersRef.current.push(pointsLayerId);
          
          map.current?.on('click', pointsLayerId, handleTrackClick);
          map.current?.on('mousemove', pointsLayerId, handleTrackInteraction);
          
          map.current?.on('mouseenter', pointsLayerId, () => {
            if (map.current) map.current.getCanvas().style.cursor = 'pointer';
          });
          
          map.current?.on('mouseleave', pointsLayerId, () => {
            if (map.current) map.current.getCanvas().style.cursor = '';
            
            if (popupRef.current) {
              popupRef.current.remove();
              popupRef.current = null;
            }
          });
        });
      } else {
        const features: PointFeature[] = visiblePoints.map((point, idx) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [point.lon, point.lat]
          },
          properties: {
            trackName: track.name,
            timeIndex: idx,
            sog: point.sog,
            cog: point.cog,
            twa: point.twa,
            vmg: point.vmg
          }
        }));
        
        const sourceId = `track-line-${trackIndex}`;
        const layerId = `track-line-layer-${trackIndex}`;
        
        map.current.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: visiblePoints.map(point => [point.lon, point.lat])
            }
          } as LineStringFeature
        });
        
        map.current.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': track.color,
            'line-width': 1.5,
            'line-opacity': 0.8
          }
        });
        
        sourcesRef.current.push(sourceId);
        layersRef.current.push(layerId);
        
        const pointsSourceId = `track-points-${trackIndex}`;
        const pointsLayerId = `track-points-layer-${trackIndex}`;
        
        map.current.addSource(pointsSourceId, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: features
          }
        });
        
        if (displayMode === 'points' || displayMode === 'both') {
          map.current.addLayer({
            id: `${pointsLayerId}-visible`,
            type: 'circle',
            source: pointsSourceId,
            paint: {
              'circle-radius': 4,
              'circle-color': track.color,
              'circle-opacity': 0.8
            }
          });
          layersRef.current.push(`${pointsLayerId}-visible`);
        }
        
        map.current.addLayer({
          id: pointsLayerId,
          type: 'circle',
          source: pointsSourceId,
          paint: {
            'circle-radius': 10,
            'circle-color': track.color,
            'circle-opacity': 0
          }
        });
        
        sourcesRef.current.push(pointsSourceId);
        layersRef.current.push(pointsLayerId);
        
        map.current.on('click', pointsLayerId, handleTrackClick);
        map.current.on('mousemove', pointsLayerId, handleTrackInteraction);
        
        map.current.on('mouseenter', pointsLayerId, () => {
          if (map.current) map.current.getCanvas().style.cursor = 'pointer';
        });
        
        map.current.on('mouseleave', pointsLayerId, () => {
          if (map.current) map.current.getCanvas().style.cursor = '';
          
          if (popupRef.current) {
            popupRef.current.remove();
            popupRef.current = null;
          }
        });
      }
    });
  };

  return (
    <div className="relative w-full h-[calc(100vh-24rem)] rounded-lg overflow-hidden shadow-lg border border-border">
      <div ref={mapContainer} className="absolute inset-0" />
      {children}
      <style>
        {`
        .maplibregl-ctrl-top-right,
        .maplibregl-ctrl-bottom-left,
        .maplibregl-ctrl-bottom-right,
        .maplibregl-ctrl-attrib {
          display: none !important;
        }
        .boat-marker {
          width: 28px;
          height: 28px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .boat-icon-container {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .boat-name {
          position: absolute;
          bottom: -16px;
          text-align: center;
          color: white;
          font-size: 10px;
          font-weight: bold;
          background-color: rgba(0,0,0,0.7);
          padding: 2px 4px;
          border-radius: 4px;
          white-space: nowrap;
          transform: translateY(100%);
        }
        .ghost-boat-marker {
          width: 32px;
          height: 32px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.6;
          pointer-events: none;
        }
        .ghost-boat-container {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .ghost-boat-name {
          position: absolute;
          bottom: -16px;
          text-align: center;
          color: white;
          font-size: 10px;
          font-weight: bold;
          background-color: rgba(0,0,0,0.7);
          padding: 2px 4px;
          border-radius: 4px;
          white-space: nowrap;
          transform: translateY(100%);
        }
        .track-popup .maplibregl-popup-content {
          background: transparent !important;
          padding: 0 !important;
          box-shadow: none !important;
          border-radius: 8px;
          pointer-events: none;
        }
        .track-popup .maplibregl-popup-tip {
          display: none;
        }
        `}
      </style>
    </div>
  );
};

export default Map;
