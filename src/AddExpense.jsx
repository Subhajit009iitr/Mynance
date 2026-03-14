import { useState } from "react";
import { CATEGORIES, BANKS } from "./App";

export default function AddExpense({ onAdd, onCancel }) {
  const [category, setCategory] = useState("Needs");
  const [subcategory, setSubcategory] = useState(CATEGORIES.Needs.sub[0]);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [bank, setBank] = useState(BANKS[0]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const CAT_COLORS = { Needs: "#34d399", Wants: "#fb923c", Investments: "#60a5fa" };

  const handleCat = (cat) => {
    setCategory(cat);
    setSubcategory(CATEGORIES[cat].sub[0]);
  };

  const handleSubmit = () => {
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    if (!date) { setError("Please select a date"); return; }
    setError("");
    onAdd({
      category,
      subcategory,
      amount: Number(amount),
      date,
      bank,
      note: note.trim(),
    });
  };

  const color = CAT_COLORS[category];

  return (
    <div style={{ padding: "24px 16px" }}>
      <style>{`
        .add-header { display: flex; align-items: center; gap: 12px; margin-bottom: 28px; }
        .back-btn {
          background: var(--surface2); border: 1px solid var(--border);
          border-radius: 10px; width: 36px; height: 36px;
          color: var(--text); cursor: pointer; font-size: 16px;
          display: flex; align-items: center; justify-content: center;
        }
        .add-title { font-size: 20px; font-weight: 800; }

        .field-label { font-size: 11px; font-weight: 600; color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; font-family: 'JetBrains Mono', monospace; margin-bottom: 8px; }
        .field-group { margin-bottom: 20px; }

        .cat-tabs { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
        .cat-tab {
          padding: 12px 8px;
          border-radius: 14px;
          border: 2px solid var(--border);
          background: var(--surface);
          color: var(--muted);
          cursor: pointer;
          font-family: 'Outfit', sans-serif;
          font-size: 12px; font-weight: 700;
          text-align: center;
          transition: all 0.2s;
        }
        .cat-tab.active { color: var(--text); }
        .cat-tab .tab-icon { font-size: 22px; display: block; margin-bottom: 4px; }

        .sub-scroll { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; }
        .sub-scroll::-webkit-scrollbar { display: none; }
        .sub-chip {
          padding: 7px 14px;
          border-radius: 99px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--muted);
          cursor: pointer;
          font-family: 'Outfit', sans-serif;
          font-size: 13px; font-weight: 600;
          white-space: nowrap;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .sub-chip.active { color: var(--text); }

        .amount-input-wrap {
          position: relative;
          background: var(--surface);
          border: 2px solid var(--border);
          border-radius: 16px;
          display: flex;
          align-items: center;
          padding: 0 16px;
          transition: border-color 0.2s;
        }
        .amount-input-wrap:focus-within { border-color: var(--accent); }
        .rupee-sym { font-size: 24px; font-weight: 700; color: var(--muted); margin-right: 8px; }
        .amount-input {
          background: none; border: none; outline: none;
          font-family: 'JetBrains Mono', monospace;
          font-size: 28px; font-weight: 700;
          color: var(--text);
          width: 100%; padding: 16px 0;
        }

        .row-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .select-field, .date-field {
          background: var(--surface);
          border: 2px solid var(--border);
          border-radius: 14px;
          padding: 12px 14px;
          color: var(--text);
          font-family: 'Outfit', sans-serif;
          font-size: 14px; font-weight: 500;
          width: 100%; outline: none;
          transition: border-color 0.2s;
          appearance: none;
        }
        .select-field:focus, .date-field:focus { border-color: var(--accent); }
        .select-field option { background: #1a1d26; }

        .note-input {
          background: var(--surface);
          border: 2px solid var(--border);
          border-radius: 14px;
          padding: 14px;
          color: var(--text);
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          width: 100%; outline: none;
          resize: none; height: 72px;
          transition: border-color 0.2s;
        }
        .note-input:focus { border-color: var(--accent); }
        .note-input::placeholder { color: var(--muted); }

        .error-msg { color: #f87171; font-size: 12px; margin-top: 4px; margin-bottom: 8px; }

        .submit-btn {
          width: 100%; padding: 16px;
          border-radius: 16px; border: none;
          font-family: 'Outfit', sans-serif;
          font-size: 16px; font-weight: 700;
          cursor: pointer; margin-top: 8px;
          transition: all 0.2s;
          color: #0a0b0f;
        }
        .submit-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
      `}</style>

      <div className="add-header">
        <button className="back-btn" onClick={onCancel}>←</button>
        <div className="add-title">Add Expense</div>
      </div>

      {/* Category */}
      <div className="field-group">
        <div className="field-label">Category</div>
        <div className="cat-tabs">
          {Object.entries(CATEGORIES).map(([cat, { icon }]) => (
            <button
              key={cat}
              className={`cat-tab ${category === cat ? "active" : ""}`}
              style={category === cat ? { borderColor: CAT_COLORS[cat], background: `${CAT_COLORS[cat]}15` } : {}}
              onClick={() => handleCat(cat)}
            >
              <span className="tab-icon">{icon}</span>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Subcategory */}
      <div className="field-group">
        <div className="field-label">Subcategory</div>
        <div className="sub-scroll">
          {CATEGORIES[category].sub.map(sub => (
            <button
              key={sub}
              className={`sub-chip ${subcategory === sub ? "active" : ""}`}
              style={subcategory === sub ? { borderColor: color, background: `${color}20`, color: color } : {}}
              onClick={() => setSubcategory(sub)}
            >
              {sub}
            </button>
          ))}
        </div>
      </div>

      {/* Amount */}
      <div className="field-group">
        <div className="field-label">Amount</div>
        <div className="amount-input-wrap">
          <span className="rupee-sym">₹</span>
          <input
            className="amount-input"
            type="number"
            placeholder="0"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            min="0"
          />
        </div>
      </div>

      {/* Date & Bank */}
      <div className="field-group">
        <div className="row-fields">
          <div>
            <div className="field-label">Date</div>
            <input
              className="date-field"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{ colorScheme: "dark" }}
            />
          </div>
          <div>
            <div className="field-label">Account</div>
            <select className="select-field" value={bank} onChange={e => setBank(e.target.value)}>
              {BANKS.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Note */}
      <div className="field-group">
        <div className="field-label">Note (optional)</div>
        <textarea
          className="note-input"
          placeholder="Add a note..."
          value={note}
          onChange={e => setNote(e.target.value)}
        />
      </div>

      {error && <div className="error-msg">⚠ {error}</div>}

      <button
        className="submit-btn"
        style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
        onClick={handleSubmit}
      >
        Save Expense
      </button>
    </div>
  );
}

const CAT_COLORS = { Needs: "#34d399", Wants: "#fb923c", Investments: "#60a5fa" };
