// Global variables
let gameData = null;
let allGames = [];

// Enhanced Chart.js defaults for gaming theme
Chart.defaults.font.family = "'Orbitron', 'SUSE', sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.color = '#e8e8ff';

// Modern Gaming Color Palette
const gamingColors = {
    primary: '#00d4ff',
    secondary: '#ff6b35', 
    accent: '#7b68ee',
    success: '#00ff88',
    warning: '#ffaa00',
    danger: '#ff3366',
    gradients: [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
        'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
    ],
    solidColors: [
        'rgba(0, 212, 255, 0.8)',
        'rgba(255, 107, 53, 0.8)',
        'rgba(123, 104, 238, 0.8)',
        'rgba(0, 255, 136, 0.8)',
        'rgba(255, 170, 0, 0.8)',
        'rgba(255, 51, 102, 0.8)',
        'rgba(102, 126, 234, 0.8)',
        'rgba(240, 147, 251, 0.8)'
    ]
};

// Enhanced animation configurations
const chartAnimations = {
    standard: {
        duration: 2000,
        easing: 'easeOutQuart',
        delay: (context) => context.dataIndex * 100,
        onProgress: (animation) => {
            const chart = animation.chart;
            const canvas = chart.canvas;
            const ctx = chart.ctx;
            
            // Add glow effect during animation
            if (animation.currentStep < animation.numSteps) {
                ctx.save();
                ctx.globalCompositeOperation = 'screen';
                ctx.filter = `blur(${3 - (animation.currentStep / animation.numSteps) * 3}px) brightness(1.2)`;
                ctx.restore();
            }
        },
        onComplete: (animation) => {
            const chart = animation.chart;
            addChartGlowEffect(chart);
        }
    },
    staggered: {
        duration: 2500,
        easing: 'easeOutElastic',
        delay: (context) => context.dataIndex * 150,
    },
    smooth: {
        duration: 1500,
        easing: 'easeInOutCubic'
    }
};

// Add glow effect to charts
function addChartGlowEffect(chart) {
    const canvas = chart.canvas;
    const container = canvas.parentElement;
    
    if (!container.classList.contains('chart-glow-added')) {
        container.style.position = 'relative';
        container.style.borderRadius = '12px';
        container.style.boxShadow = '0 0 30px rgba(0, 212, 255, 0.1)';
        container.classList.add('chart-glow-added');
        
        // Add subtle pulsing effect
        const glowInterval = setInterval(() => {
            if (!document.contains(canvas)) {
                clearInterval(glowInterval);
                return;
            }
            
            const intensity = 0.1 + Math.sin(Date.now() / 2000) * 0.05;
            container.style.boxShadow = `0 0 30px rgba(0, 212, 255, ${intensity})`;
        }, 100);
    }
}

// Enhanced utility function to safely create charts with animations
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
        // Add container animation class
        const container = canvas.parentElement;
        if (container) {
            container.classList.add('chart-container');
        }
        
        // Enhanced config with modern styling
        const enhancedConfig = {
            ...config,
            options: {
                ...config.options,
                animation: config.options?.animation !== false ? chartAnimations.standard : false,
                plugins: {
                    ...config.options?.plugins,
                    legend: {
                        ...config.options?.plugins?.legend,
                        labels: {
                            color: '#e8e8ff',
                            font: {
                                family: "'Orbitron', 'SUSE', sans-serif",
                                size: 13,
                                weight: '500'
                            },
                            ...config.options?.plugins?.legend?.labels
                        }
                    },
                    tooltip: {
                        ...config.options?.plugins?.tooltip,
                        backgroundColor: 'rgba(10, 10, 15, 0.95)',
                        titleColor: '#00d4ff',
                        bodyColor: '#e8e8ff',
                        borderColor: 'rgba(0, 212, 255, 0.3)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 20,
                        titleFont: {
                            family: "'Orbitron', 'SUSE', sans-serif",
                            size: 20,
                            weight: '600'
                        },
                        bodyFont: {
                            family: "'SUSE', sans-serif",
                            size: 18
                        },
                        displayColors: true,
                        boxPadding: 8
                    }
                },
                scales: enhanceScales(config.options?.scales || {}),
                responsive: config.options?.responsive !== false,
                maintainAspectRatio: config.options?.maintainAspectRatio !== false,
                interaction: {
                    intersect: config.type === 'bar' ? true : false,
                    mode: config.type === 'bar' ? 'point' : 'index',
                    ...config.options?.interaction
                },
                // Enhanced hover effects for bars
                onHover: (event, activeElements, chart) => {
                    if (config.type === 'bar' && activeElements.length > 0) {
                        // Add glow effect to hovered bar
                        chart.canvas.style.filter = 'drop-shadow(0 0 10px rgba(0, 212, 255, 0.8))';
                        chart.canvas.style.transition = 'filter 0.2s ease';
                    } else {
                        chart.canvas.style.filter = 'none';
                    }
                    
                    // Call original hover handler if it exists
                    if (config.options?.onHover) {
                        config.options.onHover(event, activeElements, chart);
                    }
                }
            }
        };
        
        // Create gradient backgrounds for bar charts
        const ctx = canvas.getContext('2d');
        const createGradient = (color1, color2) => {
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, color1);
            gradient.addColorStop(0.6, color2);
            gradient.addColorStop(1, color1);
            return gradient;
        };
        
        // Enhanced gradient colors for bars
        const gradientColors = [
            () => createGradient('rgba(0, 212, 255, 0.9)', 'rgba(0, 212, 255, 0.6)'),
            () => createGradient('rgba(255, 107, 53, 0.9)', 'rgba(255, 107, 53, 0.6)'),
            () => createGradient('rgba(123, 104, 238, 0.9)', 'rgba(123, 104, 238, 0.6)'),
            () => createGradient('rgba(0, 255, 136, 0.9)', 'rgba(0, 255, 136, 0.6)'),
            () => createGradient('rgba(255, 170, 0, 0.9)', 'rgba(255, 170, 0, 0.6)'),
            () => createGradient('rgba(255, 51, 102, 0.9)', 'rgba(255, 51, 102, 0.6)'),
            () => createGradient('rgba(102, 126, 234, 0.9)', 'rgba(102, 126, 234, 0.6)'),
            () => createGradient('rgba(240, 147, 251, 0.9)', 'rgba(240, 147, 251, 0.6)')
        ];
        
        // Enhance dataset colors and styling
        if (enhancedConfig.data?.datasets) {
            enhancedConfig.data.datasets = enhancedConfig.data.datasets.map((dataset, index) => {
                const isBarChart = config.type === 'bar';
                
                return {
                    ...dataset,
                    backgroundColor: isBarChart ? 
                        gradientColors[index % gradientColors.length]() : 
                        dataset.backgroundColor || gamingColors.solidColors[index % gamingColors.solidColors.length],
                    borderColor: dataset.borderColor || gamingColors.solidColors[index % gamingColors.solidColors.length].replace('0.8', '1'),
                    borderWidth: isBarChart ? 0 : (dataset.borderWidth || 2),
                    tension: dataset.tension || 0.4,
                    fill: dataset.fill !== undefined ? dataset.fill : false,
                    pointBackgroundColor: dataset.pointBackgroundColor || gamingColors.primary,
                    pointBorderColor: dataset.pointBorderColor || '#ffffff',
                    pointBorderWidth: dataset.pointBorderWidth || 2,
                    pointRadius: dataset.pointRadius || 4,
                    pointHoverRadius: dataset.pointHoverRadius || 6,
                    pointHoverBackgroundColor: dataset.pointHoverBackgroundColor || gamingColors.primary,
                    pointHoverBorderColor: dataset.pointHoverBorderColor || '#ffffff',
                    pointHoverBorderWidth: dataset.pointHoverBorderWidth || 3,
                    // Enhanced bar styling with selective rounding
                    borderSkipped: false,
                    borderRadius: isBarChart ? 
                        (config.options?.indexAxis === 'y' ? 
                            // Horizontal bars - round right end only
                            { topLeft: 0, topRight: 4, bottomLeft: 0, bottomRight: 4 } :
                            // Vertical bars - round top end only  
                            { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 }
                        ) : 0,
                    hoverBackgroundColor: isBarChart ? 
                        gradientColors[index % gradientColors.length]() : 
                        dataset.hoverBackgroundColor,
                    hoverBorderColor: dataset.hoverBorderColor,
                    hoverBorderWidth: isBarChart ? 0 : (dataset.hoverBorderWidth || 3)
                };
            });
        }
        
        const chart = new Chart(canvas.getContext('2d'), enhancedConfig);
        
        // Add bar-specific enhancements
        if (config.type === 'bar') {
            // Add shimmer effect to bars
            const addBarShimmer = () => {
                const meta = chart.getDatasetMeta(0);
                if (meta && meta.data) {
                    meta.data.forEach((bar, index) => {
                        const element = bar.element || bar;
                        if (element) {
                            // Add subtle glow animation
                            setTimeout(() => {
                                if (chart.canvas && document.contains(chart.canvas)) {
                                    chart.canvas.style.filter = `drop-shadow(0 0 5px rgba(0, 212, 255, ${0.3 + Math.sin(Date.now() / 1000 + index) * 0.1}))`;
                                }
                            }, index * 200);
                        }
                    });
                }
            };
            
            // Apply shimmer after chart is fully rendered
            setTimeout(addBarShimmer, 2500);
        }
        
        // Add entry animation delay
        setTimeout(() => {
            if (chart && chart.canvas && document.contains(chart.canvas)) {
                addChartGlowEffect(chart);
            }
        }, 2200);
        
        return chart;
    } catch (error) {
        console.error(`Error creating chart ${canvasId}:`, error);
        return null;
    }
}

// Enhanced scales with gaming theme
function enhanceScales(scales) {
    const enhancedScales = {};
    
    Object.keys(scales).forEach(scaleKey => {
        const scale = scales[scaleKey];
        enhancedScales[scaleKey] = {
            ...scale,
            ticks: {
                ...scale.ticks,
                color: '#e8e8ff',
                font: {
                    family: "'SUSE', sans-serif",
                    size: 11,
                    weight: '400'
                },
                ...scale.ticks
            },
            grid: {
                color: 'rgba(232, 232, 255, 0.1)',
                lineWidth: 1,
                ...scale.grid
            },
            border: {
                color: 'rgba(232, 232, 255, 0.2)',
                width: 1,
                ...scale.border
            },
            title: scale.title ? {
                ...scale.title,
                color: '#00d4ff',
                font: {
                    family: "'Orbitron', 'SUSE', sans-serif",
                    size: 13,
                    weight: '600'
                }
            } : undefined
        };
    });
    
    return enhancedScales;
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
        
        // Initialize the dashboard only after allGames is ready
        initializeDashboard();
        // Ensure dropdowns are populated after data is loaded
        handleAnalysisTypeChange();
        
        // Update the timestamp in the navbar
        updateTimestamp();
        
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
                        teamOneSize: (game.teamOne || []).length + 1,
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
                            <div class="col-md-3">
                                <label class="form-label text-light">Actions</label>
                                <div>
                                    <button id="resetFilters" class="btn btn-outline-secondary bg-dark text-light border-secondary">Reset Filters</button>
                                </div>
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
        
        <!-- Chart Maximize Modal -->
        <div class="modal fade" id="chartModal" tabindex="-1" aria-labelledby="chartModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-fullscreen">
                <div class="modal-content bg-dark">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title" id="chartModalLabel">Chart Details</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body" style="overflow-y: auto; max-height: calc(100vh - 120px);">
                        <div class="container-fluid">
                            <div class="row">
                                <div class="col-12">
                                    <div class="card bg-dark border-secondary">
                                        <div class="card-body" id="modalChartContainer">
                                            <canvas id="modalChart"></canvas>
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
    
    // Initialize event listeners
    setupEventListeners();
    
    // Load general overview by default
    loadGeneralOverview();
}

