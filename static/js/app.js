/* ==========================================================================
   HỆ THỐNG QUẢN LÝ HỌC TẬP & DEADLINE CÁ NHÂN
   FRONTEND APPLICATION LOGIC (SPA)
   ========================================================================== */

let globalData = {
  subjects: [],
  deadlines: [],
  materials: [],
  timeLogs: [],
  goals: [],
  extensionLogs: []
};

let currentMonHocType = 'Truong';
let selectedDeadlineForUpdate = null;

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupQuickAddMenu();
  setDefaultDates();
  loadAllData();
  setupAutoDraftSave();
});

function setDefaultDates() {
  const todayStr = new Date().toISOString().split('T')[0];
  const inputNgayGiao = document.getElementById('inputDeadlineNgayGiao');
  const inputLogNgay = document.getElementById('inputLogNgay');
  if (inputNgayGiao) inputNgayGiao.value = todayStr;
  if (inputLogNgay) inputLogNgay.value = todayStr;
}

// Auto draft saving every 30 seconds (UX Rule 1 in 04_UIUX_wireframe.md)
function setupAutoDraftSave() {
  setInterval(() => {
    const draft = {
      monTen: document.getElementById('inputMonTen')?.value || '',
      deadlineTen: document.getElementById('inputDeadlineTen')?.value || '',
      output: document.getElementById('inputDeadlineOutput')?.value || ''
    };
    localStorage.setItem('agy_study_draft', JSON.stringify(draft));
  }, 30000);
}


// ==========================================
// NAVIGATION & TABS
// ==========================================
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item, .mobile-nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTab = item.dataset.tab;
      switchTab(targetTab);
    });
  });
}

function switchTab(tabId) {
  // Update active state on navigation items
  document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(el => {
    if (el.dataset.tab === tabId) el.classList.add('active');
    else el.classList.remove('active');
  });

  // Hide all contents and show target
  document.querySelectorAll('.tab-content').forEach(content => {
    content.style.display = 'none';
  });
  const activeContent = document.getElementById(tabId);
  if (activeContent) activeContent.style.display = 'block';

  // Update Page Title
  const titles = {
    'tab-dashboard': 'Dashboard Tổng quan',
    'tab-monhoc': 'Quản lý Môn học',
    'tab-deadline': 'Quản lý Deadline & Nhiệm vụ',
    'tab-tailieu': 'Kho Tài liệu Học tập',
    'tab-nhatky': 'Nhật ký Thời gian Thực tế',
    'tab-muctieu': 'Mục tiêu Cá nhân',
    'tab-baocao': 'Báo cáo Tuần & Lịch sử Gia hạn',
    'tab-lichhoc': 'Thời khóa biểu & Lịch Pin Point'
  };
  document.getElementById('page-title').textContent = titles[tabId] || 'Quản lý Học tập';

  // Refresh tab data
  if (tabId === 'tab-dashboard') renderDashboard();
  else if (tabId === 'tab-monhoc') renderMonHocTable();
  else if (tabId === 'tab-deadline') renderAllDeadlinesTable();
  else if (tabId === 'tab-tailieu') renderTaiLieuTable();
  else if (tabId === 'tab-nhatky') renderNhatKyTable();
  else if (tabId === 'tab-muctieu') renderMucTieuTable();
  else if (tabId === 'tab-baocao') renderReportAndExtensions();
  else if (tabId === 'tab-lichhoc') renderCalendarView();
}



// ==========================================
// QUICK ADD DROPDOWN MENU
// ==========================================
function setupQuickAddMenu() {
  const btn = document.getElementById('btnToggleQuickAdd');
  const menu = document.getElementById('quickMenu');
  
  if (btn && menu) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      menu.classList.remove('show');
    });
  }
}


// ==========================================
// DATA FETCHING FROM REST APIs
// ==========================================
async function loadAllData() {
  try {
    await Promise.all([
      fetchSubjects(),
      fetchDeadlines(),
      fetchMaterials(),
      fetchTimeLogs(),
      fetchGoals(),
      fetchDashboardData()
    ]);
  } catch (err) {
    console.error('Lỗi khi tải dữ liệu:', err);
  }
}

async function fetchDashboardData() {
  const res = await fetch('/api/dashboard');
  const data = await res.json();
  if (data.status === 'success') {
    renderDashboardWithPayload(data);
  }
}

async function fetchSubjects() {
  const res = await fetch('/api/mon_hoc');
  globalData.subjects = await res.json();
  populateSubjectDropdowns();
}

async function fetchDeadlines() {
  const res = await fetch('/api/deadline');
  globalData.deadlines = await res.json();
  populateDeadlineDropdowns();
}

async function fetchMaterials() {
  const res = await fetch('/api/tai_lieu');
  globalData.materials = await res.json();
}

async function fetchTimeLogs() {
  const res = await fetch('/api/nhat_ky');
  globalData.timeLogs = await res.json();
}

async function fetchGoals() {
  const res = await fetch('/api/muc_tieu');
  globalData.goals = await res.json();
}


// ==========================================
// DROPDOWN POPULATION WITH GROUPING (UX Rule 3)
// ==========================================
function populateSubjectDropdowns() {
  const selects = ['selectDeadlineMonHoc', 'selectTaiLieuMonHoc', 'selectMucTieuMonHoc', 'selectLichHocMonHoc'];

  
  const activeSubjects = globalData.subjects.filter(s => s.trang_thai === 'Dang_hoc');
  const schoolSubjects = activeSubjects.filter(s => s.loai_mon === 'Truong');
  const selfStudySubjects = activeSubjects.filter(s => s.loai_mon === 'Tu_hoc');

  selects.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    el.innerHTML = '<option value="">-- Chọn môn học --</option>';
    
    if (schoolSubjects.length > 0) {
      const groupTruong = document.createElement('optgroup');
      groupTruong.label = '── Môn học ở trường ──';
      schoolSubjects.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.ma_mon;
        opt.textContent = `${s.ma_mon} - ${s.ten_mon}`;
        groupTruong.appendChild(opt);
      });
      el.appendChild(groupTruong);
    }

    if (selfStudySubjects.length > 0) {
      const groupTuHoc = document.createElement('optgroup');
      groupTuHoc.label = '── Môn tự học ──';
      selfStudySubjects.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.ma_mon;
        opt.textContent = `${s.ma_mon} - ${s.ten_mon}`;
        groupTuHoc.appendChild(opt);
      });
      el.appendChild(groupTuHoc);
    }
  });
}

