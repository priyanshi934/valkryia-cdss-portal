# Valkryia CDSS Portal

A working demo of Valkryia's clinical decision support system (CDSS) for women's hormonal health: PCOS/PMOS, anaemia, endometriosis, perimenopause and menopause. Built for the Seva First Innovation Challenge 2026.

**Live demo:** `<add your Render link here>`
**Demo video:** `<add your video link here>`

> Prototype. Every patient and value is fictional. Valkryia does not diagnose. The rules are samples and will be finalised with our consultant gynaecologist.

## What you can try

| Side | What it shows |
| --- | --- |
| **Patient** | A four-step check-in (about you, period dates, symptoms, reports), then her health picture: predicted period window, cycle day and phase with a confidence level, alerts in plain words with "why am I seeing this", a cycle-length chart and a daily lifestyle plan. Five fictional sample patients are included. |
| **Doctor** | Patients who consented to share, sorted by urgency. Each alert shows its evidence, the rule and version that raised it, and actions (reviewed, advised tests, booked consult, not relevant) that update her app. Clinical input (PCOS status, medication, lifestyle goal, Ayurveda tips) shows exactly what changes on her side. |
| **How it works** | The six-step logic and the full table of sample rules. |

## How the CDSS works

1. **She logs** period dates, symptoms and how often they happen, and reports such as haemoglobin.
2. **Valkryia builds her picture:** her own median cycle length, its variation (SD), the next-period window (25th to 75th percentile of her cycles), phase, and confidence. With fewer than three cycles it blends her data with a typical 28-day cycle. Cycles about twice her usual length are treated as possibly missed logs and left out of averages.
3. **Doctor-approved rules check the picture.** Each rule is versioned, so every alert can be traced to the exact rule that raised it. The same inputs always give the same result.
4. **Alerts are sorted by urgency:** act today, within a few weeks, or keep an eye on it. Safety rules (very heavy bleeding, very low haemoglobin) come first.
5. **Both sides see it:** plain words for her; evidence, rule and urgency for her doctor, only with consent.
6. **The doctor closes the loop:** actions and clinical input update her app straight away.

### Sample rules

| Rule | Urgency | Trigger |
| --- | --- | --- |
| Very heavy bleeding today | Act today | Soaking a pad or tampon hourly, or feeling faint |
| Very low haemoglobin | Act today | Hb below 8 g/dL |
| Long cycles | Within a few weeks | 2 or more of the last 6 cycles over 35 days (natural cycles only) |
| Low haemoglobin with tiredness | Within a few weeks | Hb 8 to 12 g/dL with fatigue on most days |
| Haemoglobin below range | Keep an eye on it | Hb 8 to 12 g/dL without marked fatigue |
| Pain pattern | Within a few weeks | Painful periods most days plus pelvic pain between periods |
| Possible perimenopause symptoms | Keep an eye on it | Age 40+ with frequent hot flushes or night sweats |
| Iron follow up / PCOS care | Keep an eye on it | Set by the doctor's clinical input |

Users on the combined pill get withdrawal bleeds, not natural periods, so predictions, phase tracking and natural-cycle rules are paused for them.

## Tech

- Plain HTML, CSS and JavaScript. No framework, no build step, no backend.
- All data stays in the browser tab and resets on reload. Nothing is sent to a server.
- Accessible: keyboard focus styles, ARIA labels, light and dark themes, reduced-motion support.

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy on Render

This repo includes `render.yaml`. In Render: **New → Static Site**, connect this repository, leave the build command as is, and set the publish directory to `./`.

## Team

Valkryia, incubated at Anveshan Foundation, IGDTUW. Alisha Chadha and Priyanshi Grover.

## Licence

All rights reserved. See `LICENSE`.
