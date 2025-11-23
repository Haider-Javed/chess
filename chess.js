class ChessGame {
    constructor() {
        this.board = [];
        this.turn = 'white'; // 'white' or 'black'
        this.history = [];
        this.isGameOver = false;
        this.winner = null;
        this.halfMoveClock = 0; // For 50-move rule (simplified)

        // Castling rights
        this.castling = {
            white: { kingSide: true, queenSide: true },
            black: { kingSide: true, queenSide: true }
        };

        this.enPassantTarget = null; // Square coordinate like 'e3' or null

        this.initializeBoard();
    }

    initializeBoard() {
        // 8x8 board. null = empty.
        // Piece object: { type: 'p'|'r'|'n'|'b'|'q'|'k', color: 'w'|'b' }
        const setup = [
            ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
            ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
            ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
        ];

        this.board = setup.map(row => row.map(char => {
            if (!char) return null;
            const color = char === char.toUpperCase() ? 'white' : 'black';
            return { type: char.toLowerCase(), color: color, hasMoved: false };
        }));
    }

    getPiece(row, col) {
        if (row < 0 || row > 7 || col < 0 || col > 7) return null;
        return this.board[row][col];
    }

    // Main method to check if a move is valid
    isValidMove(startRow, startCol, endRow, endCol, checkTurn = true) {
        if (checkTurn && this.isGameOver) return false;

        const piece = this.getPiece(startRow, startCol);
        if (!piece) return false;
        if (checkTurn && piece.color !== this.turn) return false;
        if (startRow === endRow && startCol === endCol) return false;

        const target = this.getPiece(endRow, endCol);
        if (target && target.color === piece.color) return false; // Cannot capture own piece

        // 1. Basic geometry check
        if (!this.validateGeometry(piece, startRow, startCol, endRow, endCol, target)) return false;

        // 2. Check if move puts own king in check
        // Simulate move
        const originalBoard = this.cloneBoard();

        // Handle move simulation
        this.board[endRow][endCol] = piece;
        this.board[startRow][startCol] = null;

        // Handle En Passant capture simulation
        if (piece.type === 'p' && Math.abs(endCol - startCol) === 1 && !target) {
            this.board[startRow][endCol] = null;
        }

        const inCheck = this.isCheck(piece.color);

        // Restore board
        this.board = originalBoard;

        return !inCheck;
    }

    validateGeometry(piece, startRow, startCol, endRow, endCol, target) {
        const dRow = endRow - startRow;
        const dCol = endCol - startCol;

        switch (piece.type) {
            case 'p': return this.validatePawn(startRow, startCol, endRow, endCol, piece.color, target);
            case 'r': return this.validateRook(startRow, startCol, endRow, endCol);
            case 'n': return this.validateKnight(dRow, dCol);
            case 'b': return this.validateBishop(dRow, dCol, startRow, startCol, endRow, endCol);
            case 'q': return this.validateQueen(dRow, dCol, startRow, startCol, endRow, endCol);
            case 'k': return this.validateKing(startRow, startCol, endRow, endCol, piece.color);
        }
        return false;
    }

    validatePawn(r1, c1, r2, c2, color, target) {
        const direction = color === 'white' ? -1 : 1;
        const startRow = color === 'white' ? 6 : 1;
        const dRow = r2 - r1;
        const dCol = c2 - c1;

        // Move forward 1
        if (dCol === 0 && dRow === direction && !target) return true;

        // Move forward 2
        if (dCol === 0 && dRow === 2 * direction && r1 === startRow && !target && !this.getPiece(r1 + direction, c1)) return true;

        // Capture
        if (Math.abs(dCol) === 1 && dRow === direction) {
            if (target) return true;
            // En Passant
            if (this.enPassantTarget) {
                const [epR, epC] = this.enPassantTarget;
                if (epR === r2 && epC === c2) return true;
            }
        }
        return false;
    }

    validateRook(r1, c1, r2, c2) {
        if (r1 !== r2 && c1 !== c2) return false;
        return this.isPathClear(r1, c1, r2, c2);
    }

    validateKnight(dRow, dCol) {
        return (Math.abs(dRow) === 2 && Math.abs(dCol) === 1) || (Math.abs(dRow) === 1 && Math.abs(dCol) === 2);
    }

    validateBishop(dRow, dCol, r1, c1, r2, c2) {
        if (Math.abs(dRow) !== Math.abs(dCol)) return false;
        return this.isPathClear(r1, c1, r2, c2);
    }

    validateQueen(dRow, dCol, r1, c1, r2, c2) {
        if (r1 !== r2 && c1 !== c2 && Math.abs(dRow) !== Math.abs(dCol)) return false;
        return this.isPathClear(r1, c1, r2, c2);
    }

    validateKing(r1, c1, r2, c2, color) {
        const dRow = Math.abs(r2 - r1);
        const dCol = Math.abs(c2 - c1);

        if (dRow <= 1 && dCol <= 1) return true;

        // Castling
        if (dRow === 0 && dCol === 2) {
            if (this.isCheck(color)) return false; // Cannot castle out of check

            const side = c2 > c1 ? 'kingSide' : 'queenSide';
            if (!this.castling[color][side]) return false;

            // Check path clear and not checked
            const row = r1;
            const rookCol = side === 'kingSide' ? 7 : 0;
            const step = side === 'kingSide' ? 1 : -1;

            // Check squares between king and rook
            for (let c = c1 + step; c !== rookCol; c += step) {
                if (this.getPiece(row, c)) return false;
                // King cannot pass through check (simplified: check destination and middle square)
                // We already check destination in isValidMove via simulation, but passing through check needs explicit check here?
                // Actually, isValidMove simulation checks the END state. 
                // Standard chess rules: King cannot pass through a square that is under attack.
                // We need to simulate the king being on the middle square.
                if (Math.abs(c - c1) <= 2) { // Only check the squares the king traverses (1 and 2 steps)
                    if (this.isSquareAttacked(row, c, color === 'white' ? 'black' : 'white')) return false;
                }
            }
            return true;
        }

        return false;
    }

    isPathClear(r1, c1, r2, c2) {
        const dRow = Math.sign(r2 - r1);
        const dCol = Math.sign(c2 - c1);
        let r = r1 + dRow;
        let c = c1 + dCol;

        while (r !== r2 || c !== c2) {
            if (this.getPiece(r, c)) return false;
            r += dRow;
            c += dCol;
        }
        return true;
    }

    makeMove(startRow, startCol, endRow, endCol, promotionPiece = 'q') {
        if (!this.isValidMove(startRow, startCol, endRow, endCol)) return false;

        const piece = this.board[startRow][startCol];
        const target = this.board[endRow][endCol];

        // Update Board
        this.board[endRow][endCol] = piece;
        this.board[startRow][startCol] = null;
        piece.hasMoved = true;

        // Handle Special Moves

        // 1. En Passant Capture
        if (piece.type === 'p' && !target && startCol !== endCol) {
            // Captured pawn is at [startRow][endCol]
            this.board[startRow][endCol] = null;
        }

        // 2. Castling: Move Rook
        if (piece.type === 'k' && Math.abs(endCol - startCol) === 2) {
            const side = endCol > startCol ? 'kingSide' : 'queenSide';
            const rookStartCol = side === 'kingSide' ? 7 : 0;
            const rookEndCol = side === 'kingSide' ? endCol - 1 : endCol + 1;
            const rook = this.board[startRow][rookStartCol];
            this.board[startRow][rookEndCol] = rook;
            this.board[startRow][rookStartCol] = null;
            rook.hasMoved = true;
        }

        // 3. Promotion
        if (piece.type === 'p' && (endRow === 0 || endRow === 7)) {
            piece.type = promotionPiece;
        }

        // Update En Passant Target
        if (piece.type === 'p' && Math.abs(endRow - startRow) === 2) {
            this.enPassantTarget = [startRow + (endRow - startRow) / 2, startCol];
        } else {
            this.enPassantTarget = null;
        }

        // Update Castling Rights (if King or Rook moves)
        if (piece.type === 'k') {
            this.castling[piece.color].kingSide = false;
            this.castling[piece.color].queenSide = false;
        }
        if (piece.type === 'r') {
            if (startCol === 0) this.castling[piece.color].queenSide = false;
            if (startCol === 7) this.castling[piece.color].kingSide = false;
        }

        // Switch Turn
        this.turn = this.turn === 'white' ? 'black' : 'white';

        // Check Game State
        if (this.isCheck(this.turn)) {
            if (this.isCheckmate(this.turn)) {
                this.isGameOver = true;
                this.winner = this.turn === 'white' ? 'black' : 'white';
            }
        } else {
            if (this.isStalemate(this.turn)) {
                this.isGameOver = true;
                this.winner = 'draw';
            }
        }

        return true;
    }

    isSquareAttacked(row, col, attackerColor) {
        // Check if any piece of 'attackerColor' can move to (row, col)
        // We iterate all attacker pieces
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.getPiece(r, c);
                if (piece && piece.color === attackerColor) {
                    // Check if this piece can attack the square
                    // Note: Pawns attack diagonally, not forward
                    if (piece.type === 'p') {
                        const direction = piece.color === 'white' ? -1 : 1;
                        if (r + direction === row && Math.abs(c - col) === 1) return true;
                    } else if (piece.type === 'k') {
                        if (Math.abs(r - row) <= 1 && Math.abs(c - col) <= 1) return true;
                    } else {
                        // For sliding pieces/knights, use validateGeometry
                        // We pass the actual target at (row, col) to validateGeometry.
                        const target = this.getPiece(row, col);
                        if (this.validateGeometry(piece, r, c, row, col, target)) return true;
                    }
                }
            }
        }
        return false;
    }

    isCheck(color) {
        // Find King
        let kingPos = null;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = this.getPiece(r, c);
                if (p && p.type === 'k' && p.color === color) {
                    kingPos = [r, c];
                    break;
                }
            }
        }
        if (!kingPos) return true; // Should not happen unless king captured (bug)

        const opponent = color === 'white' ? 'black' : 'white';
        return this.isSquareAttacked(kingPos[0], kingPos[1], opponent);
    }

    hasLegalMoves(color) {
        for (let r1 = 0; r1 < 8; r1++) {
            for (let c1 = 0; c1 < 8; c1++) {
                const p = this.getPiece(r1, c1);
                if (p && p.color === color) {
                    // Try all possible moves
                    for (let r2 = 0; r2 < 8; r2++) {
                        for (let c2 = 0; c2 < 8; c2++) {
                            if (this.isValidMove(r1, c1, r2, c2)) return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    isCheckmate(color) {
        return this.isCheck(color) && !this.hasLegalMoves(color);
    }

    isStalemate(color) {
        return !this.isCheck(color) && !this.hasLegalMoves(color);
    }

    cloneBoard() {
        return this.board.map(row => row.map(p => p ? { ...p } : null));
    }
}
