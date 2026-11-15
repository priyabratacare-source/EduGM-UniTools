# EduGM UniTools

A free, privacy-first collection of academic calculators and PDF utilities for students. All tools run **entirely in your browser** — your files and data never leave your device.

Built for MAKAUT students and anyone who needs quick, reliable academic calculations.

[![Live Site](https://img.shields.io/badge/Live-tool.codebihin.in-6546e8?style=flat-square)](https://tool.codebihin.in)
[![GitHub Pages](https://img.shields.io/badge/Hosted-GitHub%20Pages-1769e0?style=flat-square)](https://priyabratacare-source.github.io/EduGM-UniTools/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](#license)

---

## ✨ Features

- **100% client-side** — no uploads, no servers, no tracking
- **Mobile-friendly** — works on phones, tablets, and desktops
- **Privacy-first** — PDFs and images are processed locally via `pdf-lib`, `PDF.js`, and canvas
- **Free forever** — no accounts, no paywalls
- **Team dashboard** — Firebase-backed admin panel for managing donations, messages, and audit logs

---

## 🧮 Academic Calculators

| Tool | Description |
|---|---|
| [SGPA Calculator](sgpa-calculator.html) | Calculate Semester Grade Point Average from grades and credits |
| [CGPA Calculator](cgpa-calculator.html) | Compute cumulative GPA across semesters |
| [Percentage Calculator](percentage-calculator.html) | Convert marks to percentages |
| [Marks Calculator](marks-calculator.html) | Total marks, obtained marks, and score |
| [MAKAUT Calculator](makaut-calculator.html) | MAKAUT-specific grading support |
| [SGPA to Percentage](sgpa-to-percentage.html) | Convert SGPA to percentage using common university formulas |
| [Engineering Calculator](engineering-calculator.html) | Math and numerical utilities for engineering students |

## 📄 PDF & Image Tools

| Tool | Description |
|---|---|
| [Scan to PDF](scan-to-pdf.html) | Capture with camera or upload photos, combine into a PDF |
| [PDF to JPG](pdf-to-jpg.html) | Convert PDF pages to high-quality JPG images |
| [Remove Pages](remove-pages-pdf.html) | Preview and delete unwanted pages from a PDF |
| [Optimize PDF](optimize-pdf.html) | Analyze and reduce PDF size |
| [PDF Size Reducer](pdf-size-reducer.html) | Compress PDF files locally |
| [Image Size Reducer](image-size-reducer.html) | Compress images in the browser |
| [Protect PDF](protect-pdf.html) | Add AES-256 password protection |
| [Unlock PDF](unlock-pdf.html) | Remove password protection from PDFs you own |
| [Repair PDF](repair-pdf.html) | Attempt to fix damaged PDFs |
| [OCR PDF](ocr-pdf.html) | Recognize text from scanned PDF pages |

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vanilla HTML, CSS, JavaScript |
| **PDF engine** | [PDF.js](https://mozilla.github.io/pdf.js/), [pdf-lib](https://pdf-lib.js.org/) |
| **Auth** | [Firebase Authentication](https://firebase.google.com/docs/auth) |
| **Database** | [Cloud Firestore](https://firebase.google.com/docs/firestore) |
| **Email** | [EmailJS](https://www.emailjs.com/) |
| **Hosting** | GitHub Pages + custom domain (`tool.codebihin.in`) |

No build step. No bundler. No framework. Just open the HTML files.

---

## 📁 Project Structure
