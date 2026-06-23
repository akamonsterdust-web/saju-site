import { useCallback, useRef, useState } from 'react'
import BirthForm from './BirthForm.tsx'
import type { BirthFormHandle, SavedFormState } from './BirthForm.tsx'
import ProfileModal from './ProfileModal.tsx'
import CopyButton from './CopyButton.tsx'
import { useLocale } from '../i18n/index.ts'
import SajuView from './saju/SajuView.tsx'
import ZiweiView from './ziwei/ZiweiView.tsx'
import NatalView from './natal/NatalView.tsx'
import { calculateSaju } from '@orrery/core/saju'
import { createChart } from '@orrery/core/ziwei'
import { calculateNatal } from '@orrery/core/natal'
import { sajuToText, ziweiToText, natalToText } from '../utils/text-export.ts'
import type { BirthInput } from '@orrery/core/types'
import { isAdmin, logoutAdmin } from '../utils/admin'

type Tab = 'saju' | 'ziwei' | 'natal'

function StarBackground() {
  return (
    <div style={{position:'fixed',top:0,left:0,width:'100%',height:'100%',zIndex:0,overflow:'hidden',pointerEvents:'none'}}>
      <div style={{position:'absolute',inset:0,background:'linear-gradient(160deg,#08001f 0%,#0d0a2e 40%,#0a0015 70%,#150020 100%)'}}/>
      <div style={{position:'absolute',inset:0,backgroundImage:`radial-gradient(1px 1px at 8% 12%,rgba(255,255,255,0.9) 0%,transparent 100%),radial-gradient(1.5px 1.5px at 22% 8%,rgba(255,255,255,0.7) 0%,transparent 100%),radial-gradient(1px 1px at 38% 20%,rgba(255,255,255,0.8) 0%,transparent 100%),radial-gradient(1px 1px at 52% 6%,rgba(255,255,255,0.6) 0%,transparent 100%),radial-gradient(1.5px 1.5px at 67% 18%,rgba(255,255,255,0.9) 0%,transparent 100%),radial-gradient(1px 1px at 78% 9%,rgba(255,255,255,0.7) 0%,transparent 100%),radial-gradient(1px 1px at 91% 22%,rgba(255,255,255,0.8) 0%,transparent 100%),radial-gradient(1px 1px at 14% 45%,rgba(255,255,255,0.5) 0%,transparent 100%),radial-gradient(1.5px 1.5px at 33% 52%,rgba(255,255,255,0.7) 0%,transparent 100%),radial-gradient(1px 1px at 48% 38%,rgba(255,255,255,0.6) 0%,transparent 100%),radial-gradient(1px 1px at 62% 48%,rgba(255,255,255,0.8) 0%,transparent 100%),radial-gradient(1px 1px at 82% 35%,rgba(255,255,255,0.5) 0%,transparent 100%),radial-gradient(1px 1px at 95% 42%,rgba(255,255,255,0.7) 0%,transparent 100%),radial-gradient(1.5px 1.5px at 7% 68%,rgba(255,255,255,0.6) 0%,transparent 100%),radial-gradient(1px 1px at 25% 75%,rgba(255,255,255,0.4) 0%,transparent 100%),radial-gradient(1px 1px at 44% 82%,rgba(255,255,255,0.7) 0%,transparent 100%),radial-gradient(1px 1px at 58% 65%,rgba(255,255,255,0.5) 0%,transparent 100%),radial-gradient(1.5px 1.5px at 73% 78%,rgba(255,255,255,0.8) 0%,transparent 100%),radial-gradient(1px 1px at 88% 72%,rgba(255,255,255,0.6) 0%,transparent 100%),radial-gradient(1px 1px at 18% 92%,rgba(255,255,255,0.5) 0%,transparent 100%),radial-gradient(1px 1px at 55% 95%,rgba(255,255,255,0.4) 0%,transparent 100%),radial-gradient(1.5px 1.5px at 85% 88%,rgba(255,255,255,0.7) 0%,transparent 100%)`}}/>
      <div style={{position:'absolute',top:'-30%',left:'-20%',width:'70%',height:'70%',background:'radial-gradient(ellipse,rgba(120,40,220,0.2) 0%,transparent 65%)',borderRadius:'50%'}}/>
      <div style={{position:'absolute',bottom:'-20%',right:'-15%',width:'60%',height:'60%',background:'radial-gradient(ellipse,rgba(40,60,220,0.15) 0%,transparent 65%)',borderRadius:'50%'}}/>
      <div style={{position:'absolute',top:'35%',right:'10%',width:'40%',height:'35%',background:'radial-gradient(ellipse,rgba(180,120,40,0.08) 0%,transparent 65%)',borderRadius:'50%'}}/>
    </div>
  )
}

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

  const card = {
    background:'rgba(12,8,35,0.8)',
    backdropFilter:'blur(24px)',
    WebkitBackdropFilter:'blur(24px)',
    borderRadius:'20px',
    border:'1px solid rgba(147,112,219,0.2)',
    boxShadow:'0 8px 32px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.05)',
  }

  return (
    <div style={{minHeight:'100vh',position:'relative',color:'#e8e0ff',fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'}}>
      <StarBackground />

      {isAdmin() && (
        <div style={{position:'fixed',top:16,right:16,zIndex:9999,background:'rgba(100,0,0,0.9)',color:'#fff',padding:'6px 14px',borderRadius:'20px',fontSize:'0.75rem',fontWeight:700,display:'flex',alignItems:'center',gap:'8px',backdropFilter:'blur(8px)'}}>
          🔑 관리자 모드
          <button onClick={()=>{logoutAdmin();window.location.reload()}} style={{background:'rgba(255,255,255,0.2)',border:'none',color:'#fff',borderRadius:'10px',padding:'2px 8px',cursor:'pointer',fontSize:'0.7rem'}}>로그아웃</button>
        </div>
      )}

      <main style={{maxWidth:'600px',margin:'0 auto',padding:'clamp(24px,5vw,48px) 16px 60px',position:'relative',zIndex:1}}>
        <div style={{textAlign:'center',marginBottom:'clamp(28px,6vw,48px)'}}>
          <div style={{fontSize:'0.68rem',letterSpacing:'0.35em',color:'rgba(200,170,255,0.45)',marginBottom:'16px',fontWeight:300}}>
            ✦ AI 명리학 서비스 ✦
          </div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',marginBottom:'14px'}}>
            <span style={{fontSize:'clamp(1.6rem,5vw,2.2rem)'}}>🔮</span>
            <h1 style={{fontSize:'clamp(2rem,8vw,3rem)',fontWeight:900,margin:0,background:'linear-gradient(135deg,#f0d0ff 0%,#c084fc 35%,#a855f7 65%,#fbbf24 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',letterSpacing:'-0.03em',lineHeight:1.1}}>곶휴노사주</h1>
            <span style={{fontSize:'clamp(1.6rem,5vw,2.2rem)'}}>🌙</span>
          </div>
          <p style={{color:'rgba(200,175,255,0.55)',fontSize:'clamp(0.72rem,2.5vw,0.82rem)',letterSpacing:'0.18em',fontWeight:300,margin:'0 0 6px'}}>사주팔자 · 자미두수 · 서양 점성술</p>
          <p style={{color:'rgba(200,175,255,0.35)',fontSize:'clamp(0.65rem,2vw,0.72rem)',margin:0}}>생년월일시로 당신의 운명을 읽다</p>
        </div>

        <div style={{...card,padding:'clamp(20px,5vw,28px)',marginBottom:'12px'}}>
          <BirthForm ref={birthFormRef} onSubmit={handleSubmit} externalState={externalFormState} onExternalStateConsumed={() => setExternalFormState(null)} />
        </div>

        <div style={{display:'flex',justifyContent:'flex-end',marginBottom:'clamp(16px,4vw,24px)'}}>
          <button type="button" onClick={() => setProfileModalOpen(true)} style={{display:'flex',alignItems:'center',gap:'4px',fontSize:'0.7rem',color:'rgba(167,139,250,0.35)',background:'none',border:'none',cursor:'pointer',padding:'4px'}}>
            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
            프로필 관리
          </button>
        </div>

        {birthInput && (
          <div ref={resultsRef} style={{...card,marginBottom:'16px',overflow:'hidden'}}>
            <div style={{display:'flex',alignItems:'center',borderBottom:'1px solid rgba(147,112,219,0.15)',padding:'0 12px',overflowX:'auto',scrollbarWidth:'none'}}>
              {(['saju','ziwei','natal'] as Tab[]).map((t2) => (
                <button key={t2} onClick={() => setTab(t2)} style={{padding:'clamp(10px,3vw,14px) clamp(10px,3vw,16px)',fontSize:'clamp(0.75rem,2.5vw,0.85rem)',fontWeight:600,border:'none',background:'none',cursor:'pointer',whiteSpace:'nowrap',borderBottom:tab===t2?'2px solid #c084fc':'2px solid transparent',color:tab===t2?'#e0b0ff':'rgba(167,139,250,0.3)',transition:'all 0.2s',flexShrink:0}}>
                  {t2==='saju'?'🀄 사주팔자':t2==='ziwei'?'⭐ 자미두수':'🌌 출생차트'}
                </button>
              ))}
              <div style={{marginLeft:'auto',paddingBottom:'2px',flexShrink:0}}>
                <CopyButton label={<>{t('app.copyAll')}<br/>{t('app.copyAllSub')}</>} getText={async () => {
                  const saju = calculateSaju(birthInput)
                  const parts = [sajuToText(saju)]
                  if (!birthInput.unknownTime) {
                    const chart = createChart(birthInput.year,birthInput.month,birthInput.day,birthInput.hour,birthInput.minute,birthInput.gender==='M',birthInput.timezone,birthInput.longitude)
                    parts.push(ziweiToText(chart))
                  }
                  const natal = await calculateNatal(birthInput)
                  parts.push(natalToText(natal))
                  return parts.join('\n\n')
                }} />
              </div>
            </div>
            <div style={{padding:'clamp(14px,4vw,20px)'}}>
              {tab==='saju' && <SajuView input={birthInput} />}
              {tab==='ziwei' && <ZiweiView input={birthInput} />}
              {tab==='natal' && <NatalView input={birthInput} />}
            </div>
          </div>
        )}

        <footer style={{textAlign:'center',padding:'28px 0 0',borderTop:'1px solid rgba(147,112,219,0.08)',marginTop:'8px'}}>
          <p style={{fontSize:'0.72rem',color:'rgba(200,175,255,0.3)',margin:'0 0 10px'}}>🔮 곶휴노사주 · AI 명리학 서비스</p>
          <p style={{fontSize:'0.62rem',color:'rgba(200,175,255,0.2)',margin:'0 0 14px',lineHeight:1.7}}>사주는 참고용이며, 모든 선택은 본인의 의지에 달려 있습니다</p>
          <div style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:'8px 16px',fontSize:'0.62rem',color:'rgba(200,175,255,0.2)',marginBottom:'10px'}}>
            <span>봉스랩(Bong's Lab)</span><span>사업자: 587-91-01974</span><span>대표: 최연봉</span><span>강원특별자치도 원주시 무실로 155</span>
          </div>
          <div style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:'8px 16px',fontSize:'0.65rem'}}>
            {[{label:'이용약관',href:'/terms'},{label:'개인정보처리방침',href:'/privacy'},{label:'환불정책',href:'/refund'},{label:'소스코드',href:'https://github.com/akamonsterdust-web/saju-site'}].map(({label,href})=>(
              <a key={label} href={href} style={{color:'rgba(167,139,250,0.35)',textDecoration:'none'}} onMouseEnter={e=>(e.currentTarget.style.color='rgba(167,139,250,0.7)')} onMouseLeave={e=>(e.currentTarget.style.color='rgba(167,139,250,0.35)')}>{label}</a>
            ))}
          </div>
        </footer>
      </main>

      <ProfileModal open={profileModalOpen} onClose={() => setProfileModalOpen(false)} getCurrentFormState={getCurrentFormState} onSelect={setExternalFormState} />
    </div>
  )
}
