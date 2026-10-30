# Kanban Zen Studio 1.16.0-preview.1

Ngày bàn giao: 30/10/2026 (Việt Nam).

Đây là bản Preview để cài thử, chưa phải bản phát hành Production đã đạt mọi tiêu chí trong đặc tả. Không thay đổi D1, R2 hay triển khai website Production.

## Nguồn và kiến trúc

Dựa trên mã nguồn đính kèm v1.15.22. GitHub main đã kiểm tra ở commit `6783af2372398aac313b863c365c4ab735235d56`; package.json ở commit đó ghi v1.15.21. Nhánh bàn giao: `offline-first-native-preview`.

Giữ giao diện, logic nghiệp vụ và API hiện có. Windows dùng Electron + NSIS; Android dùng WebView Android chuẩn với tài nguyên đóng gói trong APK. Cả hai phục vụ giao diện đã cài tại origin HTTPS của dự án và chỉ gửi `/api/` qua mạng. Không tắt TLS, không nhúng khóa Cloudflare/Resend hoặc token GitHub. Electron tắt Node trong renderer, bật sandbox và context isolation. Android chỉ có bridge xuất tài liệu giới hạn 25 MB, luôn cần chọn nơi lưu bằng hộp thoại hệ thống.

Đã cân nhắc Tauri 2 và Capacitor: Tauri nhẹ hơn nhưng cần Rust/WebView2 và thay đổi cầu nối mạng; Capacitor có hệ plugin tốt nhưng cần điều chỉnh origin/cookie với backend SameSite=Strict. Preview dùng IndexedDB của Electron/WebView để tận dụng adapter và migration đã có; chưa thêm SQLite. Không hứa bảo đảm như kho SQLite chống mọi trường hợp thiết bị hết dung lượng hoặc hệ điều hành xóa dữ liệu ứng dụng.

## Những phần đã triển khai

- Lưu workspace trước vào IndexedDB và chỉ báo đã lưu khi transaction hoàn tất.
- Giữ dirty state, baseline và revision qua lần mở lại; tự gửi khi có mạng, đang mở ứng dụng, focus/resume và theo chu kỳ.
- Retry lỗi workspace theo backoff tăng dần, tối đa 60 giây.
- CAS phía máy chủ giữ nguyên; không dùng đồng hồ thiết bị để quyết định ghi đè.
- Three-way merge theo trường và ID; thay đổi độc lập được giữ, xung đột sửa/sửa, xóa/sửa và đổi thứ tự có lựa chọn cụ thể.
- Hộp thoại tự xuất hiện khi phát hiện xung đột và không có trình soạn thảo đang mở. Khi đang mở form, đợi đóng form. Có thể mở lại qua Settings → Đồng bộ ngay.
- Trước khi áp dụng lựa chọn xung đột, lưu bản local và remote; nếu người dùng chỉnh sửa trong khi đối chiếu, từ chối áp dụng bản đã cũ. CAS tiếp tục kiểm tra khi gửi lên.
- Hàng đợi tệp lưu Blob trong IndexedDB, giới hạn 25 MB/tệp và 250 MB trên thiết bị. SHA-256 kiểm tra bản cục bộ, chống thêm trùng đồng thời trong cùng tài khoản/phạm vi. Upload giữ ID máy chủ qua lỗi mạng; kiểm tra tệp đã complete trước khi thử lại. Slot đã hết hạn có thể bắt đầu lại.
- Settings → Làm việc ngoại tuyến → Tệp trên thiết bị: xem hàng đợi, mở bản đã lưu. Khi offline, nút tải tài nguyên chuyển sang lưu trên thiết bị.
- Trong danh sách tệp có hỗ trợ, nút Lưu trên thiết bị cho phép chọn tải riêng từng tệp cloud; không tải toàn bộ R2. Tệp đã tải gần đây không tự cache trong Preview.
- Mật khẩu mở khóa offline riêng, PBKDF2-SHA256 310.000 vòng và salt ngẫu nhiên; giới hạn thử sai tăng dần. Không dùng mật khẩu này để xác thực API máy chủ. Tự khóa cục bộ sau 10 phút không hoạt động.
- IndexedDB và tệp cục bộ chưa mã hóa toàn bộ. Dùng mật khẩu/mã hóa ổ đĩa và khóa màn hình của hệ điều hành.

## Cài và bắt đầu

1. Windows 10/11 64-bit: chạy tệp Setup.exe, chọn thư mục, mở từ Start Menu/Desktop. Bộ cài Preview chưa có chứng thư ký Windows; hệ điều hành có thể báo chưa xác định nhà phát hành.
2. Android 8 trở lên: tải APK, cho phép ứng dụng đang dùng tải file được cài ứng dụng từ nguồn này khi Android hỏi, rồi cài. Bản APK đã ký bằng khóa dự án cố định. Điện thoại/tablet dùng chung APK, không khóa chiều màn hình.
3. Lần đầu cần Internet để đăng nhập và tải workspace. Dữ liệu trình duyệt web không tự chuyển vào kho riêng của ứng dụng; ứng dụng nhận dữ liệu đã đồng bộ từ cùng tài khoản.
4. Mở Settings → Làm việc ngoại tuyến → Đặt mật khẩu mở khóa offline trước khi mất mạng.
5. Thử với workspace thử nghiệm, tắt mạng, tạo/chỉnh task, đóng/mở ứng dụng, mở khóa offline. Khi có mạng, mở ứng dụng để hệ thống tự đồng bộ. Phiên máy chủ hết hạn cần đăng nhập lại để gửi dữ liệu; bản nháp vẫn còn trên thiết bị.
6. Khi có xung đột, đọc từng giá trị rồi chọn bản ưu tiên. Ưu tiên chỉ áp dụng trường xung đột; không thay toàn bộ workspace.

