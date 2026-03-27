(function() {
    const userDataStr = localStorage.getItem('stockmaster_user');
    const path = window.location.pathname;
    const isLoginPage = path.endsWith('login.html');
    const isRootPath = path === '/' || path.endsWith('/website/') || path.endsWith('/website');

    // Robust check for userData
    let user = null;
    try {
        if (userDataStr && userDataStr !== 'null' && userDataStr !== 'undefined') {
            user = JSON.parse(userDataStr);
        }
    } catch (e) {
        console.error('Failed to parse user data:', e);
    }

    if (!user && !isLoginPage) {
        redirectToLogin();
        return;
    }

    if (user && (isLoginPage || isRootPath)) {
        // Already logged in, redirect to appropriate home page
        let homePath = user.role === 'staff' ? 'sub-folder/newSale.html' : 'index.html';
        if (path.includes('/sub-folder/')) {
            homePath = user.role === 'staff' ? 'newSale.html' : '../index.html';
        }
        window.location.replace(homePath);
        return;
    }

    if (user) {
        // RBAC: Restricted pages for staff
        if (user.role === 'staff') {
            const restrictedPages = ['index.html', 'categories.html', 'suppliers.html', 'staff.html', 'activities.html', 'product.html', 'users.html'];
            const isRestricted = restrictedPages.some(p => path.endsWith(p));
            
            if (isRestricted) {
                let redirectPath = path.includes('/sub-folder/') ? 'newSale.html' : 'sub-folder/newSale.html';
                window.location.replace(redirectPath);
            }
        }
    }
    
    // Heartbeat mechanism for active status
    if (user) {
        // Initial heartbeat
        sendHeartbeat(user.id);
        // Periodic heartbeat every 1 minute
        const heartbeatInterval = setInterval(() => {
            const currentUser = JSON.parse(localStorage.getItem('stockmaster_user'));
            if (currentUser) {
                sendHeartbeat(currentUser.id);
                updateOnlineUsersList();
            } else {
                clearInterval(heartbeatInterval);
            }
        }, 60000);
        
        // Initial load of online users
        updateOnlineUsersList();
    }

    async function sendHeartbeat(userId) {
        try {
            await fetch('http://localhost:5000/api/users/heartbeat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
        } catch (e) {
            console.warn('Heartbeat failed', e);
        }
    }

    async function updateOnlineUsersList() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        let widget = document.querySelector('.online-now-widget');
        if (!widget) {
            widget = document.createElement('div');
            widget.className = 'online-now-widget';
            widget.innerHTML = `
                <div class="online-now-title"><i class="fa-solid fa-users-viewfinder"></i> Online Now</div>
                <div class="online-users-list" id="online-users-list"></div>
            `;
            // Insert before the logout button
            const logoutBtn = sidebar.querySelector('button[onclick="logout()"]');
            const navList = sidebar.querySelector('.nav-list');
            if (logoutBtn && navList) {
                navList.insertBefore(widget, logoutBtn.parentElement || logoutBtn);
            } else {
                sidebar.appendChild(widget);
            }
        }

        try {
            const response = await fetch('http://localhost:5000/api/users/active');
            const onlineUsers = await response.json();
            const listContainer = document.getElementById('online-users-list');
            if (listContainer) {
                listContainer.innerHTML = onlineUsers.map(u => {
                    const avatar = u.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username)}&background=random&color=fff&size=50`;
                    return `
                        <div class="online-user-item">
                            <div style="position: relative;">
                                <img src="${avatar}" class="online-user-avatar" title="${u.username} (${u.role})">
                                <span class="status-dot online"></span>
                            </div>
                            <span>${u.username}</span>
                        </div>
                    `;
                }).join('');
            }
        } catch (e) {
            console.warn('Failed to fetch online users', e);
        }
    }

    // Safety check for browser back button from cache (BFCache)
    window.addEventListener('pageshow', function(event) {
        if (event.persisted || (window.performance && window.performance.navigation.type === 2)) {
            const currentUserData = localStorage.getItem('stockmaster_user');
            if (!currentUserData && !window.location.pathname.endsWith('login.html')) {
                window.location.replace(window.location.pathname.includes('/sub-folder/') ? '../login.html' : 'login.html');
            }
        }
    });
})();

// Clear UI elements based on role
document.addEventListener('DOMContentLoaded', async function() {
    const userData = localStorage.getItem('stockmaster_user');
    if (userData) {
        let user = JSON.parse(userData);
        
        // Update profile picture in sidebar
        updateProfileDisplay(user);

        // Update welcome message if it exists
        const welcomeEl = document.getElementById('welcomeName');
        if (welcomeEl) {
            const displayName = user.staff_name || user.username;
            welcomeEl.textContent = `Welcome back, ${displayName}`;
        }

        if (user.role === 'staff') {
            hideRestrictedUI();
        }
    }
});

function updateProfileDisplay(user) {
    const sidebarHeader = document.querySelector('.sidebar-header');
    if (!sidebarHeader) return;

    // Determine the profile image to show
    let profileImg = '';
    const defaultName = user.staff_name || user.username || (user.role === 'admin' ? 'SA' : 'User');
    
    if (user.role === 'admin') {
        profileImg = (user.profile_image && user.profile_image.trim() !== '') 
            ? user.profile_image 
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(defaultName)}&background=2f0464&color=fff&size=128`;
    } else {
        // For staff, prioritize staff_image (from staff table fetched at login)
        // then fallback to user's profile_image (custom upload in users table)
        if (user.staff_image && user.staff_image.trim() !== '') {
            profileImg = user.staff_image;
        } else if (user.profile_image && user.profile_image.trim() !== '') {
            profileImg = user.profile_image;
        } else {
            profileImg = `https://ui-avatars.com/api/?name=${encodeURIComponent(defaultName)}&background=0382f8&color=fff&size=128`;
        }
    }

    // Sidebar Profile (Desktop/Tablet)
    if (user.role === 'admin') {
        sidebarHeader.innerHTML = `
            <div class="profile-img-container" style="position: relative; cursor: pointer; display: flex; flex-direction: column; align-items: center;">
                 <div class="profile-pic-container">
                     <img id="userProfilePic" src="${profileImg}" 
                          style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid rgba(255,255,255,0.3); box-shadow: 0 4px 10px rgba(0,0,0,0.3);"
                          onerror="this.src='https://ui-avatars.com/api/?name=SA&background=2f0464&color=fff&size=128'">
                     <span class="status-dot online"></span>
                 </div>
                <input type="file" id="profileUpload" accept="image/*" style="display: none;">
                <span style="color: white; font-weight: 600; font-size: 1.1rem; margin-top: 5px;">System Admin</span>
            </div>
        `;

        const container = sidebarHeader.querySelector('.profile-img-container');
        const fileInput = sidebarHeader.querySelector('#profileUpload');
        if (container && fileInput) {
            container.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', handleProfileUpload(user));
        }

        // Mobile Profile injection
        injectMobileProfile(profileImg, false);
    } else {
        const displayName = user.staff_name || user.username || 'Staff/User';
        sidebarHeader.innerHTML = `
            <div class="profile-img-container" style="display: flex; flex-direction: column; align-items: center;">
                <div class="profile-pic-container">
                    <img src="${profileImg}" 
                         style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid rgba(255,255,255,0.3); box-shadow: 0 4px 10px rgba(0,0,0,0.3);"
                         onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0382f8&color=fff&size=128'">
                    <span class="status-dot online"></span>
                </div>
                <span style="color: white; font-weight: 600; font-size: 1.1rem; margin-top: 5px;">${displayName}</span>
            </div>
        `;
        injectMobileProfile(profileImg, true);
    }

    // Set up Global Toggle
    setupGlobalSidebarToggle();
}

function injectMobileProfile(imgSrc, isStaff) {
    let mobileContainer = document.querySelector('.mobile-profile-container');
    if (!mobileContainer) {
        mobileContainer = document.createElement('div');
        mobileContainer.className = 'mobile-profile-container';
        document.body.appendChild(mobileContainer);
    }

    if (isStaff) {
        mobileContainer.innerHTML = `
            <div id="mobile-bell-btn" class="mobile-bell"><i class="fa-solid fa-bell"></i><div class="badge" id="mobile-activity-badge"></div></div>
            <div class="profile-pic-container">
                <img src="${imgSrc}" class="mobile-profile-pic">
                <span class="status-dot online"></span>
            </div>`;
    } else {
        mobileContainer.innerHTML = `
            <div id="mobile-bell-btn" class="mobile-bell"><i class="fa-solid fa-bell"></i><div class="badge" id="mobile-activity-badge"></div></div>
            <div class="profile-pic-container">
                <img src="${imgSrc}" class="mobile-profile-pic">
                <span class="status-dot online"></span>
            </div>`;
    }
}

function setupGlobalSidebarToggle() {
    const menuBtn = document.getElementById('menuBtn');
    const sidebar = document.getElementById('sidebar');
    
    if (menuBtn && sidebar) {
        // Remove old listeners to avoid duplicates
        const newMenuBtn = menuBtn.cloneNode(true);
        menuBtn.parentNode.replaceChild(newMenuBtn, menuBtn);

        newMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('expanded');
            newMenuBtn.innerHTML = sidebar.classList.contains('expanded') ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-bars"></i>';
        });

        document.addEventListener('click', (e) => {
            if (sidebar.classList.contains('expanded') && !sidebar.contains(e.target) && e.target !== newMenuBtn) {
                sidebar.classList.remove('expanded');
                newMenuBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
            }
        });
    }
}

function handleProfileUpload(user) {
    return async (e) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const base64Image = event.target.result;
                try {
                    const response = await fetch('http://localhost:5000/api/users/profile-image', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: user.id, image: base64Image })
                    });
                    const data = await response.json();
                    if (data.success) {
                        user.profile_image = base64Image;
                        localStorage.setItem('stockmaster_user', JSON.stringify(user));
                        
                        // Update Desktop View
                        const desktopPic = document.getElementById('userProfilePic');
                        if (desktopPic) desktopPic.src = base64Image;
                        
                        // Update Mobile View
                        const mobilePic = document.querySelector('.mobile-profile-pic');
                        if (mobilePic) mobilePic.src = base64Image;
                        
                        alert('Profile picture updated successfully!');
                    }
                } catch (err) {
                    console.error('Upload failed:', err);
                }
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };
}

