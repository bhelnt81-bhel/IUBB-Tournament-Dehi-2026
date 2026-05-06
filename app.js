// Global State
let tournamentData = {
    fixtures: [],
    standings: [],
    demands: [],
    announcements: [],
    teams: [],
    foodMenu: [],
    rooms: {}
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

    // Admin notice form
    document.getElementById('admin-notice-form').addEventListener('submit', handleNoticeSubmit);
    document.getElementById('admin-team-form').addEventListener('submit', handleAdminTeamSubmit);
    document.getElementById('admin-fixture-form').addEventListener('submit', handleAdminFixtureSubmit);
    document.getElementById('admin-food-form').addEventListener('submit', handleAdminFoodSubmit);
    document.getElementById('admin-fixture-select').addEventListener('change', fillFixtureForm);
    document.getElementById('admin-team1').addEventListener('change', updateWinnerOptions);
    document.getElementById('admin-team2').addEventListener('change', updateWinnerOptions);
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
            const res = await fetchWithTimeout(`${CONFIG.APPS_SCRIPT_URL}?action=getAll&_=${Date.now()}`, {
                cache: 'no-store'
            });
            if (!res.ok) throw new Error(`Backend returned ${res.status}`);
            const data = await res.json();
            if (!data.error) {
                tournamentData = normalizeTournamentData(Object.assign({}, tournamentData, data));
            } else {
                throw new Error(data.error);
            }
        }
        checkUrgentNotice();
        renderCurrentScreen();
    } catch (e) {
        console.error("Failed to fetch data:", e);
        showDataError("Could not refresh backend data. Please check your connection and Apps Script deployment.");
    } finally {
        hideLoader();
    }
}

function fetchWithTimeout(url, options = {}, timeout = 12000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    return fetch(url, {
        ...options,
        signal: controller.signal
    }).finally(() => clearTimeout(timeoutId));
}

function showDataError(message) {
    const currentScreen = window.location.pathname.split('/').filter(Boolean)[0] || 'home';
    const target = document.getElementById(`screen-${currentScreen}`);
    if (!target || target.querySelector('.data-error')) return;

    const error = document.createElement('div');
    error.className = 'alert data-error';
    error.textContent = message;
    target.prepend(error);
}

function renderCurrentScreen() {
    const currentScreen = window.location.pathname.split('/').filter(Boolean)[0] || 'home';

    if (currentScreen === 'schedule') renderSchedule(getActiveScheduleDay());
    if (currentScreen === 'live') renderLiveMatch();
    if (currentScreen === 'standings') renderStandings();
    if (currentScreen === 'food') renderFoodMenu();
    if (currentScreen === 'notices') renderNotices();
    if (currentScreen === 'request' || currentScreen === 'room') populateTeamDropdowns(true);
}

function getActiveScheduleDay() {
    return document.querySelector('.tab-btn.active')?.dataset.day || 1;
}

function normalizeTournamentData(data) {
    const normalized = {
        fixtures: Array.isArray(data.fixtures) ? data.fixtures.map(normalizeFixture) : [],
        standings: Array.isArray(data.standings) ? data.standings.map(normalizeStanding) : [],
        demands: Array.isArray(data.demands) ? data.demands.map(normalizeDemand) : [],
        announcements: Array.isArray(data.announcements) ? data.announcements.map(normalizeAnnouncement) : [],
        teams: Array.isArray(data.teams) ? data.teams.map(normalizeTeam) : [],
        foodMenu: Array.isArray(data.foodMenu) ? data.foodMenu.map(normalizeFoodMenu) : [],
        rooms: {}
    };

    normalized.teams.forEach(team => {
        if (team.name && team.roomAllotted) {
            normalized.rooms[team.name] = {
                room: team.roomAllotted,
                location: team.unit || '',
                amenities: ''
            };
        }
    });

    if (data.rooms && !Array.isArray(data.rooms)) {
        normalized.rooms = Object.assign(normalized.rooms, data.rooms);
    } else if (Array.isArray(data.rooms)) {
        data.rooms.forEach(room => {
            const teamName = room.teamName || room.team || room.name;
            if (teamName) {
                normalized.rooms[teamName] = {
                    room: room.roomNo || room.room || room.roomAllotted || '',
                    location: room.location || '',
                    amenities: room.amenitiesNote || room.amenities || ''
                };
            }
        });
    }

    return normalized;
}

