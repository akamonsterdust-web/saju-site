import { useState, useMemo, useEffect, useImperativeHandle, forwardRef } from 'react'
import type { BirthInput, Gender, JasiMethod } from '@orrery/core/types'
import { isKoreanDaylightTime, isKoreanHistoricalTimeAnomaly } from '@orrery/core/natal'
import type { City } from '@orrery/core/cities'
import { SEOUL, formatCityName } from '@orrery/core/cities'
import CityCombobox from './CityCombobox.tsx'
import { useLocale } from '../i18n/index.ts'
import {
  getTimeZoneDisplayLabelAtLocalTime,
  inferTimeZoneFromCoordinates,
  isDaylightSavingInEffect,
  validateBirthLocalTime,
} from '../utils/timezones.ts'
import {
  formatCoordinate,
  isCoordinateDraft,
  parseCoordinateDraft,
  stepCoordinate,
} from '../utils/coordinate-input.ts'
import logo from '../assets/icon-512.png'

export interface BirthFormHandle {
  getCurrentState(): SavedFormState
}

interface Props {
  onSubmit: (input: BirthInput) => void
  externalState?: SavedFormState | null
  onExternalStateConsumed?: () => void
}

const STORAGE_KEY = 'orrery-birth-input'

export interface SavedFormState {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  gender: Gender
  unknownTime: boolean
  jasiMethod: JasiMethod
  city: City | null
  manualCoords: boolean
  latitude: number
  longitude: number
}

function loadSaved(): SavedFormState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SavedFormState
  } catch {
    return null
  }
}

const now = new Date()
const currentYear = now.getFullYear()
const saved = loadSaved()
const initialLatitude = saved?.latitude ?? SEOUL.lat
const initialLongitude = saved?.longitude ?? SEOUL.lon

const S = {
  field: {
    width:'100%', height:'40px', padding:'0 12px',
    background:'rgba(13,11,30,0.65)',
    border:'1px solid rgba(167,139,250,0.25)',
    borderRadius:'10px', color:'#e8e0ff', fontSize:'0.95rem',
    outline:'none', transition:'border-color 0.2s',
    appearance:'none' as const,
  } as React.CSSProperties,
  label: {
    display:'block', fontSize:'0.78rem', color:'rgba(167,139,250,0.55)',
    marginBottom:'6px', fontWeight:500,
  } as React.CSSProperties,
  seg: (active: boolean): React.CSSProperties => ({
    padding:'0 16px', height:'32px', borderRadius:'8px',
    border: active ? '1px solid rgba(167,139,250,0.4)' : 'none',
    background: active ? 'rgba(109,40,217,0.55)' : 'transparent',
    color: active ? '#f0ebff' : 'rgba(167,139,250,0.45)',
    fontWeight: active ? 600 : 400,
    cursor:'pointer', fontSize:'0.88rem', transition:'all 0.18s',
    boxShadow: active ? '0 2px 8px rgba(109,40,217,0.3)' : 'none',
  }),
  segWrap: {
    display:'inline-flex', alignItems:'center',
    background:'rgba(13,11,30,0.5)',
    border:'1px solid rgba(167,139,250,0.15)',
    borderRadius:'10px', padding:'3px', gap:'2px',
  } as React.CSSProperties,
}
const selectClass = ''
const inputClass = ''


