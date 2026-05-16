// ============================================================
// 광주 도시철도 1호선 (광주교통공사)
//
// 데이터 소스:
// - 역 ID/역명: 광주교통공사 공식 API (stationInformation)
// - 좌표: 카카오맵 검증 좌표
// - 역 주소: 광주교통공사 + 위키백과 교차검증
//
// 변동성 없음 → 하드코딩 (API 호출 불필요)
// 2호선 (2028년 1단계 개통 예정) → 추후 추가 가능
// ============================================================

export interface SubwayStation {
  stationId: number    // 광주교통공사 station_id (1~20)
  code: string         // 사용자 표시용 역 번호
  name: string         // 한글 역명
  nameEn: string       // 영문 역명
  line: '1호선'
  lineColor: string
  lat: number
  lng: number
  district: string     // 자치구
  address: string
  transfer?: string    // 환승 정보
}

// 1호선 공식색 (청록)
const LINE1_COLOR = '#009E96'

// ── 광주 도시철도 1호선 20개역 ────────────────────────────
// 순서: 광주교통공사 일람표 기준 (1=평동 → 20=녹동)
// 좌표: 카카오맵 검증 (소수점 5자리, 약 1m 정확도)
export const GWANGJU_SUBWAY_STATIONS: SubwayStation[] = [
  {
    stationId: 1,
    code: '120',
    name: '평동',
    nameEn: 'Pyeongdong',
    line: '1호선',
    lineColor: LINE1_COLOR,
    lat: 35.13683,
    lng: 126.76922,
    district: '광산구',
    address: '광주광역시 광산구 평동산단외로 174',
  },
  {
    stationId: 2,
    code: '119',
    name: '도산',
    nameEn: 'Dosan',
    line: '1호선',
    lineColor: LINE1_COLOR,
    lat: 35.13486,
    lng: 126.78089,
    district: '광산구',
    address: '광주광역시 광산구 어등대로 470',
  },
  {
    stationId: 3,
    code: '118',
    name: '광주송정역',
    nameEn: 'Gwangju Songjeong Station',
    line: '1호선',
    lineColor: LINE1_COLOR,
    lat: 35.13994,
    lng: 126.79256,
    district: '광산구',
    address: '광주광역시 광산구 상무대로 201',
    transfer: 'KTX/SRT 광주송정역',
  },
  {
    stationId: 4,
    code: '117',
    name: '송정공원',
    nameEn: 'Songjeong Park',
    line: '1호선',
    lineColor: LINE1_COLOR,
    lat: 35.14150,
    lng: 126.80286,
    district: '광산구',
    address: '광주광역시 광산구 상무대로 312',
  },
  {
    stationId: 5,
    code: '116',
    name: '공항',
    nameEn: 'Airport',
    line: '1호선',
    lineColor: LINE1_COLOR,
    lat: 35.14264,
    lng: 126.81436,
    district: '광산구',
    address: '광주광역시 광산구 상무대로 419',
    transfer: '광주공항 (국내선)',
  },
  {
    stationId: 6,
    code: '115',
    name: '김대중컨벤션센터',
    nameEn: 'Kim Daejung Convention Center',
    line: '1호선',
    lineColor: LINE1_COLOR,
    lat: 35.14314,
    lng: 126.84141,
    district: '서구',
    address: '광주광역시 서구 상무누리로 30',
  },
  {
    stationId: 7,
    code: '114',
    name: '상무',
    nameEn: 'Sangmu',
    line: '1호선',
    lineColor: LINE1_COLOR,
    lat: 35.14939,
    lng: 126.85283,
    district: '서구',
    address: '광주광역시 서구 상무대로 819',
  },
  {
    stationId: 8,
    code: '113',
    name: '운천',
    nameEn: 'Uncheon',
    line: '1호선',
    lineColor: LINE1_COLOR,
    lat: 35.14728,
    lng: 126.86158,
    district: '서구',
    address: '광주광역시 서구 상무대로 905',
  },
  {
    stationId: 9,
    code: '112',
    name: '쌍촌',
    nameEn: 'Ssangchon',
    line: '1호선',
    lineColor: LINE1_COLOR,
    lat: 35.14700,
    lng: 126.86869,
    district: '서구',
    address: '광주광역시 서구 상무대로 977',
  },
  {
    stationId: 10,
    code: '111',
    name: '화정',
    nameEn: 'Hwajeong',
    line: '1호선',
    lineColor: LINE1_COLOR,
    lat: 35.14542,
    lng: 126.87911,
    district: '서구',
    address: '광주광역시 서구 상무대로 1088',
  },
  {
    stationId: 11,
    code: '110',
    name: '농성',
    nameEn: 'Nongseong',
    line: '1호선',
    lineColor: LINE1_COLOR,
    lat: 35.14464,
    lng: 126.88803,
    district: '서구',
    address: '광주광역시 서구 죽봉대로 65',
  },
  {
    stationId: 12,
    code: '109',
    name: '돌고개',
    nameEn: 'Dolgogae',
    line: '1호선',
    lineColor: LINE1_COLOR,
    lat: 35.14672,
    lng: 126.89494,
    district: '서구',
    address: '광주광역시 서구 천변좌로 326',
  },
  {
    stationId: 13,
    code: '108',
    name: '양동시장',
    nameEn: 'Yangdong Market',
    line: '1호선',
    lineColor: LINE1_COLOR,
    lat: 35.14997,
    lng: 126.90189,
    district: '서구',
    address: '광주광역시 서구 천변좌로 410',
  },
  {
    stationId: 14,
    code: '107',
    name: '금남로5가',
    nameEn: 'Geumnamno 5(o)-ga',
    line: '1호선',
    lineColor: LINE1_COLOR,
    lat: 35.15053,
    lng: 126.90889,
    district: '동구',
    address: '광주광역시 동구 금남로 219',
  },
  {
    stationId: 15,
    code: '106',
    name: '금남로4가',
    nameEn: 'Geumnamno 4(sa)-ga',
    line: '1호선',
    lineColor: LINE1_COLOR,
    lat: 35.14883,
    lng: 126.91414,
    district: '동구',
    address: '광주광역시 동구 금남로 163',
  },
  {
    stationId: 16,
    code: '105',
    name: '문화전당',
    nameEn: 'Culture Complex',
    line: '1호선',
    lineColor: LINE1_COLOR,
    lat: 35.14586,
    lng: 126.91997,
    district: '동구',
    address: '광주광역시 동구 금남로 110',
  },
  {
    stationId: 17,
    code: '104',
    name: '남광주',
    nameEn: 'Namgwangju',
    line: '1호선',
    lineColor: LINE1_COLOR,
    lat: 35.14114,
    lng: 126.91667,
    district: '동구',
    address: '광주광역시 동구 제봉로 87',
  },
  {
    stationId: 18,
    code: '103',
    name: '학동·증심사입구',
    nameEn: 'Hakdong·Jeungsimsa',
    line: '1호선',
    lineColor: LINE1_COLOR,
    lat: 35.13728,
    lng: 126.92197,
    district: '동구',
    address: '광주광역시 동구 남문로 678',
  },
  {
    stationId: 19,
    code: '102',
    name: '소태',
    nameEn: 'Sotae',
    line: '1호선',
    lineColor: LINE1_COLOR,
    lat: 35.13783,
    lng: 126.93169,
    district: '동구',
    address: '광주광역시 동구 남문로 805',
  },
  {
    stationId: 20,
    code: '101',
    name: '녹동',
    nameEn: 'Nokdong',
    line: '1호선',
    lineColor: LINE1_COLOR,
    lat: 35.13533,
    lng: 126.94025,
    district: '동구',
    address: '광주광역시 동구 녹동길 45',
  },
]

// ── 광주 1호선 운영 정보 ─────────────────────────────────
export const SUBWAY_INFO = {
  operator: '광주교통공사',
  operatorTel: '062-604-8000',
  line1: {
    color: LINE1_COLOR,
    name: '1호선',
    nameEn: 'Line 1',
    openYear: 2008,
    firstStation: '녹동',
    lastStation: '평동',
    totalStations: 20,
    operatingHours: '05:30 ~ 24:00',
    interval: '평일 5~10분, 주말 8~12분',
  },
  line2: {
    color: '#FFC107',
    name: '2호선',
    status: '2028년 1단계 개통 예정 (공사중)',
  },
}

// ── 헬퍼: 환승역 여부 ────────────────────────────────────
export function isTransferStation(station: SubwayStation): boolean {
  return !!station.transfer
}

// ── 헬퍼: 비동기 시그니처 통일용 ──────────────────────────
export async function fetchGwangjuSubwayStations(): Promise<SubwayStation[]> {
  return Promise.resolve(GWANGJU_SUBWAY_STATIONS)
}
