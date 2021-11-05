const { TranscribeClient, StartTranscriptionJobCommand } = require("@aws-sdk/client-transcribe");
const { Telegraf } = require("telegraf");
const axios = require("axios");
const aws = require("aws-sdk");

const token = process.env.TOKEN;
const admin = process.env.ADMIN;
const bot = new Telegraf(token);

const ENUM = {
  um: 1,
  dois: 2,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  onze: 11,
  doze: 12,
  treze: 13,
  quatorze: 14,
  quinze: 15,
  dezesseis: 16,
  dezessete: 17,
  dezoito: 18,
  dezenove: 19,
  vinte: 20,
  trinta: 30,
  quarenta: 40,
  cinquenta: 50,
  sessenta: 60,
  setenta: 70,
  oitenta: 80,
  noventa: 90,
  cem: 100,
  cento: 100,
  duzentos: 200,
  trezentos: 300,
  quatrocentos: 400,
  quinhentos: 500,
  seiscentos: 600,
  setecentos: 700,
  oitocentos: 800,
  novecentos: 900,
  mil: 1000,
};

bot.start(async (ctx) => {
  const { first_name, id: user_id } = ctx.update.message.from;

  if (!admin.includes(user_id)) {
    return ctx.replyWithSticker("CAACAgIAAxkBAANuYW46DyhJXGF17XrikxotRzHL5OUAAigDAAK1cdoGkHpKh16VSm4hBA");
  }

  return ctx.reply(`Seja bem vindo(a), ${first_name}`);
});

bot.on("voice", async (ctx) => {
  const { from, date, voice } = ctx.update.message;
  const { id: user_id } = from;

  if (!admin.includes(user_id)) {
    return ctx.replyWithSticker("CAACAgIAAxkBAANuYW46DyhJXGF17XrikxotRzHL5OUAAigDAAK1cdoGkHpKh16VSm4hBA");
  }

  const bucketName = "dfc-bucket";
  const voiceFileName = "voice.ogg";
  const transcriptionFileName = `transcription-${date}`;

  const url = await ctx.telegram.getFileLink(voice.file_id);
  const data = await getData(url.href);

  await sendVoice(bucketName, voiceFileName, data);
  await transcribeVoice(bucketName, voiceFileName, transcriptionFileName);

  const text = await getText(bucketName, transcriptionFileName);
  const result = await getEvent(text);

  return ctx.reply(result);
});

bot.startPolling();

async function getData(url) {
  try {
    const { data } = await axios.get(url, { responseType: "arraybuffer" });

    return data;
  } catch (error) {
    throw error;
  }
}

async function sendVoice(bucketName, fileName, data) {
  try {
    const params = { Bucket: bucketName, Key: fileName, Body: data };
    const s3 = new aws.S3.ManagedUpload({ params });

    await s3.promise();
  } catch (error) {
    throw error;
  }
}

async function transcribeVoice(bucketName, fileName, jobName) {
  try {
    const transcribeClient = new TranscribeClient();
    const params = {
      TranscriptionJobName: jobName,
      OutputBucketName: bucketName,
      LanguageCode: "pt-BR",
      Media: { MediaFileUri: `s3://${bucketName}/${fileName}` },
    };
    const command = new StartTranscriptionJobCommand(params);

    await transcribeClient.send(command);
  } catch (error) {
    throw error;
  }
}

async function getText(bucketName, fileName) {
  try {
    const s3 = new aws.S3();
    const params = { Bucket: bucketName, Key: `${fileName}.json` };
    const response = await s3.getObject(params).promise();
    const data = JSON.parse(response.Body);

    return data.results.transcripts[0].transcript;
  } catch (error) {
    return getText(bucketName, fileName);
  }
}

async function getEvent(text) {
  try {
    const cleaningRegex = /[^a-z\s]/gi;
    const cleanText = text.normalize("NFD").replace(cleaningRegex, "");

    const groupingRegex = /(?<action>cadastrar) (?<type>despesa) (?<category>combustivel) (?<value>.*)/;
    const data = cleanText.match(groupingRegex).groups;
    const arrayValue = data.value.replace(/ e /gi, " ").split(" ");

    let comma = false;
    let value = 0;

    for (const key of arrayValue) {
      if (!comma && ENUM[key]) {
        value += ENUM[key];
      } else if (comma && ENUM[key]) {
        value += ENUM[key] / 100;
      } else {
        comma = true;
      }
    }

    data.value = value.toFixed(2);

    return JSON.stringify(data, null, 2);
  } catch {
    return "Não entendi!";
  }
}
