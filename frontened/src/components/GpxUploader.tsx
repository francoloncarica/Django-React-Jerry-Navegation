import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Upload } from 'lucide-react';
import { toast } from "@/components/ui/use-toast";
import BoatSelectionDialog from './BoatSelectionDialog';

interface GpxUploaderProps {
  onGpxLoaded: (trackData: TrackData, fileName: string) => void;
}

export interface TrackPoint {
  lat: number;
  lon: number;
  time: Date;
  sog: number;
  cog: number;
  twa: number;
  vmg: number;
}

export interface TrackData {
  points: TrackPoint[];
  name: string;
  color: string;
  boatType?: string;
}

// URL completa al endpoint Django
const GPX_API_URL = 'http://127.0.0.1:8000/api/gpx-process/';

// Genera un color aleatorio para la pista
const getRandomColor = (): string => {
  const colors = [
    '#FF5733', '#33FF57', '#3357FF', '#F033FF', '#FF33F0',
    '#33FFF0', '#F0FF33', '#FF8C33', '#8C33FF', '#33FF8C'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

const GpxUploader: React.FC<GpxUploaderProps> = ({ onGpxLoaded }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [parsedPoints, setParsedPoints] = useState<TrackPoint[]>([]);
  const [isBoatDialogOpen, setIsBoatDialogOpen] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const baseName = file.name.replace('.gpx', '');
    setFileName(baseName);

    try {
      const form = new FormData();
      form.append('file', file);

      // Fetch al backend Django
      const res = await fetch(GPX_API_URL, {
        method: 'POST',
        body: form,
      });
      if (res.status === 404) {
        throw new Error(`Endpoint no encontrado (404). Verifica la ruta: ${GPX_API_URL}`);
      }
      if (!res.ok) {
        throw new Error(`Error del servidor: ${res.status}`);
      }

      // Parse una única vez
      const json = await res.json();
      // tras recibir `json = await res.json()`
      const { raw_points, geojson, original_count, simplified_count } = json;

      // 1) Guarda geojson en el mapa (no cambia nunca)
      //    >> mapInstance.addSource('route', { type:'geojson', data: geojson })

      // 2) Mapea `raw_points` a tu tipo TrackPoint
      const points: TrackPoint[] = raw_points.map((rp: any) => ({
        lat: rp.lat,
        lon: rp.lon,
        time: new Date(rp.time),
        sog: rp.sog  ?? 0,
        cog: rp.cog  ?? 0,
        twa: rp.twa  ?? 0,
        vmg: rp.vmg  ?? 0,
      }));

      console.log('RAW sample:', raw_points.slice(0,5));
      console.log('TRACK sample:', points.slice(0,5));

      setParsedPoints(points);
      setIsBoatDialogOpen(true);

      toast({
        title: 'Track loaded',
        description: `De ${original_count} → ${simplified_count} puntos.`,
      });
    } catch (err: any) {
      console.error('Error en handleFileChange:', err);
      toast({
        title: 'Error al procesar GPX',
        description: err.message,
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  const handleBoatConfirmed = (name: string, boatType: string) => {
    if (!parsedPoints.length) return;

    const trackData: TrackData = {
      points: parsedPoints,
      name: name || fileName,
      color: getRandomColor(),
      boatType,
    };

    console.log('Enviando TrackData al padre:', trackData);
    onGpxLoaded(trackData, name || fileName);

    toast({
      title: 'Pista cargada',
      description: `Cargados ${parsedPoints.length} puntos desde ${name || fileName}`,
    });

    setIsLoading(false);
    setParsedPoints([]);
    setFileName('');
    setIsBoatDialogOpen(false);
  };

  return (
    <div className="flex items-center space-x-2">
      <input
        type="file"
        id="gpx-upload"
        accept=".gpx"
        className="hidden"
        onChange={handleFileChange}
      />
      <label htmlFor="gpx-upload">
        <Button
          variant="outline"
          disabled={isLoading}
          className="cursor-pointer"
          asChild
        >
          <span>
            <Upload className="mr-2 h-4 w-4" />
            Upload GPX
          </span>
        </Button>
      </label>
      <BoatSelectionDialog
        open={isBoatDialogOpen}
        onOpenChange={setIsBoatDialogOpen}
        onConfirm={handleBoatConfirmed}
        defaultName={fileName}
      />
    </div>
  );
};

export default GpxUploader;
