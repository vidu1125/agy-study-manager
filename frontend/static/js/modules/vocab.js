/* ==========================================================================
   MODULE: HỌC TỪ VỰNG — SPACED REPETITION (ANKI ALGORITHM)
   Handles deck manager, flashcard study session, answering, reviews, configs.
   ========================================================================== */

let vocabState = {
  selectedDeckId: null,
  selectedDeck: null,
  sessionId: null,
  currentCard: null,
  revealed: false,
  shownAt: null,
  intervals: {},
  remaining: { new: 0, learning: 0, review: 0 },
  browseTimer: null,
  answering: false,
  browseCards: []
};

let vocabImportMode = 'file';

function escapeVocabHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

function vocabText(value) {
  return escapeVocabHtml(value).replace(/\n/g, '<br>');
}

async function vocabFetch(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || 'Không thể xử lý yêu cầu');
  return data;
}

async function fetchVocabDecks() {
  const res = await fetch('/api/vocab/decks');
  if (!res.ok) throw new Error('Không thể tải bộ từ vựng');
  globalData.vocabDecks = await res.json();
  return globalData.vocabDecks;
}

async function renderVocabWorkspace() {
  const container = document.getElementById('vocabDeckList');
  if (!container) return;
  try {
    await fetchVocabDecks();
    if (vocabState.selectedDeckId && !globalData.vocabDecks.some(d => d.id === vocabState.selectedDeckId)) {
      vocabState.selectedDeckId = null;
      vocabState.selectedDeck = null;
    }
    renderVocabDeckList();
    if (vocabState.selectedDeckId) showVocabBrowse();
  } catch (err) {
    container.innerHTML = `<p class="vocab-empty vocab-error">${escapeVocabHtml(err.message)}</p>`;
  }
}

function renderVocabDeckList() {
  const container = document.getElementById('vocabDeckList');
  const decks = globalData.vocabDecks;
  if (!decks.length) {
    container.innerHTML = `
      <div class="vocab-empty">
        <strong>Chưa có bộ từ vựng nào.</strong>
        <span>Tạo deck đầu tiên, thêm từ và bắt đầu học theo lịch ôn tự động.</span>
      </div>`;
    return;
  }
  const totals = decks.reduce((sum, deck) => ({
    new: sum.new + (deck.remaining?.new || 0),
    review: sum.review + (deck.remaining?.review || 0),
    learning: sum.learning + (deck.remaining?.learning || 0)
  }), { new: 0, review: 0, learning: 0 });
  container.innerHTML = `
    ${decks.map(deck => `
      <article class="vocab-deck-card ${deck.id === vocabState.selectedDeckId ? 'selected' : ''}">
        <button class="vocab-deck-main" onclick="selectVocabDeck(${deck.id})">
          <span class="vocab-deck-name">${escapeVocabHtml(deck.name)}</span>
          <span class="vocab-deck-description">${escapeVocabHtml(deck.description || 'Basic Vocabulary · 2 chiều')}</span>
          <span class="vocab-badges"><b class="vocab-badge new">${deck.remaining?.new || 0} mới</b><b class="vocab-badge review">${(deck.remaining?.review || 0) + (deck.remaining?.learning || 0)} ôn</b></span>
        </button>
        <button class="vocab-start-btn" onclick="startVocabGame(${deck.id})" title="Bắt đầu hành trình 5 chặng">▶</button>
      </article>`).join('')}
    <div class="vocab-total">Tổng hôm nay: <strong>${totals.new} thẻ mới</strong> · <strong>${totals.review + totals.learning} thẻ cần ôn</strong></div>`;
}

async function selectVocabDeck(deckId) {
  vocabState.selectedDeckId = deckId;
  try {
    const data = await vocabFetch(`/api/vocab/decks/${deckId}`);
    vocabState.selectedDeck = data.deck;
    renderVocabDeckList();
    await showVocabBrowse();
  } catch (err) {
    alert(`Lỗi: ${err.message}`);
  }
}

