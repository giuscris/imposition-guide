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

    let frozenBindingStyle = null;

    function setBindingStyle(style) {
        inputs.perfectBinding.checked = style === 'perfect';
        inputs.saddleBinding.checked = style === 'saddle';
        inputs.mixedBinding.checked = style === 'mixed';
    }

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

    function handleControls() {
        const maxBindableSheets = parseInt(inputs.maxBindableSheets.value);
        const maxFoldableLayers = parseInt(inputs.maxFoldableLayers.value);

        const pagesPerSheetValue = parseInt(availablePagesPerSheet[inputs.pagesPerSheet.value]);

        inputs.pagesPerSheet.max = availablePagesPerSheet.length - 1;

        if (this === inputs.pagesPerSheet) {
            // It's important to get the value before it's altered
            const prevPages = parseInt(inputs.pages.value);

            inputs.pages.min = pagesPerSheetValue;
            inputs.pages.step = pagesPerSheetValue;
            inputs.pages.value = nextMultiple(pagesPerSheetValue, prevPages);

            if (pagesPerSheetValue === 2) {
                frozenBindingStyle = getBindingStyle();
                setBindingStyle("perfect");
                inputs.saddleBinding.disabled = true;
                inputs.mixedBinding.disabled = true;
            } else {
                if (frozenBindingStyle !== null) {
                    setBindingStyle(frozenBindingStyle);
                    frozenBindingStyle = null;
                }
                inputs.saddleBinding.disabled = false;
                inputs.mixedBinding.disabled = false;
            }
        }

        const sheets = parseInt(inputs.pages.value) / pagesPerSheetValue;

        const layers = Math.ceil(pagesPerSheetValue / 4);
        let maxSheets = Math.floor(maxBindableSheets / layers);

        if (inputs.foldTogether.checked) {
            const folds = Math.max(0, Math.ceil(Math.log2(pagesPerSheetValue)) - 1);
            maxSheets = Math.min(maxSheets, Math.floor(maxFoldableLayers / 2 ** folds));
        }

        inputs.signatures.max = sheets;

        inputs.maxSheets.max = maxSheets;

        if (this !== inputs.maxSheets && this !== inputs.signatures) {
            if (inputs.perfectBinding.checked) {
                inputs.maxSheets.value = 1;
                inputs.signatures.value = sheets;
                inputs.maxSheets.disabled = true;
                inputs.signatures.disabled = true;
                inputs.lockSignatures.disabled = true;
                inputs.lockMaxSheets.disabled = true;
                inputs.foldTogether.disabled = true;
            }

            if (inputs.saddleBinding.checked) {
                inputs.maxSheets.value = maxSheets;
                inputs.signatures.value = 1;
                inputs.maxSheets.disabled = true;
                inputs.signatures.disabled = true;
                inputs.lockSignatures.disabled = true;
                inputs.lockMaxSheets.disabled = true;
                inputs.foldTogether.disabled = false;
            }

            if (inputs.mixedBinding.checked) {
                if (!inputs.lockMaxSheets.checked) {
                    inputs.maxSheets.value = Math.ceil(maxSheets / 2);
                }
                if (!inputs.lockSignatures.checked) {
                    inputs.signatures.value = Math.ceil(sheets / inputs.maxSheets.value);
                }
                inputs.maxSheets.disabled = false;
                inputs.signatures.disabled = false;
                inputs.lockSignatures.disabled = false;
                inputs.lockMaxSheets.disabled = false;
                inputs.foldTogether.disabled = false;
            }
        }

        if (inputs.signatures.value < Math.ceil(sheets / inputs.maxSheets.value)) {
            signaturesLegend.className = "label-warning";
        } else {
            signaturesLegend.className = "";
        }

        rangeLabels.pages.innerHTML = inputs.pages.value;
        rangeLabels.pagesPerSheet.innerHTML = pagesPerSheetValue;
        rangeLabels.signatures.innerHTML = inputs.signatures.value;
        rangeLabels.maxSheets.innerHTML = inputs.maxSheets.value;

        const booklet = makeBooklet(parseInt(inputs.pages.value), {
            pagesPerSheet: pagesPerSheetValue,
            signatures: parseInt(inputs.signatures.value),
            foldTogether: inputs.foldTogether.checked
        });

        container.innerHTML = renderBooklet(booklet, inputs.paperSize.value);
    }

    Object.keys(inputs).forEach(function (key) {
        const element = inputs[key];
        element.addEventListener("input", handleControls);
    });

    handleControls();
}