function populateDeadlineDropdowns() {
  const selectLog = document.getElementById('selectLogDeadline');
  if (!selectLog) return;

  selectLog.innerHTML = '<option value="">-- Chọn deadline / nhiệm vụ --</option>';
  const activeDeadlines = globalData.deadlines.filter(d => d.trang_thai !== 'Hoan_thanh');
  
  activeDeadlines.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.ma_bai_tap;
    opt.textContent = `[${d.ten_mon}] ${d.ten_bai_tap} (Hạn: ${formatDate(d.han_nop)})`;
    selectLog.appendChild(opt);
  });
}


// ==========================================
// RENDER HELPERS & STATUS CHIPS (04_UIUX_wireframe.md)
// ==========================================
function renderStatusChip(status, loaiMon = 'Truong') {
  const statusMap = {
    'Hoan_thanh': { text: 'Hoàn thành', class: 'chip-status-completed' },
    'Dang_lam': { text: 'Đang làm', class: 'chip-status-in-progress' },
    'Chua_lam': { text: 'Chưa làm', class: 'chip-status-pending' },
    'Tre_han': loaiMon === 'Tu_hoc' 
      ? { text: 'Trễ hạn (Tự học)', class: 'chip-status-overdue-self' }
      : { text: 'Trễ hạn (Trường)', class: 'chip-status-overdue-school' }
  };

  const item = statusMap[status] || { text: status, class: 'chip-status-pending' };
  return `<span class="chip ${item.class}"><span class="chip-dot"></span>${item.text}</span>`;
}

function renderPriorityChip(priority) {
  const map = {
    'Cao': { text: 'Cao', class: 'chip-priority-high' },
    'Trung_binh': { text: 'Trung bình', class: 'chip-priority-med' },
    'Thap': { text: 'Thấp', class: 'chip-priority-low' }
  };
  const item = map[priority] || { text: priority, class: 'chip-priority-med' };
  return `<span class="chip ${item.class}">${item.text}</span>`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}


// ==========================================
// 1. RENDER DASHBOARD (UC17)
// ==========================================
async function renderDashboard() {
  await fetchDashboardData();
}