function normalizeTeam(team) {
    return {
        id: team.id || team.teamID || team.teamId || '',
        name: team.name || team.teamName || '',
        unit: team.unit || team.unitName || '',
        captainName: team.captainName || '',
        managerName: team.managerName || '',
        roomAllotted: team.roomAllotted || team.room || '',
        contactNumber: team.contactNumber || ''
    };
}

function normalizeFixture(fixture) {
    return {
        id: fixture.id || fixture.matchID || fixture.matchId || '',
        date: normalizeDateValue(fixture.date),
        time: normalizeTimeValue(fixture.time),
        team1: fixture.team1 || '',
        team2: fixture.team2 || '',
        venue: fixture.venue || '',
        status: fixture.status || 'Scheduled',
        team1Score: Number(fixture.team1Score || 0),
        team2Score: Number(fixture.team2Score || 0),
        winner: fixture.winner || '',
        day: fixture.day || getTournamentDay(fixture.date)
    };
}

function normalizeStanding(team) {
    return {
        name: team.name || team.teamName || '',
        p: Number(team.p || team.played || 0),
        w: Number(team.w || team.won || 0),
        l: Number(team.l || team.lost || 0),
        pts: Number(team.pts || team.points || 0)
    };
}

function normalizeDemand(demand) {
    return {
        id: demand.id || demand.demandID || demand.demandId || '',
        team: demand.team || demand.teamName || '',
        category: demand.category || '',
        description: demand.description || '',
        status: demand.status || 'Pending'
    };
}

function normalizeAnnouncement(notice) {
    return {
        id: notice.id || notice.annID || notice.annId || '',
        title: notice.title || '',
        message: notice.message || '',
        priority: notice.priority || 'Normal'
    };
}

function normalizeFoodMenu(menu) {
    return {
        date: normalizeDateValue(menu.date),
        meal: menu.meal || menu.mealType || '',
        timing: menu.timing || '',
        items: menu.items || menu.menuItems || ''
    };
}

function normalizeDateValue(value) {
    if (!value) return '';
    if (typeof value === 'string') return value.slice(0, 10);
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value).slice(0, 10);
}

