/* ==========================================================================
   MODULE: THỜI KHÓA BIỂU & LỊCH (UC19 - UC26)
   Handles calendar view (week/month), pin points, conflict detection & detail.
   ========================================================================== */

let currentCalendarMode = 'week';
let calendarPivotDate = new Date();

function switchCalendarViewMode(mode) {
  currentCalendarMode = mode;
  const btnWeek = document.getElementById('btnCalendarViewWeek');
  const btnMonth = document.getElementById('btnCalendarViewMonth');

  if (mode === 'week') {
    btnWeek.style.background = 'var(--primary-cyan)';
    btnWeek.style.color = '#020205';
    btnWeek.style.fontWeight = '700';
    btnMonth.style.background = 'rgba(255, 255, 255, 0.04)';
    btnMonth.style.color = 'rgba(255, 255, 255, 0.85)';
    btnMonth.style.fontWeight = '600';
  } else {
    btnMonth.style.background = 'var(--primary-cyan)';
    btnMonth.style.color = '#020205';
    btnMonth.style.fontWeight = '700';
    btnWeek.style.background = 'rgba(255, 255, 255, 0.04)';
    btnWeek.style.color = 'rgba(255, 255, 255, 0.85)';
    btnWeek.style.fontWeight = '600';
  }

  renderCalendarView();
}

function navigateCalendarPeriod(offset) {
  if (offset === 0) {
    calendarPivotDate = new Date();
  } else {
    if (currentCalendarMode === 'week') {
      calendarPivotDate.setDate(calendarPivotDate.getDate() + offset * 7);
    } else {
      calendarPivotDate.setMonth(calendarPivotDate.getMonth() + offset);
    }
  }
  renderCalendarView();
}

