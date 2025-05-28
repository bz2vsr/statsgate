// Global variables
let gameData = null;
let allGames = [];
let currentFilter = { type: 'general', value: null };

// Utility function to safely create charts
function safeCreateChart(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error(`Canvas element ${canvasId} not found`);
        return null;
    }
    
    if (typeof Chart === 'undefined') {
        console.error('Chart.js not loaded');
        return null;
    }
    
    try {
        return new Chart(canvas.getContext('2d'), config);
    } catch (error) {
        console.error(`Error creating chart ${canvasId}:`, error);
        return null;
    }
}

// Fetch and display game statistics data
async function loadGameData() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/HerndonE/battlezone-combat-commander-strategy-statistics/refs/heads/main/data/data.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        gameData = await response.json();
        
        if (!gameData) {
            throw new Error('No data received from server');
        }
        
        // Process all games into a flat array for easier analysis
        processAllGames();
        
        // Update the timestamp in the navbar
        updateTimestamp();
        
        // Initialize the dashboard
        initializeDashboard();
        
        console.log('Data loaded successfully:', gameData);
    } catch (error) {
        console.error('Error loading game data:', error);
        const mainContent = document.querySelector('main');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="alert alert-danger">
                    <h4>Error Loading Data</h4>
                    <p>Unable to load game statistics data: ${error.message}</p>
                    <p>Please check your internet connection and try refreshing the page.</p>
                    <button class="btn btn-outline-danger" onclick="location.reload()">Retry</button>
                </div>
            `;
        } else {
            console.error('Main content element not found');
        }
    }
}

// Update the timestamp in the navbar
function updateTimestamp() {
    const timestampElement = document.getElementById('lastUpdated');
    if (timestampElement && gameData.last_updated) {
        timestampElement.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clock-history mb-1 me-1" viewBox="0 0 16 16">
                <path d="M8.515 1.019A7 7 0 0 0 8 1V0a8 8 0 0 1 .589.022zm2.004.45a7 7 0 0 0-.985-.299l.219-.976q.576.129 1.126.342zm1.37.71a7 7 0 0 0-.439-.27l.493-.87a8 8 0 0 1 .979.654l-.615.789a7 7 0 0 0-.418-.302zm1.834 1.79a7 7 0 0 0-.653-.796l.724-.69q.406.429.747.91zm.744 1.352a7 7 0 0 0-.214-.468l.893-.45a8 8 0 0 1 .45 1.088l-.95.313a7 7 0 0 0-.179-.483m.53 2.507a7 7 0 0 0-.1-1.025l.985-.17q.1.58.116 1.17zm-.131 1.538q.05-.254.081-.51l.993.123a8 8 0 0 1-.23 1.155l-.964-.267q.069-.247.12-.501m-.952 2.379q.276-.436.486-.908l.914.405q-.24.54-.555 1.038zm-.964 1.205q.183-.183.35-.378l.758.653a8 8 0 0 1-.401.432z"/>
                <path d="M8 1a7 7 0 1 0 4.95 11.95l.707.707A8.001 8.001 0 1 1 8 0z"/>
                <path d="M7.5 3a.5.5 0 0 1 .5.5v5.21l3.248 1.856a.5.5 0 0 1-.496.868l-3.5-2A.5.5 0 0 1 7 9V3.5a.5.5 0 0 1 .5-.5"/>
            </svg>
            Last Updated: ${gameData.last_updated}
        `;
    }
}

// Process all games into a flat array
function processAllGames() {
    allGames = [];
    
    // Process each year
    Object.keys(gameData).forEach(year => {
        if (year === 'last_updated') return;
        
        const yearData = gameData[year];
        if (!yearData.raw_2024 && !yearData.raw_2025) return;
        
        const rawData = yearData[`raw_${year}`];
        if (!rawData || !rawData.month) return;
        
        // Process each month
        Object.keys(rawData.month).forEach(month => {
            const monthData = rawData.month[month];
            
            // Process each day
            Object.keys(monthData).forEach(day => {
                const dayData = monthData[day];
                
                // Process each game
                Object.keys(dayData).forEach(mapName => {
                    const game = dayData[mapName];
                    
                    // Parse commanders
                    const commanders = game.commanders.split(' vs ');
                    // Parse factions more safely
                    let factions;
                    try {
                        factions = JSON.parse(game.factions);
                    } catch (e) {
                        // Fallback parsing for malformed faction strings
                        const factionsStr = game.factions.replace(/[\[\]]/g, '').split(',').map(f => f.trim());
                        factions = factionsStr;
                    }
                    
                    // Determine winner index
                    const winnerIndex = commanders.indexOf(game.winner);
                    const loserIndex = winnerIndex === 0 ? 1 : 0;
                    
                    allGames.push({
                        ...game,
                        year: parseInt(year),
                        month,
                        day,
                        commander1: commanders[0],
                        commander2: commanders[1],
                        faction1: factions[0],
                        faction2: factions[1],
                        winnerIndex,
                        loser: commanders[loserIndex],
                        losingFaction: factions[loserIndex],
                        teamOneSize: (game.teamOne || []).length + 1, // +1 for commander
                        teamTwoSize: (game.teamTwo || []).length + 1,
                        totalPlayers: (game.teamOne || []).length + (game.teamTwo || []).length + 2,
                        hasStraggler: (game.teamOneStraggler || []).length > 0 || (game.teamTwoStraggler || []).length > 0,
                        stragglerCount: (game.teamOneStraggler || []).length + (game.teamTwoStraggler || []).length
                    });
                });
            });
        });
    });
}

// Initialize the dashboard
function initializeDashboard() {
    const mainContent = document.querySelector('main');
    
    mainContent.innerHTML = `
        <div class="dashboard-container">
            <!-- Toolbar -->
            <div class="toolbar-section mb-4">
                <div class="card bg-dark border-secondary">
                    <div class="card-body">
                        <div class="row align-items-center">
                            <div class="col-md-3">
                                <label class="form-label text-light">Analysis Type</label>
                                <select id="analysisType" class="form-select bg-dark text-light border-secondary">
                                    <option value="general">General Overview</option>
                                    <option value="player">Player Analysis</option>
                                    <option value="map">Map Analysis</option>
                                    <option value="faction">Faction Analysis</option>
                                </select>
                            </div>
                            <div class="col-md-3" id="filterSection" style="display: none;">
                                <label class="form-label text-light">Filter By</label>
                                <select id="filterSelect" class="form-select bg-dark text-light border-secondary">
                                    <option value="">All Data</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label text-light">Time Period</label>
                                <select id="timePeriod" class="form-select bg-dark text-light border-secondary">
                                    <option value="all">All Time</option>
                                    <option value="2025">2025 Only</option>
                                    <option value="2024">2024 Only</option>
                                </select>
                            </div>
                            <div class="col-md-3 d-flex align-items-end">
                                <button id="resetFilters" class="btn btn-outline-light">Reset Filters</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Stats Summary Cards -->
            <div class="stats-summary mb-4">
                <div class="row">
                    <div class="col-md-3">
                        <div class="card bg-primary text-white">
                            <div class="card-body text-center">
                                <h3 id="totalGames" class="mb-0">0</h3>
                                <p class="mb-0">Total Games</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-success text-white">
                            <div class="card-body text-center">
                                <h3 id="totalCommanders" class="mb-0">0</h3>
                                <p class="mb-0">Commanders</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-info text-white">
                            <div class="card-body text-center">
                                <h3 id="totalMaps" class="mb-0">0</h3>
                                <p class="mb-0">Maps Played</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-warning text-white">
                            <div class="card-body text-center">
                                <h3 id="avgGameTime" class="mb-0">--</h3>
                                <p class="mb-0">Avg Game Time</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Main Content Area -->
            <div id="mainAnalysis">
                <!-- Content will be dynamically loaded here -->
            </div>
        </div>
    `;
    
    // Initialize event listeners
    setupEventListeners();
    
    // Load general overview by default
    loadGeneralOverview();
}

// Setup event listeners
function setupEventListeners() {
    // Add safety checks to ensure elements exist before adding listeners
    const analysisType = document.getElementById('analysisType');
    const filterSelect = document.getElementById('filterSelect');
    const timePeriod = document.getElementById('timePeriod');
    const resetButton = document.getElementById('resetFilters');
    
    if (analysisType) {
        analysisType.addEventListener('change', handleAnalysisTypeChange);
    } else {
        console.error('analysisType element not found');
    }
    
    if (filterSelect) {
        filterSelect.addEventListener('change', handleFilterChange);
    } else {
        console.error('filterSelect element not found');
    }
    
    if (timePeriod) {
        timePeriod.addEventListener('change', handleTimePeriodChange);
    } else {
        console.error('timePeriod element not found');
    }
    
    if (resetButton) {
        resetButton.addEventListener('click', resetFilters);
    } else {
        console.error('resetFilters element not found');
    }
}

// Handle analysis type change
function handleAnalysisTypeChange() {
    const analysisType = document.getElementById('analysisType');
    const filterSelect = document.getElementById('filterSelect');
    const filterSection = document.getElementById('filterSection');
    
    if (!analysisType || !filterSelect || !filterSection) {
        console.error('Required elements not found for analysis type change');
        return;
    }
    
    const analysisValue = analysisType.value;
    
    // Clear and populate filter options based on analysis type
    filterSelect.innerHTML = '<option value="">All Data</option>';
    
    // Show/hide filter section based on analysis type
    if (analysisValue === 'general') {
        filterSection.style.display = 'none';
    } else {
        filterSection.style.display = 'block';
    }
    
    if (analysisValue === 'player') {
        // Get all players (commanders + teammates)
        const allPlayers = new Set();
        allGames.forEach(game => {
            // Add commanders
            allPlayers.add(game.commander1);
            allPlayers.add(game.commander2);
            // Add teammates
            if (game.teamOne) game.teamOne.forEach(player => allPlayers.add(player));
            if (game.teamTwo) game.teamTwo.forEach(player => allPlayers.add(player));
            // Add stragglers
            if (game.teamOneStraggler) game.teamOneStraggler.forEach(player => allPlayers.add(player));
            if (game.teamTwoStraggler) game.teamTwoStraggler.forEach(player => allPlayers.add(player));
        });
        const players = [...allPlayers].sort();
        players.forEach(player => {
            filterSelect.innerHTML += `<option value="${player}">${player}</option>`;
        });
    } else if (analysisValue === 'map') {
        const maps = [...new Set(allGames.map(g => g.map))].sort();
        maps.forEach(map => {
            filterSelect.innerHTML += `<option value="${map}">${map}</option>`;
        });
    } else if (analysisValue === 'faction') {
        const factions = [...new Set(allGames.flatMap(g => [g.faction1, g.faction2]))].sort();
        factions.forEach(faction => {
            filterSelect.innerHTML += `<option value="${faction}">${faction}</option>`;
        });
    }
    
    // Reset filter and reload content
    filterSelect.value = '';
    loadContent();
}

