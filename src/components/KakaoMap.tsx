import { useEffect, useRef } from 'react'

// 광주광역시 중심 좌표 (시청 기준)
const GWANGJU_CENTER = {
  lat: 35.1595454,
  lng: 126.8526012,
}

const KAKAO_MAP_KEY = import.meta.env.VITE_KAKAO_MAP_KEY

export default function KakaoMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 카카오맵 SDK 동적 로드
    const script = document.createElement('script')
    script.async = true
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_KEY}&libraries=services,clusterer&autoload=false`

    script.onload = () => {
      window.kakao.maps.load(() => {
        if (!mapContainerRef.current) return

        const options = {
          center: new window.kakao.maps.LatLng(
            GWANGJU_CENTER.lat,
            GWANGJU_CENTER.lng
          ),
          level: 7, // 줌 레벨 (낮을수록 확대)
        }

        const map = new window.kakao.maps.Map(mapContainerRef.current, options)

        // 광주 중심에 마커 표시
        const marker = new window.kakao.maps.Marker({
          position: new window.kakao.maps.LatLng(
            GWANGJU_CENTER.lat,
            GWANGJU_CENTER.lng
          ),
        })
        marker.setMap(map)

        // 인포윈도우
        const infowindow = new window.kakao.maps.InfoWindow({
          content: '<div style="padding:8px 12px;font-size:14px;font-weight:600;">광주광역시청</div>',
        })
        infowindow.open(map, marker)
      })
    }

    document.head.appendChild(script)

    return () => {
      // 컴포넌트 언마운트 시 스크립트 제거 (메모리 정리)
      const existingScript = document.querySelector(`script[src*="dapi.kakao.com"]`)
      if (existingScript) {
        existingScript.remove()
      }
    }
  }, [])

  return (
    <div
      ref={mapContainerRef}
      style={{
        width: '100%',
        height: '100vh',
      }}
    />
  )
}