/* Hành trình ôn từ vựng 5 chặng. Không tự chấm rating ở browser. */
let vocabGameState = {
  sessionId: null, deck: null, stages: null, stageIndex: 0, indexes: {},
  reviewRevealed: false, selectedTile: null, matchedCards: new Set(),
  usedHint: false, startedAt: 0, timer: null, submitting: false,
};

const vocabGameMeta = [
  { id: 'review', label: '1. Lật thẻ', icon: 'style' },
  { id: 'word_rush', label: '2. Word Rush', icon: 'bolt' },
  { id: 'matching', label: '3. Ghép cặp', icon: 'join' },
  { id: 'fill_blank', label: '4. Điền từ', icon: 'edit_note' },
  { id: 'multiple_choice', label: '5. Trắc nghiệm', icon: 'quiz' },
];

function gameHtml(value) {
  return escapeVocabHtml(value || '').replace(/\n/g, '<br>');
}

function gameCurrentMeta() {
  return vocabGameMeta[vocabGameState.stageIndex];
}

function gameCurrentItems() {
  const meta = gameCurrentMeta();
  return meta ? (vocabGameState.stages[meta.id] || []) : [];
}

function gameSetMetrics(points, streak) {
  if (points !== undefined) document.getElementById('vocabGamePoints').textContent = points;
  if (streak !== undefined) document.getElementById('vocabGameStreak').textContent = streak;
}

async function startVocabGame(deckId) {
  const panel = document.getElementById('vocabGamePanel');
  try {
    const deck = (globalData.vocabDecks || []).find(function (item) { return item.id === deckId; });
    document.getElementById('vocabStudyPanel').style.display = 'none';
    document.getElementById('vocabDetailPanel').style.display = 'none';
    panel.style.display = 'block';
    document.getElementById('vocabGameDeckName').textContent = deck ? deck.name : 'Đang chuẩn bị deck…';
    document.getElementById('vocabGameArea').innerHTML =
      '<div class="vocab-game-loading"><span class="material-symbols-outlined">auto_awesome</span><strong>Đang tạo hành trình 5 chặng…</strong><small>Nếu có thẻ mature, hệ thống sẽ chuẩn bị bài điền từ phù hợp.</small></div>';
    document.getElementById('vocabGameStageRail').innerHTML = '';
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const data = await vocabFetch('/api/vocab/decks/' + deckId + '/game-sessions', { method: 'POST' });
    vocabGameState = {
      sessionId: data.session_id, deck: data.deck, stages: data.stages, stageIndex: 0,
      indexes: { review: 0, word_rush: 0, fill_blank: 0, multiple_choice: 0 },
      reviewRevealed: false, selectedTile: null, matchedCards: new Set(), usedHint: false,
      startedAt: Date.now(), timer: null, submitting: false,
    };
    vocabState.selectedDeckId = deckId;
    vocabState.selectedDeck = data.deck;
    gameSetMetrics(data.points || 0, 0);
    renderVocabGame();
  } catch (err) {
    document.getElementById('vocabGameArea').innerHTML =
      '<div class="vocab-game-empty"><strong>Chưa thể bắt đầu hành trình</strong><p>' + gameHtml(err.message) + '</p><button class="btn-secondary" onclick="endVocabGame(false)">Quay lại deck</button></div>';
  }
}

function renderVocabGame() {
  clearInterval(vocabGameState.timer);
  const rail = document.getElementById('vocabGameStageRail');
  const meta = gameCurrentMeta();
  rail.innerHTML = vocabGameMeta.map(function (stage, index) {
    const status = index < vocabGameState.stageIndex ? 'done' : (index === vocabGameState.stageIndex ? 'active' : '');
    return '<div class="vocab-game-stage ' + status + '"><i class="material-symbols-outlined">' + stage.icon + '</i><span>' + stage.label + '</span></div>';
  }).join('');
  if (!meta) {
    finishVocabGame();
    return;
  }
  if (!vocabGameState.stages.review.length) {
    document.getElementById('vocabGameArea').innerHTML =
      '<div class="vocab-game-empty"><i class="material-symbols-outlined">celebration</i><h3>Hôm nay chưa có thẻ đến hạn</h3><p>Giữ nhịp học đều, deck sẽ tự mở lại khi có lịch ôn.</p><button class="btn-primary" onclick="endVocabGame(false)">Về deck</button></div>';
    return;
  }
  if (meta.id === 'review') renderGameReview();
  if (meta.id === 'word_rush') renderGameWordRush();
  if (meta.id === 'matching') renderGameMatching();
  if (meta.id === 'fill_blank') renderGameFillBlank();
  if (meta.id === 'multiple_choice') renderGameMultipleChoice();
}