// Handle filter change
function handleFilterChange() {
    loadContent();
}

// Handle time period change
function handleTimePeriodChange() {
    loadContent();
}

// Reset filters
function resetFilters() {
    const analysisTypeElement = document.getElementById('analysisType');
    const filterSelectElement = document.getElementById('filterSelect');
    const timePeriodElement = document.getElementById('timePeriod');
    const filterSectionElement = document.getElementById('filterSection');
    
    if (!analysisTypeElement || !filterSelectElement || !timePeriodElement) {
        console.error('Required elements not found for reset');
        return;
    }
    
    analysisTypeElement.value = 'general';
    filterSelectElement.innerHTML = '<option value="">All Data</option>';
    filterSelectElement.value = '';
    timePeriodElement.value = 'all';
    
    // Hide filter section for general overview
    if (filterSectionElement) {
        filterSectionElement.style.display = 'none';
    }
    
    loadContent();
}

// Load content based on current filters
function loadContent() {
    const analysisType = document.getElementById('analysisType').value;
    
    switch (analysisType) {
        case 'general':
            loadGeneralOverview();
            break;
        case 'player':
            loadPlayerAnalysis();
            break;
        case 'map':
            loadMapAnalysis();
            break;
        case 'faction':
            loadFactionAnalysis();
            break;
    }
}

// Get filtered games based on current filters
function getFilteredGames() {
    let filtered = [...allGames];
    
    const timePeriodElement = document.getElementById('timePeriod');
    const analysisTypeElement = document.getElementById('analysisType');
    const filterSelectElement = document.getElementById('filterSelect');
    
    if (!timePeriodElement || !analysisTypeElement || !filterSelectElement) {
        console.error('Required filter elements not found');
        return filtered;
    }
    
    const timePeriod = timePeriodElement.value;
    if (timePeriod !== 'all') {
        filtered = filtered.filter(game => game.year === parseInt(timePeriod));
    }
    
    const analysisType = analysisTypeElement.value;
    const filterValue = filterSelectElement.value;
    
    if (filterValue) {
        if (analysisType === 'player') {
            filtered = filtered.filter(game => {
                // Check if player is commander
                if (game.commander1 === filterValue || game.commander2 === filterValue) return true;
                // Check if player is in teams
                if (game.teamOne && game.teamOne.includes(filterValue)) return true;
                if (game.teamTwo && game.teamTwo.includes(filterValue)) return true;
                // Check if player is in stragglers
                if (game.teamOneStraggler && game.teamOneStraggler.includes(filterValue)) return true;
                if (game.teamTwoStraggler && game.teamTwoStraggler.includes(filterValue)) return true;
                return false;
            });
        } else if (analysisType === 'map') {
            filtered = filtered.filter(game => game.map === filterValue);
        } else if (analysisType === 'faction') {
            filtered = filtered.filter(game => game.faction1 === filterValue || game.faction2 === filterValue);
        }
    }
    
    return filtered;
}

// Update summary stats
function updateSummaryStats(games) {
    const analysisTypeElement = document.getElementById('analysisType');
    const filterSelectElement = document.getElementById('filterSelect');
    
    if (!analysisTypeElement || !filterSelectElement) {
        console.error('Required elements not found for summary stats update');
        return;
    }
    
    const analysisType = analysisTypeElement.value;
    const selectedPlayer = filterSelectElement.value;
    
    // Get all the stat elements
    const totalGamesElement = document.getElementById('totalGames');
    const totalCommandersElement = document.getElementById('totalCommanders');
    const totalMapsElement = document.getElementById('totalMaps');
    const avgGameTimeElement = document.getElementById('avgGameTime');
    
    if (!totalGamesElement || !totalCommandersElement || !totalMapsElement || !avgGameTimeElement) {
        console.error('Summary stat elements not found');
        return;
    }
    
    if (analysisType === 'player' && selectedPlayer) {
        // Player-specific stats
        const totalGames = games.length;
        const maps = [...new Set(games.map(g => g.map))];
        const totalWins = games.filter(g => {
            // Check if the selected player won
            if (g.commander1 === selectedPlayer || g.commander2 === selectedPlayer) {
                return g.winner === selectedPlayer;
            } else {
                // Player was a teammate/thug, check if their team won
                let playerTeam = null;
                if (g.teamOne && g.teamOne.includes(selectedPlayer)) playerTeam = 1;
                if (g.teamTwo && g.teamTwo.includes(selectedPlayer)) playerTeam = 2;
                if (g.teamOneStraggler && g.teamOneStraggler.includes(selectedPlayer)) playerTeam = 1;
                if (g.teamTwoStraggler && g.teamTwoStraggler.includes(selectedPlayer)) playerTeam = 2;
                
                if (playerTeam === 1) return g.winner === g.commander1;
                if (playerTeam === 2) return g.winner === g.commander2;
                return false;
            }
        }).length;
        
        const winRate = totalGames > 0 ? ((totalWins / totalGames) * 100).toFixed(1) : '0.0';
        
        // Calculate average game time for this player's games
        const gamesWithTime = games.filter(g => g.time && g.time.trim() !== '');
        let avgTime = '--';
        if (gamesWithTime.length > 0) {
            const totalMinutes = gamesWithTime.reduce((sum, game) => {
                try {
                    const timeParts = game.time.split(':');
                    if (timeParts.length >= 2) {
                        const hours = parseInt(timeParts[0]) || 0;
                        const minutes = parseInt(timeParts[1]) || 0;
                        const seconds = timeParts.length > 2 ? (parseInt(timeParts[2]) || 0) : 0;
                        const totalMinutesForGame = hours * 60 + minutes + seconds / 60;
                        return sum + totalMinutesForGame;
                    }
                    return sum;
                } catch (e) {
                    console.warn('Error parsing time:', game.time, e);
                    return sum;
                }
            }, 0);
            
            if (totalMinutes > 0) {
                const avgMinutes = totalMinutes / gamesWithTime.length;
                const hours = Math.floor(avgMinutes / 60);
                const mins = Math.floor(avgMinutes % 60);
                avgTime = `${hours}:${mins.toString().padStart(2, '0')}`;
            }
        }
        
        totalGamesElement.textContent = totalGames;
        totalCommandersElement.textContent = maps.length;
        totalMapsElement.textContent = avgTime;
        avgGameTimeElement.textContent = `${winRate}%`;
        
        // Update labels for player-specific context
        const gameLabel = totalGamesElement.parentElement?.querySelector('p');
        const commanderLabel = totalCommandersElement.parentElement?.querySelector('p');
        const mapLabel = totalMapsElement.parentElement?.querySelector('p');
        const timeLabel = avgGameTimeElement.parentElement?.querySelector('p');
        
        if (gameLabel) gameLabel.textContent = 'Total Games';
        if (commanderLabel) commanderLabel.textContent = 'Maps Played';
        if (mapLabel) mapLabel.textContent = 'Avg Game Time';
        if (timeLabel) timeLabel.textContent = 'Win Rate';
    } else {
        // Global stats (original logic)
        const totalGames = games.length;
        const commanders = [...new Set(games.flatMap(g => [g.commander1, g.commander2]))];
        const maps = [...new Set(games.map(g => g.map))];
        
        // Calculate average game time
        const gamesWithTime = games.filter(g => g.time && g.time.trim() !== '');
        let avgTime = '--';
        if (gamesWithTime.length > 0) {
            const totalMinutes = gamesWithTime.reduce((sum, game) => {
                try {
                    const timeParts = game.time.split(':');
                    if (timeParts.length >= 2) {
                        const hours = parseInt(timeParts[0]) || 0;
                        const minutes = parseInt(timeParts[1]) || 0;
                        const seconds = timeParts.length > 2 ? (parseInt(timeParts[2]) || 0) : 0;
                        const totalMinutesForGame = hours * 60 + minutes + seconds / 60;
                        return sum + totalMinutesForGame;
                    }
                    return sum;
                } catch (e) {
                    console.warn('Error parsing time:', game.time, e);
                    return sum;
                }
            }, 0);
            
            if (totalMinutes > 0) {
                const avgMinutes = totalMinutes / gamesWithTime.length;
                const hours = Math.floor(avgMinutes / 60);
                const mins = Math.floor(avgMinutes % 60);
                avgTime = `${hours}:${mins.toString().padStart(2, '0')}`;
            }
        }
        
        totalGamesElement.textContent = totalGames;
        totalCommandersElement.textContent = commanders.length;
        totalMapsElement.textContent = maps.length;
        avgGameTimeElement.textContent = avgTime;
        
        // Reset labels to global context
        const gameLabel = totalGamesElement.parentElement?.querySelector('p');
        const commanderLabel = totalCommandersElement.parentElement?.querySelector('p');
        const mapLabel = totalMapsElement.parentElement?.querySelector('p');
        const timeLabel = avgGameTimeElement.parentElement?.querySelector('p');
        
        if (gameLabel) gameLabel.textContent = 'Total Games';
        if (commanderLabel) commanderLabel.textContent = 'Commanders';
        if (mapLabel) mapLabel.textContent = 'Maps Played';
        if (timeLabel) timeLabel.textContent = 'Avg Game Time';
    }
}

