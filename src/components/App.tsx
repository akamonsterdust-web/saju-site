import { useCallback, useRef, useState } from 'react'
import BirthForm from './BirthForm.tsx'
import type { BirthFormHandle, SavedFormState } from './BirthForm.tsx'
import ProfileModal from './ProfileModal.tsx'
import Guide from './Guide.tsx'
import CopyButton from './CopyButton.tsx'
import ThemeToggle from './ThemeToggle.tsx'
import LanguageToggle from './LanguageToggle.tsx'
import { useLocale } from '../i18n/index.ts'
import SajuView from './saju/SajuView.tsx'
import ZiweiView from './ziwei/ZiweiView.tsx'
import NatalView from './natal/NatalView.tsx'
import { calculateSaju } from '@orrery/core/saju'
import { createChart } from '@orrery/core/ziwei'
import { calculateNatal } from '@orrery/core/natal'
import { sajuToText, ziweiToText, natalToText } from '../utils/text-export.ts'
import type { BirthInput } from '@orrery/core/types'

type Tab = 'saju' | 'ziwei' | 'natal'

export default function App() {
  const { t } = useLocale()
  const [tab, setTab] = useState<Tab>('saju')
  const [birthInput, setBirthInput] = useState<BirthInput | null>(null)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [externalFormState, setExternalFormState] = useState<SavedFormState | null>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const birthFormRef = useRef<BirthFormHandle>(null)

  function handleSubmit(input: BirthInput) {
    setBirthInput(input)
    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth' })
    })
  }

  const getCurrentFormState = useCallback(() => {
    return birthFormRef.current?.getCurrentState() ?? null
  }, [])

  return (
    <div className="min-h-screen relative" style={{position:"relative",zIndex:1}}>
      <ThemeToggle />
      <LanguageToggle />
      <main className="max-w-2xl mx-auto px-4 py-8 relative" style={{zIndex:1}}>

        <div className="text-center mb-8">
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"10px",marginBottom:"8px"}}>
            <span style={{fontSize:"2.2rem"}}>🔮</span>
            <h1 style={{
              fontSize:"2.4rem",fontWeight:800,margin:0,
              color:"#a8556b",
              letterSpacing:"-0.02em"
            }}>곶휴노사주</h1>
            <span style={{fontSize:"2.2rem"}}>🌙</span>
          </div>
          <p style={{color:"#6b6b6b",fontSize:"0.82rem",letterSpacing:"0.15em",fontWeight:300,margin:"4px 0"}}>
            사주팔자 · 자미두수 · 서양 점성술
          </p>
          <p style={{color:"#888888",fontSize:"0.72rem",margin:"4px 0 0"}}>
            AI 명리학 · 생년월일시로 당신의 운명을 읽다
          </p>
        </div>

        <div style={{
          background:"rgba(20,14,50,0.85)",backdropFilter:"blur(20px)",
          borderRadius:"16px",border:"1px solid rgba(167,139,250,0.2)",
          padding:"24px",marginBottom:"12px"
        }}>
          <BirthForm
            ref={birthFormRef}
            onSubmit={handleSubmit}
            externalState={externalFormState}
            onExternalStateConsumed={() => setExternalFormState(null)}
          />
        </div>

        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:"16px"}}>
          <button type="button" onClick={() => setProfileModalOpen(true)} style={{
            display:"flex",alignItems:"center",gap:"4px",
            fontSize:"0.72rem",color:"rgba(167,139,250,0.45)",
            background:"none",border:"none",cursor:"pointer"
          }}>
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            프로필 관리
          </button>
        </div>

        {birthInput && (
          <div ref={resultsRef} style={{
            background:"rgba(20,14,50,0.85)",backdropFilter:"blur(20px)",
            borderRadius:"16px",border:"1px solid rgba(167,139,250,0.2)",
            marginBottom:"16px",overflow:"hidden"
          }}>
            <div style={{
              display:"flex",alignItems:"center",
              borderBottom:"1px solid rgba(167,139,250,0.2)",padding:"0 16px"
            }}>
              {(["saju","ziwei","natal"] as Tab[]).map((t2) => (
                <button key={t2} onClick={() => setTab(t2)} style={{
                  padding:"12px 14px",fontSize:"0.85rem",fontWeight:500,
                  border:"none",background:"none",cursor:"pointer",whiteSpace:"nowrap",
                  borderBottom:tab===t2?"2px solid #a78bfa":"2px solid transparent",
                  color:tab===t2?"#c4b5fd":"rgba(167,139,250,0.4)",transition:"all 0.2s"
                }}>
                  {t2==="saju"?"🀄 사주팔자":t2==="ziwei"?"⭐ 자미두수":"🌌 출생차트"}
                </button>
              ))}
              <div style={{marginLeft:"auto",paddingBottom:"4px"}}>
                <CopyButton
                  label={<>{t("app.copyAll")}<br />{t("app.copyAllSub")}</>}
                  getText={async () => {
                    const saju = calculateSaju(birthInput)
                    const parts = [sajuToText(saju)]
                    if (!birthInput.unknownTime) {
                      const chart = createChart(
                        birthInput.year,birthInput.month,birthInput.day,
                        birthInput.hour,birthInput.minute,
                        birthInput.gender==="M",
                        birthInput.timezone,birthInput.longitude,
                      )
                      parts.push(ziweiToText(chart))
                    }
                    const natal = await calculateNatal(birthInput)
                    parts.push(natalToText(natal))
                    return parts.join("\n\n")
                  }}
                />
              </div>
            </div>
            <div style={{padding:"16px"}}>
              {tab==="saju" && <SajuView input={birthInput} />}
              {tab==="ziwei" && <ZiweiView input={birthInput} />}
              {tab==="natal" && <NatalView input={birthInput} />}
            </div>
          </div>
        )}

        <Guide />
      </main>

      <footer style={{
        textAlign:"center",fontSize:"0.72rem",
        color:"rgba(167,139,250,0.35)",padding:"24px 0",position:"relative",zIndex:1
      }}>
        <p style={{margin:"0 0 4px"}}>🔮 곶휴노사주 · AI 명리학 서비스</p>
        <p style={{margin:0}}>사주는 참고용이며, 모든 선택은 본인의 의지에 달려 있습니다 ✨</p>
      </footer>

      <ProfileModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        getCurrentFormState={getCurrentFormState}
        onSelect={setExternalFormState}
      />
    </div>
  )
}
