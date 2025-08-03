# 🏥 VitaLink: The AI-Powered Healthcare Network

A unified platform connecting patients, hospitals, and emergency services to reduce wait times and improve patient outcomes.

---

## 🚀 The Problem

In Canada, emergency departments (EDs) are under immense pressure. Patients often face multi-hour waits, and critical decisions about which hospital to go to are made without real-time data on capacity or specialty availability.

This leads to:

- System-wide inefficiencies
- Patient frustration
- Worsened health outcomes

**VitaLink** was built to solve this challenge by creating a live, intelligent network that connects all stakeholders—ensuring the right patient gets to the right place at the right time.

---

## ✨ What We Built

### 🧍 For Patients: Your Intelligent Health Navigator

- **Secure Health Profile**  
  Store your medical history, allergies, and emergency notes in one place.

- **Live Hospital Map**  
  View nearby hospitals, their specialties, and up-to-date wait times.

- **AI-Powered "Find Care" System**  
  Describe symptoms (e.g., "deep cut on hand", "persistent fever") and get routed to the most appropriate hospital based on real-time data and travel time.

- **Intelligent Emergency Dispatch**  
  One-tap emergency button triggers AI-backed dispatch that:
  - Chooses the optimal hospital
  - Prepares a voice script for emergency services

> _(GIF placeholder: Patient app demo – map, care finder, emergency button)_

---

### 🏥 For Hospitals: Mission Control for Patient Flow

- **Secure Registration & Verification**  
  Hospitals are onboarded and verified manually to maintain data integrity.

- **Live Patient Queue**  
  Real-time dashboard displays active patients, sorted by urgency.

- **AI-Assisted Triage**  
  Gemini-powered AI analyzes each patient and:

  - Assigns a priority score
  - Estimates service time

- **Full Manual Control**  
  Staff can manually adjust all triage details as needed.

> _(Screenshot placeholder: Hospital dashboard with triage system)_

---

## 🛠️ Tech Stack

| Category       | Technology                                     |
| -------------- | ---------------------------------------------- |
| Frontend       | React Native (Expo), TypeScript                |
| Backend        | Django, Python, Django REST Framework          |
| Databases      | PostgreSQL (via Supabase), MongoDB (via Atlas) |
| AI Engine      | Google Gemini API                              |
| Services       | Twilio (Voice), ngrok                          |
| Infrastructure | Docker, Raspberry Pi (planned edge device)     |

---

## ⚙️ Getting Started

### 🔧 Prerequisites

- Node.js & npm
- Python 3.10+ & pip
- An ngrok account

---

### 🔙 Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```


Create a `.env` file in the `backend` folder:

```env
SECRET_KEY='your-django-secret-key'
DEBUG=True
DB_NAME='postgres'
DB_USER='your-db-user'
DB_PASSWORD='your-db-password'
DB_HOST='your-db-host'
DB_PORT='5432'
ALLOWED_HOSTS='127.0.0.1,your-ngrok-url.ngrok-free.app'
GEMINI_API_KEY='your_gemini_api_key'
MONGO_URI='your_mongodb_connection_string'
```

Run migrations and start the server:

```bash
python manage.py migrate
python manage.py runserver
```

Expose the local server:

```bash
ngrok http 8000
```

Copy the ngrok HTTPS URL for frontend use.

---

### 💻 Frontend Setup

```bash
cd frontend
npm install
```

Update `api/apiClient.js`:

```js
export const API_BASE_URL = "https://your-ngrok-url.ngrok-free.app";
```

Start the Expo development server:

```bash
npx expo start
```

Scan the QR code using Expo Go on your mobile device.

---

## 🧠 Key Features in Detail

### 🔍 Recommendation Algorithm

Our "Find Care" and "Emergency Dispatch" systems are powered by a multi-factor decision engine:

- **Patient Condition:** Severity of symptoms or emergency category
- **Travel Time:** Based on real-time geolocation
- **Live Wait Times:** Pulled from hospital dashboards

Gemini AI returns a recommendation _with reasoning_, making the process transparent.

---

### 🩺 AI-Assisted Triage

When a hospital admits a patient:

- Their profile is sent to Gemini AI
- It returns a **priority score (1–10)** and **estimated service time**
- Staff can override manually for full control

---

## 🔮 Future Work

- **EMS & Paramedic Interface:**
  Tablet app for ambulances to receive and send patient info in transit.

- **Predictive Wait Times:**
  Use historical queue data to forecast future hospital wait times.

- **Direct EHR Integration:**
  Build secure APIs to connect VitaLink with hospital EHR systems.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
