let revenueChartInstance = null;
let categoryChartInstance = null;
let currentReportData = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Populate categories filter
    try {
        const categories = await CategoryAPI.getAll();
        const catFilter = document.getElementById('categoryFilter');
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.name;
            option.textContent = cat.name;
            catFilter.appendChild(option);
        });
    } catch(e) { console.error('Error loading categories for filter:', e); }

    // Event listeners
    document.getElementById('dateRangeFilter').addEventListener('change', loadReportData);
    document.getElementById('categoryFilter').addEventListener('change', loadReportData);

    // Initial load
    loadReportData();
});

function getDateRange(rangeType) {
    const today = new Date();
    today.setHours(0,0,0,0);
    let start = new Date(today);
    let end = new Date(today);
    end.setHours(23,59,59,999);

    switch(rangeType) {
        case 'today':
            break;
        case 'yesterday':
            start.setDate(start.getDate() - 1);
            end.setDate(end.getDate() - 1);
            break;
        case 'this_week':
            const day = start.getDay();
            const diff = start.getDate() - day + (day === 0 ? -6:1); // Adjust for Monday start
            start.setDate(diff);
            break;
        case 'this_month':
            start.setDate(1);
            break;
        case 'last_month':
            start.setMonth(start.getMonth() - 1);
            start.setDate(1);
            end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23,59,59,999);
            break;
        case 'all_time':
            return { start: null, end: null };
    }

    return { 
        start: start.toISOString().split('T')[0], 
        end: end.toISOString().split('T')[0] 
    };
}

async function loadReportData() {
    const dateRange = document.getElementById('dateRangeFilter').value;
    const category = document.getElementById('categoryFilter').value;
    
    document.getElementById('report-table-body').innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">Loading data...</td></tr>';

    const { start, end } = getDateRange(dateRange);

    try {
        const data = await ReportAPI.getSales(start, end, category);
        currentReportData = data;
        
        updateMetricCards(data);
        updateTable(data);
        updateCharts(data);
    } catch(err) {
        console.error('Failed to load report data:', err);
        document.getElementById('report-table-body').innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: red;">Error loading report data.</td></tr>';
    }
}

function updateMetricCards(data) {
    let totalRevenue = 0;
    let totalOrdersSet = new Set();
    let productCounts = {};

    data.forEach(sale => {
        totalRevenue += sale.total_amount;
        totalOrdersSet.add(sale.order_id);
        
        if (!productCounts[sale.product_name]) {
            productCounts[sale.product_name] = parseInt(sale.quantity);
        } else {
            productCounts[sale.product_name] += parseInt(sale.quantity);
        }
    });

    const totalOrders = totalOrdersSet.size;
    const aov = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;
    
    let topItem = "N/A";
    let maxQty = 0;
    for (const [product, qty] of Object.entries(productCounts)) {
        if (qty > maxQty) {
            maxQty = qty;
            topItem = `${product} (${qty})`;
        }
    }

    document.getElementById('metric-revenue').innerHTML = `GH<i class="fa-solid fa-cedi-sign"></i>${totalRevenue.toFixed(2)}`;
    document.getElementById('metric-orders').textContent = totalOrders;
    document.getElementById('metric-aov').innerHTML = `GH<i class="fa-solid fa-cedi-sign"></i>${aov.toFixed(2)}`;
    document.getElementById('metric-top-item').textContent = topItem;
}

