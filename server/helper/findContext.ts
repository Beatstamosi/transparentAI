import { techDocs } from "../data/doc";

interface techDoc {
  id: string;
  topic: string;
  keywords: string[];
  solution: string;
}

export default function findContext(userQuestion: string): string {
  const questionLower = userQuestion.toLowerCase();

  // Find all docs that are relevant via keyword
  const relevantDocs = techDocs.filter((doc: techDoc) =>
    doc.keywords.some((keyword) => questionLower.includes(keyword)),
  );

  if (relevantDocs.length === 0) {
    return "No specific documents found.";
  }

  // Combine relevant solutions
  return relevantDocs
    .map((d) => `Thema: ${d.topic}\nLösung: ${d.solution}`)
    .join("\n\n");
}
