document.addEventListener('DOMContentLoaded', () => {
  // Only load dashboard data if we are on the dashboard page
  if (document.getElementById('dash-todays-sales')) {
    loadDashboardData();
    // Check for low stock products every 5 minutes
    setInterval(checkLowStockForNotifications, 5 * 60 * 1000);
  }
});

// Track already notified low stock products to avoid spam
let notifiedLowStockIds = new Set();

// Load notification history from storage
function loadNotificationHistory() {
  const stored = localStorage.getItem('dashboardNotifiedLowStockIds');
  if (stored) {
    notifiedLowStockIds = new Set(JSON.parse(stored));
  }
}

// Save notification history
function saveNotificationHistory() {
  localStorage.setItem('dashboardNotifiedLowStockIds', JSON.stringify(Array.from(notifiedLowStockIds)));
}

// Check all products for low stock and log notifications
async function checkLowStockForNotifications() {
  try {
    // Only run if ProductAPI is available
    if (typeof ProductAPI === 'undefined') {
      return;
    }
    
    const products = await ProductAPI.getAll();
    products.forEach(product => {
      const threshold = product.low_stock_threshold || 10;
      if (product.stock_quantity < threshold && !notifiedLowStockIds.has(String(product.id))) {
        // Log notification to backend (fire and forget)
        fetch('http://localhost:5000/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'LOW_STOCK',
            description: `⚠️ Low Stock Alert: ${product.name} (SKU: ${product.sku}) has only ${product.stock_quantity} units remaining`
          })
        }).catch(() => {});
        
        notifiedLowStockIds.add(String(product.id));
      }
      // Remove from notified set if stock is replenished
      if (product.stock_quantity >= threshold && notifiedLowStockIds.has(String(product.id))) {
        notifiedLowStockIds.delete(String(product.id));
      }
    });
    saveNotificationHistory();
  } catch (error) {
    console.log('Could not check low stock:', error);
  }
}