function updateTable(data) {
    const tbody = document.getElementById('report-table-body');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">No sales found for the selected filters.</td></tr>';
        return;
    }

    data.forEach(sale => {
        const dateObj = new Date(sale.sale_date);
        const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getFullYear()} ${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
        
        const staffName = sale.staff_name || 'Unknown';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td style="color: #2e7d32; font-weight: 700;">#${sale.order_id}</td>
            <td>${sale.product_name || 'Unknown'}</td>
            <td>${sale.category_name || 'Uncategorized'}</td>
            <td>${sale.quantity}</td>
            <td style="font-weight: 700; color: #1565c0;">GH₵${sale.total_amount.toFixed(2)}</td>
            <td>${staffName}</td>
        `;
        tbody.appendChild(row);
    });
}

function updateCharts(data) {
    // Group data for charts
    const salesByDate = {};
    const salesByCategory = {};

    data.forEach(sale => {
        const dateDesc = new Date(sale.sale_date).toLocaleDateString();
        
        // Group by Date for Line Chart
        if (!salesByDate[dateDesc]) {
            salesByDate[dateDesc] = 0;
        }
        salesByDate[dateDesc] += sale.total_amount;

        // Group by Category for Doughnut Chart
        const catName = sale.category_name || 'Uncategorized';
        if (!salesByCategory[catName]) {
            salesByCategory[catName] = 0;
        }
        salesByCategory[catName] += sale.total_amount;
    });

    // Destroy old charts to prevent overlapping
    if (revenueChartInstance) revenueChartInstance.destroy();
    if (categoryChartInstance) categoryChartInstance.destroy();

    // Sort dates chronologically for the Revenue Chart
    // Object.keys(salesByDate) gives dates as strings (e.g. "3/15/2026")
    const sortedDateLabels = Object.keys(salesByDate).sort((a, b) => new Date(a) - new Date(b));
    const sortedRevenueData = sortedDateLabels.map(label => salesByDate[label]);

    // Helper to get theme colors
    function getThemeColors() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        return {
            text: isDark ? '#e0e0e0' : '#333',
            grid: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
            primary: isDark ? '#9d50ff' : '#2f0464'
        };
    }

    const theme = getThemeColors();

    // Revenue Chart (Switched to Wave/Area Chart)
    const revCtx = document.getElementById('revenueChart').getContext('2d');
    
    // Create gradient
    const gradient = revCtx.createLinearGradient(0, 0, 0, 350);
    if (document.documentElement.getAttribute('data-theme') === 'dark') {
        gradient.addColorStop(0, 'rgba(157, 80, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(157, 80, 255, 0)');
    } else {
        gradient.addColorStop(0, 'rgba(47, 4, 100, 0.4)');
        gradient.addColorStop(1, 'rgba(47, 4, 100, 0)');
    }

    revenueChartInstance = new Chart(revCtx, {
        type: 'line',
        data: {
            labels: sortedDateLabels,
            datasets: [{
                label: 'Revenue (GH₵)',
                data: sortedRevenueData,
                backgroundColor: gradient,
                borderColor: theme.primary,
                borderWidth: 3,
                fill: true,
                tension: 0.4, // This creates the "wave" effect
                pointBackgroundColor: '#fff',
                pointBorderColor: theme.primary,
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { 
                y: { 
                    beginAtZero: true,
                    grid: {
                        color: theme.grid
                    },
                    ticks: {
                        color: theme.text,
                        callback: function(value) {
                            return 'GH₵' + value.toLocaleString();
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: theme.text
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: theme.text
                    }
                }
            }
        }
    });

    // Doughnut Chart
    const catCtx = document.getElementById('categoryChart').getContext('2d');
    const chartColors = ['#9d50ff', '#03a9f4', '#f86503', '#038509', '#e91e63'];
    categoryChartInstance = new Chart(catCtx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(salesByCategory),
            datasets: [{
                data: Object.values(salesByCategory),
                backgroundColor: chartColors.slice(0, Object.keys(salesByCategory).length),
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: theme.text
                    }
                }
            }
        }
    });
}

// Listen for theme changes to re-render charts
window.addEventListener('themeChanged', () => {
    if (revenueChartInstance || categoryChartInstance) {
        // We have data in currentReportData
        updateCharts(currentReportData);
    }
});

function switchTab(tab) {
    // Remove active class from all buttons and contents
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    // Apply active class to the selected ones
    event.currentTarget.classList.add('active');
    document.getElementById(tab + '-tab').classList.add('active');
}

function printReport() {
    window.print();
}

function exportToCSV() {
    if (currentReportData.length === 0) {
        alert("No data available to export.");
        return;
    }

    const headers = ['Date', 'Order ID', 'Product Name', 'Category', 'Quantity', 'Total Amount', 'Served By'];
    
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF" // Add BOM for Excel UTF-8 support
        + headers.join(",") + "\n"
        + currentReportData.map(sale => {
            const date = new Date(sale.sale_date);
            const YYYY = date.getFullYear();
            const MM = String(date.getMonth() + 1).padStart(2, '0');
            const DD = String(date.getDate()).padStart(2, '0');
            const HH = String(date.getHours()).padStart(2, '0');
            const mm = String(date.getMinutes()).padStart(2, '0');
            const dateStr = `"${YYYY}-${MM}-${DD} ${HH}:${mm}"`;
            
            const pName = `"${(sale.product_name || '').replace(/"/g, '""')}"`;
            const cName = `"${(sale.category_name || '').replace(/"/g, '""')}"`;
            const sName = `"${sale.staff_name || ''}"`.trim();
            
            return `${dateStr},${sale.order_id},${pName},${cName},${sale.quantity},${sale.total_amount.toFixed(2)},${sName}`;
        }).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    
    // Generate filename with current date: stockmaster_report_YYYY-MM-DD.csv
    const now = new Date();
    const dateStamp = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    link.setAttribute("download", `stockmaster_report_${dateStamp}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
