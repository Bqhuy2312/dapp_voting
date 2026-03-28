# dapp_voting

Ứng dụng bỏ phiếu kết hợp blockchain và backend truyền thống.

Dự án này là mô hình hybrid:
- Blockchain dùng để lưu election, candidate, số phiếu, trạng thái vote và các thao tác quan trọng như `create election`, `add candidate`, `vote`, `end election`.
- MySQL dùng để lưu metadata phục vụ giao diện như mô tả, ảnh, mã truy cập, ngày sinh, quê quán, mô tả ứng viên, lịch sử hiển thị trong app.
- Frontend React + MetaMask là nơi người dùng tương tác.

## 1. Kiến trúc tổng quan

- `frontend/`: giao diện React
- `backend/`: REST API Express + MySQL + upload ảnh
- `blockchain/`: smart contract Voting và artifact deploy

Luồng chính:
1. Người tạo election dùng MetaMask ký transaction để tạo election trên blockchain.
2. Frontend gọi backend để lưu metadata election vào MySQL.
3. Khi thêm ứng viên, dữ liệu tên ứng viên được đẩy lên blockchain, còn ảnh và thông tin phụ được lưu vào MySQL.
4. Khi vote, transaction vote được gửi lên blockchain, sau đó backend lưu lịch sử để app truy vấn nhanh hơn.

## 2. Yêu cầu môi trường

Cần cài trước:
- Node.js 18+ hoặc 20+
- MySQL hoặc MariaDB
- MetaMask trên trình duyệt
- Một ví có coin mạng blockchain đang dùng để trả gas

Khuyến nghị:
- Dùng cùng mạng blockchain với contract đã deploy trong frontend
- Dùng Windows PowerShell hoặc terminal tương đương nếu làm theo lệnh bên dưới

## 3. Clone và cài package

Tại thư mục gốc dự án:

```bash
cd backend
npm install

cd ../frontend
npm install
```

Lưu ý:
- Trong `backend/package.json` hiện chưa có script `start`, nên backend được chạy bằng `node app.js`.
- Frontend dùng CRA, chạy bằng `npm start`.

## 4. Cấu hình backend

Tạo hoặc chỉnh file `backend/.env` theo mẫu `backend/.env.example`.

Ví dụ:

```env
RPC_URL=https://your-rpc-url
PRIVATE_KEY=your_wallet_private_key
CONTRACT_ADDRESS=your_deployed_contract_address
CLOUD_NAME=your_cloudinary_name
CLOUD_API_KEY=your_cloudinary_key
CLOUD_API_SECRET=your_cloudinary_secret
```

### Giải thích nhanh

- `RPC_URL`: RPC của mạng blockchain đang dùng
- `PRIVATE_KEY`: khóa ví backend nếu backend có dùng thao tác blockchain
- `CONTRACT_ADDRESS`: địa chỉ contract đã deploy
- `CLOUD_NAME`, `CLOUD_API_KEY`, `CLOUD_API_SECRET`: cấu hình Cloudinary

Nếu không muốn dùng Cloudinary:
- backend hiện có fallback lưu local vào thư mục `backend/uploads`
- khi Cloudinary lỗi hoặc không cấu hình đúng, backend sẽ trả URL dạng `/uploads/...`

## 5. Cấu hình database

Backend đang kết nối MySQL tại:
- file: [db.js](/d:/Học%20Tập/Blockchain%20Căn%20Bản/dapp_voting/backend/config/db.js)
- database name mặc định: `dapp_voting`
- user mặc định: `root`
- password mặc định: rỗng

Bạn cần tạo sẵn database:

```sql
CREATE DATABASE dapp_voting;
```

### Lưu ý rất quan trọng

Đoạn `ensureSchema()` trong `backend/config/db.js` chỉ làm việc này:
- thêm các cột mới nếu bảng đã tồn tại
- không tự tạo toàn bộ bảng từ đầu

