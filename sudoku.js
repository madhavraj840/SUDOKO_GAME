class SudokuGame {
    constructor() {
        this.grid = [];
        this.originalGrid = [];
        this.solution = [];
        this.selectedCell = null;
        this.timer = 0;
        this.timerInterval = null;
        this.difficulty = 'medium';
        this.isGameComplete = false;
        this.isPaused = false;
        this.hintsUsed = 0;
        
        this.initializeTheme();
        this.initializeEventListeners();
        this.startNewGame();
    }

    initializeTheme() {
        const savedTheme = localStorage.getItem('sudokuTheme') || 'light';
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            this.updateThemeIcon();
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            // Wait 2.8 seconds (to let progress bar complete its 2.5s animation + buffer)
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
                setTimeout(() => {
                    if (loadingScreen.parentNode) {
                        loadingScreen.parentNode.removeChild(loadingScreen);
                    }
                }, 500);
            }, 2800);
        }
    }

    updateThemeIcon() {
        const icon = document.querySelector('.theme-icon');
        if (document.body.classList.contains('dark-mode')) {
            icon.textContent = '☀️';
        } else {
            icon.textContent = '🌙';
        }
    }

    initializeEventListeners() {
        this.hideLoadingScreen();

        document.getElementById('newGameBtn').addEventListener('click', () => this.requestStartNewGame());
        document.getElementById('resetBtn').addEventListener('click', () => this.requestReset());
        document.getElementById('solveBtn').addEventListener('click', () => this.solveGame());
        document.getElementById('playAgainBtn').addEventListener('click', () => this.startNewGame());
        
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        
        // Pause button
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        
        // Number pad buttons
        document.querySelectorAll('.number-btn:not(.clear-btn)').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleNumberButtonClick(e.target.dataset.number));
        });
        
        // Clear button
        document.getElementById('clearBtn').addEventListener('click', () => this.handleNumberButtonClick(''));
        
        // Hint button
        document.getElementById('hintBtn').addEventListener('click', () => this.requestHint());
        
        // Difficulty buttons (confirm before switching if there's progress)
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.requestChangeDifficulty(e.target.dataset.difficulty));
        });
    }

    hasUserProgress() {
        // Returns true if the player has entered any numbers different from the original puzzle
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const orig = this.originalGrid[row] ? this.originalGrid[row][col] : 0;
                const cur = this.grid[row] ? this.grid[row][col] : 0;
                if (orig !== cur && cur !== 0) return true;
            }
        }
        return false;
    }

    requestStartNewGame() {
        if (this.hasUserProgress()) {
            const ok = window.confirm('You have unsaved progress — start a new game and lose current progress?');
            if (!ok) return;
        }
        this.startNewGame();
    }

    requestChangeDifficulty(newDifficulty) {
        if (newDifficulty === this.difficulty) return;
        if (this.hasUserProgress()) {
            const ok = window.confirm('You have unsaved progress — change difficulty and start a new game?');
            if (!ok) return;
        }
        this.changeDifficulty(newDifficulty);
    }

    requestReset() {
        if (!this.hasUserProgress()) {
            // nothing to lose, just reset
            this.resetGame();
            return;
        }

        const ok = window.confirm('Reset will remove your current entries and restore the original puzzle. Continue?');
        if (ok) this.resetGame();
    }

    toggleTheme() {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('sudokuTheme', isDarkMode ? 'dark' : 'light');
        this.updateThemeIcon();
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const pauseBtn = document.getElementById('pauseBtn');
        
        if (this.isPaused) {
            this.stopTimer();
            pauseBtn.textContent = '▶️';
            pauseBtn.classList.add('paused');
            pauseBtn.title = 'Resume game';
            this.applyPausedState();
        } else {
            pauseBtn.textContent = '⏸️';
            pauseBtn.classList.remove('paused');
            pauseBtn.title = 'Pause game';
            this.removePausedState();
            this.startTimer();
        }
    }

    applyPausedState() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.classList.add('paused');
        });
        
        // Create or show pause overlay
        let pauseOverlay = document.getElementById('pauseOverlay');
        if (!pauseOverlay) {
            pauseOverlay = document.createElement('div');
            pauseOverlay.id = 'pauseOverlay';
            pauseOverlay.className = 'pause-overlay';
            pauseOverlay.textContent = '⏸️';
            document.getElementById('sudoku-grid').appendChild(pauseOverlay);
        }
        pauseOverlay.classList.add('show');
    }

    removePausedState() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.classList.remove('paused');
        });
        
        // Hide pause overlay (if present)
        const pauseOverlay = document.getElementById('pauseOverlay');
        if (pauseOverlay) {
            pauseOverlay.classList.remove('show');
        }
    }

    startNewGame() {
        this.stopTimer();
        this.timer = 0;
        this.isGameComplete = false;
        this.isPaused = false;
        this.hintsUsed = 0;
        document.getElementById('modal').classList.remove('show');
        
        // Reset pause button
        const pauseBtn = document.getElementById('pauseBtn');
        pauseBtn.textContent = '⏸️';
        pauseBtn.classList.remove('paused');
        pauseBtn.title = 'Pause game';
        
        // Reset hint counter
        this.updateHintCounter();
        
        // Update difficulty display
        const difficultyText = this.difficulty.charAt(0).toUpperCase() + this.difficulty.slice(1);
        document.getElementById('difficulty').textContent = difficultyText;
        
        this.generatePuzzle();
        this.renderGrid();
        this.startTimer();
    }

    resetGame() {
        this.grid = JSON.parse(JSON.stringify(this.originalGrid));
        this.renderGrid();
    }

    generatePuzzle() {
        // Generate a valid solved sudoku
        this.solution = Array(9).fill(null).map(() => Array(9).fill(0));
        this.generateSolution(this.solution);
        
        // Copy solution for reference
        const fullGrid = JSON.parse(JSON.stringify(this.solution));
        
        // Remove numbers based on difficulty
        const cellsToRemove = this.difficulty === 'easy' ? 40 : this.difficulty === 'medium' ? 50 : 60;
        let removed = 0;
        const cellsRemoved = [];
        
        while (removed < cellsToRemove) {
            const row = Math.floor(Math.random() * 9);
            const col = Math.floor(Math.random() * 9);
            const key = `${row}-${col}`;
            
            if (fullGrid[row][col] !== 0 && !cellsRemoved.includes(key)) {
                fullGrid[row][col] = 0;
                cellsRemoved.push(key);
                removed++;
            }
        }
        
        this.grid = JSON.parse(JSON.stringify(fullGrid));
        this.originalGrid = JSON.parse(JSON.stringify(fullGrid));
    }

    generateSolution(grid) {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (grid[row][col] === 0) {
                    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
                    
                    for (let num of numbers) {
                        if (this.isValid(grid, row, col, num)) {
                            grid[row][col] = num;
                            
                            if (this.generateSolution(grid)) {
                                return true;
                            }
                            
                            grid[row][col] = 0;
                        }
                    }
                    
                    return false;
                }
            }
        }
        return true;
    }

    isValid(grid, row, col, num) {
        // Check row
        for (let i = 0; i < 9; i++) {
            if (grid[row][i] === num) return false;
        }
        
        // Check column
        for (let i = 0; i < 9; i++) {
            if (grid[i][col] === num) return false;
        }
        
        // Check 3x3 box
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        for (let i = boxRow; i < boxRow + 3; i++) {
            for (let j = boxCol; j < boxCol + 3; j++) {
                if (grid[i][j] === num) return false;
            }
        }
        
        return true;
    }

    renderGrid() {
        const gridContainer = document.getElementById('sudoku-grid');
        // Preserve pause overlay (if present) when re-rendering the grid
        const pauseOverlay = document.getElementById('pauseOverlay');
        if (pauseOverlay && pauseOverlay.parentElement === gridContainer) {
            pauseOverlay.remove();
        }
        gridContainer.innerHTML = '';
        
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                if (this.originalGrid[row][col] !== 0) {
                    cell.className += ' initial';
                    cell.textContent = this.grid[row][col];
                } else {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.inputMode = 'numeric';
                    input.maxLength = '1';
                    input.placeholder = '';
                    
                    if (this.grid[row][col] !== 0) {
                        input.value = this.grid[row][col];
                    }
                    
                    input.addEventListener('input', (e) => this.handleCellInput(e, row, col));
                    input.addEventListener('focus', () => this.selectCell(row, col));
                    input.addEventListener('keydown', (e) => this.handleKeyDown(e, row, col));
                    
                    cell.appendChild(input);
                }
                
                gridContainer.appendChild(cell);
            }
        }
        // Re-attach pause overlay if it existed
        if (pauseOverlay) {
            gridContainer.appendChild(pauseOverlay);
        }

        this.updateCellStyles();
    }

    handleCellInput(e, row, col) {
        let value = e.target.value;
        
        if (value === '') {
            this.grid[row][col] = 0;
        } else if (/^[1-9]$/.test(value)) {
            this.grid[row][col] = parseInt(value);
        } else {
            e.target.value = '';
            return;
        }
        
        this.updateCellStyles();
        this.checkGameCompletion();
    }

    handleKeyDown(e, row, col) {
        const rowNum = parseInt(row);
        const colNum = parseInt(col);
        
        if (e.key === 'ArrowUp' && rowNum > 0) {
            e.preventDefault();
            this.focusCell(rowNum - 1, colNum);
        } else if (e.key === 'ArrowDown' && rowNum < 8) {
            e.preventDefault();
            this.focusCell(rowNum + 1, colNum);
        } else if (e.key === 'ArrowLeft' && colNum > 0) {
            e.preventDefault();
            this.focusCell(rowNum, colNum - 1);
        } else if (e.key === 'ArrowRight' && colNum < 8) {
            e.preventDefault();
            this.focusCell(rowNum, colNum + 1);
        } else if (e.key === 'Backspace' || e.key === 'Delete') {
            e.preventDefault();
            this.grid[rowNum][colNum] = 0;
            e.target.value = '';
            this.updateCellStyles();
        }
    }

    selectCell(row, col) {
        this.selectedCell = { row, col };
        this.updateCellStyles();
    }

    focusCell(row, col) {
        if (this.originalGrid[row][col] === 0) {
            const cells = document.querySelectorAll('.cell');
            const cellIndex = row * 9 + col;
            const input = cells[cellIndex].querySelector('input');
            if (input) input.focus();
        }
    }

    handleNumberButtonClick(number) {
        if (!this.selectedCell) {
            alert('Please select a cell first!');
            return;
        }

        if (this.isPaused) {
            alert('Game is paused! Resume to continue playing.');
            return;
        }

        const { row, col } = this.selectedCell;

        // Don't allow editing initial cells
        if (this.originalGrid[row][col] !== 0) {
            return;
        }

        const cells = document.querySelectorAll('.cell');
        const cellIndex = row * 9 + col;
        const input = cells[cellIndex].querySelector('input');

        if (input) {
            if (number === '') {
                input.value = '';
                this.grid[row][col] = 0;
            } else {
                input.value = number;
                this.grid[row][col] = parseInt(number);
            }

            this.updateCellStyles();
            this.checkGameCompletion();
        }
    }

    updateCellStyles() {
        const cells = document.querySelectorAll('.cell');
        
        cells.forEach((cell) => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            
            cell.classList.remove('selected', 'related', 'conflict');
            
            if (this.selectedCell && row === this.selectedCell.row && col === this.selectedCell.col) {
                cell.classList.add('selected');
            } else if (this.selectedCell) {
                // Highlight related cells
                if (row === this.selectedCell.row || col === this.selectedCell.col) {
                    cell.classList.add('related');
                }
                
                const boxRow = Math.floor(row / 3);
                const boxCol = Math.floor(col / 3);
                const selectedBoxRow = Math.floor(this.selectedCell.row / 3);
                const selectedBoxCol = Math.floor(this.selectedCell.col / 3);
                
                if (boxRow === selectedBoxRow && boxCol === selectedBoxCol) {
                    cell.classList.add('related');
                }
            }
            
            // Check for conflicts
            const cellValue = this.grid[row][col];
            if (cellValue !== 0) {
                // Check row conflict
                for (let i = 0; i < 9; i++) {
                    if (i !== col && this.grid[row][i] === cellValue) {
                        cell.classList.add('conflict');
                        break;
                    }
                }
                
                // Check column conflict
                for (let i = 0; i < 9; i++) {
                    if (i !== row && this.grid[i][col] === cellValue) {
                        cell.classList.add('conflict');
                        break;
                    }
                }
                
                // Check box conflict
                const boxRow = Math.floor(row / 3) * 3;
                const boxCol = Math.floor(col / 3) * 3;
                for (let i = boxRow; i < boxRow + 3; i++) {
                    for (let j = boxCol; j < boxCol + 3; j++) {
                        if ((i !== row || j !== col) && this.grid[i][j] === cellValue) {
                            cell.classList.add('conflict');
                            break;
                        }
                    }
                }
            }
        });
        
        this.updateNumberButtonStates();
    }

    updateNumberButtonStates() {
        for (let num = 1; num <= 9; num++) {
            const isComplete = this.isNumberComplete(num);
            const btn = document.querySelector(`.number-btn[data-number="${num}"]`);
            
            if (btn) {
                if (isComplete) {
                    btn.disabled = true;
                    btn.classList.add('completed');
                } else {
                    btn.disabled = false;
                    btn.classList.remove('completed');
                }
            }
        }
    }

    isNumberComplete(num) {
        let count = 0;
        
        // Count how many times this number appears in the grid
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this.grid[row][col] === num) {
                    count++;
                }
            }
        }
        
        // If all 9 instances are placed, check if they're all valid
        if (count === 9) {
            // Check if any cell with this number has a conflict
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    if (this.grid[row][col] === num) {
                        // Check row
                        for (let i = 0; i < 9; i++) {
                            if (i !== col && this.grid[row][i] === num) {
                                return false;
                            }
                        }
                        
                        // Check column
                        for (let i = 0; i < 9; i++) {
                            if (i !== row && this.grid[i][col] === num) {
                                return false;
                            }
                        }
                        
                        // Check 3x3 box
                        const boxRow = Math.floor(row / 3) * 3;
                        const boxCol = Math.floor(col / 3) * 3;
                        for (let i = boxRow; i < boxRow + 3; i++) {
                            for (let j = boxCol; j < boxCol + 3; j++) {
                                if ((i !== row || j !== col) && this.grid[i][j] === num) {
                                    return false;
                                }
                            }
                        }
                    }
                }
            }
            
            return true;
        }
        
        return false;
    }

    checkGameCompletion() {
        if (this.isGameComplete) return;
        
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this.grid[row][col] === 0) return;
            }
        }
        
        // All cells filled, check if valid
        if (this.isSolutionValid()) {
            this.isGameComplete = true;
            this.stopTimer();
            this.showCompletionModal();
        }
    }

    isSolutionValid() {
        // Check rows
        for (let row = 0; row < 9; row++) {
            const seen = new Set();
            for (let col = 0; col < 9; col++) {
                const num = this.grid[row][col];
                if (seen.has(num)) return false;
                seen.add(num);
            }
        }
        
        // Check columns
        for (let col = 0; col < 9; col++) {
            const seen = new Set();
            for (let row = 0; row < 9; row++) {
                const num = this.grid[row][col];
                if (seen.has(num)) return false;
                seen.add(num);
            }
        }
        
        // Check 3x3 boxes
        for (let boxRow = 0; boxRow < 9; boxRow += 3) {
            for (let boxCol = 0; boxCol < 9; boxCol += 3) {
                const seen = new Set();
                for (let i = boxRow; i < boxRow + 3; i++) {
                    for (let j = boxCol; j < boxCol + 3; j++) {
                        const num = this.grid[i][j];
                        if (seen.has(num)) return false;
                        seen.add(num);
                    }
                }
            }
        }
        
        return true;
    }

    solveGame() {
        this.grid = JSON.parse(JSON.stringify(this.solution));
        this.renderGrid();
        this.isGameComplete = true;
        this.stopTimer();
        this.showCompletionModal();
    }

    showCompletionModal() {
        const modal = document.getElementById('modal');
        const minutes = Math.floor(this.timer / 60);
        const seconds = this.timer % 60;
        document.getElementById('modalMessage').textContent = 
            `You completed the puzzle in ${minutes}:${seconds.toString().padStart(2, '0')}!`;
        modal.classList.add('show');
    }

    changeDifficulty(newDifficulty) {
        this.difficulty = newDifficulty;
        
        // Update button styles
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.difficulty-btn[data-difficulty="${newDifficulty}"]`).classList.add('active');
        
        // Update difficulty display
        const difficultyText = newDifficulty.charAt(0).toUpperCase() + newDifficulty.slice(1);
        
        // Start new game with new difficulty
        this.startNewGame();
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            this.timer++;
            const minutes = Math.floor(this.timer / 60);
            const seconds = this.timer % 60;
            document.getElementById('timer').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
    }

    requestHint() {
        if (this.isPaused) {
            alert('Resume the game to use hints!');
            return;
        }

        // Check if game is complete
        if (this.isGameComplete) {
            alert('Game is already complete!');
            return;
        }

        // For Poki deployment: trigger rewarded video ad
        // If Poki SDK is available, show ad before granting hint
        if (typeof PokiSDK !== 'undefined') {
            PokiSDK.showRewardedVideo('hint',
                () => {
                    // Ad watched successfully - grant hint
                    this.grantHint();
                },
                () => {
                    // Ad skipped/failed
                    alert('Ad skipped. Hint not granted.');
                }
            );
        } else {
            // No Poki SDK - grant hint immediately (for testing/local development)
            this.grantHint();
        }
    }

    grantHint() {
        // Find all empty cells (value 0)
        const emptyCells = [];
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this.grid[row][col] === 0) {
                    emptyCells.push({ row, col });
                }
            }
        }

        if (emptyCells.length === 0) {
            alert('No empty cells to hint!');
            return;
        }

        // Pick a random empty cell
        const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const { row, col } = randomCell;

        // Fill it with the correct answer from solution
        this.grid[row][col] = this.solution[row][col];

        // Update hint counter
        this.hintsUsed++;
        this.updateHintCounter();

        // Re-render grid
        this.renderGrid();

        // Check for game completion
        this.checkGameCompletion();
    }

    updateHintCounter() {
        const counterEl = document.getElementById('hintCounter');
        counterEl.textContent = `${this.hintsUsed}`;
    }
}

// Initialize the game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Poki SDK if available
    if (typeof PokiSDK !== 'undefined') {
        PokiSDK.init().then(() => {
            console.log('Poki SDK initialized');
            // Game environment is ready
            new SudokuGame();
        }).catch(() => {
            // SDK not available or error - run game anyway
            console.log('Poki SDK not available - running in standalone mode');
            new SudokuGame();
        });
    } else {
        // No Poki SDK - run game in standalone mode
        new SudokuGame();
    }
});
