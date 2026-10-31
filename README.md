# 수리결계 (Axiom Barrier)

함수를 연산자로 쏴서 0으로 만드는 탄막 슈팅 게임입니다. 수학 7단원에, 공간이 휘는 EX1과 물리 도구로 싸우는 EX2가 있습니다.

## 실행

`index.html`을 브라우저로 열면 됩니다. 서버는 필요 없습니다. 자세한 규칙은 게임 아래 설명서에 있습니다.

| 키 | 동작 |
| --- | --- |
| 방향키 / Shift | 이동 / 저속 |
| Z | 발사, 다음 대사 |
| C, 1–8 | 장비 바꾸기 (∮를 든 채 4를 한 번 더: ver1/ver2) |
| X / V | 봄 / 정지점·DNA 나선 |
| Ctrl / P / M | 대화 넘기기 / 일시정지 / 소리 |

## 고치기

- 이름과 대사: `story.js`
- 그림: `figures/`(대화 초상)와 `figures_tanmak/`(탄막 화면)에 같은 이름으로. 규격은 [docs/art-brief.md](docs/art-brief.md)
- 테스트: `node tests/verify.cjs`

## 피드백

버그 제보, 아이디어, PR 모두 언제든지 환영합니다. Issue나 PR로 편하게 남겨 주세요.

## 라이선스

[MIT](LICENSE)

탄막 슈팅이라는 장르만 같은 독립 창작물입니다. 「동방 프로젝트」의 2차 창작이 아니며, 그 캐릭터·이름·음악·이야기·그림을 쓰지 않았고, ZUN 및 上海アリス幻樂団(Team Shanghai Alice)과 관계가 없습니다.

An original bullet-hell game. Not a Touhou Project fan work, and not affiliated with or endorsed by ZUN or Team Shanghai Alice.
