// lookup = {key (initial row/col): {1: up/left move
//                                   2: down/right move
//                                   3: delta score
//                                   4: ordering (1 for ordered, 0 otherwise) 
//                                   5: sum of values}
//          }

function Agent(gameState){ 
    const initBitboard  = Agent.prototype.parsedGrid(gameState.grid);
    this.cumProbLimit = 0.1;
    
    this.randoms = new Set()
    randoms.add({val: 1n, p: 0.9});
    randoms.add({val: 2n, p: 0.1});
    
    // Weighted grid, paper at: 
    // http://cs229.stanford.edu/proj2016/report/NieHouAn-AIPlays2048-report.pdf
    this.weights = {0: {0: 15, 1: 8, 2: 7, 3: 0},
                    1: {0: 14, 1: 9, 2: 6, 3: 1},
                    2: {0: 13, 1: 10, 2: 5, 3: 2},
                    3: {0: 12, 1: 11, 2: 4, 3: 3}};
    
    this.graph = new Map();
    this.graph.set(0, {bitboard: initBitboard,
                       move    : null,
                       value   : null,
                       prob    : 1,
                       cumProb : 1,
                       depth   : 0,
                       parent  : null,
                       children: new Set()}
                   );
    
    this.depthLevels = new Map();
    depthLevels.set(0,new Set([0]));
    
    // The main loop
    this.depth = Agent.prototype.depth(initBitboard);
    Agent.prototype.populateGraph(this.depth);
    Agent.prototype.evaluate();
    Agent.prototype.expetimax();
    moveChosen = Agent.prototype.choose();
    Agent.prototype.outputMove(moveChosen);
}; 

// Transform the map grid into a 64-bitboard
Agent.prototype.parsedGrid = function(grid){
    var bitboard = BigInt(0);
    for (column of grid.cells){
        for (cell of column) {
            bitboard  = bitboard << BigInt(4);  // shift for new cell
            bitboard += cell ? BigInt(Math.log2(cell.value)) : BigInt(0);
        };
    };
    return bitboard;
};

Agent.prototype.move = function(bitboard, direction) {
    // 0: up, 1: right, 2: down, 3: left
    if (direction === 0){
        for (i = 0; i < 4; i++){
            oldCol     = this.getCol(bitboard, i);
            bitboard   = this.deleteCol(bitboard, i);
            newCol     = lookup[oldCol][0];
            bitboard  += this.collocateCol(newCol, i);
        };
    } else if (direction === 1){
        bitboard = this.transposed(bitboard)
        for (i = 0; i < 4; i++){
            oldCol     = this.getCol(bitboard, i);
            bitboard   = this.deleteCol(bitboard, i);
            newCol     = lookup[oldCol][1];
            bitboard  += this.collocateCol(newCol, i);
        };
        bitboard = this.transposed(bitboard)
    } else if (direction === 2){
        for (i = 0; i < 4; i++){
            oldCol     = this.getCol(bitboard, i);
            bitboard   = this.deleteCol(bitboard, i);
            newCol     = lookup[oldCol][1];
            bitboard  += this.collocateCol(newCol, i);
        };
    } else if (direction === 3){
        bitboard = this.transposed(bitboard)
        for (i = 0; i < 4; i++){
            oldCol     = this.getCol(bitboard, i);
            bitboard   = this.deleteCol(bitboard, i);
            newCol     = lookup[oldCol][0];
            bitboard  += this.collocateCol(newCol, i);
        };
        bitboard = this.transposed(bitboard);
    };
    return bitboard;
};

// Returns an array with the possible moves
Agent.prototype.possibleMoves = function(bitboard){
    // 0: up, 1: right, 2: down, 3: left
    moves = new Set();
    transBitboard = this.transposed(bitboard);
    for (i = 0; i < 4; i++){
        colVal      = this.getCol(bitboard, i);
        colValTrans = this.getCol(transBitboard, i);
        if (lookup[colVal][0]      != colVal) moves.add(0); 
        if (lookup[colVal][1]      != colVal) moves.add(2);
        if (lookup[colValTrans][0] != colValTrans) moves.add(3);
        if (lookup[colValTrans][1] != colValTrans) moves.add(1);
    };
    return Array.from(moves);
};

