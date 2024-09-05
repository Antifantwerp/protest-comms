import { Notyf } from "notyf";
import { ClientResponseError } from "pocketbase";

let notyf: Notyf;
const UNIDENTIFIED_ERROR_MESSAGE = "Unidentified error! See the logs for more info";

// Having a seperate init function allows this only to be called once in the whole codebase,
// whilst still allowing other files to import and use the success, warning... functions
function init() {
    notyf = new Notyf({
        position: {
            x: "center",
            y: "top"
        },
        duration: 5000,
        dismissible: true,
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

function _unidentifiedError(err) {
    // The Pocketbase errors embed weirdly in console. For full info, log a stringify
    console.log(JSON.stringify(err));
    return UNIDENTIFIED_ERROR_MESSAGE;
}

function reportError(err: Error) {
    let message = "";
    if (err instanceof ClientResponseError) {
        const errData = err.response.data;
        Object.keys(errData).forEach((key) => {
            switch(key) {
                case "passwordConfirm":
                    message = "PIN codes do not match!"
                    break;
                default:
                    message = _unidentifiedError(err);
                    break;
            }
        })
    } else {
        message = _unidentifiedError(err);
    }
    error(message);
}

export {init,success,warning,error,reportError}