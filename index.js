const Discord = require("discord.js");
const snoowrap = require("snoowrap");
let config = require("./config.json");
//const bot_data = require("./bot_data.json");
const fs = require("fs");
const events = require('events');

const client = new Discord.Client({partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });

const r = new snoowrap({
    userAgent: 'discord bot',
    clientId: config.CLIENT_ID,
    clientSecret: config.CLIENT_SECRET,
    refreshToken: config.REFRESH_TOKEN
});

const prefix = "<";
let startTime;
let data;
let last_link = [];


const trackReddit = num => {
    if (!num) {
        console.log("nothing to track");
        return;
    }
    let newPosts = false;

    for (let i = 0; i < num; i++) {
        console.log("last link for this search was " +  last_link[i]);
        const channel = client.channels.cache
            .get(data["TRACKING"][i.toString()]["CHANNEL"]);
        //console.log('last link 1: ' + last_link[i]);
        newPosts = false;
        r.search({
            query: data["TRACKING"][i.toString()]["QUERY"],
            sort: 'new',
            time: 'hour'
        })
            .then( (post) => {
                const site = 'https://reddit.com';
                //console.log(post[0].permalink);

                if (post[0]) {
                    //let queue = [];
                    for (let j = 0; j < post.length; j++) {
                        if (post[j].permalink !== last_link[i]) {
                            console.log(`NEW! ${post[j].title}`);
                            //queue.push(post[j]);
                            channel.send(`${post[j].title}\n${site.concat(post[j].permalink)}`)
                                .catch(console.log);
                        } else {
                            console.log(`OLD! ${post[j].title}`);
                            break;
                        }
                    }

                    last_link[i] = post[0].permalink;
                } else {
                    last_link[i] = "";
                }

                // try {
                //     fs.writeFileSync('./bot_data.json', JSON.stringify(data, null, 4));
                //     console.log('Successfully wrote file');
                // } catch(err) {
                //     console.log('Error writing file: ', err);
                //     return;
                // }
                //console.log(data);
            })
            .catch(error => {
                console.error(`Error with reddit search: `, error);
                // channel.send("Problem with reddit right now," +
                //     " I'll try again in a minute.").catch(console.error);
            });
    }
};

const recache = num => {
    console.log("recaching");
    if (!num) {
        console.log("nothing to recache");
        return;
    }

    for (let i = 0; i < num; i++) {
        r.search({
            query: data["TRACKING"][i.toString()]["QUERY"],
            sort: 'new',
            time: 'hour'
        })
            .then( posts => {
                last_link[i] = posts[0] ? posts[0].permalink : "";
                console.log("last link here " + last_link[i]);

            })
            .catch(error => {
                console.error(`Something up with reddit: `, error);
            });
    }
}

client.on('ready', () => {
    startTime = Date.now();

    try {
        let jsonString = (fs.readFileSync('./bot_data.json')).toString();
        data = JSON.parse(jsonString);
    } catch(err) {
        console.log(err);
        return;
    }

    recache(data["SEARCHES"]);
    console.log(`Logged in as ${client.user.tag}!`);
    client.channels.cache.get('437829904415850497').send("Online!");
    client.user.setPresence({
        status: "dnd",
        activity: {
            name: "to Red Velvet",
            type: "LISTENING"
        }
    }).catch(console.error);

    let interval = () => {
        trackReddit(data["SEARCHES"]);
        if (data["SEARCHES"] <= 3) {
            setTimeout(interval, 6000);
        } else {
            let time = 60000 / Math.floor(30 / data["SEARCHES"]);
            setTimeout(interval, time);
        }
    }

    setTimeout(interval, 10000);

});

