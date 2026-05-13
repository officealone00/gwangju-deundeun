/**
 * 두 좌표 사이 거리 계산 (Haversine 공식, 미터 단위)
 */
export function getDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000 // 지구 반지름 (m)
  const toRad = (deg: number) => (deg * Math.PI) / 180
  
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * 거리 m → 사용자 친화적 표시 (예: "350m" 또는 "1.2km")
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`
  }
  return `${(meters / 1000).toFixed(1)}km`
}

/**
 * 도보 예상 시간 (분, 평균 시속 4km 기준)
 */
export function walkingMinutes(meters: number): number {
  const speedMpm = 4000 / 60 // m/min
  return Math.max(1, Math.round(meters / speedMpm))
}