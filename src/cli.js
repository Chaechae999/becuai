#!/usr/bin/env node
// src/cli.js
// 사용법:
//   node src/cli.js WIGOVIEW-656      # Jira 조회 후 upsert + 문서 재생성
//   node src/cli.js --demo            # 인증 없이 기존 data로 문서만 재생성
//   TICKET=WIGOVIEW-656 node src/cli.js
//
// Jira 환경변수(JIRA_BASE_URL/JIRA_EMAIL/JIRA_API_TOKEN)가 없으면 자동으로 데모 모드로 동작.

import { fetchIssue, hasCredentials, getConfig } from './jira.js';
import { issueToRow, upsertRow } from './mapping.js';
import { readData, writeData, generateAll } from './generate.js';

function parseArgs(argv) {
  const args = argv.slice(2);
  let demo = false;
  let appliedVersion = '';
  let ticket = process.env.TICKET || '';
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--demo') demo = true;
    else if (a === '--version' || a === '-v') appliedVersion = args[++i] || '';
    else if (a.startsWith('--version=')) appliedVersion = a.slice('--version='.length);
    else if (!a.startsWith('-')) ticket = a;
  }
  return { demo, ticket, appliedVersion };
}

async function main() {
  const { demo, ticket, appliedVersion } = parseArgs(process.argv);
  const creds = hasCredentials();

  // 모드 결정
  const runDemo = demo || !ticket || !creds;

  if (runDemo) {
    if (!ticket) {
      console.log('[데모 모드] 티켓 키가 없어 기존 데이터로 문서만 재생성합니다.');
    } else if (!creds) {
      console.log(`[데모 모드] Jira 인증 정보가 없어 "${ticket}" 를 조회하지 않고 기존 데이터로 문서만 재생성합니다.`);
      console.log('           실제 조회는 GitHub Actions(시크릿 설정)에서 실행하세요.');
    } else {
      console.log('[데모 모드] --demo 플래그로 문서만 재생성합니다.');
    }
    const data = await readData();
    const result = await generateAll(data);
    console.log(`✔ 생성 완료: 화면정의서 ${result.specCount}개 · 피드백 ${result.rowCount}건`);
    result.files.forEach((f) => console.log(`  - ${f}`));
    return;
  }

  // 실제 Jira 조회 모드
  const cfg = getConfig();
  console.log(`[조회] ${cfg.baseUrl} → 이슈 ${ticket}`);
  const issue = await fetchIssue(ticket);
  console.log(`  화면 ID: ${issue.screenId || '(파싱 실패)'} · 유형: ${issue.issueType} · 상태: ${issue.status}`);
  console.log(`  요청: ${issue.reporter} → 담당: ${issue.assignee} · 댓글 ${issue.commentCount}개`);

  const row = issueToRow(issue, { baseUrl: cfg.baseUrl, appliedVersion });

  const data = await readData();
  const next = upsertRow(data, row);
  await writeData(next);
  console.log(`✔ feedback-log.json upsert 완료 (key=${row.jira.key})`);

  const result = await generateAll(next);
  console.log(`✔ 문서 생성 완료: 화면정의서 ${result.specCount}개 · 피드백 ${result.rowCount}건`);
  result.files.forEach((f) => console.log(`  - ${f}`));
}

main().catch((err) => {
  console.error('✖ 실행 실패:', err.message);
  process.exit(1);
});
