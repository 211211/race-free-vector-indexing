# So Sánh Các Phiên Bản HTTP

## HTTP/0.9 (1991)

- **Phiên bản đầu tiên** của giao thức HTTP
- Chỉ hỗ trợ phương thức **GET** duy nhất
- Không có HTTP headers
- Không có status code
- Chỉ truyền được file HTML thuần túy
- Kết nối đóng ngay sau mỗi response
- Không hỗ trợ cookies hay sessions

## HTTP/1.0 (1996)

- Thêm **HTTP headers** (Content-Type, Content-Length, etc.)
- Hỗ trợ nhiều phương thức: **GET, POST, HEAD**
- Có **status code** (200, 404, 500, etc.)
- Hỗ trợ nhiều loại content (hình ảnh, video, scripts, etc.)
- **Mỗi request cần một kết nối TCP mới** (không persistent)
- Thêm header `Content-Type` cho phép truyền các loại file khác nhau
- Hỗ trợ caching cơ bản với `Expires` header

## HTTP/1.1 (1997)

- **Persistent connections** (Keep-Alive) - mặc định giữ kết nối
- **Pipelining** - gửi nhiều request mà không cần đợi response (nhưng response vẫn phải theo thứ tự)
- Thêm phương thức: **PUT, DELETE, TRACE, OPTIONS, CONNECT, PATCH**
- **Chunked transfer encoding** - truyền data theo từng phần
- **Host header bắt buộc** - cho phép nhiều domain trên cùng IP (virtual hosting)
- Cải thiện **cache control** với Cache-Control header
- **Range requests** - tải một phần của file (hỗ trợ resume download)
- Vấn đề **Head-of-Line (HOL) blocking** - request sau phải đợi request trước hoàn thành

## HTTP/2.0 (2015)

- **Binary protocol** thay vì text-based (nhanh hơn để parse)
- **Multiplexing** - nhiều request/response song song trên cùng một kết nối TCP
- **Header compression** (HPACK) - giảm overhead
- **Server Push** - server có thể gửi resources trước khi client yêu cầu
- **Stream prioritization** - ưu tiên các request quan trọng
- **Giải quyết HOL blocking** ở tầng HTTP (nhưng vẫn còn ở tầng TCP)
- Bắt buộc **TLS/HTTPS** trên hầu hết browsers
- Một kết nối TCP duy nhất cho tất cả requests

## Bảng So Sánh Tổng Quan

| Tính năng | HTTP/0.9 | HTTP/1.0 | HTTP/1.1 | HTTP/2.0 |
|-----------|----------|----------|----------|----------|
| Năm phát hành | 1991 | 1996 | 1997 | 2015 |
| Phương thức | GET | GET, POST, HEAD | +PUT, DELETE, etc. | Tương tự 1.1 |
| Headers | Không | Có | Có | Có (nén) |
| Persistent Connection | Không | Không (mặc định) | Có | Có |
| Multiplexing | Không | Không | Không | Có |
| Server Push | Không | Không | Không | Có |
| Binary Protocol | Không | Không | Không | Có |
| Bảo mật | Không | Tùy chọn | Tùy chọn | Gần như bắt buộc |

---

# Câu Hỏi Phỏng Vấn Phổ Biến Trong Lập Trình

## 1. Data Structures & Algorithms (DSA)