function getStartAndEndDatesForCalendar() {
  const d = new Date(calendarPivotDate);
  const formatISO = dt => dt.toISOString().split('T')[0];

  let startDate, endDate;

  if (currentCalendarMode === 'week') {
    const dayOfWeek = d.getDay(); // 0 is Sunday, 1 is Monday
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    startDate = new Date(d);
    startDate.setDate(d.getDate() + diffToMonday);

    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
  } else {
    // Month view
    startDate = new Date(d.getFullYear(), d.getMonth(), 1);
    endDate = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  }

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
    container.innerHTML = `<p style="color:var(--accent-rose); text-align:center;">Lỗi tải dữ liệu lịch: ${err.message}</p>`;
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
      pinHtml = `<span style="font-size:10px; font-family:var(--font-mono); color:var(--text-faint);">Trống</span>`;
    }

    // Schedule items HTML
    let itemsHtml = '';
    const items = dayInfo.items || [];
    items.forEach(item => {
      if (item.is_deadline) {
        const bgStyle = item.do_uu_tien === 'Cao' 
          ? 'background: linear-gradient(135deg, rgba(239,68,68,0.3) 0%, rgba(220,38,38,0.4) 100%); border-color: rgba(239,68,68,0.5);' 
          : 'background: linear-gradient(135deg, rgba(245,158,11,0.3) 0%, rgba(217,119,6,0.4) 100%); border-color: rgba(245,158,11,0.5);';
        itemsHtml += `
          <div class="calendar-event-card" style="${bgStyle}" onclick="openDayDetailModal('${dStr}')">
            <div style="font-weight:700; font-family:var(--font-mono); display:flex; align-items:center; gap:4px; color:#ffffff;">[!] Deadline</div>
            <div style="font-weight:600; margin-top:2px; color:#ffffff;">${item.ten_bai_tap}</div>
          </div>
        `;
      } else {
        const bgStyle = item.loai_su_kien === 'Lich_hoc_co_dinh' 
          ? 'background: linear-gradient(135deg, rgba(37,99,235,0.3) 0%, rgba(29,78,216,0.4) 100%); border-color: rgba(37,99,235,0.5);' 
          : 'background: linear-gradient(135deg, rgba(139,92,246,0.3) 0%, rgba(109,40,217,0.4) 100%); border-color: rgba(139,92,246,0.5);';
        itemsHtml += `
          <div class="calendar-event-card" style="${bgStyle}" onclick="openDayDetailModal('${dStr}')">
            <div style="font-weight:700; font-family:var(--font-mono); display:flex; align-items:center; gap:4px; color:#ffffff;">[ ] ${item.gio_bat_dau} - ${item.gio_ket_thuc}</div>
            <div style="font-weight:600; margin-top:2px; color:#ffffff;">${item.ten_hien_thi}</div>
            <div style="font-size:11px; font-family:var(--font-mono); opacity:0.8; margin-top:2px; color:var(--text-body);">${item.dia_diem || item.hinh_thuc}</div>
          </div>
        `;
      }
    });

    html += `
      <div class="calendar-day-col">
        <div class="calendar-day-header ${isToday ? 'today' : ''}">
          ${dayDisplay} ${isToday ? '• HÔM NAY' : ''}
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
    <div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:8px; font-weight:700; font-family:var(--font-mono); text-align:center; margin-bottom:8px; color:var(--text-muted); font-size:11px;">
      <div>T2</div><div>T3</div><div>T4</div><div>T5</div><div>T6</div><div>T7</div><div>CN</div>
    </div>
    <div class="calendar-grid-month">
  `;

  // Pad empty days at start
  const startWeekday = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  for (let i = 0; i < startWeekday; i++) {
    html += `<div class="calendar-month-cell other-month" style="opacity:0.3;"></div>`;
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
      previewText = `<div style="font-size:10px; font-family:var(--font-mono); color:var(--primary-cyan); margin-top:4px;">${dayInfo.items.length} sự kiện/task</div>`;
    }

    html += `
      <div class="calendar-month-cell ${isToday ? 'today' : ''}" onclick="openDayDetailModal('${dStr}')">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="font-size:13px; font-family:var(--font-mono); color:#ffffff;">${d}</strong>
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
  container.innerHTML = '<p style="color:var(--text-muted);">Đang tải chi tiết...</p>';
  openModal('modalDayDetail');

  try {
    const res = await fetch(`/api/calendar_view?start_date=${dateStr}&end_date=${dateStr}`);
    const data = await res.json();
    const dayInfo = (data.days && data.days[dateStr]) || { items: [] };
    const items = dayInfo.items || [];

    if (items.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:16px;">Không có lịch học hoặc deadline nào trong ngày này.</p>';
      return;
    }

    let html = '<div style="display:flex; flex-direction:column; gap:12px;">';
    items.forEach(item => {
      if (item.is_deadline) {
        html += `
          <div style="background:rgba(244,63,94,0.08); border:1px solid rgba(244,63,94,0.3); padding:14px; border-radius:12px; display:flex; justify-content:space-between; align-items:center; backdrop-filter:blur(10px);">
            <div>
              <span class="chip chip-priority-high" style="margin-bottom:6px;">Deadline</span>
              <div style="font-weight:700; color:#ffffff; font-size:13px; margin-top:2px;">${item.ten_bai_tap}</div>
              <div style="font-size:11px; font-family:var(--font-mono); color:var(--accent-rose); margin-top:2px;">Môn: ${item.ma_mon} | Hạn: ${item.han_nop} | Ưu tiên: ${item.do_uu_tien}</div>
            </div>
            <button class="btn-sm" onclick="closeModal('modalDayDetail'); switchTab('tab-deadline');">Đi tới Deadline &rarr;</button>
          </div>
        `;
      } else {
        const badgeColor = item.loai_su_kien === 'Lich_hoc_co_dinh' ? 'var(--secondary-sky)' : 'var(--tertiary-purple)';
        html += `
          <div style="background:rgba(37,99,235,0.08); border:1px solid rgba(37,99,235,0.3); padding:14px; border-radius:12px; display:flex; justify-content:space-between; align-items:center; backdrop-filter:blur(10px);">
            <div>
              <span class="chip" style="background:rgba(37,99,235,0.2); color:${badgeColor}; border:1px solid rgba(37,99,235,0.4); margin-bottom:6px;">${item.gio_bat_dau} - ${item.gio_ket_thuc}</span>
              <div style="font-weight:700; color:#ffffff; font-size:13px; margin-top:2px;">${item.ten_hien_thi}</div>
              <div style="font-size:11px; font-family:var(--font-mono); color:rgba(255,255,255,0.6); margin-top:2px;">Hình thức: ${item.hinh_thuc} | Địa điểm: ${item.dia_diem || 'N/A'}</div>
              ${item.ghi_chu ? `<div style="font-size:11px; color:rgba(255,255,255,0.4); margin-top:2px;">Ghi chú: ${item.ghi_chu}</div>` : ''}
            </div>
            <button class="btn-sm" style="color:var(--accent-rose); border-color:rgba(244,63,94,0.3);" onclick="deleteLichHoc('${item.ma_lich}')">Xóa lịch</button>
          </div>
        `;
      }
    });

    html += '</div>';
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<p style="color:var(--accent-rose);">Lỗi: ${err.message}</p>`;
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

  const payload = {
    loai_su_kien,
    ma_mon: ma_mon || null,
    ten_su_kien,
    thu_trong_tuan,
    ngay_cu_the: ngay_cu_the || null,
    gio_bat_dau,
    gio_ket_thuc,
    hinh_thuc,
    dia_diem,
    ghi_chu,
    force
  };

  const boxAlert = document.getElementById('boxLichHocConflictAlert');
  const txtMsg = document.getElementById('txtLichHocConflictMsg');
  const btnSubmit = document.getElementById('btnSubmitAddLichHoc');

  const res = await fetch('/api/lich_hoc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const json = await res.json();

  if (res.status === 409) {
    // UC25 Conflict Detected!
    boxAlert.style.display = 'block';
    txtMsg.textContent = `⚠ ${json.error}`;
    btnSubmit.textContent = 'Vẫn lưu (Xác nhận trùng)';
    btnSubmit.setAttribute('onclick', 'submitAddLichHoc(true)');
    return;
  }

  if (res.ok) {
    alert('Thêm lịch học / sự kiện thành công!');
    boxAlert.style.display = 'none';
    btnSubmit.textContent = 'Lưu Lịch Học';
    btnSubmit.setAttribute('onclick', 'submitAddLichHoc(false)');
    closeModal('modalAddLichHoc');
    renderCalendarView();
  } else {
    alert(`Lỗi: ${json.error || json.message}`);
  }
}

async function deleteLichHoc(maLich) {
  if (confirm(`Bạn có chắc muốn xóa lịch học này?`)) {
    const res = await fetch(`/api/lich_hoc/${maLich}`, { method: 'DELETE' });
    if (res.ok) {
      alert('Đã xóa lịch thành công!');
      closeModal('modalDayDetail');
      renderCalendarView();
    }
  }
}
