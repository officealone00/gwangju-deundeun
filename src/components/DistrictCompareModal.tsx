import type { DistrictScore } from '../utils/safetyScore'
import { getGradeColor, getGradeDescription } from '../utils/safetyScore'

interface Props {
  scores: DistrictScore[]
  onClose: () => void
  onDistrictClick: (lat: number, lng: number) => void
}

interface RowProps {
  rank: number
  ds: DistrictScore
  isMax: boolean
  isMin: boolean
  onClick: () => void
}

function DistrictRow(props: RowProps) {
  const ds = props.ds
  const score = ds.score
  const color = getGradeColor(score.grade)
  const widthPct = score.total + '%'

  let badge = null
  if (props.isMax) {
    badge = <span style={{ marginLeft: 6, padding: '2px 6px', background: '#43a047', color: '#fff', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>최고</span>
  } else if (props.isMin) {
    badge = <span style={{ marginLeft: 6, padding: '2px 6px', background: '#e53935', color: '#fff', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>인프라 보강 필요</span>
  }

  return (
    <div onClick={props.onClick} style={{ padding: '12px 0', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#f0f0f0', color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{props.rank}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#333' }}>{ds.district.name}</span>
            {badge}
          </div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{ds.district.description}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: color }}>{score.total}</span>
            <span style={{ fontSize: 12, color: '#888' }}>점</span>
          </div>
          <div style={{ fontSize: 10, color: color, fontWeight: 700 }}>{score.grade}등급 · {getGradeDescription(score.grade)}</div>
        </div>
      </div>
      <div style={{ height: 6, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: widthPct, height: '100%', background: color, transition: 'width 0.5s' }} />
      </div>
      <div style={{ fontSize: 10, color: '#999', marginTop: 4, display: 'flex', gap: 12 }}>
        <span>🏥 1km내 {score.emergencyCount1km}곳</span>
        <span>💊 500m내 {score.pharmacyCount500m}곳</span>
      </div>
    </div>
  )
}

export default function DistrictCompareModal(props: Props) {
  const scores = props.scores
  const maxScore = Math.max.apply(null, scores.map(function (s) { return s.score.total }))
  const minScore = Math.min.apply(null, scores.map(function (s) { return s.score.total }))
  
  // 정렬된 순위
  const sorted = [...scores].sort(function (a, b) { return b.score.total - a.score.total })
  const worstDistrict = sorted[sorted.length - 1]

  function handleBgClick() {
    props.onClose()
  }

  function handleContentClick(e: React.MouseEvent) {
    e.stopPropagation()
  }

  return (
    <div onClick={handleBgClick} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={handleContentClick} style={{ background: '#fff', borderRadius: 20, padding: 20, maxWidth: 440, width: '100%', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: '#888', fontWeight: 600 }}>광주든든 안심점수</div>
            <h2 style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 800, color: '#333' }}>광주 5개 자치구 비교</h2>
          </div>
          <button onClick={props.onClose} style={{ border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', color: '#999', padding: 0, lineHeight: 1, flexShrink: 0 }}>✕</button>
        </div>

        <div style={{ fontSize: 12, color: '#888', marginBottom: 16, lineHeight: 1.5 }}>
          광주광역시 공공데이터를 자치구별로 자동 분석한 결과입니다. 항목을 누르면 해당 자치구로 이동합니다.
        </div>

        <div>
          {sorted.map(function (ds, idx) {
            function onRowClick() {
              props.onDistrictClick(ds.district.lat, ds.district.lng)
              props.onClose()
            }
            return (
              <DistrictRow
                key={ds.district.id}
                rank={idx + 1}
                ds={ds}
                isMax={ds.score.total === maxScore}
                isMin={ds.score.total === minScore}
                onClick={onRowClick}
              />
            )
          })}
        </div>

        <div style={{ marginTop: 16, padding: 14, background: '#fff8f0', borderRadius: 12, fontSize: 12, color: '#7a4e1f', lineHeight: 1.6 }}>
          💡 <strong>광주광역시 정책 활용 제안</strong><br />
          가장 낮은 점수를 받은 <strong>{worstDistrict.district.name}</strong>({worstDistrict.score.total}점) 지역에 의료·복지 인프라 추가 투자가 필요합니다. 본 데이터는 광주광역시 보건정책과·사회복지정책과의 정책 수립 자료로 활용될 수 있습니다.
        </div>

        <div style={{ marginTop: 12, fontSize: 10, color: '#999', textAlign: 'center' }}>
          데이터 출처: 광주광역시 공공데이터 (응급의료기관·약국)
        </div>
      </div>
    </div>
  )
}
