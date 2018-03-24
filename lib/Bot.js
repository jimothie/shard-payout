'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _discord = require('discord.js');

var _discord2 = _interopRequireDefault(_discord);

var _xlsx = require('xlsx');

var _xlsx2 = _interopRequireDefault(_xlsx);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const channelId = '410890389352873984';

class Bot {
  constructor(botToken) {
    this.main = this.main.bind(this);

    this.botToken = botToken;

    this.client = new _discord2.default.Client();
    this.client.on("ready", async () => {
      this.client.user.setGame('live countdowns until payout');
      this.channel = this.client.channels.get(channelId);

      await this.initializeBot();
      console.log('Bot initialized');
    });

    this.client.login(botToken);

    this.sheet = _xlsx2.default.utils.sheet_to_json(_xlsx2.default.readFile(_path2.default.resolve(__dirname, '../SWGoH_Shard.xlsx')).Sheets.Sheet1);
    this.parseXlsx();

    this.main();
  }

  async main() {
    try {
      if (this.message) {
        this.calculateSecondsUntilPayout();
        await this.sendMessage();
      }
    } catch (err) {
      console.log(err);
    } finally {
      setTimeout(this.main, 60000 - Date.now() % 60000);
    }
  }

  async initializeBot() {
    const messages = await this.channel.fetchMessages();
    if (messages.array().length === 0) {
      try {
        this.message = await this.channel.send({ embed: new _discord2.default.RichEmbed() });
      } catch (err) {
        console.log(err);
      }
    } else {
      if (messages.first().embeds.length === 0) {
        await messages.first().delete();
        this.message = await this.channel.send({ embed: new _discord2.default.RichEmbed() });
      } else {
        this.message = messages.first();
      }
    }
  }

  parseXlsx() {
    this.mates = [];
    for (let i in this.sheet) {
      const user = this.sheet[i];
      this.mates.push({
        name: user.Name,
        payout: parseInt(user.UTC.substr(0, 2)),
        discordId: user.ID,
        flag: user.Flag,
        swgoh: user.SWGOH
      });
    }
    const matesByTime = {};
    for (let i in this.mates) {
      const mate = this.mates[i];
      if (!matesByTime[mate.payout]) {
        matesByTime[mate.payout] = {
          payout: mate.payout,
          mates: []
        };
      }
      matesByTime[mate.payout].mates.push(mate);
    }
    this.mates = Object.values(matesByTime);
  }

  calculateSecondsUntilPayout() {
    const now = new Date();
    for (let i in this.mates) {
      const mate = this.mates[i];
      const p = new Date();
      p.setUTCHours(mate.payout, 0, 0, 0);
      if (p < now) p.setDate(p.getDate() + 1);
      mate.timeUntilPayout = p.getTime() - now.getTime();
      let dif = new Date(mate.timeUntilPayout);
      const round = dif.getTime() % 60000;
      if (round < 30000) {
        dif.setTime(dif.getTime() - round);
      } else {
        dif.setTime(dif.getTime() + 60000 - round);
      }
      mate.time = `${String(dif.getUTCHours()).padStart(2, '00')}:${String(dif.getUTCMinutes()).padStart(2, '00')}`;
    }
    this.mates.sort((a, b) => {
      return a.timeUntilPayout - b.timeUntilPayout;
    });
  }

  async sendMessage() {
    let embed = new _discord2.default.RichEmbed().setColor(0x00AE86);
    let desc = '**Time until next payout (HH:MM)**:';
    for (let i in this.mates) {
      let fieldName = String(this.mates[i].time);
      let fieldText = '';
      for (const mate of this.mates[i].mates) {
        fieldText += `${mate.flag} [${mate.name}](${mate.swgoh})\n`; // Discord automatically trims messages
      }
      embed.addField(fieldName, fieldText, true);
    }
    embed.setDescription(desc);
    await this.message.edit({ embed });
  }
}
exports.default = Bot;