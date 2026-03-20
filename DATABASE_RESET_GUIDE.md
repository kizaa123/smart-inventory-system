# Master Database Reset Guide

Use these steps to completely clear your system data (Inventory, Sales, Suppliers, etc.) while **keeping your login passwords safe**.

### ⚠️ IMPORTANT: READ THIS FIRST
This process is **PERMANENT**. Once you run the reset script, all your products, sales history, and categories will be deleted from the database. There is no "Undo."

---

### Step 1: STOP the System
Open your terminal and stop any running instance of the backend server.
- Click on the terminal window where the server is running.
- Press **`Ctrl + C`** on your keyboard to kill the process.

### Step 2: Run the Reset Script
In your terminal, navigate to the `backend` folder and run the following command:

```bash
node reset-data.js
```

### Step 3: Verify the Output
You should see a list of green checkmarks showing that the **Sales**, **Products**, **Categories**, **Suppliers**, **Staff**, and **Activities** tables have been cleared.

### Step 4: Restart the System
Now, restart your server to begin using your fresh system:

```bash
npm start
```

---

### What stays? What goes?
| **DATA CATEGORY** | **STATUS** | **EXPLANATION** |
| :--- | :--- | :--- |
| **Passwords / Users** | ✅ **KEPT SAFE** | All login usernames and passwords stay exactly as they are. |
| **Products** | ❌ Wiped | All inventory items are removed. |
| **Sales / Reports** | ❌ Wiped | All transaction history and charts are reset to zero. |
| **Categories** | ❌ Wiped | All category groupings are removed. |
| **Suppliers** | ❌ Wiped | All supplier contact details are removed. |
| **Staff Profiles** | ❌ Wiped | Employee profiles are removed (but their generic logins work). |
| **Activity Logs** | ❌ Wiped | All history on the notifications page is cleared. |

---
**Tip:** Only use this at the end of a testing phase or when you want to start a completely new business cycle!
