import { useState, useEffect } from "react";
import axios from "axios";
import Select from "react-select";
import { countryOptions } from "../utils/countries";
import { nationalityOptions } from "../utils/nationalities";

const SALUTATION_OPTIONS = [
  { value: "Mr", label: "Mr" },
  { value: "Mrs", label: "Mrs" },
  { value: "Ms", label: "Ms" },
  { value: "Miss", label: "Miss" },
  { value: "Dr", label: "Dr" },
  { value: "Prof", label: "Prof" },
  { value: "Other", label: "Other" },
];

const MARITAL_OPTIONS = [
  { value: "Single", label: "Single" },
  { value: "Married", label: "Married" },
  { value: "Divorced", label: "Divorced" },
  { value: "Widowed", label: "Widowed" },
  { value: "Separated", label: "Separated" },
  { value: "Domestic partnership", label: "Domestic Partnership" },
  { value: "Other", label: "Other" },
  { value: "Prefer not to say", label: "Prefer not to say" },
];

const RESIDENTIAL_STATUS_OPTIONS = [
  { value: "Owner", label: "Owner" },
  { value: "Tenant", label: "Tenant" },
  { value: "With relatives", label: "With relatives" },
  { value: "Other", label: "Other" },
];

export default function ApplicantDialog({ onClose, onSave, initialData }) {
  const [tab, setTab] = useState(1);

  // Applicant details
  const [salutation, setSalutation] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [countryOfBirth, setCountryOfBirth] = useState("");
  const [nationality, setNationality] = useState("");
  const [permanentRightToReside, setPermanentRightToReside] = useState(null);
  const [mobilePhone, setMobilePhone] = useState("");
  const [otherPhone, setOtherPhone] = useState("");
  const [email, setEmail] = useState("");

  // Credit history
  const [creditHistory, setCreditHistory] = useState({
    refusedMortgage: null,
    bankrupt: null,
    ccj: null,
    directorLiquidation: null,
    convicted: null,
    missedSecured: null,
    missedUnsecured: null,
    details: "",
  });

  // ---------------------------
  // Address 1 state
  // ---------------------------
  const [address1Postcode, setAddress1Postcode] = useState("");
  const [address1Line1, setAddress1Line1] = useState("");
  const [address1Line2, setAddress1Line2] = useState("");
  const [address1Line3, setAddress1Line3] = useState("");
  const [address1Town, setAddress1Town] = useState("");
  const [address1County, setAddress1County] = useState("");
  const [address1Country, setAddress1Country] = useState("");
  const [address1AtSince, setAddress1AtSince] = useState("");
  const [address1ResidentialStatus, setAddress1ResidentialStatus] = useState("");
  const [address1Suggestions, setAddress1Suggestions] = useState([]);

  // ---------------------------
  // Address 2 state
  // ---------------------------
  const [address2Postcode, setAddress2Postcode] = useState("");
  const [address2Line1, setAddress2Line1] = useState("");
  const [address2Line2, setAddress2Line2] = useState("");
  const [address2Line3, setAddress2Line3] = useState("");
  const [address2Town, setAddress2Town] = useState("");
  const [address2County, setAddress2County] = useState("");
  const [address2Country, setAddress2Country] = useState("");
  const [address2AtSince, setAddress2AtSince] = useState("");
  const [address2ResidentialStatus, setAddress2ResidentialStatus] = useState("");
  const [address2Suggestions, setAddress2Suggestions] = useState([]);

  // ---------------------------
  // Address 3 state
  // ---------------------------
  const [address3Postcode, setAddress3Postcode] = useState("");
  const [address3Line1, setAddress3Line1] = useState("");
  const [address3Line2, setAddress3Line2] = useState("");
  const [address3Line3, setAddress3Line3] = useState("");
  const [address3Town, setAddress3Town] = useState("");
  const [address3County, setAddress3County] = useState("");
  const [address3Country, setAddress3Country] = useState("");
  const [address3AtSince, setAddress3AtSince] = useState("");
  const [address3ResidentialStatus, setAddress3ResidentialStatus] = useState("");
  const [address3Suggestions, setAddress3Suggestions] = useState([]);

  // ---------------------------
  // Prefill when editing
  // ---------------------------
  useEffect(() => {
    if (initialData) {
      setSalutation(initialData.salutation || "");
      setFirstName(initialData.firstName || "");
      setLastName(initialData.lastName || "");
      setDob(initialData.dob || "");
      setMaritalStatus(initialData.maritalStatus || "");
      setCountryOfBirth(initialData.countryOfBirth || "");
      setNationality(initialData.nationality || "");
      setPermanentRightToReside(initialData.permanentRightToReside ?? null);
      setMobilePhone(initialData.mobilePhone || "");
      setOtherPhone(initialData.otherPhone || "");
      setEmail(initialData.email || "");
      setCreditHistory(initialData.creditHistory || { ...creditHistory });

      // Address 1
      setAddress1Line1(initialData.address1Line1 || "");
      setAddress1Line2(initialData.address1Line2 || "");
      setAddress1Line3(initialData.address1Line3 || "");
      setAddress1Town(initialData.address1Town || "");
      setAddress1County(initialData.address1County || "");
      setAddress1Country(initialData.address1Country || "");
      setAddress1Postcode(initialData.address1Postcode || "");
      setAddress1AtSince(initialData.address1AtSince || "");
      setAddress1ResidentialStatus(initialData.address1ResidentialStatus || "");

      // Address 2
      setAddress2Line1(initialData.address2Line1 || "");
      setAddress2Line2(initialData.address2Line2 || "");
      setAddress2Line3(initialData.address2Line3 || "");
      setAddress2Town(initialData.address2Town || "");
      setAddress2County(initialData.address2County || "");
      setAddress2Country(initialData.address2Country || "");
      setAddress2Postcode(initialData.address2Postcode || "");
      setAddress2AtSince(initialData.address2AtSince || "");
      setAddress2ResidentialStatus(initialData.address2ResidentialStatus || "");

      // Address 3
      setAddress3Line1(initialData.address3Line1 || "");
      setAddress3Line2(initialData.address3Line2 || "");
      setAddress3Line3(initialData.address3Line3 || "");
      setAddress3Town(initialData.address3Town || "");
      setAddress3County(initialData.address3County || "");
      setAddress3Country(initialData.address3Country || "");
      setAddress3Postcode(initialData.address3Postcode || "");
      setAddress3AtSince(initialData.address3AtSince || "");
      setAddress3ResidentialStatus(initialData.address3ResidentialStatus || "");
    }
  }, [initialData]);

  // ---------------------------
  // Lookup handlers
  // ---------------------------
  const handleLookup = async (postcode, setSuggestions) => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/lookup-address?term=${postcode}`);
      setSuggestions(res.data.suggestions || []);   // ✅ FIX: use suggestions
    } catch (err) {
      alert("Postcode lookup failed");
    }
  };

  // Save
  const handleSave = () => {
    onSave({
      salutation,
      firstName,
      lastName,
      dob,
      maritalStatus,
      countryOfBirth,
      nationality,
      permanentRightToReside,
      mobilePhone,
      otherPhone,
      email,

      // Flattened address fields
      address1Line1,
      address1Line2,
      address1Line3,
      address1Town,
      address1County,
      address1Country,
      address1Postcode,
      address1AtSince,
      address1ResidentialStatus,

      address2Line1,
      address2Line2,
      address2Line3,
      address2Town,
      address2County,
      address2Country,
      address2Postcode,
      address2AtSince,
      address2ResidentialStatus,

      address3Line1,
      address3Line2,
      address3Line3,
      address3Town,
      address3County,
      address3Country,
      address3Postcode,
      address3AtSince,
      address3ResidentialStatus,

      creditHistory,
    });
    onClose();
  };

  return (
    <div className="form-section">
      {/* Tabs */}
      <div className="yesno-toggle mb-4 w-full">
        <button
          type="button"
          className={tab === 1 ? "active" : ""}
          onClick={() => setTab(1)}
        >
          Applicant Details
        </button>
        <button
          type="button"
          className={tab === 2 ? "active" : ""}
          onClick={() => setTab(2)}
        >
          Address Details
        </button>
        <button
          type="button"
          className={tab === 3 ? "active" : ""}
          onClick={() => setTab(3)}
        >
          Credit History
        </button>
      </div>

      {/* Tab 1: Applicant Details */}
      {tab === 1 && (
        <div className="form-section tab-section">
          <div className="space-y-3">
            {/* Salutation */}
            <div className="form-group">
              <label>Salutation</label>
              <Select
                options={SALUTATION_OPTIONS}
                value={
                  SALUTATION_OPTIONS.find((opt) => opt.value === salutation) ||
                  null
                }
                onChange={(s) => setSalutation(s ? s.value : "")}
                className="dropdown"
                classNamePrefix="rs"
                placeholder="Select salutation"
                isClearable
              />
            </div>

            <div className="form-group">
              <label>First Name</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Date of Birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
            </div>

            {/* Marital Status */}
            <div className="form-group">
              <label>Marital Status</label>
              <Select
                options={MARITAL_OPTIONS}
                value={
                  MARITAL_OPTIONS.find((opt) => opt.value === maritalStatus) ||
                  null
                }
                onChange={(s) => setMaritalStatus(s ? s.value : "")}
                className="dropdown"
                classNamePrefix="rs"
                placeholder="Select marital status"
                isClearable
              />
            </div>

            {/* Country of Birth */}
            <div className="form-group">
              <label>Country of Birth</label>
              <Select
                options={countryOptions.map((c) => ({
                  value: c.label,
                  label: c.label,
                }))}
                value={
                  countryOptions.find((c) => c.label === countryOfBirth) || null
                }
                onChange={(s) => setCountryOfBirth(s ? s.value : "")}
                className="dropdown"
                classNamePrefix="rs"
                placeholder="Select country"
                isClearable
              />
            </div>

            {/* Nationality */}
            <div className="form-group">
              <label>Nationality</label>
              <Select
                options={nationalityOptions.map((n) => ({
                  value: n.label,
                  label: n.label,
                }))}
                value={
                  nationalityOptions.find((n) => n.label === nationality) ||
                  null
                }
                onChange={(s) => setNationality(s ? s.value : "")}
                className="dropdown"
                classNamePrefix="rs"
                placeholder="Select nationality"
                isClearable
              />
            </div>

            {/* Permanent right to reside */}
            <div className="form-group">
              <label>Permanent right to reside?</label>
              <div className="yesno-toggle">
                <button
                  type="button"
                  className={permanentRightToReside === true ? "active" : ""}
                  onClick={() => setPermanentRightToReside(true)}
                >
                  Yes
                </button>
                <button
                  type="button"
                  className={permanentRightToReside === false ? "active" : ""}
                  onClick={() => setPermanentRightToReside(false)}
                >
                  No
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Mobile Phone</label>
              <input
                value={mobilePhone}
                onChange={(e) => setMobilePhone(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Other Phone</label>
              <input
                value={otherPhone}
                onChange={(e) => setOtherPhone(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="dialog-actions mt-4">
            <button onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button onClick={handleSave} className="btn btn-primary">
              Save Applicant
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Address Details */}
      {tab === 2 && (
        <div className="form-section tab-section">
          <div className="space-y-3">

          {/* Address 1 */}
          <div className="border rounded p-3 space-y-2 bg-gray-50">
            <h4 className="address-title">Address 1</h4>
            <div className="form-group">
              <label>Postcode</label>
              <div className="postcode-row">
                <input
                  value={address1Postcode}
                  onChange={(e) => setAddress1Postcode(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => handleLookup(address1Postcode, setAddress1Suggestions)}
                  className="btn btn-primary"
                >
                  Lookup
                </button>
              </div>
            </div>

            {address1Suggestions.length > 0 && (
              <div className="form-group">
                <label>Select Address</label>
                <select
                  onChange={async (e) => {
                    const id = e.target.value;
                    if (!id) return;
                    const detailRes = await axios.get(
                      `${process.env.REACT_APP_API_URL}/lookup-address?id=${id}`
                    );
                    const address = detailRes.data;

                    setAddress1Line1(address.line_1 || "");
                    setAddress1Line2(address.line_2 || "");
                    setAddress1Line3(address.line_3 || "");
                    setAddress1Town(address.town_or_city || "");
                    setAddress1County(address.county || "");
                    setAddress1Country(address.country || "UK");
                    setAddress1Suggestions([]);
                  }}
                >
                  <option value="">Select</option>
                  {address1Suggestions.map((a, i) => (
                    <option key={i} value={a.id}>
                      {a.address}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label>Street 1</label>
              <input
                value={address1Line1}
                onChange={(e) => setAddress1Line1(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Street 2</label>
              <input
                value={address1Line2}
                onChange={(e) => setAddress1Line2(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Street 3</label>
              <input
                value={address1Line3}
                onChange={(e) => setAddress1Line3(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Town/City</label>
              <input
                value={address1Town}
                onChange={(e) => setAddress1Town(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>County</label>
              <input
                value={address1County}
                onChange={(e) => setAddress1County(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Country/Region</label>
              <input
                value={address1Country}
                onChange={(e) => setAddress1Country(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>At address since</label>
              <input
                type="date"
                value={address1AtSince}
                onChange={(e) => setAddress1AtSince(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Residential Status</label>
              <select
                value={address1ResidentialStatus}
                onChange={(e) => setAddress1ResidentialStatus(e.target.value)}
              >
                <option value="">Select</option>
                <option value="owner">Owner</option>
                <option value="tenant">Tenant</option>
                <option value="with relatives">With relatives</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

            {/* Address 2 (only if address1AtSince < 3 years) */}
            {address1AtSince &&
              new Date(address1AtSince) >
                new Date(new Date().setFullYear(new Date().getFullYear() - 3)) && (
                <div className="border rounded p-3 space-y-2 bg-gray-50">
                  <h4 className="address-title">Address 2</h4>
                  <div className="form-group">
                    <label>Postcode</label>
                    <div className="postcode-row">
                      <input
                        value={address2Postcode}
                        onChange={(e) => setAddress2Postcode(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => handleLookup(address2Postcode, setAddress2Suggestions)}
                        className="btn btn-primary"
                      >
                        Lookup
                      </button>
                    </div>
                  </div>

                  {address2Suggestions.length > 0 && (
                    <div className="form-group">
                      <label>Select Address</label>
                      <select
                        onChange={async (e) => {
                          const id = e.target.value;
                          if (!id) return;
                          const detailRes = await axios.get(
                            `${process.env.REACT_APP_API_URL}/lookup-address?id=${id}`
                          );
                          const address = detailRes.data;

                          setAddress2Line1(address.line_1 || "");
                          setAddress2Line2(address.line_2 || "");
                          setAddress2Line3(address.line_3 || "");
                          setAddress2Town(address.town_or_city || "");
                          setAddress2County(address.county || "");
                          setAddress2Country(address.country || "UK");
                          setAddress2Suggestions([]);
                        }}
                      >
                        <option value="">Select</option>
                        {address2Suggestions.map((a, i) => (
                          <option key={i} value={a.id}>
                            {a.address}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="form-group">
                    <label>Street 1</label>
                    <input
                      value={address2Line1}
                      onChange={(e) => setAddress2Line1(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Street 2</label>
                    <input
                      value={address2Line2}
                      onChange={(e) => setAddress2Line2(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Street 3</label>
                    <input
                      value={address2Line3}
                      onChange={(e) => setAddress2Line3(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Town/City</label>
                    <input
                      value={address2Town}
                      onChange={(e) => setAddress2Town(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>County</label>
                    <input
                      value={address2County}
                      onChange={(e) => setAddress2County(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Country/Region</label>
                    <input
                      value={address2Country}
                      onChange={(e) => setAddress2Country(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>At address since</label>
                    <input
                      type="date"
                      value={address2AtSince}
                      onChange={(e) => setAddress2AtSince(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Residential Status</label>
                    <select
                      value={address2ResidentialStatus}
                      onChange={(e) => setAddress2ResidentialStatus(e.target.value)}
                    >
                      <option value="">Select</option>
                      <option value="owner">Owner</option>
                      <option value="tenant">Tenant</option>
                      <option value="with relatives">With relatives</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Address 3 (only if address2AtSince < 3 years) */}
              {address2AtSince &&
                new Date(address2AtSince) >
                  new Date(new Date().setFullYear(new Date().getFullYear() - 3)) && (
                  <div className="border rounded p-3 space-y-2 bg-gray-50">
                    <h4 className="address-title">Address 3</h4>
                    <div className="form-group">
                      <label>Postcode</label>
                      <div className="postcode-row">
                        <input
                          value={address3Postcode}
                          onChange={(e) => setAddress3Postcode(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => handleLookup(address3Postcode, setAddress3Suggestions)}
                          className="btn btn-primary"
                        >
                          Lookup
                        </button>
                      </div>
                    </div>

                    {address3Suggestions.length > 0 && (
                      <div className="form-group">
                        <label>Select Address</label>
                        <select
                          onChange={async (e) => {
                            const id = e.target.value;
                            if (!id) return;
                            const detailRes = await axios.get(
                              `${process.env.REACT_APP_API_URL}/lookup-address?id=${id}`
                            );
                            const address = detailRes.data;

                            setAddress3Line1(address.line_1 || "");
                            setAddress3Line2(address.line_2 || "");
                            setAddress3Line3(address.line_3 || "");
                            setAddress3Town(address.town_or_city || "");
                            setAddress3County(address.county || "");
                            setAddress3Country(address.country || "UK");
                            setAddress3Suggestions([]);
                          }}
                        >
                          <option value="">Select</option>
                          {address3Suggestions.map((a, i) => (
                            <option key={i} value={a.id}>
                              {a.address}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="form-group">
                      <label>Street 1</label>
                      <input
                        value={address3Line1}
                        onChange={(e) => setAddress3Line1(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Street 2</label>
                      <input
                        value={address3Line2}
                        onChange={(e) => setAddress3Line2(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Street 3</label>
                      <input
                        value={address3Line3}
                        onChange={(e) => setAddress3Line3(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Town/City</label>
                      <input
                        value={address3Town}
                        onChange={(e) => setAddress3Town(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>County</label>
                      <input
                        value={address3County}
                        onChange={(e) => setAddress3County(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Country/Region</label>
                      <input
                        value={address3Country}
                        onChange={(e) => setAddress3Country(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>At address since</label>
                      <input
                        type="date"
                        value={address3AtSince}
                        onChange={(e) => setAddress3AtSince(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Residential Status</label>
                      <select
                        value={address3ResidentialStatus}
                        onChange={(e) => setAddress3ResidentialStatus(e.target.value)}
                      >
                        <option value="">Select</option>
                        <option value="owner">Owner</option>
                        <option value="tenant">Tenant</option>
                        <option value="with relatives">With relatives</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                )}

          </div>

          {/* Actions */}
          <div className="dialog-actions mt-4">
            <button onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button onClick={handleSave} className="btn btn-primary">Save Applicant</button>
          </div>
        </div>
      )}

      {/* Tab 3: Credit History */}
      {tab === 3 && (
        <div className="form-section tab-section">
          <div className="space-y-3">
            {[
              ["refusedMortgage", "Have you ever been refused a mortgage before?"],
              ["bankrupt", "Been bankrupt or IVA?"],
              ["ccj", "Had any CCJs or defaults?"],
              ["directorLiquidation", "As a director, been liquidated, appointed a receiver or been in a CVA?"],
              ["convicted", "Been convicted of a criminal offence?"],
              ["missedSecured", "Missed secured loan/mortgage payments in last 36 months?"],
              ["missedUnsecured", "Any unsecured arrears/missed payments in last 36 months?"],
            ].map(([key, label]) => (
              <div className="form-group" key={key}>
                <label>{label}</label>
                <div className="yesno-toggle">
                  <button
                    type="button"
                    className={creditHistory[key] === true ? "active" : ""}
                    onClick={() =>
                      setCreditHistory({ ...creditHistory, [key]: true })
                    }
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    className={creditHistory[key] === false ? "active" : ""}
                    onClick={() =>
                      setCreditHistory({ ...creditHistory, [key]: false })
                    }
                  >
                    No
                  </button>
                </div>
              </div>
            ))}
            <div className="form-group">
              <label>Details (if yes to any)</label>
              <textarea
                value={creditHistory.details}
                onChange={(e) =>
                  setCreditHistory({ ...creditHistory, details: e.target.value })
                }
              />
            </div>
          </div>

          {/* Actions */}
          <div className="dialog-actions mt-4">
            <button onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button onClick={handleSave} className="btn btn-primary">
              Save Applicant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
