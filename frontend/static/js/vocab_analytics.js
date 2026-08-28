/* ===========================================================================
   VOCABULARY ANALYTICS — UC SPACED REPETITION
   Native SVG/CSS charts, backed by /api/vocab/analytics.
   =========================================================================== */

const VOCAB_ANALYTICS_COLORS = {
  cyan: '#22d3ee',
  blue: '#60a5fa',
  emerald: '#4ade80',
  amber: '#fb923c',
  rose: '#f43f5e',
  purple: '#a855f7',
  muted: '#64748b',
};

const VOCAB_STATE_LABELS = {
  new: 'Mới', learning: 'Đang học', review: 'Đã vào lịch ôn',
  relearning: 'Học lại', suspended: 'Tạm ẩn', buried: 'Ẩn tạm',
};

function analyticsNumber(value) {
  return new Intl.NumberFormat('vi-VN').format(Number(value || 0));
}

function analyticsDate(value, withYear = false) {
  const [year, month, day] = String(value || '').split('T')[0].split('-');
  if (!day) return '—';
  return withYear ? `${day}/${month}/${year}` : `${day}/${month}`;
}

function analyticsPercent(value) {
  return value === null || value === undefined ? '—' : `${Math.round(value)}%`;
}

function buildAnalyticsDeckOptions() {
  const select = document.getElementById('vocabAnalyticsDeck');
  if (!select) return;
  const selected = select.value;
  select.innerHTML = [
    '<option value="">Tất cả deck</option>',
    ...globalData.vocabDecks.map(deck =>
      `<option value="${deck.id}">${escapeVocabHtml(deck.name)}</option>`
    ),
  ].join('');
  if ([...select.options].some(option => option.value === selected)) select.value = selected;
}

function analyticsKpi(icon, label, value, detail, tone = 'cyan') {
  return `
    <article class="analytics-kpi analytics-kpi-${tone}">
      <div class="analytics-kpi-icon"><span class="material-symbols-outlined">${icon}</span></div>
      <div>
        <span class="analytics-kpi-label">${label}</span>
        <strong class="analytics-kpi-value">${value}</strong>
        <small>${detail}</small>
      </div>
    </article>`;
}

function analyticsDonut(segments, total, centerLabel) {
  const valid = segments.filter(segment => segment.value > 0);
  let gradient = 'rgba(255,255,255,0.08) 0deg 360deg';
  if (valid.length) {
    let current = 0;
    gradient = valid.map(segment => {
      const next = current + segment.value / total * 360;
      const piece = `${segment.color} ${current.toFixed(2)}deg ${next.toFixed(2)}deg`;
      current = next;
      return piece;
    }).join(', ');
  }
  return `
    <div class="analytics-donut-wrap">
      <div class="analytics-donut" style="background:conic-gradient(${gradient})">
        <div class="analytics-donut-center"><strong>${analyticsNumber(total)}</strong><span>${centerLabel}</span></div>
      </div>
      <div class="analytics-donut-legend">
        ${segments.map(segment => `
          <div><i style="background:${segment.color}"></i><span>${segment.label}</span><b>${analyticsNumber(segment.value)}</b></div>
        `).join('')}
      </div>
    </div>`;
}

