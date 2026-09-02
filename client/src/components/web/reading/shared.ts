import type { EvaluationScores } from '../../../hooks/useReading'
import type { Translations } from '../../../i18n/translations'

export const CRITERIA: (keyof EvaluationScores)[] = ['understanding', 'mainIdea', 'unnecessaryDetailsRemoved', 'clarity', 'explainability']

export const WEAKNESS_OPTIONS = [
  'too_much_detail', 'missing_main_idea', 'missing_important_info', 'poor_structure',
  'too_vague', 'too_complicated', 'unclear_language', 'other',
] as const

export function criterionLabel(t: Translations, key: keyof EvaluationScores): string {
  const labels: Record<keyof EvaluationScores, string> = {
    understanding: t.readingCriterionUnderstanding,
    mainIdea: t.readingCriterionMainIdea,
    unnecessaryDetailsRemoved: t.readingCriterionDetails,
    clarity: t.readingCriterionClarity,
    explainability: t.readingCriterionExplainability,
  }
  return labels[key]
}

export function weaknessLabel(t: Translations, key: string | null): string {
  if (!key) return '—'
  const labels: Record<typeof WEAKNESS_OPTIONS[number], string> = {
    too_much_detail: t.readingWeaknessTooMuchDetail,
    missing_main_idea: t.readingWeaknessMissingMainIdea,
    missing_important_info: t.readingWeaknessMissingInfo,
    poor_structure: t.readingWeaknessPoorStructure,
    too_vague: t.readingWeaknessTooVague,
    too_complicated: t.readingWeaknessTooComplicated,
    unclear_language: t.readingWeaknessUnclearLanguage,
    other: t.readingWeaknessOther,
  }
  return labels[key as typeof WEAKNESS_OPTIONS[number]] ?? key
}

export type ScoreBand = 'needsImprovement' | 'developing' | 'good' | 'veryGood' | 'excellent'

export function scoreBand(total: number): ScoreBand {
  if (total <= 10) return 'needsImprovement'
  if (total <= 15) return 'developing'
  if (total <= 20) return 'good'
  if (total <= 23) return 'veryGood'
  return 'excellent'
}

export function scoreBandLabel(t: Translations, band: ScoreBand): string {
  const labels: Record<ScoreBand, string> = {
    needsImprovement: t.readingBandNeedsImprovement,
    developing: t.readingBandDeveloping,
    good: t.readingBandGood,
    veryGood: t.readingBandVeryGood,
    excellent: t.readingBandExcellent,
  }
  return labels[band]
}
