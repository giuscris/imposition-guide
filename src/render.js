import {instructions} from "./instructions.js";

function renderBooklet(booklet, paperSize) {
    const formatFigures = (num) => String(num).replace(/([69]+)/g, "<u>$1</u>");

    let html = "";

    for (const [i, signature] of booklet.entries()) {
        html += `<div class="signature"><div class="signature-number">Signature ${i + 1}</div>`;

        for (const sheet of signature) {
            const [rows, cols] = instructions[sheet.length].layout;
            html += '<span class="sheet">';

            for (let i = 0; i < 2; i++) {
                const offset = i * (rows * cols);
                const orientation = cols > rows ? "h" : "v";
                html += `<table class="leaf size-${paperSize} orientation-${orientation}">`;

                for (let r = 0; r < rows; r++) {
                    const className = r % 2 === rows % 2 ? "leaf-down" : "leaf-up";
                    html += `<tr class="${className}">`;

                    for (let c = 0; c < cols; c++) {
                        const number = formatFigures(sheet[c + r * cols + offset]);
                        html += `<td>${number}</td>`;
                    }
                    html += "</tr>";
                }

                html += "</table>";
            }

            html += "</span>";
        }

        html += "</div>";
    }

    return html;
}

export {renderBooklet};
