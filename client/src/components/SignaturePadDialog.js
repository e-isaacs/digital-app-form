import { useRef, useState, useEffect } from "react";
import SignaturePad from "react-signature-canvas";

export default function SignaturePadDialog({ onClose, onSave, onBack, initialSignature }) {
  const sigCanvas = useRef();
  const [hasSigned, setHasSigned] = useState(!!initialSignature);

  useEffect(() => {
    if (initialSignature && sigCanvas.current) {
      sigCanvas.current.fromDataURL(initialSignature);
    }
  }, [initialSignature]);

  const handleClear = () => {
    sigCanvas.current.clear();
    setHasSigned(false);
  };

  const handleSave = () => {
    if (!hasSigned || sigCanvas.current.isEmpty()) return;
    const dataUrl = sigCanvas.current.toDataURL("image/png");
    const today = new Date().toISOString().split("T")[0];
    onSave({ signature: dataUrl, dateSigned: today });
    onClose();
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog-content">
        <h3 className="dialog-title">Please Sign</h3>

        <div className="signature-wrapper">
          <SignaturePad
            ref={sigCanvas}
            penColor="black"
            onEnd={() => setHasSigned(true)}
            canvasProps={{
              width: 500,
              height: 120,
              className: "signature-canvas",
            }}
          />
        </div>

        <div className="flex justify-center mt-3">
          <button onClick={handleClear} className="btn btn-secondary">
            Clear
          </button>
        </div>

        <div className="dialog-actions justify-center mt-6">
          <button onClick={onBack} className="btn btn-secondary">
            Back
          </button>
          <button
            onClick={handleSave}
            disabled={!hasSigned}
            className={`btn ${
              hasSigned
                ? "btn-primary bg-green-600 hover:bg-green-700"
                : "btn-secondary opacity-50 cursor-not-allowed"
            }`}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
