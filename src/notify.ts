import { Notyf } from "notyf";

let notyf: Notyf;

// Having a seperate init function allows this only to be called once in the whole codebase,
// whilst still allowing other files to import and use the success, warning... functions
function init() {
    notyf = new Notyf({
        position: {
            x: "center",
            y: "top"
        },
        types: [
            {
                type: "error",
                ripple: false,
            },
            {
                type: "success",
                ripple: true,
            },
            {
                type: "warning",
                ripple: false,
                background: "yellow"
            }
        ]
    });
}

function success(msg) {
    notyf.success(msg);
}
function warning(msg) {
    notyf.open({
        type: "warning",
        message: msg
    });

}
function error(msg) {
    notyf.error(msg);
}

export {init,success,warning,error}