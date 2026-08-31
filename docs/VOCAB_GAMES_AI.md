# Hành trình ôn từ vựng 5 chặng

Mỗi lần bấm nút play của một deck, web tạo một phiên ôn gồm:

1. Lật thẻ để nhắc lại nhanh.
2. **Word Rush**: trả lời có timer 12 giây.
3. **Matching Pairs**: ghép từ với nghĩa.
4. **Fill in the blank**: chỉ dùng thẻ mature (review, interval từ 21 ngày).
5. **Multiple choice**: ưu tiên thẻ mới, learning và relearning.

## Bảo toàn lịch Spaced Repetition

Game chụp lại hàng đợi thẻ đến hạn tại thời điểm bắt đầu. Các chặng chỉ lưu tín hiệu
đúng/sai/thời gian. Khi kết thúc, mỗi thẻ nhận một rating duy nhất:

- Có sai hoặc dùng gợi ý: Again
- Đúng nhưng chậm: Hard
- Đúng: Good

Vì vậy một thẻ xuất hiện ở nhiều chặng không bị cộng dồn nhiều lần vào SRS. Không có
rating Easy tự động từ game.

## Cấu hình AI cho Fill in the blank

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

Thứ tự fallback là GROQ_API_KEY_1 đến GROQ_API_KEY_5, sau đó OpenAI, cuối cùng là
câu ví dụ có sẵn/câu dự phòng cục bộ. Vì vậy web không bị ngừng hoạt động nếu chưa thêm
key hay provider đang lỗi.

## Dữ liệu gửi tới provider

Để tạo câu điền từ, backend chỉ gửi dữ liệu của thẻ mature:

- word
- meaning
- tags
- example

Không gửi database URL, API key, lịch sử điểm, danh tính người học, môn học hay các tài
liệu đã tải lên. Key không được ghi vào log hoặc trả về browser.

## Triển khai Railway

1. Vào service Railway → **Variables**.
2. Thêm các key muốn dùng; không cần thêm đủ năm key.
3. Nhấn **Deploy** hoặc push commit lên nhánh production nếu đã bật Auto Deploy.
4. Mở một deck có thẻ review và interval từ 21 ngày để thấy chặng Fill in the blank.

Không có key AI vẫn deploy bình thường. Chặng Fill in the blank hiện câu local fallback,
giúp luồng ôn tập không bị gián đoạn.

## Lưu ý chất lượng câu

AI được yêu cầu tạo một câu tiếng Anh tự nhiên theo hướng IELTS hoặc giao tiếp hằng ngày,
không tạo đoạn hội thoại. Hệ thống kiểm tra câu phải có đúng chỗ trống _____ trước khi
đưa về giao diện. Nếu phản hồi không hợp lệ, hệ thống tự chuyển provider/fallback.
