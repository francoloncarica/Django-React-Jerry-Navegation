
import React, { useState } from 'react';
import { TrackData } from './GpxUploader';
import { 
  Table, TableBody, TableCaption, TableCell, 
  TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { FileText, ArrowUpDown } from 'lucide-react';

const ComparativeReport = ({ tracks, startRaceIndex, endRaceIndex }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });
  
  if (!tracks || tracks.length === 0) {
    return null;
  }

  const trackMetrics = tracks.map(track => {
    const startIdx = startRaceIndex !== undefined ? startRaceIndex : 0;
    const endIdx = endRaceIndex !== undefined ? endRaceIndex : track.points.length - 1;
    const racePoints = track.points.slice(startIdx, endIdx + 1);
    
    if (racePoints.length === 0) return null;
    
    let totalSOG = 0, maxSOG = 0;
    let totalVMG = 0, maxVMG = -Infinity;
    let totalTWA = 0;
    let distance = 0;
    let time = 0;
    
    for (let i = 0; i < racePoints.length; i++) {
      const point = racePoints[i];
      
      totalSOG += point.sog;
      maxSOG = Math.max(maxSOG, point.sog);
      
      totalVMG += point.vmg;
      maxVMG = Math.max(maxVMG, point.vmg);
      
      totalTWA += point.twa;
      
      if (i > 0) {
        const prev = racePoints[i - 1];
        const R = 6371; // Earth radius in km
        const dLat = (point.lat - prev.lat) * Math.PI / 180;
        const dLon = (point.lon - prev.lon) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(prev.lat * Math.PI / 180) * Math.cos(point.lat * Math.PI / 180) * 
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const d = R * c;
        distance += d;
      }
    }
    
    if (racePoints.length > 1) {
      const startTime = racePoints[0].time.getTime();
      const endTime = racePoints[racePoints.length - 1].time.getTime();
      time = (endTime - startTime) / (1000 * 60 * 60); // Convert to hours
    }
    
    return {
      name: track.name,
      color: track.color,
      avgSOG: totalSOG / racePoints.length,
      maxSOG,
      avgVMG: totalVMG / racePoints.length,
      maxVMG,
      avgTWA: totalTWA / racePoints.length,
      distance,
      time,
      speed: time > 0 ? distance / time : 0
    };
  }).filter(Boolean);
  
  const sortedData = [...trackMetrics].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === 'ascending' ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === 'ascending' ? 1 : -1;
    }
    return 0;
  });
  
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const generateReport = () => {
    const reportContent = trackMetrics.map(track => {
      return `
Track: ${track.name}
Average SOG: ${track.avgSOG.toFixed(2)} kn
Maximum SOG: ${track.maxSOG.toFixed(2)} kn
Average VMG: ${track.avgVMG.toFixed(2)} kn
Maximum VMG: ${track.maxVMG.toFixed(2)} kn
Average TWA: ${track.avgTWA.toFixed(2)}°
Distance: ${track.distance.toFixed(2)} km
Time: ${track.time.toFixed(2)} hours
Average Speed: ${track.speed.toFixed(2)} km/h
------------------------------`;
    }).join('\n');
    
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'track-report.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Track Analysis</h2>
        <Button onClick={generateReport} className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Generate Report
        </Button>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableCaption>
            {startRaceIndex !== undefined && endRaceIndex !== undefined 
              ? `Selected interval analysis from point ${startRaceIndex} to ${endRaceIndex}` 
              : 'Complete track analysis'}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead onClick={() => requestSort('name')} className="cursor-pointer hover:bg-muted/50">
                <div className="flex items-center">
                  Track
                  <ArrowUpDown className="ml-1 h-3 w-3" />
                </div>
              </TableHead>
              <TableHead onClick={() => requestSort('avgSOG')} className="cursor-pointer hover:bg-muted/50">
                <div className="flex items-center">
                  Avg. SOG
                  <ArrowUpDown className="ml-1 h-3 w-3" />
                </div>
              </TableHead>
              <TableHead onClick={() => requestSort('maxSOG')} className="cursor-pointer hover:bg-muted/50">
                <div className="flex items-center">
                  Max SOG
                  <ArrowUpDown className="ml-1 h-3 w-3" />
                </div>
              </TableHead>
              <TableHead onClick={() => requestSort('avgVMG')} className="cursor-pointer hover:bg-muted/50">
                <div className="flex items-center">
                  Avg. VMG
                  <ArrowUpDown className="ml-1 h-3 w-3" />
                </div>
              </TableHead>
              <TableHead onClick={() => requestSort('distance')} className="cursor-pointer hover:bg-muted/50">
                <div className="flex items-center">
                  Distance
                  <ArrowUpDown className="ml-1 h-3 w-3" />
                </div>
              </TableHead>
              <TableHead onClick={() => requestSort('time')} className="cursor-pointer hover:bg-muted/50">
                <div className="flex items-center">
                  Time
                  <ArrowUpDown className="ml-1 h-3 w-3" />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((track) => (
              <TableRow key={track.name}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: track.color }} />
                    {track.name}
                  </div>
                </TableCell>
                <TableCell>{track.avgSOG.toFixed(1)} kn</TableCell>
                <TableCell>{track.maxSOG.toFixed(1)} kn</TableCell>
                <TableCell>{track.avgVMG.toFixed(1)} kn</TableCell>
                <TableCell>{track.distance.toFixed(2)} km</TableCell>
                <TableCell>{track.time.toFixed(2)} hrs</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ComparativeReport;

