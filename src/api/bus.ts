// ============================================================
// 광주광역시 버스정보시스템 (BIS) API
// 광주든든: 광주 시내버스 5종 기능
//
// 응답 구조 (실측 기준):
// {
//   "RESPONSE": {
//     "RESULT": { "RESULT_CODE": "SUCCESS", "RESULT_MSG": "..." },
//     "XXX_LIST": { "ITEM": [...] },
//     "ROW_COUNT": N
//   }
// }
// ============================================================

const BIS_BASE = 'https://apis.data.go.kr/6290000/gj_bis'
const SERVICE_KEY = import.meta.env.VITE_DATA_GO_KR_KEY

// ── 공통 응답 헬퍼 ───────────────────────────────────────────
interface ApiResult {
  RESULT_CODE: string
  RESULT_MSG: string
}

// 응답에서 RESULT 객체 추출
function extractResult(json: any): ApiResult | null {
  return json?.RESPONSE?.RESULT || json?.RESULT || null
}

// 응답에서 ITEM 배열 추출 (LINE_LIST, BUSSTOP_LIST 등)
function extractItems(json: any, listKey: string): any[] {
  const response = json?.RESPONSE || json
  const list = response?.[listKey]

  if (!list) return []

  // ITEM이 단일 객체일 수도 있고 배열일 수도 있음
  const items = list.ITEM
  if (!items) {
    // ITEM 키 없이 list 자체가 배열일 수도 있음
    return Array.isArray(list) ? list : []
  }

  return Array.isArray(items) ? items : [items]
}

// 응답이 성공인지 확인
function isSuccess(json: any): boolean {
  const result = extractResult(json)
  return result?.RESULT_CODE === 'SUCCESS'
}

// ── 1. 정류소 정보 (전체 정류소 목록) ────────────────────────
export interface BusStop {
  stopId: number
  stopName: string
  stopNameEn: string
  lat: number          // 위도 (35.x)
  lng: number          // 경도 (126.x)
  arsId: string
  nextStop: string
}

export async function fetchAllBusStops(): Promise<BusStop[]> {
  if (!SERVICE_KEY) {
    console.warn('[BIS] VITE_DATA_GO_KR_KEY 미설정')
    return []
  }

  try {
    const url = new URL(`${BIS_BASE}/stationInfo`)
    url.searchParams.set('serviceKey', SERVICE_KEY)
    url.searchParams.set('resultType', 'json')

    const res = await fetch(url.toString())
    if (!res.ok) {
      console.warn('[BIS] stationInfo HTTP 에러:', res.status)
      return []
    }

    const json = await res.json()
    if (!isSuccess(json)) {
      console.warn('[BIS] stationInfo 실패:', extractResult(json)?.RESULT_MSG)
      return []
    }

    const items = extractItems(json, 'STATION_LIST')

    return items
      .map(function (item: any): BusStop {
        return {
          stopId: parseInt(item.BUSSTOP_ID) || 0,
          stopName: item.BUSSTOP_NAME || '',
          stopNameEn: item.NAME_E || '',
          lat: parseFloat(item.LATITUDE),
          lng: parseFloat(item.LONGITUDE),
          arsId: String(item.ARS_ID || ''),
          nextStop: item.NEXT_BUSSTOP || '',
        }
      })
      .filter(function (stop: BusStop) {
        // 광주 좌표 범위 검증 (위도 35.0~35.3, 경도 126.6~127.0)
        return (
          stop.lat >= 35.0 && stop.lat <= 35.3 &&
          stop.lng >= 126.6 && stop.lng <= 127.0
        )
      })
  } catch (err) {
    console.error('[BIS] stationInfo 조회 실패:', err)
    return []
  }
}

// ── 2. 도착 정보 (특정 정류소의 버스 도착) ⭐ 핵심 ────────────
export interface BusArrival {
  routeId: number
  routeName: string
  busId: string
  currentStopName: string
  remainMinutes: number
  remainStops: number
  dirStart: string
  dirEnd: string
  arriveFlag: number        // 0:일반, 1:곧도착
  lowBus: boolean
  routeKind: number         // 1~5
  metroFlag: number         // 0:광주, 1:나주, 2:담양, 3:장성, 4:화순
}

