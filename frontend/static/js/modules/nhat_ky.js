/* ==========================================================================
   MODULE: NHẬT KÝ THỜI GIAN (UC11, UC12)
   Handles time logging, focus assessment, and study streak tracking.
   ========================================================================== */

async function fetchTimeLogs() {
  const [logsRes, summaryRes] = await Promise.all([
    fetch('/api/nhat_ky'),
    fetch('/api/nhat_ky/summary'),
  ]);
  if (!logsRes.ok) throw new Error('Không thể tải nhật ký học tập');
  globalData.timeLogs = await logsRes.json();
  globalData.studySummary = summaryRes.ok ? await summaryRes.json() : null;
}

function renderTimeLogStudySummary() {
  const container = document.getElementById('timeLogStudySummary');
  const summary = globalData.studySummary;
  if (!container || !summary) return;
  const streakLabel = summary.current_streak
    ? 'Đang duy trì chuỗi ' + summary.current_streak + ' ngày'
    : 'Bắt đầu ghi nhận phiên học đầu tiên';
  container.innerHTML =
    '<div class="time-log-summary-item"><span class="material-symbols-outlined">today</span><div><small>Hôm nay</small><strong>' + formatStudyHours(summary.today_hours) + '</strong></div></div>' +
    '<div class="time-log-summary-item"><span class="material-symbols-outlined">date_range</span><div><small>Tuần này</small><strong>' + formatStudyHours(summary.week_hours) + '</strong></div></div>' +
    '<div class="time-log-summary-item"><span class="material-symbols-outlined">local_fire_department</span><div><small>Chuỗi học</small><strong>' + (summary.current_streak || 0) + ' ngày</strong></div></div>' +
    '<p class="time-log-summary-note">' + streakLabel + ' · Kỷ lục ' + (summary.longest_streak || 0) + ' ngày</p>';
}

function renderNhatKyTable() {
  const tbody = document.getElementById('tblNhatKy');
  if (!tbody) return;
  renderTimeLogStudySummary();

  if (globalData.timeLogs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">Chưa có lịch sử học tập. Hãy bấm "+ Ghi nhận Giờ học mới".</td></tr>';
    return;
  }

  tbody.innerHTML = globalData.timeLogs.map(l => `
    <tr>
      <td><code>${l.ma_log}</code></td>
      <td>${formatDate(l.ngay)}</td>
      <td><strong>${l.ten_mon}</strong></td>
      <td>${l.ten_bai_tap}</td>
      <td><strong style="font-family:var(--font-mono); color:#ffffff;">${l.gio_thuc_te} giờ</strong></td>
      <td><span class="chip ${l.muc_do_tap_trung === 'Tot' ? 'chip-status-completed' : (l.muc_do_tap_trung === 'Trung_binh' ? 'chip-status-in-progress' : 'chip-priority-high')}">${l.muc_do_tap_trung === 'Tot' ? 'Tốt' : (l.muc_do_tap_trung === 'Trung_binh' ? 'Trung bình' : 'Xao nhãng')}</span></td>
      <td>${l.ghi_chu || '-'}</td>
    </tr>
  `).join('');
}

function openLogTimeModalForTask(ma_bai_tap) {
  openModal('modalLogTime');
  const select = document.getElementById('selectLogDeadline');
  if (select) {
    select.value = ma_bai_tap;
  }
}

async function submitLogTime() {
  const ma_bai_tap = document.getElementById('selectLogDeadline').value;
  const ngay = document.getElementById('inputLogNgay').value;
  const gio_thuc_te = document.getElementById('inputLogGio').value;
  const muc_do_tap_trung = document.getElementById('selectLogTapTrung').value;
  const ghi_chu = document.getElementById('inputLogGhiChu').value.trim();

  const res = await fetch('/api/nhat_ky', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ma_bai_tap, ngay, gio_thuc_te, muc_do_tap_trung, ghi_chu })
  });

  const json = await res.json();
  if (res.ok) {
    alert(`Ghi nhận ${gio_thuc_te} giờ học thành công! Streak của bạn: ${json.streak} ngày`);
    closeModal('modalLogTime');
    await fetchTimeLogs();
    renderNhatKyTable();
    if (document.getElementById('tab-dashboard').style.display !== 'none') {
      renderDashboard();
    }
  } else {
    alert(`Lỗi: ${json.error}`);
  }
}
