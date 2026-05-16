// ============================================================
// 기상청 단기예보 API
// 광주든든: 외출 전 현재 날씨 확인 (어르신·1인가구 안심돌봄)
// ============================================================

const KMA_BASE = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0'
const SERVICE_KEY = import.meta.env.VITE_DATA_GO_KR_KEY

// ── 위경도 → 기상청 격자(LCC) 변환 ────────────────────────────
const RE = 6371.00877
const GRID = 5.0
const SLAT1 = 30.0
const SLAT2 = 60.0
const OLON = 126.0
const OLAT = 38.0
const XO = 43
const YO = 136

export interface GridXY {
  nx: number
  ny: number
}

export function latLonToGrid(lat: number, lon: number): GridXY {
  const DEGRAD = Math.PI / 180.0
  const re = RE / GRID
  const slat1 = SLAT1 * DEGRAD
  const slat2 = SLAT2 * DEGRAD
  const olon = OLON * DEGRAD
  const olat = OLAT * DEGRAD

  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5)
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn)
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5)
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5)
  ro = (re * sf) / Math.pow(ro, sn)

  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5)
  ra = (re * sf) / Math.pow(ra, sn)
  let theta = lon * DEGRAD - olon
  if (theta > Math.PI) theta -= 2.0 * Math.PI
  if (theta < -Math.PI) theta += 2.0 * Math.PI
  theta *= sn

  return {
    nx: Math.floor(ra * Math.sin(theta) + XO + 0.5),
    ny: Math.floor(ro - ra * Math.cos(theta) + YO + 0.5),
  }
}

// ── 기준 시각 계산 (초단기실황: 매시각 40분 이후 발표) ───────
function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

function getBaseDateTime(): { baseDate: string; baseTime: string } {
  const now = new Date()
  now.setMinutes(now.getMinutes() - 40)

  const y = now.getFullYear()
  const m = pad(now.getMonth() + 1)
  const d = pad(now.getDate())
  const h = now.getHours()

  return { baseDate: `${y}${m}${d}`, baseTime: `${pad(h)}00` }
}

// ── 현재 날씨 조회 (초단기실황) ───────────────────────────────
export interface CurrentWeather {
  temperature: number       // 기온 (℃)
  humidity: number          // 습도 (%)
  precipitationType: number // 강수형태: 0=없음, 1=비, 2=비/눈, 3=눈, 5=빗방울, 6=빗방울눈날림, 7=눈날림
  precipitation: string     // 1시간 강수량 (mm)
  windSpeed: number         // 풍속 (m/s)
}

export async function getCurrentWeather(lat: number, lon: number): Promise<CurrentWeather | null> {
  if (!SERVICE_KEY) return null

  try {
    const { nx, ny } = latLonToGrid(lat, lon)
    const { baseDate, baseTime } = getBaseDateTime()

    const url = new URL(`${KMA_BASE}/getUltraSrtNcst`)
    url.searchParams.set('serviceKey', SERVICE_KEY)
    url.searchParams.set('dataType', 'JSON')
    url.searchParams.set('numOfRows', '100')
    url.searchParams.set('pageNo', '1')
    url.searchParams.set('base_date', baseDate)
    url.searchParams.set('base_time', baseTime)
    url.searchParams.set('nx', nx.toString())
    url.searchParams.set('ny', ny.toString())

    const res = await fetch(url.toString())
    if (!res.ok) return null

    const json = await res.json()
    const items = json?.response?.body?.items?.item
    if (!items) return null

    const result: CurrentWeather = {
      temperature: 0,
      humidity: 0,
      precipitationType: 0,
      precipitation: '0',
      windSpeed: 0,
    }

    items.forEach(function (item: any) {
      const val = item.obsrValue ?? item.fcstValue
      switch (item.category) {
        case 'T1H': result.temperature = parseFloat(val); break
        case 'REH': result.humidity = parseFloat(val); break
        case 'PTY': result.precipitationType = parseInt(val); break
        case 'RN1': result.precipitation = val; break
        case 'WSD': result.windSpeed = parseFloat(val); break
      }
    })

    return result
  } catch (err) {
    console.warn('[KMA] 날씨 조회 실패:', err)
    return null
  }
}

// ── 강수형태 → 이모지 + 설명 ──────────────────────────────────
export interface WeatherEmoji {
  emoji: string
  label: string
}

export function getWeatherEmoji(precipitationType: number, temperature: number): WeatherEmoji {
  switch (precipitationType) {
    case 1: return { emoji: '🌧️', label: '비' }
    case 2: return { emoji: '🌨️', label: '비/눈' }
    case 3: return { emoji: '❄️', label: '눈' }
    case 5: return { emoji: '💧', label: '빗방울' }
    case 6: return { emoji: '🌨️', label: '빗방울/눈' }
    case 7: return { emoji: '❄️', label: '눈날림' }
  }

  // 비/눈 없을 때 → 온도 기반
  if (temperature >= 30) return { emoji: '🥵', label: '폭염' }
  if (temperature >= 25) return { emoji: '☀️', label: '맑음' }
  if (temperature >= 15) return { emoji: '⛅', label: '맑음' }
  if (temperature >= 5) return { emoji: '🌤️', label: '쌀쌀' }
  if (temperature >= 0) return { emoji: '🥶', label: '추움' }
  return { emoji: '🥶', label: '한파' }
}
