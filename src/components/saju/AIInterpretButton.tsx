// AI 사주 해석 버튼 및 결과 표시 컴포넌트
import { useState } from 'react'
import type { SajuResult } from '@orrery/core/types'
import { interpretSaju, type InterpretOptions } from '../../utils/ai-interpret.ts'
import { useLocale } from '../../i18n/index.ts'

interface Props {
  saju: SajuResult
}

export default function AIInterpretButton({ saju }: Props) {
  const { t } = useLocale()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [focus, setFocus] = useState<InterpretOptions['focus']>('general')
  const [question, setQuestion] = useState('')
  const [showOptions, setShowOptions] = useState(false)

  async function handleInterpret() {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const interpretation = await interpretSaju(saju, {
        focus,
        question: question.trim() || undefined,
      })
      setResult(interpretation)
      setShowOptions(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      backgroundColor: '#ffffff',
      border: '1px solid #e6e3dd',
      boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
      borderRadius: '12px',
      padding: '20px',
      marginTop: '16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ fontSize: '1.2rem' }}>🤖</span>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#2b2b2b', margin: 0 }}>
          AI 사주 해석
        </h3>
      </div>

      {!showOptions && !result && (
        <button
          onClick={() => setShowOptions(true)}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#a8556b',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!loading) e.currentTarget.style.backgroundColor = '#8f4658'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#a8556b'
          }}
        >
          {loading ? '해석 중...' : 'AI로 사주 해석 받기'}
        </button>
      )}

      {showOptions && !result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '0.875rem', color: '#6b6b6b', marginBottom: '6px', display: 'block' }}>
              해석 초점
            </label>
            <select
              value={focus}
              onChange={(e) => setFocus(e.target.value as InterpretOptions['focus'])}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#ffffff',
                border: '1px solid #e6e3dd',
                borderRadius: '8px',
                fontSize: '0.9rem',
                color: '#2b2b2b',
              }}
            >
              <option value="general">전반적인 운세</option>
              <option value="personality">성격과 기질</option>
              <option value="career">직업운/재물운</option>
              <option value="love">연애운/결혼운</option>
              <option value="health">건강운</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.875rem', color: '#6b6b6b', marginBottom: '6px', display: 'block' }}>
              구체적인 질문 (선택)
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="예: 올해 이직을 고민 중인데 어떤가요?"
              rows={3}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#ffffff',
                border: '1px solid #e6e3dd',
                borderRadius: '8px',
                fontSize: '0.9rem',
                color: '#2b2b2b',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleInterpret}
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#a8556b',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = '#8f4658'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#a8556b'
              }}
            >
              {loading ? '해석 중...' : '해석 시작'}
            </button>
            <button
              onClick={() => setShowOptions(false)}
              disabled={loading}
              style={{
                padding: '12px 20px',
                backgroundColor: '#f8f6f3',
                color: '#6b6b6b',
                border: '1px solid #e6e3dd',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              취소
            </button>
          </div>
        </div>
      )}

      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#fef2f4',
          border: '1px solid #f7d5dd',
          borderRadius: '8px',
          color: '#a8556b',
          fontSize: '0.875rem',
        }}>
          ⚠️ {error}
        </div>
      )}

      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{
            padding: '16px',
            backgroundColor: '#fdf8f3',
            border: '1px solid #e8e0d5',
            borderRadius: '8px',
            color: '#444444',
            fontSize: '0.9rem',
            lineHeight: '1.7',
          }}>
            {result.split('\n').map((line, i) => (
              <span key={i}>
                {line}
                {i < result.split('\n').length - 1 && <br />}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                setResult(null)
                setShowOptions(true)
              }}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: '#a8556b',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              다시 해석하기
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(result)
                alert('해석 결과가 클립보드에 복사되었습니다.')
              }}
              style={{
                padding: '10px 16px',
                backgroundColor: '#f8f6f3',
                color: '#6b6b6b',
                border: '1px solid #e6e3dd',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              복사
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
