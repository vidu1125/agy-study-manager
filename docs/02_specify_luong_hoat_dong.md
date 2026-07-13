# ĐẶC TẢ LUỒNG HOẠT ĐỘNG (WORKFLOW)
## Hệ thống Quản lý Học tập & Deadline Cá nhân

---

## 1. Luồng tổng thể hệ thống (High-level flow)

```mermaid
flowchart TD
    A[Người dùng mở app] --> B{Chọn hành động}
    B -->|Thêm môn học mới| C[Luồng tạo môn học]
    B -->|Thêm deadline| D[Luồng tạo deadline]
    B -->|Cập nhật tiến độ| E[Luồng cập nhật trạng thái]
    B -->|Thêm tài liệu| F[Luồng quản lý tài liệu]
    B -->|Ghi nhận thời gian học| G[Luồng log thời gian]
    B -->|Xem tổng quan| H[Dashboard]

    I[Scheduler nền chạy hàng ngày] --> J[Luồng nhắc nhở tự động]
```

---

## 2. Luồng 1 — Tạo môn học (phân nhánh Trường / Tự học)

```mermaid
flowchart TD
    Start([Bắt đầu]) --> Q1{Môn thuộc trường<br/>hay tự học?}
    Q1 -->|Trường| A1[Nhập: tên môn, mã môn,<br/>giảng viên, số tín chỉ]
    Q1 -->|Tự học| A2[Nhập: tên môn, nguồn học<br/>Ẩn trường giảng viên/tín chỉ]

    A1 --> B1[Chọn mức ưu tiên: Cao/TB/Thấp]
    A2 --> B1

    B1 --> C{Là môn tự học?}
    C -->|Có| D[Gợi ý: Tạo mục tiêu<br/>tương ứng trong MUC_TIEU?]
    C -->|Không| F[Lưu vào MON_HOC]
    D -->|Đồng ý| E[Tạo bản ghi MUC_TIEU liên kết]
    D -->|Bỏ qua| F
    E --> F
    F --> End([Hoàn tất])
```

**Điểm quyết định quan trọng:**
- Nếu chọn "Tự học" → form ẩn ngay các trường giảng viên/tín chỉ, hiện trường "Nguồn học"
- Hệ thống luôn hỏi có muốn gắn mục tiêu lớn hơn không (không bắt buộc)

---

## 3. Luồng 2 — Tạo Deadline (phân nhánh theo nguồn giao)

```mermaid
flowchart TD
    Start([Bắt đầu]) --> A[Chọn môn học từ dropdown]
    A --> B{Môn này là<br/>Trường hay Tự học?}

    B -->|Trường| C1[nguoi_dat_han = Giảng viên<br/>tự động, không cho sửa]
    B -->|Tự học| C2[nguoi_dat_han = Tự đặt<br/>Bắt buộc nhập output_mong_muon]

    C1 --> D[Nhập: tên bài tập, loại bài,<br/>ngày giao, hạn nộp, ưu tiên]
    C2 --> D2[Nhập: tên nhiệm vụ,<br/>output mong muốn *bắt buộc*,<br/>hạn tự đặt, ưu tiên]

    D --> E[Hệ thống tự tính so_ngay_con_lai]
    D2 --> E2[Hệ thống tự tính so_ngay_con_lai<br/>+ tạo bản ghi liên kết OUTPUT_TU_HOC]

    E --> F[Lưu vào DEADLINE]
    E2 --> F2[Lưu vào DEADLINE + OUTPUT_TU_HOC]

    F --> End([Hoàn tất])
    F2 --> End
```

---

## 4. Luồng 3 — Cập nhật trạng thái & Output (bao gồm gia hạn)

```mermaid
flowchart TD
    Start([Bắt đầu]) --> A[Chọn deadline từ danh sách]
    A --> B[Chọn trạng thái mới]
    B --> C{Trạng thái = Hoàn thành?}

    C -->|Không| D[Nhập % hoàn thành]
    D --> Z1[Lưu cập nhật]

    C -->|Có| E{Là deadline tự đặt<br/>Tu_hoc?}
    E -->|Không| Z1
    E -->|Có| F[Nhập kết quả đạt được<br/>vào OUTPUT_TU_HOC]
    F --> G[Tự đánh giá: Đạt / Chưa đạt / Cần làm lại]

    G --> H{Kết quả = Chưa đạt?}
    H -->|Có| I[Gợi ý: Tạo deadline gia hạn?]
    I -->|Đồng ý| J[Tăng so_lan_gia_han<br/>Tạo deadline mới với hạn kéo dài]
    I -->|Từ chối| Z1
    H -->|Không, Đạt| Z1

    J --> Z1
    Z1 --> End([Hoàn tất])
```