const BirthForm = forwardRef<BirthFormHandle, Props>(function BirthForm({ onSubmit, externalState, onExternalStateConsumed }, ref) {
  const { t } = useLocale()
  const [year, setYear] = useState(saved?.year ?? currentYear - 20)
  const [month, setMonth] = useState(saved?.month ?? now.getMonth() + 1)
  const [day, setDay] = useState(saved?.day ?? now.getDate())
  const [hour, setHour] = useState(saved?.hour ?? now.getHours())
  const [minute, setMinute] = useState(saved?.minute ?? now.getMinutes())
  const [gender, setGender] = useState<Gender>(saved?.gender ?? 'M')
  const [unknownTime, setUnknownTime] = useState(saved?.unknownTime ?? false)
  const [jasiMethod, setJasiMethod] = useState<JasiMethod>(saved?.jasiMethod ?? 'unified')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [selectedCity, setSelectedCity] = useState<City | null>(saved?.city ?? SEOUL)
  const [manualCoords, setManualCoords] = useState(saved?.manualCoords ?? false)
  const [latitude, setLatitude] = useState(initialLatitude)
  const [longitude, setLongitude] = useState(initialLongitude)
  const [latitudeInput, setLatitudeInput] = useState(() => formatCoordinate(initialLatitude))
  const [longitudeInput, setLongitudeInput] = useState(() => formatCoordinate(initialLongitude))
  const [timezoneError, setTimezoneError] = useState<string | null>(null)

  const inferredTimezone = useMemo(
    () => inferTimeZoneFromCoordinates(latitude, longitude),
    [latitude, longitude],
  )
  const locationSummary = useMemo(() => {
    if (manualCoords) {
      return `${t('form.coordInput')} · ${t('form.latitude')} ${latitude.toFixed(4)} · ${t('form.longitude')} ${longitude.toFixed(4)}`
    }
    if (selectedCity) {
      return `${formatCityName(selectedCity)} · ${t('form.latitude')} ${latitude.toFixed(4)} · ${t('form.longitude')} ${longitude.toFixed(4)}`
    }
    return `${t('form.latitude')} ${latitude.toFixed(4)} · ${t('form.longitude')} ${longitude.toFixed(4)}`
  }, [manualCoords, selectedCity, latitude, longitude, t])
  const timezoneDisplayLabel = useMemo(() => {
    if (!inferredTimezone) return null
    return getTimeZoneDisplayLabelAtLocalTime(
      inferredTimezone,
      year,
      month,
      day,
      unknownTime ? 12 : hour,
      unknownTime ? 0 : minute,
    )
  }, [inferredTimezone, year, month, day, hour, minute, unknownTime])

  function getTimezoneValidationError(state: SavedFormState): string | null {
    const effectiveHour = state.unknownTime ? 12 : state.hour
    const effectiveMinute = state.unknownTime ? 0 : state.minute
    const result = validateBirthLocalTime(
      state.latitude, state.longitude,
      state.year, state.month, state.day,
      effectiveHour, effectiveMinute,
    )
    if (result.ok) return null
    if (result.reason === 'dst-gap') return t('form.dstGapError')
    return t('form.timezoneAutoDetectFailed')
  }

  function buildBirthInput(state: SavedFormState): BirthInput | null {
    const effectiveStateTimezone = inferTimeZoneFromCoordinates(state.latitude, state.longitude)
    if (getTimezoneValidationError(state)) return null
    if (!effectiveStateTimezone) return null
    return {
      year: state.year,
      month: state.month,
      day: state.day,
      hour: state.unknownTime ? 12 : state.hour,
      minute: state.unknownTime ? 0 : state.minute,
      gender: state.gender,
      unknownTime: state.unknownTime,
      ...(!state.unknownTime && { jasiMethod: state.jasiMethod }),
      latitude: state.latitude,
      longitude: state.longitude,
      timezone: effectiveStateTimezone,
    }
  }

  useImperativeHandle(ref, () => ({
    getCurrentState: (): SavedFormState => ({
      year, month, day, hour, minute, gender, unknownTime, jasiMethod,
      city: selectedCity, manualCoords, latitude, longitude,
    }),
  }))

  useEffect(() => {
    setTimezoneError(null)
  }, [latitude, longitude])

  function syncCoordinates(nextLatitude: number, nextLongitude: number) {
    setLatitude(nextLatitude)
    setLongitude(nextLongitude)
    setLatitudeInput(formatCoordinate(nextLatitude))
    setLongitudeInput(formatCoordinate(nextLongitude))
  }

  function applyLatitude(nextLatitude: number) {
    setLatitude(nextLatitude)
    setLatitudeInput(formatCoordinate(nextLatitude))
  }

  function applyLongitude(nextLongitude: number) {
    setLongitude(nextLongitude)
    setLongitudeInput(formatCoordinate(nextLongitude))
  }

  function handleCoordinateChange(
    value: string,
    setDraft: (value: string) => void,
    setValue: (value: number) => void,
  ) {
    if (!isCoordinateDraft(value)) return

    setDraft(value)

    const parsed = parseCoordinateDraft(value)
    if (parsed != null) setValue(parsed)
  }

  function handleCoordinateKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    draft: string,
    current: number,
    apply: (value: number) => void,
  ) {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return

    e.preventDefault()
    const baseValue = parseCoordinateDraft(draft) ?? current
    apply(stepCoordinate(baseValue, e.key === 'ArrowUp' ? 1 : -1))
  }

  useEffect(() => {
    if (!externalState) return
    const s = externalState
    setYear(s.year)
    setMonth(s.month)
    setDay(s.day)
    setHour(s.hour)
    setMinute(s.minute)
    setGender(s.gender)
    setUnknownTime(s.unknownTime)
    setJasiMethod(s.jasiMethod)
    setSelectedCity(s.city)
    setManualCoords(s.manualCoords)
    syncCoordinates(s.latitude, s.longitude)
    setTimezoneError(null)
    onExternalStateConsumed?.()
    const birthInput = buildBirthInput(s)
    if (birthInput) onSubmit(birthInput)
  }, [externalState]) // eslint-disable-line react-hooks/exhaustive-deps

  const isKDT = useMemo(
    () => inferredTimezone === 'Asia/Seoul' && isKoreanDaylightTime(year, month, day),
    [inferredTimezone, year, month, day],
  )
  const isKstHistoricalAnomaly = useMemo(
    () => inferredTimezone === 'Asia/Seoul' && isKoreanHistoricalTimeAnomaly(year, month, day),
    [inferredTimezone, year, month, day],
  )
  const isDstActive = useMemo(() => {
    if (!inferredTimezone) return false
    if (isKDT || isKstHistoricalAnomaly) return false
    return isDaylightSavingInEffect(
      inferredTimezone,
      year,
      month,
      day,
      unknownTime ? 12 : hour,
      unknownTime ? 0 : minute,
    )
  }, [inferredTimezone, isKDT, isKstHistoricalAnomaly, year, month, day, hour, minute, unknownTime])

  function handleCitySelect(city: City) {
    setSelectedCity(city)
    syncCoordinates(city.lat, city.lon)
    setTimezoneError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const resolvedLatitude = manualCoords ? parseCoordinateDraft(latitudeInput) : latitude
    const resolvedLongitude = manualCoords ? parseCoordinateDraft(longitudeInput) : longitude

    if (resolvedLatitude == null || resolvedLongitude == null) {
      setTimezoneError(t('form.coordinateInvalid'))
      return
    }

    if (manualCoords) syncCoordinates(resolvedLatitude, resolvedLongitude)

    const state: SavedFormState = {
      year, month, day, hour, minute, gender, unknownTime, jasiMethod,
      city: selectedCity, manualCoords, latitude: resolvedLatitude, longitude: resolvedLongitude,
    }
    const validationError = getTimezoneValidationError(state)
    if (validationError) {
      setTimezoneError(validationError)
      return
    }
    setTimezoneError(null)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { /* quota exceeded — ignore */ }
    const birthInput = buildBirthInput(state)
    if (!birthInput) return
    onSubmit(birthInput)
  }

  return (
    <form onSubmit={handleSubmit} style={{padding:0,margin:0,border:"none",background:"transparent"}}>
      <div style={{display:"flex",flexDirection:"column",gap:"20px"}}>
        <div style={{width:"100%"}}>
          {/* 생년월일 */}
          <fieldset style={{border:"none",padding:0,margin:0}}>
            <legend style={S.label}>{t('form.birthDate')}</legend>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px"}}>
              <select
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                style={S.field}
              >
                {Array.from({ length: currentYear - 1900 + 1 }, (_, i) => {
                  const y = currentYear - i
                  return <option key={y} value={y}>{`${y}${t('form.yearSuffix')}`}</option>
                })}
              </select>
              <select
                value={month}
                onChange={e => setMonth(Number(e.target.value))}
                style={S.field}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{`${i + 1}${t('form.monthSuffix')}`}</option>
                ))}
              </select>
              <select
                value={day}
                onChange={e => setDay(Number(e.target.value))}
                style={S.field}
              >
                {Array.from({ length: 31 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{`${i + 1}${t('form.daySuffix')}`}</option>
                ))}
              </select>
            </div>
          </fieldset>

          {isKDT && (
            <div style={{marginTop:"8px",padding:"8px 12px",background:"rgba(217,119,6,0.12)",border:"1px solid rgba(217,119,6,0.3)",borderRadius:"8px",fontSize:"0.82rem",color:"#fbbf24",lineHeight:1.6}}>{t('form.kdt')}</div>
          )}
          {!isKDT && isKstHistoricalAnomaly && (
            <div style={{marginTop:"8px",padding:"8px 12px",background:"rgba(217,119,6,0.12)",border:"1px solid rgba(217,119,6,0.3)",borderRadius:"8px",fontSize:"0.82rem",color:"#fbbf24",lineHeight:1.6}}>{t('form.kstHistoricalOffset')}</div>
          )}

          {/* 시간 + 성별 */}
          <fieldset style={{border:"none",padding:0,margin:"16px 0 0"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"8px"}}>
              <legend style={S.label}>{t('form.time')}</legend>
              <label style={{display:"flex",alignItems:"center",gap:"6px",cursor:"pointer"}}>
                <input
                  type="checkbox"
                  checked={unknownTime}
                  onChange={e => setUnknownTime(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-[18px] bg-gray-200 dark:bg-gray-700 rounded-full peer-checked:bg-gray-800 dark:peer-checked:bg-gray-200 relative transition-colors after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:w-3 after:h-3 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-3.5" />
                <span style={{fontSize:"0.82rem",color:"rgba(167,139,250,0.5)"}}>{t('form.unknown')}</span>
              </label>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:"8px",alignItems:"end"}}>
              <select
                value={hour}
                onChange={e => setHour(Number(e.target.value))}
                disabled={unknownTime}
                style={{...S.field,opacity:unknownTime?0.4:1}}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{`${String(i).padStart(2, '0')}${t('form.hourSuffix')}`}</option>
                ))}
              </select>
              <select
                value={minute}
                onChange={e => setMinute(Number(e.target.value))}
                disabled={unknownTime}
                style={{...S.field,opacity:unknownTime?0.4:1}}
              >
                {Array.from({ length: 60 }, (_, i) => (
                  <option key={i} value={i}>{`${String(i).padStart(2, '0')}${t('form.minuteSuffix')}`}</option>
                ))}
              </select>

              {/* 성별 — segmented control */}
              <div>
                <div style={S.segWrap}>
                  {(['M', 'F'] as const).map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      style={S.seg(gender===g)}
                    >
                      {g === 'M' ? t('form.male') : t('form.female')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </fieldset>

          {/* 위치 */}
          <fieldset style={{border:"none",padding:0,margin:"16px 0 0"}}>
            <legend style={S.label}>{t('form.birthPlace')}</legend>
            <div style={{...S.segWrap,marginBottom:"8px"}}>
              <button
                type="button"
                onClick={() => {
                  setManualCoords(false)
                  setTimezoneError(null)
                  if (selectedCity) {
                    syncCoordinates(selectedCity.lat, selectedCity.lon)
                  }
                }}
                style={S.seg(!manualCoords)}
              >
                {t('form.citySearch')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setManualCoords(true)
                  setTimezoneError(null)
                }}
                style={S.seg(manualCoords)}
              >
                {t('form.coordInput')}
              </button>
            </div>
            {manualCoords ? (
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
                <div>
                  <label style={S.label}>{t('form.latitude')}</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={latitudeInput}
                    onChange={e => handleCoordinateChange(e.target.value, setLatitudeInput, setLatitude)}
                    onBlur={() => setLatitudeInput(formatCoordinate(latitude))}
                    onKeyDown={e => handleCoordinateKeyDown(e, latitudeInput, latitude, applyLatitude)}
                    autoComplete="off"
                    spellCheck={false}
                    style={S.field}
                  />
                </div>
                <div>
                  <label style={S.label}>{t('form.longitude')}</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={longitudeInput}
                    onChange={e => handleCoordinateChange(e.target.value, setLongitudeInput, setLongitude)}
                    onBlur={() => setLongitudeInput(formatCoordinate(longitude))}
                    onKeyDown={e => handleCoordinateKeyDown(e, longitudeInput, longitude, applyLongitude)}
                    autoComplete="off"
                    spellCheck={false}
                    style={S.field}
                  />
                </div>
              </div>
            ) : (
              <>
                <CityCombobox selectedCity={selectedCity} onSelect={handleCitySelect} />
                <p style={{marginTop:"6px",fontSize:"0.78rem",color:"rgba(167,139,250,0.45)",lineHeight:1.6}}>{locationSummary}</p>
              </>
            )}
            {manualCoords && (
              <p className="mt-1.5 text-sm text-gray-400 dark:text-gray-500 leading-relaxed">
                {locationSummary}
              </p>
            )}
            {timezoneDisplayLabel && (
              <p className="mt-1.5 text-sm text-gray-400 dark:text-gray-500 leading-relaxed">
                {t('form.timezoneDefault')} {timezoneDisplayLabel}
                {isDstActive && (
                  <span style={{display:"block",fontSize:"0.72rem",marginTop:"2px"}}>
                    ↳ {t('form.dstActive')}
                  </span>
                )}
              </p>
            )}
            {timezoneError && (
              <div style={{marginTop:"8px",padding:"8px 12px",background:"rgba(220,38,38,0.12)",border:"1px solid rgba(220,38,38,0.3)",borderRadius:"8px",fontSize:"0.82rem",color:"#f87171",lineHeight:1.6}}>{timezoneError}</div>
            )}
          </fieldset>

          {/* 고급 설정 */}
          {!unknownTime && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowAdvanced(v => !v)}
                style={{display:"flex",alignItems:"center",gap:"4px",fontSize:"0.8rem",color:"rgba(167,139,250,0.4)",background:"none",border:"none",cursor:"pointer",padding:"2px 0"}}
              >
                <svg
                  style={{width:"12px",height:"12px",transform:showAdvanced?"rotate(90deg)":"none",transition:"transform 0.2s"}}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                {t('form.advanced')}
              </button>
              {showAdvanced && (
                <fieldset style={{border:"none",padding:0,margin:"8px 0 0"}}>
                  <legend style={S.label}>{t('form.jasiMethod')}</legend>
                  <div style={S.segWrap}>
                    {([
                      { value: 'unified' as const, label: t('form.unified') },
                      { value: 'split' as const, label: t('form.split') },
                    ]).map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setJasiMethod(opt.value)}
                        style={S.seg(jasiMethod===opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p style={{marginTop:"6px",fontSize:"0.78rem",color:"rgba(167,139,250,0.4)",lineHeight:1.6}}>{jasiMethod==='unified'?t('form.unifiedDesc'):t('form.splitDesc')}</p>
                </fieldset>
              )}
            </div>
          )}

          {/* 계산 버튼 */}
          <button
            type="submit"
            style={{marginTop:"20px",width:"100%",padding:"14px",background:"linear-gradient(135deg,#7c3aed 0%,#6d28d9 50%,#5b21b6 100%)",color:"#fff",borderRadius:"12px",fontSize:"1rem",fontWeight:700,border:"none",cursor:"pointer",letterSpacing:"0.06em",boxShadow:"0 4px 20px rgba(109,40,217,0.45)",transition:"all 0.2s"}}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow="0 6px 28px rgba(109,40,217,0.6)"}}
            onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 4px 20px rgba(109,40,217,0.45)"}}
          >
            {t('form.calculate')}
          </button>

          <p style={{marginTop:"12px",textAlign:"center",fontSize:"0.78rem",color:"rgba(167,139,250,0.38)",lineHeight:1.6}}>
            🔒 {t('form.privacy1')}<br />
            {t('form.privacy2')}
          </p>
        </div>
    </form>
  )
})

export default BirthForm
