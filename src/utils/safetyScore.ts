import { getDistance } from './geo'
import type { EmergencyRoom, Pharmacy } from '../api/publicData'

export interface SafetyScore {
  total: number              // 0~100
  grade: 'S' | 'A' | 'B' | 'C' | 'D'
  emergency: number          // 응급실 접근성 (0~40)
  pharmacy: number           // 약국 접근성 (0~30)
  distance: number           // 거리 가중치 (0~30)
  nearestEmergencyDist: number    // 가장 가까운 응급실 거리(m)
  nearestPharmacyDist: number     // 가장 가까운 약국 거리(m)
  emergencyCount1km: number  // 1km 내 응급실 수
  pharmacyCount500m: number  // 500m 내 약국 수
}

/**
 * 위치 기반 안심점수 산출
 * 
 * 모델:
 * - 응급실 점수 (40점): 1km 내 응급실 갯수
 *   0개=0, 1개=20, 2개=30, 3개 이상=40
 * - 약국 점수 (30점): 500m 내 약국 갯수
 *   0개=0, 1~2개=10, 3~5개=20, 6개 이상=30
 * - 거리 점수 (30점): 가장 가까운 응급실까지 거리
 *   ≤500m=30, ≤1km=25, ≤2km=20, ≤3km=15, ≤5km=10, >5km=5
 */
export function calculateSafetyScore(
  userLat: number,
  userLng: number,
  emergencyRooms: EmergencyRoom[],
  pharmacies: Pharmacy[]
): SafetyScore {
  // 모든 응급실까지의 거리 계산
  const emergencyDistances = emergencyRooms.map(function (e) {
    return getDistance(userLat, userLng, e.wgs84Lat, e.wgs84Lon)
  })
  
  // 모든 약국까지의 거리 계산
  const pharmacyDistances = pharmacies.map(function (p) {
    return getDistance(userLat, userLng, p.wgs84Lat, p.wgs84Lon)
  })

  const nearestEmergencyDist = emergencyDistances.length > 0
    ? Math.min.apply(null, emergencyDistances)
    : Infinity
  
  const nearestPharmacyDist = pharmacyDistances.length > 0
    ? Math.min.apply(null, pharmacyDistances)
    : Infinity

  // 1km 내 응급실 수
  const emergencyCount1km = emergencyDistances.filter(function (d) { return d <= 1000 }).length
  
  // 500m 내 약국 수
  const pharmacyCount500m = pharmacyDistances.filter(function (d) { return d <= 500 }).length

  // 응급실 점수 (0~40)
  let emergency = 0
  if (emergencyCount1km >= 3) emergency = 40
  else if (emergencyCount1km === 2) emergency = 30
  else if (emergencyCount1km === 1) emergency = 20
  else emergency = 0

  // 약국 점수 (0~30)
  let pharmacy = 0
  if (pharmacyCount500m >= 6) pharmacy = 30
  else if (pharmacyCount500m >= 3) pharmacy = 20
  else if (pharmacyCount500m >= 1) pharmacy = 10
  else pharmacy = 0

  // 거리 점수 (0~30, 가장 가까운 응급실 기준)
  let distance = 5
  if (nearestEmergencyDist <= 500) distance = 30
  else if (nearestEmergencyDist <= 1000) distance = 25
  else if (nearestEmergencyDist <= 2000) distance = 20
  else if (nearestEmergencyDist <= 3000) distance = 15
  else if (nearestEmergencyDist <= 5000) distance = 10

  const total = emergency + pharmacy + distance

  // 등급
  let grade: SafetyScore['grade'] = 'D'
  if (total >= 90) grade = 'S'
  else if (total >= 75) grade = 'A'
  else if (total >= 60) grade = 'B'
  else if (total >= 40) grade = 'C'

  return {
    total: total,
    grade: grade,
    emergency: emergency,
    pharmacy: pharmacy,
    distance: distance,
    nearestEmergencyDist: nearestEmergencyDist === Infinity ? 0 : nearestEmergencyDist,
    nearestPharmacyDist: nearestPharmacyDist === Infinity ? 0 : nearestPharmacyDist,
    emergencyCount1km: emergencyCount1km,
    pharmacyCount500m: pharmacyCount500m,
  }
}

/**
 * 등급별 색상
 */
export function getGradeColor(grade: SafetyScore['grade']): string {
  const colors = {
    S: '#1e88e5',  // 파랑
    A: '#43a047',  // 초록
    B: '#fb8c00',  // 주황
    C: '#fdd835',  // 노랑
    D: '#e53935',  // 빨강
  }
  return colors[grade]
}

/**
 * 등급별 한 줄 설명
 */
export function getGradeDescription(grade: SafetyScore['grade']): string {
  const descs = {
    S: '매우 안심',
    A: '안심',
    B: '보통',
    C: '주의',
    D: '취약',
  }
  return descs[grade]
}