function gameTitle(kicker, title, subtitle, progress) {
  return '<div class="vocab-game-heading"><div><p>' + kicker + '</p><h3>' + title + '</h3><span>' + subtitle + '</span></div><b>' + progress + '</b></div>';
}

function gameNextStage() {
  clearInterval(vocabGameState.timer);
  vocabGameState.stageIndex += 1;
  vocabGameState.startedAt = Date.now();
  vocabGameState.selectedTile = null;
  vocabGameState.usedHint = false;
  renderVocabGame();
}

function renderGameReview() {
  const items = gameCurrentItems();
  const index = vocabGameState.indexes.review;
  const card = items[index];
  if (!card) { gameNextStage(); return; }
  const face = vocabGameState.reviewRevealed
    ? '<div class="game-answer"><span>ĐÁP ÁN</span><strong>' + gameHtml(card.back) + '</strong><p>' + gameHtml(card.example || 'Hãy nhớ lại ngữ cảnh dùng từ này.') + '</p></div>'
    : '<div class="game-answer hidden"><span>NHẤN LẬT THẺ ĐỂ XEM</span></div>';
  document.getElementById('vocabGameArea').innerHTML =
    gameTitle('CHẶNG 1 · ÔN NHẸ', card.direction_label || 'ANH → VIỆT', 'Không chấm điểm — hãy kích hoạt trí nhớ trước khi chơi.', (index + 1) + ' / ' + items.length) +
    '<div class="vocab-game-card review-card"><span class="game-card-label">' + gameHtml(card.direction_label || '') + '</span><h1>' + gameHtml(card.front) + '</h1>' + face +
    '<div class="game-actions">' +
      (vocabGameState.reviewRevealed
        ? '<button class="btn-primary" onclick="gameAdvanceReview()">Thẻ tiếp theo <span class="material-symbols-outlined">arrow_forward</span></button>'
        : '<button class="btn-primary" onclick="gameFlipReview()"><span class="material-symbols-outlined">flip</span> Lật thẻ</button>') +
    '</div></div>';
}

function gameFlipReview() {
  vocabGameState.reviewRevealed = true;
  renderGameReview();
}

function gameAdvanceReview() {
  vocabGameState.indexes.review += 1;
  vocabGameState.reviewRevealed = false;
  renderGameReview();
}

function renderGameWordRush() {
  const items = gameCurrentItems();
  const index = vocabGameState.indexes.word_rush;
  const item = items[index];
  if (!item) { gameNextStage(); return; }
  vocabGameState.startedAt = Date.now();
  document.getElementById('vocabGameArea').innerHTML =
    gameTitle('CHẶNG 2 · WORD RUSH', item.prompt_label, 'Trả lời nhanh để luyện khả năng gọi lại từ vựng.', (index + 1) + ' / ' + items.length) +
    '<div class="vocab-game-card rush-card"><div class="game-timer"><div id="gameTimerBar"></div><b id="gameTimerText">12.0s</b></div>' +
    '<button class="game-audio" data-word="' + gameHtml(item.audio_text) + '" onclick="gameSpeak(this.dataset.word)" aria-label="Nghe cách đọc"><span class="material-symbols-outlined">volume_up</span></button>' +
    '<h1>' + gameHtml(item.prompt) + '</h1><form onsubmit="submitWordRush(event)"><input id="gameWordRushInput" class="game-input" autocomplete="off" autofocus placeholder="Nhập câu trả lời…" />' +
    '<button class="btn-primary" type="submit">Kiểm tra <span class="material-symbols-outlined">arrow_forward</span></button></form><div id="gameFeedback"></div></div>';
  const input = document.getElementById('gameWordRushInput');
  if (input) input.focus();
  const endAt = Date.now() + 12000;
  vocabGameState.timer = setInterval(function () {
    const left = Math.max(0, endAt - Date.now());
    const bar = document.getElementById('gameTimerBar');
    const text = document.getElementById('gameTimerText');
    if (bar) bar.style.width = (left / 120) + '%';
    if (text) text.textContent = (left / 1000).toFixed(1) + 's';
    if (!left) submitWordRush(null, true);
  }, 70);
}

