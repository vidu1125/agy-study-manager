/* ==========================================================================
   MODULE: DEADLINE (UC04, UC05, UC06, UC07, UC08)
   Handles deadlines listing, creation, progress updates, output eval, extensions.
   ========================================================================== */

let selectedDeadlineForUpdate = null;

async function fetchDeadlines() {
  const res = await fetch('/api/deadline');
  globalData.deadlines = await res.json();
  populateDeadlineDropdowns();
}

function onDeadlineSubjectChange() {
  const select = document.getElementById('selectDeadlineMonHoc');
  const ma_mon = select.value;
  const grpOutput = document.getElementById('groupDeadlineOutput');
  if (!grpOutput) return;

  const sub = globalData.subjects.find(s => s.ma_mon === ma_mon);
  if (sub && sub.loai_mon === 'Tu_hoc') {
    grpOutput.style.display = 'block';
  } else {
    grpOutput.style.display = 'none';
  }
}

function renderAllDeadlinesTable() {
  const tbody = document.getElementById('tblAllDeadlines');
  if (!tbody) return;

  if (globalData.deadlines.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; color:var(--text-muted);">Chưa có deadline nào. Hãy bấm "+ Thêm Deadline mới".</td></tr>';
    return;
  }

  tbody.innerHTML = globalData.deadlines.map(d => `
    <tr>
      <td><code>${d.ma_bai_tap}</code></td>
      <td><strong>${d.ten_mon}</strong></td>
      <td>${d.ten_bai_tap} ${d.link_tai_lieu ? `<a href="${d.link_tai_lieu}" target="_blank" style="color:var(--primary-cyan);">[&gt;]</a>` : ''}</td>
      <td>${formatDate(d.han_nop)}</td>
      <td>${d.so_ngay_con_lai >= 0 ? `${d.so_ngay_con_lai} ngày` : `<span style="color:var(--accent-rose)">Quá ${Math.abs(d.so_ngay_con_lai)} ngày</span>`}</td>
      <td>${renderPriorityChip(d.do_uu_tien)}</td>
      <td><span style="font-size:12px; font-family:var(--font-mono); color:var(--text-muted);">${d.nguoi_dat_han === 'Giang_vien' ? 'Giảng viên' : 'Tự đặt'}</span></td>
      <td>
        <div class="progress-container">
          <div class="progress-track" style="width:80px;">
            <div class="progress-fill" style="width:${d.phan_tram_hoan_thanh}%;"></div>
          </div>
          <span style="font-size:11px; font-family:var(--font-mono);">${d.phan_tram_hoan_thanh}%</span>
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

async function submitAddDeadline() {
  const ma_mon = document.getElementById('selectDeadlineMonHoc').value;
  const ten_bai_tap = document.getElementById('inputDeadlineTen').value.trim();
  const loai_bai = document.getElementById('selectDeadlineLoai').value;
  const do_uu_tien = document.getElementById('selectDeadlineUuTien').value;
  const ngay_giao = document.getElementById('inputDeadlineNgayGiao').value;
  const han_nop = document.getElementById('inputDeadlineHanNop').value;
  const output_mong_muon = document.getElementById('inputDeadlineOutput').value.trim();
  const link_tai_lieu = document.getElementById('inputDeadlineLink').value.trim();

  const payload = {
    ma_mon,
    ten_bai_tap,
    loai_bai,
    do_uu_tien,
    ngay_giao,
    han_nop,
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
    alert('Tạo deadline thành công!');
    closeModal('modalAddDeadline');
    await fetchDeadlines();
    renderAllDeadlinesTable();
    if (document.getElementById('tab-dashboard').style.display !== 'none') {
      renderDashboard();
    }
  } else {
    alert(`Lỗi: ${json.error}`);
  }
}

function openUpdateStatusModal(ma_bai_tap) {
  const deadline = globalData.deadlines.find(d => d.ma_bai_tap === ma_bai_tap);
  if (!deadline) return;

  selectedDeadlineForUpdate = deadline;
  document.getElementById('hdnUpdateDeadlineId').value = ma_bai_tap;
  document.getElementById('lblUpdateStatusTitle').textContent = `TIẾN ĐỘ: ${deadline.ten_bai_tap}`;
  document.getElementById('selectUpdateStatus').value = deadline.trang_thai;
  document.getElementById('inputUpdatePct').value = deadline.phan_tram_hoan_thanh;
  document.getElementById('lblSliderPct').textContent = `${deadline.phan_tram_hoan_thanh}%`;

  const grpOutput = document.getElementById('groupUpdateOutput');
  const boxSuggest = document.getElementById('boxSuggestExtension');
  boxSuggest.style.display = 'none';

  if (deadline.loai_mon === 'Tu_hoc') {
    grpOutput.style.display = 'block';
  } else {
    grpOutput.style.display = 'none';
  }

  openModal('modalUpdateStatus');
}

function onStatusSelectChange() {
  const status = document.getElementById('selectUpdateStatus').value;
  const slider = document.getElementById('inputUpdatePct');
  const lblSlider = document.getElementById('lblSliderPct');

  if (status === 'Hoan_thanh') {
    slider.value = 100;
    lblSlider.textContent = '100%';
  } else if (status === 'Chua_lam' && slider.value === '100') {
    slider.value = 0;
    lblSlider.textContent = '0%';
  }
}

function onSelfEvalChange() {
  const val = document.getElementById('selectUpdateSelfEval').value;
  const boxSuggest = document.getElementById('boxSuggestExtension');
  if (val === 'Chua_dat' || val === 'Can_lam_lai') {
    boxSuggest.style.display = 'flex';
  } else {
    boxSuggest.style.display = 'none';
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
    if (selectedDeadlineForUpdate && selectedDeadlineForUpdate.loai_mon === 'Tu_hoc') {
      const ket_qua_dat_duoc = document.getElementById('inputUpdateOutputResult').value;
      const tu_danh_gia = document.getElementById('selectUpdateSelfEval').value;
      const ma_output = `${ma_bai_tap}-OUT`;

      await fetch(`/api/output/${ma_output}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ket_qua_dat_duoc, tu_danh_gia })
      });
    }

    alert('Cập nhật tiến độ thành công!');
    closeModal('modalUpdateStatus');
    await fetchDeadlines();
    renderAllDeadlinesTable();
    if (document.getElementById('tab-dashboard').style.display !== 'none') {
      renderDashboard();
    }
  }
}

function openExtendDeadlineModal(ma_bai_tap) {
  const deadline = globalData.deadlines.find(d => d.ma_bai_tap === ma_bai_tap);
  if (!deadline) return;

  document.getElementById('hdnExtendDeadlineId').value = ma_bai_tap;
  document.getElementById('lblExtendTaskName').textContent = deadline.ten_bai_tap;
  document.getElementById('lblExtendOldDate').textContent = formatDate(deadline.han_nop);
  document.getElementById('inputExtendNewDate').value = deadline.han_nop;

  openModal('modalExtendDeadline');
}

function openExtensionModalFromStatus() {
  closeModal('modalUpdateStatus');
  if (selectedDeadlineForUpdate) {
    openExtendDeadlineModal(selectedDeadlineForUpdate.ma_bai_tap);
  }
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
    alert('Gia hạn deadline thành công!');
    closeModal('modalExtendDeadline');
    await fetchDeadlines();
    renderAllDeadlinesTable();
    renderReportAndExtensions();
  } else {
    alert(`Lỗi: ${json.error}`);
  }
}