function fillVocabDeckOptions(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  select.innerHTML = globalData.vocabDecks.map(deck =>
    `<option value="${deck.id}">${escapeVocabHtml(deck.name)}</option>`
  ).join('');
  if (vocabState.selectedDeckId) select.value = String(vocabState.selectedDeckId);
}

function openVocabAddNote() {
  if (!globalData.vocabDecks.length) {
    openModal('modalCreateVocabDeck');
    return;
  }
  fillVocabDeckOptions('vocabNoteDeck');
  openModal('modalAddVocabNote');
}

function openVocabJsonImport() {
  if (!globalData.vocabDecks.length) {
    alert('Hãy tạo một deck trước khi import từ vựng.');
    openModal('modalCreateVocabDeck');
    return;
  }
  fillVocabDeckOptions('vocabImportDeck');
  document.getElementById('vocabImportFile').value = '';
  document.getElementById('vocabImportJsonText').value = '';
  setVocabImportMode('file');
  setVocabImportStatus('');
  openModal('modalVocabJsonImport');
}

function setVocabImportMode(mode) {
  vocabImportMode = mode;
  const isFile = mode === 'file';
  document.getElementById('vocabImportFileTab').classList.toggle('active', isFile);
  document.getElementById('vocabImportPasteTab').classList.toggle('active', !isFile);
  document.getElementById('vocabImportFilePanel').style.display = isFile ? 'flex' : 'none';
  document.getElementById('vocabImportPastePanel').style.display = isFile ? 'none' : 'flex';
  setVocabImportStatus('');
}

function setVocabImportStatus(message, isError = false) {
  const status = document.getElementById('vocabImportStatus');
  if (!status) return;
  status.textContent = message;
  status.classList.toggle('error', isError);
}

async function copyVocabImportExample() {
  const example = document.getElementById('vocabImportExample').textContent.trim();
  try {
    await navigator.clipboard.writeText(example);
    setVocabImportStatus('Đã sao chép JSON mẫu. Bạn có thể chuyển sang “Dán JSON” và chỉnh sửa.');
  } catch (_) {
    setVocabImportStatus('Không thể sao chép tự động. Hãy chọn và sao chép JSON mẫu thủ công.', true);
  }
}