### Arrays & Strings
- Two Sum / Three Sum problem
- Maximum subarray (Kadane's algorithm)
- Merge sorted arrays
- String reversal và palindrome checking
- Sliding window problems
- Two pointers technique
- Anagram detection
- Longest substring without repeating characters

### Linked Lists
- Reverse a linked list
- Detect cycle in linked list (Floyd's algorithm)
- Merge two sorted linked lists
- Find middle of linked list
- Remove nth node from end
- LRU Cache implementation

### Trees & Graphs
- Binary tree traversals (inorder, preorder, postorder, level-order)
- Validate Binary Search Tree
- Lowest Common Ancestor
- Maximum depth of binary tree
- BFS vs DFS
- Dijkstra's algorithm
- Topological sort
- Detect cycle in graph
- Number of islands

### Dynamic Programming
- Fibonacci sequence
- Climbing stairs
- Coin change problem
- Longest Common Subsequence
- Knapsack problem
- House robber
- Maximum product subarray
- Edit distance

### Sorting & Searching
- Quick sort, Merge sort, Heap sort
- Binary search và biến thể
- Kth largest/smallest element
- Search in rotated sorted array

## 2. System Design (Rất Hot Hiện Nay)

### Câu hỏi phổ biến
- Design URL shortener (TinyURL)
- Design Twitter/X timeline
- Design Instagram/Facebook feed
- Design chat system (WhatsApp, Messenger)
- Design video streaming (YouTube, Netflix)
- Design ride-sharing (Uber, Grab)
- Design e-commerce system (Amazon)
- Design notification system
- Design rate limiter
- Design distributed cache
- Design search autocomplete
- Design file storage (Dropbox, Google Drive)
- Design payment system

### Concepts cần biết
- CAP theorem
- Horizontal vs Vertical scaling
- Load balancing
- Database sharding & replication
- Caching strategies (Redis, Memcached)
- Message queues (Kafka, RabbitMQ)
- Microservices vs Monolith
- API Gateway
- CDN
- Consistent hashing

## 3. Database & SQL

- ACID properties
- SQL vs NoSQL - khi nào dùng gì?
- Indexing và cách hoạt động
- JOIN types (INNER, LEFT, RIGHT, FULL)
- Query optimization
- Database normalization
- Transactions và isolation levels
- Deadlock và cách xử lý
- N+1 query problem
- Write complex queries (GROUP BY, HAVING, subqueries)

## 4. Object-Oriented Programming (OOP)

- 4 pillars: Encapsulation, Abstraction, Inheritance, Polymorphism
- SOLID principles
- Design patterns phổ biến:
  - Singleton
  - Factory
  - Observer
  - Strategy
  - Decorator
  - Adapter
- Abstract class vs Interface
- Composition vs Inheritance

## 5. Networking & Web

- HTTP/HTTPS hoạt động như thế nào?
- TCP vs UDP
- REST vs GraphQL vs gRPC
- WebSocket
- DNS resolution process
- SSL/TLS handshake
- CORS
- Cookies vs Sessions vs JWT
- OAuth 2.0 flow
- What happens when you type google.com in browser?

## 6. Operating Systems & Concurrency

- Process vs Thread
- Deadlock conditions và prevention
- Mutex vs Semaphore
- Race condition
- Memory management (Stack vs Heap)
- Virtual memory
- Context switching
- Producer-Consumer problem

## 7. JavaScript/Frontend (Hot cho Web Dev)

### Core JavaScript
- Event loop và call stack
- Closures
- Promises vs Async/Await
- Prototype inheritance
- this keyword
- Hoisting
- == vs ===
- let vs const vs var
- Event delegation và bubbling
- Debounce vs Throttle

### React (Framework phổ biến nhất)
- Virtual DOM hoạt động như thế nào?
- Class components vs Functional components
- Hooks (useState, useEffect, useCallback, useMemo, useRef)
- State management (Redux, Context API, Zustand)
- Component lifecycle
- React performance optimization
- Server-side rendering (SSR) vs Client-side rendering (CSR)
- React Server Components

### TypeScript
- Type vs Interface
- Generics
- Union và Intersection types
- Type guards
- Utility types (Partial, Required, Pick, Omit)

## 8. DevOps & Cloud (Ngày càng quan trọng)

- Docker basics và Dockerfile
- Kubernetes concepts
- CI/CD pipelines
- Infrastructure as Code (Terraform)
- AWS/GCP/Azure services cơ bản
- Monitoring và logging
- Blue-green deployment vs Canary deployment

## 9. Security

- SQL Injection prevention
- XSS (Cross-Site Scripting)
- CSRF (Cross-Site Request Forgery)
- Authentication vs Authorization
- Hashing vs Encryption
- OWASP Top 10
- Secure password storage

## 10. AI/ML Interview Questions (Trending 2024-2025)

### Cho Software Engineers làm việc với AI
- RAG (Retrieval-Augmented Generation) là gì?
- Vector databases và embeddings
- Prompt engineering techniques
- Fine-tuning vs RAG
- LLM limitations và hallucinations
- Token và context window
- Temperature và các parameters của LLM
- AI agents và tool use

### Machine Learning Basics
- Supervised vs Unsupervised learning
- Overfitting và underfitting
- Bias-Variance tradeoff
- Cross-validation
- Precision vs Recall vs F1-score
- Gradient descent
- Neural network basics

## 11. Behavioral Questions

- Tell me about yourself
- Why do you want to work here?
- Describe a challenging project you worked on
- How do you handle conflicts with teammates?
- Tell me about a time you failed
- How do you prioritize tasks?
- Where do you see yourself in 5 years?
- Why are you leaving your current job?

## 12. Coding Best Practices

- Clean code principles
- Code review process
- Unit testing vs Integration testing vs E2E testing
- TDD (Test-Driven Development)
- Git workflow (branching strategies)
- Documentation best practices
- Error handling
- Logging strategies

---

## Tips Phỏng Vấn

1. **Leetcode**: Làm ít nhất 150-200 bài (Easy: 50, Medium: 100, Hard: 30)
2. **System Design**: Xem Gaurav Sen, ByteByteGo trên YouTube
3. **Mock interviews**: Pramp, Interviewing.io
4. **Communication**: Giải thích thought process rõ ràng
5. **Ask questions**: Clarify requirements trước khi code
6. **Time management**: Đừng stuck quá lâu ở một bài
7. **Review fundamentals**: Big O notation, recursion, OOP
