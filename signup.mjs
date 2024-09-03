import PocketBase from "pocketbase"
import promptSync from "prompt-sync";
import { readFileSync } from "fs";

// TODO implement into maintainer

const prompt = promptSync();

const config = JSON.parse(readFileSync("config.json", {encoding: "utf-8"}))


const pb = new PocketBase(config.url);

await pb.admins.authWithPassword(prompt("Admin email: "), prompt.hide("Admin password: "))
const users = await pb.collection("users").getFullList();

// 




// Create users
async function createUser(name) {
    if (users.find(user => user.username == name)) {
        console.log(`${name} already exists!`)
    } else {
        await pb.collection("users").create({
            username: name,
            password: prompt.hide(`${name} pass: `),
            passwordConfirm: prompt.hide(`${name} pass (confirm): `)
        }, {requestKey: null});
    }

}
createUser("chaperone");
createUser("attendee");

// TODO also update

/*

})*/

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
 */


