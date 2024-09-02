import * as Etebase from "etebase"
import promptSync from "prompt-sync";
const prompt = promptSync();

/**
 * Etebase is built on top of Django, which has strong password validation rules by default enabled
 * This means that you can only set a PIN as a password in the admin UI if you change the django settings file,
 * which is difficult to do in some deployments (like Docker or Nix)
 * 
 * This script circumvents this, but still requires some manual setup to be done before running.
 * 
 * - Navigate to etebase.example.com/admin
 * - Create two users called "chaperone" and "attendee"
 * - Set their passwords to something you remember
 * - Run `node signup.mjs`
 * - Change the passwords
 * - Done
 * 
 * 
 * 
 * 
 * 
 */


const serverUrl = ""


async function changePassword(username) {
    const pass1 = prompt.hide(`Current ${username} password: `)
    const etebase = await Etebase.Account.login(username, pass1, serverUrl);
    await etebase.changePassword(prompt.hide(`New ${username} password: `))
    await etebase.logout();  // 01235
}


await changePassword("attendee");
await changePassword("chaperone");

