# CareCircle AI – Agentic Elderly Healthcare Management Platform

CareCircle AI is an agentic elderly healthcare management platform designed for seniors and their family caregivers. The central interface is a conversational Healthcare Agent powered by NVIDIA NIM (Mistral Large `mistralai/mistral-large-4-1t-a52b`), equipped with strict clinical safety guardrails, a deterministic emergency contact system, and a tool-augmented backend pipeline.

---

## 🌟 Key Features

1. **Central Healthcare Agent & Tool Registry**
   - Built on NVIDIA NIM Mistral Large with function calling.
   - The agent **never accesses databases directly**; all actions route through validated, schema-checked tools.
   - Strict clinical guardrails: never invents missing dosages, frequencies, or durations.
   - Enforces confirmation for consequential actions (adding medications, appointments, alerts).

2. **Prescription Processing Pipeline with Human Verification**
   - Upload prescription images securely via Cloudinary.
   - Extracts structured prescription fields (medicine name, dosage, frequency, duration, instructions).
   - Detects handwriting and OCR uncertainties.
   - Requires explicit human verification before any medication is scheduled.
   - Embeds and indexes verified prescription summaries into Qdrant vector memory.

3. **Isolated Vector Medical Memory (Qdrant)**
   - Vector-based semantic search for clinical notes, prescription history, and doctor briefs.
   - Strict patient-level isolation (all queries filtered by authenticated `patientId`).
   - Cites clear source references in all medical summaries.

4. **Deterministic Emergency SOS**
   - High-visibility red SOS interface.
   - Deterministic emergency dispatch workflow: alerts primary family caregiver and medical emergency contacts immediately with location/condition notes.

5. **Elderly-Friendly UI (React + Tailwind CSS)**
   - High-contrast, large readable typography.
   - Voice speech input integration.
   - One-tap quick prompts and pill intake marking ("Mark Taken").

---

## 🛠 Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons
- **Backend**: Node.js (ES Modules), Express
- **AI / LLM**: NVIDIA NIM API (`mistralai/mistral-large-4-1t-a52b`), OpenAI SDK client
- **Databases**:
  - **MongoDB** (structured patient data, medications, dose logs, appointments, alerts)
  - **Qdrant** (patient-isolated vector memory)
  - **Cloudinary** (prescription image storage)
- **Authentication**: Firebase Authentication (with token verification middleware & local dev bypass)

---

## 🗂 Project Structure

```
CareCircle Ai/
├── backend/
│   ├── .env.example              # Backend environment variable template
│   ├── .env                      # Active local environment configuration
│   ├── package.json              # Node.js dependencies & scripts
│   ├── server.js                 # Express server entry point
│   └── src/
│       ├── config/
│       │   ├── env.js            # Environment loader & configuration
│       │   ├── mongodb.js        # Mongoose connection & status helper
│       │   ├── qdrant.js         # Qdrant vector DB client & collections
│       │   ├── firebase.js       # Firebase Admin SDK & token verifier
│       │   ├── cloudinary.js     # Cloudinary media storage client
│       │   └── nvidia.js         # NVIDIA NIM Mistral Large client & fallback
│       ├── agent/
│       │   ├── prompts.js        # Clinical system prompts & directives
│       │   ├── registry.js       # Tool registry, schemas & validation
│       │   └── orchestrator.js   # Central Healthcare Agent orchestrator
│       ├── tools/
│       │   ├── index.js          # Registry of all 10 tools
│       │   ├── prescriptionTools.js
│       │   ├── medicationTools.js
│       │   ├── appointmentTools.js
│       │   ├── alertTools.js
│       │   ├── medicalHistoryTools.js
│       │   └── emergencyTools.js
│       ├── models/
│       │   ├── Patient.js
│       │   ├── Medication.js
│       │   ├── DoseLog.js
│       │   ├── Prescription.js
│       │   ├── Appointment.js
│       │   └── Alert.js
│       ├── services/
│       │   ├── visionService.js  # Prescription OCR & uncertainty flagging
│       │   └── vectorService.js  # Qdrant embeddings & patient-filtered search
│       ├── middleware/
│       │   ├── auth.js           # Firebase token verification & access control
│       │   └── errorHandler.js   # Centralized error handler
│       ├── routes/
│       │   ├── agent.routes.js   # /api/agent/chat & /api/agent/tools
│       │   ├── prescription.routes.js # Upload & human verification
│       │   ├── medication.routes.js   # Scheduled meds & dose logging
│       │   └── health.routes.js  # Health & component diagnostics
│       └── tests/
│           └── agentOrchestrator.test.js # Test suite verifying tool execution
├── frontend/
│   ├── .env.example              # Frontend environment template
│   ├── .env                      # Active local frontend environment
│   ├── package.json              # Vite & React dependencies
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx               # Dashboard layout
│       ├── index.css
│       ├── components/
│       │   ├── Header.jsx        # Patient & Caregiver navigation
│       │   ├── AgentChat.jsx     # Conversational Mistral interface
│       │   ├── MedicationList.jsx# Daily schedule & dose logging
│       │   ├── PrescriptionUpload.jsx # Prescription upload pipeline
│       │   ├── VerificationModal.jsx  # Human verification for uncertain fields
│       │   └── EmergencySOS.jsx  # Deterministic SOS trigger dialog
│       └── services/
│           └── api.js            # Frontend API client
└── README.md
```

---

## 🚀 Registered Initial Tools (10)

1. `read_prescription`: Analyzes uploaded prescription image, flags handwriting uncertainties.
2. `create_medication`: Saves verified medication into patient schedule (consequential: requires human verification).
3. `get_medications`: Retrieves active prescriptions, timings, dosages, and stock.
4. `log_dose`: Records dose intake (`taken`, `skipped`, `missed`), updating stock.
5. `search_medical_history`: Queries Qdrant vector memory scoped to the patient.
6. `create_appointment`: Books physician consultation (consequential: requires confirmation).
7. `check_medicine_stock`: Evaluates pill inventory and flags upcoming refills.
8. `send_caregiver_alert`: Dispatches urgent care alert to designated family caregivers.
9. `generate_doctor_brief`: Synthesizes clinical adherence brief with source citations.
10. `trigger_sos`: Executes deterministic emergency contact dispatch.

---

## ⚙️ Configuration & Quickstart

### 1. Backend Setup

```bash
cd backend
npm install
npm test            # Runs the tool registry and agent orchestrator test suite
npm run dev         # Starts server on http://localhost:5000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev         # Starts Vite dev server on http://localhost:5173
```