function analyticsLineChart(data, key, color, unit) {
  if (!data.length || !data.some(item => Number(item[key]) > 0)) {
    return '<div class="analytics-chart-empty">Chưa có lượt ôn trong giai đoạn này.</div>';
  }
  const width = 640;
  const height = 224;
  const left = 38;
  const right = 14;
  const top = 18;
  const bottom = 34;
  const maximum = Math.max(1, ...data.map(item => Number(item[key]) || 0));
  const stepX = (width - left - right) / Math.max(1, data.length - 1);
  const pointFor = (item, index) => {
    const value = Number(item[key]) || 0;
    return {
      x: left + index * stepX,
      y: top + (maximum - value) / maximum * (height - top - bottom),
      value,
      label: analyticsDate(item.date),
    };
  };
  const points = data.map(pointFor);
  const polyline = points.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
  const area = `${left},${height - bottom} ${polyline} ${points[points.length - 1].x.toFixed(1)},${height - bottom}`;
  const labels = [0, Math.floor((data.length - 1) / 2), data.length - 1]
    .filter((item, index, all) => all.indexOf(item) === index)
    .map(index => `<text x="${points[index].x}" y="${height - 12}" text-anchor="middle">${points[index].label}</text>`)
    .join('');
  const grid = [0, 0.5, 1].map(ratio => {
    const y = top + ratio * (height - top - bottom);
    const value = Math.round(maximum * (1 - ratio));
    return `<line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" /><text x="${left - 8}" y="${y + 4}" text-anchor="end">${value}</text>`;
  }).join('');
  return `
    <div class="analytics-svg-wrap">
      <svg class="analytics-line-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Biểu đồ đường ${unit}">
        <defs>
          <linearGradient id="analyticsLineGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="${color}" stop-opacity="0.34" />
            <stop offset="100%" stop-color="${color}" stop-opacity="0" />
          </linearGradient>
        </defs>
        <g class="analytics-chart-grid">${grid}</g>
        <polygon points="${area}" fill="url(#analyticsLineGradient)" />
        <polyline points="${polyline}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />
        ${points.map(point => `<circle cx="${point.x}" cy="${point.y}" r="3.5" fill="${color}"><title>${point.label}: ${point.value} ${unit}</title></circle>`).join('')}
        <g class="analytics-chart-axis">${labels}</g>
      </svg>
    </div>`;
}

function analyticsBarChart(data) {
  if (!data.length || !data.some(item => Number(item.due) > 0)) {
    return '<div class="analytics-chart-empty">Chưa có thẻ đến hạn trong 14 ngày tới.</div>';
  }
  const maximum = Math.max(1, ...data.map(item => Number(item.due) || 0));
  return `
    <div class="analytics-bar-chart">
      ${data.map((item, index) => {
        const height = Math.max(4, (Number(item.due) || 0) / maximum * 100);
        const label = index === 0 ? 'Hôm nay' : analyticsDate(item.date);
        return `
          <div class="analytics-bar-item" title="${analyticsDate(item.date, true)}: ${item.due} thẻ đến hạn">
            <span>${item.due || ''}</span>
            <i style="height:${height}%"></i>
            <small>${label}</small>
          </div>`;
      }).join('')}
    </div>`;
}

function analyticsIntervals(buckets) {
  const maximum = Math.max(1, ...buckets.map(bucket => bucket.count));
  return `
    <div class="analytics-intervals">
      ${buckets.map(bucket => `
        <div class="analytics-interval-row">
          <span>${bucket.label}</span>
          <div><i style="width:${bucket.count / maximum * 100}%; background:${bucket.color}"></i></div>
          <b>${analyticsNumber(bucket.count)}</b>
        </div>`).join('')}
    </div>`;
}

function analyticsWeakWords(words) {
  if (!words.length) {
    return '<div class="analytics-good-state"><span class="material-symbols-outlined">verified</span> Chưa có từ nào bị gắn tín hiệu rủi ro. Tiếp tục duy trì nhịp ôn hiện tại.</div>';
  }
  return `
    <div class="analytics-weak-list">
      ${words.map((word, index) => `
        <article class="analytics-weak-item">
          <span class="analytics-rank">${String(index + 1).padStart(2, '0')}</span>
          <div><strong>${escapeVocabHtml(word.word)}</strong><p>${escapeVocabHtml(word.meaning)}</p></div>
          <div class="analytics-risk-metrics">
            <span>${word.lapses} lapse${word.lapses === 1 ? '' : 's'}</span>
            <span>Ease ${(word.ease_factor / 100).toFixed(2)}</span>
            ${word.is_leech ? '<b>LEECH</b>' : ''}
          </div>
        </article>`).join('')}
    </div>`;
}

