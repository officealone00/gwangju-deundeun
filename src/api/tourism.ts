// ============================================================
// 한국관광공사 TourAPI 4.0 (KorService2)
// 광주든든: 광주 관광 정보 - 전 카테고리 (관광지/문화/축제/레포츠/음식/쇼핑/숙박)
//
// 응답 구조:
// {
//   "response": {
//     "header": { "resultCode": "0000", "resultMsg": "OK" },
//     "body": {
//       "items": { "item": [...] },
//       "numOfRows": N,
//       "pageNo": N,
//       "totalCount": N
//     }
//   }
// }
// ============================================================

const BASE = 'https://apis.data.go.kr/B551011/KorService2'
const SERVICE_KEY = import.meta.env.VITE_DATA_GO_KR_KEY

// ── contentTypeId 한글 라벨 매핑 ──────────────────────────
const CATEGORY_LABELS: Record<number, string> = {
  12: '관광지',
  14: '문화시설',
  15: '축제/공연/행사',
  25: '여행코스',
  28: '레포츠',
  32: '숙박',
  38: '쇼핑',
  39: '음식점',
}

const CATEGORY_EMOJIS: Record<number, string> = {
  12: '🏞️',
  14: '🏛️',
  15: '🎉',
  25: '🗺️',
  28: '⛹️',
  32: '🏨',
  38: '🛍️',
  39: '🍲',
}

export function getCategoryLabel(typeId: number): string {
  return CATEGORY_LABELS[typeId] || '기타'
}

export function getCategoryEmoji(typeId: number): string {
  return CATEGORY_EMOJIS[typeId] || '📍'
}

// ── 광주 관광 정보 타입 ─────────────────────────────────────
export interface TouristSpot {
  contentId: string
  title: string             // 장소명
  addr: string              // 주소
  categoryId: number        // contentTypeId
  category: string          // 한글 카테고리 라벨
  emoji: string             // 카테고리 이모지
  imageUrl: string          // firstimage (큰 사진, 인포윈도우용)
  thumbnail: string         // firstimage2 (썸네일)
  lat: number               // mapy
  lng: number               // mapx
  tel: string
}

// ── 광주 관광 정보 조회 (전체 카테고리, 페이징) ────────────
export async function fetchGwangjuTourism(): Promise<TouristSpot[]> {
  if (!SERVICE_KEY) {
    console.warn('[Tourism] VITE_DATA_GO_KR_KEY 미설정')
    return []
  }

  const allSpots: TouristSpot[] = []
  let pageNo = 1
  const numOfRows = 1000
  const MAX_PAGES = 5  // 안전장치: 최대 5000개

  try {
    while (pageNo <= MAX_PAGES) {
      const url = new URL(`${BASE}/areaBasedList2`)
      url.searchParams.set('serviceKey', SERVICE_KEY)
      url.searchParams.set('MobileOS', 'ETC')
      url.searchParams.set('MobileApp', 'gwangju-deundeun')
      url.searchParams.set('numOfRows', String(numOfRows))
      url.searchParams.set('pageNo', String(pageNo))
      url.searchParams.set('areaCode', '5')      // 광주광역시
      url.searchParams.set('arrange', 'A')       // 제목순
      url.searchParams.set('_type', 'json')

      const res = await fetch(url.toString())
      if (!res.ok) {
        console.warn('[Tourism] HTTP 에러:', res.status)
        break
      }

      const json = await res.json()
      const body = json?.response?.body
      if (!body) {
        console.warn('[Tourism] 응답 body 없음:', json?.response?.header)
        break
      }

      const items = body?.items?.item
      if (!items) break

      const itemArray = Array.isArray(items) ? items : [items]

      const spots = itemArray
        .map(function (item: any): TouristSpot {
          const typeId = parseInt(item.contenttypeid) || 0
          return {
            contentId: String(item.contentid || ''),
            title: item.title || '',
            addr: item.addr1 || '',
            categoryId: typeId,
            category: getCategoryLabel(typeId),
            emoji: getCategoryEmoji(typeId),
            imageUrl: item.firstimage || '',
            thumbnail: item.firstimage2 || item.firstimage || '',
            lat: parseFloat(item.mapy) || 0,
            lng: parseFloat(item.mapx) || 0,
            tel: item.tel || '',
          }
        })
        .filter(function (spot: TouristSpot) {
          // 광주 좌표 범위 검증
          return (
            spot.lat >= 35.0 && spot.lat <= 35.3 &&
            spot.lng >= 126.6 && spot.lng <= 127.0 &&
            spot.title.length > 0
          )
        })

      allSpots.push(...spots)

      const totalCount = parseInt(body.totalCount) || 0
      if (pageNo * numOfRows >= totalCount) break
      pageNo += 1
    }

    return allSpots
  } catch (err) {
    console.error('[Tourism] 조회 실패:', err)
    return allSpots  // 페이징 중 실패해도 받은 만큼은 반환
  }
}

// ── 카테고리별 색상 (선택적 사용) ──────────────────────────
export function getCategoryColor(typeId: number): string {
  switch (typeId) {
    case 12: return '#4CAF50'  // 관광지 - 초록
    case 14: return '#9C27B0'  // 문화시설 - 보라
    case 15: return '#FF5722'  // 축제 - 주황
    case 25: return '#3F51B5'  // 여행코스 - 남색
    case 28: return '#00BCD4'  // 레포츠 - 청록
    case 32: return '#795548'  // 숙박 - 갈색
    case 38: return '#FFC107'  // 쇼핑 - 노랑
    case 39: return '#E91E63'  // 음식점 - 핑크
    default: return '#607D8B'
  }
}
