/* Hành trình ôn từ vựng 5 chặng. Không tự chấm rating ở browser. */
let vocabGameState = {
  sessionId: null, deck: null, stages: null, stageIndex: 0, indexes: {},
  reviewRevealed: false, selectedTile: null, matchedCards: new Set(),
  usedHint: false, startedAt: 0, timer: null, submitting: false, mode: 'choose', wordRushLocked: false, wordRushElapsed: null, fillPreparing: false,
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

function gameQualityLabel(quality) {
  return ({ exact: 'Chính xác', acceptable: 'Gần đúng', partial: 'Đủ ý một phần', wrong: 'Chưa đúng', unavailable: 'Chưa chấm' })[quality] || 'Đã chấm';
}

function gameEvaluationSourceLabel(source) {
  if ((source || '').indexOf('groq-') === 0) return 'Groq AI';
  if (source === 'openai') return 'OpenAI';
  if (source === 'local-empty') return 'Hệ thống';
  return source === 'unavailable' ? 'AI chưa sẵn sàng' : 'AI';
}

function gameWordRushAnalysis(result) {
  const analysis = result.evaluation_analysis || {};
  const fields = [
    ['Đã hiểu là', analysis.normalized_answer],
    ['Nghĩa', analysis.meaning_assessment],
    ['Chính tả / dạng từ', analysis.spelling_assessment],
    ['Kết luận', analysis.reason],
  ].filter(function (pair) { return pair[1]; });
  if (!fields.length) return '';
  const details = fields.map(function (pair) {
    return '<p><b>' + pair[0] + ':</b> ' + gameHtml(pair[1]) + '</p>';
  }).join('');
  return '<div class="game-evaluation-detail"><span class="game-evaluation-source">' +
    gameHtml(gameEvaluationSourceLabel(result.evaluation_source)) + '</span>' + details + '</div>';
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
      '<div class="vocab-game-loading"><span class="material-symbols-outlined">auto_awesome</span><strong>Đang tạo hành trình 5 chặng…</strong><small>Chặng điền từ AI chỉ được tạo khi bạn mở chặng đó.</small></div>';
    document.getElementById('vocabGameStageRail').innerHTML = '';
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const data = await vocabFetch('/api/vocab/decks/' + deckId + '/game-sessions', { method: 'POST' });
    vocabGameState = {
      sessionId: data.session_id, deck: data.deck, stages: data.stages, stageIndex: 0,
      indexes: { review: 0, word_rush: 0, fill_blank: 0, multiple_choice: 0 },
      reviewRevealed: false, selectedTile: null, matchedCards: new Set(), usedHint: false,
      startedAt: Date.now(), timer: null, submitting: false, mode: 'choose', wordRushLocked: false, wordRushElapsed: null, fillPreparing: false,
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
  stopGameTimer();
  const rail = document.getElementById('vocabGameStageRail');
  const meta = gameCurrentMeta();
  rail.innerHTML = vocabGameMeta.map(function (stage, index) {
    const status = vocabGameState.mode !== 'choose' && (index < vocabGameState.stageIndex ? 'done' : (index === vocabGameState.stageIndex ? 'active' : ''));
    return '<div class="vocab-game-stage ' + status + '"><i class="material-symbols-outlined">' + stage.icon + '</i><span>' + stage.label + '</span></div>';
  }).join('');
  if (vocabGameState.mode === 'choose') {
    renderGameLauncher();
    return;
  }
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

function gameStageCount(meta) {
  if (meta.id === 'matching') return vocabGameState.stages.matching.pair_count || 0;
  if (meta.id === 'fill_blank') return vocabGameState.stages.fill_count || (vocabGameState.stages.fill_blank || []).length;
  return (vocabGameState.stages[meta.id] || []).length;
}

function renderGameLauncher() {
  const cards = vocabGameMeta.map(function (meta, index) {
    const count = gameStageCount(meta);
    const disabled = !count;
    const suffix = meta.id === 'matching' ? ' cặp' : ' thẻ/câu';
    return '<button class="game-launch-card ' + (disabled ? 'disabled' : '') + '" ' + (disabled ? 'disabled' : 'onclick="gamePlayStage(' + index + ')"') + '>' +
      '<i class="material-symbols-outlined">' + meta.icon + '</i><strong>' + meta.label + '</strong><span>' + (count ? count + suffix : 'Chưa có thẻ phù hợp') + '</span><em>' + (disabled ? '—' : 'Chơi riêng') + '</em></button>';
  }).join('');
  document.getElementById('vocabGameArea').innerHTML =
    '<div class="game-launcher"><div class="game-launcher-intro"><p>CHỌN CÁCH ÔN</p><h3>Học theo hành trình hoặc luyện đúng chặng bạn cần</h3><span>Các chặng có chấm đáp án cập nhật lịch Spaced Repetition; lật thẻ chỉ giúp xem lại nhanh.</span><button class="btn-primary" onclick="gameBeginJourney()"><span class="material-symbols-outlined">rocket_launch</span> Bắt đầu cả 5 chặng</button></div><div class="game-launch-grid">' + cards + '</div></div>';
}

function gameBeginJourney() {
  vocabGameState.mode = 'journey';
  vocabGameState.stageIndex = 0;
  vocabGameState.indexes = { review: 0, word_rush: 0, fill_blank: 0, multiple_choice: 0 };
  vocabGameState.matchedCards = new Set();
  renderVocabGame();
}

function gamePlayStage(index) {
  vocabGameState.mode = 'single';
  vocabGameState.stageIndex = index;
  vocabGameState.indexes = { review: 0, word_rush: 0, fill_blank: 0, multiple_choice: 0 };
  vocabGameState.matchedCards = new Set();
  vocabGameState.selectedTile = null;
  renderVocabGame();
}
function gameNextStage() {
  stopGameTimer();
  if (vocabGameState.mode === 'single') {
    finishVocabGame();
    return;
  }
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
  stopGameTimer();
  renderGameReview();
}

function renderGameWordRush() {
  const items = gameCurrentItems();
  stopGameTimer();
  vocabGameState.wordRushLocked = false;
  vocabGameState.wordRushElapsed = null;
  const index = vocabGameState.indexes.word_rush;
  const item = items[index];
  if (!item) { gameNextStage(); return; }
  vocabGameState.startedAt = Date.now();
  document.getElementById('vocabGameArea').innerHTML =
    gameTitle('CHẶNG 2 · WORD RUSH', item.prompt_label, 'Trả lời nhanh để luyện khả năng gọi lại từ vựng.', (index + 1) + ' / ' + items.length) +
    '<div class="vocab-game-card rush-card"><div class="game-timer"><div id="gameTimerBar"></div><b id="gameTimerText">12.0s</b></div>' +
    '<button class="game-audio" data-word="' + gameHtml(item.audio_text) + '" onclick="gameSpeak(this.dataset.word)" aria-label="Nghe cách đọc"><span class="material-symbols-outlined">volume_up</span></button>' +
    '<h1>' + gameHtml(item.prompt) + '</h1><form onsubmit="submitWordRush(event)"><input id="gameWordRushInput" class="game-input" autocomplete="off" autofocus placeholder="Nhập câu trả lời…" />' +
    '<button id="gameWordRushSubmit" class="btn-primary" type="submit">Kiểm tra <span class="material-symbols-outlined">arrow_forward</span></button></form><div id="gameFeedback"></div></div>';
  const input = document.getElementById('gameWordRushInput');
  if (input) input.focus();
  const endAt = vocabGameState.startedAt + 12000;
  vocabGameState.timer = setInterval(function () {
    const left = Math.max(0, endAt - Date.now());
    const bar = document.getElementById('gameTimerBar');
    const text = document.getElementById('gameTimerText');
    if (bar) bar.style.width = (left / 120) + '%';
    if (text) text.textContent = (left / 1000).toFixed(1) + 's';
    if (!left) {
      stopGameTimer();
      submitWordRush(null, true);
    }
  }, 70);
}

async function submitWordRush(event, timedOut) {
  if (event) event.preventDefault();
  if (vocabGameState.submitting || vocabGameState.wordRushLocked) return;
  vocabGameState.submitting = true;
  vocabGameState.wordRushLocked = true;
  stopGameTimer();
  const item = gameCurrentItems()[vocabGameState.indexes.word_rush];
  const input = document.getElementById('gameWordRushInput');
  try {
  const submit = document.getElementById('gameWordRushSubmit');
  const feedback = document.getElementById('gameFeedback');
  const card = document.querySelector('.rush-card');
  const elapsed = vocabGameState.wordRushElapsed === null
    ? Math.min(12000, Math.max(0, Date.now() - vocabGameState.startedAt))
    : vocabGameState.wordRushElapsed;
  vocabGameState.wordRushElapsed = elapsed;
  const answer = timedOut ? '' : (input ? input.value : '');
  if (input) input.disabled = true;
  if (submit) submit.disabled = true;
  if (card) card.classList.add('is-evaluating');
  if (feedback) feedback.innerHTML = '<div class="game-feedback evaluating"><span class="material-symbols-outlined">hourglass_top</span><strong>Đồng hồ đã dừng. Đang đánh giá đáp án…</strong></div>';

    const result = await vocabFetch('/api/vocab/game-sessions/' + vocabGameState.sessionId + '/word-rush', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: item.id, answer: answer, time_taken_ms: elapsed }),
    });
    gameSetMetrics(result.points, result.streak);
    if (card) card.classList.remove("is-evaluating");
    const analysis = gameWordRushAnalysis(result);
    if (result.needs_retry) {
      if (input) input.disabled = false;
      if (submit) submit.disabled = false;
      vocabGameState.wordRushLocked = false;
      if (feedback) feedback.innerHTML = "<div class='game-feedback unavailable'><strong>" + gameHtml(result.message) + "</strong>" + analysis + "<button class='btn-secondary' onclick='submitWordRush(null, false)'>Chấm lại</button></div>";
      return;
    }
    const scoreDetail = result.score_awarded !== undefined ? "<span class='game-score-detail'>+" + result.score_awarded + " điểm · " + gameQualityLabel(result.quality) + "</span>" : "";
    if (feedback) feedback.innerHTML = "<div class='game-feedback " + (result.correct ? "correct" : "wrong") + "'><strong>" + gameHtml(result.message) + "</strong>" + scoreDetail + analysis + "<button class='btn-secondary' onclick='gameAdvanceWordRush()'>Tiếp tục</button></div>";
  } catch (err) {
    alert('Không thể ghi nhận đáp án: ' + err.message);
    vocabGameState.wordRushLocked = false;
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
      const nextLabel = vocabGameState.mode === 'single' ? 'Hoàn tất chặng' : 'Sang bài tập điền từ';
      document.getElementById('vocabGameArea').innerHTML += '<div class="game-feedback correct"><strong>Hoàn thành chặng ghép cặp!</strong><button class="btn-primary" onclick="gameNextStage()">' + nextLabel + '</button></div>';
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
  if (vocabGameState.stages.fill_source === 'pending') {
    prepareGameFillBlank();
    return;
  }

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

async function prepareGameFillBlank() {
  if (vocabGameState.fillPreparing) return;
  vocabGameState.fillPreparing = true;
  document.getElementById('vocabGameArea').innerHTML =
    gameTitle('CHẶNG 4 · FILL IN THE BLANK', 'Đang chuẩn bị ngữ cảnh', 'AI đang tạo câu từ các từ đến hạn của phiên học. Các chặng khác không phải chờ bước này.', '…') +
    '<div class="vocab-game-loading"><span class="material-symbols-outlined">auto_awesome</span><strong>Đang tạo tối đa 25 câu điền từ…</strong><small>Bạn có thể quay lại sau ít phút nếu provider AI đang bận.</small></div>';
  try {
    const data = await vocabFetch('/api/vocab/game-sessions/' + vocabGameState.sessionId + '/prepare-fill-blank', { method: 'POST' });
    vocabGameState.stages.fill_blank = data.items || [];
    vocabGameState.stages.fill_source = data.source || 'local-fallback';
    vocabGameState.stages.fill_count = vocabGameState.stages.fill_blank.length;
    vocabGameState.fillPreparing = false;
    renderGameFillBlank();
  } catch (err) {
    vocabGameState.fillPreparing = false;
    document.getElementById('vocabGameArea').innerHTML =
      '<div class="vocab-game-empty"><i class="material-symbols-outlined">cloud_off</i><h3>Chưa thể tạo bài điền từ</h3><p>' + gameHtml(err.message) + '</p><button class="btn-primary" onclick="renderGameFillBlank()">Thử lại</button><button class="btn-secondary" onclick="endVocabGame(false)">Về deck</button></div>';
  }
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
  stopGameTimer();
  const area = document.getElementById('vocabGameArea');
  area.innerHTML = '<div class="vocab-game-loading"><span class="material-symbols-outlined">sync</span><strong>Đang tính lịch ôn tiếp theo…</strong></div>';
  try {
    const result = await vocabFetch('/api/vocab/game-sessions/' + vocabGameState.sessionId + '/finish', { method: 'POST' });
    gameSetMetrics(result.points, result.best_streak);
    const title = vocabGameState.mode === 'single' ? 'Hoàn thành chặng ôn tập!' : 'Hoàn thành hành trình!';
    area.innerHTML = '<div class="vocab-game-finish"><span class="material-symbols-outlined">workspace_premium</span><h2>' + title + '</h2><p>' + gameHtml(result.message) + '</p><div><b>' + result.points + '</b><span>điểm</span><b>' + result.best_streak + '</b><span>streak tốt nhất</span><b>' + result.applied_cards + '</b><span>thẻ đã cập nhật lịch</span></div><button class="btn-primary" onclick="endVocabGame(false)">Về deck từ vựng</button></div>';
    renderVocabWorkspace();
  } catch (err) {
    area.innerHTML = '<div class="vocab-game-empty"><strong>Chưa thể lưu kết quả</strong><p>' + gameHtml(err.message) + '</p><button class="btn-primary" onclick="finishVocabGame()">Thử lại</button></div>';
  }
}

async function endVocabGame(ask) {
  if (ask && vocabGameState.sessionId && !confirm('Lưu kết quả các chặng đã làm và kết thúc hành trình?')) return;
  stopGameTimer();
  if (vocabGameState.sessionId && ask) {
    try { await vocabFetch('/api/vocab/game-sessions/' + vocabGameState.sessionId + '/finish', { method: 'POST' }); } catch (_) {}
  }
  document.getElementById('vocabGamePanel').style.display = 'none';
  vocabGameState = { sessionId: null, deck: null, stages: null, stageIndex: 0, indexes: {}, timer: null };
  renderVocabWorkspace();
}

function stopGameTimer() {
  if (vocabGameState.timer) clearInterval(vocabGameState.timer);
  vocabGameState.timer = null;
}

document.addEventListener('keydown', function (event) {
  const panel = document.getElementById('vocabGamePanel');
  if (!panel || panel.style.display === 'none') return;
  if (event.key === 'Escape') endVocabGame(true);
});
