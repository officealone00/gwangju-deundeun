import { useState, useRef } from 'react'
import {
  USER_PRESETS,
  type PresetId,
  saveCustomOrder,
} from '../utils/userPresets'

interface LayerConfig {
  id: string
  emoji: string
  label: string
  color: string
}

interface PresetModalProps {
  isOpen: boolean
  currentPresetId: PresetId | null
  layerConfigs: LayerConfig[]
  currentOrder: string[]
  onSelectPreset: (id: PresetId) => void
  onSaveCustomOrder: (order: string[]) => void
  onClose: () => void
  showCloseButton: boolean   // 첫 방문 시엔 닫기 X
}

export default function PresetModal(props: PresetModalProps) {
  const [mode, setMode] = useState<'preset' | 'custom'>('preset')
  const [customOrder, setCustomOrder] = useState<string[]>(props.currentOrder)
  const draggedIdRef = useRef<string | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)

  if (!props.isOpen) return null

  function handleSelectPreset(id: PresetId) {
    if (id === 'custom') {
      setMode('custom')
      return
    }
    props.onSelectPreset(id)
  }

  function handleCloseModal() {
    setMode('preset')
    props.onClose()
  }

  // ── 드래그 핸들러 (HTML5 Drag API) ─────────────────
  function onDragStart(id: string) {
    draggedIdRef.current = id
    setDraggedId(id)
  }

  function onDragOver(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    const draggedId = draggedIdRef.current
    if (!draggedId || draggedId === targetId) return

    setCustomOrder(function (prev) {
      const newOrder = prev.slice()
      const fromIdx = newOrder.indexOf(draggedId)
      const toIdx = newOrder.indexOf(targetId)
      if (fromIdx === -1 || toIdx === -1) return prev
      newOrder.splice(fromIdx, 1)
      newOrder.splice(toIdx, 0, draggedId)
      return newOrder
    })
  }

  function onDragEnd() {
    draggedIdRef.current = null
    setDraggedId(null)
  }

  // ── 모바일용 화살표 순서 변경 (드래그 어려운 어르신 친화) ──
  function moveUp(id: string) {
    setCustomOrder(function (prev) {
      const idx = prev.indexOf(id)
      if (idx <= 0) return prev
      const newOrder = prev.slice()
      ;[newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]]
      return newOrder
    })
  }

  function moveDown(id: string) {
    setCustomOrder(function (prev) {
      const idx = prev.indexOf(id)
      if (idx === -1 || idx >= prev.length - 1) return prev
      const newOrder = prev.slice()
      ;[newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]]
      return newOrder
    })
  }

  function applyCustomOrder() {
    saveCustomOrder(customOrder)
    props.onSaveCustomOrder(customOrder)
  }

  // ── 렌더링 ────────────────────────────────────────
  return (
    <div
      onClick={props.showCloseButton ? handleCloseModal : undefined}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        onClick={function (e) { e.stopPropagation() }}
        style={{
          background: '#fff',
          borderRadius: 20,
          maxWidth: 420,
          width: '100%',
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        {mode === 'preset' ? (
          renderPresetMode()
        ) : (
          renderCustomMode()
        )}
      </div>
    </div>
  )

  // ── 프리셋 선택 모드 ─────────────────────────────────
  function renderPresetMode() {
    return (
      <div>
        <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#FF8C42' }}>👋 광주든든을 어떻게 사용하세요?</h2>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: '#888' }}>선택에 따라 메뉴 순서가 바뀌어요</p>
          </div>
          {props.showCloseButton && (
            <button onClick={handleCloseModal} style={{ border: 'none', background: '#f0f0f0', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 16, color: '#999', flexShrink: 0 }}>✕</button>
          )}
        </div>

        <div style={{ padding: 12 }}>
          {USER_PRESETS.map(function (preset) {
            const isSelected = props.currentPresetId === preset.id
            return (
              <button
                key={preset.id}
                onClick={function () { handleSelectPreset(preset.id) }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  width: '100%',
                  padding: '14px 16px',
                  marginBottom: 8,
                  border: isSelected ? '2px solid #FF8C42' : '2px solid #f0f0f0',
                  borderRadius: 14,
                  background: isSelected ? '#FFF5EE' : '#fff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: 32, flexShrink: 0 }}>{preset.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#333' }}>{preset.label}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{preset.description}</div>
                </div>
                {isSelected && (
                  <div style={{ color: '#FF8C42', fontSize: 20, fontWeight: 800, flexShrink: 0 }}>✓</div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ── 커스텀 (드래그) 모드 ─────────────────────────────
  function renderCustomMode() {
    return (
      <div>
        <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <button onClick={function () { setMode('preset') }} style={{ border: 'none', background: '#f0f0f0', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#555' }}>← 뒤로</button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#FF8C42' }}>⚙️ 순서 직접 바꾸기</h2>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#888' }}>드래그하거나 화살표로 이동</p>
          </div>
          <button onClick={handleCloseModal} style={{ border: 'none', background: '#f0f0f0', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 16, color: '#999', flexShrink: 0 }}>✕</button>
        </div>

        <div style={{ padding: 12 }}>
          {customOrder.map(function (id, idx) {
            const config = props.layerConfigs.find(function (c) { return c.id === id })
            if (!config) return null
            const isDragging = draggedId === id
            const isFirst = idx === 0
            const isLast = idx === customOrder.length - 1

            return (
              <div
                key={id}
                draggable
                onDragStart={function () { onDragStart(id) }}
                onDragOver={function (e) { onDragOver(e, id) }}
                onDragEnd={onDragEnd}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  marginBottom: 6,
                  background: isDragging ? '#FFF5EE' : '#fff',
                  border: isDragging ? '2px dashed #FF8C42' : '1px solid #eee',
                  borderRadius: 12,
                  cursor: 'grab',
                  userSelect: 'none',
                  opacity: isDragging ? 0.5 : 1,
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: 18, color: '#bbb' }}>≡</div>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: config.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                  {config.emoji}
                </div>
                <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: '#333' }}>{config.label}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <button
                    onClick={function () { moveUp(id) }}
                    disabled={isFirst}
                    style={{ border: 'none', background: isFirst ? '#f5f5f5' : '#FF8C42', color: '#fff', width: 28, height: 22, borderRadius: 6, cursor: isFirst ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 700, opacity: isFirst ? 0.4 : 1 }}
                  >↑</button>
                  <button
                    onClick={function () { moveDown(id) }}
                    disabled={isLast}
                    style={{ border: 'none', background: isLast ? '#f5f5f5' : '#FF8C42', color: '#fff', width: 28, height: 22, borderRadius: 6, cursor: isLast ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 700, opacity: isLast ? 0.4 : 1 }}
                  >↓</button>
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ padding: 12, borderTop: '1px solid #f0f0f0', display: 'flex', gap: 8 }}>
          <button onClick={function () { setMode('preset') }} style={{ flex: 1, padding: '12px 0', border: '1px solid #ddd', borderRadius: 10, background: '#fff', color: '#555', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button>
          <button onClick={applyCustomOrder} style={{ flex: 2, padding: '12px 0', border: 'none', borderRadius: 10, background: '#FF8C42', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>이 순서로 저장</button>
        </div>
      </div>
    )
  }
}
