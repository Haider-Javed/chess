const game = new ChessGame();
const boardElement = document.getElementById('chessboard');
const statusMessage = document.getElementById('status-message');
const turnText = document.getElementById('turn-text');
const turnIcon = document.getElementById('turn-icon');
const resetBtn = document.getElementById('reset-btn');
const promotionModal = document.getElementById('promotion-modal');

let selectedSquare = null;
let possibleMoves = [];
let promotionPending = null; // { start: [r,c], end: [r,c] }

const PIECES = {
    w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
};

function renderBoard() {
    boardElement.innerHTML = '';

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const square = document.createElement('div');
            square.classList.add('square');
            square.classList.add((r + c) % 2 === 0 ? 'light' : 'dark');
            square.dataset.row = r;
            square.dataset.col = c;

            const piece = game.getPiece(r, c);
            if (piece) {
                const pieceSpan = document.createElement('span');
                pieceSpan.classList.add('piece', piece.color);
                pieceSpan.textContent = PIECES[piece.color === 'white' ? 'w' : 'b'][piece.type];
                square.appendChild(pieceSpan);
            }

            // Highlight selected
            if (selectedSquare && selectedSquare[0] === r && selectedSquare[1] === c) {
                square.classList.add('selected');
            }

            // Highlight hints
            if (possibleMoves.some(m => m[0] === r && m[1] === c)) {
                square.classList.add(piece ? 'capture-hint' : 'hint');
            }

            square.addEventListener('click', () => handleSquareClick(r, c));
            boardElement.appendChild(square);
        }
    }
    updateStatus();
}

function handleSquareClick(r, c) {
    if (game.isGameOver) return;

    // If promotion is pending, ignore clicks on board (modal is open)
    if (promotionPending) return;

    // If clicking same square, deselect
    if (selectedSquare && selectedSquare[0] === r && selectedSquare[1] === c) {
        deselect();
        return;
    }

    // If a piece is selected, try to move
    if (selectedSquare) {
        const [startR, startC] = selectedSquare;

        // Check if clicked square is a valid move
        if (game.isValidMove(startR, startC, r, c)) {
            // Check for promotion
            const piece = game.getPiece(startR, startC);
            if (piece.type === 'p' && (r === 0 || r === 7)) {
                promotionPending = { start: [startR, startC], end: [r, c] };
                showPromotionModal();
                return;
            }

            game.makeMove(startR, startC, r, c);
            deselect();
            renderBoard();
            return;
        }
    }

    // Select new piece
    const piece = game.getPiece(r, c);
    if (piece && piece.color === game.turn) {
        selectedSquare = [r, c];
        calculatePossibleMoves(r, c);
        renderBoard();
    } else {
        deselect();
        renderBoard();
    }
}

function calculatePossibleMoves(r, c) {
    possibleMoves = [];
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            if (game.isValidMove(r, c, i, j)) {
                possibleMoves.push([i, j]);
            }
        }
    }
}

function deselect() {
    selectedSquare = null;
    possibleMoves = [];
}

function updateStatus() {
    turnText.textContent = game.turn === 'white' ? "White's Turn" : "Black's Turn";
    turnIcon.className = `turn-circle ${game.turn}`;

    if (game.isGameOver) {
        if (game.winner === 'draw') {
            statusMessage.textContent = "Game Over! It's a Draw (Stalemate).";
        } else {
            statusMessage.textContent = `Checkmate! ${game.winner === 'white' ? 'White' : 'Black'} Wins!`;
        }
    } else if (game.isCheck(game.turn)) {
        statusMessage.textContent = "Check!";
    } else {
        statusMessage.textContent = "";
    }
}

// Promotion Handling
function showPromotionModal() {
    promotionModal.classList.remove('hidden');
}

document.querySelectorAll('.promo-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const promoPiece = e.target.dataset.piece;
        if (promotionPending) {
            const { start, end } = promotionPending;
            game.makeMove(start[0], start[1], end[0], end[1], promoPiece);
            promotionPending = null;
            promotionModal.classList.add('hidden');
            deselect();
            renderBoard();
        }
    });
});

resetBtn.addEventListener('click', () => {
    if (confirm('Start a new game?')) {
        game.initializeBoard();
        game.turn = 'white';
        game.isGameOver = false;
        game.winner = null;
        deselect();
        renderBoard();
    }
});

// Initial Render
renderBoard();