function analyticsInsight(summary) {
  if (!summary.total_cards) {
    return {
      icon: 'library_add',
      title: 'Bắt đầu bằng một deck nhỏ',
      text: 'Tạo deck và thêm 10–20 từ đầu tiên để hệ thống bắt đầu xây lịch ôn phù hợp.',
      action: 'Tạo deck',
      actionCode: "switchTab('tab-vocab'); openModal('modalCreateVocabDeck');",
    };
  }
  if (summary.due_now) {
    return {
      icon: 'priority_high',
      title: `${analyticsNumber(summary.due_now)} thẻ đang cần ôn`,
      text: `Xử lý hàng đợi trước khi thêm từ mới để giữ nhịp ôn ổn định.${summary.new_available ? ` Hôm nay còn ${summary.new_available} thẻ mới khả dụng.` : ''}`,
      action: 'Bắt đầu ôn',
      actionCode: "switchTab('tab-vocab');",
    };
  }
  if (summary.retention_rate !== null && summary.retention_rate < 70) {
    return {
      icon: 'psychology_alt',
      title: 'Tỉ lệ nhớ cần được củng cố',
      text: 'Hãy ưu tiên các từ có nhiều lapse, thêm ví dụ cụ thể và dùng nút Again khi chưa thật sự nhớ.',
      action: 'Xem từ yếu',
      actionCode: "document.getElementById('analyticsWeakWords')?.scrollIntoView({behavior:'smooth'});",
    };
  }
  return {
    icon: 'auto_awesome',
    title: 'Lịch ôn đang ở trạng thái tốt',
    text: 'Bạn không có thẻ quá hạn ngay lúc này. Duy trì thói quen ngắn mỗi ngày để tăng số thẻ trưởng thành.',
    action: 'Học từ vựng',
    actionCode: "switchTab('tab-vocab');",
  };
}

