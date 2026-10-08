import { Activity, StudentUser } from './types';

export function extractCleanHtml(rawText: string): string {
  let html = rawText;
  
  try {
    const htmlMatch = rawText.match(/<html/i);
    if (htmlMatch) {
      const matchIndex = htmlMatch.index || 0;
      html = html.substring(matchIndex);
    }
  } catch(e) {}

  const guardScript = `
<script>
(function() {
  function initAutoAdvanceGuard() {
    document.addEventListener('click', function(e) {
      var target = e.target && e.target.closest ? e.target.closest('button, [role="button"], .option-btn, .btn-option, .choice') : null;
      if (!target) return;
      var txt = (target.textContent || '').trim().toLowerCase();
      var isStartBtn = txt.indexOf('começar') !== -1 || txt.indexOf('iniciar') !== -1 || txt.indexOf('jogar') !== -1;
      var isAnswerBtn = target.classList.contains('option-btn') || 
                          target.classList.contains('btn-option') || 
                          target.closest('.options-grid, .options, .answers, [class*="option"]') !== null ||
                          target.getAttribute('data-correct') !== null || target.getAttribute('data-option') !== null;
                          
      if (!isStartBtn && !isAnswerBtn) return;
      try {
        target.style.transform = 'scale(0.95)';
        target.style.transition = 'all 0.15s ease';
        setTimeout(function() { if (target) target.style.transform = 'scale(1)'; }, 150);
      } catch(err) {}
      
      var prevContent = document.getElementById('content-body') ? document.getElementById('content-body').innerHTML : document.body.innerHTML;
      setTimeout(function() {
        var currentContent = document.getElementById('content-body') ? document.getElementById('content-body').innerHTML : document.body.innerHTML;
        if (currentContent !== prevContent) return;
        if (typeof window.nextPhase === 'function') { window.nextPhase(); return; }
        if (typeof window.nextQuestion === 'function') { window.nextQuestion(); return; }
        var nextBtns = Array.prototype.slice.call(document.querySelectorAll('button, [role="button"]')).filter(function(b) {
          var bTxt = (b.textContent || '').toLowerCase();
          return (bTxt.indexOf('próxim') !== -1 || bTxt.indexOf('continuar') !== -1) && b.offsetParent !== null;
        });
        if (nextBtns.length > 0) nextBtns[0].click();
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

export function createAdaptedMildModerateActivity(
  activity: Activity,
  adaptedDataOrText: any,
  simplifiedQuestions?: any[]
): Activity {
  const isObject = typeof adaptedDataOrText === 'object' && adaptedDataOrText !== null;
  const adaptedTitle =
    isObject && adaptedDataOrText.adaptedTitle
      ? adaptedDataOrText.adaptedTitle
      : activity.title.includes('Adaptada')
      ? activity.title
      : `${activity.title} (Adaptada PNE)`;
  const description = isObject
    ? adaptedDataOrText.adaptedDescription || activity.description
    : adaptedDataOrText || activity.description;
  const rawQuestions = isObject
    ? adaptedDataOrText.questions || activity.questions || []
    : simplifiedQuestions && simplifiedQuestions.length > 0
    ? simplifiedQuestions
    : activity.questions || [];

  return {
    ...activity,
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    originalActivityId: activity.id,
    adaptedFromId: activity.id,
    isAdapted: true,
    adaptationType: 'mild_moderate',
    title: adaptedTitle,
    description,
    questions: rawQuestions,
    objectiveQuestions: rawQuestions.filter((q: any) => q.type === 'multiple_choice'),
    essayQuestions: rawQuestions.filter((q: any) => q.type === 'essay'),
    submissions: [],
    totalSubmissions: 0,
    pendingCorrection: 0,
  };
}

export function createAdaptedSeverePlayfulActivity(
  activity: Activity,
  playfulHtml: string
): Activity {
  const adaptedTitle = activity.title.includes('Jogo Lúdico')
    ? activity.title
    : `${activity.title} (Jogo Lúdico PNE)`;

  return {
    ...activity,
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    originalActivityId: activity.id,
    adaptedFromId: activity.id,
    isAdapted: true,
    adaptationType: 'severe_playful',
    title: adaptedTitle,
    playfulGameHtml: extractCleanHtml(playfulHtml),
    questions: [],
    objectiveQuestions: [],
    essayQuestions: [],
    submissions: [],
    totalSubmissions: 0,
    pendingCorrection: 0,
  };
}
