# Pioneer Payslip Generator

A lightweight, professional bulk payslip generation web application built for **Pioneer Corporation**.

Designed to process payroll spreadsheets (Excel/CSV) containing bulk employee records (50, 100, 500+ employees) and automatically generate individual A4 vector payslip PDFs following the exact visual structure and statutory compliance of the Pioneer Corporation reference payslip.

---

## Key Features

- **Direct Spreadsheet Ingestion**: Supports `.xlsx`, `.xls`, and `.csv` files with multi-row headers and multi-sheet workbooks.
- **Intelligent Column Mapping**: Automatically detects and maps standard fields (Employee ID, Name, Designation, DOJ, UAN, ESI, Paid Days, LOP, Basic, HRA, WA, Incentive, DA, TDS, PF, ESI, Advance, etc.).
- **Transparent Payroll Engine**: Prevents double-counting calculated columns (such as `Basic + DA` or `Gross Total`) and cross-verifies calculated Net against spreadsheet Net values.
- **A4 Vector PDF Generation**: Produces crisp, single-page vector PDFs with selectable text, print-perfect alignment, and accurate Indian numbering currency words (Lakhs & Crores).
- **Exact Reference Layout**:
  - Pioneer Corporation header & Coimbatore address
  - Highlighted green Net Pay summary box with Paid Days and LOP Days
  - Two-column employee statutory information section
  - Two-column Earnings vs. Deductions bordered table
  - Prominent Total Net Payable highlight banner
  - Indian Rupee amount in words (e.g. *Indian Rupee Sixty-One Thousand Only*)
  - Signatures & system-generated document footer
- **Bulk Export & ZIP Packaging**: Generates all payslips with standardized naming (`PC0067_V_SOUNDARARAJAN_October_2026.pdf`) and downloads as a single ZIP archive.
- **Individual PDF Downloads & Interactive Previews**: Instant visual preview and individual downloads for any employee.
- **100% Client-Side Privacy**: All parsing, calculations, and PDF generation occur in the browser memory. Zero salary data leaves the local machine.
- **Built-in 50 Sample Employees & Excel Template**: 1-click test with 50 realistic Pioneer records (including `PC0067 V SOUNDARARAJAN`).

---

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm or pnpm

### Installation

```bash
# Clone or navigate to the directory
cd "Payslip generator app"

# Install dependencies
npm install

# Start local development server
npm run dev
```

The application runs at `http://127.0.0.1:3000/`.

### Production Build

```bash
npm run build
npm run preview
```

---

## Step-by-Step Workflow

1. **Step 01 — Upload**: Drag and drop your payroll Excel or CSV file, or click **Load Sample 50 Records** for instant testing.
2. **Step 02 — Column Mapping**: Verify the automatically detected fields or customize unmapped columns.
3. **Step 03 — Employee Data Review**: Review the validation table, filter by status (Ready, Requires Review, Invalid), or search by employee.
4. **Step 04 — Preview & Bulk Generation**: Inspect the exact A4 payslip preview for any employee and click **Generate All Payslips** to create vector PDFs and download the bulk ZIP file.

---

## Technology Stack

- **Framework**: React 18 with TypeScript
- **Bundler & Tooling**: Vite
- **Styling**: Tailwind CSS with enterprise color palette (Inter typography, deep navy `#0f172a`, emerald `#16a34a`)
- **Excel Parsing**: SheetJS (`xlsx`)
- **PDF Engine**: `jspdf` (Vector typography & lines)
- **Archive Engine**: `jszip` & `file-saver`
- **Icons**: Lucide React