export async function fetchBusArrivals(stopId: number): Promise<BusArrival[]> {
  if (!SERVICE_KEY || !stopId) return []

  try {
    const url = new URL(`${BIS_BASE}/arriveInfo`)
    url.searchParams.set('serviceKey', SERVICE_KEY)
    url.searchParams.set('BUSSTOP_ID', stopId.toString())
    url.searchParams.set('resultType', 'json')

    const res = await fetch(url.toString())
    if (!res.ok) return []

    const json = await res.json()
    if (!isSuccess(json)) return []

    // 명세서: ARRIVE_LIST / 실제: BUSSTOP_LIST 둘 다 시도
    let items = extractItems(json, 'ARRIVE_LIST')
    if (items.length === 0) {
      items = extractItems(json, 'BUSSTOP_LIST')
    }

    return items.map(function (item: any): BusArrival {
      return {
        routeId: parseInt(item.LINE_ID) || 0,
        routeName: item.LINE_NAME || item.SHORT_LINE_NAME || '',
        busId: String(item.BUS_ID || ''),
        currentStopName: item.BUSSTOP_NAME || '',
        remainMinutes: parseInt(item.REMAIN_MIN) || 0,
        remainStops: parseInt(item.REMAIN_STOP) || 0,
        dirStart: item.DIR_START || '',
        dirEnd: item.DIR_END || '',
        arriveFlag: parseInt(item.ARRIVE_FLAG) || 0,
        lowBus: item.LOW_BUS === '1' || item.LOW_BUS === 1,
        routeKind: parseInt(item.LINE_KIND) || 0,
        metroFlag: parseInt(item.METRO_FLAG) || 0,
      }
    })
  } catch (err) {
    console.error('[BIS] arriveInfo 조회 실패:', err)
    return []
  }
}

// ── 3. 노선 정보 (전체 버스 노선) ────────────────────────────
export interface BusRoute {
  routeId: number
  routeName: string         // 예: "순환01A(계수초->시청->조선대)"
  dirStart: string          // 기점
  dirEnd: string            // 종점
  firstRunTime: string      // 첫차 (예: "05:30")
  lastRunTime: string       // 막차
  runInterval: number       // 배차간격 (분)
  routeKind: number         // 1:급행간선, 2:간선, 3:지선, 4:마을, 5:공항
}

export async function fetchAllRoutes(): Promise<BusRoute[]> {
  if (!SERVICE_KEY) return []

  try {
    const url = new URL(`${BIS_BASE}/lineInfo`)
    url.searchParams.set('serviceKey', SERVICE_KEY)
    url.searchParams.set('resultType', 'json')

    const res = await fetch(url.toString())
    if (!res.ok) return []

    const json = await res.json()
    if (!isSuccess(json)) return []

    const items = extractItems(json, 'LINE_LIST')

    return items.map(function (item: any): BusRoute {
      return {
        routeId: parseInt(item.LINE_ID) || 0,
        routeName: item.LINE_NAME || '',
        dirStart: item.DIR_UP_NAME || '',
        dirEnd: item.DIR_DOWN_NAME || '',
        firstRunTime: item.FIRST_RUN_TIME || '',
        lastRunTime: item.LAST_RUN_TIME || '',
        runInterval: parseInt(item.RUN_INTERVAL) || 0,
        routeKind: parseInt(item.LINE_KIND) || 0,
      }
    })
  } catch (err) {
    console.error('[BIS] lineInfo 조회 실패:', err)
    return []
  }
}

// ── 4. 노선-정류소 정보 (특정 노선이 지나는 정류소들) ──────────
export interface RouteStop {
  stopNum: number
  routeId: number
  routeName: string
  stopId: number
  stopName: string
  arsId: string
  lat: number
  lng: number
  seq: number
  returnFlag: number        // 1:운행, 2:시작기점, 3:종점, 4:종료기점
}

export async function fetchRouteStops(routeId: number): Promise<RouteStop[]> {
  if (!SERVICE_KEY || !routeId) return []

  try {
    const url = new URL(`${BIS_BASE}/lineStationInfo`)
    url.searchParams.set('serviceKey', SERVICE_KEY)
    url.searchParams.set('LINE_ID', routeId.toString())
    url.searchParams.set('resultType', 'json')

    const res = await fetch(url.toString())
    if (!res.ok) return []

    const json = await res.json()
    if (!isSuccess(json)) return []

    const items = extractItems(json, 'BUSSTOP_LIST')

    return items
      .map(function (item: any): RouteStop {
        return {
          stopNum: parseInt(item.BUSSTOP_NUM) || 0,
          routeId: parseInt(item.LINE_ID) || 0,
          routeName: item.LINE_NAME || '',
          stopId: parseInt(item.BUSSTOP_ID) || 0,
          stopName: item.BUSSTOP_NAME || '',
          arsId: String(item.ARS_ID || ''),
          lat: parseFloat(item.LATITUDE),
          lng: parseFloat(item.LONGITUDE),
          seq: parseInt(item.SEQ) || 0,
          returnFlag: parseInt(item.RETURN_FLAG) || 1,
        }
      })
      .filter(function (stop: RouteStop) {
        return (
          stop.lat >= 35.0 && stop.lat <= 35.3 &&
          stop.lng >= 126.6 && stop.lng <= 127.0
        )
      })
  } catch (err) {
    console.error('[BIS] lineStationInfo 조회 실패:', err)
    return []
  }
}