function renderDashboardWithPayload(payload) {
  const metrics = payload.metrics;
  document.getElementById('valMetricDeadlines').textContent = metrics.upcoming_deadlines_count;
  document.getElementById('valMetricStreak').textContent = `${metrics.streak_days} ngày 🔥`;
  document.getElementById('valMetricWeeklyHours').textContent = `${metrics.weekly_hours} giờ ⏱️`;

  // Banners area (Warnings, missing logs, overload warnings)
  const warnArea = document.getElementById('dashboardWarnings');
  let warnHtml = '';

  // Overload alerts (UC15)
  if (payload.overload_alerts && payload.overload_alerts.length > 0) {
    payload.overload_alerts.forEach(alert => {
      warnHtml += `<div class="warning-banner"><i class="fa-solid fa-triangle-exclamation"></i> ${alert.message}</div>`;
    });
  }

  // Missing logs reminders (UC14)
  if (payload.missing_log_reminders && payload.missing_log_reminders.length > 0) {
    payload.missing_log_reminders.forEach(rem => {
      warnHtml += `<div class="warning-banner" style="background:#FFF9E6; border-color:#FFE599; color:#996600;"><i class="fa-solid fa-pen-to-square"></i> ${rem.message}</div>`;
    });
  }

  // Subject overdue alerts
  if (payload.subject_overdue_counts && Object.keys(payload.subject_overdue_counts).length > 0) {
    for (const [subject, count] of Object.entries(payload.subject_overdue_counts)) {
      warnHtml += `<div class="warning-banner"><i class="fa-solid fa-circle-exclamation"></i> Cảnh báo: Môn '${subject}' đang có ${count} deadline trễ hạn!</div>`;
    }
  }

  warnArea.innerHTML = warnHtml;

  // Upcoming Deadlines Table
  const tbody = document.getElementById('tblDashboardDeadlines');
  if (!payload.upcoming_deadlines || payload.upcoming_deadlines.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">Không có deadline nào trong 7 ngày tới. Thật tuyệt vời! 🎉</td></tr>';
  } else {
    tbody.innerHTML = payload.upcoming_deadlines.map(d => `
      <tr>
        <td><strong>${d.ten_mon}</strong></td>
        <td>${d.ten_bai_tap}</td>
        <td>${formatDate(d.han_nop)}</td>
        <td>${d.so_ngay_con_lai >= 0 ? `${d.so_ngay_con_lai} ngày` : `<span style="color:#B3261E">Quá ${Math.abs(d.so_ngay_con_lai)} ngày</span>`}</td>
        <td>${renderPriorityChip(d.do_uu_tien)}</td>
        <td>${renderStatusChip(d.trang_thai, d.loai_mon)}</td>
        <td>
          <button class="btn-sm" onclick="openUpdateStatusModal('${d.ma_bai_tap}')">Cập nhật</button>
          <button class="btn-sm" onclick="openLogTimeModalForTask('${d.ma_bai_tap}')">+ Giờ học</button>
        </td>
      </tr>
    `).join('');
  }

  // Active Goals Progress Area
  const goalsContainer = document.getElementById('dashboardGoalsArea');
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


// ==========================================
// 2. RENDER MÔN HỌC TAB
// ==========================================
function renderMonHocTable() {
  const tbody = document.getElementById('tblMonHoc');
  if (globalData.subjects.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Chưa có môn học nào. Hãy bấm "+ Thêm Môn học mới".</td></tr>';
    return;
  }

  tbody.innerHTML = globalData.subjects.map(s => `
    <tr>
      <td><code>${s.ma_mon}</code></td>
      <td><strong>${s.ten_mon}</strong></td>
      <td><span class="chip ${s.loai_mon === 'Truong' ? 'chip-priority-low' : 'chip-priority-med'}">${s.loai_mon === 'Truong' ? 'Trường' : 'Tự học'}</span></td>
      <td>${s.loai_mon === 'Truong' ? (s.giang_vien || 'N/A') : (s.nguon_hoc || 'N/A')}</td>
      <td>${s.so_tin_chi ? `${s.so_tin_chi} tín` : '-'}</td>
      <td>${renderPriorityChip(s.muc_do_uu_tien)}</td>
      <td>${s.trang_thai === 'Dang_hoc' ? '<span style="color:#2F8558">Đang học</span>' : '<span style="color:#6B7280">Đã xong</span>'}</td>
      <td>
        <button class="btn-sm" onclick="softDeleteMonHoc('${s.ma_mon}')">Kết thúc (Xóa)</button>
      </td>
    </tr>
  `).join('');
}


// ==========================================
// 3. RENDER ALL DEADLINES TAB
// ==========================================
function renderAllDeadlinesTable() {
  const tbody = document.getElementById('tblAllDeadlines');
  if (globalData.deadlines.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;">Chưa có deadline nào. Hãy bấm "+ Thêm Deadline mới".</td></tr>';
    return;
  }

  tbody.innerHTML = globalData.deadlines.map(d => `
    <tr>
      <td><code>${d.ma_bai_tap}</code></td>
      <td><strong>${d.ten_mon}</strong></td>
      <td>${d.ten_bai_tap} ${d.link_tai_lieu ? `<a href="${d.link_tai_lieu}" target="_blank"><i class="fa-solid fa-link"></i></a>` : ''}</td>
      <td>${formatDate(d.han_nop)}</td>
      <td>${d.so_ngay_con_lai >= 0 ? `${d.so_ngay_con_lai} ngày` : `<span style="color:#B3261E">Quá ${Math.abs(d.so_ngay_con_lai)} ngày</span>`}</td>
      <td>${renderPriorityChip(d.do_uu_tien)}</td>
      <td><span style="font-size:12px;">${d.nguoi_dat_han === 'Giang_vien' ? 'Giảng viên' : 'Tự đặt'}</span></td>
      <td>
        <div class="progress-container">
          <div class="progress-track" style="width:80px;">
            <div class="progress-fill" style="width:${d.phan_tram_hoan_thanh}%;"></div>
          </div>
          <span style="font-size:12px;">${d.phan_tram_hoan_thanh}%</span>
        </div>
      </td>
      <td>${renderStatusChip(d.trang_thai, d.loai_mon)}</td>
      <td>
        <button class="btn-sm" onclick="openUpdateStatusModal('${d.ma_bai_tap}')">Cập nhật</button>
        ${d.nguoi_dat_han === 'Tu_dat' ? `<button class="btn-sm" onclick="openExtendDeadlineModal('${d.ma_bai_tap}')">Gia hạn</button>` : ''}
      </td>
    </tr>
  `).join('');
}


// ==========================================
// 4. RENDER TÀI LIỆU TAB
// ==========================================
function renderTaiLieuTable() {
  const tbody = document.getElementById('tblTaiLieu');
  if (globalData.materials.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Chưa có tài liệu học tập nào. Hãy bấm "+ Thêm Tài liệu mới".</td></tr>';
    return;
  }

  tbody.innerHTML = globalData.materials.map(m => `
    <tr>
      <td><code>${m.ma_tai_lieu}</code></td>
      <td><strong>${m.ten_mon}</strong></td>
      <td>${m.ten_tai_lieu}</td>
      <td><span class="chip chip-priority-low">${m.loai_tai_lieu}</span></td>
      <td>${m.link ? `<a href="${m.link}" target="_blank" style="color:var(--primary-navy); text-decoration:underline;">Mở link <i class="fa-solid fa-arrow-up-right-from-square"></i></a>` : 'Không có'}</td>
      <td>${formatDate(m.ngay_them)}</td>
      <td><span style="font-size:12px; color:#2563eb;">Ôn lại (Spaced repetition)</span></td>
      <td>
        <button class="btn-sm" onclick="deleteTaiLieu('${m.ma_tai_lieu}')">Xóa</button>
      </td>
    </tr>
  `).join('');
}


// ==========================================
// 5. RENDER NHẬT KÝ THỜI GIAN TAB
// ==========================================
function renderNhatKyTable() {
  const tbody = document.getElementById('tblNhatKy');
  if (globalData.timeLogs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Chưa có lịch sử học tập. Hãy bấm "+ Ghi nhận Giờ học mới".</td></tr>';
    return;
  }

  tbody.innerHTML = globalData.timeLogs.map(l => `
    <tr>
      <td><code>${l.ma_log}</code></td>
      <td>${formatDate(l.ngay)}</td>
      <td><strong>${l.ten_mon}</strong></td>
      <td>${l.ten_bai_tap}</td>
      <td><strong>${l.gio_thuc_te} giờ</strong></td>
      <td><span class="chip ${l.muc_do_tap_trung === 'Tot' ? 'chip-status-completed' : (l.muc_do_tap_trung === 'Trung_binh' ? 'chip-status-in-progress' : 'chip-priority-high')}">${l.muc_do_tap_trung === 'Tot' ? 'Tốt' : (l.muc_do_tap_trung === 'Trung_binh' ? 'Trung bình' : 'Xao nhãng')}</span></td>
      <td>${l.ghi_chu || '-'}</td>
    </tr>
  `).join('');
}


// ==========================================
// 6. RENDER MỤC TIÊU TAB
// ==========================================
function renderMucTieuTable() {
  const tbody = document.getElementById('tblMucTieu');
  if (globalData.goals.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Chưa có mục tiêu nào. Hãy bấm "+ Thêm Mục tiêu mới".</td></tr>';
    return;
  }

  tbody.innerHTML = globalData.goals.map(g => `
    <tr>
      <td><code>${g.ma_muc_tieu}</code></td>
      <td><strong>${g.ten_muc_tieu}</strong></td>
      <td>${g.ten_mon}</td>
      <td><span class="chip chip-priority-low">${g.loai_muc_tieu === 'Dai_han' ? 'Dài hạn' : 'Ngắn hạn'}</span></td>
      <td>${formatDate(g.thoi_han) || 'Không có'}</td>
      <td>${g.cac_buoc_hanh_dong || '-'}</td>
      <td>
        <div class="progress-container">
          <div class="progress-track" style="width:80px;">
            <div class="progress-fill" style="width:${g.tien_do_phan_tram}%;"></div>
          </div>
          <span>${g.tien_do_phan_tram}%</span>
        </div>
      </td>
      <td>${g.trang_thai === 'Hoan_thanh' ? '<span style="color:#2F8558">Hoàn thành</span>' : '<span style="color:#B58500">Đang thực hiện</span>'}</td>
    </tr>
  `).join('');
}


// ==========================================
// 7. RENDER BÁO CÁO TUẦN & LỊCH SỬ GIA HẠN
// ==========================================
async function renderReportAndExtensions() {
  // Weekly report
  const reportRes = await fetch('/api/bao_cao_tuan');
  const r = await reportRes.json();

  const reportContainer = document.getElementById('weeklyReportContainer');
  reportContainer.innerHTML = `
    <div style="background:#f8fafc; border:1px solid var(--border-color); padding:16px; border-radius:8px; display:grid; grid-template-columns:repeat(3, 1fr); gap:16px;">
      <div>
        <div style="font-size:12px; color:var(--text-muted);">TUẦN BÁO CÁO</div>
        <div style="font-weight:600; font-size:16px;">${r.week_range}</div>
      </div>
      <div>
        <div style="font-size:12px; color:var(--text-muted);">DEADLINE HOÀN THÀNH</div>
        <div style="font-weight:700; font-size:22px; color:#2F8558;">${r.completed_count} tasks</div>
      </div>
      <div>
        <div style="font-size:12px; color:var(--text-muted);">TỔNG GIỜ HỌC TUẦN</div>
        <div style="font-weight:700; font-size:22px; color:var(--primary-navy);">${r.total_study_hours} giờ</div>
      </div>
    </div>
    ${r.most_overdue_subject ? `<div style="margin-top:12px; font-size:14px; color:#B3261E;">⚠️ Môn bị trễ hạn nhiều task nhất tuần qua: <strong>${r.most_overdue_subject}</strong> (${r.most_overdue_count} bài tập trễ).</div>` : ''}
  `;

  // Extension Logs
  const extRes = await fetch('/api/lich_su_gia_han');
  const extLogs = await extRes.json();

  const tbody = document.getElementById('tblLichSuGiaHan');
  if (!extLogs || extLogs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 24px; color: var(--text-muted);">Chưa có lịch sử gia hạn nào. Bạn quản lý thời gian rất chuẩn xác! 👍</td></tr>';
    return;
  }

  tbody.innerHTML = extLogs.map(l => `
    <tr>
      <td><code>${l.ma_gia_han}</code></td>
      <td>
        <div style="font-weight:600; color:var(--text-main);">${l.ten_bai_tap || l.ma_bai_tap}</div>
        ${l.ten_mon ? `<div style="font-size:12px; color:var(--text-muted); font-weight:500;">📚 ${l.ten_mon}</div>` : ''}
      </td>
      <td><span style="color:#64748b; text-decoration:line-through;">${formatDate(l.han_cu)}</span></td>
      <td><strong style="color:#d97706; background:#fffbeb; padding:2px 8px; border-radius:4px; border:1px solid #fde68a;">${formatDate(l.han_moi)}</strong></td>
      <td>${formatDate(l.ngay_gia_han)}</td>
      <td>${l.ly_do || '-'}</td>
    </tr>
  `).join('');
}



// ==========================================
// MODAL CONTROLS & SUBMISSIONS
// ==========================================
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('active');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
}

