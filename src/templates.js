// src/templates.js
// HTML 렌더러 (템플릿 리터럴, 빌드 스텝 없음, 의존성 없음).
// 화면정의서 / 피드백 로그 / 인덱스 페이지를 생성한다.
// 주의: Jira에서 온 모든 텍스트는 escapeHtml()로 이스케이프한다.

import { typeChipColor, statusChipColor } from './mapping.js';

/** HTML 특수문자 이스케이프 */
export function escapeHtml(input) {
  if (input == null) return '';
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 개행을 <br>로 (이스케이프 후 사용) */
function nl2br(escaped) {
  return String(escaped).replace(/\n/g, '<br>');
}

/**
 * 공유 디자인 시스템 CSS. 라이트/다크 자동 대응(prefers-color-scheme).
 * 인쇄(print) 친화적. 시스템 폰트 스택.
 */
export const BASE_CSS = `
:root {
  --bg: #ffffff;
  --surface: #ffffff;
  --surface-2: #f7f8fa;
  --text: #1a2029;
  --text-muted: #5a6572;
  --border: #e2e6ec;
  --border-strong: #cbd2db;
  --accent: #2f6fed;
  --accent-soft: #eaf1fe;
  --shadow: 0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.08);
  --radius: 10px;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0e1116;
    --surface: #161b22;
    --surface-2: #1c232c;
    --text: #e6edf3;
    --text-muted: #9aa7b4;
    --border: #2a323c;
    --border-strong: #3a444f;
    --accent: #6ea0ff;
    --accent-soft: #17233a;
    --shadow: 0 1px 2px rgba(0,0,0,.4);
  }
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo",
    "Malgun Gothic", "Noto Sans KR", Roboto, Helvetica, Arial, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}
.wrap { max-width: 1080px; margin: 0 auto; padding: 32px 24px 80px; }
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
h1 { font-size: 24px; margin: 0 0 4px; letter-spacing: -.01em; }
h2 { font-size: 17px; margin: 32px 0 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
h3 { font-size: 14px; margin: 20px 0 8px; color: var(--text-muted); }
p { margin: 8px 0; }
.muted { color: var(--text-muted); }
.small { font-size: 12px; }
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; flex-wrap: wrap; margin-bottom: 20px;
}
.topbar nav a { margin-left: 16px; font-size: 13px; }
.card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); box-shadow: var(--shadow);
  padding: 20px 22px; margin: 16px 0;
}
.meta-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1px; background: var(--border); border: 1px solid var(--border);
  border-radius: var(--radius); overflow: hidden;
}
.meta-grid .cell { background: var(--surface); padding: 12px 16px; }
.meta-grid .k { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: .04em; }
.meta-grid .v { font-size: 15px; font-weight: 600; margin-top: 2px; }
.capture-box {
  border: 2px dashed var(--border-strong); border-radius: var(--radius);
  background: var(--surface-2); color: var(--text-muted);
  min-height: 220px; display: flex; align-items: center; justify-content: center;
  text-align: center; font-size: 13px; padding: 24px;
}
table { width: 100%; border-collapse: collapse; font-size: 13px; }
thead th {
  text-align: left; background: var(--surface-2); color: var(--text-muted);
  font-weight: 600; font-size: 12px; padding: 10px 12px;
  border-bottom: 1px solid var(--border-strong); white-space: nowrap;
}
tbody td { padding: 11px 12px; border-bottom: 1px solid var(--border); vertical-align: top; }
tbody tr:hover { background: var(--surface-2); }
.chip {
  display: inline-block; padding: 2px 10px; border-radius: 999px;
  font-size: 12px; font-weight: 600; white-space: nowrap; line-height: 1.5;
}
.arrow { color: var(--text-muted); margin: 0 6px; }
.quote {
  border-left: 3px solid var(--border-strong); padding: 2px 0 2px 10px;
  color: var(--text); font-size: 12.5px; margin: 0 0 4px;
}
.cmeta { color: var(--text-muted); font-size: 11.5px; }
.mono { font-variant-numeric: tabular-nums; }
.badge-seed {
  display: inline-block; font-size: 10px; font-weight: 700; padding: 1px 6px;
  border-radius: 4px; background: var(--accent-soft); color: var(--accent);
  vertical-align: middle; margin-left: 6px;
}
.epic { display: block; font-size: 11px; color: var(--text-muted); margin-top: 2px; }
.empty { padding: 40px; text-align: center; color: var(--text-muted); }
.footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid var(--border);
  font-size: 12px; color: var(--text-muted); }
.cards-links { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px,1fr)); gap: 14px; }
.link-card { display: block; padding: 18px 20px; border: 1px solid var(--border);
  border-radius: var(--radius); background: var(--surface); box-shadow: var(--shadow); }
.link-card:hover { border-color: var(--accent); text-decoration: none; }
.link-card .t { font-weight: 700; font-size: 15px; color: var(--text); }
.link-card .d { font-size: 12.5px; color: var(--text-muted); margin-top: 4px; }
@media print {
  body { background: #fff; color: #000; }
  .topbar nav, .footer { display: none; }
  .card, .meta-grid { box-shadow: none; }
  a { color: #000; text-decoration: none; }
}
`;

function chipHtml(text, colors) {
  const t = escapeHtml(text || '-');
  // 라이트 값을 인라인으로, 다크는 CSS 변수로 처리하기 어렵기에 style에 라이트/다크 겸용 색 넣음.
  // prefers-color-scheme 미디어쿼리는 인라인 style에 못 넣으므로 data-속성 + class로 처리.
  return `<span class="chip" style="background:${colors.bg};color:${colors.fg}" data-dbg="${colors.dbg}" data-dfg="${colors.dfg}">${t}</span>`;
}

/** 다크모드에서 칩 색을 data 속성으로 교체하는 소형 스크립트 */
const CHIP_SCRIPT = `
<script>
(function(){
  function apply(){
    var dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.querySelectorAll('.chip[data-dbg]').forEach(function(el){
      if (dark) { el.style.background = el.getAttribute('data-dbg'); el.style.color = el.getAttribute('data-dfg'); }
    });
  }
  apply();
  if (window.matchMedia) {
    try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(){ location.reload(); }); } catch(e){}
  }
})();
</script>`;

function pageShell({ title, body, activeNav }) {
  const nav = (href, label, key) =>
    `<a href="${href}"${activeNav === key ? ' style="color:var(--text);font-weight:700"' : ''}>${label}</a>`;
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${BASE_CSS}</style>
</head>
<body>
<div class="wrap">
  <div class="topbar">
    <div><strong>WIGOVIEW</strong> <span class="muted small">화면정의서 · 피드백 로그</span></div>
    <nav>
      ${nav('./index.html', '홈', 'home')}
      ${nav('./feedback-log.html', '피드백 로그', 'log')}
    </nav>
  </div>
  ${body}
  <div class="footer">
    자동 생성 문서 · Jira → 화면정의서 파이프라인 · 최종 생성 ${escapeHtml(new Date().toISOString().slice(0, 10))}
  </div>
</div>
${CHIP_SCRIPT}
</body>
</html>`;
}

/** 최근 댓글 셀 렌더링 */
function lastCommentCell(lc) {
  if (!lc) return '<span class="muted small">댓글 없음</span>';
  const body = nl2br(escapeHtml(lc.body || ''));
  return `<div class="quote">"${body}"</div>
    <div class="cmeta">${escapeHtml(lc.author || '')} · <span class="mono">${escapeHtml(lc.dateKR || '')}</span> · 댓글 ${escapeHtml(String(lc.count ?? ''))}개</div>`;
}

/** Jira 셀 렌더링 (키 링크 + Epic) */
function jiraCell(jira) {
  if (!jira) return '';
  const epic = jira.epicName
    ? `<span class="epic">${escapeHtml(jira.epicName)}</span>`
    : '';
  return `<a href="${escapeHtml(jira.url)}" target="_blank" rel="noopener">${escapeHtml(jira.key)}</a>${epic}`;
}

/**
 * 피드백 로그 페이지 렌더링.
 * @param {object[]} rows
 */
export function renderFeedbackLog(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const bodyRows = list.length
    ? list
        .map((r) => {
          const seed = r.seed ? '<span class="badge-seed">SEED</span>' : '';
          return `<tr>
  <td class="mono"><strong>${escapeHtml(r.element || '-')}</strong>${seed}</td>
  <td>${chipHtml(r.type, typeChipColor(r.type))}</td>
  <td>${jiraCell(r.jira)}</td>
  <td>${escapeHtml(r.feedback || '')}</td>
  <td>${lastCommentCell(r.lastComment)}</td>
  <td>${escapeHtml(r.requester || '')} <span class="arrow">→</span> ${escapeHtml(r.assignee || '')}</td>
  <td>${chipHtml(r.status, statusChipColor(r.status))}</td>
  <td class="mono">${escapeHtml(r.appliedVersion || '-')}</td>
</tr>`;
        })
        .join('\n')
    : `<tr><td colspan="8"><div class="empty">아직 데이터가 없습니다. Actions에서 "Jira 화면정의서 업데이트" 워크플로를 실행하세요.</div></td></tr>`;

  const body = `
  <h1>피드백 로그</h1>
  <p class="muted">Jira 티켓에서 자동 생성된 피드백 로그입니다. <strong>반영 버전</strong> 컬럼만 수동 입력 필드입니다.</p>
  <div class="card" style="padding:0;overflow-x:auto">
    <table>
      <thead>
        <tr>
          <th>요소</th><th>유형</th><th>Jira</th><th>피드백 내용</th>
          <th>최근 댓글</th><th>요청 → 담당</th><th>상태</th><th>반영 버전</th>
        </tr>
      </thead>
      <tbody>
        ${bodyRows}
      </tbody>
    </table>
  </div>
  <p class="small muted">총 ${list.length}건</p>`;

  return pageShell({ title: 'WIGOVIEW · 피드백 로그', body, activeNav: 'log' });
}

/**
 * 화면정의서(screen spec) 페이지 렌더링.
 * @param {object} spec issueToSpec() 모델
 * @param {object[]} relatedRows 이 화면 ID에 속한 피드백 로그 rows
 */
export function renderScreenSpec(spec, relatedRows = []) {
  const dep = spec.screenId && spec.screenId.includes('-')
    ? spec.screenId.split('-').join(' > ')
    : spec.screenId || '-';

  const overview = spec.overview
    ? nl2br(escapeHtml(spec.overview))
    : '<span class="muted">개요가 아직 입력되지 않았습니다. (Jira 설명 필드에서 자동 수집)</span>';

  // UI 요소 정의 테이블 — 자동 수집 대상이 아니므로 편집용 빈 행 예시 제공
  const uiRows = (spec.uiElements && spec.uiElements.length ? spec.uiElements : [
    { area: '', name: '', behavior: '', note: '' },
  ])
    .map((u, i) => `<tr>
    <td class="mono">${i + 1}</td>
    <td>${escapeHtml(u.area || '')}</td>
    <td>${escapeHtml(u.name || '')}</td>
    <td>${escapeHtml(u.behavior || '')}</td>
    <td>${escapeHtml(u.note || '')}</td>
  </tr>`)
    .join('\n');

  const related = (spec.relatedTickets || [])
    .map((t) => `<li>
      <a href="${escapeHtml(t.url)}" target="_blank" rel="noopener">${escapeHtml(t.key)}</a>
      ${chipHtml(t.type, typeChipColor(t.type))}
      ${chipHtml(t.status, statusChipColor(t.status))}
      <span class="muted">${escapeHtml(t.summary || '')}</span>
    </li>`)
    .join('\n') || '<li class="muted">연관 티켓 없음</li>';

  const changeRows = (relatedRows || []).length
    ? relatedRows
        .map((r) => `<tr>
      <td>${chipHtml(r.type, typeChipColor(r.type))}</td>
      <td>${jiraCell(r.jira)}</td>
      <td>${escapeHtml(r.feedback || '')}</td>
      <td>${chipHtml(r.status, statusChipColor(r.status))}</td>
      <td class="mono">${escapeHtml(r.appliedVersion || '-')}</td>
    </tr>`)
        .join('\n')
    : '<tr><td colspan="5"><div class="empty">이 화면에 연결된 피드백이 없습니다.</div></td></tr>';

  const body = `
  <h1>화면정의서 <span class="mono muted">${escapeHtml(spec.screenId)}</span></h1>
  <div class="meta-grid" style="margin-top:16px">
    <div class="cell"><div class="k">화면 ID</div><div class="v mono">${escapeHtml(spec.screenId)}</div></div>
    <div class="cell"><div class="k">화면명</div><div class="v">${escapeHtml(spec.screenName || '-')}</div></div>
    <div class="cell"><div class="k">경로(Depth)</div><div class="v small">${escapeHtml(dep)}</div></div>
    <div class="cell"><div class="k">버전</div><div class="v mono">${escapeHtml(spec.version || '-')}</div></div>
    <div class="cell"><div class="k">최종 수정일</div><div class="v mono">${escapeHtml((spec.updatedAt || '').slice(0, 10))}</div></div>
    ${spec.epicName ? `<div class="cell"><div class="k">Epic</div><div class="v small">${escapeHtml(spec.epicName)}</div></div>` : ''}
  </div>

  <h2>화면 개요 / 설명</h2>
  <div class="card">${overview}</div>

  <h2>화면 캡처</h2>
  <div class="capture-box">
    화면 캡처 이미지 영역<br>
    <span class="small">Figma 노드 <code>2956-18603</code> 템플릿 기준 · 캡처/익스포트 이미지를 여기에 삽입하세요.</span>
  </div>

  <h2>UI 요소 정의</h2>
  <div class="card" style="padding:0;overflow-x:auto">
    <table>
      <thead><tr><th>No</th><th>영역·구분</th><th>요소명</th><th>동작·기능 정의</th><th>비고</th></tr></thead>
      <tbody>${uiRows}</tbody>
    </table>
  </div>
  <p class="small muted">UI 요소 정의는 수동/후속 편집 대상입니다. (Jira 자동 수집 항목 아님)</p>

  <h2>연관 Jira 티켓</h2>
  <ul>${related}</ul>

  <h2>변경 이력 (피드백)</h2>
  <div class="card" style="padding:0;overflow-x:auto">
    <table>
      <thead><tr><th>유형</th><th>Jira</th><th>피드백 내용</th><th>상태</th><th>반영 버전</th></tr></thead>
      <tbody>${changeRows}</tbody>
    </table>
  </div>
  <p class="small muted"><a href="./feedback-log.html">전체 피드백 로그 보기 →</a></p>
  <p class="small muted" style="margin-top:8px">본 레이아웃은 Figma 템플릿(노드 <code>2956-18603</code>)의 best-effort 복제입니다. 실제 스타일 미세 조정을 위해 캡처/익스포트 공유가 필요합니다.</p>`;

  return pageShell({ title: `화면정의서 · ${spec.screenId}`, body, activeNav: 'spec' });
}

/**
 * 인덱스 페이지 렌더링.
 * @param {object[]} specs [{screenId, screenName, file}]
 * @param {number} rowCount
 */
export function renderIndex(specs, rowCount) {
  const specLinks = (specs && specs.length)
    ? specs
        .map((s) => `<a class="link-card" href="./specs/${escapeHtml(s.file)}">
      <div class="t">${escapeHtml(s.screenId)}</div>
      <div class="d">${escapeHtml(s.screenName || '')}</div>
    </a>`)
        .join('\n')
    : '<p class="muted">아직 생성된 화면정의서가 없습니다.</p>';

  const body = `
  <h1>WIGOVIEW 화면정의서 / 피드백 로그</h1>
  <p class="muted">Jira 티켓을 입력하면 화면정의서와 피드백 로그가 자동 생성됩니다.</p>

  <h2>피드백 로그</h2>
  <div class="cards-links">
    <a class="link-card" href="./feedback-log.html">
      <div class="t">📋 전체 피드백 로그</div>
      <div class="d">현재 ${rowCount}건의 피드백이 기록되어 있습니다.</div>
    </a>
  </div>

  <h2>화면정의서 (${specs ? specs.length : 0})</h2>
  <div class="cards-links">
    ${specLinks}
  </div>`;

  return pageShell({ title: 'WIGOVIEW · 화면정의서 인덱스', body, activeNav: 'home' });
}
