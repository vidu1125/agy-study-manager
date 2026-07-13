# UI/UX WIREFRAME & DESIGN SYSTEM
## Hệ thống Quản lý Học tập & Deadline Cá nhân

> Nguyên tắc thiết kế: **rõ ràng hơn đẹp mắt, chữ hơn icon, nhất quán hơn sáng tạo.** Đây là công cụ làm việc hàng ngày, không phải sản phẩm trình diễn — ưu tiên tốc độ đọc và tốc độ nhập liệu.

---

## 1. Nguyên tắc thiết kế tổng quát

1. **Không lạm dụng icon** — chỉ dùng icon ở 3 vị trí cố định: trạng thái deadline (chấm màu, không phải icon hình), nút hành động chính (Lưu/Hủy dùng text), và cảnh báo (dùng màu nền, không dùng icon chuông/còi báo động).
2. **1 ô nhập – 1 ô chọn**: mỗi trường dữ liệu chỉ có 1 loại input tương ứng (text field, dropdown, date picker, number field) — không gộp nhiều lựa chọn vào 1 ô.
3. **Phân cấp thị giác bằng độ đậm chữ và khoảng trắng**, không dùng màu sắc sặc sỡ để phân cấp.
4. **Nhất quán tuyệt đối** giữa các form: nút "Lưu" luôn ở góc phải dưới, nút "Hủy"/"Quay lại" luôn bên trái nút Lưu.

---

## 2. Bảng màu (Color Palette)

Tone màu: **xanh navy trầm + trung tính**, tạo cảm giác tập trung, học thuật, không gây xao nhãng. Màu cảnh báo dùng tiết chế, chỉ đủ để nhận diện chứ không "hét vào mặt" người dùng.

| Vai trò | Mã màu HEX | Áp dụng |
|---|---|---|
| **Nền chính (background)** | `#F7F8FA` | Nền toàn trang |
| **Nền card/form** | `#FFFFFF` | Khối nội dung, form nhập liệu |
| **Màu chủ đạo (primary)** | `#1E3A5F` (navy) | Header, nút hành động chính, link |
| **Màu chủ đạo hover** | `#16293F` | Trạng thái hover của nút primary |
| **Chữ chính** | `#1A1A1A` | Nội dung văn bản |
| **Chữ phụ / label** | `#6B7280` | Nhãn trường, ghi chú phụ |
| **Đường viền (border)** | `#E2E5EA` | Viền input, viền bảng |
| **Trạng thái: Hoàn thành** | `#2F8558` (xanh lá trầm) | Chấm trạng thái + chữ |
| **Trạng thái: Đang làm** | `#B58500` (vàng đất) | Chấm trạng thái + chữ |
| **Trạng thái: Chưa làm** | `#6B7280` (xám) | Chấm trạng thái + chữ |
| **Trạng thái: Trễ hạn (môn trường)** | `#B3261E` (đỏ trầm) | Chấm trạng thái + chữ — dùng cho deadline giảng viên giao |
| **Trạng thái: Trễ hạn (môn tự học)** | `#C98A2C` (vàng cam nhẹ) | **Khác biệt có chủ đích** — nhắc nhẹ, không tạo áp lực tâm lý như đỏ |
| **Ưu tiên: Cao** | `#8A2C2C` (đỏ đất, không chói) | Chip nhãn ưu tiên |
| **Ưu tiên: Trung bình** | `#8A6D2C` | Chip nhãn ưu tiên |
| **Ưu tiên: Thấp** | `#4A5A6A` | Chip nhãn ưu tiên |

**Quy tắc dùng màu:** Không dùng đỏ tươi (`#FF0000` dạng) ở bất kỳ đâu trong hệ thống — kể cả cảnh báo quá tải, chỉ dùng nền vàng nhạt `#FFF4E0` với chữ `#8A6D2C`.

---

## 3. Typography (Font chữ)

| Vai trò | Font | Size | Weight |
|---|---|---|---|
| Font chính (toàn hệ thống) | **Inter** (hoặc "Be Vietnam Pro" nếu ưu tiên hỗ trợ tiếng Việt tốt hơn) | — | — |
| Tiêu đề trang (H1) | Inter / Be Vietnam Pro | 24px | Semi-bold (600) |
| Tiêu đề khối (H2 — tên card/section) | cùng font | 18px | Semi-bold (600) |
| Nhãn trường (label) | cùng font | 13px | Medium (500), màu `#6B7280` |
| Nội dung nhập / giá trị hiển thị | cùng font | 15px | Regular (400) |
| Chữ phụ / ghi chú / timestamp | cùng font | 12px | Regular (400), màu `#9CA3AF` |
| Số liệu nổi bật (Dashboard) | cùng font | 28px | Bold (700) |

**Lý do chọn Inter / Be Vietnam Pro:** cả hai đều là font sans-serif không chân, độ rõ cao ở size nhỏ, hỗ trợ tiếng Việt có dấu đầy đủ và nhất quán — phù hợp app dùng nhiều để đọc bảng số liệu và nhập liệu nhanh.

---

