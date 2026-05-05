// Global State
let tournamentData = {
    fixtures: [],
    standings: [],
    demands: [],
    announcements: [],
    teams: [],
    foodMenu: [],
    rooms: []
};

let liveMatchInterval;
let currentAdminPin = null;

// Mock Data for "MOCK_MODE"
const MOCK_DATA = {
    teams: [
        { id: 1, name: "Team Alpha", unit: "Sector-16" },
        { id: 2, name: "Team Bravo", unit: "Finance" },
        { id: 3, name: "Team Charlie", unit: "HR" },
        { id: 4, name: "Team Delta", unit: "Engg" }
    ],
    fixtures: [
        { id: 1, date: "2026-05-11", time: "10:00 AM", team1: "Team Alpha", team2: "Team Bravo", venue: "Court 1", status: "Live", team1Score: 14, team2Score: 10, winner: "", day: 1 },
        { id: 2, date: "2026-05-11", time: "02:00 PM", team1: "Team Charlie", team2: "Team Delta", venue: "Court 2", status: "Scheduled", team1Score: 0, team2Score: 0, winner: "", day: 1 },
        { id: 3, date: "2026-05-12", time: "10:00 AM", team1: "TBD", team2: "TBD", venue: "Court 1", status: "Scheduled", team1Score: 0, team2Score: 0, winner: "", day: 2 }
    ],
    announcements: [
        { id: 1, title: "Welcome!", message: "Welcome to Inter Unit Basketball Tournament 2026! Best of luck to all teams.", priority: "Normal" },
        { id: 2, title: "Schedule Update", message: "Match 2 postponed by 30 mins.", priority: "Urgent" }
    ],
    demands: [
        { id: 1, team: "Team Alpha", category: "Room", description: "Need extra blankets in Room 4", status: "Pending" }
    ],
    foodMenu: [
        { meal: "Breakfast", timing: "7:30 - 9:00 AM", items: "Poha, Tea" },
        { meal: "Lunch", timing: "1:00 - 2:30 PM", items: "Dal Rice Sabzi Roti" },
        { meal: "Dinner", timing: "8:00 - 9:30 PM", items: "Paneer, Roti, Rice, Salad" }
    ],
    standings: [
        { name: "Team Alpha", p: 1, w: 1, l: 0, pts: 2 },
        { name: "Team Charlie", p: 0, w: 0, l: 0, pts: 0 },
        { name: "Team Delta", p: 0, w: 0, l: 0, pts: 0 },
        { name: "Team Bravo", p: 1, w: 0, l: 1, pts: 0 }
    ],
    rooms: {
        "Team Alpha": { room: "R-101", location: "Guest House A", amenities: "AC, WiFi" },
        "Team Bravo": { room: "R-102", location: "Guest House A", amenities: "AC, WiFi" }
    }
};

// DOM Elements
const screens = document.querySelectorAll('.screen');
const navTiles = document.querySelectorAll('.nav-tiles .tile');
const backBtns = document.querySelectorAll('.back-btn');
const loader = document.getElementById('loader');
const urgentNoticeBanner = document.getElementById('urgent-notice-banner');

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
    initRouting();
    initServiceWorker();
    fetchData(); // Fetch initial data
    startCountdown();
    // Handle URL-based routing on load
    handleURLRouting();
});

// Routing & Screen Management
function initRouting() {
    navTiles.forEach(tile => {
        tile.addEventListener('click', () => navigateTo(tile.dataset.target));
    });

    backBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target || 'home';
            navigateTo(target);
        });
    });

    // Handle browser back/forward button
    window.addEventListener('popstate', (e) => {
        const screen = e.state?.screen || 'home';
        showScreen(screen);
    });

    // Tabs for Schedule
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderSchedule(e.target.dataset.day);
        });
    });

    // Admin FAB & Modal
    document.getElementById('admin-fab').addEventListener('click', () => {
        document.getElementById('pin-modal').classList.remove('hidden');
    });
    document.getElementById('pin-cancel').addEventListener('click', () => {
        document.getElementById('pin-modal').classList.add('hidden');
        document.getElementById('admin-pin-input').value = '';
    });
    document.getElementById('pin-submit').addEventListener('click', handleAdminLogin);

    // Urgent Notice Close
    document.getElementById('close-notice-btn').addEventListener('click', () => {
        urgentNoticeBanner.classList.add('hidden');
    });

    // Demand form submit
    document.getElementById('demand-form').addEventListener('submit', handleDemandSubmit);
    
    // Room info fetch
    document.getElementById('get-room-btn').addEventListener('click', renderRoomInfo);
}

