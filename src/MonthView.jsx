import { useMemo, useState } from "react";
import { CATEGORIES, MONTHS } from "./App";

const CAT_COLORS = { Needs: "#34d399", Wants: "#fb923c", Investments: "#60a5fa" };

function fmt(n) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function fmtDate(str) {
  const d = new Date(str);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function MonthView({ expenses, selectedMonth, setSelectedMonth, onDelete, onBack }) {
  const { month, year } = selectedMonth;
  const [filterCat, setFilterCat] = useState("All");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const monthExp = useMemo(() => {
    return expenses
      .filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === month && d.getFullYear() === year;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [expenses, month, year]);

  const filtered = filterCat === "All" ? monthExp : monthExp.filter(e => e.category === filterCat);

  const totals = useMemo(() => {
    const t = { Needs: 0, Wants: 0, Investments: 0, total: 0 };
    monthExp.forEach(e => {
      t[e.category] = (t[e.category] || 0) + e.amount;
      t.total += e.amount;
    });
    return t;
  }, [monthExp]);

  const prevMonth = () => {
    let m = month - 1, y = year;
    if (m < 0) { m = 11; y--; }
    if (y < 2026) return;
    setSelectedMonth({ month: m, year: y });
  };

  const nextMonth = () => {
    const now = new Date();
    let m = month + 1, y = year;
    if (m > 11) { m = 0; y++; }
    if (y > now.getFullYear() || (y === now.getFullYear() && m > now.getMonth())) return;
    setSelectedMonth({ month: m, year: y });
  };

  return (
    <div style={{ padding: "24px 16px 0" }}>
      <style>{`
        .mv-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
        .mv-title { font-size: 20px; font-weight: 800; }
        .mv-back {
          background: var(--surface2); border: 1px solid var(--border);
          border-radius: 10px; width: 36px; height: 36px;
          color: var(--text); cursor: pointer; font-size: 16px;
          display: flex; align-items: center; justify-content: center;
        }
        .mv-month-nav { margin-left: auto; display: flex; align-items: center; gap: 8px; }
        .mv-month-nav button {
          background: var(--surface2); border: 1px solid var(--border);
          border-radius: 8px; width: 28px; height: 28px;
          color: var(--text); cursor: pointer; font-size: 14px;
          display: flex; align-items: center; justify-content: center;
        }
        .mv-month-label { font-size: 13px; font-weight: 600; min-width: 72px; text-align: center; font-family: 'JetBrains Mono', monospace; }

        .summary-strip { display: flex; gap: 8px; margin-bottom: 16px; }
        .strip-item {
          flex: 1; background: var(--surface); border: 1px solid var(--border);
          border-radius: 12px; padding: 10px;
        }
        .strip-label { font-size: 10px; color: var(--muted); font-family: 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: 0.08em; }
        .strip-val { font-size: 14px; font-weight: 700; margin-top: 2px; font-family: 'JetBrains Mono', monospace; }

        .filter-row { display: flex; gap: 6px; margin-bottom: 16px; overflow-x: auto; scrollbar-width: none; padding-bottom: 2px; }
        .filter-row::-webkit-scrollbar { display: none; }
        .filter-chip {
          padding: 6px 14px; border-radius: 99px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--muted);
          cursor: pointer; font-family: 'Outfit', sans-serif;
          font-size: 12px; font-weight: 600;
          white-space: nowrap; flex-shrink: 0;
          transition: all 0.15s;
        }
        .filter-chip.active { color: var(--text); border-color: var(--accent); background: rgba(129,140,248,0.1); }

        .entry-list { display: flex; flex-direction: column; gap: 8px; }
        .entry-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 14px;
          display: flex; align-items: center; gap: 12px;
          animation: fadeUp 0.2s ease;
        }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; } }
        .entry-icon {
          width: 40px; height: 40px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; flex-shrink: 0;
        }
        .entry-info { flex: 1; min-width: 0; }
        .entry-sub { font-size: 14px; font-weight: 700; }
        .entry-meta { font-size: 11px; color: var(--muted); margin-top: 2px; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
        .entry-bank { background: var(--surface2); padding: 2px 7px; border-radius: 99px; font-family: 'JetBrains Mono', monospace; }
        .entry-note { font-style: italic; opacity: 0.7; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 120px; }
        .entry-right { text-align: right; flex-shrink: 0; }
        .entry-amt { font-size: 16px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
        .entry-date { font-size: 11px; color: var(--muted); margin-top: 2px; }
        .entry-del {
          background: none; border: none; color: rgba(248,113,113,0.4);
          cursor: pointer; font-size: 16px; padding: 4px;
          transition: color 0.2s;
        }
        .entry-del:hover { color: #f87171; }

        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.6);
          display: flex; align-items: center; justify-content: center;
          z-index: 200; padding: 20px;
        }
        .modal {
          background: var(--surface2); border: 1px solid var(--border);
          border-radius: 20px; padding: 24px; max-width: 300px; width: 100%;
        }
        .modal-title { font-size: 17px; font-weight: 700; margin-bottom: 8px; }
        .modal-sub { font-size: 13px; color: var(--muted); margin-bottom: 20px; }
        .modal-btns { display: flex; gap: 10px; }
        .modal-cancel {
          flex: 1; padding: 12px; background: var(--surface);
          border: 1px solid var(--border); border-radius: 12px;
          color: var(--text); cursor: pointer;
          font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 600;
        }
        .modal-del {
          flex: 1; padding: 12px; background: rgba(248,113,113,0.15);
          border: 1px solid rgba(248,113,113,0.3); border-radius: 12px;
          color: #f87171; cursor: pointer;
          font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 600;
        }
        .empty-mv { text-align: center; padding: 50px 20px; color: var(--muted); font-size: 14px; }
      `}</style>

      <div className="mv-header">
        <button className="mv-back" onClick={onBack}>←</button>
        <div className="mv-title">Entries</div>
        <div className="mv-month-nav">
          <button onClick={prevMonth}>‹</button>
          <div className="mv-month-label">{MONTHS[month]} {year}</div>
          <button onClick={nextMonth}>›</button>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="summary-strip">
        {[["Total", totals.total, "#818cf8"], ["Needs", totals.Needs, "#34d399"], ["Wants", totals.Wants, "#fb923c"], ["Invest", totals.Investments, "#60a5fa"]].map(([l, v, c]) => (
          <div className="strip-item" key={l}>
            <div className="strip-label">{l}</div>
            <div className="strip-val" style={{ color: c }}>{fmt(v || 0)}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filter-row">
        {["All", "Needs", "Wants", "Investments"].map(f => (
          <button key={f} className={`filter-chip ${filterCat === f ? "active" : ""}`} onClick={() => setFilterCat(f)}>
            {f === "All" ? "All" : `${CATEGORIES[f].icon} ${f}`}
          </button>
        ))}
      </div>

      {/* Entry List */}
      {filtered.length === 0 ? (
        <div className="empty-mv">No entries found</div>
      ) : (
        <div className="entry-list">
          {filtered.map(e => (
            <div className="entry-card" key={e.id}>
              <div className="entry-icon" style={{ background: `${CAT_COLORS[e.category]}18` }}>
                {CATEGORIES[e.category].icon}
              </div>
              <div className="entry-info">
                <div className="entry-sub">{e.subcategory}</div>
                <div className="entry-meta">
                  <span style={{ color: CAT_COLORS[e.category], fontWeight: 600 }}>{e.category}</span>
                  <span className="entry-bank">{e.bank}</span>
                  {e.note && <span className="entry-note">{e.note}</span>}
                </div>
              </div>
              <div className="entry-right">
                <div className="entry-amt" style={{ color: CAT_COLORS[e.category] }}>−{fmt(e.amount)}</div>
                <div className="entry-date">{fmtDate(e.date)}</div>
              </div>
              <button className="entry-del" onClick={() => setConfirmDelete(e.id)}>✕</button>
            </div>
          ))}
        </div>
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Delete entry?</div>
            <div className="modal-sub">This action cannot be undone.</div>
            <div className="modal-btns">
              <button className="modal-cancel" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="modal-del" onClick={() => { onDelete(confirmDelete); setConfirmDelete(null); }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
