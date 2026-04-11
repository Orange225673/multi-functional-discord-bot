//======================================================================
//                    CHESS BOARD RENDERER (Canvas Image)
//======================================================================

const { createCanvas, loadImage } = require('@napi-rs/canvas');
const path = require('path');
const fs = require('fs');

const SIZE = 800;
const SQ = SIZE / 8;

// Cache for loaded SVG images
const pieceImages = {};

// Preload all chess piece images
async function preloadPieceImages() {
    const pieces = ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP', 'bK', 'bQ', 'bR', 'bB', 'bN', 'bP'];
    const assetsPath = path.join(__dirname, '../assets/chess-pieces');

    for (const piece of pieces) {
        const svgPath = path.join(assetsPath, `${piece}.svg`);
        try {
            if (fs.existsSync(svgPath)) {
                // Read SVG and convert to data URL for loading
                const svgContent = fs.readFileSync(svgPath, 'utf-8');
                const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
                pieceImages[piece] = await loadImage(dataUrl);
            }
        } catch (err) {
            console.error(`Failed to load ${piece}.svg:`, err.message);
        }
    }
    console.log('✅ Chess piece images loaded');
}

// Map FEN characters to image names
function getPieceImageKey(fenChar) {
    const isWhite = fenChar === fenChar.toUpperCase();
    const color = isWhite ? 'w' : 'b';
    const piece = fenChar.toUpperCase();
    return `${color}${piece}`;
}

// Flip the board (rotate 180 degrees)
async function renderBoard(fen, lastMove, flipped = false) {
    // Ensure images are loaded
    if (Object.keys(pieceImages).length === 0) {
        await preloadPieceImages();
    }

    const canvas = createCanvas(SIZE, SIZE);
    const ctx = canvas.getContext('2d');

    // Draw checkered board
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            const displayY = flipped ? (7 - y) : y;
            const displayX = flipped ? (7 - x) : x;
            ctx.fillStyle = (x + y) % 2 === 0 ? '#f0d9b5' : '#b58863';
            ctx.fillRect(displayX * SQ, displayY * SQ, SQ, SQ);
        }
    }

    // Highlight last move
    if (lastMove) {
        ctx.fillStyle = 'rgba(255, 255, 0, 0.4)';

        // From square
        const fromFile = lastMove.from.charCodeAt(0) - 97;
        const fromRank = 8 - parseInt(lastMove.from[1]);
        const displayFromX = flipped ? (7 - fromFile) : fromFile;
        const displayFromY = flipped ? (7 - fromRank) : fromRank;
        ctx.fillRect(displayFromX * SQ, displayFromY * SQ, SQ, SQ);

        // To square
        const toFile = lastMove.to.charCodeAt(0) - 97;
        const toRank = 8 - parseInt(lastMove.to[1]);
        const displayToX = flipped ? (7 - toFile) : toFile;
        const displayToY = flipped ? (7 - toRank) : toRank;
        ctx.fillRect(displayToX * SQ, displayToY * SQ, SQ, SQ);
    }

    // Draw pieces from FEN
    const rows = fen.split(' ')[0].split('/');
    for (let y = 0; y < 8; y++) {
        let x = 0;
        for (const c of rows[y]) {
            if (isNaN(c)) {
                // Calculate display position based on flip
                const displayY = flipped ? (7 - y) : y;
                const displayX = flipped ? (7 - x) : x;

                // Draw the piece using SVG image
                const pieceKey = getPieceImageKey(c);
                const image = pieceImages[pieceKey];

                if (image) {
                    // Draw image with padding for better appearance
                    const padding = SQ * 0.1;
                    ctx.drawImage(image,
                        displayX * SQ + padding,
                        displayY * SQ + padding,
                        SQ - padding * 2,
                        SQ - padding * 2
                    );
                } else {
                    // Fallback: draw text if image not loaded
                    ctx.fillStyle = c === c.toUpperCase() ? '#ffffff' : '#000000';
                    ctx.font = 'bold 60px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(c, displayX * SQ + SQ / 2, displayY * SQ + SQ / 2);
                }
                x++;
            } else {
                x += Number(c);
            }
        }
    }

    // Add coordinates (adjusted for flip)
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Files (a-h) at bottom
    for (let i = 0; i < 8; i++) {
        const letter = String.fromCharCode(97 + (flipped ? (7 - i) : i));
        ctx.fillText(letter, i * SQ + SQ / 2, SIZE - 15);
    }

    // Ranks (8-1 from top to bottom)
    ctx.textAlign = 'left';
    for (let i = 0; i < 8; i++) {
        const rank = flipped ? (i + 1) : (8 - i);
        ctx.fillText(rank.toString(), 10, i * SQ + 30);
    }

    return canvas.toBuffer('image/png');
}

module.exports = { renderBoard, preloadPieceImages };