function navigateTo(targetScreenId) {
    // Update browser URL
    const url = targetScreenId === 'home' ? '/' : `/${targetScreenId}`;
    window.history.pushState({ screen: targetScreenId }, '', url);
    
    // Show the screen
    showScreen(targetScreenId);
}

function showScreen(targetScreenId) {
    targetScreenId = targetScreenId || 'home';
    screens.forEach(s => s.classList.add('hidden', 'fade-in'));
    const targetElement = document.getElementById(`screen-${targetScreenId}`);
    if (targetElement) {
        targetElement.classList.remove('hidden');
    }

    // Handle screen-specific logic
    if (targetScreenId === 'live') {
        renderLiveMatch();
        liveMatchInterval = setInterval(renderLiveMatch, 30000); // refresh every 30s
    } else {
        clearInterval(liveMatchInterval);
    }
    
    if (targetScreenId === 'schedule') { renderSchedule(1); }
    if (targetScreenId === 'standings') { renderStandings(); }
    if (targetScreenId === 'food') { renderFoodMenu(); }
    if (targetScreenId === 'notices') { renderNotices(); }
    if (targetScreenId === 'request' || targetScreenId === 'room') { populateTeamDropdowns(); }
}

function handleURLRouting() {
    // Extract path and route accordingly
    const path = window.location.pathname;
    const segments = path.split('/').filter(s => s);
    const screen = segments[0] || 'home';
    showScreen(screen);
}

