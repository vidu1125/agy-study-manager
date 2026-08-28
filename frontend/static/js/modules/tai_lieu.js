/* ==========================================================================
   MODULE: TÀI LIỆU HỌC TẬP (UC09, UC10)
   Handles materials management and Spaced Repetition hint calculation.
   ========================================================================== */

async function fetchMaterials() {
  const res = await fetch('/api/tai_lieu');
  globalData.materials = await res.json();
}

function renderTaiLieuTable() {
  const tbody = document.getElementById('tblTaiLieu');
  if (!tbody) return;

  if (globalData.materials.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-muted);">Chưa có tài liệu học tập nào. Hãy bấm "+ Thêm Tài liệu mới".</td></tr>';
    return;
  }

  tbody.innerHTML = globalData.materials.map(m => `
    <tr>
      <td><code>${m.ma_tai_lieu}</code></td>
      <td><strong>${m.ten_mon}</strong></td>
      <td>${m.ten_tai_lieu}</td>
      <td><span class="chip chip-priority-low">${m.loai_tai_lieu}</span></td>
      <td>${m.link ? `<a href="${m.link}" target="_blank" style="color:var(--primary-cyan); text-decoration:underline;">Mở link [&gt;]</a>` : 'Không có'}</td>
      <td>${formatDate(m.ngay_them)}</td>
      <td><span style="font-size:12px; font-family:var(--font-mono); color:var(--secondary-sky);">Ôn lại (Spaced repetition)</span></td>
      <td>
        <button class="btn-sm" onclick="deleteTaiLieu('${m.ma_tai_lieu}')">Xóa</button>
      </td>
    </tr>
  `).join('');
}

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
    alert('Thêm tài liệu học tập thành công!');
    closeModal('modalAddTaiLieu');
    await fetchMaterials();
    renderTaiLieuTable();
  }
}

async function deleteTaiLieu(ma_tai_lieu) {
  if (confirm(`Bạn có chắc chắn muốn xóa tài liệu ${ma_tai_lieu}?`)) {
    const res = await fetch(`/api/tai_lieu/${ma_tai_lieu}`, { method: 'DELETE' });
    if (res.ok) {
      alert('Đã xóa tài liệu thành công!');
      await fetchMaterials();
      renderTaiLieuTable();
    }
  }
}
