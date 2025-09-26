import { useState } from "react";
import SignaturePadDialog from "./SignaturePadDialog";
import ConsentDialog from "./ConsentDialog";

export default function ConsentSignatureCard({ applicant, onSigned }) {
  const [signature, setSignature] = useState(applicant.signature || null);
  const [dateSigned, setDateSigned] = useState(applicant.dateSigned || null);
  const [consentChoices, setConsentChoices] = useState(
    applicant.consentPreferences || {
      email: false,
      telephone: false,
      sms: false,
    }
  );

  const [showConsent, setShowConsent] = useState(false);
  const [showPad, setShowPad] = useState(false);

  // Format date to dd/mm/yyyy
  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr; // fallback if parsing fails
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleSave = async ({ signature, dateSigned }) => {
    try {
      // Save locally
      setSignature(signature);       // base64 for UI + Docxtemplater
      setDateSigned(dateSigned);

      // Update applicant in parent
      onSigned(
        { ...applicant }, // keep applicant reference consistent
        {
          signature,
          dateSigned,
          consentPreferences: consentChoices,
        }
      );
    } catch (err) {
      console.error("❌ Error saving signature:", err);
    }
  };

  return (
    <div className="consent-card">
      <div className="signature-box" onClick={() => setShowConsent(true)}>
        {signature ? (
          <img
            src={signature}   // shows base64 signature preview
            alt="Signature"
            className="h-20 object-contain mx-auto"
          />
        ) : (
          <span className="text-gray-500">Click to sign</span>
        )}
      </div>
      <p className="mt-2 font-medium text-center">
        {applicant.firstName} {applicant.lastName}
      </p>
      <p className="text-sm text-gray-600 text-center">
        {dateSigned ? `Signed: ${formatDate(dateSigned)}` : "Not signed"}
      </p>

      {showConsent && (
        <ConsentDialog
          initialValues={consentChoices}
          onClose={() => setShowConsent(false)}
          onContinue={(choices) => {
            setConsentChoices(choices);
            setShowConsent(false);
            setShowPad(true);
          }}
        />
      )}

      {showPad && (
        <SignaturePadDialog
          initialSignature={signature}
          onClose={() => setShowPad(false)}
          onBack={() => {
            setShowPad(false);
            setShowConsent(true);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
