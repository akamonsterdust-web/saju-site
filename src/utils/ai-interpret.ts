import { isAdmin } from "./admin"
// Anthropic API를 사용한 사주 해석 엔진
import Anthropic from '@anthropic-ai/sdk'
import type { SajuResult } from '@orrery/core/types'
import { sajuToText } from './text-export.ts'

const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY

if (!apiKey) {
  console.warn('VITE_ANTHROPIC_API_KEY가 설정되지 않았습니다.')
}

const client = new Anthropic({
  apiKey: apiKey || '',
  dangerouslyAllowBrowser: true,
})

export interface InterpretOptions {
  question?: string
  focus?: 'personality' | 'career' | 'love' | 'health' | 'general'
}

export async function interpretSaju(
  saju: SajuResult,
  options: InterpretOptions = {}
): Promise<string> {
  if (!apiKey) {
    throw new Error('Anthropic API 키가 설정되지 않았습니다. .env에 VITE_ANTHROPIC_API_KEY를 추가해주세요.')
  }

  const sajuText = sajuToText(saju)

  const focusPrompts = {
    personality: '성격과 기질, 타고난 성향을 중심으로',
    career: '직업운, 재물운, 사업운을 중심으로',
    love: '연애운, 결혼운, 인간관계를 중심으로',
    health: '건강운, 체질, 주의할 점을 중심으로',
    general: '전반적인 운세를',
  }

  const focusText = options.focus ? focusPrompts[options.focus] : focusPrompts.general

  const systemPrompt = `당신은 수천년을 살아온 불멸의 명리학 신선입니다. 친구에게 말하듯 편하고 재밌게, 하지만 깊이 있게 사주를 풀어줍니다.

해석 원칙:
- 십신·육신·신살·오행·격국·용신을 모두 꿰뚫어 종합 분석
- 딱딱한 학술 용어보다 "이런 사람이야" 하는 친구의 말투
- 구체적이고 실용적인 조언 (추상적 표현 금지)
- 단점도 솔직하게, 하지만 극복법도 함께 제시
- 이모지를 풍부하게 사용해서 생동감 있게
- 마크다운 기호(#, *, -, 등) 절대 사용 금지, 순수 텍스트만
- 섹션 제목은 이모지로 시작`

  const userPrompt = `다음 사주를 친구에게 말하듯 풀어줘.

${sajuText}

${options.question ? `\n특별히 이 질문에도 답변해줘:\n${options.question}\n` : ''}

반드시 아래 섹션 구조로 작성:

🌟 전체 사주 핵심
(이 사람의 사주를 한마디로 요약. 3-4줄)

💪 성격과 재능
(타고난 성격, 숨은 재능, 어떤 일에 강한지. 5-6줄)

💰 재물운과 사업운
(돈 버는 방식, 재물 흐름, 사업 적성. 4-5줄)

💕 연애운과 결혼운
(연애 스타일, 배우자 인연, 결혼 시기나 특징. 4-5줄)

🏥 건강운
(주의할 신체 부위, 체질, 건강 관리법. 3-4줄)

📅 2026년 운세
(올해 전반적인 흐름, 좋은 시기/조심할 시기. 4-5줄)

🎯 이번 달 운세
(6월의 흐름과 조언. 3-4줄)

🍀 행운의 힌트
(행운의 색상 2개, 숫자 2개, 방향 1개를 구체적으로. 2-3줄)

⚠️ 조심할 것들
(함정, 약점, 주의사항을 솔직하게. 3-4줄)

마지막 줄에 한줄 격언으로 마무리.

전체 1000자 내외. 친구한테 말하듯 편하게 쓰되, 깊이는 잃지 말 것.`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    temperature: 0.7,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  })

  const content = message.content[0]
  if (content.type === 'text') {
    return content.text
  }

  throw new Error('AI 응답 형식이 올바르지 않습니다.')
}