async function submitWordRush(event, timedOut) {
  if (event) event.preventDefault();
  if (vocabGameState.submitting) return;
  vocabGameState.submitting = true;
  clearInterval(vocabGameState.timer);
  const item = gameCurrentItems()[vocabGameState.indexes.word_rush];
  const input = document.getElementById('gameWordRushInput');
  try {
    const result = await vocabFetch('/api/vocab/game-sessions/' + vocabGameState.sessionId + '/word-rush', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: item.id, answer: timedOut ? '' : input.value, time_taken_ms: Date.now() - vocabGameState.startedAt }),
    });
    gameSetMetrics(result.points, result.streak);
    if (input) input.disabled = true;
    const feedback = document.getElementById('gameFeedback');
    if (feedback) feedback.innerHTML = '<div class="game-feedback ' + (result.correct ? 'correct' : 'wrong') + '"><strong>' + gameHtml(result.message) + '</strong><button class="btn-secondary" onclick="gameAdvanceWordRush()">Tiếp tục</button></div>';
  } catch (err) {
    alert('Không thể ghi nhận đáp án: ' + err.message);
    renderGameWordRush();
  } finally {
    vocabGameState.submitting = false;
  }
}

function gameAdvanceWordRush() {
  vocabGameState.indexes.word_rush += 1;
  renderGameWordRush();
}

function renderGameMatching() {
  const stage = vocabGameState.stages.matching;
  if (!stage.pair_count) { gameNextStage(); return; }
  const completed = vocabGameState.matchedCards.size;
  const tiles = stage.tiles.map(function (tile) {
    const cardId = tile.id.split('-').slice(1).join('-');
    const matched = vocabGameState.matchedCards.has(cardId);
    const selected = vocabGameState.selectedTile === tile.id;
    return '<button class="game-match-tile ' + (matched ? 'matched' : '') + (selected ? ' selected' : '') + '" ' + (matched ? 'disabled' : '') + ' data-tile="' + gameHtml(tile.id) + '" onclick="gamePickMatchTile(this.dataset.tile)">' + gameHtml(tile.value) + '</button>';
  }).join('');
  document.getElementById('vocabGameArea').innerHTML =
    gameTitle('CHẶNG 3 · MATCHING PAIRS', 'Ghép từ với nghĩa', 'Ghép đúng lần đầu được Good; chọn nhầm sẽ được tính Again.', completed + ' / ' + stage.pair_count) +
    '<div class="vocab-game-card matching-card"><div class="game-match-grid">' + tiles + '</div><p class="game-tip">Chọn một từ, sau đó chọn nghĩa tương ứng.</p></div>';
}

async function gamePickMatchTile(tileId) {
  if (vocabGameState.submitting) return;
  const stage = vocabGameState.stages.matching;
  const tile = stage.tiles.find(function (item) { return item.id === tileId; });
  if (!tile || vocabGameState.matchedCards.has(tileId.split('-').slice(1).join('-'))) return;
  if (!vocabGameState.selectedTile) {
    vocabGameState.selectedTile = tileId;
    renderGameMatching();
    return;
  }
  const first = stage.tiles.find(function (item) { return item.id === vocabGameState.selectedTile; });
  if (first.type === tile.type) {
    vocabGameState.selectedTile = tileId;
    renderGameMatching();
    return;
  }
  vocabGameState.submitting = true;
  try {
    const result = await vocabFetch('/api/vocab/game-sessions/' + vocabGameState.sessionId + '/matching', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_tile_id: first.id, second_tile_id: tile.id, time_taken_ms: Date.now() - vocabGameState.startedAt }),
    });
    gameSetMetrics(result.points, result.streak);
    if (result.matched_card_id !== null) vocabGameState.matchedCards.add(String(result.matched_card_id));
    vocabGameState.selectedTile = null;
    if (vocabGameState.matchedCards.size >= stage.pair_count) {
      document.getElementById('vocabGameArea').innerHTML += '<div class="game-feedback correct"><strong>Hoàn thành chặng ghép cặp!</strong><button class="btn-primary" onclick="gameNextStage()">Sang bài tập điền từ</button></div>';
    } else {
      renderGameMatching();
    }
  } catch (err) {
    alert('Không thể ghi nhận lượt ghép: ' + err.message);
    vocabGameState.selectedTile = null;
    renderGameMatching();
  } finally {
    vocabGameState.submitting = false;
  }
}