// Setup event listeners
function setupEventListeners() {
    const analysisType = document.getElementById('analysisType');
    const filterSelect = document.getElementById('filterSelect');
    const timePeriod = document.getElementById('timePeriod');
    const resetButton = document.getElementById('resetFilters');
    
    if (analysisType) {
        analysisType.addEventListener('change', handleAnalysisTypeChange);
    }
    
    if (filterSelect) {
        filterSelect.addEventListener('change', handleFilterChange);
    }
    
    if (timePeriod) {
        timePeriod.addEventListener('change', handleTimePeriodChange);
    }
    
    if (resetButton) {
        resetButton.addEventListener('click', resetFilters);
    }
}

// Handle analysis type change
function handleAnalysisTypeChange() {
    const analysisType = document.getElementById('analysisType');
    const filterSelect = document.getElementById('filterSelect');
    const filterSection = document.getElementById('filterSection');
    
    if (!analysisType || !filterSelect || !filterSection) {
        return;
    }
    
    const analysisValue = analysisType.value;
    
    // Clear and populate filter options
    filterSelect.innerHTML = '<option value="">All Data</option>';
    
    // Show/hide filter section
    if (analysisValue === 'general') {
        filterSection.style.display = 'none';
    } else {
        filterSection.style.display = 'block';
    }
    
    if (analysisValue === 'player') {
        // Get all players
        const allPlayers = new Set();
        allGames.forEach(game => {
            allPlayers.add(game.commander1);
            allPlayers.add(game.commander2);
            if (game.teamOne) game.teamOne.forEach(player => allPlayers.add(player));
            if (game.teamTwo) game.teamTwo.forEach(player => allPlayers.add(player));
            if (game.teamOneStraggler) game.teamOneStraggler.forEach(player => allPlayers.add(player));
            if (game.teamTwoStraggler) game.teamTwoStraggler.forEach(player => allPlayers.add(player));
        });
        const players = [...allPlayers].sort();
        players.forEach(player => {
            filterSelect.innerHTML += `<option value="${player}">${player}</option>`;
        });
    } else if (analysisValue === 'map') {
        // Get all maps
        const allMaps = [...new Set(allGames.map(game => game.map))].sort();
        allMaps.forEach(map => {
            filterSelect.innerHTML += `<option value="${map}">${map}</option>`;
        });
    } else if (analysisValue === 'faction') {
        // Get all factions
        const allFactions = new Set();
        allGames.forEach(game => {
            if (game.faction1) allFactions.add(game.faction1);
            if (game.faction2) allFactions.add(game.faction2);
        });
        const factions = [...allFactions].sort();
        factions.forEach(faction => {
            filterSelect.innerHTML += `<option value="${faction}">${faction}</option>`;
        });
    }
    
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
        return;
    }
    
    analysisTypeElement.value = 'general';
    filterSelectElement.innerHTML = '<option value="">All Data</option>';
    filterSelectElement.value = '';
    timePeriodElement.value = 'all';
    
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

// Get filtered games
function getFilteredGames() {
    let filtered = [...allGames];
    
    const timePeriodElement = document.getElementById('timePeriod');
    const analysisTypeElement = document.getElementById('analysisType');
    const filterSelectElement = document.getElementById('filterSelect');
    
    if (!timePeriodElement || !analysisTypeElement || !filterSelectElement) {
        return filtered;
    }
    
    const timePeriod = timePeriodElement.value;
    if (timePeriod !== 'all') {
        filtered = filtered.filter(game => game.year === parseInt(timePeriod));
    }
    
    const analysisType = analysisTypeElement.value;
    const filterValue = filterSelectElement.value;
    
    if (filterValue && analysisType === 'player') {
        filtered = filtered.filter(game => {
            if (game.commander1 === filterValue || game.commander2 === filterValue) return true;
            if (game.teamOne && game.teamOne.includes(filterValue)) return true;
            if (game.teamTwo && game.teamTwo.includes(filterValue)) return true;
            if (game.teamOneStraggler && game.teamOneStraggler.includes(filterValue)) return true;
            if (game.teamTwoStraggler && game.teamTwoStraggler.includes(filterValue)) return true;
            return false;
        });
    } else if (filterValue && analysisType === 'map') {
        filtered = filtered.filter(game => game.map === filterValue);
    } else if (filterValue && analysisType === 'faction') {
        filtered = filtered.filter(game => game.faction1 === filterValue || game.faction2 === filterValue);
    }
    
    return filtered;
}