// Mon hoc Modal Type Toggle
function setMonHocType(type) {
  currentMonHocType = type;
  document.getElementById('btnToggleTruong').classList.toggle('active', type === 'Truong');
  document.getElementById('btnToggleTuHoc').classList.toggle('active', type === 'Tu_hoc');

  document.getElementById('groupFieldTruong').style.display = type === 'Truong' ? 'grid' : 'none';
  document.getElementById('groupFieldTuHoc').style.display = type === 'Tu_hoc' ? 'block' : 'none';
  document.getElementById('groupCheckboxGoal').style.display = type === 'Tu_hoc' ? 'block' : 'none';
}

async function submitAddMonHoc() {
  const ma_mon = document.getElementById('inputMonMa').value.trim();
  const ten_mon = document.getElementById('inputMonTen').value.trim();
  const muc_do_uu_tien = document.getElementById('inputMonUuTien').value;

  const payload = {
    ma_mon,
    ten_mon,
    loai_mon: currentMonHocType,
    muc_do_uu_tien,
    giang_vien: document.getElementById('inputMonGiangVien').value.trim(),
    so_tin_chi: document.getElementById('inputMonTinChi').value,
    nguon_hoc: document.getElementById('inputMonNguonHoc').value.trim(),
    tao_muc_tieu_tuong_ung: document.getElementById('chkCreateGoal').checked
  };

  const res = await fetch('/api/mon_hoc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const json = await res.json();
  if (res.ok) {
    alert('✅ Tạo môn học thành công!');
    closeModal('modalAddMonHoc');
    await fetchSubjects();
    renderMonHocTable();
  } else {
    alert(`❌ Error: ${json.error}`);
  }
}

function softDeleteMonHoc(maMon) {
  if (confirm(`Bạn có chắc muốn đánh dấu môn '${maMon}' là Đã xong (soft-delete)?`)) {
    fetch(`/api/mon_hoc/${maMon}`, { method: 'DELETE' }).then(() => {
      fetchSubjects().then(() => renderMonHocTable());
    });
  }
}

// Deadline Subject change validation toggle (UC04 / UC05)
function onDeadlineSubjectChange() {
  const selectedMaMon = document.getElementById('selectDeadlineMonHoc').value;
  const mon = globalData.subjects.find(s => s.ma_mon === selectedMaMon);

  const groupOutput = document.getElementById('groupDeadlineOutput');
  if (mon && mon.loai_mon === 'Tu_hoc') {
    groupOutput.style.display = 'block';
  } else {
    groupOutput.style.display = 'none';
  }
}

async function submitAddDeadline() {
  const ma_mon = document.getElementById('selectDeadlineMonHoc').value;
  const ten_bai_tap = document.getElementById('inputDeadlineTen').value.trim();
  const han_nop = document.getElementById('inputDeadlineHanNop').value;
  const ngay_giao = document.getElementById('inputDeadlineNgayGiao').value;
  const loai_bai = document.getElementById('selectDeadlineLoai').value;
  const do_uu_tien = document.getElementById('selectDeadlineUuTien').value;
  const output_mong_muon = document.getElementById('inputDeadlineOutput').value.trim();
  const link_tai_lieu = document.getElementById('inputDeadlineLink').value.trim();

  const payload = {
    ma_mon,
    ten_bai_tap,
    han_nop,
    ngay_giao,
    loai_bai,
    do_uu_tien,
    output_mong_muon,
    link_tai_lieu
  };

  const res = await fetch('/api/deadline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const json = await res.json();
  if (res.ok) {
    alert('✅ Tạo deadline thành công!');
    closeModal('modalAddDeadline');
    await fetchDeadlines();
    renderAllDeadlinesTable();
    renderDashboard();
  } else {
    alert(`❌ Error: ${json.error}`);
  }
}

// Update Status Modal
function openUpdateStatusModal(maBaiTap) {
  const d = globalData.deadlines.find(item => item.ma_bai_tap === maBaiTap);
  if (!d) return;

  selectedDeadlineForUpdate = d;
  document.getElementById('hdnUpdateDeadlineId').value = d.ma_bai_tap;
  document.getElementById('lblUpdateStatusTitle').textContent = `CẬP NHẬT: ${d.ten_bai_tap}`;
  document.getElementById('selectUpdateStatus').value = d.trang_thai;
  document.getElementById('inputUpdatePct').value = d.phan_tram_hoan_thanh;
  document.getElementById('lblSliderPct').textContent = `${d.phan_tram_hoan_thanh}%`;

  const groupOutput = document.getElementById('groupUpdateOutput');
  if (d.nguoi_dat_han === 'Tu_dat') {
    groupOutput.style.display = 'block';
    if (d.output_tu_hoc) {
      document.getElementById('inputUpdateOutputResult').value = d.output_tu_hoc.ket_qua_dat_duoc || '';
      document.getElementById('selectUpdateSelfEval').value = d.output_tu_hoc.tu_danh_gia || 'Dat';
    }
  } else {
    groupOutput.style.display = 'none';
  }

  document.getElementById('boxSuggestExtension').style.display = 'none';
  openModal('modalUpdateStatus');
}

function onSelfEvalChange() {
  const evalVal = document.getElementById('selectUpdateSelfEval').value;
  document.getElementById('boxSuggestExtension').style.display = evalVal === 'Chua_dat' ? 'block' : 'none';
}

function openExtensionModalFromStatus() {
  closeModal('modalUpdateStatus');
  if (selectedDeadlineForUpdate) {
    openExtendDeadlineModal(selectedDeadlineForUpdate.ma_bai_tap);
  }
}

async function submitUpdateStatus() {
  const ma_bai_tap = document.getElementById('hdnUpdateDeadlineId').value;
  const trang_thai = document.getElementById('selectUpdateStatus').value;
  const phan_tram_hoan_thanh = document.getElementById('inputUpdatePct').value;

  const res = await fetch(`/api/deadline/${ma_bai_tap}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trang_thai, phan_tram_hoan_thanh })
  });

  if (res.ok) {
    // If output exists, update output
    if (selectedDeadlineForUpdate && selectedDeadlineForUpdate.output_tu_hoc) {
      const ma_output = selectedDeadlineForUpdate.output_tu_hoc.ma_output;
      await fetch(`/api/output/${ma_output}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ket_qua_dat_duoc: document.getElementById('inputUpdateOutputResult').value,
          tu_danh_gia: document.getElementById('selectUpdateSelfEval').value
        })
      });
    }

    alert('✅ Cập nhật tiến độ thành công!');
    closeModal('modalUpdateStatus');
    await fetchDeadlines();
    renderAllDeadlinesTable();
    renderDashboard();
  }
}