Nghĩa là:
- nếu máy bạn chưa có các bảng gốc như `elections`, `candidates`, `votes` thì chỉ chạy backend là chưa đủ
- bạn phải có sẵn schema cơ bản trước

Dự án hiện đã có file [schema.sql](/d:/Học%20Tập/Blockchain%20Căn%20Bản/dapp_voting/schema.sql) ở thư mục gốc.

Người khác clone dự án chỉ cần import file này trước:

```bash
mysql -u root -p < schema.sql
```

Hoặc mở MySQL Workbench / phpMyAdmin và import file `schema.sql`.

Các cột bổ sung mà backend tự thêm khi khởi động:
- `elections.contract_election_id`
- `candidates.contract_candidate_index`
- `candidates.birth_date`
- `candidates.hometown`
- `candidates.description`

## 6. Chạy backend

Từ thư mục `backend`:

```bash
node app.js
```

Nếu chạy thành công, terminal thường sẽ hiện:
- `MySQL connected`
- `Server started`

Có thể test nhanh backend bằng trình duyệt:

```text
http://localhost:5000/
```

Nếu backend chạy đúng, trang sẽ trả:

```text
API Running
```

## 7. Chạy frontend

Từ thư mục `frontend`:

```bash
npm start
```

Frontend đang gọi backend tại:
- `http://localhost:5000/api`
- file cấu hình: [api.js](/d:/Học%20Tập/Blockchain%20Căn%20Bản/dapp_voting/frontend/src/services/api.js)

Nếu backend không chạy ở cổng `5000`, frontend sẽ báo `Network Error`.

## 8. Cấu hình blockchain

Frontend hiện dùng địa chỉ contract cứng trong:
- [blockchain.js](/d:/Học%20Tập/Blockchain%20Căn%20Bản/dapp_voting/frontend/src/services/blockchain.js)

Nếu bạn deploy contract mới trên máy/mạng khác, cần cập nhật lại:
- `CONTRACT_ADDRESS` trong frontend nếu đang hardcode
- hoặc chỉnh đúng contract đang dùng trong file service blockchain

Ngoài ra:
- MetaMask phải đang ở đúng network có contract đó
- ví phải có coin mạng để trả gas

## 9. Cách sử dụng nhanh

### Người tạo election
1. Mở frontend
2. Kết nối MetaMask
3. Tạo election
4. Thêm ứng viên
5. Chia sẻ mã truy cập cho người vote

### Người vote
1. Kết nối MetaMask
2. Vào election
3. Nhập mã truy cập
4. Chọn ứng viên và bấm vote

Lưu ý:
- Người tạo election khi vào trang vote hiện không cần nhập mã để vào
- Người vote thông thường vẫn phải nhập mã

## 10. Dữ liệu nào nằm ở đâu

### On-chain
Smart contract lưu:
- `electionId`
- `creator`
- `startTime`
- `endTime`
- `ended`
- `candidate.name`
- `candidate.voteCount`
- `candidate.active`
- trạng thái đã vote của ví

### Off-chain
MySQL lưu:
- `title`
- `description`
- `accessCode`
- `image`
- `birth_date`
- `hometown`
- `candidate.description`
- mapping `contract_election_id`
- mapping `contract_candidate_index`
- lịch sử vote để giao diện hiển thị

## 11. Lỗi thường gặp

### 11.1 `Network Error` khi tạo election hoặc upload ảnh
Nguyên nhân thường gặp:
- backend chưa chạy
- backend bị crash khi start
- frontend không gọi được `http://localhost:5000`

Cách kiểm tra:
1. Mở `http://localhost:5000/`
2. Nếu không ra `API Running` thì backend đang lỗi

### 11.2 `ERR_CONNECTION_REFUSED` khi vào `localhost:5000`
Nguyên nhân:
- không có tiến trình nào đang chạy ở cổng `5000`
- backend chưa khởi động hoặc đã chết ngay sau khi start

### 11.3 `require is not defined in ES module scope`
Nguyên nhân:
- `backend/package.json` bị thêm `"type": "module"`
- nhưng code backend đang viết theo CommonJS (`require`, `module.exports`)

