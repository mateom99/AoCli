import inquirer from "inquirer";
import dotenv from "dotenv";
import fetch from "node-fetch";
import fs from "fs";
import { fork } from "child_process";
dotenv.config();

let stdin = process.stdin;
stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding("utf8");

const year = 2023;
let part = 1;

let attempted = {
  part1: [],
  part2: [],
};

const getDay = async () => {
  if (process.argv[2])
    return parseInt(process.argv[2], 10) < 10
      ? "0" + process.argv[2]
      : process.argv[2];
  const currentDate = new Date();
  const currentDay = currentDate.getDate();
  const dayOptions = Array.from({ length: currentDay + 1 }, (_, i) =>
    (i + 1).toString()
  );
  let res = await inquirer.prompt([
    {
      type: "list",
      name: "selectedDay",
      message: "Select a day:",
      choices: dayOptions,
    },
  ]);

  day = res.selectedDay;
  day = parseInt(day, 10);
};

let fsWait = false;
let isWatching = false;
let watchers = [];
const watchFile = (day) => {
  const destinationDir = `${process.cwd()}/src/${year}/day${day}/part${part}.js`;
  const parseDestinationDir = `${process.cwd()}/src/${year}/day${day}/parse.js`;
  if (!isWatching) {
    console.log("Watching for file changes...");

    watchers.push(
      fs.watch(destinationDir, (event, filename) => {
        if (filename) {
          if (fsWait) return;
          fsWait = setTimeout(() => {
            fsWait = false;
          }, 50);
          runDay(day);
          // console.log(`${filename} file Changed`);
        }
      })
    );
    watchers.push(
      fs.watch(parseDestinationDir, (event, filename) => {
        if (filename) {
          if (fsWait) return;
          fsWait = setTimeout(() => {
            fsWait = false;
          }, 100);
          runDay(day);
          // console.log(`${filename} file Changed`);
        }
      })
    );
    isWatching = true;
  } else {
    console.log("Stopped watching for file changes");
    watchers.forEach((watcher) => watcher.close());
    isWatching = false;
  }
};

const getInput = async (day, force = false) => {
  if (
    !force &&
    fs.existsSync(`${process.cwd()}/src/${year}/day${day}/input.txt`)
  ) {
    return;
  }

  fs.writeFileSync(`${process.cwd()}/src/${year}/day${day}/input.txt`, "");

  fetch(`https://adventofcode.com/${year}/day/${parseInt(day, 10)}/input`, {
    headers: {
      cookie: `_ga=GA1.2.293846900.1701405912; _gid=GA1.2.146411508.1701405912; session=${process.env.AOC_KEY}; _ga_MHSNPJKWC7=GS1.2.1702158932.15.0.1702158932.0.0.0`,
    },
    method: "GET",
  })
    .then((res) => res.text())
    .then((input) => {
      if (input.includes("endpoint before it unlocks!")) {
        console.log("\nInput not available yet");
        return;
      }
      const destinationDir = `${process.cwd()}/src/${year}/day${day}`;
      fs.writeFileSync(`${destinationDir}/input.txt`, input);
    });
};

const setupFolders = (day) => {
  let currentDir = process.cwd();

  if (!fs.existsSync(`${currentDir}/src`)) {
    fs.mkdirSync(`${currentDir}/src`);
  }
  if (!fs.existsSync(`${currentDir}/src/${year}`)) {
    fs.mkdirSync(`${currentDir}/src/${year}`);
  }
  if (!fs.existsSync(`${currentDir}/src/${year}/day${day}`)) {
    fs.mkdirSync(`${currentDir}/src/${year}/day${day}`);
  }

  const templateDir = `${currentDir}/template`;
  const destinationDir = `${currentDir}/src/${year}/day${day}`;

  const files = fs.readdirSync(templateDir);
  files.forEach((file) => {
    const sourcePath = `${templateDir}/${file}`;
    const destinationPath = `${destinationDir}/${file}`;
    if (!fs.existsSync(destinationPath)) {
      fs.copyFileSync(sourcePath, destinationPath);
    }
  });
};

let result;
let child = fork("childProcess.js");
const runDay = async (day) => {
  if (child) {
    // console.log("Killing child process");
    child.kill();
    child = fork("childProcess.js");
  }

  child.on("message", (msg) => {
    if (msg.status === "ready") {
      // Now that the child is ready, send the message
      child.send({
        cmd: "start",
        funcPath: `./src/${year}/day${day}/part${part}.js`,
        parsePath: `./src/${year}/day${day}/parse.js`,
        inputPath: `./src/${year}/day${day}/input.txt`,
      });
    }
    if (msg.status === "success") {
      result = msg.result;
      console.log(`\nPart ${part}:`, result);
      console.log(`Time: ${msg.time.toFixed(2)}ms`);
      child.disconnect(); // Disconnect if the task is done
    }
  });
};

const changePart = () => {
  if (++part === 3) part = 1;
  console.log("\nSwitched to part", part);
  if (child) child.kill();
  if (isWatching) watchFile(day);
  result = undefined;
};

const submitAnswer = async (day, answer) => {
  if (!answer) {
    console.log("\nNo result to submit");
    return;
  }

  if (attempted[`part${part}`].includes(answer)) {
    console.log("\nAlready attempted", result);
    return;
  }

  console.log("\nSubmitting...");

  let res = await fetch(
    `https://adventofcode.com/${year}/day/${parseInt(day, 10)}/answer`,
    {
      headers: {
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "content-type": "application/x-www-form-urlencoded",
        cookie: `_ga=GA1.2.293846900.1701405912; _gid=GA1.2.146411508.1701405912; session=${process.env.AOC_KEY}; _gat=1; _ga_MHSNPJKWC7=GS1.2.1702179259.16.1.1702179709.0.0.0`,
        Referer: `https://adventofcode.com/${year}/day/${parseInt(day, 10)}`,
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
      body: `level=${part}&answer=${answer}`,
      method: "POST",
    }
  );

  let html = await res.text();

  let response = html.match(/<article>([\s\S]*?)<\/article>/)[1];

  response = response.replace(/(<([^>]+)>)/gi, "");

  console.log(`\n${response}`);

  if (response.includes("right answer!")) {
    attempted[`part${part}`].push(answer);

    if (part == 1) {
      changePart();
    }

    return true;
  }
  if (response.includes("not the right answer")) {
    attempted[`part${part}`].push(answer);
  }
  return false;
};

let day = await getDay();
setupFolders(day);
getInput(day);

console.log(
  `AoC Day ${day} - Press 'r' to run, 'w' to watch, 'f' to fetch the input again, 'q' to quit, 'x' to stop function execution, 'p' to change parts, and 's' to submit.`
);
stdin.on("data", function (key) {
  if (key === "q" || key === "Q" || key === "\u0003") {
    if (child) child.kill();
    process.exit();
  }
  if (key === "r" || key === "R") {
    runDay(day);
  }
  if (key === "w" || key === "W") {
    watchFile(day);
  }
  if (key === "x" || key === "X") {
    if (child) child.kill();
  }
  if (key === "f" || key === "F") {
    getInput(day, true);
  }
  if (key === "s" || key === "S") {
    if (child) child.kill();
    submitAnswer(day, result);
  }
  if (key === "p" || key === "P") {
    changePart();
  }
});
