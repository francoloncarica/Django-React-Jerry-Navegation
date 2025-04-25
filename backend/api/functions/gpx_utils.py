# functions/gpx_utils.py

import xml.etree.ElementTree as ET
from datetime import datetime
from typing import List, Dict, Optional
import math
import logging

logger = logging.getLogger(__name__)

def haversine_nm(lat1, lon1, lat2, lon2):
    # devuelve distancia en millas náuticas
    R_km = 6371.0
    R_nm = R_km / 1.852
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R_nm * c

def parse_gpx(gpx_string: str, interpolation_interval_ms: Optional[int] = None) -> List[Dict]:
    root = ET.fromstring(gpx_string)
    trkpts = root.findall('.//{*}trkpt')
    points: List[Dict] = []

    for trkpt in trkpts:
        lat = float(trkpt.get('lat', '0'))
        lon = float(trkpt.get('lon', '0'))

        time_elem = trkpt.find('{*}time')
        if time_elem is not None and time_elem.text:
            timestr = time_elem.text.strip().replace('Z', '+00:00')
            try:
                time = datetime.fromisoformat(timestr)
            except ValueError:
                time = datetime.utcnow()
        else:
            time = datetime.utcnow()

        # Intentar leer SOG/COG de extensiones
        sog = None
        cog = None
        ext = trkpt.find('{*}extensions')
        if ext is not None:
            se = ext.find('.//{*}speed')
            ce = ext.find('.//{*}course')
            if se is not None and se.text:
                try:
                    sog = float(se.text) * 1.94384
                except ValueError:
                    sog = None
            if ce is not None and ce.text:
                try:
                    cog = float(ce.text)
                except ValueError:
                    cog = None

        points.append({
            'lat': lat,
            'lon': lon,
            'time': time,
            'sog': sog,
            'cog': cog
        })

    logger.debug(f"Parsed {len(points)} GPX points. Sample: {points[:3]}")

    # Calcular SOG/COG donde falten
    for i in range(len(points) - 1):
        if points[i]['sog'] is None or points[i]['cog'] is None:
            cur = points[i]
            nxt = points[i + 1]
            dt_h = (nxt['time'] - cur['time']).total_seconds() / 3600.0
            if dt_h > 0:
                # distancia en nm
                dist_nm = haversine_nm(cur['lat'], cur['lon'], nxt['lat'], nxt['lon'])
                calc_sog = dist_nm / dt_h
                # bearing
                y = math.sin(math.radians(nxt['lon'] - cur['lon'])) * math.cos(math.radians(nxt['lat']))
                x = (math.cos(math.radians(cur['lat'])) * math.sin(math.radians(nxt['lat'])) -
                     math.sin(math.radians(cur['lat'])) * math.cos(math.radians(nxt['lat'])) *
                     math.cos(math.radians(nxt['lon'] - cur['lon'])))
                calc_cog = (math.degrees(math.atan2(y, x)) + 360) % 360

                points[i]['sog'] = calc_sog
                points[i]['cog'] = calc_cog

    logger.debug(f"After SOG/COG fill, sample: {points[:3]}")
    return points
