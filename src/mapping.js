// src/mapping.js
// 정규화된 Jira 이슈 -> 피드백 로그 row / 화면정의서 모델로 매핑하는 순수 함수 모음.

/**
 * 유형(issuetype) 별 칩 색상. 라이트/다크 모두 가독성 있는 파스텔 팔레트.
 */
export const TYPE_COLORS = {
  버그: { bg: '#fde2e1', fg: '#8a1c13', dbg: '#4a1512', dfg: '#ffb4ab' },
  개선: { bg: '#e1ecfd', fg: '#124a8a', dbg: '#122a4a', dfg: '#a6c8ff' },
  '새 기능': { bg: '#e3f6e6', fg: '#14622a', dbg: '#123a1c', dfg: '#9fe0ac' },
  작업: { bg: '#eae2fd', fg: '#3d1c8a', dbg: '#241245', dfg: '#c9b4ff' },
  '하위 작업': { bg: '#eef1f4', fg: '#3a4552', dbg: '#242a30', dfg: '#c4ccd4' },
  스토리: { bg: '#e3f6e6', fg: '#14622a', dbg: '#123a1c', dfg: '#9fe0ac' },
  에픽: { bg: '#f3e2fd', fg: '#6a1c8a', dbg: '#331245', dfg: '#e0b4ff' },
};

/**
 * 상태(status) 별 칩 색상.
 */
export const STATUS_COLORS = {
  '할 일': { bg: '#eef1f4', fg: '#3a4552', dbg: '#242a30', dfg: '#c4ccd4' },
  '진행 중': { bg: '#e1ecfd', fg: '#124a8a', dbg: '#122a4a', dfg: '#a6c8ff' },
  '검토 중': { bg: '#fdf3e1', fg: '#8a5a12', dbg: '#3a2c12', dfg: '#ffd79f' },
  완료: { bg: '#e3f6e6', fg: '#14622a', dbg: '#123a1c', dfg: '#9fe0ac' },
  종료: { bg: '#e3f6e6', fg: '#14622a', dbg: '#123a1c', dfg: '#9fe0ac' },
  보류: { bg: '#fdf3e1', fg: '#8a5a12', dbg: '#3a2c12', dfg: '#ffd79f' },
};

const DEFAULT_CHIP = { bg: '#eef1f4', fg: '#3a4552', dbg: '#242a30', dfg: '#c4ccd4' };

export function typeChipColor(type) {
  return TYPE_COLORS[type] || DEFAULT_CHIP;
}

export function statusChipColor(status) {
  return STATUS_COLORS[status] || DEFAULT_CHIP;
}

/**
 * Jira 티켓 브라우즈 URL 생성.
 */
export function browseUrl(baseUrl, key) {
  const base = (baseUrl || 'https://bfly.atlassian.net').replace(/\/+$/, '');
  return `${base}/browse/${key}`;
}

/**
 * 정규화 이슈 -> 피드백 로그 row 객체.
 * 컬럼: 요소, 유형, jira, 피드백내용, 최근댓글, 요청→담당, 상태, 반영버전
 * @param {object} issue fetchIssue() 결과
 * @param {object} [opts] { baseUrl, appliedVersion, seed }
 */
export function issueToRow(issue, opts = {}) {
  const baseUrl = opts.baseUrl || 'https://bfly.atlassian.net';
  return {
    // 요소 (화면 ID)
    element: issue.screenId || '',
    // 유형
    type: issue.issueType || '',
    // Jira
    jira: {
      key: issue.key,
      url: browseUrl(baseUrl, issue.key),
      epicName: issue.epicName || '',
    },
    // 피드백 내용 (제목, 화면ID 접두어 제거된 것)
    feedback: issue.feedbackTitle || issue.summary || '',
    // 최근 댓글
    lastComment: issue.lastComment
      ? {
          body: issue.lastComment.body,
          author: issue.lastComment.author,
          dateKR: issue.lastComment.dateKR,
          count: issue.commentCount,
        }
      : null,
    // 요청 -> 담당
    requester: issue.reporter || '',
    assignee: issue.assignee || '',
    // 상태
    status: issue.status || '',
    // 반영 버전 (Jira에 없음, 수동/선택)
    appliedVersion: opts.appliedVersion || '',
    // 메타
    seed: Boolean(opts.seed) || undefined,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * feedback-log 데이터에 row를 upsert (jira.key 기준).
 * @param {{rows: object[]}} data
 * @param {object} row
 * @returns {{rows: object[]}}
 */
export function upsertRow(data, row) {
  const rows = Array.isArray(data.rows) ? [...data.rows] : [];
  const idx = rows.findIndex((r) => r?.jira?.key === row.jira.key);
  if (idx >= 0) {
    // 기존 반영 버전이 수동 입력되어 있으면 보존 (새 값이 비어있을 때)
    const prev = rows[idx];
    if (!row.appliedVersion && prev.appliedVersion) {
      row.appliedVersion = prev.appliedVersion;
    }
    rows[idx] = { ...prev, ...row };
  } else {
    rows.push(row);
  }
  return { ...data, rows };
}

/**
 * 정규화 이슈 -> 화면정의서(screen spec) 모델.
 * UI 요소 테이블은 자동 생성 대상이 아니므로 초기 예시/빈 뼈대를 둔다.
 */
export function issueToSpec(issue, opts = {}) {
  const baseUrl = opts.baseUrl || 'https://bfly.atlassian.net';
  return {
    screenId: issue.screenId || '(미지정)',
    screenName: issue.feedbackTitle || issue.summary || '',
    epicName: issue.epicName || '',
    version: opts.appliedVersion || '-',
    updatedAt: new Date().toISOString(),
    overview: issue.description || '',
    relatedTickets: [
      {
        key: issue.key,
        url: browseUrl(baseUrl, issue.key),
        summary: issue.feedbackTitle || issue.summary || '',
        status: issue.status || '',
        type: issue.issueType || '',
      },
    ],
  };
}
