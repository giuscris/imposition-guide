import {instructions} from "./instructions.js";
import {nextMultiple} from "./math.js";
import {makeBooklet} from "./imposition.js";
import {renderBooklet} from "./render.js";

export default function View(container, controls) {
    const availablePagesPerSheet = Object.keys(instructions);

    const inputs = {
        pages: controls.querySelector("#pages"),
        pagesPerSheet: controls.querySelector("#pagesPerSheet"),
        signatures: controls.querySelector("#signatures"),
        lockSignatures: controls.querySelector("#lockSignatures"),
        maxSheets: controls.querySelector("#maxSheets"),
        lockMaxSheets: controls.querySelector("#lockMaxSheets"),
        foldTogether: controls.querySelector("#foldTogether"),
        perfectBinding: controls.querySelector("#perfectBinding"),
        saddleBinding: controls.querySelector("#saddleBinding"),
        mixedBinding: controls.querySelector("#mixedBinding"),
        paperSize: controls.querySelector("#paperSize"),
        maxBindableSheets: controls.querySelector("#maxBindableSheets"),
        maxFoldableLayers: controls.querySelector("#maxFoldableLayers")
    };

    const rangeLabels = {
        pages: controls.querySelector(".range-label[data-for=pages]"),
        pagesPerSheet: controls.querySelector(".range-label[data-for=pagesPerSheet]"),
        signatures: controls.querySelector(".range-label[data-for=signatures]"),
        maxSheets: controls.querySelector(".range-label[data-for=maxSheets]")
    };

    const signaturesLegend = controls.querySelector("#signaturesLegend");

    let prevBindingStyle = null;

    function getBindingStyle() {
        if (inputs.perfectBinding.checked) {
            return "perfect";
        }

        if (inputs.saddleBinding.checked) {
            return "saddle";
        }

        if (inputs.mixedBinding.checked) {
            return "mixed";
        }
    }

    function setBindingStyle(style) {
        inputs.perfectBinding.checked = style === "perfect";
        inputs.saddleBinding.checked = style === "saddle";
        inputs.mixedBinding.checked = style === "mixed";
    }

    function handleControls() {
        // Get `pages` value before it's altered from `min` and `step` properties
        const prevPages = parseInt(inputs.pages.value);

        // Handle `pagesPerSheet` input
        const pagesPerSheetValue = parseInt(availablePagesPerSheet[inputs.pagesPerSheet.value]);
        inputs.pagesPerSheet.max = availablePagesPerSheet.length - 1;
        rangeLabels.pagesPerSheet.innerHTML = pagesPerSheetValue;

        // Handle `pages` input
        inputs.pages.min = pagesPerSheetValue;
        inputs.pages.step = pagesPerSheetValue;
        rangeLabels.pages.innerHTML = inputs.pages.value;

        // Set `pages` value based on `pagesPerSheet`
        if (this === inputs.pagesPerSheet) {
            inputs.pages.value = nextMultiple(pagesPerSheetValue, prevPages);
        }

        // Handle binding style inputs

        // Special case for 2-up imposition: enforce perfect binding but keep previous style
        const is2up = pagesPerSheetValue === 2;
        inputs.saddleBinding.disabled = is2up;
        inputs.mixedBinding.disabled = is2up;

        if (is2up) {
            prevBindingStyle = getBindingStyle();
            setBindingStyle("perfect");
        } else if (prevBindingStyle !== null) {
            setBindingStyle(prevBindingStyle);
            prevBindingStyle = null;
        }

        inputs.foldTogether.disabled = inputs.perfectBinding.checked;

        // Handle `signatures` and `maxSheets` inputs

        // Set maximum for `signatures`
        const sheets = parseInt(inputs.pages.value) / pagesPerSheetValue;
        inputs.signatures.max = sheets;

        // Set maximum for `maxSheets`
        const layers = Math.ceil(pagesPerSheetValue / 4);
        const maxBindableSheets = parseInt(inputs.maxBindableSheets.value);
        let maxSheets = Math.floor(maxBindableSheets / layers);

        // Special case for folding together sheets
        if (inputs.foldTogether.checked) {
            const folds = Math.max(0, Math.ceil(Math.log2(pagesPerSheetValue)) - 1);
            const maxFoldableLayers = parseInt(inputs.maxFoldableLayers.value);
            maxSheets = Math.min(maxSheets, Math.floor(maxFoldableLayers / 2 ** folds));
        }

        inputs.maxSheets.max = maxSheets;

        // Set `signatures` and `maxSheets` depending on binding style
        if (inputs.perfectBinding.checked) {
            inputs.signatures.value = sheets;
            inputs.maxSheets.value = 1;
        }

        if (inputs.saddleBinding.checked) {
            inputs.signatures.value = 1;
            inputs.maxSheets.value = maxSheets;
        }

        if (inputs.mixedBinding.checked
            && this !== undefined  // `this !== undefined` is true when calling function outside `addEventListener()`
            && this !== inputs.signatures && this !== inputs.maxSheets) {
            if (!inputs.lockMaxSheets.checked) {
                inputs.maxSheets.value = Math.ceil(maxSheets / 2);
            }
            if (!inputs.lockSignatures.checked) {
                // This has to come after `maxSheets` is set
                inputs.signatures.value = Math.ceil(sheets / inputs.maxSheets.value);
            }
        }

        // Turn on a warning when `signatures` is below the optimal value
        if (inputs.signatures.value < Math.ceil(sheets / inputs.maxSheets.value)) {
            signaturesLegend.className = "label-warning";
        } else {
            signaturesLegend.className = "";
        }

        rangeLabels.signatures.innerHTML = inputs.signatures.value;
        rangeLabels.maxSheets.innerHTML = inputs.maxSheets.value;

        // Disable `signatures` and `maxSheets` when the binding style is not mixed

        inputs.signatures.disabled = !inputs.mixedBinding.checked;
        inputs.lockSignatures.disabled = !inputs.mixedBinding.checked;

        inputs.maxSheets.disabled = !inputs.mixedBinding.checked;
        inputs.lockMaxSheets.disabled = !inputs.mixedBinding.checked;

        // Finally generate and render booklet

        const booklet = makeBooklet(parseInt(inputs.pages.value), {
            pagesPerSheet: pagesPerSheetValue,
            signatures: parseInt(inputs.signatures.value),
            foldTogether: inputs.foldTogether.checked
        });

        container.innerHTML = renderBooklet(booklet, inputs.paperSize.value);
    }

    for (const key of Object.keys(inputs)) {
        const element = inputs[key];
        element.addEventListener("input", handleControls);
    }

    handleControls();
}
