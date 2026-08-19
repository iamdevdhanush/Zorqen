import { useParams } from 'react-router-dom';
import { useWorkspace } from '../store/WorkspaceContext';
import AssessmentOperationConsole from '../components/AssessmentOperationConsole';

export default function AssessmentDetailPage() {
  const { id } = useParams();
  const { assessments, currentAssessment, startAssessment } = useWorkspace();

  const run = assessments.find((a) => a.id.replace('#', '') === id) ?? currentAssessment;

  if (!run) {
    return (
      <div className="max-w-[800px] mx-auto py-16 text-center space-y-4">
        <div className="mono text-[13px] font-bold text-[#666666] bg-white p-6 rounded-xl border border-[#111111] shadow-hard">
          Assessment &lsquo;#{id}&lsquo; not found in workspace state.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1240px] mx-auto space-y-8 fade-in py-2">
      <AssessmentOperationConsole
        run={run}
        onRetry={startAssessment}
      />
    </div>
  );
}