// ── 5. 노선 버스 위치 정보 (실시간 버스 위치) ─────────────────
export interface BusLocation {
  num: number
  routeId: number
  busId: string
  currentStopId: number
  carNo: string
  lowBus: boolean
  seq: number
}

export async function fetchBusLocations(routeId: number): Promise<BusLocation[]> {
  if (!SERVICE_KEY || !routeId) return []

  try {
    const url = new URL(`${BIS_BASE}/busLocationInfo`)
    url.searchParams.set('serviceKey', SERVICE_KEY)
    url.searchParams.set('LINE_ID', routeId.toString())
    url.searchParams.set('resultType', 'json')

    const res = await fetch(url.toString())
    if (!res.ok) return []

    const json = await res.json()
    if (!isSuccess(json)) return []

    const items = extractItems(json, 'BUSLOCATION_LIST')

    return items.map(function (item: any): BusLocation {
      return {
        num: parseInt(item.NUM) || 0,
        routeId: parseInt(item.LINE_ID) || 0,
        busId: String(item.BUS_ID || ''),
        currentStopId: parseInt(item.CURR_STOP_ID) || 0,
        carNo: item.CARNO || '',
        lowBus: item.LOW_BUS === '1' || item.LOW_BUS === 1,
        seq: parseInt(item.SEQ) || 0,
      }
    })
  } catch (err) {
    console.error('[BIS] busLocationInfo 조회 실패:', err)
    return []
  }
}

// ============================================================
// 광주든든 편의 함수
// ============================================================

// ── 위치 기반: 주변 정류소 + 도착정보 (캐시 1시간) ────────────
let cachedAllStops: BusStop[] | null = null
let cacheTime: number = 0
const CACHE_TTL = 60 * 60 * 1000  // 1시간

async function getCachedAllStops(): Promise<BusStop[]> {
  const now = Date.now()
  if (cachedAllStops && now - cacheTime < CACHE_TTL) {
    return cachedAllStops
  }
  cachedAllStops = await fetchAllBusStops()
  cacheTime = now
  return cachedAllStops
}

export interface NearbyStopWithArrivals {
  stop: BusStop
  distance: number          // m
  arrivals: BusArrival[]
}

export async function fetchNearbyStopsWithArrivals(
  lat: number,
  lng: number,
  radiusMeters: number = 500,
  maxStops: number = 3
): Promise<NearbyStopWithArrivals[]> {
  const allStops = await getCachedAllStops()

  const withDistance = allStops
    .map(function (stop) {
      const distance = haversineDistance(lat, lng, stop.lat, stop.lng)
      return { stop: stop, distance: distance }
    })
    .filter(function (s) { return s.distance <= radiusMeters })
    .sort(function (a, b) { return a.distance - b.distance })
    .slice(0, maxStops)

  const result = await Promise.all(
    withDistance.map(async function (item) {
      const arrivals = await fetchBusArrivals(item.stop.stopId)
      return {
        stop: item.stop,
        distance: item.distance,
        arrivals: arrivals,
      }
    })
  )

  return result
}

// ── Haversine 거리 계산 (m) ──────────────────────────────────
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// ── 노선 종류 라벨/색상 ──────────────────────────────────────
export function getRouteKindLabel(kind: number): string {
  switch (kind) {
    case 1: return '급행간선'
    case 2: return '간선'
    case 3: return '지선'
    case 4: return '마을버스'
    case 5: return '공항버스'
    default: return '일반'
  }
}

export function getRouteKindColor(kind: number): string {
  switch (kind) {
    case 1: return '#F44336'  // 급행간선 - 빨강
    case 2: return '#2196F3'  // 간선 - 파랑
    case 3: return '#4CAF50'  // 지선 - 초록
    case 4: return '#9C27B0'  // 마을버스 - 보라
    case 5: return '#FF9800'  // 공항버스 - 주황
    default: return '#607D8B'
  }
}
