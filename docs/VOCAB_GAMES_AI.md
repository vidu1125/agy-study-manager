# Hành trình ôn từ vựng 5 chặng

Mỗi lần bấm nút play của một deck, web tạo một phiên ôn gồm:

1. Lật thẻ để nhắc lại nhanh.
2. **Word Rush**: hiện nghĩa tiếng Việt, nhập từ hoặc cụm từ tiếng Anh trong 12 giây.
3. **Matching Pairs**: ghép từ với nghĩa.
4. **Fill in the blank**: dùng tối đa 25 thẻ đến hạn của phiên học, không yêu cầu interval tối thiểu.
5. **Multiple choice**: ưu tiên thẻ mới, learning và relearning.

## Bảo toàn lịch Spaced Repetition

Game chụp lại hàng đợi thẻ đến hạn tại thời điểm bắt đầu. Các chặng chỉ lưu tín hiệu
đúng/sai/thời gian. Khi kết thúc, mỗi thẻ nhận một rating duy nhất:

- Có sai hoặc dùng gợi ý: Again
- Đúng nhưng chậm: Hard
- Đúng: Good

Vì vậy một thẻ xuất hiện ở nhiều chặng không bị cộng dồn nhiều lần vào SRS. Không có
rating Easy tự động từ game.

## Cấu hình AI cho Fill in the blank và Word Rush

Tạo các biến trong môi trường Railway hoặc file .env local. Không commit file .env.

    # Có thể khai báo từ 1 đến 5 key Groq. Key sau chỉ dùng khi key trước lỗi/quá quota.
    GROQ_API_KEY_1=gsk_...
    GROQ_API_KEY_2=gsk_...
    GROQ_API_KEY_3=gsk_...
    GROQ_API_KEY_4=gsk_...
    GROQ_API_KEY_5=gsk_...

    # Tùy chọn: một key Groq cũ hoặc danh sách key phân tách bằng dấu phẩy.
    # GROQ_API_KEY=gsk_...
    # GROQ_API_KEYS=gsk_...,gsk_...
    GROQ_VOCAB_MODEL=llama-3.3-70b-versatile

    # Fallback cuối cùng sau Groq.
    OPENAI_API_KEY=sk-...
    OPENAI_VOCAB_MODEL=gpt-4o-mini

Với **Fill in the blank**, thứ tự fallback là GROQ_API_KEY_1 đến GROQ_API_KEY_5, sau đó OpenAI, cuối cùng là câu ví dụ có sẵn/câu dự phòng cục bộ. Vì vậy chặng này không bị ngừng hoạt động nếu chưa thêm key hay provider đang lỗi. Word Rush dùng cùng chuỗi provider nhưng không chuyển sang chấm cục bộ cho câu trả lời không trống, để tránh chấm oan.

Mọi câu trả lời Word Rush không để trống đều được gửi đến LLM để đối chiếu nghĩa, chính tả và dạng từ. Backend giữ một lớp bảo vệ: đáp án khớp sau khi chuẩn hóa (không phân biệt hoa/thường, khoảng trắng hoặc dấu gạch nối) luôn nhận `exact` và 25 điểm, kể cả khi LLM trả về kết quả không nhất quán.

Word Rush dành tối đa 5 giây cho toàn bộ chuỗi provider. Đặt `WORD_RUSH_LLM_BUDGET_SECONDS` trong khoảng 1–10 nếu cần đổi giới hạn này. Nếu tất cả provider không phản hồi, lượt đó **không bị tính sai, không trừ điểm và không cập nhật SRS**; người học chỉ cần bấm **Chấm lại**.

## Dữ liệu gửi tới provider

Để tạo câu điền từ, backend chỉ gửi dữ liệu của tối đa 25 thẻ đến hạn trong phiên:

- word
- meaning
- tags
- example


Khi chấm Word Rush, backend chỉ gửi riêng cho provider:

- prompt đang hiển thị
- đáp án chuẩn
- câu trả lời người học nhập

Không gửi database URL, API key, lịch sử điểm, danh tính người học, môn học hay các tài
liệu đã tải lên. Key không được ghi vào log hoặc trả về browser.

Câu Fill in the blank chỉ được tạo khi người học mở chặng 4; việc bắt đầu hoặc chơi riêng
Word Rush không cần chờ provider AI.

## Triển khai Railway

1. Vào service Railway → **Variables**.
2. Thêm các key muốn dùng; không cần thêm đủ năm key.
3. Nhấn **Deploy** hoặc push commit lên nhánh production nếu đã bật Auto Deploy.
4. Mở một deck có ít nhất một thẻ đến hạn để thấy chặng Fill in the blank.

Không có key AI vẫn deploy bình thường. Chặng Fill in the blank hiện câu local fallback,
giúp luồng ôn tập không bị gián đoạn. Riêng Word Rush cần ít nhất một `GROQ_API_KEY_*` hoặc `OPENAI_API_KEY` để chấm đáp án không trống; chưa có key thì web hiển thị nút **Chấm lại** và không ghi một lượt ôn không công bằng.

## Lưu ý chất lượng câu

AI được yêu cầu tạo một câu tiếng Anh tự nhiên theo hướng IELTS hoặc giao tiếp hằng ngày,
không tạo đoạn hội thoại. Hệ thống kiểm tra câu phải có đúng chỗ trống _____ trước khi
đưa về giao diện. Nếu phản hồi không hợp lệ, hệ thống tự chuyển provider/fallback.