// Extend Deadline Modal
function openExtendDeadlineModal(maBaiTap) {
  const d = globalData.deadlines.find(item => item.ma_bai_tap === maBaiTap);
  if (!d) return;

  document.getElementById('hdnExtendDeadlineId').value = d.ma_bai_tap;
  document.getElementById('lblExtendTaskName').textContent = d.ten_bai_tap;
  document.getElementById('lblExtendOldDate').textContent = formatDate(d.han_nop);
  document.getElementById('inputExtendNewDate').value = d.han_nop;
  document.getElementById('inputExtendReason').value = '';

  openModal('modalExtendDeadline');
}

async function submitExtendDeadline() {
  const ma_bai_tap = document.getElementById('hdnExtendDeadlineId').value;
  const han_moi = document.getElementById('inputExtendNewDate').value;
  const ly_do = document.getElementById('inputExtendReason').value.trim();

  const res = await fetch(`/api/deadline/${ma_bai_tap}/gia_han`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ han_moi, ly_do })
  });

  const json = await res.json();
  if (res.ok) {
    alert('✅ Gia hạn deadline thành công!');
    closeModal('modalExtendDeadline');
    await fetchDeadlines();
    renderAllDeadlinesTable();
    renderDashboard();
    renderReportAndExtensions();

  } else {
    alert(`❌ Error: ${json.error}`);
  }
}

// Log Time Modal Helpers
function openLogTimeModalForTask(maBaiTap) {
  openModal('modalLogTime');
  document.getElementById('selectLogDeadline').value = maBaiTap;
}

async function submitLogTime() {
  const ma_bai_tap = document.getElementById('selectLogDeadline').value;
  const gio_thuc_te = document.getElementById('inputLogGio').value;
  const ngay = document.getElementById('inputLogNgay').value;
  const muc_do_tap_trung = document.getElementById('selectLogTapTrung').value;
  const ghi_chu = document.getElementById('inputLogGhiChu').value.trim();

  const res = await fetch('/api/nhat_ky', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ma_bai_tap, gio_thuc_te, ngay, muc_do_tap_trung, ghi_chu })
  });

  const json = await res.json();
  if (res.ok) {
    alert(`✅ Ghi nhận ${gio_thuc_te} giờ học thành công! Streak của bạn: ${json.streak} ngày 🔥`);
    closeModal('modalLogTime');
    await fetchTimeLogs();
    renderNhatKyTable();
    renderDashboard();
  } else {
    alert(`❌ Error: ${json.error}`);
  }
}

