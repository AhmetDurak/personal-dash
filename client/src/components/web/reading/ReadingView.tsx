import { Routes, Route, Link, useParams } from 'react-router-dom'
import { useReadingSession } from '../../../hooks/useReading'
import { useLanguage } from '../../../hooks/useLanguage'
import { ReadingListView } from './ReadingListView'
import { NewSessionForm } from './NewSessionForm'
import { ProgressView } from './ProgressView'
import { StageProgress } from './StageProgress'
import { ReadingStage } from './ReadingStage'
import { SummaryStage } from './SummaryStage'
import { EvaluationStage } from './EvaluationStage'
import { ImproveStage } from './ImproveStage'
import { ReflectStage } from './ReflectStage'
import { SessionResult } from './SessionResult'

function SessionWizard() {
  const { t } = useLanguage()
  const { id } = useParams<{ id: string }>()
  const sessionId = id ? Number(id) : null
  const {
    session, goToRecall, saveSummaryDraft, advanceStage,
    submitEvaluation, saveImprovedDraft, submitReflection,
  } = useReadingSession(sessionId)

  if (!session) {
    return <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-12">…</p>
  }

  return (
    <div className="py-4">
      <div className="max-w-2xl mx-auto px-4 mb-2">
        <Link to="/learn/reading" className="inline-block py-2 px-1 text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
          {t.readingSaveExit}
        </Link>
      </div>
      <div className="max-w-2xl mx-auto px-4">
        <StageProgress status={session.status} />
      </div>

      {session.status === 'reading' && <ReadingStage session={session} onReady={goToRecall} />}
      {session.status === 'recall' && (
        <SummaryStage session={session} onSave={saveSummaryDraft} onContinue={() => advanceStage('evaluate')} />
      )}
      {session.status === 'evaluate' && (
        <EvaluationStage onSubmit={(scores, weakness, note) => submitEvaluation(scores, weakness, note)} />
      )}
      {session.status === 'improve' && (
        <ImproveStage session={session} onSave={saveImprovedDraft} onContinue={() => advanceStage('reflect')} />
      )}
      {session.status === 'reflect' && (
        <ReflectStage onSubmit={(learned, canExplain, takeaway) => submitReflection(learned, canExplain, takeaway)} />
      )}
      {session.status === 'completed' && <SessionResult session={session} />}
    </div>
  )
}

export function ReadingView() {
  return (
    <div className="h-full overflow-y-auto">
      <Routes>
        <Route index element={<ReadingListView />} />
        <Route path="new" element={<NewSessionForm />} />
        <Route path="progress" element={<ProgressView />} />
        <Route path=":id" element={<SessionWizard />} />
      </Routes>
    </div>
  )
}
