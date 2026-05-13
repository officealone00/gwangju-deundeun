import { useEffect, useRef, useState } from 'react'
import {
  fetchGwangjuEmergencyRooms,
  fetchGwangjuPharmacies,
  type EmergencyRoom,
  type Pharmacy,
} from '../api/publicData'

const GWANGJU_CENTER = {
  lat: 35.1595454,
  lng: 126.8526012,
}

const KAKAO_MAP_KEY = import.meta.env.VITE_KAKAO_MAP_KEY

type LayerType = 'emergency' | 'pharmacy'

export default function KakaoMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  
  const [emergencyRooms, setEmergencyRooms] = useState<EmergencyRoom[]>([])
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([])
  const [activeLayer, setActiveLayer] = useState<LayerType>('emergency')
  const [loading, setLoading] = useState(true)

  // 1. 카카오맵 로드
  useEffect(() => {
    const script = document.createElement('script')
    script.async = true
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_KEY}&libraries=services,clusterer&autoload=false`

    script.onload = () => {
      window.kakao.maps.load(() => {
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

  // 2. 데이터 로드 (응급실 + 약국 둘 다 미리 받아두기)
  useEffect(() => {
    async function loadAll() {
      setLoading(true)
      const [rooms, pharms] = await Promise.all([
        fetchGwangjuEmergencyRooms(),
        fetchGwangjuPharmacies(),
      ])
      setEmergencyRooms(rooms)
      setPharmacies(pharms)
      setLoading(false)
    }
    loadAll()
  }, [])

  // 3. 마커 표시 (레이어 전환 시 자동 갱신)
  useEffect(() => {
    if (!mapRef.current) return

    // 기존 마커 제거
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []

    const map = mapRef.current
    const items = activeLayer === 'emergency' ? emergencyRooms : pharmacies
    const color = activeLayer === 'emergency' ? '#d32f2f' : '#2e7d32'
    const emoji = activeLayer === 'emergency' ? '🏥' : '💊'

    items.forEach((item) => {
      const position = new window.kakao.maps.LatLng(item.wgs84Lat, item.wgs84Lon)

      const marker = new window.kakao.maps.Marker({
        position,
        title: item.dutyName,
      })
      marker.setMap(map)
      markersRef.current.push(marker)

      const content = `
        <div style="padding:12px 16px;min-width:220px;font-family:sans-serif;">
          <div style="font-size:14px;font-weight:700;color:${color};margin-bottom:6px;">${emoji} ${item.dutyName}</div>
          <div style="font-size:12px;color:#555;line-height:1.5;">
            ${item.dutyAddr}<br/>
            📞 <a href="tel:${item.dutyTel1}" style="color:#1976d2;text-decoration:none;">${item.dutyTel1 || '전화번호 없음'}</a>
          </div>
        </div>
      `
      const infowindow = new window.kakao.maps.InfoWindow({ content })

      window.kakao.maps.event.addListener(marker, 'click', () => {
        infowindow.open(map, marker)
      })
    })
  }, [activeLayer, emergencyRooms, pharmacies])

  const currentCount = activeLayer === 'emergency' ? emergencyRooms.length : pharmacies.length

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* 상단 헤더 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: '16px 20px 24px',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0) 100%)',
        zIndex: 10,
      }}>
        <h1 style={{
          margin: 0,
          fontSize: 22,
          fontWeight: 800,
          color: '#FF8C42',
        }}>
          광주든든
        </h1>
        <p style={{
          margin: '4px 0 0',
          fontSize: 13,
          color: '#666',
        }}>
          어르신·1인가구 안심돌봄 {loading ? '· 데이터 로딩 중...' : `· ${activeLayer === 'emergency' ? '응급실' : '약국'} ${currentCount}곳`}
        </p>
      </div>

      {/* 하단 필터 버튼 */}
      <div style={{
        position: 'absolute',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 8,
        padding: 6,
        background: '#fff',
        borderRadius: 999,
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        zIndex: 10,
      }}>
        <button
          onClick={() => setActiveLayer('emergency')}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderRadius: 999,
            background: activeLayer === 'emergency' ? '#FF8C42' : 'transparent',
            color: activeLayer === 'emergency' ? '#fff' : '#666',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          🏥 응급실
        </button>
        <button
          onClick={() => setActiveLayer('pharmacy')}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderRadius: 999,
            background: activeLayer === 'pharmacy' ? '#FF8C42' : 'transparent',
            color: activeLayer === 'pharmacy' ? '#fff' : '#666',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          💊 약국
        </button>
      </div>
    </div>
  )
}