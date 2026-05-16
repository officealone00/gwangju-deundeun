// ============================================================
// 광주든든 사용자 프리셋
//
// 3가지 사용자 유형 + 커스텀 순서
// localStorage에 저장하여 다음 접속 시 유지
// ============================================================

export type PresetId = 'visitor' | 'resident' | 'senior' | 'custom'

export interface UserPreset {
  id: PresetId
  emoji: string
  label: string
  description: string
  layerOrder: string[]   // 토글 ID 순서 (위→아래)
}

// ── 3가지 프리셋 + 커스텀 (어르신 우선 - 광주든든 컨셉) ──
export const USER_PRESETS: UserPreset[] = [
  {
    id: 'senior',
    emoji: '👵',
    label: '어르신·1인가구',
    description: '안전·복지가 우선이에요',
    layerOrder: ['emergency', 'pharmacy', 'busStop', 'tourism', 'food', 'shopping', 'landmark'],
  },
  {
    id: 'resident',
    emoji: '🏠',
    label: '광주 거주민',
    description: '교통·맛집이 우선이에요',
    layerOrder: ['busStop', 'food', 'shopping', 'tourism', 'landmark', 'emergency', 'pharmacy'],
  },
  {
    id: 'visitor',
    emoji: '🧳',
    label: '광주 방문객',
    description: '명소·관광이 우선이에요',
    layerOrder: ['landmark', 'busStop', 'tourism', 'food', 'shopping', 'emergency', 'pharmacy'],
  },
  {
    id: 'custom',
    emoji: '⚙️',
    label: '직접 설정',
    description: '내 순서대로 사용해요',
    layerOrder: ['emergency', 'pharmacy', 'busStop', 'tourism', 'food', 'shopping', 'landmark'],
  },
]

// ── localStorage 키 ────────────────────────────────────
const STORAGE_KEY_PRESET = 'gwangju-deundeun:preset-id'
const STORAGE_KEY_CUSTOM_ORDER = 'gwangju-deundeun:custom-order'
const STORAGE_KEY_VISITED = 'gwangju-deundeun:visited'

// ── 저장된 프리셋 불러오기 ──────────────────────────────
export function loadPresetId(): PresetId | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PRESET)
    if (saved === 'visitor' || saved === 'resident' || saved === 'senior' || saved === 'custom') {
      return saved
    }
  } catch (e) {
    // localStorage 접근 실패 (시크릿 모드 등)
  }
  return null
}

// ── 프리셋 저장 ─────────────────────────────────────────
export function savePresetId(id: PresetId): void {
  try {
    localStorage.setItem(STORAGE_KEY_PRESET, id)
  } catch (e) {
    // ignore
  }
}

// ── 커스텀 순서 불러오기 ─────────────────────────────────
export function loadCustomOrder(): string[] | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_ORDER)
    if (!saved) return null
    const parsed = JSON.parse(saved)
    if (Array.isArray(parsed) && parsed.every(x => typeof x === 'string')) {
      return parsed
    }
  } catch (e) {
    // ignore
  }
  return null
}

// ── 커스텀 순서 저장 ─────────────────────────────────────
export function saveCustomOrder(order: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_ORDER, JSON.stringify(order))
  } catch (e) {
    // ignore
  }
}

// ── 방문 기록 (첫 방문자 환영 모달용) ────────────────────
export function hasVisitedBefore(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_VISITED) === '1'
  } catch (e) {
    return true
  }
}

export function markVisited(): void {
  try {
    localStorage.setItem(STORAGE_KEY_VISITED, '1')
  } catch (e) {
    // ignore
  }
}

// ── 프리셋 ID로 순서 반환 ────────────────────────────────
export function getLayerOrderForPreset(presetId: PresetId): string[] {
  if (presetId === 'custom') {
    const custom = loadCustomOrder()
    if (custom) return custom
  }
  const preset = USER_PRESETS.find(p => p.id === presetId)
  return preset ? preset.layerOrder : USER_PRESETS[0].layerOrder
}
