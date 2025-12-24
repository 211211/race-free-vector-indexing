# Solutions

Tài liệu về các solutions đã được chuyển sang folder riêng để dễ quản lý.

## Xem chi tiết

- [Solutions Overview](./solutions/README.md) - Tổng quan và so sánh
- [2.1 Baseline](./solutions/2.1-baseline.md) - DELETE-THEN-INSERT (có vấn đề)
- [2.2 Blue-Green](./solutions/2.2-blue-green.md) - **Recommended**
- [2.3 Soft-Delete](./solutions/2.3-soft-delete.md) - Hỗ trợ audit trail
- [2.4 Locking](./solutions/2.4-locking.md) - Khóa phân tán

## So sánh nhanh

| Solution | Availability | Avg Latency | Recommendation |
|----------|-------------|-------------|----------------|
| Baseline | ~38% | 5ms | ❌ Tránh sử dụng |
| **Blue-Green** | **100%** | 16ms | ✅ **Recommended** |
| Soft-Delete | **100%** | 38ms | ✅ Nếu cần audit |
| Locking | ~75% | 41ms | ⚠️ Không ổn định |
