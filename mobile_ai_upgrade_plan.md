# 🚀 HCMRainVision - Kế Hoạch Nâng Cấp (Mobile & AI)

Tài liệu này dành riêng cho team mới để chạy thử dự án Mobile dưới dạng Local và nắm bắt kế hoạch nâng cấp AI.

---

## 📱 1. Hướng Dẫn Chạy Mobile & Backend Trên Local

Vì app hướng tới người dùng Mobile, team sẽ chỉ tập trung vào Backend và thư mục Mobile (`HCM-City-Rain-Map---Mua-Sai-Gon-main`).

### Bước 1: Setup Backend (.NET 9 & PostgreSQL)
*Yêu cầu hệ thống: Windows/macOS, đã cài đặt PostgreSQL 17 (kèm extension PostGIS) và .NET 9.0 SDK.*

1. **Cài đặt công cụ EF Core (nếu chưa có):**
   Mở terminal và chạy lệnh để cài đặt Entity Framework Core tools toàn cục:
   ```powershell
   dotnet tool install --global dotnet-ef
   ```
2. **Khởi tạo Database:**
   - Mở pgAdmin hoặc psql, tạo một database mới: `CREATE DATABASE hcmc_rain_vision_dev;`
   - Bật extension không gian: `CREATE EXTENSION IF NOT EXISTS postgis;`
3. **Cấu hình biến môi trường Local (`appsettings.Local.json`):**
   - Copy file `appsettings.Local.json.example` thành `appsettings.Local.json`.
   - Điền password của PostgreSQL vào chuỗi kết nối `DefaultConnection`.
   - **(QUAN TRỌNG)** Để Push Notification hoạt động, bạn phải vào Firebase Console tạo 1 Project, tải file Service Account Key `.json` về máy, và khai báo đường dẫn tuyệt đối vào:
     ```json
     "FirebaseSettings": {
       "ServiceAccountPath": "C:\\du_ong_dan_toi\\firebase-adminsdk.json"
     }
     ```
4. **Chạy Migration & Khởi động Server:**
   Tại thư mục `HcmcRainVision.Backend`:
   ```powershell
   dotnet restore
   dotnet ef database update
   dotnet run
   ```
   *Lưu ý: API sẽ tự động lắng nghe ở địa chỉ `http://0.0.0.0:5057` để các thiết bị trong mạng LAN có thể gọi được.*

### Bước 2: Setup Mobile App (React Native + Expo)
*Yêu cầu hệ thống: Đã cài đặt Node.js (khuyến nghị v18 hoặc v20).*

1. **Tìm IP mạng LAN của máy chủ Backend:**
   - Trên Windows: Mở CMD gõ `ipconfig` -> Tìm dòng `IPv4 Address` (Ví dụ: `192.168.1.15`).
   - Trên macOS: Mở Terminal gõ `ifconfig` hoặc `ipconfig getifaddr en0`.
2. **Cấu hình kết nối API:**
   - Tại thư mục Mobile (`HCM-City-Rain-Map---Mua-Sai-Gon-main`), tạo file `.env`.
   - Nhập nội dung sau (thay IP bằng IP của bạn):
     ```env
     EXPO_PUBLIC_API_URL=http://192.168.1.15:5057
     ```
     *(Bắt buộc dùng IP mạng LAN thay vì `localhost` để thiết bị thật hoặc máy ảo có thể gọi được sang backend).*
3. **Cài đặt thư viện:**
   ```powershell
   npm install
   ```
