import { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, QrCode, RefreshCw, Scan, ShieldAlert, XCircle } from 'lucide-react';
import { ticketsApi } from '../../api/ticketsApi';
import { formatDateShort } from '../../api/client';
import type { CheckinScanResult, ScanRecord, ScanResponse } from '../../api/types';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export function CheckinStaffView() {
  const { role } = useAuth();
  const [qrInput, setQrInput] = useState('');
  const [deviceId, setDeviceId] = useState('GATE-MAIN-01');
  const [note, setNote] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState('');

  const canAccess = role === 'CHECK_IN_STAFF' || role === 'ADMIN';

  const loadRecentScans = async () => {
    setLoadingHistory(true);
    try {
      const list = await ticketsApi.getRecentScans();
      setScanHistory(list);
    } catch (err: any) {
      console.error('Failed to load recent scans:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (canAccess) {
      loadRecentScans();
    }
  }, [canAccess]);

  if (!canAccess) {
    return (
      <section style={{ maxWidth: '600px', margin: '4rem auto', padding: '2rem', textAlign: 'center', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155' }}>
        <ShieldAlert size={48} style={{ color: '#f87171', margin: '0 auto 1rem' }} />
        <h2 style={{ color: '#f8fafc', margin: '0 0 0.5rem' }}>Truy cập bị từ chối</h2>
        <p style={{ color: '#94a3b8' }}>
          Chỉ nhân viên soát vé (CHECK_IN_STAFF) hoặc Quản trị viên (ADMIN) mới có quyền truy cập cổng kiểm tra vé.
        </p>
      </section>
    );
  }

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrInput.trim()) return;

    setScanning(true);
    setError('');
    setScanResult(null);

    try {
      const res = await ticketsApi.scanTicket({
        qrPayload: qrInput.trim(),
        deviceId,
        note: note.trim() || undefined,
      });
      setScanResult(res);
      setQrInput('');
      loadRecentScans();
    } catch (err: any) {
      setError(err?.message || 'Không thể quét vé.');
    } finally {
      setScanning(false);
    }
  };

  const resultMap: Record<CheckinScanResult, { label: string; icon: any; color: string; bg: string; desc: string }> = {
    ACCEPTED: {
      label: 'HỢP LỆ (VÀO CỔNG)',
      icon: CheckCircle2,
      color: '#34d399',
      bg: 'rgba(52, 211, 153, 0.15)',
      desc: 'Vé chính xác và chưa từng sử dụng. Cho phép khách vào khán phòng.',
    },
    ALREADY_USED: {
      label: 'ĐÃ SỬ DỤNG TRƯỚC ĐÓ',
      icon: AlertTriangle,
      color: '#fbbf24',
      bg: 'rgba(251, 191, 36, 0.15)',
      desc: 'Cảnh báo: Vé này đã được quét qua cổng lúc trước. Không cho phép vào lại!',
    },
    CANCELLED: {
      label: 'VÉ ĐÃ BỊ HỦY',
      icon: XCircle,
      color: '#f87171',
      bg: 'rgba(239, 68, 68, 0.15)',
      desc: 'Đơn đặt vé này đã bị người mua hoặc ban tổ chức hủy.',
    },
    INVALID: {
      label: 'VÉ KHÔNG HỢP LỆ',
      icon: AlertCircle,
      color: '#94a3b8',
      bg: 'rgba(148, 163, 184, 0.15)',
      desc: 'Mã QR không tồn tại trong hệ thống hoặc chữ ký bảo mật bị làm giả.',
    },
  };

  return (
    <section className="checkin-container" style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Scan style={{ color: '#34d399' }} /> Kiểm soát vé tại cổng
        </h1>
        <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.95rem' }}>
          Quét mã QR hoặc nhập chuỗi ký tự vé để xác thực quyền vào cổng thời gian thực
        </p>
      </div>

      {/* Scanner Form */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.75rem', marginBottom: '2rem' }}>
        <form onSubmit={handleScanSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.5rem' }}>
              Nội dung mã QR (qrPayload / ticketCode)
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <QrCode size={18} style={{ position: 'absolute', left: '0.85rem', color: '#64748b' }} />
              <input
                type="text"
                autoFocus
                required
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                placeholder="Nhập hoặc dán chuỗi QR (ví dụ: TKT-xxx hoặc hash token)..."
                style={{
                  width: '100%',
                  padding: '0.75rem 0.85rem 0.75rem 2.5rem',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '0.95rem',
                  fontFamily: 'monospace',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem' }}>Mã thiết bị cổng</label>
              <input
                type="text"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                style={{ width: '100%', padding: '0.55rem 0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem' }}>Ghi chú thêm (tùy chọn)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Cổng 1, VIP..."
                style={{ width: '100%', padding: '0.55rem 0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={scanning || !qrInput.trim()}
            style={{
              padding: '0.85rem',
              background: scanning || !qrInput.trim() ? '#334155' : '#059669',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: scanning || !qrInput.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            {scanning ? <RefreshCw size={18} className="spin" /> : <Scan size={18} />}
            {scanning ? 'Đang xác thực...' : 'Quét vé ngay'}
          </button>
        </form>

        {/* Scan Result Feedback Card */}
        {scanResult && (
          <div
            style={{
              marginTop: '1.5rem',
              padding: '1.5rem',
              borderRadius: '8px',
              background: resultMap[scanResult.result]?.bg || '#334155',
              border: `2px solid ${resultMap[scanResult.result]?.color || '#94a3b8'}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              {(() => {
                const IconComponent = resultMap[scanResult.result]?.icon || AlertCircle;
                return <IconComponent size={28} style={{ color: resultMap[scanResult.result]?.color }} />;
              })()}
              <div>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: resultMap[scanResult.result]?.color }}>
                  {resultMap[scanResult.result]?.label}
                </span>
                {scanResult.ticketCode && (
                  <span style={{ marginLeft: '0.75rem', fontSize: '0.85rem', color: '#f8fafc', fontFamily: 'monospace' }}>
                    [{scanResult.ticketCode}]
                  </span>
                )}
              </div>
            </div>

            <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.95rem' }}>
              {resultMap[scanResult.result]?.desc}
            </p>

            {scanResult.usedAt && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                Thời điểm quét: {formatDateShort(scanResult.usedAt)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent Scans Table */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.15rem', color: '#f8fafc', margin: 0 }}>
            Lịch sử quét vé gần nhất
          </h2>
          <button
            type="button"
            onClick={loadRecentScans}
            disabled={loadingHistory}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.4rem 0.75rem',
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#94a3b8',
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={12} className={loadingHistory ? 'spin' : ''} /> Cập nhật
          </button>
        </div>

        {loadingHistory ? (
          <LoadingSpinner message="Đang nạp lịch sử quét..." />
        ) : scanHistory.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
            Chưa có lượt quét vé nào được ghi nhận trong phiên làm việc này.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', textAlign: 'left', color: '#64748b' }}>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Thời gian</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Mã vé</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Kết quả</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Thiết bị</th>
                </tr>
              </thead>
              <tbody>
                {scanHistory.map((scan) => {
                  const cfg = resultMap[scan.result] || { label: scan.result, color: '#94a3b8' };
                  return (
                    <tr key={scan.id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '0.65rem 0.75rem', color: '#cbd5e1' }}>
                        {formatDateShort(scan.scannedAt)}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'monospace', color: '#f8fafc' }}>
                        {scan.ticketCode || 'N/A'}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <span
                          style={{
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: `${cfg.color}20`,
                            color: cfg.color,
                          }}
                        >
                          {cfg.label}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', color: '#94a3b8' }}>
                        {scan.deviceId || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
