import {instructions} from "./instructions.js";
import {nextMultiple} from "./math.js";
import {makeBooklet} from "./imposition.js";
import {renderBooklet} from "./render.js";
import {isEqualObject} from "./object.js";

export default function View(container, controls) {
    const inputs = controls.elements;

    const rangeLabels = {
        pages: controls.querySelector("output[for=pages]"),
        signatures: controls.querySelector("output[for=signatures]"),
        maxSheets: controls.querySelector("output[for=maxSheets]")
    };

    const optionsDetails = controls.querySelector('#options');

    const signaturesLegend = controls.querySelector("#signaturesLegend");

    function getStatus() {
        return {
            pages: inputs.pages.value,
            pagesPerSheet: inputs.pagesPerSheet.value,
            optionsOpen: optionsDetails.open,
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
            if (inputs.hasOwnProperty(key)) {
                const input = inputs[key];
                if (input.type === "checkbox" || input.type === "radio") {
                    input.checked = value === "true";
                } else {
                    input.value = value;
                }
            }

            if (key === "optionsOpen") {
                optionsDetails.open = value === "true";
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

    function updateHash() {
        if (!isEqualObject(getStatus(), defaultStatus)) {
            setStatusToHash();
        } else {
            window.location.hash = "";
        }
    }

    const defaultStatus = getStatus();

    let prevBindingStyle = null;

    function handleControls() {
        // Get `pages` value before it's altered from `min` and `step` properties
        const prevPages = parseInt(inputs.pages.value);

        // Handle `pages` input
        inputs.pages.min = inputs.pagesPerSheet.value;
        inputs.pages.step = inputs.pagesPerSheet.value;

        // Set `pages` value based on `pagesPerSheet`
        if (this === inputs.pagesPerSheet) {
            inputs.pages.value = nextMultiple(parseInt(inputs.pagesPerSheet.value), prevPages);
        }

        rangeLabels.pages.innerHTML = inputs.pages.value;

        // Handle binding style inputs

        // Special case for 2-up imposition: enforce perfect binding but keep previous style
        const is2up = inputs.pagesPerSheet.value === 2;

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
        const sheets = parseInt(inputs.pages.value) / inputs.pagesPerSheet.value;
        inputs.signatures.max = sheets;

        // Set maximum for `maxSheets`
        const maxSheets = Math.min(
            Math.floor(inputs.maxBindableSheets.value / Math.ceil(inputs.pagesPerSheet.value / 4)),
            inputs.foldTogether.checked ? Math.floor(inputs.maxFoldableLayers.value / Math.ceil(inputs.pagesPerSheet.value / 2)) : Infinity
        );

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

        const booklet = makeBooklet({
            pages: parseInt(inputs.pages.value),
            pagesPerSheet: inputs.pagesPerSheet.value,
            instructions: instructions[inputs.pagesPerSheet.value],
            signatures: parseInt(inputs.signatures.value),
            foldTogether: inputs.foldTogether.checked
        });

        container.innerHTML = renderBooklet(booklet, inputs.paperSize.value);

        // Update location hash
        updateHash();
    }

    for (const input of inputs) {
        const tagName = input.tagName.toLowerCase();
        // Skip elements like `<output>` and `<fieldset>`
        if (tagName === "input" || tagName === "select") {
            input.addEventListener("input", handleControls);
        }
    }

    optionsDetails.addEventListener("toggle", updateHash);

    setStatus(getStatusFromHash());

    handleControls();
}
