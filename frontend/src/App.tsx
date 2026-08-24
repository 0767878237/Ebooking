import { useState, type ReactNode } from 'react';
import { Building2, CheckCircle2, CreditCard, ShieldCheck, Ticket, UserRound } from 'lucide-react';

type Mode = 'USER' | 'ORGANIZER' | 'CHECK_IN_STAFF' | 'ADMIN';

const modeMeta: Record<Mode, { label: string; icon: ReactNode; title: string; summary: string }> = {
  USER: {
    label: 'Khach dat ve',
    icon: <UserRound size={16} />,
    title: 'Dat ve su kien',
    summary: 'Tim event, giu ghe, thanh toan sandbox va nhan QR ticket.',
  },
  ORGANIZER: {
    label: 'To chuc',
    icon: <Building2 size={16} />,
    title: 'Quan ly su kien',
    summary: 'Tao venue, mo show, quan sat booking va doi soat doanh thu.',
  },
  CHECK_IN_STAFF: {
    label: 'Kiem ve',
    icon: <Ticket size={16} />,
    title: 'Quet ve tai cong',
    summary: 'Xac thuc QR, danh dau da vao cua va chan ve da dung.',
  },
  ADMIN: {
    label: 'Quan tri',
    icon: <ShieldCheck size={16} />,
    title: 'Dieu hanh he thong',
    summary: 'Quan ly nguoi dung, vai tro, cau hinh va giam sat hoat dong.',
  },
};

const coreSteps = [
  'Dang ky / dang nhap',
  'Duyet thanh pho va venue',
  'Tim event',
  'Chon show va ghe',
  'Giu ghe co thoi han',
  'Thanh toan sandbox',
  'Nhan ticket QR',
  'Xem / huy booking',
  'Quet ve tai cong',
];

function App() {
  const [mode, setMode] = useState<Mode>('USER');
  const meta = modeMeta[mode];

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">E Booking</p>
          <h1>Modular monolith cho dat ve su kien</h1>
        </div>
        <div className="status-pill">
          <CheckCircle2 size={16} />
          San sang cho buoc tiep theo
        </div>
      </header>

      <section className="modebar" aria-label="Role selector">
        {(Object.keys(modeMeta) as Mode[]).map((item) => (
          <button
            key={item}
            type="button"
            className={item === mode ? 'mode active' : 'mode'}
            onClick={() => setMode(item)}
          >
            {modeMeta[item].icon}
            <span>{modeMeta[item].label}</span>
          </button>
        ))}
      </section>

      <section className="grid">
        <article className="panel">
          <p className="eyebrow">Vai tro hien tai</p>
          <h2>{meta.title}</h2>
          <p className="lede">{meta.summary}</p>
        </article>

        <article className="panel">
          <p className="eyebrow">Luong chinh</p>
          <ol className="flow">
            {coreSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </article>

        <article className="panel">
          <p className="eyebrow">Nen tang</p>
          <ul className="stack">
            <li>Spring Boot 3.5.16 + Java 21</li>
            <li>PostgreSQL + Flyway + JPA</li>
            <li>Security + Actuator + OpenAPI</li>
            <li>React 19 + TypeScript + Vite</li>
          </ul>
        </article>

        <article className="panel">
          <p className="eyebrow">Soat nhanh</p>
          <div className="checklist">
            <div>
              <span className="label">Chong ban trung ghe</span>
              <span className="value">Inventory reserved by hold window</span>
            </div>
            <div>
              <span className="label">Modify booking</span>
              <span className="value">Cancel then rebook in MVP</span>
            </div>
            <div>
              <span className="label">Scale story</span>
              <span className="value">Design for growth, prove with load tests</span>
            </div>
            <div>
              <span className="label">Operations</span>
              <span className="value">Health, metrics, docs</span>
            </div>
          </div>
        </article>
      </section>

      <footer className="footer">
        <CreditCard size={16} />
        <span>Local stack: backend, PostgreSQL, frontend</span>
      </footer>
    </main>
  );
}

export default App;