async function submitVocabJsonImport() {
  const deckId = Number(document.getElementById('vocabImportDeck').value);
  if (!Number.isInteger(deckId) || deckId <= 0) {
    setVocabImportStatus('Hãy chọn deck nhận từ vựng.', true);
    return;
  }

  let rawJson = '';
  if (vocabImportMode === 'file') {
    const file = document.getElementById('vocabImportFile').files[0];
    if (!file) {
      setVocabImportStatus('Hãy chọn một file JSON.', true);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setVocabImportStatus('File JSON tối đa 5 MB. Hãy tách file thành nhiều lần import.', true);
      return;
    }
    rawJson = await file.text();
  } else {
    rawJson = document.getElementById('vocabImportJsonText').value.trim();
    if (!rawJson) {
      setVocabImportStatus('Hãy dán nội dung JSON.', true);
      return;
    }
  }

  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch (error) {
    setVocabImportStatus(`JSON không hợp lệ: ${error.message}`, true);
    return;
  }
  const payload = Array.isArray(parsed) ? { notes: parsed } : parsed;
  if (!payload || !Array.isArray(payload.notes)) {
    setVocabImportStatus('JSON cần có dạng { "notes": [ ... ] } hoặc một mảng [ ... ].', true);
    return;
  }

  const submitButton = document.getElementById('vocabImportSubmit');
  submitButton.disabled = true;
  setVocabImportStatus(`Đang kiểm tra và import ${payload.notes.length} mục...`);
  try {
    const result = await vocabFetch(`/api/vocab/decks/${deckId}/notes/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    vocabState.selectedDeckId = deckId;
    const deckData = await vocabFetch(`/api/vocab/decks/${deckId}`);
    vocabState.selectedDeck = deckData.deck;
    closeModal('modalVocabJsonImport');
    await renderVocabWorkspace();
    await showVocabBrowse();
    const skipped = result.skipped_duplicates ? ` · bỏ qua ${result.skipped_duplicates} mục trùng` : '';
    alert(`Đã import ${result.imported_notes} từ và tạo ${result.created_cards} thẻ${skipped}.`);
  } catch (error) {
    setVocabImportStatus(`Không thể import: ${error.message}`, true);
  } finally {
    submitButton.disabled = false;
  }
}

async function createVocabDeck() {
  const name = document.getElementById('vocabDeckName').value.trim();
  const description = document.getElementById('vocabDeckDescription').value.trim();
  try {
    const data = await vocabFetch('/api/vocab/decks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description })
    });
    vocabState.selectedDeckId = data.deck.id;
    vocabState.selectedDeck = data.deck;
    document.getElementById('vocabDeckName').value = '';
    document.getElementById('vocabDeckDescription').value = '';
    closeModal('modalCreateVocabDeck');
    await renderVocabWorkspace();
    await showVocabBrowse();
  } catch (err) {
    alert(`Lỗi: ${err.message}`);
  }
}

async function createVocabNote() {
  const deckId = Number(document.getElementById('vocabNoteDeck').value);
  const payload = {
    word: document.getElementById('vocabWord').value.trim(),
    ipa: document.getElementById('vocabIpa').value.trim(),
    meaning: document.getElementById('vocabMeaning').value.trim(),
    example: document.getElementById('vocabExample').value.trim(),
    tags: document.getElementById('vocabTags').value.trim(),
    bidirectional: document.getElementById('vocabBidirectional').checked
  };
  try {
    const data = await vocabFetch(`/api/vocab/decks/${deckId}/notes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    ['vocabWord', 'vocabIpa', 'vocabMeaning', 'vocabExample', 'vocabTags'].forEach(id => { document.getElementById(id).value = ''; });
    vocabState.selectedDeckId = deckId;
    closeModal('modalAddVocabNote');
    await renderVocabWorkspace();
    await showVocabBrowse();
    alert(`Đã thêm từ và sinh ${data.cards.length} thẻ ôn tập.`);
  } catch (err) {
    alert(`Lỗi: ${err.message}`);
  }
}

async function startVocabSession(deckId) {
  try {
    const data = await vocabFetch(`/api/vocab/decks/${deckId}/sessions`, { method: 'POST' });
    vocabState.selectedDeckId = deckId;
    vocabState.selectedDeck = data.deck;
    vocabState.sessionId = data.session_id;
    document.getElementById('vocabStudyDeckName').textContent = data.deck.name;
    document.getElementById('vocabStudyPanel').style.display = 'block';
    document.getElementById('vocabDetailPanel').style.display = 'none';
    await loadNextVocabCard();
    document.getElementById('vocabStudyPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    alert(`Lỗi: ${err.message}`);
  }
}

async function loadNextVocabCard(nextPayload = null) {
  try {
    const payload = nextPayload || await vocabFetch(`/api/vocab/decks/${vocabState.selectedDeckId}/next`);
    vocabState.currentCard = payload.card;
    vocabState.revealed = false;
    vocabState.shownAt = performance.now();
    vocabState.intervals = payload.intervals || {};
    vocabState.remaining = payload.remaining;
    vocabState.answering = false;
    renderVocabStudyCard();
  } catch (err) {
    document.getElementById('vocabStudyCard').innerHTML = `<p class="vocab-error">${escapeVocabHtml(err.message)}</p>`;
  }
}

function renderVocabStudyCard() {
  const area = document.getElementById('vocabStudyCard');
  const label = document.getElementById('vocabRemaining');
  const remaining = vocabState.remaining;
  if (label) label.textContent = `${remaining.new} mới · ${remaining.learning + remaining.review} ôn`;
  const card = vocabState.currentCard;
  if (!card) {
    area.innerHTML = `
      <div class="vocab-finished"><div>✓</div><h3>Hoàn thành hàng đợi hiện tại!</h3><p>Các thẻ Learning sẽ xuất hiện lại khi đến thời gian của bước kế tiếp.</p><button class="btn-primary" onclick="endVocabSession()">Kết thúc phiên học</button></div>`;
    return;
  }
  const stateName = { new: 'Thẻ mới', learning: 'Đang học', review: 'Ôn tập', relearning: 'Học lại' }[card.state] || card.state;
  const answer = vocabState.revealed ? `
    <div class="vocab-answer"><div>${vocabText(card.back)}</div>${card.example ? `<small>VD: ${vocabText(card.example)}</small>` : ''}</div>
    <div class="vocab-answer-actions">
      ${['again', 'hard', 'good', 'easy'].map((button, index) => `
        <button class="vocab-answer-btn ${button}" onclick="answerVocabCard('${button}')" ${vocabState.answering ? 'disabled' : ''}><b>${button === 'again' ? 'Again' : button[0].toUpperCase() + button.slice(1)}</b><span>${vocabState.intervals[button] || '…'}</span><i>phím ${index + 1}</i></button>`).join('')}
    </div>` : `
    <button class="vocab-reveal-btn" onclick="revealVocabAnswer()">Hiện đáp án <span>(Space)</span></button>`;
  area.innerHTML = `
    <div class="vocab-card-meta"><span>${escapeVocabHtml(card.direction_label)}</span><span>${stateName}</span></div>
    <div class="vocab-front">${vocabText(card.front)}</div>
    ${answer}`;
}

async function revealVocabAnswer() {
  if (!vocabState.currentCard || vocabState.revealed) return;
  vocabState.revealed = true;
  renderVocabStudyCard();
}

function setVocabAnswerPending(button) {
  document.querySelectorAll('.vocab-answer-btn').forEach(element => {
    element.disabled = true;
    element.classList.add('is-submitting');
    if (element.classList.contains(button)) element.classList.add('is-submitting-choice');
  });
}

async function answerVocabCard(button) {
  if (!vocabState.currentCard || !vocabState.revealed || vocabState.answering) return;
  const timeTaken = Math.round(performance.now() - vocabState.shownAt);
  vocabState.answering = true;
  setVocabAnswerPending(button);
  try {
    const result = await vocabFetch(
      `/api/vocab/decks/${vocabState.selectedDeckId}/cards/${vocabState.currentCard.id}/answer`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        answer_button: button, session_id: vocabState.sessionId, time_taken_ms: timeTaken
      }) }
    );
    await loadNextVocabCard(result.next);
  } catch (err) {
    vocabState.answering = false;
    renderVocabStudyCard();
    alert(`Lỗi: ${err.message}`);
  }
}

