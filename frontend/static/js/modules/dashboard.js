/* ==========================================================================
   MODULE: DASHBOARD (UC17)
   Handles metrics, warning banners, upcoming 7-day deadlines, and active goals.
   ========================================================================== */

async function fetchDashboardData() {
  const res = await fetch('/api/dashboard');
  const data = await res.json();
  if (data.status === 'success') {
    renderDashboardWithPayload(data);
  }
}

async function renderDashboard() {
  await fetchDashboardData();
}

function formatStudyHours(value) {
  const totalMinutes = Math.round(Math.max(0, Number(value) || 0) * 60);
  if (totalMinutes === 0) return '0 phút';
  if (totalMinutes < 60) return totalMinutes + ' phút';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? hours + ' giờ ' + minutes + ' phút' : hours + ' giờ';
}

function getStudyDayLabel(dateValue) {
  const date = new Date(dateValue + 'T12:00:00');
  return new Intl.DateTimeFormat('vi-VN', { weekday: 'short' })
    .format(date)
    .replace('.', '')
    .toUpperCase();
}

function renderDashboardStudySummary(summary) {
  const container = document.getElementById('dashboardStudySummary');
  if (!container || !summary) return;

  const activity = Array.isArray(summary.week_activity) ? summary.week_activity : [];
  const maxHours = Math.max(...activity.map(day => Number(day.hours) || 0), 1);
  const activityHtml = activity.map(day => {
    const hours = Number(day.hours) || 0;
    const height = hours ? Math.max(10, Math.round(hours / maxHours * 100)) : 4;
    const todayClass = day.is_today ? ' today' : '';
    const studiedClass = hours ? ' studied' : '';
    return '<div class="study-activity-day' + todayClass + studiedClass + '" title="' + day.date + ': ' + formatStudyHours(hours) + '">' +
      '<span>' + formatStudyHours(hours) + '</span>' +
      '<div class="study-activity-bar"><i style="height:' + height + '%"></i></div>' +
      '<b>' + getStudyDayLabel(day.date) + '</b>' +
    '</div>';
  }).join('');

  const todayMessage = summary.studied_today
    ? 'Bạn đã duy trì nhịp học hôm nay. Tiếp tục nhé!'
    : 'Hôm nay chưa có giờ học nào được ghi nhận.';

  container.innerHTML =
    '<div class="study-progress-header">' +
      '<div class="study-streak-block">' +
        '<span class="material-symbols-outlined">local_fire_department</span>' +
        '<div><p>CHUỖI HỌC HIỆN TẠI</p><strong>' + (summary.current_streak || 0) + ' ngày</strong><small>Kỷ lục: ' + (summary.longest_streak || 0) + ' ngày</small></div>' +
      '</div>' +
      '<div class="study-progress-action"><span>' + todayMessage + '</span><button class="btn-sm" type="button" onclick="openModal(\'modalLogTime\')">+ Ghi giờ học</button></div>' +
    '</div>' +
    '<div class="study-total-grid">' +
      '<div><span>Hôm nay</span><b>' + formatStudyHours(summary.today_hours) + '</b></div>' +
      '<div><span>Tuần này</span><b>' + formatStudyHours(summary.week_hours) + '</b><small>' + (summary.active_days_week || 0) + ' ngày có học</small></div>' +
      '<div><span>Tháng này</span><b>' + formatStudyHours(summary.month_hours) + '</b></div>' +
      '<div><span>Tổng tích lũy</span><b>' + formatStudyHours(summary.total_hours) + '</b></div>' +
    '</div>' +
    '<div class="study-activity-section"><div><span>NHỊP HỌC 7 NGÀY GẦN NHẤT</span><small>Mỗi cột là số giờ đã ghi nhận</small></div><div class="study-activity-chart">' + activityHtml + '</div></div>';
}

function renderDashboardWithPayload(payload) {
  const metrics = payload.metrics;
  const elDeadlines = document.getElementById('valMetricDeadlines');
  const elStreak = document.getElementById('valMetricStreak');
  const elWeekly = document.getElementById('valMetricWeeklyHours');

  if (elDeadlines) elDeadlines.textContent = metrics.upcoming_deadlines_count;
  if (elStreak) elStreak.textContent = `${metrics.streak_days} ngày`;
  if (elWeekly) elWeekly.textContent = formatStudyHours(metrics.weekly_hours);
  renderDashboardStudySummary(payload.study_summary);

  // Banners area (Warnings, missing logs, overload warnings)
  const warnArea = document.getElementById('dashboardWarnings');
  if (warnArea) {
    let warnHtml = '';

    // Overload alerts (UC15)
    if (payload.overload_alerts && payload.overload_alerts.length > 0) {
      payload.overload_alerts.forEach(alert => {
        warnHtml += `<div class="warning-banner">[!] ${alert.message}</div>`;
      });
    }

    // Missing logs reminders (UC14)
    if (payload.missing_log_reminders && payload.missing_log_reminders.length > 0) {
      payload.missing_log_reminders.forEach(rem => {
        warnHtml += `<div class="warning-banner" style="background:#FFF9E6; border-color:#FFE599; color:#996600;">[*] ${rem.message}</div>`;
      });
    }

    // Subject overdue alerts
    if (payload.subject_overdue_counts && Object.keys(payload.subject_overdue_counts).length > 0) {
      for (const [subject, count] of Object.entries(payload.subject_overdue_counts)) {
        warnHtml += `<div class="warning-banner">[!] Cảnh báo: Môn '${subject}' đang có ${count} deadline trễ hạn!</div>`;
      }
    }

    warnArea.innerHTML = warnHtml;
  }

  // Upcoming Deadlines Table
  const tbody = document.getElementById('tblDashboardDeadlines');
  if (tbody) {
    if (!payload.upcoming_deadlines || payload.upcoming_deadlines.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">Không có deadline nào trong 7 ngày tới.</td></tr>';
    } else {
      tbody.innerHTML = payload.upcoming_deadlines.map(d => `
        <tr>
          <td><strong>${d.ten_mon}</strong></td>
          <td>${d.ten_bai_tap}</td>
          <td>${formatDate(d.han_nop)}</td>
          <td>${d.so_ngay_con_lai >= 0 ? `${d.so_ngay_con_lai} ngày` : `<span style="color:var(--accent-rose)">Quá ${Math.abs(d.so_ngay_con_lai)} ngày</span>`}</td>
          <td>${renderPriorityChip(d.do_uu_tien)}</td>
          <td>${renderStatusChip(d.trang_thai, d.loai_mon)}</td>
          <td>
            <button class="btn-sm" onclick="openUpdateStatusModal('${d.ma_bai_tap}')">Cập nhật</button>
            <button class="btn-sm" onclick="openLogTimeModalForTask('${d.ma_bai_tap}')">+ Giờ học</button>
          </td>
        </tr>
      `).join('');
    }
  }

  // Active Goals Progress Area
  const goalsContainer = document.getElementById('dashboardGoalsArea');
  if (goalsContainer) {
    if (!payload.goals || payload.goals.length === 0) {
      goalsContainer.innerHTML = '<p style="color:var(--text-muted);">Chưa có mục tiêu cá nhân nào được tạo.</p>';
    } else {
      goalsContainer.innerHTML = payload.goals.map(g => `
        <div style="margin-bottom:14px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-weight:500;">
            <span>${g.ten_muc_tieu} <span style="font-size:12px; color:var(--text-muted);">(${g.ten_mon})</span></span>
            <span>${g.tien_do_phan_tram}%</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width: ${g.tien_do_phan_tram}%;"></div>
          </div>
        </div>
      `).join('');
    }
  }
}
