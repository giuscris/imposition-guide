import {instructions} from "./instructions.js";
import {chunk} from "./array.js";

function makeBooklet(pages, options) {
    if (!(options.pagesPerSheet in instructions)) {
        throw new Error(`Cannot make a booklet with ${options.pagesPerSheet} pages per sheet: no instructions found. I have instructions only for booklets with ${availablePagesPerSheet} pages.`);
    }

    if (pages % options.pagesPerSheet !== 0) {
        throw new Error(`Cannot make a booklet of ${pages} pages with ${options.pagesPerSheet} pages per sheet. The number of pages is not divisible by the number of pages per sheet.`);
    }

    const booklet = new Array(options.signatures);
    const sheets = pages / options.pagesPerSheet;

    const q = Math.floor(sheets / options.signatures);
    const r = sheets % options.signatures;

    let offset = 0;

    for (let i = 0; i < options.signatures; i++) {
        const p = (i < r ? q + 1 : q) * options.pagesPerSheet;
        booklet[i] = makeSignature(p, options.pagesPerSheet, {offset: offset, foldTogether: options.foldTogether});
        offset += p;
    }

    return booklet;
}

function makeSignature(pages, pagesPerSheet, options) {
    const sheets = pages / pagesPerSheet;

    const signature = new Array(sheets);

    for (let i = 0; i < sheets; i++) {
        signature[i] = new Array(pagesPerSheet);
    }

    const chunkSize = options.foldTogether ? 2 : Math.max(2, pagesPerSheet / 2);

    const order = chunk(instructions[pagesPerSheet].order, chunkSize);

    let p = options.offset;

    for (const [j, ord] of order.entries()) {
        for (let i = 0; i < sheets; i++) {
            // s goes forward when j is even, backwards otherwise
            const s = j % 2 === 0 ? i : sheets - 1 - i;
            for (const o of ord) {
                signature[s][o] = ++p;
            }
        }
    }

    return signature;
}

export {makeBooklet};
