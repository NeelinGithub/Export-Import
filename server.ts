import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));

// Lazy initializer for Google GenAI client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is not defined first in Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// 1. Health endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// 2. Full-stack AI endpoint
app.post("/api/gemini/analyze", async (req, res) => {
  const { mode, payload } = req.body;

  try {
    const ai = getGeminiClient();
    let prompt = "";
    let systemInstruction = "You are an expert global trade documentation, compliance, and customs officer reviewing export invoices/documents.";

    if (mode === "audit") {
      systemInstruction = "You are an expert customs and shipping documentation auditor checking commercial invoices, packing lists, and proforma invoices for discrepancies, standard compliance rules, and formatting errors.";
      prompt = `
Analyze the following active export document details and identify any compliance issues, inconsistencies, pricing gaps, or recommendations.
Active Document details:
- Document Type: ${payload.docType ? payload.docType.toUpperCase() : "Invoice"}
- Exporter name & address details:
${payload.exporter || "N/A"}
- Consignee details:
${payload.consignee || "N/A"}
- Shipper/Buyer reference: ${payload.buyerName || "N/A"}
- Invoice / Packing Number: ${payload.invoiceNo || "N/A"}
- Date: ${payload.invoiceDate || "N/A"}
- Origin Port: ${payload.portLoading || "N/A"}
- Destination Port: ${payload.portDischarge || "N/A"}
- Payment terms & structure: ${payload.paymentTerms || "N/A"}
- Signatory field: ${payload.signatory || "N/A"}

Line Items List in document:
${JSON.stringify(payload.items || [], null, 2)}

Please generate an audit response as a clean Markdown format with three clear structural sections:
1. 🔍 **DISCREPANCIES & HEURISTICS** (Look for things like mismatched values, quantities, zero pricing, missing standard address headings, or missing export codes/HS codes)
2. 📝 **COMMERCIAL RECOMMENDATIONS** (Comment on prices, terms of payment, and destination country logistics hints)
3. 📧 **QUICK SUMMARY CARD** (Provide a small compliance checklist for the agent generated in Markdown format)

Keep your response extremely professional, helpful, objective and concise!
`;
    } else if (mode === "goods_description") {
      systemInstruction = "You are a professional maritime draft writer and customs compliance analyst specializing in optimizing and specifying trade 'Description of Goods' to prevent customs delays.";
      prompt = `
Our grains exporter wants to load a standard declaration for cargo description. Use details to generate a highly professional and compliant cargo and packing description string suitable to copy into the Invoice/PL.
Input details:
- Commodity: ${payload.commodity || "N/A"}
- Port of Discharge: ${payload.portDischarge || "N/A"}
- Average Bag Weight: ${payload.bagWeight || "20"} kg
- Brand info: ${payload.brand || "N/A"}
- Extra terms: ${payload.packingMaterial || "Jute Bags"}

Produce 3 alternative professional 'Description of Goods' options (varying from comprehensive cargo, customs focus, to minimalist grain detail). Format the output using clean Markdown tabs or bullet points, and highlight which terms to select. Format the text logically so it includes typical certifications like "Free from live weevils", "Moisture level max 14%", "Phytosanitary details guaranteed", or "Properly fumigated container seals".
`;
    } else if (mode === "cover_letter") {
      systemInstruction = "You are a formal trade shipping desk representative drafting communication to importers, bankers, and custom clearing house agents.";
      prompt = `
Draft a highly polished, formal corporate shipping transaction email or covering letter for this invoice to send to the buyer/importer.
Invoice Details:
- Exporter: ${payload.exporter || "N/A"}
- Buyer/Consignee: ${payload.consignee || "N/A"}
- Invoice Reference Number: ${payload.invoiceNo || "N/A"}
- Invoice Date: ${payload.invoiceDate || "N/A"}
- Load Port to Destination: ${payload.portLoading || "N/A"} to ${payload.portDischarge || "N/A"}
- Total Cargo Value: $${payload.grandTotalRaw || "N/A"} USD

Draft a beautiful, ready-to-copy, extremely polite business email containing:
1. Formal polite opening referencing the shipment RFQ.
2. Clear summary of shipping dispatch details (vessel scheduling placeholders, port links, and payment advice status).
3. Draft line listing indicating attachments (commercial invoice, packing lists, quality certificate checks).
`;
    } else {
      return res.status(400).json({ error: `Unsupported mode requested: ${mode}` });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 1.0,
      }
    });

    res.json({ result: response.text });
  } catch (error: any) {
    console.error("Gemini server error:", error);
    res.status(500).json({ error: error.message || "Unknown error calling Gemini service." });
  }
});

// Serve Vite dev system or built static files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[FULLSTACK] Server running on port ${PORT}`);
  });
}

startServer();
