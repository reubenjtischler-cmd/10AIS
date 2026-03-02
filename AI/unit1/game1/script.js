const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Constants
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 30;
const PLAYER_SPEED = 5;
const ENEMY_WIDTH = 25;
const ENEMY_HEIGHT = 25;
const BULLET_SPEED = 8;
const ENEMY_BULLET_SPEED = 4;
const POWERUP_SIZE = 20;

// Game State Management
let currentScreen = 'mainMenu';
let currentGalaxy = 'milkyway';
let isPaused = false;

// Player Progression
let playerData = {
    killCoins: 0,
    totalKills: 0,
    unlockedGalaxies: ['milkyway'],
    completedGalaxies: [],
    permanentUpgrades: {
        extraLife: 0,
        startingShield: 0,
        rapidFireBoost: 0,
        multiShot: 0,
        laserBeam: false,
        doubleScore: false
    }
};

// Galaxy Configurations
const galaxyConfigs = {
    milkyway: {
        name: 'Milky Way',
        description: 'Classic space invaders',
        enemyTypes: ['normal', 'tough', 'fast'],
        powerupTypes: ['rapidfire', 'shield', 'health', 'multibullet', 'massivebullet', 'immunity', 'laserbeam', 'homingmissile', 'timeslow', 'bombclear', 'piercingshots', 'explosiverounds', 'magnet', 'doublescore', 'speedboost', 'giantlaser', 'chainlightning'],
        waveCount: 10,
        requiredCompletion: null
    },
    andromeda: {
        name: 'Andromeda',
        description: 'Fast enemies only',
        enemyTypes: ['fast'],
        powerupTypes: ['rapidfire', 'shield', 'health', 'multibullet', 'homingmissile', 'timeslow', 'speedboost', 'piercingshots'],
        waveCount: 15,
        requiredCompletion: 'milkyway'
    },
    orion: {
        name: 'Orion Nebula',
        description: 'Tough enemies only',
        enemyTypes: ['tough'],
        powerupTypes: ['shield', 'health', 'massivebullet', 'laserbeam', 'explosiverounds', 'giantlaser'],
        waveCount: 12,
        requiredCompletion: 'andromeda'
    },
    void: {
        name: 'The Void',
        description: 'Ultimate challenge',
        enemyTypes: ['normal', 'tough', 'fast'],
        powerupTypes: ['rapidfire', 'shield', 'health', 'multibullet', 'massivebullet', 'immunity', 'laserbeam', 'homingmissile', 'timeslow', 'bombclear', 'piercingshots', 'explosiverounds', 'magnet', 'doublescore', 'speedboost', 'giantlaser', 'chainlightning'],
        waveCount: 20,
        requiredCompletion: ['milkyway', 'andromeda', 'orion']
    }
};

// Shop Items - Temporary Powerups Only
const shopItems = {
    healthPack: { cost: 50, duration: 0, description: 'Instant health restore' },
    shieldPack: { cost: 75, duration: 0, description: 'Instant shield (50 points)' },
    rapidFire: { cost: 100, duration: 300, description: 'Rapid fire for 5 seconds' },
    multiShot: { cost: 150, duration: 400, description: 'Multi shot for 6.7 seconds' },
    bombClear: { cost: 200, duration: 0, description: 'Clear all enemies on screen' },
    timeSlow: { cost: 175, duration: 250, description: 'Slow time for 4.2 seconds' }
};

// Game state
let gameState = {
    score: 0,
    lives: 3,
    wave: 1,
    gameOver: false,
    gameWon: false,
    enemies: [],
    playerBullets: [],
    enemyBullets: [],
    powerups: [],
    explosions: [],
    particles: [],
    waveTransition: false,
    waveTransitionTimer: 0,
    activePowerups: {}
};

// Player object
let player = {
    x: GAME_WIDTH / 2 - PLAYER_WIDTH / 2,
    y: GAME_HEIGHT - 80,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    speed: PLAYER_SPEED,
    keys: {},
    health: 1,
    shootCooldown: 0,
    shootRate: 5,
    fireRate: 1,
    shield: 0,
    shieldMax: 0,
    bulletCount: 2,
    immunity: 0,
    immunityMax: 0,
    laserBeam: false,
    homingMissiles: false,
    timeSlowActive: false,
    bombClear: false,
    // Stacking system
    fireRateStack: 0,
    bulletCountStack: 0,
    // Super ship system
    superShipType: null, // 'destroyer', 'phantom', 'titan', 'nova'
    superShipTimer: 0,
    transformationEffect: 0,
    // New upgrades
    piercingShots: false,
    explosiveRounds: false,
    magnetActive: false,
    doubleScore: false,
    speedBoost: false,
    giantLaser: false,
    chainLightning: false
};

// Menu Navigation Functions
function showMainMenu() {
    hideAllScreens();
    document.getElementById('mainMenu').classList.remove('hidden');
    currentScreen = 'mainMenu';
    updateCurrencyDisplay();
}

function showGalaxySelect() {
    hideAllScreens();
    document.getElementById('galaxySelect').classList.remove('hidden');
    currentScreen = 'galaxySelect';
    updateGalaxyStatus();
}

function showShop() {
    hideAllScreens();
    document.getElementById('shop').classList.remove('hidden');
    currentScreen = 'shop';
    updateShopDisplay();
}

function showSettings() {
    hideAllScreens();
    document.getElementById('settings').classList.remove('hidden');
    currentScreen = 'settings';
    loadSettingsToUI();
}

// Utility function to show temporary messages
function showMessage(message) {
    // Create message element if it doesn't exist
    let messageElement = document.getElementById('tempMessage');
    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.id = 'tempMessage';
        messageElement.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 10000;
            font-size: 16px;
        `;
        document.body.appendChild(messageElement);
    }
    
    messageElement.textContent = message;
    messageElement.style.display = 'block';
    
    // Hide after 2 seconds
    setTimeout(() => {
        messageElement.style.display = 'none';
    }, 2000);
}

// Settings Management
let gameSettings = {
    soundEnabled: true,
    musicEnabled: true,
    difficulty: 'normal',
    graphicsQuality: 'medium',
    showControls: true,
    mouseControl: false
};

const difficultyMultipliers = {
    easy: { health: 0.7, speed: 0.8, scoreMultiplier: 0.8 },
    normal: { health: 1.0, speed: 1.0, scoreMultiplier: 1.0 },
    hard: { health: 1.3, speed: 1.2, scoreMultiplier: 1.5 },
    insane: { health: 1.5, speed: 1.5, scoreMultiplier: 2.0 }
};

function loadSettingsToUI() {
    document.getElementById('soundToggle').checked = gameSettings.soundEnabled;
    document.getElementById('musicToggle').checked = gameSettings.musicEnabled;
    document.getElementById('difficultySelect').value = gameSettings.difficulty;
    document.getElementById('qualitySelect').value = gameSettings.graphicsQuality;
    document.getElementById('keybindDisplay').checked = gameSettings.showControls;
    document.getElementById('mouseControl').checked = gameSettings.mouseControl;
}

function saveSettings() {
    gameSettings.soundEnabled = document.getElementById('soundToggle').checked;
    gameSettings.musicEnabled = document.getElementById('musicToggle').checked;
    gameSettings.difficulty = document.getElementById('difficultySelect').value;
    gameSettings.graphicsQuality = document.getElementById('qualitySelect').value;
    gameSettings.showControls = document.getElementById('keybindDisplay').checked;
    gameSettings.mouseControl = document.getElementById('mouseControl').checked;
    
    localStorage.setItem('spaceInvadersSettings', JSON.stringify(gameSettings));
    applySettings();
    
    alert('Settings saved successfully!');
}

function loadSettings() {
    const saved = localStorage.getItem('spaceInvadersSettings');
    if (saved) {
        gameSettings = JSON.parse(saved);
    }
    applySettings();
}

function applySettings() {
    // Apply graphics quality settings
    const qualitySettings = {
        low: { particles: false, explosions: false, glow: false },
        medium: { particles: true, explosions: true, glow: false },
        high: { particles: true, explosions: true, glow: true },
        ultra: { particles: true, explosions: true, glow: true, enhanced: true }
    };
    
    const currentQuality = qualitySettings[gameSettings.graphicsQuality] || qualitySettings.medium;
    window.graphicsQuality = currentQuality;
    
    // Apply difficulty to game mechanics
    window.difficultyMultiplier = difficultyMultipliers[gameSettings.difficulty] || difficultyMultipliers.normal;
}

function exportSaveData() {
    const saveData = {
        playerData: playerData,
        settings: gameSettings,
        timestamp: Date.now()
    };
    
    const dataStr = JSON.stringify(saveData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `space_invaders_save_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    alert('Save data exported successfully!');
}

