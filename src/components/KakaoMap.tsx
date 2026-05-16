import { useEffect, useRef, useState } from 'react'
import {
  fetchGwangjuEmergencyRooms,
  fetchGwangjuPharmacies,
  type EmergencyRoom,
  type Pharmacy,
  type AddressResult,
} from '../api/publicData'
import {
  fetchAllBusStops,
  fetchBusArrivals,
  getRouteKindColor,
  type BusStop,
  type BusArrival,
} from '../api/bus'
import {
  fetchGwangjuTourism,
  type TouristSpot,
} from '../api/tourism'
import {
  fetchGwangjuLandmarks,
  type Landmark,
} from '../api/landmarks'
import {
  USER_PRESETS,
  type PresetId,
  loadPresetId,
  savePresetId,
  loadCustomOrder,
  getLayerOrderForPreset,
  hasVisitedBefore,
  markVisited,
} from '../utils/userPresets'
import PresetModal from './PresetModal'
import BusRouteModal from './BusRouteModal'
import { getDistance, formatDistance, walkingMinutes } from '../utils/geo'
import AddressSearch from './AddressSearch'
import WeatherBadge from './WeatherBadge'

const GWANGJU_CENTER = {
  lat: 35.1595454,
  lng: 126.8526012,
}

const KAKAO_MAP_KEY = import.meta.env.VITE_KAKAO_MAP_KEY

// ── 레이어 정의 ───────────────────────────────────────────
interface LayerConfig {
  id: string
  emoji: string
  label: string
  color: string
  enabled: boolean
}

const LAYER_CONFIGS: LayerConfig[] = [
  { id: 'emergency', emoji: '🏥', label: '응급실',   color: '#FF3B30', enabled: true },
  { id: 'pharmacy',  emoji: '💊', label: '약국',     color: '#4CAF50', enabled: true },
  { id: 'busStop',   emoji: '🚌', label: '정류장',   color: '#1976D2', enabled: true },
  { id: 'landmark',  emoji: '🏆', label: '명소',     color: '#9C27B0', enabled: true },
  { id: 'tourism',   emoji: '🌸', label: '관광',     color: '#E91E63', enabled: true },
  { id: 'food',      emoji: '🍲', label: '음식',     color: '#FF8C42', enabled: true },
  { id: 'shopping',  emoji: '🛍️', label: '쇼핑·숙박', color: '#795548', enabled: true },
]

// 카테고리 ID → 토글 매핑 (TourAPI contentTypeId 기준)
// 12 관광지, 14 문화시설, 15 축제, 25 여행코스, 28 레포츠 → 관광
// 32 숙박, 38 쇼핑 → 쇼핑·숙박
// 39 음식점 → 음식
const TOURISM_LAYER_IDS = [12, 14, 15, 25, 28]
const FOOD_LAYER_IDS = [39]
const SHOPPING_LAYER_IDS = [32, 38]

interface LayerState {
  emergency: boolean
  pharmacy: boolean
  busStop: boolean
  landmark: boolean
  tourism: boolean
  food: boolean
  shopping: boolean
}

const INITIAL_LAYERS: LayerState = {
  emergency: false,
  pharmacy: false,
  busStop: false,
  landmark: false,
  tourism: false,
  food: false,
  shopping: false,
}

// ── NearestPlace ───────────────────────────────────────
interface NearestPlace {
  type: 'emergency' | 'pharmacy' | 'busStop' | 'tourism' | 'food' | 'shopping' | 'landmark'
  name: string
  addr: string
  tel?: string
  lat: number
  lng: number
  distance: number
  stopId?: number
  // 관광지/음식/쇼핑/명소 공통
  category?: string
  emoji?: string
  thumbnail?: string
}

interface NearestItemProps {
  place: NearestPlace
  idx: number
  onItemClick: (place: NearestPlace) => void
  activeColor: string
}