function normalizeTimeValue(value) {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (value instanceof Date) {
        return value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return String(value);
}

function getTournamentDay(dateValue) {
    const date = new Date(dateValue);
    const start = getTournamentStartDate();
    if (Number.isNaN(date.getTime()) || Number.isNaN(start.getTime())) return 1;
    return Math.floor((date - start) / (1000 * 60 * 60 * 24)) + 1;
}

function getTournamentStartDate() {
    return new Date(`${CONFIG.START_DATE}T${CONFIG.START_TIME || '00:00:00'}`);
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

function populateTeamDropdowns(forceRefresh = false) {
    const demandSelect = document.getElementById('demand-team');
    const roomSelect = document.getElementById('room-team-select');
    const selectedDemandTeam = demandSelect.value;
    const selectedRoomTeam = roomSelect.value;
    
    let options = '<option value="">-- Choose Team --</option>';
    tournamentData.teams.forEach(t => {
        options += `<option value="${t.name}">${t.name}</option>`;
    });

    if(forceRefresh || demandSelect.children.length <= 1) {
        demandSelect.innerHTML = options;
        demandSelect.value = selectedDemandTeam;
    }
    if(forceRefresh || roomSelect.children.length <= 1) {
        roomSelect.innerHTML = options;
        roomSelect.value = selectedRoomTeam;
    }
}

function renderRoomInfo() {
    const team = document.getElementById('room-team-select').value;
    const container = document.getElementById('room-info-container');
    
    if (!team) {
        alert("Please select a team.");
        return;
    }

    const info = tournamentData.rooms[team];
    if (info && info.room) {
        container.classList.remove('hidden');
        container.innerHTML = `
            <div class="card fade-in" style="border-left: 4px solid var(--primary);">
                <h3>${team}</h3>
                <p class="mt-2"><strong>Room:</strong> ${info.room}</p>
                ${info.location ? `<p><strong>Location:</strong> ${info.location}</p>` : ''}
                ${info.amenities ? `<p><strong>Amenities:</strong> ${info.amenities}</p>` : ''}
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
            redirect: 'follow',
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
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

async function handleAdminLogin() {
    const pin = document.getElementById('admin-pin-input').value;
    const errorMsg = document.getElementById('pin-error');
    
    if (CONFIG.APPS_SCRIPT_URL === "MOCK_MODE" && pin === CONFIG.DEFAULT_ADMIN_PIN) {
        errorMsg.classList.add('hidden');
        document.getElementById('pin-modal').classList.add('hidden');
        currentAdminPin = pin;
        navigateTo('admin');
        initAdminDashboard();
        return;
    }

    showLoader();
    try {
        await postAdminAction('verifyAdmin', {});
        errorMsg.classList.add('hidden');
        document.getElementById('pin-modal').classList.add('hidden');
        currentAdminPin = pin;
        navigateTo('admin');
        initAdminDashboard();
    } catch (err) {
        console.error(err);
        errorMsg.classList.remove('hidden');
    } finally {
        hideLoader();
    }
}

async function postAdminAction(action, payload) {
    const body = {
        action,
        adminPIN: currentAdminPin || document.getElementById('admin-pin-input').value,
        ...payload
    };

    if (CONFIG.APPS_SCRIPT_URL === "MOCK_MODE") {
        return { success: true };
    }

    const res = await fetchWithTimeout(CONFIG.APPS_SCRIPT_URL, {
        method: 'POST',
        redirect: 'follow',
        headers: {
            "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Admin action failed');
    return data;
}

function initAdminDashboard() {
    // Setup Admin Navigation
    document.querySelectorAll('.admin-nav-tiles .tile').forEach(btn => {
        if (btn.dataset.listenerAttached) return;
        btn.dataset.listenerAttached = 'true';
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.admin-sub-screen').forEach(s => s.classList.add('hidden'));
            document.getElementById(e.currentTarget.dataset.adminTarget).classList.remove('hidden');
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
    if (tournamentData.demands.length === 0) {
        demandsList.innerHTML = '<p class="text-small">No demands submitted yet.</p>';
    }
    tournamentData.demands.forEach((d, index) => {
        demandsList.innerHTML += `
            <div class="card match-card mt-2">
                <div class="match-header"><span>${d.team}</span> <span class="badge scheduled">${d.status}</span></div>
                <p><strong>${d.category}:</strong> ${d.description}</p>
                <button class="btn secondary text-small mt-2 demand-resolve-btn" data-demand-index="${index}">Mark Resolved</button>
            </div>
        `;
    });
    document.querySelectorAll('.demand-resolve-btn').forEach(btn => {
        btn.addEventListener('click', () => handleDemandStatusUpdate(Number(btn.dataset.demandIndex)));
    });

    populateAdminControls();
}

function populateAdminControls() {
    const teamOptions = '<option value="">-- Select Team --</option>' + tournamentData.teams
        .map(team => `<option value="${team.name}">${team.name}</option>`)
        .join('');

    document.getElementById('admin-team1').innerHTML = teamOptions;
    document.getElementById('admin-team2').innerHTML = teamOptions;

    const fixtureOptions = '<option value="">New Match</option>' + tournamentData.fixtures
        .map(match => `<option value="${match.id}">${match.id || 'Match'} - ${match.team1} vs ${match.team2}</option>`)
        .join('');
    document.getElementById('admin-fixture-select').innerHTML = fixtureOptions;
    updateWinnerOptions();
}

function fillFixtureForm() {
    const id = document.getElementById('admin-fixture-select').value;
    const fixture = tournamentData.fixtures.find(match => String(match.id) === String(id));

    document.getElementById('admin-match-id').value = fixture?.id || '';
    document.getElementById('admin-match-date').value = fixture?.date || '';
    document.getElementById('admin-match-time').value = toTimeInputValue(fixture?.time || '');
    document.getElementById('admin-team1').value = fixture?.team1 || '';
    document.getElementById('admin-team2').value = fixture?.team2 || '';
    document.getElementById('admin-venue').value = fixture?.venue || '';
    document.getElementById('admin-match-status').value = fixture?.status || 'Scheduled';
    document.getElementById('admin-team1-score').value = fixture?.team1Score || 0;
    document.getElementById('admin-team2-score').value = fixture?.team2Score || 0;
    updateWinnerOptions();
    document.getElementById('admin-winner').value = fixture?.winner || '';
}

function updateWinnerOptions() {
    const team1 = document.getElementById('admin-team1').value;
    const team2 = document.getElementById('admin-team2').value;
    let options = '<option value="">Auto / None</option>';
    if (team1) options += `<option value="${team1}">${team1}</option>`;
    if (team2) options += `<option value="${team2}">${team2}</option>`;
    document.getElementById('admin-winner').innerHTML = options;
}

function toTimeInputValue(value) {
    if (!value) return '';
    const match = String(value).match(/(\d{1,2}):(\d{2})/);
    if (!match) return '';
    let hours = Number(match[1]);
    const minutes = match[2];
    if (/PM/i.test(value) && hours < 12) hours += 12;
    if (/AM/i.test(value) && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${minutes}`;
}

async function handleAdminTeamSubmit(e) {
    e.preventDefault();
    const team = {
        teamID: document.getElementById('admin-team-id').value || Date.now(),
        teamName: document.getElementById('admin-team-name').value.trim(),
        unitName: document.getElementById('admin-unit-name').value.trim(),
        captainName: document.getElementById('admin-captain-name').value.trim(),
        managerName: document.getElementById('admin-manager-name').value.trim(),
        roomAllotted: document.getElementById('admin-room-allotted').value.trim(),
        contactNumber: document.getElementById('admin-contact-number').value.trim()
    };

    if (!team.teamName) return;

    await runAdminSave('saveTeam', team, () => {
        document.getElementById('admin-team-form').reset();
    });
}

async function handleAdminFixtureSubmit(e) {
    e.preventDefault();
    const fixture = {
        matchID: document.getElementById('admin-match-id').value || Date.now(),
        date: document.getElementById('admin-match-date').value,
        time: document.getElementById('admin-match-time').value,
        team1: document.getElementById('admin-team1').value,
        team2: document.getElementById('admin-team2').value,
        venue: document.getElementById('admin-venue').value.trim(),
        status: document.getElementById('admin-match-status').value,
        team1Score: document.getElementById('admin-team1-score').value || 0,
        team2Score: document.getElementById('admin-team2-score').value || 0,
        winner: document.getElementById('admin-winner').value
    };

    await runAdminSave('saveFixture', fixture, () => {
        document.getElementById('admin-fixture-form').reset();
        populateAdminControls();
    });
}

async function handleAdminFoodSubmit(e) {
    e.preventDefault();
    const menu = {
        date: document.getElementById('admin-food-date').value,
        mealType: document.getElementById('admin-meal-type').value,
        timing: document.getElementById('admin-food-timing').value.trim(),
        menuItems: document.getElementById('admin-menu-items').value.trim()
    };

    await runAdminSave('saveFoodMenu', menu, () => {
        document.getElementById('admin-food-form').reset();
    });
}

async function handleDemandStatusUpdate(demandIndex) {
    const demand = tournamentData.demands[demandIndex];
    if (!demand) return;
    await runAdminSave('updateDemandStatus', {
        demandID: demand.id,
        teamName: demand.team,
        category: demand.category,
        description: demand.description,
        status: 'Resolved'
    });
}

async function runAdminSave(action, payload, onSuccess) {
    showLoader();
    try {
        await postAdminAction(action, payload);
        if (onSuccess) onSuccess();
        await fetchData();
        initAdminDashboard();
    } catch (err) {
        console.error(err);
        alert(err.message || 'Failed to save admin data.');
    } finally {
        hideLoader();
    }
}

function handleNoticeSubmit(e) {
    e.preventDefault();

    const title = document.getElementById('notice-title').value.trim();
    const message = document.getElementById('notice-msg').value.trim();
    const priority = document.getElementById('notice-priority').value;

    if (!title || !message) return;

    showLoader();

    const notice = {
        id: Date.now(),
        title,
        message,
        priority
    };

    postAdminAction('addAnnouncement', { title, message, priority })
    .then(() => {
        tournamentData.announcements.unshift(notice);
        document.getElementById('admin-notice-form').reset();
        checkUrgentNotice();
        renderNotices();
    })
    .catch(err => {
        console.error(err);
        alert("Failed to post notice.");
    })
    .finally(hideLoader);
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
    const target = getTournamentStartDate().getTime();
    const updateCountdown = () => {
        const now = new Date().getTime();
        const distance = target - now;
        
        if (distance < 0) {
            document.getElementById('timer-display').textContent = "Tournament Started!";
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        document.getElementById('timer-display').textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    };

    updateCountdown();
    setInterval(updateCountdown, 1000); // update every second
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