function importSaveData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const saveData = JSON.parse(event.target.result);
                
                if (saveData.playerData) {
                    playerData = saveData.playerData;
                    savePlayerData();
                }
                
                if (saveData.settings) {
                    gameSettings = saveData.settings;
                    localStorage.setItem('spaceInvadersSettings', JSON.stringify(gameSettings));
                    applySettings();
                }
                
                alert('Save data imported successfully!');
                showMainMenu();
            } catch (error) {
                alert('Invalid save file!');
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

function resetGameData() {
    if (confirm('Are you sure you want to reset all game data? This action cannot be undone!')) {
        if (confirm('This will delete all your progress and settings. Are you absolutely sure?')) {
            localStorage.removeItem('spaceInvadersPlayerData');
            localStorage.removeItem('spaceInvadersSettings');
            
            // Reset to defaults
            playerData = {
                killCoins: 0,
                totalKills: 0,
                unlockedGalaxies: ['milkyway'],
                completedGalaxies: [],
                permanentUpgrades: {
                    extraLife: 0,
                    startingShield: 0,
                    rapidFireBoost: 0,
                    multiShot: 0,
                    laserBeam: false,
                    doubleScore: false
                }
            };
            
            gameSettings = {
                soundEnabled: true,
                musicEnabled: true,
                difficulty: 'normal',
                graphicsQuality: 'medium',
                showControls: true,
                mouseControl: false
            };
            
            applySettings();
            alert('All game data has been reset!');
            showMainMenu();
        }
    }
}

function hideAllScreens() {
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('galaxySelect').classList.add('hidden');
    document.getElementById('shop').classList.add('hidden');
    document.getElementById('settings').classList.add('hidden');
    document.getElementById('deathMenu').classList.add('hidden');
    document.getElementById('gameScreen').classList.add('hidden');
}
function startGalaxy(galaxyId) {
    console.log('startGalaxy called with:', galaxyId);
    const galaxy = galaxyConfigs[galaxyId];
    if (!galaxy) {
        console.error('Galaxy not found:', galaxyId);
        return;
    }
    
    console.log('Galaxy config:', galaxy);
    
    // Check if galaxy is unlocked
    if (!isGalaxyUnlocked(galaxyId)) {
        alert('Galaxy not unlocked yet! Complete required galaxies first.');
        return;
    }
    
    currentGalaxy = galaxyId;
    console.log('Setting currentGalaxy to:', currentGalaxy);
    
    hideAllScreens();
    document.getElementById('gameScreen').classList.remove('hidden');
    currentScreen = 'game';
    
    console.log('Screen set to game, showing gameScreen');
    
    // Initialize game with galaxy settings
    initGalaxyGame(galaxy);
    
    console.log('Galaxy game initialized');
}

function isGalaxyUnlocked(galaxyId) {
    const galaxy = galaxyConfigs[galaxyId];
    if (!galaxy.requiredCompletion) return true; // Milky Way is always unlocked
    
    if (Array.isArray(galaxy.requiredCompletion)) {
        return galaxy.requiredCompletion.every(g => playerData.completedGalaxies.includes(g));
    } else {
        return playerData.completedGalaxies.includes(galaxy.requiredCompletion);
    }
}

function updateGalaxyStatus() {
    // Update galaxy nodes
    Object.keys(galaxyConfigs).forEach(galaxyId => {
        const galaxyNode = document.querySelector(`[onclick="startGalaxy('${galaxyId}')"]`);
        if (galaxyNode) {
            const galaxy = galaxyConfigs[galaxyId];
            const statusElement = document.getElementById(galaxyId + 'Status');
            
            if (isGalaxyUnlocked(galaxyId)) {
                if (statusElement) {
                    statusElement.textContent = 'Unlocked';
                    statusElement.className = 'galaxy-status unlocked';
                }
                galaxyNode.classList.remove('locked');
            } else {
                if (statusElement) {
                    statusElement.textContent = 'Locked';
                    statusElement.className = 'galaxy-status';
                }
                galaxyNode.classList.add('locked');
            }
        }
    });
}

function showDeathMenu() {
    hideAllScreens();
    document.getElementById('deathMenu').classList.remove('hidden');
    currentScreen = 'death';
    
    // Update death stats
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('finalWaves').textContent = gameState.wave;
    document.getElementById('finalCoins').textContent = Math.floor(gameState.score / 10);
}

function respawn() {
    if (playerData.killCoins >= 50) {
        // Respawn costs 50 coins
        playerData.killCoins -= 50;
        savePlayerData();
        
        // Reset game state but keep galaxy
        const galaxy = galaxyConfigs[currentGalaxy];
        initGalaxyGame(galaxy);
        hideAllScreens();
        document.getElementById('gameScreen').classList.remove('hidden');
        currentScreen = 'game';
    } else {
        alert('Not enough coins! Need 50 coins to respawn.');
    }
}

function togglePause() {
    if (currentScreen === 'game') {
        isPaused = !isPaused;
    }
}

function updateCurrencyDisplay() {
    document.getElementById('killCoins').textContent = playerData.killCoins;
    document.getElementById('shopCoins').textContent = playerData.killCoins;
}

// Shop pagination system
let currentShopPage = 0;
let itemsPerPage = 4; // 2x2 grid

function initializeShop() {
    updateShopDisplay();
    setupShopPagination();
}

function setupShopPagination() {
    const totalItems = Object.keys(shopItems).length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    // Update page indicators
    const indicatorsContainer = document.getElementById('shopPageIndicators');
    indicatorsContainer.innerHTML = '';
    
    for (let i = 0; i < totalPages; i++) {
        const indicator = document.createElement('div');
        indicator.className = `page-indicator ${i === currentShopPage ? 'active' : ''}`;
        indicator.onclick = () => goToShopPage(i);
        indicatorsContainer.appendChild(indicator);
    }
    
    // Update scroll buttons
    const leftBtn = document.querySelector('.scroll-left');
    const rightBtn = document.querySelector('.scroll-right');
    
    if (leftBtn) leftBtn.disabled = currentShopPage === 0;
    if (rightBtn) rightBtn.disabled = currentShopPage === totalPages - 1;
}

function changeShopPage(direction) {
    const totalItems = Object.keys(shopItems).length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    currentShopPage += direction;
    currentShopPage = Math.max(0, Math.min(currentShopPage, totalPages - 1));
    
    updateShopDisplay();
    setupShopPagination();
}

function goToShopPage(page) {
    currentShopPage = page;
    updateShopDisplay();
    setupShopPagination();
}

function updateShopDisplay() {
    updateCurrencyDisplay();
    
    const shopItemsContainer = document.getElementById('shopItems');
    const totalItems = Object.keys(shopItems).length;
    const startIndex = currentShopPage * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    
    // Clear current items
    shopItemsContainer.innerHTML = '';
    
    // Get items for current page
    const itemIds = Object.keys(shopItems).slice(startIndex, endIndex);
    
    // Create shop item elements
    itemIds.forEach(itemId => {
        const item = shopItems[itemId];
        
        const shopItemDiv = document.createElement('div');
        shopItemDiv.className = 'shop-item';
        
        const buttonText = `${item.cost} Coins`;
        const buttonDisabled = playerData.killCoins < item.cost;
        
        shopItemDiv.innerHTML = `
            <h3>${itemId.charAt(0).toUpperCase() + itemId.slice(1).replace(/([A-Z])/g, ' $1')}</h3>
            <p>${item.description}</p>
            <button class="buy-btn" onclick="buyPowerup('${itemId}')" ${buttonDisabled ? 'disabled' : ''}>${buttonText}</button>
        `;
        
        shopItemsContainer.appendChild(shopItemDiv);
    });
    
    // Setup pagination if not already done
    setupShopPagination();
}

function buyPowerup(itemId) {
    const item = shopItems[itemId];
    if (!item) return;
    
    const cost = item.cost;
    if (playerData.killCoins < cost) {
        alert('Not enough coins!');
        return;
    }
    
    // Purchase powerup
    playerData.killCoins -= cost;
    savePlayerData();
    
    // Apply powerup effect immediately
    applyShopPowerup(itemId);
    
    // Refresh shop display
    updateShopDisplay();
}

function applyShopPowerup(itemId) {
    switch(itemId) {
        case 'healthPack':
            if (gameState.lives < 5) {
                gameState.lives++;
                showMessage('Health restored!');
            } else {
                playerData.killCoins += 50; // Refund if at max health
                showMessage('Already at max health!');
            }
            break;
        case 'shieldPack':
            player.shield = Math.min(player.shield + 50, 100);
            player.shieldMax = 100;
            showMessage('Shield restored!');
            break;
        case 'rapidFire':
            activateTemporaryPowerup('rapidFire', item.duration);
            showMessage('Rapid fire activated!');
            break;
        case 'multiShot':
            activateTemporaryPowerup('multiShot', item.duration);
            showMessage('Multi shot activated!');
            break;
        case 'bombClear':
            activateBombClear();
            showMessage('Screen cleared!');
            break;
        case 'timeSlow':
            activateTemporaryPowerup('timeSlow', item.duration);
            showMessage('Time slow activated!');
            break;
    }
}

function activateTemporaryPowerup(type, duration) {
    gameState.activePowerups[type] = duration;
}

// Save/Load System
function savePlayerData() {
    localStorage.setItem('spaceInvadersPlayerData', JSON.stringify(playerData));
}

function loadPlayerData() {
    const saved = localStorage.getItem('spaceInvadersPlayerData');
    if (saved) {
        playerData = JSON.parse(saved);
    }
}

// Initialize game with galaxy settings
function initGalaxyGame(galaxy) {
    console.log('initGalaxyGame called with:', galaxy);
    
    // Reset game state
    gameState = {
        score: 0,
        lives: 3 + (playerData.permanentUpgrades.extraLife || 0),
        wave: 1,
        gameOver: false,
        gameWon: false,
        enemies: [],
        playerBullets: [],
        enemyBullets: [],
        powerups: [],
        explosions: [],
        particles: [],
        waveTransition: false,
        waveTransitionTimer: 0,
        activePowerups: {}
    };
    
    console.log('Game state reset:', gameState);
    
    // Apply permanent upgrades
    player.shield = playerData.permanentUpgrades.startingShield * 50;
    player.shieldMax = player.shield;
    player.fireRate = 1 + (playerData.permanentUpgrades.rapidFireBoost * 0.5);
    player.bulletCount = 2 + (playerData.permanentUpgrades.multiShot || 0);
    player.laserBeam = playerData.permanentUpgrades.laserBeam || false;
    player.doubleScore = playerData.permanentUpgrades.doubleScore || false;
    
    // Reset stacking and temporary upgrades
    player.fireRateStack = 0;
    player.bulletCountStack = 0;
    player.superShipType = null;
    player.superShipTimer = 0;
    player.transformationEffect = 0;
    player.piercingShots = false;
    player.explosiveRounds = false;
    player.magnetActive = false;
    player.speedBoost = false;
    player.giantLaser = false;
    player.chainLightning = false;
    player.homingMissiles = false;
    player.timeSlowActive = false;
    player.bombClear = false;
    player.immunity = 0;
    player.immunityMax = 0;
    player.shootCooldown = 0;
    
    // Reset player position
    player.x = GAME_WIDTH / 2 - PLAYER_WIDTH / 2;
    player.y = GAME_HEIGHT - 80;
    
    console.log('Player position set to:', player.x, player.y);
    
    // Update HUD
    document.getElementById('currentGalaxy').textContent = galaxy.name;
    
    // Start first wave
    console.log('Calling spawnGalaxyWave...');
    spawnGalaxyWave();
    console.log('Enemies after spawn:', gameState.enemies.length);
}

function spawnGalaxyWave() {
    console.log('spawnGalaxyWave called, currentGalaxy:', currentGalaxy);
    const galaxy = galaxyConfigs[currentGalaxy];
    console.log('Galaxy config:', galaxy);
    const baseEnemyCount = 3 + Math.floor(gameState.wave * 1.2);
    const enemyCount = Math.min(baseEnemyCount, 15);
    const spacing = GAME_WIDTH / (enemyCount + 1);
    
    console.log('Spawning', enemyCount, 'enemies');
    
    for (let i = 0; i < enemyCount; i++) {
        const enemyType = galaxy.enemyTypes[Math.floor(Math.random() * galaxy.enemyTypes.length)];
        const xOffset = (Math.random() - 0.5) * 30;
        const enemy = new Enemy(spacing * (i + 1) + xOffset, -50, enemyType);
        console.log('Created enemy:', enemy);
        gameState.enemies.push(enemy);
    }
    
    console.log('Total enemies after spawn:', gameState.enemies.length);
}

// Keyboard controls
window.addEventListener('keydown', (e) => {
    if (currentScreen === 'game' && !isPaused) {
        player.keys[e.key] = true;
        if (e.key === ' ') {
            e.preventDefault();
            shoot();
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (currentScreen === 'game') {
        player.keys[e.key] = false;
    }
});

// Initialize on load
window.addEventListener('load', () => {
    loadPlayerData();
    loadSettings();
    showMainMenu();
    initStars();
    initializeShop();
});
class Enemy {
    constructor(x, y, type = 'normal') {
        this.x = x;
        this.y = y;
        this.width = ENEMY_WIDTH;
        this.height = ENEMY_HEIGHT;
        this.speed = 1 + Math.random() * 0.5;
        this.shootCooldown = Math.random() * 60 + 40;
        this.type = type; // 'normal', 'tough', 'fast'
        
        // Increased health with difficulty scaling
        const waveHealthBonus = Math.floor(gameState.wave / 3); // +1 health every 3 waves
        this.maxHealth = type === 'tough' ? 3 + waveHealthBonus : type === 'fast' ? 2 + Math.floor(waveHealthBonus / 2) : 1 + waveHealthBonus;
        this.health = this.maxHealth;
        
        this.moveDirection = 1;
        this.moveCounter = 0;
        this.moveChangeInterval = 180;
        
        if (type === 'tough') {
            this.speed = 0.5;
            this.width = 35;
            this.height = 35;
        } else if (type === 'fast') {
            this.speed = 2.5;
            this.width = 20;
            this.height = 20;
        }
    }

    update() {
        this.y += this.speed;
        
        // Horizontal movement pattern
        this.moveCounter++;
        if (this.moveCounter > this.moveChangeInterval) {
            this.moveDirection = Math.random() > 0.5 ? 1 : -1;
            this.moveCounter = 0;
        }
        
        this.x += this.moveDirection * 0.5;
        
        // Boundary check
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > GAME_WIDTH) this.x = GAME_WIDTH - this.width;
        
        this.shootCooldown--;
        if (this.shootCooldown <= 0) {
            enemyShoot(this);
            this.shootCooldown = Math.random() * 80 + 60;
        }
    }

    draw() {
        // Enhanced enemy graphics based on type
        if (this.type === 'tough') {
            // Draw armored enemy with details
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            
            // Armor plates
            ctx.fillStyle = '#880000';
            ctx.fillRect(this.x + 5, this.y + 5, this.width - 10, 5);
            ctx.fillRect(this.x + 5, this.y + this.height - 10, this.width - 10, 5);
            
            // Energy core
            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        } else if (this.type === 'fast') {
            // Draw sleek fast enemy
            const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
            gradient.addColorStop(0, '#00ffff');
            gradient.addColorStop(1, '#0088ff');
            ctx.fillStyle = gradient;
            
            ctx.beginPath();
            ctx.moveTo(this.x + this.width / 2, this.y);
            ctx.lineTo(this.x + this.width, this.y + this.height);
            ctx.lineTo(this.x, this.y + this.height);
            ctx.closePath();
            ctx.fill();
            
            // Engine glow
            ctx.fillStyle = '#ffaa00';
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height, 3, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.stroke();
        } else {
            // Draw normal enemy with more detail
            const gradient = ctx.createRadialGradient(
                this.x + this.width / 2, this.y + this.height / 2, 0,
                this.x + this.width / 2, this.y + this.height / 2, this.width / 2
            );
            gradient.addColorStop(0, '#00ff00');
            gradient.addColorStop(1, '#008800');
            ctx.fillStyle = gradient;
            
            ctx.beginPath();
            ctx.moveTo(this.x + this.width / 2, this.y);
            ctx.lineTo(this.x + this.width, this.y + this.height);
            ctx.lineTo(this.x, this.y + this.height);
            ctx.closePath();
            ctx.fill();
            
            // Eye
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw health bar for damaged enemies
        if (this.health < this.maxHealth) {
            const barWidth = this.width;
            const barHeight = 3;
            const healthPercent = this.health / this.maxHealth;
            
            // Background
            ctx.fillStyle = '#333333';
            ctx.fillRect(this.x, this.y - 8, barWidth, barHeight);
            
            // Health
            ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
            ctx.fillRect(this.x, this.y - 8, barWidth * healthPercent, barHeight);
        }
    }
}

// Bullet class
class Bullet {
    constructor(x, y, vx, vy, fromPlayer = true) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.fromPlayer = fromPlayer;
        this.width = 4;
        this.height = fromPlayer ? 12 : 8;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
    }

    draw() {
        // Draw line/rectangle bullets
        ctx.fillStyle = this.fromPlayer ? '#ffff00' : '#ff0000';
        
        if (this.fromPlayer) {
            // Player bullets - vertical rectangles
            ctx.fillRect(this.x - 2, this.y - 6, 4, 12);
            
            // Add glow effect
            ctx.shadowColor = '#ffff00';
            ctx.shadowBlur = 3;
            ctx.fillRect(this.x - 1, this.y - 4, 2, 8);
            ctx.shadowBlur = 0;
        } else {
            // Enemy bullets - smaller rectangles
            ctx.fillRect(this.x - 2, this.y - 4, 4, 8);
        }
    }

    isOutOfBounds() {
        return this.x < 0 || this.x > GAME_WIDTH || this.y < -10 || this.y > GAME_HEIGHT + 10;
    }
}

// Powerup class
class Powerup {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.width = POWERUP_SIZE;
        this.height = POWERUP_SIZE;
        this.speed = 1;
        this.lifetime = 300; // frames
    }

    update() {
        this.y += this.speed;
        this.lifetime--;
    }

    draw() {
        const colors = {
            'rapidfire': '#ffff00',
            'shield': '#00ffff',
            'health': '#ff00ff',
            'multibullet': '#ff00ff',
            'massivebullet': '#ff0000',
            'immunity': '#00ff00',
            'laserbeam': '#ff00ff',
            'homingmissile': '#ff8800',
            'timeslow': '#0088ff',
            'bombclear': '#ff0000',
            'superdestroyer': '#ff4444',
            'superphantom': '#9944ff',
            'supertitan': '#4444ff',
            'supernova': '#ffaa00',
            'piercingshots': '#ff1493',
            'explosiverounds': '#ff6347',
            'magnet': '#00ced1',
            'doublescore': '#ffd700',
            'speedboost': '#32cd32',
            'giantlaser': '#8b008b',
            'chainlightning': '#9400d3'
        };
        
        // Draw glow effect
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.width);
        gradient.addColorStop(0, colors[this.type]);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw powerup core
        ctx.fillStyle = colors[this.type];
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw letter inside
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const letters = {
            'rapidfire': 'R',
            'shield': 'S',
            'health': 'H',
            'multibullet': 'M',
            'massivebullet': 'B',
            'immunity': 'I',
            'laserbeam': 'L',
            'homingmissile': 'H',
            'timeslow': 'T',
            'bombclear': 'C',
            'superdestroyer': 'D',
            'superphantom': 'P',
            'supertitan': 'T',
            'supernova': 'N',
            'piercingshots': 'P',
            'explosiverounds': 'E',
            'magnet': 'M',
            'doublescore': '2X',
            'speedboost': 'S',
            'giantlaser': 'G',
            'chainlightning': 'Z'
        };
        ctx.fillText(letters[this.type], this.x, this.y);
    }

    isOutOfBounds() {
        return this.y > GAME_HEIGHT || this.lifetime <= 0;
    }
}