// Add Tai Lieu Modal
async function submitAddTaiLieu() {
  const ma_mon = document.getElementById('selectTaiLieuMonHoc').value;
  const ten_tai_lieu = document.getElementById('inputTaiLieuTen').value.trim();
  const loai_tai_lieu = document.getElementById('selectTaiLieuLoai').value;
  const link = document.getElementById('inputTaiLieuLink').value.trim();

  const res = await fetch('/api/tai_lieu', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ma_mon, ten_tai_lieu, loai_tai_lieu, link })
  });

  if (res.ok) {
    alert('✅ Thêm tài liệu học tập thành công!');
    closeModal('modalAddTaiLieu');
    await fetchMaterials();
    renderTaiLieuTable();
  }
}

function deleteTaiLieu(maTaiLieu) {
  if (confirm(`Bạn có chắc muốn xóa tài liệu ${maTaiLieu}?`)) {
    fetch(`/api/tai_lieu/${maTaiLieu}`, { method: 'DELETE' }).then(() => {
      fetchMaterials().then(() => renderTaiLieuTable());
    });
  }
}

// Add Goal Modal
async function submitAddMucTieu() {
  const ten_muc_tieu = document.getElementById('inputMucTieuTen').value.trim();
  const ma_mon = document.getElementById('selectMucTieuMonHoc').value;
  const loai_muc_tieu = document.getElementById('selectMucTieuLoai').value;
  const thoi_han = document.getElementById('inputMucTieuHan').value;
  const cac_buoc_hanh_dong = document.getElementById('inputMucTieuBuocHanhDong').value.trim();

  const res = await fetch('/api/muc_tieu', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ten_muc_tieu, ma_mon, loai_muc_tieu, thoi_han, cac_buoc_hanh_dong })
  });

  if (res.ok) {
    alert('✅ Thêm mục tiêu cá nhân thành công!');
    closeModal('modalAddMucTieu');
    await fetchGoals();
    renderMucTieuTable();
    renderDashboard();
  }
}

// Mobile Push Notifications (06_ke_hoach_UC_thong_bao.md)
async function testMobilePushNotification() {
  try {
    const res = await fetch('/api/test_notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tieu_de: '🔔 Đơn cử Kiểm tra Push Notification',
        noi_dung: 'Chào bạn! Hệ thống Quản lý Học tập AGY STUDY đã kết nối thành công với app ntfy trên điện thoại của bạn.'
      })
    });
    const json = await res.json();
    if (res.ok) {
      alert(`📲 Gửi thành công! Kiểm tra app ntfy trên điện thoại của bạn.\nTopic: ${json.topic}`);
    } else {
      alert(`❌ Lỗi gửi: ${json.message}`);
    }
  } catch (err) {
    alert(`❌ Lỗi kết nối server: ${err.message}`);
  }
}

async function triggerUCNotification(ucName) {
  try {
    const res = await fetch(`/api/trigger_uc_notification/${ucName}`, { method: 'POST' });
    const json = await res.json();
    if (res.ok) {
      alert(`📲 ${json.message}`);
    } else {
      alert(`❌ Lỗi: ${json.error || json.message}`);
    }
  } catch (err) {
    alert(`❌ Lỗi kết nối: ${err.message}`);
  }
}

async function forceRemindNow() {
  try {
    const res = await fetch('/api/force_remind', { method: 'POST' });
    const json = await res.json();
    if (res.ok) {
      if (json.message.includes('0 thông báo')) {
        alert(`ℹ️ Không có deadline nào còn 0-2 ngày để nhắc lúc này.\n\nHãy chắc chắn bạn đã tạo deadline với hạn nộp trong 2 ngày tới!`);
      } else {
        alert(`✅ ${json.message}\n\n📱 Kiểm tra app ntfy trên điện thoại (Topic: ${json.topic})`);
      }
    } else {
      alert(`❌ Lỗi: ${json.message}`);
    }
  } catch (err) {
    alert(`❌ Lỗi kết nối server: ${err.message}`);
  }
}



// ==========================================
// THỜI KHÓA BIỂU & LỊCH PIN POINT (UC19 - UC26)
// ==========================================
let currentCalendarMode = 'week';
let calendarPivotDate = new Date();

function switchCalendarViewMode(mode) {
  currentCalendarMode = mode;
  const btnWeek = document.getElementById('btnCalendarViewWeek');
  const btnMonth = document.getElementById('btnCalendarViewMonth');

  if (mode === 'week') {
    btnWeek.style.background = '#1e40af';
    btnWeek.style.color = '#ffffff';
    btnMonth.style.background = '#e2e8f0';
    btnMonth.style.color = '#334155';
  } else {
    btnMonth.style.background = '#1e40af';
    btnMonth.style.color = '#ffffff';
    btnWeek.style.background = '#e2e8f0';
    btnWeek.style.color = '#334155';
  }
  renderCalendarView();
}

function navigateCalendarPeriod(dir) {
  if (dir === 0) {
    calendarPivotDate = new Date();
  } else if (currentCalendarMode === 'week') {
    calendarPivotDate.setDate(calendarPivotDate.getDate() + dir * 7);
  } else if (currentCalendarMode === 'month') {
    calendarPivotDate.setMonth(calendarPivotDate.getMonth() + dir);
  }
  renderCalendarView();
}

function getStartAndEndDatesForCalendar() {
  const pivot = new Date(calendarPivotDate);
  let startDate, endDate;

  if (currentCalendarMode === 'week') {
    // Current week Monday..Sunday
    const dayOfWeek = pivot.getDay();
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startDate = new Date(pivot);
    startDate.setDate(pivot.getDate() + diffToMon);

    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
  } else {
    // Current month 1st day to last day
    startDate = new Date(pivot.getFullYear(), pivot.getMonth(), 1);
    endDate = new Date(pivot.getFullYear(), pivot.getMonth() + 1, 0);
  }

  const formatISO = (d) => d.toISOString().split('T')[0];
  return {
    startStr: formatISO(startDate),
    endStr: formatISO(endDate),
    startDate,
    endDate
  };
}

