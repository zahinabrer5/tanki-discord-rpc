import express from 'express';
import cors from 'cors';
import 'dotenv/config'
import { Client } from 'discord-rpc';

const app = express();
const clientId = process.env.CLIENT_ID;
const API_KEY = process.env.API_KEY;
const rankNames = ['Recruit', 'Private', 'Gefreiter', 'Corporal', 'Master Corporal', 'Sergeant', 'Staff Sergeant', 'Master Sergeant', 'First Sergeant', 'Sergeant-Major', 'Warrant Officer 1', 'Warrant Officer 2', 'Warrant Officer 3', 'Warrant Officer 4', 'Warrant Officer 5', 'Third Lieutenant', 'Second Lieutenant', 'First Lieutenant', 'Captain', 'Major', 'Lieutenant Colonel', 'Colonel', 'Brigadier', 'Major General', 'Lieutenant General', 'General', 'Marshal', 'Field Marshal', 'Commander', 'Generalissimo', 'Legend (1)'];

const getRank = (rawRank) => {
    if (rawRank <= rankNames.length)
        return rankNames[rawRank - 1];
    return 'Legend ' + (rawRank - rankNames.length + 1);
};

// return a string that has thousands separators for integer n
// https://stackoverflow.com/a/2901298/21405641
const thousandsSep = n => {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

let username = 'milk_Dud';
let xp = 0;
let xpNext = 100;
let rank = 1;
let hasPremium = false;

// pass username as command line argument
if (process.argv.length === 2) {
    console.error('Expected at least one argument!');
    process.exit(1);
}
username = process.argv[2]

// https://nodejs.org/en/blog/announcements/v18-release-announce/#fetch-experimental
const res = await fetch(`https://ratings.tankionline.com/api/eu/profile/?user=${username}&lang=en`);
if (res.ok) {
    const data = await res.json();
    const resp = data.response
    username = resp.name
    xp = resp.score
    xpNext = resp.scoreNext
    rank = resp.rank
    hasPremium = resp.hasPremium
}

let rankFile = `icons${hasPremium ? 'premium' : 'normal'}_${('00' + Math.min(31, rank)).slice(-2)}`;

// Create a new RPC client
const rpc = new Client({ transport: 'ipc' });
let presenceActive = false;

// CORS middleware to allow requests from extension
app.use(cors());

// Middleware to authenticate requests
app.use((req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== API_KEY)
        return res.status(403).send('Forbidden');
    next();
});

rpc.on('ready', () => {
    console.log(`Tanki Rich Presence (for user ${username}) is now active!`);
});

app.get('/startRPC', (req, res) => {
    if (presenceActive) {
        res.json({ message: "RPC Already Active" });
        return;
    }

    // Log in to Discord only once and wait for the 'ready' event
    rpc.login({ clientId }).then(() => {
        console.log("RPC Login successful.");
        presenceActive = true;

        // Now that the client is ready, we can set the activity
        rpc.setActivity({
            details: 'Username: ' + username,
            state: `${thousandsSep(xp)} / ${thousandsSep(xpNext)} XP till ${getRank(rank + 1)}`,
            startTimestamp: new Date(),
            largeImageKey: 'pentagon_only',
            largeImageText: 'Tanki Online',
            smallImageKey: rankFile,
            smallImageText: getRank(rank),
            // partySize: 1,
            // partyMax: 5,
            // matchSecret: '12345',
            buttons: [
                {
                    label: 'Play Tanki Online',
                    url: 'https://tankionline.com/play/'
                },
                {
                    label: username + ' Ratings',
                    url: 'https://ratings.tankionline.com/en/user/' + username
                }
            ]
        });
        res.json({ message: "RPC Started" });
    }).catch(err => {
        console.error("Error logging into Discord RPC:", err);
        res.status(500).json({ message: "Error logging into Discord RPC" });
    });
});

app.get('/stopRPC', (req, res) => {
    if (!presenceActive) {
        res.json({ message: "RPC Not Active" });
        return;
    }

    rpc.clearActivity().then(() => {
        console.log("RPC Stopped");
        presenceActive = false;
        res.json({ message: "RPC Stopped" });
    }).catch(err => {
        console.error("Error stopping RPC:", err);
        res.status(500).json({ message: "Error stopping RPC" });
    });
});

app.listen(3000, '127.0.0.1', () => {
    console.log('Server is running on http://localhost:3000');
});