// Update summary stats with advanced features
function updateSummaryStats(games) {
    const analysisTypeElement = document.getElementById('analysisType');
    const filterSelectElement = document.getElementById('filterSelect');
    
    const totalGamesElement = document.getElementById('totalGames');
    const totalCommandersElement = document.getElementById('totalCommanders');
    const totalMapsElement = document.getElementById('totalMaps');
    const avgGameTimeElement = document.getElementById('avgGameTime');
    
    if (!totalGamesElement || !totalCommandersElement || !totalMapsElement || !avgGameTimeElement) {
        return;
    }
    
    const analysisType = analysisTypeElement ? analysisTypeElement.value : 'general';
    const selectedPlayer = filterSelectElement ? filterSelectElement.value : null;
    
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

// Load general overview with all 6 charts
function loadGeneralOverview() {
    const games = getFilteredGames();
    updateSummaryStats(games);
    
    const mainAnalysis = document.getElementById('mainAnalysis');
    mainAnalysis.innerHTML = `
        <!-- Faction Distribution - Full Width -->
        <div class="row mb-4">
            <div class="col-12">
                <div class="card bg-dark border-secondary">
                    <div class="card-header bg-danger text-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Faction Choice Distribution</h5>
                        <button class="btn btn-sm btn-outline-light maximize-chart" data-chart-type="factionDistribution" data-chart-title="Faction Choice Distribution - Total Selections">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="card-body">
                        <canvas id="factionDistributionChart"></canvas>
                    </div>
                </div>
            </div>
        </div>

        <div class="row">
            <!-- Commander Rankings -->
            <div class="col-lg-6 mb-4">
                <div class="card bg-dark border-secondary">
                    <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Commander Ranking - Games Played</h5>
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
                        <h5 class="mb-0">Commander Ranking - Winrate</h5>
                        <div class="d-flex gap-2 align-items-center">
                            <select id="rankingMethod" class="form-select form-select-sm" style="width: auto;">
                                <option value="wilson">Wilson Score</option>
                                <option value="winRate">Win Rate</option>
                                <option value="volumeWeighted">Volume-Weighted</option>
                                <option value="bayesian">Bayesian Average</option>
                                <option value="composite">Composite Score</option>
                            </select>
                            <select id="minGameRequirement" class="form-select form-select-sm" style="width: auto;">
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
                    <div class="modal-body" style="overflow-y: auto; max-height: calc(100vh - 120px);">
                        <div class="container-fluid">
                            <div class="row">
                                <div class="col-12">
                                    <div class="card bg-dark border-secondary">
                                        <div class="card-body" id="modalChartContainer">
                                            <canvas id="modalChart"></canvas>
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
    
    // Create all charts
    createCommanderGamesChart(games);
    createCommanderWinRateChart(games, 'wilson', '3%');
    createMapPopularityChart(games);
    createCommanderFactionChart(games);
    createFactionDistributionChart(games);
    createFactionPerformanceChart(games);
    createGameDurationChart(games);
    
    // Add event listeners for the ranking dropdowns
    const rankingMethodEl = document.getElementById('rankingMethod');
    const minGameRequirementEl = document.getElementById('minGameRequirement');
    
    if (rankingMethodEl) {
        rankingMethodEl.addEventListener('change', () => {
            const rankingMethod = document.getElementById('rankingMethod').value;
            const minGameRequirement = document.getElementById('minGameRequirement').value;
            createCommanderWinRateChart(games, rankingMethod, minGameRequirement);
        });
    }
    
    if (minGameRequirementEl) {
        minGameRequirementEl.addEventListener('change', () => {
            const rankingMethod = document.getElementById('rankingMethod').value;
            const minGameRequirement = document.getElementById('minGameRequirement').value;
            createCommanderWinRateChart(games, rankingMethod, minGameRequirement);
        });
    }
    
    // Add event listeners for maximize buttons
    document.querySelectorAll('.maximize-chart').forEach(button => {
        button.addEventListener('click', (e) => {
            const chartType = e.currentTarget.dataset.chartType;
            const chartTitle = e.currentTarget.dataset.chartTitle;
            showModalChart(games, chartType, chartTitle);
        });
    });
}

// Create commander games chart
function createCommanderGamesChart(games) {
    const commanderStats = {};
    
    games.forEach(game => {
        commanderStats[game.commander1] = (commanderStats[game.commander1] || 0) + 1;
        commanderStats[game.commander2] = (commanderStats[game.commander2] || 0) + 1;
    });
    
    const sortedCommanders = Object.entries(commanderStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
    
    safeCreateChart('commanderGamesChart', {
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
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
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

// Create commander win rate chart
function createCommanderWinRateChart(games, rankingMethod, minGameRequirement) {
    const commanderStats = {};
    
    // Calculate comprehensive stats for each commander
    games.forEach(game => {
        [game.commander1, game.commander2].forEach(commander => {
            if (!commanderStats[commander]) {
                commanderStats[commander] = { games: 0, wins: 0, faction: {} };
            }
            commanderStats[commander].games++;
            
            if (game.winner === commander) {
                commanderStats[commander].wins++;
            }
            
            // Track faction usage
            const faction = commander === game.commander1 ? game.faction1 : game.faction2;
            commanderStats[commander].faction[faction] = (commanderStats[commander].faction[faction] || 0) + 1;
        });
    });
    
    // Apply minimum games filter
    let minGames;
    if (minGameRequirement.includes('%')) {
        const percentage = parseFloat(minGameRequirement.replace('%', ''));
        minGames = Math.ceil(games.length * (percentage / 100));
    } else {
        minGames = parseInt(minGameRequirement);
    }
    
    const qualifiedCommanders = Object.entries(commanderStats)
        .filter(([, stats]) => stats.games >= minGames);
    
    // Calculate scores based on method
    const scoredCommanders = qualifiedCommanders.map(([name, stats]) => {
        const winRate = stats.wins / stats.games;
        let score = winRate;
        
        switch (rankingMethod) {
            case 'wilson':
                // Wilson Score Interval
                const n = stats.games;
                const p = winRate;
                const z = 1.96; // 95% confidence
                score = (p + z*z/(2*n) - z * Math.sqrt((p*(1-p)+z*z/(4*n))/n)) / (1+z*z/n);
                break;
            case 'winRate':
                score = winRate;
                break;
            case 'volumeWeighted':
                score = winRate * Math.log(stats.games + 1);
                break;
            case 'bayesian':
                // Bayesian average
                const globalWinRate = games.filter(g => g.winner).length / (games.length * 2);
                const confidence = 30;
                score = (confidence * globalWinRate + stats.games * winRate) / (confidence + stats.games);
                break;
            case 'composite':
                const wilsonScore = (winRate + 1.96*1.96/(2*stats.games) - 1.96 * Math.sqrt((winRate*(1-winRate)+1.96*1.96/(4*stats.games))/stats.games)) / (1+1.96*1.96/stats.games);
                const volumeScore = Math.log(stats.games + 1) / Math.log(Math.max(...qualifiedCommanders.map(([,s]) => s.games)) + 1);
                score = wilsonScore * 0.7 + volumeScore * 0.3;
                break;
        }
        
        return {
            name,
            score,
            winRate: winRate * 100,
            games: stats.games,
            wins: stats.wins
        };
    });
    
    const sortedCommanders = scoredCommanders.sort((a, b) => b.score - a.score).slice(0, 10);
    
    safeCreateChart('commanderWinRateChart', {
        type: 'bar',
        data: {
            labels: sortedCommanders.map(c => c.name),
            datasets: [{
                label: `${rankingMethod === 'wilson' ? 'Wilson Score' : 
                        rankingMethod === 'winRate' ? 'Win Rate (%)' :
                        rankingMethod === 'volumeWeighted' ? 'Volume-Weighted Score' :
                        rankingMethod === 'bayesian' ? 'Bayesian Average' : 'Composite Score'}`,
                data: sortedCommanders.map(c => rankingMethod === 'winRate' ? c.winRate : c.score),
                backgroundColor: 'rgba(25, 135, 84, 0.8)',
                borderColor: 'rgba(25, 135, 84, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: { color: 'white' }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const commander = sortedCommanders[context.dataIndex];
                            return [
                                `${context.dataset.label}: ${context.parsed.x.toFixed(3)}`,
                                `Win Rate: ${commander.winRate.toFixed(1)}%`,
                                `Games: ${commander.games}`,
                                `Wins: ${commander.wins}`
                            ];
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
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
    
    safeCreateChart('mapPopularityChart', {
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
            maintainAspectRatio: true,
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

// Create commander faction chart
function createCommanderFactionChart(games) {
    const commanderFactionStats = {};
    
    games.forEach(game => {
        [
            [game.commander1, game.faction1],
            [game.commander2, game.faction2]
        ].forEach(([commander, faction]) => {
            if (!commanderFactionStats[commander]) {
                commanderFactionStats[commander] = {};
            }
            commanderFactionStats[commander][faction] = (commanderFactionStats[commander][faction] || 0) + 1;
        });
    });
    
    // Get most played commanders and their primary factions
    const commanderPreferences = Object.entries(commanderFactionStats)
        .map(([commander, factions]) => {
            const totalGames = Object.values(factions).reduce((sum, count) => sum + count, 0);
            const primaryFaction = Object.entries(factions)
                .sort(([,a], [,b]) => b - a)[0];
            
            return {
                commander,
                totalGames,
                primaryFaction: primaryFaction[0],
                primaryCount: primaryFaction[1],
                percentage: (primaryFaction[1] / totalGames * 100).toFixed(1)
            };
        })
        .sort((a, b) => b.totalGames - a.totalGames)
        .slice(0, 10);
    
    safeCreateChart('commanderFactionChart', {
        type: 'bar',
        data: {
            labels: commanderPreferences.map(c => `${c.commander} (${c.primaryFaction})`),
            datasets: [{
                label: 'Primary Faction Usage',
                data: commanderPreferences.map(c => c.primaryCount),
                backgroundColor: 'rgba(255, 193, 7, 0.8)',
                borderColor: 'rgba(255, 193, 7, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: { color: 'white' }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const prefs = commanderPreferences[context.dataIndex];
                            return [
                                `Primary Faction: ${prefs.primaryFaction}`,
                                `Games: ${prefs.primaryCount}/${prefs.totalGames}`,
                                `Percentage: ${prefs.percentage}%`
                            ];
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
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

// Create faction distribution chart
function createFactionDistributionChart(games) {
    const factionStats = {};
    
    // Count each faction selection (both faction1 and faction2 from each game)
    games.forEach(game => {
        [game.faction1, game.faction2].forEach(faction => {
            if (faction) {
                factionStats[faction] = (factionStats[faction] || 0) + 1;
            }
        });
    });
    
    // Sort factions by count and get totals
    const sortedFactions = Object.entries(factionStats)
        .sort(([,a], [,b]) => b - a);
    
    const totalSelections = Object.values(factionStats).reduce((sum, count) => sum + count, 0);
    
    // Update the card header with total count
    const cardHeader = document.querySelector('#mainAnalysis .bg-danger h5');
    if (cardHeader) {
        cardHeader.textContent = `Faction Choice Distribution (${totalSelections} total)`;
    }
    
    // Define faction colors to match gaming theme
    const factionColors = {
        'I.S.D.F': 'rgba(13, 110, 253, 0.9)',    // Blue for ISDF
        'Scion': 'rgba(255, 193, 7, 0.9)',       // Yellow/Orange for Scion  
        'Hadean': 'rgba(220, 53, 69, 0.9)'       // Red for Hadean
    };
    
    safeCreateChart('factionDistributionChart', {
        type: 'bar',
        data: {
            labels: [''],
            datasets: sortedFactions.map(([faction, count]) => ({
                label: faction,
                data: [count],
                backgroundColor: factionColors[faction] || 'rgba(108, 117, 125, 0.9)',
                borderColor: factionColors[faction] || 'rgba(108, 117, 125, 1)',
                borderWidth: 1
            }))
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            maxBarThickness: 15,
            scales: {
                x: {
                    stacked: true,
                    beginAtZero: true,
                    max: totalSelections,
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    stacked: true,
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return context[0].dataset.label;
                        },
                        label: function(context) {
                            const count = context.parsed.x;
                            return `Selections: ${count}`;
                        }
                    }
                },
                datalabels: {
                    display: true,
                    color: 'white',
                    font: {
                        weight: 'bold',
                        size: 16
                    },
                    formatter: function(value, context) {
                        if (value > 0) {
                            return value;
                        }
                        return '';
                    },
                    anchor: 'center',
                    align: 'center'
                }
            },
            layout: {
                padding: {
                    top: 15,
                    bottom: 15,
                    left: 20,
                    right: 20
                }
            }
        },
        plugins: []
    });
    
    // Set specific height constraint to make chart compact
    const canvas = document.getElementById('factionDistributionChart');
    if (canvas) {
        canvas.style.height = '80px';
        canvas.style.maxHeight = '80px';
    }
}

// Create faction performance chart
function createFactionPerformanceChart(games) {
    const factionStats = {};
    
    games.forEach(game => {
        [game.faction1, game.faction2].forEach(faction => {
            if (!factionStats[faction]) {
                factionStats[faction] = { games: 0, wins: 0 };
            }
            factionStats[faction].games++;
            
            if ((game.winner === game.commander1 && faction === game.faction1) ||
                (game.winner === game.commander2 && faction === game.faction2)) {
                factionStats[faction].wins++;
            }
        });
    });
    
    const factionPerformance = Object.entries(factionStats)
        .map(([faction, stats]) => ({
            faction,
            winRate: (stats.wins / stats.games * 100).toFixed(1),
            games: stats.games,
            wins: stats.wins
        }))
        .sort((a, b) => b.winRate - a.winRate)
        .slice(0, 10);
    
    safeCreateChart('factionPerformanceChart', {
        type: 'bar',
        data: {
            labels: factionPerformance.map(f => f.faction),
            datasets: [
                {
                    label: 'Win Rate (%)',
                    data: factionPerformance.map(f => f.winRate),
                    backgroundColor: 'rgba(220, 53, 69, 0.8)',
                    borderColor: 'rgba(220, 53, 69, 1)',
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    label: 'Total Games',
                    data: factionPerformance.map(f => f.games),
                    backgroundColor: 'rgba(108, 117, 125, 0.8)',
                    borderColor: 'rgba(108, 117, 125, 1)',
                    borderWidth: 1,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            maxBarThickness: 25,
            plugins: {
                legend: {
                    labels: { color: 'white' }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const faction = factionPerformance[context.dataIndex];
                            if (context.datasetIndex === 0) {
                                return `Win Rate: ${faction.winRate}% (${faction.wins}/${faction.games})`;
                            } else {
                                return `Total Games: ${faction.games}`;
                            }
                        }
                    }
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
                    beginAtZero: true,
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    title: {
                        display: true,
                        text: 'Win Rate (%)',
                        color: 'white'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    ticks: { color: 'white' },
                    grid: { drawOnChartArea: false },
                    title: {
                        display: true,
                        text: 'Total Games',
                        color: 'white'
                    }
                }
            },
            layout: {
                padding: {
                    top: 30,
                    bottom: 30,
                    left: 80,
                    right: 80
                }
            },
            elements: {
                bar: {
                    borderWidth: 1
                }
            }
        }
    });
}

// Create game duration chart
function createGameDurationChart(games) {
    const durationBuckets = {};
    
    games.forEach(game => {
        if (!game.time || game.time.trim() === '') return;
        
        try {
            const timeParts = game.time.split(':');
            if (timeParts.length >= 2) {
                const hours = parseInt(timeParts[0]) || 0;
                const minutes = parseInt(timeParts[1]) || 0;
                const totalMinutes = hours * 60 + minutes;
                
                // Create buckets in 10-minute intervals
                const bucket = Math.floor(totalMinutes / 10) * 10;
                const bucketLabel = `${Math.floor(bucket / 60)}:${(bucket % 60).toString().padStart(2, '0')} - ${Math.floor((bucket + 9) / 60)}:${((bucket + 9) % 60).toString().padStart(2, '0')}`;
                
                durationBuckets[bucketLabel] = (durationBuckets[bucketLabel] || 0) + 1;
            }
        } catch (e) {
            console.warn('Error parsing game time:', game.time, e);
        }
    });
    
    const sortedBuckets = Object.entries(durationBuckets)
        .sort(([a], [b]) => {
            const getMinutes = (label) => {
                const start = label.split(' - ')[0];
                const [hours, mins] = start.split(':').map(Number);
                return hours * 60 + mins;
            };
            return getMinutes(a) - getMinutes(b);
        })
        .slice(0, 10);
    
    safeCreateChart('gameDurationChart', {
        type: 'bar',
        data: {
            labels: sortedBuckets.map(([label]) => label),
            datasets: [{
                label: 'Number of Games',
                data: sortedBuckets.map(([,count]) => count),
                backgroundColor: 'rgba(108, 117, 125, 0.8)',
                borderColor: 'rgba(108, 117, 125, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            maxBarThickness: 25,
            plugins: {
                legend: {
                    labels: { color: 'white' }
                }
            },
            scales: {
                x: {
                    ticks: { 
                        color: 'white',
                        maxRotation: 45
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

// Show modal chart with proper full-scale scrolling
function showModalChart(games, chartType, chartTitle) {
    const modal = new bootstrap.Modal(document.getElementById('chartModal'));
    const modalTitle = document.getElementById('chartModalLabel');
    const modalChart = document.getElementById('modalChart');
    const modalBody = document.querySelector('#chartModal .modal-body');
    const modalContainer = document.getElementById('modalChartContainer');
    
    modalTitle.textContent = chartTitle;
    
    // Clear previous chart
    const existingChart = Chart.getChart(modalChart);
    if (existingChart) {
        existingChart.destroy();
    }
    
    // Reset modal body and container styling for proper scrolling
    modalBody.style.cssText = `
        padding: 0;
        height: calc(100vh - 120px);
        overflow-y: auto;
        overflow-x: auto;
        background-color: #212529;
    `;
    
    modalContainer.style.cssText = `
        padding: 20px;
        min-height: 100%;
        background-color: #212529;
    `;
    
    // Reset canvas completely
    modalChart.style.cssText = '';
    modalChart.removeAttribute('width');
    modalChart.removeAttribute('height');
    modalChart.removeAttribute('style');
    
    // Create modal chart based on type
    switch (chartType) {
        case 'commanderGames':
            createModalCommanderGamesChart(games, modalChart);
            break;
        case 'commanderWinRate':
            const rankingMethod = document.getElementById('rankingMethod').value;
            const minGameRequirement = document.getElementById('minGameRequirement').value;
            createModalCommanderWinRateChart(games, modalChart, rankingMethod, minGameRequirement);
            break;
        case 'mapPopularity':
            createModalMapPopularityChart(games, modalChart);
            break;
        case 'commanderFaction':
            createModalCommanderFactionChart(games, modalChart);
            break;
        case 'factionDistribution':
            createModalFactionDistributionChart(games, modalChart);
            break;
        case 'factionPerformance':
            createModalFactionPerformanceChart(games, modalChart);
            break;
        case 'gameDuration':
            createModalGameDurationChart(games, modalChart);
            break;
    }
    
    modal.show();
}

function createModalCommanderGamesChart(games, canvas) {
    const commanderStats = {};
    
    games.forEach(game => {
        commanderStats[game.commander1] = (commanderStats[game.commander1] || 0) + 1;
        commanderStats[game.commander2] = (commanderStats[game.commander2] || 0) + 1;
    });
    
    const sortedCommanders = Object.entries(commanderStats)
        .sort(([,a], [,b]) => b - a);
    
    // Enforce minimum readable dimensions - never compress
    const MIN_BAR_HEIGHT = 35; // Minimum height per bar for readability
    const CHART_WIDTH = 1200; // Fixed comfortable width
    const PADDING = 100; // Top/bottom padding
    
    // Calculate height based on data - ensure every bar is readable
    const chartHeight = (sortedCommanders.length * MIN_BAR_HEIGHT) + PADDING;
    
    // Ensure the modal container can handle the full size
    const container = canvas.parentElement;
    container.style.width = `${CHART_WIDTH + 40}px`; // Extra padding
    container.style.minHeight = `${chartHeight}px`;
    
    // Set canvas to exact dimensions - no scaling allowed
    canvas.width = CHART_WIDTH;
    canvas.height = chartHeight;
    canvas.style.width = `${CHART_WIDTH}px`;
    canvas.style.height = `${chartHeight}px`;
    canvas.style.display = 'block';
    canvas.style.maxWidth = 'none';
    canvas.style.maxHeight = 'none';
    
    new Chart(canvas.getContext('2d'), {
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
            indexAxis: 'y',
            responsive: false,
            maintainAspectRatio: false,
            resizeDelay: 0,
            animation: false,
            interaction: {
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    labels: { 
                        color: 'white',
                        font: { size: 16 }
                    }
                }
            },
            scales: {
                y: {
                    type: 'category',
                    ticks: { 
                        color: 'white',
                        font: { size: 13 },
                        maxTicksLimit: false,
                        autoSkip: false,
                        padding: 8
                    },
                    grid: { 
                        color: 'rgba(255, 255, 255, 0.1)',
                        display: true
                    }
                },
                x: {
                    type: 'linear',
                    beginAtZero: true,
                    ticks: { 
                        color: 'white',
                        font: { size: 13 }
                    },
                    grid: { 
                        color: 'rgba(255, 255, 255, 0.1)',
                        display: true
                    }
                }
            },
            layout: {
                padding: {
                    top: 20,
                    bottom: 20,
                    left: 150, // Space for long names
                    right: 50
                }
            },
            elements: {
                bar: {
                    borderWidth: 1
                }
            }
        }
    });
}

function createModalCommanderWinRateChart(games, canvas, rankingMethod, minGameRequirement) {
    const commanderStats = {};
    
    // Calculate comprehensive stats for each commander
    games.forEach(game => {
        [game.commander1, game.commander2].forEach(commander => {
            if (!commanderStats[commander]) {
                commanderStats[commander] = { games: 0, wins: 0, faction: {} };
            }
            commanderStats[commander].games++;
            
            if (game.winner === commander) {
                commanderStats[commander].wins++;
            }
            
            // Track faction usage
            const faction = commander === game.commander1 ? game.faction1 : game.faction2;
            commanderStats[commander].faction[faction] = (commanderStats[commander].faction[faction] || 0) + 1;
        });
    });
    
    // Apply minimum games filter
    let minGames;
    if (minGameRequirement.includes('%')) {
        const percentage = parseFloat(minGameRequirement.replace('%', ''));
        minGames = Math.ceil(games.length * (percentage / 100));
    } else {
        minGames = parseInt(minGameRequirement);
    }
    
    const qualifiedCommanders = Object.entries(commanderStats)
        .filter(([, stats]) => stats.games >= minGames);
    
    // Calculate scores based on method
    const scoredCommanders = qualifiedCommanders.map(([name, stats]) => {
        const winRate = stats.wins / stats.games;
        let score = winRate;
        
        switch (rankingMethod) {
            case 'wilson':
                // Wilson Score Interval
                const n = stats.games;
                const p = winRate;
                const z = 1.96; // 95% confidence
                score = (p + z*z/(2*n) - z * Math.sqrt((p*(1-p)+z*z/(4*n))/n)) / (1+z*z/n);
                break;
            case 'winRate':
                score = winRate;
                break;
            case 'volumeWeighted':
                score = winRate * Math.log(stats.games + 1);
                break;
            case 'bayesian':
                // Bayesian average
                const globalWinRate = games.filter(g => g.winner).length / (games.length * 2);
                const confidence = 30;
                score = (confidence * globalWinRate + stats.games * winRate) / (confidence + stats.games);
                break;
            case 'composite':
                const wilsonScore = (winRate + 1.96*1.96/(2*stats.games) - 1.96 * Math.sqrt((winRate*(1-winRate)+1.96*1.96/(4*stats.games))/stats.games)) / (1+1.96*1.96/stats.games);
                const volumeScore = Math.log(stats.games + 1) / Math.log(Math.max(...qualifiedCommanders.map(([,s]) => s.games)) + 1);
                score = wilsonScore * 0.7 + volumeScore * 0.3;
                break;
        }
        
        return {
            name,
            score,
            winRate: winRate * 100,
            games: stats.games,
            wins: stats.wins
        };
    });
    
    const sortedCommanders = scoredCommanders.sort((a, b) => b.score - a.score);
    
    // Enforce minimum readable dimensions - never compress
    const MIN_BAR_HEIGHT = 35; // Minimum height per bar for readability
    const CHART_WIDTH = 1200; // Fixed comfortable width
    const PADDING = 100; // Top/bottom padding
    
    // Calculate height based on data - ensure every bar is readable
    const chartHeight = (sortedCommanders.length * MIN_BAR_HEIGHT) + PADDING;
    
    // Ensure the modal container can handle the full size
    const container = canvas.parentElement;
    container.style.width = `${CHART_WIDTH + 40}px`; // Extra padding
    container.style.minHeight = `${chartHeight}px`;
    
    // Set canvas to exact dimensions - no scaling allowed
    canvas.width = CHART_WIDTH;
    canvas.height = chartHeight;
    canvas.style.width = `${CHART_WIDTH}px`;
    canvas.style.height = `${chartHeight}px`;
    canvas.style.display = 'block';
    canvas.style.maxWidth = 'none';
    canvas.style.maxHeight = 'none';
    
    new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: sortedCommanders.map(c => c.name),
            datasets: [{
                label: `${rankingMethod === 'wilson' ? 'Wilson Score' : 
                        rankingMethod === 'winRate' ? 'Win Rate (%)' :
                        rankingMethod === 'volumeWeighted' ? 'Volume-Weighted Score' :
                        rankingMethod === 'bayesian' ? 'Bayesian Average' : 'Composite Score'}`,
                data: sortedCommanders.map(c => rankingMethod === 'winRate' ? c.winRate : c.score),
                backgroundColor: 'rgba(25, 135, 84, 0.8)',
                borderColor: 'rgba(25, 135, 84, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: false,
            maintainAspectRatio: false,
            resizeDelay: 0,
            animation: false,
            interaction: {
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    labels: { 
                        color: 'white',
                        font: { size: 16 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const commander = sortedCommanders[context.dataIndex];
                            return [
                                `${context.dataset.label}: ${context.parsed.x.toFixed(3)}`,
                                `Win Rate: ${commander.winRate.toFixed(1)}%`,
                                `Games: ${commander.games}`,
                                `Wins: ${commander.wins}`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    type: 'category',
                    ticks: { 
                        color: 'white',
                        font: { size: 13 },
                        maxTicksLimit: false,
                        autoSkip: false,
                        padding: 8
                    },
                    grid: { 
                        color: 'rgba(255, 255, 255, 0.1)',
                        display: true
                    }
                },
                x: {
                    type: 'linear',
                    beginAtZero: true,
                    ticks: { 
                        color: 'white',
                        font: { size: 13 }
                    },
                    grid: { 
                        color: 'rgba(255, 255, 255, 0.1)',
                        display: true
                    }
                }
            },
            layout: {
                padding: {
                    top: 20,
                    bottom: 20,
                    left: 150, // Space for long names
                    right: 50
                }
            },
            elements: {
                bar: {
                    borderWidth: 1
                }
            }
        }
    });
}

function createModalMapPopularityChart(games, canvas) {
    const mapStats = {};
    
    games.forEach(game => {
        mapStats[game.map] = (mapStats[game.map] || 0) + 1;
    });
    
    const sortedMaps = Object.entries(mapStats)
        .sort(([,a], [,b]) => b - a);
    
    // Enforce minimum readable dimensions - never compress
    const MIN_BAR_HEIGHT = 35; // Minimum height per bar for readability
    const CHART_WIDTH = 1200; // Fixed comfortable width
    const PADDING = 100; // Top/bottom padding
    
    // Calculate height based on data - ensure every bar is readable
    const chartHeight = (sortedMaps.length * MIN_BAR_HEIGHT) + PADDING;
    
    // Ensure the modal container can handle the full size
    const container = canvas.parentElement;
    container.style.width = `${CHART_WIDTH + 40}px`; // Extra padding
    container.style.minHeight = `${chartHeight}px`;
    
    // Set canvas to exact dimensions - no scaling allowed
    canvas.width = CHART_WIDTH;
    canvas.height = chartHeight;
    canvas.style.width = `${CHART_WIDTH}px`;
    canvas.style.height = `${chartHeight}px`;
    canvas.style.display = 'block';
    canvas.style.maxWidth = 'none';
    canvas.style.maxHeight = 'none';
    
    new Chart(canvas.getContext('2d'), {
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
            responsive: false,
            maintainAspectRatio: false,
            resizeDelay: 0,
            animation: false,
            interaction: {
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    labels: { 
                        color: 'white',
                        font: { size: 16 }
                    }
                }
            },
            scales: {
                y: {
                    type: 'category',
                    ticks: { 
                        color: 'white',
                        font: { size: 13 },
                        maxTicksLimit: false,
                        autoSkip: false,
                        padding: 8
                    },
                    grid: { 
                        color: 'rgba(255, 255, 255, 0.1)',
                        display: true
                    }
                },
                x: {
                    type: 'linear',
                    beginAtZero: true,
                    ticks: { 
                        color: 'white',
                        font: { size: 13 }
                    },
                    grid: { 
                        color: 'rgba(255, 255, 255, 0.1)',
                        display: true
                    }
                }
            },
            layout: {
                padding: {
                    top: 20,
                    bottom: 20,
                    left: 150, // Space for long names
                    right: 50
                }
            },
            elements: {
                bar: {
                    borderWidth: 1
                }
            }
        }
    });
}

function createModalCommanderFactionChart(games, canvas) {
    const commanderFactionStats = {};
    
    games.forEach(game => {
        [
            [game.commander1, game.faction1],
            [game.commander2, game.faction2]
        ].forEach(([commander, faction]) => {
            if (!commanderFactionStats[commander]) {
                commanderFactionStats[commander] = {};
            }
            commanderFactionStats[commander][faction] = (commanderFactionStats[commander][faction] || 0) + 1;
        });
    });
    
    // Get most played commanders and their primary factions
    const commanderPreferences = Object.entries(commanderFactionStats)
        .map(([commander, factions]) => {
            const totalGames = Object.values(factions).reduce((sum, count) => sum + count, 0);
            const primaryFaction = Object.entries(factions)
                .sort(([,a], [,b]) => b - a)[0];
            
            return {
                commander,
                totalGames,
                primaryFaction: primaryFaction[0],
                primaryCount: primaryFaction[1],
                percentage: (primaryFaction[1] / totalGames * 100).toFixed(1)
            };
        })
        .sort((a, b) => b.totalGames - a.totalGames);
    
    // Enforce minimum readable dimensions - never compress
    const MIN_BAR_HEIGHT = 35; // Minimum height per bar for readability
    const CHART_WIDTH = 1200; // Fixed comfortable width
    const PADDING = 100; // Top/bottom padding
    
    // Calculate height based on data - ensure every bar is readable
    const chartHeight = (commanderPreferences.length * MIN_BAR_HEIGHT) + PADDING;
    
    // Ensure the modal container can handle the full size
    const container = canvas.parentElement;
    container.style.width = `${CHART_WIDTH + 40}px`; // Extra padding
    container.style.minHeight = `${chartHeight}px`;
    
    // Set canvas to exact dimensions - no scaling allowed
    canvas.width = CHART_WIDTH;
    canvas.height = chartHeight;
    canvas.style.width = `${CHART_WIDTH}px`;
    canvas.style.height = `${chartHeight}px`;
    canvas.style.display = 'block';
    canvas.style.maxWidth = 'none';
    canvas.style.maxHeight = 'none';
    
    new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: commanderPreferences.map(c => `${c.commander} (${c.primaryFaction})`),
            datasets: [{
                label: 'Primary Faction Usage',
                data: commanderPreferences.map(c => c.primaryCount),
                backgroundColor: 'rgba(255, 193, 7, 0.8)',
                borderColor: 'rgba(255, 193, 7, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: false,
            maintainAspectRatio: false,
            resizeDelay: 0,
            animation: false,
            interaction: {
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    labels: { 
                        color: 'white',
                        font: { size: 16 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const prefs = commanderPreferences[context.dataIndex];
                            return [
                                `Primary Faction: ${prefs.primaryFaction}`,
                                `Games: ${prefs.primaryCount}/${prefs.totalGames}`,
                                `Percentage: ${prefs.percentage}%`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    type: 'category',
                    ticks: { 
                        color: 'white',
                        font: { size: 13 },
                        maxTicksLimit: false,
                        autoSkip: false,
                        padding: 8
                    },
                    grid: { 
                        color: 'rgba(255, 255, 255, 0.1)',
                        display: true
                    }
                },
                x: {
                    type: 'linear',
                    beginAtZero: true,
                    ticks: { 
                        color: 'white',
                        font: { size: 13 }
                    },
                    grid: { 
                        color: 'rgba(255, 255, 255, 0.1)',
                        display: true
                    }
                }
            },
            layout: {
                padding: {
                    top: 20,
                    bottom: 20,
                    left: 200, // More space for commander+faction names
                    right: 50
                }
            },
            elements: {
                bar: {
                    borderWidth: 1
                }
            }
        }
    });
}

function createModalFactionPerformanceChart(games, canvas) {
    const factionStats = {};
    
    games.forEach(game => {
        [game.faction1, game.faction2].forEach(faction => {
            if (!factionStats[faction]) {
                factionStats[faction] = { games: 0, wins: 0 };
            }
            factionStats[faction].games++;
            
            if ((game.winner === game.commander1 && faction === game.faction1) ||
                (game.winner === game.commander2 && faction === game.faction2)) {
                factionStats[faction].wins++;
            }
        });
    });
    
    const factionPerformance = Object.entries(factionStats)
        .map(([faction, stats]) => ({
            faction,
            winRate: (stats.wins / stats.games * 100).toFixed(1),
            games: stats.games,
            wins: stats.wins
        }))
        .sort((a, b) => b.winRate - a.winRate);
    
    // Enforce minimum readable dimensions - vertical layout for better readability
    const MIN_BAR_HEIGHT = 80; // Extra height for dual-axis chart
    const CHART_WIDTH = 1200; // Fixed comfortable width
    const PADDING = 150; // More padding for dual-axis
    
    // Calculate height based on data - ensure every bar is readable
    const chartHeight = (factionPerformance.length * MIN_BAR_HEIGHT) + PADDING;
    
    // Ensure the modal container can handle the full size
    const container = canvas.parentElement;
    container.style.width = `${CHART_WIDTH + 40}px`; // Extra padding
    container.style.minHeight = `${chartHeight}px`;
    
    // Set canvas to exact dimensions - no scaling allowed
    canvas.width = CHART_WIDTH;
    canvas.height = chartHeight;
    canvas.style.width = `${CHART_WIDTH}px`;
    canvas.style.height = `${chartHeight}px`;
    canvas.style.display = 'block';
    canvas.style.maxWidth = 'none';
    canvas.style.maxHeight = 'none';
    
    new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: factionPerformance.map(f => f.faction),
            datasets: [
                {
                    label: 'Win Rate (%)',
                    data: factionPerformance.map(f => f.winRate),
                    backgroundColor: 'rgba(220, 53, 69, 0.8)',
                    borderColor: 'rgba(220, 53, 69, 1)',
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    label: 'Total Games',
                    data: factionPerformance.map(f => f.games),
                    backgroundColor: 'rgba(108, 117, 125, 0.8)',
                    borderColor: 'rgba(108, 117, 125, 1)',
                    borderWidth: 1,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: false,
            maintainAspectRatio: false,
            resizeDelay: 0,
            animation: false,
            interaction: {
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    labels: { 
                        color: 'white',
                        font: { size: 16 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const faction = factionPerformance[context.dataIndex];
                            if (context.datasetIndex === 0) {
                                return `Win Rate: ${faction.winRate}% (${faction.wins}/${faction.games})`;
                            } else {
                                return `Total Games: ${faction.games}`;
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'category',
                    ticks: { 
                        color: 'white',
                        font: { size: 13 },
                        maxTicksLimit: false,
                        autoSkip: false
                    },
                    grid: { 
                        color: 'rgba(255, 255, 255, 0.1)',
                        display: true
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    ticks: { 
                        color: 'white',
                        font: { size: 13 }
                    },
                    grid: { 
                        color: 'rgba(255, 255, 255, 0.1)',
                        display: true
                    },
                    title: {
                        display: true,
                        text: 'Win Rate (%)',
                        color: 'white',
                        font: { size: 16 }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    ticks: { 
                        color: 'white',
                        font: { size: 13 }
                    },
                    grid: { 
                        drawOnChartArea: false
                    },
                    title: {
                        display: true,
                        text: 'Total Games',
                        color: 'white',
                        font: { size: 16 }
                    }
                }
            },
            layout: {
                padding: {
                    top: 30,
                    bottom: 30,
                    left: 80,
                    right: 80
                }
            },
            elements: {
                bar: {
                    borderWidth: 1
                }
            }
        }
    });
}

function createModalGameDurationChart(games, canvas) {
    const durationBuckets = {};
    
    games.forEach(game => {
        if (!game.time || game.time.trim() === '') return;
        
        try {
            const timeParts = game.time.split(':');
            if (timeParts.length >= 2) {
                const hours = parseInt(timeParts[0]) || 0;
                const minutes = parseInt(timeParts[1]) || 0;
                const totalMinutes = hours * 60 + minutes;
                
                // Create buckets in 10-minute intervals
                const bucket = Math.floor(totalMinutes / 10) * 10;
                const bucketLabel = `${Math.floor(bucket / 60)}:${(bucket % 60).toString().padStart(2, '0')} - ${Math.floor((bucket + 9) / 60)}:${((bucket + 9) % 60).toString().padStart(2, '0')}`;
                
                durationBuckets[bucketLabel] = (durationBuckets[bucketLabel] || 0) + 1;
            }
        } catch (e) {
            console.warn('Error parsing game time:', game.time, e);
        }
    });
    
    const sortedBuckets = Object.entries(durationBuckets)
        .sort(([a], [b]) => {
            const getMinutes = (label) => {
                const start = label.split(' - ')[0];
                const [hours, mins] = start.split(':').map(Number);
                return hours * 60 + mins;
            };
            return getMinutes(a) - getMinutes(b);
        });
    
    // Enforce minimum readable dimensions - horizontal layout for time
    const MIN_BAR_HEIGHT = 40; // Height for horizontal bars
    const CHART_WIDTH = 1200; // Fixed comfortable width
    const PADDING = 100; // Top/bottom padding
    
    // Calculate height based on data - ensure every bar is readable
    const chartHeight = Math.max(400, (sortedBuckets.length * MIN_BAR_HEIGHT) + PADDING);
    
    // Ensure the modal container can handle the full size
    const container = canvas.parentElement;
    container.style.width = `${CHART_WIDTH + 40}px`; // Extra padding
    container.style.minHeight = `${chartHeight}px`;
    
    // Set canvas to exact dimensions - no scaling allowed
    canvas.width = CHART_WIDTH;
    canvas.height = chartHeight;
    canvas.style.width = `${CHART_WIDTH}px`;
    canvas.style.height = `${chartHeight}px`;
    canvas.style.display = 'block';
    canvas.style.maxWidth = 'none';
    canvas.style.maxHeight = 'none';
    
    new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: sortedBuckets.map(([label]) => label),
            datasets: [{
                label: 'Number of Games',
                data: sortedBuckets.map(([,count]) => count),
                backgroundColor: 'rgba(108, 117, 125, 0.8)',
                borderColor: 'rgba(108, 117, 125, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: false,
            maintainAspectRatio: false,
            resizeDelay: 0,
            animation: false,
            interaction: {
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    labels: { 
                        color: 'white',
                        font: { size: 16 }
                    }
                }
            },
            scales: {
                x: {
                    type: 'category',
                    ticks: { 
                        color: 'white',
                        maxRotation: 45,
                        font: { size: 13 },
                        maxTicksLimit: false,
                        autoSkip: false
                    },
                    grid: { 
                        color: 'rgba(255, 255, 255, 0.1)',
                        display: true
                    }
                },
                y: {
                    type: 'linear',
                    beginAtZero: true,
                    ticks: { 
                        color: 'white',
                        font: { size: 13 }
                    },
                    grid: { 
                        color: 'rgba(255, 255, 255, 0.1)',
                        display: true
                    }
                }
            },
            layout: {
                padding: {
                    top: 30,
                    bottom: 30,
                    left: 60,
                    right: 40
                }
            },
            elements: {
                bar: {
                    borderWidth: 1
                }
            }
        }
    });
}

// Load player analysis with complete functionality
function loadPlayerAnalysis() {
    const games = getFilteredGames();
    const filterSelectElement = document.getElementById('filterSelect');
    const mainAnalysisElement = document.getElementById('mainAnalysis');
    
    if (!filterSelectElement || !mainAnalysisElement) {
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
    
    // Filter games for selected player
    const playerGames = games.filter(game => {
        if (game.commander1 === selectedPlayer || game.commander2 === selectedPlayer) return true;
        if (game.teamOne && game.teamOne.includes(selectedPlayer)) return true;
        if (game.teamTwo && game.teamTwo.includes(selectedPlayer)) return true;
        if (game.teamOneStraggler && game.teamOneStraggler.includes(selectedPlayer)) return true;
        if (game.teamTwoStraggler && game.teamTwoStraggler.includes(selectedPlayer)) return true;
        return false;
    });
    
    // Analyze player roles
    const roleStats = { Commander: 0, Thug: 0, Straggler: 0 };
    const winStats = { Commander: 0, Thug: 0, Total: 0 };
    
    playerGames.forEach(game => {
        let isCommander = false;
        let isStraggler = false;
        let won = false;
        
        if (game.commander1 === selectedPlayer) {
            isCommander = true;
            won = game.winner === selectedPlayer;
        } else if (game.commander2 === selectedPlayer) {
            isCommander = true;
            won = game.winner === selectedPlayer;
        } else {
            // Check if straggler
            if ((game.teamOneStraggler && game.teamOneStraggler.includes(selectedPlayer)) ||
                (game.teamTwoStraggler && game.teamTwoStraggler.includes(selectedPlayer))) {
                isStraggler = true;
            }
            
            // Check if won as teammate
            if (game.teamOne && game.teamOne.includes(selectedPlayer)) {
                won = game.winner === game.commander1;
            } else if (game.teamTwo && game.teamTwo.includes(selectedPlayer)) {
                won = game.winner === game.commander2;
            }
        }
        
        if (isCommander) {
            roleStats.Commander++;
            if (won) winStats.Commander++;
        } else if (isStraggler) {
            roleStats.Straggler++;
        } else {
            roleStats.Thug++;
            if (won) winStats.Thug++;
        }
        
        if (won) winStats.Total++;
    });
    
    const winRate = playerGames.length > 0 ? ((winStats.Total / playerGames.length) * 100).toFixed(1) : '0.0';
    const commanderWinRate = roleStats.Commander > 0 ? ((winStats.Commander / roleStats.Commander) * 100).toFixed(1) : '0.0';
    const thugWinRate = roleStats.Thug > 0 ? ((winStats.Thug / roleStats.Thug) * 100).toFixed(1) : '0.0';
    
    mainAnalysisElement.innerHTML = `
        <div class="row">
            <!-- Player Profile Card -->
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
                                    <h3 class="text-success">${roleStats.Commander}</h3>
                                    <p>As Commander</p>
                                    <small class="text-muted">${winStats.Commander} wins</small>
                                </div>
                            </div>
                            <div class="col-md-2">
                                <div class="text-center">
                                    <h3 class="text-info">${roleStats.Thug}</h3>
                                    <p>As Thug</p>
                                    <small class="text-muted">${winStats.Thug} wins</small>
                                </div>
                            </div>
                            <div class="col-md-2">
                                <div class="text-center">
                                    <h3 class="text-warning">${winStats.Total}</h3>
                                    <p>Total Wins</p>
                                    <small class="text-muted">${winRate}% rate</small>
                                </div>
                            </div>
                            <div class="col-md-2">
                                <div class="text-center">
                                    <h3 class="text-danger">${roleStats.Straggler}</h3>
                                    <p>AFK Games</p>
                                    <small class="text-muted">${((roleStats.Straggler / playerGames.length) * 100).toFixed(1)}% rate</small>
                                </div>
                            </div>
                            <div class="col-md-2">
                                <div class="text-center">
                                    <h3 class="text-secondary">${commanderWinRate}%</h3>
                                    <p>Commander Win Rate</p>
                                    <small class="text-muted">${thugWinRate}% as thug</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Win Rate by Map -->
            <div class="col-lg-6 mb-4">
                <div class="card bg-dark border-secondary">
                    <div class="card-header bg-success text-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Win Rate by Map</h5>
                        <button class="btn btn-sm btn-outline-light maximize-chart" data-chart-type="playerMapWinRate" data-chart-title="${selectedPlayer} - Win Rate by Map">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="card-body">
                        <canvas id="playerMapWinRateChart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Win Rate by Faction -->
            <div class="col-lg-6 mb-4">
                <div class="card bg-dark border-secondary">
                    <div class="card-header bg-info text-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Win Rate by Faction</h5>
                        <button class="btn btn-sm btn-outline-light maximize-chart" data-chart-type="playerFactionWinRate" data-chart-title="${selectedPlayer} - Win Rate by Faction">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="card-body">
                        <canvas id="playerFactionWinRateChart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Game Duration Distribution -->
            <div class="col-lg-6 mb-4">
                <div class="card bg-dark border-secondary">
                    <div class="card-header bg-warning text-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Game Duration Distribution</h5>
                        <button class="btn btn-sm btn-outline-light maximize-chart" data-chart-type="playerGameDuration" data-chart-title="${selectedPlayer} - Game Duration Distribution">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="card-body">
                        <canvas id="playerGameDurationChart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Team Size Distribution -->
            <div class="col-lg-6 mb-4">
                <div class="card bg-dark border-secondary">
                    <div class="card-header bg-purple text-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Team Size Distribution</h5>
                        <button class="btn btn-sm btn-outline-light maximize-chart" data-chart-type="playerTeamSize" data-chart-title="${selectedPlayer} - Team Size Distribution">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="card-body">
                        <canvas id="playerTeamSizeChart"></canvas>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Create all player analysis charts
    createPlayerMapWinRateChart(playerGames, selectedPlayer);
    createPlayerFactionWinRateChart(playerGames, selectedPlayer);
    createPlayerGameDurationChart(playerGames, selectedPlayer);
    createPlayerTeamSizeChart(playerGames, selectedPlayer);
    
    // Add event listeners for maximize buttons
    document.querySelectorAll('.maximize-chart').forEach(button => {
        button.addEventListener('click', (e) => {
            const chartType = e.currentTarget.dataset.chartType;
            const chartTitle = e.currentTarget.dataset.chartTitle;
            showModalChart(playerGames, chartType, chartTitle, selectedPlayer);
        });
    });
}

// Create player map win rate chart
function createPlayerMapWinRateChart(games, player) {
    const mapStats = {};
    
    games.forEach(game => {
        if (!mapStats[game.map]) {
            mapStats[game.map] = { games: 0, wins: 0 };
        }
        mapStats[game.map].games++;
        
        let won = false;
        if (game.commander1 === player) {
            won = game.winner === player;
        } else if (game.commander2 === player) {
            won = game.winner === player;
        } else {
            if (game.teamOne && game.teamOne.includes(player)) {
                won = game.winner === game.commander1;
            } else if (game.teamTwo && game.teamTwo.includes(player)) {
                won = game.winner === game.commander2;
            }
        }
        
        if (won) mapStats[game.map].wins++;
    });
    
    const mapPerformance = Object.entries(mapStats)
        .map(([map, stats]) => ({
            map,
            winRate: (stats.wins / stats.games * 100).toFixed(1),
            games: stats.games,
            wins: stats.wins
        }))
        .sort((a, b) => b.games - a.games)
        .slice(0, 10);
    
    safeCreateChart('playerMapWinRateChart', {
        type: 'bar',
        data: {
            labels: mapPerformance.map(m => m.map),
            datasets: [
                {
                    label: 'Win Rate (%)',
                    data: mapPerformance.map(m => m.winRate),
                    backgroundColor: 'rgba(25, 135, 84, 0.8)',
                    borderColor: 'rgba(25, 135, 84, 1)',
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    label: 'Games Played',
                    data: mapPerformance.map(m => m.games),
                    backgroundColor: 'rgba(108, 117, 125, 0.8)',
                    borderColor: 'rgba(108, 117, 125, 1)',
                    borderWidth: 1,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            maxBarThickness: 25,
            plugins: {
                legend: {
                    labels: { color: 'white' }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const map = mapPerformance[context.dataIndex];
                            if (context.datasetIndex === 0) {
                                return `Win Rate: ${map.winRate}% (${map.wins}/${map.games})`;
                            } else {
                                return `Games Played: ${map.games}`;
                            }
                        }
                    }
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
                    beginAtZero: true,
                    max: 100,
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    title: {
                        display: true,
                        text: 'Win Rate (%)',
                        color: 'white'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    ticks: { color: 'white' },
                    grid: { drawOnChartArea: false },
                    title: {
                        display: true,
                        text: 'Games Played',
                        color: 'white'
                    }
                }
            }
        }
    });
}

// Create player faction win rate chart
function createPlayerFactionWinRateChart(games, player) {
    const factionStats = {};
    
    games.forEach(game => {
        let faction = null;
        let won = false;
        
        if (game.commander1 === player) {
            faction = game.faction1;
            won = game.winner === player;
        } else if (game.commander2 === player) {
            faction = game.faction2;
            won = game.winner === player;
        } else {
            if (game.teamOne && game.teamOne.includes(player)) {
                faction = game.faction1;
                won = game.winner === game.commander1;
            } else if (game.teamTwo && game.teamTwo.includes(player)) {
                faction = game.faction2;
                won = game.winner === game.commander2;
            }
        }
        
        if (faction) {
            if (!factionStats[faction]) {
                factionStats[faction] = { games: 0, wins: 0 };
            }
            factionStats[faction].games++;
            if (won) factionStats[faction].wins++;
        }
    });
    
    const factionPerformance = Object.entries(factionStats)
        .map(([faction, stats]) => ({
            faction,
            winRate: (stats.wins / stats.games * 100).toFixed(1),
            games: stats.games,
            wins: stats.wins
        }))
        .sort((a, b) => b.games - a.games);
    
    safeCreateChart('playerFactionWinRateChart', {
        type: 'bar',
        data: {
            labels: factionPerformance.map(f => f.faction),
            datasets: [
                {
                    label: 'Win Rate (%)',
                    data: factionPerformance.map(f => f.winRate),
                    backgroundColor: 'rgba(13, 202, 240, 0.8)',
                    borderColor: 'rgba(13, 202, 240, 1)',
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    label: 'Games Played',
                    data: factionPerformance.map(f => f.games),
                    backgroundColor: 'rgba(108, 117, 125, 0.8)',
                    borderColor: 'rgba(108, 117, 125, 1)',
                    borderWidth: 1,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            maxBarThickness: 25,
            plugins: {
                legend: {
                    labels: { color: 'white' }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const faction = factionPerformance[context.dataIndex];
                            if (context.datasetIndex === 0) {
                                return `Win Rate: ${faction.winRate}% (${faction.wins}/${faction.games})`;
                            } else {
                                return `Games Played: ${faction.games}`;
                            }
                        }
                    }
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
                    beginAtZero: true,
                    max: 100,
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    title: {
                        display: true,
                        text: 'Win Rate (%)',
                        color: 'white'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    ticks: { color: 'white' },
                    grid: { drawOnChartArea: false },
                    title: {
                        display: true,
                        text: 'Games Played',
                        color: 'white'
                    }
                }
            }
        }
    });
}

// Create player game duration chart
function createPlayerGameDurationChart(games, player) {
    const durationBuckets = {};
    
    games.forEach(game => {
        if (!game.time || game.time.trim() === '') return;
        
        try {
            const timeParts = game.time.split(':');
            if (timeParts.length >= 2) {
                const hours = parseInt(timeParts[0]) || 0;
                const minutes = parseInt(timeParts[1]) || 0;
                const totalMinutes = hours * 60 + minutes;
                
                // Create buckets in 10-minute intervals
                const bucket = Math.floor(totalMinutes / 10) * 10;
                const bucketLabel = `${Math.floor(bucket / 60)}:${(bucket % 60).toString().padStart(2, '0')} - ${Math.floor((bucket + 9) / 60)}:${((bucket + 9) % 60).toString().padStart(2, '0')}`;
                
                durationBuckets[bucketLabel] = (durationBuckets[bucketLabel] || 0) + 1;
            }
        } catch (e) {
            console.warn('Error parsing game time:', game.time, e);
        }
    });
    
    const sortedBuckets = Object.entries(durationBuckets)
        .sort(([a], [b]) => {
            const getMinutes = (label) => {
                const start = label.split(' - ')[0];
                const [hours, mins] = start.split(':').map(Number);
                return hours * 60 + mins;
            };
            return getMinutes(a) - getMinutes(b);
        });
    
    safeCreateChart('playerGameDurationChart', {
        type: 'bar',
        data: {
            labels: sortedBuckets.map(([label]) => label),
            datasets: [{
                label: 'Number of Games',
                data: sortedBuckets.map(([,count]) => count),
                backgroundColor: 'rgba(255, 193, 7, 0.8)',
                borderColor: 'rgba(255, 193, 7, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            maxBarThickness: 25,
            plugins: {
                legend: {
                    labels: { color: 'white' }
                }
            },
            scales: {
                x: {
                    ticks: { 
                        color: 'white',
                        maxRotation: 45
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

// Create player team size chart
function createPlayerTeamSizeChart(games, player) {
    const teamSizeStats = {};
    
    games.forEach(game => {
        const teamSize = game.totalPlayers;
        if (!teamSizeStats[teamSize]) {
            teamSizeStats[teamSize] = { games: 0, wins: 0 };
        }
        teamSizeStats[teamSize].games++;
        
        let won = false;
        if (game.commander1 === player) {
            won = game.winner === player;
        } else if (game.commander2 === player) {
            won = game.winner === player;
        } else {
            if (game.teamOne && game.teamOne.includes(player)) {
                won = game.winner === game.commander1;
            } else if (game.teamTwo && game.teamTwo.includes(player)) {
                won = game.winner === game.commander2;
            }
        }
        
        if (won) teamSizeStats[teamSize].wins++;
    });
    
    const teamSizePerformance = Object.entries(teamSizeStats)
        .map(([size, stats]) => ({
            size: parseInt(size),
            winRate: (stats.wins / stats.games * 100).toFixed(1),
            games: stats.games,
            wins: stats.wins
        }))
        .sort((a, b) => a.size - b.size);
    
    safeCreateChart('playerTeamSizeChart', {
        type: 'bar',
        data: {
            labels: teamSizePerformance.map(t => `${t.size} Players`),
            datasets: [
                {
                    label: 'Win Rate (%)',
                    data: teamSizePerformance.map(t => t.winRate),
                    backgroundColor: 'rgba(111, 66, 193, 0.8)',
                    borderColor: 'rgba(111, 66, 193, 1)',
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    label: 'Games Played',
                    data: teamSizePerformance.map(t => t.games),
                    backgroundColor: 'rgba(108, 117, 125, 0.8)',
                    borderColor: 'rgba(108, 117, 125, 1)',
                    borderWidth: 1,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            maxBarThickness: 25,
            plugins: {
                legend: {
                    labels: { color: 'white' }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const teamSize = teamSizePerformance[context.dataIndex];
                            if (context.datasetIndex === 0) {
                                return `Win Rate: ${teamSize.winRate}% (${teamSize.wins}/${teamSize.games})`;
                            } else {
                                return `Games Played: ${teamSize.games}`;
                            }
                        }
                    }
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
                    beginAtZero: true,
                    max: 100,
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    title: {
                        display: true,
                        text: 'Win Rate (%)',
                        color: 'white'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    ticks: { color: 'white' },
                    grid: { drawOnChartArea: false },
                    title: {
                        display: true,
                        text: 'Games Played',
                        color: 'white'
                    }
                }
            }
        }
    });
}

// Load map analysis
function loadMapAnalysis() {
    const games = getFilteredGames();
    const filterSelectElement = document.getElementById('filterSelect');
    const mainAnalysisElement = document.getElementById('mainAnalysis');
    
    if (!filterSelectElement || !mainAnalysisElement) {
        return;
    }
    
    const selectedMap = filterSelectElement.value;
    updateSummaryStats(games);
    
    if (!selectedMap) {
        mainAnalysisElement.innerHTML = `
            <div class="alert alert-info">
                <h5>Map Analysis</h5>
                <p>Select a map from the filter dropdown to view detailed analysis.</p>
            </div>
        `;
        return;
    }
    
    // Filter games for selected map
    const mapGames = games.filter(game => game.map === selectedMap);
    
    mainAnalysisElement.innerHTML = `
        <div class="row">
            <!-- Map Profile Card -->
            <div class="col-12 mb-4">
                <div class="card bg-dark border-secondary">
                    <div class="card-header bg-primary text-white">
                        <h4 class="mb-0">${selectedMap} - Map Profile</h4>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-3">
                                <div class="text-center">
                                    <h3 class="text-primary">${mapGames.length}</h3>
                                    <p>Total Games</p>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="text-center">
                                    <h3 class="text-success">${((mapGames.filter(g => g.winner === g.commander1).length / mapGames.length) * 100).toFixed(1)}%</h3>
                                    <p>Team 1 Win Rate</p>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="text-center">
                                    <h3 class="text-info">${((mapGames.filter(g => g.winner === g.commander2).length / mapGames.length) * 100).toFixed(1)}%</h3>
                                    <p>Team 2 Win Rate</p>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="text-center">
                                    <h3 class="text-warning">${(mapGames.reduce((acc, g) => acc + (g.time ? parseInt(g.time) : 0), 0) / mapGames.length).toFixed(1)}</h3>
                                    <p>Avg Game Time</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Faction Performance -->
            <div class="col-lg-6 mb-4">
                <div class="card bg-dark border-secondary">
                    <div class="card-header bg-success text-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Faction Performance</h5>
                        <button class="btn btn-sm btn-outline-light maximize-chart" data-chart-type="mapFactionPerformance" data-chart-title="${selectedMap} - Faction Performance">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="card-body">
                        <canvas id="mapFactionPerformanceChart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Game Duration Distribution -->
            <div class="col-lg-6 mb-4">
                <div class="card bg-dark border-secondary">
                    <div class="card-header bg-info text-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Game Duration Distribution</h5>
                        <button class="btn btn-sm btn-outline-light maximize-chart" data-chart-type="mapGameDuration" data-chart-title="${selectedMap} - Game Duration">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="card-body">
                        <canvas id="mapGameDurationChart"></canvas>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Create map analysis charts
    createMapFactionPerformanceChart(mapGames, selectedMap);
    createMapGameDurationChart(mapGames, selectedMap);
    
    // Add event listeners for maximize buttons
    document.querySelectorAll('.maximize-chart').forEach(button => {
        button.addEventListener('click', (e) => {
            const chartType = e.currentTarget.dataset.chartType;
            const chartTitle = e.currentTarget.dataset.chartTitle;
            showModalChart(mapGames, chartType, chartTitle, selectedMap);
        });
    });
}

// Load faction analysis
function loadFactionAnalysis() {
    const games = getFilteredGames();
    const filterSelectElement = document.getElementById('filterSelect');
    const mainAnalysisElement = document.getElementById('mainAnalysis');
    
    if (!filterSelectElement || !mainAnalysisElement) {
        return;
    }
    
    const selectedFaction = filterSelectElement.value;
    updateSummaryStats(games);
    
    if (!selectedFaction) {
        mainAnalysisElement.innerHTML = `
            <div class="alert alert-info">
                <h5>Faction Analysis</h5>
                <p>Select a faction from the filter dropdown to view detailed analysis.</p>
            </div>
        `;
        return;
    }
    
    // Filter games for selected faction
    const factionGames = games.filter(game => game.faction1 === selectedFaction || game.faction2 === selectedFaction);
    
    mainAnalysisElement.innerHTML = `
        <div class="row">
            <!-- Faction Profile Card -->
            <div class="col-12 mb-4">
                <div class="card bg-dark border-secondary">
                    <div class="card-header bg-primary text-white">
                        <h4 class="mb-0">${selectedFaction} - Faction Profile</h4>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-3">
                                <div class="text-center">
                                    <h3 class="text-primary">${factionGames.length}</h3>
                                    <p>Total Games</p>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="text-center">
                                    <h3 class="text-success">${((factionGames.filter(g => (g.faction1 === selectedFaction && g.winner === g.commander1) || (g.faction2 === selectedFaction && g.winner === g.commander2)).length / factionGames.length) * 100).toFixed(1)}%</h3>
                                    <p>Win Rate</p>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="text-center">
                                    <h3 class="text-info">${((factionGames.filter(g => g.faction1 === selectedFaction).length / factionGames.length) * 100).toFixed(1)}%</h3>
                                    <p>Team 1 Rate</p>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="text-center">
                                    <h3 class="text-warning">${(factionGames.reduce((acc, g) => acc + (g.time ? parseInt(g.time) : 0), 0) / factionGames.length).toFixed(1)}</h3>
                                    <p>Avg Game Time</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Map Performance -->
            <div class="col-lg-6 mb-4">
                <div class="card bg-dark border-secondary">
                    <div class="card-header bg-success text-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Map Performance</h5>
                        <button class="btn btn-sm btn-outline-light maximize-chart" data-chart-type="factionMapPerformance" data-chart-title="${selectedFaction} - Map Performance">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="card-body">
                        <canvas id="factionMapPerformanceChart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Game Duration Distribution -->
            <div class="col-lg-6 mb-4">
                <div class="card bg-dark border-secondary">
                    <div class="card-header bg-info text-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Game Duration Distribution</h5>
                        <button class="btn btn-sm btn-outline-light maximize-chart" data-chart-type="factionGameDuration" data-chart-title="${selectedFaction} - Game Duration">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="card-body">
                        <canvas id="factionGameDurationChart"></canvas>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Create faction analysis charts
    createFactionMapPerformanceChart(factionGames, selectedFaction);
    createFactionGameDurationChart(factionGames, selectedFaction);
    
    // Add event listeners for maximize buttons
    document.querySelectorAll('.maximize-chart').forEach(button => {
        button.addEventListener('click', (e) => {
            const chartType = e.currentTarget.dataset.chartType;
            const chartTitle = e.currentTarget.dataset.chartTitle;
            showModalChart(factionGames, chartType, chartTitle, selectedFaction);
        });
    });
}

// Create map faction performance chart
function createMapFactionPerformanceChart(games, map) {
    const factionStats = {};
    
    games.forEach(game => {
        if (game.faction1) {
            if (!factionStats[game.faction1]) {
                factionStats[game.faction1] = { games: 0, wins: 0 };
            }
            factionStats[game.faction1].games++;
            if (game.winner === game.commander1) {
                factionStats[game.faction1].wins++;
            }
        }
        if (game.faction2) {
            if (!factionStats[game.faction2]) {
                factionStats[game.faction2] = { games: 0, wins: 0 };
            }
            factionStats[game.faction2].games++;
            if (game.winner === game.commander2) {
                factionStats[game.faction2].wins++;
            }
        }
    });
    
    const factionPerformance = Object.entries(factionStats)
        .map(([faction, stats]) => ({
            faction,
            games: stats.games,
            winRate: (stats.wins / stats.games) * 100
        }))
        .sort((a, b) => b.winRate - a.winRate);
    
    safeCreateChart('mapFactionPerformanceChart', {
        type: 'bar',
        data: {
            labels: factionPerformance.map(f => f.faction),
            datasets: [
                {
                    label: 'Win Rate (%)',
                    data: factionPerformance.map(f => f.winRate),
                    backgroundColor: 'rgba(25, 135, 84, 0.8)',
                    borderColor: 'rgba(25, 135, 84, 1)',
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    label: 'Games Played',
                    data: factionPerformance.map(f => f.games),
                    backgroundColor: 'rgba(108, 117, 125, 0.8)',
                    borderColor: 'rgba(108, 117, 125, 1)',
                    borderWidth: 1,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            maxBarThickness: 25,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Win Rate (%)',
                        color: 'white'
                    },
                    ticks: { color: 'white' },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Games Played',
                        color: 'white'
                    },
                    ticks: { color: 'white' },
                    grid: {
                        drawOnChartArea: false
                    }
                },
                x: {
                    ticks: { color: 'white' },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: { color: 'white' }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            return `${label}: ${value.toFixed(1)}${label.includes('Rate') ? '%' : ''}`;
                        }
                    }
                }
            }
        }
    });
}

// Create map game duration chart
function createMapGameDurationChart(games, map) {
    const durationStats = {};
    
    games.forEach(game => {
        if (game.time) {
            const duration = parseInt(game.time);
            if (!isNaN(duration)) {
                const key = Math.floor(duration / 5) * 5;
                if (!durationStats[key]) {
                    durationStats[key] = 0;
                }
                durationStats[key]++;
            }
        }
    });
    
    const sortedDurations = Object.entries(durationStats)
        .map(([duration, count]) => ({
            duration: parseInt(duration),
            count
        }))
        .sort((a, b) => a.duration - b.duration);
    
    safeCreateChart('mapGameDurationChart', {
        type: 'bar',
        data: {
            labels: sortedDurations.map(d => `${d.duration}-${d.duration + 4} min`),
            datasets: [{
                label: 'Number of Games',
                data: sortedDurations.map(d => d.count),
                backgroundColor: 'rgba(13, 202, 240, 0.8)',
                borderColor: 'rgba(13, 202, 240, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            maxBarThickness: 25,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Games',
                        color: 'white'
                    },
                    ticks: { color: 'white' },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Game Duration',
                        color: 'white'
                    },
                    ticks: { color: 'white' },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: { color: 'white' }
                }
            }
        }
    });
}

// Create faction map performance chart
function createFactionMapPerformanceChart(games, faction) {
    const mapStats = {};
    
    games.forEach(game => {
        if (!mapStats[game.map]) {
            mapStats[game.map] = { games: 0, wins: 0 };
        }
        mapStats[game.map].games++;
        if ((game.faction1 === faction && game.winner === game.commander1) ||
            (game.faction2 === faction && game.winner === game.commander2)) {
            mapStats[game.map].wins++;
        }
    });
    
    const mapPerformance = Object.entries(mapStats)
        .map(([map, stats]) => ({
            map,
            games: stats.games,
            winRate: (stats.wins / stats.games) * 100
        }))
        .sort((a, b) => b.winRate - a.winRate);
    
    safeCreateChart('factionMapPerformanceChart', {
        type: 'bar',
        data: {
            labels: mapPerformance.map(m => m.map),
            datasets: [
                {
                    label: 'Win Rate (%)',
                    data: mapPerformance.map(m => m.winRate),
                    backgroundColor: 'rgba(25, 135, 84, 0.8)',
                    borderColor: 'rgba(25, 135, 84, 1)',
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    label: 'Games Played',
                    data: mapPerformance.map(m => m.games),
                    backgroundColor: 'rgba(108, 117, 125, 0.8)',
                    borderColor: 'rgba(108, 117, 125, 1)',
                    borderWidth: 1,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            maxBarThickness: 25,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Win Rate (%)',
                        color: 'white'
                    },
                    ticks: { color: 'white' },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Games Played',
                        color: 'white'
                    },
                    ticks: { color: 'white' },
                    grid: {
                        drawOnChartArea: false
                    }
                },
                x: {
                    ticks: { color: 'white' },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: { color: 'white' }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            return `${label}: ${value.toFixed(1)}${label.includes('Rate') ? '%' : ''}`;
                        }
                    }
                }
            }
        }
    });
}

// Create faction game duration chart
function createFactionGameDurationChart(games, faction) {
    const durationStats = {};
    
    games.forEach(game => {
        if (game.time) {
            const duration = parseInt(game.time);
            if (!isNaN(duration)) {
                const key = Math.floor(duration / 5) * 5;
                if (!durationStats[key]) {
                    durationStats[key] = 0;
                }
                durationStats[key]++;
            }
        }
    });
    
    const sortedDurations = Object.entries(durationStats)
        .map(([duration, count]) => ({
            duration: parseInt(duration),
            count
        }))
        .sort((a, b) => a.duration - b.duration);
    
    safeCreateChart('factionGameDurationChart', {
        type: 'bar',
        data: {
            labels: sortedDurations.map(d => `${d.duration}-${d.duration + 4} min`),
            datasets: [{
                label: 'Number of Games',
                data: sortedDurations.map(d => d.count),
                backgroundColor: 'rgba(13, 202, 240, 0.8)',
                borderColor: 'rgba(13, 202, 240, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            maxBarThickness: 25,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Games',
                        color: 'white'
                    },
                    ticks: { color: 'white' },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Game Duration',
                        color: 'white'
                    },
                    ticks: { color: 'white' },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: { color: 'white' }
                }
            }
        }
    });
}

function createModalFactionDistributionChart(games, canvas) {
    const factionStats = {};
    
    // Count each faction selection (both faction1 and faction2 from each game)
    games.forEach(game => {
        [game.faction1, game.faction2].forEach(faction => {
            if (faction) {
                factionStats[faction] = (factionStats[faction] || 0) + 1;
            }
        });
    });
    
    // Sort factions by count and get totals
    const sortedFactions = Object.entries(factionStats)
        .sort(([,a], [,b]) => b - a);
    
    const totalSelections = Object.values(factionStats).reduce((sum, count) => sum + count, 0);
    
    // Define faction colors to match gaming theme
    const factionColors = {
        'I.S.D.F': 'rgba(13, 110, 253, 0.9)',    // Blue for ISDF
        'Scion': 'rgba(255, 193, 7, 0.9)',       // Yellow/Orange for Scion  
        'Hadean': 'rgba(220, 53, 69, 0.9)'       // Red for Hadean
    };
    
    // Fixed dimensions for stacked bar chart
    const CHART_WIDTH = 1200;
    const CHART_HEIGHT = 400; // Fixed height for horizontal stacked bar
    
    // Ensure the modal container can handle the full size
    const container = canvas.parentElement;
    container.style.width = `${CHART_WIDTH + 40}px`;
    container.style.minHeight = `${CHART_HEIGHT}px`;
    
    // Set canvas to exact dimensions
    canvas.width = CHART_WIDTH;
    canvas.height = CHART_HEIGHT;
    canvas.style.width = `${CHART_WIDTH}px`;
    canvas.style.height = `${CHART_HEIGHT}px`;
    canvas.style.display = 'block';
    canvas.style.maxWidth = 'none';
    canvas.style.maxHeight = 'none';
    
    new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Faction Choice Distribution'],
            datasets: sortedFactions.map(([faction, count]) => ({
                label: faction,
                data: [count],
                backgroundColor: factionColors[faction] || 'rgba(108, 117, 125, 0.9)',
                borderColor: factionColors[faction] || 'rgba(108, 117, 125, 1)',
                borderWidth: 1
            }))
        },
        options: {
            indexAxis: 'y',
            responsive: false,
            maintainAspectRatio: false,
            resizeDelay: 0,
            animation: false,
            interaction: {
                intersect: false
            },
            scales: {
                x: {
                    stacked: true,
                    beginAtZero: true,
                    max: totalSelections,
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    stacked: true,
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            },
            plugins: {
                legend: {
                    labels: { 
                        color: 'white',
                        padding: 8,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        font: { size: 11 }
                    },
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        title: function() {
                            return `Faction Choice Distribution (${totalSelections} total)`;
                        },
                        label: function(context) {
                            const count = context.parsed.x;
                            const percentage = ((count / totalSelections) * 100).toFixed(1);
                            return `${context.dataset.label}: ${count} selections (${percentage}%)`;
                        }
                    }
                },
                datalabels: {
                    display: true,
                    color: 'white',
                    font: {
                        weight: 'bold',
                        size: 16
                    },
                    formatter: function(value, context) {
                        if (value > 0) {
                            return value;
                        }
                        return '';
                    },
                    anchor: 'center',
                    align: 'center'
                }
            },
            layout: {
                padding: {
                    top: 2,
                    bottom: 2,
                    left: 20,
                    right: 20
                }
            }
        },
        plugins: []
    });
}

