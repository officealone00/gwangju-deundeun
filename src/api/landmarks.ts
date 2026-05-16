// ============================================================
// 광주 13대 명소 (외지인이 가장 자주 찾는 곳)
//
// 좌표: 카카오맵 검증 좌표
// 외지인 시나리오 직격: KTX→유스퀘어→챔필 같은 경로 핵심 지점
// ============================================================

export interface Landmark {
  id: string
  name: string                          // 한글 이름
  nameEn?: string                       // 영문 (외국인 관광객)
  category: 'sports' | 'culture' | 'transport' | 'admin'
  categoryLabel: string                 // 카테고리 라벨
  emoji: string                         // 카테고리 이모지
  lat: number
  lng: number
  district: string                      // 자치구
  address: string                       // 도로명 주소
  description?: string                  // 한 줄 설명 (인포윈도우용)
  tel?: string                          // 대표 전화 (있으면)
}

// ── 광주 13대 명소 ──────────────────────────────────────
export const GWANGJU_LANDMARKS: Landmark[] = [
  // 🏟️ 스포츠 (3)
  {
    id: 'kia-champions-field',
    name: 'KIA 챔피언스필드',
    nameEn: 'KIA Champions Field',
    category: 'sports',
    categoryLabel: '야구장',
    emoji: '⚾',
    lat: 35.16823,
    lng: 126.88891,
    district: '북구',
    address: '광주광역시 북구 서림로 10',
    description: 'KIA 타이거즈 홈구장',
    tel: '062-525-5350',
  },
  {
    id: 'gwangju-world-cup-stadium',
    name: '광주월드컵경기장',
    nameEn: 'Gwangju World Cup Stadium',
    category: 'sports',
    categoryLabel: '축구장',
    emoji: '⚽',
    lat: 35.13447,
    lng: 126.87833,
    district: '서구',
    address: '광주광역시 서구 금화로 240',
    description: '광주FC 홈구장 (구 월드컵경기장)',
  },
  {
    id: 'gwangju-univ-gym',
    name: '광주여대 유니버시아드체육관',
    nameEn: 'Gwangju Universiade Gym',
    category: 'sports',
    categoryLabel: '체육관',
    emoji: '🏟️',
    lat: 35.13072,
    lng: 126.85806,
    district: '서구',
    address: '광주광역시 서구 풍금로 76',
    description: '대형 실내 경기장·콘서트장',
  },

  // 🎭 문화 (4)
  {
    id: 'acc',
    name: '국립아시아문화전당 (ACC)',
    nameEn: 'Asia Culture Center',
    category: 'culture',
    categoryLabel: '문화전당',
    emoji: '🎭',
    lat: 35.14647,
    lng: 126.92092,
    district: '동구',
    address: '광주광역시 동구 문화전당로 38',
    description: '아시아 최대 복합문화공간',
    tel: '1899-5566',
  },
  {
    id: 'kim-daejung-convention',
    name: '김대중컨벤션센터',
    nameEn: 'Kimdaejung Convention Center',
    category: 'culture',
    categoryLabel: '컨벤션',
    emoji: '🏛️',
    lat: 35.14272,
    lng: 126.84025,
    district: '서구',
    address: '광주광역시 서구 상무누리로 30',
    description: '전시·박람회·국제회의',
    tel: '062-611-2000',
  },
  {
    id: 'gwangju-arts-center',
    name: '광주문화예술회관',
    nameEn: 'Gwangju Culture & Art Center',
    category: 'culture',
    categoryLabel: '예술회관',
    emoji: '🎨',
    lat: 35.17769,
    lng: 126.90647,
    district: '북구',
    address: '광주광역시 북구 북문대로 60',
    description: '광주 대표 공연장',
    tel: '062-613-8333',
  },
  {
    id: '518-democracy-square',
    name: '5·18 민주광장',
    nameEn: '5·18 Democracy Square',
    category: 'culture',
    categoryLabel: '역사명소',
    emoji: '🕊️',
    lat: 35.14647,
    lng: 126.91922,
    district: '동구',
    address: '광주광역시 동구 금남로 245',
    description: '광주의 심장, 5·18 민주화운동 발원지',
  },

  // 🚉 교통 허브 (3) — 외지인 출발점!
  {
    id: 'usquare',
    name: '유스퀘어 (광주종합버스터미널)',
    nameEn: 'U-Square Gwangju Bus Terminal',
    category: 'transport',
    categoryLabel: '버스터미널',
    emoji: '🚌',
    lat: 35.16003,
    lng: 126.87883,
    district: '서구',
    address: '광주광역시 서구 무진대로 904',
    description: '광주 대표 시외·고속버스 터미널',
    tel: '062-360-8114',
  },
  {
    id: 'gwangju-songjeong-station',
    name: '광주송정역',
    nameEn: 'Gwangju Songjeong Station',
    category: 'transport',
    categoryLabel: 'KTX역',
    emoji: '🚄',
    lat: 35.13994,
    lng: 126.79256,
    district: '광산구',
    address: '광주광역시 광산구 상무대로 201',
    description: 'KTX·SRT 광주 관문역',
    tel: '062-941-7788',
  },
  {
    id: 'gwangju-airport',
    name: '광주공항',
    nameEn: 'Gwangju Airport',
    category: 'transport',
    categoryLabel: '공항',
    emoji: '✈️',
    lat: 35.12642,
    lng: 126.80878,
    district: '광산구',
    address: '광주광역시 광산구 상무대로 420-25',
    description: '광주 국내선 공항',
    tel: '062-940-0114',
  },

  // 🏛️ 행정·미술 (3)
  {
    id: 'gwangju-city-hall',
    name: '광주광역시청',
    nameEn: 'Gwangju City Hall',
    category: 'admin',
    categoryLabel: '시청',
    emoji: '🏢',
    lat: 35.15992,
    lng: 126.85206,
    district: '서구',
    address: '광주광역시 서구 내방로 111',
    description: '광주광역시 행정 중심',
    tel: '062-120',
  },
  {
    id: 'gwangju-art-museum',
    name: '광주시립미술관',
    nameEn: 'Gwangju Museum of Art',
    category: 'admin',
    categoryLabel: '미술관',
    emoji: '🖼️',
    lat: 35.18497,
    lng: 126.88753,
    district: '북구',
    address: '광주광역시 북구 하서로 52',
    description: '광주비엔날레 주요 장소',
    tel: '062-613-7100',
  },
  {
    id: 'old-jeonnam-provincial-office',
    name: '옛 전남도청',
    nameEn: 'Former Jeonnam Provincial Office',
    category: 'admin',
    categoryLabel: '역사건축',
    emoji: '🏛️',
    lat: 35.14681,
    lng: 126.91963,
    district: '동구',
    address: '광주광역시 동구 광산동 13',
    description: '5·18 민주화운동 사적지 1호',
  },
]

// ── 카테고리별 필터 헬퍼 ─────────────────────────────────
export function getLandmarksByCategory(category: Landmark['category']): Landmark[] {
  return GWANGJU_LANDMARKS.filter(l => l.category === category)
}

// ── 비동기 시그니처 통일 ─────────────────────────────────
export async function fetchGwangjuLandmarks(): Promise<Landmark[]> {
  return Promise.resolve(GWANGJU_LANDMARKS)
}