Cách xử lý:
- bỏ `"type": "module"` trong `backend/package.json`
- hoặc chuyển toàn bộ backend sang `import/export`

### 11.4 `MySQL connected` không xuất hiện
Nguyên nhân:
- MySQL chưa bật
- sai tên database, user hoặc password
- database `dapp_voting` chưa được tạo

### 11.5 Chạy backend nhưng cột mới không xuất hiện
Nguyên nhân:
- backend chưa được restart
- bảng gốc chưa tồn tại
- MySQL quá cũ không hỗ trợ `ADD COLUMN IF NOT EXISTS`

### 11.6 Không upload được ảnh, báo lỗi Cloudinary
Ví dụ lỗi:
- `Invalid cloud_name root`

Nguyên nhân:
- `CLOUD_NAME` trong `.env` sai
- cấu hình Cloudinary chưa đúng

Lưu ý:
- nếu Cloudinary lỗi, backend có thể fallback sang local upload
- nếu muốn dùng cloud thật, cần lấy đúng `cloud name` từ Dashboard của Cloudinary

### 11.7 MetaMask kết nối được nhưng tạo election / vote thất bại
Nguyên nhân thường gặp:
- sai network
- contract address không tồn tại trên network đó
- ví không đủ gas
- người dùng hủy transaction

### 11.8 Đổi tên ứng viên nhưng blockchain báo `execution reverted`
Nguyên nhân có thể là:
- ví hiện tại không phải creator
- election đã kết thúc
- `contract_candidate_index` không còn khớp
- candidate đã bị xóa trên blockchain

Trong app hiện tại:
- dữ liệu local trong DB vẫn có thể cập nhật
- nhưng tên on-chain có thể không đổi nếu blockchain từ chối

### 11.9 Chữ tiếng Việt bị lỗi hiển thị
Nguyên nhân:
- file bị lưu sai mã hóa

Khuyến nghị:
- luôn lưu source dạng UTF-8
- nếu clone về thấy chữ bị vỡ, kiểm tra encoding của file trước khi sửa logic

## 12. Ghi chú bảo mật

- Không commit `backend/.env` thật lên GitHub công khai
- Không chia sẻ `PRIVATE_KEY` hoặc `CLOUD_API_SECRET`
- Nếu key/secret đã lộ, hãy rotate hoặc tạo lại ngay

## 13. Một số file quan trọng

- Frontend API: [api.js](/d:/Học%20Tập/Blockchain%20Căn%20Bản/dapp_voting/frontend/src/services/api.js)
- Frontend blockchain service: [blockchain.js](/d:/Học%20Tập/Blockchain%20Căn%20Bản/dapp_voting/frontend/src/services/blockchain.js)
- Backend server: [app.js](/d:/Học%20Tập/Blockchain%20Căn%20Bản/dapp_voting/backend/app.js)
- Backend DB config: [db.js](/d:/Học%20Tập/Blockchain%20Bản/dapp_voting/backend/config/db.js)
- Smart contract: [Voting.sol](/d:/Học%20Tập/Blockchain%20Căn%20Bản/dapp_voting/blockchain/contracts/Voting.sol)

## 14. Checklist khi clone dự án

1. Clone repo
2. `npm install` trong `backend` và `frontend`
3. Tạo database `dapp_voting`
4. Đảm bảo đã có schema gốc cho các bảng chính
5. Tạo `backend/.env`
6. Chạy `node app.js` trong `backend`
7. Kiểm tra `http://localhost:5000/` ra `API Running`
8. Chạy `npm start` trong `frontend`
9. Kết nối MetaMask đúng network
10. Test tạo election, thêm candidate, vote

Nếu bạn muốn, README này có thể được bổ sung thêm:
- phần SQL schema mẫu
- phần screenshot giao diện
- phần hướng dẫn deploy contract mới
- phần sơ đồ kiến trúc minh họa
