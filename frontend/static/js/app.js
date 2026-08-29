/* ==========================================================================
   AGY STUDY MANAGER — LEARNING HUB (SPA CORE CONTROLLER)
   Central State, Navigation Router, Modal Controller, and Global Helpers.
   ========================================================================== */

let globalData = {
  subjects: [],
  deadlines: [],
  materials: [],
  timeLogs: [],
  goals: [],
  extensionLogs: [],
  vocabDecks: []
};

// ==========================================
// 1. INITIALIZATION & LIFECYCLE
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

// Auto draft saving every 30 seconds
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
// 2. NAVIGATION & TAB ROUTING
// ==========================================
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item, .mobile-nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTab = item.dataset.tab;
      if (!targetTab) return;
      switchTab(targetTab);
    });
  });

  const moreTrigger = document.getElementById('btnMobileMore');
  if (moreTrigger) {
    moreTrigger.addEventListener('click', () => toggleMobileMoreMenu());
    moreTrigger.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleMobileMoreMenu();
      }
    });
  }
}

function toggleMobileMoreMenu(forceOpen) {
  const sheet = document.getElementById('mobileMoreSheet');
  const backdrop = document.getElementById('mobileMoreBackdrop');
  const trigger = document.getElementById('btnMobileMore');
  if (!sheet || !backdrop) return;

  const isOpen = typeof forceOpen === 'boolean'
    ? forceOpen
    : !sheet.classList.contains('active');

  sheet.classList.toggle('active', isOpen);
  backdrop.classList.toggle('active', isOpen);
  document.body.classList.toggle('mobile-menu-open', isOpen);
  if (trigger) trigger.setAttribute('aria-expanded', String(isOpen));
}

function mobileSwitchTab(tabId) {
  toggleMobileMoreMenu(false);
  switchTab(tabId);
}

function switchTab(tabId) {
  toggleMobileMoreMenu(false);

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
    'tab-vocab': 'Học từ vựng Spaced Repetition',
    'tab-vocab-analytics': 'Phân tích tiến độ từ vựng',
    'tab-nhatky': 'Nhật ký Thời gian Thực tế',
    'tab-muctieu': 'Mục tiêu Cá nhân',
    'tab-baocao': 'Báo cáo Tuần & Lịch sử Gia hạn',
    'tab-lichhoc': 'Thời khóa biểu & Lịch Pin Point'
  };
  const pageTitleEl = document.getElementById('page-title');
  if (pageTitleEl) {
    pageTitleEl.textContent = titles[tabId] || 'Quản lý Học tập';
  }

  // Refresh tab data via respective modules
  if (tabId === 'tab-dashboard') renderDashboard();
  else if (tabId === 'tab-monhoc') renderMonHocTable();
  else if (tabId === 'tab-deadline') renderAllDeadlinesTable();
  else if (tabId === 'tab-tailieu') renderTaiLieuTable();
  else if (tabId === 'tab-vocab') renderVocabWorkspace();
  else if (tabId === 'tab-vocab-analytics') renderVocabAnalytics();
  else if (tabId === 'tab-nhatky') renderNhatKyTable();
  else if (tabId === 'tab-muctieu') renderMucTieuTable();
  else if (tabId === 'tab-baocao') renderReportAndExtensions();
  else if (tabId === 'tab-lichhoc') renderCalendarView();
}

// ==========================================
// 3. QUICK ADD DROPDOWN MENU
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
// 4. MODAL DIALOG CONTROLLER
// ==========================================
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
  }
}

// Global click outside to close modals
window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
  }
});

// ESC key to close active modal
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
  }
});

// ==========================================
// 5. MASTER DATA LOADER
// ==========================================
async function loadAllData() {
  try {
    await Promise.all([
      fetchSubjects(),
      fetchDeadlines(),
      fetchMaterials(),
      fetchTimeLogs(),
      fetchGoals(),
      fetchDashboardData(),
      fetchVocabDecks().catch(() => [])
    ]);
  } catch (err) {
    console.error('Lỗi khi tải dữ liệu master:', err);
  }
}

// ==========================================
// 6. DROPDOWN POPULATION WITH GROUPING
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
// 7. FORMATTERS & STATUS CHIPS
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
// 8. GLOBAL SEARCH HANDLER (TOP HEADER)
// ==========================================
function handleGlobalSearch(query) {
  const q = (query || '').toLowerCase().trim();
  const rows = document.querySelectorAll('.data-table tbody tr');
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    if (!q || text.includes(q)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}
