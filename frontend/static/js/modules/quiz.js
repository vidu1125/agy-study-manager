/* ===========================================================================
   MODULE: QUIZ TEST MCQ
   Deck theo tên, import JSON 4/5 đáp án, làm quiz và chấm từng câu.
   =========================================================================== */

let quizState = {
  selectedDeckId: null,
  deck: null,
  questions: [],
  currentIndex: 0,
  score: 0,
  answered: false,
  answering: false,
  mode: 'review',
  durationMinutes: 0,
  deadlineAt: null,
  shuffleQuestions: true,
  answers: {},
  results: {},
  submitted: false,
  submitting: false
};

let quizImportMode = 'file';
let quizTimerInterval = null;

function escapeQuizHtml(value) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };
  return String(value ?? '').replace(/[&<>'"]/g, char => map[char]);
}

async function quizFetch(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.message || 'Không thể xử lý quiz');
  return data;
}

async function fetchQuizDecks() {
  const response = await fetch('/api/quiz/decks');
  if (!response.ok) throw new Error('Không thể tải quiz deck');
  globalData.quizDecks = await response.json();
  return globalData.quizDecks;
}

async function renderQuizWorkspace() {
  const container = document.getElementById('quizDeckList');
  if (!container) return;
  try {
    await fetchQuizDecks();
    renderQuizDeckList();
  } catch (error) {
    container.innerHTML = '<p class="vocab-empty vocab-error">' + escapeQuizHtml(error.message) + '</p>';
  }
}

function renderQuizDeckList() {
  const container = document.getElementById('quizDeckList');
  const decks = globalData.quizDecks || [];
  if (!decks.length) {
    container.innerHTML = '<div class="vocab-empty"><strong>Chưa có quiz deck nào.</strong><span>Tạo deck theo tên, import JSON rồi bắt đầu kiểm tra kiến thức.</span><button class="btn-primary" type="button" onclick="openCreateQuizDeck()">Tạo quiz deck</button></div>';
    return;
  }
  container.innerHTML = decks.map(deck => {
    const count = Number(deck.question_count) || 0;
    const startButtons = count
      ? '<button class="quiz-start-btn" type="button" onclick="openQuizModePicker(' + deck.id + ', \'review\')">Ôn tập</button>' +
        '<button class="btn-sm quiz-exam-start" type="button" onclick="openQuizModePicker(' + deck.id + ', \'exam\')"><span class="material-symbols-outlined">timer</span> Luyện thi</button>'
      : '<button class="btn-sm" type="button" onclick="openQuizJsonImport(' + deck.id + ')">Import JSON</button>';
    return '<article class="quiz-deck-card' + (deck.id === quizState.selectedDeckId ? ' selected' : '') + '">' +
      '<div><strong>' + escapeQuizHtml(deck.name) + '</strong><span>' + count + ' câu hỏi · 4 hoặc 5 đáp án</span></div>' +
      '<div class="quiz-deck-actions">' + startButtons + '<button class="btn-sm" type="button" onclick="openQuizJsonImport(' + deck.id + ')" title="Import thêm câu hỏi"><span class="material-symbols-outlined">upload_file</span></button></div>' +
      '</article>';
  }).join('');
}

function openCreateQuizDeck() {
  document.getElementById('quizDeckName').value = '';
  openModal('modalCreateQuizDeck');
  setTimeout(() => document.getElementById('quizDeckName')?.focus(), 0);
}

