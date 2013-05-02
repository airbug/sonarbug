//-------------------------------------------------------------------------------
// Requires
//-------------------------------------------------------------------------------

//@Package('splitbug')

//@Export('Cookies')

//@Require('TypeUtil')


//-------------------------------------------------------------------------------
// Common Modules
//-------------------------------------------------------------------------------

var bugpack     = require('bugpack').context();


//-------------------------------------------------------------------------------
// Common Modules
//-------------------------------------------------------------------------------

var TypeUtil = bugpack.require('TypeUtil');


//-------------------------------------------------------------------------------
// Declare Class
//-------------------------------------------------------------------------------

var Cookies = {

    //-------------------------------------------------------------------------------
    // Static Methods
    //-------------------------------------------------------------------------------

    /**
     * @static
     * @param {string} key
     * @return {*}
     */
    getCookie: function (key) {
        var value = null;
        if (key && Cookies.hasCookie(key)) {
            value = decodeURIComponent(
                document.cookie.replace(new RegExp("(?:^|.*;\\s*)" +
                    encodeURIComponent(key).replace(/[\-\.\+\*]/g, "\\$&") +
                    "\\s*\\=\\s*((?:[^;](?!;))*[^;]?).*"), "$1")
            );
        }
        return value;
    },

    /**
     * @static
     * @param {string} key
     * @param {*} value
     * @param {?(string|number|Date)} end
     * @param {?string} path
     * @param {?string} domain
     * @param {?boolean} secure
     */
    setCookie: function (key, value, end, path, domain, secure) {
        if (key && !(/^(?:expires|max\-age|path|domain|secure)$/i.test(key))) {
            var expires = "";
            if (end) {
                if (TypeUtil.isNumber(end)) {
                    expires = end === Infinity ? "; expires=Tue, 19 Jan 2038 03:14:07 GMT" : "; max-age=" + end;
                } else if (TypeUtil.isString(end)) {
                    expires = "; expires=" + end;
                } else if (end instanceof Date) {
                    expires = "; expires=" + end.toGMTString();
                }
            }
            document.cookie = encodeURIComponent(key) + "=" + encodeURIComponent(value) +
                expires +
                (domain ? "; domain=" + domain : "") +
                (path ? "; path=" + path : "") +
                (secure ? "; secure" : "");
        }
    },

    /**
     * @static
     * @param {string} key
     * @param {string} path
     */
    removeCookie: function (key, path) {
        if (key && Cookies.hasCookie(key)) {
            document.cookie = encodeURIComponent(key) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT" +
                (path ? "; path=" + path : "");
        }
    },

    /**
     * @static
     * @param {string} key
     * @return {boolean}
     */
    hasCookie: function (key) {
        return (new RegExp("(?:^|;\\s*)" +
            encodeURIComponent(key).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(document.cookie);
    },

    /**
     * @static
     * @return {Array}
     */
    keys: function () {
        var keys = document.cookie.replace(/((?:^|\s*;)[^\=]+)(?=;|$)|^\s*|\s*(?:\=[^;]*)?(?:\1|$)/g, "").split(/\s*(?:\=[^;]*)?;\s*/);
        for (var nIdx = 0; nIdx < keys.length; nIdx++) {
            keys[nIdx] = decodeURIComponent(keys[nIdx]);
        }
        return keys;
    }
};


//-------------------------------------------------------------------------------
// Export
//-------------------------------------------------------------------------------

bugpack.export('splitbug.Cookies', Cookies);
