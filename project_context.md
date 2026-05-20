# 📖 HCMRainVision - Project Context & Current Features

Tài liệu này cung cấp bối cảnh (context) và danh sách các tính năng hiện tại của dự án **HCMRainVision**. Dùng tài liệu này để onboard team mới (Frontend và Backend) để mọi người hiểu hệ thống đang có gì trước khi thêm tính năng mới và cải thiện AI.

## 🏗️ Tổng Quan Kiến Trúc
Hệ thống là một ứng dụng cung cấp thông tin tình trạng mưa ngập tại TP.HCM theo thời gian thực, dựa trên dữ liệu camera giao thông công cộng và mô hình AI nhận diện hình ảnh.

- **Backend:** Cung cấp RESTful API, quản lý dữ liệu không gian (PostGIS), crawl dữ liệu camera, chạy background job để phân tích ảnh, và gửi thông báo real-time.
- **Frontend (Web):** Bản đồ tương tác trên nền web, hỗ trợ xem luồng camera và theo dõi các điểm mưa.
- **Mobile App:** Ứng dụng di động giúp người dùng nhận thông báo push và xem bản đồ khi đang di chuyển.

---

## 🚀 Danh Sách Tính Năng Hiện Tại (Current Features)

### 1. 🧠 Core AI & Dữ Liệu Camera (Backend)
- **Crawl Dữ Liệu Camera:** Tự động lấy hình ảnh từ các camera của Cổng thông tin giao thông TP.HCM.
- **AI Nhận Diện Mưa & Giao Thông (Qwen Vision):** Backend hỗ trợ `RemoteQwen` qua Colab/ngrok hoặc `OllamaQwen` local để phân tích mức mưa (`none/light/medium/heavy`) và giao thông (`clear/slow/jam/unknown`).
- **Quét Tự Động (Background Job):** Có worker (`RainScanningWorker`) chạy ngầm định kỳ quét qua danh sách camera, tải ảnh, đưa qua AI dự đoán, và lưu kết quả (WeatherLog) vào database.
- **Lưu trữ ảnh:** Tích hợp **Cloudinary** để lưu các hình ảnh camera phục vụ việc xem lại và training AI.

### 2. 🗺️ Bản Đồ & Vị Trí (Web & Mobile)
- **Bản Đồ Tương Tác:** Hiển thị bản đồ TP.HCM với các marker của camera (Leaflet trên Web, React Native Maps trên Mobile).
- **Trạng Thái Real-time:** Marker thay đổi màu sắc/icon tùy theo tình trạng mưa được AI phân tích. Nhận cập nhật real-time qua **SignalR WebSocket**.
- **Geocoding & PostGIS:** Camera được lưu trữ tọa độ địa lý. Database có khả năng truy vấn không gian (spatial queries) nhờ PostGIS.
- **Định vị người dùng:** Tính năng "Locate Me" để zoom bản đồ đến vị trí hiện tại của người dùng.

### 3. 👤 Quản Lý Người Dùng (Web & Mobile)
- **Authentication:** Đăng ký, đăng nhập, quên mật khẩu (sử dụng **JWT**).
- **Yêu Thích (Favorites):** Người dùng có thể lưu các camera thường xem vào danh sách yêu thích.
- **Profile:** Quản lý thông tin cá nhân cơ bản.

### 4. 🔔 Thông Báo & Cảnh Báo (Backend & Mobile)
- **Push Notification:** Gửi thông báo đến thiết bị di động thông qua **Firebase Cloud Messaging (FCM)** khi khu vực người dùng quan tâm có mưa lớn.
- **Email Alert:** Gửi cảnh báo qua email (SMTP Gmail).
- **Alert Subscription:** Người dùng có thể đăng ký nhận cảnh báo theo khu vực/camera.

### 5. 💬 Tiện Ích Khác
- **Chatbot (RemoteQwen AI):** Tích hợp RemoteQwen để người dùng có thể chat và hỏi thông tin về thời tiết/tình trạng giao thông (dựa trên dữ liệu hệ thống cấp cho prompt).
- **Route Planning:** Dùng route estimation/OSRM ở mức cơ bản để hỗ trợ tìm đường đi tránh mưa.
- **Cộng đồng báo cáo (User Reports):** Người dùng có thể report trạng thái thực tế tại một vị trí để đối chiếu với AI.

---

## ⚙️ Dành Cho Backend Team (Onboarding)
- **Tech Stack:** .NET 10, EF Core 10, PostgreSQL + PostGIS, SignalR, Qwen Vision.
- **Database:** Sử dụng PostgreSQL. Chú ý các migration liên quan đến PostGIS.
- **Background Task:** Toàn bộ logic quét camera và gọi AI nằm ở `RainScanningWorker.cs`.
- **AI Providers:** Cấu hình trong `AI:Provider`, chỉ hỗ trợ `RemoteQwen` và `OllamaQwen`. Không còn fallback mock hoặc model ML.NET `RainModel.zip` trong backend.

## 🎨 Dành Cho Frontend & Mobile Team (Onboarding)
- **Web Tech Stack:** React 19, Vite, TailwindCSS v4, Leaflet. (Port: 5173).
- **Mobile Tech Stack:** React Native 0.81, Expo 54, NativeWind.
- **API Communication:** Sử dụng Axios / Fetch với `Bearer Token`. Cả 2 nền tảng đều lắng nghe sự kiện từ `SignalR` để cập nhật icon mưa trên bản đồ lập tức mà không cần F5.

---
*Tài liệu này sẽ được dùng làm cơ sở để phân chia task sắp tới.*