async function renderCalendarView() {
  const container = document.getElementById('calendarViewContainer');
  const txtPeriod = document.getElementById('txtCalendarPeriodRange');
  if (!container) return;

  const { startStr, endStr, startDate, endDate } = getStartAndEndDatesForCalendar();

  if (currentCalendarMode === 'week') {
    txtPeriod.textContent = `Tuần: ${startDate.toLocaleDateString('vi-VN')} - ${endDate.toLocaleDateString('vi-VN')}`;
  } else {
    txtPeriod.textContent = `Tháng ${startDate.getMonth() + 1}/${startDate.getFullYear()}`;
  }

  try {
    const res = await fetch(`/api/calendar_view?start_date=${startStr}&end_date=${endStr}`);
    const data = await res.json();
    const daysData = data.days || {};

    if (currentCalendarMode === 'week') {
      renderWeeklyGrid(container, daysData, startStr, endStr);
    } else {
      renderMonthlyGrid(container, daysData, startDate);
    }
  } catch (err) {
    container.innerHTML = `<p style="color:#b91c1c; text-align:center;">Lỗi tải dữ liệu lịch: ${err.message}</p>`;
  }
}

function renderWeeklyGrid(container, daysData, startStr, endStr) {
  const todayStr = new Date().toISOString().split('T')[0];
  const sortedDates = Object.keys(daysData).sort();

  let html = `<div class="calendar-grid-week">`;

  sortedDates.forEach(dStr => {
    const dayInfo = daysData[dStr];
    const isToday = dStr === todayStr;
    const dateObj = new Date(dStr);
    const dayDisplay = `${dayInfo.weekday} (${dateObj.getDate()}/${dateObj.getMonth() + 1})`;

    // Pin points HTML
    let pinHtml = '';
    const pins = dayInfo.pin_points || [];
    pins.forEach(pin => {
      pinHtml += `<span class="pin-point-dot" style="background:${pin.color};" title="${pin.title}"></span>`;
    });
    if (pins.length === 0) {
      pinHtml = `<span style="font-size:11px; color:#94a3b8;">Trống</span>`;
    }

    // Schedule items HTML
    let itemsHtml = '';
    const items = dayInfo.items || [];
    items.forEach(item => {
      if (item.is_deadline) {
        const bgStyle = item.do_uu_tien === 'Cao' 
          ? 'background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); box-shadow: 0 2px 8px rgba(239,68,68,0.3);' 
          : 'background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); box-shadow: 0 2px 8px rgba(245,158,11,0.3);';
        itemsHtml += `
          <div class="calendar-event-card" style="${bgStyle}" onclick="openDayDetailModal('${dStr}')">
            <div style="font-weight:700; display:flex; align-items:center; gap:4px;"><i class="fa-solid fa-clock"></i> Deadline</div>
            <div style="font-weight:500; margin-top:2px;">${item.ten_bai_tap}</div>
          </div>
        `;
      } else {
        const bgStyle = item.loai_su_kien === 'Lich_hoc_co_dinh' 
          ? 'background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); box-shadow: 0 2px 8px rgba(37,99,235,0.3);' 
          : 'background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); box-shadow: 0 2px 8px rgba(139,92,246,0.3);';
        itemsHtml += `
          <div class="calendar-event-card" style="${bgStyle}" onclick="openDayDetailModal('${dStr}')">
            <div style="font-weight:700; display:flex; align-items:center; gap:4px;"><i class="fa-solid fa-book-open"></i> ${item.gio_bat_dau} - ${item.gio_ket_thuc}</div>
            <div style="font-weight:600; margin-top:2px;">${item.ten_hien_thi}</div>
            <div style="font-size:11px; opacity:0.9; margin-top:2px;">📍 ${item.dia_diem || item.hinh_thuc}</div>
          </div>
        `;
      }
    });


    html += `
      <div class="calendar-day-col">
        <div class="calendar-day-header ${isToday ? 'today' : ''}">
          ${dayDisplay} ${isToday ? '🔥' : ''}
        </div>
        <div class="pin-points-bar" onclick="openDayDetailModal('${dStr}')" title="Click xem chi tiết ngày">
          ${pinHtml}
        </div>
        <div class="calendar-day-body">
          ${itemsHtml}
        </div>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;
}

function renderMonthlyGrid(container, daysData, pivotStartDate) {
  const todayStr = new Date().toISOString().split('T')[0];
  const year = pivotStartDate.getFullYear();
  const month = pivotStartDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  let html = `
    <div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:8px; font-weight:600; text-align:center; margin-bottom:8px; color:#475569;">
      <div>T2</div><div>T3</div><div>T4</div><div>T5</div><div>T6</div><div>T7</div><div>CN</div>
    </div>
    <div class="calendar-grid-month">
  `;

  // Pad empty days at start
  const startWeekday = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  for (let i = 0; i < startWeekday; i++) {
    html += `<div class="calendar-month-cell other-month"></div>`;
  }

  // Render month days
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayInfo = daysData[dStr] || { items: [], pin_points: [] };
    const isToday = dStr === todayStr;

    let pinHtml = '';
    (dayInfo.pin_points || []).forEach(p => {
      pinHtml += `<span class="pin-point-dot" style="background:${p.color};" title="${p.title}"></span>`;
    });

    let previewText = '';
    if (dayInfo.items && dayInfo.items.length > 0) {
      previewText = `<div style="font-size:11px; color:#475569; margin-top:4px;">${dayInfo.items.length} sự kiện/deadline</div>`;
    }

    html += `
      <div class="calendar-month-cell ${isToday ? 'today' : ''}" onclick="openDayDetailModal('${dStr}')">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="font-size:14px; color:#1e293b;">${d} ${isToday ? '📌' : ''}</strong>
          <div style="display:flex; gap:3px;">${pinHtml}</div>
        </div>
        ${previewText}
      </div>
    `;
  }

  html += `</div>`;
  container.innerHTML = html;
}

// Day Detail Quick Modal (UC23)
async function openDayDetailModal(dateStr) {
  const header = document.getElementById('txtDayDetailHeader');
  const container = document.getElementById('containerDayDetailItems');
  
  const dateObj = new Date(dateStr);
  header.textContent = `CHI TIẾT NGÀY ${dateObj.toLocaleDateString('vi-VN')}`;
  container.innerHTML = '<p>Đang tải chi tiết...</p>';
  openModal('modalDayDetail');

  try {
    const res = await fetch(`/api/calendar_view?start_date=${dateStr}&end_date=${dateStr}`);
    const data = await res.json();
    const dayInfo = (data.days && data.days[dateStr]) || { items: [] };
    const items = dayInfo.items || [];

    if (items.length === 0) {
      container.innerHTML = '<p style="color:#64748b; text-align:center; padding:16px;">Không có lịch học hoặc deadline nào trong ngày này. 🎉</p>';
      return;
    }

    let html = '<div style="display:flex; flex-direction:column; gap:12px;">';
    items.forEach(item => {
      if (item.is_deadline) {
        html += `
          <div style="background:#fff1f2; border:1px solid #fecdd3; padding:12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <span class="chip chip-priority-high" style="margin-bottom:4px;">⏰ Deadline</span>
              <div style="font-weight:600; color:#9f1239; margin-top:2px;">${item.ten_bai_tap}</div>
              <div style="font-size:12px; color:#881337;">Môn: ${item.ma_mon} | Hạn: ${item.han_nop} | Ưu tiên: ${item.do_uu_tien}</div>
            </div>
            <button class="btn-sm" onclick="closeModal('modalDayDetail'); switchTab('tab-deadline');">Đi tới Deadline →</button>
          </div>
        `;
      } else {
        const badgeBg = item.loai_su_kien === 'Lich_hoc_co_dinh' ? '#2563EB' : '#7C3AED';
        html += `
          <div style="background:#eff6ff; border:1px solid #bfdbfe; padding:12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <span class="chip" style="background:${badgeBg}; color:#ffffff; margin-bottom:4px;">📚 ${item.gio_bat_dau} - ${item.gio_ket_thuc}</span>
              <div style="font-weight:600; color:#1e40af; margin-top:2px;">${item.ten_hien_thi}</div>
              <div style="font-size:12px; color:#1e3a8a;">Hình thức: ${item.hinh_thuc} | Địa điểm: ${item.dia_diem || 'N/A'}</div>
              ${item.ghi_chu ? `<div style="font-size:11px; color:#475569; margin-top:2px;">Ghi chú: ${item.ghi_chu}</div>` : ''}
            </div>
            <button class="btn-sm" style="color:#b91c1c; border-color:#fca5a5;" onclick="deleteLichHoc('${item.ma_lich}')">Xóa lịch</button>
          </div>
        `;
      }

    });

    html += '</div>';
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<p style="color:#b91c1c;">Lỗi: ${err.message}</p>`;
  }
}

// Modal Add Lich Hoc Controls (UC19, UC20, UC25)
function toggleLichHocTypeFields() {
  const loai = document.getElementById('selectLichHocLoai').value;
  const grpThu = document.getElementById('grpLichHocThu');
  const grpNgay = document.getElementById('grpLichHocNgayCuThe');
  const grpTen = document.getElementById('grpLichHocTenSuKien');

  if (loai === 'Lich_hoc_co_dinh') {
    grpThu.style.display = 'block';
    grpNgay.style.display = 'none';
    grpTen.style.display = 'none';
  } else {
    grpThu.style.display = 'none';
    grpNgay.style.display = 'block';
    grpTen.style.display = 'block';
  }
}

function toggleLichHocDiaDiemField() {
  const hinhThuc = document.getElementById('selectLichHocHinhThuc').value;
  const inputDiaDiem = document.getElementById('inputLichHocDiaDiem');
  if (hinhThuc === 'Online') {
    inputDiaDiem.placeholder = 'https://zoom.us/j/... hoặc Teams Link';
  } else {
    inputDiaDiem.placeholder = 'VD: Phòng A2-301, Tòa nhà B';
  }
}

async function submitAddLichHoc(force = false) {
  const loai_su_kien = document.getElementById('selectLichHocLoai').value;
  const ma_mon = document.getElementById('selectLichHocMonHoc').value;
  const ten_su_kien = document.getElementById('inputLichHocTenSuKien').value.trim();
  const thu_trong_tuan = document.getElementById('selectLichHocThu').value;
  const ngay_cu_the = document.getElementById('inputLichHocNgayCuThe').value;
  const gio_bat_dau = document.getElementById('inputLichHocGioBatDau').value;
  const gio_ket_thuc = document.getElementById('inputLichHocGioKetThuc').value;
  const hinh_thuc = document.getElementById('selectLichHocHinhThuc').value;
  const dia_diem = document.getElementById('inputLichHocDiaDiem').value.trim();
  const ghi_chu = document.getElementById('inputLichHocGhiChu').value.trim();

  const boxAlert = document.getElementById('boxLichHocConflictAlert');
  const txtMsg = document.getElementById('txtLichHocConflictMsg');
  const btnSubmit = document.getElementById('btnSubmitAddLichHoc');

  const payload = {
    loai_su_kien,
    ma_mon,
    ten_su_kien,
    thu_trong_tuan,
    ngay_cu_the,
    gio_bat_dau,
    gio_ket_thuc,
    hinh_thuc,
    dia_diem,
    ghi_chu,
    force
  };

  const res = await fetch('/api/lich_hoc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const json = await res.json();

  if (res.status === 409 && json.conflict) {
    // Conflict detected (UC25)
    boxAlert.style.display = 'block';
    txtMsg.textContent = json.message;
    btnSubmit.textContent = 'Vẫn lưu (Xác nhận trùng giờ)';
    btnSubmit.setAttribute('onclick', 'submitAddLichHoc(true)');
    return;
  }

  if (res.ok) {
    alert('✅ Thêm lịch học / sự kiện thành công!');
    boxAlert.style.display = 'none';
    btnSubmit.textContent = 'Lưu Lịch Học';
    btnSubmit.setAttribute('onclick', 'submitAddLichHoc(false)');
    closeModal('modalAddLichHoc');
    renderCalendarView();
  } else {
    alert(`❌ Lỗi: ${json.error || json.message}`);
  }
}

async function deleteLichHoc(maLich) {
  if (confirm(`Bạn có chắc muốn xóa lịch học này?`)) {
    const res = await fetch(`/api/lich_hoc/${maLich}`, { method: 'DELETE' });
    if (res.ok) {
      alert('✅ Đã xóa lịch thành công!');
      closeModal('modalDayDetail');
      renderCalendarView();
    }
  }
}


