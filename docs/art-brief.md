# 수리결계 캐릭터 그림 주문서 (Codex용)

이 문서를 그대로 Codex에게 주면 됩니다. 캐릭터는 15명이고, 세 묶음(A, B, C)으로 나눠서 한 묶음씩 맡기는 것을 권합니다.

---

## Codex에게 줄 명령

> 아래 "공통 규격"과 "묶음 X"의 캐릭터 목록을 읽고, 캐릭터마다 PNG 두 장을 만들어 주세요.
> 기존 그림 `figures/pixel_Main.png`, `figures/pixel_e_delta.png`, `figures_tanmak/pixel_Main.png`, `figures_tanmak/pixel_wei.png`를 참고 그림으로 열어 같은 화풍을 맞춰 주세요.
> 파일 이름은 목록에 적힌 그대로 쓰고, 두 폴더에 같은 이름으로 저장해 주세요.
> 다 만들면 두 폴더의 새 파일 목록과 각 그림의 크기를 알려 주세요. 다른 파일은 고치지 마세요.

---

## 공통 규격

| 항목 | 대화 초상 `figures/pixel_<id>.png` | 탄막 캐릭터 `figures_tanmak/pixel_<id>.png` |
| --- | --- | --- |
| 용도 | 대화창 왼쪽에 서는 전신 그림 (화면에서 약 330px 높이) | 탄막 화면에서 움직이는 작은 캐릭터 (화면에서 약 100px 높이) |
| 크기 | 정사각형 1254×1254 | 정사각형 1254×1254 |
| 비율 | 3~4등신 치비, 서 있는 전신 | 2~2.5등신 SD, 같은 옷과 소품을 더 단순하게 |
| 자세 | 정면 또는 살짝 비스듬히, 발끝까지 보이게 | 둥실 떠 있는 동작, 소품을 앞으로 내민 자세 |
| 여백 | 캐릭터가 세로의 90% 이상을 채우고, 사방 여백은 4% 이하 | 같음 |

모든 그림에 공통으로 적용합니다.

- **배경**: 완전히 투명한 배경(RGBA PNG)입니다. 바닥 그림자, 배경색, 테두리 상자는 넣지 않습니다.
- **화풍**: 기존 9명과 같은 고해상도 픽셀 아트입니다.
  - 픽셀 격자가 보이게 그립니다(1254px 기준으로 한 칸에 약 8~10px).
  - 외곽선은 짙은 색으로 또렷하게 넣습니다.
  - 셀 음영은 2~3단계로 합니다.
  - 금색 장식을 조금 넣습니다.
- **소녀 캐릭터**: 기존 출연진처럼 수학이나 물리 개념을 의인화한 마법소녀풍 소녀입니다. 개념을 상징하는 소품을 하나 이상 듭니다.
- **주색**: 아래 표의 색을 옷의 주색으로 씁니다. 게임 화면에서 그 보스의 색과 같아야 합니다.
- **넣지 않을 것**: 글자, 숫자로 된 로고, 서명, 워터마크는 넣지 않습니다. 소품에 수식 기호 모양이 들어가는 것은 괜찮습니다.

### 영어 프롬프트 틀

각 캐릭터의 `{설명}` 자리에 아래 목록의 영어 설명을 넣습니다.

- 대화 초상:
  `pixel art, high resolution sprite, chibi anime girl, full body standing pose, {설명}, crisp dark outlines, cel shading, small gold ornaments, transparent background, no ground shadow, no text, centered, fills the frame`
- 탄막 캐릭터:
  `pixel art, super-deformed 2-head-tall chibi anime girl, floating action pose holding her prop forward, {설명}, simple readable silhouette, crisp dark outlines, transparent background, no ground shadow, no text, centered, fills the frame`

---

## 묶음 A · EX1 휘어진 공간 보스 (3명)

| 파일 이름 | 이름 | 주색 | 개념 |
| --- | --- | --- | --- |
| `pixel_polar.png` | 라디안 (Radian) | 초록 `#1f7a55` | 극좌표 r, θ |
| `pixel_torus.png` | 토리 (Tori) | 보라 `#6b3ea1` | 토러스, 클라인 병, 사영평면 |
| `pixel_hyperbolic.png` | 로바 (Loba) | 청록 `#14808a` | 푸앵카레 원판, 쌍곡기하 |

- **polar** — `green and white robe embroidered with concentric circles and radial lines like a polar grid, short green bob hair, a protractor-shaped halo marked in degrees, holding a drafting compass staff, calm confident smile`
- **torus** — `violet and lilac dress, a glowing donut-shaped torus halo, hair in two ring-shaped buns, a ribbon twisted into a Möbius strip, holding a glass Klein bottle, mismatched left and right socks, playful expression`
- **hyperbolic** — `deep navy dress patterned with an Escher-like heptagon tiling whose tiles shrink toward the hem, long silver-teal hair, holding a round disk shield showing a hyperbolic {7,3} tiling that shrinks toward its rim, serene distant gaze`

---

## 묶음 B · EX2 물리 보스 (6명)

