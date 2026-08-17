import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function extractCleanHtml(rawText: string): string {
  if (!rawText) return '';
  const text = rawText.trim();

  // 1. Match <!DOCTYPE html> ... </html>
  const doctypeMatch = text.match(/<!DOCTYPE\s+html[\s\S]*?<\/html>/i);
  if (doctypeMatch) {
    return doctypeMatch[0].trim();
  }

  // 2. Match <html ... </html>
  const htmlMatch = text.match(/<html[\s\S]*?<\/html>/i);
  if (htmlMatch) {
    return `<!DOCTYPE html>\n${htmlMatch[0].trim()}`;
  }

  // 3. Match inside markdown code blocks ```html ... ``` or ``` ... ```
  const codeBlockMatch = text.match(/```(?:html)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    const inner = codeBlockMatch[1].trim();
    const innerDoctype = inner.match(/<!DOCTYPE\s+html[\s\S]*?<\/html>/i);
    if (innerDoctype) return innerDoctype[0].trim();
    const innerHtml = inner.match(/<html[\s\S]*?<\/html>/i);
    if (innerHtml) return `<!DOCTYPE html>\n${innerHtml[0].trim()}`;
    return `<!DOCTYPE html>\n<html>\n<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>\n<body>\n${inner}\n</body>\n</html>`;
  }

  // 4. Fallback: extract substring between first '<' and last '>'
  const firstTagIndex = text.indexOf('<');
  const lastTagIndex = text.lastIndexOf('>');
  if (firstTagIndex !== -1 && lastTagIndex !== -1 && lastTagIndex > firstTagIndex) {
    const candidate = text.slice(firstTagIndex, lastTagIndex + 1).trim();
    if (candidate.startsWith('<!DOCTYPE') || candidate.startsWith('<html')) {
      return candidate;
    }
  }

  return text;
}

function generateFallbackPlayfulGameHtml(
  title: string,
  subject: string,
  turma: string,
  description: string,
  questions: any[],
  maxGrade: number
): string {
  const safeTitle = title || 'Atividade Interativa de Sociologia';
  const safeSubject = subject || 'Sociologia';
  const safeMaxGrade = maxGrade || 10;
  const safeDesc = description || 'Vamos aprender e explorar juntos os conceitos desta atividade de forma divertida e acolhedora.';

  // Build challenges from questions or generate 5 progressive pedagogical stages
  let challenges: { question: string; options: { text: string; correct: boolean; icon: string }[]; svgType: string }[] = [];

  if (Array.isArray(questions) && questions.length > 0) {
    challenges = questions.slice(0, 6).map((q: any, i: number) => {
      const svgTypes = ['book', 'community', 'justice', 'globe', 'idea', 'trophy'];
      const currentSvg = svgTypes[i % svgTypes.length];
      
      if (q.type === 'multiple_choice' && Array.isArray(q.options) && q.options.length >= 2) {
        const correctIdx = typeof q.correctOptionIndex === 'number' ? q.correctOptionIndex : 0;
        const opt1 = q.options[0] || 'Opção A';
        const opt2 = q.options[1] || 'Opção B';
        return {
          question: q.statement || `Desafio ${i + 1}: Qual é a resposta correta?`,
          svgType: currentSvg,
          options: [
            { text: opt1, correct: correctIdx === 0, icon: '🌟' },
            { text: opt2, correct: correctIdx === 1, icon: '✨' },
          ],
        };
      } else {
        return {
          question: q.statement || `Desafio ${i + 1}: Reflexão sobre ${safeTitle}`,
          svgType: currentSvg,
          options: [
            { text: 'Concordo e Compreendo', correct: true, icon: '👍' },
            { text: 'Preciso Rever', correct: false, icon: '🔄' },
          ],
        };
      }
    });
  }

  if (challenges.length === 0) {
    challenges = [
      {
        question: `Fase 1: O que nós estudamos quando falamos sobre "${safeTitle}"?`,
        svgType: 'community',
        options: [
          { text: 'Como as pessoas vivem em sociedade e cooperam', correct: true, icon: '👥' },
          { text: 'Como os robôs constroem carros sozinhos', correct: false, icon: '🤖' },
        ],
      },
      {
        question: `Fase 2: Para termos uma boa convivência na escola e na vida, o que é mais importante?`,
        svgType: 'justice',
        options: [
          { text: 'Respeito mútuo, empatia e diálogo', correct: true, icon: '🤝' },
          { text: 'Ignorar as regras e não ouvir ninguém', correct: false, icon: '❌' },
        ],
      },
      {
        question: `Fase 3: Como podemos ajudar nossos colegas no dia a dia?`,
        svgType: 'idea',
        options: [
          { text: 'Compartilhando saberes e sendo gentis', correct: true, icon: '💡' },
          { text: 'Guardando tudo apenas para nós mesmos', correct: false, icon: '🔒' },
        ],
      },
      {
        question: `Fase 4: A diversidade de ideias e culturas enriquece nossa sociedade?`,
        svgType: 'globe',
        options: [
          { text: 'Sim! Cada pessoa traz valor e aprendizado', correct: true, icon: '🌍' },
          { text: 'Não! Todos deveriam ser sempre iguais', correct: false, icon: '⏹️' },
        ],
      },
      {
        question: `Fase 5: Parabéns pelo percurso! Qual é o próximo passo na nossa jornada cidadã?`,
        svgType: 'trophy',
        options: [
          { text: 'Continuar aprendendo com alegria e dedicação', correct: true, icon: '🏆' },
          { text: 'Parar de estudar e desistir', correct: false, icon: '🛑' },
        ],
      },
    ];
  }

  const challengesJson = JSON.stringify(challenges);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <title>${safeTitle} - Jogo Lúdico</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; user-select: none; }
    body { background: #0b1326; color: #dae2fd; min-height: 100vh; width: 100vw; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow-x: hidden; padding: 16px; }
    .game-card { background: #131b2e; border: 1px solid rgba(255,255,255,0.12); border-radius: 28px; width: 100%; max-width: 640px; min-height: 520px; padding: 28px; display: flex; flex-direction: column; justify-content: space-between; position: relative; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
    .header-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .badge { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.35); font-size: 13px; font-weight: bold; padding: 6px 14px; border-radius: 9999px; }
    .stars-badge { background: rgba(74, 222, 128, 0.15); color: #4ade80; border: 1px solid rgba(74, 222, 128, 0.3); font-size: 14px; font-weight: bold; padding: 6px 14px; border-radius: 9999px; display: flex; align-items: center; gap: 6px; }
    .progress-track { width: 100%; height: 8px; background: rgba(255,255,255,0.1); border-radius: 9999px; margin-bottom: 20px; overflow: hidden; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #f59e0b, #4ade80); width: 0%; transition: width 0.4s ease; }
    .svg-container { display: flex; justify-content: center; align-items: center; margin: 12px 0 16px 0; }
    .svg-container svg { width: 110px; height: 110px; filter: drop-shadow(0 6px 12px rgba(0,0,0,0.3)); }
    .title-lg { font-size: 22px; font-weight: 800; color: #ffffff; text-align: center; line-height: 1.35; margin-bottom: 8px; }
    .desc-text { font-size: 15px; color: #bccabb; text-align: center; line-height: 1.5; margin-bottom: 16px; }
    .tts-btn { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #ffffff; padding: 10px 18px; border-radius: 9999px; font-size: 13px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; margin: 0 auto 16px auto; transition: all 0.2s ease; }
    .tts-btn:hover { background: rgba(255,255,255,0.15); transform: scale(1.02); }
    .options-grid { display: flex; flex-direction: column; gap: 12px; margin-top: 10px; width: 100%; }
    .option-btn { background: #1c2744; border: 2px solid rgba(255,255,255,0.15); color: #ffffff; padding: 18px 20px; border-radius: 20px; font-size: 17px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 14px; text-align: left; transition: all 0.2s ease; min-height: 64px; }
    .option-btn:hover { background: #26355d; border-color: #fbbf24; transform: translateY(-2px); }
    .option-btn.correct { background: rgba(74, 222, 128, 0.25); border-color: #4ade80; color: #ffffff; }
    .option-btn.wrong { background: rgba(244, 63, 94, 0.2); border-color: #f43f5e; color: #ffffff; }
    .nav-bar { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; gap: 12px; }
    .btn-back { background: transparent; border: 1px solid rgba(255,255,255,0.2); color: #bccabb; padding: 12px 20px; border-radius: 9999px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s ease; }
    .btn-back:hover { background: rgba(255,255,255,0.08); color: #ffffff; }
    .btn-primary { background: #f59e0b; color: #1e1b4b; border: none; padding: 16px 28px; border-radius: 9999px; font-size: 16px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 10px; transition: all 0.2s ease; width: 100%; box-shadow: 0 6px 20px rgba(245, 158, 11, 0.35); }
    .btn-primary:hover { background: #fbbf24; transform: scale(1.02); }
    .btn-finish { background: #4ade80; color: #052e16; border: none; padding: 18px 28px; border-radius: 9999px; font-size: 18px; font-weight: 800; cursor: pointer; width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px; transition: all 0.2s ease; box-shadow: 0 6px 20px rgba(74, 222, 128, 0.35); }
    .btn-finish:hover { background: #86efac; transform: scale(1.02); }
    .feedback-toast { text-align: center; font-size: 15px; font-weight: bold; padding: 10px; border-radius: 14px; margin-top: 10px; min-height: 40px; display: flex; align-items: center; justify-content: center; }
  </style>
</head>
<body>
  <div class="game-card" id="card">
    <!-- Header -->
    <div class="header-bar">
      <span class="badge" id="step-badge">Boas-vindas</span>
      <span class="stars-badge" id="stars-badge">⭐ 0 Estrelas</span>
    </div>

    <div class="progress-track">
      <div class="progress-fill" id="progress-fill"></div>
    </div>

    <!-- Content Area -->
    <div id="content-body" style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1;">
      <!-- Populated via JavaScript -->
    </div>

    <!-- Footer Navigation -->
    <div class="nav-bar" id="nav-bar">
      <!-- Populated via JavaScript -->
    </div>
  </div>

  <script>
    const challenges = ${challengesJson};
    const MAX_GRADE = ${safeMaxGrade};
    const TITLE = ${JSON.stringify(safeTitle)};
    const DESC = ${JSON.stringify(safeDesc)};

    let currentStep = -1; // -1: Intro, 0..N-1: Challenges, N: Result
    let score = 0;
    let earnedStars = 0;
    let answered = {};

    // Web Audio Sound Synthesizer
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    function playTone(freq, duration, type = 'sine') {
      try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
      } catch (e) {
        console.warn('Audio not allowed yet:', e);
      }
    }

    function playSuccessSound() {
      playTone(523.25, 0.15);
      setTimeout(() => playTone(659.25, 0.25), 120);
    }

    function playNeutralSound() {
      playTone(392, 0.2, 'triangle');
    }

    // TTS Web Speech
    function speakText(text) {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'pt-BR';
      utter.rate = 0.95;
      window.speechSynthesis.speak(utter);
    }

    // SVG Bank
    const svgs = {
      welcome: \`<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="45" fill="#1e293b" stroke="#f59e0b" stroke-width="4"/>
        <path d="M50 20L58 37L77 39L63 52L67 71L50 61L33 71L37 52L23 39L42 37L50 20Z" fill="#fbbf24"/>
        <circle cx="50" cy="50" r="14" fill="#f59e0b"/>
      </svg>\`,
      book: \`<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="15" y="25" width="32" height="50" rx="4" fill="#3b82f6"/>
        <rect x="53" y="25" width="32" height="50" rx="4" fill="#60a5fa"/>
        <path d="M15 75C30 70 45 75 50 78C55 75 70 70 85 75" stroke="#ffffff" stroke-width="3"/>
        <path d="M22 38H40M22 48H40M60 38H78M60 48H78" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
      </svg>\`,
      community: \`<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="35" r="14" fill="#4ade80"/>
        <circle cx="28" cy="42" r="11" fill="#60a5fa"/>
        <circle cx="72" cy="42" r="11" fill="#f472b6"/>
        <path d="M30 78C30 65 40 58 50 58C60 58 70 65 70 78" fill="#4ade80"/>
        <path d="M14 80C14 70 22 65 30 65C34 65 38 67 40 70" stroke="#60a5fa" stroke-width="4" stroke-linecap="round"/>
        <path d="M86 80C86 70 78 65 70 65C66 65 62 67 60 70" stroke="#f472b6" stroke-width="4" stroke-linecap="round"/>
      </svg>\`,
      justice: \`<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <line x1="50" y1="20" x2="50" y2="80" stroke="#fbbf24" stroke-width="6" stroke-linecap="round"/>
        <line x1="25" y1="35" x2="75" y2="35" stroke="#fbbf24" stroke-width="5" stroke-linecap="round"/>
        <path d="M25 35L15 60H35L25 35Z" fill="#f59e0b"/>
        <path d="M75 35L65 60H85L75 35Z" fill="#f59e0b"/>
        <rect x="35" y="80" width="30" height="8" rx="4" fill="#fbbf24"/>
      </svg>\`,
      globe: \`<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="38" fill="#0284c7" stroke="#38bdf8" stroke-width="4"/>
        <path d="M30 35C40 30 45 45 60 40C68 37 75 42 80 50C70 65 55 60 45 75C35 70 25 55 30 35Z" fill="#22c55e"/>
        <ellipse cx="50" cy="50" rx="38" ry="16" stroke="rgba(255,255,255,0.4)" stroke-width="2" fill="none"/>
      </svg>\`,
      idea: \`<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 18C36 18 25 29 25 43C25 52 30 58 35 64V72H65V64C70 58 75 52 75 43C75 29 64 18 50 18Z" fill="#fbbf24"/>
        <rect x="38" y="74" width="24" height="6" rx="2" fill="#94a3b8"/>
        <rect x="42" y="82" width="16" height="5" rx="2" fill="#64748b"/>
        <path d="M50 8L50 14M20 28L25 32M80 28L75 32" stroke="#f59e0b" stroke-width="4" stroke-linecap="round"/>
      </svg>\`,
      trophy: \`<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M30 25H70V50C70 61 61 70 50 70C39 70 30 61 30 50V25Z" fill="#fbbf24"/>
        <path d="M30 32H18C14 32 12 36 14 42C16 48 22 52 30 52V32Z" fill="#f59e0b"/>
        <path d="M70 32H82C86 32 88 36 86 42C84 48 78 52 70 52V32Z" fill="#f59e0b"/>
        <rect x="45" y="70" width="10" height="15" fill="#f59e0b"/>
        <rect x="30" y="85" width="40" height="8" rx="4" fill="#fbbf24"/>
      </svg>\`
    };

    function renderScreen() {
      const content = document.getElementById('content-body');
      const nav = document.getElementById('nav-bar');
      const badge = document.getElementById('step-badge');
      const starsBadge = document.getElementById('stars-badge');
      const progress = document.getElementById('progress-fill');

      starsBadge.innerHTML = \`⭐ \${earnedStars} Estrelas\`;

      // 1. TELA DE INTRODUÇÃO
      if (currentStep === -1) {
        badge.innerText = 'Início da Atividade';
        progress.style.width = '5%';
        content.innerHTML = \`
          <div class="svg-container">\${svgs.welcome}</div>
          <h1 class="title-lg">\${TITLE}</h1>
          <p class="desc-text">\${DESC}</p>
          <button class="tts-btn" onclick="speakText('\${TITLE}. \${DESC}')">🔊 Ouvir Enunciado</button>
        \`;
        nav.innerHTML = \`
          <button class="btn-primary" onclick="goToStep(0)">🚀 Começar Atividade</button>
        \`;
        return;
      }

      // 2. TELAS DOS DESAFIOS
      if (currentStep >= 0 && currentStep < challenges.length) {
        const ch = challenges[currentStep];
        const pct = Math.round(((currentStep + 1) / challenges.length) * 100);
        badge.innerText = \`Fase \${currentStep + 1} de \${challenges.length}\`;
        progress.style.width = \`\${pct}%\`;

        const isAnswered = answered[currentStep] !== undefined;
        const selectedIdx = answered[currentStep];
        const svgIcon = svgs[ch.svgType] || svgs.book;

        let optionsHtml = '';
        ch.options.forEach((opt, idx) => {
          let btnClass = 'option-btn';
          if (isAnswered) {
            if (opt.correct) btnClass += ' correct';
            else if (selectedIdx === idx) btnClass += ' wrong';
          }
          optionsHtml += \`
            <button class="\${btnClass}" onclick="handleAnswer(\${idx})" \${isAnswered ? 'disabled' : ''}>
              <span style="font-size: 26px;">\${opt.icon || '✨'}</span>
              <span>\${opt.text}</span>
            </button>
          \`;
        });

        content.innerHTML = \`
          <div class="svg-container">\${svgIcon}</div>
          <h2 class="title-lg" style="font-size: 19px;">\${ch.question}</h2>
          <button class="tts-btn" onclick="speakText('\${ch.question}')">🔊 Ouvir Questão</button>
          <div class="options-grid">\${optionsHtml}</div>
          <div class="feedback-toast" id="toast-msg">
            \${isAnswered ? (ch.options[selectedIdx]?.correct ? '🎉 Excelente! Resposta certa!' : '👍 Muito bom esforço! Vamos continuar!') : 'Toque na resposta que você acha mais adequada:'}
          </div>
        \`;

        nav.innerHTML = \`
          <button class="btn-back" onclick="goToStep(\${currentStep - 1})">⬅️ Voltar</button>
          \${isAnswered ? \`<button class="btn-primary" style="width: auto;" onclick="goToStep(\${currentStep + 1})">\${currentStep === challenges.length - 1 ? 'Ver Resultado 🏆' : 'Próxima Fase ➡️'}</button>\` : ''}
        \`;
        return;
      }

      // 3. TELA DE RESULTADO FINAL
      if (currentStep >= challenges.length) {
        badge.innerText = 'Atividade Concluída!';
        progress.style.width = '100%';
        const finalGrade = ((score / challenges.length) * MAX_GRADE).toFixed(1);
        const percentage = Math.round((score / challenges.length) * 100);

        content.innerHTML = \`
          <div class="svg-container">\${svgs.trophy}</div>
          <h1 class="title-lg" style="color: #4ade80;">Parabéns! Missão Cumprida!</h1>
          <p class="desc-text">Você concluiu todos os desafios desta atividade adaptada com sucesso!</p>
          <div style="background: rgba(255,255,255,0.06); padding: 18px 24px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.12); width: 100%; text-align: center; margin-bottom: 16px;">
            <div style="font-size: 13px; color: #bccabb; font-weight: bold; text-transform: uppercase;">Sua Nota Conquistada:</div>
            <div style="font-size: 36px; font-weight: 900; color: #fbbf24; margin: 4px 0;">\${finalGrade} <span style="font-size: 18px; color: #bccabb;">/ \${MAX_GRADE}</span></div>
            <div style="font-size: 14px; color: #4ade80; font-weight: bold;">⭐ \${earnedStars} Estrelas Acumuladas (\${percentage}% de acerto)</div>
          </div>
        \`;

        nav.innerHTML = \`
          <button class="btn-back" onclick="restartGame()">🔄 Fazer de Novo</button>
          <button class="btn-finish" onclick="submitFinalScore(\${score}, \${MAX_GRADE}, \${percentage}, \${finalGrade})">🚀 Finalizar e Enviar Nota</button>
        \`;
      }
    }

    function goToStep(step) {
      currentStep = step;
      renderScreen();
    }

    function handleAnswer(optIdx) {
      if (answered[currentStep] !== undefined) return;
      answered[currentStep] = optIdx;
      const isCorrect = challenges[currentStep].options[optIdx]?.correct;

      if (isCorrect) {
        score++;
        earnedStars += 2;
        playSuccessSound();
      } else {
        earnedStars += 1;
        playNeutralSound();
      }

      renderScreen();

      // Auto-avanço suave após 750ms
      const thisStep = currentStep;
      setTimeout(() => {
        if (currentStep === thisStep) {
          goToStep(currentStep + 1);
        }
      }, 750);
    }

    function restartGame() {
      currentStep = -1;
      score = 0;
      earnedStars = 0;
      answered = {};
      renderScreen();
    }

    function submitFinalScore(scr, maxScr, pct, calcGrade) {
      if (window.parent) {
        window.parent.postMessage({
          type: 'PLAYFUL_GAME_COMPLETED',
          score: scr,
          maxScore: maxScr,
          percentage: pct,
          finalGrade: Number(calcGrade) || scr,
        }, '*');
      }
    }

    // Inicialização
    renderScreen();
  </script>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'Chave GEMINI_API_KEY não configurada no servidor. Adicione a variável de ambiente GEMINI_API_KEY.',
        },
        { status: 500 }
      );
    }

    const {
      title,
      subject = 'Sociologia',
      description = '',
      turma = '',
      questions = [],
      maxGrade = 10,
      customPrompt = '',
    } = await req.json();

    const ai = new GoogleGenAI({ apiKey });

    // Format questions context
    const questionsSummary = Array.isArray(questions) && questions.length > 0
      ? questions
          .map((q: any, i: number) => {
            if (q.type === 'multiple_choice') {
              return `Questão ${i + 1}: ${q.statement} | Alternativas: ${(q.options || []).join(' / ')} | Resposta correta: ${q.options?.[q.correctOptionIndex] || 'Opção 1'}`;
            }
            return `Questão ${i + 1} (Dissertativa): ${q.statement}`;
          })
          .join('\n')
      : 'Tema geral da atividade: ' + (title || 'Conceitos básicos de Sociologia e Sociedade');

    const prompt = `
Você é um desenvolvedor e pedagogo especialista em Tecnologias Assistivas, Educação Especial Inclusiva (AEE) e Gamificação Acessível.
Sua tarefa é criar um JOGO EDUCATIVO LÚDICO e INTERATIVO em HTML5/CSS3/JavaScript puro (documento único, completo e autocontido) para alunos PNE com deficiências severas (Autismo Severo, Síndrome de Down, Paralisia Cerebral, etc.).

DADOS DA ATIVIDADE ORIGINAL:
- Título: ${title || 'Atividade Interativa'}
- Disciplina: ${subject}
- Turma/Nível: ${turma || 'Geral'}
- Nota Máxima: ${maxGrade}
- Descrição/Conteúdo: ${description}
- Questões de Referência:
${questionsSummary}
${customPrompt ? `\nINSTRUÇÕES ADICIONAIS DO PROFESSOR (PROMPT PERSONALIZADO DO QUE DEVE SER FEITO):\n"""\n${customPrompt}\n"""\n` : ''}

REQUISITOS PEDAGÓGICOS E ESTRUTURAIS OBRIGATÓRIOS DO JOGO LÚDICO:

1. QUANTIDADE DE QUESTÕES E COBERTURA COMPLETA:
   - Gere uma quantidade ABUNDANTE de fases/questões lúdicas (adapte TODAS as questões da atividade original ou crie entre 4 a 6 fases desafiadoras e divertidas sobre o tema).
   - Cada fase deve cobrir um ponto-chave do conteúdo com linguagem simples, acolhedora e direta.
   - Distribua a pontuação igualmente entre as fases, somando exatamente a nota máxima (${maxGrade} pts).

2. ELEMENTOS VISUAIS E ÍCONES LÚDICOS:
   - Use ícones visuais expressivos, emojis temáticos grandes (ex: 🌟, 🤝, 👥, 🏆, 💡, 🌍, 📚, ⚖️) e elementos gráficos coloridos para cada fase e nas opções de resposta.
   - Apresente um visual acolhedor, com ícones em destaque no cabeçalho de cada pergunta para facilitar a compreensão imediata por alunos não alfabetizados ou com dificuldades de leitura.

3. PÁGINA 1: TELA DE ABERTURA COM O ENUNCIADO E INTRODUÇÃO:
   - A PRIMEIRA PÁGINA do jogo deve ser a tela de Apresentação e Enunciado Principal.
   - Exiba um ícone/símbolo acolhedor de boas-vindas.
   - Apresente o Enunciado da Atividade de forma muito clara, amigável, com tipografia grande e acolhedora.
   - RECURSO DE LEITURA POR VOZ (TTS): Inclua um botão bem destacado "🔊 Ouvir Enunciado" que utilize a Web Speech API ('window.speechSynthesis.speak') com voz em português (pt-BR) para ler o enunciado em voz alta com feedback visual durante a fala.
   - BOTÃO "🚀 Começar Atividade": Botão grande e chamativo para avançar para as fases.

4. PÁGINAS DOS DESAFIOS INTERATIVOS (FASES PROGRESSIVAS):
   - Cada fase apresenta 1 desafio lúdico com ícone temático e 2 ou 3 botões grandes com ícones/emojis (ex: 👍 Sim / 👎 Não, ou opções conceituais ilustradas).
   - REGRA OBRIGATÓRIA DE AVANÇO AO CLICAR NA RESPOSTA:
     * Ao clicar em QUALQUER botão de resposta (seja 'Sim', 'Não' ou alternativa), o jogo DEVE obrigatoriamente:
       1) Destacar o botão clicado com cor e feedback visual.
       2) Tocar o som sensorial imediato (Web Audio).
       3) AVANÇAR AUTOMATICAMENTE para a próxima fase após 750ms ('setTimeout(nextPhase, 750)') E exibir o botão '➡️ Próxima Fase'. O jogo NUNCA pode ficar estático ou travado na mesma tela!
   - RECURSO DE LEITURA POR VOZ EM CADA QUESTÃO: Botão "🔊 Ouvir Questão" para ler a pergunta e as opções em voz alta (sempre envolvido em try/catch).
   - BOTÃO VOLTAR OBRIGATÓRIO ("⬅️ Voltar"): Cada tela de desafio DEVE ter um botão "Voltar" para retornar à fase anterior ou à tela de abertura.
   - Barra de progresso visual no topo (ex: "Fase 2 de 5") e estrelas acumuladas.
   - Feedback sensorial imediato: sons suaves gerados via Web Audio API (tons alegres para acerto, tom neutro/acolhedor para tentar de novo), animações visuais comemorativas e confetes/estrelas.

