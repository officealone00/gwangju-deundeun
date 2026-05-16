// ============================================================
// 에어코리아 대기질 API
// 광주든든: 외출 전 미세먼지 확인 (어르신 호흡기 건강)
// ============================================================

const AIR_BASE = 'https://apis.data.go.kr/B552584/ArpltnInforInqireSvc'
const SERVICE_KEY = import.meta.env.VITE_DATA_GO_KR_KEY

// ── 미세먼지 등급 ────────────────────────────────────────────
export type AirGrade = 'good' | 'moderate' | 'bad' | 'veryBad'

export interface AirGradeInfo {
  grade: AirGrade
  label: string
  emoji: string
  color: string
  advice: string
}

const GRADE_INFO: Record<AirGrade, AirGradeInfo> = {
  good:     { grade: 'good',     label: '좋음',     emoji: '😊', color: '#3182F6', advice: '외출하기 좋아요' },
  moderate: { grade: 'moderate', label: '보통',     emoji: '🙂', color: '#1D9E75', advice: '외출 가능해요' },
  bad:      { grade: 'bad',      label: '나쁨',     emoji: '😷', color: '#EF9F27', advice: '마스크 필요해요' },
  veryBad:  { grade: 'veryBad',  label: '매우나쁨', emoji: '🚨', color: '#F04452', advice: '외출 자제하세요' },
}

// PM10 미세먼지 등급 (μg/m³)
export function getPM10Grade(value: number): AirGradeInfo {
  if (value <= 30) return GRADE_INFO.good
  if (value <= 80) return GRADE_INFO.moderate
  if (value <= 150) return GRADE_INFO.bad
  return GRADE_INFO.veryBad
}

// PM2.5 초미세먼지 등급 (μg/m³)
export function getPM25Grade(value: number): AirGradeInfo {
  if (value <= 15) return GRADE_INFO.good
  if (value <= 35) return GRADE_INFO.moderate
  if (value <= 75) return GRADE_INFO.bad
  return GRADE_INFO.veryBad
}

// 두 등급 중 더 나쁜 것 반환 (안전 우선)
export function getWorstGrade(pm10: number, pm25: number): AirGradeInfo {
  const g10 = getPM10Grade(pm10)
  const g25 = getPM25Grade(pm25)
  const order: AirGrade[] = ['good', 'moderate', 'bad', 'veryBad']
  return order.indexOf(g25.grade) > order.indexOf(g10.grade) ? g25 : g10
}

// ── 광주 대기질 조회 (시도별 실시간 측정) ────────────────────
export interface AirQuality {
  pm10: number         // 미세먼지
  pm25: number         // 초미세먼지
  stationName: string  // 측정소
  dataTime: string     // 측정 시각
}

export async function getGwangjuAirQuality(): Promise<AirQuality | null> {
  if (!SERVICE_KEY) return null

  try {
    const url = new URL(`${AIR_BASE}/getCtprvnRltmMesureDnsty`)
    url.searchParams.set('serviceKey', SERVICE_KEY)
    url.searchParams.set('returnType', 'json')
    url.searchParams.set('numOfRows', '50')
    url.searchParams.set('pageNo', '1')
    url.searchParams.set('sidoName', '광주')
    url.searchParams.set('ver', '1.3')

    const res = await fetch(url.toString())
    if (!res.ok) return null

    const json = await res.json()
    const items = json?.response?.body?.items
    if (!items || items.length === 0) return null

    // 평균값 계산 (광주 시 전체)
    let sumPm10 = 0
    let sumPm25 = 0
    let count = 0

    items.forEach(function (item: any) {
      const pm10 = parseFloat(item.pm10Value)
      const pm25 = parseFloat(item.pm25Value)
      if (!isNaN(pm10) && pm10 > 0 && !isNaN(pm25) && pm25 > 0) {
        sumPm10 += pm10
        sumPm25 += pm25
        count++
      }
    })

    if (count === 0) return null

    return {
      pm10: Math.round(sumPm10 / count),
      pm25: Math.round(sumPm25 / count),
      stationName: '광주 평균',
      dataTime: items[0]?.dataTime || '',
    }
  } catch (err) {
    console.warn('[AIR] 대기질 조회 실패:', err)
    return null
  }
}
