import { useEffect, useState } from 'react'
import { getCurrentWeather, getWeatherEmoji, type CurrentWeather } from '../api/weather'
import { getGwangjuAirQuality, getWorstGrade, type AirQuality, type AirGradeInfo } from '../api/airQuality'

interface Props {
  lat: number
  lng: number
  onModalChange?: (open: boolean) => void
}

interface WeatherInfo {
  weather: CurrentWeather
  air: AirQuality | null
  airGrade: AirGradeInfo | null
}

export default function WeatherBadge(props: Props) {
  const [info, setInfo] = useState<WeatherInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [showDetail, setShowDetail] = useState(false)

  useEffect(function () {
    async function loadAll() {
      setLoading(true)
      try {
        const [weather, air] = await Promise.all([
          getCurrentWeather(props.lat, props.lng),
          getGwangjuAirQuality(),
        ])

        if (!weather) {
          setInfo(null)
          return
        }

        const airGrade = air ? getWorstGrade(air.pm10, air.pm25) : null

        setInfo({ weather: weather, air: air, airGrade: airGrade })
      } catch (err) {
        console.error('날씨 정보 로딩 실패:', err)
        setInfo(null)
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, [props.lat, props.lng])

  // 모달 상태 부모에 알림
  useEffect(function () {
    if (props.onModalChange) {
      props.onModalChange(showDetail)
    }
  }, [showDetail])

  if (loading) {
    return (
      <div style={{ padding: '7px 10px', background: '#fff', borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.12)', fontSize: 11, color: '#999', whiteSpace: 'nowrap' }}>
        🌤️ 확인중
      </div>
    )
  }

  if (!info) return null

  const { weather, air, airGrade } = info
  const weatherEmoji = getWeatherEmoji(weather.precipitationType, weather.temperature)

  function onClickBadge() {
    setShowDetail(true)
  }

  function onCloseDetail() {
    setShowDetail(false)
  }

  function onStopProp(e: React.MouseEvent) {
    e.stopPropagation()
  }

  // 종합 외출 어드바이스
  let outdoorAdvice = '외출하기 좋아요'
  let outdoorEmoji = '✅'

  if (weather.precipitationType > 0 && airGrade && (airGrade.grade === 'bad' || airGrade.grade === 'veryBad')) {
    outdoorAdvice = '마스크 + 우산 필요해요'
    outdoorEmoji = '⚠️'
  } else if (weather.precipitationType > 0) {
    outdoorAdvice = '우산 챙기세요'
    outdoorEmoji = '☂️'
  } else if (airGrade && airGrade.grade === 'veryBad') {
    outdoorAdvice = '외출 자제하세요'
    outdoorEmoji = '🚨'
  } else if (airGrade && airGrade.grade === 'bad') {
    outdoorAdvice = '마스크 필요해요'
    outdoorEmoji = '😷'
  } else if (weather.temperature >= 33) {
    outdoorAdvice = '폭염주의, 외출 자제'
    outdoorEmoji = '🥵'
  } else if (weather.temperature >= 30) {
    outdoorAdvice = '더위 주의, 수분 섭취'
    outdoorEmoji = '☀️'
  } else if (weather.temperature <= 0) {
    outdoorAdvice = '한파주의, 따뜻하게'
    outdoorEmoji = '🥶'
  } else if (weather.temperature <= 5) {
    outdoorAdvice = '쌀쌀해요, 따뜻하게'
    outdoorEmoji = '🧥'
  }

  return (
    <>
      {/* 작은 배지 (헤더 우측 상단) */}
      <div onClick={onClickBadge} style={{ padding: '6px 10px', background: '#fff', borderRadius: 11, boxShadow: '0 2px 8px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', border: airGrade && (airGrade.grade === 'bad' || airGrade.grade === 'veryBad') ? '1.5px solid ' + airGrade.color : '1px solid #e8e8e8', flexShrink: 0 }}>
        <span style={{ fontSize: 16, lineHeight: 1 }}>{airGrade ? airGrade.emoji : '🌤️'}</span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#333', whiteSpace: 'nowrap' }}>
            {Math.round(weather.temperature)}° <span style={{ fontSize: 13 }}>{weatherEmoji.emoji}</span>
          </div>
          {air && airGrade && (
            <div style={{ fontSize: 9, color: airGrade.color, fontWeight: 700, marginTop: 1, whiteSpace: 'nowrap' }}>
              PM {air.pm10} · {airGrade.label}
            </div>
          )}
        </div>
      </div>

      {/* 상세 모달 - 좁고 다른 UI는 KakaoMap에서 숨김 처리 */}
      {showDetail && (
        <div onClick={onCloseDetail} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 56px' }}>
          <div onClick={onStopProp} style={{ background: '#fff', borderRadius: 20, padding: 18, maxWidth: 320, width: '100%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,0.4)', position: 'relative' }}>
            {/* 닫기 ✕ 버튼 - 둥근 회색 배경 */}
            <button onClick={onCloseDetail} style={{ position: 'absolute', top: 12, right: 12, width: 36, height: 36, border: 'none', background: '#f0f0f0', borderRadius: '50%', fontSize: 18, cursor: 'pointer', color: '#666', padding: 0, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, zIndex: 1 }}>✕</button>

            <div style={{ marginBottom: 16, paddingRight: 40 }}>
              <div style={{ fontSize: 13, color: '#888', fontWeight: 700 }}>외출 전 환경 정보</div>
              <div style={{ fontSize: 19, fontWeight: 900, color: '#333', marginTop: 6, lineHeight: 1.3 }}>
                {outdoorEmoji} {outdoorAdvice}
              </div>
            </div>

            {/* 날씨 */}
            <div style={{ padding: '16px 14px', background: '#f7f9fc', borderRadius: 14, marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: '#888', fontWeight: 700, marginBottom: 10, textAlign: 'center' }}>현재 날씨 (기상청)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'center' }}>
                <div style={{ fontSize: 48, lineHeight: 1, flexShrink: 0 }}>{weatherEmoji.emoji}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 36, fontWeight: 900, color: '#333', lineHeight: 1 }}>{Math.round(weather.temperature)}°C</div>
                  <div style={{ fontSize: 14, color: '#666', marginTop: 6, fontWeight: 600 }}>{weatherEmoji.label} · 습도 {weather.humidity}%</div>
                  {parseFloat(weather.precipitation) > 0 && (
                    <div style={{ fontSize: 13, color: '#1976d2', fontWeight: 800, marginTop: 3 }}>강수량 {weather.precipitation}mm</div>
                  )}
                </div>
              </div>
            </div>

            {/* 미세먼지 */}
            {air && airGrade && (
              <div style={{ padding: '16px 14px', background: '#f7f9fc', borderRadius: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 13, color: '#888', fontWeight: 700, marginBottom: 10, textAlign: 'center' }}>대기질 (에어코리아 · 광주 평균)</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'center' }}>
                  <div style={{ fontSize: 48, lineHeight: 1, flexShrink: 0 }}>{airGrade.emoji}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: airGrade.color, lineHeight: 1 }}>{airGrade.label}</div>
                    <div style={{ fontSize: 14, color: '#666', marginTop: 6, fontWeight: 600 }}>
                      미세 <strong>{air.pm10}</strong> · 초미세 <strong>{air.pm25}</strong>
                    </div>
                    <div style={{ fontSize: 13, color: airGrade.color, fontWeight: 800, marginTop: 3 }}>{airGrade.advice}</div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ padding: '13px 14px', background: '#fff8f0', borderRadius: 12, fontSize: 13, color: '#7a4e1f', lineHeight: 1.55, fontWeight: 500 }}>
              ℹ️ 응급실·약국 방문 전 외부 환경을 확인하세요. 어르신은 미세먼지 나쁨 이상일 때 마스크 착용을 권장합니다.
            </div>
          </div>
        </div>
      )}
    </>
  )
}
