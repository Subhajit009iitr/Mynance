import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts";
import { CATEGORIES, MONTHS } from "./App";

const CAT_COLORS = {
  Needs: "#34d399",
  Wants: "#fb923c",
  Investments: "#60a5fa",
};

function getMonthExpenses(expenses, month, year) {
  return expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
}

function fmt(n) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function Dashboard({ expenses, selectedMonth, setSelectedMonth, onViewMonth }) {
  const { month, year } = selectedMonth;

  const monthExp = useMemo(() => getMonthExpenses(expenses, month, year), [expenses, month, year]);

  const totals = useMemo(() => {
    const t = { Needs: 0, Wants: 0, Investments: 0 };
    monthExp.forEach(e => { if (t[e.category] !== undefined) t[e.category] += e.amount; });
    return t;
  }, [monthExp]);

  const total = totals.Needs + totals.Wants + totals.Investments;

  const pieData = Object.entries(totals)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: k, value: v }));

  // Sub-category breakdown for current month
  const subBreakdown = useMemo(() => {
    const map = {};
    monthExp.forEach(e => {
      const key = `${e.category}__${e.subcategory}`;
      map[key] = (map[key] || 0) + e.amount;
    });
    return map;
  }, [monthExp]);

  // Monthly bar chart: Jan 2026 to current month
  const barData = useMemo(() => {
    const result = [];
    let y = 2026, m = 0;
    const now = new Date();
    while (y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth())) {
      const exps = getMonthExpenses(expenses, m, y);
      const needs = exps.filter(e => e.category === "Needs").reduce((a, b) => a + b.amount, 0);
      const wants = exps.filter(e => e.category === "Wants").reduce((a, b) => a + b.amount, 0);
      const invest = exps.filter(e => e.category === "Investments").reduce((a, b) => a + b.amount, 0);
      result.push({ label: MONTHS[m], needs, wants, invest, month: m, year: y });
      m++;
      if (m > 11) { m = 0; y++; }
    }
    return result;
  }, [expenses]);

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
        .dash-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
        .dash-title { font-size: 22px; font-weight: 800; }
        .dash-sub { font-size: 12px; color: var(--muted); font-family: 'JetBrains Mono', monospace; margin-top: 2px; }
        .month-nav { display: flex; align-items: center; gap: 10px; }
        .month-nav button {
          background: var(--surface2); border: 1px solid var(--border);
          border-radius: 8px; width: 28px; height: 28px;
          color: var(--text); cursor: pointer; font-size: 14px;
          display: flex; align-items: center; justify-content: center;
        }
        .month-nav button:hover { background: var(--surface); }
        .month-label { font-size: 14px; font-weight: 600; min-width: 80px; text-align: center; }

        .total-card {
          background: linear-gradient(135deg, #1e2030, #141620);
          border: 1px solid rgba(129,140,248,0.2);
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 16px;
          position: relative;
          overflow: hidden;
        }
        .total-card::before {
          content: '';
          position: absolute; top: -40px; right: -40px;
          width: 140px; height: 140px;
          background: radial-gradient(circle, rgba(129,140,248,0.15), transparent 70%);
          border-radius: 50%;
        }
        .total-label { font-size: 11px; color: var(--muted); font-family: 'JetBrains Mono', monospace; letter-spacing: 0.1em; text-transform: uppercase; }
        .total-amount { font-size: 40px; font-weight: 800; margin: 4px 0 16px; }
        .cat-pills { display: flex; gap: 8px; flex-wrap: wrap; }
        .cat-pill {
          display: flex; align-items: center; gap: 6px;
          background: rgba(255,255,255,0.06);
          border-radius: 99px; padding: 5px 12px;
          font-size: 12px; font-weight: 600;
        }
        .cat-dot { width: 7px; height: 7px; border-radius: 50%; }

        .section-title { font-size: 13px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px; font-family: 'JetBrains Mono', monospace; }

        .pie-row { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
        .pie-legend { flex: 1; display: flex; flex-direction: column; gap: 10px; }
        .legend-item { display: flex; align-items: center; justify-content: space-between; }
        .legend-left { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; }
        .legend-bar-wrap { flex: 1; height: 4px; background: rgba(255,255,255,0.08); border-radius: 99px; margin: 0 10px; overflow: hidden; }
        .legend-bar { height: 100%; border-radius: 99px; }
        .legend-val { font-size: 12px; font-family: 'JetBrains Mono', monospace; color: var(--muted); }

        .sub-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 20px; }
        .sub-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 12px 14px;
        }
        .sub-card-cat { font-size: 10px; color: var(--muted); font-family: 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: 0.08em; }
        .sub-card-name { font-size: 13px; font-weight: 600; margin: 2px 0; }
        .sub-card-amt { font-size: 15px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }

        .bar-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 16px; margin-bottom: 20px; }
        .view-all-btn {
          width: 100%; padding: 14px;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 14px;
          color: var(--text);
          font-family: 'Outfit', sans-serif;
          font-size: 14px; font-weight: 600;
          cursor: pointer; margin-bottom: 16px;
          transition: all 0.2s;
        }
        .view-all-btn:hover { background: var(--surface); border-color: rgba(129,140,248,0.3); }
        .empty-state { text-align: center; padding: 40px 20px; color: var(--muted); }
        .empty-icon { font-size: 40px; margin-bottom: 12px; }
        .empty-text { font-size: 15px; font-weight: 600; margin-bottom: 4px; color: var(--text); }
        .empty-sub { font-size: 13px; }
      `}</style>

      <div className="dash-header">
        <div>
          <div className="dash-title">Finance Tracker</div>
          <div className="dash-sub">Personal · 2026</div>
        </div>
        <div className="month-nav">
          <button onClick={prevMonth}>‹</button>
          <div className="month-label">{MONTHS[month]} {year}</div>
          <button onClick={nextMonth}>›</button>
        </div>
      </div>

      {/* Total Card */}
      <div className="total-card">
        <div className="total-label">Total Spent</div>
        <div className="total-amount">{fmt(total)}</div>
        <div className="cat-pills">
          {Object.entries(totals).map(([cat, val]) => (
            <div className="cat-pill" key={cat}>
              <div className="cat-dot" style={{ background: CAT_COLORS[cat] }} />
              <span>{CATEGORIES[cat].icon} {cat}</span>
              <span style={{ color: CAT_COLORS[cat], fontFamily: "JetBrains Mono, monospace" }}>{fmt(val)}</span>
            </div>
          ))}
        </div>
      </div>

      {monthExp.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <div className="empty-text">No entries for {MONTHS[month]} {year}</div>
          <div className="empty-sub">Tap + to add your first expense</div>
        </div>
      ) : (
        <>
          {/* Pie Chart */}
          {pieData.length > 0 && (
            <>
              <div className="section-title">Breakdown</div>
              <div className="pie-row">
                <div style={{ width: 130, height: 130, flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={58} dataKey="value" strokeWidth={0}>
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={CAT_COLORS[entry.name]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: "#1a1d26", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontFamily: "Outfit" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="pie-legend">
                  {Object.entries(totals).map(([cat, val]) => (
                    <div className="legend-item" key={cat}>
                      <div className="legend-left">
                        <div className="cat-dot" style={{ background: CAT_COLORS[cat] }} />
                        <span>{cat}</span>
                      </div>
                      <div className="legend-bar-wrap">
                        <div className="legend-bar" style={{ width: `${total ? (val / total) * 100 : 0}%`, background: CAT_COLORS[cat] }} />
                      </div>
                      <div className="legend-val">{total ? Math.round((val / total) * 100) : 0}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Top Sub-categories */}
          {Object.keys(subBreakdown).length > 0 && (
            <>
              <div className="section-title">Top Items</div>
              <div className="sub-grid">
                {Object.entries(subBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)
                  .map(([key, val]) => {
                    const [cat, sub] = key.split("__");
                    return (
                      <div className="sub-card" key={key} style={{ borderLeftColor: CAT_COLORS[cat], borderLeftWidth: 3 }}>
                        <div className="sub-card-cat">{cat}</div>
                        <div className="sub-card-name">{sub}</div>
                        <div className="sub-card-amt" style={{ color: CAT_COLORS[cat] }}>{fmt(val)}</div>
                      </div>
                    );
                  })}
              </div>
            </>
          )}
        </>
      )}

      {/* Monthly Bar Chart */}
      {barData.some(d => d.needs + d.wants + d.invest > 0) && (
        <>
          <div className="section-title">Monthly Overview · 2026</div>
          <div className="bar-wrap">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={barData} barSize={8} barGap={2}
                onClick={(d) => d && setSelectedMonth({ month: d.activePayload?.[0]?.payload?.month, year: d.activePayload?.[0]?.payload?.year })}
              >
                <XAxis dataKey="label" tick={{ fill: "rgba(240,242,248,0.4)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  formatter={(v, name) => [fmt(v), name.charAt(0).toUpperCase() + name.slice(1)]}
                  contentStyle={{ background: "#1a1d26", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontFamily: "Outfit", fontSize: 12 }}
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                />
                <Bar dataKey="needs" fill="#34d399" radius={[3, 3, 0, 0]} />
                <Bar dataKey="wants" fill="#fb923c" radius={[3, 3, 0, 0]} />
                <Bar dataKey="invest" fill="#60a5fa" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8 }}>
              {[["Needs", "#34d399"], ["Wants", "#fb923c"], ["Investments", "#60a5fa"]].map(([l, c]) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "rgba(240,242,248,0.5)" }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
                  {l}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <button className="view-all-btn" onClick={onViewMonth}>
        View All Entries for {MONTHS[month]} →
      </button>
    </div>
  );
}
