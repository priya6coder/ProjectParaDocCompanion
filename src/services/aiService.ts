import { GEMINI_API_KEY } from '@env';

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export interface AnalysisReport {
  hasDiscrepancy: boolean;
  severity: 'None' | 'Low' | 'Medium' | 'High';
  explanation: string;
  updatedDocumentation: string;
}

/**
 * Sends commit details and code diffs to Gemini to analyze for documentation rot.
 */
export const analyzeDocumentationRot = async (
  commitMessage: string,
  codeDiff: string,
  currentReadme: string,
): Promise<AnalysisReport> => {
  try {
    const prompt = `
      You are an automated software architect auditing codebases for "Documentation Rot".
      
      Analyze the recent code changes (Diff) and the developer's intent (Commit Message) against the existing repository documentation (README.md).
      Identify if the code updates introduce undocumented features, system requirements, or architectural changes that make the README drift out of sync.
      
      CRITICAL: Return your response strictly as a single JSON object. Do not wrap it in markdown block tags like \`\`\`json. Match this exact schema structure:
      {
        "hasDiscrepancy": true or false,
        "severity": "None" | "Low" | "Medium" | "High",
        "explanation": "A concise breakdown explaining what changed in the code execution and why the manual is out of sync.",
        "updatedDocumentation": "The fully revised and updated text version of the README.md reflecting these changes."
      }

      --- CODESPACE REPOSITORY METRICS ---
      COMMIT INTENT MESSAGE:
      ${commitMessage}

      EXTRACTED CODE DIFF:
      ${codeDiff}

      EXISTING README.md:
      ${currentReadme}
    `;

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1, // Keeps the output predictable and architecturally accurate
        },
      }),
    });

    if (!response.ok)
      throw new Error(`Gemini connection dropped: ${response.status}`);

    const data = await response.json();
    const rawTextResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawTextResponse)
      throw new Error('Empty payload returned from AI engine.');

    // Convert the verified JSON text response directly back into an object
    const report: AnalysisReport = JSON.parse(rawTextResponse.trim());
    return report;
  } catch (error) {
    console.error('Error running ai documentation analysis:', error);
    throw error;
  }
};