async function renderLowStockWidget() {
  const container = document.getElementById('dash-low-stock-list');
  if (!container) return;
  try {
    const products = await ProductAPI.getAll();
    const lowStockItems = products.filter(p => p.stock_quantity < (p.low_stock_threshold || 10));
    if (lowStockItems.length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted); font-size: 14px;"><i class="fa-solid fa-check-circle" style="color: rgb(3, 133, 9);"></i> All stock levels are healthy.</p>';
      return;
    }
    lowStockItems.sort((a, b) => a.stock_quantity - b.stock_quantity);
    container.innerHTML = '';
    lowStockItems.slice(0, 10).forEach(product => {
      const item = document.createElement('div');
      item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--table-hover); border-radius: 8px; border: 1px solid var(--border-color); transition: transform 0.2s;';
      item.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 3px;">
          <span style="font-weight: 600; font-size: 14.5px; color: var(--text-main);">${product.name}</span>
          <span style="font-size: 12px; color: var(--text-muted);">${product.sku}</span>
        </div>
        <div style="background-color: rgba(238, 8, 0, 0.1); color: #ee0800; padding: 6px 10px; border-radius: 6px; font-weight: 700; font-size: 13px; box-shadow: 0 2px 4px rgba(238,8,0,0.1);">
          ${product.stock_quantity} left
        </div>
      `;
      container.appendChild(item);
    });
  } catch (error) {
    container.innerHTML = '<p style="color: #ee0800; font-size: 14px;">Error loading data.</p>';
  }
}

// Initialize on dashboard load
loadNotificationHistory();

async function loadDashboardData() {
  try {
    // Call the new widget render
    renderLowStockWidget();

    const stats = await DashboardAPI.getStats();

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
      
      const totalProfitEl = document.getElementById('dash-total-profit');
      if (totalProfitEl) {
        totalProfitEl.innerHTML = `GH<i class="fa-solid fa-cedi-sign"></i>${parseFloat(stats.totalProfit || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`;
      }

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

  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

// Chart.js Configuration
// Helper to get theme colors
function getThemeColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
        text: isDark ? '#e0e0e0' : '#333',
        grid: isDark ? 'rgba(255, 255, 255, 0.1)' : '#f0f0f0',
        today: 'rgb(1, 34, 219)',
        yesterday: '#f86503'
    };
}

// Chart.js Configuration
function renderSalesChart(hourlyToday, hourlyYesterday) {
  const ctx = document.getElementById('salesChart');
  if (!ctx) return;

  const theme = getThemeColors();

  // Prepare 24-hour data slots
  const labels = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
  const todayData = new Array(24).fill(0);
  const yesterdayData = new Array(24).fill(0);

  // Map backend results to slots
  hourlyToday.forEach(item => {
    const hr = parseInt(item.hour);
    if (hr >= 0 && hr < 24) todayData[hr] = Math.max(0, parseFloat(item.total));
  });

  hourlyYesterday.forEach(item => {
    const hr = parseInt(item.hour);
    if (hr >= 0 && hr < 24) yesterdayData[hr] = Math.max(0, parseFloat(item.total));
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
          backgroundColor: theme.yesterday,
          borderWidth: 0,
          borderRadius: 4,
          barPercentage: 1.0,
          categoryPercentage: window.innerWidth < 768 ? 1.0 : 0.9
        },
        {
          label: 'Today',
          data: todayData,
          backgroundColor: theme.today,
          borderWidth: 0,
          borderRadius: 4,
          barPercentage: 1.0,
          categoryPercentage: window.innerWidth < 768 ? 1.0 : 0.9
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
            pointStyle: 'circle',
            color: theme.text
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
            color: theme.grid,
            drawBorder: false
          },
          ticks: {
            color: theme.text,
            callback: (value) => 'GH₵' + value
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: theme.text,
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

// Listen for theme changes to re-render chart
window.addEventListener('themeChanged', () => {
    if (document.getElementById('salesChart')) {
        // We need the data to re-render. 
        // For simplicity, we can reload dashboard data or just update existing chart if held in a variable.
        // Re-fetching is safer and ensures data is fresh.
        loadDashboardData();
    }
});

// ================= GLOBAL NOTIFICATION LOGIC =================
let lastViewedTimestamp = localStorage.getItem('lastViewedTimestamp') ? parseInt(localStorage.getItem('lastViewedTimestamp')) : Date.now() - (60 * 60 * 1000);

document.addEventListener('DOMContentLoaded', () => {
  const bellBtn = document.getElementById('bell-btn');
  const mobileBellBtn = document.getElementById('mobile-bell-btn');
  const modal = document.getElementById('activities-modal');
  
  // Make sure the elements exist on the page before adding listeners
  if (!modal) return;

  const openModal = async () => {
    const modalContent = document.getElementById('modal-content');
    if (modal.style.display === 'block') {
      closeModal();
      return;
    }

    modal.style.display = 'block';
    if (modalContent) {
      modalContent.classList.remove('closing');
      modalContent.classList.add('active');
    }

    const activityContainer = document.getElementById('modal-recent-activities');
    if (activityContainer.innerHTML.trim() === '<!-- Activities loaded dynamically -->' || activityContainer.innerHTML.trim() === '') {
      try {
        const recentActivity = await DashboardAPI.getRecentSales(10);
        activityContainer.innerHTML = '';
        if (recentActivity.length === 0) {
          activityContainer.innerHTML = '<p style="padding:15px;color:#777;">No recent transactions.</p>';
        } else {
          recentActivity.forEach(activity => {
            const dateObj = new Date(activity.created_at);
            const seconds = Math.floor((new Date() - dateObj) / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            
            let formattedDate = 'Just now';
            if (seconds >= 60) {
                if (minutes < 60) formattedDate = `${minutes}m ago`;
                else if (hours < 24) formattedDate = `${hours}h ago`;
                else if (days < 7) formattedDate = `${days}d ago`;
                else {
                    const isThisYear = new Date().getFullYear() === dateObj.getFullYear();
                    const month = dateObj.toLocaleString('default', { month: 'short' });
                    formattedDate = isThisYear ? `${month} ${dateObj.getDate()}` : `${month} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;
                }
            }
            
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
                color = '#038509';
                break;
              case 'LOW_STOCK':
                icon = 'fa-triangle-exclamation';
                color = '#d60303';
                break;
              case 'STOCK_LOADED':
                icon = 'fa-box-open';
                color = '#038509';
                break;
            }
            
            let description = activity.description;
            description = description.replace(/(ORD-[A-Z0-9]+)/g, '<span style="color: #2e7d32; font-weight: 700;">$1</span>');
            description = description.replace(/(GH₵\d+\.\d{2})/g, '<span style="color: #1565c0; font-weight: 700;">$1</span>');

            const activityDiv = document.createElement('div');
            activityDiv.className = 'activity';
            activityDiv.innerHTML = `
              <div class="bg-color" style="background-color: ${color}; border-radius:50%;width:40px; height:40px;color: white;display:flex;align-items: center;justify-content:center;margin-bottom:5px;">
                <i class="fa-solid ${icon}"></i>
              </div>
              <div class="activity-details">
                <p>${description}</p>
                <p style="font-size:11.5px;margin-top:10px;color:#8d8d8d;font-weight:700;">${formattedDate}</p>
              </div>
            `;
            activityContainer.appendChild(activityDiv);
          });
          lastViewedTimestamp = Date.now();
          localStorage.setItem('lastViewedTimestamp', lastViewedTimestamp);
          
          const badge = document.getElementById('activity-badge');
          const mobileBadge = document.getElementById('mobile-activity-badge');
          if (badge) badge.style.display = 'none';
          if (mobileBadge) mobileBadge.style.display = 'none';
        }
      } catch (error) {
        activityContainer.innerHTML = '<p style="padding:15px;color:#777;">Error loading activities.</p>';
        console.error('Error loading recent activities:', error);
      }
    } else {
      const badge = document.getElementById('activity-badge');
      const mobileBadge = document.getElementById('mobile-activity-badge');
      if (badge) badge.style.display = 'none';
      if (mobileBadge) mobileBadge.style.display = 'none';
    }
  };

  const closeModal = () => {
    const modalContent = document.getElementById('modal-content');
    if (!modalContent) {
      modal.style.display = 'none';
      return;
    }

    modalContent.classList.add('closing');
    // Wait for the slideOut animation to finish (0.5s)
    modalContent.addEventListener('animationend', () => {
      if (modalContent.classList.contains('closing')) {
        modal.style.display = 'none';
        modalContent.classList.remove('active', 'closing');
      }
    }, { once: true });
  };

  if (bellBtn) bellBtn.addEventListener('click', openModal);
  if (mobileBellBtn) mobileBellBtn.addEventListener('click', openModal);

  const closeBtn = modal.querySelector('.close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  window.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  // Listen for changes to localStorage from other pages
  window.addEventListener('storage', (event) => {
    if (event.key === 'lastViewedTimestamp') {
      lastViewedTimestamp = parseInt(event.newValue);
    }
  });

  // Poll for new activities every 5 seconds
    setInterval(async () => {
      try {
        const recent = await DashboardAPI.getRecentSales(100);
        const currentBaseline = localStorage.getItem('lastViewedTimestamp') ? parseInt(localStorage.getItem('lastViewedTimestamp')) : lastViewedTimestamp;
        const newCount = recent.filter(activity => new Date(activity.created_at) > new Date(currentBaseline)).length;
      const badge = document.getElementById('activity-badge');
      const mobileBadge = document.getElementById('mobile-activity-badge');
      
      if (newCount > 0) {
        if (badge) {
          badge.textContent = newCount;
          badge.style.display = 'inline-block';
        }
        if (mobileBadge) {
          mobileBadge.textContent = newCount;
          mobileBadge.style.display = 'flex';
        }
      } else {
        if (badge) badge.style.display = 'none';
        if (mobileBadge) mobileBadge.style.display = 'none';
      }
    } catch (error) {
      console.error('Error checking for new activities:', error);
    }
  }, 5000); // Changed from 500ms to 5000ms to avoid spamming the backend
});