4. **Cách chạy & Test App (Có 2 cách):**

   **Cách A: Test trên thiết bị thật bằng Expo Go (Khuyến nghị, nhanh nhất)**
   - Tải app **Expo Go** trên App Store (iOS) hoặc Google Play (Android).
   - Đảm bảo điện thoại kết nối **CÙNG MỘT MẠNG WIFI** với máy tính.
   - Chạy lệnh khởi động:
     ```powershell
     npx expo start
     ```
   - Mở app Expo Go (hoặc ứng dụng Camera trên iPhone) để quét mã QR hiện trên terminal. App sẽ tự động tải bundle về điện thoại.

   **Cách B: Test trên máy ảo Android Studio (Dành cho Dev Mobile chuyên nghiệp)**
   - Cài đặt **Android Studio** và tạo một máy ảo (Virtual Device - Emulator).
   - Bật máy ảo lên trước.
   - Chạy lệnh khởi động:
     ```powershell
     npx expo start --android
     ```
   - Expo sẽ tự động cài file APK bản development vào máy ảo và mở app lên.

---

## 🛠️ 2. Fix Lỗi API Subscription
API Đăng ký nhận thông báo (`AlertSubscriptionController`) trước đó đã gặp lỗi crash khi trả về response (`CreatedAtAction` bị sai route parameter). 
✅ **Đã xử lý:** API Subscription hiện tại đã hoạt động bình thường trên Backend. Nếu Push Notification vẫn không tới điện thoại, team chỉ cần kiểm tra xem đã thiết lập đúng `FirebaseSettings` như Bước 1 chưa.

---

## 🤖 3. Kế Hoạch Nâng Cấp AI bằng Qwen-3

Backend hiện đã chuyển khỏi `RainModel.zip`/ML.NET cũ và dùng hướng **Qwen-3** (Vision-Language Model) để phân tích **Mưa** + **Kẹt Xe**; phần chatbot dùng RemoteQwen text endpoint để trả lời dựa trên dữ liệu hệ thống.

### 🏗️ Phương Án Triển Khai (Architecture)

Vì Qwen-3 Vision (VD: *Qwen-VL-Max* hoặc *Qwen2-VL-7B*) yêu cầu tài nguyên GPU cực lớn (VRAM > 16GB) để xử lý hàng ngàn request từ các camera, việc chạy trực tiếp trên máy chủ backend C# là không khả thi.

**Phương Án Khuyến Nghị (API Service Architecture):**
1. **Tách AI thành Microservice:**
   - Xây dựng một service con bằng Python (sử dụng FastAPI) để host Qwen-VL (bằng vLLM hoặc Ollama).
   - *Hoặc* sử dụng API của các nhà cung cấp cloud (như Alibaba DashScope, Together AI, HuggingFace) nếu muốn tiết kiệm chi phí mua GPU server.
2. **Logic Phân Tích Kép (Vision Analysis):**
   - Khi Backend C# (tại `RainScanningWorker.cs`) lấy được ảnh từ Camera giao thông, nó sẽ encode ảnh thành dạng Base64 và gửi HTTP Post sang AI Service (hoặc API của hãng).
   - **Prompt đề xuất gửi cho Qwen-3 (Phân loại đa cấp độ):**
     > "Hãy phân tích hình ảnh camera giao thông này và trả lời theo định dạng JSON với các trường sau: 
     > - 'rain_level' (string: 'none', 'light', 'medium', 'heavy') - Mức độ mưa.
     > - 'traffic_level' (string: 'clear', 'slow', 'jam') - Mức độ kẹt xe.
     > - 'confidence' (float từ 0-1) - Độ tự tin của AI."
   - Backend C# nhận JSON trả về, cập nhật Entity `WeatherLog` (Sửa trường IsRaining thành RainLevel, thêm TrafficLevel) và gửi Push Notification/SignalR.

### 💬 Tích Hợp Chatbot với Qwen-3
- Chatbot hiện tại gọi RemoteQwen qua endpoint text-chat của AI runtime.
- **Cách vận hành:**
  - Sửa `ChatbotService.cs` trong Backend.
  - Gọi endpoint Qwen-3 text-chat của RemoteQwen runtime.
  - Cập nhật prompt gốc (System Prompt) cho Qwen-3 để nó thông minh hơn khi đọc dữ liệu kẹt xe và mưa mới lưu trong Database.

