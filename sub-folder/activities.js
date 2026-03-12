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
            return;
        }

        activities.forEach(activity => {
            const dateObj = new Date(activity.created_at);
            const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getFullYear()} ${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
            
            const badgeClass = `badge-${activity.type.toLowerCase()}`;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${activity.id}</td>
                <td><span class="activity-type-badge ${badgeClass}">${activity.type}</span></td>
                <td>${activity.description}</td>
                <td>${formattedDate}</td>
                <td>
                    <i class="fa-solid fa-trash-can delete-btn" title="Delete Activity" onclick="deleteActivityLog('${activity.id}')"></i>
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
        if (result.status === 'success') {
            loadAllActivities(); // Refresh table
        } else {
            alert('Failed to delete: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error deleting activity:', error);
        alert('An error occurred while deleting the record.');
    }
}
