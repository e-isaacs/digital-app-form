import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ApplicationForm from "./pages/ApplicationForm";
import ConsentPage from "./pages/ConsentPage";

function App() {
  return (
    <Router>
      <Routes>
        {/* ✅ More specific route first */}
        <Route path="/form/:guid/consent" element={<ConsentPage />} />
        <Route path="/form/:guid" element={<ApplicationForm />} />
      </Routes>
    </Router>
  );
}

export default App;