// Check whether the botboard is a losing position
Agent.prototype.isOver = function(bitboard){
    // 0: up, 1: right, 2: down, 3: left
    moves = new Set();
    transBitboard = this.transposed(bitboard);
    for (i = 0; i < 4; i++){
        colVal      = this.getCol(bitboard, i);
        colValTrans = this.getCol(transBitboard, i);
        if (lookup[colVal][0]      != colVal || 
            lookup[colVal][1]      != colVal ||
            lookup[colValTrans][0] != colValTrans || 
            lookup[colValTrans][1] != colValTrans){
            return false
        };
    };
    return true
};

// Matrix transposition operation, but for the bitboard
Agent.prototype.transposed = function(bitboard){
    const DIAGONAL_MASK = 17293839061792849935n;
    transposed = bitboard & DIAGONAL_MASK;
    for (c = 1; c < 4; c++){
        for (r = 0; r < c; r++){
            cell        = this.getCell(bitboard, c, r);
            cellSym     = this.getCell(bitboard, r, c);
            transposed += this.collocateCell(cell, r, c);
            transposed += this.collocateCell(cellSym, c, r);
        };
    };
    return transposed;
};

// Gets the log2 of the cell value
Agent.prototype.getCell = function(bitboard, col, row){
    const CELL_MASK = BigInt(15) << BigInt(4*(15 - (4*col + row)));
    return (bitboard & CELL_MASK) >> BigInt(4*(15 - (4*col + row)));
};

// Gets the column as decimal Big Int
Agent.prototype.getCol = function(bitboard, index){
    const ONES_COL_MASK = 65535n << BigInt(16*(3-index));
    return (bitboard & ONES_COL_MASK) >> BigInt(16*(3-index));
};

// Replace the bits in the column spot of the bitboard with zeros
Agent.prototype.deleteCol = function(bitboard, index){
    const ZEROS_COL_MASK = ~(65535n << BigInt(16*(3-index)));
    return bitboard & ZEROS_COL_MASK;
};

// Pushes the cell 4-bits left, depending on its position in the grid
Agent.prototype.collocateCell = function(cell_val, col, row){
    return cell_val << BigInt(4*(15 - (4*col + row)));
};

// Pushes the column 4-bits left, depending on its position in the grid
Agent.prototype.collocateCol = function(col, index){
    return col << BigInt(16*(3-index));
};

// The coordinates of the empty cells in the board.
Agent.prototype.getZeros = function(bitboard){
    var zeros = [];
    for (c = 0; c < 4; c++){
        for (r = 0; r < 4; r++){
            cellVal = this.getCell(bitboard, c, r);
            if (cellVal === 0n) zeros.push([c,r]);
        };
    };
    return zeros; 
};

// The number of empty cells in the board.
Agent.prototype.getNZeros = function(bitboard){
    var nZeros = 0;
    for (c = 0; c < 4; c++){
        for (r = 0; r < 4; r++){
            cellVal = this.getCell(bitboard, c, r);
            if (cellVal === 0n) nZeros += 1;
        }; 
    };
    return nZeros;
};

// Depth is odd: leaf nodes are moves 
// Depth is even: leaf nodes are spawns
Agent.prototype.depth = function(bitboard){
    depth = Math.floor((109 - 5*this.getNZeros(bitboard)) / 13)
    for (d = 1; d <= depth; d++) depthLevels.set(d, new Set())
    return depth
}

// Generates all the possible moves for the parent node.
Agent.prototype.addMoveNodes = function(parentId){
    parent = graph.get(parentId);
    possibleMoves = this.possibleMoves(parent.bitboard);
    for (move of possibleMoves){
        childId        = graph.size
        child          = {};
        child.bitboard = this.move(parent.bitboard, move)
        child.move     = move;
        child.value    = -1;
        child.prob     = 1;
        child.cumProb  = parent.cumProb * child.prob 
        child.depth    = parent.depth + 1
        child.parent   = parentId;
        child.children = new Set();
        parent.children.add(childId);
        graph.set(childId, child); 
        
        depthLevels.get(child.depth).add(childId)
    };
};

