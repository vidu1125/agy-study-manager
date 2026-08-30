/* ==========================================================================
   MODULE: TÀI LIỆU HỌC TẬP (UC09, UC10)
   Handles materials management and Spaced Repetition hint calculation.
   ========================================================================== */

async function fetchMaterials() {
  const res = await fetch('/api/tai_lieu');
  globalData.materials = await res.json();
}

function normaliseMaterialSearch(value) {
  return String(value || '')
    .toLocaleLowerCase('vi')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

function getTaiLieuSearchMatches() {
  const query = normaliseMaterialSearch(document.getElementById('materialSearch')?.value);
  const materials = Array.isArray(globalData.materials) ? globalData.materials : [];
  if (!query) return { query, materials, matches: materials };

  const matches = materials.filter(material => normaliseMaterialSearch([
    material.ma_tai_lieu,
    material.ten_mon,
    material.ten_tai_lieu,
    material.loai_tai_lieu,
    material.link,
  ].join(' ')).includes(query));
  return { query, materials, matches };
}

function updateTaiLieuSearchCount(query, matches, total) {
  const count = document.getElementById('materialSearchCount');
  if (!count) return;
  count.textContent = query ? matches.length + '/' + total + ' kết quả' : total + ' tài liệu';
}

function filterTaiLieuTable() {
  renderTaiLieuTable();
}

function clearTaiLieuSearch() {
  const input = document.getElementById('materialSearch');
  if (!input) return;
  input.value = '';
  renderTaiLieuTable();
  input.focus();
}

function renderTaiLieuTable() {
  const tbody = document.getElementById('tblTaiLieu');
  if (!tbody) return;
  const { query, materials, matches } = getTaiLieuSearchMatches();
  updateTaiLieuSearchCount(query, matches, materials.length);

  if (matches.length === 0) {
    const message = query
      ? 'Không tìm thấy tài liệu phù hợp. Hãy thử tên tài liệu, tên môn hoặc loại tài liệu.'
      : 'Chưa có tài liệu học tập nào. Hãy bấm "+ Thêm Tài liệu mới".';
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">' + message + '</td></tr>';
    return;
  }

  tbody.innerHTML = matches.map(m => `
    <tr>
      <td class="material-id-cell"><code>${escapeMaterialHtml(m.ma_tai_lieu)}</code></td>
      <td><strong>${escapeMaterialHtml(m.ten_mon || 'Tài liệu chung')}</strong></td>
      <td>${escapeMaterialHtml(m.ten_tai_lieu)}</td>
      <td><span class="chip chip-priority-low">${escapeMaterialHtml(m.loai_tai_lieu)}</span></td>
      <td>${materialAccessLink(m.link)}</td>
      <td>${formatDate(m.ngay_them)}</td>
      <td>
        <button class="btn-sm" onclick="deleteTaiLieu('${m.ma_tai_lieu}')">Xóa</button>
      </td>
    </tr>
  `).join('');
}

function escapeMaterialHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

function materialAccessLink(link) {
  if (!link) return 'Chưa đính kèm';
  const isAppUpload = link.startsWith('/uploads/');
  const isExternalLink = /^https?:\/\//i.test(link);
  if (!isAppUpload && !isExternalLink) return 'Không khả dụng';
  return `<a href="${escapeMaterialHtml(link)}" target="_blank" rel="noopener noreferrer" style="color:var(--primary-cyan); text-decoration:underline;">${isAppUpload ? 'Mở tệp' : 'Mở link'} [&gt;]</a>`;
}

function toggleTaiLieuSource() {
  const source = document.getElementById('selectTaiLieuSource')?.value;
  const linkGroup = document.getElementById('groupTaiLieuLink');
  const fileGroup = document.getElementById('groupTaiLieuFile');
  if (linkGroup) linkGroup.style.display = source === 'link' ? 'block' : 'none';
  if (fileGroup) fileGroup.style.display = source === 'file' ? 'block' : 'none';
}

async function submitAddTaiLieu() {
  const ma_mon = document.getElementById('selectTaiLieuMonHoc').value;
  const ten_tai_lieu = document.getElementById('inputTaiLieuTen').value.trim();
  const loai_tai_lieu = document.getElementById('selectTaiLieuLoai').value;
  const source = document.getElementById('selectTaiLieuSource').value;
  const link = document.getElementById('inputTaiLieuLink').value.trim();
  const file = document.getElementById('inputTaiLieuFile').files[0];

  if (!ten_tai_lieu) {
    alert('Vui lòng nhập tên tài liệu.');
    return;
  }
  if (source === 'link' && !link) {
    alert('Vui lòng nhập link tài liệu hoặc chọn “Chỉ lưu thông tin”.');
    return;
  }
  if (source === 'file' && !file) {
    alert('Vui lòng chọn tệp hoặc chọn “Chỉ lưu thông tin”.');
    return;
  }

  const formData = new FormData();
  formData.append('ma_mon', ma_mon);
  formData.append('ten_tai_lieu', ten_tai_lieu);
  formData.append('loai_tai_lieu', loai_tai_lieu);
  if (source === 'link') formData.append('link', link);
  if (source === 'file') formData.append('file', file);

  const res = await fetch('/api/tai_lieu', {
    method: 'POST',
    body: formData
  });

  if (res.ok) {
    alert('Thêm tài liệu học tập thành công!');
    document.getElementById('selectTaiLieuMonHoc').value = '';
    document.getElementById('inputTaiLieuTen').value = '';
    document.getElementById('selectTaiLieuLoai').value = 'Tu_dong';
    document.getElementById('selectTaiLieuSource').value = 'none';
    document.getElementById('inputTaiLieuLink').value = '';
    document.getElementById('inputTaiLieuFile').value = '';
    toggleTaiLieuSource();
    closeModal('modalAddTaiLieu');
    await fetchMaterials();
    renderTaiLieuTable();
  } else {
    const error = await res.json().catch(() => ({}));
    alert(`Lỗi: ${error.error || 'Không thể lưu tài liệu.'}`);
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
