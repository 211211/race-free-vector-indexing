# Câu Hỏi Phỏng Vấn HTTP - Tổng Hợp Đầy Đủ

## Mục Lục
1. [Kiến Thức Cơ Bản HTTP](#1-kiến-thức-cơ-bản-http)
2. [HTTP Methods](#2-http-methods)
3. [HTTP Status Codes](#3-http-status-codes)
4. [HTTP Headers](#4-http-headers)
5. [HTTP Versions](#5-http-versions)
6. [HTTPS & Security](#6-https--security)
7. [Cookies & Sessions](#7-cookies--sessions)
8. [Caching](#8-caching)
9. [REST API](#9-rest-api)
10. [Performance & Optimization](#10-performance--optimization)
11. [Câu Hỏi Nâng Cao](#11-câu-hỏi-nâng-cao)
12. [Câu Hỏi Thực Tế & Scenario](#12-câu-hỏi-thực-tế--scenario)

---

## 1. Kiến Thức Cơ Bản HTTP

### Q1: HTTP là gì? Giải thích cách hoạt động của HTTP.
**Trả lời:**
- HTTP (HyperText Transfer Protocol) là giao thức truyền tải siêu văn bản
- Hoạt động theo mô hình **client-server** và **request-response**
- Là giao thức **stateless** - không lưu trạng thái giữa các requests
- Chạy trên tầng Application của mô hình OSI
- Mặc định sử dụng port **80** (HTTP) và **443** (HTTPS)

### Q2: HTTP là stateless nghĩa là gì? Tại sao lại thiết kế như vậy?
**Trả lời:**
- **Stateless**: Server không lưu thông tin về client giữa các requests
- Mỗi request là độc lập, chứa đầy đủ thông tin cần thiết
- **Ưu điểm**:
  - Dễ scale (không cần sync state giữa servers)
  - Đơn giản hóa server logic
  - Fault-tolerant tốt hơn
- **Nhược điểm**: Cần cơ chế khác để duy trì state (cookies, sessions, tokens)

### Q3: Mô tả cấu trúc của HTTP Request và Response.
**Trả lời:**

**HTTP Request:**
```
[Method] [URL] [HTTP Version]
[Headers]
[Empty Line]
[Body - optional]
```
Ví dụ:
```
GET /api/users HTTP/1.1
Host: example.com
Accept: application/json
```

**HTTP Response:**
```
[HTTP Version] [Status Code] [Status Message]
[Headers]
[Empty Line]
[Body]
```
Ví dụ:
```
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 123

{"id": 1, "name": "John"}
```

### Q4: Giải thích URL, URI và URN khác nhau như thế nào?
**Trả lời:**
- **URI (Uniform Resource Identifier)**: Định danh tài nguyên - là khái niệm tổng quát
- **URL (Uniform Resource Locator)**: Định vị tài nguyên - cho biết **cách truy cập** và **vị trí**
  - Ví dụ: `https://example.com/page.html`
- **URN (Uniform Resource Name)**: Định danh tài nguyên theo tên - không phụ thuộc vị trí
  - Ví dụ: `urn:isbn:0451450523`
- **Quan hệ**: URL và URN đều là subset của URI

### Q5: Giải thích các thành phần của một URL.
**Trả lời:**
```
https://user:pass@www.example.com:443/path/page?query=value#fragment
```
- **Protocol/Scheme**: `https`
- **Credentials**: `user:pass` (không khuyến khích)
- **Host**: `www.example.com`
- **Port**: `443`
- **Path**: `/path/page`
- **Query String**: `?query=value`
- **Fragment**: `#fragment` (không gửi lên server)

### Q6: TCP và HTTP khác nhau như thế nào?
**Trả lời:**
| TCP | HTTP |
|-----|------|
| Tầng Transport | Tầng Application |
| Connection-oriented | Request-Response based |
| Đảm bảo dữ liệu đến đích | Định nghĩa format message |
| Xử lý packets, ordering | Xử lý web content |
| HTTP chạy **trên** TCP | |

### Q7: Điều gì xảy ra khi bạn gõ một URL vào trình duyệt?
**Trả lời:**
1. **DNS Lookup**: Phân giải domain → IP address
2. **TCP Connection**: 3-way handshake (SYN → SYN-ACK → ACK)
3. **TLS Handshake** (nếu HTTPS): Thiết lập kênh mã hóa
4. **HTTP Request**: Browser gửi GET request
5. **Server Processing**: Server xử lý và tạo response
6. **HTTP Response**: Server trả về HTML
7. **Rendering**: Browser parse HTML, tải CSS/JS/images
8. **DOM Construction**: Xây dựng DOM tree và render

---

## 2. HTTP Methods

### Q8: Liệt kê và giải thích các HTTP Methods phổ biến.
**Trả lời:**

| Method | Mục đích | Idempotent | Safe | Body |
|--------|----------|------------|------|------|
| GET | Lấy dữ liệu | ✅ | ✅ | Không |
| POST | Tạo mới | ❌ | ❌ | Có |
| PUT | Cập nhật toàn bộ | ✅ | ❌ | Có |
| PATCH | Cập nhật một phần | ❌ | ❌ | Có |
| DELETE | Xóa | ✅ | ❌ | Tùy chọn |
| HEAD | Như GET nhưng không body | ✅ | ✅ | Không |
| OPTIONS | Kiểm tra methods được hỗ trợ | ✅ | ✅ | Không |
| TRACE | Debug/diagnostic | ✅ | ✅ | Không |
| CONNECT | Thiết lập tunnel | ❌ | ❌ | Không |

### Q9: Idempotent là gì? Tại sao quan trọng?
**Trả lời:**
- **Idempotent**: Gọi nhiều lần cho kết quả giống như gọi một lần
- **Ví dụ**:
  - `DELETE /users/1` - Xóa user 1 lần hay 10 lần, kết quả đều là user bị xóa
  - `PUT /users/1 {name: "John"}` - Cập nhật bao nhiêu lần cũng có cùng kết quả
- **Quan trọng vì**:
  - Retry an toàn khi network fail
  - Tránh duplicate operations
  - Caching dễ dàng hơn

### Q10: Safe method là gì?
**Trả lời:**
- **Safe method**: Không thay đổi state của server
- GET, HEAD, OPTIONS là safe methods
- Browser có thể prefetch safe methods mà không lo side effects
- Search engines chỉ crawl safe methods

### Q11: GET vs POST khác nhau như thế nào?
**Trả lời:**

| GET | POST |
|-----|------|
| Lấy dữ liệu | Gửi dữ liệu |
| Parameters trong URL | Parameters trong body |
| Có thể bookmark | Không bookmark được |
| Cached được | Không cached |
| Idempotent | Không idempotent |
| Giới hạn độ dài URL (~2048 chars) | Không giới hạn |
| Visible trong browser history | Không visible |
| Không nên dùng cho sensitive data | An toàn hơn cho sensitive data |

### Q12: PUT vs PATCH khác nhau như thế nào?
**Trả lời:**
- **PUT**: Thay thế **toàn bộ** resource
  ```json
  PUT /users/1
  {"id": 1, "name": "John", "email": "john@example.com", "age": 30}
  ```
- **PATCH**: Cập nhật **một phần** resource
  ```json
  PATCH /users/1
  {"age": 31}
  ```
- PUT là idempotent, PATCH có thể không idempotent
- PUT cần gửi full object, PATCH chỉ gửi fields cần update

### Q13: POST vs PUT khác nhau như thế nào?
**Trả lời:**
| POST | PUT |
|------|-----|
| Tạo resource mới | Tạo hoặc thay thế resource |
| Server quyết định URI | Client chỉ định URI |
| Không idempotent | Idempotent |
| `POST /users` → Server tạo `/users/123` | `PUT /users/123` → Client chỉ định ID |

### Q14: OPTIONS method dùng để làm gì?
**Trả lời:**
- Kiểm tra methods được phép trên resource
- **Preflight request** trong CORS
- Response chứa header `Allow: GET, POST, PUT, DELETE`
- Ví dụ CORS preflight:
  ```
  OPTIONS /api/data HTTP/1.1
  Origin: https://example.com
  Access-Control-Request-Method: POST
  ```

### Q15: HEAD method dùng khi nào?
**Trả lời:**
- Lấy headers mà không tải body
- **Use cases**:
  - Kiểm tra resource có tồn tại không
  - Lấy Content-Length trước khi download
  - Kiểm tra Last-Modified cho caching
  - Kiểm tra link có valid không

---

## 3. HTTP Status Codes

### Q16: Giải thích các nhóm HTTP Status Codes.
**Trả lời:**
- **1xx (Informational)**: Request đang được xử lý
- **2xx (Success)**: Request thành công
- **3xx (Redirection)**: Cần thêm action để hoàn thành
- **4xx (Client Error)**: Lỗi từ phía client
- **5xx (Server Error)**: Lỗi từ phía server

### Q17: Liệt kê các status codes thường gặp và ý nghĩa.
**Trả lời:**

**2xx Success:**
| Code | Tên | Ý nghĩa |
|------|-----|---------|
| 200 | OK | Request thành công |
| 201 | Created | Resource đã được tạo |
| 202 | Accepted | Request được chấp nhận, đang xử lý |
| 204 | No Content | Thành công nhưng không có body |

**3xx Redirection:**
| Code | Tên | Ý nghĩa |
|------|-----|---------|
| 301 | Moved Permanently | URL đã chuyển vĩnh viễn |
| 302 | Found | Redirect tạm thời |
| 303 | See Other | Redirect sang GET |
| 304 | Not Modified | Resource chưa thay đổi (cache) |
| 307 | Temporary Redirect | Redirect tạm, giữ method |
| 308 | Permanent Redirect | Redirect vĩnh viễn, giữ method |

**4xx Client Error:**
| Code | Tên | Ý nghĩa |
|------|-----|---------|
| 400 | Bad Request | Request không hợp lệ |
| 401 | Unauthorized | Chưa xác thực |
| 403 | Forbidden | Không có quyền |
| 404 | Not Found | Resource không tồn tại |
| 405 | Method Not Allowed | Method không được phép |
| 408 | Request Timeout | Request quá thời gian |
| 409 | Conflict | Conflict với state hiện tại |
| 413 | Payload Too Large | Body quá lớn |
| 415 | Unsupported Media Type | Content-Type không hỗ trợ |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limited |

**5xx Server Error:**
| Code | Tên | Ý nghĩa |
|------|-----|---------|
| 500 | Internal Server Error | Lỗi server chung |
| 501 | Not Implemented | Method chưa được implement |
| 502 | Bad Gateway | Gateway/proxy nhận response không hợp lệ |
| 503 | Service Unavailable | Server đang bảo trì/overload |
| 504 | Gateway Timeout | Gateway timeout |

### Q18: 301 vs 302 khác nhau như thế nào?
**Trả lời:**
| 301 Moved Permanently | 302 Found |
|----------------------|-----------|
| Redirect vĩnh viễn | Redirect tạm thời |
| Browser cache URL mới | Browser không cache |
| SEO: chuyển ranking sang URL mới | SEO: giữ ranking URL cũ |
| Dùng khi: đổi domain, restructure URL | Dùng khi: maintenance, A/B testing |

### Q19: 401 vs 403 khác nhau như thế nào?
**Trả lời:**
| 401 Unauthorized | 403 Forbidden |
|------------------|---------------|
| Chưa xác thực (authentication) | Không có quyền (authorization) |
| "Bạn là ai?" | "Tôi biết bạn, nhưng bạn không được phép" |
| Có thể login và retry | Login cũng không giúp được |
| Thường kèm `WWW-Authenticate` header | |

### Q20: Khi nào dùng 404 vs 410?
**Trả lời:**
- **404 Not Found**: Resource không tồn tại (có thể đã có hoặc chưa bao giờ có)
- **410 Gone**: Resource đã từng tồn tại nhưng bị xóa vĩnh viễn
- **SEO impact**: 410 báo search engines xóa khỏi index nhanh hơn

### Q21: 500 vs 502 vs 503 vs 504 khác nhau như thế nào?
**Trả lời:**
- **500**: Lỗi chung trong application code
- **502**: Proxy/load balancer nhận response không hợp lệ từ upstream
- **503**: Server đang quá tải hoặc maintenance
- **504**: Proxy/load balancer không nhận được response từ upstream trong thời gian cho phép

---

## 4. HTTP Headers

### Q22: Liệt kê các Request Headers quan trọng.
**Trả lời:**

| Header | Mục đích | Ví dụ |
|--------|----------|-------|
| Host | Chỉ định server | `Host: www.example.com` |
| User-Agent | Thông tin client | `User-Agent: Mozilla/5.0...` |
| Accept | Content types mong muốn | `Accept: application/json` |
| Accept-Language | Ngôn ngữ mong muốn | `Accept-Language: vi-VN, en` |
| Accept-Encoding | Encoding hỗ trợ | `Accept-Encoding: gzip, deflate` |
| Content-Type | Loại content của body | `Content-Type: application/json` |
| Content-Length | Kích thước body | `Content-Length: 1234` |
| Authorization | Credentials | `Authorization: Bearer token123` |
| Cookie | Cookies | `Cookie: session=abc123` |
| Cache-Control | Chỉ thị cache | `Cache-Control: no-cache` |
| If-None-Match | Conditional request | `If-None-Match: "etag123"` |
| If-Modified-Since | Conditional request | `If-Modified-Since: Wed, 21 Oct 2023...` |

### Q23: Liệt kê các Response Headers quan trọng.
**Trả lời:**

| Header | Mục đích | Ví dụ |
|--------|----------|-------|
| Content-Type | Loại content | `Content-Type: text/html; charset=utf-8` |
| Content-Length | Kích thước | `Content-Length: 5678` |
| Content-Encoding | Encoding đã dùng | `Content-Encoding: gzip` |
| Cache-Control | Chỉ thị cache | `Cache-Control: max-age=3600` |
| ETag | Version identifier | `ETag: "abc123"` |
| Last-Modified | Thời điểm sửa cuối | `Last-Modified: Wed, 21 Oct 2023...` |
| Set-Cookie | Set cookie | `Set-Cookie: session=xyz; HttpOnly` |
| Location | URL redirect | `Location: /new-page` |
| WWW-Authenticate | Auth challenge | `WWW-Authenticate: Bearer` |
| Access-Control-* | CORS headers | `Access-Control-Allow-Origin: *` |

### Q24: Content-Type header quan trọng như thế nào?
**Trả lời:**
- Cho biết **MIME type** của content
- **Request**: Cho server biết format của body
- **Response**: Cho client biết cách xử lý response
- Common values:
  - `application/json`
  - `application/x-www-form-urlencoded`
  - `multipart/form-data`
  - `text/html`
  - `text/plain`
  - `application/xml`

### Q25: Accept vs Content-Type khác nhau như thế nào?
**Trả lời:**
| Accept | Content-Type |
|--------|--------------|
| Request header | Request & Response header |
| "Tôi muốn nhận format này" | "Tôi đang gửi format này" |
| Content negotiation | Mô tả actual content |
| Có thể list nhiều types với priority | Chỉ một type |

### Q26: Giải thích Content Negotiation.
**Trả lời:**
- Cơ chế chọn representation phù hợp nhất cho resource
- **Server-driven**: Server chọn dựa trên headers của client
  - `Accept`: Content type
  - `Accept-Language`: Ngôn ngữ
  - `Accept-Encoding`: Compression
  - `Accept-Charset`: Character set
- **Agent-driven**: Server trả về 300 Multiple Choices, client chọn
- Ví dụ:
  ```
  Accept: application/json, application/xml;q=0.9, */*;q=0.8
  ```
  (Ưu tiên JSON > XML > anything else)

### Q27: Host header quan trọng như thế nào?
**Trả lời:**
- **Bắt buộc** trong HTTP/1.1
- Cho phép **Virtual Hosting** - nhiều websites trên cùng IP
- Server dùng Host header để route request đến đúng site
- Ví dụ: `Host: www.example.com`

### Q28: User-Agent header dùng để làm gì?
**Trả lời:**
- Chứa thông tin về client (browser, OS, version)
- **Use cases**:
  - Analytics
  - Serve different content cho mobile/desktop
  - Block bots
  - Debug compatibility issues
- Có thể bị spoofed nên không nên dựa vào cho security

---

## 5. HTTP Versions

### Q29: So sánh HTTP/1.0 vs HTTP/1.1.
**Trả lời:**

| HTTP/1.0 | HTTP/1.1 |
|----------|----------|
| Mỗi request một TCP connection | Persistent connections (Keep-Alive) |
| Không có Host header | Host header bắt buộc |
| Caching đơn giản | Cache-Control, ETag, conditional requests |
| Không chunked transfer | Chunked transfer encoding |
| Không pipelining | Hỗ trợ pipelining |
| Không range requests | Range requests (resume download) |

### Q30: HTTP/1.1 Pipelining là gì và tại sao ít được dùng?
**Trả lời:**
- **Pipelining**: Gửi nhiều requests liên tiếp mà không đợi response
- **Vấn đề**:
  - **Head-of-Line Blocking**: Response phải trả về theo thứ tự request
  - Nếu request đầu chậm, các request sau bị block
  - Khó implement đúng
  - Nhiều proxy không hỗ trợ
- Hầu hết browsers đã disable pipelining

### Q31: HTTP/2 có gì mới?
**Trả lời:**
1. **Binary Protocol**: Thay vì text, dùng binary framing
2. **Multiplexing**: Nhiều streams song song trên một TCP connection
3. **Header Compression**: HPACK algorithm
4. **Server Push**: Server gửi resources trước khi client yêu cầu
5. **Stream Prioritization**: Ưu tiên resources quan trọng
6. **Single TCP Connection**: Giảm overhead của multiple connections

### Q32: Multiplexing trong HTTP/2 hoạt động như thế nào?
**Trả lời:**
- Một TCP connection chứa nhiều **streams**
- Mỗi stream có ID riêng
- Requests/responses được chia thành **frames**
- Frames từ nhiều streams có thể **interleaved**
- Giải quyết **Head-of-Line blocking** ở tầng HTTP
- Tuy nhiên, TCP HOL blocking vẫn còn

### Q33: Server Push trong HTTP/2 là gì?
**Trả lời:**
- Server chủ động gửi resources mà client có thể cần
- Ví dụ: Khi client request HTML, server push luôn CSS và JS
- **Ưu điểm**: Giảm latency, không cần đợi client phân tích HTML
- **Nhược điểm**:
  - Có thể push resources client đã có trong cache
  - Khó configure đúng
  - Đã bị **deprecated** trong một số browsers

### Q34: HTTP/3 có gì khác biệt?
**Trả lời:**
- Chạy trên **QUIC** (UDP) thay vì TCP
- **Giải quyết TCP HOL blocking**: Packet loss chỉ ảnh hưởng stream liên quan
- **Faster connection setup**: 0-RTT hoặc 1-RTT
- **Built-in encryption**: TLS 1.3 được tích hợp
- **Connection migration**: Chuyển network (WiFi → 4G) mà không mất connection
- **Improved multiplexing**: True independent streams

### Q35: So sánh HTTP/1.1, HTTP/2, HTTP/3.
**Trả lời:**

| Feature | HTTP/1.1 | HTTP/2 | HTTP/3 |
|---------|----------|--------|--------|
| Protocol | Text | Binary | Binary |
| Transport | TCP | TCP | QUIC (UDP) |
| Multiplexing | Không | Có | Có (cải tiến) |
| Header Compression | Không | HPACK | QPACK |
| Server Push | Không | Có | Có |
| HOL Blocking | HTTP + TCP | TCP only | Không |
| Connection Setup | TCP + TLS | TCP + TLS | 0-1 RTT |
| Encryption | Optional | Thực tế bắt buộc | Bắt buộc |

---

## 6. HTTPS & Security

### Q36: HTTPS hoạt động như thế nào?
**Trả lời:**
1. **TCP Handshake**: Thiết lập kết nối TCP
2. **TLS Handshake**:
   - Client gửi supported cipher suites
   - Server chọn cipher và gửi certificate
   - Client verify certificate
   - Key exchange (asymmetric)
   - Derive session keys (symmetric)
3. **Encrypted Communication**: Dùng symmetric encryption
4. **Data Integrity**: MAC đảm bảo data không bị sửa

### Q37: TLS Handshake diễn ra như thế nào?
**Trả lời:**
**TLS 1.2:**
1. ClientHello: Versions, cipher suites, random
2. ServerHello: Chosen cipher, random
3. Certificate: Server's certificate
4. ServerKeyExchange: Key exchange parameters
5. ServerHelloDone
6. ClientKeyExchange: Client's key contribution
7. ChangeCipherSpec (both sides)
8. Finished (both sides)
→ **2 RTT**

**TLS 1.3:**
1. ClientHello + KeyShare
2. ServerHello + KeyShare + EncryptedExtensions + Certificate + Finished
3. Client Finished
→ **1 RTT** (0-RTT với resumption)

### Q38: Symmetric vs Asymmetric encryption trong HTTPS?
**Trả lời:**
| Symmetric | Asymmetric |
|-----------|------------|
| Một key cho encrypt và decrypt | Public key encrypt, private key decrypt |
| Nhanh | Chậm |
| AES, ChaCha20 | RSA, ECDSA |
| Dùng cho data transfer | Dùng cho key exchange và signatures |

**HTTPS dùng cả hai:**
- Asymmetric: Trao đổi session key an toàn
- Symmetric: Encrypt actual data (nhanh hơn)

### Q39: SSL Certificate chứa gì và verify như thế nào?
**Trả lời:**
**Certificate chứa:**
- Domain name
- Public key
- Issuer (Certificate Authority)
- Validity period
- Digital signature của CA

**Verification:**
1. Browser kiểm tra domain khớp
2. Kiểm tra certificate chưa hết hạn
3. Kiểm tra certificate chưa bị revoked (CRL, OCSP)
4. Verify signature bằng CA's public key
5. Chain of trust đến Root CA (có sẵn trong browser/OS)

### Q40: HTTP vs HTTPS khác nhau như thế nào?
**Trả lời:**

| HTTP | HTTPS |
|------|-------|
| Port 80 | Port 443 |
| Không mã hóa | Mã hóa TLS/SSL |
| Có thể bị đọc/sửa | Bảo mật và toàn vẹn |
| Nhanh hơn (không TLS overhead) | Chậm hơn một chút |
| Không verify server | Verify server qua certificate |
| SEO không ưu tiên | SEO ưu tiên |
| Browsers đánh dấu "Not Secure" | Hiển thị khóa xanh |

### Q41: Giải thích các HTTP Security Headers.
**Trả lời:**

| Header | Mục đích |
|--------|----------|
| `Strict-Transport-Security` (HSTS) | Bắt buộc dùng HTTPS |
| `Content-Security-Policy` (CSP) | Chống XSS, chỉ định sources được phép |
| `X-Content-Type-Options` | Ngăn MIME type sniffing |
| `X-Frame-Options` | Chống clickjacking |
| `X-XSS-Protection` | Bật XSS filter của browser |
| `Referrer-Policy` | Kiểm soát Referer header |
| `Permissions-Policy` | Kiểm soát browser features |

### Q42: CORS là gì và hoạt động như thế nào?
**Trả lời:**
- **CORS** (Cross-Origin Resource Sharing): Cơ chế cho phép requests từ origin khác
- **Same-Origin Policy**: Browser chặn requests đến origin khác (khác protocol, domain, hoặc port)
- **CORS workflow**:
  1. Browser gửi request với `Origin` header
  2. Server respond với `Access-Control-Allow-Origin`
  3. Browser kiểm tra và cho phép/chặn response

**Simple requests**: GET, HEAD, POST với standard headers
**Preflight requests** (OPTIONS): Cho các requests phức tạp

```
Access-Control-Allow-Origin: https://example.com
Access-Control-Allow-Methods: GET, POST, PUT
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 86400
```

### Q43: CORS Preflight request là gì?
**Trả lời:**
- Request OPTIONS tự động của browser trước actual request
- **Khi nào xảy ra**:
  - Methods: PUT, DELETE, PATCH
  - Custom headers
  - Content-Type khác basic types
- **Mục đích**: Kiểm tra server có cho phép request không
- **Caching**: `Access-Control-Max-Age` để cache preflight result

---

## 7. Cookies & Sessions

### Q44: Cookie là gì? Giải thích cách hoạt động.
**Trả lời:**
- **Cookie**: Dữ liệu nhỏ server gửi xuống, browser lưu trữ
- **Workflow**:
  1. Server: `Set-Cookie: session=abc123`
  2. Browser lưu cookie
  3. Browser tự động gửi `Cookie: session=abc123` trong requests tiếp theo
- **Use cases**: Authentication, preferences, tracking, shopping cart

### Q45: Giải thích các Cookie attributes.
**Trả lời:**

| Attribute | Mục đích | Ví dụ |
|-----------|----------|-------|
| `Name=Value` | Dữ liệu cookie | `session=abc123` |
| `Expires` | Thời điểm hết hạn | `Expires=Thu, 01 Jan 2025...` |
| `Max-Age` | Thời gian sống (seconds) | `Max-Age=3600` |
| `Domain` | Domain được phép | `Domain=example.com` |
| `Path` | Path được phép | `Path=/api` |
| `Secure` | Chỉ gửi qua HTTPS | `Secure` |
| `HttpOnly` | JavaScript không access được | `HttpOnly` |
| `SameSite` | Chống CSRF | `SameSite=Strict` |

### Q46: Session-based vs Token-based Authentication khác nhau như thế nào?
**Trả lời:**

| Session-based | Token-based (JWT) |
|---------------|-------------------|
| State lưu trên server | Stateless |
| Session ID trong cookie | Token trong header/cookie |
| Cần session storage | Không cần storage |
| Khó scale (cần shared session) | Dễ scale |
| Server có thể invalidate | Không thể invalidate (trừ khi blacklist) |
| Nhỏ (chỉ session ID) | Lớn hơn (chứa claims) |

### Q47: SameSite cookie attribute có các giá trị nào?
**Trả lời:**
- **Strict**: Cookie chỉ gửi khi request từ same site
  - Không gửi khi click link từ site khác
- **Lax** (default): Gửi với top-level navigations (GET)
  - Không gửi với cross-site POST, iframe, AJAX
- **None**: Luôn gửi (cần có `Secure`)
  - Dùng cho cross-site requests có chủ đích

### Q48: HttpOnly và Secure cookies quan trọng như thế nào?
**Trả lời:**
- **HttpOnly**:
  - JavaScript không thể đọc cookie (`document.cookie`)
  - Chống XSS: Attacker không thể steal session cookie
  - **Luôn dùng** cho session/auth cookies

- **Secure**:
  - Cookie chỉ gửi qua HTTPS
  - Chống man-in-the-middle: Cookie không bị lộ qua HTTP
  - **Luôn dùng** cho sensitive cookies

---

## 8. Caching

### Q49: HTTP Caching hoạt động như thế nào?
**Trả lời:**
**Các loại cache:**
- **Browser cache**: Cache local của client
- **Proxy cache**: Shared cache (CDN, corporate proxy)
- **Gateway cache**: Reverse proxy cache

**Caching strategies:**
1. **Freshness**: Resource có còn fresh không?
   - `Cache-Control: max-age=3600`
   - `Expires: Thu, 01 Jan 2025...`
2. **Validation**: Resource có thay đổi không?
   - `ETag` / `If-None-Match`
   - `Last-Modified` / `If-Modified-Since`

### Q50: Giải thích Cache-Control header.
**Trả lời:**

| Directive | Ý nghĩa |
|-----------|---------|
| `public` | Ai cũng có thể cache |
| `private` | Chỉ browser cache, proxy không được |
| `no-cache` | Phải validate với server trước khi dùng cache |
| `no-store` | Không cache gì cả |
| `max-age=N` | Cache fresh trong N seconds |
| `s-maxage=N` | max-age cho shared caches |
| `must-revalidate` | Phải revalidate khi stale |
| `immutable` | Resource không bao giờ thay đổi |

### Q51: ETag là gì và hoạt động như thế nào?
**Trả lời:**
- **ETag**: Entity Tag - unique identifier cho version của resource
- **Workflow**:
  1. Server: `ETag: "abc123"`
  2. Client gửi: `If-None-Match: "abc123"`
  3. Server kiểm tra ETag:
     - Khớp: `304 Not Modified` (không body)
     - Khác: `200 OK` với content mới và ETag mới
- **Strong vs Weak ETag**:
  - Strong: `"abc123"` - byte-for-byte identical
  - Weak: `W/"abc123"` - semantically equivalent

### Q52: no-cache vs no-store khác nhau như thế nào?
**Trả lời:**
| no-cache | no-store |
|----------|----------|
| Có thể cache | Không được cache |
| Phải validate mỗi lần dùng | Không lưu trữ gì |
| Server quyết định có dùng cache không | Luôn request mới |
| Dùng cho content hay thay đổi | Dùng cho sensitive data |

### Q53: Conditional Requests là gì?
**Trả lời:**
- Requests hỏi server "resource có thay đổi không?"
- **Headers**:
  - `If-Modified-Since`: Dựa trên timestamp
  - `If-None-Match`: Dựa trên ETag
  - `If-Match`: Dùng cho update (optimistic concurrency)
- **Response**:
  - `304 Not Modified`: Dùng cache
  - `200 OK`: Content mới
  - `412 Precondition Failed`: Conflict

---

## 9. REST API

### Q54: REST là gì? Giải thích các nguyên tắc.
**Trả lời:**
**REST** (Representational State Transfer) - architectural style:

1. **Client-Server**: Tách biệt client và server
2. **Stateless**: Mỗi request chứa đủ thông tin, server không lưu state
3. **Cacheable**: Responses có thể được cache
4. **Uniform Interface**:
   - Resource identification (URIs)
   - Resource manipulation through representations
   - Self-descriptive messages
   - HATEOAS
5. **Layered System**: Có thể có middlemen (proxies, gateways)
6. **Code on Demand** (optional): Server có thể gửi executable code

### Q55: RESTful API design best practices?
**Trả lời:**

**URL Design:**
```
GET    /users          # List users
GET    /users/123      # Get user 123
POST   /users          # Create user
PUT    /users/123      # Update user 123
PATCH  /users/123      # Partial update user 123
DELETE /users/123      # Delete user 123
GET    /users/123/posts # Get posts of user 123
```

**Best Practices:**
- Dùng nouns, không dùng verbs trong URL
- Dùng plural nouns (`/users` không phải `/user`)
- Dùng hyphens, không dùng underscores
- Lowercase URLs
- Version API: `/api/v1/users`
- Dùng query params cho filtering: `/users?status=active`
- Pagination: `/users?page=2&limit=20`
- Proper status codes
- Consistent error format

### Q56: REST vs GraphQL vs gRPC?
**Trả lời:**

| Feature | REST | GraphQL | gRPC |
|---------|------|---------|------|
| Protocol | HTTP | HTTP | HTTP/2 |
| Data Format | JSON/XML | JSON | Protocol Buffers |
| Contract | OpenAPI | Schema | Proto files |
| Overfetching | Có thể | Không | Không |
| Multiple Resources | Multiple requests | Single request | Multiple requests |
| Real-time | Polling/WebSocket | Subscriptions | Streaming |
| Caching | HTTP caching | Phức tạp hơn | Không có sẵn |
| Best for | CRUD, web apps | Complex data, mobile | Microservices, performance |

### Q57: Idempotency trong REST API quan trọng như thế nào?
**Trả lời:**
- **Quan trọng** cho reliability và retry logic
- Ví dụ: Network timeout, không biết request thành công chưa
  - Idempotent: Retry an toàn
  - Non-idempotent: Có thể duplicate actions

**Implementation:**
```
POST /payments
Idempotency-Key: unique-request-id-123
```
- Server lưu key và result
- Request duplicate trả về result đã lưu

### Q58: Pagination trong REST API có những cách nào?
**Trả lời:**

**1. Offset-based:**
```
GET /users?offset=20&limit=10
```
- Đơn giản
- Vấn đề: Khi data thay đổi, có thể miss/duplicate items

**2. Page-based:**
```
GET /users?page=3&per_page=10
```
- Dễ hiểu
- Cùng vấn đề như offset

**3. Cursor-based:**
```
GET /users?cursor=eyJpZCI6MTIzfQ&limit=10
```
- Stable results
- Không thể jump to page
- Tốt cho infinite scroll

**4. Keyset-based:**
```
GET /users?after_id=123&limit=10
```
- Performance tốt với large datasets
- Cần field có thể sort

---

## 10. Performance & Optimization

### Q59: Các kỹ thuật tối ưu HTTP performance?
**Trả lời:**

1. **Reduce requests:**
   - Bundle files
   - CSS sprites
   - Inline critical resources

2. **Reduce payload:**
   - Compression (gzip, Brotli)
   - Minification
   - Image optimization
   - Remove unnecessary data

3. **Caching:**
   - Browser caching với proper headers
   - CDN caching
   - API response caching

4. **Connection optimization:**
   - HTTP/2 multiplexing
   - Keep-Alive
   - Connection pooling

5. **Reduce latency:**
   - CDN
   - DNS prefetch
   - Preconnect
   - Edge computing

### Q60: Compression trong HTTP hoạt động như thế nào?
**Trả lời:**
1. Client gửi: `Accept-Encoding: gzip, deflate, br`
2. Server chọn algorithm và compress content
3. Server respond: `Content-Encoding: gzip`
4. Client decompress

**Algorithms:**
- **gzip**: Phổ biến, hỗ trợ rộng
- **deflate**: Ít dùng
- **br (Brotli)**: Compression ratio tốt hơn gzip ~20%

### Q61: CDN hoạt động như thế nào với HTTP?
**Trả lời:**
- **CDN** (Content Delivery Network): Network of edge servers
- **Workflow**:
  1. User request đến CDN edge gần nhất
  2. Nếu có cache: Trả về ngay
  3. Nếu không: Fetch từ origin, cache, trả về
- **Benefits**:
  - Giảm latency (edge gần user)
  - Giảm load origin server
  - DDoS protection
  - TLS termination tại edge

### Q62: Keep-Alive connection hoạt động như thế nào?
**Trả lời:**
- **Persistent connection**: Giữ TCP connection open cho multiple requests
- HTTP/1.1: `Connection: keep-alive` (default)
- **Headers**:
  ```
  Connection: keep-alive
  Keep-Alive: timeout=5, max=100
  ```
- **Benefits**:
  - Không cần TCP handshake mỗi request
  - Tận dụng TCP slow start
- **Drawbacks**:
  - Server phải giữ connections open
  - Cần tuning timeout và max connections

### Q63: HTTP/2 Server Push nên dùng như thế nào?
**Trả lời:**
- **Đã deprecated** trong nhiều browsers
- **Vấn đề**:
  - Push resources client đã có trong cache
  - Khó predict resources cần push
  - Không có early hints
- **Alternatives**:
  - `103 Early Hints`: Server gửi hints về resources
  - Preload links trong HTML
  - HTTP/2 priorities

---

## 11. Câu Hỏi Nâng Cao

### Q64: WebSocket khác HTTP như thế nào?
**Trả lời:**

| HTTP | WebSocket |
|------|-----------|
| Request-Response | Full-duplex |
| Client initiates | Cả hai có thể gửi |
| Connection đóng sau response | Persistent connection |
| Stateless | Stateful |
| Overhead mỗi request | Low overhead |
| RESTful APIs | Real-time apps |

**WebSocket Handshake:**
```
GET /chat HTTP/1.1
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==

HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
```

### Q65: Server-Sent Events (SSE) là gì?
**Trả lời:**
- **One-way streaming** từ server đến client
- Dùng standard HTTP
- Browser tự động reconnect
- **Use cases**: Live feeds, notifications, real-time updates

```
Content-Type: text/event-stream

data: {"message": "Hello"}

data: {"message": "World"}
```

**SSE vs WebSocket:**
| SSE | WebSocket |
|-----|-----------|
| Server → Client only | Bidirectional |
| HTTP | Custom protocol |
| Auto-reconnect | Manual reconnect |
| Text only | Text + Binary |
| Simpler | More complex |

### Q66: Long Polling là gì?
**Trả lời:**
- Technique để "fake" real-time với HTTP
- **Workflow**:
  1. Client gửi request
  2. Server giữ connection open cho đến khi có data
  3. Server respond khi có data hoặc timeout
  4. Client immediately sends new request
- **Pros**: Works everywhere, simpler than WebSocket
- **Cons**: Resource intensive, latency

### Q67: HTTP Streaming hoạt động như thế nào?
**Trả lời:**
- Server gửi response theo từng phần
- Connection vẫn open
- **Chunked Transfer Encoding**:
  ```
  Transfer-Encoding: chunked

  7\r\n
  Mozilla\r\n
  9\r\n
  Developer\r\n
  0\r\n
  \r\n
  ```
- **Use cases**: Large file downloads, video streaming, LLM responses

### Q68: Rate Limiting hoạt động như thế nào?
**Trả lời:**
- Giới hạn số requests trong khoảng thời gian
- **Algorithms**:
  - Fixed Window
  - Sliding Window
  - Token Bucket
  - Leaky Bucket
- **Headers**:
  ```
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 45
  X-RateLimit-Reset: 1699555200
  Retry-After: 60
  ```
- Response: `429 Too Many Requests`

### Q69: Content-Disposition header dùng để làm gì?
**Trả lời:**
- Chỉ định cách xử lý content
- **Values**:
  - `inline`: Hiển thị trong browser
  - `attachment`: Download file
- **Filename**:
  ```
  Content-Disposition: attachment; filename="report.pdf"
  Content-Disposition: attachment; filename*=UTF-8''%E1%BA%A3nh.png
  ```

### Q70: Transfer-Encoding vs Content-Encoding khác nhau như thế nào?
**Trả lời:**
| Transfer-Encoding | Content-Encoding |
|-------------------|------------------|
| Cách transfer message | Cách compress content |
| Hop-by-hop | End-to-end |
| Proxy có thể thay đổi | Proxy không thay đổi |
| `chunked`, `gzip` | `gzip`, `br`, `deflate` |
| Removed by receiver | Kept until final destination |

---

## 12. Câu Hỏi Thực Tế & Scenario

### Q71: Làm sao debug HTTP requests?
**Trả lời:**
- **Browser DevTools**: Network tab
- **curl**: `curl -v https://example.com`
- **Postman/Insomnia**: GUI tools
- **Wireshark**: Packet analysis
- **Charles/Fiddler**: HTTP proxy
- **httpie**: User-friendly curl alternative

### Q72: Làm sao handle file uploads với HTTP?
**Trả lời:**
```
POST /upload HTTP/1.1
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="file"; filename="image.png"
Content-Type: image/png

[binary data]
------WebKitFormBoundary--
```

**Considerations:**
- `Content-Length` limit
- Streaming for large files
- Progress tracking
- Resumable uploads (tus protocol)

### Q73: API versioning có những cách nào?
**Trả lời:**

**1. URL Path:**
```
/api/v1/users
/api/v2/users
```

**2. Query Parameter:**
```
/api/users?version=1
```

**3. Header:**
```
Accept: application/vnd.company.v1+json
X-API-Version: 1
```

**4. Content Negotiation:**
```
Accept: application/vnd.company.user.v1+json
```

### Q74: Làm sao implement authentication cho API?
**Trả lời:**

**1. API Key:**
```
X-API-Key: your-api-key
```

**2. Basic Auth:**
```
Authorization: Basic base64(username:password)
```

**3. Bearer Token (JWT):**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**4. OAuth 2.0:**
- Authorization Code flow
- Client Credentials flow
- Refresh tokens

### Q75: Request timeout được handle như thế nào?
**Trả lời:**
- **Client-side**: Set timeout, retry logic
- **Server-side**: 408 Request Timeout
- **Load balancer**: 504 Gateway Timeout
- **Best practices**:
  - Different timeouts cho different operations
  - Exponential backoff for retries
  - Circuit breaker pattern
  - Idempotency keys for safe retries

### Q76: Làm sao handle large responses?
**Trả lời:**
1. **Pagination**: Chia nhỏ results
2. **Streaming**: Chunked transfer
3. **Compression**: gzip/Brotli
4. **Field selection**: GraphQL hoặc `?fields=id,name`
5. **Cursor-based pagination**: Cho datasets lớn
6. **Background job**: Trả về job ID, poll for result

### Q77: HTTP request bị block bởi CORS, fix như thế nào?
**Trả lời:**
**Server-side (recommended):**
```
Access-Control-Allow-Origin: https://your-frontend.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

**Development workarounds:**
- Proxy trong dev server
- Browser extension (chỉ dev)
- CORS proxy service (không dùng cho production)

### Q78: Làm sao secure một HTTP API?
**Trả lời:**
1. **Always use HTTPS**
2. **Authentication**: JWT, OAuth, API keys
3. **Authorization**: Role-based access control
4. **Rate limiting**: Prevent abuse
5. **Input validation**: Prevent injection
6. **Security headers**: HSTS, CSP, etc.
7. **CORS**: Proper configuration
8. **Audit logging**: Track access
9. **API Gateway**: Centralized security
10. **Secrets management**: Don't hardcode keys

### Q79: HTTP/2 có thể giúp cải thiện performance như thế nào?
**Trả lời:**
**Automatic improvements:**
- Multiplexing: No HOL blocking
- Header compression: Less overhead
- Single connection: Better resource usage

**Manual optimization:**
- Remove domain sharding (không còn cần)
- Remove concatenation (multiplexing hiệu quả hơn)
- Use server push (cẩn thận)
- Prioritize critical resources

### Q80: Giải thích flow khi user đăng nhập vào website.
**Trả lời:**
**Session-based:**
1. User submit credentials (POST /login)
2. Server verify credentials
3. Server tạo session, lưu vào session store
4. Server gửi `Set-Cookie: session_id=abc123; HttpOnly; Secure`
5. Browser lưu cookie
6. Requests tiếp theo gửi kèm cookie
7. Server lookup session từ store
8. Logout: Server xóa session, clear cookie

**JWT-based:**
1. User submit credentials (POST /login)
2. Server verify credentials
3. Server tạo JWT với claims
4. Server trả về token trong response body
5. Client lưu token (localStorage, memory, cookie)
6. Requests gửi `Authorization: Bearer <token>`
7. Server verify token signature
8. Logout: Client xóa token (server-side blacklist optional)

---

## Bonus: Checklist Trước Phỏng Vấn

### Phải biết:
- [ ] HTTP methods và ý nghĩa
- [ ] Common status codes
- [ ] Request/Response structure
- [ ] Headers quan trọng
- [ ] HTTP/1.1 vs HTTP/2 differences
- [ ] HTTPS và TLS handshake
- [ ] Cookies và security attributes
- [ ] Caching mechanisms
- [ ] CORS
- [ ] REST principles

### Nên biết:
- [ ] HTTP/3 và QUIC
- [ ] WebSocket vs SSE vs Long Polling
- [ ] Authentication methods
- [ ] Rate limiting
- [ ] API versioning
- [ ] Performance optimization

### Thực hành:
- [ ] Dùng curl để test APIs
- [ ] Đọc Network tab trong DevTools
- [ ] Build một REST API đơn giản
- [ ] Implement caching
- [ ] Handle CORS issues

---

*Tài liệu này được tổng hợp cho mục đích học tập và phỏng vấn. Chúc bạn phỏng vấn thành công!*
