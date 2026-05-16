import { useEffect, useState } from 'react'
import { fetchBusArrivals, type BusStop, type BusArrival } from '../api/bus'
import { getDistance, formatDistance, walkingMinutes } from '../utils/geo'

interface BusRouteModalProps {
  isOpen: boolean
  fromLat: number             // 출발지 좌표 (내 위치)
  fromLng: number
  toName: string              // 도착지 이름
  toLat: number               // 도착지 좌표
  toLng: number
  allBusStops: BusStop[]      // 광주 전체 정류장 (이미 로드됨)
  onClose: () => void
  onStopClick: (stop: BusStop) => void   // 정류장 클릭 시 지도 이동
}

interface StopWithDistance {
  stop: BusStop
  distance: number
  arrivals?: BusArrival[]
  loading: boolean
}

export default function BusRouteModal(props: BusRouteModalProps) {
  const [fromStops, setFromStops] = useState<StopWithDistance[]>([])
  const [toStops, setToStops] = useState<StopWithDistance[]>([])

  // ── 출발지/도착지 정류장 찾기 (1km / 500m 내) ─────────────
  useEffect(function () {
    if (!props.isOpen || props.allBusStops.length === 0) return

    // 출발지에서 1km 내 정류장 (TOP 5)
    const nearFrom: StopWithDistance[] = props.allBusStops
      .map(function (stop) {
        return {
          stop: stop,
          distance: getDistance(props.fromLat, props.fromLng, stop.lat, stop.lng),
          loading: true,
        }
      })
      .filter(function (s) { return s.distance <= 1000 })
      .sort(function (a, b) { return a.distance - b.distance })
      .slice(0, 5)

    // 도착지에서 500m 내 정류장 (TOP 3)
    const nearTo: StopWithDistance[] = props.allBusStops
      .map(function (stop) {
        return {
          stop: stop,
          distance: getDistance(props.toLat, props.toLng, stop.lat, stop.lng),
          loading: true,
        }
      })
      .filter(function (s) { return s.distance <= 500 })
      .sort(function (a, b) { return a.distance - b.distance })
      .slice(0, 3)

    setFromStops(nearFrom)
    setToStops(nearTo)

    // 각 정류장의 실시간 도착정보 로드
    nearFrom.forEach(function (item, idx) {
      fetchBusArrivals(item.stop.stopId).then(function (arrivals) {
        setFromStops(function (prev) {
          const next = prev.slice()
          if (next[idx]) {
            next[idx] = { ...next[idx], arrivals: arrivals, loading: false }
          }
          return next
        })
      })
    })

    nearTo.forEach(function (item, idx) {
      fetchBusArrivals(item.stop.stopId).then(function (arrivals) {
        setToStops(function (prev) {
          const next = prev.slice()
          if (next[idx]) {
            next[idx] = { ...next[idx], arrivals: arrivals, loading: false }
          }
          return next
        })
      })
    })
  }, [props.isOpen, props.fromLat, props.fromLng, props.toLat, props.toLng, props.allBusStops])

  if (!props.isOpen) return null

  // ── 정류장 카드 렌더 ──────────────────────────────────────
  function renderStopCard(item: StopWithDistance, idx: number, isFrom: boolean) {
    function onClickCard() {
      props.onStopClick(item.stop)
    }
    const topColor = isFrom ? '#FF8C42' : '#9C27B0'

    return (
      <div
        key={item.stop.stopId + '-' + idx}
        onClick={onClickCard}
        style={{
          padding: '12px 14px',
          marginBottom: 8,
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #eee',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: topColor,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 700,
            flexShrink: 0,
          }}>
            {idx + 1}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.stop.stopName}
            </div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>
              도보 {walkingMinutes(item.distance)}분 · {formatDistance(item.distance)}
              {item.stop.arsId ? ' · ARS ' + item.stop.arsId : ''}
            </div>
          </div>
        </div>

        {/* 실시간 도착정보 */}
        {item.loading && (
          <div style={{ fontSize: 11, color: '#999', padding: '4px 0' }}>
            ⏳ 도착정보 불러오는 중...
          </div>
        )}
        {!item.loading && (!item.arrivals || item.arrivals.length === 0) && (
          <div style={{ fontSize: 11, color: '#999', padding: '4px 0' }}>
            현재 도착 예정 버스 없음
          </div>
        )}
        {!item.loading && item.arrivals && item.arrivals.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {item.arrivals.slice(0, 4).map(function (arr, i) {
              const isImmediate = arr.arriveFlag === 1
              const bg = isImmediate ? '#FFEBEE' : '#F3F4F6'
              const color = isImmediate ? '#D32F2F' : '#555'
              const timeText = isImmediate ? '곧 도착' : (arr.remainMinutes + '분')
              return (
                <span
                  key={arr.routeName + '-' + i}
                  style={{
                    fontSize: 10,
                    padding: '3px 8px',
                    borderRadius: 999,
                    background: bg,
                    color: color,
                    fontWeight: 700,
                  }}
                >
                  {arr.routeName} · {timeText}
                </span>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      onClick={props.onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={function (e) { e.stopPropagation() }}
        style={{
          background: '#f5f5f5',
          width: '100%',
          maxWidth: 480,
          maxHeight: '85vh',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          overflowY: 'auto',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* 헤더 */}
        <div style={{
          padding: '16px 20px 12px',
          background: '#fff',
          position: 'sticky',
          top: 0,
          zIndex: 1,
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#333' }}>
              🚌 버스로 가는 길
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#666' }}>
              📍 내 위치 → {props.toName}
            </p>
          </div>
          <button
            onClick={props.onClose}
            aria-label="닫기"
            style={{
              border: 'none',
              background: '#f0f0f0',
              width: 36,
              height: 36,
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: 18,
              color: '#999',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* 출발 정류장 */}
        <div style={{ padding: '16px 16px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 16 }}>🚏</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#FF8C42' }}>
              여기서 타세요 (1km 이내)
            </span>
          </div>
          {fromStops.length === 0 && (
            <div style={{ padding: '16px', background: '#fff', borderRadius: 12, textAlign: 'center', fontSize: 13, color: '#888' }}>
              1km 이내 정류장이 없어요
            </div>
          )}
          {fromStops.map(function (item, idx) { return renderStopCard(item, idx, true) })}
        </div>

        {/* 화살표 */}
        <div style={{ textAlign: 'center', padding: '4px 0', fontSize: 20, color: '#bbb' }}>
          ↓
        </div>

        {/* 도착 정류장 */}
        <div style={{ padding: '8px 16px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 16 }}>🚏</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#9C27B0' }}>
              여기서 내리세요 (목적지 500m 이내)
            </span>
          </div>
          {toStops.length === 0 && (
            <div style={{ padding: '16px', background: '#fff', borderRadius: 12, textAlign: 'center', fontSize: 13, color: '#888' }}>
              500m 이내 정류장이 없어요
            </div>
          )}
          {toStops.map(function (item, idx) { return renderStopCard(item, idx, false) })}
        </div>

        {/* 안내 메시지 */}
        <div style={{
          margin: '0 16px 16px',
          padding: '10px 14px',
          background: '#FFF5EE',
          borderRadius: 10,
          fontSize: 11,
          color: '#7a4e1f',
          lineHeight: 1.5,
        }}>
          💡 같은 노선이 양쪽 정류장 모두 보이면 환승 없이 갈 수 있어요. 정류장을 누르면 지도에서 위치를 확인할 수 있습니다.
        </div>
      </div>
    </div>
  )
}
