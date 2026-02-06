# Synthflow Calendar Booking — User Manual

A step-by-step guide for setting up and using the Synthflow Voice AI Calendar Booking system. This application connects your Synthflow voice agents to your clients' calendars so that bookings are created automatically when customers call in.

---

## Table of Contents

1. [Getting the Application](#1-getting-the-application)
2. [Installing on Your Computer](#2-installing-on-your-computer)
3. [Configuration (API Keys)](#3-configuration-api-keys)
4. [Starting the Application](#4-starting-the-application)
5. [The Admin Dashboard](#5-the-admin-dashboard)
6. [Creating Your First Client Account](#6-creating-your-first-client-account)
7. [Connecting a Calendar to an Account](#7-connecting-a-calendar-to-an-account)
8. [Setting Up the Synthflow Webhook](#8-setting-up-the-synthflow-webhook)
9. [Configuring Account Settings](#9-configuring-account-settings)
10. [Managing Bookings](#10-managing-bookings)
11. [Editing and Deleting Accounts](#11-editing-and-deleting-accounts)
12. [Deploying to the Internet](#12-deploying-to-the-internet)
13. [Frequently Asked Questions](#13-frequently-asked-questions)

---

## 1. Getting the Application

### Download from GitHub

1. Open the GitHub repository page in your web browser.
2. Click the green **Code** button near the top-right of the page.
3. In the dropdown, click **Download ZIP**.
4. Once the ZIP file downloads, find it in your Downloads folder and unzip it (right-click > "Extract All" on Windows, or double-click on Mac).
5. You now have a folder with all the application files.

### Alternative: Using Git (if you have it installed)

If you have Git installed, you can open a terminal (Command Prompt on Windows, Terminal on Mac) and run:

```
git clone https://github.com/milobrandon/Test.git
cd Test
```

---

## 2. Installing on Your Computer

### Prerequisites

You need **Node.js** installed on your computer. If you don't have it:

1. Go to [https://nodejs.org](https://nodejs.org)
2. Download the version labeled **"LTS"** (Long Term Support) — this is the recommended stable version.
3. Run the installer and follow the on-screen steps. Accept all the defaults.
4. To verify it installed correctly, open a terminal and type:
   ```
   node --version
   ```
   You should see a version number like `v20.x.x` or similar.

### Install the Application

1. Open a terminal (Command Prompt / PowerShell on Windows, Terminal on Mac/Linux).
2. Navigate to the folder where you unzipped or cloned the application:
   ```
   cd path/to/the/folder
   ```
   For example, if it's on your Desktop:
   - **Windows:** `cd C:\Users\YourName\Desktop\Test`
   - **Mac:** `cd ~/Desktop/Test`
3. Run this command to install the required software packages:
   ```
   npm install
   ```
   This may take a minute. You'll see some progress messages — that's normal.

---

## 3. Configuration (API Keys)

Before running the application, you need to set up a configuration file with your API keys. You only need to configure the calendar providers you plan to use.

### Create Your Configuration File

1. In the application folder, find the file named `.env.example`.
2. Make a copy of it and rename the copy to `.env` (just `.env`, nothing else).
   - **Windows:** In File Explorer, copy the file and rename it. You may need to enable "Show file extensions" in View settings.
   - **Mac/Linux:** In the terminal, run: `cp .env.example .env`
3. Open the `.env` file in any text editor (Notepad, TextEdit, VS Code, etc.).

### Server Settings

```
PORT=3000
APP_URL=http://localhost:3000
```

- **PORT** — The port number the app runs on. Leave as `3000` unless that port is already in use.
- **APP_URL** — The address of your application. Keep as `http://localhost:3000` for local use. When you deploy to the internet, change this to your actual domain (e.g., `https://booking.yourdomain.com`).

### Synthflow Settings

```
SYNTHFLOW_API_KEY=your_synthflow_api_key
SYNTHFLOW_WEBHOOK_SECRET=your_webhook_secret
```

1. Log in to your [Synthflow dashboard](https://app.synthflow.ai).
2. Find your **API Key** in your account settings and paste it after `SYNTHFLOW_API_KEY=`.
3. If Synthflow provides a **Webhook Secret** for verifying incoming requests, paste it after `SYNTHFLOW_WEBHOOK_SECRET=`. If not, you can leave it blank.

### Google Calendar (Optional)

Only set this up if your clients use Google Calendar.

```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

To get these credentials:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (or select an existing one).
3. Go to **APIs & Services > Library**, search for "Google Calendar API", and click **Enable**.
4. Go to **APIs & Services > Credentials**.
5. Click **Create Credentials > OAuth 2.0 Client ID**.
6. Set Application type to **Web application**.
7. Under **Authorized redirect URIs**, add: `http://localhost:3000/auth/google/callback`
   (When you deploy, also add your production URL, e.g., `https://booking.yourdomain.com/auth/google/callback`)
8. Click **Create**. You'll see your **Client ID** and **Client Secret** — copy them into the `.env` file.
9. Go to **APIs & Services > OAuth consent screen** and configure it (you can use "External" testing mode with your own email for now).

### Microsoft Outlook (Optional)

Only set this up if your clients use Outlook / Microsoft 365 calendars.

```
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
MICROSOFT_REDIRECT_URI=http://localhost:3000/auth/microsoft/callback
MICROSOFT_TENANT_ID=common
```

To get these credentials:

1. Go to the [Azure Portal](https://portal.azure.com/).
2. Navigate to **Azure Active Directory > App registrations > New registration**.
3. Name it something like "Synthflow Calendar Booking".
4. Under **Redirect URI**, select "Web" and enter: `http://localhost:3000/auth/microsoft/callback`
5. Click **Register**.
6. Copy the **Application (client) ID** — this is your `MICROSOFT_CLIENT_ID`.
7. Go to **Certificates & secrets > New client secret**. Copy the secret value — this is your `MICROSOFT_CLIENT_SECRET`.
8. Under **API permissions**, add: `Calendars.ReadWrite` and `offline_access`.
9. Leave `MICROSOFT_TENANT_ID=common` to allow any Microsoft account to connect.

### Apple Calendar / CalDAV (Optional)

Only set this up if your clients use Apple Calendar or another CalDAV-compatible service.

```
CALDAV_SERVER_URL=https://caldav.icloud.com
CALDAV_USERNAME=your_apple_id
CALDAV_PASSWORD=your_app_specific_password
```

For iCloud:
1. Go to [https://appleid.apple.com](https://appleid.apple.com) and sign in.
2. Under **Sign-In and Security**, find **App-Specific Passwords**.
3. Click **Generate an app-specific password**, give it a name like "Calendar Booking".
4. Copy the generated password and paste it as `CALDAV_PASSWORD`.
5. Use your Apple ID email as `CALDAV_USERNAME`.

### Save the File

After filling in the values you need, save and close the `.env` file.

---

## 4. Starting the Application

1. Open a terminal in the application folder.
2. Run:
   ```
   npm start
   ```
3. You should see:
   ```
   Synthflow Calendar Booking (Multi-Tenant)
   ──────────────────────────────────────────
   Admin Dashboard : http://localhost:3000
   API Base        : http://localhost:3000/api
   Webhooks        : http://localhost:3000/webhooks/:account-slug
   ```
4. Open your web browser and go to **http://localhost:3000**.
5. You should see the Admin Dashboard.

To stop the application, go back to the terminal and press **Ctrl+C**.

---

## 5. The Admin Dashboard

When you open the application, you'll see the **Admin Dashboard**. This is your central control panel. Here's what you'll find:

### Sidebar Menu

- **Dashboard** — Overview with stats across all your client accounts (total accounts, bookings, calendars, etc.).
- **Accounts** — Create and manage your client sub-accounts. This is where you'll spend most of your time.
- **All Bookings** — View every booking across all accounts in one place, with filters for account, status, and source.
- **Service Platforms** — Future integrations with ServiceTitan, Housecall Pro, and Jobber (coming soon).
- **Settings** — Global settings like your business name, default booking duration, and business hours.

### Stats Cards

The top of the dashboard shows key numbers at a glance:
- **Total Accounts** / **Active Accounts** — How many client accounts you've set up.
- **Total Bookings** / **Confirmed** / **Cancelled** — Booking counts across all clients.
- **Today** — Bookings scheduled for today.
- **Voice AI** — Bookings created automatically by Synthflow voice agents.
- **Calendars** — Total calendar connections across all accounts.

---

## 6. Creating Your First Client Account

Each of your clients gets their own **sub-account**. This keeps their calendars, bookings, and webhook URLs separate.

### Steps

1. Click **Accounts** in the sidebar (or click **"View All"** next to "Recent Accounts" on the dashboard).
2. Click the **+ New Account** button in the top-right corner.
3. Fill in the form:
   - **Account Name** (required) — The name of your client's business (e.g., "Acme Plumbing").
   - **Contact Name** — The primary contact person at this client.
   - **Contact Email** — Their email address.
   - **Contact Phone** — Their phone number.
   - **Synthflow Agent ID** — The ID of the Synthflow voice agent assigned to this client. You can find this in your Synthflow dashboard.
   - **Notes** — Any internal notes for your reference.
4. Click **Create Account**.

You'll be taken to the account's detail page. The system automatically generates:
- A unique **slug** (URL-safe name) for this account.
- Two **webhook URLs** — one for booking and one for availability — that are unique to this account.

---

## 7. Connecting a Calendar to an Account

Each account needs at least one calendar connected so that bookings can be created automatically.

### Steps

1. Navigate to the account (click on it from the **Accounts** page or from the dashboard).
2. Click the **Calendars** tab.
3. You'll see three calendar provider options:
   - **Google Calendar** — Click "Connect Google" to start the Google sign-in process.
   - **Microsoft Outlook** — Click "Connect Outlook" to start the Microsoft sign-in process.
   - **Apple / CalDAV** — Click "Connect CalDAV" (uses the credentials from your `.env` file).

### For Google Calendar

1. Click **Connect Google**.
2. A Google sign-in page will open. Sign in with the Google account that owns the calendar for this client.
3. Grant the requested permissions (the app needs to read and write calendar events).
4. You'll be redirected back to the account's Calendars tab, and you should see the calendar listed under "Connected Calendars".

### For Microsoft Outlook

1. Click **Connect Outlook**.
2. A Microsoft sign-in page will open. Sign in with the Microsoft account for this client.
3. Grant the requested permissions.
4. You'll be redirected back, and the calendar will appear.

### For Apple / CalDAV

1. Click **Connect CalDAV**.
2. The app will use the CalDAV credentials from your `.env` file to discover calendars.
3. Found calendars will appear in the list.

### Setting a Default Calendar

If an account has multiple calendars connected, you should set one as the **default**. This is the calendar where new bookings will be created.

1. In the Connected Calendars list, find the calendar you want as default.
2. Click the **Set Default** button next to it.

---

## 8. Setting Up the Synthflow Webhook

This is the critical step that connects your Synthflow voice agent to this application. When a customer calls and the voice agent collects booking information, Synthflow sends that data to a webhook URL — and this app handles it.

### Find Your Webhook URLs

1. Go to the account's detail page.
2. You can see the webhook URLs in two places:
   - The **Overview** tab (right side, under "Webhook URLs").
   - The **Webhooks** tab (shows them prominently with a copy button).
3. There are two URLs:
   - **Booking Webhook** — Synthflow sends data here when a call ends and booking info was collected.
   - **Availability Webhook** — Synthflow calls this during a live call to check available time slots.

Each URL looks something like:
```
http://localhost:3000/webhooks/acme-plumbing-a3f2b1
http://localhost:3000/webhooks/acme-plumbing-a3f2b1/availability
```

### Configure in Synthflow

1. Click the **Copy** button next to the Booking Webhook URL.
2. Log in to your [Synthflow dashboard](https://app.synthflow.ai).
3. Open the voice agent assigned to this client.
4. In the agent's settings, find the **Webhook** or **Post-Call Webhook** configuration.
5. Paste the **Booking Webhook URL** there.
6. If Synthflow supports a live availability lookup (a webhook called during the call), paste the **Availability Webhook URL** in that field as well.
7. Save the agent configuration.

### How It Works

Once configured, the flow is:

1. A customer calls the phone number connected to the Synthflow agent.
2. The voice agent answers and has a conversation, collecting details like the customer's name, preferred date/time, and service type.
3. When the call ends, Synthflow sends all the extracted data to the Booking Webhook URL.
4. This application receives that data, checks the connected calendar for conflicts, and creates a calendar event automatically.
5. The booking appears in the dashboard under the account's Bookings tab.

**Important:** For Synthflow to reach your webhook URLs, the application must be running and accessible from the internet. See [Section 12: Deploying to the Internet](#12-deploying-to-the-internet) for instructions on making your app publicly accessible.

---

## 9. Configuring Account Settings

Each account can have its own business hours and booking preferences.

### Steps

1. Go to the account's detail page.
2. Click the **Settings** tab.
3. Configure:
   - **Default Duration** — How long each appointment is in minutes (default: 60).
   - **Buffer Between Appointments** — Minimum gap between consecutive bookings in minutes (default: 15).
   - **Business Hours Start / End** — The hours during which bookings are allowed (e.g., 8:00 AM to 6:00 PM).
   - **Timezone** — The timezone for this account's business hours (e.g., `America/New_York`, `America/Chicago`, `America/Los_Angeles`).
   - **Work Days** — Which days of the week are available, as comma-separated numbers (1=Monday, 2=Tuesday, ... 7=Sunday). For Monday through Friday, enter: `1,2,3,4,5`.
4. Click **Save Account Settings**.

### Global Settings

There are also global settings that apply as defaults for all accounts:

1. Click **Settings** in the sidebar.
2. These include your business name, default calendar provider, default duration, buffer time, and business hours.
3. Individual account settings override these global defaults.

---

## 10. Managing Bookings

### Viewing Bookings

**For a specific account:**
1. Go to the account's detail page.
2. Click the **Bookings** tab.
3. All bookings for that account are listed, newest first.

**Across all accounts:**
1. Click **All Bookings** in the sidebar.
2. Use the dropdown filters at the top to narrow results by:
   - **Account** — Select a specific client.
   - **Status** — Show only Confirmed, Cancelled, or Pending.
   - **Source** — Show only Voice AI or Manual bookings.

### Creating a Manual Booking

If you need to add a booking by hand (not from a voice call):

**From an account's page:**
1. Go to the account's detail page.
2. Click the **+ New Booking** button in the top-right.
3. Fill in the customer details, date, time, duration, and any notes.
4. Click **Create Booking**.

**From the All Bookings page:**
1. Click **All Bookings** in the sidebar.
2. Click the **+ New Booking** button.
3. Select which account this booking belongs to from the dropdown.
4. Fill in the details and click **Create Booking**.

### Cancelling a Booking

1. Find the booking in either the account's Bookings tab or the All Bookings page.
2. Click the red **Cancel** button in the Actions column.
3. Confirm the cancellation. The calendar event will also be removed from the connected calendar.

---

## 11. Editing and Deleting Accounts

### Editing an Account

1. Go to the account's detail page.
2. Click the **Edit Account** button in the top-right.
3. Update any fields — name, contact info, Synthflow Agent ID, status, or notes.
4. To temporarily disable an account, change the **Status** to "Inactive". Inactive accounts won't process incoming webhooks.
5. Click **Save Changes**.

### Deleting an Account

**Warning:** Deleting an account permanently removes all of its data — bookings, calendar connections, webhook logs, and settings.

1. Go to the account's detail page.
2. Click **Edit Account**.
3. Click the red **Delete Account** button at the bottom-left of the form.
4. Confirm the deletion.

---

## 12. Deploying to the Internet

For Synthflow's servers to send webhook data to your application, it must be accessible from the internet — not just your local computer. Here are your options:

### Option A: Using a Cloud Hosting Service

Popular options for hosting Node.js applications:

- **Railway** ([railway.app](https://railway.app)) — Simple deployment from GitHub.
- **Render** ([render.com](https://render.com)) — Free tier available.
- **DigitalOcean App Platform** ([digitalocean.com](https://digitalocean.com)) — Reliable and affordable.
- **Heroku** ([heroku.com](https://heroku.com)) — Well-known platform for Node.js apps.

General steps for any platform:

1. Push your code to a GitHub repository (if you haven't already).
2. Sign up for the hosting service.
3. Connect your GitHub repository.
4. Set your environment variables (everything from your `.env` file) in the hosting service's dashboard. **Do not upload your `.env` file to GitHub** — it contains secrets.
5. Update the `APP_URL` environment variable to your new public URL (e.g., `https://your-app-name.railway.app`).
6. Update `GOOGLE_REDIRECT_URI` and `MICROSOFT_REDIRECT_URI` to use your public URL as well.
7. Deploy. The service will run `npm install` and `npm start` automatically.
8. Go back to your Synthflow agent configurations and update the webhook URLs to use your new public domain.

### Option B: Using ngrok for Testing

If you just want to test quickly without a full deployment:

1. Install ngrok from [https://ngrok.com](https://ngrok.com).
2. Start your application locally (`npm start`).
3. In another terminal, run:
   ```
   ngrok http 3000
   ```
4. ngrok will give you a public URL like `https://abc123.ngrok.io`.
5. Use that URL in your Synthflow webhook settings temporarily.

**Note:** ngrok URLs change every time you restart it (unless you have a paid plan), so this is for testing only.

### After Deploying

Once your app is live on the internet:

1. Update the `APP_URL` in your hosting environment variables to your public URL.
2. Update the OAuth redirect URIs in your Google Cloud Console and Azure Portal to include the new domain.
3. Each account's webhook URLs will automatically reflect the new `APP_URL`. You may need to re-copy them into your Synthflow agent settings.

---

## 13. Frequently Asked Questions

### "I created an account but I don't see any bookings coming in."

Check the following:
1. Is a calendar connected to the account? Go to the account's **Calendars** tab and verify.
2. Is the webhook URL configured correctly in Synthflow? Go to the account's **Webhooks** tab, copy the URL, and double-check it matches what's in your Synthflow agent settings.
3. Is the application accessible from the internet? Synthflow can't reach `localhost` — you need a public URL (see Section 12).
4. Is the account status set to "Active"? Inactive accounts reject webhook calls.
5. Check the **Webhooks** tab for the account — if Synthflow is reaching your app, you'll see logged events there even if the booking itself failed.

### "The Google/Outlook sign-in page shows an error."

- Make sure you've entered the correct `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (or Microsoft equivalents) in your `.env` file.
- Make sure the **redirect URI** in your Google Cloud Console or Azure Portal exactly matches what's in your `.env` file.
- If you see "This app isn't verified" on Google, click **Advanced > Go to (app name)** to proceed (this is normal during development).

### "Can multiple accounts use the same Google/Outlook login?"

Yes. Each account's calendar connection is independent. Two accounts could connect the same Google account if needed, or different accounts can use different Google accounts.

### "What happens if there's a scheduling conflict?"

The application checks the connected calendar for existing events before creating a booking. If the requested time slot is already taken, it will attempt to find the nearest available slot based on the account's business hours and buffer settings.

### "Can I use this without Synthflow?"

Yes. You can create **manual bookings** through the dashboard for any account. The manual bookings will also be added to the connected calendar. The Synthflow integration is for automating bookings from voice calls, but the dashboard works independently.

### "Where is the data stored?"

All data is stored in JSON files in the `data/` folder inside the application directory:
- `accounts.json` — All client accounts.
- `bookings.json` — All bookings.
- `calendars.json` — Calendar connection details.
- `settings.json` — Global settings.
- `account_settings.json` — Per-account settings.
- `webhook_logs.json` — Incoming webhook event logs.

For a production deployment with many accounts and bookings, you may want to migrate to a database. The JSON file storage works well for small-to-medium usage.

### "How do I update the application?"

If you cloned from GitHub:
1. Open a terminal in the application folder.
2. Run `git pull` to get the latest changes.
3. Run `npm install` in case any new packages were added.
4. Restart the application.

If you downloaded a ZIP, download the new ZIP, unzip it, and copy your `.env` file and `data/` folder from the old version to the new one.
