const DATA_GO_KR_KEY = import.meta.env.VITE_DATA_GO_KR_KEY

// 공공데이터포털 응급의료기관 정보 조회
export interface EmergencyRoom {
  dutyName: string        // 병원명
  dutyAddr: string        // 주소
  dutyTel1: string        // 대표전화
  dutyTel3: string        // 응급실 전화
  wgs84Lat: number        // 위도
  wgs84Lon: number        // 경도
  hpid: string            // 병원 고유 ID
}

/**
 * 광주광역시 응급의료기관 목록 조회
 */
export async function fetchGwangjuEmergencyRooms(): Promise<EmergencyRoom[]> {
  const url = `https://apis.data.go.kr/B552657/ErmctInfoInqireService/getEgytListInfoInqire?serviceKey=${DATA_GO_KR_KEY}&Q0=광주광역시&pageNo=1&numOfRows=100&_type=json`

  try {
    const response = await fetch(url)
    const data = await response.json()
    
    // API 응답 구조 파싱
    const items = data?.response?.body?.items?.item || []
    const itemArray = Array.isArray(items) ? items : [items]
    
    return itemArray.map((item: any) => ({
      dutyName: item.dutyName || '',
      dutyAddr: item.dutyAddr || '',
      dutyTel1: item.dutyTel1 || '',
      dutyTel3: item.dutyTel3 || '',
      wgs84Lat: parseFloat(item.wgs84Lat) || 0,
      wgs84Lon: parseFloat(item.wgs84Lon) || 0,
      hpid: item.hpid || '',
    })).filter((room: EmergencyRoom) => room.wgs84Lat > 0 && room.wgs84Lon > 0)
  } catch (error) {
    console.error('응급의료기관 데이터 조회 실패:', error)
    return []
  }
}
// ==================== 약국 API ====================

export interface Pharmacy {
  dutyName: string
  dutyAddr: string
  dutyTel1: string
  wgs84Lat: number
  wgs84Lon: number
  hpid: string
}

/**
 * 광주광역시 약국 목록 조회
 */
export async function fetchGwangjuPharmacies(): Promise<Pharmacy[]> {
  // 광주 5개 자치구 각각 호출해서 합치기
  const districts = ['동구', '서구', '남구', '북구', '광산구']
  const allPharmacies: Pharmacy[] = []

  for (const district of districts) {
    const url = `https://apis.data.go.kr/B552657/ErmctInsttInfoInqireService/getParmacyListInfoInqire?serviceKey=${DATA_GO_KR_KEY}&Q0=광주광역시&Q1=${encodeURIComponent(district)}&pageNo=1&numOfRows=100&_type=json`
    
    try {
      const response = await fetch(url)
      const data = await response.json()
      
      const items = data?.response?.body?.items?.item || []
      const itemArray = Array.isArray(items) ? items : [items]
      
      const pharmacies = itemArray
        .map((item: any) => ({
          dutyName: item.dutyName || '',
          dutyAddr: item.dutyAddr || '',
          dutyTel1: item.dutyTel1 || '',
          wgs84Lat: parseFloat(item.wgs84Lat) || 0,
          wgs84Lon: parseFloat(item.wgs84Lon) || 0,
          hpid: item.hpid || '',
        }))
        .filter((p: Pharmacy) => p.wgs84Lat > 0 && p.wgs84Lon > 0)
      
      allPharmacies.push(...pharmacies)
    } catch (error) {
      console.error(`${district} 약국 조회 실패:`, error)
    }
  }

  return allPharmacies
}
// ==================== 주소 검색 API ====================

const KAKAO_REST_KEY = import.meta.env.VITE_KAKAO_REST_KEY

export interface AddressResult {
  placeName: string      // 장소명/건물명
  addressName: string    // 도로명 주소
  category: string       // 카테고리 (예: "행정동", "병원", "공원")
  lat: number
  lng: number
}

/**
 * 카카오 키워드 검색 (광주 지역 한정)
 */
export async function searchAddress(keyword: string): Promise<AddressResult[]> {
  if (!keyword.trim()) return []

  // 광주 한정 검색을 위해 "광주" 키워드 자동 추가
  const query = keyword.includes('광주') ? keyword : `광주 ${keyword}`
  
  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=10`

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `KakaoAK ${KAKAO_REST_KEY}`,
      },
    })

    if (!response.ok) {
      console.error('카카오 검색 API 오류:', response.status)
      return []
    }

    const data = await response.json()
    const documents = data?.documents || []

    return documents.map((doc: any) => ({
      placeName: doc.place_name || '',
      addressName: doc.road_address_name || doc.address_name || '',
      category: doc.category_group_name || doc.category_name?.split('>').pop()?.trim() || '',
      lat: parseFloat(doc.y) || 0,
      lng: parseFloat(doc.x) || 0,
    })).filter((r: AddressResult) => r.lat > 0 && r.lng > 0)
  } catch (error) {
    console.error('주소 검색 실패:', error)
    return []
  }
}