// Particle class for effects
class Particle {
    constructor(x, y, vx, vy, color, size, lifetime) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.size = size;
        this.lifetime = lifetime;
        this.totalLifetime = lifetime;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.lifetime--;
        this.vx *= 0.98; // friction
        this.vy *= 0.98;
    }

    draw() {
        const alpha = this.lifetime / this.totalLifetime;
        ctx.fillStyle = this.color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
        ctx.fill();
    }

    isDone() {
        return this.lifetime <= 0;
    }
}

// Explosion class
class Explosion {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 5;
        this.maxRadius = 30;
        this.speed = 2;
        this.lifetime = 20;
        this.totalLifetime = 20;
    }

    update() {
        this.radius += this.speed;
        this.lifetime--;
    }

    draw() {
        const alpha = this.lifetime / this.totalLifetime;
        ctx.fillStyle = `rgba(255, 165, 0, ${alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    isDone() {
        return this.lifetime <= 0;
    }
}

// Player drawing with enhanced graphics and super ship variants
function drawPlayer() {
    // Transformation effect
    if (player.transformationEffect > 0) {
        ctx.globalAlpha = 0.5 + Math.sin(player.transformationEffect * 0.5) * 0.5;
    }
    
    // Immunity blink effect
    if (player.immunity > 0 && Math.floor(player.immunity / 5) % 2 === 0) {
        ctx.globalAlpha *= 0.5;
    }
    
    // Shield
    if (player.shield > 0) {
        ctx.strokeStyle = `rgba(0, 255, 255, ${Math.min(player.shield / player.shieldMax, 1)})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, 45, 0, Math.PI * 2);
        ctx.stroke();
        
        // Shield hexagon pattern
        ctx.strokeStyle = `rgba(0, 200, 255, ${Math.min(player.shield / player.shieldMax, 0.5)})`;
        ctx.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI * 2) / 6;
            ctx.beginPath();
            ctx.arc(player.x + player.width / 2, player.y + player.height / 2, 35, angle, angle + Math.PI / 6);
            ctx.stroke();
        }
    }
    
    // Draw different super ship variants
    if (player.superShipType === 'destroyer') {
        drawDestroyerShip();
    } else if (player.superShipType === 'phantom') {
        drawPhantomShip();
    } else if (player.superShipType === 'titan') {
        drawTitanShip();
    } else if (player.superShipType === 'nova') {
        drawNovaShip();
    } else {
        drawNormalShip();
    }
    
    ctx.globalAlpha = 1;
}

