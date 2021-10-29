const { TranscribeClient, StartTranscriptionJobCommand } = require("@aws-sdk/client-transcribe");
const { Telegraf } = require("telegraf");
const axios = require("axios");
const aws = require("aws-sdk");

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

  return ctx.reply(text);
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
