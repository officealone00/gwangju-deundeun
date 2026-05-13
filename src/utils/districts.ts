/**
 * 광주광역시 5개 자치구 정보
 * - 중심 좌표는 자치구청 기준
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
    lat: 35.1456,
    lng: 126.9237,
    population: 105000,
    area: 49.3,
    description: '구도심·충장로 상권',
  },
  {
    id: 'seogu',
    name: '서구',
    fullName: '광주광역시 서구',
    lat: 35.1517,
    lng: 126.8895,
    population: 296000,
    area: 47.8,
    description: '신도심·상무지구',
  },
  {
    id: 'namgu',
    name: '남구',
    fullName: '광주광역시 남구',
    lat: 35.1330,
    lng: 126.9019,
    population: 210000,
    area: 60.9,
    description: '봉선동·양림동',
  },
  {
    id: 'bukgu',
    name: '북구',
    fullName: '광주광역시 북구',
    lat: 35.1745,
    lng: 126.9120,
    population: 422000,
    area: 120.3,
    description: '전남대·용봉동',
  },
  {
    id: 'gwangsangu',
    name: '광산구',
    fullName: '광주광역시 광산구',
    lat: 35.1397,
    lng: 126.7937,
    population: 410000,
    area: 222.9,
    description: '첨단·하남지구',
  },
]