// Load general overview
function loadGeneralOverview() {
    const games = getFilteredGames();
    updateSummaryStats(games);
    
    const mainAnalysis = document.getElementById('mainAnalysis');
    mainAnalysis.innerHTML = `
        <div class="row">
            <!-- Commander Rankings -->
            <div class="col-lg-6 mb-4">
                <div class="card bg-dark border-secondary">
                    <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Commander Rankings (Games Played)</h5>
                        <button class="btn btn-sm btn-outline-light maximize-chart" data-chart-type="commanderGames" data-chart-title="Commander Rankings - All Players (Games Played)">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="card-body">
                        <canvas id="commanderGamesChart"></canvas>
                    </div>
                </div>
            </div>
            
            <!-- Commander Win Rates -->
            <div class="col-lg-6 mb-4">
                <div class="card bg-dark border-secondary">
                    <div class="card-header bg-success text-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Commander Rankings</h5>
                        <div class="d-flex gap-2 align-items-center">
                            <select id="rankingMethod" class="form-select form-select-sm bg-success-dark text-light border-success" style="width: auto;">
                                <option value="wilson">Wilson Score</option>
                                <option value="winRate">Pure Win Rate</option>
                                <option value="volumeWeighted">Volume-Weighted</option>
                                <option value="bayesian">Bayesian Average</option>
                                <option value="composite">Composite Score</option>
                            </select>
                            <select id="minGameRequirement" class="form-select form-select-sm bg-success-dark text-light border-success" style="width: auto;">
                                <option value="3%">3% Min Games</option>
                                <option value="5%">5% Min Games</option>
                                <option value="10%">10% Min Games</option>
                                <option value="30">30 Games Min</option>
                                <option value="50">50 Games Min</option>
                                <option value="100">100 Games Min</option>
                            </select>
                            <button class="btn btn-sm btn-outline-light maximize-chart" data-chart-type="commanderWinRate" data-chart-title="Commander Rankings - All Players">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <canvas id="commanderWinRateChart"></canvas>
                    </div>
                </div>
            </div>
            
            <!-- Map Popularity -->
            <div class="col-lg-6 mb-4">
                <div class="card bg-dark border-secondary">
                    <div class="card-header bg-info text-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Most Played Maps</h5>
                        <button class="btn btn-sm btn-outline-light maximize-chart" data-chart-type="mapPopularity" data-chart-title="Map Popularity - All Maps">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="card-body">
                        <canvas id="mapPopularityChart"></canvas>
                    </div>
                </div>
            </div>
            
            <!-- Faction Choices by Commander -->
            <div class="col-lg-6 mb-4">
                <div class="card bg-dark border-secondary">
                    <div class="card-header bg-warning text-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Commander Faction Preferences</h5>
                        <button class="btn btn-sm btn-outline-light maximize-chart" data-chart-type="commanderFaction" data-chart-title="Commander Faction Preferences - All Players">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="card-body">
                        <canvas id="commanderFactionChart"></canvas>
                    </div>
                </div>
            </div>
            
            <!-- Faction Win Rates -->
            <div class="col-lg-6 mb-4">
                <div class="card bg-dark border-secondary">
                    <div class="card-header bg-purple text-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Faction Win/Loss Record</h5>
                        <button class="btn btn-sm btn-outline-light maximize-chart" data-chart-type="factionPerformance" data-chart-title="Faction Performance - Complete Analysis">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="card-body">
                        <canvas id="factionPerformanceChart"></canvas>
                    </div>
                </div>
            </div>
            
            <!-- Game Duration Distribution -->
            <div class="col-lg-6 mb-4">
                <div class="card bg-dark border-secondary">
                    <div class="card-header bg-secondary text-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Game Duration Distribution</h5>
                        <button class="btn btn-sm btn-outline-light maximize-chart" data-chart-type="gameDuration" data-chart-title="Game Duration Distribution - Complete Analysis">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="card-body">
                        <canvas id="gameDurationChart"></canvas>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Chart Maximize Modal -->
        <div class="modal fade" id="chartModal" tabindex="-1" aria-labelledby="chartModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-fullscreen">
                <div class="modal-content bg-dark">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title" id="chartModalLabel">Chart Details</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="container-fluid">
                            <div class="row">
                                <div class="col-12">
                                    <div class="card bg-dark border-secondary">
                                        <div class="card-body" style="height: calc(100vh - 200px);">
                                            <canvas id="modalChart" style="max-height: 100%;"></canvas>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Create charts
    createCommanderGamesChart(games);
    createCommanderWinRateChart(games, 'wilson', '3%');
    createMapPopularityChart(games);
    createCommanderFactionChart(games);
    createFactionPerformanceChart(games);
    createGameDurationChart(games);
    
    // Add event listeners for the ranking dropdowns
    document.getElementById('rankingMethod').addEventListener('change', () => {
        const rankingMethod = document.getElementById('rankingMethod').value;
        const minGameRequirement = document.getElementById('minGameRequirement').value;
        createCommanderWinRateChart(games, rankingMethod, minGameRequirement);
    });
    
    document.getElementById('minGameRequirement').addEventListener('change', () => {
        const rankingMethod = document.getElementById('rankingMethod').value;
        const minGameRequirement = document.getElementById('minGameRequirement').value;
        createCommanderWinRateChart(games, rankingMethod, minGameRequirement);
    });
    
    // Add event listeners for maximize buttons
    document.querySelectorAll('.maximize-chart').forEach(button => {
        button.addEventListener('click', (e) => {
            const chartType = e.currentTarget.dataset.chartType;
            const chartTitle = e.currentTarget.dataset.chartTitle;
            showModalChart(games, chartType, chartTitle);
        });
    });
}

// Show full chart in modal
function showModalChart(games, chartType, chartTitle, selectedPlayer = null) {
    // Set modal title
    document.getElementById('chartModalLabel').textContent = chartTitle;
    
    // Destroy existing modal chart if it exists
    const existingChart = Chart.getChart('modalChart');
    if (existingChart) {
        existingChart.destroy();
    }
    
    // Create full chart based on type
    switch (chartType) {
        case 'commanderGames':
            createModalCommanderGamesChart(games);
            break;
        case 'commanderWinRate':
            const rankingMethod = document.getElementById('rankingMethod').value;
            const minGameRequirement = document.getElementById('minGameRequirement').value;
            createModalCommanderWinRateChart(games, rankingMethod, minGameRequirement);
            break;
        case 'mapPopularity':
            createModalMapPopularityChart(games);
            break;
        case 'commanderFaction':
            createModalCommanderFactionChart(games);
            break;
        case 'factionPerformance':
            createModalFactionPerformanceChart(games);
            break;
        case 'gameDuration':
            createModalGameDurationChart(games);
            break;
        // Player chart types
        case 'playerRole':
            if (selectedPlayer) createModalPlayerRoleChart(games, selectedPlayer);
            break;
        case 'playerWinRateByRole':
            if (selectedPlayer) createModalPlayerWinRateByRoleChart(games, selectedPlayer);
            break;
        case 'playerPerformance':
            if (selectedPlayer) createModalPlayerPerformanceChart(games, selectedPlayer);
            break;
        case 'playerTeammates':
            if (selectedPlayer) createModalPlayerTeammatesChart(games, selectedPlayer);
            break;
        case 'playerMap':
            if (selectedPlayer) createModalPlayerMapChart(games, selectedPlayer);
            break;
        case 'playerActivity':
            if (selectedPlayer) createModalPlayerActivityChart(games, selectedPlayer);
            break;
    }
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('chartModal'));
    modal.show();
}

// Modal chart creation functions (horizontal orientation for better mobile viewing)

// Create modal commander games chart (full data)
function createModalCommanderGamesChart(games) {
    const commanderStats = {};
    
    games.forEach(game => {
        commanderStats[game.commander1] = (commanderStats[game.commander1] || 0) + 1;
        commanderStats[game.commander2] = (commanderStats[game.commander2] || 0) + 1;
    });
    
    const sortedCommanders = Object.entries(commanderStats)
        .sort(([,a], [,b]) => b - a); // Show ALL commanders, not just top 10
    
    const ctx = document.getElementById('modalChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedCommanders.map(([name]) => name),
            datasets: [{
                label: 'Games Played',
                data: sortedCommanders.map(([,count]) => count),
                backgroundColor: 'rgba(13, 110, 253, 0.8)',
                borderColor: 'rgba(13, 110, 253, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y', // Horizontal orientation
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: 'white' }
                }
            },
            scales: {
                y: {
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                x: {
                    beginAtZero: true,
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

// Create modal commander win rate chart (full data)
function createModalCommanderWinRateChart(games, rankingMethod = 'wilson', minGameRequirement = '3%') {
    const commanderStats = {};
    
    games.forEach(game => {
        [game.commander1, game.commander2].forEach(commander => {
            if (!commanderStats[commander]) {
                commanderStats[commander] = { wins: 0, total: 0 };
            }
            commanderStats[commander].total++;
            if (game.winner === commander) {
                commanderStats[commander].wins++;
            }
        });
    });
    
    // Calculate minimum games based on requirement
    const totalGames = games.length;
    let minimumGames;
    
    if (minGameRequirement.endsWith('%')) {
        const percentage = parseInt(minGameRequirement.replace('%', ''));
        minimumGames = Math.max(5, Math.ceil(totalGames * (percentage / 100)));
    } else {
        minimumGames = parseInt(minGameRequirement);
    }
    
    // Filter commanders with meaningful participation
    const qualifiedCommanders = Object.entries(commanderStats)
        .filter(([,stats]) => stats.total >= minimumGames);
    
    const totalGamesPlayed = qualifiedCommanders.reduce((sum, [,stats]) => sum + stats.total, 0);
    const maxGames = Math.max(...qualifiedCommanders.map(([,stats]) => stats.total));
    
    // Calculate ranking scores (same logic as regular chart)
    const commandersWithScores = qualifiedCommanders.map(([name, stats]) => {
        const winRate = stats.wins / stats.total;
        const volumePercentage = stats.total / totalGamesPlayed;
        
        const n = stats.total;
        const p = winRate;
        const z = 1.96;
        const wilsonScore = (p + z*z/(2*n) - z * Math.sqrt((p*(1-p) + z*z/(4*n))/n)) / (1 + z*z/n);
        
        const volumeWeightedScore = winRate * volumePercentage * 100;
        
        const priorWins = 10 * 0.5;
        const priorTotal = 10;
        const bayesianScore = (stats.wins + priorWins) / (stats.total + priorTotal);
        
        const volumeBonus = Math.log(stats.total + 1) / Math.log(maxGames + 1);
        const compositeScore = (0.7 * winRate) + (0.3 * volumeBonus);
        
        return {
            name,
            wins: stats.wins,
            total: stats.total,
            winRate: winRate * 100,
            wilsonScore: wilsonScore * 100,
            volumeWeightedScore: volumeWeightedScore,
            bayesianScore: bayesianScore * 100,
            compositeScore: compositeScore * 100,
            volumePercentage: volumePercentage * 100
        };
    });
    
    
    // Sort by selected ranking method (show ALL qualified commanders)
    let sortedCommanders;
    let chartLabel;
    let chartData;
    
    switch (rankingMethod) {
        case 'winRate':
            sortedCommanders = [...commandersWithScores].sort((a, b) => b.winRate - a.winRate);
            chartLabel = 'Win Rate (%)';
            chartData = sortedCommanders.map(c => c.winRate.toFixed(1));
            break;
        case 'volumeWeighted':
            sortedCommanders = [...commandersWithScores].sort((a, b) => b.volumeWeightedScore - a.volumeWeightedScore);
            chartLabel = 'Volume-Weighted Score';
            chartData = sortedCommanders.map(c => c.volumeWeightedScore.toFixed(3));
            break;
        case 'bayesian':
            sortedCommanders = [...commandersWithScores].sort((a, b) => b.bayesianScore - a.bayesianScore);
            chartLabel = 'Bayesian Average (%)';
            chartData = sortedCommanders.map(c => c.bayesianScore.toFixed(1));
            break;
        case 'composite':
            sortedCommanders = [...commandersWithScores].sort((a, b) => b.compositeScore - a.compositeScore);
            chartLabel = 'Composite Score (%)';
            chartData = sortedCommanders.map(c => c.compositeScore.toFixed(1));
            break;
        case 'wilson':
        default:
            sortedCommanders = [...commandersWithScores].sort((a, b) => b.wilsonScore - a.wilsonScore);
            chartLabel = 'Wilson Score (%)';
            chartData = sortedCommanders.map(c => c.wilsonScore.toFixed(1));
            break;
    }
    
    const ctx = document.getElementById('modalChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedCommanders.map(c => c.name),
            datasets: [{
                label: chartLabel,
                data: chartData,
                backgroundColor: 'rgba(25, 135, 84, 0.8)',
                borderColor: 'rgba(25, 135, 84, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y', // Horizontal orientation
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: 'white' }
                },
                tooltip: {
                    callbacks: {
                        afterLabel: function(context) {
                            const commander = sortedCommanders[context.dataIndex];
                            const lines = [
                                `Actual Win Rate: ${commander.winRate.toFixed(1)}%`,
                                `Games Commanded: ${commander.total}`,
                                `Commander Record: ${commander.wins}/${commander.total}`
                            ];
                            
                            if (rankingMethod === 'wilson') {
                                lines.push(`Wilson Score: ${commander.wilsonScore.toFixed(1)}%`);
                            } else if (rankingMethod === 'volumeWeighted') {
                                lines.push(`Volume %: ${commander.volumePercentage.toFixed(1)}%`);
                            } else if (rankingMethod === 'bayesian') {
                                lines.push(`Bayesian Score: ${commander.bayesianScore.toFixed(1)}%`);
                            } else if (rankingMethod === 'composite') {
                                lines.push(`Composite Score: ${commander.compositeScore.toFixed(1)}%`);
                            }
                            
                            return lines;
                        }
                    }
                }
            },
            scales: {
                y: {
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                x: {
                    beginAtZero: true,
                    max: rankingMethod === 'volumeWeighted' ? undefined : 100,
                    ticks: { 
                        color: 'white',
                        callback: function(value) { 
                            if (rankingMethod === 'volumeWeighted') {
                                return value.toFixed(3);
                            }
                            return value + '%'; 
                        }
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

// Create modal map popularity chart (full data)
function createModalMapPopularityChart(games) {
    const mapStats = {};
    
    games.forEach(game => {
        mapStats[game.map] = (mapStats[game.map] || 0) + 1;
    });
    
    const sortedMaps = Object.entries(mapStats)
        .sort(([,a], [,b]) => b - a); // Show ALL maps
    
    const ctx = document.getElementById('modalChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedMaps.map(([name]) => name),
            datasets: [{
                label: 'Games Played',
                data: sortedMaps.map(([,count]) => count),
                backgroundColor: 'rgba(13, 202, 240, 0.8)',
                borderColor: 'rgba(13, 202, 240, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y', // Horizontal orientation
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: 'white' }
                }
            },
            scales: {
                y: {
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                x: {
                    beginAtZero: true,
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

// Create modal commander faction chart (full data)
function createModalCommanderFactionChart(games) {
    const commanderFactionStats = {};
    
    games.forEach(game => {
        [
            { commander: game.commander1, faction: game.faction1 },
            { commander: game.commander2, faction: game.faction2 }
        ].forEach(({ commander, faction }) => {
            if (!commanderFactionStats[commander]) {
                commanderFactionStats[commander] = {};
            }
            commanderFactionStats[commander][faction] = (commanderFactionStats[commander][faction] || 0) + 1;
        });
    });
    
    // Get ALL commanders by total games (not just top 10)
    const allCommanders = Object.entries(commanderFactionStats)
        .map(([commander, factions]) => ({
            commander,
            total: Object.values(factions).reduce((sum, count) => sum + count, 0)
        }))
        .sort((a, b) => b.total - a.total)
        .map(c => c.commander);
    
    const factions = [...new Set(games.flatMap(g => [g.faction1, g.faction2]))];
    const colors = {
        'I.S.D.F': 'rgba(13, 110, 253, 0.8)',
        'Hadean': 'rgba(220, 53, 69, 0.8)',
        'Scion': 'rgba(25, 135, 84, 0.8)'
    };
    
    const datasets = factions.map(faction => ({
        label: faction,
        data: allCommanders.map(commander => commanderFactionStats[commander][faction] || 0),
        backgroundColor: colors[faction] || 'rgba(108, 117, 125, 0.8)'
    }));
    
    const ctx = document.getElementById('modalChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: allCommanders,
            datasets: datasets
        },
        options: {
            indexAxis: 'y', // Horizontal orientation
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: 'white' }
                }
            },
            scales: {
                y: {
                    stacked: true,
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                x: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

// Create modal faction performance chart
function createModalFactionPerformanceChart(games) {
    const factionStats = {};
    
    games.forEach(game => {
        [game.faction1, game.faction2].forEach(faction => {
            if (!factionStats[faction]) {
                factionStats[faction] = { wins: 0, total: 0 };
            }
            factionStats[faction].total++;
            if (game['winning faction'] === faction) {
                factionStats[faction].wins++;
            }
        });
    });
    
    const factionData = Object.entries(factionStats).map(([faction, stats]) => ({
        faction,
        wins: stats.wins,
        losses: stats.total - stats.wins,
        total: stats.total,
        winRate: (stats.wins / stats.total * 100).toFixed(1)
    }));
    
    const ctx = document.getElementById('modalChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: factionData.map(f => f.faction),
            datasets: [{
                label: 'Wins',
                data: factionData.map(f => f.wins),
                backgroundColor: 'rgba(25, 135, 84, 0.8)',
                borderColor: 'rgba(25, 135, 84, 1)',
                borderWidth: 1
            }, {
                label: 'Losses',
                data: factionData.map(f => f.losses),
                backgroundColor: 'rgba(220, 53, 69, 0.8)',
                borderColor: 'rgba(220, 53, 69, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y', // Horizontal orientation
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: 'white' }
                },
                tooltip: {
                    callbacks: {
                        afterLabel: function(context) {
                            const dataIndex = context.dataIndex;
                            const faction = factionData[dataIndex];
                            return `Win Rate: ${faction.winRate}% (${faction.wins}/${faction.total})`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    stacked: true,
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                x: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

// Create modal game duration chart
function createModalGameDurationChart(games) {
    const gamesWithTime = games.filter(g => g.time && g.time.trim() !== '');
    
    if (gamesWithTime.length === 0) {
        const ctx = document.getElementById('modalChart').getContext('2d');
        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No game duration data available', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }
    
    // Convert times to minutes and create buckets
    const durations = gamesWithTime.map(game => {
        const timeParts = game.time.split(':');
        let totalMinutes;
        
        if (timeParts.length === 3) {
            const hours = parseInt(timeParts[0]) || 0;
            const minutes = parseInt(timeParts[1]) || 0;
            const seconds = parseInt(timeParts[2]) || 0;
            totalMinutes = hours * 60 + minutes + seconds / 60;
        } else if (timeParts.length === 2) {
            const minutes = parseInt(timeParts[0]) || 0;
            const seconds = parseInt(timeParts[1]) || 0;
            totalMinutes = minutes + seconds / 60;
        } else {
            totalMinutes = parseInt(timeParts[0]) || 0;
        }
        
        return Math.round(totalMinutes);
    });
    
    const buckets = [0, 15, 30, 45, 60, 90, 120, 180];
    const bucketCounts = new Array(buckets.length - 1).fill(0);
    
    durations.forEach(duration => {
        for (let i = 0; i < buckets.length - 1; i++) {
            if (duration >= buckets[i] && duration < buckets[i + 1]) {
                bucketCounts[i]++;
                break;
            }
        }
    });
    
    const labels = buckets.slice(0, -1).map((bucket, i) => 
        `${bucket}-${buckets[i + 1]} min`
    );
    
    const ctx = document.getElementById('modalChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Number of Games',
                data: bucketCounts,
                backgroundColor: 'rgba(108, 117, 125, 0.8)',
                borderColor: 'rgba(108, 117, 125, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y', // Horizontal orientation
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: 'white' }
                }
            },
            scales: {
                y: {
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                x: {
                    beginAtZero: true,
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

// Load player analysis
function loadPlayerAnalysis() {
    const games = getFilteredGames();
    
    const filterSelectElement = document.getElementById('filterSelect');
    const mainAnalysisElement = document.getElementById('mainAnalysis');
    
    if (!filterSelectElement || !mainAnalysisElement) {
        console.error('Required elements not found for player analysis');
        return;
    }
    
    const selectedPlayer = filterSelectElement.value;
    
    updateSummaryStats(games);
    
    if (!selectedPlayer) {
        mainAnalysisElement.innerHTML = `
            <div class="alert alert-info">
                <h5>Player Analysis</h5>
                <p>Select a player from the filter dropdown to view detailed analysis.</p>
            </div>
        `;
        return;
    }
    
    // Analyze player's role in each game
    const playerGames = games.map(game => {
        let role = 'teammate';
        let team = null;
        let isStraggler = false;
        let teamWon = false;
        
        if (game.commander1 === selectedPlayer) {
            role = 'commander';
            team = 1;
            teamWon = game.winner === selectedPlayer;
        } else if (game.commander2 === selectedPlayer) {
            role = 'commander';
            team = 2;
            teamWon = game.winner === selectedPlayer;
        } else if (game.teamOne && game.teamOne.includes(selectedPlayer)) {
            role = 'teammate';
            team = 1;
            teamWon = game.winner === game.commander1;
        } else if (game.teamTwo && game.teamTwo.includes(selectedPlayer)) {
            role = 'teammate';
            team = 2;
            teamWon = game.winner === game.commander2;
        }
        
        // Check if player was a straggler
        if (game.teamOneStraggler && game.teamOneStraggler.includes(selectedPlayer)) {
            isStraggler = true;
            if (!team) team = 1;
        }
        if (game.teamTwoStraggler && game.teamTwoStraggler.includes(selectedPlayer)) {
            isStraggler = true;
            if (!team) team = 2;
        }
        
        return { ...game, role, team, teamWon, isStraggler };
    });
    
    const commanderGames = playerGames.filter(g => g.role === 'commander');
    const thugGames = playerGames.filter(g => g.role === 'teammate' && !g.isStraggler);
    const stragglerGames = playerGames.filter(g => g.isStraggler);
    
    const commanderWins = commanderGames.filter(g => g.teamWon).length;
    const thugWins = thugGames.filter(g => g.teamWon).length;
    const totalWins = playerGames.filter(g => g.teamWon).length;
    
    // Debug: Let's verify our calculations
    console.log(`Player: ${selectedPlayer}`);
    console.log(`Total games: ${playerGames.length}`);
    console.log(`Commander games: ${commanderGames.length}, wins: ${commanderWins}`);
    console.log(`Thug games: ${thugGames.length}, wins: ${thugWins}`);
    console.log(`Straggler games: ${stragglerGames.length}`);
    console.log(`Total wins: ${totalWins}`);
    console.log(`Win rate: ${((totalWins / playerGames.length) * 100).toFixed(1)}%`);
    
    mainAnalysisElement.innerHTML = `
        <div class="row">
            <div class="col-12 mb-4">
                <div class="card bg-dark border-secondary">
                    <div class="card-header bg-primary text-white">
                        <h4 class="mb-0">${selectedPlayer} - Player Profile</h4>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-2">
                                <div class="text-center">
                                    <h3 class="text-primary">${playerGames.length}</h3>
                                    <p>Total Games</p>
                                </div>
                            </div>
                            <div class="col-md-2">
                                <div class="text-center">
                                    <h3 class="text-success">${commanderGames.length}</h3>
                                    <p>As Commander</p>
                                    <small class="text-muted">${commanderWins} wins</small>
                                </div>
                            </div>
                            <div class="col-md-2">
                                <div class="text-center">
                                    <h3 class="text-info">${thugGames.length}</h3>
                                    <p>As Thug</p>
                                    <small class="text-muted">${thugWins} wins</small>
                                </div>
                            </div>
                            <div class="col-md-2">
                                <div class="text-center">
                                    <h3 class="text-warning">${totalWins}</h3>
                                    <p>Total Wins</p>
                                    <small class="text-muted">${((totalWins / playerGames.length) * 100).toFixed(1)}% rate</small>
                                </div>
                            </div>
                            <div class="col-md-2">
                                <div class="text-center">
                                    <h3 class="text-danger">${stragglerGames.length}</h3>
                                    <p>AFK Games</p>
                                    <small class="text-muted">${((stragglerGames.length / playerGames.length) * 100).toFixed(1)}% rate</small>
                                </div>
                            </div>
                            <div class="col-md-2">
                                <div class="text-center">
                                    <h3 class="text-secondary">${commanderGames.length > 0 ? ((commanderWins / commanderGames.length) * 100).toFixed(1) : 0}%</h3>
                                    <p>Commander Win Rate</p>
                                    <small class="text-muted">${thugGames.length > 0 ? ((thugWins / thugGames.length) * 100).toFixed(1) : 0}% as thug</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Role Distribution -->
            <div class="col-lg-6 mb-4">
                <div class="card bg-dark border-secondary">
                    <div class="card-header bg-success text-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Role Distribution</h5>
                        <button class="btn btn-sm btn-outline-light maximize-chart" data-chart-type="playerRole" data-chart-title="${selectedPlayer} - Role Distribution">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="card-body">
                        <canvas id="playerRoleChart"></canvas>
                    </div>
                </div>
            </div>
            
            <!-- Win Rate by Role -->
            <div class="col-lg-6 mb-4">
                <div class="card bg-dark border-secondary">
                    <div class="card-header bg-info text-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Win Rate by Role</h5>
                        <button class="btn btn-sm btn-outline-light maximize-chart" data-chart-type="playerWinRateByRole" data-chart-title="${selectedPlayer} - Win Rate by Role">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="card-body">
                        <canvas id="playerWinRateByRoleChart"></canvas>
                    </div>
                </div>
            </div>
            
            <!-- Performance Over Time -->
            <div class="col-lg-6 mb-4">
                <div class="card bg-dark border-secondary">
                    <div class="card-header bg-warning text-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Performance Over Time</h5>
                        <button class="btn btn-sm btn-outline-light maximize-chart" data-chart-type="playerPerformance" data-chart-title="${selectedPlayer} - Performance Over Time">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="card-body">
                        <canvas id="playerPerformanceChart"></canvas>
                    </div>
                </div>
            </div>
            
            <!-- Frequent Teammates -->
            <div class="col-lg-6 mb-4">
                <div class="card bg-dark border-secondary">
                    <div class="card-header bg-purple text-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Most Frequent Allies</h5>
                        <button class="btn btn-sm btn-outline-light maximize-chart" data-chart-type="playerTeammates" data-chart-title="${selectedPlayer} - Most Frequent Allies">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="card-body">
                        <canvas id="playerTeammatesChart"></canvas>
                    </div>
                </div>
            </div>
            
            <!-- Map Performance -->
            <div class="col-lg-6 mb-4">
                <div class="card bg-dark border-secondary">
                    <div class="card-header bg-secondary text-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Map Performance</h5>
                        <button class="btn btn-sm btn-outline-light maximize-chart" data-chart-type="playerMap" data-chart-title="${selectedPlayer} - Map Performance">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="card-body">
                        <canvas id="playerMapChart"></canvas>
                    </div>
                </div>
            </div>
            
            <!-- Activity Timeline -->
            <div class="col-lg-6 mb-4">
                <div class="card bg-dark border-secondary">
                    <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Activity Timeline</h5>
                        <button class="btn btn-sm btn-outline-light maximize-chart" data-chart-type="playerActivity" data-chart-title="${selectedPlayer} - Activity Timeline">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="card-body">
                        <canvas id="playerActivityChart"></canvas>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    createPlayerRoleChart(playerGames, selectedPlayer);
    createPlayerWinRateByRoleChart(playerGames, selectedPlayer);
    createPlayerPerformanceChart(playerGames, selectedPlayer);
    createPlayerTeammatesChart(playerGames, selectedPlayer);
    createPlayerMapChart(playerGames, selectedPlayer);
    createPlayerActivityChart(playerGames, selectedPlayer);
    
    // Add event listeners for player chart maximize buttons
    document.querySelectorAll('.maximize-chart').forEach(button => {
        button.addEventListener('click', (e) => {
            const chartType = e.currentTarget.dataset.chartType;
            const chartTitle = e.currentTarget.dataset.chartTitle;
            showModalChart(games, chartType, chartTitle, selectedPlayer);
        });
    });
}