### 📅 Phân Chia Công Việc (Sprint Task List - Team 5 Người)

Với tổng nhân sự là 5 người (Bạn là Lead Fullstack bao luôn phần AI), dưới đây là cách chia task tối ưu nhất. Quy tắc: **Làm High Priority trước để ghép nối luồng dữ liệu (Data Flow) thành công, sau đó mới làm UI/UX.**

#### 👑 1. Lead Fullstack & AI (Bạn)
*Trọng tâm: R&D AI, thiết lập môi trường và nối API lõi.*
- **[High - Khó]** Setup môi trường Qwen-3 Vision (qua vLLM/Ollama local hoặc Cloud API). Cung cấp RESTful API hoặc function gọi thẳng từ C# sang.
- **[High - Khó]** Viết và test System Prompt cho Qwen-3 VLM để nó phân tích chính xác 4 mức độ mưa (`none, light, medium, heavy`) và 3 mức độ kẹt xe (`clear, slow, jam`) theo chuẩn JSON.
- **[Medium - Vừa]** Sửa `ChatbotService.cs`: Gọi RemoteQwen text-chat endpoint và tinh chỉnh prompt để Chatbot hiểu context dữ liệu trong DB.

#### 💻 2. Backend Dev (1 Thành viên)
*Trọng tâm: Sửa DB schema và Worker quét camera.*
- **[High - Dễ]** Đổi trường `IsRaining` (bool) thành `RainLevel` (string/enum) và thêm cột `TrafficLevel` (string/enum) vào bảng `WeatherLog`. Chạy EF Migration.
- **[High - Vừa]** Viết lại logic trong `RainScanningWorker.cs` và tạo service `QwenVisionPredictionService.cs`. Đưa logic gửi ảnh Base64 vào service này, gọi sang AI của Lead, parse JSON và lưu xuống DB.
- **[High - Dễ]** Cập nhật DTO của SignalR (`RainHub`) để Push luôn 2 trường `RainLevel` và `TrafficLevel` về cho Mobile.

#### 📱 3. Team Mobile (3 Thành viên - MB1, MB2, MB3)
*Trọng tâm: Nâng cấp trải nghiệm Bản đồ, Real-time và Giao diện Chatbot.*
- **MB1 (Core Map & Real-time):**
  - **[High - Khó]** Cài đặt `@microsoft/signalr`. Xây dựng Custom Hook `useRainHub` để lắng nghe event từ Backend và cập nhật State (Zustand) để đổi trạng thái camera trên bản đồ lập tức (Real-time).
  - **[High - Vừa]** Xử lý Deep Linking khi người dùng ấn vào Push Notification: App mở lên và Zoom bản đồ thẳng tới tọa độ Camera đó.
- **MB2 (UI/UX Markers & Filters):**
  - **[Medium - Vừa]** Thiết kế lại UI Marker trên Bản đồ: 
    - Mưa (Icon): Nhạt, Vừa, Đậm (Tím).
    - Kẹt xe (Viền/Màu): Xanh lá, Cam, Đỏ.
  - **[Medium - Dễ]** Thêm thanh Filter mới trên màn hình Map: "Bật/tắt lớp Kẹt xe", "Bật/tắt lớp Mưa".
  - **[Low - Dễ]** Cập nhật UI Popup khi bấm vào Camera: Thêm text cụ thể *"Mưa vừa - Đang ùn tắc"*.
- **MB3 (Chatbot Vision UI):**
  - **[Medium - Vừa]** Bổ sung nút 📷 (Camera/Thư viện) vào màn hình Chatbot (sử dụng `expo-image-picker`).
  - **[Medium - Vừa]** Xử lý nén ảnh trên thiết bị và gửi ảnh (Base64/Multipart) kèm tin nhắn lên API Chatbot của Backend để hỏi Qwen-3 Vision.
