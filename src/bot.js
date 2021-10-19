require("dotenv").config();
const { Telegraf } = require("telegraf");

const token = process.env.TOKEN;
const admin = process.env.ADMIN;
const bot = new Telegraf(token);

bot.start(async (ctx) => {
  const { first_name, id: user_id } = ctx.update.message.from;

  if (!admin.includes(user_id)) {
    return ctx.replyWithSticker("CAACAgIAAxkBAANuYW46DyhJXGF17XrikxotRzHL5OUAAigDAAK1cdoGkHpKh16VSm4hBA");
  }

  return ctx.reply(`Seja bem vindo(a), ${first_name}`);
});

bot.on("text", async (ctx) => {
  const { text, from } = ctx.update.message;
  const { id: user_id } = from;

  if (!admin.includes(user_id)) {
    return ctx.replyWithSticker("CAACAgIAAxkBAANuYW46DyhJXGF17XrikxotRzHL5OUAAigDAAK1cdoGkHpKh16VSm4hBA");
  }

  return ctx.reply(text);
});

bot.startPolling();