// Create player role distribution chart
function createPlayerRoleChart(games, player) {
    const roleStats = {
        'Commander': games.filter(g => g.role === 'commander').length,
        'Thug': games.filter(g => g.role === 'teammate' && !g.isStraggler).length,
        'AFK/Straggler': games.filter(g => g.isStraggler).length
    };
    
    const ctx = document.getElementById('playerRoleChart').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(roleStats),
            datasets: [{
                data: Object.values(roleStats),
                backgroundColor: [
                    'rgba(25, 135, 84, 0.8)',
                    'rgba(13, 110, 253, 0.8)',
                    'rgba(220, 53, 69, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: { color: 'white' }
                }
            }
        }
    });
}

// Create player win rate by role chart
function createPlayerWinRateByRoleChart(games, player) {
    const commanderGames = games.filter(g => g.role === 'commander');
    const thugGames = games.filter(g => g.role === 'teammate' && !g.isStraggler);
    
    const roleData = [
        {
            role: 'Commander',
            wins: commanderGames.filter(g => g.teamWon).length,
            total: commanderGames.length,
            winRate: commanderGames.length > 0 ? (commanderGames.filter(g => g.teamWon).length / commanderGames.length * 100).toFixed(1) : 0
        },
        {
            role: 'Thug',
            wins: thugGames.filter(g => g.teamWon).length,
            total: thugGames.length,
            winRate: thugGames.length > 0 ? (thugGames.filter(g => g.teamWon).length / thugGames.length * 100).toFixed(1) : 0
        }
    ];
    
    const ctx = document.getElementById('playerWinRateByRoleChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: roleData.map(r => r.role),
            datasets: [{
                label: 'Win Rate (%)',
                data: roleData.map(r => r.winRate),
                backgroundColor: [
                    'rgba(25, 135, 84, 0.8)',
                    'rgba(13, 110, 253, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: { color: 'white' }
                },
                tooltip: {
                    callbacks: {
                        afterLabel: function(context) {
                            const dataIndex = context.dataIndex;
                            const role = roleData[dataIndex];
                            return `${role.wins}/${role.total} games won`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { 
                        color: 'white',
                        callback: function(value) { return value + '%'; }
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                x: {
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

// Create player performance over time chart
function createPlayerPerformanceChart(games, player) {
    const monthlyStats = {};
    
    games.forEach(game => {
        const monthKey = `${game.year}-${game.month}`;
        if (!monthlyStats[monthKey]) {
            monthlyStats[monthKey] = { wins: 0, total: 0 };
        }
        monthlyStats[monthKey].total++;
        if (game.teamWon) {
            monthlyStats[monthKey].wins++;
        }
    });
    
    const sortedMonths = Object.keys(monthlyStats).sort();
    const winRates = sortedMonths.map(month => 
        (monthlyStats[month].wins / monthlyStats[month].total * 100).toFixed(1)
    );
    const gameCounts = sortedMonths.map(month => monthlyStats[month].total);
    
    const ctx = document.getElementById('playerPerformanceChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedMonths,
            datasets: [{
                label: 'Win Rate (%)',
                data: winRates,
                borderColor: 'rgba(25, 135, 84, 1)',
                backgroundColor: 'rgba(25, 135, 84, 0.1)',
                yAxisID: 'y'
            }, {
                label: 'Games Played',
                data: gameCounts,
                borderColor: 'rgba(13, 110, 253, 1)',
                backgroundColor: 'rgba(13, 110, 253, 0.1)',
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: { color: 'white' }
                }
            },
            scales: {
                x: {
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    max: 100,
                    ticks: { 
                        color: 'white',
                        callback: function(value) { return value + '%'; }
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    ticks: { color: 'white' },
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });
}

// Create player teammates chart
function createPlayerTeammatesChart(games, player) {
    const teammateStats = {};
    
    games.forEach(game => {
        let teammates = [];
        
        if (game.commander1 === player && game.teamOne) {
            teammates = [...game.teamOne];
        } else if (game.commander2 === player && game.teamTwo) {
            teammates = [...game.teamTwo];
        } else if (game.teamOne && game.teamOne.includes(player)) {
            teammates = [game.commander1, ...game.teamOne.filter(p => p !== player)];
        } else if (game.teamTwo && game.teamTwo.includes(player)) {
            teammates = [game.commander2, ...game.teamTwo.filter(p => p !== player)];
        }
        
        teammates.forEach(teammate => {
            teammateStats[teammate] = (teammateStats[teammate] || 0) + 1;
        });
    });
    
    const topTeammates = Object.entries(teammateStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 8);
    
    const ctx = document.getElementById('playerTeammatesChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topTeammates.map(([name]) => name),
            datasets: [{
                label: 'Games Together',
                data: topTeammates.map(([,count]) => count),
                backgroundColor: 'rgba(111, 66, 193, 0.8)',
                borderColor: 'rgba(111, 66, 193, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: {
                legend: {
                    labels: { color: 'white' }
                }
            },
            scales: {
                y: {
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                x: {
                    beginAtZero: true,
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

// Create player map performance chart
function createPlayerMapChart(games, player) {
    const mapStats = {};
    
    games.forEach(game => {
        if (!mapStats[game.map]) {
            mapStats[game.map] = { wins: 0, total: 0 };
        }
        mapStats[game.map].total++;
        if (game.teamWon) {
            mapStats[game.map].wins++;
        }
    });
    
    const mapData = Object.entries(mapStats)
        .filter(([,stats]) => stats.total >= 2)
        .map(([map, stats]) => ({
            map,
            winRate: (stats.wins / stats.total * 100).toFixed(1),
            total: stats.total
        }))
        .sort((a, b) => b.winRate - a.winRate)
        .slice(0, 10);
    
    const ctx = document.getElementById('playerMapChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: mapData.map(m => m.map),
            datasets: [{
                label: 'Win Rate (%)',
                data: mapData.map(m => m.winRate),
                backgroundColor: 'rgba(108, 117, 125, 0.8)',
                borderColor: 'rgba(108, 117, 125, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: { color: 'white' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { 
                        color: 'white',
                        callback: function(value) { return value + '%'; }
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                x: {
                    ticks: { 
                        color: 'white',
                        maxRotation: 45
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

// Create player activity timeline chart
function createPlayerActivityChart(games, player) {
    const monthlyActivity = {};
    
    games.forEach(game => {
        const monthKey = `${game.year}-${game.month}`;
        if (!monthlyActivity[monthKey]) {
            monthlyActivity[monthKey] = { commander: 0, teammate: 0, straggler: 0 };
        }
        
        if (game.role === 'commander') {
            monthlyActivity[monthKey].commander++;
        } else if (game.isStraggler) {
            monthlyActivity[monthKey].straggler++;
        } else {
            monthlyActivity[monthKey].teammate++;
        }
    });
    
    const sortedMonths = Object.keys(monthlyActivity).sort();
    
    const ctx = document.getElementById('playerActivityChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedMonths,
            datasets: [{
                label: 'Commander',
                data: sortedMonths.map(month => monthlyActivity[month].commander),
                backgroundColor: 'rgba(25, 135, 84, 0.8)'
            }, {
                label: 'Thug',
                data: sortedMonths.map(month => monthlyActivity[month].teammate),
                backgroundColor: 'rgba(13, 110, 253, 0.8)'
            }, {
                label: 'AFK',
                data: sortedMonths.map(month => monthlyActivity[month].straggler),
                backgroundColor: 'rgba(220, 53, 69, 0.8)'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: { color: 'white' }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

// Load map analysis
function loadMapAnalysis() {
    const games = getFilteredGames();
    updateSummaryStats(games);
    
    document.getElementById('mainAnalysis').innerHTML = `
        <div class="alert alert-info">
            <h5>Map Analysis</h5>
            <p>Map-specific analysis coming soon! This will include map win rates by faction, commander performance on specific maps, and more.</p>
        </div>
    `;
}

// Load faction analysis
function loadFactionAnalysis() {
    const games = getFilteredGames();
    updateSummaryStats(games);
    
    document.getElementById('mainAnalysis').innerHTML = `
        <div class="alert alert-info">
            <h5>Faction Analysis</h5>
            <p>Faction-specific analysis coming soon! This will include faction matchup win rates, faction performance over time, and more.</p>
        </div>
    `;
}

// Load the data when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check for required dependencies
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded');
        const mainContent = document.querySelector('main');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="alert alert-danger">
                    <h4>Missing Dependencies</h4>
                    <p>Chart.js library is not loaded. Please ensure all required scripts are included.</p>
                    <p>Make sure Chart.js is loaded before the stats.js script.</p>
                </div>
            `;
        }
        return;
    }
    
    if (typeof bootstrap === 'undefined') {
        console.warn('Bootstrap JavaScript is not loaded - some features may not work properly');
    }
    
    // Start loading the game data
    loadGameData();
});

// Create commander games chart
function createCommanderGamesChart(games) {
    const ctx = document.getElementById('commanderGamesChart');
    if (!ctx) {
        console.error('commanderGamesChart canvas not found');
        return;
    }
    
    if (typeof Chart === 'undefined') {
        console.error('Chart.js not loaded');
        return;
    }
    
    const commanderStats = {};
    
    games.forEach(game => {
        commanderStats[game.commander1] = (commanderStats[game.commander1] || 0) + 1;
        commanderStats[game.commander2] = (commanderStats[game.commander2] || 0) + 1;
    });
    
    const sortedCommanders = Object.entries(commanderStats)
        .sort(([,a], [,b]) => b - a);
    
    new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: sortedCommanders.map(([name]) => name),
            datasets: [{
                label: 'Games Played',
                data: sortedCommanders.map(([,count]) => count),
                backgroundColor: 'rgba(13, 110, 253, 0.8)',
                borderColor: 'rgba(13, 110, 253, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: { color: 'white' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                x: {
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

// Create commander win rate chart with multiple ranking algorithms
function createCommanderWinRateChart(games, rankingMethod = 'wilson', minGameRequirement = '3%') {
    const commanderStats = {};
    
    games.forEach(game => {
        [game.commander1, game.commander2].forEach(commander => {
            if (!commanderStats[commander]) {
                commanderStats[commander] = { wins: 0, total: 0 };
            }
            commanderStats[commander].total++;
            if (game.winner === commander) {
                commanderStats[commander].wins++;
            }
        });
    });
    
    // Calculate minimum games based on requirement
    const totalGames = games.length;
    let minimumGames;
    
    if (minGameRequirement.endsWith('%')) {
        const percentage = parseInt(minGameRequirement.replace('%', ''));
        minimumGames = Math.max(5, Math.ceil(totalGames * (percentage / 100)));
    } else {
        minimumGames = parseInt(minGameRequirement);
    }
    
    // Filter commanders with meaningful participation
    const qualifiedCommanders = Object.entries(commanderStats)
        .filter(([,stats]) => stats.total >= minimumGames);
    
    console.log(`\nRanking Method: ${rankingMethod.toUpperCase()}`);
    console.log(`Minimum games requirement: ${minGameRequirement} = ${minimumGames} games`);
    console.log(`Qualified commanders: ${qualifiedCommanders.length}`);
    
    const totalGamesPlayed = qualifiedCommanders.reduce((sum, [,stats]) => sum + stats.total, 0);
    const maxGames = Math.max(...qualifiedCommanders.map(([,stats]) => stats.total));
    
    // Calculate different ranking scores
    const commandersWithScores = qualifiedCommanders.map(([name, stats]) => {
        const winRate = stats.wins / stats.total;
        const volumePercentage = stats.total / totalGamesPlayed;
        
        // 1. Wilson Score Confidence Interval (95% confidence, lower bound)
        const n = stats.total;
        const p = winRate;
        const z = 1.96; // 95% confidence
        const wilsonScore = (p + z*z/(2*n) - z * Math.sqrt((p*(1-p) + z*z/(4*n))/n)) / (1 + z*z/n);
        
        // 2. Volume-Weighted Score (win rate * volume percentage * 100)
        const volumeWeightedScore = winRate * volumePercentage * 100;
        
        // 3. Bayesian Average (assume prior of 50% win rate with weight of 10 games)
        const priorWins = 10 * 0.5; // Assume 5 wins out of 10 games as prior
        const priorTotal = 10;
        const bayesianScore = (stats.wins + priorWins) / (stats.total + priorTotal);
        
        // 4. Composite Score (70% win rate + 30% volume bonus)
        const volumeBonus = Math.log(stats.total + 1) / Math.log(maxGames + 1); // Logarithmic scaling
        const compositeScore = (0.7 * winRate) + (0.3 * volumeBonus);
        
        return {
            name,
            wins: stats.wins,
            total: stats.total,
            winRate: winRate * 100,
            wilsonScore: wilsonScore * 100,
            volumeWeightedScore: volumeWeightedScore,
            bayesianScore: bayesianScore * 100,
            compositeScore: compositeScore * 100,
            volumePercentage: volumePercentage * 100
        };
    });
    
    // Sort by selected ranking method
    let sortedCommanders;
    let chartLabel;
    let chartData;
    let tooltipSuffix;
    
    switch (rankingMethod) {
        case 'winRate':
            sortedCommanders = [...commandersWithScores]
                .sort((a, b) => b.winRate - a.winRate)
                .slice(0, 10);
            chartLabel = 'Win Rate (%)';
            chartData = sortedCommanders.map(c => c.winRate.toFixed(1));
            tooltipSuffix = '% win rate';
            break;
            
        case 'volumeWeighted':
            sortedCommanders = [...commandersWithScores]
                .sort((a, b) => b.volumeWeightedScore - a.volumeWeightedScore)
                .slice(0, 10);
            chartLabel = 'Volume-Weighted Score';
            chartData = sortedCommanders.map(c => c.volumeWeightedScore.toFixed(3));
            tooltipSuffix = ' VW score';
            break;
            
        case 'bayesian':
            sortedCommanders = [...commandersWithScores]
                .sort((a, b) => b.bayesianScore - a.bayesianScore)
                .slice(0, 10);
            chartLabel = 'Bayesian Average (%)';
            chartData = sortedCommanders.map(c => c.bayesianScore.toFixed(1));
            tooltipSuffix = '% Bayesian';
            break;
            
        case 'composite':
            sortedCommanders = [...commandersWithScores]
                .sort((a, b) => b.compositeScore - a.compositeScore)
                .slice(0, 10);
            chartLabel = 'Composite Score (%)';
            chartData = sortedCommanders.map(c => c.compositeScore.toFixed(1));
            tooltipSuffix = '% composite';
            break;
            
        case 'wilson':
        default:
            sortedCommanders = [...commandersWithScores]
                .sort((a, b) => b.wilsonScore - a.wilsonScore)
                .slice(0, 10);
            chartLabel = 'Wilson Score (%)';
            chartData = sortedCommanders.map(c => c.wilsonScore.toFixed(1));
            tooltipSuffix = '% Wilson';
            break;
    }
    
    console.log(`Top 10 commanders by ${rankingMethod}:`);
    sortedCommanders.forEach((commander, index) => {
        console.log(`${index + 1}. ${commander.name}: ${chartData[index]}${tooltipSuffix} (${commander.wins}/${commander.total} commanded)`);
    });
    
    // Destroy existing chart if it exists
    const existingChart = Chart.getChart('commanderWinRateChart');
    if (existingChart) {
        existingChart.destroy();
    }
    
    const ctx = document.getElementById('commanderWinRateChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedCommanders.map(c => c.name),
            datasets: [{
                label: chartLabel,
                data: chartData,
                backgroundColor: 'rgba(25, 135, 84, 0.8)',
                borderColor: 'rgba(25, 135, 84, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: { color: 'white' }
                },
                tooltip: {
                    callbacks: {
                        afterLabel: function(context) {
                            const commander = sortedCommanders[context.dataIndex];
                            const lines = [
                                `Actual Win Rate: ${commander.winRate.toFixed(1)}%`,
                                `Games Commanded: ${commander.total}`,
                                `Commander Record: ${commander.wins}/${commander.total}`
                            ];
                            
                            // Add additional info based on ranking method
                            if (rankingMethod === 'wilson') {
                                lines.push(`Wilson Score: ${commander.wilsonScore.toFixed(1)}%`);
                            } else if (rankingMethod === 'volumeWeighted') {
                                lines.push(`Volume %: ${commander.volumePercentage.toFixed(1)}%`);
                            } else if (rankingMethod === 'bayesian') {
                                lines.push(`Bayesian Score: ${commander.bayesianScore.toFixed(1)}%`);
                            } else if (rankingMethod === 'composite') {
                                lines.push(`Composite Score: ${commander.compositeScore.toFixed(1)}%`);
                            }
                            
                            return lines;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: rankingMethod === 'volumeWeighted' ? undefined : 100,
                    ticks: { 
                        color: 'white',
                        callback: function(value) { 
                            if (rankingMethod === 'volumeWeighted') {
                                return value.toFixed(3);
                            }
                            return value + '%'; 
                        }
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                x: {
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

// Create map popularity chart
function createMapPopularityChart(games) {
    const mapStats = {};
    
    games.forEach(game => {
        mapStats[game.map] = (mapStats[game.map] || 0) + 1;
    });
    
    const sortedMaps = Object.entries(mapStats)
        .sort(([,a], [,b]) => b - a);
    
    const ctx = document.getElementById('mapPopularityChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedMaps.map(([name]) => name),
            datasets: [{
                label: 'Games Played',
                data: sortedMaps.map(([,count]) => count),
                backgroundColor: 'rgba(13, 202, 240, 0.8)',
                borderColor: 'rgba(13, 202, 240, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: {
                legend: {
                    labels: { color: 'white' }
                }
            },
            scales: {
                y: {
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                x: {
                    beginAtZero: true,
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

// Create commander faction chart (stacked bar)
function createCommanderFactionChart(games) {
    const commanderFactionStats = {};
    
    games.forEach(game => {
        [
            { commander: game.commander1, faction: game.faction1 },
            { commander: game.commander2, faction: game.faction2 }
        ].forEach(({ commander, faction }) => {
            if (!commanderFactionStats[commander]) {
                commanderFactionStats[commander] = {};
            }
            commanderFactionStats[commander][faction] = (commanderFactionStats[commander][faction] || 0) + 1;
        });
    });
    
    // Get top commanders by total games
    const topCommanders = Object.entries(commanderFactionStats)
        .map(([commander, factions]) => ({
            commander,
            total: Object.values(factions).reduce((sum, count) => sum + count, 0)
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10)
        .map(c => c.commander);
    
    const factions = [...new Set(games.flatMap(g => [g.faction1, g.faction2]))];
    const colors = {
        'I.S.D.F': 'rgba(13, 110, 253, 0.8)',
        'Hadean': 'rgba(220, 53, 69, 0.8)',
        'Scion': 'rgba(25, 135, 84, 0.8)'
    };
    
    const datasets = factions.map(faction => ({
        label: faction,
        data: topCommanders.map(commander => commanderFactionStats[commander][faction] || 0),
        backgroundColor: colors[faction] || 'rgba(108, 117, 125, 0.8)'
    }));
    
    const ctx = document.getElementById('commanderFactionChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topCommanders,
            datasets: datasets
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: { color: 'white' }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

// Create faction performance chart
function createFactionPerformanceChart(games) {
    const factionStats = {};
    
    games.forEach(game => {
        [game.faction1, game.faction2].forEach(faction => {
            if (!factionStats[faction]) {
                factionStats[faction] = { wins: 0, total: 0 };
            }
            factionStats[faction].total++;
            if (game['winning faction'] === faction) {
                factionStats[faction].wins++;
            }
        });
    });
    
    const factionData = Object.entries(factionStats).map(([faction, stats]) => ({
        faction,
        wins: stats.wins,
        losses: stats.total - stats.wins,
        total: stats.total,
        winRate: (stats.wins / stats.total * 100).toFixed(1)
    }));
    
    const ctx = document.getElementById('factionPerformanceChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: factionData.map(f => f.faction),
            datasets: [{
                label: 'Wins',
                data: factionData.map(f => f.wins),
                backgroundColor: 'rgba(25, 135, 84, 0.8)',
                borderColor: 'rgba(25, 135, 84, 1)',
                borderWidth: 1
            }, {
                label: 'Losses',
                data: factionData.map(f => f.losses),
                backgroundColor: 'rgba(220, 53, 69, 0.8)',
                borderColor: 'rgba(220, 53, 69, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: { color: 'white' }
                },
                tooltip: {
                    callbacks: {
                        afterLabel: function(context) {
                            const dataIndex = context.dataIndex;
                            const faction = factionData[dataIndex];
                            return `Win Rate: ${faction.winRate}% (${faction.wins}/${faction.total})`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

// Create game duration chart
function createGameDurationChart(games) {
    // Debug: Let's see what time data we have
    console.log('Total games:', games.length);
    console.log('Games with time property:', games.filter(g => g.time).length);
    console.log('Games with non-empty time:', games.filter(g => g.time && g.time.trim() !== '').length);
    
    // Sample some games to see their time values
    const sampleGames = games.slice(0, 10);
    console.log('Sample games time data:', sampleGames.map(g => ({ 
        date: g.date, 
        map: g.map, 
        time: g.time, 
        hasTime: !!g.time,
        timeType: typeof g.time
    })));
    
    const gamesWithTime = games.filter(g => g.time && g.time.trim() !== '');
    
    console.log(`Filtered games with valid time data: ${gamesWithTime.length} out of ${games.length}`);
    
    // Debug: Check distribution by year
    const gamesByYear = {};
    const gamesWithTimeByYear = {};
    games.forEach(game => {
        gamesByYear[game.year] = (gamesByYear[game.year] || 0) + 1;
        if (game.time && game.time.trim() !== '') {
            gamesWithTimeByYear[game.year] = (gamesWithTimeByYear[game.year] || 0) + 1;
        }
    });
    console.log('Games by year:', gamesByYear);
    console.log('Games with time by year:', gamesWithTimeByYear);
    
    if (gamesWithTime.length === 0) {
        const ctx = document.getElementById('gameDurationChart').getContext('2d');
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No game duration data available', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }
    
    // Convert times to minutes and create buckets
    const durations = gamesWithTime.map(game => {
        const timeParts = game.time.split(':');
        let totalMinutes;
        
        if (timeParts.length === 3) {
            // Format: HH:MM:SS
            const hours = parseInt(timeParts[0]) || 0;
            const minutes = parseInt(timeParts[1]) || 0;
            const seconds = parseInt(timeParts[2]) || 0;
            totalMinutes = hours * 60 + minutes + seconds / 60;
        } else if (timeParts.length === 2) {
            // Based on the sample data, this appears to be MM:SS format
            const minutes = parseInt(timeParts[0]) || 0;
            const seconds = parseInt(timeParts[1]) || 0;
            totalMinutes = minutes + seconds / 60;
        } else {
            totalMinutes = parseInt(timeParts[0]) || 0;
        }
        
        return Math.round(totalMinutes);
    });
    
    // Debug: log some sample durations
    console.log('Sample game times:', gamesWithTime.slice(0, 5).map(g => g.time));
    console.log('Sample parsed durations (minutes):', durations.slice(0, 5));
    
    const buckets = [0, 15, 30, 45, 60, 90, 120, 180];
    const bucketCounts = new Array(buckets.length - 1).fill(0);
    
    durations.forEach(duration => {
        for (let i = 0; i < buckets.length - 1; i++) {
            if (duration >= buckets[i] && duration < buckets[i + 1]) {
                bucketCounts[i]++;
                break;
            }
        }
    });
    
    const labels = buckets.slice(0, -1).map((bucket, i) => 
        `${bucket}-${buckets[i + 1]} min`
    );
    
    const ctx = document.getElementById('gameDurationChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Number of Games',
                data: bucketCounts,
                backgroundColor: 'rgba(108, 117, 125, 0.8)',
                borderColor: 'rgba(108, 117, 125, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: { color: 'white' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                x: {
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

// Modal player chart creation functions

// Create modal player role chart
function createModalPlayerRoleChart(games, selectedPlayer) {
    const playerGames = games.map(game => {
        let role = 'teammate';
        let team = null;
        let isStraggler = false;
        let teamWon = false;
        
        if (game.commander1 === selectedPlayer) {
            role = 'commander';
            team = 1;
            teamWon = game.winner === selectedPlayer;
        } else if (game.commander2 === selectedPlayer) {
            role = 'commander';
            team = 2;
            teamWon = game.winner === selectedPlayer;
        } else if (game.teamOne && game.teamOne.includes(selectedPlayer)) {
            role = 'teammate';
            team = 1;
            teamWon = game.winner === game.commander1;
        } else if (game.teamTwo && game.teamTwo.includes(selectedPlayer)) {
            role = 'teammate';
            team = 2;
            teamWon = game.winner === game.commander2;
        }
        
        if (game.teamOneStraggler && game.teamOneStraggler.includes(selectedPlayer)) {
            isStraggler = true;
            if (!team) team = 1;
        }
        if (game.teamTwoStraggler && game.teamTwoStraggler.includes(selectedPlayer)) {
            isStraggler = true;
            if (!team) team = 2;
        }
        
        return { ...game, role, team, teamWon, isStraggler };
    });
    
    const roleStats = {
        'Commander': playerGames.filter(g => g.role === 'commander').length,
        'Thug': playerGames.filter(g => g.role === 'teammate' && !g.isStraggler).length,
        'AFK/Straggler': playerGames.filter(g => g.isStraggler).length
    };
    
    const ctx = document.getElementById('modalChart').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(roleStats),
            datasets: [{
                data: Object.values(roleStats),
                backgroundColor: [
                    'rgba(25, 135, 84, 0.8)',
                    'rgba(13, 110, 253, 0.8)',
                    'rgba(220, 53, 69, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: 'white' }
                }
            }
        }
    });
}

// Create modal player win rate by role chart
function createModalPlayerWinRateByRoleChart(games, selectedPlayer) {
    const playerGames = games.map(game => {
        let role = 'teammate';
        let team = null;
        let isStraggler = false;
        let teamWon = false;
        
        if (game.commander1 === selectedPlayer) {
            role = 'commander';
            team = 1;
            teamWon = game.winner === selectedPlayer;
        } else if (game.commander2 === selectedPlayer) {
            role = 'commander';
            team = 2;
            teamWon = game.winner === selectedPlayer;
        } else if (game.teamOne && game.teamOne.includes(selectedPlayer)) {
            role = 'teammate';
            team = 1;
            teamWon = game.winner === game.commander1;
        } else if (game.teamTwo && game.teamTwo.includes(selectedPlayer)) {
            role = 'teammate';
            team = 2;
            teamWon = game.winner === game.commander2;
        }
        
        if (game.teamOneStraggler && game.teamOneStraggler.includes(selectedPlayer)) {
            isStraggler = true;
            if (!team) team = 1;
        }
        if (game.teamTwoStraggler && game.teamTwoStraggler.includes(selectedPlayer)) {
            isStraggler = true;
            if (!team) team = 2;
        }
        
        return { ...game, role, team, teamWon, isStraggler };
    });
    
    const commanderGames = playerGames.filter(g => g.role === 'commander');
    const thugGames = playerGames.filter(g => g.role === 'teammate' && !g.isStraggler);
    
    const roleData = [
        {
            role: 'Commander',
            wins: commanderGames.filter(g => g.teamWon).length,
            total: commanderGames.length,
            winRate: commanderGames.length > 0 ? (commanderGames.filter(g => g.teamWon).length / commanderGames.length * 100).toFixed(1) : 0
        },
        {
            role: 'Thug',
            wins: thugGames.filter(g => g.teamWon).length,
            total: thugGames.length,
            winRate: thugGames.length > 0 ? (thugGames.filter(g => g.teamWon).length / thugGames.length * 100).toFixed(1) : 0
        }
    ];
    
    const ctx = document.getElementById('modalChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: roleData.map(r => r.role),
            datasets: [{
                label: 'Win Rate (%)',
                data: roleData.map(r => r.winRate),
                backgroundColor: [
                    'rgba(25, 135, 84, 0.8)',
                    'rgba(13, 110, 253, 0.8)'
                ]
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: 'white' }
                },
                tooltip: {
                    callbacks: {
                        afterLabel: function(context) {
                            const dataIndex = context.dataIndex;
                            const role = roleData[dataIndex];
                            return `${role.wins}/${role.total} games won`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                x: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { 
                        color: 'white',
                        callback: function(value) { return value + '%'; }
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

// Create modal player performance chart
function createModalPlayerPerformanceChart(games, selectedPlayer) {
    const playerGames = games.map(game => {
        let role = 'teammate';
        let team = null;
        let isStraggler = false;
        let teamWon = false;
        
        if (game.commander1 === selectedPlayer) {
            role = 'commander';
            team = 1;
            teamWon = game.winner === selectedPlayer;
        } else if (game.commander2 === selectedPlayer) {
            role = 'commander';
            team = 2;
            teamWon = game.winner === selectedPlayer;
        } else if (game.teamOne && game.teamOne.includes(selectedPlayer)) {
            role = 'teammate';
            team = 1;
            teamWon = game.winner === game.commander1;
        } else if (game.teamTwo && game.teamTwo.includes(selectedPlayer)) {
            role = 'teammate';
            team = 2;
            teamWon = game.winner === game.commander2;
        }
        
        if (game.teamOneStraggler && game.teamOneStraggler.includes(selectedPlayer)) {
            isStraggler = true;
            if (!team) team = 1;
        }
        if (game.teamTwoStraggler && game.teamTwoStraggler.includes(selectedPlayer)) {
            isStraggler = true;
            if (!team) team = 2;
        }
        
        return { ...game, role, team, teamWon, isStraggler };
    });
    
    const monthlyStats = {};
    
    playerGames.forEach(game => {
        const monthKey = `${game.year}-${game.month}`;
        if (!monthlyStats[monthKey]) {
            monthlyStats[monthKey] = { wins: 0, total: 0 };
        }
        monthlyStats[monthKey].total++;
        if (game.teamWon) {
            monthlyStats[monthKey].wins++;
        }
    });
    
    const sortedMonths = Object.keys(monthlyStats).sort();
    const winRates = sortedMonths.map(month => 
        (monthlyStats[month].wins / monthlyStats[month].total * 100).toFixed(1)
    );
    const gameCounts = sortedMonths.map(month => monthlyStats[month].total);
    
    const ctx = document.getElementById('modalChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedMonths,
            datasets: [{
                label: 'Win Rate (%)',
                data: winRates,
                borderColor: 'rgba(25, 135, 84, 1)',
                backgroundColor: 'rgba(25, 135, 84, 0.1)',
                yAxisID: 'y'
            }, {
                label: 'Games Played',
                data: gameCounts,
                borderColor: 'rgba(13, 110, 253, 1)',
                backgroundColor: 'rgba(13, 110, 253, 0.1)',
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: 'white' }
                }
            },
            scales: {
                x: {
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    max: 100,
                    ticks: { 
                        color: 'white',
                        callback: function(value) { return value + '%'; }
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    ticks: { color: 'white' },
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });
}

// Create modal player teammates chart
function createModalPlayerTeammatesChart(games, selectedPlayer) {
    const teammateStats = {};
    
    games.forEach(game => {
        let teammates = [];
        
        if (game.commander1 === selectedPlayer && game.teamOne) {
            teammates = [...game.teamOne];
        } else if (game.commander2 === selectedPlayer && game.teamTwo) {
            teammates = [...game.teamTwo];
        } else if (game.teamOne && game.teamOne.includes(selectedPlayer)) {
            teammates = [game.commander1, ...game.teamOne.filter(p => p !== selectedPlayer)];
        } else if (game.teamTwo && game.teamTwo.includes(selectedPlayer)) {
            teammates = [game.commander2, ...game.teamTwo.filter(p => p !== selectedPlayer)];
        }
        
        teammates.forEach(teammate => {
            teammateStats[teammate] = (teammateStats[teammate] || 0) + 1;
        });
    });
    
    const sortedTeammates = Object.entries(teammateStats)
        .sort(([,a], [,b]) => b - a);
    
    const ctx = document.getElementById('modalChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedTeammates.map(([name]) => name),
            datasets: [{
                label: 'Games Together',
                data: sortedTeammates.map(([,count]) => count),
                backgroundColor: 'rgba(111, 66, 193, 0.8)',
                borderColor: 'rgba(111, 66, 193, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: 'white' }
                }
            },
            scales: {
                y: {
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                x: {
                    beginAtZero: true,
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

// Create modal player map chart
function createModalPlayerMapChart(games, selectedPlayer) {
    const playerGames = games.map(game => {
        let role = 'teammate';
        let team = null;
        let isStraggler = false;
        let teamWon = false;
        
        if (game.commander1 === selectedPlayer) {
            role = 'commander';
            team = 1;
            teamWon = game.winner === selectedPlayer;
        } else if (game.commander2 === selectedPlayer) {
            role = 'commander';
            team = 2;
            teamWon = game.winner === selectedPlayer;
        } else if (game.teamOne && game.teamOne.includes(selectedPlayer)) {
            role = 'teammate';
            team = 1;
            teamWon = game.winner === game.commander1;
        } else if (game.teamTwo && game.teamTwo.includes(selectedPlayer)) {
            role = 'teammate';
            team = 2;
            teamWon = game.winner === game.commander2;
        }
        
        if (game.teamOneStraggler && game.teamOneStraggler.includes(selectedPlayer)) {
            isStraggler = true;
            if (!team) team = 1;
        }
        if (game.teamTwoStraggler && game.teamTwoStraggler.includes(selectedPlayer)) {
            isStraggler = true;
            if (!team) team = 2;
        }
        
        return { ...game, role, team, teamWon, isStraggler };
    });
    
    const mapStats = {};
    
    playerGames.forEach(game => {
        if (!mapStats[game.map]) {
            mapStats[game.map] = { wins: 0, total: 0 };
        }
        mapStats[game.map].total++;
        if (game.teamWon) {
            mapStats[game.map].wins++;
        }
    });
    
    const mapData = Object.entries(mapStats)
        .filter(([,stats]) => stats.total >= 1)
        .map(([map, stats]) => ({
            map,
            winRate: (stats.wins / stats.total * 100).toFixed(1),
            total: stats.total
        }))
        .sort((a, b) => b.winRate - a.winRate);
    
    const ctx = document.getElementById('modalChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: mapData.map(m => m.map),
            datasets: [{
                label: 'Win Rate (%)',
                data: mapData.map(m => m.winRate),
                backgroundColor: 'rgba(108, 117, 125, 0.8)',
                borderColor: 'rgba(108, 117, 125, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: 'white' }
                }
            },
            scales: {
                y: {
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                x: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { 
                        color: 'white',
                        callback: function(value) { return value + '%'; }
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

// Create modal player activity chart
function createModalPlayerActivityChart(games, selectedPlayer) {
    const playerGames = games.map(game => {
        let role = 'teammate';
        let team = null;
        let isStraggler = false;
        let teamWon = false;
        
        if (game.commander1 === selectedPlayer) {
            role = 'commander';
            team = 1;
            teamWon = game.winner === selectedPlayer;
        } else if (game.commander2 === selectedPlayer) {
            role = 'commander';
            team = 2;
            teamWon = game.winner === selectedPlayer;
        } else if (game.teamOne && game.teamOne.includes(selectedPlayer)) {
            role = 'teammate';
            team = 1;
            teamWon = game.winner === game.commander1;
        } else if (game.teamTwo && game.teamTwo.includes(selectedPlayer)) {
            role = 'teammate';
            team = 2;
            teamWon = game.winner === game.commander2;
        }
        
        if (game.teamOneStraggler && game.teamOneStraggler.includes(selectedPlayer)) {
            isStraggler = true;
            if (!team) team = 1;
        }
        if (game.teamTwoStraggler && game.teamTwoStraggler.includes(selectedPlayer)) {
            isStraggler = true;
            if (!team) team = 2;
        }
        
        return { ...game, role, team, teamWon, isStraggler };
    });
    
    const monthlyActivity = {};
    
    playerGames.forEach(game => {
        const monthKey = `${game.year}-${game.month}`;
        if (!monthlyActivity[monthKey]) {
            monthlyActivity[monthKey] = { commander: 0, teammate: 0, straggler: 0 };
        }
        
        if (game.role === 'commander') {
            monthlyActivity[monthKey].commander++;
        } else if (game.isStraggler) {
            monthlyActivity[monthKey].straggler++;
        } else {
            monthlyActivity[monthKey].teammate++;
        }
    });
    
    const sortedMonths = Object.keys(monthlyActivity).sort();
    
    const ctx = document.getElementById('modalChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedMonths,
            datasets: [{
                label: 'Commander',
                data: sortedMonths.map(month => monthlyActivity[month].commander),
                backgroundColor: 'rgba(25, 135, 84, 0.8)'
            }, {
                label: 'Thug',
                data: sortedMonths.map(month => monthlyActivity[month].teammate),
                backgroundColor: 'rgba(13, 110, 253, 0.8)'
            }, {
                label: 'AFK',
                data: sortedMonths.map(month => monthlyActivity[month].straggler),
                backgroundColor: 'rgba(220, 53, 69, 0.8)'
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: 'white' }
                }
            },
            scales: {
                y: {
                    stacked: true,
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                x: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}
