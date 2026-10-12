import { NextRequest, NextResponse } from 'next/server';

function extractCleanHtml(rawText: string): string {
  let html = rawText;
  try {
    const htmlMatch = html.match(/<html/i);
    if (htmlMatch) {
      html = html.substring(htmlMatch.index || 0);
    }
  } catch(e) {}
  return html;
}

function generateFallbackPlayfulGameHtml(
  title: string,
  subject: string,
  turma: string,
  description: string,
  questions: any[],
  maxGrade: number
) {
  const safeTitle = title.replace(/"/g, '&quot;');
  const safeSubject = subject.replace(/"/g, '&quot;');
  
  let challenges: any[] = [];
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
            { text: 'Sim', correct: true, icon: '👍' },
            { text: 'Não', correct: false, icon: '👎' }
          ]
        };
      }
    });
  } else {
    challenges = [
      {
        question: `Como ${safeTitle} ajuda na sociedade?`,
        svgType: 'community',
        options: [
          { text: 'Une as pessoas', correct: true, icon: '🤝' },
          { text: 'Afasta as pessoas', correct: false, icon: '❌' }
        ]
      }
    ];
  }

  let screensHtml = '';
  challenges.forEach((chal, index) => {
    let optionsHtml = '';
    chal.options.forEach((opt: any) => {
      optionsHtml += `
        <button class="option-btn" data-correct="${opt.correct}">
          <span class="option-icon">${opt.icon}</span>
          <span class="option-text">${opt.text}</span>
        </button>
      `;
    });

    screensHtml += `
      <div id="phase-${index + 1}" class="phase" style="display: none;">
        <div class="card">
          <div class="question-container">
            <h2 class="question-title">${chal.question}</h2>
          </div>
          <div class="options-grid">${optionsHtml}</div>
        </div>
      </div>
    `;
  });

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jogo: ${safeTitle}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%); margin: 0; padding: 20px; display: flex; flex-direction: column; align-items: center; min-height: 100vh; color: #333; }
    .container { max-width: 800px; width: 100%; margin: 0 auto; }
    header { text-align: center; margin-bottom: 30px; }
    h1 { color: #2c3e50; font-size: 2.5rem; margin-bottom: 10px; text-shadow: 2px 2px 4px rgba(0,0,0,0.1); }
    .phase { width: 100%; animation: fadeIn 0.5s ease-out; }
    .card { background: white; border-radius: 20px; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); text-align: center; }
    .question-title { font-size: 1.8rem; color: #34495e; margin-bottom: 30px; }
    .options-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
    .option-btn { background: #f8f9fa; border: 2px solid #e9ecef; border-radius: 15px; padding: 20px; font-size: 1.2rem; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; justify-content: center; gap: 15px; color: #495057; font-weight: bold; }
    .option-btn:hover { background: #e3f2fd; border-color: #90caf9; transform: translateY(-3px); box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
    .option-icon { font-size: 2rem; }
    #success-screen { text-align: center; padding: 50px; background: white; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
    #success-screen h2 { color: #2ecc71; font-size: 3rem; margin-bottom: 20px; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${safeTitle}</h1>
      <p>${safeSubject} - ${turma}</p>
    </header>
    <div id="game-container">
      ${screensHtml}
      <div id="success-screen" class="phase" style="display: none;">
        <h2>🎉 Parabéns! 🎉</h2>
        <p>Você completou todos os desafios brilhantemente!</p>
        <button class="option-btn" onclick="location.reload()" style="margin: 30px auto 0; background: #2ecc71; color: white; border-color: #27ae60;">
          Jogar Novamente
        </button>
      </div>
    </div>
  </div>
  <script>
    let currentPhase = 1;
    const totalPhases = ${challenges.length};
    
    function showPhase(phaseNum) {
      document.querySelectorAll('.phase').forEach(p => p.style.display = 'none');
      const phaseEl = document.getElementById('phase-' + phaseNum);
      if (phaseEl) {
        phaseEl.style.display = 'block';
      } else {
        document.getElementById('success-screen').style.display = 'block';
      }
    }
    
    document.querySelectorAll('.option-btn').forEach(btn => {
      if (btn.hasAttribute('data-correct')) {
        btn.addEventListener('click', function() {
          const isCorrect = this.getAttribute('data-correct') === 'true';
          if (isCorrect) {
            this.style.background = '#d4edda';
            this.style.borderColor = '#c3e6cb';
            setTimeout(() => {
              currentPhase++;
              showPhase(currentPhase);
            }, 1000);
          } else {
            this.style.background = '#f8d7da';
            this.style.borderColor = '#f5c6cb';
            this.style.animation = 'shake 0.5s';
            setTimeout(() => {
              this.style.background = '#f8f9fa';
              this.style.borderColor = '#e9ecef';
              this.style.animation = '';
            }, 1000);
          }
        });
      }
    });
    
    // Iniciar jogo
    showPhase(1);
    
    // CSS para animação de erro
    const style = document.createElement('style');
    style.textContent = \`
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
      }
    \`;
    document.head.appendChild(style);
  </script>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const { title, subject = 'Sociologia', description = '', turma = 'Turma Padrão', questions = [], maxGrade = 10, includeSeverePlayful = false } = await req.json();
    return NextResponse.json({ 
        html: generateFallbackPlayfulGameHtml(title, subject, turma, description, questions, maxGrade) 
    });
  } catch (error) {
    console.error('Error in playful adaptation API:', error);
    return NextResponse.json({ error: 'Falha ao adaptar a atividade para o formato lúdico' }, { status: 500 });
  }
}
