import { useEffect, useRef, useState } from 'react'
import {
  fetchGwangjuEmergencyRooms,
  fetchGwangjuPharmacies,
  type EmergencyRoom,
  type Pharmacy,
} from '../api/publicData'
import { getDistance, formatDistance, walkingMinutes } from '../utils/geo'

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

  useEffect(() => {
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

  useEffect(() => {
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

  useEffect(() => {
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

      const content =
        '<div style="padding:12px 16px;min-width:220px;font-family:sans-serif;">' +
        '<div style="font-size:14px;font-weight:700;color:' + color + ';margin-bottom:6px;">' + emoji + ' ' + item.dutyName + '</div>' +
        '<div style="font-size:12px;color:#555;line-height:1.5;">' +
        item.dutyAddr + '<br/>' +
        '📞 <a href="tel:' + item.dutyTel1 + '" style="color:#1976d2;text-decoration:none;">' + (item.dutyTel1 || '전화번호 없음') + '</a>' +
        '</div></div>'

      const infowindow = new window.kakao.maps.InfoWindow({ content: content })

      window.kakao.maps.event.addListener(marker, 'click', function () {
        infowindow.open(map, marker)
      })
    })
  }, [activeLayer, emergencyRooms, pharmacies])

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

        if (mapRef.current) {
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

  useEffect(() => {
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

  function handleStopProp(e: React.MouseEvent) {
    e.stopPropagation()
  }

  const currentCount = activeLayer === 'emergency' ? emergencyRooms.length : pharmacies.length
  const layerLabel = activeLayer === 'emergency' ? '응급실' : '약국'

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        padding: '16px 20px 24px',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0) 100%)',
        zIndex: 10,
      }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#FF8C42' }}>광주든든</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#666' }}>
          어르신·1인가구 안심돌봄 {loading ? '· 데이터 로딩 중...' : '· ' + layerLabel + ' ' + currentCount + '곳'}
        </p>
      </div>

      <button
        onClick={findMyLocation}
        disabled={locating || loading}
        title="내 위치 찾기"
        style={{
          position: 'absolute',
          top: 100, right: 16,
          width: 56, height: 56,
          borderRadius: '50%',
          border: 'none',
          background: '#fff',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          fontSize: 24,
          cursor: locating ? 'wait' : 'pointer',
          zIndex: 10,
          opacity: loading ? 0.5 : 1,
        }}
      >
        {locating ? '⏳' : '📍'}
      </button>

      <div style={{
        position: 'absolute',
        bottom: showSheet ? 'calc(40vh + 24px)' : 24,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 8,
        padding: 6,
        background: '#fff',
        borderRadius: 999,
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        zIndex: 10,
        transition: 'bottom 0.3s',
      }}>
        <button
          onClick={function () { setActiveLayer('emergency') }}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderRadius: 999,
            background: activeLayer === 'emergency' ? '#FF8C42' : 'transparent',
            color: activeLayer === 'emergency' ? '#fff' : '#666',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >🏥 응급실</button>
        <button
          onClick={function () { setActiveLayer('pharmacy') }}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderRadius: 999,
            background: activeLayer === 'pharmacy' ? '#FF8C42' : 'transparent',
            color: activeLayer === 'pharmacy' ? '#fff' : '#666',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >💊 약국</button>
      </div>

      {showSheet && userLocation && (
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: '40vh',
          background: '#fff',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
          zIndex: 20,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{
            padding: '12px 20px 8px',
            borderBottom: '1px solid #eee',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <div style={{ width: 40, height: 4, background: '#ddd', borderRadius: 2, margin: '0 auto 8px' }} />
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#333' }}>
                가까운 {layerLabel} TOP 5
              </h2>
            </div>
            <button
              onClick={function () { setShowSheet(false) }}
              style={{ border: 'none', background: 'none', fontSize: 24, cursor: 'pointer', color: '#999' }}
            >✕</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {nearestList.map(function (place, idx) {
              return (
                <div
                  key={idx}
                  onClick={function () { focusOnPlace(place) }}
                  style={{
                    padding: '14px 20px',
                    borderBottom: '1px solid #f5f5f5',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div style={{
                    width: 32, height: 32,
                    borderRadius: '50%',
                    background: idx === 0 ? '#FF8C42' : '#f0f0f0',
                    color: idx === 0 ? '#fff' : '#666',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 14,
                    flexShrink: 0,
                  }}>{idx + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 700, color: '#333',
                      marginBottom: 4,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>{place.name}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>
                      📍 {formatDistance(place.distance)} · 도보 약 {walkingMinutes(place.distance)}분
                    </div>
                  </div>
                  <a
                    href={'tel:' + place.tel}
                    onClick={handleStopProp}
                    style={{
                      padding: '8px 12px',
                      background: '#1976d2',
                      color: '#fff',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 700,
                      textDecoration: 'none',
                      flexShrink: 0,
                    }}
                  >📞 전화</a>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
