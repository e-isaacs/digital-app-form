import { useState, useEffect } from "react";

export default function ConsentDialog({ onClose, onContinue, initialValues }) {
  const [consent, setConsent] = useState(
    initialValues || { email: false, telephone: false, sms: false }
  );
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    if (initialValues) {
      setConsent(initialValues);
      setSelectAll(
        initialValues.email && initialValues.telephone && initialValues.sms
      );
    }
  }, [initialValues]);

  const toggle = (key) => {
    const updated = { ...consent, [key]: !consent[key] };
    setConsent(updated);
    setSelectAll(updated.email && updated.telephone && updated.sms);
  };

  const handleSelectAll = () => {
    const newValue = !selectAll;
    const updated = { email: newValue, telephone: newValue, sms: newValue };
    setConsent(updated);
    setSelectAll(newValue);
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog-content">
        <h3 className="dialog-title">Important Consent Information</h3>

        <div className="space-y-6 text-sm text-gray-700 max-h-80 overflow-y-auto">
          <p className="text-center">
            Please tick all of the ways in which you are happy for us to contact you:
          </p>

          <div className="consent-options-column centered">
            <label>
              <input
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAll}
              />
              Select All
            </label>

            <label>
              <input
                type="checkbox"
                checked={consent.email}
                onChange={() => toggle("email")}
              />
              Email
            </label>

            <label>
              <input
                type="checkbox"
                checked={consent.telephone}
                onChange={() => toggle("telephone")}
              />
              Telephone (including voicemail)
            </label>

            <label>
              <input
                type="checkbox"
                checked={consent.sms}
                onChange={() => toggle("sms")}
              />
              SMS / Text Messaging
            </label>
          </div>

          <p>
            You agree that telephone conversations and other communications between us
            or third parties may be recorded and/or monitored to assist in improving
            customer and collections services.
          </p>
          <p>
            Full details of how we hold, process and manage personal information are
            explained within our privacy statement on our website.
          </p>
        </div>

        <div className="dialog-actions justify-center">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            onClick={() => onContinue(consent)}
            className="btn btn-primary"
          >
            Continue to Sign
          </button>
        </div>
      </div>
    </div>
  );
}
