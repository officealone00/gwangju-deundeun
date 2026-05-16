import { useState, useEffect, useRef } from 'react'
import { searchAddress, type AddressResult } from '../api/publicData'

interface Props {
  onSelect: (result: AddressResult) => void
}

interface ResultItemProps {
  result: AddressResult
  onClick: () => void
}

function ResultItem(props: ResultItemProps) {
  return (
    <div
      onClick={props.onClick}
      style={{
        padding: '12px 16px',
        borderBottom: '1px solid #f5f5f5',
        cursor: 'pointer',
      }}
    >
      <div style={{
        fontSize: 14,
        fontWeight: 700,
        color: '#333',
        marginBottom: 2,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {props.result.placeName}
      </div>
      <div style={{
        fontSize: 11,
        color: '#888',
        marginBottom: 2,
      }}>
        {props.result.category}
      </div>
      <div style={{
        fontSize: 11,
        color: '#666',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        📍 {props.result.addressName}
      </div>
    </div>
  )
}

export default function AddressSearch(props: Props) {
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<AddressResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const timerRef = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // ── 디바운스 검색 ────────────────────────────
  useEffect(function () {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
    }

    if (!keyword.trim()) {
      setResults([])
      setShowResults(false)
      setSearching(false)
      return
    }

    setSearching(true)
    timerRef.current = window.setTimeout(function () {
      searchAddress(keyword).then(function (list) {
        setResults(list)
        setShowResults(true)
        setSearching(false)
      })
    }, 350)

    return function () {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [keyword])

  // ── 외부 클릭 시 결과 닫기 ────────────────────
  useEffect(function () {
    function handleClickOutside(e: MouseEvent) {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return function () {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  function onChangeKeyword(e: React.ChangeEvent<HTMLInputElement>) {
    setKeyword(e.target.value)
  }

  function onSelectResult(result: AddressResult) {
    props.onSelect(result)
    setKeyword('')
    setResults([])
    setShowResults(false)
  }

  function onClearInput() {
    setKeyword('')
    setResults([])
    setShowResults(false)
  }

  function onFocusInput() {
    if (results.length > 0) {
      setShowResults(true)
    }
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 'calc(max(env(safe-area-inset-top), 10px) + 70px)',
        left: 12,
        right: 12,
        zIndex: 9,
        // ⭐ 다크모드 강제 무력화 (전체 컨테이너)
        colorScheme: 'light',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: '#ffffff',
        borderRadius: 14,
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        padding: '4px 6px 4px 14px',
        gap: 8,
        // ⭐ 다크모드 강제 무력화 (input wrapper)
        colorScheme: 'light',
      }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>🔍</span>
        <input
          type="text"
          value={keyword}
          onChange={onChangeKeyword}
          onFocus={onFocusInput}
          placeholder="광주 내 동·건물·시설 검색 (예: 봉선동)"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          style={{
            flex: 1,
            minWidth: 0,
            border: 'none',
            outline: 'none',
            padding: '12px 0',
            fontSize: 16, // ⭐ 16px 이상이어야 iOS 줌 방지
            // ⭐ 다크모드 강제 무력화 (라이트 모드 강제)
            colorScheme: 'light',
            // ⭐ 명시적 텍스트 색
            color: '#222222',
            WebkitTextFillColor: '#222222',    // iOS Safari 강제
            opacity: 1,                         // iOS 자동 투명도 방지
            background: 'transparent',
            backgroundColor: 'transparent',
            caretColor: '#FF8C42',
            fontFamily: 'inherit',
            fontWeight: 500,
          }}
        />
        {keyword && (
          <button
            onClick={onClearInput}
            aria-label="검색어 지우기"
            style={{
              flexShrink: 0,
              width: 28,
              height: 28,
              borderRadius: '50%',
              border: 'none',
              background: '#f0f0f0',
              color: '#999',
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* 검색 결과 드롭다운 */}
      {showResults && (
        <div style={{
          marginTop: 6,
          background: '#fff',
          borderRadius: 14,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          maxHeight: 320,
          overflowY: 'auto',
        }}>
          {searching && results.length === 0 && (
            <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 13, color: '#888' }}>
              ⏳ 검색 중...
            </div>
          )}
          {!searching && results.length === 0 && keyword.trim() && (
            <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 13, color: '#888' }}>
              검색 결과가 없어요
            </div>
          )}
          {results.map(function (result, idx) {
            function onItemClick() {
              onSelectResult(result)
            }
            return (
              <ResultItem
                key={result.placeName + '-' + result.lat + '-' + idx}
                result={result}
                onClick={onItemClick}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
