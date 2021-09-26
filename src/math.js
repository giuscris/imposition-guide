function prevMultiple(num, max) {
    return num * Math.floor(max / num);
}

function nextMultiple(num, min) {
    return num * Math.ceil(min / num);
}

export {prevMultiple, nextMultiple};
