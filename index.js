document.addEventListener('DOMContentLoaded', () => {
  // Only load dashboard data if we are on the dashboard page
  if (document.getElementById('dash-todays-sales')) {
    loadDashboardData();
  }
});

async function loadDashboardData() {
  try {
    const [stats, recentActivity] = await Promise.all([
      DashboardAPI.getStats(),
      DashboardAPI.getRecentSales(10)
    ]);

    // Populate Top Cards
    if (stats) {
      // populate summary cards
      const todaysSalesEl = document.getElementById('dash-todays-sales');
      if (todaysSalesEl) {
        todaysSalesEl.innerHTML = `GH<i class="fa-solid fa-cedi-sign"></i>${parseFloat(stats.todaysSales || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`;
      }

      const yesterdaysSalesEl = document.getElementById('dash-yesterdays-sales');
      if (yesterdaysSalesEl) {
        yesterdaysSalesEl.innerHTML = `GH<i class="fa-solid fa-cedi-sign"></i>${parseFloat(stats.yesterdaysSales || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`;
      }

      document.getElementById('dash-total-products').textContent = stats.totalProducts || 0;
      document.getElementById('dash-total-categories').textContent = stats.totalCategories || 0;
      document.getElementById('dash-total-suppliers').textContent = stats.totalSuppliers || 0;

      // Update Chart labels with totals
      const todayLabelEl = document.getElementById('chart-today-label');
      if (todayLabelEl) {
        todayLabelEl.textContent = `Today (GH₵${parseFloat(stats.todaysSales || 0).toFixed(2)})`;
      }
      const yesterdayLabelEl = document.getElementById('chart-yesterday-label');
      if (yesterdayLabelEl) {
        yesterdayLabelEl.textContent = `Yesterday (GH₵${parseFloat(stats.yesterdaysSales || 0).toFixed(2)})`;
      }

      // Update Chart with Today vs Yesterday (Hourly)
      renderSalesChart(stats.hourlyToday || [], stats.hourlyYesterday || []);
    }

    // Populate Recent Activities
    const activityContainer = document.getElementById('dash-recent-activities');
    if (activityContainer && recentActivity) {
      activityContainer.innerHTML = '';
      
      if (recentActivity.length === 0) {
        activityContainer.innerHTML = '<p style="padding:15px;color:#777;">No recent transactions.</p>';
      }

      recentActivity.forEach(activity => {
        const dateObj = new Date(activity.created_at);
        const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getFullYear()} ${dateObj.getHours()}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
        
        let icon = 'fa-info-circle';
        let color = '#777';
        
        switch(activity.type) {
          case 'SALE':
            icon = 'fa-hand-holding-dollar';
            color = 'rgb(1, 34, 219)';
            break;
          case 'PRODUCT':
            icon = 'fa-box';
            color = '#f86503';
            break;
          case 'STAFF':
            icon = 'fa-user-tie';
            color = '#772ca5';
            break;
          case 'CATEGORY':
            icon = 'fa-list';
            color = '#03a9f4';
            break;
          case 'SUPPLIER':
            icon = 'fa-truck';
            color = '#4caf50';
            break;
        }

        const activityDiv = document.createElement('div');
        activityDiv.className = 'activity';
        activityDiv.innerHTML = `
          <div class="bg-color" style="background-color:${color};"><i class="fa-solid ${icon}"></i></div>
          <div class="message">
            <p>${activity.description}</p>
            <h6>${formattedDate}</h6>
          </div>
        `;
        activityContainer.appendChild(activityDiv);
      });
    }

  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

// Chart.js Configuration
function renderSalesChart(hourlyToday, hourlyYesterday) {
  const ctx = document.getElementById('salesChart');
  if (!ctx) return;

  // Prepare 24-hour data slots
  const labels = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
  const todayData = new Array(24).fill(0);
  const yesterdayData = new Array(24).fill(0);

  // Map backend results to slots
  hourlyToday.forEach(item => {
    const hr = parseInt(item.hour);
    if (hr >= 0 && hr < 24) todayData[hr] = item.total;
  });

  hourlyYesterday.forEach(item => {
    const hr = parseInt(item.hour);
    if (hr >= 0 && hr < 24) yesterdayData[hr] = item.total;
  });

  // Check if chart already exists and destroy it to avoid overlap
  const existingChart = Chart.getChart(ctx);
  if (existingChart) {
    existingChart.destroy();
  }

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Yesterday',
          data: yesterdayData,
          backgroundColor: '#f86503',
          borderWidth: 0,
          borderRadius: 4,
          barPercentage: 2,
          categoryPercentage: 1
        },
        {
          label: 'Today',
          data: todayData,
          backgroundColor: 'rgb(1, 34, 219)',
          borderWidth: 0,
          borderRadius: 4,
          barPercentage: 2,
          categoryPercentage: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 12,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          padding: 10,
          callbacks: {
            label: (context) => {
              return ` ${context.dataset.label}: GH₵${context.parsed.y.toFixed(2)}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: '#f0f0f0',
            drawBorder: false
          },
          ticks: {
            callback: (value) => 'GH₵' + value
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            // Only show every 2-3 hours to avoid crowding on small screens
            callback: function(val, index) {
              return index % 3 === 0 ? this.getLabelForValue(val) : '';
            }
          }
        }
      }
    }
  });
}