5. PÁGINA FINAL (RESULTADO E PONTUAÇÃO):
   - Exibe ícones de comemoração/troféu, a nota alcançada (até ${maxGrade} pts) e as estrelas conquistadas.
   - BOTÃO "🔄 Fazer de Novo" (ou "Jogar Novamente"): Reinicia as fases para o aluno praticar mais vezes.
   - BOTÃO "⬅️ Voltar": Para voltar à última fase.
   - BOTÃO "🚀 Finalizar e Enviar Nota": Chama window.parent.postMessage({ type: 'PLAYFUL_GAME_COMPLETED', score: currentScore, maxScore: ${maxGrade}, percentage: pct, finalGrade: calculatedGrade }, '*').

6. DESIGN VISUAL E RESPONSIVIDADE:
   - Preencha 100% da tela (height: 100vh; width: 100vw; margin: 0; box-sizing: border-box; background: #0b1326; color: #ffffff; overflow-y: auto;).
   - Borda discreta (border: 1px solid rgba(255,255,255,0.1); border-radius: 16px;).
   - Botões táteis com altura mínima de 56px, alto contraste e fontes legíveis (18px a 28px).

7. REGRA CRÍTICA DE RETORNO:
   - Retorne ESTRITAMENTE o código HTML completo iniciando em <!DOCTYPE html> e finalizando em </html>.
   - NÃO ESCREVA NENHUM COMENTÁRIO, PREÂMBULO OU TEXTO EXPLICATIVO FORA DO CÓDIGO HTML.
`;

    const candidateModels = [
      'gemini-3.1-flash-lite',
      'gemini-3.7-flash',
      'gemini-flash-latest',
    ];

    let response: any = null;
    let lastError: any = null;

    for (const modelName of candidateModels) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
          });
          if (response && response.text) {
            break;
          }
        } catch (err: any) {
          lastError = err;
          const status = err?.status || err?.code;
          const errMsg = String(err?.message || '');
          const isQuotaExhausted = status === 429 || errMsg.includes('Quota exceeded') || errMsg.includes('RESOURCE_EXHAUSTED');
          const isHighDemand = status === 503 || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE');

          console.warn(`Tentativa ${attempt} com ${modelName} na geração do jogo:`, errMsg || err);

          // Se a cota do modelo esgotou, pula imediatamente para o próximo modelo sem re-tentar o mesmo
          if (isQuotaExhausted) {
            break;
          }

          if (isHighDemand && attempt < 2) {
            await new Promise((r) => setTimeout(r, 600));
            continue;
          }
          break;
        }
      }
      if (response && response.text) {
        break;
      }
    }

    let cleanedHtml = '';
    if (response && response.text) {
      cleanedHtml = extractCleanHtml(response.text);
    }

    if (!cleanedHtml || !cleanedHtml.includes('<html')) {
      console.log('Utilizando gerador integrado resiliente de Jogo Lúdico SVG devido a limites de quota do Gemini.');
      cleanedHtml = generateFallbackPlayfulGameHtml(title, subject, turma, description, questions, maxGrade);
    }

    return NextResponse.json({
      html: cleanedHtml,
      title: `[PNE Lúdica] ${title}`,
      maxScore: maxGrade,
    });
  } catch (error: any) {
    console.error('Erro na rota de geração de atividade lúdica com Gemini, aplicando gerador pedagógico integrado:', error);
    try {
      const {
        title,
        subject = 'Sociologia',
        description = '',
        turma = '',
        questions = [],
        maxGrade = 10,
      } = await req.json().catch(() => ({}));

      const fallbackHtml = generateFallbackPlayfulGameHtml(title, subject, turma, description, questions, maxGrade);
      return NextResponse.json({
        html: fallbackHtml,
        title: `[PNE Lúdica] ${title || 'Atividade Interativa'}`,
        maxScore: maxGrade || 10,
      });
    } catch {
      return NextResponse.json(
        { error: error?.message || 'Falha ao gerar jogo lúdico com o Gemini.' },
        { status: 500 }
      );
    }
  }
}

