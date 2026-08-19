import type { AssessmentRun, Finding, RepoMeta } from './types';

/* ── Report export — generated from the actual assessment data ─────────── */

export function exportAssessmentReport(assessment: AssessmentRun, repo: RepoMeta | null, findings: Finding[]) {
  const report = {
    tool: 'ZORQEN — Security Validation',
    generated_at: new Date().toISOString(),
    repository: repo?.name,
    commit: repo?.commit,
    assessment: assessment.id,
    branch: assessment.branch,
    score: assessment.score,
    duration: assessment.duration,
    pipeline: assessment.steps.map((s) => ({ id: s.id, label: s.label, status: s.status })),
    findings: findings.map((f) => ({
      id: f.id,
      severity: f.severity,
      title: f.title,
      cwe: f.cwe_id,
      file: f.file_path,
      line: f.line_number,
      confidence: f.confidence_pct,
      validation: f.validation,
      status: f.status,
      evidence: {
        static_analysis: f.evidence.static_analysis,
        runtime_result: f.evidence.runtime_result,
        ai_reasoning: f.evidence.ai_reasoning,
      },
      remediation: f.remediation
        ? { branch: f.remediation.branch, risk: f.remediation.risk, regression: `${f.remediation.regression_passed}/${f.remediation.regression_tests}` }
        : undefined,
    })),
    scope_note: 'Report reflects the assessed commit snapshot only. ZORQEN never scans production systems and never modifies a repository without explicit approval.',
  };

  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `zorqen-report-${repo?.name ?? 'assessment'}-${assessment.id.replace('#', '')}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}