function hideRestrictedUI() {
    // Hide sidebar links that staff shouldn't see
    const restrictedSelectors = [
        'a[href*="index.html"]',
        'a[href*="product.html"]',
        'a[href*="categories.html"]',
        'a[href*="suppliers.html"]',
        'a[href*="staff.html"]',
        'a[href*="users.html"]',
        'a[href*="activities.html"]',
        '.header h5' // "Welcome back, system Admin!" on dashboard (though they shouldn't be there)
    ];
    
    restrictedSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            // Find the parent li and hide it
            const parentLi = el.closest('.nav-item');
            if (parentLi) {
                parentLi.style.display = 'none';
            } else {
                el.style.display = 'none';
            }
        });
    });
}

function redirectToLogin() {
    let loginPath = 'login.html';
    if (window.location.pathname.includes('/sub-folder/')) {
        loginPath = '../login.html';
    }
    window.location.replace(loginPath);
}

async function logout() {
    const userDataStr = localStorage.getItem('stockmaster_user');
    if (userDataStr) {
        try {
            const user = JSON.parse(userDataStr);
            const roleName = user.role === 'admin' ? 'Admin' : 'Staff';
            const displayName = user.staff_name || user.username || 'A user';
            
            // Notify backend about logout
            await fetch('http://localhost:5000/api/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            }).catch(() => {});

            await fetch('http://localhost:5000/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'STAFF',
                    description: `${roleName} ${displayName} logged out of the system.`
                })
            }).catch(() => {});
        } catch(e) {}
    }
    localStorage.removeItem('stockmaster_user');
    
    // Replace the current history entry with the login page
    redirectToLogin();
}
