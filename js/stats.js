// Global variables
let gameData = null;
let allGames = [];

// PERFORMANCE OPTIMIZATION: Detect device capabilities
const performanceConfig = {
    isLowEndDevice: () => {
        // Detect based on available memory, cores, and performance
        const memory = navigator.deviceMemory || 4; // Default to 4GB if not supported
        const cores = navigator.hardwareConcurrency || 4;
        const isSlowDevice = memory <= 2 || cores <= 2;
        
        // Also check if user has enabled reduced motion
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        return isSlowDevice || prefersReducedMotion;
    },
    shouldUseAnimations: function() {
        return !this.isLowEndDevice();
    },
    getOptimalAnimationDuration: function() {
        return this.isLowEndDevice() ? 200 : 800;
    }
};

// Chart cache to avoid recreating identical charts
const chartCache = new Map();

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

// Enhanced animation configurations - OPTIMIZED
const chartAnimations = {
    standard: {
        duration: 1000, // Reduced from 2000
        easing: 'easeOutQuart',
        delay: (context) => context.dataIndex * 50, // Reduced from 100
        // Removed heavy onProgress callback that was causing performance issues
        onComplete: (animation) => {
            const chart = animation.chart;
            addChartGlowEffect(chart);
        }
    },
    staggered: {
        duration: 1500, // Reduced from 2500
        easing: 'easeOutCubic', // Less intensive easing
        delay: (context) => context.dataIndex * 75, // Reduced from 150
    },
    smooth: {
        duration: 800, // Reduced from 1500
        easing: 'easeInOutCubic'
    }
};

// ==================== UTILITY FUNCTIONS ====================
// Extract common game duration parsing logic
function parseGameDuration(timeString) {
    if (!timeString || timeString.trim() === '') return null;
    
    try {
        const timeParts = timeString.split(':');
        let totalMinutes = 0;
        
        if (timeParts.length === 2) {
            // Format: mm:ss (minutes:seconds)
            const minutes = parseInt(timeParts[0]) || 0;
            const seconds = parseInt(timeParts[1]) || 0;
            totalMinutes = minutes + (seconds / 60);
        } else if (timeParts.length === 3) {
            // Format: h:mm:ss (hours:minutes:seconds)
            const hours = parseInt(timeParts[0]) || 0;
            const minutes = parseInt(timeParts[1]) || 0;
            const seconds = parseInt(timeParts[2]) || 0;
            totalMinutes = (hours * 60) + minutes + (seconds / 60);
        } else {
            console.warn('Unexpected time format:', timeString);
            return null;
        }
        
        return totalMinutes;
    } catch (e) {
        console.warn('Error parsing time:', timeString, e);
        return null;
    }
}

// Extract common duration bucket categorization
function categorizeGameDuration(totalMinutes) {
    if (totalMinutes === null) return null;
    
    if (totalMinutes <= 10) {
        return '≤10 min';
    } else if (totalMinutes <= 30) {
        return '10-30 min';
    } else if (totalMinutes <= 60) {
        return '30-60 min';
    } else {
        return '>60 min';
    }
}

// Calculate duration buckets for games array
function calculateDurationBuckets(games) {
    const buckets = {
        '≤10 min': 0,
        '10-30 min': 0,
        '30-60 min': 0,
        '>60 min': 0
    };
    
    games.forEach(game => {
        const totalMinutes = parseGameDuration(game.time);
        const bucket = categorizeGameDuration(totalMinutes);
        if (bucket) {
            buckets[bucket]++;
        }
    });
    
    return buckets;
}

// Calculate average game time for an array of games
function calculateAverageGameTime(games) {
    const gamesWithTime = games.filter(g => g.time && g.time.trim() !== '');
    if (gamesWithTime.length === 0) return '--';
    
    const totalMinutes = gamesWithTime.reduce((sum, game) => {
        const totalMinutesForGame = parseGameDuration(game.time);
        return totalMinutesForGame ? sum + totalMinutesForGame : sum;
    }, 0);
    
    if (totalMinutes > 0) {
        const avgMinutes = totalMinutes / gamesWithTime.length;
        const hours = Math.floor(avgMinutes / 60);
        const mins = Math.floor(avgMinutes % 60);
        return `${hours}:${mins.toString().padStart(2, '0')}`;
    }
    
    return '--';
}

// Extract faction statistics calculation
function calculateFactionStats(games, includeWins = true) {
    const factionStats = {};
    
    games.forEach(game => {
        [game.faction1, game.faction2].forEach((faction, index) => {
            if (!faction) return;
            
            if (!factionStats[faction]) {
                factionStats[faction] = { games: 0, wins: 0 };
            }
            factionStats[faction].games++;
            
            if (includeWins) {
                const commander = index === 0 ? game.commander1 : game.commander2;
                if (game.winner === commander) {
                    factionStats[faction].wins++;
                }
            }
        });
    });
    
    return factionStats;
}

// Calculate Wilson Score (extracted to utility function)
function calculateWilsonScore(wins, games) {
    if (games === 0) return 0;
    
    const p = wins / games;
    const n = games;
    const z = 1.96; // 95% confidence interval
    
    const numerator = p + (z * z) / (2 * n) - z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);
    const denominator = 1 + (z * z) / n;
    
    return numerator / denominator;
}

// ==================== END UTILITY FUNCTIONS ====================

// Add glow effect to charts - OPTIMIZED VERSION
function addChartGlowEffect(chart) {
    const canvas = chart.canvas;
    const container = canvas.parentElement;
    
    if (!container.classList.contains('chart-glow-added')) {
        container.style.position = 'relative';
        container.style.borderRadius = '12px';
        container.style.boxShadow = '0 0 30px rgba(0, 212, 255, 0.15)';
        container.classList.add('chart-glow-added');
        
        // OPTIMIZED: Use static glow instead of continuous animation
        // Only add subtle pulsing on hover instead of constant animation
        let isHovering = false;
        let animationId = null;
        
        const startPulse = () => {
            if (animationId || !isHovering) return;
            
            const pulse = () => {
                if (!isHovering || !document.contains(canvas)) {
                    if (animationId) {
                        cancelAnimationFrame(animationId);
                        animationId = null;
                    }
                    return;
                }
                
                const intensity = 0.15 + Math.sin(Date.now() / 1500) * 0.05;
                container.style.boxShadow = `0 0 30px rgba(0, 212, 255, ${intensity})`;
                animationId = requestAnimationFrame(pulse);
            };
            
            animationId = requestAnimationFrame(pulse);
        };
        
        const stopPulse = () => {
            isHovering = false;
            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
            container.style.boxShadow = '0 0 30px rgba(0, 212, 255, 0.15)';
        };
        
        container.addEventListener('mouseenter', () => {
            isHovering = true;
            startPulse();
        });
        
        container.addEventListener('mouseleave', stopPulse);
        
        // Cleanup on destroy
        chart.config._cleanup = chart.config._cleanup || [];
        chart.config._cleanup.push(stopPulse);
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
    
    // Destroy existing chart if it exists
    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
        // OPTIMIZED: Proper cleanup before destroying
        if (existingChart.config._cleanup) {
            existingChart.config._cleanup.forEach(cleanup => cleanup());
        }
        existingChart.destroy();
    }
    
    try {
        // Add container animation class
        const container = canvas.parentElement;
        if (container) {
            container.classList.add('chart-container');
            container.style.borderRadius = '12px';
        }
        
        // Enhanced config with modern styling and PERFORMANCE OPTIMIZATION
        const enhancedConfig = {
            ...config,
            options: {
                ...config.options,
                animation: config.options?.animation !== false && performanceConfig.shouldUseAnimations() ? 
                    {
                        ...chartAnimations.standard,
                        duration: performanceConfig.getOptimalAnimationDuration()
                } : false,
                interaction: {
                    intersect: config.type === 'bar' ? true : false,
                    mode: config.type === 'bar' ? 'point' : 'index',
                    ...config.options?.interaction
                },
                // OPTIMIZED: Simplified hover effects for better performance
                onHover: performanceConfig.isLowEndDevice() ? undefined : (event, activeElements, chart) => {
                    if (config.type === 'bar' && activeElements.length > 0) {
                        chart.canvas.style.filter = 'drop-shadow(0 0 10px rgba(0, 212, 255, 0.8))';
                        chart.canvas.style.transition = 'filter 0.2s ease';
                    } else {
                        chart.canvas.style.filter = 'none';
                    }
                    
                    if (config.options?.onHover) {
                        config.options.onHover(event, activeElements, chart);
                    }
                },
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
                        boxPadding: 8,
                        // OPTIMIZED: Reduce animation on low-end devices
                        animation: performanceConfig.shouldUseAnimations() ? undefined : false
                    }
                },
                scales: enhanceScales(config.options?.scales || {}),
                responsive: config.options?.responsive !== false,
                // FIXED: Respect individual chart maintainAspectRatio settings
                maintainAspectRatio: config.options?.maintainAspectRatio !== undefined ? 
                    config.options.maintainAspectRatio : true
            }
        };
        
        // Create gradient backgrounds for bar charts
        const ctx = canvas.getContext('2d');
        let gradientColors = null;
        
        if (!performanceConfig.isLowEndDevice() && config.type === 'bar') {
            const createGradient = (color1, color2) => {
                const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
                gradient.addColorStop(0, color1);
                gradient.addColorStop(0.6, color2);
                gradient.addColorStop(1, color1);
                return gradient;
            };
            
            // Enhanced gradient colors for bars
            gradientColors = [
                () => createGradient('rgba(0, 212, 255, 0.9)', 'rgba(0, 212, 255, 0.6)'),
                () => createGradient('rgba(255, 107, 53, 0.9)', 'rgba(255, 107, 53, 0.6)'),
                () => createGradient('rgba(123, 104, 238, 0.9)', 'rgba(123, 104, 238, 0.6)'),
                () => createGradient('rgba(0, 255, 136, 0.9)', 'rgba(0, 255, 136, 0.6)'),
                () => createGradient('rgba(255, 170, 0, 0.9)', 'rgba(255, 170, 0, 0.6)'),
                () => createGradient('rgba(255, 51, 102, 0.9)', 'rgba(255, 51, 102, 0.6)'),
                () => createGradient('rgba(102, 126, 234, 0.9)', 'rgba(102, 126, 234, 0.6)'),
                () => createGradient('rgba(240, 147, 251, 0.9)', 'rgba(240, 147, 251, 0.6)')
            ];
        }
        
        // Check if this is a bar chart
        const isBarChart = config.type === 'bar';
        
        // Check if this is a stacked bar chart
        const isStackedChart = isBarChart && (
            config.options?.scales?.x?.stacked === true || 
            config.options?.scales?.y?.stacked === true
        );
        
        // Enhance dataset colors and styling with PERFORMANCE OPTIMIZATION
        if (enhancedConfig.data?.datasets) {
            enhancedConfig.data.datasets = enhancedConfig.data.datasets.map((dataset, index) => {
                
                // Calculate border-radius for stacked vs regular bar charts
                let borderRadius = 0;
                if (isBarChart) {
                    if (isStackedChart) {
                        // For stacked bar charts, only apply border-radius to end caps
                        const totalDatasets = enhancedConfig.data.datasets.length;
                        const isHorizontal = config.options?.indexAxis === 'y';
                        
                        if (isHorizontal) {
                            // Horizontal stacked bars
                            if (index === 0) {
                                // First segment - round left side only
                                borderRadius = { topLeft: 4, topRight: 0, bottomLeft: 4, bottomRight: 0 };
                            } else if (index === totalDatasets - 1) {
                                // Last segment - round right side only  
                                borderRadius = { topLeft: 0, topRight: 4, bottomLeft: 0, bottomRight: 4 };
                            } else {
                                // Middle segments - no rounding
                                borderRadius = 0;
                            }
                        } else {
                            // Vertical stacked bars
                            if (index === 0) {
                                // First segment - round bottom only
                                borderRadius = { topLeft: 0, topRight: 0, bottomLeft: 4, bottomRight: 4 };
                            } else if (index === totalDatasets - 1) {
                                // Last segment - round top only
                                borderRadius = { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 };
                            } else {
                                // Middle segments - no rounding
                                borderRadius = 0;
                            }
                        }
                    } else {
                        // Regular (non-stacked) bar charts - round the appropriate end
                        borderRadius = config.options?.indexAxis === 'y' ? 
                            // Horizontal bars - round right end only
                            { topLeft: 0, topRight: 4, bottomLeft: 0, bottomRight: 4 } :
                            // Vertical bars - round top end only  
                            { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 };
                    }
                }
                
                return {
                    ...dataset,
                    backgroundColor: isBarChart && gradientColors ? 
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
                    // Enhanced bar styling with stacked-aware rounding
                    borderSkipped: false,
                    borderRadius: borderRadius,
                    hoverBackgroundColor: isBarChart && gradientColors ? 
                        gradientColors[index % gradientColors.length]() : 
                        dataset.hoverBackgroundColor,
                    hoverBorderColor: dataset.hoverBorderColor,
                    hoverBorderWidth: isBarChart ? 0 : (dataset.hoverBorderWidth || 3)
                };
            });
        }
        
        const chart = new Chart(canvas.getContext('2d'), enhancedConfig);
        
        // OPTIMIZED: Removed heavy bar shimmer effect that was causing continuous animations
        // Instead, apply glow effect only after chart is fully rendered
        setTimeout(() => {
            if (chart && chart.canvas && document.contains(chart.canvas)) {
                addChartGlowEffect(chart);
            }
        }, enhancedConfig.options?.animation !== false ? 1200 : 100); // Reduced timing
        
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

// Load game data with comprehensive error handling and progress feedback
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
        
        // Add share button to toolbar
        addShareButton();
        
        // Apply URL parameters after dashboard is ready
        setTimeout(() => {
            applyURLParameters();
        }, 200);
        
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
                            <div class="col-md-3" id="secondPlayerSection" style="display: none;">
                                <label class="form-label text-light">Compare vs Player</label>
                                <select id="secondPlayerSelect" class="form-select bg-dark text-light border-secondary">
                                    <option value="">No Comparison</option>
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
                                <div class="d-flex gap-2">
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
    const secondPlayerSelect = document.getElementById('secondPlayerSelect');
    const timePeriod = document.getElementById('timePeriod');
    const resetButton = document.getElementById('resetFilters');
    
    if (analysisType) {
        analysisType.addEventListener('change', handleAnalysisTypeChange);
    }
    
    if (filterSelect) {
        filterSelect.addEventListener('change', handleFilterChange);
    }
    
    if (secondPlayerSelect) {
        secondPlayerSelect.addEventListener('change', handleSecondPlayerChange);
    }
    
    if (timePeriod) {
        timePeriod.addEventListener('change', handleTimePeriodChange);
    }
    
    if (resetButton) {
        resetButton.addEventListener('click', resetFilters);
    }
}

// Helper functions for second player section
function showSecondPlayerSection() {
    const secondPlayerSection = document.getElementById('secondPlayerSection');
    if (secondPlayerSection) {
        secondPlayerSection.style.display = 'block';
    }
}

function hideSecondPlayerSection() {
    const secondPlayerSection = document.getElementById('secondPlayerSection');
    if (secondPlayerSection) {
        secondPlayerSection.style.display = 'none';
    }
}

function populateSecondPlayerDropdown(players) {
    const secondPlayerSelect = document.getElementById('secondPlayerSelect');
    if (!secondPlayerSelect) return;
    
    secondPlayerSelect.innerHTML = '<option value="">No Comparison</option>';
    players.forEach(player => {
        secondPlayerSelect.innerHTML += `<option value="${player}">${player}</option>`;
    });
}

