import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

try {
  dotenv.config();
} catch (e) {
  console.warn("Failed to load .env file:", e);
}

// Global crash prevention hooks
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhanded Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

const app = express();
const PORT = process.env.PORT || 3000;

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
  try {
    res.json({ status: "ok", time: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Download endpoints for codebase archive
app.get(["/project-source.zip", "/api/download-zip"], (req, res) => {
  const zipPath = path.join(process.cwd(), "public", "project-source.zip");
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", 'attachment; filename="project-source.zip"');
  res.sendFile(zipPath, (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({ error: "Zip archive not found" });
    }
  });
});

app.get(["/project-source.tar.gz", "/api/download-tar"], (req, res) => {
  const tarPath = path.join(process.cwd(), "public", "project-source.tar.gz");
  res.setHeader("Content-Type", "application/gzip");
  res.setHeader("Content-Disposition", 'attachment; filename="project-source.tar.gz"');
  res.sendFile(tarPath, (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({ error: "Tar archive not found" });
    }
  });
});

// 1.5 Admin Join Notification endpoint
app.post("/api/admin/notify-quota", async (req, res) => {
  const { userId, userEmail, errorMessage, time } = req.body;
  const adminEmail = process.env.ADMIN_EMAIL || "VNP.VIREN@gmail.com";

  console.log(`[QUOTA ALERT] Exhaustion triggered by: ${userEmail} (${userId})`);

  try {
    let transporter;
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
    } else {
      console.log("[SMTP CONFIG] No custom SMTP keys found for Quota Mail. Returning...");
      return res.status(200).json({ status: "skipped - no real smtp configured" });
    }

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #fcfcfc;">
        <div style="background-color: #dc2626; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h2 style="color: #ffffff; margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1.5px;">SYSTEM ALERT: QUOTA EXCEEDED</h2>
        </div>
        <div style="padding: 20px; color: #334155; line-height: 1.6;">
          <p><strong>Warning:</strong> A Firestore database quota exhaustion error was just detected.</p>
          <ul style="list-style: none; padding: 0; margin: 20px 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding-top: 15px; padding-bottom: 15px;">
            <li style="margin-bottom: 10px;"><strong>Error Message:</strong> <span style="color: #dc2626;">${errorMessage}</span></li>
            <li style="margin-bottom: 10px;"><strong>Triggering User:</strong> ${userEmail || "Anonymous"} (${userId || "N/A"})</li>
            <li style="margin-bottom: 10px;"><strong>Time:</strong> ${new Date(time).toUTCString()}</li>
          </ul>
          <p style="font-size: 13px; color: #64748b;">This means the application has hit the free tier daily Read/Write limits, or an unhandled permission error occurred due to quota limits. Upgrade the Firebase billing tier to resolve this.</p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"System Alerts" <${smtpUser}>`,
      to: adminEmail,
      subject: "🚨 CRITICAL: Firebase Quota Exceeded",
      html: emailHtml,
    });
    
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to send quota email:", err);
    res.status(500).json({ error: "Failed to send email" });
  }
});

app.post("/api/admin/notify-join", async (req, res) => {
  const { userId, userEmail, tenantId, location, joinedAt } = req.body;
  const adminEmail = process.env.ADMIN_EMAIL || "VNP.VIREN@gmail.com";

  console.log(`[JOIN EVENT] New user joined: ${userEmail} (${userId}) under tenant ${tenantId}. Location: ${location || "Unknown"}`);

  try {
    // 1. Configure the transporter
    let transporter;
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
    } else {
      // Create Ethereal test account if no SMTP keys are configured
      console.log("[SMTP CONFIG] No custom SMTP keys found. Generating an Ethereal test mailer...");
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #fcfcfc;">
        <div style="background-color: #0f172a; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h2 style="color: #2dd4bf; margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1.5px;">VNP Exporter Control Tower</h2>
        </div>
        <div style="padding: 20px; color: #334155; line-height: 1.6;">
          <h3 style="color: #0f172a; margin-top: 0; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">🚀 New Exporter Account Alert</h3>
          <p>Hello VNP Admin, a new member has successfully registered and activated their export licence workspace on the platform.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f8fafc; border-radius: 8px; overflow: hidden;">
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px; font-weight: bold; color: #64748b; width: 150px;">Email Account:</td>
              <td style="padding: 12px; color: #0f172a; font-weight: bold;">${userEmail || "Anonymous"}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px; font-weight: bold; color: #64748b;">User UID:</td>
              <td style="padding: 12px; font-family: monospace; font-size: 13px;">${userId}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px; font-weight: bold; color: #64748b;">Tenant Workspace:</td>
              <td style="padding: 12px; font-family: monospace; font-size: 13px; color: #0284c7; font-weight: bold;">${tenantId}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px; font-weight: bold; color: #64748b;">Joined Timestamp:</td>
              <td style="padding: 12px; font-size: 13px;">${new Date(joinedAt || Date.now()).toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 12px; font-weight: bold; color: #64748b;">Estimated Location:</td>
              <td style="padding: 12px; font-size: 13px; font-weight: bold; color: #16a34a;">${location || "Not Available"}</td>
            </tr>
          </table>
          
          <p style="margin-bottom: 0;">You can view and manage their subscription tier, download custom analytics reports, or restrict allowed modules directly inside the master console dashboard.</p>
        </div>
        <div style="background-color: #f1f5f9; padding: 12px; border-radius: 0 0 8px 8px; text-align: center; font-size: 11px; color: #94a3b8;">
          This is an automated notification from VNP Exporter Suite. Do not reply directly.
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"VNP Platform Bot" <noreply@vnp-exporter-suite.com>`,
      to: adminEmail,
      subject: `🚨 [VNP EXPORTER] New Exporter Joined: ${userEmail || "Anonymous"}`,
      html: emailHtml,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[SMTP EMAIL] Notification sent! Message ID: ${info.messageId}`);
    
    // If it was Ethereal, log the preview URL
    const testUrl = nodemailer.getTestMessageUrl(info);
    if (testUrl) {
      console.log(`[ETHEREAL PREVIEW URL] Inspect visual email: ${testUrl}`);
      return res.json({ success: true, etherealPreviewUrl: testUrl });
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error("Failed to send admin email notification:", err);
    res.status(500).json({ error: "Failed to send notification email", details: err.message });
  }
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
    } else if (mode === "packaging_suggestions") {
      systemInstruction = "You are an expert logistics and packaging specialist.";
      prompt = `For the ${payload.industry} export industry, suggest 2 or 3 common packaging formats/categories (e.g., mesh bags, net bags, wooden boxes, corrugated cartons, bulk packs, etc., depending on what is most suitable for ${payload.industry}).
For each category, provide 1 or 2 standard packing sizes (in KG) and an estimated current market price per unit (in INR or local currency, rough estimate).

IMPORTANT: Return raw JSON ONLY (no markdown blocks, no backticks, no explanatory text). 
The output MUST strictly match this interface:
{
  "categories": [
    {
      "name": "CATEGORY NAME IN CAPS",
      "sizes": [
        { "size": number_in_kg, "price": estimated_price_number }
      ]
    }
  ]
}`;
        } else if (mode === "auto_import") {
      systemInstruction = "You are an expert shipping assistant parsing trade requirements from emails/messages into structured JSON.";
      prompt = `Extract the requested shipments from the following text and return ONLY raw JSON matching this schema:
{
  "items": [
    {
      "dest": "Destination Port string (e.g., CIF Jebel Ali (UAE))",
      "brand": "Brand Labeling info",
      "commodity": "Commodity name (e.g., Sunflower Refined Oil)",
      "size": "Packing size (e.g., 5 Ltr Bottle)",
      "master": "Master packing (e.g., x 4 Packing)",
      "numFCL": "Number of containers (e.g., 40, parse as number)"
    }
  ]
}

Text to parse:
${payload.text}

IMPORTANT: Return ONLY valid JSON, without any markdown formatting like JSON blocks or backticks. No additional text.`;
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
  try {
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { 
          middlewareMode: true,
          hmr: false,
        },
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
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
