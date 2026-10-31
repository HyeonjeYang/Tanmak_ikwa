// 수리결계 대사 파일. 이름과 대사는 이 파일만 고치면 바뀝니다.
//
// cast    캐릭터마다 이름(ko, en), 이름표 색, 그림 파일 이름.
//         같은 파일 이름으로 figures/(대화창 왼쪽 초상)와 figures_tanmak/(탄막 화면)에서 그림을 찾습니다.
//         todo: true는 아직 그림이 없는 캐릭터입니다. 같은 이름의 PNG를 두 폴더에 넣으면 그대로 나옵니다.
// player  탄막 화면에서 플레이어로 나오는 캐릭터.
// bosses  보스 순서: 1–7단원, EX1(공간) 3명, EX2(물리) 6명. midboss는 7단원 필드 중간에 나오는 캐릭터.
// mids    1–6단원 중간보스. 마법진 위에 캐릭터가 섭니다.
// scenes  장면 하나는 [말하는 사람, '한국어 대사', 'English line'] 줄의 목록입니다.
//         prologue      1단원을 시작할 때
//         bossN         N단원 보스가 나올 때
//         bossN-after   N단원 보스를 넘긴 뒤
//         midN          N단원 중간보스가 나올 때, midN-after는 이긴 뒤, midN-escape는 못 이기고 시간이 다 되어 떠났을 때
//         ex1, ex2      번외 스테이지를 시작할 때 (EX1은 boss8–10, EX2는 boss11–16)
//         장면을 지우거나 비우면 그 대화는 건너뜁니다. 줄을 바꾸려면 대사 안에 \n을 넣습니다.
window.STORY = {
  cast: {
    Main:    { ko: '이수',   en: 'Isu',     color: '#8a5a3a', file: 'pixel_Main.png' },
    e_delta: { ko: '엡실론', en: 'Epsilon', color: '#c9577a', file: 'pixel_e_delta.png' },
    wei:     { ko: '바이어', en: 'Weier',   color: '#a3243f', file: 'pixel_wei.png' },
    theta:   { ko: '세타',   en: 'Theta',   color: '#6d4fc2', file: 'pixel_.png' },
    vector:  { ko: '나블라', en: 'Nabla',   color: '#16838e', file: 'pixel_vector.png' },
    matrix:  { ko: '아이겐', en: 'Eigen',   color: '#b8232b', file: 'pixel_matrix.png' },
    fourier: { ko: '푸리에', en: 'Fourier', color: '#3657be', file: 'pixel_fourier.png' },
    stat:    { ko: '몬테',   en: 'Monte',   color: '#c86f1e', file: 'pixel_stat.png' },
    DE:      { ko: '라플라', en: 'Lapla',   color: '#2c4a9e', file: 'pixel_DE.png' },
    // 1–6단원 중간보스
    logistic: { ko: '파이겐', en: 'Feigen', color: '#1f7a55', file: 'pixel_logistic.png' },
    riemann:  { ko: '리마',   en: 'Rima',   color: '#2a4fb4', file: 'pixel_riemann.png' },
    mandel:   { ko: '줄리아', en: 'Julia',  color: '#6b3ea1', file: 'pixel_mandel.png' },
    lorenz:   { ko: '로렌',   en: 'Loren',  color: '#14808a', file: 'pixel_lorenz.png' },
    fib:      { ko: '피비',   en: 'Fibi',   color: '#d8701a', file: 'pixel_fib.png' },
    prime:    { ko: '에라',   en: 'Era',    color: '#d23b2e', file: 'pixel_prime.png' },
    // EX1 공간
    polar:     { ko: '라디안', en: 'Radian', color: '#1f7a55', file: 'pixel_polar.png' },
    torus:     { ko: '토리',   en: 'Tori',   color: '#6b3ea1', file: 'pixel_torus.png' },
    hyperbolic:{ ko: '로바',   en: 'Loba',   color: '#14808a', file: 'pixel_hyperbolic.png' },
    // EX2 물리
    maxwell:   { ko: '맥스',   en: 'Max',    color: '#2a4fb4', file: 'pixel_maxwell.png' },
    rigid:     { ko: '로터',   en: 'Rotor',  color: '#9a6230', file: 'pixel_rigid.png' },
    relativity:{ ko: '아인',   en: 'Ein',    color: '#6b3ea1', file: 'pixel_relativity.png' },
    thermo:    { ko: '카르노', en: 'Carno',  color: '#d8701a', file: 'pixel_thermo.png' },
    fluid:     { ko: '레이나', en: 'Reyna',  color: '#14808a', file: 'pixel_fluid.png' },
    optics:    { ko: '루멘',   en: 'Lumen',  color: '#d23b2e', file: 'pixel_optics.png' }
  },
  player: 'Main',
  bosses: ['e_delta', 'wei', 'theta', 'vector', 'matrix', 'fourier', 'DE',
           'polar', 'torus', 'hyperbolic',
           'maxwell', 'rigid', 'relativity', 'thermo', 'fluid', 'optics'],
  midboss: 'stat',
  mids: ['logistic', 'riemann', 'mandel', 'lorenz', 'fib', 'prime'],
  scenes: {
    'prologue': [
      ['Main', '시험지 속이라니… 모눈 한 칸 한 칸이 전부 결계잖아.', 'Inside the exam sheet… every square of this graph paper is a barrier.'],
      ['Main', '규칙은 하나. 나오는 함수는 전부 0으로 만들 것.', 'One rule: bring every function that shows up down to zero.'],
      ['Main', '만년필은 충분히 날카로워. 미분부터 시작하자.', 'My pen is sharp enough. Differentiation first.']
    ],

    'mid1': [
      ['logistic', '토끼는 해마다 r배로 늘어. 너무 많아지면 먹이가 모자라서 다시 줄고.', 'My rabbits grow r-fold every year. When there are too many, food runs short and they drop again.'],
      ['Main', '같은 식을 계속 되풀이하는 수열이네. xₙ₊₁ = r xₙ(1 − xₙ).', 'The same formula, applied over and over. xₙ₊₁ = r xₙ(1 − xₙ).'],
      ['Main', 'r이 작을 때는 한 점으로 수렴해. lim이 통할 때 몰아서 쏘자.', 'While r is small it settles on one point. Better pour on lim while that lasts.'],
      ['logistic', '그럼 r을 올려 볼까? 둘로, 넷으로… 그다음은 나도 몰라.', 'Then shall I raise r? Two, then four… after that, even I cannot say.']
    ],
    'mid1-after': [
      ['logistic', '주기가 두 배, 또 두 배… 그러다 혼돈. 그 간격 봤어?', 'Period two, then four… then chaos. Did you see the spacing?'],
      ['Main', '갈수록 4.669배씩 좁아져. 파이겐바움 상수야. 혼돈에도 규칙이 있네.', 'It shrinks by 4.669 each time. Feigenbaum’s constant. Even chaos keeps a rule.']
    ],
    'mid1-escape': [
      ['logistic', 'r이 4를 넘기 전에 돌아갈래. 혼돈은 다음에 마저 보여 줄게.', 'I am leaving before r passes 4. The rest of the chaos can wait for next time.'],
      ['Main', '수렴할 때 lim을 더 몰아쳤어야 했는데.', 'I should have poured on lim while it still converged.']
    ],

    'boss1': [
      ['e_delta', '멈춰. 여기서부터는 내 근방이야.', "Stop. From here on, you're in my neighbourhood."],
      ['Main', '근방? 그냥 지나가려는 건데.', "Neighbourhood? I'm just passing through."],
      ['e_delta', '어떤 ε을 줘도 나는 δ를 찾아내. 가까이 올수록 느려질걸?', "Give me any ε and I'll find a δ. The closer you come, the slower you get."],
      ['Main', '그럼 극한까지 가 보면 되겠네.', "Then I'll take it to the limit."],
      ['e_delta', '좋아. x³ − 3x를 0으로 만들 수 있는지 볼게.', "Fine. Let's see you bring x³ − 3x down to zero."]
    ],
    'boss1-after': [
      ['e_delta', '…수렴했네. 내 δ가 모자랄 줄은 몰랐어.', "…It converged. I didn't think my δ would fall short."],
      ['Main', '다음 문제는 어디야?', "Where's the next problem?"],
      ['e_delta', '쌍곡선 통로 끝. 거긴 접선이 날뛰는 곳이야.', 'At the end of the hyperbolic corridor. The tangents run wild there.']
    ],

    'boss2': [
      ['wei', '어서 와. 미분하러 왔지?', 'Welcome. You came to differentiate, right?'],
      ['Main', '접선만 그으면 끝나는 문제잖아.', "It's just a matter of drawing a tangent."],
      ['wei', '후후, 나는 어디서도 미분이 안 돼. 아무리 확대해도 뾰족하거든.', "Heh. I'm differentiable nowhere. Zoom in all you like, I stay jagged."],
      ['wei', '그래서 내 접선들은 갈 곳을 잃고 폭주해. 점선 위에 서 있지 마!', "So my tangents have nowhere to go, and they run wild. Don't stand on the dashed lines!"],
      ['Main', '점선이 보이면 비키라는 거구나. 알았어.', 'Move when I see the dashes. Got it.']
    ],
    'boss2-after': [
      ['wei', '연속인데도 졌어… 끊기지 않는 게 내 자랑인데.', 'Continuous, and I still lost… Never breaking was my pride.'],
      ['Main', '끊기지 않는 건 인정. 그래도 0이야.', "You never broke, I'll give you that. Still zero."],
      ['wei', '내 파형은 다음 필드까지 이어져 있어. 조심해.', 'My waveform runs on into the next field. Careful.']
    ],

    'mid2': [
      ['riemann', '넓이는 직사각형으로 재는 거야. 자로 한 칸씩, 꼼꼼하게.', 'Area is measured in rectangles. One strip at a time, with a ruler, carefully.'],
      ['Main', 'Σ f(xᵢ)Δx. 칸을 잘게 나눌수록 탄막이 촘촘해지겠지.', 'Σ f(xᵢ)Δx. The finer the slices, the denser the curtain.'],
      ['riemann', '맞아. 나는 n을 계속 늘릴 거야.', 'Right. And I will keep raising n.'],
      ['Main', '그럼 끝까지 보내 주면 돼. lim으로, n → ∞.', 'Then I send it all the way. With lim, n → ∞.']
    ],
    'mid2-after': [
      ['riemann', '막대가 다 사라지고 넓이만 남았어. 딱 2.', 'The bars are all gone and only the area is left. Exactly 2.'],
      ['Main', '이걸 미분하면 다시 sin x… 다음은 접선이구나.', 'Differentiate it and sin x comes back… tangents next, then.']
    ],
    'mid2-escape': [
      ['riemann', 'n이 다 크기도 전에 시간이 끝났네. 넓이는 어림값으로 남겨 둘게.', 'Time ran out before n grew up. I will leave you the area as an estimate.'],
      ['Main', '근삿값으로 끝나다니… lim을 더 썼어야 했어.', 'Left with an approximation… I needed more lim.']
    ],

    'mid3': [
      ['mandel', '내 돋보기로 봐. 경계를 아무리 확대해도 새 무늬가 나와.', 'Look through my glass. Zoom into the edge as far as you like and new patterns keep coming.'],
      ['Main', 'z ↦ z² + c. 0에서 시작한 궤도가 2를 넘지 않으면 c는 망델브로 집합 안이야.', 'z ↦ z² + c. If the orbit of 0 never passes 2, c lies in the Mandelbrot set.'],
      ['Main', '안에 있을 땐 lim이 통하고, 밖으로 나가면 ∞로 튕기겠지.', 'Inside, lim works. Outside, it will bounce off to infinity.']
    ],
    'mid3-after': [
      ['mandel', '경계는 정말 끝이 없지? 다음에 또 확대하러 와.', 'The edge really has no end, does it? Come back and zoom in again sometime.'],
      ['Main', '다음엔 탄 말고 무늬만 보러 올게.', 'Next time I will come for the patterns, not the bullets.']
    ],
    'mid3-escape': [
      ['mandel', '경계를 반도 안 봤는데 벌써 가? 나는 더 확대하러 갈게.', 'You have not seen half the edge yet. I am off to zoom in further.'],
      ['Main', 'c가 집합 안에 있을 때 lim을 맞혔어야 했는데.', 'I should have landed lim while c was inside the set.']
    ],

    'boss3': [
      ['theta', '달이 차고 기우는 것도 결국 회전이야. eⁱᶿ 말이야.', 'The moon waxing and waning is just a rotation too. eⁱᶿ, I mean.'],
      ['Main', '단위원을 도는 거라면 나도 알아.', 'Going round the unit circle? I know that much.'],
      ['theta', '그럼 이것도 알겠네. i를 떼면 나는 eˣ가 돼.', 'Then you know this too: drop the i, and I become eˣ.'],
      ['theta', 'eˣ는 미분해도 eˣ. 네 d/dx로는 흠집도 안 나.', "The derivative of eˣ is eˣ. Your d/dx won't leave a scratch."],
      ['Main', '그때는 ∂/∂y로 바꾸면 돼. y가 없으니까 바로 0이야.', "Then I switch to ∂/∂y. There's no y, so it's zero at once."],
      ['theta', '…얄밉게 정확하네.', '…Annoyingly correct.']
    ],
    'boss3-after': [
      ['theta', 'θ가 한 바퀴 돌았어. 오늘은 여기까지.', "θ has gone all the way round. That's it for today."],
      ['Main', '다음은?', "What's next?"],
      ['theta', '벡터장이야. 이제부터는 선이 아니라 고리로 풀어야 해.', 'Vector fields. From now on you solve with loops, not lines.']
    ],

    'mid4': [
      ['lorenz', '여기서 날갯짓 한 번이면, 저 너머에선 폭풍이야.', 'One flap of my wings here, and over there it is a storm.'],
      ['Main', '나비 날개 모양의 궤도… 로렌츠 끌개야. 처음 값이 조금만 달라도 전혀 다른 데로 가.', 'Orbits shaped like butterfly wings… the Lorenz attractor. Start a hair apart and you end up somewhere else entirely.'],
      ['Main', '그래도 부피는 줄어들어. ∇·F < 0이니까 ∮로 감싸면 돼.', 'Still, volume shrinks. ∇·F < 0, so I can wrap it with ∮.']
    ],
    'mid4-after': [
      ['lorenz', '내 궤도는 같은 길을 두 번 안 가. 그런데도 잡혔네.', 'My orbit never takes the same path twice. And still you caught it.'],
      ['Main', '어디로 갈지는 몰라도, 어디 안에 머물지는 알았거든.', 'I could not tell where it would go, but I knew what it would stay inside.']
    ],
    'mid4-escape': [
      ['lorenz', '바람이 바뀌었어. 내 궤도는 다른 쪽 날개로 넘어갈래.', 'The wind has turned. My orbit is crossing to the other wing.'],
      ['Main', '∮로 감싸기도 전에 날아가 버렸네.', 'It flew off before I could wrap it with ∮.']
    ],

    'boss4': [
      ['vector', '화살표 하나하나가 전부 나야. 이 장 전체가 나라고.', 'Every arrow here is me. This whole field is me.'],
      ['Main', '그럼 어디를 맞혀야 하는데?', 'Then where am I supposed to hit?'],
      ['vector', '맞히는 게 아니라 감싸는 거야. 경계에서 적분하면 안쪽이 다 보이거든.', "You don't hit, you enclose. Integrate along the boundary and the inside shows."],
      ['vector', '발산할 때는 크기 상관없이 감싸기만 해. 회전할 때는… 크게 그릴수록 아프지.', 'While I diverge, any loop around me will do. While I curl… the bigger you draw, the more it hurts.'],
      ['Main', '가우스랑 스토크스네. ∮로 크게 한 바퀴.', 'Gauss and Stokes. One big lap with ∮.']
    ],
    'boss4-after': [
      ['vector', '속이 다 들켰네. 경계만 봤는데도.', 'You saw right through me, from the boundary alone.'],
      ['Main', '그게 정리가 하는 일이니까.', "That's what theorems are for."],
      ['vector', '다음 장에서는 화살표가 휘어. 행렬이 기다리고 있어.', 'Next, the arrows bend. A matrix is waiting.']
    ],

    'mid5': [
      ['fib', '1, 1, 2, 3, 5, 8! 해바라기 씨는 137.5°씩 돌면서 박혀.', '1, 1, 2, 3, 5, 8! Sunflower seeds go in at 137.5° steps.'],
      ['Main', '[1 1; 1 0]의 거듭제곱이야. 역행렬이면 거꾸로 셀 수 있어.', 'Powers of [1 1; 1 0]. With the inverse I can count backwards.'],
      ['fib', '거꾸로? 8, 5, 3, 2, 1, 1… 그러면 0까지 가잖아!', 'Backwards? 8, 5, 3, 2, 1, 1… that goes all the way to 0!']
    ],
    'mid5-after': [
      ['fib', 'Fₙ₊₁/Fₙ → φ. 꽃잎도 솔방울도 다 이 비율이야.', 'Fₙ₊₁/Fₙ → φ. Petals and pine cones all run on this ratio.'],
      ['Main', '세다 보면 황금비가 나오는구나.', 'Count long enough and the golden ratio turns up.']
    ],
    'mid5-escape': [
      ['fib', '다음 항 세러 가야 해! 13, 21, 34…', 'I have the next terms to count! 13, 21, 34…'],
      ['Main', 'A⁻¹로 거꾸로 세서 0까지 보내 줬어야 했는데.', 'I should have counted her back down to 0 with A⁻¹.']
    ],

    'boss5': [
      ['matrix', '내 곁에 오는 건 전부 A를 곱해서 돌려보내.', 'Whatever comes near me goes back multiplied by A.'],
      ['Main', '내 탄도 휘겠네.', 'So my shots bend too.'],
      ['matrix', '휘는 게 싫으면 고유벡터 방향으로 쏘든가. 그쪽은 늘어나기만 하니까.', 'If you hate bending, shoot along an eigenvector. That way only stretches.'],
      ['Main', '아니면 A⁻¹로 처음부터 되돌려 놓든가.', 'Or undo it from the start with A⁻¹.'],
      ['matrix', '역행렬? 행렬식이 0이 되기 전까지만 통할걸.', 'The inverse? Only until the determinant hits zero.']
    ],
    'boss5-after': [
      ['matrix', 'det A = 0… 이제 아무것도 되돌릴 수 없어.', 'det A = 0… Nothing can be undone now.'],
      ['Main', '되돌릴 필요 없어. 이미 0이니까.', "No need. It's already zero."],
      ['matrix', '다음은 스펙트럼이야. 소리를 주파수로 쪼개는 애가 있어.', 'Next is the spectrum. Someone there splits sound into frequencies.']
    ],

    'mid6': [
      ['prime', '1과 자기 자신으로만 나뉘는 수. 내 두루마리에는 그런 수만 적혀.', 'Numbers divisible only by 1 and themselves. Only those go on my scroll.'],
      ['Main', '숫자가 하나씩 올라가고 있어. 소수일 때만 제대로 들어가는 것 같아.', 'The number keeps climbing. Hits only really land while it is prime.'],
      ['prime', '체를 내려라. 배수는 전부 걸러 내!', 'Lower the sieve. Strain out every multiple!'],
      ['Main', '배수 자리만 비어 있어. 저기로 빠져나가자!', 'Only the multiples are left open. Through there!']
    ],
    'mid6-after': [
      ['prime', '아무리 걸러도 소수는 끝없이 남아.', 'Sieve as long as you like; the primes keep coming.'],
      ['Main', '유클리드가 벌써 증명했지. 그건 인정할게.', 'Euclid proved that long ago. I will grant you that.']
    ],
    'mid6-escape': [
      ['prime', '체는 아직 다 거르지 못했다. 다음 소수에서 다시 보자.', 'The sieve is not finished. We meet again at the next prime.'],
      ['Main', 'n이 소수일 때를 노렸어야 했어.', 'I should have struck while n was prime.']
    ],

    'boss6': [
      ['fourier', '들려? 모든 신호는 사인파의 합이야.', 'Hear that? Every signal is a sum of sine waves.'],
      ['Main', '필드에서 sin 카드를 ℱ로 쪼개 봤어. δ 두 개가 되던데.', 'I split a sine card with ℱ out in the field. It became two δs.'],
      ['fourier', '그럼 거꾸로도 해 봐야지. ℒ⁻¹는 극에서 나와.', 'Then try it backwards. ℒ⁻¹ comes from the poles.'],
      ['fourier', '× 표시가 극이야. ∮로 하나씩 감싸면 2πi·Res만큼 깎여.', 'The × marks are poles. Enclose one with ∮ and it costs me 2πi·Res.'],
      ['Main', '둘을 같이 감싸면?', 'And if I enclose two at once?'],
      ['fourier', '유수가 상쇄되면 0. 욕심내면 손해야.', "If the residues cancel, zero. Greed doesn't pay."]
    ],
    'boss6-after': [
      ['fourier', '공명이 멈췄어. 깨끗한 0이네.', 'The resonance has stopped. A clean zero.'],
      ['Main', '마지막 문제만 남았어.', 'Only the last problem left.'],
      ['fourier', '마지막 장은 확률과 확산이야. 정해진 궤적이 없는 곳.', 'The last chapter is chance and diffusion. Nothing there keeps to a path.']
    ],

    'mid7': [
      ['stat', '어머, 손님이네! 운이 좋은지 한번 볼까?', "Oh, a visitor! Shall we see how lucky you are?"],
      ['Main', '운이 아니라 기댓값으로 풀 거야.', "Not luck. I'm solving this with expectation."],
      ['stat', '브라운 운동은 어디서도 미분이 안 돼. 네 미분탄은 다 튕겨 나갈걸?', 'Brownian motion is differentiable nowhere. Your derivatives will bounce right off.'],
      ['Main', '그래서 𝔼를 받았지. 평균을 내면 0이야.', 'Which is why I got 𝔼. Take the mean and it is zero.'],
      ['stat', '큰 수의 법칙? 표본이 충분할 때까지 버텨 봐!', 'The law of large numbers? Hold out until your sample is big enough!']
    ],
    'mid7-after': [
      ['stat', '평균으로 수렴해 버렸네… 라플라는 나처럼 봐주지 않을 거야.', "Converged to the mean… Lapla won't go easy on you like I did."]
    ],
    'mid7-escape': [
      ['stat', '표본이 모자랐네! 평균은 다음에 내자고.', 'Not enough samples! We will take the mean another time.'],
      ['Main', '𝔼로 더 빨리 평균을 냈어야 했는데.', 'I should have taken the mean with 𝔼 sooner.']
    ],

    'boss7': [
      ['DE', '하프 소리가 퍼지듯이 농도도 퍼져 나가.', 'Like the sound of a harp, concentration spreads.'],
      ['Main', '화면이 주황색으로 물들고 있어…', 'The whole page is turning orange…'],
      ['DE', '∂u/∂t = DΔu + f(u). 진한 곳마다 탄이 피어나.', '∂u/∂t = DΔu + f(u). Wherever it is thick, bullets bloom.'],
      ['Main', '샷이 지나간 자리는 옅어지던데.', 'It thinned out wherever my shots went.'],
      ['DE', '그래, 지워 봐. 다 지우기 전에 다시 퍼지겠지만.', "Go on, wipe it away. It will spread again before you're done."],
      ['Main', '마지막 문제야. 이것까지 0으로 만들고 나갈게.', "This is the last problem. I'm taking it to zero and walking out."]
    ],
    'boss7-after': [
      ['DE', '…평형이야. u = 0. 더는 퍼지지 않아.', "…Equilibrium. u = 0. It won't spread any more."],
      ['Main', '다 풀었다. 이제 시험지 밖으로 나갈 수 있겠지?', 'All solved. Now I can get out of the exam sheet, right?'],
      ['DE', '답안지는 제출됐어. 채점은 Q.E.D.가 해 줄 거야.', 'Your answer sheet is in. Q.E.D. will do the grading.']
    ],

    // ── EX1 휘어진 공간 (boss8–boss10) ──
    'ex1': [
      ['Main', '시험은 끝났는데… 모눈종이가 휘어 있어.', 'The exam is over… but the graph paper is bent.'],
      ['Main', '좌표도, 거리도, 끝과 끝도 믿을 수 없겠네.', 'I cannot trust the coordinates, the distances, or even where the edges are.']
    ],
    'boss8': [
      ['polar', '여기선 위아래가 아니라 가깝고 먼 것, 좌우가 아니라 도는 거야.', 'Here it is not up and down but near and far, not left and right but round.'],
      ['Main', '방향키가 r과 θ가 됐어…', 'My arrow keys turned into r and θ…'],
      ['polar', '중심을 돌면서 틈을 찾아. 한 바퀴는 2π야.', 'Circle the centre and find the gap. One lap is 2π.']
    ],
    'boss9': [
      ['torus', '화면 끝은 끝이 아니야. 오른쪽으로 나가면 왼쪽에서 들어오지.', 'The edge is not an edge. Leave on the right and you come back on the left.'],
      ['Main', '도넛 위에 서 있는 거구나.', 'So I am standing on a doughnut.'],
      ['torus', '도넛이 뒤집히면 클라인 병, 더 뒤집히면 사영평면. 따라올 수 있겠어?', 'Twist the doughnut and it is a Klein bottle; twist again and it is the projective plane. Can you keep up?']
    ],
    'boss10': [
      ['hyperbolic', '평행선 공준은 잊어. 여기선 한 점을 지나는 평행선이 무한히 많아.', 'Forget the parallel postulate. Here infinitely many parallels pass through one point.'],
      ['Main', '가장자리로 갈수록 내가 작아지는 것 같아.', 'I seem to shrink the closer I get to the edge.'],
      ['hyperbolic', '가장자리는 무한히 멀거든. 거기까지는 아무도 못 가.', 'The edge is infinitely far away. Nobody ever gets there.']
    ],
    'boss10-after': [
      ['hyperbolic', '무한히 먼 곳까지 쫓아왔구나.', 'You followed me all the way to infinity.'],
      ['Main', '공간이 휘어도 답은 하나야.', 'Bend the space all you like; there is still one answer.']
    ],

    // ── EX2 물리 (boss11–boss16) ──
    'ex2': [
      ['Main', '이번엔 수식이 아니라 물리야. 만년필 대신 전하랑 구랑 빛을 써야겠어.', 'Physics this time, not formulas. Charges, spheres and light instead of my pen.'],
      ['Main', '1 전하탄, 2 강체 구, 3 집광 레이저, 4 중력 우물.', '1 charge, 2 rigid sphere, 3 focused laser, 4 gravity well.']
    ],
    'boss11': [
      ['maxwell', '자기장이 바뀌면 전기장이 생기고, 전기장이 바뀌면 자기장이 생겨.', 'A changing magnetic field makes an electric one, and the other way round.'],
      ['Main', '그렇게 서로를 부르면서 빛이 되는 거지.', 'And calling each other like that, they become light.'],
      ['maxwell', '그 빛이 너를 쫓아갈 거야. 나는 음전하니까 + 전하는 끌려오겠지만.', 'That light will chase you. I am negative, though, so your + charges will be drawn to me.']
    ],
    'boss12': [
      ['rigid', '강체는 모양이 변하지 않아. 그저 돌 뿐이지.', 'A rigid body never changes shape. It only turns.'],
      ['Main', '팔 사이로 빠져나가면 되겠네.', 'Then I slip through between the arms.'],
      ['rigid', '가운데 축으로 돌 땐 조심해. 그 축은 불안정해서 뒤집히거든.', 'Careful when I spin about the middle axis. It is unstable; I flip.']
    ],
    'boss13': [
      ['relativity', '질량은 에너지야. E = mc². 쏠 때마다 내 질량이 줄어들지.', 'Mass is energy. E = mc². Every volley costs me mass.'],
      ['Main', '그럼 버티기만 해도 가벼워지겠네.', 'So you get lighter if I just hold out.'],
      ['relativity', '대신 내 근처에선 시간이 느리게 가. 탄이 쌓였다가 한꺼번에 풀릴 거야.', 'But near me time runs slow. The bullets pile up and then all come at once.']
    ],
    'boss14': [
      ['thermo', '뜨거운 곳에서 열을 받아 일을 하고, 차가운 곳으로 내보내. 그게 순환이야.', 'Take heat from the hot side, do work, give the rest to the cold side. That is the cycle.'],
      ['Main', '그 고리를 탄이 돌고 있어.', 'And bullets are riding that loop.'],
      ['thermo', '그리고 엔트로피는 줄지 않아. 시간이 갈수록 더 어지러워질 거야.', 'And entropy never goes down. It only gets messier from here.']
    ],
    'boss15': [
      ['fluid', '흐름은 부드럽지만, 소용돌이는 놓아주지 않아.', 'The flow is gentle, but a vortex does not let go.'],
      ['Main', '가까이 가면 끌려가는구나.', 'Get close and it drags you in.'],
      ['fluid', '레이놀즈 수가 커지면 소용돌이가 줄지어 떨어져. 카르만 소용돌이 길이야.', 'Raise the Reynolds number and the vortices peel off in a row. A Kármán street.']
    ],
    'boss16': [
      ['optics', '빛은 시간이 가장 적게 걸리는 길로 가. 페르마의 원리야.', 'Light takes the path of least time. Fermat’s principle.'],
      ['Main', '거울에 반사되는 빛, 렌즈에 모이는 빛…', 'Light bouncing off mirrors, light gathered by a lens…'],
      ['optics', '점선이 보이면 곧 빛이 지나가. 네 레이저도 내 거울에 반사된다는 걸 잊지 마.', 'When you see dashes, light is on its way. And remember, your laser reflects off my mirrors too.']
    ],
    'boss16-after': [
      ['optics', '빛보다 빨리 피할 수는 없을 텐데… 대단하네.', 'Nobody dodges faster than light… and yet.'],
      ['Main', '수학도 물리도 다 풀었어. Q.E.D.', 'Mathematics and physics, all solved. Q.E.D.']
    ]
  }
};
