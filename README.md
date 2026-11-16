# kantimohanthy.com

Ujwal Shyam Kantimohanthy's public "open to work" page with a password-locked job tracker, served by GitHub Pages at https://kantimohanthy.com.

- `index.html` – the whole site (static, no build step, no tracking, no secrets).
- `jobs.enc.json` – the tracked roles, encrypted (AES-256-GCM, PBKDF2-SHA256 600k). The page decrypts it in the browser after the password is entered.
- `applications.enc.json` – fellowships, masters, scholarships and programme applications, encrypted the same way and unlocked with the same password (plaintext `applications.json` is git-ignored). Shown in the page's "Fellowships & masters applications" section.
- `tools/vault.py` – lock/unlock `jobs.json` <-> `jobs.enc.json` with the `JOBS_PASSWORD` environment variable. The plaintext `jobs.json` is git-ignored and must never be committed.
- `Ujwal_Kantimohanthy_CV.pdf` – public CV (no phone number).
- `CNAME` – custom domain for GitHub Pages.

## How it updates

A scheduled Claude task runs every 6–12 hours. Each run:

1. Searches job boards (Indeed, LinkedIn, remote boards) for junior network, systems, IT support and web roles in Rome or remote, open to someone living in Italy.
2. Unlocks `jobs.enc.json`, adds new matches to `jobs.json` with the next `job_id`, never removing or renumbering existing rows.
3. Checks Gmail for application confirmations, interview invites and rejections, and updates each role's `status`.
4. Sets `updated` to the run time (UTC ISO), re-locks into `jobs.enc.json`, and commits only the encrypted file with a message like `jobs: +4 roles, 2 status changes`.

## applications.json row

`app_id, name, type, category (Masters – Italy|Masters – Europe|Masters – World|Funding – Italy|Funding – International|Fellowships & research|AI safety|Open source|Internet & policy|Summer schools|Competitions|Accelerators|Industry & other|Not eligible), eligibility, requirements, deadline (text), deadline_date (YYYY-MM-DD or null), funding, status, url (https only or null), verified (bool)`, plus top-level `updated`, `source`, `notes`.

Lock/unlock: `python3 tools/vault.py lock applications.json applications.enc.json`.

## jobs.json row

`job_id, title, company, location, mode (Rome|Remote), track (Network|IT Support|Software|AI|Other), contract, level, posted (YYYY-MM-DD), applicants, salary_min, salary_max (EUR/yr or null), fit (A|B|C|Skip), status (To apply|Applied|Interview|Offer|Rejected|Skipped), next_action, url (https only)`

## Security notes

- No API keys, passwords or secrets anywhere in this repo; the site makes no calls except to its own `jobs.enc.json`.
- The password is never stored by the site; it stays in the browser tab's session storage until the tab is closed or Lock is pressed.
- All data is rendered with `textContent`; links are restricted to `https://`.
- A Content-Security-Policy meta tag limits scripts, styles and connections to this site (plus Google Fonts).
