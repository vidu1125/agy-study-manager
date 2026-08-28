/* ==========================================================================
   MODULE: MỤC TIÊU CÁ NHÂN
   Handles personal goals listing, creation, and progress display.
   ========================================================================== */

async function fetchGoals() {
  const res = await fetch('/api/muc_tieu');
  globalData.goals = await res.json();
}

function renderMucTieuTable() {
  const tbody = document.getElementById('tblMucTieu');
  if (!tbody) return;

  if (globalData.goals.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-muted);">Chưa có mục tiêu nào. Hãy bấm "+ Thêm Mục tiêu mới".</td></tr>';
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
          <span style="font-size:11px; font-family:var(--font-mono);">${g.tien_do_phan_tram}%</span>
        </div>
      </td>
      <td>${g.trang_thai === 'Hoan_thanh' ? '<span style="color:var(--accent-emerald)">Hoàn thành</span>' : '<span style="color:var(--accent-amber)">Đang thực hiện</span>'}</td>
    </tr>
  `).join('');
}

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
    alert('Thêm mục tiêu cá nhân thành công!');
    closeModal('modalAddMucTieu');
    await fetchGoals();
    renderMucTieuTable();
    if (document.getElementById('tab-dashboard').style.display !== 'none') {
      renderDashboard();
    }
  }
}