async function createQuizDeck() {
  const name = document.getElementById('quizDeckName').value.trim();
  try {
    const data = await quizFetch('/api/quiz/decks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    quizState.selectedDeckId = data.deck.id;
    closeModal('modalCreateQuizDeck');
    await renderQuizWorkspace();
    openQuizJsonImport(data.deck.id);
  } catch (error) {
    alert('Lỗi: ' + error.message);
  }
}

function fillQuizDeckOptions(selectedDeckId = null) {
  const select = document.getElementById('quizImportDeck');
  if (!select) return;
  select.innerHTML = (globalData.quizDecks || []).map(deck =>
    '<option value="' + deck.id + '">' + escapeQuizHtml(deck.name) + ' (' + (deck.question_count || 0) + ' câu)</option>'
  ).join('');
  const targetId = selectedDeckId || quizState.selectedDeckId;
  if (targetId) select.value = String(targetId);
}

function openQuizJsonImport(deckId = null) {
  if (!globalData.quizDecks || !globalData.quizDecks.length) {
    openCreateQuizDeck();
    return;
  }
  fillQuizDeckOptions(deckId);
  document.getElementById('quizImportFile').value = '';
  document.getElementById('quizImportJsonText').value = '';
  setQuizImportMode('file');
  setQuizImportStatus('');
  openModal('modalQuizJsonImport');
}

function setQuizImportMode(mode) {
  quizImportMode = mode;
  const isFile = mode === 'file';
  document.getElementById('quizImportFileTab').classList.toggle('active', isFile);
  document.getElementById('quizImportPasteTab').classList.toggle('active', !isFile);
  document.getElementById('quizImportFilePanel').style.display = isFile ? 'flex' : 'none';
  document.getElementById('quizImportPastePanel').style.display = isFile ? 'none' : 'flex';
  setQuizImportStatus('');
}

function setQuizImportStatus(message, isError = false) {
  const status = document.getElementById('quizImportStatus');
  if (!status) return;
  status.textContent = message;
  status.classList.toggle('error', isError);
}

async function copyQuizImportExample() {
  const example = document.getElementById('quizImportExample').textContent.trim();
  try {
    await navigator.clipboard.writeText(example);
    setQuizImportStatus('Đã sao chép JSON mẫu. Bạn có thể dán và thay nội dung câu hỏi.');
  } catch (_) {
    setQuizImportStatus('Không thể sao chép tự động. Hãy sao chép mẫu thủ công.', true);
  }
}

async function submitQuizJsonImport() {
  const deckId = Number(document.getElementById('quizImportDeck').value);
  if (!Number.isInteger(deckId) || deckId <= 0) {
    setQuizImportStatus('Hãy chọn quiz deck nhận câu hỏi.', true);
    return;
  }
  let rawJson = '';
  if (quizImportMode === 'file') {
    const file = document.getElementById('quizImportFile').files[0];
    if (!file) { setQuizImportStatus('Hãy chọn file JSON.', true); return; }
    if (file.size > 5 * 1024 * 1024) { setQuizImportStatus('File JSON tối đa 5 MB.', true); return; }
    rawJson = await file.text();
  } else {
    rawJson = document.getElementById('quizImportJsonText').value.trim();
    if (!rawJson) { setQuizImportStatus('Hãy dán nội dung JSON.', true); return; }
  }
  let payload;
  try {
    payload = JSON.parse(rawJson);
  } catch (error) {
    setQuizImportStatus('JSON không hợp lệ: ' + error.message, true);
    return;
  }
  const rows = Array.isArray(payload) ? payload : payload?.questions;
  if (!Array.isArray(rows) || !rows.length) {
    setQuizImportStatus('JSON cần là mảng câu hỏi hoặc có trường questions là một mảng.', true);
    return;
  }
  const submitButton = document.getElementById('quizImportSubmit');
  submitButton.disabled = true;
  setQuizImportStatus('Đang kiểm tra và import ' + rows.length + ' câu hỏi...');
  try {
    const result = await quizFetch('/api/quiz/decks/' + deckId + '/questions/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    quizState.selectedDeckId = deckId;
    closeModal('modalQuizJsonImport');
    await renderQuizWorkspace();
    const skipped = result.skipped_duplicates ? ' · bỏ qua ' + result.skipped_duplicates + ' câu trùng' : '';
    alert('Đã import ' + result.imported_questions + ' câu hỏi' + skipped + '. Bắt đầu làm quiz nhé!');
    await startQuiz(deckId);
  } catch (error) {
    setQuizImportStatus('Không thể import: ' + error.message, true);
  } finally {
    submitButton.disabled = false;
  }
}

function startQuiz(deckId) {
  openQuizModePicker(deckId);
}

function openQuizModePicker(deckId, preferredMode = 'review') {
  clearQuizTimer();
  quizState.selectedDeckId = Number(deckId);
  const deck = (globalData.quizDecks || []).find(item => item.id === Number(deckId));
  document.getElementById('quizModeDeckLabel').textContent = deck
    ? 'Deck: ' + deck.name + '. Chọn cách bạn muốn làm bài.'
    : 'Chọn cách bạn muốn làm bài.';
  document.getElementById('quizExamDuration').value = '20';
  document.getElementById('quizShuffleQuestions').checked = true;
  setQuizModeStatus('');
  setQuizPlayMode(preferredMode);
  openModal('modalQuizMode');
}

function setQuizPlayMode(mode) {
  const isExam = mode === 'exam';
  document.querySelector('input[name="quizMode"][value="' + (isExam ? 'exam' : 'review') + '"]').checked = true;
  document.getElementById('quizReviewModeCard').classList.toggle('selected', !isExam);
  document.getElementById('quizExamModeCard').classList.toggle('selected', isExam);
  document.getElementById('quizExamDurationGroup').style.display = isExam ? 'block' : 'none';
  setQuizModeStatus('');
}

function setQuizModeStatus(message, isError = false) {
  const status = document.getElementById('quizModeStatus');
  status.textContent = message;
  status.classList.toggle('error', isError);
}

function beginSelectedQuiz() {
  const mode = document.querySelector('input[name="quizMode"]:checked')?.value || 'review';
  const shuffleQuestions = document.getElementById('quizShuffleQuestions').checked;
  let durationMinutes = 0;
  if (mode === 'exam') {
    durationMinutes = Number(document.getElementById('quizExamDuration').value);
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 300) {
      setQuizModeStatus('Thời gian luyện thi phải từ 1 đến 300 phút.', true);
      return;
    }
  }
  closeModal('modalQuizMode');
  beginQuiz(quizState.selectedDeckId, mode, durationMinutes, shuffleQuestions);
}

async function beginQuiz(deckId, mode = 'review', durationMinutes = 0, shuffleQuestions = true) {
  try {
    const data = await quizFetch('/api/quiz/decks/' + deckId + '/play?shuffle=' + (shuffleQuestions ? 'true' : 'false'));
    clearQuizTimer();
    quizState = {
      selectedDeckId: deckId,
      deck: data.deck,
      questions: data.questions,
      currentIndex: 0,
      score: 0,
      answered: false,
      answering: false,
      mode,
      durationMinutes,
      deadlineAt: mode === 'exam' ? Date.now() + durationMinutes * 60 * 1000 : null,
      shuffleQuestions,
      answers: {},
      results: {},
      submitted: false,
      submitting: false
    };
    document.getElementById('quizPlayDeckName').textContent = data.deck.name;
    document.getElementById('quizPlayPanel').style.display = 'block';
    updateQuizSessionHeader();
    renderQuizDeckList();
    renderQuizQuestion();
    if (mode === 'exam') startQuizTimer();
    document.getElementById('quizPlayPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    alert('Lỗi: ' + error.message);
  }
}

function clearQuizTimer() {
  if (quizTimerInterval) window.clearInterval(quizTimerInterval);
  quizTimerInterval = null;
}

function getQuizRemainingSeconds() {
  return quizState.deadlineAt ? Math.max(0, Math.ceil((quizState.deadlineAt - Date.now()) / 1000)) : 0;
}

function formatQuizTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return String(minutes).padStart(2, '0') + ':' + String(remainingSeconds).padStart(2, '0');
}

function updateQuizSessionHeader() {
  const isExam = quizState.mode === 'exam';
  const badge = document.getElementById('quizModeBadge');
  const timer = document.getElementById('quizTimer');
  badge.textContent = isExam ? 'Luyện thi' : 'Ôn tập';
  badge.classList.toggle('exam', isExam);
  timer.style.display = isExam ? 'inline-flex' : 'none';
  if (isExam) {
    const seconds = getQuizRemainingSeconds();
    timer.textContent = formatQuizTime(seconds);
    timer.classList.toggle('urgent', seconds <= 60);
  }
}

function startQuizTimer() {
  clearQuizTimer();
  updateQuizSessionHeader();
  quizTimerInterval = window.setInterval(() => {
    const seconds = getQuizRemainingSeconds();
    updateQuizSessionHeader();
    if (seconds <= 0) submitQuizExam(true);
  }, 250);
}

function getAnsweredQuizCount() {
  return Object.keys(quizState.answers).length;
}

function renderQuizQuestion() {
  const area = document.getElementById('quizPlayArea');
  const question = quizState.questions[quizState.currentIndex];
  if (!area || !question) return;
  const isExam = quizState.mode === 'exam';
  const number = quizState.currentIndex + 1;
  const labels = ['A', 'B', 'C', 'D', 'E'];
  const selectedIndex = quizState.answers[question.id];
  const progressValue = isExam ? getAnsweredQuizCount() + ' / ' + quizState.questions.length + ' đã chọn' : quizState.score + ' đúng';
  const navigator = isExam ? '<div class="quiz-question-nav" aria-label="Đi tới câu hỏi">' + quizState.questions.map((item, index) =>
    '<button type="button" class="' + (index === quizState.currentIndex ? 'current ' : '') + (Object.prototype.hasOwnProperty.call(quizState.answers, item.id) ? 'answered' : '') + '" onclick="goToQuizQuestion(' + index + ')" aria-label="Câu ' + (index + 1) + '">' + (index + 1) + '</button>'
  ).join('') + '</div>' : '';
  const actions = isExam
    ? '<div class="quiz-exam-actions"><button class="btn-secondary" type="button" onclick="goToQuizQuestion(' + (quizState.currentIndex - 1) + ')"' + (quizState.currentIndex === 0 ? ' disabled' : '') + '>Câu trước</button><button class="btn-secondary" type="button" onclick="goToQuizQuestion(' + (quizState.currentIndex + 1) + ')"' + (quizState.currentIndex + 1 === quizState.questions.length ? ' disabled' : '') + '>Câu sau</button><button class="btn-primary" type="button" onclick="submitQuizExam(false)"><span class="material-symbols-outlined">assignment_turned_in</span> Nộp bài</button></div>'
    : '<div id="quizFeedback" class="quiz-feedback" aria-live="polite"></div>';
  area.innerHTML = '<div class="quiz-progress"><span>Câu ' + number + ' / ' + quizState.questions.length + '</span><b>' + progressValue + '</b></div>' + navigator +
    '<article class="quiz-question-card"><h3>' + escapeQuizHtml(question.question) + '</h3>' +
    '<div class="quiz-options">' + question.options.map((option, index) =>
      '<button class="quiz-option' + (isExam && selectedIndex === index ? ' selected' : '') + '" type="button" onclick="answerQuiz(' + index + ')"><b>' + labels[index] + '</b><span>' + escapeQuizHtml(option) + '</span></button>'
    ).join('') + '</div>' + actions + '</article>';
}

function goToQuizQuestion(index) {
  if (quizState.mode !== 'exam' || index < 0 || index >= quizState.questions.length || quizState.submitting) return;
  quizState.currentIndex = index;
  renderQuizQuestion();
}

async function answerQuiz(selectedIndex) {
  const question = quizState.questions[quizState.currentIndex];
  if (!question) return;
  if (quizState.mode === 'exam') {
    if (quizState.submitting || quizState.submitted) return;
    quizState.answers[question.id] = selectedIndex;
    renderQuizQuestion();
    return;
  }
  if (quizState.answering || quizState.answered) return;
  quizState.answering = true;
  const buttons = Array.from(document.querySelectorAll('#quizPlayArea .quiz-option'));
  buttons.forEach(button => { button.disabled = true; });
  buttons[selectedIndex]?.classList.add('selected');
  try {
    const result = await quizFetch('/api/quiz/decks/' + quizState.selectedDeckId + '/questions/' + question.id + '/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selected_index: selectedIndex })
    });
    quizState.answered = true;
    quizState.answering = false;
    if (result.is_correct) quizState.score += 1;
    buttons.forEach((button, index) => {
      if (index === result.correct_index) button.classList.add('correct');
      if (index === selectedIndex && !result.is_correct) button.classList.add('wrong');
    });
    const feedback = document.getElementById('quizFeedback');
    const heading = result.is_correct ? '✓ Chính xác!' : '✕ Chưa đúng.';
    const explanation = result.explanation ? '<p>' + escapeQuizHtml(result.explanation) + '</p>' : '';
    const nextLabel = quizState.currentIndex + 1 === quizState.questions.length ? 'Xem kết quả' : 'Câu tiếp theo';
    feedback.innerHTML = '<strong class="' + (result.is_correct ? 'correct-text' : 'wrong-text') + '">' + heading + '</strong>' +
      (result.is_correct ? '<span>Đáp án đã được xác nhận ngay.</span>' : '<span>Đáp án đúng: ' + escapeQuizHtml(result.correct_option) + '</span>') +
      explanation + '<button class="btn-primary" type="button" onclick="nextQuizQuestion()">' + nextLabel + '</button>';
  } catch (error) {
    quizState.answering = false;
    buttons.forEach(button => { button.disabled = false; });
    const feedback = document.getElementById('quizFeedback');
    feedback.innerHTML = '<span class="wrong-text">Không thể chấm đáp án: ' + escapeQuizHtml(error.message) + '</span>';
  }
}

