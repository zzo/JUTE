module.exports = {
    mySum: function() {
        var result = 0, i = 0;
        if (typeof arguments[0] == 'object' && arguments[0].length) {
            for (;i < arguments[0].length; i++) {
                result += arguments[0][i];
            }
        } else {
            for (;i < arguments.length; i++) {
                result += arguments[i];
            }
        }
        return result;
    }
};