| 파일 이름 | 이름 | 주색 | 개념 |
| --- | --- | --- | --- |
| `pixel_maxwell.png` | 맥스 (Max) | 파랑 `#2a4fb4` | 맥스웰 방정식, 전자기파 |
| `pixel_rigid.png` | 로터 (Rotor) | 황갈 `#9a6230` | 강체 회전, 각운동량, 중간축 정리 |
| `pixel_relativity.png` | 아인 (Ein) | 보라 `#6b3ea1` | E = mc², 시간 지연 |
| `pixel_thermo.png` | 카르노 (Carno) | 주황 `#d8701a` | 카르노 순환, 엔트로피 |
| `pixel_fluid.png` | 레이나 (Reyna) | 청록 `#14808a` | 나비에–스토크스, 소용돌이 |
| `pixel_optics.png` | 루멘 (Lumen) | 빨강 `#d23b2e` | 페르마의 원리, 거울과 렌즈 |

- **maxwell** — `blue jacket with red trim, sine-wave patterns running along the sleeves for the electric and magnetic fields, spiky electric-blue hair with one red streak, lightning-bolt hairpins, gloves marked plus and minus, holding a copper coil staff with glowing field lines`
- **rigid** — `brown and gold mechanic outfit with gear motifs, brass goggles on her head, holding a spinning gyroscope in one hand and a tennis racket in the other, small rotating arrows around her, energetic grin`
- **relativity** — `starry deep-purple long coat, a cape shaped like a light cone, a golden pocket watch with stretched slow-moving hands, small floating clocks around her, hair with a comet-tail streak, a glowing letter c emblem on the chest`
- **thermo** — `steampunk outfit split into hot red-orange on one side and cold blue on the other, a brass piston cylinder backpack with steam puffs, holding a thermometer staff, flame earring and ice earring`
- **fluid** — `flowing aqua dress that looks like moving water with swirling vortex patterns, wave-shaped ribbons trailing behind, holding a parasol printed with a Kármán vortex street, water droplets around her, gentle smile`
- **optics** — `white and gold dress with rainbow prism accents, a monocle lens over one eye, a prism hair ornament splitting a light beam into colours, holding a round hand mirror, thin beams of light around her`

---

## 묶음 C · 본편 1–6단원 중간보스 (6명, 선택)

지금은 마법진만 그려집니다. 그림이 생기면 마법진 위에 캐릭터가 섭니다.

| 파일 이름 | 이름 | 주색 | 개념 |
| --- | --- | --- | --- |
| `pixel_logistic.png` | 파이겐 (Feigen) | 초록 `#1f7a55` | 로지스틱 사상, 분기, 혼돈 |
| `pixel_riemann.png` | 리마 (Rima) | 파랑 `#2a4fb4` | 리만 합, 정적분 |
| `pixel_mandel.png` | 줄리아 (Julia) | 보라 `#6b3ea1` | 망델브로 집합, 프랙탈 |
| `pixel_lorenz.png` | 로렌 (Loren) | 청록 `#14808a` | 로렌츠 끌개, 나비 효과 |
| `pixel_fib.png` | 피비 (Fibi) | 주황 `#d8701a` | 피보나치, 황금비, 잎차례 |
| `pixel_prime.png` | 에라 (Era) | 빨강 `#d23b2e` | 소수, 울람 나선, 에라토스테네스의 체 |

- **logistic** — `green dress embroidered with a branching bifurcation diagram that forks again and again toward the hem, hair ends splitting into forks, holding a quill pen, a small rabbit companion for population growth`
- **riemann** — `blue outfit whose pleated skirt is made of vertical rectangles under a sine curve like a Riemann sum, an integral-sign hairpin, holding a ruler and a stack of tiny blocks`
- **mandel** — `purple and black dress with a Mandelbrot-set silhouette and seahorse-tail spiral curls at the edges, curly hair with seahorse-valley spirals, holding a magnifying glass showing endless fractal zoom`
- **lorenz** — `teal and white outfit with butterfly wings shaped like the double loop of the Lorenz attractor, a weather-vane staff, small clouds and wind swirls around her`
- **fib** — `orange, yellow and green outfit with a sunflower headdress whose seeds spiral in a golden-angle pattern, a golden spiral ribbon, a nautilus shell and a pine cone as accessories`
- **prime** — `red and white outfit with a fine mesh sieve pattern on the skirt, a cape covered in a dotted Ulam spiral, a small crown, holding a long paper scroll`

---

## 넣은 뒤에 할 일

1. 두 장을 같은 이름으로 `figures/`와 `figures_tanmak/`에 넣습니다. 이름이 맞으면 게임이 알아서 씁니다.
2. 다 넣었으면 `story.js`에서 그 캐릭터의 `todo: true`를 지웁니다.
   - 지우면 테스트가 두 그림이 실제로 있는지, 여백 표(`index.html`의 `TRIM`)에 들어 있는지 확인합니다.
   - 여백 표는 새 그림이 들어오면 Claude에게 갱신해 달라고 하면 됩니다.
3. 이름표 색과 이름은 `story.js`에서 바꿀 수 있습니다.
