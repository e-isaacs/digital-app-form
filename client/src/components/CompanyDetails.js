import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import debounce from "lodash.debounce";
import { FaEdit, FaTrash, FaCheck, FaTimes } from "react-icons/fa";

const API_BASE =
  process.env.REACT_APP_PROXY_URL || "http://localhost:5000/api";

function extractPercentage(natures) {
  if (!Array.isArray(natures)) return "";
  if (natures.includes("ownership-of-shares-75-to-100-percent")) return "75–100";
  if (natures.includes("ownership-of-shares-50-to-75-percent")) return "50–75";
  if (natures.includes("ownership-of-shares-25-to-50-percent")) return "25–50";
  if (natures.includes("ownership-of-shares-25-to-100-percent")) return "25–100";
  return "";
}

function cleanName(name) {
  if (!name) return "";
  return name.replace(/^(Mr|Mrs|Ms|Miss|Dr)\s+/i, "").trim();
}

export default function CompanyDetails({ initialData, onChange }) {
const [companyName, setCompanyName] = useState(initialData?.companyName || "");
const [companyNumber, setCompanyNumber] = useState(initialData?.companyNumber || "");
const [shareholders, setShareholders] = useState(initialData?.shareholders || []);

const { guid } = useParams();
const [saving, setSaving] = useState(false);
const [saveError, setSaveError] = useState(null);

// Debounced autosave setup
const debouncedSaveRef = useRef();
if (!debouncedSaveRef.current) {
  debouncedSaveRef.current = debounce(async (data) => {
    try {
      setSaving(true);
      setSaveError(null);
      await axios.post(`${process.env.REACT_APP_API_URL}/applications/${guid}/autosave`, data);
      setSaving(false);
    } catch (err) {
      console.error("❌ Autosave failed:", err);
      setSaving(false);
      setSaveError("Autosave failed");
    }
  }, 600);
}

// Build current snapshot for autosave
const buildCompanySnapshot = useCallback(() => ({
  companyData: {
    companyName,
    companyNumber,
    shareholders,
  },
  isCompany: true,
}), [companyName, companyNumber, shareholders]);

// Trigger autosave when fields change
useEffect(() => {
  const snapshot = buildCompanySnapshot();
  debouncedSaveRef.current(snapshot);
}, [buildCompanySnapshot]);

  const [searchResults, setSearchResults] = useState([]);

  const [newRowVisible, setNewRowVisible] = useState(true);
  const [newRow, setNewRow] = useState({ name: "", percentage: "" });

  const [editIndex, setEditIndex] = useState(null);
  const [editData, setEditData] = useState({ name: "", percentage: "" });

  // --- Explicit handlers so we don’t loop on every render ---
  const handleCompanyNameChange = (value) => {
    setCompanyName(value);
    onChange({ companyName: value, companyNumber, shareholders });
  };

  const handleCompanyNumberChange = (value) => {
    setCompanyNumber(value);
    onChange({ companyName, companyNumber: value, shareholders });
  };

  const handleShareholdersChange = (newShareholders) => {
    setShareholders(newShareholders);
    onChange({ companyName, companyNumber, shareholders: newShareholders });
  };

  const handleSearchCompanies = async () => {
    if (!companyName || companyName.length < 3) return;
    try {
      const res = await axios.get(`${API_BASE}/search?q=${companyName}`);
      setSearchResults(res.data.items || []);
    } catch (err) {
      console.error("Search error:", err);
      alert("Company search failed");
    }
  };

  const fetchCompanyByNumber = async (number) => {
    try {
      const res = await axios.get(`${API_BASE}/company/${number}`);
      const c = res.data;

      const name = c.company_name || "";
      const numberVal = c.company_number || "";

      setCompanyName(name);
      setCompanyNumber(numberVal);
      setSearchResults([]);

      // ✅ Tell parent immediately
      onChange({ companyName: name, companyNumber: numberVal, shareholders });

      try {
        const pscRes = await axios.get(
          `${API_BASE}/company/${number}/persons-with-significant-control`
        );

        const newShareholders =
          (pscRes.data.items || [])
            .filter((psc) => !psc.ceased)
            .map((psc) => ({
              name: cleanName(psc.name),
              percentage: extractPercentage(psc.natures_of_control),
            })) || [];

        setShareholders(newShareholders);

        // ✅ Tell parent about shareholders too
        onChange({ companyName: name, companyNumber: numberVal, shareholders: newShareholders });
      } catch (pscErr) {
        console.warn("PSC lookup failed:", pscErr);
      }
    } catch (err) {
      console.error("Company details error:", err);
      alert("Company details lookup failed");
    }
  };

  const handleAddNewRow = () => {
    if (!newRow.name || !newRow.percentage) return;
    const updated = [...shareholders, newRow];
    handleShareholdersChange(updated);

    // 🔹 Persist immediately when a new row is added
    const safeCompanyData = {
      companyName,
      companyNumber,
      shareholders: updated,
    };
    localStorage.setItem("companyData", JSON.stringify(safeCompanyData));

    setNewRow({ name: "", percentage: "" });
    setNewRowVisible(true);
  };

  const handleDelete = (i) => {
    if (!window.confirm("Remove this shareholder?")) return;
    const updated = shareholders.filter((_, idx) => idx !== i);
    handleShareholdersChange(updated);

    // 🔹 Persist after deletion
    const safeCompanyData = {
      companyName,
      companyNumber,
      shareholders: updated,
    };
    localStorage.setItem("companyData", JSON.stringify(safeCompanyData));
  };

  const handleEdit = (i) => {
    setEditIndex(i);
    setEditData({ ...shareholders[i] });
  };

  const handleSave = (i) => {
    const updated = [...shareholders];
    updated[i] = editData;
    handleShareholdersChange(updated);

    // 🔹 Persist company data (including shareholders) into localStorage
    const safeCompanyData = {
      companyName,
      companyNumber,
      shareholders: updated,
    };
    localStorage.setItem("companyData", JSON.stringify(safeCompanyData));

    setEditIndex(null);
  };

  return (
    <div className="form-section mt-3">
      {/* Company Name */}
      <div className="form-group">
        <label>Company Name</label>
        <input
          type="text"
          value={companyName}
          onChange={(e) => handleCompanyNameChange(e.target.value)}
        />
      </div>

      {/* Company Number + Search */}
      <div className="form-group">
        <label>Company Number</label>
        <div style={{ display: "flex", gap: "1rem", width: "100%" }}>
          <input
            type="text"
            value={companyNumber}
            onChange={(e) => handleCompanyNumberChange(e.target.value)}
            onBlur={() => companyNumber && fetchCompanyByNumber(companyNumber)}
            style={{ flex: 1 }}
          />
          <button
            type="button"
            onClick={handleSearchCompanies}
            className="btn btn-primary"
            style={{ flex: 1 }}
          >
            Search Companies
          </button>
        </div>
      </div>

      {searchResults.length > 0 && (
        <div className="form-group">
          <label>Select Match</label>
          <select
            onChange={(e) => e.target.value && fetchCompanyByNumber(e.target.value)}
          >
            <option value="">Choose company</option>
            {searchResults.map((c, i) => (
              <option key={i} value={c.company_number}>
                {c.title} ({c.company_number})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Shareholding Table */}
      <h4 className="center-title">Shareholding Structure</h4>
      <table className="styled-table">
        <thead>
          <tr>
            <th>Shareholder Name</th>
            <th>%</th>
            <th className="actions-header"></th>
          </tr>
        </thead>
        <tbody>
          {shareholders.map((s, i) => (
            <tr key={i}>
              <td>
                {editIndex === i ? (
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(e) =>
                      setEditData({ ...editData, name: e.target.value })
                    }
                  />
                ) : (
                  s.name
                )}
              </td>
              <td>
                {editIndex === i ? (
                  <input
                    type="text"
                    value={editData.percentage}
                    onChange={(e) =>
                      setEditData({ ...editData, percentage: e.target.value })
                    }
                  />
                ) : (
                  s.percentage
                )}
              </td>
              <td className="actions-cell">
                {editIndex === i ? (
                  <>
                    <button
                      type="button"
                      className="action-btn save"
                      onClick={() => handleSave(i)}
                    >
                      <FaCheck />
                    </button>
                    <button
                      type="button"
                      className="action-btn cancel"
                      onClick={() => setEditIndex(null)}
                    >
                      <FaTimes />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="action-btn edit"
                      onClick={() => handleEdit(i)}
                    >
                      <FaEdit />
                    </button>
                    <button
                      type="button"
                      className="action-btn delete"
                      onClick={() => handleDelete(i)}
                    >
                      <FaTrash />
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}

          {newRowVisible && (
            <tr>
              <td>
                <input
                  type="text"
                  placeholder="Name"
                  value={newRow.name}
                  onChange={(e) =>
                    setNewRow({ ...newRow, name: e.target.value })
                  }
                />
              </td>
              <td>
                <input
                  type="text"
                  placeholder="%"
                  value={newRow.percentage}
                  onChange={(e) =>
                    setNewRow({ ...newRow, percentage: e.target.value })
                  }
                />
              </td>
              <td className="actions-cell">
                <button
                  type="button"
                  className="action-btn save"
                  onClick={handleAddNewRow}
                >
                  <FaCheck />
                </button>
                <button
                  type="button"
                  className="action-btn cancel"
                  onClick={() => setNewRowVisible(false)}
                >
                  <FaTimes />
                </button>
              </td>
            </tr>
          )}

          <tr>
            <td></td>
            <td></td>
            <td className="actions-cell">
              <button
                type="button"
                onClick={() => setNewRowVisible(true)}
                className="add-btn"
              >
                + Add
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
