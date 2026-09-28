// src/jira.js
// Jira Cloud REST API v3 client (fetch + Basic auth). ESM, zero deps.
// 환경변수: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN

/**
 * 환경변수에서 Jira 접속 설정을 읽는다.
 * @returns {{baseUrl:string, email:string, token:string}}
 */
export function getConfig() {
  const baseUrl = (process.env.JIRA_BASE_URL || '').replace(/\/+$/, '');
  const email = process.env.JIRA_EMAIL || '';
  const token = process.env.JIRA_API_TOKEN || '';
  return { baseUrl, email, token };
}

/**
 * Jira 인증 정보가 모두 존재하는지 확인.
 */
export function hasCredentials() {
  const { baseUrl, email, token } = getConfig();
  return Boolean(baseUrl && email && token);
}

function authHeader(email, token) {
  const basic = Buffer.from(`${email}:${token}`).toString('base64');
  return `Basic ${basic}`;
}

/**
 * summary(제목)에서 화면 ID를 추출한다.
 * 예) "[QA] M-07-009 목차에서 ..." -> "M-07-009"
 *     "D-04 상단바 ..."           -> "D-04"
 * 지원 패턴: 대문자 1~2개 + '-' + 숫자 + (선택적으로 '-' + 숫자) ...
 * @param {string} summary
 * @returns {{screenId:string|null, title:string}}
 */
export function parseScreenId(summary) {
  let s = (summary || '').trim();
  // 선행 태그 제거: [QA], [버그], [개선] 등 대괄호 태그를 앞에서 모두 제거
  s = s.replace(/^(\s*\[[^\]]*\]\s*)+/g, '').trim();

  // 화면 ID 패턴: 예) M-07-009, D-04, MO-01-02, S-1
  const m = s.match(/^([A-Z]{1,3}(?:-\d{1,3})+)\b[\s:.\-–)\]]*/);
  if (m) {
    const screenId = m[1];
    const title = s.slice(m[0].length).trim();
    return { screenId, title: title || s };
  }
  return { screenId: null, title: s };
}

/**
 * ADF(Atlassian Document Format) 노드를 평문으로 변환한다.
 * 문자열이 그대로 오면 그대로 반환.
 * @param {any} node
 * @returns {string}
 */
export function adfToText(node) {
  if (node == null) return '';
  if (typeof node === 'string') return node;

  const walk = (n) => {
    if (!n || typeof n !== 'object') return '';
    let out = '';
    switch (n.type) {
      case 'text':
        return n.text || '';
      case 'hardBreak':
        return '\n';
      case 'mention':
        return n.attrs?.text || '@사용자';
      case 'emoji':
        return n.attrs?.text || n.attrs?.shortName || '';
      case 'inlineCard':
        return n.attrs?.url || '';
      default:
        break;
    }
    if (Array.isArray(n.content)) {
      out += n.content.map(walk).join('');
    }
    // 블록 레벨 노드는 뒤에 개행 추가
    if (['paragraph', 'heading', 'listItem', 'blockquote', 'codeBlock'].includes(n.type)) {
      out += '\n';
    }
    return out;
  };

  return walk(node)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * ISO 날짜 문자열 -> 'YYYY.MM.DD' (KST 기준으로 표기)
 * @param {string} iso
 */
export function toDateKR(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  // KST(UTC+9)로 변환
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const mo = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const da = String(kst.getUTCDate()).padStart(2, '0');
  return `${y}.${mo}.${da}`;
}

async function jiraGet(path, { baseUrl, email, token }) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: authHeader(email, token),
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Jira 요청 실패 ${res.status} ${res.statusText} — ${url}\n${text.slice(0, 500)}`);
  }
  return res.json();
}

/**
 * Epic 이름을 이슈 fields에서 최선을 다해 추출한다.
 * (팀마다 커스텀 필드가 다르므로 여러 경로를 시도)
 */
function extractEpicName(fields) {
  if (!fields) return '';
  // parent가 Epic인 경우
  if (fields.parent?.fields?.issuetype?.name === 'Epic') {
    return fields.parent.fields.summary || fields.parent.key || '';
  }
  // 표준 epic 링크/이름 커스텀 필드 후보 스캔
  for (const [k, v] of Object.entries(fields)) {
    if (!k.startsWith('customfield_')) continue;
    if (typeof v === 'string' && /^\[?EPIC/i.test(v)) return v;
  }
  // parent가 있으면 그 요약이라도
  if (fields.parent?.fields?.summary) return fields.parent.fields.summary;
  return '';
}

/**
 * 이슈 키로 이슈 + 댓글을 조회하여 정규화된 객체로 반환한다.
 * @param {string} key 예) "WIGOVIEW-656"
 * @returns {Promise<object>} 정규화 이슈
 */
export async function fetchIssue(key) {
  const cfg = getConfig();
  if (!cfg.baseUrl || !cfg.email || !cfg.token) {
    throw new Error('Jira 환경변수(JIRA_BASE_URL/JIRA_EMAIL/JIRA_API_TOKEN)가 설정되지 않았습니다.');
  }
  if (!key) throw new Error('이슈 키가 필요합니다. 예) WIGOVIEW-656');

  const issue = await jiraGet(
    `/rest/api/3/issue/${encodeURIComponent(key)}?fields=summary,issuetype,status,reporter,assignee,parent,description,created&expand=names`,
    cfg,
  );
  const fields = issue.fields || {};

  // 댓글은 별도 엔드포인트에서 최신순으로
  const commentsResp = await jiraGet(
    `/rest/api/3/issue/${encodeURIComponent(key)}/comment?orderBy=created&maxResults=100`,
    cfg,
  );
  const rawComments = commentsResp.comments || [];
  const comments = rawComments.map((c) => ({
    author: c.author?.displayName || '알 수 없음',
    dateISO: c.created || '',
    dateKR: toDateKR(c.created),
    body: adfToText(c.body),
  }));
  const commentCount = typeof commentsResp.total === 'number' ? commentsResp.total : comments.length;
  const lastComment = comments.length ? comments[comments.length - 1] : null;

  const summary = fields.summary || '';
  const { screenId, title } = parseScreenId(summary);

  return {
    key: issue.key || key,
    summary,
    issueType: fields.issuetype?.name || '',
    status: fields.status?.name || '',
    reporter: fields.reporter?.displayName || '',
    assignee: fields.assignee?.displayName || '',
    epicName: extractEpicName(fields),
    screenId,
    feedbackTitle: title,
    description: adfToText(fields.description),
    comments,
    commentCount,
    lastComment,
  };
}