function renderAnalyticsPage(data) {
  const summary = data.summary;
  const stateSegments = Object.entries(data.state_counts).map(([key, value], index) => ({
    label: VOCAB_STATE_LABELS[key] || key,
    value,
    color: [VOCAB_ANALYTICS_COLORS.cyan, VOCAB_ANALYTICS_COLORS.amber, VOCAB_ANALYTICS_COLORS.emerald, VOCAB_ANALYTICS_COLORS.purple, VOCAB_ANALYTICS_COLORS.muted, '#475569'][index],
  }));
  const answerSegments = [
    { label: 'Again', value: data.answer_distribution.again, color: VOCAB_ANALYTICS_COLORS.rose },
    { label: 'Hard', value: data.answer_distribution.hard, color: VOCAB_ANALYTICS_COLORS.amber },
    { label: 'Good', value: data.answer_distribution.good, color: VOCAB_ANALYTICS_COLORS.emerald },
    { label: 'Easy', value: data.answer_distribution.easy, color: VOCAB_ANALYTICS_COLORS.cyan },
  ];
  const insight = analyticsInsight(summary);
  const content = document.getElementById('vocabAnalyticsContent');
  content.innerHTML = `
    <div class="analytics-scope-line">
      <span class="material-symbols-outlined">database</span>
      <span>${escapeVocabHtml(data.scope.deck_name)} · ${analyticsNumber(summary.total_notes)} từ gốc · ${analyticsNumber(summary.total_cards)} flashcard</span>
      <span class="analytics-updated">14 ngày gần nhất</span>
    </div>

    <section class="analytics-kpi-grid">
      ${analyticsKpi('pending_actions', 'Cần ôn ngay', analyticsNumber(summary.due_now), `${analyticsNumber(summary.new_available)} thẻ mới đang khả dụng`, summary.due_now ? 'rose' : 'cyan')}
      ${analyticsKpi('memory', 'Tỉ lệ nhớ 30 ngày', analyticsPercent(summary.retention_rate), 'Good + Easy trên tất cả lượt trả lời', 'emerald')}
      ${analyticsKpi('local_fire_department', 'Chuỗi học hiện tại', `${analyticsNumber(summary.current_streak)} ngày`, `Kỷ lục: ${analyticsNumber(summary.longest_streak)} ngày liên tiếp`, 'amber')}
      ${analyticsKpi('workspace_premium', 'Mức độ thành thạo', analyticsPercent(summary.mastery_rate), `${analyticsNumber(summary.mature_cards)} thẻ có khoảng ôn từ 21 ngày`, 'purple')}
    </section>

    <section class="analytics-insight-card">
      <div class="analytics-insight-icon"><span class="material-symbols-outlined">${insight.icon}</span></div>
      <div><strong>${insight.title}</strong><p>${insight.text}</p></div>
      <button class="btn-primary" onclick="${insight.actionCode}">${insight.action}</button>
    </section>

    <section class="analytics-chart-grid">
      <article class="card-box analytics-chart-card analytics-chart-wide">
        <div class="analytics-card-heading"><div><span>NHỊP ĐỘ HỌC TẬP</span><small>Lượt trả lời mỗi ngày trong 14 ngày gần nhất</small></div><b>${analyticsNumber(summary.reviews_14d)} lượt</b></div>
        ${analyticsLineChart(data.activity, 'reviews', VOCAB_ANALYTICS_COLORS.cyan, 'lượt ôn')}
      </article>

      <article class="card-box analytics-chart-card">
        <div class="analytics-card-heading"><div><span>TRẠNG THÁI THẺ</span><small>Phân bổ hàng đợi hiện tại</small></div></div>
        ${analyticsDonut(stateSegments, summary.total_cards, 'thẻ')}
      </article>

      <article class="card-box analytics-chart-card">
        <div class="analytics-card-heading"><div><span>CHẤT LƯỢNG GHI NHỚ</span><small>Lựa chọn trả lời trong 30 ngày</small></div></div>
        ${analyticsDonut(answerSegments, answerSegments.reduce((total, segment) => total + segment.value, 0), 'lượt')}
      </article>

      <article class="card-box analytics-chart-card analytics-chart-wide">
        <div class="analytics-card-heading"><div><span>DỰ BÁO KHỐI LƯỢNG ÔN</span><small>Số flashcard được lên lịch trong 14 ngày tới</small></div><b>${analyticsNumber(data.forecast.reduce((total, item) => total + item.due, 0))} thẻ</b></div>
        ${analyticsBarChart(data.forecast)}
      </article>

      <article class="card-box analytics-chart-card analytics-interval-card">
        <div class="analytics-card-heading"><div><span>ĐỘ DÀI KHOẢNG ÔN</span><small>Khoảng cách lặp lại cho từng thẻ</small></div>${summary.average_ease ? `<b>Ease ${summary.average_ease}</b>` : ''}</div>
        ${analyticsIntervals(data.interval_buckets)}
      </article>

      <article class="card-box analytics-chart-card analytics-performance-card">
        <div class="analytics-card-heading"><div><span>HIỆU SUẤT HỌC</span><small>Chỉ số hỗ trợ điều chỉnh thói quen</small></div></div>
        <div class="analytics-performance-grid">
          <div><b>${analyticsNumber(summary.reviews_today)}</b><span>Lượt ôn hôm nay</span></div>
          <div><b>${summary.average_response_seconds ? `${summary.average_response_seconds}s` : '—'}</b><span>Thời gian trả lời TB</span></div>
          <div><b>${analyticsNumber(summary.reviews_total)}</b><span>Tổng lượt ôn</span></div>
          <div><b>${analyticsNumber(summary.total_notes)}</b><span>Từ gốc đang học</span></div>
        </div>
      </article>
    </section>

    <section id="analyticsWeakWords" class="card-box analytics-weak-card">
      <div class="analytics-card-heading"><div><span>TỪ CẦN CỦNG CỐ</span><small>Xếp theo lapse, ease factor thấp và cờ leech</small></div><span class="material-symbols-outlined">priority_high</span></div>
      ${analyticsWeakWords(data.weak_words)}
    </section>`;
}

async function renderVocabAnalytics() {
  const content = document.getElementById('vocabAnalyticsContent');
  if (!content) return;
  content.innerHTML = '<div class="analytics-loading"><span class="material-symbols-outlined">sync</span> Đang tổng hợp dữ liệu ôn tập...</div>';
  try {
    await fetchVocabDecks();
    buildAnalyticsDeckOptions();
    const deckId = document.getElementById('vocabAnalyticsDeck')?.value;
    const query = deckId ? `?deck_id=${encodeURIComponent(deckId)}` : '';
    const data = await vocabFetch(`/api/vocab/analytics${query}`);
    renderAnalyticsPage(data);
  } catch (error) {
    content.innerHTML = `
      <div class="analytics-error">
        <span class="material-symbols-outlined">error</span>
        <div><strong>Không thể tải phân tích</strong><p>${escapeVocabHtml(error.message)}</p></div>
      </div>`;
  }
}
