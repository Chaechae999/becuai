// src/generate.js
// feedback-log 데이터로부터 정적 HTML 페이지들을 생성한다.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { renderFeedbackLog, renderScreenSpec, renderIndex } from './templates.js';
import { issueToSpec } from './mapping.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
export const DATA_FILE = path.join(ROOT, 'data', 'feedback-log.json');
export const DOCS_DIR = path.join(ROOT, 'docs');
export const SPECS_DIR = path.join(DOCS_DIR, 'specs');

/** feedback-log.json 읽기 (없으면 빈 구조 반환) */
export async function readData() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    const json = JSON.parse(raw);
    if (!Array.isArray(json.rows)) json.rows = [];
    return json;
  } catch (err) {
    if (err.code === 'ENOENT') return { rows: [] };
    throw err;
  }
}

/** feedback-log.json 쓰기 */
export async function writeData(data) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

/** 안전한 파일명 (화면 ID) */
function specFileName(screenId) {
  const safe = (screenId || 'UNKNOWN').replace(/[^A-Za-z0-9._-]/g, '_');
  return `${safe}.html`;
}

/**
 * rows에서 화면 ID별 spec 모델을 구성한다.
 * 각 화면 ID에 대해: 대표 화면명(첫 행) + 연관 티켓/변경이력(해당 rows).
 * @param {object[]} rows
 */
function buildSpecsFromRows(rows) {
  const byScreen = new Map();
  for (const r of rows) {
    const id = r.element || '(미지정)';
    if (!byScreen.has(id)) byScreen.set(id, []);
    byScreen.get(id).push(r);
  }
  const specs = [];
  for (const [screenId, group] of byScreen) {
    const first = group[0];
    const spec = {
      screenId,
      screenName: first.feedback || '',
      epicName: first.jira?.epicName || '',
      version: first.appliedVersion || '-',
      updatedAt: first.updatedAt || new Date().toISOString(),
      overview: first.overview || '',
      uiElements: [],
      relatedTickets: group.map((r) => ({
        key: r.jira?.key || '',
        url: r.jira?.url || '',
        summary: r.feedback || '',
        status: r.status || '',
        type: r.type || '',
      })),
    };
    specs.push({ spec, rows: group });
  }
  return specs;
}

/**
 * 전체 문서(docs/) 재생성.
 * @param {{rows: object[]}} data
 * @returns {Promise<{specCount:number, rowCount:number, files:string[]}>}
 */
export async function generateAll(data) {
  const rows = Array.isArray(data.rows) ? data.rows : [];
  await fs.mkdir(SPECS_DIR, { recursive: true });

  const files = [];
  const specGroups = buildSpecsFromRows(rows);
  const indexSpecs = [];

  // 화면정의서 페이지들
  for (const { spec, rows: group } of specGroups) {
    const file = specFileName(spec.screenId);
    const html = renderScreenSpec(spec, group);
    await fs.writeFile(path.join(SPECS_DIR, file), html, 'utf8');
    files.push(path.join('docs', 'specs', file));
    indexSpecs.push({ screenId: spec.screenId, screenName: spec.screenName, file });
  }

  // 피드백 로그
  const logHtml = renderFeedbackLog(rows);
  await fs.writeFile(path.join(DOCS_DIR, 'feedback-log.html'), logHtml, 'utf8');
  files.push(path.join('docs', 'feedback-log.html'));

  // 인덱스
  const indexHtml = renderIndex(indexSpecs, rows.length);
  await fs.writeFile(path.join(DOCS_DIR, 'index.html'), indexHtml, 'utf8');
  files.push(path.join('docs', 'index.html'));

  // .nojekyll (GitHub Pages가 _ 폴더 등을 무시하지 않도록)
  await fs.writeFile(path.join(DOCS_DIR, '.nojekyll'), '', 'utf8');

  return { specCount: indexSpecs.length, rowCount: rows.length, files };
}

// issueToSpec는 필요 시 외부에서 사용
export { issueToSpec };
