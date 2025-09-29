import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import Header from "../components/Header";
import ConsentSignatureCard from "../components/ConsentSignatureCard";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import ImageModule from "docxtemplater-image-module-free";
import { saveAs } from "file-saver";

export default function ConsentPage() {  
  const { guid } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();

  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showThanks, setShowThanks] = useState(false);

  const applicants = state?.applicants || [];
  const securities = state?.securities || [];
  const isCompany = state?.isCompany || false;
  const companyData = isCompany
    ? JSON.parse(localStorage.getItem("companyData") || "null")
    : null;

  const stored = localStorage.getItem("signedApplicants");

  const [signedApplicants, setSignedApplicants] = useState(
    (state?.signedApplicants || applicants).map((a) => ({
      ...a,
      signature: a.signature || null,
      signaturePath: a.signaturePath || null,
      dateSigned: a.dateSigned || null,
      consentPreferences: a.consentPreferences || { email: false, telephone: false, sms: false },
    }))
  );

  // ✅ persist updates to localStorage
  useEffect(() => {
    localStorage.setItem("signedApplicants", JSON.stringify(signedApplicants));
  }, [signedApplicants]);

  const printRef = useRef();

  const handleSigned = (
    applicant,
    { signature, signaturePath, dateSigned, consentPreferences }
  ) => {
    console.log("🔎 Updating applicant:", applicant.email, {
      signature,
      dateSigned,
      signaturePath,
      consentPreferences,
    });

    const updated = signedApplicants.map((a) =>
      a.email === applicant.email
        ? { ...a, signature, signaturePath, dateSigned, consentPreferences }
        : a
    );

    console.log("✅ Updated applicants:", updated);
    setSignedApplicants(updated);
  };

  const allSigned = signedApplicants.every((a) => a.signature && a.dateSigned);

    const runSubmit = async () => {
    await handleSubmit();
    setShowThanks(true);   // show thank-you dialog
  };

  const handleSubmit = async () => {
    if (!allSigned) {
      alert("All applicants must sign and include a date before submitting.");
      return;
    }

    // Build completed payload
    const completedData = {
      ...state,
      applicants: signedApplicants,
      securities,
      isCompany,
      companyData,
      guid,
    };

    try {
      setLoading(true);
      // 1️⃣ Submit application → DB + CRM
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/applications/${guid}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(completedData),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      console.log("✅ Application stored + pushed to CRM");

      // 2️⃣ Update opportunity contacts
      const contactsRes = await fetch(
        `${process.env.REACT_APP_API_URL}/crm/update-opportunity-contacts/${guid}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ applicants: signedApplicants }),
        }
      );
      if (!contactsRes.ok) throw new Error(await contactsRes.text());
      console.log("✅ Opportunity contacts updated");

      // 3️⃣ Update securities
      const securitiesRes = await fetch(
        `${process.env.REACT_APP_API_URL}/crm/update-opportunity-securities/${guid}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ securities }),
        }
      );
      if (!securitiesRes.ok) throw new Error(await securitiesRes.text());
      console.log("✅ Securities updated");

      // 4️⃣ Update company (always run: clears fields if isCompany = false)
      const companyRes = await fetch(
        `${process.env.REACT_APP_API_URL}/crm/update-opportunity-company/${guid}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            isCompany,
            companyName: companyData?.companyName,
            companyNumber: companyData?.companyNumber,
          }),
        }
      );
      if (!companyRes.ok) throw new Error(await companyRes.text());
      console.log("✅ Company updated (linked or cleared)");

      // 5️⃣ Update solicitor
      if (state.sraNumber) {
        const solicitorRes = await fetch(
          `${process.env.REACT_APP_API_URL}/crm/update-opportunity-solicitor/${guid}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sraNumber: state.sraNumber,
              solicitorName: state.solicitorName,
              solicitorAddress: state.solicitorAddress,
              solicitorActing: state.solicitorActing,
              solicitorContactNumber: state.solicitorContactNumber,
              solicitorContactEmail: state.solicitorContactEmail,
            }),
          }
        );
        if (!solicitorRes.ok) throw new Error(await solicitorRes.text());
        console.log("✅ Solicitor updated");
      }

      // 6️⃣ Update remaining opportunity details
      const detailsRes = await fetch(
        `${process.env.REACT_APP_API_URL}/crm/update-opportunity-details/${guid}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            loanAmount: state.loanAmount,
            loanTerm: state.loanTerm,
            fundsRequiredBy: state.fundsRequiredBy,
            sourceOfDeposit: state.sourceOfDeposit,
            loanPurposeDetail: state.loanPurposeDetail,
            exitStrategy: state.exitStrategy,
            exitOtherExplain: state.exitOtherExplain,
            exitRefinanceLender: state.exitRefinanceLender,
          }),
        }
      );
      if (!detailsRes.ok) throw new Error(await detailsRes.text());
      console.log("✅ Opportunity details updated");

      // 7️⃣ Generate DOCX with same dataset as Print + upload for conversion/storage
      const zip = new PizZip(await (await fetch("/templates/application_form.docx")).arrayBuffer());
      const imageModule = new ImageModule({
        getImage: (tagValue) => {
          if (!tagValue) return null;
          const base64Data = tagValue.replace(/^data:image\/png;base64,/, "");
          const binary = atob(base64Data);
          const len = binary.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          return bytes;
        },
        getSize: () => [200, 80],
      });

      const doc = new Docxtemplater(zip, { modules: [imageModule] });

      // ✅ Build same template data as handlePrint
      const data = {
        isCompany: isCompany ? "Yes" : "No",
        companyName: isCompany ? companyData?.companyName : "",
        companyNumber: isCompany ? companyData?.companyNumber : "",
        shareholders: isCompany ? companyData?.shareholders || [] : [],

        applicants: signedApplicants.map((a) => ({
          salutation: a.salutation,
          firstName: a.firstName,
          lastName: a.lastName,
          dob: a.dob,
          maritalStatus: a.maritalStatus,
          countryOfBirth: a.countryOfBirth,
          nationality: a.nationality,
          permanentRightToReside:
            a.permanentRightToReside === true
              ? "Yes"
              : a.permanentRightToReside === false
              ? "No"
              : "",
          mobilePhone: a.mobilePhone,
          otherPhone: a.otherPhone,
          email: a.email,

          address1Line1: a.address1Line1 || "",
          address1Line2: a.address1Line2 || "",
          address1Line3: a.address1Line3 || "",
          address1Town: a.address1Town || "",
          address1County: a.address1County || "",
          address1Postcode: a.address1Postcode || "",
          address1AtSince: a.address1AtSince || "",
          address1Country: a.address1Country || "",
          address1ResidentialStatus: a.address1ResidentialStatus || "",

          address2Line1: a.address2Line1 || "",
          address2Line2: a.address2Line2 || "",
          address2Line3: a.address2Line3 || "",
          address2Town: a.address2Town || "",
          address2County: a.address2County || "",
          address2Postcode: a.address2Postcode || "",
          address2AtSince: a.address2AtSince || "",
          address2Country: a.address2Country || "",
          address2ResidentialStatus: a.address2ResidentialStatus || "",

          address3Line1: a.address3Line1 || "",
          address3Line2: a.address3Line2 || "",
          address3Line3: a.address3Line3 || "",
          address3Town: a.address3Town || "",
          address3County: a.address3County || "",
          address3Postcode: a.address3Postcode || "",
          address3AtSince: a.address3AtSince || "",
          address3Country: a.address3Country || "",
          address3ResidentialStatus: a.address3ResidentialStatus || "",

          creditHistory: {
            refusedMortgage: a.creditHistory?.refusedMortgage ? "Yes" : "No",
            bankrupt: a.creditHistory?.bankrupt ? "Yes" : "No",
            ccj: a.creditHistory?.ccj ? "Yes" : "No",
            directorLiquidation: a.creditHistory?.directorLiquidation ? "Yes" : "No",
            convicted: a.creditHistory?.convicted ? "Yes" : "No",
            missedSecured: a.creditHistory?.missedSecured ? "Yes" : "No",
            missedUnsecured: a.creditHistory?.missedUnsecured ? "Yes" : "No",
            details: a.creditHistory?.details || "",
          },

          signature: a.signature,
          dateSigned: a.dateSigned,
          consentEmail: a.consentPreferences?.email ? "☑" : "☐",
          consentTelephone: a.consentPreferences?.telephone ? "☑" : "☐",
          consentSms: a.consentPreferences?.sms ? "☑" : "☐",
        })),

        securities: securities.map((s) => ({ ...s })),

        loanAmount: state.loanAmount,
        loanTerm: state.loanTerm,
        fundsRequiredBy: state.fundsRequiredBy,
        sourceOfDeposit: state.sourceOfDeposit,
        loanPurposeDetail: state.loanPurposeDetail,
        exitStrategy: state.exitStrategy,
        exitOtherExplain: state.exitOtherExplain,
        exitRefinanceLender: state.exitRefinanceLender,

        solicitorName: state.solicitorName,
        sraNumber: state.sraNumber,
        solicitorAddressLine1: state.solicitorAddress?.line1 || "",
        solicitorAddressLine2: state.solicitorAddress?.line2 || "",
        solicitorTown: state.solicitorAddress?.town || "",
        solicitorCounty: state.solicitorAddress?.county || "",
        solicitorPostcode: state.solicitorAddress?.postcode || "",
        solicitorCountry: state.solicitorAddress?.country || "",
        solicitorFullAddress: [
          state.solicitorAddress?.line1,
          state.solicitorAddress?.line2,
          state.solicitorAddress?.town,
          state.solicitorAddress?.county,
          state.solicitorAddress?.postcode,
          state.solicitorAddress?.country,
        ].filter(Boolean).join(", "),
        solicitorActing: state.solicitorActing,
        solicitorContactNumber: state.solicitorContactNumber,
        solicitorContactEmail: state.solicitorContactEmail,
      };

      doc.render(data);

      const out = doc.getZip().generate({ type: "arraybuffer" });
      const file = new File([out], "Application_Form.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      const formData = new FormData();
      formData.append("file", file);

      // Submit route → upload DOCX, Cloudmersive converts, then backend saves to SharePoint
      const pdfRes = await fetch(`${process.env.REACT_APP_API_URL}/save-pdf/${guid}`, {
        method: "POST",
        body: formData,
      });
      if (!pdfRes.ok) throw new Error(await pdfRes.text());
      console.log("✅ Application PDF converted via Cloudmersive + uploaded to SharePoint");
      setLoading(false);

      // 8️⃣ Create CRM Task
      const taskRes = await fetch(
        `${process.env.REACT_APP_API_URL}/crm/opportunity/${guid}/add-task`,
        { method: "POST" }
      );
      if (!taskRes.ok) throw new Error(await taskRes.text());
      console.log("✅ Task created for opportunity owner");
            
      // 9️⃣ Show thank-you dialog instead of redirecting immediately
      setShowThanks(true);
    } catch (err) {
      console.error("❌ Error submitting application:", err);
      setLoading(false);
      alert("Submission failed. Please try again.");
    }
  };

  const handlePrint = async () => {
    setLoading(true); // 🔹 show spinner immediately
    try {
      // Load the docx template from public/templates
      const response = await fetch("/templates/application_form.docx");
      const content = await response.arrayBuffer();

      const zip = new PizZip(content);

      // Configure image options for signatures (expect base64)
      const imageOpts = {
        getImage: function (tagValue) {
          if (!tagValue) return null;
          const base64Data = tagValue.replace(/^data:image\/png;base64,/, "");
          const binary = atob(base64Data); // decode base64
          const len = binary.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          return bytes;
        },
        getSize: function () {
          // must return a 2-element array [width, height]
          return [200, 80]; // width & height in pixels
        },
      };

      // Convert ArrayBuffer → base64 (browser-safe)
      function arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
      }

      const imageModule = new ImageModule(imageOpts);

      const doc = new Docxtemplater(zip, {
        modules: [imageModule],
        paragraphLoop: true,
        linebreaks: true,
      });

      // Build data structure for template
      const data = {
        // Company
        isCompany: isCompany ? "Yes" : "No",
        companyName: isCompany ? companyData?.companyName : "",
        companyNumber: isCompany ? companyData?.companyNumber : "",
        shareholders: isCompany ? companyData?.shareholders || [] : [],

        // Applicants
        applicants: applicants.map((a) => ({
          salutation: a.salutation,
          firstName: a.firstName,
          lastName: a.lastName,
          dob: a.dob,
          maritalStatus: a.maritalStatus,
          countryOfBirth: a.countryOfBirth,
          nationality: a.nationality,
          permanentRightToReside:
            a.permanentRightToReside === true
              ? "Yes"
              : a.permanentRightToReside === false
              ? "No"
              : "",
          mobilePhone: a.mobilePhone,
          otherPhone: a.otherPhone,
          email: a.email,

          // Address history
          address1Line1: a.address1Line1 || "",
          address1Line2: a.address1Line2 || "",
          address1Line3: a.address1Line3 || "",
          address1Town: a.address1Town || "",
          address1County: a.address1County || "",
          address1Postcode: a.address1Postcode || "",
          address1AtSince: a.address1AtSince || "",
          address1Country: a.address1Country || "",
          address1ResidentialStatus: a.address1ResidentialStatus || "",

          address2Line1: a.address2Line1 || "",
          address2Line2: a.address2Line2 || "",
          address2Line3: a.address2Line3 || "",
          address2Town: a.address2Town || "",
          address2County: a.address2County || "",
          address2Postcode: a.address2Postcode || "",
          address2AtSince: a.address2AtSince || "",
          address2Country: a.address2Country || "",
          address2ResidentialStatus: a.address2ResidentialStatus || "",

          address3Line1: a.address3Line1 || "",
          address3Line2: a.address3Line2 || "",
          address3Line3: a.address3Line3 || "",
          address3Town: a.address3Town || "",
          address3County: a.address3County || "",
          address3Postcode: a.address3Postcode || "",
          address3AtSince: a.address3AtSince || "",
          address3Country: a.address3Country || "",
          address3ResidentialStatus: a.address3ResidentialStatus || "",

          // Credit history
          creditHistory: {
            refusedMortgage:
              a.creditHistory?.refusedMortgage === true
                ? "Yes"
                : a.creditHistory?.refusedMortgage === false
                ? "No"
                : "",
            bankrupt:
              a.creditHistory?.bankrupt === true
                ? "Yes"
                : a.creditHistory?.bankrupt === false
                ? "No"
                : "",
            ccj:
              a.creditHistory?.ccj === true
                ? "Yes"
                : a.creditHistory?.ccj === false
                ? "No"
                : "",
            directorLiquidation:
              a.creditHistory?.directorLiquidation === true
                ? "Yes"
                : a.creditHistory?.directorLiquidation === false
                ? "No"
                : "",
            convicted:
              a.creditHistory?.convicted === true
                ? "Yes"
                : a.creditHistory?.convicted === false
                ? "No"
                : "",
            missedSecured:
              a.creditHistory?.missedSecured === true
                ? "Yes"
                : a.creditHistory?.missedSecured === false
                ? "No"
                : "",
            missedUnsecured:
              a.creditHistory?.missedUnsecured === true
                ? "Yes"
                : a.creditHistory?.missedUnsecured === false
                ? "No"
                : "",
            details: a.creditHistory?.details || "",
          },

          // Signature + date
          signature: a.signature,
          dateSigned: a.dateSigned,

          // Consent checkboxes
          consentEmail: a.consentPreferences?.email ? "☑" : "☐",
          consentTelephone: a.consentPreferences?.telephone ? "☑" : "☐",
          consentSms: a.consentPreferences?.sms ? "☑" : "☐",
        })),

        // Securities
        securities: securities.map((s) => ({
          line1: s.line1,
          line2: s.line2,
          line3: s.line3,
          town: s.town,
          county: s.county,
          postcode: s.postcode,
          country: s.country,
          loanPurpose: s.loanPurpose,
          estimatedValue: s.estimatedValue,
          purchasePrice: s.purchasePrice,
          chargeType: s.chargeType,
          outstandingBalance: s.outstandingBalance,
          firstChargeLender: s.firstChargeLender,
          tenure: s.tenure,
          unexpiredTerm: s.unexpiredTerm,
        })),

        // Loan Details
        loanAmount: state.loanAmount,
        loanTerm: state.loanTerm,
        fundsRequiredBy: state.fundsRequiredBy,
        sourceOfDeposit: state.sourceOfDeposit,
        loanPurposeDetail: state.loanPurposeDetail,
        exitStrategy: state.exitStrategy,
        exitOtherExplain: state.exitOtherExplain,
        exitRefinanceLender: state.exitRefinanceLender,

        // Solicitor
        solicitorName: state.solicitorName,
        sraNumber: state.sraNumber,
        solicitorAddressLine1: state.solicitorAddress?.line1 || "",
        solicitorAddressLine2: state.solicitorAddress?.line2 || "",
        solicitorTown: state.solicitorAddress?.town || "",
        solicitorCounty: state.solicitorAddress?.county || "",
        solicitorPostcode: state.solicitorAddress?.postcode || "",
        solicitorCountry: state.solicitorAddress?.country || "",
        solicitorFullAddress: [
          state.solicitorAddress?.line1,
          state.solicitorAddress?.line2,
          state.solicitorAddress?.town,
          state.solicitorAddress?.county,
          state.solicitorAddress?.postcode,
          state.solicitorAddress?.country,
        ].filter(Boolean).join(", "),
        solicitorActing: state.solicitorActing,
        solicitorContactNumber: state.solicitorContactNumber,
        solicitorContactEmail: state.solicitorContactEmail,
      };

      try {
        console.log("📝 Template data:", data);
        doc.render(data);
      } catch (error) {
        console.error("Docxtemplater render error", error);
        if (error.properties?.errors) {
          error.properties.errors.forEach((e) => console.error(e));
        }
        throw error;
      }

      const out = doc.getZip().generate({ type: "arraybuffer" });
      const file = new File([out], "Application_Form.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      const formData = new FormData();
      formData.append("file", file);

      // Direct download via Cloudmersive conversion endpoint
      const pdfResponse = await fetch(`${process.env.REACT_APP_API_URL}/download-pdf`, {
        method: "POST",
        body: formData,
      });

      if (!pdfResponse.ok) {
        const errText = await pdfResponse.text();
        console.error("PDF backend error:", errText);
        throw new Error("PDF conversion failed");
      }

      const pdfBlob = await pdfResponse.blob();
      saveAs(pdfBlob, "Application_Form.pdf");

    } catch (err) {
      console.error("Error converting to PDF:", err);
      alert("Could not generate PDF. Please try again.");
    } finally {
      setLoading(false); // 🔹 hide spinner whether success or error
    }
  };
  return (
    <>
      <Header />
      <main className="form-container">
        <h1 className="form-title">CUSTOMER INFORMATION AND DATA PROTECTION</h1>

        <div className="consent-box mb-6">
          <p>
            In assessing your application, we will make enquiries about you
            including searching any records held by Credit Reference Agencies
            Electronic Identity/Verification Systems and checking your details
            with Fraud Prevention Agencies. If you give us false or inaccurate
            information and we suspect fraud we will record this. The Credit
            Reference and Fraud Prevention Agencies will keep details of any
            searches. Information held about you by the Credit Reference
            Agencies may already be linked to records relating to one or more of
            your financial associates.
          </p>
          <p>
            For the purpose of this application you may be treated as
            financially linked and your application will be assessed with
            reference to any “associated” records. If you are a joint applicant
            or if you have told us of some other financial association with
            another person, you must be sure that you are entitled to (a)
            disclose information about your joint applicant and anyone referred
            to by you; and (b) authorise us to search, link or record
            information at Credit Reference Agencies about you and anyone
            referred to by you. An association between joint applicants and
            between you and anyone you tell us is your financial partner will be
            created at Credit Reference Agencies. This will link your financial
            records, each of which will be taken into account in all future
            applications by either or both of you. This will continue until one
            of you successfully files a disassociation at Credit Reference
            Agencies.
          </p>
          <p>
            You consent to us disclosing details of your application and how you
            conduct your account (including any default) to Credit Reference,
            Fraud Prevention Agencies and our Funding Partners. This information
            may be used to help us and other organisations in order to (a)
            assess the financial risk of dealing with you and other associates;
            (b) help make decisions on motor, household, credit, life and other
            insurance proposals and insurance claims; (c) administer agreements
            and insurance policies with you; (d) help prevent or detect fraud,
            prevent money laundering or other crimes, recover debts and trace
            debtors; and (e) for statistical analysis about credit, insurance
            and fraud.
          </p>
          <p>
            We may use a “credit scoring” or other automated process in deciding
            whether to accept your application and during the life of your
            account, for example to review your secured debt and /or the
            interest rate and other charges for your Account (all of which may
            be varied by us). This may involve searching your records again at
            Credit Reference Agencies (who will keep details of our search) as
            well as using other information we hold about you.
          </p>
        </div>

        <h1 className="form-title">IMPORTANT CONSENT INFORMATION</h1>

        <div className="consent-box mb-6">
          <p>
            By completing this agreement and returning by email, or by printing,
            completing, signing and returning by post, you consent to us using
            and disclosing details as described above. References to “we” and
            “us” include any subsidiary or other company associated or
            affiliated with Inhale Capital.
          </p>
          <p>
            Please sign to confirm you have read, understand and agree to the
            terms above and you are providing permission for the necessary
            searches to be undertaken.
          </p>
        </div>

        <div className="consent-grid">
          {signedApplicants.map((a, i) => (
            <ConsentSignatureCard
              key={i}
              applicant={a}
              onSigned={handleSigned}
            />
          ))}
        </div>

        {/* Hidden printable template */}
        <div ref={printRef} style={{ display: "none" }}>
          <div
            style={{
              padding: "20px",
              fontFamily: "Arial, sans-serif",
              fontSize: "12px",
            }}
          >
            <h1 style={{ textAlign: "center" }}>
              Inhale Capital Finance Application
            </h1>

            {isCompany && companyData && (
              <>
                <h2>Company Details</h2>
                <p>
                  <strong>Name:</strong> {companyData.companyName || "N/A"}
                </p>
                <p>
                  <strong>Number:</strong> {companyData.companyNumber || "N/A"}
                </p>
                {companyData.shareholders.length > 0 && (
                  <table
                    border="1"
                    cellPadding="4"
                    style={{ width: "100%", marginTop: "10px" }}
                  >
                    <thead>
                      <tr>
                        <th>Shareholder</th>
                        <th>%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companyData.shareholders.map((s, i) => (
                        <tr key={i}>
                          <td>{s.name || "Unknown"}</td>
                          <td>{s.percentage || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}

            <h2>Applicants</h2>
            {signedApplicants.map((a, i) => (
              <div key={i} style={{ marginBottom: "20px" }}>
                <p>
                  <strong>Name:</strong> {a.salutation} {a.firstName}{" "}
                  {a.lastName}
                </p>
                <p>
                  <strong>Email:</strong> {a.email}
                </p>
                <p>
                  <strong>Date Signed:</strong> {a.dateSigned}
                </p>
                {a.signature && (
                  <img
                    src={a.signature}
                    alt="Signature"
                    style={{ width: "200px" }}
                  />
                )}
              </div>
            ))}

            <h2>Securities</h2>
            {securities.map((s, i) => (
              <div key={i} style={{ marginBottom: "10px" }}>
                <p>
                  {s.line1}, {s.town} {s.postcode}
                </p>
                <p>Estimated Value: {s.estimatedValue}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="consent-actions flex justify-center gap-4 mt-8">
          <button
            onClick={() =>
              navigate(`/form/${guid}`, {
                state: {
                  ...state,
                  applicants: signedApplicants,
                  securities,
                  isCompany,
                  companyData,
                },
              })
            }
            className="btn btn-secondary w-40"
          >
            Back
          </button>

          <button
            onClick={async () => {
              setLoading(true);
              try {
                await handlePrint();
              } finally {
                setLoading(false);
              }
            }}
            className="btn btn-secondary w-40"
          >
            Print Form
          </button>

          <button
            onClick={() => setShowConfirm(true)}
            className={`btn w-40 ${allSigned ? "btn-primary" : "btn-secondary"}`}
            disabled={!allSigned}
          >
            Submit Application
          </button>
        </div>

        {showConfirm && (
          <div className="dialog-overlay">
            <div className="dialog-content">
              <h3 className="dialog-title">Confirm Submission</h3>
              <div className="dialog-actions mt-4">
                <button className="btn btn-secondary" onClick={() => setShowConfirm(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={() => { setShowConfirm(false); runSubmit(); }}>
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {showThanks && (
          <div className="dialog-overlay">
            <div className="dialog-content">
              <h3 className="dialog-title">Thank You!</h3>
              <h1 className="dialog-text">Your application has been submitted to the team.</h1>
              <div className="dialog-actions mt-4">
                <button
                  className="btn btn-primary"
                  onClick={() => window.location.href = "https://inhalecapital.co.uk"}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading overlay */}
        {loading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
          </div>
        )}
      </main>
    </>
  );
}

