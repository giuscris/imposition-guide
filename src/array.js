function chunk(array, size) {
    const length = Math.floor(array.length / size);
    const result = new Array(length);
    for (let i = 0; i < length; i++) {
        const offset = i * size;
        result[i] = array.slice(offset, offset + size);
    }
    return result;
}

export {chunk};
