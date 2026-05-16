import { useEffect, useRef, useState } from 'react'
import {
  fetchGwangjuEmergencyRooms,
  fetchGwangjuPharmacies,
  type EmergencyRoom,
  type Pharmacy,
  type AddressResult,
} from '../api/publicData'
import { getDistance, formatDistance, walkingMinutes } from '../utils/geo'
import AddressSearch from './AddressSearch'
import WeatherBadge from './WeatherBadge'

const GWANGJU_CENTER = {
  lat: 35.1595454,
  lng: 126.8526012,
}

const KAKAO_MAP_KEY = import.meta.env.VITE_KAKAO_MAP_KEY

type LayerType = 'emergency' | 'pharmacy'

interface NearestPlace {
  name: string
  addr: string
  tel: string
  lat: number
  lng: number
  distance: number
}

interface NearestItemProps {
  place: NearestPlace
  idx: number
  onItemClick: (place: NearestPlace) => void
}

function NearestItem(props: NearestItemProps) {
  const place = props.place
  const idx = props.idx

  function onClickRow() {
    props.onItemClick(place)
  }

  function onClickPhone(e: React.MouseEvent) {
    e.stopPropagation()
  }

  const telHref = 'tel:' + place.tel

  return (
    <div onClick={onClickRow} style={{ padding: '14px 20px', borderBottom: '1px solid #f5f5f5', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: idx === 0 ? '#FF8C42' : '#f0f0f0', color: idx === 0 ? '#fff' : '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{idx + 1}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place.name}</div>
        <div style={{ fontSize: 12, color: '#888' }}>📍 {formatDistance(place.distance)} · 도보 약 {walkingMinutes(place.distance)}분</div>
      </div>
      <a href={telHref} onClick={onClickPhone} style={{ padding: '8px 12px', background: '#1976d2', color: '#fff', borderRadius: 999, fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap' }}>📞 전화</a>
    </div>
  )
}

export default function KakaoMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const userMarkerRef = useRef<any>(null)

  const [emergencyRooms, setEmergencyRooms] = useState<EmergencyRoom[]>([])
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([])
  const [activeLayer, setActiveLayer] = useState<LayerType>('emergency')
  const [loading, setLoading] = useState(true)

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [nearestList, setNearestList] = useState<NearestPlace[]>([])
  const [showSheet, setShowSheet] = useState(false)
  const [showWeatherDetail, setShowWeatherDetail] = useState(false)

  // 모달 열림 = 날씨 모달만 추적 (안심점수/자치구 제거됨)
  const anyModalOpen = showWeatherDetail

  // 날씨/미세먼지: 위치 기반 (사용자 위치 우선, 없으면 광주 중심)
  const weatherLat = userLocation?.lat || GWANGJU_CENTER.lat
  const weatherLng = userLocation?.lng || GWANGJU_CENTER.lng

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
      })
    }

    document.head.appendChild(script)
  }, [])

  useEffect(function () {
    async function loadAll() {
      setLoading(true)
      const result = await Promise.all([
        fetchGwangjuEmergencyRooms(),
        fetchGwangjuPharmacies(),
      ])
      setEmergencyRooms(result[0])
      setPharmacies(result[1])
      setLoading(false)
    }
    loadAll()
  }, [])

  useEffect(function () {
    if (!mapRef.current) return

    markersRef.current.forEach(function (m) { m.setMap(null) })
    markersRef.current = []

    const map = mapRef.current
    const items = activeLayer === 'emergency' ? emergencyRooms : pharmacies
    const color = activeLayer === 'emergency' ? '#d32f2f' : '#2e7d32'
    const emoji = activeLayer === 'emergency' ? '🏥' : '💊'

    items.forEach(function (item) {
      const position = new window.kakao.maps.LatLng(item.wgs84Lat, item.wgs84Lon)
      const marker = new window.kakao.maps.Marker({ position: position, title: item.dutyName })
      marker.setMap(map)
      markersRef.current.push(marker)

      const tel = item.dutyTel1 || '전화번호 없음'
      const content =
        '<div style="padding:12px 16px;min-width:220px;font-family:sans-serif;">' +
        '<div style="font-size:14px;font-weight:700;color:' + color + ';margin-bottom:6px;">' + emoji + ' ' + item.dutyName + '</div>' +
        '<div style="font-size:12px;color:#555;line-height:1.5;">' +
        item.dutyAddr + '<br/>' +
        '📞 <a href="tel:' + item.dutyTel1 + '" style="color:#1976d2;text-decoration:none;">' + tel + '</a>' +
        '</div></div>'

      const infowindow = new window.kakao.maps.InfoWindow({ content: content })

      window.kakao.maps.event.addListener(marker, 'click', function () {
        infowindow.open(map, marker)
      })
    })
  }, [activeLayer, emergencyRooms, pharmacies])

  function calculateNearest(lat: number, lng: number) {
    const items = activeLayer === 'emergency' ? emergencyRooms : pharmacies

    const withDistance: NearestPlace[] = items.map(function (item) {
      return {
        name: item.dutyName,
        addr: item.dutyAddr,
        tel: item.dutyTel1,
        lat: item.wgs84Lat,
        lng: item.wgs84Lon,
        distance: getDistance(lat, lng, item.wgs84Lat, item.wgs84Lon),
      }
    })

    withDistance.sort(function (a, b) { return a.distance - b.distance })
    setNearestList(withDistance.slice(0, 5))
  }

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
        setShowSheet(true)
      },
      function (error) {
        console.error('위치 정보 오류:', error)
        alert('위치 정보를 가져올 수 없어요. 브라우저 권한을 확인해주세요.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  function onSelectAddress(result: AddressResult) {
    setUserLocation({ lat: result.lat, lng: result.lng })

    placeUserMarker(result.lat, result.lng)
    calculateNearest(result.lat, result.lng)
    setShowSheet(true)
  }

  useEffect(function () {
    if (userLocation) {
      calculateNearest(userLocation.lat, userLocation.lng)
    }
  }, [activeLayer, emergencyRooms, pharmacies])

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

  function setEmergencyLayer() {
    setActiveLayer('emergency')
  }

  function setPharmacyLayer() {
    setActiveLayer('pharmacy')
  }

  const currentCount = activeLayer === 'emergency' ? emergencyRooms.length : pharmacies.length
  const layerLabel = activeLayer === 'emergency' ? '응급실' : '약국'
  const bottomBarPosition = showSheet ? 'calc(40vh + 24px)' : 24
  const headerStatus = loading ? '· 로딩 중' : '· ' + layerLabel + ' ' + currentCount + '곳'
  const emergencyButtonBg = activeLayer === 'emergency' ? '#FF8C42' : 'transparent'
  const emergencyButtonColor = activeLayer === 'emergency' ? '#fff' : '#666'
  const pharmacyButtonBg = activeLayer === 'pharmacy' ? '#FF8C42' : 'transparent'
  const pharmacyButtonColor = activeLayer === 'pharmacy' ? '#fff' : '#666'
  const locatingIcon = locating ? '⏳' : '📍'
  const locatingCursor = locating ? 'wait' : 'pointer'
  const buttonOpacity = loading ? 0.5 : 1

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* 상단 헤더 - 항상 표시 (날씨 모달이 위에서 가림) */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', zIndex: anyModalOpen ? 5 : 10 }}>
        <div style={{ padding: 'max(env(safe-area-inset-top), 10px) 12px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/gwangju-deundeun/favicon.png" alt="광주든든" style={{ width: 38, height: 38, borderRadius: 9, objectFit: 'cover', flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#FF8C42', lineHeight: 1.1, letterSpacing: '-0.5px' }}>광주든든</h1>
            <p style={{ margin: '3px 0 0', fontSize: 10, color: '#666', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>어르신·1인가구 안심돌봄 {headerStatus}</p>
          </div>
          {/* 우측 날씨/미세먼지 배지 */}
          <WeatherBadge lat={weatherLat} lng={weatherLng} onModalChange={onWeatherModalChange} />
        </div>
      </div>

      {/* 검색바 - 모달 열리면 숨김 */}
      {!anyModalOpen && <AddressSearch onSelect={onSelectAddress} />}

      {/* 📍 위치 버튼 - 모달 열리면 숨김 */}
      {!anyModalOpen && (
        <button onClick={findMyLocation} disabled={locating || loading} title="내 위치 찾기" style={{ position: 'absolute', top: 'calc(max(env(safe-area-inset-top), 10px) + 140px)', right: 14, width: 50, height: 50, borderRadius: '50%', border: 'none', background: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', fontSize: 22, cursor: locatingCursor, zIndex: 10, opacity: buttonOpacity }}>{locatingIcon}</button>
      )}

      {/* 응급실/약국 토글 - 모달 열리면 숨김 */}
      {!anyModalOpen && (
        <div style={{ position: 'absolute', bottom: bottomBarPosition, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, padding: 5, background: '#fff', borderRadius: 999, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', zIndex: 10, transition: 'bottom 0.3s', whiteSpace: 'nowrap' }}>
          <button onClick={setEmergencyLayer} style={{ padding: '9px 18px', border: 'none', borderRadius: 999, background: emergencyButtonBg, color: emergencyButtonColor, fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>🏥 응급실</button>
          <button onClick={setPharmacyLayer} style={{ padding: '9px 18px', border: 'none', borderRadius: 999, background: pharmacyButtonBg, color: pharmacyButtonColor, fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>💊 약국</button>
        </div>
      )}

      {/* 가까운 TOP 5 시트 - 모달 열리면 숨김 */}
      {showSheet && userLocation && !anyModalOpen && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '40vh', background: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, boxShadow: '0 -4px 24px rgba(0,0,0,0.15)', zIndex: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 20px 8px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ width: 40, height: 4, background: '#ddd', borderRadius: 2, margin: '0 auto 8px' }} />
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#333' }}>가까운 {layerLabel} TOP 5</h2>
            </div>
            <button onClick={closeSheet} style={{ border: 'none', background: 'none', fontSize: 24, cursor: 'pointer', color: '#999' }}>✕</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {nearestList.map(function (place, idx) {
              return <NearestItem key={idx} place={place} idx={idx} onItemClick={focusOnPlace} />
            })}
          </div>
        </div>
      )}
    </div>
  )
}