async function submitQuizExam(autoSubmitted) {
  if (quizState.mode !== 'exam' || quizState.submitting || quizState.submitted) return;
  if (!autoSubmitted && !window.confirm('Nộp bài ngay? Bạn sẽ không thể thay đổi đáp án sau khi nộp.')) return;
  quizState.submitting = true;
  clearQuizTimer();
  const area = document.getElementById('quizPlayArea');
  area.innerHTML = '<div class="quiz-submitting"><span class="material-symbols-outlined">sync</span><strong>' + (autoSubmitted ? 'Đã hết giờ, đang tự nộp bài...' : 'Đang nộp và chấm bài...') + '</strong></div>';
  try {
    const payload = { answers: quizState.questions.map(question => ({
      question_id: question.id,
      selected_index: Object.prototype.hasOwnProperty.call(quizState.answers, question.id) ? quizState.answers[question.id] : null
    })) };
    const result = await quizFetch('/api/quiz/decks/' + quizState.selectedDeckId + '/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    quizState.score = result.correct_count;
    quizState.results = Object.fromEntries(result.results.map(item => [item.question_id, item]));
    quizState.unansweredCount = result.unanswered_count;
    quizState.submitted = true;
    quizState.submitting = false;
    quizState.autoSubmitted = Boolean(autoSubmitted);
    renderQuizResult();
  } catch (error) {
    quizState.submitting = false;
    if (quizState.deadlineAt && getQuizRemainingSeconds() > 0) startQuizTimer();
    renderQuizQuestion();
    alert('Không thể nộp bài: ' + error.message);
  }
}

function nextQuizQuestion() {
  quizState.currentIndex += 1;
  if (quizState.currentIndex >= quizState.questions.length) {
    renderQuizResult();
    return;
  }
  quizState.answered = false;
  quizState.answering = false;
  renderQuizQuestion();
}

function renderQuizResult() {
  clearQuizTimer();
  const area = document.getElementById('quizPlayArea');
  const total = quizState.questions.length;
  const percent = total ? Math.round(quizState.score / total * 100) : 0;
  const isExam = quizState.mode === 'exam';
  const title = isExam ? (quizState.autoSubmitted ? 'HẾT GIỜ — BÀI ĐÃ TỰ NỘP' : 'ĐÃ NỘP BÀI LUYỆN THI') : 'HOÀN THÀNH ÔN TẬP';
  const details = isExam ? '<span>' + (total - (quizState.unansweredCount || 0)) + ' đã trả lời · ' + (quizState.unansweredCount || 0) + ' bỏ trống</span>' : '<span>Đáp án đã được hiện sau từng câu.</span>';
  const reviewButton = isExam ? '<button class="btn-secondary" type="button" onclick="renderExamAnswerReview()">Xem đáp án &amp; lời giải</button>' : '';
  area.innerHTML = '<div class="quiz-result"><span class="material-symbols-outlined">emoji_events</span><p>' + title + '</p><strong>' + quizState.score + ' / ' + total + '</strong><b>' + percent + '% chính xác</b>' + details + '<div><button class="btn-secondary" type="button" onclick="endQuizSession()">Về danh sách deck</button>' + reviewButton + '<button class="btn-primary" type="button" onclick="restartQuiz()">Làm lại</button></div></div>';
}

function renderExamAnswerReview() {
  if (quizState.mode !== 'exam') return;
  const labels = ['A', 'B', 'C', 'D', 'E'];
  const items = quizState.questions.map((question, index) => {
    const result = quizState.results[question.id];
    const chosen = result?.selected_index;
    const chosenText = chosen === null || chosen === undefined ? 'Bỏ trống' : labels[chosen] + '. ' + question.options[chosen];
    const correctText = result ? labels[result.correct_index] + '. ' + result.correct_option : '';
    const explanation = result?.explanation ? '<p>' + escapeQuizHtml(result.explanation) + '</p>' : '';
    return '<article class="quiz-answer-review ' + (result?.is_correct ? 'correct' : 'wrong') + '"><strong>Câu ' + (index + 1) + '. ' + escapeQuizHtml(question.question) + '</strong><span>Bạn chọn: ' + escapeQuizHtml(chosenText) + '</span><span>Đáp án đúng: ' + escapeQuizHtml(correctText) + '</span>' + explanation + '</article>';
  }).join('');
  document.getElementById('quizPlayArea').innerHTML = '<div class="quiz-review-header"><button class="btn-secondary" type="button" onclick="renderQuizResult()"><span class="material-symbols-outlined">arrow_back</span> Kết quả</button><strong>ĐÁP ÁN &amp; LỜI GIẢI</strong></div><div class="quiz-answer-review-list">' + items + '</div>';
}

function restartQuiz() {
  beginQuiz(quizState.selectedDeckId, quizState.mode, quizState.durationMinutes, quizState.shuffleQuestions);
}

function endQuizSession() {
  clearQuizTimer();
  quizState.questions = [];
  quizState.currentIndex = 0;
  quizState.answered = false;
  quizState.deadlineAt = null;
  document.getElementById('quizPlayPanel').style.display = 'none';
  renderQuizDeckList();
}

window.addEventListener('keydown', event => {
  if (document.getElementById('quizPlayPanel')?.style.display === 'none') return;
  if (event.target.matches('input, textarea, select')) return;
  const selectedIndex = Number(event.key) - 1;
  if (selectedIndex >= 0 && selectedIndex < 5) answerQuiz(selectedIndex);
  if (quizState.mode === 'review' && quizState.answered && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    nextQuizQuestion();
  }
});
