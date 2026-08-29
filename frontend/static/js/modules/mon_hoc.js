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

function normaliseSubjectSearch(value) {
  return String(value || '')
    .toLocaleLowerCase('vi')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

function getMonHocSearchMatches() {
  const query = normaliseSubjectSearch(document.getElementById('subjectSearch')?.value);
  const subjects = Array.isArray(globalData.subjects) ? globalData.subjects : [];
  if (!query) return { query, subjects, matches: subjects };

  const matches = subjects.filter(subject => normaliseSubjectSearch([
    subject.ma_mon,
    subject.ten_mon,
    subject.loai_mon === 'Truong' ? 'trường truong' : 'tự học tu hoc',
    subject.giang_vien,
    subject.nguon_hoc,
    subject.muc_do_uu_tien,
    subject.trang_thai,
  ].join(' ')).includes(query));
  return { query, subjects, matches };
}

function updateMonHocSearchCount(query, matches, total) {
  const count = document.getElementById('subjectSearchCount');
  if (!count) return;
  count.textContent = query ? matches.length + '/' + total + ' kết quả' : total + ' môn';
}

function filterMonHocTable() {
  renderMonHocTable();
}

function clearMonHocSearch() {
  const input = document.getElementById('subjectSearch');
  if (!input) return;
  input.value = '';
  renderMonHocTable();
  input.focus();
}

function renderMonHocTable() {
  const tbody = document.getElementById('tblMonHoc');
  if (!tbody) return;
  const { query, subjects, matches } = getMonHocSearchMatches();
  updateMonHocSearchCount(query, matches, subjects.length);

  if (matches.length === 0) {
    const message = query
      ? 'Không tìm thấy môn học phù hợp. Hãy thử mã môn, tên môn hoặc tên giảng viên.'
      : 'Chưa có môn học nào. Hãy bấm "+ Thêm Môn học mới".';
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-muted);">' + message + '</td></tr>';
    return;
  }

  tbody.innerHTML = matches.map(s => `
    <tr>
      <td><code>${s.ma_mon}</code></td>
      <td><strong>${s.ten_mon}</strong></td>
      <td><span class="chip ${s.loai_mon === 'Truong' ? 'chip-priority-low' : 'chip-priority-med'}">${s.loai_mon === 'Truong' ? 'Trường' : 'Tự học'}</span></td>
      <td>${s.loai_mon === 'Truong' ? (s.giang_vien || 'N/A') : (s.nguon_hoc || 'N/A')}</td>
      <td>${s.so_tin_chi ? `${s.so_tin_chi} tín` : '-'}</td>
      <td>${renderPriorityChip(s.muc_do_uu_tien)}</td>
      <td>${s.trang_thai === 'Dang_hoc' ? '<span style="color:var(--accent-emerald)">Đang học</span>' : '<span style="color:var(--text-muted)">Đã xong</span>'}</td>
      <td>
        <div class="subject-actions">
          <button class="btn-sm" onclick="openEditMonHoc('${s.ma_mon}')">Sửa</button>
          <button class="btn-sm" onclick="softDeleteMonHoc('${s.ma_mon}')">Kết thúc</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openEditMonHoc(ma_mon) {
  const subject = globalData.subjects.find(item => item.ma_mon === ma_mon);
  if (!subject) {
    alert('Không tìm thấy môn học cần sửa. Hãy tải lại trang và thử lại.');
    return;
  }

  document.getElementById('hdnEditMonHocMa').value = subject.ma_mon;
  document.getElementById('inputEditMonMa').value = subject.ma_mon;
  document.getElementById('inputEditMonLoai').value = subject.loai_mon === 'Truong' ? 'Môn trường' : 'Môn tự học';
  document.getElementById('inputEditMonTen').value = subject.ten_mon || '';
  document.getElementById('inputEditMonUuTien').value = subject.muc_do_uu_tien || 'Trung_binh';
  document.getElementById('inputEditMonTrangThai').value = subject.trang_thai || 'Dang_hoc';

  const isSchoolSubject = subject.loai_mon === 'Truong';
  document.getElementById('groupEditMonTruong').style.display = isSchoolSubject ? 'grid' : 'none';
  document.getElementById('groupEditMonTuHoc').style.display = isSchoolSubject ? 'none' : 'block';
  document.getElementById('inputEditMonGiangVien').value = subject.giang_vien || '';
  document.getElementById('inputEditMonTinChi').value = subject.so_tin_chi || '';
  document.getElementById('inputEditMonNguonHoc').value = subject.nguon_hoc || '';

  openModal('modalEditMonHoc');
}

async function submitEditMonHoc() {
  const ma_mon = document.getElementById('hdnEditMonHocMa').value;
  const subject = globalData.subjects.find(item => item.ma_mon === ma_mon);
  if (!subject) return;

  const payload = {
    ten_mon: document.getElementById('inputEditMonTen').value.trim(),
    muc_do_uu_tien: document.getElementById('inputEditMonUuTien').value,
    trang_thai: document.getElementById('inputEditMonTrangThai').value,
  };

  if (subject.loai_mon === 'Truong') {
    payload.giang_vien = document.getElementById('inputEditMonGiangVien').value.trim();
    payload.so_tin_chi = document.getElementById('inputEditMonTinChi').value;
  } else {
    payload.nguon_hoc = document.getElementById('inputEditMonNguonHoc').value.trim();
  }

  const res = await fetch(`/api/mon_hoc/${encodeURIComponent(ma_mon)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) {
    alert(`Lỗi: ${json.error || 'Không thể cập nhật môn học.'}`);
    return;
  }

  alert('Cập nhật môn học thành công!');
  closeModal('modalEditMonHoc');
  await fetchSubjects();
  renderMonHocTable();
  if (document.getElementById('tab-lichhoc')?.style.display !== 'none') renderCalendarView();
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