Không gỡ ứng dụng hoặc Xóa dữ liệu ứng dụng Android để nâng cấp. Cài bản mới lên bản cũ, cùng applicationId và cùng khóa ký Android. Đổi khóa ký sẽ khiến Android từ chối nâng cấp.

## Build và CI

Node 24. `npm ci`, `npm run build`, `npm test`, `npm run test:offline`.

Windows: `npm run build:windows -- --publish never`. NSIS script riêng tạo bộ cài và trình gỡ, giữ dữ liệu người dùng. Cài per-user, không cần Microsoft Store. Chưa kiểm thử cài/nâng cấp/gỡ trên Windows thật.

Android: JDK 17, Gradle 8.11.1, Android SDK platform 35 và build-tools 35.0.0. Chạy `gradle --no-daemon -p native/android assembleRelease` với các biến:

- `ZEN_ANDROID_KEYSTORE`: đường dẫn tuyệt đối keystore riêng.
- `ZEN_ANDROID_STORE_PASSWORD`.
- `ZEN_ANDROID_KEY_ALIAS`: `zen-release`.
- `ZEN_ANDROID_KEY_PASSWORD`.

Khóa ký được bàn giao riêng, không nằm trong source hoặc GitHub. Giữ bản sao ở nơi riêng tư và sao lưu bằng password manager. Không đưa tệp keystore, credentials hoặc bản backup lên repo/public release.

Workflow `.github/workflows/native-preview.yml` tạo artifacts Windows và APK sau khi kiểm thử source. Android yêu cầu thiết lập secrets khóa ký cố định; nếu thiếu khóa, workflow chỉ biên dịch artifact unsigned để kiểm tra, không tạo APK cài đặt đã ký. Build không tự phát hành public và không triển khai Worker.

## Cập nhật phần mềm: trạng thái thực tế

Windows có electron-updater để kiểm tra/tải từ GitHub Releases khi ứng dụng đóng gói; chỉ cài sau nút xác nhận khởi động lại. Tuy nhiên repo hiện riêng tư và chưa có kênh tải bản cập nhật công khai. Không nhúng token GitHub vào ứng dụng. Vì vậy tự cập nhật chưa được vận hành hoặc kiểm thử. Với bộ cài NSIS tùy chỉnh, cần kiểm thử tương thích updater trước khi kích hoạt kênh phát hành.

Android Preview chưa có trình tự phát hiện/tải/cài APK cập nhật. Cần tải APK mới và xác nhận cài nâng cấp. Hệ điều hành Android luôn cần xác nhận cài đặt theo quyền áp dụng.

Đồng bộ dữ liệu tự động và cập nhật phần mềm là hai cơ chế riêng. Không coi cấu hình build/updater là đã phát hành kênh cập nhật.

## Kiểm thử và giới hạn

Đã chạy toàn bộ `npm test` trên Node 24, gồm API/auth, CAS, account isolation, resources/R2 mock, báo cáo và các kiểm thử source hiện có. Đã chạy `npm run test:offline` với merge và IndexedDB giả lập: 100 bản ghi, baseline/dirty/revision, chỉnh độc lập/cùng trường, xóa/sửa, đổi thứ tự, tệp nhị phân, hash hỏng, chống trùng đồng thời và cô lập tài khoản.

Đã tạo APK ký release và kiểm tra chữ ký APK Signature Scheme v2 bằng apksigner; đối chiếu các module offline, account và persistence trong APK khớp mã nguồn. Bộ cài Windows được build bởi NSIS; đây không phải xác nhận đã cài/chạy trên máy Windows.

Kiểm thử trình duyệt E2E đã viết trong `tests/offline-native-browser.mjs`, nhưng Chromium không khởi chạy được trong môi trường kiểm thử trước vì socket bị hạn chế. Chưa đạt E2E và chưa thể công nhận kiểm thử 100 task qua khởi động lại thiết bị thật.

Chưa kiểm thử thực trên Windows/Android: cài, mở UI, chạm/kéo, mất mạng giữa upload, hai thiết bị kết nối đồng thời, kill tiến trình, reboot, nâng cấp giữ dữ liệu, quota thật R2 và lỗi Cloudflare thật. Các unit/integration tests không thay thế các kiểm tra này.

Xung đột hiện phân biệt “thiết bị này” và “bản máy chủ”; chưa có registry tên thiết bị và lịch sử thay đổi theo từng máy. Bản máy chủ có thể gồm thay đổi của nhiều thiết bị. Không gán nhầm tên Laptop/Android khi backend chưa cung cấp thông tin.

Các tệp offline nằm trong quản lý riêng; nội dung ghi chú có liên kết cloud không tự đổi toàn bộ sang URL offline. Preview chưa cung cấp mức hỗ trợ tệp offline đầy đủ trong mọi màn hình. Không có cam kết đồng bộ nền khi Android đóng ứng dụng.

## Khôi phục

Trước khi thử bản Preview, xuất JSON từ web và giữ bản sao. Bản nháp cục bộ vẫn nằm trong tài khoản riêng của ứng dụng. Khi gặp lỗi đồng bộ, xuất JSON trước khi gỡ/xóa dữ liệu hoặc đổi thiết bị. Các bản xung đột trong IndexedDB chỉ là hỗ trợ khôi phục kỹ thuật, chưa có màn hình lịch sử phục hồi đầy đủ.

Chưa có migration D1 hoặc thay đổi schema máy chủ trong đợt này, nên không có bước sửa/xóa dữ liệu Production. Có thể tiếp tục dùng website Production trong khi thử ứng dụng.