client.on("message", message => {
    if (message.author.bot) {
        return;
    }
    if (!message.content.startsWith(prefix)) {
        return;
    }

    const commandBody = message.content.slice(prefix.length);
    const args = commandBody.split(' ');
    const command = args.shift().toLowerCase();

    if (command === "ping") {
        const timeTaken = Date.now() - message.createdTimestamp;
        message.reply(`Pong! Message had a latency of ${timeTaken}ms.`)
            .catch(console.error);
    }

    else if (command === "uptime") {
        ((duration) => {
            let milliseconds = (duration % 1000) / 100,
                seconds = Math.floor((duration / 1000) % 60),
                minutes = Math.floor((duration / (1000 * 60)) % 60),
                hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

            message.channel.send(`I've been online for ${hours} hours,` +
                ` ${minutes} minutes, and ${seconds}.${milliseconds} seconds.`)
                .catch(console.error);
        })(Date.now() - startTime);
    }

    else if (command === "randomnum") {
        let randomNum;
        if (args.length === 1) {
            console.log(typeof args[0]);
            if (parseInt(args[0])) {
                console.log("is a number");
                randomNum = Math.floor(Math.random() *
                    Math.floor(parseInt(args[0])));
            } else {
                message.channel.send(`${args[0]} is not a number!`)
                    .catch(console.error);
                return;
            }
        } else if (args.length === 0) {
            randomNum = Math.floor(Math.random() * Math.floor(100));
        } else {
            message.channel.send('```\nUsage: !randomnum' +
                ' {max_value}\nmax_value defaults to 100 if omitted.\n```')
                .catch(console.error);
            return;
        }
        message.channel.send(randomNum).catch(console.error);
    }

    else if (command === "emoji") {
        if (args.length === 2) {
            message.guild.emojis.create(args[1], args[0])
                .then(emoji => {
                    console.log(message.author.tag + " created new emoji: " +
                        emoji.name);
                    const newEmoji = message.guild.emojis.cache
                        .find(newEmoji => newEmoji.name === args[0]);
                    message.channel.send(`Added ${newEmoji} to the server!`)
                        .catch(console.error);
                })
                .catch(error => {
                    console.error(`Couldn't add that emoji: `, error);
                    message.channel.send("I couldn't add that" +
                        " emoji.\n```\nUsage + !emojiadd {emoji_name}" +
                        " {link_to_image}\n```").catch(console.error);
                });
        } else {
            message.channel.send("```\nUsage: !emojiadd {emoji_name}" +
                " {link_to_image}\n```").catch(console.error);
        }
    }

    else if (command === "reddit") {
        if (args.length === 1 && args[0] === "help") {
            message.channel.send("```\n<reddit\n\nThis bot can track up to " +
                "30 subreddits along with specific search queries." +
                " Refresh speeds are low if tracking very little searches" +
                " but will become as high as 1 minute at large amounts of" +
                " searches (30). This is to comply with reddit's API.\n\nTo" +
                " add a search query to track, use the following syntax:\n\n" +
                "<reddit {subreddit} {search_query}\n\n{search_query} is not" +
                " a required field, but if unused you will receive messages" +
                " for all new posts on the subreddit.\n```").catch(console.log);
        } else if (args.length === 2) {
            if (data["SEARCHES"] === 30) {
                message.channel.send(`You are already at the max search count,`
                + ` 30. Please remove unneeded searches before adding more.`)
                    .catch(console.log);
            }
            let site = "https://reddit.com";
            r.getSubreddit(args[0]).fetch()
                .then( () => {
                    r.search({
                        query: "subreddit:".concat(args[0], " ", args[1]),
                        sort: 'new',
                        time: 'hour'
                    })
                        .then( posts => {
                            if (posts[0]) {
                                return posts[0].permalink;
                            } else {
                                console.log("no post in the last hour");
                                return "";
                            }
                        })
                        .then( link => {
                            last_link[data["SEARCHES"]] = link;
                            data["TRACKING"][data["SEARCHES"].toString()] =
                                {
                                    "CHANNEL": message.channel.id,
                                    "QUERY": "subreddit:".concat(args[0], " ", args[1]),
                                };
                            data["SEARCHES"]++;
                            console.log(data["TRACKING"]["0"]);
                            try {
                                fs.writeFileSync('./bot_data.json', JSON.stringify(data, null, 4));
                                console.log('Successfully wrote file');
                            } catch(err) {
                                console.log('Error writing file: ', err);
                            }
                            message.channel.send(`Now tracking subreddit ` +
                                `/r/${args[0]} with search query ${args[1]}.`)
                                .catch(console.log);
                        })
                        .catch(console.log);
                })
                .catch( () => {
                console.log("not a subreddit");
                message.channel.send(`I don't think subreddit /r/${args[0]}` +
                    ` exists. If it does exist, I might be having trouble` +
                    ` reaching reddit's API right now.`).catch();
            });
        }
    }
});

client.on("messageReactionAdd", async (reaction, user) => {
    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (error) {
            console.error("Couldn't fetch message: ", error);
            return;
        }
    }

    if (reaction.message.id === `796499782293782550`) {
        console.log(`The message gained a reaction from ${user.tag}!`)
        let role;
        if (reaction.emoji.name === '🔴') {
            role = reaction.message.guild.roles.cache
                .find((role) => role.name === '154A');
        }
        if (reaction.emoji.name === '🔵') {
            role = reaction.message.guild.roles.cache
                .find((role) => role.name === '122A');
        }
        let member = reaction.message.member;
        await member.roles.add(role.id);
        console.log(`Gave ${user.tag} ${role.name} role.`);
    }
});

client.on("messageReactionRemove", async (reaction, user) => {
    console.log("sensed a reaction remove");
    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (error) {
            console.error("Couldn't fetch message: ", error);
            return;
        }
    }

    if (reaction.message.id === `796499782293782550`) {
        console.log(`${user.tag} removed reaction from the message.`);
        let role;
        if (reaction.emoji.name === '🔴') {
            role = reaction.message.guild.roles.cache
                .find((role) => role.name === '154A');
        }
        if (reaction.emoji.name === '🔵') {
            role = reaction.message.guild.roles.cache
                .find((role) => role.name === '122A');
        }
        let member = reaction.message.member;
        await member.roles.remove(role.id);
        console.log(`Removed ${role.name} role from ${user.tag}.`);
    }
});


client.login(config.BOT_TOKEN).catch(console.error);