**Lưu ý tâm lý:** Khi deadline tự đặt bị "Trễ hạn", hệ thống hiển thị cảnh báo màu **vàng** (nhắc nhẹ), KHÔNG dùng màu đỏ như deadline trường — tránh tạo áp lực/cảm giác thất bại không cần thiết.

---

## 5. Luồng 4 — Ghi nhận thời gian học thực tế

```mermaid
flowchart TD
    Start([Bắt đầu]) --> A[Chọn deadline/nhiệm vụ liên quan]
    A --> B[Nhập ngày mặc định = hôm nay]
    B --> C[Nhập số giờ thực tế đã học]
    C --> D[Chọn mức độ tập trung:<br/>Tốt / TB / Bị xao nhãng]
    D --> E[Nhập ghi chú tùy chọn]
    E --> F[Lưu vào NHAT_KY_THOI_GIAN]
    F --> G[Hệ thống cập nhật streak<br/>nếu là bản ghi đầu tiên trong ngày]
    G --> End([Hoàn tất])
```

---

## 6. Luồng 5 — Scheduler nhắc nhở tự động (chạy nền hàng ngày)

```mermaid
flowchart TD
    Start([Cron job chạy 7h sáng hàng ngày]) --> A[Quét toàn bộ DEADLINE<br/>chưa Hoàn thành]

    A --> B{Ưu tiên Cao?}
    B -->|Có| B1{han_nop - TODAY<br/>= 2 hoặc 1?}
    B -->|Không| B2{han_nop - TODAY<br/>= 1?}

    B1 -->|Đúng| N1[Gửi thông báo nhắc deadline]
    B2 -->|Đúng| N1

    A --> C[Kiểm tra deadline Đang làm<br/>không có log thời gian gần đây]
    C --> C1{Môn Tự học?<br/>ngưỡng = 2 ngày<br/>Môn Trường?<br/>ngưỡng = 2-3 ngày}
    C1 -->|Vượt ngưỡng| N2[Gửi nhắc nhập liệu]

    A --> D[Đếm số deadline<br/>trùng han_nop trong ngày]
    D --> D1{Số lượng ≥ 3?}
    D1 -->|Có| N3[Gửi cảnh báo quá tải]

    A --> E{Hôm nay là Chủ nhật?}
    E -->|Có| N4[Gửi báo cáo tuần]

    N1 --> End([Kết thúc chu kỳ quét])
    N2 --> End
    N3 --> End
    N4 --> End
```

---

## 7. Luồng 6 — Xem Dashboard

```mermaid
flowchart TD
    Start([Người dùng vào trang chủ]) --> A[Query: deadline trong 7 ngày tới<br/>sắp xếp theo ưu tiên + hạn nộp]
    A --> B[Query: tiến độ MUC_TIEU theo môn]
    B --> C[Query: môn có số task trễ nhiều nhất]
    C --> D[Query: streak hiện tại]
    D --> E[Render: bảng deadline sắp tới<br/>+ biểu đồ tiến độ<br/>+ cảnh báo môn trễ<br/>+ số ngày streak]
    E --> End([Hiển thị Dashboard])
```

---

## 8. Bảng tổng hợp Trigger — Điều kiện — Hành động (cho Scheduler)

| Trigger | Điều kiện | Hành động | Tần suất |
|---|---|---|---|
| Nhắc deadline ưu tiên Cao | `han_nop - TODAY() ∈ {1,2}` và chưa hoàn thành | Gửi thông báo | Hàng ngày |
| Nhắc deadline ưu tiên TB/Thấp | `han_nop - TODAY() = 1` và chưa hoàn thành | Gửi thông báo | Hàng ngày |
| Nhắc nhập liệu (môn trường) | Không có log 2–3 ngày, trạng thái "Đang làm" | Gửi nhắc nhở | Hàng ngày |
| Nhắc nhập liệu (môn tự học) | Không có log 2 ngày | Gửi nhắc nhở (tần suất dày hơn) | Hàng ngày |
| Cảnh báo quá tải | ≥ 3 deadline cùng `han_nop`, chưa hoàn thành | Cảnh báo sớm | Hàng ngày |
| Báo cáo tuần | Ngày = Chủ nhật | Tổng kết tuần | Hàng tuần |
| Nhắc ôn tập (spaced repetition) | Tài liệu đã thêm 1/3/7 ngày | Gợi ý ôn lại | Hàng ngày |