function renderGameFillBlank() {
  const items = gameCurrentItems();
  const index = vocabGameState.indexes.fill_blank;
  const item = items[index];
  if (!item) { gameNextStage(); return; }
  vocabGameState.startedAt = Date.now();
  const hint = vocabGameState.usedHint ? '<p class="game-hint"><span class="material-symbols-outlined">lightbulb</span> ' + gameHtml(item.hint) + '</p>' : '<button class="game-hint-btn" onclick="gameUseHint()">Xem gợi ý (lượt này tính Again)</button>';
  document.getElementById('vocabGameArea').innerHTML =
    gameTitle('CHẶNG 4 · FILL IN THE BLANK', 'Gọi lại từ trong ngữ cảnh', 'Câu do AI tạo từ dữ liệu deck hoặc câu dự phòng khi AI không sẵn sàng.', (index + 1) + ' / ' + items.length) +
    '<div class="vocab-game-card fill-card"><blockquote>' + gameHtml(item.sentence) + '</blockquote>' + hint +
    '<form onsubmit="submitFillBlank(event)"><input id="gameFillInput" class="game-input" autocomplete="off" autofocus placeholder="Nhập từ tiếng Anh…" /><button class="btn-primary" type="submit">Chấm bài</button></form><div id="gameFeedback"></div></div>';
  const input = document.getElementById('gameFillInput');
  if (input) input.focus();
}

function gameUseHint() {
  vocabGameState.usedHint = true;
  renderGameFillBlank();
}

async function submitFillBlank(event) {
  event.preventDefault();
  if (vocabGameState.submitting) return;
  vocabGameState.submitting = true;
  const item = gameCurrentItems()[vocabGameState.indexes.fill_blank];
  const input = document.getElementById('gameFillInput');
  try {
    const result = await vocabFetch('/api/vocab/game-sessions/' + vocabGameState.sessionId + '/fill-blank', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: item.id, answer: input.value, used_hint: vocabGameState.usedHint, time_taken_ms: Date.now() - vocabGameState.startedAt }),
    });
    gameSetMetrics(result.points, result.streak);
    input.disabled = true;
    document.getElementById('gameFeedback').innerHTML = '<div class="game-feedback ' + (result.correct ? 'correct' : 'wrong') + '"><strong>' + gameHtml(result.message) + '</strong><button class="btn-secondary" onclick="gameAdvanceFillBlank()">Tiếp tục</button></div>';
  } catch (err) {
    alert('Không thể chấm câu trả lời: ' + err.message);
  } finally {
    vocabGameState.submitting = false;
  }
}

function gameAdvanceFillBlank() {
  vocabGameState.indexes.fill_blank += 1;
  vocabGameState.usedHint = false;
  renderGameFillBlank();
}

