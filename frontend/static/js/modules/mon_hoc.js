/* ==========================================================================
   MODULE: MÔN HỌC (UC01, UC02, UC03)
   Handles subjects listing, creation, and soft-delete.
   ========================================================================== */

let currentMonHocType = 'Truong';

async function fetchSubjects() {
  const res = await fetch('/api/mon_hoc');
  globalData.subjects = await res.json();
  populateSubjectDropdowns();
}

function setMonHocType(type) {
  currentMonHocType = type;
  const btnTruong = document.getElementById('btnToggleTruong');
  const btnTuHoc = document.getElementById('btnToggleTuHoc');
  const grpTruong = document.getElementById('groupFieldTruong');
  const grpTuHoc = document.getElementById('groupFieldTuHoc');
  const grpGoal = document.getElementById('groupCheckboxGoal');

  if (type === 'Truong') {
    btnTruong.classList.add('active');
    btnTuHoc.classList.remove('active');
    grpTruong.style.display = 'grid';
    grpTuHoc.style.display = 'none';
    grpGoal.style.display = 'none';
  } else {
    btnTruong.classList.remove('active');
    btnTuHoc.classList.add('active');
    grpTruong.style.display = 'none';
    grpTuHoc.style.display = 'block';
    grpGoal.style.display = 'block';
  }
}

function renderMonHocTable() {
  const tbody = document.getElementById('tblMonHoc');
  if (!tbody) return;

  if (globalData.subjects.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-muted);">Chưa có môn học nào. Hãy bấm "+ Thêm Môn học mới".</td></tr>';
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
      <td>${s.trang_thai === 'Dang_hoc' ? '<span style="color:var(--accent-emerald)">Đang học</span>' : '<span style="color:var(--text-muted)">Đã xong</span>'}</td>
      <td>
        <button class="btn-sm" onclick="softDeleteMonHoc('${s.ma_mon}')">Kết thúc (Xóa)</button>
      </td>
    </tr>
  `).join('');
}

async function submitAddMonHoc() {
  const ma_mon = document.getElementById('inputMonMa').value.trim();
  const ten_mon = document.getElementById('inputMonTen').value.trim();
  const muc_do_uu_tien = document.getElementById('inputMonUuTien').value;
  const tao_muc_tieu = document.getElementById('chkCreateGoal').checked;

  let payload = {
    ma_mon,
    ten_mon,
    loai_mon: currentMonHocType,
    muc_do_uu_tien,
    tao_muc_tieu
  };

  if (currentMonHocType === 'Truong') {
    payload.giang_vien = document.getElementById('inputMonGiangVien').value.trim();
    payload.so_tin_chi = document.getElementById('inputMonTinChi').value;
  } else {
    payload.nguon_hoc = document.getElementById('inputMonNguonHoc').value.trim();
  }

  const res = await fetch('/api/mon_hoc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const json = await res.json();
  if (res.ok) {
    alert('Tạo môn học thành công!');
    closeModal('modalAddMonHoc');
    await fetchSubjects();
    renderMonHocTable();
  } else {
    alert(`Lỗi: ${json.error}`);
  }
}

async function softDeleteMonHoc(ma_mon) {
  if (confirm(`Bạn có chắc chắn muốn kết thúc / xóa môn học ${ma_mon}?`)) {
    const res = await fetch(`/api/mon_hoc/${ma_mon}`, { method: 'DELETE' });
    if (res.ok) {
      alert('Đã kết thúc môn học thành công!');
      await fetchSubjects();
      renderMonHocTable();
    }
  }
}