## 4. Quy ước ký hiệu Wireframe (Standardized Legend)

Áp dụng thống nhất cho toàn bộ wireframe bên dưới:

```
┌─────────────┐
│ Label        │   ← Khối input dạng text: viền mảnh, bo góc nhẹ (4px)
└─────────────┘

[ Dropdown ▾ ]      ← Ô chọn (select/dropdown), luôn có ký hiệu ▾ ở cuối

( Date: __/__/__ )  ← Ô chọn ngày (date picker)

●──────○  75%       ← Thanh trượt % hoàn thành

[ Nút Lưu ]          ← Nút hành động chính: nền navy #1E3A5F, chữ trắng
[ Hủy ]              ← Nút phụ: viền navy, nền trắng, chữ navy

● Trạng thái          ← Chấm tròn màu đặc trưng + chữ, KHÔNG dùng icon hình
```

---

## 5. Wireframe chi tiết theo màn hình

### 5.1. Màn hình Dashboard (Trang chủ)

```
┌──────────────────────────────────────────────────────────────┐
│  QUẢN LÝ HỌC TẬP                              [ + Thêm mới ▾ ]│  ← Header, nền navy #1E3A5F, chữ trắng
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐        │
│  │ Deadline tuần  │ │ Streak hiện tại│ │ Giờ học tuần này│      │  ← 3 thẻ số liệu, nền trắng, viền #E2E5EA
│  │      5         │ │    12 ngày    │ │    18.5 giờ    │       │     Số liệu: 28px Bold, label: 13px #6B7280
│  └───────────────┘ └───────────────┘ └───────────────┘        │
│                                                                │
│  DEADLINE SẮP TỚI (7 NGÀY)                                    │  ← H2, 18px Semi-bold
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Môn học      Tên bài tập        Hạn nộp    Ưu tiên  ●   │  │  ← Header bảng, chữ #6B7280, 13px
│  ├────────────────────────────────────────────────────────┤  │
│  │ Giải tích 2  Bài tập chương 5   15/07      Cao      ●   │  │  ← Chấm màu = trạng thái (bên phải)
│  │ Tự học IELTS Làm đề TOEIC #4    16/07      TB       ●   │  │
│  │ ITSS         Lab 12 Cohesion    17/07      Cao      ●   │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                                │
│  CẢNH BÁO MÔN TRỄ NHIỀU TASK                                  │  ← Nền vàng nhạt #FFF4E0, chữ #8A6D2C
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Compiler Theory đang có 3 bài tập trễ hạn                │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                                │
│  TIẾN ĐỘ MỤC TIÊU                                             │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Đạt GPA 3.5           ●──────────○  70%                 │  │
│  │ IELTS 7.0 trước 12/2026 ●────○      45%                 │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

### 5.2. Form "Thêm môn học" (1 ô = 1 trường, có nhánh điều kiện)

```
┌──────────────────────────────────────────────────────────────┐
│  THÊM MÔN HỌC MỚI                                    [ × ]    │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  Loại môn                                                     │
│  [ Trường ▾ ]   [ Tự học ▾ ]     ← Toggle 2 lựa chọn, không   │
│                                     phải dropdown (vì chỉ 2 giá│
│                                     trị, chọn 1 lần thấy ngay) │
│                                                                │
│  Tên môn học                                                  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                                                          │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                                │
│  ── Nếu chọn "Trường" — hiện 2 trường sau ──                  │
│  Giảng viên                          Số tín chỉ               │
│  ┌───────────────────────┐          ┌──────────┐             │
│  │                        │          │          │             │
│  └───────────────────────┘          └──────────┘             │
│                                                                │
│  ── Nếu chọn "Tự học" — hiện trường sau thay thế ──           │
│  Nguồn học                                                    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ VD: Udemy, sách, khóa Duolingo...                       │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                                │
│  Mức độ ưu tiên                                               │
│  [ Cao / Trung bình / Thấp ▾ ]                                │
│                                                                │
│  ☐ Tạo mục tiêu tương ứng cho môn này    ← Checkbox, chỉ hiện │
│                                              khi chọn "Tự học" │
│                                                                │
│                                     [ Hủy ]   [ Lưu môn học ] │
└──────────────────────────────────────────────────────────────┘
```

---

### 5.3. Form "Thêm Deadline" (nhánh Giảng viên giao / Tự đặt)

```
┌──────────────────────────────────────────────────────────────┐
│  THÊM DEADLINE MỚI                                   [ × ]    │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  Môn học                                                      │
│  [ Chọn môn học ▾ ]                                           │
│                                                                │
│  Tên bài tập / nhiệm vụ                                       │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                                                          │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                                │
│  Loại bài                              Mức ưu tiên            │
│  [ Bài tập ▾ ]                         [ Cao ▾ ]              │
│                                                                │
│  Ngày giao                             Hạn nộp                │
│  ( __/__/____ )                        ( __/__/____ )         │
│                                                                │
│  ── Chỉ hiện nếu môn = "Tự học" ──                            │
│  Output mong muốn *bắt buộc*                                  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ VD: Làm xong 3 đề TOEIC, đạt điểm ≥ 80/100              │  │
│  └────────────────────────────────────────────────────────┘  │
│  ⓘ Trường này bắt buộc vì bạn tự đặt deadline này             │
│     (chữ 12px, màu #9CA3AF — không dùng icon cảnh báo)        │
│                                                                │
│  Link tài liệu (tùy chọn)                                     │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                                                          │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                                │
│                                     [ Hủy ]      [ Lưu ]      │
└──────────────────────────────────────────────────────────────┘
```

---

### 5.4. Form "Cập nhật trạng thái" (bao gồm luồng gia hạn)

```
┌──────────────────────────────────────────────────────────────┐
│  CẬP NHẬT: Bài tập chương 5 — Giải tích 2             [ × ]   │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  Trạng thái                                                   │
│  [ Đang làm ▾ ]                                               │
│                                                                │
│  % Hoàn thành                                                 │
│  ●──────────────○──────  60%     ← Thanh trượt, số hiện bên   │
│                                     phải, không cần gõ tay     │
│                                                                │
│  ── Nếu Trạng thái = "Hoàn thành" VÀ deadline Tự đặt ──       │
│  Kết quả đạt được                                             │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                                                          │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                                │
│  Tự đánh giá                                                  │
│  [ Đạt ▾ ]  [ Chưa đạt ▾ ]  [ Cần làm lại ▾ ]                │
│                                                                │
│  ── Nếu chọn "Chưa đạt" — hiện khối gợi ý sau ──              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Bạn có muốn gia hạn deadline này không?                 │  │  ← Nền #F7F8FA, không phải vàng cảnh báo
│  │ Hạn mới: ( __/__/____ )     [ Không, giữ nguyên ] [ Gia hạn ]│
│  └────────────────────────────────────────────────────────┘  │
│                                                                │
│                                     [ Hủy ]      [ Lưu ]      │
└──────────────────────────────────────────────────────────────┘
```

---

### 5.5. Form "Ghi nhận thời gian học thực tế"

```
┌──────────────────────────────────────────────────────────────┐
│  GHI NHẬN THỜI GIAN HỌC                              [ × ]    │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  Nhiệm vụ liên quan                                           │
│  [ Chọn deadline ▾ ]                                          │
│                                                                │
│  Ngày                                  Số giờ đã học          │
│  ( __/__/____ )  mặc định: hôm nay      ┌──────┐             │
│                                          │  1.5  │             │
│                                          └──────┘             │
│                                                                │
│  Mức độ tập trung                                             │
│  [ Tốt ▾ ]   [ Trung bình ▾ ]   [ Bị xao nhãng ▾ ]           │
│                                                                │
│  Ghi chú (tùy chọn)                                           │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                                                          │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                                │
│                                     [ Hủy ]      [ Lưu ]      │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. Quy tắc hiển thị Trạng thái & Ưu tiên (Chip/Badge)

Thay vì icon, dùng **chip chữ có nền màu nhạt + chữ màu đậm cùng tông** — dễ đọc, không gây rối mắt:

```
Trạng thái:
[ Chưa làm ]   nền #F3F4F6   chữ #6B7280
[ Đang làm ]   nền #FFF7E0   chữ #B58500
[ Hoàn thành ] nền #E8F5EC   chữ #2F8558
[ Trễ hạn - Trường ]   nền #FBE9E7   chữ #B3261E
[ Trễ hạn - Tự học ]   nền #FFF4E0   chữ #C98A2C   ← nhẹ hơn có chủ đích

Ưu tiên:
[ Cao ]        nền #F5E6E6   chữ #8A2C2C
[ Trung bình ] nền #F5EFE0   chữ #8A6D2C
[ Thấp ]       nền #EDEFF1   chữ #4A5A6A
```

---

## 7. Responsive / Bố cục theo thiết bị

| Thiết bị | Bố cục |
|---|---|
| Desktop (>1024px) | Sidebar trái cố định (menu điều hướng) + nội dung chính bên phải, form hiện dạng modal overlay |
| Tablet (768–1024px) | Sidebar thu gọn thành icon-only + label khi hover |
| Mobile (<768px) | Menu chuyển thành bottom navigation bar 4 mục: Dashboard / Deadline / Tài liệu / Nhật ký; form nhập liệu hiện full-screen thay vì modal |

---

## 8. Nguyên tắc UX bổ sung

1. **Auto-save nháp**: khi đang điền form dài (VD form deadline tự học có nhiều field), tự lưu nháp mỗi 30 giây để tránh mất dữ liệu khi thoát nhầm.
2. **Không disable nút Lưu khi thiếu dữ liệu** — thay vào đó, khi bấm Lưu mà thiếu trường bắt buộc, viền ô đó chuyển sang màu `#B3261E` kèm dòng chữ nhỏ 12px giải thích, để người dùng luôn biết vì sao chưa lưu được.
3. **Dropdown môn học luôn nhóm theo loại** — hiển thị 2 nhóm tách biệt trong cùng 1 dropdown: "── Môn trường ──" và "── Môn tự học ──", giúp chọn nhanh đúng loại khi tạo deadline.