function renderGameMultipleChoice() {
  const items = gameCurrentItems();
  const index = vocabGameState.indexes.multiple_choice;
  const item = items[index];
  if (!item) { gameNextStage(); return; }
  vocabGameState.startedAt = Date.now();
  const options = item.options.map(function (option, optionIndex) {
    return '<button class="game-option" data-option="' + gameHtml(option) + '" onclick="submitGameMcq(this.dataset.option)"><b>' + String.fromCharCode(65 + optionIndex) + '</b><span>' + gameHtml(option) + '</span></button>';
  }).join('');
  document.getElementById('vocabGameArea').innerHTML =
    gameTitle('CHẶNG 5 · MULTIPLE CHOICE', 'Nghĩa / nhận diện nhanh', 'Đúng nhưng trả lời chậm sẽ được tính Hard để lịch ôn phản ánh chính xác.', (index + 1) + ' / ' + items.length) +
    '<div class="vocab-game-card mcq-card"><h2>' + gameHtml(item.question) + '</h2><div class="game-option-list">' + options + '</div><div id="gameFeedback"></div></div>';
}

async function submitGameMcq(option) {
  if (vocabGameState.submitting) return;
  vocabGameState.submitting = true;
  const item = gameCurrentItems()[vocabGameState.indexes.multiple_choice];
  document.querySelectorAll('.game-option').forEach(function (button) { button.disabled = true; });
  try {
    const result = await vocabFetch('/api/vocab/game-sessions/' + vocabGameState.sessionId + '/multiple-choice', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: item.id, option: option, time_taken_ms: Date.now() - vocabGameState.startedAt }),
    });
    gameSetMetrics(result.points, result.streak);
    document.getElementById('gameFeedback').innerHTML = '<div class="game-feedback ' + (result.correct ? 'correct' : 'wrong') + '"><strong>' + gameHtml(result.message) + '</strong><button class="btn-secondary" onclick="gameAdvanceMcq()">Tiếp tục</button></div>';
  } catch (err) {
    alert('Không thể chấm đáp án: ' + err.message);
    document.querySelectorAll('.game-option').forEach(function (button) { button.disabled = false; });
  } finally {
    vocabGameState.submitting = false;
  }
}

function gameAdvanceMcq() {
  vocabGameState.indexes.multiple_choice += 1;
  renderGameMultipleChoice();
}

function gameSpeak(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.88;
  window.speechSynthesis.speak(utterance);
}

async function finishVocabGame() {
  clearInterval(vocabGameState.timer);
  const area = document.getElementById('vocabGameArea');
  area.innerHTML = '<div class="vocab-game-loading"><span class="material-symbols-outlined">sync</span><strong>Đang tính lịch ôn tiếp theo…</strong></div>';
  try {
    const result = await vocabFetch('/api/vocab/game-sessions/' + vocabGameState.sessionId + '/finish', { method: 'POST' });
    gameSetMetrics(result.points, result.best_streak);
    area.innerHTML = '<div class="vocab-game-finish"><span class="material-symbols-outlined">workspace_premium</span><h2>Hoàn thành hành trình!</h2><p>' + gameHtml(result.message) + '</p><div><b>' + result.points + '</b><span>điểm</span><b>' + result.best_streak + '</b><span>streak tốt nhất</span><b>' + result.applied_cards + '</b><span>thẻ đã cập nhật lịch</span></div><button class="btn-primary" onclick="endVocabGame(false)">Về deck từ vựng</button></div>';
    renderVocabWorkspace();
  } catch (err) {
    area.innerHTML = '<div class="vocab-game-empty"><strong>Chưa thể lưu kết quả</strong><p>' + gameHtml(err.message) + '</p><button class="btn-primary" onclick="finishVocabGame()">Thử lại</button></div>';
  }
}

async function endVocabGame(ask) {
  if (ask && vocabGameState.sessionId && !confirm('Lưu kết quả các chặng đã làm và kết thúc hành trình?')) return;
  clearInterval(vocabGameState.timer);
  if (vocabGameState.sessionId && ask) {
    try { await vocabFetch('/api/vocab/game-sessions/' + vocabGameState.sessionId + '/finish', { method: 'POST' }); } catch (_) {}
  }
  document.getElementById('vocabGamePanel').style.display = 'none';
  vocabGameState = { sessionId: null, deck: null, stages: null, stageIndex: 0, indexes: {}, timer: null };
  renderVocabWorkspace();
}

document.addEventListener('keydown', function (event) {
  const panel = document.getElementById('vocabGamePanel');
  if (!panel || panel.style.display === 'none') return;
  if (event.key === 'Escape') endVocabGame(true);
});
