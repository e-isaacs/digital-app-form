import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import Select from "react-select";
import ApplicantDialog from "../components/ApplicantDialog";
import SecurityDialog from "../components/SecurityDialog";
import CompanyDetails from "../components/CompanyDetails";
import Header from "../components/Header";

// Import solicitor search utils
import { findBySraNumber, searchByName } from "../utils/solicitors";

export default function ApplicationForm() {
  const { guid } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  // Company toggle
  const [isCompany, setIsCompany] = useState(state?.isCompany || false);
  const [companyData, setCompanyData] = useState(
    state?.companyData ||
    JSON.parse(localStorage.getItem("companyData") || "null") ||
    null
  );

  // Loan details
  const [loanAmount, setLoanAmount] = useState(state?.loanAmount || "");
  const [loanTerm, setLoanTerm] = useState(state?.loanTerm || "");
  const [sourceOfDeposit, setSourceOfDeposit] = useState(state?.sourceOfDeposit || "");
  const [loanPurposeDetail, setLoanPurposeDetail] = useState(state?.loanPurposeDetail || "");
  const [fundsRequiredBy, setFundsRequiredBy] = useState(state?.fundsRequiredBy || "");
  const [exitStrategy, setExitStrategy] = useState(state?.exitStrategy || "");
  const [exitOtherExplain, setExitOtherExplain] = useState(state?.exitOtherExplain || "");
  const [exitRefinanceLender, setExitRefinanceLender] = useState(state?.exitRefinanceLender || "");

  // Solicitor details
  const [solicitorName, setSolicitorName] = useState(state?.solicitorName || "");
  const [sraNumber, setSraNumber] = useState(state?.sraNumber || "");
  const [solicitorAddress, setSolicitorAddress] = useState(
    state?.solicitorAddress || {
      line1: "",
      line2: "",
      town: "",
      county: "",
      postcode: "",
      country: "",
    }
  );
  const [solicitorActing, setSolicitorActing] = useState(state?.solicitorActing || "");
  const [solicitorContactNumber, setSolicitorContactNumber] = useState(state?.solicitorContactNumber || "");
  const [solicitorContactEmail, setSolicitorContactEmail] = useState(state?.solicitorContactEmail || "");

  const [nameOptions, setNameOptions] = useState([]);

  // Applicants & Securities
  const [applicants, setApplicants] = useState(
    state?.signedApplicants ||
    state?.applicants ||
    JSON.parse(localStorage.getItem("applicants") || "[]")
  );

  // 🔹 Keep applicants in sync with localStorage
  useEffect(() => {
    localStorage.setItem("applicants", JSON.stringify(applicants));
  }, [applicants]);

  const [securities, setSecurities] = useState(state?.securities || []);

  const [showApplicantDialog, setShowApplicantDialog] = useState(false);
  const [editApplicantIndex, setEditApplicantIndex] = useState(null);

  const [showSecurityDialog, setShowSecurityDialog] = useState(false);
  const [editSecurityIndex, setEditSecurityIndex] = useState(null);

  useEffect(() => {
    async function fetchApplication() {
      if (!state) {
        try {
          const res = await axios.get(
            `${process.env.REACT_APP_API_URL}/applications/${guid}`
          );
          const data = res.data; // backend unwraps already

          setIsCompany(data.isCompany || false);
          setCompanyData(data.companyData || null);

          // 🔹 Prefer localStorage if available
          const savedApplicants = JSON.parse(localStorage.getItem("applicants") || "[]");
          setApplicants(savedApplicants.length > 0 ? savedApplicants : (data.applicants || []));

          // 🔹 Same idea for securities if you want them persistent
          const savedSecurities = JSON.parse(localStorage.getItem("securities") || "[]");
          setSecurities(savedSecurities.length > 0 ? savedSecurities : (data.securities || []));

          // 🔹 Format loan amount as currency
          setLoanAmount(
            data.loanAmount
              ? Number(data.loanAmount.toString().replace(/[^0-9.]/g, ""))
                  .toLocaleString("en-GB", { style: "currency", currency: "GBP" })
              : ""
          );

          // 🔹 Format loan term with "months"
          setLoanTerm(
            data.loanTerm && !isNaN(parseInt(data.loanTerm, 10))
              ? `${parseInt(data.loanTerm, 10)} months`
              : ""
          );

          setSourceOfDeposit(data.sourceOfDeposit || "");
          setLoanPurposeDetail(data.loanPurposeDetail || "");
          setFundsRequiredBy(data.fundsRequiredBy || "");
          setExitStrategy(data.exitStrategy || "");
          setExitOtherExplain(data.exitOtherExplain || "");
          setExitRefinanceLender(data.exitRefinanceLender || "");
          setSolicitorName(data.solicitorName || "");
          setSraNumber(data.sraNumber || "");
          setSolicitorAddress(
            data.solicitorAddress || {
              line1: "",
              line2: "",
              town: "",
              county: "",
              postcode: "",
              country: "",
            }
          );
          setSolicitorActing(data.solicitorActing || "");
          setSolicitorContactNumber(data.solicitorContactNumber || "");
          setSolicitorContactEmail(data.solicitorContactEmail || "");
        } catch (err) {
          console.error("❌ Failed to fetch application", err);
        }
      }
    }

    fetchApplication();
  }, [guid, state]);

  const EXIT_STRATEGY_OPTIONS = [
    { value: "Sale of security", label: "Sale of security" },
    { value: "Sale of another property", label: "Sale of another property" },
    { value: "Refinance", label: "Refinance" },
    { value: "Other", label: "Other" },
  ];
  // ------------------------------
  // Validation helpers
  // ------------------------------
  const REQUIRED_APPLICANT_FIELDS = [
    "salutation",
    "firstName",
    "lastName",
    "dob",
    "maritalStatus",
    "countryOfBirth",
    "nationality",
    "permanentRightToReside",
    "mobilePhone",
    "email",
  ];

  const calculateApplicantCompletion = (applicant) => {
    let completed = 0;
    let total = REQUIRED_APPLICANT_FIELDS.length + 1;

    REQUIRED_APPLICANT_FIELDS.forEach((field) => {
      if (applicant[field]) completed++;
    });

    if (applicant.addresses?.[0]?.line1) completed++;

    if (applicant.creditHistory) {
      const { details, ...rest } = applicant.creditHistory;
      const allAnswered = Object.values(rest).every(
        (v) => v === true || v === false
      );
      const anyYes = Object.values(rest).some((v) => v === true);
      if (allAnswered) {
        if (anyYes ? details?.trim() : true) completed++;
      }
    }

    return Math.round((completed / total) * 100);
  };

  const calculateSecurityCompletion = (security) => {
    let completed = 0;
    let total = 8;

    if (security.postcode) completed++;
    if (security.line1) completed++;
    if (security.town) completed++;
    if (security.propertyType) completed++;
    if (security.loanPurpose?.length > 0) completed++;
    if (security.estimatedValue) completed++;
    if (security.tenure) completed++;
    if (security.isPrimary !== null && security.isPrimary !== undefined) completed++;

    if (security.loanPurpose?.includes("Purchase")) {
      total++;
      if (security.purchasePrice) completed++;
    }

    if (security.chargeType) {
      total++;
      completed++;
      if (security.chargeType === "2nd") {
        total += 2;
        if (security.outstandingBalance) completed++;
        if (security.firstChargeLender) completed++;
      }
    }

    if (security.tenure === "leasehold") {
      total++;
      if (security.unexpiredTerm) completed++;
    }

    return Math.round((completed / total) * 100);
  };

  // ------------------------------
  // Solicitor search
  // ------------------------------
  const handleSolicitorSearch = () => {
    if (sraNumber) {
      const found = findBySraNumber(sraNumber);
      if (found) {
        setSolicitorName(found["Solicitor Name"] || "");
        setSolicitorAddress({
          line1: found["Address Line 1"] || "",
          line2: found["Address Line 2"] || "",
          town: found["Town/City"] || "",
          county: found["County"] || "",
          postcode: found["Postcode"] || "",
          country: found["Country"] || "",
        });
        setNameOptions([]);
      } else {
        alert("No solicitor found for this SRA number.");
      }
    } else if (solicitorName) {
      const matches = searchByName(solicitorName);
      if (matches.length > 0) {
        setNameOptions(matches.slice(0, 10)); // limit to first 10 options
      } else {
        alert("No solicitors found for this name.");
      }
    } else {
      alert("Please enter either SRA number or solicitor name to search.");
    }
  };

  const handleSelectSolicitor = (sol) => {
    setSolicitorName(sol["Firm Name"] || sol["Solicitor Name"] || "");
    setSraNumber(sol["SRA Number"] || "");
    setSolicitorAddress({
      line1: sol["Address Line 1"] || "",
      line2: sol["Address Line 2"] || "",
      town: sol["Town"] || sol["Town/City"] || "",
      county: sol["County"] || "",
      postcode: sol["Postcode"] || "",
      country: sol["Country"] || "",
    });
    setNameOptions([]);
  };

  // ------------------------------
  // Navigation
  // ------------------------------
  const handleNext = () => {
    // --- Applicants validation ---
    const allApplicantsComplete = applicants.every(
      (a) => calculateApplicantCompletion(a) >= 90
    );
    if (!allApplicantsComplete) {
      alert("Please complete fields on the Applicant Details.");
      return;
    }

    // --- Loan validation ---
    if (!loanAmount || !loanTerm) {
      alert("Please complete all fields on the Loan Details.");
      return;
    }

    if (securityHasPurchase && !sourceOfDeposit) {
      alert("Please complete all fields on the Loan Details.");
      return;
    }

    // Loan Purpose Detail required if Capital Raise selected
    const needsPurposeDetail = securities.some(
      (s) =>
        s.loanPurpose &&
        s.loanPurpose.some((lp) => lp.toLowerCase() === "capital raise")
    );
    if (needsPurposeDetail && !loanPurposeDetail.trim()) {
      alert("Please complete all fields on the Loan Details.");
      return;
    }

    if (!fundsRequiredBy) {
      alert("Please complete all fields on the Loan Details.");
      return;
    }

    if (!exitStrategy) {
      alert("Please complete all fields on the Loan Details.");
      return;
    }
    if (exitStrategy === "other" && !exitOtherExplain) {
      alert("Please complete all fields on the Loan Details.");
      return;
    }
    if (exitStrategy === "refinance" && !exitRefinanceLender) {
      alert("Please complete all fields on the Loan Details.");
      return;
    }

    // --- Solicitor validation ---
    if (!solicitorName || !sraNumber || !solicitorAddress.postcode) {
      alert("Please complete all fields on the Solicitor Details.");
      return;
    }

    // --- Save final company data ---
    let safeCompanyData = null;
    if (isCompany && companyData) {
      safeCompanyData = {
        companyName: companyData.companyName || "",
        companyNumber: companyData.companyNumber || "",
        shareholders: Array.isArray(companyData.shareholders)
          ? companyData.shareholders.map((s) => ({
              name: s.name || "",
              percentage: s.percentage || "",
            }))
          : [],
      };
      localStorage.setItem("companyData", JSON.stringify(safeCompanyData));
    } else {
      localStorage.removeItem("companyData");
    }

    // --- Navigate forward ---
    navigate(`/form/${guid}/consent`, {
      state: {
        isCompany,
        companyData: safeCompanyData,  // ✅ send along
        loanAmount,
        loanTerm,
        sourceOfDeposit,
        loanPurposeDetail,
        fundsRequiredBy,
        exitStrategy,
        exitOtherExplain,
        exitRefinanceLender,
        solicitorName,
        sraNumber,
        solicitorAddress,
        solicitorActing,
        solicitorContactNumber,
        solicitorContactEmail,
        applicants,
        securities,
      },
    });
  };

  // ------------------------------
  // Helpers
  // ------------------------------
  const getBadgeClass = (percent) => {
    if (percent < 50) return "completion-badge completion-red";
    if (percent < 100) return "completion-badge completion-yellow";
    return "completion-badge completion-green";
  };

  const formatAddressPreview = (s) => {
    const parts = [s.line1, s.postcode];
    return parts.filter(Boolean).join(", ");
  };

  const securityHasPurchase = securities.some((s) =>
    s.loanPurpose?.includes("Purchase")
  );
  const securityHasAnyPurpose = securities.some(
    (s) => s.loanPurpose && s.loanPurpose.length > 0
  );

  return (
    <>
      <Header />
      <main className="form-container">

        {/* Applicants */}
        <section className="form-section">
          <h2 className="section-title">Applicant Details</h2>
            {/* Company Toggle */}
            <section className="form-section">
              <div className="yesno-group">
                <label className="yesno-label">Is this application for a company?</label>
                <div className="yesno-toggle">
                  <button
                    type="button"
                    className={isCompany ? "active" : ""}
                    onClick={() => setIsCompany(true)}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    className={!isCompany ? "active" : ""}
                    onClick={() => setIsCompany(false)}
                  >
                    No
                  </button>
                </div>
              </div>
            {isCompany && (
              <CompanyDetails
                initialData={companyData}
                onChange={(data) => setCompanyData(data)}
              />
            )}
            </section>
        {applicants.map((a, i) => {
          const percent = calculateApplicantCompletion(a);
          return (
            <div key={i}>
              {/* Applicant summary card */}
              <div className="form-card">
                <div>
                  {a.salutation ? a.salutation.charAt(0).toUpperCase() + a.salutation.slice(1) : ""}{" "}
                  {a.firstName} {a.lastName}
                </div>

                <div className={getBadgeClass(percent)}>{percent}% Complete</div>

                <div className="actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setEditApplicantIndex(i)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      if (window.confirm("Delete this applicant?")) {
                        const updated = [...applicants];
                        updated.splice(i, 1);
                        setApplicants(updated);
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* 🔹 Separate container for the dialog under this applicant */}
              {editApplicantIndex === i && (
                <div className="form-subcontainer">
                  <ApplicantDialog
                    initialData={applicants[i]}
                    onClose={() => setEditApplicantIndex(null)}
                    onSave={(updatedApplicant) => {
                      const updated = [...applicants];
                      updated[i] = updatedApplicant;
                      setApplicants(updated);
                      setEditApplicantIndex(null);
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* For adding new applicants */}
        {editApplicantIndex === null && !showApplicantDialog && (
          <button
            type="button"
            onClick={() => setShowApplicantDialog(true)}
            className="btn btn-secondary"
          >
            + Add Applicant
          </button>
        )}
        {showApplicantDialog && (
          <div className="form-subcontainer">
            <ApplicantDialog
              onClose={() => setShowApplicantDialog(false)}
              onSave={(newApplicant) => {
                setApplicants([...applicants, newApplicant]);
                setShowApplicantDialog(false);
              }}
            />
          </div>
        )}
        </section>

        {/* Securities */}
        <section className="form-section">
          <h2 className="section-title">Security Details</h2>
          {securities.map((s, i) => {
            const percent = calculateSecurityCompletion(s);
            return (
              <div key={i}>
                {/* Security summary card */}
                <div className="form-card">
                  <div>{formatAddressPreview(s)}</div>

                  <div className={getBadgeClass(percent)}>{percent}% Complete</div>

                  <div className="actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setEditSecurityIndex(i)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        if (window.confirm("Delete this security?")) {
                          const updated = [...securities];
                          updated.splice(i, 1);
                          setSecurities(updated);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* 🔹 Separate container for editing this security */}
                {editSecurityIndex === i && (
                  <div className="form-subcontainer">
                    <SecurityDialog
                      initialData={securities[i]}
                      onClose={() => setEditSecurityIndex(null)}
                      onSave={(updatedSecurity) => {
                        const updated = [...securities];
                        updated[i] = updatedSecurity;
                        setSecurities(updated);
                        setEditSecurityIndex(null);
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* For adding new securities */}
          {editSecurityIndex === null && !showSecurityDialog && (
            <button
              type="button"
              onClick={() => setShowSecurityDialog(true)}
              className="btn btn-secondary"
            >
              + Add Security
            </button>
          )}
          {showSecurityDialog && (
            <div className="form-subcontainer">
              <SecurityDialog
                onClose={() => setShowSecurityDialog(false)}
                onSave={(newSecurity) => {
                  setSecurities([...securities, newSecurity]);
                  setShowSecurityDialog(false);
                }}
              />
            </div>
          )}
        </section>

        {/* Loan Details */}
        <section className="form-section">
          <h2 className="section-title">Loan Details</h2>
            <div className="form-group">
              <label>What is the requested gross loan amount?</label>
              <input
                type="text"
                value={loanAmount}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, ""); // strip non-numeric
                  setLoanAmount(raw);
                }}
                onBlur={() => {
                  if (loanAmount) {
                    const num = parseFloat(loanAmount);
                    if (!isNaN(num)) {
                      setLoanAmount(
                        num.toLocaleString("en-GB", { style: "currency", currency: "GBP" })
                      );
                    }
                  }
                }}
                onFocus={(e) => {
                  // remove formatting when editing
                  const numeric = e.target.value.replace(/[^0-9]/g, "");
                  setLoanAmount(numeric);
                }}
              />
            </div>
            <div className="form-group">
              <label>How long do you require the loan for?</label>
              <input
                type="text"
                value={loanTerm}
                onChange={(e) => {
                  let raw = e.target.value.replace(/[^0-9]/g, ""); // digits only
                  if (raw) {
                    let num = parseInt(raw, 10);
                    if (num > 24) num = 24; // enforce max
                    raw = num.toString();
                  }
                  setLoanTerm(raw);
                }}
                onBlur={() => {
                  if (loanTerm) {
                    const num = parseInt(loanTerm, 10);
                    if (!isNaN(num)) {
                      setLoanTerm(`${num} months`);
                    }
                  }
                }}
                onFocus={(e) => {
                  // strip " months" suffix when editing
                  const numeric = e.target.value.replace(/[^0-9]/g, "");
                  setLoanTerm(numeric);
                }}
              />
            </div>
          {securityHasPurchase && (
            <div className="form-group">
              <label>What is the source of the depoit funds?</label>
              <input
                type="text"
                value={sourceOfDeposit}
                onChange={(e) => setSourceOfDeposit(e.target.value)}
              />
            </div>
          )}
          {securities.some(
            (s) =>
              s.loanPurpose &&
              s.loanPurpose.some((lp) => lp.toLowerCase() === "capital raise")
          ) && (
            <div className="form-group">
              <label>Please explain the purpose of the loan in further detail</label>
              <input
                type="text"
                value={loanPurposeDetail}
                onChange={(e) => setLoanPurposeDetail(e.target.value)}
              />
            </div>
          )}
          <div className="form-group">
            <label>When are the funds required by?</label>
            <input
              type="date"
              value={fundsRequiredBy}
              onChange={(e) => setFundsRequiredBy(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>How will the loan be repaid?</label>
            <Select
              options={EXIT_STRATEGY_OPTIONS}
              value={EXIT_STRATEGY_OPTIONS.find((opt) => opt.value === exitStrategy) || null}
              onChange={(selected) => setExitStrategy(selected ? selected.value : "")}
              className="dropdown"
              classNamePrefix="rs"
              placeholder="Select exit strategy"
              isClearable
            />
          </div>
          {exitStrategy === "other" && (
            <div className="form-group">
              <label>Please explain</label>
              <input
                type="text"
                value={exitOtherExplain}
                onChange={(e) => setExitOtherExplain(e.target.value)}
              />
            </div>
          )}
          {exitStrategy === "refinance" && (
            <div className="form-group">
              <label>Which lender do you plan to refinance with?</label>
              <input
                type="text"
                value={exitRefinanceLender}
                onChange={(e) => setExitRefinanceLender(e.target.value)}
              />
            </div>
          )}
        </section>

        {/* Solicitor Details */}
        <section className="form-section">
          <h2 className="section-title">Solicitor Details</h2>

          {/* Solicitor Name */}
          <div className="form-group">
            <label>Solicitor Name</label>
            <input
              type="text"
              value={solicitorName}
              onChange={(e) => setSolicitorName(e.target.value)}
            />
          </div>

          {/* SRA Number + Search */}
          <div className="form-group">
            <label>SRA Number</label>
            <div style={{ display: "flex", gap: "1rem", width: "100%" }}>
              <input
                type="text"
                value={sraNumber}
                onChange={(e) => setSraNumber(e.target.value)}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={handleSolicitorSearch}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                Search Solicitor Register
              </button>
            </div>
          </div>

          {/* Dropdown for name search results */}
          {nameOptions.length > 0 && (
            <div className="form-group">
              <label>Select Match</label>
              <select
                onChange={(e) => handleSelectSolicitor(nameOptions[e.target.value])}
              >
                <option value="">Choose solicitor</option>
                {nameOptions.map((s, idx) => (
                  <option key={idx} value={idx}>
                    {s["Firm Name"] || s["Solicitor Name"]} ({s["SRA Number"]})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Address in separate container (single column) */}
          <div className="address-container">
            <div className="form-group">
              <label>Address Line 1</label>
              <input
                type="text"
                value={solicitorAddress.line1}
                onChange={(e) =>
                  setSolicitorAddress({ ...solicitorAddress, line1: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label>Address Line 2</label>
              <input
                type="text"
                value={solicitorAddress.line2}
                onChange={(e) =>
                  setSolicitorAddress({ ...solicitorAddress, line2: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label>Town/City</label>
              <input
                type="text"
                value={solicitorAddress.town}
                onChange={(e) =>
                  setSolicitorAddress({ ...solicitorAddress, town: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label>County</label>
              <input
                type="text"
                value={solicitorAddress.county}
                onChange={(e) =>
                  setSolicitorAddress({ ...solicitorAddress, county: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label>Postcode</label>
              <input
                type="text"
                value={solicitorAddress.postcode}
                onChange={(e) =>
                  setSolicitorAddress({ ...solicitorAddress, postcode: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label>Country/Region</label>
              <input
                type="text"
                value={solicitorAddress.country}
                onChange={(e) =>
                  setSolicitorAddress({ ...solicitorAddress, country: e.target.value })
                }
              />
            </div>
          </div>

          {/* Additional Fields */}
          <div className="form-group">
            <label>Solicitor Acting Name</label>
            <input
              type="text"
              value={solicitorActing}
              onChange={(e) => setSolicitorActing(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Contact Number</label>
            <input
              type="tel"
              value={solicitorContactNumber}
              onChange={(e) => setSolicitorContactNumber(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Contact Email</label>
            <input
              type="email"
              value={solicitorContactEmail}
              onChange={(e) => setSolicitorContactEmail(e.target.value)}
            />
          </div>
        </section>

        <div className="consent-actions">
          <button
            onClick={handleNext}
            className="btn btn-primary"
          >
            Next
          </button>
        </div>

      </main>
    </>
  );
}
