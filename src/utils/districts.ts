/**
 * 광주광역시 5개 자치구 정보
 * - 좌표는 자치구청이 아닌 인구·의료 인프라 중심 동네로 설정
 *   (자치구청 좌표는 행정 중심이라 실제 생활권과 어긋남)
 * - 인구는 2024년 광주시 기준
 */

export interface District {
  id: string
  name: string         // 표시용 이름
  fullName: string     // 전체 이름
  lat: number
  lng: number
  population: number   // 인구 수
  area: number         // 면적 (km²)
  description: string  // 특징
}

export const GWANGJU_DISTRICTS: District[] = [
  {
    id: 'donggu',
    name: '동구',
    fullName: '광주광역시 동구',
    lat: 35.1469,
    lng: 126.9220,
    population: 105000,
    area: 49.3,
    description: '구도심·충장로·전남대병원',
  },
  {
    id: 'seogu',
    name: '서구',
    fullName: '광주광역시 서구',
    lat: 35.1518,
    lng: 126.8528,
    population: 296000,
    area: 47.8,
    description: '상무지구 신도심·KS병원',
  },
  {
    id: 'namgu',
    name: '남구',
    fullName: '광주광역시 남구',
    lat: 35.1305,
    lng: 126.9089,
    population: 210000,
    area: 60.9,
    description: '봉선동·기독병원·미래로21병원',
  },
  {
    id: 'bukgu',
    name: '북구',
    fullName: '광주광역시 북구',
    lat: 35.1816,
    lng: 126.9047,
    population: 422000,
    area: 120.3,
    description: '용봉동·운암동·운암한국병원',
  },
  {
    id: 'gwangsangu',
    name: '광산구',
    fullName: '광주광역시 광산구',
    lat: 35.1929,
    lng: 126.8400,
    population: 410000,
    area: 222.9,
    description: '첨단지구·송정·광주씨티병원',
  },
]