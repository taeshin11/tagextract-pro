# Product Requirements Document (PRD): TagExtract Pro

## 1. Project Overview
- **Service Name:** TagExtract Pro
- **Short Title:** YT Video Tags
- **Topic:** A web-based tool that extracts hidden tags and keywords from a specific YouTube video URL and displays them in a clean dashboard format. An essential SEO tool for YouTubers.
- **Development Strategy:** Pure frontend (Vanilla JavaScript, HTML, CSS). Call the YouTube Data API v3 (free quota) directly from the client to parse JSON data and render it on the screen. No backend server is required.

## 2. Harness Design Methodology Instructions
**ATTENTION CLAUDE CODE:** You are an autonomous AI coding agent. You MUST strictly follow the "Harness Design" methodology to prevent context loss and ensure high quality without human intervention.

### 2.1 Initializer Agent (Execute First)
Immediately upon starting, create the following three state-management files in the root directory:
1. `feature_list.json`: A comprehensive list of all milestones and features to build, tracking their status.
2. `claude-progress.txt`: A tracking file to record what is done, current status, and next steps.
3. `init.sh`: A shell script containing commands to start the local development server (e.g., using `npx serve`).

### 2.2 Fixed Session Routine
For every new session or task, you must strictly loop through these steps:
1. **Read Context:** Read `claude-progress.txt` and `feature_list.json`.
2. **Select Task:** Pick the next pending feature.
3. **Execute (Maker Role):** Write the code to implement the feature.
4. **Review (Reviewer Role):** Critically review your own code for bugs, UI/UX responsiveness, and adherence to constraints before finalizing.
5. **Update State:** Commit the changes, and update the progress files. Move to the next feature.

## 3. Core Requirements (MANDATORY CONSTRAINTS)

### 3.1 Zero-Cost Architecture
The entire service must be built with absolutely zero running cost. Use pure frontend technologies and free API quotas only. Do not use any paid services or databases.

### 3.2 High Searchability (SEO Optimization)
The site must be highly optimized for search engines. Implement semantic HTML5 structure. Add robust SEO `<meta>` tags (title, description, keywords), Open Graph (OG) tags, and Twitter Cards to ensure professional sharing previews.

### 3.3 Fully Responsive Web Design
The UI must be fully responsive across Mobile, Tablet, and Desktop screens. Use a mobile-first approach. You may use a lightweight CSS framework like Tailwind CSS (via CDN) or pure CSS Flexbox/Grid.

### 3.4 Unobtrusive Visitor Counter
Display "Today's Visitors" and "Total Visitors". 
- **Rule:** Place this counter discreetly in the footer so it does not interfere with the user experience.
- **Implementation:** Use a free, public hit counter API (e.g., hits.seeyoufarm.com, CountAPI, or similar) without needing a backend.

### 3.5 Automated GitHub Repo Creation & Git Push
- **Action Required:** You MUST automatically create the GitHub repository using the GitHub CLI.
- Run: `gh repo create tagextract-pro --public --source=. --remote=origin --push`
- You MUST execute `git add .`, `git commit -m "..."`, and `git push origin main` at the completion of every single milestone.

### 3.6 Actual Deployment (Vercel or Netlify)
To hide the user's GitHub ID, do not use GitHub Pages. 
- **Action Required:** DO NOT merely write a guide on how to deploy. You must ACTUALLY execute the deployment using the CLI (e.g., `npx vercel --prod --yes` or `npx netlify deploy --prod`). Provide the final deployed live URL in the terminal and log it in `claude-progress.txt`.

### 3.7 Free Data Collection via Google Sheets Webhook
- **Action Required:** DO NOT merely write a guide. Implement the actual functionality.
- Write the Google Apps Script code for the Webhook in a separate file named `webhook.gs` for the user to deploy.
- In the frontend JavaScript, implement an asynchronous `POST` request (using `fetch` with `mode: 'no-cors'`). When the user clicks the "Calculate / Extract" button, it MUST automatically and silently send the inputted YouTube URL to the Webhook URL.

### 3.8 Immediate Monetization (Adsterra Integration)
The service must generate fast revenue. Do not wait for Google AdSense approval.
- **Action Required:** Integrate **Adsterra** ad units directly into the HTML from day one.
- Create designated UI placeholders for Adsterra Banners (e.g., a 728x90 banner below the search bar, and a 320x50 banner at the bottom of the results).
- Include placeholders for an Adsterra Popunder or Social Bar script inside the `<head>`. Leave clear HTML comments like `` so the user can easily paste their Zone ID.

## 4. Development Milestones (For `feature_list.json`)

**Milestone 1: Harness & Repo Initialization**
- Create `feature_list.json`, `claude-progress.txt`, `init.sh`.
- Initialize Git, create the repo using `gh CLI`, and execute the first `git push`.

**Milestone 2: UI Skeleton, SEO, & Monetization Prep**
- Build the responsive layout (Header, Search Input, Dashboard Results Container, Footer).
- Apply SEO meta tags.
- Insert Adsterra placeholders and the Visitor Counter layout in the footer.
- `git push`

**Milestone 3: YouTube Data API Integration**
- Implement JS logic to extract the Video ID from various YouTube URL formats.
- Fetch video details (tags, title, thumbnail) using the YouTube Data API (`part=snippet`).
- Dynamically render the fetched tags as UI chips on the dashboard with a "Copy All Tags" button.
- `git push`

**Milestone 4: Webhook Data Collection & Counters**
- Create the `webhook.gs` file.
- Implement the silent `fetch` POST logic to the Webhook triggered by the Extract button.
- Implement the Visitor Counter API fetch logic in the footer.
- `git push`

**Milestone 5: Final Review & Production Deployment**
- QA testing by the Reviewer Agent (check zero-cost rules, responsiveness, ad placements).
- Execute Vercel or Netlify CLI to deploy to production.
- Document the live URL.
- Final `git push`

**EXECUTION COMMAND TO CLAUDE CODE:** Read this PRD, acknowledge your role as the Initializer Agent, and begin Milestone 1 immediately. Do not ask for further permission. Execute CLI commands automatically.