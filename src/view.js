import {instructions} from "./instructions.js";
import {nextMultiple} from "./math.js";
import {makeBooklet} from "./imposition.js";
import {renderBooklet} from "./render.js";
import {isEqualObject} from "./object.js";

export default function View(container, controls) {
    const availablePagesPerSheet = Object.keys(instructions);

    const inputs = controls.elements;

    const rangeLabels = {
        pages: controls.querySelector("output[for=pages]"),
        pagesPerSheet: controls.querySelector("output[for=pagesPerSheet]"),
        signatures: controls.querySelector("output[for=signatures]"),
        maxSheets: controls.querySelector("output[for=maxSheets]")
    };

    const signaturesLegend = controls.querySelector("#signaturesLegend");

    function getStatus() {
        return {
            pages: inputs.pages.value,
            pagesPerSheet: availablePagesPerSheet[inputs.pagesPerSheet.value],
            signatures: inputs.signatures.value,
            lockSignatures: inputs.lockSignatures.checked,
            maxSheets: inputs.maxSheets.value,
            lockMaxSheets: inputs.lockMaxSheets.checked,
            bindingStyle: inputs.bindingStyle.value,
            foldTogether: inputs.foldTogether.checked,
            paperSize: inputs.paperSize.value,
            maxBindableSheets: inputs.maxBindableSheets.value,
            maxFoldableLayers: inputs.maxFoldableLayers.value
        };
    }

    function setStatus(status) {
        for (const [key, value] of Object.entries(status)) {
            switch (key) {
                case "pagesPerSheet":
                    inputs.pagesPerSheet.value = availablePagesPerSheet.indexOf(value);
                    break;
                default:
                    if (inputs.hasOwnProperty(key)) {
                        const input = inputs[key];
                        if (input.type === "checkbox" || input.type === "radio") {
                            input.checked = value === "true";
                        } else {
                            input.value = value;
                        }
                    }
            }
        }
    }

    function getStatusFromHash() {
        if (!window.location.hash || !("URLSearchParams" in window)) {
            return {};
        }
        const params = new URLSearchParams(window.location.hash.substring(1));
        return Object.fromEntries(params);
    }

    function setStatusToHash() {
        if (!("URLSearchParams" in window)) {
            return;
        }
        const params = new URLSearchParams(getStatus());
        window.location.hash = params.toString();
    }

    const defaultStatus = getStatus();

    let prevBindingStyle = null;

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

        // Disable all `bindingStyle` radio buttons except perfect binding depending on 2-up imposition
        for (const option of inputs.bindingStyle) {
            if (option.value !== "perfectBinding") {
                option.disabled = is2up;
            }
        }

        if (is2up) {
            prevBindingStyle = controls.bindingStyle.value;
            controls.bindingStyle.value = "perfectBinding";
        } else if (prevBindingStyle !== null) {
            controls.bindingStyle.value = prevBindingStyle;
            prevBindingStyle = null;
        }

        inputs.foldTogether.disabled = inputs.bindingStyle.value === "perfectBinding";

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
        switch (inputs.bindingStyle.value) {
            case "perfectBinding":
                inputs.signatures.value = sheets;
                inputs.maxSheets.value = 1;
                break;

            case "saddleBinding":
                inputs.signatures.value = 1;
                inputs.maxSheets.value = maxSheets;
                break;

            case "mixedBinding":
                if (this !== undefined  // `this !== undefined` is true when calling function outside `addEventListener()`
                    && this !== inputs.signatures && this !== inputs.maxSheets) {
                    if (!inputs.lockMaxSheets.checked) {
                        inputs.maxSheets.value = Math.ceil(maxSheets / 2);
                    }
                    if (!inputs.lockSignatures.checked) {
                        // This has to come after `maxSheets` is set
                        inputs.signatures.value = Math.ceil(sheets / inputs.maxSheets.value);
                    }
                }
                break;
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

        inputs.signatures.disabled = inputs.bindingStyle.value !== "mixedBinding";
        inputs.lockSignatures.disabled = inputs.bindingStyle.value !== "mixedBinding";

        inputs.maxSheets.disabled = inputs.bindingStyle.value !== "mixedBinding";
        inputs.lockMaxSheets.disabled = inputs.bindingStyle.value !== "mixedBinding";

        // Finally generate and render booklet

        const booklet = makeBooklet(parseInt(inputs.pages.value), {
            pagesPerSheet: pagesPerSheetValue,
            signatures: parseInt(inputs.signatures.value),
            foldTogether: inputs.foldTogether.checked
        });

        container.innerHTML = renderBooklet(booklet, inputs.paperSize.value);

        // Update location hash
        if (!isEqualObject(getStatus(), defaultStatus)) {
            setStatusToHash();
        } else {
            window.location.hash = "";
        }
    }

    for (const input of inputs) {
        input.addEventListener("input", handleControls);
    }

    setStatus(getStatusFromHash());

    handleControls();
}