async function endVocabSession() {
  const sessionId = vocabState.sessionId;
  vocabState.sessionId = null;
  vocabState.currentCard = null;
  document.getElementById('vocabStudyPanel').style.display = 'none';
  if (sessionId) {
    try {
      const data = await vocabFetch(`/api/vocab/sessions/${sessionId}/end`, { method: 'POST' });
      const session = data.session;
      alert(`Phiên học đã lưu: ${session.new_cards_studied} thẻ mới · ${session.reviews_done} lượt ôn.`);
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
    }
  }
  await renderVocabWorkspace();
}

async function showVocabBrowse() {
  if (!vocabState.selectedDeckId) return;
  const panel = document.getElementById('vocabDetailPanel');
  const tbody = document.getElementById('tblVocabCards');
  panel.style.display = 'block';
  document.getElementById('vocabDetailTitle').textContent = `THẺ TRONG DECK${vocabState.selectedDeck ? ` — ${vocabState.selectedDeck.name}` : ''}`;
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Đang tải thẻ...</td></tr>';
  try {
    const search = document.getElementById('vocabSearch').value.trim();
    const data = await vocabFetch(`/api/vocab/decks/${vocabState.selectedDeckId}/cards?search=${encodeURIComponent(search)}`);
    if (!data.cards.length) {
      vocabState.browseCards = [];
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#64748b;">Chưa có thẻ phù hợp.</td></tr>';
      return;
    }
    vocabState.browseCards = data.cards;
    tbody.innerHTML = data.cards.map(card => `
      <tr>
        <td><strong>${escapeVocabHtml(card.word)}</strong>${card.ipa ? `<small class="vocab-ipa">${escapeVocabHtml(card.ipa)}</small>` : ''}<div>${escapeVocabHtml(card.meaning)}</div>${card.tags ? `<small class="vocab-tags">#${escapeVocabHtml(card.tags).replace(/\s/g, ' #')}</small>` : ''}</td>
        <td>${escapeVocabHtml(card.direction_label)}</td>
        <td><span class="vocab-state ${card.queue === 'buried' ? 'buried' : card.state}">${card.queue === 'buried' ? 'Buried' : escapeVocabHtml(card.state)}</span>${card.is_leech ? ' <span title="Leech">🔴</span>' : ''}</td>
        <td>${card.ease_factor}%</td><td>${card.interval_days ? `${card.interval_days}d` : '—'}</td><td>${formatVocabDue(card)}</td>
        <td class="vocab-row-actions">
          <button class="btn-sm" onclick="openEditVocabNote(${card.note_id})">Sửa</button>
          ${card.state === 'suspended' ? `<button class="btn-sm" onclick="unsuspendVocabCard(${card.id})">Bỏ ẩn</button>` : `<button class="btn-sm" onclick="suspendVocabCard(${card.id})">Tạm ẩn</button>`}
          <button class="btn-sm" onclick="resetVocabCard(${card.id})">Reset</button>
          <button class="btn-sm vocab-danger" onclick="deleteVocabNote(${card.note_id})">Xóa từ</button>
        </td>
      </tr>`).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="vocab-error">${escapeVocabHtml(err.message)}</td></tr>`;
  }
}

function debouncedVocabBrowse() {
  clearTimeout(vocabState.browseTimer);
  vocabState.browseTimer = setTimeout(showVocabBrowse, 250);
}

function formatVocabDue(card) {
  if (card.state === 'suspended') return 'Tạm ẩn';
  if (card.queue === 'buried') return 'Ẩn đến ngày mới';
  if (card.state === 'new') return 'Mới';
  if (!card.due_at) return '—';
  const due = new Date(card.due_at);
  if (Number.isNaN(due.getTime())) return '—';
  const minutes = Math.round((due - new Date()) / 60000);
  if (minutes <= 0) return 'Đến hạn';
  if (minutes < 60) return `${minutes} phút`;
  if (minutes < 1440) return `${Math.ceil(minutes / 60)} giờ`;
  return `${Math.ceil(minutes / 1440)} ngày`;
}

async function suspendVocabCard(cardId) {
  try {
    await vocabFetch(`/api/vocab/decks/${vocabState.selectedDeckId}/cards/${cardId}/suspend`, { method: 'POST' });
    await showVocabBrowse();
  } catch (err) { alert(`Lỗi: ${err.message}`); }
}

async function unsuspendVocabCard(cardId) {
  try {
    await vocabFetch(`/api/vocab/decks/${vocabState.selectedDeckId}/cards/${cardId}/unsuspend`, { method: 'POST' });
    await showVocabBrowse();
  } catch (err) { alert(`Lỗi: ${err.message}`); }
}

async function resetVocabCard(cardId) {
  if (!confirm('Đặt lại lịch ôn của thẻ này về Mới?')) return;
  try {
    await vocabFetch(`/api/vocab/decks/${vocabState.selectedDeckId}/cards/${cardId}/reset`, { method: 'POST' });
    await showVocabBrowse();
  } catch (err) { alert(`Lỗi: ${err.message}`); }
}

async function deleteVocabNote(noteId) {
  if (!confirm('Xóa từ này cùng toàn bộ thẻ và lịch sử ôn liên quan?')) return;
  try {
    await vocabFetch(`/api/vocab/decks/${vocabState.selectedDeckId}/notes/${noteId}`, { method: 'DELETE' });
    await fetchVocabDecks();
    renderVocabDeckList();
    await showVocabBrowse();
  } catch (err) { alert(`Lỗi: ${err.message}`); }
}

function openEditVocabNote(noteId) {
  const card = (vocabState.browseCards || []).find(item => item.note_id === noteId);
  if (!card) {
    alert('Không tìm thấy từ cần sửa. Hãy tải lại danh sách thẻ.');
    return;
  }
  document.getElementById('editVocabNoteId').value = String(noteId);
  document.getElementById('editVocabWord').value = card.word || '';
  document.getElementById('editVocabIpa').value = card.ipa || '';
  document.getElementById('editVocabMeaning').value = card.meaning || '';
  document.getElementById('editVocabExample').value = card.example || '';
  document.getElementById('editVocabTags').value = card.tags || '';
  openModal('modalEditVocabNote');
}

async function saveEditedVocabNote() {
  const noteId = Number(document.getElementById('editVocabNoteId').value);
  const payload = {
    word: document.getElementById('editVocabWord').value.trim(),
    ipa: document.getElementById('editVocabIpa').value.trim(),
    meaning: document.getElementById('editVocabMeaning').value.trim(),
    example: document.getElementById('editVocabExample').value.trim(),
    tags: document.getElementById('editVocabTags').value.trim(),
  };
  try {
    await vocabFetch(`/api/vocab/decks/${vocabState.selectedDeckId}/notes/${noteId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    closeModal('modalEditVocabNote');
    await showVocabBrowse();
  } catch (err) { alert(`Không thể sửa từ: ${err.message}`); }
}

async function openEditVocabDeck() {
  if (!vocabState.selectedDeckId) return;
  try {
    const data = await vocabFetch(`/api/vocab/decks/${vocabState.selectedDeckId}`);
    vocabState.selectedDeck = data.deck;
    document.getElementById('editVocabDeckName').value = data.deck.name || '';
    document.getElementById('editVocabDeckDescription').value = data.deck.description || '';
    openModal('modalEditVocabDeck');
  } catch (err) { alert(`Không thể mở deck: ${err.message}`); }
}

async function saveEditedVocabDeck() {
  if (!vocabState.selectedDeckId) return;
  const payload = {
    name: document.getElementById('editVocabDeckName').value.trim(),
    description: document.getElementById('editVocabDeckDescription').value.trim(),
  };
  try {
    const data = await vocabFetch(`/api/vocab/decks/${vocabState.selectedDeckId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    vocabState.selectedDeck = data.deck;
    closeModal('modalEditVocabDeck');
    await fetchVocabDecks();
    renderVocabDeckList();
    await showVocabBrowse();
  } catch (err) { alert(`Không thể sửa deck: ${err.message}`); }
}

async function deleteVocabDeck() {
  const deck = vocabState.selectedDeck;
  if (!deck || !vocabState.selectedDeckId) return;
  const confirmed = confirm(`Xóa vĩnh viễn deck “${deck.name}”?\n\nToàn bộ từ, thẻ, lịch sử ôn và phiên game của deck này sẽ bị xóa và không thể khôi phục.`);
  if (!confirmed) return;
  try {
    const result = await vocabFetch(`/api/vocab/decks/${vocabState.selectedDeckId}`, { method: 'DELETE' });
    vocabState = { selectedDeckId: null, selectedDeck: null, sessionId: null, currentCard: null, revealed: false, shownAt: null, intervals: {}, remaining: { new: 0, learning: 0, review: 0 }, browseTimer: null, answering: false, browseCards: [] };
    if (typeof stopGameTimer === 'function') stopGameTimer();
    document.getElementById('vocabDetailPanel').style.display = 'none';
    document.getElementById('vocabStudyPanel').style.display = 'none';
    document.getElementById('vocabGamePanel').style.display = 'none';
    document.getElementById('vocabSearch').value = '';
    await fetchVocabDecks();
    renderVocabDeckList();
    alert(`Đã xóa deck (${result.deleted_notes} từ, ${result.deleted_cards} thẻ).`);
  } catch (err) { alert(`Không thể xóa deck: ${err.message}`); }
}

async function openVocabConfig() {
  if (!vocabState.selectedDeckId) {
    alert('Hãy chọn một deck trước.');
    return;
  }
  try {
    const data = await vocabFetch(`/api/vocab/decks/${vocabState.selectedDeckId}`);
    vocabState.selectedDeck = data.deck;
    const cfg = data.deck.config;
    document.getElementById('vocabConfigDeckLabel').textContent = `Deck: ${data.deck.name}`;
    document.getElementById('vocabCfgNew').value = cfg.new_cards_per_day;
    document.getElementById('vocabCfgReviews').value = cfg.reviews_per_day;
    document.getElementById('vocabCfgLearning').value = cfg.learning_steps;
    document.getElementById('vocabCfgRelearning').value = cfg.relearning_steps;
    document.getElementById('vocabCfgGraduate').value = cfg.graduating_interval_days;
    document.getElementById('vocabCfgEasy').value = cfg.easy_interval_days;
    document.getElementById('vocabCfgLeech').value = cfg.leech_threshold;
    document.getElementById('vocabCfgLeechAction').value = cfg.leech_action;
    document.getElementById('vocabCfgBury').checked = cfg.bury_siblings;
    openModal('modalVocabConfig');
  } catch (err) { alert(`Lỗi: ${err.message}`); }
}

async function saveVocabConfig() {
  const payload = {
    new_cards_per_day: document.getElementById('vocabCfgNew').value,
    reviews_per_day: document.getElementById('vocabCfgReviews').value,
    learning_steps: document.getElementById('vocabCfgLearning').value,
    relearning_steps: document.getElementById('vocabCfgRelearning').value,
    graduating_interval_days: document.getElementById('vocabCfgGraduate').value,
    easy_interval_days: document.getElementById('vocabCfgEasy').value,
    leech_threshold: document.getElementById('vocabCfgLeech').value,
    leech_action: document.getElementById('vocabCfgLeechAction').value,
    bury_siblings: document.getElementById('vocabCfgBury').checked
  };
  try {
    await vocabFetch(`/api/vocab/decks/${vocabState.selectedDeckId}/config`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    closeModal('modalVocabConfig');
    await renderVocabWorkspace();
  } catch (err) { alert(`Lỗi: ${err.message}`); }
}

async function showVocabStats() {
  if (!vocabState.selectedDeckId) return;
  const area = document.getElementById('vocabStats');
  area.style.display = 'block';
  area.innerHTML = 'Đang tổng hợp thống kê...';
  try {
    const data = await vocabFetch(`/api/vocab/decks/${vocabState.selectedDeckId}/stats`);
    const totalAnswers = Object.values(data.answers).reduce((a, b) => a + b, 0) || 1;
    const heatmap = Object.entries(data.heatmap).sort(([a], [b]) => a.localeCompare(b)).slice(-42);
    area.innerHTML = `
      <div class="vocab-stat-grid">${Object.entries(data.counts).map(([state, count]) => `<div><b>${count}</b><span>${state}</span></div>`).join('')}</div>
      <div class="vocab-answer-rate">Again ${Math.round(data.answers.again / totalAnswers * 100)}% · Hard ${Math.round(data.answers.hard / totalAnswers * 100)}% · Good ${Math.round(data.answers.good / totalAnswers * 100)}% · Easy ${Math.round(data.answers.easy / totalAnswers * 100)}%</div>
      <div class="vocab-heatmap" title="Số lượt học 42 ngày gần đây">${heatmap.map(([, count]) => `<i style="opacity:${Math.min(1, 0.2 + count / 8)}"></i>`).join('') || '<span>Chưa có lượt ôn nào.</span>'}</div>`;
  } catch (err) { area.innerHTML = `<span class="vocab-error">${escapeVocabHtml(err.message)}</span>`; }
}

// Global keybindings for Flashcards study session
document.addEventListener('keydown', event => {
  if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
  const panel = document.getElementById('vocabStudyPanel');
  if (!panel || panel.style.display === 'none' || !vocabState.currentCard) return;
  if ((event.code === 'Space' || event.code === 'Enter') && !vocabState.revealed) {
    event.preventDefault();
    revealVocabAnswer();
  }
  const buttons = { '1': 'again', '2': 'hard', '3': 'good', '4': 'easy' };
  if (vocabState.revealed && buttons[event.key]) {
    event.preventDefault();
    answerVocabCard(buttons[event.key]);
  }
});
