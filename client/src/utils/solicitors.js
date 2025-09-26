import solicitorsData from "./sra_register.json";

// Lookup by exact SRA Number
export function findBySraNumber(sraNumber) {
  if (!sraNumber) return null;
  return (
    solicitorsData.find(
      (s) =>
        s["SRA Number"] &&
        s["SRA Number"].toString().trim() === sraNumber.toString().trim()
    ) || null
  );
}

// Flexible search by name (Firm Name OR Solicitor Name)
export function searchByName(query) {
  if (!query) return [];
  const term = query.toLowerCase();

  return solicitorsData
    .filter((s) => s["Firm Name"] || s["Solicitor Name"])
    .map((s) => {
      const name = (s["Firm Name"] || s["Solicitor Name"]).toLowerCase();
      const substringScore = name.includes(term) ? 1 : 0;

      // fuzzy score: proportion of matched letters in sequence
      let i = 0,
        j = 0,
        matches = 0;
      while (i < term.length && j < name.length) {
        if (term[i] === name[j]) {
          matches++;
          i++;
        }
        j++;
      }
      const fuzzyScore = matches / term.length;

      return { ...s, _score: Math.max(fuzzyScore, substringScore) };
    })
    .filter((s) => s._score > 0.2) // relaxed threshold
    .sort((a, b) => b._score - a._score)
    .slice(0, 10);
}