// Generates all the possible random spawns (2 or 4) 
// for the parent node.
Agent.prototype.addSpawnNodes = function(parentId){
    parent = graph.get(parentId);
    emptyCells = this.getZeros(parent.bitboard);
    for (cell of emptyCells){
        for (e of randoms){
            childId         = graph.size;
            child           = {};
            child.bitboard  = parent.bitboard;
            child.bitboard += this.collocateCell(e.val, cell[0], cell[1]); 
            child.move      = null;
            child.value     = -1;
            child.prob      = e.p;
            child.cumProb   = parent.cumProb * child.prob 
            child.depth     = parent.depth + 1;
            child.parent    = parentId;
            child.children  = new Set();
            parent.children.add(childId);
            graph.set(childId, child);
            
            depthLevels.get(child.depth).add(childId)
        };
    };
};

// Evaluate the leaf nodes. If there are no moves 
// allowed (losing position), the value is -1.
Agent.prototype.evaluate = function(){
    for (nodeId of depthLevels.get(depth)){
        node = graph.get(nodeId)
        if (!this.isOver(node.bitboard)){
            node.value = this.heuristics(node.bitboard)
        }
    };
}; 

Agent.prototype.heuristics = function(bitboard){
    var score    = 0;
    for (col = 0; col < 4; col++){
        for (row = 0; row < 4; row++){
            cellVal = Number(this.getCell(bitboard, col, row))
            score += 2**cellVal * weights[col][row];
        };
    };
    return score;
}; 

// Generates the entire graph.
Agent.prototype.populateGraph = function(depth){
    moveNodes = true;
    for (d = 0; d < depth; d++){
        for (const id of depthLevels.get(d)){
            node = graph.get(id)
            if (node.cumProb < cumProbLimit || this.isOver(node.bitboard)){
                depthLevels.get(depth).add(id);
            } else {
                moveNodes ? this.addMoveNodes(id) : this.addSpawnNodes(id);
            };
        };
        moveNodes = !moveNodes 
    };
}; 

// Given a spawn node, it calculates the value from its move children nodes
Agent.prototype.fromMoveNodes = function(d){
    for (nodeId of depthLevels.get(d)){
        parent = graph.get(nodeId)
        for (childId of parent.children){
            child = graph.get(childId)
            if (child.value > parent.value) parent.value = child.value
        }
    }
}

// Given a move node, it calculates the value from its spawn children nodes 
Agent.prototype.fromSpawnNodes = function(d){
    for (nodeId of depthLevels.get(d)){ 
        parent = graph.get(nodeId)
        for (childId of parent.children){
            child = graph.get(childId)
            parent.value += child.prob * child.value
        }
    }
}

// Expectimax algorithm
Agent.prototype.expetimax = function(){
    for (d = depth - 1; d > 0; d--){
        d % 2 === 0 ? this.fromMoveNodes(d) : this.fromSpawnNodes(d)
    }
}

// Chooses the best possible final move
Agent.prototype.choose = function(){
    const root = graph.get(0)
    var move = null
    var max = Number.NEGATIVE_INFINITY
    for (nodeId of root.children){
        child = graph.get(nodeId)
        if (child.value > max) {
            move = child.move;
            max = child.value;
        }
    }
    return move;
}

// Executes the move
Agent.prototype.outputMove = function(direction){
    this.gameManager = new GameManager(4, KeyboardInputManager, HTMLActuator, LocalStorageManager)
    this.gameManager.move(direction)
};

// Just for debugging 
Agent.prototype.printBitboard = function(bitboard){
    var board = Array(4);
    for (r = 0; r < 4; r++){
        board[r] = Array(4);
        for (c = 0; c < 4; c++){
            cellVal = Number(this.getCell(bitboard, c, r));
            board[r][c] = cellVal > 0 ? 2**cellVal : 0;
        };
    };
    console.log(board);
};