function createModalFactionPerformanceChart(games, canvas) {
    const factionStats = {};
    
    games.forEach(game => {
        [game.faction1, game.faction2].forEach(faction => {
            if (!factionStats[faction]) {
                factionStats[faction] = { games: 0, wins: 0 };
            }
            factionStats[faction].games++;
            
            if ((game.winner === game.commander1 && faction === game.faction1) ||
                (game.winner === game.commander2 && faction === game.faction2)) {
                factionStats[faction].wins++;
            }
        });
    });
    
    const factionPerformance = Object.entries(factionStats)
        .map(([faction, stats]) => ({
            faction,
            winRate: (stats.wins / stats.games * 100).toFixed(1),
            games: stats.games,
            wins: stats.wins
        }))
        .sort((a, b) => b.winRate - a.winRate);
    
    // Enforce minimum readable dimensions - vertical layout for better readability
    const MIN_BAR_HEIGHT = 80; // Extra height for dual-axis chart
    const CHART_WIDTH = 1200; // Fixed comfortable width
    const PADDING = 150; // More padding for dual-axis
    
    // Calculate height based on data - ensure every bar is readable
    const chartHeight = (factionPerformance.length * MIN_BAR_HEIGHT) + PADDING;
    
    // Ensure the modal container can handle the full size
    const container = canvas.parentElement;
    container.style.width = `${CHART_WIDTH + 40}px`; // Extra padding
    container.style.minHeight = `${chartHeight}px`;
    
    // Set canvas to exact dimensions - no scaling allowed
    canvas.width = CHART_WIDTH;
    canvas.height = chartHeight;
    canvas.style.width = `${CHART_WIDTH}px`;
    canvas.style.height = `${chartHeight}px`;
    canvas.style.display = 'block';
    canvas.style.maxWidth = 'none';
    canvas.style.maxHeight = 'none';
    
    new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: factionPerformance.map(f => f.faction),
            datasets: [
                {
                    label: 'Win Rate (%)',
                    data: factionPerformance.map(f => f.winRate),
                    backgroundColor: 'rgba(220, 53, 69, 0.8)',
                    borderColor: 'rgba(220, 53, 69, 1)',
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    label: 'Total Games',
                    data: factionPerformance.map(f => f.games),
                    backgroundColor: 'rgba(108, 117, 125, 0.8)',
                    borderColor: 'rgba(108, 117, 125, 1)',
                    borderWidth: 1,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: false,
            maintainAspectRatio: false,
            resizeDelay: 0,
            animation: false,
            interaction: {
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    labels: { 
                        color: 'white',
                        font: { size: 16 }
                    }
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return context[0].dataset.label;
                        },
                        label: function(context) {
                            const count = context.parsed.x;
                            return `Selections: ${count}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'category',
                    ticks: { 
                        color: 'white',
                        font: { size: 13 },
                        maxTicksLimit: false,
                        autoSkip: false
                    },
                    grid: { 
                        color: 'rgba(255, 255, 255, 0.1)',
                        display: true
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    ticks: { 
                        color: 'white',
                        font: { size: 13 }
                    },
                    grid: { 
                        color: 'rgba(255, 255, 255, 0.1)',
                        display: true
                    },
                    title: {
                        display: true,
                        text: 'Win Rate (%)',
                        color: 'white',
                        font: { size: 16 }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    ticks: { 
                        color: 'white',
                        font: { size: 13 }
                    },
                    grid: { 
                        drawOnChartArea: false
                    },
                    title: {
                        display: true,
                        text: 'Total Games',
                        color: 'white',
                        font: { size: 16 }
                    }
                }
            },
            layout: {
                padding: {
                    top: 30,
                    bottom: 30,
                    left: 80,
                    right: 80
                }
            },
            elements: {
                bar: {
                    borderWidth: 1
                }
            }
        }
    });
}

// Wait for DOM to be ready, then load data
document.addEventListener('DOMContentLoaded', function() {
    // Check if required dependencies are loaded
    if (typeof Chart === 'undefined') {
        console.error('Chart.js not loaded');
        return;
    }
    
    if (typeof bootstrap === 'undefined') {
        console.error('Bootstrap not loaded');
        return;
    }
    
    // Add missing CSS class
    const style = document.createElement('style');
    style.textContent = `
        .bg-purple {
            background-color: #6f42c1 !important;
        }
        .bg-success-dark {
            background-color: #146c43 !important;
        }
    `;
    document.head.appendChild(style);
    
    console.log('🎉 General Overview Features Restored! 🎉');
    console.log('✅ All 6 comprehensive charts with maximization');
    console.log('✅ Sophisticated ranking algorithms (Wilson, Bayesian, etc.)');
    console.log('✅ Advanced summary statistics');
    console.log('✅ Chart maximization with full data display');
    console.log('✅ Scrollable modal charts');
    console.log('✅ Complete Player Analysis functionality');
    
    // Load the game data
    loadGameData();
}); 