import { Activity, ActivityQuestion } from './types';

/**
 * Limpa e extrai estritamente o código HTML completo,
 * eliminando qualquer texto markdown, comentários ou preâmbulos conversacionais.
 */
export function extractCleanHtml(rawText: string): string {
  if (!rawText) return '';
  const text = rawText.trim();

  let html = '';

  // 1. Match <!DOCTYPE html> ... </html>
  const doctypeMatch = text.match(/<!DOCTYPE\s+html[\s\S]*?<\/html>/i);
  if (doctypeMatch) {
    html = doctypeMatch[0].trim();
  } else {
    // 2. Match <html ... </html>
    const htmlMatch = text.match(/<html[\s\S]*?<\/html>/i);
    if (htmlMatch) {
      html = `<!DOCTYPE html>\n${htmlMatch[0].trim()}`;
    } else {
      // 3. Match inside markdown code blocks ```html ... ``` or ``` ... ```
      const codeBlockMatch = text.match(/```(?:html)?\s*([\s\S]*?)\s*```/i);
      if (codeBlockMatch) {
        const inner = codeBlockMatch[1].trim();
        const innerDoctype = inner.match(/<!DOCTYPE\s+html[\s\S]*?<\/html>/i);
        if (innerDoctype) html = innerDoctype[0].trim();
        else {
          const innerHtml = inner.match(/<html[\s\S]*?<\/html>/i);
          if (innerHtml) html = `<!DOCTYPE html>\n${innerHtml[0].trim()}`;
          else html = `<!DOCTYPE html>\n<html>\n<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>\n<body>\n${inner}\n</body>\n</html>`;
        }
      } else {
        // 4. Fallback: extract substring between first '<' and last '>'
        const firstTagIndex = text.indexOf('<');
        const lastTagIndex = text.lastIndexOf('>');
        if (firstTagIndex !== -1 && lastTagIndex !== -1 && lastTagIndex > firstTagIndex) {
          const candidate = text.slice(firstTagIndex, lastTagIndex + 1).trim();
          if (candidate.startsWith('<!DOCTYPE') || candidate.startsWith('<html')) {
            html = candidate;
          }
        }
      }
    }
  }

  if (!html) html = text;

  // Injetar script resiliente de auto-avanço caso o jogo gerado por IA tenha ficado estático
  const guardScript = `
<script id="auto-advance-guard">
(function() {
  function initAutoAdvanceGuard() {
    document.addEventListener('click', function(e) {
      var target = e.target && e.target.closest ? e.target.closest('button, [role="button"], .option-btn, .btn-option, .choice') : null;
      if (!target) return;

      var txt = (target.textContent || '').trim().toLowerCase();
      // Ignorar botões de voltar ou áudio
      if (txt.indexOf('voltar') !== -1 || txt.indexOf('ouvir') !== -1 || txt.indexOf('som') !== -1 || txt.indexOf('áudio') !== -1 || txt.indexOf('speech') !== -1) {
        return;
      }

      var isStartBtn = txt.indexOf('começar') !== -1 || txt.indexOf('iniciar') !== -1 || txt.indexOf('jogar') !== -1;
      var isAnswerBtn = target.classList.contains('option-btn') || 
                          target.classList.contains('btn-option') || 
                          target.closest('.options-grid, .options, .answers, [class*="option"]') !== null ||
                          txt.indexOf('sim') !== -1 || txt.indexOf('não') !== -1 || txt.indexOf('nao') !== -1 ||
                          target.getAttribute('data-correct') !== null || target.getAttribute('data-option') !== null;

      if (!isStartBtn && !isAnswerBtn) return;

      // Efeito visual imediato no botão clicado
      try {
        target.style.transform = 'scale(0.95)';
        target.style.transition = 'all 0.15s ease';
        setTimeout(function() { if (target) target.style.transform = 'scale(1)'; }, 150);
      } catch(err) {}

      // Auto-avanço resiliente: se a tela não mudou após 750ms, dispara a transição
      var prevContent = document.getElementById('content-body') ? document.getElementById('content-body').innerHTML : document.body.innerHTML;
      setTimeout(function() {
        var currentContent = document.getElementById('content-body') ? document.getElementById('content-body').innerHTML : document.body.innerHTML;
        if (currentContent !== prevContent) return;

        if (typeof window.nextPhase === 'function') { window.nextPhase(); return; }
        if (typeof window.nextQuestion === 'function') { window.nextQuestion(); return; }
        if (typeof window.goToStep === 'function' && typeof window.currentStep === 'number') {
          window.goToStep(window.currentStep + 1);
          return;
        }

        var nextBtns = Array.prototype.slice.call(document.querySelectorAll('button, [role="button"]')).filter(function(b) {
          var bTxt = (b.textContent || '').toLowerCase();
          return (bTxt.indexOf('próxim') !== -1 || bTxt.indexOf('proxim') !== -1 || bTxt.indexOf('avanç') !== -1 || bTxt.indexOf('avanc') !== -1 || bTxt.indexOf('continuar') !== -1 || bTxt.indexOf('resultado') !== -1) && b.offsetParent !== null;
        });
        if (nextBtns.length > 0) {
          nextBtns[0].click();
          return;
        }

        var phases = Array.prototype.slice.call(document.querySelectorAll('.phase, .step, [id^="phase-"], [id^="step-"], .question-container, .card-phase'));
        if (phases.length > 1) {
          var visibleIdx = -1;
          for (var i = 0; i < phases.length; i++) {
            if (phases[i].style.display !== 'none' && !phases[i].classList.contains('hidden')) {
              visibleIdx = i;
              break;
            }
          }
          if (visibleIdx !== -1 && visibleIdx < phases.length - 1) {
            phases[visibleIdx].style.display = 'none';
            phases[visibleIdx].classList.add('hidden');
            phases[visibleIdx + 1].style.display = 'block';
            phases[visibleIdx + 1].classList.remove('hidden');
          }
        }
      }, 750);
    }, true);
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initAutoAdvanceGuard();
  } else {
    window.addEventListener('DOMContentLoaded', initAutoAdvanceGuard);
  }
})();
</script>
`;

  if (html.includes('</body>')) {
    html = html.replace('</body>', `${guardScript}\n</body>`);
  } else if (html.includes('</html>')) {
    html = html.replace('</html>', `${guardScript}\n</html>`);
  } else {
    html = `${html}\n${guardScript}`;
  }

  return html;
}