function NearestItem(props: NearestItemProps) {
  const place = props.place
  const idx = props.idx
  const [arrivals, setArrivals] = useState<BusArrival[] | null>(null)
  const [loadingArrivals, setLoadingArrivals] = useState(false)
  const [imgError, setImgError] = useState(false)

  // 정류장이면 마운트 시 도착정보 미리 로드
  useEffect(function () {
    if (place.type !== 'busStop' || !place.stopId) return

    let cancelled = false
    setLoadingArrivals(true)

    fetchBusArrivals(place.stopId).then(function (list) {
      if (cancelled) return
      const sorted = list
        .filter(function (a) { return a.remainMinutes > 0 || a.arriveFlag === 1 })
        .sort(function (a, b) {
          if (a.arriveFlag !== b.arriveFlag) return b.arriveFlag - a.arriveFlag
          return a.remainMinutes - b.remainMinutes
        })
        .slice(0, 3)
      setArrivals(sorted)
      setLoadingArrivals(false)
    })

    return function () { cancelled = true }
  }, [place.type, place.stopId])

  function onClickRow() {
    props.onItemClick(place)
  }

  function onClickPhone(e: React.MouseEvent) {
    e.stopPropagation()
  }

  function onImgError() {
    setImgError(true)
  }

  const telHref = place.tel ? 'tel:' + place.tel : '#'

  // 정류장용 도착정보 미리보기
  let arrivalText = ''
  if (place.type === 'busStop') {
    if (loadingArrivals) arrivalText = '도착정보 불러오는 중...'
    else if (arrivals === null) arrivalText = ''
    else if (arrivals.length === 0) arrivalText = '현재 도착 예정 버스 없음'
    else {
      arrivalText = arrivals.map(function (a) {
        const time = a.arriveFlag === 1 ? '곧도착' : a.remainMinutes + '분'
        const routeShort = a.routeName.split('(')[0]
        return routeShort + ' (' + time + ')'
      }).join(' · ')
    }
  }

  const isTourismLike = place.type === 'tourism' || place.type === 'food' || place.type === 'shopping' || place.type === 'landmark'
  const showThumbnail = (place.type === 'tourism' || place.type === 'food' || place.type === 'shopping') && place.thumbnail && !imgError

  // 타입별 강조색
  const categoryColor =
    place.type === 'food' ? '#FF8C42' :
    place.type === 'shopping' ? '#795548' :
    place.type === 'tourism' ? '#E91E63' :
    place.type === 'landmark' ? '#9C27B0' :
    '#1976d2'

  return (
    <div onClick={onClickRow} style={{ padding: '14px 20px', borderBottom: '1px solid #f5f5f5', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: idx === 0 ? props.activeColor : '#f0f0f0', color: idx === 0 ? '#fff' : '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{idx + 1}</div>

      {showThumbnail && (
        <img src={place.thumbnail} onError={onImgError} alt={place.name} style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {isTourismLike && place.emoji ? place.emoji + ' ' : ''}
          {place.name}
        </div>
        <div style={{ fontSize: 12, color: '#888' }}>📍 {formatDistance(place.distance)} · 도보 약 {walkingMinutes(place.distance)}분</div>
        {place.type === 'busStop' && arrivalText && (
          <div style={{ fontSize: 11, color: '#1976d2', marginTop: 4, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            🚌 {arrivalText}
          </div>
        )}
        {isTourismLike && place.category && (
          <div style={{ fontSize: 11, color: categoryColor, marginTop: 4, fontWeight: 600 }}>
            {place.category}
          </div>
        )}
      </div>

      {(place.type === 'emergency' || place.type === 'pharmacy') && place.tel && (
        <a href={telHref} onClick={onClickPhone} style={{ padding: '8px 12px', background: '#1976d2', color: '#fff', borderRadius: 999, fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap' }}>📞 전화</a>
      )}
      {isTourismLike && place.tel && (
        <a href={telHref} onClick={onClickPhone} style={{ padding: '8px 12px', background: categoryColor, color: '#fff', borderRadius: 999, fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap' }}>📞 전화</a>
      )}
    </div>
  )
}

export default function KakaoMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const busClustererRef = useRef<any>(null)
  const tourismClustererRef = useRef<any>(null)
  const foodClustererRef = useRef<any>(null)
  const shoppingClustererRef = useRef<any>(null)
  const userMarkerRef = useRef<any>(null)
  // 공용 인포윈도우 (4종 마커 공유) — 동시 표시 방지 + 메모리 절약
  const sharedInfowindowRef = useRef<any>(null)

  const [emergencyRooms, setEmergencyRooms] = useState<EmergencyRoom[]>([])
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([])
  const [busStops, setBusStops] = useState<BusStop[]>([])
  const [busStopsLoading, setBusStopsLoading] = useState(false)
  const [tourismSpots, setTourismSpots] = useState<TouristSpot[]>([])
  const [tourismLoading, setTourismLoading] = useState(false)
  const [landmarks, setLandmarks] = useState<Landmark[]>([])

  const [layers, setLayers] = useState<LayerState>(INITIAL_LAYERS)
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [nearestList, setNearestList] = useState<NearestPlace[]>([])
  const [showSheet, setShowSheet] = useState(false)
  const [showWeatherDetail, setShowWeatherDetail] = useState(false)

  // 길찾기 직선 라인
  const routeLineRef = useRef<any>(null)
  const [routeInfo, setRouteInfo] = useState<{
    fromName: string
    toName: string
    distance: number
  } | null>(null)

  // 버스 길찾기 모달
  const [busRouteTarget, setBusRouteTarget] = useState<{
    name: string
    lat: number
    lng: number
  } | null>(null)

  // 사용자 프리셋 (토글 순서 결정)
  const [presetId, setPresetId] = useState<PresetId | null>(null)
  const [customOrder, setCustomOrder] = useState<string[] | null>(null)
  const [showPresetModal, setShowPresetModal] = useState(false)
  const [isFirstVisit, setIsFirstVisit] = useState(false)

  // 첫 방문 시 자동 모달, 저장된 프리셋 불러오기
  useEffect(function () {
    const visited = hasVisitedBefore()
    const savedPreset = loadPresetId()
    const savedCustom = loadCustomOrder()

    if (savedCustom) setCustomOrder(savedCustom)
    if (savedPreset) setPresetId(savedPreset)

    if (!visited) {
      setIsFirstVisit(true)
      setShowPresetModal(true)
      markVisited()
    }
  }, [])

  const anyModalOpen = showWeatherDetail || showPresetModal || !!busRouteTarget

  const weatherLat = userLocation?.lat || GWANGJU_CENTER.lat
  const weatherLng = userLocation?.lng || GWANGJU_CENTER.lng

  // ── 카카오맵 초기화 ───────────────────────────────────────
  useEffect(function () {
    const script = document.createElement('script')
    script.async = true
    script.src = '//dapi.kakao.com/v2/maps/sdk.js?appkey=' + KAKAO_MAP_KEY + '&libraries=services,clusterer&autoload=false'

    script.onload = function () {
      window.kakao.maps.load(function () {
        if (!mapContainerRef.current) return
        const options = {
          center: new window.kakao.maps.LatLng(GWANGJU_CENTER.lat, GWANGJU_CENTER.lng),
          level: 7,
        }
        mapRef.current = new window.kakao.maps.Map(mapContainerRef.current, options)

        // 공용 인포윈도우 생성 (커스텀 X 버튼 사용하므로 removable: false)
        sharedInfowindowRef.current = new window.kakao.maps.InfoWindow({
          content: '',
          removable: false,
          zIndex: 100,
        })

        // 전역 닫기 함수 등록 (인포윈도우 HTML 안 X 버튼에서 호출)
        ;(window as any).__gwangjuDeundeunCloseInfo = function () {
          if (sharedInfowindowRef.current) {
            sharedInfowindowRef.current.close()
          }
        }

        // 지도 빈 곳 클릭 시 인포윈도우 자동 닫기
        window.kakao.maps.event.addListener(mapRef.current, 'click', function () {
          if (sharedInfowindowRef.current) {
            sharedInfowindowRef.current.close()
          }
        })
      })
    }

    document.head.appendChild(script)
  }, [])

  // ── 응급실/약국/명소 데이터 로드 (즉시) ──────────────────
  useEffect(function () {
    async function loadAll() {
      setLoading(true)
      const result = await Promise.all([
        fetchGwangjuEmergencyRooms(),
        fetchGwangjuPharmacies(),
        fetchGwangjuLandmarks(),
      ])
      setEmergencyRooms(result[0])
      setPharmacies(result[1])
      setLandmarks(result[2])
      setLoading(false)
    }
    loadAll()
  }, [])

  // ── 정류장 lazy load ─────────────────────────────────────
  async function ensureBusStopsLoaded(): Promise<void> {
    if (busStopsLoading || busStops.length > 0) return
    setBusStopsLoading(true)
    const stops = await fetchAllBusStops()
    setBusStops(stops)
    setBusStopsLoading(false)
  }

  // ── 관광 lazy load ───────────────────────────────────────
  async function ensureTourismLoaded(): Promise<void> {
    if (tourismLoading || tourismSpots.length > 0) return
    setTourismLoading(true)
    const spots = await fetchGwangjuTourism()
    setTourismSpots(spots)
    setTourismLoading(false)
  }

  // ── 마커 그리기 ─────────────────────────────────────────
  useEffect(function () {
    if (!mapRef.current) return

    // 기존 일반 마커 제거
    markersRef.current.forEach(function (m) { m.setMap(null) })
    markersRef.current = []

    // 버스 클러스터러 제거
    if (busClustererRef.current) {
      busClustererRef.current.clear()
      busClustererRef.current.setMap(null)
      busClustererRef.current = null
    }

    // 관광 클러스터러 제거
    if (tourismClustererRef.current) {
      tourismClustererRef.current.clear()
      tourismClustererRef.current.setMap(null)
      tourismClustererRef.current = null
    }

    // 음식 클러스터러 제거
    if (foodClustererRef.current) {
      foodClustererRef.current.clear()
      foodClustererRef.current.setMap(null)
      foodClustererRef.current = null
    }

    // 쇼핑·숙박 클러스터러 제거
    if (shoppingClustererRef.current) {
      shoppingClustererRef.current.clear()
      shoppingClustererRef.current.setMap(null)
      shoppingClustererRef.current = null
    }

    const map = mapRef.current

    // 응급실 마커 (빨간 방울 핀)
    if (layers.emergency) {
      const emergencyMarkerImage = createPinMarkerImage('#FF3B30')
      emergencyRooms.forEach(function (item) {
        const position = new window.kakao.maps.LatLng(item.wgs84Lat, item.wgs84Lon)
        const marker = new window.kakao.maps.Marker({
          position: position,
          image: emergencyMarkerImage,
          title: item.dutyName,
        })
        marker.setMap(map)
        markersRef.current.push(marker)

        window.kakao.maps.event.addListener(marker, 'click', function () {
          if (!sharedInfowindowRef.current) return
          sharedInfowindowRef.current.setContent(buildEmergencyContent(item))
          sharedInfowindowRef.current.open(map, marker)
        })
      })
    }

    // 약국 마커 (초록 방울 핀)
    if (layers.pharmacy) {
      const pharmacyMarkerImage = createPinMarkerImage('#4CAF50')
      pharmacies.forEach(function (item) {
        const position = new window.kakao.maps.LatLng(item.wgs84Lat, item.wgs84Lon)
        const marker = new window.kakao.maps.Marker({
          position: position,
          image: pharmacyMarkerImage,
          title: item.dutyName,
        })
        marker.setMap(map)
        markersRef.current.push(marker)

        window.kakao.maps.event.addListener(marker, 'click', function () {
          if (!sharedInfowindowRef.current) return
          sharedInfowindowRef.current.setContent(buildPharmacyContent(item))
          sharedInfowindowRef.current.open(map, marker)
        })
      })
    }

    // 🚌 정류장 마커 (클러스터러)
    if (layers.busStop && busStops.length > 0) {
      const stopMarkerImage = createPinMarkerImage('#1976D2')

      const stopMarkers = busStops.map(function (stop) {
        const position = new window.kakao.maps.LatLng(stop.lat, stop.lng)
        const marker = new window.kakao.maps.Marker({
          position: position,
          image: stopMarkerImage,
          title: stop.stopName,
        })

        window.kakao.maps.event.addListener(marker, 'click', function () {
          if (!sharedInfowindowRef.current) return
          const iw = sharedInfowindowRef.current

          // 클릭한 정류장 ID 기록 (race condition 방지)
          iw.__currentStopId = stop.stopId

          // 즉시 로딩 표시
          iw.setContent(buildBusStopLoadingContent(stop))
          iw.open(map, marker)

          // 도착정보 비동기 로드
          fetchBusArrivals(stop.stopId).then(function (arrivals) {
            // 사용자가 그 사이 다른 마커 눌렀으면 무시
            if (iw.__currentStopId !== stop.stopId) return
            iw.setContent(buildBusStopContent(stop, arrivals))
          })
        })

        return marker
      })

      const clusterer = new window.kakao.maps.MarkerClusterer({
        map: map,
        averageCenter: true,
        minLevel: 5,
        gridSize: 60,
        styles: [{
          width: '40px',
          height: '40px',
          background: 'rgba(25, 118, 210, 0.85)',
          borderRadius: '50%',
          color: '#fff',
          textAlign: 'center',
          lineHeight: '40px',
          fontSize: '13px',
          fontWeight: '700',
          border: '2px solid white',
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
        }],
      })
      clusterer.addMarkers(stopMarkers)
      busClustererRef.current = clusterer
    }

    // 🏆 명소 마커 (13곳, 클러스터링 없음 - 모두 즉시 보이게)
    if (layers.landmark && landmarks.length > 0) {
      const landmarkMarkerImage = createPinMarkerImage('#9C27B0')

      landmarks.forEach(function (item) {
        const position = new window.kakao.maps.LatLng(item.lat, item.lng)
        const marker = new window.kakao.maps.Marker({
          position: position,
          image: landmarkMarkerImage,
          title: item.name,
        })
        marker.setMap(map)
        markersRef.current.push(marker)

        window.kakao.maps.event.addListener(marker, 'click', function () {
          if (!sharedInfowindowRef.current) return
          sharedInfowindowRef.current.setContent(buildLandmarkContent(item))
          sharedInfowindowRef.current.open(map, marker)
        })
      })
    }

    // 🌸 관광 + 🍲 음식 + 🛍️ 쇼핑·숙박 마커 (3종 분리, 클러스터러)
    // 카테고리별로 필터링 후 각각 별도 클러스터러로 표시
    if ((layers.tourism || layers.food || layers.shopping) && tourismSpots.length > 0) {
      const renderCategoryLayer = function (
        catIds: number[],
        color: string,
        clustererBg: string
      ) {
        const filtered = tourismSpots.filter(function (spot) {
          return catIds.indexOf(spot.categoryId) >= 0
        })
        if (filtered.length === 0) return null

        const markerImage = createPinMarkerImage(color)

        const markers = filtered.map(function (spot) {
          const position = new window.kakao.maps.LatLng(spot.lat, spot.lng)
          const marker = new window.kakao.maps.Marker({
            position: position,
            image: markerImage,
            title: spot.title,
          })

          window.kakao.maps.event.addListener(marker, 'click', function () {
            if (!sharedInfowindowRef.current) return
            sharedInfowindowRef.current.setContent(buildTourismContent(spot, color))
            sharedInfowindowRef.current.open(map, marker)
          })

          return marker
        })

        const clusterer = new window.kakao.maps.MarkerClusterer({
          map: map,
          averageCenter: true,
          minLevel: 5,
          gridSize: 60,
          styles: [{
            width: '40px',
            height: '40px',
            background: clustererBg,
            borderRadius: '50%',
            color: '#fff',
            textAlign: 'center',
            lineHeight: '40px',
            fontSize: '13px',
            fontWeight: '700',
            border: '2px solid white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          }],
        })
        clusterer.addMarkers(markers)
        return clusterer
      }

      if (layers.tourism) {
        tourismClustererRef.current = renderCategoryLayer(
          TOURISM_LAYER_IDS,
          '#E91E63',
          'rgba(233, 30, 99, 0.85)'
        )
      }
      if (layers.food) {
        foodClustererRef.current = renderCategoryLayer(
          FOOD_LAYER_IDS,
          '#FF8C42',
          'rgba(255, 140, 66, 0.85)'
        )
      }
      if (layers.shopping) {
        shoppingClustererRef.current = renderCategoryLayer(
          SHOPPING_LAYER_IDS,
          '#795548',
          'rgba(121, 85, 72, 0.85)'
        )
      }
    }
  }, [layers.emergency, layers.pharmacy, layers.busStop, layers.landmark, layers.tourism, layers.food, layers.shopping, emergencyRooms, pharmacies, busStops, landmarks, tourismSpots])

  // ── 토글 함수 ─────────────────────────────────────────────
  function toggleLayer(layerId: string) {
    const config = LAYER_CONFIGS.find(function (c) { return c.id === layerId })
    if (!config || !config.enabled) {
      alert(config?.label + ' 기능은 곧 추가됩니다!')
      return
    }

    // 첫 토글 시 lazy load 트리거
    if (layerId === 'busStop') {
      ensureBusStopsLoaded()
    } else if (layerId === 'tourism' || layerId === 'food' || layerId === 'shopping') {
      // 3종 모두 같은 TourAPI 데이터 사용
      ensureTourismLoaded()
    }

    setLayers(function (prev) {
      const newLayers = { ...prev, [layerId]: !prev[layerId as keyof LayerState] }

      if (newLayers[layerId as keyof LayerState]) {
        setActiveLayerId(layerId)
      } else {
        const stillOn = Object.keys(newLayers).find(function (k) {
          return newLayers[k as keyof LayerState]
        })
        setActiveLayerId(stillOn || null)
      }

      return newLayers
    })
  }

  // ── 가까운 장소 계산 ─────────────────────────────────────
  function calculateNearest(lat: number, lng: number) {
    if (!activeLayerId) {
      setNearestList([])
      return
    }

    let result: NearestPlace[] = []

    if (activeLayerId === 'emergency') {
      result = emergencyRooms.map(function (item) {
        return {
          type: 'emergency' as const,
          name: item.dutyName,
          addr: item.dutyAddr,
          tel: item.dutyTel1,
          lat: item.wgs84Lat,
          lng: item.wgs84Lon,
          distance: getDistance(lat, lng, item.wgs84Lat, item.wgs84Lon),
        }
      })
    } else if (activeLayerId === 'pharmacy') {
      result = pharmacies.map(function (item) {
        return {
          type: 'pharmacy' as const,
          name: item.dutyName,
          addr: item.dutyAddr,
          tel: item.dutyTel1,
          lat: item.wgs84Lat,
          lng: item.wgs84Lon,
          distance: getDistance(lat, lng, item.wgs84Lat, item.wgs84Lon),
        }
      })
    } else if (activeLayerId === 'busStop') {
      result = busStops.map(function (stop) {
        return {
          type: 'busStop' as const,
          name: stop.stopName,
          addr: stop.arsId ? 'ARS ' + stop.arsId : '',
          lat: stop.lat,
          lng: stop.lng,
          distance: getDistance(lat, lng, stop.lat, stop.lng),
          stopId: stop.stopId,
        }
      })
    } else if (activeLayerId === 'tourism' || activeLayerId === 'food' || activeLayerId === 'shopping') {
      // 카테고리 ID로 필터링
      const filterIds =
        activeLayerId === 'food' ? FOOD_LAYER_IDS :
        activeLayerId === 'shopping' ? SHOPPING_LAYER_IDS :
        TOURISM_LAYER_IDS

      const filtered = tourismSpots.filter(function (spot) {
        return filterIds.indexOf(spot.categoryId) >= 0
      })

      const typeName = activeLayerId as 'tourism' | 'food' | 'shopping'
      result = filtered.map(function (spot) {
        return {
          type: typeName,
          name: spot.title,
          addr: spot.addr,
          tel: spot.tel,
          lat: spot.lat,
          lng: spot.lng,
          distance: getDistance(lat, lng, spot.lat, spot.lng),
          category: spot.category,
          emoji: spot.emoji,
          thumbnail: spot.thumbnail,
        }
      })
    } else if (activeLayerId === 'landmark') {
      result = landmarks.map(function (item) {
        return {
          type: 'landmark' as const,
          name: item.name,
          addr: item.address,
          tel: item.tel,
          lat: item.lat,
          lng: item.lng,
          distance: getDistance(lat, lng, item.lat, item.lng),
          category: item.categoryLabel,
          emoji: item.emoji,
        }
      })
    }

    if (result.length === 0) {
      setNearestList([])
      return
    }

    result.sort(function (a, b) { return a.distance - b.distance })
    setNearestList(result.slice(0, 5))
  }

  // ── 사용자 위치 마커 ──────────────────────────────────────
  function placeUserMarker(lat: number, lng: number) {
    if (!mapRef.current) return
    const map = mapRef.current
    const moveLatLon = new window.kakao.maps.LatLng(lat, lng)
    map.setCenter(moveLatLon)
    map.setLevel(4)

    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null)
    }

    const userMarker = new window.kakao.maps.CustomOverlay({
      position: moveLatLon,
      content: '<div style="width:20px;height:20px;background:#1976d2;border:4px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>',
      yAnchor: 0.5,
      xAnchor: 0.5,
    })
    userMarker.setMap(map)
    userMarkerRef.current = userMarker
  }

  // ── 🚖 길찾기 라인 그리기 (출발지 → 도착지) ───────────────
  function drawRouteLine(toName: string, toLat: number, toLng: number) {
    if (!mapRef.current) return
    if (!userLocation) {
      // 위치 권한 없을 때 안내
      alert('현재 위치를 먼저 찾아주세요. 📍 버튼을 눌러주세요.')
      return
    }

    const map = mapRef.current

    // 기존 라인 제거
    if (routeLineRef.current) {
      routeLineRef.current.setMap(null)
    }

    // 직선 라인 (출발지 → 도착지)
    const linePath = [
      new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng),
      new window.kakao.maps.LatLng(toLat, toLng),
    ]

    const polyline = new window.kakao.maps.Polyline({
      path: linePath,
      strokeWeight: 5,
      strokeColor: '#9C27B0',
      strokeOpacity: 0.85,
      strokeStyle: 'shortdash',
    })
    polyline.setMap(map)
    routeLineRef.current = polyline

    // 출발지+도착지 모두 보이도록 지도 범위 조정
    const bounds = new window.kakao.maps.LatLngBounds()
    bounds.extend(new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng))
    bounds.extend(new window.kakao.maps.LatLng(toLat, toLng))
    map.setBounds(bounds, 80, 80, 80, 80)

    // 거리 정보 저장 (상단 표시용)
    const distance = getDistance(userLocation.lat, userLocation.lng, toLat, toLng)
    setRouteInfo({
      fromName: '내 위치',
      toName: toName,
      distance: distance,
    })

    // 공용 인포윈도우 닫기
    if (sharedInfowindowRef.current) {
      sharedInfowindowRef.current.close()
    }
  }

  // ── 길찾기 라인 지우기 ──────────────────────────────────
  function clearRouteLine() {
    if (routeLineRef.current) {
      routeLineRef.current.setMap(null)
      routeLineRef.current = null
    }
    setRouteInfo(null)
  }

  // ── 🚌 버스 길찾기 모달 열기 (광주 BIS 활용) ───────────────
  async function openBusRoute(name: string, lat: number, lng: number) {
    if (!userLocation) {
      alert('현재 위치를 먼저 찾아주세요. 📍 버튼을 눌러주세요.')
      return
    }
    // 정류장 데이터가 아직 안 불러와졌으면 먼저 불러오기
    if (busStops.length === 0) {
      await ensureBusStopsLoaded()
    }
    setBusRouteTarget({ name: name, lat: lat, lng: lng })
  }

  // ── 정류장 클릭 시 (모달에서) 지도 이동 + 임시 강조 마커 ───
  // ⭐ 선택된 정류장만 표시 (전체 정류장 토글 ON 안 함)
  function onBusStopClick(stop: any) {
    if (!mapRef.current) return
    const map = mapRef.current
    const position = new window.kakao.maps.LatLng(stop.lat, stop.lng)

    // 1) 임시 강조 마커 (눈에 잘 띄는 크고 보라색)
    const tempPinSvg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="56" viewBox="0 0 40 56">' +
        // 그림자
        '<ellipse cx="20" cy="53" rx="8" ry="2" fill="rgba(0,0,0,0.3)"/>' +
        // 방울 본체 (큰 보라색)
        '<path d="M20 2 C9 2 2 10 2 20 C2 30 11 38 20 53 C29 38 38 30 38 20 C38 10 31 2 20 2 Z" ' +
          'fill="#9C27B0" stroke="white" stroke-width="2.5"/>' +
        // 안쪽 흰 원
        '<circle cx="20" cy="20" r="8" fill="white"/>' +
        // 가운데 점
        '<circle cx="20" cy="20" r="4" fill="#9C27B0"/>' +
      '</svg>'

    const tempMarkerImage = new window.kakao.maps.MarkerImage(
      'data:image/svg+xml;utf8,' + encodeURIComponent(tempPinSvg),
      new window.kakao.maps.Size(40, 56),
      { offset: new window.kakao.maps.Point(20, 53) }
    )

    const tempMarker = new window.kakao.maps.Marker({
      position: position,
      image: tempMarkerImage,
      zIndex: 9999,
    })
    tempMarker.setMap(map)

    // 2) 지도 이동 (마커 먼저 그린 후)
    map.setLevel(3)
    map.setCenter(position)

    // 3) 인포윈도우 즉시 표시
    if (sharedInfowindowRef.current) {
      const iw = sharedInfowindowRef.current
      iw.setContent(buildBusStopLoadingContent(stop))
      iw.open(map, tempMarker)

      // 도착정보 비동기 로드
      fetchBusArrivals(stop.stopId).then(function (arrivals) {
        iw.setContent(buildBusStopContent(stop, arrivals))
      })
    }

    // 4) 그 다음에 모달 닫기 (마커가 화면에 보장된 후)
    setTimeout(function () {
      setBusRouteTarget(null)
    }, 100)

    // 5) 인포윈도우 닫힐 때 임시 마커도 같이 제거
    //    (지도 클릭 시 인포윈도우 자동 닫힘 → 마커도 사라짐)
    const closeListener = function () {
      tempMarker.setMap(null)
      window.kakao.maps.event.removeListener(map, 'click', closeListener)
    }
    window.kakao.maps.event.addListener(map, 'click', closeListener)
  }

  // ── 전역 등록 (인포윈도우 HTML 안 버튼에서 호출) ──────────
  useEffect(function () {
    ;(window as any).__gwangjuDeundeunDrawRoute = function (name: string, lat: number, lng: number) {
      drawRouteLine(name, lat, lng)
    }
    ;(window as any).__gwangjuDeundeunOpenBusRoute = function (name: string, lat: number, lng: number) {
      openBusRoute(name, lat, lng)
    }
  }, [userLocation, busStops])


  // ── 📍 내 위치 찾기 ──────────────────────────────────────
  function findMyLocation() {
    setLocating(true)

    if (!navigator.geolocation) {
      alert('이 브라우저는 위치 정보를 지원하지 않습니다.')
      setLocating(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      function (position) {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        setUserLocation({ lat: lat, lng: lng })

        placeUserMarker(lat, lng)
        calculateNearest(lat, lng)
        setLocating(false)

        if (activeLayerId) {
          setShowSheet(true)
        }
      },
      function (error) {
        console.error('위치 정보 오류:', error)
        alert('위치 정보를 가져올 수 없어요. 브라우저 권한을 확인해주세요.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // ── 주소 검색 결과 ────────────────────────────────────────
  function onSelectAddress(result: AddressResult) {
    setUserLocation({ lat: result.lat, lng: result.lng })
    placeUserMarker(result.lat, result.lng)
    calculateNearest(result.lat, result.lng)

    if (activeLayerId) {
      setShowSheet(true)
    }
  }

  // ── 레이어 변경 시 TOP 5 재계산 ──────────────────────────
  useEffect(function () {
    if (userLocation) {
      calculateNearest(userLocation.lat, userLocation.lng)
    }
  }, [activeLayerId, emergencyRooms, pharmacies, busStops, landmarks, tourismSpots])

  function focusOnPlace(place: NearestPlace) {
    if (!mapRef.current) return
    const map = mapRef.current
    map.setCenter(new window.kakao.maps.LatLng(place.lat, place.lng))
    map.setLevel(3)
    setShowSheet(false)
  }

  function onWeatherModalChange(open: boolean) {
    setShowWeatherDetail(open)
  }

  function closeSheet() {
    setShowSheet(false)
  }

  // 활성 레이어 메타
  const activeLayer = LAYER_CONFIGS.find(function (c) { return c.id === activeLayerId })
  const activeColor = activeLayer?.color || '#FF8C42'

  // 현재 마커 수 (카테고리별 정확한 카운트)
  const tourismCount = tourismSpots.filter(function (s) { return TOURISM_LAYER_IDS.indexOf(s.categoryId) >= 0 }).length
  const foodCount = tourismSpots.filter(function (s) { return FOOD_LAYER_IDS.indexOf(s.categoryId) >= 0 }).length
  const shoppingCount = tourismSpots.filter(function (s) { return SHOPPING_LAYER_IDS.indexOf(s.categoryId) >= 0 }).length

  const totalMarkers =
    (layers.emergency ? emergencyRooms.length : 0) +
    (layers.pharmacy ? pharmacies.length : 0) +
    (layers.busStop ? busStops.length : 0) +
    (layers.landmark ? landmarks.length : 0) +
    (layers.tourism ? tourismCount : 0) +
    (layers.food ? foodCount : 0) +
    (layers.shopping ? shoppingCount : 0)

  const onLayers = LAYER_CONFIGS.filter(function (c) {
    return layers[c.id as keyof LayerState]
  })

  // 현재 사용자 프리셋에 따른 토글 순서
  const currentOrder = (function () {
    if (presetId === 'custom' && customOrder) return customOrder
    if (presetId) return getLayerOrderForPreset(presetId)
    // 기본값: 어르신 순서 (광주든든 컨셉)
    const seniorPreset = USER_PRESETS.find(function (p) { return p.id === 'senior' })
    return seniorPreset ? seniorPreset.layerOrder : USER_PRESETS[0].layerOrder
  })()

  // LAYER_CONFIGS를 currentOrder대로 재정렬
  const orderedLayerConfigs = currentOrder
    .map(function (id) { return LAYER_CONFIGS.find(function (c) { return c.id === id }) })
    .filter(function (c): c is typeof LAYER_CONFIGS[number] { return !!c })

  // 프리셋 모달 핸들러
  function onSelectPreset(id: PresetId) {
    setPresetId(id)
    savePresetId(id)
    setShowPresetModal(false)
    setIsFirstVisit(false)
  }

  function onSaveCustomOrder(order: string[]) {
    setCustomOrder(order)
    setPresetId('custom')
    savePresetId('custom')
    setShowPresetModal(false)
    setIsFirstVisit(false)
  }

  function onClosePresetModal() {
    setShowPresetModal(false)
    setIsFirstVisit(false)
    // 첫 방문에서 그냥 닫으면 senior 기본 적용 (광주든든 컨셉)
    if (!presetId) {
      setPresetId('senior')
      savePresetId('senior')
    }
  }

  function openPresetModal() {
    setShowPresetModal(true)
  }

  const anyTourismLayerOn = layers.tourism || layers.food || layers.shopping

  let headerStatus = '· 로딩 중'
  if (!loading) {
    if (onLayers.length === 0) {
      headerStatus = '· 좌측에서 보고 싶은 정보를 선택하세요'
    } else if (layers.busStop && busStopsLoading) {
      headerStatus = '· 정류장 불러오는 중...'
    } else if (anyTourismLayerOn && tourismLoading) {
      headerStatus = '· 관광 정보 불러오는 중...'
    } else {
      headerStatus = '· ' + onLayers.map(function (l) { return l.emoji + l.label }).join(' ') + ' ' + totalMarkers + '개'
    }
  }

  const locatingIcon = locating ? '⏳' : '📍'
  const locatingCursor = locating ? 'wait' : 'pointer'
  const buttonOpacity = loading ? 0.5 : 1
  const bottomSafe = showSheet ? 'calc(40vh + 24px)' : 24

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* 상단 헤더 */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', zIndex: anyModalOpen ? 5 : 10 }}>
        <div style={{ padding: 'max(env(safe-area-inset-top), 10px) 12px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/gwangju-deundeun/favicon.png?v=2" alt="광주든든" style={{ width: 38, height: 38, borderRadius: 9, objectFit: 'cover', flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#FF8C42', lineHeight: 1.1, letterSpacing: '-0.5px' }}>광주든든</h1>
            <p style={{ margin: '3px 0 0', fontSize: 10, color: '#666', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>광주의 모든 것, 한 화면에 {headerStatus}</p>
          </div>
          <button
            onClick={openPresetModal}
            title="사용자 유형 변경"
            style={{
              border: 'none',
              background: '#f5f5f5',
              width: 36,
              height: 36,
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: 18,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s',
            }}
          >
            {presetId ? (USER_PRESETS.find(function (p) { return p.id === presetId })?.emoji || '👤') : '👤'}
          </button>
          <WeatherBadge lat={weatherLat} lng={weatherLng} onModalChange={onWeatherModalChange} />
        </div>
      </div>

      {!anyModalOpen && <AddressSearch onSelect={onSelectAddress} />}

      {/* 🚖 길찾기 정보 카드 (경로 보기 클릭 시 표시) */}
      {!anyModalOpen && routeInfo && (
        <div style={{
          position: 'absolute',
          top: 'calc(max(env(safe-area-inset-top), 10px) + 130px)',
          left: 12,
          right: 12,
          zIndex: 11,
          background: '#fff',
          borderRadius: 14,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          border: '2px solid #9C27B0',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: '#9C27B0', fontWeight: 700, marginBottom: 2 }}>
              🚖 경로 안내
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              📍 내 위치 → {routeInfo.toName}
            </div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
              직선 {formatDistance(routeInfo.distance)} · 도보 약 {walkingMinutes(routeInfo.distance)}분 · 차 약 {Math.max(1, Math.round(routeInfo.distance / 500))}분
            </div>
          </div>
          <button
            onClick={clearRouteLine}
            aria-label="경로 닫기"
            style={{
              flexShrink: 0,
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: 'none',
              background: '#f0f0f0',
              color: '#999',
              fontSize: 16,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 좌측 세로 토글 */}
      {!anyModalOpen && (
        <div style={{ position: 'absolute', top: 'calc(max(env(safe-area-inset-top), 10px) + 144px)', left: 12, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 10 }}>
          {orderedLayerConfigs.map(function (config) {
            const isOn = layers[config.id as keyof LayerState]
            const isEnabled = config.enabled

            const bg = isOn ? config.color : '#fff'
            const iconColor = isOn ? '#fff' : (isEnabled ? '#333' : '#ccc')
            const opacity = isEnabled ? 1 : 0.5
            const cursor = isEnabled ? 'pointer' : 'not-allowed'

            function onClick() {
              toggleLayer(config.id)
            }

            return (
              <button
                key={config.id}
                onClick={onClick}
                title={config.label + (isEnabled ? '' : ' (곧 추가됩니다)')}
                style={{
                  width: 50,
                  height: 50,
                  border: 'none',
                  borderRadius: 14,
                  background: bg,
                  color: iconColor,
                  fontSize: 22,
                  cursor: cursor,
                  opacity: opacity,
                  boxShadow: isOn ? '0 4px 16px ' + config.color + '66' : '0 4px 12px rgba(0,0,0,0.12)',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {config.emoji}
              </button>
            )
          })}
        </div>
      )}

      {/* 📍 위치 버튼 */}
      {!anyModalOpen && (
        <button onClick={findMyLocation} disabled={locating || loading} title="내 위치 찾기" style={{ position: 'absolute', top: 'calc(max(env(safe-area-inset-top), 10px) + 144px)', right: 14, width: 50, height: 50, borderRadius: '50%', border: 'none', background: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', fontSize: 22, cursor: locatingCursor, zIndex: 10, opacity: buttonOpacity }}>
          {locatingIcon}
        </button>
      )}

      {/* 가까운 TOP 5 시트 */}
      {showSheet && userLocation && activeLayer && nearestList.length > 0 && !anyModalOpen && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '40vh', background: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, boxShadow: '0 -4px 24px rgba(0,0,0,0.15)', zIndex: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 20px 8px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ width: 40, height: 4, background: '#ddd', borderRadius: 2, margin: '0 auto 8px' }} />
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#333' }}>
                가까운 {activeLayer.emoji} {activeLayer.label} TOP 5
              </h2>
            </div>
            <button onClick={closeSheet} style={{ border: 'none', background: 'none', fontSize: 24, cursor: 'pointer', color: '#999' }}>✕</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {nearestList.map(function (place, idx) {
              return <NearestItem key={(place.stopId || place.name) + '-' + idx} place={place} idx={idx} onItemClick={focusOnPlace} activeColor={activeColor} />
            })}
          </div>
        </div>
      )}

      {/* 환영 메시지 */}
      {!loading && onLayers.length === 0 && !anyModalOpen && (
        <div style={{ position: 'absolute', bottom: bottomSafe, left: '50%', transform: 'translateX(-50%)', padding: '12px 20px', background: '#fff', borderRadius: 999, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', zIndex: 10, whiteSpace: 'nowrap', fontSize: 13, color: '#666', fontWeight: 600 }}>
          👈 좌측에서 보고 싶은 정보를 선택하세요
        </div>
      )}

      {/* 프리셋 선택 모달 */}
      <PresetModal
        isOpen={showPresetModal}
        currentPresetId={presetId}
        layerConfigs={LAYER_CONFIGS}
        currentOrder={currentOrder}
        onSelectPreset={onSelectPreset}
        onSaveCustomOrder={onSaveCustomOrder}
        onClose={onClosePresetModal}
        showCloseButton={!isFirstVisit}
      />

      {/* 🚌 버스 길찾기 모달 (광주 BIS 활용) */}
      {busRouteTarget && userLocation && (
        <BusRouteModal
          isOpen={true}
          fromLat={userLocation.lat}
          fromLng={userLocation.lng}
          toName={busRouteTarget.name}
          toLat={busRouteTarget.lat}
          toLng={busRouteTarget.lng}
          allBusStops={busStops}
          onClose={function () { setBusRouteTarget(null) }}
          onStopClick={onBusStopClick}
        />
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────
// 정류장 인포윈도우 콘텐츠 빌더
// ──────────────────────────────────────────────────────
function buildBusStopLoadingContent(stop: BusStop): string {
  const body =
    '<div style="font-size:14px;font-weight:700;color:#1976d2;margin-bottom:4px;padding-right:28px;">🚌 ' + escapeHtml(stop.stopName) + '</div>' +
    (stop.arsId ? '<div style="font-size:11px;color:#888;margin-bottom:8px;">ARS ' + escapeHtml(stop.arsId) + '</div>' : '') +
    '<div style="font-size:12px;color:#999;padding:8px 0;text-align:center;">⏳ 도착정보 불러오는 중...</div>'

  return wrapWithClose(body, { minWidth: 240, maxWidth: 300 })
}

function buildBusStopContent(stop: BusStop, arrivals: BusArrival[]): string {
  const sorted = arrivals
    .filter(function (a) { return a.remainMinutes > 0 || a.arriveFlag === 1 })
    .sort(function (a, b) {
      if (a.arriveFlag !== b.arriveFlag) return b.arriveFlag - a.arriveFlag
      return a.remainMinutes - b.remainMinutes
    })

  const header =
    '<div style="font-size:14px;font-weight:700;color:#1976d2;margin-bottom:4px;padding-right:28px;">🚌 ' + escapeHtml(stop.stopName) + '</div>' +
    (stop.arsId ? '<div style="font-size:11px;color:#888;margin-bottom:8px;">ARS ' + escapeHtml(stop.arsId) + '</div>' : '')

  if (sorted.length === 0) {
    const body = header +
      '<div style="font-size:12px;color:#999;padding:8px 0;text-align:center;">현재 도착 예정 버스가 없어요</div>'
    return wrapWithClose(body, { minWidth: 240, maxWidth: 300 })
  }

  const rows = sorted.slice(0, 8).map(function (a) {
    const color = getRouteKindColor(a.routeKind)
    const timeText = a.arriveFlag === 1
      ? '<span style="color:#d32f2f;font-weight:800;">곧도착</span>'
      : '<span style="color:#333;font-weight:700;">' + a.remainMinutes + '분</span>'
    const stopsText = a.remainStops > 0 ? '<span style="font-size:10px;color:#999;margin-left:4px;">(' + a.remainStops + '정류장)</span>' : ''
    const lowBus = a.lowBus ? '<span style="font-size:9px;color:#1976d2;background:#e3f2fd;padding:1px 4px;border-radius:3px;margin-left:4px;">저상</span>' : ''
    const routeShortName = escapeHtml(a.routeName.split('(')[0])

    return (
      '<div style="padding:7px 0;border-bottom:1px solid #f5f5f5;display:flex;align-items:center;justify-content:space-between;font-size:12px;gap:8px;">' +
        '<div style="display:flex;align-items:center;gap:6px;min-width:0;flex:1;">' +
          '<span style="display:inline-block;width:4px;height:14px;background:' + color + ';border-radius:2px;flex-shrink:0;"></span>' +
          '<span style="font-weight:700;color:#333;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + routeShortName + '</span>' +
          lowBus +
        '</div>' +
        '<div style="text-align:right;flex-shrink:0;white-space:nowrap;">' +
          timeText + stopsText +
        '</div>' +
      '</div>'
    )
  }).join('')

  const body =
    header +
    '<div style="max-height:240px;overflow-y:auto;">' + rows + '</div>' +
    '<div style="margin-top:8px;padding-top:8px;border-top:1px solid #f0f0f0;">' +
      buildRouteButton(stop.stopName, stop.lat, stop.lng, '#1976d2') +
    '</div>'
  return wrapWithClose(body, { minWidth: 260, maxWidth: 300 })
}

// ──────────────────────────────────────────────────────
// 🌸 관광지 인포윈도우 콘텐츠 빌더
// ──────────────────────────────────────────────────────
function buildTourismContent(spot: TouristSpot, accentColor?: string): string {
  const color = accentColor || '#E91E63'
  const imgUrl = spot.imageUrl || spot.thumbnail
  const imgSection = imgUrl
    ? '<img src="' + escapeHtml(imgUrl) + '" alt="' + escapeHtml(spot.title) + '" ' +
      'style="width:100%;height:140px;object-fit:cover;border-radius:6px;margin-bottom:8px;display:block;" ' +
      'onerror="this.style.display=\'none\'"/>'
    : ''

  const telSection = spot.tel
    ? '<div style="font-size:12px;color:#555;margin-top:6px;">📞 <a href="tel:' + escapeHtml(spot.tel) + '" style="color:' + color + ';text-decoration:none;font-weight:600;">' + escapeHtml(spot.tel) + '</a></div>'
    : ''

  const addrSection = spot.addr
    ? '<div style="font-size:12px;color:#666;line-height:1.5;">' + escapeHtml(spot.addr) + '</div>'
    : ''

  const body =
    imgSection +
    '<div style="display:inline-block;font-size:11px;color:#fff;background:' + color + ';padding:2px 8px;border-radius:999px;font-weight:700;margin-bottom:6px;">' + spot.emoji + ' ' + escapeHtml(spot.category) + '</div>' +
    '<div style="font-size:14px;font-weight:700;color:#333;margin-bottom:6px;line-height:1.3;padding-right:28px;">' + escapeHtml(spot.title) + '</div>' +
    addrSection +
    telSection +
    '<div style="margin-top:10px;">' +
      buildRouteButton(spot.title, spot.lat, spot.lng, color) +
    '</div>'

  return wrapWithClose(body, { minWidth: 240, maxWidth: 300 })
}

// ──────────────────────────────────────────────────────
// 🏥 응급실 인포윈도우 콘텐츠 빌더
// ──────────────────────────────────────────────────────
function buildEmergencyContent(item: any): string {
  const tel = item.dutyTel1 || '전화번호 없음'
  const telHref = item.dutyTel1 ? '<a href="tel:' + escapeHtml(item.dutyTel1) + '" style="color:#1976d2;text-decoration:none;">' + escapeHtml(tel) + '</a>' : escapeHtml(tel)

  const body =
    '<div style="font-size:14px;font-weight:700;color:#d32f2f;margin-bottom:6px;padding-right:28px;">🏥 ' + escapeHtml(item.dutyName) + '</div>' +
    '<div style="font-size:12px;color:#555;line-height:1.5;margin-bottom:8px;">' +
      escapeHtml(item.dutyAddr || '') + '<br/>' +
      '📞 ' + telHref +
    '</div>' +
    buildRouteButton(item.dutyName, item.wgs84Lat, item.wgs84Lon, '#d32f2f')

  return wrapWithClose(body, { minWidth: 240, maxWidth: 300 })
}

// ──────────────────────────────────────────────────────
// 💊 약국 인포윈도우 콘텐츠 빌더
// ──────────────────────────────────────────────────────
function buildPharmacyContent(item: any): string {
  const tel = item.dutyTel1 || '전화번호 없음'
  const telHref = item.dutyTel1 ? '<a href="tel:' + escapeHtml(item.dutyTel1) + '" style="color:#1976d2;text-decoration:none;">' + escapeHtml(tel) + '</a>' : escapeHtml(tel)

  const body =
    '<div style="font-size:14px;font-weight:700;color:#2e7d32;margin-bottom:6px;padding-right:28px;">💊 ' + escapeHtml(item.dutyName) + '</div>' +
    '<div style="font-size:12px;color:#555;line-height:1.5;margin-bottom:8px;">' +
      escapeHtml(item.dutyAddr || '') + '<br/>' +
      '📞 ' + telHref +
    '</div>' +
    buildRouteButton(item.dutyName, item.wgs84Lat, item.wgs84Lon, '#2e7d32')

  return wrapWithClose(body, { minWidth: 240, maxWidth: 300 })
}

// ──────────────────────────────────────────────────────
// 🏆 명소 인포윈도우 콘텐츠 빌더
// ──────────────────────────────────────────────────────
function buildLandmarkContent(item: Landmark): string {
  const color = '#9C27B0'

  const telSection = item.tel
    ? '<div style="font-size:12px;color:#555;margin-top:4px;">📞 <a href="tel:' + escapeHtml(item.tel) + '" style="color:' + color + ';text-decoration:none;font-weight:600;">' + escapeHtml(item.tel) + '</a></div>'
    : ''

  const descSection = item.description
    ? '<div style="font-size:11px;color:#888;margin-top:4px;font-style:italic;">' + escapeHtml(item.description) + '</div>'
    : ''

  const body =
    '<div style="display:inline-block;font-size:11px;color:#fff;background:' + color + ';padding:2px 8px;border-radius:999px;font-weight:700;margin-bottom:6px;">' + item.emoji + ' ' + escapeHtml(item.categoryLabel) + '</div>' +
    '<div style="font-size:14px;font-weight:700;color:#333;margin-bottom:4px;line-height:1.3;padding-right:28px;">' + escapeHtml(item.name) + '</div>' +
    '<div style="font-size:12px;color:#666;line-height:1.5;">' + escapeHtml(item.address) + '</div>' +
    descSection +
    telSection +
    '<div style="margin-top:10px;">' +
      buildRouteButton(item.name, item.lat, item.lng, color) +
    '</div>'

  return wrapWithClose(body, { minWidth: 240, maxWidth: 300 })
}

// ──────────────────────────────────────────────────────
// 🚖 길찾기 버튼 (사이트 안 직선 라인 + 광주 BIS 버스 길찾기)
// 1) 지도에 직선 경로 보기 (위치 인식만, 사이트 안)
// 2) 🚌 버스로 가는 길 (광주 BIS 정류장 + 실시간 도착정보)
// ──────────────────────────────────────────────────────
function buildRouteButton(name: string, lat: number, lng: number, _color: string): string {
  const safeName = escapeHtml(name).replace(/'/g, '&#39;')

  return (
    '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
      // 1) 사이트 안 직선 경로 보기 (보라색)
      '<button onclick="window.__gwangjuDeundeunDrawRoute&&window.__gwangjuDeundeunDrawRoute(\'' + safeName + '\',' + lat + ',' + lng + ')" ' +
        'style="display:inline-flex;align-items:center;justify-content:center;gap:4px;padding:8px 12px;background:#9C27B0;color:#fff;border:none;border-radius:999px;font-size:12px;font-weight:700;cursor:pointer;">' +
        '📍 거리 보기' +
      '</button>' +
      // 2) 광주 BIS 버스 길찾기 (광주든든의 차별점!)
      '<button onclick="window.__gwangjuDeundeunOpenBusRoute&&window.__gwangjuDeundeunOpenBusRoute(\'' + safeName + '\',' + lat + ',' + lng + ')" ' +
        'style="display:inline-flex;align-items:center;justify-content:center;gap:4px;padding:8px 12px;background:#1976D2;color:#fff;border:none;border-radius:999px;font-size:12px;font-weight:700;cursor:pointer;">' +
        '🚌 버스로 가기' +
      '</button>' +
    '</div>'
  )
}

// ──────────────────────────────────────────────────────
// 공용 래퍼 - 큰 X 버튼 (44x44 모바일 터치 최적화) + 통일된 박스
// ──────────────────────────────────────────────────────
function wrapWithClose(innerHtml: string, opts: { minWidth: number; maxWidth: number }): string {
  return (
    '<div style="position:relative;padding:14px 14px 12px;min-width:' + opts.minWidth + 'px;max-width:' + opts.maxWidth + 'px;font-family:sans-serif;">' +
      // 큰 X 버튼 (44x44 영역, 모바일 손가락 친화)
      '<button onclick="window.__gwangjuDeundeunCloseInfo&&window.__gwangjuDeundeunCloseInfo()" ' +
        'aria-label="닫기" ' +
        'style="position:absolute;top:0;right:0;width:44px;height:44px;border:none;background:transparent;cursor:pointer;font-size:20px;color:#999;line-height:1;padding:0;display:flex;align-items:center;justify-content:center;">' +
        '<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:#f0f0f0;font-weight:700;">✕</span>' +
      '</button>' +
      innerHtml +
    '</div>'
  )
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ──────────────────────────────────────────────────────
// 방울 핀 모양 마커 이미지 생성 (카카오 기본 마커와 비슷한 모양, 색상 커스텀)
// 24×34 픽셀, 뾰족한 끝이 좌표 위치를 가리킴
// ──────────────────────────────────────────────────────
function createPinMarkerImage(color: string): any {
  // 방울 모양 SVG: 위는 원형, 아래는 뾰족한 핀 + 작은 흰 원 안에 점
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="34" viewBox="0 0 24 34">' +
      // 그림자
      '<ellipse cx="12" cy="32" rx="5" ry="1.5" fill="rgba(0,0,0,0.25)"/>' +
      // 방울 본체 (path로 핀 모양 그리기)
      '<path d="M12 1 C5.4 1 1 6 1 11.5 C1 17 6 22 12 31 C18 22 23 17 23 11.5 C23 6 18.6 1 12 1 Z" ' +
        'fill="' + color + '" stroke="white" stroke-width="1.5"/>' +
      // 안쪽 흰 원
      '<circle cx="12" cy="11" r="4" fill="white"/>' +
    '</svg>'

  const src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
  return new (window as any).kakao.maps.MarkerImage(
    src,
    new (window as any).kakao.maps.Size(24, 34),
    {
      // 뾰족한 끝(아래 중앙)이 좌표 지점 (offset = (가로/2, 세로))
      offset: new (window as any).kakao.maps.Point(12, 32),
    }
  )
}
