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

function renderDashboardWithPayload(payload) {
  const metrics = payload.metrics;
  const elDeadlines = document.getElementById('valMetricDeadlines');
  const elStreak = document.getElementById('valMetricStreak');
  const elWeekly = document.getElementById('valMetricWeeklyHours');

  if (elDeadlines) elDeadlines.textContent = metrics.upcoming_deadlines_count;
  if (elStreak) elStreak.textContent = `${metrics.streak_days} ngày`;
  if (elWeekly) elWeekly.textContent = `${metrics.weekly_hours} giờ`;

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
