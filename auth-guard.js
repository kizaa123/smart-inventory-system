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
        let homePath = user.role === 'staff' ? 'sub-folder/product.html' : 'index.html';
        if (path.includes('/sub-folder/')) {
            homePath = user.role === 'staff' ? 'product.html' : '../index.html';
        }
        window.location.href = homePath;
        return;
    }

    if (user) {
        // RBAC: Restricted pages for staff
        if (user.role === 'staff') {
            const restrictedPages = ['index.html', 'categories.html', 'suppliers.html', 'staff.html', 'activities.html'];
            const isRestricted = restrictedPages.some(p => path.endsWith(p));
            
            if (isRestricted) {
                let redirectPath = path.includes('/sub-folder/') ? 'product.html' : 'sub-folder/product.html';
                window.location.href = redirectPath;
            }
        }
    }
})();

// Clear UI elements based on role
document.addEventListener('DOMContentLoaded', async function() {
    const userData = localStorage.getItem('stockmaster_user');
    if (userData) {
        let user = JSON.parse(userData);
        
        // Update profile picture in sidebar
        updateProfileDisplay(user);

        if (user.role === 'staff') {
            hideRestrictedUI();
        }
    }
});

function updateProfileDisplay(user) {
    const sidebarHeader = document.querySelector('.sidebar-header');
    if (!sidebarHeader) return;

    // Use a robust fallback for the image src
    const profileImg = user.profile_image && user.profile_image !== '' 
        ? user.profile_image 
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random&color=fff&size=128`;

    // Sidebar Profile (Desktop/Tablet)
    if (user.role === 'admin') {
        sidebarHeader.innerHTML = `
            <div class="profile-img-container" style="position: relative; cursor: pointer; display: flex; flex-direction: column; align-items: center;">
                <img id="userProfilePic" src="${profileImg}" 
                     style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid rgba(255,255,255,0.3); box-shadow: 0 4px 10px rgba(0,0,0,0.3);"
                     onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random&color=fff&size=128'">
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
        sidebarHeader.innerHTML = `
            <div class="profile-img-container" style="display: flex; flex-direction: column; align-items: center;">
                <div style="width: 120px; height: 120px; border-radius: 50%; background: #0382f8ff; color: white; display: flex; justify-content: center; align-items: center; font-size: 2rem; font-weight: 500; border: 3px solid rgba(255,255,255,0.3); box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
                    U/S
                </div>
                <span style="color: white; font-weight: 600; font-size: 1.1rem; margin-top: 5px;">Staff/User</span>
            </div>
        `;
        injectMobileProfile(null, true);
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
        mobileContainer.innerHTML = `<div class="mobile-us-badge">U/S</div>`;
    } else {
        mobileContainer.innerHTML = `<img src="${imgSrc}" class="mobile-profile-pic">`;
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
                        document.getElementById('userProfilePic').src = base64Image;
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
        'a[href*="categories.html"]',
        'a[href*="suppliers.html"]',
        'a[href*="staff.html"]',
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
    window.location.href = loginPath;
}

function logout() {
    localStorage.removeItem('stockmaster_user');
    redirectToLogin();
}