// Data Fetching
async function fetchData() {
    showLoader();
    try {
        if (CONFIG.APPS_SCRIPT_URL === "MOCK_MODE") {
            // Simulate network delay
            await new Promise(r => setTimeout(r, 500));
            tournamentData = JSON.parse(JSON.stringify(MOCK_DATA));
        } else {
            // Real fetch logic
            const res = await fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getAll`);
            const data = await res.json();
            if(!data.error) {
                tournamentData = Object.assign(tournamentData, data);
            }
        }
        checkUrgentNotice();
    } catch (e) {
        console.error("Failed to fetch data:", e);
    } finally {
        hideLoader();
    }
}

// Render Functions
function renderSchedule(day) {
    const container = document.getElementById('fixtures-container');
    container.innerHTML = '';
    
    const dayFixtures = tournamentData.fixtures.filter(f => f.day == day);
    
    if (dayFixtures.length === 0) {
        container.innerHTML = '<p class="text-small">No matches scheduled for this day.</p>';
        return;
    }

    dayFixtures.forEach(f => {
        let badgeClass = f.status.toLowerCase();
        let badgeText = f.status;
        let scoreHTML = '';
        
        if (f.status === 'Completed') {
            scoreHTML = `<div class="match-score">${f.team1Score} - ${f.team2Score}</div>`;
        } else if (f.status === 'Live') {
            scoreHTML = `<div class="match-score"><span class="pulse-dot">🔴</span> ${f.team1Score} - ${f.team2Score}</div>`;
        }

        container.innerHTML += `
            <div class="card match-card fade-in">
                <div class="match-header">
                    <span>${f.time} | ${f.venue}</span>
                    <span class="badge ${badgeClass}">${badgeText}</span>
                </div>
                <div class="match-teams">
                    <span>${f.team1}</span>
                    ${scoreHTML || '<span>vs</span>'}
                    <span>${f.team2}</span>
                </div>
                ${f.winner ? `<div class="text-small" style="color: var(--success); margin-top: 0.5rem">Winner: ${f.winner}</div>` : ''}
            </div>
        `;
    });
}

function renderLiveMatch() {
    const container = document.getElementById('live-match-container');
    const liveMatch = tournamentData.fixtures.find(f => f.status === 'Live');

    if (!liveMatch) {
        container.innerHTML = `
            <div style="padding: 2rem;">
                <p>No matches are currently live.</p>
                <button class="btn secondary mt-2" onclick="navigateTo('schedule')">View Schedule</button>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <p class="text-small" style="color: rgba(255,255,255,0.8)">${liveMatch.venue} | Updating live...</p>
        <div class="score-display fade-in">
            <div class="team-name">${liveMatch.team1}</div>
            <div class="score-number">${liveMatch.team1Score}</div>
            <div style="font-size: 1.5rem; opacity: 0.5">-</div>
            <div class="score-number">${liveMatch.team2Score}</div>
            <div class="team-name">${liveMatch.team2}</div>
        </div>
    `;
}

function renderStandings() {
    const tbody = document.getElementById('standings-body');
    tbody.innerHTML = '';
    
    // Sort by points
    const sorted = [...tournamentData.standings].sort((a, b) => b.pts - a.pts);
    
    sorted.forEach(team => {
        tbody.innerHTML += `
            <tr class="fade-in">
                <td><strong>${team.name}</strong></td>
                <td>${team.p}</td>
                <td>${team.w}</td>
                <td>${team.l}</td>
                <td><strong>${team.pts}</strong></td>
            </tr>
        `;
    });
}

function renderFoodMenu() {
    const container = document.getElementById('food-container');
    container.innerHTML = '';
    
    tournamentData.foodMenu.forEach(menu => {
        container.innerHTML += `
            <div class="card fade-in">
                <h3 style="color: var(--primary); font-family: var(--font-heading)">${menu.meal}</h3>
                <p class="text-small" style="margin-bottom: 0.5rem">🕒 ${menu.timing}</p>
                <p><strong>Menu:</strong> ${menu.items}</p>
            </div>
        `;
    });
}

function renderNotices() {
    const container = document.getElementById('notices-container');
    container.innerHTML = '';
    
    if (tournamentData.announcements.length === 0) {
        container.innerHTML = '<p>No notices available.</p>';
        return;
    }

    tournamentData.announcements.forEach(notice => {
        const priorityBadge = notice.priority === 'Urgent' ? '<span class="badge live">Urgent</span>' : '';
        container.innerHTML += `
            <div class="card fade-in" style="${notice.priority === 'Urgent' ? 'border-left: 4px solid var(--danger);' : ''}">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <h3 style="font-family: var(--font-heading)">${notice.title}</h3>
                    ${priorityBadge}
                </div>
                <p style="font-size: 0.95rem;">${notice.message}</p>
            </div>
        `;
    });
}

function populateTeamDropdowns() {
    const demandSelect = document.getElementById('demand-team');
    const roomSelect = document.getElementById('room-team-select');
    
    let options = '<option value="">-- Choose Team --</option>';
    tournamentData.teams.forEach(t => {
        options += `<option value="${t.name}">${t.name}</option>`;
    });

    if(demandSelect.children.length <= 1) demandSelect.innerHTML = options;
    if(roomSelect.children.length <= 1) roomSelect.innerHTML = options;
}

function renderRoomInfo() {
    const team = document.getElementById('room-team-select').value;
    const container = document.getElementById('room-info-container');
    
    if (!team) {
        alert("Please select a team.");
        return;
    }

    const info = tournamentData.rooms[team];
    if (info) {
        container.classList.remove('hidden');
        container.innerHTML = `
            <div class="card fade-in" style="border-left: 4px solid var(--primary);">
                <h3>${team}</h3>
                <p class="mt-2"><strong>Room:</strong> ${info.room}</p>
                <p><strong>Location:</strong> ${info.location}</p>
                <p><strong>Amenities:</strong> ${info.amenities}</p>
            </div>
        `;
    } else {
        container.classList.remove('hidden');
        container.innerHTML = `<p class="alert">No room info found for ${team}.</p>`;
    }
}

// Action Handlers
function handleDemandSubmit(e) {
    e.preventDefault();
    const team = document.getElementById('demand-team').value;
    const cat = document.getElementById('demand-category').value;
    const desc = document.getElementById('demand-desc').value;
    
    showLoader();
    
    if (CONFIG.APPS_SCRIPT_URL === "MOCK_MODE") {
        // Simulate API Call
        setTimeout(() => {
            hideLoader();
            document.getElementById('demand-form').reset();
            document.getElementById('demand-success').classList.remove('hidden');
            
            // Add to local mock state
            tournamentData.demands.push({ id: Date.now(), team, category: cat, description: desc, status: "Pending" });
            
            setTimeout(() => document.getElementById('demand-success').classList.add('hidden'), 3000);
        }, 800);
    } else {
        // Real POST Request
        fetch(CONFIG.APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'submitDemand',
                team: team,
                category: cat,
                description: desc
            })
        })
        .then(res => res.json())
        .then(data => {
            hideLoader();
            document.getElementById('demand-form').reset();
            document.getElementById('demand-success').classList.remove('hidden');
            setTimeout(() => document.getElementById('demand-success').classList.add('hidden'), 3000);
        })
        .catch(err => {
            hideLoader();
            console.error(err);
            alert("Failed to submit request.");
        });
    }
}

function handleAdminLogin() {
    const pin = document.getElementById('admin-pin-input').value;
    const errorMsg = document.getElementById('pin-error');
    
    if (pin === CONFIG.DEFAULT_ADMIN_PIN) {
        errorMsg.classList.add('hidden');
        document.getElementById('pin-modal').classList.add('hidden');
        currentAdminPin = pin;
        navigateTo('admin');
        initAdminDashboard();
    } else {
        errorMsg.classList.remove('hidden');
    }
}

function initAdminDashboard() {
    // Setup Admin Navigation
    document.querySelectorAll('.admin-nav-tiles .tile').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.admin-sub-screen').forEach(s => s.classList.add('hidden'));
            document.getElementById(e.target.dataset.adminTarget).classList.remove('hidden');
        });
    });

    // Populate Overview
    const statsGrid = document.getElementById('admin-stats-grid');
    statsGrid.innerHTML = `
        <div class="stat-card">
            <div class="stat-value">${tournamentData.teams.length}</div>
            <div class="text-small">Teams</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${tournamentData.fixtures.filter(f=>f.day==1).length}</div>
            <div class="text-small">Matches Today</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" style="color: var(--danger)">${tournamentData.demands.filter(d=>d.status==='Pending').length}</div>
            <div class="text-small">Pending Demands</div>
        </div>
    `;

    // Populate Demands
    const demandsList = document.getElementById('admin-demands-list');
    demandsList.innerHTML = '';
    tournamentData.demands.forEach(d => {
        demandsList.innerHTML += `
            <div class="card match-card mt-2">
                <div class="match-header"><span>${d.team}</span> <span class="badge scheduled">${d.status}</span></div>
                <p><strong>${d.category}:</strong> ${d.description}</p>
                <button class="btn secondary text-small mt-2">Mark Resolved</button>
            </div>
        `;
    });
}

// Utilities
function showLoader() { loader.classList.remove('hidden'); }
function hideLoader() { loader.classList.add('hidden'); }

function checkUrgentNotice() {
    const urgent = tournamentData.announcements.find(a => a.priority === 'Urgent');
    if (urgent) {
        document.getElementById('urgent-notice-text').textContent = urgent.title + ": " + urgent.message;
        urgentNoticeBanner.classList.remove('hidden');
    }
}

function startCountdown() {
    const target = new Date(CONFIG.START_DATE).getTime();
    setInterval(() => {
        const now = new Date().getTime();
        const distance = target - now;
        
        if (distance < 0) {
            document.getElementById('timer-display').textContent = "Tournament Started!";
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

        document.getElementById('timer-display').textContent = `${days}d ${hours}h ${minutes}m`;
    }, 60000); // update every minute
}

// Service Worker Registration
function initServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then(reg => console.log('SW registered:', reg))
                .catch(err => console.log('SW registration failed:', err));
        });
    }
}
