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
    <div onClick={props.onClick} style={{ padding: '12px 16px', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{props.result.placeName}</div>
      <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>{props.result.category}</div>
      <div style={{ fontSize: 11, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📍 {props.result.addressName}</div>
    </div>
  )
}

export default function AddressSearch(props: Props) {
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<AddressResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const timerRef = useRef<number | null>(null)

  useEffect(function () {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
    }

    if (!keyword.trim()) {
      setResults([])
      setShowResults(false)
      return
    }

    // 디바운스: 입력 멈추고 300ms 후에 검색
    timerRef.current = window.setTimeout(async function () {
      setSearching(true)
      const data = await searchAddress(keyword)
      setResults(data)
      setSearching(false)
      setShowResults(true)
    }, 300)

    return function () {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [keyword])

  function onChangeInput(e: React.ChangeEvent<HTMLInputElement>) {
    setKeyword(e.target.value)
  }

  function onSelectResult(result: AddressResult) {
    props.onSelect(result)
    setShowResults(false)
    setKeyword(result.placeName)
  }

  function onFocusInput() {
    if (results.length > 0) setShowResults(true)
  }

  function onClearInput() {
    setKeyword('')
    setResults([])
    setShowResults(false)
  }

  function onBlurInput() {
    // 클릭 처리되도록 약간 지연
    window.setTimeout(function () {
      setShowResults(false)
    }, 200)
  }

  return (
    <div style={{ position: 'absolute', top: 'max(env(safe-area-inset-top), 76px)', left: 16, right: 16, zIndex: 15 }}>
      <div style={{ position: 'relative', background: '#fff', borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', padding: '0 12px' }}>
        <span style={{ fontSize: 16, color: '#999', marginRight: 8 }}>🔍</span>
        <input
          type="text"
          value={keyword}
          onChange={onChangeInput}
          onFocus={onFocusInput}
          onBlur={onBlurInput}
          placeholder="광주 내 동·건물·시설 검색 (예: 봉선동)"
          style={{ flex: 1, padding: '12px 0', border: 'none', outline: 'none', fontSize: 14, background: 'transparent', minWidth: 0 }}
        />
        {keyword && (
          <button onClick={onClearInput} style={{ border: 'none', background: 'none', color: '#999', fontSize: 18, cursor: 'pointer', padding: '4px 8px', flexShrink: 0 }}>✕</button>
        )}
      </div>

      {showResults && (
        <div style={{ marginTop: 6, background: '#fff', borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', maxHeight: '50vh', overflowY: 'auto' }}>
          {searching && (
            <div style={{ padding: 16, textAlign: 'center', color: '#999', fontSize: 13 }}>검색 중...</div>
          )}
          {!searching && results.length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', color: '#999', fontSize: 13 }}>검색 결과가 없어요</div>
          )}
          {!searching && results.map(function (result, idx) {
            function onClickRow() {
              onSelectResult(result)
            }
            return <ResultItem key={idx} result={result} onClick={onClickRow} />
          })}
        </div>
      )}
    </div>
  )
}
