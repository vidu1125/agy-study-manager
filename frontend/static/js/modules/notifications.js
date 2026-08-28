/* ==========================================================================
   MODULE: THÔNG BÁO & BÁO CÁO TUẦN (UC07, UC13 - UC16)
   Handles ntfy push notification testing, weekly reports, and audit logs.
   ========================================================================== */

async function testMobilePushNotification() {
  try {
    const res = await fetch('/api/test_notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tieu_de: 'Kiểm tra Push Notification',
        noi_dung: 'Chào bạn! Hệ thống Quản lý Học tập EduPulse đã kết nối thành công với app ntfy trên điện thoại của bạn.'
      })
    });
    const json = await res.json();
    if (res.ok) {
      alert(`Đã gửi thông báo thử nghiệm thành công!\n\nKiểm tra app ntfy trên điện thoại (Topic: ${json.topic})`);
    } else {
      alert(`Lỗi gửi: ${json.message}`);
    }
  } catch (err) {
    alert(`Lỗi kết nối server: ${err.message}`);
  }
}

async function triggerUCNotification(ucName) {
  try {
    const res = await fetch(`/api/trigger_uc_notification/${ucName}`, {
      method: 'POST'
    });
    const json = await res.json();
    if (res.ok) {
      alert(`${json.message}\n\nKiểm tra app ntfy trên điện thoại (Topic: ${json.topic})`);
    } else {
      alert(`Lỗi: ${json.error || json.message}`);
    }
  } catch (err) {
    alert(`Lỗi kết nối: ${err.message}`);
  }
}

async function forceRemindNow() {
  try {
    const res = await fetch('/api/force_remind', {
      method: 'POST'
    });
    const json = await res.json();
    if (res.ok) {
      if (json.message.includes('0 thông báo')) {
        alert(`Không có deadline nào còn 0-2 ngày để nhắc lúc này.\n\nHãy chắc chắn bạn đã tạo deadline với hạn nộp trong 2 ngày tới!`);
      } else {
        alert(`${json.message}\n\nKiểm tra app ntfy trên điện thoại (Topic: ${json.topic})`);
      }
    } else {
      alert(`Lỗi: ${json.message}`);
    }
  } catch (err) {
    alert(`Lỗi kết nối server: ${err.message}`);
  }
}

async function renderReportAndExtensions() {
  // Weekly report
  const reportRes = await fetch('/api/bao_cao_tuan');
  const r = await reportRes.json();

  const reportContainer = document.getElementById('weeklyReportContainer');
  if (reportContainer) {
    reportContainer.innerHTML = `
      <div style="background:rgba(255,255,255,0.02); backdrop-filter:blur(16px); border:1px solid var(--border-color); padding:20px; border-radius:14px; display:grid; grid-template-columns:repeat(3, 1fr); gap:16px;">
        <div>
          <div style="font-size:10px; font-family:var(--font-mono); color:var(--text-muted); text-transform:uppercase; letter-spacing:0.1em;">TUẦN BÁO CÁO</div>
          <div style="font-weight:700; font-size:15px; font-family:var(--font-mono); color:#ffffff; margin-top:4px;">${r.week_range}</div>
        </div>
        <div>
          <div style="font-size:10px; font-family:var(--font-mono); color:var(--text-muted); text-transform:uppercase; letter-spacing:0.1em;">DEADLINE HOÀN THÀNH</div>
          <div style="font-weight:700; font-size:22px; font-family:var(--font-mono); color:var(--accent-emerald); margin-top:4px;">${r.completed_count} tasks</div>
        </div>
        <div>
          <div style="font-size:10px; font-family:var(--font-mono); color:var(--text-muted); text-transform:uppercase; letter-spacing:0.1em;">TỔNG GIỜ HỌC TUẦN</div>
          <div style="font-weight:700; font-size:22px; font-family:var(--font-mono); color:var(--primary-cyan); margin-top:4px;">${r.total_study_hours} giờ</div>
        </div>
      </div>
      ${r.most_overdue_subject ? `<div class="warning-banner" style="margin-top:14px;">[!] Môn bị trễ hạn nhiều task nhất tuần qua: <strong>${r.most_overdue_subject}</strong> (${r.most_overdue_count} bài tập trễ).</div>` : ''}
    `;
  }

  // Extension Logs
  const extRes = await fetch('/api/lich_su_gia_han');
  const extLogs = await extRes.json();
  const tbodyExt = document.getElementById('tblLichSuGiaHan');

  if (tbodyExt) {
    if (extLogs.length === 0) {
      tbodyExt.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">Chưa có lịch sử gia hạn nào (UC07).</td></tr>';
      return;
    }

    tbodyExt.innerHTML = extLogs.map(e => `
      <tr>
        <td><code>${e.ma_gia_han}</code></td>
        <td><strong>${e.ten_bai_tap}</strong></td>
        <td>${formatDate(e.han_cu)}</td>
        <td><strong style="color:var(--accent-amber);">${formatDate(e.han_moi)}</strong></td>
        <td>${formatDate(e.ngay_gia_han)}</td>
        <td>${e.ly_do || 'Cần thêm thời gian'}</td>
      </tr>
    `).join('');
  }
}
