import { useMemo } from 'react'
import { TrackData } from '@/components/GpxUploader'
import { format } from 'date-fns'

export function useChartData(
  tracks: TrackData[],
  showSOG: boolean,
  showCOG: boolean,
  showTWA: boolean,
  showVMG: boolean,
  sampleIntervalMs: number = 1000
) {
  return useMemo(() => {
    if (!tracks.length) return []
    const pts = tracks[0].points
    const data: any[] = []
    let lastT = pts[0].time.getTime()

    for (const pt of pts) {
      const t = pt.time.getTime()
      if (t - lastT >= sampleIntervalMs || t === lastT) {
        const item: any = {
          formattedTime: format(pt.time, 'HH:mm:ss')
        }
        if (showSOG) item[`sog-${tracks[0].name}`] = pt.sog
        if (showCOG) item[`cog-${tracks[0].name}`] = pt.cog
        if (showTWA) item[`twa-${tracks[0].name}`] = pt.twa
        if (showVMG) item[`vmg-${tracks[0].name}`] = pt.vmg
        data.push(item)
        lastT = t
      }
    }
    console.log('ChartData sample:', data.slice(0,5))
    return data
  }, [tracks, showSOG, showCOG, showTWA, showVMG, sampleIntervalMs])
}
