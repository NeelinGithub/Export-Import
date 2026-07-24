# Shipzy Export Manager - Features & Modules Guide

## Newly Added Administrative Modules (From Your Requested List)

These are the newly added feature toggles available in the Admin License Manager. You can now enable/disable these for specific tenants or users, in preparation for their full implementation:

*   **Documents & Pre/Post Shipment (Estimates, Proforma, Commercial, Packing List, BL Draft)**
    *   *Concept:* Extends the existing PI/CI generator to handle the full array of export documentation: Estimates, Custom Invoices, Packing Lists, and draft Bills of Lading.
*   **EXPORTPRODOCS Drive & Storage (Max File Size, Export Limits)**
    *   *Concept:* A dedicated cloud repository for managing compliance and shipment files (like Phyto certificates or weight slips). Includes admin limits for file sizes and daily download quotas to prevent data scraping.
*   **Locations / Branches**
    *   *Concept:* Segregates workflows geographically. Allows one company to operate out of "Mundra Port Office" and "Houston HQ" with separate invoice sequences and inventory ledgers.
*   **Custom Fields**
    *   *Concept:* Gives admins the power to add custom inputs (e.g., a dropdown for "Fumigation Type" or "Bag Color") across Quotations and Invoices.
*   **Email Templates (Send Report/Document Email)**
    *   *Concept:* Standardizes outgoing communications. Users can select pre-written templates (e.g., "Advance Payment Reminder") that auto-fill with dynamic tags like `[Buyer Name]` and `[PI Number]` before emailing directly from the platform.
*   **Multi-currency**
    *   *Concept:* Natively handles conversions across global monetary systems (USD, EUR, INR, GBP), protecting profit margins against exchange rate fluctuations using custom or live FX rates.
*   **Purchase Order & Service PO**
    *   *Concept:* Procurement tools. 'Purchase Orders' are for buying physical commodities from mills/farmers. 'Service POs' are for hiring third-party logistics, freight forwarders, or fumigation agencies.
*   **Inward Payment & Outward Payment**
    *   *Concept:* Accounts Receivable and Accounts Payable tracking for individual shipments. Use it to log buyer advances (Inward) and track payments to ocean carriers or suppliers (Outward).
*   **Expense Management**
    *   *Concept:* Job-costing for shipments. Associates specific operational expenses (e.g., port handling, transporter waiting fees) directly down to a specific container or invoice.
*   **Reports & Profit & Loss**
    *   *Concept:* Business intelligence dashboards comparing revenues (Inward) to costs (Outward/Expenses) to provide a true net profit picture on both a per-shipment and aggregate level.
*   **Activity Timeline & Role-Based Access**
    *   *Concept:* Complete audit logs. Tracks who approved a quote, who downloaded a sensitive document, or who shifted inventory stock. Role-based access ensures team members only see what they are authorized to see.
*   **Import PO**
    *   *Concept:* Mirrors the export flow but is specialized for inbound cargo purchasing and calculating import duty tracking.
*   **Data Backup**
    *   *Concept:* Secure data sovereignty feature allowing the organization's admin to download structural local backups of their CRM, files, and quotes.
*   **Zapier Integration & API Access**
    *   *Concept:* High-level extensibility. Zapier connects the platform to 5,000+ apps (e.g., automatically create a QuickBooks invoice when a PI is approved). API access allows custom internal developer tools to bridge with your data.
*   **Support**
    *   *Concept:* Premium SLA tiering allowing specific tenants to request priority operational support through an assigned account manager.

---

## Existing Core Features

*   **FCL Rate & Weight Calculator**
    *   Calculates end-to-end export pricing by computing container loads (FCL), freight margins, transport charges, and product costs.
*   **Quotation History Board**
    *   A CRM for saving and duplicating historical quotes to quickly turn around new deals.
*   **Outbound PDF Share Hub**
    *   Generates professional, branded PDF quotations and tracks download events.
*   **Bag Price & Stock Manager**
    *   Logs inventory of woven/PP bags, factoring exact packaging costs into pricing calculators.
*   **Milling Yields & Grain Inventory**
    *   Calculates milling extraction yields to determine if raw reserves are sufficient for a processed cargo order.
*   **Maritime BL Tracking**
    *   Visually tracks Bill of Lading (BL) and container location ETAs (when active).
