function isEqualObject(object1, object2) {
    if (object1.length !== object2.length) {
        return false;
    }
    for (const key of Object.keys(object1)) {
        if (object1[key] !== object2[key]) {
            return false;
        }
    }
    return true;
}

export {isEqualObject};
