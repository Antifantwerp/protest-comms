# Protest Comms

- Create an (optionally public) page with all **slogans** for the protest, highlighting whichever is **currently being chanted**
- Allow protest chaperones to communicate need for **waiting**, **medical intervention** or **support against police brutality**

## Privacy/security note
Note that this is primarily designed for legal protests. If you're at an illegal one, you probably do not want to have your phone on you, nor do you want a protest website in your search history. This site's [base design decisions](#base-design-decisions) are geared towards keeping everything somewhat private, but keep in mind that some things (like Google search history keeping or a non-VPN-protected connection showing which websites you visit to your ISP) that are inherent with any website. It should also be noted that - until further notice - the data is stored unencrypted in Pocketbase.

## How-To
### Run/build website locally
This requires [git](https://git-scm.com/), [Node.js](https://nodejs.org/), and [Yarn](https://yarnpkg.com/getting-started/install) to be installed. Ideally, you have an Pocketbase server as well.

```bash
# Get a local copy of the repository
git clone https://github.com/Antifantwerp/protest-comms
cd protest-comms

# Install dependencies
yarn install

# Create url.js file in repo source. See url.js.example
# nano url.js

# Run parcel live server
yarn start

# Build static website to dist/
yarn build 
```

## Explanation
### Permissions


### Base design decisions
- Have as little moving parts as possible. A static-built website using [Parcel](https://parceljs.org/) (which allows whichever templating engines and local npm imports to be used), connected to a live database ([Pocketbase](https://pocketbase.io/))
- One deployment per organisation. This should not be a central hub for anyone to use, but instead a self-maintained tool
- No external links. The only requests this website should make is to the Pocketbase server. Any dependencies should be served locally


## License
The field of ethical software licensing is still growing. 


