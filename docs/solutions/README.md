# Solutions Overview

## Mục Lục

- [2.1 Baseline](./2.1-baseline.md) - DELETE-THEN-INSERT (có vấn đề)
- [2.2 Blue-Green](./2.2-blue-green.md) - **Recommended** - INSERT trước, DELETE sau
- [2.3 Soft-Delete](./2.3-soft-delete.md) - Đánh dấu inactive thay vì xóa
- [2.4 Locking](./2.4-locking.md) - Distributed locking với Redis

---

## So sánh nhanh

| Solution | Availability | Avg Latency | Crash Recovery | Recommendation |
|----------|-------------|-------------|----------------|----------------|
| [Baseline](./2.1-baseline.md) | ~38% | 5ms | ❌ Document LOST | ❌ Tránh sử dụng |
| [**Blue-Green**](./2.2-blue-green.md) | **100%** | 16ms | ✅ Document vẫn còn | ✅ **Recommended** |
| [Soft-Delete](./2.3-soft-delete.md) | **100%** | 38ms | ✅ Document vẫn còn | ✅ Nếu cần audit |
| [Locking](./2.4-locking.md) | ~75% | 41ms | ⚠️ Lock stuck risk | ⚠️ Không ổn định |

---

## Khi nào dùng giải pháp nào?

| Use Case | Recommended Solution |
|----------|---------------------|
| Production system, cần high availability | [**Blue-Green**](./2.2-blue-green.md) |
| Cần audit trail, rollback capability | [Soft-Delete](./2.3-soft-delete.md) |
| Development/testing only | [Baseline](./2.1-baseline.md) (acceptable) |
| Legacy system với Redis | [Locking](./2.4-locking.md) (cẩn thận) |

---

## Trade-offs Visualization

```
                    Availability
                         ↑
                         │
    Blue-Green ●─────────┼─────────● Soft-Delete
         (16ms)          │              (38ms)
                         │
                         │
                         │     ● Locking (~75%)
                         │       (41ms)
                         │
         ● Baseline      │
           (~38%)        │
                         └──────────────────────→ Latency
```