function drawNormalShip() {
    // Enhanced ship body with gradient
    const gradient = ctx.createLinearGradient(player.x, player.y, player.x, player.y + player.height);
    gradient.addColorStop(0, '#00ff00');
    gradient.addColorStop(0.5, '#00cc00');
    gradient.addColorStop(1, '#008800');
    ctx.fillStyle = gradient;
    
    ctx.beginPath();
    ctx.moveTo(player.x + player.width / 2, player.y);
    ctx.lineTo(player.x + player.width, player.y + player.height);
    ctx.lineTo(player.x + player.width * 0.75, player.y + player.height * 0.7);
    ctx.lineTo(player.x + player.width * 0.25, player.y + player.height * 0.7);
    ctx.lineTo(player.x, player.y + player.height);
    ctx.closePath();
    ctx.fill();
    
    // Cockpit
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y + player.height * 0.4, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Engine glow
    const engineGlow = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(255, 100, 0, ${engineGlow})`;
    ctx.beginPath();
    ctx.arc(player.x + player.width * 0.3, player.y + player.height, 3, 0, Math.PI * 2);
    ctx.arc(player.x + player.width * 0.7, player.y + player.height, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Gun positions
    ctx.fillStyle = '#ffff00';
    ctx.fillRect(player.x + player.width * 0.3 - 2, player.y - 5, 4, 8);
    ctx.fillRect(player.x + player.width * 0.7 - 2, player.y - 5, 4, 8);
    
    // Laser beam indicator
    if (player.laserBeam) {
        ctx.strokeStyle = 'rgba(255, 0, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(player.x + player.width / 2, player.y);
        ctx.lineTo(player.x + player.width / 2, 0);
        ctx.stroke();
    }
}

function drawDestroyerShip() {
    // Red destroyer ship with heavy armor
    const gradient = ctx.createLinearGradient(player.x, player.y, player.x, player.y + player.height);
    gradient.addColorStop(0, '#ff6666');
    gradient.addColorStop(0.5, '#cc0000');
    gradient.addColorStop(1, '#660000');
    ctx.fillStyle = gradient;
    
    // Main body
    ctx.fillRect(player.x + 5, player.y, player.width - 10, player.height);
    
    // Armor plates
    ctx.fillStyle = '#990000';
    ctx.fillRect(player.x + 2, player.y + 5, player.width - 4, 3);
    ctx.fillRect(player.x + 2, player.y + player.height - 8, player.width - 4, 3);
    
    // Multiple guns
    ctx.fillStyle = '#ffaa00';
    for (let i = 0; i < 3; i++) {
        ctx.fillRect(player.x + 10 + i * 15, player.y - 3, 6, 10);
    }
    
    // Energy core
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y + player.height / 2, 6, 0, Math.PI * 2);
    ctx.fill();
}

function drawPhantomShip() {
    // Purple phantom ship with stealth effect
    const gradient = ctx.createRadialGradient(
        player.x + player.width / 2, player.y + player.height / 2, 0,
        player.x + player.width / 2, player.y + player.height / 2, player.width
    );
    gradient.addColorStop(0, 'rgba(153, 68, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(153, 68, 255, 0.2)');
    ctx.fillStyle = gradient;
    
    // Ethereal body
    ctx.beginPath();
    ctx.moveTo(player.x + player.width / 2, player.y - 5);
    ctx.lineTo(player.x + player.width + 5, player.y + player.height);
    ctx.lineTo(player.x + player.width * 0.75, player.y + player.height * 0.7);
    ctx.lineTo(player.x + player.width * 0.25, player.y + player.height * 0.7);
    ctx.lineTo(player.x - 5, player.y + player.height);
    ctx.closePath();
    ctx.fill();
    
    // Ghost trail effect
    for (let i = 0; i < 3; i++) {
        ctx.fillStyle = `rgba(153, 68, 255, ${0.1 - i * 0.03})`;
        ctx.beginPath();
        ctx.moveTo(player.x + player.width / 2, player.y + i * 5);
        ctx.lineTo(player.x + player.width, player.y + player.height + i * 5);
        ctx.lineTo(player.x, player.y + player.height + i * 5);
        ctx.closePath();
        ctx.fill();
    }
    
    // Energy orb
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y + player.height / 2, 5, 0, Math.PI * 2);
    ctx.fill();
}

function drawTitanShip() {
    // Blue titan ship - massive and heavily armored
    const gradient = ctx.createLinearGradient(player.x, player.y, player.x, player.y + player.height);
    gradient.addColorStop(0, '#6666ff');
    gradient.addColorStop(0.5, '#4444cc');
    gradient.addColorStop(1, '#222266');
    ctx.fillStyle = gradient;
    
    // Massive body
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // Heavy armor
    ctx.strokeStyle = '#8888ff';
    ctx.lineWidth = 3;
    ctx.strokeRect(player.x + 5, player.y + 5, player.width - 10, player.height - 10);
    
    // Multiple weapon ports
    ctx.fillStyle = '#00ffff';
    for (let i = 0; i < 5; i++) {
        ctx.fillRect(player.x + 5 + i * 8, player.y - 2, 4, 8);
    }
    
    // Power core
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y + player.height / 2, 8, 0, Math.PI * 2);
    ctx.fill();
}

function drawNovaShip() {
    // Orange nova ship - explosive power
    const gradient = ctx.createRadialGradient(
        player.x + player.width / 2, player.y + player.height / 2, 0,
        player.x + player.width / 2, player.y + player.height / 2, player.width
    );
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.3, '#ffaa00');
    gradient.addColorStop(1, '#ff4400');
    ctx.fillStyle = gradient;
    
    // Energy body
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.width / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Energy rings
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, 10 + i * 8, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Omni-directional weapons
    ctx.fillStyle = '#ffffff';
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
        const x = player.x + player.width / 2 + Math.cos(angle) * 15;
        const y = player.y + player.height / 2 + Math.sin(angle) * 15;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Central core
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y + player.height / 2, 5, 0, Math.PI * 2);
    ctx.fill();
}

function shoot() {
    player.shootCooldown--;
    if (player.shootCooldown <= 0) {
        // Apply temporary powerup effects
        let currentBulletCount = player.bulletCount;
        let currentFireRate = player.fireRate;
        
        // Check for active temporary powerups
        if (gameState.activePowerups.rapidFire > 0) {
            currentFireRate = 0.3; // Much faster fire rate
        }
        
        if (gameState.activePowerups.multiShot > 0) {
            currentBulletCount = 4; // Quad shot
        }
        
        // Set cooldown based on current fire rate
        player.shootCooldown = Math.floor(5 / currentFireRate);
        
        // Laser beam weapon (now works with regular bullets)
        if (player.laserBeam || player.giantLaser) {
            const laserWidth = player.giantLaser ? 40 : 20;
            const laserColor = player.giantLaser ? 'rgb(139, 0, 139)' : 'rgb(255, 0, 255)';
            
            // Create laser beam effect
            for (let i = 0; i < 10; i++) {
                const particle = new Particle(
                    player.x + player.width / 2,
                    player.y - i * 20,
                    (Math.random() - 0.5) * laserWidth / 10,
                    0,
                    laserColor,
                    player.giantLaser ? 5 : 3,
                    10
                );
                gameState.particles.push(particle);
            }
            
            // Check laser collision with enemies
            for (let i = gameState.enemies.length - 1; i >= 0; i--) {
                const enemy = gameState.enemies[i];
                if (Math.abs(enemy.x + enemy.width / 2 - (player.x + player.width / 2)) < laserWidth) {
                    const damage = player.giantLaser ? 2 : 0.5;
                    enemy.health -= damage;
                    
                    if (enemy.health <= 0) {
                        let points = enemy.type === 'tough' ? 50 : enemy.type === 'fast' ? 30 : 10;
                        if (player.doubleScore) points *= 2;
                        gameState.score += points;
                        
                        // Add kill coins and save progress
                        playerData.totalKills++;
                        playerData.killCoins += Math.floor(points / 10);
                        savePlayerData();
                        
                        createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                        gameState.enemies.splice(i, 1);
                        
                        // Random powerup drop
                        if (Math.random() < 0.10) {
                            dropPowerup(enemy.x + enemy.width / 2, enemy.y);
                        }
                    }
                }
            }
        }
        
        // Regular weapons with temporary powerup effects
        if (currentBulletCount === 2) {
            // Dual shot
            const bullet1 = new Bullet(
                player.x + player.width * 0.3,
                player.y,
                0,
                -BULLET_SPEED,
                true
            );
            const bullet2 = new Bullet(
                player.x + player.width * 0.7,
                player.y,
                0,
                -BULLET_SPEED,
                true
            );
            gameState.playerBullets.push(bullet1, bullet2);
        } else if (currentBulletCount === 3) {
            // Triple shot
            const bullet1 = new Bullet(
                player.x + player.width * 0.5,
                player.y,
                0,
                -BULLET_SPEED,
                true
            );
            const bullet2 = new Bullet(
                player.x + player.width * 0.2,
                player.y,
                -1,
                -BULLET_SPEED,
                true
            );
            const bullet3 = new Bullet(
                player.x + player.width * 0.8,
                player.y,
                1,
                -BULLET_SPEED,
                true
            );
            gameState.playerBullets.push(bullet1, bullet2, bullet3);
        } else if (currentBulletCount === 4) {
            // Quad shot (from temporary powerup)
            const bullet1 = new Bullet(
                player.x + player.width * 0.25,
                player.y,
                0,
                -BULLET_SPEED,
                true
            );
            const bullet2 = new Bullet(
                player.x + player.width * 0.75,
                player.y,
                0,
                -BULLET_SPEED,
                true
            );
            const bullet3 = new Bullet(
                player.x + player.width * 0.1,
                player.y,
                -1.5,
                -BULLET_SPEED,
                true
            );
            const bullet4 = new Bullet(
                player.x + player.width * 0.9,
                player.y,
                1.5,
                -BULLET_SPEED,
                true
            );
            gameState.playerBullets.push(bullet1, bullet2, bullet3, bullet4);
        } else if (currentBulletCount >= 5) {
            // Five shot spread or more
            const bulletCount = Math.min(currentBulletCount, 10);
            for (let i = 0; i < bulletCount; i++) {
                const angle = (i - (bulletCount - 1) / 2) * 0.3;
                const bullet = new Bullet(
                    player.x + player.width / 2,
                    player.y,
                    Math.sin(angle) * 2,
                    -BULLET_SPEED,
                    true
                );
                gameState.playerBullets.push(bullet);
            }
        }
    }
}

// Helper functions for new features
function findNearestEnemy() {
    let nearest = null;
    let minDistance = Infinity;
    
    for (let enemy of gameState.enemies) {
        const distance = Math.sqrt(
            Math.pow(enemy.x + enemy.width / 2 - (player.x + player.width / 2), 2) +
            Math.pow(enemy.y + enemy.height / 2 - player.y, 2)
        );
        if (distance < minDistance) {
            minDistance = distance;
            nearest = enemy;
        }
    }
    
    return nearest;
}

function createExplosion(x, y) {
    gameState.explosions.push(new Explosion(x, y));
    
    // Create particle explosion
    for (let i = 0; i < 15; i++) {
        const angle = (Math.PI * 2 * i) / 15;
        const speed = Math.random() * 3 + 2;
        const particle = new Particle(
            x,
            y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            `rgb(${255}, ${Math.floor(Math.random() * 100 + 100)}, 0)`,
            Math.random() * 3 + 1,
            30
        );
        gameState.particles.push(particle);
    }
}

function dropPowerup(x, y) {
    const types = ['rapidfire', 'shield', 'health', 'multibullet', 'massivebullet', 'immunity', 'laserbeam', 'homingmissile', 'timeslow', 'bombclear', 'piercingshots', 'explosiverounds', 'magnet', 'doublescore', 'speedboost', 'giantlaser', 'chainlightning'];
    
    // Add super ship powerups with lower chance
    if (Math.random() < 0.05) { // 5% chance for super ship
        const superTypes = ['superdestroyer', 'superphantom', 'supertitan', 'supernova'];
        const type = superTypes[Math.floor(Math.random() * superTypes.length)];
        gameState.powerups.push(new Powerup(x, y, type));
    } else {
        const type = types[Math.floor(Math.random() * types.length)];
        gameState.powerups.push(new Powerup(x, y, type));
    }
}

function transformIntoSuperShip(type) {
    player.superShipType = type;
    player.superShipTimer = 900; // 15 seconds
    player.transformationEffect = 30; // Visual effect duration
    
    // Create transformation effect
    for (let i = 0; i < 50; i++) {
        const angle = (Math.PI * 2 * i) / 50;
        const speed = Math.random() * 5 + 3;
        const particle = new Particle(
            player.x + player.width / 2,
            player.y + player.height / 2,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            '#ffffff',
            Math.random() * 4 + 2,
            40
        );
        gameState.particles.push(particle);
    }
    
    // Apply super ship bonuses
    switch(type) {
        case 'superdestroyer':
            player.fireRateStack += 2;
            player.bulletCountStack += 4;
            player.shield = 150;
            player.shieldMax = 150;
            break;
        case 'superphantom':
            player.immunity = 900; // Permanent immunity while transformed
            player.fireRateStack += 1;
            player.speed = 8;
            break;
        case 'supertitan':
            player.bulletCountStack += 6;
            player.shield = 200;
            player.shieldMax = 200;
            player.width = 50;
            player.height = 60;
            break;
        case 'supernova':
            player.laserBeam = true;
            player.homingMissiles = true;
            player.fireRateStack += 3;
            player.bulletCountStack += 2;
            activateBombClear(); // Initial clear
            break;
    }
    
    updatePlayerStats();
}

function updatePlayerStats() {
    // Calculate stacked fire rate with diminishing returns
    const effectiveStack = Math.min(player.fireRateStack, 5); // Cap at 5 stacks
    player.fireRate = 1 + (effectiveStack * 0.3); // Reduced from 0.5 to 0.3 per stack
    
    // Calculate stacked bullet count with diminishing returns
    const bulletStack = Math.min(player.bulletCountStack, 6); // Cap at 6 stacks
    player.bulletCount = 2 + bulletStack;
}

function revertFromSuperShip() {
    // Reset super ship bonuses
    switch(player.superShipType) {
        case 'superphantom':
            player.speed = PLAYER_SPEED;
            break;
        case 'supertitan':
            player.width = PLAYER_WIDTH;
            player.height = PLAYER_HEIGHT;
            break;
        case 'supernova':
            player.laserBeam = false;
            player.homingMissiles = false;
            break;
    }
    
    player.fireRateStack = 0;
    player.bulletCountStack = 0;
    player.superShipType = null;
    player.superShipTimer = 0;
    
    updatePlayerStats();
}

function showWaveComplete() {
    // Create celebration particles
    for (let i = 0; i < 30; i++) {
        const particle = new Particle(
            Math.random() * GAME_WIDTH,
            GAME_HEIGHT,
            (Math.random() - 0.5) * 5,
            -Math.random() * 5 - 2,
            `rgb(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)})`,
            Math.random() * 4 + 2,
            60
        );
        gameState.particles.push(particle);
    }
}

function createPowerupCollectEffect(x, y, color) {
    for (let i = 0; i < 20; i++) {
        const angle = (Math.PI * 2 * i) / 20;
        const speed = Math.random() * 3 + 1;
        const particle = new Particle(
            x,
            y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            color,
            Math.random() * 2 + 1,
            25
        );
        gameState.particles.push(particle);
    }
}

function activateBombClear() {
    // Clear all enemies on screen
    for (let i = gameState.enemies.length - 1; i >= 0; i--) {
        const enemy = gameState.enemies[i];
        let points = enemy.type === 'tough' ? 50 : enemy.type === 'fast' ? 30 : 10;
        if (player.doubleScore) points *= 2;
        gameState.score += points;
        
        // Add kill coins and save progress
        playerData.totalKills++;
        playerData.killCoins += Math.floor(points / 10);
        
        createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
        gameState.enemies.splice(i, 1);
    }
    
    // Save progress after bomb clear
    savePlayerData();
    
    // Create screen flash effect
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
}

// Enemy shoot function
function enemyShoot(enemy) {
    const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    const bullet = new Bullet(
        enemy.x + enemy.width / 2,
        enemy.y + enemy.height,
        Math.cos(angle) * ENEMY_BULLET_SPEED,
        Math.sin(angle) * ENEMY_BULLET_SPEED * 0.5 + ENEMY_BULLET_SPEED,
        false
    );
    gameState.enemyBullets.push(bullet);
}

// Update player
function updatePlayer() {
    // Movement
    if (player.keys['ArrowLeft'] || player.keys['a']) {
        player.x -= player.speed;
    }
    if (player.keys['ArrowRight'] || player.keys['d']) {
        player.x += player.speed;
    }
    if (player.keys['ArrowUp'] || player.keys['w']) {
        player.y -= player.speed;
    }
    if (player.keys['ArrowDown'] || player.keys['s']) {
        player.y += player.speed;
    }
    
    // Boundary check
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > GAME_WIDTH) player.x = GAME_WIDTH - player.width;
    if (player.y < 0) player.y = 0;
    if (player.y + player.height > GAME_HEIGHT) player.y = GAME_HEIGHT - player.height;
    
    // Shield decay
    if (player.shield > 0) {
        player.shield -= 0.5;
    }
    
    // Immunity decay
    if (player.immunity > 0) {
        player.immunity--;
    }
    
    // Continuous shooting
    shoot();
}

// Collision detection
function checkCollisions() {
    // Enemy bullet to player
    for (let i = gameState.enemyBullets.length - 1; i >= 0; i--) {
        const bullet = gameState.enemyBullets[i];
        if (bullet.x > player.x && bullet.x < player.x + player.width &&
            bullet.y > player.y && bullet.y < player.y + player.height) {
            if (player.immunity > 0) {
                gameState.enemyBullets.splice(i, 1);
            } else if (player.shield > 0) {
                player.shield -= 10;
                gameState.enemyBullets.splice(i, 1);
            } else {
                gameState.lives--;
                gameState.enemyBullets.splice(i, 1);
                gameState.explosions.push(new Explosion(player.x + player.width / 2, player.y + player.height / 2));
                player.immunity = 120; // 2 second immunity
                if (gameState.lives <= 0) {
                    gameState.gameOver = true;
                }
            }
        }
    }
    
    // Player bullet to enemies
    for (let i = gameState.enemies.length - 1; i >= 0; i--) {
        const enemy = gameState.enemies[i];
        for (let j = gameState.playerBullets.length - 1; j >= 0; j--) {
            const bullet = gameState.playerBullets[j];
            if (bullet.x > enemy.x && bullet.x < enemy.x + enemy.width &&
                bullet.y > enemy.y && bullet.y < enemy.y + enemy.height) {
                enemy.health--;
                
                // Piercing shots don't get destroyed on impact
                if (!player.piercingShots) {
                    gameState.playerBullets.splice(j, 1);
                }
                
                if (enemy.health <= 0) {
                    let points = enemy.type === 'tough' ? 50 : enemy.type === 'fast' ? 30 : 10;
                    if (player.doubleScore) points *= 2;
                    gameState.score += points;
                    
                    // Add kill coins
                    playerData.totalKills++;
                    playerData.killCoins += Math.floor(points / 10);
                    savePlayerData();
                    
                    createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                    gameState.enemies.splice(i, 1);
                    
                    // Explosive rounds create secondary explosions
                    if (player.explosiveRounds) {
                        for (let j = 0; j < 5; j++) {
                            const particle = new Particle(
                                enemy.x + enemy.width / 2,
                                enemy.y + enemy.height / 2,
                                (Math.random() - 0.5) * 8,
                                (Math.random() - 0.5) * 8,
                                'rgb(255, 100, 0)',
                                Math.random() * 4 + 2,
                                20
                            );
                            gameState.particles.push(particle);
                        }
                        // Damage nearby enemies
                        for (let otherEnemy of gameState.enemies) {
                            if (otherEnemy !== enemy) {
                                const distance = Math.sqrt(
                                    Math.pow(otherEnemy.x + otherEnemy.width / 2 - (enemy.x + enemy.width / 2), 2) +
                                    Math.pow(otherEnemy.y + otherEnemy.height / 2 - (enemy.y + enemy.height / 2), 2)
                                );
                                if (distance < 100) {
                                    otherEnemy.health -= 1;
                                }
                            }
                        }
                    }
                    
                    // Random powerup drop - reduced from 18% to 10%
                    if (Math.random() < 0.10) {
                        dropPowerup(enemy.x + enemy.width / 2, enemy.y);
                    }
                }
                break;
            }
        }
    }
    
    // Powerups to player
    for (let i = gameState.powerups.length - 1; i >= 0; i--) {
        const powerup = gameState.powerups[i];
        if (powerup.x > player.x && powerup.x < player.x + player.width &&
            powerup.y > player.y && powerup.y < player.y + player.height) {
            
            if (powerup.type === 'rapidfire') {
                player.fireRateStack += 1;
                updatePlayerStats();
                createPowerupCollectEffect(powerup.x, powerup.y, '#ffff00');
            } else if (powerup.type === 'shield') {
                player.shield = Math.min(player.shield + 30, 150); // Reduced from 50 to 30, max 150
                player.shieldMax = Math.max(player.shieldMax, 150);
                createPowerupCollectEffect(powerup.x, powerup.y, '#00ffff');
            } else if (powerup.type === 'health') {
                if (gameState.lives < 7) gameState.lives++; // Reduced max lives from 9 to 7
                createPowerupCollectEffect(powerup.x, powerup.y, '#ff00ff');
            } else if (powerup.type === 'multibullet') {
                player.bulletCountStack += 1;
                updatePlayerStats();
                createPowerupCollectEffect(powerup.x, powerup.y, '#ff00ff');
            } else if (powerup.type === 'massivebullet') {
                player.bulletCountStack += 2; // Reduced from 3 to 2
                updatePlayerStats();
                createPowerupCollectEffect(powerup.x, powerup.y, '#ff0000');
            } else if (powerup.type === 'immunity') {
                player.immunity = Math.max(player.immunity, 120); // Reduced from 180 to 120
                player.immunityMax = 120;
                createPowerupCollectEffect(powerup.x, powerup.y, '#00ff00');
            } else if (powerup.type === 'laserbeam') {
                player.laserBeam = true;
                createPowerupCollectEffect(powerup.x, powerup.y, '#ff00ff');
            } else if (powerup.type === 'homingmissile') {
                player.homingMissiles = true;
                createPowerupCollectEffect(powerup.x, powerup.y, '#ff8800');
            } else if (powerup.type === 'timeslow') {
                player.timeSlowActive = true;
                createPowerupCollectEffect(powerup.x, powerup.y, '#0088ff');
            } else if (powerup.type === 'bombclear') {
                activateBombClear();
                createPowerupCollectEffect(powerup.x, powerup.y, '#ff0000');
            } else if (powerup.type === 'piercingshots') {
                player.piercingShots = true;
                createPowerupCollectEffect(powerup.x, powerup.y, '#ff1493');
            } else if (powerup.type === 'explosiverounds') {
                player.explosiveRounds = true;
                createPowerupCollectEffect(powerup.x, powerup.y, '#ff6347');
            } else if (powerup.type === 'magnet') {
                player.magnetActive = true;
                createPowerupCollectEffect(powerup.x, powerup.y, '#00ced1');
            } else if (powerup.type === 'doublescore') {
                player.doubleScore = true;
                createPowerupCollectEffect(powerup.x, powerup.y, '#ffd700');
            } else if (powerup.type === 'speedboost') {
                player.speed = PLAYER_SPEED + 2; // Reduced from +3 to +2
                player.speedBoost = true;
                createPowerupCollectEffect(powerup.x, powerup.y, '#32cd32');
            } else if (powerup.type === 'giantlaser') {
                player.giantLaser = true;
                createPowerupCollectEffect(powerup.x, powerup.y, '#8b008b');
            } else if (powerup.type === 'chainlightning') {
                player.chainLightning = true;
                createPowerupCollectEffect(powerup.x, powerup.y, '#9400d3');
            } else if (powerup.type.startsWith('super')) {
                const shipType = powerup.type.replace('super', '');
                transformIntoSuperShip(shipType);
                createPowerupCollectEffect(powerup.x, powerup.y, '#ffffff');
            }
            
            gameState.powerups.splice(i, 1);
        }
    }
    
    // Enemy collision with player
    for (let enemy of gameState.enemies) {
        if (enemy.x < player.x + player.width &&
            enemy.x + enemy.width > player.x &&
            enemy.y < player.y + player.height &&
            enemy.y + enemy.height > player.y) {
            gameState.lives--;
            gameState.explosions.push(new Explosion(player.x + player.width / 2, player.y + player.height / 2));
            player.y = GAME_HEIGHT - 80;
            if (gameState.lives <= 0) {
                gameState.gameOver = true;
            }
        }
    }
}



// Update game
function update() {
    if (gameState.gameOver || gameState.gameWon) return;
    checkCollisions();
    
    // Update temporary powerup durations
    for (let powerupType in gameState.activePowerups) {
        if (gameState.activePowerups[powerupType] > 0) {
            gameState.activePowerups[powerupType]--;
            if (gameState.activePowerups[powerupType] === 0) {
                showMessage(`${powerupType} expired!`);
            }
        }
    }
    
    updatePlayer();
    
    // Update enemies with time slow effect
    const speedMultiplier = player.timeSlowActive ? 0.3 : 1;
    for (let i = gameState.enemies.length - 1; i >= 0; i--) {
        const enemy = gameState.enemies[i];
        const originalSpeed = enemy.speed;
        enemy.speed *= speedMultiplier;
        enemy.update();
        enemy.speed = originalSpeed; // Restore original speed
        
        if (enemy.y > GAME_HEIGHT) {
            gameState.lives--;
            gameState.enemies.splice(i, 1);
            if (gameState.lives <= 0) {
                gameState.gameOver = true;
            }
        }
    }
    
    // Update bullets with homing missile logic
    for (let i = gameState.playerBullets.length - 1; i >= 0; i--) {
        const bullet = gameState.playerBullets[i];
        
        // Homing missile behavior
        if (bullet.isHoming && gameState.enemies.length > 0) {
            const nearestEnemy = findNearestEnemy();
            if (nearestEnemy) {
                const angle = Math.atan2(
                    nearestEnemy.y + nearestEnemy.height / 2 - bullet.y,
                    nearestEnemy.x + nearestEnemy.width / 2 - bullet.x
                );
                bullet.vx = Math.cos(angle) * 4;
                bullet.vy = Math.sin(angle) * 4;
            }
        }
        
        bullet.update();
        if (bullet.isOutOfBounds()) {
            gameState.playerBullets.splice(i, 1);
        }
    }
    
    for (let i = gameState.enemyBullets.length - 1; i >= 0; i--) {
        gameState.enemyBullets[i].update();
        if (gameState.enemyBullets[i].isOutOfBounds()) {
            gameState.enemyBullets.splice(i, 1);
        }
    }
    
    // Update powerups with magnet effect
    for (let i = gameState.powerups.length - 1; i >= 0; i--) {
        const powerup = gameState.powerups[i];
        
        // Magnet effect - attract powerups to player
        if (player.magnetActive) {
            const dx = (player.x + player.width / 2) - powerup.x;
            const dy = (player.y + player.height / 2) - powerup.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 150 && distance > 0) {
                powerup.x += (dx / distance) * 5;
                powerup.y += (dy / distance) * 5;
            }
        }
        
        powerup.update();
        if (powerup.isOutOfBounds()) {
            gameState.powerups.splice(i, 1);
        }
    }
    
    // Update particles
    for (let i = gameState.particles.length - 1; i >= 0; i--) {
        gameState.particles[i].update();
        if (gameState.particles[i].isDone()) {
            gameState.particles.splice(i, 1);
        }
    }
    
    // Update super ship timer (only super ships have timers now)
    if (player.superShipType && player.superShipTimer > 0) {
        player.superShipTimer--;
        if (player.superShipTimer <= 0) {
            revertFromSuperShip();
        }
    }
    
    // Update transformation effect
    if (player.transformationEffect > 0) {
        player.transformationEffect--;
    }
    
    // Update explosions
    for (let i = gameState.explosions.length - 1; i >= 0; i--) {
        gameState.explosions[i].update();
        if (gameState.explosions[i].isDone()) {
            gameState.explosions.splice(i, 1);
        }
    }
    
    checkCollisions();
    
    // Wave completion - fix the spawning issue
    if (gameState.enemies.length === 0 && !gameState.waveTransition) {
        gameState.waveTransition = true;
        gameState.waveTransitionTimer = 60; // 1 second delay
        
        // Save progress when wave is completed
        savePlayerData();
        
        // Show wave complete message
        showWaveComplete();
    }
    
    // Handle wave transition
    if (gameState.waveTransition) {
        gameState.waveTransitionTimer--;
        if (gameState.waveTransitionTimer <= 0) {
            gameState.wave++;
            gameState.waveTransition = false;
            spawnWave();
        }
    }
}

// Draw game
function draw() {
    console.log('Draw function called, currentScreen:', currentScreen, 'enemies:', gameState.enemies.length);
    
    // Clear canvas completely
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // Draw stars
    drawStars();
    
    // Draw game objects
    drawPlayer();
    console.log('Drawing player at:', player.x, player.y);
    
    for (let enemy of gameState.enemies) {
        enemy.draw();
        console.log('Drawing enemy at:', enemy.x, enemy.y);
    }
    
    for (let bullet of gameState.playerBullets) {
        bullet.draw();
    }
    
    for (let bullet of gameState.enemyBullets) {
        bullet.draw();
    }
    
    for (let powerup of gameState.powerups) {
        powerup.draw();
    }
    
    for (let explosion of gameState.explosions) {
        explosion.draw();
    }
    
    for (let particle of gameState.particles) {
        particle.draw();
    }
    
    // Draw wave transition message
    if (gameState.waveTransition) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`WAVE ${gameState.wave} COMPLETE!`, GAME_WIDTH / 2, GAME_HEIGHT / 2);
        ctx.font = '24px Arial';
        ctx.fillText('Get ready for the next wave...', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50);
    }
    
    // Draw HUD
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('lives').textContent = gameState.lives;
    document.getElementById('wave').textContent = gameState.wave;
    
    // Update active powerups display
    const activePowerupNames = [];
    
    // Add super ship status
    if (player.superShipType) {
        const timeLeft = Math.ceil(player.superShipTimer / 60);
        activePowerupNames.push(`SUPER ${player.superShipType.toUpperCase()} (${timeLeft}s)`);
    }
    
    // Add temporary powerup status from shop
    for (let powerupType in gameState.activePowerups) {
        if (gameState.activePowerups[powerupType] > 0) {
            const timeLeft = Math.ceil(gameState.activePowerups[powerupType] / 60);
            const displayName = powerupType.charAt(0).toUpperCase() + powerupType.slice(1).replace(/([A-Z])/g, ' $1');
            activePowerupNames.push(`${displayName} (${timeLeft}s)`);
        }
    }
    
    // Show permanent powerup status
    if (player.fireRateStack > 0) {
        activePowerupNames.push(`Fire Rate +${player.fireRateStack}`);
    }
    if (player.bulletCountStack > 0) {
        activePowerupNames.push(`Multi Shot +${player.bulletCountStack}`);
    }
    if (player.laserBeam) {
        activePowerupNames.push('Laser Beam');
    }
    if (player.homingMissiles) {
        activePowerupNames.push('Homing Missiles');
    }
    if (player.timeSlowActive) {
        activePowerupNames.push('Time Slow');
    }
    if (player.piercingShots) {
        activePowerupNames.push('Piercing Shots');
    }
    if (player.explosiveRounds) {
        activePowerupNames.push('Explosive Rounds');
    }
    if (player.magnetActive) {
        activePowerupNames.push('Magnet');
    }
    if (player.doubleScore) {
        activePowerupNames.push('Double Score');
    }
    if (player.speedBoost) {
        activePowerupNames.push('Speed Boost');
    }
    if (player.giantLaser) {
        activePowerupNames.push('Giant Laser');
    }
    if (player.chainLightning) {
        activePowerupNames.push('Chain Lightning');
    }
    if (player.shield > 0) {
        activePowerupNames.push(`Shield: ${Math.ceil(player.shield)}`);
    }
    
    const powerupsElement = document.getElementById('activePowerups');
    if (activePowerupNames.length > 0) {
        powerupsElement.textContent = 'Powerups: ' + activePowerupNames.join(', ');
        powerupsElement.style.color = player.superShipType ? '#ffaa00' : '#ff00ff';
    } else {
        powerupsElement.textContent = 'Powerups: None';
        powerupsElement.style.color = '#888888';
    }
    
    // Game over message
    if (gameState.gameOver) {
        showDeathMenu();
        return;
    }
}

// Draw stars background
let stars = [];
function initStars() {
    for (let i = 0; i < 100; i++) {
        stars.push({
            x: Math.random() * GAME_WIDTH,
            y: Math.random() * GAME_HEIGHT,
            size: Math.random() * 1.5,
            speed: Math.random() * 0.3 + 0.1
        });
    }
}

function drawStars() {
    ctx.fillStyle = '#ffffff';
    for (let star of stars) {
        star.y += star.speed;
        if (star.y > GAME_HEIGHT) star.y = 0;
        
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Game loop
function gameLoop() {
    if (currentScreen === 'game' && !isPaused) {
        update();
        draw();
    }
    requestAnimationFrame(gameLoop);
}

// Update wave difficulty
function spawnWave() {
    const baseEnemyCount = 3 + Math.floor(gameState.wave * 1.2); // Increased scaling
    const enemyCount = Math.min(baseEnemyCount, 15); // Increased cap from 10 to 15
    const spacing = GAME_WIDTH / (enemyCount + 1);
    
    // Increase enemy type chances based on wave
    const toughChance = Math.min(0.05 + (gameState.wave * 0.02), 0.4); // Max 40% tough enemies
    const fastChance = Math.min(0.08 + (gameState.wave * 0.03), 0.5); // Max 50% fast enemies
    
    for (let i = 0; i < enemyCount; i++) {
        let type = 'normal';
        const rand = Math.random();
        if (rand < toughChance) {
            type = 'tough';
        } else if (rand < toughChance + fastChance) {
            type = 'fast';
        }
        
        // Add some randomness to spawn positions
        const xOffset = (Math.random() - 0.5) * 30;
        gameState.enemies.push(new Enemy(spacing * (i + 1) + xOffset, -50, type));
    }
}

// Initialize
console.log('Script loaded successfully!');
loadPlayerData();
showMainMenu();
initStars();
gameLoop();
