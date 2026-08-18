<div align="center">
  <img src="./Demo%20Pictures/Desktop%20View%20(1).png" alt="CashCount Hero" width="800" style="border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />

  <h1>📊 CashCount</h1>
  <p><strong>Professional Multi-Platform Finance & Payment Tracker for Freelancers</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Status-Production_Ready-brightgreen.svg" alt="Status" />
    <img src="https://img.shields.io/badge/Node.js-v20-blue.svg" alt="Node" />
    <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248.svg" alt="MongoDB" />
    <img src="https://img.shields.io/badge/React-Vite-61DAFB.svg" alt="React" />
  </p>
</div>

---

## 📖 Overview

**CashCount** is an enterprise-grade, privacy-first financial tracking dashboard designed specifically for modern freelancers, independent contractors, and digital agencies. Stop relying on fragmented spreadsheets and take control of your financial ecosystem. 

Whether you're receiving wire transfers, Stripe payouts, or Payoneer deposits, CashCount acts as a unified ledger with double-entry accounting principles to give you a single source of truth for your business.

## 🚀 Key Features

- **🔐 Bank-Grade Security:** JWT-based authentication, AES-256 field-level encryption for sensitive data (SSN/Tax IDs), and Two-Factor Authentication (TOTP).
- **💸 Multi-Rail Integration:** Track inflows and withdrawals across Stripe, Payoneer, Dots, Bank Checking, and bKash.
- **📈 Double-Entry Ledger System:** Mathematically proven ledger entries running seamlessly in the background for every transaction and expense.
- **🗂 IRS-Ready Tax Prep:** Automatic categorization mapping to Schedule C deductions (Software, Workspace, Hardware, Legal fees).
- **✨ Glassmorphism UI:** Built with React 19 and Tailwind CSS v4, featuring a beautiful dark-mode, animated interface.

---

## 📸 Interface Previews

### Desktop Experience
<div align="center">
  <img src="./Demo%20Pictures/Desktop%20View%20(2).png" width="48%" style="border-radius: 8px; margin-right: 2%;" />
  <img src="./Demo%20Pictures/Desktop%20View%20(3).png" width="48%" style="border-radius: 8px;" />
</div>
<br/>
<div align="center">
  <img src="./Demo%20Pictures/Desktop%20View%20(4).png" width="800" style="border-radius: 8px;" />
</div>

### Mobile Experience
<div align="center">
  <img src="./Demo%20Pictures/Mobile%20view%20(1).jpeg" width="30%" style="border-radius: 8px; margin-right: 2%;" />
  <img src="./Demo%20Pictures/Mobile%20view%20(2).jpeg" width="30%" style="border-radius: 8px; margin-right: 2%;" />
  <img src="./Demo%20Pictures/Mobile%20view%20(3).jpeg" width="30%" style="border-radius: 8px;" />
</div>

---

## 🛠️ Tech Stack

| Domain | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Tailwind CSS v4, Framer Motion, Lucide Icons |
| **Backend** | Node.js, Express, ESBuild, JWT, Bcrypt |
| **Database** | MongoDB (Native Driver + Schema Validators) |

---

## 🏗 System Architecture

CashCount is structured as a modernized monolith, enabling frictionless updates while keeping the frontend and API strictly decoupled via routing.

```mermaid
graph LR
    Client((Client Browser)) -->|HTTPS / API Calls| Express[Express.js API Node]
    Express -->|Static Delivery| Vite[React / Dist]
    Express -->|CRUD & Auth| MongoDB[(MongoDB Atlas)]
    
    subgraph Security Layer
        Express --> Helmet[Helmet.js]
        Express --> Limiter[Rate Limiter]
        Express --> Crypto[AES-256 Crypto]
    end
```

---

<div align="center">
  <p>Designed and built for modern digital businesses. <br/> 
  <strong>© 2026 Aitijya Sarker. All rights reserved.</strong></p>
</div>
