document.addEventListener('DOMContentLoaded', () => {
    loadAllActivities();
});

async function loadAllActivities() {
    const tableBody = document.getElementById('activities-table-body');
    if (!tableBody) return;

    try {
        // Fetch all activities (no limit)
        const activities = await DashboardAPI.getRecentSales(null);
        
        tableBody.innerHTML = '';

        if (!activities || activities.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color: #777;">No activities found.</td></tr>';
            
            // Reset notification baseline when empty
            localStorage.setItem('lastViewedTimestamp', Date.now());
            const badge = document.getElementById('activity-badge');
            if (badge) badge.style.display = 'none';
            return;
        }

        activities.forEach(activity => {
            const dateObj = new Date(activity.created_at);
            const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getFullYear()} ${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
            
            const badgeClass = `badge-${activity.type.toLowerCase()}`;
            
            let description = activity.description;
            // Highlight Order IDs in green
            description = description.replace(/(ORD-[A-Z0-9]+)/g, '<span style="color: #2e7d32; font-weight: 700;">$1</span>');
            // Highlight Amounts in blue
            description = description.replace(/(GH₵\d+\.\d{2})/g, '<span style="color: #1565c0; font-weight: 700;">$1</span>');

            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="color: #2e7d32; font-weight: 700;">#${activity.id}</td>
                <td><span class="activity-type-badge ${badgeClass}">${activity.type}</span></td>
                <td>${description}</td>
                <td>${formattedDate}</td>
                <td>
                    <div class="action-container">
                        <!-- Desktop Delete -->
                        <div class="action action-buttons-desktop">
                             <i class="fa-solid fa-trash-can delete-btn" title="Delete Activity" onclick="deleteActivityLog('${activity.id}')"></i>
                        </div>

                        <!-- Mobile Action Trigger -->
                        <div class="mobile-action-trigger" onclick="toggleMobileMenu(event, '${activity.id}')">
                            <i class="fa-solid fa-ellipsis-vertical"></i>
                        </div>

                        <!-- Mobile Action Menu -->
                        <div id="mobileMenu-${activity.id}" class="mobile-action-menu">
                            <button class="mobile-action-item delete" onclick="deleteActivityLog('${activity.id}')">
                                <i class="fa-solid fa-trash-can"></i> Delete
                            </button>
                        </div>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });

    } catch (error) {
        console.error('Error loading activities:', error);
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color: red;">Failed to load activities.</td></tr>';
    }
}

async function deleteActivityLog(id) {
    if (!confirm('Are you sure you want to delete this activity record? This cannot be undone.')) {
        return;
    }

    try {
        const result = await DashboardAPI.deleteActivity(id);
        if (result.status === 'success' || result.message) {
            loadAllActivities(); // Refresh table
        } else {
            alert('Failed to delete: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error deleting activity:', error);
        alert('An error occurred while deleting the record.');
    }
}

async function confirmDeleteAll() {
    if (!confirm('Are you absolutely sure you want to delete ALL activity history? This action cannot be undone!')) {
        return;
    }

    try {
        const result = await DashboardAPI.deleteAllActivities();
        if (result.message) {
            loadAllActivities(); // Refresh table to show empty state
        } else {
            alert('Failed to delete all activities: ' + (result.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error deleting all activities:', error);
        alert('An error occurred while trying to clear the activity log.');
    }
}

function clearAllActivities() {
    confirmDeleteAll();
}

function toggleMobileMenu(event, id) {
    event.stopPropagation();
    // Close all other menus
    document.querySelectorAll('.mobile-action-menu').forEach(m => {
        if (m.id !== `mobileMenu-${id}`) m.classList.remove('active');
    });
    
    const menu = document.getElementById(`mobileMenu-${id}`);
    if (menu) {
        menu.classList.toggle('active');
    }
}
