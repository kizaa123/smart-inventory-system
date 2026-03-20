# Render Deployment Guide (Stockmaster POS)

Follow these exact steps to get your system live on Render.com with a **Persistent Database**.

---

### Step 1: Push Code to GitHub
1. Create a **Private** repository on GitHub.
2. Push your entire project folder (including `backend/` and `sub-folder/`) to this repository.

### Step 2: Create a Render "Web Service"
1. Log in to [dashboard.render.com](https://dashboard.render.com).
2. Click **New +** > **Web Service**.
3. Connect your GitHub repository.

### Step 3: Configure Build & Start
Fill in these exact settings:
- **Name:** `stockmaster-pos` (or anything you like)
- **Root Directory:** (Leave Blank - let it be the project root)
- **Runtime:** `Node`
- **Build Command:** `cd backend && npm install`
- **Start Command:** `cd backend && node server.js`

### Step 4: Setup Persistent Storage (CRITICAL)
1. In your Render service, go to the **Disk** tab on the left.
2. Click **Add Disk**.
3. Name: `database-disk`
4. Mount Path: `/var/data`
5. Size: `1 GB` (Free tier is fine)

### Step 5: Set Environment Variables
1. Go to the **Environment** tab on the left.
2. Click **Add Environment Variable**.
3. **Key:** `DATABASE_PATH`
4. **Value:** `/var/data/stockmaster.db`
5. Click **Save Changes**.

---
<!-- render tips -->
Key settings to remember when you select "Web Service":
Runtime: Node
Build Command: ### cd backend && npm install
Start Command: ### cd backend && node server.js
One important tip: When you create the "Web Service," Render might ask you for a "Plan." You can start with the Free plan to test it, but for your client to use the Persistent Disk (so they don't lose data), they will eventually need the Starter plan ($7/mo).
### Why is Step 4 & 5 important?
Standard cloud servers "reset" every time you update your code. If you don't use this **Persistent Disk**, your inventory items and stock counts will be **deleted** every time the server restarts!

### How to access the site?
Once the build is finished, Render will give you a link like:
`https://stockmaster-pos.onrender.com`

**Your client can now use this link from anywhere in the world!**
