import { useState, useEffect } from "react";
import axios from "axios";
import Select from "react-select";

const LOAN_PURPOSE_OPTIONS = [
  { value: "Purchase", label: "Purchase" },
  { value: "Capital raise", label: "Capital Raise" },
  { value: "Refinance", label: "Refinance" },
  { value: "Cash-out refinance", label: "Cash-Out Refinance" },
  { value: "Debt consolidation", label: "Debt Consolidation" },
  { value: "Refurbishment", label: "Refurbishment" },
  { value: "Development", label: "Development" },
];

const PROPERTY_TYPE_OPTIONS = [
  { value: "Semi-detached", label: "Semi-detached" },
  { value: "Detached", label: "Detached" },
  { value: "Terraced", label: "Terraced" },
  { value: "Bungalow", label: "Bungalow" },
  { value: "Flat", label: "Flat/Apartment" },
  { value: "Maisonette", label: "Maisonette" },
  { value: "Studio", label: "Studio flat" },
  { value: "Commercial", label: "Commercial" },
  { value: "Semi-commercial", label: "Semi-commercial" },
  { value: "Land", label: "Land" },
  { value: "HMO", label: "HMO" },
  { value: "Other", label: "Other" },
];

export default function SecurityDialog({ onClose, onSave, initialData }) {
  const [postcode, setPostcode] = useState("");
  const [addresses, setAddresses] = useState([]);
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [line3, setLine3] = useState("");
  const [town, setTown] = useState("");
  const [county, setCounty] = useState("");
  const [country, setCountry] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [outstandingBalance, setOutstandingBalance] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [firstChargeLender, setFirstChargeLender] = useState("");
  const [loanPurpose, setLoanPurpose] = useState([]);
  const [chargeType, setChargeType] = useState("");
  const [tenure, setTenure] = useState("");
  const [unexpiredTerm, setUnexpiredTerm] = useState("");
  const [isPrimary, setIsPrimary] = useState(null);

  useEffect(() => {
    if (initialData) {
      setPostcode(initialData.postcode || "");
      setLine1(initialData.line1 || "");
      setLine2(initialData.line2 || "");
      setLine3(initialData.line2 || "");
      setTown(initialData.town || "");
      setCounty(initialData.county || "");
      setCountry(initialData.country || "");
      setPropertyType(initialData.propertyType || "");

      // 🔹 Format currency fields immediately
      setEstimatedValue(formatCurrency(initialData.estimatedValue || ""));
      setOutstandingBalance(formatCurrency(initialData.outstandingBalance || ""));
      setPurchasePrice(formatCurrency(initialData.purchasePrice || ""));

      setFirstChargeLender(initialData.firstChargeLender || "");
      setLoanPurpose(initialData.loanPurpose || []);
      setChargeType(initialData.chargeType || "");
      setTenure(initialData.tenure || "");
      setUnexpiredTerm(initialData.unexpiredTerm || "");
      setIsPrimary(initialData.isPrimary ?? null);
    }
  }, [initialData]);

  const formatCurrency = (value) => {
    if (!value) return "";
    const num = parseFloat(value.toString().replace(/[^0-9.]/g, ""));
    if (isNaN(num)) return "";
    return num.toLocaleString("en-GB", { style: "currency", currency: "GBP" });
  };

  const handleLookup = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/lookup-address?term=${postcode}`);
      setAddresses(res.data.suggestions || []);   // ✅ FIX: use suggestions
    } catch {
      alert("Postcode lookup failed");
    }
  };

  const handleSave = () => {
    onSave({
      postcode,
      line1,
      line2,
      line3,
      town,
      county,
      country,
      propertyType,
      estimatedValue: formatCurrency(estimatedValue),
      outstandingBalance: formatCurrency(outstandingBalance),
      purchasePrice: formatCurrency(purchasePrice),
      firstChargeLender,
      loanPurpose,
      chargeType,
      tenure,
      unexpiredTerm,
      isPrimary,
    });
    onClose();
  };

  const isPurchase = loanPurpose.includes("Purchase");

  return (
    <div className="form-section mt-3">
      {/* Postcode lookup */}
      <div className="form-group">
        <label>Postcode</label>
        <div className="postcode-row">
          <input
            value={postcode}
            onChange={(e) => setPostcode(e.target.value.toUpperCase())}
          />
          <button type="button" onClick={handleLookup} className="btn btn-primary">
            Lookup
          </button>
        </div>
      </div>

      {addresses.length > 0 && (
        <div className="form-group">
          <label>Select Address</label>
          <select
            onChange={async (e) => {
              const id = e.target.value;
              if (!id) return;

              // Fetch full details from GetAddress by ID
              const detailRes = await axios.get(
                `${process.env.REACT_APP_API_URL}/lookup-address?id=${id}`
              );
              const address = detailRes.data;

              setLine1(address.line_1 || "");
              setLine2(address.line_2 || "");
              setLine3(address.line_3 || "");
              setTown(address.town_or_city || "");
              setCounty(address.county || "");
              setCountry(address.country || "UK");
              setAddresses([]);
            }}
          >
            <option value="">Select</option>
            {addresses.map((a, i) => (
              <option key={i} value={a.id}>
                {a.address}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Address fields */}
      <div className="form-group">
        <label>Address Line 1</label>
        <input value={line1} onChange={(e) => setLine1(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Address Line 2</label>
        <input value={line2} onChange={(e) => setLine2(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Address Line 3</label>
        <input value={line3} onChange={(e) => setLine2(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Town/City</label>
        <input value={town} onChange={(e) => setTown(e.target.value)} />
      </div>
      <div className="form-group">
        <label>County</label>
        <input value={county} onChange={(e) => setCounty(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Country/Region</label>
        <input value={country} onChange={(e) => setCountry(e.target.value)} />
      </div>

      {/* Property type dropdown */}
      <div className="form-group">
        <label>Property Type</label>
        <Select
          options={PROPERTY_TYPE_OPTIONS}
          value={PROPERTY_TYPE_OPTIONS.find((opt) => opt.value === propertyType) || null}
          onChange={(selected) => setPropertyType(selected ? selected.value : "")}
          className="dropdown"
          classNamePrefix="rs"
          placeholder="Select property type"
          isClearable
        />
      </div>

      {/* Loan Purpose */}
      <div className="form-group">
        <label>Loan Purpose</label>
        <Select
          isMulti
          options={LOAN_PURPOSE_OPTIONS}
          value={LOAN_PURPOSE_OPTIONS.filter((opt) =>
            loanPurpose.includes(opt.value)
          )}
          onChange={(selected) =>
            setLoanPurpose(selected ? selected.map((s) => s.value) : [])
          }
          className="dropdown"
          classNamePrefix="rs"
          placeholder="Select purposes"
        />
      </div>

      {/* Estimated Value */}
      <div className="form-group">
        <label>Estimated Value</label>
        <input
          type="text"
          value={estimatedValue}
          onChange={(e) => setEstimatedValue(e.target.value)}
          onBlur={() => setEstimatedValue(formatCurrency(estimatedValue))}
        />
      </div>

      {/* Conditional fields */}
      {isPurchase ? (
        <div className="form-group">
          <label>Purchase Price</label>
          <input
            type="text"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
            onBlur={() => setPurchasePrice(formatCurrency(purchasePrice))}
          />
        </div>
      ) : (
        <>
          <div className="form-group">
            <label>Charge Type</label>
            <div className="yesno-toggle">
              <button
                type="button"
                className={chargeType === "1st" ? "active" : ""}
                onClick={() => setChargeType("1st")}
              >
                1st
              </button>
              <button
                type="button"
                className={chargeType === "2nd" ? "active" : ""}
                onClick={() => setChargeType("2nd")}
              >
                2nd
              </button>
            </div>
          </div>

          {chargeType === "2nd" && (
            <>
              <div className="form-group">
                <label>Outstanding Balance</label>
                <input
                  type="text"
                  value={outstandingBalance}
                  onChange={(e) => setOutstandingBalance(e.target.value)}
                  onBlur={() =>
                    setOutstandingBalance(formatCurrency(outstandingBalance))
                  }
                />
              </div>
              <div className="form-group">
                <label>First Charge Lender</label>
                <input
                  type="text"
                  value={firstChargeLender}
                  onChange={(e) => setFirstChargeLender(e.target.value)}
                />
              </div>
            </>
          )}
        </>
      )}

      {/* Tenure toggle */}
      <div className="form-group">
        <label>Tenure</label>
        <div className="yesno-toggle">
          <button
            type="button"
            className={tenure === "Freehold" ? "active" : ""}
            onClick={() => setTenure("Freehold")}
          >
            Freehold
          </button>
          <button
            type="button"
            className={tenure === "Leasehold" ? "active" : ""}
            onClick={() => setTenure("Leasehold")}
          >
            Leasehold
          </button>
        </div>
      </div>

      {tenure === "Leasehold" && (
        <div className="form-group">
          <label>Unexpired Term (years)</label>
          <input
            value={unexpiredTerm}
            onChange={(e) => setUnexpiredTerm(e.target.value)}
          />
        </div>
      )}

      {/* Primary toggle */}
      <div className="form-group">
        <label>Primary Security?</label>
        <div className="yesno-toggle">
          <button
            type="button"
            className={isPrimary === true ? "active" : ""}
            onClick={() => setIsPrimary(true)}
          >
            Yes
          </button>
          <button
            type="button"
            className={isPrimary === false ? "active" : ""}
            onClick={() => setIsPrimary(false)}
          >
            No
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="dialog-actions mt-4">
        <button onClick={onClose} className="btn btn-secondary">
          Cancel
        </button>
        <button onClick={handleSave} className="btn btn-primary">
          Save Security
        </button>
      </div>
    </div>
  );
}