/**
 * Cria o objeto da Atividade Adaptada para Deficiências Leves e Moderadas
 * gerado através do modelo de IA Gemini.
 */
export function createAdaptedMildModerateActivity(
  activity: Activity,
  adaptedData: {
    adaptedTitle?: string;
    adaptedDescription?: string;
    questions: ActivityQuestion[];
  }
): Activity {
  const titlePrefix = activity.title.startsWith('[PNE Leve/Mod]') || activity.title.startsWith('[Adaptada PNE]')
    ? ''
    : '[PNE Leve/Mod] ';

  return {
    ...activity,
    id: `act-pne-mild-${Date.now()}`,
    title: adaptedData.adaptedTitle || `${titlePrefix}${activity.title}`,
    description: adaptedData.adaptedDescription || activity.description || 'Atividade adaptada pedagogicamente por IA para Deficiências Leves e Moderadas (AEE).',
    isAdapted: true,
    adaptationType: 'mild_moderate',
    adaptedFromId: activity.id,
    questions: adaptedData.questions,
    submissions: [],
    totalSubmissions: 0,
    pendingCorrection: 0,
  };
}

/**
 * Cria o objeto da Atividade Adaptada para Síndromes Severas (Jogo Lúdico Interativo)
 * gerado através do modelo de IA Gemini.
 */
export function createAdaptedSeverePlayfulActivity(
  activity: Activity,
  playfulHtml: string,
  playfulTitle?: string
): Activity {
  const titlePrefix = activity.title.startsWith('[PNE Lúdica]') || activity.title.startsWith('[Adaptada PNE]')
    ? ''
    : '[PNE Lúdica] ';

  return {
    ...activity,
    id: `act-pne-severe-${Date.now()}`,
    title: playfulTitle || `${titlePrefix}${activity.title}`,
    description: activity.description || 'Atividade lúdica e interativa',
    isAdapted: true,
    adaptationType: 'severe_playful',
    playfulGameHtml: extractCleanHtml(playfulHtml),
    playfulGameScoreMax: activity.maxGrade || 10,
    adaptedFromId: activity.id,
    questions: [], // O jogo interativo em HTML conduz a avaliação
    submissions: [],
    totalSubmissions: 0,
    pendingCorrection: 0,
  };
}

