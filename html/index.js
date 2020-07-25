/**
 * @author jiangklijna
 */

// init
(function (W) {
    W.DataType = {
        Err: 0,
        Data: 1,
        Resize: 2,
    };
    W.FitAddon = FitAddon.FitAddon;
    W.WebglAddon = WebglAddon.WebglAddon;
    W.WebLinksAddon = WebLinksAddon.WebLinksAddon;

    W.NewWebSocket = function (path) {
        return new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + "/cmd/" + path);
    };
    W.NewTerminal = function () {
        return new Terminal({ useStyle: true, screenKeys: true });
    };
    W.GetByAjax = function (url, callback) {
        var ajax = new XMLHttpRequest();
        ajax.open("GET", url);
        ajax.onreadystatechange = function () {
            if (ajax.readyState == 4 && ajax.status == 200) {
                callback(JSON.parse(ajax.responseText), ajax);
            }
        }
        ajax.send();
    }
})(window);

// web-shell login:
// Password:
// Login incorrect

// web-shell component
window.WebShell = function (dom) {
    var conn = null;
    var term = NewTerminal();
    var fitAddon = new FitAddon();
    var webglAddon = new WebglAddon();
    var webLinksAddon = new WebLinksAddon();

    var sendData = function (dataType, data) {
        if (conn != null)
            conn.send(JSON.stringify({ 't': dataType, "d": data }));
    };

    var onLoginSuccess = function (path) {
        conn = NewWebSocket(path);
        // websocket connect
        conn.onclose = function (e) {
            term.writeln("connection closed.");
        };

        conn.onopen = function () {
            fitAddon.fit();
        };

        conn.onmessage = function (msg) {
            term.write(msg.data);
        };

        term.onResize(function (data) {
            sendData(DataType.Resize, [data.cols, data.rows]);
        });
        term.onData(function (data) {
            sendData(DataType.Data, data);
        });
    };



    // terminal term
    term.onTitleChange(function (title) {
        document.title = title;
    });

    // term.on('paste', function (data) {
    //     term.write(data);
    //     // this.copy = term.getSelection();
    // });


    term.open(dom);

    // webshell login module
    (function () {
        var isInput = true;
        var tag = 1;
        var secret = "";
        var username = "";
        var password = "";

        (function () {
            isInput = false;
            var token = ('web-shell-token' in sessionStorage) ? sessionStorage.getItem("web-shell-token") : '';
            GetByAjax("/login?token=" + token, function (data) {
                if (data.code == 0) {
                    isInput = false;
                    onLoginSuccess(data.path);
                } else {
                    secret = data.secret;
                    isInput = true;
                    term.write("Web Shell login:");
                }
            });
        })();

        var doLogin = function () {
            isInput = false;
            var token = md5(secret + md5(username + secret + password) + secret);
            GetByAjax("/login?token=" + token, function (data) {
                tag = 1;
                username = "";
                password = "";
                if (data.code == 0) {
                    isInput = false;
                    sessionStorage.setItem("web-shell-token", token);
                    onLoginSuccess(data.path);
                } else {
                    isInput = true;
                    term.writeln(data.msg);
                    term.write("\nWeb Shell login:");
                }
            });
        }

        term.onData(function (data) {
            if (!isInput) return;
            if (data.charCodeAt(0) == 13) {
                term.writeln("");
                if (tag == 1) {
                    tag++;
                    term.write("Password:");
                } else {
                    doLogin();
                }
            } else {
                if (tag == 1) {
                    term.write(data);
                    username += data;
                } else {
                    password += data;
                }
            }
        });
    })();



    term.loadAddon(fitAddon);
    term.loadAddon(webglAddon);
    term.loadAddon(webLinksAddon);

    this.fit = function () {
        fitAddon.fit();
    };
    this.term = term;
    this.conn = conn;

    dom.oncontextmenu = function () {
        if (term.hasSelection()) {
            sendData(DataType.Data, term.getSelection());
            // term.write(term.getSelection());
            return false;
        }
        return true;
    }
};

// run
window.onload = function () {
    var dom = document.createElement("div");
    dom.className = "console";
    document.body.appendChild(dom);
    this.singleWebShell = new WebShell(dom);
    this.onresize = function () {
        this.singleWebShell.fit();
    }
    this.onresize();
};
