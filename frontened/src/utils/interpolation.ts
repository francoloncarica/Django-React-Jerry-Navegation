import { TrackPoint } from '@/components/GpxUploader'

export function getInterpolatedPoint(
  points: TrackPoint[],
  targetTimeMs: number
): TrackPoint {
  const n = points.length
  if (n === 0) throw Error('No hay puntos')
  if (targetTimeMs <= points[0].time.getTime()) return points[0]
  if (targetTimeMs >= points[n-1].time.getTime()) return points[n-1]

  let lo = 0, hi = n - 2
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (points[mid].time.getTime() <= targetTimeMs) lo = mid + 1
    else hi = mid
  }
  const i = lo - 1
  const p0 = points[i], p1 = points[i+1]
  const t0 = p0.time.getTime(), t1 = p1.time.getTime()
  const frac = (targetTimeMs - t0) / (t1 - t0)

  const L = (a: number, b: number) => a + (b - a) * frac

  return {
    lat: L(p0.lat,  p1.lat),
    lon: L(p0.lon,  p1.lon),
    time: new Date(targetTimeMs),
    sog: L(p0.sog,  p1.sog),
    cog: L(p0.cog,  p1.cog),
    twa: L(p0.twa,  p1.twa),
    vmg: L(p0.vmg,  p1.vmg),
  }
}
