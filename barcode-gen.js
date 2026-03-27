/**
 * Extremely Lightweight Code 39 SVG Barcode Generator
 * Works 100% offline. No dependencies.
 */
window.BarcodeGen = {
    // Code 39 character patterns (narrow=1, wide=2, space=0)
    patterns: {
        '0': '101001101101', '1': '110100101011', '2': '101100101011', '3': '110110010101',
        '4': '101001101011', '5': '110100110101', '6': '101100110101', '7': '101001011011',
        '8': '110100101101', '9': '101100101101', 'A': '110101001011', 'B': '101101001011',
        'C': '110110100101', 'D': '101011001011', 'E': '110101100101', 'F': '101101100101',
        'G': '101010011011', 'H': '110101001101', 'I': '101101001101', 'J': '101011001101',
        'K': '110101010011', 'L': '101101010011', 'M': '110110101001', 'N': '101011010011',
        'O': '110101101001', 'P': '101101101001', 'Q': '101010110011', 'R': '110101011001',
        'S': '101101011001', 'T': '101011011001', 'U': '110010101011', 'V': '100110101011',
        'W': '110011010101', 'X': '100101101011', 'Y': '110010110101', 'Z': '100110110101',
        '-': '100101011011', '.': '110010101101', ' ': '100110101101', '*': '100101101101',
        '$': '100100100101', '/': '100100101001', '+': '100101001001', '%': '101001001001'
    },

    /**
     * Renders a Code 39 barcode as an SVG string.
     * @param {string} text - The text to encode (e.g. "ORD-123456")
     * @param {object} options - Options: height, width (bar width)
     */
    generateSVG: function(text, options = {}) {
        const height = options.height || 50;
        const barWidth = options.width || 2.5; // Thicker bars for maximum thermal/camera compatibility
        const quietZone = options.quietZone || 25; // Even wider quiet zone for better isolation
        const data = "*" + text.toUpperCase() + "*";
        
        let binary = "";
        for (let i = 0; i < data.length; i++) {
            const char = data[i];
            const pattern = this.patterns[char];
            if (!pattern) continue;
            binary += pattern + "0"; // Inter-character gap
        }

        const totalUnits = binary.length + (quietZone * 2);
        let svg = `<svg width="${totalUnits * barWidth}" height="${height}" viewBox="0 0 ${totalUnits} ${height}" xmlns="http://www.w3.org/2000/svg">`;
        
        // Background (White - critical for many scanners)
        svg += `<rect width="${totalUnits}" height="${height}" fill="white"/>`;
        
        // Bars
        for (let i = 0; i < binary.length; i++) {
            if (binary[i] === "1") {
                svg += `<rect x="${i + quietZone}" y="2" width="1" height="${height - 4}" fill="black"/>`;
            }
        }
        svg += `</svg>`;
        return svg;
    }
};