function handleSecondPlayerChange() {
    loadContent();
    scheduleURLUpdate();
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
    
    // Show/hide filter section and second player section
    if (analysisValue === 'general') {
        filterSection.style.display = 'none';
        hideSecondPlayerSection();
    } else {
        filterSection.style.display = 'block';
        if (analysisValue === 'player') {
            showSecondPlayerSection();
        } else {
            hideSecondPlayerSection();
        }
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
        
        // Populate second player dropdown
        populateSecondPlayerDropdown(players);
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
    scheduleURLUpdate();
}

// Handle filter change
function handleFilterChange() {
    loadContent();
    scheduleURLUpdate();
}

// Handle time period change  
function handleTimePeriodChange() {
    loadContent();
    scheduleURLUpdate();
}

// Reset filters
function resetFilters() {
    const analysisTypeElement = document.getElementById('analysisType');
    const filterSelectElement = document.getElementById('filterSelect');
    const secondPlayerSelectElement = document.getElementById('secondPlayerSelect');
    const timePeriodElement = document.getElementById('timePeriod');
    const filterSectionElement = document.getElementById('filterSection');
    
    if (!analysisTypeElement || !filterSelectElement || !timePeriodElement) {
        return;
    }
    
    analysisTypeElement.value = 'general';
    filterSelectElement.innerHTML = '<option value="">All Data</option>';
    filterSelectElement.value = '';
    timePeriodElement.value = 'all';
    
    if (secondPlayerSelectElement) {
        secondPlayerSelectElement.innerHTML = '<option value="">No Comparison</option>';
        secondPlayerSelectElement.value = '';
    }
    
    if (filterSectionElement) {
        filterSectionElement.style.display = 'none';
    }
    
    hideSecondPlayerSection();
    
    loadContent();
    
    // Clear URL parameters
    updateURLParameters({}, true);
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
        let avgTime = calculateAverageGameTime(gamesWithTime);
        
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
        const avgTime = calculateAverageGameTime(games);
        
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
                <div class="card bg-dark border-secondary" id="commanderGamesCard">
                    <div class="card-header bg-primary text-white">
                        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
                            <h5 class="mb-0 flex-shrink-0">Games Commanded</h5>
                            <div class="d-flex flex-wrap gap-2 align-items-center">
                                <select id="teamSizeGames" class="form-select form-select-sm" style="width: auto; min-width: 80px;">
                                    <option value="ignore">Ignore</option>
                                    <option value="1">1 thug</option>
                                    <option value="2">2 thugs</option>
                                    <option value="3">3 thugs</option>
                                    <option value="4" selected>4 thugs</option>
                                </select>
                                <button id="linkFilters" class="btn btn-sm btn-outline-light" title="Link/Unlink team size filters">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-link-45deg" viewBox="0 0 16 16">
                                        <path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1.002 1.002 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4.018 4.018 0 0 1-.128-1.287z"/>
                                        <path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243L6.586 4.672z"/>
                                    </svg>
                                </button>
                                <button class="btn btn-sm btn-outline-light maximize-chart flex-shrink-0" data-chart-type="commanderGames" data-chart-title="Commander Rankings - All Players (Games Played)">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="card-body">
                        <canvas id="commanderGamesChart"></canvas>
                    </div>
                </div>
            </div>
            
            <!-- Commander Win Rates -->
            <div class="col-lg-6 mb-4">
                <div class="card bg-dark border-secondary" id="commanderWinRateCard">
                    <div class="card-header bg-success text-white">
                        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
                            <h5 class="mb-0 flex-shrink-0">Commander Ranking</h5>
                            <div class="d-flex flex-wrap gap-2 align-items-center">
                                <select id="rankingMethod" class="form-select form-select-sm" style="width: auto; min-width: 120px;">
                                    <option value="wilson">Wilson Score</option>
                                    <option value="winRate">Win Rate</option>
                                    <option value="volumeWeighted">Volume-Weighted</option>
                                    <option value="bayesian">Bayesian Average</option>
                                    <option value="composite">Composite Score</option>
                                </select>
                                <select id="minGameRequirement" class="form-select form-select-sm" style="width: auto; min-width: 100px;">
                                    <option value="3%">3% Min Games</option>
                                    <option value="5%">5% Min Games</option>
                                    <option value="10%">10% Min Games</option>
                                    <option value="30">30 Games Min</option>
                                    <option value="50">50 Games Min</option>
                                    <option value="100">100 Games Min</option>
                                </select>
                                <select id="teamSize" class="form-select form-select-sm" style="width: auto; min-width: 80px;">
                                    <option value="ignore">Ignore</option>
                                    <option value="1">1 thug</option>
                                    <option value="2">2 thugs</option>
                                    <option value="3">3 thugs</option>
                                    <option value="4" selected>4 thugs</option>
                                </select>
                                <button class="btn btn-sm btn-outline-light maximize-chart flex-shrink-0" data-chart-type="commanderWinRate" data-chart-title="Commander Rankings - All Players">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="card-body">
                        <div id="commanderFilterInfo" class="mb-3 text-muted small"></div>
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
    createCommanderWinRateChart(games, 'wilson', '3%', '4');
    createMapPopularityChart(games);
    createCommanderFactionChart(games);
    createFactionDistributionChart(games);
    createFactionPerformanceChart(games);
    createGameDurationChart(games);
    
    // Align commander chart heights after they're created
    alignCommanderChartHeights();
    
    // Global state for filter linking
    let filtersLinked = true;
    
    // Add event listeners for the ranking dropdowns
    const rankingMethodEl = document.getElementById('rankingMethod');
    const minGameRequirementEl = document.getElementById('minGameRequirement');
    const teamSizeEl = document.getElementById('teamSize');
    const teamSizeGamesEl = document.getElementById('teamSizeGames');
    const linkButton = document.getElementById('linkFilters');
    
    // Update link button appearance
    function updateLinkButton() {
        const linkIcon = linkButton.querySelector('svg');
        if (filtersLinked) {
            linkButton.classList.remove('btn-outline-light');
            linkButton.classList.add('btn-light');
            linkButton.title = 'Filters are linked - click to unlink';
            linkIcon.innerHTML = `
                <path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1.002 1.002 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4.018 4.018 0 0 1-.128-1.287z"/>
                <path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243L6.586 4.672z"/>
            `;
        } else {
            linkButton.classList.remove('btn-light');
            linkButton.classList.add('btn-outline-light');
            linkButton.title = 'Filters are unlinked - click to link';
            linkIcon.innerHTML = `
                <path d="M13 3a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM19 3a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
                <path fill-rule="evenodd" d="M1.5 11.5a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0-.5.5zm-2-3a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0-.5.5zm8 0a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0-.5.5zm2 3a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0-.5.5z"/>
                <path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l.77-.77a1 1 0 0 0-1.415-1.414l-.77.77a1 1 0 1 1-1.414-1.414l1.372-1.372a1 1 0 0 0-1.414-1.414zm4.57-2A3 3 0 0 0 7.914 3.1l-.77.77a1 1 0 0 0 1.415 1.414l.77-.77a1 1 0 1 1 1.414 1.414L9.371 7.3a1 1 0 0 0 1.414 1.414l1.372-1.372z"/>
            `;
        }
    }
    
    // Sync dropdowns when linked
    function syncDropdowns(sourceDropdown, targetDropdown) {
        if (filtersLinked && sourceDropdown && targetDropdown) {
            targetDropdown.value = sourceDropdown.value;
        }
    }
    
    // Update charts based on current settings
    function updateCharts() {
        const rankingMethod = rankingMethodEl?.value || 'wilson';
        const minGameRequirement = minGameRequirementEl?.value || '3%';
        const teamSize = teamSizeEl?.value || '4';
        
        const currentFilteredGames = getFilteredGames();
        
        console.log('Updating both charts with linked status:', filtersLinked);
        
        // Always update both charts (used for ranking method, min games, and when linked)
        createCommanderGamesChart(currentFilteredGames);
        createCommanderWinRateChart(currentFilteredGames, rankingMethod, minGameRequirement, teamSize);
        
        // Realign heights after chart update
        alignCommanderChartHeights();
    }
    
    // Update only the games chart
    function updateGamesChart() {
        const currentFilteredGames = getFilteredGames();
        console.log('Updating games chart only');
        createCommanderGamesChart(currentFilteredGames);
        alignCommanderChartHeights();
    }
    
    // Update only the win rate chart
    function updateWinRateChart() {
        const rankingMethod = rankingMethodEl?.value || 'wilson';
        const minGameRequirement = minGameRequirementEl?.value || '3%';
        const teamSize = teamSizeEl?.value || '4';
        
        const currentFilteredGames = getFilteredGames();
        console.log('Updating win rate chart only');
        createCommanderWinRateChart(currentFilteredGames, rankingMethod, minGameRequirement, teamSize);
        alignCommanderChartHeights();
    }
    
    // Link toggle functionality
    if (linkButton) {
        linkButton.addEventListener('click', () => {
            filtersLinked = !filtersLinked;
            updateLinkButton();
            
            if (filtersLinked) {
                // When linking, sync the dropdowns and update charts
                syncDropdowns(teamSizeEl, teamSizeGamesEl);
                updateCharts();
            }
        });
    }
    
    // Initialize link button appearance
    updateLinkButton();
    
    // Event handlers for win rate chart dropdowns (always affect win rate chart)
    [rankingMethodEl, minGameRequirementEl].forEach(element => {
        if (element && !element.dataset.listenerAdded) {
            element.addEventListener('change', updateWinRateChart);
            element.dataset.listenerAdded = 'true';
        }
    });
    
    // Team size dropdown for win rate chart
    if (teamSizeEl && !teamSizeEl.dataset.listenerAdded) {
        teamSizeEl.addEventListener('change', () => {
            if (filtersLinked) {
                // When linked: sync both dropdowns and update both charts
                syncDropdowns(teamSizeEl, teamSizeGamesEl);
                updateCharts();
            } else {
                // When unlinked: only update the win rate chart
                updateWinRateChart();
            }
        });
        teamSizeEl.dataset.listenerAdded = 'true';
    }
    
    // Team size dropdown for games chart
    if (teamSizeGamesEl && !teamSizeGamesEl.dataset.listenerAdded) {
        teamSizeGamesEl.addEventListener('change', () => {
            if (filtersLinked) {
                // When linked: sync both dropdowns and update both charts
                syncDropdowns(teamSizeGamesEl, teamSizeEl);
                updateCharts();
            } else {
                // When unlinked: only update the games chart
                updateGamesChart();
            }
        });
        teamSizeGamesEl.dataset.listenerAdded = 'true';
    }
    
    // Add event listeners for maximize buttons
    document.querySelectorAll('.maximize-chart').forEach(button => {
        button.addEventListener('click', (e) => {
            const chartType = e.currentTarget.dataset.chartType;
            const chartTitle = e.currentTarget.dataset.chartTitle;
            
            // Get current filtered games for modal
            const currentFilteredGames = getFilteredGames();
            showModalChart(currentFilteredGames, chartType, chartTitle);
        });
    });
}

// Create commander games chart
function createCommanderGamesChart(games) {
    const teamSize = document.getElementById('teamSizeGames') ? document.getElementById('teamSizeGames').value : 'ignore';
    
    const commanderStats = {};
    
    // Filter games by team size first (unless "ignore" is selected)
    let filteredGames = games;
    if (teamSize !== 'ignore') {
        const targetTeamSize = parseInt(teamSize) + 1; // thugs + commander = team size
        filteredGames = games.filter(game => {
            const commander1TeamSize = (game.teamOne ? game.teamOne.length : 0) + 1;
            const commander2TeamSize = (game.teamTwo ? game.teamTwo.length : 0) + 1;
            return commander1TeamSize == targetTeamSize || commander2TeamSize == targetTeamSize;
        });
    }
    
    // Calculate stats for each commander
    filteredGames.forEach(game => {
        [game.commander1, game.commander2].forEach(commander => {
            if (teamSize === 'ignore') {
                // No team size filtering, include all games for this commander
                commanderStats[commander] = (commanderStats[commander] || 0) + 1;
            } else {
                // Team size filtering: only include if this commander had the specified team size
                const isCommander1 = commander === game.commander1;
                const commanderTeamSize = isCommander1 ? 
                    (game.teamOne ? game.teamOne.length : 0) + 1 : 
                    (game.teamTwo ? game.teamTwo.length : 0) + 1;
                
                const targetTeamSize = parseInt(teamSize) + 1;
                
                if (commanderTeamSize == targetTeamSize) {
                    commanderStats[commander] = (commanderStats[commander] || 0) + 1;
                }
            }
        });
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
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
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
function createCommanderWinRateChart(games, rankingMethod, minGameRequirement, teamSize) {
    console.log('Creating commander win rate chart with filters:', { rankingMethod, minGameRequirement, teamSize });
    
    const commanderStats = {};
    
    // Filter games by team size first (unless "ignore" is selected)
    let filteredGames = games;
    if (teamSize !== 'ignore') {
        const targetTeamSize = parseInt(teamSize) + 1; // thugs + commander = team size
        filteredGames = games.filter(game => {
            const commander1TeamSize = (game.teamOne ? game.teamOne.length : 0) + 1;
            const commander2TeamSize = (game.teamTwo ? game.teamTwo.length : 0) + 1;
            return commander1TeamSize == targetTeamSize || commander2TeamSize == targetTeamSize;
        });
    }
    
    console.log(`Filtered games by team size ${teamSize}: ${filteredGames.length} games from ${games.length} total`);
    
    // Calculate comprehensive stats for each commander
    filteredGames.forEach(game => {
        [game.commander1, game.commander2].forEach(commander => {
            if (teamSize === 'ignore') {
                // No team size filtering, include all games for this commander
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
            } else {
                // Team size filtering: only include if this commander had the specified team size
                const isCommander1 = commander === game.commander1;
                const commanderTeamSize = isCommander1 ? 
                    (game.teamOne ? game.teamOne.length : 0) + 1 : 
                    (game.teamTwo ? game.teamTwo.length : 0) + 1;
                
                const targetTeamSize = parseInt(teamSize) + 1;
                
                if (commanderTeamSize == targetTeamSize) {
                    if (!commanderStats[commander]) {
                        commanderStats[commander] = { games: 0, wins: 0, faction: {} };
                    }
                    commanderStats[commander].games++;
                    
                    if (game.winner === commander) {
                        commanderStats[commander].wins++;
                    }
                    
                    // Track faction usage
                    const faction = isCommander1 ? game.faction1 : game.faction2;
                    commanderStats[commander].faction[faction] = (commanderStats[commander].faction[faction] || 0) + 1;
                }
            }
        });
    });
    
    // Apply minimum games filter
    let minGames;
    if (minGameRequirement.includes('%')) {
        const percentage = parseFloat(minGameRequirement.replace('%', ''));
        minGames = Math.ceil(filteredGames.length * (percentage / 100));
    } else {
        minGames = parseInt(minGameRequirement);
    }
    
    const qualifiedCommanders = Object.entries(commanderStats)
        .filter(([, stats]) => stats.games >= minGames);
    
    console.log(`Qualified commanders after min games filter (${minGames}): ${qualifiedCommanders.length}`);
    
    // Update the informational display
    updateCommanderFilterInfo(filteredGames.length, minGames, minGameRequirement, teamSize);
    
    // Calculate scores based on method
    const scoredCommanders = qualifiedCommanders.map(([name, stats]) => {
        const winRate = stats.wins / stats.games;
        let score = winRate;
        
        switch (rankingMethod) {
            case 'wilson':
                // Wilson Score Interval
                score = calculateWilsonScore(stats.wins, stats.games);
                break;
            case 'winRate':
                score = winRate;
                break;
            case 'volumeWeighted':
                score = winRate * Math.log(stats.games + 1);
                break;
            case 'bayesian':
                // Bayesian average
                const globalWinRate = filteredGames.filter(g => g.winner).length / (filteredGames.length * 2);
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
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
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
    
    // Ensure chart resizes to fit container after all content is rendered
    setTimeout(() => {
        const chart = Chart.getChart('commanderWinRateChart');
        if (chart) {
            chart.resize();
        }
    }, 100);
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
                    display: false
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
                commanderFactionStats[commander] = {
                    'I.S.D.F': 0,
                    'Hadean': 0,
                    'Scion': 0
                };
            }
            if (faction) {
                commanderFactionStats[commander][faction] = (commanderFactionStats[commander][faction] || 0) + 1;
            }
        });
    });
    
    // Sort commanders by total games and get top 10
    const commanderData = Object.entries(commanderFactionStats)
        .map(([commander, factions]) => {
            const totalGames = Object.values(factions).reduce((sum, count) => sum + count, 0);
            return {
                commander,
                totalGames,
                factions
            };
        })
        .sort((a, b) => b.totalGames - a.totalGames)
        .slice(0, 10);
    
    // Define faction colors to match the screenshot
    const factionColors = {
        'I.S.D.F': 'rgba(13, 110, 253, 0.9)',    // Blue for ISDF
        'Hadean': 'rgba(220, 53, 69, 0.9)',      // Red for Hadean
        'Scion': 'rgba(255, 193, 7, 0.9)'        // Yellow for Scion
    };
    
    // Create datasets for stacked bar chart
    const datasets = Object.keys(factionColors).map(faction => ({
        label: faction,
        data: commanderData.map(cmd => cmd.factions[faction] || 0),
        backgroundColor: factionColors[faction],
        borderColor: factionColors[faction],
        borderWidth: 1
    }));
    
    safeCreateChart('commanderFactionChart', {
        type: 'bar',
        data: {
            labels: commanderData.map(cmd => cmd.commander),
            datasets: datasets
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: 'white',
                        usePointStyle: true,
                        pointStyle: 'rect'
                    }
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            const commanderIndex = context[0].dataIndex;
                            const cmd = commanderData[commanderIndex];
                            return `${cmd.commander} (${cmd.totalGames} total games)`;
                        },
                        label: function(context) {
                            const faction = context.dataset.label;
                            const count = context.raw;
                            const commanderIndex = context.dataIndex;
                            const cmd = commanderData[commanderIndex];
                            const percentage = cmd.totalGames > 0 ? ((count / cmd.totalGames) * 100).toFixed(1) : '0.0';
                            return `${faction}: ${count} games (${percentage}%)`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    stacked: true,
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

// Create faction distribution chart
function createFactionDistributionChart(games) {
    const factionStats = calculateFactionStats(games, false);
    
    // Sort factions by count and get totals
    const sortedFactions = Object.entries(factionStats)
        .map(([faction, stats]) => [faction, stats.games])
        .sort(([,a], [,b]) => b - a);
    
    const totalSelections = Object.values(factionStats).reduce((sum, stats) => sum + stats.games, 0);
    
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
            maxBarThickness: 35, // INCREASED from 15 to 35 for wider bars
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
            plugins: [] // Removed ChartDataLabels plugin that was breaking stacked bars
        }
    });
    
    // INCREASED height constraint for better visibility with wider bars
    const canvas = document.getElementById('factionDistributionChart');
    if (canvas) {
        canvas.style.height = '120px'; // INCREASED from 80px to 120px
        canvas.style.maxHeight = '120px';
    }
}

// Create faction performance chart
function createFactionPerformanceChart(games) {
    const factionStats = calculateFactionStats(games, true);
    
    const factionPerformance = Object.entries(factionStats)
        .map(([faction, stats]) => ({
            faction,
            winRate: (stats.wins / stats.games * 100).toFixed(1),
            games: stats.games,
            wins: stats.wins,
            losses: stats.games - stats.wins
        }))
        .sort((a, b) => b.wins - a.wins);
    
    safeCreateChart('factionPerformanceChart', {
        type: 'bar',
        data: {
            labels: factionPerformance.map(f => f.faction),
            datasets: [
                {
                    label: 'Wins',
                    data: factionPerformance.map(f => f.wins),
                    backgroundColor: 'rgba(40, 167, 69, 0.8)', // Green for wins
                    borderColor: 'rgba(40, 167, 69, 1)',
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    label: 'Losses',
                    data: factionPerformance.map(f => f.losses),
                    backgroundColor: 'rgba(220, 53, 69, 0.8)', // Red for losses
                    borderColor: 'rgba(220, 53, 69, 1)',
                    borderWidth: 1,
                    yAxisID: 'y'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            maxBarThickness: 25,
            // Make bars closer together
            categoryPercentage: 0.8, // Controls space between different factions
            barPercentage: 0.9,      // Controls space between wins/losses bars within each faction
            plugins: {
                legend: {
                    display: true, // Show legend to distinguish wins vs losses
                    labels: {
                        color: 'white'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const faction = factionPerformance[context.dataIndex];
                            if (context.datasetIndex === 0) {
                                return `Wins: ${faction.wins} (${faction.winRate}% win rate)`;
                            } else {
                                return `Losses: ${faction.losses} (${faction.games} total games)`;
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
                    beginAtZero: true,
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    title: {
                        display: true,
                        text: 'Games Won/Lost',
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
    const durationBuckets = calculateDurationBuckets(games);
    const bucketData = Object.entries(durationBuckets);
    
    safeCreateChart('gameDurationChart', {
        type: 'bar',
        data: {
            labels: bucketData.map(([label]) => label),
            datasets: [{
                label: 'Number of Games',
                data: bucketData.map(([,count]) => count),
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
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const count = context.parsed.y;
                            const total = bucketData.reduce((sum, [,bucketCount]) => sum + bucketCount, 0);
                            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
                            return `Games: ${count} (${percentage}%)`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { 
                        color: 'white'
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
function showModalChart(games, chartType, chartTitle, player1 = null, player2 = null) {
    const modal = new bootstrap.Modal(document.getElementById('chartModal'));
    const modalTitle = document.getElementById('chartModalLabel');
    const modalChart = document.getElementById('modalChart');
    const modalBody = document.querySelector('#chartModal .modal-body');
    const modalContainer = document.getElementById('modalChartContainer');
    
    // Get the actual card header text instead of using hardcoded title
    let actualTitle = chartTitle; // fallback
    const chartButton = document.querySelector(`[data-chart-type="${chartType}"]`);
    if (chartButton) {
        const card = chartButton.closest('.card');
        if (card) {
            const cardHeaderH5 = card.querySelector('.card-header h5');
            if (cardHeaderH5) {
                actualTitle = cardHeaderH5.textContent.trim();
            }
        }
    }
    
    modalTitle.textContent = actualTitle;
    
    // Clear previous chart
    const existingChart = Chart.getChart(modalChart);
    if (existingChart) {
        existingChart.destroy();
    }
    
    // Enhanced modal body styling for scrollable content with fixed dimensions
    modalBody.style.cssText = `
        padding: 0;
        height: calc(100vh - 80px);
        overflow-y: auto;
        overflow-x: auto;
        background-color: #212529;
        display: flex;
        flex-direction: column;
    `;
    
    // Create filter section if applicable
    let filterHtml = '';
    if (chartType === 'commanderWinRate') {
        const rankingMethod = document.getElementById('rankingMethod').value;
        const minGameRequirement = document.getElementById('minGameRequirement').value;
        const teamSize = document.getElementById('teamSize').value;
        
        filterHtml = `
            <div class="filter-section p-3 border-bottom border-secondary">
                <div class="row g-3 align-items-center">
                    <div class="col-auto">
                        <label class="form-label text-light mb-0">Ranking Method:</label>
                    </div>
                    <div class="col-auto">
                        <select id="modalRankingMethod" class="form-select form-select-sm">
                            <option value="wilson" ${rankingMethod === 'wilson' ? 'selected' : ''}>Wilson Score</option>
                            <option value="winRate" ${rankingMethod === 'winRate' ? 'selected' : ''}>Win Rate</option>
                            <option value="volumeWeighted" ${rankingMethod === 'volumeWeighted' ? 'selected' : ''}>Volume-Weighted</option>
                            <option value="bayesian" ${rankingMethod === 'bayesian' ? 'selected' : ''}>Bayesian Average</option>
                            <option value="composite" ${rankingMethod === 'composite' ? 'selected' : ''}>Composite Score</option>
                        </select>
                    </div>
                    <div class="col-auto">
                        <label class="form-label text-light mb-0">Min Games:</label>
                    </div>
                    <div class="col-auto">
                        <select id="modalMinGameRequirement" class="form-select form-select-sm">
                            <option value="3%" ${minGameRequirement === '3%' ? 'selected' : ''}>3% Min Games</option>
                            <option value="5%" ${minGameRequirement === '5%' ? 'selected' : ''}>5% Min Games</option>
                            <option value="10%" ${minGameRequirement === '10%' ? 'selected' : ''}>10% Min Games</option>
                            <option value="30" ${minGameRequirement === '30' ? 'selected' : ''}>30 Games Min</option>
                            <option value="50" ${minGameRequirement === '50' ? 'selected' : ''}>50 Games Min</option>
                            <option value="100" ${minGameRequirement === '100' ? 'selected' : ''}>100 Games Min</option>
                        </select>
                    </div>
                    <div class="col-auto">
                        <label class="form-label text-light mb-0">Team Size:</label>
                    </div>
                    <div class="col-auto">
                        <select id="modalTeamSize" class="form-select form-select-sm">
                            <option value="ignore" ${teamSize === 'ignore' ? 'selected' : ''}>Ignore</option>
                            <option value="1" ${teamSize === '1' ? 'selected' : ''}>1 thug</option>
                            <option value="2" ${teamSize === '2' ? 'selected' : ''}>2 thugs</option>
                            <option value="3" ${teamSize === '3' ? 'selected' : ''}>3 thugs</option>
                            <option value="4" ${teamSize === '4' ? 'selected' : ''}>4 thugs</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    }
    
    modalContainer.innerHTML = `
        ${filterHtml}
        <div class="chart-container" style="flex: 1; padding: 20px; overflow: auto; min-height: 0;">
            <canvas id="modalChart"></canvas>
        </div>
    `;
    
    // Get the new canvas reference after innerHTML update
    const newModalChart = document.getElementById('modalChart');
    
    // Reset canvas completely
    newModalChart.style.cssText = '';
    newModalChart.removeAttribute('width');
    newModalChart.removeAttribute('height');
    
    // Create modal chart based on type
    switch (chartType) {
        case 'commanderGames':
            createModalCommanderGamesChart(games, newModalChart);
            break;
        case 'commanderWinRate':
            const modalRankingMethod = document.getElementById('modalRankingMethod').value;
            const modalMinGameRequirement = document.getElementById('modalMinGameRequirement').value;
            const modalTeamSize = document.getElementById('modalTeamSize').value;
            createModalCommanderWinRateChart(games, newModalChart, modalRankingMethod, modalMinGameRequirement, modalTeamSize);
            
            // Add event listeners for filter changes
            document.getElementById('modalRankingMethod').addEventListener('change', () => {
                const chart = Chart.getChart(newModalChart);
                if (chart) chart.destroy();
                createModalCommanderWinRateChart(games, newModalChart, 
                    document.getElementById('modalRankingMethod').value,
                    document.getElementById('modalMinGameRequirement').value,
                    document.getElementById('modalTeamSize').value);
            });
            document.getElementById('modalMinGameRequirement').addEventListener('change', () => {
                const chart = Chart.getChart(newModalChart);
                if (chart) chart.destroy();
                createModalCommanderWinRateChart(games, newModalChart, 
                    document.getElementById('modalRankingMethod').value,
                    document.getElementById('modalMinGameRequirement').value,
                    document.getElementById('modalTeamSize').value);
            });
            document.getElementById('modalTeamSize').addEventListener('change', () => {
                const chart = Chart.getChart(newModalChart);
                if (chart) chart.destroy();
                createModalCommanderWinRateChart(games, newModalChart, 
                    document.getElementById('modalRankingMethod').value,
                    document.getElementById('modalMinGameRequirement').value,
                    document.getElementById('modalTeamSize').value);
            });
            break;
        case 'mapPopularity':
            createModalMapPopularityChart(games, newModalChart);
            break;
        case 'commanderFaction':
            createModalCommanderFactionChart(games, newModalChart);
            break;
        case 'factionDistribution':
            createModalFactionDistributionChart(games, newModalChart);
            break;
        case 'factionPerformance':
            createModalFactionPerformanceChart(games, newModalChart);
            break;
        case 'gameDuration':
            createModalGameDurationChart(games, newModalChart);
            break;
        case 'headToHeadWinRate':
            createModalHeadToHeadWinRateChart(games, newModalChart, player1, player2);
            break;
        case 'headToHeadFactions':
            createModalHeadToHeadFactionsChart(games, newModalChart, player1, player2);
            break;
        case 'headToHeadFactionMatchups':
            createModalHeadToHeadFactionMatchupsChart(games, newModalChart, player1, player2);
            break;
        case 'headToHeadMaps':
            createModalHeadToHeadMapsChart(games, newModalChart, player1, player2);
            break;
        case 'headToHeadTimeline':
            createModalHeadToHeadTimelineChart(games, newModalChart, player1, player2);
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
    
    // Calculate fixed dimensions based on data with 15px bar width
    const BAR_WIDTH = 15;
    const BAR_SPACING = 8;
    const PADDING = 200; // Padding for labels and axes
    const MIN_WIDTH = 800;
    
    const chartHeight = (sortedCommanders.length * (BAR_WIDTH + BAR_SPACING)) + PADDING;
    const chartWidth = Math.max(MIN_WIDTH, 1000);
    
    // Set container and canvas to fixed dimensions for scrolling
    const container = canvas.parentElement;
    container.style.width = `${chartWidth}px`;
    container.style.height = `${chartHeight}px`;
    container.style.overflow = 'visible';
    
    canvas.width = chartWidth;
    canvas.height = chartHeight;
    canvas.style.width = `${chartWidth}px`;
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
                borderWidth: 1,
                barThickness: BAR_WIDTH
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: false,
            maintainAspectRatio: false,
            animation: false,
            interaction: {
                intersect: false
            },
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    type: 'category',
                    ticks: { 
                        color: 'white',
                        font: { size: 12 }
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
                        font: { size: 12 }
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
                    left: 20,
                    right: 20
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
    
    // Calculate fixed dimensions based on data with 15px bar width
    const BAR_WIDTH = 15;
    const BAR_SPACING = 8;
    const PADDING = 200;
    const MIN_WIDTH = 800;
    
    const chartHeight = (sortedMaps.length * (BAR_WIDTH + BAR_SPACING)) + PADDING;
    const chartWidth = Math.max(MIN_WIDTH, 1000);
    
    // Set container and canvas to fixed dimensions for scrolling
    const container = canvas.parentElement;
    container.style.width = `${chartWidth}px`;
    container.style.height = `${chartHeight}px`;
    container.style.overflow = 'visible';
    
    canvas.width = chartWidth;
    canvas.height = chartHeight;
    canvas.style.width = `${chartWidth}px`;
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
                borderWidth: 1,
                barThickness: BAR_WIDTH
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: false,
            maintainAspectRatio: false,
            animation: false,
            interaction: {
                intersect: false
            },
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    type: 'category',
                    ticks: { 
                        color: 'white',
                        font: { size: 12 }
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
                        font: { size: 12 }
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
                    left: 20,
                    right: 20
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
                commanderFactionStats[commander] = {
                    'I.S.D.F': 0,
                    'Hadean': 0,
                    'Scion': 0
                };
            }
            if (faction) {
                commanderFactionStats[commander][faction] = (commanderFactionStats[commander][faction] || 0) + 1;
            }
        });
    });
    
    // Sort commanders by total games (no limit for modal view)
    const commanderData = Object.entries(commanderFactionStats)
        .map(([commander, factions]) => {
            const totalGames = Object.values(factions).reduce((sum, count) => sum + count, 0);
            return {
                commander,
                totalGames,
                factions
            };
        })
        .sort((a, b) => b.totalGames - a.totalGames);
    
    // Define faction colors to match the screenshot
    const factionColors = {
        'I.S.D.F': 'rgba(13, 110, 253, 0.9)',    // Blue for ISDF
        'Hadean': 'rgba(220, 53, 69, 0.9)',      // Red for Hadean
        'Scion': 'rgba(255, 193, 7, 0.9)'        // Yellow for Scion
    };
    
    // Create datasets for stacked bar chart
    const datasets = Object.keys(factionColors).map(faction => ({
        label: faction,
        data: commanderData.map(cmd => cmd.factions[faction] || 0),
        backgroundColor: factionColors[faction],
        borderColor: factionColors[faction],
        borderWidth: 1,
        barThickness: 15
    }));
    
    // Calculate fixed dimensions based on data with 15px bar width
    const BAR_WIDTH = 15;
    const BAR_SPACING = 8;
    const PADDING = 250; // Extra padding for stacked chart legend
    const MIN_WIDTH = 800;
    
    const chartHeight = (commanderData.length * (BAR_WIDTH + BAR_SPACING)) + PADDING;
    const chartWidth = Math.max(MIN_WIDTH, 1200);
    
    // Set container and canvas to fixed dimensions for scrolling
    const container = canvas.parentElement;
    container.style.width = `${chartWidth}px`;
    container.style.height = `${chartHeight}px`;
    container.style.overflow = 'visible';
    
    canvas.width = chartWidth;
    canvas.height = chartHeight;
    canvas.style.width = `${chartWidth}px`;
    canvas.style.height = `${chartHeight}px`;
    canvas.style.display = 'block';
    canvas.style.maxWidth = 'none';
    canvas.style.maxHeight = 'none';
    
    new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: commanderData.map(cmd => cmd.commander),
            datasets: datasets
        },
        options: {
            indexAxis: 'y',
            responsive: false,
            maintainAspectRatio: false,
            animation: false,
            interaction: {
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: 'white',
                        usePointStyle: true,
                        pointStyle: 'rect',
                        font: { size: 14 }
                    }
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            const commanderIndex = context[0].dataIndex;
                            const cmd = commanderData[commanderIndex];
                            return `${cmd.commander} (${cmd.totalGames} total games)`;
                        },
                        label: function(context) {
                            const faction = context.dataset.label;
                            const count = context.raw;
                            const commanderIndex = context.dataIndex;
                            const cmd = commanderData[commanderIndex];
                            const percentage = cmd.totalGames > 0 ? ((count / cmd.totalGames) * 100).toFixed(1) : '0.0';
                            return `${faction}: ${count} games (${percentage}%)`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: { 
                        color: 'white',
                        font: { size: 12 }
                    },
                    grid: { 
                        color: 'rgba(255, 255, 255, 0.1)',
                        display: true
                    }
                },
                y: {
                    stacked: true,
                    ticks: { 
                        color: 'white',
                        font: { size: 12 }
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
                    left: 20,
                    right: 20
                }
            }
        }
    });
}

function createModalFactionDistributionChart(games, canvas) {
    const factionStats = calculateFactionStats(games, false);
    
    // Sort factions by count and get totals
    const sortedFactions = Object.entries(factionStats)
        .map(([faction, stats]) => [faction, stats.games])
        .sort(([,a], [,b]) => b - a);
    
    const totalSelections = Object.values(factionStats).reduce((sum, stats) => sum + stats.games, 0);
    
    // Define faction colors to match gaming theme
    const factionColors = {
        'I.S.D.F': 'rgba(13, 110, 253, 0.9)',    // Blue for ISDF
        'Scion': 'rgba(255, 193, 7, 0.9)',       // Yellow/Orange for Scion  
        'Hadean': 'rgba(220, 53, 69, 0.9)'       // Red for Hadean
    };
    
    // Calculate fixed dimensions with 15px bar width
    const BAR_WIDTH = 30; // Wider for single stacked bar
    const PADDING = 250;
    const MIN_WIDTH = 800;
    
    const chartHeight = 300; // Fixed height for single bar
    const chartWidth = Math.max(MIN_WIDTH, 1000);
    
    // Set container and canvas to fixed dimensions for scrolling
    const container = canvas.parentElement;
    container.style.width = `${chartWidth}px`;
    container.style.height = `${chartHeight}px`;
    container.style.overflow = 'visible';
    
    canvas.width = chartWidth;
    canvas.height = chartHeight;
    canvas.style.width = `${chartWidth}px`;
    canvas.style.height = `${chartHeight}px`;
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
                borderWidth: 1,
                barThickness: BAR_WIDTH
            }))
        },
        options: {
            indexAxis: 'y',
            responsive: false,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                x: {
                    stacked: true,
                    beginAtZero: true,
                    max: totalSelections,
                    ticks: { 
                        color: 'white',
                        font: { size: 12 }
                    },
                    grid: { 
                        color: 'rgba(255, 255, 255, 0.1)',
                        display: true
                    }
                },
                y: {
                    stacked: true,
                    ticks: { 
                        color: 'white',
                        font: { size: 12 }
                    },
                    grid: { 
                        color: 'rgba(255, 255, 255, 0.1)',
                        display: true
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: { 
                        color: 'white',
                        font: { size: 14 },
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const faction = context.dataset.label;
                            const count = context.parsed.x;
                            const percentage = ((count / totalSelections) * 100).toFixed(1);
                            return `${faction}: ${count} selections (${percentage}%)`;
                        }
                    }
                }
            },
            layout: {
                padding: {
                    top: 20,
                    bottom: 20,
                    left: 20,
                    right: 20
                }
            }
        }
    });
}

function createModalFactionPerformanceChart(games, canvas) {
    const factionStats = calculateFactionStats(games, true);
    
    const factionPerformance = Object.entries(factionStats)
        .map(([faction, stats]) => ({
            faction,
            winRate: (stats.wins / stats.games * 100).toFixed(1),
            games: stats.games,
            wins: stats.wins,
            losses: stats.games - stats.wins
        }))
        .sort((a, b) => b.wins - a.wins);
    
    // Calculate fixed dimensions with 15px bar width
    const BAR_WIDTH = 15;
    const BAR_SPACING = 25; // More spacing for grouped bars
    const PADDING = 250; // Extra padding for dual-axis
    const MIN_WIDTH = 800;
    
    const chartHeight = 500; // Fixed height for bar chart (not too tall)
    const chartWidth = Math.max(MIN_WIDTH, (factionPerformance.length * (BAR_WIDTH * 2 + BAR_SPACING)) + PADDING);
    
    // Set container and canvas to fixed dimensions for scrolling
    const container = canvas.parentElement;
    container.style.width = `${chartWidth}px`;
    container.style.height = `${chartHeight}px`;
    container.style.overflow = 'visible';
    
    canvas.width = chartWidth;
    canvas.height = chartHeight;
    canvas.style.width = `${chartWidth}px`;
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
                    label: 'Wins',
                    data: factionPerformance.map(f => f.wins),
                    backgroundColor: 'rgba(40, 167, 69, 0.8)',
                    borderColor: 'rgba(40, 167, 69, 1)',
                    borderWidth: 1,
                    yAxisID: 'y',
                    barThickness: BAR_WIDTH
                },
                {
                    label: 'Losses',
                    data: factionPerformance.map(f => f.losses),
                    backgroundColor: 'rgba(220, 53, 69, 0.8)',
                    borderColor: 'rgba(220, 53, 69, 1)',
                    borderWidth: 1,
                    yAxisID: 'y',
                    barThickness: BAR_WIDTH
                }
            ]
        },
        options: {
            responsive: false,
            maintainAspectRatio: false,
            animation: false,
            categoryPercentage: 0.8,
            barPercentage: 0.9,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: 'white',
                        font: { size: 14 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const faction = factionPerformance[context.dataIndex];
                            if (context.datasetIndex === 0) {
                                return `Wins: ${faction.wins} (${faction.winRate}% win rate)`;
                            } else {
                                return `Losses: ${faction.losses} (${faction.games} total games)`;
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { 
                        color: 'white',
                        font: { size: 12 }
                    },
                    grid: { 
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    beginAtZero: true,
                    ticks: { 
                        color: 'white',
                        font: { size: 12 }
                    },
                    grid: { 
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    title: {
                        display: true,
                        text: 'Games Won/Lost',
                        color: 'white',
                        font: { size: 14 }
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
            }
        }
    });
}

function createModalGameDurationChart(games, canvas) {
    const durationBuckets = calculateDurationBuckets(games);
    const bucketData = Object.entries(durationBuckets);
    
    // Calculate fixed dimensions with 15px bar width
    const BAR_WIDTH = 15;
    const BAR_SPACING = 25;
    const PADDING = 200;
    const MIN_WIDTH = 600;
    
    const chartHeight = 400; // Fixed reasonable height for duration chart
    const chartWidth = Math.max(MIN_WIDTH, (bucketData.length * (BAR_WIDTH + BAR_SPACING)) + PADDING);
    
    // Set container and canvas to fixed dimensions for scrolling
    const container = canvas.parentElement;
    container.style.width = `${chartWidth}px`;
    container.style.height = `${chartHeight}px`;
    container.style.overflow = 'visible';
    
    canvas.width = chartWidth;
    canvas.height = chartHeight;
    canvas.style.width = `${chartWidth}px`;
    canvas.style.height = `${chartHeight}px`;
    canvas.style.display = 'block';
    canvas.style.maxWidth = 'none';
    canvas.style.maxHeight = 'none';
    
    new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: bucketData.map(([label]) => label),
            datasets: [{
                label: 'Number of Games',
                data: bucketData.map(([,count]) => count),
                backgroundColor: 'rgba(108, 117, 125, 0.8)',
                borderColor: 'rgba(108, 117, 125, 1)',
                borderWidth: 1,
                barThickness: BAR_WIDTH
            }]
        },
        options: {
            responsive: false,
            maintainAspectRatio: false,
            animation: false,
            interaction: {
                intersect: false
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const count = context.parsed.y;
                            const total = bucketData.reduce((sum, [,bucketCount]) => sum + bucketCount, 0);
                            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
                            return `Games: ${count} (${percentage}%)`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'category',
                    ticks: { 
                        color: 'white',
                        font: { size: 12 }
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
                        font: { size: 12 }
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
                    left: 20,
                    right: 20
                }
            }
        }
    });
}

// Load player analysis with complete functionality
function loadPlayerAnalysis() {
    const games = getFilteredGames();
    const filterSelectElement = document.getElementById('filterSelect');
    const secondPlayerSelectElement = document.getElementById('secondPlayerSelect');
    const mainAnalysisElement = document.getElementById('mainAnalysis');
    
    if (!filterSelectElement || !mainAnalysisElement) {
        return;
    }
    
    const selectedPlayer = filterSelectElement.value;
    const secondPlayer = secondPlayerSelectElement ? secondPlayerSelectElement.value : '';
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
    
    // Check if we're doing head-to-head analysis
    if (secondPlayer && secondPlayer !== selectedPlayer) {
        // Head-to-head analysis
        const headToHeadGames = games.filter(game => {
            // Both players must be commanders for head-to-head analysis
            return (game.commander1 === selectedPlayer && game.commander2 === secondPlayer) ||
                   (game.commander1 === secondPlayer && game.commander2 === selectedPlayer);
        });
        
        createHeadToHeadContent(headToHeadGames, selectedPlayer, secondPlayer);
    } else {
        // Single player analysis
        const playerGames = games.filter(game => {
            if (game.commander1 === selectedPlayer || game.commander2 === selectedPlayer) return true;
            if (game.teamOne && game.teamOne.includes(selectedPlayer)) return true;
            if (game.teamTwo && game.teamTwo.includes(selectedPlayer)) return true;
            if (game.teamOneStraggler && game.teamOneStraggler.includes(selectedPlayer)) return true;
            if (game.teamTwoStraggler && game.teamTwoStraggler.includes(selectedPlayer)) return true;
            return false;
        });
        
        createPlayerContent(playerGames, selectedPlayer);
    }
}

// Create player content and charts
function createPlayerContent(playerGames, selectedPlayer) {
    const mainAnalysisElement = document.getElementById('mainAnalysis');
    
    // Create the UI for player analysis
    mainAnalysisElement.innerHTML = `
        <div class="row">
            <div class="col-12 mb-4">
                <div class="card bg-dark border-secondary">
                    <div class="card-header bg-primary text-white">
                        <h4 class="mb-0">${selectedPlayer} - Player Profile</h4>
                    </div>
                    <div class="card-body">
                        <p>Player analysis charts will be displayed here.</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Update commander filter information display
function updateCommanderFilterInfo(totalGames, minGames, minGameRequirement, teamSize) {
    const infoElement = document.getElementById('commanderFilterInfo');
    if (!infoElement) return;
    
    let teamSizeText = '';
    if (teamSize === 'ignore') {
        teamSizeText = 'All team sizes';
    } else {
        const teamSizeName = teamSize === '1' ? '1 thug (2v2)' :
                            teamSize === '2' ? '2 thugs (3v3)' :
                            teamSize === '3' ? '3 thugs (4v4)' :
                            teamSize === '4' ? '4 thugs (5v5)' : `${teamSize} thugs`;
        teamSizeText = teamSizeName;
    }
    
    let minGamesText = '';
    if (minGameRequirement.includes('%')) {
        const percentage = minGameRequirement.replace('%', '');
        minGamesText = `${percentage}% of filtered games (${minGames} games minimum)`;
    } else {
        minGamesText = `${minGames} games minimum`;
    }
    
    infoElement.innerHTML = `
        <div class="d-flex flex-wrap gap-3">
            <span><strong>Filtered games:</strong> ${totalGames}</span>
            <span><strong>Team size:</strong> ${teamSizeText}</span>
            <span><strong>Minimum games:</strong> ${minGamesText}</span>
        </div>
    `;
}

// Function to align commander chart heights dynamically
function alignCommanderChartHeights() {
    setTimeout(() => {
        const gamesCard = document.getElementById('commanderGamesCard');
        const winRateCard = document.getElementById('commanderWinRateCard');
        
        if (!gamesCard || !winRateCard) return;
        
        gamesCard.style.height = '';
        winRateCard.style.height = '';
        
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const gamesHeight = gamesCard.offsetHeight;
                const winRateHeight = winRateCard.offsetHeight;
                const maxHeight = Math.max(gamesHeight, winRateHeight);
                
                gamesCard.style.height = maxHeight + 'px';
                winRateCard.style.height = maxHeight + 'px';
                
                setTimeout(() => {
                    const gamesChart = Chart.getChart('commanderGamesChart');
                    const winRateChart = Chart.getChart('commanderWinRateChart');
                    
                    if (gamesChart) gamesChart.resize();
                    if (winRateChart) winRateChart.resize();
                }, 100);
            });
        });
    }, 200);
}

/**
 * HEIGHT ALIGNMENT SYSTEM
 * 
 * This system ensures that cards in the same row have matching heights for better visual consistency.
 * 
 * Functions:
 * - alignCommanderChartHeights(): Specific to the two commander charts in general overview
 * - alignCardHeights(): General-purpose function for all analysis modes
 * 
 * Usage:
 * - Called automatically after charts are created in each analysis mode
 * - Handles timing with chart rendering using setTimeout and requestAnimationFrame
 * - Automatically resizes charts after height adjustment
 * - Skips full-width cards (col-12) and single-card rows
 * 
 * Timing considerations:
 * - Initial 200ms delay for chart rendering
 * - Double requestAnimationFrame for proper DOM measurement
 * - Additional 100ms delay before chart resize
 */

// Generalized function to align card heights within rows
function alignCardHeights(containerSelector = '#mainAnalysis') {
    setTimeout(() => {
        const container = document.querySelector(containerSelector);
        if (!container) return;
        
        // Find all rows within the container
        const rows = container.querySelectorAll('.row');
        
        rows.forEach(row => {
            // Find all cards within this row that are in columns (col-lg-6, col-md-6, etc.)
            const cardColumns = row.querySelectorAll('[class*="col-"]:not(.col-12)');
            
            if (cardColumns.length <= 1) return; // Skip rows with only one card or full-width cards
            
            // Get all cards within these columns
            const cards = Array.from(cardColumns).map(col => col.querySelector('.card')).filter(Boolean);
            
            if (cards.length <= 1) return; // Skip if there's only one card or no cards
            
            // Reset heights to allow natural sizing
            cards.forEach(card => {
                card.style.height = '';
            });
            
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    // Get all card heights
                    const cardHeights = cards.map(card => card.offsetHeight);
                    const maxHeight = Math.max(...cardHeights);
                    
                    // Set all cards to the maximum height
                    cards.forEach(card => {
                        card.style.height = maxHeight + 'px';
                    });
                    
                    // Resize any charts within these cards after height adjustment
                    setTimeout(() => {
                        cards.forEach(card => {
                            const canvas = card.querySelector('canvas');
                            if (canvas && canvas.id) {
                                const chart = Chart.getChart(canvas.id);
                                if (chart) {
                                    chart.resize();
                                }
                            }
                        });
                    }, 100);
                });
            });
        });
    }, 200);
}

// ==================== URL PARAMETER HANDLING ====================

// Parse URL parameters into an object
function parseURLParameters() {
    const params = new URLSearchParams(window.location.search);
    const urlParams = {};
    
    for (const [key, value] of params.entries()) {
        urlParams[key] = decodeURIComponent(value);
    }
    
    return urlParams;
}

// Update URL parameters without page reload
function updateURLParameters(params, replaceState = false) {
    const url = new URL(window.location);
    
    // Clear existing parameters
    url.search = '';
    
    // Add new parameters
    Object.keys(params).forEach(key => {
        if (params[key] && params[key] !== '' && params[key] !== 'all' && params[key] !== 'general') {
            url.searchParams.set(key, encodeURIComponent(params[key]));
        }
    });
    
    // Update URL without page reload
    if (replaceState) {
        window.history.replaceState({}, '', url);
    } else {
        window.history.pushState({}, '', url);
    }
}

// Apply URL parameters to dashboard state
function applyURLParameters() {
    const urlParams = parseURLParameters();
    
    console.log('Applying URL parameters:', urlParams);
    
    // Get dropdown elements
    const analysisTypeEl = document.getElementById('analysisType');
    const filterSelectEl = document.getElementById('filterSelect');
    const secondPlayerSelectEl = document.getElementById('secondPlayerSelect');
    const timePeriodEl = document.getElementById('timePeriod');
    
    if (!analysisTypeEl || !timePeriodEl) {
        console.warn('Required dropdown elements not found');
        return;
    }
    
    // Set time period first (year parameter)
    if (urlParams.year) {
        timePeriodEl.value = urlParams.year;
    } else if (urlParams.time) {
        timePeriodEl.value = urlParams.time;
    }
    
    // Determine analysis type and set filters
    if (urlParams.player && urlParams.vsplayer) {
        // Head-to-head analysis
        analysisTypeEl.value = 'player';
        handleAnalysisTypeChange(); // This will populate the player dropdowns
        
        setTimeout(() => {
            if (filterSelectEl) filterSelectEl.value = urlParams.player;
            if (secondPlayerSelectEl) secondPlayerSelectEl.value = urlParams.vsplayer;
            loadContent();
        }, 100);
        
    } else if (urlParams.player) {
        // Single player analysis
        analysisTypeEl.value = 'player';
        handleAnalysisTypeChange();
        
        setTimeout(() => {
            if (filterSelectEl) filterSelectEl.value = urlParams.player;
            loadContent();
        }, 100);
        
    } else if (urlParams.map) {
        // Map analysis
        analysisTypeEl.value = 'map';
        handleAnalysisTypeChange();
        
        setTimeout(() => {
            if (filterSelectEl) filterSelectEl.value = urlParams.map;
            loadContent();
        }, 100);
        
    } else if (urlParams.faction) {
        // Faction analysis
        analysisTypeEl.value = 'faction';
        handleAnalysisTypeChange();
        
        setTimeout(() => {
            if (filterSelectEl) filterSelectEl.value = urlParams.faction;
            loadContent();
        }, 100);
        
    } else if (urlParams.analysis) {
        // Explicit analysis type
        analysisTypeEl.value = urlParams.analysis;
        handleAnalysisTypeChange();
        
        setTimeout(() => {
            loadContent();
        }, 100);
    } else {
        // Default: just load content with any time period changes
        loadContent();
    }
}

// Generate shareable URL for current state
function generateShareableURL() {
    const analysisTypeEl = document.getElementById('analysisType');
    const filterSelectEl = document.getElementById('filterSelect');
    const secondPlayerSelectEl = document.getElementById('secondPlayerSelect');
    const timePeriodEl = document.getElementById('timePeriod');
    
    const params = {};
    
    // Add time period if not default
    if (timePeriodEl && timePeriodEl.value !== 'all') {
        params.year = timePeriodEl.value;
    }
    
    // Add analysis-specific parameters
    if (analysisTypeEl) {
        const analysisType = analysisTypeEl.value;
        
        if (analysisType === 'player') {
            const player1 = filterSelectEl ? filterSelectEl.value : '';
            const player2 = secondPlayerSelectEl ? secondPlayerSelectEl.value : '';
            
            if (player1 && player2) {
                // Head-to-head
                params.player = player1;
                params.vsplayer = player2;
            } else if (player1) {
                // Single player
                params.player = player1;
            }
        } else if (analysisType === 'map') {
            const map = filterSelectEl ? filterSelectEl.value : '';
            if (map) params.map = map;
        } else if (analysisType === 'faction') {
            const faction = filterSelectEl ? filterSelectEl.value : '';
            if (faction) params.faction = faction;
        } else if (analysisType !== 'general') {
            params.analysis = analysisType;
        }
    }
    
    return params;
}

// Add share button functionality
function addShareButton() {
    // Add share button to toolbar
    const toolbarActions = document.querySelector('.toolbar-section .col-md-3:last-child .d-flex');
    if (!toolbarActions) return;
    
    const shareButton = document.createElement('button');
    shareButton.id = 'shareButton';
    shareButton.className = 'btn btn-outline-info';
    shareButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-share me-1" viewBox="0 0 16 16">
            <path d="M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5zm-8.5 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm11 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/>
        </svg>
        Share
    `;
    shareButton.title = 'Copy shareable link';
    
    shareButton.addEventListener('click', async () => {
        const params = generateShareableURL();
        const url = new URL(window.location.origin + window.location.pathname);
        
        Object.keys(params).forEach(key => {
            if (params[key]) {
                url.searchParams.set(key, encodeURIComponent(params[key]));
            }
        });
        
        try {
            await navigator.clipboard.writeText(url.toString());
            
            // Show success feedback
            const originalText = shareButton.innerHTML;
            shareButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check-lg me-1" viewBox="0 0 16 16">
                    <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022Z"/>
                </svg>
                Copied!
            `;
            shareButton.classList.remove('btn-outline-info');
            shareButton.classList.add('btn-success');
            
            setTimeout(() => {
                shareButton.innerHTML = originalText;
                shareButton.classList.remove('btn-success');
                shareButton.classList.add('btn-outline-info');
            }, 2000);
        } catch (err) {
            console.error('Failed to copy URL:', err);
            
            // Fallback: show URL in a prompt
            prompt('Copy this shareable link:', url.toString());
        }
    });
    
    toolbarActions.appendChild(shareButton);
}

// Update URL when filters change (with debouncing)
let urlUpdateTimeout;
function scheduleURLUpdate() {
    clearTimeout(urlUpdateTimeout);
    urlUpdateTimeout = setTimeout(() => {
        const params = generateShareableURL();
        updateURLParameters(params, true); // Use replaceState to avoid cluttering history
    }, 500); // 500ms debounce
}

// ==================== END URL PARAMETER HANDLING ====================

// Wait for DOM to be ready, then load data
document.addEventListener('DOMContentLoaded', function() {
    if (typeof Chart === 'undefined') {
        console.error('Chart.js not loaded');
        return;
    }
    
    if (typeof bootstrap === 'undefined') {
        console.error('Bootstrap not loaded');
        return;
    }
    
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
    
    console.log('🔗 URL Parameters System Active! 🔗');
    console.log('✅ Shareable dashboard links enabled');
    console.log('✅ Deep linking to specific views');
    console.log('✅ URL state synchronization');
    
    // Handle browser back/forward navigation
    window.addEventListener('popstate', () => {
        setTimeout(() => {
            applyURLParameters();
        }, 100);
    });
    
    loadGameData();
});

// Modal chart functions for head-to-head analysis
function createModalHeadToHeadWinRateChart(games, canvas, player1, player2) {
    let player1Wins = 0;
    let player2Wins = 0;
    
    games.forEach(game => {
        if (game.winner === player1) player1Wins++;
        else if (game.winner === player2) player2Wins++;
    });
    
    const totalGames = games.length;
    const player1WinRate = totalGames > 0 ? (player1Wins / totalGames * 100) : 0;
    const player2WinRate = totalGames > 0 ? (player2Wins / totalGames * 100) : 0;
    
    const chartHeight = 400;
    const chartWidth = 800;
    
    const container = canvas.parentElement;
    container.style.width = `${chartWidth}px`;
    container.style.height = `${chartHeight}px`;
    container.style.overflow = 'visible';
    
    canvas.width = chartWidth;
    canvas.height = chartHeight;
    canvas.style.width = `${chartWidth}px`;
    canvas.style.height = `${chartHeight}px`;
    canvas.style.display = 'block';
    canvas.style.maxWidth = 'none';
    canvas.style.maxHeight = 'none';
    
    new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: [player1, player2],
            datasets: [{
                label: 'Win Rate (%)',
                data: [player1WinRate, player2WinRate],
                backgroundColor: ['rgba(40, 167, 69, 0.8)', 'rgba(220, 53, 69, 0.8)'],
                borderColor: ['rgba(40, 167, 69, 1)', 'rgba(220, 53, 69, 1)'],
                borderWidth: 1,
                barThickness: 60
            }]
        },
        options: {
            responsive: false,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const player = context.label;
                            const winRate = context.parsed.y.toFixed(1);
                            const wins = player === player1 ? player1Wins : player2Wins;
                            return [
                                `${player}: ${winRate}%`,
                                `Wins: ${wins}/${totalGames}`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    max: 100,
                    title: { display: true, text: 'Win Rate (%)' },
                    ticks: { color: 'white', font: { size: 12 } },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                x: {
                    ticks: { color: 'white', font: { size: 12 } },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            },
            layout: { padding: { top: 20, bottom: 20, left: 20, right: 20 } }
        }
    });
}

function createModalHeadToHeadFactionsChart(games, canvas, player1, player2) {
    const player1Factions = { 'I.S.D.F': 0, 'Hadean': 0, 'Scion': 0 };
    const player2Factions = { 'I.S.D.F': 0, 'Hadean': 0, 'Scion': 0 };
    
    games.forEach(game => {
        if (game.commander1 === player1) {
            if (game.faction1) player1Factions[game.faction1]++;
            if (game.faction2) player2Factions[game.faction2]++;
        } else {
            if (game.faction2) player1Factions[game.faction2]++;
            if (game.faction1) player2Factions[game.faction1]++;
        }
    });
    
    const factionColors = {
        'I.S.D.F': 'rgba(13, 110, 253, 0.8)',
        'Hadean': 'rgba(220, 53, 69, 0.8)',
        'Scion': 'rgba(255, 193, 7, 0.8)'
    };
    
    const chartHeight = 500;
    const chartWidth = 800;
    
    const container = canvas.parentElement;
    container.style.width = `${chartWidth}px`;
    container.style.height = `${chartHeight}px`;
    container.style.overflow = 'visible';
    
    canvas.width = chartWidth;
    canvas.height = chartHeight;
    canvas.style.width = `${chartWidth}px`;
    canvas.style.height = `${chartHeight}px`;
    canvas.style.display = 'block';
    canvas.style.maxWidth = 'none';
    canvas.style.maxHeight = 'none';
    
    new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: [player1, player2],
            datasets: Object.keys(factionColors).map(faction => ({
                label: faction,
                data: [player1Factions[faction], player2Factions[faction]],
                backgroundColor: factionColors[faction],
                borderColor: factionColors[faction].replace('0.8', '1'),
                borderWidth: 1,
                barThickness: 40
            }))
        },
        options: {
            responsive: false,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
                legend: { display: true, position: 'top', labels: { color: 'white', font: { size: 14 } } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const faction = context.dataset.label;
                            const games = context.parsed.y;
                            const player = context.label;
                            const totalGames = Object.values(player === player1 ? player1Factions : player2Factions).reduce((a, b) => a + b, 0);
                            const percentage = totalGames > 0 ? ((games / totalGames) * 100).toFixed(1) : '0.0';
                            return `${faction}: ${games} games (${percentage}%)`;
                        }
                    }
                }
            },
            scales: {
                x: { stacked: true, ticks: { color: 'white', font: { size: 12 } }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
                y: { 
                    stacked: true,
                    beginAtZero: true,
                    title: { display: true, text: 'Games Played', color: 'white', font: { size: 14 } },
                    ticks: { color: 'white', font: { size: 12 } },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            },
            layout: { padding: { top: 20, bottom: 20, left: 20, right: 20 } }
        }
    });
}

function createModalHeadToHeadFactionMatchupsChart(games, canvas, player1, player2) {
    const matchupStats = {};
    
    games.forEach(game => {
        let player1Faction, player2Faction, player1Won;
        
        if (game.commander1 === player1) {
            player1Faction = game.faction1;
            player2Faction = game.faction2;
            player1Won = game.winner === player1;
        } else {
            player1Faction = game.faction2;
            player2Faction = game.faction1;
            player1Won = game.winner === player1;
        }
        
        const matchupKey = `${player1Faction} vs ${player2Faction}`;
        if (!matchupStats[matchupKey]) {
            matchupStats[matchupKey] = { games: 0, player1Wins: 0 };
        }
        matchupStats[matchupKey].games++;
        if (player1Won) {
            matchupStats[matchupKey].player1Wins++;
        }
    });
    
    const matchupData = Object.entries(matchupStats)
        .filter(([, stats]) => stats.games >= 1) // Show all matchups in modal
        .map(([matchup, stats]) => ({
            matchup,
            player1WinRate: (stats.player1Wins / stats.games * 100).toFixed(1),
            games: stats.games,
            player1Wins: stats.player1Wins
        }))
        .sort((a, b) => b.games - a.games);
    
    const chartHeight = 400;
    const chartWidth = Math.max(800, matchupData.length * 100);
    
    const container = canvas.parentElement;
    container.style.width = `${chartWidth}px`;
    container.style.height = `${chartHeight}px`;
    container.style.overflow = 'visible';
    
    canvas.width = chartWidth;
    canvas.height = chartHeight;
    canvas.style.width = `${chartWidth}px`;
    canvas.style.height = `${chartHeight}px`;
    canvas.style.display = 'block';
    canvas.style.maxWidth = 'none';
    canvas.style.maxHeight = 'none';
    
    new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: matchupData.map(m => m.matchup),
            datasets: [{
                label: `${player1} Win Rate (%)`,
                data: matchupData.map(m => parseFloat(m.player1WinRate)),
                backgroundColor: 'rgba(40, 167, 69, 0.8)',
                borderColor: 'rgba(40, 167, 69, 1)',
                borderWidth: 1,
                barThickness: 30
            }]
        },
        options: {
            responsive: false,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const matchup = matchupData[context.dataIndex];
                            return [
                                `${player1}: ${matchup.player1WinRate}%`,
                                `Games: ${matchup.games}`,
                                `${player1} Wins: ${matchup.player1Wins}`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    max: 100,
                    title: { display: true, text: `${player1} Win Rate (%)`, color: 'white', font: { size: 14 } },
                    ticks: { color: 'white', font: { size: 12 } },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                x: {
                    ticks: { color: 'white', font: { size: 12 } },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            },
            layout: { padding: { top: 20, bottom: 20, left: 20, right: 20 } }
        }
    });
}

function createModalHeadToHeadMapsChart(games, canvas, player1, player2) {
    const mapStats = {};
    
    games.forEach(game => {
        const player1Won = game.winner === player1;
        
        if (!mapStats[game.map]) {
            mapStats[game.map] = { games: 0, player1Wins: 0 };
        }
        mapStats[game.map].games++;
        if (player1Won) {
            mapStats[game.map].player1Wins++;
        }
    });
    
    const mapData = Object.entries(mapStats)
        .map(([map, stats]) => ({
            map,
            player1WinRate: (stats.player1Wins / stats.games * 100).toFixed(1),
            games: stats.games,
            player1Wins: stats.player1Wins
        }))
        .sort((a, b) => b.games - a.games);
    
    const BAR_WIDTH = 15;
    const BAR_SPACING = 8;
    const PADDING = 200;
    const MIN_WIDTH = 800;
    
    const chartHeight = (mapData.length * (BAR_WIDTH + BAR_SPACING)) + PADDING;
    const chartWidth = Math.max(MIN_WIDTH, 1000);
    
    const container = canvas.parentElement;
    container.style.width = `${chartWidth}px`;
    container.style.height = `${chartHeight}px`;
    container.style.overflow = 'visible';
    
    canvas.width = chartWidth;
    canvas.height = chartHeight;
    canvas.style.width = `${chartWidth}px`;
    canvas.style.height = `${chartHeight}px`;
    canvas.style.display = 'block';
    canvas.style.maxWidth = 'none';
    canvas.style.maxHeight = 'none';
    
    new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: mapData.map(m => m.map),
            datasets: [{
                label: `${player1} Win Rate (%)`,
                data: mapData.map(m => parseFloat(m.player1WinRate)),
                backgroundColor: 'rgba(108, 117, 125, 0.8)',
                borderColor: 'rgba(108, 117, 125, 1)',
                borderWidth: 1,
                barThickness: BAR_WIDTH
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: false,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const map = mapData[context.dataIndex];
                            return [
                                `${player1}: ${map.player1WinRate}%`,
                                `Games: ${map.games}`,
                                `${player1} Wins: ${map.player1Wins}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: { 
                    beginAtZero: true,
                    max: 100,
                    title: { display: true, text: `${player1} Win Rate (%)`, color: 'white', font: { size: 14 } },
                    ticks: { color: 'white', font: { size: 12 } },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    ticks: { color: 'white', font: { size: 12 } },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            },
            layout: { padding: { top: 20, bottom: 20, left: 20, right: 20 } }
        }
    });
}

function createModalHeadToHeadTimelineChart(games, canvas, player1, player2) {
    const sortedGames = games.sort((a, b) => {
        const dateA = new Date(a.year, parseInt(a.month) - 1, parseInt(a.day));
        const dateB = new Date(b.year, parseInt(b.month) - 1, parseInt(b.day));
        return dateA - dateB;
    });
    
    let player1CumulativeWins = 0;
    let player2CumulativeWins = 0;
    
    const timelineData = sortedGames.map((game, index) => {
        if (game.winner === player1) player1CumulativeWins++;
        else if (game.winner === player2) player2CumulativeWins++;
        
        const totalGames = index + 1;
        return {
            game: `Game ${totalGames}`,
            date: `${game.year}-${game.month.padStart(2, '0')}-${game.day.padStart(2, '0')}`,
            player1WinRate: (player1CumulativeWins / totalGames * 100).toFixed(1),
            player2WinRate: (player2CumulativeWins / totalGames * 100).toFixed(1),
            player1Wins: player1CumulativeWins,
            player2Wins: player2CumulativeWins
        };
    });
    
    const chartHeight = 500;
    const chartWidth = Math.max(1000, timelineData.length * 60);
    
    const container = canvas.parentElement;
    container.style.width = `${chartWidth}px`;
    container.style.height = `${chartHeight}px`;
    container.style.overflow = 'visible';
    
    canvas.width = chartWidth;
    canvas.height = chartHeight;
    canvas.style.width = `${chartWidth}px`;
    canvas.style.height = `${chartHeight}px`;
    canvas.style.display = 'block';
    canvas.style.maxWidth = 'none';
    canvas.style.maxHeight = 'none';
    
    new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: timelineData.map(d => d.game),
            datasets: [
                {
                    label: `${player1} Win Rate`,
                    data: timelineData.map(d => parseFloat(d.player1WinRate)),
                    borderColor: 'rgba(40, 167, 69, 1)',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: false
                },
                {
                    label: `${player2} Win Rate`,
                    data: timelineData.map(d => parseFloat(d.player2WinRate)),
                    borderColor: 'rgba(220, 53, 69, 1)',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: false
                }
            ]
        },
        options: {
            responsive: false,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
                legend: { 
                    position: 'top', 
                    labels: { color: 'white', font: { size: 14 }, padding: 20 } 
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            const dataIndex = context[0].dataIndex;
                            const data = timelineData[dataIndex];
                            return `${data.game} (${data.date})`;
                        },
                        label: function(context) {
                            const dataIndex = context.dataIndex;
                            const data = timelineData[dataIndex];
                            if (context.datasetIndex === 0) {
                                return `${player1}: ${data.player1WinRate}% (${data.player1Wins} wins)`;
                            } else {
                                return `${player2}: ${data.player2WinRate}% (${data.player2Wins} wins)`;
                            }
                        }
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    max: 100,
                    title: { display: true, text: 'Win Rate (%)', color: 'white', font: { size: 14 } },
                    ticks: { color: 'white', font: { size: 12 } },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                x: {
                    title: { display: true, text: 'Games Played', color: 'white', font: { size: 14 } },
                    ticks: { color: 'white', font: { size: 12 } },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            },
            layout: { padding: { top: 20, bottom: 20, left: 20, right: 20 } }
        }
    });
}

function createModalCommanderWinRateChart(games, canvas, rankingMethod, minGameRequirement, teamSize) {
    const commanderStats = {};
    
    // Filter games by team size first (unless "ignore" is selected)
    let filteredGames = games;
    if (teamSize !== 'ignore') {
        const targetTeamSize = parseInt(teamSize) + 1; // thugs + commander = team size
        filteredGames = games.filter(game => {
            const commander1TeamSize = (game.teamOne ? game.teamOne.length : 0) + 1;
            const commander2TeamSize = (game.teamTwo ? game.teamTwo.length : 0) + 1;
            return commander1TeamSize == targetTeamSize || commander2TeamSize == targetTeamSize;
        });
    }
    
    // Calculate comprehensive stats for each commander
    filteredGames.forEach(game => {
        [game.commander1, game.commander2].forEach(commander => {
            if (teamSize === 'ignore') {
                // No team size filtering, include all games for this commander
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
            } else {
                // Team size filtering: only include if this commander had the specified team size
                const isCommander1 = commander === game.commander1;
                const commanderTeamSize = isCommander1 ? 
                    (game.teamOne ? game.teamOne.length : 0) + 1 : 
                    (game.teamTwo ? game.teamTwo.length : 0) + 1;
                
                const targetTeamSize = parseInt(teamSize) + 1;
                
                if (commanderTeamSize == targetTeamSize) {
                    if (!commanderStats[commander]) {
                        commanderStats[commander] = { games: 0, wins: 0, faction: {} };
                    }
                    commanderStats[commander].games++;
                    
                    if (game.winner === commander) {
                        commanderStats[commander].wins++;
                    }
                    
                    // Track faction usage
                    const faction = isCommander1 ? game.faction1 : game.faction2;
                    commanderStats[commander].faction[faction] = (commanderStats[commander].faction[faction] || 0) + 1;
                }
            }
        });
    });
    
    // Apply minimum games filter
    let minGames;
    if (minGameRequirement.includes('%')) {
        const percentage = parseFloat(minGameRequirement.replace('%', ''));
        minGames = Math.ceil(filteredGames.length * (percentage / 100));
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
                score = calculateWilsonScore(stats.wins, stats.games);
                break;
            case 'winRate':
                score = winRate;
                break;
            case 'volumeWeighted':
                score = winRate * Math.log(stats.games + 1);
                break;
            case 'bayesian':
                // Bayesian average
                const globalWinRate = filteredGames.filter(g => g.winner).length / (filteredGames.length * 2);
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
    
    // Calculate fixed dimensions based on data with 15px bar width
    const BAR_WIDTH = 15;
    const BAR_SPACING = 8;
    const PADDING = 200;
    const MIN_WIDTH = 800;
    
    const chartHeight = (sortedCommanders.length * (BAR_WIDTH + BAR_SPACING)) + PADDING;
    const chartWidth = Math.max(MIN_WIDTH, 1000);
    
    // Set container and canvas to fixed dimensions for scrolling
    const container = canvas.parentElement;
    container.style.width = `${chartWidth}px`;
    container.style.height = `${chartHeight}px`;
    container.style.overflow = 'visible';
    
    canvas.width = chartWidth;
    canvas.height = chartHeight;
    canvas.style.width = `${chartWidth}px`;
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
                borderWidth: 1,
                barThickness: BAR_WIDTH
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: false,
            maintainAspectRatio: false,
            animation: false,
            interaction: {
                intersect: false
            },
            plugins: {
                legend: {
                    display: false
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
                        font: { size: 12 }
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
                        font: { size: 12 }
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
                    left: 20,
                    right: 20
                }
            }
        }
    });
}

// Create comprehensive player content and charts
function createPlayerContent(playerGames, selectedPlayer) {
    const mainAnalysisElement = document.getElementById('mainAnalysis');
    
    // Create the UI for player analysis with multiple chart sections
    mainAnalysisElement.innerHTML = `
        <div class="row">
            <!-- Player Performance by Faction -->
            <div class="col-lg-6 mb-4">
                <div class="card bg-dark border-secondary">
                    <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">${selectedPlayer} - Faction Performance</h5>
                        <button class="btn btn-sm btn-outline-light maximize-chart" data-chart-type="playerFactionPerformance" data-chart-title="${selectedPlayer} - Faction Performance">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="card-body">
                        <canvas id="playerFactionChart"></canvas>
                    </div>
                </div>
            </div>
            
            <!-- Player Role Distribution -->
            <div class="col-lg-6 mb-4">
                <div class="card bg-dark border-secondary">
                    <div class="card-header bg-success text-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">${selectedPlayer} - Role Distribution</h5>
                        <button class="btn btn-sm btn-outline-light maximize-chart" data-chart-type="playerRoleDistribution" data-chart-title="${selectedPlayer} - Role Distribution">
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
            
            <!-- Player Head-to-Head Spider Chart -->
            <div class="col-lg-6 mb-4">
                <div class="card bg-dark border-secondary">
                    <div class="card-header bg-warning text-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">${selectedPlayer} - Head-to-Head Performance</h5>
                        <button class="btn btn-sm btn-outline-light maximize-chart" data-chart-type="playerHeadToHead" data-chart-title="${selectedPlayer} - Head-to-Head vs Top Opponents">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="card-body">
                        <canvas id="playerHeadToHeadChart"></canvas>
                    </div>
                </div>
            </div>
            
            <!-- Player Monthly Performance Trend -->
            <div class="col-lg-6 mb-4">
                <div class="card bg-dark border-secondary">
                    <div class="card-header bg-secondary text-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">${selectedPlayer} - Performance Trend Over Time</h5>
                        <button class="btn btn-sm btn-outline-light maximize-chart" data-chart-type="playerTimeTrend" data-chart-title="${selectedPlayer} - Performance Over Time">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="card-body">
                        <canvas id="playerTrendChart"></canvas>
                    </div>
                </div>
            </div>
            
            <!-- Player Map Performance -->
            <div class="col-12 mb-4">
                <div class="card bg-dark border-secondary">
                    <div class="card-header bg-info text-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">${selectedPlayer} - Top Map Performance</h5>
                        <button class="btn btn-sm btn-outline-light maximize-chart" data-chart-type="playerMapPerformance" data-chart-title="${selectedPlayer} - Map Performance">
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
        </div>
    `;
    
    // Create all player-specific charts
    createPlayerFactionChart(playerGames, selectedPlayer);
    createPlayerRoleChart(playerGames, selectedPlayer);
    createPlayerMapChart(playerGames, selectedPlayer);
    createPlayerHeadToHeadChart(playerGames, selectedPlayer);
    createPlayerTrendChart(playerGames, selectedPlayer);
    
    // Align card heights after all charts are created and rendered
    alignCardHeights();
    
    // Add event listeners for maximize buttons
    document.querySelectorAll('.maximize-chart').forEach(button => {
        button.addEventListener('click', (e) => {
            const chartType = e.currentTarget.dataset.chartType;
            const chartTitle = e.currentTarget.dataset.chartTitle;
            showModalChart(playerGames, chartType, chartTitle, selectedPlayer);
        });
    });
}

// ==================== HEAD-TO-HEAD ANALYSIS FUNCTIONS ====================

// Create head-to-head content and charts
function createHeadToHeadContent(headToHeadGames, player1, player2) {
    const mainAnalysisElement = document.getElementById('mainAnalysis');
    
    if (headToHeadGames.length === 0) {
        mainAnalysisElement.innerHTML = `
            <div class="alert alert-warning">
                <h5>Head-to-Head Analysis: ${player1} vs ${player2}</h5>
                <p>No direct commander vs commander games found between these players.</p>
                <p>Head-to-head analysis requires both players to be commanders in the same game.</p>
            </div>
        `;
        return;
    }
    
    // Calculate overall head-to-head record
    let player1Wins = 0;
    let player2Wins = 0;
    
    headToHeadGames.forEach(game => {
        if (game.winner === player1) player1Wins++;
        else if (game.winner === player2) player2Wins++;
    });
    
    const totalGames = headToHeadGames.length;
    const player1WinRate = totalGames > 0 ? ((player1Wins / totalGames) * 100).toFixed(1) : '0.0';
    const player2WinRate = totalGames > 0 ? ((player2Wins / totalGames) * 100).toFixed(1) : '0.0';
    
    // Create the UI for head-to-head analysis
    mainAnalysisElement.innerHTML = `
        <!-- Head-to-Head Summary -->
        <div class="row mb-4">
            <div class="col-12">
                <div class="card bg-dark border-secondary">
                    <div class="card-header bg-primary text-white">
                        <h4 class="mb-0">Head-to-Head: ${player1} vs ${player2}</h4>
                    </div>
                    <div class="card-body">
                        <div class="row text-center">
                            <div class="col-md-3">
                                <h3 class="text-info">${totalGames}</h3>
                                <p class="mb-0">Total Games</p>
                            </div>
                            <div class="col-md-3">
                                <h3 class="text-success">${player1Wins}</h3>
                                <p class="mb-0">${player1} Wins (${player1WinRate}%)</p>
                            </div>
                            <div class="col-md-3">
                                <h3 class="text-danger">${player2Wins}</h3>
                                <p class="mb-0">${player2} Wins (${player2WinRate}%)</p>
                            </div>
                            <div class="col-md-3">
                                <h3 class="text-warning">${calculateAverageGameTime(headToHeadGames)}</h3>
                                <p class="mb-0">Avg Game Time</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row">
            <!-- Head-to-Head Win Rate Breakdown -->
            <div class="col-lg-6 mb-4">
                <div class="card bg-dark border-secondary">
                    <div class="card-header bg-success text-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Win Rate Comparison</h5>
                        <button class="btn btn-sm btn-outline-light maximize-chart" data-chart-type="headToHeadWinRate" data-chart-title="Head-to-Head Win Rate: ${player1} vs ${player2}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="card-body">
                        <canvas id="headToHeadWinRateChart"></canvas>
                    </div>
                </div>
            </div>
            
            <!-- Faction Choices -->
            <div class="col-lg-6 mb-4">
                <div class="card bg-dark border-secondary">
                    <div class="card-header bg-warning text-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Faction Preferences</h5>
                        <button class="btn btn-sm btn-outline-light maximize-chart" data-chart-type="headToHeadFactions" data-chart-title="Faction Choices: ${player1} vs ${player2}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="card-body">
                        <canvas id="headToHeadFactionsChart"></canvas>
                    </div>
                </div>
            </div>
            
            <!-- Faction Matchup Performance -->
            <div class="col-lg-6 mb-4">
                <div class="card bg-dark border-secondary">
                    <div class="card-header bg-info text-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Faction Matchup Performance</h5>
                        <button class="btn btn-sm btn-outline-light maximize-chart" data-chart-type="headToHeadFactionMatchups" data-chart-title="Faction Matchup Win Rates: ${player1} vs ${player2}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="card-body">
                        <canvas id="headToHeadFactionMatchupsChart"></canvas>
                    </div>
                </div>
            </div>
            
            <!-- Map Performance -->
            <div class="col-lg-6 mb-4">
                <div class="card bg-dark border-secondary">
                    <div class="card-header bg-secondary text-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Map Performance</h5>
                        <button class="btn btn-sm btn-outline-light maximize-chart" data-chart-type="headToHeadMaps" data-chart-title="Map Performance: ${player1} vs ${player2}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="card-body">
                        <canvas id="headToHeadMapsChart"></canvas>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Performance Over Time - Full Width -->
        <div class="row">
            <div class="col-12 mb-4">
                <div class="card bg-dark border-secondary">
                    <div class="card-header bg-purple text-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Head-to-Head Performance Over Time</h5>
                        <button class="btn btn-sm btn-outline-light maximize-chart" data-chart-type="headToHeadTimeline" data-chart-title="Performance Timeline: ${player1} vs ${player2}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="card-body">
                        <canvas id="headToHeadTimelineChart"></canvas>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Create all head-to-head charts
    createHeadToHeadWinRateChart(headToHeadGames, player1, player2);
    createHeadToHeadFactionsChart(headToHeadGames, player1, player2);
    createHeadToHeadFactionMatchupsChart(headToHeadGames, player1, player2);
    createHeadToHeadMapsChart(headToHeadGames, player1, player2);
    createHeadToHeadTimelineChart(headToHeadGames, player1, player2);
    
    // Align card heights after all charts are created and rendered
    alignCardHeights();
    
    // Add event listeners for maximize buttons
    document.querySelectorAll('.maximize-chart').forEach(button => {
        button.addEventListener('click', (e) => {
            const chartType = e.currentTarget.dataset.chartType;
            const chartTitle = e.currentTarget.dataset.chartTitle;
            showModalChart(headToHeadGames, chartType, chartTitle, player1, player2);
        });
    });
}

// Create head-to-head win rate chart
function createHeadToHeadWinRateChart(headToHeadGames, player1, player2) {
    let player1Wins = 0;
    let player2Wins = 0;
    
    headToHeadGames.forEach(game => {
        if (game.winner === player1) player1Wins++;
        else if (game.winner === player2) player2Wins++;
    });
    
    const totalGames = headToHeadGames.length;
    const player1WinRate = totalGames > 0 ? (player1Wins / totalGames * 100) : 0;
    const player2WinRate = totalGames > 0 ? (player2Wins / totalGames * 100) : 0;
    
    safeCreateChart('headToHeadWinRateChart', {
        type: 'bar',
        data: {
            labels: [player1, player2],
            datasets: [{
                label: 'Win Rate (%)',
                data: [player1WinRate, player2WinRate],
                backgroundColor: ['rgba(40, 167, 69, 0.8)', 'rgba(220, 53, 69, 0.8)'],
                borderColor: ['rgba(40, 167, 69, 1)', 'rgba(220, 53, 69, 1)'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const player = context.label;
                            const winRate = context.parsed.y.toFixed(1);
                            const wins = player === player1 ? player1Wins : player2Wins;
                            return [
                                `${player}: ${winRate}%`,
                                `Wins: ${wins}/${totalGames}`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    max: 100,
                    title: { display: true, text: 'Win Rate (%)' }
                }
            }
        }
    });
}

// Create head-to-head faction choices chart
function createHeadToHeadFactionsChart(headToHeadGames, player1, player2) {
    const player1Factions = { 'I.S.D.F': 0, 'Hadean': 0, 'Scion': 0 };
    const player2Factions = { 'I.S.D.F': 0, 'Hadean': 0, 'Scion': 0 };
    
    headToHeadGames.forEach(game => {
        if (game.commander1 === player1) {
            if (game.faction1) player1Factions[game.faction1]++;
            if (game.faction2) player2Factions[game.faction2]++;
        } else {
            if (game.faction2) player1Factions[game.faction2]++;
            if (game.faction1) player2Factions[game.faction1]++;
        }
    });
    
    const factionColors = {
        'I.S.D.F': 'rgba(13, 110, 253, 0.8)',
        'Hadean': 'rgba(220, 53, 69, 0.8)',
        'Scion': 'rgba(255, 193, 7, 0.8)'
    };
    
    safeCreateChart('headToHeadFactionsChart', {
        type: 'bar',
        data: {
            labels: [player1, player2],
            datasets: Object.keys(factionColors).map(faction => ({
                label: faction,
                data: [player1Factions[faction], player2Factions[faction]],
                backgroundColor: factionColors[faction],
                borderColor: factionColors[faction].replace('0.8', '1'),
                borderWidth: 1
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const faction = context.dataset.label;
                            const games = context.parsed.y;
                            const player = context.label;
                            const totalGames = Object.values(player === player1 ? player1Factions : player2Factions).reduce((a, b) => a + b, 0);
                            const percentage = totalGames > 0 ? ((games / totalGames) * 100).toFixed(1) : '0.0';
                            return `${faction}: ${games} games (${percentage}%)`;
                        }
                    }
                }
            },
            scales: {
                x: { stacked: true },
                y: { 
                    stacked: true,
                    beginAtZero: true,
                    title: { display: true, text: 'Games Played' }
                }
            }
        }
    });
}

// Create head-to-head faction matchup performance chart
function createHeadToHeadFactionMatchupsChart(headToHeadGames, player1, player2) {
    const matchupStats = {};
    
    headToHeadGames.forEach(game => {
        let player1Faction, player2Faction, player1Won;
        
        if (game.commander1 === player1) {
            player1Faction = game.faction1;
            player2Faction = game.faction2;
            player1Won = game.winner === player1;
        } else {
            player1Faction = game.faction2;
            player2Faction = game.faction1;
            player1Won = game.winner === player1;
        }
        
        const matchupKey = `${player1Faction} vs ${player2Faction}`;
        if (!matchupStats[matchupKey]) {
            matchupStats[matchupKey] = { games: 0, player1Wins: 0 };
        }
        matchupStats[matchupKey].games++;
        if (player1Won) {
            matchupStats[matchupKey].player1Wins++;
        }
    });
    
    const matchupData = Object.entries(matchupStats)
        .filter(([, stats]) => stats.games >= 2) // Only show matchups with 2+ games
        .map(([matchup, stats]) => ({
            matchup,
            player1WinRate: (stats.player1Wins / stats.games * 100).toFixed(1),
            games: stats.games,
            player1Wins: stats.player1Wins
        }))
        .sort((a, b) => b.games - a.games);
    
    if (matchupData.length === 0) {
        const canvas = document.getElementById('headToHeadFactionMatchupsChart');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#e8e8ff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Not enough data for', canvas.width/2, canvas.height/2 - 10);
        ctx.fillText('faction matchup analysis', canvas.width/2, canvas.height/2 + 15);
        return;
    }
    
    safeCreateChart('headToHeadFactionMatchupsChart', {
        type: 'bar',
        data: {
            labels: matchupData.map(m => m.matchup),
            datasets: [{
                label: `${player1} Win Rate (%)`,
                data: matchupData.map(m => parseFloat(m.player1WinRate)),
                backgroundColor: 'rgba(40, 167, 69, 0.8)',
                borderColor: 'rgba(40, 167, 69, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const matchup = matchupData[context.dataIndex];
                            return [
                                `${player1}: ${matchup.player1WinRate}%`,
                                `Games: ${matchup.games}`,
                                `${player1} Wins: ${matchup.player1Wins}`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    max: 100,
                    title: { display: true, text: `${player1} Win Rate (%)` }
                }
            }
        }
    });
}

// Create head-to-head map performance chart
function createHeadToHeadMapsChart(headToHeadGames, player1, player2) {
    const mapStats = {};
    
    headToHeadGames.forEach(game => {
        const player1Won = game.winner === player1;
        
        if (!mapStats[game.map]) {
            mapStats[game.map] = { games: 0, player1Wins: 0 };
        }
        mapStats[game.map].games++;
        if (player1Won) {
            mapStats[game.map].player1Wins++;
        }
    });
    
    const mapData = Object.entries(mapStats)
        .filter(([, stats]) => stats.games >= 1) // Show all maps with any games
        .map(([map, stats]) => ({
            map,
            player1WinRate: (stats.player1Wins / stats.games * 100).toFixed(1),
            games: stats.games,
            player1Wins: stats.player1Wins
        }))
        .sort((a, b) => b.games - a.games)
        .slice(0, 8); // Top 8 maps
    
    if (mapData.length === 0) {
        const canvas = document.getElementById('headToHeadMapsChart');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#e8e8ff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No map data available', canvas.width/2, canvas.height/2);
        return;
    }
    
    safeCreateChart('headToHeadMapsChart', {
        type: 'bar',
        data: {
            labels: mapData.map(m => m.map),
            datasets: [{
                label: `${player1} Win Rate (%)`,
                data: mapData.map(m => parseFloat(m.player1WinRate)),
                backgroundColor: 'rgba(108, 117, 125, 0.8)',
                borderColor: 'rgba(108, 117, 125, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const map = mapData[context.dataIndex];
                            return [
                                `${player1}: ${map.player1WinRate}%`,
                                `Games: ${map.games}`,
                                `${player1} Wins: ${map.player1Wins}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: { 
                    beginAtZero: true,
                    max: 100,
                    title: { display: true, text: `${player1} Win Rate (%)` }
                }
            }
        }
    });
}

// Create head-to-head timeline chart
function createHeadToHeadTimelineChart(headToHeadGames, player1, player2) {
    // Sort games by date
    const sortedGames = headToHeadGames.sort((a, b) => {
        const dateA = new Date(a.year, parseInt(a.month) - 1, parseInt(a.day));
        const dateB = new Date(b.year, parseInt(b.month) - 1, parseInt(b.day));
        return dateA - dateB;
    });
    
    // Calculate cumulative wins
    let player1CumulativeWins = 0;
    let player2CumulativeWins = 0;
    
    const timelineData = sortedGames.map((game, index) => {
        if (game.winner === player1) player1CumulativeWins++;
        else if (game.winner === player2) player2CumulativeWins++;
        
        const totalGames = index + 1;
        return {
            game: `Game ${totalGames}`,
            date: `${game.year}-${game.month.padStart(2, '0')}-${game.day.padStart(2, '0')}`,
            player1WinRate: (player1CumulativeWins / totalGames * 100).toFixed(1),
            player2WinRate: (player2CumulativeWins / totalGames * 100).toFixed(1),
            player1Wins: player1CumulativeWins,
            player2Wins: player2CumulativeWins
        };
    });
    
    safeCreateChart('headToHeadTimelineChart', {
        type: 'line',
        data: {
            labels: timelineData.map(d => d.game),
            datasets: [
                {
                    label: `${player1} Win Rate`,
                    data: timelineData.map(d => parseFloat(d.player1WinRate)),
                    borderColor: 'rgba(40, 167, 69, 1)',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: false
                },
                {
                    label: `${player2} Win Rate`,
                    data: timelineData.map(d => parseFloat(d.player2WinRate)),
                    borderColor: 'rgba(220, 53, 69, 1)',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { padding: 20 }
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            const dataIndex = context[0].dataIndex;
                            const data = timelineData[dataIndex];
                            return `${data.game} (${data.date})`;
                        },
                        label: function(context) {
                            const dataIndex = context.dataIndex;
                            const data = timelineData[dataIndex];
                            if (context.datasetIndex === 0) {
                                return `${player1}: ${data.player1WinRate}% (${data.player1Wins} wins)`;
                            } else {
                                return `${player2}: ${data.player2WinRate}% (${data.player2Wins} wins)`;
                            }
                        }
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    max: 100,
                    title: { display: true, text: 'Win Rate (%)' }
                },
                x: {
                    title: { display: true, text: 'Games Played' }
                }
            }
        }
    });
}

// ==================== PLAYER ANALYSIS CHART FUNCTIONS ====================

// Create player faction performance chart
function createPlayerFactionChart(playerGames, selectedPlayer) {
    const factionStats = {};
    
    playerGames.forEach(game => {
        let playerFaction = null;
        let playerWon = false;
        
        // Determine which faction the player used and if they won
        if (game.commander1 === selectedPlayer) {
            playerFaction = game.faction1;
            playerWon = game.winner === selectedPlayer;
        } else if (game.commander2 === selectedPlayer) {
            playerFaction = game.faction2;
            playerWon = game.winner === selectedPlayer;
        } else {
            // Player was a teammate, determine their team's faction and win status
            let playerTeam = null;
            if (game.teamOne && game.teamOne.includes(selectedPlayer)) playerTeam = 1;
            if (game.teamTwo && game.teamTwo.includes(selectedPlayer)) playerTeam = 2;
            if (game.teamOneStraggler && game.teamOneStraggler.includes(selectedPlayer)) playerTeam = 1;
            if (game.teamTwoStraggler && game.teamTwoStraggler.includes(selectedPlayer)) playerTeam = 2;
            
            if (playerTeam === 1) {
                playerFaction = game.faction1;
                playerWon = game.winner === game.commander1;
            } else if (playerTeam === 2) {
                playerFaction = game.faction2;
                playerWon = game.winner === game.commander2;
            }
        }
        
        if (playerFaction) {
            if (!factionStats[playerFaction]) {
                factionStats[playerFaction] = { games: 0, wins: 0 };
            }
            factionStats[playerFaction].games++;
            if (playerWon) {
                factionStats[playerFaction].wins++;
            }
        }
    });
    
    const factionData = Object.entries(factionStats)
        .map(([faction, stats]) => ({
            faction,
            winRate: (stats.wins / stats.games * 100).toFixed(1),
            games: stats.games,
            wins: stats.wins
        }))
        .sort((a, b) => b.winRate - a.winRate);
    
    const factionColors = {
        'I.S.D.F': 'rgba(13, 110, 253, 0.8)',
        'Hadean': 'rgba(220, 53, 69, 0.8)',
        'Scion': 'rgba(255, 193, 7, 0.8)'
    };
    
    safeCreateChart('playerFactionChart', {
        type: 'bar',
        data: {
            labels: factionData.map(f => f.faction),
            datasets: [{
                label: 'Win Rate (%)',
                data: factionData.map(f => parseFloat(f.winRate)),
                backgroundColor: factionData.map(f => factionColors[f.faction] || 'rgba(108, 117, 125, 0.8)'),
                borderColor: factionData.map(f => factionColors[f.faction]?.replace('0.8', '1') || 'rgba(108, 117, 125, 1)'),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const faction = factionData[context.dataIndex];
                            return [
                                `Win Rate: ${faction.winRate}%`,
                                `Games: ${faction.games}`,
                                `Wins: ${faction.wins}`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    max: 100,
                    title: { display: true, text: 'Win Rate (%)' }
                }
            }
        }
    });
}

// Create player role distribution chart
function createPlayerRoleChart(playerGames, selectedPlayer) {
    let commanderGames = 0;
    let teammateGames = 0;
    let commanderWins = 0;
    let teammateWins = 0;
    
    playerGames.forEach(game => {
        if (game.commander1 === selectedPlayer || game.commander2 === selectedPlayer) {
            commanderGames++;
            if (game.winner === selectedPlayer) {
                commanderWins++;
            }
        } else {
            teammateGames++;
            // Determine if player's team won
            let playerTeam = null;
            if (game.teamOne && game.teamOne.includes(selectedPlayer)) playerTeam = 1;
            if (game.teamTwo && game.teamTwo.includes(selectedPlayer)) playerTeam = 2;
            if (game.teamOneStraggler && game.teamOneStraggler.includes(selectedPlayer)) playerTeam = 1;
            if (game.teamTwoStraggler && game.teamTwoStraggler.includes(selectedPlayer)) playerTeam = 2;
            
            if ((playerTeam === 1 && game.winner === game.commander1) ||
                (playerTeam === 2 && game.winner === game.commander2)) {
                teammateWins++;
            }
        }
    });
    
    const commanderWinRate = commanderGames > 0 ? (commanderWins / commanderGames * 100).toFixed(1) : '0.0';
    const teammateWinRate = teammateGames > 0 ? (teammateWins / teammateGames * 100).toFixed(1) : '0.0';
    
    safeCreateChart('playerRoleChart', {
        type: 'doughnut',
        data: {
            labels: ['Commander', 'Teammate'],
            datasets: [{
                data: [commanderGames, teammateGames],
                backgroundColor: ['rgba(13, 110, 253, 0.8)', 'rgba(40, 167, 69, 0.8)'],
                borderColor: ['rgba(13, 110, 253, 1)', 'rgba(40, 167, 69, 1)'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 20 }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const role = context.label;
                            const games = context.parsed;
                            const winRate = role === 'Commander' ? commanderWinRate : teammateWinRate;
                            const wins = role === 'Commander' ? commanderWins : teammateWins;
                            return [
                                `${role}: ${games} games`,
                                `Win Rate: ${winRate}%`,
                                `Wins: ${wins}`
                            ];
                        }
                    }
                }
            }
        }
    });
}

// Create player map performance chart
function createPlayerMapChart(playerGames, selectedPlayer) {
    const mapStats = {};
    
    playerGames.forEach(game => {
        let playerWon = false;
        
        // Determine if player won
        if (game.commander1 === selectedPlayer || game.commander2 === selectedPlayer) {
            playerWon = game.winner === selectedPlayer;
        } else {
            // Player was a teammate
            let playerTeam = null;
            if (game.teamOne && game.teamOne.includes(selectedPlayer)) playerTeam = 1;
            if (game.teamTwo && game.teamTwo.includes(selectedPlayer)) playerTeam = 2;
            if (game.teamOneStraggler && game.teamOneStraggler.includes(selectedPlayer)) playerTeam = 1;
            if (game.teamTwoStraggler && game.teamTwoStraggler.includes(selectedPlayer)) playerTeam = 2;
            
            if ((playerTeam === 1 && game.winner === game.commander1) ||
                (playerTeam === 2 && game.winner === game.commander2)) {
                playerWon = true;
            }
        }
        
        if (!mapStats[game.map]) {
            mapStats[game.map] = { games: 0, wins: 0 };
        }
        mapStats[game.map].games++;
        if (playerWon) {
            mapStats[game.map].wins++;
        }
    });
    
    // Filter maps with at least 3 games and sort by win rate
    const mapData = Object.entries(mapStats)
        .filter(([, stats]) => stats.games >= 3)
        .map(([map, stats]) => ({
            map,
            winRate: (stats.wins / stats.games * 100).toFixed(1),
            games: stats.games,
            wins: stats.wins
        }))
        .sort((a, b) => b.winRate - a.winRate)
        .slice(0, 8); // Top 8 maps
    
    safeCreateChart('playerMapChart', {
        type: 'bar',
        data: {
            labels: mapData.map(m => m.map),
            datasets: [{
                label: 'Win Rate (%)',
                data: mapData.map(m => parseFloat(m.winRate)),
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
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const map = mapData[context.dataIndex];
                            return [
                                `Win Rate: ${map.winRate}%`,
                                `Games: ${map.games}`,
                                `Wins: ${map.wins}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: { 
                    beginAtZero: true,
                    max: 100,
                    title: { display: true, text: 'Win Rate (%)' }
                }
            }
        }
    });
}

// Create player head-to-head spider chart (with 9 opponents)
function createPlayerHeadToHeadChart(playerGames, selectedPlayer) {
    const opponentStats = {};
    
    playerGames.forEach(game => {
        let opponent = null;
        let playerWon = false;
        
        if (game.commander1 === selectedPlayer) {
            opponent = game.commander2;
            playerWon = game.winner === selectedPlayer;
        } else if (game.commander2 === selectedPlayer) {
            opponent = game.commander1;
            playerWon = game.winner === selectedPlayer;
        }
        // Only count direct commander vs commander games for head-to-head
        
        if (opponent) {
            if (!opponentStats[opponent]) {
                opponentStats[opponent] = { games: 0, wins: 0 };
            }
            opponentStats[opponent].games++;
            if (playerWon) {
                opponentStats[opponent].wins++;
            }
        }
    });
    
    // Get top 9 opponents with at least 3 games
    const topOpponents = Object.entries(opponentStats)
        .filter(([, stats]) => stats.games >= 3)
        .sort(([,a], [,b]) => b.games - a.games)
        .slice(0, 9)
        .map(([opponent, stats]) => ({
            opponent,
            winRate: (stats.wins / stats.games * 100).toFixed(1),
            games: stats.games,
            wins: stats.wins
        }));
    
    if (topOpponents.length === 0) {
        // No sufficient head-to-head data, show message
        const canvas = document.getElementById('playerHeadToHeadChart');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#e8e8ff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Not enough head-to-head data', canvas.width/2, canvas.height/2);
        ctx.fillText('(3+ games vs same opponent)', canvas.width/2, canvas.height/2 + 25);
        return;
    }
    
    safeCreateChart('playerHeadToHeadChart', {
        type: 'radar',
        data: {
            labels: topOpponents.map(o => o.opponent),
            datasets: [{
                label: 'Win Rate vs Opponent (%)',
                data: topOpponents.map(o => parseFloat(o.winRate)),
                backgroundColor: 'rgba(255, 193, 7, 0.2)',
                borderColor: 'rgba(255, 193, 7, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(255, 193, 7, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(255, 193, 7, 1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const opponent = topOpponents[context.dataIndex];
                            return [
                                `vs ${opponent.opponent}`,
                                `Win Rate: ${opponent.winRate}%`,
                                `Games: ${opponent.games}`,
                                `Wins: ${opponent.wins}`
                            ];
                        }
                    }
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        stepSize: 20,
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                    pointLabels: { 
                        color: '#e8e8ff',
                        font: { size: 11 }
                    }
                }
            }
        }
    });
}

// Create player performance trend over time chart
function createPlayerTrendChart(playerGames, selectedPlayer) {
    const monthlyStats = {};
    
    playerGames.forEach(game => {
        const monthKey = `${game.year}-${game.month.padStart(2, '0')}`;
        
        let playerWon = false;
        if (game.commander1 === selectedPlayer || game.commander2 === selectedPlayer) {
            playerWon = game.winner === selectedPlayer;
        } else {
            // Player was a teammate
            let playerTeam = null;
            if (game.teamOne && game.teamOne.includes(selectedPlayer)) playerTeam = 1;
            if (game.teamTwo && game.teamTwo.includes(selectedPlayer)) playerTeam = 2;
            if (game.teamOneStraggler && game.teamOneStraggler.includes(selectedPlayer)) playerTeam = 1;
            if (game.teamTwoStraggler && game.teamTwoStraggler.includes(selectedPlayer)) playerTeam = 2;
            
            if ((playerTeam === 1 && game.winner === game.commander1) ||
                (playerTeam === 2 && game.winner === game.commander2)) {
                playerWon = true;
            }
        }
        
        if (!monthlyStats[monthKey]) {
            monthlyStats[monthKey] = { games: 0, wins: 0 };
        }
        monthlyStats[monthKey].games++;
        if (playerWon) {
            monthlyStats[monthKey].wins++;
        }
    });
    
    const sortedMonths = Object.entries(monthlyStats)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, stats]) => ({
            month,
            winRate: (stats.wins / stats.games * 100).toFixed(1),
            games: stats.games,
            wins: stats.wins
        }));
    
    safeCreateChart('playerTrendChart', {
        type: 'line',
        data: {
            labels: sortedMonths.map(m => m.month),
            datasets: [
                {
                    label: 'Win Rate (%)',
                    data: sortedMonths.map(m => parseFloat(m.winRate)),
                    borderColor: 'rgba(108, 117, 125, 1)',
                    backgroundColor: 'rgba(108, 117, 125, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: 'Games Played',
                    data: sortedMonths.map(m => m.games),
                    borderColor: 'rgba(13, 202, 240, 1)',
                    backgroundColor: 'rgba(13, 202, 240, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { padding: 20 }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const month = sortedMonths[context.dataIndex];
                            if (context.datasetIndex === 0) {
                                return `Win Rate: ${month.winRate}% (${month.wins}/${month.games})`;
                            } else {
                                return `Games: ${month.games}`;
                            }
                        }
                    }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    max: 100,
                    title: { display: true, text: 'Win Rate (%)' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    title: { display: true, text: 'Games Played' },
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });
}



// ==================== MAP ANALYSIS FUNCTIONS ====================

// Load map analysis with complete functionality
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
    
    // Create map charts and show content
    createMapContent(mapGames, selectedMap);
}

// Create map content and charts
function createMapContent(mapGames, selectedMap) {
    const mainAnalysisElement = document.getElementById('mainAnalysis');
    
    // Create the UI for map analysis with multiple chart sections
    mainAnalysisElement.innerHTML = `
        <div class="row">
            <!-- Map Faction Balance -->
            <div class="col-lg-6 mb-4">
                <div class="card bg-dark border-secondary">
                    <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">${selectedMap} - Faction Balance</h5>
                        <button class="btn btn-sm btn-outline-light maximize-chart" data-chart-type="mapFactionBalance" data-chart-title="${selectedMap} - Faction Balance">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="card-body">
                        <canvas id="mapFactionChart"></canvas>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Create all map-specific charts
    createMapFactionChart(mapGames, selectedMap);
    
    // Align card heights after charts are created and rendered
    alignCardHeights();
    
    // Add event listeners for maximize buttons
    document.querySelectorAll('.maximize-chart').forEach(button => {
        button.addEventListener('click', (e) => {
            const chartType = e.currentTarget.dataset.chartType;
            const chartTitle = e.currentTarget.dataset.chartTitle;
            showModalChart(mapGames, chartType, chartTitle, selectedMap);
        });
    });
}

// Create map faction balance chart
function createMapFactionChart(mapGames, selectedMap) {
    const factionStats = calculateFactionStats(mapGames, true);
    
    const factionData = Object.entries(factionStats)
        .map(([faction, stats]) => ({
            faction,
            winRate: (stats.wins / stats.games * 100).toFixed(1),
            games: stats.games,
            wins: stats.wins
        }))
        .sort((a, b) => b.winRate - a.winRate);
    
    const factionColors = {
        'I.S.D.F': 'rgba(13, 110, 253, 0.8)',
        'Hadean': 'rgba(220, 53, 69, 0.8)',
        'Scion': 'rgba(255, 193, 7, 0.8)'
    };
    
    safeCreateChart('mapFactionChart', {
        type: 'bar',
        data: {
            labels: factionData.map(f => f.faction),
            datasets: [{
                label: 'Win Rate (%)',
                data: factionData.map(f => parseFloat(f.winRate)),
                backgroundColor: factionData.map(f => factionColors[f.faction] || 'rgba(108, 117, 125, 0.8)'),
                borderColor: factionData.map(f => factionColors[f.faction]?.replace('0.8', '1') || 'rgba(108, 117, 125, 1)'),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const faction = factionData[context.dataIndex];
                            return [
                                `Win Rate: ${faction.winRate}%`,
                                `Games: ${faction.games}`,
                                `Wins: ${faction.wins}`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    max: 100,
                    title: { display: true, text: 'Win Rate (%)' }
                }
            }
        }
    });
}

// ==================== FACTION ANALYSIS FUNCTIONS ====================

// Load faction analysis with complete functionality
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
    
    // Create faction charts and show content
    createFactionContent(factionGames, selectedFaction);
}

// Create faction content and charts
function createFactionContent(factionGames, selectedFaction) {
    const mainAnalysisElement = document.getElementById('mainAnalysis');
    
    // Create the UI for faction analysis with chart section
    mainAnalysisElement.innerHTML = `
        <div class="row">
            <!-- Faction vs Other Factions -->
            <div class="col-lg-6 mb-4">
                <div class="card bg-dark border-secondary">
                    <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">${selectedFaction} vs Other Factions</h5>
                        <button class="btn btn-sm btn-outline-light maximize-chart" data-chart-type="factionVsFaction" data-chart-title="${selectedFaction} Performance vs Other Factions">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="card-body">
                        <canvas id="factionVsFactionChart"></canvas>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Create faction chart
    createFactionVsFactionChart(factionGames, selectedFaction);
    
    // Align card heights after charts are created and rendered
    alignCardHeights();
    
    // Add event listeners for maximize buttons
    document.querySelectorAll('.maximize-chart').forEach(button => {
        button.addEventListener('click', (e) => {
            const chartType = e.currentTarget.dataset.chartType;
            const chartTitle = e.currentTarget.dataset.chartTitle;
            showModalChart(factionGames, chartType, chartTitle, selectedFaction);
        });
    });
}

// Create faction vs faction performance chart
function createFactionVsFactionChart(factionGames, selectedFaction) {
    const matchupStats = {};
    
    factionGames.forEach(game => {
        let myFaction, opponentFaction, won;
        
        if (game.faction1 === selectedFaction) {
            myFaction = game.faction1;
            opponentFaction = game.faction2;
            won = game.winner === game.commander1;
        } else if (game.faction2 === selectedFaction) {
            myFaction = game.faction2;
            opponentFaction = game.faction1;
            won = game.winner === game.commander2;
        } else {
            return; // This shouldn't happen since we filtered
        }
        
        if (!matchupStats[opponentFaction]) {
            matchupStats[opponentFaction] = { games: 0, wins: 0 };
        }
        matchupStats[opponentFaction].games++;
        if (won) {
            matchupStats[opponentFaction].wins++;
        }
    });
    
    const matchupData = Object.entries(matchupStats)
        .map(([opponent, stats]) => ({
            opponent,
            winRate: (stats.wins / stats.games * 100).toFixed(1),
            games: stats.games,
            wins: stats.wins
        }))
        .sort((a, b) => b.winRate - a.winRate);
    
    const factionColors = {
        'I.S.D.F': 'rgba(13, 110, 253, 0.8)',
        'Hadean': 'rgba(220, 53, 69, 0.8)',
        'Scion': 'rgba(255, 193, 7, 0.8)'
    };
    
    safeCreateChart('factionVsFactionChart', {
        type: 'bar',
        data: {
            labels: matchupData.map(m => `vs ${m.opponent}`),
            datasets: [{
                label: 'Win Rate (%)',
                data: matchupData.map(m => parseFloat(m.winRate)),
                backgroundColor: matchupData.map(m => factionColors[m.opponent] || 'rgba(108, 117, 125, 0.8)'),
                borderColor: matchupData.map(m => factionColors[m.opponent]?.replace('0.8', '1') || 'rgba(108, 117, 125, 1)'),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const matchup = matchupData[context.dataIndex];
                            return [
                                `Win Rate: ${matchup.winRate}%`,
                                `Games: ${matchup.games}`,
                                `Wins: ${matchup.wins}`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    max: 100,
                    title: { display: true, text: 'Win Rate (%)' }
                }
            }
        }
    });
} 
