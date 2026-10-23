const $=(s,p=document)=>p.querySelector(s);
const $$=(s,p=document)=>[...p.querySelectorAll(s)];
const chartCanvas=$('#progressChart');
// These are the dashboard's existing weekly 0–100 progress values; the tooltip reports them as percentages without inventing new data.
const productivityDays=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const productivityData=[45,65,35,82,55,95,68];
// No tracked productivity data is available yet; these are clearly labelled placeholder percentages.
if(chartCanvas){const weeklyProductivity=Math.round(productivityData.reduce((total,value)=>total+value,0)/productivityData.length),panel=chartCanvas.closest('.panel');const heading=$('h2',panel),description=$('p',panel),summary=$('.pill',panel);if(heading)heading.textContent='Overall Productivity';if(description)description.textContent='Placeholder percentages for this week';if(summary)summary.textContent=`Overall: ${weeklyProductivity}%`;const daily=document.createElement('div');daily.className='chart-labels';daily.setAttribute('aria-label','Daily productivity percentages');daily.innerHTML=productivityDays.map((day,index)=>`<span>${day.slice(0,3)}<br><strong style="color:var(--purple);font-size:12px">${productivityData[index]}%</strong></span>`).join('');chartCanvas.closest('.chart')?.after(daily)}
if(chartCanvas&&window.Chart)new Chart(chartCanvas,{type:'bar',data:{labels:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],datasets:[{data:productivityData,backgroundColor:'#7553db',borderRadius:5,barThickness:22}]},options:{plugins:{legend:{display:false},tooltip:{displayColors:false,callbacks:{title:items=>{const item=items[0];return `${productivityDays[item.dataIndex]} — ${productivityData[item.dataIndex]}%`},label:()=>''}}},scales:{x:{grid:{display:false},ticks:{color:'#837e91',font:{size:11}}},y:{display:false,beginAtZero:true,max:100}},responsive:true,maintainAspectRatio:false}});
$$('.tab').forEach(tab=>tab.addEventListener('click',()=>{$$('.tab').forEach(t=>t.classList.remove('active'));$$('.tab-panel').forEach(p=>p.classList.remove('active'));tab.classList.add('active');$('#'+tab.dataset.tab).classList.add('active')}));
const drop=$('#dropZone');
if(drop){const input=$('input[type=file]',drop);input.addEventListener('change',()=>$('#fileName').textContent=input.files[0]?.name||'');['dragover','dragenter'].forEach(type=>drop.addEventListener(type,event=>{event.preventDefault();drop.style.borderColor='#7553db'}));drop.addEventListener('drop',event=>{event.preventDefault();input.files=event.dataTransfer.files;$('#fileName').textContent=input.files[0]?.name||''})}
function esc(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
const modal=$('#eventModal');
if(modal){
  let events=[],view=new Date();
  const dateKey=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const eventDateKey=event=>String(event.eventDate).slice(0,10);
  const load=async()=>{events=await (await fetch('/api/events')).json();render()};
  const render=()=>{
    const y=view.getFullYear(),m=view.getMonth();
    $('#monthTitle').textContent=view.toLocaleDateString('en-US',{month:'long',year:'numeric'});
    const first=new Date(y,m,1).getDay(),last=new Date(y,m+1,0).getDate(),days=$('#calendarDays');
    days.innerHTML='';
    for(let i=0;i<first;i++)days.innerHTML+='<span class="day muted-day"></span>';
    for(let d=1;d<=last;d++){
      const date=new Date(y,m,d),key=dateKey(date),has=events.some(e=>eventDateKey(e)===key);
      days.innerHTML+=`<span class="day ${has?'has-event':''} ${date.toDateString()===new Date().toDateString()?'today':''}" data-date="${key}">${d}</span>`;
    }
    $('#eventItems').innerHTML=events.length?events.map(e=>`<div class="event-item ${e.status==='Completed'?'completed':''}" data-event-item="${e._id}"><span><b>${esc(e.title)}</b><small>${eventDateKey(e)} · ${e.category}</small></span><span class="event-actions"><button data-complete="${e._id}" aria-label="Toggle event completion">✓</button><button data-delete="${e._id}">×</button></span></div>`).join(''):'<div class="empty">Your calendar is clear.<br>Add a moment worth showing up for.</div>';
    $$('[data-delete]').forEach(button=>button.onclick=async()=>{await fetch('/api/events/'+button.dataset.delete,{method:'DELETE'});load()});
  };
  $('#addEventBtn').onclick=()=>modal.classList.add('open');
  $('#closeModal').onclick=()=>modal.classList.remove('open');
  $('#prevMonth').onclick=()=>{view.setMonth(view.getMonth()-1);render()};
  $('#nextMonth').onclick=()=>{view.setMonth(view.getMonth()+1);render()};
  $('#eventForm').onsubmit=async e=>{e.preventDefault();const body=Object.fromEntries(new FormData(e.target));await fetch('/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});e.target.reset();modal.classList.remove('open');load()};
  load();
}

const generationButtons = $$('[data-generate]');
if (generationButtons.length && window.documentId) {
  const resultFor = type => $(`#${type === 'summary' ? 'summaryResult' : type === 'quiz' ? 'quizResult' : type === 'flashcards' ? 'cardsResult' : 'vivaResult'}`);
  const renderError = (result, message) => { result.innerHTML = `<div class="alert">${esc(message)}</div>`; };
  const sourceLabel = source => source === 'gemini' ? 'Gemini-generated' : source === 'local' ? 'Locally generated fallback' : 'Retrieved from cache';
  const sourceBadge = source => `<p class="pill">${sourceLabel(source)}</p>`;
  const correctIndexFor = question => {
    if (!question || !Array.isArray(question.options)) return null;
    const raw = question.correctOptionIndex ?? question.correctOption ?? question.correctAnswer ?? question.correctValues;
    const values = Array.isArray(raw) ? raw : [raw];
    for (const value of values) {
      if (Number.isInteger(value) && value >= 0 && value < question.options.length) return value;
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (/^\d+$/.test(normalized) && Number(normalized) >= 0 && Number(normalized) < question.options.length) return Number(normalized);
        const letter = normalized.match(/^(?:option\s*)?([a-d])$/i);
        if (letter) return letter[1].toLowerCase().charCodeAt(0) - 97;
        const textIndex = question.options.findIndex(option => String(option).trim().toLowerCase() === normalized);
        if (textIndex >= 0) return textIndex;
      }
    }
    return null;
  };
  const attachQuizValidation = (result, questions) => {
    $$('[data-quiz-option]', result).forEach(input => input.addEventListener('change', () => {
      const questionIndex = Number(input.dataset.questionIndex), question = questions[questionIndex];
      if (!question || input.closest('[data-quiz-question]')?.dataset.answered === 'true') return;
      const correctIndex = correctIndexFor(question), selectedIndex = Number(input.value), questionBox = input.closest('[data-quiz-question]'), feedback = $('[data-quiz-feedback]', questionBox);
      questionBox.dataset.answered = 'true';
      $$('[data-quiz-option]', questionBox).forEach(option => { option.disabled = true; const optionLabel = option.closest('.quiz-option'); if (correctIndex !== null && Number(option.value) === correctIndex && selectedIndex !== correctIndex) optionLabel?.classList.add('correct'); if (Number(option.value) === selectedIndex) optionLabel?.classList.add(correctIndex !== null && selectedIndex === correctIndex ? 'correct' : 'wrong'); });
      if (correctIndex === null) { feedback.textContent = 'Answer could not be validated for this question.'; feedback.className = 'quiz-feedback unavailable'; }
      else if (selectedIndex === correctIndex) { feedback.textContent = 'Correct!'; feedback.className = 'quiz-feedback correct'; }
      else { feedback.textContent = 'Incorrect'; feedback.className = 'quiz-feedback wrong'; }
    }));
  };
  const render = (type, data, result) => {
    if (type === 'summary') { if (typeof data.summary !== 'string' || !data.summary.trim()) return renderError(result, 'The summary response was empty. Please try again.'); result.innerHTML = `<div class="result-card">${sourceBadge(data.source)}<div class="note-text">${esc(data.summary)}</div></div>`; return; }
    if (type === 'quiz') {
      const questions = Array.isArray(data.questions) ? data.questions : [];
      result.innerHTML = questions.length ? `<div class="result-card">${sourceBadge(data.source)}${questions.map((q, i) => `<div class="quiz-q" data-quiz-question="${i}"><p>${i + 1}. ${esc(q?.questionText || 'Question unavailable')}</p>${Array.isArray(q?.options) ? q.options.slice(0, 4).map((option, index) => `<label class="quiz-option"><input type="radio" name="quiz-${window.documentId}-${i}" value="${index}" data-quiz-option data-question-index="${i}"><span class="quiz-option-label">${String.fromCharCode(65 + index)}</span><span>${esc(option)}</span></label>`).join('') : '<small>Options unavailable.</small>'}<div class="quiz-feedback" data-quiz-feedback aria-live="polite"></div><small>${esc(q?.explanation || 'Explanation unavailable.')}</small></div>`).join('')}</div>` : '';
      if (questions.length) attachQuizValidation(result, questions);
      if (!questions.length) renderError(result, 'The quiz response was empty. Please try again.');
      return;
    }
    if (type === 'flashcards') {
      const cards = Array.isArray(data.cards) ? data.cards : [];
      result.innerHTML = cards.length ? `<div>${sourceBadge(data.source)}${cards.map(card => `<div class="flashcard"><div><strong>${esc(card?.frontQuestion || 'Question unavailable')}</strong><small>${esc(card?.backAnswer || 'Answer unavailable.')}</small></div></div>`).join('')}</div>` : '';
      if (!cards.length) renderError(result, 'The flashcard response was empty. Please try again.');
      return;
    }
    const questions = Array.isArray(data.questions) ? data.questions : [];
    result.innerHTML = questions.length ? `<div class="result-card">${sourceBadge(data.source)}${questions.map((question, i) => { const item = typeof question === 'string' ? { question, answer: '', followUpQuestions: [] } : question; const followUps = Array.isArray(item?.followUpQuestions) ? item.followUpQuestions : []; return `<div class="viva-q"><strong>${i + 1}. ${esc(item?.question || 'Question unavailable')}</strong>${item?.answer ? `<p><b>Answer:</b> ${esc(item.answer)}</p>` : '<p class="muted">Answer unavailable for this item.</p>'}${followUps.length ? `<small><b>Follow-up:</b> ${followUps.map(esc).join(' · ')}</small>` : ''}</div>`; }).join('')}</div>` : '';
    if (!questions.length) renderError(result, 'The viva response was empty. Please try again.');
  };
  generationButtons.forEach(button => button.addEventListener('click', async () => {
    const type = button.dataset.generate, result = resultFor(type), original = button.textContent;
    button.disabled = true; button.textContent = 'Generating…'; result.innerHTML = '<div class="result-card">Working from your uploaded document…</div>';
    try {
      const response = await fetch(`/document/${encodeURIComponent(window.documentId)}/${type === 'summary' ? 'summarize' : type}`, { method: 'POST', headers: { 'Accept': 'application/json' } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Generation failed (HTTP ${response.status}).`);
      render(type, data, result);
    } catch (error) { renderError(result, error.message || 'Generation failed. Please try again.'); }
    finally { button.disabled = false; button.textContent = original; }
  }));
}
